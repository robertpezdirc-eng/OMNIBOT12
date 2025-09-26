#!/bin/bash

# 🔐 OMNI-BRAIN SSL Setup Script
# Avtomatska namestitev in konfiguracija SSL certifikatov z Let's Encrypt

set -e

# 🎨 Barvni izpisi
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 📋 Konfiguracija
DOMAIN=""
EMAIL=""
WEBROOT_PATH="/var/www/html"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
SSL_PATH="/etc/ssl/omni-brain"
BACKUP_PATH="/opt/omni-brain/backups/ssl"

# 📝 Funkcije za izpis
print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}🔐 OMNI-BRAIN SSL SETUP${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}➤ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 🔍 Preveri root pravice
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Ta skripta mora biti zagnana kot root"
        echo "Uporabi: sudo $0"
        exit 1
    fi
}

# 📦 Namesti potrebne pakete
install_dependencies() {
    print_step "Nameščam potrebne pakete..."
    
    # Posodobi package list
    apt update
    
    # Namesti certbot in nginx plugin
    apt install -y certbot python3-certbot-nginx nginx openssl
    
    # Preveri če je nginx zagnan
    systemctl enable nginx
    systemctl start nginx
    
    print_success "Paketi nameščeni"
}

# 🌐 Konfiguracija Nginx
setup_nginx() {
    print_step "Konfiguriram Nginx za $DOMAIN..."
    
    # Ustvari osnovni Nginx config
    cat > "$NGINX_AVAILABLE/omni-brain" << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root $WEBROOT_PATH;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Configuration (bo posodobljeno s certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # OMNI-BRAIN Application
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
        
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
    
    # Static files
    location /static/ {
        alias /opt/omni-brain/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Rate limiting zones
http {
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
}
EOF
    
    # Omogoči site
    ln -sf "$NGINX_AVAILABLE/omni-brain" "$NGINX_ENABLED/"
    
    # Odstrani default site
    rm -f "$NGINX_ENABLED/default"
    
    # Ustvari webroot directory
    mkdir -p "$WEBROOT_PATH"
    chown -R www-data:www-data "$WEBROOT_PATH"
    
    # Test nginx konfiguracije
    nginx -t
    
    print_success "Nginx konfiguriran"
}

# 🔐 Pridobi SSL certifikat
obtain_ssl_certificate() {
    print_step "Pridobivam SSL certifikat za $DOMAIN..."
    
    # Reload nginx
    systemctl reload nginx
    
    # Pridobi certifikat
    certbot --nginx \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --domains "$DOMAIN" \
        --redirect \
        --hsts \
        --staple-ocsp \
        --must-staple
    
    print_success "SSL certifikat pridobljen"
}

# 🔄 Nastavi avtomatsko obnavljanje
setup_auto_renewal() {
    print_step "Nastavljam avtomatsko obnavljanje certifikatov..."
    
    # Ustvari renewal hook
    cat > "/etc/letsencrypt/renewal-hooks/deploy/omni-brain-reload.sh" << 'EOF'
#!/bin/bash
# Reload nginx after certificate renewal
systemctl reload nginx

# Restart OMNI-BRAIN if needed
if systemctl is-active --quiet omni-brain; then
    systemctl reload omni-brain
fi

# Log renewal
echo "$(date): SSL certificate renewed for OMNI-BRAIN" >> /var/log/omni-brain-ssl.log
EOF
    
    chmod +x "/etc/letsencrypt/renewal-hooks/deploy/omni-brain-reload.sh"
    
    # Test renewal
    certbot renew --dry-run
    
    print_success "Avtomatsko obnavljanje nastavljeno"
}

# 💾 Ustvari backup SSL konfiguracij
backup_ssl_config() {
    print_step "Ustvarjam backup SSL konfiguracij..."
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup nginx config
    cp -r /etc/nginx/sites-available/omni-brain "$BACKUP_PATH/nginx-config-$(date +%Y%m%d-%H%M%S)"
    
    # Backup certbot config
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        tar -czf "$BACKUP_PATH/letsencrypt-$(date +%Y%m%d-%H%M%S).tar.gz" /etc/letsencrypt/
    fi
    
    print_success "Backup ustvarjen v $BACKUP_PATH"
}

# 🔍 Preveri SSL setup
verify_ssl_setup() {
    print_step "Preverjam SSL setup..."
    
    # Test SSL certificate
    echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates
    
    # Test HTTPS redirect
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN")
    if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
        print_success "HTTP to HTTPS redirect deluje"
    else
        print_warning "HTTP to HTTPS redirect morda ne deluje pravilno"
    fi
    
    # Test HSTS header
    HSTS_HEADER=$(curl -s -I "https://$DOMAIN" | grep -i "strict-transport-security")
    if [ -n "$HSTS_HEADER" ]; then
        print_success "HSTS header je nastavljen"
    else
        print_warning "HSTS header ni najden"
    fi
    
    print_success "SSL setup preverjen"
}

# 📊 Prikaži SSL informacije
show_ssl_info() {
    echo ""
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}📊 SSL INFORMACIJE${NC}"
    echo -e "${CYAN}================================${NC}"
    echo ""
    echo -e "${GREEN}Domain:${NC} $DOMAIN"
    echo -e "${GREEN}Email:${NC} $EMAIL"
    echo -e "${GREEN}SSL Certificate:${NC} /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo -e "${GREEN}SSL Private Key:${NC} /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo -e "${GREEN}Nginx Config:${NC} $NGINX_AVAILABLE/omni-brain"
    echo -e "${GREEN}Backup Path:${NC} $BACKUP_PATH"
    echo ""
    echo -e "${YELLOW}Uporabni ukazi:${NC}"
    echo -e "  ${BLUE}certbot certificates${NC}                 - Prikaži certifikate"
    echo -e "  ${BLUE}certbot renew${NC}                        - Obnovi certifikate"
    echo -e "  ${BLUE}nginx -t${NC}                             - Preveri nginx config"
    echo -e "  ${BLUE}systemctl reload nginx${NC}               - Reload nginx"
    echo -e "  ${BLUE}tail -f /var/log/nginx/error.log${NC}     - Nginx error log"
    echo ""
}

# 🔧 Generiraj self-signed certifikat (za razvoj)
generate_self_signed() {
    print_step "Generiram self-signed certifikat za razvoj..."
    
    mkdir -p "$SSL_PATH"
    
    # Generiraj private key
    openssl genrsa -out "$SSL_PATH/privkey.pem" 4096
    
    # Generiraj certifikat
    openssl req -new -x509 -key "$SSL_PATH/privkey.pem" -out "$SSL_PATH/fullchain.pem" -days 365 -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=OMNI-BRAIN/CN=$DOMAIN"
    
    # Nastavi pravice
    chmod 600 "$SSL_PATH/privkey.pem"
    chmod 644 "$SSL_PATH/fullchain.pem"
    
    print_success "Self-signed certifikat generiran v $SSL_PATH"
    print_warning "To je samo za razvoj! V produkciji uporabi Let's Encrypt"
}

# 📋 Prikaži pomoč
show_help() {
    echo "Uporaba: $0 [OPCIJE]"
    echo ""
    echo "Opcije:"
    echo "  -d, --domain DOMAIN     Nastavi domeno (obvezno)"
    echo "  -e, --email EMAIL       Nastavi email za Let's Encrypt (obvezno)"
    echo "  -w, --webroot PATH      Nastavi webroot path (privzeto: $WEBROOT_PATH)"
    echo "  --self-signed           Generiraj self-signed certifikat namesto Let's Encrypt"
    echo "  --backup-only           Samo ustvari backup obstoječih konfiguracij"
    echo "  --verify-only           Samo preveri obstoječi SSL setup"
    echo "  -h, --help              Prikaži to pomoč"
    echo ""
    echo "Primeri:"
    echo "  $0 -d example.com -e admin@example.com"
    echo "  $0 -d localhost --self-signed"
    echo "  $0 --verify-only -d example.com"
}

# 🚀 Glavna funkcija
main() {
    print_header
    
    # Privzete vrednosti
    SELF_SIGNED=false
    BACKUP_ONLY=false
    VERIFY_ONLY=false
    
    # Obdelaj argumente
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--domain)
                DOMAIN="$2"
                shift 2
                ;;
            -e|--email)
                EMAIL="$2"
                shift 2
                ;;
            -w|--webroot)
                WEBROOT_PATH="$2"
                shift 2
                ;;
            --self-signed)
                SELF_SIGNED=true
                shift
                ;;
            --backup-only)
                BACKUP_ONLY=true
                shift
                ;;
            --verify-only)
                VERIFY_ONLY=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "Neznana opcija: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Preveri obvezne parametre
    if [ -z "$DOMAIN" ]; then
        print_error "Domena je obvezna"
        show_help
        exit 1
    fi
    
    if [ "$SELF_SIGNED" = false ] && [ "$BACKUP_ONLY" = false ] && [ -z "$EMAIL" ]; then
        print_error "Email je obvezen za Let's Encrypt"
        show_help
        exit 1
    fi
    
    # Izvedi akcije
    if [ "$BACKUP_ONLY" = true ]; then
        backup_ssl_config
        exit 0
    fi
    
    if [ "$VERIFY_ONLY" = true ]; then
        verify_ssl_setup
        exit 0
    fi
    
    # Preveri root pravice
    check_root
    
    # Namesti odvisnosti
    install_dependencies
    
    if [ "$SELF_SIGNED" = true ]; then
        generate_self_signed
    else
        setup_nginx
        obtain_ssl_certificate
        setup_auto_renewal
    fi
    
    backup_ssl_config
    verify_ssl_setup
    show_ssl_info
    
    print_success "SSL setup dokončan!"
    echo ""
    echo -e "${GREEN}🎉 OMNI-BRAIN je sedaj dostopen na: https://$DOMAIN${NC}"
}

# Zaženi glavno funkcijo
main "$@"