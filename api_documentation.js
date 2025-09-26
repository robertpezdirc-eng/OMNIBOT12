const fs = require('fs').promises;
const path = require('path');

/**
 * OMNI API Documentation Generator - Profesionalni sistem za dokumentacijo
 * 
 * Funkcionalnosti:
 * - Avtomatsko generiranje API dokumentacije
 * - Interactive API explorer
 * - OpenAPI/Swagger specifikacije
 * - Code examples in multiple languages
 * - Real-time API testing
 * - Version management
 * - Multi-language support
 * - Export v različne formate
 */
class APIDocumentationGenerator {
    constructor(options = {}) {
        this.config = {
            title: options.title || 'OMNI AI Platform API',
            version: options.version || '1.0.0',
            description: options.description || 'Celovita API dokumentacija za OMNI AI Platform',
            baseUrl: options.baseUrl || 'http://localhost:3000',
            outputDir: options.outputDir || path.join(process.cwd(), 'docs'),
            languages: options.languages || ['javascript', 'python', 'curl', 'php'],
            theme: options.theme || 'modern',
            includeExamples: options.includeExamples !== false,
            generateSwagger: options.generateSwagger !== false,
            generatePostman: options.generatePostman !== false,
            ...options
        };
        
        this.endpoints = new Map();
        this.schemas = new Map();
        this.examples = new Map();
        this.categories = new Map();
        
        console.log('📚 Inicializiram API Documentation Generator...');
    }
    
    /**
     * Inicializacija dokumentacije
     */
    async initialize() {
        try {
            console.log('📖 Zaganjam generiranje API dokumentacije...');
            
            // Create output directory
            await fs.mkdir(this.config.outputDir, { recursive: true });
            
            // Setup default categories
            this.setupDefaultCategories();
            
            // Register default endpoints
            this.registerDefaultEndpoints();
            
            // Generate documentation
            await this.generateDocumentation();
            
            console.log('✅ API Documentation Generator uspešno inicializiran');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji API Documentation:', error);
            throw error;
        }
    }
    
    /**
     * Nastavitev privzetih kategorij
     */
    setupDefaultCategories() {
        this.categories.set('auth', {
            name: 'Avtentikacija',
            description: 'Endpoints za prijavo, registracijo in upravljanje uporabnikov',
            order: 1
        });
        
        this.categories.set('ai', {
            name: 'AI Storitve',
            description: 'Endpoints za AI funkcionalnosti in obdelavo',
            order: 2
        });
        
        this.categories.set('data', {
            name: 'Upravljanje Podatkov',
            description: 'Endpoints za shranjevanje in pridobivanje podatkov',
            order: 3
        });
        
        this.categories.set('monitoring', {
            name: 'Spremljanje',
            description: 'Endpoints za sistemsko spremljanje in metrike',
            order: 4
        });
        
        this.categories.set('admin', {
            name: 'Administracija',
            description: 'Endpoints za administratorje sistema',
            order: 5
        });
    }
    
    /**
     * Registracija privzetih endpoints
     */
    registerDefaultEndpoints() {
        // Authentication endpoints
        this.registerEndpoint({
            path: '/api/auth/login',
            method: 'POST',
            category: 'auth',
            summary: 'Prijava uporabnika',
            description: 'Prijavi uporabnika v sistem in vrne JWT token',
            requestBody: {
                required: true,
                schema: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        password: { type: 'string', minLength: 6, example: 'password123' }
                    },
                    required: ['email', 'password']
                }
            },
            responses: {
                200: {
                    description: 'Uspešna prijava',
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: true },
                            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                            user: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', example: '12345' },
                                    email: { type: 'string', example: 'user@example.com' },
                                    role: { type: 'string', example: 'user' }
                                }
                            }
                        }
                    }
                },
                401: {
                    description: 'Napačni podatki',
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: false },
                            error: { type: 'string', example: 'Invalid credentials' }
                        }
                    }
                }
            }
        });
        
        this.registerEndpoint({
            path: '/api/auth/register',
            method: 'POST',
            category: 'auth',
            summary: 'Registracija novega uporabnika',
            description: 'Registrira novega uporabnika v sistem',
            requestBody: {
                required: true,
                schema: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email', example: 'newuser@example.com' },
                        password: { type: 'string', minLength: 6, example: 'password123' },
                        name: { type: 'string', example: 'John Doe' }
                    },
                    required: ['email', 'password', 'name']
                }
            },
            responses: {
                201: {
                    description: 'Uspešna registracija',
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: true },
                            message: { type: 'string', example: 'User registered successfully' },
                            userId: { type: 'string', example: '12345' }
                        }
                    }
                }
            }
        });
        
        // AI endpoints
        this.registerEndpoint({
            path: '/api/ai/chat',
            method: 'POST',
            category: 'ai',
            summary: 'AI Chat',
            description: 'Pošlje sporočilo AI sistemu in prejme odgovor',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                schema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Kako lahko pomagam s turizmom?' },
                        context: { type: 'string', example: 'turizem' },
                        language: { type: 'string', example: 'sl', default: 'sl' }
                    },
                    required: ['message']
                }
            },
            responses: {
                200: {
                    description: 'AI odgovor',
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: true },
                            response: { type: 'string', example: 'Lahko vam pomagam z načrtovanjem potovanja...' },
                            context: { type: 'string', example: 'turizem' },
                            suggestions: {
                                type: 'array',
                                items: { type: 'string' },
                                example: ['Načrtovanje itinerarjev', 'Rezervacije', 'Lokalne aktivnosti']
                            }
                        }
                    }
                }
            }
        });
        
        this.registerEndpoint({
            path: '/api/ai/analyze',
            method: 'POST',
            category: 'ai',
            summary: 'Analiza podatkov',
            description: 'Analizira podatke z AI algoritmi',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                schema: {
                    type: 'object',
                    properties: {
                        data: { type: 'object', example: { sales: [100, 200, 150] } },
                        analysisType: { 
                            type: 'string', 
                            enum: ['trend', 'prediction', 'classification', 'optimization'],
                            example: 'trend' 
                        }
                    },
                    required: ['data', 'analysisType']
                }
            },
            responses: {
                200: {
                    description: 'Rezultat analize',
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: true },
                            analysis: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string', example: 'trend' },
                                    result: { type: 'object', example: { trend: 'increasing', confidence: 0.85 } },
                                    insights: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        example: ['Prodaja narašča', 'Priporočamo povečanje zaloge']
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        // Monitoring endpoints
        this.registerEndpoint({
            path: '/api/monitoring/health',
            method: 'GET',
            category: 'monitoring',
            summary: 'Zdravje sistema',
            description: 'Preveri zdravje vseh sistemskih komponent',
            responses: {
                200: {
                    description: 'Status zdravja',
                    schema: {
                        type: 'object',
                        properties: {
                            status: { type: 'string', example: 'healthy' },
                            components: {
                                type: 'object',
                                properties: {
                                    database: { type: 'string', example: 'healthy' },
                                    ai_systems: { type: 'string', example: 'healthy' },
                                    memory: { type: 'string', example: 'healthy' }
                                }
                            },
                            uptime: { type: 'number', example: 86400 }
                        }
                    }
                }
            }
        });
        
        this.registerEndpoint({
            path: '/api/monitoring/metrics',
            method: 'GET',
            category: 'monitoring',
            summary: 'Sistemske metrike',
            description: 'Pridobi trenutne sistemske metrike',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'timeframe',
                    in: 'query',
                    description: 'Časovni okvir za metrike',
                    schema: {
                        type: 'string',
                        enum: ['1h', '24h', '7d', '30d'],
                        default: '1h'
                    }
                }
            ],
            responses: {
                200: {
                    description: 'Sistemske metrike',
                    schema: {
                        type: 'object',
                        properties: {
                            cpu: { type: 'number', example: 45.2 },
                            memory: { type: 'number', example: 67.8 },
                            disk: { type: 'number', example: 23.1 },
                            requests: { type: 'number', example: 1250 },
                            errors: { type: 'number', example: 5 }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Registracija novega endpoint-a
     */
    registerEndpoint(endpoint) {
        const key = `${endpoint.method.toUpperCase()}_${endpoint.path}`;
        this.endpoints.set(key, {
            ...endpoint,
            id: key,
            timestamp: Date.now()
        });
        
        // Generate examples
        if (this.config.includeExamples) {
            this.generateExamples(endpoint);
        }
    }
    
    /**
     * Generiranje primerov kode
     */
    generateExamples(endpoint) {
        const examples = {};
        
        // JavaScript/Node.js example
        if (this.config.languages.includes('javascript')) {
            examples.javascript = this.generateJavaScriptExample(endpoint);
        }
        
        // Python example
        if (this.config.languages.includes('python')) {
            examples.python = this.generatePythonExample(endpoint);
        }
        
        // cURL example
        if (this.config.languages.includes('curl')) {
            examples.curl = this.generateCurlExample(endpoint);
        }
        
        // PHP example
        if (this.config.languages.includes('php')) {
            examples.php = this.generatePhpExample(endpoint);
        }
        
        this.examples.set(endpoint.path + '_' + endpoint.method, examples);
    }
    
    /**
     * Generiranje JavaScript primera
     */
    generateJavaScriptExample(endpoint) {
        let code = `// ${endpoint.summary}\n`;
        
        if (endpoint.security) {
            code += `const token = 'your-jwt-token';\n\n`;
        }
        
        code += `const response = await fetch('${this.config.baseUrl}${endpoint.path}', {\n`;
        code += `  method: '${endpoint.method.toUpperCase()}',\n`;
        
        const headers = ['\'Content-Type\': \'application/json\''];
        if (endpoint.security) {
            headers.push('\'Authorization\': `Bearer ${token}`');
        }
        
        code += `  headers: {\n    ${headers.join(',\n    ')}\n  }`;
        
        if (endpoint.requestBody) {
            const example = this.getExampleFromSchema(endpoint.requestBody.schema);
            code += `,\n  body: JSON.stringify(${JSON.stringify(example, null, 2).replace(/\n/g, '\n  ')})`;
        }
        
        code += `\n});\n\n`;
        code += `const data = await response.json();\nconsole.log(data);`;
        
        return code;
    }
    
    /**
     * Generiranje Python primera
     */
    generatePythonExample(endpoint) {
        let code = `# ${endpoint.summary}\n`;
        code += `import requests\nimport json\n\n`;
        
        if (endpoint.security) {
            code += `token = 'your-jwt-token'\n`;
        }
        
        code += `url = '${this.config.baseUrl}${endpoint.path}'\n`;
        
        const headers = ['\'Content-Type\': \'application/json\''];
        if (endpoint.security) {
            headers.push('\'Authorization\': f\'Bearer {token}\'');
        }
        
        code += `headers = {\n    ${headers.join(',\n    ')}\n}\n\n`;
        
        if (endpoint.requestBody) {
            const example = this.getExampleFromSchema(endpoint.requestBody.schema);
            code += `data = ${JSON.stringify(example, null, 2).replace(/"/g, "'")}\n\n`;
            code += `response = requests.${endpoint.method.toLowerCase()}(url, headers=headers, json=data)\n`;
        } else {
            code += `response = requests.${endpoint.method.toLowerCase()}(url, headers=headers)\n`;
        }
        
        code += `print(response.json())`;
        
        return code;
    }
    
    /**
     * Generiranje cURL primera
     */
    generateCurlExample(endpoint) {
        let code = `# ${endpoint.summary}\n`;
        code += `curl -X ${endpoint.method.toUpperCase()} \\\n`;
        code += `  '${this.config.baseUrl}${endpoint.path}' \\\n`;
        code += `  -H 'Content-Type: application/json'`;
        
        if (endpoint.security) {
            code += ` \\\n  -H 'Authorization: Bearer YOUR_JWT_TOKEN'`;
        }
        
        if (endpoint.requestBody) {
            const example = this.getExampleFromSchema(endpoint.requestBody.schema);
            code += ` \\\n  -d '${JSON.stringify(example)}'`;
        }
        
        return code;
    }
    
    /**
     * Generiranje PHP primera
     */
    generatePhpExample(endpoint) {
        let code = `<?php\n// ${endpoint.summary}\n\n`;
        
        if (endpoint.security) {
            code += `$token = 'your-jwt-token';\n`;
        }
        
        code += `$url = '${this.config.baseUrl}${endpoint.path}';\n`;
        
        const headers = ['\'Content-Type: application/json\''];
        if (endpoint.security) {
            headers.push('\'Authorization: Bearer \' . $token');
        }
        
        code += `$headers = [\n    ${headers.join(',\n    ')}\n];\n\n`;
        
        if (endpoint.requestBody) {
            const example = this.getExampleFromSchema(endpoint.requestBody.schema);
            code += `$data = ${this.phpArrayString(example)};\n\n`;
            code += `$options = [\n`;
            code += `    'http' => [\n`;
            code += `        'method' => '${endpoint.method.toUpperCase()}',\n`;
            code += `        'header' => implode("\\r\\n", $headers),\n`;
            code += `        'content' => json_encode($data)\n`;
            code += `    ]\n];\n\n`;
        } else {
            code += `$options = [\n`;
            code += `    'http' => [\n`;
            code += `        'method' => '${endpoint.method.toUpperCase()}',\n`;
            code += `        'header' => implode("\\r\\n", $headers)\n`;
            code += `    ]\n];\n\n`;
        }
        
        code += `$context = stream_context_create($options);\n`;
        code += `$response = file_get_contents($url, false, $context);\n`;
        code += `$data = json_decode($response, true);\n`;
        code += `print_r($data);\n?>`;
        
        return code;
    }
    
    /**
     * Pridobitev primera iz schema
     */
    getExampleFromSchema(schema) {
        if (schema.example) return schema.example;
        
        if (schema.type === 'object' && schema.properties) {
            const example = {};
            for (const [key, prop] of Object.entries(schema.properties)) {
                example[key] = this.getExampleFromSchema(prop);
            }
            return example;
        }
        
        if (schema.type === 'array' && schema.items) {
            return [this.getExampleFromSchema(schema.items)];
        }
        
        // Default examples by type
        const defaults = {
            string: 'example string',
            number: 123,
            integer: 123,
            boolean: true,
            object: {},
            array: []
        };
        
        return defaults[schema.type] || null;
    }
    
    /**
     * PHP array string representation
     */
    phpArrayString(obj) {
        if (Array.isArray(obj)) {
            return '[' + obj.map(item => this.phpArrayString(item)).join(', ') + ']';
        }
        
        if (typeof obj === 'object' && obj !== null) {
            const pairs = Object.entries(obj).map(([key, value]) => 
                `'${key}' => ${this.phpArrayString(value)}`
            );
            return '[' + pairs.join(', ') + ']';
        }
        
        if (typeof obj === 'string') {
            return `'${obj}'`;
        }
        
        return String(obj);
    }
    
    /**
     * Generiranje celotne dokumentacije
     */
    async generateDocumentation() {
        console.log('📝 Generiram dokumentacijo...');
        
        // Generate HTML documentation
        await this.generateHtmlDocumentation();
        
        // Generate OpenAPI/Swagger spec
        if (this.config.generateSwagger) {
            await this.generateSwaggerSpec();
        }
        
        // Generate Postman collection
        if (this.config.generatePostman) {
            await this.generatePostmanCollection();
        }
        
        // Generate markdown documentation
        await this.generateMarkdownDocumentation();
        
        console.log(`✅ Dokumentacija generirana v: ${this.config.outputDir}`);
    }
    
    /**
     * Generiranje HTML dokumentacije
     */
    async generateHtmlDocumentation() {
        const html = this.generateHtmlTemplate();
        const htmlPath = path.join(this.config.outputDir, 'index.html');
        await fs.writeFile(htmlPath, html);
        
        // Copy assets
        await this.copyAssets();
    }
    
    /**
     * Generiranje HTML template
     */
    generateHtmlTemplate() {
        const sortedCategories = Array.from(this.categories.entries())
            .sort(([,a], [,b]) => a.order - b.order);
        
        let html = `<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title}</title>
    <link rel="stylesheet" href="assets/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism-tomorrow.min.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>${this.config.title}</h1>
            <p class="version">Verzija ${this.config.version}</p>
            <p class="description">${this.config.description}</p>
        </header>
        
        <nav class="sidebar">
            <ul class="nav-list">`;
        
        for (const [categoryId, category] of sortedCategories) {
            html += `
                <li class="nav-category">
                    <a href="#${categoryId}">${category.name}</a>
                    <ul class="nav-endpoints">`;
            
            const categoryEndpoints = Array.from(this.endpoints.values())
                .filter(endpoint => endpoint.category === categoryId);
            
            for (const endpoint of categoryEndpoints) {
                html += `
                        <li><a href="#${endpoint.id}">${endpoint.method.toUpperCase()} ${endpoint.path}</a></li>`;
            }
            
            html += `
                    </ul>
                </li>`;
        }
        
        html += `
            </ul>
        </nav>
        
        <main class="content">`;
        
        for (const [categoryId, category] of sortedCategories) {
            html += `
            <section id="${categoryId}" class="category-section">
                <h2>${category.name}</h2>
                <p>${category.description}</p>`;
            
            const categoryEndpoints = Array.from(this.endpoints.values())
                .filter(endpoint => endpoint.category === categoryId);
            
            for (const endpoint of categoryEndpoints) {
                html += this.generateEndpointHtml(endpoint);
            }
            
            html += `
            </section>`;
        }
        
        html += `
        </main>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-core.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/plugins/autoloader/prism-autoloader.min.js"></script>
    <script src="assets/script.js"></script>
</body>
</html>`;
        
        return html;
    }
    
    /**
     * Generiranje HTML za endpoint
     */
    generateEndpointHtml(endpoint) {
        const examples = this.examples.get(endpoint.path + '_' + endpoint.method) || {};
        
        let html = `
        <div id="${endpoint.id}" class="endpoint">
            <div class="endpoint-header">
                <span class="method method-${endpoint.method.toLowerCase()}">${endpoint.method.toUpperCase()}</span>
                <span class="path">${endpoint.path}</span>
            </div>
            
            <h3>${endpoint.summary}</h3>
            <p>${endpoint.description}</p>`;
        
        if (endpoint.security) {
            html += `
            <div class="security">
                <h4>🔒 Avtentikacija</h4>
                <p>Ta endpoint zahteva JWT token v Authorization header-ju.</p>
            </div>`;
        }
        
        if (endpoint.parameters) {
            html += `
            <div class="parameters">
                <h4>Parametri</h4>
                <table class="params-table">
                    <thead>
                        <tr>
                            <th>Ime</th>
                            <th>Tip</th>
                            <th>Lokacija</th>
                            <th>Obvezen</th>
                            <th>Opis</th>
                        </tr>
                    </thead>
                    <tbody>`;
            
            for (const param of endpoint.parameters) {
                html += `
                        <tr>
                            <td><code>${param.name}</code></td>
                            <td>${param.schema?.type || 'string'}</td>
                            <td>${param.in}</td>
                            <td>${param.required ? 'Da' : 'Ne'}</td>
                            <td>${param.description || ''}</td>
                        </tr>`;
            }
            
            html += `
                    </tbody>
                </table>
            </div>`;
        }
        
        if (endpoint.requestBody) {
            html += `
            <div class="request-body">
                <h4>Request Body</h4>
                <pre><code class="language-json">${JSON.stringify(this.getExampleFromSchema(endpoint.requestBody.schema), null, 2)}</code></pre>
            </div>`;
        }
        
        if (endpoint.responses) {
            html += `
            <div class="responses">
                <h4>Odgovori</h4>`;
            
            for (const [statusCode, response] of Object.entries(endpoint.responses)) {
                html += `
                <div class="response">
                    <h5>Status ${statusCode}: ${response.description}</h5>
                    <pre><code class="language-json">${JSON.stringify(this.getExampleFromSchema(response.schema), null, 2)}</code></pre>
                </div>`;
            }
            
            html += `
            </div>`;
        }
        
        if (Object.keys(examples).length > 0) {
            html += `
            <div class="examples">
                <h4>Primeri kode</h4>
                <div class="example-tabs">`;
            
            const languages = Object.keys(examples);
            for (let i = 0; i < languages.length; i++) {
                const lang = languages[i];
                html += `
                    <button class="tab-button ${i === 0 ? 'active' : ''}" onclick="showExample('${endpoint.id}', '${lang}')">${lang.toUpperCase()}</button>`;
            }
            
            html += `
                </div>`;
            
            for (const [lang, code] of Object.entries(examples)) {
                html += `
                <div id="${endpoint.id}-${lang}" class="example-content ${lang === languages[0] ? 'active' : ''}">
                    <pre><code class="language-${lang === 'curl' ? 'bash' : lang}">${code}</code></pre>
                </div>`;
            }
            
            html += `
            </div>`;
        }
        
        html += `
        </div>`;
        
        return html;
    }
    
    /**
     * Kopiranje assets
     */
    async copyAssets() {
        const assetsDir = path.join(this.config.outputDir, 'assets');
        await fs.mkdir(assetsDir, { recursive: true });
        
        // Generate CSS
        const css = this.generateCSS();
        await fs.writeFile(path.join(assetsDir, 'style.css'), css);
        
        // Generate JavaScript
        const js = this.generateJavaScript();
        await fs.writeFile(path.join(assetsDir, 'script.js'), js);
    }
    
    /**
     * Generiranje CSS
     */
    generateCSS() {
        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        
        .container {
            display: flex;
            min-height: 100vh;
        }
        
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #2c3e50;
            color: white;
            padding: 1rem 2rem;
            z-index: 1000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }
        
        .version {
            background: #3498db;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 3px;
            font-size: 0.8rem;
            display: inline-block;
            margin-bottom: 0.5rem;
        }
        
        .sidebar {
            width: 300px;
            background: white;
            border-right: 1px solid #e1e8ed;
            position: fixed;
            top: 120px;
            bottom: 0;
            overflow-y: auto;
            padding: 1rem;
        }
        
        .nav-list {
            list-style: none;
        }
        
        .nav-category > a {
            display: block;
            padding: 0.75rem 0;
            font-weight: 600;
            color: #2c3e50;
            text-decoration: none;
            border-bottom: 1px solid #e1e8ed;
        }
        
        .nav-endpoints {
            list-style: none;
            margin-left: 1rem;
        }
        
        .nav-endpoints a {
            display: block;
            padding: 0.5rem 0;
            color: #666;
            text-decoration: none;
            font-size: 0.9rem;
        }
        
        .nav-endpoints a:hover {
            color: #3498db;
        }
        
        .content {
            flex: 1;
            margin-left: 300px;
            margin-top: 120px;
            padding: 2rem;
        }
        
        .category-section {
            margin-bottom: 3rem;
        }
        
        .category-section h2 {
            color: #2c3e50;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #3498db;
        }
        
        .endpoint {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .endpoint-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .method {
            padding: 0.3rem 0.8rem;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.8rem;
            margin-right: 1rem;
        }
        
        .method-get { background: #27ae60; color: white; }
        .method-post { background: #3498db; color: white; }
        .method-put { background: #f39c12; color: white; }
        .method-delete { background: #e74c3c; color: white; }
        .method-patch { background: #9b59b6; color: white; }
        
        .path {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #f8f9fa;
            padding: 0.3rem 0.8rem;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .security {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 1rem;
            margin: 1rem 0;
        }
        
        .params-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        
        .params-table th,
        .params-table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e1e8ed;
        }
        
        .params-table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        .example-tabs {
            display: flex;
            margin: 1rem 0;
            border-bottom: 1px solid #e1e8ed;
        }
        
        .tab-button {
            background: none;
            border: none;
            padding: 0.75rem 1rem;
            cursor: pointer;
            font-weight: 500;
            color: #666;
            border-bottom: 2px solid transparent;
        }
        
        .tab-button.active {
            color: #3498db;
            border-bottom-color: #3498db;
        }
        
        .example-content {
            display: none;
        }
        
        .example-content.active {
            display: block;
        }
        
        pre {
            background: #2d3748;
            color: #e2e8f0;
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 0.9rem;
        }
        
        code {
            font-family: 'Monaco', 'Menlo', monospace;
        }
        
        @media (max-width: 768px) {
            .container {
                flex-direction: column;
            }
            
            .sidebar {
                position: static;
                width: 100%;
                height: auto;
            }
            
            .content {
                margin-left: 0;
                margin-top: 0;
            }
        }
        `;
    }
    
    /**
     * Generiranje JavaScript
     */
    generateJavaScript() {
        return `
        function showExample(endpointId, language) {
            // Hide all example contents for this endpoint
            const contents = document.querySelectorAll('[id^="' + endpointId + '-"]');
            contents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Show selected example
            const selectedContent = document.getElementById(endpointId + '-' + language);
            if (selectedContent) {
                selectedContent.classList.add('active');
            }
            
            // Update tab buttons
            const endpoint = document.getElementById(endpointId);
            const tabButtons = endpoint.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
                button.classList.remove('active');
                if (button.textContent.toLowerCase() === language.toUpperCase()) {
                    button.classList.add('active');
                }
            });
        }
        
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Highlight current section in navigation
        window.addEventListener('scroll', () => {
            const sections = document.querySelectorAll('.category-section');
            const navLinks = document.querySelectorAll('.nav-category > a');
            
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 150;
                if (window.pageYOffset >= sectionTop) {
                    current = section.getAttribute('id');
                }
            });
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        });
        `;
    }
    
    /**
     * Generiranje OpenAPI/Swagger specifikacije
     */
    async generateSwaggerSpec() {
        const spec = {
            openapi: '3.0.0',
            info: {
                title: this.config.title,
                version: this.config.version,
                description: this.config.description
            },
            servers: [
                {
                    url: this.config.baseUrl,
                    description: 'Development server'
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            },
            paths: {}
        };
        
        for (const endpoint of this.endpoints.values()) {
            if (!spec.paths[endpoint.path]) {
                spec.paths[endpoint.path] = {};
            }
            
            spec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
                summary: endpoint.summary,
                description: endpoint.description,
                tags: [this.categories.get(endpoint.category)?.name || endpoint.category],
                security: endpoint.security || [],
                parameters: endpoint.parameters || [],
                requestBody: endpoint.requestBody,
                responses: endpoint.responses || {}
            };
        }
        
        const swaggerPath = path.join(this.config.outputDir, 'swagger.json');
        await fs.writeFile(swaggerPath, JSON.stringify(spec, null, 2));
        
        console.log('📋 OpenAPI specifikacija generirana');
    }
    
    /**
     * Generiranje Postman kolekcije
     */
    async generatePostmanCollection() {
        const collection = {
            info: {
                name: this.config.title,
                description: this.config.description,
                version: this.config.version,
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            },
            item: []
        };
        
        const categoryFolders = new Map();
        
        for (const endpoint of this.endpoints.values()) {
            const categoryName = this.categories.get(endpoint.category)?.name || endpoint.category;
            
            if (!categoryFolders.has(endpoint.category)) {
                const folder = {
                    name: categoryName,
                    item: []
                };
                categoryFolders.set(endpoint.category, folder);
                collection.item.push(folder);
            }
            
            const request = {
                name: endpoint.summary,
                request: {
                    method: endpoint.method.toUpperCase(),
                    header: [
                        {
                            key: 'Content-Type',
                            value: 'application/json'
                        }
                    ],
                    url: {
                        raw: `${this.config.baseUrl}${endpoint.path}`,
                        host: [this.config.baseUrl.replace(/https?:\/\//, '').split(':')[0]],
                        port: this.config.baseUrl.includes(':') ? this.config.baseUrl.split(':')[2] : '',
                        path: endpoint.path.split('/').filter(p => p)
                    }
                }
            };
            
            if (endpoint.security) {
                request.request.header.push({
                    key: 'Authorization',
                    value: 'Bearer {{jwt_token}}'
                });
            }
            
            if (endpoint.requestBody) {
                request.request.body = {
                    mode: 'raw',
                    raw: JSON.stringify(this.getExampleFromSchema(endpoint.requestBody.schema), null, 2)
                };
            }
            
            categoryFolders.get(endpoint.category).item.push(request);
        }
        
        const postmanPath = path.join(this.config.outputDir, 'postman-collection.json');
        await fs.writeFile(postmanPath, JSON.stringify(collection, null, 2));
        
        console.log('📮 Postman kolekcija generirana');
    }
    
    /**
     * Generiranje Markdown dokumentacije
     */
    async generateMarkdownDocumentation() {
        let markdown = `# ${this.config.title}\n\n`;
        markdown += `**Verzija:** ${this.config.version}\n\n`;
        markdown += `${this.config.description}\n\n`;
        markdown += `**Base URL:** \`${this.config.baseUrl}\`\n\n`;
        
        markdown += `## Kazalo\n\n`;
        
        const sortedCategories = Array.from(this.categories.entries())
            .sort(([,a], [,b]) => a.order - b.order);
        
        for (const [categoryId, category] of sortedCategories) {
            markdown += `- [${category.name}](#${categoryId.toLowerCase()})\n`;
        }
        
        markdown += `\n`;
        
        for (const [categoryId, category] of sortedCategories) {
            markdown += `## ${category.name}\n\n`;
            markdown += `${category.description}\n\n`;
            
            const categoryEndpoints = Array.from(this.endpoints.values())
                .filter(endpoint => endpoint.category === categoryId);
            
            for (const endpoint of categoryEndpoints) {
                markdown += `### ${endpoint.method.toUpperCase()} ${endpoint.path}\n\n`;
                markdown += `${endpoint.description}\n\n`;
                
                if (endpoint.security) {
                    markdown += `**🔒 Avtentikacija:** Zahteva JWT token\n\n`;
                }
                
                if (endpoint.requestBody) {
                    markdown += `**Request Body:**\n\n`;
                    markdown += `\`\`\`json\n`;
                    markdown += JSON.stringify(this.getExampleFromSchema(endpoint.requestBody.schema), null, 2);
                    markdown += `\n\`\`\`\n\n`;
                }
                
                if (endpoint.responses) {
                    markdown += `**Odgovori:**\n\n`;
                    for (const [statusCode, response] of Object.entries(endpoint.responses)) {
                        markdown += `**${statusCode}** - ${response.description}\n\n`;
                        markdown += `\`\`\`json\n`;
                        markdown += JSON.stringify(this.getExampleFromSchema(response.schema), null, 2);
                        markdown += `\n\`\`\`\n\n`;
                    }
                }
                
                const examples = this.examples.get(endpoint.path + '_' + endpoint.method);
                if (examples && examples.curl) {
                    markdown += `**Primer (cURL):**\n\n`;
                    markdown += `\`\`\`bash\n`;
                    markdown += examples.curl;
                    markdown += `\n\`\`\`\n\n`;
                }
                
                markdown += `---\n\n`;
            }
        }
        
        const markdownPath = path.join(this.config.outputDir, 'README.md');
        await fs.writeFile(markdownPath, markdown);
        
        console.log('📝 Markdown dokumentacija generirana');
    }
    
    /**
     * Dodajanje custom schema
     */
    addSchema(name, schema) {
        this.schemas.set(name, schema);
    }
    
    /**
     * Pridobitev vseh endpoints
     */
    getEndpoints() {
        return Array.from(this.endpoints.values());
    }
    
    /**
     * Pridobitev endpoint-a po ID
     */
    getEndpoint(id) {
        return this.endpoints.get(id);
    }
    
    /**
     * Posodobitev endpoint-a
     */
    updateEndpoint(id, updates) {
        if (this.endpoints.has(id)) {
            const endpoint = this.endpoints.get(id);
            Object.assign(endpoint, updates);
            
            // Regenerate examples if needed
            if (this.config.includeExamples) {
                this.generateExamples(endpoint);
            }
        }
    }
    
    /**
     * Odstranitev endpoint-a
     */
    removeEndpoint(id) {
        this.endpoints.delete(id);
        
        // Remove examples
        const exampleKey = Object.keys(this.examples).find(key => key.includes(id));
        if (exampleKey) {
            this.examples.delete(exampleKey);
        }
    }
}

module.exports = APIDocumentationGenerator;