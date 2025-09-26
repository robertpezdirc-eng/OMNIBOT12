const express = require('express');
const router = express.Router();

// System statistics storage
let systemStats = {
  startTime: Date.now(),
  requestCount: 0,
  totalResponseTime: 0,
  angels: 4, // learning, analytics, growth, visionary
  errors: 0
};

// Middleware to track requests
router.use((req, res, next) => {
  const startTime = Date.now();
  systemStats.requestCount++;
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    systemStats.totalResponseTime += responseTime;
    
    if (res.statusCode >= 400) {
      systemStats.errors++;
    }
  });
  
  next();
});

// GET /api/stats - Get system statistics
router.get('/', (req, res) => {
  const uptime = Date.now() - systemStats.startTime;
  const avgResponseTime = systemStats.requestCount > 0 
    ? Math.round(systemStats.totalResponseTime / systemStats.requestCount)
    : 0;

  res.json({
    angels: systemStats.angels,
    uptime: formatUptime(uptime),
    requests: systemStats.requestCount,
    responseTime: avgResponseTime,
    errors: systemStats.errors,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timestamp: new Date().toISOString()
  });
});

// GET /api/stats/detailed - Get detailed system information
router.get('/detailed', (req, res) => {
  const uptime = Date.now() - systemStats.startTime;
  
  res.json({
    system: {
      uptime: uptime,
      uptimeFormatted: formatUptime(uptime),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    },
    performance: {
      requests: systemStats.requestCount,
      errors: systemStats.errors,
      errorRate: systemStats.requestCount > 0 
        ? ((systemStats.errors / systemStats.requestCount) * 100).toFixed(2) + '%'
        : '0%',
      avgResponseTime: systemStats.requestCount > 0 
        ? Math.round(systemStats.totalResponseTime / systemStats.requestCount)
        : 0
    },
    resources: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    angels: {
      total: systemStats.angels,
      active: systemStats.angels, // All angels are always active in this implementation
      status: {
        learning: 'active',
        analytics: 'active',
        growth: 'active',
        visionary: 'active'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// POST /api/stats/reset - Reset statistics (development only)
router.post('/reset', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Not allowed in production'
    });
  }
  
  systemStats = {
    startTime: Date.now(),
    requestCount: 0,
    totalResponseTime: 0,
    angels: 4,
    errors: 0
  };
  
  res.json({
    message: 'Statistics reset successfully',
    timestamp: new Date().toISOString()
  });
});

// Helper function to format uptime
function formatUptime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

module.exports = router;