# 🌐 OMNI CLOUD MIGRATION - POPOLN SISTEM

## 📋 Pregled Sistema

Threo Cloud Migration sistem omogoča **popolnoma avtomatsko migracijo** Omni aplikacije v oblačno okolje z vsemi Angel sistemi, SSL certifikati, backup sistemom in monitoring sistemom.

## 🚀 Hitri Zagon

### 1. Priprava Strežnika
```bash
# Ubuntu 22.04 LTS strežnik z javnim IP-jem
# Minimalne zahteve: 2GB RAM, 20GB disk

# Povezava na strežnik
ssh root@your-server-ip
```

### 2. Prenos Datotek

**Opcija A: Wget (Priporočeno)**
```bash
# Prenos glavne skripte
wget http://localhost:3000/threo-cloud-migration.sh
chmod +x threo-cloud-migration.sh

# Prenos vseh potrebnih datotek
wget http://localhost:3000/nginx-omni.conf
wget http://localhost:3000/systemd-services-setup.sh
wget http://localhost:3000/manage-services.sh
wget http://localhost:3000/cloud-backup-system.py
wget http://localhost:3000/cloud-monitoring-system.py
wget http://localhost:3000/migration-validator.py
```

**Opcija B: SCP Upload**
```bash
# Z lokalnega računalnika
scp threo-cloud-migration.sh root@your-server:/root/
scp *.conf *.sh *.py root@your-server:/root/
```

### 3. Zagon Migracije
```bash
# Zagon glavne skripte
./threo-cloud-migration.sh

# Vnos podatkov:
# - Domena: moja-domena.com
# - E-pošta: admin@moja-domena.com
```

### 4. Validacija
```bash
# Po končani migraciji
python3 migration-validator.py moja-domena.com
```

## 📁 Struktura Datotek

```
📦 Omni Cloud Migration
├── 🚀 threo-cloud-migration.sh      # Glavna migracijska skripta
├── 🌐 nginx-omni.conf               # Nginx konfiguracija
├── 🔧 systemd-services-setup.sh     # Systemd storitve
├── 🎛️  manage-services.sh            # Upravljanje storitev
├── 💾 cloud-backup-system.py        # Backup sistem
├── 📊 cloud-monitoring-system.py    # Monitoring sistem
├── 🔍 migration-validator.py        # Validacijski sistem
└── 📚 deploy-complete.md            # Ta dokumentacija
```

## 🔧 Sistemske Komponente

### Glavna Aplikacija
- **Port**: 8080 (interno), 80/443 (eksterno)
- **Lokacija**: `/opt/omni/`
- **Storitev**: `omni.service`

### Angel Sistemi
| Angel | Port | Storitev | Funkcija |
|-------|------|----------|----------|
| Integration | 5000 | angel-integration | API integracije |
| Task Distribution | 5001 | angel-tasks | Distribucija nalog |
| Monitoring | 5003 | angel-monitoring | Spremljanje sistema |
| Synchronization | 5004 | angel-sync | Sinhronizacija |

### Podporni Sistemi
- **Nginx**: Reverse proxy z SSL
- **Backup**: Dnevni/tedenski/mesečni backup
- **Monitoring**: Real-time dashboard
- **SSL**: Let's Encrypt z avtomatskim podaljševanjem

## 🎯 Funkcionalnosti

### ✅ Avtomatska Namestitev
- Sistemska priprava (Ubuntu/Debian)
- Namestitev odvisnosti (Python, Node.js, Nginx)
- Kreiranje uporabnikov in direktorijev
- Konfiguracija varnostnih nastavitev

### 🔒 SSL & Varnost
- Let's Encrypt SSL certifikati
- Avtomatsko podaljševanje certifikatov
- HTTP → HTTPS preusmeritev
- Varnostne glave (HSTS, CSP, XSS Protection)
- Rate limiting in DDoS zaščita

### 🔧 Systemd Upravljanje
```bash
# Upravljanje vseh storitev
./manage-services.sh start     # Zagon vseh
./manage-services.sh stop      # Ustavitev vseh
./manage-services.sh restart   # Restart vseh
./manage-services.sh status    # Status vseh
./manage-services.sh logs      # Dnevniki vseh

# Posamezne storitve
systemctl start omni
systemctl status angel-integration
systemctl logs angel-monitoring
```

### 💾 Backup Sistem
```bash
# Ročni backup
python3 /opt/omni/cloud-backup-system.py backup

# Preverjanje statusa
python3 /opt/omni/cloud-backup-system.py status

# Načrtovanje backupov
python3 /opt/omni/cloud-backup-system.py schedule
```

**Backup Politika:**
- **Dnevni**: 7 dni hrambe
- **Tedenski**: 4 tedne hrambe  
- **Mesečni**: 12 mesecev hrambe
- **Lokacija**: `/var/backups/omni/`

### 📊 Monitoring Sistem
```bash
# Zagon monitoring dashboarda
python3 /opt/omni/cloud-monitoring-system.py dashboard

# Enkratno preverjanje
python3 /opt/omni/cloud-monitoring-system.py check

# Kontinuirano spremljanje
python3 /opt/omni/cloud-monitoring-system.py monitor
```

**Monitoring Dashboard**: `http://your-domain:5003/`

**Spremljane Metrike:**
- CPU, Memory, Disk uporaba
- Odzivni časi aplikacij
- Status vseh storitev
- Omrežni promet
- SSL certifikat status

### 🔍 Validacijski Sistem
```bash
# Popolna validacija
python3 migration-validator.py moja-domena.com

# JSON izpis
python3 migration-validator.py moja-domena.com --json
```

**Validacijske Kategorije:**
- ✅ Sistemska konfiguracija
- ✅ Systemd storitve
- ✅ Omrežna povezljivost
- ✅ SSL certifikati
- ✅ Aplikacijski endpoints
- ✅ Angel sistemi
- ✅ Backup sistem
- ✅ Monitoring sistem
- ✅ Datotečni sistem
- ✅ Performančni testi

## 🌐 Dostopne Storitve

Po uspešni migraciji so dostopne naslednje storitve:

### Javno Dostopne
- **Glavna aplikacija**: `https://moja-domena.com/`
- **API dokumentacija**: `https://moja-domena.com/api/docs`

### Interno Dostopne
- **Angel Integration**: `http://localhost:5000/`
- **Angel Tasks**: `http://localhost:5001/`
- **Angel Monitoring**: `http://localhost:5003/`
- **Angel Sync**: `http://localhost:5004/`

### Administrativne
- **Monitoring Dashboard**: `http://moja-domena.com:5003/`
- **Nginx Status**: `http://localhost/nginx_status`

## 🚨 Alarmiranje

### E-poštni Alarmi
Konfiguriraj v `/opt/omni/cloud-monitoring-system.py`:
```python
EMAIL_CONFIG = {
    'smtp_server': 'your-smtp-server.com',
    'smtp_port': 587,
    'username': 'your-email@domain.com',
    'password': 'your-password',
    'from_email': 'omni-monitoring@domain.com',
    'to_emails': ['admin@domain.com'],
}
```

### Alarm Tipi
- 🚨 **Critical**: Storitve nedelujejo, SSL problemi
- ⚠️ **Warning**: Visoka uporaba virov, počasni odzivi
- ℹ️ **Info**: Sistemska obvestila, backup poročila

## 🔧 Odpravljanje Težav

### Preverjanje Statusa
```bash
# Sistemski status
systemctl status omni angel-*

# Dnevniki
journalctl -u omni -f
journalctl -u angel-integration -f

# Omrežje
netstat -tlnp | grep :8080
curl -I http://localhost:8080/health
```

### Pogosti Problemi

**1. SSL Certifikat se ne pridobi**
```bash
# Preveri DNS
nslookup moja-domena.com

# Ročno pridobi certifikat
certbot certonly --nginx -d moja-domena.com
```

**2. Storitve se ne zaženejo**
```bash
# Preveri konfiguracije
nginx -t
python3 -m py_compile /opt/omni/main.py

# Restart storitev
systemctl restart nginx omni
```

**3. Backup ne deluje**
```bash
# Preveri dovoljenja
ls -la /var/backups/omni/
chown -R omni:omni /var/backups/omni/

# Ročni test
python3 /opt/omni/cloud-backup-system.py backup
```

## 📈 Optimizacija Performanc

### Nginx Optimizacija
- Gzip kompresija
- Browser caching
- Static file serving
- Connection pooling

### Python Optimizacija
- Gunicorn workers
- Memory pooling
- Database connection pooling
- Async request handling

### Sistemska Optimizacija
- Kernel parameters tuning
- File descriptor limits
- Memory management
- Disk I/O optimization

## 🔄 Posodobitve

### Aplikacijske Posodobitve
```bash
cd /opt/omni
git pull origin main
./manage-services.sh restart
```

### Sistemske Posodobitve
```bash
apt update && apt upgrade -y
systemctl restart nginx
```

### SSL Certifikat Posodobitve
```bash
# Avtomatsko (cron job že nastavljen)
certbot renew --dry-run

# Ročno
certbot renew
systemctl reload nginx
```

## 📞 Podpora

### Dnevniki
- **Aplikacija**: `/var/log/omni/app.log`
- **Angel sistemi**: `/var/log/omni/angel-*.log`
- **Nginx**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **Backup**: `/var/log/omni/backup.log`
- **Monitoring**: `/var/log/omni/monitoring.log`

### Konfiguracije
- **Nginx**: `/etc/nginx/sites-available/omni`
- **Systemd**: `/etc/systemd/system/omni*.service`
- **SSL**: `/etc/letsencrypt/live/moja-domena.com/`

### Podatkovne Baze
- **Monitoring**: `/var/lib/omni/monitoring.db`
- **Backup**: `/var/lib/omni/backup.db`
- **Angel sistemi**: `/var/lib/omni/angel-*.db`

---

## 🎉 Zaključek

**Omni Cloud Migration sistem** zagotavlja:

✅ **Popolnoma avtomatsko migracijo** v manj kot 10 minutah  
✅ **Enterprise-grade varnost** z SSL in varnostnimi glavami  
✅ **Visoko razpoložljivost** z avtomatskim restartom  
✅ **Napredni monitoring** z real-time dashboardom  
✅ **Zanesljiv backup** z več nivojskim arhiviranjem  
✅ **Enostavno upravljanje** z upravljalskimi skriptami  
✅ **Popolno validacijo** z avtomatskim testiranjem  

**Sistem je pripravljen za produkcijsko uporabo!** 🚀

---

*Omni Cloud Migration v1.0 - Powered by Threo AI*