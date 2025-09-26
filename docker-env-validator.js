#!/usr/bin/env node

/**
 * 🔧 Omni Ultimate - Environment Variables Validator
 * Validacija okoljskih spremenljivk ob zagonu Docker kontejnerja
 */

const fs = require('fs');
const path = require('path');

// 🎨 Barve za konzolo
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

/**
 * 📝 Logging funkcije
 */
const logger = {
    info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
    debug: (msg) => console.log(`${colors.dim}🔍 ${msg}${colors.reset}`),
    header: (msg) => console.log(`${colors.bold}${colors.cyan}${msg}${colors.reset}`)
};

/**
 * 🔧 Definicije okoljskih spremenljivk
 */
const ENV_DEFINITIONS = {
    // Obvezne spremenljivke
    required: {
        'NODE_ENV': {
            description: 'Node.js environment',
            allowedValues: ['development', 'production', 'test'],
            default: 'production'
        },
        'PORT': {
            description: 'Main application port',
            type: 'number',
            min: 1000,
            max: 65535,
            default: 3000
        },
        'MONGO_ROOT_USERNAME': {
            description: 'MongoDB root username',
            type: 'string',
            minLength: 3,
            required: true
        },
        'MONGO_ROOT_PASSWORD': {
            description: 'MongoDB root password',
            type: 'string',
            minLength: 8,
            required: true,
            sensitive: true
        },
        'JWT_SECRET': {
            description: 'JWT signing secret',
            type: 'string',
            minLength: 32,
            required: true,
            sensitive: true
        }
    },
    
    // Opcijske spremenljivke
    optional: {
        'WEBSOCKET_PORT': {
            description: 'WebSocket server port',
            type: 'number',
            min: 1000,
            max: 65535,
            default: 3001
        },
        'LOG_LEVEL': {
            description: 'Logging level',
            allowedValues: ['error', 'warn', 'info', 'debug'],
            default: 'info'
        },
        'DEBUG_MODE': {
            description: 'Enable debug mode',
            type: 'boolean',
            default: false
        },
        'SSL_ENABLED': {
            description: 'Enable SSL/TLS',
            type: 'boolean',
            default: false
        },
        'RATE_LIMIT_WINDOW': {
            description: 'Rate limiting window (minutes)',
            type: 'number',
            min: 1,
            max: 60,
            default: 15
        },
        'RATE_LIMIT_MAX': {
            description: 'Max requests per window',
            type: 'number',
            min: 10,
            max: 10000,
            default: 100
        },
        'DEFAULT_LICENSE_DURATION': {
            description: 'Default license duration (days)',
            type: 'number',
            min: 1,
            max: 365,
            default: 30
        }
    }
};

/**
 * 🔍 Validacija posamezne spremenljivke
 */
function validateEnvVar(name, value, definition) {
    const errors = [];
    const warnings = [];
    
    // Preveri če je vrednost podana
    if (!value || value.trim() === '') {
        if (definition.required) {
            errors.push(`Missing required environment variable: ${name}`);
            return { valid: false, errors, warnings };
        } else if (definition.default !== undefined) {
            warnings.push(`Using default value for ${name}: ${definition.default}`);
            return { valid: true, errors, warnings, value: definition.default };
        }
    }
    
    const trimmedValue = value ? value.trim() : '';
    
    // Type validation
    if (definition.type) {
        switch (definition.type) {
            case 'number':
                const numValue = parseInt(trimmedValue);
                if (isNaN(numValue)) {
                    errors.push(`${name} must be a number, got: ${trimmedValue}`);
                } else {
                    if (definition.min !== undefined && numValue < definition.min) {
                        errors.push(`${name} must be >= ${definition.min}, got: ${numValue}`);
                    }
                    if (definition.max !== undefined && numValue > definition.max) {
                        errors.push(`${name} must be <= ${definition.max}, got: ${numValue}`);
                    }
                }
                break;
                
            case 'boolean':
                const boolValue = trimmedValue.toLowerCase();
                if (!['true', 'false', '1', '0', 'yes', 'no'].includes(boolValue)) {
                    errors.push(`${name} must be a boolean value, got: ${trimmedValue}`);
                }
                break;
                
            case 'string':
                if (definition.minLength && trimmedValue.length < definition.minLength) {
                    errors.push(`${name} must be at least ${definition.minLength} characters long`);
                }
                if (definition.maxLength && trimmedValue.length > definition.maxLength) {
                    errors.push(`${name} must be at most ${definition.maxLength} characters long`);
                }
                break;
        }
    }
    
    // Allowed values validation
    if (definition.allowedValues && !definition.allowedValues.includes(trimmedValue)) {
        errors.push(`${name} must be one of: ${definition.allowedValues.join(', ')}, got: ${trimmedValue}`);
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        value: trimmedValue
    };
}

/**
 * 🔧 Glavna validacija
 */
function validateEnvironment() {
    logger.header('🔧 Environment Variables Validation');
    logger.info(`Timestamp: ${new Date().toISOString()}`);
    console.log();
    
    const results = {
        valid: true,
        errors: [],
        warnings: [],
        variables: {},
        summary: {
            total: 0,
            required: 0,
            optional: 0,
            valid: 0,
            invalid: 0,
            missing: 0
        }
    };
    
    // Preveri obvezne spremenljivke
    logger.info('Checking required environment variables...');
    for (const [name, definition] of Object.entries(ENV_DEFINITIONS.required)) {
        const value = process.env[name];
        const validation = validateEnvVar(name, value, definition);
        
        results.variables[name] = {
            ...validation,
            required: true,
            definition
        };
        
        results.summary.total++;
        results.summary.required++;
        
        if (validation.valid) {
            results.summary.valid++;
            const displayValue = definition.sensitive ? '***HIDDEN***' : (validation.value || value);
            logger.success(`${name}: ${displayValue}`);
        } else {
            results.summary.invalid++;
            results.valid = false;
            logger.error(`${name}: INVALID`);
            validation.errors.forEach(error => {
                logger.error(`  ${error}`);
                results.errors.push(error);
            });
        }
        
        validation.warnings.forEach(warning => {
            logger.warn(`  ${warning}`);
            results.warnings.push(warning);
        });
    }
    
    console.log();
    
    // Preveri opcijske spremenljivke
    logger.info('Checking optional environment variables...');
    for (const [name, definition] of Object.entries(ENV_DEFINITIONS.optional)) {
        const value = process.env[name];
        const validation = validateEnvVar(name, value, definition);
        
        results.variables[name] = {
            ...validation,
            required: false,
            definition
        };
        
        results.summary.total++;
        results.summary.optional++;
        
        if (validation.valid) {
            results.summary.valid++;
            const displayValue = definition.sensitive ? '***HIDDEN***' : (validation.value || value || definition.default);
            logger.success(`${name}: ${displayValue}`);
        } else {
            results.summary.invalid++;
            logger.warn(`${name}: INVALID (optional)`);
            validation.errors.forEach(error => {
                logger.warn(`  ${error}`);
                results.warnings.push(error);
            });
        }
        
        validation.warnings.forEach(warning => {
            logger.warn(`  ${warning}`);
            results.warnings.push(warning);
        });
    }
    
    return results;
}

/**
 * 📊 Prikaz povzetka
 */
function displaySummary(results) {
    console.log();
    logger.header('📊 Validation Summary');
    console.log('='.repeat(50));
    
    logger.info(`Total variables: ${results.summary.total}`);
    logger.info(`Required: ${results.summary.required}`);
    logger.info(`Optional: ${results.summary.optional}`);
    logger.success(`Valid: ${results.summary.valid}`);
    
    if (results.summary.invalid > 0) {
        logger.error(`Invalid: ${results.summary.invalid}`);
    }
    
    if (results.errors.length > 0) {
        console.log();
        logger.error('Validation Errors:');
        results.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
    }
    
    if (results.warnings.length > 0) {
        console.log();
        logger.warn('Warnings:');
        results.warnings.forEach((warning, index) => {
            console.log(`  ${index + 1}. ${warning}`);
        });
    }
    
    console.log();
    const status = results.valid ? 
        `${colors.green}${colors.bold}✓ VALIDATION PASSED${colors.reset}` :
        `${colors.red}${colors.bold}✗ VALIDATION FAILED${colors.reset}`;
    
    console.log(status);
    console.log('='.repeat(50));
}

/**
 * 💾 Shrani rezultate validacije
 */
function saveValidationResults(results) {
    try {
        const logsDir = '/app/logs';
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        const resultsFile = path.join(logsDir, 'env-validation.json');
        const sanitizedResults = {
            ...results,
            variables: Object.fromEntries(
                Object.entries(results.variables).map(([name, data]) => [
                    name,
                    {
                        ...data,
                        value: data.definition?.sensitive ? '***HIDDEN***' : data.value
                    }
                ])
            )
        };
        
        fs.writeFileSync(resultsFile, JSON.stringify(sanitizedResults, null, 2));
        logger.success(`Validation results saved to: ${resultsFile}`);
    } catch (error) {
        logger.warn(`Could not save validation results: ${error.message}`);
    }
}

/**
 * 🚀 Glavna funkcija
 */
function main() {
    try {
        // Preveri ali je validacija omogočena
        if (process.env.VALIDATE_ENV_ON_STARTUP !== 'true') {
            logger.info('Environment validation disabled (VALIDATE_ENV_ON_STARTUP != true)');
            return;
        }
        
        const results = validateEnvironment();
        displaySummary(results);
        saveValidationResults(results);
        
        if (!results.valid) {
            logger.error('Environment validation failed. Exiting...');
            process.exit(1);
        }
        
        logger.success('Environment validation completed successfully!');
        
    } catch (error) {
        logger.error(`Environment validation crashed: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// 🚀 Zagon validacije
if (require.main === module) {
    main();
}

module.exports = { validateEnvironment, validateEnvVar, ENV_DEFINITIONS };