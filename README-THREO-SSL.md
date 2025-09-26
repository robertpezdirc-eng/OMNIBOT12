# 🌐 THREO UNIVERZALNA SSL SKRIPTA

Avtomatska namestitev in obnavljanje SSL certifikatov za OMNI-BRAIN platformo.
Podpira Linux (Certbot) in Windows (win-acme) sisteme.

## 🚀 Hitri začetek

### 1. Prenos in priprava
```bash
# Prenesi skripte
git clone <repository>
cd threo-ssl

# Preveri Python odvisnosti
python threo-ssl-test.py
```

### 2. Osnovna uporaba
```bash
# Zaženi SSL nastavitev
python threo-universal-ssl.py

# Vnesi svojo domeno in email ko te vpraša
# Primer: mydomain.com, admin@mydomain.com
```

### 3. Napredna uporaba
```bash
# Uporabi konfiguracijski file
python threo-universal-ssl.py --config threo-ssl-config.json

# Testni način (ne izvršuje dejanskih sprememb)
python threo-universal-ssl.py --dry-run

# Podrobni izpis
python threo-universal-ssl.py --verbose
```

## 📋 Sistemske zahteve

### Linux sistemi
- Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- Python 3.6+
- Root/sudo dostop
- Odprti porti 80 in 443
- Internetna povezava

### Windows sistemi
- Windows Server 2016+ / Windows 10+
- Python 3.6+
- Administrator pravice
- Odprti porti 80 in 443
- Internetna povezava

## 🔧 Funkcionalnosti

### ✅ Avtomatska namestitev
- **Linux**: Certbot z nginx/apache podporo
- **Windows**: win-acme z IIS integracijo
- Avtomatsko prepoznavanje OS
- Preverjanje portov in odvisnosti

### ✅ SSL certifikati
- Let's Encrypt certifikati (brezplačni)
- Avtomatska validacija domene
- Podpora za več domen
- Wildcard certifikati (DNS validacija)

### ✅ Samodejno obnavljanje
- **Linux**: systemd timer + cron backup
- **Windows**: Windows Task Scheduler
- Preverjanje veljavnosti certifikatov
- Email obvestila o poteku

### ✅ Nadzor in poročanje
- JSON poročila o stanju
- Log datoteke
- SSL validacija
- Varnostni pregledi

## 📁 Struktura datotek

```
threo-ssl/
├── threo-universal-ssl.py      # Glavna skripta
├── threo-ssl-test.py          # Testna skripta
├── threo-ssl-config.json      # Konfiguracija
├── README-THREO-SSL.md        # Ta dokumentacija
├── threo-ssl.log             # Log datoteka
├── threo-ssl-report.json     # Poročilo o stanju
└── threo-ssl-test-results.json # Testni rezultati
```

## 🛠️ Konfiguracija

### threo-ssl-config.json
```json
{
  "domains": [
    {
      "name": "mydomain.com",
      "email": "admin@mydomain.com",
      "webroot": "/var/www/html",
      "enabled": true
    }
  ],
  "settings": {
    "auto_renewal": true,
    "log_level": "INFO",
    "backup_certificates": true
  }
}
```

### Spremenljivke okolja
```bash
# Linux
export THREO_DOMAIN="mydomain.com"
export THREO_EMAIL="admin@mydomain.com"
export THREO_WEBROOT="/var/www/html"

# Windows
set THREO_DOMAIN=mydomain.com
set THREO_EMAIL=admin@mydomain.com
```

## 🔍 Testiranje

### Osnovni test
```bash
python threo-ssl-test.py
```

### Test za specifično domeno
```bash
python threo-ssl-test.py
# Vnesi domeno: mydomain.com
```

### Testni rezultati
- **Python odvisnosti**: Preveri potrebne module
- **Admin pravice**: Preveri root/admin dostop
- **Mrežna povezljivost**: Testira dostop do Let's Encrypt
- **Dostopnost portov**: Preveri porte 80 in 443
- **SSL orodja**: Preveri Certbot/win-acme
- **DNS resolucija**: Testira domensko ime
- **SSL certifikat**: Preveri veljavnost certifikata
- **HTTPS odziv**: Testira HTTPS povezavo

## 🐧 Linux namestitev

### Ubuntu/Debian
```bash
# Posodobi sistem
sudo apt update && sudo apt upgrade -y

# Namesti Python in odvisnosti
sudo apt install -y python3 python3-pip

# Zaženi SSL skripto
sudo python3 threo-universal-ssl.py
```

### CentOS/RHEL
```bash
# Posodobi sistem
sudo yum update -y

# Namesti Python in odvisnosti
sudo yum install -y python3 python3-pip

# Zaženi SSL skripto
sudo python3 threo-universal-ssl.py
```

## 🪟 Windows namestitev

### PowerShell (kot Administrator)
```powershell
# Preveri Python
python --version

# Zaženi SSL skripto
python threo-universal-ssl.py
```

### Ročna namestitev win-acme
```powershell
# Prenesi win-acme
Invoke-WebRequest -Uri "https://github.com/win-acme/win-acme/releases/latest/download/win-acme.v2.1.25.0.x64.trimmed.zip" -OutFile "win-acme.zip"

# Razpakuj
Expand-Archive win-acme.zip -DestinationPath C:\win-acme

# Zaženi
C:\win-acme\wacs.exe
```

## 🔐 Varnostne nastavitve

### SSL/TLS konfiguracija
```json
{
  "security": {
    "min_key_size": 2048,
    "cipher_suites": [
      "ECDHE-RSA-AES256-GCM-SHA384",
      "ECDHE-RSA-AES128-GCM-SHA256"
    ],
    "protocols": ["TLSv1.2", "TLSv1.3"],
    "hsts_enabled": true,
    "ocsp_stapling": true
  }
}
```

### Nginx konfiguracija
```nginx
server {
    listen 443 ssl http2;
    server_name mydomain.com;
    
    ssl_certificate /etc/letsencrypt/live/mydomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mydomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    
    add_header Strict-Transport-Security "max-age=31536000" always;
}
```

## 📊 Nadzor in vzdrževanje

### Preverjanje stanja
```bash
# Preveri certifikat
python threo-ssl-test.py

# Preveri log datoteke
tail -f threo-ssl.log

# Preveri poročilo
cat threo-ssl-report.json
```

### Ročno obnavljanje
```bash
# Linux
sudo certbot renew

# Windows
C:\win-acme\wacs.exe --renew
```

### Backup certifikatov
```bash
# Linux
sudo cp -r /etc/letsencrypt /backup/letsencrypt-$(date +%Y%m%d)

# Windows
xcopy C:\win-acme\certificates C:\backup\certificates-$(Get-Date -Format "yyyyMMdd") /E /I
```

## 🚨 Odpravljanje težav

### Pogosti problemi

#### 1. Port 80/443 zaseden
```bash
# Linux - preveri kaj uporablja port
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Ustavi Apache/Nginx začasno
sudo systemctl stop apache2 nginx

# Windows - preveri port
netstat -ano | findstr :80
netstat -ano | findstr :443
```

#### 2. DNS ne kaže na strežnik
```bash
# Preveri DNS
nslookup mydomain.com
dig mydomain.com

# Počakaj na DNS propagacijo (do 48 ur)
```

#### 3. Firewall blokira porte
```bash
# Linux - odpri porte
sudo ufw allow 80
sudo ufw allow 443

# Windows - odpri porte
netsh advfirewall firewall add rule name="HTTP" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="HTTPS" dir=in action=allow protocol=TCP localport=443
```

#### 4. Certbot napake
```bash
# Preveri Certbot log
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Počisti cache
sudo certbot delete --cert-name mydomain.com
```

#### 5. win-acme napake
```powershell
# Preveri win-acme log
Get-Content C:\win-acme\logs\*.log -Tail 50

# Ponovno zaženi
C:\win-acme\wacs.exe --verbose
```

### Debug način
```bash
# Zaženi z debug informacijami
python threo-universal-ssl.py --debug

# Preveri sistemske log datoteke
# Linux
sudo journalctl -u certbot.timer
sudo tail -f /var/log/syslog

# Windows
Get-EventLog -LogName Application -Source "win-acme"
```

## 📞 Podpora

### Log datoteke
- **threo-ssl.log**: Glavne aktivnosti
- **/var/log/letsencrypt/**: Certbot logi (Linux)
- **C:\win-acme\logs\**: win-acme logi (Windows)

### Poročila
- **threo-ssl-report.json**: Stanje SSL sistema
- **threo-ssl-test-results.json**: Rezultati testiranja

### Kontakt
- GitHub Issues: [repository]/issues
- Email: support@threo.com
- Dokumentacija: https://docs.threo.com/ssl

## 📄 Licenca

MIT License - glej LICENSE datoteko za podrobnosti.

## 🔄 Posodobitve

### v1.0.0 (2024-01-15)
- Prva izdaja
- Podpora za Linux in Windows
- Avtomatsko obnavljanje
- Testni sistem

### v1.1.0 (načrtovano)
- Docker podpora
- Wildcard certifikati
- Multi-domain podpora
- Web dashboard

---

**🎉 Threo SSL - Enostavno, varno, avtomatsko!**