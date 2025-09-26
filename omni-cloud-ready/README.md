# 🚀 OMNI-BRAIN-MAXI-ULTRA Ready-to-Run Cloud Package

**Plug-and-Play** rešitev za takojšnjo namestitev OMNI-BRAIN sistema v oblak z optimiziranim **Fast Mode** delovanjem.

## 📦 Vsebina paketa

```
omni-cloud-ready/
│
├─ config/
│   └─ fast_mode.json          # Threa Fast Mode optimizacije
│
├─ app/
│   └─ main.py                 # Glavna OMNI aplikacija z Fast Mode
│
├─ deploy/
│   ├─ omni.service            # systemd servis za samodejni zagon
│   └─ nginx.conf              # Nginx reverse proxy konfiguracija
│
└─ README.md                   # Ta datoteka
```

## ⚡ Hitri zagon (3 minute)

### 🚀 Super hitra namestitev (1 ukaz)

```bash
# Prenos in namestitev v enem koraku
curl -sSL https://raw.githubusercontent.com/your-repo/omni-cloud-ready/main/deploy/quick-deploy.sh | sudo bash -s your-domain.com
```

### 1️⃣ Prenos paketa na strežnik

```bash
# Naloži paket na strežnik
scp -r omni-cloud-ready/ user@your-server:/home/

# Ali uporabi Git
git clone https://github.com/your-repo/omni-cloud-ready.git
cd omni-cloud-ready
```

### 2️⃣ Avtomatska namestitev

```bash
# Hitra namestitev (3 koraki)
chmod +x deploy/quick-deploy.sh
sudo ./deploy/quick-deploy.sh your-domain.com

# ALI popolna namestitev
chmod +x deploy/install.sh
sudo ./deploy/install.sh your-domain.com
```

**ALI ročna namestitev:**

### 3️⃣ Ročna namestitev (korak za korakom)

#### Korak 1: Namesti potrebne pakete
```bash
sudo apt update && sudo apt install -y \
    python3 python3-pip python3-venv \
    nginx certbot python3-certbot-nginx \
    redis-server mongodb \
    htop curl wget git
```

#### Korak 2: Ustvari uporabnika
```bash
sudo useradd -m -s /bin/bash omni
sudo usermod -aG sudo omni
```

#### Korak 3: Namesti Python odvisnosti
```bash
cd /home/omni-cloud-ready/app
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Korak 4: Konfiguriraj systemd servis
```bash
sudo cp deploy/omni.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable omni.service
sudo systemctl start omni.service
```

#### Korak 5: Konfiguriraj Nginx
```bash
# Prilagodi domeno v nginx.conf
sudo sed -i 's/tvoja-domena.com/your-actual-domain.com/g' deploy/nginx.conf

# Naloži konfiguracijo
sudo cp deploy/nginx.conf /etc/nginx/sites-available/omni.conf
sudo ln -s /etc/nginx/sites-available/omni.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Korak 6: Namesti SSL certifikat
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 🎯 Preverjanje delovanja

### Status sistema
```bash
# Preveri status aplikacije
sudo systemctl status omni.service

# Preveri loge
sudo journalctl -u omni.service -f

# Preveri Nginx
sudo nginx -t
sudo systemctl status nginx

# Preveri porte
sudo netstat -tlnp | grep -E ':(80|443|8080)'
```

### Test povezljivosti
```bash
# Lokalni test
curl http://localhost:8080/health

# Javni test
curl https://your-domain.com/health
```

## 🔧 Konfiguracija

### Fast Mode nastavitve
Uredi `config/fast_mode.json` za prilagoditev zmogljivosti:

```json
{
  "mode": "fast",
  "priority": ["speed", "stability", "full_value"],
  "settings": {
    "optimize_processes": true,
    "cache_enabled": true,
    "lazy_loading": true,
    "async_processing": true,
    "parallel_tasks": true,
    "db_indexing": true,
    "connection_pool": true
  }
}
```

### Okoljske spremenljivke
Ustvari `.env` datoteko v `app/` direktoriju:

```bash
# Produkcijske nastavitve
NODE_ENV=production
PYTHONUNBUFFERED=1

# Baza podatkov
MONGODB_URI=mongodb://localhost:27017/omni_brain
REDIS_URL=redis://localhost:6379

# Varnost
JWT_SECRET=your-super-secret-jwt-key
API_KEY=your-api-key

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
```

## 🔄 Samodejno posodabljanje

### Uporaba update-omni.sh skripte

```bash
# Osnovna posodobitev z vsemi novimi funkcionalnostmi
./deploy/update-omni.sh

# Dry run (preveri kaj bi se posodobilo)
./deploy/update-omni.sh --dry-run

# Forsiraj posodobitev brez preverjanj
./deploy/update-omni.sh --force

# Rollback na prejšnjo verzijo
./deploy/update-omni.sh --rollback /home/backups/update_20240101_120000
```

### Kaj nova posodobitev vključuje

✅ **Git repozitorij** - najnovejša koda  
✅ **Python odvisnosti** - app/requirements.txt  
✅ **Node.js odvisnosti** - server/package.json  
✅ **React odjemalec** - client/build gradnja  
✅ **pm2 upravljanje** - omni-brain-cloud proces  
✅ **Sprotno shranjevanje** - server/utils.js preverjanje/dodajanje  
✅ **Sistemski paketi** - apt update & upgrade  
✅ **Varnostne kopije** - avtomatsko pred posodobitvijo  
✅ **Health checks** - preverjanje delovanja  
✅ **Rollback** - v primeru napake  

### Avtomatske posodobitve (cron job)

```bash
# Omogoči izvajanje
chmod +x deploy/update-omni.sh

# Dnevno ob 03:00
echo "0 3 * * * /home/omni-cloud-ready/deploy/update-omni.sh >> /home/ubuntu/omni-update.log 2>&1" | crontab -

# Tedensko ob nedeljah ob 03:00
echo "0 3 * * 0 /home/omni-cloud-ready/deploy/update-omni.sh >> /home/ubuntu/omni-update.log 2>&1" | crontab -

# Mesečno prvi dan v mesecu ob 03:00
echo "0 3 1 * * /home/omni-cloud-ready/deploy/update-omni.sh >> /home/ubuntu/omni-update.log 2>&1" | crontab -
```

### Rezultat posodobitve

💡 **Rezultat:**
- Omni Brain bo vedno posodobljen z najnovejšo kodo in vmesnikom
- React odjemalski vmesnik bo zgrajen v `client/build/`
- pm2 bo upravljal Node.js aplikacijo (`omni-brain-cloud`)
- Sistem se bo avtonomno učil in optimiziral
- Sprotno shranjevanje podatkov ostaja aktivno v `server/utils.js`
- Popolna avtomatizacija brez ročnih posegov

## 🚀 Upravljanje sistema

### Osnovni ukazi
```bash
# Restart aplikacije
sudo systemctl restart omni.service

# Restart Nginx
sudo systemctl restart nginx

# Preveri loge
sudo journalctl -u omni.service -n 100

# Posodobi aplikacijo
cd /home/omni-cloud-ready
git pull
sudo systemctl restart omni.service
```

### Monitoring
```bash
# Real-time monitoring
htop

# Disk usage
df -h

# Memory usage
free -h

# Network connections
ss -tulpn
```

## 🔒 Varnost

### Firewall nastavitve
```bash
# Omogoči UFW
sudo ufw enable

# Dovoli potrebne porte
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Preveri status
sudo ufw status
```

### SSL/TLS
- Avtomatska obnova certifikatov z Certbot
- TLS 1.2+ protokoli
- HSTS headers
- Varnostni headers (XSS, CSRF, itd.)

### Rate limiting
- API: 10 zahtev/sekundo
- Login: 1 zahtev/sekundo
- Splošno: 50 zahtev/sekundo

## 📊 Monitoring in metrike

### Dostopne metrike
- **Health check**: `https://your-domain.com/health`
- **Metrics**: `https://your-domain.com/metrics` (omejen dostop)
- **Status**: `https://your-domain.com/status`

### Grafana dashboard
```bash
# Namesti Grafana (opcijsko)
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana
```

## 🔄 Backup in obnovitev

### Avtomatski backup
```bash
# Ustvari backup skripto
cat > /home/omni-cloud-ready/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/backups/omni_$DATE"

mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --out $BACKUP_DIR/mongodb

# Backup Redis
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/

# Backup aplikacije
tar -czf $BACKUP_DIR/app.tar.gz /home/omni-cloud-ready/

# Počisti stare backupe (starejše od 7 dni)
find /home/backups -name "omni_*" -mtime +7 -exec rm -rf {} \;
EOF

chmod +x /home/omni-cloud-ready/backup.sh

# Dodaj v crontab za dnevni backup
echo "0 2 * * * /home/omni-cloud-ready/backup.sh" | sudo crontab -
```

## 🌐 Skaliranje

### Horizontalno skaliranje
```bash
# Load balancer konfiguracija (Nginx)
upstream omni_cluster {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}
```

### Vertikalno skaliranje
Uredi `deploy/omni.service`:
```ini
# Povečaj resource limits
MemoryMax=4G
CPUQuota=400%
LimitNOFILE=131072
```

## 🛠️ Odpravljanje težav

### Pogosti problemi

#### 1. Aplikacija se ne zažene
```bash
# Preveri loge
sudo journalctl -u omni.service -n 50

# Preveri Python odvisnosti
cd /home/omni-cloud-ready/app
source venv/bin/activate
pip check
```

#### 2. Nginx napake
```bash
# Test konfiguracije
sudo nginx -t

# Preveri error loge
sudo tail -f /var/log/nginx/error.log
```

#### 3. SSL problemi
```bash
# Obnovi certifikat
sudo certbot renew --dry-run

# Preveri certifikat
openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout
```

#### 4. Baza podatkov
```bash
# MongoDB status
sudo systemctl status mongodb

# Redis status
redis-cli ping
```

### Performance tuning
```bash
# Optimiziraj MongoDB
echo 'net.core.somaxconn = 65535' | sudo tee -a /etc/sysctl.conf
echo 'vm.overcommit_memory = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 📞 Podpora

### Logi in debugging
```bash
# Aplikacijski logi
sudo journalctl -u omni.service -f

# Nginx logi
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Sistem logi
sudo dmesg | tail -20
```

### Kontakt
- **Dokumentacija**: https://docs.omni-brain.ai
- **GitHub**: https://github.com/omni-brain/omni-cloud-ready
- **Support**: support@omni-brain.ai

## ✅ Rezultat

Po uspešni namestitvi boš imel:

🚀 **OMNI-BRAIN sistem** ki se samodejno zažene ob zagonu strežnika

🌐 **Javno dostopen** preko tvoje domene z HTTPS

⚡ **Fast Mode optimiziran** za hitrost, stabilnost in polno funkcionalnost

🔒 **Varen** z SSL, rate limiting in varnostnimi headerji

📊 **Monitoring** z metrikami in health check endpointi

💾 **Avtomatski backup** z možnostjo obnovitve

🔄 **Samodejno upravljanje** z systemd in process monitoring

---

**🎉 Čestitamo! OMNI-BRAIN-MAXI-ULTRA je pripravljen za produkcijo!**