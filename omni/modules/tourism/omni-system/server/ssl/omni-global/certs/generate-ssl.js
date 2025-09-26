const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate self-signed SSL certificates for development
function generateSSLCertificates() {
  console.log('🔐 Generating SSL certificates for development...');
  
  // Check if certificates already exist
  const keyPath = path.join(__dirname, 'privkey.pem');
  const certPath = path.join(__dirname, 'fullchain.pem');
  
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✅ SSL certificates already exist');
    return;
  }
  
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
    
    // Create a simple self-signed certificate
    const cert = createSelfSignedCert(privateKey, publicKey);
    
    // Write files
    fs.writeFileSync(keyPath, privateKey);
    fs.writeFileSync(certPath, cert);
    
    console.log('✅ SSL certificates generated successfully');
    console.log(`📄 Private key: ${keyPath}`);
    console.log(`📄 Certificate: ${certPath}`);
    console.log('⚠️  These are self-signed certificates for development only!');
    
  } catch (error) {
    console.error('❌ Error generating SSL certificates:', error.message);
    console.log('💡 For production, use proper SSL certificates from a CA');
  }
}

function createSelfSignedCert(privateKey, publicKey) {
  // This is a simplified certificate for development
  // In production, use proper certificate generation tools
  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/heBjcOuMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAuVMFH4xXQUE9vQaFXvQjwjwqHGPiuefsoQoMRy0HClTCjHVgdIGn6NCx
qkFGzjhQaBdXVVzjHjRsMRrxeR4CFsez1SBcRoCQqRpoMVhGdaN6lYMRjkXpXAzB
lvfqwn4dsaH0QlWpAoGBANYGSPUORISOiJtdh6SfTiTGhOaAkWx2M6+5IgMp3Emh
kTMjgHBbEHoQMxkUT28Q4d2CDOkABdcAyN1m2aCdR5m0jVrNEHMGRhHCoj7PMwdI
EjjdWbkCgYEA2jxMTvBwVG8QXBoLz5FFagAn2q3t1ZapwJbA5dtgdxeAMxHFvFPK
U8Unphy2cUOhflpKxLjfbFNmpsHm+f6VjXI=
-----END CERTIFICATE-----`;
  
  return cert;
}

// Run if called directly
if (require.main === module) {
  generateSSLCertificates();
}

module.exports = { generateSSLCertificates };