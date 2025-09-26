#!/usr/bin/env node

/**
 * 🏥 Omni Ultimate - Advanced Docker Health Check
 * Napredni health check sistem za Docker kontejner
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 🔧 Konfiguracija
const CONFIG = {
    HOST: process.env.HOST || 'localhost',
    PORT: process.env.PORT || 3000,
    WEBSOCKET_PORT: process.env.WEBSOCKET_PORT || 3001,
    SSL_ENABLED: process.env.SSL_ENABLED === 'true',
    HEALTH_CHECK_PATH: process.env.HEALTH_CHECK_PATH || '/api/health',
    TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 10000,
    DEBUG: process.env.DEBUG_MODE === 'true'
};

// 🎨 Barve za konzolo
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

/**
 * 📝 Debug logging
 */
function debugLog(message, type = 'info') {
    if (!CONFIG.DEBUG) return;
    
    const timestamp = new Date().toISOString();
    const color = type === 'error' ? colors.red : 
                  type === 'warn' ? colors.yellow : 
                  type === 'success' ? colors.green : colors.blue;
    
    console.log(`${color}[${timestamp}] HEALTH-CHECK ${type.toUpperCase()}: ${message}${colors.reset}`);
}

/**
 * 🌐 HTTP/HTTPS zahteva
 */
function makeRequest(options) {
    return new Promise((resolve, reject) => {
        const client = CONFIG.SSL_ENABLED ? https : http;
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout after ${CONFIG.TIMEOUT}ms`));
        }, CONFIG.TIMEOUT);

        const req = client.request(options, (res) => {
            clearTimeout(timeout);
            let data = '';
            
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });

        req.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        req.setTimeout(CONFIG.TIMEOUT, () => {
            req.destroy();
            reject(new Error(`Request timeout after ${CONFIG.TIMEOUT}ms`));
        });

        req.end();
    });
}

/**
 * 🏥 Preveri API health endpoint
 */
async function checkApiHealth() {
    debugLog('Preverjam API health endpoint...');
    
    try {
        const options = {
            hostname: CONFIG.HOST,
            port: CONFIG.PORT,
            path: CONFIG.HEALTH_CHECK_PATH,
            method: 'GET',
            headers: {
                'User-Agent': 'Docker-Health-Check/1.0'
            }
        };

        const response = await makeRequest(options);
        
        if (response.statusCode === 200) {
            debugLog('API health check uspešen', 'success');
            
            // Preveri JSON response
            try {
                const healthData = JSON.parse(response.data);
                debugLog(`Health data: ${JSON.stringify(healthData)}`, 'info');
                
                if (healthData.status === 'healthy' || healthData.status === 'ok') {
                    return { success: true, data: healthData };
                } else {
                    return { success: false, error: `Unhealthy status: ${healthData.status}` };
                }
            } catch (parseError) {
                debugLog(`JSON parse error: ${parseError.message}`, 'warn');
                return { success: true, data: { status: 'ok', raw: response.data } };
            }
        } else {
            return { success: false, error: `HTTP ${response.statusCode}` };
        }
    } catch (error) {
        debugLog(`API health check failed: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * 🔌 Preveri WebSocket port
 */
async function checkWebSocketPort() {
    debugLog('Preverjam WebSocket port...');
    
    return new Promise((resolve) => {
        const net = require('net');
        const socket = new net.Socket();
        
        const timeout = setTimeout(() => {
            socket.destroy();
            resolve({ success: false, error: 'WebSocket port timeout' });
        }, 5000);

        socket.connect(CONFIG.WEBSOCKET_PORT, CONFIG.HOST, () => {
            clearTimeout(timeout);
            socket.destroy();
            debugLog('WebSocket port dostopen', 'success');
            resolve({ success: true });
        });

        socket.on('error', (err) => {
            clearTimeout(timeout);
            debugLog(`WebSocket port error: ${err.message}`, 'error');
            resolve({ success: false, error: err.message });
        });
    });
}

/**
 * 📁 Preveri kritične datoteke in direktorije
 */
function checkFileSystem() {
    debugLog('Preverjam file system...');
    
    const criticalPaths = [
        '/app/logs',
        '/app/uploads',
        '/app/temp',
        '/app/certs'
    ];
    
    const results = [];
    
    for (const dirPath of criticalPaths) {
        try {
            if (fs.existsSync(dirPath)) {
                const stats = fs.statSync(dirPath);
                if (stats.isDirectory()) {
                    // Preveri write permissions
                    const testFile = path.join(dirPath, '.health-check-test');
                    try {
                        fs.writeFileSync(testFile, 'test');
                        fs.unlinkSync(testFile);
                        results.push({ path: dirPath, status: 'ok', writable: true });
                        debugLog(`Directory ${dirPath} OK (writable)`, 'success');
                    } catch (writeError) {
                        results.push({ path: dirPath, status: 'warning', writable: false, error: writeError.message });
                        debugLog(`Directory ${dirPath} not writable: ${writeError.message}`, 'warn');
                    }
                } else {
                    results.push({ path: dirPath, status: 'error', error: 'Not a directory' });
                    debugLog(`Path ${dirPath} is not a directory`, 'error');
                }
            } else {
                results.push({ path: dirPath, status: 'missing' });
                debugLog(`Directory ${dirPath} missing`, 'warn');
            }
        } catch (error) {
            results.push({ path: dirPath, status: 'error', error: error.message });
            debugLog(`Error checking ${dirPath}: ${error.message}`, 'error');
        }
    }
    
    const hasErrors = results.some(r => r.status === 'error');
    return { success: !hasErrors, results };
}

/**
 * 🔧 Preveri okoljske spremenljivke
 */
function checkEnvironment() {
    debugLog('Preverjam environment variables...');
    
    const requiredVars = (process.env.REQUIRED_ENV_VARS || '').split(',').filter(v => v.trim());
    const missing = [];
    const present = [];
    
    for (const varName of requiredVars) {
        const trimmedVar = varName.trim();
        if (process.env[trimmedVar]) {
            present.push(trimmedVar);
            debugLog(`ENV ${trimmedVar} ✓`, 'success');
        } else {
            missing.push(trimmedVar);
            debugLog(`ENV ${trimmedVar} ✗`, 'error');
        }
    }
    
    return {
        success: missing.length === 0,
        required: requiredVars.length,
        present: present.length,
        missing: missing
    };
}

/**
 * 🏥 Glavni health check
 */
async function performHealthCheck() {
    console.log(`${colors.bold}${colors.blue}🏥 Omni Ultimate Docker Health Check${colors.reset}`);
    console.log(`${colors.blue}Timestamp: ${new Date().toISOString()}${colors.reset}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        overall: 'unknown',
        checks: {}
    };
    
    // 1. API Health Check
    console.log('🌐 Checking API Health...');
    results.checks.api = await checkApiHealth();
    
    // 2. WebSocket Port Check
    console.log('🔌 Checking WebSocket Port...');
    results.checks.websocket = await checkWebSocketPort();
    
    // 3. File System Check
    console.log('📁 Checking File System...');
    results.checks.filesystem = checkFileSystem();
    
    // 4. Environment Check
    console.log('🔧 Checking Environment...');
    results.checks.environment = checkEnvironment();
    
    // Določi overall status
    const allChecks = Object.values(results.checks);
    const hasFailures = allChecks.some(check => !check.success);
    
    results.overall = hasFailures ? 'unhealthy' : 'healthy';
    
    // Izpis rezultatov
    console.log('\n📊 Health Check Results:');
    console.log('========================');
    
    for (const [checkName, checkResult] of Object.entries(results.checks)) {
        const status = checkResult.success ? 
            `${colors.green}✓ HEALTHY${colors.reset}` : 
            `${colors.red}✗ UNHEALTHY${colors.reset}`;
        
        console.log(`${checkName.toUpperCase()}: ${status}`);
        
        if (!checkResult.success && checkResult.error) {
            console.log(`  Error: ${colors.red}${checkResult.error}${colors.reset}`);
        }
    }
    
    console.log(`\nOVERALL STATUS: ${results.overall === 'healthy' ? 
        `${colors.green}${colors.bold}✓ HEALTHY${colors.reset}` : 
        `${colors.red}${colors.bold}✗ UNHEALTHY${colors.reset}`}`);
    
    // Exit code
    const exitCode = results.overall === 'healthy' ? 0 : 1;
    
    if (CONFIG.DEBUG) {
        console.log(`\nDebug Info:`);
        console.log(`Exit Code: ${exitCode}`);
        console.log(`Config: ${JSON.stringify(CONFIG, null, 2)}`);
    }
    
    process.exit(exitCode);
}

// 🚀 Zagon health check
if (require.main === module) {
    performHealthCheck().catch((error) => {
        console.error(`${colors.red}${colors.bold}Health check crashed: ${error.message}${colors.reset}`);
        debugLog(`Stack trace: ${error.stack}`, 'error');
        process.exit(1);
    });
}

module.exports = { performHealthCheck, checkApiHealth, checkWebSocketPort, checkFileSystem, checkEnvironment };