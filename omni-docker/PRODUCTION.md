# 🏭 Omni License System - Produkcijska uporaba

## 🔒 Varnostne nastavitve

### 1. Okoljske spremenljivke

Ustvari produkcijsko `.env.production` datoteko:

```env
# MongoDB - SPREMENI GESLA!
MONGODB_USERNAME=omni_prod_admin
MONGODB_PASSWORD=SUPER_SECURE_PASSWORD_HERE_2024!
MONGODB_DATABASE=omni_licenses_prod

# JWT - GENERIRAJ NOVA KLJUČA!
JWT_SECRET=your_production_jwt_secret_minimum_32_characters_long_2024
REFRESH_TOKEN_SECRET=your_production_refresh_secret_minimum_32_characters_long_2024

# Server
NODE_ENV=production
PORT=3000
USE_HTTPS=true

# CORS - OMEJI NA TVOJE DOMENE!
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com

# API URLs - UPORABI TVOJE DOMENE!
API_BASE_URL=https://api.yourdomain.com
ADMIN_API_URL=https://api.yourdomain.com
CLIENT_API_URL=https://api.yourdomain.com

# Ports
ADMIN_PORT=3001
CLIENT_PORT=3002

# Rate Limiting - Strožji limiti
GENERAL_LIMIT_WINDOW_MS=900000
GENERAL_LIMIT_MAX=100
LICENSE_CHECK_LIMIT_MAX=50
TOKEN_LIMIT_MAX=10
ADMIN_LIMIT_MAX=200
CREATE_LICENSE_LIMIT_MAX=5
ACTIVITY_LIMIT_MAX=30

# Logging
LOG_LEVEL=warn
LOG_TO_FILE=true
```

### 2. SSL Certifikati

```bash
# Ustvari SSL mapo
mkdir -p server/ssl

# Možnost 1: Let's Encrypt (priporočeno)
# Namesti certbot in pridobi certifikate
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# Kopiraj certifikate
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem server/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem server/ssl/key.pem

# Možnost 2: Komercialni certifikat
# Kopiraj svoje certifikate v server/ssl/
```

### 3. Docker Secrets (priporočeno)

Ustvari `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    environment:
      - MONGO_INITDB_ROOT_USERNAME_FILE=/run/secrets/mongodb_username
      - MONGO_INITDB_ROOT_PASSWORD_FILE=/run/secrets/mongodb_password
    secrets:
      - mongodb_username
      - mongodb_password

  omni-server:
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - REFRESH_TOKEN_SECRET_FILE=/run/secrets/refresh_secret
    secrets:
      - jwt_secret
      - refresh_secret

secrets:
  mongodb_username:
    file: ./secrets/mongodb_username.txt
  mongodb_password:
    file: ./secrets/mongodb_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  refresh_secret:
    file: ./secrets/refresh_secret.txt
```

Ustvari secrets:
```bash
mkdir secrets
echo "omni_prod_admin" > secrets/mongodb_username.txt
echo "SUPER_SECURE_PASSWORD_HERE_2024!" > secrets/mongodb_password.txt
echo "your_production_jwt_secret_minimum_32_characters_long_2024" > secrets/jwt_secret.txt
echo "your_production_refresh_secret_minimum_32_characters_long_2024" > secrets/refresh_secret.txt

# Nastavi dovoljenja
chmod 600 secrets/*
```

## 🌐 Reverse Proxy (Nginx)

### 1. Nginx konfiguracija

Ustvari `nginx.conf`:

```nginx
upstream omni_api {
    server localhost:3000;
}

upstream omni_admin {
    server localhost:3001;
}

# API Server
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.pem;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://omni_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Admin GUI
server {
    listen 80;
    server_name admin.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.pem;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    
    # SSL Security (same as above)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Basic Auth (dodatna varnost)
    auth_basic "Admin Area";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://omni_admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Ustvari Basic Auth za Admin

```bash
# Namesti htpasswd
sudo apt install apache2-utils

# Ustvari uporabnika
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Vnesi varno geslo
```

## 📊 Monitoring in Logging

### 1. Docker Compose z monitoring

Dodaj v `docker-compose.prod.yml`:

```yaml
  # Prometheus za metrije
  prometheus:
    image: prom/prometheus:latest
    container_name: omni-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  # Grafana za dashboarde
  grafana:
    image: grafana/grafana:latest
    container_name: omni-grafana
    ports:
      - "3003:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_grafana_password
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```

### 2. Centralizirano beleženje

Ustvari `docker-compose.logging.yml`:

```yaml
version: '3.8'

services:
  # ELK Stack za loge
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logging/logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200

volumes:
  elasticsearch_data:
```

## 🔄 Backup strategija

### 1. Avtomatski backup script

Ustvari `backup.sh`:

```bash
#!/bin/bash

# Konfiguracija
BACKUP_DIR="/backups/omni-license"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Ustvari backup direktorij
mkdir -p $BACKUP_DIR

# MongoDB backup
echo "Ustvarjam MongoDB backup..."
docker-compose exec -T mongodb mongodump \
  --username omni_prod_admin \
  --password SUPER_SECURE_PASSWORD_HERE_2024! \
  --authenticationDatabase admin \
  --db omni_licenses_prod \
  --archive=/tmp/mongodb_backup_$DATE.archive

# Kopiraj backup iz container-ja
docker cp omni-docker_mongodb_1:/tmp/mongodb_backup_$DATE.archive $BACKUP_DIR/

# Backup konfiguracijskih datotek
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz \
  .env.production \
  docker-compose.prod.yml \
  secrets/ \
  server/ssl/

# Počisti stare backup-e
find $BACKUP_DIR -name "*.archive" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup dokončan: $BACKUP_DIR"
```

### 2. Cron job za avtomatski backup

```bash
# Dodaj v crontab
crontab -e

# Backup vsak dan ob 2:00
0 2 * * * /path/to/backup.sh >> /var/log/omni-backup.log 2>&1
```

## 🚀 Deployment

### 1. Produkcijski zagon

```bash
# Uporabi produkcijske nastavitve
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Z monitoring
docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.logging.yml up -d
```

### 2. Health check script

Ustvari `health-check.sh`:

```bash
#!/bin/bash

# Preveri API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.yourdomain.com/health)
if [ $API_STATUS -ne 200 ]; then
    echo "API ERROR: Status $API_STATUS"
    # Pošlji alert (email, Slack, itd.)
fi

# Preveri Admin
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://admin.yourdomain.com)
if [ $ADMIN_STATUS -ne 200 ]; then
    echo "ADMIN ERROR: Status $ADMIN_STATUS"
fi

# Preveri MongoDB
MONGO_STATUS=$(docker-compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping').ok")
if [ "$MONGO_STATUS" != "1" ]; then
    echo "MONGODB ERROR"
fi

echo "Health check completed"
```

## 📈 Performance optimizacija

### 1. Docker optimizacije

```yaml
# V docker-compose.prod.yml
services:
  omni-server:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '1.0'
          memory: 512M
    restart: unless-stopped
    
  mongodb:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    restart: unless-stopped
```

### 2. MongoDB optimizacije

```javascript
// V MongoDB
use omni_licenses_prod

// Ustvari indekse za boljšo performance
db.licenses.createIndex({ "client_id": 1 })
db.licenses.createIndex({ "license_key": 1 })
db.licenses.createIndex({ "created_at": -1 })
db.licenses.createIndex({ "expires_at": 1 })
db.refreshtokens.createIndex({ "token": 1 })
db.refreshtokens.createIndex({ "expires_at": 1 })
db.activitylogs.createIndex({ "client_id": 1, "timestamp": -1 })
```

## 🔐 Varnostni pregled

### Checklist pred produkcijo:

- [ ] Vsa privzeta gesla so spremenjena
- [ ] SSL certifikati so nameščeni in veljavni
- [ ] CORS je omejen na specifične domene
- [ ] Rate limiting je konfiguriran
- [ ] Firewall pravila so nastavljena
- [ ] Backup strategija je implementirana
- [ ] Monitoring je aktiven
- [ ] Logi se shranjujejo varno
- [ ] Docker secrets so uporabljeni
- [ ] Nginx reverse proxy je konfiguriran
- [ ] Basic auth za admin je aktiven
- [ ] Health check-i delujejo
- [ ] Performance testi so opravljeni

## 📞 Incident Response

### 1. Postopek ob izpadu

```bash
# 1. Preveri status
docker-compose ps

# 2. Preveri loge
docker-compose logs --tail=100

# 3. Restart storitev
docker-compose restart omni-server

# 4. Če ne pomaga, polni restart
docker-compose down
docker-compose up -d

# 5. Obnovi iz backup-a (če potrebno)
./restore.sh latest
```

### 2. Kontaktni podatki

```
Primarni admin: [EMAIL]
Backup admin: [EMAIL]
Hosting provider: [KONTAKT]
Domain registrar: [KONTAKT]
SSL provider: [KONTAKT]
```

---

**⚠️ POMEMBNO**: Ta konfiguracija je pripravljena za produkcijsko uporabo, vendar priporočamo dodatno varnostno revizijo s strani strokovnjaka pred zagonom v produkciji.