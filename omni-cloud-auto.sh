#!/bin/bash
# 🔹 Omni Cloud Auto Migration Script
# Avtomatska namestitev Omni v oblak, SSL, Angels, backup, monitoring
# Verzija: 2.0 - Popolnoma avtomatska migracija

set -e  # Ustavi ob napaki

# Barve za output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcija za logiranje
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
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

# Banner
echo -e "${BLUE}"
echo "════════════════════════════════════════════════════════════════"
echo "🌍 OMNI CLOUD AUTO MIGRATION SCRIPT"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Preveri če je root
if [[ $EUID -ne 0 ]]; then
   error "Ta skripta mora biti zagnana kot root (sudo)"
fi

# --- 1️⃣ Sistemska priprava ---
log "1️⃣ Posodabljam sistem..."
apt update && apt upgrade -y || error "Napaka pri posodobitvi sistema"

# --- 2️⃣ Namestitev odvisnosti ---
log "2️⃣ Nameščam odvisnosti..."
apt install -y python3 python3-pip python3-venv git nginx certbot python3-certbot-nginx \
    curl wget unzip nodejs npm ufw fail2ban htop tree || error "Napaka pri namestitvi odvisnosti"

# --- 3️⃣ Konfiguracija firewall ---
log "3️⃣ Konfiguriram firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw reload

# --- 4️⃣ Vnos podatkov ---
echo -e "${YELLOW}"
echo "════════════════════════════════════════════════════════════════"
echo "📝 VNOS PODATKOV ZA MIGRACIJO"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

read -p "🌐 Vnesi domeno za Omni (npr. moja-domena.com): " DOMAIN
read -p "📧 Vnesi email za SSL certifikate: " EMAIL

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
    error "Domena in email sta obvezna!"
fi

log "Domena: $DOMAIN"
log "Email: $EMAIL"

# --- 5️⃣ Prenos Omni ---
log "5️⃣ Prenašam Omni aplikacijo..."
if [ -d "/opt/omni" ]; then
    warning "Direktorij /opt/omni že obstaja, brišem..."
    rm -rf /opt/omni
fi

# Ustvari lokalno kopijo namesto kloniranja
mkdir -p /opt/omni
cp -r /root/omni-source/* /opt/omni/ 2>/dev/null || {
    log "Kopiram trenutno Omni aplikacijo..."
    # Če ni source direktorija, uporabi trenutni direktorij
    CURRENT_DIR=$(pwd)
    cp -r "$CURRENT_DIR"/* /opt/omni/ 2>/dev/null || error "Napaka pri kopiranju Omni aplikacije"
}

cd /opt/omni

# --- 6️⃣ Python virtualno okolje ---
log "6️⃣ Ustvarjam Python virtualno okolje..."
python3 -m venv venv
source venv/bin/activate

# Namesti Python odvisnosti
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    log "Nameščam osnovne Python odvisnosti..."
    pip install flask fastapi uvicorn requests numpy pandas scikit-learn tensorflow torch
fi

# --- 7️⃣ Nginx konfiguracija ---
log "7️⃣ Konfiguriram Nginx..."
cat > /etc/nginx/sites-available/omni <<EOL
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Preusmeritev na HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL konfiguracija (bo dodana s Certbot)
    
    # Varnostni headerji
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Glavna aplikacija
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    # Angel API endpoints
    location /api/angels/ {
        proxy_pass http://localhost:8081;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Monitoring endpoint
    location /monitoring/ {
        proxy_pass http://localhost:8082;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Statične datoteke
    location /static/ {
        alias /opt/omni/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOL

# Omogoči site
ln -sf /etc/nginx/sites-available/omni /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Preveri konfiguraciju
nginx -t || error "Napaka v Nginx konfiguraciji"
systemctl restart nginx

# --- 8️⃣ SSL certifikat ---
log "8️⃣ Pridobivam SSL certifikat..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL || {
    warning "SSL certifikat ni bil uspešno pridobljen, poskušam brez www..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL || error "Napaka pri pridobivanju SSL certifikata"
}

# Avtomatsko podaljševanje
systemctl enable certbot.timer
systemctl start certbot.timer

# --- 9️⃣ Systemd storitve ---
log "9️⃣ Ustvarjam systemd storitve..."

# Glavna Omni storitev
cat > /etc/systemd/system/omni.service <<EOL
[Unit]
Description=Omni Ultra Brain Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin
ExecStart=/opt/omni/venv/bin/python /opt/omni/main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOL

# Angel Integration storitev
cat > /etc/systemd/system/omni-angels.service <<EOL
[Unit]
Description=Omni Angels Integration System
After=network.target omni.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin
ExecStart=/usr/bin/node /opt/omni/angel-integration-system.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOL

# Monitoring storitev
cat > /etc/systemd/system/omni-monitoring.service <<EOL
[Unit]
Description=Omni Monitoring System
After=network.target omni.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin
ExecStart=/opt/omni/venv/bin/python /opt/omni/omni-backup-monitoring.py
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd
systemctl daemon-reload

# --- 🔟 Aktivacija Angel sistemov ---
log "🔟 Aktiviram Angel sisteme..."

# Zagoni Node.js Angel sisteme v ozadju
nohup node /opt/omni/angel-task-distribution-system.js > /var/log/omni-task-distribution.log 2>&1 &
nohup node /opt/omni/angel-synchronization-module.js > /var/log/omni-synchronization.log 2>&1 &
nohup node /opt/omni/angel-monitoring-system.js > /var/log/omni-angel-monitoring.log 2>&1 &

# --- 1️⃣1️⃣ Backup sistem ---
log "1️⃣1️⃣ Konfiguriram backup sistem..."

# Ustvari backup direktorij
mkdir -p /opt/omni-backups/{daily,weekly,monthly}

# Backup skripta
cat > /opt/omni/backup-script.sh <<'EOL'
#!/bin/bash
BACKUP_DIR="/opt/omni-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Dnevni backup
tar -czf "$BACKUP_DIR/daily/omni-backup-$DATE.tar.gz" \
    --exclude='/opt/omni/venv' \
    --exclude='/opt/omni/node_modules' \
    --exclude='/opt/omni/__pycache__' \
    /opt/omni

# Ohrani samo zadnjih 7 dnevnih backupov
find "$BACKUP_DIR/daily" -name "*.tar.gz" -mtime +7 -delete

# Tedenski backup (vsako nedeljo)
if [ $(date +%u) -eq 7 ]; then
    cp "$BACKUP_DIR/daily/omni-backup-$DATE.tar.gz" "$BACKUP_DIR/weekly/"
    find "$BACKUP_DIR/weekly" -name "*.tar.gz" -mtime +28 -delete
fi

# Mesečni backup (1. dan v mesecu)
if [ $(date +%d) -eq 01 ]; then
    cp "$BACKUP_DIR/daily/omni-backup-$DATE.tar.gz" "$BACKUP_DIR/monthly/"
    find "$BACKUP_DIR/monthly" -name "*.tar.gz" -mtime +365 -delete
fi
EOL

chmod +x /opt/omni/backup-script.sh

# Cron job za backup
echo "0 2 * * * /opt/omni/backup-script.sh" | crontab -

# --- 1️⃣2️⃣ Zagon storitev ---
log "1️⃣2️⃣ Zaganjam storitve..."

systemctl enable omni.service
systemctl enable omni-angels.service
systemctl enable omni-monitoring.service

systemctl start omni.service
sleep 5
systemctl start omni-angels.service
sleep 3
systemctl start omni-monitoring.service

# --- 1️⃣3️⃣ Validacija ---
log "1️⃣3️⃣ Izvajam validacijo migracije..."

# Počakaj da se storitve zaženejo
sleep 10

# Preveri storitve
if systemctl is-active --quiet omni.service; then
    log "✅ Omni storitev je aktivna"
else
    error "❌ Omni storitev ni aktivna"
fi

# Preveri dostopnost
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200\|301\|302"; then
    log "✅ Omni je dostopen na https://$DOMAIN"
else
    warning "⚠️ Omni morda še ni popolnoma dostopen, počakaj nekaj minut"
fi

# Preveri SSL
if curl -s -I "https://$DOMAIN" | grep -q "HTTP/2 200\|HTTP/1.1 200"; then
    log "✅ SSL certifikat deluje"
else
    warning "⚠️ SSL certifikat morda še ni aktiven"
fi

# --- 1️⃣4️⃣ Zaključek ---
echo -e "${GREEN}"
echo "════════════════════════════════════════════════════════════════"
echo "🎉 MIGRACIJA DOKONČANA!"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

log "🌐 Omni je sedaj dostopen na: https://$DOMAIN"
log "📊 Monitoring: https://$DOMAIN/monitoring/"
log "👼 Angel Dashboard: https://$DOMAIN/api/angels/status"
log "🔒 SSL certifikat: Avtomatsko podaljševanje aktivno"
log "💾 Backup: Dnevni ob 2:00"

echo -e "${BLUE}"
echo "📋 SISTEMSKE INFORMACIJE:"
echo "• Glavna aplikacija: Port 8080"
echo "• Angel sistemi: Port 8081"
echo "• Monitoring: Port 8082"
echo "• Backup lokacija: /opt/omni-backups/"
echo "• Logi: journalctl -u omni.service -f"
echo -e "${NC}"

echo -e "${YELLOW}"
echo "⚠️ POMEMBNO:"
echo "• Počakaj 2-3 minute, da se vsi sistemi popolnoma zaženejo"
echo "• Preveri status z: systemctl status omni.service"
echo "• Za troubleshooting: journalctl -u omni.service -f"
echo -e "${NC}"

log "✅ Avtomatska migracija Omni v oblak je uspešno dokončana!"