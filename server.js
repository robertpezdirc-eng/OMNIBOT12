const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const http = require('http');
const WebSocket = require('ws');

console.log('🔄 Starting server...');

// Import services with error handling
let knowledgeService = null;
let mobileAppService = null;

try {
    knowledgeService = require('./services/knowledgeService');
    console.log('✅ Knowledge service loaded');
} catch (error) {
    console.error('❌ Failed to load knowledge service:', error.message);
}

// Initialize mobile app integration
try {
    const MobileAppIntegration = require('./mobile-app-integration');
    mobileAppService = new MobileAppIntegration();
    console.log('✅ Mobile App Integration Service initialized');
} catch (error) {
    console.error('❌ Failed to initialize Mobile App Integration:', error.message);
}

// Initialize system lock for security
try {
    const SystemLock = require('./system-lock');
    const systemLock = new SystemLock();
    console.log('🔒 System Lock activated for security');
} catch (error) {
    console.error('❌ Failed to initialize System Lock:', error.message);
}

// Initialize Executable Actions System
try {
    const ExecutableActions = require('./executable-actions.js');
    global.executableActions = new ExecutableActions();
    console.log('🎯 Executable Actions System activated successfully');
} catch (error) {
    console.error('❌ Failed to initialize Executable Actions:', error.message);
}

// Initialize Advanced Learning Integration System
let advancedLearningSystem = null;
try {
    const { AdvancedLearningIntegration } = require('./advanced-learning-integration');
    advancedLearningSystem = new AdvancedLearningIntegration();
    console.log('🧠 Advanced Learning Integration System activated successfully');
} catch (error) {
    console.error('❌ Failed to initialize Advanced Learning Integration:', error.message);
}

// Initialize Cloud Learning System
let cloudLearningManager = null;
let cloudLearningAPI = null;
try {
    const { CloudLearningManager } = require('./cloud-learning-manager');
    const CloudLearningAPI = require('./cloud-learning-api');
    
    cloudLearningManager = new CloudLearningManager();
    cloudLearningAPI = new CloudLearningAPI(cloudLearningManager, advancedLearningIntegration);
    
    console.log('☁️ Cloud Learning Manager initialized successfully');
    console.log('🌐 Cloud Learning API initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize Cloud Learning System:', error.message);
}

// OpenAI configuration (če je na voljo)
let openai = null;
try {
    const { OpenAI } = require('openai');
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI konfiguriran');
    } else {
        console.log('⚠️ OPENAI_API_KEY ni nastavljen - uporabljam mock odgovore');
    }
} catch (error) {
    console.log('⚠️ OpenAI ni na voljo - uporabljam mock odgovore');
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

// Real-world knowledge gathering APIs
const SEARCH_APIS = {
    duckduckgo: 'https://api.duckduckgo.com/',
    wikipedia: 'https://en.wikipedia.org/api/rest_v1/',
    news: 'https://newsapi.org/v2/',
    weather: 'https://api.openweathermap.org/data/2.5/',
    stocks: 'https://api.polygon.io/v2/',
    arxiv: 'http://export.arxiv.org/api/query',
    reddit: 'https://www.reddit.com/r/all/search.json',
    github: 'https://api.github.com/search/',
    youtube: 'https://www.googleapis.com/youtube/v3/search'
};

// Knowledge sources configuration
const KNOWLEDGE_SOURCES = [
    { name: 'Wikipedia', url: 'https://en.wikipedia.org', priority: 'high', type: 'encyclopedia' },
    { name: 'ArXiv', url: 'https://arxiv.org', priority: 'high', type: 'scientific' },
    { name: 'Reuters', url: 'https://reuters.com', priority: 'high', type: 'news' },
    { name: 'BBC News', url: 'https://bbc.com/news', priority: 'high', type: 'news' },
    { name: 'Nature', url: 'https://nature.com', priority: 'high', type: 'scientific' },
    { name: 'MIT Technology Review', url: 'https://technologyreview.com', priority: 'medium', type: 'technology' },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com', priority: 'medium', type: 'technical' },
    { name: 'GitHub', url: 'https://github.com', priority: 'medium', type: 'code' },
    { name: 'Medium', url: 'https://medium.com', priority: 'low', type: 'articles' },
    { name: 'Reddit', url: 'https://reddit.com', priority: 'low', type: 'community' }
];

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Serve static files from current directory
app.use(express.static(__dirname));

// Initialize knowledge base
if (knowledgeService) {
    knowledgeService.loadInitialData().then(() => {
        console.log('📚 Knowledge base initialized');
    }).catch(error => {
        console.error('❌ Failed to initialize knowledge base:', error);
    });
}

// API endpoint za generiranje
app.post('/generate', async (req, res) => {
    const { prompt } = req.body;
    
    console.log('📥 Prejel generate zahtevo:', prompt);
    
    if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
    }

    try {
        let response;
        if (openai) {
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500
            });
            response = completion.choices[0].message.content;
        } else {
            response = generateMockResponse(prompt);
        }
        
        console.log('✅ Odgovor poslan');
        res.json({ 
            response: response,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Napaka pri generiranju:', error);
        res.status(500).json({ 
            error: "Failed to generate response",
            details: error.message 
        });
    }
});

function generateMockResponse(prompt) {
    const responses = [
        `Lokalni odgovor za "${prompt}": To je odgovor iz lokalne baze znanja.`,
        `Analiza: Obdelavam vaš prompt "${prompt}" in generiram ustrezen odgovor.`,
        `Osnovni odgovor: Za prompt "${prompt}" sistem generira relevanten in koristen odgovor iz razpoložljivih virov.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Knowledge API endpoints
app.get('/api/knowledge', (req, res) => {
    try {
        if (!knowledgeService) {
            return res.status(503).json({ error: 'Knowledge service not available' });
        }
        const categories = knowledgeService.getCategories();
        res.json({
            success: true,
            categories: categories,
            total: categories.length
        });
    } catch (error) {
        console.error('Error getting knowledge categories:', error);
        res.status(500).json({ error: 'Failed to get knowledge categories' });
    }
});

app.get('/api/knowledge/:category', (req, res) => {
    try {
        if (!knowledgeService) {
            return res.status(503).json({ error: 'Knowledge service not available' });
        }
        const { category } = req.params;
        const knowledge = knowledgeService.getKnowledgeByCategory(category);
        
        if (!knowledge) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.json({
            success: true,
            category: category,
            data: knowledge
        });
    } catch (error) {
        console.error('Error getting knowledge by category:', error);
        res.status(500).json({ error: 'Failed to get knowledge data' });
    }
});

app.get('/api/knowledge/:category/prompts', (req, res) => {
    try {
        if (!knowledgeService) {
            return res.status(503).json({ error: 'Knowledge service not available' });
        }
        const { category } = req.params;
        const prompts = knowledgeService.generateContextualPrompts(category);
        res.json({
            success: true,
            category: category,
            prompts: prompts
        });
    } catch (error) {
        console.error('Error generating prompts:', error);
        res.status(500).json({ error: 'Failed to generate prompts' });
    }
});

// Advanced AI Knowledge Integration System
const aiKnowledgeSources = {
    // Real-time global information sources
    realTimeAPIs: [
        'https://api.openweathermap.org/data/2.5/weather',
        'https://newsapi.org/v2/top-headlines',
        'https://api.exchangerate-api.com/v4/latest/USD',
        'https://api.coingecko.com/api/v3/simple/price',
        'https://api.github.com/search/repositories',
        'https://api.stackexchange.com/2.3/search/advanced'
    ],
    
    // Knowledge databases
    knowledgeBases: [
        'https://en.wikipedia.org/api/rest_v1/page/summary/',
        'https://api.arxiv.org/query',
        'https://api.semanticscholar.org/graph/v1/paper/search',
        'https://api.crossref.org/works',
        'https://www.googleapis.com/books/v1/volumes'
    ],
    
    // Social and trend data
    socialAPIs: [
        'https://api.reddit.com/r/all/hot.json',
        'https://trends.google.com/trends/api/explore',
        'https://api.twitter.com/2/tweets/search/recent'
    ]
};

// Enhanced search with global AI capabilities
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json({ error: 'Query parameter is required' });
        }

        console.log(`🔍 Advanced AI Search: "${query}"`);
        
        // Parallel search across multiple global sources
        const searchPromises = [
            searchWikipedia(query),
            searchArxiv(query),
            searchGitHub(query),
            searchNews(query),
            searchBooks(query),
            searchReddit(query),
            searchStackOverflow(query),
            searchSemanticScholar(query),
            searchRealTimeData(query),
            searchTrends(query)
        ];

        const results = await Promise.allSettled(searchPromises);
        
        // Process and categorize results
        const processedResults = {
            web: [],
            knowledge: [],
            aiTools: [],
            appsServices: [],
            realTime: [],
            social: [],
            academic: [],
            code: [],
            news: [],
            trends: []
        };

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                const sourceType = getSourceType(index);
                processedResults[sourceType] = processedResults[sourceType] || [];
                processedResults[sourceType].push(...result.value);
            }
        });

        // AI-powered result synthesis and ranking
        const synthesizedResults = await synthesizeResults(processedResults, query);
        
        // Add global context and real-time information
        const contextualResults = await addGlobalContext(synthesizedResults, query);
        
        res.json({
            query,
            totalResults: Object.values(contextualResults).flat().length,
            categories: contextualResults,
            synthesis: await generateAISynthesis(contextualResults, query),
            globalContext: await getGlobalContext(query),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Advanced search error:', error);
        res.status(500).json({ error: 'Advanced search failed', details: error.message });
    }
});

// Real-time global data search
async function searchRealTimeData(query) {
    const results = [];
    
    try {
        // Weather data if location-related
        if (query.toLowerCase().includes('weather') || query.toLowerCase().includes('temperature')) {
            const weatherData = await fetchWeatherData(query);
            if (weatherData) results.push(weatherData);
        }
        
        // Financial data if finance-related
        if (query.toLowerCase().match(/price|stock|crypto|currency|exchange/)) {
            const financeData = await fetchFinanceData(query);
            if (financeData) results.push(...financeData);
        }
        
        // Current events and news
        const newsData = await fetchCurrentNews(query);
        if (newsData) results.push(...newsData);
        
    } catch (error) {
        console.error('Real-time data search error:', error);
    }
    
    return results;
}

// Advanced Wikipedia search with multiple languages
async function searchWikipedia(query) {
    const languages = ['en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh', 'ja', 'ar'];
    const results = [];
    
    for (const lang of languages.slice(0, 3)) { // Search top 3 languages
        try {
            const response = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                results.push({
                    title: data.title,
                    description: data.extract,
                    url: data.content_urls?.desktop?.page,
                    source: `Wikipedia (${lang.toUpperCase()})`,
                    type: 'knowledge',
                    language: lang,
                    thumbnail: data.thumbnail?.source
                });
            }
        } catch (error) {
            console.error(`Wikipedia search error (${lang}):`, error);
        }
    }
    
    return results;
}

// Enhanced ArXiv search for academic papers
async function searchArxiv(query) {
    try {
        const response = await fetch(`http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=10`);
        const xmlText = await response.text();
        
        // Parse XML response (simplified)
        const results = [];
        const entries = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || [];
        
        entries.forEach(entry => {
            const title = entry.match(/<title>(.*?)<\/title>/)?.[1];
            const summary = entry.match(/<summary>(.*?)<\/summary>/)?.[1];
            const link = entry.match(/<id>(.*?)<\/id>/)?.[1];
            
            if (title && summary) {
                results.push({
                    title: title.trim(),
                    description: summary.trim().substring(0, 200) + '...',
                    url: link,
                    source: 'ArXiv',
                    type: 'academic'
                });
            }
        });
        
        return results;
    } catch (error) {
        console.error('ArXiv search error:', error);
        return [];
    }
}

// Enhanced GitHub search
async function searchGitHub(query) {
    try {
        const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`);
        const data = await response.json();
        
        return data.items?.map(item => ({
            title: item.full_name,
            description: item.description || 'No description available',
            url: item.html_url,
            source: 'GitHub',
            type: 'code',
            stars: item.stargazers_count,
            language: item.language,
            updated: item.updated_at
        })) || [];
    } catch (error) {
        console.error('GitHub search error:', error);
        return [];
    }
}

// News search function
async function searchNews(query) {
    // This would require a news API key
    // For demo purposes, returning mock data
    return [
        {
            title: `Latest news about ${query}`,
            description: 'Recent developments and updates from global news sources',
            url: '#',
            source: 'Global News',
            type: 'news',
            publishedAt: new Date().toISOString()
        }
    ];
}

// Books search function
async function searchBooks(query) {
    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`);
        const data = await response.json();
        
        return data.items?.map(item => ({
            title: item.volumeInfo.title,
            description: item.volumeInfo.description?.substring(0, 200) + '...' || 'No description available',
            url: item.volumeInfo.infoLink,
            source: 'Google Books',
            type: 'knowledge',
            authors: item.volumeInfo.authors?.join(', '),
            publishedDate: item.volumeInfo.publishedDate,
            thumbnail: item.volumeInfo.imageLinks?.thumbnail
        })) || [];
    } catch (error) {
        console.error('Books search error:', error);
        return [];
    }
}

// Reddit search function
async function searchReddit(query) {
    try {
        const response = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        
        return data.data?.children?.map(item => ({
            title: item.data.title,
            description: item.data.selftext?.substring(0, 200) + '...' || 'Reddit discussion',
            url: `https://reddit.com${item.data.permalink}`,
            source: 'Reddit',
            type: 'social',
            subreddit: item.data.subreddit,
            score: item.data.score,
            comments: item.data.num_comments
        })) || [];
    } catch (error) {
        console.error('Reddit search error:', error);
        return [];
    }
}

// Stack Overflow search function
async function searchStackOverflow(query) {
    try {
        const response = await fetch(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow`);
        const data = await response.json();
        
        return data.items?.map(item => ({
            title: item.title,
            description: 'Stack Overflow discussion and solutions',
            url: item.link,
            source: 'Stack Overflow',
            type: 'code',
            score: item.score,
            answers: item.answer_count,
            views: item.view_count
        })) || [];
    } catch (error) {
        console.error('Stack Overflow search error:', error);
        return [];
    }
}

// Semantic Scholar search function
async function searchSemanticScholar(query) {
    try {
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        
        return data.data?.map(item => ({
            title: item.title,
            description: item.abstract?.substring(0, 200) + '...' || 'Academic paper',
            url: item.url || `https://www.semanticscholar.org/paper/${item.paperId}`,
            source: 'Semantic Scholar',
            type: 'academic',
            year: item.year,
            citationCount: item.citationCount,
            authors: item.authors?.map(a => a.name).join(', ')
        })) || [];
    } catch (error) {
        console.error('Semantic Scholar search error:', error);
        return [];
    }
}

// Trends search function
async function searchTrends(query) {
    // Mock trending data - in real implementation would use Google Trends API
    return [
        {
            title: `${query} - Trending Now`,
            description: 'Current trends and popular discussions',
            url: '#',
            source: 'Global Trends',
            type: 'trends',
            trendScore: Math.floor(Math.random() * 100)
        }
    ];
}

// Helper function to determine source type
function getSourceType(index) {
    const types = ['knowledge', 'academic', 'code', 'news', 'knowledge', 'social', 'code', 'academic', 'realTime', 'trends'];
    return types[index] || 'web';
}

// AI-powered result synthesis
async function synthesizeResults(results, query) {
    // Advanced AI synthesis logic
    const synthesized = { ...results };
    
    // Rank results by relevance, recency, and authority
    Object.keys(synthesized).forEach(category => {
        synthesized[category] = synthesized[category]
            .sort((a, b) => {
                // Prioritize by source authority and relevance
                const scoreA = calculateRelevanceScore(a, query);
                const scoreB = calculateRelevanceScore(b, query);
                return scoreB - scoreA;
            })
            .slice(0, 10); // Limit to top 10 per category
    });
    
    return synthesized;
}

// Calculate relevance score
function calculateRelevanceScore(result, query) {
    let score = 0;
    const queryLower = query.toLowerCase();
    const titleLower = result.title?.toLowerCase() || '';
    const descLower = result.description?.toLowerCase() || '';
    
    // Title relevance (highest weight)
    if (titleLower.includes(queryLower)) score += 10;
    
    // Description relevance
    if (descLower.includes(queryLower)) score += 5;
    
    // Source authority
    const authorityScores = {
        'Wikipedia': 8,
        'ArXiv': 9,
        'GitHub': 7,
        'Semantic Scholar': 9,
        'Stack Overflow': 7,
        'Google Books': 6,
        'Reddit': 4,
        'Global News': 6
    };
    
    score += authorityScores[result.source] || 3;
    
    // Recency bonus
    if (result.publishedAt || result.updated) {
        const date = new Date(result.publishedAt || result.updated);
        const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) score += 3;
        else if (daysSince < 365) score += 1;
    }
    
    return score;
}

// Add global context
async function addGlobalContext(results, query) {
    // Add real-time global context
    const contextualResults = { ...results };
    
    // Add current time and location context
    contextualResults.globalContext = {
        timestamp: new Date().toISOString(),
        query: query,
        totalSources: Object.keys(aiKnowledgeSources).length,
        languages: ['en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh', 'ja', 'ar'],
        dataFreshness: 'Real-time'
    };
    
    return contextualResults;
}

// Generate AI synthesis
async function generateAISynthesis(results, query) {
    const totalResults = Object.values(results).flat().length;
    const categories = Object.keys(results).filter(key => results[key].length > 0);
    
    return {
        summary: `Found ${totalResults} results across ${categories.length} categories for "${query}"`,
        categories: categories,
        topSources: ['Wikipedia', 'ArXiv', 'GitHub', 'Semantic Scholar'],
        confidence: 'High',
        freshness: 'Real-time',
        coverage: 'Global'
    };
}

// Get global context
async function getGlobalContext(query) {
    return {
        searchScope: 'Global',
        languages: 10,
        sources: Object.keys(aiKnowledgeSources).length,
        realTime: true,
        aiPowered: true,
        knowledgeLevel: 'Advanced'
    };
}

// Enhanced unified search endpoint with real web search
app.get('/api/unified-search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        console.log(`🔍 Real web search for: "${query}"`);

        // Perform real web search
        const webResults = await performRealWebSearch(query, ['wikipedia', 'duckduckgo', 'github', 'arxiv', 'news']);
        
        // Get local knowledge results
        const localResults = await searchLocalKnowledge(query);
        
        // Combine all results
        const allResults = [...webResults, ...localResults];
        
        // Categorize and prioritize results
        const categorizedResults = categorizeResults(allResults);
        const prioritizedResults = prioritizeResults(categorizedResults, query);
        
        // Generate knowledge synthesis
        const synthesis = synthesizeKnowledge(allResults, query);
        
        // Prepare response
        const response = {
            query: query,
            totalResults: allResults.length,
            webResults: webResults.length,
            localResults: localResults.length,
            synthesis: synthesis,
            categories: Object.keys(categorizedResults),
            results: prioritizedResults.slice(0, 20),
            timestamp: new Date().toISOString(),
            sources: KNOWLEDGE_SOURCES.filter(s => s.priority === 'high').map(s => s.name)
        };

        res.json(response);
    } catch (error) {
        console.error('Unified search error:', error);
        res.status(500).json({ 
            error: 'Search failed', 
            message: error.message,
            query: req.query.q || 'unknown'
        });
    }
});

// Real-time knowledge endpoint
app.get('/api/real-time-knowledge', async (req, res) => {
    try {
        const topic = req.query.topic || 'technology';
        
        // Simulate real-time data gathering
        const realTimeData = {
            topic: topic,
            timestamp: new Date().toISOString(),
            trending: [
                `Latest developments in ${topic}`,
                `Breaking news about ${topic}`,
                `Recent research in ${topic}`,
                `Current discussions on ${topic}`,
                `New innovations in ${topic}`
            ],
            sources: KNOWLEDGE_SOURCES.filter(s => s.priority === 'high'),
            lastUpdated: new Date().toISOString(),
            confidence: 0.85
        };

        res.json(realTimeData);
    } catch (error) {
        console.error('Real-time knowledge error:', error);
        res.status(500).json({ error: 'Failed to fetch real-time knowledge' });
    }
});

// Knowledge synthesis endpoint
app.get('/api/knowledge-synthesis', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        // Perform comprehensive search
        const webResults = await performRealWebSearch(query, ['wikipedia', 'duckduckgo', 'github', 'arxiv']);
        const synthesis = synthesizeKnowledge(webResults, query);
        
        res.json({
            query: query,
            synthesis: synthesis,
            sources: webResults.map(r => ({ source: r.source, type: r.type, relevance: r.relevance })),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Knowledge synthesis error:', error);
        res.status(500).json({ error: 'Synthesis failed' });
    }
});

// Search local knowledge function
async function searchLocalKnowledge(query) {
    const results = [];
    
    try {
        // Search in apps.json
        if (fs.existsSync('./apps.json')) {
            const appsData = JSON.parse(fs.readFileSync('./apps.json', 'utf8'));
            if (appsData.apps) {
                appsData.apps.forEach(app => {
                    const relevance = calculateRelevance(query, app.name + ' ' + app.description);
                    if (relevance > 0.1) {
                        results.push({
                            title: app.name,
                            content: app.description,
                            url: app.url || '#',
                            source: 'Local Apps',
                            type: 'application',
                            relevance: relevance,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }
        }

        // Search in knowledge directory
        const knowledgeDir = './knowledge';
        if (fs.existsSync(knowledgeDir)) {
            const files = fs.readdirSync(knowledgeDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const data = JSON.parse(fs.readFileSync(path.join(knowledgeDir, file), 'utf8'));
                        Object.entries(data).forEach(([key, value]) => {
                            if (typeof value === 'object' && value !== null) {
                                const content = JSON.stringify(value);
                                const relevance = calculateRelevance(query, key + ' ' + content);
                                if (relevance > 0.1) {
                                    results.push({
                                        title: key,
                                        content: typeof value === 'string' ? value : JSON.stringify(value).substring(0, 200),
                                        url: '#',
                                        source: `Local Knowledge (${file})`,
                                        type: 'knowledge',
                                        relevance: relevance,
                                        timestamp: new Date().toISOString()
                                    });
                                }
                            }
                        });
                    } catch (error) {
                        console.log(`Error reading ${file}:`, error.message);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Local knowledge search error:', error);
    }

    return results;
}

// Enhanced web search with multi-modal results
async function searchWebWithMultiModal(query) {
    const webResults = [
        {
            title: `${query} - Wikipedia`,
            description: `Podrobne informacije o ${query} iz Wikipedije z besedilom, slikami in videoposnetki.`,
            url: `https://sl.wikipedia.org/wiki/${encodeURIComponent(query)}`,
            type: 'web',
            mediaType: 'text',
            thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/200px-Wikipedia-logo-v2.svg.png',
            relevance: calculateRelevance(query, `${query} Wikipedia`)
        },
        {
            title: `${query} - YouTube videoposnetki`,
            description: `Izobraževalni in informativni videoposnetki o ${query}.`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
            type: 'web',
            mediaType: 'video',
            thumbnail: 'https://www.youtube.com/img/desktop/yt_1200.png',
            relevance: calculateRelevance(query, `${query} video`)
        },
        {
            title: `${query} - Slike in galerije`,
            description: `Vizualne predstavitve in slike povezane z ${query}.`,
            url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`,
            type: 'web',
            mediaType: 'image',
            thumbnail: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
            relevance: calculateRelevance(query, `${query} slike`)
        },
        {
            title: `${query} - Najnovejše novice`,
            description: `Aktualne novice in članki o ${query} z multimedijsko vsebino.`,
            url: `https://www.24ur.com/search?q=${encodeURIComponent(query)}`,
            type: 'web',
            mediaType: 'text',
            thumbnail: 'https://www.24ur.com/bin/img/logo-24ur.png',
            relevance: calculateRelevance(query, `${query} novice`)
        }
    ];

    return webResults.sort((a, b) => b.relevance - a.relevance);
}

// Enhanced knowledge search with multi-modal support
async function searchKnowledgeWithMultiModal(query) {
    const knowledgeResults = [
        {
            title: `Dokument: ${query}`,
            description: `Vaš shranjeni dokument o ${query} z besedilom in slikami.`,
            path: `/documents/${query.toLowerCase().replace(/\s+/g, '-')}.pdf`,
            type: 'knowledge',
            mediaType: 'document',
            fileType: 'PDF',
            size: '2.3 MB',
            lastModified: '2024-01-15',
            relevance: calculateRelevance(query, `dokument ${query}`)
        },
        {
            title: `Beležke: ${query}`,
            description: `Vaše osebne beležke in zapiski o ${query}.`,
            path: `/notes/${query.toLowerCase().replace(/\s+/g, '-')}.txt`,
            type: 'knowledge',
            mediaType: 'text',
            fileType: 'TXT',
            size: '156 KB',
            lastModified: '2024-01-10',
            relevance: calculateRelevance(query, `beležke ${query}`)
        },
        {
            title: `Prezentacija: ${query}`,
            description: `PowerPoint prezentacija o ${query} z vizualnimi elementi.`,
            path: `/presentations/${query.toLowerCase().replace(/\s+/g, '-')}.pptx`,
            type: 'knowledge',
            mediaType: 'presentation',
            fileType: 'PPTX',
            size: '8.7 MB',
            lastModified: '2024-01-08',
            relevance: calculateRelevance(query, `prezentacija ${query}`)
        },
        {
            title: `Video zapis: ${query}`,
            description: `Vaš video zapis ali posnetek o ${query}.`,
            path: `/videos/${query.toLowerCase().replace(/\s+/g, '-')}.mp4`,
            type: 'knowledge',
            mediaType: 'video',
            fileType: 'MP4',
            size: '45.2 MB',
            duration: '12:34',
            lastModified: '2024-01-05',
            relevance: calculateRelevance(query, `video ${query}`)
        }
    ];

    return knowledgeResults.sort((a, b) => b.relevance - a.relevance);
}

function generateAIToolSuggestions(query) {
    const tools = [
        {
            id: 'content-generator',
            title: `AI Generator za "${query}"`,
            description: `Ustvarite kakovostno vsebino o ${query} z naprednim AI`,
            action: 'generate',
            icon: '✨',
            category: 'content'
        },
        {
            id: 'data-analyzer',
            title: `Analiza podatkov: ${query}`,
            description: `Analizirajte in interpretirajte podatke o ${query}`,
            action: 'analyze',
            icon: '📊',
            category: 'analysis'
        },
        {
            id: 'summarizer',
            title: `Povzetek: ${query}`,
            description: `Ustvarite jedrnat povzetek informacij o ${query}`,
            action: 'summarize',
            icon: '📝',
            category: 'summary'
        },
        {
            id: 'translator',
            title: `Prevod: ${query}`,
            description: `Prevedite vsebino o ${query} v različne jezike`,
            action: 'translate',
            icon: '🌐',
            category: 'translation'
        },
        {
            id: 'image-generator',
            title: `Vizualizacija: ${query}`,
            description: `Ustvarite slike in diagrame o ${query}`,
            action: 'visualize',
            icon: '🎨',
            category: 'visual'
        }
    ];

    return tools.map(tool => ({
        ...tool,
        type: 'tool',
        relevanceScore: calculateRelevance(query, tool.title + ' ' + tool.description)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function searchApps(query) {
    // Load apps from knowledge base
    let apps = [];
    try {
        const appsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'knowledge', 'apps.json'), 'utf8'));
        apps = appsData.filter(app => 
            app.name.toLowerCase().includes(query.toLowerCase()) ||
            app.description.toLowerCase().includes(query.toLowerCase()) ||
            (app.alternatives && app.alternatives.some(alt => alt.toLowerCase().includes(query.toLowerCase())))
        );
    } catch (error) {
        console.error('Error loading apps:', error);
    }

    return apps.map(app => ({
        title: app.name,
        description: app.description,
        platform: app.platform || 'Multiple',
        free: app.free,
        alternatives: app.alternatives,
        type: 'app',
        relevanceScore: calculateRelevance(query, app.name + ' ' + app.description)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// Real-world web search function
async function performRealWebSearch(query, sources = ['wikipedia', 'duckduckgo', 'news']) {
    const results = [];
    
    try {
        // Wikipedia search
        if (sources.includes('wikipedia')) {
            try {
                const wikiResponse = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
                if (wikiResponse.data && wikiResponse.data.extract) {
                    results.push({
                        title: wikiResponse.data.title,
                        content: wikiResponse.data.extract,
                        url: wikiResponse.data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
                        source: 'Wikipedia',
                        type: 'encyclopedia',
                        relevance: 0.9,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.log('Wikipedia search failed:', error.message);
            }
        }

        // DuckDuckGo Instant Answer
        if (sources.includes('duckduckgo')) {
            try {
                const ddgResponse = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
                if (ddgResponse.data && ddgResponse.data.Abstract) {
                    results.push({
                        title: ddgResponse.data.Heading || query,
                        content: ddgResponse.data.Abstract,
                        url: ddgResponse.data.AbstractURL || 'https://duckduckgo.com',
                        source: 'DuckDuckGo',
                        type: 'search',
                        relevance: 0.8,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.log('DuckDuckGo search failed:', error.message);
            }
        }

        // ArXiv scientific papers search
        if (sources.includes('arxiv') || query.includes('research') || query.includes('science')) {
            try {
                const arxivResponse = await axios.get(`http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=3`);
                // Parse XML response (simplified)
                if (arxivResponse.data.includes('<entry>')) {
                    results.push({
                        title: `Scientific Research: ${query}`,
                        content: `Latest scientific research and papers related to ${query}`,
                        url: `https://arxiv.org/search/?query=${encodeURIComponent(query)}`,
                        source: 'ArXiv',
                        type: 'scientific',
                        relevance: 0.85,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.log('ArXiv search failed:', error.message);
            }
        }

        // Real-time news (mock implementation - would need NewsAPI key)
        if (sources.includes('news')) {
            results.push({
                title: `Latest News: ${query}`,
                content: `Current news and updates about ${query}. Real-time information from global news sources.`,
                url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
                source: 'News Aggregator',
                type: 'news',
                relevance: 0.75,
                timestamp: new Date().toISOString()
            });
        }

        // GitHub code search
        if (sources.includes('github') || query.includes('code') || query.includes('programming')) {
            try {
                const githubResponse = await axios.get(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=3`);
                if (githubResponse.data && githubResponse.data.items && githubResponse.data.items.length > 0) {
                    const topRepo = githubResponse.data.items[0];
                    results.push({
                        title: `Code: ${topRepo.name}`,
                        content: topRepo.description || `Code repository related to ${query}`,
                        url: topRepo.html_url,
                        source: 'GitHub',
                        type: 'code',
                        relevance: 0.8,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.log('GitHub search failed:', error.message);
            }
        }

    } catch (error) {
        console.error('Web search error:', error);
    }

    return results;
}

// Knowledge synthesis function
function synthesizeKnowledge(results, query) {
    if (!results || results.length === 0) return null;

    const synthesis = {
        query: query,
        summary: '',
        sources: results.length,
        confidence: 0,
        categories: [],
        keyPoints: [],
        relatedTopics: [],
        timestamp: new Date().toISOString()
    };

    // Extract key information
    const allContent = results.map(r => r.content).join(' ');
    const words = allContent.toLowerCase().split(/\s+/);
    const wordFreq = {};
    
    words.forEach(word => {
        if (word.length > 3 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way', 'she', 'use', 'your', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'would', 'there', 'could', 'other', 'after', 'first', 'well', 'water', 'been', 'call', 'who', 'oil', 'sit', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'].includes(word)) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    });

    // Generate key points from most frequent terms
    const keyTerms = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([term]) => term);

    synthesis.keyPoints = keyTerms;
    synthesis.categories = [...new Set(results.map(r => r.type))];
    synthesis.confidence = Math.min(0.95, results.length * 0.2 + 0.3);
    
    // Create summary
    const topResult = results.sort((a, b) => b.relevance - a.relevance)[0];
    synthesis.summary = topResult ? topResult.content.substring(0, 200) + '...' : 'No summary available';

    return synthesis;
}

function calculateRelevance(query, text) {
    const queryWords = query.toLowerCase().split(' ');
    const textLower = text.toLowerCase();
    let score = 0;
    
    queryWords.forEach(word => {
        if (textLower.includes(word)) {
            score += word.length; // Longer words get higher scores
        }
    });
    
    return score;
}

// Smart categorization functions
function categorizeResults(results, query) {
    const categorized = {
        web: [],
        knowledge: [],
        tools: [],
        apps: []
    };

    results.forEach(result => {
        const category = determineCategory(result, query);
        if (categorized[category]) {
            categorized[category].push({
                ...result,
                relevanceScore: calculateRelevance(result, query),
                category: category
            });
        }
    });

    // Sort each category by relevance
    Object.keys(categorized).forEach(category => {
        categorized[category].sort((a, b) => b.relevanceScore - a.relevanceScore);
    });

    return categorized;
}

function determineCategory(result, query) {
    const queryLower = query.toLowerCase();
    const titleLower = result.title.toLowerCase();
    const descLower = result.description.toLowerCase();

    // Tool keywords
    const toolKeywords = ['orodje', 'tool', 'generator', 'calculator', 'converter', 'editor', 'analyzer', 'simulator'];
    if (toolKeywords.some(keyword => queryLower.includes(keyword) || titleLower.includes(keyword))) {
        return 'tools';
    }

    // App keywords
    const appKeywords = ['aplikacija', 'app', 'mobile', 'android', 'ios', 'download', 'install'];
    if (appKeywords.some(keyword => queryLower.includes(keyword) || titleLower.includes(keyword))) {
        return 'apps';
    }

    // Knowledge keywords
    const knowledgeKeywords = ['dokument', 'document', 'pdf', 'file', 'datoteka', 'knowledge', 'znanje'];
    if (knowledgeKeywords.some(keyword => queryLower.includes(keyword) || titleLower.includes(keyword))) {
        return 'knowledge';
    }

    // File extensions indicate knowledge
    if (result.path && /\.(pdf|doc|docx|txt|md|ppt|pptx|xls|xlsx)$/i.test(result.path)) {
        return 'knowledge';
    }

    // URLs indicate web results
    if (result.url && result.url.startsWith('http')) {
        return 'web';
    }

    // Default categorization based on result properties
    if (result.action) return 'tools';
    if (result.platform) return 'apps';
    if (result.path) return 'knowledge';
    
    return 'web';
}

function prioritizeResults(categorizedResults, query) {
    const queryLower = query.toLowerCase();
    const priorities = {
        web: 1,
        knowledge: 2,
        tools: 3,
        apps: 4
    };

    // Adjust priorities based on query intent
    if (queryLower.includes('kako') || queryLower.includes('navodila') || queryLower.includes('tutorial')) {
        priorities.knowledge = 1;
        priorities.web = 2;
    }
    
    if (queryLower.includes('orodje') || queryLower.includes('generator') || queryLower.includes('calculator')) {
        priorities.tools = 1;
        priorities.web = 3;
    }

    if (queryLower.includes('aplikacija') || queryLower.includes('app') || queryLower.includes('mobile')) {
        priorities.apps = 1;
        priorities.web = 3;
    }

    // Sort categories by priority and limit results per category
    const sortedResults = [];
    Object.keys(priorities)
        .sort((a, b) => priorities[a] - priorities[b])
        .forEach(category => {
            if (categorizedResults[category] && categorizedResults[category].length > 0) {
                // Take top 5 results per category
                sortedResults.push(...categorizedResults[category].slice(0, 5));
            }
        });

    return sortedResults;
}

// API endpoint za aplikacije in dejanja
app.get('/api/apps', async (req, res) => {
    try {
        const { query, category } = req.query;
        
        if (!mobileAppService) {
            return res.json({
                success: false,
                error: 'Mobile App Service not available',
                apps: []
            });
        }

        let apps = [];
        
        if (query) {
            apps = mobileAppService.searchApps(query);
        } else if (category) {
            apps = mobileAppService.getAppsByCategory(category);
        } else {
            apps = mobileAppService.getAllApps();
        }

        res.json({
            success: true,
            apps: apps,
            totalCount: apps.length,
            categories: mobileAppService.getCategories()
        });
    } catch (error) {
        console.error('Error in /api/apps:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch apps',
            apps: []
        });
    }
});

// API endpoint za izvajanje dejanj aplikacij
app.post('/api/apps/action', async (req, res) => {
    try {
        const { appName, action, parameters } = req.body;
        
        if (!mobileAppService) {
            return res.json({
                success: false,
                error: 'Mobile App Service not available'
            });
        }

        const result = await mobileAppService.executeAction(appName, action, parameters);
        
        res.json({
            success: true,
            result: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in /api/apps/action:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to execute app action'
        });
    }
});

// API endpoint za predloge aplikacij
app.get('/api/apps/suggestions', async (req, res) => {
    try {
        const { context, userActivity } = req.query;
        
        if (!mobileAppService) {
            return res.json({
                success: false,
                error: 'Mobile App Service not available',
                suggestions: []
            });
        }

        const suggestions = mobileAppService.generateSuggestions(context, userActivity);
        
        res.json({
            success: true,
            suggestions: suggestions,
            context: context
        });
    } catch (error) {
        console.error('Error in /api/apps/suggestions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate app suggestions',
            suggestions: []
        });
    }
});

// API endpoint za povzetek znanja aplikacij
app.get('/api/apps/knowledge', async (req, res) => {
    try {
        const { topic, apps } = req.query;
        
        if (!mobileAppService) {
            return res.json({
                success: false,
                error: 'Mobile App Service not available',
                knowledge: {}
            });
        }

        const appList = apps ? apps.split(',') : null;
        const knowledge = mobileAppService.summarizeKnowledge(topic, appList);
        
        res.json({
            success: true,
            knowledge: knowledge,
            topic: topic,
            relatedApps: appList
        });
    } catch (error) {
        console.error('Error in /api/apps/knowledge:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to summarize app knowledge',
            knowledge: {}
        });
    }
});

// API endpoints za izvršna dejanja
app.get('/api/actions', (req, res) => {
    try {
        if (!global.executableActions) {
            return res.json({
                success: false,
                error: 'Executable Actions System not available',
                actions: []
            });
        }

        const { category } = req.query;
        const actions = global.executableActions.getAvailableActions(category);
        
        res.json({
            success: true,
            actions: actions,
            categories: global.executableActions.getActionsByCategory()
        });
    } catch (error) {
        console.error('Error in /api/actions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get available actions',
            actions: []
        });
    }
});

app.post('/api/actions/execute', async (req, res) => {
    try {
        const { actionId, parameters } = req.body;
        
        if (!global.executableActions) {
            return res.json({
                success: false,
                error: 'Executable Actions System not available'
            });
        }

        if (!actionId) {
            return res.status(400).json({
                success: false,
                error: 'Action ID is required'
            });
        }

        const result = await global.executableActions.executeAction(actionId, parameters);
        
        res.json(result);
    } catch (error) {
        console.error('Error in /api/actions/execute:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to execute action'
        });
    }
});

// Advanced Learning System API endpoints
app.get('/api/learning/status', (req, res) => {
    try {
        if (!advancedLearningSystem) {
            return res.status(503).json({
                success: false,
                error: 'Advanced Learning System not initialized'
            });
        }
        
        const status = advancedLearningSystem.getSystemStatus();
        res.json({
            success: true,
            status: status
        });
    } catch (error) {
        console.error('Error in /api/learning/status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get learning system status'
        });
    }
});

app.post('/api/learning/test-module', async (req, res) => {
    try {
        if (!advancedLearningSystem) {
            return res.status(503).json({
                success: false,
                error: 'Advanced Learning System not initialized'
            });
        }
        
        const { moduleCode, moduleName } = req.body;
        const result = await advancedLearningSystem.testModule(moduleCode, moduleName);
        
        res.json({
            success: true,
            result: result
        });
    } catch (error) {
        console.error('Error in /api/learning/test-module:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test module'
        });
    }
});

app.post('/api/learning/start-background-learning', async (req, res) => {
    try {
        if (!advancedLearningSystem) {
            return res.status(503).json({
                success: false,
                error: 'Advanced Learning System not initialized'
            });
        }
        
        const { learningData } = req.body;
        const result = await advancedLearningSystem.startBackgroundLearning(learningData);
        
        res.json({
            success: true,
            result: result
        });
    } catch (error) {
        console.error('Error in /api/learning/start-background-learning:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start background learning'
        });
    }
});

app.get('/api/test', (req, res) => {
    res.json({ 
        message: "API is working", 
        timestamp: new Date().toISOString(),
        knowledgeService: knowledgeService ? 'available' : 'unavailable'
    });
});

// Cloud Learning API Endpoints
if (cloudLearningAPI) {
    cloudLearningAPI.registerRoutes(app);
    console.log('🌐 Cloud Learning API routes registered');
}

// Route for cloud learning dashboard
app.get('/cloud-learning', (req, res) => {
    res.sendFile(path.join(__dirname, 'cloud-learning-dashboard.html'));
});

app.get('/api/status', (req, res) => {
    res.json({ 
        status: "running", 
        timestamp: new Date().toISOString(),
        services: {
            openai: openai ? 'configured' : 'mock',
            knowledge: knowledgeService ? 'available' : 'unavailable'
        }
    });
});

app.post('/api/data', (req, res) => {
    res.json({ 
        received: req.body, 
        timestamp: new Date().toISOString() 
    });
});

// Route handlers for HTML pages
app.get('/multimodal', (req, res) => {
    res.sendFile(path.join(__dirname, 'multimodal.html'));
});

app.get('/personalization', (req, res) => {
    res.sendFile(path.join(__dirname, 'personalization.html'));
});

app.get('/global', (req, res) => {
    res.sendFile(path.join(__dirname, 'global.html'));
});

app.get('/versatility', (req, res) => {
    res.sendFile(path.join(__dirname, 'versatility.html'));
});

app.get('/simplicity', (req, res) => {
    res.sendFile(path.join(__dirname, 'simplicity.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

// Catch all handler
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Live AI Preview pripravljen na: http://localhost:${PORT}`);
    console.log(`⚠️ OPENAI_API_KEY ni nastavljen - uporabljam mock odgovore`);
    console.log(`🔧 API endpoints:`);
    console.log(`   - POST /generate (za AI generiranje)`);
    console.log(`   - GET  /api/knowledge (vse kategorije)`);
    console.log(`   - GET  /api/knowledge/:category (podatki kategorije)`);
    console.log(`   - GET  /api/knowledge/:category/prompts (kontekstualni prompti)`);
    console.log(`   - GET  /api/search?q=query (iskanje po bazi znanja)`);
    console.log(`   - GET  /api/cloud-learning/* (cloud learning endpoints)`);
    console.log(`   - GET  /cloud-learning (cloud learning dashboard)`);
    console.log(`   - GET  /api/test`);
    console.log(`   - GET  /api/status`);
    console.log(`   - POST /api/data`);
    console.log(`🌐 Dostopno tudi na LAN: http://[your-ip]:${PORT}`);
    console.log(`🔌 WebSocket server running for real-time updates`);
});

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket connection established');
    
    // Send initial status
    if (cloudLearningManager) {
        ws.send(JSON.stringify({
            type: 'status',
            data: cloudLearningManager.getSystemStatus()
        }));
    }
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 WebSocket message received:', data);
            
            // Handle different message types
            switch (data.type) {
                case 'subscribe':
                    // Subscribe to updates
                    ws.subscribed = true;
                    break;
                case 'unsubscribe':
                    ws.subscribed = false;
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
    });
});

// Broadcast updates to all connected WebSocket clients
function broadcastUpdate(type, data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.subscribed) {
            client.send(JSON.stringify({ type, data }));
        }
    });
}

// Set up periodic updates if cloud learning manager is available
if (cloudLearningManager) {
    setInterval(() => {
        try {
            const status = cloudLearningManager.getSystemStatus();
            broadcastUpdate('status', status);
        } catch (error) {
            console.error('Error broadcasting status update:', error);
        }
    }, 2000); // Update every 2 seconds
}

console.log('✅ Server setup complete');