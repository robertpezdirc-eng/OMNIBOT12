/**
 * OMNI License Model
 * Definira licenčne pakete, demo licence in validacijske funkcije
 */

const { v4: uuidv4 } = require('uuid');

// Licenčni paketi
const LICENSE_PLANS = {
  demo: {
    name: 'Demo',
    price: 0,
    duration_days: 14,
    max_users: 2,
    max_locations: 1,
    storage_gb: 0.5,
    support_level: 'community',
    features: ['Osnovne funkcije', '2 uporabnika', '14 dni', '1 lokacija'],
    modules: ['basic_pos', 'simple_inventory']
  },
  basic: {
    name: 'Basic',
    price: 299,
    duration_days: 365,
    max_users: 5,
    max_locations: 1,
    storage_gb: 2,
    support_level: 'email',
    features: ['POS sistem', 'Zaloge', 'Poročila', '5 uporabnikov', 'Email podpora'],
    modules: ['pos', 'inventory', 'reports', 'customers']
  },
  premium: {
    name: 'Premium',
    price: 599,
    duration_days: 365,
    max_users: 20,
    max_locations: 5,
    storage_gb: 10,
    support_level: 'priority',
    features: ['Vse Basic funkcije', 'AI optimizacija', 'Analitika', 'Več lokacij', '20 uporabnikov', 'AR katalog'],
    modules: ['pos', 'inventory', 'reports', 'customers', 'ai_optimization', 'analytics', 'multi_location', 'ar_catalog']
  },
  enterprise: {
    name: 'Enterprise',
    price: 1299,
    duration_days: 365,
    max_users: -1, // Neomejeno
    max_locations: -1, // Neomejeno
    storage_gb: 100,
    support_level: 'dedicated',
    features: ['Vse funkcije', 'Neomejeno uporabnikov', '24/7 podpora', 'Custom integracije', 'Dedicated manager'],
    modules: ['all']
  }
};

// Demo licence
const licenses = [
  {
    client_id: "OMNI001",
    license_key: "8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219",
    company_name: "Hotel Slovenija",
    contact_email: "info@hotel-slovenija.si",
    contact_phone: "+386 1 234 5678",
    address: "Ljubljanska cesta 1, 1000 Ljubljana",
    plan: "premium",
    status: "active",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 leto
    last_check: null,
    usage_count: 0,
    active_devices: 0,
    payment_status: "paid"
  },
  {
    client_id: "OMNI002",
    license_key: "7e3b8d1f-4c6a-42e2-ad44-6c38d0bef320",
    company_name: "Kamp Bled",
    contact_email: "rezervacije@kamp-bled.si",
    contact_phone: "+386 4 567 8901",
    address: "Cesta svobode 15, 4260 Bled",
    plan: "basic",
    status: "active",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_check: null,
    usage_count: 0,
    active_devices: 0,
    payment_status: "paid"
  },
  {
    client_id: "OMNI003",
    license_key: "9a5c7f2d-6e8b-43f1-be55-7d49e1cfg431",
    company_name: "Restavracija Gostilna",
    contact_email: "info@gostilna.si",
    contact_phone: "+386 2 345 6789",
    address: "Glavni trg 8, 2000 Maribor",
    plan: "demo",
    status: "active",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dni
    last_check: null,
    usage_count: 0,
    active_devices: 0,
    payment_status: "demo"
  },
  {
    client_id: "OMNI004",
    license_key: "6b4d8e3c-5f7a-44e3-cf66-8e5af2dhg542",
    company_name: "Turistična agencija Slovenija",
    contact_email: "booking@agencija-slovenija.si",
    contact_phone: "+386 3 456 7890",
    address: "Trubarjeva 12, 3000 Celje",
    plan: "enterprise",
    status: "active",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_check: null,
    usage_count: 0,
    active_devices: 0,
    payment_status: "paid"
  },
  {
    client_id: "OMNI005",
    license_key: "5c3e9f4b-7g8c-45f2-dg77-9f6bg3eih653",
    company_name: "Wellness Center Terme",
    contact_email: "info@terme-wellness.si",
    contact_phone: "+386 5 567 8901",
    address: "Zdraviliška 25, 8250 Brežice",
    plan: "premium",
    status: "suspended",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_check: null,
    usage_count: 0,
    active_devices: 0,
    payment_status: "overdue"
  }
];

/**
 * Poišči licenco po Client ID in License Key
 */
function findLicense(client_id, license_key) {
  return licenses.find(license => 
    license.client_id === client_id && license.license_key === license_key
  );
}

/**
 * Poišči licenco po Client ID
 */
function findLicenseByClientId(client_id) {
  return licenses.find(license => license.client_id === client_id);
}

/**
 * Pridobi konfiguracijo licenčnega paketa
 */
function getPlanConfig(plan) {
  return LICENSE_PLANS[plan] || LICENSE_PLANS.demo;
}

/**
 * Preveri, ali je licenca veljavna
 */
function isLicenseValid(license) {
  if (!license) return false;
  
  const now = new Date();
  const expiresAt = new Date(license.expires_at);
  
  return (
    license.status === 'active' &&
    license.payment_status !== 'suspended' &&
    now < expiresAt
  );
}

/**
 * Pridobi vse licence
 */
function getAllLicenses() {
  return licenses;
}

/**
 * Pridobi aktivne licence
 */
function getActiveLicenses() {
  return licenses.filter(license => isLicenseValid(license));
}

/**
 * Pridobi potekle licence
 */
function getExpiredLicenses() {
  const now = new Date();
  return licenses.filter(license => {
    const expiresAt = new Date(license.expires_at);
    return now >= expiresAt;
  });
}

/**
 * Posodobi zadnji dostop licence
 */
function updateLastCheck(client_id) {
  const license = findLicenseByClientId(client_id);
  if (license) {
    license.last_check = new Date().toISOString();
    license.usage_count = (license.usage_count || 0) + 1;
  }
  return license;
}

/**
 * Generiraj novo licenco
 */
function generateLicense(companyData) {
  const client_id = `OMNI${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const license_key = uuidv4();
  const planConfig = getPlanConfig(companyData.plan);
  
  const newLicense = {
    client_id,
    license_key,
    company_name: companyData.company_name,
    contact_email: companyData.contact_email,
    contact_phone: companyData.contact_phone || '',
    address: companyData.address || '',
    plan: companyData.plan,
    status: 'active',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + planConfig.duration_days * 24 * 60 * 60 * 1000).toISOString(),
    last_check: null,
    usage_count: 0,
    active_devices: 0,
    payment_status: companyData.plan === 'demo' ? 'demo' : 'pending'
  };
  
  licenses.push(newLicense);
  return newLicense;
}

module.exports = {
  licenses,
  LICENSE_PLANS,
  findLicense,
  findLicenseByClientId,
  getPlanConfig,
  isLicenseValid,
  getAllLicenses,
  getActiveLicenses,
  getExpiredLicenses,
  updateLastCheck,
  generateLicense
};