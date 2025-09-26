// 🔐 OMNI-BRAIN Varnostni Moduli
// Implementacija HTTPS, 2FA, šifriranja in drugih varnostnih mehanizmov

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 🔐 Šifriranje podatkov
class DataEncryption {
  constructor(secretKey = null) {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = secretKey || process.env.ENCRYPTION_KEY || this.generateKey();
    this.keyBuffer = Buffer.from(this.secretKey, 'hex');
  }

  // 🔑 Generiraj nov ključ
  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // 🔒 Šifriraj podatke
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.keyBuffer);
      cipher.setAAD(Buffer.from('omni-brain-auth', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('❌ Napaka pri šifriranju:', error);
      throw new Error('Šifriranje ni uspelo');
    }
  }

  // 🔓 Dešifriraj podatke
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      const decipher = crypto.createDecipher(this.algorithm, this.keyBuffer);
      
      decipher.setAAD(Buffer.from('omni-brain-auth', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Napaka pri dešifriranju:', error);
      throw new Error('Dešifriranje ni uspelo');
    }
  }

  // 🔐 Šifriraj geslo
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // ✅ Preveri geslo
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

// 🔐 Dvo-faktorska avtentikacija (2FA)
class TwoFactorAuth {
  constructor() {
    this.serviceName = 'OMNI-BRAIN-MAXI-ULTRA';
  }

  // 🔑 Generiraj 2FA skrivnost
  generateSecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      service: this.serviceName,
      length: 32
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeUrl: null // Bo generiran z generateQRCode
    };
  }

  // 📱 Generiraj QR kodo
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('❌ Napaka pri generiranju QR kode:', error);
      throw new Error('Generiranje QR kode ni uspelo');
    }
  }

  // ✅ Preveri 2FA token
  verifyToken(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Dovoli 2 koraka tolerance
    });
  }

  // 🔄 Generiraj backup kode
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}

// 🛡️ Rate Limiting
const createRateLimiters = () => {
  // Splošni rate limiter
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 100, // 100 zahtev na IP
    message: {
      error: 'Preveč zahtev z tega IP naslova. Poskusi znova čez 15 minut.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  // Strožji limiter za prijavo
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 5, // 5 poskusov prijave
    message: {
      error: 'Preveč poskusov prijave. Poskusi znova čez 15 minut.',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true
  });

  // API rate limiter
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuta
    max: 60, // 60 API klicev na minuto
    message: {
      error: 'API rate limit presežen. Poskusi znova čez minuto.',
      code: 'API_RATE_LIMIT_EXCEEDED'
    }
  });

  return { generalLimiter, loginLimiter, apiLimiter };
};

// 🔒 HTTPS konfiguracija
class HTTPSManager {
  constructor() {
    this.certPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/omni-brain.crt';
    this.keyPath = process.env.SSL_KEY_PATH || '/etc/ssl/private/omni-brain.key';
    this.caPath = process.env.SSL_CA_PATH || null;
  }

  // 📜 Preveri SSL certifikate
  checkCertificates() {
    const certExists = fs.existsSync(this.certPath);
    const keyExists = fs.existsSync(this.keyPath);
    
    return {
      certExists,
      keyExists,
      ready: certExists && keyExists
    };
  }

  // 🔐 Pridobi SSL opcije
  getSSLOptions() {
    const certCheck = this.checkCertificates();
    
    if (!certCheck.ready) {
      throw new Error('SSL certifikati niso na voljo');
    }

    const options = {
      key: fs.readFileSync(this.keyPath),
      cert: fs.readFileSync(this.certPath)
    };

    // Dodaj CA certifikat če obstaja
    if (this.caPath && fs.existsSync(this.caPath)) {
      options.ca = fs.readFileSync(this.caPath);
    }

    return options;
  }

  // 🚀 Ustvari HTTPS strežnik
  createHTTPSServer(app) {
    try {
      const sslOptions = this.getSSLOptions();
      return https.createServer(sslOptions, app);
    } catch (error) {
      console.error('❌ Napaka pri ustvarjanju HTTPS strežnika:', error);
      throw error;
    }
  }

  // 📋 Generiraj self-signed certifikat (za razvoj)
  generateSelfSignedCert() {
    const script = `
      openssl req -x509 -newkey rsa:4096 -keyout ${this.keyPath} -out ${this.certPath} -days 365 -nodes -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=OMNI-BRAIN/CN=localhost"
    `;
    
    console.log('🔐 Za generiranje self-signed certifikata zaženi:');
    console.log(script);
    
    return script;
  }
}

// 🛡️ Varnostni middleware
const createSecurityMiddleware = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' }
  });
};

// 🔐 Session varnost
const createSecureSession = (session) => {
  return session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS v produkciji
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 ur
      sameSite: 'strict'
    },
    name: 'omni-brain-session' // Skrij privzeto ime
  });
};

// 🔍 Audit log
class AuditLogger {
  constructor() {
    this.logFile = path.join(__dirname, '../logs/audit.log');
    this.ensureLogDir();
  }

  ensureLogDir() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(event, userId, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      userId,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      details: details.extra || {}
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFile(this.logFile, logLine, (err) => {
      if (err) {
        console.error('❌ Napaka pri pisanju audit loga:', err);
      }
    });

    // Pošlji tudi v konzolo v development načinu
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Audit:', logEntry);
    }
  }

  // Preberi zadnje audit zapise
  async getRecentLogs(limit = 100) {
    try {
      const data = fs.readFileSync(this.logFile, 'utf8');
      const lines = data.trim().split('\n');
      const logs = lines.slice(-limit).map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      return logs.reverse(); // Najnovejši prvi
    } catch (error) {
      console.error('❌ Napaka pri branju audit loga:', error);
      return [];
    }
  }
}

// 🔐 IP Whitelist/Blacklist
class IPFilter {
  constructor() {
    this.whitelist = new Set(process.env.IP_WHITELIST?.split(',') || []);
    this.blacklist = new Set(process.env.IP_BLACKLIST?.split(',') || []);
  }

  isAllowed(ip) {
    // Če je IP na blacklisti, zavrni
    if (this.blacklist.has(ip)) {
      return false;
    }

    // Če je whitelist prazen, dovoli vse (razen blacklisted)
    if (this.whitelist.size === 0) {
      return true;
    }

    // Če je whitelist definiran, dovoli samo whitelisted IP-je
    return this.whitelist.has(ip);
  }

  middleware() {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (!this.isAllowed(clientIP)) {
        console.warn(`🚫 Zavrnjen dostop z IP: ${clientIP}`);
        return res.status(403).json({
          error: 'Dostop zavrnjen',
          code: 'IP_BLOCKED'
        });
      }
      
      next();
    };
  }
}

module.exports = {
  DataEncryption,
  TwoFactorAuth,
  HTTPSManager,
  AuditLogger,
  IPFilter,
  createRateLimiters,
  createSecurityMiddleware,
  createSecureSession
};