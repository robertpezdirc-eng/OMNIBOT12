#!/bin/bash

# 🚀 Omni Ultimate - Docker Startup Script
# Napredni startup skript z debug možnostmi in health check

set -e  # Exit on any error

# 🎨 Barve za konzolo
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 📝 Logging funkcije
log_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

log_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

log_header() {
    echo -e "${BOLD}${CYAN}${1}${NC}"
}

# 🔧 Funkcije
check_docker() {
    log_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running!"
        exit 1
    fi
    
    log_success "Docker is ready"
}

check_docker_compose() {
    log_info "Checking Docker Compose installation..."
    
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        log_success "Docker Compose found: $(docker-compose --version)"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        log_success "Docker Compose (plugin) found: $(docker compose version)"
    else
        log_error "Docker Compose is not installed!"
        exit 1
    fi
}

check_env_file() {
    log_info "Checking environment configuration..."
    
    if [ ! -f ".env.docker" ]; then
        log_warn ".env.docker not found, checking for .env..."
        if [ ! -f ".env" ]; then
            log_error "No environment file found! Please create .env or .env.docker"
            exit 1
        else
            log_warn "Using .env file (consider creating .env.docker for Docker-specific settings)"
        fi
    else
        log_success "Using .env.docker for Docker configuration"
    fi
}

cleanup_containers() {
    log_info "Cleaning up existing containers..."
    
    # Stop and remove existing containers
    $COMPOSE_CMD down --remove-orphans 2>/dev/null || true
    
    # Remove dangling images (optional)
    if [ "$CLEANUP_IMAGES" = "true" ]; then
        log_info "Removing dangling images..."
        docker image prune -f 2>/dev/null || true
    fi
    
    log_success "Cleanup completed"
}

build_images() {
    log_info "Building Docker images..."
    
    if [ "$FORCE_REBUILD" = "true" ]; then
        log_info "Force rebuilding images (no cache)..."
        $COMPOSE_CMD build --no-cache
    else
        $COMPOSE_CMD build
    fi
    
    log_success "Images built successfully"
}

start_services() {
    log_info "Starting services..."
    
    # Start services in detached mode
    $COMPOSE_CMD up -d
    
    log_success "Services started"
}

wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for MongoDB
    log_info "Waiting for MongoDB..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if $COMPOSE_CMD exec -T mongodb mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
            log_success "MongoDB is ready"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "MongoDB failed to start within 60 seconds"
        return 1
    fi
    
    # Wait for Redis
    log_info "Waiting for Redis..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if $COMPOSE_CMD exec -T redis redis-cli ping &>/dev/null; then
            log_success "Redis is ready"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "Redis failed to start within 30 seconds"
        return 1
    fi
    
    # Wait for Omni App
    log_info "Waiting for Omni App..."
    timeout=120
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3000/api/health &>/dev/null; then
            log_success "Omni App is ready"
            break
        fi
        sleep 5
        timeout=$((timeout-5))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "Omni App failed to start within 120 seconds"
        return 1
    fi
}

show_status() {
    log_header "📊 Services Status"
    echo "=================================="
    
    $COMPOSE_CMD ps
    
    echo ""
    log_header "🌐 Access URLs"
    echo "=================================="
    echo "Main Application: http://localhost:3000"
    echo "WebSocket: ws://localhost:3001"
    echo "MongoDB: mongodb://localhost:27017"
    echo "Redis: redis://localhost:6379"
    
    if [ "$SSL_ENABLED" = "true" ]; then
        echo "HTTPS Application: https://localhost:443"
    fi
    
    echo ""
    log_header "📋 Useful Commands"
    echo "=================================="
    echo "View logs: $COMPOSE_CMD logs -f"
    echo "Stop services: $COMPOSE_CMD down"
    echo "Restart services: $COMPOSE_CMD restart"
    echo "Shell access: $COMPOSE_CMD exec omni-app bash"
}

show_logs() {
    if [ "$SHOW_LOGS" = "true" ]; then
        log_info "Showing application logs (Ctrl+C to exit)..."
        sleep 2
        $COMPOSE_CMD logs -f omni-app
    fi
}

# 🚀 Glavna funkcija
main() {
    log_header "🚀 Omni Ultimate - Docker Startup"
    echo "Timestamp: $(date)"
    echo ""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force-rebuild)
                FORCE_REBUILD="true"
                shift
                ;;
            --cleanup-images)
                CLEANUP_IMAGES="true"
                shift
                ;;
            --show-logs)
                SHOW_LOGS="true"
                shift
                ;;
            --no-wait)
                NO_WAIT="true"
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --force-rebuild    Force rebuild Docker images (no cache)"
                echo "  --cleanup-images   Remove dangling images during cleanup"
                echo "  --show-logs        Show application logs after startup"
                echo "  --no-wait          Don't wait for services to be ready"
                echo "  --help             Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Preveri predpogoje
    check_docker
    check_docker_compose
    check_env_file
    
    # Cleanup in build
    cleanup_containers
    build_images
    
    # Start services
    start_services
    
    # Wait for services (unless --no-wait)
    if [ "$NO_WAIT" != "true" ]; then
        if wait_for_services; then
            log_success "All services are ready!"
        else
            log_error "Some services failed to start properly"
            log_info "Check logs with: $COMPOSE_CMD logs"
            exit 1
        fi
    fi
    
    # Show status
    show_status
    
    # Show logs if requested
    show_logs
}

# 🎯 Trap signals for graceful shutdown
trap 'log_info "Shutting down..."; $COMPOSE_CMD down; exit 0' INT TERM

# 🚀 Run main function
main "$@"