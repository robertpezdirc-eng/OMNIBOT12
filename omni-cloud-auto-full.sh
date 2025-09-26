#!/bin/bash
# omni-cloud-auto-full.sh
# Popolnoma avtomatska migracija Omni v oblak z avtomatskim prenosom datotek
# Podpira prenos iz lokalnega HTTP strežnika ali GitHub repozitorija

set -e  # Ustavi ob prvi napaki

# --- Barve za lepši izpis ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Funkcije za izpis ---
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- Preveri root uporabnika ---
if [[ $EUID -ne 0 ]]; then
   log_error "Ta skripta mora biti zagnana kot root (sudo)"
   exit 1
fi

# --- Parametri ---
DOMAIN="$1"
EMAIL="$2"
SOURCE="$3"
LOCAL_IP="$4"
GITHUB_REPO="$5"

# --- Pomoč ---
show_help() {
    echo "Uporaba: ./omni-cloud-auto-full.sh [domena] [email] [source] [opcijski_parametri]"
    echo ""
    echo "Parametri:"
    echo "  domena          - Tvoja domena (npr. moja-domena.com)"
    echo "  email           - Email za SSL certifikate"
    echo "  source          - 'local' ali 'github'"
    echo "  local_ip        - IP lokalnega računalnika (samo za 'local')"
    echo "  github_repo     - GitHub repozitorij URL (samo za 'github')"
    echo ""
    echo "Primeri:"
    echo "  ./omni-cloud-auto-full.sh moja-domena.com admin@example.com local 192.168.1.10"
    echo "  ./omni-cloud-auto-full.sh moja-domena.com admin@example.com github https://github.com/user/repo.git"
}

if [[ -z "$DOMAIN" || -z "$EMAIL" || -z "$SOURCE" ]]; then
    show_help
    exit 1
fi

# --- Začetek migracije ---
log_info "🚀 Začenjam popolnoma avtomatsko migracijo Omni v oblak..."
log_info "Domena: $DOMAIN"
log_info "Email: $EMAIL"
log_info "Vir: $SOURCE"

# --- Posodobi sistem ---
log_info "📦 Posodabljam sistem in nameščam odvisnosti..."
apt update -y && apt upgrade -y
apt install -y python3 python3-pip python3-venv nodejs npm nginx git curl wget \
               certbot python3-certbot-nginx sqlite3 htop unzip zip \
               software-properties-common apt-transport-https ca-certificates \
               gnupg lsb-release ufw fail2ban

# --- Ustvari uporabnika omni ---
if ! id "omni" &>/dev/null; then
    useradd -m -s /bin/bash omni
    usermod -aG sudo omni
    log_success "Uporabnik 'omni' ustvarjen"
fi

# --- Ustvari direktorije ---
log_info "📁 Ustvarjam direktorije..."
mkdir -p /opt/omni/{app,logs,backups,config,data,ssl}
mkdir -p /var/log/omni
mkdir -p /etc/omni

# --- Prenos datotek ---
cd /opt/omni/app

if [[ "$SOURCE" == "local" ]]; then
    if [[ -z "$LOCAL_IP" ]]; then
        log_error "Za lokalni prenos potrebuješ IP naslov lokalnega računalnika"
        exit 1
    fi
    
    log_info "📥 Prenašam datoteke iz lokalnega računalnika ($LOCAL_IP:3000)..."
    
    # Preveri ali je lokalni strežnik dostopen
    if ! curl -s --connect-timeout 5 "http://$LOCAL_IP:3000" > /dev/null; then
        log_error "Lokalni HTTP strežnik ni dostopen na $LOCAL_IP:3000"
        log_info "Zagotovi, da je na lokalnem računalniku zagnan: python -m http.server 3000"
        exit 1
    fi
    
    # Prenesi glavne datoteke
    FILES=(
        "main.py"
        "omni.py"
        "omni_core.py"
        "omni_core_ai.py"
        "package.json"
        "requirements.txt"
        "config.json"
        "nginx-omni.conf"
        "threo-cloud-migration.sh"
        "systemd-services-setup.sh"
        "manage-services.sh"
        "cloud-backup-system.py"
        "cloud-monitoring-system.py"
        "migration-validator.py"
    )
    
    for file in "${FILES[@]}"; do
        if wget -q "http://$LOCAL_IP:3000/$file" 2>/dev/null; then
            log_success "Prenešeno: $file"
        else
            log_warning "Ni mogoče prenesti: $file (morda ne obstaja)"
        fi
    done
    
    # Prenesi direktorije
    DIRS=("omni" "client" "server" "public" "api" "utils" "scripts")
    for dir in "${DIRS[@]}"; do
        if wget -q -r -np -nH --cut-dirs=1 -R "index.html*" "http://$LOCAL_IP:3000/$dir/" 2>/dev/null; then
            log_success "Prenešen direktorij: $dir"
        else
            log_warning "Ni mogoče prenesti direktorija: $dir"
        fi
    done

elif [[ "$SOURCE" == "github" ]]; then
    if [[ -z "$GITHUB_REPO" ]]; then
        GITHUB_REPO="https://github.com/username/omniscient-ai-platform.git"
        log_warning "GitHub repozitorij ni podan, uporabljam privzeti: $GITHUB_REPO"
    fi
    
    log_info "📥 Kloniram iz GitHub repozitorija: $GITHUB_REPO"
    
    if git clone "$GITHUB_REPO" . 2>/dev/null; then
        log_success "Uspešno klonirano iz GitHub"
    else
        log_error "Napaka pri kloniranju iz GitHub. Preveri URL repozitorija."
        exit 1
    fi
    
else
    log_error "Neveljavna opcija source. Uporabi 'local' ali 'github'."
    exit 1
fi

# --- Ustvari requirements.txt če ne obstaja ---
if [[ ! -f "requirements.txt" ]]; then
    log_info "📝 Ustvarjam requirements.txt..."
    cat > requirements.txt <<EOL
flask==2.3.3
flask-cors==4.0.0
flask-socketio==5.3.6
requests==2.31.0
python-dotenv==1.0.0
sqlite3
psutil==5.9.5
schedule==1.2.0
cryptography==41.0.4
jwt==1.3.1
bcrypt==4.0.1
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0
transformers==4.33.2
torch==2.0.1
openai==0.28.0
anthropic==0.3.11
google-generativeai==0.1.0
EOL
fi

# --- Python virtualno okolje ---
log_info "🐍 Nastavljam Python virtualno okolje..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# --- Node.js odvisnosti ---
if [[ -f "package.json" ]]; then
    log_info "📦 Nameščam Node.js odvisnosti..."
    npm install
fi

# --- Konfiguracija Nginx ---
log_info "🌐 Konfiguriram Nginx..."

# Uporabi obstoječo nginx-omni.conf ali ustvari novo
if [[ -f "nginx-omni.conf" ]]; then
    cp nginx-omni.conf /etc/nginx/sites-available/omni
else
    cat > /etc/nginx/sites-available/omni <<EOL
# Omni Cloud Configuration
upstream omni_app {
    server 127.0.0.1:8080;
    keepalive 32;
}

upstream angel_integration {
    server 127.0.0.1:8081;
}

upstream angel_monitoring {
    server 127.0.0.1:8082;
}

upstream angel_tasks {
    server 127.0.0.1:8083;
}

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;

server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Main application
    location / {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://omni_app;
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

    # Angel Integration API
    location /api/angel/integration/ {
        proxy_pass http://angel_integration/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Angel Monitoring Dashboard
    location /monitoring/ {
        proxy_pass http://angel_monitoring/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Angel Task Distribution
    location /api/tasks/ {
        proxy_pass http://angel_tasks/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files
    location /static/ {
        alias /opt/omni/app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security - block access to sensitive files
    location ~ /\\.ht {
        deny all;
    }
    
    location ~ /\\.(env|git) {
        deny all;
    }
}
EOL
fi

# Aktiviraj Nginx konfiguracijo
ln -sf /etc/nginx/sites-available/omni /etc/nginx/sites-enabled/omni
rm -f /etc/nginx/sites-enabled/default

# Preveri Nginx konfiguracijo
if nginx -t; then
    systemctl restart nginx
    log_success "Nginx konfiguriran in zagnan"
else
    log_error "Napaka v Nginx konfiguraciji"
    exit 1
fi

# --- SSL certifikat z Let's Encrypt ---
log_info "🔒 Pridobivam SSL certifikat z Let's Encrypt..."

# Počakaj, da se DNS propagira
log_info "Preverjam DNS propagacijo za $DOMAIN..."
for i in {1..30}; do
    if nslookup $DOMAIN > /dev/null 2>&1; then
        log_success "DNS je propagiran"
        break
    fi
    if [[ $i -eq 30 ]]; then
        log_warning "DNS morda še ni popolnoma propagiran, poskušam z SSL..."
    fi
    sleep 2
done

# Pridobi SSL certifikat
if certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect; then
    log_success "SSL certifikat uspešno pridobljen"
    
    # Nastavi avtomatsko podaljševanje
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
else
    log_warning "SSL certifikat ni bil pridobljen. Aplikacija bo delovala preko HTTP."
fi

# --- Systemd storitve ---
log_info "⚙️ Ustvarjam systemd storitve..."

# Glavna Omni storitev
cat > /etc/systemd/system/omni.service <<EOL
[Unit]
Description=Omni AI Platform
After=network.target
Wants=network.target

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni/app
Environment=PATH=/opt/omni/app/venv/bin
ExecStart=/opt/omni/app/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=omni

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/omni /var/log/omni

[Install]
WantedBy=multi-user.target
EOL

# Angel Integration storitev
cat > /etc/systemd/system/angel-integration.service <<EOL
[Unit]
Description=Angel Integration Service
After=network.target omni.service
Wants=omni.service

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni/app
Environment=PATH=/opt/omni/app/venv/bin
Environment=PORT=8081
ExecStart=/opt/omni/app/venv/bin/python -c "
import sys
sys.path.append('/opt/omni/app')
from omni.ai.angel_integration import AngelIntegrationServer
server = AngelIntegrationServer()
server.run(host='127.0.0.1', port=8081)
"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

# Angel Monitoring storitev
cat > /etc/systemd/system/angel-monitoring.service <<EOL
[Unit]
Description=Angel Monitoring Dashboard
After=network.target omni.service
Wants=omni.service

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni/app
Environment=PATH=/opt/omni/app/venv/bin
Environment=PORT=8082
ExecStart=/opt/omni/app/venv/bin/python cloud-monitoring-system.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

# Angel Task Distribution storitev
cat > /etc/systemd/system/angel-tasks.service <<EOL
[Unit]
Description=Angel Task Distribution
After=network.target omni.service
Wants=omni.service

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni/app
Environment=PATH=/opt/omni/app/venv/bin
Environment=PORT=8083
ExecStart=/opt/omni/app/venv/bin/python -c "
import sys
sys.path.append('/opt/omni/app')
from omni.ai.task_distribution import TaskDistributionServer
server = TaskDistributionServer()
server.run(host='127.0.0.1', port=8083)
"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

# Backup storitev
cat > /etc/systemd/system/omni-backup.service <<EOL
[Unit]
Description=Omni Backup Service
After=network.target

[Service]
Type=oneshot
User=omni
Group=omni
WorkingDirectory=/opt/omni/app
Environment=PATH=/opt/omni/app/venv/bin
ExecStart=/opt/omni/app/venv/bin/python cloud-backup-system.py backup
EOL

cat > /etc/systemd/system/omni-backup.timer <<EOL
[Unit]
Description=Daily Omni Backup
Requires=omni-backup.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOL

# Omni platform target za skupno upravljanje
cat > /etc/systemd/system/omni-platform.target <<EOL
[Unit]
Description=Omni AI Platform Services
Wants=omni.service angel-integration.service angel-monitoring.service angel-tasks.service
After=omni.service

[Install]
WantedBy=multi-user.target
EOL

# Nastavi lastništvo
chown -R omni:omni /opt/omni
chmod +x /opt/omni/app/*.py 2>/dev/null || true

# Znova naloži systemd in zaženi storitve
systemctl daemon-reload

# Omogoči in zaženi storitve
systemctl enable omni.service
systemctl enable angel-integration.service
systemctl enable angel-monitoring.service
systemctl enable angel-tasks.service
systemctl enable omni-backup.timer
systemctl enable omni-platform.target

systemctl start omni.service
sleep 5
systemctl start angel-integration.service
systemctl start angel-monitoring.service
systemctl start angel-tasks.service
systemctl start omni-backup.timer

log_success "Vse storitve so zagnane"

# --- Backup in monitoring ---
log_info "💾 Nastavljam backup in monitoring..."

if [[ -f "cloud-backup-system.py" ]]; then
    python3 cloud-backup-system.py schedule
    log_success "Backup sistem nastavljen"
fi

if [[ -f "cloud-monitoring-system.py" ]]; then
    nohup python3 cloud-monitoring-system.py > /var/log/omni/monitoring.log 2>&1 &
    log_success "Monitoring sistem zagnan"
fi

# --- Firewall konfiguracija ---
log_info "🔥 Konfiguriram firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443

# --- Validacija migracije ---
log_info "✅ Izvajam validacijo migracije..."

# Počakaj, da se storitve stabilizirajo
sleep 10

# Preveri storitve
SERVICES=("omni" "angel-integration" "angel-monitoring" "angel-tasks" "nginx")
ALL_OK=true

for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet $service; then
        log_success "Storitev $service je aktivna"
    else
        log_error "Storitev $service ni aktivna"
        ALL_OK=false
    fi
done

# Preveri porte
PORTS=("80" "443" "8080" "8081" "8082" "8083")
for port in "${PORTS[@]}"; do
    if netstat -tuln | grep -q ":$port "; then
        log_success "Port $port je aktiven"
    else
        log_warning "Port $port ni aktiven"
    fi
done

# Preveri SSL
if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    log_success "SSL certifikat je nameščen"
else
    log_warning "SSL certifikat ni nameščen"
fi

# Preveri dostopnost
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080" | grep -q "200\|302\|404"; then
    log_success "Omni aplikacija se odziva"
else
    log_warning "Omni aplikacija se ne odziva pravilno"
fi

# Zaženi validacijski sistem če obstaja
if [[ -f "migration-validator.py" ]]; then
    log_info "Zaganjam podrobno validacijo..."
    python3 migration-validator.py --domain $DOMAIN --format human
    VALIDATION_EXIT_CODE=$?
    
    if [[ $VALIDATION_EXIT_CODE -eq 0 ]]; then
        log_success "Validacija uspešna!"
        MIGRATION_STATUS="SUCCESS"
    else
        log_warning "Validacija pokazala opozorila"
        MIGRATION_STATUS="PARTIAL_SUCCESS"
    fi
else
    log_warning "Validacijska skripta ni najdena"
    MIGRATION_STATUS="UNKNOWN"
fi

# --- Poročilo o uspešnosti migracije ---
log_info "📊 Generiranje poročila o uspešnosti migracije..."
if [[ -f "migration-success-reporter.py" ]]; then
    # Generiraj podrobno poročilo
    python3 migration-success-reporter.py --domain "$DOMAIN" --format both --save "/opt/omni/migration-report-$(date +%Y%m%d_%H%M%S).json"
    REPORTER_EXIT_CODE=$?
    
    # Pošlji e-poštno poročilo če je email podan
    if [[ -n "$EMAIL" ]]; then
        python3 migration-success-reporter.py --domain "$DOMAIN" --email "$EMAIL" --send-email --format human
    fi
    
    log_success "Poročilo o migraciji generirano!"
else
    log_warning "Migration success reporter ni najden"
fi

# --- Končno poročilo ---
echo ""
echo "🎉 OMNI AI PLATFORM - MIGRACIJA ZAKLJUČENA!"
echo "=============================================="
echo ""
echo "📅 Datum migracije: $(date)"
echo "🌐 Domena: $DOMAIN"
echo "📊 Status: $MIGRATION_STATUS"
echo ""
echo "🌐 Dostopne storitve:"
echo "   • Glavna aplikacija: https://$DOMAIN"
echo "   • Admin dashboard: https://$DOMAIN/admin"
echo "   • API endpoints: https://$DOMAIN/api"
echo "   • Angel Integration: https://$DOMAIN/api/angel/integration/"
echo "   • Monitoring Dashboard: https://$DOMAIN/monitoring/"
echo "   • Task Management: https://$DOMAIN/api/tasks/"
echo ""
echo "🔧 Upravljanje sistema:"
echo "   • Status vseh storitev: systemctl status omni-platform.target"
echo "   • Restart vseh storitev: systemctl restart omni-platform.target"
echo "   • Preveri logove: journalctl -u omni -f"
echo "   • Backup status: systemctl status omni-backup.timer"
echo ""
echo "📊 Monitoring in poročila:"
echo "   • Poročila shranjene v: /opt/omni/migration-report-*.json"
echo "   • Monitoring dashboard: https://$DOMAIN/monitoring/"
echo "   • Backup datoteke: /opt/omni/backups/"
echo ""
echo "🛡️ Varnostne funkcionalnosti:"
echo "   • SSL certifikat: Let's Encrypt (avtomatsko podaljševanje)"
echo "   • Firewall: UFW aktiven (SSH, HTTP, HTTPS)"
echo "   • Fail2ban: Zaščita pred brute-force napadi"
echo "   • Security headers: Nginx varnostni headerji"
echo ""
echo "📞 Podpora:"
echo "   • Dokumentacija: /opt/omni/app/docs/"
echo "   • GitHub Issues: https://github.com/username/omniscient-ai-platform/issues"
echo "   • Email: support@omni-platform.com"
echo ""

if [[ "$MIGRATION_STATUS" == "SUCCESS" ]]; then
    echo "✅ Migracija je bila popolnoma uspešna!"
    echo "   Vsi sistemi delujejo pravilno in so pripravljeni za produkcijo."
elif [[ "$MIGRATION_STATUS" == "PARTIAL_SUCCESS" ]]; then
    echo "⚠️ Migracija je bila delno uspešna."
    echo "   Glavna aplikacija deluje, vendar preverite opozorila zgoraj."
else
    echo "❌ Migracija ni bila popolnoma uspešna."
    echo "   Preverite napake in poženite validacijo ponovno."
fi

echo ""
echo "🚀 Omni AI Platform je pripravljena za uporabo!"
echo "=============================================="

if [[ "$ALL_OK" == true ]]; then
    exit 0
else
    log_warning "Nekatere komponente morda ne delujejo pravilno. Preveri logove."
    exit 1
fi