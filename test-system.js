#!/usr/bin/env node

/**
 * OMNI-BRAIN System Test Suite
 * Testira osnovne funkcionalnosti sistema
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const ADMIN_URL = 'http://localhost:3001';

class SystemTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async test(name, testFn) {
        console.log(`🧪 Testing: ${name}`);
        try {
            await testFn();
            this.results.passed++;
            this.results.tests.push({ name, status: 'PASSED' });
            console.log(`✅ ${name} - PASSED`);
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({ name, status: 'FAILED', error: error.message });
            console.log(`❌ ${name} - FAILED: ${error.message}`);
        }
    }

    async testWebServer() {
        const response = await axios.get(BASE_URL);
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
    }

    async testAdminDashboard() {
        const response = await axios.get(`${BASE_URL}/admin/admin-dashboard.html`);
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        if (!response.data.includes('OMNI-BRAIN Admin Dashboard')) {
            throw new Error('Admin dashboard title not found');
        }
    }

    async testMobileDashboard() {
        const response = await axios.get(`${BASE_URL}/mobile-dashboard.html`);
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        if (!response.data.includes('Omni Brain - Mobilna Nadzorna Plošča') && !response.data.includes('Mobilna Nadzorna Plošča')) {
            throw new Error('Mobile dashboard title not found');
        }
    }

    async testResponsiveCSS() {
        const cssPath = path.join(__dirname, 'responsive-dashboard.css');
        if (!fs.existsSync(cssPath)) {
            throw new Error('Responsive CSS file not found');
        }
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        if (!cssContent.includes('@media')) {
            throw new Error('No media queries found in CSS');
        }
    }

    async testRemoteAccessConfig() {
        const configPath = path.join(__dirname, 'remote-access-config.js');
        if (!fs.existsSync(configPath)) {
            throw new Error('Remote access config file not found');
        }
    }

    async testMobileAPI() {
        const apiPath = path.join(__dirname, 'mobile-api.js');
        if (!fs.existsSync(apiPath)) {
            throw new Error('Mobile API file not found');
        }
    }

    async testEnvironmentConfig() {
        const envPath = path.join(__dirname, '.env');
        if (!fs.existsSync(envPath)) {
            throw new Error('.env file not found');
        }
        const envContent = fs.readFileSync(envPath, 'utf8');
        const requiredVars = ['PORT', 'JWT_SECRET', 'MONGODB_URI'];
        for (const varName of requiredVars) {
            if (!envContent.includes(varName)) {
                throw new Error(`Required environment variable ${varName} not found`);
            }
        }
    }

    async testMainServer() {
        const serverPath = path.join(__dirname, 'omni-ultra-main.js');
        if (!fs.existsSync(serverPath)) {
            throw new Error('Main server file not found');
        }
        const serverContent = fs.readFileSync(serverPath, 'utf8');
        if (!serverContent.includes('RemoteAccessManager')) {
            throw new Error('RemoteAccessManager not integrated');
        }
        if (!serverContent.includes('MobileAPI')) {
            throw new Error('MobileAPI not integrated');
        }
    }

    async runAllTests() {
        console.log('🚀 Starting OMNI-BRAIN System Tests\n');

        // File existence tests
        await this.test('Environment Configuration', () => this.testEnvironmentConfig());
        await this.test('Main Server Integration', () => this.testMainServer());
        await this.test('Remote Access Config', () => this.testRemoteAccessConfig());
        await this.test('Mobile API', () => this.testMobileAPI());
        await this.test('Responsive CSS', () => this.testResponsiveCSS());

        // Web server tests
        await this.test('Web Server Response', () => this.testWebServer());
        await this.test('Admin Dashboard', () => this.testAdminDashboard());
        await this.test('Mobile Dashboard', () => this.testMobileDashboard());

        // Performance tests
        await this.test('Response Time', async () => {
            const start = Date.now();
            await axios.get(BASE_URL);
            const duration = Date.now() - start;
            if (duration > 5000) {
                throw new Error(`Response too slow: ${duration}ms`);
            }
        });

        this.printResults();
    }

    printResults() {
        console.log('\n📊 Test Results:');
        console.log('================');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.tests
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`   - ${test.name}: ${test.error}`);
                });
        }

        console.log('\n🎯 System Status:', this.results.failed === 0 ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION');
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new SystemTester();
    tester.runAllTests().catch(console.error);
}

module.exports = SystemTester;