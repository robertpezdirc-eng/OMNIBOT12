/**
 * Hot Reload System for Omniscient AI Platform
 * Enables instant frontend updates without server restart
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const WebSocket = require('ws');

class HotReloadManager {
    constructor(options = {}) {
        this.options = {
            port: options.port || 3001,
            watchPaths: options.watchPaths || ['./public', './views', './client'],
            excludePatterns: options.excludePatterns || [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/build/**'
            ],
            debounceMs: options.debounceMs || 100,
            enableLiveReload: options.enableLiveReload !== false,
            enableHMR: options.enableHMR !== false, // Hot Module Replacement
            verbose: options.verbose || false,
            ...options
        };

        this.wss = null;
        this.watchers = [];
        this.clients = new Set();
        this.fileChangeQueue = new Map();
        this.debounceTimers = new Map();
        
        this.stats = {
            connectedClients: 0,
            filesWatched: 0,
            reloadsTriggered: 0,
            startTime: new Date()
        };

        this.init();
    }

    init() {
        this.setupWebSocketServer();
        this.setupFileWatchers();
        this.setupProcessHandlers();
        
        if (this.options.verbose) {
            this.log('🔥 Hot Reload Manager initialized', 'green');
            this.log(`📡 WebSocket server on port ${this.options.port}`, 'blue');
        }
    }

    setupWebSocketServer() {
        this.wss = new WebSocket.Server({ 
            port: this.options.port,
            clientTracking: true
        });

        this.wss.on('connection', (ws, req) => {
            this.clients.add(ws);
            this.stats.connectedClients = this.clients.size;
            
            const clientInfo = {
                ip: req.socket.remoteAddress,
                userAgent: req.headers['user-agent'],
                connectedAt: new Date()
            };

            ws.clientInfo = clientInfo;
            
            // Send initial connection message
            this.sendToClient(ws, {
                type: 'connected',
                message: 'Hot reload connected',
                stats: this.getStats()
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                this.stats.connectedClients = this.clients.size;
                
                if (this.options.verbose) {
                    this.log(`📱 Client disconnected: ${clientInfo.ip}`, 'yellow');
                }
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleClientMessage(ws, message);
                } catch (error) {
                    this.log(`❌ Invalid message from client: ${error.message}`, 'red');
                }
            });

            ws.on('error', (error) => {
                this.log(`❌ WebSocket error: ${error.message}`, 'red');
                this.clients.delete(ws);
                this.stats.connectedClients = this.clients.size;
            });

            if (this.options.verbose) {
                this.log(`📱 Client connected: ${clientInfo.ip}`, 'green');
            }
        });

        this.wss.on('error', (error) => {
            this.log(`❌ WebSocket server error: ${error.message}`, 'red');
        });
    }

    setupFileWatchers() {
        this.options.watchPaths.forEach(watchPath => {
            if (fs.existsSync(watchPath)) {
                const watcher = chokidar.watch(watchPath, {
                    ignored: this.options.excludePatterns,
                    persistent: true,
                    ignoreInitial: true,
                    awaitWriteFinish: {
                        stabilityThreshold: 100,
                        pollInterval: 50
                    }
                });

                watcher.on('change', (filePath) => {
                    this.handleFileChange(filePath, 'change');
                });

                watcher.on('add', (filePath) => {
                    this.handleFileChange(filePath, 'add');
                });

                watcher.on('unlink', (filePath) => {
                    this.handleFileChange(filePath, 'delete');
                });

                watcher.on('ready', () => {
                    const watchedFiles = watcher.getWatched();
                    const fileCount = Object.values(watchedFiles)
                        .reduce((total, files) => total + files.length, 0);
                    
                    this.stats.filesWatched += fileCount;
                    
                    if (this.options.verbose) {
                        this.log(`👀 Watching ${fileCount} files in ${watchPath}`, 'blue');
                    }
                });

                watcher.on('error', (error) => {
                    this.log(`❌ Watcher error for ${watchPath}: ${error.message}`, 'red');
                });

                this.watchers.push(watcher);
            } else {
                this.log(`⚠️ Watch path does not exist: ${watchPath}`, 'yellow');
            }
        });
    }

    handleFileChange(filePath, changeType) {
        const relativePath = path.relative(process.cwd(), filePath);
        const fileExt = path.extname(filePath).toLowerCase();
        
        // Debounce file changes
        const debounceKey = `${filePath}-${changeType}`;
        
        if (this.debounceTimers.has(debounceKey)) {
            clearTimeout(this.debounceTimers.get(debounceKey));
        }

        this.debounceTimers.set(debounceKey, setTimeout(() => {
            this.processFileChange(filePath, relativePath, fileExt, changeType);
            this.debounceTimers.delete(debounceKey);
        }, this.options.debounceMs));
    }

    processFileChange(filePath, relativePath, fileExt, changeType) {
        const changeInfo = {
            filePath: relativePath,
            fullPath: filePath,
            extension: fileExt,
            changeType: changeType,
            timestamp: new Date(),
            size: this.getFileSize(filePath)
        };

        // Determine reload strategy based on file type
        const reloadStrategy = this.getReloadStrategy(fileExt, changeType);
        
        if (reloadStrategy.shouldReload) {
            this.triggerReload(changeInfo, reloadStrategy);
        }

        if (this.options.verbose) {
            this.log(`📝 File ${changeType}: ${relativePath} (${reloadStrategy.type})`, 'cyan');
        }
    }

    getReloadStrategy(fileExt, changeType) {
        const strategies = {
            // CSS files - hot reload without page refresh
            '.css': { shouldReload: true, type: 'css-hot', fullReload: false },
            '.scss': { shouldReload: true, type: 'css-hot', fullReload: false },
            '.sass': { shouldReload: true, type: 'css-hot', fullReload: false },
            '.less': { shouldReload: true, type: 'css-hot', fullReload: false },
            
            // JavaScript files - full page reload
            '.js': { shouldReload: true, type: 'js-reload', fullReload: true },
            '.mjs': { shouldReload: true, type: 'js-reload', fullReload: true },
            '.ts': { shouldReload: true, type: 'js-reload', fullReload: true },
            
            // HTML files - full page reload
            '.html': { shouldReload: true, type: 'html-reload', fullReload: true },
            '.htm': { shouldReload: true, type: 'html-reload', fullReload: true },
            '.ejs': { shouldReload: true, type: 'template-reload', fullReload: true },
            '.hbs': { shouldReload: true, type: 'template-reload', fullReload: true },
            
            // Images - hot reload
            '.jpg': { shouldReload: true, type: 'image-hot', fullReload: false },
            '.jpeg': { shouldReload: true, type: 'image-hot', fullReload: false },
            '.png': { shouldReload: true, type: 'image-hot', fullReload: false },
            '.gif': { shouldReload: true, type: 'image-hot', fullReload: false },
            '.svg': { shouldReload: true, type: 'image-hot', fullReload: false },
            '.webp': { shouldReload: true, type: 'image-hot', fullReload: false },
            
            // JSON files - full reload
            '.json': { shouldReload: true, type: 'data-reload', fullReload: true }
        };

        return strategies[fileExt] || { shouldReload: false, type: 'unknown', fullReload: false };
    }

    triggerReload(changeInfo, strategy) {
        const reloadMessage = {
            type: 'reload',
            strategy: strategy.type,
            fullReload: strategy.fullReload,
            file: changeInfo,
            timestamp: Date.now()
        };

        // Send to all connected clients
        this.broadcast(reloadMessage);
        
        this.stats.reloadsTriggered++;
        
        if (this.options.verbose) {
            this.log(`🔄 Triggered ${strategy.type} for ${changeInfo.filePath}`, 'green');
        }
    }

    handleClientMessage(ws, message) {
        switch (message.type) {
            case 'ping':
                this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
                break;
                
            case 'get-stats':
                this.sendToClient(ws, { 
                    type: 'stats', 
                    stats: this.getStats() 
                });
                break;
                
            case 'force-reload':
                this.broadcast({
                    type: 'reload',
                    strategy: 'force-reload',
                    fullReload: true,
                    timestamp: Date.now()
                });
                break;
                
            default:
                if (this.options.verbose) {
                    this.log(`❓ Unknown message type: ${message.type}`, 'yellow');
                }
        }
    }

    broadcast(message) {
        const messageStr = JSON.stringify(message);
        let sentCount = 0;
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(messageStr);
                    sentCount++;
                } catch (error) {
                    this.log(`❌ Error sending to client: ${error.message}`, 'red');
                    this.clients.delete(client);
                }
            } else {
                this.clients.delete(client);
            }
        });

        this.stats.connectedClients = this.clients.size;
        
        if (this.options.verbose && sentCount > 0) {
            this.log(`📡 Broadcasted to ${sentCount} clients`, 'blue');
        }
    }

    sendToClient(client, message) {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(message));
            } catch (error) {
                this.log(`❌ Error sending to client: ${error.message}`, 'red');
                this.clients.delete(client);
            }
        }
    }

    getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime.getTime(),
            watchPaths: this.options.watchPaths,
            isActive: this.watchers.length > 0
        };
    }

    setupProcessHandlers() {
        const cleanup = () => {
            this.log('🛑 Shutting down Hot Reload Manager...', 'yellow');
            this.destroy();
            process.exit(0);
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('uncaughtException', (error) => {
            this.log(`❌ Uncaught exception: ${error.message}`, 'red');
            this.destroy();
        });
    }

    // Client-side injection script
    getClientScript() {
        return `
<script>
(function() {
    if (typeof window === 'undefined') return;
    
    const hotReload = {
        ws: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 10,
        reconnectDelay: 1000,
        
        init() {
            this.connect();
            this.setupPageVisibilityHandler();
        },
        
        connect() {
            try {
                this.ws = new WebSocket('ws://localhost:${this.options.port}');
                
                this.ws.onopen = () => {
                    console.log('🔥 Hot reload connected');
                    this.reconnectAttempts = 0;
                    this.showNotification('Hot reload connected', 'success');
                };
                
                this.ws.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                };
                
                this.ws.onclose = () => {
                    console.log('🔌 Hot reload disconnected');
                    this.showNotification('Hot reload disconnected', 'warning');
                    this.scheduleReconnect();
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ Hot reload error:', error);
                };
                
            } catch (error) {
                console.error('❌ Failed to connect to hot reload server:', error);
                this.scheduleReconnect();
            }
        },
        
        handleMessage(message) {
            switch (message.type) {
                case 'reload':
                    this.handleReload(message);
                    break;
                case 'connected':
                    console.log('✅ Hot reload ready');
                    break;
                case 'pong':
                    // Handle ping response
                    break;
            }
        },
        
        handleReload(message) {
            const { strategy, fullReload, file } = message;
            
            console.log(\`🔄 Reloading: \${file.filePath} (\${strategy})\`);
            
            if (fullReload) {
                this.showNotification(\`Reloading page: \${file.filePath}\`, 'info');
                setTimeout(() => window.location.reload(), 100);
            } else {
                this.hotReload(strategy, file);
            }
        },
        
        hotReload(strategy, file) {
            switch (strategy) {
                case 'css-hot':
                    this.reloadCSS();
                    this.showNotification(\`Updated styles: \${file.filePath}\`, 'success');
                    break;
                case 'image-hot':
                    this.reloadImages();
                    this.showNotification(\`Updated images: \${file.filePath}\`, 'success');
                    break;
                default:
                    window.location.reload();
            }
        },
        
        reloadCSS() {
            const links = document.querySelectorAll('link[rel="stylesheet"]');
            links.forEach(link => {
                const href = link.href;
                const newHref = href.includes('?') 
                    ? href + '&_reload=' + Date.now()
                    : href + '?_reload=' + Date.now();
                link.href = newHref;
            });
        },
        
        reloadImages() {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                const src = img.src;
                if (src && !src.startsWith('data:')) {
                    const newSrc = src.includes('?')
                        ? src + '&_reload=' + Date.now()
                        : src + '?_reload=' + Date.now();
                    img.src = newSrc;
                }
            });
        },
        
        scheduleReconnect() {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
                
                setTimeout(() => {
                    console.log(\`🔄 Reconnecting to hot reload... (attempt \${this.reconnectAttempts})\`);
                    this.connect();
                }, delay);
            }
        },
        
        setupPageVisibilityHandler() {
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
                    this.connect();
                }
            });
        },
        
        showNotification(message, type = 'info') {
            // Simple notification system
            const notification = document.createElement('div');
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 4px;
                color: white;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s;
                max-width: 300px;
                word-wrap: break-word;
                background: \${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : type === 'error' ? '#F44336' : '#2196F3'};
            \`;
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            // Fade in
            setTimeout(() => notification.style.opacity = '1', 10);
            
            // Fade out and remove
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => document.body.removeChild(notification), 300);
            }, 3000);
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => hotReload.init());
    } else {
        hotReload.init();
    }
    
    // Expose for debugging
    window.hotReload = hotReload;
})();
</script>
        `;
    }

    // Express middleware to inject client script
    getMiddleware() {
        return (req, res, next) => {
            const originalSend = res.send;
            
            res.send = function(body) {
                if (typeof body === 'string' && body.includes('</body>')) {
                    body = body.replace('</body>', this.hotReload.getClientScript() + '</body>');
                }
                originalSend.call(this, body);
            }.bind({ hotReload: this });
            
            next();
        };
    }

    log(message, color = 'white') {
        const colors = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            reset: '\x1b[0m'
        };
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`${colors[color] || colors.white}[${timestamp}] ${message}${colors.reset}`);
    }

    destroy() {
        // Close all watchers
        this.watchers.forEach(watcher => {
            try {
                watcher.close();
            } catch (error) {
                this.log(`❌ Error closing watcher: ${error.message}`, 'red');
            }
        });
        this.watchers = [];

        // Close WebSocket server
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }

        // Clear timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();

        this.clients.clear();
        
        if (this.options.verbose) {
            this.log('🛑 Hot Reload Manager destroyed', 'yellow');
        }
    }
}

// Factory function for easy setup
function createHotReload(options = {}) {
    return new HotReloadManager(options);
}

// Express integration helper
function setupHotReload(app, options = {}) {
    const hotReload = new HotReloadManager(options);
    
    // Add middleware to inject client script
    app.use(hotReload.getMiddleware());
    
    // Add status endpoint
    app.get('/hot-reload/status', (req, res) => {
        res.json({
            status: 'active',
            stats: hotReload.getStats()
        });
    });
    
    return hotReload;
}

module.exports = {
    HotReloadManager,
    createHotReload,
    setupHotReload
};