// 🔹 REDIS MANAGER ZA ZILLIZ CLOUD
const redis = require('redis');

/**
 * Ustvari Redis odjemalca za Zilliz Cloud
 * @param {Object} config - Redis konfiguracija
 * @returns {Object|null} Redis odjemalec ali null
 */
async function createRedisClient(config = {}) {
    try {
        const redisConfig = {
            host: config.host || process.env.REDIS_HOST || 'localhost',
            port: config.port || process.env.REDIS_PORT || 6379,
            password: config.password || process.env.REDIS_PASSWORD,
            db: config.db || process.env.REDIS_DB || 0,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            connectTimeout: 10000,
            lazyConnect: true
        };

        // Če je nastavljeno REDIS_URL, uporabi to
        if (process.env.REDIS_URL) {
            const client = redis.createClient({
                url: process.env.REDIS_URL,
                socket: {
                    connectTimeout: 10000,
                    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
                }
            });
            
            await client.connect();
            console.log('✅ Redis povezan preko URL');
            return client;
        }

        // Sicer uporabi host/port konfiguraciju
        const client = redis.createClient(redisConfig);
        
        client.on('error', (err) => {
            console.warn('⚠️ Redis napaka:', err.message);
        });

        client.on('connect', () => {
            console.log('🔗 Redis povezava vzpostavljena');
        });

        client.on('ready', () => {
            console.log('✅ Redis pripravljen za uporabo');
        });

        await client.connect();
        return client;

    } catch (error) {
        console.warn('⚠️ Redis ni dosegljiv:', error.message);
        return null;
    }
}

/**
 * Redis Manager razred za upravljanje cache operacij
 */
class RedisManager {
    constructor(client) {
        this.client = client;
        this.connected = client !== null;
        this.localCache = new Map(); // Fallback cache
    }

    /**
     * Preveri, ali je Redis povezan
     */
    isConnected() {
        return this.client && this.client.isOpen;
    }

    /**
     * Pridobi vrednost iz cache-a
     */
    async get(key) {
        try {
            if (this.isConnected()) {
                const value = await this.client.get(key);
                return value ? JSON.parse(value) : null;
            } else {
                // Fallback na lokalni cache
                return this.localCache.get(key) || null;
            }
        } catch (error) {
            console.warn('Redis GET napaka:', error.message);
            return this.localCache.get(key) || null;
        }
    }

    /**
     * Nastavi vrednost v cache
     */
    async set(key, value, ttl = 3600) {
        try {
            const stringValue = JSON.stringify(value);
            
            if (this.isConnected()) {
                if (ttl) {
                    await this.client.setEx(key, ttl, stringValue);
                } else {
                    await this.client.set(key, stringValue);
                }
            }
            
            // Vedno shrani tudi v lokalni cache kot fallback
            this.localCache.set(key, value);
            
            // Omeji velikost lokalnega cache-a
            if (this.localCache.size > 1000) {
                const firstKey = this.localCache.keys().next().value;
                this.localCache.delete(firstKey);
            }
            
            return true;
        } catch (error) {
            console.warn('Redis SET napaka:', error.message);
            this.localCache.set(key, value);
            return false;
        }
    }

    /**
     * Izbriši ključ iz cache-a
     */
    async del(key) {
        try {
            if (this.isConnected()) {
                await this.client.del(key);
            }
            this.localCache.delete(key);
            return true;
        } catch (error) {
            console.warn('Redis DEL napaka:', error.message);
            this.localCache.delete(key);
            return false;
        }
    }

    /**
     * Počisti ves cache
     */
    async flush() {
        try {
            if (this.isConnected()) {
                await this.client.flushDb();
            }
            this.localCache.clear();
            return true;
        } catch (error) {
            console.warn('Redis FLUSH napaka:', error.message);
            this.localCache.clear();
            return false;
        }
    }

    /**
     * Pridobi informacije o Redis strežniku
     */
    async getInfo() {
        try {
            if (this.isConnected()) {
                const info = await this.client.info();
                return {
                    status: 'connected',
                    info: info,
                    localCacheSize: this.localCache.size
                };
            } else {
                return {
                    status: 'disconnected',
                    localCacheSize: this.localCache.size
                };
            }
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                localCacheSize: this.localCache.size
            };
        }
    }

    /**
     * Zapri Redis povezavo
     */
    async close() {
        try {
            if (this.client && this.client.isOpen) {
                await this.client.quit();
                console.log('📦 Redis povezava zaprta');
            }
        } catch (error) {
            console.warn('Napaka pri zapiranju Redis povezave:', error.message);
        }
    }

    // 🔹 VECTOR DATABASE CACHE OPTIMIZACIJE

    /**
     * Cache za vektorska iskanja z optimiziranim ključem
     */
    async cacheVectorSearch(collectionName, vector, topK, filter, results, ttl = 1800) {
        try {
            // Ustvari unikaten ključ za iskanje
            const vectorHash = this.hashVector(vector);
            const filterHash = filter ? this.hashObject(filter) : 'no-filter';
            const searchKey = `vector:search:${collectionName}:${vectorHash}:${topK}:${filterHash}`;
            
            const cacheData = {
                results: results,
                timestamp: Date.now(),
                collectionName: collectionName,
                topK: topK,
                hasFilter: !!filter
            };

            await this.set(searchKey, cacheData, ttl);
            console.log(`📦 Vector search cached: ${searchKey}`);
            return searchKey;
        } catch (error) {
            console.warn('Vector search cache napaka:', error.message);
            return null;
        }
    }

    /**
     * Pridobi cached vektorsko iskanje
     */
    async getCachedVectorSearch(collectionName, vector, topK, filter) {
        try {
            const vectorHash = this.hashVector(vector);
            const filterHash = filter ? this.hashObject(filter) : 'no-filter';
            const searchKey = `vector:search:${collectionName}:${vectorHash}:${topK}:${filterHash}`;
            
            const cached = await this.get(searchKey);
            if (cached) {
                console.log(`🎯 Vector search cache hit: ${searchKey}`);
                return cached.results;
            }
            return null;
        } catch (error) {
            console.warn('Vector search cache retrieval napaka:', error.message);
            return null;
        }
    }

    /**
     * Cache za kolekcije metadata
     */
    async cacheCollectionInfo(collectionName, info, ttl = 3600) {
        try {
            const key = `vector:collection:${collectionName}:info`;
            await this.set(key, info, ttl);
            console.log(`📦 Collection info cached: ${collectionName}`);
        } catch (error) {
            console.warn('Collection info cache napaka:', error.message);
        }
    }

    /**
     * Pridobi cached collection info
     */
    async getCachedCollectionInfo(collectionName) {
        try {
            const key = `vector:collection:${collectionName}:info`;
            const cached = await this.get(key);
            if (cached) {
                console.log(`🎯 Collection info cache hit: ${collectionName}`);
            }
            return cached;
        } catch (error) {
            console.warn('Collection info cache retrieval napaka:', error.message);
            return null;
        }
    }

    /**
     * Cache za batch operacije
     */
    async cacheBatchOperation(operationType, collectionName, data, results, ttl = 900) {
        try {
            const batchHash = this.hashObject(data);
            const key = `vector:batch:${operationType}:${collectionName}:${batchHash}`;
            
            const cacheData = {
                results: results,
                timestamp: Date.now(),
                operationType: operationType,
                dataSize: Array.isArray(data) ? data.length : 1
            };

            await this.set(key, cacheData, ttl);
            console.log(`📦 Batch operation cached: ${key}`);
        } catch (error) {
            console.warn('Batch operation cache napaka:', error.message);
        }
    }

    /**
     * Invalidate cache za določeno kolekcijo
     */
    async invalidateCollectionCache(collectionName) {
        try {
            if (this.isConnected()) {
                // Poišči vse ključe za to kolekcijo
                const patterns = [
                    `vector:search:${collectionName}:*`,
                    `vector:collection:${collectionName}:*`,
                    `vector:batch:*:${collectionName}:*`
                ];

                for (const pattern of patterns) {
                    const keys = await this.client.keys(pattern);
                    if (keys.length > 0) {
                        await this.client.del(keys);
                        console.log(`🗑️ Invalidated ${keys.length} cache keys for collection: ${collectionName}`);
                    }
                }
            }

            // Počisti tudi lokalni cache
            for (const [key, value] of this.localCache.entries()) {
                if (key.includes(collectionName)) {
                    this.localCache.delete(key);
                }
            }

        } catch (error) {
            console.warn('Collection cache invalidation napaka:', error.message);
        }
    }

    /**
     * Pridobi cache statistike za vector operacije
     */
    async getVectorCacheStats() {
        try {
            const stats = {
                totalKeys: 0,
                searchKeys: 0,
                collectionKeys: 0,
                batchKeys: 0,
                localCacheSize: this.localCache.size,
                connected: this.isConnected()
            };

            if (this.isConnected()) {
                const allKeys = await this.client.keys('vector:*');
                stats.totalKeys = allKeys.length;
                
                stats.searchKeys = allKeys.filter(key => key.includes(':search:')).length;
                stats.collectionKeys = allKeys.filter(key => key.includes(':collection:')).length;
                stats.batchKeys = allKeys.filter(key => key.includes(':batch:')).length;
            }

            return stats;
        } catch (error) {
            console.warn('Vector cache stats napaka:', error.message);
            return {
                error: error.message,
                localCacheSize: this.localCache.size,
                connected: false
            };
        }
    }

    /**
     * Ustvari hash za vektor (za cache ključe)
     */
    hashVector(vector) {
        try {
            if (!Array.isArray(vector)) return 'invalid-vector';
            
            // Uporabi samo prvih 10 elementov za hash (optimizacija)
            const sample = vector.slice(0, 10);
            const str = sample.map(v => v.toFixed(4)).join(',');
            
            // Enostaven hash
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(16);
        } catch (error) {
            return 'hash-error';
        }
    }

    /**
     * Ustvari hash za objekt
     */
    hashObject(obj) {
        try {
            const str = JSON.stringify(obj, Object.keys(obj).sort());
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
        } catch (error) {
            return 'hash-error';
        }
    }
}

module.exports = {
    createRedisClient,
    RedisManager
};