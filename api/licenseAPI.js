const express = require('express');
const jwt = require('jsonwebtoken');
const { License, DemoLicense, RevokedLicense } = require('../models/License');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Barvni izpis
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

const colorLog = (message, color = 'reset') => {
    console.log(`${colors[color] || colors.reset}${message}${colors.reset}`);
};

// Middleware za preverjanje JWT tokena
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Access token required' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, decoded) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid or expired token' 
            });
        }
        req.license = decoded;
        next();
    });
};

// 🔹 BATCH OPERACIJE ZA PERFORMANSE
// Množične posodobitve licenc z updateMany
router.post('/batch/extend', authenticateToken, async (req, res) => {
    try {
        const { licenseIds, extensionDays } = req.body;
        
        if (!licenseIds || !Array.isArray(licenseIds) || licenseIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Potreben je seznam licenčnih ID-jev'
            });
        }

        const extensionMs = (extensionDays || 30) * 24 * 60 * 60 * 1000;
        
        // Batch posodobitev z updateMany
        const result = await License.updateMany(
            { 
                _id: { $in: licenseIds },
                status: 'active'
            },
            { 
                $inc: { 
                    'validity.duration': extensionMs 
                },
                $set: { 
                    updatedAt: new Date(),
                    'metadata.lastExtended': new Date(),
                    'metadata.extensionCount': { $inc: 1 }
                }
            }
        );

        colorLog(`📦 Batch podaljšanje: ${result.modifiedCount}/${licenseIds.length} licenc`, 'green');

        res.json({
            success: true,
            message: `Podaljšanih ${result.modifiedCount} licenc`,
            data: {
                requested: licenseIds.length,
                modified: result.modifiedCount,
                extensionDays
            }
        });

    } catch (error) {
        colorLog(`❌ Napaka pri batch podaljšanju: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            message: 'Napaka pri batch podaljšanju licenc',
            error: error.message
        });
    }
});

// Batch preklic licenc
router.post('/batch/revoke', authenticateToken, async (req, res) => {
    try {
        const { licenseIds, reason } = req.body;
        
        if (!licenseIds || !Array.isArray(licenseIds)) {
            return res.status(400).json({
                success: false,
                message: 'Potreben je seznam licenčnih ID-jev'
            });
        }

        const result = await License.updateMany(
            { _id: { $in: licenseIds } },
            { 
                $set: { 
                    status: 'revoked',
                    revokedAt: new Date(),
                    revokeReason: reason || 'Batch revocation',
                    updatedAt: new Date()
                }
            }
        );

        colorLog(`🚫 Batch preklic: ${result.modifiedCount}/${licenseIds.length} licenc`, 'yellow');

        res.json({
            success: true,
            message: `Preklicanih ${result.modifiedCount} licenc`,
            data: {
                requested: licenseIds.length,
                modified: result.modifiedCount,
                reason
            }
        });

    } catch (error) {
        colorLog(`❌ Napaka pri batch preklicu: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            message: 'Napaka pri batch preklicu licenc',
            error: error.message
        });
    }
});

// Batch aktivacija licenc
router.post('/batch/activate', authenticateToken, async (req, res) => {
    try {
        const { licenseIds } = req.body;
        
        if (!licenseIds || !Array.isArray(licenseIds)) {
            return res.status(400).json({
                success: false,
                message: 'Potreben je seznam licenčnih ID-jev'
            });
        }

        const result = await License.updateMany(
            { 
                _id: { $in: licenseIds },
                status: { $in: ['pending', 'suspended'] }
            },
            { 
                $set: { 
                    status: 'active',
                    activatedAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );

        colorLog(`✅ Batch aktivacija: ${result.modifiedCount}/${licenseIds.length} licenc`, 'green');

        res.json({
            success: true,
            message: `Aktiviranih ${result.modifiedCount} licenc`,
            data: {
                requested: licenseIds.length,
                modified: result.modifiedCount
            }
        });

    } catch (error) {
        colorLog(`❌ Napaka pri batch aktivaciji: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            message: 'Napaka pri batch aktivaciji licenc',
            error: error.message
        });
    }
});

// Batch statistike
router.get('/batch/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await License.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$pricing.amount' }
                }
            },
            {
                $group: {
                    _id: null,
                    statusCounts: {
                        $push: {
                            status: '$_id',
                            count: '$count',
                            value: '$totalValue'
                        }
                    },
                    totalLicenses: { $sum: '$count' },
                    totalRevenue: { $sum: '$totalValue' }
                }
            }
        ]);

        res.json({
            success: true,
            data: stats[0] || {
                statusCounts: [],
                totalLicenses: 0,
                totalRevenue: 0
            }
        });

    } catch (error) {
        colorLog(`❌ Napaka pri batch statistikah: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            message: 'Napaka pri pridobivanju statistik',
            error: error.message
        });
    }
});

// 🔹 CREATE LICENSE - Ustvari novo licenco
router.post('/create', async (req, res) => {
    try {
        const { 
            client_id, 
            company_name, 
            contact_email, 
            plan = 'demo', 
            validity_days = 30, 
            modules = {} 
        } = req.body;
        
        colorLog(`📝 Zahteva za ustvarjanje licence`, 'blue', { 
            client_id, 
            company_name, 
            plan, 
            validity_days 
        });
        
        // Validacija obveznih polj
        if (!client_id) {
            return res.status(400).json({
                success: false,
                message: 'Client ID je obvezen parameter'
            });
        }
        
        if (!company_name) {
            return res.status(400).json({
                success: false,
                message: 'Ime podjetja je obvezen parameter'
            });
        }
        
        if (!contact_email) {
            return res.status(400).json({
                success: false,
                message: 'Kontaktni e-mail je obvezen parameter'
            });
        }
        
        // Validacija e-mail formata
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contact_email)) {
            return res.status(400).json({
                success: false,
                message: 'Neveljaven format e-mail naslova'
            });
        }
        
        // Validacija plana
        const validPlans = ['demo', 'basic', 'premium', 'enterprise'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({
                success: false,
                message: `Neveljaven plan. Dovoljeni: ${validPlans.join(', ')}`
            });
        }
        
        // Validacija validity_days
        if (validity_days < 1 || validity_days > 3650) {
            return res.status(400).json({
                success: false,
                message: 'Veljavnost mora biti med 1 in 3650 dni'
            });
        }
        
        // Preveri, če že obstaja aktivna licenca za client_id
        const existingLicense = await License.findOne({ 
            client_id, 
            status: 'active'
        });
        
        if (existingLicense) {
            colorLog(`⚠️ Aktivna licenca že obstaja za ${client_id}`, 'yellow');
            return res.status(409).json({
                success: false,
                message: 'Aktivna licenca za tega odjemalca že obstaja',
                existing_license: {
                    client_id: existingLicense.client_id,
                    plan: existingLicense.plan,
                    status: existingLicense.status,
                    expires_at: existingLicense.expires_at
                }
            });
        }
        
        // Nastavi datum poteka
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + validity_days);
        
        // Pripravi module konfiguracije glede na plan
        const defaultModules = {
            demo: {
                basic_features: true,
                advanced_features: false,
                premium_features: false,
                enterprise_features: false
            },
            basic: {
                basic_features: true,
                advanced_features: true,
                premium_features: false,
                enterprise_features: false
            },
            premium: {
                basic_features: true,
                advanced_features: true,
                premium_features: true,
                enterprise_features: false
            },
            enterprise: {
                basic_features: true,
                advanced_features: true,
                premium_features: true,
                enterprise_features: true
            }
        };
        
        const finalModules = { ...defaultModules[plan], ...modules };
        
        // Ustvari novo licenco
        const newLicense = new License({
            client_id,
            company_name,
            contact_email,
            plan,
            status: 'active',
            expires_at,
            modules: finalModules,
            created_at: new Date(),
            updated_at: new Date(),
            last_activity: new Date(),
            metadata: {
                created_by: 'admin_api',
                creation_ip: req.ip,
                user_agent: req.get('User-Agent') || 'Unknown'
            }
        });
        
        await newLicense.save();
        
        colorLog(`✅ Nova licenca uspešno ustvarjena`, 'green', {
            client_id: newLicense.client_id,
            company_name: newLicense.company_name,
            plan: newLicense.plan,
            expires_at: newLicense.expires_at
        });
        
        // Pošlji WebSocket dogodek (če je na voljo)
        try {
            const socketManager = require('../websocket/socketManager');
            if (socketManager && socketManager.broadcastLicenseUpdate) {
                socketManager.broadcastLicenseUpdate(newLicense, 'license_created');
            }
        } catch (error) {
            colorLog(`⚠️ WebSocket obvestilo ni bilo poslano: ${error.message}`, 'yellow');
        }
        
        res.status(201).json({
            success: true,
            message: 'Licenca uspešno ustvarjena',
            data: {
                client_id: newLicense.client_id,
                company_name: newLicense.company_name,
                contact_email: newLicense.contact_email,
                plan: newLicense.plan,
                status: newLicense.status,
                modules: newLicense.modules,
                expires_at: newLicense.expires_at,
                created_at: newLicense.created_at
            }
        });
        
    } catch (error) {
        colorLog(`❌ Napaka pri ustvarjanju licence: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            message: 'Napaka pri ustvarjanju licence',
            error: error.message
        });
    }
});

module.exports = router;