/**
 * Mobile-Optimized API Endpoints
 * Provides compressed, adaptive data for mobile dashboard access
 */

const express = require('express');
const compression = require('compression');
const { RemoteAccessManager } = require('./remote-access-config');

class MobileAPI {
    constructor(app, remoteAccessManager) {
        this.app = app;
        this.remoteAccessManager = remoteAccessManager;
        this.router = express.Router();
        
        this.setupMiddleware();
        this.setupRoutes();
        
        // Mount the router
        app.use('/api/mobile', this.router);
    }

    setupMiddleware() {
        // Mobile-specific compression
        this.router.use(compression({
            level: 6,
            threshold: 1024,
            filter: (req, res) => {
                if (req.headers['x-no-compression']) {
                    return false;
                }
                return compression.filter(req, res);
            }
        }));

        // Mobile detection and optimization
        this.router.use((req, res, next) => {
            const userAgent = req.get('User-Agent') || '';
            req.isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            req.isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
            req.connectionSpeed = req.get('X-Connection-Speed') || 'unknown';
            
            // Set mobile-optimized headers
            if (req.isMobile) {
                res.set({
                    'Cache-Control': 'public, max-age=300', // 5 minutes cache for mobile
                    'X-Mobile-Optimized': 'true'
                });
            }
            
            next();
        });

        // Authentication middleware
        this.router.use(async (req, res, next) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: 'Authentication token required'
                    });
                }

                const session = await this.remoteAccessManager.validateSession(token);
                req.user = { id: session.userId };
                req.session = session;
                
                next();
            } catch (error) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }
        });
    }

    setupRoutes() {
        // Mobile dashboard summary
        this.router.get('/dashboard/summary', this.getDashboardSummary.bind(this));
        
        // Mobile-optimized license data
        this.router.get('/licenses', this.getMobileLicenses.bind(this));
        this.router.get('/licenses/:id', this.getLicenseDetails.bind(this));
        
        // System stats for mobile
        this.router.get('/stats', this.getMobileStats.bind(this));
        
        // Quick actions
        this.router.post('/licenses/quick-create', this.quickCreateLicense.bind(this));
        this.router.patch('/licenses/:id/status', this.updateLicenseStatus.bind(this));
        
        // Mobile notifications
        this.router.get('/notifications', this.getMobileNotifications.bind(this));
        this.router.post('/notifications/send', this.sendMobileNotification.bind(this));
        
        // Security info for mobile
        this.router.get('/security/info', this.getMobileSecurityInfo.bind(this));
        this.router.post('/security/2fa/enable', this.enableMobile2FA.bind(this));
        
        // Offline sync endpoints
        this.router.get('/sync/data', this.getSyncData.bind(this));
        this.router.post('/sync/actions', this.processSyncActions.bind(this));
        
        // Mobile analytics
        this.router.get('/analytics/usage', this.getMobileAnalytics.bind(this));
    }

    async getDashboardSummary(req, res) {
        try {
            const summary = await this.generateMobileSummary(req);
            const optimized = this.optimizeForMobile(summary, req);
            
            res.json({
                success: true,
                data: optimized,
                cached: false,
                optimized: req.isMobile
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to load dashboard summary'
            });
        }
    }

    async generateMobileSummary(req) {
        // Generate condensed summary for mobile devices
        return {
            stats: {
                totalLicenses: 150,
                activeLicenses: 120,
                expiringLicenses: 15,
                recentActivity: 8
            },
            quickActions: [
                { id: 'create', label: 'Create License', icon: 'plus' },
                { id: 'search', label: 'Search', icon: 'search' },
                { id: 'notifications', label: 'Notifications', icon: 'bell', badge: 3 }
            ],
            recentLicenses: await this.getRecentLicenses(5), // Limit for mobile
            alerts: await this.getActiveAlerts(3), // Limit for mobile
            systemHealth: {
                status: 'healthy',
                uptime: '99.9%',
                lastCheck: new Date().toISOString()
            }
        };
    }

    async getMobileLicenses(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = req.isMobile ? 10 : 25; // Smaller pages for mobile
            const search = req.query.search || '';
            const status = req.query.status || '';
            
            const licenses = await this.fetchLicenses({
                page,
                limit,
                search,
                status,
                mobile: req.isMobile
            });
            
            const optimized = this.optimizeForMobile(licenses, req);
            
            res.json({
                success: true,
                data: optimized,
                pagination: {
                    page,
                    limit,
                    total: licenses.total,
                    pages: Math.ceil(licenses.total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to load licenses'
            });
        }
    }

    async getLicenseDetails(req, res) {
        try {
            const licenseId = req.params.id;
            const license = await this.fetchLicenseById(licenseId);
            
            if (!license) {
                return res.status(404).json({
                    success: false,
                    message: 'License not found'
                });
            }
            
            const optimized = this.optimizeForMobile(license, req);
            
            res.json({
                success: true,
                data: optimized
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to load license details'
            });
        }
    }

    async getMobileStats(req, res) {
        try {
            const stats = await this.generateMobileStats(req);
            const optimized = this.optimizeForMobile(stats, req);
            
            res.json({
                success: true,
                data: optimized,
                generatedAt: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to load statistics'
            });
        }
    }

    async generateMobileStats(req) {
        // Generate mobile-optimized statistics
        return {
            overview: {
                totalLicenses: 150,
                activeLicenses: 120,
                expiredLicenses: 20,
                trialLicenses: 10
            },
            trends: {
                thisMonth: {
                    created: 25,
                    activated: 22,
                    expired: 8
                },
                lastMonth: {
                    created: 30,
                    activated: 28,
                    expired: 12
                }
            },
            topPlans: [
                { name: 'Professional', count: 45, percentage: 30 },
                { name: 'Enterprise', count: 38, percentage: 25 },
                { name: 'Basic', count: 37, percentage: 25 }
            ],
            recentActivity: await this.getRecentActivity(10)
        };
    }

    async quickCreateLicense(req, res) {
        try {
            const { email, plan, duration } = req.body;
            
            // Validate required fields
            if (!email || !plan) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and plan are required'
                });
            }
            
            // Create license with minimal required data
            const license = await this.createQuickLicense({
                email,
                plan,
                duration: duration || '1 year',
                createdBy: req.user.id
            });
            
            res.json({
                success: true,
                data: license,
                message: 'License created successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to create license'
            });
        }
    }

    async updateLicenseStatus(req, res) {
        try {
            const licenseId = req.params.id;
            const { status } = req.body;
            
            const updatedLicense = await this.updateLicense(licenseId, { status });
            
            res.json({
                success: true,
                data: updatedLicense,
                message: 'License status updated'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to update license status'
            });
        }
    }

    async getMobileNotifications(req, res) {
        try {
            const limit = req.isMobile ? 20 : 50;
            const notifications = await this.fetchNotifications({
                limit,
                userId: req.user.id,
                mobile: true
            });
            
            const optimized = this.optimizeForMobile(notifications, req);
            
            res.json({
                success: true,
                data: optimized
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to load notifications'
            });
        }
    }

    async sendMobileNotification(req, res) {
        try {
            const { title, message, type, recipients } = req.body;
            
            const notification = await this.createNotification({
                title,
                message,
                type: type || 'info',
                recipients,
                sentBy: req.user.id,
                mobile: true
            });
            
            res.json({
                success: true,
                data: notification,
                message: 'Notification sent successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to send notification'
            });
        }
    }

    async getMobileSecurityInfo(req, res) {
        try {
            const securityInfo = await this.generateMobileSecurityInfo(req);
            const optimized = this.optimizeForMobile(securityInfo, req);
            
            res.json({
                success: true,
                data: optimized
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to load security information'
            });
        }
    }

    async generateMobileSecurityInfo(req) {
        const remoteStats = this.remoteAccessManager.getRemoteAccessStats();
        
        return {
            user: {
                lastLogin: new Date().toISOString(),
                loginCount: 45,
                twoFAEnabled: true
            },
            session: {
                createdAt: req.session.createdAt,
                lastActivity: req.session.lastActivity,
                isRemote: req.session.isRemote
            },
            security: {
                activeSessions: remoteStats.remoteActiveSessions,
                failedAttempts: remoteStats.failedAttempts,
                blockedIPs: remoteStats.blockedIPs
            },
            recentActivity: await this.getRecentSecurityActivity(5)
        };
    }

    async enableMobile2FA(req, res) {
        try {
            const { token } = req.body;
            
            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: '2FA token is required'
                });
            }
            
            const result = await this.enable2FA(req.user.id, token);
            
            res.json({
                success: true,
                data: result,
                message: '2FA enabled successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to enable 2FA'
            });
        }
    }

    async getSyncData(req, res) {
        try {
            const lastSync = req.query.lastSync ? new Date(req.query.lastSync) : null;
            const syncData = await this.generateSyncData(lastSync, req);
            
            res.json({
                success: true,
                data: syncData,
                syncTimestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to generate sync data'
            });
        }
    }

    async processSyncActions(req, res) {
        try {
            const { actions } = req.body;
            const results = await this.processBatchActions(actions, req.user.id);
            
            res.json({
                success: true,
                data: results,
                processed: actions.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to process sync actions'
            });
        }
    }

    async getMobileAnalytics(req, res) {
        try {
            const period = req.query.period || '7d';
            const analytics = await this.generateMobileAnalytics(period, req);
            
            res.json({
                success: true,
                data: analytics,
                period
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to load analytics'
            });
        }
    }

    // Optimization methods
    optimizeForMobile(data, req) {
        if (!req.isMobile) return data;
        
        const optimized = { ...data };
        
        // Remove unnecessary fields for mobile
        if (Array.isArray(optimized.items)) {
            optimized.items = optimized.items.map(item => this.stripNonEssentialFields(item));
        }
        
        // Compress images and reduce quality for slow connections
        if (req.connectionSpeed === 'slow' || req.connectionSpeed === '2g') {
            optimized.quality = 'low';
            optimized.compressed = true;
        }
        
        // Limit nested data
        if (optimized.details) {
            optimized.details = this.limitNestedData(optimized.details);
        }
        
        return optimized;
    }

    stripNonEssentialFields(item) {
        // Keep only essential fields for mobile display
        const essential = {
            id: item.id,
            name: item.name,
            status: item.status,
            createdAt: item.createdAt,
            expiresAt: item.expiresAt
        };
        
        return essential;
    }

    limitNestedData(details, maxDepth = 2) {
        // Limit the depth of nested objects to reduce payload size
        if (maxDepth <= 0) return '[truncated]';
        
        const limited = {};
        for (const [key, value] of Object.entries(details)) {
            if (typeof value === 'object' && value !== null) {
                limited[key] = this.limitNestedData(value, maxDepth - 1);
            } else {
                limited[key] = value;
            }
        }
        
        return limited;
    }

    // Mock data methods (replace with actual database calls)
    async fetchLicenses(options) {
        // Mock implementation
        return {
            items: [],
            total: 0
        };
    }

    async fetchLicenseById(id) {
        // Mock implementation
        return null;
    }

    async getRecentLicenses(limit) {
        // Mock implementation
        return [];
    }

    async getActiveAlerts(limit) {
        // Mock implementation
        return [];
    }

    async getRecentActivity(limit) {
        // Mock implementation
        return [];
    }

    async createQuickLicense(data) {
        // Mock implementation
        return { id: 'new-license-id', ...data };
    }

    async updateLicense(id, updates) {
        // Mock implementation
        return { id, ...updates };
    }

    async fetchNotifications(options) {
        // Mock implementation
        return [];
    }

    async createNotification(data) {
        // Mock implementation
        return { id: 'new-notification-id', ...data };
    }

    async getRecentSecurityActivity(limit) {
        // Mock implementation
        return [];
    }

    async enable2FA(userId, token) {
        // Mock implementation
        return { enabled: true };
    }

    async generateSyncData(lastSync, req) {
        // Mock implementation
        return {
            licenses: [],
            notifications: [],
            stats: {}
        };
    }

    async processBatchActions(actions, userId) {
        // Mock implementation
        return actions.map(action => ({ ...action, processed: true }));
    }

    async generateMobileAnalytics(period, req) {
        // Mock implementation
        return {
            usage: {},
            performance: {},
            errors: []
        };
    }
}

module.exports = { MobileAPI };