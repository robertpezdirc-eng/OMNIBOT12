# 🔐 OMNI-BRAIN SSL Avtomatska Nastavitev

Popolnoma avtomatska nastavitev SSL certifikata za OMNI-BRAIN aplikacijo z Let's Encrypt.

## 🚀 Hitri Zagon

### Osnovna nastavitev
```powershell
.\ssl-master-setup.ps1 -Domain "vasa-domena.com" -Email "admin@vasa-domena.com"
```

### Test način (brez dejanskih sprememb)
```powershell
.\ssl-master-setup.ps1 -Domain "vasa-domena.com" -Email "admin@vasa-domena.com" -TestMode
```

### Preskoči preverjanje domene
```powershell
.\ssl-master-setup.ps1 -Domain "vasa-domena.com" -Email "admin@vasa-domena.com" -SkipDomainCheck
```

## 📋 Predpogoji

### 1. Domensko usmerjanje
- Domena mora biti usmerjena na vaš strežnik
- DNS A zapis mora kazati na IP naslov strežnika
- Vrata 80 (HTTP) in 443 (HTTPS) morajo biti odprta

### 2. Sistemski zahteve
- Windows PowerShell 5.0+
- Node.js 14+
- Administratorske pravice
- Internetna povezava

### 3. Firewall nastavitve
```powershell
# Odpri vrata 80 in 443
New-NetFirewallRule -DisplayName "HTTP-In" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS-In" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

## 🔧 Komponente Sistema

### 1. ssl-master-setup.ps1
Glavni skript za celotno SSL nastavitev:
- Preverjanje domenskega usmerjanja
- Namestitev Certbot
- Generiranje SSL certifikata
- Konfiguracija HTTPS strežnika
- Nastavitev samodejnega obnavljanja
- Zagon SSL nadzora

### 2. ssl-setup.ps1
Preverjanje domenskega usmerjanja:
- DNS resolucija
- Testiranje portov 80/443
- Firewall pravila
- Trenutna SSL konfiguracija

### 3. ssl-certbot-install.ps1
Namestitev Let's Encrypt certifikata:
- Prenos in namestitev Certbot
- Ustvarjanje webroot direktorija
- Generiranje SSL certifikata
- Konfiguracija Node.js HTTPS strežnika

### 4. ssl-auto-renewal.ps1
Samodejno obnavljanje certifikatov:
- Preverjanje stanja certifikatov
- Avtomatsko obnavljanje
- Ponovni zagon strežnika
- Obveščanje o napakah
- Scheduled Task nastavitev

### 5. https-server.js
HTTPS strežnik za OMNI-BRAIN:
- SSL certifikat nalaganje
- Express aplikacija z varnostnimi middleware-i
- HTTP -> HTTPS preusmeritev
- Statične datoteke
- API rute

### 6. ssl-monitoring.js
Nadzor SSL certifikatov:
- Preverjanje veljavnosti certifikatov
- Opozorila pred potekom
- Avtomatska obnova
- Beleženje dogodkov
- Email obvestila

### 7. ssl-quick-test.ps1
Hitro testiranje SSL konfiguracije:
- DNS resolucija
- Testiranje portov
- HTTPS odziv
- Veljavnost certifikata
- HTTP preusmeritev

## 📊 Monitoring in Vzdrževanje

### Preverjanje stanja
```powershell
# Hitri test SSL konfiguracije
.\ssl-quick-test.ps1 -Domain "vasa-domena.com" -Verbose

# Preveri stanje certifikata
node ssl-monitoring.js check

# Ročno obnovi certifikat
.\ssl-auto-renewal.ps1 -ForceRenewal
```

### Log datoteke
- `ssl-setup-results.json` - Rezultati nastavitve
- `ssl-test-results.json` - Rezultati testiranja
- `ssl-monitoring.log` - SSL nadzor dogodki
- `ssl-renewal.log` - Obnavljanje certifikatov

### Scheduled Tasks
Sistem avtomatsko ustvari naslednje naloge:
- **SSL Certificate Renewal** - Dnevno ob 2:00
- **SSL Monitoring Check** - Vsakih 6 ur

## 🔄 Samodejno Obnavljanje

Certifikati se avtomatsko obnavljajo:
- **Preverjanje**: Vsak dan ob 2:00
- **Obnavljanje**: 30 dni pred potekom
- **Obvestila**: Email ob napakah
- **Backup**: Stari certifikati se shranijo

### Ročno obnavljanje
```powershell
# Preveri potrebo po obnovi
certbot renew --dry-run

# Prisilno obnovi
certbot renew --force-renewal

# Obnovi specifično domeno
certbot renew --cert-name vasa-domena.com
```

## 🚨 Odpravljanje Težav

### Pogosti problemi

#### 1. DNS ne resolva
```powershell
# Preveri DNS
nslookup vasa-domena.com
# Ali
Resolve-DnsName -Name vasa-domena.com
```

#### 2. Vrata so zaprta
```powershell
# Preveri firewall
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*HTTP*"}

# Odpri vrata
New-NetFirewallRule -DisplayName "HTTP-In" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

#### 3. Certbot napake
```powershell
# Preveri Certbot logs
Get-Content "C:\Certbot\log\letsencrypt.log" -Tail 50

# Počisti cache
certbot delete --cert-name vasa-domena.com
```

#### 4. HTTPS strežnik se ne zažene
```powershell
# Preveri Node.js procese
Get-Process -Name "node" | Where-Object {$_.CommandLine -like "*https*"}

# Preveri SSL certifikate
Test-Path "C:\Certbot\live\vasa-domena.com\fullchain.pem"
```

### Debug način
```powershell
# Zaženi z debug informacijami
$env:DEBUG = "ssl:*"
node https-server.js

# Verbose SSL test
.\ssl-quick-test.ps1 -Domain "vasa-domena.com" -Verbose
```

## 📧 Obvestila

### Email konfiguracija
Uredi `.env` datoteko:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@vasa-domena.com
SMTP_PASS=vase-geslo
ALERT_EMAIL=admin@vasa-domena.com
```

### Vrste obvestil
- **Uspešno obnavljanje** - Potrditev obnove
- **Napaka pri obnavljanju** - Takojšnje obvestilo
- **Certifikat poteče** - 7 dni pred potekom
- **SSL monitoring** - Tedenski povzetek

## 🔒 Varnostne Nastavitve

### HTTPS konfiguracija
```javascript
// Varnostni headers
app.use(helmet({
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// SSL/TLS nastavitve
const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
    secureProtocol: 'TLSv1_2_method',
    ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:!RC4:!MD5:!aNULL:!eNULL:!NULL:!DH:!EDH:!EXP:+HIGH:+MEDIUM'
};
```

### Firewall pravila
```powershell
# Dovoli samo HTTPS promet
New-NetFirewallRule -DisplayName "HTTPS-Only" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
New-NetFirewallRule -DisplayName "HTTP-Redirect" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Blokiraj nepooblaščen dostop
New-NetFirewallRule -DisplayName "Block-Unauthorized" -Direction Inbound -RemoteAddress "0.0.0.0-255.255.255.255" -Action Block
```

## 📈 Performanse

### Optimizacije
- **HTTP/2** - Avtomatsko omogočeno
- **Gzip kompresija** - Za statične datoteke
- **SSL session caching** - Hitrejše povezave
- **OCSP stapling** - Hitrejša validacija

### Monitoring metrike
- **SSL handshake čas** - < 100ms
- **Certifikat veljavnost** - > 30 dni
- **HTTPS odzivni čas** - < 200ms
- **Uspešnost obnavljanja** - 100%

## 🆘 Podpora

### Kontakt
- **Email**: admin@omni-brain.com
- **Dokumentacija**: https://docs.omni-brain.com/ssl
- **GitHub Issues**: https://github.com/omni-brain/ssl-setup/issues

### Koristne povezave
- [Let's Encrypt dokumentacija](https://letsencrypt.org/docs/)
- [Certbot navodila](https://certbot.eff.org/)
- [SSL Labs test](https://www.ssllabs.com/ssltest/)
- [Mozilla SSL konfiguracija](https://ssl-config.mozilla.org/)

---

**🔐 OMNI-BRAIN SSL Setup v1.0**  
*Avtomatska, varna, zanesljiva SSL rešitev*