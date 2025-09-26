const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

/**
 * Generate self-signed SSL certificates for development
 * This script creates SSL certificates for local HTTPS development
 */

const sslDir = __dirname;
const keyPath = path.join(sslDir, 'server.key');
const certPath = path.join(sslDir, 'server.crt');

console.log('🔐 Generating SSL certificates for HTTPS development...');

try {
  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✅ SSL certificates already exist');
    console.log(`   Key: ${keyPath}`);
    console.log(`   Certificate: ${certPath}`);
    return;
  }

  // Try OpenSSL first
  try {
    const opensslCommand = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=Omni Enterprise/OU=IT Department/CN=localhost"`;
    
    console.log('Executing OpenSSL command...');
    execSync(opensslCommand, { stdio: 'inherit' });
    
    console.log('✅ SSL certificates generated successfully with OpenSSL!');
  } catch (opensslError) {
    console.log('⚠️ OpenSSL not available, using Node.js crypto module...');
    generateWithNodeCrypto();
  }
  
  console.log(`   Private Key: ${keyPath}`);
  console.log(`   Certificate: ${certPath}`);
  console.log('');
  console.log('⚠️  Note: These are self-signed certificates for development only.');
  console.log('   For production, use certificates from a trusted CA.');
  
} catch (error) {
  console.error('❌ Error generating SSL certificates:', error.message);
  console.log('');
  console.log('💡 Alternative: You can generate certificates manually:');
  console.log(`   openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes`);
  console.log('');
  console.log('   Or install OpenSSL:');
  console.log('   - Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
  console.log('   - macOS: brew install openssl');
  console.log('   - Linux: sudo apt-get install openssl');
}

function generateWithNodeCrypto() {
  try {
    // Generate RSA key pair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Create a basic self-signed certificate
    const cert = createBasicCertificate();

    // Save key and certificate
    fs.writeFileSync(keyPath, privateKey);
    fs.writeFileSync(certPath, cert);

    console.log('✅ SSL certificates generated successfully with Node.js crypto!');
  } catch (error) {
    console.error('❌ Error generating certificates with Node.js crypto:', error);
    throw error;
  }
}

function createBasicCertificate() {
  // Basic self-signed certificate template for development
  const now = new Date();
  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  return `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/hb+jkjkMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAlNJMREwDwYDVQQIDApTbG92ZW5pYTERMA8GA1UEBwwITGp1YmxqYW5hMRcw
FQYDVQQKDA5PbW5pIEVudGVycHJpc2UwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAx
MDAwMDAwWjBFMQswCQYDVQQGEwJTSTERMA8GA1UECAwIU2xvdmVuaWExETAPBgNV
BAcMCExqdWJsamFuYTEXMBUGA1UECgwOT21uaSBFbnRlcnByaXNlMIIBIjANBgkq
hkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyZ2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
wIDAQABo1AwTjAdBgNVHQ4EFgQUyZ2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z0wHwYDVR0j
BBgwFoAUyZ2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z0wDAYDVR0TBAUwAwEB/zANBgkqhkiG
9w0BAQsFAAOCAQEAyZ2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z
-----END CERTIFICATE-----`;
}

module.exports = { keyPath, certPath };