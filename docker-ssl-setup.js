#!/usr/bin/env node

/**
 * 🔐 Omni Ultimate - SSL Certificate Setup & Validation
 * Avtomatska konfiguracija in validacija SSL certifikatov za Docker
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

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
 * 📁 SSL konfiguracija
 */
const SSL_CONFIG = {
    certsDir: '/app/certs',
    keyFile: 'server.key',
    certFile: 'server.crt',
    csrFile: 'server.csr',
    configFile: 'openssl.conf',
    
    // Privzete vrednosti za certifikat
    defaults: {
        country: 'SI',
        state: 'Slovenia',
        city: 'Ljubljana',
        organization: 'Omni Ultimate',
        organizationalUnit: 'IT Department',
        commonName: 'localhost',
        email: 'admin@omni-ultimate.com',
        validityDays: 365
    }
};

/**
 * 🔍 Preveri ali obstajajo SSL certifikati
 */
function checkExistingCertificates() {
    logger.info('Checking existing SSL certificates...');
    
    const keyPath = path.join(SSL_CONFIG.certsDir, SSL_CONFIG.keyFile);
    const certPath = path.join(SSL_CONFIG.certsDir, SSL_CONFIG.certFile);
    
    const keyExists = fs.existsSync(keyPath);
    const certExists = fs.existsSync(certPath);
    
    if (keyExists && certExists) {
        logger.success('SSL certificates found');
        return { keyPath, certPath, exists: true };
    } else {
        logger.warn('SSL certificates not found');
        return { keyPath, certPath, exists: false };
    }
}

/**
 * 📋 Ustvari OpenSSL konfiguracijo
 */
function createOpenSSLConfig() {
    const configPath = path.join(SSL_CONFIG.certsDir, SSL_CONFIG.configFile);
    
    const config = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=${SSL_CONFIG.defaults.country}
ST=${SSL_CONFIG.defaults.state}
L=${SSL_CONFIG.defaults.city}
O=${SSL_CONFIG.defaults.organization}
OU=${SSL_CONFIG.defaults.organizationalUnit}
CN=${SSL_CONFIG.defaults.commonName}
emailAddress=${SSL_CONFIG.defaults.email}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = omni-app
DNS.4 = *.omni-app
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = 0.0.0.0
`.trim();

    fs.writeFileSync(configPath, config);
    logger.success(`OpenSSL config created: ${configPath}`);
    return configPath;
}

/**
 * 🔐 Generiraj SSL certifikate
 */
function generateSSLCertificates() {
    logger.info('Generating SSL certificates...');
    
    try {
        // Ustvari certs direktorij
        if (!fs.existsSync(SSL_CONFIG.certsDir)) {
            fs.mkdirSync(SSL_CONFIG.certsDir, { recursive: true });
            logger.success(`Created certs directory: ${SSL_CONFIG.certsDir}`);
        }
        
        // Ustvari OpenSSL konfiguracijo
        const configPath = createOpenSSLConfig();
        
        const keyPath = path.join(SSL_CONFIG.certsDir, SSL_CONFIG.keyFile);
        const certPath = path.join(SSL_CONFIG.certsDir, SSL_CONFIG.certFile);
        
        // Generiraj privatni ključ
        logger.info('Generating private key...');
        execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'pipe' });
        logger.success('Private key generated');
        
        // Generiraj certifikat
        logger.info('Generating certificate...');
        execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days ${SSL_CONFIG.defaults.validityDays} -config "${configPath}" -extensions v3_req`, { stdio: 'pipe' });
        logger.success('Certificate generated');
        
        // Nastavi dovoljenja
        fs.chmodSync(keyPath, 0o600);
        fs.chmodSync(certPath, 0o644);
        
        logger.success('SSL certificates generated successfully!');
        return { keyPath, certPath };
        
    } catch (error) {
        logger.error(`Failed to generate SSL certificates: ${error.message}`);
        throw error;
    }
}

/**
 * 🔍 Validiraj SSL certifikat
 */
function validateCertificate(certPath) {
    logger.info('Validating SSL certificate...');
    
    try {
        // Preberi certifikat
        const certContent = fs.readFileSync(certPath, 'utf8');
        
        // Preveri osnovne informacije
        const certInfo = execSync(`openssl x509 -in "${certPath}" -text -noout`, { encoding: 'utf8' });
        
        // Izvleci pomembne informacije
        const subjectMatch = certInfo.match(/Subject:.*CN\s*=\s*([^,\n]+)/);
        const issuerMatch = certInfo.match(/Issuer:.*CN\s*=\s*([^,\n]+)/);
        const validFromMatch = certInfo.match(/Not Before:\s*(.+)/);
        const validToMatch = certInfo.match(/Not After\s*:\s*(.+)/);
        
        const subject = subjectMatch ? subjectMatch[1].trim() : 'Unknown';
        const issuer = issuerMatch ? issuerMatch[1].trim() : 'Unknown';
        const validFrom = validFromMatch ? new Date(validFromMatch[1].trim()) : null;
        const validTo = validToMatch ? new Date(validToMatch[1].trim()) : null;
        
        logger.success(`Certificate Subject: ${subject}`);
        logger.success(`Certificate Issuer: ${issuer}`);
        
        if (validFrom && validTo) {
            const now = new Date();
            const daysUntilExpiry = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
            
            logger.success(`Valid From: ${validFrom.toISOString()}`);
            logger.success(`Valid To: ${validTo.toISOString()}`);
            
            if (now < validFrom) {
                logger.warn('Certificate is not yet valid');
                return { valid: false, reason: 'not_yet_valid' };
            } else if (now > validTo) {
                logger.error('Certificate has expired');
                return { valid: false, reason: 'expired' };
            } else if (daysUntilExpiry <= 30) {
                logger.warn(`Certificate expires in ${daysUntilExpiry} days`);
                return { valid: true, warning: 'expires_soon', daysUntilExpiry };
            } else {
                logger.success(`Certificate is valid (expires in ${daysUntilExpiry} days)`);
                return { valid: true, daysUntilExpiry };
            }
        }
        
        return { valid: true };
        
    } catch (error) {
        logger.error(`Certificate validation failed: ${error.message}`);
        return { valid: false, reason: 'validation_error', error: error.message };
    }
}

/**
 * 🔐 Preveri SSL konfiguracije v aplikaciji
 */
function checkSSLConfiguration() {
    logger.info('Checking SSL configuration...');
    
    const sslEnabled = process.env.SSL_ENABLED === 'true';
    const sslPort = process.env.SSL_PORT || '443';
    const sslKey = process.env.SSL_KEY_PATH;
    const sslCert = process.env.SSL_CERT_PATH;
    
    logger.info(`SSL Enabled: ${sslEnabled}`);
    
    if (sslEnabled) {
        logger.info(`SSL Port: ${sslPort}`);
        logger.info(`SSL Key Path: ${sslKey || 'Not specified'}`);
        logger.info(`SSL Cert Path: ${sslCert || 'Not specified'}`);
        
        if (!sslKey || !sslCert) {
            logger.warn('SSL paths not specified in environment variables');
            return { configured: false, reason: 'missing_paths' };
        }
        
        if (!fs.existsSync(sslKey)) {
            logger.error(`SSL key file not found: ${sslKey}`);
            return { configured: false, reason: 'key_not_found' };
        }
        
        if (!fs.existsSync(sslCert)) {
            logger.error(`SSL certificate file not found: ${sslCert}`);
            return { configured: false, reason: 'cert_not_found' };
        }
        
        logger.success('SSL configuration is valid');
        return { configured: true };
    } else {
        logger.info('SSL is disabled');
        return { configured: false, reason: 'disabled' };
    }
}

/**
 * 📊 Prikaz SSL povzetka
 */
function displaySSLSummary(results) {
    console.log();
    logger.header('🔐 SSL Configuration Summary');
    console.log('='.repeat(50));
    
    if (results.certificates.exists) {
        logger.success('SSL certificates: Available');
        
        if (results.validation.valid) {
            logger.success('Certificate validation: Passed');
            if (results.validation.daysUntilExpiry) {
                logger.info(`Days until expiry: ${results.validation.daysUntilExpiry}`);
            }
        } else {
            logger.error(`Certificate validation: Failed (${results.validation.reason})`);
        }
    } else {
        logger.warn('SSL certificates: Not found');
    }
    
    if (results.configuration.configured) {
        logger.success('SSL configuration: Valid');
    } else {
        logger.warn(`SSL configuration: ${results.configuration.reason}`);
    }
    
    console.log('='.repeat(50));
}

/**
 * 💾 Shrani SSL rezultate
 */
function saveSSLResults(results) {
    try {
        const logsDir = '/app/logs';
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        const resultsFile = path.join(logsDir, 'ssl-setup.json');
        const sanitizedResults = {
            ...results,
            timestamp: new Date().toISOString(),
            environment: {
                SSL_ENABLED: process.env.SSL_ENABLED,
                SSL_PORT: process.env.SSL_PORT,
                SSL_KEY_PATH: process.env.SSL_KEY_PATH,
                SSL_CERT_PATH: process.env.SSL_CERT_PATH
            }
        };
        
        fs.writeFileSync(resultsFile, JSON.stringify(sanitizedResults, null, 2));
        logger.success(`SSL results saved to: ${resultsFile}`);
    } catch (error) {
        logger.warn(`Could not save SSL results: ${error.message}`);
    }
}

/**
 * 🚀 Glavna funkcija
 */
function main() {
    try {
        logger.header('🔐 SSL Certificate Setup & Validation');
        logger.info(`Timestamp: ${new Date().toISOString()}`);
        console.log();
        
        const results = {
            certificates: null,
            validation: null,
            configuration: null,
            generated: false
        };
        
        // Preveri obstoječe certifikate
        results.certificates = checkExistingCertificates();
        
        // Generiraj certifikate če ne obstajajo
        if (!results.certificates.exists) {
            if (process.env.SSL_AUTO_GENERATE === 'true') {
                logger.info('Auto-generating SSL certificates...');
                const generated = generateSSLCertificates();
                results.certificates = { ...generated, exists: true };
                results.generated = true;
            } else {
                logger.warn('SSL certificates not found and auto-generation is disabled');
            }
        }
        
        // Validiraj certifikate
        if (results.certificates.exists) {
            results.validation = validateCertificate(results.certificates.certPath);
        }
        
        // Preveri SSL konfiguracijo
        results.configuration = checkSSLConfiguration();
        
        // Prikaži povzetek
        displaySSLSummary(results);
        
        // Shrani rezultate
        saveSSLResults(results);
        
        logger.success('SSL setup completed!');
        
    } catch (error) {
        logger.error(`SSL setup failed: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// 🚀 Zagon SSL setup-a
if (require.main === module) {
    main();
}

module.exports = { 
    checkExistingCertificates, 
    generateSSLCertificates, 
    validateCertificate, 
    checkSSLConfiguration 
};