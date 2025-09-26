#!/bin/bash

# ============================================================================
# SYSTEMD SERVICES SETUP FOR OMNI CLOUD DEPLOYMENT
# Creates and configures all systemd services for Omni and Angel systems
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create main Omni service
create_omni_service() {
    log_info "Creating Omni main service..."
    
    cat > /etc/systemd/system/omni.service << 'EOF'
[Unit]
Description=Omni AI Platform - Main Application
Documentation=https://github.com/omni-ai/platform
After=network-online.target
Wants=network-online.target
Requires=network.target

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=/opt/omni
Environment=NODE_ENV=production
Environment=OMNI_ENV=production
ExecStartPre=/bin/sleep 5
ExecStart=/opt/omni/venv/bin/python main.py
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=omni-main
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/omni /var/log/omni /var/lib/omni

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

    log_success "Omni main service created"
}

# Create Angel Integration service
create_angel_integration_service() {
    log_info "Creating Angel Integration service..."
    
    cat > /etc/systemd/system/angel-integration.service << 'EOF'
[Unit]
Description=Angel Integration System
Documentation=https://github.com/omni-ai/angels
After=network-online.target
Wants=network-online.target
PartOf=omni.service

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=/opt/omni
Environment=ANGEL_TYPE=integration
Environment=ANGEL_PORT=5000
ExecStartPre=/bin/sleep 10
ExecStart=/opt/omni/venv/bin/python angel-integration-system.py
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=15
StartLimitInterval=60
StartLimitBurst=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=angel-integration
KillMode=mixed
TimeoutStopSec=30

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/omni /var/log/omni /var/lib/omni

# Resource limits
LimitNOFILE=32768
LimitNPROC=2048

[Install]
WantedBy=multi-user.target
EOF

    log_success "Angel Integration service created"
}

# Create Angel Task Distribution service
create_angel_tasks_service() {
    log_info "Creating Angel Task Distribution service..."
    
    cat > /etc/systemd/system/angel-tasks.service << 'EOF'
[Unit]
Description=Angel Task Distribution System
Documentation=https://github.com/omni-ai/angels
After=network-online.target angel-integration.service
Wants=network-online.target
PartOf=omni.service

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=/opt/omni
Environment=ANGEL_TYPE=tasks
Environment=ANGEL_PORT=5001
ExecStartPre=/bin/sleep 15
ExecStart=/opt/omni/venv/bin/python angel-task-distribution-system.py
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=15
StartLimitInterval=60
StartLimitBurst=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=angel-tasks
KillMode=mixed
TimeoutStopSec=30

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/omni /var/log/omni /var/lib/omni

# Resource limits
LimitNOFILE=32768
LimitNPROC=2048

[Install]
WantedBy=multi-user.target
EOF

    log_success "Angel Task Distribution service created"
}

# Create Angel Monitoring service
create_angel_monitoring_service() {
    log_info "Creating Angel Monitoring service..."
    
    cat > /etc/systemd/system/angel-monitoring.service << 'EOF'
[Unit]
Description=Angel Monitoring System
Documentation=https://github.com/omni-ai/angels
After=network-online.target
Wants=network-online.target
PartOf=omni.service

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=/opt/omni
Environment=ANGEL_TYPE=monitoring
Environment=ANGEL_PORT=5003
ExecStartPre=/bin/sleep 20
ExecStart=/opt/omni/venv/bin/python angel-monitoring-system.py
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=15
StartLimitInterval=60
StartLimitBurst=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=angel-monitoring
KillMode=mixed
TimeoutStopSec=30

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/omni /var/log/omni /var/lib/omni

# Resource limits
LimitNOFILE=32768
LimitNPROC=2048

[Install]
WantedBy=multi-user.target
EOF

    log_success "Angel Monitoring service created"
}

# Create Angel Synchronization service
create_angel_sync_service() {
    log_info "Creating Angel Synchronization service..."
    
    cat > /etc/systemd/system/angel-sync.service << 'EOF'
[Unit]
Description=Angel Synchronization Module
Documentation=https://github.com/omni-ai/angels
After=network-online.target angel-integration.service
Wants=network-online.target
PartOf=omni.service

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=/opt/omni
Environment=ANGEL_TYPE=synchronization
Environment=ANGEL_PORT=5004
ExecStartPre=/bin/sleep 25
ExecStart=/opt/omni/venv/bin/python angel-synchronization-module.py
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=15
StartLimitInterval=60
StartLimitBurst=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=angel-sync
KillMode=mixed
TimeoutStopSec=30

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/omni /var/log/omni /var/lib/omni

# Resource limits
LimitNOFILE=32768
LimitNPROC=2048

[Install]
WantedBy=multi-user.target
EOF

    log_success "Angel Synchronization service created"
}

# Create Backup service
create_backup_service() {
    log_info "Creating Backup service..."
    
    cat > /etc/systemd/system/omni-backup.service << 'EOF'
[Unit]
Description=Omni Backup System
Documentation=https://github.com/omni-ai/platform
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=/opt/omni
Environment=BACKUP_ENABLED=true
ExecStartPre=/bin/sleep 30
ExecStart=/opt/omni/venv/bin/python omni-backup-monitoring.py
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=30
StartLimitInterval=120
StartLimitBurst=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=omni-backup
KillMode=mixed
TimeoutStopSec=60

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/omni /var/log/omni /var/lib/omni

# Resource limits
LimitNOFILE=16384
LimitNPROC=1024

[Install]
WantedBy=multi-user.target
EOF

    log_success "Backup service created"
}

# Create Angel coordination service
create_angel_coordination_service() {
    log_info "Creating Angel Coordination service..."
    
    cat > /etc/systemd/system/angel-coordination.service << 'EOF'
[Unit]
Description=Angel Coordination Optimizer
Documentation=https://github.com/omni-ai/angels
After=network-online.target angel-integration.service angel-tasks.service
Wants=network-online.target
PartOf=omni.service

[Service]
Type=simple
User=omni
Group=omni
WorkingDirectory=/opt/omni
Environment=PATH=/opt/omni/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=/opt/omni
Environment=ANGEL_TYPE=coordination
Environment=ANGEL_PORT=5005
ExecStartPre=/bin/sleep 35
ExecStart=/opt/omni/venv/bin/python -c "
import sys
sys.path.append('/opt/omni')
from angel_coordination_optimizer import AngelCoordinationOptimizer
optimizer = AngelCoordinationOptimizer()
optimizer.run()
"
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=20
StartLimitInterval=120
StartLimitBurst=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=angel-coordination
KillMode=mixed
TimeoutStopSec=30

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/omni /var/log/omni /var/lib/omni

# Resource limits
LimitNOFILE=32768
LimitNPROC=2048

[Install]
WantedBy=multi-user.target
EOF

    log_success "Angel Coordination service created"
}

# Create service management script
create_service_manager() {
    log_info "Creating service management script..."
    
    cat > /opt/omni/manage-services.sh << 'EOF'
#!/bin/bash

# Omni Services Management Script

SERVICES=(
    "omni"
    "angel-integration"
    "angel-tasks"
    "angel-monitoring"
    "angel-sync"
    "angel-coordination"
    "omni-backup"
)

case "$1" in
    start)
        echo "Starting all Omni services..."
        for service in "${SERVICES[@]}"; do
            echo "Starting $service..."
            systemctl start $service
        done
        echo "All services started."
        ;;
    stop)
        echo "Stopping all Omni services..."
        for service in "${SERVICES[@]}"; do
            echo "Stopping $service..."
            systemctl stop $service
        done
        echo "All services stopped."
        ;;
    restart)
        echo "Restarting all Omni services..."
        for service in "${SERVICES[@]}"; do
            echo "Restarting $service..."
            systemctl restart $service
        done
        echo "All services restarted."
        ;;
    status)
        echo "Status of all Omni services:"
        for service in "${SERVICES[@]}"; do
            echo -n "$service: "
            systemctl is-active $service
        done
        ;;
    enable)
        echo "Enabling all Omni services..."
        for service in "${SERVICES[@]}"; do
            echo "Enabling $service..."
            systemctl enable $service
        done
        echo "All services enabled."
        ;;
    disable)
        echo "Disabling all Omni services..."
        for service in "${SERVICES[@]}"; do
            echo "Disabling $service..."
            systemctl disable $service
        done
        echo "All services disabled."
        ;;
    logs)
        service=${2:-omni}
        echo "Showing logs for $service..."
        journalctl -u $service -f
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|enable|disable|logs [service]}"
        echo "Available services: ${SERVICES[*]}"
        exit 1
        ;;
esac
EOF

    chmod +x /opt/omni/manage-services.sh
    chown omni:omni /opt/omni/manage-services.sh
    
    log_success "Service management script created"
}

# Create systemd target for all Omni services
create_omni_target() {
    log_info "Creating Omni systemd target..."
    
    cat > /etc/systemd/system/omni-platform.target << 'EOF'
[Unit]
Description=Omni AI Platform - All Services
Documentation=https://github.com/omni-ai/platform
Requires=omni.service
Wants=angel-integration.service angel-tasks.service angel-monitoring.service angel-sync.service angel-coordination.service omni-backup.service
After=omni.service

[Install]
WantedBy=multi-user.target
EOF

    log_success "Omni systemd target created"
}

# Main function
main() {
    log_info "Setting up systemd services for Omni Cloud Deployment..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
    
    # Create all services
    create_omni_service
    create_angel_integration_service
    create_angel_tasks_service
    create_angel_monitoring_service
    create_angel_sync_service
    create_backup_service
    create_angel_coordination_service
    
    # Create management tools
    create_service_manager
    create_omni_target
    
    # Reload systemd
    log_info "Reloading systemd daemon..."
    systemctl daemon-reload
    
    # Enable all services
    log_info "Enabling all services..."
    systemctl enable omni.service
    systemctl enable angel-integration.service
    systemctl enable angel-tasks.service
    systemctl enable angel-monitoring.service
    systemctl enable angel-sync.service
    systemctl enable angel-coordination.service
    systemctl enable omni-backup.service
    systemctl enable omni-platform.target
    
    log_success "All systemd services configured and enabled!"
    
    echo ""
    echo "============================================================================"
    echo "SYSTEMD SERVICES SETUP COMPLETE"
    echo "============================================================================"
    echo ""
    echo "Available commands:"
    echo "  • Start all services: /opt/omni/manage-services.sh start"
    echo "  • Stop all services: /opt/omni/manage-services.sh stop"
    echo "  • Check status: /opt/omni/manage-services.sh status"
    echo "  • View logs: /opt/omni/manage-services.sh logs [service]"
    echo ""
    echo "Individual service commands:"
    echo "  • systemctl start omni-platform.target"
    echo "  • systemctl status omni"
    echo "  • journalctl -u angel-integration -f"
    echo ""
    echo "Services will start automatically on boot."
    echo "============================================================================"
}

# Run main function
main "$@"