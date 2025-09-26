const mongoose = require('mongoose');

const revokedLicenseSchema = new mongoose.Schema({
  license_token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  client_id: {
    type: String,
    required: true,
    index: true
  },
  revoked_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  revoked_by: {
    type: String,
    required: true,
    default: 'system'
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'manual_revocation',
      'security_breach',
      'payment_failure',
      'terms_violation',
      'license_transfer',
      'system_maintenance',
      'fraud_detection',
      'expired_payment',
      'admin_action'
    ],
    default: 'manual_revocation'
  },
  description: {
    type: String,
    maxlength: 500
  },
  original_license: {
    plan: String,
    expires_at: Date,
    status: String,
    active_modules: [String]
  },
  revocation_metadata: {
    ip_address: String,
    user_agent: String,
    admin_user: String,
    batch_id: String, // For bulk revocations
    automated: {
      type: Boolean,
      default: false
    }
  },
  // TTL index - automatically delete after 2 years for cleanup
  expires_at: {
    type: Date,
    default: Date.now,
    expires: 63072000 // 2 years in seconds
  }
}, {
  timestamps: true,
  collection: 'revoked_licenses'
});

// Compound indexes for efficient queries
revokedLicenseSchema.index({ license_token: 1, revoked_at: -1 });
revokedLicenseSchema.index({ client_id: 1, revoked_at: -1 });
revokedLicenseSchema.index({ revoked_by: 1, revoked_at: -1 });
revokedLicenseSchema.index({ reason: 1, revoked_at: -1 });

// Static methods
revokedLicenseSchema.statics.isRevoked = async function(licenseToken) {
  try {
    const revoked = await this.findOne({ 
      license_token: licenseToken 
    }).lean();
    
    return {
      isRevoked: !!revoked,
      revokedAt: revoked?.revoked_at,
      reason: revoked?.reason,
      description: revoked?.description
    };
  } catch (error) {
    console.error('Error checking revocation status:', error);
    return { isRevoked: false, error: error.message };
  }
};

revokedLicenseSchema.statics.revokeByToken = async function(licenseToken, revokedBy, reason, description, metadata = {}) {
  try {
    // Get original license data first
    const License = mongoose.model('License');
    const originalLicense = await License.findOne({ license_token: licenseToken });
    
    const revocationData = {
      license_token: licenseToken,
      client_id: originalLicense?.client_id || 'unknown',
      revoked_by: revokedBy,
      reason: reason,
      description: description,
      original_license: originalLicense ? {
        plan: originalLicense.plan,
        expires_at: originalLicense.expires_at,
        status: originalLicense.status,
        active_modules: originalLicense.active_modules
      } : null,
      revocation_metadata: metadata
    };
    
    const revoked = await this.create(revocationData);
    
    // Update original license status to revoked
    if (originalLicense) {
      await License.updateOne(
        { license_token: licenseToken },
        { 
          status: 'revoked',
          revoked_at: new Date(),
          revoked_reason: reason
        }
      );
    }
    
    return revoked;
  } catch (error) {
    console.error('Error revoking license:', error);
    throw error;
  }
};

revokedLicenseSchema.statics.revokeByClientId = async function(clientId, revokedBy, reason, description, metadata = {}) {
  try {
    const License = mongoose.model('License');
    const licenses = await License.find({ client_id: clientId });
    
    const revokedLicenses = [];
    
    for (const license of licenses) {
      const revoked = await this.revokeByToken(
        license.license_token,
        revokedBy,
        reason,
        description,
        { ...metadata, batch_id: `client_${clientId}_${Date.now()}` }
      );
      revokedLicenses.push(revoked);
    }
    
    return revokedLicenses;
  } catch (error) {
    console.error('Error revoking licenses by client ID:', error);
    throw error;
  }
};

revokedLicenseSchema.statics.getRevocationHistory = async function(clientId, limit = 50) {
  try {
    return await this.find({ client_id: clientId })
      .sort({ revoked_at: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Error getting revocation history:', error);
    throw error;
  }
};

revokedLicenseSchema.statics.bulkRevoke = async function(licenseTokens, revokedBy, reason, description, metadata = {}) {
  try {
    const batchId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const revokedLicenses = [];
    
    for (const token of licenseTokens) {
      try {
        const revoked = await this.revokeByToken(
          token,
          revokedBy,
          reason,
          description,
          { ...metadata, batch_id: batchId, automated: true }
        );
        revokedLicenses.push(revoked);
      } catch (error) {
        console.error(`Error revoking license ${token}:`, error);
        // Continue with other licenses even if one fails
      }
    }
    
    return {
      batchId,
      totalRequested: licenseTokens.length,
      successfullyRevoked: revokedLicenses.length,
      revokedLicenses
    };
  } catch (error) {
    console.error('Error in bulk revocation:', error);
    throw error;
  }
};

// Instance methods
revokedLicenseSchema.methods.getRevocationInfo = function() {
  return {
    licenseToken: this.license_token,
    clientId: this.client_id,
    revokedAt: this.revoked_at,
    revokedBy: this.revoked_by,
    reason: this.reason,
    description: this.description,
    originalLicense: this.original_license,
    metadata: this.revocation_metadata
  };
};

module.exports = mongoose.model('RevokedLicense', revokedLicenseSchema);