// 🚀 Omni Cloud Platform - Modular Server Architecture
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

// 📁 Konfiguracijski moduli
const DatabaseConfig = require('./config/db');
const RedisConfig = require('./config/redis');

// 🛡️ Middleware
const { authenticateToken, requireAdmin } = require('./middleware/auth.cjs');

// 🛣️ Modularne poti
const authRoutes = require('./routes/auth');
const licenseRoutes = require('./routes/license');
const tourismRoutes = require('./routes/tourism');
const horecaRoutes = require('./routes/horeca');
const adminRoutes = require('./routes/admin');

// 🔧 Pomožne funkcije
const { runCronExpiry, notifyPlanRoom } = require('./utils/index');

// 🌐 Express aplikacija
const app = express();

// ⚙️ Middleware konfiguracija
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://localhost:3001", 
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:5173",
    "http://localhost:8080"
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🔑 JWT Secret
const SECRET = process.env.JWT_SECRET || "omni_cloud_supersecret_2025";

// 🗄️ Inicializacija baze podatkov
const dbConfig = new DatabaseConfig();
dbConfig.connect();

// 📡 Redis konfiguracija za notifikacije
const redisConfig = new RedisConfig();
redisConfig.connect();

// 🌐 HTTP + WebSocket Server
const serverHttp = http.createServer(app);
const io = new Server(serverHttp, { 
  cors: { 
    origin: [
      "http://localhost:3000", 
      "http://localhost:3001", 
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:5173",
      "http://localhost:8080"
    ],
    credentials: true
  } 
});

// 📡 WebSocket Connection Management
io.on("connection", (socket) => {
  console.log("🔗 WebSocket client connected:", socket.id);
  
  // Pridruži se plan skupini
  socket.on("join_plan", (planData) => {
    const { plan, userId, username } = planData;
    
    if (["demo", "starter", "professional", "enterprise"].includes(plan)) {
      socket.join(plan);
      socket.planRoom = plan;
      socket.userId = userId;
      socket.username = username;
      
      console.log(`👥 ${username} (${socket.id}) se je pridružil ${plan} skupini`);
      
      // Obvesti ostale v skupini
      socket.to(plan).emit("user_joined", { 
        userId, 
        username, 
        plan,
        timestamp: new Date()
      });
      
      socket.emit("room_joined", { 
        plan, 
        message: `Uspešno ste se pridružili ${plan} skupini`,
        roomSize: io.sockets.adapter.rooms.get(plan)?.size || 1
      });
    } else {
      socket.emit("error", { message: "Neveljaven plan tip" });
    }
  });

  // Pošlji sporočilo v plan skupino
  socket.on("plan_message", (messageData) => {
    if (socket.planRoom) {
      const message = {
        id: Date.now(),
        userId: socket.userId,
        username: socket.username,
        message: messageData.message,
        plan: socket.planRoom,
        timestamp: new Date()
      };
      
      // Pošlji vsem v skupini (vključno s pošiljateljem)
      io.to(socket.planRoom).emit("plan_message", message);
      console.log(`💬 Sporočilo v ${socket.planRoom}: ${message.message}`);
    }
  });

  // Heartbeat sistem
  socket.on("ping", () => {
    socket.emit("pong", { 
      timestamp: Date.now(),
      serverId: process.env.SERVER_ID || 'omni-server-1'
    });
  });

  // Zapusti skupino
  socket.on("leave_plan", (plan) => {
    if (socket.planRoom === plan) {
      socket.leave(plan);
      socket.to(plan).emit("user_left", {
        userId: socket.userId,
        username: socket.username,
        plan,
        timestamp: new Date()
      });
      console.log(`👋 ${socket.username} je zapustil ${plan} skupino`);
      socket.planRoom = null;
    }
  });

  // Sistem notifikacij
  socket.on("subscribe_notifications", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`🔔 ${socket.id} se je naročil na notifikacije za uporabnika ${userId}`);
  });
  
  socket.on("disconnect", () => {
    if (socket.planRoom && socket.username) {
      socket.to(socket.planRoom).emit("user_left", {
        userId: socket.userId,
        username: socket.username,
        plan: socket.planRoom,
        timestamp: new Date()
      });
      console.log(`❌ ${socket.username} (${socket.id}) se je odklopil`);
    } else {
      console.log("❌ Client disconnected:", socket.id);
    }
  });
});

// 🛣️ API Routes - Modularna struktura
app.use('/api/auth', authRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/tourism', tourismRoutes);
app.use('/api/horeca', horecaRoutes);
app.use('/api/admin', adminRoutes);

// 🏠 Osnovna pot
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Omni Cloud Platform API',
    version: '2.0.0',
    architecture: 'Modular',
    timestamp: new Date(),
    endpoints: {
      auth: '/api/auth',
      license: '/api/license', 
      tourism: '/api/tourism',
      horeca: '/api/horeca',
      admin: '/api/admin'
    },
    features: {
      websocket: true,
      redis: process.env.DEMO_MODE !== 'true',
      database: process.env.DEMO_MODE === 'true' ? 'in-memory' : 'mongodb',
      modules: ['auth', 'license', 'tourism', 'horeca', 'admin']
    }
  });
});

// 📊 Zdravstveni pregled sistema
app.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    demo_mode: process.env.DEMO_MODE === 'true',
    services: {
      database: dbConfig.isConnected(),
      redis: redisConfig.isConnected(),
      websocket: io.engine.clientsCount
    }
  };

  res.json(health);
});

// 🔧 WebSocket info endpoint
app.get('/api/websocket/info', (req, res) => {
  const rooms = {};
  
  // Pridobi informacije o sobah
  io.sockets.adapter.rooms.forEach((sockets, room) => {
    if (!sockets.has(room)) { // Ni private room
      rooms[room] = {
        name: room,
        clients: sockets.size,
        users: []
      };
    }
  });

  res.json({
    success: true,
    websocket: {
      connected_clients: io.engine.clientsCount,
      rooms,
      server_id: process.env.SERVER_ID || 'omni-server-1'
    }
  });
});

// 🚨 Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Server napaka:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Prišlo je do napake na strežniku' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint ni najden',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/license/plans',
      'GET /api/tourism/destinations',
      'GET /api/horeca/menu',
      'GET /api/admin/dashboard'
    ]
  });
});

// ⏰ Cron Jobs - Avtomatizacija
if (process.env.DEMO_MODE !== 'true') {
  // Preveri potekle licence vsako uro
  cron.schedule('0 * * * *', () => {
    console.log('⏰ Izvajam preverjanje poteklih licenc...');
    try {
      runCronExpiry(io);
    } catch (error) {
      console.error('❌ Napaka pri cron job:', error);
    }
  });

  // Počisti stare WebSocket sobe vsak dan ob polnoči
  cron.schedule('0 0 * * *', () => {
    console.log('🧹 Čiščenje starih WebSocket sob...');
    try {
      if (io && io.sockets && io.sockets.adapter && io.sockets.adapter.rooms) {
        io.sockets.adapter.rooms.clear();
      }
    } catch (error) {
      console.error('❌ Napaka pri čiščenju sob:', error);
    }
  });

  // Backup podatkov vsak dan ob 2:00
  cron.schedule('0 2 * * *', () => {
    console.log('💾 Izvajam backup podatkov...');
    // Implementacija backup-a
  });
} else {
  console.log('🎯 Demo mode: Cron jobs so onemogočeni');
}

// 🚀 Server Start
const PORT = process.env.PORT || 5001;

serverHttp.listen(PORT, () => {
  console.log('\n🚀 ===== OMNI CLOUD PLATFORM =====');
  console.log(`🌐 Server teče na portu: ${PORT}`);
  console.log(`🔗 API dostopen na: http://localhost:${PORT}`);
  console.log(`📡 WebSocket dostopen na: ws://localhost:${PORT}`);
  console.log(`🎯 Demo način: ${process.env.DEMO_MODE === 'true' ? 'VKLOPLJEN' : 'IZKLOPLJEN'}`);
  console.log(`🗄️ Baza podatkov: ${process.env.DEMO_MODE === 'true' ? 'V-pomnilniška' : 'MongoDB'}`);
  console.log(`📊 Redis: ${process.env.DEMO_MODE === 'true' ? 'Simuliran' : 'Aktiven'}`);
  console.log('🎉 Vsi moduli uspešno naloženi!');
  console.log('=====================================\n');
  
  // Pošlji notifikacijo o zagonu
  if (process.env.DEMO_MODE !== 'true') {
    notifyPlanRoom({
      email: 'system',
      plan: 'system'
    }, io);
  }
});

// 🛑 Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Prejel SIGTERM signal, zaustavlja server...');
  
  serverHttp.close(() => {
    console.log('✅ HTTP server zaustavljen');
    
    // Zapri WebSocket povezave
    io.close(() => {
      console.log('✅ WebSocket server zaustavljen');
      
      // Zapri bazo podatkov
      dbConfig.disconnect();
      redisConfig.disconnect();
      
      console.log('👋 Server uspešno zaustavljen');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Prejel SIGINT signal (Ctrl+C), zaustavlja server...');
  process.emit('SIGTERM');
});

// Export za testiranje
module.exports = { app, io, serverHttp };