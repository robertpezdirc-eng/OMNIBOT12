/**
 * OMNI VOICE ASSISTANT
 * Napredni glasovni asistent z real-time komunikacijo, TTS/STT in glasovnimi ukazi
 * 
 * @version 2.0.0
 * @author Omni AI Team
 */

const OpenAI = require('openai');
const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');
const { createReadStream, createWriteStream } = require('fs');
const { v4: uuidv4 } = require('uuid');

class VoiceAssistant extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            openaiApiKey: process.env.OPENAI_API_KEY,
            sttModel: 'whisper-1',
            ttsModel: 'tts-1-hd',
            voice: 'nova', // alloy, echo, fable, onyx, nova, shimmer
            language: 'sl',
            wakeWord: 'omni',
            responseDelay: 500,
            maxRecordingTime: 30000, // 30 sekund
            silenceThreshold: 0.01,
            silenceDuration: 2000, // 2 sekundi tišine
            enableWakeWord: true,
            enableContinuousListening: false,
            voiceCommands: true,
            ...config
        };

        this.openai = new OpenAI({
            apiKey: this.config.openaiApiKey
        });

        this.isListening = false;
        this.isProcessing = false;
        this.isSpeaking = false;
        this.conversationActive = false;
        this.audioBuffer = [];
        this.recordingStream = null;
        this.currentSession = null;
        
        this.voiceCommands = new Map();
        this.conversationHistory = [];
        
        this.initializeVoiceCommands();
    }

    /**
     * Inicializiraj glasovni asistent
     */
    async initialize() {
        try {
            console.log('🎤 Inicializiram glasovni asistent...');
            
            // Ustvari potrebne direktorije
            await this.createDirectories();
            
            // Registriraj glasovne ukaze
            this.registerVoiceCommands();
            
            // Nastavi event listenere
            this.setupEventListeners();
            
            console.log('✅ Glasovni asistent pripravljen');
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji glasovnega asistenta:', error);
            this.emit('error', error);
        }
    }

    /**
     * Začni poslušanje
     */
    async startListening() {
        if (this.isListening) {
            console.log('⚠️ Že poslušam...');
            return;
        }

        try {
            this.isListening = true;
            this.conversationActive = true;
            
            console.log('🎤 Začenjam poslušanje...');
            this.emit('listeningStarted');
            
            if (this.config.enableContinuousListening) {
                await this.startContinuousListening();
            } else {
                await this.startSingleListening();
            }
            
        } catch (error) {
            console.error('❌ Napaka pri začetku poslušanja:', error);
            this.isListening = false;
            this.emit('error', error);
        }
    }

    /**
     * Ustavi poslušanje
     */
    async stopListening() {
        if (!this.isListening) return;

        this.isListening = false;
        this.conversationActive = false;
        
        if (this.recordingStream) {
            this.recordingStream.end();
            this.recordingStream = null;
        }
        
        console.log('🔇 Poslušanje ustavljeno');
        this.emit('listeningStopped');
    }

    /**
     * Kontinuirano poslušanje z wake word detekcijo
     */
    async startContinuousListening() {
        console.log(`🎤 Kontinuirano poslušanje aktivno. Reci "${this.config.wakeWord}" za aktivacijo.`);
        
        // Simulacija kontinuirnega poslušanja
        // V produkciji bi uporabili pravo audio stream API
        this.continuousListeningInterval = setInterval(async () => {
            if (!this.isListening) return;
            
            try {
                // Simuliraj zaznavanje wake word
                if (Math.random() < 0.1) { // 10% možnost za testiranje
                    console.log(`🎯 Wake word "${this.config.wakeWord}" zaznan!`);
                    await this.handleWakeWordDetected();
                }
            } catch (error) {
                console.error('❌ Napaka pri kontinuirnem poslušanju:', error);
            }
        }, 1000);
    }

    /**
     * Enkratno poslušanje
     */
    async startSingleListening() {
        return new Promise((resolve, reject) => {
            console.log('🎤 Govori zdaj...');
            this.emit('recordingStarted');
            
            // Simuliraj snemanje
            setTimeout(async () => {
                try {
                    // V produkciji bi tukaj obdelali pravi audio stream
                    const mockAudioPath = await this.createMockAudio();
                    const result = await this.processAudioInput(mockAudioPath);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }, 3000);
        });
    }

    /**
     * Obdelaj wake word detekcijo
     */
    async handleWakeWordDetected() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.emit('wakeWordDetected');
        
        try {
            // Predvajaj potrditveni zvok
            await this.playConfirmationSound();
            
            // Začni snemanje ukaza
            const audioPath = await this.recordCommand();
            
            // Obdelaj ukaz
            const result = await this.processAudioInput(audioPath);
            
            // Odgovori
            await this.respondToUser(result);
            
        } catch (error) {
            console.error('❌ Napaka pri obdelavi wake word:', error);
            await this.speakError('Oprostite, prišlo je do napake.');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Obdelaj zvočni vnos
     */
    async processAudioInput(audioPath) {
        try {
            console.log('🔄 Obdelujem zvočni vnos...');
            this.emit('processingStarted');
            
            // Pretvori govor v tekst
            const transcription = await this.speechToText(audioPath);
            console.log('📝 Prepis:', transcription);
            
            // Preveri za glasovne ukaze
            const commandResult = this.checkVoiceCommands(transcription);
            if (commandResult) {
                return commandResult;
            }
            
            // Obdelaj z AI
            const aiResponse = await this.processWithAI(transcription);
            
            return {
                transcription,
                response: aiResponse,
                type: 'conversation'
            };
            
        } catch (error) {
            console.error('❌ Napaka pri obdelavi zvoka:', error);
            throw error;
        }
    }

    /**
     * Pretvori govor v tekst
     */
    async speechToText(audioPath) {
        try {
            const audioFile = createReadStream(audioPath);
            
            const transcription = await this.openai.audio.transcriptions.create({
                file: audioFile,
                model: this.config.sttModel,
                language: this.config.language,
                response_format: 'text'
            });
            
            return transcription.trim();
            
        } catch (error) {
            console.error('❌ Napaka pri STT:', error);
            throw error;
        }
    }

    /**
     * Pretvori tekst v govor
     */
    async textToSpeech(text, options = {}) {
        try {
            const response = await this.openai.audio.speech.create({
                model: this.config.ttsModel,
                voice: options.voice || this.config.voice,
                input: text,
                speed: options.speed || 1.0
            });

            const buffer = Buffer.from(await response.arrayBuffer());
            
            // Shrani v datoteko
            const outputPath = path.join(__dirname, '../data/temp', `tts_${Date.now()}.mp3`);
            await fs.writeFile(outputPath, buffer);
            
            return outputPath;
            
        } catch (error) {
            console.error('❌ Napaka pri TTS:', error);
            throw error;
        }
    }

    /**
     * Obdelaj z AI
     */
    async processWithAI(text) {
        try {
            const messages = [
                {
                    role: 'system',
                    content: `Ti si Omni, napredni glasovni asistent. Odgovarjaj kratko, jasno in prijazno v slovenščini. 
                    Prilagodi se glasovni komunikaciji - uporabljaj naravne, pogovorne odgovore.
                    Če uporabnik sprašuje o funkcionalnostih, razloži kaj znaš.`
                },
                ...this.conversationHistory.slice(-6), // Zadnjih 6 sporočil za kontekst
                {
                    role: 'user',
                    content: text
                }
            ];

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages,
                max_tokens: 300,
                temperature: 0.7
            });

            const aiResponse = response.choices[0].message.content;
            
            // Dodaj v zgodovino
            this.conversationHistory.push(
                { role: 'user', content: text },
                { role: 'assistant', content: aiResponse }
            );
            
            // Obdrži samo zadnjih 20 sporočil
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }
            
            return aiResponse;
            
        } catch (error) {
            console.error('❌ Napaka pri AI obdelavi:', error);
            return 'Oprostite, trenutno ne morem obdelati vaše zahteve.';
        }
    }

    /**
     * Odgovori uporabniku
     */
    async respondToUser(result) {
        try {
            this.emit('responding', result);
            
            const responseText = result.response || result.message || 'Razumem.';
            
            // Generiraj govor
            const audioPath = await this.textToSpeech(responseText);
            
            // Predvajaj odgovor
            await this.playAudio(audioPath);
            
            this.emit('responseComplete', result);
            
        } catch (error) {
            console.error('❌ Napaka pri odgovoru:', error);
            await this.speakError('Oprostite, ne morem odgovoriti.');
        }
    }

    /**
     * Registriraj glasovne ukaze
     */
    registerVoiceCommands() {
        // Osnovni sistemski ukazi
        this.voiceCommands.set('ustavi poslušanje', () => {
            this.stopListening();
            return { message: 'Poslušanje ustavljeno', type: 'command' };
        });

        this.voiceCommands.set('začni poslušanje', () => {
            this.startListening();
            return { message: 'Poslušanje aktivno', type: 'command' };
        });

        this.voiceCommands.set('kakšen je čas', () => {
            const time = new Date().toLocaleTimeString('sl-SI');
            return { message: `Trenutni čas je ${time}`, type: 'command' };
        });

        this.voiceCommands.set('kakšen je datum', () => {
            const date = new Date().toLocaleDateString('sl-SI');
            return { message: `Današnji datum je ${date}`, type: 'command' };
        });

        this.voiceCommands.set('pomoč', () => {
            return { 
                message: 'Sem Omni, vaš glasovni asistent. Lahko mi postavite vprašanja, dam navodila ali pomagam z nalogami.', 
                type: 'command' 
            };
        });

        // Dodaj več ukazov po potrebi
        console.log(`📋 Registriranih ${this.voiceCommands.size} glasovnih ukazov`);
    }

    /**
     * Preveri glasovne ukaze
     */
    checkVoiceCommands(text) {
        const lowerText = text.toLowerCase().trim();
        
        for (const [command, handler] of this.voiceCommands) {
            if (lowerText.includes(command.toLowerCase())) {
                console.log(`🎯 Glasovni ukaz zaznan: ${command}`);
                return handler();
            }
        }
        
        return null;
    }

    /**
     * Predvajaj zvok
     */
    async playAudio(audioPath) {
        return new Promise((resolve) => {
            console.log('🔊 Predvajam odgovor...');
            this.isSpeaking = true;
            this.emit('speakingStarted');
            
            // Simuliraj predvajanje
            setTimeout(() => {
                this.isSpeaking = false;
                this.emit('speakingEnded');
                console.log('🔇 Predvajanje končano');
                resolve();
            }, 2000);
        });
    }

    /**
     * Predvajaj potrditveni zvok
     */
    async playConfirmationSound() {
        console.log('🔔 *ding*');
        return new Promise(resolve => setTimeout(resolve, 200));
    }

    /**
     * Govori napako
     */
    async speakError(message) {
        try {
            const audioPath = await this.textToSpeech(message);
            await this.playAudio(audioPath);
        } catch (error) {
            console.error('❌ Ne morem govoriti napake:', error);
        }
    }

    /**
     * Ustvari mock audio za testiranje
     */
    async createMockAudio() {
        const mockPath = path.join(__dirname, '../data/temp', `mock_audio_${Date.now()}.wav`);
        
        // Ustvari prazen audio file za testiranje
        await fs.writeFile(mockPath, Buffer.alloc(1024));
        
        return mockPath;
    }

    /**
     * Snemaj ukaz
     */
    async recordCommand() {
        return new Promise((resolve) => {
            console.log('🎤 Snemam ukaz...');
            
            setTimeout(async () => {
                const audioPath = await this.createMockAudio();
                resolve(audioPath);
            }, 2000);
        });
    }

    /**
     * Ustvari potrebne direktorije
     */
    async createDirectories() {
        const dirs = [
            path.join(__dirname, '../data/temp'),
            path.join(__dirname, '../data/voice'),
            path.join(__dirname, '../data/recordings')
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    /**
     * Nastavi event listenere
     */
    setupEventListeners() {
        this.on('error', (error) => {
            console.error('🚨 Glasovni asistent napaka:', error);
        });

        this.on('wakeWordDetected', () => {
            console.log('👂 Wake word zaznan, pripravljam se na ukaz...');
        });

        this.on('processingStarted', () => {
            console.log('⚙️ Obdelujem zahtevo...');
        });

        this.on('responding', () => {
            console.log('💬 Pripravljam odgovor...');
        });
    }

    /**
     * Inicializiraj glasovne ukaze
     */
    initializeVoiceCommands() {
        // Dodatni ukazi za različne module
        this.voiceCommands.set('odpri aplikacijo', () => {
            return { message: 'Aplikacija je že odprta', type: 'command' };
        });

        this.voiceCommands.set('zapri aplikacijo', () => {
            return { message: 'Ne morem zapreti aplikacije preko glasovnega ukaza', type: 'command' };
        });
    }

    /**
     * Pridobi statistike
     */
    getStatistics() {
        return {
            isListening: this.isListening,
            isProcessing: this.isProcessing,
            isSpeaking: this.isSpeaking,
            conversationActive: this.conversationActive,
            conversationLength: this.conversationHistory.length,
            registeredCommands: this.voiceCommands.size,
            currentVoice: this.config.voice,
            language: this.config.language
        };
    }

    /**
     * Posodobi nastavitve
     */
    updateSettings(newSettings) {
        Object.assign(this.config, newSettings);
        console.log('⚙️ Nastavitve glasovnega asistenta posodobljene');
        this.emit('settingsUpdated', this.config);
    }

    /**
     * Počisti začasne datoteke
     */
    async cleanup() {
        try {
            const tempDir = path.join(__dirname, '../data/temp');
            const files = await fs.readdir(tempDir);
            
            for (const file of files) {
                if (file.startsWith('tts_') || file.startsWith('mock_audio_')) {
                    await fs.unlink(path.join(tempDir, file));
                }
            }
            
            console.log('🧹 Začasne datoteke počiščene');
        } catch (error) {
            console.error('❌ Napaka pri čiščenju:', error);
        }
    }

    /**
     * Zaustavi glasovni asistent
     */
    async shutdown() {
        console.log('🔄 Zaustavlja glasovni asistent...');
        
        await this.stopListening();
        
        if (this.continuousListeningInterval) {
            clearInterval(this.continuousListeningInterval);
        }
        
        await this.cleanup();
        
        this.emit('shutdown');
        console.log('✅ Glasovni asistent zaustavljen');
    }
}

module.exports = { VoiceAssistant };