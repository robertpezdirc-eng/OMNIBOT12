# Omni License System - Produkcijska Namestitev

## Pregled

Ta dokument opisuje, kako namestiti in konfigurirati Omni License System za produkcijsko uporabo z Docker containerizacijo.

## Sistemske Zahteve

### Minimalne Zahteve
- **CPU**: 4 jedra
- **RAM**: 8 GB
- **Disk**: 100 GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

### Priporočene Zahteve
- **CPU**: 8 jeder
- **RAM**: 16 GB
- **Disk**: 500 GB SSD
- **Backup Storage**: AWS S3 / Google Cloud Storage

## Hitri Zagon

### 1. Kloniraj Repozitorij
```bash
git clone <repository-url>
cd copy-of-copy-of-omniscient-ai-platform
```

### 2. Konfiguriraj Okoljske Spremenljivke
```bash
cp .env.production .env
# Uredi .env datoteko z vašimi nastavitvami
nano .env
```

### 3. Generiraj SSL Certifikate
```bash
# Samopodspisani certifikati (samo za testiranje)
mkdir -p server/ssl
openssl req -x509 -newkey rsa:4096 -keyout server/ssl/key.pem -out server/ssl/cert.pem -days 365 -nodes

# Ali uporabi Let's Encrypt za produkcijo
certbot certonly --standalone -d yourdomain.com
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem server/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem server/ssl/key.pem
```

### 4. Zaženi Sistem
```bash
# Osnovni setup
docker-compose up -d

# Ali produkcijski setup z monitoringom
docker-compose -f docker-compose.prod.yml up -d
```

## Konfiguracija

### Okoljske Spremenljivke

#### Obvezne Nastavitve
```env
# Baza podatkov
MONGO_ROOT_USERNAME=your_secure_username
MONGO_ROOT_PASSWORD=your_very_secure_password
MONGO_DB=omni_licenses

# Varnost
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
ENCRYPTION_KEY=your_32_character_encryption_key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

#### Opcijske Nastavitve
```env
# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Plačila (Stripe)
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Backup (AWS S3)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BACKUP_BUCKET=your-backup-bucket
```

### SSL Certifikati

#### Let's Encrypt (Priporočeno)
```bash
# Namesti Certbot
sudo apt install certbot

# Pridobi certifikat
sudo certbot certonly --standalone -d yourdomain.com

# Avtomatska obnova
sudo crontab -e
# Dodaj: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Samopodspisani (Samo za testiranje)
```bash
openssl req -x509 -newkey rsa:4096 -keyout server/ssl/key.pem -out server/ssl/cert.pem -days 365 -nodes -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=YourOrg/CN=localhost"
```

## Storitve

### Glavne Storitve
- **license-server**: Glavni API server (port 3002)
- **mongodb**: Baza podatkov (port 27017)
- **redis**: Cache in session store (port 6379)
- **nginx**: Reverse proxy in load balancer (port 80/443)

### Monitoring Storitve
- **prometheus**: Metrični sistem (port 9090)
- **grafana**: Vizualizacija (port 3000)
- **node-exporter**: Sistemske metrike (port 9100)

### Podporne Storitve
- **backup-scheduler**: Avtomatski backup
- **fluentd**: Log agregacija

## Monitoring in Logging

### Grafana Dashboard
- URL: `https://yourdomain.com:3000`
- Uporabnik: `admin`
- Geslo: `${GRAFANA_PASSWORD}`

### Prometheus Metriki
- URL: `https://yourdomain.com:9090`
- Metriki: sistem, aplikacija, baza podatkov

### Log Datoteke
```bash
# Aplikacijski logi
docker-compose logs -f license-server

# Nginx logi
docker-compose logs -f nginx

# MongoDB logi
docker-compose logs -f mongodb-primary
```

## Backup in Restore

### Avtomatski Backup
- **Dnevni**: 02:00 (celotna baza)
- **Tedenski**: Nedelja 03:00 (arhiv)
- **Mesečni**: 1. dan 04:00 (dolgoročni)

### Ročni Backup
```bash
# Backup baze podatkov
docker exec omni-mongodb-primary mongodump --uri="mongodb://username:password@localhost:27017/omni_licenses" --out=/backup

# Backup datotek
docker run --rm -v server_data:/data -v $(pwd)/backup:/backup alpine tar czf /backup/data-backup.tar.gz -C /data .
```

### Restore
```bash
# Restore baze podatkov
docker exec omni-mongodb-primary mongorestore --uri="mongodb://username:password@localhost:27017/omni_licenses" /backup/omni_licenses

# Restore datotek
docker run --rm -v server_data:/data -v $(pwd)/backup:/backup alpine tar xzf /backup/data-backup.tar.gz -C /data
```

## Varnost

### Firewall Nastavitve
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Zapri nepotreben dostop
sudo ufw deny 27017/tcp  # MongoDB
sudo ufw deny 6379/tcp   # Redis
```

### SSL/TLS Konfiguracija
- **Protokoli**: TLS 1.2, TLS 1.3
- **Ciphers**: ECDHE-RSA-AES256-GCM-SHA384
- **HSTS**: Omogočen
- **OCSP Stapling**: Priporočeno

### Varnostni Headers
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

## Skaliranje

### Horizontalno Skaliranje
```yaml
# docker-compose.scale.yml
services:
  license-server:
    deploy:
      replicas: 3
    
  nginx:
    depends_on:
      - license-server
```

### Load Balancing
```bash
# Zaženi več instanc
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale license-server=3
```

## Vzdrževanje

### Posodobitve
```bash
# Ustavi sistem
docker-compose down

# Posodobi slike
docker-compose pull

# Zaženi sistem
docker-compose up -d
```

### Čiščenje
```bash
# Počisti neuporabljene slike
docker system prune -a

# Počisti stare loge
docker-compose exec license-server find /app/logs -name "*.log" -mtime +30 -delete
```

### Health Checks
```bash
# Preveri stanje storitev
docker-compose ps

# Preveri health check
curl -k https://localhost/health
```

## Odpravljanje Težav

### Pogoste Težave

#### 1. Storitev se ne zažene
```bash
# Preveri loge
docker-compose logs service-name

# Preveri konfiguracijo
docker-compose config
```

#### 2. SSL Napake
```bash
# Preveri certifikate
openssl x509 -in server/ssl/cert.pem -text -noout

# Preveri veljavnost
openssl verify server/ssl/cert.pem
```

#### 3. Baza podatkov ni dostopna
```bash
# Preveri MongoDB
docker exec omni-mongodb-primary mongosh --eval "db.adminCommand('ping')"

# Preveri povezave
docker-compose exec license-server nc -zv mongodb-primary 27017
```

### Diagnostični Ukazi
```bash
# Sistemski viri
docker stats

# Disk prostor
df -h
docker system df

# Omrežje
docker network ls
docker network inspect omni-network
```

## Kontakt in Podpora

Za tehnično podporo in vprašanja:
- Email: support@yourdomain.com
- Dokumentacija: https://docs.yourdomain.com
- GitHub Issues: https://github.com/yourorg/omni-license-system/issues

## Licenca

Ta sistem je licenciran pod [MIT License](LICENSE).