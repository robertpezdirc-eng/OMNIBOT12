# 🚀 Omni Global Licensing System - Production Deployment Guide

## 📋 Pregled sistema

Omni Global Licensing System je celovita rešitev za upravljanje licenc z:
- **SSL/HTTPS/WSS** varnostjo
- **MongoDB** persistenco podatkov
- **Real-time** posodobitvami preko WebSocket
- **Admin GUI** za upravljanje licenc
- **Client Panel** za preverjanje licenc
- **Docker** containerizacijo
- **Nginx** reverse proxy
- **Redis** za cache in seje
- **Prometheus** monitoring

## 🛠️ Predpogoji

### Sistemske zahteve
- **Docker** 20.10+ in **Docker Compose** 2.0+
- **Linux server** (Ubuntu 20.04+ priporočeno)
- **Domena** z DNS nastavitvami
- **SSL certifikati** (Let's Encrypt ali komercialni)
- **Minimalno 4GB RAM** in **2 CPU cores**

### Omrežne zahteve
- **Port 80** (HTTP)
- **Port 443** (HTTPS)
- **Port 22** (SSH)
- Firewall konfiguracija za Docker

## 📁 Struktura projekta

```
omni-system/
├── server/ssl/omni-global/
│   ├── docker-compose.prod.yml     # Produkcijska konfiguracija
│   ├── .env.production            # Okoljske spremenljivke
│   ├── nginx/
│   │   ├── nginx.conf             # Nginx konfiguracija
│   │   └── conf.d/                # Dodatne konfiguracije
│   ├── certs/
│   │   ├── fullchain.pem          # SSL certifikat
│   │   └── privkey.pem            # Privatni ključ
│   ├── monitoring/
│   │   └── prometheus.yml         # Monitoring konfiguracija
│   └── backups/                   # Backup direktorij
```

## 🔧 Korak za korakom namestitev

### 1. Priprava strežnika

```bash
# Posodobi sistem
sudo apt update && sudo apt upgrade -y

# Namesti Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Namesti Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Ponovno se prijavi za Docker group
newgrp docker
```

### 2. Kloniraj projekt

```bash
# Kloniraj ali prenesi projekt
git clone <your-repo-url> omni-system
cd omni-system/server/ssl/omni-global/

# Nastavi pravice
chmod +x *.sh
```

### 3. SSL certifikati

#### Opcija A: Let's Encrypt (priporočeno)
```bash
# Namesti Certbot
sudo apt install certbot

# Pridobi certifikate
sudo certbot certonly --standalone -d yourdomain.com -d admin.yourdomain.com -d client.yourdomain.com

# Kopiraj certifikate
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./certs/
sudo chown $USER:$USER ./certs/*
```

#### Opcija B: Komercialni certifikati
```bash
# Kopiraj svoje certifikate
cp your-fullchain.pem ./certs/fullchain.pem
cp your-private-key.pem ./certs/privkey.pem
chmod 600 ./certs/*
```

### 4. Konfiguracija okoljskih spremenljivk

```bash
# Kopiraj in uredi produkcijsko .env datoteko
cp .env.production .env

# Uredi varnostne nastavitve
nano .env
```

**Obvezno spremeni:**
- `MONGO_PASSWORD` - močno geslo za MongoDB
- `JWT_SECRET` - 32+ znakov dolg ključ
- `REDIS_PASSWORD` - močno geslo za Redis
- `DOMAIN` - tvoja domena

### 5. DNS nastavitve

Nastavi A zapise v DNS:
```
yourdomain.com        → IP_NASLOV_STREŽNIKA
admin.yourdomain.com  → IP_NASLOV_STREŽNIKA
client.yourdomain.com → IP_NASLOV_STREŽNIKA
```

### 6. Firewall konfiguracija

```bash
# UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Preveri status
sudo ufw status
```

### 7. Zagon sistema

```bash
# Zgradi in zaženi vse storitve
docker-compose -f docker-compose.prod.yml up --build -d

# Preveri status
docker-compose -f docker-compose.prod.yml ps

# Preveri loge
docker-compose -f docker-compose.prod.yml logs -f
```

## 🌐 Dostopne točke

Po uspešni namestitvi so dostopne:

- **Glavna domena**: `https://yourdomain.com`
- **Admin Panel**: `https://admin.yourdomain.com`
- **Client Panel**: `https://client.yourdomain.com`
- **API Endpoint**: `https://yourdomain.com/api/license`
- **WebSocket**: `wss://yourdomain.com:443`

## 📊 Monitoring in vzdrževanje

### Preverjanje zdravja sistema
```bash
# Status vseh storitev
docker-compose -f docker-compose.prod.yml ps

# Zdravstveni pregledi
curl -k https://yourdomain.com/health
curl -k https://admin.yourdomain.com/health
curl -k https://client.yourdomain.com/health

# Prometheus metrics
curl http://localhost:9090/metrics
```

### Backup podatkov
```bash
# Ročni backup MongoDB
docker exec omni-mongo-prod mongodump --out /backups/$(date +%Y%m%d_%H%M%S)

# Avtomatski backup (cron)
echo "0 2 * * * cd /path/to/omni-system && ./backup.sh" | crontab -
```

### Posodabljanje sistema
```bash
# Prenesi najnovejše spremembe
git pull origin main

# Ponovno zgradi in zaženi
docker-compose -f docker-compose.prod.yml up --build -d

# Počisti stare slike
docker system prune -f
```

## 🔒 Varnostni nasveti

### 1. Redne posodobitve
```bash
# Posodobi sistem
sudo apt update && sudo apt upgrade -y

# Posodobi Docker slike
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Monitoring logov
```bash
# Preveri varnostne loge
docker-compose -f docker-compose.prod.yml logs nginx | grep -i error
docker-compose -f docker-compose.prod.yml logs server | grep -i failed
```

### 3. Backup strategija
- **Dnevni** backup MongoDB
- **Tedenski** backup celotnega sistema
- **Mesečni** arhivski backup
- Test restore procedur

## 🚨 Odpravljanje težav

### Pogosti problemi

#### 1. SSL certifikat napake
```bash
# Preveri certifikate
openssl x509 -in ./certs/fullchain.pem -text -noout
openssl rsa -in ./certs/privkey.pem -check

# Obnovi Let's Encrypt
sudo certbot renew --dry-run
```

#### 2. MongoDB povezava
```bash
# Preveri MongoDB
docker exec -it omni-mongo-prod mongosh
# V MongoDB shell:
# use omni
# db.licenses.find()
```

#### 3. WebSocket povezave
```bash
# Preveri WebSocket
wscat -c wss://yourdomain.com
```

#### 4. Nginx konfiguracija
```bash
# Testiraj Nginx konfiguracijo
docker exec omni-nginx-prod nginx -t

# Ponovno naloži konfiguracijo
docker exec omni-nginx-prod nginx -s reload
```

### Logi za diagnostiko
```bash
# Vsi logi
docker-compose -f docker-compose.prod.yml logs

# Specifična storitev
docker-compose -f docker-compose.prod.yml logs server
docker-compose -f docker-compose.prod.yml logs nginx

# Sledenje logom v realnem času
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

## 📈 Optimizacija performans

### 1. MongoDB optimizacija
```javascript
// Ustvari indekse v MongoDB
db.licenses.createIndex({ "client_id": 1 })
db.licenses.createIndex({ "created_at": -1 })
db.licenses.createIndex({ "expires_at": 1 })
```

### 2. Nginx cache
```nginx
# Dodaj v nginx.conf
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Redis cache
```bash
# Preveri Redis statistike
docker exec omni-redis-prod redis-cli info stats
```

## 🔄 Avtomatizacija

### Deployment skripta
```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Začenjam deployment..."

# Backup pred posodobitvijo
./backup.sh

# Prenesi spremembe
git pull origin main

# Zgradi in zaženi
docker-compose -f docker-compose.prod.yml up --build -d

# Preveri zdravje
sleep 30
curl -f https://yourdomain.com/health || exit 1

echo "✅ Deployment uspešen!"
```

### Monitoring skripta
```bash
#!/bin/bash
# monitor.sh

# Preveri vse storitve
services=("omni-server-prod" "omni-admin-prod" "omni-client-prod" "omni-nginx-prod" "omni-mongo-prod")

for service in "${services[@]}"; do
    if ! docker ps | grep -q $service; then
        echo "❌ $service ni aktiven!"
        # Pošlji opozorilo
        curl -X POST "https://hooks.slack.com/..." -d "{'text':'$service down!'}"
    fi
done
```

## 📞 Podpora

Za tehnično podporo:
- **Email**: support@yourdomain.com
- **Dokumentacija**: https://docs.yourdomain.com
- **GitHub Issues**: https://github.com/your-repo/issues

---

**Opomba**: Ta vodič predpostavlja osnovno znanje Docker, Linux administracije in DNS konfiguracije. Za produkcijsko uporabo priporočamo dodatno varnostno revizijo in testiranje.