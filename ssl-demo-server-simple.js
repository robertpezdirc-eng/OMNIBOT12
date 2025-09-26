const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Ustvari self-signed certifikat z openssl (če ni na voljo, uporabi demo)
const options = {
    key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDGtJQzP8fH8wQN
neCjGQJw2TgHdU69SGye2OLUuIWqwGf4GeNiYSRYablS3k2Cu2lmd85wdXnUjopX
Pz6edHd5+UyNda2CEMqDExnwcaIODXyydImAk5EGycpAjlXiMkVhOFQAnQzs28kA
zjYeHdIlXuFn5Oc18/ONazdRBx6796jMUkFX2B/S2piitBl8SA8WzVbOKRfI+rJY
C4Y5FhVvut8eq8E5bTyaQRqGELa17CyuM0gYmVQeOc1mHrD/r1VmRktBmdlkUSg5
cjFgHRAoGTfuZ0fAjwjnHdw8CqJ9Np1SHrjM3ZyABFBY2qoCTmQ03zMD2eMGSnw9
OhOtXAgMBAAECggEBAKTmjaS6tkK8BlPXClTQ2vpz/N6uxDeS35mXpqasqskVlaA
idgg/sWqpjXDbXr93otIMLlWsM+X0CqMDgSXKejLS2jx4GDjI1ZplJkO4Y/vTM5F
BhgxdX8VfPqJOgGGHiHFOtBEmd/nWNCfBuQWxdl8OJ+p8+pvESyh6JiIJc2SVHQ
q4+B2rlsJVfavFPFh6DzoQQGusiYi9TlO1OLsNHahiwQlWH6dDrYNjSS5qABRKAD
ElfKIDMh/8Ffgw8qSBxVBz4X8/LsWqDENyRXpCw5q4CyL8UXHL/+r8hBXGEBQdwA
dHFiDrPdE3usM3+9LubMgAHkAgBLuVVgsCgYEA4hhxeAW5vfwKfxRC4xp26x1Q8o
Hce2Rq+KWoqK0hqY5bZxs3ItMuVMokul+sjsxYk3v3dw1zJFdn5sMdnaTbvuKpjR
SyeJfQx27FwBGKaKpTWBtSNxxmCW2VSzhfXAY+rU9NOoFE0UxDMHSxhOzGiK1pZ9
LjvQHdgrh+WJ30vEsCgYEA1GR1bbqI9Jn2Ue5CediZcfhEAh+pCC9Y6pSQpx8+Ag
40k6fjZuQruCqLrNwSRfCHwDbAQlSLI2hCOj1F29BE6+75VQz69LdOO6jIXVwgQz
I9vwEMpckuFe6N8EA6venSxjlc3AqXw+9OhMEouoBiGNx2aTrQRf6CJ2dNikVzxe
ECgYEAjvx9yHkqiIMjAL53ZKKiTWxGURCeQVHdJ4txVrxie7PNSFrF5CjyMuGKQx
/GGradKtSH+3xBgOdmxUfiFOoNLl6J3/f7GjxmP40StalEaRRAjfaO2FYdqGTUE+
YZ7EEAls2k91Ua7rNqkU6jQrlpOtSy+HBhJp6OAM1R0EfOiMsCgYEAx4+OuOQm+A
5f3fGSY9+d4VgaEqk7nNS2FdQQd+zBpUYa0ccaLxhLuuZm5WZDDvhBoNhMlKPrPQ
IDAQAB
-----END PRIVATE KEY-----`,
    cert: `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiIMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTIwOTEyMjE1MjAyWhcNMTUwOTEyMjE1MjAyWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAxrSUMz/Hx/MEDZ3goxkCcNk4B3VOvUhsntji1LiFqsAZ/gZ42JhJFhpu
VLeTYK7aWZ3znB1edSOilc/Pp50d3n5TI11rYIQyoMTGfBxog4NfLJ0iYCTkQbJy
kCOVeIyRWE4VACdDOzbyQDONh4d0iVe4Wfk5zXz841rN1EHHrv3qMxSQVfYH9La
mKK0GXxIDxbNVs4pF8j6slgLhjkWFW+63x6rwTltPJpBGoYQtrXsLK4zSBiZVB45
zWYesP+vVWZGS0GZ2WRRKDlyMWAdECgZN+5nR8CPCOcd3DwKon02nVIeuMzdnIAE
UFjaqgJOZDTfMwPZ4wZKfD06E61cCAwEAAaNQME4wHQYDVR0OBBYEFFNZv1qqK0r
PVIDh2JvAnfKyA2bLMB8GA1UdIwQYMBaAFFNZv1qqK0rPVIDh2JvAnfKyA2bLMAw
GA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQEFBQADggEBAFo7B1UEKpuXHuuCdp5toLq
3Mp96ql+075qSqG9HWNLNYLbn6rsR3SA1OANh6gC7PS9pvfdFalvwNXefP7QLg0a
y+6hA2hkjYgft4xwaiTLfuWyc+l5eYVVhx3ouoejZUK+GsPnNpZtuqioW8BLgUIi
lVbgKgXYBnyhMVTkhFDpelnRH5JsglpgcDoy4nUfDlUvATTN69xE4Fo0sRZIwLgC
lxcKWyvW03nd8VTMwi6Sf+sJsNVRC+V5nS/VZ1tYZLoI8g5VDKTswIclQdVaoRKC
fg7xXaic/v/nBIKnHsFxlk/2x1adROAhcpKUulQ2odM+7tiikNoQI3+x3lcf/Rd8
=
-----END CERTIFICATE-----`
};

const HTTPSPort = 8443;
const HTTPPort = 8080;
const Domain = 'localhost';

console.log('Zaganjam SSL Demo strežnik...');

// Poskusi ustvariti HTTPS strežnik
let httpsServer;
try {
    httpsServer = https.createServer(options, (req, res) => {
        handleRequest(req, res);
    });
    console.log('✅ HTTPS strežnik uspešno ustvarjen');
} catch (error) {
    console.log('❌ Napaka pri ustvarjanju HTTPS strežnika:', error.message);
    console.log('Uporabljam samo HTTP strežnik...');
}

// HTTP strežnik
const httpServer = http.createServer((req, res) => {
    if (httpsServer) {
        // Preusmeritev na HTTPS
        const httpsUrl = `https://${req.headers.host.replace(':' + HTTPPort, ':' + HTTPSPort)}${req.url}`;
        res.writeHead(301, { 'Location': httpsUrl });
        res.end('Preusmerjam na HTTPS...');
    } else {
        // Direktno serviranje preko HTTP
        handleRequest(req, res);
    }
});

function handleRequest(req, res) {
    // API endpoints
    if (req.url === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            ssl: httpsServer ? true : false,
            server: 'OMNI-BRAIN Demo',
            port: httpsServer ? HTTPSPort : HTTPPort,
            protocol: httpsServer ? 'HTTPS' : 'HTTP'
        }));
        return;
    }
    
    if (req.url === '/api/ssl-info') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ssl_enabled: httpsServer ? true : false,
            certificate_type: httpsServer ? 'self-signed' : 'none',
            domain: Domain,
            https_port: HTTPSPort,
            http_port: HTTPPort,
            note: httpsServer ? 'Demo certifikat - za produkcijo uporabite pravi SSL certifikat' : 'SSL ni na voljo'
        }));
        return;
    }
    
    // Glavna stran
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OMNI-BRAIN SSL Demo</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
            .warning { color: #ffc107; font-size: 24px; margin-bottom: 20px; }
            .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .alert { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107; }
            .endpoint { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 3px; }
            .endpoint a { color: #007bff; text-decoration: none; }
            .endpoint a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>${httpsServer ? '🔒' : '🔓'} OMNI-BRAIN SSL Demo</h1>
            ${httpsServer ? 
                '<div class="success">✅ HTTPS povezava deluje!</div>' : 
                '<div class="warning">⚠️ HTTPS ni na voljo - uporabljam HTTP</div>'
            }
            
            <div class="info">
                <h3>Informacije o povezavi:</h3>
                <ul>
                    <li><strong>Protokol:</strong> ${httpsServer ? 'HTTPS' : 'HTTP'}</li>
                    <li><strong>Port:</strong> ${httpsServer ? HTTPSPort : HTTPPort}</li>
                    <li><strong>Domena:</strong> ${Domain}</li>
                    <li><strong>Čas:</strong> ${new Date().toLocaleString('sl-SI')}</li>
                </ul>
            </div>
            
            ${httpsServer ? 
                `<div class="alert">
                    <h3>⚠️ Opozorilo:</h3>
                    <p>To je demo strežnik z self-signed certifikatom. Za produkcijo uporabite pravi SSL certifikat od zaupanja vredne avtoritete (npr. Let's Encrypt).</p>
                </div>` :
                `<div class="alert">
                    <h3>ℹ️ Informacija:</h3>
                    <p>SSL certifikat ni na voljo. To je demo HTTP strežnik. Za produkcijo nastavite pravi SSL certifikat.</p>
                </div>`
            }
            
            <h3>Testni API endpoints:</h3>
            <div class="endpoint">
                <a href="/api/status">/api/status</a> - Status strežnika
            </div>
            <div class="endpoint">
                <a href="/api/ssl-info">/api/ssl-info</a> - SSL informacije
            </div>
            
            <h3>Testiranje SSL:</h3>
            <p>Za testiranje SSL konfiguracije uporabite:</p>
            <code>.\ssl-quick-test-clean.ps1 -Domain "${Domain}:${httpsServer ? HTTPSPort : HTTPPort}"</code>
        </div>
    </body>
    </html>
    `);
}

// Zagon strežnikov
if (httpsServer) {
    httpsServer.listen(HTTPSPort, () => {
        console.log(`🔒 HTTPS strežnik teče na https://${Domain}:${HTTPSPort}`);
    });
}

httpServer.listen(HTTPPort, () => {
    console.log(`${httpsServer ? '🔄' : '🌐'} HTTP strežnik teče na http://${Domain}:${HTTPPort}${httpsServer ? ' (preusmeritev na HTTPS)' : ''}`);
});

console.log('SSL Demo strežnik je pripravljen!');
console.log('Dostopne povezave:');
if (httpsServer) {
    console.log(`  HTTPS: https://${Domain}:${HTTPSPort}`);
}
console.log(`  HTTP:  http://${Domain}:${HTTPPort}${httpsServer ? ' (preusmeritev)' : ''}`);
console.log('Pritisnite Ctrl+C za ustavitev');

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nUstavljam SSL demo strežnik...');
    if (httpsServer) httpsServer.close();
    httpServer.close();
    process.exit(0);
});