const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Audit Trail Schema - shema za beleženje revizijske sledi
 */
const auditTrailSchema = new mongoose.Schema({
    // Osnovne informacije o dogodku
    eventId: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomUUID()
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    
    // Informacije o uporabniku
    userId: {
        type: String,
        required: false
    },
    username: {
        type: String,
        required: false
    },
    userRole: {
        type: String,
        required: false
    },
    
    // Informacije o zahtevi
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: false
    },
    sessionId: {
        type: String,
        required: false
    },
    
    // Informacije o dogodku
    action: {
        type: String,
        required: true,
        enum: [
            'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
            'LICENSE_CHECK', 'LICENSE_CREATE', 'LICENSE_UPDATE', 'LICENSE_DELETE', 'LICENSE_EXTEND',
            'TOKEN_CREATE', 'TOKEN_REFRESH', 'TOKEN_REVOKE',
            'ADMIN_ACCESS', 'ADMIN_ACTION', 'CONFIG_CHANGE',
            'API_ACCESS', 'WEBHOOK_SENT', 'NOTIFICATION_SENT',
            'DATA_EXPORT', 'DATA_IMPORT', 'BACKUP_CREATE', 'BACKUP_RESTORE',
            'SECURITY_VIOLATION', 'RATE_LIMIT_EXCEEDED', 'UNAUTHORIZED_ACCESS',
            'SYSTEM_START', 'SYSTEM_STOP', 'ERROR_OCCURRED'
        ]
    },
    resource: {
        type: String,
        required: true // npr. 'license', 'user', 'system', 'api'
    },
    resourceId: {
        type: String,
        required: false // ID vira, če je relevanten
    },
    
    // Podrobnosti dogodka
    method: {
        type: String,
        required: false // HTTP metoda
    },
    endpoint: {
        type: String,
        required: false // API končna točka
    },
    statusCode: {
        type: Number,
        required: false // HTTP status koda
    },
    
    // Podatki o spremembi
    oldValue: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    changes: [{
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed
    }],
    
    // Dodatne informacije
    description: {
        type: String,
        required: false
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    
    // Varnostne informacije
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'LOW'
    },
    riskLevel: {
        type: String,
        enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'NONE'
    },
    
    // Rezultat dogodka
    success: {
        type: Boolean,
        required: true,
        default: true
    },
    errorMessage: {
        type: String,
        required: false
    },
    errorCode: {
        type: String,
        required: false
    },
    
    // Geolokacija (če je na voljo)
    location: {
        country: String,
        city: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    
    // Dodatne varnostne oznake
    tags: [String],
    flags: {
        suspicious: { type: Boolean, default: false },
        automated: { type: Boolean, default: false },
        reviewed: { type: Boolean, default: false },
        archived: { type: Boolean, default: false }
    }
}, {
    timestamps: true,
    collection: 'audit_trail'
});

// Indeksi za optimalno iskanje
auditTrailSchema.index({ timestamp: -1 });
auditTrailSchema.index({ userId: 1, timestamp: -1 });
auditTrailSchema.index({ action: 1, timestamp: -1 });
auditTrailSchema.index({ ipAddress: 1, timestamp: -1 });
auditTrailSchema.index({ resource: 1, resourceId: 1 });
auditTrailSchema.index({ severity: 1, timestamp: -1 });
auditTrailSchema.index({ 'flags.suspicious': 1, timestamp: -1 });

const AuditTrail = mongoose.model('AuditTrail', auditTrailSchema);

/**
 * Audit Trail Service - storitev za upravljanje revizijske sledi
 */
class AuditTrailService {
    constructor() {
        this.suspiciousPatterns = [
            /password/i,
            /token/i,
            /secret/i,
            /key/i,
            /admin/i
        ];
    }

    /**
     * Zabeleži dogodek v audit trail
     */
    async logEvent(eventData) {
        try {
            // Sanitiziraj občutljive podatke
            const sanitizedData = this.sanitizeData(eventData);
            
            // Določi resnost dogodka
            const severity = this.determineSeverity(sanitizedData);
            
            // Preveri sumljive vzorce
            const suspicious = this.detectSuspiciousActivity(sanitizedData);
            
            const auditEntry = new AuditTrail({
                ...sanitizedData,
                severity,
                flags: {
                    ...sanitizedData.flags,
                    suspicious
                }
            });

            await auditEntry.save();
            
            // Če je dogodek sumljiv ali kritičen, pošlji opozorilo
            if (suspicious || severity === 'CRITICAL') {
                await this.sendSecurityAlert(auditEntry);
            }

            return auditEntry;
        } catch (error) {
            console.error('❌ Napaka pri beleženju audit trail:', error);
            throw error;
        }
    }

    /**
     * Middleware za avtomatsko beleženje HTTP zahtev
     */
    createAuditMiddleware() {
        return async (req, res, next) => {
            const startTime = Date.now();
            
            // Shrani originalno res.json funkcijo
            const originalJson = res.json;
            let responseData = null;
            
            res.json = function(data) {
                responseData = data;
                return originalJson.call(this, data);
            };

            // Ko se zahteva konča
            res.on('finish', async () => {
                try {
                    const duration = Date.now() - startTime;
                    
                    await this.logEvent({
                        action: this.mapMethodToAction(req.method, req.path),
                        resource: this.extractResource(req.path),
                        resourceId: this.extractResourceId(req),
                        method: req.method,
                        endpoint: req.path,
                        statusCode: res.statusCode,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        userId: req.user?.id,
                        username: req.user?.username,
                        userRole: req.user?.role,
                        sessionId: req.sessionID,
                        success: res.statusCode < 400,
                        errorMessage: responseData?.error || responseData?.message,
                        errorCode: responseData?.code,
                        metadata: {
                            duration,
                            requestSize: req.get('Content-Length') || 0,
                            responseSize: JSON.stringify(responseData || {}).length,
                            query: req.query,
                            params: req.params
                        },
                        flags: {
                            automated: this.isAutomatedRequest(req)
                        }
                    });
                } catch (error) {
                    console.error('❌ Napaka pri audit middleware:', error);
                }
            });

            next();
        }.bind(this);
    }

    /**
     * Zabeleži varnostni dogodek
     */
    async logSecurityEvent(eventData) {
        return await this.logEvent({
            ...eventData,
            severity: 'HIGH',
            riskLevel: 'HIGH',
            flags: {
                suspicious: true,
                ...eventData.flags
            }
        });
    }

    /**
     * Zabeleži neuspešno prijavo
     */
    async logFailedLogin(req, username, reason) {
        return await this.logEvent({
            action: 'LOGIN_FAILED',
            resource: 'user',
            resourceId: username,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            success: false,
            errorMessage: reason,
            severity: 'MEDIUM',
            riskLevel: 'MEDIUM',
            metadata: {
                attemptedUsername: username,
                timestamp: new Date()
            }
        });
    }

    /**
     * Zabeleži uspešno prijavo
     */
    async logSuccessfulLogin(req, user) {
        return await this.logEvent({
            action: 'LOGIN',
            resource: 'user',
            resourceId: user.id,
            userId: user.id,
            username: user.username,
            userRole: user.role,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            success: true,
            severity: 'LOW'
        });
    }

    /**
     * Zabeleži spremembo licence
     */
    async logLicenseChange(userId, licenseId, action, oldValue, newValue) {
        return await this.logEvent({
            action: `LICENSE_${action.toUpperCase()}`,
            resource: 'license',
            resourceId: licenseId,
            userId,
            oldValue,
            newValue,
            changes: this.calculateChanges(oldValue, newValue),
            severity: action === 'DELETE' ? 'HIGH' : 'MEDIUM'
        });
    }

    /**
     * Pridobi audit trail z možnostmi filtriranja
     */
    async getAuditTrail(filters = {}, options = {}) {
        try {
            const {
                page = 1,
                limit = 50,
                sortBy = 'timestamp',
                sortOrder = 'desc'
            } = options;

            const query = this.buildQuery(filters);
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const total = await AuditTrail.countDocuments(query);
            const events = await AuditTrail.find(query)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            return {
                events,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju audit trail:', error);
            throw error;
        }
    }

    /**
     * Pridobi sumljive aktivnosti
     */
    async getSuspiciousActivities(timeframe = '24h') {
        try {
            const since = this.parseTimeframe(timeframe);
            
            const activities = await AuditTrail.find({
                timestamp: { $gte: since },
                $or: [
                    { 'flags.suspicious': true },
                    { severity: { $in: ['HIGH', 'CRITICAL'] } },
                    { success: false, action: { $in: ['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS'] } }
                ]
            })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();

            return activities;
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju sumljivih aktivnosti:', error);
            throw error;
        }
    }

    /**
     * Generiraj poročilo o varnosti
     */
    async generateSecurityReport(timeframe = '7d') {
        try {
            const since = this.parseTimeframe(timeframe);
            
            const [
                totalEvents,
                failedLogins,
                suspiciousEvents,
                criticalEvents,
                topIPs,
                topUsers
            ] = await Promise.all([
                AuditTrail.countDocuments({ timestamp: { $gte: since } }),
                AuditTrail.countDocuments({ 
                    timestamp: { $gte: since },
                    action: 'LOGIN_FAILED'
                }),
                AuditTrail.countDocuments({ 
                    timestamp: { $gte: since },
                    'flags.suspicious': true
                }),
                AuditTrail.countDocuments({ 
                    timestamp: { $gte: since },
                    severity: 'CRITICAL'
                }),
                this.getTopIPs(since),
                this.getTopUsers(since)
            ]);

            return {
                timeframe,
                period: { from: since, to: new Date() },
                summary: {
                    totalEvents,
                    failedLogins,
                    suspiciousEvents,
                    criticalEvents,
                    securityScore: this.calculateSecurityScore({
                        totalEvents,
                        failedLogins,
                        suspiciousEvents,
                        criticalEvents
                    })
                },
                topIPs,
                topUsers,
                generatedAt: new Date()
            };
        } catch (error) {
            console.error('❌ Napaka pri generiranju varnostnega poročila:', error);
            throw error;
        }
    }

    /**
     * Počisti stare audit zapise
     */
    async cleanupOldRecords(retentionDays = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const result = await AuditTrail.deleteMany({
                timestamp: { $lt: cutoffDate },
                'flags.archived': { $ne: true }
            });

            console.log(`🧹 Počiščenih ${result.deletedCount} starih audit zapisov`);
            return result.deletedCount;
        } catch (error) {
            console.error('❌ Napaka pri čiščenju starih audit zapisov:', error);
            throw error;
        }
    }

    // Pomožne metode
    sanitizeData(data) {
        const sanitized = { ...data };
        
        // Odstrani občutljive podatke
        if (sanitized.metadata) {
            delete sanitized.metadata.password;
            delete sanitized.metadata.token;
            delete sanitized.metadata.secret;
        }
        
        return sanitized;
    }

    determineSeverity(eventData) {
        if (eventData.action === 'LOGIN_FAILED' || eventData.statusCode >= 500) {
            return 'HIGH';
        }
        if (eventData.action.includes('DELETE') || eventData.statusCode >= 400) {
            return 'MEDIUM';
        }
        return 'LOW';
    }

    detectSuspiciousActivity(eventData) {
        // Preveri sumljive vzorce v podatkih
        const dataString = JSON.stringify(eventData).toLowerCase();
        return this.suspiciousPatterns.some(pattern => pattern.test(dataString));
    }

    mapMethodToAction(method, path) {
        if (path.includes('/auth/login')) return 'LOGIN';
        if (path.includes('/auth/logout')) return 'LOGOUT';
        if (path.includes('/license')) {
            switch (method) {
                case 'GET': return 'LICENSE_CHECK';
                case 'POST': return 'LICENSE_CREATE';
                case 'PUT': return 'LICENSE_UPDATE';
                case 'DELETE': return 'LICENSE_DELETE';
            }
        }
        return 'API_ACCESS';
    }

    extractResource(path) {
        if (path.includes('/license')) return 'license';
        if (path.includes('/user')) return 'user';
        if (path.includes('/admin')) return 'admin';
        return 'api';
    }

    extractResourceId(req) {
        return req.params.id || req.body.id || req.query.id;
    }

    isAutomatedRequest(req) {
        const userAgent = req.get('User-Agent') || '';
        return /bot|crawler|spider|automated/i.test(userAgent);
    }

    buildQuery(filters) {
        const query = {};
        
        if (filters.userId) query.userId = filters.userId;
        if (filters.action) query.action = filters.action;
        if (filters.resource) query.resource = filters.resource;
        if (filters.ipAddress) query.ipAddress = filters.ipAddress;
        if (filters.severity) query.severity = filters.severity;
        if (filters.suspicious) query['flags.suspicious'] = filters.suspicious;
        
        if (filters.dateFrom || filters.dateTo) {
            query.timestamp = {};
            if (filters.dateFrom) query.timestamp.$gte = new Date(filters.dateFrom);
            if (filters.dateTo) query.timestamp.$lte = new Date(filters.dateTo);
        }
        
        return query;
    }

    parseTimeframe(timeframe) {
        const now = new Date();
        const match = timeframe.match(/^(\d+)([hdwmy])$/);
        
        if (!match) return new Date(now.getTime() - 24 * 60 * 60 * 1000); // Privzeto 24h
        
        const [, amount, unit] = match;
        const multipliers = {
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
            w: 7 * 24 * 60 * 60 * 1000,
            m: 30 * 24 * 60 * 60 * 1000,
            y: 365 * 24 * 60 * 60 * 1000
        };
        
        return new Date(now.getTime() - amount * multipliers[unit]);
    }

    calculateChanges(oldValue, newValue) {
        if (!oldValue || !newValue) return [];
        
        const changes = [];
        const oldKeys = Object.keys(oldValue);
        const newKeys = Object.keys(newValue);
        
        [...new Set([...oldKeys, ...newKeys])].forEach(key => {
            if (oldValue[key] !== newValue[key]) {
                changes.push({
                    field: key,
                    oldValue: oldValue[key],
                    newValue: newValue[key]
                });
            }
        });
        
        return changes;
    }

    async getTopIPs(since) {
        return await AuditTrail.aggregate([
            { $match: { timestamp: { $gte: since } } },
            { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
    }

    async getTopUsers(since) {
        return await AuditTrail.aggregate([
            { $match: { timestamp: { $gte: since }, userId: { $exists: true } } },
            { $group: { _id: '$userId', username: { $first: '$username' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
    }

    calculateSecurityScore({ totalEvents, failedLogins, suspiciousEvents, criticalEvents }) {
        if (totalEvents === 0) return 100;
        
        const failedLoginRatio = failedLogins / totalEvents;
        const suspiciousRatio = suspiciousEvents / totalEvents;
        const criticalRatio = criticalEvents / totalEvents;
        
        let score = 100;
        score -= failedLoginRatio * 30;
        score -= suspiciousRatio * 40;
        score -= criticalRatio * 50;
        
        return Math.max(0, Math.round(score));
    }

    async sendSecurityAlert(auditEntry) {
        // Implementacija pošiljanja varnostnih opozoril
        console.log('🚨 Varnostno opozorilo:', {
            eventId: auditEntry.eventId,
            action: auditEntry.action,
            severity: auditEntry.severity,
            ipAddress: auditEntry.ipAddress,
            timestamp: auditEntry.timestamp
        });
    }
}

module.exports = {
    AuditTrail,
    AuditTrailService: new AuditTrailService()
};