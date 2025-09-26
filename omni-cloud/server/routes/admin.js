const express = require('express');
const { authenticateToken } = require('../middleware/auth.cjs');
const {
  getDashboard,
  getUsers,
  updateUserStatus,
  deleteUser,
  getSystemSettings,
  updateSystemSettings,
  getReports,
  getActivities
} = require('../controllers/adminController');

const router = express.Router();

// 📊 Admin Dashboard
router.get('/dashboard', authenticateToken, getDashboard);

// 👥 Upravljanje uporabnikov
router.get('/users', authenticateToken, getUsers);

// ✏️ Posodobi status uporabnika
router.put('/users/:id/status', authenticateToken, updateUserStatus);

// 🗑️ Izbriši uporabnika
router.delete('/users/:id', authenticateToken, deleteUser);

// ⚙️ Sistemske nastavitve
router.get('/settings', authenticateToken, getSystemSettings);

// ⚙️ Posodobi sistemske nastavitve
router.put('/settings', authenticateToken, updateSystemSettings);

// 📈 Poročila
router.get('/reports', authenticateToken, getReports);

// 📋 Aktivnosti
router.get('/activities', authenticateToken, getActivities);

module.exports = router;