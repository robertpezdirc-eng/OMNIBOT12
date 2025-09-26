#!/bin/bash
# Omni Local Server Starter for Linux/macOS
# Enostavno zaganjanje lokalnega HTTP strežnika za prenos datotek

# Barve za lepši izpis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "========================================"
echo "    🌟 Omni Local File Server 🌟"
echo "========================================"
echo -e "${NC}"

# Preveri ali Python obstaja
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 ni nameščen!${NC}"
    echo "Namesti Python3 z: sudo apt install python3 (Ubuntu/Debian)"
    echo "ali: brew install python3 (macOS)"
    exit 1
fi

# Preveri ali smo v pravilnem direktoriju
if [[ ! -f "main.py" && ! -f "omni.py" && ! -f "package.json" ]]; then
    echo -e "${RED}❌ Nisi v Omni direktoriju!${NC}"
    echo "Premakni se v direktorij z Omni datotekami in ponovno zaženi skripto."
    exit 1
fi

echo -e "${GREEN}✅ Python3 je nameščen${NC}"
echo -e "${GREEN}✅ Omni datoteke najdene${NC}"
echo

# Pridobi lokalni IP
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)

if [[ -z "$LOCAL_IP" ]]; then
    LOCAL_IP="127.0.0.1"
fi

echo -e "${BLUE}📍 Lokalni IP: $LOCAL_IP${NC}"
echo -e "${BLUE}🌐 Strežnik bo dostopen na: http://$LOCAL_IP:3000${NC}"
echo

# Zaženi Python strežnik
echo -e "${GREEN}🚀 Zaganjam lokalni strežnik...${NC}"
echo
echo -e "${YELLOW}⚠️  POMEMBNO: Pusti to okno odprto dokler ne zaključiš migracije!${NC}"
echo

echo -e "${PURPLE}📋 NAVODILA ZA OBLAČNI STREŽNIK:${NC}"
echo "================================"
echo "1. SSH na oblačni strežnik:"
echo "   ssh root@[JAVNI_IP_STREŽNIKA]"
echo
echo "2. Prenesi in zaženi migracijsko skripto:"
echo "   wget http://$LOCAL_IP:3000/omni-cloud-auto-full.sh"
echo "   chmod +x omni-cloud-auto-full.sh"
echo "   sudo ./omni-cloud-auto-full.sh [DOMENA] [EMAIL] local $LOCAL_IP"
echo
echo "3. Primer:"
echo "   sudo ./omni-cloud-auto-full.sh moja-domena.com admin@example.com local $LOCAL_IP"
echo
echo "================================"
echo "Pritisnite Ctrl+C za ustavitev"
echo "================================"
echo

# Naredi skripto izvršljivo
chmod +x local-server-setup.py

# Zaženi Python strežnik
python3 local-server-setup.py

echo
echo -e "${GREEN}👋 Strežnik ustavljen.${NC}"