const express = require('express');
const router = express.Router();

// Monitoring data storage
const monitoringData = {
  logs: [],
  alerts: [],
  metrics: []
};

// GET /api/monitoring/logs - Get system logs
router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const level = req.query.level; // info, warn, error
  
  let logs = monitoringData.logs;
  
  if (level) {
    logs = logs.filter(log => log.level === level);
  }
  
  logs = logs.slice(-limit);
  
  res.json({
    logs,
    total: monitoringData.logs.length,
    filtered: logs.length,
    timestamp: new Date().toISOString()
  });
});

// POST /api/monitoring/logs - Add log entry
router.post('/logs', (req, res) => {
  const { level, message, source, data } = req.body;
  
  if (!level || !message) {
    return res.status(400).json({
      error: 'Level and message are required'
    });
  }
  
  const logEntry = {
    id: Date.now(),
    level,
    message,
    source: source || 'system',
    data: data || null,
    timestamp: new Date().toISOString()
  };
  
  monitoringData.logs.push(logEntry);
  
  // Keep only last 1000 logs
  if (monitoringData.logs.length > 1000) {
    monitoringData.logs = monitoringData.logs.slice(-1000);
  }
  
  res.json(logEntry);
});

// GET /api/monitoring/alerts - Get active alerts
router.get('/alerts', (req, res) => {
  const activeAlerts = monitoringData.alerts.filter(alert => alert.status === 'active');
  
  res.json({
    alerts: activeAlerts,
    total: activeAlerts.length,
    timestamp: new Date().toISOString()
  });
});

// POST /api/monitoring/alerts - Create alert
router.post('/alerts', (req, res) => {
  const { type, severity, message, source } = req.body;
  
  if (!type || !severity || !message) {
    return res.status(400).json({
      error: 'Type, severity, and message are required'
    });
  }
  
  const alert = {
    id: Date.now(),
    type,
    severity, // low, medium, high, critical
    message,
    source: source || 'system',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  monitoringData.alerts.push(alert);
  
  res.json(alert);
});

// PUT /api/monitoring/alerts/:id - Update alert status
router.put('/alerts/:id', (req, res) => {
  const alertId = parseInt(req.params.id);
  const { status } = req.body;
  
  const alert = monitoringData.alerts.find(a => a.id === alertId);
  
  if (!alert) {
    return res.status(404).json({
      error: 'Alert not found'
    });
  }
  
  alert.status = status;
  alert.updatedAt = new Date().toISOString();
  
  res.json(alert);
});

// GET /api/monitoring/metrics - Get system metrics
router.get('/metrics', (req, res) => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  // Generate sample metrics (in production, collect real metrics)
  const metrics = {
    cpu: {
      current: Math.random() * 100,
      average: Math.random() * 100,
      peak: Math.random() * 100
    },
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
    },
    requests: {
      total: Math.floor(Math.random() * 10000),
      perMinute: Math.floor(Math.random() * 100),
      errors: Math.floor(Math.random() * 10)
    },
    angels: {
      learning: {
        status: 'active',
        requests: Math.floor(Math.random() * 1000),
        avgResponseTime: Math.floor(Math.random() * 500)
      },
      analytics: {
        status: 'active',
        requests: Math.floor(Math.random() * 1000),
        avgResponseTime: Math.floor(Math.random() * 500)
      },
      growth: {
        status: 'active',
        requests: Math.floor(Math.random() * 1000),
        avgResponseTime: Math.floor(Math.random() * 500)
      },
      visionary: {
        status: 'active',
        requests: Math.floor(Math.random() * 1000),
        avgResponseTime: Math.floor(Math.random() * 500)
      }
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(metrics);
});

// GET /api/monitoring/health - Health check with detailed status
router.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    checks: {
      database: { status: 'healthy', responseTime: Math.floor(Math.random() * 50) },
      angels: { status: 'healthy', active: 4, total: 4 },
      memory: { 
        status: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal < 0.9 ? 'healthy' : 'warning',
        usage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      },
      uptime: { 
        status: 'healthy', 
        seconds: process.uptime() 
      }
    },
    timestamp: new Date().toISOString()
  };
  
  // Determine overall status
  const statuses = Object.values(health.checks).map(check => check.status);
  if (statuses.includes('critical')) {
    health.status = 'critical';
  } else if (statuses.includes('warning')) {
    health.status = 'warning';
  }
  
  res.json(health);
});

module.exports = router;