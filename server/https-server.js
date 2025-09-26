const fs = require("fs");
const https = require("https");
const express = require("express");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

console.log('🔄 Starting HTTPS Server with WebSocket...');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Models
const licenseSchema = new mongoose.Schema({
    licenseKey: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    productId: { type: String, required: true },
    status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' },
    expiryDate: { type: Date, required: true },
    features: [String],
    maxDevices: { type: Number, default: 1 },
    currentDevices: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    lastUsed: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    licenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'License' }],
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

const License = mongoose.model('License', licenseSchema);
const User = mongoose.model('User', userSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'omni_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// SSL Certificate Configuration
let sslOptions = {};
try {
    sslOptions = {
        key: fs.readFileSync(path.join(__dirname, "../certs/privkey.pem")),
        cert: fs.readFileSync(path.join(__dirname, "../certs/fullchain.pem"))
    };
    console.log('✅ SSL certificates loaded successfully');
} catch (error) {
    console.warn('⚠️ SSL certificates not found, using self-signed certificates');
    // Generate self-signed certificates for development
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { days: 365 });
    sslOptions = {
        key: pems.private,
        cert: pems.cert
    };
}

// Create HTTPS server
const server = https.createServer(sslOptions, app);

// Initialize Socket.IO with CORS enabled
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/omni';
        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

// API Routes

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        ssl: true,
        websocket: true
    });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });
        
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'omni_secret_key',
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const user = await User.findOne({ 
            $or: [{ email: username }, { username }] 
        });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'omni_secret_key',
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// License verification endpoint
app.post("/api/license/check", async (req, res) => {
    try {
        const { licenseKey, deviceId } = req.body;
        
        if (!licenseKey) {
            return res.status(400).json({ error: 'License key is required' });
        }
        
        // Find license in database
        const license = await License.findOne({ licenseKey });
        
        if (!license) {
            return res.status(404).json({ 
                valid: false, 
                error: 'License not found' 
            });
        }
        
        // Check if license is expired
        if (license.expiryDate < new Date()) {
            license.status = 'expired';
            await license.save();
            return res.status(403).json({ 
                valid: false, 
                error: 'License expired' 
            });
        }
        
        // Check if license is suspended
        if (license.status === 'suspended') {
            return res.status(403).json({ 
                valid: false, 
                error: 'License suspended' 
            });
        }
        
        // Check device limit
        if (deviceId && license.currentDevices >= license.maxDevices) {
            return res.status(403).json({ 
                valid: false, 
                error: 'Device limit exceeded' 
            });
        }
        
        // Update last used timestamp
        license.lastUsed = new Date();
        if (deviceId && license.currentDevices < license.maxDevices) {
            license.currentDevices += 1;
        }
        await license.save();
        
        res.json({
            valid: true,
            license: {
                licenseKey: license.licenseKey,
                productId: license.productId,
                status: license.status,
                expiryDate: license.expiryDate,
                features: license.features,
                maxDevices: license.maxDevices,
                currentDevices: license.currentDevices
            }
        });
    } catch (error) {
        console.error('License check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// License creation endpoint
app.post("/api/license/create", authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { 
            userId, 
            productId, 
            expiryDate, 
            features = [], 
            maxDevices = 1 
        } = req.body;
        
        if (!userId || !productId || !expiryDate) {
            return res.status(400).json({ 
                error: 'userId, productId, and expiryDate are required' 
            });
        }
        
        // Generate unique license key
        const licenseKey = `OMNI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Create new license
        const license = new License({
            licenseKey,
            userId,
            productId,
            expiryDate: new Date(expiryDate),
            features,
            maxDevices
        });
        
        await license.save();
        
        // Add license to user
        await User.findByIdAndUpdate(userId, {
            $push: { licenses: license._id }
        });
        
        res.status(201).json({
            message: 'License created successfully',
            license: {
                id: license._id,
                licenseKey: license.licenseKey,
                userId: license.userId,
                productId: license.productId,
                status: license.status,
                expiryDate: license.expiryDate,
                features: license.features,
                maxDevices: license.maxDevices,
                createdAt: license.createdAt
            }
        });
    } catch (error) {
        console.error('License creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all licenses (admin only)
app.get("/api/licenses", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const licenses = await License.find().sort({ createdAt: -1 });
        res.json({ licenses });
    } catch (error) {
        console.error('Get licenses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user's licenses
app.get("/api/user/licenses", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate('licenses');
        res.json({ licenses: user.licenses || [] });
    } catch (error) {
        console.error('Get user licenses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Socket.IO connection handlers
io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Send welcome message
    socket.emit("welcome", { 
        message: "Connected to Omni HTTPS Server",
        timestamp: new Date().toISOString()
    });
    
    // Handle ping/pong for connection testing
    socket.on("ping", (data) => {
        console.log(`📡 Ping received from ${socket.id}`);
        socket.emit("pong", { 
            ...data, 
            serverTime: new Date().toISOString() 
        });
    });
    
    // Handle license verification via WebSocket
    socket.on("license:verify", async (data) => {
        try {
            const { licenseKey, deviceId } = data;
            const license = await License.findOne({ licenseKey });
            
            if (license && license.status === 'active' && license.expiryDate > new Date()) {
                socket.emit("license:verified", { 
                    valid: true, 
                    license: {
                        productId: license.productId,
                        features: license.features,
                        expiryDate: license.expiryDate
                    }
                });
            } else {
                socket.emit("license:verified", { 
                    valid: false, 
                    error: "Invalid or expired license" 
                });
            }
        } catch (error) {
            console.error('WebSocket license verification error:', error);
            socket.emit("license:error", { error: "Verification failed" });
        }
    });
    
    // Handle real-time license updates
    socket.on("license:subscribe", (data) => {
        const { licenseKey } = data;
        socket.join(`license:${licenseKey}`);
        console.log(`📋 Client subscribed to license updates: ${licenseKey}`);
    });
    
    // Handle disconnect
    socket.on("disconnect", (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });
});

// Broadcast license updates to subscribed clients
const broadcastLicenseUpdate = (licenseKey, updateData) => {
    io.to(`license:${licenseKey}`).emit("license:updated", updateData);
};

// Start server
const PORT = process.env.PORT || 3000;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 3001;

const startServer = async () => {
    try {
        // Connect to database first
        await connectDB();
        
        // Start HTTPS server
        server.listen(PORT, () => {
            console.log(`🚀 HTTPS Server running on port ${PORT}`);
            console.log(`🔒 SSL/TLS encryption enabled`);
            console.log(`🌐 WebSocket server running on port ${PORT}`);
            console.log(`📡 Socket.IO enabled with CORS`);
            console.log(`🔧 API endpoints:`);
            console.log(`   - POST /api/auth/register (user registration)`);
            console.log(`   - POST /api/auth/login (user login)`);
            console.log(`   - POST /api/license/check (license verification)`);
            console.log(`   - POST /api/license/create (create license - admin)`);
            console.log(`   - GET  /api/licenses (get all licenses - admin)`);
            console.log(`   - GET  /api/user/licenses (get user licenses)`);
            console.log(`   - GET  /health (health check)`);
            console.log(`🔌 WebSocket events:`);
            console.log(`   - ping/pong (connection test)`);
            console.log(`   - license:verify (real-time license check)`);
            console.log(`   - license:subscribe (subscribe to license updates)`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        mongoose.connection.close();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        mongoose.connection.close();
        process.exit(0);
    });
});

// Start the server
startServer();

module.exports = { app, server, io, License, User, broadcastLicenseUpdate };