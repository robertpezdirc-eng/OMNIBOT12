class OmniLearningSystem {
    constructor() {
        this.userMemory = this.loadUserMemory();
        this.interactionHistory = this.loadInteractionHistory();
        this.userPreferences = this.loadUserPreferences();
        this.learningPatterns = this.loadLearningPatterns();
        this.personalityProfile = this.loadPersonalityProfile();
        this.longTermMemory = this.loadLongTermMemory();
        this.contextualMemory = this.loadContextualMemory();
        this.skillsMemory = this.loadSkillsMemory();
        
        // Avtomatsko shranjevanje vsakih 30 sekund
        setInterval(() => this.autoSave(), 30000);
    }

    // Dolgotrajni spomin - shrani vse uporabnikove zahteve in preference
    loadLongTermMemory() {
        const stored = localStorage.getItem('omni_long_term_memory');
        return stored ? JSON.parse(stored) : {
            allRequests: [],
            preferenceEvolution: [],
            skillDevelopment: [],
            projectHistory: [],
            successPatterns: [],
            failurePatterns: [],
            domainExpertise: {},
            personalGoals: [],
            businessObjectives: [],
            technicalPreferences: {},
            communicationStyle: {},
            learningStyle: {},
            workflowPreferences: {},
            timePatterns: {},
            complexityPreferences: {},
            industryKnowledge: {},
            toolPreferences: {},
            feedbackHistory: []
        };
    }

    saveLongTermMemory() {
        localStorage.setItem('omni_long_term_memory', JSON.stringify(this.longTermMemory));
    }

    // Kontekstualni spomin - razume kontekst trenutne seje
    loadContextualMemory() {
        return {
            currentSession: {
                startTime: Date.now(),
                requests: [],
                context: '',
                mood: 'neutral',
                urgency: 'normal',
                complexity: 'medium'
            },
            recentSessions: this.loadRecentSessions()
        };
    }

    loadRecentSessions() {
        const stored = localStorage.getItem('omni_recent_sessions');
        return stored ? JSON.parse(stored) : [];
    }

    saveRecentSessions() {
        localStorage.setItem('omni_recent_sessions', JSON.stringify(this.contextualMemory.recentSessions));
    }

    // Spomin veščin - kaj je uporabnik že znal in se naučil
    loadSkillsMemory() {
        const stored = localStorage.getItem('omni_skills_memory');
        return stored ? JSON.parse(stored) : {
            technicalSkills: {},
            businessSkills: {},
            creativeSkills: {},
            analyticalSkills: {},
            communicationSkills: {},
            learningProgress: {},
            masteredConcepts: [],
            strugglingAreas: [],
            preferredLearningMethods: []
        };
    }

    saveSkillsMemory() {
        localStorage.setItem('omni_skills_memory', JSON.stringify(this.skillsMemory));
    }

    // Dodaj zahtevo v dolgotrajni spomin
    addRequestToLongTermMemory(request, context = {}) {
        const requestEntry = {
            id: this.generateId(),
            timestamp: Date.now(),
            request: request,
            context: context,
            category: this.categorizeRequest(request),
            complexity: this.analyzeComplexity(request),
            domain: this.identifyDomain(request),
            intent: this.analyzeIntent(request),
            success: context.success || null,
            satisfaction: context.satisfaction || null
        };

        this.longTermMemory.allRequests.push(requestEntry);
        
        // Omeji velikost na zadnjih 1000 zahtev
        if (this.longTermMemory.allRequests.length > 1000) {
            this.longTermMemory.allRequests = this.longTermMemory.allRequests.slice(-1000);
        }

        // Posodobi domenske ekspertize
        this.updateDomainExpertise(requestEntry.domain, requestEntry);
        
        // Posodobi vzorce uspešnosti
        if (context.success !== null) {
            this.updateSuccessPatterns(requestEntry);
        }

        this.saveLongTermMemory();
        return requestEntry.id;
    }

    // Analiziraj in kategoriziraj zahtevo
    categorizeRequest(request) {
        const categories = {
            'development': ['aplikacija', 'koda', 'program', 'website', 'api', 'baza'],
            'business': ['podjetje', 'startup', 'poslovanje', 'marketing', 'prodaja'],
            'design': ['dizajn', 'ui', 'ux', 'grafika', 'logo', 'barve'],
            'analysis': ['analiza', 'podatki', 'statistika', 'raziskava', 'poročilo'],
            'automation': ['avtomatizacija', 'skripta', 'proces', 'workflow'],
            'learning': ['naučiti', 'razložiti', 'pojasniti', 'tutorial', 'vodič'],
            'creative': ['kreativno', 'umetnost', 'vsebina', 'zgodba', 'ideja']
        };

        const words = request.toLowerCase().split(' ');
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => words.some(word => word.includes(keyword)))) {
                return category;
            }
        }
        return 'general';
    }

    // Analiziraj namen zahteve
    analyzeIntent(request) {
        const intents = {
            'create': ['ustvari', 'naredi', 'generiraj', 'izdela', 'pripravi'],
            'learn': ['naučiti', 'razloži', 'pojasni', 'kako', 'zakaj'],
            'analyze': ['analiziraj', 'preglej', 'oceni', 'preveri', 'raziskaj'],
            'optimize': ['optimiziraj', 'izboljšaj', 'posodobi', 'nadgradi'],
            'solve': ['reši', 'popravi', 'odpravi', 'pomaga', 'svetuj'],
            'plan': ['načrtuj', 'strategija', 'plan', 'organiziraj', 'pripravi']
        };

        const words = request.toLowerCase().split(' ');
        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => words.some(word => word.includes(keyword)))) {
                return intent;
            }
        }
        return 'general';
    }

    // Posodobi domensko ekspertizo
    updateDomainExpertise(domain, requestEntry) {
        if (!this.longTermMemory.domainExpertise[domain]) {
            this.longTermMemory.domainExpertise[domain] = {
                requestCount: 0,
                successRate: 0,
                averageComplexity: 0,
                commonPatterns: [],
                lastInteraction: null,
                expertise_level: 'beginner'
            };
        }

        const expertise = this.longTermMemory.domainExpertise[domain];
        expertise.requestCount++;
        expertise.lastInteraction = Date.now();
        
        // Posodobi nivo ekspertize
        if (expertise.requestCount > 20) expertise.expertise_level = 'expert';
        else if (expertise.requestCount > 10) expertise.expertise_level = 'intermediate';
        else if (expertise.requestCount > 5) expertise.expertise_level = 'advanced_beginner';
    }

    // Posodobi vzorce uspešnosti
    updateSuccessPatterns(requestEntry) {
        if (requestEntry.success) {
            this.longTermMemory.successPatterns.push({
                category: requestEntry.category,
                domain: requestEntry.domain,
                complexity: requestEntry.complexity,
                intent: requestEntry.intent,
                timestamp: requestEntry.timestamp,
                context: requestEntry.context
            });
        } else {
            this.longTermMemory.failurePatterns.push({
                category: requestEntry.category,
                domain: requestEntry.domain,
                complexity: requestEntry.complexity,
                intent: requestEntry.intent,
                timestamp: requestEntry.timestamp,
                context: requestEntry.context,
                reason: requestEntry.context.failureReason || 'unknown'
            });
        }

        // Omeji velikost vzorcev
        if (this.longTermMemory.successPatterns.length > 500) {
            this.longTermMemory.successPatterns = this.longTermMemory.successPatterns.slice(-500);
        }
        if (this.longTermMemory.failurePatterns.length > 200) {
            this.longTermMemory.failurePatterns = this.longTermMemory.failurePatterns.slice(-200);
        }
    }

    // Pridobi relevantne pretekle zahteve
    getRelevantPastRequests(currentRequest, limit = 5) {
        const currentCategory = this.categorizeRequest(currentRequest);
        const currentDomain = this.identifyDomain(currentRequest);
        const currentIntent = this.analyzeIntent(currentRequest);

        return this.longTermMemory.allRequests
            .filter(req => 
                req.category === currentCategory || 
                req.domain === currentDomain || 
                req.intent === currentIntent
            )
            .sort((a, b) => {
                // Sortiraj po relevantnosti in času
                let scoreA = 0, scoreB = 0;
                
                if (a.category === currentCategory) scoreA += 3;
                if (a.domain === currentDomain) scoreA += 2;
                if (a.intent === currentIntent) scoreA += 1;
                
                if (b.category === currentCategory) scoreB += 3;
                if (b.domain === currentDomain) scoreB += 2;
                if (b.intent === currentIntent) scoreB += 1;
                
                if (scoreA !== scoreB) return scoreB - scoreA;
                return b.timestamp - a.timestamp; // Novejše najprej
            })
            .slice(0, limit);
    }

    // Pridobi personalizirane priporočila
    getPersonalizedRecommendations(currentRequest) {
        const domain = this.identifyDomain(currentRequest);
        const category = this.categorizeRequest(currentRequest);
        
        const recommendations = [];
        
        // Na podlagi domenskih ekspertiz
        const domainExpertise = this.longTermMemory.domainExpertise[domain];
        if (domainExpertise && domainExpertise.expertise_level !== 'beginner') {
            recommendations.push({
                type: 'expertise',
                message: `Na podlagi vaših ${domainExpertise.requestCount} preteklih zahtev v domeni ${domain}, predlagam naprednejše funkcionalnosti.`,
                suggestions: this.getAdvancedSuggestions(domain, category)
            });
        }
        
        // Na podlagi vzorcev uspešnosti
        const successfulPatterns = this.longTermMemory.successPatterns
            .filter(p => p.domain === domain || p.category === category)
            .slice(-5);
            
        if (successfulPatterns.length > 0) {
            recommendations.push({
                type: 'success_pattern',
                message: 'Na podlagi vaših uspešnih projektov predlagam:',
                suggestions: this.extractSuggestionsFromPatterns(successfulPatterns)
            });
        }
        
        return recommendations;
    }

    getAdvancedSuggestions(domain, category) {
        const suggestions = {
            'technology': ['API integracije', 'Mikroservisi arhitektura', 'Cloud deployment', 'Avtomatsko testiranje'],
            'business': ['Napredna analitika', 'CRM integracija', 'Avtomatizacija procesov', 'Finančno modeliranje'],
            'design': ['Interaktivni prototipi', 'Animacije', 'Responsive design', 'Accessibility optimizacija']
        };
        
        return suggestions[domain] || ['Napredne funkcionalnosti', 'Optimizacija performans', 'Skalabilnost'];
    }

    extractSuggestionsFromPatterns(patterns) {
        // Analiziraj vzorce in izvleci predloge
        const commonElements = {};
        patterns.forEach(pattern => {
            if (pattern.context && pattern.context.features) {
                pattern.context.features.forEach(feature => {
                    commonElements[feature] = (commonElements[feature] || 0) + 1;
                });
            }
        });
        
        return Object.entries(commonElements)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([feature]) => feature);
    }

    // Avtomatsko shranjevanje
    autoSave() {
        this.saveLongTermMemory();
        this.saveRecentSessions();
        this.saveSkillsMemory();
        this.saveUserMemory();
        this.saveInteractionHistory();
        this.saveUserPreferences();
        this.saveLearningPatterns();
        this.savePersonalityProfile();
    }
    
    // Shranjevanje in nalaganje uporabnikovega spomina
    loadUserMemory() {
        const stored = localStorage.getItem('omni_user_memory');
        return stored ? JSON.parse(stored) : {
            requests: [],
            solutions: [],
            preferences: {},
            patterns: {},
            context: {},
            feedback: [],
            improvements: []
        };
    }
    
    saveUserMemory() {
        localStorage.setItem('omni_user_memory', JSON.stringify(this.userMemory));
    }
    
    loadInteractionHistory() {
        const stored = localStorage.getItem('omni_interaction_history');
        return stored ? JSON.parse(stored) : [];
    }
    
    saveInteractionHistory() {
        localStorage.setItem('omni_interaction_history', JSON.stringify(this.interactionHistory));
    }
    
    loadUserPreferences() {
        const stored = localStorage.getItem('omni_user_preferences');
        return stored ? JSON.parse(stored) : {
            communicationStyle: 'professional',
            detailLevel: 'comprehensive',
            responseSpeed: 'thorough',
            preferredSolutions: [],
            avoidedApproaches: [],
            favoriteFeatures: [],
            workingStyle: 'collaborative',
            industryFocus: [],
            technicalLevel: 'intermediate',
            languagePreference: 'slovenščina'
        };
    }
    
    saveUserPreferences() {
        localStorage.setItem('omni_user_preferences', JSON.stringify(this.userPreferences));
    }
    
    loadLearningPatterns() {
        const stored = localStorage.getItem('omni_learning_patterns');
        return stored ? JSON.parse(stored) : {
            requestTypes: {},
            solutionSuccess: {},
            timePatterns: {},
            complexityPreferences: {},
            domainExpertise: {},
            collaborationStyle: {}
        };
    }
    
    saveLearningPatterns() {
        localStorage.setItem('omni_learning_patterns', JSON.stringify(this.learningPatterns));
    }
    
    loadPersonalityProfile() {
        const stored = localStorage.getItem('omni_personality_profile');
        return stored ? JSON.parse(stored) : {
            communicationStyle: 'adaptive',
            problemSolvingApproach: 'systematic',
            creativityLevel: 'high',
            riskTolerance: 'moderate',
            decisionMakingStyle: 'analytical',
            learningPreference: 'hands-on',
            workPace: 'efficient',
            feedbackStyle: 'constructive'
        };
    }
    
    savePersonalityProfile() {
        localStorage.setItem('omni_personality_profile', JSON.stringify(this.personalityProfile));
    }
    
    // Učenje iz interakcij
    learnFromInteraction(interaction) {
        const timestamp = new Date().toISOString();
        
        // Dodaj interakcijo v zgodovino
        const enrichedInteraction = {
            ...interaction,
            timestamp,
            context: this.getCurrentContext(),
            userState: this.analyzeUserState(interaction),
            complexity: this.analyzeComplexity(interaction),
            domain: this.identifyDomain(interaction),
            success: null // bo posodobljeno s povratnimi informacijami
        };
        
        this.interactionHistory.push(enrichedInteraction);
        
        // Analiziraj vzorce
        this.analyzePatterns(enrichedInteraction);
        
        // Posodobi preference
        this.updatePreferences(enrichedInteraction);
        
        // Shrani v spomin
        this.updateUserMemory(enrichedInteraction);
        
        // Prilagodi osebnostni profil
        this.adaptPersonalityProfile(enrichedInteraction);
        
        this.saveAll();
        
        return enrichedInteraction;
    }
    
    analyzeUserState(interaction) {
        return {
            urgency: this.detectUrgency(interaction.input),
            mood: this.detectMood(interaction.input),
            expertise: this.assessExpertise(interaction.input),
            clarity: this.assessClarity(interaction.input),
            confidence: this.assessConfidence(interaction.input)
        };
    }
    
    analyzeComplexity(interaction) {
        const input = interaction.input.toLowerCase();
        let complexity = 0;
        
        // Analiza ključnih besed za kompleksnost
        const complexityIndicators = {
            simple: ['enostavno', 'hitro', 'osnovno', 'preprosto'],
            medium: ['sistem', 'aplikacija', 'strategija', 'načrt'],
            complex: ['celovito', 'kompleksno', 'napredno', 'integrirano', 'avtomatizacija'],
            expert: ['AI', 'machine learning', 'blockchain', 'mikroservisi', 'skalabilnost']
        };
        
        if (complexityIndicators.simple.some(word => input.includes(word))) complexity = 1;
        else if (complexityIndicators.medium.some(word => input.includes(word))) complexity = 2;
        else if (complexityIndicators.complex.some(word => input.includes(word))) complexity = 3;
        else if (complexityIndicators.expert.some(word => input.includes(word))) complexity = 4;
        else complexity = 2; // default
        
        return complexity;
    }
    
    identifyDomain(interaction) {
        const input = interaction.input.toLowerCase();
        const domains = {
            turizem: ['turizem', 'potovanje', 'hotel', 'restavracija', 'gostinstvo'],
            tehnologija: ['aplikacija', 'sistem', 'AI', 'tehnologija', 'digitalno'],
            poslovanje: ['podjetje', 'startup', 'business', 'strategija', 'marketing'],
            zdravstvo: ['zdravje', 'wellness', 'medicina', 'fitnes', 'prehrana'],
            izobraževanje: ['učenje', 'izobraževanje', 'šola', 'tečaj', 'mentoring'],
            finance: ['denar', 'investicije', 'proračun', 'finance', 'stroški'],
            kmetijstvo: ['kmetijstvo', 'pridelava', 'živali', 'ekološko', 'rastline']
        };
        
        for (const [domain, keywords] of Object.entries(domains)) {
            if (keywords.some(keyword => input.includes(keyword))) {
                return domain;
            }
        }
        
        return 'splošno';
    }
    
    analyzePatterns(interaction) {
        const domain = interaction.domain;
        const complexity = interaction.complexity;
        const userState = interaction.userState;
        
        // Posodobi vzorce zahtev
        if (!this.learningPatterns.requestTypes[domain]) {
            this.learningPatterns.requestTypes[domain] = 0;
        }
        this.learningPatterns.requestTypes[domain]++;
        
        // Posodobi preference kompleksnosti
        if (!this.learningPatterns.complexityPreferences[complexity]) {
            this.learningPatterns.complexityPreferences[complexity] = 0;
        }
        this.learningPatterns.complexityPreferences[complexity]++;
        
        // Posodobi časovne vzorce
        const hour = new Date().getHours();
        const timeSlot = this.getTimeSlot(hour);
        if (!this.learningPatterns.timePatterns[timeSlot]) {
            this.learningPatterns.timePatterns[timeSlot] = 0;
        }
        this.learningPatterns.timePatterns[timeSlot]++;
        
        // Posodobi domensko ekspertizo
        if (!this.learningPatterns.domainExpertise[domain]) {
            this.learningPatterns.domainExpertise[domain] = {
                interactions: 0,
                averageComplexity: 0,
                successRate: 0
            };
        }
        
        const domainData = this.learningPatterns.domainExpertise[domain];
        domainData.interactions++;
        domainData.averageComplexity = (domainData.averageComplexity + complexity) / 2;
    }
    
    updatePreferences(interaction) {
        // Posodobi preference na podlagi interakcije
        const domain = interaction.domain;
        
        // Dodaj v priljubljene domene
        if (!this.userPreferences.industryFocus.includes(domain)) {
            this.userPreferences.industryFocus.push(domain);
        }
        
        // Prilagodi stil komunikacije
        if (interaction.userState.urgency > 0.7) {
            this.userPreferences.responseSpeed = 'fast';
        } else if (interaction.userState.urgency < 0.3) {
            this.userPreferences.responseSpeed = 'thorough';
        }
        
        // Prilagodi nivo detajlov
        if (interaction.complexity >= 3) {
            this.userPreferences.detailLevel = 'comprehensive';
        } else if (interaction.complexity <= 1) {
            this.userPreferences.detailLevel = 'concise';
        }
    }
    
    updateUserMemory(interaction) {
        // Dodaj zahtevo v spomin
        this.userMemory.requests.push({
            input: interaction.input,
            timestamp: interaction.timestamp,
            domain: interaction.domain,
            complexity: interaction.complexity,
            context: interaction.context
        });
        
        // Ohrani samo zadnjih 1000 zahtev
        if (this.userMemory.requests.length > 1000) {
            this.userMemory.requests = this.userMemory.requests.slice(-1000);
        }
        
        // Posodobi kontekst
        this.userMemory.context[interaction.domain] = {
            lastInteraction: interaction.timestamp,
            frequency: (this.userMemory.context[interaction.domain]?.frequency || 0) + 1,
            averageComplexity: interaction.complexity
        };
    }
    
    adaptPersonalityProfile(interaction) {
        // Prilagodi osebnostni profil na podlagi interakcije
        if (interaction.userState.urgency > 0.8) {
            this.personalityProfile.workPace = 'fast';
        } else if (interaction.userState.urgency < 0.2) {
            this.personalityProfile.workPace = 'methodical';
        }
        
        if (interaction.complexity >= 3) {
            this.personalityProfile.problemSolvingApproach = 'systematic';
        } else {
            this.personalityProfile.problemSolvingApproach = 'intuitive';
        }
    }
    
    // Prilagajanje odzivov
    adaptResponse(baseResponse, context) {
        let adaptedResponse = { ...baseResponse };
        
        // Prilagodi stil komunikacije
        adaptedResponse = this.adaptCommunicationStyle(adaptedResponse);
        
        // Prilagodi nivo detajlov
        adaptedResponse = this.adaptDetailLevel(adaptedResponse);
        
        // Prilagodi na podlagi preteklih izkušenj
        adaptedResponse = this.adaptBasedOnHistory(adaptedResponse, context);
        
        // Dodaj personalizirane predloge
        adaptedResponse = this.addPersonalizedSuggestions(adaptedResponse, context);
        
        return adaptedResponse;
    }
    
    adaptCommunicationStyle(response) {
        const style = this.userPreferences.communicationStyle;
        
        switch (style) {
            case 'casual':
                response.tone = 'friendly';
                response.formality = 'low';
                break;
            case 'professional':
                response.tone = 'professional';
                response.formality = 'high';
                break;
            case 'technical':
                response.tone = 'precise';
                response.formality = 'medium';
                response.includeDetails = true;
                break;
            default:
                response.tone = 'adaptive';
        }
        
        return response;
    }
    
    adaptDetailLevel(response) {
        const level = this.userPreferences.detailLevel;
        
        switch (level) {
            case 'concise':
                response.maxLength = 'short';
                response.includeExamples = false;
                break;
            case 'comprehensive':
                response.maxLength = 'long';
                response.includeExamples = true;
                response.includeAlternatives = true;
                break;
            default:
                response.maxLength = 'medium';
                response.includeExamples = true;
        }
        
        return response;
    }
    
    adaptBasedOnHistory(response, context) {
        // Preveri pretekle uspešne rešitve
        const similarRequests = this.findSimilarRequests(context);
        
        if (similarRequests.length > 0) {
            const successfulSolutions = similarRequests.filter(req => req.success === true);
            
            if (successfulSolutions.length > 0) {
                response.recommendedApproach = successfulSolutions[0].solution;
                response.confidence = 'high';
                response.basedOnHistory = true;
            }
        }
        
        return response;
    }
    
    addPersonalizedSuggestions(response, context) {
        const domain = context.domain;
        const userExpertise = this.learningPatterns.domainExpertise[domain];
        
        if (userExpertise && userExpertise.interactions > 5) {
            response.personalizedTips = [
                `Na podlagi vaših ${userExpertise.interactions} preteklih projektov v ${domain}...`,
                `Glede na vašo izkušenost predlagam...`,
                `Ker ste že uspešno izvedli podobne projekte...`
            ];
        }
        
        // Dodaj predloge na podlagi preference
        const favoriteFeatures = this.userPreferences.favoriteFeatures;
        if (favoriteFeatures.length > 0) {
            response.suggestedFeatures = favoriteFeatures.slice(0, 3);
        }
        
        return response;
    }
    
    // Povratne informacije in izboljšave
    recordFeedback(interactionId, feedback) {
        const interaction = this.interactionHistory.find(i => i.id === interactionId);
        
        if (interaction) {
            interaction.success = feedback.success;
            interaction.rating = feedback.rating;
            interaction.comments = feedback.comments;
            
            // Posodobi vzorce uspešnosti
            this.updateSuccessPatterns(interaction, feedback);
            
            // Shrani povratne informacije
            this.feedbackSystem.set(interactionId, feedback);
            
            this.saveAll();
        }
    }
    
    updateSuccessPatterns(interaction, feedback) {
        const domain = interaction.domain;
        
        if (!this.learningPatterns.solutionSuccess[domain]) {
            this.learningPatterns.solutionSuccess[domain] = {
                total: 0,
                successful: 0,
                averageRating: 0
            };
        }
        
        const domainSuccess = this.learningPatterns.solutionSuccess[domain];
        domainSuccess.total++;
        
        if (feedback.success) {
            domainSuccess.successful++;
        }
        
        domainSuccess.averageRating = (domainSuccess.averageRating + feedback.rating) / 2;
        
        // Posodobi domensko ekspertizo
        if (this.learningPatterns.domainExpertise[domain]) {
            this.learningPatterns.domainExpertise[domain].successRate = 
                domainSuccess.successful / domainSuccess.total;
        }
    }
    
    // Kontinuirano izboljševanje
    identifyImprovementAreas() {
        const improvements = [];
        
        // Analiziraj uspešnost po domenah
        for (const [domain, success] of Object.entries(this.learningPatterns.solutionSuccess)) {
            if (success.averageRating < 3.5) {
                improvements.push({
                    area: domain,
                    issue: 'low_satisfaction',
                    priority: 'high',
                    suggestion: `Izboljšaj rešitve za ${domain}`
                });
            }
        }
        
        // Analiziraj vzorce neuspešnih interakcij
        const failedInteractions = this.interactionHistory.filter(i => i.success === false);
        if (failedInteractions.length > 0) {
            const commonPatterns = this.analyzeFailurePatterns(failedInteractions);
            improvements.push(...commonPatterns);
        }
        
        return improvements;
    }
    
    analyzeFailurePatterns(failedInteractions) {
        const patterns = [];
        
        // Analiziraj po kompleksnosti
        const complexityFailures = {};
        failedInteractions.forEach(interaction => {
            const complexity = interaction.complexity;
            complexityFailures[complexity] = (complexityFailures[complexity] || 0) + 1;
        });
        
        for (const [complexity, count] of Object.entries(complexityFailures)) {
            if (count > 2) {
                patterns.push({
                    area: 'complexity_handling',
                    issue: `frequent_failures_at_complexity_${complexity}`,
                    priority: 'medium',
                    suggestion: `Izboljšaj obravnavo zahtev kompleksnosti ${complexity}`
                });
            }
        }
        
        return patterns;
    }
    
    // Pomožne metode
    getCurrentContext() {
        return {
            timestamp: new Date().toISOString(),
            sessionLength: this.getSessionLength(),
            recentDomains: this.getRecentDomains(),
            userMood: this.assessCurrentMood()
        };
    }
    
    getSessionLength() {
        if (this.interactionHistory.length === 0) return 0;
        
        const firstInteraction = this.interactionHistory[0];
        const now = new Date();
        const start = new Date(firstInteraction.timestamp);
        
        return Math.floor((now - start) / (1000 * 60)); // v minutah
    }
    
    getRecentDomains() {
        const recent = this.interactionHistory.slice(-5);
        return [...new Set(recent.map(i => i.domain))];
    }
    
    assessCurrentMood() {
        const recent = this.interactionHistory.slice(-3);
        if (recent.length === 0) return 'neutral';
        
        const avgUrgency = recent.reduce((sum, i) => sum + (i.userState?.urgency || 0.5), 0) / recent.length;
        
        if (avgUrgency > 0.7) return 'urgent';
        if (avgUrgency < 0.3) return 'relaxed';
        return 'focused';
    }
    
    findSimilarRequests(context) {
        return this.interactionHistory.filter(interaction => 
            interaction.domain === context.domain &&
            Math.abs(interaction.complexity - context.complexity) <= 1
        ).slice(-10);
    }
    
    getTimeSlot(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }
    
    detectUrgency(input) {
        const urgentWords = ['hitro', 'nujno', 'takoj', 'čimprej', 'urgent', 'asap'];
        const relaxedWords = ['počasi', 'premisli', 'načrtuj', 'dolgoročno'];
        
        const inputLower = input.toLowerCase();
        
        if (urgentWords.some(word => inputLower.includes(word))) return 0.9;
        if (relaxedWords.some(word => inputLower.includes(word))) return 0.2;
        
        return 0.5; // nevtralno
    }
    
    detectMood(input) {
        const positiveWords = ['odlično', 'super', 'fantastično', 'veseli'];
        const negativeWords = ['težava', 'problem', 'frustriran', 'ne deluje'];
        
        const inputLower = input.toLowerCase();
        
        if (positiveWords.some(word => inputLower.includes(word))) return 'positive';
        if (negativeWords.some(word => inputLower.includes(word))) return 'frustrated';
        
        return 'neutral';
    }
    
    assessExpertise(input) {
        const expertWords = ['implementiraj', 'optimiziraj', 'arhitektura', 'skalabilnost'];
        const beginnerWords = ['kako', 'kaj je', 'razloži', 'pomoč'];
        
        const inputLower = input.toLowerCase();
        
        if (expertWords.some(word => inputLower.includes(word))) return 'expert';
        if (beginnerWords.some(word => inputLower.includes(word))) return 'beginner';
        
        return 'intermediate';
    }
    
    assessClarity(input) {
        if (input.length < 20) return 0.3;
        if (input.length > 100) return 0.9;
        return 0.6;
    }
    
    assessConfidence(input) {
        const confidentWords = ['želim', 'potrebujem', 'hočem', 'ustvari'];
        const uncertainWords = ['morda', 'verjetno', 'ne vem', 'možno'];
        
        const inputLower = input.toLowerCase();
        
        if (confidentWords.some(word => inputLower.includes(word))) return 0.8;
        if (uncertainWords.some(word => inputLower.includes(word))) return 0.3;
        
        return 0.6;
    }
    
    initializeAdaptationRules() {
        return {
            communicationStyle: {
                urgent: 'direct',
                relaxed: 'detailed',
                frustrated: 'supportive',
                positive: 'enthusiastic'
            },
            responseLength: {
                beginner: 'detailed',
                intermediate: 'balanced',
                expert: 'concise'
            },
            solutionComplexity: {
                low_confidence: 'simple',
                high_confidence: 'advanced'
            }
        };
    }
    
    initializeMetrics() {
        return {
            totalInteractions: 0,
            successRate: 0,
            averageRating: 0,
            improvementRate: 0,
            adaptationAccuracy: 0,
            userSatisfaction: 0
        };
    }
    
    saveAll() {
        this.saveUserMemory();
        this.saveInteractionHistory();
        this.saveUserPreferences();
        this.saveLearningPatterns();
        this.savePersonalityProfile();
    }
    
    // Javni API za integracijo
    processUserInput(input, context = {}) {
        const interaction = {
            id: Date.now().toString(),
            input: input,
            context: context
        };
        
        // Učenje iz interakcije
        const enrichedInteraction = this.learnFromInteraction(interaction);
        
        // Prilagodi odziv
        const baseResponse = { content: '', suggestions: [] };
        const adaptedResponse = this.adaptResponse(baseResponse, enrichedInteraction);
        
        return {
            interaction: enrichedInteraction,
            adaptedResponse: adaptedResponse,
            userProfile: this.getUserProfile(),
            recommendations: this.getPersonalizedRecommendations(enrichedInteraction)
        };
    }
    
    getUserProfile() {
        return {
            preferences: this.userPreferences,
            personality: this.personalityProfile,
            expertise: this.learningPatterns.domainExpertise,
            patterns: this.learningPatterns,
            metrics: this.improvementMetrics
        };
    }
    
    getPersonalizedRecommendations(interaction) {
        const recommendations = [];
        
        // Priporočila na podlagi preteklih uspehov
        const domain = interaction.domain;
        const domainExpertise = this.learningPatterns.domainExpertise[domain];
        
        if (domainExpertise && domainExpertise.successRate > 0.8) {
            recommendations.push({
                type: 'expertise',
                message: `Imate odlične izkušnje z ${domain} projekti!`,
                confidence: domainExpertise.successRate
            });
        }
        
        // Priporočila za izboljšave
        const improvements = this.identifyImprovementAreas();
        if (improvements.length > 0) {
            recommendations.push({
                type: 'improvement',
                message: 'Predlagam fokus na izboljšanje...',
                areas: improvements.slice(0, 3)
            });
        }
        
        return recommendations;
    }
    
    // Metode za kontinuirano izboljševanje
    recordSystemImprovement(improvement) {
        if (!this.systemImprovements) {
            this.systemImprovements = [];
        }
        
        this.systemImprovements.push({
            ...improvement,
            id: Date.now().toString(),
            applied: true
        });
        
        // Omeji velikost zgodovine izboljšav
        if (this.systemImprovements.length > 100) {
            this.systemImprovements = this.systemImprovements.slice(-100);
        }
        
        this.saveToStorage();
        console.log('🔧 Sistemska izboljšava zabeležena:', improvement.description);
    }
    
    recordResponseAdaptations(adaptations) {
        if (!this.responseAdaptations) {
            this.responseAdaptations = [];
        }
        
        this.responseAdaptations.push({
            ...adaptations,
            id: Date.now().toString()
        });
        
        // Omeji velikost zgodovine prilagoditev
        if (this.responseAdaptations.length > 200) {
            this.responseAdaptations = this.responseAdaptations.slice(-200);
        }
        
        this.saveToStorage();
        console.log('🎯 Prilagoditve odzivov zabeležene:', adaptations.adaptations);
    }
    
    enhanceProfilingAccuracy() {
        // Povečaj natančnost profiliranja uporabnika
        this.profilingAccuracy = Math.min((this.profilingAccuracy || 0.7) + 0.05, 1.0);
        
        // Posodobi algoritme za boljše razumevanje uporabnika
        this.updateUserUnderstanding();
        
        console.log('📊 Natančnost profiliranja povečana na:', this.profilingAccuracy);
    }
    
    reinforceSuccessfulPatterns() {
        // Okrepi uspešne vzorce z večjo težo
        if (this.longTermMemory.successPatterns) {
            this.longTermMemory.successPatterns.forEach(pattern => {
                pattern.weight = (pattern.weight || 1) * 1.1;
                pattern.reinforced = true;
                pattern.reinforcementTimestamp = Date.now();
            });
        }
        
        console.log('💪 Uspešni vzorci okrepljeni');
        this.saveToStorage();
    }
    
    updateUserUnderstanding() {
        // Posodobi razumevanje uporabnika na podlagi novih podatkov
        const recentInteractions = this.contextualMemory.recentInteractions.slice(-10);
        
        if (recentInteractions.length > 0) {
            // Analiziraj nedavne interakcije za boljše razumevanje
            const patterns = this.extractPatternsFromInteractions(recentInteractions);
            
            // Posodobi uporabniške preference
            this.updatePreferencesFromPatterns(patterns);
            
            // Posodobi osebnostni profil
            this.updatePersonalityFromPatterns(patterns);
        }
    }
    
    extractPatternsFromInteractions(interactions) {
        const patterns = {
            commonWords: {},
            preferredComplexity: 'medium',
            responseTime: [],
            satisfactionLevels: []
        };
        
        interactions.forEach(interaction => {
            // Analiziraj besede
            if (interaction.input) {
                const words = interaction.input.toLowerCase().split(/\s+/);
                words.forEach(word => {
                    if (word.length > 3) {
                        patterns.commonWords[word] = (patterns.commonWords[word] || 0) + 1;
                    }
                });
            }
            
            // Analiziraj kompleksnost
            if (interaction.complexity) {
                patterns.preferredComplexity = interaction.complexity;
            }
            
            // Analiziraj čas odziva
            if (interaction.responseTime) {
                patterns.responseTime.push(interaction.responseTime);
            }
            
            // Analiziraj zadovoljstvo
            if (interaction.satisfaction) {
                patterns.satisfactionLevels.push(interaction.satisfaction);
            }
        });
        
        return patterns;
    }
    
    updatePreferencesFromPatterns(patterns) {
        // Posodobi preference na podlagi vzorcev
        if (patterns.preferredComplexity) {
            this.userPreferences.preferredComplexity = patterns.preferredComplexity;
        }
        
        // Posodobi preference za hitrost
        if (patterns.responseTime.length > 0) {
            const avgResponseTime = patterns.responseTime.reduce((a, b) => a + b, 0) / patterns.responseTime.length;
            this.userPreferences.preferredSpeed = avgResponseTime < 5000 ? 'fast' : 'thorough';
        }
        
        // Posodobi preference za zadovoljstvo
        if (patterns.satisfactionLevels.length > 0) {
            const avgSatisfaction = patterns.satisfactionLevels.reduce((a, b) => a + b, 0) / patterns.satisfactionLevels.length;
            this.userPreferences.qualityThreshold = avgSatisfaction;
        }
    }
    
    updatePersonalityFromPatterns(patterns) {
        // Posodobi osebnostni profil na podlagi vzorcev
        const commonWords = Object.keys(patterns.commonWords).sort((a, b) => 
            patterns.commonWords[b] - patterns.commonWords[a]
        ).slice(0, 10);
        
        // Določi osebnostne lastnosti na podlagi besed
        const technicalWords = ['api', 'integracija', 'baza', 'sistem', 'koda'];
        const creativeWords = ['dizajn', 'kreativno', 'umetnost', 'inovativno'];
        const businessWords = ['poslovno', 'prodaja', 'marketing', 'stranka'];
        
        const technicalScore = commonWords.filter(word => 
            technicalWords.some(tech => word.includes(tech))
        ).length;
        
        const creativeScore = commonWords.filter(word => 
            creativeWords.some(creative => word.includes(creative))
        ).length;
        
        const businessScore = commonWords.filter(word => 
            businessWords.some(business => word.includes(business))
        ).length;
        
        // Posodobi osebnostni profil
        this.personalityProfile.technicalOrientation = technicalScore / commonWords.length;
        this.personalityProfile.creativeOrientation = creativeScore / commonWords.length;
        this.personalityProfile.businessOrientation = businessScore / commonWords.length;
        
        // Določi dominantno orientacijo
        const orientations = {
            technical: this.personalityProfile.technicalOrientation,
            creative: this.personalityProfile.creativeOrientation,
            business: this.personalityProfile.businessOrientation
        };
        
        this.personalityProfile.dominantOrientation = Object.keys(orientations).reduce((a, b) => 
            orientations[a] > orientations[b] ? a : b
        );
    }
    
    // Pridobi statistike izboljšav
    getImprovementStats() {
        return {
            systemImprovements: this.systemImprovements?.length || 0,
            responseAdaptations: this.responseAdaptations?.length || 0,
            profilingAccuracy: this.profilingAccuracy || 0.7,
            reinforcedPatterns: this.longTermMemory.successPatterns?.filter(p => p.reinforced)?.length || 0,
            lastImprovement: this.systemImprovements?.[this.systemImprovements.length - 1]?.timestamp || null
        };
    }
}

// Export za uporabo v drugih modulih
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OmniLearningSystem;
}