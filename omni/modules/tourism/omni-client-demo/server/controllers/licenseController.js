const { 
    findLicenseByClientId, 
    isLicenseValid, 
    generateLicenseToken,
    getAllLicenses,
    addLicense,
    updateLicense,
    deleteLicense 
} = require('../models/licenseModel');
const { validateToken } = require('../utils/jwt');

// Import broadcast funkcije iz server.js
let broadcastLicenseUpdate;
try {
    const serverModule = require('../server');
    broadcastLicenseUpdate = serverModule.broadcastLicenseUpdate;
} catch (error) {
    console.warn('⚠️ Broadcast funkcija ni na voljo:', error.message);
    broadcastLicenseUpdate = () => {}; // Fallback funkcija
}

/**
 * Validira licenco in vrne JWT token
 * POST /api/license/validate
 */
async function validateLicense(req, res) {
    try {
        const { client_id, license_token } = req.body;

        // Preveri obvezne parametre
        if (!client_id) {
            return res.status(400).json({
                valid: false,
                message: 'client_id je obvezen parameter'
            });
        }

        // Če je poslan license_token, ga validiraj
        if (license_token) {
            const decoded = validateToken(license_token);
            
            if (!decoded) {
                return res.status(401).json({
                    valid: false,
                    message: 'Neveljaven ali potekel JWT token'
                });
            }

            // Preveri, ali se client_id ujema
            if (decoded.client_id !== client_id) {
                return res.status(401).json({
                    valid: false,
                    message: 'client_id se ne ujema s tokenom'
                });
            }

            // Vrni podatke iz tokena
            return res.json({
                valid: true,
                client_id: decoded.client_id,
                plan: decoded.plan,
                modules: decoded.modules,
                expires_at: decoded.expires_at,
                max_users: decoded.max_users,
                message: 'Licenca veljavna iz JWT tokena'
            });
        }

        // Če ni tokena, preveri licenco v bazi
        const license = findLicenseByClientId(client_id);
        
        if (!license) {
            return res.status(404).json({
                valid: false,
                message: 'Licenca za ta client_id ne obstaja'
            });
        }

        if (!isLicenseValid(license)) {
            return res.status(401).json({
                valid: false,
                message: license.status === 'expired' ? 'Licenca je potekla' : 'Licenca ni aktivna'
            });
        }

        // Generiraj nov JWT token
        const token = generateLicenseToken(license);

        res.json({
            valid: true,
            client_id: license.client_id,
            plan: license.plan,
            modules: license.modules,
            expires_at: license.expires_at,
            max_users: license.max_users,
            license_token: token,
            message: 'Licenca veljavna - nov JWT token generiran'
        });

    } catch (error) {
        console.error('Napaka pri validaciji licence:', error);
        res.status(500).json({
            valid: false,
            message: 'Interna napaka strežnika'
        });
    }
}

/**
 * Generiraj nov JWT token za obstoječo licenco
 * POST /api/license/generate-token
 */
async function generateToken(req, res) {
    try {
        const { client_id } = req.body;

        if (!client_id) {
            return res.status(400).json({
                success: false,
                message: 'client_id je obvezen parameter'
            });
        }

        const license = findLicenseByClientId(client_id);
        
        if (!license) {
            return res.status(404).json({
                success: false,
                message: 'Licenca ne obstaja'
            });
        }

        if (!isLicenseValid(license)) {
            return res.status(401).json({
                success: false,
                message: 'Licenca ni veljavna'
            });
        }

        const token = generateLicenseToken(license);

        res.json({
            success: true,
            client_id: license.client_id,
            license_token: token,
            expires_at: license.expires_at,
            message: 'JWT token uspešno generiran'
        });

    } catch (error) {
        console.error('Napaka pri generiranju tokena:', error);
        res.status(500).json({
            success: false,
            message: 'Interna napaka strežnika'
        });
    }
}

/**
 * Vrni informacije o licenci
 * GET /api/license/info/:client_id
 */
async function getLicenseInfo(req, res) {
    try {
        const { client_id } = req.params;

        const license = findLicenseByClientId(client_id);
        
        if (!license) {
            return res.status(404).json({
                success: false,
                message: 'Licenca ne obstaja'
            });
        }

        res.json({
            success: true,
            license: {
                client_id: license.client_id,
                plan: license.plan,
                status: license.status,
                expires_at: license.expires_at,
                modules: license.modules,
                max_users: license.max_users,
                created_at: license.created_at,
                is_valid: isLicenseValid(license)
            }
        });

    } catch (error) {
        console.error('Napaka pri pridobivanju informacij o licenci:', error);
        res.status(500).json({
            success: false,
            message: 'Interna napaka strežnika'
        });
    }
}

/**
 * Vrni vse licence (admin funkcija)
 * GET /api/license/all
 */
async function getAllLicensesController(req, res) {
    try {
        const licenses = getAllLicenses();
        
        // Prilagodi format za admin GUI
        const formattedLicenses = licenses.map(license => ({
            client_id: license.client_id,
            plan: license.plan,
            status: license.status,
            expires_at: license.expires_at,
            active_modules: license.modules,
            max_users: license.max_users,
            created_at: license.created_at,
            is_valid: isLicenseValid(license)
        }));
        
        res.json(formattedLicenses);

    } catch (error) {
        console.error('Napaka pri pridobivanju vseh licenc:', error);
        res.status(500).json({
            success: false,
            message: 'Interna napaka strežnika'
        });
    }
}

/**
 * Ustvari novo licenco (admin funkcija)
 * POST /api/license/create
 */
async function createLicense(req, res) {
    try {
        const { client_id, plan, expires_in } = req.body;

        // Preveri obvezne parametre
        if (!client_id || !plan || !expires_in) {
            return res.status(400).json({
                success: false,
                message: 'client_id, plan in expires_in so obvezni parametri'
            });
        }

        // Preveri, ali licenca že obstaja
        const existingLicense = findLicenseByClientId(client_id);
        if (existingLicense) {
            return res.status(409).json({
                success: false,
                message: 'Licenca za ta client_id že obstaja'
            });
        }

        // Določi module glede na plan
        let modules = [];
        let max_users = 1;
        
        switch (plan) {
            case 'demo':
                modules = ['ceniki', 'blagajna'];
                max_users = 5;
                break;
            case 'basic':
                modules = ['ceniki', 'blagajna', 'zaloge'];
                max_users = 10;
                break;
            case 'premium':
                modules = ['ceniki', 'blagajna', 'zaloge', 'AI_optimizacija'];
                max_users = 50;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Neveljaven plan. Možni plani: demo, basic, premium'
                });
        }

        // Izračunaj datum poteka
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expires_in);

        const newLicense = {
            client_id,
            plan,
            status: 'active',
            expires_at: expiryDate.toISOString().split('T')[0],
            modules,
            max_users
        };

        const createdLicense = addLicense(newLicense);

        // Obvesti vse povezane cliente o novi licenci
        if (broadcastLicenseUpdate) {
            broadcastLicenseUpdate(createdLicense);
        }

        res.json({
            success: true,
            message: 'Licenca uspešno ustvarjena',
            license: createdLicense
        });

    } catch (error) {
        console.error('Napaka pri ustvarjanju licence:', error);
        res.status(500).json({
            success: false,
            message: 'Interna napaka strežnika'
        });
    }
}

/**
 * Preklopi status licence (admin funkcija)
 * POST /api/license/toggle
 */
async function toggleLicenseStatus(req, res) {
    try {
        const { client_id } = req.body;

        if (!client_id) {
            return res.status(400).json({
                success: false,
                message: 'client_id je obvezen parameter'
            });
        }

        const license = findLicenseByClientId(client_id);
        if (!license) {
            return res.status(404).json({
                success: false,
                message: 'Licenca ne obstaja'
            });
        }

        const newStatus = license.status === 'active' ? 'inactive' : 'active';
        const updatedLicense = updateLicense(client_id, { status: newStatus });

        // Obvesti vse povezane cliente o spremembi statusa
        if (broadcastLicenseUpdate) {
            broadcastLicenseUpdate(updatedLicense);
        }

        res.json({
            success: true,
            message: `Status licence spremenjen na ${newStatus}`,
            license: updatedLicense
        });

    } catch (error) {
        console.error('Napaka pri preklapljanju statusa licence:', error);
        res.status(500).json({
            success: false,
            message: 'Interna napaka strežnika'
        });
    }
}

/**
 * Briši licenco (admin funkcija)
 * DELETE /api/license/delete
 */
async function deleteLicenseController(req, res) {
    try {
        const { client_id } = req.body;

        if (!client_id) {
            return res.status(400).json({
                success: false,
                message: 'client_id je obvezen parameter'
            });
        }

        const license = findLicenseByClientId(client_id);
        if (!license) {
            return res.status(404).json({
                success: false,
                message: 'Licenca ne obstaja'
            });
        }

        const deleted = deleteLicense(client_id);
        if (deleted) {
            // Obvesti vse povezane cliente o brisanju licence
            if (broadcastLicenseUpdate) {
                broadcastLicenseUpdate({ client_id, status: 'deleted', action: 'delete' });
            }

            res.json({
                success: true,
                message: 'Licenca uspešno izbrisana'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Napaka pri brisanju licence'
            });
        }

    } catch (error) {
        console.error('Napaka pri brisanju licence:', error);
        res.status(500).json({
            success: false,
            message: 'Interna napaka strežnika'
        });
    }
}

/**
 * Podaljšaj licenco (admin funkcija)
 * POST /api/license/extend
 */
async function extendLicense(req, res) {
    try {
        const { client_id, days } = req.body;

        if (!client_id || !days) {
            return res.status(400).json({
                success: false,
                message: 'client_id in days sta obvezna parametra'
            });
        }

        const license = findLicenseByClientId(client_id);
        if (!license) {
            return res.status(404).json({
                success: false,
                message: 'Licenca ne obstaja'
            });
        }

        // Podaljšaj datum poteka
        const currentExpiry = new Date(license.expires_at);
        currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));
        
        const updatedLicense = updateLicense(client_id, { 
            expires_at: currentExpiry.toISOString().split('T')[0],
            status: 'active' // Aktiviraj licenco, če je bila potekla
        });

        // Obvesti vse povezane cliente o podaljšanju licence
        if (broadcastLicenseUpdate) {
            broadcastLicenseUpdate(updatedLicense);
        }

        res.json({
            success: true,
            message: `Licenca podaljšana za ${days} dni`,
            license: updatedLicense
        });

    } catch (error) {
        console.error('Napaka pri podaljševanju licence:', error);
        res.status(500).json({
            success: false,
            message: 'Interna napaka strežnika'
        });
    }
}

module.exports = {
    validateLicense,
    generateToken,
    getLicenseInfo,
    getAllLicensesController,
    createLicense,
    toggleLicenseStatus,
    deleteLicenseController,
    extendLicense
};