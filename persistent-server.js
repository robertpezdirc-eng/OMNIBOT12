const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const errorHandler = require('./error-handler');
const networkInfo = require('./network-info');

console.log('🚀 Starting Omniscient AI Platform Server...');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize knowledge service
let knowledgeService = null;
let knowledgeLoaded = false;

async function initializeKnowledge() {
    try {
        console.log('📚 Loading knowledge service...');
        knowledgeService = require('./services/knowledgeService');
        await knowledgeService.loadInitialData();
        knowledgeLoaded = true;
        console.log('✅ Knowledge base initialized successfully');
    } catch (error) {
        console.error('❌ Knowledge service error:', error.message);
        knowledgeService = null;
        knowledgeLoaded = false;
    }
}

// Initialize AI service
let aiService = null;
try {
    aiService = require('./services/aiService');
    console.log('✅ AI service loaded');
} catch (error) {
    console.error('❌ AI service error:', error.message);
}

// Web search function - implement real web search
async function performWebSearch(query) {
    console.log('🔍 Performing web search for:', query);
    
    try {
        // Note: In a real implementation, you would use a web search API
        // This is a placeholder that shows the structure for real web search results
        const searchResults = [
            {
                title: `Aktualni rezultati za: ${query}`,
                snippet: `Spletno iskanje omogoča dostop do najnovejših informacij o "${query}" iz zanesljivih virov.`,
                url: 'https://search-results.com',
                relevance: 0.95
            },
            {
                title: `Dodatne informacije o: ${query}`,
                snippet: `Poglobljene informacije in analiza teme "${query}" iz strokovnih virov.`,
                url: 'https://expert-source.com',
                relevance: 0.85
            }
        ];
        
        console.log(`✅ Found ${searchResults.length} web search results`);
        return searchResults;
    } catch (error) {
        console.error('❌ Web search error:', error);
        return [];
    }
}

// OpenAI setup (with fallback to local AI)
let openai = null;
try {
    const { OpenAI } = require('openai');
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('✅ OpenAI configured');
    } else {
        console.log('⚠️ Using local AI responses (OPENAI_API_KEY not set)');
    }
} catch (error) {
    console.log('⚠️ Using local AI responses (OpenAI not available)');
}

function generateFallbackResponse(prompt) {
    const responses = {
        'aplikacije': 'Tukaj so najboljše aplikacije za produktivnost: Visual Studio Code za programiranje, WhatsApp za komunikacijo, Photoshop za obdelavo slik.',
        'palačinke': 'Za palačinke potrebujete: 1½ skodelice moke, 3½ žličk pecilnega praška, 1 žličko soli, 1 žlico sladkorja, 1¼ skodelice mleka, 1 jajce, 3 žlice stopljega masla.',
        'mars': 'Mars je četrti planet od Sonca, znan kot Rdeči planet. Ima tanko atmosfero in značilnosti kot so polarne ledene kape, kanjoni in vulkani.',
        'programiranje': 'Za začetnike priporočam JavaScript za spletni razvoj, Python za podatkovne znanosti in splošno programiranje, ali Java za aplikacije.',
        'kozmične': 'Vesolje je neskončno in polno skrivnosti. Raziskovanje vesolja nam pomaga razumeti naš prostor v njem.'
    };
    
    const lowerPrompt = prompt.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
        if (lowerPrompt.includes(key)) {
            return response;
        }
    }
    
    return `Odgovor na: "${prompt}"\n\nTo je osnovni odgovor iz lokalne baze znanja. Za bolj natančne informacije bi potrebovali dostop do spletnega iskanja.`;
}

// API Routes
app.post('/generate', async (req, res) => {
    const { prompt, persona = 'default' } = req.body;
    
    console.log('📥 Received generate request:', prompt, 'Persona:', persona);
    
    if (!prompt) {
        return res.status(400).json({ 
            success: false,
            error: "No prompt provided" 
        });
    }

    try {
        let response;
        
        // Use AI service if available
        if (aiService) {
            response = await aiService.processQuery(prompt, persona, performWebSearch);
        } else {
            // Fallback to knowledge base and OpenAI
            if (knowledgeService && knowledgeLoaded) {
                const searchResults = knowledgeService.searchKnowledge(prompt);
                if (searchResults && searchResults.length > 0) {
                    const topResult = searchResults[0];
                    response = `Na podlagi baze znanja:\n\n${JSON.stringify(topResult.item, null, 2)}`;
                }
            }
            
            // If no knowledge base result, try OpenAI or generate fallback response
            if (!response) {
                if (openai) {
                    const completion = await openai.chat.completions.create({
                        model: "gpt-3.5-turbo",
                        messages: [{ role: "user", content: prompt }],
                        max_tokens: 500
                    });
                    response = completion.choices[0].message.content;
                } else {
                    response = generateFallbackResponse(prompt);
                }
            }
        }
        
        console.log('✅ Response sent');
        res.json({ 
            success: true,
            response: response,
            timestamp: new Date().toISOString(),
            mode: aiService ? 'ai-service' : (openai ? 'openai' : 'fallback')
        });
    } catch (error) {
        console.error('❌ Generation error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error",
            message: error.message
        });
    }
});
            timestamp: new Date().toISOString(),
            mode: openai ? 'openai' : 'mock'
        });
    } catch (error) {
        console.error('❌ Generation error:', error);
        res.status(500).json({ 
            success: false,
            error: "Failed to generate response",
            details: error.message 
        });
    }
});

// Knowledge API endpoints
app.get('/api/knowledge', (req, res) => {
    try {
        if (!knowledgeService || !knowledgeLoaded) {
            return res.json({ 
                success: false,
                error: 'Knowledge service unavailable',
                categories: []
            });
        }
        const categories = knowledgeService.getCategories();
        res.json({
            success: true,
            categories: categories,
            total: categories.length
        });
    } catch (error) {
        console.error('Knowledge API error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get categories',
            categories: []
        });
    }
});

app.get('/api/knowledge/:category', (req, res) => {
    try {
        if (!knowledgeService || !knowledgeLoaded) {
            return res.status(503).json({ 
                success: false,
                error: 'Knowledge service unavailable' 
            });
        }
        
        const { category } = req.params;
        const knowledge = knowledgeService.getKnowledgeByCategory(category);
        
        if (!knowledge) {
            return res.status(404).json({ 
                success: false,
                error: 'Category not found' 
            });
        }
        
        res.json({
            success: true,
            category: category,
            data: knowledge
        });
    } catch (error) {
        console.error('Category API error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get category data' 
        });
    }
});

app.get('/api/knowledge/:category/prompts', (req, res) => {
    try {
        if (!knowledgeService || !knowledgeLoaded) {
            return res.json({ 
                success: false,
                error: 'Knowledge service unavailable',
                prompts: []
            });
        }
        
        const { category } = req.params;
        const prompts = knowledgeService.generateContextualPrompts(category);
        res.json({
            success: true,
            category: category,
            prompts: prompts
        });
    } catch (error) {
        console.error('Prompts API error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate prompts',
            prompts: []
        });
    }
});

app.get('/api/search', (req, res) => {
    try {
        if (!knowledgeService || !knowledgeLoaded) {
            return res.json({ 
                success: false,
                error: 'Knowledge service unavailable',
                results: []
            });
        }
        
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ 
                success: false,
                error: 'Search query required',
                results: []
            });
        }
        
        const results = knowledgeService.searchKnowledge(q);
        res.json({
            success: true,
            query: q,
            results: results,
            count: results.length
        });
    } catch (error) {
        console.error('Search API error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Search failed',
            results: []
        });
    }
});

// Status and test endpoints
app.get('/api/status', (req, res) => {
    res.json({ 
        status: "running", 
        timestamp: new Date().toISOString(),
        services: {
            openai: openai ? 'configured' : 'mock',
            knowledge: knowledgeLoaded ? 'available' : 'unavailable'
        },
        uptime: process.uptime()
    });
});

app.get('/api/test', (req, res) => {
    res.json({ 
        message: "Server is working!", 
        timestamp: new Date().toISOString(),
        knowledge: knowledgeLoaded ? 'loaded' : 'unavailable'
    });
});

// HTML page routes
const pages = ['multimodal', 'personalization', 'global', 'versatility', 'simplicity', 'test'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `${page}.html`));
    });
});

// Main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Integrated app route
app.get('/integrated', (req, res) => {
    res.sendFile(path.join(__dirname, 'integrated-app.html'));
});

// Error handling middleware
app.use(errorHandler.expressErrorHandler());

// 404 handler
app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler (this should be last)
app.use((error, req, res, next) => {
    errorHandler.logError('EXPRESS_GLOBAL_ERROR', error);
    console.error('Global error handler:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
});

// Start server function
async function startServer() {
    try {
        // Initialize knowledge first
        await initializeKnowledge();
        
        // Start server with proper port fallback
        const server = app.listen(PORT, () => {
            console.log(`\n🎉 Omniscient AI Platform is LIVE!`);
            console.log(`🌐 Access at: http://localhost:${PORT}`);
            console.log(`🧪 Integrated App: http://localhost:${PORT}/integrated`);
            console.log(`📊 Status: http://localhost:${PORT}/api/status`);
            console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
            console.log(`📚 Knowledge: http://localhost:${PORT}/api/knowledge`);
            console.log(`🌍 Network Info: http://localhost:${PORT}/api/network`);
            console.log(`\n✨ Server ready for connections!`);
            
            // Display network information for LAN testing
            console.log('\n' + '='.repeat(60));
            networkInfo.displayNetworkInfo(PORT);
            console.log('='.repeat(60));
        });

        // Keep alive mechanisms
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
        
        // Graceful shutdown
        const gracefulShutdown = () => {
            console.log('\n🔄 Shutting down gracefully...');
            server.close(() => {
                console.log('✅ Server closed');
                process.exit(0);
            });
        };

        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);
        
        // Error handling with proper port fallback
        server.on('error', (error) => {
            console.error('❌ Server error:', error);
            if (error.code === 'EADDRINUSE') {
                const fallbackPort = PORT + 10000;
                console.log(`Port ${PORT} is in use. Trying port ${fallbackPort}...`);
                
                // Update the PORT variable for all subsequent operations
                process.env.PORT = fallbackPort;
                
                const fallbackServer = app.listen(fallbackPort, () => {
                    console.log(`\n🎉 Omniscient AI Platform is LIVE!`);
                    console.log(`🌐 Access at: http://localhost:${fallbackPort}`);
                    console.log(`🧪 Integrated App: http://localhost:${fallbackPort}/integrated`);
                    console.log(`📊 Status: http://localhost:${fallbackPort}/api/status`);
                    console.log(`🧪 Test: http://localhost:${fallbackPort}/api/test`);
                    console.log(`📚 Knowledge: http://localhost:${fallbackPort}/api/knowledge`);
                    console.log(`🌍 Network Info: http://localhost:${fallbackPort}/api/network`);
                    console.log(`\n✨ Server ready for connections!`);
                    
                    // Display network information for LAN testing
                    console.log('\n' + '='.repeat(60));
                    networkInfo.displayNetworkInfo(fallbackPort);
                    console.log('='.repeat(60));
                });
                
                fallbackServer.keepAliveTimeout = 65000;
                fallbackServer.headersTimeout = 66000;
                fallbackServer.on('SIGINT', gracefulShutdown);
                fallbackServer.on('SIGTERM', gracefulShutdown);
            }
        });

        // Keep process alive
        setInterval(() => {
            // Heartbeat to keep process alive
            console.log('💓 Server heartbeat');
        }, 30000);

        // Prevent process from exiting
        process.stdin.resume();

        return server;
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Remove the old error handlers since we have comprehensive error handling now
// process.on('uncaughtException', (error) => {
//     console.error('Uncaught Exception:', error);
// });

// process.on('unhandledRejection', (reason, promise) => {
//     console.error('Unhandled Rejection at:', promise, 'reason:', reason);
// });

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        knowledgeService: knowledgeLoaded ? 'available' : 'unavailable'
    });
});

// Category prompts endpoint
app.get('/api/prompts/:category', (req, res) => {
    try {
        const category = req.params.category;
        const prompts = knowledgeService.generateContextualPrompts(category);
        
        res.json({
            success: true,
            category: category,
            prompts: Array.isArray(prompts) ? prompts : [prompts]
        });
    } catch (error) {
        console.error('Category prompts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get category prompts'
        });
    }
});

// Network info endpoint
app.get('/api/network', (req, res) => {
    try {
        const urls = networkInfo.generateShareableUrls(PORT);
        const info = networkInfo.getNetworkInfo();
        
        res.json({
            success: true,
            hostname: info.hostname,
            platform: info.platform,
            port: PORT,
            urls: urls,
            addresses: info.addresses
        });
    } catch (error) {
        console.error('Network info error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get network info'
        });
    }
});

// Add error stats endpoint
app.get('/api/errors', (req, res) => {
    const errorStats = errorHandler.getErrorStats();
    res.json(errorStats);
});

// Start the server
console.log('🔄 Initializing server...');
startServer().then((server) => {
    console.log('✅ Server initialization complete');
    console.log('🔄 Server is running and listening...');
}).catch((error) => {
    console.error('❌ Server initialization failed:', error);
    console.error('Error details:', error.stack);
    process.exit(1);
});