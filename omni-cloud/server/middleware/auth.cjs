// 🚀 Omni Cloud Authentication Middleware
const jwt = require('jsonwebtoken');

// Dinamičen uvoz modela glede na DEMO_MODE
let User;
if (process.env.DEMO_MODE === 'true') {
  User = require('../models/DemoUser.js');
} else {
  const UserModel = require('../models/User.js');
  User = UserModel.User;
}

/**
 * Middleware za preverjanje JWT tokena
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Dostop zavrnjen. Token ni podan." 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Pridobi uporabnika iz baze
    let user;
    if (process.env.DEMO_MODE === 'true') {
      user = await User.findById(decoded.userId);
    } else {
      user = await User.findById(decoded.userId).select("-password");
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Neveljaven token. Uporabnik ne obstaja." 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Napaka pri preverjanju tokena:", error);
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false, 
        message: "Token je potekel. Prosimo, prijavite se ponovno." 
      });
    }
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        success: false, 
        message: "Neveljaven token." 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: "Napaka strežnika pri preverjanju tokena." 
    });
  }
};

/**
 * Middleware za preverjanje administratorskih pravic
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Uporabnik ni avtenticiran." 
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Dostop zavrnjen. Potrebne so administratorske pravice." 
      });
    }

    next();
  } catch (error) {
    console.error("❌ Napaka pri preverjanju admin pravic:", error);
    return res.status(500).json({
      success: false,
      message: "Napaka strežnika pri preverjanju pravic."
    });
  }
};

/**
 * Middleware za preverjanje veljavnega načrta
 */
const requireValidPlan = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Uporabnik ni avtenticiran." 
      });
    }

    // V demo načinu dovoli vse
    if (process.env.DEMO_MODE === 'true') {
      return next();
    }

    // Preveri ali ima uporabnik veljaven načrt
    if (!req.user.plan || !req.user.plan.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: "Dostop zavrnjen. Potreben je veljaven načrt." 
      });
    }

    // Preveri ali načrt ni potekel
    if (req.user.plan.expiresAt && new Date() > new Date(req.user.plan.expiresAt)) {
      return res.status(403).json({ 
        success: false, 
        message: "Dostop zavrnjen. Načrt je potekel." 
      });
    }

    next();
  } catch (error) {
    console.error("❌ Napaka pri preverjanju načrta:", error);
    return res.status(500).json({
      success: false,
      message: "Napaka strežnika pri preverjanju načrta."
    });
  }
};

/**
 * Middleware za rate limiting (preprečevanje zlorabe)
 */
const rateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Počisti stare zahteve
    if (requests.has(clientId)) {
      const clientRequests = requests.get(clientId).filter(time => time > windowStart);
      requests.set(clientId, clientRequests);
    }

    const clientRequests = requests.get(clientId) || [];

    if (clientRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Preveč zahtev. Poskusite ponovno čez nekaj minut."
      });
    }

    clientRequests.push(now);
    requests.set(clientId, clientRequests);

    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireValidPlan,
  rateLimiter
};