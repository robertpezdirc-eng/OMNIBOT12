// 🌟 Omni AI Platform - Enhanced License Model
// Napredni licenčni sistem z aktivacijo, sledenjem in obveščanjem

const { ObjectId } = require('mongodb');
const crypto = require('crypto');

class License {
    constructor(db, socketManager = null) {
        this.db = db;
        this.collection = db.collection('licenses');
        this.socketManager = socketManager;
        this.initializeIndexes();
    }

    async initializeIndexes() {
        try {
            await this.collection.createIndex({ licenseKey: 1 }, { unique: true });
            await this.collection.createIndex({ userId: 1 });
            await this.collection.createIndex({ status: 1 });
            await this.collection.createIndex({ expiresAt: 1 });
            await this.collection.createIndex({ plan: 1 });
            await this.collection.createIndex({ createdAt: 1 });
            console.log('✅ License model indeksi uspešno ustvarjeni');
        } catch (error) {
            console.error('❌ Napaka pri ustvarjanju License indeksov:', error);
        }
    }

    // Generiraj unikaten licenčni ključ
    generateLicenseKey(plan = 'basic') {
        const prefix = plan.toUpperCase().substring(0, 3);
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex').toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    // Ustvari novo licenco
    async createLicense(licenseData) {
        try {
            const {
                userId,
                plan = 'basic',
                duration = 30, // dni
                features = [],
                maxUsers = 1,
                customLimits = {}
            } = licenseData;

            const licenseKey = this.generateLicenseKey(plan);
            const now = new Date();
            const expiresAt = new Date(now.getTime() + (duration * 24 * 60 * 60 * 1000));

            const newLicense = {
                licenseKey,
                userId: new ObjectId(userId),
                plan,
                status: 'active', // active, expired, suspended, revoked
                features: this.getPlanFeatures(plan, features),
                limits: {
                    maxUsers,
                    ...this.getPlanLimits(plan),
                    ...customLimits
                },
                usage: {
                    activeUsers: 0,
                    apiCalls: 0,
                    storage: 0,
                    lastUsed: null
                },
                createdAt: now,
                activatedAt: now,
                expiresAt,
                updatedAt: now,
                notifications: {
                    expiryWarning: false,
                    suspended: false,
                    renewed: false
                },
                metadata: {
                    activationIP: null,
                    userAgent: null,
                    activationCount: 1
                }
            };

            const result = await this.collection.insertOne(newLicense);
            
            // Pošlji obvestilo prek WebSocket
            if (this.socketManager) {
                this.socketManager.broadcastToRoom(`user_${userId}`, 'license_created', {
                    licenseKey,
                    plan,
                    expiresAt
                });
            }

            return {
                success: true,
                licenseId: result.insertedId,
                license: newLicense
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Aktiviraj licenco
    async activateLicense(licenseKey, userId, metadata = {}) {
        try {
            const license = await this.collection.findOne({ licenseKey });

            if (!license) {
                return { success: false, error: 'Licenčni ključ ni najden' };
            }

            if (license.status !== 'active') {
                return { success: false, error: 'Licenca ni aktivna' };
            }

            if (new Date() > license.expiresAt) {
                await this.collection.updateOne(
                    { _id: license._id },
                    { $set: { status: 'expired', updatedAt: new Date() } }
                );
                return { success: false, error: 'Licenca je potekla' };
            }

            // Posodobi licenco z aktivacijskimi podatki
            const updateData = {
                userId: new ObjectId(userId),
                'metadata.activationIP': metadata.ip,
                'metadata.userAgent': metadata.userAgent,
                'metadata.activationCount': license.metadata.activationCount + 1,
                activatedAt: new Date(),
                updatedAt: new Date()
            };

            await this.collection.updateOne(
                { _id: license._id },
                { $set: updateData }
            );

            // Pošlji obvestilo
            if (this.socketManager) {
                this.socketManager.broadcastToRoom(`user_${userId}`, 'license_activated', {
                    licenseKey,
                    plan: license.plan,
                    features: license.features
                });
            }

            return {
                success: true,
                license: {
                    ...license,
                    ...updateData
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Preveri veljavnost licence
    async checkLicense(licenseKey) {
        try {
            const license = await this.collection.findOne({ licenseKey });

            if (!license) {
                return { valid: false, error: 'Licenčni ključ ni najden' };
            }

            const now = new Date();
            const isExpired = now > license.expiresAt;

            if (isExpired && license.status === 'active') {
                await this.collection.updateOne(
                    { _id: license._id },
                    { $set: { status: 'expired', updatedAt: now } }
                );
                
                // Pošlji obvestilo o poteku
                if (this.socketManager) {
                    this.socketManager.broadcastToRoom(`user_${license.userId}`, 'license_expired', {
                        licenseKey,
                        expiredAt: license.expiresAt
                    });
                }

                return { valid: false, error: 'Licenca je potekla' };
            }

            if (license.status !== 'active') {
                return { valid: false, error: `Licenca je ${license.status}` };
            }

            // Posodobi zadnjo uporabo
            await this.collection.updateOne(
                { _id: license._id },
                { $set: { 'usage.lastUsed': now } }
            );

            return {
                valid: true,
                license: {
                    key: license.licenseKey,
                    plan: license.plan,
                    features: license.features,
                    limits: license.limits,
                    expiresAt: license.expiresAt,
                    daysRemaining: Math.ceil((license.expiresAt - now) / (1000 * 60 * 60 * 24))
                }
            };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Podaljšaj licenco
    async extendLicense(licenseKey, additionalDays) {
        try {
            const license = await this.collection.findOne({ licenseKey });

            if (!license) {
                return { success: false, error: 'Licenčni ključ ni najden' };
            }

            const newExpiryDate = new Date(license.expiresAt.getTime() + (additionalDays * 24 * 60 * 60 * 1000));

            const result = await this.collection.updateOne(
                { _id: license._id },
                { 
                    $set: { 
                        expiresAt: newExpiryDate,
                        status: 'active',
                        updatedAt: new Date(),
                        'notifications.renewed': true
                    } 
                }
            );

            if (this.socketManager) {
                this.socketManager.broadcastToRoom(`user_${license.userId}`, 'license_extended', {
                    licenseKey,
                    newExpiryDate,
                    additionalDays
                });
            }

            return { success: result.modifiedCount > 0, newExpiryDate };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Prekliči licenco
    async revokeLicense(licenseKey, reason = 'Manual revocation') {
        try {
            const result = await this.collection.updateOne(
                { licenseKey },
                { 
                    $set: { 
                        status: 'revoked',
                        revokedAt: new Date(),
                        revokeReason: reason,
                        updatedAt: new Date()
                    } 
                }
            );

            if (result.modifiedCount > 0) {
                const license = await this.collection.findOne({ licenseKey });
                
                if (this.socketManager && license) {
                    this.socketManager.broadcastToRoom(`user_${license.userId}`, 'license_revoked', {
                        licenseKey,
                        reason
                    });
                }
            }

            return { success: result.modifiedCount > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Pridobi licence uporabnika
    async getUserLicenses(userId) {
        try {
            const licenses = await this.collection
                .find({ userId: new ObjectId(userId) })
                .sort({ createdAt: -1 })
                .toArray();

            return licenses;
        } catch (error) {
            console.error('Napaka pri pridobivanju licenc:', error);
            return [];
        }
    }

    // Posodobi uporabo licence
    async updateUsage(licenseKey, usageData) {
        try {
            const updateFields = {};
            
            if (usageData.activeUsers !== undefined) {
                updateFields['usage.activeUsers'] = usageData.activeUsers;
            }
            if (usageData.apiCalls !== undefined) {
                updateFields['usage.apiCalls'] = usageData.apiCalls;
            }
            if (usageData.storage !== undefined) {
                updateFields['usage.storage'] = usageData.storage;
            }

            updateFields['usage.lastUsed'] = new Date();
            updateFields.updatedAt = new Date();

            const result = await this.collection.updateOne(
                { licenseKey },
                { $set: updateFields }
            );

            return { success: result.modifiedCount > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Preveri licence, ki bodo kmalu potekle
    async checkExpiringLicenses(daysAhead = 7) {
        try {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);

            const expiringLicenses = await this.collection
                .find({
                    status: 'active',
                    expiresAt: { $lte: futureDate },
                    'notifications.expiryWarning': false
                })
                .toArray();

            // Označi licence kot opozorjene in pošlji obvestila
            for (const license of expiringLicenses) {
                await this.collection.updateOne(
                    { _id: license._id },
                    { $set: { 'notifications.expiryWarning': true } }
                );

                if (this.socketManager) {
                    const daysRemaining = Math.ceil((license.expiresAt - new Date()) / (1000 * 60 * 60 * 24));
                    this.socketManager.broadcastToRoom(`user_${license.userId}`, 'license_expiry_warning', {
                        licenseKey: license.licenseKey,
                        daysRemaining,
                        expiresAt: license.expiresAt
                    });
                }
            }

            return expiringLicenses;
        } catch (error) {
            console.error('Napaka pri preverjanju potekajočih licenc:', error);
            return [];
        }
    }

    // Pridobi funkcionalnosti glede na plan
    getPlanFeatures(plan, customFeatures = []) {
        const planFeatures = {
            free: ['basic_support'],
            basic: ['basic_support', 'tourism_module', 'user_management'],
            premium: ['priority_support', 'tourism_module', 'user_management', 'camp_module', 'ecommerce_module'],
            enterprise: ['24_7_support', 'all_modules', 'custom_integrations', 'advanced_analytics']
        };

        return [...(planFeatures[plan] || planFeatures.free), ...customFeatures];
    }

    // Pridobi omejitve glede na plan
    getPlanLimits(plan) {
        const planLimits = {
            free: { maxUsers: 1, apiCallsPerDay: 100, storageGB: 1 },
            basic: { maxUsers: 5, apiCallsPerDay: 1000, storageGB: 10 },
            premium: { maxUsers: 25, apiCallsPerDay: 10000, storageGB: 100 },
            enterprise: { maxUsers: -1, apiCallsPerDay: -1, storageGB: -1 } // -1 = unlimited
        };

        return planLimits[plan] || planLimits.free;
    }

    // Statistike licenc
    async getLicenseStats() {
        try {
            const stats = await this.collection.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const planStats = await this.collection.aggregate([
                {
                    $group: {
                        _id: '$plan',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const totalLicenses = await this.collection.countDocuments();
            const activeLicenses = await this.collection.countDocuments({ status: 'active' });
            const expiringLicenses = await this.collection.countDocuments({
                status: 'active',
                expiresAt: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
            });

            return {
                total: totalLicenses,
                active: activeLicenses,
                expiring: expiringLicenses,
                byStatus: stats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {}),
                byPlan: planStats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {})
            };
        } catch (error) {
            console.error('Napaka pri pridobivanju statistik licenc:', error);
            return { total: 0, active: 0, expiring: 0, byStatus: {}, byPlan: {} };
        }
    }
}

module.exports = License;