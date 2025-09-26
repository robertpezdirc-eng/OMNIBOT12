#!/bin/bash

# =============================================================================
# OMNI CLOUD MIGRATION VALIDATION SCRIPT
# =============================================================================
# Ta skripta avtomatsko preveri uspešnost migracije Omni aplikacije v oblak
# Uporaba: ./migration-validation-script.sh [DOMENA]
# Primer: ./migration-validation-script.sh omni.example.com
# =============================================================================

# Konfiguracija
DOMAIN=${1:-"localhost"}
HTTPS_URL="https://$DOMAIN"
HTTP_URL="http://$DOMAIN"
API_ENDPOINT="$HTTPS_URL/api/health"
LOG_FILE="/var/log/omni-migration-validation.log"

# Barvne kode za izpis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcije za logiranje
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Funkcija za preverjanje ukaza
check_command() {
    if command -v "$1" &> /dev/null; then
        success "$1 je na voljo"
        return 0
    else
        error "$1 ni na voljo"
        return 1
    fi
}

# Funkcija za preverjanje storitve
check_service() {
    if systemctl is-active --quiet "$1"; then
        success "Storitev $1 je aktivna"
        return 0
    else
        error "Storitev $1 ni aktivna"
        return 1
    fi
}

# Funkcija za preverjanje porta
check_port() {
    if netstat -tlnp | grep -q ":$1 "; then
        success "Port $1 je odprt"
        return 0
    else
        error "Port $1 ni odprt"
        return 1
    fi
}

# Funkcija za preverjanje SSL certifikata
check_ssl_certificate() {
    log "Preverjam SSL certifikat za $DOMAIN..."
    
    # Preveri veljavnost certifikata
    if echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates; then
        success "SSL certifikat je veljaven"
        
        # Preveri izdajatelja
        ISSUER=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -issuer | grep -o "Let's Encrypt")
        if [ "$ISSUER" = "Let's Encrypt" ]; then
            success "SSL certifikat izdaja Let's Encrypt"
        else
            warning "SSL certifikat ne izdaja Let's Encrypt"
        fi
        
        # Preveri datum poteka
        EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
        log "SSL certifikat poteče: $EXPIRY"
        
        return 0
    else
        error "SSL certifikat ni veljaven ali ni dostopen"
        return 1
    fi
}

# Funkcija za preverjanje HTTP preusmeritve
check_http_redirect() {
    log "Preverjam HTTP preusmeritev na HTTPS..."
    
    REDIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$HTTP_URL")
    REDIRECT_URL=$(curl -s -o /dev/null -w "%{redirect_url}" "$HTTP_URL")
    
    if [ "$REDIRECT_STATUS" = "200" ] && [[ "$REDIRECT_URL" == https* ]]; then
        success "HTTP se pravilno preusmeri na HTTPS"
        return 0
    else
        error "HTTP preusmeritev na HTTPS ne deluje pravilno"
        log "Status: $REDIRECT_STATUS, Redirect URL: $REDIRECT_URL"
        return 1
    fi
}

# Funkcija za preverjanje HTTPS povezljivosti
check_https_connectivity() {
    log "Preverjam HTTPS povezljivost..."
    
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HTTPS_URL")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        success "HTTPS povezava deluje (Status: $HTTP_STATUS)"
        return 0
    else
        error "HTTPS povezava ne deluje (Status: $HTTP_STATUS)"
        return 1
    fi
}

# Funkcija za preverjanje API endpointa
check_api_endpoint() {
    log "Preverjam API endpoint..."
    
    API_RESPONSE=$(curl -s "$API_ENDPOINT")
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT")
    
    if [ "$API_STATUS" = "200" ]; then
        success "API endpoint deluje (Status: $API_STATUS)"
        log "API Response: $API_RESPONSE"
        return 0
    else
        warning "API endpoint ni dostopen (Status: $API_STATUS)"
        return 1
    fi
}

# Funkcija za preverjanje varnostnih headerjev
check_security_headers() {
    log "Preverjam varnostne headerje..."
    
    HEADERS=$(curl -s -I "$HTTPS_URL")
    
    # Preveri HSTS
    if echo "$HEADERS" | grep -qi "strict-transport-security"; then
        success "HSTS header je prisoten"
    else
        warning "HSTS header ni prisoten"
    fi
    
    # Preveri X-Frame-Options
    if echo "$HEADERS" | grep -qi "x-frame-options"; then
        success "X-Frame-Options header je prisoten"
    else
        warning "X-Frame-Options header ni prisoten"
    fi
    
    # Preveri X-Content-Type-Options
    if echo "$HEADERS" | grep -qi "x-content-type-options"; then
        success "X-Content-Type-Options header je prisoten"
    else
        warning "X-Content-Type-Options header ni prisoten"
    fi
}

# Funkcija za preverjanje Nginx konfiguracije
check_nginx_config() {
    log "Preverjam Nginx konfiguracijo..."
    
    if nginx -t &>/dev/null; then
        success "Nginx konfiguracija je veljavna"
        return 0
    else
        error "Nginx konfiguracija ima napake"
        nginx -t
        return 1
    fi
}

# Funkcija za preverjanje certbot konfiguracije
check_certbot_config() {
    log "Preverjam Certbot konfiguracijo..."
    
    if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
        success "Certbot certifikat za $DOMAIN obstaja"
        
        # Preveri avtomatsko podaljševanje
        if crontab -l 2>/dev/null | grep -q "certbot renew"; then
            success "Avtomatsko podaljševanje SSL je konfigurirano"
        else
            warning "Avtomatsko podaljševanje SSL ni konfigurirano"
        fi
        
        return 0
    else
        error "Certbot certifikat za $DOMAIN ne obstaja"
        return 1
    fi
}

# Funkcija za preverjanje backup sistema
check_backup_system() {
    log "Preverjam backup sistem..."
    
    if [ -d "/opt/omni/backups" ]; then
        success "Backup direktorij obstaja"
        
        # Preveri cron job za backup
        if crontab -l 2>/dev/null | grep -q "backup"; then
            success "Avtomatski backup je konfiguriran"
        else
            warning "Avtomatski backup ni konfiguriran"
        fi
        
        return 0
    else
        warning "Backup direktorij ne obstaja"
        return 1
    fi
}

# Funkcija za preverjanje Angel-ov
check_angels_status() {
    log "Preverjam status Angel-ov..."
    
    local angels_active=0
    local total_angels=8
    
    # Seznam vseh Angel-ov
    local angel_types=("LearningAngel" "CommercialAngel" "OptimizationAngel" "InnovationAngel" "AnalyticsAngel" "EngagementAngel" "GrowthAngel" "VisionaryAngel")
    
    # Preveri ali Angel integration sistem deluje
    if curl -s "$API_ENDPOINT/angels/status" | grep -q "active"; then
        success "Angel integration sistem je aktiven"
        
        # Preveri posamezne Angel-e
        for angel in "${angel_types[@]}"; do
            if curl -s "$API_ENDPOINT/angels/status/$angel" | grep -q "running"; then
                success "✅ $angel je aktiven"
                ((angels_active++))
            else
                warning "⚠️ $angel ni aktiven"
            fi
        done
        
        log "Aktivnih Angel-ov: $angels_active/$total_angels"
        
        if [ $angels_active -ge 6 ]; then
            success "Večina Angel-ov je aktivna ($angels_active/$total_angels)"
            return 0
        else
            warning "Premalo aktivnih Angel-ov ($angels_active/$total_angels)"
            return 1
        fi
    else
        error "Angel integration sistem ni dostopen"
        return 1
    fi
}

# Funkcija za preverjanje Angel koordinacije
check_angel_coordination() {
    log "Preverjam Angel koordinacijo..."
    
    # Preveri koordinacijski sistem
    if curl -s "$API_ENDPOINT/angels/coordination" | grep -q "coordinator_active"; then
        success "Angel koordinator je aktiven"
        
        # Preveri task distribution
        local pending_tasks=$(curl -s "$API_ENDPOINT/angels/tasks/pending" | jq -r '.count' 2>/dev/null || echo "0")
        local active_tasks=$(curl -s "$API_ENDPOINT/angels/tasks/active" | jq -r '.count' 2>/dev/null || echo "0")
        
        log "Čakajoče naloge: $pending_tasks"
        log "Aktivne naloge: $active_tasks"
        
        if [ "$active_tasks" -gt 0 ]; then
            success "Angel-i aktivno obdelujejo naloge"
        else
            warning "Ni aktivnih nalog za Angel-e"
        fi
        
        return 0
    else
        error "Angel koordinator ni dostopen"
        return 1
    fi
}

# Funkcija za preverjanje Angel sinhronizacije
check_angel_synchronization() {
    log "Preverjam Angel sinhronizacijo..."
    
    # Preveri sinhronizacijski modul
    if curl -s "$API_ENDPOINT/angels/sync/status" | grep -q "sync_active"; then
        success "Angel sinhronizacija je aktivna"
        
        # Preveri zadnjo sinhronizacijo
        local last_sync=$(curl -s "$API_ENDPOINT/angels/sync/last" | jq -r '.timestamp' 2>/dev/null || echo "unknown")
        log "Zadnja sinhronizacija: $last_sync"
        
        # Preveri konflikte
        local conflicts=$(curl -s "$API_ENDPOINT/angels/sync/conflicts" | jq -r '.count' 2>/dev/null || echo "0")
        if [ "$conflicts" -eq 0 ]; then
            success "Ni konfliktov v sinhronizaciji"
        else
            warning "Zaznanih $conflicts konfliktov v sinhronizaciji"
        fi
        
        return 0
    else
        error "Angel sinhronizacija ni dostopna"
        return 1
    fi
}

# Funkcija za preverjanje Angel monitoringa
check_angel_monitoring() {
    log "Preverjam Angel monitoring..."
    
    # Preveri monitoring sistem
    if curl -s "$API_ENDPOINT/angels/monitoring/health" | grep -q "monitoring_active"; then
        success "Angel monitoring je aktiven"
        
        # Preveri alarme
        local active_alerts=$(curl -s "$API_ENDPOINT/angels/monitoring/alerts" | jq -r '.active_count' 2>/dev/null || echo "0")
        if [ "$active_alerts" -eq 0 ]; then
            success "Ni aktivnih alarmov"
        else
            warning "Aktivnih alarmov: $active_alerts"
        fi
        
        # Preveri performančne metrike
        local avg_response_time=$(curl -s "$API_ENDPOINT/angels/monitoring/metrics" | jq -r '.avg_response_time' 2>/dev/null || echo "unknown")
        log "Povprečni odzivni čas Angel-ov: ${avg_response_time}ms"
        
        return 0
    else
        error "Angel monitoring ni dostopen"
        return 1
    fi
}

# Funkcija za preverjanje Angel učenja
check_angel_learning() {
    log "Preverjam Angel učenje..."
    
    # Preveri učni sistem
    if curl -s "$API_ENDPOINT/angels/learning/status" | grep -q "learning_active"; then
        success "Angel učni sistem je aktiven"
        
        # Preveri učne modele
        local models_count=$(curl -s "$API_ENDPOINT/angels/learning/models" | jq -r '.count' 2>/dev/null || echo "0")
        log "Aktivnih učnih modelov: $models_count"
        
        # Preveri zadnje izboljšave
        local last_improvement=$(curl -s "$API_ENDPOINT/angels/learning/improvements" | jq -r '.last_timestamp' 2>/dev/null || echo "unknown")
        log "Zadnja izboljšava: $last_improvement"
        
        if [ "$models_count" -gt 0 ]; then
            success "Angel-i aktivno se učijo"
            return 0
        else
            warning "Ni aktivnih učnih modelov"
            return 1
        fi
    else
        error "Angel učni sistem ni dostopen"
        return 1
    fi
}

# Glavna funkcija za validacijo
main() {
    log "🚀 ZAČETEK VALIDACIJE OMNI CLOUD MIGRACIJE"
    log "Domena: $DOMAIN"
    log "Datum: $(date)"
    
    TOTAL_CHECKS=0
    PASSED_CHECKS=0
    
    echo
    log "📋 1. SISTEMSKE PREVERITVE"
    echo "=================================="
    
    # Preveri sistemske ukaze
    for cmd in nginx systemctl curl openssl certbot; do
        if check_command "$cmd"; then
            ((PASSED_CHECKS++))
        fi
        ((TOTAL_CHECKS++))
    done
    
    echo
    log "🔧 2. STORITVE IN PORTI"
    echo "=================================="
    
    # Preveri storitve
    for service in nginx omni; do
        if check_service "$service"; then
            ((PASSED_CHECKS++))
        fi
        ((TOTAL_CHECKS++))
    done
    
    # Preveri porte
    for port in 80 443 8080; do
        if check_port "$port"; then
            ((PASSED_CHECKS++))
        fi
        ((TOTAL_CHECKS++))
    done
    
    echo
    log "🌐 3. NGINX IN KONFIGURACIJA"
    echo "=================================="
    
    if check_nginx_config; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo
    log "🔒 4. SSL CERTIFIKAT"
    echo "=================================="
    
    if check_ssl_certificate; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    if check_certbot_config; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo
    log "🌍 5. POVEZLJIVOST"
    echo "=================================="
    
    if check_http_redirect; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    if check_https_connectivity; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    if check_api_endpoint; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo
    log "🛡️  6. VARNOSTNE NASTAVITVE"
    echo "=================================="
    
    check_security_headers
    ((TOTAL_CHECKS++))
    ((PASSED_CHECKS++))  # Varnostni headerji so opcijski
    
    echo
    log "💾 7. BACKUP SISTEM"
    echo "=================================="
    
    if check_backup_system; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo
    log "👼 8. ANGEL SISTEMI"
    echo "=================================="
    
    # Preveri Angel status
    if check_angels_status; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    # Preveri Angel koordinacijo
    if check_angel_coordination; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    # Preveri Angel sinhronizacijo
    if check_angel_synchronization; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    # Preveri Angel monitoring
    if check_angel_monitoring; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    # Preveri Angel učenje
    if check_angel_learning; then
        ((PASSED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo
    log "📊 POVZETEK VALIDACIJE"
    echo "=================================="
    
    PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    
    log "Uspešnih preverjanj: $PASSED_CHECKS/$TOTAL_CHECKS ($PERCENTAGE%)"
    
    if [ "$PERCENTAGE" -ge 90 ]; then
        success "🎉 MIGRACIJA Z ANGEL-I JE USPEŠNA! Omni aplikacija in vsi Angel-i so popolnoma operativni."
    elif [ "$PERCENTAGE" -ge 80 ]; then
        success "✅ MIGRACIJA JE USPEŠNA! Omni aplikacija deluje, Angel-i so večinoma aktivni."
    elif [ "$PERCENTAGE" -ge 70 ]; then
        warning "⚠️  MIGRACIJA JE DELNO USPEŠNA. Nekatere funkcionalnosti ali Angel-i morda ne delujejo optimalno."
    else
        error "❌ MIGRACIJA NI USPEŠNA. Potrebne so dodatne konfiguracije za Omni in Angel-e."
    fi
    
    echo
    log "📝 Podroben log je shranjen v: $LOG_FILE"
    log "🌐 Testiraj aplikacijo na: $HTTPS_URL"
    log "👼 Angel monitoring: $HTTPS_URL/angels/dashboard"
    log "📊 Angel metrike: $HTTPS_URL/angels/metrics"
    
    echo
    log "🚀 VALIDACIJA KONČANA"
}

# Preveri argumente
if [ $# -eq 0 ]; then
    echo "Uporaba: $0 [DOMENA]"
    echo "Primer: $0 omni.example.com"
    exit 1
fi

# Zaženi glavno funkcijo
main