// 👤 User Model - Omni Cloud
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    default: "client", 
    enum: ["admin", "client"] 
  },
  plan: { 
    type: String, 
    default: "demo", 
    enum: ["demo", "basic", "premium"] 
  },
  plan_expires: { 
    type: Date, 
    default: null 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: { 
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Password reset fields
  resetPasswordToken: {
    type: String,
    default: undefined
  },
  resetPasswordExpires: {
    type: Date,
    default: undefined
  },
  // Additional fields for enhanced functionality
  profile: {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    company: { type: String, default: "" },
    phone: { type: String, default: "" }
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    theme: { type: String, default: "light", enum: ["light", "dark"] },
    language: { type: String, default: "sl", enum: ["sl", "en"] }
  },
  usage: {
    lastActivity: { type: Date, default: Date.now },
    loginCount: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// 🔍 Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ plan: 1 });
userSchema.index({ plan_expires: 1 });
userSchema.index({ createdAt: -1 });

// 🔧 Virtual fields
userSchema.virtual('isExpired').get(function() {
  if (this.plan === 'demo') return false;
  if (!this.plan_expires) return false;
  return new Date() > this.plan_expires;
});

userSchema.virtual('daysUntilExpiry').get(function() {
  if (this.plan === 'demo' || !this.plan_expires) return null;
  const now = new Date();
  const diffTime = this.plan_expires - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`.trim() || this.email;
});

// 🔧 Instance methods
userSchema.methods.updateLastActivity = function() {
  this.usage.lastActivity = new Date();
  return this.save();
};

userSchema.methods.incrementLoginCount = function() {
  this.usage.loginCount += 1;
  this.lastLogin = new Date();
  return this.save();
};

userSchema.methods.incrementApiCalls = function() {
  this.usage.apiCalls += 1;
  return this.save();
};

// 🔧 Static methods
userSchema.statics.findExpiredUsers = function() {
  const now = new Date();
  return this.find({
    plan: { $nin: ['demo'] },
    plan_expires: { $lt: now },
    isActive: true
  });
};

userSchema.statics.findActiveUsers = function() {
  const now = new Date();
  return this.find({
    $or: [
      { plan: 'demo' },
      { plan_expires: null },
      { plan_expires: { $gt: now } }
    ],
    isActive: true
  });
};

userSchema.statics.getStatistics = async function() {
  const now = new Date();
  
  const [
    totalUsers,
    activeUsers,
    expiredUsers,
    planDistribution
  ] = await Promise.all([
    this.countDocuments({ isActive: true }),
    this.countDocuments({
      $or: [
        { plan: 'demo' },
        { plan_expires: null },
        { plan_expires: { $gt: now } }
      ],
      isActive: true
    }),
    this.countDocuments({
      plan: { $nin: ['demo'] },
      plan_expires: { $lt: now },
      isActive: true
    }),
    this.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ])
  ]);

  const planStats = planDistribution.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, { demo: 0, basic: 0, premium: 0 });

  return {
    totalUsers,
    activeUsers,
    expiredUsers,
    planDistribution: planStats
  };
};

// 🔧 Pre-save middleware
userSchema.pre('save', function(next) {
  if (this.isModified('plan') || this.isModified('plan_expires')) {
    this.usage.lastActivity = new Date();
  }
  next();
});

export const User = mongoose.model("User", userSchema);