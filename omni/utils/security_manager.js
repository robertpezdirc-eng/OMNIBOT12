const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs').promises;
const path = require('path');

/**
 * Professional Security Manager
 * Provides comprehensive security features for the OMNI platform
 */
class SecurityManager {
    constructor(options = {}) {
        this.config = {
            jwtSecret: options.jwtSecret || this.generateSecretKey(),
            jwtExpiresIn: options.jwtExpiresIn || '24h',
            bcryptRounds: options.bcryptRounds || 12,
            rateLimitWindow: options.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
            rateLimitMax: options.rateLimitMax || 100,
            encryptionAlgorithm: options.encryptionAlgorithm || 'aes-256-gcm',
            sessionTimeout: options.sessionTimeout || 30 * 60 * 1000, // 30 minutes
            maxLoginAttempts: options.maxLoginAttempts || 5,
            lockoutDuration: options.lockoutDuration || 15 * 60 * 1000, // 15 minutes
            passwordMinLength: options.passwordMinLength || 8,
            requirePasswordComplexity: options.requirePasswordComplexity !== false,
            enableTwoFactor: options.enableTwoFactor || false,
            auditLogging: options.auditLogging !== false,
            ...options
        };
        
        this.sessions = new Map();
        this.loginAttempts = new Map();
        this.auditLog = [];
        this.encryptionKey = this.generateEncryptionKey();
        this.isInitialized = false;
    }

    async initialize() {
        console.log('🔒 Initializing Security Manager...');
        
        try {
            // Ensure security directories exist
            await this.ensureSecurityDirectories();
            
            // Load or generate security keys
            await this.initializeSecurityKeys();
            
            // Start session cleanup
            this.startSessionCleanup();
            
            this.isInitialized = true;
            console.log('✅ Security Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Security Manager:', error);
            throw error;
        }
    }

    async ensureSecurityDirectories() {
        const securityDir = path.join(process.cwd(), 'omni', 'security');
        const logsDir = path.join(securityDir, 'logs');
        
        try {
            await fs.access(securityDir);
        } catch {
            await fs.mkdir(securityDir, { recursive: true });
        }
        
        try {
            await fs.access(logsDir);
        } catch {
            await fs.mkdir(logsDir, { recursive: true });
        }
    }

    async initializeSecurityKeys() {
        const keyPath = path.join(process.cwd(), 'omni', 'security', 'keys.json');
        
        try {
            const keyData = await fs.readFile(keyPath, 'utf8');
            const keys = JSON.parse(keyData);
            this.config.jwtSecret = keys.jwtSecret;
            this.encryptionKey = Buffer.from(keys.encryptionKey, 'hex');
            console.log('🔑 Security keys loaded from file');
        } catch {
            // Generate new keys
            const keys = {
                jwtSecret: this.config.jwtSecret,
                encryptionKey: this.encryptionKey.toString('hex'),
                createdAt: new Date().toISOString()
            };
            
            await fs.writeFile(keyPath, JSON.stringify(keys, null, 2));
            console.log('🔑 New security keys generated and saved');
        }
    }

    generateSecretKey() {
        return crypto.randomBytes(64).toString('hex');
    }

    generateEncryptionKey() {
        return crypto.randomBytes(32);
    }

    // Authentication Methods
    async hashPassword(password) {
        if (!this.isValidPassword(password)) {
            throw new Error('Password does not meet security requirements');
        }
        
        return await bcrypt.hash(password, this.config.bcryptRounds);
    }

    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    isValidPassword(password) {
        if (password.length < this.config.passwordMinLength) {
            return false;
        }
        
        if (this.config.requirePasswordComplexity) {
            // Check for at least one uppercase, lowercase, number, and special character
            const hasUpper = /[A-Z]/.test(password);
            const hasLower = /[a-z]/.test(password);
            const hasNumber = /\d/.test(password);
            const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
            
            return hasUpper && hasLower && hasNumber && hasSpecial;
        }
        
        return true;
    }

    generateToken(payload, expiresIn = null) {
        return jwt.sign(payload, this.config.jwtSecret, {
            expiresIn: expiresIn || this.config.jwtExpiresIn
        });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.config.jwtSecret);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    // Session Management
    createSession(userId, metadata = {}) {
        const sessionId = crypto.randomUUID();
        const session = {
            id: sessionId,
            userId,
            createdAt: new Date(),
            lastActivity: new Date(),
            metadata,
            isActive: true
        };
        
        this.sessions.set(sessionId, session);
        this.auditLog.push({
            action: 'session_created',
            userId,
            sessionId,
            timestamp: new Date().toISOString(),
            metadata
        });
        
        return sessionId;
    }

    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.isActive) {
            return null;
        }
        
        // Check if session has expired
        const now = new Date();
        const lastActivity = new Date(session.lastActivity);
        if (now - lastActivity > this.config.sessionTimeout) {
            this.destroySession(sessionId);
            return null;
        }
        
        // Update last activity
        session.lastActivity = now;
        return session;
    }

    destroySession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.isActive = false;
            this.sessions.delete(sessionId);
            
            this.auditLog.push({
                action: 'session_destroyed',
                userId: session.userId,
                sessionId,
                timestamp: new Date().toISOString()
            });
        }
    }

    startSessionCleanup() {
        setInterval(() => {
            const now = new Date();
            for (const [sessionId, session] of this.sessions.entries()) {
                const lastActivity = new Date(session.lastActivity);
                if (now - lastActivity > this.config.sessionTimeout) {
                    this.destroySession(sessionId);
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }

    // Rate Limiting and Brute Force Protection
    checkLoginAttempts(identifier) {
        const attempts = this.loginAttempts.get(identifier);
        if (!attempts) {
            return { allowed: true, remaining: this.config.maxLoginAttempts };
        }
        
        // Check if lockout period has expired
        if (attempts.lockedUntil && new Date() > attempts.lockedUntil) {
            this.loginAttempts.delete(identifier);
            return { allowed: true, remaining: this.config.maxLoginAttempts };
        }
        
        if (attempts.count >= this.config.maxLoginAttempts) {
            return {
                allowed: false,
                remaining: 0,
                lockedUntil: attempts.lockedUntil
            };
        }
        
        return {
            allowed: true,
            remaining: this.config.maxLoginAttempts - attempts.count
        };
    }

    recordLoginAttempt(identifier, success = false) {
        if (success) {
            this.loginAttempts.delete(identifier);
            return;
        }
        
        const attempts = this.loginAttempts.get(identifier) || { count: 0 };
        attempts.count++;
        attempts.lastAttempt = new Date();
        
        if (attempts.count >= this.config.maxLoginAttempts) {
            attempts.lockedUntil = new Date(Date.now() + this.config.lockoutDuration);
        }
        
        this.loginAttempts.set(identifier, attempts);
        
        this.auditLog.push({
            action: 'login_attempt',
            identifier,
            success,
            timestamp: new Date().toISOString(),
            attemptsCount: attempts.count
        });
    }

    getRateLimitMiddleware() {
        return rateLimit({
            windowMs: this.config.rateLimitWindow,
            max: this.config.rateLimitMax,
            message: {
                error: 'Too many requests from this IP',
                retryAfter: Math.round(this.config.rateLimitWindow / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false
        });
    }

    getSecurityHeadersMiddleware() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        });
    }

    // Encryption/Decryption
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(this.config.encryptionAlgorithm, this.encryptionKey);
        cipher.setAAD(Buffer.from('omni-platform'));
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    decrypt(encryptedData) {
        const decipher = crypto.createDecipher(this.config.encryptionAlgorithm, this.encryptionKey);
        decipher.setAAD(Buffer.from('omni-platform'));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    // Authentication Middleware
    getAuthMiddleware() {
        return (req, res, next) => {
            const token = this.extractToken(req);
            
            if (!token) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            
            try {
                const decoded = this.verifyToken(token);
                req.user = decoded;
                
                // Check session if sessionId is provided
                if (decoded.sessionId) {
                    const session = this.getSession(decoded.sessionId);
                    if (!session) {
                        return res.status(401).json({ error: 'Invalid session' });
                    }
                    req.session = session;
                }
                
                next();
            } catch (error) {
                return res.status(401).json({ error: 'Invalid token' });
            }
        };
    }

    extractToken(req) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        
        // Check for token in cookies
        if (req.cookies && req.cookies.token) {
            return req.cookies.token;
        }
        
        return null;
    }

    // Audit Logging
    logSecurityEvent(action, details = {}) {
        const logEntry = {
            action,
            timestamp: new Date().toISOString(),
            details,
            ip: details.ip || 'unknown',
            userAgent: details.userAgent || 'unknown'
        };
        
        this.auditLog.push(logEntry);
        
        // Keep only recent audit logs in memory
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-10000);
        }
        
        // Write to file (async)
        this.writeAuditLogToFile(logEntry).catch(error => {
            console.error('Failed to write audit log:', error);
        });
    }

    async writeAuditLogToFile(logEntry) {
        const logDir = path.join(process.cwd(), 'omni', 'security', 'logs');
        const logFile = path.join(logDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
        const logLine = JSON.stringify(logEntry) + '\n';
        
        await fs.appendFile(logFile, logLine);
    }

    // Input Validation and Sanitization
    sanitizeInput(input, type = 'string') {
        if (typeof input !== 'string') {
            input = String(input);
        }
        
        switch (type) {
            case 'email':
                return input.toLowerCase().trim();
            case 'username':
                return input.toLowerCase().replace(/[^a-z0-9_-]/g, '');
            case 'filename':
                return input.replace(/[^a-zA-Z0-9._-]/g, '');
            case 'html':
                return input
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            default:
                return input.trim();
        }
    }

    validateInput(input, rules) {
        const errors = [];
        
        if (rules.required && (!input || input.trim() === '')) {
            errors.push('Field is required');
        }
        
        if (rules.minLength && input.length < rules.minLength) {
            errors.push(`Minimum length is ${rules.minLength}`);
        }
        
        if (rules.maxLength && input.length > rules.maxLength) {
            errors.push(`Maximum length is ${rules.maxLength}`);
        }
        
        if (rules.pattern && !rules.pattern.test(input)) {
            errors.push('Invalid format');
        }
        
        if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
            errors.push('Invalid email format');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Security Monitoring
    getSecurityStats() {
        const now = new Date();
        const last24h = new Date(now - 24 * 60 * 60 * 1000);
        
        const recentAuditLogs = this.auditLog.filter(log => 
            new Date(log.timestamp) > last24h
        );
        
        const loginAttempts = recentAuditLogs.filter(log => 
            log.action === 'login_attempt'
        );
        
        const failedLogins = loginAttempts.filter(log => 
            !log.success
        );
        
        return {
            activeSessions: this.sessions.size,
            totalAuditLogs: this.auditLog.length,
            recentAuditLogs: recentAuditLogs.length,
            loginAttempts: loginAttempts.length,
            failedLogins: failedLogins.length,
            lockedAccounts: Array.from(this.loginAttempts.values()).filter(attempt => 
                attempt.lockedUntil && new Date() < attempt.lockedUntil
            ).length,
            isInitialized: this.isInitialized,
            config: {
                jwtExpiresIn: this.config.jwtExpiresIn,
                sessionTimeout: this.config.sessionTimeout,
                maxLoginAttempts: this.config.maxLoginAttempts,
                rateLimitMax: this.config.rateLimitMax
            }
        };
    }

    getAuditLogs(limit = 100, action = null) {
        let logs = this.auditLog;
        
        if (action) {
            logs = logs.filter(log => log.action === action);
        }
        
        return logs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    // Two-Factor Authentication (placeholder for future implementation)
    generateTwoFactorSecret() {
        return crypto.randomBytes(20).toString('hex');
    }

    verifyTwoFactorToken(secret, token) {
        // This would integrate with a TOTP library like speakeasy
        // For now, return a placeholder
        return token === '123456'; // Demo purposes only
    }

    async shutdown() {
        console.log('🔒 Shutting down Security Manager...');
        
        // Clear sensitive data
        this.sessions.clear();
        this.loginAttempts.clear();
        
        console.log('✅ Security Manager shutdown complete');
    }
}

module.exports = { SecurityManager };