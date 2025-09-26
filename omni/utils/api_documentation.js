const fs = require('fs').promises;
const path = require('path');

/**
 * Professional API Documentation Generator
 * Automatically generates comprehensive API documentation with interactive features
 */
class APIDocumentationGenerator {
    constructor(options = {}) {
        this.config = {
            title: options.title || 'OMNI Platform API',
            version: options.version || '1.0.0',
            description: options.description || 'Comprehensive AI-powered platform API',
            baseUrl: options.baseUrl || 'http://localhost:3000',
            outputDir: options.outputDir || path.join(process.cwd(), 'omni', 'docs'),
            formats: options.formats || ['html', 'json', 'markdown'],
            languages: options.languages || ['javascript', 'python', 'curl', 'php'],
            includeExamples: options.includeExamples !== false,
            includeTests: options.includeTests !== false,
            theme: options.theme || 'modern',
            ...options
        };
        
        this.endpoints = new Map();
        this.schemas = new Map();
        this.examples = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        console.log('📚 Initializing API Documentation Generator...');
        
        try {
            // Create documentation directory
            await this.ensureDocsDirectory();
            
            // Register default endpoints
            this.registerDefaultEndpoints();
            
            // Generate initial documentation
            await this.generateDocumentation();
            
            this.isInitialized = true;
            console.log('✅ API Documentation Generator initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize API Documentation Generator:', error);
            throw error;
        }
    }

    async ensureDocsDirectory() {
        try {
            await fs.access(this.config.outputDir);
        } catch {
            await fs.mkdir(this.config.outputDir, { recursive: true });
            console.log('📁 Created documentation directory');
        }
    }

    registerDefaultEndpoints() {
        // Health Check Endpoints
        this.registerEndpoint({
            path: '/health',
            method: 'GET',
            summary: 'System Health Check',
            description: 'Returns the current health status of all system components',
            tags: ['Health'],
            responses: {
                200: {
                    description: 'System is healthy',
                    schema: {
                        type: 'object',
                        properties: {
                            status: { type: 'string', example: 'healthy' },
                            services: { type: 'object' },
                            timestamp: { type: 'string', format: 'date-time' }
                        }
                    }
                }
            }
        });

        // AI Core Endpoints
        this.registerEndpoint({
            path: '/api/ai/chat',
            method: 'POST',
            summary: 'AI Chat Completion',
            description: 'Send a message to the AI and receive a response',
            tags: ['AI Core'],
            requestBody: {
                required: true,
                schema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Hello, how can you help me?' },
                        context: { type: 'object' },
                        options: { type: 'object' }
                    },
                    required: ['message']
                }
            },
            responses: {
                200: {
                    description: 'AI response generated successfully',
                    schema: {
                        type: 'object',
                        properties: {
                            response: { type: 'string' },
                            confidence: { type: 'number' },
                            timestamp: { type: 'string', format: 'date-time' }
                        }
                    }
                }
            }
        });

        // Memory System Endpoints
        this.registerEndpoint({
            path: '/api/memory/store',
            method: 'POST',
            summary: 'Store Memory',
            description: 'Store information in the AI memory system',
            tags: ['Memory'],
            requestBody: {
                required: true,
                schema: {
                    type: 'object',
                    properties: {
                        key: { type: 'string', example: 'user_preference' },
                        value: { type: 'object' },
                        metadata: { type: 'object' }
                    },
                    required: ['key', 'value']
                }
            }
        });

        // Tourism Module Endpoints
        this.registerEndpoint({
            path: '/api/tourism/itinerary',
            method: 'POST',
            summary: 'Generate Travel Itinerary',
            description: 'Create a personalized travel itinerary based on preferences',
            tags: ['Tourism'],
            requestBody: {
                required: true,
                schema: {
                    type: 'object',
                    properties: {
                        destination: { type: 'string', example: 'Slovenia' },
                        duration: { type: 'number', example: 7 },
                        budget: { type: 'number', example: 1000 },
                        interests: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['destination', 'duration']
                }
            }
        });

        // Business Module Endpoints
        this.registerEndpoint({
            path: '/api/hospitality/menu',
            method: 'POST',
            summary: 'Generate Restaurant Menu',
            description: 'Create optimized restaurant menu with pricing and nutritional information',
            tags: ['Hospitality'],
            requestBody: {
                required: true,
                schema: {
                    type: 'object',
                    properties: {
                        cuisine: { type: 'string', example: 'Mediterranean' },
                        budget: { type: 'number', example: 500 },
                        dietary: { type: 'array', items: { type: 'string' } }
                    }
                }
            }
        });

        console.log('📋 Default API endpoints registered');
    }

    registerEndpoint(endpoint) {
        const key = `${endpoint.method.toUpperCase()}_${endpoint.path}`;
        this.endpoints.set(key, {
            ...endpoint,
            id: key,
            timestamp: new Date().toISOString()
        });
        
        // Generate code examples
        if (this.config.includeExamples) {
            this.generateCodeExamples(endpoint);
        }
    }

    generateCodeExamples(endpoint) {
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
        
        this.examples.set(endpoint.path, examples);
    }

    generateJavaScriptExample(endpoint) {
        const url = `${this.config.baseUrl}${endpoint.path}`;
        let example = `// ${endpoint.summary}\n`;
        
        if (endpoint.method === 'GET') {
            example += `const response = await fetch('${url}');\n`;
            example += `const data = await response.json();\n`;
            example += `console.log(data);`;
        } else {
            const body = endpoint.requestBody ? JSON.stringify(this.generateExampleBody(endpoint.requestBody.schema), null, 2) : '{}';
            example += `const response = await fetch('${url}', {\n`;
            example += `  method: '${endpoint.method}',\n`;
            example += `  headers: {\n`;
            example += `    'Content-Type': 'application/json',\n`;
            example += `  },\n`;
            example += `  body: JSON.stringify(${body})\n`;
            example += `});\n`;
            example += `const data = await response.json();\n`;
            example += `console.log(data);`;
        }
        
        return example;
    }

    generatePythonExample(endpoint) {
        const url = `${this.config.baseUrl}${endpoint.path}`;
        let example = `# ${endpoint.summary}\n`;
        example += `import requests\n\n`;
        
        if (endpoint.method === 'GET') {
            example += `response = requests.get('${url}')\n`;
            example += `data = response.json()\n`;
            example += `print(data)`;
        } else {
            const body = endpoint.requestBody ? this.generateExampleBody(endpoint.requestBody.schema) : {};
            example += `data = ${JSON.stringify(body, null, 2)}\n`;
            example += `response = requests.${endpoint.method.toLowerCase()}('${url}', json=data)\n`;
            example += `result = response.json()\n`;
            example += `print(result)`;
        }
        
        return example;
    }

    generateCurlExample(endpoint) {
        const url = `${this.config.baseUrl}${endpoint.path}`;
        let example = `# ${endpoint.summary}\n`;
        
        if (endpoint.method === 'GET') {
            example += `curl -X GET "${url}"`;
        } else {
            const body = endpoint.requestBody ? JSON.stringify(this.generateExampleBody(endpoint.requestBody.schema)) : '{}';
            example += `curl -X ${endpoint.method} "${url}" \\\n`;
            example += `  -H "Content-Type: application/json" \\\n`;
            example += `  -d '${body}'`;
        }
        
        return example;
    }

    generatePhpExample(endpoint) {
        const url = `${this.config.baseUrl}${endpoint.path}`;
        let example = `<?php\n// ${endpoint.summary}\n\n`;
        
        if (endpoint.method === 'GET') {
            example += `$response = file_get_contents('${url}');\n`;
            example += `$data = json_decode($response, true);\n`;
            example += `print_r($data);\n`;
        } else {
            const body = endpoint.requestBody ? this.generateExampleBody(endpoint.requestBody.schema) : {};
            example += `$data = ${this.phpArrayString(body)};\n`;
            example += `$options = [\n`;
            example += `    'http' => [\n`;
            example += `        'header' => "Content-type: application/json\\r\\n",\n`;
            example += `        'method' => '${endpoint.method}',\n`;
            example += `        'content' => json_encode($data)\n`;
            example += `    ]\n`;
            example += `];\n`;
            example += `$context = stream_context_create($options);\n`;
            example += `$response = file_get_contents('${url}', false, $context);\n`;
            example += `$result = json_decode($response, true);\n`;
            example += `print_r($result);\n`;
        }
        
        return example;
    }

    generateExampleBody(schema) {
        if (!schema || !schema.properties) return {};
        
        const example = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
            if (prop.example !== undefined) {
                example[key] = prop.example;
            } else {
                switch (prop.type) {
                    case 'string':
                        example[key] = `example_${key}`;
                        break;
                    case 'number':
                        example[key] = 123;
                        break;
                    case 'boolean':
                        example[key] = true;
                        break;
                    case 'array':
                        example[key] = ['example'];
                        break;
                    case 'object':
                        example[key] = {};
                        break;
                    default:
                        example[key] = null;
                }
            }
        }
        
        return example;
    }

    phpArrayString(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return JSON.stringify(obj);
        }
        
        const pairs = Object.entries(obj).map(([key, value]) => {
            return `'${key}' => ${this.phpArrayString(value)}`;
        });
        
        return `[${pairs.join(', ')}]`;
    }

    async generateDocumentation() {
        console.log('📝 Generating API documentation...');
        
        const formats = this.config.formats;
        
        if (formats.includes('html')) {
            await this.generateHtmlDocumentation();
        }
        
        if (formats.includes('json')) {
            await this.generateJsonDocumentation();
        }
        
        if (formats.includes('markdown')) {
            await this.generateMarkdownDocumentation();
        }
        
        console.log('✅ API documentation generated successfully');
    }

    async generateHtmlDocumentation() {
        const html = this.generateHtmlContent();
        const filePath = path.join(this.config.outputDir, 'index.html');
        await fs.writeFile(filePath, html);
        console.log(`📄 HTML documentation saved to: ${filePath}`);
    }

    generateHtmlContent() {
        const endpoints = Array.from(this.endpoints.values());
        const groupedEndpoints = this.groupEndpointsByTag(endpoints);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title}</title>
    <style>
        ${this.getHtmlStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${this.config.title}</h1>
            <p class="version">Version ${this.config.version}</p>
            <p class="description">${this.config.description}</p>
            <p class="base-url">Base URL: <code>${this.config.baseUrl}</code></p>
        </header>
        
        <nav class="sidebar">
            <h3>Endpoints</h3>
            ${this.generateNavigationHtml(groupedEndpoints)}
        </nav>
        
        <main class="content">
            ${this.generateEndpointsHtml(groupedEndpoints)}
        </main>
    </div>
    
    <script>
        ${this.getJavaScript()}
    </script>
</body>
</html>`;
    }

    getHtmlStyles() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { display: flex; min-height: 100vh; }
        header { position: fixed; top: 0; left: 0; right: 0; background: #2c3e50; color: white; padding: 1rem; z-index: 1000; }
        header h1 { margin-bottom: 0.5rem; }
        .version { color: #ecf0f1; font-size: 0.9rem; }
        .description { margin: 0.5rem 0; color: #bdc3c7; }
        .base-url { font-size: 0.9rem; }
        .sidebar { width: 300px; background: #f8f9fa; padding: 6rem 1rem 1rem; position: fixed; height: 100vh; overflow-y: auto; }
        .sidebar h3 { margin-bottom: 1rem; color: #2c3e50; }
        .sidebar ul { list-style: none; }
        .sidebar li { margin-bottom: 0.5rem; }
        .sidebar a { text-decoration: none; color: #34495e; padding: 0.5rem; display: block; border-radius: 4px; }
        .sidebar a:hover { background: #e9ecef; }
        .content { flex: 1; margin-left: 300px; padding: 6rem 2rem 2rem; }
        .endpoint { margin-bottom: 3rem; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
        .endpoint-header { background: #f8f9fa; padding: 1rem; border-bottom: 1px solid #dee2e6; }
        .method { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold; font-size: 0.8rem; }
        .method.get { background: #28a745; color: white; }
        .method.post { background: #007bff; color: white; }
        .method.put { background: #ffc107; color: black; }
        .method.delete { background: #dc3545; color: white; }
        .endpoint-path { font-family: monospace; font-size: 1.1rem; margin-left: 1rem; }
        .endpoint-body { padding: 1rem; }
        .section { margin-bottom: 1.5rem; }
        .section h4 { margin-bottom: 0.5rem; color: #2c3e50; }
        .code-block { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 1rem; font-family: monospace; font-size: 0.9rem; overflow-x: auto; }
        .tabs { display: flex; border-bottom: 1px solid #dee2e6; margin-bottom: 1rem; }
        .tab { padding: 0.5rem 1rem; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab.active { border-bottom-color: #007bff; color: #007bff; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .schema { background: #f8f9fa; padding: 1rem; border-radius: 4px; }
        .property { margin-bottom: 0.5rem; }
        .property-name { font-weight: bold; color: #2c3e50; }
        .property-type { color: #6c757d; font-size: 0.9rem; }
        .property-description { color: #495057; margin-left: 1rem; }
        `;
    }

    generateNavigationHtml(groupedEndpoints) {
        let html = '';
        for (const [tag, endpoints] of Object.entries(groupedEndpoints)) {
            html += `<h4>${tag}</h4><ul>`;
            for (const endpoint of endpoints) {
                html += `<li><a href="#${endpoint.id}">${endpoint.method} ${endpoint.path}</a></li>`;
            }
            html += '</ul>';
        }
        return html;
    }

    generateEndpointsHtml(groupedEndpoints) {
        let html = '';
        for (const [tag, endpoints] of Object.entries(groupedEndpoints)) {
            html += `<section><h2>${tag}</h2>`;
            for (const endpoint of endpoints) {
                html += this.generateEndpointHtml(endpoint);
            }
            html += '</section>';
        }
        return html;
    }

    generateEndpointHtml(endpoint) {
        const examples = this.examples.get(endpoint.path) || {};
        
        return `
        <div class="endpoint" id="${endpoint.id}">
            <div class="endpoint-header">
                <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                <span class="endpoint-path">${endpoint.path}</span>
                <h3>${endpoint.summary}</h3>
                <p>${endpoint.description}</p>
            </div>
            <div class="endpoint-body">
                ${endpoint.requestBody ? this.generateRequestBodyHtml(endpoint.requestBody) : ''}
                ${endpoint.responses ? this.generateResponsesHtml(endpoint.responses) : ''}
                ${Object.keys(examples).length > 0 ? this.generateExamplesHtml(examples) : ''}
            </div>
        </div>`;
    }

    generateRequestBodyHtml(requestBody) {
        return `
        <div class="section">
            <h4>Request Body</h4>
            <div class="schema">
                ${this.generateSchemaHtml(requestBody.schema)}
            </div>
        </div>`;
    }

    generateResponsesHtml(responses) {
        let html = '<div class="section"><h4>Responses</h4>';
        for (const [code, response] of Object.entries(responses)) {
            html += `<h5>Status ${code}</h5>`;
            html += `<p>${response.description}</p>`;
            if (response.schema) {
                html += `<div class="schema">${this.generateSchemaHtml(response.schema)}</div>`;
            }
        }
        html += '</div>';
        return html;
    }

    generateSchemaHtml(schema) {
        if (!schema.properties) return '';
        
        let html = '';
        for (const [name, prop] of Object.entries(schema.properties)) {
            html += `
            <div class="property">
                <span class="property-name">${name}</span>
                <span class="property-type">(${prop.type})</span>
                ${prop.example ? `<code>${JSON.stringify(prop.example)}</code>` : ''}
                ${prop.description ? `<div class="property-description">${prop.description}</div>` : ''}
            </div>`;
        }
        return html;
    }

    generateExamplesHtml(examples) {
        const languages = Object.keys(examples);
        if (languages.length === 0) return '';
        
        let html = '<div class="section"><h4>Code Examples</h4>';
        html += '<div class="tabs">';
        languages.forEach((lang, index) => {
            html += `<div class="tab ${index === 0 ? 'active' : ''}" onclick="showTab('${lang}')">${lang.charAt(0).toUpperCase() + lang.slice(1)}</div>`;
        });
        html += '</div>';
        
        languages.forEach((lang, index) => {
            html += `<div class="tab-content ${index === 0 ? 'active' : ''}" id="${lang}">`;
            html += `<div class="code-block">${this.escapeHtml(examples[lang])}</div>`;
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    getJavaScript() {
        return `
        function showTab(language) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab content
            document.getElementById(language).classList.add('active');
            
            // Add active class to clicked tab
            event.target.classList.add('active');
        }
        `;
    }

    async generateJsonDocumentation() {
        const endpoints = Array.from(this.endpoints.values());
        const openApiSpec = {
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
            paths: {}
        };
        
        for (const endpoint of endpoints) {
            if (!openApiSpec.paths[endpoint.path]) {
                openApiSpec.paths[endpoint.path] = {};
            }
            
            openApiSpec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
                summary: endpoint.summary,
                description: endpoint.description,
                tags: endpoint.tags || [],
                requestBody: endpoint.requestBody,
                responses: endpoint.responses || {}
            };
        }
        
        const filePath = path.join(this.config.outputDir, 'openapi.json');
        await fs.writeFile(filePath, JSON.stringify(openApiSpec, null, 2));
        console.log(`📄 OpenAPI JSON documentation saved to: ${filePath}`);
    }

    async generateMarkdownDocumentation() {
        const endpoints = Array.from(this.endpoints.values());
        const groupedEndpoints = this.groupEndpointsByTag(endpoints);
        
        let markdown = `# ${this.config.title}\n\n`;
        markdown += `Version: ${this.config.version}\n\n`;
        markdown += `${this.config.description}\n\n`;
        markdown += `Base URL: \`${this.config.baseUrl}\`\n\n`;
        
        markdown += '## Table of Contents\n\n';
        for (const tag of Object.keys(groupedEndpoints)) {
            markdown += `- [${tag}](#${tag.toLowerCase().replace(/\s+/g, '-')})\n`;
        }
        markdown += '\n';
        
        for (const [tag, endpoints] of Object.entries(groupedEndpoints)) {
            markdown += `## ${tag}\n\n`;
            
            for (const endpoint of endpoints) {
                markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
                markdown += `${endpoint.description}\n\n`;
                
                if (endpoint.requestBody) {
                    markdown += '**Request Body:**\n\n';
                    markdown += '```json\n';
                    markdown += JSON.stringify(this.generateExampleBody(endpoint.requestBody.schema), null, 2);
                    markdown += '\n```\n\n';
                }
                
                if (endpoint.responses) {
                    markdown += '**Responses:**\n\n';
                    for (const [code, response] of Object.entries(endpoint.responses)) {
                        markdown += `- **${code}**: ${response.description}\n`;
                    }
                    markdown += '\n';
                }
                
                const examples = this.examples.get(endpoint.path);
                if (examples) {
                    markdown += '**Examples:**\n\n';
                    for (const [lang, example] of Object.entries(examples)) {
                        markdown += `**${lang.charAt(0).toUpperCase() + lang.slice(1)}:**\n\n`;
                        markdown += '```' + (lang === 'javascript' ? 'js' : lang) + '\n';
                        markdown += example;
                        markdown += '\n```\n\n';
                    }
                }
                
                markdown += '---\n\n';
            }
        }
        
        const filePath = path.join(this.config.outputDir, 'README.md');
        await fs.writeFile(filePath, markdown);
        console.log(`📄 Markdown documentation saved to: ${filePath}`);
    }

    groupEndpointsByTag(endpoints) {
        const grouped = {};
        for (const endpoint of endpoints) {
            const tag = endpoint.tags && endpoint.tags[0] ? endpoint.tags[0] : 'General';
            if (!grouped[tag]) {
                grouped[tag] = [];
            }
            grouped[tag].push(endpoint);
        }
        return grouped;
    }

    escapeHtml(text) {
        const div = { innerHTML: text };
        return div.innerHTML
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    getDocumentationMiddleware() {
        return (req, res, next) => {
            if (req.path === '/docs' || req.path === '/docs/') {
                const htmlPath = path.join(this.config.outputDir, 'index.html');
                res.sendFile(htmlPath);
            } else if (req.path === '/docs/openapi.json') {
                const jsonPath = path.join(this.config.outputDir, 'openapi.json');
                res.sendFile(jsonPath);
            } else {
                next();
            }
        };
    }

    async updateDocumentation() {
        await this.generateDocumentation();
        console.log('📚 Documentation updated');
    }

    getStats() {
        return {
            totalEndpoints: this.endpoints.size,
            totalExamples: this.examples.size,
            formats: this.config.formats,
            languages: this.config.languages,
            isInitialized: this.isInitialized,
            lastGenerated: new Date().toISOString()
        };
    }

    async shutdown() {
        console.log('📚 Shutting down API Documentation Generator...');
        console.log('✅ API Documentation Generator shutdown complete');
    }
}

module.exports = { APIDocumentationGenerator };