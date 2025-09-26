const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Demo SSL certifikat (za produkcijo uporabi pravi certifikat)
const options = {
    key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wQNneCjGQJw2TgHdU69SGye2OLUuIWqwGf4GeNiYSRYablS3k2Cu2lmd85wdXnUj
opXPz6edHd5+UyNda2CEMqDExnwcaIODXyydImAk5EGycpAjlXiMkVhOFQAnQzs2
8kAzjYeHdIlXuFn5Oc18/ONazdRBx6796jMUkFX2B/S2piitBl8SA8WzVbOKRfI+
rJYC4Y5FhVvut8eq8E5bTyaQRqGELa17CyuM0gYmVQeOc1mHrD/r1VmRktBmdlkU
Sg5cjFgHRAoGTfuZ0fAjwjnHdw8CqJ9Np1SHrjM3ZyABFBY2qoCTmQ03zMD2eMGS
nw9OhOtXAgMBAAECggEBAKTmjaS6tkK8BlPXClTQ2vpz/N6uxDeS35mXpqasqskV
laAidgg/sWqpjXDbXr93otIMLlWsM+X0CqMDgSXKejLS2jx4GDjI1ZplJkO4Y/vT
M5FBhgxdX8VfPqJOgGGHiHFOtBEmd/nWNCfBuQWxdl8OJ+p8+pvESyh6JiIJc2SV
HQq4+B2rlsJVfavFPFh6DzoQQGusiYi9TlO1OLsNHahiwQlWH6dDrYNjSS5qABRK
ADElfKIDMh/8Ffgw8qSBxVBz4X8/LsWqDENyRXpCw5q4CyL8UXHL/+r8hBXGEBQd
wAdHFiDrPdE3usM3+9LubMgAHkAgBLuVVgsCgYEA4hhxeAW5vfwKfxRC4xp26x1Q
8oHce2Rq+KWoqK0hqY5bZxs3ItMuVMokul+sjsxYk3v3dw1zJFdn5sMdnaTbvuKp
jRSyeJfQx27FwBGKaKpTWBtSNxxmCW2VSzhfXAY+rU9NOoFE0UxDMHSxhOzGiK1p
Z9LjvQHdgrh+WJ30vEsCgYEA1GR1bbqI9Jn2Ue5CediZcfhEAh+pCC9Y6pSQpx8+
Ag40k6fjZuQruCqLrNwSRfCHwDbAQlSLI2hCOj1F29BE6+75VQz69LdOO6jIXVwg
QzI9vwEMpckuFe6N8EA6venSxjlc3AqXw+9OhMEouoBiGNx2aTrQRf6CJ2dNikVz
xeECgYEAjvx9yHkqiIMjAL53ZKKiTWxGURCeQVHdJ4txVrxie7PNSFrF5CjyMuGK
Qx/GGradKtSH+3xBgOdmxUfiFOoNLl6J3/f7GjxmP40StalEaRRAjfaO2FYdqGTU
E+YZ7EEAls2k91Ua7rNqkU6jQrlpOtSy+HBhJp6OAM1R0EfOiMsCgYEAx4+OuOQm
+A5f3fGSY9+d4VgaEqk7nNS2FdQQd+zBpUYa0ccaLxhLuuZm5WZDDvhBoNhMlKPr
PQIDAQAB
-----END PRIVATE KEY-----`,
    cert: `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiIMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTIwOTEyMjE1MjAyWhcNMTUwOTEyMjE1MjAyWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAuVSU1LfVLPHCgcEDZ3goxkCcNk4B3VOvUhsntji1LiFqsBn+BnjYmEkW
Gm5Ut5NgrtpZnfOcHV51I6KVz8+nnR3eflMjXWtghDKgxMZ8HGiDg18snSJgJORB
snKQI5V4jJFYThUAJ0M7NvJAM42Hh3SJV7hZ+TnNfPzjWs3UQceu/eozFJBV9gf0
tqYorQZfEgPFs1WzikXyPqyWAuGORYVb7rfHqvBOW08mkEahhC2tewsrjNIGJlUH
jnNZh6w/69VZkZLQZnZZFEoOXIxYB0QKBk37mdHwI8I5x3cPAqifTadUh64zN2cg
ARQWNqqAk5kNN8zA9njBkp8PToTrVwIDAQABo1AwTjAdBgNVHQ4EFgQUU3m/Wqor
Ss9UgOHYm8Cd8rIDZsswHwYDVR0jBBgwFoAUU3m/WqorSs9UgOHYm8Cd8rIDZssw
DAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQUFAAOCAQEAWjsHVQQqm5ce64J2nm2g
urcyn3qqX7TvmpKob0dY0s1gtufquxHdIDU4A2HqALs9L2m990VqW/A1d58/tAuD
RrL7qEDaGSNiB+3jHBqJMt+5bJz6Xl5hVWHHei6h6NlQr4aw+c2lm26qKhbwEuBQ
iKVVuAqBdgGfKExVOSEUOl6WdEfkmyCWmBwOjLidR8OVS8BNM3r3ETgWjSxFkjAu
AKXFwpbK9bTed3xVMzCLpJ/6wmw1VEL5XmdL9VnW1hkugjyDlUMpOzAhyVB1VqhE
oJ+DvFdqJz+/+cEgqcewXGWT/bHVp1E4CFykpS6VDah0z7u2KKQ2hAjf7HeVx/9F
3w==
-----END CERTIFICATE-----`
};

const HTTPSPort = 8443;
const HTTPPort = 8080;
const Domain = 'localhost';

// HTTPS strežnik
const httpsServer = https.createServer(options, (req, res) => {
    // API endpoints
    if (req.url === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            ssl: true,
            server: 'OMNI-BRAIN Demo'
        }));
        return;
    }
    
    if (req.url === '/api/ssl-info') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ssl_enabled: true,
            certificate_type: 'self-signed',
            domain: Domain,
            port: HTTPSPort,
            note: 'Demo certifikat - za produkcijo uporabite pravi SSL certifikat'
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
            .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107; }
            .endpoint { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 3px; }
            .endpoint a { color: #007bff; text-decoration: none; }
            .endpoint a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔒 OMNI-BRAIN SSL Demo</h1>
            <div class="success">✅ HTTPS povezava deluje!</div>
            
            <div class="info">
                <h3>Informacije o povezavi:</h3>
                <ul>
                    <li><strong>Protokol:</strong> HTTPS</li>
                    <li><strong>Port:</strong> ${HTTPSPort}</li>
                    <li><strong>Domena:</strong> ${Domain}</li>
                    <li><strong>Čas:</strong> ${new Date().toLocaleString('sl-SI')}</li>
                </ul>
            </div>
            
            <div class="warning">
                <h3>⚠️ Opozorilo:</h3>
                <p>To je demo strežnik z self-signed certifikatom. Za produkcijo uporabite pravi SSL certifikat od zaupanja vredne avtoritete (npr. Let's Encrypt).</p>
            </div>
            
            <h3>Testni API endpoints:</h3>
            <div class="endpoint">
                <a href="/api/status">/api/status</a> - Status strežnika
            </div>
            <div class="endpoint">
                <a href="/api/ssl-info">/api/ssl-info</a> - SSL informacije
            </div>
            
            <h3>Testiranje SSL:</h3>
            <p>Za testiranje SSL konfiguracije uporabite:</p>
            <code>.\ssl-quick-test-clean.ps1 -Domain "localhost:${HTTPSPort}"</code>
        </div>
    </body>
    </html>
    `);
});

// HTTP strežnik (preusmeritev na HTTPS)
const httpServer = http.createServer((req, res) => {
    const httpsUrl = `https://${req.headers.host.replace(':' + HTTPPort, ':' + HTTPSPort)}${req.url}`;
    res.writeHead(301, { 'Location': httpsUrl });
    res.end();
});

// Zagon strežnikov
httpsServer.listen(HTTPSPort, () => {
    console.log(`🔒 HTTPS strežnik teče na https://${Domain}:${HTTPSPort}`);
});

httpServer.listen(HTTPPort, () => {
    console.log(`🔄 HTTP strežnik teče na http://${Domain}:${HTTPPort} (preusmeritev na HTTPS)`);
});

console.log('SSL Demo strežnik je pripravljen!');
console.log('Dostopne povezave:');
console.log(`  HTTPS: https://${Domain}:${HTTPSPort}`);
console.log(`  HTTP:  http://${Domain}:${HTTPPort} (preusmeritev)`);
console.log('Pritisnite Ctrl+C za ustavitev');

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nUstavljam SSL demo strežnik...');
    httpsServer.close();
    httpServer.close();
    process.exit(0);
});