const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import Angel modules
const learningAngel = require('../angels/learning');
const analyticsAngel = require('../angels/analytics');
const growthAngel = require('../angels/growth');
const visionaryAngel = require('../angels/visionary');

// Command history storage (in production, use database)
const commandHistory = [];

// Angel registry
const angels = {
  learning: learningAngel,
  analytics: analyticsAngel,
  growth: growthAngel,
  visionary: visionaryAngel
};

// POST /api/command - Execute command
router.post('/', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        error: 'Invalid command',
        message: 'Command must be a non-empty string'
      });
    }

    const commandId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Parse command to determine which Angel to use
    const { angel, action, params } = parseCommand(command);
    
    const commandRecord = {
      id: commandId,
      command: command.trim(),
      angel,
      action,
      params,
      timestamp,
      status: 'pending'
    };

    commandHistory.push(commandRecord);

    try {
      // Execute command with appropriate Angel
      let result;
      if (angel && angels[angel]) {
        result = await angels[angel].execute(action, params);
        commandRecord.status = 'success';
        commandRecord.result = result;
      } else {
        // Default system command handling
        result = await executeSystemCommand(command);
        commandRecord.status = 'success';
        commandRecord.result = result;
      }

      res.json({
        id: commandId,
        command: command.trim(),
        result,
        angel,
        status: 'success',
        timestamp
      });

    } catch (executionError) {
      commandRecord.status = 'error';
      commandRecord.error = executionError.message;
      
      res.status(500).json({
        id: commandId,
        command: command.trim(),
        error: executionError.message,
        angel,
        status: 'error',
        timestamp
      });
    }

  } catch (error) {
    console.error('Command processing error:', error);
    res.status(500).json({
      error: 'Command processing failed',
      message: error.message
    });
  }
});

// GET /api/command/history - Get command history
router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  
  const history = commandHistory
    .slice(-limit - offset, -offset || undefined)
    .reverse();
    
  res.json({
    history,
    total: commandHistory.length,
    limit,
    offset
  });
});

// Helper function to parse commands
function parseCommand(command) {
  const parts = command.toLowerCase().trim().split(' ');
  const firstWord = parts[0];
  
  // Check for Angel-specific commands
  if (firstWord === 'learning' || firstWord === 'learn') {
    return {
      angel: 'learning',
      action: parts[1] || 'status',
      params: parts.slice(2)
    };
  }
  
  if (firstWord === 'analytics' || firstWord === 'analyze') {
    return {
      angel: 'analytics',
      action: parts[1] || 'status',
      params: parts.slice(2)
    };
  }
  
  if (firstWord === 'growth' || firstWord === 'grow') {
    return {
      angel: 'growth',
      action: parts[1] || 'status',
      params: parts.slice(2)
    };
  }
  
  if (firstWord === 'visionary' || firstWord === 'vision') {
    return {
      angel: 'visionary',
      action: parts[1] || 'status',
      params: parts.slice(2)
    };
  }
  
  // System commands
  return {
    angel: null,
    action: firstWord,
    params: parts.slice(1)
  };
}

// Helper function for system commands
async function executeSystemCommand(command) {
  const cmd = command.toLowerCase().trim();
  
  if (cmd === 'status' || cmd === 'health') {
    return {
      system: 'Omni Command Center',
      status: 'Online',
      angels: Object.keys(angels).length,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
  
  if (cmd === 'help') {
    return {
      commands: [
        'status - System status',
        'help - Show this help',
        'learning [action] - Learning Angel commands',
        'analytics [action] - Analytics Angel commands',
        'growth [action] - Growth Angel commands',
        'visionary [action] - Visionary Angel commands'
      ]
    };
  }
  
  if (cmd.startsWith('echo ')) {
    return {
      message: command.substring(5)
    };
  }
  
  throw new Error(`Unknown command: ${command}`);
}

module.exports = router;