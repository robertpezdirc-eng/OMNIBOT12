/**
 * OMNI MULTIMODAL PROCESSOR
 * Napredna obdelava multimodalnih vnosov (tekst, slike, glas)
 * 
 * @version 2.0.0
 * @author Omni AI Team
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const { createReadStream } = require('fs');

class MultimodalProcessor {
    constructor(config = {}) {
        this.config = {
            openaiApiKey: process.env.OPENAI_API_KEY,
            visionModel: 'gpt-4-vision-preview',
            audioModel: 'whisper-1',
            ttsModel: 'tts-1',
            ttsVoice: 'alloy',
            maxImageSize: 20 * 1024 * 1024, // 20MB
            maxAudioDuration: 600, // 10 minut
            supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            supportedAudioFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
            ...config
        };

        this.openai = new OpenAI({
            apiKey: this.config.openaiApiKey
        });

        this.processingQueue = [];
        this.isProcessing = false;
    }

    /**
     * Glavna metoda za obdelavo multimodalnih vnosov
     */
    async processMultimodal(input) {
        try {
            const result = {
                text: null,
                image: null,
                audio: null,
                combined: null,
                metadata: {
                    processingTime: 0,
                    inputTypes: [],
                    confidence: 0
                }
            };

            const startTime = Date.now();

            // Analiziraj tip vnosa
            const inputAnalysis = this.analyzeInput(input);
            result.metadata.inputTypes = inputAnalysis.types;

            // Obdelaj vsak tip vnosa
            if (inputAnalysis.hasText) {
                result.text = await this.processText(input.text);
            }

            if (inputAnalysis.hasImage) {
                result.image = await this.processImage(input.image);
            }

            if (inputAnalysis.hasAudio) {
                result.audio = await this.processAudio(input.audio);
            }

            // Kombiniraj rezultate
            if (inputAnalysis.types.length > 1) {
                result.combined = await this.combineResults(result, input);
            }

            result.metadata.processingTime = Date.now() - startTime;
            result.metadata.confidence = this.calculateOverallConfidence(result);

            return result;

        } catch (error) {
            console.error('❌ Napaka pri multimodalni obdelavi:', error);
            throw error;
        }
    }

    /**
     * Analiziraj tip vnosa
     */
    analyzeInput(input) {
        const analysis = {
            hasText: false,
            hasImage: false,
            hasAudio: false,
            types: []
        };

        if (input.text && typeof input.text === 'string' && input.text.trim()) {
            analysis.hasText = true;
            analysis.types.push('text');
        }

        if (input.image) {
            analysis.hasImage = true;
            analysis.types.push('image');
        }

        if (input.audio) {
            analysis.hasAudio = true;
            analysis.types.push('audio');
        }

        return analysis;
    }

    /**
     * Obdelaj tekstovni vnos
     */
    async processText(text) {
        return {
            original: text,
            processed: text,
            analysis: {
                length: text.length,
                wordCount: text.split(/\s+/).length,
                language: this.detectLanguage(text),
                sentiment: this.analyzeSentiment(text)
            },
            confidence: 0.95
        };
    }

    /**
     * Obdelaj sliko z Vision API
     */
    async processImage(imageInput) {
        try {
            let imageUrl;
            
            // Preveri tip slike
            if (typeof imageInput === 'string') {
                if (imageInput.startsWith('http')) {
                    imageUrl = imageInput;
                } else if (imageInput.startsWith('data:image')) {
                    imageUrl = imageInput;
                } else {
                    // Pot do datoteke
                    const imageBuffer = await fs.readFile(imageInput);
                    const base64 = imageBuffer.toString('base64');
                    const ext = path.extname(imageInput).slice(1);
                    imageUrl = `data:image/${ext};base64,${base64}`;
                }
            }

            // Analiziraj sliko z OpenAI Vision
            const response = await this.openai.chat.completions.create({
                model: this.config.visionModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Analiziraj to sliko podrobno. Opiši kaj vidiš, prepoznaj objekte, tekst, barve, kompozicijo in kontekst. Odgovori v slovenščini.'
                            },
                            {
                                type: 'image_url',
                                image_url: { url: imageUrl }
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            });

            const analysis = response.choices[0].message.content;

            // Dodatna analiza za strukturirane podatke
            const structuredAnalysis = await this.extractImageStructuredData(analysis);

            return {
                description: analysis,
                structured: structuredAnalysis,
                metadata: {
                    model: this.config.visionModel,
                    tokens: response.usage.total_tokens
                },
                confidence: 0.9
            };

        } catch (error) {
            console.error('❌ Napaka pri analizi slike:', error);
            throw error;
        }
    }

    /**
     * Obdelaj zvočni vnos z Whisper API
     */
    async processAudio(audioInput) {
        try {
            let audioFile;

            // Preveri tip zvoka
            if (typeof audioInput === 'string') {
                // Pot do datoteke
                audioFile = createReadStream(audioInput);
            } else if (Buffer.isBuffer(audioInput)) {
                // Buffer - shrani začasno
                const tempPath = path.join(__dirname, '../data/temp', `audio_${Date.now()}.wav`);
                await fs.writeFile(tempPath, audioInput);
                audioFile = createReadStream(tempPath);
            }

            // Pretvori govor v tekst
            const transcription = await this.openai.audio.transcriptions.create({
                file: audioFile,
                model: this.config.audioModel,
                language: 'sl'
            });

            // Analiziraj prepis
            const textAnalysis = await this.processText(transcription.text);

            return {
                transcription: transcription.text,
                textAnalysis,
                metadata: {
                    model: this.config.audioModel,
                    duration: this.estimateAudioDuration(audioInput)
                },
                confidence: 0.85
            };

        } catch (error) {
            console.error('❌ Napaka pri obdelavi zvoka:', error);
            throw error;
        }
    }

    /**
     * Kombiniraj rezultate različnih modalnosti
     */
    async combineResults(results, originalInput) {
        try {
            // Pripravi kontekst za kombiniranje
            const context = [];
            
            if (results.text) {
                context.push(`TEKST: ${results.text.original}`);
            }
            
            if (results.image) {
                context.push(`SLIKA: ${results.image.description}`);
            }
            
            if (results.audio) {
                context.push(`ZVOK: ${results.audio.transcription}`);
            }

            // Uporabi AI za kombiniranje konteksta
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: `Ti si napredni multimodalni AI asistent. Analiziraj in kombiniraj naslednje informacije iz različnih modalnosti (tekst, slika, zvok) v celovit, smiseln odgovor. Odgovori v slovenščini.`
                    },
                    {
                        role: 'user',
                        content: `Kombiniraj te informacije:\n\n${context.join('\n\n')}\n\nUstvari celovit odgovor, ki upošteva vse modalnosti.`
                    }
                ],
                max_tokens: 1500,
                temperature: 0.1
            });

            return {
                combinedAnalysis: response.choices[0].message.content,
                contextSummary: this.createContextSummary(results),
                insights: this.extractInsights(results),
                confidence: 0.88
            };

        } catch (error) {
            console.error('❌ Napaka pri kombiniranju rezultatov:', error);
            throw error;
        }
    }

    /**
     * Generiraj govor iz teksta
     */
    async generateSpeech(text, options = {}) {
        try {
            const response = await this.openai.audio.speech.create({
                model: this.config.ttsModel,
                voice: options.voice || this.config.ttsVoice,
                input: text,
                speed: options.speed || 1.0
            });

            const buffer = Buffer.from(await response.arrayBuffer());
            
            // Shrani v začasno datoteko
            const outputPath = path.join(__dirname, '../data/temp', `speech_${Date.now()}.mp3`);
            await fs.writeFile(outputPath, buffer);

            return {
                audioPath: outputPath,
                audioBuffer: buffer,
                text: text,
                metadata: {
                    model: this.config.ttsModel,
                    voice: options.voice || this.config.ttsVoice,
                    duration: this.estimateTextDuration(text)
                }
            };

        } catch (error) {
            console.error('❌ Napaka pri generiranju govora:', error);
            throw error;
        }
    }

    /**
     * Pomožne metode
     */
    detectLanguage(text) {
        // Preprosta detekcija slovenščine
        const slovenianWords = ['in', 'je', 'da', 'na', 'za', 'se', 'ki', 'so', 'z', 'od'];
        const words = text.toLowerCase().split(/\s+/);
        const slovenianCount = words.filter(word => slovenianWords.includes(word)).length;
        
        return slovenianCount > words.length * 0.1 ? 'sl' : 'en';
    }

    analyzeSentiment(text) {
        const positiveWords = ['dobro', 'odlično', 'super', 'hvala', 'rad', 'lepo'];
        const negativeWords = ['slabo', 'napaka', 'problem', 'težava', 'ne', 'žal'];
        
        const words = text.toLowerCase().split(/\s+/);
        const positive = words.filter(word => positiveWords.includes(word)).length;
        const negative = words.filter(word => negativeWords.includes(word)).length;
        
        if (positive > negative) return 'positive';
        if (negative > positive) return 'negative';
        return 'neutral';
    }

    async extractImageStructuredData(description) {
        // Izvleci strukturirane podatke iz opisa slike
        return {
            objects: this.extractObjects(description),
            colors: this.extractColors(description),
            text: this.extractTextFromDescription(description),
            scene: this.extractScene(description)
        };
    }

    extractObjects(description) {
        // Preprosta ekstrakcija objektov
        const commonObjects = ['oseba', 'avto', 'hiša', 'drevo', 'miza', 'stol', 'računalnik', 'telefon'];
        return commonObjects.filter(obj => description.toLowerCase().includes(obj));
    }

    extractColors(description) {
        const colors = ['rdeča', 'modra', 'zelena', 'rumena', 'črna', 'bela', 'siva', 'rjava'];
        return colors.filter(color => description.toLowerCase().includes(color));
    }

    extractTextFromDescription(description) {
        // Poišči omembe teksta v opisu
        const textMatches = description.match(/["']([^"']+)["']/g);
        return textMatches ? textMatches.map(match => match.slice(1, -1)) : [];
    }

    extractScene(description) {
        const scenes = ['pisarna', 'dom', 'zunaj', 'narava', 'mesto', 'trgovina', 'restavracija'];
        return scenes.find(scene => description.toLowerCase().includes(scene)) || 'neznano';
    }

    createContextSummary(results) {
        const summary = {
            modalitiesUsed: [],
            keyInformation: [],
            confidence: 0
        };

        if (results.text) {
            summary.modalitiesUsed.push('tekst');
            summary.keyInformation.push(`Tekst: ${results.text.analysis.wordCount} besed`);
        }

        if (results.image) {
            summary.modalitiesUsed.push('slika');
            summary.keyInformation.push(`Slika: ${results.image.structured.objects.length} objektov`);
        }

        if (results.audio) {
            summary.modalitiesUsed.push('zvok');
            summary.keyInformation.push(`Zvok: ${results.audio.transcription.length} znakov prepisa`);
        }

        return summary;
    }

    extractInsights(results) {
        const insights = [];

        // Analiziraj korelacije med modalnostmi
        if (results.text && results.image) {
            insights.push('Kombinacija teksta in slike omogoča bogatejše razumevanje konteksta');
        }

        if (results.audio && results.text) {
            insights.push('Zvočni vnos potrjuje ali dopolnjuje tekstovne informacije');
        }

        return insights;
    }

    estimateAudioDuration(audioInput) {
        // Preprosta ocena trajanja - v produkciji bi uporabili pravo analizo
        return 30; // sekund
    }

    estimateTextDuration(text) {
        // Oceni trajanje govora (povprečno 150 besed na minuto)
        const words = text.split(/\s+/).length;
        return Math.ceil(words / 150 * 60); // sekund
    }

    calculateOverallConfidence(results) {
        const confidences = [];
        
        if (results.text) confidences.push(results.text.confidence);
        if (results.image) confidences.push(results.image.confidence);
        if (results.audio) confidences.push(results.audio.confidence);
        if (results.combined) confidences.push(results.combined.confidence);

        return confidences.length > 0 
            ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
            : 0;
    }

    /**
     * Validacija vnosov
     */
    validateImageInput(imageInput) {
        // Implementiraj validacijo slik
        return true;
    }

    validateAudioInput(audioInput) {
        // Implementiraj validacijo zvoka
        return true;
    }

    /**
     * Čiščenje začasnih datotek
     */
    async cleanup() {
        try {
            const tempDir = path.join(__dirname, '../data/temp');
            const files = await fs.readdir(tempDir);
            
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                
                // Izbriši datoteke starejše od 1 ure
                if (Date.now() - stats.mtime.getTime() > 60 * 60 * 1000) {
                    await fs.unlink(filePath);
                }
            }
        } catch (error) {
            console.error('❌ Napaka pri čiščenju:', error);
        }
    }
}

module.exports = { MultimodalProcessor };