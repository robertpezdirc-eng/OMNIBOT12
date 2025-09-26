const express = require('express');
const { authenticateToken } = require('../middleware/auth.cjs');
const {
  getLicensePackages,
  purchaseLicense,
  getUserLicenses,
  extendLicense,
  cancelLicense,
  validateLicense,
  getLicenseStats
} = require('../controllers/licenseController');

const router = express.Router();

// 📦 Pridobi licenčne pakete
router.get('/packages', getLicensePackages);

// 💳 Nakupi licenco
router.post('/purchase', authenticateToken, purchaseLicense);

// 📋 Pridobi uporabnikove licence
router.get('/my-licenses', authenticateToken, getUserLicenses);

// 🔄 Podaljšaj licenco
router.post('/extend/:id', authenticateToken, extendLicense);

// ❌ Prekliči licenco
router.delete('/cancel/:id', authenticateToken, cancelLicense);

// ✅ Validiraj licenco
router.post('/validate', validateLicense);

// 📊 Statistike licenc (samo za admin)
router.get('/stats', authenticateToken, getLicenseStats);

module.exports = router;