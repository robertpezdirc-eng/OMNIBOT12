require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Database setup
let db;
const dbPath = path.join(__dirname, 'data', 'test-licenses.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ SQLite connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ SQLite database connected successfully');
    console.log(`   Path: ${dbPath}`);
    
    // Create table
    db.run(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT UNIQUE NOT NULL,
        license_key TEXT UNIQUE NOT NULL,
        plan TEXT NOT NULL DEFAULT 'basic',
        status TEXT NOT NULL DEFAULT 'active',
        expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        features TEXT DEFAULT '[]'
      )
    `, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('✅ Licenses table ready');
        
        // Insert test data
        const testLicense = {
          client_id: 'test-client-001',
          license_key: crypto.randomBytes(16).toString('hex').toUpperCase(),
          plan: 'premium',
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          features: JSON.stringify(['basic_features', 'advanced_search', 'analytics'])
        };
        
        db.run(`
          INSERT OR IGNORE INTO licenses (client_id, license_key, plan, status, expires_at, features)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          testLicense.client_id,
          testLicense.license_key,
          testLicense.plan,
          testLicense.status,
          testLicense.expires_at,
          testLicense.features
        ], function(err) {
          if (err) {
            console.log('Test license already exists or error:', err.message);
          } else {
            console.log('✅ Test license created:', testLicense.client_id);
          }
        });
      }
    });
  }
});

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Get all licenses (for admin dashboard)
app.get('/api/license/all', (req, res) => {
  db.all('SELECT * FROM licenses ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching licenses:', err);
      return res.status(500).json({ error: 'Failed to fetch licenses' });
    }
    
    const licenses = rows.map(row => ({
      ...row,
      features: JSON.parse(row.features || '[]')
    }));
    
    res.json(licenses);
  });
});

// Get single license (backward compatibility)
app.get('/api/license', (req, res) => {
  db.all('SELECT * FROM licenses ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching licenses:', err);
      return res.status(500).json({ error: 'Failed to fetch licenses' });
    }
    
    const licenses = rows.map(row => ({
      ...row,
      features: JSON.parse(row.features || '[]')
    }));
    
    res.json(licenses);
  });
});

app.post('/api/license', (req, res) => {
  const { client_id, plan = 'basic', expires_at } = req.body;
  
  if (!client_id) {
    return res.status(400).json({ error: 'client_id is required' });
  }
  
  const license_key = crypto.randomBytes(16).toString('hex').toUpperCase();
  
  db.run(`
    INSERT INTO licenses (client_id, license_key, plan, expires_at)
    VALUES (?, ?, ?, ?)
  `, [client_id, license_key, plan, expires_at], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Client ID already exists' });
      }
      return res.status(500).json({ error: 'Failed to create license' });
    }
    
    res.status(201).json({
      id: this.lastID,
      client_id,
      license_key,
      plan,
      status: 'active',
      expires_at,
      created_at: new Date().toISOString()
    });
  });
});

app.get('/api/license/stats', (req, res) => {
  const stats = {};
  
  db.get('SELECT COUNT(*) as total FROM licenses', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to get statistics' });
    }
    
    stats.total = row.total;
    
    db.get('SELECT COUNT(*) as active FROM licenses WHERE status = "active"', [], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get statistics' });
      }
      
      stats.active = row.active;
      stats.expired = stats.total - stats.active;
      
      res.json(stats);
    });
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('🚀 Test server running successfully!');
  console.log(`   Port: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API: http://localhost:${PORT}/api/license`);
});