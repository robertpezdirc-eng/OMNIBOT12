const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class UserManager {
    constructor() {
        this.users = new Map();
        this.sessions = new Map();
        this.roles = new Map();
        this.permissions = new Map();
        
        // Inicializacija privzetih vlog in dovoljenj
        this.initializeDefaultRoles();
        this.initializeDefaultUsers();
        
        console.log('🔐 UserManager inicializiran');
    }

    // Inicializacija privzetih vlog
    initializeDefaultRoles() {
        // Definiranje dovoljenj
        const permissions = {
            // Naprave
            'devices.view': 'Ogled naprav',
            'devices.create': 'Ustvarjanje naprav',
            'devices.edit': 'Urejanje naprav',
            'devices.delete': 'Brisanje naprav',
            'devices.control': 'Nadzor naprav',
            
            // Analitika
            'analytics.view': 'Ogled analitike',
            'analytics.export': 'Izvoz analitike',
            'analytics.reports': 'Generiranje poročil',
            
            // AI
            'ai.view': 'Ogled AI funkcij',
            'ai.configure': 'Konfiguracija AI',
            'ai.automation': 'AI avtomatizacija',
            
            // Uporabniki
            'users.view': 'Ogled uporabnikov',
            'users.create': 'Ustvarjanje uporabnikov',
            'users.edit': 'Urejanje uporabnikov',
            'users.delete': 'Brisanje uporabnikov',
            
            // Sistem
            'system.admin': 'Sistemska administracija',
            'system.logs': 'Ogled dnevnikov',
            'system.backup': 'Varnostne kopije'
        };

        // Shranjevanje dovoljenj
        for (const [key, description] of Object.entries(permissions)) {
            this.permissions.set(key, { key, description });
        }

        // Definiranje vlog
        const roles = {
            'admin': {
                name: 'Administrator',
                description: 'Popoln dostop do sistema',
                permissions: Array.from(this.permissions.keys()),
                color: '#dc3545'
            },
            'manager': {
                name: 'Upravitelj',
                description: 'Upravljanje naprav in analitike',
                permissions: [
                    'devices.view', 'devices.create', 'devices.edit', 'devices.control',
                    'analytics.view', 'analytics.export', 'analytics.reports',
                    'ai.view', 'ai.configure', 'ai.automation',
                    'users.view'
                ],
                color: '#ffc107'
            },
            'operator': {
                name: 'Operater',
                description: 'Nadzor naprav in ogled analitike',
                permissions: [
                    'devices.view', 'devices.control',
                    'analytics.view',
                    'ai.view'
                ],
                color: '#17a2b8'
            },
            'viewer': {
                name: 'Opazovalec',
                description: 'Samo ogled podatkov',
                permissions: [
                    'devices.view',
                    'analytics.view',
                    'ai.view'
                ],
                color: '#28a745'
            }
        };

        // Shranjevanje vlog
        for (const [key, role] of Object.entries(roles)) {
            this.roles.set(key, { ...role, key });
        }
    }

    // Inicializacija privzetih uporabnikov
    initializeDefaultUsers() {
        const defaultUsers = [
            {
                username: 'admin',
                email: 'admin@omni.local',
                password: 'admin123',
                role: 'admin',
                firstName: 'Sistem',
                lastName: 'Administrator'
            },
            {
                username: 'manager',
                email: 'manager@omni.local',
                password: 'manager123',
                role: 'manager',
                firstName: 'Poslovni',
                lastName: 'Upravitelj'
            },
            {
                username: 'operator',
                email: 'operator@omni.local',
                password: 'operator123',
                role: 'operator',
                firstName: 'Sistem',
                lastName: 'Operater'
            }
        ];

        defaultUsers.forEach(userData => {
            this.createUser(userData);
        });
    }

    // Ustvarjanje uporabnika
    async createUser(userData) {
        const { username, email, password, role, firstName, lastName } = userData;
        
        // Preverjanje, če uporabnik že obstaja
        if (this.getUserByUsername(username) || this.getUserByEmail(email)) {
            throw new Error('Uporabnik s tem uporabniškim imenom ali e-poštnim naslovom že obstaja');
        }

        // Preverjanje veljavnosti vloge
        if (!this.roles.has(role)) {
            throw new Error('Neveljavna vloga');
        }

        // Hashiranje gesla
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = {
            id: crypto.randomUUID(),
            username,
            email,
            password: hashedPassword,
            role,
            firstName,
            lastName,
            createdAt: new Date(),
            lastLogin: null,
            isActive: true,
            loginAttempts: 0,
            lockedUntil: null
        };

        this.users.set(user.id, user);
        console.log(`👤 Uporabnik ${username} (${role}) ustvarjen`);
        
        return this.sanitizeUser(user);
    }

    // Prijava uporabnika
    async login(username, password) {
        const user = this.getUserByUsername(username);
        
        if (!user) {
            throw new Error('Neveljavno uporabniško ime ali geslo');
        }

        // Preverjanje, če je račun zaklenjen
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new Error('Račun je začasno zaklenjen');
        }

        // Preverjanje gesla
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            // Povečanje števila neuspešnih poskusov
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            
            // Zaklepanje računa po 5 neuspešnih poskusih
            if (user.loginAttempts >= 5) {
                user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minut
                console.log(`🔒 Račun ${username} zaklenjen za 15 minut`);
            }
            
            throw new Error('Neveljavno uporabniško ime ali geslo');
        }

        // Ponastavitev neuspešnih poskusov
        user.loginAttempts = 0;
        user.lockedUntil = null;
        user.lastLogin = new Date();

        // Generiranje JWT tokena
        const token = this.generateToken(user);
        
        // Shranjevanje seje
        const sessionId = crypto.randomUUID();
        this.sessions.set(sessionId, {
            userId: user.id,
            token,
            createdAt: new Date(),
            lastActivity: new Date(),
            ipAddress: null // Bo nastavljeno v middleware
        });

        console.log(`✅ Uporabnik ${username} uspešno prijavljen`);
        
        return {
            user: this.sanitizeUser(user),
            token,
            sessionId
        };
    }

    // Odjava uporabnika
    logout(sessionId) {
        if (this.sessions.has(sessionId)) {
            this.sessions.delete(sessionId);
            console.log(`👋 Seja ${sessionId} končana`);
            return true;
        }
        return false;
    }

    // Generiranje JWT tokena
    generateToken(user) {
        const payload = {
            userId: user.id,
            username: user.username,
            role: user.role,
            permissions: this.getUserPermissions(user.role)
        };

        return jwt.sign(payload, process.env.JWT_SECRET || 'omni-secret-key', {
            expiresIn: '24h'
        });
    }

    // Preverjanje tokena
    verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET || 'omni-secret-key');
        } catch (error) {
            throw new Error('Neveljaven token');
        }
    }

    // Pridobivanje uporabnika po ID
    getUserById(userId) {
        return this.users.get(userId);
    }

    // Pridobivanje uporabnika po uporabniškem imenu
    getUserByUsername(username) {
        for (const user of this.users.values()) {
            if (user.username === username) {
                return user;
            }
        }
        return null;
    }

    // Pridobivanje uporabnika po e-pošti
    getUserByEmail(email) {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return user;
            }
        }
        return null;
    }

    // Pridobivanje dovoljenj uporabnika
    getUserPermissions(roleKey) {
        const role = this.roles.get(roleKey);
        return role ? role.permissions : [];
    }

    // Preverjanje dovoljenja
    hasPermission(userId, permission) {
        const user = this.getUserById(userId);
        if (!user) return false;
        
        const permissions = this.getUserPermissions(user.role);
        return permissions.includes(permission);
    }

    // Posodabljanje uporabnika
    async updateUser(userId, updates) {
        const user = this.getUserById(userId);
        if (!user) {
            throw new Error('Uporabnik ne obstaja');
        }

        // Hashiranje novega gesla, če je podano
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }

        // Posodabljanje podatkov
        Object.assign(user, updates);
        
        console.log(`📝 Uporabnik ${user.username} posodobljen`);
        return this.sanitizeUser(user);
    }

    // Brisanje uporabnika
    deleteUser(userId) {
        const user = this.getUserById(userId);
        if (!user) {
            throw new Error('Uporabnik ne obstaja');
        }

        // Preprečevanje brisanja zadnjega administratorja
        const adminUsers = Array.from(this.users.values()).filter(u => u.role === 'admin');
        if (user.role === 'admin' && adminUsers.length === 1) {
            throw new Error('Ne morete izbrisati zadnjega administratorja');
        }

        this.users.delete(userId);
        
        // Brisanje vseh sej uporabnika
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userId === userId) {
                this.sessions.delete(sessionId);
            }
        }

        console.log(`🗑️ Uporabnik ${user.username} izbrisan`);
        return true;
    }

    // Pridobivanje vseh uporabnikov
    getAllUsers() {
        return Array.from(this.users.values()).map(user => this.sanitizeUser(user));
    }

    // Pridobivanje vseh vlog
    getAllRoles() {
        return Array.from(this.roles.values());
    }

    // Pridobivanje vseh dovoljenj
    getAllPermissions() {
        return Array.from(this.permissions.values());
    }

    // Čiščenje podatkov uporabnika (odstranjevanje gesla)
    sanitizeUser(user) {
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    // Statistike uporabnikov
    getUserStats() {
        const users = Array.from(this.users.values());
        const roleStats = {};
        
        // Štetje uporabnikov po vlogah
        for (const role of this.roles.keys()) {
            roleStats[role] = users.filter(u => u.role === role).length;
        }

        return {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.isActive).length,
            roleDistribution: roleStats,
            activeSessions: this.sessions.size,
            recentLogins: users
                .filter(u => u.lastLogin)
                .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
                .slice(0, 10)
                .map(u => ({
                    username: u.username,
                    lastLogin: u.lastLogin,
                    role: u.role
                }))
        };
    }

    // Čiščenje starih sej
    cleanupSessions() {
        const now = new Date();
        const maxAge = 24 * 60 * 60 * 1000; // 24 ur
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > maxAge) {
                this.sessions.delete(sessionId);
            }
        }
    }

    // Periodično čiščenje
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupSessions();
        }, 60 * 60 * 1000); // Vsako uro
    }
}

module.exports = UserManager;