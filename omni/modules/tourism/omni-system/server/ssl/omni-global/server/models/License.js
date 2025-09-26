const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  licenseKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  clientId: {
    type: String,
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  product: {
    type: String,
    required: true,
    enum: ['omni-tourism', 'omni-restaurant', 'omni-agriculture', 'omni-health', 'omni-full']
  },
  plan: {
    type: String,
    required: true,
    enum: ['basic', 'pro', 'enterprise']
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'suspended', 'expired', 'revoked'],
    default: 'active'
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  lastUsed: {
    type: Date,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  },
  maxUsage: {
    type: Number,
    default: -1 // -1 = unlimited
  },
  features: [{
    type: String
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
licenseSchema.index({ clientId: 1 });
licenseSchema.index({ status: 1 });
licenseSchema.index({ expiresAt: 1 });

// Methods
licenseSchema.methods.isValid = function() {
  return this.status === 'active' && 
         this.expiresAt > new Date() && 
         (this.maxUsage === -1 || this.usageCount < this.maxUsage);
};

licenseSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

module.exports = mongoose.model('License', licenseSchema);