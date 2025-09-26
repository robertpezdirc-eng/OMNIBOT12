#!/bin/bash

# OMNI-BRAIN-MAXI-ULTRA Avtomatska Namestitev
# Ready-to-Run Cloud Package Installer

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"localhost"}
OMNI_USER="omni"
OMNI_HOME="/home/omni-cloud-ready"
LOG_FILE="/var/log/omni-install.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a $LOG_FILE
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a $LOG_FILE
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Ta skripta mora biti zagnana kot root (sudo)"
    fi
}

check_os() {
    if [[ ! -f /etc/os-release ]]; then
        error "Nepodprt operacijski sistem"
    fi
    
    . /etc/os-release
    if [[ "$ID" != "ubuntu" ]] && [[ "$ID" != "debian" ]]; then
        warn "Testiran samo na Ubuntu/Debian. Nadaljujem..."
    fi
}

install_dependencies() {
    log "Nameščam sistemske odvisnosti..."
    
    apt update
    apt install -y \
        python3 python3-pip python3-venv python3-dev \
        nginx certbot python3-certbot-nginx \
        redis-server mongodb \
        htop curl wget git unzip \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release
    
    log "Sistemske odvisnosti nameščene ✓"
}

create_user() {
    log "Ustvarjam uporabnika $OMNI_USER..."
    
    if ! id "$OMNI_USER" &>/dev/null; then
        useradd -m -s /bin/bash $OMNI_USER
        usermod -aG sudo $OMNI_USER
        log "Uporabnik $OMNI_USER ustvarjen ✓"
    else
        info "Uporabnik $OMNI_USER že obstaja"
    fi
}

setup_directories() {
    log "Nastavljam direktorije..."
    
    # Ensure correct ownership
    chown -R $OMNI_USER:$OMNI_USER $OMNI_HOME
    
    # Create necessary directories
    mkdir -p /var/log/omni
    mkdir -p /var/cache/nginx/omni
    mkdir -p /home/backups
    mkdir -p /var/www/certbot
    
    chown $OMNI_USER:$OMNI_USER /var/log/omni
    chown www-data:www-data /var/cache/nginx/omni
    chown $OMNI_USER:$OMNI_USER /home/backups
    
    log "Direktoriji nastavljeni ✓"
}

install_python_deps() {
    log "Nameščam Python odvisnosti..."
    
    cd $OMNI_HOME/app
    
    # Create virtual environment
    sudo -u $OMNI_USER python3 -m venv venv
    
    # Create requirements.txt if it doesn't exist
    if [[ ! -f requirements.txt ]]; then
        cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
aioredis==2.0.1
asyncpg==0.29.0
prometheus-client==0.19.0
structlog==23.2.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
httpx==0.25.2
jinja2==3.1.2
motor==3.3.2
pymongo==4.6.0
redis==5.0.1
psutil==5.9.6
pydantic==2.5.0
pydantic-settings==2.1.0
EOF
    fi
    
    # Install dependencies
    sudo -u $OMNI_USER bash -c "source venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"
    
    log "Python odvisnosti nameščene ✓"
}

configure_services() {
    log "Konfiguriram storitve..."
    
    # MongoDB
    systemctl enable mongodb
    systemctl start mongodb
    
    # Redis
    systemctl enable redis-server
    systemctl start redis-server
    
    # Configure MongoDB for production
    if [[ ! -f /etc/mongod.conf.backup ]]; then
        cp /etc/mongod.conf /etc/mongod.conf.backup
        
        cat > /etc/mongod.conf << 'EOF'
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

security:
  authorization: enabled
EOF
        
        systemctl restart mongodb
    fi
    
    log "Storitve konfigurirane ✓"
}

setup_systemd_service() {
    log "Nastavljam systemd servis..."
    
    # Update service file with correct paths
    sed -i "s|/home/omni-cloud-ready|$OMNI_HOME|g" $OMNI_HOME/deploy/omni.service
    
    cp $OMNI_HOME/deploy/omni.service /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable omni.service
    
    log "Systemd servis nastavljen ✓"
}

configure_nginx() {
    log "Konfiguriram Nginx..."
    
    # Update domain in nginx config
    sed -i "s/tvoja-domena.com/$DOMAIN/g" $OMNI_HOME/deploy/nginx.conf
    
    # Backup default config
    if [[ -f /etc/nginx/sites-enabled/default ]]; then
        mv /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup
    fi
    
    # Install our config
    cp $OMNI_HOME/deploy/nginx.conf /etc/nginx/sites-available/omni.conf
    ln -sf /etc/nginx/sites-available/omni.conf /etc/nginx/sites-enabled/
    
    # Test configuration
    nginx -t || error "Nginx konfiguracija ni veljavna"
    
    systemctl restart nginx
    
    log "Nginx konfiguriran ✓"
}

setup_ssl() {
    if [[ "$DOMAIN" != "localhost" ]] && [[ "$DOMAIN" != "127.0.0.1" ]]; then
        log "Nastavljam SSL certifikat za $DOMAIN..."
        
        # Get SSL certificate
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
        
        # Setup auto-renewal
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        
        log "SSL certifikat nastavljen ✓"
    else
        warn "SSL preskočen za localhost/IP naslov"
    fi
}

setup_firewall() {
    log "Nastavljam firewall..."
    
    # Enable UFW if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        ufw --force enable
    fi
    
    # Allow necessary ports
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    
    log "Firewall nastavljen ✓"
}

setup_monitoring() {
    log "Nastavljam monitoring..."
    
    # Create monitoring script
    cat > /usr/local/bin/omni-monitor.sh << 'EOF'
#!/bin/bash
# OMNI-BRAIN Monitoring Script

LOG_FILE="/var/log/omni/monitor.log"
DATE=$(date +'%Y-%m-%d %H:%M:%S')

# Check if service is running
if ! systemctl is-active --quiet omni.service; then
    echo "[$DATE] ERROR: OMNI service is not running" >> $LOG_FILE
    systemctl restart omni.service
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt 90 ]]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [[ $MEM_USAGE -gt 90 ]]; then
    echo "[$DATE] WARNING: Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi

# Check if application responds
if ! curl -f http://localhost:8080/health >/dev/null 2>&1; then
    echo "[$DATE] ERROR: Application health check failed" >> $LOG_FILE
    systemctl restart omni.service
fi
EOF
    
    chmod +x /usr/local/bin/omni-monitor.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/omni-monitor.sh") | crontab -
    
    log "Monitoring nastavljen ✓"
}

setup_backup() {
    log "Nastavljam avtomatski backup..."
    
    cat > /home/omni-cloud-ready/backup.sh << 'EOF'
#!/bin/bash
# OMNI-BRAIN Backup Script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/backups/omni_$DATE"

mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --out $BACKUP_DIR/mongodb 2>/dev/null

# Backup Redis
redis-cli BGSAVE >/dev/null 2>&1
sleep 5
cp /var/lib/redis/dump.rdb $BACKUP_DIR/ 2>/dev/null

# Backup application
tar -czf $BACKUP_DIR/app.tar.gz /home/omni-cloud-ready/ 2>/dev/null

# Backup configuration
tar -czf $BACKUP_DIR/config.tar.gz /etc/nginx/sites-available/omni.conf /etc/systemd/system/omni.service 2>/dev/null

# Clean old backups (older than 7 days)
find /home/backups -name "omni_*" -mtime +7 -exec rm -rf {} \; 2>/dev/null

echo "Backup completed: $BACKUP_DIR"
EOF
    
    chmod +x /home/omni-cloud-ready/backup.sh
    chown $OMNI_USER:$OMNI_USER /home/omni-cloud-ready/backup.sh
    
    # Add to crontab for daily backup at 2 AM
    (crontab -u $OMNI_USER -l 2>/dev/null; echo "0 2 * * * /home/omni-cloud-ready/backup.sh") | crontab -u $OMNI_USER -
    
    log "Avtomatski backup nastavljen ✓"
}

start_services() {
    log "Zaganjam storitve..."
    
    # Start OMNI service
    systemctl start omni.service
    
    # Wait for service to start
    sleep 5
    
    # Check if service is running
    if systemctl is-active --quiet omni.service; then
        log "OMNI servis uspešno zagnan ✓"
    else
        error "OMNI servis se ni uspešno zagnal"
    fi
    
    # Restart nginx to ensure everything is connected
    systemctl restart nginx
    
    log "Vse storitve zagnane ✓"
}

run_tests() {
    log "Izvajam teste..."
    
    # Test local connection
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        log "Lokalni test uspešen ✓"
    else
        warn "Lokalni test neuspešen"
    fi
    
    # Test nginx
    if curl -f http://localhost/health >/dev/null 2>&1; then
        log "Nginx test uspešen ✓"
    else
        warn "Nginx test neuspešen"
    fi
    
    # Test HTTPS (if not localhost)
    if [[ "$DOMAIN" != "localhost" ]] && [[ "$DOMAIN" != "127.0.0.1" ]]; then
        if curl -f https://$DOMAIN/health >/dev/null 2>&1; then
            log "HTTPS test uspešen ✓"
        else
            warn "HTTPS test neuspešen"
        fi
    fi
}

show_summary() {
    echo
    echo -e "${GREEN}🎉 OMNI-BRAIN-MAXI-ULTRA uspešno nameščen!${NC}"
    echo
    echo -e "${BLUE}📊 Povzetek namestitve:${NC}"
    echo -e "   • Domena: $DOMAIN"
    echo -e "   • Uporabnik: $OMNI_USER"
    echo -e "   • Aplikacija: $OMNI_HOME"
    echo -e "   • Logi: /var/log/omni/"
    echo
    echo -e "${BLUE}🌐 Dostopne povezave:${NC}"
    echo -e "   • Aplikacija: http://$DOMAIN"
    if [[ "$DOMAIN" != "localhost" ]] && [[ "$DOMAIN" != "127.0.0.1" ]]; then
        echo -e "   • HTTPS: https://$DOMAIN"
    fi
    echo -e "   • Health check: http://$DOMAIN/health"
    echo -e "   • Metrike: http://$DOMAIN/metrics"
    echo
    echo -e "${BLUE}🔧 Upravljanje:${NC}"
    echo -e "   • Status: sudo systemctl status omni.service"
    echo -e "   • Restart: sudo systemctl restart omni.service"
    echo -e "   • Logi: sudo journalctl -u omni.service -f"
    echo -e "   • Nginx: sudo systemctl status nginx"
    echo
    echo -e "${BLUE}💾 Backup:${NC}"
    echo -e "   • Ročni backup: /home/omni-cloud-ready/backup.sh"
    echo -e "   • Avtomatski: vsak dan ob 2:00"
    echo -e "   • Lokacija: /home/backups/"
    echo
    echo -e "${GREEN}✅ Sistem je pripravljen za produkcijo!${NC}"
    echo
}

# Main installation process
main() {
    log "Začenjam namestitev OMNI-BRAIN-MAXI-ULTRA..."
    
    check_root
    check_os
    
    install_dependencies
    create_user
    setup_directories
    install_python_deps
    configure_services
    setup_systemd_service
    configure_nginx
    setup_ssl
    setup_firewall
    setup_monitoring
    setup_backup
    start_services
    run_tests
    
    show_summary
    
    log "Namestitev končana uspešno! 🚀"
}

# Handle script arguments
if [[ $# -eq 0 ]]; then
    echo "Uporaba: $0 <domena>"
    echo "Primer: $0 example.com"
    echo "Za localhost: $0 localhost"
    exit 1
fi

# Run main installation
main "$@"