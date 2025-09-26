#!/bin/bash

# Omni System Deployment Script
# Avtomatska namestitev in posodobitev sistema

set -e

# Barve za izpis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcije za barvni izpis
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Konfiguracija
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
BACKUP_BEFORE_DEPLOY=true
HEALTH_CHECK_TIMEOUT=60

print_info "🚀 Začenjam Omni System deployment..."

# 1. Preveri predpogoje
print_info "🔍 Preverjam predpogoje..."

if ! command -v docker &> /dev/null; then
    print_error "Docker ni nameščen!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose ni nameščen!"
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "Docker Compose datoteka $COMPOSE_FILE ni najdena!"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    print_warning "Okoljska datoteka $ENV_FILE ni najdena. Uporabljam privzete vrednosti."
fi

print_success "Predpogoji izpolnjeni"

# 2. Backup pred posodobitvijo
if [ "$BACKUP_BEFORE_DEPLOY" = true ]; then
    print_info "💾 Ustvarjam backup pred posodobitvijo..."
    if [ -f "./backup.sh" ]; then
        chmod +x ./backup.sh
        ./backup.sh
        print_success "Backup ustvarjen"
    else
        print_warning "Backup skripta ni najdena, preskačem backup"
    fi
fi

# 3. Prenesi najnovejše spremembe (če je Git repo)
if [ -d ".git" ]; then
    print_info "📥 Prenašam najnovejše spremembe..."
    git pull origin main || print_warning "Git pull ni uspel ali ni Git repozitorij"
fi

# 4. Preveri SSL certifikate
print_info "🔐 Preverjam SSL certifikate..."
if [ -f "./certs/fullchain.pem" ] && [ -f "./certs/privkey.pem" ]; then
    # Preveri veljavnost certifikata
    if openssl x509 -in ./certs/fullchain.pem -checkend 86400 -noout; then
        print_success "SSL certifikati so veljavni"
    else
        print_warning "SSL certifikat bo potekel v 24 urah!"
    fi
else
    print_error "SSL certifikati niso najdeni v ./certs/ direktoriju!"
    print_info "Prosim, kopiraj fullchain.pem in privkey.pem v ./certs/ direktorij"
    exit 1
fi

# 5. Preveri okoljske spremenljivke
print_info "🔧 Preverjam okoljske spremenljivke..."
if [ -f "$ENV_FILE" ]; then
    # Preveri kritične spremenljivke
    if grep -q "your_secure.*password" "$ENV_FILE"; then
        print_error "Prosim, spremeni privzeta gesla v $ENV_FILE datoteki!"
        exit 1
    fi
    print_success "Okoljske spremenljivke so nastavljene"
fi

# 6. Ustavi obstoječe storitve
print_info "🛑 Ustavljam obstoječe storitve..."
docker-compose -f "$COMPOSE_FILE" down --remove-orphans || true

# 7. Počisti stare Docker slike
print_info "🧹 Čistim stare Docker slike..."
docker system prune -f

# 8. Zgradi in zaženi storitve
print_info "🔨 Gradim in zaganjam storitve..."
docker-compose -f "$COMPOSE_FILE" up --build -d

# 9. Počakaj, da se storitve zaženejo
print_info "⏳ Čakam, da se storitve zaženejo..."
sleep 30

# 10. Preveri zdravje storitev
print_info "🏥 Preverjam zdravje storitev..."

check_health() {
    local url=$1
    local name=$2
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s -k "$url" > /dev/null 2>&1; then
            print_success "$name je zdrav"
            return 0
        fi
        print_info "Poskus $attempt/$max_attempts za $name..."
        sleep 6
        ((attempt++))
    done
    
    print_error "$name ni zdrav po $max_attempts poskusih"
    return 1
}

# Preveri glavne storitve
DOMAIN=${DOMAIN:-localhost}
check_health "https://$DOMAIN/health" "Server API" || exit 1
check_health "https://admin.$DOMAIN/health" "Admin Panel" || print_warning "Admin Panel ni dosegljiv"
check_health "https://client.$DOMAIN/health" "Client Panel" || print_warning "Client Panel ni dosegljiv"

# 11. Preveri Docker storitve
print_info "🐳 Preverjam Docker storitve..."
if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    print_success "Docker storitve so aktivne"
    docker-compose -f "$COMPOSE_FILE" ps
else
    print_error "Nekatere Docker storitve niso aktivne!"
    docker-compose -f "$COMPOSE_FILE" ps
    exit 1
fi

# 12. Preveri WebSocket povezavo
print_info "🔌 Preverjam WebSocket povezavo..."
if command -v wscat &> /dev/null; then
    timeout 5 wscat -c "wss://$DOMAIN" -x "ping" || print_warning "WebSocket test ni uspel"
else
    print_warning "wscat ni nameščen, preskačem WebSocket test"
fi

# 13. Prikaži dostopne točke
print_success "🎉 Deployment uspešno končan!"
print_info ""
print_info "📍 Dostopne točke:"
print_info "   🌐 Glavna domena:    https://$DOMAIN"
print_info "   👨‍💼 Admin Panel:     https://admin.$DOMAIN"
print_info "   👤 Client Panel:     https://client.$DOMAIN"
print_info "   🔌 API Endpoint:     https://$DOMAIN/api/license"
print_info "   📡 WebSocket:        wss://$DOMAIN"
print_info ""
print_info "📊 Monitoring:"
print_info "   📈 Prometheus:       http://localhost:9090"
print_info "   📋 Docker Stats:     docker stats"
print_info "   📜 Logi:            docker-compose -f $COMPOSE_FILE logs -f"
print_info ""
print_success "Sistem je pripravljen za uporabo! 🚀"

# 14. Opcijsko: pošlji obvestilo o uspešnem deploymentu
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Omni System deployment uspešen na $DOMAIN\"}" \
        "$SLACK_WEBHOOK_URL" || true
fi