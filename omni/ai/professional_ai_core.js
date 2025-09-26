/**
 * OMNI PROFESSIONAL AI CORE
 * Napredni AI sistem z GPT-4, multimodalno analizo in profesionalnimi funkcionalnostmi
 * 
 * @version 2.0.0
 * @author Omni AI Team
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class ProfessionalAICore extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            openaiApiKey: process.env.OPENAI_API_KEY,
            model: 'gpt-4-turbo-preview',
            maxTokens: 4000,
            temperature: 0.1,
            enableVision: true,
            enableMemory: true,
            enableLearning: true,
            ...config
        };

        this.openai = new OpenAI({
            apiKey: this.config.openaiApiKey
        });

        this.memory = new Map();
        this.conversationHistory = [];
        this.learningData = [];
        this.contextWindow = [];
        this.activeModules = new Map();
        
        this.initializeCore();
    }

    async initializeCore() {
        console.log('🚀 Inicializiram Professional AI Core...');
        
        try {
            // Naloži pomnilnik
            await this.loadMemory();
            
            // Inicializiraj module
            await this.initializeModules();
            
            // Nastavi periodično shranjevanje
            this.setupPeriodicSave();
            
            console.log('✅ Professional AI Core uspešno inicializiran');
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji AI Core:', error);
            this.emit('error', error);
        }
    }

    async initializeModules() {
        // Registriraj osnovne module
        this.registerModule('nlp', new NLPProcessor(this));
        this.registerModule('vision', new VisionAnalyzer(this));
        this.registerModule('memory', new MemoryManager(this));
        this.registerModule('learning', new LearningEngine(this));
        this.registerModule('reasoning', new ReasoningEngine(this));
        
        console.log('📦 AI moduli inicializirani');
    }

    registerModule(name, module) {
        this.activeModules.set(name, module);
        console.log(`🔌 Modul ${name} registriran`);
    }

    async processRequest(input, options = {}) {
        try {
            const startTime = Date.now();
            
            // Analiziraj vnos
            const analysis = await this.analyzeInput(input, options);
            
            // Pripravi kontekst
            const context = await this.prepareContext(analysis);
            
            // Generiraj odgovor
            const response = await this.generateResponse(context, options);
            
            // Posodobi pomnilnik
            await this.updateMemory(input, response, analysis);
            
            const processingTime = Date.now() - startTime;
            
            return {
                response: response.content,
                analysis,
                context,
                metadata: {
                    processingTime,
                    model: this.config.model,
                    tokens: response.usage,
                    confidence: response.confidence || 0.9
                }
            };
            
        } catch (error) {
            console.error('❌ Napaka pri procesiranju zahteve:', error);
            throw error;
        }
    }

    async analyzeInput(input, options) {
        const analysis = {
            type: 'text',
            intent: null,
            entities: [],
            sentiment: null,
            complexity: 'medium',
            language: 'sl',
            hasImage: false,
            hasAudio: false
        };

        // Preveri tip vnosa
        if (options.imageUrl || options.imageData) {
            analysis.type = 'multimodal';
            analysis.hasImage = true;
        }

        if (options.audioData) {
            analysis.type = 'multimodal';
            analysis.hasAudio = true;
        }

        // NLP analiza
        if (this.activeModules.has('nlp')) {
            const nlpResult = await this.activeModules.get('nlp').analyze(input);
            Object.assign(analysis, nlpResult);
        }

        return analysis;
    }

    async prepareContext(analysis) {
        const context = {
            conversation: this.conversationHistory.slice(-10),
            memory: await this.getRelevantMemory(analysis),
            systemPrompt: this.buildSystemPrompt(analysis),
            userContext: this.getUserContext(),
            timestamp: new Date().toISOString()
        };

        return context;
    }

    buildSystemPrompt(analysis) {
        return `Ti si Omni, napredni AI asistent z naslednjimi sposobnostmi:

🧠 JEDRO:
- Napredna analiza naravnega jezika
- Multimodalna obdelava (tekst, slike, glas)
- Kontekstualno razumevanje in spomin
- Logično sklepanje in načrtovanje

🎯 SPECIALIZACIJE:
- Turizem in gostinstvo
- Kmetijstvo in živinoreja  
- IT in programiranje
- Marketing in prodaja
- Finančno svetovanje
- Zdravstvo in wellness
- Projektno vodenje

💡 PRISTOP:
- Profesionalen, natančen, praktičen
- Strukturirani odgovori z konkretnimi koraki
- Prilagajanje tonu in kompleksnosti
- Proaktivno predlaganje izboljšav

Trenutna analiza vnosa:
- Tip: ${analysis.type}
- Namen: ${analysis.intent || 'splošno'}
- Jezik: ${analysis.language}
- Kompleksnost: ${analysis.complexity}

Odgovori v slovenščini z maksimalno profesionalnostjo.`;
    }

    async generateResponse(context, options) {
        const messages = [
            {
                role: 'system',
                content: context.systemPrompt
            }
        ];

        // Dodaj zgodovino pogovora
        messages.push(...context.conversation);

        // Dodaj trenutno sporočilo
        const userMessage = {
            role: 'user',
            content: options.input || 'Analiziraj to zahtevo'
        };

        // Če je slika, dodaj vision
        if (options.imageUrl && this.config.enableVision) {
            userMessage.content = [
                { type: 'text', text: userMessage.content },
                { type: 'image_url', image_url: { url: options.imageUrl } }
            ];
        }

        messages.push(userMessage);

        const completion = await this.openai.chat.completions.create({
            model: this.config.model,
            messages,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        });

        return {
            content: completion.choices[0].message.content,
            usage: completion.usage,
            confidence: this.calculateConfidence(completion)
        };
    }

    calculateConfidence(completion) {
        // Preprosta hevristika za zaupanje
        const choice = completion.choices[0];
        if (choice.finish_reason === 'stop') return 0.9;
        if (choice.finish_reason === 'length') return 0.7;
        return 0.5;
    }

    async updateMemory(input, response, analysis) {
        if (!this.config.enableMemory) return;

        const memoryEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            input,
            response: response.content,
            analysis,
            importance: this.calculateImportance(analysis)
        };

        this.conversationHistory.push(
            { role: 'user', content: input },
            { role: 'assistant', content: response.content }
        );

        // Obdrži samo zadnjih 50 sporočil
        if (this.conversationHistory.length > 100) {
            this.conversationHistory = this.conversationHistory.slice(-100);
        }

        // Shrani v dolgoročni spomin
        this.memory.set(memoryEntry.id, memoryEntry);
        
        // Če je pomembno, dodaj v učne podatke
        if (memoryEntry.importance > 0.7) {
            this.learningData.push(memoryEntry);
        }
    }

    calculateImportance(analysis) {
        let importance = 0.5;
        
        if (analysis.intent) importance += 0.2;
        if (analysis.entities.length > 0) importance += 0.1;
        if (analysis.complexity === 'high') importance += 0.2;
        
        return Math.min(importance, 1.0);
    }

    async getRelevantMemory(analysis) {
        // Preprosta implementacija - v produkciji bi uporabili vektorsko iskanje
        const relevantMemories = [];
        
        for (const [id, memory] of this.memory) {
            if (this.isMemoryRelevant(memory, analysis)) {
                relevantMemories.push(memory);
            }
        }
        
        return relevantMemories.slice(-5); // Zadnjih 5 relevantnih
    }

    isMemoryRelevant(memory, analysis) {
        // Preprosta hevristika za relevantnost
        if (memory.analysis.intent === analysis.intent) return true;
        if (memory.analysis.type === analysis.type) return true;
        return memory.importance > 0.8;
    }

    getUserContext() {
        return {
            sessionStart: this.sessionStart || new Date().toISOString(),
            totalInteractions: this.conversationHistory.length / 2,
            preferredLanguage: 'sl',
            expertiseLevel: 'professional'
        };
    }

    async loadMemory() {
        try {
            const memoryPath = path.join(__dirname, '../data/memory/ai_memory.json');
            const data = await fs.readFile(memoryPath, 'utf8');
            const memoryData = JSON.parse(data);
            
            this.memory = new Map(memoryData.memory || []);
            this.conversationHistory = memoryData.conversationHistory || [];
            this.learningData = memoryData.learningData || [];
            
            console.log(`💾 Naložen pomnilnik: ${this.memory.size} zapisov`);
        } catch (error) {
            console.log('💾 Ustvarjam nov pomnilnik...');
            this.memory = new Map();
        }
    }

    async saveMemory() {
        try {
            const memoryPath = path.join(__dirname, '../data/memory/ai_memory.json');
            const memoryDir = path.dirname(memoryPath);
            
            await fs.mkdir(memoryDir, { recursive: true });
            
            const data = {
                memory: Array.from(this.memory.entries()),
                conversationHistory: this.conversationHistory,
                learningData: this.learningData,
                lastSaved: new Date().toISOString()
            };
            
            await fs.writeFile(memoryPath, JSON.stringify(data, null, 2));
            console.log('💾 Pomnilnik shranjen');
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju pomnilnika:', error);
        }
    }

    setupPeriodicSave() {
        // Shrani pomnilnik vsakih 5 minut
        setInterval(() => {
            this.saveMemory();
        }, 5 * 60 * 1000);
    }

    async shutdown() {
        console.log('🔄 Zaustavlja AI Core...');
        await this.saveMemory();
        this.emit('shutdown');
        console.log('✅ AI Core zaustavljen');
    }
}

// Pomožni razredi za module
class NLPProcessor {
    constructor(aiCore) {
        this.aiCore = aiCore;
    }

    async analyze(text) {
        // Preprosta NLP analiza - v produkciji bi uporabili naprednejše algoritme
        return {
            intent: this.extractIntent(text),
            entities: this.extractEntities(text),
            sentiment: this.analyzeSentiment(text),
            complexity: this.assessComplexity(text)
        };
    }

    extractIntent(text) {
        const intents = {
            'question': ['kaj', 'kako', 'kdo', 'kdaj', 'kje', 'zakaj', '?'],
            'request': ['prosim', 'lahko', 'bi rad', 'potrebujem'],
            'command': ['naredi', 'ustvari', 'dodaj', 'odstrani', 'posodobi'],
            'information': ['povej', 'razloži', 'opiši', 'predstavi']
        };

        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
                return intent;
            }
        }
        return 'general';
    }

    extractEntities(text) {
        // Preprosta ekstrakcija entitet
        const entities = [];
        
        // Datumi
        const dateRegex = /\d{1,2}\.\d{1,2}\.\d{4}/g;
        const dates = text.match(dateRegex);
        if (dates) entities.push(...dates.map(d => ({ type: 'date', value: d })));
        
        // Številke
        const numberRegex = /\d+/g;
        const numbers = text.match(numberRegex);
        if (numbers) entities.push(...numbers.map(n => ({ type: 'number', value: n })));
        
        return entities;
    }

    analyzeSentiment(text) {
        const positiveWords = ['dobro', 'odlično', 'super', 'hvala', 'rad'];
        const negativeWords = ['slabo', 'napaka', 'problem', 'težava', 'ne'];
        
        const positive = positiveWords.filter(word => text.toLowerCase().includes(word)).length;
        const negative = negativeWords.filter(word => text.toLowerCase().includes(word)).length;
        
        if (positive > negative) return 'positive';
        if (negative > positive) return 'negative';
        return 'neutral';
    }

    assessComplexity(text) {
        if (text.length > 500) return 'high';
        if (text.length > 100) return 'medium';
        return 'low';
    }
}

class VisionAnalyzer {
    constructor(aiCore) {
        this.aiCore = aiCore;
    }

    async analyzeImage(imageUrl) {
        // Implementacija analize slik z OpenAI Vision API
        return {
            description: 'Analiza slike',
            objects: [],
            text: '',
            confidence: 0.9
        };
    }
}

class MemoryManager {
    constructor(aiCore) {
        this.aiCore = aiCore;
    }

    async search(query) {
        // Implementacija iskanja po pomnilniku
        return [];
    }
}

class LearningEngine {
    constructor(aiCore) {
        this.aiCore = aiCore;
    }

    async learn(data) {
        // Implementacija učenja iz podatkov
        return true;
    }
}

class ReasoningEngine {
    constructor(aiCore) {
        this.aiCore = aiCore;
    }

    async reason(problem) {
        // Implementacija logičnega sklepanja
        return {
            steps: [],
            conclusion: '',
            confidence: 0.8
        };
    }
}

module.exports = { ProfessionalAICore };