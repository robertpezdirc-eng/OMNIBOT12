// HTTPS Server for OMNI-BRAIN
// Varen HTTPS strežnik z SSL certifikatom

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Konfiguracija
const config = {
    httpPort: 80,
    httpsPort: 443,
    certPath: process.env.SSL_CERT_PATH || 'C:\\Certbot\\live',
    domain: process.env.DOMAIN || 'localhost',
    webRoot: path.join(__dirname, 'public')
};

console.log('🔐 OMNI-BRAIN HTTPS Server');
console.log('==========================');

// Funkcija za nalaganje SSL certifikatov
function loadSSLCertificates() {
    try {
        const certDir = path.join(config.certPath, config.domain);
        
        const options = {
            key: fs.readFileSync(path.join(certDir, 'privkey.pem')),
            cert: fs.readFileSync(path.join(certDir, 'fullchain.pem'))
        };
        
        console.log(`✅ SSL certifikati naloženi iz: ${certDir}`);
        return options;
    } catch (error) {
        console.error('❌ Napaka pri nalaganju SSL certifikatov:', error.message);
        
        // Fallback na self-signed certifikat za razvoj
        console.log('⚠️ Uporabljam self-signed certifikat za razvoj...');
        return createSelfSignedCert();
    }
}

// Ustvari self-signed certifikat za razvoj
function createSelfSignedCert() {
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: config.domain }];
    const pems = selfsigned.generate(attrs, { days: 365 });
    
    return {
        key: pems.private,
        cert: pems.cert
    };
}

// Express aplikacija
const app = express();

// Middleware za logiranje
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
    next();
});

// Varnostni middleware
app.use((req, res, next) => {
    // HSTS (HTTP Strict Transport Security)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.socket.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net;");
    
    next();
});

// Statične datoteke
app.use(express.static('public'));
app.use('/admin', express.static('admin'));
app.use(express.static('.', { dotfiles: 'ignore' }));

// JSON middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API rute
if (fs.existsSync('./apiRoutes.js')) {
    app.use('/api', require('./apiRoutes'));
}

// Mobile API
if (fs.existsSync('./mobile-api.js')) {
    app.use('/api/mobile', require('./mobile-api'));
}

// Glavna stran
app.get('/', (req, res) => {
    if (fs.existsSync('./index.html')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else if (fs.existsSync('./dashboard.html')) {
        res.sendFile(path.join(__dirname, 'dashboard.html'));
    } else {
        res.send(`
            <h1>🧠 OMNI-BRAIN HTTPS Server</h1>
            <p>✅ HTTPS strežnik uspešno teče!</p>
            <p>🔐 SSL certifikat aktiven</p>
            <p>📱 <a href="/mobile-dashboard.html">Mobilna nadzorna plošča</a></p>
            <p>⚙️ <a href="/admin/admin-dashboard.html">Admin nadzorna plošča</a></p>
        `);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        ssl: true,
        server: 'OMNI-BRAIN HTTPS'
    });
});

// SSL certifikat info endpoint
app.get('/ssl-info', (req, res) => {
    try {
        const certDir = path.join(config.certPath, config.domain);
        const certFile = path.join(certDir, 'cert.pem');
        
        if (fs.existsSync(certFile)) {
            const cert = fs.readFileSync(certFile, 'utf8');
            const certInfo = parseCertificate(cert);
            
            res.json({
                domain: config.domain,
                certPath: certDir,
                expiryDate: certInfo.expiryDate,
                issuer: certInfo.issuer,
                valid: certInfo.valid
            });
        } else {
            res.json({
                domain: config.domain,
                certType: 'self-signed',
                message: 'Using development certificate'
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Unable to read certificate info',
            message: error.message
        });
    }
});

// Funkcija za parsiranje certifikata
function parseCertificate(certPem) {
    // Osnovno parsiranje certifikata (potrebuje crypto modul)
    try {
        const crypto = require('crypto');
        const cert = new crypto.X509Certificate(certPem);
        
        return {
            expiryDate: cert.validTo,
            issuer: cert.issuer,
            valid: new Date(cert.validTo) > new Date()
        };
    } catch (error) {
        return {
            expiryDate: 'Unknown',
            issuer: 'Unknown',
            valid: false
        };
    }
}

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Stran ni najdena</h1>
        <p>Zahtevana stran ne obstaja.</p>
        <p><a href="/">Nazaj na glavno stran</a></p>
    `);
});

// Error handler
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).send(`
        <h1>500 - Napaka strežnika</h1>
        <p>Prišlo je do napake na strežniku.</p>
        <p><a href="/">Nazaj na glavno stran</a></p>
    `);
});

// HTTP preusmeritev na HTTPS
const httpApp = express();
httpApp.use((req, res) => {
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    console.log(`🔄 Preusmerjam HTTP na HTTPS: ${req.url} -> ${httpsUrl}`);
    res.redirect(301, httpsUrl);
});

// Zaženi strežnike
function startServers() {
    try {
        // Naloži SSL certifikate
        const sslOptions = loadSSLCertificates();
        
        // HTTPS strežnik
        const httpsServer = https.createServer(sslOptions, app);
        
        httpsServer.listen(config.httpsPort, () => {
            console.log(`✅ HTTPS strežnik teče na portu ${config.httpsPort}`);
            console.log(`🌐 Dostopen na: https://${config.domain}`);
        });
        
        httpsServer.on('error', (error) => {
            if (error.code === 'EACCES') {
                console.error(`❌ Ni dovoljenj za port ${config.httpsPort}. Zaženite kot administrator.`);
            } else if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${config.httpsPort} je že v uporabi.`);
            } else {
                console.error('❌ HTTPS strežnik napaka:', error.message);
            }
            process.exit(1);
        });
        
        // HTTP strežnik (preusmeritev)
        const httpServer = http.createServer(httpApp);
        
        httpServer.listen(config.httpPort, () => {
            console.log(`✅ HTTP preusmeritev teče na portu ${config.httpPort}`);
        });
        
        httpServer.on('error', (error) => {
            if (error.code === 'EACCES') {
                console.error(`❌ Ni dovoljenj za port ${config.httpPort}. Zaženite kot administrator.`);
            } else if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${config.httpPort} je že v uporabi.`);
            } else {
                console.error('❌ HTTP strežnik napaka:', error.message);
            }
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 Ustavljam strežnike...');
            httpsServer.close(() => {
                httpServer.close(() => {
                    console.log('✅ Strežniki ustavljeni');
                    process.exit(0);
                });
            });
        });
        
        return { httpsServer, httpServer };
        
    } catch (error) {
        console.error('❌ Napaka pri zagonu strežnikov:', error.message);
        process.exit(1);
    }
}

// Zaženi strežnike
if (require.main === module) {
    startServers();
}

module.exports = { startServers, app };