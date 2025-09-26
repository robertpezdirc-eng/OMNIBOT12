const express = require('express');
const router = express.Router();
const { checkLicense, healthCheck, getLicenseInfo } = require('../controllers/licenseController');

// POST /api/license/validate - Validacija licence z JWT tokenom
router.post('/validate', checkLicense);

// GET /api/license/health - Health check
router.get('/health', healthCheck);

// GET /api/license/info/:client_id - Pridobi osnovne informacije o licenci
router.get('/info/:client_id', getLicenseInfo);

module.exports = router;