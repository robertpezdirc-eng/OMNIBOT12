const express = require('express');
const router = express.Router();
const aiService = require('./services/aiService');
const knowledgeService = require('./services/knowledgeService');
const fs = require('fs').promises;
const path = require('path');

// Get knowledge base
router.get('/knowledge', (req, res) => {
  try {
    const knowledge = knowledgeService.getAllKnowledge();
    res.json(knowledge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process AI query
router.post('/query', async (req, res) => {
  try {
    const { query, persona } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const response = await aiService.processQuery(query, persona);
    
    // Save query to history
    await saveQueryToHistory(query, response);
    
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get query history
router.get('/history', async (req, res) => {
  try {
    const history = await getQueryHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear query history
router.delete('/history', async (req, res) => {
  try {
    await clearQueryHistory();
    res.json({ message: 'History cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific knowledge category
router.get('/knowledge/:category', (req, res) => {
  try {
    const { category } = req.params;
    const knowledge = knowledgeService.getKnowledgeByCategory(category);
    res.json(knowledge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    services: {
      ai: 'active',
      knowledge: 'active'
    }
  });
});

// Helper functions for history management
async function saveQueryToHistory(query, response) {
  try {
    const historyDir = path.join(__dirname, 'data');
    const historyFile = path.join(historyDir, 'query_history.json');
    
    // Create directory if it doesn't exist
    try {
      await fs.mkdir(historyDir, { recursive: true });
    } catch (err) {
      // Directory already exists, continue
    }
    
    // Read existing history or create new
    let history = [];
    try {
      const data = await fs.readFile(historyFile, 'utf8');
      history = JSON.parse(data);
    } catch (err) {
      // File doesn't exist yet, use empty array
    }
    
    // Add new entry with timestamp
    history.push({
      query,
      response,
      timestamp: new Date().toISOString()
    });
    
    // Limit history to last 100 entries
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    // Write back to file
    await fs.writeFile(historyFile, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving query history:', error);
  }
}

async function getQueryHistory() {
  try {
    const historyFile = path.join(__dirname, 'data', 'query_history.json');
    const data = await fs.readFile(historyFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function clearQueryHistory() {
  try {
    const historyFile = path.join(__dirname, 'data', 'query_history.json');
    await fs.writeFile(historyFile, JSON.stringify([], null, 2), 'utf8');
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
}

module.exports = router;