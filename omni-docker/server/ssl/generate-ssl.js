const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

  // Generate private key and certificate
  const opensslCommand = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=Omni Enterprise/OU=IT Department/CN=localhost"`;
  
  console.log('Executing OpenSSL command...');
  execSync(opensslCommand, { stdio: 'inherit' });
  
  console.log('✅ SSL certificates generated successfully!');
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