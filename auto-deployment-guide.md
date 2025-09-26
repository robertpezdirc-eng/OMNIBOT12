# 🚀 Omni AI Platform - Popolnoma Avtomatska Migracija v Oblak

Popoln vodič za takojšnjo migracijo Omni AI platforme v oblačno okolje z ničelno ročno intervencijo.

## 📋 Pregled Sistema

### 🎯 Cilj
Popolnoma avtomatska migracija Omni aplikacije iz lokalnega računalnika v produkcijsko oblačno okolje z vsemi Angel sistemi, SSL šifriranjem, backup sistemom in monitoring dashboardom.

### ⚡ Ključne Funkcionalnosti
- ✅ **Zero-touch deployment** - Brez ročne intervencije
- ✅ **Dual source support** - Lokalni HTTP ali GitHub
- ✅ **SSL automation** - Let's Encrypt certifikati
- ✅ **Angel systems** - Vsi Angel moduli aktivni
- ✅ **Backup & monitoring** - Avtomatski backup in spremljanje
- ✅ **Validation system** - Preverjanje uspešnosti migracije
- ✅ **Production ready** - Nginx, Systemd, Firewall

## 🛠️ Sistemske Zahteve

### Oblačni Strežnik
- **OS**: Ubuntu 22.04 LTS (priporočeno)
- **RAM**: Minimum 2GB, priporočeno 4GB+
- **Disk**: Minimum 10GB prostora
- **Omrežje**: Javni IP naslov
- **Domena**: Registrirana domena z DNS A zapisom

### Lokalni Računalnik
- **Python 3.7+** (za lokalni HTTP strežnik)
- **Git** (za GitHub deployment)
- **Omrežje**: Dostop do interneta

## 🚀 Možnosti Deployment-a

### 1️⃣ GitHub Deployment (Priporočeno)

#### Korak 1: Pripravi GitHub Repozitorij
```bash
# Na lokalnem računalniku
python3 github-deploy-setup.py
```

#### Korak 2: Deployment na Oblačni Strežnik
```bash
# SSH na oblačni strežnik
ssh root@[JAVNI_IP_STREŽNIKA]

# Prenesi migracijsko skripto
wget https://raw.githubusercontent.com/[USERNAME]/omniscient-ai-platform/main/omni-cloud-auto-full.sh

# Naredi izvršljivo
chmod +x omni-cloud-auto-full.sh

# Zaženi avtomatsko migracijo
sudo ./omni-cloud-auto-full.sh [DOMENA] [EMAIL] github https://github.com/[USERNAME]/omniscient-ai-platform.git
```

#### Primer:
```bash
sudo ./omni-cloud-auto-full.sh moja-domena.com admin@example.com github https://github.com/johndoe/omniscient-ai-platform.git
```

### 2️⃣ Lokalni HTTP Deployment

#### Korak 1: Zaženi Lokalni Strežnik
```bash
# Na lokalnem računalniku (Windows)
start-local-server.bat

# Na lokalnem računalniku (Linux/macOS)
./start-local-server.sh

# Ali direktno z Python
python3 local-server-setup.py
```

#### Korak 2: Deployment na Oblačni Strežnik
```bash
# SSH na oblačni strežnik
ssh root@[JAVNI_IP_STREŽNIKA]

# Prenesi migracijsko skripto (zamenjaj [LOKALNI_IP])
wget http://[LOKALNI_IP]:3000/omni-cloud-auto-full.sh

# Naredi izvršljivo
chmod +x omni-cloud-auto-full.sh

# Zaženi avtomatsko migracijo
sudo ./omni-cloud-auto-full.sh [DOMENA] [EMAIL] local [LOKALNI_IP]
```

#### Primer:
```bash
sudo ./omni-cloud-auto-full.sh moja-domena.com admin@example.com local 192.168.1.10
```

## 🔧 Avtomatski Proces Migracije

### Faza 1: Sistemska Priprava (2-3 min)
- ✅ Posodobitev Ubuntu sistema
- ✅ Namestitev Python 3, Node.js, Nginx, Certbot
- ✅ Ustvarjanje uporabnika `omni`
- ✅ Kreiranje direktorijske strukture

### Faza 2: Prenos Aplikacije (1-2 min)
- ✅ Prenos iz GitHub repozitorija ali lokalnega HTTP
- ✅ Nastavitev Python virtualnega okolja
- ✅ Namestitev Python dependencies
- ✅ Namestitev Node.js dependencies

### Faza 3: Konfiguracija Storitev (2-3 min)
- ✅ Nginx reverse proxy konfiguracija
- ✅ SSL certifikat z Let's Encrypt
- ✅ Systemd storitve za Omni in Angel sisteme
- ✅ Firewall (UFW) konfiguracija

### Faza 4: Angel Sistemi (1-2 min)
- ✅ Angel Integration Service (port 8081)
- ✅ Angel Monitoring Dashboard (port 8082)
- ✅ Angel Task Distribution (port 8083)
- ✅ Angel Synchronization Service

### Faza 5: Backup & Monitoring (1 min)
- ✅ Dnevni/tedenski/mesečni backup sistem
- ✅ Real-time monitoring dashboard
- ✅ E-poštni alarmi za kritične dogodke
- ✅ SQLite baze za Angel sisteme

### Faza 6: Validacija (30 sek)
- ✅ Preverjanje statusa storitev
- ✅ Testiranje SSL certifikatov
- ✅ Preverjanje omrežne povezljivosti
- ✅ Validacija Angel sistemov

**Skupni čas**: 7-12 minut (odvisno od hitrosti interneta)

## 🌐 Dostopne Storitve Po Migraciji

### Glavne Aplikacije
- **Omni AI Platform**: `https://[DOMENA]`
- **Admin Dashboard**: `https://[DOMENA]/admin`
- **API Endpoints**: `https://[DOMENA]/api`

### Angel Sistemi
- **Integration API**: `https://[DOMENA]/api/angel/integration/`
- **Monitoring Dashboard**: `https://[DOMENA]/monitoring/`
- **Task Management**: `https://[DOMENA]/api/tasks/`
- **Synchronization**: WebSocket na portu 8084

### Sistemske Storitve
- **Nginx Status**: `https://[DOMENA]/nginx_status`
- **Health Check**: `https://[DOMENA]/health`
- **Metrics**: `https://[DOMENA]/metrics`

## 📊 Upravljanje Sistema

### Systemd Upravljanje
```bash
# Preveri status vseh Omni storitev
systemctl status omni-platform.target

# Restart vseh storitev
systemctl restart omni-platform.target

# Ustavi vse storitve
systemctl stop omni-platform.target

# Zaženi vse storitve
systemctl start omni-platform.target

# Preveri posamezne storitve
systemctl status omni
systemctl status angel-integration
systemctl status angel-monitoring
systemctl status angel-tasks
```

### Logovi
```bash
# Omni aplikacija
journalctl -u omni -f

# Angel Integration
journalctl -u angel-integration -f

# Angel Monitoring
journalctl -u angel-monitoring -f

# Angel Tasks
journalctl -u angel-tasks -f

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Backup Upravljanje
```bash
# Preveri backup status
systemctl status omni-backup.timer

# Ročni backup
systemctl start omni-backup.service

# Preveri backup logove
journalctl -u omni-backup -f

# Seznam backup datotek
ls -la /opt/omni/backups/
```

### Monitoring
```bash
# Monitoring dashboard
curl https://[DOMENA]/monitoring/api/status

# Sistemske metrike
curl https://[DOMENA]/monitoring/api/metrics

# Angel sistemi status
curl https://[DOMENA]/api/angel/integration/status
curl https://[DOMENA]/api/tasks/status
```

## 🔒 Varnostne Funkcionalnosti

### SSL/TLS
- ✅ Let's Encrypt certifikati
- ✅ Avtomatsko podaljševanje (cron job)
- ✅ HTTPS preusmeritev
- ✅ HSTS headers
- ✅ Perfect Forward Secrecy

### Firewall (UFW)
- ✅ SSH (port 22)
- ✅ HTTP (port 80) - preusmeritev na HTTPS
- ✅ HTTPS (port 443)
- ✅ Blokiranje vseh ostalih portov

### Nginx Varnost
- ✅ Rate limiting (10 req/s za API, 5 req/min za login)
- ✅ Security headers (XSS, CSRF, Clickjacking)
- ✅ Gzip kompresija
- ✅ Blokiranje dostopa do občutljivih datotek

### Sistemska Varnost
- ✅ Ločen uporabnik `omni` (non-root)
- ✅ Systemd security settings
- ✅ Fail2ban za SSH zaščito
- ✅ Avtomatske varnostne posodobitve

## 📈 Optimizacija Performanc

### Nginx Optimizacije
- ✅ Upstream load balancing
- ✅ Keepalive povezave
- ✅ Gzip kompresija
- ✅ Static file caching
- ✅ Proxy buffering

### Python Optimizacije
- ✅ Virtualno okolje
- ✅ Optimizirane dependencies
- ✅ Async/await podpora
- ✅ Connection pooling

### Sistemske Optimizacije
- ✅ Systemd restart policies
- ✅ Resource limits
- ✅ Disk I/O optimizacije
- ✅ Memory management

## 🚨 Odpravljanje Težav

### Pogosti Problemi

#### 1. SSL Certifikat Se Ne Pridobi
```bash
# Preveri DNS propagacijo
nslookup [DOMENA]

# Ročno pridobi certifikat
certbot --nginx -d [DOMENA] --email [EMAIL] --agree-tos

# Preveri Nginx konfiguracijo
nginx -t
```

#### 2. Storitve Se Ne Zaženejo
```bash
# Preveri logove
journalctl -u omni -n 50

# Preveri Python dependencies
/opt/omni/app/venv/bin/pip list

# Restart storitev
systemctl restart omni
```

#### 3. Angel Sistemi Ne Delujejo
```bash
# Preveri porte
netstat -tuln | grep -E "808[1-3]"

# Restart Angel storitev
systemctl restart angel-integration
systemctl restart angel-monitoring
systemctl restart angel-tasks
```

#### 4. Backup Ne Deluje
```bash
# Preveri backup timer
systemctl status omni-backup.timer

# Ročno zaženi backup
systemctl start omni-backup.service

# Preveri backup direktorij
ls -la /opt/omni/backups/
```

### Diagnostični Ukazi
```bash
# Celotna sistemska diagnostika
python3 /opt/omni/app/migration-validator.py --domain [DOMENA] --format human

# Omrežna diagnostika
curl -I https://[DOMENA]
curl -I https://[DOMENA]/monitoring/
curl -I https://[DOMENA]/api/angel/integration/

# Sistemski resursi
htop
df -h
free -h
```

## 🔄 Posodobitve Sistema

### Posodobitev Omni Aplikacije
```bash
# GitHub deployment
cd /opt/omni/app
git pull origin main
systemctl restart omni-platform.target

# Lokalni deployment
# Ponovno zaženi lokalni strežnik in ponovni deployment
```

### Sistemske Posodobitve
```bash
# Ubuntu posodobitve
apt update && apt upgrade -y

# Python dependencies
cd /opt/omni/app
source venv/bin/activate
pip install --upgrade -r requirements.txt

# Node.js dependencies
npm update
```

### SSL Certifikat Podaljšanje
```bash
# Avtomatsko (cron job že nastavljen)
# Ročno
certbot renew --dry-run
certbot renew
```

## 📞 Podpora in Pomoč

### Dokumentacija
- **Glavna dokumentacija**: `/opt/omni/app/docs/`
- **API dokumentacija**: `https://[DOMENA]/api/docs`
- **Angel sistemi**: `https://[DOMENA]/monitoring/docs`

### Logovi za Podporo
```bash
# Zberi vse pomembne logove
mkdir -p /tmp/omni-support-logs
journalctl -u omni --since "1 hour ago" > /tmp/omni-support-logs/omni.log
journalctl -u angel-integration --since "1 hour ago" > /tmp/omni-support-logs/angel-integration.log
journalctl -u angel-monitoring --since "1 hour ago" > /tmp/omni-support-logs/angel-monitoring.log
journalctl -u angel-tasks --since "1 hour ago" > /tmp/omni-support-logs/angel-tasks.log
cp /var/log/nginx/error.log /tmp/omni-support-logs/nginx-error.log
tar -czf omni-support-logs.tar.gz -C /tmp omni-support-logs/
```

### Kontakt
- **GitHub Issues**: [Repository Issues](https://github.com/username/omniscient-ai-platform/issues)
- **Email**: support@omni-platform.com
- **Discord**: [Omni Community](https://discord.gg/omni)

---

## 🎉 Zaključek

S tem sistemom lahko v manj kot 15 minutah popolnoma avtomatsko migriraš Omni AI platformo iz lokalnega računalnika v produkcijsko oblačno okolje z vsemi naprednimi funkcionalnostmi:

- ✅ **SSL šifriranje** z avtomatskim podaljševanjem
- ✅ **Angel sistemi** za napredno AI funkcionalnost
- ✅ **Backup sistem** z dnevnimi/tedenskimi/mesečnimi kopijami
- ✅ **Real-time monitoring** z alarmiranjem
- ✅ **Production-ready** konfiguracija z Nginx, Systemd, Firewall
- ✅ **Avtomatska validacija** uspešnosti migracije

**Sistem je pripravljen za takojšnjo uporabo v produkciji! 🚀**

---

**Ustvarjeno**: 2024-01-25  
**Verzija**: 2.0.0  
**Status**: Production Ready ✅