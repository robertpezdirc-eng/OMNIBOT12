const express = require('express');
const router = express.Router();

// Lokalna definicija colorLog funkcije
const colorLog = (message, color = 'white') => {
    const colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[color] || colors.white}${message}${colors.reset}`);
};

// Simulacija sistemskih podatkov
let systemStats = {
    uptime: Date.now(),
    requests_total: 0,
    requests_success: 0,
    requests_failed: 0,
    memory_usage: 0,
    cpu_usage: 0,
    active_connections: 0,
    cache_hits: 0,
    cache_misses: 0,
    database_connections: 0
};

// Simulacija uporabnikov
let users = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@omni.ai',
        role: 'administrator',
        status: 'active',
        last_login: new Date(),
        created_at: new Date('2024-01-01'),
        permissions: ['all']
    },
    {
        id: 2,
        username: 'manager',
        email: 'manager@omni.ai',
        role: 'manager',
        status: 'active',
        last_login: new Date(),
        created_at: new Date('2024-01-15'),
        permissions: ['read', 'write', 'manage_users']
    }
];

// Simulacija dnevnika aktivnosti
let activityLog = [
    {
        id: 1,
        user_id: 1,
        username: 'admin',
        action: 'LOGIN',
        resource: 'system',
        details: 'Uspešna prijava v sistem',
        ip_address: '192.168.1.100',
        timestamp: new Date(),
        status: 'success'
    },
    {
        id: 2,
        user_id: 1,
        username: 'admin',
        action: 'CREATE_LICENSE',
        resource: 'license',
        details: 'Ustvarjena nova licenca za podjetje XYZ',
        ip_address: '192.168.1.100',
        timestamp: new Date(Date.now() - 3600000),
        status: 'success'
    }
];

// GET /api/admin/dashboard - Pregled nadzorne plošče
router.get('/dashboard', (req, res) => {
    try {
        const currentTime = Date.now();
        const uptimeSeconds = Math.floor((currentTime - systemStats.uptime) / 1000);
        
        // Simulacija trenutnih metrik
        systemStats.memory_usage = Math.random() * 80 + 10; // 10-90%
        systemStats.cpu_usage = Math.random() * 60 + 5; // 5-65%
        systemStats.active_connections = Math.floor(Math.random() * 50) + 10;
        
        const dashboard = {
            system_status: 'healthy',
            uptime_seconds: uptimeSeconds,
            uptime_formatted: formatUptime(uptimeSeconds),
            performance: {
                memory_usage_percent: Math.round(systemStats.memory_usage),
                cpu_usage_percent: Math.round(systemStats.cpu_usage),
                active_connections: systemStats.active_connections,
                requests_per_minute: Math.floor(systemStats.requests_total / (uptimeSeconds / 60)) || 0
            },
            statistics: {
                total_requests: systemStats.requests_total,
                successful_requests: systemStats.requests_success,
                failed_requests: systemStats.requests_failed,
                success_rate: systemStats.requests_total > 0 ? 
                    Math.round((systemStats.requests_success / systemStats.requests_total) * 100) : 100,
                cache_hit_rate: (systemStats.cache_hits + systemStats.cache_misses) > 0 ?
                    Math.round((systemStats.cache_hits / (systemStats.cache_hits + systemStats.cache_misses)) * 100) : 0
            },
            users: {
                total_users: users.length,
                active_users: users.filter(u => u.status === 'active').length,
                online_users: Math.floor(Math.random() * users.length) + 1
            }
        };

        colorLog(`📊 Pridobljena nadzorna plošča`, 'cyan');
        
        res.json({
            success: true,
            dashboard: dashboard,
            timestamp: new Date()
        });
    } catch (error) {
        colorLog(`❌ Napaka pri pridobivanju nadzorne plošče: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju nadzorne plošče',
            message: error.message
        });
    }
});

// GET /api/admin/users - Seznam uporabnikov
router.get('/users', (req, res) => {
    try {
        const { role, status, search } = req.query;
        let filteredUsers = users;

        // Filtriraj po vlogi
        if (role) {
            filteredUsers = filteredUsers.filter(user => user.role === role);
        }

        // Filtriraj po statusu
        if (status) {
            filteredUsers = filteredUsers.filter(user => user.status === status);
        }

        // Filtriraj po iskanju
        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = filteredUsers.filter(user => 
                user.username.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower)
            );
        }

        colorLog(`👥 Pridobljenih ${filteredUsers.length} uporabnikov`, 'cyan');
        
        res.json({
            success: true,
            users: filteredUsers,
            total: filteredUsers.length,
            filters: { role, status, search }
        });
    } catch (error) {
        colorLog(`❌ Napaka pri pridobivanju uporabnikov: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju uporabnikov',
            message: error.message
        });
    }
});

// POST /api/admin/users - Ustvari novega uporabnika
router.post('/users', (req, res) => {
    try {
        const { username, email, role, permissions = [] } = req.body;

        if (!username || !email || !role) {
            return res.status(400).json({
                success: false,
                error: 'Manjkajo obvezni podatki',
                required: ['username', 'email', 'role']
            });
        }

        // Preveri, če uporabnik že obstaja
        const existingUser = users.find(u => u.username === username || u.email === email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Uporabnik že obstaja',
                existing_field: existingUser.username === username ? 'username' : 'email'
            });
        }

        const newUser = {
            id: users.length + 1,
            username,
            email,
            role,
            status: 'active',
            last_login: null,
            created_at: new Date(),
            permissions
        };

        users.push(newUser);
        
        // Dodaj v dnevnik aktivnosti
        activityLog.push({
            id: activityLog.length + 1,
            user_id: 1, // Admin
            username: 'admin',
            action: 'CREATE_USER',
            resource: 'user',
            details: `Ustvarjen nov uporabnik: ${username}`,
            ip_address: req.ip,
            timestamp: new Date(),
            status: 'success'
        });

        colorLog(`✅ Ustvarjen nov uporabnik: ${username}`, 'green');

        res.status(201).json({
            success: true,
            message: 'Uporabnik uspešno ustvarjen',
            user: newUser
        });
    } catch (error) {
        colorLog(`❌ Napaka pri ustvarjanju uporabnika: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri ustvarjanju uporabnika',
            message: error.message
        });
    }
});

// GET /api/admin/activity - Dnevnik aktivnosti
router.get('/activity', (req, res) => {
    try {
        const { user_id, action, limit = 50, offset = 0 } = req.query;
        let filteredLog = activityLog;

        // Filtriraj po uporabniku
        if (user_id) {
            filteredLog = filteredLog.filter(log => log.user_id == user_id);
        }

        // Filtriraj po akciji
        if (action) {
            filteredLog = filteredLog.filter(log => log.action === action);
        }

        // Sortiraj po času (najnovejši najprej)
        filteredLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Paginacija
        const paginatedLog = filteredLog.slice(offset, offset + parseInt(limit));

        colorLog(`📋 Pridobljenih ${paginatedLog.length} zapisov aktivnosti`, 'cyan');
        
        res.json({
            success: true,
            activity_log: paginatedLog,
            total: filteredLog.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            filters: { user_id, action }
        });
    } catch (error) {
        colorLog(`❌ Napaka pri pridobivanju dnevnika: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju dnevnika aktivnosti',
            message: error.message
        });
    }
});

// GET /api/admin/system/health - Zdravje sistema
router.get('/system/health', (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date(),
            services: {
                database: {
                    status: 'connected',
                    response_time_ms: Math.floor(Math.random() * 50) + 10,
                    connections: systemStats.database_connections
                },
                cache: {
                    status: 'connected',
                    hit_rate: (systemStats.cache_hits + systemStats.cache_misses) > 0 ?
                        Math.round((systemStats.cache_hits / (systemStats.cache_hits + systemStats.cache_misses)) * 100) : 0,
                    memory_usage_mb: Math.floor(Math.random() * 100) + 50
                },
                websocket: {
                    status: 'active',
                    active_connections: systemStats.active_connections,
                    messages_per_minute: Math.floor(Math.random() * 200) + 50
                }
            },
            performance: {
                memory_usage_percent: Math.round(systemStats.memory_usage),
                cpu_usage_percent: Math.round(systemStats.cpu_usage),
                disk_usage_percent: Math.floor(Math.random() * 40) + 20,
                network_io_mbps: Math.floor(Math.random() * 100) + 10
            }
        };

        colorLog(`🏥 Preverjeno zdravje sistema`, 'green');
        
        res.json({
            success: true,
            health: health
        });
    } catch (error) {
        colorLog(`❌ Napaka pri preverjanju zdravja: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri preverjanju zdravja sistema',
            message: error.message
        });
    }
});

// POST /api/admin/system/maintenance - Vzdrževalni način
router.post('/system/maintenance', (req, res) => {
    try {
        const { enabled, message = 'Sistem je v vzdrževanju' } = req.body;

        // Simulacija vzdrževalnega načina
        const maintenanceStatus = {
            enabled: Boolean(enabled),
            message: message,
            started_at: enabled ? new Date() : null,
            estimated_duration_minutes: enabled ? 30 : null
        };

        // Dodaj v dnevnik aktivnosti
        activityLog.push({
            id: activityLog.length + 1,
            user_id: 1, // Admin
            username: 'admin',
            action: enabled ? 'ENABLE_MAINTENANCE' : 'DISABLE_MAINTENANCE',
            resource: 'system',
            details: `Vzdrževalni način ${enabled ? 'omogočen' : 'onemogočen'}`,
            ip_address: req.ip,
            timestamp: new Date(),
            status: 'success'
        });

        colorLog(`🔧 Vzdrževalni način ${enabled ? 'omogočen' : 'onemogočen'}`, 'yellow');

        res.json({
            success: true,
            message: `Vzdrževalni način ${enabled ? 'omogočen' : 'onemogočen'}`,
            maintenance: maintenanceStatus
        });
    } catch (error) {
        colorLog(`❌ Napaka pri vzdrževalnem načinu: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri vzdrževalnem načinu',
            message: error.message
        });
    }
});

// GET /api/admin/statistics/overview - Pregled statistik
router.get('/statistics/overview', (req, res) => {
    try {
        const { period = '24h' } = req.query;
        
        // Simulacija statistik glede na obdobje
        const stats = {
            period: period,
            requests: {
                total: systemStats.requests_total,
                successful: systemStats.requests_success,
                failed: systemStats.requests_failed,
                success_rate: systemStats.requests_total > 0 ? 
                    Math.round((systemStats.requests_success / systemStats.requests_total) * 100) : 100
            },
            users: {
                total: users.length,
                active: users.filter(u => u.status === 'active').length,
                new_registrations: Math.floor(Math.random() * 5) + 1
            },
            performance: {
                avg_response_time_ms: Math.floor(Math.random() * 200) + 50,
                peak_cpu_usage: Math.round(systemStats.cpu_usage),
                peak_memory_usage: Math.round(systemStats.memory_usage),
                cache_efficiency: (systemStats.cache_hits + systemStats.cache_misses) > 0 ?
                    Math.round((systemStats.cache_hits / (systemStats.cache_hits + systemStats.cache_misses)) * 100) : 0
            }
        };

        colorLog(`📈 Pridobljene statistike za obdobje: ${period}`, 'cyan');
        
        res.json({
            success: true,
            statistics: stats,
            timestamp: new Date()
        });
    } catch (error) {
        colorLog(`❌ Napaka pri pridobivanju statistik: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju statistik',
            message: error.message
        });
    }
});

// Pomožna funkcija za formatiranje časa delovanja
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Middleware za posodabljanje statistik
router.use((req, res, next) => {
    systemStats.requests_total++;
    
    // Simulacija uspešnosti zahtev
    if (Math.random() > 0.05) { // 95% uspešnost
        systemStats.requests_success++;
    } else {
        systemStats.requests_failed++;
    }
    
    next();
});

module.exports = router;