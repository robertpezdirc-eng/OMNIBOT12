// 🍽️ Horeca Routes Module (Gostinstvo)
const express = require('express');
const { authenticateToken, requireValidPlan } = require('../middleware/auth.cjs');
const {
  getMenu,
  getMenuItem,
  createOrder,
  getOrders,
  updateOrderStatus,
  getTables,
  reserveTable,
  getHorecaStats
} = require('../controllers/horecaController');

const router = express.Router();

// Demo podatki za gostinstvo
const demoMenuItems = [
  {
    id: 1,
    name: 'Kranjska klobasa',
    description: 'Tradicionalna slovenska klobasa s kislim zeljem',
    price: 12.50,
    category: 'glavne_jedi',
    image: '/images/kranjska.jpg',
    available: true,
    allergens: ['gluten'],
    preparationTime: 15
  },
  {
    id: 2,
    name: 'Štruklji',
    description: 'Domači štruklji z skuto in smetano',
    price: 8.90,
    category: 'sladice',
    image: '/images/struklji.jpg',
    available: true,
    allergens: ['gluten', 'mleko'],
    preparationTime: 20
  },
  {
    id: 3,
    name: 'Jota',
    description: 'Tradicionalna slovenska enolončnica',
    price: 7.50,
    category: 'juhe',
    image: '/images/jota.jpg',
    available: true,
    allergens: [],
    preparationTime: 10
  },
  {
    id: 4,
    name: 'Postrv na žaru',
    description: 'Sveža postrv z zelišči in limono',
    price: 18.00,
    category: 'glavne_jedi',
    image: '/images/postrv.jpg',
    available: true,
    allergens: ['ribe'],
    preparationTime: 25
  },
  {
    id: 5,
    name: 'Prekmurska gibanica',
    description: 'Tradicionalna slovenska sladica',
    price: 6.50,
    category: 'sladice',
    image: '/images/gibanica.jpg',
    available: true,
    allergens: ['gluten', 'mleko', 'jajca'],
    preparationTime: 5
  }
];

const demoOrders = [];
const demoTables = [
  { id: 1, number: 1, seats: 4, status: 'available' },
  { id: 2, number: 2, seats: 2, status: 'occupied' },
  { id: 3, number: 3, seats: 6, status: 'available' },
  { id: 4, number: 4, seats: 4, status: 'reserved' },
  { id: 5, number: 5, seats: 8, status: 'available' }
];

// 🍽️ Pridobi meni
router.get('/menu', getMenu);

// 🍽️ Pridobi posamezno jed
router.get('/menu/:id', getMenuItem);

// 🛒 Ustvari naročilo
router.post('/orders', authenticateToken, requireValidPlan, createOrder);

// 📋 Pridobi naročila
router.get('/orders', authenticateToken, getOrders);

// ✏️ Posodobi status naročila
router.put('/orders/:id/status', authenticateToken, updateOrderStatus);

// 🪑 Pridobi stanje miz
router.get('/tables', getTables);

// 📅 Rezerviraj mizo
router.post('/tables/:id/reserve', authenticateToken, requireValidPlan, reserveTable);

// 📊 Statistike gostinstva (samo za admin)
router.get('/stats', authenticateToken, getHorecaStats);

module.exports = router;