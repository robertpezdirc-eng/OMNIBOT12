"""
OMNI Autonomous Vehicles Optimizer Module
Nadzor in optimizacija avtonomnih vozil
"""

import threading
import time
from datetime import datetime

vehicles = {}

def add_vehicle(name, status="idle"):
    """Dodaj vozilo v sistem"""
    vehicles[name] = {"status": status, "last_check": datetime.utcnow().isoformat()}

def monitor_vehicles():
    """Spremljaj vozila"""
    while True:
        for vehicle, info in vehicles.items():
            print(f"🚗 {vehicle}: stanje {info['status']}, zadnji pregled {info['last_check']}")
        time.sleep(120)

def start_autonomous_vehicles_optimizer():
    """Zaženi autonomous vehicles optimizer"""
    t = threading.Thread(target=monitor_vehicles)
    t.daemon = True
    t.start()
    return "🚗 Avtonomna vozila modul zagnan ✅"

def auto_optimize():
    """Avtomatska optimizacija avtonomnih vozil"""
    start_autonomous_vehicles_optimizer()
    return "Avtonomna vozila optimizacija v teku"

def get_status():
    """Pridobi status avtonomnih vozil"""
    active_vehicles = len([v for v in vehicles.values() if v["status"] == "driving"])
    return {
        "module": "autonomous_vehicles_optimizer",
        "status": "running",
        "total_vehicles": len(vehicles),
        "active_vehicles": active_vehicles,
        "idle_vehicles": len([v for v in vehicles.values() if v["status"] == "idle"])
    }

# Inicializacija vzorčnih vozil
add_vehicle("Avtonomni_Avto_1", "driving")
add_vehicle("Avtonomni_Avto_2", "idle")
add_vehicle("Dostava_Dron_1", "charging")
add_vehicle("Tovornjak_AI", "driving")