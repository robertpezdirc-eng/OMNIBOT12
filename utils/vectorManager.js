// 🔹 VECTOR DATABASE MANAGER ZA ZILLIZ CLOUD (MILVUS)
const { MilvusClient, DataType } = require('@zilliz/milvus2-sdk-node');

/**
 * Vector Database Manager za Zilliz Cloud
 * Omogoča shranjevanje in iskanje vektorskih podatkov
 */
class VectorManager {
    constructor(config = {}) {
        this.config = {
            host: config.host || process.env.VECTOR_DB_HOST,
            port: config.port || 19530,
            database: config.database || process.env.VECTOR_DB_NAME || 'default',
            token: config.token || process.env.VECTOR_DB_TOKEN,
            enabled: config.enabled !== false && process.env.VECTOR_DB_ENABLED !== 'false'
        };
        
        this.client = null;
        this.connected = false;
        this.collections = new Map();
        this.socketManager = null; // WebSocket manager za real-time posodobitve
        this.redisManager = null; // Redis manager za cache optimizacije
    }

    /**
     * Nastavi WebSocket manager za real-time posodobitve
     */
    setSocketManager(socketManager) {
        this.socketManager = socketManager;
        console.log('🔌 WebSocket manager povezan z VectorManager');
    }

    /**
     * Nastavi Redis manager za cache optimizacije
     */
    setRedisManager(redisManager) {
        this.redisManager = redisManager;
        console.log('🎯 Redis manager povezan z VectorManager za cache optimizacije');
    }

    /**
     * Inicializacija povezave z Zilliz Cloud
     */
    async initialize() {
        if (!this.config.enabled) {
            console.log('⚠️ Vector database onemogočen');
            return false;
        }

        try {
            const clientConfig = {
                address: `https://${this.config.host}`,
                database: this.config.database
            };

            // Dodaj token, če je na voljo
            if (this.config.token) {
                clientConfig.token = this.config.token;
            }

            console.log('🔗 Povezujem z Zilliz Cloud:', clientConfig.address);
            this.client = new MilvusClient(clientConfig);

            // Preveri povezavo
            const health = await this.client.checkHealth();
            if (health.isHealthy) {
                this.connected = true;
                console.log('✅ Vector database (Zilliz Cloud) povezan');
                return true;
            } else {
                console.warn('⚠️ Vector database ni zdrav');
                return false;
            }
        } catch (error) {
            console.warn('⚠️ Vector database ni dosegljiv:', error.message);
            return false;
        }
    }

    /**
     * Ustvari kolekcijo za vektorske podatke
     */
    async createCollection(collectionName, dimension = 768, description = '') {
        if (!this.isConnected()) {
            return false;
        }

        try {
            const schema = [
                {
                    name: 'id',
                    data_type: DataType.Int64,
                    is_primary_key: true,
                    auto_id: true
                },
                {
                    name: 'vector',
                    data_type: DataType.FloatVector,
                    dim: dimension
                },
                {
                    name: 'text',
                    data_type: DataType.VarChar,
                    max_length: 65535
                },
                {
                    name: 'metadata',
                    data_type: DataType.JSON
                },
                {
                    name: 'timestamp',
                    data_type: DataType.Int64
                }
            ];

            await this.client.createCollection({
                collection_name: collectionName,
                fields: schema,
                description: description
            });

            // Ustvari indeks za vektorsko iskanje
            await this.client.createIndex({
                collection_name: collectionName,
                field_name: 'vector',
                index_type: 'IVF_FLAT',
                metric_type: 'L2',
                params: { nlist: 1024 }
            });

            this.collections.set(collectionName, { dimension, schema });
            console.log(`✅ Kolekcija '${collectionName}' ustvarjena`);
            return true;
        } catch (error) {
            console.warn(`⚠️ Napaka pri ustvarjanju kolekcije '${collectionName}':`, error.message);
            return false;
        }
    }

    /**
     * Vstavi vektorske podatke
     */
    async insertVectors(collectionName, vectors) {
        if (!this.isConnected()) {
            return false;
        }

        try {
            const insertData = vectors.map(v => ({
                vector: v.vector,
                text: v.text || '',
                metadata: v.metadata || {},
                timestamp: Date.now()
            }));

            await this.client.insert({
                collection_name: collectionName,
                data: insertData
            });

            console.log(`✅ Vstavljenih ${vectors.length} vektorjev v '${collectionName}'`);

            // Pošlji WebSocket posodobitev
            if (this.socketManager) {
                this.socketManager.broadcastVectorUpdate(collectionName, 'insert', {
                    count: vectors.length,
                    vectors: insertData.map(v => ({
                        text: v.text,
                        metadata: v.metadata,
                        timestamp: v.timestamp
                    }))
                });
            }

            return true;
        } catch (error) {
            console.warn(`⚠️ Napaka pri vstavljanju vektorjev:`, error.message);
            return false;
        }
    }

    /**
     * Iskanje podobnih vektorjev
     */
    async searchVectors(collectionName, queryVector, topK = 10, filter = null) {
        if (!this.isConnected()) {
            return [];
        }

        try {
            // 🔹 REDIS CACHE OPTIMIZACIJA - Preveri cache najprej
            if (this.redisManager) {
                const cachedResults = await this.redisManager.getCachedVectorSearch(
                    collectionName, queryVector, topK, filter
                );
                if (cachedResults) {
                    console.log(`🎯 Cache hit za vector search: ${collectionName}`);
                    
                    // Pošlji WebSocket posodobitev za cached iskanje
                    if (this.socketManager) {
                        this.socketManager.broadcastVectorUpdate(collectionName, 'search_cached', {
                            query: 'vector_search',
                            topK: topK,
                            resultsCount: cachedResults.length,
                            cached: true,
                            timestamp: Date.now()
                        });
                    }
                    
                    return cachedResults;
                }
            }

            // Naloži kolekcijo v spomin
            await this.client.loadCollection({
                collection_name: collectionName
            });

            const searchParams = {
                collection_name: collectionName,
                vectors: [queryVector],
                search_params: {
                    anns_field: 'vector',
                    topk: topK,
                    metric_type: 'L2',
                    params: { nprobe: 10 }
                },
                output_fields: ['text', 'metadata', 'timestamp']
            };

            if (filter) {
                searchParams.expr = filter;
            }

            const results = await this.client.search(searchParams);
            const searchResults = results[0] || [];

            // 🔹 REDIS CACHE - Shrani rezultate v cache
            if (this.redisManager && searchResults.length > 0) {
                await this.redisManager.cacheVectorSearch(
                    collectionName, queryVector, topK, filter, searchResults, 1800 // 30 min TTL
                );
            }

            // Pošlji WebSocket posodobitev za iskanje
            if (this.socketManager) {
                this.socketManager.broadcastVectorUpdate(collectionName, 'search', {
                    query: 'vector_search',
                    topK: topK,
                    resultsCount: searchResults.length,
                    cached: false,
                    timestamp: Date.now()
                });
            }

            return searchResults;
        } catch (error) {
            console.warn(`⚠️ Napaka pri iskanju vektorjev:`, error.message);
            return [];
        }
    }

    /**
     * Pridobi statistike kolekcije
     */
    async getCollectionStats(collectionName) {
        if (!this.isConnected()) {
            return null;
        }

        try {
            const stats = await this.client.getCollectionStatistics({
                collection_name: collectionName
            });
            return stats;
        } catch (error) {
            console.warn(`⚠️ Napaka pri pridobivanju statistik:`, error.message);
            return null;
        }
    }

    /**
     * Seznam vseh kolekcij
     */
    async listCollections() {
        if (!this.isConnected()) {
            return [];
        }

        try {
            const collections = await this.client.listCollections();
            return collections.collection_names || [];
        } catch (error) {
            console.warn('⚠️ Napaka pri pridobivanju seznama kolekcij:', error.message);
            return [];
        }
    }

    /**
     * Preveri, ali je povezava aktivna
     */
    isConnected() {
        return this.connected && this.client;
    }

    /**
     * Pridobi informacije o sistemu
     */
    async getInfo() {
        if (!this.isConnected()) {
            return {
                status: 'disconnected',
                collections: 0,
                host: this.config.host
            };
        }

        try {
            const collections = await this.listCollections();
            return {
                status: 'connected',
                host: this.config.host,
                database: this.config.database,
                collections: collections.length,
                collectionNames: collections
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                host: this.config.host
            };
        }
    }

    /**
     * Zapri povezavo
     */
    async close() {
        if (this.client) {
            try {
                await this.client.closeConnection();
                this.connected = false;
                console.log('📦 Vector database povezava zaprta');
            } catch (error) {
                console.warn('⚠️ Napaka pri zapiranju vector database povezave:', error.message);
            }
        }
    }

    /**
     * Izbriši kolekcijo
     */
    async deleteCollection(collectionName) {
        if (!this.isConnected()) {
            return false;
        }

        try {
            await this.client.dropCollection({
                collection_name: collectionName
            });

            this.collections.delete(collectionName);
            console.log(`✅ Kolekcija '${collectionName}' izbrisana`);
            return true;
        } catch (error) {
            console.warn(`⚠️ Napaka pri brisanju kolekcije '${collectionName}':`, error.message);
            return false;
        }
    }

    /**
     * Posodobi vektorske podatke
     */
    async updateVectors(collectionName, vectors, filter = null) {
        if (!this.isConnected()) {
            return false;
        }

        try {
            // Najprej izbriši obstoječe vektorje, če je filter podan
            if (filter) {
                await this.deleteVectors(collectionName, filter);
            }

            // Nato vstavi nove vektorje
            return await this.insertVectors(collectionName, vectors);
        } catch (error) {
            console.warn(`⚠️ Napaka pri posodabljanju vektorjev:`, error.message);
            return false;
        }
    }

    /**
     * Izbriši vektorje na podlagi filtra
     */
    async deleteVectors(collectionName, filter) {
        if (!this.isConnected()) {
            return false;
        }

        try {
            await this.client.delete({
                collection_name: collectionName,
                expr: filter
            });

            console.log(`✅ Vektorji izbrisani iz '${collectionName}' z filtrom: ${filter}`);
            return true;
        } catch (error) {
            console.warn(`⚠️ Napaka pri brisanju vektorjev:`, error.message);
            return false;
        }
    }

    /**
     * Pridobi podrobne informacije o kolekciji
     */
    async getCollectionInfo(collectionName) {
        if (!this.isConnected()) {
            return null;
        }

        try {
            const [stats, schema] = await Promise.all([
                this.getCollectionStats(collectionName),
                this.client.describeCollection({ collection_name: collectionName })
            ]);

            return {
                name: collectionName,
                statistics: stats,
                schema: schema,
                dimension: this.collections.get(collectionName)?.dimension || 'unknown'
            };
        } catch (error) {
            console.warn(`⚠️ Napaka pri pridobivanju informacij o kolekciji:`, error.message);
            return null;
        }
    }
    /**
     * Pomožna metoda za nalaganje kolekcije
     */
    async loadCollection(collectionName) {
        try {
            await this.client.loadCollection({
                collection_name: collectionName
            });
        } catch (error) {
            console.warn(`⚠️ Napaka pri nalaganju kolekcije '${collectionName}':`, error.message);
            throw error;
        }
    }

    /**
     * Napredne iskalne funkcionalnosti
     */
    async advancedSearch(collectionName, vector, topK = 10, filter = null, similarity_threshold = 0.0, include_metadata = true, include_vectors = false, search_params = {}) {
        try {
            await this.loadCollection(collectionName);
            
            const searchRequest = {
                collection_name: collectionName,
                data: [vector],
                limit: topK,
                output_fields: include_metadata ? ['text', 'metadata', 'timestamp'] : ['text'],
                search_params: {
                    metric_type: 'COSINE',
                    params: { nprobe: 10, ...search_params }
                }
            };

            if (filter) {
                searchRequest.filter = filter;
            }

            const results = await this.client.search(searchRequest);
            
            // Preverimo strukturo rezultatov
            console.log('🔍 Search results structure:', JSON.stringify(results, null, 2));
            
            // Prilagodimo dostop do rezultatov glede na strukturo
            let searchResults = [];
            if (results && results.results && Array.isArray(results.results) && results.results.length > 0) {
                searchResults = results.results[0];
            } else if (results && Array.isArray(results)) {
                searchResults = results;
            } else {
                console.warn('⚠️ Neznana struktura rezultatov iskanja');
                return [];
            }
            
            // Filtriraj rezultate po similarity threshold
            const filteredResults = searchResults
                .filter(result => result.score >= similarity_threshold)
                .map(result => ({
                    id: result.id,
                    score: result.score,
                    text: result.text,
                    metadata: include_metadata ? result.metadata : undefined,
                    timestamp: include_metadata ? result.timestamp : undefined,
                    vector: include_vectors ? result.vector : undefined
                }));

            return filteredResults;
        } catch (error) {
            console.error('Napaka pri naprednem iskanju:', error);
            throw error;
        }
    }

    /**
     * Hibridno iskanje (kombinacija vektorskega in tekstovnega iskanja)
     */
    async hybridSearch(collectionName, vector, text_query = null, topK = 10, vector_weight = 0.7, text_weight = 0.3, filter = null) {
        try {
            // Najprej izvedi vektorsko iskanje
            const vectorResults = await this.searchVectors(collectionName, vector, topK * 2, filter);
            
            if (!text_query) {
                return vectorResults.slice(0, topK);
            }

            // Če imamo tekstovno poizvedbo, kombiniramo rezultate
            const hybridResults = vectorResults.map(result => {
                // Preprosta tekstovna podobnost (lahko bi uporabili bolj napredne metode)
                const textSimilarity = this.calculateTextSimilarity(result.text || '', text_query);
                const hybridScore = (result.score * vector_weight) + (textSimilarity * text_weight);
                
                return {
                    ...result,
                    hybrid_score: hybridScore,
                    vector_score: result.score,
                    text_similarity: textSimilarity
                };
            });

            // Sortiraj po hibridnem rezultatu
            hybridResults.sort((a, b) => b.hybrid_score - a.hybrid_score);
            
            return hybridResults.slice(0, topK);
        } catch (error) {
            console.error('Napaka pri hibridnem iskanju:', error);
            throw error;
        }
    }

    /**
     * Batch iskanje (več vektorjev naenkrat)
     */
    async batchSearch(collectionName, vectors, topK = 10, filter = null, parallel = true) {
        try {
            if (parallel) {
                // Paralelno iskanje
                const searchPromises = vectors.map(vector => 
                    this.searchVectors(collectionName, vector, topK, filter)
                );
                return await Promise.all(searchPromises);
            } else {
                // Sekvencialno iskanje
                const results = [];
                for (const vector of vectors) {
                    const result = await this.searchVectors(collectionName, vector, topK, filter);
                    results.push(result);
                }
                return results;
            }
        } catch (error) {
            console.error('Napaka pri batch iskanju:', error);
            throw error;
        }
    }

    /**
     * Iskanje z agregacijo
     */
    async searchWithAggregation(collectionName, vector, topK = 10, filter = null, group_by = null, aggregation_type = 'count') {
        try {
            const searchResults = await this.searchVectors(collectionName, vector, topK * 2, filter);
            
            if (!group_by) {
                return {
                    results: searchResults.slice(0, topK),
                    aggregation: {
                        total_count: searchResults.length,
                        avg_score: searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length
                    }
                };
            }

            // Grupiranje rezultatov
            const groups = {};
            searchResults.forEach(result => {
                const groupKey = this.extractGroupKey(result, group_by);
                if (!groups[groupKey]) {
                    groups[groupKey] = [];
                }
                groups[groupKey].push(result);
            });

            // Agregacija po skupinah
            const aggregation = {};
            Object.keys(groups).forEach(groupKey => {
                const groupResults = groups[groupKey];
                switch (aggregation_type) {
                    case 'count':
                        aggregation[groupKey] = groupResults.length;
                        break;
                    case 'avg':
                        aggregation[groupKey] = groupResults.reduce((sum, r) => sum + r.score, 0) / groupResults.length;
                        break;
                    case 'sum':
                        aggregation[groupKey] = groupResults.reduce((sum, r) => sum + r.score, 0);
                        break;
                    case 'min':
                        aggregation[groupKey] = Math.min(...groupResults.map(r => r.score));
                        break;
                    case 'max':
                        aggregation[groupKey] = Math.max(...groupResults.map(r => r.score));
                        break;
                }
            });

            return {
                results: searchResults.slice(0, topK),
                aggregation: aggregation
            };
        } catch (error) {
            console.error('Napaka pri iskanju z agregacijo:', error);
            throw error;
        }
    }

    /**
     * Pomožne metode
     */
    calculateTextSimilarity(text1, text2) {
        // Preprosta Jaccard podobnost
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    extractGroupKey(result, group_by) {
        if (group_by.startsWith('metadata.')) {
            const metadataKey = group_by.substring(9);
            return result.metadata?.[metadataKey] || 'unknown';
        }
        return result[group_by] || 'unknown';
    }
}

module.exports = {
    VectorManager
};