class OmniCodeGenerator {
    constructor() {
        this.codeTemplates = {
            frontend: {
                react: {
                    component: `import React, { useState, useEffect } from 'react';
import './{{componentName}}.css';

const {{componentName}} = ({{props}}) => {
    {{stateVariables}}
    {{useEffectHooks}}
    
    {{eventHandlers}}
    
    return (
        <div className="{{componentName.toLowerCase()}}">
            {{componentContent}}
        </div>
    );
};

export default {{componentName}};`,
                    css: `.{{componentName.toLowerCase()}} {
    {{styles}}
}`,
                    hooks: `import { useState, useEffect, useCallback } from 'react';

export const use{{hookName}} = ({{parameters}}) => {
    {{hookLogic}}
    
    return {{returnValue}};
};`
                },
                vue: {
                    component: `<template>
    <div class="{{componentName.toLowerCase()}}">
        {{templateContent}}
    </div>
</template>

<script>
export default {
    name: '{{componentName}}',
    props: {{props}},
    data() {
        return {
            {{dataProperties}}
        };
    },
    methods: {
        {{methods}}
    },
    mounted() {
        {{mountedLogic}}
    }
};
</script>

<style scoped>
{{styles}}
</style>`
                }
            },
            backend: {
                node: {
                    express: `const express = require('express');
const router = express.Router();
{{imports}}

// {{description}}
router.{{method}}('{{route}}', async (req, res) => {
    try {
        {{routeLogic}}
        res.json({{response}});
    } catch (error) {
        console.error('Error in {{route}}:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;`,
                    model: `const mongoose = require('mongoose');

const {{modelName}}Schema = new mongoose.Schema({
    {{schemaFields}}
}, {
    timestamps: true
});

{{schemaMethods}}

module.exports = mongoose.model('{{modelName}}', {{modelName}}Schema);`,
                    service: `class {{serviceName}} {
    constructor() {
        {{constructorLogic}}
    }
    
    {{serviceMethods}}
}

module.exports = {{serviceName}};`
                },
                python: {
                    flask: `from flask import Blueprint, request, jsonify
{{imports}}

{{blueprintName}}_bp = Blueprint('{{blueprintName}}', __name__)

@{{blueprintName}}_bp.route('{{route}}', methods=['{{method}}'])
def {{functionName}}():
    try:
        {{routeLogic}}
        return jsonify({{response}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500`,
                    model: `from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class {{modelName}}(Base):
    __tablename__ = '{{tableName}}'
    
    {{modelFields}}
    
    def __init__(self, {{initParams}}):
        {{initLogic}}
    
    def to_dict(self):
        return {
            {{toDictLogic}}
        }`
                }
            },
            database: {
                sql: {
                    createTable: `CREATE TABLE {{tableName}} (
    {{tableFields}}
);`,
                    insertData: `INSERT INTO {{tableName}} ({{columns}}) VALUES {{values}};`,
                    selectQuery: `SELECT {{columns}} FROM {{tableName}} {{whereClause}} {{orderBy}} {{limit}};`
                },
                mongodb: {
                    schema: `{
    {{schemaFields}}
}`,
                    aggregation: `[
    {{aggregationPipeline}}
]`
                }
            }
        };
        
        this.designTemplates = {
            colorSchemes: {
                modern: {
                    primary: '#2563eb',
                    secondary: '#64748b',
                    accent: '#f59e0b',
                    background: '#ffffff',
                    surface: '#f8fafc',
                    text: '#1e293b',
                    textSecondary: '#64748b'
                },
                dark: {
                    primary: '#3b82f6',
                    secondary: '#6b7280',
                    accent: '#fbbf24',
                    background: '#111827',
                    surface: '#1f2937',
                    text: '#f9fafb',
                    textSecondary: '#d1d5db'
                },
                nature: {
                    primary: '#059669',
                    secondary: '#6b7280',
                    accent: '#f59e0b',
                    background: '#f0fdf4',
                    surface: '#ffffff',
                    text: '#064e3b',
                    textSecondary: '#374151'
                }
            },
            layouts: {
                dashboard: `
                    <div class="dashboard-layout">
                        <header class="dashboard-header">{{header}}</header>
                        <aside class="dashboard-sidebar">{{sidebar}}</aside>
                        <main class="dashboard-main">{{main}}</main>
                        <footer class="dashboard-footer">{{footer}}</footer>
                    </div>
                `,
                landing: `
                    <div class="landing-layout">
                        <header class="landing-header">{{header}}</header>
                        <section class="hero-section">{{hero}}</section>
                        <section class="features-section">{{features}}</section>
                        <section class="testimonials-section">{{testimonials}}</section>
                        <footer class="landing-footer">{{footer}}</footer>
                    </div>
                `,
                ecommerce: `
                    <div class="ecommerce-layout">
                        <header class="ecommerce-header">{{header}}</header>
                        <nav class="product-navigation">{{navigation}}</nav>
                        <main class="product-grid">{{products}}</main>
                        <aside class="filters-sidebar">{{filters}}</aside>
                        <footer class="ecommerce-footer">{{footer}}</footer>
                    </div>
                `
            }
        };
        
        this.functionalityTemplates = {
            authentication: {
                login: `
                    async function login(credentials) {
                        try {
                            const response = await fetch('/api/auth/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(credentials)
                            });
                            const data = await response.json();
                            if (data.token) {
                                localStorage.setItem('authToken', data.token);
                                return { success: true, user: data.user };
                            }
                            return { success: false, error: data.error };
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                    }
                `,
                register: `
                    async function register(userData) {
                        try {
                            const response = await fetch('/api/auth/register', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(userData)
                            });
                            const data = await response.json();
                            return data;
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                    }
                `
            },
            crud: {
                create: `
                    async function create{{entityName}}(data) {
                        try {
                            const response = await fetch('/api/{{entityName.toLowerCase()}}', {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                                },
                                body: JSON.stringify(data)
                            });
                            return await response.json();
                        } catch (error) {
                            throw new Error('Failed to create {{entityName.toLowerCase()}}: ' + error.message);
                        }
                    }
                `,
                read: `
                    async function get{{entityName}}(id) {
                        try {
                            const response = await fetch('/api/{{entityName.toLowerCase()}}/' + id, {
                                headers: { 
                                    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                                }
                            });
                            return await response.json();
                        } catch (error) {
                            throw new Error('Failed to get {{entityName.toLowerCase()}}: ' + error.message);
                        }
                    }
                `
            },
            payment: {
                stripe: `
                    async function processPayment(paymentData) {
                        try {
                            const response = await fetch('/api/payment/process', {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                                },
                                body: JSON.stringify(paymentData)
                            });
                            return await response.json();
                        } catch (error) {
                            throw new Error('Payment failed: ' + error.message);
                        }
                    }
                `
            }
        };
    }
    
    generateCode(requirements) {
        const generatedCode = {
            frontend: this.generateFrontendCode(requirements),
            backend: this.generateBackendCode(requirements),
            database: this.generateDatabaseCode(requirements),
            config: this.generateConfigFiles(requirements)
        };
        
        return generatedCode;
    }
    
    generateFrontendCode(requirements) {
        const { framework, components, features } = requirements.frontend || {};
        const code = {};
        
        if (framework === 'react') {
            code.components = this.generateReactComponents(components || []);
            code.hooks = this.generateReactHooks(features || []);
            code.styles = this.generateCSS(requirements.design);
        } else if (framework === 'vue') {
            code.components = this.generateVueComponents(components || []);
            code.styles = this.generateCSS(requirements.design);
        }
        
        code.functionality = this.generateFrontendFunctionality(features || []);
        
        return code;
    }
    
    generateReactComponents(components) {
        const generatedComponents = {};
        
        components.forEach(component => {
            const template = this.codeTemplates.frontend.react.component;
            const componentCode = template
                .replace(/\{\{componentName\}\}/g, component.name)
                .replace(/\{\{props\}\}/g, this.generateProps(component.props))
                .replace(/\{\{stateVariables\}\}/g, this.generateStateVariables(component.state))
                .replace(/\{\{useEffectHooks\}\}/g, this.generateUseEffectHooks(component.effects))
                .replace(/\{\{eventHandlers\}\}/g, this.generateEventHandlers(component.events))
                .replace(/\{\{componentContent\}\}/g, this.generateComponentContent(component.content));
            
            generatedComponents[component.name] = componentCode;
        });
        
        return generatedComponents;
    }
    
    generateBackendCode(requirements) {
        const { framework, routes, models, services } = requirements.backend || {};
        const code = {};
        
        if (framework === 'express') {
            code.routes = this.generateExpressRoutes(routes || []);
            code.models = this.generateMongooseModels(models || []);
            code.services = this.generateNodeServices(services || []);
        } else if (framework === 'flask') {
            code.routes = this.generateFlaskRoutes(routes || []);
            code.models = this.generateSQLAlchemyModels(models || []);
        }
        
        return code;
    }
    
    generateDatabaseCode(requirements) {
        const { type, tables, relationships } = requirements.database || {};
        const code = {};
        
        if (type === 'postgresql' || type === 'mysql') {
            code.schema = this.generateSQLSchema(tables || [], relationships || []);
            code.migrations = this.generateSQLMigrations(tables || []);
        } else if (type === 'mongodb') {
            code.schemas = this.generateMongoSchemas(tables || []);
        }
        
        return code;
    }
    
    generateDesign(requirements) {
        const { style, layout, colorScheme } = requirements.design || {};
        
        const design = {
            colors: this.designTemplates.colorSchemes[colorScheme] || this.designTemplates.colorSchemes.modern,
            layout: this.designTemplates.layouts[layout] || this.designTemplates.layouts.dashboard,
            css: this.generateResponsiveCSS(requirements),
            components: this.generateUIComponents(requirements)
        };
        
        return design;
    }
    
    generateResponsiveCSS(requirements) {
        const colors = this.designTemplates.colorSchemes[requirements.design?.colorScheme] || this.designTemplates.colorSchemes.modern;
        
        return `
/* Global Styles */
:root {
    --primary-color: ${colors.primary};
    --secondary-color: ${colors.secondary};
    --accent-color: ${colors.accent};
    --background-color: ${colors.background};
    --surface-color: ${colors.surface};
    --text-color: ${colors.text};
    --text-secondary-color: ${colors.textSecondary};
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
}

/* Responsive Grid System */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.grid {
    display: grid;
    gap: 20px;
}

.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
    .grid-2, .grid-3, .grid-4 {
        grid-template-columns: 1fr;
    }
}

/* Component Styles */
.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-primary {
    background-color: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    opacity: 0.9;
    transform: translateY(-2px);
}

.card {
    background: var(--surface-color);
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
}

.card:hover {
    transform: translateY(-4px);
}
        `;
    }
    
    generateFunctionality(requirements) {
        const { features } = requirements;
        const functionality = {};
        
        features?.forEach(feature => {
            if (feature === 'authentication') {
                functionality.auth = this.functionalityTemplates.authentication;
            } else if (feature === 'crud') {
                functionality.crud = this.generateCRUDFunctionality(requirements.entities || []);
            } else if (feature === 'payment') {
                functionality.payment = this.functionalityTemplates.payment;
            }
        });
        
        return functionality;
    }
    
    generateConfigFiles(requirements) {
        const config = {};
        
        // Package.json for Node.js projects
        if (requirements.backend?.framework === 'express') {
            config['package.json'] = JSON.stringify({
                name: requirements.projectName || 'omni-generated-app',
                version: '1.0.0',
                description: requirements.description || 'Generated by Omni Universal Creator',
                main: 'server.js',
                scripts: {
                    start: 'node server.js',
                    dev: 'nodemon server.js',
                    test: 'jest'
                },
                dependencies: {
                    express: '^4.18.2',
                    mongoose: '^7.0.0',
                    cors: '^2.8.5',
                    dotenv: '^16.0.0',
                    bcryptjs: '^2.4.3',
                    jsonwebtoken: '^9.0.0'
                },
                devDependencies: {
                    nodemon: '^2.0.20',
                    jest: '^29.0.0'
                }
            }, null, 2);
        }
        
        // Docker configuration
        config['Dockerfile'] = `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE ${requirements.port || 3000}
CMD ["npm", "start"]
        `;
        
        // Environment variables
        config['.env.example'] = `
NODE_ENV=development
PORT=${requirements.port || 3000}
DATABASE_URL=mongodb://localhost:27017/${requirements.projectName || 'omni-app'}
JWT_SECRET=your-secret-key-here
        `;
        
        return config;
    }
    
    // Helper methods
    generateProps(props) {
        if (!props || props.length === 0) return '';
        return props.map(prop => `${prop.name}`).join(', ');
    }
    
    generateStateVariables(state) {
        if (!state || state.length === 0) return '';
        return state.map(s => `const [${s.name}, set${s.name.charAt(0).toUpperCase() + s.name.slice(1)}] = useState(${s.defaultValue || 'null'});`).join('\n    ');
    }
    
    generateUseEffectHooks(effects) {
        if (!effects || effects.length === 0) return '';
        return effects.map(effect => `
    useEffect(() => {
        ${effect.code || '// Effect logic here'}
    }, [${effect.dependencies?.join(', ') || ''}]);`).join('\n');
    }
    
    generateEventHandlers(events) {
        if (!events || events.length === 0) return '';
        return events.map(event => `
    const handle${event.name.charAt(0).toUpperCase() + event.name.slice(1)} = (${event.params || ''}) => {
        ${event.code || '// Event handler logic here'}
    };`).join('\n');
    }
    
    generateComponentContent(content) {
        if (!content) return '<div>Component content</div>';
        return content;
    }
    
    generateExpressRoutes(routes) {
        const generatedRoutes = {};
        
        routes.forEach(route => {
            const template = this.codeTemplates.backend.node.express;
            const routeCode = template
                .replace(/\{\{method\}\}/g, route.method || 'get')
                .replace(/\{\{route\}\}/g, route.path || '/')
                .replace(/\{\{description\}\}/g, route.description || 'Generated route')
                .replace(/\{\{routeLogic\}\}/g, route.logic || '// Route logic here')
                .replace(/\{\{response\}\}/g, route.response || '{ message: "Success" }')
                .replace(/\{\{imports\}\}/g, route.imports?.join('\n') || '');
            
            generatedRoutes[route.name || route.path] = routeCode;
        });
        
        return generatedRoutes;
    }
    
    generateMongooseModels(models) {
        const generatedModels = {};
        
        models.forEach(model => {
            const template = this.codeTemplates.backend.node.model;
            const schemaFields = model.fields?.map(field => 
                `${field.name}: { type: ${field.type}, ${field.required ? 'required: true' : ''} }`
            ).join(',\n    ') || '';
            
            const modelCode = template
                .replace(/\{\{modelName\}\}/g, model.name)
                .replace(/\{\{schemaFields\}\}/g, schemaFields)
                .replace(/\{\{schemaMethods\}\}/g, model.methods?.join('\n\n') || '');
            
            generatedModels[model.name] = modelCode;
        });
        
        return generatedModels;
    }
    
    generateCRUDFunctionality(entities) {
        const crud = {};
        
        entities.forEach(entity => {
            crud[entity.name] = {
                create: this.functionalityTemplates.crud.create.replace(/\{\{entityName\}\}/g, entity.name),
                read: this.functionalityTemplates.crud.read.replace(/\{\{entityName\}\}/g, entity.name)
            };
        });
        
        return crud;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OmniCodeGenerator;
}