/**
 * OMNI Security System - Varnostni sistem
 * Avtentikacija, enkripcija, varnostne kopije, anti-abuse
 */

class OmniSecuritySystem {
    constructor() {
        this.currentSession = null;
        this.encryptionKey = null;
        this.securityConfig = {
            maxLoginAttempts: 5,
            lockoutDuration: 15, // minut
            sessionTimeout: 60, // minut
            passwordMinLength: 8,
            requireSpecialChars: true,
            enableTwoFactor: false
        };
        
        this.loginAttempts = new Map();
        this.blockedIPs = new Set();
        this.activeSessions = new Map();
        this.auditLog = [];
        
        console.log('🔒 OMNI Security System inicializiran');
        this.initializeSecurity();
    }

    initializeSecurity() {
        // Generiraj enkripcijski ključ če ne obstaja
        this.encryptionKey = this.getOrCreateEncryptionKey();
        
        // Naloži obstoječo sejo
        this.loadSessionFromStorage();
        
        // Nastavi varnostne event listener-je
        this.setupSecurityListeners();
        
        // Začni monitoring
        this.startSecurityMonitoring();
    }

    getOrCreateEncryptionKey() {
        let key = localStorage.getItem('omni_encryption_key');
        if (!key) {
            key = this.generateEncryptionKey();
            localStorage.setItem('omni_encryption_key', key);
        }
        return key;
    }

    generateEncryptionKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    loadSessionFromStorage() {
        try {
            const sessionData = localStorage.getItem('omni_session');
            if (sessionData) {
                const decrypted = this.decrypt(sessionData);
                const session = JSON.parse(decrypted);
                
                // Preveri veljavnost seje
                if (this.isSessionValid(session)) {
                    this.currentSession = session;
                    this.logSecurityEvent('session_restored', { userId: session.userId });
                } else {
                    this.clearSession();
                }
            }
        } catch (error) {
            console.warn('⚠️ Napaka pri nalaganju seje:', error);
            this.clearSession();
        }
    }

    isSessionValid(session) {
        if (!session || !session.expiresAt) return false;
        
        const now = new Date();
        const expiryDate = new Date(session.expiresAt);
        
        return now < expiryDate;
    }

    async register(userData) {
        try {
            // Validacija podatkov
            const validation = this.validateUserData(userData);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Preveri če uporabnik že obstaja
            const existingUser = this.getUserByEmail(userData.email);
            if (existingUser) {
                throw new Error('Uporabnik s tem e-poštnim naslovom že obstaja');
            }

            // Ustvari novega uporabnika
            const user = {
                id: this.generateUserId(),
                email: userData.email,
                passwordHash: await this.hashPassword(userData.password),
                name: userData.name || '',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                role: 'user',
                twoFactorEnabled: false
            };

            // Shrani uporabnika
            this.saveUser(user);
            
            this.logSecurityEvent('user_registered', { 
                userId: user.id, 
                email: user.email 
            });

            return {
                success: true,
                userId: user.id,
                message: 'Registracija uspešna'
            };

        } catch (error) {
            this.logSecurityEvent('registration_failed', { 
                email: userData.email, 
                error: error.message 
            });
            throw error;
        }
    }

    async login(email, password, rememberMe = false) {
        try {
            // Preveri blokado IP-ja
            const clientIP = this.getClientIP();
            if (this.isIPBlocked(clientIP)) {
                throw new Error('IP naslov je začasno blokiran zaradi sumljivih aktivnosti');
            }

            // Preveri število poskusov prijave
            if (this.isLoginBlocked(email)) {
                throw new Error('Preveč neuspešnih poskusov prijave. Poskusite znova čez 15 minut.');
            }

            // Najdi uporabnika
            const user = this.getUserByEmail(email);
            if (!user) {
                this.recordFailedLogin(email, clientIP);
                throw new Error('Napačen e-poštni naslov ali geslo');
            }

            // Preveri geslo
            const passwordValid = await this.verifyPassword(password, user.passwordHash);
            if (!passwordValid) {
                this.recordFailedLogin(email, clientIP);
                throw new Error('Napačen e-poštni naslov ali geslo');
            }

            // Preveri če je uporabnik aktiven
            if (!user.isActive) {
                throw new Error('Uporabniški račun je deaktiviran');
            }

            // Ustvari sejo
            const session = this.createSession(user, rememberMe);
            this.currentSession = session;
            this.saveSessionToStorage();

            // Posodobi zadnjo prijavo
            user.lastLogin = new Date().toISOString();
            this.saveUser(user);

            // Počisti neuspešne poskuse
            this.clearFailedLogins(email);

            this.logSecurityEvent('user_login', { 
                userId: user.id, 
                email: user.email,
                ip: clientIP
            });

            return {
                success: true,
                user: this.sanitizeUser(user),
                session: session,
                message: 'Prijava uspešna'
            };

        } catch (error) {
            this.logSecurityEvent('login_failed', { 
                email: email, 
                error: error.message,
                ip: this.getClientIP()
            });
            throw error;
        }
    }

    logout() {
        if (this.currentSession) {
            this.logSecurityEvent('user_logout', { 
                userId: this.currentSession.userId 
            });
            
            this.clearSession();
        }
    }

    createSession(user, rememberMe = false) {
        const now = new Date();
        const expiryTime = rememberMe ? 
            30 * 24 * 60 * 60 * 1000 : // 30 dni
            this.securityConfig.sessionTimeout * 60 * 1000; // Konfigurirani timeout

        const session = {
            id: this.generateSessionId(),
            userId: user.id,
            email: user.email,
            role: user.role,
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + expiryTime).toISOString(),
            ip: this.getClientIP(),
            userAgent: navigator.userAgent
        };

        this.activeSessions.set(session.id, session);
        return session;
    }

    clearSession() {
        if (this.currentSession) {
            this.activeSessions.delete(this.currentSession.id);
            this.currentSession = null;
        }
        localStorage.removeItem('omni_session');
    }

    saveSessionToStorage() {
        if (this.currentSession) {
            const encrypted = this.encrypt(JSON.stringify(this.currentSession));
            localStorage.setItem('omni_session', encrypted);
        }
    }

    validateUserData(userData) {
        if (!userData.email || !this.isValidEmail(userData.email)) {
            return { valid: false, error: 'Neveljaven e-poštni naslov' };
        }

        if (!userData.password || userData.password.length < this.securityConfig.passwordMinLength) {
            return { valid: false, error: `Geslo mora imeti vsaj ${this.securityConfig.passwordMinLength} znakov` };
        }

        if (this.securityConfig.requireSpecialChars && !this.hasSpecialChars(userData.password)) {
            return { valid: false, error: 'Geslo mora vsebovati vsaj eno posebno črko' };
        }

        return { valid: true };
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    hasSpecialChars(password) {
        const specialChars = /[!@#$%^&*(),.?":{}|<>]/;
        return specialChars.test(password);
    }

    async hashPassword(password) {
        // Simulacija hash-iranja gesla (v produkciji uporabi bcrypt ali podobno)
        const encoder = new TextEncoder();
        const data = encoder.encode(password + this.encryptionKey);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async verifyPassword(password, hash) {
        const passwordHash = await this.hashPassword(password);
        return passwordHash === hash;
    }

    encrypt(text) {
        // Preprosta enkripcija (v produkciji uporabi AES)
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length));
        }
        return btoa(result);
    }

    decrypt(encryptedText) {
        const text = atob(encryptedText);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length));
        }
        return result;
    }

    recordFailedLogin(email, ip) {
        const key = `${email}:${ip}`;
        const attempts = this.loginAttempts.get(key) || { count: 0, lastAttempt: null };
        
        attempts.count++;
        attempts.lastAttempt = new Date().toISOString();
        
        this.loginAttempts.set(key, attempts);

        // Blokira IP po preveč poskusih
        if (attempts.count >= this.securityConfig.maxLoginAttempts) {
            this.blockIP(ip);
        }
    }

    isLoginBlocked(email) {
        const ip = this.getClientIP();
        const key = `${email}:${ip}`;
        const attempts = this.loginAttempts.get(key);
        
        if (!attempts) return false;
        
        const now = new Date();
        const lastAttempt = new Date(attempts.lastAttempt);
        const timeDiff = (now - lastAttempt) / (1000 * 60); // v minutah
        
        return attempts.count >= this.securityConfig.maxLoginAttempts && 
               timeDiff < this.securityConfig.lockoutDuration;
    }

    clearFailedLogins(email) {
        const ip = this.getClientIP();
        const key = `${email}:${ip}`;
        this.loginAttempts.delete(key);
    }

    blockIP(ip) {
        this.blockedIPs.add(ip);
        
        // Avtomatsko odblokira po 1 uri
        setTimeout(() => {
            this.blockedIPs.delete(ip);
        }, 60 * 60 * 1000);
        
        this.logSecurityEvent('ip_blocked', { ip: ip });
    }

    isIPBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    getClientIP() {
        // V produkciji bi to dobil pravi IP
        return '127.0.0.1';
    }

    getUserByEmail(email) {
        try {
            const users = this.getAllUsers();
            return users.find(user => user.email === email);
        } catch (error) {
            return null;
        }
    }

    saveUser(user) {
        try {
            const users = this.getAllUsers();
            const existingIndex = users.findIndex(u => u.id === user.id);
            
            if (existingIndex >= 0) {
                users[existingIndex] = user;
            } else {
                users.push(user);
            }
            
            const encrypted = this.encrypt(JSON.stringify(users));
            localStorage.setItem('omni_users', encrypted);
        } catch (error) {
            console.error('Napaka pri shranjevanju uporabnika:', error);
        }
    }

    getAllUsers() {
        try {
            const encrypted = localStorage.getItem('omni_users');
            if (!encrypted) return [];
            
            const decrypted = this.decrypt(encrypted);
            return JSON.parse(decrypted);
        } catch (error) {
            return [];
        }
    }

    sanitizeUser(user) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    logSecurityEvent(event, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            data: data,
            ip: this.getClientIP(),
            userAgent: navigator.userAgent
        };
        
        this.auditLog.push(logEntry);
        
        // Obdrži samo zadnjih 1000 vnosov
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }
        
        console.log('🔒 Security Event:', event, data);
    }

    setupSecurityListeners() {
        // Preverjanje seje ob aktivnosti
        document.addEventListener('click', () => this.checkSessionValidity());
        document.addEventListener('keypress', () => this.checkSessionValidity());
        
        // Opozorilo pred zaprtjem strani če je uporabnik prijavljen
        window.addEventListener('beforeunload', (e) => {
            if (this.currentSession) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    checkSessionValidity() {
        if (this.currentSession && !this.isSessionValid(this.currentSession)) {
            this.logSecurityEvent('session_expired', { 
                userId: this.currentSession.userId 
            });
            this.clearSession();
            
            // Preusmeri na prijavo
            if (typeof omniSystem !== 'undefined') {
                omniSystem.showLoginRequired();
            }
        }
    }

    startSecurityMonitoring() {
        // Preverjanje varnosti vsakih 5 minut
        setInterval(() => {
            this.performSecurityCheck();
        }, 5 * 60 * 1000);
    }

    performSecurityCheck() {
        // Počisti stare poskuse prijave
        const now = new Date();
        for (const [key, attempts] of this.loginAttempts.entries()) {
            const lastAttempt = new Date(attempts.lastAttempt);
            const timeDiff = (now - lastAttempt) / (1000 * 60);
            
            if (timeDiff > this.securityConfig.lockoutDuration) {
                this.loginAttempts.delete(key);
            }
        }
        
        // Preveri aktivne seje
        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (!this.isSessionValid(session)) {
                this.activeSessions.delete(sessionId);
            }
        }
    }

    // Javni API
    getCurrentSession() {
        return this.currentSession;
    }

    isAuthenticated() {
        return this.currentSession !== null && this.isSessionValid(this.currentSession);
    }

    hasRole(role) {
        return this.currentSession && this.currentSession.role === role;
    }

    getSecurityStatus() {
        return {
            authenticated: this.isAuthenticated(),
            user: this.currentSession ? this.sanitizeUser({ 
                id: this.currentSession.userId,
                email: this.currentSession.email,
                role: this.currentSession.role
            }) : null,
            sessionExpiresAt: this.currentSession?.expiresAt,
            securityLevel: this.calculateSecurityLevel()
        };
    }

    calculateSecurityLevel() {
        let level = 1;
        
        if (this.isAuthenticated()) level++;
        if (this.securityConfig.enableTwoFactor) level++;
        if (this.encryptionKey) level++;
        
        return Math.min(level, 5);
    }

    getAuditLog(limit = 50) {
        return this.auditLog.slice(-limit);
    }

    // Metode za testiranje
    createTestUser() {
        return this.register({
            email: 'test@omni.si',
            password: 'TestGeslo123!',
            name: 'Test Uporabnik'
        });
    }

    simulateSecurityThreat() {
        const fakeIP = '192.168.1.100';
        for (let i = 0; i < 6; i++) {
            this.recordFailedLogin('fake@email.com', fakeIP);
        }
    }
}

// Globalna instanca varnostnega sistema
window.omniSecurity = new OmniSecuritySystem();

console.log('🔒 OMNI Security System naložen');