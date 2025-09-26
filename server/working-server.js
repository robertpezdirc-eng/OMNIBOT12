const http = require('http');
const url = require('url');

console.log('Starting server...');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`${new Date().toISOString()} - ${method} ${path}`);

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
        console.log('Invalid JSON in request body:', body);
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
        method: method,
        timestamp: new Date().toISOString()
      }));
    }
  });
});

const PORT = 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Working Test Server started successfully');
  console.log(`   Protocol: HTTP`);
  console.log(`   Port: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log('✅ Ready for testing');
  
  // Keep the process alive
  setInterval(() => {
    console.log(`Server heartbeat - ${new Date().toISOString()}`);
  }, 30000);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Trying to kill existing process...`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('Server setup complete, waiting for connections...');