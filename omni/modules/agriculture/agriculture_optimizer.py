"""
OMNI Agriculture Optimizer Module
Spremljanje pridelkov, živali, kmetijske optimizacije in analitike
"""

import threading
import time
from datetime import datetime, timedelta
import json
import random

# Globalne spremenljivke za shranjevanje podatkov
fields = {}
animals = {}
weather_data = {}
harvest_records = []
feeding_schedule = {}
crop_rotation_plan = {}

def add_field(name, crop_type, area, soil_type="normal"):
    """Dodaj novo polje"""
    fields[name] = {
        "crop": crop_type,
        "area": area,  # v hektarjih
        "soil_type": soil_type,
        "status": "healthy",
        "planting_date": None,
        "expected_harvest": None,
        "irrigation_level": "optimal",
        "fertilizer_last_applied": None,
        "yield_estimate": 0,
        "growth_stage": "planted"
    }
    print(f"🌾 Dodano polje: {name} ({crop_type}, {area} ha)")
    return fields[name]

def add_animal(species, count, age_group="adult"):
    """Dodaj živali"""
    if species not in animals:
        animals[species] = {
            "total_count": 0,
            "groups": {},
            "health_status": "healthy",
            "last_feeding": None,
            "production_data": {}
        }
    
    if age_group not in animals[species]["groups"]:
        animals[species]["groups"][age_group] = 0
    
    animals[species]["groups"][age_group] += count
    animals[species]["total_count"] += count
    
    print(f"🐄 Dodane živali: {count} {species} ({age_group})")
    return animals[species]

def plant_crop(field_name, planting_date, expected_harvest_days=90):
    """Posadi pridelek na polje"""
    if field_name in fields:
        fields[field_name]["planting_date"] = planting_date
        plant_date = datetime.fromisoformat(planting_date)
        harvest_date = plant_date + timedelta(days=expected_harvest_days)
        fields[field_name]["expected_harvest"] = harvest_date.isoformat()
        fields[field_name]["growth_stage"] = "growing"
        
        print(f"🌱 Posajeno na polju {field_name}, pričakovana žetev: {harvest_date.strftime('%Y-%m-%d')}")
        return True
    return False

def feed_animals(species, feed_type, quantity):
    """Nahrani živali"""
    if species in animals:
        animals[species]["last_feeding"] = datetime.utcnow().isoformat()
        
        if species not in feeding_schedule:
            feeding_schedule[species] = []
        
        feeding_schedule[species].append({
            "date": datetime.utcnow().isoformat(),
            "feed_type": feed_type,
            "quantity": quantity
        })
        
        print(f"🥕 Nahranjen {species}: {quantity}kg {feed_type}")
        return True
    return False

def check_crop_health():
    """Preveri zdravje pridelkov"""
    alerts = []
    current_time = datetime.utcnow()
    
    for field_name, field_info in fields.items():
        # Preveri potrebo po namakanju
        if field_info["irrigation_level"] == "low":
            alerts.append(f"💧 {field_name} potrebuje namakanje")
        
        # Preveri potrebo po gnojenju
        if field_info["fertilizer_last_applied"]:
            last_fertilizer = datetime.fromisoformat(field_info["fertilizer_last_applied"])
            days_since_fertilizer = (current_time - last_fertilizer).days
            if days_since_fertilizer > 30:
                alerts.append(f"🌿 {field_name} potrebuje gnojenje")
        
        # Preveri žetev
        if field_info["expected_harvest"]:
            harvest_date = datetime.fromisoformat(field_info["expected_harvest"])
            days_to_harvest = (harvest_date - current_time).days
            if days_to_harvest <= 7 and days_to_harvest >= 0:
                alerts.append(f"🚜 {field_name} pripravljen za žetev v {days_to_harvest} dneh")
            elif days_to_harvest < 0:
                alerts.append(f"⚠️ {field_name} prekoračena žetev za {abs(days_to_harvest)} dni")
    
    return alerts

def check_animal_health():
    """Preveri zdravje živali"""
    alerts = []
    current_time = datetime.utcnow()
    
    for species, animal_info in animals.items():
        # Preveri hranjenje
        if animal_info["last_feeding"]:
            last_feeding = datetime.fromisoformat(animal_info["last_feeding"])
            hours_since_feeding = (current_time - last_feeding).total_seconds() / 3600
            
            if hours_since_feeding > 12:  # Več kot 12 ur
                alerts.append(f"🍽️ {species} potrebuje hranjenje ({hours_since_feeding:.1f}h od zadnjega)")
        else:
            alerts.append(f"❗ {species} še ni bil nahranjen")
        
        # Preveri zdravstveno stanje
        if animal_info["health_status"] != "healthy":
            alerts.append(f"🏥 {species} potrebuje veterinarsko oskrbo")
    
    return alerts

def calculate_yield_estimates():
    """Izračunaj ocene pridelka"""
    estimates = {}
    
    for field_name, field_info in fields.items():
        if field_info["growth_stage"] in ["growing", "mature"]:
            # Osnovna ocena na podlagi vrste pridelka in površine
            base_yield_per_ha = {
                "pšenica": 6.5,  # tone/ha
                "koruza": 8.0,
                "krompir": 25.0,
                "soja": 3.2,
                "ječmen": 5.8
            }
            
            crop = field_info["crop"].lower()
            base_yield = base_yield_per_ha.get(crop, 5.0)  # Privzeta vrednost
            
            # Prilagodi glede na stanje polja
            multiplier = 1.0
            if field_info["status"] == "excellent":
                multiplier = 1.2
            elif field_info["status"] == "poor":
                multiplier = 0.7
            
            estimated_yield = base_yield * field_info["area"] * multiplier
            estimates[field_name] = {
                "crop": field_info["crop"],
                "estimated_tons": round(estimated_yield, 2),
                "area_ha": field_info["area"],
                "yield_per_ha": round(estimated_yield / field_info["area"], 2)
            }
    
    return estimates

def get_production_summary():
    """Pridobi povzetek proizvodnje"""
    total_fields = len(fields)
    total_area = sum(field["area"] for field in fields.values())
    total_animals = sum(animal["total_count"] for animal in animals.values())
    
    yield_estimates = calculate_yield_estimates()
    total_estimated_yield = sum(est["estimated_tons"] for est in yield_estimates.values())
    
    return {
        "fields": total_fields,
        "total_area_ha": total_area,
        "animals": total_animals,
        "estimated_yield_tons": round(total_estimated_yield, 2),
        "crop_types": list(set(field["crop"] for field in fields.values())),
        "animal_species": list(animals.keys())
    }

def apply_fertilizer(field_name, fertilizer_type):
    """Gnoji polje"""
    if field_name in fields:
        fields[field_name]["fertilizer_last_applied"] = datetime.utcnow().isoformat()
        print(f"🌿 Gnojeno polje {field_name} z {fertilizer_type}")
        return True
    return False

def harvest_crop(field_name, actual_yield):
    """Požanji pridelek"""
    if field_name in fields:
        harvest_record = {
            "field": field_name,
            "crop": fields[field_name]["crop"],
            "harvest_date": datetime.utcnow().isoformat(),
            "yield_tons": actual_yield,
            "area_ha": fields[field_name]["area"],
            "yield_per_ha": actual_yield / fields[field_name]["area"]
        }
        
        harvest_records.append(harvest_record)
        fields[field_name]["growth_stage"] = "harvested"
        fields[field_name]["status"] = "ready_for_planting"
        
        print(f"🚜 Požet {field_name}: {actual_yield} ton {fields[field_name]['crop']}")
        return harvest_record
    return None

def monitor_agriculture():
    """Kontinuirano spremljanje kmetijstva"""
    while True:
        try:
            print("🚜 KMETIJSKI PREGLED:")
            
            # Preveri zdravje pridelkov
            crop_alerts = check_crop_health()
            for alert in crop_alerts:
                print(f"   {alert}")
            
            # Preveri zdravje živali
            animal_alerts = check_animal_health()
            for alert in animal_alerts:
                print(f"   {alert}")
            
            # Prikaži stanje polj
            for field_name, field_info in fields.items():
                print(f"🌾 {field_name} ({field_info['crop']}): {field_info['status']} - {field_info['growth_stage']}")
            
            # Prikaži stanje živali
            for species, animal_info in animals.items():
                total_count = animal_info["total_count"]
                health = animal_info["health_status"]
                print(f"🐄 {species}: {total_count} živali - {health}")
            
            # Prikaži povzetek proizvodnje
            summary = get_production_summary()
            print(f"📊 Skupno: {summary['fields']} polj ({summary['total_area_ha']} ha), {summary['animals']} živali")
            print(f"📈 Ocenjen pridelek: {summary['estimated_yield_tons']} ton")
            
        except Exception as e:
            print(f"❌ Napaka v kmetijskem spremljanju: {e}")
        
        time.sleep(600)  # Preveri vsakih 10 minut

def start_agriculture_optimizer():
    """Zaženi kmetijski optimizer"""
    print("🚜 Zaganjam kmetijski optimizer...")
    
    # Dodaj nekaj testnih polj
    add_field("Polje 1", "Pšenica", 5.2, "rodovitna")
    add_field("Polje 2", "Koruza", 3.8, "normalna")
    add_field("Polje 3", "Krompir", 2.1, "peščena")
    
    # Dodaj nekaj testnih živali
    add_animal("Krave", 25, "adult")
    add_animal("Prašiči", 40, "adult")
    add_animal("Kokoši", 150, "adult")
    
    # Posadi pridelke
    planting_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
    plant_crop("Polje 1", planting_date, 120)  # Pšenica 120 dni
    plant_crop("Polje 2", planting_date, 100)  # Koruza 100 dni
    
    # Nahrani živali
    feed_animals("Krave", "seno", 200)
    feed_animals("Prašiči", "žito", 80)
    feed_animals("Kokoši", "koruza", 15)
    
    # Zaženi monitoring thread
    t = threading.Thread(target=monitor_agriculture)
    t.daemon = True
    t.start()
    
    return "🚜 Kmetijstvo modul zagnan ✅"

def auto_optimize():
    """Avtomatska optimizacija kmetijskega sistema"""
    result = start_agriculture_optimizer()
    print("🔄 Kmetijska optimizacija v teku...")
    return "Kmetijstvo optimizacija v teku"

def get_agriculture_statistics():
    """Pridobi kmetijske statistike"""
    return {
        "production": get_production_summary(),
        "yield_estimates": calculate_yield_estimates(),
        "harvest_history": len(harvest_records),
        "last_update": datetime.utcnow().isoformat()
    }

# Funkcije za integracijo z OMNI sistemom
def get_module_status():
    """Status modula za OMNI dashboard"""
    summary = get_production_summary()
    
    return {
        "name": "Agriculture Optimizer",
        "status": "running",
        "fields": summary["fields"],
        "animals": summary["animals"],
        "total_area": f"{summary['total_area_ha']} ha",
        "estimated_yield": f"{summary['estimated_yield_tons']} t",
        "last_check": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    print("🚜 Testiranje Agriculture Optimizer modula...")
    start_agriculture_optimizer()
    time.sleep(5)
    print("✅ Testiranje končano")