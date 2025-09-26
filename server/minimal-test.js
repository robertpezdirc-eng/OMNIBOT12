const http = require('http');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Routes
  if (path === '/' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: 'Minimal Express.js server is running!',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }));
  } else if (path === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      message: 'Health check passed',
      uptime: process.uptime()
    }));
  } else if (path === '/api/test' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: 'API test endpoint working',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: path
    }));
  } else {
    // 404 Not Found
    res.writeHead(404);
    res.end(JSON.stringify({
      error: 'Endpoint not found',
      path: path,
      method: req.method
    }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Minimal server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API test: http://localhost:${PORT}/api/test`);
  console.log(`   Process ID: ${process.pid}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

console.log('Starting minimal server...');