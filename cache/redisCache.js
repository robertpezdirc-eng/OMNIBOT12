// 🔹 REDIS CACHING SISTEM ZA PERFORMANSE
const redis = require('redis');

// Lokalna definicija colorLog funkcije
function colorLog(message, color = 'white') {
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
}

class RedisCache {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.localCache = new Map(); // Fallback lokalni cache
        this.maxLocalCacheSize = 1000;
    }

    async init() {
        try {
            // Poskusi povezavo z Redis samo, če je na voljo
            if (process.env.REDIS_ENABLED === 'false') {
                colorLog('⚠️ Redis onemogočen - uporabljam samo lokalni cache', 'yellow');
                return;
            }

            // Poskusi povezavo z Redis
            this.client = redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                socket: {
                    connectTimeout: 5000,
                    lazyConnect: true
                }
            });

            this.client.on('connect', () => {
                this.isConnected = true;
                colorLog('✅ Redis cache povezan', 'green');
            });

            this.client.on('error', (err) => {
                this.isConnected = false;
                // Ne prikazuj napak, če je Redis onemogočen
                if (process.env.NODE_ENV !== 'production') {
                    colorLog(`⚠️ Redis ni dosegljiv - uporabljam lokalni cache`, 'yellow');
                }
            });

            this.client.on('end', () => {
                this.isConnected = false;
            });

            // Poskusi povezavo z timeout
            const connectPromise = this.client.connect();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 3000)
            );

            await Promise.race([connectPromise, timeoutPromise]);
            
        } catch (error) {
            this.isConnected = false;
            colorLog(`💾 Uporabljam lokalni cache (Redis ni dosegljiv)`, 'blue');
        }
    }

    // Preveri, če je cache na voljo
    isAvailable() {
        return this.isConnected && this.client;
    }

    // Shrani podatke v cache
    async set(key, value, ttl = 3600) {
        try {
            if (this.isConnected && this.client) {
                await this.client.setEx(key, ttl, JSON.stringify(value));
                colorLog(`📦 Redis cache shranjen: ${key}`, 'cyan');
                return true;
            } else {
                // Fallback na lokalni cache
                this._setLocal(key, value, ttl);
                return true;
            }
        } catch (error) {
            colorLog(`❌ Cache set napaka: ${error.message}`, 'red');
            this._setLocal(key, value, ttl);
            return false;
        }
    }

    // Pridobi podatke iz cache-a
    async get(key) {
        try {
            if (this.isConnected && this.client) {
                const result = await this.client.get(key);
                if (result) {
                    colorLog(`📦 Redis cache hit: ${key}`, 'green');
                    return JSON.parse(result);
                }
            } else {
                // Fallback na lokalni cache
                return this._getLocal(key);
            }
            return null;
        } catch (error) {
            colorLog(`❌ Cache get napaka: ${error.message}`, 'red');
            return this._getLocal(key);
        }
    }

    // Izbriši iz cache-a
    async del(key) {
        try {
            if (this.isConnected && this.client) {
                await this.client.del(key);
                colorLog(`🗑️ Redis cache izbrisan: ${key}`, 'yellow');
            }
            this.localCache.delete(key);
            return true;
        } catch (error) {
            colorLog(`❌ Cache del napaka: ${error.message}`, 'red');
            this.localCache.delete(key);
            return false;
        }
    }

    // Izbriši vse ključe z določenim vzorcem
    async delPattern(pattern) {
        if (!this.isAvailable()) return false;
        
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
                this.colorLog(`🗑️ Cache izbrisanih ${keys.length} ključev z vzorcem: ${pattern}`, 'yellow');
            }
            return true;
            
        } catch (error) {
            this.colorLog(`❌ Napaka pri brisanju vzorca iz cache: ${error.message}`, 'red');
            return false;
        }
    }

    // Preveri, če ključ obstaja
    async exists(key) {
        try {
            if (this.isConnected && this.client) {
                return await this.client.exists(key);
            } else {
                return this.localCache.has(key);
            }
        } catch (error) {
            colorLog(`❌ Cache exists napaka: ${error.message}`, 'red');
            return this.localCache.has(key);
        }
    }

    // Lokalni cache metode
    _setLocal(key, value, ttl) {
        // Preveri velikost cache-a
        if (this.localCache.size >= this.maxLocalCacheSize) {
            const firstKey = this.localCache.keys().next().value;
            this.localCache.delete(firstKey);
        }

        const expiry = Date.now() + (ttl * 1000);
        this.localCache.set(key, { value, expiry });
        colorLog(`💾 Lokalni cache shranjen: ${key}`, 'blue');
    }

    _getLocal(key) {
        const cached = this.localCache.get(key);
        if (cached) {
            if (Date.now() < cached.expiry) {
                colorLog(`💾 Lokalni cache hit: ${key}`, 'blue');
                return cached.value;
            } else {
                this.localCache.delete(key);
                colorLog(`⏰ Lokalni cache potekel: ${key}`, 'yellow');
            }
        }
        return null;
    }

    // Nastavi TTL za obstoječi ključ
    async expire(key, ttl) {
        if (!this.isAvailable()) return false;
        
        try {
            const result = await this.client.expire(key, ttl);
            return result === 1;
            
        } catch (error) {
            this.colorLog(`❌ Napaka pri nastavljanju TTL: ${error.message}`, 'red');
            return false;
        }
    }

    // Pridobi TTL za ključ
    async ttl(key) {
        if (!this.isAvailable()) return -1;
        
        try {
            return await this.client.ttl(key);
            
        } catch (error) {
            this.colorLog(`❌ Napaka pri pridobivanju TTL: ${error.message}`, 'red');
            return -1;
        }
    }

    // Zapri povezavo
    async close() {
        if (this.client) {
            await this.client.quit();
            this.colorLog('🔌 Redis povezava zaprta', 'yellow');
        }
    }

    // 🔹 SPECIFIČNE METODE ZA LICENCE
    
    // Cache za licenco
    async cacheLicense(licenseKey, licenseData, ttl = 1800) { // 30 minut
        return await this.set(`license:${licenseKey}`, licenseData, ttl);
    }

    // Pridobi licenco iz cache
    async getLicense(licenseKey) {
        return await this.get(`license:${licenseKey}`);
    }

    // Invalidate licenco
    async invalidateLicense(licenseKey) {
        return await this.del(`license:${licenseKey}`);
    }

    // Cache za module
    async cacheModule(moduleId, moduleData, ttl = 3600) { // 1 ura
        return await this.set(`module:${moduleId}`, moduleData, ttl);
    }

    // Pridobi modul iz cache
    async getModule(moduleId) {
        return await this.get(`module:${moduleId}`);
    }

    // Cache za statistike
    async cacheStats(statsData, ttl = 300) { // 5 minut
        return await this.set('stats:global', statsData, ttl);
    }

    // Pridobi statistike iz cache
    async getStats() {
        return await this.get('stats:global');
    }

    // Cache za client licence
    async cacheClientLicenses(clientId, licenses, ttl = 600) { // 10 minut
        return await this.set(`client:${clientId}:licenses`, licenses, ttl);
    }

    // Pridobi client licence iz cache
    async getClientLicenses(clientId) {
        return await this.get(`client:${clientId}:licenses`);
    }

    // Invalidate vse licence za client
    async invalidateClientLicenses(clientId) {
        return await this.delPattern(`client:${clientId}:*`);
    }

    // Cache za preklicane licence
    async cacheRevokedLicense(licenseKey, ttl = 86400) { // 24 ur
        return await this.set(`revoked:${licenseKey}`, true, ttl);
    }

    // Preveri, če je licenca preklicana (iz cache)
    async isLicenseRevoked(licenseKey) {
        return await this.exists(`revoked:${licenseKey}`);
    }

    // Počisti vse cache podatke
    async flushAll() {
        if (!this.isAvailable()) return false;
        
        try {
            await this.client.flushAll();
            this.colorLog('🧹 Ves cache počiščen', 'yellow');
            return true;
            
        } catch (error) {
            this.colorLog(`❌ Napaka pri čiščenju cache: ${error.message}`, 'red');
            return false;
        }
    }

    // Pridobi informacije o cache
    async getInfo() {
        if (!this.isAvailable()) {
            return {
                connected: false,
                message: 'Redis ni na voljo'
            };
        }
        
        try {
            const info = await this.client.info();
            const dbSize = await this.client.dbSize();
            
            return {
                connected: true,
                dbSize,
                info: info.split('\r\n').reduce((acc, line) => {
                    const [key, value] = line.split(':');
                    if (key && value) acc[key] = value;
                    return acc;
                }, {})
            };
            
        } catch (error) {
            this.colorLog(`❌ Napaka pri pridobivanju info: ${error.message}`, 'red');
            return {
                connected: false,
                error: error.message
            };
        }
    }
}

// Singleton instance
const cacheInstance = new RedisCache();

module.exports = {
    RedisCache,
    cache: cacheInstance
};