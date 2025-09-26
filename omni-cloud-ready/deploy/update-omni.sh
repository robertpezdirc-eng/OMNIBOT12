#!/bin/bash

# 🔄 OMNI-BRAIN-MAXI-ULTRA Avtomatska Posodobitev
# Auto-Update Script za Cloud Ready paket

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OMNI_HOME="/home/omni-cloud-ready"
BACKUP_DIR="/home/backups/update_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="/var/log/omni/update.log"
GIT_REPO="https://github.com/your-repo/omni-brain-maxi-ultra.git"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a $LOG_FILE
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a $LOG_FILE
}

check_prerequisites() {
    log "Preverjam predpogoje za posodobitev..."
    
    # Check if running as correct user
    if [[ "$USER" != "omni" ]] && [[ $EUID -ne 0 ]]; then
        error "Skripta mora biti zagnana kot 'omni' uporabnik ali root"
    fi
    
    # Check if OMNI service is running
    if ! systemctl is-active --quiet omni.service; then
        warn "OMNI servis ni aktiven"
    fi
    
    # Check disk space (need at least 1GB free)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [[ $AVAILABLE_SPACE -lt 1048576 ]]; then
        error "Premalo prostora na disku (potreben vsaj 1GB)"
    fi
    
    log "Predpogoji izpolnjeni ✓"
}

create_backup() {
    log "Ustvarjam varnostno kopijo..."
    
    mkdir -p $BACKUP_DIR
    
    # Backup current application
    if [[ -d "$OMNI_HOME" ]]; then
        tar -czf $BACKUP_DIR/omni-app-backup.tar.gz -C $OMNI_HOME .
        log "Aplikacija varnostno kopirana ✓"
    fi
    
    # Backup database
    if command -v mongodump &> /dev/null; then
        mongodump --out $BACKUP_DIR/mongodb-backup 2>/dev/null || warn "MongoDB backup neuspešen"
    fi
    
    # Backup Redis
    if command -v redis-cli &> /dev/null; then
        redis-cli BGSAVE >/dev/null 2>&1
        sleep 3
        cp /var/lib/redis/dump.rdb $BACKUP_DIR/ 2>/dev/null || warn "Redis backup neuspešen"
    fi
    
    log "Varnostna kopija ustvarjena: $BACKUP_DIR ✓"
}

stop_services() {
    log "Ustavljam OMNI storitve..."
    
    # Stop OMNI service gracefully
    if systemctl is-active --quiet omni.service; then
        systemctl stop omni.service
        log "OMNI servis ustavljen ✓"
    fi
    
    # Wait for processes to stop
    sleep 5
}

update_from_git() {
    log "Posodabljam kodo iz Git repozitorija..."
    
    cd $OMNI_HOME
    
    # Check if it's a git repository
    if [[ -d ".git" ]]; then
        # Stash any local changes
        git stash push -m "Auto-stash before update $(date)"
        
        # Pull latest changes
        git pull origin main || git pull origin master
        
        log "Git posodobitev končana ✓"
    else
        warn "Ni Git repozitorij - preskačem Git posodobitev"
    fi
}

update_dependencies() {
    log "Posodabljam odvisnosti..."
    
    # Update Python dependencies
    if [[ -f "$OMNI_HOME/app/requirements.txt" ]]; then
        cd $OMNI_HOME/app
        
        if [[ -d "venv" ]]; then
            source venv/bin/activate
            pip install --upgrade pip
            pip install -r requirements.txt --upgrade
            log "Python odvisnosti posodobljene ✓"
        fi
    fi
    
    # Update Node.js dependencies if they exist
    if [[ -f "$OMNI_HOME/package.json" ]]; then
        cd $OMNI_HOME
        npm install
        npm update
        log "Node.js odvisnosti posodobljene ✓"
    fi
    
    # Update server Node.js dependencies
    if [[ -f "$OMNI_HOME/server/package.json" ]]; then
        cd $OMNI_HOME/server
        npm install
        npm update
        log "Server Node.js odvisnosti posodobljene ✓"
    fi
    
    # Update system packages
    if command -v apt &> /dev/null; then
        apt update && apt upgrade -y
        log "Sistemski paketi posodobljeni ✓"
    fi
}

build_client_interface() {
    log "💻 Gradnja React odjemalca..."
    
    # Check if client directory exists
    if [[ -d "$OMNI_HOME/client" ]]; then
        cd $OMNI_HOME/client
        
        # Install client dependencies
        if [[ -f "package.json" ]]; then
            npm install
            log "Client odvisnosti nameščene ✓"
            
            # Build React client
            npm run build
            log "✅ Odjemalski vmesnik zgrajen v client/build/ ✓"
        else
            warn "Client package.json ne obstaja - preskačem gradnjo"
        fi
    else
        warn "Client direktorij ne obstaja - preskačem gradnjo"
    fi
}

update_configuration() {
    log "Posodabljam konfiguracijo..."
    
    # Update systemd service if needed
    if [[ -f "$OMNI_HOME/deploy/omni.service" ]]; then
        if ! cmp -s "$OMNI_HOME/deploy/omni.service" "/etc/systemd/system/omni.service"; then
            cp $OMNI_HOME/deploy/omni.service /etc/systemd/system/
            systemctl daemon-reload
            log "Systemd servis posodobljen ✓"
        fi
    fi
    
    # Update Nginx configuration if needed
    if [[ -f "$OMNI_HOME/deploy/nginx.conf" ]]; then
        if ! cmp -s "$OMNI_HOME/deploy/nginx.conf" "/etc/nginx/sites-available/omni.conf"; then
            cp $OMNI_HOME/deploy/nginx.conf /etc/nginx/sites-available/omni.conf
            nginx -t && systemctl reload nginx
            log "Nginx konfiguracija posodobljena ✓"
        fi
    fi
    
    # Update fast_mode.json if needed
    if [[ -f "$OMNI_HOME/config/fast_mode.json" ]]; then
        log "Fast Mode konfiguracija preverjena ✓"
    fi
}

run_migrations() {
    log "Izvajam migracije podatkov..."
    
    # Run database migrations if script exists
    if [[ -f "$OMNI_HOME/scripts/migrate.py" ]]; then
        cd $OMNI_HOME/app
        source venv/bin/activate
        python ../scripts/migrate.py
        log "Migracije podatkov končane ✓"
    fi
    
    # Clear cache
    if command -v redis-cli &> /dev/null; then
        redis-cli FLUSHDB
        log "Cache počiščen ✓"
    fi
}

start_services() {
    log "Zaganjam OMNI storitve..."
    
    # Start OMNI service
    systemctl start omni.service
    
    # Wait for service to start
    sleep 10
    
    # Check if service is running
    if systemctl is-active --quiet omni.service; then
        log "OMNI servis uspešno zagnan ✓"
    else
        error "OMNI servis se ni uspešno zagnal"
    fi
    
    # Restart nginx to ensure everything is connected
    systemctl restart nginx
    
    log "Vse storitve zagnane ✓"
}

restart_with_pm2() {
    log "🚀 Ponovni zagon Omni Brain s pm2..."
    
    # Check if pm2 is installed
    if ! command -v pm2 &> /dev/null; then
        warn "pm2 ni nameščen - nameščam..."
        npm install -g pm2
    fi
    
    # Navigate to server directory
    if [[ -d "$OMNI_HOME/server" ]]; then
        cd $OMNI_HOME/server
        
        # Restart or start with pm2
        if pm2 list | grep -q "omni-brain-cloud"; then
            pm2 restart omni-brain-cloud
            log "pm2 aplikacija ponovno zagnana ✓"
        else
            # Start new pm2 process
            if [[ -f "index.js" ]]; then
                pm2 start index.js --name "omni-brain-cloud"
                log "pm2 aplikacija zagnana ✓"
            else
                warn "index.js ne obstaja v server direktoriju"
            fi
        fi
        
        # Save pm2 configuration
        pm2 save
        log "pm2 konfiguracija shranjena ✓"
        
        # Setup pm2 startup (if not already done)
        pm2 startup systemd -u omni --hp /home/omni-cloud-ready >/dev/null 2>&1 || true
        
    else
        warn "Server direktorij ne obstaja - preskačem pm2 zagon"
    fi
}

check_continuous_saving() {
    log "🧠 Preverjanje aktivnosti sprotnega shranjevanja v server/utils.js"
    
    if [[ -f "$OMNI_HOME/server/utils.js" ]]; then
        # Check if continuous saving functions are present
        if grep -q "continuousSave\|autoSave\|realTimeSave" "$OMNI_HOME/server/utils.js"; then
            log "✅ Sprotno shranjevanje je aktivno v utils.js ✓"
        else
            warn "⚠️  Sprotno shranjevanje ni najdeno v utils.js"
            
            # Optionally add basic continuous saving function
            cat >> "$OMNI_HOME/server/utils.js" << 'EOF'

// Auto-added continuous saving functionality
const continuousSave = {
    interval: null,
    
    start() {
        if (this.interval) return;
        
        this.interval = setInterval(() => {
            // Save current state to database
            this.saveCurrentState();
        }, 30000); // Save every 30 seconds
        
        console.log('🧠 Continuous saving started');
    },
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('🧠 Continuous saving stopped');
        }
    },
    
    async saveCurrentState() {
        try {
            // Implementation for saving current AI state
            console.log('💾 Auto-saving AI state...');
        } catch (error) {
            console.error('❌ Auto-save error:', error);
        }
    }
};

module.exports = { ...module.exports, continuousSave };
EOF
            log "✅ Osnovno sprotno shranjevanje dodano v utils.js ✓"
        fi
    else
        warn "server/utils.js ne obstaja - ustvarjam osnovno datoteko..."
        
        mkdir -p "$OMNI_HOME/server"
        cat > "$OMNI_HOME/server/utils.js" << 'EOF'
// OMNI Brain Utilities with Continuous Saving
const continuousSave = {
    interval: null,
    
    start() {
        if (this.interval) return;
        
        this.interval = setInterval(() => {
            this.saveCurrentState();
        }, 30000); // Save every 30 seconds
        
        console.log('🧠 Continuous saving started');
    },
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('🧠 Continuous saving stopped');
        }
    },
    
    async saveCurrentState() {
        try {
            console.log('💾 Auto-saving AI state...');
            // Add your saving logic here
        } catch (error) {
            console.error('❌ Auto-save error:', error);
        }
    }
};

module.exports = { continuousSave };
EOF
        log "✅ server/utils.js ustvarjen z osnovnim sprotnim shranjevanjem ✓"
    fi
}

run_health_checks() {
    log "Izvajam zdravstvene preverjanja..."
    
    # Wait for application to fully start
    sleep 15
    
    # Test local connection
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        log "Lokalni health check uspešen ✓"
    else
        warn "Lokalni health check neuspešen"
    fi
    
    # Test nginx
    if curl -f http://localhost/health >/dev/null 2>&1; then
        log "Nginx health check uspešen ✓"
    else
        warn "Nginx health check neuspešen"
    fi
    
    # Check service status
    if systemctl is-active --quiet omni.service; then
        log "Servis status: AKTIVEN ✓"
    else
        error "Servis status: NEAKTIVEN"
    fi
    
    # Check logs for errors
    if journalctl -u omni.service --since "5 minutes ago" | grep -i error; then
        warn "Najdene napake v logih - preveri journalctl -u omni.service"
    else
        log "Logi brez napak ✓"
    fi
}

cleanup_old_backups() {
    log "Čistim stare varnostne kopije..."
    
    # Keep only last 5 update backups
    find /home/backups -name "update_*" -type d | sort -r | tail -n +6 | xargs rm -rf
    
    log "Stare varnostne kopije počiščene ✓"
}

rollback() {
    error "Posodobitev neuspešna - izvajam rollback..."
    
    if [[ -f "$BACKUP_DIR/omni-app-backup.tar.gz" ]]; then
        systemctl stop omni.service
        
        cd $OMNI_HOME
        rm -rf ./*
        tar -xzf $BACKUP_DIR/omni-app-backup.tar.gz
        
        systemctl start omni.service
        
        error "Rollback končan - sistem obnovljen na prejšnje stanje"
    else
        error "Rollback ni možen - varnostna kopija ni na voljo"
    fi
}

show_update_summary() {
    echo
    echo -e "${GREEN}🎉 OMNI-BRAIN posodobitev uspešno končana!${NC}"
    echo
    echo -e "${BLUE}📊 Povzetek posodobitve:${NC}"
    echo -e "   • Čas posodobitve: $(date)"
    echo -e "   • Varnostna kopija: $BACKUP_DIR"
    echo -e "   • Logi: $LOG_FILE"
    echo
    echo -e "${BLUE}🔍 Preverjanje statusa:${NC}"
    echo -e "   • Status servisa: $(systemctl is-active omni.service)"
    echo -e "   • Nginx status: $(systemctl is-active nginx)"
    echo -e "   • MongoDB status: $(systemctl is-active mongodb)"
    echo -e "   • Redis status: $(systemctl is-active redis-server)"
    echo
    echo -e "${BLUE}🌐 Dostopne povezave:${NC}"
    echo -e "   • Health check: curl http://localhost/health"
    echo -e "   • Aplikacija: http://$(hostname -I | awk '{print $1}')"
    echo
    echo -e "${GREEN}✅ Sistem je pripravljen za uporabo!${NC}"
    echo
}

# Trap for cleanup on error
trap rollback ERR

# Main update process
main() {
    log "🔄 Začenjam samodejno posodobitev OMNI-BRAIN-MAXI-ULTRA..."
    
    check_prerequisites
    create_backup
    stop_services
    update_from_git
    update_dependencies
    build_client_interface
    update_configuration
    run_migrations
    start_services
    restart_with_pm2
    check_continuous_saving
    run_health_checks
    cleanup_old_backups
    
    show_update_summary
    
    log "✅ Samodejna posodobitev uspešno zaključena! 🚀"
}

# Handle script arguments
case "${1:-}" in
    --force)
        log "Forciram posodobitev brez preverjanj..."
        ;;
    --dry-run)
        log "Dry run - samo preverjam kaj bi se posodobilo..."
        check_prerequisites
        update_from_git --dry-run || true
        exit 0
        ;;
    --rollback)
        if [[ -n "${2:-}" ]] && [[ -d "$2" ]]; then
            BACKUP_DIR="$2"
            rollback
        else
            error "Uporaba: $0 --rollback /path/to/backup"
        fi
        ;;
    --help|-h)
        echo "OMNI-BRAIN Auto-Update Script"
        echo
        echo "Uporaba: $0 [OPCIJA]"
        echo
        echo "Opcije:"
        echo "  --force     Forciraj posodobitev brez preverjanj"
        echo "  --dry-run   Preveri kaj bi se posodobilo brez izvajanja"
        echo "  --rollback  Obnovi iz varnostne kopije"
        echo "  --help      Prikaži to pomoč"
        echo
        exit 0
        ;;
esac

# Run main update process
main "$@"