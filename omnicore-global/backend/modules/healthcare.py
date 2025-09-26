"""
OmniCore Healthcare Module
Zdravstveni modul z AI diagnostiko in telemedicino
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json
from decimal import Decimal

logger = logging.getLogger(__name__)

class HealthcareModule:
    """Zdravstveni modul za OmniCore Global"""
    
    def __init__(self, db_manager, config):
        self.db_manager = db_manager
        self.config = config
        self.module_config = config.get_module_config("healthcare")
        
        self.name = "healthcare"
        self.description = "Zdravstveni modul z AI diagnostiko, telemedicino in wellness programi"
        self.version = "1.0.0"
        self.capabilities = [
            "patient_management",
            "ai_diagnostics",
            "telemedicine",
            "wellness_tracking",
            "medical_records",
            "appointment_scheduling",
            "health_analytics",
            "emergency_response"
        ]
        
        # Demo podatki
        self.demo_data = self._initialize_demo_data()
        
        logger.info("🏥 Healthcare Module inicializiran")
    
    def _initialize_demo_data(self) -> Dict[str, Any]:
        """Inicializacija demo zdravstvenih podatkov"""
        return {
            "patients": [
                {
                    "id": "PAT-001",
                    "name": "Janez Novak",
                    "age": 45,
                    "gender": "M",
                    "blood_type": "A+",
                    "allergies": ["penicillin"],
                    "chronic_conditions": ["diabetes_type2"],
                    "last_visit": "2024-01-15",
                    "next_appointment": "2024-02-15"
                },
                {
                    "id": "PAT-002", 
                    "name": "Ana Kovač",
                    "age": 32,
                    "gender": "F",
                    "blood_type": "O-",
                    "allergies": [],
                    "chronic_conditions": [],
                    "last_visit": "2024-01-20",
                    "next_appointment": "2024-03-01"
                }
            ],
            "appointments": [
                {
                    "id": "APP-001",
                    "patient_id": "PAT-001",
                    "doctor": "Dr. Marija Zdravnik",
                    "date": "2024-02-15",
                    "time": "10:00",
                    "type": "kontrolni_pregled",
                    "status": "scheduled"
                },
                {
                    "id": "APP-002",
                    "patient_id": "PAT-002", 
                    "doctor": "Dr. Peter Specialist",
                    "date": "2024-03-01",
                    "time": "14:30",
                    "type": "preventivni_pregled",
                    "status": "scheduled"
                }
            ],
            "vital_signs": [
                {
                    "patient_id": "PAT-001",
                    "date": "2024-01-25",
                    "blood_pressure": "140/90",
                    "heart_rate": 78,
                    "temperature": 36.6,
                    "weight": 85.2,
                    "blood_sugar": 8.5
                },
                {
                    "patient_id": "PAT-002",
                    "date": "2024-01-25", 
                    "blood_pressure": "120/80",
                    "heart_rate": 65,
                    "temperature": 36.4,
                    "weight": 62.1,
                    "blood_sugar": 5.2
                }
            ],
            "medications": [
                {
                    "patient_id": "PAT-001",
                    "medication": "Metformin",
                    "dosage": "500mg",
                    "frequency": "2x dnevno",
                    "start_date": "2023-06-01",
                    "active": True
                }
            ],
            "wellness_programs": [
                {
                    "id": "WP-001",
                    "name": "Diabetes Management Program",
                    "description": "Celovit program za upravljanje sladkorne bolezni",
                    "participants": ["PAT-001"],
                    "duration_weeks": 12,
                    "progress": 65
                },
                {
                    "id": "WP-002",
                    "name": "Preventive Health Screening",
                    "description": "Preventivni zdravstveni pregledi",
                    "participants": ["PAT-002"],
                    "duration_weeks": 4,
                    "progress": 25
                }
            ]
        }
    
    async def handle(self, query: str, tenant_id: str = "default", 
                    user_id: str = "anonymous", context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Glavna metoda za obdelavo zdravstvenih poizvedb"""
        
        query_lower = query.lower()
        
        try:
            # Analiza poizvedbe in usmerjanje
            if any(word in query_lower for word in ["patient", "pacient", "bolnik"]):
                return await self._handle_patient_query(query, tenant_id, context)
            
            elif any(word in query_lower for word in ["appointment", "termin", "pregled"]):
                return await self._handle_appointment_query(query, tenant_id, context)
            
            elif any(word in query_lower for word in ["vital", "vitalni", "krvni", "tlak", "sladkor"]):
                return await self._handle_vitals_query(query, tenant_id, context)
            
            elif any(word in query_lower for word in ["medication", "zdravilo", "terapija"]):
                return await self._handle_medication_query(query, tenant_id, context)
            
            elif any(word in query_lower for word in ["wellness", "program", "preventiva"]):
                return await self._handle_wellness_query(query, tenant_id, context)
            
            elif any(word in query_lower for word in ["emergency", "nujno", "urgentno"]):
                return await self._handle_emergency_query(query, tenant_id, context)
            
            elif any(word in query_lower for word in ["analytics", "analitika", "statistika"]):
                return await self._handle_analytics_query(query, tenant_id, context)
            
            else:
                # Splošni zdravstveni pregled
                return await self._get_health_overview(tenant_id)
                
        except Exception as e:
            logger.error(f"Napaka v Healthcare modulu: {str(e)}")
            return {
                "error": f"Napaka pri obdelavi zdravstvene poizvedbe: {str(e)}",
                "module": "healthcare"
            }
    
    async def _handle_patient_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava poizvedb o pacientih"""
        
        patients = self.demo_data["patients"]
        
        if "diabetes" in query.lower() or "sladkor" in query.lower():
            diabetic_patients = [p for p in patients if "diabetes_type2" in p.get("chronic_conditions", [])]
            
            return {
                "type": "diabetic_patients",
                "patients": diabetic_patients,
                "count": len(diabetic_patients),
                "message": f"Najdenih {len(diabetic_patients)} pacientov s sladkorno boleznijo",
                "recommendations": [
                    "Redni kontrolni pregledi vsakih 3 mesece",
                    "Spremljanje krvnega sladkorja",
                    "Vključitev v Diabetes Management Program"
                ]
            }
        
        elif "allergy" in query.lower() or "alergij" in query.lower():
            allergy_patients = [p for p in patients if p.get("allergies")]
            
            return {
                "type": "allergy_patients", 
                "patients": allergy_patients,
                "count": len(allergy_patients),
                "allergies_summary": {p["name"]: p["allergies"] for p in allergy_patients}
            }
        
        else:
            # Vsi pacienti
            return {
                "type": "all_patients",
                "patients": patients,
                "count": len(patients),
                "summary": {
                    "average_age": sum(p["age"] for p in patients) / len(patients),
                    "gender_distribution": {
                        "male": len([p for p in patients if p["gender"] == "M"]),
                        "female": len([p for p in patients if p["gender"] == "F"])
                    },
                    "chronic_conditions": len([p for p in patients if p.get("chronic_conditions")])
                }
            }
    
    async def _handle_appointment_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava poizvedb o terminih"""
        
        appointments = self.demo_data["appointments"]
        
        if "today" in query.lower() or "danes" in query.lower():
            today = datetime.now().strftime('%Y-%m-%d')
            today_appointments = [app for app in appointments if app["date"] == today]
            
            return {
                "type": "today_appointments",
                "appointments": today_appointments,
                "count": len(today_appointments),
                "message": f"Danes imate {len(today_appointments)} terminov"
            }
        
        elif "upcoming" in query.lower() or "prihajajoč" in query.lower():
            today = datetime.now().date()
            upcoming = []
            
            for app in appointments:
                app_date = datetime.strptime(app["date"], '%Y-%m-%d').date()
                if app_date >= today:
                    upcoming.append(app)
            
            return {
                "type": "upcoming_appointments",
                "appointments": upcoming,
                "count": len(upcoming),
                "message": f"Imate {len(upcoming)} prihajajoče termine"
            }
        
        else:
            # Vsi termini
            return {
                "type": "all_appointments",
                "appointments": appointments,
                "count": len(appointments),
                "by_status": {
                    "scheduled": len([app for app in appointments if app["status"] == "scheduled"]),
                    "completed": len([app for app in appointments if app["status"] == "completed"]),
                    "cancelled": len([app for app in appointments if app["status"] == "cancelled"])
                }
            }
    
    async def _handle_vitals_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava poizvedb o vitalnih znakih"""
        
        vitals = self.demo_data["vital_signs"]
        
        # Analiza trendov
        trends = {}
        for vital in vitals:
            patient_id = vital["patient_id"]
            if patient_id not in trends:
                trends[patient_id] = []
            trends[patient_id].append(vital)
        
        # Identifikacija kritičnih vrednosti
        alerts = []
        for vital in vitals:
            # Preveri krvni tlak
            if vital.get("blood_pressure"):
                systolic = int(vital["blood_pressure"].split("/")[0])
                if systolic > 140:
                    alerts.append({
                        "patient_id": vital["patient_id"],
                        "type": "high_blood_pressure",
                        "value": vital["blood_pressure"],
                        "severity": "high" if systolic > 160 else "medium"
                    })
            
            # Preveri krvni sladkor
            if vital.get("blood_sugar") and vital["blood_sugar"] > 7.0:
                alerts.append({
                    "patient_id": vital["patient_id"],
                    "type": "high_blood_sugar",
                    "value": vital["blood_sugar"],
                    "severity": "high" if vital["blood_sugar"] > 10.0 else "medium"
                })
        
        return {
            "type": "vitals_analysis",
            "vitals": vitals,
            "trends": trends,
            "alerts": alerts,
            "summary": {
                "total_measurements": len(vitals),
                "patients_monitored": len(set(v["patient_id"] for v in vitals)),
                "critical_alerts": len([a for a in alerts if a["severity"] == "high"])
            }
        }
    
    async def _handle_medication_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava poizvedb o zdravilih"""
        
        medications = self.demo_data["medications"]
        
        active_meds = [med for med in medications if med.get("active", True)]
        
        return {
            "type": "medication_management",
            "medications": medications,
            "active_count": len(active_meds),
            "by_patient": {
                med["patient_id"]: [m for m in medications if m["patient_id"] == med["patient_id"]]
                for med in medications
            },
            "drug_interactions": [],  # Placeholder za preverjanje interakcij
            "refill_reminders": [
                {
                    "patient_id": "PAT-001",
                    "medication": "Metformin",
                    "days_remaining": 7
                }
            ]
        }
    
    async def _handle_wellness_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava poizvedb o wellness programih"""
        
        programs = self.demo_data["wellness_programs"]
        
        return {
            "type": "wellness_programs",
            "programs": programs,
            "total_participants": sum(len(p["participants"]) for p in programs),
            "average_progress": sum(p["progress"] for p in programs) / len(programs),
            "completion_rates": {
                p["id"]: f"{p['progress']}%" for p in programs
            },
            "recommendations": [
                "Dodajte nove preventivne programe",
                "Povečajte sodelovanje pacientov",
                "Implementirajte gamifikacijo"
            ]
        }
    
    async def _handle_emergency_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava nujnih primerov"""
        
        return {
            "type": "emergency_response",
            "status": "ready",
            "emergency_contacts": [
                {"name": "Urgentni center", "phone": "112"},
                {"name": "Dežurni zdravnik", "phone": "+386 1 234 5678"}
            ],
            "protocols": [
                "Ocenite stanje pacienta",
                "Pokličite nujno medicinsko pomoč",
                "Nudite prvo pomoč",
                "Dokumentirajte dogodek"
            ],
            "nearest_hospitals": [
                {"name": "UKC Ljubljana", "distance": "2.5 km", "eta": "8 min"},
                {"name": "Splošna bolnišnica", "distance": "5.1 km", "eta": "12 min"}
            ]
        }
    
    async def _handle_analytics_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava analitičnih poizvedb"""
        
        patients = self.demo_data["patients"]
        appointments = self.demo_data["appointments"]
        vitals = self.demo_data["vital_signs"]
        
        return {
            "type": "health_analytics",
            "patient_demographics": {
                "total_patients": len(patients),
                "age_groups": {
                    "18-30": len([p for p in patients if 18 <= p["age"] <= 30]),
                    "31-50": len([p for p in patients if 31 <= p["age"] <= 50]),
                    "51+": len([p for p in patients if p["age"] > 50])
                },
                "chronic_conditions_prevalence": {
                    "diabetes": len([p for p in patients if "diabetes_type2" in p.get("chronic_conditions", [])]),
                    "hypertension": 0,  # Placeholder
                    "none": len([p for p in patients if not p.get("chronic_conditions")])
                }
            },
            "appointment_metrics": {
                "total_scheduled": len(appointments),
                "completion_rate": 85.5,  # Placeholder
                "average_wait_time": "12 min"
            },
            "health_trends": {
                "blood_pressure_control": 78.5,
                "diabetes_management": 82.3,
                "medication_adherence": 91.2
            }
        }
    
    async def _get_health_overview(self, tenant_id: str) -> Dict[str, Any]:
        """Splošni zdravstveni pregled"""
        
        patients = self.demo_data["patients"]
        appointments = self.demo_data["appointments"]
        programs = self.demo_data["wellness_programs"]
        
        return {
            "type": "health_overview",
            "summary": {
                "total_patients": len(patients),
                "scheduled_appointments": len([app for app in appointments if app["status"] == "scheduled"]),
                "active_programs": len(programs),
                "chronic_patients": len([p for p in patients if p.get("chronic_conditions")])
            },
            "quick_actions": [
                "Dodaj novega pacienta",
                "Razporedi termin",
                "Preglej vitalne znake",
                "Ustvari wellness program"
            ],
            "alerts": [
                "2 pacienta potrebujeta kontrolni pregled",
                "1 pacient ima visok krvni tlak",
                "Wellness program dosega 65% napredka"
            ]
        }
    
    async def schedule_appointment(self, patient_id: str, doctor: str, date: str, time: str, 
                                 appointment_type: str, tenant_id: str = "default") -> Dict[str, Any]:
        """Razporedi nov termin"""
        try:
            appointment_id = f"APP-{len(self.demo_data['appointments']) + 1:03d}"
            
            new_appointment = {
                "id": appointment_id,
                "patient_id": patient_id,
                "doctor": doctor,
                "date": date,
                "time": time,
                "type": appointment_type,
                "status": "scheduled"
            }
            
            self.demo_data["appointments"].append(new_appointment)
            
            # Shrani v bazo
            await self.db_manager.save_module_data(tenant_id, "healthcare", "appointment", new_appointment)
            
            return {
                "success": True,
                "appointment": new_appointment,
                "message": f"Termin {appointment_id} uspešno razporejen"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def add_vital_signs(self, patient_id: str, vitals: Dict[str, Any], 
                            tenant_id: str = "default") -> Dict[str, Any]:
        """Dodaj vitalne znake"""
        try:
            vital_record = {
                "patient_id": patient_id,
                "date": datetime.now().strftime('%Y-%m-%d'),
                **vitals
            }
            
            self.demo_data["vital_signs"].append(vital_record)
            
            # Shrani v bazo
            await self.db_manager.save_module_data(tenant_id, "healthcare", "vitals", vital_record)
            
            return {
                "success": True,
                "vitals": vital_record,
                "message": "Vitalni znaki uspešno dodani"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Podatki za dashboard"""
        
        patients = self.demo_data["patients"]
        appointments = self.demo_data["appointments"]
        vitals = self.demo_data["vital_signs"]
        
        return {
            "total_patients": len(patients),
            "scheduled_appointments": len([app for app in appointments if app["status"] == "scheduled"]),
            "critical_alerts": 1,  # Placeholder
            "wellness_participation": 85.5,
            "charts": {
                "patient_age_distribution": [
                    {"age_group": "18-30", "count": len([p for p in patients if 18 <= p["age"] <= 30])},
                    {"age_group": "31-50", "count": len([p for p in patients if 31 <= p["age"] <= 50])},
                    {"age_group": "51+", "count": len([p for p in patients if p["age"] > 50])}
                ],
                "appointment_trends": [
                    {"month": "Dec", "count": 45},
                    {"month": "Jan", "count": len(appointments)}
                ]
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Zdravstveno preverjanje Healthcare modula"""
        
        try:
            # Preveri demo podatke
            patients_count = len(self.demo_data["patients"])
            appointments_count = len(self.demo_data["appointments"])
            
            # Preveri povezavo z zdravstvenimi sistemi (simulacija)
            ehr_status = "connected" if self.module_config.settings.get("ehr_integration") else "disconnected"
            
            return {
                "status": "healthy",
                "patients_count": patients_count,
                "appointments_count": appointments_count,
                "ehr_connection": ehr_status,
                "last_check": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }