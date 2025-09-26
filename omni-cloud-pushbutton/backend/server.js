// Import debug system
const { debugger: omniDebugger, requestLogger, errorLogger } = require('./debug');

const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const http = require("http");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const crypto = require("crypto");
require("dotenv").config();

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: "Too many requests from this IP"
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Debug middleware
app.use(requestLogger());
app.use(errorLogger());

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "omni-backend" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/omni-cloud", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  logger.info("Connected to MongoDB");
}).catch(err => {
  logger.error("MongoDB connection error:", err);
  process.exit(1);
});

// MongoDB Schemas
const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true, default: uuidv4 },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const LicenseSchema = new mongoose.Schema({
  licenseId: { type: String, unique: true, default: uuidv4 },
  userId: { type: String, required: true },
  licenseKey: { type: String, unique: true },
  licenseType: { type: String, enum: ["trial", "basic", "premium", "enterprise"], default: "trial" },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true },
  maxUsers: { type: Number, default: 1 },
  features: [{
    name: String,
    enabled: Boolean,
    limit: Number
  }],
  metadata: {
    clientInfo: String,
    ipAddress: String,
    activationDate: Date,
    lastValidation: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ActivityLogSchema = new mongoose.Schema({
  logId: { type: String, unique: true, default: uuidv4 },
  userId: String,
  licenseId: String,
  action: String,
  details: Object,
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model("User", UserSchema);
const License = mongoose.model("License", LicenseSchema);
const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);

// HTTP Server and Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: process.env.WEBSOCKET_PING_TIMEOUT || 60000,
  pingInterval: process.env.WEBSOCKET_PING_INTERVAL || 25000
});

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Utility functions
const generateLicenseKey = () => {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return segments.join("-");
};

const encryptLicense = (data) => {
  const cipher = crypto.createCipher("aes256", process.env.LICENSE_ENCRYPTION_KEY || "default-key");
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

const logActivity = async (userId, licenseId, action, details, req) => {
  try {
    await ActivityLog.create({
      userId,
      licenseId,
      action,
      details,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });
  } catch (error) {
    logger.error("Failed to log activity:", error);
  }
};

// API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0"
  });
});

// User Authentication
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    const token = jwt.sign(
      { userId: user.userId, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    await logActivity(user.userId, null, "USER_REGISTERED", { username, email }, req);

    res.status(201).json({
      success: true,
      token,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user.userId, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    await logActivity(user.userId, null, "USER_LOGIN", { username }, req);

    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// License Management API
app.post("/api/license/check", async (req, res) => {
  try {
    const { licenseKey, clientInfo } = req.body;

    if (!licenseKey) {
      return res.status(400).json({ error: "License key is required" });
    }

    const license = await License.findOne({ licenseKey, isActive: true });

    if (!license) {
      await logActivity(null, null, "LICENSE_CHECK_FAILED", { licenseKey, reason: "not_found" }, req);
      return res.status(404).json({ error: "License not found or inactive" });
    }

    if (license.expiresAt < new Date()) {
      await logActivity(license.userId, license.licenseId, "LICENSE_CHECK_FAILED", { licenseKey, reason: "expired" }, req);
      return res.status(403).json({ error: "License has expired" });
    }

    // Update last validation
    license.metadata.lastValidation = new Date();
    if (clientInfo) {
      license.metadata.clientInfo = clientInfo;
    }
    await license.save();

    await logActivity(license.userId, license.licenseId, "LICENSE_VALIDATED", { licenseKey }, req);

    // Emit real-time event
    io.emit("license_validated", {
      licenseId: license.licenseId,
      userId: license.userId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      license: {
        licenseId: license.licenseId,
        licenseType: license.licenseType,
        expiresAt: license.expiresAt,
        maxUsers: license.maxUsers,
        features: license.features,
        daysRemaining: Math.ceil((license.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    logger.error("License check error:", error);
    res.status(500).json({ error: "License validation failed" });
  }
});

app.post("/api/license/create", authenticateToken, async (req, res) => {
  try {
    const { userId, licenseType, duration, maxUsers, features } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const licenseKey = generateLicenseKey();
    const expiresAt = moment().add(duration || process.env.DEFAULT_LICENSE_DURATION || 30, "days").toDate();

    const defaultFeatures = [
      { name: "basic_access", enabled: true, limit: -1 },
      { name: "api_calls", enabled: true, limit: licenseType === "trial" ? 1000 : -1 },
      { name: "storage", enabled: true, limit: licenseType === "trial" ? 100 : -1 }
    ];

    const license = await License.create({
      userId: userId || req.user.userId,
      licenseKey,
      licenseType: licenseType || "trial",
      expiresAt,
      maxUsers: maxUsers || 1,
      features: features || defaultFeatures,
      metadata: {
        activationDate: new Date(),
        ipAddress: req.ip
      }
    });

    await logActivity(req.user.userId, license.licenseId, "LICENSE_CREATED", {
      licenseKey,
      licenseType,
      duration
    }, req);

    // Emit real-time event
    io.emit("license_created", {
      licenseId: license.licenseId,
      licenseKey,
      userId: license.userId,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      license: {
        licenseId: license.licenseId,
        licenseKey,
        licenseType: license.licenseType,
        expiresAt: license.expiresAt,
        maxUsers: license.maxUsers,
        features: license.features
      }
    });
  } catch (error) {
    logger.error("License creation error:", error);
    res.status(500).json({ error: "License creation failed" });
  }
});

app.post("/api/license/toggle", authenticateToken, async (req, res) => {
  try {
    const { licenseId, isActive } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const license = await License.findOne({ licenseId });
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    license.isActive = isActive;
    license.updatedAt = new Date();
    await license.save();

    await logActivity(req.user.userId, licenseId, "LICENSE_TOGGLED", {
      licenseKey: license.licenseKey,
      isActive
    }, req);

    // Emit real-time event
    io.emit("license_toggled", {
      licenseId,
      isActive,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `License ${isActive ? "activated" : "deactivated"} successfully`
    });
  } catch (error) {
    logger.error("License toggle error:", error);
    res.status(500).json({ error: "License toggle failed" });
  }
});

app.post("/api/license/extend", authenticateToken, async (req, res) => {
  try {
    const { licenseId, additionalDays } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const license = await License.findOne({ licenseId });
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    const maxDuration = process.env.MAX_LICENSE_DURATION || 365;
    if (additionalDays > maxDuration) {
      return res.status(400).json({ error: `Cannot extend more than ${maxDuration} days` });
    }

    license.expiresAt = moment(license.expiresAt).add(additionalDays, "days").toDate();
    license.updatedAt = new Date();
    await license.save();

    await logActivity(req.user.userId, licenseId, "LICENSE_EXTENDED", {
      licenseKey: license.licenseKey,
      additionalDays,
      newExpiryDate: license.expiresAt
    }, req);

    // Emit real-time event
    io.emit("license_extended", {
      licenseId,
      additionalDays,
      newExpiryDate: license.expiresAt,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `License extended by ${additionalDays} days`,
      newExpiryDate: license.expiresAt
    });
  } catch (error) {
    logger.error("License extension error:", error);
    res.status(500).json({ error: "License extension failed" });
  }
});

// Get all licenses (Admin only)
app.get("/api/licenses", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { page = 1, limit = 10, status, type } = req.query;
    const query = {};

    if (status) query.isActive = status === "active";
    if (type) query.licenseType = type;

    const licenses = await License.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-__v");

    const total = await License.countDocuments(query);

    res.json({
      success: true,
      licenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error("Get licenses error:", error);
    res.status(500).json({ error: "Failed to fetch licenses" });
  }
});

// Get activity logs (Admin only)
app.get("/api/logs", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { page = 1, limit = 50, action, userId } = req.query;
    const query = {};

    if (action) query.action = new RegExp(action, "i");
    if (userId) query.userId = userId;

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-__v");

    const total = await ActivityLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error("Get logs error:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// Dashboard statistics (Admin only)
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const [
      totalUsers,
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      recentActivity
    ] = await Promise.all([
      User.countDocuments(),
      License.countDocuments(),
      License.countDocuments({ isActive: true, expiresAt: { $gt: new Date() } }),
      License.countDocuments({ expiresAt: { $lt: new Date() } }),
      ActivityLog.find().sort({ timestamp: -1 }).limit(10)
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalLicenses,
        activeLicenses,
        expiredLicenses,
        recentActivity
      }
    });
  } catch (error) {
    logger.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// WebSocket Connection Handling
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Ping-pong for connection health
  socket.on("ping", () => {
    socket.emit("pong", { timestamp: new Date().toISOString() });
  });

  // Join room for user-specific events
  socket.on("join_user_room", (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`Socket ${socket.id} joined room user_${userId}`);
  });

  // Join admin room
  socket.on("join_admin_room", () => {
    socket.join("admin_room");
    logger.info(`Socket ${socket.id} joined admin room`);
  });

  // Handle license validation requests
  socket.on("validate_license", async (data) => {
    try {
      const { licenseKey } = data;
      const license = await License.findOne({ licenseKey, isActive: true });

      if (license && license.expiresAt > new Date()) {
        socket.emit("license_valid", {
          licenseId: license.licenseId,
          expiresAt: license.expiresAt,
          features: license.features
        });
      } else {
        socket.emit("license_invalid", { error: "License not found or expired" });
      }
    } catch (error) {
      socket.emit("license_error", { error: "Validation failed" });
    }
  });

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`🚀 Omni Cloud Backend running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`🔗 WebSocket enabled on port ${PORT}`);
});

module.exports = { app, server, io };