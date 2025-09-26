#!/bin/bash

echo "========================================"
echo "   OMNI DOCKER SYSTEM - LINUX STOP"
echo "========================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker version >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running or not installed!${NC}"
    echo "Please install Docker and make sure it's running."
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ docker-compose.yml not found!${NC}"
    echo "Please make sure you're in the correct directory."
    exit 1
fi

echo -e "${YELLOW}🛑 Stopping Omni Docker System...${NC}"
echo

# Stop and remove containers
echo -e "${BLUE}📋 Stopping containers...${NC}"
docker-compose stop

echo
echo -e "${BLUE}🗑️  Removing containers...${NC}"
docker-compose down --remove-orphans

echo
echo -e "${BLUE}🔍 Checking remaining containers...${NC}"
docker-compose ps

echo
echo "========================================"
echo -e "${GREEN}   OMNI SYSTEM STOPPED!${NC}"
echo "========================================"
echo
echo -e "${GREEN}📋 System has been stopped successfully.${NC}"
echo
echo -e "${YELLOW}🔄 To start again, run: ./docker-start.sh${NC}"
echo -e "${YELLOW}🧹 To clean up volumes, run: docker-compose down -v${NC}"
echo -e "${YELLOW}📊 To remove images, run: docker-compose down --rmi all${NC}"
echo