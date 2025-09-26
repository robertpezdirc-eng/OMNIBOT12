#!/bin/bash

# 🚀 OMNI-BRAIN-MAXI-ULTRA Avtomatska Posodobitev
# Skripta za avtomatsko posodabljanje sistema na Linux/Unix

set -e  # Ustavi ob napaki

# 📋 Parametri
FORCE=false
BACKUP_FIRST=false
RESTART_SERVICES=false
BRANCH="main"
VERBOSE=false

# 🎨 Barvne funkcije
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}$1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }
print_error() { echo -e "${RED}$1${NC}"; }
print_info() { echo -e "${CYAN}$1${NC}"; }

# 📋 Obdelaj parametre
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --backup)
            BACKUP_FIRST=true
            shift
            ;;
        --restart)
            RESTART_SERVICES=true
            shift
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "OMNI-BRAIN-MAXI-ULTRA Avtomatska Posodobitev"
            echo ""
            echo "Uporaba: $0 [OPCIJE]"
            echo ""
            echo "Opcije:"
            echo "  --force      Nadaljuj kljub napakam"
            echo "  --backup     Ustvari backup pred posodobitvijo"
            echo "  --restart    Ponovno zaženi storitve"
            echo "  --branch     Git veja za posodobitev (privzeto: main)"
            echo "  --verbose    Podroben izpis"
            echo "  -h, --help   Prikaži to pomoč"
            exit 0
            ;;
        *)
            print_error "❌ Neznan parameter: $1"
            exit 1
            ;;
    esac
done

print_info "🚀 OMNI-BRAIN-MAXI-ULTRA Avtomatska Posodobitev"
print_info "================================================"

# 📁 Nastavi direktorije
OMNI_DIR="/opt/omni-brain"
BACKUP_DIR="/opt/omni-brain-backups"
LOG_FILE="$OMNI_DIR/logs/update.log"

# 🔍 Preveri če obstaja OMNI direktorij
if [ ! -d "$OMNI_DIR" ]; then
    print_error "❌ OMNI-BRAIN direktorij ne obstaja: $OMNI_DIR"
    print_info "Najprej zaženi deploy-omni.sh za namestitev."
    exit 1
fi

cd "$OMNI_DIR"

# 📝 Funkcija za beleženje
write_log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "$LOG_FILE"
    if [ "$VERBOSE" = true ]; then
        print_info "[$timestamp] $message"
    fi
}

# 🔐 Preveri root pravice
if [ "$EUID" -ne 0 ]; then
    print_error "❌ Ta skripta zahteva root pravice!"
    print_info "Zaženi z: sudo $0"
    exit 1
fi

write_log "🚀 Začetek posodobitve OMNI-BRAIN sistema"

# 🛑 Ustavi storitve
print_info "⏹️ Ustavljam OMNI-BRAIN storitve..."
if systemctl is-active --quiet omni-brain; then
    systemctl stop omni-brain
    print_success "✅ OMNI-BRAIN storitev ustavljena"
    write_log "OMNI-BRAIN storitev ustavljena"
else
    print_warning "⚠️ OMNI-BRAIN storitev ni bila aktivna"
    write_log "OMNI-BRAIN storitev ni bila aktivna"
fi

# Ustavi PM2 procese če obstajajo
if command -v pm2 &> /dev/null; then
    pm2 stop omni-brain 2>/dev/null || true
    print_info "PM2 procesi ustavljeni"
fi

# 💾 Ustvari backup če je zahtevano
if [ "$BACKUP_FIRST" = true ]; then
    print_info "💾 Ustvarjam backup pred posodobitvijo..."
    backup_name="omni-backup-$(date '+%Y%m%d-%H%M%S')"
    backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup kode
    cp -r "$OMNI_DIR" "$backup_path"
    
    # Backup MongoDB
    if command -v mongodump &> /dev/null; then
        mongo_backup_path="$backup_path/mongodb-backup"
        mkdir -p "$mongo_backup_path"
        mongodump --db omni_brain --out "$mongo_backup_path"
        print_success "✅ MongoDB backup ustvarjen"
    fi
    
    print_success "✅ Backup ustvarjen: $backup_path"
    write_log "Backup ustvarjen: $backup_path"
fi

# 🔄 Posodobi Git repozitorij
print_info "🔄 Posodabljam Git repozitorij..."

# Shrani lokalne spremembe
git stash push -m "Auto-stash before update $(date '+%Y-%m-%d %H:%M:%S')" || true

# Prenesi najnovejše spremembe
git fetch origin

# Preveri če so na voljo posodobitve
local_commit=$(git rev-parse HEAD)
remote_commit=$(git rev-parse "origin/$BRANCH")

if [ "$local_commit" = "$remote_commit" ]; then
    print_success "✅ Sistem je že posodobljen na najnovejšo različico"
    write_log "Sistem že posodobljen"
    
    # Zaženi storitve
    systemctl start omni-brain
    print_success "✅ OMNI-BRAIN storitev ponovno zagnana"
    exit 0
fi

print_info "📥 Najdene nove posodobitve, posodabljam..."
git checkout "$BRANCH"
git pull origin "$BRANCH"

print_success "✅ Git repozitorij posodobljen"
write_log "Git repozitorij posodobljen"

# 📦 Posodobi Node.js odvisnosti
print_info "📦 Posodabljam Node.js odvisnosti..."
npm ci --production
print_success "✅ Node.js odvisnosti posodobljene"
write_log "Node.js odvisnosti posodobljene"

# 🔧 Posodobi konfiguracije
print_info "🔧 Preverjam konfiguracije..."
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    cp .env.example .env
    print_info "📝 Ustvarjena .env datoteka iz predloge"
    write_log ".env datoteka ustvarjena"
elif [ -f ".env" ]; then
    print_info "📝 .env datoteka že obstaja, preveri ročno za nove nastavitve"
    write_log ".env datoteka že obstaja"
fi

# 🗄️ Posodobi bazo podatkov (migracije)
print_info "🗄️ Preverjam potrebne migracije baze podatkov..."
if [ -d "migrations" ]; then
    print_info "🔄 Izvajam migracije baze podatkov..."
    node migrations/run-migrations.js || print_warning "⚠️ Napaka pri migracijah"
    print_success "✅ Migracije baze podatkov izvedene"
    write_log "Migracije baze podatkov izvedene"
fi

# 🔧 Posodobi sistemske datoteke
print_info "🔧 Posodabljam sistemske datoteke..."

# Posodobi systemd service datoteko
if [ -f "scripts/omni-brain.service" ]; then
    cp scripts/omni-brain.service /etc/systemd/system/
    systemctl daemon-reload
    print_success "✅ Systemd service datoteka posodobljena"
fi

# 🚀 Zaženi storitve
print_info "🚀 Zaganjam OMNI-BRAIN storitve..."

# Zaženi systemd storitev
systemctl start omni-brain
systemctl enable omni-brain

# Zaženi PM2 če je konfiguriran
if [ -f "ecosystem.config.js" ] && command -v pm2 &> /dev/null; then
    pm2 start ecosystem.config.js
    pm2 save
    print_info "PM2 procesi zagnani"
fi

sleep 5

# Preveri status storitve
if systemctl is-active --quiet omni-brain; then
    print_success "✅ OMNI-BRAIN storitev uspešno zagnana"
    write_log "OMNI-BRAIN storitev zagnana"
else
    print_error "❌ OMNI-BRAIN storitev se ni uspešno zagnala"
    write_log "Napaka pri zagonu storitve"
    systemctl status omni-brain --no-pager
fi

# 🧪 Preveri delovanje sistema
print_info "🧪 Preverjam delovanje sistema..."
sleep 10

if curl -f -s http://localhost:3000/api/health > /dev/null; then
    print_success "✅ Sistem deluje pravilno"
    write_log "Sistem deluje pravilno"
else
    print_warning "⚠️ Sistem morda ne deluje pravilno"
    write_log "Sistem morda ne deluje pravilno"
fi

# 🔥 Nastavi firewall pravila
print_info "🔥 Preverjam firewall nastavitve..."
if command -v ufw &> /dev/null; then
    ufw allow 3000/tcp
    ufw allow 3001/tcp
    print_info "UFW pravila posodobljena"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --permanent --add-port=3001/tcp
    firewall-cmd --reload
    print_info "Firewalld pravila posodobljena"
fi

# 📊 Prikaži povzetek
print_info ""
print_info "📊 POVZETEK POSODOBITVE"
print_info "======================"
print_success "✅ Posodobitev OMNI-BRAIN sistema dokončana"
print_info "📅 Čas posodobitve: $(date '+%Y-%m-%d %H:%M:%S')"
print_info "🌐 Dostop: http://localhost:3000"
print_info "📋 Admin Dashboard: http://localhost:3000/admin"
print_info "📝 Dnevnik posodobitve: $LOG_FILE"

if [ "$BACKUP_FIRST" = true ]; then
    print_info "💾 Backup lokacija: $backup_path"
fi

# 📈 Prikaži status storitev
print_info ""
print_info "📈 STATUS STORITEV"
print_info "=================="
systemctl status omni-brain --no-pager -l || true

if command -v pm2 &> /dev/null; then
    print_info ""
    print_info "PM2 Status:"
    pm2 status || true
fi

write_log "Posodobitev dokončana uspešno"
print_info ""
print_info "🎉 OMNI-BRAIN-MAXI-ULTRA je pripravljen za uporabo!"

# 🔄 Nastavi avtomatske posodobitve če je zahtevano
if [ "$RESTART_SERVICES" = true ]; then
    print_info "🔄 Nastavljam avtomatske posodobitve..."
    
    # Ustvari cron job za dnevne posodobitve
    cron_job="0 2 * * * /opt/omni-brain/update-omni.sh --backup >> /var/log/omni-update.log 2>&1"
    (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
    
    print_success "✅ Avtomatske posodobitve nastavljene (vsak dan ob 2:00)"
    write_log "Avtomatske posodobitve nastavljene"
fi