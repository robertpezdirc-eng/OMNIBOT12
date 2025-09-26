const fs = require("fs");
const https = require("https");
const express = require("express");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
require("dotenv").config();

console.log('🚀 Starting Complete HTTPS Server with WebSocket and MongoDB...');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// SSL Certificate Configuration
let sslOptions = {};
try {
    const keyPath = path.join(__dirname, "../certs/privkey.pem");
    const certPath = path.join(__dirname, "../certs/fullchain.pem");
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        sslOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        console.log('✅ SSL certificates loaded successfully');
    } else {
        throw new Error('SSL certificates not found');
    }
} catch (error) {
    console.warn('⚠️ SSL certificates not found, using self-signed certificates');
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { days: 365 });
    sslOptions = {
        key: pems.private,
        cert: pems.cert
    };
}

// MongoDB Connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/omni_licenses';
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.warn('⚠️ MongoDB connection failed, running without database:', error.message);
    }
};

// MongoDB Models
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const LicenseSchema = new mongoose.Schema({
    licenseKey: { type: String, required: true, unique: true },
    clientId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    plan: { type: String, enum: ['trial', 'basic', 'premium', 'enterprise'], default: 'trial' },
    type: { type: String, enum: ['trial', 'basic', 'premium', 'enterprise'], default: 'trial' },
    status: { type: String, enum: ['active', 'expired', 'suspended', 'revoked'], default: 'active' },
    expiresAt: { type: Date, required: true },
    modules: [String],
    features: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const License = mongoose.model('License', LicenseSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Create HTTPS server
const server = https.createServer(sslOptions, app);

// Initialize Socket.IO with CORS enabled
const io = new Server(server, {
    cors: {
        origin: process.env.WEBSOCKET_CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

// API Routes
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        ssl: true,
        websocket: true,
        mongodb: mongoose.connection.readyState === 1,
        version: '1.0.0'
    });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ username });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// License Routes
// License Verification Endpoint (POST /api/license/check)
app.post('/api/license/check', async (req, res) => {
    try {
        const { client_id, license_key } = req.body;
        
        if (!client_id || !license_key) {
            return res.status(400).json({ 
                valid: false, 
                error: 'client_id and license_key are required' 
            });
        }

        const license = await License.findOne({ 
            licenseKey: license_key, 
            clientId: client_id 
        }).populate('userId', 'username email');
        
        // Če licenca ne obstaja ali je preklicana
        if (!license || license.status === 'revoked') {
            return res.json({ valid: false });
        }

        // Če je expires_at < trenutni čas
        if (license.expiresAt < new Date()) {
            return res.json({ valid: false });
        }

        // Če je vse v redu
        res.json({
            valid: true,
            modules: license.modules || license.features || [],
            license: {
                key: license.licenseKey,
                clientId: license.clientId,
                plan: license.plan || license.type,
                status: license.status,
                expiresAt: license.expiresAt,
                modules: license.modules || license.features || []
            }
        });
    } catch (error) {
        console.error('License check error:', error);
        res.status(500).json({ 
            valid: false, 
            error: 'License verification failed' 
        });
    }
});

app.get('/api/licenses/verify/:licenseKey', async (req, res) => {
    try {
        const { licenseKey } = req.params;
        const license = await License.findOne({ licenseKey }).populate('userId', 'username email');
        
        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }

        const isValid = license.status === 'active' && license.expiresAt > new Date();
        
        res.json({
            valid: isValid,
            license: {
                key: license.licenseKey,
                type: license.type,
                status: license.status,
                expiresAt: license.expiresAt,
                features: license.features,
                user: license.userId
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'License verification failed', details: error.message });
    }
});

// License Creation Endpoint (POST /api/license/create)
app.post('/api/licenses/create', async (req, res) => {
    try {
        const { client_id, plan = 'trial', modules = [], expires_at } = req.body;
        
        if (!client_id) {
            return res.status(400).json({ 
                error: 'client_id is required' 
            });
        }

        // Generiraj unikatni license_key (UUID4 style)
        const { v4: uuidv4 } = require('uuid');
        const license_key = uuidv4();
        
        // Določi expires_at
        let expiresAt;
        if (expires_at) {
            expiresAt = new Date(expires_at);
        } else {
            // Privzeto 30 dni za trial, 365 dni za ostale
            const defaultDays = plan === 'trial' ? 30 : 365;
            expiresAt = new Date(Date.now() + (defaultDays * 24 * 60 * 60 * 1000));
        }
        
        // Shrani v MongoDB
        const license = new License({
            licenseKey: license_key,
            clientId: client_id,
            plan: plan,
            type: plan, // Backward compatibility
            expiresAt: expiresAt,
            modules: modules,
            features: modules, // Backward compatibility
            status: 'active'
        });
        
        await license.save();
        
        // Vrni license_key in expires_at
        res.status(201).json({
            license_key: license.licenseKey,
            expires_at: license.expiresAt,
            client_id: license.clientId,
            plan: license.plan,
            modules: license.modules,
            status: license.status
        });
    } catch (error) {
        console.error('License creation error:', error);
        res.status(500).json({ 
            error: 'License creation failed',
            details: error.message 
        });
    }
});

// License Toggle Endpoint (POST /api/license/toggle)
app.post('/api/license/toggle', async (req, res) => {
    try {
        const { client_id } = req.body;
        
        if (!client_id) {
            return res.status(400).json({ 
                error: 'client_id is required' 
            });
        }

        // Najdi licenco
        const license = await License.findOne({ clientId: client_id });
        
        if (!license) {
            return res.status(404).json({ 
                error: 'License not found for this client_id' 
            });
        }

        // Če je aktivna → deaktiviraj, če je neaktivna → aktiviraj
        let newStatus;
        if (license.status === 'active') {
            newStatus = 'suspended';
        } else if (license.status === 'suspended') {
            newStatus = 'active';
        } else {
            return res.status(400).json({ 
                error: 'Cannot toggle license with status: ' + license.status 
            });
        }

        // Posodobi MongoDB
        license.status = newStatus;
        license.updatedAt = new Date();
        await license.save();

        // Pošlji socket event "license_update" klientu
        io.emit('license_update', {
            client_id: license.clientId,
            license_key: license.licenseKey,
            status: license.status,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            client_id: license.clientId,
            license_key: license.licenseKey,
            status: license.status,
            message: `License ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('License toggle error:', error);
        res.status(500).json({ 
            error: 'License toggle failed',
            details: error.message 
        });
    }
});

// License Extend Endpoint (POST /api/license/extend)
app.post('/api/license/extend', async (req, res) => {
    try {
        const { client_id, extra_days } = req.body;
        
        if (!client_id || !extra_days) {
            return res.status(400).json({ 
                error: 'client_id and extra_days are required' 
            });
        }

        if (extra_days <= 0) {
            return res.status(400).json({ 
                error: 'extra_days must be a positive number' 
            });
        }

        // Najdi licenco
        const license = await License.findOne({ clientId: client_id });
        
        if (!license) {
            return res.status(404).json({ 
                error: 'License not found for this client_id' 
            });
        }

        // Posodobi expires_at += extra_days
        const currentExpiry = new Date(license.expiresAt);
        const newExpiry = new Date(currentExpiry.getTime() + (extra_days * 24 * 60 * 60 * 1000));
        
        license.expiresAt = newExpiry;
        license.updatedAt = new Date();
        await license.save();

        // Pošlji socket event "license_update"
        io.emit('license_update', {
            client_id: license.clientId,
            license_key: license.licenseKey,
            expires_at: license.expiresAt,
            extended_days: extra_days,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            client_id: license.clientId,
            license_key: license.licenseKey,
            expires_at: license.expiresAt,
            extended_days: extra_days,
            message: `License extended by ${extra_days} days`
        });
    } catch (error) {
        console.error('License extend error:', error);
        res.status(500).json({ 
            error: 'License extend failed',
            details: error.message 
        });
    }
});

app.post('/api/licenses/create', authenticateToken, async (req, res) => {
    try {
        const { type = 'trial', durationDays = 30, features = [] } = req.body;
        
        const licenseKey = `OMNI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const expiresAt = new Date(Date.now() + (durationDays * 24 * 60 * 60 * 1000));
        
        const license = new License({
            licenseKey,
            userId: req.user.userId,
            type,
            expiresAt,
            features
        });
        
        await license.save();
        
        res.status(201).json({
            message: 'License created successfully',
            license: {
                key: license.licenseKey,
                type: license.type,
                expiresAt: license.expiresAt,
                features: license.features
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'License creation failed', details: error.message });
    }
});

app.get('/api/licenses/my', authenticateToken, async (req, res) => {
    try {
        const licenses = await License.find({ userId: req.user.userId });
        res.json({ licenses });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch licenses', details: error.message });
    }
});

// WebSocket Events
io.on('connection', (socket) => {
    console.log(`🔌 WebSocket client connected: ${socket.id}`);
    
    socket.emit('welcome', {
        message: 'Connected to HTTPS WebSocket server',
        timestamp: new Date().toISOString(),
        socketId: socket.id
    });

    socket.on('ping', (data) => {
        console.log(`📡 Ping received from ${socket.id}:`, data);
        socket.emit('pong', {
            message: 'Pong from HTTPS server',
            timestamp: new Date().toISOString(),
            originalData: data
        });
    });

    // System message event
    socket.on('system_message', (data) => {
        console.log(`📢 System message from ${socket.id}:`, data);
        
        // Broadcast system message to all connected clients
        io.emit('system_message', {
            message: data.message || 'System notification',
            type: data.type || 'info',
            timestamp: new Date().toISOString(),
            from: socket.id
        });
    });

    // Admin system message (only for admin users)
    socket.on('admin_message', (data) => {
        console.log(`👑 Admin message from ${socket.id}:`, data);
        
        // TODO: Add admin authentication check here
        // For now, allow all users to send admin messages
        
        io.emit('system_message', {
            message: data.message || 'Admin notification',
            type: 'admin',
            priority: data.priority || 'normal',
            timestamp: new Date().toISOString(),
            from: 'admin'
        });
    });

    socket.on('license:verify', async (data) => {
        console.log(`🔐 License verification request from ${socket.id}:`, data);
        
        try {
            const { licenseKey } = data;
            const license = await License.findOne({ licenseKey });
            
            if (!license) {
                socket.emit('license:result', {
                    valid: false,
                    error: 'License not found',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const isValid = license.status === 'active' && license.expiresAt > new Date();
            
            socket.emit('license:result', {
                valid: isValid,
                license: {
                    key: license.licenseKey,
                    type: license.type,
                    status: license.status,
                    expiresAt: license.expiresAt,
                    features: license.features
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            socket.emit('license:result', {
                valid: false,
                error: 'Verification failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('license:update', async (data) => {
        console.log(`🔄 License update request from ${socket.id}:`, data);
        
        try {
            const { licenseKey, updates } = data;
            const license = await License.findOneAndUpdate(
                { licenseKey },
                updates,
                { new: true }
            );
            
            if (!license) {
                socket.emit('license:update:result', {
                    success: false,
                    error: 'License not found',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            socket.emit('license:update:result', {
                success: true,
                license: {
                    key: license.licenseKey,
                    type: license.type,
                    status: license.status,
                    expiresAt: license.expiresAt,
                    features: license.features
                },
                timestamp: new Date().toISOString()
            });

            // Broadcast update to all clients
            socket.broadcast.emit('license:updated', {
                licenseKey: license.licenseKey,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            socket.emit('license:update:result', {
                success: false,
                error: 'Update failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`🔌 WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Express error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

const PORT = process.env.PORT || 3002;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || PORT;

// Start server
const startServer = async () => {
    try {
        await connectDB();
        
        server.listen(PORT, () => {
            console.log('🌟 Complete HTTPS Server started successfully!');
            console.log(`🔗 HTTPS Server: https://localhost:${PORT}`);
            console.log(`🔌 WebSocket Server: wss://localhost:${WEBSOCKET_PORT}`);
            console.log(`🏥 Health Check: https://localhost:${PORT}/health`);
            console.log(`📊 Server PID: ${process.pid}`);
            console.log('');
            console.log('📋 Available API Endpoints:');
            console.log('   GET  /health - Health check');
            console.log('   POST /api/auth/register - User registration');
            console.log('   POST /api/auth/login - User login');
            console.log('   POST /api/license/check - License verification (client_id, license_key)');
            console.log('   POST /api/license/create - Create license (client_id, plan, modules, expires_at)');
            console.log('   POST /api/license/toggle - Toggle license status (client_id)');
            console.log('   POST /api/license/extend - Extend license (client_id, extra_days)');
            console.log('   GET  /api/licenses/verify/:key - Verify license (legacy)');
            console.log('   POST /api/licenses/create - Create license with auth (legacy)');
            console.log('   GET  /api/licenses/my - Get user licenses (auth required)');
            console.log('');
            console.log('🔌 WebSocket Events:');
            console.log('   ping/pong - Connection test');
            console.log('   system_message - Broadcast system messages');
            console.log('   admin_message - Admin notifications');
            console.log('   license_update - Real-time license status updates');
            console.log('   license:verify - Real-time license verification (legacy)');
            console.log('   license:update - Real-time license updates (legacy)');
            console.log('');
            console.log('✅ Server ready for connections!');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`🛑 ${signal} received, shutting down gracefully...`);
    
    server.close(() => {
        console.log('✅ HTTPS server closed');
        
        mongoose.connection.close(() => {
            console.log('✅ MongoDB connection closed');
            process.exit(0);
        });
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server, io };