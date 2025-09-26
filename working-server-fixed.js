const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

console.log('🔄 Starting server...');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(__dirname));

// Import knowledge service with error handling
let knowledgeService = null;
let knowledgeLoaded = false;

async function initializeKnowledge() {
    try {
        knowledgeService = require('./services/knowledgeService');
        console.log('✅ Knowledge service loaded');
        
        await knowledgeService.loadInitialData();
        knowledgeLoaded = true;
        console.log('📚 Knowledge base initialized');
    } catch (error) {
        console.error('❌ Failed to load knowledge service:', error.message);
        knowledgeService = null;
        knowledgeLoaded = false;
    }
}

// OpenAI configuration
let openai = null;
try {
    const { OpenAI } = require('openai');
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI configured');
    } else {
        console.log('⚠️ OPENAI_API_KEY not set - using mock responses');
    }
} catch (error) {
    console.log('⚠️ OpenAI not available - using mock responses');
}

// Local response generator
function generateMockResponse(prompt) {
    const responses = [
        `Local response for "${prompt}": This is a response from the local knowledge base.`,
        `Analysis: Processing your prompt "${prompt}" and generating appropriate response.`,
        `Basic response: For prompt "${prompt}" the system generates relevant and helpful content from available sources.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// API endpoint for generation
app.post('/generate', async (req, res) => {
    const { prompt } = req.body;
    
    console.log('📥 Received generate request:', prompt);
    
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
        
        console.log('✅ Response sent');
        res.json({ 
            response: response,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Generation error:', error);
        res.status(500).json({ 
            error: "Failed to generate response",
            details: error.message 
        });
    }
});

// Knowledge API endpoints
app.get('/api/knowledge', (req, res) => {
    try {
        if (!knowledgeService || !knowledgeLoaded) {
            return res.status(503).json({ 
                error: 'Knowledge service not available',
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
        console.error('Error getting knowledge categories:', error);
        res.status(500).json({ 
            error: 'Failed to get knowledge categories',
            categories: []
        });
    }
});

app.get('/api/knowledge/:category', (req, res) => {
    try {
        if (!knowledgeService || !knowledgeLoaded) {
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
        if (!knowledgeService || !knowledgeLoaded) {
            return res.status(503).json({ 
                error: 'Knowledge service not available',
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
        console.error('Error generating prompts:', error);
        res.status(500).json({ 
            error: 'Failed to generate prompts',
            prompts: []
        });
    }
});

app.get('/api/search', (req, res) => {
    try {
        if (!knowledgeService || !knowledgeLoaded) {
            return res.status(503).json({ 
                error: 'Knowledge service not available',
                results: []
            });
        }
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ 
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
        console.error('Error searching knowledge:', error);
        res.status(500).json({ 
            error: 'Failed to search knowledge',
            results: []
        });
    }
});

// Test endpoints
app.get('/api/test', (req, res) => {
    res.json({ 
        message: "API is functional!", 
        timestamp: new Date().toISOString(),
        knowledgeService: knowledgeLoaded ? 'available' : 'unavailable'
    });
});

app.get('/api/status', (req, res) => {
    res.json({ 
        status: "running", 
        timestamp: new Date().toISOString(),
        services: {
            openai: openai ? 'configured' : 'mock',
            knowledge: knowledgeLoaded ? 'available' : 'unavailable'
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
async function startServer() {
    try {
        // Initialize knowledge service first
        await initializeKnowledge();
        
        // Start the server
        const server = app.listen(PORT, () => {
            console.log(`🚀 Live AI Preview ready at: http://localhost:${PORT}`);
            console.log(`⚠️ OPENAI_API_KEY not set - using mock responses`);
            console.log(`🔧 API endpoints:`);
            console.log(`   - POST /generate (for AI generation)`);
            console.log(`   - GET  /api/knowledge (all categories)`);
            console.log(`   - GET  /api/knowledge/:category (category data)`);
            console.log(`   - GET  /api/knowledge/:category/prompts (contextual prompts)`);
            console.log(`   - GET  /api/search?q=query (knowledge base search)`);
            console.log(`   - GET  /api/test`);
            console.log(`   - GET  /api/status`);
            console.log(`   - POST /api/data`);
            console.log(`🌐 Also accessible on LAN: http://[your-ip]:${PORT}`);
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🔄 Shutting down server...');
            server.close(() => {
                console.log('✅ Server closed');
                process.exit(0);
            });
        });

        console.log('✅ Server setup complete');
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();