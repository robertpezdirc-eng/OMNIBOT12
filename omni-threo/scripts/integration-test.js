#!/usr/bin/env node

/**
 * Omni Threo - Integration Test Runner
 * Testira povezljivost med vsemi komponentami sistema
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const path = require('path');

class IntegrationTester {
    constructor() {
        this.results = {
            backend: false,
            admin: false,
            client: false,
            database: false,
            api_endpoints: []
        };
        
        this.config = {
            backend_url: 'http://localhost:3000',
            admin_url: 'http://localhost:3001',
            client_url: 'http://localhost:3002',
            timeout: 10000
        };
    }

    async runTests() {
        console.log('🧪 Omni Threo - Integration Test Runner');
        console.log('=====================================\n');

        try {
            await this.testBackend();
            await this.testDatabase();
            await this.testAPIEndpoints();
            await this.testFrontends();
            
            this.printResults();
        } catch (error) {
            console.error('❌ Integration test failed:', error.message);
            process.exit(1);
        }
    }

    async testBackend() {
        console.log('🔧 Testing Backend API...');
        
        try {
            const response = await this.makeRequest(`${this.config.backend_url}/api/health`);
            
            if (response.status === 'ok') {
                this.results.backend = true;
                console.log('✅ Backend API is running');
            } else {
                console.log('❌ Backend API health check failed');
            }
        } catch (error) {
            console.log('❌ Backend API is not accessible:', error.message);
        }
    }

    async testDatabase() {
        console.log('🗄️  Testing Database Connection...');
        
        try {
            const response = await this.makeRequest(`${this.config.backend_url}/api/licenses`);
            
            if (Array.isArray(response)) {
                this.results.database = true;
                console.log('✅ Database connection successful');
            } else {
                console.log('❌ Database connection failed');
            }
        } catch (error) {
            console.log('❌ Database is not accessible:', error.message);
        }
    }

    async testAPIEndpoints() {
        console.log('🔗 Testing API Endpoints...');
        
        const endpoints = [
            { method: 'GET', path: '/api/health', expected: 200 },
            { method: 'GET', path: '/api/licenses', expected: 200 },
            { method: 'GET', path: '/api/stats', expected: 200 },
            { method: 'POST', path: '/api/auth/login', expected: 400, body: {} }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.testEndpoint(endpoint);
                this.results.api_endpoints.push({
                    ...endpoint,
                    success: true,
                    actual_status: response.statusCode
                });
                console.log(`✅ ${endpoint.method} ${endpoint.path} - OK`);
            } catch (error) {
                this.results.api_endpoints.push({
                    ...endpoint,
                    success: false,
                    error: error.message
                });
                console.log(`❌ ${endpoint.method} ${endpoint.path} - FAILED`);
            }
        }
    }

    async testFrontends() {
        console.log('🖥️  Testing Frontend Applications...');
        
        // Test Admin GUI
        try {
            await this.makeRequest(this.config.admin_url);
            this.results.admin = true;
            console.log('✅ Admin GUI is accessible');
        } catch (error) {
            console.log('❌ Admin GUI is not accessible:', error.message);
        }

        // Test Client Panel
        try {
            await this.makeRequest(this.config.client_url);
            this.results.client = true;
            console.log('✅ Client Panel is accessible');
        } catch (error) {
            console.log('❌ Client Panel is not accessible:', error.message);
        }
    }

    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            
            const req = client.get(url, {
                timeout: this.config.timeout,
                ...options
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        resolve({ statusCode: res.statusCode, data });
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    async testEndpoint(endpoint) {
        return new Promise((resolve, reject) => {
            const url = `${this.config.backend_url}${endpoint.path}`;
            const client = url.startsWith('https') ? https : http;
            
            const options = {
                method: endpoint.method,
                timeout: this.config.timeout
            };

            if (endpoint.body) {
                options.headers = {
                    'Content-Type': 'application/json'
                };
            }

            const req = client.request(url, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (endpoint.body) {
                req.write(JSON.stringify(endpoint.body));
            }
            
            req.end();
        });
    }

    printResults() {
        console.log('\n📊 Integration Test Results');
        console.log('===========================');
        
        console.log(`Backend API: ${this.results.backend ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Database: ${this.results.database ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Admin GUI: ${this.results.admin ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Client Panel: ${this.results.client ? '✅ PASS' : '❌ FAIL'}`);
        
        console.log('\nAPI Endpoints:');
        this.results.api_endpoints.forEach(endpoint => {
            const status = endpoint.success ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${endpoint.method} ${endpoint.path}: ${status}`);
        });

        const totalTests = 4 + this.results.api_endpoints.length;
        const passedTests = [
            this.results.backend,
            this.results.database,
            this.results.admin,
            this.results.client
        ].filter(Boolean).length + this.results.api_endpoints.filter(e => e.success).length;

        console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All integration tests passed!');
        } else {
            console.log('⚠️  Some tests failed. Check the logs above.');
            process.exit(1);
        }
    }
}

// Zaženi teste
if (require.main === module) {
    const tester = new IntegrationTester();
    tester.runTests().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = IntegrationTester;