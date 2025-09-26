#!/bin/bash

# ============================================================================
# THREO CLOUD MIGRATION - Takojšnja implementacija
# Avtomatska migracija Omni aplikacije v oblačno okolje
# ============================================================================

set -e  # Ustavi ob prvi napaki

# Barve za izpis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcije za izpis
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Preveri ali je skripta zagnana kot root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Ta skripta mora biti zagnana kot root (sudo)"
        exit 1
    fi
}

# Pridobi domeno od uporabnika
get_domain() {
    if [ -z "$DOMAIN" ]; then
        read -p "Vnesite vašo domeno (npr. moja-domena.com): " DOMAIN
    fi
    
    if [ -z "$DOMAIN" ]; then
        log_error "Domena je obvezna!"
        exit 1
    fi
    
    log_info "Nastavljam domeno: $DOMAIN"
}

# Pridobi email za SSL certifikat
get_email() {
    if [ -z "$EMAIL" ]; then
        read -p "Vnesite vaš email za SSL certifikat: " EMAIL
    fi
    
    if [ -z "$EMAIL" ]; then
        log_error "Email je obvezen za SSL certifikat!"
        exit 1
    fi
    
    log_info "Nastavljam email: $EMAIL"
}

# Posodobi sistem
update_system() {
    log_info "Posodabljam sistem..."
    apt update && apt upgrade -y
    log_success "Sistem posodobljen"
}

# Namesti potrebne odvisnosti
install_dependencies() {
    log_info "Nameščam potrebne odvisnosti..."
    
    # Osnovni paketi
    apt install -y curl wget git unzip software-properties-common
    
    # Python 3 in pip
    apt install -y python3 python3-pip python3-venv python3-dev
    
    # Node.js in npm
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Nginx
    apt install -y nginx
    
    # Certbot za SSL
    apt install -y certbot python3-certbot-nginx
    
    # Dodatni paketi
    apt install -y htop tree supervisor sqlite3 redis-server
    
    log_success "Vse odvisnosti nameščene"
}

# Ustvari uporabnika omni
create_omni_user() {
    log_info "Ustvarjam uporabnika omni..."
    
    if ! id "omni" &>/dev/null; then
        useradd -m -s /bin/bash omni
        usermod -aG sudo omni
        log_success "Uporabnik omni ustvarjen"
    else
        log_info "Uporabnik omni že obstaja"
    fi
}

# Ustvari direktorije
create_directories() {
    log_info "Ustvarjam potrebne direktorije..."
    
    mkdir -p /opt/omni
    mkdir -p /var/log/omni
    mkdir -p /var/lib/omni/backups
    mkdir -p /etc/omni
    
    chown -R omni:omni /opt/omni
    chown -R omni:omni /var/log/omni
    chown -R omni:omni /var/lib/omni
    
    log_success "Direktoriji ustvarjeni"
}

# Prenesi Omni aplikacijo
download_omni() {
    log_info "Prenašam Omni aplikacijo..."
    
    cd /opt/omni
    
    # Če obstaja git repozitorij, ga kloniraj
    if [ ! -z "$GIT_REPO" ]; then
        git clone $GIT_REPO .
    else
        # Sicer prenesi iz trenutnega direktorija
        log_info "Kopiram lokalne datoteke..."
        cp -r /tmp/omni-source/* . 2>/dev/null || true
    fi
    
    chown -R omni:omni /opt/omni
    log_success "Omni aplikacija prenesena"
}

# Nastavi Python virtualno okolje
setup_python_env() {
    log_info "Nastavljam Python virtualno okolje..."
    
    cd /opt/omni
    sudo -u omni python3 -m venv venv
    sudo -u omni ./venv/bin/pip install --upgrade pip
    
    # Namesti Python odvisnosti
    if [ -f "requirements.txt" ]; then
        sudo -u omni ./venv/bin/pip install -r requirements.txt
    fi
    
    log_success "Python okolje nastavljeno"
}

# Nastavi Node.js odvisnosti
setup_node_env() {
    log_info "Nastavljam Node.js okolje..."
    
    cd /opt/omni
    
    if [ -f "package.json" ]; then
        sudo -u omni npm install
        sudo -u omni npm run build 2>/dev/null || true
    fi
    
    log_success "Node.js okolje nastavljeno"
}

# Konfiguriraj Nginx
configure_nginx() {
    log_info "Konfiguriram Nginx..."
    
    # Ustvari Nginx konfiguracijsko datoteko
    cat > /etc/nginx/sites-available/omni << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration (bo nastavljeno s certbot)
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:8080;
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
    
    # Angel API endpoints
    location /api/angel/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Monitoring dashboard
    location /monitoring/ {
        proxy_pass http://127.0.0.1:5003;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files
    location /static/ {
        alias /opt/omni/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Omogoči site
    ln -sf /etc/nginx/sites-available/omni /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Testiraj konfiguracijsko datoteko
    nginx -t
    
    log_success "Nginx konfiguriran"
}

# Pridobi SSL certifikat
setup_ssl() {
    log_info "Pridobivam SSL certifikat..."
    
    # Zaženi nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Pridobi certifikat
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL
    
    # Nastavi avtomatsko podaljševanje
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
    
    log_success "SSL certifikat pridobljen in nastavljen"
}

# Ustvari systemd storitve
create_systemd_services() {
    log_info "Ustvarjam systemd storitve..."
    
    # Glavna Omni storitev
    cat > /etc/systemd/system/omni.service << EOF
[Unit]
Description=Omni AI Platform
After=network.target

[Service]
Type=simple
User=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin
ExecStart=/opt/omni/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=omni

[Install]
WantedBy=multi-user.target
EOF

    # Angel Integration System
    cat > /etc/systemd/system/angel-integration.service << EOF
[Unit]
Description=Angel Integration System
After=network.target

[Service]
Type=simple
User=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin
ExecStart=/opt/omni/venv/bin/python angel-integration-system.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=angel-integration

[Install]
WantedBy=multi-user.target
EOF

    # Angel Task Distribution
    cat > /etc/systemd/system/angel-tasks.service << EOF
[Unit]
Description=Angel Task Distribution System
After=network.target

[Service]
Type=simple
User=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin
ExecStart=/opt/omni/venv/bin/python angel-task-distribution-system.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=angel-tasks

[Install]
WantedBy=multi-user.target
EOF

    # Angel Monitoring
    cat > /etc/systemd/system/angel-monitoring.service << EOF
[Unit]
Description=Angel Monitoring System
After=network.target

[Service]
Type=simple
User=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin
ExecStart=/opt/omni/venv/bin/python angel-monitoring-system.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=angel-monitoring

[Install]
WantedBy=multi-user.target
EOF

    # Angel Synchronization
    cat > /etc/systemd/system/angel-sync.service << EOF
[Unit]
Description=Angel Synchronization Module
After=network.target

[Service]
Type=simple
User=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin
ExecStart=/opt/omni/venv/bin/python angel-synchronization-module.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=angel-sync

[Install]
WantedBy=multi-user.target
EOF

    # Backup storitev
    cat > /etc/systemd/system/omni-backup.service << EOF
[Unit]
Description=Omni Backup System
After=network.target

[Service]
Type=simple
User=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin
ExecStart=/opt/omni/venv/bin/python omni-backup-monitoring.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=omni-backup

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    systemctl daemon-reload
    
    log_success "Systemd storitve ustvarjene"
}

# Zaženi storitve
start_services() {
    log_info "Zaganjam storitve..."
    
    # Zaženi in omogoči storitve
    systemctl enable omni
    systemctl enable angel-integration
    systemctl enable angel-tasks
    systemctl enable angel-monitoring
    systemctl enable angel-sync
    systemctl enable omni-backup
    
    systemctl start omni
    systemctl start angel-integration
    systemctl start angel-tasks
    systemctl start angel-monitoring
    systemctl start angel-sync
    systemctl start omni-backup
    
    # Restart nginx
    systemctl restart nginx
    
    log_success "Vse storitve zagnane"
}

# Nastavi backup sistem
setup_backup_system() {
    log_info "Nastavljam backup sistem..."
    
    # Ustvari backup skripto
    cat > /opt/omni/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/lib/omni/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="omni_backup_$DATE"

# Ustvari backup direktorij
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup aplikacije
tar -czf "$BACKUP_DIR/$BACKUP_NAME/app.tar.gz" -C /opt/omni .

# Backup baz podatkov
cp /opt/omni/*.db "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true

# Backup konfiguracijskih datotek
cp -r /etc/omni "$BACKUP_DIR/$BACKUP_NAME/config" 2>/dev/null || true

# Počisti stare backupe (obdrži zadnjih 7 dni)
find "$BACKUP_DIR" -type d -name "omni_backup_*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

echo "Backup completed: $BACKUP_NAME"
EOF

    chmod +x /opt/omni/backup.sh
    chown omni:omni /opt/omni/backup.sh
    
    # Dodaj v crontab
    echo "0 2 * * * /opt/omni/backup.sh" | sudo -u omni crontab -
    
    log_success "Backup sistem nastavljen"
}

# Validiraj migracijo
validate_migration() {
    log_info "Validiram migracijo..."
    
    # Preveri SSL certifikat
    if curl -s -I https://$DOMAIN | grep -q "200 OK"; then
        log_success "SSL certifikat deluje"
    else
        log_warning "SSL certifikat morda ne deluje pravilno"
    fi
    
    # Preveri storitve
    services=("omni" "angel-integration" "angel-tasks" "angel-monitoring" "angel-sync" "nginx")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet $service; then
            log_success "Storitev $service deluje"
        else
            log_error "Storitev $service ne deluje!"
        fi
    done
    
    # Preveri porte
    if netstat -tlnp | grep -q ":8080"; then
        log_success "Omni aplikacija deluje na portu 8080"
    else
        log_warning "Omni aplikacija morda ne deluje na portu 8080"
    fi
    
    if netstat -tlnp | grep -q ":443"; then
        log_success "HTTPS deluje na portu 443"
    else
        log_warning "HTTPS morda ne deluje na portu 443"
    fi
    
    log_success "Validacija končana"
}

# Prikaži končno poročilo
show_final_report() {
    echo ""
    echo "============================================================================"
    log_success "THREO CLOUD MIGRATION USPEŠNO KONČANA!"
    echo "============================================================================"
    echo ""
    echo -e "${GREEN}🌐 Omni je zdaj v oblaku na: https://$DOMAIN${NC}"
    echo ""
    echo "📊 Dostopne storitve:"
    echo "  • Glavna aplikacija: https://$DOMAIN"
    echo "  • Angel API: https://$DOMAIN/api/angel/"
    echo "  • Monitoring: https://$DOMAIN/monitoring/"
    echo ""
    echo "🔧 Sistemske storitve:"
    echo "  • SSL šifriranje: Aktivno z avtomatskim podaljševanjem"
    echo "  • Backup sistem: Dnevni backupi ob 2:00"
    echo "  • Monitoring: Real-time spremljanje"
    echo "  • Avtomatski restart: Systemd storitve"
    echo ""
    echo "👼 Aktivni Angel sistemi:"
    echo "  • Angel Integration System (port 5000)"
    echo "  • Angel Task Distribution (port 5001)"
    echo "  • Angel Monitoring (port 5003)"
    echo "  • Angel Synchronization (port 5004)"
    echo ""
    echo "📝 Upravljanje:"
    echo "  • Preveri status: systemctl status omni"
    echo "  • Oglej si loge: journalctl -u omni -f"
    echo "  • Restart: systemctl restart omni"
    echo ""
    echo "============================================================================"
}

# Glavna funkcija
main() {
    log_info "Začenjam THREO CLOUD MIGRATION..."
    
    check_root
    get_domain
    get_email
    
    update_system
    install_dependencies
    create_omni_user
    create_directories
    download_omni
    setup_python_env
    setup_node_env
    configure_nginx
    setup_ssl
    create_systemd_services
    setup_backup_system
    start_services
    
    sleep 10  # Počakaj, da se storitve zaženejo
    
    validate_migration
    show_final_report
    
    log_success "Migracija uspešno končana!"
}

# Zaženi glavno funkcijo
main "$@"