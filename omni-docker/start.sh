#!/bin/bash

# Omni License System - Docker Startup Script
echo "🚀 Zaganjam Omni License System..."

# Preveri ali je Docker nameščen
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ni nameščen. Prosim namesti Docker."
    exit 1
fi

# Preveri ali je docker-compose nameščen
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose ni nameščen. Prosim namesti docker-compose."
    exit 1
fi

show_menu() {
    echo ""
    echo "Izberi možnost:"
    echo "1) Osnovni setup (Server + MongoDB + Admin)"
    echo "2) Polni setup z Client Panel demo"
    echo "3) Samo MongoDB in Server"
    echo "4) Preveri status"
    echo "5) Ustavi vse storitve"
    echo "6) Rebuild in restart"
    echo "7) Prikaži loge"
    echo "8) Izhod"
    echo ""
}

basic_setup() {
    echo "🔧 Zaganjam osnovni setup..."
    docker-compose up --build -d mongo server admin
    echo "✅ Osnovni setup zagnan!"
    echo "📊 Admin GUI: http://localhost:4000"
    echo "🔌 API Server: http://localhost:3000"
    echo "🗄️ MongoDB: mongodb://localhost:27017"
}

full_setup() {
    echo "🔧 Zaganjam polni setup..."
    docker-compose --profile demo up --build -d
    echo "✅ Polni setup zagnan!"
    echo "📊 Admin GUI: http://localhost:4000"
    echo "👤 Client Panel: http://localhost:5000"
    echo "🔌 API Server: http://localhost:3000"
    echo "🗄️ MongoDB: mongodb://localhost:27017"
}

server_only() {
    echo "🔧 Zaganjam samo MongoDB in Server..."
    docker-compose up --build -d mongo server
    echo "✅ Server zagnan!"
    echo "🔌 API Server: http://localhost:3000"
    echo "🗄️ MongoDB: mongodb://localhost:27017"
}

check_status() {
    echo "📊 Status storitev:"
    docker-compose ps
}

stop_services() {
    echo "🛑 Ustavljam vse storitve..."
    docker-compose down
    echo "✅ Vse storitve ustavljene!"
}

rebuild_restart() {
    echo "🔄 Rebuild in restart..."
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    echo "✅ Rebuild dokončan!"
}

show_logs() {
    echo "📋 Izberi storitev za loge:"
    echo "1) server"
    echo "2) admin"
    echo "3) client"
    echo "4) mongo"
    echo "5) vse"
    read -p "Izbira: " log_choice
    
    case $log_choice in
        1) docker-compose logs -f server ;;
        2) docker-compose logs -f admin ;;
        3) docker-compose logs -f client ;;
        4) docker-compose logs -f mongo ;;
        5) docker-compose logs -f ;;
        *) echo "❌ Neveljavna izbira" ;;
    esac
}

# Glavna zanka
while true; do
    show_menu
    read -p "Vnesi izbiro (1-8): " choice
    
    case $choice in
        1) basic_setup ;;
        2) full_setup ;;
        3) server_only ;;
        4) check_status ;;
        5) stop_services ;;
        6) rebuild_restart ;;
        7) show_logs ;;
        8) echo "👋 Izhod..."; exit 0 ;;
        *) echo "❌ Neveljavna izbira. Prosim izberi 1-8." ;;
    esac
    
    echo ""
    read -p "Pritisni Enter za nadaljevanje..."
done