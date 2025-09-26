// 👑 Admin Controller (Administratorske funkcionalnosti)
const bcrypt = require('bcryptjs');

// Dinamičen uvoz modela User glede na DEMO_MODE
let User;
if (process.env.DEMO_MODE === 'true') {
  // Demo model z razširjenimi funkcionalnostmi
  const DemoUser = {
    find: (query = {}) => {
      const demoUsers = [
        { 
          _id: '1', 
          username: 'admin', 
          email: 'admin@omni.si', 
          isAdmin: true,
          isActive: true,
          createdAt: new Date('2024-01-01'),
          lastLogin: new Date(),
          profile: {
            firstName: 'Admin',
            lastName: 'Uporabnik',
            phone: '+386 1 234 5678'
          },
          licenseStatus: 'active',
          currentPlan: 'Enterprise'
        },
        { 
          _id: '2', 
          username: 'user1', 
          email: 'user1@omni.si', 
          isAdmin: false,
          isActive: true,
          createdAt: new Date('2024-01-15'),
          lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          profile: {
            firstName: 'Janez',
            lastName: 'Novak',
            phone: '+386 31 123 456'
          },
          licenseStatus: 'active',
          currentPlan: 'Professional'
        },
        { 
          _id: '3', 
          username: 'user2', 
          email: 'user2@omni.si', 
          isAdmin: false,
          isActive: false,
          createdAt: new Date('2024-02-01'),
          lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          profile: {
            firstName: 'Ana',
            lastName: 'Kovač',
            phone: '+386 41 987 654'
          },
          licenseStatus: 'expired',
          currentPlan: 'Starter'
        }
      ];
      
      let filteredUsers = demoUsers;
      
      if (query.isActive !== undefined) {
        filteredUsers = filteredUsers.filter(u => u.isActive === query.isActive);
      }
      if (query.isAdmin !== undefined) {
        filteredUsers = filteredUsers.filter(u => u.isAdmin === query.isAdmin);
      }
      if (query.licenseStatus) {
        filteredUsers = filteredUsers.filter(u => u.licenseStatus === query.licenseStatus);
      }
      
      return Promise.resolve(filteredUsers);
    },
    findById: (id) => {
      const demoUsers = [
        { 
          _id: '1', 
          username: 'admin', 
          email: 'admin@omni.si', 
          isAdmin: true,
          isActive: true,
          createdAt: new Date('2024-01-01'),
          lastLogin: new Date(),
          profile: {
            firstName: 'Admin',
            lastName: 'Uporabnik',
            phone: '+386 1 234 5678'
          },
          licenseStatus: 'active',
          currentPlan: 'Enterprise'
        },
        { 
          _id: '2', 
          username: 'user1', 
          email: 'user1@omni.si', 
          isAdmin: false,
          isActive: true,
          createdAt: new Date('2024-01-15'),
          lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          profile: {
            firstName: 'Janez',
            lastName: 'Novak',
            phone: '+386 31 123 456'
          },
          licenseStatus: 'active',
          currentPlan: 'Professional'
        },
        { 
          _id: '3', 
          username: 'user2', 
          email: 'user2@omni.si', 
          isAdmin: false,
          isActive: false,
          createdAt: new Date('2024-02-01'),
          lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          profile: {
            firstName: 'Ana',
            lastName: 'Kovač',
            phone: '+386 41 987 654'
          },
          licenseStatus: 'expired',
          currentPlan: 'Starter'
        }
      ];
      return Promise.resolve(demoUsers.find(u => u._id === id));
    },
    findByIdAndUpdate: (id, update) => {
      return Promise.resolve({ _id: id, ...update });
    },
    findByIdAndDelete: (id) => {
      return Promise.resolve({ _id: id, deleted: true });
    },
    countDocuments: (query = {}) => {
      return Promise.resolve(3);
    }
  };
  User = DemoUser;
} else {
  User = require('../models/User');
}

// Demo podatki za sistem
const systemSettings = {
  general: {
    siteName: 'Omni Cloud Platform',
    siteDescription: 'Univerzalna platforma za podjetja',
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: false
  },
  security: {
    passwordMinLength: 8,
    sessionTimeout: 3600, // sekunde
    maxLoginAttempts: 5,
    lockoutDuration: 900, // sekunde
    twoFactorEnabled: false
  },
  email: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    fromEmail: 'noreply@omni.si',
    fromName: 'Omni Platform'
  },
  features: {
    tourismModule: true,
    horecaModule: true,
    analyticsModule: true,
    notificationsEnabled: true,
    backupEnabled: true
  }
};

const activities = [];

// 📊 Admin nadzorna plošča
const getDashboard = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Pridobi uporabnike
    const allUsers = await User.find();
    const activeUsers = await User.find({ isActive: true });
    const adminUsers = await User.find({ isAdmin: true });

    // Simulacija drugih podatkov za demo
    const mockData = {
      licenses: {
        total: 15,
        active: 12,
        expired: 3,
        revenue: 2450.50
      },
      tourism: {
        bookings: 45,
        revenue: 8750.00,
        destinations: 12
      },
      horeca: {
        orders: 128,
        revenue: 3420.75,
        menuItems: 25
      }
    };

    const dashboard = {
      overview: {
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        adminUsers: adminUsers.length,
        totalRevenue: mockData.licenses.revenue + mockData.tourism.revenue + mockData.horeca.revenue,
        systemStatus: 'operational'
      },
      users: {
        total: allUsers.length,
        active: activeUsers.length,
        inactive: allUsers.length - activeUsers.length,
        newToday: allUsers.filter(user => 
          new Date(user.createdAt) >= today
        ).length,
        newThisWeek: allUsers.filter(user => 
          new Date(user.createdAt) >= thisWeek
        ).length,
        newThisMonth: allUsers.filter(user => 
          new Date(user.createdAt) >= thisMonth
        ).length
      },
      licenses: mockData.licenses,
      modules: {
        tourism: {
          ...mockData.tourism,
          enabled: systemSettings.features.tourismModule
        },
        horeca: {
          ...mockData.horeca,
          enabled: systemSettings.features.horecaModule
        }
      },
      system: {
        uptime: '99.9%',
        lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000),
        maintenanceMode: systemSettings.general.maintenanceMode,
        version: '1.0.0'
      },
      recentActivities: activities.slice(-10).reverse()
    };

    res.json({
      success: true,
      dashboard
    });

  } catch (error) {
    console.error('Admin dashboard napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju nadzorne plošče' 
    });
  }
};

// 👥 Upravljanje uporabnikov
const getUsers = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      role, 
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    let query = {};
    
    // Filtri
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (role === 'admin') query.isAdmin = true;
    if (role === 'user') query.isAdmin = false;

    const users = await User.find(query);
    
    // Iskanje
    let filteredUsers = users;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.profile?.firstName && user.profile.firstName.toLowerCase().includes(searchLower)) ||
        (user.profile?.lastName && user.profile.lastName.toLowerCase().includes(searchLower))
      );
    }

    // Sortiranje
    filteredUsers.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'username':
          aValue = a.username;
          bValue = b.username;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'lastLogin':
          aValue = new Date(a.lastLogin || 0);
          bValue = new Date(b.lastLogin || 0);
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Paginacija
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    res.json({
      success: true,
      users: paginatedUsers.map(user => ({
        ...user,
        password: undefined // Ne vračaj gesla
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredUsers.length / parseInt(limit)),
        totalUsers: filteredUsers.length,
        hasNext: endIndex < filteredUsers.length,
        hasPrev: startIndex > 0
      },
      filters: {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        inactiveUsers: users.filter(u => !u.isActive).length,
        adminUsers: users.filter(u => u.isAdmin).length
      }
    });

  } catch (error) {
    console.error('Get users napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju uporabnikov' 
    });
  }
};

// 🔄 Posodobi status uporabnika
const updateUserStatus = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    const { id } = req.params;
    const { isActive, isAdmin, reason } = req.body;

    if (id === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Ne morete spremeniti svojega statusa'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Uporabnik ni najden'
      });
    }

    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true });

    // Dodaj aktivnost
    activities.push({
      id: activities.length + 1,
      type: 'user_update',
      adminId: req.user.userId,
      adminUsername: req.user.username,
      targetUserId: id,
      targetUsername: user.username,
      action: `Posodobljen status uporabnika`,
      details: { updates, reason },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Status uporabnika uspešno posodobljen',
      user: {
        ...updatedUser,
        password: undefined
      }
    });

  } catch (error) {
    console.error('Update user status napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri posodabljanju statusa' 
    });
  }
};

// 🗑️ Izbriši uporabnika
const deleteUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (id === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Ne morete izbrisati sebe'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Uporabnik ni najden'
      });
    }

    await User.findByIdAndDelete(id);

    // Dodaj aktivnost
    activities.push({
      id: activities.length + 1,
      type: 'user_delete',
      adminId: req.user.userId,
      adminUsername: req.user.username,
      targetUserId: id,
      targetUsername: user.username,
      action: `Izbrisan uporabnik`,
      details: { reason },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Uporabnik uspešno izbrisan'
    });

  } catch (error) {
    console.error('Delete user napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri brisanju uporabnika' 
    });
  }
};

// ⚙️ Sistemske nastavitve
const getSystemSettings = (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    res.json({
      success: true,
      settings: systemSettings
    });

  } catch (error) {
    console.error('Get system settings napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju nastavitev' 
    });
  }
};

// ⚙️ Posodobi sistemske nastavitve
const updateSystemSettings = (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    const { category, settings } = req.body;

    if (!systemSettings[category]) {
      return res.status(400).json({
        success: false,
        message: 'Neznana kategorija nastavitev'
      });
    }

    // Posodobi nastavitve
    systemSettings[category] = {
      ...systemSettings[category],
      ...settings
    };

    // Dodaj aktivnost
    activities.push({
      id: activities.length + 1,
      type: 'settings_update',
      adminId: req.user.userId,
      adminUsername: req.user.username,
      action: `Posodobljene ${category} nastavitve`,
      details: { category, settings },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Nastavitve uspešno posodobljene',
      settings: systemSettings[category]
    });

  } catch (error) {
    console.error('Update system settings napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri posodabljanju nastavitev' 
    });
  }
};

// 📊 Sistemska poročila
const getSystemReports = (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    const { type = 'overview', period = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Simulacija poročil za demo
    const reports = {
      overview: {
        period,
        startDate,
        endDate: now,
        metrics: {
          userGrowth: 15.5,
          revenueGrowth: 23.2,
          systemUptime: 99.9,
          averageResponseTime: 145
        },
        charts: {
          userRegistrations: generateMockChartData(period, 'users'),
          revenue: generateMockChartData(period, 'revenue'),
          systemLoad: generateMockChartData(period, 'load')
        }
      },
      users: {
        totalUsers: 156,
        activeUsers: 142,
        newUsers: 23,
        usersByPlan: {
          starter: 45,
          professional: 78,
          enterprise: 33
        },
        topCountries: [
          { country: 'Slovenia', users: 89 },
          { country: 'Croatia', users: 34 },
          { country: 'Austria', users: 23 },
          { country: 'Italy', users: 10 }
        ]
      },
      performance: {
        averageResponseTime: 145,
        uptime: 99.9,
        errorRate: 0.1,
        throughput: 1250,
        memoryUsage: 68.5,
        cpuUsage: 42.3,
        diskUsage: 34.7
      }
    };

    res.json({
      success: true,
      report: reports[type] || reports.overview
    });

  } catch (error) {
    console.error('Get system reports napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju poročil' 
    });
  }
};

// 📋 Aktivnosti sistema
const getSystemActivities = (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    const { 
      page = 1, 
      limit = 50, 
      type, 
      adminId,
      startDate,
      endDate 
    } = req.query;

    let filteredActivities = [...activities];

    // Filtri
    if (type) {
      filteredActivities = filteredActivities.filter(activity => 
        activity.type === type
      );
    }

    if (adminId) {
      filteredActivities = filteredActivities.filter(activity => 
        activity.adminId === adminId
      );
    }

    if (startDate) {
      filteredActivities = filteredActivities.filter(activity => 
        new Date(activity.timestamp) >= new Date(startDate)
      );
    }

    if (endDate) {
      filteredActivities = filteredActivities.filter(activity => 
        new Date(activity.timestamp) <= new Date(endDate)
      );
    }

    // Sortiranje po času (najnovejše najprej)
    filteredActivities.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Paginacija
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedActivities = filteredActivities.slice(startIndex, endIndex);

    res.json({
      success: true,
      activities: paginatedActivities,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredActivities.length / parseInt(limit)),
        totalActivities: filteredActivities.length,
        hasNext: endIndex < filteredActivities.length,
        hasPrev: startIndex > 0
      },
      summary: {
        totalActivities: activities.length,
        activityTypes: [...new Set(activities.map(a => a.type))],
        activeAdmins: [...new Set(activities.map(a => a.adminId))].length
      }
    });

  } catch (error) {
    console.error('Get system activities napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju aktivnosti' 
    });
  }
};

// Pomožna funkcija za generiranje demo podatkov za grafe
function generateMockChartData(period, type) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const data = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    let value;
    
    switch (type) {
      case 'users':
        value = Math.floor(Math.random() * 10) + 1;
        break;
      case 'revenue':
        value = Math.floor(Math.random() * 500) + 100;
        break;
      case 'load':
        value = Math.floor(Math.random() * 30) + 40;
        break;
      default:
        value = Math.floor(Math.random() * 100);
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      value
    });
  }
  
  return data;
}

module.exports = {
  getDashboard,
  getUsers,
  updateUserStatus,
  deleteUser,
  getSystemSettings,
  updateSystemSettings,
  getReports: getSystemReports,
  getActivities: getSystemActivities
};