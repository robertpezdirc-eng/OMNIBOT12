// server/models/User.js - MongoDB Model za Uporabnike
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// 👤 Schema za uporabnike
const UserSchema = new Schema({
  // Osnovni podatki
  username: {
    type: String,
    required: [true, 'Uporabniško ime je obvezno'],
    unique: true,
    trim: true,
    minlength: [3, 'Uporabniško ime mora imeti vsaj 3 znake'],
    maxlength: [30, 'Uporabniško ime ne sme presegati 30 znakov']
  },
  
  email: {
    type: String,
    required: [true, 'Email je obvezen'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Prosimo vnesite veljaven email']
  },
  
  password: {
    type: String,
    required: [true, 'Geslo je obvezno'],
    minlength: [6, 'Geslo mora imeti vsaj 6 znakov']
  },
  
  // Vloge in dovoljenja
  role: {
    type: String,
    enum: ['client', 'admin', 'super_admin'],
    default: 'client'
  },
  
  permissions: [{
    type: String,
    enum: [
      'read_dashboard',
      'write_dashboard', 
      'manage_users',
      'manage_licenses',
      'view_analytics',
      'manage_agents',
      'system_admin'
    ]
  }],
  
  // Licenčni podatki
  plan: {
    type: String,
    enum: ['demo', 'basic', 'premium', 'enterprise'],
    default: 'demo'
  },
  
  plan_expires: {
    type: Date,
    default: function() {
      // Demo plan poteče čez 7 dni
      if (this.plan === 'demo') {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
      return null;
    }
  },
  
  plan_features: [{
    feature: String,
    enabled: { type: Boolean, default: true },
    usage_limit: Number,
    usage_count: { type: Number, default: 0 }
  }],
  
  // Aktivnost in statistike
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  sessionDuration: { type: Number, default: 0 }, // v sekundah
  
  // Preference uporabnika
  preferences: {
    language: { type: String, default: 'sl' },
    timezone: { type: String, default: 'Europe/Ljubljana' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    dashboard_layout: { type: String, default: 'default' },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' }
  },
  
  // Varnostni podatki
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  
  // Sledenje aktivnosti
  lastActivity: { type: Date, default: Date.now },
  ipAddress: String,
  userAgent: String,
  
  // Billing podatki
  billing: {
    stripeCustomerId: String,
    paypalCustomerId: String,
    billingAddress: {
      street: String,
      city: String,
      postalCode: String,
      country: String
    },
    paymentMethod: {
      type: { type: String, enum: ['card', 'paypal', 'bank_transfer'] },
      last4: String,
      brand: String
    }
  },
  
  // API ključi in dostopi
  apiKeys: [{
    name: String,
    key: String,
    permissions: [String],
    createdAt: { type: Date, default: Date.now },
    lastUsed: Date,
    isActive: { type: Boolean, default: true }
  }],
  
  // Omni Brain specifični podatki
  omniBrain: {
    agentPreferences: {
      learningAgent: { type: Boolean, default: true },
      commercialAgent: { type: Boolean, default: false },
      optimizationAgent: { type: Boolean, default: false }
    },
    dashboardConfig: {
      widgets: [String],
      layout: String,
      refreshRate: { type: Number, default: 30 } // sekunde
    },
    dataRetention: { type: Number, default: 90 }, // dni
    autoSaveEnabled: { type: Boolean, default: true }
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Soft delete
  isActive: { type: Boolean, default: true },
  deletedAt: Date
}, {
  timestamps: true, // Avtomatsko dodaj createdAt in updatedAt
  collection: 'users'
});

// 🔒 Pre-save middleware za hashiranje gesla
UserSchema.pre('save', async function(next) {
  // Samo če je geslo spremenjeno
  if (!this.isModified('password')) return next();
  
  try {
    // Hash geslo
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 🔍 Metoda za preverjanje gesla
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Napaka pri preverjanju gesla');
  }
};

// 📊 Metoda za posodobitev zadnje aktivnosti
UserSchema.methods.updateLastActivity = function() {
  this.lastActivity = new Date();
  this.loginCount += 1;
  return this.save();
};

// 🎯 Metoda za preverjanje dovoljenj
UserSchema.methods.hasPermission = function(permission) {
  if (this.role === 'super_admin') return true;
  if (this.role === 'admin' && permission !== 'system_admin') return true;
  return this.permissions.includes(permission);
};

// 📈 Metoda za posodobitev uporabe funkcionalnosti
UserSchema.methods.incrementFeatureUsage = function(featureName) {
  const feature = this.plan_features.find(f => f.feature === featureName);
  if (feature) {
    feature.usage_count += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// 🔄 Metoda za preverjanje veljavnosti plana
UserSchema.methods.isPlanValid = function() {
  if (!this.plan_expires) return true;
  return new Date() < this.plan_expires;
};

// 🎨 Metoda za pridobitev uporabniških nastavitev
UserSchema.methods.getDisplayData = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    plan: this.plan,
    plan_expires: this.plan_expires,
    lastLogin: this.lastLogin,
    preferences: this.preferences,
    omniBrain: this.omniBrain,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

// 📋 Statične metode
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true }).select('-password -resetPasswordToken -emailVerificationToken');
};

UserSchema.statics.getUsersByPlan = function(plan) {
  return this.find({ plan, isActive: true }).select('-password');
};

UserSchema.statics.getExpiredPlans = function() {
  return this.find({
    plan_expires: { $lt: new Date() },
    isActive: true
  });
};

// 📊 Agregacijske metode za statistike
UserSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        avgLoginCount: { $avg: '$loginCount' },
        avgSessionDuration: { $avg: '$sessionDuration' }
      }
    }
  ]);
  
  const totalUsers = await this.countDocuments({ isActive: true });
  const activeToday = await this.countDocuments({
    lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    isActive: true
  });
  
  return {
    totalUsers,
    activeToday,
    planDistribution: stats
  };
};

// 🔍 Indeksi za optimizacijo poizvedb
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ plan: 1 });
UserSchema.index({ lastActivity: -1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'apiKeys.key': 1 });

// 🎯 Izvoz modela
const User = mongoose.model('User', UserSchema);

export default User;