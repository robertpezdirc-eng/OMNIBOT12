// 🔐 License Controller (Licenčni sistem)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Demo podatki za licence in pakete
const licensePlans = [
  {
    id: 1,
    name: 'Starter',
    description: 'Osnovni paket za manjša podjetja',
    price: 29.99,
    currency: 'EUR',
    duration: 30, // dni
    features: [
      'Do 5 uporabnikov',
      'Osnovne funkcionalnosti',
      'Email podpora',
      'Mesečna poročila'
    ],
    limits: {
      users: 5,
      storage: '1GB',
      apiCalls: 1000,
      modules: ['auth', 'basic']
    },
    popular: false
  },
  {
    id: 2,
    name: 'Professional',
    description: 'Napredni paket za rastoča podjetja',
    price: 79.99,
    currency: 'EUR',
    duration: 30,
    features: [
      'Do 25 uporabnikov',
      'Vse funkcionalnosti',
      'Prednostna podpora',
      'Tedenski poročila',
      'API dostop',
      'Prilagojene integracije'
    ],
    limits: {
      users: 25,
      storage: '10GB',
      apiCalls: 10000,
      modules: ['auth', 'tourism', 'horeca', 'basic']
    },
    popular: true
  },
  {
    id: 3,
    name: 'Enterprise',
    description: 'Popolna rešitev za velika podjetja',
    price: 199.99,
    currency: 'EUR',
    duration: 30,
    features: [
      'Neomejeno uporabnikov',
      'Vse funkcionalnosti',
      '24/7 podpora',
      'Dnevni poročila',
      'Popoln API dostop',
      'Prilagojene rešitve',
      'Dedicirani account manager',
      'SLA garancija'
    ],
    limits: {
      users: -1, // neomejeno
      storage: '100GB',
      apiCalls: 100000,
      modules: ['auth', 'tourism', 'horeca', 'admin', 'analytics', 'basic']
    },
    popular: false
  }
];

const licenses = [];

// Dinamičen uvoz modela User glede na DEMO_MODE
let User;
if (process.env.DEMO_MODE === 'true') {
  // Demo model
  const DemoUser = {
    findById: (id) => {
      const demoUsers = [
        { _id: '1', username: 'admin', email: 'admin@omni.si', isAdmin: true },
        { _id: '2', username: 'user1', email: 'user1@omni.si', isAdmin: false },
        { _id: '3', username: 'user2', email: 'user2@omni.si', isAdmin: false }
      ];
      return Promise.resolve(demoUsers.find(u => u._id === id));
    },
    findByIdAndUpdate: (id, update) => {
      return Promise.resolve({ _id: id, ...update });
    }
  };
  User = DemoUser;
} else {
  User = require('../models/User');
}

// 📦 Pridobi vse licenčne pakete
const getLicensePlans = (req, res) => {
  try {
    const { sortBy = 'price', currency = 'EUR' } = req.query;
    
    let plans = [...licensePlans];

    // Sortiranje
    switch (sortBy) {
      case 'price_asc':
        plans.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        plans.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        plans.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'users':
        plans.sort((a, b) => {
          const aUsers = a.limits.users === -1 ? 999999 : a.limits.users;
          const bUsers = b.limits.users === -1 ? 999999 : b.limits.users;
          return aUsers - bUsers;
        });
        break;
      default:
        // Privzeto sortiranje po ceni
        plans.sort((a, b) => a.price - b.price);
    }

    // Konverzija valute (demo - samo EUR)
    if (currency !== 'EUR') {
      const exchangeRates = { USD: 1.1, GBP: 0.85 };
      const rate = exchangeRates[currency] || 1;
      
      plans = plans.map(plan => ({
        ...plan,
        price: (plan.price * rate).toFixed(2),
        currency,
        originalPrice: plan.price,
        originalCurrency: 'EUR'
      }));
    }

    res.json({
      success: true,
      plans,
      total: plans.length,
      currencies: ['EUR', 'USD', 'GBP'],
      comparison: {
        cheapest: plans.reduce((min, plan) => 
          plan.price < min.price ? plan : min, plans[0]
        ),
        mostPopular: plans.find(plan => plan.popular),
        mostFeatures: plans.reduce((max, plan) => 
          plan.features.length > max.features.length ? plan : max, plans[0]
        )
      }
    });

  } catch (error) {
    console.error('Get license plans napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju licenčnih paketov' 
    });
  }
};

// 🛒 Nakupi licenco
const purchaseLicense = async (req, res) => {
  try {
    const { planId, paymentMethod = 'demo', billingInfo } = req.body;
    
    const plan = licensePlans.find(p => p.id === parseInt(planId));
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Licenčni paket ni najden'
      });
    }

    // Preveri, če uporabnik že ima aktivno licenco
    const existingLicense = licenses.find(license => 
      license.userId === req.user.userId && 
      license.status === 'active' &&
      new Date(license.expiresAt) > new Date()
    );

    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'Že imate aktivno licenco. Najprej jo prekličite ali počakajte, da poteče.'
      });
    }

    // Simulacija plačila (demo)
    const paymentResult = {
      success: true,
      transactionId: `TXN-${Date.now()}`,
      amount: plan.price,
      currency: plan.currency,
      method: paymentMethod
    };

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Plačilo ni uspešno'
      });
    }

    // Ustvari novo licenco
    const license = {
      id: licenses.length + 1,
      userId: req.user.userId,
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      purchasedAt: new Date(),
      expiresAt: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
      features: plan.features,
      limits: plan.limits,
      payment: {
        transactionId: paymentResult.transactionId,
        amount: plan.price,
        currency: plan.currency,
        method: paymentMethod,
        billingInfo: billingInfo || {}
      },
      licenseKey: `OMNI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    };

    licenses.push(license);

    // Posodobi uporabnikove pravice
    try {
      await User.findByIdAndUpdate(req.user.userId, {
        currentLicense: license.id,
        licenseStatus: 'active',
        licenseExpiresAt: license.expiresAt,
        availableModules: plan.limits.modules
      });
    } catch (userUpdateError) {
      console.warn('Napaka pri posodabljanju uporabnika:', userUpdateError);
    }

    res.status(201).json({
      success: true,
      message: 'Licenca uspešno kupljena',
      license: {
        ...license,
        daysRemaining: Math.ceil((new Date(license.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
      }
    });

  } catch (error) {
    console.error('Purchase license napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri nakupu licence' 
    });
  }
};

// 📋 Pridobi uporabnikove licence
const getUserLicenses = (req, res) => {
  try {
    const { status, limit = 10 } = req.query;
    
    let userLicenses = licenses.filter(license => 
      license.userId === req.user.userId
    );

    // Filtriraj po statusu
    if (status) {
      userLicenses = userLicenses.filter(license => license.status === status);
    }

    // Posodobi status poteklih licenc
    userLicenses = userLicenses.map(license => {
      if (license.status === 'active' && new Date(license.expiresAt) <= new Date()) {
        license.status = 'expired';
      }
      return {
        ...license,
        daysRemaining: license.status === 'active' ? 
          Math.ceil((new Date(license.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : 0
      };
    });

    // Omeji število rezultatov
    userLicenses = userLicenses
      .sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt))
      .slice(0, parseInt(limit));

    const activeLicense = userLicenses.find(license => license.status === 'active');

    res.json({
      success: true,
      licenses: userLicenses,
      activeLicense,
      summary: {
        total: userLicenses.length,
        active: userLicenses.filter(l => l.status === 'active').length,
        expired: userLicenses.filter(l => l.status === 'expired').length,
        cancelled: userLicenses.filter(l => l.status === 'cancelled').length
      }
    });

  } catch (error) {
    console.error('Get user licenses napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju licenc' 
    });
  }
};

// 🔄 Podaljšaj licenco
const renewLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'demo', billingInfo } = req.body;
    
    const licenseIndex = licenses.findIndex(license => 
      license.id === parseInt(id) && license.userId === req.user.userId
    );

    if (licenseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Licenca ni najdena'
      });
    }

    const license = licenses[licenseIndex];
    const plan = licensePlans.find(p => p.id === license.planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Licenčni paket ni več na voljo'
      });
    }

    // Simulacija plačila
    const paymentResult = {
      success: true,
      transactionId: `REN-${Date.now()}`,
      amount: plan.price,
      currency: plan.currency,
      method: paymentMethod
    };

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Plačilo ni uspešno'
      });
    }

    // Podaljšaj licenco
    const currentExpiry = new Date(license.expiresAt);
    const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + plan.duration * 24 * 60 * 60 * 1000);

    licenses[licenseIndex] = {
      ...license,
      status: 'active',
      expiresAt: newExpiry,
      renewedAt: new Date(),
      renewalPayment: {
        transactionId: paymentResult.transactionId,
        amount: plan.price,
        currency: plan.currency,
        method: paymentMethod,
        billingInfo: billingInfo || {},
        renewedAt: new Date()
      }
    };

    // Posodobi uporabnikove pravice
    try {
      await User.findByIdAndUpdate(req.user.userId, {
        licenseStatus: 'active',
        licenseExpiresAt: newExpiry
      });
    } catch (userUpdateError) {
      console.warn('Napaka pri posodabljanju uporabnika:', userUpdateError);
    }

    res.json({
      success: true,
      message: 'Licenca uspešno podaljšana',
      license: {
        ...licenses[licenseIndex],
        daysRemaining: Math.ceil((newExpiry - new Date()) / (1000 * 60 * 60 * 24))
      }
    });

  } catch (error) {
    console.error('Renew license napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri podaljšanju licence' 
    });
  }
};

// ❌ Prekliči licenco
const cancelLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const licenseIndex = licenses.findIndex(license => 
      license.id === parseInt(id) && license.userId === req.user.userId
    );

    if (licenseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Licenca ni najdena'
      });
    }

    const license = licenses[licenseIndex];
    
    if (license.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Lahko prekličete samo aktivne licence'
      });
    }

    // Prekliči licenco
    licenses[licenseIndex] = {
      ...license,
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason || 'Uporabnik je preklical licenco'
    };

    // Posodobi uporabnikove pravice
    try {
      await User.findByIdAndUpdate(req.user.userId, {
        licenseStatus: 'cancelled',
        availableModules: ['auth', 'basic'] // Osnovni moduli
      });
    } catch (userUpdateError) {
      console.warn('Napaka pri posodabljanju uporabnika:', userUpdateError);
    }

    res.json({
      success: true,
      message: 'Licenca uspešno preklicana',
      license: licenses[licenseIndex]
    });

  } catch (error) {
    console.error('Cancel license napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri prekliču licence' 
    });
  }
};

// ✅ Validiraj licenco
const validateLicense = (req, res) => {
  try {
    const { licenseKey } = req.params;
    
    const license = licenses.find(l => l.licenseKey === licenseKey);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licenčni ključ ni veljaven',
        valid: false
      });
    }

    const isActive = license.status === 'active' && new Date(license.expiresAt) > new Date();
    const daysRemaining = isActive ? 
      Math.ceil((new Date(license.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    res.json({
      success: true,
      valid: isActive,
      license: {
        id: license.id,
        planName: license.planName,
        status: license.status,
        expiresAt: license.expiresAt,
        daysRemaining,
        features: license.features,
        limits: license.limits
      }
    });

  } catch (error) {
    console.error('Validate license napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri validaciji licence',
      valid: false
    });
  }
};

// 📊 Statistike licenc (admin)
const getLicenseStats = (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthLicenses = licenses.filter(license => 
      new Date(license.purchasedAt) >= thisMonth
    );
    const lastMonthLicenses = licenses.filter(license => 
      new Date(license.purchasedAt) >= lastMonth && 
      new Date(license.purchasedAt) < thisMonth
    );

    const stats = {
      overview: {
        totalLicenses: licenses.length,
        activeLicenses: licenses.filter(l => 
          l.status === 'active' && new Date(l.expiresAt) > now
        ).length,
        expiredLicenses: licenses.filter(l => 
          l.status === 'expired' || (l.status === 'active' && new Date(l.expiresAt) <= now)
        ).length,
        cancelledLicenses: licenses.filter(l => l.status === 'cancelled').length,
        totalRevenue: licenses.reduce((sum, license) => 
          sum + (license.payment?.amount || 0), 0
        )
      },
      monthly: {
        thisMonth: {
          licenses: thisMonthLicenses.length,
          revenue: thisMonthLicenses.reduce((sum, license) => 
            sum + (license.payment?.amount || 0), 0
          )
        },
        lastMonth: {
          licenses: lastMonthLicenses.length,
          revenue: lastMonthLicenses.reduce((sum, license) => 
            sum + (license.payment?.amount || 0), 0
          )
        }
      },
      planPopularity: licensePlans.map(plan => ({
        ...plan,
        purchaseCount: licenses.filter(license => license.planId === plan.id).length,
        activeCount: licenses.filter(license => 
          license.planId === plan.id && 
          license.status === 'active' && 
          new Date(license.expiresAt) > now
        ).length,
        revenue: licenses
          .filter(license => license.planId === plan.id)
          .reduce((sum, license) => sum + (license.payment?.amount || 0), 0)
      })).sort((a, b) => b.purchaseCount - a.purchaseCount),
      expiringLicenses: licenses.filter(license => {
        if (license.status !== 'active') return false;
        const daysUntilExpiry = (new Date(license.expiresAt) - now) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      }).length,
      paymentMethods: licenses.reduce((acc, license) => {
        const method = license.payment?.method || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {}),
      renewalRate: licenses.filter(l => l.renewedAt).length / licenses.length * 100
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('License stats napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju statistik' 
    });
  }
};

module.exports = {
  getLicensePackages: getLicensePlans,
  getLicensePlans,
  purchaseLicense,
  getUserLicenses,
  extendLicense: renewLicense,
  renewLicense,
  cancelLicense,
  validateLicense,
  getLicenseStats
};