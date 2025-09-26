/**
 * OMNI License System Server
 * Node.js/Express backend za licenčni sistem
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Import routes
const licenseRoutes = require('./routes/license');

// Import utilities
const { generateClientId, generateLicenseKey } = require('./utils/crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api';

// Trust proxy (za pravilno IP zaznavanje)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://omni-app.com', 'https://admin.omni-app.com']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minut
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 zahtev na okno
  message: {
    error: 'Preveč zahtev z tega IP naslova',
    retry_after: '15 minut'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use(`${API_PREFIX}/license`, licenseRoutes);

// Serve admin console
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Redirect root to admin console
app.get('/', (req, res) => {
    res.redirect('/admin/admin-console.html');
});

// Basic API info endpoint
app.get('/info', (req, res) => {
    res.json({
        name: 'Omni License System',
        version: '1.0.0',
        status: 'active',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        endpoints: {
            validate: 'POST /api/license/validate',
            info: 'GET /api/license/info/:client_id',
            all: 'GET /api/license/all',
            create: 'POST /api/license/create',
            health: 'GET /api/license/health',
            plans: 'GET /api/license/plans',
            stats: 'GET /api/license/stats'
        }
    });
});

// Admin dashboard (simple HTML)
app.get('/admin', (req, res) => {
  const adminHTML = `
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI License System - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #667eea; margin-bottom: 10px; }
        .stat-label { color: #666; font-size: 0.9em; }
        .section { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .btn { background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #5a6fd8; }
        .endpoint { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #667eea; }
        .method { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 0.8em; font-weight: bold; margin-right: 10px; }
        .method.post { background: #28a745; color: white; }
        .method.get { background: #007bff; color: white; }
        .loading { text-align: center; padding: 20px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔑 OMNI License System</h1>
            <p>Admin Dashboard - Node.js/Express Backend</p>
        </div>

        <div class="stats-grid" id="statsGrid">
            <div class="loading">Nalagam statistike...</div>
        </div>

        <div class="section">
            <h2>📊 API Endpoints</h2>
            <div class="endpoint">
                <span class="method post">POST</span>
                <strong>${API_PREFIX}/license/validate</strong> - Preveri veljavnost licence
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>${API_PREFIX}/license/info/:client_id</strong> - Informacije o licenci
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>${API_PREFIX}/license/all</strong> - Vse licence
            </div>
            <div class="endpoint">
                <span class="method post">POST</span>
                <strong>${API_PREFIX}/license/create</strong> - Ustvari novo licenco
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>${API_PREFIX}/license/plans</strong> - Licenčni paketi
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>${API_PREFIX}/license/stats</strong> - Statistike
            </div>
        </div>

        <div class="section">
            <h2>🛠️ Orodja</h2>
            <button class="btn" onclick="refreshStats()">🔄 Osveži statistike</button>
            <button class="btn" onclick="viewAllLicenses()">📋 Prikaži vse licence</button>
            <button class="btn" onclick="testValidation()">🧪 Testiraj validacijo</button>
        </div>

        <div class="section" id="licensesList" style="display: none;">
            <h2>📋 Seznam licenc</h2>
            <div id="licensesContent"></div>
        </div>
    </div>

    <script>
        // Naloži statistike ob zagonu
        loadStats();

        async function loadStats() {
            try {
                const response = await fetch('${API_PREFIX}/license/stats');
                const data = await response.json();
                
                const statsHTML = \`
                    <div class="stat-card">
                        <div class="stat-value">\${data.total_licenses}</div>
                        <div class="stat-label">Skupaj licenc</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">\${data.active_licenses}</div>
                        <div class="stat-label">Aktivne licence</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">\${data.expired_licenses}</div>
                        <div class="stat-label">Potekle licence</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">\${Object.keys(data.plan_statistics).length}</div>
                        <div class="stat-label">Različni paketi</div>
                    </div>
                \`;
                
                document.getElementById('statsGrid').innerHTML = statsHTML;
            } catch (error) {
                console.error('Napaka pri nalaganju statistik:', error);
                document.getElementById('statsGrid').innerHTML = '<div class="loading">❌ Napaka pri nalaganju</div>';
            }
        }

        async function refreshStats() {
            document.getElementById('statsGrid').innerHTML = '<div class="loading">Nalagam...</div>';
            await loadStats();
        }

        async function viewAllLicenses() {
            try {
                const response = await fetch('${API_PREFIX}/license/all');
                const data = await response.json();
                
                let licensesHTML = '<table style="width: 100%; border-collapse: collapse;">';
                licensesHTML += '<tr style="background: #f8f9fa;"><th style="padding: 10px; border: 1px solid #ddd;">Client ID</th><th style="padding: 10px; border: 1px solid #ddd;">Podjetje</th><th style="padding: 10px; border: 1px solid #ddd;">Paket</th><th style="padding: 10px; border: 1px solid #ddd;">Status</th><th style="padding: 10px; border: 1px solid #ddd;">Poteče</th></tr>';
                
                data.licenses.forEach(license => {
                    const statusColor = license.is_valid ? '#28a745' : '#dc3545';
                    licensesHTML += \`<tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">\${license.client_id}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">\${license.company_name}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">\${license.plan}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; color: \${statusColor};">\${license.is_valid ? 'Aktivna' : 'Neaktivna'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">\${new Date(license.expires_at).toLocaleDateString('sl-SI')}</td>
                    </tr>\`;
                });
                
                licensesHTML += '</table>';
                
                document.getElementById('licensesContent').innerHTML = licensesHTML;
                document.getElementById('licensesList').style.display = 'block';
            } catch (error) {
                console.error('Napaka pri nalaganju licenc:', error);
                alert('Napaka pri nalaganju licenc');
            }
        }

        async function testValidation() {
            const testData = {
                client_id: 'OMNI001',
                license_key: '8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219'
            };
            
            try {
                const response = await fetch('${API_PREFIX}/license/validate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData)
                });
                
                const result = await response.json();
                alert(JSON.stringify(result, null, 2));
            } catch (error) {
                console.error('Napaka pri testiranju:', error);
                alert('Napaka pri testiranju validacije');
            }
        }
    </script>
</body>
</html>
  `;
  
  res.send(adminHTML);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint ni najden',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: {
      root: '/',
      health: '/health',
      admin: '/admin',
      api: `${API_PREFIX}/license/*`
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error:', error);
  
  res.status(error.status || 500).json({
    error: 'Interna napaka strežnika',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Nekaj je šlo narobe',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 OMNI License System Server started!');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}${API_PREFIX}/license`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 Demo licence za testiranje:');
  console.log('   Client ID: OMNI001');
  console.log('   License Key: 8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219');
  console.log('   Podjetje: Hotel Slovenija (Premium)');
  console.log('');
  console.log('   Client ID: OMNI002');
  console.log('   License Key: 7e3b8d1f-4c6a-42e2-ad44-6c38d0bef320');
  console.log('   Podjetje: Kamp Bled (Basic)');
  console.log('');
  console.log('   Client ID: OMNI003');
  console.log('   License Key: 9a5c7f2d-6e8b-43f1-be55-7d49e1cfg431');
  console.log('   Podjetje: Restavracija Gostilna (Demo)');
  console.log('');
  console.log('🔄 Background procesi aktivni...');
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;