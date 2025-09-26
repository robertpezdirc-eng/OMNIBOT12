/**
 * Remote Access Configuration Module
 * Handles secure remote access, VPN integration, and mobile optimization
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class RemoteAccessManager {
    constructor(options = {}) {
        this.config = {
            // Security settings
            maxLoginAttempts: options.maxLoginAttempts || 5,
            lockoutDuration: options.lockoutDuration || 15 * 60 * 1000, // 15 minutes
            sessionTimeout: options.sessionTimeout || 24 * 60 * 60 * 1000, // 24 hours
            
            // Mobile optimization
            mobileDataCompression: options.mobileDataCompression !== false,
            adaptiveQuality: options.adaptiveQuality !== false,
            offlineMode: options.offlineMode !== false,
            
            // Network settings
            allowedNetworks: options.allowedNetworks || [],
            vpnRequired: options.vpnRequired || false,
            geoBlocking: options.geoBlocking || false,
            allowedCountries: options.allowedCountries || [],
            
            // Performance
            cacheStrategy: options.cacheStrategy || 'adaptive',
            compressionLevel: options.compressionLevel || 6,
            
            // Monitoring
            enableAnalytics: options.enableAnalytics !== false,
            logLevel: options.logLevel || 'info'
        };
        
        this.activeSessions = new Map();
        this.loginAttempts = new Map();
        this.blockedIPs = new Set();
        
        this.initializeSecurityFeatures();
    }

    initializeSecurityFeatures() {
        // Initialize rate limiting
        this.rateLimiter = new Map();
        
        // Initialize geo-blocking if enabled
        if (this.config.geoBlocking) {
            this.initializeGeoBlocking();
        }
        
        // Initialize VPN detection if required
        if (this.config.vpnRequired) {
            this.initializeVPNDetection();
        }
        
        console.log('Remote Access Manager initialized with security features');
    }

    async authenticateRemoteUser(credentials, clientInfo) {
        const { email, password, twoFAToken, deviceFingerprint } = credentials;
        const { ip, userAgent, location } = clientInfo;
        
        try {
            // Check if IP is blocked
            if (this.isIPBlocked(ip)) {
                throw new Error('IP address is blocked due to suspicious activity');
            }
            
            // Check rate limiting
            if (this.isRateLimited(ip)) {
                throw new Error('Too many requests. Please try again later.');
            }
            
            // Geo-blocking check
            if (this.config.geoBlocking && !this.isLocationAllowed(location)) {
                throw new Error('Access denied from this geographic location');
            }
            
            // VPN check
            if (this.config.vpnRequired && !await this.isVPNConnection(ip)) {
                throw new Error('VPN connection required for remote access');
            }
            
            // Check login attempts
            const attemptKey = `${email}:${ip}`;
            const attempts = this.loginAttempts.get(attemptKey) || { count: 0, lastAttempt: 0 };
            
            if (attempts.count >= this.config.maxLoginAttempts) {
                const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
                if (timeSinceLastAttempt < this.config.lockoutDuration) {
                    throw new Error('Account temporarily locked due to too many failed attempts');
                }
                // Reset attempts after lockout period
                this.loginAttempts.delete(attemptKey);
            }
            
            // Authenticate user (this would integrate with your auth system)
            const user = await this.validateCredentials(email, password, twoFAToken);
            
            if (!user) {
                // Increment failed attempts
                attempts.count++;
                attempts.lastAttempt = Date.now();
                this.loginAttempts.set(attemptKey, attempts);
                throw new Error('Invalid credentials');
            }
            
            // Clear failed attempts on successful login
            this.loginAttempts.delete(attemptKey);
            
            // Create secure session
            const session = await this.createSecureSession(user, clientInfo);
            
            // Log successful authentication
            this.logSecurityEvent('remote_login_success', {
                userId: user.id,
                email: user.email,
                ip,
                userAgent,
                location,
                deviceFingerprint
            });
            
            return {
                success: true,
                user,
                session,
                token: session.token
            };
            
        } catch (error) {
            // Log failed authentication
            this.logSecurityEvent('remote_login_failed', {
                email,
                ip,
                userAgent,
                location,
                error: error.message
            });
            
            throw error;
        }
    }

    async createSecureSession(user, clientInfo) {
        const sessionId = crypto.randomUUID();
        const token = jwt.sign(
            {
                userId: user.id,
                sessionId,
                deviceFingerprint: clientInfo.deviceFingerprint,
                ip: clientInfo.ip
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        const session = {
            id: sessionId,
            userId: user.id,
            token,
            createdAt: new Date(),
            lastActivity: new Date(),
            clientInfo,
            isRemote: true,
            permissions: this.getRemotePermissions(user)
        };
        
        this.activeSessions.set(sessionId, session);
        
        // Set session cleanup timer
        setTimeout(() => {
            this.activeSessions.delete(sessionId);
        }, this.config.sessionTimeout);
        
        return session;
    }

    getRemotePermissions(user) {
        // Define what remote users can do based on their role
        const basePermissions = {
            viewDashboard: true,
            viewStats: true,
            viewLicenses: true
        };
        
        const rolePermissions = {
            admin: {
                ...basePermissions,
                createLicense: true,
                modifyLicense: true,
                deleteLicense: false, // Restricted for remote access
                sendNotifications: true,
                viewAuditLogs: true
            },
            support: {
                ...basePermissions,
                createLicense: false,
                modifyLicense: true,
                sendNotifications: true
            },
            viewer: {
                ...basePermissions
            }
        };
        
        return rolePermissions[user.role] || rolePermissions.viewer;
    }

    async validateCredentials(email, password, twoFAToken) {
        // This would integrate with your existing authentication system
        // For now, return a mock user for demonstration
        return {
            id: 'user123',
            email,
            role: 'admin',
            twoFAEnabled: !!twoFAToken
        };
    }

    isIPBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    isRateLimited(ip) {
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const maxRequests = 100;
        
        if (!this.rateLimiter.has(ip)) {
            this.rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
            return false;
        }
        
        const limiter = this.rateLimiter.get(ip);
        
        if (now > limiter.resetTime) {
            limiter.count = 1;
            limiter.resetTime = now + windowMs;
            return false;
        }
        
        limiter.count++;
        return limiter.count > maxRequests;
    }

    isLocationAllowed(location) {
        if (!this.config.geoBlocking || !location) return true;
        
        const { country } = location;
        return this.config.allowedCountries.length === 0 || 
               this.config.allowedCountries.includes(country);
    }

    async isVPNConnection(ip) {
        // This would integrate with a VPN detection service
        // For now, return true for demonstration
        return true;
    }

    initializeGeoBlocking() {
        console.log('Geo-blocking initialized for countries:', this.config.allowedCountries);
    }

    initializeVPNDetection() {
        console.log('VPN detection initialized');
    }

    // Mobile optimization methods
    optimizeForMobile(data, clientInfo) {
        if (!clientInfo.isMobile) return data;
        
        const optimized = { ...data };
        
        // Compress data if enabled
        if (this.config.mobileDataCompression) {
            optimized.compressed = true;
            // Implement data compression logic
        }
        
        // Reduce data quality for slower connections
        if (this.config.adaptiveQuality && clientInfo.connectionSpeed === 'slow') {
            optimized.quality = 'low';
            // Reduce image quality, limit data fields, etc.
        }
        
        return optimized;
    }

    // Session management
    async validateSession(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const session = this.activeSessions.get(decoded.sessionId);
            
            if (!session) {
                throw new Error('Session not found');
            }
            
            // Update last activity
            session.lastActivity = new Date();
            
            return session;
        } catch (error) {
            throw new Error('Invalid session token');
        }
    }

    async terminateSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            this.activeSessions.delete(sessionId);
            this.logSecurityEvent('session_terminated', {
                sessionId,
                userId: session.userId
            });
        }
    }

    // Security monitoring
    logSecurityEvent(event, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            data,
            severity: this.getEventSeverity(event)
        };
        
        console.log(`[SECURITY] ${event}:`, logEntry);
        
        // Here you would typically send to your logging system
        // this.logger.log(logEntry);
    }

    getEventSeverity(event) {
        const severityMap = {
            'remote_login_success': 'info',
            'remote_login_failed': 'warning',
            'session_terminated': 'info',
            'suspicious_activity': 'high',
            'ip_blocked': 'high'
        };
        
        return severityMap[event] || 'medium';
    }

    // Network security
    blockIP(ip, reason, duration = 24 * 60 * 60 * 1000) {
        this.blockedIPs.add(ip);
        
        setTimeout(() => {
            this.blockedIPs.delete(ip);
        }, duration);
        
        this.logSecurityEvent('ip_blocked', { ip, reason, duration });
    }

    // Analytics and monitoring
    getRemoteAccessStats() {
        const activeSessions = Array.from(this.activeSessions.values());
        const remoteSessions = activeSessions.filter(s => s.isRemote);
        
        return {
            totalActiveSessions: activeSessions.length,
            remoteActiveSessions: remoteSessions.length,
            blockedIPs: this.blockedIPs.size,
            failedAttempts: this.loginAttempts.size,
            sessionsByLocation: this.groupSessionsByLocation(remoteSessions),
            sessionsByDevice: this.groupSessionsByDevice(remoteSessions)
        };
    }

    groupSessionsByLocation(sessions) {
        const locationGroups = {};
        sessions.forEach(session => {
            const country = session.clientInfo.location?.country || 'Unknown';
            locationGroups[country] = (locationGroups[country] || 0) + 1;
        });
        return locationGroups;
    }

    groupSessionsByDevice(sessions) {
        const deviceGroups = {};
        sessions.forEach(session => {
            const deviceType = session.clientInfo.isMobile ? 'Mobile' : 'Desktop';
            deviceGroups[deviceType] = (deviceGroups[deviceType] || 0) + 1;
        });
        return deviceGroups;
    }

    // Configuration management
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('Remote access configuration updated');
    }

    getConfig() {
        return { ...this.config };
    }
}

// Express middleware for remote access
function createRemoteAccessMiddleware(remoteAccessManager) {
    return async (req, res, next) => {
        try {
            // Extract client information
            const clientInfo = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                isMobile: /Mobile|Android|iPhone|iPad/.test(req.get('User-Agent')),
                location: req.geoLocation, // Assuming geo-location middleware
                deviceFingerprint: req.get('X-Device-Fingerprint')
            };
            
            req.clientInfo = clientInfo;
            req.remoteAccessManager = remoteAccessManager;
            
            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Remote access middleware error'
            });
        }
    };
}

// Device fingerprinting utility
function generateDeviceFingerprint(req) {
    const components = [
        req.get('User-Agent'),
        req.get('Accept-Language'),
        req.get('Accept-Encoding'),
        req.connection.remoteAddress
    ].filter(Boolean);
    
    return crypto
        .createHash('sha256')
        .update(components.join('|'))
        .digest('hex')
        .substring(0, 16);
}

module.exports = {
    RemoteAccessManager,
    createRemoteAccessMiddleware,
    generateDeviceFingerprint
};