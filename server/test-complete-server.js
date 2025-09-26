const https = require('https');
const io = require('socket.io-client');

console.log('🧪 Testing Complete HTTPS Server with WebSocket...');

// Test HTTPS API endpoints
const testAPI = async () => {
    console.log('\n📡 Testing HTTPS API endpoints...');
    
    // Test health endpoint
    const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/health',
        method: 'GET',
        rejectUnauthorized: false // Accept self-signed certificates
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✅ Health check status: ${res.statusCode}`);
                console.log(`📋 Response: ${data}`);
                resolve(data);
            });
        });

        req.on('error', (error) => {
            console.error('❌ HTTPS request failed:', error.message);
            reject(error);
        });

        req.end();
    });
};

// Test WebSocket connection
const testWebSocket = () => {
    console.log('\n🔌 Testing WebSocket connection...');
    
    const socket = io('https://localhost:3002', {
        rejectUnauthorized: false,
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully!');
        console.log(`🆔 Socket ID: ${socket.id}`);
        
        // Test ping/pong
        socket.emit('ping', { message: 'Test ping from client', timestamp: new Date().toISOString() });
    });

    socket.on('welcome', (data) => {
        console.log('👋 Welcome message received:', data);
    });

    socket.on('pong', (data) => {
        console.log('🏓 Pong received:', data);
        
        // Test license verification
        socket.emit('license:verify', { licenseKey: 'TEST-LICENSE-KEY-123' });
    });

    socket.on('license:result', (data) => {
        console.log('🔐 License verification result:', data);
        
        // Close connection after tests
        setTimeout(() => {
            socket.disconnect();
            console.log('🔌 WebSocket disconnected');
            process.exit(0);
        }, 2000);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection failed:', error.message);
        process.exit(1);
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
    });
};

// Test user registration
const testUserRegistration = async () => {
    console.log('\n👤 Testing user registration...');
    
    const userData = JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123'
    });

    const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/auth/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': userData.length
        },
        rejectUnauthorized: false
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📝 Registration status: ${res.statusCode}`);
                console.log(`📋 Response: ${data}`);
                resolve(data);
            });
        });

        req.on('error', (error) => {
            console.error('❌ Registration request failed:', error.message);
            reject(error);
        });

        req.write(userData);
        req.end();
    });
};

// Run all tests
const runTests = async () => {
    try {
        console.log('🚀 Starting comprehensive server tests...\n');
        
        // Wait a bit for server to fully start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test API endpoints
        await testAPI();
        
        // Test user registration (might fail if user exists, that's ok)
        try {
            await testUserRegistration();
        } catch (error) {
            console.log('⚠️ Registration test failed (user might already exist):', error.message);
        }
        
        // Test WebSocket
        testWebSocket();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
};

// Start tests
runTests();