// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 API GLOBAL MANAGER - OMNI Ultra Brain Component
// ═══════════════════════════════════════════════════════════════════════════════
// Odkrivanje, povezovanje in upravljanje vseh globalnih API-jev
// Podpira vse protokole, avtentifikacijo in optimizacijo

class APIGlobalManager {
    constructor(config = {}) {
        this.config = {
            discoverGlobalAPIs: config.discoverGlobalAPIs || true,
            autoAuthentication: config.autoAuthentication || true,
            rateLimitOptimization: config.rateLimitOptimization || true,
            cacheEnabled: config.cacheEnabled || true,
            maxConcurrentRequests: config.maxConcurrentRequests || 10000,
            globalTimeout: config.globalTimeout || 30000,
            retryAttempts: config.retryAttempts || 5,
            ...config
        };

        this.apis = new Map();
        this.categories = new Map();
        this.rateLimits = new Map();
        this.cache = new Map();
        this.statistics = {
            totalAPIs: 0,
            activeConnections: 0,
            requestsPerSecond: 0,
            successRate: 0,
            averageResponseTime: 0,
            dataTransferred: 0
        };

        this.initializeGlobalAPIs();
        this.startDiscovery();
        this.startOptimization();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔍 GLOBALNO ODKRIVANJE API-JEV
    // ═══════════════════════════════════════════════════════════════════════════════

    async initializeGlobalAPIs() {
        console.log("🌐 Inicializiram globalne API-je...");

        // Finančni API-ji
        await this.registerAPICategory("Finance", [
            { name: "Yahoo Finance", url: "https://query1.finance.yahoo.com", type: "REST" },
            { name: "Alpha Vantage", url: "https://www.alphavantage.co/query", type: "REST" },
            { name: "CoinGecko", url: "https://api.coingecko.com/api/v3", type: "REST" },
            { name: "Binance", url: "https://api.binance.com/api/v3", type: "REST" },
            { name: "Forex", url: "https://api.fixer.io/v1", type: "REST" },
            { name: "World Bank", url: "https://api.worldbank.org/v2", type: "REST" }
        ]);

        // Turistični API-ji
        await this.registerAPICategory("Tourism", [
            { name: "Booking.com", url: "https://distribution-xml.booking.com", type: "XML" },
            { name: "Amadeus Travel", url: "https://api.amadeus.com/v2", type: "REST" },
            { name: "Skyscanner", url: "https://partners.api.skyscanner.net", type: "REST" },
            { name: "TripAdvisor", url: "https://api.tripadvisor.com/api", type: "REST" },
            { name: "Google Places", url: "https://maps.googleapis.com/maps/api/place", type: "REST" },
            { name: "OpenWeather", url: "https://api.openweathermap.org/data/2.5", type: "REST" }
        ]);

        // DevOps API-ji
        await this.registerAPICategory("DevOps", [
            { name: "GitHub", url: "https://api.github.com", type: "REST" },
            { name: "GitLab", url: "https://gitlab.com/api/v4", type: "REST" },
            { name: "Docker Hub", url: "https://hub.docker.com/v2", type: "REST" },
            { name: "Kubernetes", url: "https://kubernetes.io/api", type: "REST" },
            { name: "AWS", url: "https://aws.amazon.com/api", type: "REST" },
            { name: "Azure", url: "https://management.azure.com", type: "REST" },
            { name: "Google Cloud", url: "https://cloud.google.com/apis", type: "REST" }
        ]);

        // Zdravstveni API-ji
        await this.registerAPICategory("Healthcare", [
            { name: "FHIR", url: "https://www.hl7.org/fhir", type: "REST" },
            { name: "OpenFDA", url: "https://api.fda.gov", type: "REST" },
            { name: "WHO", url: "https://apps.who.int/gho/athena/api", type: "REST" },
            { name: "PubMed", url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils", type: "REST" },
            { name: "Drug Bank", url: "https://go.drugbank.com/api", type: "REST" }
        ]);

        // IoT in Radio API-ji
        await this.registerAPICategory("IoT_Radio", [
            { name: "ThingSpeak", url: "https://api.thingspeak.com", type: "REST" },
            { name: "Arduino Cloud", url: "https://api2.arduino.cc", type: "REST" },
            { name: "RadioLabs", url: "https://www.radiolabs.com/api", type: "REST" },
            { name: "Sigfox", url: "https://backend.sigfox.com/api", type: "REST" },
            { name: "LoRaWAN", url: "https://www.thethingsnetwork.org/api", type: "REST" }
        ]);

        // Gostinski API-ji
        await this.registerAPICategory("Hospitality", [
            { name: "Zomato", url: "https://developers.zomato.com/api/v2.1", type: "REST" },
            { name: "Yelp", url: "https://api.yelp.com/v3", type: "REST" },
            { name: "OpenTable", url: "https://platform.otrestaurant.com", type: "REST" },
            { name: "Uber Eats", url: "https://api.uber.com/v1/eats", type: "REST" },
            { name: "Deliveroo", url: "https://api.deliveroo.com", type: "REST" }
        ]);

        // Čebelarski API-ji
        await this.registerAPICategory("Beekeeping", [
            { name: "HiveTracks", url: "https://www.hivetracks.com/api", type: "REST" },
            { name: "Bee Alert", url: "https://beealert.org/api", type: "REST" },
            { name: "Pollinator Partnership", url: "https://www.pollinator.org/api", type: "REST" },
            { name: "Weather Underground", url: "https://api.weather.com/v1", type: "REST" }
        ]);

        // Globalni API-ji
        await this.registerAPICategory("Global", [
            { name: "Google APIs", url: "https://www.googleapis.com", type: "REST" },
            { name: "Microsoft Graph", url: "https://graph.microsoft.com/v1.0", type: "REST" },
            { name: "Facebook Graph", url: "https://graph.facebook.com", type: "REST" },
            { name: "Twitter API", url: "https://api.twitter.com/2", type: "REST" },
            { name: "LinkedIn", url: "https://api.linkedin.com/v2", type: "REST" },
            { name: "Slack", url: "https://slack.com/api", type: "REST" },
            { name: "Telegram Bot", url: "https://api.telegram.org/bot", type: "REST" },
            { name: "WhatsApp Business", url: "https://graph.facebook.com/v17.0", type: "REST" }
        ]);

        console.log(`✅ Inicializiranih ${this.statistics.totalAPIs} globalnih API-jev`);
    }

    async registerAPICategory(category, apis) {
        this.categories.set(category, apis);
        
        for (const api of apis) {
            const apiId = `${category}_${api.name}`;
            await this.registerAPI(apiId, api);
        }
    }

    async registerAPI(id, apiConfig) {
        const api = {
            id,
            name: apiConfig.name,
            url: apiConfig.url,
            type: apiConfig.type || "REST",
            status: "discovered",
            lastCheck: new Date(),
            responseTime: 0,
            successRate: 100,
            rateLimits: apiConfig.rateLimits || {},
            authentication: apiConfig.authentication || {},
            endpoints: apiConfig.endpoints || [],
            documentation: apiConfig.documentation || "",
            version: apiConfig.version || "latest",
            region: apiConfig.region || "global",
            priority: apiConfig.priority || "medium"
        };

        this.apis.set(id, api);
        this.statistics.totalAPIs++;

        // Avtomatsko testiranje dostopnosti
        if (this.config.discoverGlobalAPIs) {
            await this.testAPIConnection(id);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔗 POVEZOVANJE IN AVTENTIFIKACIJA
    // ═══════════════════════════════════════════════════════════════════════════════

    async connectAPI(apiId, credentials = {}) {
        const api = this.apis.get(apiId);
        if (!api) {
            throw new Error(`API ${apiId} ni najden`);
        }

        try {
            console.log(`🔗 Povezujem z API: ${api.name}`);

            // Avtentifikacija
            if (this.config.autoAuthentication) {
                await this.authenticateAPI(apiId, credentials);
            }

            // Test povezave
            const connectionTest = await this.testAPIConnection(apiId);
            
            if (connectionTest.success) {
                api.status = "connected";
                api.lastConnected = new Date();
                this.statistics.activeConnections++;
                
                console.log(`✅ Uspešno povezan z ${api.name}`);
                return { success: true, api: api };
            } else {
                throw new Error(connectionTest.error);
            }

        } catch (error) {
            console.error(`❌ Napaka pri povezovanju z ${api.name}:`, error.message);
            api.status = "error";
            api.lastError = error.message;
            return { success: false, error: error.message };
        }
    }

    async authenticateAPI(apiId, credentials) {
        const api = this.apis.get(apiId);
        
        // Različni tipi avtentifikacije
        switch (api.authentication.type) {
            case "api_key":
                api.headers = { 
                    ...api.headers, 
                    "Authorization": `Bearer ${credentials.apiKey}` 
                };
                break;
                
            case "oauth2":
                const token = await this.getOAuth2Token(api, credentials);
                api.headers = { 
                    ...api.headers, 
                    "Authorization": `Bearer ${token}` 
                };
                break;
                
            case "basic":
                const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
                api.headers = { 
                    ...api.headers, 
                    "Authorization": `Basic ${auth}` 
                };
                break;
                
            default:
                // Brez avtentifikacije
                break;
        }
    }

    async testAPIConnection(apiId) {
        const api = this.apis.get(apiId);
        const startTime = Date.now();

        try {
            // Simulacija HTTP zahteve
            const response = await this.simulateRequest(api.url, {
                method: "GET",
                headers: api.headers || {},
                timeout: this.config.globalTimeout
            });

            const responseTime = Date.now() - startTime;
            api.responseTime = responseTime;
            api.lastCheck = new Date();

            return {
                success: true,
                responseTime,
                status: response.status || 200
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📡 IZVAJANJE ZAHTEV IN OPTIMIZACIJA
    // ═══════════════════════════════════════════════════════════════════════════════

    async executeRequest(apiId, endpoint, options = {}) {
        const api = this.apis.get(apiId);
        if (!api || api.status !== "connected") {
            throw new Error(`API ${apiId} ni povezan`);
        }

        // Preveri rate limits
        if (this.config.rateLimitOptimization) {
            await this.checkRateLimit(apiId);
        }

        // Preveri cache
        const cacheKey = `${apiId}_${endpoint}_${JSON.stringify(options)}`;
        if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minut
                return cached.data;
            }
        }

        try {
            const url = `${api.url}${endpoint}`;
            const requestOptions = {
                method: options.method || "GET",
                headers: { ...api.headers, ...options.headers },
                body: options.body ? JSON.stringify(options.body) : undefined,
                timeout: options.timeout || this.config.globalTimeout
            };

            const startTime = Date.now();
            const response = await this.simulateRequest(url, requestOptions);
            const responseTime = Date.now() - startTime;

            // Posodobi statistike
            this.updateStatistics(apiId, responseTime, true);

            // Shrani v cache
            if (this.config.cacheEnabled && options.method !== "POST") {
                this.cache.set(cacheKey, {
                    data: response.data,
                    timestamp: Date.now()
                });
            }

            return response.data;

        } catch (error) {
            this.updateStatistics(apiId, 0, false);
            
            // Retry logika
            if (options.retry !== false && this.config.retryAttempts > 0) {
                await this.sleep(1000); // Počakaj 1 sekundo
                return this.executeRequest(apiId, endpoint, { 
                    ...options, 
                    retry: false 
                });
            }
            
            throw error;
        }
    }

    async executeBatchRequests(requests) {
        const results = [];
        const chunks = this.chunkArray(requests, this.config.maxConcurrentRequests);

        for (const chunk of chunks) {
            const chunkPromises = chunk.map(async (request) => {
                try {
                    const result = await this.executeRequest(
                        request.apiId, 
                        request.endpoint, 
                        request.options
                    );
                    return { success: true, data: result, request };
                } catch (error) {
                    return { success: false, error: error.message, request };
                }
            });

            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 OPTIMIZACIJA IN MONITORING
    // ═══════════════════════════════════════════════════════════════════════════════

    startOptimization() {
        setInterval(() => {
            this.optimizeConnections();
            this.cleanupCache();
            this.updateGlobalStatistics();
        }, 60000); // Vsako minuto
    }

    async optimizeConnections() {
        for (const [apiId, api] of this.apis) {
            // Preveri zdravje API-ja
            if (Date.now() - api.lastCheck > 300000) { // 5 minut
                await this.testAPIConnection(apiId);
            }

            // Optimiziraj rate limits
            if (api.successRate < 90) {
                await this.adjustRateLimit(apiId);
            }

            // Ponovno poveži neaktivne API-je
            if (api.status === "error" && Date.now() - api.lastCheck > 600000) { // 10 minut
                await this.connectAPI(apiId);
            }
        }
    }

    async checkRateLimit(apiId) {
        const limit = this.rateLimits.get(apiId);
        if (!limit) return;

        const now = Date.now();
        const windowStart = now - limit.window;
        
        // Odstrani stare zahteve
        limit.requests = limit.requests.filter(time => time > windowStart);
        
        // Preveri limit
        if (limit.requests.length >= limit.maxRequests) {
            const waitTime = limit.requests[0] + limit.window - now;
            await this.sleep(waitTime);
        }
        
        limit.requests.push(now);
    }

    startDiscovery() {
        setInterval(() => {
            this.discoverNewAPIs();
        }, 3600000); // Vsako uro
    }

    async discoverNewAPIs() {
        console.log("🔍 Iščem nove globalne API-je...");
        
        // Simulacija odkrivanja novih API-jev
        const potentialAPIs = [
            "https://api.newservice.com",
            "https://api.emergingtech.io",
            "https://api.innovation.net"
        ];

        for (const url of potentialAPIs) {
            try {
                const response = await this.simulateRequest(url);
                if (response.status === 200) {
                    await this.registerAPI(`discovered_${Date.now()}`, {
                        name: `Discovered API`,
                        url: url,
                        type: "REST"
                    });
                }
            } catch (error) {
                // API ni dostopen
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 STATISTIKE IN POROČILA
    // ═══════════════════════════════════════════════════════════════════════════════

    updateStatistics(apiId, responseTime, success) {
        const api = this.apis.get(apiId);
        
        // Posodobi API statistike
        if (success) {
            api.successRate = (api.successRate * 0.9) + (100 * 0.1);
        } else {
            api.successRate = (api.successRate * 0.9) + (0 * 0.1);
        }
        
        api.responseTime = (api.responseTime * 0.8) + (responseTime * 0.2);
    }

    updateGlobalStatistics() {
        let totalResponseTime = 0;
        let totalSuccessRate = 0;
        let activeConnections = 0;

        for (const api of this.apis.values()) {
            if (api.status === "connected") {
                activeConnections++;
                totalResponseTime += api.responseTime;
                totalSuccessRate += api.successRate;
            }
        }

        this.statistics.activeConnections = activeConnections;
        this.statistics.averageResponseTime = activeConnections > 0 ? 
            totalResponseTime / activeConnections : 0;
        this.statistics.successRate = activeConnections > 0 ? 
            totalSuccessRate / activeConnections : 0;
    }

    getGlobalStatistics() {
        return {
            ...this.statistics,
            apisByCategory: this.getAPIsByCategory(),
            topPerformingAPIs: this.getTopPerformingAPIs(),
            systemHealth: this.getSystemHealth()
        };
    }

    getAPIsByCategory() {
        const categories = {};
        for (const [category, apis] of this.categories) {
            categories[category] = {
                total: apis.length,
                connected: apis.filter(api => {
                    const fullApi = this.apis.get(`${category}_${api.name}`);
                    return fullApi && fullApi.status === "connected";
                }).length
            };
        }
        return categories;
    }

    getTopPerformingAPIs() {
        return Array.from(this.apis.values())
            .filter(api => api.status === "connected")
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 10)
            .map(api => ({
                name: api.name,
                successRate: api.successRate,
                responseTime: api.responseTime
            }));
    }

    getSystemHealth() {
        const totalAPIs = this.apis.size;
        const connectedAPIs = Array.from(this.apis.values())
            .filter(api => api.status === "connected").length;
        
        return {
            overallHealth: (connectedAPIs / totalAPIs) * 100,
            status: connectedAPIs / totalAPIs > 0.8 ? "excellent" : 
                   connectedAPIs / totalAPIs > 0.6 ? "good" : 
                   connectedAPIs / totalAPIs > 0.4 ? "fair" : "poor"
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🛠️ POMOŽNE FUNKCIJE
    // ═══════════════════════════════════════════════════════════════════════════════

    async simulateRequest(url, options = {}) {
        // Simulacija HTTP zahteve
        await this.sleep(Math.random() * 100 + 50); // 50-150ms
        
        return {
            status: 200,
            data: {
                message: "Simuliran odgovor",
                timestamp: new Date().toISOString(),
                url: url
            }
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.cache) {
            if (now - value.timestamp > 1800000) { // 30 minut
                this.cache.delete(key);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎮 JAVNI VMESNIK
    // ═══════════════════════════════════════════════════════════════════════════════

    async getAllAPIs() {
        return Array.from(this.apis.values());
    }

    async getAPIsByCategory(category) {
        return Array.from(this.apis.values())
            .filter(api => api.id.startsWith(category));
    }

    async searchAPIs(query) {
        return Array.from(this.apis.values())
            .filter(api => 
                api.name.toLowerCase().includes(query.toLowerCase()) ||
                api.url.toLowerCase().includes(query.toLowerCase())
            );
    }

    async getAPIStatus(apiId) {
        const api = this.apis.get(apiId);
        return api ? {
            id: api.id,
            name: api.name,
            status: api.status,
            responseTime: api.responseTime,
            successRate: api.successRate,
            lastCheck: api.lastCheck
        } : null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIGlobalManager;
} else if (typeof window !== 'undefined') {
    window.APIGlobalManager = APIGlobalManager;
}

console.log("🌐 API Global Manager pripravljen za globalno povezovanje!");