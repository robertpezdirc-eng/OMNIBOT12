#!/bin/bash
# 🌐 OMNI CLOUD DEPLOYMENT SCRIPT
# Avtomatska namestitev Omni-Brain platforme na oblačni strežnik
# Integracija s Threo SSL sistemom za HTTPS

set -e  # Ustavi ob napaki

# Konfiguracija
OMNI_VERSION="1.0.0"
DOMAIN=""
EMAIL=""
GITHUB_REPO="https://github.com/your-repo/omniscient-ai-platform.git"
INSTALL_DIR="/opt/omni-brain"
SERVICE_USER="omni"
LOG_FILE="/var/log/omni-deploy.log"

# Barve za izpis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging funkcija
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Preveri root pravice
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Ta skripta mora biti zagnana kot root (sudo)"
    fi
}

# Preberi konfiguracije
read_config() {
    echo "🌐 OMNI CLOUD DEPLOYMENT"
    echo "======================="
    
    if [[ -z "$DOMAIN" ]]; then
        read -p "Vnesite domeno (npr. omni.mydomain.com): " DOMAIN
        if [[ -z "$DOMAIN" ]]; then
            error "Domena je obvezna!"
        fi
    fi
    
    if [[ -z "$EMAIL" ]]; then
        read -p "Vnesite email za SSL certifikat: " EMAIL
        if [[ -z "$EMAIL" ]]; then
            error "Email je obvezen!"
        fi
    fi
    
    log "Konfiguracija:"
    log "  Domena: $DOMAIN"
    log "  Email: $EMAIL"
    log "  Namestitev v: $INSTALL_DIR"
}

# Preveri sistemske zahteve
check_system_requirements() {
    log "🔍 Preverjam sistemske zahteve..."
    
    # Preveri OS
    if [[ ! -f /etc/os-release ]]; then
        error "Nepodprt operacijski sistem"
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]] && [[ "$ID" != "debian" ]]; then
        warning "Priporočen je Ubuntu/Debian, zaznan: $ID"
    fi
    
    # Preveri RAM
    RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $RAM_GB -lt 2 ]]; then
        warning "Priporočeno je vsaj 4GB RAM, zaznano: ${RAM_GB}GB"
    fi
    
    # Preveri disk prostor
    DISK_GB=$(df / | awk 'NR==2{print int($4/1024/1024)}')
    if [[ $DISK_GB -lt 10 ]]; then
        error "Potrebno je vsaj 20GB prostora, na voljo: ${DISK_GB}GB"
    fi
    
    log "✅ Sistemske zahteve izpolnjene"
}

# Posodobi sistem
update_system() {
    log "📦 Posodabljam sistem..."
    
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get upgrade -y
    
    log "✅ Sistem posodobljen"
}

# Namesti osnovne pakete
install_base_packages() {
    log "📦 Nameščam osnovne pakete..."
    
    apt-get install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        htop \
        nano \
        vim
    
    log "✅ Osnovni paketi nameščeni"
}

# Namesti Node.js
install_nodejs() {
    log "📦 Nameščam Node.js..."
    
    # Dodaj NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Preveri namestitev
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    log "✅ Node.js nameščen: $NODE_VERSION"
    log "✅ npm nameščen: $NPM_VERSION"
}

# Namesti Python
install_python() {
    log "📦 Nameščam Python..."
    
    apt-get install -y \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        build-essential
    
    # Ustvari simbolno povezavo
    if [[ ! -f /usr/bin/python ]]; then
        ln -s /usr/bin/python3 /usr/bin/python
    fi
    
    PYTHON_VERSION=$(python3 --version)
    log "✅ Python nameščen: $PYTHON_VERSION"
}

# Namesti Nginx
install_nginx() {
    log "📦 Nameščam Nginx..."
    
    apt-get install -y nginx
    
    # Omogoči in zaženi Nginx
    systemctl enable nginx
    systemctl start nginx
    
    log "✅ Nginx nameščen in zagnan"
}

# Konfiguriraj vatrozid
configure_firewall() {
    log "🔥 Konfiguriram vatrozid..."
    
    # Osnovne UFW nastavitve
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    # Dovoli SSH, HTTP, HTTPS
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Dovoli Omni porte (če potrebno)
    ufw allow 3000/tcp
    ufw allow 8080/tcp
    
    # Omogoči UFW
    ufw --force enable
    
    log "✅ Vatrozid konfiguriran"
}

# Ustvari uporabnika za Omni
create_omni_user() {
    log "👤 Ustvarjam uporabnika za Omni..."
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -s /bin/bash -d "$INSTALL_DIR" -m "$SERVICE_USER"
        log "✅ Uporabnik $SERVICE_USER ustvarjen"
    else
        log "ℹ️ Uporabnik $SERVICE_USER že obstaja"
    fi
}

# Prenesi Omni kodo
download_omni() {
    log "📥 Prenašam Omni kodo..."
    
    # Ustvari namestni direktorij
    mkdir -p "$INSTALL_DIR"
    
    # Kloniraj repository (ali kopiraj lokalne datoteke)
    if [[ -n "$GITHUB_REPO" ]]; then
        git clone "$GITHUB_REPO" "$INSTALL_DIR/app"
    else
        # Kopiraj trenutni direktorij
        cp -r "$(pwd)" "$INSTALL_DIR/app"
    fi
    
    # Nastavi lastništvo
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    
    log "✅ Omni koda prenesena"
}

# Namesti Omni odvisnosti
install_omni_dependencies() {
    log "📦 Nameščam Omni odvisnosti..."
    
    cd "$INSTALL_DIR/app"
    
    # Node.js odvisnosti
    if [[ -f package.json ]]; then
        sudo -u "$SERVICE_USER" npm install --production
        log "✅ Node.js odvisnosti nameščene"
    fi
    
    # Python odvisnosti
    if [[ -f requirements.txt ]]; then
        sudo -u "$SERVICE_USER" python3 -m venv venv
        sudo -u "$SERVICE_USER" ./venv/bin/pip install -r requirements.txt
        log "✅ Python odvisnosti nameščene"
    fi
}

# Konfiguriraj Nginx za Omni
configure_nginx() {
    log "🌐 Konfiguriram Nginx za Omni..."
    
    # Ustvari Nginx konfiguracijsko datoteko
    cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Začasna preusmeritev za SSL setup
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL certifikati (bodo nastavljeni s Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL varnostne nastavitve
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Proxy za Omni aplikacijo
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
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket podpora
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Omogoči site
    ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/"
    
    # Odstrani default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Testiraj Nginx konfiguraciju
    nginx -t
    
    log "✅ Nginx konfiguriran za $DOMAIN"
}

# Namesti SSL certifikat s Threo
install_ssl_certificate() {
    log "🔐 Nameščam SSL certifikat s Threo..."
    
    # Prenesi Threo SSL skripto
    if [[ ! -f "$INSTALL_DIR/threo-universal-ssl.py" ]]; then
        wget -O "$INSTALL_DIR/threo-universal-ssl.py" \
            "https://raw.githubusercontent.com/your-repo/threo-ssl/main/threo-universal-ssl.py"
    fi
    
    # Zaženi Threo SSL
    cd "$INSTALL_DIR"
    echo -e "$DOMAIN\n$EMAIL" | python3 threo-universal-ssl.py
    
    # Ponovno naloži Nginx
    systemctl reload nginx
    
    log "✅ SSL certifikat nameščen"
}

# Ustvari systemd service
create_systemd_service() {
    log "⚙️ Ustvarjam systemd service..."
    
    cat > "/etc/systemd/system/omni-brain.service" << EOF
[Unit]
Description=Omni-Brain AI Platform
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR/app
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=omni-brain

[Install]
WantedBy=multi-user.target
EOF
    
    # Ponovno naloži systemd
    systemctl daemon-reload
    systemctl enable omni-brain
    
    log "✅ Systemd service ustvarjen"
}

# Zaženi Omni
start_omni() {
    log "🚀 Zaganjam Omni..."
    
    # Zaženi Omni service
    systemctl start omni-brain
    
    # Preveri status
    sleep 5
    if systemctl is-active --quiet omni-brain; then
        log "✅ Omni uspešno zagnan"
    else
        error "❌ Napaka pri zagonu Omni"
    fi
}

# Nastavi monitoring
setup_monitoring() {
    log "📊 Nastavljam monitoring..."
    
    # Ustvari log rotation
    cat > "/etc/logrotate.d/omni-brain" << EOF
/var/log/omni-brain.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_USER
    postrotate
        systemctl reload omni-brain
    endscript
}
EOF
    
    # Ustvari health check skripto
    cat > "$INSTALL_DIR/health-check.sh" << 'EOF'
#!/bin/bash
# Omni Health Check

DOMAIN="$1"
if [[ -z "$DOMAIN" ]]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

# Preveri HTTP odziv
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN")
if [[ "$HTTP_STATUS" == "200" ]]; then
    echo "✅ Omni je dostopen (HTTP $HTTP_STATUS)"
    exit 0
else
    echo "❌ Omni ni dostopen (HTTP $HTTP_STATUS)"
    exit 1
fi
EOF
    
    chmod +x "$INSTALL_DIR/health-check.sh"
    
    log "✅ Monitoring nastavljen"
}

# Ustvari backup skripto
create_backup_script() {
    log "💾 Ustvarjam backup skripto..."
    
    cat > "$INSTALL_DIR/backup.sh" << EOF
#!/bin/bash
# Omni Backup Script

BACKUP_DIR="/opt/omni-backups"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/omni-backup-\$DATE.tar.gz"

# Ustvari backup direktorij
mkdir -p "\$BACKUP_DIR"

# Ustvari backup
tar -czf "\$BACKUP_FILE" \\
    --exclude="node_modules" \\
    --exclude="*.log" \\
    --exclude=".git" \\
    "$INSTALL_DIR/app"

# Obdrži samo zadnjih 7 backupov
find "\$BACKUP_DIR" -name "omni-backup-*.tar.gz" -mtime +7 -delete

echo "Backup ustvarjen: \$BACKUP_FILE"
EOF
    
    chmod +x "$INSTALL_DIR/backup.sh"
    
    # Dodaj v crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * $INSTALL_DIR/backup.sh") | crontab -
    
    log "✅ Backup skripta ustvarjena"
}

# Prikaži povzetek
show_summary() {
    log "🎉 OMNI CLOUD DEPLOYMENT KONČAN!"
    echo ""
    echo "📋 POVZETEK NAMESTITVE"
    echo "======================"
    echo "🌐 Domena: https://$DOMAIN"
    echo "📁 Namestitev: $INSTALL_DIR"
    echo "👤 Uporabnik: $SERVICE_USER"
    echo "🔐 SSL: Let's Encrypt (avtomatsko obnavljanje)"
    echo "📊 Monitoring: systemctl status omni-brain"
    echo "💾 Backup: $INSTALL_DIR/backup.sh"
    echo "🔍 Health check: $INSTALL_DIR/health-check.sh $DOMAIN"
    echo ""
    echo "📝 UPORABNI UKAZI:"
    echo "  systemctl status omni-brain    # Preveri status"
    echo "  systemctl restart omni-brain   # Ponovno zaženi"
    echo "  journalctl -u omni-brain -f    # Poglej log"
    echo "  nginx -t && systemctl reload nginx  # Ponovno naloži Nginx"
    echo ""
    echo "🎯 Omni je sedaj dostopen na: https://$DOMAIN"
}

# Glavna funkcija
main() {
    log "🚀 Začenjam Omni Cloud Deployment..."
    
    check_root
    read_config
    check_system_requirements
    update_system
    install_base_packages
    install_nodejs
    install_python
    install_nginx
    configure_firewall
    create_omni_user
    download_omni
    install_omni_dependencies
    configure_nginx
    install_ssl_certificate
    create_systemd_service
    start_omni
    setup_monitoring
    create_backup_script
    show_summary
    
    log "✅ Omni Cloud Deployment uspešno končan!"
}

# Zaženi glavno funkcijo
main "$@"