// 🚀 Omni Cloud-Ready Server - Push-Button Setup
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");

// 📊 Models
const User = process.env.DEMO_MODE === 'true' ? require('./models/DemoUser') : require('./models/User');

// 🛠️ Utils & Middleware
const { runCronExpiry, calculateUserStats, notifyPlanRoom } = require('./utils/index.js');
const { authenticateToken, requireAdmin } = require('./middleware/auth.js');

const app = express();

// 🌐 Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
  credentials: true
}));
app.use(express.json());

// 🔑 JWT Secret
const SECRET = process.env.JWT_SECRET || "omni_cloud_supersecret_2025";

// 🗄️ MongoDB Connection - Demo Mode Support
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/omni-cloud";
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true';

if (DEMO_MODE && USE_MEMORY_DB) {
  console.log("🎯 Demo mode: Uporabljam v-pomnilniško bazo");
  // Simulacija MongoDB povezave za demo
  console.log("✅ Demo MongoDB povezava uspešna");
} else {
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB povezava uspešna"))
  .catch((err) => console.error("❌ MongoDB napaka:", err));
}

// 🌐 HTTP + WebSocket Server
const serverHttp = http.createServer(app);
const io = new Server(serverHttp, { 
  cors: { 
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    credentials: true
  } 
});

// 📡 WebSocket Connection Management
io.on("connection", (socket) => {
  console.log("🔗 Client connected:", socket.id);
  
  // Join plan room
  socket.on("join_plan", (plan) => {
    if (["demo", "basic", "premium"].includes(plan)) {
      socket.join(plan);
      console.log(`👥 ${socket.id} joined room: ${plan}`);
      socket.emit("room_joined", { plan, message: `Pridružili ste se ${plan} skupini` });
    } else {
      socket.emit("error", { message: "Neveljaven plan tip" });
    }
  });

  // Heartbeat system
  socket.on("ping", () => {
    socket.emit("pong", { timestamp: Date.now() });
    console.log(`💓 Heartbeat ping/pong z ${socket.id}`);
  });

  // Leave room
  socket.on("leave_plan", (plan) => {
    socket.leave(plan);
    console.log(`👋 ${socket.id} zapustil room: ${plan}`);
  });
  
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// 🔐 Authentication Endpoints
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, role = "client" } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email in geslo sta obvezna" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Uporabnik že obstaja" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      role,
      plan: "demo",
      plan_expires: null
    });

    await user.save();
    
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        plan_expires: user.plan_expires
      }
    });
  } catch (error) {
    console.error("Napaka pri registraciji:", error);
    res.status(500).json({ error: "Napaka pri registraciji" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email in geslo sta obvezna" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Napačni podatki" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Napačni podatki" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        plan_expires: user.plan_expires
      }
    });
  } catch (error) {
    console.error("Napaka pri prijavi:", error);
    res.status(500).json({ error: "Napaka pri prijavi" });
  }
});

// 👤 User Profile
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    console.error("Napaka pri pridobivanju profila:", error);
    res.status(500).json({ error: "Napaka pri pridobivanju profila" });
  }
});

// 📊 Admin Statistics
app.get("/api/admin", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const demoUsers = await User.countDocuments({ plan: "demo" });
    const basicUsers = await User.countDocuments({ plan: "basic" });
    const premiumUsers = await User.countDocuments({ plan: "premium" });
    
    const now = new Date();
    const activeUsers = await User.countDocuments({
      $or: [
        { plan_expires: null },
        { plan_expires: { $gt: now } },
        { plan: "demo" }
      ]
    });
    
    const expiredUsers = await User.countDocuments({
      plan_expires: { $lt: now },
      plan: { $nin: ["demo"] }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        expiredUsers,
        planDistribution: {
          demo: demoUsers,
          basic: basicUsers,
          premium: premiumUsers
        }
      }
    });
  } catch (error) {
    console.error("Napaka pri pridobivanju admin statistik:", error);
    res.status(500).json({ error: "Napaka pri pridobivanju admin statistik" });
  }
});

// 👥 Get All Users (Admin Only)
app.get("/api/users", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(403).json({ error: "Ni dostopa" });
  
  try {
    const decoded = jwt.verify(auth.split(" ")[1], SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Ni admin pravic" });
    
    const users = await User.find({}, "email plan plan_expires createdAt lastLogin");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Napaka pri fetchu uporabnikov" });
  }
});

// 🔧 Set User Plan (Admin Only)
app.post("/api/setPlan", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, plan, days } = req.body;
    
    if (!email || !plan) {
      return res.status(400).json({ error: "Email in plan sta obvezna" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "Uporabnik ni najden" });
    }

    user.plan = plan;
    
    if (plan !== "demo" && days) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(days));
      user.plan_expires = expiryDate;
    } else if (plan === "demo") {
      user.plan_expires = null;
    }

    await user.save();

    // Notify via WebSocket
    notifyPlanRoom(user, io);

    res.json({
      success: true,
      message: `Plan uporabnika ${email} je bil posodobljen na ${plan}`,
      user: {
        email: user.email,
        plan: user.plan,
        plan_expires: user.plan_expires
      }
    });
  } catch (error) {
    console.error("Napaka pri nastavljanju plana:", error);
    res.status(500).json({ error: "Napaka pri nastavljanju plana" });
  }
});

// 🛠️ Routes - Demo mode brez licenseRoutes
// app.use("/api", licenseRoutes); // Onemogočeno za demo

// 🏥 Health Check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "Omni Cloud Server"
  });
});

// 🕐 Start Cron Job for License Expiry
runCronExpiry(io);

// 🚀 Start Server
const PORT = process.env.PORT || 5001;
serverHttp.listen(PORT, () => {
  console.log(`✅ Omni Cloud Server teče na portu ${PORT}`);
  console.log(`🌐 WebSocket server pripravljen`);
  console.log(`📊 Admin dashboard dostopen`);
});

module.exports = { io };