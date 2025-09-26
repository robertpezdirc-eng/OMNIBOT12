// 🌟 Omni AI Platform - License Routes
// API endpoints za upravljanje licenc

const express = require('express');
const router = express.Router();

class LicenseRoutes {
    constructor(licenseModel, authMiddleware, socketManager = null) {
        this.licenseModel = licenseModel;
        this.auth = authMiddleware;
        this.socketManager = socketManager;
        this.setupRoutes();
    }

    setupRoutes() {
        // Javni endpoint za preverjanje licence
        router.get('/check/:licenseKey', this.checkLicense.bind(this));
        
        // Aktivacija licence
        router.post('/activate', this.activateLicense.bind(this));
        
        // Zaščiteni endpoint-i (potrebna avtentikacija)
        router.use(this.auth.authenticate.bind(this.auth));
        
        // Ustvari novo licenco (samo admin)
        router.post('/create', 
            this.auth.requireRole(['admin']).bind(this.auth),
            this.createLicense.bind(this)
        );
        
        // Pridobi licence uporabnika
        router.get('/user/:userId?', this.getUserLicenses.bind(this));
        
        // Podaljšaj licenco (samo admin)
        router.put('/extend/:licenseKey',
            this.auth.requireRole(['admin']).bind(this.auth),
            this.extendLicense.bind(this)
        );
        
        // Prekliči licenco (samo admin)
        router.delete('/revoke/:licenseKey',
            this.auth.requireRole(['admin']).bind(this.auth),
            this.revokeLicense.bind(this)
        );
        
        // Posodobi uporabo licence
        router.put('/usage/:licenseKey', this.updateUsage.bind(this));
        
        // Pridobi statistike licenc (samo admin)
        router.get('/stats',
            this.auth.requireRole(['admin']).bind(this.auth),
            this.getLicenseStats.bind(this)
        );
        
        // Preveri potekle licence (samo admin)
        router.get('/expiring',
            this.auth.requireRole(['admin']).bind(this.auth),
            this.getExpiringLicenses.bind(this)
        );
        
        // Pridobi podrobnosti licence
        router.get('/:licenseKey/details',
            this.getLicenseDetails.bind(this)
        );
    }

    // Preveri veljavnost licence
    async checkLicense(req, res) {
        try {
            const { licenseKey } = req.params;
            
            if (!licenseKey) {
                return res.status(400).json({
                    success: false,
                    error: 'Licenčni ključ je obvezen'
                });
            }

            const result = await this.licenseModel.checkLicense(licenseKey);
            
            if (result.valid) {
                res.json({
                    success: true,
                    valid: true,
                    license: result.license
                });
            } else {
                res.status(400).json({
                    success: false,
                    valid: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Napaka pri preverjanju licence:', error);
            res.status(500).json({
                success: false,
                error: 'Notranja napaka strežnika'
            });
        }
    }

    // Aktiviraj licenco
    async activateLicense(req, res) {
        try {
            const { licenseKey, userId } = req.body;
            const metadata = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent')
            };

            if (!licenseKey || !userId) {
                return res.status(400).json({
                    success: false,
                    error: 'Licenčni ključ in ID uporabnika sta obvezna'
                });
            }

            const result = await this.licenseModel.activateLicense(licenseKey, userId, metadata);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: 'Licenca uspešno aktivirana',
                    license: result.license
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Napaka pri aktivaciji licence:', error);
            res.status(500).json({
                success: false,
                error: 'Notranja napaka strežnika'
            });
        }
    }

    // Ustvari novo licenco
    async createLicense(req, res) {
        try {
            const {
                userId,
                plan = 'basic',
                duration = 30,
                features = [],
                maxUsers = 1,
                customLimits = {}
            } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'ID uporabnika je obvezen'
                });
            }

            const result = await this.licenseModel.createLicense({
                userId,
                plan,
                duration,
                features,
                maxUsers,
                customLimits
            });

            if (result.success) {
                res.status(201).json({
                    success: true,
                    message: 'Licenca uspešno ustvarjena',
                    licenseId: result.licenseId,
                    license: result.license
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Napaka pri ustvarjanju licence:', error);
            res.status(500).json({
                success: false,
                error: 'Notranja napaka strežnika'
            });
        }
    }

    // Pridobi licence uporabnika
    async getUserLicenses(req, res) {
        try {
            const userId = req.params.userId || req.user.id;
            
            // Preveri, ali lahko uporabnik dostopa do licenc
            if (userId !== req.user.id && !req.user.roles.includes('admin')) {
                return res.status(403).json({
                    success: false,
                    error: 'Nemate dovoljenja za dostop do teh licenc'
                });
            }

            const licenses = await this.licenseModel.getUserLicenses(userId);
            
            res.json({
                success: true,
                licenses: licenses.map(license => ({
                    licenseKey: license.licenseKey,
                    plan: license.plan,
                    status: license.status,
                    features: license.features,
                    limits: license.limits,
                    usage: license.usage,
                    createdAt: license.createdAt,
                    expiresAt: license.expiresAt,
                    daysRemaining: Math.ceil((license.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
                }))
            });
        } catch (error) {
            console.error('Napaka pri pridobivanju licenc:', error);
            res.status(500).json({
                success: false,
                error: 'Notranja napaka strežnika'
            });
        }
    }

    // Podaljšaj licenco
    async extendLicense(req, res) {
        try {
            const { licenseKey } = req.params;
            const { additionalDays } = req.body;

            if (!additionalDays || additionalDays <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Število dodatnih dni mora biti pozitivno'
                });
            }

            const result = await this.licenseModel.extendLicense(licenseKey, additionalDays);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: `Licenca podaljšana za ${additionalDays} dni`,
                    newExpiryDate: result.newExpiryDate
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Napaka pri podaljšanju licence:', error);
            res.status(500).json({
                success: false,
                error: 'Notranja napaka strežnika'
            });
        }
    }

    // Prekliči licenco
    async revokeLicense(req, res) {
        try {
            const { licenseKey } = req.params;
            const { reason = 'Preklicano s strani administratorja' } = req.body;

            const result = await this.licenseModel.revokeLicense(licenseKey, reason);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: 'Licenca uspešno preklicana'
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Licenca ni bila najdena ali je že preklicana'
                });
            }
        } catch (error) {
            console.error('Napaka pri preklicu licence:', error);
            res.status(500).json({
                success: false,
                error: 'Notranja napaka strežnika'
            });
        }
    }

    // Posodobi uporabo licence
    async updateUsage(req, res) {
        try {
            const { licenseKey } = req.params;
            const usageData = req.body;

            const result = await this.licenseModel.updateUsage(licenseKey, usageData);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: 'Uporaba licence posodobljena'
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Napaka pri posodabljanju uporabe:', error);
            res.status(500).json({
                success: false,
                error: 'Notranja napaka strežnika'
            });
        }
    }

    // Pridobi statistike licenc
    async getLicenseStats(req, res) {
        try {
            const stats = await this.licenseModel.getLicenseStats();
            
            res.json({
                success: true,
                stats
            });
        } catch (error) {
            console.error('Napaka pri pridobivanju statistik:', error);
            res.status(500).json({
                success: false,
                error: 'Notranja napaka strežnika'
            });
        }
    }

    // Pridobi licence, ki bodo kmalu potekle
    async getExpiringLicenses(req, res) {
        try {
            const { daysAhead = 7 } = req.query;
            
            const expiringLicenses = await this.licenseModel.checkExpiringLicenses(parseInt(daysAhead));
            
            res.json({
                success: true,
                expiringLicenses: expiringLicenses.map(license => ({
                    licenseKey: license.licenseKey,
                    userId: license.userId,
                    plan: license.plan,
                    expiresAt: license.expiresAt,
                    daysRemaining: Math.ceil((license.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
                }))
            });
        } catch (error) {
            console.error('Napaka pri pridobivanju potekajočih licenc:', error);
            res.status(500).json({
                success: false,
                error: 'Notranja napaka strežnika'
            });
        }
    }

    // Pridobi podrobnosti licence
    async getLicenseDetails(req, res) {
        try {
            const { licenseKey } = req.params;
            
            const result = await this.licenseModel.checkLicense(licenseKey);
            
            if (result.valid) {
                // Dodatne podrobnosti za avtenticirane uporabnike
                if (req.user) {
                    const fullLicense = await this.licenseModel.collection.findOne({ licenseKey });
                    
                    // Preveri, ali lahko uporabnik dostopa do podrobnosti
                    if (fullLicense.userId.toString() === req.user.id || req.user.roles.includes('admin')) {
                        return res.json({
                            success: true,
                            license: {
                                ...result.license,
                                usage: fullLicense.usage,
                                metadata: fullLicense.metadata,
                                notifications: fullLicense.notifications
                            }
                        });
                    }
                }
                
                // Osnovne informacije za neautenticirane uporabnike
                res.json({
                    success: true,
                    license: result.license
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Napaka pri pridobivanju podrobnosti licence:', error);
            res.status(500).json({
                success: false,
                error: 'Notranja napaka strežnika'
            });
        }
    }

    getRouter() {
        return router;
    }
}

module.exports = LicenseRoutes;