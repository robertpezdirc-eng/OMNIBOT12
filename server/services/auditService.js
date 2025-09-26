const AuditLog = require('../models/AuditLog');

/**
 * Audit Service za centralizirano beleženje dogodkov
 */
class AuditService {
    constructor() {
        this.isEnabled = process.env.AUDIT_ENABLED !== 'false';
        this.logLevel = process.env.AUDIT_LOG_LEVEL || 'info';
        this.retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS) || 365;
        
        console.log('🔍 Audit Service inicializiran:', {
            enabled: this.isEnabled,
            logLevel: this.logLevel,
            retentionDays: this.retentionDays
        });
        
        // Zaženi čiščenje starih zapisov
        this.scheduleCleanup();
    }

    /**
     * Splošna metoda za beleženje dogodkov
     */
    async log(eventData) {
        if (!this.isEnabled) return null;

        try {
            // Dodaj sistemske metapodatke
            const enrichedData = {
                ...eventData,
                timestamp: new Date(),
                metadata: {
                    ...eventData.metadata,
                    serverVersion: process.env.npm_package_version || '1.0.0',
                    nodeVersion: process.version,
                    environment: process.env.NODE_ENV || 'development'
                }
            };

            const logEntry = await AuditLog.create(enrichedData);
            
            // Če je kritičen dogodek, takoj obvesti
            if (eventData.securityLevel === 'critical') {
                await this.handleCriticalEvent(logEntry);
            }

            return logEntry;
        } catch (error) {
            console.error('❌ Napaka pri beleženju audit log-a:', error);
            return null;
        }
    }

    /**
     * Middleware za Express za avtomatsko beleženje API klicev
     */
    createMiddleware() {
        return (req, res, next) => {
            if (!this.isEnabled) return next();

            const startTime = Date.now();
            const originalSend = res.send;

            // Zajemi podatke o zahtevi
            const requestData = {
                method: req.method,
                url: req.url,
                headers: this.sanitizeHeaders(req.headers),
                query: req.query,
                body: this.sanitizeBody(req.body),
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent')
            };

            // Prestreži odgovor
            res.send = function(data) {
                const duration = Date.now() - startTime;
                const statusCode = res.statusCode;

                // Določi kategorijo in varnostni nivo
                const category = AuditService.determineCategory(req.url);
                const securityLevel = AuditService.determineSecurityLevel(req.method, req.url, statusCode);

                // Beleži API klic
                setImmediate(() => {
                    this.log({
                        eventType: 'api_access',
                        clientId: req.headers['x-client-id'] || req.body?.clientId,
                        userId: req.user?.id || req.headers['x-user-id'],
                        action: `${req.method} ${req.url}`,
                        description: `API call to ${req.method} ${req.url}`,
                        ipAddress: requestData.ip,
                        userAgent: requestData.userAgent,
                        requestData: requestData,
                        responseData: {
                            statusCode,
                            contentLength: res.get('Content-Length'),
                            responseTime: duration
                        },
                        status: statusCode < 400 ? 'success' : 'failure',
                        duration,
                        category,
                        securityLevel
                    });
                }.bind(this));

                return originalSend.call(this, data);
            }.bind(this);

            next();
        };
    }

    /**
     * Beleži aktivacijo licence
     */
    async logLicenseActivation(clientId, licenseData, userId = null, req = null) {
        return await this.log({
            eventType: 'license_activation',
            userId,
            clientId,
            action: 'License activated',
            description: `License ${licenseData.licenseKey} activated for client ${clientId}`,
            licenseInfo: {
                licenseKey: licenseData.licenseKey,
                licenseType: licenseData.type,
                expiresAt: licenseData.expiresAt,
                status: 'active'
            },
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            requestData: req ? this.sanitizeBody(req.body) : null,
            status: 'success',
            category: 'license',
            securityLevel: 'medium'
        });
    }

    /**
     * Beleži validacijo licence
     */
    async logLicenseValidation(clientId, licenseKey, validationResult, req = null) {
        return await this.log({
            eventType: 'license_validation',
            clientId,
            action: 'License validation performed',
            description: `License ${licenseKey} validation: ${validationResult.valid ? 'valid' : 'invalid'}`,
            licenseInfo: {
                licenseKey,
                status: validationResult.valid ? 'valid' : 'invalid'
            },
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            responseData: {
                valid: validationResult.valid,
                reason: validationResult.reason,
                mode: validationResult.mode
            },
            status: validationResult.valid ? 'success' : 'warning',
            category: 'license',
            securityLevel: validationResult.valid ? 'low' : 'medium'
        });
    }

    /**
     * Beleži varnostno kršitev
     */
    async logSecurityViolation(violation, clientId = null, req = null, additionalData = {}) {
        return await this.log({
            eventType: 'security_violation',
            clientId,
            action: 'Security violation detected',
            description: `Security violation: ${violation}`,
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            requestData: req ? this.sanitizeBody(req.body) : null,
            status: 'failure',
            category: 'security',
            securityLevel: 'critical',
            metadata: additionalData
        });
    }

    /**
     * Beleži plačilni dogodek
     */
    async logPaymentEvent(clientId, paymentAction, paymentData, result, req = null) {
        return await this.log({
            eventType: result.success ? 'payment_processed' : 'payment_failed',
            clientId,
            action: `Payment ${paymentAction}`,
            description: `Payment ${paymentAction} for ${paymentData.amount} ${paymentData.currency}: ${result.success ? 'successful' : 'failed'}`,
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            requestData: {
                action: paymentAction,
                amount: paymentData.amount,
                currency: paymentData.currency,
                paymentMethod: paymentData.paymentMethod
            },
            responseData: {
                success: result.success,
                transactionId: result.transactionId,
                errorCode: result.errorCode,
                errorMessage: result.errorMessage
            },
            status: result.success ? 'success' : 'failure',
            category: 'payment',
            securityLevel: 'medium'
        });
    }

    /**
     * Beleži sistemsko napako
     */
    async logError(eventType, error, clientId = null, userId = null, req = null) {
        return await this.log({
            eventType: 'error_occurred',
            userId,
            clientId,
            action: `Error in ${eventType}`,
            description: `Error occurred: ${error.message}`,
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            errorCode: error.code || 'UNKNOWN',
            errorMessage: error.message,
            status: 'failure',
            category: 'system',
            securityLevel: 'medium',
            metadata: {
                stack: error.stack,
                originalEventType: eventType
            }
        });
    }

    /**
     * Pridobi varnostne dogodke
     */
    async getSecurityEvents(timeRange = 24, limit = 100) {
        const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
        return await AuditLog.find({
            category: 'security',
            timestamp: { $gte: since },
            archived: false
        })
        .sort({ timestamp: -1 })
        .limit(limit);
    }

    /**
     * Pridobi aktivnost licence za določenega odjemalca
     */
    async getLicenseActivity(clientId, timeRange = 168, limit = 50) {
        const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
        return await AuditLog.find({
            clientId,
            category: 'license',
            timestamp: { $gte: since },
            archived: false
        })
        .sort({ timestamp: -1 })
        .limit(limit);
    }

    /**
     * Pridobi statistike audit log-ov
     */
    async getStatistics(timeRange = 24) {
        const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
        
        const stats = await AuditLog.aggregate([
            { $match: { timestamp: { $gte: since }, archived: false } },
            {
                $group: {
                    _id: {
                        category: '$category',
                        status: '$status',
                        securityLevel: '$securityLevel'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return {
            timeRange: `${timeRange} hours`,
            totalEvents: stats.reduce((sum, stat) => sum + stat.count, 0),
            breakdown: stats,
            generatedAt: new Date()
        };
    }

    /**
     * Arhiviraj stare zapise
     */
    async archiveOldLogs(daysOld = null) {
        const days = daysOld || this.retentionDays;
        const result = await AuditLog.archiveOldLogs(days);
        
        console.log(`📦 Arhivirano ${result.modifiedCount} starih audit zapisov (starejših od ${days} dni)`);
        return result;
    }

    /**
     * Počisti arhivirane zapise
     */
    async deleteArchivedLogs(daysOld = 730) { // 2 leti
        const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
        const result = await AuditLog.deleteMany({
            archived: true,
            timestamp: { $lt: cutoffDate }
        });
        
        console.log(`🗑️ Izbrisano ${result.deletedCount} arhiviranih audit zapisov`);
        return result;
    }

    /**
     * Get notification statistics
     */
    async getNotificationStats() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const stats = await AuditLog.aggregate([
                {
                    $match: {
                        action: { $in: ['admin_notification_sent', 'admin_notification_error'] },
                        timestamp: { $gte: thirtyDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            action: '$action',
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
                        },
                        count: { $sum: 1 },
                        sent_count: { $sum: { $ifNull: ['$details.sent_count', 0] } }
                    }
                },
                {
                    $sort: { '_id.date': -1 }
                }
            ]);

            return stats;
        } catch (error) {
            console.error('❌ Error getting notification stats:', error);
            throw error;
        }
    }

    /**
     * Get notification history
     */
    async getNotificationHistory(page = 1, limit = 50) {
        try {
            const skip = (page - 1) * limit;
            
            const history = await AuditLog.find({
                action: { $in: ['admin_notification_sent', 'admin_notification_error'] }
            })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

            const total = await AuditLog.countDocuments({
                action: { $in: ['admin_notification_sent', 'admin_notification_error'] }
            });

            return {
                notifications: history,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error getting notification history:', error);
            throw error;
        }
    }

    /**
     * Obravnava kritične dogodke
     */
    async handleCriticalEvent(logEntry) {
        console.warn('🚨 KRITIČEN VARNOSTNI DOGODEK:', {
            eventType: logEntry.eventType,
            clientId: logEntry.clientId,
            description: logEntry.description,
            timestamp: logEntry.timestamp
        });

        // Tukaj lahko dodamo dodatne ukrepe:
        // - Pošljemo email administratorju
        // - Blokiramo IP naslov
        // - Ustvarimo notifikacijo
        // - Aktiviramo dodatne varnostne ukrepe
    }

    /**
     * Načrtovano čiščenje
     */
    scheduleCleanup() {
        // Arhiviraj stare zapise vsak dan ob 2:00
        const cleanupInterval = 24 * 60 * 60 * 1000; // 24 ur
        
        setInterval(async () => {
            try {
                await this.archiveOldLogs();
                await this.deleteArchivedLogs();
            } catch (error) {
                console.error('❌ Napaka pri čiščenju audit log-ov:', error);
            }
        }, cleanupInterval);
    }

    /**
     * Pomožne metode
     */
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        delete sanitized.authorization;
        delete sanitized.cookie;
        delete sanitized['x-api-key'];
        return sanitized;
    }

    sanitizeBody(body) {
        if (!body) return null;
        
        const sanitized = { ...body };
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.apiKey;
        delete sanitized.secret;
        
        return sanitized;
    }

    static determineCategory(url) {
        if (url.includes('/license')) return 'license';
        if (url.includes('/payment')) return 'payment';
        if (url.includes('/auth')) return 'security';
        if (url.includes('/notification')) return 'notification';
        if (url.includes('/user')) return 'user';
        return 'api';
    }

    static determineSecurityLevel(method, url, statusCode) {
        if (statusCode >= 500) return 'high';
        if (statusCode >= 400) return 'medium';
        if (method === 'POST' && url.includes('/license')) return 'medium';
        if (method === 'DELETE') return 'medium';
        return 'low';
    }
}

module.exports = new AuditService();