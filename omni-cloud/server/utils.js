// 🔧 Utility Functions - Omni Cloud
import jwt from "jsonwebtoken";
import cron from "node-cron";

const SECRET = process.env.JWT_SECRET || "supersecret";

// 🔐 JWT Functions
export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role,
      plan: user.plan 
    },
    SECRET,
    { expiresIn: "24h" }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    throw new Error("Invalid token");
  }
};

export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No valid authorization header");
  }
  return authHeader.split(" ")[1];
};

// 🔒 Middleware Functions
export const authenticateToken = (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: " + error.message });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin privileges required" });
  }
  next();
};

// 📡 WebSocket Notification Functions
export const notifyPlanRoom = (io, plan, message, data = {}) => {
  try {
    console.log(`📡 Notifying plan room: ${plan} - ${message}`);
    io.to(plan).emit("plan_update", {
      message,
      plan,
      timestamp: new Date().toISOString(),
      ...data
    });
  } catch (error) {
    console.error("❌ Error notifying plan room:", error);
  }
};

export const notifyAllUsers = (io, message, data = {}) => {
  try {
    console.log(`📡 Broadcasting to all users: ${message}`);
    io.emit("global_update", {
      message,
      timestamp: new Date().toISOString(),
      ...data
    });
  } catch (error) {
    console.error("❌ Error broadcasting to all users:", error);
  }
};

export const notifyUserById = (io, userId, message, data = {}) => {
  try {
    console.log(`📡 Notifying user ${userId}: ${message}`);
    io.to(`user_${userId}`).emit("user_update", {
      message,
      userId,
      timestamp: new Date().toISOString(),
      ...data
    });
  } catch (error) {
    console.error("❌ Error notifying user:", error);
  }
};

// 📊 License Management Functions
export const checkLicenseExpiry = async (User, io) => {
  try {
    console.log("🔍 Checking license expiry...");
    
    const expiredUsers = await User.find({
      plan_expires: { $lt: new Date() },
      plan: { $ne: "demo" }
    });
    
    if (expiredUsers.length > 0) {
      console.log(`⚠️ Found ${expiredUsers.length} expired users`);
      
      for (const user of expiredUsers) {
        // Downgrade to demo plan
        user.plan = "demo";
        user.plan_expires = null;
        await user.save();
        
        // Notify user about expiry
        notifyUserById(io, user._id, "Plan expired - downgraded to demo", {
          oldPlan: user.plan,
          newPlan: "demo",
          userId: user._id,
          email: user.email
        });
        
        // Notify admin room about expiry
        notifyPlanRoom(io, "admin", "User plan expired", {
          userId: user._id,
          email: user.email,
          expiredPlan: user.plan
        });
        
        console.log(`📉 User ${user.email} downgraded from ${user.plan} to demo`);
      }
    } else {
      console.log("✅ No expired licenses found");
    }
    
    return expiredUsers.length;
  } catch (error) {
    console.error("❌ Error checking license expiry:", error);
    return 0;
  }
};

export const checkExpiringLicenses = async (User, io, daysAhead = 7) => {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const expiringUsers = await User.find({
      plan: { $nin: ['demo'] },
      plan_expires: {
        $gte: new Date(),
        $lte: futureDate
      },
      isActive: true
    });
    
    if (expiringUsers.length > 0) {
      console.log(`⚠️ Found ${expiringUsers.length} licenses expiring in ${daysAhead} days`);
      
      for (const user of expiringUsers) {
        const daysLeft = Math.ceil((user.plan_expires - new Date()) / (1000 * 60 * 60 * 24));
        
        // Notify user about upcoming expiry
        notifyUserById(io, user._id, `Plan expires in ${daysLeft} days`, {
          daysLeft,
          plan: user.plan,
          expiryDate: user.plan_expires
        });
        
        console.log(`⏰ User ${user.email} plan expires in ${daysLeft} days`);
      }
    }
    
    return expiringUsers.length;
  } catch (error) {
    console.error("❌ Error checking expiring licenses:", error);
    return 0;
  }
};

// ⏰ Cron Job Functions
export const runCronExpiry = (User, io) => {
  console.log("🕐 Starting license expiry cron job...");
  
  // Check expired licenses every hour
  cron.schedule("0 * * * *", async () => {
    console.log("🔄 Running hourly license expiry check...");
    await checkLicenseExpiry(User, io);
  });
  
  // Check expiring licenses daily at 9 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("🔄 Running daily expiring license check...");
    await checkExpiringLicenses(User, io, 7); // 7 days warning
    await checkExpiringLicenses(User, io, 3); // 3 days warning
    await checkExpiringLicenses(User, io, 1); // 1 day warning
  });
  
  // Generate daily statistics at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Generating daily statistics...");
    try {
      const stats = await User.getStatistics();
      notifyPlanRoom(io, "admin", "Daily statistics", {
        type: "daily_stats",
        stats,
        date: new Date().toISOString().split('T')[0]
      });
      console.log("📊 Daily statistics sent to admin room");
    } catch (error) {
      console.error("❌ Error generating daily statistics:", error);
    }
  });
  
  console.log("✅ Cron jobs initialized successfully");
};

// 🔧 Utility Helper Functions
export const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
};

export const addDaysToDate = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const sanitizeUserData = (user) => {
  const { password, ...sanitizedUser } = user.toObject ? user.toObject() : user;
  return sanitizedUser;
};

// 📈 Analytics Functions
export const logActivity = async (User, userId, activity, metadata = {}) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      await user.incrementApiCalls();
      console.log(`📊 Activity logged for ${user.email}: ${activity}`, metadata);
    }
  } catch (error) {
    console.error("❌ Error logging activity:", error);
  }
};

export const getRealTimeStats = async (User) => {
  try {
    const stats = await User.getStatistics();
    const now = new Date();
    
    // Add real-time metrics
    const recentActivity = await User.countDocuments({
      'usage.lastActivity': { $gte: new Date(now - 24 * 60 * 60 * 1000) }
    });
    
    return {
      ...stats,
      recentActivity,
      timestamp: now.toISOString()
    };
  } catch (error) {
    console.error("❌ Error getting real-time stats:", error);
    return null;
  }
};

// Export all functions as default object for easier importing
export default {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  authenticateToken,
  requireAdmin,
  notifyPlanRoom,
  notifyAllUsers,
  notifyUserById,
  checkLicenseExpiry,
  checkExpiringLicenses,
  runCronExpiry,
  formatDate,
  addDaysToDate,
  isValidEmail,
  generateRandomString,
  sanitizeUserData,
  logActivity,
  getRealTimeStats
};