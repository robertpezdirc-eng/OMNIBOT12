const express = require('express');
const router = express.Router();
const License = require('../models/License');
const { broadcastLicenseUpdate } = require('../server');
const crypto = require('crypto');

// Generate license key
function generateLicenseKey() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

// GET /api/license - Get all licenses
router.get('/', async (req, res) => {
  try {
    const licenses = await License.find().sort({ createdAt: -1 });
    res.json(licenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/license/:key - Validate license
router.get('/:key', async (req, res) => {
  try {
    const license = await License.findOne({ licenseKey: req.params.key });
    
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }
    
    if (!license.isValid()) {
      return res.status(403).json({ 
        error: 'License invalid',
        status: license.status,
        expired: license.expiresAt < new Date()
      });
    }
    
    // Increment usage
    await license.incrementUsage();
    
    res.json({
      valid: true,
      license: {
        clientId: license.clientId,
        clientName: license.clientName,
        product: license.product,
        plan: license.plan,
        features: license.features,
        expiresAt: license.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/license - Create new license
router.post('/', async (req, res) => {
  try {
    const {
      clientName,
      email,
      product,
      plan,
      durationDays = 365,
      features = [],
      maxUsage = -1
    } = req.body;
    
    const licenseKey = generateLicenseKey();
    const clientId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    
    const license = new License({
      licenseKey,
      clientId,
      clientName,
      email,
      product,
      plan,
      expiresAt,
      features,
      maxUsage
    });
    
    await license.save();
    
    // Broadcast update
    broadcastLicenseUpdate({
      action: 'created',
      license: license
    });
    
    res.status(201).json(license);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/license/:key - Update license
router.put('/:key', async (req, res) => {
  try {
    const license = await License.findOne({ licenseKey: req.params.key });
    
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }
    
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        license[key] = updates[key];
      }
    });
    
    await license.save();
    
    // Broadcast update
    broadcastLicenseUpdate({
      action: 'updated',
      license: license
    });
    
    res.json(license);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/license/:key - Revoke license
router.delete('/:key', async (req, res) => {
  try {
    const license = await License.findOne({ licenseKey: req.params.key });
    
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }
    
    license.status = 'revoked';
    await license.save();
    
    // Broadcast update
    broadcastLicenseUpdate({
      action: 'revoked',
      license: license
    });
    
    res.json({ message: 'License revoked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/license/stats/overview - Get license statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await License.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const productStats = await License.aggregate([
      {
        $group: {
          _id: '$product',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      statusStats: stats,
      productStats: productStats,
      totalLicenses: await License.countDocuments()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;