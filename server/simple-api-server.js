const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
let licenses = [
  {
    id: 1,
    client_id: 'test-client-1',
    license_key: 'ABC123DEF456',
    plan: 'premium',
    status: 'active',
    expires_at: '2024-12-31',
    created_at: '2024-01-01T00:00:00Z',
    features: ['api_access', 'premium_support']
  },
  {
    id: 2,
    client_id: 'test-client-2',
    license_key: 'XYZ789GHI012',
    plan: 'basic',
    status: 'active',
    expires_at: '2024-06-30',
    created_at: '2024-01-15T00:00:00Z',
    features: ['api_access']
  }
];

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

app.get('/api/license/all', (req, res) => {
  console.log('📋 Fetching all licenses');
  res.json(licenses);
});

app.get('/api/license/stats', (req, res) => {
  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.status === 'active').length,
    expired: licenses.filter(l => l.status === 'expired').length,
    inactive: licenses.filter(l => l.status === 'inactive').length
  };
  console.log('📊 Fetching stats:', stats);
  res.json(stats);
});

app.post('/api/license', (req, res) => {
  const { client_id, plan = 'basic', expires_at } = req.body;
  
  if (!client_id) {
    return res.status(400).json({ error: 'client_id is required' });
  }
  
  const newLicense = {
    id: licenses.length + 1,
    client_id,
    license_key: Math.random().toString(36).substring(2, 15).toUpperCase(),
    plan,
    status: 'active',
    expires_at,
    created_at: new Date().toISOString(),
    features: plan === 'premium' ? ['api_access', 'premium_support'] : ['api_access']
  };
  
  licenses.push(newLicense);
  console.log('✅ Created new license:', newLicense);
  res.status(201).json(newLicense);
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Simple API Server running!');
  console.log(`   Port: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API: http://localhost:${PORT}/api/license/all`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /api/license/all');
  console.log('   GET  /api/license/stats');
  console.log('   POST /api/license');
});