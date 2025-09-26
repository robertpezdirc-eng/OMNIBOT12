#!/bin/bash

# Celovita skripta za testiranje Omni produkcijskega sistema
# Uporaba: ./test-omni-production.sh [domena]

set -e  # Ustavi ob napaki

# Barve za izpis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funkcije za izpis z barvo
print_header() {
    echo -e "\n${PURPLE}========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}========================================${NC}\n"
}

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

print_test() {
    echo -e "${CYAN}[TEST]${NC} $1"
}

# Globalne spremenljivke
DOMAIN=${1:-"moja-domena.com"}
TEST_RESULTS=()
FAILED_TESTS=0
PASSED_TESTS=0

# Funkcija za dodajanje rezultata testa
add_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TEST_RESULTS+=("$test_name|$result|$details")
    
    if [[ "$result" == "PASS" ]]; then
        ((PASSED_TESTS++))
        print_success "$test_name: $details"
    else
        ((FAILED_TESTS++))
        print_error "$test_name: $details"
    fi
}

# Test funkcije
test_system_requirements() {
    print_header "TESTIRANJE SISTEMSKIH ZAHTEV"
    
    # Test Nginx
    print_test "Preverjam Nginx..."
    if command -v nginx &> /dev/null; then
        nginx_version=$(nginx -v 2>&1 | cut -d' ' -f3)
        add_test_result "Nginx Installation" "PASS" "Verzija: $nginx_version"
    else
        add_test_result "Nginx Installation" "FAIL" "Nginx ni nameščen"
    fi
    
    # Test Python
    print_test "Preverjam Python..."
    if command -v python3 &> /dev/null; then
        python_version=$(python3 --version)
        add_test_result "Python Installation" "PASS" "$python_version"
    else
        add_test_result "Python Installation" "FAIL" "Python3 ni nameščen"
    fi
    
    # Test Node.js
    print_test "Preverjam Node.js..."
    if command -v node &> /dev/null; then
        node_version=$(node --version)
        add_test_result "Node.js Installation" "PASS" "Verzija: $node_version"
    else
        add_test_result "Node.js Installation" "WARN" "Node.js ni nameščen (opcijsko)"
    fi
    
    # Test Certbot
    print_test "Preverjam Certbot..."
    if command -v certbot &> /dev/null; then
        certbot_version=$(certbot --version 2>&1 | head -n1)
        add_test_result "Certbot Installation" "PASS" "$certbot_version"
    else
        add_test_result "Certbot Installation" "FAIL" "Certbot ni nameščen"
    fi
}

test_services_status() {
    print_header "TESTIRANJE STANJA STORITEV"
    
    # Test Nginx status
    print_test "Preverjam Nginx status..."
    if systemctl is-active --quiet nginx; then
        add_test_result "Nginx Service" "PASS" "Aktivna in deluje"
    else
        add_test_result "Nginx Service" "FAIL" "Ni aktivna"
    fi
    
    # Test Omni service
    print_test "Preverjam Omni storitev..."
    if systemctl is-active --quiet omni; then
        add_test_result "Omni Service" "PASS" "Aktivna in deluje"
    elif systemctl is-active --quiet omni-node; then
        add_test_result "Omni-Node Service" "PASS" "Aktivna in deluje"
    else
        add_test_result "Omni Service" "FAIL" "Ni aktivna"
    fi
    
    # Test port 80
    print_test "Preverjam port 80..."
    if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
        add_test_result "Port 80" "PASS" "Port je odprt"
    else
        add_test_result "Port 80" "FAIL" "Port ni odprt"
    fi
    
    # Test port 443
    print_test "Preverjam port 443..."
    if netstat -tlnp 2>/dev/null | grep -q ":443 "; then
        add_test_result "Port 443" "PASS" "Port je odprt"
    else
        add_test_result "Port 443" "FAIL" "Port ni odprt"
    fi
    
    # Test port 8080 (Omni aplikacija)
    print_test "Preverjam port 8080..."
    if netstat -tlnp 2>/dev/null | grep -q ":8080 "; then
        add_test_result "Port 8080" "PASS" "Omni aplikacija posluša"
    else
        add_test_result "Port 8080" "FAIL" "Omni aplikacija ne posluša"
    fi
}

test_nginx_configuration() {
    print_header "TESTIRANJE NGINX KONFIGURACIJE"
    
    # Test Nginx konfiguracija
    print_test "Preverjam Nginx konfiguracijo..."
    if nginx -t &>/dev/null; then
        add_test_result "Nginx Config" "PASS" "Konfiguracija je veljavna"
    else
        add_test_result "Nginx Config" "FAIL" "Konfiguracija ni veljavna"
    fi
    
    # Test Omni site konfiguracija
    print_test "Preverjam Omni site konfiguracijo..."
    if [[ -f "/etc/nginx/sites-available/omni" ]]; then
        add_test_result "Omni Site Config" "PASS" "Konfiguracija obstaja"
    else
        add_test_result "Omni Site Config" "FAIL" "Konfiguracija ne obstaja"
    fi
    
    # Test simbolna povezava
    print_test "Preverjam simbolno povezavo..."
    if [[ -L "/etc/nginx/sites-enabled/omni" ]]; then
        add_test_result "Nginx Symlink" "PASS" "Simbolna povezava obstaja"
    else
        add_test_result "Nginx Symlink" "FAIL" "Simbolna povezava ne obstaja"
    fi
}

test_ssl_certificate() {
    print_header "TESTIRANJE SSL CERTIFIKATA"
    
    local ssl_cert_path="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    local ssl_key_path="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
    
    # Test SSL certifikat
    print_test "Preverjam SSL certifikat..."
    if [[ -f "$ssl_cert_path" ]]; then
        # Preveri veljavnost certifikata
        if openssl x509 -in "$ssl_cert_path" -noout -checkend 86400 &>/dev/null; then
            expiry_date=$(openssl x509 -in "$ssl_cert_path" -noout -enddate | cut -d= -f2)
            add_test_result "SSL Certificate" "PASS" "Veljaven do: $expiry_date"
        else
            add_test_result "SSL Certificate" "FAIL" "Certifikat bo potekel v 24 urah"
        fi
    else
        add_test_result "SSL Certificate" "FAIL" "Certifikat ne obstaja: $ssl_cert_path"
    fi
    
    # Test SSL ključ
    print_test "Preverjam SSL ključ..."
    if [[ -f "$ssl_key_path" ]]; then
        add_test_result "SSL Private Key" "PASS" "Ključ obstaja"
    else
        add_test_result "SSL Private Key" "FAIL" "Ključ ne obstaja: $ssl_key_path"
    fi
    
    # Test SSL konfiguracija v Nginx
    print_test "Preverjam SSL konfiguracijo v Nginx..."
    if grep -q "ssl_certificate.*$DOMAIN" /etc/nginx/sites-available/omni 2>/dev/null; then
        add_test_result "Nginx SSL Config" "PASS" "SSL konfiguracija najdena"
    else
        add_test_result "Nginx SSL Config" "FAIL" "SSL konfiguracija ni najdena"
    fi
}

test_http_connectivity() {
    print_header "TESTIRANJE HTTP POVEZLJIVOSTI"
    
    # Test lokalna povezava na port 8080
    print_test "Testiram lokalno povezavo (port 8080)..."
    if curl -s --connect-timeout 5 http://127.0.0.1:8080 > /dev/null; then
        add_test_result "Local HTTP" "PASS" "Omni aplikacija odgovarja"
    else
        add_test_result "Local HTTP" "FAIL" "Omni aplikacija ne odgovarja"
    fi
    
    # Test health check
    print_test "Testiram health check..."
    if curl -s --connect-timeout 5 http://127.0.0.1:8080/health > /dev/null; then
        add_test_result "Health Check" "PASS" "Health endpoint deluje"
    else
        add_test_result "Health Check" "FAIL" "Health endpoint ne deluje"
    fi
    
    # Test HTTP preusmeritev (če je domena dostopna)
    print_test "Testiram HTTP preusmeritev..."
    if curl -s --connect-timeout 5 -I "http://$DOMAIN" 2>/dev/null | grep -q "301\|302"; then
        add_test_result "HTTP Redirect" "PASS" "HTTP se preusmeri na HTTPS"
    else
        add_test_result "HTTP Redirect" "WARN" "HTTP preusmeritev ni testirana (domena morda ni dostopna)"
    fi
}

test_https_connectivity() {
    print_header "TESTIRANJE HTTPS POVEZLJIVOSTI"
    
    # Test HTTPS povezava
    print_test "Testiram HTTPS povezavo..."
    if curl -s --connect-timeout 10 -k "https://$DOMAIN" > /dev/null 2>&1; then
        add_test_result "HTTPS Connection" "PASS" "HTTPS povezava deluje"
        
        # Test SSL certifikat preko HTTPS
        print_test "Testiram SSL certifikat preko HTTPS..."
        if curl -s --connect-timeout 10 "https://$DOMAIN" > /dev/null 2>&1; then
            add_test_result "HTTPS SSL Validation" "PASS" "SSL certifikat je veljaven"
        else
            add_test_result "HTTPS SSL Validation" "FAIL" "SSL certifikat ni veljaven"
        fi
        
    else
        add_test_result "HTTPS Connection" "WARN" "HTTPS povezava ni testirana (domena morda ni dostopna)"
    fi
}

test_ssl_renewal() {
    print_header "TESTIRANJE SSL OBNAVLJANJA"
    
    # Test certbot renewal (dry run)
    print_test "Testiram SSL obnavljanje (dry run)..."
    if certbot renew --dry-run &>/dev/null; then
        add_test_result "SSL Renewal Test" "PASS" "Obnavljanje deluje"
    else
        add_test_result "SSL Renewal Test" "FAIL" "Obnavljanje ne deluje"
    fi
    
    # Test cron job za obnavljanje
    print_test "Preverjam cron job za obnavljanje..."
    if crontab -l 2>/dev/null | grep -q certbot || [[ -f "/etc/cron.d/certbot" ]]; then
        add_test_result "SSL Renewal Cron" "PASS" "Cron job je nastavljen"
    else
        add_test_result "SSL Renewal Cron" "WARN" "Cron job ni najden"
    fi
}

test_security_headers() {
    print_header "TESTIRANJE VARNOSTNIH HEADERJEV"
    
    # Test varnostni headerji (če je domena dostopna)
    print_test "Testiram varnostne headerje..."
    
    local headers_response
    if headers_response=$(curl -s --connect-timeout 5 -I "https://$DOMAIN" 2>/dev/null); then
        
        # HSTS header
        if echo "$headers_response" | grep -qi "strict-transport-security"; then
            add_test_result "HSTS Header" "PASS" "HSTS header je prisoten"
        else
            add_test_result "HSTS Header" "FAIL" "HSTS header manjka"
        fi
        
        # X-Frame-Options
        if echo "$headers_response" | grep -qi "x-frame-options"; then
            add_test_result "X-Frame-Options" "PASS" "X-Frame-Options header je prisoten"
        else
            add_test_result "X-Frame-Options" "FAIL" "X-Frame-Options header manjka"
        fi
        
        # X-Content-Type-Options
        if echo "$headers_response" | grep -qi "x-content-type-options"; then
            add_test_result "X-Content-Type-Options" "PASS" "X-Content-Type-Options header je prisoten"
        else
            add_test_result "X-Content-Type-Options" "FAIL" "X-Content-Type-Options header manjka"
        fi
        
    else
        add_test_result "Security Headers" "WARN" "Varnostni headerji niso testirani (domena ni dostopna)"
    fi
}

generate_report() {
    print_header "POROČILO O TESTIRANJU"
    
    local total_tests=$((PASSED_TESTS + FAILED_TESTS))
    local success_rate=0
    
    if [[ $total_tests -gt 0 ]]; then
        success_rate=$(( (PASSED_TESTS * 100) / total_tests ))
    fi
    
    echo -e "${CYAN}Domena:${NC} $DOMAIN"
    echo -e "${CYAN}Skupaj testov:${NC} $total_tests"
    echo -e "${GREEN}Uspešni testi:${NC} $PASSED_TESTS"
    echo -e "${RED}Neuspešni testi:${NC} $FAILED_TESTS"
    echo -e "${CYAN}Uspešnost:${NC} $success_rate%"
    
    echo -e "\n${PURPLE}Podrobni rezultati:${NC}"
    echo "----------------------------------------"
    
    for result in "${TEST_RESULTS[@]}"; do
        IFS='|' read -r test_name test_result test_details <<< "$result"
        
        case $test_result in
            "PASS")
                echo -e "${GREEN}✓${NC} $test_name: $test_details"
                ;;
            "FAIL")
                echo -e "${RED}✗${NC} $test_name: $test_details"
                ;;
            "WARN")
                echo -e "${YELLOW}⚠${NC} $test_name: $test_details"
                ;;
        esac
    done
    
    # Shrani poročilo v datoteko
    local report_file="omni-test-report-$(date +%Y%m%d_%H%M%S).txt"
    {
        echo "OMNI PRODUCTION TEST REPORT"
        echo "=========================="
        echo "Date: $(date)"
        echo "Domain: $DOMAIN"
        echo "Total Tests: $total_tests"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo "Success Rate: $success_rate%"
        echo ""
        echo "Detailed Results:"
        echo "----------------"
        
        for result in "${TEST_RESULTS[@]}"; do
            IFS='|' read -r test_name test_result test_details <<< "$result"
            echo "[$test_result] $test_name: $test_details"
        done
        
    } > "$report_file"
    
    echo -e "\n${BLUE}Poročilo shranjeno v:${NC} $report_file"
    
    # Priporočila
    if [[ $FAILED_TESTS -gt 0 ]]; then
        echo -e "\n${YELLOW}PRIPOROČILA ZA ODPRAVO TEŽAV:${NC}"
        echo "- Preveri logove: sudo journalctl -u nginx -f"
        echo "- Preveri logove: sudo journalctl -u omni -f"
        echo "- Testiraj Nginx: sudo nginx -t"
        echo "- Ponovno zaženi storitve: sudo systemctl restart nginx omni"
        echo "- Preveri SSL: sudo certbot certificates"
    else
        echo -e "\n${GREEN}🎉 VSI TESTI SO USPEŠNI! Omni produkcijski sistem deluje pravilno.${NC}"
    fi
}

# Glavna funkcija
main() {
    print_header "OMNI PRODUCTION SYSTEM TEST"
    echo -e "${CYAN}Testiram domeno:${NC} $DOMAIN"
    echo -e "${CYAN}Datum:${NC} $(date)"
    
    # Zaženi vse teste
    test_system_requirements
    test_services_status
    test_nginx_configuration
    test_ssl_certificate
    test_http_connectivity
    test_https_connectivity
    test_ssl_renewal
    test_security_headers
    
    # Generiraj poročilo
    generate_report
}

# Zaženi glavno funkcijo
main "$@"