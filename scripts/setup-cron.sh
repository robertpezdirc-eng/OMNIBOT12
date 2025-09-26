#!/bin/bash

# 🕒 OMNI-BRAIN Cron Job Nastavitev
# Skripta za nastavitev avtomatskih posodobitev

set -e

# 🎨 Barvne funkcije
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_success() { echo -e "${GREEN}$1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }
print_error() { echo -e "${RED}$1${NC}"; }
print_info() { echo -e "${CYAN}$1${NC}"; }

# 📋 Parametri
SCHEDULE="daily"
TIME="02:00"
BACKUP=true
FORCE=false

print_info "🕒 OMNI-BRAIN Cron Job Nastavitev"
print_info "================================="

# 📋 Obdelaj parametre
while [[ $# -gt 0 ]]; do
    case $1 in
        --schedule)
            SCHEDULE="$2"
            shift 2
            ;;
        --time)
            TIME="$2"
            shift 2
            ;;
        --no-backup)
            BACKUP=false
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "OMNI-BRAIN Cron Job Nastavitev"
            echo ""
            echo "Uporaba: $0 [OPCIJE]"
            echo ""
            echo "Opcije:"
            echo "  --schedule INTERVAL  Interval posodobitev (daily, weekly, monthly)"
            echo "  --time TIME         Čas izvajanja (HH:MM format)"
            echo "  --no-backup         Ne ustvari backup pred posodobitvijo"
            echo "  --force             Prepiši obstoječe cron job-e"
            echo "  -h, --help          Prikaži to pomoč"
            echo ""
            echo "Primeri:"
            echo "  $0 --schedule daily --time 02:00"
            echo "  $0 --schedule weekly --time 03:30"
            echo "  $0 --schedule monthly --time 01:00"
            exit 0
            ;;
        *)
            print_error "❌ Neznan parameter: $1"
            exit 1
            ;;
    esac
done

# 🔐 Preveri root pravice
if [ "$EUID" -ne 0 ]; then
    print_error "❌ Ta skripta zahteva root pravice!"
    print_info "Zaženi z: sudo $0"
    exit 1
fi

# 📁 Nastavi direktorije
OMNI_DIR="/opt/omni-brain"
UPDATE_SCRIPT="$OMNI_DIR/update-omni.sh"
LOG_DIR="/var/log/omni-brain"

# 🔍 Preveri če obstajajo potrebne datoteke
if [ ! -f "$UPDATE_SCRIPT" ]; then
    print_error "❌ Update skripta ne obstaja: $UPDATE_SCRIPT"
    exit 1
fi

if [ ! -x "$UPDATE_SCRIPT" ]; then
    print_error "❌ Update skripta ni izvršna: $UPDATE_SCRIPT"
    print_info "Zaženi: chmod +x $UPDATE_SCRIPT"
    exit 1
fi

# 📁 Ustvari log direktorij
mkdir -p "$LOG_DIR"

# 🕒 Nastavi cron izraz glede na schedule
case $SCHEDULE in
    "daily")
        HOUR=$(echo $TIME | cut -d: -f1)
        MINUTE=$(echo $TIME | cut -d: -f2)
        CRON_EXPR="$MINUTE $HOUR * * *"
        DESCRIPTION="vsak dan ob $TIME"
        ;;
    "weekly")
        HOUR=$(echo $TIME | cut -d: -f1)
        MINUTE=$(echo $TIME | cut -d: -f2)
        CRON_EXPR="$MINUTE $HOUR * * 0"  # Nedelja
        DESCRIPTION="vsako nedeljo ob $TIME"
        ;;
    "monthly")
        HOUR=$(echo $TIME | cut -d: -f1)
        MINUTE=$(echo $TIME | cut -d: -f2)
        CRON_EXPR="$MINUTE $HOUR 1 * *"  # Prvi dan v mesecu
        DESCRIPTION="prvi dan v mesecu ob $TIME"
        ;;
    *)
        print_error "❌ Nepodprt schedule: $SCHEDULE"
        print_info "Podprti: daily, weekly, monthly"
        exit 1
        ;;
esac

# 🔧 Pripravi cron job ukaz
BACKUP_FLAG=""
if [ "$BACKUP" = true ]; then
    BACKUP_FLAG="--backup"
fi

CRON_COMMAND="$UPDATE_SCRIPT $BACKUP_FLAG >> $LOG_DIR/update.log 2>&1"
CRON_JOB="$CRON_EXPR $CRON_COMMAND"

print_info "📅 Nastavljam cron job:"
print_info "   Schedule: $DESCRIPTION"
print_info "   Ukaz: $CRON_COMMAND"

# 🗑️ Odstrani obstoječe OMNI-BRAIN cron job-e
print_info "🗑️ Odstranjujem obstoječe OMNI-BRAIN cron job-e..."
crontab -l 2>/dev/null | grep -v "update-omni.sh" | crontab - 2>/dev/null || true

# ➕ Dodaj novi cron job
print_info "➕ Dodajam novi cron job..."
(crontab -l 2>/dev/null; echo "# OMNI-BRAIN Avtomatska Posodobitev - $DESCRIPTION") | crontab -
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

print_success "✅ Cron job uspešno nastavljen"

# 📊 Prikaži trenutne cron job-e
print_info ""
print_info "📊 TRENUTNI CRON JOB-I"
print_info "======================"
crontab -l | grep -A1 -B1 "OMNI-BRAIN" || print_warning "Ni najdenih OMNI-BRAIN cron job-ov"

# 🔍 Preveri cron servis
print_info ""
print_info "🔍 PREVERJAM CRON SERVIS"
print_info "========================"

if systemctl is-active --quiet cron; then
    print_success "✅ Cron servis je aktiven"
elif systemctl is-active --quiet crond; then
    print_success "✅ Crond servis je aktiven"
else
    print_warning "⚠️ Cron servis ni aktiven, zaganjam..."
    if systemctl start cron 2>/dev/null; then
        systemctl enable cron
        print_success "✅ Cron servis zagnan in omogočen"
    elif systemctl start crond 2>/dev/null; then
        systemctl enable crond
        print_success "✅ Crond servis zagnan in omogočen"
    else
        print_error "❌ Ne morem zagnati cron servisa"
        exit 1
    fi
fi

# 📝 Ustvari test skripto
TEST_SCRIPT="$OMNI_DIR/test-update.sh"
cat > "$TEST_SCRIPT" << 'EOF'
#!/bin/bash
# Test skripta za preverjanje delovanja update sistema

echo "🧪 Test OMNI-BRAIN posodobitve - $(date)"
echo "========================================"

# Preveri Git repozitorij
cd /opt/omni-brain
echo "📍 Trenutna Git veja: $(git branch --show-current)"
echo "📍 Zadnji commit: $(git log -1 --oneline)"

# Preveri storitve
echo "📊 Status storitev:"
systemctl status omni-brain --no-pager -l | head -10

# Preveri delovanje
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Sistem deluje pravilno"
else
    echo "❌ Sistem ne deluje pravilno"
fi

echo "🏁 Test končan - $(date)"
EOF

chmod +x "$TEST_SCRIPT"

# 📋 Prikaži navodila
print_info ""
print_info "📋 NAVODILA ZA UPORABO"
print_info "======================"
print_info "🔧 Upravljanje cron job-ov:"
print_info "   crontab -l                    # Prikaži vse cron job-e"
print_info "   crontab -e                    # Uredi cron job-e"
print_info "   sudo systemctl status cron    # Status cron servisa"
print_info ""
print_info "📝 Dnevniki:"
print_info "   tail -f $LOG_DIR/update.log   # Spremljaj update dnevnik"
print_info "   journalctl -u cron -f         # Spremljaj cron dnevnik"
print_info ""
print_info "🧪 Testiranje:"
print_info "   $TEST_SCRIPT                  # Testiraj sistem"
print_info "   $UPDATE_SCRIPT --help         # Pomoč za update skripto"
print_info ""
print_info "🗑️ Odstranitev:"
print_info "   crontab -l | grep -v update-omni.sh | crontab -"

print_success ""
print_success "🎉 Avtomatske posodobitve so nastavljene!"
print_info "Naslednja posodobitev: $DESCRIPTION"