const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const notificationService = require('../services/notificationService');
const auditService = require('../services/auditService');
const Notification = require('../models/Notification');

// Rate limiting for admin notifications
const adminNotificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
        error: 'Too many notification requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Validation middleware for admin notifications
const validateAdminNotification = [
    body('message').notEmpty().withMessage('Message is required'),
    body('target').isIn(['all', 'active', 'specific']).withMessage('Invalid target'),
    body('client_ids').optional().isArray().withMessage('Client IDs must be an array')
];

/**
 * Send admin notification to clients
 * POST /api/notifications/send
 */
router.post('/send', adminNotificationLimiter, validateAdminNotification, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { message, target, client_ids } = req.body;
        const adminId = req.user?.id || 'admin';

        // Log the notification attempt
        await auditService.logEvent({
            action: 'admin_notification_send',
            details: {
                target,
                message: message.substring(0, 100),
                client_count: target === 'specific' ? client_ids?.length : 'all'
            },
            user_id: adminId,
            ip_address: req.ip
        });

        // Get WebSocket instance from app
        const io = req.app.get('io');
        if (!io) {
            return res.status(500).json({
                success: false,
                error: 'WebSocket server not available'
            });
        }

        let sentCount = 0;
        let targetClients = [];

        switch (target) {
            case 'all':
                io.emit('system_notification', {
                    message,
                    timestamp: new Date().toISOString(),
                    type: 'admin_broadcast'
                });
                sentCount = io.engine.clientsCount;
                break;

            case 'active':
                io.emit('system_notification', {
                    message,
                    timestamp: new Date().toISOString(),
                    type: 'admin_broadcast',
                    target: 'active_only'
                });
                sentCount = io.engine.clientsCount;
                break;

            case 'specific':
                if (!client_ids || !Array.isArray(client_ids) || client_ids.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Client IDs are required for specific targeting'
                    });
                }

                client_ids.forEach(clientId => {
                    io.emit('system_notification', {
                        message,
                        timestamp: new Date().toISOString(),
                        type: 'admin_broadcast',
                        target_client: clientId
                    });
                });
                sentCount = client_ids.length;
                targetClients = client_ids;
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid target specified'
                });
        }

        // Log successful notification
        await auditService.logEvent({
            action: 'admin_notification_sent',
            details: {
                target,
                sent_count: sentCount,
                target_clients: targetClients
            },
            user_id: adminId,
            ip_address: req.ip
        });

        res.json({
            success: true,
            message: 'Notification sent successfully',
            sent_count: sentCount,
            target_clients: targetClients
        });

    } catch (error) {
        console.error('❌ Error sending admin notification:', error);
        
        await auditService.logEvent({
            action: 'admin_notification_error',
            details: {
                error: error.message,
                target: req.body.target
            },
            user_id: req.user?.id || 'admin',
            ip_address: req.ip
        });

        res.status(500).json({
            success: false,
            error: 'Failed to send notification'
        });
    }
});

/**
 * API Routes za obvestila
 */

/**
 * GET /api/notifications/:clientId
 * Pridobi obvestila za določenega odjemalca
 */
router.get('/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const {
            status,
            type,
            limit = 20,
            skip = 0,
            unreadOnly = false
        } = req.query;

        const options = {
            status: status || null,
            type: type || null,
            limit: parseInt(limit),
            skip: parseInt(skip),
            unreadOnly: unreadOnly === 'true'
        };

        const notifications = await notificationService.getClientNotifications(clientId, options);
        
        res.json({
            success: true,
            notifications,
            count: notifications.length
        });

    } catch (error) {
        console.error('❌ Napaka pri pridobivanju obvestil:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju obvestil',
            details: error.message
        });
    }
});

/**
 * GET /api/notifications/:clientId/unread-count
 * Pridobi število neprebranih obvestil
 */
router.get('/:clientId/unread-count', async (req, res) => {
    try {
        const { clientId } = req.params;
        
        const unreadCount = await Notification.countDocuments({
            client_id: clientId,
            read_at: { $exists: false },
            status: { $in: ['sent', 'delivered'] }
        });

        res.json({
            success: true,
            unreadCount
        });

    } catch (error) {
        console.error('❌ Napaka pri štetju neprebranih obvestil:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri štetju neprebranih obvestil'
        });
    }
});

/**
 * POST /api/notifications/:notificationId/read
 * Označi obvestilo kot prebrano
 */
router.post('/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;
        
        const success = await notificationService.markNotificationAsRead(notificationId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Obvestilo označeno kot prebrano'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Obvestilo ni najdeno'
            });
        }

    } catch (error) {
        console.error('❌ Napaka pri označevanju obvestila:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri označevanju obvestila'
        });
    }
});

/**
 * POST /api/notifications/:notificationId/dismiss
 * Zavrni obvestilo
 */
router.post('/:notificationId/dismiss', async (req, res) => {
    try {
        const { notificationId } = req.params;
        
        const success = await notificationService.dismissNotification(notificationId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Obvestilo zavrnjeno'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Obvestilo ni najdeno'
            });
        }

    } catch (error) {
        console.error('❌ Napaka pri zavračanju obvestila:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri zavračanju obvestila'
        });
    }
});

/**
 * POST /api/notifications/:clientId/mark-all-read
 * Označi vsa obvestila kot prebrana
 */
router.post('/:clientId/mark-all-read', async (req, res) => {
    try {
        const { clientId } = req.params;
        
        const result = await Notification.updateMany(
            {
                client_id: clientId,
                read_at: { $exists: false }
            },
            {
                $set: {
                    status: 'read',
                    read_at: new Date()
                }
            }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} obvestil označenih kot prebranih`
        });

    } catch (error) {
        console.error('❌ Napaka pri označevanju vseh obvestil:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri označevanju vseh obvestil'
        });
    }
});

/**
 * GET /api/notifications/:clientId/stats
 * Pridobi statistike obvestil za odjemalca
 */
router.get('/:clientId/stats', async (req, res) => {
    try {
        const { clientId } = req.params;
        
        const stats = await notificationService.getNotificationStats(clientId);
        
        if (stats) {
            res.json({
                success: true,
                stats
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Napaka pri pridobivanju statistik'
            });
        }

    } catch (error) {
        console.error('❌ Napaka pri pridobivanju statistik:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju statistik'
        });
    }
});

/**
 * POST /api/notifications/test/:clientId
 * Ustvari testno obvestilo (samo za razvoj)
 */
router.post('/test/:clientId', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Testna obvestila niso dovoljena v produkciji'
            });
        }

        const { clientId } = req.params;
        const { type = 'license_expiring_soon', daysUntilExpiry = 7 } = req.body;

        // Ustvari testno licenco podatke
        const testLicenseData = {
            client_id: clientId,
            token: 'test-token-' + Date.now(),
            type: 'premium',
            expires_at: new Date(Date.now() + (daysUntilExpiry * 24 * 60 * 60 * 1000)),
            email: 'test@example.com'
        };

        const notification = await Notification.createExpiryNotification(testLicenseData, daysUntilExpiry);

        res.json({
            success: true,
            message: 'Testno obvestilo ustvarjeno',
            notification: {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                priority: notification.priority
            }
        });

    } catch (error) {
        console.error('❌ Napaka pri ustvarjanju testnega obvestila:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri ustvarjanju testnega obvestila'
        });
    }
});

/**
 * DELETE /api/notifications/:clientId/cleanup
 * Počisti stara obvestila za odjemalca
 */
router.delete('/:clientId/cleanup', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { olderThanDays = 30 } = req.query;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays));

        const result = await Notification.deleteMany({
            client_id: clientId,
            createdAt: { $lt: cutoffDate },
            status: { $in: ['read', 'dismissed'] }
        });

        res.json({
            success: true,
            message: `Počiščenih ${result.deletedCount} starih obvestil`
        });

    } catch (error) {
        console.error('❌ Napaka pri čiščenju obvestil:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri čiščenju obvestil'
        });
    }
});

/**
 * GET /api/notifications/health
 * Zdravstveni pregled storitve obvestil
 */
router.get('/health', async (req, res) => {
    try {
        const stats = await notificationService.getNotificationStats();
        const pendingCount = await Notification.countDocuments({ status: 'pending' });
        
        res.json({
            success: true,
            service: 'notifications',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            stats: {
                ...stats,
                pending: pendingCount
            },
            features: {
                email_enabled: !!process.env.EMAIL_HOST,
                cron_jobs_active: true,
                cleanup_enabled: true
            }
        });

    } catch (error) {
        console.error('❌ Napaka pri zdravstvenem pregledu obvestil:', error);
        res.status(500).json({
            success: false,
            service: 'notifications',
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;