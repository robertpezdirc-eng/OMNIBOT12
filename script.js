// --- GLOBAL STATE ---
let chatController = null;
let recognition = null;
let isListening = false;
let uploadedImage = null;

// User state object to track application state
const userState = {
    activeView: 'dashboard', // dashboard, chat, workflow, settings
    activeAgents: ['gpt4'],
    collaborators: [],
    workflow: {
        nodes: [],
        connections: []
    },
    settings: {
        theme: localStorage.getItem('theme') || 'dark',
        aiPersona: localStorage.getItem('aiPersona') || 'assistant',
        language: localStorage.getItem('language') || 'sl',
        notifications: localStorage.getItem('notifications') !== 'false',
        autoSave: localStorage.getItem('autoSave') !== 'false',
        encryption: localStorage.getItem('encryption') === 'true'
    },
    sandbox: {
        enabled: true,
        permissions: ['js', 'python', 'sql'],
        resourceLimits: {
            memory: 128, // MB
            cpu: 50, // % of one core
            timeout: 10000 // ms
        }
    }
};

// Multi-agent system configuration
const availableAgents = {
    'gpt4': { name: 'GPT-4', icon: 'robot', capabilities: ['text', 'code', 'reasoning'], active: true },
    'claude': { name: 'Claude 3.7', icon: 'brain', capabilities: ['text', 'analysis', 'creativity'], active: false },
    'gemini': { name: 'Gemini', icon: 'gem', capabilities: ['text', 'vision', 'multimodal'], active: false },
    'llama': { name: 'LLaMA', icon: 'cog', capabilities: ['text', 'local-execution'], active: false },
    'specialist': { name: 'Specialist', icon: 'microscope', capabilities: ['domain-specific'], active: false }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initApp);
window.onload = () => {
    // Trigger boot-up animation
    setTimeout(() => {
        document.body.classList.remove('loading');
    }, 200);
};

function initApp() {
    initUI();
    initEventListeners();
    initSpeechRecognition();
    initMultiAgentSystem();
    initWorkflowSystem();
    initFunctionsAndAPIs();
    initDataLayer();
    initSandboxEnvironment();
    initProductivityFeatures();
    initDeploymentSystem();
    loadUserSettings();
    
    // Create a checkpoint after initialization
    if (window.versionControl) {
        window.versionControl.createCheckpoint('Initial State', userState);
    }
    
    console.log('GPT+ Maximal Upgrade initialized successfully');
}

// --- PRODUCTIVITY FEATURES ---
function initProductivityFeatures() {
    // Initialize productivity components
    setupAutoCompletion();
    setupTemplateSystem();
    setupSmartSuggestions();
    setupTimeTracking();
    setupFocusMode();
    setupCollaborationTools();
    setupWorkflowAutomation();
    
    showToast('Napredne produktivnostne funkcije aktivirane', 'success');
}

// Auto-completion system
function setupAutoCompletion() {
    window.autoComplete = {
        providers: ['code', 'text', 'commands'],
        contextWindow: 2000,
        
        // Get suggestions based on current input and context
        getSuggestions: function(input, context) {
            // Implementation for getting context-aware suggestions
            return [
                { text: 'Predlog 1', type: 'code', confidence: 0.92 },
                { text: 'Predlog 2', type: 'text', confidence: 0.87 }
            ];
        },
        
        // Apply selected suggestion
        applySuggestion: function(suggestion) {
            // Implementation for applying the selected suggestion
            showToast('Predlog uporabljen', 'info');
            return true;
        }
    };
}

// Template system for common tasks
function setupTemplateSystem() {
    window.templates = {
        categories: ['code', 'documents', 'emails', 'workflows'],
        
        // Get available templates
        getTemplates: function(category) {
            // Implementation for retrieving templates by category
            return [
                { id: 'template1', name: 'Osnovna predloga', category: category },
                { id: 'template2', name: 'Napredna predloga', category: category }
            ];
        },
        
        // Apply template to current work
        applyTemplate: function(templateId, context) {
            // Implementation for applying selected template
            showToast('Predloga uporabljena', 'success');
            return { success: true, result: 'Predloga uspešno uporabljena' };
        },
        
        // Save current work as template
        saveAsTemplate: function(name, category, content) {
            // Implementation for saving current work as a template
            showToast('Nova predloga shranjena', 'success');
            return { id: 'newTemplate', name: name };
        }
    };
}

// Smart suggestions system
function setupSmartSuggestions() {
    window.smartSuggestions = {
        // Track user behavior for personalized suggestions
        trackBehavior: function(action, context) {
            // Implementation for tracking user behavior
            console.log('[SmartSuggestions] Tracking:', action);
        },
        
        // Get personalized suggestions based on user behavior
        getSuggestions: function(context) {
            // Implementation for getting personalized suggestions
            return [
                { type: 'action', text: 'Dokončaj trenutno nalogo', priority: 'high' },
                { type: 'resource', text: 'Podoben dokument', priority: 'medium' }
            ];
        }
    };
}

// Time tracking system
function setupTimeTracking() {
    window.timeTracker = {
        sessions: [],
        currentSession: null,
        
        // Start tracking time for a task
        startTracking: function(taskName) {
            this.currentSession = {
                task: taskName,
                startTime: new Date(),
                endTime: null,
                duration: 0
            };
            showToast('Sledenje časa začeto: ' + taskName, 'info');
        },
        
        // Stop tracking time
        stopTracking: function() {
            if (this.currentSession) {
                this.currentSession.endTime = new Date();
                this.currentSession.duration = 
                    (this.currentSession.endTime - this.currentSession.startTime) / 1000;
                this.sessions.push(this.currentSession);
                
                showToast('Sledenje časa končano: ' + 
                    Math.round(this.currentSession.duration / 60) + ' minut', 'success');
                
                const session = this.currentSession;
                this.currentSession = null;
                return session;
            }
            return null;
        },
        
        // Get time tracking report
        getReport: function(filter) {
            // Implementation for generating time tracking reports
            return {
                totalTime: this.sessions.reduce((sum, session) => sum + session.duration, 0),
                sessions: this.sessions
            };
        }
    };
}

// Focus mode
function setupFocusMode() {
    window.focusMode = {
        active: false,
        
        // Enable focus mode
        enable: function(duration) {
            this.active = true;
            document.body.classList.add('focus-mode');
            
            // Hide non-essential UI elements
            const nonEssentialElements = document.querySelectorAll('.non-essential');
            nonEssentialElements.forEach(el => el.classList.add('hidden'));
            
            showToast('Način osredotočenosti aktiviran za ' + duration + ' minut', 'info');
            
            // Set timer to disable focus mode after duration
            setTimeout(() => this.disable(), duration * 60 * 1000);
        },
        
        // Disable focus mode
        disable: function() {
            this.active = false;
            document.body.classList.remove('focus-mode');
            
            // Show non-essential UI elements
            const nonEssentialElements = document.querySelectorAll('.non-essential');
            nonEssentialElements.forEach(el => el.classList.remove('hidden'));
            
            showToast('Način osredotočenosti deaktiviran', 'info');
        }
    };
}

// Collaboration tools
function setupCollaborationTools() {
    window.collaboration = {
        activeUsers: [],
        
        // Add user to collaboration session
        addUser: function(userId, username) {
            this.activeUsers.push({ id: userId, name: username, cursor: { x: 0, y: 0 } });
            showToast('Uporabnik ' + username + ' se je pridružil', 'info');
        },
        
        // Remove user from collaboration session
        removeUser: function(userId) {
            const index = this.activeUsers.findIndex(user => user.id === userId);
            if (index !== -1) {
                const username = this.activeUsers[index].name;
                this.activeUsers.splice(index, 1);
                showToast('Uporabnik ' + username + ' je zapustil sejo', 'info');
            }
        },
        
        // Update user cursor position
        updateCursor: function(userId, position) {
            const user = this.activeUsers.find(user => user.id === userId);
            if (user) {
                user.cursor = position;
                // Update cursor visualization
            }
        },
        
        // Share content with collaborators
        shareContent: function(content, type) {
            // Implementation for sharing content with collaborators
            showToast('Vsebina deljena s sodelavci', 'success');
            return { success: true };
        }
    };
}

// Workflow automation
function setupWorkflowAutomation() {
    window.workflowAutomation = {
        workflows: [],
        
        // Create new workflow
        createWorkflow: function(name, triggers, actions) {
            const workflow = {
                id: 'wf_' + Date.now(),
                name: name,
                triggers: triggers,
                actions: actions,
                active: true
            };
            
            this.workflows.push(workflow);
            showToast('Nov delovni tok ustvarjen: ' + name, 'success');
            return workflow;
        },
        
        // Execute workflow
        executeWorkflow: function(workflowId, context) {
            const workflow = this.workflows.find(wf => wf.id === workflowId);
            if (workflow && workflow.active) {
                showToast('Izvajanje delovnega toka: ' + workflow.name, 'info');
                
                // Execute each action in the workflow
                const results = workflow.actions.map(action => {
                    // Implementation for executing workflow action
                    return { action: action, success: true };
                });
                
                showToast('Delovni tok zaključen', 'success');
                return { success: true, results: results };
            }
            return { success: false, error: 'Delovni tok ne obstaja ali ni aktiven' };
        },
        
        // Toggle workflow active state
        toggleWorkflow: function(workflowId) {
            const workflow = this.workflows.find(wf => wf.id === workflowId);
            if (workflow) {
                workflow.active = !workflow.active;
                const status = workflow.active ? 'aktiviran' : 'deaktiviran';
                showToast('Delovni tok ' + workflow.name + ' ' + status, 'info');
                return workflow.active;
            }
            return false;
        }
    };
}

// --- DEPLOYMENT SYSTEM ---
function initDeploymentSystem() {
    // Initialize deployment components
    setupCloudDeployment();
    setupLiveURL();
    setupAutoScaling();
    setupMonitoring();
    setupBackup();
    
    showToast('Deployment sistem inicializiran', 'success');
}

// Cloud deployment setup
function setupCloudDeployment() {
    window.cloudDeployment = {
        providers: ['vercel', 'netlify', 'heroku', 'aws', 'azure'],
        currentProvider: 'vercel',
        
        // Deploy to cloud provider
        deploy: async function(provider = this.currentProvider) {
            showToast('Začenjam deployment na ' + provider + '...', 'info');
            
            try {
                // Simulate deployment process
                const deploymentConfig = {
                    provider: provider,
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    environment: 'production'
                };
                
                // Mock deployment steps
                await this.buildProject();
                await this.uploadFiles(provider);
                await this.configureEnvironment(provider);
                
                const liveURL = await this.generateLiveURL(provider);
                
                showToast('Deployment uspešen! URL: ' + liveURL, 'success');
                return { success: true, url: liveURL, config: deploymentConfig };
                
            } catch (error) {
                showToast('Napaka pri deployment: ' + error.message, 'error');
                return { success: false, error: error.message };
            }
        },
        
        // Build project for deployment
        buildProject: async function() {
            showToast('Gradim projekt...', 'info');
            // Simulate build process
            return new Promise(resolve => setTimeout(resolve, 2000));
        },
        
        // Upload files to cloud provider
        uploadFiles: async function(provider) {
            showToast('Nalagam datoteke na ' + provider + '...', 'info');
            // Simulate file upload
            return new Promise(resolve => setTimeout(resolve, 3000));
        },
        
        // Configure environment variables
        configureEnvironment: async function(provider) {
            showToast('Konfiguriram okolje...', 'info');
            // Simulate environment configuration
            return new Promise(resolve => setTimeout(resolve, 1000));
        },
        
        // Generate live URL
        generateLiveURL: async function(provider) {
            const baseUrls = {
                vercel: 'https://omnia-app-',
                netlify: 'https://omnia-app-',
                heroku: 'https://omnia-app-',
                aws: 'https://omnia-app-',
                azure: 'https://omnia-app-'
            };
            
            const randomId = Math.random().toString(36).substring(2, 8);
            return baseUrls[provider] + randomId + '.app';
        }
    };
}

// Live URL management
function setupLiveURL() {
    window.liveURL = {
        currentURL: null,
        customDomain: null,
        
        // Set live URL
        setURL: function(url) {
            this.currentURL = url;
            localStorage.setItem('omnia_live_url', url);
            showToast('Live URL nastavljen: ' + url, 'success');
        },
        
        // Get current live URL
        getURL: function() {
            return this.currentURL || localStorage.getItem('omnia_live_url');
        },
        
        // Configure custom domain
        setCustomDomain: function(domain) {
            this.customDomain = domain;
            showToast('Lastna domena nastavljena: ' + domain, 'success');
            return { success: true, domain: domain };
        },
        
        // Generate shareable link
        generateShareLink: function(path = '') {
            const baseURL = this.getURL();
            if (!baseURL) {
                showToast('Najprej nastavite live URL', 'warning');
                return null;
            }
            
            const shareLink = baseURL + path;
            navigator.clipboard.writeText(shareLink);
            showToast('Povezava kopirana v odložišče', 'success');
            return shareLink;
        }
    };
}

// Auto-scaling system
function setupAutoScaling() {
    window.autoScaling = {
        enabled: true,
        metrics: {
            cpu: 0,
            memory: 0,
            requests: 0
        },
        
        // Monitor system resources
        monitor: function() {
            // Simulate resource monitoring
            this.metrics.cpu = Math.random() * 100;
            this.metrics.memory = Math.random() * 100;
            this.metrics.requests = Math.floor(Math.random() * 1000);
            
            if (this.enabled) {
                this.checkScaling();
            }
        },
        
        // Check if scaling is needed
        checkScaling: function() {
            if (this.metrics.cpu > 80 || this.metrics.memory > 80) {
                this.scaleUp();
            } else if (this.metrics.cpu < 20 && this.metrics.memory < 20) {
                this.scaleDown();
            }
        },
        
        // Scale up resources
        scaleUp: function() {
            showToast('Povečujem zmogljivost sistema...', 'info');
            // Implementation for scaling up
        },
        
        // Scale down resources
        scaleDown: function() {
            showToast('Zmanjšujem zmogljivost sistema...', 'info');
            // Implementation for scaling down
        }
    };
    
    // Start monitoring every 30 seconds
    setInterval(() => window.autoScaling.monitor(), 30000);
}

// System monitoring
function setupMonitoring() {
    window.monitoring = {
        metrics: [],
        alerts: [],
        
        // Log system metric
        logMetric: function(name, value, timestamp = new Date()) {
            this.metrics.push({
                name: name,
                value: value,
                timestamp: timestamp
            });
            
            // Keep only last 1000 metrics
            if (this.metrics.length > 1000) {
                this.metrics = this.metrics.slice(-1000);
            }
        },
        
        // Create alert
        createAlert: function(type, message, severity = 'info') {
            const alert = {
                id: 'alert_' + Date.now(),
                type: type,
                message: message,
                severity: severity,
                timestamp: new Date(),
                resolved: false
            };
            
            this.alerts.push(alert);
            showToast('Opozorilo: ' + message, severity);
            return alert;
        },
        
        // Get system health
        getHealth: function() {
            const recentMetrics = this.metrics.filter(m => 
                new Date() - m.timestamp < 5 * 60 * 1000 // Last 5 minutes
            );
            
            return {
                status: 'healthy',
                uptime: Date.now() - window.appStartTime,
                metrics: recentMetrics.length,
                alerts: this.alerts.filter(a => !a.resolved).length
            };
        }
    };
}

// Backup system
function setupBackup() {
    window.backup = {
        backups: [],
        autoBackup: true,
        
        // Create backup
        createBackup: function(description = 'Avtomatski backup') {
            const backup = {
                id: 'backup_' + Date.now(),
                timestamp: new Date(),
                description: description,
                data: {
                    userState: JSON.parse(JSON.stringify(userState)),
                    localStorage: { ...localStorage },
                    version: '1.0.0'
                }
            };
            
            this.backups.push(backup);
            localStorage.setItem('omnia_backups', JSON.stringify(this.backups));
            
            showToast('Backup ustvarjen: ' + description, 'success');
            return backup;
        },
        
        // Restore from backup
        restoreBackup: function(backupId) {
            const backup = this.backups.find(b => b.id === backupId);
            if (!backup) {
                showToast('Backup ne obstaja', 'error');
                return false;
            }
            
            try {
                // Restore user state
                Object.assign(userState, backup.data.userState);
                
                // Restore localStorage
                Object.keys(backup.data.localStorage).forEach(key => {
                    localStorage.setItem(key, backup.data.localStorage[key]);
                });
                
                showToast('Backup obnovljen uspešno', 'success');
                return true;
            } catch (error) {
                showToast('Napaka pri obnovi backup-a: ' + error.message, 'error');
                return false;
            }
        },
        
        // Auto backup every hour
        startAutoBackup: function() {
            if (this.autoBackup) {
                setInterval(() => {
                    this.createBackup('Avtomatski urni backup');
                }, 60 * 60 * 1000); // Every hour
            }
        }
    };
    
    // Load existing backups
    const savedBackups = localStorage.getItem('omnia_backups');
    if (savedBackups) {
        window.backup.backups = JSON.parse(savedBackups);
    }
    
    // Start auto backup
    window.backup.startAutoBackup();
}

// --- SANDBOX ENVIRONMENT ---
function initSandboxEnvironment() {
    // Initialize sandbox components
    setupCodeExecutionEnvironment();
    setupSandboxedAPI();
    setupSafetyMonitor();
    
    showToast('Sandbox okolje inicializirano', 'success');
}

// Code Execution Environment
function setupCodeExecutionEnvironment() {
    // Create code execution environment
    window.codeExecutor = {
        // Execute JavaScript code in a sandboxed environment
        executeJS: async function(code, context = {}) {
            showToast('Izvajanje JavaScript kode...', 'info');
            
            try {
                // Create a safe execution context
                const sandbox = Object.create(null);
                
                // Add safe APIs to sandbox
                sandbox.console = {
                    log: (...args) => console.log('[Sandbox]', ...args),
                    error: (...args) => console.error('[Sandbox]', ...args),
                    warn: (...args) => console.warn('[Sandbox]', ...args),
                    info: (...args) => console.info('[Sandbox]', ...args)
                };
                
                // Add user-provided context
                Object.keys(context).forEach(key => {
                    sandbox[key] = context[key];
                });
                
                // Add safe timeout function
                sandbox.setTimeout = (fn, delay) => {
                    if (delay > 10000) {
                        throw new Error('Timeout too long (max 10s)');
                    }
                    return setTimeout(fn, delay);
                };
                
                // Add safe fetch function
                sandbox.fetch = async (url, options) => {
                    // Check if URL is allowed
                    if (!isUrlAllowed(url)) {
                        throw new Error(`URL not allowed: ${url}`);
                    }
                    return fetch(url, options);
                };
                
                // Create a function from the code
                const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
                const sandboxedFn = new AsyncFunction(
                    ...Object.keys(sandbox),
                    `"use strict"; ${code}`
                );
                
                // Execute the function with the sandbox context
                const result = await sandboxedFn(...Object.values(sandbox));
                
                showToast('Koda uspešno izvedena', 'success');
                return {
                    success: true,
                    result: result
                };
            } catch (error) {
                showToast(`Napaka: ${error.message}`, 'error');
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Execute Python code via Pyodide (simulated)
        executePython: async function(code) {
            showToast('Izvajanje Python kode...', 'info');
            
            try {
                // Simulate Python execution
                await simulateProcessing(1500);
                
                showToast('Python koda uspešno izvedena', 'success');
                return {
                    success: true,
                    result: `Executed Python code: ${code.substring(0, 50)}...`
                };
            } catch (error) {
                showToast(`Napaka: ${error.message}`, 'error');
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Execute SQL queries (simulated)
        executeSQL: async function(query) {
            showToast('Izvajanje SQL poizvedbe...', 'info');
            
            try {
                // Simulate SQL execution
                await simulateProcessing(800);
                
                // Parse query type
                const queryType = query.trim().split(' ')[0].toUpperCase();
                let result;
                
                switch (queryType) {
                    case 'SELECT':
                        result = [
                            { id: 1, name: 'Test 1' },
                            { id: 2, name: 'Test 2' }
                        ];
                        break;
                    case 'INSERT':
                        result = { insertId: Date.now(), affectedRows: 1 };
                        break;
                    case 'UPDATE':
                        result = { affectedRows: 2 };
                        break;
                    case 'DELETE':
                        result = { affectedRows: 1 };
                        break;
                    default:
                        result = { message: 'Query executed' };
                }
                
                showToast('SQL poizvedba uspešno izvedena', 'success');
                return {
                    success: true,
                    result: result
                };
            } catch (error) {
                showToast(`Napaka: ${error.message}`, 'error');
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    };
    
    console.log('Code execution environment initialized');
}

// Sandboxed API
function setupSandboxedAPI() {
    // Create sandboxed API environment
    window.sandboxAPI = {
        // Safe file system operations
        fs: {
            readFile: async function(path) {
                // Check if path is allowed
                if (!isPathAllowed(path)) {
                    throw new Error(`Path not allowed: ${path}`);
                }
                
                // Simulate file reading
                await simulateProcessing(300);
                return `Content of ${path}`;
            },
            
            writeFile: async function(path, content) {
                // Check if path is allowed
                if (!isPathAllowed(path)) {
                    throw new Error(`Path not allowed: ${path}`);
                }
                
                // Simulate file writing
                await simulateProcessing(400);
                return true;
            },
            
            listFiles: async function(directory) {
                // Check if path is allowed
                if (!isPathAllowed(directory)) {
                    throw new Error(`Path not allowed: ${directory}`);
                }
                
                // Simulate directory listing
                await simulateProcessing(200);
                return ['file1.txt', 'file2.txt', 'file3.txt'];
            }
        },
        
        // Safe network operations
        net: {
            fetch: async function(url, options) {
                // Check if URL is allowed
                if (!isUrlAllowed(url)) {
                    throw new Error(`URL not allowed: ${url}`);
                }
                
                // Simulate network request
                await simulateProcessing(500);
                return {
                    status: 200,
                    json: async () => ({ message: 'Success' }),
                    text: async () => 'Success'
                };
            },
            
            websocket: function(url) {
                // Check if URL is allowed
                if (!isUrlAllowed(url)) {
                    throw new Error(`URL not allowed: ${url}`);
                }
                
                // Simulate WebSocket
                return {
                    send: (message) => console.log(`[Sandbox WebSocket] Sent: ${message}`),
                    onmessage: null,
                    close: () => console.log('[Sandbox WebSocket] Closed')
                };
            }
        },
        
        // Safe database operations
        db: {
            query: async function(sql) {
                // Simulate database query
                await simulateProcessing(400);
                return [
                    { id: 1, name: 'Test 1' },
                    { id: 2, name: 'Test 2' }
                ];
            },
            
            execute: async function(sql) {
                // Simulate database execution
                await simulateProcessing(300);
                return { affectedRows: 1 };
            }
        }
    };
    
    console.log('Sandboxed API initialized');
}

// Safety Monitor
function setupSafetyMonitor() {
    // Create safety monitoring system
    window.safetyMonitor = {
        // Monitor resource usage
        monitorResources: function() {
            return {
                memory: Math.floor(Math.random() * 100),
                cpu: Math.floor(Math.random() * 100),
                network: Math.floor(Math.random() * 100)
            };
        },
        
        // Check if code is safe
        checkCodeSafety: function(code) {
            // Check for dangerous patterns
            const dangerousPatterns = [
                'eval\\(',
                'Function\\(',
                'document\\.write',
                'innerHTML',
                'localStorage',
                'sessionStorage',
                'indexedDB',
                'window\\.open',
                'document\\.cookie'
            ];
            
            const regex = new RegExp(dangerousPatterns.join('|'), 'i');
            const isSafe = !regex.test(code);
            
            return {
                safe: isSafe,
                issues: isSafe ? [] : ['Potentially unsafe code detected']
            };
        },
        
        // Log execution
        logExecution: function(type, code) {
            console.log(`[Safety Monitor] Executed ${type}: ${code.substring(0, 50)}...`);
        }
    };
    
    console.log('Safety monitor initialized');
}

// Helper functions for sandbox security
function isUrlAllowed(url) {
    try {
        const urlObj = new URL(url);
        const allowedDomains = [
            'localhost',
            'api.example.com',
            'data.example.com',
            'cdn.example.com'
        ];
        
        return allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`));
    } catch (error) {
        return false;
    }
}

function isPathAllowed(path) {
    // Only allow paths in the sandbox directory
    return path.startsWith('/sandbox/') || path.startsWith('sandbox/');
}

function updateAgentList() {
    const agentListContainer = document.getElementById('agent-list');
    if (!agentListContainer) return;
    
    // Clear existing list
    agentListContainer.innerHTML = '';
    
    // Add each agent to the list
    Object.keys(availableAgents).forEach(agentId => {
        const agent = availableAgents[agentId];
        const isActive = userState.activeAgents.includes(agentId);
        
        const agentElement = document.createElement('div');
        agentElement.className = `agent-item ${isActive ? 'active' : ''}`;
        agentElement.dataset.agentId = agentId;
        
        agentElement.innerHTML = `
            <div class="agent-icon">
                <i class="fas fa-${agent.icon}"></i>
            </div>
            <div class="agent-info">
                <div class="agent-name">${agent.name}</div>
                <div class="agent-status">${isActive ? 'Aktiven' : 'Neaktiven'}</div>
            </div>
            <div class="agent-toggle">
                <label class="toggle-switch">
                    <input type="checkbox" ${isActive ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        `;
        
        // Add click event
        agentElement.addEventListener('click', () => toggleAgent(agentId));
        
        agentListContainer.appendChild(agentElement);
    });
}

function toggleAgent(agentId) {
    if (!availableAgents[agentId]) return;
    
    const isCurrentlyActive = userState.activeAgents.includes(agentId);
    
    if (isCurrentlyActive) {
        // Don't allow deactivating the last active agent
        if (userState.activeAgents.length <= 1) {
            showToast('Vsaj en agent mora biti aktiven', 'warning');
            return;
        }
        
        // Remove from active agents
        userState.activeAgents = userState.activeAgents.filter(id => id !== agentId);
    } else {
        // Add to active agents
        userState.activeAgents.push(agentId);
    }
    
    // Update UI
    updateAgentList();
    
    // Save to localStorage
    saveActiveAgents();
    
    // Show notification
    const agent = availableAgents[agentId];
    showToast(`Agent ${agent.name} ${isCurrentlyActive ? 'deaktiviran' : 'aktiviran'}`, 'info');
    
    // Update agent orchestration
    updateAgentOrchestration();
}

function saveActiveAgents() {
    localStorage.setItem('activeAgents', JSON.stringify(userState.activeAgents));
}

function setupAgentCommunication() {
    // Set up communication channels between agents
    console.log('Setting up agent communication channels');
    
    // Create a message bus for inter-agent communication
    window.agentMessageBus = {
        publish: function(topic, message) {
            console.log(`Message published to ${topic}:`, message);
            document.dispatchEvent(new CustomEvent('agent-message', { 
                detail: { topic, message } 
            }));
        },
        subscribe: function(topic, callback) {
            const handler = (e) => {
                if (e.detail.topic === topic) {
                    callback(e.detail.message);
                }
            };
            document.addEventListener('agent-message', handler);
            return handler; // Return handler for unsubscribe
        },
        unsubscribe: function(handler) {
            document.removeEventListener('agent-message', handler);
        }
    };
}

function updateAgentOrchestration() {
    // Update task distribution among active agents
    const activeAgentIds = userState.activeAgents;
    
    // Create agent capabilities map
    const capabilities = {};
    activeAgentIds.forEach(agentId => {
        const agent = availableAgents[agentId];
        agent.capabilities.forEach(capability => {
            if (!capabilities[capability]) {
                capabilities[capability] = [];
            }
            capabilities[capability].push(agentId);
        });
    });
    
    console.log('Updated agent orchestration with capabilities:', capabilities);
    
    // Store capabilities for task routing
    userState.agentCapabilities = capabilities;
}

function routeTaskToAgents(task) {
    // Determine which agents should handle this task based on required capabilities
    const requiredCapabilities = determineTaskCapabilities(task);
    const selectedAgents = [];
    
    requiredCapabilities.forEach(capability => {
        if (userState.agentCapabilities[capability]) {
            // Find agents with this capability that aren't already selected
            const agents = userState.agentCapabilities[capability].filter(
                agentId => !selectedAgents.includes(agentId)
            );
            
            if (agents.length > 0) {
                // Select the first available agent with this capability
                selectedAgents.push(agents[0]);
            }
        }
    });
    
    // If no specific agents were selected, use all active agents
    if (selectedAgents.length === 0) {
        selectedAgents.push(...userState.activeAgents);
    }
    
    console.log(`Task routed to agents:`, selectedAgents);
    return selectedAgents;
}

function determineTaskCapabilities(task) {
    // Analyze task to determine required capabilities
    const capabilities = [];
    
    // Check for code-related keywords
    if (/\b(code|program|function|class|algorithm|debug)\b/i.test(task)) {
        capabilities.push('code');
    }
    
    // Check for reasoning/analysis keywords
    if (/\b(explain|analyze|compare|evaluate|reason|why|how)\b/i.test(task)) {
        capabilities.push('reasoning');
    }
    
    // Check for creative tasks
    if (/\b(create|design|generate|imagine|story|creative)\b/i.test(task)) {
        capabilities.push('creativity');
    }
    
    // Check for visual/multimodal tasks
    if (/\b(image|picture|photo|video|visual|draw|render)\b/i.test(task)) {
        capabilities.push('vision');
        capabilities.push('multimodal');
    }
    
    // If no specific capabilities detected, default to text
    if (capabilities.length === 0) {
        capabilities.push('text');
    }
    
    return capabilities;
}

function initUI() {
    // Set initial view based on user state
    setActiveView(userState.activeView);
    
    // Apply theme from user settings
    applyTheme(userState.settings.theme);
    
    // Initialize dashboard widgets
    initDashboardWidgets();
}

function initEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => setActiveView(btn.dataset.view));
    });
    
    // Chat functionality
    document.getElementById('chat-form').addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });
    document.getElementById('chat-input').addEventListener('keydown', handleKeydown);
    
    // Media inputs
    const imageInput = document.getElementById('image-input');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
    }
    document.getElementById('remove-image-btn')?.addEventListener('click', removeUploadedImage);
    
    // Voice input
    const micBtn = document.querySelector('.chat-btn [class*="fa-microphone"]')?.parentElement;
    if (micBtn) {
        micBtn.addEventListener('click', toggleSpeechRecognition);
    }
    
    // Settings
    document.getElementById('theme-switch')?.addEventListener('change', toggleTheme);
    document.getElementById('ai-persona')?.addEventListener('change', updateAIPersona);
    document.getElementById('language-select')?.addEventListener('change', updateLanguage);
    document.getElementById('clear-history-btn')?.addEventListener('click', clearHistory);
    document.getElementById('encryption-switch')?.addEventListener('change', toggleEncryption);
    document.getElementById('autosave-switch')?.addEventListener('change', toggleAutoSave);
    document.getElementById('notifications-switch')?.addEventListener('change', toggleNotifications);
    
    // Collaboration
    document.getElementById('collaborate-btn')?.addEventListener('click', toggleCollaboration);
    
    // Multi-agent system
    document.querySelectorAll('.agent-item').forEach(item => {
        item.addEventListener('click', () => toggleAgent(item.dataset.agentId));
    });
    
    // Workflow
    document.getElementById('add-node-btn')?.addEventListener('click', addWorkflowNode);
    
    // Dashboard widgets
    document.querySelectorAll('.widget-btn').forEach(btn => {
        btn.addEventListener('click', handleWidgetControl);
    });
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'sl-SI';

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            document.getElementById('chat-input').value = transcript;
            document.getElementById('transcription-status').textContent = "Poslušam...";
        };

        recognition.onend = () => {
            if (isListening) {
                // If it stops unexpectedly, restart it
                recognition.start();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            showToast(`Napaka pri prepoznavi: ${event.error}`, 'error');
            stopListening();
        };
    } else {
        document.getElementById('mic-btn').style.display = 'none';
        console.warn('Speech Recognition not supported in this browser.');
    }
}


// --- View Management ---
function setActiveView(viewId) {
    // Update active view in state
    userState.activeView = viewId;
    
    // Update UI
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId)?.classList.add('active');
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewId);
    });
    
    // Save preference
    localStorage.setItem('activeView', viewId);
}

// --- User Settings ---
function loadUserSettings() {
    // Apply theme
    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
        themeSwitch.checked = userState.settings.theme === 'light';
        applyTheme(userState.settings.theme);
    }
    
    // Set AI persona
    const aiPersonaSelect = document.getElementById('ai-persona');
    if (aiPersonaSelect) {
        aiPersonaSelect.value = userState.settings.aiPersona;
    }
    
    // Set language
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.value = userState.settings.language;
    }
    
    // Set encryption
    const encryptionSwitch = document.getElementById('encryption-switch');
    if (encryptionSwitch) {
        encryptionSwitch.checked = userState.settings.encryption;
    }
    
    // Set auto-save
    const autoSaveSwitch = document.getElementById('autosave-switch');
    if (autoSaveSwitch) {
        autoSaveSwitch.checked = userState.settings.autoSave;
    }
    
    // Set notifications
    const notificationsSwitch = document.getElementById('notifications-switch');
    if (notificationsSwitch) {
        notificationsSwitch.checked = userState.settings.notifications;
    }
}

function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
}

function toggleTheme(event) {
    const theme = event.target.checked ? 'light' : 'dark';
    userState.settings.theme = theme;
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    showToast(`Tema spremenjena: ${theme === 'light' ? 'svetla' : 'temna'}`, 'info');
}

function updateAIPersona(event) {
    userState.settings.aiPersona = event.target.value;
    localStorage.setItem('aiPersona', event.target.value);
}

function updateLanguage(event) {
    userState.settings.language = event.target.value;
    localStorage.setItem('language', event.target.value);
    // Update UI language
    updateUILanguage(event.target.value);
}

function toggleEncryption(event) {
    userState.settings.encryption = event.target.checked;
    localStorage.setItem('encryption', event.target.checked);
    showToast(`Šifriranje ${event.target.checked ? 'omogočeno' : 'onemogočeno'}`, event.target.checked ? 'success' : 'warning');
    
    // If enabling encryption, show security notice
    if (event.target.checked) {
        showToast('Vsi novi podatki bodo šifrirani', 'info');
        setupEncryption();
    }
}

// Security Functions
function initSecurity() {
    // Initialize security features
    setupEncryption();
    setupUserAuthentication();
    setupPermissions();
    
    // Check for secure connection
    checkSecureConnection();
    
    showToast('Varnostne funkcije inicializirane', 'success');
}

function setupEncryption() {
    // Set up encryption for sensitive data
    if (userState.settings.encryption) {
        // Initialize encryption library
        window.encryptionEnabled = true;
        console.log('Encryption enabled for sensitive data');
    } else {
        window.encryptionEnabled = false;
    }
}

function encryptData(data) {
    if (!window.encryptionEnabled) return data;
    
    try {
        // Simple encryption for demo purposes
        // In production, use a proper encryption library
        const encryptedData = btoa(JSON.stringify(data));
        return `encrypted:${encryptedData}`;
    } catch (error) {
        console.error('Encryption error:', error);
        showToast('Napaka pri šifriranju podatkov', 'error');
        return data;
    }
}

function decryptData(encryptedData) {
    if (!window.encryptionEnabled) return encryptedData;
    
    try {
        // Simple decryption for demo purposes
        if (typeof encryptedData === 'string' && encryptedData.startsWith('encrypted:')) {
            const data = encryptedData.replace('encrypted:', '');
            return JSON.parse(atob(data));
        }
        return encryptedData;
    } catch (error) {
        console.error('Decryption error:', error);
        showToast('Napaka pri dešifriranju podatkov', 'error');
        return encryptedData;
    }
}

function setupUserAuthentication() {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (token) {
        validateToken(token);
    } else {
        // For demo purposes, we'll create a guest user
        createGuestUser();
    }
}

function validateToken(token) {
    // In a real app, validate token with server
    console.log('Validating authentication token');
    
    // Simulate token validation
    setTimeout(() => {
        // For demo, assume token is valid
        userState.user = {
            id: 'user-123',
            name: 'Demo User',
            role: 'user',
            permissions: ['read', 'write', 'execute']
        };
        
        updateUserInterface();
    }, 100);
}

function createGuestUser() {
    // Create a guest user with limited permissions
    userState.user = {
        id: 'guest-' + Math.random().toString(36).substring(2, 9),
        name: 'Gost',
        role: 'guest',
        permissions: ['read']
    };
    
    updateUserInterface();
}

function updateUserInterface() {
    // Update UI based on user permissions
    const userRoleElement = document.getElementById('user-role');
    if (userRoleElement) {
        userRoleElement.textContent = userState.user.role === 'guest' ? 'Gost' : 'Uporabnik';
    }
    
    // Show/hide elements based on permissions
    document.querySelectorAll('[data-requires-permission]').forEach(element => {
        const requiredPermission = element.dataset.requiresPermission;
        if (!userState.user.permissions.includes(requiredPermission)) {
            element.style.display = 'none';
        } else {
            element.style.display = '';
        }
    });
}

function setupPermissions() {
    // Set up permission system
    window.permissions = {
        check: function(permission) {
            if (!userState.user || !userState.user.permissions) return false;
            return userState.user.permissions.includes(permission);
        },
        require: function(permission, callback, fallback) {
            if (this.check(permission)) {
                callback();
            } else {
                if (fallback) fallback();
                showToast('Nimate dovoljenja za to dejanje', 'error');
            }
        }
    };
}

function checkSecureConnection() {
    // Check if connection is secure (HTTPS)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        showToast('Opozorilo: Povezava ni varna (HTTPS)', 'warning', 10000);
    }
}

function toggleAutoSave(event) {
    userState.settings.autoSave = event.target.checked;
    localStorage.setItem('autoSave', event.target.checked);
}

function toggleNotifications(event) {
    userState.settings.notifications = event.target.checked;
    localStorage.setItem('notifications', event.target.checked);
}

function clearHistory() {
    // Clear chat history from UI
    const chatLog = document.querySelector('.chat-log');
    if (chatLog) {
        chatLog.innerHTML = '';
    }
    
    // Clear history from server
    fetch('/api/history/clear', { method: 'POST' })
        .then(response => {
            if (response.ok) {
                showToast('Zgodovina pogovorov izbrisana', 'success');
            } else {
                showToast('Napaka pri brisanju zgodovine', 'error');
            }
        })
        .catch(error => {
            console.error('Error clearing history:', error);
            showToast('Napaka pri brisanju zgodovine', 'error');
        });
}


// --- CHAT LOGIC ---
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message && !uploadedImage) return;
    
    // Abort previous stream if exists
    if (chatController) {
        chatController.abort();
    }
    chatController = new AbortController();

    appendMessage('user', message);
    if (uploadedImage) {
        appendMessage('user', { image: uploadedImage.url });
    }
    input.value = '';
    input.style.height = 'auto';
    removeUploadedImage();

    showSkeletonLoader();

    try {
        const aiPersona = document.getElementById('ai-persona').value;
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                image: uploadedImage ? { type: uploadedImage.type, data: uploadedImage.data } : null,
                persona: aiPersona,
            }),
            signal: chatController.signal,
        });
        
        removeSkeletonLoader();
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const widgetDataHeader = response.headers.get('X-Widget-Data');
        if (widgetDataHeader) {
            const widgetData = JSON.parse(decodeURIComponent(widgetDataHeader));
            renderWidget(widgetData);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiMessage = appendMessage('ai', '');

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            updateMessage(aiMessage, chunk, true);
        }
        
    } catch (error) {
        removeSkeletonLoader();
        if (error.name !== 'AbortError') {
            appendMessage('ai', `Prišlo je do napake: ${error.message}`);
            console.error('Error sending message:', error);
        }
    } finally {
        chatController = null;
    }
}

function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
    // Auto-resize textarea
    event.target.style.height = 'auto';
    event.target.style.height = (event.target.scrollHeight) + 'px';
}

// --- MESSAGE RENDERING ---
function appendMessage(sender, content) {
    const chatLog = document.getElementById('chat-log');
    const template = document.getElementById('chat-message-template');
    const messageClone = template.content.cloneNode(true);
    const messageElement = messageClone.querySelector('.chat-message');
    const contentElement = messageClone.querySelector('.message-content');

    messageElement.classList.add(sender);

    if (typeof content === 'string') {
        contentElement.textContent = content;
    } else if (content.image) {
        const img = document.createElement('img');
        img.src = content.image;
        img.style.maxWidth = '200px';
        img.style.borderRadius = '8px';
        contentElement.appendChild(img);
    }
    
    chatLog.appendChild(messageClone);
    chatLog.scrollTop = chatLog.scrollHeight;
    return messageElement;
}

function updateMessage(messageElement, chunk, stream = false) {
    const contentElement = messageElement.querySelector('.message-content');
    if (stream) {
        // Simple markdown for bold and italic
        let currentText = contentElement.innerHTML;
        currentText += chunk
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        contentElement.innerHTML = currentText;
    } else {
        contentElement.innerHTML = chunk;
    }
    
    // Add copy buttons to new code blocks
    const codeBlocks = contentElement.querySelectorAll('pre:not(.code-block-initialized)');
    codeBlocks.forEach(block => {
        block.classList.add('code-block-initialized');
        const btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.textContent = 'Kopiraj';
        btn.onclick = () => {
            const code = block.querySelector('code').innerText;
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = 'Kopirano!';
                setTimeout(() => { btn.textContent = 'Kopiraj'; }, 2000);
            });
        };
        block.appendChild(btn);
    });

    const chatLog = document.getElementById('chat-log');
    chatLog.scrollTop = chatLog.scrollHeight;
}

function showSkeletonLoader() {
    const chatLog = document.getElementById('chat-log');
    const skeletonMessage = appendMessage('ai', '');
    skeletonMessage.id = 'skeleton-loader';
    const content = skeletonMessage.querySelector('.message-content');
    content.innerHTML = `<div class="skeleton" style="height: 20px; width: 80%; margin-bottom: 10px;"></div><div class="skeleton" style="height: 20px; width: 60%;"></div>`;
}

function removeSkeletonLoader() {
    const loader = document.getElementById('skeleton-loader');
    if (loader) {
        loader.remove();
    }
}

// --- IMAGE HANDLING ---
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result.split(',')[1];
            uploadedImage = {
                url: e.target.result,
                data: base64String,
                type: file.type
            };
            
            const preview = document.getElementById('image-preview');
            const previewContainer = document.getElementById('image-preview-container');
            preview.src = e.target.result;
            previewContainer.classList.add('visible');
        };
        reader.readAsDataURL(file);
    }
}

function removeUploadedImage() {
    uploadedImage = null;
    document.getElementById('image-upload').value = '';
    document.getElementById('image-preview-container').classList.remove('visible');
}


// --- WIDGETS ---
function renderWidget(data) {
    if (data.type === 'recipe') {
        const template = document.getElementById('recipe-widget-template');
        const widget = template.content.cloneNode(true);
        const widgetElement = widget.querySelector('.widget');

        widget.querySelector('.recipe-title').textContent = data.content.name;
        widget.querySelector('.recipe-description').textContent = data.content.description;
        
        const ingredientsList = widget.querySelector('.recipe-ingredients');
        data.content.ingredients.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ingredientsList.appendChild(li);
        });
        
        const instructionsList = widget.querySelector('.recipe-instructions');
        data.content.instructions.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            instructionsList.appendChild(li);
        });
        
        widget.querySelector('.close-widget-btn').onclick = () => {
            widgetElement.style.animation = 'fade-out 0.3s ease forwards';
            setTimeout(() => widgetElement.remove(), 300);
        };
        
        document.getElementById('dynamic-widgets-container').prepend(widget);
    }
}


// --- SPEECH RECOGNITION ---
function toggleSpeechRecognition() {
    if (!recognition) return;
    isListening ? stopListening() : startListening();
}

function startListening() {
    isListening = true;
    recognition.start();
    document.getElementById('mic-btn').classList.add('recording');
    document.getElementById('transcription-status').textContent = "Poslušam...";
}

function stopListening() {
    isListening = false;
    recognition.stop();
    document.getElementById('mic-btn').classList.remove('recording');
    document.getElementById('transcription-status').textContent = "";
    if (document.getElementById('chat-input').value.trim()) {
        sendMessage();
    }
}

// --- IMAGE & VIDEO GENERATION ---
async function generateImage() {
    const prompt = document.getElementById('image-prompt').value;
    if (!prompt) {
        showToast('Vnesite opis slike.', 'error');
        return;
    }

    const loader = document.getElementById('image-loader');
    const container = document.getElementById('generated-image-container');
    loader.style.display = 'flex';
    container.innerHTML = '';

    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        if (!response.ok) throw new Error('Generiranje slike ni uspelo.');
        
        const { imageUrl } = await response.json();
        const img = document.createElement('img');
        img.src = imageUrl;
        container.appendChild(img);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        loader.style.display = 'none';
    }
}

async function generateVideo() {
    const prompt = document.getElementById('video-prompt').value;
    if (!prompt) {
        showToast('Vnesite opis videa.', 'error');
        return;
    }

    const loader = document.getElementById('video-loader');
    const statusText = document.getElementById('video-status-text');
    const container = document.getElementById('generated-video-container');
    
    loader.style.display = 'flex';
    statusText.textContent = 'Začenjam proces...';
    container.innerHTML = '';

    try {
        const startResponse = await fetch('/api/generate-video-start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        if (!startResponse.ok) throw new Error('Napaka pri zagonu generiranja videa.');
        
        const { operationName } = await startResponse.json();
        
        const statusMessages = ["Pripravljam sceno...", "Komponiram kadre...", "Urejam osvetlitev...", "Dodajam končne detajle..."];
        let messageIndex = 0;

        const interval = setInterval(async () => {
            try {
                const statusResponse = await fetch(`/api/video-status/${operationName}`);
                const data = await statusResponse.json();
                
                statusText.textContent = statusMessages[messageIndex % statusMessages.length];
                messageIndex++;

                if (data.done) {
                    clearInterval(interval);
                    statusText.textContent = 'Video je končan!';
                    const videoUrl = `/api/videos/${encodeURIComponent(data.uri)}`;
                    const video = document.createElement('video');
                    video.src = videoUrl;
                    video.controls = true;
                    container.appendChild(video);
                    loader.style.display = 'none';
                }
            } catch (err) {
                clearInterval(interval);
                throw new Error('Napaka pri preverjanju statusa videa.');
            }
        }, 10000); // Check every 10 seconds

    } catch (error) {
        showToast(error.message, 'error');
        loader.style.display = 'none';
    }
}

// --- UTILITIES ---
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    // Automatically remove toast after duration
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, duration);
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}
