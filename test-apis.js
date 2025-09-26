const http = require('http');

console.log('🧪 Testing Omniscient AI Platform APIs...\n');

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testAPIs() {
    const tests = [
        { name: 'Server Status', path: '/api/status' },
        { name: 'Test Endpoint', path: '/api/test' },
        { name: 'Knowledge Categories', path: '/api/knowledge' },
        { name: 'Technology Category', path: '/api/knowledge/technology' },
        { name: 'Science Category', path: '/api/knowledge/science' },
        { name: 'Apps Category', path: '/api/knowledge/apps' },
        { name: 'Technology Prompts', path: '/api/knowledge/technology/prompts' },
        { name: 'Search Knowledge', path: '/api/search?q=artificial intelligence' },
        { name: 'AI Generation', path: '/generate', method: 'POST', data: { prompt: 'What is artificial intelligence?' } }
    ];

    for (const test of tests) {
        try {
            console.log(`📡 Testing: ${test.name}`);
            const result = await makeRequest(test.path, test.method, test.data);
            
            if (result.status === 200) {
                console.log(`✅ ${test.name}: SUCCESS`);
                if (test.name === 'Knowledge Categories' && result.data.categories) {
                    console.log(`   📚 Found ${result.data.categories.length} categories: ${result.data.categories.join(', ')}`);
                } else if (test.name === 'Search Knowledge' && result.data.results) {
                    console.log(`   🔍 Found ${result.data.results.length} search results`);
                } else if (test.name === 'AI Generation' && result.data.response) {
                    console.log(`   🤖 Generated response: ${result.data.response.substring(0, 100)}...`);
                }
            } else {
                console.log(`❌ ${test.name}: FAILED (Status: ${result.status})`);
                if (result.data.error) {
                    console.log(`   Error: ${result.data.error}`);
                }
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ERROR - ${error.message}`);
        }
        console.log('');
    }
    
    console.log('🎉 API testing complete!');
}

testAPIs().catch(console.error);