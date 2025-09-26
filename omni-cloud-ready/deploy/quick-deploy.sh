#!/bin/bash

# 🚀 OMNI-BRAIN-MAXI-ULTRA Quick Deploy Script
# Hitra namestitev v 3 korakih

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
DOMAIN=${1:-"localhost"}
OMNI_USER="omni"
OMNI_HOME="/home/omni-cloud-ready"

echo -e "${BLUE}"
echo "🚀 OMNI-BRAIN-MAXI-ULTRA Quick Deploy"
echo "====================================="
echo -e "${NC}"

# Step 1: System Preparation
echo -e "${GREEN}📦 Korak 1/3: Priprava sistema...${NC}"
sudo apt update && sudo apt install -y \
    python3 python3-pip python3-venv \
    nginx certbot python3-certbot-nginx \
    redis-server mongodb \
    curl wget git htop

# Step 2: User and Directory Setup
echo -e "${GREEN}👤 Korak 2/3: Nastavitev uporabnika in direktorijev...${NC}"
if ! id "$OMNI_USER" &>/dev/null; then
    sudo useradd -m -s /bin/bash $OMNI_USER
    sudo usermod -aG sudo $OMNI_USER
fi

# Copy files to correct location
sudo mkdir -p $OMNI_HOME
sudo cp -r . $OMNI_HOME/
sudo chown -R $OMNI_USER:$OMNI_USER $OMNI_HOME

# Step 3: Quick Installation
echo -e "${GREEN}⚡ Korak 3/3: Hitra namestitev...${NC}"
cd $OMNI_HOME
sudo chmod +x deploy/install.sh
sudo ./deploy/install.sh $DOMAIN

echo -e "${GREEN}"
echo "🎉 OMNI-BRAIN uspešno nameščen!"
echo "================================"
echo -e "${NC}"
echo -e "${BLUE}🌐 Dostop:${NC} http://$DOMAIN"
echo -e "${BLUE}📊 Health:${NC} http://$DOMAIN/health"
echo -e "${BLUE}🔧 Status:${NC} sudo systemctl status omni.service"
echo