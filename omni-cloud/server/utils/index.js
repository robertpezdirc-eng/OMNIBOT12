// 🚀 Omni Cloud Server Utilities
const jwt = require("jsonwebtoken");

/**
 * Obvesti uporabnike v določeni plan sobi o posodobitvi licence
 * @param {Object} user - Uporabnik z posodobljeno licenco
 * @param {Object} io - Socket.IO server instanca
 */
const notifyPlanRoom = (user, io) => {
  io.to(user.plan).emit("license_update", {
    email: user.email,
    plan: user.plan,
    expires: user.plan_expires,
    timestamp: new Date().toISOString(),
    message: `Licenca za ${user.email} je bila posodobljena na ${user.plan}`
  });
  
  // Pošlji tudi globalno obvestilo administratorjem
  io.to("admin").emit("admin_notification", {
    type: "license_update",
    user: user.email,
    plan: user.plan,
    expires: user.plan_expires,
    timestamp: new Date().toISOString()
  });
};

/**
 * Cron job za preverjanje poteka licenc
 * @param {Object} io - Socket.IO server instanca
 */
const runCronExpiry = async (io) => {
  console.log("🕐 Zaganjam cron job za preverjanje poteka licenc...");
  
  const DEMO_MODE = process.env.DEMO_MODE === 'true';
  
  // Ne zaganjaj takoj, samo nastavi interval
  const intervalId = setInterval(async () => {
    try {
      if (DEMO_MODE) {
        console.log("🎯 Demo mode: Preskačem preverjanje poteka licenc");
        return;
      }

      // Dinamičen uvoz User modela
      let User;
      try {
        User = require('../models/User');
      } catch (error) {
        console.log("⚠️ User model ni na voljo, preskačem preverjanje licenc");
        return;
      }

      const now = new Date();
      const expiredUsers = await User.find({
        plan_expires: { $lt: now },
        plan: { $ne: "demo" }
      });
      
      if (expiredUsers.length > 0) {
        console.log(`⚠️ Najdenih ${expiredUsers.length} poteklih licenc`);
        
        for (let user of expiredUsers) {
          const oldPlan = user.plan;
          user.plan = "demo";
          user.plan_expires = null;
          await user.save();
          
          // Obvesti uporabnika in administratorje
          if (io && typeof io.to === 'function') {
            notifyPlanRoom(user, io);
          }
          
          console.log(`⚠️ ${user.email} plan ${oldPlan} je potekel, degradiran na DEMO`);
          
          // Pošlji obvestilo tudi direktno uporabniku, če je povezan
          if (io && typeof io.to === 'function') {
            io.to(user.email).emit("plan_expired", {
              message: `Vaš ${oldPlan} plan je potekel. Degradirani ste na DEMO plan.`,
              newPlan: "demo",
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Pošlji skupno statistiko administratorjem
        if (io && typeof io.to === 'function') {
          io.to("admin").emit("bulk_expiry_notification", {
            count: expiredUsers.length,
            users: expiredUsers.map(u => ({ email: u.email, oldPlan: u.plan })),
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error("❌ Napaka pri preverjanju poteka licenc:", error);
      
      // Obvesti administratorje o napaki
      if (io && typeof io.to === 'function') {
        io.to("admin").emit("system_error", {
          type: "cron_error",
          message: "Napaka pri preverjanju poteka licenc",
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, 60000); // Preveri vsako minuto
  
  return intervalId;
};

/**
 * Generiraj JWT token
 * @param {Object} payload - Podatki za vključitev v token
 * @param {string} expiresIn - Čas veljavnosti tokena
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = "24h") => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Preveri JWT token
 * @param {string} token - JWT token za preverjanje
 * @returns {Object|null} Dekodirani payload ali null če je token neveljaven
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("❌ Neveljaven JWT token:", error.message);
    return null;
  }
};

/**
 * Izračunaj statistike uporabnikov
 * @param {Array} users - Seznam uporabnikov
 * @returns {Object} Statistike uporabnikov
 */
const calculateUserStats = (users) => {
  const now = new Date();
  
  const stats = {
    total: users.length,
    active: 0,
    expired: 0,
    demo: 0,
    basic: 0,
    premium: 0,
    revenue: 0
  };
  
  users.forEach(user => {
    // Preveri ali je plan aktiven
    if (user.plan === "demo" || (user.plan_expires && user.plan_expires > now)) {
      stats.active++;
    } else {
      stats.expired++;
    }
    
    // Štej po planih
    stats[user.plan]++;
    
    // Izračunaj prihodke (približno)
    if (user.plan === "basic") stats.revenue += 10;
    if (user.plan === "premium") stats.revenue += 25;
  });
  
  return stats;
};

/**
 * Formatiraj datum za prikaz
 * @param {Date} date - Datum za formatiranje
 * @returns {string} Formatiran datum
 */
const formatDate = (date) => {
  if (!date) return "Ni določeno";
  return new Date(date).toLocaleDateString("sl-SI", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

/**
 * Preveri ali je uporabnik administrator
 * @param {Object} user - Uporabnik za preverjanje
 * @returns {boolean} True če je administrator
 */
const isAdmin = (user) => {
  return user && user.role === "admin";
};

/**
 * Generiraj naključen API ključ
 * @param {number} length - Dolžina ključa
 * @returns {string} Naključen API ključ
 */
const generateApiKey = (length = 32) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = {
  notifyPlanRoom,
  runCronExpiry,
  generateToken,
  verifyToken,
  calculateUserStats,
  formatDate,
  isAdmin,
  generateApiKey
};