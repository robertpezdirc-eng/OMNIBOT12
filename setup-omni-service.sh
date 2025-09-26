#!/bin/bash

# Skripta za nastavitev systemd storitve za Omni Cloud Service
# Uporaba: sudo ./setup-omni-service.sh [python|node]

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

# Nastavi tip aplikacije
APP_TYPE=${1:-"python"}
print_status "Nastavljam Omni storitev za: $APP_TYPE"

# Preveri, če uporabnik omni obstaja
if ! id "omni" &>/dev/null; then
    print_status "Ustvarjam uporabnika 'omni'..."
    useradd -m -s /bin/bash omni
    usermod -aG sudo omni
    print_success "Uporabnik 'omni' ustvarjen"
else
    print_status "Uporabnik 'omni' že obstaja"
fi

# Ustvari potrebne direktorije
print_status "Ustvarjam potrebne direktorije..."
mkdir -p /home/omni
mkdir -p /var/log/omni
chown omni:omni /home/omni
chown omni:omni /var/log/omni

# Kopiraj ustrezno servisno datoteko
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$APP_TYPE" == "node" ]]; then
    SERVICE_SOURCE="$SCRIPT_DIR/omni-node.service"
    SERVICE_NAME="omni-node"
    print_status "Uporabljam Node.js servisno datoteko"
else
    SERVICE_SOURCE="$SCRIPT_DIR/omni.service"
    SERVICE_NAME="omni"
    print_status "Uporabljam Python servisno datoteko"
fi

if [[ ! -f "$SERVICE_SOURCE" ]]; then
    print_error "Servisna datoteka ni najdena: $SERVICE_SOURCE"
    exit 1
fi

# Kopiraj servisno datoteko
print_status "Kopiram servisno datoteko..."
cp "$SERVICE_SOURCE" "/etc/systemd/system/$SERVICE_NAME.service"
print_success "Servisna datoteka kopirana v /etc/systemd/system/$SERVICE_NAME.service"

# Preveri, če aplikacijska datoteka obstaja
if [[ "$APP_TYPE" == "node" ]]; then
    APP_FILE="/home/omni/omni-ultra-main.js"
    RUNTIME_CHECK="node --version"
else
    APP_FILE="/home/omni/omni-ultra-main.py"
    RUNTIME_CHECK="python3 --version"
fi

if [[ ! -f "$APP_FILE" ]]; then
    print_warning "Aplikacijska datoteka ne obstaja: $APP_FILE"
    print_warning "Ustvarjam placeholder datoteko..."
    
    if [[ "$APP_TYPE" == "node" ]]; then
        cat > "$APP_FILE" << 'EOF'
// Placeholder Omni Node.js aplikacija
const http = require('http');
const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <html>
            <head><title>Omni Cloud Service</title></head>
            <body>
                <h1>🧠 Omni Cloud Service</h1>
                <p>Storitev je aktivna in deluje na portu ${port}</p>
                <p>Čas: ${new Date().toISOString()}</p>
                <p><a href="/health">Health Check</a></p>
            </body>
        </html>
    `);
});

// Health check endpoint
server.on('request', (req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
        return;
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`🚀 Omni Cloud Service running on http://127.0.0.1:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
EOF
    else
        cat > "$APP_FILE" << 'EOF'
#!/usr/bin/env python3
"""
Placeholder Omni Python aplikacija
"""

import os
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

class OmniHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            health_data = {
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'uptime': time.time() - start_time
            }
            self.wfile.write(json.dumps(health_data).encode())
        else:
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            html = f"""
            <html>
                <head><title>Omni Cloud Service</title></head>
                <body>
                    <h1>🧠 Omni Cloud Service</h1>
                    <p>Storitev je aktivna in deluje na portu {port}</p>
                    <p>Čas: {datetime.now().isoformat()}</p>
                    <p><a href="/health">Health Check</a></p>
                </body>
            </html>
            """
            self.wfile.write(html.encode())

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    start_time = time.time()
    
    server = HTTPServer(('127.0.0.1', port), OmniHandler)
    print(f'🚀 Omni Cloud Service running on http://127.0.0.1:{port}')
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n📴 Shutting down gracefully')
        server.shutdown()
        print('✅ Server closed')
EOF
    fi
    
    chown omni:omni "$APP_FILE"
    chmod +x "$APP_FILE"
    print_success "Placeholder aplikacija ustvarjena: $APP_FILE"
fi

# Preveri runtime
print_status "Preverjam runtime..."
if $RUNTIME_CHECK &>/dev/null; then
    print_success "Runtime je na voljo: $($RUNTIME_CHECK)"
else
    print_error "Runtime ni na voljo. Namesti ga:"
    if [[ "$APP_TYPE" == "node" ]]; then
        print_error "sudo apt install nodejs npm"
    else
        print_error "sudo apt install python3 python3-pip"
    fi
    exit 1
fi

# Ponovno naloži systemd
print_status "Ponovno nalagam systemd daemon..."
systemctl daemon-reload
print_success "Systemd daemon ponovno naložen"

# Omogoči storitev
print_status "Omogočam storitev $SERVICE_NAME..."
systemctl enable "$SERVICE_NAME.service"
print_success "Storitev $SERVICE_NAME omogočena"

# Zaženi storitev
print_status "Zaganjam storitev $SERVICE_NAME..."
if systemctl start "$SERVICE_NAME.service"; then
    print_success "Storitev $SERVICE_NAME uspešno zagnana"
else
    print_error "Napaka pri zagonu storitve $SERVICE_NAME"
    print_error "Preveri logove z: sudo journalctl -u $SERVICE_NAME -f"
    exit 1
fi

# Počakaj malo in preveri status
sleep 2
print_status "Preverjam status storitve..."

if systemctl is-active --quiet "$SERVICE_NAME.service"; then
    print_success "Storitev $SERVICE_NAME je aktivna in deluje"
    
    # Prikaži osnovne informacije
    echo ""
    print_status "Informacije o storitvi:"
    systemctl status "$SERVICE_NAME.service" --no-pager -l
    
    echo ""
    print_status "Zadnji logovi:"
    journalctl -u "$SERVICE_NAME.service" -n 10 --no-pager
    
else
    print_error "Storitev $SERVICE_NAME ni aktivna"
    print_error "Preveri logove z: sudo journalctl -u $SERVICE_NAME -f"
    exit 1
fi

# Testiraj HTTP povezavo
print_status "Testiram HTTP povezavo..."
sleep 1

if curl -s http://127.0.0.1:8080/health > /dev/null; then
    print_success "HTTP povezava deluje na portu 8080"
    
    # Prikaži health check
    echo ""
    print_status "Health check odziv:"
    curl -s http://127.0.0.1:8080/health | python3 -m json.tool 2>/dev/null || curl -s http://127.0.0.1:8080/health
else
    print_warning "HTTP povezava na portu 8080 ne deluje"
    print_warning "Preveri, če aplikacija posluša na pravilnem portu"
fi

# Prikaži koristne ukaze
echo ""
print_status "Koristni ukazi za upravljanje storitve:"
echo "  - Preveri status: sudo systemctl status $SERVICE_NAME"
echo "  - Zaženi storitev: sudo systemctl start $SERVICE_NAME"
echo "  - Ustavi storitev: sudo systemctl stop $SERVICE_NAME"
echo "  - Ponovno zaženi: sudo systemctl restart $SERVICE_NAME"
echo "  - Preveri logove: sudo journalctl -u $SERVICE_NAME -f"
echo "  - Onemogoči storitev: sudo systemctl disable $SERVICE_NAME"

echo ""
print_status "Testiranje:"
echo "  - HTTP test: curl -I http://127.0.0.1:8080"
echo "  - Health check: curl http://127.0.0.1:8080/health"

print_success "Omni storitev ($SERVICE_NAME) je uspešno nastavljena in deluje! 🚀"