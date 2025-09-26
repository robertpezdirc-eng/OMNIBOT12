const License = require('../models/License');
const { generateLicenseToken, verifyLicenseToken, extendLicenseToken, isLicenseExpired } = require('../utils/jwt');

// Import broadcast function from server
let broadcastLicenseUpdate = () => {}; // Default fallback function

// Try to import broadcast function after server initialization
setTimeout(() => {
  try {
    const serverModule = require('../server');
    if (serverModule && serverModule.broadcastLicenseUpdate) {
      broadcastLicenseUpdate = serverModule.broadcastLicenseUpdate;
    }
  } catch (error) {
    console.warn('⚠️ Broadcast function not available:', error.message);
  }
}, 1000);

/**
 * Check license validity
 * POST /api/license/check
 * Body: { client_id, license_token }
 */
async function checkLicense(req, res) {
  try {
    const { client_id, license_token } = req.body;
    
    console.log(`🔍 Checking license for client: ${client_id}`);
    
    // Find license in MongoDB
    const license = await License.findOne({ client_id });
    if (!license) {
      console.log(`❌ License not found for client: ${client_id}`);
      return res.status(404).json({
        valid: false,
        message: "Licenca ni najdena",
        error_code: "LICENSE_NOT_FOUND"
      });
    }
    
    // Verify JWT token
    const tokenData = verifyLicenseToken(license_token);
    if (!tokenData || tokenData.client_id !== client_id) {
      console.log(`❌ Invalid token for client: ${client_id}`);
      return res.status(403).json({
        valid: false,
        message: "Neveljaven licenčni žeton",
        error_code: "INVALID_TOKEN"
      });
    }
    
    // Check if license is active
    if (license.status !== "active") {
      console.log(`❌ License inactive for client: ${client_id}`);
      return res.status(403).json({
        valid: false,
        message: "Licenca je deaktivirana",
        error_code: "LICENSE_INACTIVE",
        status: license.status
      });
    }
    
    // Check if license is expired
    if (license.isExpired) {
      console.log(`❌ License expired for client: ${client_id}`);
      // Auto-deactivate expired license
      license.status = 'inactive';
      await license.save();
      
      return res.status(403).json({
        valid: false,
        message: "Licenca je potekla",
        error_code: "LICENSE_EXPIRED",
        expires_at: license.expires_at
      });
    }
    
    // Update last check time and usage stats atomically
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    
    // Log activity and update stats
    await license.logActivity('LICENSE_VALIDATION', clientIp, userAgent, {
      validation_result: 'success',
      plan: license.plan,
      modules: license.active_modules
    });
    
    await License.findOneAndUpdate(
      { client_id },
      { 
        last_check: new Date(),
        $inc: { 'usage_stats.total_api_calls': 1 }
      }
    );
    
    console.log(`✅ Valid license for client: ${client_id} (${license.plan})`);
    
    res.json({
      valid: true,
      message: "Licenca je veljavna",
      license: {
        client_id: license.client_id,
        plan: license.plan,
        status: license.status,
        expires_at: license.expires_at,
        active_modules: license.active_modules,
        days_remaining: license.daysUntilExpiry,
        company_name: license.company_name,
        max_users: license.max_users
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking license:', error);
    res.status(500).json({
      valid: false,
      message: "Napaka pri preverjanju licence",
      error_code: "INTERNAL_ERROR"
    });
  }
}

/**
 * Get all licenses
 * GET /api/license/all
 */
async function getAllLicenses(req, res) {
  try {
    console.log('📋 Fetching all licenses');
    
    const licenses = await License.find({}).sort({ created_at: -1 });
    
    const formattedLicenses = licenses.map(license => ({
      client_id: license.client_id,
      license_token: license.license_token, // Add license_token for testing
      plan: license.plan,
      status: license.status,
      expires_at: license.expires_at,
      active_modules: license.active_modules,
      last_check: license.last_check,
      created_at: license.created_at,
      company_name: license.company_name,
      contact_email: license.contact_email,
      max_users: license.max_users,
      is_expired: license.isExpired,
      days_remaining: license.daysUntilExpiry,
      usage_stats: license.usage_stats
    }));
    
    res.json({
      success: true,
      count: formattedLicenses.length,
      licenses: formattedLicenses
    });
    
  } catch (error) {
    console.error('❌ Error fetching licenses:', error);
    res.status(500).json({
      success: false,
      message: "Napaka pri pridobivanju licenc",
      error: error.message
    });
  }
}

/**
 * Create new license
 * POST /api/license/create
 * Body: { client_id, plan, company_name?, contact_email?, expires_in_days? }
 */
async function createLicense(req, res) {
  try {
    const { 
      client_id, 
      plan, 
      company_name = 'Neznano podjetje',
      contact_email = '',
      expires_in_days = 30
    } = req.body;
    
    console.log(`🆕 Creating license for client: ${client_id} (${plan})`);
    
    // Check if license already exists
    const existingLicense = await License.findOne({ client_id });
    if (existingLicense) {
      return res.status(409).json({
        success: false,
        message: "Licenca za ta client_id že obstaja",
        error_code: "LICENSE_EXISTS"
      });
    }
    
    // Define modules based on plan
    const planModules = {
      demo: ['basic_features'],
      basic: ['basic_features', 'advanced_search'],
      premium: ['basic_features', 'advanced_search', 'analytics', 'api_access', 'priority_support']
    };
    
    const maxUsers = {
      demo: 1,
      basic: 5,
      premium: 50
    };
    
    // Generate JWT token
    const modules = planModules[plan] || planModules.demo;
    const license_token = generateLicenseToken(client_id, plan, modules, expires_in_days);
    
    // Create new license
    const newLicense = new License({
      client_id,
      license_token,
      plan,
      expires_at: new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000),
      status: 'active',
      active_modules: modules,
      company_name,
      contact_email,
      max_users: maxUsers[plan] || 1
    });
    
    await newLicense.save();
    
    console.log(`✅ License created for client: ${client_id}`);
    
    // Broadcast update
    broadcastLicenseUpdate(newLicense, 'created');
    
    res.status(201).json({
      success: true,
      message: "Licenca uspešno ustvarjena",
      license: {
        client_id: newLicense.client_id,
        license_token: newLicense.license_token,
        plan: newLicense.plan,
        status: newLicense.status,
        expires_at: newLicense.expires_at,
        active_modules: newLicense.active_modules,
        company_name: newLicense.company_name,
        max_users: newLicense.max_users
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating license:', error);
    res.status(500).json({
      success: false,
      message: "Napaka pri ustvarjanju licence",
      error: error.message
    });
  }
}

/**
 * Toggle license status
 * POST /api/license/toggle
 * Body: { client_id }
 */
async function toggleStatus(req, res) {
  try {
    const { client_id } = req.body;
    
    console.log(`🔄 Toggling status for client: ${client_id}`);
    
    const license = await License.findOne({ client_id });
    if (!license) {
      return res.status(404).json({
        success: false,
        message: "Licenca ni najdena",
        error_code: "LICENSE_NOT_FOUND"
      });
    }
    
    // Toggle status
    const newStatus = license.status === 'active' ? 'inactive' : 'active';
    license.status = newStatus;
    await license.save();
    
    console.log(`✅ Status changed for client: ${client_id} -> ${newStatus}`);
    
    // Broadcast update
    broadcastLicenseUpdate(license, 'status_changed');
    
    res.json({
      success: true,
      message: `Status licence spremenjen na ${newStatus}`,
      license: {
        client_id: license.client_id,
        status: license.status,
        plan: license.plan
      }
    });
    
  } catch (error) {
    console.error('❌ Error toggling license status:', error);
    res.status(500).json({
      success: false,
      message: "Napaka pri spreminjanju statusa licence",
      error: error.message
    });
  }
}

/**
 * Extend license
 * POST /api/license/extend
 * Body: { client_id, days }
 */
async function extendLicense(req, res) {
  try {
    const { client_id, days } = req.body;
    
    console.log(`⏰ Extending license for client: ${client_id} by ${days} days`);
    
    const license = await License.findOne({ client_id });
    if (!license) {
      return res.status(404).json({
        success: false,
        message: "Licenca ni najdena",
        error_code: "LICENSE_NOT_FOUND"
      });
    }
    
    // Extend license
    await license.extendLicense(parseInt(days));
    
    // Generate new token with extended expiry
    const newToken = generateLicenseToken(
      license.client_id, 
      license.plan, 
      license.active_modules, 
      Math.ceil((license.expires_at - new Date()) / (1000 * 60 * 60 * 24))
    );
    
    license.license_token = newToken;
    await license.save();
    
    console.log(`✅ License extended for client: ${client_id} until ${license.expires_at}`);
    
    // Broadcast update
    broadcastLicenseUpdate(license, 'extended');
    
    res.json({
      success: true,
      message: `Licenca podaljšana za ${days} dni`,
      license: {
        client_id: license.client_id,
        license_token: license.license_token,
        expires_at: license.expires_at,
        days_remaining: license.daysUntilExpiry
      }
    });
    
  } catch (error) {
    console.error('❌ Error extending license:', error);
    res.status(500).json({
      success: false,
      message: "Napaka pri podaljševanju licence",
      error: error.message
    });
  }
}

/**
 * Delete license
 * DELETE /api/license/delete
 * Body: { client_id }
 */
async function deleteLicense(req, res) {
  try {
    const { client_id } = req.body;
    
    console.log(`🗑️ Deleting license for client: ${client_id}`);
    
    const license = await License.findOneAndDelete({ client_id });
    if (!license) {
      return res.status(404).json({
        success: false,
        message: "Licenca ni najdena",
        error_code: "LICENSE_NOT_FOUND"
      });
    }
    
    console.log(`✅ License deleted for client: ${client_id}`);
    
    // Broadcast update
    broadcastLicenseUpdate(license, 'deleted');
    
    res.json({
      success: true,
      message: "Licenca uspešno izbrisana",
      deleted_license: {
        client_id: license.client_id,
        plan: license.plan
      }
    });
    
  } catch (error) {
    console.error('❌ Error deleting license:', error);
    res.status(500).json({
      success: false,
      message: "Napaka pri brisanju licence",
      error: error.message
    });
  }
}

/**
 * Get license statistics
 * GET /api/license/stats
 */
async function getLicenseStats(req, res) {
  try {
    console.log('📊 Fetching license statistics');
    
    const totalLicenses = await License.countDocuments();
    const activeLicenses = await License.countDocuments({ status: 'active' });
    const expiredLicenses = await License.countDocuments({ expires_at: { $lt: new Date() } });
    
    const planStats = await License.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);
    
    const statusStats = await License.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        total: totalLicenses,
        active: activeLicenses,
        expired: expiredLicenses,
        by_plan: planStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        by_status: statusStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching license stats:', error);
    res.status(500).json({
      success: false,
      message: "Napaka pri pridobivanju statistik",
      error: error.message
    });
  }
}

/**
 * Get license by client ID
 * GET /api/license/:client_id
 */
async function getLicenseByClientId(req, res) {
  try {
    const { client_id } = req.params;
    
    console.log(`🔍 Fetching license for client: ${client_id}`);
    
    const license = await License.findOne({ client_id });
    if (!license) {
      return res.status(404).json({
        success: false,
        message: "Licenca ni najdena",
        error_code: "LICENSE_NOT_FOUND"
      });
    }
    
    res.json({
      success: true,
      license: {
        client_id: license.client_id,
        plan: license.plan,
        status: license.status,
        expires_at: license.expires_at,
        active_modules: license.active_modules,
        last_check: license.last_check,
        created_at: license.created_at,
        company_name: license.company_name,
        contact_email: license.contact_email,
        max_users: license.max_users,
        is_expired: license.isExpired,
        days_remaining: license.daysUntilExpiry,
        usage_stats: license.usage_stats
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching license:', error);
    res.status(500).json({
      success: false,
      message: "Napaka pri pridobivanju licence",
      error: error.message
    });
  }
}

/**
 * Update license
 * PUT /api/license/update
 * Body: { client_id, plan?, company_name?, contact_email?, max_users? }
 */
async function updateLicense(req, res) {
  try {
    const { client_id, plan, company_name, contact_email, max_users } = req.body;
    
    console.log(`📝 Updating license for client: ${client_id}`);
    
    const license = await License.findOne({ client_id });
    if (!license) {
      return res.status(404).json({
        success: false,
        message: "Licenca ni najdena",
        error_code: "LICENSE_NOT_FOUND"
      });
    }
    
    // Update fields if provided
    if (plan && plan !== license.plan) {
      const planModules = {
        demo: ['basic_features'],
        basic: ['basic_features', 'advanced_search'],
        premium: ['basic_features', 'advanced_search', 'analytics', 'api_access', 'priority_support']
      };
      
      license.plan = plan;
      license.active_modules = planModules[plan] || planModules.demo;
      
      // Generate new token with updated plan
      const daysRemaining = Math.ceil((license.expires_at - new Date()) / (1000 * 60 * 60 * 24));
      license.license_token = generateLicenseToken(client_id, plan, license.active_modules, daysRemaining);
    }
    
    if (company_name) license.company_name = company_name;
    if (contact_email) license.contact_email = contact_email;
    if (max_users) license.max_users = max_users;
    
    await license.save();
    
    console.log(`✅ License updated for client: ${client_id}`);
    
    // Broadcast update
    broadcastLicenseUpdate(license, 'updated');
    
    res.json({
      success: true,
      message: "Licenca uspešno posodobljena",
      license: {
        client_id: license.client_id,
        license_token: license.license_token,
        plan: license.plan,
        status: license.status,
        expires_at: license.expires_at,
        active_modules: license.active_modules,
        company_name: license.company_name,
        contact_email: license.contact_email,
        max_users: license.max_users
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating license:', error);
    res.status(500).json({
      success: false,
      message: "Napaka pri posodabljanju licence",
      error: error.message
    });
  }
}

// Update license modules
const updateLicenseModules = async (req, res) => {
  try {
    const { client_id, module_id, enabled } = req.body;
    
    console.log(`🔧 Updating module ${module_id} for client ${client_id}: ${enabled ? 'enabled' : 'disabled'}`);
    
    if (!client_id || !module_id || typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: client_id, module_id, enabled'
      });
    }
    
    const license = await License.findOne({ client_id });
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      });
    }
    
    // Initialize active_modules if it doesn't exist
    if (!license.active_modules) {
      license.active_modules = [];
    }
    
    // Update modules array
    if (enabled) {
      // Add module if not already present
      if (!license.active_modules.includes(module_id)) {
        license.active_modules.push(module_id);
      }
    } else {
      // Remove module if present
      license.active_modules = license.active_modules.filter(id => id !== module_id);
    }
    
    // Save updated license
    await license.save();
    
    console.log(`✅ Module ${module_id} for client ${client_id} updated successfully`);
    
    // Emit update via WebSocket
    if (global.io) {
      global.io.emit('licenseUpdated', {
        client_id,
        module_id,
        enabled,
        active_modules: license.active_modules
      });
    }
    
    res.json({
      success: true,
      message: `Module ${module_id} ${enabled ? 'enabled' : 'disabled'} for ${client_id}`,
      active_modules: license.active_modules
    });
    
  } catch (error) {
    console.error('❌ Error updating license modules:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get license activity log
 * GET /api/license/activity/:clientId
 */
async function getLicenseActivity(req, res) {
  try {
    const { clientId } = req.params;
    
    console.log(`📊 Fetching activity log for client: ${clientId}`);
    
    const license = await License.findOne({ client_id: clientId });
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licenca ni najdena'
      });
    }
    
    // Get recent activity (last 50 entries)
    const recentActivity = license.getRecentActivity(50);
    
    res.json({
      success: true,
      client_id: clientId,
      last_activity: license.last_activity,
      activity_log: recentActivity
    });
    
  } catch (error) {
    console.error('❌ Error fetching license activity:', error);
    res.status(500).json({
      success: false,
      message: 'Napaka pri pridobivanju dnevnika aktivnosti'
    });
  }
}

/**
 * Generate token pair (access + refresh token)
 * POST /api/license/token-pair
 */
async function generateTokenPair(req, res) {
  try {
    const { client_id } = req.body;
    
    if (!client_id) {
      return res.status(400).json({
        success: false,
        message: 'client_id je obvezen parameter'
      });
    }
    
    console.log(`🔑 Generating token pair for client: ${client_id}`);
    
    const license = await License.findOne({ client_id: client_id });
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licenca ni najdena'
      });
    }
    
    if (license.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Licenca ni aktivna'
      });
    }
    
    // Generate token pair using JWT utility
    const { generateTokenPair } = require('../utils/jwt');
    const tokenPair = generateTokenPair(
      license.client_id,
      license.plan,
      license.modules,
      license.getRemainingDays()
    );
    
    // Log activity
    license.logActivity('token_pair_generated', req.ip, {
      license_id: tokenPair.license_id,
      expires_in: tokenPair.expires_in
    });
    await license.save();
    
    res.json({
      success: true,
      message: 'Token par uspešno generiran',
      ...tokenPair
    });
    
  } catch (error) {
    console.error('❌ Error generating token pair:', error);
    res.status(500).json({
      success: false,
      message: 'Napaka pri generiranju token para'
    });
  }
}

/**
 * Refresh access token using refresh token
 * POST /api/license/refresh-token
 */
async function refreshToken(req, res) {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'refresh_token je obvezen parameter'
      });
    }
    
    console.log('🔄 Refreshing access token');
    
    // Refresh token using JWT utility
    const { refreshAccessToken } = require('../utils/jwt');
    const newTokenData = refreshAccessToken(refresh_token);
    
    if (!newTokenData) {
      return res.status(401).json({
        success: false,
        message: 'Neveljaven ali potekel refresh token'
      });
    }
    
    // Log activity for the client
    try {
      const { verifyLicenseToken } = require('../utils/jwt');
      const decoded = verifyLicenseToken(newTokenData.access_token);
      
      if (decoded && decoded.client_id) {
        const license = await License.findOne({ client_id: decoded.client_id });
        if (license) {
          license.logActivity('token_refreshed', req.ip, {
            license_id: decoded.license_id,
            refreshed_at: newTokenData.refreshed_at
          });
          await license.save();
        }
      }
    } catch (logError) {
      console.warn('⚠️ Could not log refresh activity:', logError.message);
    }
    
    res.json({
      success: true,
      message: 'Access token uspešno osvežen',
      ...newTokenData
    });
    
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    res.status(500).json({
      success: false,
      message: 'Napaka pri osveževanju tokena'
    });
  }
}

/**
 * Revoke refresh token
 * POST /api/license/revoke-token
 */
async function revokeToken(req, res) {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'refresh_token je obvezen parameter'
      });
    }
    
    console.log('🚫 Revoking refresh token');
    
    // Revoke token using JWT utility
    const { revokeRefreshToken } = require('../utils/jwt');
    const revoked = revokeRefreshToken(refresh_token);
    
    if (!revoked) {
      return res.status(400).json({
        success: false,
        message: 'Token ni bil najden ali je že preklican'
      });
    }
    
    res.json({
      success: true,
      message: 'Refresh token uspešno preklican'
    });
    
  } catch (error) {
    console.error('❌ Error revoking token:', error);
    res.status(500).json({
      success: false,
      message: 'Napaka pri preklicu tokena'
    });
  }
}

module.exports = {
  checkLicense,
  getAllLicenses,
  createLicense,
  toggleStatus,
  extendLicense,
  deleteLicense,
  getLicenseStats,
  getLicenseByClientId,
  updateLicense,
  updateLicenseModules,
  getLicenseActivity,
  generateTokenPair,
  refreshToken,
  revokeToken
};