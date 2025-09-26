const express = require('express');
const router = express.Router();
const {
    validateLicense,
    generateToken,
    getLicenseInfo,
    getAllLicensesController,
    createLicense,
    toggleLicenseStatus,
    deleteLicenseController,
    extendLicense
} = require('../controllers/licenseController');

// Middleware za logiranje zahtev
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Body:', req.body);
    next();
});

/**
 * POST /api/license/validate
 * Validira licenco in vrne JWT token
 * 
 * Body:
 * - client_id (string, obvezno): ID klienta
 * - license_token (string, opcijsko): Obstoječi JWT token za validacijo
 */
router.post('/validate', validateLicense);

/**
 * POST /api/license/generate-token
 * Generira nov JWT token za obstoječo licenco
 * 
 * Body:
 * - client_id (string, obvezno): ID klienta
 */
router.post('/generate-token', generateToken);

/**
 * GET /api/license/info/:client_id
 * Vrne informacije o licenci
 * 
 * Params:
 * - client_id (string): ID klienta
 */
router.get('/info/:client_id', getLicenseInfo);

/**
 * GET /api/license/all
 * Vrne vse licence (admin funkcija)
 */
router.get('/all', getAllLicensesController);

/**
 * POST /api/license/create
 * Ustvari novo licenco (admin funkcija)
 * 
 * Body:
 * - client_id (string, obvezno): ID klienta
 * - plan (string, obvezno): Plan licence (demo, basic, premium)
 * - expires_in (number, obvezno): Veljavnost v dnevih
 */
router.post('/create', createLicense);

/**
 * POST /api/license/toggle
 * Preklopi status licence (admin funkcija)
 * 
 * Body:
 * - client_id (string, obvezno): ID klienta
 */
router.post('/toggle', toggleLicenseStatus);

/**
 * DELETE /api/license/delete
 * Briši licenco (admin funkcija)
 * 
 * Body:
 * - client_id (string, obvezno): ID klienta
 */
router.delete('/delete', deleteLicenseController);

/**
 * POST /api/license/extend
 * Podaljšaj licenco (admin funkcija)
 * 
 * Body:
 * - client_id (string, obvezno): ID klienta
 * - days (number, obvezno): Število dni za podaljšanje
 */
router.post('/extend', extendLicense);

/**
 * GET /api/license/status
 * Preveri status licenčnega API-ja
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        message: 'Licenčni API deluje',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router;