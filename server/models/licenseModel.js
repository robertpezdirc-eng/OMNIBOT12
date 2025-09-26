const { generateLicenseToken, isLicenseExpired } = require('../utils/jwt');

// In-memory license storage (for demo purposes)
// In production, this would be replaced with a database
let licenses = [
  {
    client_id: 'DEMO001',
    license_token: null, // Will be generated
    plan: 'demo',
    status: 'active',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days
    active_modules: ['ceniki'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    max_users: 1,
    company_name: 'Demo Company 1',
    contact_email: 'demo1@example.com'
  },
  {
    client_id: 'DEMO002',
    license_token: null, // Will be generated
    plan: 'basic',
    status: 'active',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
    active_modules: ['ceniki', 'blagajna', 'zaloge'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    max_users: 5,
    company_name: 'Demo Company 2',
    contact_email: 'demo2@example.com'
  },
  {
    client_id: 'DEMO003',
    license_token: null, // Will be generated
    plan: 'premium',
    status: 'active',
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year
    active_modules: ['ceniki', 'blagajna', 'zaloge', 'AI_optimizacija'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    max_users: 50,
    company_name: 'Premium Company',
    contact_email: 'premium@example.com'
  },
  {
    client_id: 'EXPIRED001',
    license_token: null, // Will be generated
    plan: 'basic',
    status: 'inactive',
    expires_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Expired 5 days ago
    active_modules: ['ceniki', 'blagajna'],
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    max_users: 3,
    company_name: 'Expired Company',
    contact_email: 'expired@example.com'
  }
];

// Generate initial tokens for demo licenses
function initializeDemoLicenses() {
  licenses.forEach(license => {
    if (!license.license_token) {
      const expiresIn = Math.ceil((new Date(license.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
      if (expiresIn > 0) {
        license.license_token = generateLicenseToken(
          license.client_id,
          license.plan,
          license.active_modules,
          `${expiresIn}d`
        );
      } else {
        // For expired licenses, generate a token that's already expired
        license.license_token = generateLicenseToken(
          license.client_id,
          license.plan,
          license.active_modules,
          '1s' // 1 second (will be expired immediately)
        );
      }
    }
  });
  console.log('✅ Demo licenses initialized with tokens');
}

// Initialize demo licenses on module load
initializeDemoLicenses();

/**
 * Get all licenses
 * @returns {Array} Array of all licenses
 */
function getAllLicenses() {
  return licenses.map(license => ({
    ...license,
    is_expired: isLicenseExpired(license),
    remaining_days: Math.ceil((new Date(license.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
  }));
}

/**
 * Find license by client ID
 * @param {string} client_id - Client identifier
 * @returns {Object|null} License object or null if not found
 */
function findLicenseByClientId(client_id) {
  const license = licenses.find(l => l.client_id === client_id);
  if (!license) return null;
  
  return {
    ...license,
    is_expired: isLicenseExpired(license),
    remaining_days: Math.ceil((new Date(license.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
  };
}

/**
 * Find license by token
 * @param {string} license_token - License token
 * @returns {Object|null} License object or null if not found
 */
function findLicenseByToken(license_token) {
  const license = licenses.find(l => l.license_token === license_token);
  if (!license) return null;
  
  return {
    ...license,
    is_expired: isLicenseExpired(license),
    remaining_days: Math.ceil((new Date(license.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
  };
}

/**
 * Add new license
 * @param {Object} licenseData - License data
 * @returns {Object} Created license
 */
function addLicense(licenseData) {
  const newLicense = {
    client_id: licenseData.client_id,
    license_token: licenseData.license_token,
    plan: licenseData.plan,
    status: licenseData.status || 'active',
    expires_at: licenseData.expires_at,
    active_modules: licenseData.active_modules || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    max_users: licenseData.max_users || getPlanMaxUsers(licenseData.plan),
    company_name: licenseData.company_name || '',
    contact_email: licenseData.contact_email || ''
  };
  
  licenses.push(newLicense);
  return newLicense;
}

/**
 * Update existing license
 * @param {string} client_id - Client identifier
 * @param {Object} updateData - Data to update
 * @returns {Object|null} Updated license or null if not found
 */
function updateLicense(client_id, updateData) {
  const index = licenses.findIndex(l => l.client_id === client_id);
  if (index === -1) return null;
  
  licenses[index] = {
    ...licenses[index],
    ...updateData,
    updated_at: new Date().toISOString()
  };
  
  return licenses[index];
}

/**
 * Delete license
 * @param {string} client_id - Client identifier
 * @returns {boolean} True if deleted, false if not found
 */
function deleteLicense(client_id) {
  const index = licenses.findIndex(l => l.client_id === client_id);
  if (index === -1) return false;
  
  licenses.splice(index, 1);
  return true;
}

/**
 * Get plan configuration
 * @param {string} plan - Plan name
 * @returns {Object} Plan configuration
 */
function getPlanConfig(plan) {
  const configs = {
    demo: {
      modules: ['ceniki'],
      max_users: 1,
      duration_days: 7,
      features: ['Osnovni ceniki', 'Demo podpora']
    },
    basic: {
      modules: ['ceniki', 'blagajna', 'zaloge'],
      max_users: 5,
      duration_days: 30,
      features: ['Ceniki', 'Blagajna', 'Upravljanje zalog', 'Email podpora']
    },
    premium: {
      modules: ['ceniki', 'blagajna', 'zaloge', 'AI_optimizacija'],
      max_users: 50,
      duration_days: 365,
      features: ['Vsi moduli', 'AI optimizacija', 'Neomejeni uporabniki', 'Premium podpora', 'Analitika']
    }
  };
  
  return configs[plan] || configs.demo;
}

/**
 * Get maximum users for plan
 * @param {string} plan - Plan name
 * @returns {number} Maximum users
 */
function getPlanMaxUsers(plan) {
  return getPlanConfig(plan).max_users;
}

/**
 * Get modules for plan
 * @param {string} plan - Plan name
 * @returns {Array} Available modules
 */
function getPlanModules(plan) {
  return getPlanConfig(plan).modules;
}

/**
 * Check if client ID already exists
 * @param {string} client_id - Client identifier
 * @returns {boolean} True if exists
 */
function clientIdExists(client_id) {
  return licenses.some(l => l.client_id === client_id);
}

/**
 * Get license statistics
 * @returns {Object} License statistics
 */
function getLicenseStats() {
  const total = licenses.length;
  const active = licenses.filter(l => l.status === 'active').length;
  const inactive = licenses.filter(l => l.status === 'inactive').length;
  const expired = licenses.filter(l => isLicenseExpired(l)).length;
  
  const byPlan = {
    demo: licenses.filter(l => l.plan === 'demo').length,
    basic: licenses.filter(l => l.plan === 'basic').length,
    premium: licenses.filter(l => l.plan === 'premium').length
  };
  
  return {
    total,
    active,
    inactive,
    expired,
    by_plan: byPlan,
    last_updated: new Date().toISOString()
  };
}

module.exports = {
  getAllLicenses,
  findLicenseByClientId,
  findLicenseByToken,
  addLicense,
  updateLicense,
  deleteLicense,
  getPlanConfig,
  getPlanMaxUsers,
  getPlanModules,
  clientIdExists,
  getLicenseStats,
  initializeDemoLicenses
};