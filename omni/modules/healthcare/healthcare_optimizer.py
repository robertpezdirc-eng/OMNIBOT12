"""
OMNI Healthcare Optimizer Module
Spremljanje pacientov, zdravstvene optimizacije in preventivni ukrepi
"""

import threading
import time
from datetime import datetime, timedelta
import json
import os

# Globalne spremenljivke za shranjevanje podatkov
patients = []
appointments = []
health_alerts = []
medical_records = {}

def add_patient(name, age, condition, priority="normal"):
    """Dodaj novega pacienta v sistem"""
    patient = {
        "id": len(patients) + 1,
        "name": name,
        "age": age,
        "condition": condition,
        "priority": priority,
        "last_check": datetime.utcnow().isoformat(),
        "next_appointment": None,
        "status": "active"
    }
    patients.append(patient)
    print(f"🏥 Dodan pacient: {name} ({condition})")
    return patient

def schedule_appointment(patient_id, appointment_date, doctor, type_of_visit):
    """Razporedi termin za pacienta"""
    appointment = {
        "id": len(appointments) + 1,
        "patient_id": patient_id,
        "date": appointment_date,
        "doctor": doctor,
        "type": type_of_visit,
        "status": "scheduled"
    }
    appointments.append(appointment)
    
    # Posodobi pacienta z naslednjim terminom
    for patient in patients:
        if patient["id"] == patient_id:
            patient["next_appointment"] = appointment_date
            break
    
    print(f"📅 Razporejen termin za pacienta ID {patient_id}: {appointment_date}")
    return appointment

def check_patient_alerts():
    """Preveri opozorila za paciente"""
    current_time = datetime.utcnow()
    alerts = []
    
    for patient in patients:
        last_check = datetime.fromisoformat(patient["last_check"].replace('Z', '+00:00'))
        days_since_check = (current_time - last_check).days
        
        # Opozorilo za redne preglede
        if days_since_check > 30 and patient["priority"] == "high":
            alert = f"⚠️ VISOKA PRIORITETA: {patient['name']} ni imel pregleda {days_since_check} dni"
            alerts.append(alert)
            health_alerts.append({
                "patient_id": patient["id"],
                "alert": alert,
                "timestamp": current_time.isoformat(),
                "type": "overdue_checkup"
            })
        elif days_since_check > 90:
            alert = f"📋 {patient['name']} potrebuje redni pregled ({days_since_check} dni)"
            alerts.append(alert)
    
    return alerts

def get_patient_summary():
    """Pridobi povzetek vseh pacientov"""
    total_patients = len(patients)
    high_priority = len([p for p in patients if p["priority"] == "high"])
    active_patients = len([p for p in patients if p["status"] == "active"])
    
    return {
        "total_patients": total_patients,
        "high_priority": high_priority,
        "active_patients": active_patients,
        "recent_alerts": len(health_alerts[-10:])  # Zadnjih 10 opozoril
    }

def update_patient_status(patient_id, new_status, notes=""):
    """Posodobi status pacienta"""
    for patient in patients:
        if patient["id"] == patient_id:
            patient["status"] = new_status
            patient["last_check"] = datetime.utcnow().isoformat()
            if notes:
                if "notes" not in patient:
                    patient["notes"] = []
                patient["notes"].append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "note": notes
                })
            print(f"✅ Posodobljen status pacienta {patient['name']}: {new_status}")
            return True
    return False

def monitor_patients():
    """Kontinuirano spremljanje pacientov"""
    while True:
        try:
            alerts = check_patient_alerts()
            
            if alerts:
                print("🩺 ZDRAVSTVENA OPOZORILA:")
                for alert in alerts:
                    print(f"   {alert}")
            
            # Preveri prihajajoče termine
            upcoming_appointments = []
            current_time = datetime.utcnow()
            
            for appointment in appointments:
                if appointment["status"] == "scheduled":
                    appt_time = datetime.fromisoformat(appointment["date"])
                    if 0 <= (appt_time - current_time).days <= 1:  # Naslednji dan
                        upcoming_appointments.append(appointment)
            
            if upcoming_appointments:
                print("📅 PRIHAJAJOČI TERMINI:")
                for appt in upcoming_appointments:
                    patient_name = next((p["name"] for p in patients if p["id"] == appt["patient_id"]), "Neznano")
                    print(f"   {patient_name} - {appt['date']} ({appt['type']})")
            
            # Statistike
            summary = get_patient_summary()
            print(f"📊 Zdravstveni pregled: {summary['active_patients']} aktivnih pacientov, {summary['high_priority']} visoke prioritete")
            
        except Exception as e:
            print(f"❌ Napaka v zdravstvenem spremljanju: {e}")
        
        time.sleep(600)  # Preveri vsakih 10 minut

def start_healthcare_optimizer():
    """Zaženi zdravstveni optimizer"""
    print("🏥 Zaganjam zdravstveni optimizer...")
    
    # Dodaj nekaj testnih pacientov
    add_patient("Janez Novak", 45, "Diabetes", "high")
    add_patient("Marija Kovač", 32, "Hipertenzija", "normal")
    add_patient("Peter Kranjc", 67, "Srčne težave", "high")
    
    # Razporedi nekaj terminov
    future_date = (datetime.utcnow() + timedelta(days=1)).isoformat()
    schedule_appointment(1, future_date, "Dr. Smith", "Kontrolni pregled")
    
    # Zaženi monitoring thread
    t = threading.Thread(target=monitor_patients)
    t.daemon = True
    t.start()
    
    return "🏥 Zdravstvo modul zagnan ✅"

def auto_optimize():
    """Avtomatska optimizacija zdravstvenega sistema"""
    result = start_healthcare_optimizer()
    print("🔄 Zdravstvena optimizacija v teku...")
    return "Zdravstvo optimizacija v teku"

def get_health_statistics():
    """Pridobi zdravstvene statistike"""
    return {
        "patients": get_patient_summary(),
        "appointments": len(appointments),
        "alerts": len(health_alerts),
        "last_update": datetime.utcnow().isoformat()
    }

# Funkcije za integracijo z OMNI sistemom
def get_module_status():
    """Status modula za OMNI dashboard"""
    return {
        "name": "Healthcare Optimizer",
        "status": "running",
        "patients": len(patients),
        "alerts": len(health_alerts[-5:]),  # Zadnjih 5 opozoril
        "last_check": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    print("🏥 Testiranje Healthcare Optimizer modula...")
    start_healthcare_optimizer()
    time.sleep(5)
    print("✅ Testiranje končano")