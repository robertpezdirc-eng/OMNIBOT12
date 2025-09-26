#!/usr/bin/env python3
"""
IoT Dashboard Starter Script
Zažene spletni vmesnik za upravljanje IoT naprav
"""

import os
import sys
from dotenv import load_dotenv

# Dodaj omni modul v path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Naloži environment spremenljivke
load_dotenv('.env.secure')

try:
    # Importiraj IoT dashboard
    from omni.modules.iot.iot_dashboard import start_dashboard
    
    print("🚀 Zaganjam IoT Dashboard...")
    print("=" * 50)
    
    # Konfiguracija
    HOST = os.getenv('DASHBOARD_HOST', '0.0.0.0')
    PORT = int(os.getenv('DASHBOARD_PORT', 5000))
    DEBUG = os.getenv('DASHBOARD_DEBUG', 'False').lower() == 'true'
    
    # Prikaži konfiguracijo
    print(f"🌐 Host: {HOST}")
    print(f"🔌 Port: {PORT}")
    print(f"🔧 Debug: {DEBUG}")
    print(f"👤 Username: {os.getenv('DASHBOARD_USERNAME', 'admin')}")
    print(f"🔑 Password: {os.getenv('DASHBOARD_PASSWORD', 'secure123')}")
    print("=" * 50)
    
    # Zaženi dashboard
    start_dashboard(host=HOST, port=PORT, debug=DEBUG)
    
except ImportError as e:
    print(f"❌ Napaka pri importu: {e}")
    print("Preverite, ali so vsi potrebni moduli nameščeni:")
    print("pip install flask flask-socketio python-dotenv")
    sys.exit(1)
    
except KeyboardInterrupt:
    print("\n🛑 Dashboard zaustavljen")
    sys.exit(0)
    
except Exception as e:
    print(f"❌ Napaka pri zagonu: {e}")
    sys.exit(1)