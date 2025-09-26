/**
 * OMNI Voice System - Glasovni sistem
 * Speech-to-Text, Text-to-Speech, glasovni ukazi
 */

class OmniVoiceSystem {
    constructor() {
        this.isSupported = this.checkBrowserSupport();
        this.isListening = false;
        this.isSpeaking = false;
        
        // Speech Recognition
        this.recognition = null;
        this.recognitionConfig = {
            language: 'sl-SI',
            continuous: true,
            interimResults: true,
            maxAlternatives: 3
        };
        
        // Speech Synthesis
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.selectedVoice = null;
        this.speechConfig = {
            language: 'sl-SI',
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        };
        
        // Glasovni ukazi
        this.voiceCommands = new Map();
        this.commandPatterns = new Map();
        
        this.initializeVoiceSystem();
        console.log('🎤 OMNI Voice System inicializiran');
    }

    async initializeVoiceSystem() {
        try {
            if (!this.isSupported) {
                console.warn('⚠️ Glasovne funkcionalnosti niso podprte v tem brskalniku');
                return;
            }
            
            // Inicializiraj Speech Recognition
            await this.initializeSpeechRecognition();
            
            // Inicializiraj Speech Synthesis
            await this.initializeSpeechSynthesis();
            
            // Registriraj osnovne glasovne ukaze
            this.registerBasicCommands();
            
            console.log('✅ Voice system uspešno inicializiran');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji voice sistema:', error);
        }
    }

    checkBrowserSupport() {
        const hasRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        const hasSynthesis = 'speechSynthesis' in window;
        
        return {
            recognition: hasRecognition,
            synthesis: hasSynthesis,
            full: hasRecognition && hasSynthesis
        };
    }

    async initializeSpeechRecognition() {
        if (!this.isSupported.recognition) return;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Nastavi konfiguracije
        this.recognition.lang = this.recognitionConfig.language;
        this.recognition.continuous = this.recognitionConfig.continuous;
        this.recognition.interimResults = this.recognitionConfig.interimResults;
        this.recognition.maxAlternatives = this.recognitionConfig.maxAlternatives;
        
        // Event listeners
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('🎤 Poslušanje začeto');
            this.notifyListeningStart();
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            console.log('🎤 Poslušanje končano');
            this.notifyListeningEnd();
        };
        
        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };
        
        this.recognition.onerror = (event) => {
            console.error('❌ Napaka pri prepoznavanju govora:', event.error);
            this.notifyError('speech-recognition', event.error);
        };
        
        this.recognition.onnomatch = () => {
            console.log('🤷 Govor ni bil prepoznan');
            this.notifyNoMatch();
        };
    }

    async initializeSpeechSynthesis() {
        if (!this.isSupported.synthesis) return;
        
        // Počakaj, da se glasovi naložijo
        await this.loadVoices();
        
        // Izberi privzeti glas
        this.selectBestVoice();
        
        // Event listener za spremembe glasov
        this.synthesis.onvoiceschanged = () => {
            this.loadVoices();
            this.selectBestVoice();
        };
    }

    async loadVoices() {
        return new Promise((resolve) => {
            const loadVoicesInterval = setInterval(() => {
                this.voices = this.synthesis.getVoices();
                
                if (this.voices.length > 0) {
                    clearInterval(loadVoicesInterval);
                    console.log(`🔊 Naloženih ${this.voices.length} glasov`);
                    resolve(this.voices);
                }
            }, 100);
            
            // Timeout po 5 sekundah
            setTimeout(() => {
                clearInterval(loadVoicesInterval);
                resolve(this.voices);
            }, 5000);
        });
    }

    selectBestVoice() {
        // Poišči slovenski glas
        let slovenianVoice = this.voices.find(voice => 
            voice.lang.startsWith('sl') || voice.name.toLowerCase().includes('slovenian')
        );
        
        // Če ni slovenskega, poišči angleški
        if (!slovenianVoice) {
            slovenianVoice = this.voices.find(voice => 
                voice.lang.startsWith('en') && voice.localService
            );
        }
        
        // Če ni nobenega, vzemi prvega
        if (!slovenianVoice && this.voices.length > 0) {
            slovenianVoice = this.voices[0];
        }
        
        this.selectedVoice = slovenianVoice;
        
        if (this.selectedVoice) {
            console.log('🔊 Izbran glas:', this.selectedVoice.name, this.selectedVoice.lang);
        }
    }

    async startListening() {
        try {
            if (!this.isSupported.recognition) {
                throw new Error('Prepoznavanje govora ni podprto');
            }
            
            if (this.isListening) {
                console.log('🎤 Že poslušam');
                return;
            }
            
            // Preveri dovoljenja
            const permission = await this.requestMicrophonePermission();
            if (!permission) {
                throw new Error('Dostop do mikrofona ni dovoljen');
            }
            
            this.recognition.start();
            
        } catch (error) {
            console.error('❌ Napaka pri začetku poslušanja:', error);
            throw error;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Zapri stream
            return true;
        } catch (error) {
            console.warn('⚠️ Dostop do mikrofona zavrnjen:', error);
            return false;
        }
    }

    handleSpeechResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Procesiraj rezultate
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Pošlji interim rezultate
        if (interimTranscript) {
            this.notifyInterimResult(interimTranscript);
        }
        
        // Procesiraj končne rezultate
        if (finalTranscript) {
            console.log('🎤 Prepoznan govor:', finalTranscript);
            this.processFinalTranscript(finalTranscript);
        }
    }

    processFinalTranscript(transcript) {
        // Preveri glasovne ukaze
        const command = this.detectVoiceCommand(transcript);
        
        if (command) {
            console.log('🎯 Zaznan glasovni ukaz:', command.name);
            this.executeVoiceCommand(command, transcript);
        } else {
            // Pošlji kot običajen vnos
            this.notifyTranscriptResult(transcript);
        }
    }

    detectVoiceCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase().trim();
        
        // Preveri registrirane ukaze
        for (const [pattern, command] of this.commandPatterns.entries()) {
            if (lowerTranscript.includes(pattern)) {
                return command;
            }
        }
        
        return null;
    }

    executeVoiceCommand(command, transcript) {
        try {
            if (typeof command.action === 'function') {
                command.action(transcript, command);
            } else {
                console.warn('⚠️ Ukaz nima veljavne akcije:', command.name);
            }
        } catch (error) {
            console.error('❌ Napaka pri izvajanju glasovnega ukaza:', error);
        }
    }

    async speak(text, options = {}) {
        try {
            if (!this.isSupported.synthesis) {
                throw new Error('Sinteza govora ni podprta');
            }
            
            if (this.isSpeaking) {
                this.synthesis.cancel(); // Prekini trenutni govor
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Nastavi glas
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }
            
            // Nastavi parametre
            utterance.rate = options.rate || this.speechConfig.rate;
            utterance.pitch = options.pitch || this.speechConfig.pitch;
            utterance.volume = options.volume || this.speechConfig.volume;
            utterance.lang = options.language || this.speechConfig.language;
            
            // Event listeners
            utterance.onstart = () => {
                this.isSpeaking = true;
                console.log('🔊 Začetek govora');
                this.notifySpeechStart();
            };
            
            utterance.onend = () => {
                this.isSpeaking = false;
                console.log('🔊 Konec govora');
                this.notifySpeechEnd();
            };
            
            utterance.onerror = (event) => {
                this.isSpeaking = false;
                console.error('❌ Napaka pri govoru:', event.error);
                this.notifyError('speech-synthesis', event.error);
            };
            
            // Začni govoriti
            this.synthesis.speak(utterance);
            
            return new Promise((resolve, reject) => {
                utterance.onend = () => {
                    this.isSpeaking = false;
                    resolve();
                };
                utterance.onerror = (event) => {
                    this.isSpeaking = false;
                    reject(new Error(event.error));
                };
            });
            
        } catch (error) {
            console.error('❌ Napaka pri govoru:', error);
            throw error;
        }
    }

    stopSpeaking() {
        if (this.synthesis && this.isSpeaking) {
            this.synthesis.cancel();
            this.isSpeaking = false;
        }
    }

    registerVoiceCommand(name, patterns, action, description = '') {
        const command = {
            name: name,
            patterns: Array.isArray(patterns) ? patterns : [patterns],
            action: action,
            description: description
        };
        
        this.voiceCommands.set(name, command);
        
        // Registriraj vzorce
        command.patterns.forEach(pattern => {
            this.commandPatterns.set(pattern.toLowerCase(), command);
        });
        
        console.log('🎯 Registriran glasovni ukaz:', name);
    }

    registerBasicCommands() {
        // Osnovni sistemski ukazi
        this.registerVoiceCommand(
            'activate-omni',
            ['omni', 'aktiviraj omni', 'hey omni'],
            () => this.activateOmni(),
            'Aktivira OMNI sistem'
        );
        
        this.registerVoiceCommand(
            'stop-listening',
            ['nehaj poslušati', 'stop', 'konec'],
            () => this.stopListening(),
            'Ustavi poslušanje'
        );
        
        this.registerVoiceCommand(
            'clear-input',
            ['počisti', 'briši', 'clear'],
            () => this.clearInput(),
            'Počisti vnos'
        );
        
        this.registerVoiceCommand(
            'process-request',
            ['procesiraj', 'izvedi', 'go'],
            () => this.processCurrentInput(),
            'Procesiraj trenutni vnos'
        );
        
        this.registerVoiceCommand(
            'repeat',
            ['ponovi', 'repeat'],
            () => this.repeatLastResponse(),
            'Ponovi zadnji odgovor'
        );
    }

    activateOmni() {
        console.log('🧠 OMNI aktiviran z glasom');
        this.speak('OMNI aktiviran. Kako vam lahko pomagam?');
        this.notifyOmniActivated();
    }

    clearInput() {
        console.log('🧹 Čistim vnos');
        this.notifyClearInput();
    }

    processCurrentInput() {
        console.log('⚡ Procesiram trenutni vnos');
        this.notifyProcessInput();
    }

    repeatLastResponse() {
        console.log('🔄 Ponavljam zadnji odgovor');
        this.notifyRepeatResponse();
    }

    // Notification metode za komunikacijo z UI
    notifyListeningStart() {
        this.dispatchEvent('voice-listening-start');
    }

    notifyListeningEnd() {
        this.dispatchEvent('voice-listening-end');
    }

    notifyInterimResult(transcript) {
        this.dispatchEvent('voice-interim-result', { transcript });
    }

    notifyTranscriptResult(transcript) {
        this.dispatchEvent('voice-transcript-result', { transcript });
    }

    notifySpeechStart() {
        this.dispatchEvent('voice-speech-start');
    }

    notifySpeechEnd() {
        this.dispatchEvent('voice-speech-end');
    }

    notifyError(type, error) {
        this.dispatchEvent('voice-error', { type, error });
    }

    notifyNoMatch() {
        this.dispatchEvent('voice-no-match');
    }

    notifyOmniActivated() {
        this.dispatchEvent('omni-voice-activated');
    }

    notifyClearInput() {
        this.dispatchEvent('voice-clear-input');
    }

    notifyProcessInput() {
        this.dispatchEvent('voice-process-input');
    }

    notifyRepeatResponse() {
        this.dispatchEvent('voice-repeat-response');
    }

    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    // Javni API
    getVoices() {
        return this.voices;
    }

    setVoice(voiceIndex) {
        if (voiceIndex >= 0 && voiceIndex < this.voices.length) {
            this.selectedVoice = this.voices[voiceIndex];
            console.log('🔊 Glas spremenjen na:', this.selectedVoice.name);
            return true;
        }
        return false;
    }

    setSpeechRate(rate) {
        this.speechConfig.rate = Math.max(0.1, Math.min(10, rate));
    }

    setSpeechPitch(pitch) {
        this.speechConfig.pitch = Math.max(0, Math.min(2, pitch));
    }

    setSpeechVolume(volume) {
        this.speechConfig.volume = Math.max(0, Math.min(1, volume));
    }

    setLanguage(language) {
        this.recognitionConfig.language = language;
        this.speechConfig.language = language;
        
        if (this.recognition) {
            this.recognition.lang = language;
        }
    }

    getStatus() {
        return {
            isSupported: this.isSupported,
            isListening: this.isListening,
            isSpeaking: this.isSpeaking,
            selectedVoice: this.selectedVoice ? this.selectedVoice.name : null,
            language: this.recognitionConfig.language,
            voiceCommands: Array.from(this.voiceCommands.keys())
        };
    }

    getVoiceCommands() {
        return Array.from(this.voiceCommands.values()).map(cmd => ({
            name: cmd.name,
            patterns: cmd.patterns,
            description: cmd.description
        }));
    }

    // Napredne funkcionalnosti
    async transcribeAudio(audioBlob) {
        // V produkciji bi to poslalo avdio na strežnik za transkripcijo
        console.log('🎤 Transkribiram avdio datoteko...');
        
        // Simulacija transkripcije
        await this.delay(2000);
        
        return {
            transcript: 'Simulirana transkripcija avdio datoteke',
            confidence: 0.95,
            language: 'sl-SI'
        };
    }

    async generateSpeechAudio(text, options = {}) {
        // V produkciji bi to generiralo avdio datoteko
        console.log('🔊 Generiram avdio datoteko za besedilo...');
        
        // Simulacija generacije
        await this.delay(1500);
        
        return {
            audioUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTwwNUarm7blmGgU7k9n1unEiBC