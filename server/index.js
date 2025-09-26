// server/index.js
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import mongoose from "mongoose";

// ✅ Uvoz MongoDB modelov
import User from "./models/User.js";
import License from "./models/License.js";
import Log from "./models/Log.js";

// ✅ Uvoz Omni Brain funkcionalnosti
import { initializeOmniBrain, getAgentStatus, getRealTimeStats } from "./utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Naloži environment variables
dotenv.config();

const app = express();

// ✅ MongoDB povezava
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/omni-brain', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ MongoDB povezava uspešna");
  // Inicializiraj Omni Brain po uspešni povezavi z io in mongoose
  initializeOmniBrain(io, mongoose.connection.getClient());
}).catch(err => {
  console.error("❌ MongoDB povezava neuspešna:", err);
});

// 🌐 HTTP strežnik za Socket.IO
const serverHttp = http.createServer(app);
const io = new Server(serverHttp, { 
  cors: { 
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true
  } 
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
app.use(express.json());

// 🛡️ Rate limiter za zaščito API endpointov
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 30,             // max 30 requestov na IP
  message: {
    error: "Preveč zahtev z tega IP naslova. Poskusite ponovno čez minuto."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// 🔑 JWT secret iz environment
const SECRET = process.env.JWT_SECRET || "super_secret_key_change_me";

// 🗄️ Lokalna JSON baza podatkov
const DB_PATH = path.join(__dirname, 'data', 'users.json');

// Ustvari mapo za podatke, če ne obstaja
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inicializiraj JSON datoteko, če ne obstaja
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
}

// 📦 Funkcije za upravljanje uporabnikov
const loadUsers = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Napaka pri branju uporabnikov:', error);
    return [];
  }
};

const saveUsers = (users) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Napaka pri shranjevanju uporabnikov:', error);
    return false;
  }
};

const findUserByEmail = (email) => {
  const users = loadUsers();
  return users.find(user => user.email === email);
};

const createUser = (userData) => {
  const users = loadUsers();
  const newUser = {
    id: Date.now().toString(),
    username: userData.username || '',
    email: userData.email,
    password: userData.password,
    role: userData.role || 'client',
    plan: userData.plan || 'demo',
    plan_expires: userData.plan_expires || null,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    emailVerified: userData.emailVerified || false,
    emailVerificationToken: userData.emailVerificationToken || null,
    emailVerificationExpires: userData.emailVerificationExpires || null,
    resetPasswordToken: userData.resetPasswordToken || null,
    resetPasswordExpires: userData.resetPasswordExpires || null
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
};

const updateUser = (email, updates) => {
  const users = loadUsers();
  const userIndex = users.findIndex(user => user.email === email);
  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...updates };
    saveUsers(users);
    return users[userIndex];
  }
  return null;
};

console.log("✅ Lokalna JSON baza podatkov pripravljena");

// 📡 WebSocket funkcija za obveščanje o spremembah licenc
const notifyLicenseUpdate = (user) => {
  io.emit("license_update", {
    email: user.email,
    plan: user.plan,
    expires: user.plan_expires,
  });
  console.log(`📡 WebSocket obvestilo poslano za uporabnika: ${user.email}`);
};

// 📡 Funkcija za obveščanje uporabnikov po plan rooms
const notifyPlanRoom = (user) => {
  io.to(user.plan).emit("license_update", {
    email: user.email,
    plan: user.plan,
    expires: user.plan_expires,
  });
  console.log(`📡 WebSocket obvestilo poslano v room '${user.plan}' za uporabnika: ${user.email}`);
};

// ✅ WebSocket funkcionalnosti za real-time sledenje
let connectedClients = new Map();
let agentRooms = new Map(); // Sledenje uporabnikov v agent roomih

// WebSocket povezava
io.on("connection", (socket) => {
  console.log(`🔗 Nova WebSocket povezava: ${socket.id}`);
  
  // Shrani povezavo
  connectedClients.set(socket.id, {
    socket: socket,
    userId: null,
    joinedAt: new Date(),
    lastActivity: new Date()
  });

  // Avtentikacija uporabnika preko WebSocket
  socket.on("authenticate", async (data) => {
    try {
      const { token } = data;
      const decoded = jwt.verify(token, SECRET);
      
      // Posodobi podatke o povezavi
      const clientData = connectedClients.get(socket.id);
      if (clientData) {
        clientData.userId = decoded.id;
        clientData.userEmail = decoded.email;
        clientData.userRole = decoded.role;
        connectedClients.set(socket.id, clientData);
      }
      
      // Pridruži se splošni sobi
      socket.join("authenticated");
      
      // Če je admin, pridruži se admin sobi
      if (decoded.role === "admin") {
        socket.join("admin");
      }
      
      // Pošlji potrditveno sporočilo
      socket.emit("authenticated", {
        success: true,
        user: { id: decoded.id, email: decoded.email, role: decoded.role }
      });
      
      // Pošlji trenutne statistike agentov
      const agentStats = await getAgentStatus();
      socket.emit("agent_stats", agentStats);
      
      console.log(`✅ Uporabnik ${decoded.email} avtenticiran preko WebSocket`);
      
    } catch (error) {
      console.error("❌ WebSocket avtentikacija neuspešna:", error);
      socket.emit("authentication_error", { error: "Neveljaven token" });
    }
  });

  // Pridružitev agent room
  socket.on("join_agent_room", (data) => {
    const { agentType } = data;
    const validAgents = ["learning", "commercial", "optimization"];
    
    if (validAgents.includes(agentType)) {
      socket.join(`agent_${agentType}`);
      
      // Sledenje uporabnikov v roomih
      if (!agentRooms.has(agentType)) {
        agentRooms.set(agentType, new Set());
      }
      agentRooms.get(agentType).add(socket.id);
      
      console.log(`📊 Uporabnik se je pridružil ${agentType} agent room`);
    }
  });

  // Zapustitev agent room
  socket.on("leave_agent_room", (data) => {
    const { agentType } = data;
    socket.leave(`agent_${agentType}`);
    
    if (agentRooms.has(agentType)) {
      agentRooms.get(agentType).delete(socket.id);
    }
  });

  // Rooms po plan tipih - uporabnik se pridruži svojemu plan room
  socket.on("join_plan", (plan) => {
    if (["demo", "basic", "premium"].includes(plan)) {
      socket.join(plan);
      console.log(`👥 ${socket.id} se je pridružil room: ${plan}`);
      socket.emit("room_joined", { plan, message: `Pridružili ste se ${plan} skupini` });
    } else {
      socket.emit("error", { message: "Neveljaven plan tip" });
    }
  });

  // Heartbeat za preverjanje povezave
  socket.on("heartbeat", () => {
    const clientData = connectedClients.get(socket.id);
    if (clientData) {
      clientData.lastActivity = new Date();
      connectedClients.set(socket.id, clientData);
    }
    socket.emit("heartbeat_ack", { timestamp: new Date() });
  });

  // Heartbeat ping/pong sistem
  socket.on("ping", () => {
    socket.emit("pong", { timestamp: Date.now() });
    console.log(`💓 Heartbeat ping/pong z ${socket.id}`);
  });

  // Zahteva za real-time statistike
  socket.on("request_stats", async () => {
    try {
      const stats = await getRealTimeStats();
      socket.emit("real_time_stats", stats);
    } catch (error) {
      console.error("❌ Napaka pri pridobivanju statistik:", error);
      socket.emit("stats_error", { error: "Napaka pri pridobivanju statistik" });
    }
  });

  // Zapusti room
  socket.on("leave_plan", (plan) => {
    socket.leave(plan);
    console.log(`👋 ${socket.id} je zapustil room: ${plan}`);
  });
  
  // Disconnect
  socket.on("disconnect", () => {
    console.log(`🔌 WebSocket povezava prekinjena: ${socket.id}`);
    
    // Odstrani iz vseh agent roomov
    agentRooms.forEach((clients, agentType) => {
      clients.delete(socket.id);
    });
    
    // Odstrani iz seznama povezanih odjemalcev
    connectedClients.delete(socket.id);
  });
});

// Funkcije za pošiljanje obvestil
function notifyAgentUpdate(agentType, status, data = {}) {
  io.to(`agent_${agentType}`).emit("agent_update", {
    type: "agent_status",
    agentType,
    status,
    data,
    timestamp: new Date()
  });
  
  // Pošlji tudi v admin room
  io.to("admin").emit("agent_update", {
    type: "agent_status",
    agentType,
    status,
    data,
    timestamp: new Date()
  });
}

function notifySystemAlert(level, message, details = {}) {
  io.to("admin").emit("system_alert", {
    level,
    message,
    details,
    timestamp: new Date()
  });
}

// Izvoz funkcij za uporabo v drugih modulih
global.notifyLicenseUpdate = notifyLicenseUpdate;
global.notifyAgentUpdate = notifyAgentUpdate;
global.notifySystemAlert = notifySystemAlert;

// 🛡️ Middleware za avtentifikacijo
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Dostop zavrnjen - ni tokena" });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Neveljaven token" });
    }
    req.user = user;
    next();
  });
};

// 🛡️ Middleware za admin pravice
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Potrebne so admin pravice" });
  }
  next();
};

// ✅ API Endpoints za centralizirani nadzorni panel

// Real-time statistike agentov
app.get("/api/agents/status", authenticateToken, async (req, res) => {
  try {
    const agentStatus = await getAgentStatus();
    const realTimeStats = await getRealTimeStats();
    
    res.json({
      success: true,
      agents: agentStatus,
      stats: realTimeStats,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("❌ Napaka pri pridobivanju statusov agentov:", error);
    res.status(500).json({ error: "Napaka pri pridobivanju statusov agentov" });
  }
});

// Upravljanje agentov (samo admin)
app.post("/api/agents/:agentType/control", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { action, config } = req.body;
    
    const validAgents = ["learning", "commercial", "optimization"];
    const validActions = ["start", "stop", "restart", "configure"];
    
    if (!validAgents.includes(agentType)) {
      return res.status(400).json({ error: "Neveljaven tip agenta" });
    }
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: "Neveljavna akcija" });
    }
    
    // Izvedi akcijo na agentu (implementacija v utils.js)
    const result = await controlAgent(agentType, action, config);
    
    // Pošlji WebSocket obvestilo
    notifyAgentUpdate(agentType, action, result);
    
    // Logiraj akcijo
    await Log.info('agent', `Agent ${agentType} ${action}`, result, {
      user_id: req.user.id,
      ip_address: req.ip
    });
    
    res.json({
      success: true,
      message: `Agent ${agentType} ${action} uspešno izveden`,
      result
    });
  } catch (error) {
    console.error("❌ Napaka pri upravljanju agenta:", error);
    res.status(500).json({ error: "Napaka pri upravljanju agenta" });
  }
});

// Sistemski dnevniki (samo admin)
app.get("/api/logs", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      level, 
      category, 
      limit = 100, 
      page = 1,
      timeframe = 24 
    } = req.query;
    
    const query = {};
    
    // Filtri
    if (level) query.level = level;
    if (category) query.category = category;
    
    // Časovni okvir (ure)
    const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);
    query.timestamp = { $gte: since };
    
    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user_id', 'username email')
      .populate('license_id', 'client_id plan');
    
    const totalLogs = await Log.countDocuments(query);
    
    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalLogs,
        pages: Math.ceil(totalLogs / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("❌ Napaka pri pridobivanju dnevnikov:", error);
    res.status(500).json({ error: "Napaka pri pridobivanju dnevnikov" });
  }
});

// Statistike sistema (samo admin)
app.get("/api/system/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { timeframe = 24 } = req.query;
    
    // Osnovne statistike
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 
      lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    // Statistike po planih
    const planStats = await User.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);
    
    // Statistike licenc
    const licenseStats = await License.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Sistemsko zdravje
    const systemHealth = await Log.getSystemHealth(parseInt(timeframe));
    
    // Napake
    const errorStats = await Log.getErrorStats(parseInt(timeframe));
    
    // Povezani odjemalci
    const connectedClientsCount = connectedClients.size;
    const agentRoomStats = {};
    agentRooms.forEach((clients, agentType) => {
      agentRoomStats[agentType] = clients.size;
    });
    
    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byPlan: planStats
        },
        licenses: {
          byStatus: licenseStats
        },
        system: {
          health: systemHealth,
          errors: errorStats,
          connectedClients: connectedClientsCount,
          agentRooms: agentRoomStats
        }
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error("❌ Napaka pri pridobivanju sistemskih statistik:", error);
    res.status(500).json({ error: "Napaka pri pridobivanju sistemskih statistik" });
  }
});

// 🏠 Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Omni Backend deluje",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// ✅ Auth endpoints (z email verifikacijo)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validacija vnosnih podatkov
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Vsa polja so obvezna" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Geslo mora imeti vsaj 6 znakov" });
    }

    // Preveri če uporabnik že obstaja
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        error: "Uporabnik s tem emailom že obstaja"
      });
    }

    // Hashiraj geslo
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generiraj email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ur

    // Ustvari novega uporabnika
    const newUser = createUser({
      username,
      email,
      password: hashedPassword,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpires
    });

    // Pošlji email verifikacijo (simulacija)
    console.log(`📧 Email verifikacija za ${email}: token=${emailVerificationToken}`);

    res.status(201).json({
      success: true,
      message: "Registracija uspešna. Preverite email za verifikacijo.",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        plan: newUser.plan,
        emailVerified: newUser.emailVerified
      }
    });

  } catch (error) {
    console.error("❌ Napaka pri registraciji:", error);
    res.status(500).json({ error: "Napaka strežnika" });
  }
});

// Email verifikacija
app.get("/api/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Token je obvezen" });
    }

    // Najdi uporabnika z veljavnim tokenom
    const users = loadUsers();
    const user = users.find(u => 
      u.emailVerificationToken === token && 
      new Date(u.emailVerificationExpires) > new Date()
    );

    if (!user) {
      return res.status(400).json({ error: "Neveljaven ali potekel token" });
    }

    // Potrdi email
    const updatedUser = updateUser(user.email, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    res.json({
      success: true,
      message: "Email uspešno potrjen. Sedaj se lahko prijavite."
    });
  } catch (error) {
    console.error("Napaka pri verifikaciji emaila:", error);
    res.status(500).json({ error: "Napaka pri verifikaciji emaila" });
  }
});

// Auth login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Najdi uporabnika
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Napačni podatki" });
    }

    // Preveri geslo
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Napačni podatki" });
    }

    // Preveri ali je email potrjen (za demo omogočimo prijavo brez verifikacije)
    // if (!user.emailVerified) {
    //   return res.status(401).json({ 
    //     error: "Email ni potrjen. Preverite svojo pošto za potrditveno sporočilo." 
    //   });
    // }

    // Posodobi zadnji login
    updateUser(email, { lastLogin: new Date().toISOString() });

    // Generiraj JWT token
    const tokenExpiry = rememberMe ? "30d" : "24h";
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        plan: user.plan 
      },
      SECRET,
      { expiresIn: tokenExpiry }
    );

    // Pošlji WebSocket obvestilo
    notifyLicenseUpdate(user);

    res.json({
      success: true,
      message: "Prijava uspešna",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        plan_expires: user.plan_expires,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error("❌ Napaka pri prijavi:", error);
    res.status(500).json({ error: "Napaka pri prijavi" });
  }
});

// ✅ Registracija (obstoječi endpoint)
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Preveri če uporabnik že obstaja
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Uporabnik s tem emailom že obstaja" });
    }

    // Hashiraj geslo
    const hashedPassword = await bcrypt.hash(password, 10);

    // Ustvari uporabnika
    const newUser = createUser({
      email,
      password: hashedPassword,
      role: role || "client"
    });

    res.json({
      success: true,
      message: "Registracija uspešna",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error("Napaka pri registraciji:", error);
    res.status(500).json({ error: "Napaka pri registraciji" });
  }
});

// ✅ Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Najdi uporabnika
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Napačni podatki" });
    }

    // Preveri geslo
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Napačni podatki" });
    }

    // Posodobi zadnji login
    updateUser(email, { lastLogin: new Date().toISOString() });

    // Generiraj JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        plan_expires: user.plan_expires,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error("Napaka pri prijavi:", error);
    res.status(500).json({ error: "Napaka pri prijavi" });
  }
});

// ✅ Profil uporabnika (zaščiteno)
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const user = findUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: "Uporabnik ni najden" });
    }
    
    // Odstrani geslo iz odgovora
    const { password, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: "Napaka pri pridobivanju profila" });
  }
});

// ✅ Admin dashboard (samo za admin)
app.get("/api/admin", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = loadUsers();
    
    const totalUsers = users.length;
    const adminUsers = users.filter(u => u.role === "admin").length;
    const clientUsers = users.filter(u => u.role === "client").length;
    
    // Statistike po planih
    const demoUsers = users.filter(u => u.plan === "demo").length;
    const basicUsers = users.filter(u => u.plan === "basic").length;
    const premiumUsers = users.filter(u => u.plan === "premium").length;
    
    // Aktivni plani (niso potekli)
    const now = new Date();
    const activeBasic = users.filter(u => 
      u.plan === "basic" && (!u.plan_expires || new Date(u.plan_expires) > now)
    ).length;
    const activePremium = users.filter(u => 
      u.plan === "premium" && (!u.plan_expires || new Date(u.plan_expires) > now)
    ).length;
    
    // Potekli plani
    const expiredPlans = users.filter(u => 
      u.plan_expires && new Date(u.plan_expires) < now && !["demo"].includes(u.plan)
    ).length;
    
    // Zadnji registrirani uporabniki (zadnjih 7 dni)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = users.filter(u => 
      u.createdAt && new Date(u.createdAt) >= weekAgo
    ).length;

    res.json({
      success: true,
      message: "Dobrodošel ADMIN, tukaj lahko upravljaš Omni",
      stats: {
        totalUsers,
        adminUsers,
        clientUsers,
        planDistribution: {
          demo: demoUsers,
          basic: basicUsers,
          premium: premiumUsers
        },
        activePlans: {
          basic: activeBasic,
          premium: activePremium
        },
        expiredPlans,
        newUsersThisWeek
      }
    });
  } catch (error) {
    console.error("Napaka pri pridobivanju admin podatkov:", error);
    res.status(500).json({ error: "Napaka pri pridobivanju admin podatkov" });
  }
});

// ✅ Seznam vseh uporabnikov (samo za admin) - Ultimate Turbo verzija
app.get("/api/users", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(403).json({ error: "Ni dostopa" });
  
  try {
    const decoded = jwt.verify(auth.split(" ")[1], SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Ni admin pravic" });
    
    const users = loadUsers();
    const usersWithoutPasswords = users.map(({ password, ...user }) => ({
      ...user,
      email: user.email,
      plan: user.plan,
      plan_expires: user.plan_expires
    }));
    
    res.json(usersWithoutPasswords);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Napaka pri fetchu uporabnikov" });
  }
});

// ✅ Nastavi plan uporabnika (samo za admin)
app.post("/api/setPlan", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, plan } = req.body;
    
    if (!email || !plan) {
      return res.status(400).json({ error: "Email in plan sta obvezna" });
    }

    if (!["demo", "basic", "premium"].includes(plan)) {
      return res.status(400).json({ error: "Neveljaven plan" });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Uporabnik ne obstaja" });
    }

    // Posodobi plan
    updateUser(email, { plan });
    const updatedUser = findUserByEmail(email);
    
    // Odstrani geslo iz odgovora
    const { password, ...userWithoutPassword } = updatedUser;

    // 📡 Pošlji WebSocket obvestilo o spremembi plana
    notifyLicenseUpdate(updatedUser);  // Globalno obvestilo
    notifyPlanRoom(updatedUser);       // Obvestilo v plan room

    res.json({ 
      success: true,
      message: `Plan za ${email} spremenjen na ${plan}`, 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error("Napaka pri spremembi plana:", error);
    res.status(500).json({ error: "Napaka pri spremembi plana" });
  }
});

// Upravljanje uporabnikov z MongoDB (samo admin)
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, plan, status } = req.query;
    
    const query = {};
    
    // Iskanje
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filtri
    if (plan) query.plan = plan;
    if (status) query.status = status;
    
    const users = await User.find(query)
      .select('-password -emailVerificationToken')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const totalUsers = await User.countDocuments(query);
    
    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalUsers,
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("❌ Napaka pri pridobivanju uporabnikov:", error);
    res.status(500).json({ error: "Napaka pri pridobivanju uporabnikov" });
  }
});

// Posodobitev uporabnika (samo admin)
app.put("/api/admin/users/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // Prepreči posodabljanje občutljivih polj
    delete updates.password;
    delete updates._id;
    delete updates.createdAt;
    
    const user = await User.findByIdAndUpdate(
      userId, 
      { ...updates, updatedAt: new Date() },
      { new: true, select: '-password' }
    );
    
    if (!user) {
      return res.status(404).json({ error: "Uporabnik ni najden" });
    }
    
    // Logiraj spremembo
    await Log.info('admin', `Uporabnik ${user.email} posodobljen`, updates, {
      user_id: req.user.id,
      ip_address: req.ip
    });
    
    // Pošlji WebSocket obvestilo
    notifyLicenseUpdate(user);
    
    res.json({
      success: true,
      message: "Uporabnik uspešno posodobljen",
      user
    });
  } catch (error) {
    console.error("❌ Napaka pri posodabljanju uporabnika:", error);
    res.status(500).json({ error: "Napaka pri posodabljanju uporabnika" });
  }
});

// 📅 Endpoint za podaljšanje naročnine
app.post("/api/extendPlan", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: "Zahtevana je avtentikacija" });

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);
    
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Nimate administratorskih pravic" });
    }

    const { email, days } = req.body;
    if (!email || !days) {
      return res.status(400).json({ error: "Manjkajo obvezni podatki" });
    }

    const user = findUserByEmail(email);
    if (!user) return res.status(404).json({ error: "Uporabnik ne obstaja" });

    const now = new Date();
    const currentExp = user.plan_expires && new Date(user.plan_expires) > now ? new Date(user.plan_expires) : now;
    const newExpires = new Date(currentExp.getTime() + days * 86400000); // 1 dan = 86400000 ms
    
    updateUser(email, { plan_expires: newExpires.toISOString() });
    const updatedUser = findUserByEmail(email);

    // 📡 Pošlji WebSocket obvestilo o podaljšanju plana
    notifyLicenseUpdate(updatedUser);

    return res.json({
      success: true,
      message: `Naročnina uspešno podaljšana za ${days} dni`,
      new_expires: newExpires
    });
    
  } catch (err) {
    console.error("Napaka pri podaljšanju plana:", err);
    return res.status(500).json({ error: "Interna strežniška napaka" });
  }
});

// ⏰ Samodejno preverjanje poteka planov (cron job)
setInterval(async () => {
  try {
    const now = new Date();
    const users = loadUsers();
    const expiredUsers = users.filter(user => 
      user.plan_expires && 
      new Date(user.plan_expires) < now && 
      !["demo", "free"].includes(user.plan)
    );

    for (const user of expiredUsers) {
      updateUser(user.email, { 
        plan: "demo", 
        plan_expires: null 
      });
      
      console.log(`⚠️ Plan uporabnika ${user.email} je potekel, avtomatski preklop na DEMO`);
      
      // 📡 Pošlji WebSocket obvestilo o avtomatskem downgrade
      const updatedUser = findUserByEmail(user.email);
      notifyLicenseUpdate(updatedUser);
    }
  } catch (err) {
    console.error("Napaka pri avtomatskem preverjanju planov:", err);
  }
}, 60000); // 60.000 ms = 1 minuta

// 🚀 Zagon serverja
const PORT = process.env.PORT || 5000;
serverHttp.listen(PORT, () => {
  console.log(`✅ WebSocket + API strežnik deluje na vratih ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/api/admin`);
  console.log(`🌐 WebSocket povezava: ws://localhost:${PORT}`);
});