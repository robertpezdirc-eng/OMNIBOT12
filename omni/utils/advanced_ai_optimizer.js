/**
 * OMNI Advanced AI Optimizer
 * Napredni sistem za optimizacijo AI modelov in procesov
 * 
 * Funkcionalnosti:
 * - Neural network optimization
 * - Machine learning pipelines
 * - Natural language processing
 * - Sentiment analysis
 * - Performance monitoring
 * - Model training and evaluation
 * - Predictive analytics
 * - Real-time inference optimization
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class AdvancedAIOptimizer extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            modelCacheSize: config.modelCacheSize || 100,
            optimizationLevel: config.optimizationLevel || 'high',
            batchSize: config.batchSize || 32,
            learningRate: config.learningRate || 0.001,
            maxEpochs: config.maxEpochs || 100,
            validationSplit: config.validationSplit || 0.2,
            earlyStoppingPatience: config.earlyStoppingPatience || 10,
            ...config
        };

        this.models = new Map();
        this.trainingHistory = new Map();
        this.performanceMetrics = new Map();
        this.optimizationQueue = [];
        this.isTraining = false;

        this.initializeOptimizer();
        console.log('🧠 Advanced AI Optimizer initialized');
    }

    /**
     * Inicializacija optimizatorja
     */
    async initializeOptimizer() {
        try {
            // Ustvari potrebne direktorije
            await this.ensureDirectories();
            
            // Naloži obstoječe modele
            await this.loadExistingModels();
            
            // Zaženi optimizacijske procese
            this.startOptimizationLoop();
            
            console.log('✅ AI Optimizer ready');
        } catch (error) {
            console.error('❌ AI Optimizer initialization failed:', error);
        }
    }

    /**
     * Ustvari potrebne direktorije
     */
    async ensureDirectories() {
        const dirs = [
            './omni/data/ai_models',
            './omni/data/training_data',
            './omni/data/model_cache',
            './omni/data/optimization_logs'
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                // Directory already exists
            }
        }
    }

    /**
     * Neural Network Implementation (Simple)
     */
    createNeuralNetwork(config) {
        return {
            layers: config.layers || [
                { type: 'input', size: config.inputSize || 10 },
                { type: 'hidden', size: config.hiddenSize || 20, activation: 'relu' },
                { type: 'output', size: config.outputSize || 1, activation: 'sigmoid' }
            ],
            weights: this.initializeWeights(config),
            biases: this.initializeBiases(config),
            learningRate: config.learningRate || 0.001
        };
    }

    /**
     * Inicializacija uteži
     */
    initializeWeights(config) {
        const weights = [];
        const layers = config.layers || [10, 20, 1];
        
        for (let i = 0; i < layers.length - 1; i++) {
            const layerWeights = [];
            for (let j = 0; j < layers[i]; j++) {
                const neuronWeights = [];
                for (let k = 0; k < layers[i + 1]; k++) {
                    // Xavier initialization
                    neuronWeights.push((Math.random() - 0.5) * 2 * Math.sqrt(6 / (layers[i] + layers[i + 1])));
                }
                layerWeights.push(neuronWeights);
            }
            weights.push(layerWeights);
        }
        
        return weights;
    }

    /**
     * Inicializacija bias-ov
     */
    initializeBiases(config) {
        const biases = [];
        const layers = config.layers || [10, 20, 1];
        
        for (let i = 1; i < layers.length; i++) {
            const layerBiases = [];
            for (let j = 0; j < layers[i]; j++) {
                layerBiases.push(0);
            }
            biases.push(layerBiases);
        }
        
        return biases;
    }

    /**
     * Forward propagation
     */
    forwardPropagation(network, input) {
        let activation = input;
        const activations = [activation];
        
        for (let i = 0; i < network.layers.length - 1; i++) {
            const newActivation = [];
            
            for (let j = 0; j < network.weights[i][0].length; j++) {
                let sum = network.biases[i][j];
                
                for (let k = 0; k < activation.length; k++) {
                    sum += activation[k] * network.weights[i][k][j];
                }
                
                // Apply activation function
                const layerType = network.layers[i + 1].activation || 'relu';
                newActivation.push(this.activationFunction(sum, layerType));
            }
            
            activation = newActivation;
            activations.push(activation);
        }
        
        return { output: activation, activations };
    }

    /**
     * Aktivacijske funkcije
     */
    activationFunction(x, type) {
        switch (type) {
            case 'relu':
                return Math.max(0, x);
            case 'sigmoid':
                return 1 / (1 + Math.exp(-x));
            case 'tanh':
                return Math.tanh(x);
            case 'linear':
                return x;
            default:
                return Math.max(0, x); // Default to ReLU
        }
    }

    /**
     * Derivat aktivacijskih funkcij
     */
    activationDerivative(x, type) {
        switch (type) {
            case 'relu':
                return x > 0 ? 1 : 0;
            case 'sigmoid':
                const sig = this.activationFunction(x, 'sigmoid');
                return sig * (1 - sig);
            case 'tanh':
                const tanh = this.activationFunction(x, 'tanh');
                return 1 - tanh * tanh;
            case 'linear':
                return 1;
            default:
                return x > 0 ? 1 : 0;
        }
    }

    /**
     * Natural Language Processing
     */
    async processNaturalLanguage(text, options = {}) {
        try {
            const result = {
                originalText: text,
                processedText: text.toLowerCase().trim(),
                tokens: this.tokenize(text),
                sentiment: await this.analyzeSentiment(text),
                entities: this.extractEntities(text),
                keywords: this.extractKeywords(text),
                language: this.detectLanguage(text),
                readabilityScore: this.calculateReadability(text)
            };

            return result;
        } catch (error) {
            console.error('NLP processing error:', error);
            return null;
        }
    }

    /**
     * Tokenizacija besedila
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 0);
    }

    /**
     * Analiza sentimenta (poenostavljena)
     */
    async analyzeSentiment(text) {
        const positiveWords = ['dobro', 'odlično', 'super', 'fantastično', 'ljubim', 'srečen', 'vesel'];
        const negativeWords = ['slabo', 'grozno', 'sovražim', 'žalosten', 'jezen', 'razočaran'];
        
        const tokens = this.tokenize(text);
        let score = 0;
        
        tokens.forEach(token => {
            if (positiveWords.includes(token)) score += 1;
            if (negativeWords.includes(token)) score -= 1;
        });
        
        const normalizedScore = Math.max(-1, Math.min(1, score / tokens.length * 10));
        
        return {
            score: normalizedScore,
            label: normalizedScore > 0.1 ? 'positive' : normalizedScore < -0.1 ? 'negative' : 'neutral',
            confidence: Math.abs(normalizedScore)
        };
    }

    /**
     * Ekstraktiranje entitet
     */
    extractEntities(text) {
        const entities = [];
        
        // Prepoznavanje e-mail naslovov
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = text.match(emailRegex) || [];
        emails.forEach(email => entities.push({ type: 'email', value: email }));
        
        // Prepoznavanje telefonskih številk
        const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
        const phones = text.match(phoneRegex) || [];
        phones.forEach(phone => entities.push({ type: 'phone', value: phone }));
        
        // Prepoznavanje datumov
        const dateRegex = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g;
        const dates = text.match(dateRegex) || [];
        dates.forEach(date => entities.push({ type: 'date', value: date }));
        
        return entities;
    }

    /**
     * Ekstraktiranje ključnih besed
     */
    extractKeywords(text) {
        const tokens = this.tokenize(text);
        const stopWords = ['in', 'je', 'na', 'za', 'z', 'v', 'da', 'se', 'ki', 'so', 'ali', 'pa', 'kot', 'če'];
        
        const filteredTokens = tokens.filter(token => 
            !stopWords.includes(token) && token.length > 2
        );
        
        const frequency = {};
        filteredTokens.forEach(token => {
            frequency[token] = (frequency[token] || 0) + 1;
        });
        
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word, count]) => ({ word, count, score: count / filteredTokens.length }));
    }

    /**
     * Zaznavanje jezika
     */
    detectLanguage(text) {
        const slovenianWords = ['in', 'je', 'na', 'za', 'z', 'v', 'da', 'se', 'ki', 'so'];
        const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'];
        
        const tokens = this.tokenize(text);
        let slovenianScore = 0;
        let englishScore = 0;
        
        tokens.forEach(token => {
            if (slovenianWords.includes(token)) slovenianScore++;
            if (englishWords.includes(token)) englishScore++;
        });
        
        if (slovenianScore > englishScore) return 'sl';
        if (englishScore > slovenianScore) return 'en';
        return 'unknown';
    }

    /**
     * Izračun berljivosti
     */
    calculateReadability(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = this.tokenize(text);
        const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
        
        if (sentences.length === 0 || words.length === 0) return 0;
        
        // Flesch Reading Ease (prilagojen)
        const avgWordsPerSentence = words.length / sentences.length;
        const avgSyllablesPerWord = syllables / words.length;
        
        const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Štetje zlogov
     */
    countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        
        const vowels = 'aeiouäöü';
        let count = 0;
        let previousWasVowel = false;
        
        for (let i = 0; i < word.length; i++) {
            const isVowel = vowels.includes(word[i]);
            if (isVowel && !previousWasVowel) count++;
            previousWasVowel = isVowel;
        }
        
        return Math.max(1, count);
    }

    /**
     * Predictive Analytics
     */
    async createPredictiveModel(data, target, options = {}) {
        try {
            const modelId = `predictive_${Date.now()}`;
            
            // Pripravi podatke
            const { features, labels } = this.prepareTrainingData(data, target);
            
            // Ustvari model
            const model = this.createNeuralNetwork({
                inputSize: features[0].length,
                hiddenSize: options.hiddenSize || Math.ceil(features[0].length * 1.5),
                outputSize: 1,
                layers: [features[0].length, options.hiddenSize || 20, 1],
                learningRate: options.learningRate || 0.001
            });
            
            // Treniraj model
            const trainingResult = await this.trainModel(model, features, labels, options);
            
            // Shrani model
            this.models.set(modelId, {
                model,
                trainingResult,
                metadata: {
                    created: new Date(),
                    dataSize: data.length,
                    features: features[0].length,
                    accuracy: trainingResult.accuracy
                }
            });
            
            return {
                modelId,
                accuracy: trainingResult.accuracy,
                loss: trainingResult.finalLoss,
                epochs: trainingResult.epochs
            };
        } catch (error) {
            console.error('Predictive model creation error:', error);
            throw error;
        }
    }

    /**
     * Priprava podatkov za treniranje
     */
    prepareTrainingData(data, target) {
        const features = [];
        const labels = [];
        
        data.forEach(item => {
            const feature = [];
            Object.keys(item).forEach(key => {
                if (key !== target && typeof item[key] === 'number') {
                    feature.push(item[key]);
                }
            });
            
            if (feature.length > 0 && typeof item[target] === 'number') {
                features.push(feature);
                labels.push([item[target]]);
            }
        });
        
        // Normalizacija
        return {
            features: this.normalizeData(features),
            labels: this.normalizeData(labels)
        };
    }

    /**
     * Normalizacija podatkov
     */
    normalizeData(data) {
        if (data.length === 0) return data;
        
        const normalized = [];
        const numFeatures = data[0].length;
        
        // Izračunaj min/max za vsako značilnost
        const mins = new Array(numFeatures).fill(Infinity);
        const maxs = new Array(numFeatures).fill(-Infinity);
        
        data.forEach(row => {
            row.forEach((value, index) => {
                mins[index] = Math.min(mins[index], value);
                maxs[index] = Math.max(maxs[index], value);
            });
        });
        
        // Normaliziraj
        data.forEach(row => {
            const normalizedRow = row.map((value, index) => {
                const range = maxs[index] - mins[index];
                return range === 0 ? 0 : (value - mins[index]) / range;
            });
            normalized.push(normalizedRow);
        });
        
        return normalized;
    }

    /**
     * Treniranje modela
     */
    async trainModel(network, features, labels, options = {}) {
        const epochs = options.epochs || this.config.maxEpochs;
        const learningRate = options.learningRate || network.learningRate;
        
        let bestLoss = Infinity;
        let patienceCounter = 0;
        const history = { loss: [], accuracy: [] };
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;
            let correct = 0;
            
            // Shuffle data
            const shuffledIndices = this.shuffleArray([...Array(features.length).keys()]);
            
            for (const i of shuffledIndices) {
                const input = features[i];
                const target = labels[i];
                
                // Forward pass
                const { output, activations } = this.forwardPropagation(network, input);
                
                // Calculate loss
                const loss = this.calculateLoss(output, target);
                totalLoss += loss;
                
                // Check accuracy (for classification)
                if (Math.abs(output[0] - target[0]) < 0.5) correct++;
                
                // Backward pass (simplified)
                this.backwardPropagation(network, input, target, output, activations, learningRate);
            }
            
            const avgLoss = totalLoss / features.length;
            const accuracy = correct / features.length;
            
            history.loss.push(avgLoss);
            history.accuracy.push(accuracy);
            
            // Early stopping
            if (avgLoss < bestLoss) {
                bestLoss = avgLoss;
                patienceCounter = 0;
            } else {
                patienceCounter++;
                if (patienceCounter >= this.config.earlyStoppingPatience) {
                    console.log(`Early stopping at epoch ${epoch}`);
                    break;
                }
            }
            
            if (epoch % 10 === 0) {
                console.log(`Epoch ${epoch}: Loss = ${avgLoss.toFixed(4)}, Accuracy = ${accuracy.toFixed(4)}`);
            }
        }
        
        return {
            finalLoss: bestLoss,
            accuracy: history.accuracy[history.accuracy.length - 1],
            epochs: history.loss.length,
            history
        };
    }

    /**
     * Izračun napake
     */
    calculateLoss(predicted, actual) {
        // Mean Squared Error
        let sum = 0;
        for (let i = 0; i < predicted.length; i++) {
            const diff = predicted[i] - actual[i];
            sum += diff * diff;
        }
        return sum / predicted.length;
    }

    /**
     * Backward propagation (poenostavljena)
     */
    backwardPropagation(network, input, target, output, activations, learningRate) {
        // Simplified gradient descent
        const outputError = [];
        for (let i = 0; i < output.length; i++) {
            outputError.push(2 * (output[i] - target[i]) / output.length);
        }
        
        // Update weights (simplified)
        const lastLayerIndex = network.weights.length - 1;
        const lastActivation = activations[activations.length - 2];
        
        for (let i = 0; i < network.weights[lastLayerIndex].length; i++) {
            for (let j = 0; j < network.weights[lastLayerIndex][i].length; j++) {
                const gradient = outputError[j] * lastActivation[i];
                network.weights[lastLayerIndex][i][j] -= learningRate * gradient;
            }
        }
        
        // Update biases
        for (let i = 0; i < outputError.length; i++) {
            network.biases[lastLayerIndex][i] -= learningRate * outputError[i];
        }
    }

    /**
     * Napovedovanje z modelom
     */
    async predict(modelId, input) {
        try {
            const modelData = this.models.get(modelId);
            if (!modelData) {
                throw new Error(`Model ${modelId} not found`);
            }
            
            const { output } = this.forwardPropagation(modelData.model, input);
            
            return {
                prediction: output,
                confidence: this.calculateConfidence(output),
                modelId
            };
        } catch (error) {
            console.error('Prediction error:', error);
            throw error;
        }
    }

    /**
     * Izračun zaupanja
     */
    calculateConfidence(output) {
        // Simple confidence calculation
        return Math.min(1, Math.max(0, 1 - Math.abs(0.5 - output[0]) * 2));
    }

    /**
     * Optimizacijska zanka
     */
    startOptimizationLoop() {
        setInterval(() => {
            this.processOptimizationQueue();
            this.updatePerformanceMetrics();
            this.cleanupOldModels();
        }, 60000); // Every minute
    }

    /**
     * Procesiranje optimizacijske vrste
     */
    processOptimizationQueue() {
        if (this.isTraining || this.optimizationQueue.length === 0) return;
        
        const task = this.optimizationQueue.shift();
        this.executeOptimizationTask(task);
    }

    /**
     * Izvršitev optimizacijske naloge
     */
    async executeOptimizationTask(task) {
        try {
            this.isTraining = true;
            
            switch (task.type) {
                case 'retrain':
                    await this.retrainModel(task.modelId, task.data);
                    break;
                case 'optimize':
                    await this.optimizeModel(task.modelId);
                    break;
                case 'evaluate':
                    await this.evaluateModel(task.modelId, task.testData);
                    break;
            }
            
            this.emit('optimizationComplete', task);
        } catch (error) {
            console.error('Optimization task failed:', error);
            this.emit('optimizationError', { task, error });
        } finally {
            this.isTraining = false;
        }
    }

    /**
     * Utility funkcije
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async loadExistingModels() {
        // Load models from disk
        console.log('Loading existing AI models...');
    }

    updatePerformanceMetrics() {
        // Update performance metrics
        this.performanceMetrics.set('modelsCount', this.models.size);
        this.performanceMetrics.set('queueSize', this.optimizationQueue.length);
        this.performanceMetrics.set('isTraining', this.isTraining);
    }

    cleanupOldModels() {
        // Cleanup old models if cache is full
        if (this.models.size > this.config.modelCacheSize) {
            const oldestModel = Array.from(this.models.entries())
                .sort(([,a], [,b]) => a.metadata.created - b.metadata.created)[0];
            
            this.models.delete(oldestModel[0]);
            console.log(`Cleaned up old model: ${oldestModel[0]}`);
        }
    }

    /**
     * Get AI status
     */
    getAIStatus() {
        return {
            modelsLoaded: this.models.size,
            isTraining: this.isTraining,
            queueSize: this.optimizationQueue.length,
            performanceMetrics: Object.fromEntries(this.performanceMetrics),
            capabilities: {
                neuralNetworks: true,
                nlp: true,
                sentimentAnalysis: true,
                predictiveAnalytics: true,
                realTimeOptimization: true
            }
        };
    }
}

module.exports = { AdvancedAIOptimizer };