/**
 * OMNI MEMORY SYSTEM
 * Napredni AI spominski sistem z vektorsko bazo, kontekstualnim učenjem in dolgotrajnim pomnjeniem
 * 
 * @version 2.0.0
 * @author Omni AI Team
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const crypto = require('crypto');

class MemorySystem extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            openaiApiKey: process.env.OPENAI_API_KEY,
            embeddingModel: 'text-embedding-3-large',
            maxMemorySize: 10000, // Maksimalno število spominov
            similarityThreshold: 0.8, // Prag za podobnost
            memoryDecayRate: 0.95, // Stopnja pozabljanja
            contextWindow: 20, // Število spominov za kontekst
            autoSave: true,
            saveInterval: 300000, // 5 minut
            compressionThreshold: 1000, // Kompresija po 1000 spominih
            ...config
        };

        this.openai = new OpenAI({
            apiKey: this.config.openaiApiKey
        });

        // Spominski sistemi
        this.shortTermMemory = new Map(); // Kratkotrajen spomin
        this.longTermMemory = new Map();  // Dolgotrajni spomin
        this.episodicMemory = new Map();  // Epizodični spomin
        this.semanticMemory = new Map();  // Semantični spomin
        this.workingMemory = new Map();   // Delovni spomin
        
        // Vektorski indeksi
        this.vectorIndex = new Map();
        this.memoryEmbeddings = new Map();
        
        // Metapodatki
        this.memoryMetadata = new Map();
        this.memoryStats = {
            totalMemories: 0,
            shortTermCount: 0,
            longTermCount: 0,
            episodicCount: 0,
            semanticCount: 0,
            lastAccess: new Date(),
            compressionCount: 0
        };

        this.memoryFilePath = path.join(__dirname, '../data/memory/memory_store.json');
        this.embeddingsFilePath = path.join(__dirname, '../data/memory/embeddings_store.json');
        
        this.autoSaveInterval = null;
        this.isInitialized = false;
    }

    /**
     * Inicializiraj spominski sistem
     */
    async initialize() {
        try {
            console.log('🧠 Inicializiram spominski sistem...');
            
            // Ustvari potrebne direktorije
            await this.createDirectories();
            
            // Naloži obstoječe spomine
            await this.loadMemories();
            
            // Nastavi avtomatsko shranjevanje
            if (this.config.autoSave) {
                this.setupAutoSave();
            }
            
            // Nastavi čiščenje spomina
            this.setupMemoryMaintenance();
            
            this.isInitialized = true;
            console.log(`✅ Spominski sistem pripravljen (${this.memoryStats.totalMemories} spominov)`);
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji spominskega sistema:', error);
            this.emit('error', error);
        }
    }

    /**
     * Shrani spomin
     */
    async storeMemory(content, type = 'general', metadata = {}) {
        try {
            const memoryId = this.generateMemoryId();
            const timestamp = new Date();
            
            const memory = {
                id: memoryId,
                content,
                type,
                timestamp,
                accessCount: 0,
                importance: metadata.importance || 0.5,
                context: metadata.context || {},
                tags: metadata.tags || [],
                source: metadata.source || 'user',
                ...metadata
            };

            // Generiraj embedding
            const embedding = await this.generateEmbedding(content);
            this.memoryEmbeddings.set(memoryId, embedding);

            // Določi tip spomina in shrani
            await this.categorizeAndStore(memory);
            
            // Posodobi statistike
            this.updateMemoryStats();
            
            console.log(`💾 Spomin shranjen: ${memoryId} (${type})`);
            this.emit('memoryStored', memory);
            
            return memoryId;
            
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju spomina:', error);
            throw error;
        }
    }

    /**
     * Pridobi spomine
     */
    async retrieveMemories(query, options = {}) {
        try {
            const {
                limit = 10,
                type = null,
                minSimilarity = this.config.similarityThreshold,
                includeContext = true,
                timeRange = null
            } = options;

            // Generiraj embedding za poizvedbo
            const queryEmbedding = await this.generateEmbedding(query);
            
            // Poišči podobne spomine
            const similarities = await this.calculateSimilarities(queryEmbedding);
            
            // Filtriraj in razvrsti
            let relevantMemories = similarities
                .filter(([id, similarity]) => similarity >= minSimilarity)
                .filter(([id, similarity]) => {
                    const memory = this.getMemoryById(id);
                    if (!memory) return false;
                    if (type && memory.type !== type) return false;
                    if (timeRange && !this.isInTimeRange(memory.timestamp, timeRange)) return false;
                    return true;
                })
                .sort(([, a], [, b]) => b - a)
                .slice(0, limit);

            // Pridobi polne spomine
            const memories = relevantMemories.map(([id, similarity]) => {
                const memory = this.getMemoryById(id);
                this.updateMemoryAccess(id);
                return {
                    ...memory,
                    similarity,
                    context: includeContext ? this.getMemoryContext(id) : null
                };
            });

            console.log(`🔍 Pridobljenih ${memories.length} spominov za: "${query}"`);
            this.emit('memoriesRetrieved', { query, memories });
            
            return memories;
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju spominov:', error);
            return [];
        }
    }

    /**
     * Posodobi spomin
     */
    async updateMemory(memoryId, updates) {
        try {
            const memory = this.getMemoryById(memoryId);
            if (!memory) {
                throw new Error(`Spomin ${memoryId} ne obstaja`);
            }

            // Posodobi spomin
            const updatedMemory = {
                ...memory,
                ...updates,
                lastModified: new Date()
            };

            // Če se je vsebina spremenila, posodobi embedding
            if (updates.content && updates.content !== memory.content) {
                const newEmbedding = await this.generateEmbedding(updates.content);
                this.memoryEmbeddings.set(memoryId, newEmbedding);
            }

            // Shrani posodobljen spomin
            this.storeMemoryInCategory(updatedMemory);
            
            console.log(`📝 Spomin posodobljen: ${memoryId}`);
            this.emit('memoryUpdated', updatedMemory);
            
            return updatedMemory;
            
        } catch (error) {
            console.error('❌ Napaka pri posodabljanju spomina:', error);
            throw error;
        }
    }

    /**
     * Izbriši spomin
     */
    async deleteMemory(memoryId) {
        try {
            const memory = this.getMemoryById(memoryId);
            if (!memory) {
                throw new Error(`Spomin ${memoryId} ne obstaja`);
            }

            // Odstrani iz vseh kategorij
            this.shortTermMemory.delete(memoryId);
            this.longTermMemory.delete(memoryId);
            this.episodicMemory.delete(memoryId);
            this.semanticMemory.delete(memoryId);
            this.workingMemory.delete(memoryId);
            
            // Odstrani embedding in metadata
            this.memoryEmbeddings.delete(memoryId);
            this.memoryMetadata.delete(memoryId);
            
            // Posodobi statistike
            this.updateMemoryStats();
            
            console.log(`🗑️ Spomin izbrisan: ${memoryId}`);
            this.emit('memoryDeleted', memoryId);
            
        } catch (error) {
            console.error('❌ Napaka pri brisanju spomina:', error);
            throw error;
        }
    }

    /**
     * Generiraj embedding
     */
    async generateEmbedding(text) {
        try {
            const response = await this.openai.embeddings.create({
                model: this.config.embeddingModel,
                input: text,
                encoding_format: 'float'
            });

            return response.data[0].embedding;
            
        } catch (error) {
            console.error('❌ Napaka pri generiranju embedding:', error);
            // Vrni naključni embedding kot fallback
            return Array.from({ length: 3072 }, () => Math.random() - 0.5);
        }
    }

    /**
     * Izračunaj podobnosti
     */
    async calculateSimilarities(queryEmbedding) {
        const similarities = [];
        
        for (const [memoryId, embedding] of this.memoryEmbeddings) {
            const similarity = this.cosineSimilarity(queryEmbedding, embedding);
            similarities.push([memoryId, similarity]);
        }
        
        return similarities;
    }

    /**
     * Kosinusna podobnost
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Kategoriziraj in shrani spomin
     */
    async categorizeAndStore(memory) {
        const { type, importance, timestamp } = memory;
        
        // Določi kategorijo na podlagi tipa in pomembnosti
        if (type === 'conversation' || type === 'interaction') {
            this.episodicMemory.set(memory.id, memory);
        } else if (type === 'fact' || type === 'knowledge') {
            this.semanticMemory.set(memory.id, memory);
        } else if (importance > 0.7) {
            this.longTermMemory.set(memory.id, memory);
        } else {
            this.shortTermMemory.set(memory.id, memory);
        }
        
        // Dodaj v delovni spomin če je nedaven
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (timestamp > hourAgo) {
            this.workingMemory.set(memory.id, memory);
        }
        
        // Shrani metadata
        this.memoryMetadata.set(memory.id, {
            category: this.getMemoryCategory(memory.id),
            createdAt: timestamp,
            lastAccessed: timestamp,
            accessCount: 0
        });
    }

    /**
     * Pridobi spomin po ID
     */
    getMemoryById(memoryId) {
        return this.shortTermMemory.get(memoryId) ||
               this.longTermMemory.get(memoryId) ||
               this.episodicMemory.get(memoryId) ||
               this.semanticMemory.get(memoryId) ||
               this.workingMemory.get(memoryId);
    }

    /**
     * Pridobi kategorijo spomina
     */
    getMemoryCategory(memoryId) {
        if (this.shortTermMemory.has(memoryId)) return 'short-term';
        if (this.longTermMemory.has(memoryId)) return 'long-term';
        if (this.episodicMemory.has(memoryId)) return 'episodic';
        if (this.semanticMemory.has(memoryId)) return 'semantic';
        if (this.workingMemory.has(memoryId)) return 'working';
        return 'unknown';
    }

    /**
     * Pridobi kontekst spomina
     */
    getMemoryContext(memoryId) {
        const memory = this.getMemoryById(memoryId);
        if (!memory) return null;
        
        // Poišči povezane spomine
        const relatedMemories = [];
        const memoryTime = memory.timestamp;
        const timeWindow = 30 * 60 * 1000; // 30 minut
        
        for (const [id, mem] of this.getAllMemories()) {
            if (id === memoryId) continue;
            
            const timeDiff = Math.abs(memoryTime - mem.timestamp);
            if (timeDiff <= timeWindow) {
                relatedMemories.push({
                    id,
                    content: mem.content.substring(0, 100),
                    timeDiff
                });
            }
        }
        
        return {
            relatedMemories: relatedMemories.slice(0, 5),
            tags: memory.tags,
            source: memory.source,
            importance: memory.importance
        };
    }

    /**
     * Pridobi vse spomine
     */
    getAllMemories() {
        const allMemories = new Map();
        
        for (const [id, memory] of this.shortTermMemory) allMemories.set(id, memory);
        for (const [id, memory] of this.longTermMemory) allMemories.set(id, memory);
        for (const [id, memory] of this.episodicMemory) allMemories.set(id, memory);
        for (const [id, memory] of this.semanticMemory) allMemories.set(id, memory);
        for (const [id, memory] of this.workingMemory) allMemories.set(id, memory);
        
        return allMemories;
    }

    /**
     * Posodobi dostop do spomina
     */
    updateMemoryAccess(memoryId) {
        const memory = this.getMemoryById(memoryId);
        if (memory) {
            memory.accessCount = (memory.accessCount || 0) + 1;
            memory.lastAccessed = new Date();
            
            const metadata = this.memoryMetadata.get(memoryId);
            if (metadata) {
                metadata.lastAccessed = new Date();
                metadata.accessCount = memory.accessCount;
            }
        }
    }

    /**
     * Posodobi statistike spomina
     */
    updateMemoryStats() {
        this.memoryStats = {
            totalMemories: this.getAllMemories().size,
            shortTermCount: this.shortTermMemory.size,
            longTermCount: this.longTermMemory.size,
            episodicCount: this.episodicMemory.size,
            semanticCount: this.semanticMemory.size,
            workingCount: this.workingMemory.size,
            lastAccess: new Date(),
            compressionCount: this.memoryStats.compressionCount || 0
        };
    }

    /**
     * Kompresija spominov
     */
    async compressMemories() {
        try {
            console.log('🗜️ Začenjam kompresijo spominov...');
            
            // Združi podobne spomine
            const similarities = new Map();
            const allMemories = Array.from(this.getAllMemories().entries());
            
            for (let i = 0; i < allMemories.length; i++) {
                for (let j = i + 1; j < allMemories.length; j++) {
                    const [id1, mem1] = allMemories[i];
                    const [id2, mem2] = allMemories[j];
                    
                    const emb1 = this.memoryEmbeddings.get(id1);
                    const emb2 = this.memoryEmbeddings.get(id2);
                    
                    if (emb1 && emb2) {
                        const similarity = this.cosineSimilarity(emb1, emb2);
                        if (similarity > 0.95) { // Zelo podobni sponimi
                            similarities.set(`${id1}-${id2}`, similarity);
                        }
                    }
                }
            }
            
            // Združi podobne spomine
            let compressed = 0;
            for (const [pair, similarity] of similarities) {
                const [id1, id2] = pair.split('-');
                const mem1 = this.getMemoryById(id1);
                const mem2 = this.getMemoryById(id2);
                
                if (mem1 && mem2) {
                    // Združi spomine
                    const mergedContent = `${mem1.content}\n${mem2.content}`;
                    const mergedMemory = {
                        ...mem1,
                        content: mergedContent,
                        mergedFrom: [id1, id2],
                        importance: Math.max(mem1.importance, mem2.importance)
                    };
                    
                    // Izbriši stare spomine
                    await this.deleteMemory(id2);
                    await this.updateMemory(id1, mergedMemory);
                    
                    compressed++;
                }
            }
            
            this.memoryStats.compressionCount++;
            console.log(`✅ Kompresija končana: ${compressed} spominov združenih`);
            
        } catch (error) {
            console.error('❌ Napaka pri kompresiji:', error);
        }
    }

    /**
     * Čiščenje spomina
     */
    async cleanupMemory() {
        try {
            console.log('🧹 Čistim spomin...');
            
            const now = new Date();
            const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            let cleaned = 0;
            
            // Počisti delovni spomin (starejši od 1 ure)
            const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            for (const [id, memory] of this.workingMemory) {
                if (memory.timestamp < hourAgo) {
                    this.workingMemory.delete(id);
                    cleaned++;
                }
            }
            
            // Počisti kratkotrajen spomin (starejši od 1 dne, nizka pomembnost)
            for (const [id, memory] of this.shortTermMemory) {
                if (memory.timestamp < dayAgo && memory.importance < 0.3) {
                    await this.deleteMemory(id);
                    cleaned++;
                }
            }
            
            console.log(`🗑️ Počiščenih ${cleaned} spominov`);
            this.updateMemoryStats();
            
        } catch (error) {
            console.error('❌ Napaka pri čiščenju spomina:', error);
        }
    }

    /**
     * Shrani spomine v datoteko
     */
    async saveMemories() {
        try {
            const memoryData = {
                shortTerm: Array.from(this.shortTermMemory.entries()),
                longTerm: Array.from(this.longTermMemory.entries()),
                episodic: Array.from(this.episodicMemory.entries()),
                semantic: Array.from(this.semanticMemory.entries()),
                working: Array.from(this.workingMemory.entries()),
                metadata: Array.from(this.memoryMetadata.entries()),
                stats: this.memoryStats,
                timestamp: new Date()
            };

            await fs.writeFile(this.memoryFilePath, JSON.stringify(memoryData, null, 2));
            
            // Shrani embeddings ločeno (lahko so veliki)
            const embeddingData = Array.from(this.memoryEmbeddings.entries());
            await fs.writeFile(this.embeddingsFilePath, JSON.stringify(embeddingData));
            
            console.log('💾 Sponimi shranjeni');
            
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju spominov:', error);
        }
    }

    /**
     * Naloži spomine iz datoteke
     */
    async loadMemories() {
        try {
            // Naloži spomine
            const memoryData = await fs.readFile(this.memoryFilePath, 'utf8');
            const data = JSON.parse(memoryData);
            
            this.shortTermMemory = new Map(data.shortTerm || []);
            this.longTermMemory = new Map(data.longTerm || []);
            this.episodicMemory = new Map(data.episodic || []);
            this.semanticMemory = new Map(data.semantic || []);
            this.workingMemory = new Map(data.working || []);
            this.memoryMetadata = new Map(data.metadata || []);
            this.memoryStats = data.stats || this.memoryStats;
            
            // Naloži embeddings
            const embeddingData = await fs.readFile(this.embeddingsFilePath, 'utf8');
            const embeddings = JSON.parse(embeddingData);
            this.memoryEmbeddings = new Map(embeddings || []);
            
            console.log(`📚 Naloženih ${this.memoryStats.totalMemories} spominov`);
            
        } catch (error) {
            console.log('📝 Ustvarjam nov spominski sistem');
            // Če datoteke ne obstajajo, začni z praznim sistemom
        }
    }

    /**
     * Ustvari potrebne direktorije
     */
    async createDirectories() {
        const dirs = [
            path.join(__dirname, '../data/memory'),
            path.join(__dirname, '../data/temp')
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    /**
     * Nastavi avtomatsko shranjevanje
     */
    setupAutoSave() {
        this.autoSaveInterval = setInterval(async () => {
            await this.saveMemories();
        }, this.config.saveInterval);
        
        console.log(`⏰ Avtomatsko shranjevanje vsakih ${this.config.saveInterval / 1000} sekund`);
    }

    /**
     * Nastavi vzdrževanje spomina
     */
    setupMemoryMaintenance() {
        // Čiščenje vsakih 10 minut
        setInterval(async () => {
            await this.cleanupMemory();
        }, 10 * 60 * 1000);
        
        // Kompresija vsako uro
        setInterval(async () => {
            if (this.getAllMemories().size > this.config.compressionThreshold) {
                await this.compressMemories();
            }
        }, 60 * 60 * 1000);
    }

    /**
     * Generiraj ID spomina
     */
    generateMemoryId() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Preveri časovni razpon
     */
    isInTimeRange(timestamp, timeRange) {
        const now = new Date();
        const { start, end } = timeRange;
        
        if (start && timestamp < start) return false;
        if (end && timestamp > end) return false;
        
        return true;
    }

    /**
     * Shrani spomin v kategorijo
     */
    storeMemoryInCategory(memory) {
        const category = this.getMemoryCategory(memory.id);
        
        switch (category) {
            case 'short-term':
                this.shortTermMemory.set(memory.id, memory);
                break;
            case 'long-term':
                this.longTermMemory.set(memory.id, memory);
                break;
            case 'episodic':
                this.episodicMemory.set(memory.id, memory);
                break;
            case 'semantic':
                this.semanticMemory.set(memory.id, memory);
                break;
            case 'working':
                this.workingMemory.set(memory.id, memory);
                break;
        }
    }

    /**
     * Pridobi statistike
     */
    getStatistics() {
        return {
            ...this.memoryStats,
            embeddingCount: this.memoryEmbeddings.size,
            isInitialized: this.isInitialized,
            config: {
                maxMemorySize: this.config.maxMemorySize,
                similarityThreshold: this.config.similarityThreshold,
                autoSave: this.config.autoSave
            }
        };
    }

    /**
     * Zaustavi spominski sistem
     */
    async shutdown() {
        console.log('🔄 Zaustavlja spominski sistem...');
        
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        await this.saveMemories();
        
        this.emit('shutdown');
        console.log('✅ Spominski sistem zaustavljen');
    }
}

module.exports = { MemorySystem };