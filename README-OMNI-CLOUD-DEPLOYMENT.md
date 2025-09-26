# 🌐 OMNI CLOUD DEPLOYMENT GUIDE
## Celovita dokumentacija za oblačno namestitev Omni-Brain platforme

---

## 📋 Kazalo vsebine

1. [Pregled sistema](#pregled-sistema)
2. [Sistemske zahteve](#sistemske-zahteve)
3. [Hitri začetek](#hitri-začetek)
4. [Podrobna namestitev](#podrobna-namestitev)
5. [SSL konfiguracija](#ssl-konfiguracija)
6. [Backup in monitoring](#backup-in-monitoring)
7. [Vzdrževanje](#vzdrževanje)
8. [Odpravljanje težav](#odpravljanje-težav)
9. [API dokumentacija](#api-dokumentacija)
10. [Varnost](#varnost)

---

## 🎯 Pregled sistema

Omni Cloud Deployment je celovita rešitev za avtomatsko namestitev Omni-Brain platforme v oblačno okolje z naslednjimi funkcionalnostmi:

### ✨ Ključne funkcionalnosti
- **🚀 Avtomatska namestitev** na AWS, GCP, Azure, DigitalOcean
- **🔐 SSL certifikati** z Let's Encrypt in avtomatskim obnavljanjem
- **📊 Monitoring in alerting** v realnem času
- **💾 Avtomatski backup** z retencijo in kompresijo
- **🔧 Nginx optimizacija** z varnostnimi headerji
- **🛡️ Varnostne nastavitve** (UFW, Fail2ban, SSH)
- **📈 Performance monitoring** (CPU, RAM, disk, omrežje)
- **🌐 Multi-domain podpora** z SSL wildcard certifikati

### 🏗️ Arhitektura sistema
```
┌─────────────────────────────────────────────────────────────┐
│                    OMNI CLOUD PLATFORM                     │
├─────────────────────────────────────────────────────────────┤
│  🌐 Nginx Reverse Proxy + SSL Termination                  │
│  ├── Rate Limiting & Security Headers                      │
│  ├── Gzip Compression & Caching                           │
│  └── WebSocket & Socket.IO Support                        │
├─────────────────────────────────────────────────────────────┤
│  🧠 Omni-Brain Application                                  │
│  ├── Node.js Backend (Express/Fastify)                    │
│  ├── Python AI Services                                   │
│  ├── SQLite Database                                      │
│  └── Static File Serving                                  │
├─────────────────────────────────────────────────────────────┤
│  🔐 SSL & Security Layer                                   │
│  ├── Let's Encrypt Certificates                           │
│  ├── Auto-renewal (Certbot)                              │
│  ├── HSTS & Security Headers                             │
│  └── OCSP Stapling                                       │
├─────────────────────────────────────────────────────────────┤
│  📊 Monitoring & Backup                                    │
│  ├── System Metrics (CPU, RAM, Disk)                     │
│  ├── Application Health Checks                           │
│  ├── Automated Backups                                   │
│  ├── Email/Slack Alerts                                  │
│  └── Performance Analytics                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Sistemske zahteve

### 🖥️ Minimalne zahteve
- **OS**: Ubuntu 22.04 LTS ali novejši
- **CPU**: 2 vCPU
- **RAM**: 4 GB
- **Disk**: 20 GB SSD
- **Omrežje**: Javni IP naslov
- **Domene**: Registrirana domena z DNS dostopom

### 🚀 Priporočene zahteve
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 4 vCPU
- **RAM**: 8 GB
- **Disk**: 50 GB SSD
- **Omrežje**: Javni IP + CDN
- **Domene**: Wildcard SSL podpora

### 🌐 Podprti oblačni ponudniki
- **AWS EC2** (t3.medium ali večji)
- **Google Cloud VM** (e2-medium ali večji)
- **Azure VM** (Standard_B2s ali večji)
- **DigitalOcean Droplet** (2GB/2CPU ali večji)
- **Linode** (Nanode 4GB ali večji)
- **Vultr** (Regular Performance 4GB ali večji)

---

## ⚡ Hitri začetek

### 1️⃣ Priprava strežnika
```bash
# Posodobi sistem
sudo apt update && sudo apt upgrade -y

# Namesti osnovne pakete
sudo apt install -y curl wget git unzip python3 python3-pip

# Konfiguriraj vatrozid
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

### 2️⃣ Prenos Omni Cloud Deployment
```bash
# Kloniraj repozitorij
git clone https://github.com/your-repo/omni-cloud-deployment.git
cd omni-cloud-deployment

# Nastavi pravice
chmod +x *.sh
chmod +x *.py
```

### 3️⃣ Konfiguracija
```bash
# Kopiraj in uredi konfiguracijo
cp omni-cloud-config.json.example omni-cloud-config.json
nano omni-cloud-config.json
```

**Minimalna konfiguracija:**
```json
{
  "general": {
    "domain": "your-domain.com",
    "email": "admin@your-domain.com"
  },
  "ssl": {
    "cert_email": "admin@your-domain.com",
    "auto_renew": true
  }
}
```

### 4️⃣ Avtomatska namestitev
```bash
# Zaženi glavno skripto za namestitev
sudo ./omni-cloud-deploy.sh

# Ali uporabi Python multi-cloud skripto
sudo python3 omni-cloud-multi-deploy.py
```

### 5️⃣ Preverjanje
```bash
# Preveri status
sudo systemctl status omni-brain
sudo systemctl status nginx

# Testiraj SSL
curl -I https://your-domain.com

# Odpri monitoring dashboard
https://your-domain.com/monitoring-dashboard.html
```

---

## 🔧 Podrobna namestitev

### 📁 Struktura datotek
```
omni-cloud-deployment/
├── 📄 omni-cloud-deploy.sh              # Glavna namestitev skripta
├── 🐍 omni-cloud-multi-deploy.py        # Multi-cloud deployment
├── ⚙️ omni-cloud-config.json            # Glavna konfiguracija
├── 🌐 omni-nginx-config.conf            # Nginx template
├── 🐍 omni-nginx-auto-config.py         # Nginx konfigurator
├── 🔐 omni-threo-ssl-integration.py     # SSL integracija
├── 📊 omni-backup-monitoring.py         # Backup & monitoring
├── 📚 README-OMNI-CLOUD-DEPLOYMENT.md   # Ta dokumentacija
├── 🔧 scripts/
│   ├── health-check.sh                  # Health check skripta
│   ├── backup-restore.sh                # Backup/restore orodja
│   └── update-omni.sh                   # Update skripta
└── 📋 templates/
    ├── systemd-service.template         # Systemd storitev
    ├── nginx-site.template              # Nginx site template
    └── ssl-renewal.template             # SSL renewal template
```

### 🔧 Korak-za-korakom namestitev

#### 1. Priprava sistema
```bash
#!/bin/bash
# Sistemska priprava

# Preveri root pravice
if [[ $EUID -ne 0 ]]; then
   echo "Ta skripta mora biti zagnana kot root (sudo)" 
   exit 1
fi

# Posodobi sistem
apt update && apt upgrade -y

# Namesti osnovne pakete
apt install -y \
    curl wget git unzip \
    python3 python3-pip python3-venv \
    nodejs npm \
    nginx \
    ufw fail2ban \
    htop nano vim \
    sqlite3 \
    openssl \
    certbot python3-certbot-nginx

# Konfiguriraj vatrozid
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Konfiguriraj fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

#### 2. Namestitev Node.js in Python odvisnosti
```bash
# Namesti najnovejši Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
apt-get install -y nodejs

# Preveri verzije
node --version
npm --version
python3 --version

# Namesti Python pakete
pip3 install requests psutil cryptography
```

#### 3. Ustvarjanje uporabnika za Omni
```bash
# Ustvari omni uporabnika
useradd -m -s /bin/bash omni
usermod -aG sudo omni

# Nastavi SSH ključe (opcijsko)
mkdir -p /home/omni/.ssh
chown omni:omni /home/omni/.ssh
chmod 700 /home/omni/.ssh
```

#### 4. Prenos in namestitev Omni
```bash
# Prenos Omni kode
cd /opt
git clone https://github.com/your-repo/omni-brain.git
chown -R omni:omni omni-brain

# Namesti odvisnosti
cd omni-brain
sudo -u omni npm install
sudo -u omni pip3 install -r requirements.txt

# Ustvari konfiguracijske datoteke
sudo -u omni cp config.example.json config.json
```

#### 5. Konfiguracija Nginx
```bash
# Ustvari Nginx konfiguracijsko datoteko
python3 omni-nginx-auto-config.py

# Testiraj konfiguracijsko datoteko
nginx -t

# Omogoči site
ln -sf /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
systemctl reload nginx
```

#### 6. SSL namestitev
```bash
# Zaženi SSL integracijo
python3 omni-threo-ssl-integration.py

# Preveri SSL certifikat
openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout
```

#### 7. Systemd storitev
```bash
# Ustvari systemd storitev
cat > /etc/systemd/system/omni-brain.service << EOF
[Unit]
Description=Omni Brain AI Platform
After=network.target

[Service]
Type=simple
User=omni
WorkingDirectory=/opt/omni-brain
ExecStart=/usr/bin/node omni-ultra-main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Omogoči in zaženi storitev
systemctl daemon-reload
systemctl enable omni-brain
systemctl start omni-brain
```

#### 8. Backup in monitoring
```bash
# Nastavi backup in monitoring
python3 omni-backup-monitoring.py

# Preveri cron job
crontab -l
```

---

## 🔐 SSL konfiguracija

### 🎯 Avtomatska SSL namestitev
SSL certifikati se avtomatsko namestijo z Let's Encrypt preko Certbot:

```bash
# Ročna SSL namestitev
sudo python3 omni-threo-ssl-integration.py

# Preveri SSL status
sudo python3 omni-threo-ssl-integration.py --status-only
```

### 🔄 Avtomatsko obnavljanje
SSL certifikati se avtomatsko obnavljajo z cron job:

```bash
# Preveri cron job za obnavljanje
sudo crontab -l | grep certbot

# Ročno testiraj obnavljanje
sudo certbot renew --dry-run
```

### 🛡️ SSL varnostne nastavitve
Nginx je konfiguriran z naprednimi SSL varnostnimi nastavitvami:

- **TLS 1.2/1.3** samo
- **HSTS** (HTTP Strict Transport Security)
- **OCSP Stapling**
- **Perfect Forward Secrecy**
- **Močne cipher suites**

### 📊 SSL monitoring
SSL certifikati se spremljajo preko monitoring sistema:

```bash
# Preveri SSL status
curl -I https://your-domain.com

# SSL dashboard
https://your-domain.com/ssl-dashboard.html
```

---

## 📊 Backup in monitoring

### 💾 Avtomatski backup sistem

#### Tipi backupov
- **Full backup**: Celotna aplikacija, konfiguracije, SSL certifikati
- **Config backup**: Samo konfiguracije in SSL certifikati  
- **Data backup**: Samo podatki in baza podatkov

#### Backup urnik
```bash
# Dnevni full backup ob 2:00
0 2 * * * /opt/omni-monitoring/ssl-auto-renewal.sh

# Tedenski config backup ob nedeljah
0 3 * * 0 python3 /opt/omni-backup-monitoring.py --backup config

# Mesečni arhivski backup
0 4 1 * * python3 /opt/omni-backup-monitoring.py --backup full
```

#### Ročni backup
```bash
# Full backup
sudo python3 omni-backup-monitoring.py --backup full

# Config backup
sudo python3 omni-backup-monitoring.py --backup config

# Data backup
sudo python3 omni-backup-monitoring.py --backup data
```

### 📈 Monitoring sistem

#### Sistemske metrike
- **CPU uporaba** (opozorilo pri >80%, kritično pri >95%)
- **RAM uporaba** (opozorilo pri >80%, kritično pri >95%)
- **Disk prostor** (opozorilo pri >80%, kritično pri >95%)
- **Omrežni promet** (bytes sent/received)
- **Load average** (1min, 5min, 15min)
- **Uptime** (čas delovanja)

#### Aplikacijske metrike
- **Nginx status** (active/inactive)
- **Omni-Brain status** (running/stopped)
- **SSL certifikat** (veljavnost, datum poteka)
- **Odzivni čas** (HTTP response time)
- **Error rate** (4xx/5xx errors)

#### Monitoring dashboard
```bash
# Odpri monitoring dashboard
https://your-domain.com/monitoring-dashboard.html

# API endpoint za metrike
https://your-domain.com/api/monitoring-status
```

### 🚨 Alerting sistem

#### E-mail obvestila
Konfiguriraj e-mail obvestila v `omni-cloud-config.json`:

```json
{
  "monitoring": {
    "notifications": {
      "email": {
        "enabled": true,
        "smtp_server": "smtp.gmail.com",
        "smtp_port": 587,
        "username": "your-email@gmail.com",
        "password": "your-app-password",
        "to_email": "admin@your-domain.com"
      }
    }
  }
}
```

#### Slack obvestila
```json
{
  "monitoring": {
    "notifications": {
      "slack": {
        "enabled": true,
        "webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
      }
    }
  }
}
```

#### Discord obvestila
```json
{
  "monitoring": {
    "notifications": {
      "discord": {
        "enabled": true,
        "webhook_url": "https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK"
      }
    }
  }
}
```

---

## 🔧 Vzdrževanje

### 🔄 Posodabljanje sistema
```bash
# Posodobi sistem pakete
sudo apt update && sudo apt upgrade -y

# Posodobi Node.js pakete
cd /opt/omni-brain
sudo -u omni npm update

# Posodobi Python pakete
sudo -u omni pip3 install --upgrade -r requirements.txt

# Ponovno zaženi storitve
sudo systemctl restart omni-brain
sudo systemctl reload nginx
```

### 📊 Preverjanje zdravja
```bash
# Sistemsko zdravje
sudo python3 omni-backup-monitoring.py --health-check

# Preveri storitve
sudo systemctl status omni-brain
sudo systemctl status nginx
sudo systemctl status certbot.timer

# Preveri logove
sudo journalctl -u omni-brain -f
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/omni/backup-monitoring-*.log
```

### 🗄️ Baza podatkov vzdrževanje
```bash
# SQLite optimizacija
sqlite3 /opt/omni-brain/data/omni.db "VACUUM;"
sqlite3 /opt/omni-monitoring/omni-monitoring.db "VACUUM;"

# Backup baze podatkov
cp /opt/omni-brain/data/omni.db /opt/omni-backups/omni-db-$(date +%Y%m%d).db
```

### 🧹 Čiščenje logov
```bash
# Nastavi log rotation
sudo nano /etc/logrotate.d/omni

# Vsebina datoteke:
/var/log/omni/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 omni omni
    postrotate
        systemctl reload omni-brain
    endscript
}
```

---

## 🔍 Odpravljanje težav

### 🚨 Pogoste težave

#### 1. Omni-Brain se ne zažene
```bash
# Preveri status
sudo systemctl status omni-brain

# Preveri logove
sudo journalctl -u omni-brain -n 50

# Preveri konfiguracijo
cd /opt/omni-brain
sudo -u omni node --check omni-ultra-main.js

# Ponovno zaženi
sudo systemctl restart omni-brain
```

#### 2. SSL certifikat ne deluje
```bash
# Preveri SSL certifikat
openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout

# Testiraj SSL povezavo
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Obnovi SSL certifikat
sudo certbot renew --force-renewal

# Ponovno naloži Nginx
sudo systemctl reload nginx
```

#### 3. Nginx konfiguracija napaka
```bash
# Testiraj Nginx konfiguracijo
sudo nginx -t

# Preveri sintakso
sudo nginx -T

# Obnovi privzeto konfiguracijo
sudo python3 omni-nginx-auto-config.py

# Ponovno naloži
sudo systemctl reload nginx
```

#### 4. Monitoring ne deluje
```bash
# Preveri monitoring bazo
sqlite3 /opt/omni-monitoring/omni-monitoring.db ".tables"

# Zaženi monitoring ročno
sudo python3 omni-backup-monitoring.py --monitoring-cycle

# Preveri cron job
sudo crontab -l
```

#### 5. Backup neuspešen
```bash
# Preveri backup direktorij
ls -la /opt/omni-backups/

# Ročni backup
sudo python3 omni-backup-monitoring.py --backup full

# Preveri disk prostor
df -h

# Počisti stare backupe
sudo python3 omni-backup-monitoring.py --cleanup-backups
```

### 📋 Diagnostični ukazi
```bash
# Sistemske informacije
uname -a
lsb_release -a
free -h
df -h
ps aux | grep -E "(node|nginx|python)"

# Omrežje
netstat -tlnp | grep -E "(80|443|3000)"
ss -tlnp | grep -E "(80|443|3000)"

# Firewall
sudo ufw status verbose
sudo iptables -L

# SSL
sudo certbot certificates
sudo openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -noout -dates
```

### 🔧 Obnovitev sistema
```bash
# Obnovi iz backupa
cd /opt/omni-backups
tar -xzf omni-full-backup-YYYYMMDD_HHMMSS.tar.gz

# Obnovi konfiguracijo
sudo cp -r nginx/sites-available/* /etc/nginx/sites-available/
sudo cp -r letsencrypt/* /etc/letsencrypt/

# Obnovi aplikacijo
sudo cp -r omni-brain/* /opt/omni-brain/
sudo chown -R omni:omni /opt/omni-brain

# Ponovno zaženi storitve
sudo systemctl restart omni-brain
sudo systemctl reload nginx
```

---

## 🌐 API dokumentacija

### 📊 Monitoring API

#### GET /api/monitoring-status
Vrne trenutno stanje sistema in aplikacije.

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "system": {
    "cpu_percent": 25.5,
    "memory_percent": 45.2,
    "disk_percent": 60.1,
    "uptime": 86400,
    "load_average": "0.5,0.3,0.2"
  },
  "services": [
    {
      "name": "nginx",
      "status": "active",
      "response_time": 15.2
    },
    {
      "name": "omni-brain",
      "status": "active",
      "memory_usage": 512000000,
      "cpu_usage": 12.5
    }
  ],
  "backup": {
    "last_backup": "2024-01-15T02:00:00Z",
    "status": "success",
    "size": "150MB"
  },
  "alerts": []
}
```

#### GET /api/ssl-status
Vrne SSL certifikat informacije.

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "domain": "your-domain.com",
  "ssl_enabled": true,
  "certificate_info": {
    "issuer": "Let's Encrypt",
    "not_before": "2024-01-01T00:00:00Z",
    "not_after": "2024-04-01T00:00:00Z",
    "days_until_expiry": 75
  },
  "nginx_status": "active"
}
```

#### POST /api/backup
Sproži ročni backup.

**Request:**
```json
{
  "type": "full|config|data"
}
```

**Response:**
```json
{
  "success": true,
  "backup_id": "backup-20240115-103000",
  "file_path": "/opt/omni-backups/omni-full-backup-20240115_103000.tar.gz",
  "size": 157286400,
  "duration": 45
}
```

### 🔧 Management API

#### POST /api/restart-service
Ponovno zaženi storitev.

**Request:**
```json
{
  "service": "omni-brain|nginx"
}
```

#### GET /api/logs
Pridobi logove.

**Query parameters:**
- `service`: omni-brain|nginx|system
- `lines`: število vrstic (default: 100)
- `level`: info|warning|error

---

## 🛡️ Varnost

### 🔐 SSL/TLS konfiguracija
- **TLS 1.2/1.3** protokoli
- **HSTS** (HTTP Strict Transport Security)
- **OCSP Stapling** za hitrejšo SSL validacijo
- **Perfect Forward Secrecy**
- **Močne cipher suites** (ECDHE, AES-GCM)

### 🔥 Firewall (UFW)
```bash
# Privzete nastavitve
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Dovoljeni porti
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS

# Preveri status
sudo ufw status verbose
```

### 🚫 Fail2ban
Avtomatska zaščita pred brute-force napadi:

```bash
# Preveri status
sudo fail2ban-client status

# Preveri SSH jail
sudo fail2ban-client status sshd

# Odblokiraj IP
sudo fail2ban-client set sshd unbanip IP_ADDRESS
```

### 🔑 SSH varnost
```bash
# Uredi SSH konfiguracijo
sudo nano /etc/ssh/sshd_config

# Priporočene nastavitve:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 22
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# Ponovno zaženi SSH
sudo systemctl restart ssh
```

### 🛡️ Nginx varnostni headerji
```nginx
# Varnostni headerji (že vključeni v konfiguracijo)
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 🔍 Varnostno preverjanje
```bash
# SSL test
curl -I https://your-domain.com

# Varnostni headerji test
curl -I https://your-domain.com | grep -E "(X-Frame|X-Content|X-XSS|Strict-Transport)"

# Port scan
nmap -sS -O your-domain.com

# SSL Labs test
# https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

---

## 📞 Podpora in pomoč

### 🆘 Kontakt
- **E-mail**: support@omni-brain.com
- **GitHub Issues**: https://github.com/your-repo/omni-cloud-deployment/issues
- **Dokumentacija**: https://docs.omni-brain.com

### 📚 Dodatni viri
- [Nginx dokumentacija](https://nginx.org/en/docs/)
- [Let's Encrypt dokumentacija](https://letsencrypt.org/docs/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)
- [Node.js dokumentacija](https://nodejs.org/en/docs/)

### 🐛 Poročanje napak
Pri poročanju napak vključi:
1. **Sistemske informacije** (`uname -a`, `lsb_release -a`)
2. **Logove** (zadnjih 50 vrstic)
3. **Konfiguracijo** (brez občutljivih podatkov)
4. **Korake za reprodukcijo**

### 🔄 Posodobitve
Sistem se avtomatsko posodablja. Za ročne posodobitve:

```bash
# Posodobi deployment skripte
git pull origin main

# Zaženi posodobitev
sudo ./update-omni.sh
```

---

## 📄 Licenca

MIT License - glej [LICENSE](LICENSE) datoteko za podrobnosti.

---

## 🎉 Zaključek

Omni Cloud Deployment omogoča hitro in zanesljivo namestitev Omni-Brain platforme v oblačno okolje z vsemi potrebnimi varnostnimi in monitoring funkcionalnostmi.

Za dodatno pomoč ali vprašanja se obrnite na našo podporo ali odprite GitHub issue.

**Uspešno namestitev! 🚀**

---

*Dokumentacija zadnjič posodobljena: Januar 2024*
*Verzija: 1.0.0*