const { License } = require('../models/License');
const { Notification } = require('../models/Notification');
const fs = require('fs').promises;
const path = require('path');

/**
 * Analytics Service - celovita analitika in poročila za licenčni sistem
 */
class AnalyticsService {
    constructor() {
        this.reportCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minut
        this.reportsDir = path.join(__dirname, '../reports');
        this.initializeReportsDirectory();
    }

    /**
     * Inicializacija direktorija za poročila
     */
    async initializeReportsDirectory() {
        try {
            await fs.mkdir(this.reportsDir, { recursive: true });
            console.log('✅ Direktorij za poročila inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji direktorija za poročila:', error);
        }
    }

    /**
     * Pridobi osnovne statistike licenc
     */
    async getLicenseStats(dateRange = null) {
        const cacheKey = `license_stats_${dateRange ? dateRange.start + '_' + dateRange.end : 'all'}`;
        
        if (this.reportCache.has(cacheKey)) {
            const cached = this.reportCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const matchStage = {};
            if (dateRange) {
                matchStage.createdAt = {
                    $gte: new Date(dateRange.start),
                    $lte: new Date(dateRange.end)
                };
            }

            // Osnovne statistike
            const totalLicenses = await License.countDocuments(matchStage);
            const activeLicenses = await License.countDocuments({ ...matchStage, status: 'active' });
            const suspendedLicenses = await License.countDocuments({ ...matchStage, status: 'suspended' });
            const expiredLicenses = await License.countDocuments({ ...matchStage, status: 'expired' });

            // Statistike po planih
            const planStats = await License.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$plan',
                        count: { $sum: 1 },
                        active: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        }
                    }
                }
            ]);

            // Statistike po mesecih (zadnjih 12 mesecev)
            const monthlyStats = await this.getMonthlyLicenseStats();

            // Prihajajoči poteki (naslednji 30 dni)
            const upcomingExpiries = await this.getUpcomingExpiries();

            const stats = {
                overview: {
                    total: totalLicenses,
                    active: activeLicenses,
                    suspended: suspendedLicenses,
                    expired: expiredLicenses,
                    activePercentage: totalLicenses > 0 ? ((activeLicenses / totalLicenses) * 100).toFixed(2) : 0
                },
                planDistribution: planStats.reduce((acc, plan) => {
                    acc[plan._id] = {
                        total: plan.count,
                        active: plan.active,
                        activeRate: plan.count > 0 ? ((plan.active / plan.count) * 100).toFixed(2) : 0
                    };
                    return acc;
                }, {}),
                monthlyTrends: monthlyStats,
                upcomingExpiries: upcomingExpiries,
                generatedAt: new Date().toISOString()
            };

            // Shrani v cache
            this.reportCache.set(cacheKey, {
                data: stats,
                timestamp: Date.now()
            });

            return stats;
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju statistik licenc:', error);
            throw error;
        }
    }

    /**
     * Pridobi mesečne statistike licenc
     */
    async getMonthlyLicenseStats() {
        try {
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

            const monthlyData = await License.aggregate([
                {
                    $match: {
                        createdAt: { $gte: twelveMonthsAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        newLicenses: { $sum: 1 },
                        activeLicenses: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        }
                    }
                },
                {
                    $sort: { '_id.year': 1, '_id.month': 1 }
                }
            ]);

            return monthlyData.map(item => ({
                period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
                newLicenses: item.newLicenses,
                activeLicenses: item.activeLicenses
            }));
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju mesečnih statistik:', error);
            return [];
        }
    }

    /**
     * Pridobi licence, ki bodo kmalu potekle
     */
    async getUpcomingExpiries(days = 30) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + days);

            const upcomingExpiries = await License.find({
                status: 'active',
                expiresAt: {
                    $gte: now,
                    $lte: futureDate
                }
            }).select('clientId plan expiresAt createdAt').sort({ expiresAt: 1 });

            return upcomingExpiries.map(license => ({
                clientId: license.clientId,
                plan: license.plan,
                expiresAt: license.expiresAt,
                daysUntilExpiry: Math.ceil((license.expiresAt - now) / (1000 * 60 * 60 * 24))
            }));
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju prihajajoči potekov:', error);
            return [];
        }
    }

    /**
     * Pridobi statistike obvestil
     */
    async getNotificationStats(dateRange = null) {
        try {
            const matchStage = {};
            if (dateRange) {
                matchStage.createdAt = {
                    $gte: new Date(dateRange.start),
                    $lte: new Date(dateRange.end)
                };
            }

            const notificationStats = await Notification.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            type: '$type',
                            status: '$status'
                        },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const stats = {
                total: 0,
                byType: {},
                byStatus: {},
                deliveryRate: 0
            };

            let totalSent = 0;
            let totalDelivered = 0;

            notificationStats.forEach(stat => {
                const { type, status } = stat._id;
                const count = stat.count;

                stats.total += count;

                if (!stats.byType[type]) {
                    stats.byType[type] = { total: 0, sent: 0, delivered: 0, failed: 0 };
                }
                stats.byType[type].total += count;
                stats.byType[type][status] = (stats.byType[type][status] || 0) + count;

                if (!stats.byStatus[status]) {
                    stats.byStatus[status] = 0;
                }
                stats.byStatus[status] += count;

                if (status === 'sent') totalSent += count;
                if (status === 'delivered') totalDelivered += count;
            });

            stats.deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : 0;

            return stats;
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju statistik obvestil:', error);
            throw error;
        }
    }

    /**
     * Generiraj celovito poročilo
     */
    async generateComprehensiveReport(options = {}) {
        try {
            const {
                dateRange = null,
                includeCharts = true,
                format = 'json'
            } = options;

            const report = {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    dateRange: dateRange,
                    reportType: 'comprehensive'
                },
                licenseAnalytics: await this.getLicenseStats(dateRange),
                notificationAnalytics: await this.getNotificationStats(dateRange),
                systemHealth: await this.getSystemHealthMetrics(),
                recommendations: await this.generateRecommendations()
            };

            // Shrani poročilo
            const filename = `comprehensive_report_${Date.now()}.${format}`;
            const filepath = path.join(this.reportsDir, filename);

            if (format === 'json') {
                await fs.writeFile(filepath, JSON.stringify(report, null, 2));
            } else if (format === 'html') {
                const htmlReport = await this.generateHTMLReport(report);
                await fs.writeFile(filepath, htmlReport);
            }

            console.log(`✅ Celovito poročilo generirano: ${filename}`);
            return { report, filename, filepath };
        } catch (error) {
            console.error('❌ Napaka pri generiranju celovitega poročila:', error);
            throw error;
        }
    }

    /**
     * Pridobi metrike zdravja sistema
     */
    async getSystemHealthMetrics() {
        try {
            const now = new Date();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Aktivnost v zadnjih 24 urah
            const recentActivity = {
                newLicenses: await License.countDocuments({
                    createdAt: { $gte: last24Hours }
                }),
                licenseChecks: await this.getLicenseCheckCount(last24Hours),
                notificationsSent: await Notification.countDocuments({
                    createdAt: { $gte: last24Hours },
                    status: 'sent'
                })
            };

            // Povprečni odzivni čas (simuliran)
            const avgResponseTime = Math.floor(Math.random() * 100) + 50; // ms

            // Uporaba pomnilnika (simulirana)
            const memoryUsage = {
                used: Math.floor(Math.random() * 500) + 200, // MB
                total: 1024, // MB
                percentage: 0
            };
            memoryUsage.percentage = ((memoryUsage.used / memoryUsage.total) * 100).toFixed(2);

            return {
                uptime: process.uptime(),
                recentActivity,
                performance: {
                    avgResponseTime,
                    memoryUsage
                },
                status: 'healthy'
            };
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju metrik zdravja sistema:', error);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * Generiraj priporočila na podlagi analitike
     */
    async generateRecommendations() {
        try {
            const recommendations = [];
            const stats = await this.getLicenseStats();

            // Priporočila na podlagi aktivnih licenc
            if (stats.overview.activePercentage < 70) {
                recommendations.push({
                    type: 'warning',
                    category: 'license_health',
                    title: 'Nizka stopnja aktivnih licenc',
                    description: `Samo ${stats.overview.activePercentage}% licenc je aktivnih. Razmislite o kontaktiranju neaktivnih uporabnikov.`,
                    priority: 'high'
                });
            }

            // Priporočila za prihajajoče poteke
            if (stats.upcomingExpiries.length > 10) {
                recommendations.push({
                    type: 'info',
                    category: 'expiry_management',
                    title: 'Veliko prihajajoči potekov',
                    description: `${stats.upcomingExpiries.length} licenc bo poteklo v naslednjih 30 dneh. Pripravite kampanjo za podaljšanje.`,
                    priority: 'medium'
                });
            }

            // Priporočila za planove
            const mostPopularPlan = Object.entries(stats.planDistribution)
                .sort(([,a], [,b]) => b.total - a.total)[0];
            
            if (mostPopularPlan) {
                recommendations.push({
                    type: 'success',
                    category: 'plan_optimization',
                    title: 'Najpopularnejši plan',
                    description: `Plan "${mostPopularPlan[0]}" je najpopularnejši z ${mostPopularPlan[1].total} licencami. Razmislite o optimizaciji tega plana.`,
                    priority: 'low'
                });
            }

            return recommendations;
        } catch (error) {
            console.error('❌ Napaka pri generiranju priporočil:', error);
            return [];
        }
    }

    /**
     * Generiraj HTML poročilo
     */
    async generateHTMLReport(report) {
        const html = `
        <!DOCTYPE html>
        <html lang="sl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Celovito poročilo - Omni License System</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #667eea; }
                .header h1 { color: #667eea; margin: 0; }
                .header p { color: #666; margin: 5px 0; }
                .section { margin-bottom: 40px; }
                .section h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
                .stat-card { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; text-align: center; }
                .stat-card h3 { margin: 0 0 10px 0; font-size: 2em; }
                .stat-card p { margin: 0; opacity: 0.9; }
                .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
                .table th { background: #f8f9fa; font-weight: bold; }
                .recommendations { background: #f8f9fa; padding: 20px; border-radius: 8px; }
                .recommendation { margin: 10px 0; padding: 15px; border-left: 4px solid #667eea; background: white; }
                .recommendation.warning { border-left-color: #ff9800; }
                .recommendation.success { border-left-color: #4caf50; }
                .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Celovito poročilo</h1>
                    <p>Omni License System</p>
                    <p>Generirano: ${new Date(report.metadata.generatedAt).toLocaleString('sl-SI')}</p>
                </div>

                <div class="section">
                    <h2>📈 Pregled licenc</h2>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>${report.licenseAnalytics.overview.total}</h3>
                            <p>Skupaj licenc</p>
                        </div>
                        <div class="stat-card">
                            <h3>${report.licenseAnalytics.overview.active}</h3>
                            <p>Aktivne licence</p>
                        </div>
                        <div class="stat-card">
                            <h3>${report.licenseAnalytics.overview.activePercentage}%</h3>
                            <p>Stopnja aktivnosti</p>
                        </div>
                        <div class="stat-card">
                            <h3>${report.licenseAnalytics.upcomingExpiries.length}</h3>
                            <p>Prihajajoči poteki</p>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>📧 Statistike obvestil</h2>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Število</th>
                                <th>Odstotek</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(report.notificationAnalytics.byStatus || {}).map(([status, count]) => `
                                <tr>
                                    <td>${status}</td>
                                    <td>${count}</td>
                                    <td>${((count / report.notificationAnalytics.total) * 100).toFixed(2)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h2>💡 Priporočila</h2>
                    <div class="recommendations">
                        ${report.recommendations.map(rec => `
                            <div class="recommendation ${rec.type}">
                                <h4>${rec.title}</h4>
                                <p>${rec.description}</p>
                                <small>Prioriteta: ${rec.priority}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="footer">
                    <p>© 2024 Omni License System | Generirano avtomatsko</p>
                </div>
            </div>
        </body>
        </html>
        `;

        return html;
    }

    /**
     * Pridobi število preverjanj licenc (simulirano)
     */
    async getLicenseCheckCount(since) {
        // V produkciji bi to bilo dejansko število API klicev
        return Math.floor(Math.random() * 1000) + 500;
    }

    /**
     * Počisti cache poročil
     */
    clearCache() {
        this.reportCache.clear();
        console.log('✅ Cache poročil počiščen');
    }

    /**
     * Pridobi seznam shranjenih poročil
     */
    async getSavedReports() {
        try {
            const files = await fs.readdir(this.reportsDir);
            const reports = [];

            for (const file of files) {
                const filepath = path.join(this.reportsDir, file);
                const stats = await fs.stat(filepath);
                
                reports.push({
                    filename: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime
                });
            }

            return reports.sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju shranjenih poročil:', error);
            return [];
        }
    }

    /**
     * Izbriši staro poročilo
     */
    async deleteReport(filename) {
        try {
            const filepath = path.join(this.reportsDir, filename);
            await fs.unlink(filepath);
            console.log(`✅ Poročilo izbrisano: ${filename}`);
            return true;
        } catch (error) {
            console.error(`❌ Napaka pri brisanju poročila ${filename}:`, error);
            return false;
        }
    }
}

module.exports = new AnalyticsService();