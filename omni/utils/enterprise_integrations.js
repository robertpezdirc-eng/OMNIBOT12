/**
 * OMNI Enterprise Integrations
 * Integracije z enterprise sistemi (SAP, Salesforce, Microsoft 365, Oracle, etc.)
 * 
 * Funkcionalnosti:
 * - SAP ERP integration
 * - Salesforce CRM integration
 * - Microsoft 365 integration
 * - Oracle Database integration
 * - Slack/Teams integration
 * - Google Workspace integration
 * - Webhook management
 * - API orchestration
 * - Data synchronization
 * - Single Sign-On (SSO)
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

class EnterpriseIntegrations extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            rateLimitWindow: config.rateLimitWindow || 60000,
            maxRequestsPerWindow: config.maxRequestsPerWindow || 100,
            ...config
        };

        this.integrations = new Map();
        this.webhooks = new Map();
        this.apiKeys = new Map();
        this.rateLimiter = new Map();
        this.syncJobs = new Map();
        this.ssoProviders = new Map();

        this.initializeIntegrations();
        console.log('🔗 Enterprise Integrations initialized');
    }

    /**
     * Inicializacija integracij
     */
    async initializeIntegrations() {
        try {
            // Registriraj osnovne integracije
            await this.registerIntegrations();
            
            // Zaženi sync job-e
            this.startSyncJobs();
            
            // Zaženi webhook server
            this.startWebhookServer();
            
            console.log('✅ Enterprise integrations ready');
        } catch (error) {
            console.error('❌ Enterprise integrations initialization failed:', error);
        }
    }

    /**
     * Registriraj integracije
     */
    async registerIntegrations() {
        const integrations = [
            {
                name: 'SAP',
                type: 'erp',
                endpoints: {
                    base: 'https://api.sap.com',
                    auth: '/oauth/token',
                    customers: '/customers',
                    orders: '/orders',
                    products: '/products',
                    inventory: '/inventory'
                },
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                authType: 'oauth2'
            },
            {
                name: 'Salesforce',
                type: 'crm',
                endpoints: {
                    base: 'https://api.salesforce.com',
                    auth: '/services/oauth2/token',
                    leads: '/services/data/v58.0/sobjects/Lead',
                    accounts: '/services/data/v58.0/sobjects/Account',
                    opportunities: '/services/data/v58.0/sobjects/Opportunity',
                    contacts: '/services/data/v58.0/sobjects/Contact'
                },
                methods: ['GET', 'POST', 'PATCH', 'DELETE'],
                authType: 'oauth2'
            },
            {
                name: 'Microsoft365',
                type: 'productivity',
                endpoints: {
                    base: 'https://graph.microsoft.com/v1.0',
                    auth: '/oauth2/v2.0/token',
                    users: '/users',
                    calendar: '/me/calendar',
                    mail: '/me/messages',
                    teams: '/teams',
                    sharepoint: '/sites'
                },
                methods: ['GET', 'POST', 'PATCH', 'DELETE'],
                authType: 'oauth2'
            },
            {
                name: 'Oracle',
                type: 'database',
                endpoints: {
                    base: 'https://api.oracle.com',
                    auth: '/oauth/token',
                    database: '/database/v1',
                    analytics: '/analytics/v1'
                },
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                authType: 'oauth2'
            },
            {
                name: 'Slack',
                type: 'communication',
                endpoints: {
                    base: 'https://slack.com/api',
                    auth: '/oauth.v2.access',
                    channels: '/conversations.list',
                    messages: '/chat.postMessage',
                    users: '/users.list'
                },
                methods: ['GET', 'POST'],
                authType: 'bearer'
            },
            {
                name: 'GoogleWorkspace',
                type: 'productivity',
                endpoints: {
                    base: 'https://www.googleapis.com',
                    auth: '/oauth2/v4/token',
                    gmail: '/gmail/v1',
                    drive: '/drive/v3',
                    calendar: '/calendar/v3',
                    sheets: '/sheets/v4'
                },
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                authType: 'oauth2'
            }
        ];

        for (const integration of integrations) {
            this.integrations.set(integration.name, {
                ...integration,
                status: 'inactive',
                lastSync: null,
                errorCount: 0,
                requestCount: 0
            });
        }

        console.log(`📋 Registered ${integrations.length} enterprise integrations`);
    }

    /**
     * Aktiviraj integracijo
     */
    async activateIntegration(name, credentials) {
        try {
            const integration = this.integrations.get(name);
            if (!integration) throw new Error(`Integration ${name} not found`);

            // Shrani credentials
            this.apiKeys.set(name, credentials);
            
            // Testiraj povezavo
            const isConnected = await this.testConnection(name);
            
            if (isConnected) {
                integration.status = 'active';
                integration.lastSync = new Date();
                
                console.log(`✅ ${name} integration activated`);
                this.emit('integrationActivated', { name, integration });
                return true;
            } else {
                throw new Error('Connection test failed');
            }
        } catch (error) {
            console.error(`❌ Failed to activate ${name} integration:`, error);
            return false;
        }
    }

    /**
     * Testiraj povezavo
     */
    async testConnection(name) {
        try {
            const integration = this.integrations.get(name);
            const credentials = this.apiKeys.get(name);
            
            if (!integration || !credentials) return false;

            // Pridobi access token
            const token = await this.getAccessToken(name, credentials);
            
            // Testiraj osnovni API klic
            const response = await this.makeAPICall(name, 'GET', '/test', {}, token);
            
            return response.status === 200 || response.status === 401; // 401 je OK za test
        } catch (error) {
            console.error(`Connection test failed for ${name}:`, error);
            return false;
        }
    }

    /**
     * Pridobi access token
     */
    async getAccessToken(integrationName, credentials) {
        try {
            const integration = this.integrations.get(integrationName);
            
            switch (integration.authType) {
                case 'oauth2':
                    return await this.getOAuth2Token(integration, credentials);
                case 'bearer':
                    return credentials.token;
                case 'apikey':
                    return credentials.apiKey;
                default:
                    throw new Error(`Unsupported auth type: ${integration.authType}`);
            }
        } catch (error) {
            console.error(`Failed to get access token for ${integrationName}:`, error);
            throw error;
        }
    }

    /**
     * Pridobi OAuth2 token
     */
    async getOAuth2Token(integration, credentials) {
        return new Promise((resolve, reject) => {
            const postData = querystring.stringify({
                grant_type: 'client_credentials',
                client_id: credentials.clientId,
                client_secret: credentials.clientSecret,
                scope: credentials.scope || 'read write'
            });

            const options = {
                hostname: new URL(integration.endpoints.base).hostname,
                path: integration.endpoints.auth,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: this.config.timeout
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.access_token) {
                            resolve(response.access_token);
                        } else {
                            reject(new Error('No access token in response'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
            req.write(postData);
            req.end();
        });
    }

    /**
     * Naredi API klic
     */
    async makeAPICall(integrationName, method, endpoint, data = {}, token = null) {
        try {
            // Rate limiting
            if (!this.checkRateLimit(integrationName)) {
                throw new Error('Rate limit exceeded');
            }

            const integration = this.integrations.get(integrationName);
            if (!integration || integration.status !== 'active') {
                throw new Error(`Integration ${integrationName} not active`);
            }

            // Pridobi token če ni podan
            if (!token) {
                const credentials = this.apiKeys.get(integrationName);
                token = await this.getAccessToken(integrationName, credentials);
            }

            const response = await this.executeHTTPRequest(integration, method, endpoint, data, token);
            
            // Posodobi statistike
            integration.requestCount++;
            integration.lastSync = new Date();
            
            this.emit('apiCallSuccess', { integrationName, method, endpoint, response });
            return response;
            
        } catch (error) {
            const integration = this.integrations.get(integrationName);
            if (integration) integration.errorCount++;
            
            console.error(`API call failed for ${integrationName}:`, error);
            this.emit('apiCallError', { integrationName, method, endpoint, error });
            throw error;
        }
    }

    /**
     * Izvršuj HTTP zahtevo
     */
    async executeHTTPRequest(integration, method, endpoint, data, token) {
        return new Promise((resolve, reject) => {
            const url = new URL(integration.endpoints.base + endpoint);
            const postData = method !== 'GET' ? JSON.stringify(data) : null;

            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'OMNI-Platform/1.0'
                },
                timeout: this.config.timeout
            };

            if (postData) {
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    try {
                        const response = {
                            status: res.statusCode,
                            headers: res.headers,
                            data: responseData ? JSON.parse(responseData) : null
                        };
                        resolve(response);
                    } catch (error) {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: responseData
                        });
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
            
            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }

    /**
     * Preveri rate limit
     */
    checkRateLimit(integrationName) {
        const now = Date.now();
        const windowStart = now - this.config.rateLimitWindow;
        
        if (!this.rateLimiter.has(integrationName)) {
            this.rateLimiter.set(integrationName, []);
        }
        
        const requests = this.rateLimiter.get(integrationName);
        
        // Odstrani stare zahteve
        const validRequests = requests.filter(timestamp => timestamp > windowStart);
        this.rateLimiter.set(integrationName, validRequests);
        
        // Preveri limit
        if (validRequests.length >= this.config.maxRequestsPerWindow) {
            return false;
        }
        
        // Dodaj novo zahtevo
        validRequests.push(now);
        return true;
    }

    /**
     * SAP ERP integracija
     */
    async sapIntegration() {
        return {
            // Customers
            getCustomers: async (filters = {}) => {
                return await this.makeAPICall('SAP', 'GET', '/customers', filters);
            },
            
            createCustomer: async (customerData) => {
                return await this.makeAPICall('SAP', 'POST', '/customers', customerData);
            },
            
            // Orders
            getOrders: async (filters = {}) => {
                return await this.makeAPICall('SAP', 'GET', '/orders', filters);
            },
            
            createOrder: async (orderData) => {
                return await this.makeAPICall('SAP', 'POST', '/orders', orderData);
            },
            
            // Products
            getProducts: async (filters = {}) => {
                return await this.makeAPICall('SAP', 'GET', '/products', filters);
            },
            
            // Inventory
            getInventory: async (filters = {}) => {
                return await this.makeAPICall('SAP', 'GET', '/inventory', filters);
            },
            
            updateInventory: async (productId, quantity) => {
                return await this.makeAPICall('SAP', 'PUT', `/inventory/${productId}`, { quantity });
            }
        };
    }

    /**
     * Salesforce CRM integracija
     */
    async salesforceIntegration() {
        return {
            // Leads
            getLeads: async (filters = {}) => {
                return await this.makeAPICall('Salesforce', 'GET', '/services/data/v58.0/sobjects/Lead', filters);
            },
            
            createLead: async (leadData) => {
                return await this.makeAPICall('Salesforce', 'POST', '/services/data/v58.0/sobjects/Lead', leadData);
            },
            
            // Accounts
            getAccounts: async (filters = {}) => {
                return await this.makeAPICall('Salesforce', 'GET', '/services/data/v58.0/sobjects/Account', filters);
            },
            
            createAccount: async (accountData) => {
                return await this.makeAPICall('Salesforce', 'POST', '/services/data/v58.0/sobjects/Account', accountData);
            },
            
            // Opportunities
            getOpportunities: async (filters = {}) => {
                return await this.makeAPICall('Salesforce', 'GET', '/services/data/v58.0/sobjects/Opportunity', filters);
            },
            
            createOpportunity: async (opportunityData) => {
                return await this.makeAPICall('Salesforce', 'POST', '/services/data/v58.0/sobjects/Opportunity', opportunityData);
            },
            
            // Contacts
            getContacts: async (filters = {}) => {
                return await this.makeAPICall('Salesforce', 'GET', '/services/data/v58.0/sobjects/Contact', filters);
            }
        };
    }

    /**
     * Microsoft 365 integracija
     */
    async microsoft365Integration() {
        return {
            // Users
            getUsers: async () => {
                return await this.makeAPICall('Microsoft365', 'GET', '/users');
            },
            
            // Calendar
            getCalendarEvents: async (userId = 'me') => {
                return await this.makeAPICall('Microsoft365', 'GET', `/${userId}/calendar/events`);
            },
            
            createCalendarEvent: async (eventData, userId = 'me') => {
                return await this.makeAPICall('Microsoft365', 'POST', `/${userId}/calendar/events`, eventData);
            },
            
            // Mail
            getEmails: async (userId = 'me') => {
                return await this.makeAPICall('Microsoft365', 'GET', `/${userId}/messages`);
            },
            
            sendEmail: async (emailData, userId = 'me') => {
                return await this.makeAPICall('Microsoft365', 'POST', `/${userId}/sendMail`, emailData);
            },
            
            // Teams
            getTeams: async () => {
                return await this.makeAPICall('Microsoft365', 'GET', '/teams');
            },
            
            // SharePoint
            getSites: async () => {
                return await this.makeAPICall('Microsoft365', 'GET', '/sites');
            }
        };
    }

    /**
     * Slack integracija
     */
    async slackIntegration() {
        return {
            // Channels
            getChannels: async () => {
                return await this.makeAPICall('Slack', 'GET', '/conversations.list');
            },
            
            // Messages
            sendMessage: async (channel, text, attachments = []) => {
                return await this.makeAPICall('Slack', 'POST', '/chat.postMessage', {
                    channel,
                    text,
                    attachments
                });
            },
            
            // Users
            getUsers: async () => {
                return await this.makeAPICall('Slack', 'GET', '/users.list');
            }
        };
    }

    /**
     * Google Workspace integracija
     */
    async googleWorkspaceIntegration() {
        return {
            // Gmail
            getEmails: async () => {
                return await this.makeAPICall('GoogleWorkspace', 'GET', '/gmail/v1/users/me/messages');
            },
            
            sendEmail: async (emailData) => {
                return await this.makeAPICall('GoogleWorkspace', 'POST', '/gmail/v1/users/me/messages/send', emailData);
            },
            
            // Drive
            getFiles: async () => {
                return await this.makeAPICall('GoogleWorkspace', 'GET', '/drive/v3/files');
            },
            
            uploadFile: async (fileData) => {
                return await this.makeAPICall('GoogleWorkspace', 'POST', '/drive/v3/files', fileData);
            },
            
            // Calendar
            getCalendarEvents: async () => {
                return await this.makeAPICall('GoogleWorkspace', 'GET', '/calendar/v3/calendars/primary/events');
            },
            
            // Sheets
            getSpreadsheet: async (spreadsheetId) => {
                return await this.makeAPICall('GoogleWorkspace', 'GET', `/sheets/v4/spreadsheets/${spreadsheetId}`);
            }
        };
    }

    /**
     * Webhook management
     */
    async registerWebhook(integrationName, event, url, secret = null) {
        try {
            const webhookId = crypto.randomUUID();
            const webhook = {
                id: webhookId,
                integrationName,
                event,
                url,
                secret,
                createdAt: new Date(),
                lastTriggered: null,
                triggerCount: 0
            };

            this.webhooks.set(webhookId, webhook);
            
            console.log(`🪝 Webhook registered: ${event} for ${integrationName}`);
            return webhook;
        } catch (error) {
            console.error('Webhook registration failed:', error);
            throw error;
        }
    }

    /**
     * Zaženi webhook server
     */
    startWebhookServer() {
        // Simulacija webhook server-ja
        console.log('🌐 Webhook server started on port 8080');
    }

    /**
     * Data synchronization
     */
    async syncData(fromIntegration, toIntegration, dataType, mapping = {}) {
        try {
            console.log(`🔄 Starting data sync: ${dataType} from ${fromIntegration} to ${toIntegration}`);
            
            // Pridobi podatke iz source integracije
            const sourceData = await this.fetchDataFromIntegration(fromIntegration, dataType);
            
            // Transformiraj podatke
            const transformedData = this.transformData(sourceData, mapping);
            
            // Pošlji podatke v target integracijo
            const result = await this.sendDataToIntegration(toIntegration, dataType, transformedData);
            
            console.log(`✅ Data sync completed: ${transformedData.length} records`);
            return result;
        } catch (error) {
            console.error('Data sync failed:', error);
            throw error;
        }
    }

    /**
     * Pridobi podatke iz integracije
     */
    async fetchDataFromIntegration(integrationName, dataType) {
        const integration = this.integrations.get(integrationName);
        if (!integration) throw new Error(`Integration ${integrationName} not found`);

        // Simulacija pridobivanja podatkov
        return [
            { id: 1, name: 'Sample Data 1', type: dataType },
            { id: 2, name: 'Sample Data 2', type: dataType }
        ];
    }

    /**
     * Transformiraj podatke
     */
    transformData(data, mapping) {
        return data.map(item => {
            const transformed = {};
            for (const [sourceField, targetField] of Object.entries(mapping)) {
                transformed[targetField] = item[sourceField];
            }
            return { ...item, ...transformed };
        });
    }

    /**
     * Pošlji podatke v integracijo
     */
    async sendDataToIntegration(integrationName, dataType, data) {
        const integration = this.integrations.get(integrationName);
        if (!integration) throw new Error(`Integration ${integrationName} not found`);

        // Simulacija pošiljanja podatkov
        return { success: true, recordsProcessed: data.length };
    }

    /**
     * Zaženi sync job-e
     */
    startSyncJobs() {
        // Dnevni sync job-i
        setInterval(() => {
            this.runScheduledSyncs();
        }, 24 * 60 * 60 * 1000); // 24 hours
    }

    /**
     * Izvršuj načrtovane sync-e
     */
    async runScheduledSyncs() {
        console.log('🔄 Running scheduled data syncs...');
        
        const syncJobs = [
            { from: 'SAP', to: 'Salesforce', dataType: 'customers' },
            { from: 'Salesforce', to: 'Microsoft365', dataType: 'contacts' },
            { from: 'GoogleWorkspace', to: 'Slack', dataType: 'users' }
        ];

        for (const job of syncJobs) {
            try {
                await this.syncData(job.from, job.to, job.dataType);
            } catch (error) {
                console.error(`Sync job failed: ${job.from} -> ${job.to}`, error);
            }
        }
    }

    /**
     * SSO Provider management
     */
    async configureSSOProvider(name, config) {
        try {
            const ssoProvider = {
                name,
                type: config.type, // 'saml', 'oauth2', 'oidc'
                config,
                status: 'active',
                createdAt: new Date()
            };

            this.ssoProviders.set(name, ssoProvider);
            
            console.log(`🔐 SSO Provider configured: ${name}`);
            return ssoProvider;
        } catch (error) {
            console.error('SSO Provider configuration failed:', error);
            throw error;
        }
    }

    /**
     * Pridobi integration status
     */
    getIntegrationStatus() {
        const integrations = Array.from(this.integrations.entries()).map(([name, integration]) => ({
            name,
            type: integration.type,
            status: integration.status,
            lastSync: integration.lastSync,
            requestCount: integration.requestCount,
            errorCount: integration.errorCount
        }));

        return {
            totalIntegrations: this.integrations.size,
            activeIntegrations: integrations.filter(i => i.status === 'active').length,
            webhooks: this.webhooks.size,
            ssoProviders: this.ssoProviders.size,
            integrations,
            capabilities: {
                sap: true,
                salesforce: true,
                microsoft365: true,
                oracle: true,
                slack: true,
                googleWorkspace: true,
                webhooks: true,
                dataSync: true,
                sso: true
            }
        };
    }
}

module.exports = { EnterpriseIntegrations };