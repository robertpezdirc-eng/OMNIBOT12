const http = require('http');
const url = require('url');

const PORT = 3001;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`${method} ${path}`);

  // Collect request body for POST requests
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    let requestData = {};
    if (body) {
      try {
        requestData = JSON.parse(body);
      } catch (e) {
        console.log('Invalid JSON in request body');
      }
    }

    // Route handling
    if (path === '/api/health' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'OK',
        service: 'License Server',
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }));
    }
    else if (path === '/api/license/validate' && method === 'POST') {
      res.writeHead(200);
      res.end(JSON.stringify({
        valid: true,
        license_key: requestData.license_key,
        message: 'License validation endpoint working',
        timestamp: new Date().toISOString()
      }));
    }
    else if (path === '/api/license/create' && method === 'POST') {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        license_id: 'test-license-' + Date.now(),
        client_id: requestData.client_id,
        plan: requestData.plan,
        message: 'License creation endpoint working',
        timestamp: new Date().toISOString()
      }));
    }
    else if (path === '/api/license/toggle' && method === 'POST') {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        client_id: requestData.client_id,
        status: 'toggled',
        message: 'License toggle endpoint working',
        timestamp: new Date().toISOString()
      }));
    }
    else {
      res.writeHead(404);
      res.end(JSON.stringify({
        error: 'Not Found',
        path: path,
        method: method
      }));
    }
  });
});

server.listen(PORT, () => {
  console.log('🚀 Simple Test Server started successfully');
  console.log(`   Protocol: HTTP`);
  console.log(`   Port: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log('✅ Ready for testing');
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

module.exports = server;