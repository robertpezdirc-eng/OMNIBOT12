const http = require('http');

function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        console.log(`${method} ${path}: ${res.statusCode} - ${responseData.substring(0, 100)}`);
        resolve({ statusCode: res.statusCode, data: responseData });
      });
    });

    req.on('error', (err) => {
      console.log(`${method} ${path}: ERROR - ${err.message}`);
      reject(err);
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('Testing API endpoints on port 3001...\n');
  
  try {
    await testEndpoint('/api/health');
    await testEndpoint('/api/license/validate', 'POST', { license_key: 'TEST-123' });
    await testEndpoint('/api/license/create', 'POST', { client_id: 'test', plan: 'basic' });
    await testEndpoint('/api/license/toggle', 'POST', { client_id: 'test' });
    
    console.log('\nAPI testing completed successfully.');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();