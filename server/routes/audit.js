const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const auditService = require('../services/auditService');

/**
 * Middleware za preverjanje administratorskih pravic
 */
function requireAdmin(req, res, next) {
    // V produkciji bi tukaj preverili JWT token ali API ključ
    const adminKey = req.headers['x-admin-key'];
    const validAdminKey = process.env.ADMIN_API_KEY || 'admin-key-123';
    
    if (!adminKey || adminKey !== validAdminKey) {
        return res.status(403).json({
            success: false,
            error: 'Admin privileges required'
        });
    }
    
    next();
}

/**
 * Middleware za omejevanje dostopa
 */
function rateLimitAudit(req, res, next) {
    // Preprosta implementacija rate limiting-a
    const clientIp = req.ip || req.connection.remoteAddress;
    const key = `audit_access_${clientIp}`;
    
    // V produkciji bi uporabili Redis ali podobno
    if (!global.auditRateLimit) {
        global.auditRateLimit = new Map();
    }
    
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuta
    const maxRequests = 10;
    
    const requests = global.auditRateLimit.get(key) || [];
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests'
        });
    }
    
    validRequests.push(now);
    global.auditRateLimit.set(key, validRequests);
    
    next();
}

/**
 * GET /audit/logs - Pridobi audit log-e z možnostjo filtriranja
 */
router.get('/logs', requireAdmin, rateLimitAudit, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            category,
            eventType,
            clientId,
            userId,
            status,
            securityLevel,
            timeRange = 24,
            startDate,
            endDate
        } = req.query;

        // Sestavi filter
        const filter = { archived: false };
        
        if (category) filter.category = category;
        if (eventType) filter.eventType = eventType;
        if (clientId) filter.clientId = clientId;
        if (userId) filter.userId = userId;
        if (status) filter.status = status;
        if (securityLevel) filter.securityLevel = securityLevel;

        // Časovni filter
        if (startDate && endDate) {
            filter.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (timeRange) {
            const since = new Date(Date.now() - (parseInt(timeRange) * 60 * 60 * 1000));
            filter.timestamp = { $gte: since };
        }

        // Paginacija
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const maxLimit = 200; // Maksimalno število zapisov na stran
        const actualLimit = Math.min(parseInt(limit), maxLimit);

        // Poizvedba
        const logs = await AuditLog.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(actualLimit)
            .select('-__v'); // Izključi MongoDB verzijo

        const totalCount = await AuditLog.countDocuments(filter);
        const totalPages = Math.ceil(totalCount / actualLimit);

        // Beleži dostop do audit log-ov
        await auditService.log({
            eventType: 'admin_action',
            userId: req.headers['x-user-id'] || 'admin',
            action: 'Audit logs accessed',
            description: `Admin accessed audit logs with filters: ${JSON.stringify(filter)}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            requestData: req.query,
            status: 'success',
            category: 'system',
            securityLevel: 'medium'
        });

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalCount,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1
                },
                filters: filter
            }
        });

    } catch (error) {
        console.error('❌ Napaka pri pridobivanju audit log-ov:', error);
        
        await auditService.logError('audit_logs_access', error, null, req.headers['x-user-id'], req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /audit/statistics - Pridobi statistike audit log-ov
 */
router.get('/statistics', requireAdmin, rateLimitAudit, async (req, res) => {
    try {
        const { timeRange = 24 } = req.query;
        
        const stats = await auditService.getStatistics(parseInt(timeRange));
        
        // Dodatne statistike
        const securityEvents = await auditService.getSecurityEvents(parseInt(timeRange));
        const failedEvents = await AuditLog.getFailedEvents(parseInt(timeRange));
        
        const response = {
            ...stats,
            securityEventsCount: securityEvents.length,
            failedEventsCount: failedEvents.length,
            criticalEvents: securityEvents.filter(event => event.securityLevel === 'critical').length
        };

        await auditService.log({
            eventType: 'admin_action',
            userId: req.headers['x-user-id'] || 'admin',
            action: 'Audit statistics accessed',
            description: `Admin accessed audit statistics for ${timeRange} hours`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'success',
            category: 'system',
            securityLevel: 'low'
        });

        res.json({
            success: true,
            data: response
        });

    } catch (error) {
        console.error('❌ Napaka pri pridobivanju statistik:', error);
        
        await auditService.logError('audit_statistics_access', error, null, req.headers['x-user-id'], req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /audit/security - Pridobi varnostne dogodke
 */
router.get('/security', requireAdmin, rateLimitAudit, async (req, res) => {
    try {
        const { timeRange = 24, limit = 100 } = req.query;
        
        const securityEvents = await auditService.getSecurityEvents(
            parseInt(timeRange), 
            parseInt(limit)
        );

        await auditService.log({
            eventType: 'admin_action',
            userId: req.headers['x-user-id'] || 'admin',
            action: 'Security events accessed',
            description: `Admin accessed security events for ${timeRange} hours`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'success',
            category: 'security',
            securityLevel: 'medium'
        });

        res.json({
            success: true,
            data: {
                events: securityEvents,
                count: securityEvents.length,
                timeRange: `${timeRange} hours`
            }
        });

    } catch (error) {
        console.error('❌ Napaka pri pridobivanju varnostnih dogodkov:', error);
        
        await auditService.logError('security_events_access', error, null, req.headers['x-user-id'], req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /audit/client/:clientId - Pridobi audit log-e za določenega odjemalca
 */
router.get('/client/:clientId', requireAdmin, rateLimitAudit, async (req, res) => {
    try {
        const { clientId } = req.params;
        const { timeRange = 168, limit = 50 } = req.query; // 7 dni default
        
        const activity = await auditService.getLicenseActivity(
            clientId, 
            parseInt(timeRange), 
            parseInt(limit)
        );

        await auditService.log({
            eventType: 'admin_action',
            userId: req.headers['x-user-id'] || 'admin',
            action: 'Client audit accessed',
            description: `Admin accessed audit logs for client ${clientId}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'success',
            category: 'system',
            securityLevel: 'medium',
            metadata: { targetClientId: clientId }
        });

        res.json({
            success: true,
            data: {
                clientId,
                activity,
                count: activity.length,
                timeRange: `${timeRange} hours`
            }
        });

    } catch (error) {
        console.error('❌ Napaka pri pridobivanju aktivnosti odjemalca:', error);
        
        await auditService.logError('client_audit_access', error, req.params.clientId, req.headers['x-user-id'], req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /audit/archive - Arhiviraj stare zapise
 */
router.post('/archive', requireAdmin, async (req, res) => {
    try {
        const { daysOld = 90 } = req.body;
        
        const result = await auditService.archiveOldLogs(parseInt(daysOld));

        await auditService.log({
            eventType: 'admin_action',
            userId: req.headers['x-user-id'] || 'admin',
            action: 'Audit logs archived',
            description: `Admin archived audit logs older than ${daysOld} days`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            responseData: { archivedCount: result.modifiedCount },
            status: 'success',
            category: 'system',
            securityLevel: 'low'
        });

        res.json({
            success: true,
            data: {
                archivedCount: result.modifiedCount,
                daysOld: parseInt(daysOld)
            }
        });

    } catch (error) {
        console.error('❌ Napaka pri arhiviranju:', error);
        
        await auditService.logError('audit_archive', error, null, req.headers['x-user-id'], req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /audit/export - Izvozi audit log-e (CSV format)
 */
router.get('/export', requireAdmin, rateLimitAudit, async (req, res) => {
    try {
        const {
            format = 'csv',
            timeRange = 24,
            category,
            securityLevel
        } = req.query;

        // Sestavi filter
        const filter = { archived: false };
        if (category) filter.category = category;
        if (securityLevel) filter.securityLevel = securityLevel;
        
        const since = new Date(Date.now() - (parseInt(timeRange) * 60 * 60 * 1000));
        filter.timestamp = { $gte: since };

        const logs = await AuditLog.find(filter)
            .sort({ timestamp: -1 })
            .limit(10000) // Omeji na 10k zapisov
            .select('timestamp eventType clientId userId action status category securityLevel ipAddress');

        if (format === 'csv') {
            // Generiraj CSV
            const csvHeader = 'Timestamp,Event Type,Client ID,User ID,Action,Status,Category,Security Level,IP Address\n';
            const csvRows = logs.map(log => 
                `"${log.timestamp}","${log.eventType}","${log.clientId || ''}","${log.userId || ''}","${log.action}","${log.status}","${log.category}","${log.securityLevel}","${log.ipAddress || ''}"`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
            res.send(csvHeader + csvRows);
        } else {
            res.json({
                success: true,
                data: logs
            });
        }

        await auditService.log({
            eventType: 'admin_action',
            userId: req.headers['x-user-id'] || 'admin',
            action: 'Audit logs exported',
            description: `Admin exported ${logs.length} audit logs in ${format} format`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'success',
            category: 'system',
            securityLevel: 'medium'
        });

    } catch (error) {
        console.error('❌ Napaka pri izvozu:', error);
        
        await auditService.logError('audit_export', error, null, req.headers['x-user-id'], req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;