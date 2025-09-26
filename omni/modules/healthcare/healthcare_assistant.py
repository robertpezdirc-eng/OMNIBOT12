#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🏥 Omni Healthcare Assistant
============================

Zdravstveni pomočnik za:
- Medicinska analiza podatkov
- Diagnostična podpora
- Zdravstveno svetovanje
- Spremljanje pacientov
- Preventivna medicina
- Veterinarska podpora

Avtor: Omni AI Assistant
Datum: 22. september 2025
Verzija: 1.0 Production
"""

import json
import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import statistics

# Konfiguracija
HEALTHCARE_DB = "omni/data/healthcare.db"
HEALTHCARE_LOG = "omni/logs/healthcare.log"
PATIENTS_FILE = "omni/data/patients.json"
PROTOCOLS_FILE = "omni/data/medical_protocols.json"

# Logging
os.makedirs(os.path.dirname(HEALTHCARE_LOG), exist_ok=True)
logger = logging.getLogger(__name__)

def __name__():
    return "healthcare_assistant"

class PatientType(Enum):
    HUMAN = "human"
    ANIMAL = "animal"

class Priority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class VitalStatus(Enum):
    NORMAL = "normal"
    ABNORMAL = "abnormal"
    CRITICAL = "critical"

@dataclass
class VitalSigns:
    temperature: float  # °C
    heart_rate: int     # bpm
    blood_pressure_systolic: int  # mmHg
    blood_pressure_diastolic: int # mmHg
    respiratory_rate: int  # breaths/min
    oxygen_saturation: float  # %
    timestamp: datetime

@dataclass
class Patient:
    id: str
    name: str
    type: PatientType
    age: int
    gender: str
    species: Optional[str] = None  # Za živali
    medical_history: List[str] = None
    current_medications: List[str] = None
    allergies: List[str] = None
    emergency_contact: Optional[str] = None

@dataclass
class MedicalRecord:
    id: str
    patient_id: str
    date: datetime
    symptoms: List[str]
    diagnosis: Optional[str]
    treatment: Optional[str]
    medications: List[str]
    notes: str
    priority: Priority
    follow_up_date: Optional[datetime] = None

@dataclass
class HealthAlert:
    id: str
    patient_id: str
    alert_type: str
    severity: Priority
    message: str
    timestamp: datetime
    resolved: bool = False

class HealthcareAssistant:
    """🏥 Zdravstveni pomočnik Omni"""
    
    def __init__(self):
        self.patients = {}
        self.medical_records = []
        self.health_alerts = []
        self.medical_protocols = {}
        self._init_database()
        self._load_protocols()
        logger.info("🏥 Zdravstveni pomočnik inicializiran")
    
    def _init_database(self):
        """Inicializacija zdravstvene baze"""
        try:
            os.makedirs(os.path.dirname(HEALTHCARE_DB), exist_ok=True)
            conn = sqlite3.connect(HEALTHCARE_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS patients (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    age INTEGER NOT NULL,
                    gender TEXT NOT NULL,
                    species TEXT,
                    medical_history TEXT,
                    current_medications TEXT,
                    allergies TEXT,
                    emergency_contact TEXT
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS medical_records (
                    id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    symptoms TEXT NOT NULL,
                    diagnosis TEXT,
                    treatment TEXT,
                    medications TEXT,
                    notes TEXT NOT NULL,
                    priority TEXT NOT NULL,
                    follow_up_date TEXT,
                    FOREIGN KEY (patient_id) REFERENCES patients (id)
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vital_signs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT NOT NULL,
                    temperature REAL NOT NULL,
                    heart_rate INTEGER NOT NULL,
                    bp_systolic INTEGER NOT NULL,
                    bp_diastolic INTEGER NOT NULL,
                    respiratory_rate INTEGER NOT NULL,
                    oxygen_saturation REAL NOT NULL,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (patient_id) REFERENCES patients (id)
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS health_alerts (
                    id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    resolved BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY (patient_id) REFERENCES patients (id)
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji zdravstvene baze: {e}")
    
    def _load_protocols(self):
        """Naloži medicinske protokole"""
        try:
            if os.path.exists(PROTOCOLS_FILE):
                with open(PROTOCOLS_FILE, 'r', encoding='utf-8') as f:
                    self.medical_protocols = json.load(f)
            else:
                self._create_default_protocols()
                
        except Exception as e:
            logger.error(f"❌ Napaka pri nalaganju protokolov: {e}")
            self._create_default_protocols()
    
    def _create_default_protocols(self):
        """Ustvari privzete medicinske protokole"""
        self.medical_protocols = {
            "fever_protocol": {
                "condition": "fever",
                "temperature_threshold": 38.0,
                "actions": [
                    "Izmeri temperaturo vsakih 2 uri",
                    "Zagotovi hidracijo",
                    "Razmisli o antipiretiku",
                    "Če temperatura > 39°C, kontaktiraj zdravnika"
                ],
                "medications": ["paracetamol", "ibuprofen"],
                "monitoring_interval": 120  # minut
            },
            "hypertension_protocol": {
                "condition": "hypertension",
                "bp_threshold": {"systolic": 140, "diastolic": 90},
                "actions": [
                    "Preveri krvni tlak ponovno čez 15 minut",
                    "Zagotovi mir in sproščenost",
                    "Preveri trenutne zdravila",
                    "Če tlak ostaja visok, kontaktiraj zdravnika"
                ],
                "medications": ["ACE inhibitorji", "beta blokatorji"],
                "monitoring_interval": 30
            },
            "tachycardia_protocol": {
                "condition": "tachycardia",
                "heart_rate_threshold": 100,
                "actions": [
                    "Preveri srčni utrip ponovno",
                    "Oceni simptome (omotica, bolečina v prsih)",
                    "Zagotovi mir",
                    "Če utrip > 120 bpm, kontaktiraj zdravnika"
                ],
                "monitoring_interval": 15
            },
            "veterinary_fever": {
                "condition": "animal_fever",
                "temperature_threshold": 39.5,  # Za pse in mačke
                "actions": [
                    "Izmeri temperaturo rektalno",
                    "Zagotovi svežo vodo",
                    "Opazuj vedenje živali",
                    "Kontaktiraj veterinarja če temperatura > 40°C"
                ],
                "species_specific": {
                    "dog": {"normal_temp_range": [38.0, 39.2]},
                    "cat": {"normal_temp_range": [38.1, 39.2]},
                    "horse": {"normal_temp_range": [37.2, 38.3]}
                }
            }
        }
        
        self._save_protocols()
    
    def _save_protocols(self):
        """Shrani medicinske protokole"""
        try:
            os.makedirs(os.path.dirname(PROTOCOLS_FILE), exist_ok=True)
            with open(PROTOCOLS_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.medical_protocols, f, indent=2, ensure_ascii=False, default=str)
                
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju protokolov: {e}")
    
    def add_patient(self, name: str, patient_type: PatientType, age: int, 
                   gender: str, species: Optional[str] = None) -> str:
        """Dodaj novega pacienta"""
        try:
            patient_id = f"PAT_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            patient = Patient(
                id=patient_id,
                name=name,
                type=patient_type,
                age=age,
                gender=gender,
                species=species,
                medical_history=[],
                current_medications=[],
                allergies=[]
            )
            
            # Shrani v bazo
            conn = sqlite3.connect(HEALTHCARE_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO patients 
                (id, name, type, age, gender, species, medical_history, current_medications, allergies)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                patient.id, patient.name, patient.type.value, patient.age,
                patient.gender, patient.species, 
                json.dumps(patient.medical_history),
                json.dumps(patient.current_medications),
                json.dumps(patient.allergies)
            ))
            
            conn.commit()
            conn.close()
            
            self.patients[patient_id] = patient
            
            logger.info(f"🏥 Dodan pacient: {name} ({patient_id})")
            return patient_id
            
        except Exception as e:
            logger.error(f"❌ Napaka pri dodajanju pacienta: {e}")
            return ""
    
    def record_vital_signs(self, patient_id: str, vital_signs: VitalSigns) -> bool:
        """Zabeleži vitalne znake"""
        try:
            if patient_id not in self.patients:
                logger.error(f"❌ Pacient {patient_id} ne obstaja")
                return False
            
            # Shrani v bazo
            conn = sqlite3.connect(HEALTHCARE_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO vital_signs 
                (patient_id, temperature, heart_rate, bp_systolic, bp_diastolic, 
                 respiratory_rate, oxygen_saturation, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                patient_id, vital_signs.temperature, vital_signs.heart_rate,
                vital_signs.blood_pressure_systolic, vital_signs.blood_pressure_diastolic,
                vital_signs.respiratory_rate, vital_signs.oxygen_saturation,
                vital_signs.timestamp.isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            # Analiziraj vitalne znake
            self._analyze_vital_signs(patient_id, vital_signs)
            
            logger.info(f"🏥 Zabeleženi vitalni znaki za pacienta {patient_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Napaka pri beleženju vitalnih znakov: {e}")
            return False
    
    def _analyze_vital_signs(self, patient_id: str, vital_signs: VitalSigns):
        """Analiziraj vitalne znake in ustvari opozorila"""
        try:
            patient = self.patients.get(patient_id)
            if not patient:
                return
            
            alerts = []
            
            # Temperatura
            temp_threshold = 38.0 if patient.type == PatientType.HUMAN else 39.5
            if vital_signs.temperature > temp_threshold:
                severity = Priority.HIGH if vital_signs.temperature > temp_threshold + 1 else Priority.MEDIUM
                alerts.append({
                    "type": "fever",
                    "severity": severity,
                    "message": f"Povišana temperatura: {vital_signs.temperature}°C"
                })
            
            # Srčni utrip
            if vital_signs.heart_rate > 100:
                severity = Priority.HIGH if vital_signs.heart_rate > 120 else Priority.MEDIUM
                alerts.append({
                    "type": "tachycardia",
                    "severity": severity,
                    "message": f"Povišan srčni utrip: {vital_signs.heart_rate} bpm"
                })
            elif vital_signs.heart_rate < 60:
                alerts.append({
                    "type": "bradycardia",
                    "severity": Priority.MEDIUM,
                    "message": f"Znižan srčni utrip: {vital_signs.heart_rate} bpm"
                })
            
            # Krvni tlak
            if (vital_signs.blood_pressure_systolic > 140 or 
                vital_signs.blood_pressure_diastolic > 90):
                severity = Priority.HIGH if vital_signs.blood_pressure_systolic > 160 else Priority.MEDIUM
                alerts.append({
                    "type": "hypertension",
                    "severity": severity,
                    "message": f"Povišan krvni tlak: {vital_signs.blood_pressure_systolic}/{vital_signs.blood_pressure_diastolic} mmHg"
                })
            
            # Nasičenost s kisikom
            if vital_signs.oxygen_saturation < 95:
                severity = Priority.CRITICAL if vital_signs.oxygen_saturation < 90 else Priority.HIGH
                alerts.append({
                    "type": "hypoxemia",
                    "severity": severity,
                    "message": f"Nizka nasičenost s kisikom: {vital_signs.oxygen_saturation}%"
                })
            
            # Ustvari opozorila
            for alert_data in alerts:
                self._create_health_alert(
                    patient_id, 
                    alert_data["type"], 
                    alert_data["severity"], 
                    alert_data["message"]
                )
            
        except Exception as e:
            logger.error(f"❌ Napaka pri analizi vitalnih znakov: {e}")
    
    def _create_health_alert(self, patient_id: str, alert_type: str, 
                           severity: Priority, message: str) -> str:
        """Ustvari zdravstveno opozorilo"""
        try:
            alert_id = f"ALERT_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            alert = HealthAlert(
                id=alert_id,
                patient_id=patient_id,
                alert_type=alert_type,
                severity=severity,
                message=message,
                timestamp=datetime.now()
            )
            
            # Shrani v bazo
            conn = sqlite3.connect(HEALTHCARE_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO health_alerts 
                (id, patient_id, alert_type, severity, message, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                alert.id, alert.patient_id, alert.alert_type,
                alert.severity.value, alert.message, alert.timestamp.isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            self.health_alerts.append(alert)
            
            logger.warning(f"🚨 Zdravstveno opozorilo: {message}")
            return alert_id
            
        except Exception as e:
            logger.error(f"❌ Napaka pri ustvarjanju opozorila: {e}")
            return ""
    
    def get_treatment_recommendations(self, patient_id: str, symptoms: List[str]) -> Dict[str, Any]:
        """Pridobi priporočila za zdravljenje"""
        try:
            patient = self.patients.get(patient_id)
            if not patient:
                return {"error": "Pacient ne obstaja"}
            
            recommendations = {
                "patient_id": patient_id,
                "symptoms": symptoms,
                "recommendations": [],
                "protocols_triggered": [],
                "monitoring_required": False,
                "urgency": Priority.LOW
            }
            
            # Analiziraj simptome
            symptom_keywords = {
                "fever": ["vročina", "povišana temperatura", "mrzlica"],
                "pain": ["bolečina", "boli", "krči"],
                "breathing": ["težko dihanje", "zadihanost", "kašelj"],
                "cardiac": ["bolečina v prsih", "palpitacije", "omotica"],
                "gastrointestinal": ["bruhanje", "driska", "slabost"]
            }
            
            triggered_conditions = []
            for condition, keywords in symptom_keywords.items():
                for symptom in symptoms:
                    if any(keyword in symptom.lower() for keyword in keywords):
                        triggered_conditions.append(condition)
                        break
            
            # Generiraj priporočila na podlagi simptomov
            for condition in triggered_conditions:
                if condition == "fever":
                    recommendations["recommendations"].extend([
                        "Izmeri temperaturo",
                        "Zagotovi hidracijo",
                        "Počitek v postelji",
                        "Razmisli o antipiretiku"
                    ])
                    recommendations["protocols_triggered"].append("fever_protocol")
                    recommendations["monitoring_required"] = True
                    recommendations["urgency"] = Priority.MEDIUM
                
                elif condition == "cardiac":
                    recommendations["recommendations"].extend([
                        "Takoj preveri vitalne znake",
                        "Zagotovi mir",
                        "Pripravi se na morebitno nujno pomoč",
                        "Kontaktiraj zdravnika"
                    ])
                    recommendations["urgency"] = Priority.HIGH
                    recommendations["monitoring_required"] = True
                
                elif condition == "breathing":
                    recommendations["recommendations"].extend([
                        "Preveri nasičenost s kisikom",
                        "Zagotovi svež zrak",
                        "Opazuj dihalne težave",
                        "Pripravi inhalator če je na voljo"
                    ])
                    recommendations["urgency"] = Priority.MEDIUM
            
            # Dodaj splošna priporočila
            if not recommendations["recommendations"]:
                recommendations["recommendations"] = [
                    "Opazuj simptome",
                    "Zagotovi počitek",
                    "Hidriraj se",
                    "Kontaktiraj zdravnika če se simptomi poslabšajo"
                ]
            
            # Upoštevaj vrsto pacienta (človek/žival)
            if patient.type == PatientType.ANIMAL:
                animal_specific = [
                    f"Opazuj vedenje živali ({patient.species})",
                    "Zagotovi mir in udobje",
                    "Preveri apetit in pitje vode"
                ]
                recommendations["recommendations"].extend(animal_specific)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju priporočil: {e}")
            return {"error": str(e)}
    
    def analyze_health_trends(self, patient_id: str, days: int = 30) -> Dict[str, Any]:
        """Analiziraj zdravstvene trende pacienta"""
        try:
            conn = sqlite3.connect(HEALTHCARE_DB)
            cursor = conn.cursor()
            
            # Pridobi vitalne znake zadnjih dni
            since_date = datetime.now() - timedelta(days=days)
            cursor.execute('''
                SELECT temperature, heart_rate, bp_systolic, bp_diastolic, 
                       respiratory_rate, oxygen_saturation, timestamp
                FROM vital_signs 
                WHERE patient_id = ? AND timestamp >= ?
                ORDER BY timestamp
            ''', (patient_id, since_date.isoformat()))
            
            vital_records = cursor.fetchall()
            conn.close()
            
            if not vital_records:
                return {"message": "Ni dovolj podatkov za analizo trendov"}
            
            # Analiziraj trende
            temperatures = [record[0] for record in vital_records]
            heart_rates = [record[1] for record in vital_records]
            bp_systolic = [record[2] for record in vital_records]
            bp_diastolic = [record[3] for record in vital_records]
            oxygen_sats = [record[5] for record in vital_records]
            
            trends = {
                "analysis_period": f"{days} dni",
                "total_measurements": len(vital_records),
                "temperature": {
                    "average": statistics.mean(temperatures),
                    "min": min(temperatures),
                    "max": max(temperatures),
                    "trend": "stabilna" if max(temperatures) - min(temperatures) < 1.0 else "variabilna"
                },
                "heart_rate": {
                    "average": statistics.mean(heart_rates),
                    "min": min(heart_rates),
                    "max": max(heart_rates),
                    "trend": "normalen" if 60 <= statistics.mean(heart_rates) <= 100 else "abnormalen"
                },
                "blood_pressure": {
                    "systolic_avg": statistics.mean(bp_systolic),
                    "diastolic_avg": statistics.mean(bp_diastolic),
                    "trend": "normalen" if statistics.mean(bp_systolic) < 140 and statistics.mean(bp_diastolic) < 90 else "povišan"
                },
                "oxygen_saturation": {
                    "average": statistics.mean(oxygen_sats),
                    "min": min(oxygen_sats),
                    "trend": "normalna" if min(oxygen_sats) >= 95 else "nizka"
                }
            }
            
            # Dodaj priporočila na podlagi trendov
            recommendations = []
            
            if trends["temperature"]["max"] > 38.0:
                recommendations.append("Opazuj povišano temperaturo")
            
            if trends["heart_rate"]["trend"] == "abnormalen":
                recommendations.append("Preveri srčno-žilni sistem")
            
            if trends["blood_pressure"]["trend"] == "povišan":
                recommendations.append("Spremljaj krvni tlak redno")
            
            if trends["oxygen_saturation"]["trend"] == "nizka":
                recommendations.append("Preveri dihalni sistem")
            
            trends["recommendations"] = recommendations
            trends["generated_at"] = datetime.now().isoformat()
            
            return trends
            
        except Exception as e:
            logger.error(f"❌ Napaka pri analizi zdravstvenih trendov: {e}")
            return {"error": str(e)}
    
    def auto_optimize(self) -> Dict[str, Any]:
        """Avtomatska zdravstvena optimizacija"""
        try:
            optimization_results = {
                "timestamp": datetime.now().isoformat(),
                "patients_monitored": len(self.patients),
                "alerts_processed": 0,
                "protocols_activated": 0,
                "health_improvements": 0,
                "preventive_actions": 0
            }
            
            # 1. Preveri aktivna opozorila
            active_alerts = [alert for alert in self.health_alerts if not alert.resolved]
            optimization_results["alerts_processed"] = len(active_alerts)
            
            # 2. Aktiviraj protokole za kritična opozorila
            for alert in active_alerts:
                if alert.severity in [Priority.HIGH, Priority.CRITICAL]:
                    protocol_activated = self._activate_medical_protocol(alert)
                    if protocol_activated:
                        optimization_results["protocols_activated"] += 1
            
            # 3. Preventivni ukrepi
            for patient_id, patient in self.patients.items():
                # Analiziraj trende
                trends = self.analyze_health_trends(patient_id, 7)  # Zadnji teden
                
                if "recommendations" in trends and trends["recommendations"]:
                    optimization_results["preventive_actions"] += len(trends["recommendations"])
                
                # Simuliraj izboljšanje zdravja
                if trends.get("total_measurements", 0) > 5:
                    optimization_results["health_improvements"] += 1
            
            # 4. Izračunaj učinkovitost
            total_patients = len(self.patients)
            if total_patients > 0:
                efficiency = min(
                    (optimization_results["protocols_activated"] + 
                     optimization_results["preventive_actions"]) / (total_patients * 2), 
                    1.0
                )
            else:
                efficiency = 0.0
            
            logger.info(f"🏥 Zdravstvena optimizacija: {optimization_results['protocols_activated']} protokolov aktiviranih")
            
            return {
                "success": True,
                "message": f"Zdravstvena optimizacija dokončana",
                "efficiency": efficiency,
                "cost_savings": optimization_results["preventive_actions"] * 50.0,  # Simulacija prihrankov
                "energy_reduction": 0.0,  # Ni relevantno za zdravstvo
                "patients_monitored": optimization_results["patients_monitored"],
                "alerts_resolved": optimization_results["alerts_processed"],
                "protocols_activated": optimization_results["protocols_activated"],
                "health_score_improvement": optimization_results["health_improvements"] * 0.1
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri avtomatski zdravstveni optimizaciji: {e}")
            return {
                "success": False,
                "message": f"Napaka pri zdravstveni optimizaciji: {str(e)}",
                "efficiency": 0.0,
                "cost_savings": 0.0,
                "energy_reduction": 0.0
            }
    
    def _activate_medical_protocol(self, alert: HealthAlert) -> bool:
        """Aktiviraj medicinski protokol"""
        try:
            protocol_key = f"{alert.alert_type}_protocol"
            
            if protocol_key in self.medical_protocols:
                protocol = self.medical_protocols[protocol_key]
                
                # Zabeleži aktivacijo protokola
                logger.info(f"🏥 Aktiviran protokol: {protocol_key} za pacienta {alert.patient_id}")
                
                # V resničnem sistemu bi se izvedli dejanski ukrepi
                # Tukaj samo simuliramo
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Napaka pri aktivaciji protokola: {e}")
            return False
    
    def get_healthcare_summary(self) -> Dict[str, Any]:
        """Pridobi zdravstveni povzetek"""
        try:
            # Statistike pacientov
            total_patients = len(self.patients)
            human_patients = sum(1 for p in self.patients.values() if p.type == PatientType.HUMAN)
            animal_patients = total_patients - human_patients
            
            # Statistike opozoril
            active_alerts = sum(1 for alert in self.health_alerts if not alert.resolved)
            critical_alerts = sum(1 for alert in self.health_alerts 
                                if not alert.resolved and alert.severity == Priority.CRITICAL)
            
            # Zadnje meritve
            conn = sqlite3.connect(HEALTHCARE_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT COUNT(*) FROM vital_signs 
                WHERE timestamp >= date('now', '-1 day')
            ''')
            recent_measurements = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                "patients": {
                    "total": total_patients,
                    "human": human_patients,
                    "animal": animal_patients
                },
                "alerts": {
                    "active": active_alerts,
                    "critical": critical_alerts,
                    "total": len(self.health_alerts)
                },
                "monitoring": {
                    "recent_measurements": recent_measurements,
                    "protocols_available": len(self.medical_protocols)
                },
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju zdravstvenega povzetka: {e}")
            return {}

# Globalna instanca
healthcare_assistant = HealthcareAssistant()

# Funkcije za kompatibilnost
def auto_optimize():
    return healthcare_assistant.auto_optimize()

def add_patient(name: str, patient_type: str, age: int, gender: str, species: str = None):
    return healthcare_assistant.add_patient(name, PatientType(patient_type), age, gender, species)

def record_vital_signs(patient_id: str, temperature: float, heart_rate: int, 
                      bp_systolic: int, bp_diastolic: int, respiratory_rate: int, oxygen_saturation: float):
    vital_signs = VitalSigns(
        temperature=temperature,
        heart_rate=heart_rate,
        blood_pressure_systolic=bp_systolic,
        blood_pressure_diastolic=bp_diastolic,
        respiratory_rate=respiratory_rate,
        oxygen_saturation=oxygen_saturation,
        timestamp=datetime.now()
    )
    return healthcare_assistant.record_vital_signs(patient_id, vital_signs)

def get_healthcare_summary():
    return healthcare_assistant.get_healthcare_summary()

if __name__ == "__main__":
    # Test zdravstvenega pomočnika
    print("🏥 Testiranje zdravstvenega pomočnika...")
    
    # Dodaj testnega pacienta
    patient_id = add_patient("Testni Pacient", "human", 35, "M")
    print(f"Dodan pacient: {patient_id}")
    
    # Zabeleži vitalne znake
    record_vital_signs(patient_id, 38.5, 95, 130, 85, 18, 98.0)
    print("Zabeleženi vitalni znaki")
    
    # Izvedi optimizacijo
    result = auto_optimize()
    print(f"Rezultat optimizacije: {result}")
    
    # Pridobi povzetek
    summary = get_healthcare_summary()
    print(f"Zdravstveni povzetek: {summary}")