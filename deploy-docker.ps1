# 🐳 OMNI-BRAIN-MAXI-ULTRA Docker Deploy Script (PowerShell)
# Enostavna containerizirana namestitev z Docker Compose

param(
    [string]$Environment = "production",
    [string]$Domain = "localhost",
    [string]$Email = "admin@localhost"
)

$ErrorActionPreference = "Stop"

Write-Host "🐳 Začenjam Docker Deploy za OMNI-BRAIN-MAXI-ULTRA..." -ForegroundColor Green
Write-Host "📅 $(Get-Date)" -ForegroundColor Blue

function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

Write-Log "🔧 Konfiguracija:"
Write-Info "Environment: $Environment"
Write-Info "Domain: $Domain"
Write-Info "Email: $Email"

# 1️⃣ Preveri Docker in Docker Compose
Write-Log "🔍 Preverjam Docker namestitev..."

try {
    $dockerVersion = docker --version
    Write-Info "Docker: $dockerVersion"
} catch {
    Write-Error-Custom "Docker ni nameščen! Namesti Docker Desktop: https://docs.docker.com/desktop/windows/"
}

try {
    $composeVersion = docker-compose --version
    Write-Info "Docker Compose: $composeVersion"
} catch {
    Write-Error-Custom "Docker Compose ni nameščen! Namesti Docker Desktop z Docker Compose."
}

# 2️⃣ Ustvari potrebne direktorije
Write-Log "📁 Ustvarjam potrebne direktorije..."

$directories = @(
    "logs\nginx",
    "logs\mongo",
    "logs\backup",
    "data\mongo",
    "data\redis",
    "data\elasticsearch",
    "backups",
    "certs",
    "nginx\sites-prod",
    "monitoring",
    "elasticsearch",
    "kibana",
    "backup"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Info "Ustvarjen: $dir"
    }
}

# 3️⃣ Generiraj .env datoteko za produkcijo
Write-Log "🔐 Generiram production .env datoteko..."

function Generate-RandomString {
    param([int]$Length = 25)
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $random = 1..$Length | ForEach-Object { Get-Random -Maximum $chars.length }
    return ($random | ForEach-Object { $chars[$_] }) -join ''
}

$mongoPassword = Generate-RandomString
$redisPassword = Generate-RandomString
$jwtSecret = Generate-RandomString -Length 50
$sessionSecret = Generate-RandomString -Length 50
$encryptionKey = Generate-RandomString
$grafanaPassword = Generate-RandomString
$elasticPassword = Generate-RandomString
$backupEncryptionKey = Generate-RandomString

$envContent = @"
# OMNI-BRAIN-MAXI-ULTRA Production Environment
NODE_ENV=production
DOMAIN=$Domain
ADMIN_EMAIL=$Email

# Database passwords
MONGO_PASSWORD=$mongoPassword
REDIS_PASSWORD=$redisPassword

# Application secrets
JWT_SECRET=$jwtSecret
SESSION_SECRET=$sessionSecret
ENCRYPTION_KEY=$encryptionKey

# Monitoring passwords
GRAFANA_PASSWORD=$grafanaPassword
ELASTIC_PASSWORD=$elasticPassword

# Backup encryption
BACKUP_ENCRYPTION_KEY=$backupEncryptionKey

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
"@

$envContent | Out-File -FilePath ".env.production" -Encoding UTF8
Write-Log "✅ .env.production datoteka ustvarjena"

# 4️⃣ Ustvari Nginx konfiguracije
Write-Log "🌐 Ustvarjam Nginx konfiguracije..."

$nginxConfig = @'
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
'@

$nginxConfig | Out-File -FilePath "nginx\nginx-prod.conf" -Encoding UTF8

$siteConfig = @"
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name $Domain www.$Domain;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://`$server_name`$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $Domain www.$Domain;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/certs/live/$Domain/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/live/$Domain/privkey.pem;
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
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
        proxy_read_timeout 86400;
        
        # Security headers
        proxy_set_header X-Forwarded-Host `$server_name;
        proxy_set_header X-Forwarded-Server `$host;
    }
    
    # WebSocket
    location /socket.io/ {
        proxy_pass http://omni-brain-prod:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://omni-brain-prod:3000;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }
    
    # Login endpoint with stricter rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://omni-brain-prod:3000;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
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
    server_name monitoring.$Domain;
    
    ssl_certificate /etc/nginx/certs/live/$Domain/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/live/$Domain/privkey.pem;
    
    # Grafana
    location / {
        proxy_pass http://grafana-prod:3000;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }
    
    # Prometheus
    location /prometheus/ {
        proxy_pass http://prometheus-prod:9090/;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }
    
    # Kibana
    location /kibana/ {
        proxy_pass http://kibana-prod:5601/;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }
}
"@

$siteConfig | Out-File -FilePath "nginx\sites-prod\omni-brain.conf" -Encoding UTF8

# 5️⃣ Ustvari monitoring konfiguracije
Write-Log "📊 Ustvarjam monitoring konfiguracije..."

$prometheusConfig = @'
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
'@

$prometheusConfig | Out-File -FilePath "monitoring\prometheus-prod.yml" -Encoding UTF8

# 6️⃣ Ustvari backup service
Write-Log "💾 Ustvarjam backup service..."

$backupDockerfile = @'
FROM node:18-alpine

RUN apk add --no-cache mongodb-tools redis curl aws-cli

WORKDIR /app

COPY package.json ./
RUN npm install

COPY backup-service.js ./
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
'@

$backupDockerfile | Out-File -FilePath "backup\Dockerfile" -Encoding UTF8

$backupPackageJson = @'
{
  "name": "omni-backup-service",
  "version": "1.0.0",
  "dependencies": {
    "node-cron": "^3.0.2",
    "aws-sdk": "^2.1490.0"
  }
}
'@

$backupPackageJson | Out-File -FilePath "backup\package.json" -Encoding UTF8

# 7️⃣ Zaženi Docker Compose
Write-Log "🚀 Zaganjam Docker Compose..."

# Ustavi obstoječe containerje
try {
    docker-compose -f docker-compose.production.yml --env-file .env.production down 2>$null
} catch {
    Write-Info "Ni obstoječih containerjev za ustavitev"
}

# Zgradi slike
Write-Log "🔨 Gradim Docker slike..."
docker-compose -f docker-compose.production.yml --env-file .env.production build

# Zaženi servise
Write-Log "▶️ Zaganjam servise..."
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# 8️⃣ Počakaj da se servisi zaženejo
Write-Log "⏳ Čakam da se servisi zaženejo..."
Start-Sleep -Seconds 30

# 9️⃣ Preveri status
Write-Log "✅ Preverjam status containerjev..."
docker-compose -f docker-compose.production.yml --env-file .env.production ps

Write-Host ""
Write-Host "🎉 ==================================" -ForegroundColor Green
Write-Host "🐳 DOCKER DEPLOY COMPLETE!" -ForegroundColor Green
Write-Host "🎉 ==================================" -ForegroundColor Green
Write-Host ""

# Prikaži dostopne URL-je
Write-Host "🌐 Dostopni servisi:" -ForegroundColor Cyan
Write-Host "   OMNI-BRAIN:    https://$Domain" -ForegroundColor White
Write-Host "   Monitoring:    https://monitoring.$Domain" -ForegroundColor White
Write-Host "   Grafana:       http://localhost:3002" -ForegroundColor White
Write-Host "   Prometheus:    http://localhost:9090" -ForegroundColor White
Write-Host "   Kibana:        http://localhost:5601" -ForegroundColor White
Write-Host "   Elasticsearch: http://localhost:9200" -ForegroundColor White
Write-Host ""

Write-Host "🔐 Gesla (shranjena v .env.production):" -ForegroundColor Cyan
Write-Host "   Grafana:       $grafanaPassword" -ForegroundColor White
Write-Host "   Elasticsearch: $elasticPassword" -ForegroundColor White
Write-Host ""

Write-Host "📊 Upravljanje:" -ForegroundColor Cyan
Write-Host "   Status:   docker-compose -f docker-compose.production.yml ps" -ForegroundColor White
Write-Host "   Logs:     docker-compose -f docker-compose.production.yml logs -f" -ForegroundColor White
Write-Host "   Restart:  docker-compose -f docker-compose.production.yml restart" -ForegroundColor White
Write-Host "   Stop:     docker-compose -f docker-compose.production.yml down" -ForegroundColor White
Write-Host ""

Write-Host "🔒 SSL Certifikat:" -ForegroundColor Cyan
Write-Host "   Za produkcijo zaženi: docker-compose -f docker-compose.production.yml run --rm certbot-prod" -ForegroundColor White
Write-Host ""

Write-Warning-Custom "POMEMBNO: Nastavi AWS S3 credentials v .env.production za backup!"
Write-Warning-Custom "POMEMBNO: Nastavi SMTP nastavitve za email obvestila!"

Write-Log "🎯 Docker deploy končan uspešno!"