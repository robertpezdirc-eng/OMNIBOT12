const https = require('https');

console.log('Testing HTTPS server at https://localhost:3001');

// Configure HTTPS agent to ignore self-signed certificates
const agent = new https.Agent({
    rejectUnauthorized: false
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET',
    agent: agent
};

console.log('Making HTTPS request...');

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response Body:', data);
        try {
            const jsonData = JSON.parse(data);
            console.log('Parsed JSON:', jsonData);
        } catch (error) {
            console.log('Failed to parse JSON:', error.message);
        }
    });
});

req.on('error', (error) => {
    console.error('Request error:', error.message);
});

req.setTimeout(5000, () => {
    console.error('Request timeout');
    req.destroy();
});

req.end();

console.log('Request sent, waiting for response...');