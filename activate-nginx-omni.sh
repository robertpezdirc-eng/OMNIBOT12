#!/bin/bash

# Skripta za aktivacijo Nginx konfiguracije za Omni Cloud Service
# Uporaba: sudo ./activate-nginx-omni.sh [domena]

set -e  # Ustavi ob napaki

# Barve za izpis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcija za izpis z barvo
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Preveri root pravice
if [[ $EUID -ne 0 ]]; then
   print_error "Ta skripta mora biti zagnana kot root (sudo)"
   exit 1
fi

# Nastavi domeno
DOMAIN=${1:-"moja-domena.com"}
print_status "Konfiguriram Nginx za domeno: $DOMAIN"

# Preveri, če Nginx obstaja
if ! command -v nginx &> /dev/null; then
    print_error "Nginx ni nameščen. Namesti ga z: sudo apt install nginx"
    exit 1
fi

# Ustvari direktorije, če ne obstajajo
print_status "Ustvarjam potrebne direktorije..."
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
mkdir -p /var/log/nginx

# Kopiraj konfiguracijsko datoteko
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_SOURCE="$SCRIPT_DIR/nginx-omni-site.conf"

if [[ ! -f "$CONFIG_SOURCE" ]]; then
    print_error "Nginx konfiguracija ni najdena: $CONFIG_SOURCE"
    exit 1
fi

print_status "Kopiram Nginx konfiguracijsko datoteko..."

# Zamenjaj placeholder domeno z dejansko domeno
sed "s/moja-domena.com/$DOMAIN/g" "$CONFIG_SOURCE" > "/etc/nginx/sites-available/omni"

print_success "Konfiguracija kopirana v /etc/nginx/sites-available/omni"

# Preveri, če SSL certifikat obstaja
SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
if [[ ! -f "$SSL_CERT_PATH" ]]; then
    print_warning "SSL certifikat ne obstaja: $SSL_CERT_PATH"
    print_warning "Ustvarjam začasno HTTP-only konfiguracijo..."
    
    # Ustvari začasno HTTP-only konfiguracijo
    cat > "/etc/nginx/sites-available/omni-temp" << EOF
# Začasna HTTP-only konfiguracija za Omni
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Glavna lokacija - proxy na Omni aplikacijo
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket podpora
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        access_log off;
    }

    # Logiranje
    access_log /var/log/nginx/omni-access.log;
    error_log /var/log/nginx/omni-error.log;
}
EOF
    
    print_status "Uporabljam začasno HTTP-only konfiguracijo"
    CONFIG_FILE="omni-temp"
else
    print_success "SSL certifikat najden: $SSL_CERT_PATH"
    CONFIG_FILE="omni"
fi

# Odstrani obstoječo simbolno povezavo, če obstaja
if [[ -L "/etc/nginx/sites-enabled/omni" ]]; then
    print_status "Odstranjujem obstoječo simbolno povezavo..."
    rm -f /etc/nginx/sites-enabled/omni
fi

if [[ -L "/etc/nginx/sites-enabled/omni-temp" ]]; then
    print_status "Odstranjujem obstoječo začasno simbolno povezavo..."
    rm -f /etc/nginx/sites-enabled/omni-temp
fi

# Ustvari simbolno povezavo
print_status "Ustvarjam simbolno povezavo..."
ln -sf "/etc/nginx/sites-available/$CONFIG_FILE" "/etc/nginx/sites-enabled/"

print_success "Simbolna povezava ustvarjena: /etc/nginx/sites-enabled/$CONFIG_FILE"

# Odstrani privzeto Nginx stran, če obstaja
if [[ -f "/etc/nginx/sites-enabled/default" ]]; then
    print_status "Odstranjujem privzeto Nginx stran..."
    rm -f /etc/nginx/sites-enabled/default
fi

# Testiraj Nginx konfiguracijo
print_status "Testiram Nginx konfiguracijo..."
if nginx -t; then
    print_success "Nginx konfiguracija je veljavna"
else
    print_error "Nginx konfiguracija ni veljavna"
    print_error "Preveri napake z: sudo nginx -t"
    exit 1
fi

# Ponovno naloži Nginx
print_status "Ponovno nalagam Nginx..."
if systemctl reload nginx; then
    print_success "Nginx uspešno ponovno naložen"
else
    print_error "Napaka pri ponovnem nalaganju Nginx"
    exit 1
fi

# Preveri status Nginx
print_status "Preverjam status Nginx..."
if systemctl is-active --quiet nginx; then
    print_success "Nginx je aktiven in deluje"
else
    print_warning "Nginx ni aktiven, poskušam zagnati..."
    if systemctl start nginx; then
        print_success "Nginx uspešno zagnan"
    else
        print_error "Napaka pri zagonu Nginx"
        exit 1
    fi
fi

# Omogoči Nginx ob zagonu sistema
if ! systemctl is-enabled --quiet nginx; then
    print_status "Omogočam Nginx ob zagonu sistema..."
    systemctl enable nginx
    print_success "Nginx omogočen ob zagonu sistema"
fi

# Prikaži status
print_status "Nginx konfiguracija za Omni je aktivna!"
print_status "Domena: $DOMAIN"
print_status "Proxy na: http://127.0.0.1:8080"

if [[ "$CONFIG_FILE" == "omni-temp" ]]; then
    print_warning "OPOZORILO: Uporablja se HTTP-only konfiguracija"
    print_warning "Za HTTPS namesti SSL certifikat z:"
    print_warning "sudo certbot --nginx -d $DOMAIN"
    print_warning "Nato zaženi to skripto ponovno"
else
    print_success "HTTPS konfiguracija je aktivna"
fi

# Prikaži koristne ukaze
echo ""
print_status "Koristni ukazi:"
echo "  - Preveri Nginx status: sudo systemctl status nginx"
echo "  - Preveri Nginx konfiguracijo: sudo nginx -t"
echo "  - Ponovno naloži Nginx: sudo systemctl reload nginx"
echo "  - Preveri logove: sudo tail -f /var/log/nginx/omni-error.log"
echo "  - Testiraj povezavo: curl -I http://$DOMAIN"

if [[ "$CONFIG_FILE" != "omni-temp" ]]; then
    echo "  - Testiraj HTTPS: curl -I https://$DOMAIN"
fi

print_success "Nginx konfiguracija za Omni je uspešno aktivirana! 🚀"