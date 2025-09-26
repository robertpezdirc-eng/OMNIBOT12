"""
OMNI Smart Home Optimizer Module
IoT naprave in avtomatizacija pametnega doma
"""

import threading
import time
from datetime import datetime

home_devices = {}

def add_device(name, type_, status="off"):
    """Dodaj napravo v pametni dom"""
    home_devices[name] = {"type": type_, "status": status}

def monitor_smart_home():
    """Spremljaj pametni dom"""
    while True:
        for device, info in home_devices.items():
            print(f"🏠 {device} ({info['type']}): {info['status']}")
        time.sleep(60)

def start_smart_home_optimizer():
    """Zaženi smart home optimizer"""
    t = threading.Thread(target=monitor_smart_home)
    t.daemon = True
    t.start()
    return "🏠 Pametni dom modul zagnan ✅"

def auto_optimize():
    """Avtomatska optimizacija pametnega doma"""
    start_smart_home_optimizer()
    return "Pametni dom optimizacija v teku"

def get_status():
    """Pridobi status pametnega doma"""
    active_devices = len([d for d in home_devices.values() if d["status"] == "on"])
    return {
        "module": "smart_home_optimizer",
        "status": "running",
        "total_devices": len(home_devices),
        "active_devices": active_devices,
        "automation_level": round((active_devices / max(len(home_devices), 1)) * 100, 2)
    }

# Inicializacija vzorčnih naprav
add_device("Luči_Dnevna", "lighting", "on")
add_device("Termostat", "climate", "on")
add_device("Varnostna_Kamera", "security", "on")
add_device("Pametni_TV", "entertainment", "off")
add_device("Robotski_Sesalnik", "cleaning", "idle")