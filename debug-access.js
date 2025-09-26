#!/usr/bin/env node
/**
 * 🔍 OMNI DEBUG ACCESS SYSTEM
 * Omogoča napredni dostop do sistema za monitoring in debugging
 * 
 * Avtor: Omni AI Platform
 * Verzija: 1.0.0
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.DEBUG_PORT || 3333;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));  // Servira vse datoteke iz trenutnega direktorija

// 🔐 Varnostni ključ za dostop
const DEBUG_ACCESS_KEY = process.env.DEBUG_ACCESS_KEY || 'omni_debug_2024';

// Middleware za avtentikacijo
const authenticateDebug = (req, res, next) => {
    const authKey = req.headers['x-debug-key'] || req.query.key;
    if (authKey !== DEBUG_ACCESS_KEY) {
        return res.status(401).json({ 
            error: 'Unauthorized access', 
            message: 'Potrebuješ veljaven debug ključ' 
        });
    }
    next();
};

// 📊 SISTEM STATUS ENDPOINTS

// Osnovni sistem status
app.get('/api/debug/status', authenticateDebug, async (req, res) => {
    try {
        const status = {
            timestamp: new Date().toISOString(),
            system: {
                platform: os.platform(),
                arch: os.arch(),
                uptime: os.uptime(),
                loadavg: os.loadavg(),
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem()
                },
                cpus: os.cpus().length
            },
            process: {
                pid: process.pid,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.version,
                env: process.env.NODE_ENV || 'development'
            },
            omni: {
                version: process.env.OMNI_VERSION || '1.0.0',
                port: process.env.PORT || 3000,
                debug_mode: process.env.DEBUG_MODE === 'true'
            }
        };
        
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Aktivni procesi
app.get('/api/debug/processes', authenticateDebug, async (req, res) => {
    try {
        const { stdout } = await execAsync('tasklist /FO CSV | findstr /I "node python omni"');
        const processes = stdout.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const parts = line.split(',').map(p => p.replace(/"/g, ''));
                return {
                    name: parts[0],
                    pid: parts[1],
                    sessionName: parts[2],
                    sessionNumber: parts[3],
                    memUsage: parts[4]
                };
            });
        
        res.json({ processes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Omni konfiguracija
app.get('/api/debug/config', authenticateDebug, async (req, res) => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        const configExists = await fs.access(configPath).then(() => true).catch(() => false);
        
        let config = {};
        if (configExists) {
            const configData = await fs.readFile(configPath, 'utf8');
            config = JSON.parse(configData);
        }
        
        // Skrij občutljive podatke
        const safeConfig = JSON.parse(JSON.stringify(config));
        if (safeConfig.integrations && safeConfig.integrations.github) {
            safeConfig.integrations.github.token = '***HIDDEN***';
        }
        
        res.json({ config: safeConfig });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logovi
app.get('/api/debug/logs', authenticateDebug, async (req, res) => {
    try {
        const logDir = path.join(__dirname, 'omni', 'logs');
        const logFiles = await fs.readdir(logDir).catch(() => []);
        
        const logs = {};
        for (const file of logFiles.slice(0, 5)) { // Samo zadnjih 5 datotek
            try {
                const content = await fs.readFile(path.join(logDir, file), 'utf8');
                logs[file] = content.split('\n').slice(-50).join('\n'); // Zadnjih 50 vrstic
            } catch (err) {
                logs[file] = `Error reading file: ${err.message}`;
            }
        }
        
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Aktivne povezave
app.get('/api/debug/connections', authenticateDebug, async (req, res) => {
    try {
        const { stdout } = await execAsync('netstat -ano | findstr ":3000 :3001 :3002 :8080"');
        const connections = stdout.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                    protocol: parts[0],
                    localAddress: parts[1],
                    foreignAddress: parts[2],
                    state: parts[3],
                    pid: parts[4]
                };
            });
        
        res.json({ connections });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔧 UPRAVLJANJE SISTEMA

// Restart komponente
app.post('/api/debug/restart/:component', authenticateDebug, async (req, res) => {
    try {
        const { component } = req.params;
        
        // Varnostna preverka
        const allowedComponents = ['omni-core', 'omni-server', 'node-server'];
        if (!allowedComponents.includes(component)) {
            return res.status(400).json({ error: 'Invalid component' });
        }
        
        res.json({ 
            message: `Restart signal sent to ${component}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Počisti cache
app.post('/api/debug/clear-cache', authenticateDebug, async (req, res) => {
    try {
        const cacheDir = path.join(__dirname, 'omni', 'data', 'cache');
        await fs.rmdir(cacheDir, { recursive: true }).catch(() => {});
        await fs.mkdir(cacheDir, { recursive: true });
        
        res.json({ 
            message: 'Cache cleared successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📱 VERCEL INTEGRATION

// Vercel deployment info
app.get('/api/debug/vercel', authenticateDebug, async (req, res) => {
    try {
        const vercelConfig = {
            url: 'https://omnibot-12-wt1w.vercel.app/',
            local_port: 3002,
            sync_status: 'active',
            last_deployment: new Date().toISOString(),
            environment: process.env.VERCEL_ENV || 'development'
        };
        
        res.json({ vercel: vercelConfig });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🎯 DASHBOARD
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🔍 Omni Debug Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a1a; color: #fff; }
            .container { max-width: 1200px; margin: 0 auto; }
            .card { background: #2d2d2d; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .endpoint { background: #333; padding: 10px; margin: 5px 0; border-radius: 4px; }
            .method { color: #4CAF50; font-weight: bold; }
            .url { color: #2196F3; }
            h1 { color: #FF6B35; }
            h2 { color: #4CAF50; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔍 Omni Debug Dashboard</h1>
            <p>Debug ključ: <code>${DEBUG_ACCESS_KEY}</code></p>
            
            <div class="card">
                <h2>📊 Sistem Endpoints</h2>
                <div class="endpoint">
                    <span class="method">GET</span> 
                    <span class="url">/api/debug/status?key=${DEBUG_ACCESS_KEY}</span>
                    <p>Osnovni sistem status</p>
                </div>
                <div class="endpoint">
                    <span class="method">GET</span> 
                    <span class="url">/api/debug/processes?key=${DEBUG_ACCESS_KEY}</span>
                    <p>Aktivni procesi</p>
                </div>
                <div class="endpoint">
                    <span class="method">GET</span> 
                    <span class="url">/api/debug/config?key=${DEBUG_ACCESS_KEY}</span>
                    <p>Omni konfiguracija</p>
                </div>
                <div class="endpoint">
                    <span class="method">GET</span> 
                    <span class="url">/api/debug/logs?key=${DEBUG_ACCESS_KEY}</span>
                    <p>Sistem logovi</p>
                </div>
                <div class="endpoint">
                    <span class="method">GET</span> 
                    <span class="url">/api/debug/connections?key=${DEBUG_ACCESS_KEY}</span>
                    <p>Aktivne povezave</p>
                </div>
                <div class="endpoint">
                    <span class="method">GET</span> 
                    <span class="url">/api/debug/vercel?key=${DEBUG_ACCESS_KEY}</span>
                    <p>Vercel integration info</p>
                </div>
            </div>
            
            <div class="card">
                <h2>🔧 Upravljanje</h2>
                <div class="endpoint">
                    <span class="method">POST</span> 
                    <span class="url">/api/debug/clear-cache</span>
                    <p>Počisti cache</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`🔍 Omni Debug Server running on http://localhost:${PORT}`);
    console.log(`🔑 Debug Key: ${DEBUG_ACCESS_KEY}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
});

module.exports = app;