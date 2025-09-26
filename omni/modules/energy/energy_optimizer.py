"""
OMNI Energy Optimizer Module
Nadzor in optimizacija porabe energije
"""

import threading
import time
from datetime import datetime

energy_sources = {"solar": 0, "wind": 0, "grid": 0}
energy_consumption = 0

def update_energy(source, amount):
    """Posodobi energijski vir"""
    if source in energy_sources:
        energy_sources[source] += amount

def monitor_energy():
    """Spremljaj energijo"""
    while True:
        total = sum(energy_sources.values())
        print(f"⚡ Poraba energije: {energy_consumption}, proizvodnja: {total}")
        time.sleep(300)

def start_energy_optimizer():
    """Zaženi energy optimizer"""
    t = threading.Thread(target=monitor_energy)
    t.daemon = True
    t.start()
    return "⚡ Energija modul zagnan ✅"

def auto_optimize():
    """Avtomatska optimizacija energije"""
    start_energy_optimizer()
    return "Energija optimizacija v teku"

def get_status():
    """Pridobi status energije"""
    total_production = sum(energy_sources.values())
    return {
        "module": "energy_optimizer",
        "status": "running",
        "total_production": total_production,
        "consumption": energy_consumption,
        "efficiency": round((total_production / max(energy_consumption, 1)) * 100, 2)
    }

# Inicializacija vzorčnih podatkov
update_energy("solar", 150)
update_energy("wind", 80)
update_energy("grid", 200)
energy_consumption = 350