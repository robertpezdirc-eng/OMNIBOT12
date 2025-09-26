/**
 * OMNI License Controller
 * Kontroler za upravljanje licenčnih operacij
 */

const { 
  findLicense, 
  findLicenseByClientId,
  getPlanConfig,
  isLicenseValid,
  getAllLicenses,
  getActiveLicenses,
  getExpiredLicenses,
  updateLastCheck,
  generateLicense
} = require('../models/licenseModel');

const { 
  generateJWT,
  verifyJWT,
  generateLicenseToken,
  verifyLicenseToken,
  createHardwareFingerprint,
  isValidUUID
} = require('../utils/crypto');

const { validationResult } = require('express-validator');
const AuditLogger = require('../utils/audit');
const WebhookManager = require('../utils/webhook');

// Inicializacija audit logger-ja in webhook manager-ja
const auditLogger = new AuditLogger();
const webhookManager = new WebhookManager();

/**
 * Preveri veljavnost licence z audit logging
 */
async function checkLicense(req, res) {
  const startTime = Date.now();
  
  try {
    // Preveri validacijske napake
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        valid: false,
        error: 'Neveljavni parametri',
        details: errors.array()
      });
    }

    const { client_id, license_key, hardware_fingerprint } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';

    // Poišči licenco
    const license = findLicense(client_id, license_key);
    
    if (!license) {
      // Audit logging za neuspešen poskus
      await auditLogger.logLicenseActivity('INVALID_LICENSE_KEY', {
        client_id: client_id,
        license_key: license_key,
        ip_address: clientIP,
        user_agent: userAgent,
        result: 'failed',
        reason: 'License not found'
      });

      await auditLogger.logSecurityEvent('INVALID_LICENSE_ATTEMPT', {
        client_id: client_id,
        ip_address: clientIP,
        user_agent: userAgent,
        severity: 'medium',
        additional_info: { attempted_license_key: license_key }
      });

      // Webhook obvestilo
      await webhookManager.notifySecurityAlert(client_id, 'invalid_license_attempt', {
        ip_address: clientIP,
        severity: 'medium'
      });
      
      // Logiraj neuspešen poskus
      console.log(`❌ License validation failed: ${client_id} from ${clientIP}`);
      
      return res.status(404).json({ 
        valid: false, 
        error: "Licenca ni najdena",
        client_id: client_id
      });
    }

    // Preveri veljavnost licence
    if (!isLicenseValid(license)) {
      const now = new Date();
      const expiresAt = new Date(license.expires_at);
      
      let errorMessage = "Licenca ni veljavna";
      let auditEventType = 'INVALID_LICENSE_ACCESS';
      
      if (now >= expiresAt) {
        errorMessage = "Licenca je potekla";
        auditEventType = 'EXPIRED_LICENSE_ACCESS';
        
        // Webhook obvestilo o potekli licenci
        await webhookManager.notifyLicenseExpiry(client_id, license_key, license.expires_at);
      } else if (license.status !== 'active') {
        errorMessage = "Licenca je deaktivirana";
        auditEventType = 'INACTIVE_LICENSE_ACCESS';
      } else if (license.payment_status === 'suspended') {
        errorMessage = "Licenca je začasno onemogočena zaradi neplačila";
        auditEventType = 'SUSPENDED_LICENSE_ACCESS';
      }

      // Audit logging za neveljavno licenco
      await auditLogger.logLicenseActivity(auditEventType, {
        client_id: client_id,
        license_key: license_key,
        ip_address: clientIP,
        user_agent: userAgent,
        result: 'failed',
        reason: errorMessage,
        additional_info: { 
          license_status: license.status,
          payment_status: license.payment_status,
          expires_at: license.expires_at
        }
      });

      console.log(`❌ License invalid: ${client_id} - ${errorMessage}`);
      
      return res.status(403).json({ 
        valid: false, 
        error: errorMessage,
        expires_at: license.expires_at,
        status: license.status,
        payment_status: license.payment_status
      });
    }

    // Posodobi zadnji dostop
    updateLastCheck(client_id);

    // Pridobi konfiguracijo paketa
    const planConfig = getPlanConfig(license.plan);

    // Preveri, ali se licenca bliža poteku
    const now = new Date();
    const expiresAt = new Date(license.expires_at);
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    
    let expiryWarning = null;
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      expiryWarning = `Licenca poteče čez ${daysUntilExpiry} dni`;
    }

    // Generiraj access token
    const accessToken = generateLicenseToken(client_id, license_key);

    const responseTime = Date.now() - startTime;

    // Uspešna validacija - audit logging
    await auditLogger.logLicenseActivity('LICENSE_VALIDATION', {
      client_id: client_id,
      license_key: license_key,
      ip_address: clientIP,
      user_agent: userAgent,
      result: 'success',
      additional_info: {
        plan: license.plan,
        modules_count: planConfig.modules.length,
        usage_count: license.usage_count,
        response_time: responseTime
      }
    });

    // Webhook obvestilo o uspešni validaciji
    await webhookManager.notifyLicenseValidation(client_id, license_key, 'success', {
      plan: license.plan,
      modules: planConfig.modules,
      usage_count: license.usage_count
    });

    // Logiraj uspešno validacijo
    console.log(`✅ License validated: ${client_id} (${license.plan}) from ${clientIP}`);

    // Vrni uspešen odgovor
    return res.json({
      valid: true,
      client_id: client_id,
      company_name: license.company_name,
      plan: license.plan,
      plan_name: planConfig.name,
      expires_at: license.expires_at,
      days_until_expiry: daysUntilExpiry,
      modules: planConfig.modules,
      features: planConfig.features,
      max_users: planConfig.max_users,
      max_locations: planConfig.max_locations,
      storage_gb: planConfig.storage_gb,
      support_level: planConfig.support_level,
      payment_status: license.payment_status,
      usage_count: license.usage_count,
      last_check: license.last_check,
      expiry_warning: expiryWarning,
      access_token: accessToken
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Audit logging za napako
    await auditLogger.logSecurityEvent('LICENSE_VALIDATION_ERROR', {
      client_id: req.body?.client_id || 'unknown',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent') || 'unknown',
      severity: 'high',
      additional_info: {
        error: error.message,
        response_time: responseTime
      }
    });
    
    console.error('❌ License validation error:', error);
    
    return res.status(500).json({
      valid: false,
      error: 'Interna napaka strežnika',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Pridobi informacije o licenci
 */
async function getLicenseInfo(req, res) {
  try {
    const { client_id } = req.params;
    
    if (!client_id) {
      return res.status(400).json({
        error: 'Client ID je obvezen parameter'
      });
    }

    const license = findLicenseByClientId(client_id);
    
    if (!license) {
      return res.status(404).json({
        error: 'Licenca ni najdena'
      });
    }

    const planConfig = getPlanConfig(license.plan);
    const now = new Date();
    const expiresAt = new Date(license.expires_at);
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    return res.json({
      client_id: license.client_id,
      company_name: license.company_name,
      contact_email: license.contact_email,
      plan: license.plan,
      plan_name: planConfig.name,
      status: license.status,
      created_at: license.created_at,
      expires_at: license.expires_at,
      days_until_expiry: daysUntilExpiry,
      payment_status: license.payment_status,
      usage_count: license.usage_count,
      last_check: license.last_check,
      features: planConfig.features,
      modules: planConfig.modules,
      limits: {
        max_users: planConfig.max_users,
        max_locations: planConfig.max_locations,
        storage_gb: planConfig.storage_gb
      }
    });

  } catch (error) {
    console.error('❌ Get license info error:', error);
    
    return res.status(500).json({
      error: 'Interna napaka strežnika'
    });
  }
}

/**
 * Pridobi vse licence (admin funkcija)
 */
async function getAllLicensesController(req, res) {
  try {
    const licenses = getAllLicenses();
    
    // Dodaj dodatne informacije za vsako licenco
    const enrichedLicenses = licenses.map(license => {
      const planConfig = getPlanConfig(license.plan);
      const now = new Date();
      const expiresAt = new Date(license.expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...license,
        plan_name: planConfig.name,
        days_until_expiry: daysUntilExpiry,
        is_valid: isLicenseValid(license),
        is_expired: now >= expiresAt
      };
    });

    return res.json({
      total: enrichedLicenses.length,
      active: enrichedLicenses.filter(l => l.is_valid).length,
      expired: enrichedLicenses.filter(l => l.is_expired).length,
      licenses: enrichedLicenses
    });

  } catch (error) {
    console.error('❌ Get all licenses error:', error);
    
    return res.status(500).json({
      error: 'Interna napaka strežnika'
    });
  }
}

/**
 * Ustvari novo licenco
 */
async function createLicense(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Neveljavni podatki',
        details: errors.array()
      });
    }

    const { company_name, contact_email, contact_phone, address, plan } = req.body;

    // Generiraj novo licenco
    const newLicense = generateLicense({
      company_name,
      contact_email,
      contact_phone,
      address,
      plan
    });

    const planConfig = getPlanConfig(plan);

    console.log(`✅ New license created: ${newLicense.client_id} for ${company_name}`);

    return res.status(201).json({
      success: true,
      message: 'Licenca uspešno ustvarjena',
      license: {
        client_id: newLicense.client_id,
        license_key: newLicense.license_key,
        company_name: newLicense.company_name,
        plan: newLicense.plan,
        plan_name: planConfig.name,
        expires_at: newLicense.expires_at,
        features: planConfig.features,
        modules: planConfig.modules
      }
    });

  } catch (error) {
    console.error('❌ Create license error:', error);
    
    return res.status(500).json({
      error: 'Napaka pri ustvarjanju licence'
    });
  }
}

/**
 * Preveri access token
 */
async function verifyAccessToken(req, res) {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'Token je obvezen parameter'
      });
    }

    const result = verifyLicenseToken(token);
    
    if (!result.valid) {
      return res.status(401).json({
        valid: false,
        error: 'Neveljaven token'
      });
    }

    // Preveri, ali licenca še vedno obstaja in je veljavna
    const license = findLicense(result.client_id, result.license_key);
    
    if (!license || !isLicenseValid(license)) {
      return res.status(401).json({
        valid: false,
        error: 'Licenca ni več veljavna'
      });
    }

    return res.json({
      valid: true,
      client_id: result.client_id,
      issued_at: result.issued_at
    });

  } catch (error) {
    console.error('❌ Verify access token error:', error);
    
    return res.status(500).json({
      valid: false,
      error: 'Interna napaka strežnika'
    });
  }
}

/**
 * Health check endpoint
 */
async function healthCheck(req, res) {
  try {
    const totalLicenses = getAllLicenses().length;
    const activeLicenses = getActiveLicenses().length;
    const expiredLicenses = getExpiredLicenses().length;

    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      statistics: {
        total_licenses: totalLicenses,
        active_licenses: activeLicenses,
        expired_licenses: expiredLicenses
      }
    });

  } catch (error) {
    console.error('❌ Health check error:', error);
    
    return res.status(500).json({
      status: 'unhealthy',
      error: 'Sistem ni dostopen'
    });
  }
}

module.exports = {
  checkLicense,
  getLicenseInfo,
  getAllLicensesController,
  createLicense,
  verifyAccessToken,
  healthCheck
};