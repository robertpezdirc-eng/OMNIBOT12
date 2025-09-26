// 🏖️ Tourism Routes Module
const express = require('express');
const { authenticateToken, requireValidPlan } = require('../middleware/auth.cjs');
const {
  getDestinations,
  getDestination,
  createBooking,
  getBookings,
  updateBooking,
  cancelBooking,
  getTourismStats
} = require('../controllers/tourismController');

const router = express.Router();

// 🏖️ Pridobi vse destinacije
router.get('/destinations', getDestinations);

// 🏖️ Pridobi posamezno destinacijo
router.get('/destinations/:id', getDestination);

// 📅 Ustvari rezervacijo
router.post('/bookings', authenticateToken, requireValidPlan, createBooking);

// 📋 Pridobi uporabnikove rezervacije
router.get('/bookings', authenticateToken, getBookings);

// 🗑️ Prekliči rezervacijo
router.delete('/bookings/:id', authenticateToken, cancelBooking);

// 📊 Statistike turizma (samo za admin)
router.get('/stats', authenticateToken, getTourismStats);

module.exports = router;