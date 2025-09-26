#!/bin/bash

# 🚀 OMNI-BRAIN-MAXI-ULTRA One-Click Cloud Deploy Script
# Avtomatska namestitev in konfiguracija v Linux/Ubuntu oblaku

set -e  # Ustavi ob prvi napaki

echo "🚀 Začenjam One-Click Deploy za OMNI-BRAIN-MAXI-ULTRA..."
echo "📅 $(date)"
echo "🖥️  Sistem: $(uname -a)"

# Barve za lepši izpis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcija za logiranje
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Preveri ali je script zagnan kot root
if [[ $EUID -eq 0 ]]; then
   error "Ne zaganjaj tega scripta kot root! Uporabi sudo le kjer je potrebno."
fi

# 1️⃣ Sistemske posodobitve in osnovni paketi
log "🛠 Posodabljam sistem in nameščam zahtevane komponente..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    htop \
    nginx \
    certbot \
    python3-certbot-nginx

# 2️⃣ Namesti Node.js 18.x (LTS)
log "📦 Nameščam Node.js 18.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Preveri verzije
node_version=$(node --version)
npm_version=$(npm --version)
info "Node.js verzija: $node_version"
info "NPM verzija: $npm_version"

# 3️⃣ Namesti PM2 za process management
log "🔄 Nameščam PM2 process manager..."
sudo npm install -g pm2

# 4️⃣ Namesti Docker (opcijsko)
log "🐳 Nameščam Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Dodaj trenutnega uporabnika v docker skupino
sudo usermod -aG docker $USER

# 5️⃣ Namesti MongoDB
log "🗄️ Nameščam MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Zaženi MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# 6️⃣ Namesti Redis
log "🔴 Nameščam Redis..."
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 7️⃣ Kloniraj ali kopiraj OMNI projekt
log "📂 Pripravljam OMNI-BRAIN projekt..."
PROJECT_DIR="/opt/omni-brain"
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Če je git repo dostopen
if [ ! -z "$1" ]; then
    log "📥 Kloniram iz Git repozitorija: $1"
    git clone $1 $PROJECT_DIR
else
    log "📁 Kopiram lokalne datoteke..."
    # Kopiraj trenutni direktorij
    cp -r . $PROJECT_DIR/
fi

cd $PROJECT_DIR

# 8️⃣ Namesti Node.js odvisnosti
log "📦 Nameščam Node.js odvisnosti..."
npm install --production

# 9️⃣ Ustvari potrebne direktorije
log "📁 Ustvarjam potrebne direktorije..."
mkdir -p logs uploads temp certs backups data/memory data/logs data/analytics

# 🔟 Nastavi okoljske spremenljivke
log "🔧 Nastavljam okoljske spremenljivke..."
cat > .env << EOF
# OMNI-BRAIN-MAXI-ULTRA Production Environment
NODE_ENV=production
PORT=3000
WEBSOCKET_PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/omni-brain
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Logging
LOG_LEVEL=info
LOG_FILE=logs/omni-brain.log

# Features
ENABLE_ANALYTICS=true
ENABLE_BACKUP=true
ENABLE_MONITORING=true
ENABLE_SSL=true
ENABLE_OMNI_BRAIN=true

# Omni Brain Configuration
OMNI_BRAIN_ENABLED=true
OMNI_BRAIN_AUTO_SAVE=true
OMNI_BRAIN_SAVE_INTERVAL=300000
OMNI_BRAIN_LEARNING_AGENT=true
OMNI_BRAIN_COMMERCIAL_AGENT=true
OMNI_BRAIN_OPTIMIZATION_AGENT=true
OMNI_BRAIN_REAL_TIME_MONITORING=true

# Cloud Storage (nastavi po potrebi)
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# AWS_REGION=us-east-1
# S3_BUCKET=omni-brain-backups

# Email (nastavi po potrebi)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_app_password

# Domain
DOMAIN=localhost
# DOMAIN=your-domain.com  # Nastavi svoj domain
EOF

# 1️⃣1️⃣ Ustvari systemd service
log "⚙️ Ustvarjam systemd service..."
sudo tee /etc/systemd/system/omni-brain.service > /dev/null << EOF
[Unit]
Description=OMNI-BRAIN-MAXI-ULTRA AI Platform
After=network.target mongod.service redis-server.service
Wants=mongod.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server-modular.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=omni-brain

# Security
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=$PROJECT_DIR

[Install]
WantedBy=multi-user.target
EOF

# 1️⃣2️⃣ Nastavi Nginx reverse proxy
log "🌐 Nastavljam Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/omni-brain > /dev/null << EOF
server {
    listen 80;
    server_name localhost;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name localhost;
    
    # SSL Configuration (self-signed za začetek)
    ssl_certificate /etc/ssl/certs/omni-brain.crt;
    ssl_certificate_key /etc/ssl/private/omni-brain.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files
    location /static/ {
        alias $PROJECT_DIR/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Omogoči site
sudo ln -sf /etc/nginx/sites-available/omni-brain /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 1️⃣3️⃣ Generiraj self-signed SSL certifikat
log "🔒 Generiram SSL certifikat..."
sudo mkdir -p /etc/ssl/private
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/omni-brain.key \
    -out /etc/ssl/certs/omni-brain.crt \
    -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=OMNI-BRAIN/CN=localhost"

# 1️⃣4️⃣ Nastavi avtomatski backup
log "💾 Nastavljam avtomatski backup..."
cat > backup-script.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/omni-brain/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# MongoDB backup
mongodump --db omni-brain --out $BACKUP_DIR/mongo_$DATE

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=backups \
    --exclude=logs \
    /opt/omni-brain

# Obdrži samo zadnjih 7 dni
find $BACKUP_DIR -name "mongo_*" -mtime +7 -exec rm -rf {} \;
find $BACKUP_DIR -name "files_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup-script.sh

# Dodaj v crontab (vsak dan ob 2:00)
(crontab -l 2>/dev/null; echo "0 2 * * * $PROJECT_DIR/backup-script.sh >> $PROJECT_DIR/logs/backup.log 2>&1") | crontab -

# 1️⃣5️⃣ Ustvari monitoring script
log "📊 Ustvarjam monitoring script..."
cat > monitor-script.sh << 'EOF'
#!/bin/bash
LOG_FILE="/opt/omni-brain/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Preveri ali je aplikacija aktivna
if ! pgrep -f "node server-modular.js" > /dev/null; then
    echo "[$DATE] ALERT: OMNI-BRAIN ni aktiven! Poskušam restart..." >> $LOG_FILE
    sudo systemctl restart omni-brain
    sleep 10
    if pgrep -f "node server-modular.js" > /dev/null; then
        echo "[$DATE] SUCCESS: OMNI-BRAIN uspešno restartiran" >> $LOG_FILE
    else
        echo "[$DATE] ERROR: OMNI-BRAIN restart neuspešen!" >> $LOG_FILE
    fi
fi

# Preveri disk space
DISK_USAGE=$(df /opt/omni-brain | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Preveri memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEM_USAGE -gt 85 ]; then
    echo "[$DATE] WARNING: Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi
EOF

chmod +x monitor-script.sh

# Dodaj v crontab (vsakih 5 minut)
(crontab -l 2>/dev/null; echo "*/5 * * * * $PROJECT_DIR/monitor-script.sh") | crontab -

# 1️⃣6️⃣ Nastavi firewall
log "🔥 Nastavljam firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # OMNI-BRAIN
sudo ufw allow 3001/tcp  # WebSocket

# 1️⃣7️⃣ Zaženi vse servise
log "🚀 Zaganjam vse servise..."
sudo systemctl daemon-reload
sudo systemctl enable omni-brain
sudo systemctl start omni-brain
sudo systemctl restart nginx

# 1️⃣8️⃣ Preveri status
log "✅ Preverjam status sistema..."
sleep 5

echo ""
echo "🎉 =================================="
echo "🚀 OMNI-BRAIN-MAXI-ULTRA DEPLOY COMPLETE!"
echo "🎉 =================================="
echo ""

# Status check
if systemctl is-active --quiet omni-brain; then
    echo "✅ OMNI-BRAIN: AKTIVEN"
else
    echo "❌ OMNI-BRAIN: NEAKTIVEN"
fi

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx: AKTIVEN"
else
    echo "❌ Nginx: NEAKTIVEN"
fi

if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB: AKTIVEN"
else
    echo "❌ MongoDB: NEAKTIVEN"
fi

if systemctl is-active --quiet redis-server; then
    echo "✅ Redis: AKTIVEN"
else
    echo "❌ Redis: NEAKTIVEN"
fi

echo ""
echo "🌐 Dostop do aplikacije:"
echo "   HTTP:  http://localhost"
echo "   HTTPS: https://localhost"
echo "   API:   https://localhost/api"
echo ""
echo "📊 Upravljanje:"
echo "   Status:  sudo systemctl status omni-brain"
echo "   Restart: sudo systemctl restart omni-brain"
echo "   Logs:    sudo journalctl -u omni-brain -f"
echo "   Monitor: tail -f $PROJECT_DIR/logs/monitor.log"
echo ""
echo "🔧 Konfiguracija:"
echo "   Env file: $PROJECT_DIR/.env"
echo "   Nginx:    /etc/nginx/sites-available/omni-brain"
echo "   Service:  /etc/systemd/system/omni-brain.service"
echo ""
echo "💾 Backup:"
echo "   Lokacija: $PROJECT_DIR/backups/"
echo "   Schedule: Vsak dan ob 2:00 (crontab)"
echo ""
echo "🔒 Varnost:"
echo "   SSL: Self-signed certifikat (za produkcijo uporabi Let's Encrypt)"
echo "   Firewall: UFW omogočen"
echo "   Ports: 80, 443, 3000, 3001"
echo ""

# Prikaži naslednje korake
echo "📋 NASLEDNJI KORAKI:"
echo "1. Nastavi svoj domain v .env datoteki"
echo "2. Za produkcijo uporabi Let's Encrypt: sudo certbot --nginx"
echo "3. Konfiguriraj email nastavitve v .env"
echo "4. Nastavi cloud storage (AWS S3) za backupe"
echo "5. Preveri logs: tail -f logs/omni-brain.log"
echo ""

warning "POMEMBNO: Spremeni default gesla in API ključe v .env datoteki!"

log "🎯 Deploy končan uspešno! OMNI-BRAIN je pripravljen za uporabo."