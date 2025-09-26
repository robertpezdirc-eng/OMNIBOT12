const express = require('express');
const router = express.Router();
const RevokedLicense = require('../models/RevokedLicense');
const License = require('../models/License');

/**
 * Check if license is revoked
 * GET /api/revocation/check/:token
 */
router.get('/check/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'License token is required'
      });
    }
    
    const revocationStatus = await RevokedLicense.isRevoked(token);
    
    if (revocationStatus.error) {
      return res.status(500).json({
        success: false,
        error: 'Error checking revocation status',
        details: revocationStatus.error
      });
    }
    
    res.json({
      success: true,
      isRevoked: revocationStatus.isRevoked,
      revokedAt: revocationStatus.revokedAt,
      reason: revocationStatus.reason,
      description: revocationStatus.description
    });
    
  } catch (error) {
    console.error('Error in revocation check:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Revoke a single license by token
 * POST /api/revocation/revoke
 */
router.post('/revoke', async (req, res) => {
  try {
    const { 
      license_token, 
      revoked_by = 'admin', 
      reason = 'manual_revocation', 
      description,
      metadata = {}
    } = req.body;
    
    if (!license_token) {
      return res.status(400).json({
        success: false,
        error: 'License token is required'
      });
    }
    
    // Check if already revoked
    const existingRevocation = await RevokedLicense.isRevoked(license_token);
    if (existingRevocation.isRevoked) {
      return res.status(409).json({
        success: false,
        error: 'License is already revoked',
        revokedAt: existingRevocation.revokedAt,
        reason: existingRevocation.reason
      });
    }
    
    // Add request metadata
    const requestMetadata = {
      ...metadata,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const revokedLicense = await RevokedLicense.revokeByToken(
      license_token,
      revoked_by,
      reason,
      description,
      requestMetadata
    );
    
    res.json({
      success: true,
      message: 'License successfully revoked',
      revocation: revokedLicense.getRevocationInfo()
    });
    
  } catch (error) {
    console.error('Error revoking license:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke license',
      details: error.message
    });
  }
});

/**
 * Revoke all licenses for a client
 * POST /api/revocation/revoke-client
 */
router.post('/revoke-client', async (req, res) => {
  try {
    const { 
      client_id, 
      revoked_by = 'admin', 
      reason = 'manual_revocation', 
      description,
      metadata = {}
    } = req.body;
    
    if (!client_id) {
      return res.status(400).json({
        success: false,
        error: 'Client ID is required'
      });
    }
    
    // Add request metadata
    const requestMetadata = {
      ...metadata,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const revokedLicenses = await RevokedLicense.revokeByClientId(
      client_id,
      revoked_by,
      reason,
      description,
      requestMetadata
    );
    
    res.json({
      success: true,
      message: `Successfully revoked ${revokedLicenses.length} licenses for client`,
      clientId: client_id,
      revokedCount: revokedLicenses.length,
      revocations: revokedLicenses.map(r => r.getRevocationInfo())
    });
    
  } catch (error) {
    console.error('Error revoking client licenses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke client licenses',
      details: error.message
    });
  }
});

/**
 * Bulk revoke multiple licenses
 * POST /api/revocation/bulk-revoke
 */
router.post('/bulk-revoke', async (req, res) => {
  try {
    const { 
      license_tokens, 
      revoked_by = 'admin', 
      reason = 'manual_revocation', 
      description,
      metadata = {}
    } = req.body;
    
    if (!license_tokens || !Array.isArray(license_tokens) || license_tokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'License tokens array is required'
      });
    }
    
    if (license_tokens.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 licenses can be revoked at once'
      });
    }
    
    // Add request metadata
    const requestMetadata = {
      ...metadata,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const result = await RevokedLicense.bulkRevoke(
      license_tokens,
      revoked_by,
      reason,
      description,
      requestMetadata
    );
    
    res.json({
      success: true,
      message: `Bulk revocation completed`,
      batchId: result.batchId,
      totalRequested: result.totalRequested,
      successfullyRevoked: result.successfullyRevoked,
      failedCount: result.totalRequested - result.successfullyRevoked,
      revocations: result.revokedLicenses.map(r => r.getRevocationInfo())
    });
    
  } catch (error) {
    console.error('Error in bulk revocation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk revocation',
      details: error.message
    });
  }
});

/**
 * Get revocation history for a client
 * GET /api/revocation/history/:clientId
 */
router.get('/history/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 50 } = req.query;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'Client ID is required'
      });
    }
    
    const history = await RevokedLicense.getRevocationHistory(clientId, parseInt(limit));
    
    res.json({
      success: true,
      clientId: clientId,
      totalRevocations: history.length,
      revocations: history
    });
    
  } catch (error) {
    console.error('Error getting revocation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revocation history',
      details: error.message
    });
  }
});

/**
 * Get revocation statistics
 * GET /api/revocation/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const stats = await RevokedLicense.aggregate([
      {
        $match: {
          revoked_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            reason: '$reason',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$revoked_at'
              }
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.reason',
          totalCount: { $sum: '$count' },
          dailyStats: {
            $push: {
              date: '$_id.date',
              count: '$count'
            }
          }
        }
      },
      {
        $sort: { totalCount: -1 }
      }
    ]);
    
    const totalRevocations = await RevokedLicense.countDocuments({
      revoked_at: { $gte: startDate }
    });
    
    res.json({
      success: true,
      period: `${days} days`,
      totalRevocations,
      statsByReason: stats
    });
    
  } catch (error) {
    console.error('Error getting revocation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revocation statistics',
      details: error.message
    });
  }
});

/**
 * Health check endpoint
 * GET /api/revocation/health
 */
router.get('/health', async (req, res) => {
  try {
    const totalRevoked = await RevokedLicense.countDocuments();
    const recentRevocations = await RevokedLicense.countDocuments({
      revoked_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    res.json({
      success: true,
      status: 'healthy',
      totalRevoked,
      recentRevocations,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error in revocation health check:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    });
  }
});

module.exports = router;