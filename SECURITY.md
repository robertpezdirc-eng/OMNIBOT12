# 🔒 Security Guide - Omni Ultimate Turbo Flow System

## 🛡️ Varnostni Pregled

Omni sistem implementira večplastno varnostno arhitekturo za zaščito uporabniških podatkov, licenčnih informacij in sistemskih virov.

## 🔐 Avtentifikacija in Avtorizacija

### **JWT (JSON Web Tokens)**

Sistem uporablja JWT za stateless avtentifikacijo:

```javascript
// JWT konfiguracija
{
  "algorithm": "HS256",
  "expiresIn": "15m",        // Access token
  "refreshExpiresIn": "7d",  // Refresh token
  "issuer": "omni-system",
  "audience": "omni-users"
}
```

### **Refresh Token Strategija**

```javascript
// Avtomatska obnova tokenov
const refreshToken = async (oldToken) => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${oldToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
};
```

### **Role-Based Access Control (RBAC)**

| Vloga | Pravice | Opis |
|-------|---------|------|
| `user` | Osnovne funkcije | Standardni uporabnik |
| `premium` | Napredne funkcije | Premium uporabnik |
| `admin` | Administratorske funkcije | Sistem administrator |
| `super_admin` | Vse funkcije | Super administrator |

### **2FA (Two-Factor Authentication)**

```javascript
// Aktivacija 2FA
POST /api/auth/2fa/enable
{
  "secret": "JBSWY3DPEHPK3PXP",
  "token": "123456"
}

// Prijava z 2FA
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "twoFactorToken": "123456"
}
```

## 🔑 Upravljanje Gesel

### **Zahteve za Gesla**

```javascript
const passwordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPatterns: [
    'password', '123456', 'qwerty',
    'admin', 'user', 'omni'
  ]
};
```

### **Password Hashing**

```javascript
const bcrypt = require('bcrypt');

// Hashing gesla
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Preverjanje gesla
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

### **Password Reset**

```javascript
// Zahteva za reset gesla
POST /api/auth/password-reset
{
  "email": "user@example.com"
}

// Reset gesla z tokenом
POST /api/auth/password-reset/confirm
{
  "token": "reset_token_here",
  "newPassword": "newSecurePassword123!"
}
```

## 🛡️ Input Validation in Sanitization

### **Validation Middleware**

```javascript
const { body, validationResult } = require('express-validator');

const validateUserInput = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('firstName').trim().isLength({ min: 1, max: 50 }).escape(),
  body('lastName').trim().isLength({ min: 1, max: 50 }).escape(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];
```

### **SQL Injection Zaščita**

```javascript
// Uporaba parameteriziranih poizvedb
const getUserById = async (userId) => {
  // ✅ Varno
  const query = 'SELECT * FROM users WHERE id = ?';
  return await db.query(query, [userId]);
  
  // ❌ Nevarno
  // const query = `SELECT * FROM users WHERE id = ${userId}`;
};
```

### **XSS Zaščita**

```javascript
const helmet = require('helmet');
const xss = require('xss');

// Helmet middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// XSS sanitization
const sanitizeInput = (input) => {
  return xss(input, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });
};
```

## 🚦 Rate Limiting

### **API Rate Limiting**

```javascript
const rateLimit = require('express-rate-limit');

// Splošni rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 100, // 100 zahtev na IP
  message: {
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strožji limiter za avtentifikacijo
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 poskusov prijave
  skipSuccessfulRequests: true
});
```

### **Advanced Rate Limiting**

```javascript
const { RateLimiterRedis } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 100, // Število zahtev
  duration: 900, // Na 15 minut
  blockDuration: 900, // Blokiranje za 15 minut
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000)
    });
  }
};
```

## 🔐 Enkriptacija Podatkov

### **Data at Rest**

```javascript
const crypto = require('crypto');

// AES-256-GCM enkriptacija
const encrypt = (text, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

// Dekriptacija
const decrypt = (encryptedData, key) => {
  const decipher = crypto.createDecipher('aes-256-gcm', key, 
    Buffer.from(encryptedData.iv, 'hex'));
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

### **Data in Transit**

```javascript
// HTTPS konfiguracija
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem'),
  // Dodatne varnostne nastavitve
  secureProtocol: 'TLSv1_2_method',
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384'
  ].join(':'),
  honorCipherOrder: true
};

https.createServer(options, app).listen(443);
```

## 🔍 Audit Logging

### **Security Event Logging**

```javascript
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Beleženje varnostnih dogodkov
const logSecurityEvent = (event, userId, ip, details) => {
  securityLogger.info({
    event,
    userId,
    ip,
    details,
    timestamp: new Date().toISOString(),
    severity: getSeverityLevel(event)
  });
};

// Primeri uporabe
logSecurityEvent('LOGIN_SUCCESS', userId, req.ip, { userAgent: req.get('User-Agent') });
logSecurityEvent('LOGIN_FAILED', null, req.ip, { email: req.body.email, reason: 'invalid_password' });
logSecurityEvent('LICENSE_ACTIVATED', userId, req.ip, { licenseKey: 'OMNI-****' });
```

### **Suspicious Activity Detection**

```javascript
const detectSuspiciousActivity = async (userId, action, ip) => {
  const recentActions = await getRecentActions(userId, '1h');
  
  // Preveri nenavadne vzorce
  const suspiciousPatterns = [
    { pattern: 'multiple_failed_logins', threshold: 5 },
    { pattern: 'rapid_api_calls', threshold: 100 },
    { pattern: 'unusual_ip_location', threshold: 1 },
    { pattern: 'license_manipulation', threshold: 3 }
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (checkPattern(recentActions, pattern)) {
      await triggerSecurityAlert(userId, pattern.pattern, ip);
    }
  }
};
```

## 🛡️ Licenčna Varnost

### **Hardware Fingerprinting**

```javascript
const generateHardwareFingerprint = () => {
  const os = require('os');
  const crypto = require('crypto');
  
  const components = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0].model,
    os.totalmem().toString(),
    process.env.USERNAME || process.env.USER || 'unknown'
  ];
  
  const fingerprint = crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
    
  return fingerprint.substring(0, 16);
};
```

### **License Key Validation**

```javascript
const validateLicenseKey = (licenseKey) => {
  // Format: OMNI-TYPE-YEAR-XXXX-XXXX-XXXX
  const pattern = /^OMNI-(BASIC|PRO|ENTERPRISE)-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  
  if (!pattern.test(licenseKey)) {
    return { valid: false, reason: 'invalid_format' };
  }
  
  // Preveri checksum
  const checksum = calculateLicenseChecksum(licenseKey);
  if (!verifyChecksum(licenseKey, checksum)) {
    return { valid: false, reason: 'invalid_checksum' };
  }
  
  return { valid: true };
};

const calculateLicenseChecksum = (licenseKey) => {
  const crypto = require('crypto');
  return crypto
    .createHash('md5')
    .update(licenseKey + process.env.LICENSE_SALT)
    .digest('hex')
    .substring(0, 4)
    .toUpperCase();
};
```

## 🔒 Session Management

### **Secure Session Configuration**

```javascript
const session = require('express-session');
const MongoStore = require('connect-mongo');

app.use(session({
  secret: process.env.SESSION_SECRET,
  name: 'omni.sid',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // Lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true, // Prepreči XSS
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dni
    sameSite: 'strict' // CSRF zaščita
  }
}));
```

### **Session Invalidation**

```javascript
const invalidateUserSessions = async (userId) => {
  // Invalidate all JWT tokens
  await addToBlacklist(userId);
  
  // Invalidate database sessions
  await Session.deleteMany({ userId });
  
  // Invalidate Redis sessions
  const sessionKeys = await redisClient.keys(`sess:${userId}:*`);
  if (sessionKeys.length > 0) {
    await redisClient.del(sessionKeys);
  }
};
```

## 🚨 Incident Response

### **Security Incident Detection**

```javascript
const securityIncidents = {
  BRUTE_FORCE: {
    threshold: 10,
    timeWindow: '5m',
    action: 'block_ip'
  },
  SUSPICIOUS_LICENSE: {
    threshold: 3,
    timeWindow: '1h',
    action: 'suspend_account'
  },
  DATA_BREACH_ATTEMPT: {
    threshold: 1,
    timeWindow: '1m',
    action: 'immediate_alert'
  }
};

const handleSecurityIncident = async (incidentType, details) => {
  const incident = securityIncidents[incidentType];
  
  // Log incident
  securityLogger.error({
    type: 'SECURITY_INCIDENT',
    incidentType,
    details,
    timestamp: new Date().toISOString()
  });
  
  // Execute response action
  switch (incident.action) {
    case 'block_ip':
      await blockIP(details.ip, '24h');
      break;
    case 'suspend_account':
      await suspendAccount(details.userId);
      break;
    case 'immediate_alert':
      await sendSecurityAlert(incidentType, details);
      break;
  }
};
```

### **Automated Response System**

```javascript
const automatedSecurityResponse = {
  // Avtomatsko blokiranje IP naslovov
  blockSuspiciousIPs: async () => {
    const suspiciousIPs = await identifySuspiciousIPs();
    for (const ip of suspiciousIPs) {
      await blockIP(ip, '1h');
      logSecurityEvent('IP_BLOCKED', null, ip, { reason: 'suspicious_activity' });
    }
  },
  
  // Avtomatska deaktivacija kompromitiranih računov
  deactivateCompromisedAccounts: async () => {
    const compromisedAccounts = await identifyCompromisedAccounts();
    for (const account of compromisedAccounts) {
      await deactivateAccount(account.userId);
      await sendSecurityNotification(account.userId, 'ACCOUNT_COMPROMISED');
    }
  }
};
```

## 📋 Security Checklist

### **Deployment Security**

- [ ] **HTTPS** je omogočen za vse povezave
- [ ] **SSL/TLS** certifikati so veljavni in posodobljeni
- [ ] **Firewall** je pravilno konfiguriran
- [ ] **Database** dostop je omejen na potrebne IP naslove
- [ ] **Environment variables** so varno shranjene
- [ ] **Secrets** niso v kodi ali Git repozitoriju
- [ ] **Backup** podatki so enkriptirani
- [ ] **Monitoring** in alerting sta aktivna

### **Application Security**

- [ ] **Input validation** je implementirana za vse endpoints
- [ ] **Output encoding** preprečuje XSS napade
- [ ] **SQL injection** zaščita je aktivna
- [ ] **CSRF** tokeni so implementirani
- [ ] **Rate limiting** je konfiguriran
- [ ] **Authentication** zahteva močna gesla
- [ ] **Authorization** preverja pravice za vsak dostop
- [ ] **Session management** je varen

### **Infrastructure Security**

- [ ] **Operating system** je posodobljen
- [ ] **Dependencies** so redno posodobljene
- [ ] **Security patches** so nameščeni
- [ ] **Access logs** so omogočeni
- [ ] **Intrusion detection** je aktiven
- [ ] **Backup strategy** je implementirana
- [ ] **Disaster recovery** plan obstaja

## 🔧 Security Tools

### **Vulnerability Scanning**

```bash
# npm audit za Node.js odvisnosti
npm audit
npm audit fix

# OWASP Dependency Check
dependency-check --project "Omni System" --scan ./

# Snyk security scanning
snyk test
snyk monitor
```

### **Code Security Analysis**

```bash
# ESLint security plugin
npm install --save-dev eslint-plugin-security
# .eslintrc.js
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"]
}

# SonarQube analysis
sonar-scanner \
  -Dsonar.projectKey=omni-system \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000
```

## 📞 Security Contact

V primeru varnostnih incidentov ali ranljivosti:

- **Email**: security@omni-system.com
- **PGP Key**: [Public Key](https://omni-system.com/security/pgp-key.asc)
- **Response Time**: 24 ur za kritične, 72 ur za ostale

### **Responsible Disclosure**

Spoštujemo odgovorno razkrivanje varnostnih ranljivosti:

1. **Prijavite** ranljivost na security@omni-system.com
2. **Počakajte** na potrditev (24-48 ur)
3. **Sodelujte** pri reševanju problema
4. **Počakajte** na javno objavo popravka
5. **Prejmite** priznanje za odkritje

---

**Varnost je naša prioriteta. Hvala za pomoč pri ohranjanju varnosti Omni sistema.**