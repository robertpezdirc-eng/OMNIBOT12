# 📖 OMNI-BRAIN-MAXI-ULTRA Navodila za uporabo

## 🔹 Navodila za uporabo

### 1. Prenos in priprava skripte

**Prenesite datoteko `deploy-omni.sh` na vašo VPS/Cloud instanco:**

```bash
# Metoda 1: SCP prenos
scp deploy-omni.sh user@your-server:/home/

# Metoda 2: Git clone
git clone https://github.com/your-repo/omni-cloud-ready.git
cd omni-cloud-ready

# Metoda 3: Wget prenos
wget https://raw.githubusercontent.com/your-repo/omni-cloud-ready/main/deploy/deploy-omni.sh
```

**Omogočite izvajanje skripte:**
```bash
chmod +x deploy-omni.sh
# ALI za celoten paket
chmod +x deploy/*.sh
```

### 2. Zagon sistema

**Zaženite glavno namestitveno skripto:**

```bash
# Osnovna namestitev
./deploy-omni.sh

# Namestitev z domeno
./deploy/install.sh your-domain.com

# Hitra namestitev (3 koraki)
./deploy/quick-deploy.sh your-domain.com
```

### 3. Konfiguracija okolja

**V datoteki `app/.env` nastavite naslednje parametre:**

```bash
# Ustvarite .env datoteko
cat > app/.env << 'EOF'
# Produkcijske nastavitve
NODE_ENV=production
PYTHONUNBUFFERED=1

# Baza podatkov
MONGODB_URI=mongodb://localhost:27017/omni_brain
REDIS_URL=redis://localhost:6379

# Varnost
JWT_SECRET=your-super-secret-jwt-key-here
API_KEY=your-api-key-here

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info

# Strežnik
PORT=8080
HOST=0.0.0.0
EOF
```

**Ključni parametri:**
- `MONGODB_URI` - povezava do vaše MongoDB baze
- `JWT_SECRET` - skrivni ključ za JWT avtentikacijo (generiraj z `openssl rand -base64 32`)
- `PORT` - vrata za dostop do strežnika (privzeto 8080)
- `API_KEY` - API ključ za zunanje integracije

### 4. Aktivacija funkcij

**V datoteki `app/main.py` zagotovite, da so aktivirane ključne funkcije:**

```python
# Fast Mode aktivacija
FAST_MODE_CONFIG = load_config("config/fast_mode.json")

# Sprotno shranjevanje
ENABLE_AUTO_SAVE = True
SAVE_INTERVAL = 30  # sekund

# Real-time monitoring
ENABLE_MONITORING = True
WEBSOCKET_ENABLED = True
```

## 🔹 Rezultat

Po uspešni namestitvi boste imeli:

### ✅ Sistem Omni Brain nameščen v oblaku
- **Lokacija**: `/home/omni-cloud-ready/`
- **Servis**: `systemctl status omni.service`
- **Logi**: `journalctl -u omni.service -f`

### ✅ Avtonomno delovanje z neprekinjenim učenjem
- **Fast Mode**: Optimizirane zmogljivosti
- **Auto-learning**: Samodejno učenje iz podatkov
- **Self-optimization**: Samodejne optimizacije

### ✅ Sprotno shranjevanje podatkov
- **MongoDB**: Strukturirani podatki
- **Redis**: Cache in session podatki
- **Avtomatski backup**: Dnevno ob 2:00

### ✅ GUI vmesnik pripravljen za uporabniški dostop
- **Glavna aplikacija**: `https://your-domain.com`
- **API dokumentacija**: `https://your-domain.com/docs`
- **Admin panel**: `https://your-domain.com/admin`

### ✅ Real-time monitoring preko WebSocket povezave
- **Health check**: `https://your-domain.com/health`
- **Metrike**: `https://your-domain.com/metrics`
- **WebSocket**: `wss://your-domain.com/ws`

## 🔄 Samodejno posodabljanje

### Uporaba update-omni.sh skripte

```bash
# Osnovna posodobitev
./deploy/update-omni.sh

# Dry run (preveri kaj bi se posodobilo)
./deploy/update-omni.sh --dry-run

# Forsiraj posodobitev brez preverjanj
./deploy/update-omni.sh --force

# Rollback na prejšnjo verzijo
./deploy/update-omni.sh --rollback /home/backups/update_20240101_120000
```

### Omogočanje izvajanja skripte

```bash
chmod +x deploy/update-omni.sh
```

### Avtomatske posodobitve (cron job)

#### Dnevno ob 03:00
```bash
crontab -e
# Dodajte vrstico:
0 3 * * * /home/omni-cloud-ready/deploy/update-omni.sh >> /home/ubuntu/omni-update.log 2>&1
```

#### Tedensko ob nedeljah ob 03:00
```bash
crontab -e
# Dodajte vrstico:
0 3 * * 0 /home/omni-cloud-ready/deploy/update-omni.sh >> /home/ubuntu/omni-update.log 2>&1
```

#### Mesečno prvi dan v mesecu ob 03:00
```bash
crontab -e
# Dodajte vrstico:
0 3 1 * * /home/omni-cloud-ready/deploy/update-omni.sh >> /home/ubuntu/omni-update.log 2>&1
```

### Kaj posodobitev vključuje

✅ **Git repozitorij** - najnovejša koda  
✅ **Python odvisnosti** - app/requirements.txt  
✅ **Node.js odvisnosti** - server/package.json  
✅ **React odjemalec** - client/build gradnja  
✅ **pm2 upravljanje** - omni-brain-cloud proces  
✅ **Sprotno shranjevanje** - server/utils.js preverjanje  
✅ **Sistemski paketi** - apt update & upgrade  
✅ **Varnostne kopije** - avtomatsko pred posodobitvijo  
✅ **Health checks** - preverjanje delovanja  
✅ **Rollback** - v primeru napake  

### Monitoring posodobitev

```bash
# Preveri loge posodobitve
tail -f /var/log/omni/update.log

# Preveri pm2 status
pm2 status

# Preveri systemd status
systemctl status omni.service

# Preveri zadnje posodobitve
ls -la /home/backups/update_*
```

## 🔧 Napredna konfiguracija

### Performance tuning

**Za večje obremenitve:**
```bash
# Uredi systemd servis
sudo nano /etc/systemd/system/omni.service

# Povečaj resource limits
[Service]
MemoryMax=4G
CPUQuota=400%
LimitNOFILE=131072
LimitNPROC=8192

# Reload in restart
sudo systemctl daemon-reload
sudo systemctl restart omni.service
```

### SSL/HTTPS konfiguracija

**Avtomatska SSL namestitev:**
```bash
# Let's Encrypt certifikat
sudo certbot --nginx -d your-domain.com

# Ročna SSL konfiguracija
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/omni.key \
    -out /etc/ssl/certs/omni.crt
```

### Monitoring in alerting

**Nastavite email obvestila:**
```bash
# Namestite mailutils
sudo apt install mailutils

# Konfiguriraj monitoring script
sudo nano /usr/local/bin/omni-monitor.sh

# Dodaj email obvestila
if [[ $ERROR_COUNT -gt 0 ]]; then
    echo "OMNI-BRAIN napaka: $ERROR_COUNT napak" | mail -s "OMNI Alert" admin@your-domain.com
fi
```

## 🚨 Odpravljanje težav

### Pogosti problemi in rešitve

#### 1. Servis se ne zažene
```bash
# Preveri status
sudo systemctl status omni.service

# Preveri loge
sudo journalctl -u omni.service -n 50

# Restart servisa
sudo systemctl restart omni.service
```

#### 2. Nginx napake
```bash
# Test konfiguracije
sudo nginx -t

# Preveri error loge
sudo tail -f /var/log/nginx/error.log

# Reload konfiguracije
sudo systemctl reload nginx
```

#### 3. Baza podatkov problemi
```bash
# MongoDB status
sudo systemctl status mongodb

# Redis status
redis-cli ping

# Preveri povezave
netstat -tlnp | grep -E ':(27017|6379)'
```

#### 4. SSL certifikat problemi
```bash
# Preveri certifikat
sudo certbot certificates

# Obnovi certifikat
sudo certbot renew --dry-run

# Ročna obnova
sudo certbot renew
```

## 📞 Podpora in pomoč

### Logi in debugging
```bash
# Aplikacijski logi
sudo journalctl -u omni.service -f

# Nginx logi
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Sistem logi
sudo dmesg | tail -20

# OMNI specifični logi
tail -f /var/log/omni/*.log
```

### Backup in restore
```bash
# Ročni backup
/home/omni-cloud-ready/backup.sh

# Restore iz backup-a
sudo systemctl stop omni.service
cd /home/omni-cloud-ready
sudo tar -xzf /home/backups/omni_YYYYMMDD_HHMMSS/app.tar.gz
sudo systemctl start omni.service
```

### Kontakt in viri
- **Dokumentacija**: https://docs.omni-brain.ai
- **GitHub**: https://github.com/omni-brain/omni-cloud-ready
- **Support**: support@omni-brain.ai
- **Community**: https://community.omni-brain.ai

---

**🎉 Uspešno ste namestili OMNI-BRAIN-MAXI-ULTRA sistem!**

Sistem je zdaj pripravljen za produkcijsko uporabo z vsemi naprednimi funkcionalnostmi, avtomatskim posodabljanjem in monitoring sistemom.