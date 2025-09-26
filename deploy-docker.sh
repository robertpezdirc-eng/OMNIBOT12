#!/bin/bash

# 🐳 OMNI-BRAIN-MAXI-ULTRA Docker Deploy Script
# Enostavna containerizirana namestitev z Docker Compose

set -e

echo "🐳 Začenjam Docker Deploy za OMNI-BRAIN-MAXI-ULTRA..."
echo "📅 $(date)"

# Barve
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; exit 1; }
warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

# Parametri
ENVIRONMENT=${1:-production}
DOMAIN=${2:-localhost}
EMAIL=${3:-admin@localhost}

log "🔧 Konfiguracija:"
info "Environment: $ENVIRONMENT"
info "Domain: $DOMAIN"
info "Email: $EMAIL"

# 1️⃣ Preveri Docker in Docker Compose
log "🔍 Preverjam Docker namestitev..."
if ! command -v docker &> /dev/null; then
    error "Docker ni nameščen! Namesti Docker: https://docs.docker.com/get-docker/"
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose ni nameščen! Namesti Docker Compose: https://docs.docker.com/compose/install/"
fi

docker_version=$(docker --version)
compose_version=$(docker-compose --version)
info "Docker: $docker_version"
info "Docker Compose: $compose_version"

# 2️⃣ Ustvari potrebne direktorije
log "📁 Ustvarjam potrebne direktorije..."
directories=(
    "logs/nginx"
    "logs/mongo"
    "logs/backup"
    "data/mongo"
    "data/redis"
    "data/elasticsearch"
    "backups"
    "certs"
    "nginx/sites-prod"
    "monitoring"
    "elasticsearch"
    "kibana"
    "backup"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
    info "Ustvarjen: $dir"
done

# 3️⃣ Generiraj .env datoteko za produkcijo
log "🔐 Generiram production .env datoteko..."
cat > .env.production << EOF
# OMNI-BRAIN-MAXI-ULTRA Production Environment
NODE_ENV=production
DOMAIN=$DOMAIN
ADMIN_EMAIL=$EMAIL

# Database passwords
MONGO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Application secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Monitoring passwords
GRAFANA_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
ELASTIC_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Backup encryption
BACKUP_ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# AWS S3 (nastavi po potrebi)
S3_BUCKET=omni-brain-backups
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Email SMTP (nastavi po potrebi)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EOF

log "✅ .env.production datoteka ustvarjena"

# 4️⃣ Ustvari Nginx konfiguracije
log "🌐 Ustvarjam Nginx konfiguracije..."
cat > nginx/nginx-prod.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    
    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    include /etc/nginx/sites-enabled/*;
}
EOF

cat > nginx/sites-prod/omni-brain.conf << EOF
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/certs/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/live/$DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Main application
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://omni-brain-prod:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        
        # Security headers
        proxy_set_header X-Forwarded-Host \$server_name;
        proxy_set_header X-Forwarded-Server \$host;
    }
    
    # WebSocket
    location /socket.io/ {
        proxy_pass http://omni-brain-prod:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://omni-brain-prod:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Login endpoint with stricter rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://omni-brain-prod:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files with caching
    location /static/ {
        proxy_pass http://omni-brain-prod:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://omni-brain-prod:3000;
        access_log off;
    }
}

# Monitoring services
server {
    listen 443 ssl http2;
    server_name monitoring.$DOMAIN;
    
    ssl_certificate /etc/nginx/certs/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/live/$DOMAIN/privkey.pem;
    
    # Grafana
    location / {
        proxy_pass http://grafana-prod:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Prometheus
    location /prometheus/ {
        proxy_pass http://prometheus-prod:9090/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Kibana
    location /kibana/ {
        proxy_pass http://kibana-prod:5601/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 5️⃣ Ustvari monitoring konfiguracije
log "📊 Ustvarjam monitoring konfiguracije..."
cat > monitoring/prometheus-prod.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "/etc/prometheus/rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'omni-brain'
    static_configs:
      - targets: ['omni-brain-prod:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongo-prod:27017']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-prod:6379']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-prod:80']
EOF

# 6️⃣ Ustvari backup Dockerfile
log "💾 Ustvarjam backup service..."
mkdir -p backup
cat > backup/Dockerfile << 'EOF'
FROM node:18-alpine

RUN apk add --no-cache mongodb-tools redis curl aws-cli

WORKDIR /app

COPY package.json ./
RUN npm install

COPY backup-service.js ./
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
EOF

cat > backup/package.json << 'EOF'
{
  "name": "omni-backup-service",
  "version": "1.0.0",
  "dependencies": {
    "node-cron": "^3.0.2",
    "aws-sdk": "^2.1490.0"
  }
}
EOF

cat > backup/backup-service.js << 'EOF'
const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = '/app/backups';
const RETENTION_DAYS = process.env.BACKUP_RETENTION_DAYS || 7;

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error}`);
                reject(error);
            } else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
}

async function backupMongoDB() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `mongo_${timestamp}`);
    
    console.log(`Starting MongoDB backup: ${backupPath}`);
    
    const command = `mongodump --uri="${process.env.MONGODB_URI}" --out="${backupPath}"`;
    await executeCommand(command);
    
    // Compress backup
    await executeCommand(`tar -czf "${backupPath}.tar.gz" -C "${BACKUP_DIR}" "mongo_${timestamp}"`);
    await executeCommand(`rm -rf "${backupPath}"`);
    
    console.log(`MongoDB backup completed: ${backupPath}.tar.gz`);
    return `${backupPath}.tar.gz`;
}

async function backupRedis() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `redis_${timestamp}.rdb`);
    
    console.log(`Starting Redis backup: ${backupPath}`);
    
    const command = `redis-cli --rdb "${backupPath}" -u "${process.env.REDIS_URL}"`;
    await executeCommand(command);
    
    console.log(`Redis backup completed: ${backupPath}`);
    return backupPath;
}

async function uploadToS3(filePath) {
    if (!process.env.S3_BUCKET) {
        console.log('S3_BUCKET not configured, skipping upload');
        return;
    }
    
    const fileName = path.basename(filePath);
    const s3Key = `omni-brain-backups/${fileName}`;
    
    console.log(`Uploading to S3: ${s3Key}`);
    
    const command = `aws s3 cp "${filePath}" "s3://${process.env.S3_BUCKET}/${s3Key}"`;
    await executeCommand(command);
    
    console.log(`Upload completed: ${s3Key}`);
}

async function cleanupOldBackups() {
    console.log(`Cleaning up backups older than ${RETENTION_DAYS} days`);
    
    const command = `find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete`;
    await executeCommand(command);
    
    const command2 = `find "${BACKUP_DIR}" -name "*.rdb" -mtime +${RETENTION_DAYS} -delete`;
    await executeCommand(command2);
    
    console.log('Cleanup completed');
}

async function performBackup() {
    try {
        console.log('=== Starting backup process ===');
        
        const mongoBackup = await backupMongoDB();
        const redisBackup = await backupRedis();
        
        // Upload to S3 if configured
        await uploadToS3(mongoBackup);
        await uploadToS3(redisBackup);
        
        // Cleanup old backups
        await cleanupOldBackups();
        
        console.log('=== Backup process completed ===');
    } catch (error) {
        console.error('Backup failed:', error);
    }
}

// Schedule backup (default: daily at 2 AM)
const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *';
console.log(`Scheduling backups with cron: ${schedule}`);

cron.schedule(schedule, performBackup);

// Perform initial backup
setTimeout(performBackup, 60000); // Wait 1 minute after startup

console.log('Backup service started');
EOF

cat > backup/entrypoint.sh << 'EOF'
#!/bin/sh
echo "Starting OMNI-BRAIN Backup Service..."
echo "MongoDB URI: ${MONGODB_URI}"
echo "Redis URL: ${REDIS_URL}"
echo "Backup Schedule: ${BACKUP_SCHEDULE}"
echo "Retention Days: ${BACKUP_RETENTION_DAYS}"

# Create backup directory
mkdir -p /app/backups

# Start backup service
node backup-service.js
EOF

# 7️⃣ Zaženi Docker Compose
log "🚀 Zaganjam Docker Compose..."

# Ustavi obstoječe containerje
docker-compose -f docker-compose.production.yml --env-file .env.production down 2>/dev/null || true

# Zgradi slike
log "🔨 Gradim Docker slike..."
docker-compose -f docker-compose.production.yml --env-file .env.production build

# Zaženi servise
log "▶️ Zaganjam servise..."
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# 8️⃣ Počakaj da se servisi zaženejo
log "⏳ Čakam da se servisi zaženejo..."
sleep 30

# 9️⃣ Preveri status
log "✅ Preverjam status containerjev..."
docker-compose -f docker-compose.production.yml --env-file .env.production ps

echo ""
echo "🎉 =================================="
echo "🐳 DOCKER DEPLOY COMPLETE!"
echo "🎉 =================================="
echo ""

# Prikaži dostopne URL-je
echo "🌐 Dostopni servisi:"
echo "   OMNI-BRAIN:    https://$DOMAIN"
echo "   Monitoring:    https://monitoring.$DOMAIN"
echo "   Grafana:       http://localhost:3002"
echo "   Prometheus:    http://localhost:9090"
echo "   Kibana:        http://localhost:5601"
echo "   Elasticsearch: http://localhost:9200"
echo ""

echo "🔐 Gesla (shranjena v .env.production):"
echo "   Grafana:       \$(grep GRAFANA_PASSWORD .env.production | cut -d= -f2)"
echo "   Elasticsearch: \$(grep ELASTIC_PASSWORD .env.production | cut -d= -f2)"
echo ""

echo "📊 Upravljanje:"
echo "   Status:   docker-compose -f docker-compose.production.yml ps"
echo "   Logs:     docker-compose -f docker-compose.production.yml logs -f"
echo "   Restart:  docker-compose -f docker-compose.production.yml restart"
echo "   Stop:     docker-compose -f docker-compose.production.yml down"
echo ""

echo "🔒 SSL Certifikat:"
echo "   Za produkcijo zaženi: docker-compose -f docker-compose.production.yml run --rm certbot-prod"
echo ""

warning "POMEMBNO: Nastavi AWS S3 credentials v .env.production za backup!"
warning "POMEMBNO: Nastavi SMTP nastavitve za email obvestila!"

log "🎯 Docker deploy končan uspešno!"