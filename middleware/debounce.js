// 🔹 DEBOUNCE MIDDLEWARE ZA API KLICE
const { cache } = require('../cache/redisCache');

class DebounceManager {
    constructor() {
        this.localCache = new Map(); // Fallback če Redis ni na voljo
        this.defaultDelay = 1000; // 1 sekunda
        
        // Barvni izpis
        this.colors = {
            reset: '\x1b[0m',
            green: '\x1b[32m',
            blue: '\x1b[34m',
            yellow: '\x1b[33m',
            red: '\x1b[31m',
            cyan: '\x1b[36m'
        };
    }

    colorLog(message, color = 'reset') {
        console.log(`${this.colors[color] || this.colors.reset}${message}${this.colors.reset}`);
    }

    // Ustvari ključ za debounce
    createKey(req, identifier = null) {
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || 'unknown';
        const endpoint = req.route ? req.route.path : req.path;
        const method = req.method;
        
        // Če je podan identifier, ga uporabi, sicer uporabi kombinacijo IP + endpoint
        const baseKey = identifier || `${ip}:${endpoint}:${method}`;
        
        return `debounce:${baseKey}`;
    }

    // Preveri, če je zahteva debounced
    async isDebounced(key) {
        // Najprej preveri Redis
        if (cache.isAvailable()) {
            const exists = await cache.exists(key);
            return exists;
        }
        
        // Fallback na lokalni cache
        return this.localCache.has(key);
    }

    // Nastavi debounce
    async setDebounce(key, delay = null) {
        const debounceDelay = delay || this.defaultDelay;
        
        // Uporabi Redis če je na voljo
        if (cache.isAvailable()) {
            await cache.set(key, true, Math.ceil(debounceDelay / 1000));
        } else {
            // Fallback na lokalni cache
            this.localCache.set(key, true);
            setTimeout(() => {
                this.localCache.delete(key);
            }, debounceDelay);
        }
    }

    // Počisti debounce
    async clearDebounce(key) {
        if (cache.isAvailable()) {
            await cache.del(key);
        } else {
            this.localCache.delete(key);
        }
    }
}

const debounceManager = new DebounceManager();

// 🔹 DEBOUNCE MIDDLEWARE FUNKCIJE

// Osnovni debounce middleware
const debounce = (delay = 1000, identifier = null) => {
    return async (req, res, next) => {
        try {
            const key = debounceManager.createKey(req, identifier);
            
            // Preveri, če je zahteva že v debounce
            if (await debounceManager.isDebounced(key)) {
                debounceManager.colorLog(`⏳ Debounced zahteva: ${req.method} ${req.path}`, 'yellow');
                
                return res.status(429).json({
                    success: false,
                    error: 'Zahteva je bila poslana preveč hitro',
                    message: `Počakajte ${delay}ms pred naslednjo zahtevo`,
                    retryAfter: Math.ceil(delay / 1000)
                });
            }
            
            // Nastavi debounce za naslednjo zahtevo
            await debounceManager.setDebounce(key, delay);
            
            debounceManager.colorLog(`✅ Zahteva dovoljena: ${req.method} ${req.path}`, 'green');
            next();
            
        } catch (error) {
            debounceManager.colorLog(`❌ Napaka v debounce middleware: ${error.message}`, 'red');
            next(); // Nadaljuj kljub napaki
        }
    };
};

// Debounce za licence validacijo
const licenseDebounce = (delay = 2000) => {
    return debounce(delay, (req) => {
        const licenseKey = req.body.license_key || req.params.license_key;
        return licenseKey ? `license:${licenseKey}` : null;
    });
};

// Debounce za client zahteve
const clientDebounce = (delay = 1500) => {
    return debounce(delay, (req) => {
        const clientId = req.body.client_id || req.params.client_id;
        return clientId ? `client:${clientId}` : null;
    });
};

// Debounce za batch operacije
const batchDebounce = (delay = 5000) => {
    return debounce(delay, (req) => {
        const ip = req.ip || req.connection.remoteAddress;
        return `batch:${ip}`;
    });
};

// Debounce za statistike
const statsDebounce = (delay = 10000) => {
    return debounce(delay, () => 'stats:global');
};

// Pametni debounce - prilagodi delay glede na tip zahteve
const smartDebounce = () => {
    return async (req, res, next) => {
        let delay = 1000; // Privzeto
        let identifier = null;
        
        // Prilagodi delay glede na endpoint
        if (req.path.includes('/validate')) {
            delay = 2000; // Licence validacija
            identifier = `license:${req.body.license_key}`;
        } else if (req.path.includes('/batch/')) {
            delay = 5000; // Batch operacije
            identifier = `batch:${req.ip}`;
        } else if (req.path.includes('/stats')) {
            delay = 10000; // Statistike
            identifier = 'stats:global';
        } else if (req.method === 'POST') {
            delay = 1500; // POST zahteve
        } else if (req.method === 'GET') {
            delay = 500; // GET zahteve
        }
        
        // Uporabi osnovni debounce z izračunanimi parametri
        return debounce(delay, identifier)(req, res, next);
    };
};

// Debounce za WebSocket povezave
const wsDebounce = (delay = 3000) => {
    const wsConnections = new Map();
    
    return (socket, next) => {
        const clientId = socket.handshake.query.client_id;
        const ip = socket.handshake.address;
        const key = clientId || ip;
        
        const now = Date.now();
        const lastConnection = wsConnections.get(key);
        
        if (lastConnection && (now - lastConnection) < delay) {
            debounceManager.colorLog(`⏳ WebSocket debounced: ${key}`, 'yellow');
            return next(new Error('Povezava je bila poskušana preveč hitro'));
        }
        
        wsConnections.set(key, now);
        
        // Počisti stare povezave
        setTimeout(() => {
            wsConnections.delete(key);
        }, delay);
        
        debounceManager.colorLog(`✅ WebSocket povezava dovoljena: ${key}`, 'green');
        next();
    };
};

// Middleware za čiščenje debounce cache
const clearDebounceCache = async (req, res, next) => {
    try {
        if (req.query.clearDebounce === 'true') {
            const key = debounceManager.createKey(req);
            await debounceManager.clearDebounce(key);
            debounceManager.colorLog(`🧹 Debounce cache počiščen za: ${key}`, 'cyan');
        }
        next();
    } catch (error) {
        debounceManager.colorLog(`❌ Napaka pri čiščenju debounce: ${error.message}`, 'red');
        next();
    }
};

// Informacije o debounce statusu
const debounceInfo = async (req, res) => {
    try {
        const key = debounceManager.createKey(req);
        const isDebounced = await debounceManager.isDebounced(key);
        
        let ttl = -1;
        if (cache.isAvailable()) {
            ttl = await cache.ttl(key);
        }
        
        res.json({
            success: true,
            data: {
                key,
                isDebounced,
                ttl: ttl > 0 ? ttl : null,
                message: isDebounced ? 
                    `Zahteva je v debounce, počakajte ${ttl}s` : 
                    'Zahteva ni v debounce'
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    debounce,
    licenseDebounce,
    clientDebounce,
    batchDebounce,
    statsDebounce,
    smartDebounce,
    wsDebounce,
    clearDebounceCache,
    debounceInfo,
    DebounceManager,
    debounceManager
};