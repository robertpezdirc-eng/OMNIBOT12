const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Simple license routes for SQLite
let db; // Will be set from main server

const setDatabase = (database) => {
  db = database;
};

// Get all licenses
router.get('/', async (req, res) => {
  try {
    db.all('SELECT * FROM licenses ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        console.error('Error fetching licenses:', err);
        return res.status(500).json({ error: 'Failed to fetch licenses' });
      }
      
      // Parse JSON fields
      const licenses = rows.map(row => ({
        ...row,
        features: JSON.parse(row.features || '[]'),
        metadata: JSON.parse(row.metadata || '{}')
      }));
      
      res.json(licenses);
    });
  } catch (error) {
    console.error('Error in get licenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new license
router.post('/', async (req, res) => {
  try {
    const { client_id, plan = 'basic', expires_at, features = [], metadata = {} } = req.body;
    
    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }
    
    // Generate license key
    const license_key = crypto.randomBytes(16).toString('hex').toUpperCase();
    
    const stmt = db.prepare(`
      INSERT INTO licenses (client_id, license_key, plan, expires_at, features, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      client_id,
      license_key,
      plan,
      expires_at,
      JSON.stringify(features),
      JSON.stringify(metadata)
    ], function(err) {
      if (err) {
        console.error('Error creating license:', err);
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({ error: 'Client ID already exists' });
        }
        return res.status(500).json({ error: 'Failed to create license' });
      }
      
      // Log audit
      db.run(`
        INSERT INTO audit_logs (action, client_id, details, ip_address)
        VALUES (?, ?, ?, ?)
      `, [
        'license_created',
        client_id,
        JSON.stringify({ plan, license_key }),
        req.ip
      ]);
      
      res.status(201).json({
        id: this.lastID,
        client_id,
        license_key,
        plan,
        status: 'active',
        expires_at,
        features,
        metadata,
        created_at: new Date().toISOString()
      });
    });
    
    stmt.finalize();
  } catch (error) {
    console.error('Error in create license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate license
router.post('/validate', async (req, res) => {
  try {
    const { license_key, client_id } = req.body;
    
    if (!license_key || !client_id) {
      return res.status(400).json({ 
        valid: false, 
        error: 'license_key and client_id are required' 
      });
    }
    
    db.get(`
      SELECT * FROM licenses 
      WHERE license_key = ? AND client_id = ?
    `, [license_key, client_id], (err, row) => {
      if (err) {
        console.error('Error validating license:', err);
        return res.status(500).json({ valid: false, error: 'Validation failed' });
      }
      
      if (!row) {
        return res.json({ valid: false, error: 'Invalid license' });
      }
      
      // Check if expired
      const isExpired = row.expires_at && new Date(row.expires_at) < new Date();
      const isActive = row.status === 'active';
      
      // Log validation attempt
      db.run(`
        INSERT INTO audit_logs (action, client_id, details, ip_address)
        VALUES (?, ?, ?, ?)
      `, [
        'license_validated',
        client_id,
        JSON.stringify({ 
          license_key, 
          valid: isActive && !isExpired,
          expired: isExpired,
          status: row.status
        }),
        req.ip
      ]);
      
      if (!isActive) {
        return res.json({ 
          valid: false, 
          error: 'License is not active',
          status: row.status
        });
      }
      
      if (isExpired) {
        return res.json({ 
          valid: false, 
          error: 'License has expired',
          expires_at: row.expires_at
        });
      }
      
      res.json({
        valid: true,
        license: {
          client_id: row.client_id,
          plan: row.plan,
          status: row.status,
          expires_at: row.expires_at,
          features: JSON.parse(row.features || '[]'),
          metadata: JSON.parse(row.metadata || '{}')
        }
      });
    });
  } catch (error) {
    console.error('Error in validate license:', error);
    res.status(500).json({ valid: false, error: 'Internal server error' });
  }
});

// Update license
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, status, expires_at, features, metadata } = req.body;
    
    const updates = [];
    const values = [];
    
    if (plan) {
      updates.push('plan = ?');
      values.push(plan);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (expires_at !== undefined) {
      updates.push('expires_at = ?');
      values.push(expires_at);
    }
    if (features) {
      updates.push('features = ?');
      values.push(JSON.stringify(features));
    }
    if (metadata) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(metadata));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const sql = `UPDATE licenses SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(sql, values, function(err) {
      if (err) {
        console.error('Error updating license:', err);
        return res.status(500).json({ error: 'Failed to update license' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'License not found' });
      }
      
      // Get updated license
      db.get('SELECT * FROM licenses WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error('Error fetching updated license:', err);
          return res.status(500).json({ error: 'Update successful but failed to fetch updated data' });
        }
        
        const license = {
          ...row,
          features: JSON.parse(row.features || '[]'),
          metadata: JSON.parse(row.metadata || '{}')
        };
        
        // Log audit
        db.run(`
          INSERT INTO audit_logs (action, client_id, details, ip_address)
          VALUES (?, ?, ?, ?)
        `, [
          'license_updated',
          row.client_id,
          JSON.stringify({ id, updates: req.body }),
          req.ip
        ]);
        
        res.json(license);
      });
    });
  } catch (error) {
    console.error('Error in update license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete license
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the license for audit log
    db.get('SELECT * FROM licenses WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error fetching license for deletion:', err);
        return res.status(500).json({ error: 'Failed to delete license' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'License not found' });
      }
      
      // Delete the license
      db.run('DELETE FROM licenses WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Error deleting license:', err);
          return res.status(500).json({ error: 'Failed to delete license' });
        }
        
        // Log audit
        db.run(`
          INSERT INTO audit_logs (action, client_id, details, ip_address)
          VALUES (?, ?, ?, ?)
        `, [
          'license_deleted',
          row.client_id,
          JSON.stringify({ id, license_key: row.license_key }),
          req.ip
        ]);
        
        res.json({ message: 'License deleted successfully' });
      });
    });
  } catch (error) {
    console.error('Error in delete license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {};
    
    // Total licenses
    db.get('SELECT COUNT(*) as total FROM licenses', [], (err, row) => {
      if (err) {
        console.error('Error getting total licenses:', err);
        return res.status(500).json({ error: 'Failed to get statistics' });
      }
      
      stats.total = row.total;
      
      // Active licenses
      db.get('SELECT COUNT(*) as active FROM licenses WHERE status = "active"', [], (err, row) => {
        if (err) {
          console.error('Error getting active licenses:', err);
          return res.status(500).json({ error: 'Failed to get statistics' });
        }
        
        stats.active = row.active;
        
        // Expired licenses
        db.get(`
          SELECT COUNT(*) as expired 
          FROM licenses 
          WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
        `, [], (err, row) => {
          if (err) {
            console.error('Error getting expired licenses:', err);
            return res.status(500).json({ error: 'Failed to get statistics' });
          }
          
          stats.expired = row.expired;
          
          // Plans distribution
          db.all(`
            SELECT plan, COUNT(*) as count 
            FROM licenses 
            GROUP BY plan
          `, [], (err, rows) => {
            if (err) {
              console.error('Error getting plans distribution:', err);
              return res.status(500).json({ error: 'Failed to get statistics' });
            }
            
            stats.plans = {};
            rows.forEach(row => {
              stats.plans[row.plan] = row.count;
            });
            
            res.json(stats);
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in get statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, setDatabase };