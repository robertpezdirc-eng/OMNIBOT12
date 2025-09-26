/**
 * 💰 PERSONALIZED UPSELL SYSTEM - OMNI BRAIN MAXI ULTRA
 * Napreden sistem za personalizirane upsell predloge, promocijske akcije
 * in komercialno optimizirane kampanje z AI personalizacijo
 * 
 * FUNKCIONALNOSTI:
 * - AI-powered personalizacija predlogov
 * - Real-time upsell kampanje
 * - Dinamično cenovni modeli
 * - A/B testiranje predlogov
 * - Behavioral triggering
 * - Cross-sell priložnosti
 * - Retention kampanje
 * - Revenue optimization
 * - Personalizirane promocije
 * - Loyalty program integration
 */

const EventEmitter = require('events');

class PersonalizedUpsellSystem extends EventEmitter {
    constructor(brain, behaviorAnalytics, automationSystem, monitoringSystem) {
        super();
        this.brain = brain;
        this.behaviorAnalytics = behaviorAnalytics;
        this.automation = automationSystem;
        this.monitoring = monitoringSystem;
        this.version = "PUS-SYSTEM-1.0";
        this.status = "INITIALIZING";
        
        // Upsell moduli
        this.campaignEngine = null;
        this.personalizationEngine = null;
        this.pricingEngine = null;
        this.testingEngine = null;
        this.triggerEngine = null;
        this.loyaltyEngine = null;
        
        // Podatkovni sloji
        this.campaigns = new Map();
        this.offers = new Map();
        this.userProfiles = new Map();
        this.interactions = new Map();
        this.conversions = new Map();
        this.testResults = new Map();
        
        // AI modeli
        this.personalizationModel = null;
        this.pricingModel = null;
        this.timingModel = null;
        this.channelModel = null;
        this.contentModel = null;
        
        // Konfiguracija
        this.config = {
            campaignInterval: 60000, // 1 minuta
            maxOffersPerUser: 3,
            offerCooldown: 3600000, // 1 ura
            minEngagementScore: 0.3,
            maxChurnRisk: 0.7,
            testDuration: 604800000, // 1 teden
            conversionWindow: 2592000000, // 30 dni
            loyaltyThreshold: 0.8,
            revenueTarget: 10000 // Mesečni cilj
        };
        
        // Upsell strategije
        this.strategies = new Map([
            ['feature_unlock', {
                name: 'Feature Unlock',
                description: 'Odklepanje premium funkcionalnosti',
                triggers: ['feature_limit_reached', 'high_engagement'],
                targetSegments: ['power_user', 'casual_user'],
                offerTypes: ['premium_upgrade', 'feature_pack'],
                expectedConversion: 0.15,
                avgRevenue: 50,
                priority: 'HIGH'
            }],
            ['usage_based', {
                name: 'Usage-Based Upsell',
                description: 'Nadgradnja na podlagi uporabe',
                triggers: ['usage_threshold', 'api_limit'],
                targetSegments: ['power_user', 'high_value'],
                offerTypes: ['capacity_upgrade', 'unlimited_plan'],
                expectedConversion: 0.25,
                avgRevenue: 75,
                priority: 'HIGH'
            }],
            ['time_sensitive', {
                name: 'Time-Sensitive Offers',
                description: 'Časovno omejene ponudbe',
                triggers: ['seasonal_event', 'milestone_reached'],
                targetSegments: ['casual_user', 'at_risk'],
                offerTypes: ['discount_offer', 'bonus_features'],
                expectedConversion: 0.20,
                avgRevenue: 35,
                priority: 'MEDIUM'
            }],
            ['retention_focused', {
                name: 'Retention Campaign',
                description: 'Kampanje za zadrževanje uporabnikov',
                triggers: ['churn_risk', 'declining_engagement'],
                targetSegments: ['at_risk', 'casual_user'],
                offerTypes: ['loyalty_discount', 'exclusive_access'],
                expectedConversion: 0.30,
                avgRevenue: 40,
                priority: 'CRITICAL'
            }],
            ['cross_sell', {
                name: 'Cross-Sell Opportunities',
                description: 'Prodaja komplementarnih produktov',
                triggers: ['integration_usage', 'api_activity'],
                targetSegments: ['high_value', 'premium'],
                offerTypes: ['addon_services', 'integration_pack'],
                expectedConversion: 0.18,
                avgRevenue: 60,
                priority: 'MEDIUM'
            }]
        ]);
        
        // Offer templates
        this.offerTemplates = new Map([
            ['premium_upgrade', {
                title: 'Nadgradite na Premium',
                description: 'Odklepajte vse premium funkcionalnosti',
                benefits: ['Neomejene funkcije', 'Prioritetna podpora', 'Napredna analitika'],
                basePrice: 50,
                discountRange: [0, 0.3],
                validityPeriod: 604800000, // 1 teden
                callToAction: 'Nadgradite zdaj'
            }],
            ['feature_pack', {
                title: 'Ekskluzivni Feature Pack',
                description: 'Dodatne funkcionalnosti za vaše potrebe',
                benefits: ['Napredni AI', 'Custom integracije', 'Bulk operacije'],
                basePrice: 25,
                discountRange: [0, 0.2],
                validityPeriod: 432000000, // 5 dni
                callToAction: 'Dodajte funkcije'
            }],
            ['capacity_upgrade', {
                title: 'Povečajte Kapaciteto',
                description: 'Več prostora in zmogljivosti',
                benefits: ['10x več prostora', 'Hitrejše procesiranje', 'Bulk import'],
                basePrice: 75,
                discountRange: [0, 0.25],
                validityPeriod: 1209600000, // 2 tedna
                callToAction: 'Povečajte kapaciteto'
            }],
            ['discount_offer', {
                title: 'Ekskluzivna Ponudba',
                description: 'Omejena časovna ponudba samo za vas',
                benefits: ['50% popust', 'Bonus funkcije', 'Podaljšana podpora'],
                basePrice: 30,
                discountRange: [0.3, 0.5],
                validityPeriod: 259200000, // 3 dni
                callToAction: 'Izkoristite ponudbo'
            }],
            ['loyalty_discount', {
                title: 'Loyalty Nagrada',
                description: 'Posebna ponudba za zveste uporabnike',
                benefits: ['Ekskluzivni popust', 'VIP status', 'Early access'],
                basePrice: 40,
                discountRange: [0.2, 0.4],
                validityPeriod: 864000000, // 10 dni
                callToAction: 'Aktivirajte nagrado'
            }]
        ]);
        
        // Personalizacijski faktorji
        this.personalizationFactors = [
            'user_segment',
            'engagement_level',
            'usage_patterns',
            'feature_preferences',
            'price_sensitivity',
            'churn_risk',
            'lifetime_value',
            'interaction_history',
            'seasonal_behavior',
            'device_preferences',
            'time_preferences',
            'communication_preferences'
        ];
        
        // Trigger pravila
        this.triggerRules = new Map([
            ['feature_limit_reached', {
                condition: (user, activity) => {
                    return activity.type === 'feature_blocked' && user.engagementScore > 0.6;
                },
                cooldown: 3600000, // 1 ura
                maxTriggers: 3,
                priority: 'HIGH'
            }],
            ['usage_threshold', {
                condition: (user, activity) => {
                    return user.usagePercentage > 0.8 && user.licenseType !== 'premium';
                },
                cooldown: 86400000, // 1 dan
                maxTriggers: 2,
                priority: 'HIGH'
            }],
            ['high_engagement', {
                condition: (user, activity) => {
                    return user.engagementScore > 0.8 && user.sessionsThisWeek > 5;
                },
                cooldown: 604800000, // 1 teden
                maxTriggers: 1,
                priority: 'MEDIUM'
            }],
            ['churn_risk', {
                condition: (user, activity) => {
                    return user.churnProbability > 0.5 && user.daysSinceLastActivity > 3;
                },
                cooldown: 259200000, // 3 dni
                maxTriggers: 5,
                priority: 'CRITICAL'
            }],
            ['milestone_reached', {
                condition: (user, activity) => {
                    return activity.type === 'milestone' && user.totalPoints % 100 === 0;
                },
                cooldown: 2592000000, // 30 dni
                maxTriggers: 1,
                priority: 'MEDIUM'
            }]
        ]);
        
        // Statistike
        this.stats = {
            campaignsCreated: 0,
            offersGenerated: 0,
            offersSent: 0,
            conversions: 0,
            totalRevenue: 0,
            avgConversionRate: 0,
            avgRevenuePerUser: 0,
            testsRunning: 0,
            personalizedOffers: 0
        };
        
        console.log("💰 ===============================================");
        console.log("💰 PERSONALIZED UPSELL SYSTEM");
        console.log("💰 AI-powered komercialne kampanje");
        console.log("💰 ===============================================");
        console.log(`💰 Verzija: ${this.version}`);
        console.log(`💰 Interval kampanj: ${this.config.campaignInterval}ms`);
        console.log("💰 ===============================================");
        
        this.initialize();
    }

    async initialize() {
        try {
            console.log("🚀 Inicializacija Personalized Upsell System...");
            
            // 1. Inicializacija modulov
            await this.initializeEngines();
            
            // 2. Nalaganje AI modelov
            await this.loadAIModels();
            
            // 3. Vzpostavitev trigger sistemov
            await this.setupTriggerSystem();
            
            // 4. Inicializacija kampanj
            await this.initializeCampaigns();
            
            // 5. Začetek real-time procesiranja
            await this.startRealTimeProcessing();
            
            // 6. Aktivacija A/B testiranja
            await this.activateABTesting();
            
            // 7. Vzpostavitev loyalty programa
            await this.setupLoyaltyProgram();
            
            this.status = "ACTIVE";
            console.log("✅ Personalized Upsell System aktiven!");
            
        } catch (error) {
            console.error("❌ Napaka pri inicializaciji upsell sistema:", error);
            this.status = "ERROR";
        }
    }

    async initializeEngines() {
        console.log("🔧 Inicializacija upsell modulov...");
        
        // Campaign Engine
        this.campaignEngine = new CampaignEngine(this);
        
        // Personalization Engine
        this.personalizationEngine = new PersonalizationEngine(this);
        
        // Pricing Engine
        this.pricingEngine = new PricingEngine(this);
        
        // Testing Engine
        this.testingEngine = new ABTestingEngine(this);
        
        // Trigger Engine
        this.triggerEngine = new TriggerEngine(this);
        
        // Loyalty Engine
        this.loyaltyEngine = new LoyaltyEngine(this);
        
        console.log("✅ Vsi upsell moduli inicializirani");
    }

    async loadAIModels() {
        console.log("🤖 Nalaganje AI modelov za upsell...");
        
        // Personalization Model
        this.personalizationModel = new PersonalizationAIModel();
        await this.personalizationModel.initialize();
        
        // Dynamic Pricing Model
        this.pricingModel = new DynamicPricingModel();
        await this.pricingModel.initialize();
        
        // Optimal Timing Model
        this.timingModel = new OptimalTimingModel();
        await this.timingModel.initialize();
        
        // Channel Selection Model
        this.channelModel = new ChannelSelectionModel();
        await this.channelModel.initialize();
        
        // Content Optimization Model
        this.contentModel = new ContentOptimizationModel();
        await this.contentModel.initialize();
        
        console.log("✅ AI modeli naloženi in aktivni");
    }

    async setupTriggerSystem() {
        console.log("⚡ Vzpostavljam trigger sistem...");
        
        // Poslušaj behavior analytics dogodke
        if (this.behaviorAnalytics) {
            this.behaviorAnalytics.on('user_activity', (data) => {
                this.processTrigger(data);
            });
            
            this.behaviorAnalytics.on('behavioral_anomaly', (data) => {
                this.processAnomalyTrigger(data);
            });
            
            this.behaviorAnalytics.on('behavior_insight', (data) => {
                this.processInsightTrigger(data);
            });
        }
        
        // Poslušaj monitoring dogodke
        if (this.monitoring) {
            this.monitoring.on('user_milestone', (data) => {
                this.processMilestoneTrigger(data);
            });
            
            this.monitoring.on('usage_threshold', (data) => {
                this.processUsageTrigger(data);
            });
        }
        
        console.log("✅ Trigger sistem vzpostavljen");
    }

    async initializeCampaigns() {
        console.log("📢 Inicializacija kampanj...");
        
        // Ustvari osnovne kampanje za vsako strategijo
        for (const [strategyId, strategy] of this.strategies) {
            const campaign = await this.createCampaign(strategyId, strategy);
            this.campaigns.set(campaign.id, campaign);
        }
        
        console.log(`✅ Inicializiranih ${this.campaigns.size} kampanj`);
    }

    async createCampaign(strategyId, strategy) {
        const campaign = {
            id: `campaign_${strategyId}_${Date.now()}`,
            strategyId: strategyId,
            name: strategy.name,
            description: strategy.description,
            status: 'ACTIVE',
            targetSegments: strategy.targetSegments,
            triggers: strategy.triggers,
            offerTypes: strategy.offerTypes,
            metrics: {
                impressions: 0,
                clicks: 0,
                conversions: 0,
                revenue: 0,
                conversionRate: 0,
                avgOrderValue: 0
            },
            settings: {
                maxBudget: 5000,
                dailyBudget: 200,
                targetAudience: strategy.targetSegments,
                priority: strategy.priority,
                startDate: Date.now(),
                endDate: Date.now() + 2592000000 // 30 dni
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.stats.campaignsCreated++;
        return campaign;
    }

    async startRealTimeProcessing() {
        console.log("⏱️ Začenjam real-time procesiranje...");
        
        // Glavna procesna zanka
        this.processingInterval = setInterval(() => {
            this.processUpsellCycle();
        }, this.config.campaignInterval);
        
        // Personalizacija (vsake 2 minuti)
        this.personalizationInterval = setInterval(() => {
            this.updatePersonalization();
        }, 120000);
        
        // Pricing optimization (vsakih 5 minut)
        this.pricingInterval = setInterval(() => {
            this.optimizePricing();
        }, 300000);
        
        // Campaign optimization (vsakih 15 minut)
        this.campaignInterval = setInterval(() => {
            this.optimizeCampaigns();
        }, 900000);
        
        // Performance analysis (vsako uro)
        this.analysisInterval = setInterval(() => {
            this.analyzePerformance();
        }, 3600000);
        
        console.log("✅ Real-time procesiranje aktivno");
    }

    async activateABTesting() {
        console.log("🧪 Aktivacija A/B testiranja...");
        
        // Ustvari A/B teste za vsako kampanjo
        for (const [campaignId, campaign] of this.campaigns) {
            await this.createABTest(campaign);
        }
        
        console.log("✅ A/B testiranje aktivno");
    }

    async createABTest(campaign) {
        const test = {
            id: `test_${campaign.id}_${Date.now()}`,
            campaignId: campaign.id,
            name: `${campaign.name} A/B Test`,
            variants: [
                {
                    id: 'variant_a',
                    name: 'Control',
                    traffic: 0.5,
                    settings: { discount: 0.1, urgency: 'low' }
                },
                {
                    id: 'variant_b',
                    name: 'Treatment',
                    traffic: 0.5,
                    settings: { discount: 0.2, urgency: 'high' }
                }
            ],
            metrics: {
                variant_a: { impressions: 0, conversions: 0, revenue: 0 },
                variant_b: { impressions: 0, conversions: 0, revenue: 0 }
            },
            status: 'RUNNING',
            startDate: Date.now(),
            endDate: Date.now() + this.config.testDuration,
            significance: 0,
            winner: null
        };
        
        this.testResults.set(test.id, test);
        this.stats.testsRunning++;
        
        return test;
    }

    async setupLoyaltyProgram() {
        console.log("🏆 Vzpostavljam loyalty program...");
        
        // Inicializiraj loyalty engine
        await this.loyaltyEngine.initialize();
        
        console.log("✅ Loyalty program vzpostavljen");
    }

    async processUpsellCycle() {
        try {
            const startTime = Date.now();
            
            // 1. Identificiraj kandidate za upsell
            const candidates = await this.identifyUpsellCandidates();
            
            // 2. Generiraj personalizirane ponudbe
            const offers = await this.generatePersonalizedOffers(candidates);
            
            // 3. Optimiziraj timing in kanale
            const optimizedOffers = await this.optimizeOfferDelivery(offers);
            
            // 4. Pošlji ponudbe
            await this.deliverOffers(optimizedOffers);
            
            // 5. Posodobi statistike
            this.updateStatistics();
            
            const cycleTime = Date.now() - startTime;
            
            // Pošlji rezultate
            this.emit('upsell_cycle_complete', {
                cycleTime: cycleTime,
                candidates: candidates.length,
                offers: offers.length,
                delivered: optimizedOffers.length
            });
            
        } catch (error) {
            console.error("❌ Napaka v upsell ciklu:", error);
        }
    }

    async identifyUpsellCandidates() {
        const candidates = [];
        
        // Pridobi vse uporabnike
        const users = await this.getAllUsers();
        
        for (const user of users) {
            // Preveri ali je uporabnik kandidat
            if (await this.isUpsellCandidate(user)) {
                const candidateProfile = await this.createCandidateProfile(user);
                candidates.push(candidateProfile);
            }
        }
        
        return candidates;
    }

    async isUpsellCandidate(user) {
        // Preveri osnovne pogoje
        if (user.engagementScore < this.config.minEngagementScore) return false;
        if (user.churnProbability > this.config.maxChurnRisk) return false;
        
        // Preveri cooldown
        const lastOffer = this.getLastOfferTime(user.id);
        if (lastOffer && (Date.now() - lastOffer) < this.config.offerCooldown) return false;
        
        // Preveri maksimalno število ponudb
        const activeOffers = this.getActiveOffersCount(user.id);
        if (activeOffers >= this.config.maxOffersPerUser) return false;
        
        return true;
    }

    async createCandidateProfile(user) {
        // Pridobi behavioral profile
        const behaviorProfile = this.behaviorAnalytics ? 
            this.behaviorAnalytics.getUserBehaviorProfile(user.id) : {};
        
        // Izvleci personalizacijske faktorje
        const personalizationData = await this.extractPersonalizationFactors(user, behaviorProfile);
        
        return {
            userId: user.id,
            user: user,
            behaviorProfile: behaviorProfile,
            personalization: personalizationData,
            eligibleStrategies: await this.getEligibleStrategies(user),
            priority: this.calculateCandidatePriority(user, personalizationData),
            timestamp: Date.now()
        };
    }

    async extractPersonalizationFactors(user, behaviorProfile) {
        const factors = {};
        
        // Osnovni faktorji
        factors.user_segment = this.getUserSegment(user);
        factors.engagement_level = user.engagementScore || 0;
        factors.usage_patterns = this.analyzeUsagePatterns(behaviorProfile);
        factors.feature_preferences = this.analyzeFeaturePreferences(behaviorProfile);
        factors.price_sensitivity = await this.calculatePriceSensitivity(user);
        factors.churn_risk = user.churnProbability || 0;
        factors.lifetime_value = user.lifetimeValue || 0;
        factors.interaction_history = this.analyzeInteractionHistory(behaviorProfile);
        factors.seasonal_behavior = this.analyzeSeasonalBehavior(user);
        factors.device_preferences = this.analyzeDevicePreferences(behaviorProfile);
        factors.time_preferences = this.analyzeTimePreferences(behaviorProfile);
        factors.communication_preferences = this.analyzeCommunicationPreferences(user);
        
        return factors;
    }

    async getEligibleStrategies(user) {
        const eligibleStrategies = [];
        
        for (const [strategyId, strategy] of this.strategies) {
            // Preveri ali uporabnik ustreza target segmentom
            const userSegment = this.getUserSegment(user);
            if (strategy.targetSegments.includes(userSegment)) {
                eligibleStrategies.push(strategyId);
            }
        }
        
        return eligibleStrategies;
    }

    calculateCandidatePriority(user, personalizationData) {
        let priority = 0;
        
        // Engagement score weight
        priority += personalizationData.engagement_level * 0.3;
        
        // LTV weight
        priority += Math.min(personalizationData.lifetime_value / 1000, 1) * 0.25;
        
        // Churn risk weight (inverted)
        priority += (1 - personalizationData.churn_risk) * 0.2;
        
        // Usage patterns weight
        priority += personalizationData.usage_patterns.intensity * 0.15;
        
        // Price sensitivity weight (inverted)
        priority += (1 - personalizationData.price_sensitivity) * 0.1;
        
        return Math.min(priority, 1);
    }

    async generatePersonalizedOffers(candidates) {
        const offers = [];
        
        for (const candidate of candidates) {
            try {
                const personalizedOffers = await this.createPersonalizedOffers(candidate);
                offers.push(...personalizedOffers);
            } catch (error) {
                console.error(`❌ Napaka pri generiranju ponudb za ${candidate.userId}:`, error);
            }
        }
        
        this.stats.offersGenerated += offers.length;
        return offers;
    }

    async createPersonalizedOffers(candidate) {
        const offers = [];
        
        // Za vsako eligible strategijo
        for (const strategyId of candidate.eligibleStrategies) {
            const strategy = this.strategies.get(strategyId);
            if (!strategy) continue;
            
            // Za vsak offer type v strategiji
            for (const offerType of strategy.offerTypes) {
                const offer = await this.generateOffer(candidate, strategyId, offerType);
                if (offer) {
                    offers.push(offer);
                }
            }
        }
        
        // Sortiraj po prioriteti in vrni top 2
        return offers
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 2);
    }

    async generateOffer(candidate, strategyId, offerType) {
        const template = this.offerTemplates.get(offerType);
        if (!template) return null;
        
        // Personaliziraj ponudbo z AI modelom
        const personalizedContent = await this.personalizeOfferContent(candidate, template);
        
        // Optimiziraj ceno
        const optimizedPrice = await this.optimizeOfferPrice(candidate, template);
        
        // Določi urgency in timing
        const timing = await this.optimizeOfferTiming(candidate);
        
        const offer = {
            id: `offer_${candidate.userId}_${strategyId}_${offerType}_${Date.now()}`,
            userId: candidate.userId,
            strategyId: strategyId,
            offerType: offerType,
            template: template,
            content: personalizedContent,
            pricing: optimizedPrice,
            timing: timing,
            priority: this.calculateOfferPriority(candidate, strategyId, offerType),
            status: 'GENERATED',
            createdAt: Date.now(),
            expiresAt: Date.now() + template.validityPeriod,
            metadata: {
                personalizationFactors: candidate.personalization,
                abTestVariant: this.getABTestVariant(strategyId),
                expectedConversion: this.calculateExpectedConversion(candidate, strategyId),
                expectedRevenue: optimizedPrice.finalPrice
            }
        };
        
        // Shrani ponudbo
        this.offers.set(offer.id, offer);
        this.stats.personalizedOffers++;
        
        return offer;
    }

    async personalizeOfferContent(candidate, template) {
        // Uporabi AI model za personalizacijo vsebine
        if (this.contentModel) {
            return await this.contentModel.personalize(template, candidate.personalization);
        }
        
        // Fallback personalizacija
        return {
            title: this.personalizeTitle(template.title, candidate),
            description: this.personalizeDescription(template.description, candidate),
            benefits: this.personalizeBenefits(template.benefits, candidate),
            callToAction: this.personalizeCallToAction(template.callToAction, candidate)
        };
    }

    personalizeTitle(title, candidate) {
        // Dodaj personalizacijo na podlagi segmenta
        const segment = candidate.personalization.user_segment;
        
        if (segment === 'power_user') {
            return `Pro ${title}`;
        } else if (segment === 'casual_user') {
            return `Enostavna ${title}`;
        } else if (segment === 'high_value') {
            return `Ekskluzivna ${title}`;
        }
        
        return title;
    }

    personalizeDescription(description, candidate) {
        // Personaliziraj opis na podlagi preference
        const preferences = candidate.personalization.feature_preferences;
        
        if (preferences.analytics > 0.7) {
            return description + ' z naprednimi analitičnimi orodji';
        } else if (preferences.automation > 0.7) {
            return description + ' z avtomatiziranimi funkcijami';
        }
        
        return description;
    }

    personalizeBenefits(benefits, candidate) {
        // Sortiraj benefits po relevantnosti za uporabnika
        const preferences = candidate.personalization.feature_preferences;
        
        return benefits.sort((a, b) => {
            const scoreA = this.calculateBenefitRelevance(a, preferences);
            const scoreB = this.calculateBenefitRelevance(b, preferences);
            return scoreB - scoreA;
        });
    }

    calculateBenefitRelevance(benefit, preferences) {
        // Enostavna relevantnost na podlagi ključnih besed
        let score = 0;
        
        if (benefit.includes('analitika') && preferences.analytics > 0.5) score += 0.3;
        if (benefit.includes('avtomatizacija') && preferences.automation > 0.5) score += 0.3;
        if (benefit.includes('integracija') && preferences.integrations > 0.5) score += 0.3;
        if (benefit.includes('podpora') && preferences.support > 0.5) score += 0.2;
        
        return score;
    }

    personalizeCallToAction(cta, candidate) {
        const urgency = candidate.personalization.price_sensitivity;
        
        if (urgency > 0.7) {
            return `${cta} - Omejena ponudba!`;
        } else if (urgency > 0.4) {
            return `${cta} danes`;
        }
        
        return cta;
    }

    async optimizeOfferPrice(candidate, template) {
        // Uporabi AI model za dinamično ceno
        if (this.pricingModel) {
            return await this.pricingModel.optimize(template, candidate.personalization);
        }
        
        // Fallback pricing
        const basePrice = template.basePrice;
        const priceSensitivity = candidate.personalization.price_sensitivity;
        const discountRange = template.discountRange;
        
        // Izračunaj optimalen popust
        const discount = discountRange[0] + (discountRange[1] - discountRange[0]) * priceSensitivity;
        const finalPrice = basePrice * (1 - discount);
        
        return {
            basePrice: basePrice,
            discount: discount,
            finalPrice: Math.round(finalPrice * 100) / 100,
            currency: 'EUR',
            displayPrice: `${Math.round(finalPrice)}€`,
            savings: Math.round((basePrice - finalPrice) * 100) / 100
        };
    }

    async optimizeOfferTiming(candidate) {
        // Uporabi AI model za optimalen timing
        if (this.timingModel) {
            return await this.timingModel.optimize(candidate.personalization);
        }
        
        // Fallback timing
        const timePreferences = candidate.personalization.time_preferences;
        
        return {
            preferredHour: timePreferences.preferredHour || 14,
            preferredDay: timePreferences.preferredDay || 'tuesday',
            urgency: this.calculateUrgency(candidate),
            deliveryDelay: this.calculateDeliveryDelay(candidate)
        };
    }

    calculateUrgency(candidate) {
        const churnRisk = candidate.personalization.churn_risk;
        const engagement = candidate.personalization.engagement_level;
        
        if (churnRisk > 0.6) return 'HIGH';
        if (engagement > 0.8) return 'MEDIUM';
        return 'LOW';
    }

    calculateDeliveryDelay(candidate) {
        const urgency = this.calculateUrgency(candidate);
        
        switch (urgency) {
            case 'HIGH': return 0; // Takoj
            case 'MEDIUM': return 3600000; // 1 ura
            case 'LOW': return 86400000; // 1 dan
            default: return 3600000;
        }
    }

    calculateOfferPriority(candidate, strategyId, offerType) {
        const strategy = this.strategies.get(strategyId);
        const candidatePriority = candidate.priority;
        const strategyPriority = this.getStrategyPriorityScore(strategy.priority);
        const expectedConversion = strategy.expectedConversion;
        const expectedRevenue = strategy.avgRevenue;
        
        return (candidatePriority * 0.4) + 
               (strategyPriority * 0.3) + 
               (expectedConversion * 0.2) + 
               (Math.min(expectedRevenue / 100, 1) * 0.1);
    }

    getStrategyPriorityScore(priority) {
        switch (priority) {
            case 'CRITICAL': return 1.0;
            case 'HIGH': return 0.8;
            case 'MEDIUM': return 0.6;
            case 'LOW': return 0.4;
            default: return 0.5;
        }
    }

    getABTestVariant(strategyId) {
        // Najdi aktiven test za strategijo
        for (const [testId, test] of this.testResults) {
            const campaign = this.campaigns.get(test.campaignId);
            if (campaign && campaign.strategyId === strategyId && test.status === 'RUNNING') {
                // Naključno izberi variant
                return Math.random() < 0.5 ? 'variant_a' : 'variant_b';
            }
        }
        
        return 'control';
    }

    calculateExpectedConversion(candidate, strategyId) {
        const strategy = this.strategies.get(strategyId);
        const baseConversion = strategy.expectedConversion;
        const candidatePriority = candidate.priority;
        
        // Prilagodi na podlagi candidate priority
        return baseConversion * (0.5 + candidatePriority * 0.5);
    }

    async optimizeOfferDelivery(offers) {
        const optimizedOffers = [];
        
        for (const offer of offers) {
            // Optimiziraj kanal dostave
            const optimalChannel = await this.selectOptimalChannel(offer);
            
            // Optimiziraj timing
            const optimalTiming = await this.optimizeDeliveryTiming(offer);
            
            // Preveri ali je ponudba še vedno veljavna
            if (this.isOfferValid(offer)) {
                offer.delivery = {
                    channel: optimalChannel,
                    timing: optimalTiming,
                    scheduledAt: Date.now() + offer.timing.deliveryDelay
                };
                
                optimizedOffers.push(offer);
            }
        }
        
        return optimizedOffers;
    }

    async selectOptimalChannel(offer) {
        // Uporabi AI model za izbiro kanala
        if (this.channelModel) {
            return await this.channelModel.select(offer);
        }
        
        // Fallback channel selection
        const candidate = await this.getCandidateById(offer.userId);
        const preferences = candidate.personalization.communication_preferences;
        
        if (preferences.email > 0.7) return 'email';
        if (preferences.push > 0.7) return 'push_notification';
        if (preferences.inApp > 0.7) return 'in_app';
        
        return 'email'; // Default
    }

    async optimizeDeliveryTiming(offer) {
        // Dodatna optimizacija timing-a
        const currentHour = new Date().getHours();
        const preferredHour = offer.timing.preferredHour;
        
        // Če je trenutni čas blizu preferenčnemu, pošlji takoj
        if (Math.abs(currentHour - preferredHour) <= 2) {
            offer.timing.deliveryDelay = 0;
        }
        
        return offer.timing;
    }

    isOfferValid(offer) {
        // Preveri ali ponudba ni potekla
        if (Date.now() > offer.expiresAt) return false;
        
        // Preveri ali uporabnik ni že konvertiral
        if (this.hasUserConverted(offer.userId, offer.strategyId)) return false;
        
        // Preveri cooldown
        const lastOffer = this.getLastOfferTime(offer.userId);
        if (lastOffer && (Date.now() - lastOffer) < this.config.offerCooldown) return false;
        
        return true;
    }

    async deliverOffers(offers) {
        for (const offer of offers) {
            try {
                await this.deliverOffer(offer);
            } catch (error) {
                console.error(`❌ Napaka pri dostavi ponudbe ${offer.id}:`, error);
            }
        }
    }

    async deliverOffer(offer) {
        // Simulacija dostave ponudbe
        console.log(`📧 Dostavljam ponudbo ${offer.id} uporabniku ${offer.userId} preko ${offer.delivery.channel}`);
        
        // Posodobi status
        offer.status = 'DELIVERED';
        offer.deliveredAt = Date.now();
        
        // Zabeleži interakcijo
        this.recordOfferInteraction(offer, 'DELIVERED');
        
        // Posodobi statistike
        this.stats.offersSent++;
        
        // Pošlji dogodek
        this.emit('offer_delivered', offer);
        
        // Nastavi timeout za tracking
        setTimeout(() => {
            this.trackOfferPerformance(offer);
        }, 86400000); // 24 ur
    }

    recordOfferInteraction(offer, interactionType) {
        const interaction = {
            offerId: offer.id,
            userId: offer.userId,
            type: interactionType,
            timestamp: Date.now(),
            metadata: {
                channel: offer.delivery?.channel,
                abVariant: offer.metadata.abTestVariant
            }
        };
        
        if (!this.interactions.has(offer.userId)) {
            this.interactions.set(offer.userId, []);
        }
        
        this.interactions.get(offer.userId).push(interaction);
        
        // Posodobi A/B test metrike
        this.updateABTestMetrics(offer, interactionType);
    }

    updateABTestMetrics(offer, interactionType) {
        const variant = offer.metadata.abTestVariant;
        if (!variant || variant === 'control') return;
        
        // Najdi ustrezen test
        for (const [testId, test] of this.testResults) {
            const campaign = this.campaigns.get(test.campaignId);
            if (campaign && campaign.strategyId === offer.strategyId) {
                if (interactionType === 'DELIVERED') {
                    test.metrics[variant].impressions++;
                } else if (interactionType === 'CONVERTED') {
                    test.metrics[variant].conversions++;
                    test.metrics[variant].revenue += offer.pricing.finalPrice;
                }
                break;
            }
        }
    }

    async trackOfferPerformance(offer) {
        // Preveri ali je uporabnik konvertiral
        if (this.hasUserConverted(offer.userId, offer.strategyId, offer.deliveredAt)) {
            this.recordConversion(offer);
        }
    }

    recordConversion(offer) {
        console.log(`💰 Konverzija za ponudbo ${offer.id}!`);
        
        // Zabeleži konverzijo
        const conversion = {
            offerId: offer.id,
            userId: offer.userId,
            strategyId: offer.strategyId,
            revenue: offer.pricing.finalPrice,
            timestamp: Date.now(),
            metadata: offer.metadata
        };
        
        if (!this.conversions.has(offer.userId)) {
            this.conversions.set(offer.userId, []);
        }
        
        this.conversions.get(offer.userId).push(conversion);
        
        // Posodobi statistike
        this.stats.conversions++;
        this.stats.totalRevenue += offer.pricing.finalPrice;
        
        // Posodobi kampanjo
        const campaign = this.campaigns.get(this.getCampaignByStrategy(offer.strategyId));
        if (campaign) {
            campaign.metrics.conversions++;
            campaign.metrics.revenue += offer.pricing.finalPrice;
            campaign.metrics.conversionRate = campaign.metrics.conversions / campaign.metrics.impressions;
        }
        
        // Zabeleži interakcijo
        this.recordOfferInteraction(offer, 'CONVERTED');
        
        // Pošlji dogodek
        this.emit('offer_converted', conversion);
        this.brain.emit('upsell_conversion', conversion);
    }

    // Trigger handlers
    processTrigger(data) {
        const { userId, activityType, metadata } = data;
        
        // Preveri trigger pravila
        for (const [triggerName, rule] of this.triggerRules) {
            if (this.evaluateTriggerRule(rule, data)) {
                this.executeTrigger(triggerName, userId, data);
            }
        }
    }

    evaluateTriggerRule(rule, data) {
        try {
            // Pridobi uporabnika
            const user = this.getUserById(data.userId);
            if (!user) return false;
            
            // Evalviraj pogoj
            return rule.condition(user, data);
        } catch (error) {
            console.error("❌ Napaka pri evalvaciji trigger pravila:", error);
            return false;
        }
    }

    async executeTrigger(triggerName, userId, data) {
        console.log(`⚡ Trigger ${triggerName} aktiviran za uporabnika ${userId}`);
        
        // Preveri cooldown
        if (!this.checkTriggerCooldown(triggerName, userId)) return;
        
        // Ustvari takojšnjo ponudbo
        const candidate = await this.createCandidateProfile(this.getUserById(userId));
        const offers = await this.createTriggeredOffers(candidate, triggerName);
        
        if (offers.length > 0) {
            const optimizedOffers = await this.optimizeOfferDelivery(offers);
            await this.deliverOffers(optimizedOffers);
        }
        
        // Zabeleži trigger
        this.recordTriggerExecution(triggerName, userId);
    }

    checkTriggerCooldown(triggerName, userId) {
        const rule = this.triggerRules.get(triggerName);
        if (!rule) return false;
        
        // Implementiraj cooldown logiko
        // Placeholder - vedno vrni true
        return true;
    }

    async createTriggeredOffers(candidate, triggerName) {
        // Najdi strategije, ki uporabljajo ta trigger
        const eligibleStrategies = [];
        
        for (const [strategyId, strategy] of this.strategies) {
            if (strategy.triggers.includes(triggerName)) {
                eligibleStrategies.push(strategyId);
            }
        }
        
        // Generiraj ponudbe za eligible strategije
        const offers = [];
        for (const strategyId of eligibleStrategies) {
            const strategy = this.strategies.get(strategyId);
            for (const offerType of strategy.offerTypes) {
                const offer = await this.generateOffer(candidate, strategyId, offerType);
                if (offer) {
                    offer.triggered = true;
                    offer.triggerName = triggerName;
                    offers.push(offer);
                }
            }
        }
        
        return offers;
    }

    recordTriggerExecution(triggerName, userId) {
        // Zabeleži izvršitev trigger-ja
        console.log(`📝 Trigger ${triggerName} izvršen za ${userId}`);
    }

    processAnomalyTrigger(data) {
        // Procesiranje anomaly trigger-jev
        if (data.type === 'usage_spike' && data.severity === 'HIGH') {
            this.executeTrigger('usage_threshold', data.userId, data);
        }
    }

    processInsightTrigger(data) {
        // Procesiranje insight trigger-jev
        if (data.category === 'COMMERCIAL' && data.impact === 'HIGH') {
            // Ustvari kampanjo na podlagi insight-a
            this.createInsightBasedCampaign(data);
        }
    }

    processMilestoneTrigger(data) {
        this.executeTrigger('milestone_reached', data.userId, data);
    }

    processUsageTrigger(data) {
        this.executeTrigger('usage_threshold', data.userId, data);
    }

    // Optimization metode
    async updatePersonalization() {
        console.log("🎯 Posodabljam personalizacijo...");
        
        // Posodobi personalizacijske profile
        for (const [userId, profile] of this.userProfiles) {
            await this.updateUserPersonalizationProfile(userId);
        }
    }

    async optimizePricing() {
        console.log("💲 Optimiziram cene...");
        
        // Analiziraj performance različnih cen
        await this.analyzePricingPerformance();
        
        // Posodobi pricing modele
        if (this.pricingModel) {
            await this.pricingModel.optimize();
        }
    }

    async optimizeCampaigns() {
        console.log("📈 Optimiziram kampanje...");
        
        // Analiziraj performance kampanj
        for (const [campaignId, campaign] of this.campaigns) {
            await this.optimizeCampaign(campaign);
        }
    }

    async optimizeCampaign(campaign) {
        // Izračunaj performance metrike
        const performance = this.calculateCampaignPerformance(campaign);
        
        // Če je performance slaba, prilagodi strategijo
        if (performance.conversionRate < 0.05) {
            await this.adjustCampaignStrategy(campaign);
        }
        
        // Če je performance dobra, povečaj budget
        if (performance.conversionRate > 0.2 && performance.roi > 3) {
            campaign.settings.dailyBudget *= 1.2;
        }
    }

    calculateCampaignPerformance(campaign) {
        const metrics = campaign.metrics;
        
        return {
            conversionRate: metrics.impressions > 0 ? metrics.conversions / metrics.impressions : 0,
            roi: metrics.revenue > 0 ? metrics.revenue / (campaign.settings.dailyBudget * 30) : 0,
            avgOrderValue: metrics.conversions > 0 ? metrics.revenue / metrics.conversions : 0,
            cpa: metrics.conversions > 0 ? (campaign.settings.dailyBudget * 30) / metrics.conversions : 0
        };
    }

    async adjustCampaignStrategy(campaign) {
        // Prilagodi targeting
        campaign.targetSegments = this.optimizeTargeting(campaign);
        
        // Prilagodi offer types
        campaign.offerTypes = this.optimizeOfferTypes(campaign);
        
        console.log(`🔧 Prilagodil strategijo za kampanjo ${campaign.id}`);
    }

    optimizeTargeting(campaign) {
        // Analiziraj kateri segmenti najbolje konvertirajo
        const segmentPerformance = this.analyzeSegmentPerformance(campaign);
        
        // Vrni top performing segmente
        return segmentPerformance
            .sort((a, b) => b.conversionRate - a.conversionRate)
            .slice(0, 3)
            .map(s => s.segment);
    }

    optimizeOfferTypes(campaign) {
        // Analiziraj kateri offer tipi najbolje delujejo
        const offerPerformance = this.analyzeOfferTypePerformance(campaign);
        
        // Vrni top performing offer tipe
        return offerPerformance
            .sort((a, b) => b.conversionRate - a.conversionRate)
            .slice(0, 2)
            .map(o => o.offerType);
    }

    async analyzePerformance() {
        console.log("📊 Analiziram performance...");
        
        // Generiraj performance report
        const report = this.generatePerformanceReport();
        
        // Pošlji report
        this.emit('performance_report', report);
        this.brain.emit('upsell_performance', report);
    }

    generatePerformanceReport() {
        // Izračunaj skupne metrike
        this.stats.avgConversionRate = this.stats.offersSent > 0 ? 
            this.stats.conversions / this.stats.offersSent : 0;
        
        this.stats.avgRevenuePerUser = this.stats.conversions > 0 ? 
            this.stats.totalRevenue / this.stats.conversions : 0;
        
        return {
            period: {
                start: Date.now() - 86400000, // Zadnji dan
                end: Date.now()
            },
            metrics: this.stats,
            campaigns: this.getCampaignSummary(),
            topPerformers: this.getTopPerformingOffers(),
            insights: this.generatePerformanceInsights(),
            recommendations: this.generateRecommendations()
        };
    }

    getCampaignSummary() {
        const summary = [];
        
        for (const [campaignId, campaign] of this.campaigns) {
            summary.push({
                id: campaignId,
                name: campaign.name,
                metrics: campaign.metrics,
                performance: this.calculateCampaignPerformance(campaign),
                status: campaign.status
            });
        }
        
        return summary;
    }

    getTopPerformingOffers() {
        // Najdi top performing ponudbe
        const offers = Array.from(this.offers.values());
        
        return offers
            .filter(offer => offer.status === 'CONVERTED')
            .sort((a, b) => b.pricing.finalPrice - a.pricing.finalPrice)
            .slice(0, 10)
            .map(offer => ({
                id: offer.id,
                type: offer.offerType,
                revenue: offer.pricing.finalPrice,
                userId: offer.userId
            }));
    }

    generatePerformanceInsights() {
        const insights = [];
        
        // Conversion rate insight
        if (this.stats.avgConversionRate > 0.15) {
            insights.push({
                type: 'SUCCESS',
                message: `Odličen conversion rate: ${(this.stats.avgConversionRate * 100).toFixed(1)}%`
            });
        } else if (this.stats.avgConversionRate < 0.05) {
            insights.push({
                type: 'WARNING',
                message: `Nizek conversion rate: ${(this.stats.avgConversionRate * 100).toFixed(1)}%`
            });
        }
        
        // Revenue insight
        if (this.stats.totalRevenue > this.config.revenueTarget) {
            insights.push({
                type: 'SUCCESS',
                message: `Presežen revenue target: ${this.stats.totalRevenue}€`
            });
        }
        
        return insights;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Na podlagi performance generiraj priporočila
        if (this.stats.avgConversionRate < 0.1) {
            recommendations.push({
                priority: 'HIGH',
                action: 'Izboljšaj personalizacijo ponudb',
                reason: 'Nizek conversion rate'
            });
        }
        
        if (this.stats.avgRevenuePerUser < 30) {
            recommendations.push({
                priority: 'MEDIUM',
                action: 'Povečaj vrednost ponudb',
                reason: 'Nizek povprečni prihodek na uporabnika'
            });
        }
        
        return recommendations;
    }

    // Utility metode
    async getAllUsers() {
        // Simulacija pridobivanja uporabnikov
        const users = [];
        
        for (let i = 1; i <= 500; i++) {
            users.push({
                id: `user_${i}`,
                email: `user${i}@example.com`,
                licenseType: this.getRandomLicenseType(),
                engagementScore: Math.random(),
                churnProbability: Math.random(),
                lifetimeValue: Math.random() * 500,
                totalPoints: Math.floor(Math.random() * 1000),
                sessionsThisWeek: Math.floor(Math.random() * 20),
                usagePercentage: Math.random(),
                daysSinceLastActivity: Math.floor(Math.random() * 30),
                registrationDate: Date.now() - Math.random() * 31536000000
            });
        }
        
        return users;
    }

    getUserById(userId) {
        // Simulacija pridobivanja uporabnika
        return {
            id: userId,
            email: `${userId}@example.com`,
            licenseType: this.getRandomLicenseType(),
            engagementScore: Math.random(),
            churnProbability: Math.random(),
            lifetimeValue: Math.random() * 500,
            totalPoints: Math.floor(Math.random() * 1000),
            sessionsThisWeek: Math.floor(Math.random() * 20),
            usagePercentage: Math.random(),
            daysSinceLastActivity: Math.floor(Math.random() * 30)
        };
    }

    getRandomLicenseType() {
        const types = ['demo', 'basic', 'premium'];
        return types[Math.floor(Math.random() * types.length)];
    }

    getUserSegment(user) {
        if (user.engagementScore > 0.8 && user.sessionsThisWeek > 10) return 'power_user';
        if (user.lifetimeValue > 200) return 'high_value';
        if (user.churnProbability > 0.6) return 'at_risk';
        return 'casual_user';
    }

    analyzeUsagePatterns(behaviorProfile) {
        return {
            intensity: Math.random(),
            frequency: Math.random(),
            consistency: Math.random(),
            growth: Math.random() - 0.5
        };
    }

    analyzeFeaturePreferences(behaviorProfile) {
        return {
            analytics: Math.random(),
            automation: Math.random(),
            integrations: Math.random(),
            support: Math.random(),
            customization: Math.random()
        };
    }

    async calculatePriceSensitivity(user) {
        // Izračunaj price sensitivity na podlagi zgodovine
        if (user.lifetimeValue > 300) return 0.2; // Nizka občutljivost
        if (user.lifetimeValue < 50) return 0.8; // Visoka občutljivost
        return 0.5; // Srednja občutljivost
    }

    analyzeInteractionHistory(behaviorProfile) {
        return {
            totalInteractions: Math.floor(Math.random() * 1000),
            avgSessionDuration: Math.random() * 3600,
            bounceRate: Math.random(),
            conversionHistory: Math.random()
        };
    }

    analyzeSeasonalBehavior(user) {
        return {
            seasonality: Math.random(),
            weekdayPreference: Math.floor(Math.random() * 7),
            monthlyPattern: Math.random()
        };
    }

    analyzeDevicePreferences(behaviorProfile) {
        return {
            mobile: Math.random(),
            desktop: Math.random(),
            tablet: Math.random()
        };
    }

    analyzeTimePreferences(behaviorProfile) {
        return {
            preferredHour: Math.floor(Math.random() * 24),
            preferredDay: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][Math.floor(Math.random() * 5)],
            timezone: 'Europe/Ljubljana'
        };
    }

    analyzeCommunicationPreferences(user) {
        return {
            email: Math.random(),
            push: Math.random(),
            inApp: Math.random(),
            sms: Math.random()
        };
    }

    getLastOfferTime(userId) {
        // Najdi zadnjo ponudbo za uporabnika
        let lastTime = 0;
        
        for (const offer of this.offers.values()) {
            if (offer.userId === userId && offer.deliveredAt > lastTime) {
                lastTime = offer.deliveredAt;
            }
        }
        
        return lastTime || null;
    }

    getActiveOffersCount(userId) {
        let count = 0;
        
        for (const offer of this.offers.values()) {
            if (offer.userId === userId && 
                offer.status === 'DELIVERED' && 
                Date.now() < offer.expiresAt) {
                count++;
            }
        }
        
        return count;
    }

    hasUserConverted(userId, strategyId, afterTime = 0) {
        const userConversions = this.conversions.get(userId) || [];
        
        return userConversions.some(conversion => 
            conversion.strategyId === strategyId && 
            conversion.timestamp > afterTime
        );
    }

    getCampaignByStrategy(strategyId) {
        for (const [campaignId, campaign] of this.campaigns) {
            if (campaign.strategyId === strategyId) {
                return campaignId;
            }
        }
        return null;
    }

    async getCandidateById(userId) {
        const user = this.getUserById(userId);
        return await this.createCandidateProfile(user);
    }

    updateStatistics() {
        // Posodobi dodatne statistike
        // Implementiraj po potrebi
    }

    analyzeSegmentPerformance(campaign) {
        // Simulacija analize segment performance
        return [
            { segment: 'power_user', conversionRate: 0.25 },
            { segment: 'casual_user', conversionRate: 0.15 },
            { segment: 'at_risk', conversionRate: 0.30 },
            { segment: 'high_value', conversionRate: 0.35 }
        ];
    }

    analyzeOfferTypePerformance(campaign) {
        // Simulacija analize offer type performance
        return [
            { offerType: 'premium_upgrade', conversionRate: 0.20 },
            { offerType: 'feature_pack', conversionRate: 0.15 },
            { offerType: 'discount_offer', conversionRate: 0.25 }
        ];
    }

    async analyzePricingPerformance() {
        // Analiziraj kako različne cene vplivajo na konverzije
        console.log("💲 Analiziram pricing performance...");
    }

    async updateUserPersonalizationProfile(userId) {
        // Posodobi personalizacijski profil uporabnika
        const user = this.getUserById(userId);
        const behaviorProfile = this.behaviorAnalytics ? 
            this.behaviorAnalytics.getUserBehaviorProfile(userId) : {};
        
        const updatedProfile = await this.extractPersonalizationFactors(user, behaviorProfile);
        this.userProfiles.set(userId, updatedProfile);
    }

    async createInsightBasedCampaign(insight) {
        console.log(`💡 Ustvarjam kampanjo na podlagi insight-a: ${insight.title}`);
        
        const campaign = {
            id: `insight_campaign_${Date.now()}`,
            name: `Insight Campaign: ${insight.title}`,
            description: insight.description,
            status: 'ACTIVE',
            source: 'INSIGHT',
            insight: insight,
            targetSegments: insight.targetSegments || ['all'],
            metrics: {
                impressions: 0,
                clicks: 0,
                conversions: 0,
                revenue: 0
            },
            createdAt: Date.now()
        };
        
        this.campaigns.set(campaign.id, campaign);
        this.stats.campaignsCreated++;
    }

    getStatus() {
        return {
            status: this.status,
            version: this.version,
            stats: this.stats,
            activeCampaigns: this.campaigns.size,
            activeOffers: Array.from(this.offers.values()).filter(o => o.status === 'DELIVERED').length,
            runningTests: this.stats.testsRunning
        };
    }

    async shutdown() {
        console.log("🛑 Zaustavlja Personalized Upsell System...");
        
        // Ustavi intervale
        if (this.processingInterval) clearInterval(this.processingInterval);
        if (this.personalizationInterval) clearInterval(this.personalizationInterval);
        if (this.pricingInterval) clearInterval(this.pricingInterval);
        if (this.campaignInterval) clearInterval(this.campaignInterval);
        if (this.analysisInterval) clearInterval(this.analysisInterval);
        
        this.status = "STOPPED";
        console.log("✅ Personalized Upsell System zaustavljen");
    }
}

// AI Model Classes
class PersonalizationAIModel {
    constructor() {
        this.model = null;
        this.features = [];
    }

    async initialize() {
        console.log("🤖 Inicializacija Personalization AI Model...");
        // Simulacija nalaganja modela
        this.model = { loaded: true, accuracy: 0.85 };
    }

    async personalize(template, personalizationData) {
        // AI personalizacija vsebine
        return {
            title: this.personalizeWithAI(template.title, personalizationData),
            description: this.personalizeWithAI(template.description, personalizationData),
            benefits: template.benefits.map(b => this.personalizeWithAI(b, personalizationData)),
            callToAction: this.personalizeWithAI(template.callToAction, personalizationData)
        };
    }

    personalizeWithAI(text, data) {
        // Simulacija AI personalizacije
        if (data.user_segment === 'power_user') {
            return `Pro ${text}`;
        }
        return text;
    }
}

class DynamicPricingModel {
    constructor() {
        this.model = null;
        this.priceHistory = new Map();
    }

    async initialize() {
        console.log("💲 Inicializacija Dynamic Pricing Model...");
        this.model = { loaded: true, accuracy: 0.78 };
    }

    async optimize(template, personalizationData) {
        const basePrice = template.basePrice;
        const sensitivity = personalizationData.price_sensitivity || 0.5;
        
        // AI optimizacija cene
        const discount = this.calculateOptimalDiscount(sensitivity, personalizationData);
        const finalPrice = basePrice * (1 - discount);
        
        return {
            basePrice: basePrice,
            discount: discount,
            finalPrice: Math.round(finalPrice * 100) / 100,
            currency: 'EUR',
            confidence: 0.85
        };
    }

    calculateOptimalDiscount(sensitivity, data) {
        // Kompleksnejša logika za optimalen popust
        let discount = sensitivity * 0.3;
        
        if (data.churn_risk > 0.6) discount += 0.1;
        if (data.engagement_level > 0.8) discount -= 0.05;
        
        return Math.max(0, Math.min(0.5, discount));
    }
}

class OptimalTimingModel {
    async initialize() {
        console.log("⏰ Inicializacija Optimal Timing Model...");
    }

    async optimize(personalizationData) {
        return {
            preferredHour: personalizationData.time_preferences?.preferredHour || 14,
            preferredDay: personalizationData.time_preferences?.preferredDay || 'tuesday',
            urgency: this.calculateUrgency(personalizationData),
            deliveryDelay: this.calculateDelay(personalizationData)
        };
    }

    calculateUrgency(data) {
        if (data.churn_risk > 0.6) return 'HIGH';
        if (data.engagement_level > 0.8) return 'MEDIUM';
        return 'LOW';
    }

    calculateDelay(data) {
        const urgency = this.calculateUrgency(data);
        switch (urgency) {
            case 'HIGH': return 0;
            case 'MEDIUM': return 3600000;
            default: return 86400000;
        }
    }
}

class ChannelSelectionModel {
    async initialize() {
        console.log("📱 Inicializacija Channel Selection Model...");
    }

    async select(offer) {
        // AI izbira optimalnega kanala
        const preferences = offer.metadata?.personalizationFactors?.communication_preferences || {};
        
        if (preferences.email > 0.7) return 'email';
        if (preferences.push > 0.7) return 'push_notification';
        if (preferences.inApp > 0.7) return 'in_app';
        
        return 'email';
    }
}

class ContentOptimizationModel {
    async initialize() {
        console.log("📝 Inicializacija Content Optimization Model...");
    }

    async personalize(template, personalizationData) {
        // AI optimizacija vsebine
        return {
            title: this.optimizeTitle(template.title, personalizationData),
            description: this.optimizeDescription(template.description, personalizationData),
            benefits: this.optimizeBenefits(template.benefits, personalizationData),
            callToAction: this.optimizeCTA(template.callToAction, personalizationData)
        };
    }

    optimizeTitle(title, data) {
        if (data.user_segment === 'power_user') return `Pro ${title}`;
        if (data.user_segment === 'high_value') return `Ekskluzivna ${title}`;
        return title;
    }

    optimizeDescription(description, data) {
        if (data.feature_preferences?.analytics > 0.7) {
            return `${description} z naprednimi analitičnimi orodji`;
        }
        return description;
    }

    optimizeBenefits(benefits, data) {
        return benefits.sort((a, b) => {
            const scoreA = this.calculateBenefitScore(a, data);
            const scoreB = this.calculateBenefitScore(b, data);
            return scoreB - scoreA;
        });
    }

    calculateBenefitScore(benefit, data) {
        let score = 0;
        if (benefit.includes('analitika') && data.feature_preferences?.analytics > 0.5) score += 0.3;
        if (benefit.includes('avtomatizacija') && data.feature_preferences?.automation > 0.5) score += 0.3;
        return score;
    }

    optimizeCTA(cta, data) {
        if (data.price_sensitivity > 0.7) return `${cta} - Omejena ponudba!`;
        return cta;
    }
}

// Engine Classes
class CampaignEngine {
    constructor(upsellSystem) {
        this.system = upsellSystem;
    }
}

class PersonalizationEngine {
    constructor(upsellSystem) {
        this.system = upsellSystem;
    }
}

class PricingEngine {
    constructor(upsellSystem) {
        this.system = upsellSystem;
    }
}

class ABTestingEngine {
    constructor(upsellSystem) {
        this.system = upsellSystem;
    }
}

class TriggerEngine {
    constructor(upsellSystem) {
        this.system = upsellSystem;
    }
}

class LoyaltyEngine {
    constructor(upsellSystem) {
        this.system = upsellSystem;
    }

    async initialize() {
        console.log("🏆 Inicializacija Loyalty Engine...");
    }
}

module.exports = PersonalizedUpsellSystem;