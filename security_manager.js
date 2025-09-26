/**
 * OMNI Professional Security Manager
 * Napreden varnostni sistem z avtentikacijo, šifriranjem in audit logom
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');
const rateLimit = require('express-rate-limit');

class SecurityManager {
    constructor() {
        this.secretKey = process.env.JWT_SECRET || this.generateSecretKey();
        this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
        this.auditLogPath = path.join(__dirname, 'data', 'security', 'audit.log');
        this.usersPath = path.join(__dirname, 'data', 'security', 'users.json');
        this.sessionsPath = path.join(__dirname, 'data', 'security', 'sessions.json');
        
        this.users = new Map();
        this.sessions = new Map();
        this.failedAttempts = new Map();
        
        this.initializeSecurity();
    }

    async initializeSecurity() {
        try {
            console.log('🔐 Inicializiram varnostni sistem...');
            
            // Ustvari varnostne direktorije
            await this.ensureDirectory(path.dirname(this.auditLogPath));
            
            // Naloži uporabnike in seje
            await this.loadUsers();
            await this.loadSessions();
            
            // Ustvari privzeti admin račun
            await this.createDefaultAdmin();
            
            // Nastavi čiščenje sej
            this.scheduleSessionCleanup();
            
            console.log('✅ Varnostni sistem pripravljen');
            
            await this.auditLog('SYSTEM', 'STARTUP', 'Varnostni sistem inicializiran');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji varnosti:', error);
        }
    }

    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    generateSecretKey() {
        return crypto.randomBytes(64).toString('hex');
    }

    generateEncryptionKey() {
        return crypto.randomBytes(32);
    }

    /**
     * Registracija novega uporabnika
     */
    async registerUser(username, password, email, role = 'user') {
        try {
            // Preveri, če uporabnik že obstaja
            if (this.users.has(username)) {
                throw new Error('Uporabnik že obstaja');
            }

            // Validiraj geslo
            if (!this.validatePassword(password)) {
                throw new Error('Geslo ne izpolnjuje varnostnih zahtev');
            }

            // Hashiraj geslo
            const hashedPassword = await bcrypt.hash(password, 12);

            const user = {
                id: crypto.randomUUID(),
                username,
                email,
                password: hashedPassword,
                role,
                created: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                loginAttempts: 0,
                lockedUntil: null
            };

            this.users.set(username, user);
            await this.saveUsers();

            await this.auditLog(username, 'USER_REGISTER', `Uporabnik registriran z vlogo: ${role}`);

            console.log(`👤 Nov uporabnik registriran: ${username} (${role})`);

            return {
                success: true,
                userId: user.id,
                message: 'Uporabnik uspešno registriran'
            };

        } catch (error) {
            await this.auditLog(username || 'UNKNOWN', 'USER_REGISTER_FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Prijava uporabnika
     */
    async loginUser(username, password, ipAddress = 'unknown') {
        try {
            const user = this.users.get(username);
            
            if (!user) {
                await this.recordFailedAttempt(username, ipAddress);
                throw new Error('Napačno uporabniško ime ali geslo');
            }

            // Preveri, če je račun zaklenjen
            if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
                throw new Error('Račun je začasno zaklenjen');
            }

            // Preveri geslo
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                await this.recordFailedAttempt(username, ipAddress);
                user.loginAttempts = (user.loginAttempts || 0) + 1;
                
                // Zakleni račun po 5 neuspešnih poskusih
                if (user.loginAttempts >= 5) {
                    user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minut
                    await this.auditLog(username, 'ACCOUNT_LOCKED', `Račun zaklenjen po ${user.loginAttempts} neuspešnih poskusih`);
                }
                
                await this.saveUsers();
                throw new Error('Napačno uporabniško ime ali geslo');
            }

            // Uspešna prijava
            user.lastLogin = new Date().toISOString();
            user.loginAttempts = 0;
            user.lockedUntil = null;
            await this.saveUsers();

            // Ustvari JWT token
            const token = this.generateToken(user);
            
            // Ustvari sejo
            const sessionId = crypto.randomUUID();
            const session = {
                id: sessionId,
                userId: user.id,
                username: user.username,
                token,
                created: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                ipAddress,
                userAgent: 'OMNI-Platform',
                isActive: true
            };

            this.sessions.set(sessionId, session);
            await this.saveSessions();

            await this.auditLog(username, 'USER_LOGIN', `Uspešna prijava iz IP: ${ipAddress}`);

            console.log(`✅ Uporabnik prijavljen: ${username}`);

            return {
                success: true,
                token,
                sessionId,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            };

        } catch (error) {
            await this.auditLog(username || 'UNKNOWN', 'USER_LOGIN_FAILED', `${error.message} - IP: ${ipAddress}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Odjava uporabnika
     */
    async logoutUser(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            
            if (session) {
                session.isActive = false;
                session.loggedOut = new Date().toISOString();
                await this.saveSessions();
                
                await this.auditLog(session.username, 'USER_LOGOUT', 'Uporabnik se je odjavil');
                
                console.log(`👋 Uporabnik odjavljen: ${session.username}`);
                
                return { success: true, message: 'Uspešna odjava' };
            }
            
            return { success: false, error: 'Seja ne obstaja' };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Preveri veljavnost tokena
     */
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.secretKey);
            const user = this.users.get(decoded.username);
            
            if (!user || !user.isActive) {
                throw new Error('Uporabnik ni aktiven');
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            };

        } catch (error) {
            return { success: false, error: 'Neveljaven token' };
        }
    }

    generateToken(user) {
        return jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role
            },
            this.secretKey,
            { expiresIn: '24h' }
        );
    }

    /**
     * Middleware za avtentikacijo
     */
    authenticateMiddleware() {
        return async (req, res, next) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');
                
                if (!token) {
                    return res.status(401).json({ error: 'Token ni podan' });
                }

                const verification = await this.verifyToken(token);
                
                if (!verification.success) {
                    return res.status(401).json({ error: verification.error });
                }

                req.user = verification.user;
                next();

            } catch (error) {
                res.status(401).json({ error: 'Nepooblaščen dostop' });
            }
        };
    }

    /**
     * Middleware za avtorizacijo vlog
     */
    authorizeRoles(...roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Nepooblaščen dostop' });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Nedovolj pravic' });
            }

            next();
        };
    }

    /**
     * Rate limiting middleware
     */
    createRateLimit(windowMs = 15 * 60 * 1000, max = 100) {
        return rateLimit({
            windowMs,
            max,
            message: 'Preveč zahtev, poskusite kasneje',
            standardHeaders: true,
            legacyHeaders: false,
            handler: async (req, res) => {
                await this.auditLog(
                    req.user?.username || 'ANONYMOUS',
                    'RATE_LIMIT_EXCEEDED',
                    `IP: ${req.ip}, Path: ${req.path}`
                );
                res.status(429).json({ error: 'Preveč zahtev, poskusite kasneje' });
            }
        });
    }

    /**
     * Šifriranje podatkov
     */
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Dešifriranje podatkov
     */
    decrypt(encryptedText) {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    /**
     * Validacija gesla
     */
    validatePassword(password) {
        // Najmanj 8 znakov, vsaj ena velika črka, ena mala črka, ena številka
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
    }

    /**
     * Beleženje neuspešnih poskusov prijave
     */
    async recordFailedAttempt(username, ipAddress) {
        const key = `${username}:${ipAddress}`;
        const attempts = this.failedAttempts.get(key) || { count: 0, firstAttempt: new Date() };
        
        attempts.count++;
        attempts.lastAttempt = new Date();
        
        this.failedAttempts.set(key, attempts);
        
        await this.auditLog(username, 'LOGIN_FAILED', `Neuspešen poskus prijave iz IP: ${ipAddress} (${attempts.count}. poskus)`);
    }

    /**
     * Audit log
     */
    async auditLog(username, action, details = '') {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                username,
                action,
                details,
                ip: 'system',
                userAgent: 'OMNI-Platform'
            };

            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(this.auditLogPath, logLine);

        } catch (error) {
            console.error('❌ Napaka pri pisanju audit log-a:', error);
        }
    }

    /**
     * Preberi audit log
     */
    async getAuditLog(limit = 100) {
        try {
            const data = await fs.readFile(this.auditLogPath, 'utf8');
            const lines = data.trim().split('\n').slice(-limit);
            return lines.map(line => JSON.parse(line));
        } catch (error) {
            return [];
        }
    }

    async createDefaultAdmin() {
        if (!this.users.has('admin')) {
            await this.registerUser('admin', 'Admin123!', 'admin@omni.ai', 'admin');
            console.log('👑 Privzeti admin račun ustvarjen (admin/Admin123!)');
        }
    }

    async loadUsers() {
        try {
            const data = await fs.readFile(this.usersPath, 'utf8');
            const users = JSON.parse(data);
            this.users = new Map(Object.entries(users));
        } catch {
            this.users = new Map();
        }
    }

    async saveUsers() {
        const usersObj = Object.fromEntries(this.users);
        await fs.writeFile(this.usersPath, JSON.stringify(usersObj, null, 2));
    }

    async loadSessions() {
        try {
            const data = await fs.readFile(this.sessionsPath, 'utf8');
            const sessions = JSON.parse(data);
            this.sessions = new Map(Object.entries(sessions));
        } catch {
            this.sessions = new Map();
        }
    }

    async saveSessions() {
        const sessionsObj = Object.fromEntries(this.sessions);
        await fs.writeFile(this.sessionsPath, JSON.stringify(sessionsObj, null, 2));
    }

    /**
     * Čiščenje starih sej
     */
    scheduleSessionCleanup() {
        setInterval(async () => {
            const now = new Date();
            let cleanedCount = 0;

            for (const [sessionId, session] of this.sessions) {
                const lastActivity = new Date(session.lastActivity);
                const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

                // Izbriši seje stare več kot 24 ur
                if (hoursSinceActivity > 24) {
                    this.sessions.delete(sessionId);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                await this.saveSessions();
                console.log(`🧹 Počiščenih ${cleanedCount} starih sej`);
            }
        }, 60 * 60 * 1000); // Vsako uro
    }

    /**
     * Statistike varnosti
     */
    async getSecurityStats() {
        const auditEntries = await this.getAuditLog(1000);
        
        const stats = {
            totalUsers: this.users.size,
            activeSessions: Array.from(this.sessions.values()).filter(s => s.isActive).length,
            failedLogins: auditEntries.filter(e => e.action === 'LOGIN_FAILED').length,
            successfulLogins: auditEntries.filter(e => e.action === 'USER_LOGIN').length,
            recentActivity: auditEntries.slice(-10)
        };

        return stats;
    }
}

module.exports = SecurityManager;