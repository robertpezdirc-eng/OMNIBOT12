const License = require('../models/License');
const RevokedLicense = require('../models/RevokedLicense');
const { generateLicenseToken, verifyLicenseToken, extendLicenseToken, isLicenseExpired } = require('../utils/jwt');
const auditService = require('../services/auditService');
const { v4: uuidv4 } = require('uuid'); // Dodano za UUID4 generiranje

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
 * Check license validity - NADGRAJENA VERZIJA
 * POST /api/license/check
 * Body: { client_id, license_token }
 */
async function checkLicense(req, res) {
  try {
    const { client_id, license_token } = req.body;
    
    console.log(`🔍 [DEBUG] Checking license for client: ${client_id}`);
    console.log(`🔍 [DEBUG] License token provided: ${license_token ? 'YES' : 'NO'}`);
    
    // Find license in MongoDB
    const license = await License.findOne({ client_id });
    if (!license) {
      console.log(`❌ [DEBUG] License not found for client: ${client_id}`);
      
      // Beleži neuspešno validacijo
      await auditService.logLicenseValidation(
        client_id,
        'failed',
        'License not found',
        req.ip,
        req.get('User-Agent'),
        { error_code: 'LICENSE_NOT_FOUND' }
      );
      
      return res.status(404).json({
        valid: false,
        message: "Licenca ni najdena",
        error_code: "LICENSE_NOT_FOUND",
        debug: { client_id, timestamp: new Date().toISOString() }
      });
    }

    console.log(`✅ [DEBUG] License found - Plan: ${license.plan}, Status: ${license.status}`);
    
    // Verify JWT token
    const tokenData = verifyLicenseToken(license_token);
    if (!tokenData || tokenData.client_id !== client_id) {
      console.log(`❌ [DEBUG] Invalid token for client: ${client_id}`);
      
      // Beleži varnostno kršitev
      await auditService.logSecurityViolation(
        'invalid_token',
        client_id,
        'Invalid license token provided',
        req.ip,
        req.get('User-Agent'),
        { provided_client_id: client_id, token_valid: !!tokenData }
      );
      
      return res.status(403).json({
        valid: false,
        message: "Neveljaven licenčni žeton",
        error_code: "INVALID_TOKEN",
        debug: { client_id, token_valid: !!tokenData, timestamp: new Date().toISOString() }
      });
    }

    // Check if license is expired
    const isExpired = license.isExpired;
    if (isExpired) {
      console.log(`⏰ [DEBUG] License expired for client: ${client_id} - Expired at: ${license.expires_at}`);
      
      // Auto-lock modules for expired license
      license.status = 'expired';
      license.active_modules = ['basic_features']; // Only basic features for expired
      await license.save();
      
      // Emit license update
      broadcastLicenseUpdate(license, 'expired');
      
      return res.status(403).json({
        valid: false,
        message: "Licenca je potekla",
        error_code: "LICENSE_EXPIRED",
        expires_at: license.expires_at,
        debug: { client_id, expired_days: license.daysUntilExpiry, timestamp: new Date().toISOString() }
      });
    }
    
    // Check if license is revoked
    const revocationStatus = await RevokedLicense.isRevoked(license_token);
    if (revocationStatus.isRevoked) {
      console.log(`❌ [DEBUG] License revoked for client: ${client_id} - Reason: ${revocationStatus.reason}`);
      
      // Update license status to revoked if not already
      if (license.status !== 'revoked') {
        license.status = 'revoked';
        license.revoked_at = revocationStatus.revokedAt;
        license.revoked_reason = revocationStatus.reason;
        await license.save();
        
        // Emit license update
        broadcastLicenseUpdate(license, 'revoked');
      }
      
      // Beleži poskus uporabe preklicane licence
      await auditService.logLicenseValidation(
        client_id,
        'failed',
        'License is revoked',
        req.ip,
        req.get('User-Agent'),
        { 
          error_code: 'LICENSE_REVOKED',
          revoked_at: revocationStatus.revokedAt,
          reason: revocationStatus.reason
        }
      );
      
      return res.status(403).json({
        valid: false,
        message: "Licenca je preklicana",
        error_code: "LICENSE_REVOKED",
        revoked_at: revocationStatus.revokedAt,
        reason: revocationStatus.reason,
        debug: { client_id, timestamp: new Date().toISOString() }
      });
    }

    // Auto-unlock/lock modules based on plan
    const planModules = {
      demo: ['basic_features'],
      basic: ['basic_features', 'advanced_search'],
      premium: ['basic_features', 'advanced_search', 'analytics', 'api_access', 'priority_support']
    };
    
    const expectedModules = planModules[license.plan] || planModules.demo;
    if (JSON.stringify(license.active_modules.sort()) !== JSON.stringify(expectedModules.sort())) {
      console.log(`🔧 [DEBUG] Auto-updating modules for ${license.plan} plan`);
      license.active_modules = expectedModules;
      await license.save();
      
      // Emit license update
      broadcastLicenseUpdate(license, 'modules_updated');
    }

    // Update last check timestamp
    license.last_check = new Date();
    await license.save();
    
    console.log(`✅ [DEBUG] License validation successful for client: ${client_id}`);
    
    // Beleži uspešno validacijo
    await auditService.logLicenseValidation(
      client_id,
      'success',
      'License validated successfully',
      req.ip,
      req.get('User-Agent'),
      {
        plan: license.plan,
        modules: license.active_modules,
        expires_at: license.expires_at
      }
    );
    
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
        max_users: license.max_users
      },
      debug: { 
        client_id, 
        plan: license.plan, 
        modules_count: license.active_modules.length,
        timestamp: new Date().toISOString() 
      }
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] Error checking license:', error);
    res.status(500).json({
      valid: false,
      message: "Napaka pri preverjanju licence",
      error: error.message,
      debug: { timestamp: new Date().toISOString() }
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
 * Create new license - NADGRAJENA VERZIJA z UUID4
 * POST /api/license/create
 * Body: { client_id?, plan, company_name?, contact_email?, expires_in_days? }
 */
async function createLicense(req, res) {
  try {
    const { 
      client_id = uuidv4(), // Auto-generate UUID4 if not provided
      plan, 
      company_name = 'Neznano podjetje',
      contact_email = '',
      expires_in_days = 30
    } = req.body;
    
    console.log(`🆕 [DEBUG] Creating license for client: ${client_id} (${plan})`);
    console.log(`🆕 [DEBUG] UUID4 generated: ${client_id.includes('-') ? 'YES' : 'NO'}`);
    
    // Validate required fields
    if (!plan) {
      console.log(`❌ [DEBUG] Missing required field: plan`);
      return res.status(400).json({
        success: false,
        message: "Plan je obvezen parameter",
        error_code: "MISSING_PLAN",
        debug: { timestamp: new Date().toISOString() }
      });
    }
    
    // Check if license already exists
    const existingLicense = await License.findOne({ client_id });
    if (existingLicense) {
      console.log(`❌ [DEBUG] License already exists for client: ${client_id}`);
      
      // Beleži poskus ustvarjanja obstoječe licence
      await auditService.log({
        eventType: 'license_creation_failed',
        clientId: client_id,
        action: 'License creation failed - already exists',
        description: `Attempt to create license for existing client ${client_id}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestData: req.body,
        status: 'failed',
        category: 'license',
        securityLevel: 'low',
        metadata: { error_code: 'LICENSE_EXISTS' }
      });
      
      return res.status(409).json({
        success: false,
        message: "Licenca za ta client_id že obstaja",
        error_code: "LICENSE_EXISTS",
        debug: { client_id, timestamp: new Date().toISOString() }
      });
    }
    
    // Define modules based on plan - POGOJNA LOGIKA
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
    
    console.log(`🔧 [DEBUG] Plan modules for ${plan}:`, planModules[plan] || planModules.demo);
    
    // Generate JWT token with optional JWT
    const modules = planModules[plan] || planModules.demo;
    const license_token = generateLicenseToken(client_id, plan, modules, expires_in_days);
    
    console.log(`🔑 [DEBUG] JWT token generated: ${license_token ? 'YES' : 'NO'}`);
    
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
    
    console.log(`✅ [DEBUG] License saved to database for client: ${client_id}`);
    
    // Beleži uspešno ustvarjanje licence
    await auditService.logLicenseActivation(
      client_id,
      'success',
      'License created successfully',
      req.ip,
      req.get('User-Agent'),
      {
        plan,
        modules,
        expires_at: newLicense.expires_at,
        company_name,
        max_users: newLicense.max_users,
        expires_in_days
      }
    );
    
    console.log(`✅ [DEBUG] License created for client: ${client_id}`);
    
    // Broadcast update - EMIT license_update
    broadcastLicenseUpdate(newLicense, 'created');
    
    // Emit specific license_update event
    if (global.io) {
      global.io.emit('license_update', {
        action: 'created',
        client_id: newLicense.client_id,
        plan: newLicense.plan,
        status: newLicense.status,
        modules: newLicense.active_modules,
        timestamp: new Date().toISOString()
      });
      console.log(`📡 [DEBUG] license_update event emitted for client: ${client_id}`);
    }
    
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
      },
      debug: { 
        uuid4_generated: client_id.includes('-'),
        modules_count: modules.length,
        timestamp: new Date().toISOString() 
      }
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] Error creating license:', error);
    
    // Beleži sistemsko napako
    await auditService.logError('license_creation', error, req.body.client_id, null, req);
    
    res.status(500).json({
      success: false,
      message: "Napaka pri ustvarjanju licence",
      error: error.message,
      debug: { timestamp: new Date().toISOString() }
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
 * Toggle license status (active/inactive) - NOVA FUNKCIJA
 * POST /api/license/toggle
 * Body: { client_id }
 */
async function toggleLicense(req, res) {
  try {
    const { client_id } = req.body;
    
    console.log(`🔄 [DEBUG] Toggling license status for client: ${client_id}`);
    
    // Validate required fields
    if (!client_id) {
      console.log(`❌ [DEBUG] Missing required field: client_id`);
      return res.status(400).json({
        success: false,
        message: "client_id je obvezen parameter",
        error_code: "MISSING_CLIENT_ID",
        debug: { timestamp: new Date().toISOString() }
      });
    }
    
    // Find license
    const license = await License.findOne({ client_id });
    if (!license) {
      console.log(`❌ [DEBUG] License not found for client: ${client_id}`);
      return res.status(404).json({
        success: false,
        message: "Licenca ni bila najdena",
        error_code: "LICENSE_NOT_FOUND",
        debug: { client_id, timestamp: new Date().toISOString() }
      });
    }
    
    // Toggle status
    const oldStatus = license.status;
    const newStatus = license.status === 'active' ? 'inactive' : 'active';
    
    console.log(`🔄 [DEBUG] Status change: ${oldStatus} → ${newStatus}`);
    
    // Update license status
    license.status = newStatus;
    
    // Avtomatsko zaklepanje/odklepanje modulov glede na status
    if (newStatus === 'inactive') {
      license.active_modules = []; // Zakleni vse module
      console.log(`🔒 [DEBUG] All modules locked for client: ${client_id}`);
    } else {
      // Odkleni module glede na plan
      const planModules = {
        demo: ['basic_features'],
        basic: ['basic_features', 'advanced_search'],
        premium: ['basic_features', 'advanced_search', 'analytics', 'api_access', 'priority_support']
      };
      license.active_modules = planModules[license.plan] || planModules.demo;
      console.log(`🔓 [DEBUG] Modules unlocked for ${license.plan} plan:`, license.active_modules);
    }
    
    // Generate new JWT token with updated status and modules
    const license_token = generateLicenseToken(
      client_id, 
      license.plan, 
      license.active_modules, 
      Math.ceil((license.expires_at - new Date()) / (24 * 60 * 60 * 1000))
    );
    
    license.license_token = license_token;
    license.updated_at = new Date();
    
    await license.save();
    
    console.log(`✅ [DEBUG] License status toggled for client: ${client_id}`);
    
    // Beleži spremembo statusa
    await auditService.log({
      eventType: 'license_status_toggled',
      clientId: client_id,
      action: `License status changed from ${oldStatus} to ${newStatus}`,
      description: `License status toggled for client ${client_id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestData: req.body,
      status: 'success',
      category: 'license',
      securityLevel: 'medium',
      metadata: { 
        old_status: oldStatus, 
        new_status: newStatus,
        modules_count: license.active_modules.length
      }
    });
    
    // Broadcast update - EMIT license_update
    broadcastLicenseUpdate(license, 'toggled');
    
    // Emit specific license_update event
    if (global.io) {
      global.io.emit('license_update', {
        action: 'toggled',
        client_id: license.client_id,
        plan: license.plan,
        status: license.status,
        modules: license.active_modules,
        old_status: oldStatus,
        timestamp: new Date().toISOString()
      });
      console.log(`📡 [DEBUG] license_update event emitted for toggle: ${client_id}`);
    }
    
    res.json({
      success: true,
      message: `Licenca ${newStatus === 'active' ? 'aktivirana' : 'deaktivirana'}`,
      license: {
        client_id: license.client_id,
        license_token: license.license_token,
        plan: license.plan,
        status: license.status,
        expires_at: license.expires_at,
        active_modules: license.active_modules,
        updated_at: license.updated_at
      },
      debug: {
        status_change: `${oldStatus} → ${newStatus}`,
        modules_locked: newStatus === 'inactive',
        modules_count: license.active_modules.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] Error toggling license:', error);
    
    // Beleži sistemsko napako
    await auditService.logError('license_toggle', error, req.body.client_id, null, req);
    
    res.status(500).json({
      success: false,
      message: "Napaka pri preklapljanju statusa licence",
      error: error.message,
      debug: { timestamp: new Date().toISOString() }
    });
  }
}

/**
 * Extend license expiration - NADGRAJENA VERZIJA
 * POST /api/license/extend
 * Body: { client_id, days }
 */
async function extendLicense(req, res) {
  try {
    const { client_id, days } = req.body;
    
    console.log(`⏰ [DEBUG] Extending license for client: ${client_id} by ${days} days`);
    
    // Validate required fields
    if (!client_id || !days) {
      console.log(`❌ [DEBUG] Missing required fields: client_id=${!!client_id}, days=${!!days}`);
      return res.status(400).json({
        success: false,
        message: "client_id in days sta obvezna parametra",
        error_code: "MISSING_PARAMETERS",
        debug: { 
          client_id: !!client_id, 
          days: !!days, 
          timestamp: new Date().toISOString() 
        }
      });
    }
    
    // Validate days is positive number
    if (isNaN(days) || days <= 0) {
      console.log(`❌ [DEBUG] Invalid days value: ${days}`);
      return res.status(400).json({
        success: false,
        message: "Število dni mora biti pozitivno število",
        error_code: "INVALID_DAYS",
        debug: { days, timestamp: new Date().toISOString() }
      });
    }
    
    const license = await License.findOne({ client_id });
    if (!license) {
      console.log(`❌ [DEBUG] License not found for client: ${client_id}`);
      return res.status(404).json({
        success: false,
        message: "Licenca ni bila najdena",
        error_code: "LICENSE_NOT_FOUND",
        debug: { client_id, timestamp: new Date().toISOString() }
      });
    }
    
    // Store old expiration date for logging
    const oldExpiresAt = new Date(license.expires_at);
    
    // Extend license
    await license.extendLicense(parseInt(days));
    
    console.log(`⏰ [DEBUG] Expiration extended: ${oldExpiresAt.toISOString()} → ${license.expires_at.toISOString()}`);
    
    // Avtomatsko aktiviranje licence če je bila potekla
    if (license.status === 'expired') {
      license.status = 'active';
      console.log(`🔄 [DEBUG] License status changed from expired to active`);
    }
    
    // Generate new token with extended expiry
    const newToken = generateLicenseToken(
      license.client_id, 
      license.plan, 
      license.active_modules, 
      Math.ceil((license.expires_at - new Date()) / (1000 * 60 * 60 * 24))
    );
    
    license.license_token = newToken;
    await license.save();
    
    console.log(`✅ [DEBUG] License extended for client: ${client_id} until ${license.expires_at}`);
    
    // Beleži podaljšanje licence
    await auditService.log({
      eventType: 'license_extended',
      clientId: client_id,
      action: `License extended by ${days} days`,
      description: `License expiration extended for client ${client_id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestData: req.body,
      status: 'success',
      category: 'license',
      securityLevel: 'medium',
      metadata: { 
        days_extended: days,
        old_expires_at: oldExpiresAt.toISOString(),
        new_expires_at: license.expires_at.toISOString(),
        plan: license.plan
      }
    });
    
    // Broadcast update
    broadcastLicenseUpdate(license, 'extended');
    
    // Emit specific license_update event
    if (global.io) {
      global.io.emit('license_update', {
        action: 'extended',
        client_id: license.client_id,
        plan: license.plan,
        status: license.status,
        modules: license.active_modules,
        expires_at: license.expires_at,
        days_extended: days,
        timestamp: new Date().toISOString()
      });
      console.log(`📡 [DEBUG] license_update event emitted for extension: ${client_id}`);
    }
    
    res.json({
      success: true,
      message: `Licenca podaljšana za ${days} dni`,
      license: {
        client_id: license.client_id,
        license_token: license.license_token,
        expires_at: license.expires_at,
        days_remaining: license.daysUntilExpiry
      },
      debug: {
        days_extended: days,
        old_expires_at: oldExpiresAt.toISOString(),
        new_expires_at: license.expires_at.toISOString(),
        auto_activated: license.status === 'active',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] Error extending license:', error);
    
    // Beleži sistemsko napako
    await auditService.logError('license_extension', error, req.body.client_id, null, req);
    
    res.status(500).json({
      success: false,
      message: "Napaka pri podaljševanju licence",
      error: error.message,
      debug: { timestamp: new Date().toISOString() }
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
  toggleLicense,
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