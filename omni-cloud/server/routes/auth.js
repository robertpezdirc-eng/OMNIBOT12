// 🔐 Auth Routes (Avtentikacija)
const express = require('express');
const { authenticateToken } = require('../middleware/auth.cjs');

// 📁 Controller funkcije
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

// 📝 Registracija
router.post('/register', register);

// 🔑 Prijava
router.post('/login', login);

// 👤 Profil uporabnika (zaščiteno)
router.get('/profile', authenticateToken, getProfile);

// ✏️ Posodobi profil (zaščiteno)
router.put('/profile', authenticateToken, updateProfile);

// 🔒 Spremeni geslo (zaščiteno)
router.put('/change-password', authenticateToken, changePassword);

// 🔄 Osveži žeton
router.post('/refresh', refreshToken);

// 🚪 Odjava
router.post('/logout', authenticateToken, logout);

// 📧 Pozabljeno geslo
router.post('/forgot-password', forgotPassword);

// 🔄 Ponastavitev gesla
router.post('/reset-password', resetPassword);

module.exports = router;