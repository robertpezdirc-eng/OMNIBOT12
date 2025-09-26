const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const licenseRoutes = require('./routes/license');

// Ustvari Express aplikacijo in HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000'],
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logiranje zahtev
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// API routes
app.use('/api/license', licenseRoutes);

// WebSocket povezave
io.on('connection', (socket) => {
    console.log('🔌 Nov client povezan:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('🔌 Client odklopljen:', socket.id);
    });
});

// Funkcija za obveščanje vseh clientov o spremembi licence
function broadcastLicenseUpdate(license) {
    console.log('📡 Pošiljam posodobitev licence vsem clientom:', license.client_id);
    io.emit('license_update', license);
}

// Izvozi funkcijo za uporabo v kontrolerjih
module.exports.broadcastLicenseUpdate = broadcastLicenseUpdate;

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Omni Client Demo - Licenčni API Server',
        version: '1.0.0',
        endpoints: {
            'POST /api/license/validate': 'Validira licenco in vrne JWT token',
            'POST /api/license/generate-token': 'Generira nov JWT token',
            'GET /api/license/info/:client_id': 'Informacije o licenci',
            'GET /api/license/all': 'Vse licence (admin)',
            'GET /api/license/status': 'Status API-ja'
        },
        demo_clients: [
            { client_id: 'DEMO001', plan: 'demo', modules: ['ceniki', 'blagajna'] },
            { client_id: 'DEMO002', plan: 'basic', modules: ['ceniki', 'blagajna', 'zaloge'] },
            { client_id: 'DEMO003', plan: 'premium', modules: ['ceniki', 'blagajna', 'zaloge', 'AI_optimizacija'] },
            { client_id: 'EXPIRED001', plan: 'demo', status: 'expired' }
        ]
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint ne obstaja',
        available_endpoints: [
            'GET /',
            'GET /health',
            'POST /api/license/validate',
            'POST /api/license/generate-token',
            'GET /api/license/info/:client_id',
            'GET /api/license/all',
            'GET /api/license/status'
        ]
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server napaka:', error);
    res.status(500).json({
        success: false,
        message: 'Interna napaka strežnika',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Zaženi server
server.listen(PORT, () => {
    console.log('🚀 Omni Client Demo - Licenčni API Server + WebSocket');
    console.log(`📡 Server teče na http://localhost:${PORT}`);
    console.log(`🔌 WebSocket aktiven na ws://localhost:${PORT}`);
    console.log('📋 Dostopni endpointi:');
    console.log(`   GET  http://localhost:${PORT}/`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   POST http://localhost:${PORT}/api/license/validate`);
    console.log(`   POST http://localhost:${PORT}/api/license/generate-token`);
    console.log(`   GET  http://localhost:${PORT}/api/license/info/:client_id`);
    console.log(`   GET  http://localhost:${PORT}/api/license/all`);
    console.log(`   GET  http://localhost:${PORT}/api/license/status`);
    console.log('');
    console.log('🔑 Demo klienti:');
    console.log('   DEMO001 (demo plan) - ceniki, blagajna');
    console.log('   DEMO002 (basic plan) - ceniki, blagajna, zaloge');
    console.log('   DEMO003 (premium plan) - vsi moduli');
    console.log('   EXPIRED001 (potekel) - za testiranje napak');
    console.log('');
    console.log('✅ Server pripravljen za zahteve in WebSocket povezave!');
});

module.exports = app;