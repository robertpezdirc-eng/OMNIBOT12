"""
🌟 Premium Features - VR/AR, IoT, Energetski nadzor
Avtor: Omni AI Platform
Verzija: 1.0.0

Funkcionalnosti:
- VR/AR interaktivne izkušnje
- IoT senzorji za spremljanje
- Energetski nadzor in optimizacija
- AI simulacije poslovanja
- Samodejno učenje sistema
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
import asyncio
import websockets
import threading
import time

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VRExperienceType(Enum):
    VIRTUAL_TOUR = "virtual_tour"
    AR_MENU = "ar_menu"
    ROOM_PREVIEW = "room_preview"
    INTERACTIVE_MAP = "interactive_map"

class IoTSensorType(Enum):
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    AIR_QUALITY = "air_quality"
    OCCUPANCY = "occupancy"
    ENERGY_CONSUMPTION = "energy_consumption"
    WATER_USAGE = "water_usage"
    NOISE_LEVEL = "noise_level"

class EnergyType(Enum):
    ELECTRICITY = "electricity"
    WATER = "water"
    GAS = "gas"
    HEATING = "heating"
    COOLING = "cooling"

@dataclass
class VRExperience:
    experience_id: str
    name: str
    type: VRExperienceType
    description: str
    content_url: str
    duration_minutes: int
    target_audience: str
    created_at: datetime
    is_active: bool = True

@dataclass
class IoTSensor:
    sensor_id: str
    name: str
    type: IoTSensorType
    location: str
    unit: str
    min_value: float
    max_value: float
    optimal_range: Tuple[float, float]
    alert_threshold: float
    is_active: bool = True

@dataclass
class SensorReading:
    reading_id: str
    sensor_id: str
    value: float
    timestamp: datetime
    is_alert: bool = False
    notes: str = ""

@dataclass
class EnergyConsumption:
    consumption_id: str
    energy_type: EnergyType
    location: str
    consumption: float
    cost: float
    timestamp: datetime
    baseline: float
    efficiency_score: float

class PremiumFeatures:
    def __init__(self, db_path: str = "premium_features.db"):
        self.db_path = db_path
        self.websocket_clients = set()
        self.sensor_monitoring_active = False
        self.init_database()
        logger.info("🌟 Premium Features inicializiran")
    
    def init_database(self):
        """Inicializiraj bazo podatkov"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Tabela za VR/AR izkušnje
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS vr_experiences (
                        experience_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        description TEXT,
                        content_url TEXT NOT NULL,
                        duration_minutes INTEGER DEFAULT 5,
                        target_audience TEXT,
                        usage_count INTEGER DEFAULT 0,
                        rating REAL DEFAULT 0.0,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                # Tabela za IoT senzorje
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS iot_sensors (
                        sensor_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        location TEXT NOT NULL,
                        unit TEXT NOT NULL,
                        min_value REAL NOT NULL,
                        max_value REAL NOT NULL,
                        optimal_min REAL NOT NULL,
                        optimal_max REAL NOT NULL,
                        alert_threshold REAL NOT NULL,
                        last_reading REAL,
                        last_reading_time TEXT,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                # Tabela za odčitke senzorjev
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS sensor_readings (
                        reading_id TEXT PRIMARY KEY,
                        sensor_id TEXT NOT NULL,
                        value REAL NOT NULL,
                        timestamp TEXT NOT NULL,
                        is_alert BOOLEAN DEFAULT 0,
                        notes TEXT,
                        FOREIGN KEY (sensor_id) REFERENCES iot_sensors (sensor_id)
                    )
                ''')
                
                # Tabela za energetsko porabo
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS energy_consumption (
                        consumption_id TEXT PRIMARY KEY,
                        energy_type TEXT NOT NULL,
                        location TEXT NOT NULL,
                        consumption REAL NOT NULL,
                        cost REAL NOT NULL,
                        timestamp TEXT NOT NULL,
                        baseline REAL NOT NULL,
                        efficiency_score REAL DEFAULT 0.0,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                # Tabela za AI simulacije
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS ai_simulations (
                        simulation_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        scenario_data TEXT NOT NULL,
                        results TEXT NOT NULL,
                        accuracy_score REAL DEFAULT 0.0,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                # Tabela za samodejno učenje
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS learning_models (
                        model_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        model_type TEXT NOT NULL,
                        training_data TEXT NOT NULL,
                        performance_metrics TEXT NOT NULL,
                        last_trained TEXT NOT NULL,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                conn.commit()
                
                # Naloži vzorčne podatke
                self._load_sample_data()
                
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji baze: {e}")
    
    def _load_sample_data(self):
        """Naloži vzorčne podatke"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Preveri, če podatki že obstajajo
                cursor.execute("SELECT COUNT(*) FROM vr_experiences")
                if cursor.fetchone()[0] > 0:
                    return
                
                # Vzorčne VR/AR izkušnje
                vr_experiences = [
                    {
                        "experience_id": "vr_hotel_tour",
                        "name": "Virtualni ogled hotela",
                        "type": "virtual_tour",
                        "description": "360° ogled vseh prostorov hotela",
                        "content_url": "/vr/hotel_tour.html",
                        "duration_minutes": 10,
                        "target_audience": "Potencialni gosti"
                    },
                    {
                        "experience_id": "ar_menu_wine",
                        "name": "AR meni z vinsko karto",
                        "type": "ar_menu",
                        "description": "Interaktivni meni z AR prikazom jedi in vin",
                        "content_url": "/ar/menu_experience.html",
                        "duration_minutes": 5,
                        "target_audience": "Gosti restavracije"
                    },
                    {
                        "experience_id": "vr_room_preview",
                        "name": "VR predogled sobe",
                        "type": "room_preview",
                        "description": "Virtualni ogled sobe pred rezervacijo",
                        "content_url": "/vr/room_preview.html",
                        "duration_minutes": 3,
                        "target_audience": "Rezervirajoči gosti"
                    }
                ]
                
                for exp in vr_experiences:
                    cursor.execute('''
                        INSERT OR REPLACE INTO vr_experiences 
                        (experience_id, name, type, description, content_url, 
                         duration_minutes, target_audience, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        exp["experience_id"],
                        exp["name"],
                        exp["type"],
                        exp["description"],
                        exp["content_url"],
                        exp["duration_minutes"],
                        exp["target_audience"],
                        datetime.now().isoformat()
                    ))
                
                # Vzorčni IoT senzorji
                iot_sensors = [
                    {
                        "sensor_id": "temp_lobby",
                        "name": "Temperatura - Lobby",
                        "type": "temperature",
                        "location": "Lobby",
                        "unit": "°C",
                        "min_value": 15.0,
                        "max_value": 30.0,
                        "optimal_min": 20.0,
                        "optimal_max": 24.0,
                        "alert_threshold": 26.0
                    },
                    {
                        "sensor_id": "humid_restaurant",
                        "name": "Vlažnost - Restavracija",
                        "type": "humidity",
                        "location": "Restavracija",
                        "unit": "%",
                        "min_value": 30.0,
                        "max_value": 80.0,
                        "optimal_min": 40.0,
                        "optimal_max": 60.0,
                        "alert_threshold": 70.0
                    },
                    {
                        "sensor_id": "air_kitchen",
                        "name": "Kakovost zraka - Kuhinja",
                        "type": "air_quality",
                        "location": "Kuhinja",
                        "unit": "ppm",
                        "min_value": 0.0,
                        "max_value": 1000.0,
                        "optimal_min": 0.0,
                        "optimal_max": 400.0,
                        "alert_threshold": 600.0
                    },
                    {
                        "sensor_id": "occupancy_conference",
                        "name": "Zasedenost - Konferenčna",
                        "type": "occupancy",
                        "location": "Konferenčna dvorana",
                        "unit": "oseb",
                        "min_value": 0.0,
                        "max_value": 100.0,
                        "optimal_min": 0.0,
                        "optimal_max": 80.0,
                        "alert_threshold": 90.0
                    }
                ]
                
                for sensor in iot_sensors:
                    cursor.execute('''
                        INSERT OR REPLACE INTO iot_sensors 
                        (sensor_id, name, type, location, unit, min_value, max_value,
                         optimal_min, optimal_max, alert_threshold, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        sensor["sensor_id"],
                        sensor["name"],
                        sensor["type"],
                        sensor["location"],
                        sensor["unit"],
                        sensor["min_value"],
                        sensor["max_value"],
                        sensor["optimal_min"],
                        sensor["optimal_max"],
                        sensor["alert_threshold"],
                        datetime.now().isoformat()
                    ))
                
                conn.commit()
                logger.info("✅ Vzorčni premium podatki naloženi")
                
        except Exception as e:
            logger.error(f"Napaka pri nalaganju vzorčnih podatkov: {e}")
    
    def create_vr_experience(self, experience_data: Dict[str, Any]) -> str:
        """Ustvari novo VR/AR izkušnjo"""
        try:
            experience_id = f"VR_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO vr_experiences 
                    (experience_id, name, type, description, content_url,
                     duration_minutes, target_audience, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    experience_id,
                    experience_data["name"],
                    experience_data["type"],
                    experience_data.get("description", ""),
                    experience_data["content_url"],
                    experience_data.get("duration_minutes", 5),
                    experience_data.get("target_audience", "Vsi gosti"),
                    datetime.now().isoformat()
                ))
                
                conn.commit()
            
            logger.info(f"✅ VR izkušnja ustvarjena: {experience_id}")
            return experience_id
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju VR izkušnje: {e}")
            return None
    
    def add_iot_sensor(self, sensor_data: Dict[str, Any]) -> str:
        """Dodaj IoT senzor"""
        try:
            sensor_id = f"IOT_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO iot_sensors 
                    (sensor_id, name, type, location, unit, min_value, max_value,
                     optimal_min, optimal_max, alert_threshold, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    sensor_id,
                    sensor_data["name"],
                    sensor_data["type"],
                    sensor_data["location"],
                    sensor_data["unit"],
                    sensor_data["min_value"],
                    sensor_data["max_value"],
                    sensor_data["optimal_range"][0],
                    sensor_data["optimal_range"][1],
                    sensor_data["alert_threshold"],
                    datetime.now().isoformat()
                ))
                
                conn.commit()
            
            logger.info(f"✅ IoT senzor dodan: {sensor_id}")
            return sensor_id
            
        except Exception as e:
            logger.error(f"Napaka pri dodajanju IoT senzorja: {e}")
            return None
    
    def record_sensor_reading(self, sensor_id: str, value: float, notes: str = "") -> bool:
        """Zabeleži odčitek senzorja"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi podatke o senzorju
                cursor.execute('''
                    SELECT alert_threshold, optimal_min, optimal_max FROM iot_sensors 
                    WHERE sensor_id = ?
                ''', (sensor_id,))
                
                sensor_info = cursor.fetchone()
                if not sensor_info:
                    logger.error(f"Senzor {sensor_id} ni najden")
                    return False
                
                alert_threshold, optimal_min, optimal_max = sensor_info
                
                # Preveri, ali je vrednost v alarmnem območju
                is_alert = value > alert_threshold or value < optimal_min or value > optimal_max
                
                reading_id = f"READ_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
                
                cursor.execute('''
                    INSERT INTO sensor_readings 
                    (reading_id, sensor_id, value, timestamp, is_alert, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    reading_id,
                    sensor_id,
                    value,
                    datetime.now().isoformat(),
                    is_alert,
                    notes
                ))
                
                # Posodobi zadnji odčitek senzorja
                cursor.execute('''
                    UPDATE iot_sensors 
                    SET last_reading = ?, last_reading_time = ?
                    WHERE sensor_id = ?
                ''', (value, datetime.now().isoformat(), sensor_id))
                
                conn.commit()
                
                # Če je alarm, pošlji obvestilo
                if is_alert:
                    self._send_sensor_alert(sensor_id, value, alert_threshold)
                
                logger.info(f"✅ Odčitek zabeležen: {sensor_id} = {value}")
                return True
                
        except Exception as e:
            logger.error(f"Napaka pri beleženju odčitka: {e}")
            return False
    
    def _send_sensor_alert(self, sensor_id: str, value: float, threshold: float):
        """Pošlji alarm za senzor"""
        try:
            alert_message = {
                "type": "sensor_alert",
                "sensor_id": sensor_id,
                "value": value,
                "threshold": threshold,
                "timestamp": datetime.now().isoformat(),
                "message": f"Senzor {sensor_id}: vrednost {value} presega prag {threshold}"
            }
            
            # Pošlji preko WebSocket
            asyncio.create_task(self._broadcast_alert(json.dumps(alert_message)))
            
            logger.warning(f"🚨 Alarm senzorja: {sensor_id} = {value}")
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju alarma: {e}")
    
    async def _broadcast_alert(self, message: str):
        """Pošlji sporočilo vsem WebSocket odjemalcem"""
        if self.websocket_clients:
            await asyncio.gather(
                *[client.send(message) for client in self.websocket_clients],
                return_exceptions=True
            )
    
    def record_energy_consumption(self, energy_data: Dict[str, Any]) -> str:
        """Zabeleži energetsko porabo"""
        try:
            consumption_id = f"ENERGY_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Izračunaj efficiency score
            baseline = energy_data["baseline"]
            consumption = energy_data["consumption"]
            efficiency_score = max(0, (baseline - consumption) / baseline * 100) if baseline > 0 else 0
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO energy_consumption 
                    (consumption_id, energy_type, location, consumption, cost,
                     timestamp, baseline, efficiency_score, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    consumption_id,
                    energy_data["energy_type"],
                    energy_data["location"],
                    consumption,
                    energy_data["cost"],
                    energy_data.get("timestamp", datetime.now().isoformat()),
                    baseline,
                    efficiency_score,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
            
            logger.info(f"✅ Energetska poraba zabeležena: {consumption_id}")
            return consumption_id
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju energetske porabe: {e}")
            return None
    
    def get_energy_optimization_suggestions(self, location: str = None) -> List[Dict[str, Any]]:
        """Pridobi predloge za optimizacijo energije"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi podatke o porabi
                query = '''
                    SELECT energy_type, location, AVG(consumption) as avg_consumption,
                           AVG(efficiency_score) as avg_efficiency, COUNT(*) as readings
                    FROM energy_consumption
                    WHERE created_at >= date('now', '-30 days')
                '''
                
                params = []
                if location:
                    query += " AND location = ?"
                    params.append(location)
                
                query += " GROUP BY energy_type, location"
                
                cursor.execute(query, params)
                consumption_data = cursor.fetchall()
                
                suggestions = []
                
                for row in consumption_data:
                    energy_type, loc, avg_consumption, avg_efficiency, readings = row
                    
                    if avg_efficiency < 70:  # Nizka učinkovitost
                        suggestions.append({
                            "priority": "high",
                            "energy_type": energy_type,
                            "location": loc,
                            "current_efficiency": avg_efficiency,
                            "suggestion": f"Optimiziraj {energy_type} v {loc}",
                            "potential_savings": avg_consumption * 0.15,  # 15% prihrankov
                            "actions": [
                                "Preveri nastavitve opreme",
                                "Razmisli o zamenjavi z energetsko učinkovitejšo opremo",
                                "Implementiraj pametno upravljanje"
                            ]
                        })
                    elif avg_efficiency < 85:  # Srednja učinkovitost
                        suggestions.append({
                            "priority": "medium",
                            "energy_type": energy_type,
                            "location": loc,
                            "current_efficiency": avg_efficiency,
                            "suggestion": f"Izboljšaj učinkovitost {energy_type} v {loc}",
                            "potential_savings": avg_consumption * 0.08,  # 8% prihrankov
                            "actions": [
                                "Optimiziraj urnik delovanja",
                                "Implementiraj senzorje za avtomatsko upravljanje"
                            ]
                        })
                
                # Dodaj splošne predloge
                if not suggestions:
                    suggestions.append({
                        "priority": "low",
                        "energy_type": "general",
                        "location": "all",
                        "current_efficiency": 90,
                        "suggestion": "Sistem deluje učinkovito",
                        "potential_savings": 0,
                        "actions": [
                            "Nadaljuj z rednim spremljanjem",
                            "Razmisli o naprednih optimizacijah"
                        ]
                    })
                
                return suggestions
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju predlogov: {e}")
            return []
    
    def run_ai_simulation(self, scenario_data: Dict[str, Any]) -> Dict[str, Any]:
        """Zaženi AI simulacijo poslovanja"""
        try:
            simulation_id = f"SIM_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Simuliraj različne scenarije
            base_revenue = scenario_data.get("base_revenue", 100000)
            base_costs = scenario_data.get("base_costs", 70000)
            
            scenarios = {
                "optimistic": {
                    "revenue_multiplier": 1.3,
                    "cost_multiplier": 0.9,
                    "probability": 0.2
                },
                "realistic": {
                    "revenue_multiplier": 1.1,
                    "cost_multiplier": 0.95,
                    "probability": 0.6
                },
                "pessimistic": {
                    "revenue_multiplier": 0.9,
                    "cost_multiplier": 1.05,
                    "probability": 0.2
                }
            }
            
            results = {}
            
            for scenario_name, params in scenarios.items():
                projected_revenue = base_revenue * params["revenue_multiplier"]
                projected_costs = base_costs * params["cost_multiplier"]
                profit = projected_revenue - projected_costs
                margin = (profit / projected_revenue * 100) if projected_revenue > 0 else 0
                
                results[scenario_name] = {
                    "revenue": projected_revenue,
                    "costs": projected_costs,
                    "profit": profit,
                    "margin": margin,
                    "probability": params["probability"]
                }
            
            # Izračunaj pričakovano vrednost
            expected_profit = sum(
                results[scenario]["profit"] * results[scenario]["probability"]
                for scenario in results
            )
            
            # Analiza tveganja
            risk_analysis = {
                "best_case": max(results[s]["profit"] for s in results),
                "worst_case": min(results[s]["profit"] for s in results),
                "expected_value": expected_profit,
                "volatility": np.std([results[s]["profit"] for s in results])
            }
            
            simulation_results = {
                "simulation_id": simulation_id,
                "scenarios": results,
                "risk_analysis": risk_analysis,
                "recommendations": self._generate_simulation_recommendations(results, risk_analysis),
                "accuracy_score": 0.85,  # Simulirana natančnost
                "created_at": datetime.now().isoformat()
            }
            
            # Shrani rezultate
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO ai_simulations 
                    (simulation_id, name, scenario_data, results, accuracy_score, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    simulation_id,
                    scenario_data.get("name", "Poslovna simulacija"),
                    json.dumps(scenario_data),
                    json.dumps(simulation_results),
                    0.85,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
            
            logger.info(f"✅ AI simulacija končana: {simulation_id}")
            return simulation_results
            
        except Exception as e:
            logger.error(f"Napaka pri AI simulaciji: {e}")
            return {"error": str(e)}
    
    def _generate_simulation_recommendations(self, scenarios: Dict, risk_analysis: Dict) -> List[str]:
        """Generiraj priporočila na podlagi simulacije"""
        recommendations = []
        
        expected_profit = risk_analysis["expected_value"]
        volatility = risk_analysis["volatility"]
        
        if expected_profit > 0:
            recommendations.append("Pričakovani dobiček je pozitiven - projekt je obetaven")
        else:
            recommendations.append("Pričakovani dobiček je negativen - previdno!")
        
        if volatility > expected_profit * 0.5:
            recommendations.append("Visoko tveganje - razmislite o strategijah zmanjšanja tveganja")
        elif volatility < expected_profit * 0.2:
            recommendations.append("Nizko tveganje - stabilna naložba")
        
        # Specifični predlogi
        best_scenario = max(scenarios.keys(), key=lambda x: scenarios[x]["profit"])
        recommendations.append(f"Najboljši scenarij: {best_scenario} z dobičkom {scenarios[best_scenario]['profit']:,.0f} EUR")
        
        return recommendations
    
    def start_sensor_monitoring(self):
        """Začni spremljanje senzorjev"""
        if self.sensor_monitoring_active:
            return
        
        self.sensor_monitoring_active = True
        
        def monitor_sensors():
            while self.sensor_monitoring_active:
                try:
                    # Simuliraj odčitke senzorjev
                    with sqlite3.connect(self.db_path) as conn:
                        cursor = conn.cursor()
                        
                        cursor.execute("SELECT sensor_id, type FROM iot_sensors WHERE is_active = 1")
                        sensors = cursor.fetchall()
                        
                        for sensor_id, sensor_type in sensors:
                            # Generiraj simuliran odčitek
                            if sensor_type == "temperature":
                                value = np.random.normal(22, 2)  # Povprečje 22°C, standardni odklon 2
                            elif sensor_type == "humidity":
                                value = np.random.normal(50, 10)  # Povprečje 50%, standardni odklon 10
                            elif sensor_type == "air_quality":
                                value = np.random.normal(300, 50)  # Povprečje 300 ppm
                            elif sensor_type == "occupancy":
                                value = np.random.randint(0, 50)  # 0-50 oseb
                            else:
                                value = np.random.normal(50, 10)
                            
                            self.record_sensor_reading(sensor_id, value, "Avtomatski odčitek")
                    
                    time.sleep(60)  # Odčitek vsako minuto
                    
                except Exception as e:
                    logger.error(f"Napaka pri spremljanju senzorjev: {e}")
                    time.sleep(60)
        
        # Zaženi v ločeni niti
        monitoring_thread = threading.Thread(target=monitor_sensors, daemon=True)
        monitoring_thread.start()
        
        logger.info("🔄 Spremljanje senzorjev začeto")
    
    def stop_sensor_monitoring(self):
        """Ustavi spremljanje senzorjev"""
        self.sensor_monitoring_active = False
        logger.info("⏹️ Spremljanje senzorjev ustavljeno")
    
    def get_premium_dashboard_data(self) -> Dict[str, Any]:
        """Pridobi podatke za premium dashboard"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # VR/AR statistike
                cursor.execute('''
                    SELECT type, COUNT(*) as count, AVG(rating) as avg_rating,
                           SUM(usage_count) as total_usage
                    FROM vr_experiences 
                    WHERE is_active = 1
                    GROUP BY type
                ''')
                vr_stats = cursor.fetchall()
                
                # IoT senzorji - zadnji odčitki
                cursor.execute('''
                    SELECT s.sensor_id, s.name, s.type, s.location, s.last_reading,
                           s.optimal_min, s.optimal_max, s.alert_threshold
                    FROM iot_sensors s
                    WHERE s.is_active = 1
                    ORDER BY s.last_reading_time DESC
                ''')
                sensor_status = cursor.fetchall()
                
                # Energetska učinkovitost
                cursor.execute('''
                    SELECT energy_type, location, AVG(efficiency_score) as avg_efficiency,
                           SUM(consumption) as total_consumption, SUM(cost) as total_cost
                    FROM energy_consumption
                    WHERE created_at >= date('now', '-7 days')
                    GROUP BY energy_type, location
                ''')
                energy_stats = cursor.fetchall()
                
                # AI simulacije
                cursor.execute('''
                    SELECT COUNT(*) as total_simulations, AVG(accuracy_score) as avg_accuracy
                    FROM ai_simulations
                    WHERE created_at >= date('now', '-30 days')
                ''')
                ai_stats = cursor.fetchone()
                
                return {
                    "vr_ar_experiences": [
                        {
                            "type": row[0],
                            "count": row[1],
                            "avg_rating": row[2] or 0,
                            "total_usage": row[3] or 0
                        }
                        for row in vr_stats
                    ],
                    "iot_sensors": [
                        {
                            "sensor_id": row[0],
                            "name": row[1],
                            "type": row[2],
                            "location": row[3],
                            "current_value": row[4],
                            "optimal_range": [row[5], row[6]],
                            "alert_threshold": row[7],
                            "status": "normal" if row[4] and row[5] <= row[4] <= row[6] else "alert"
                        }
                        for row in sensor_status
                    ],
                    "energy_efficiency": [
                        {
                            "energy_type": row[0],
                            "location": row[1],
                            "avg_efficiency": row[2],
                            "total_consumption": row[3],
                            "total_cost": row[4]
                        }
                        for row in energy_stats
                    ],
                    "ai_insights": {
                        "total_simulations": ai_stats[0] if ai_stats else 0,
                        "avg_accuracy": ai_stats[1] if ai_stats else 0
                    },
                    "optimization_suggestions": self.get_energy_optimization_suggestions(),
                    "last_updated": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju premium podatkov: {e}")
            return {"error": str(e)}

# Primer uporabe
if __name__ == "__main__":
    # Inicializacija
    premium = PremiumFeatures()
    
    print("🌟 Premium Features - Test")
    print("=" * 50)
    
    # Test VR izkušnje
    print("\n🥽 Ustvarjanje VR izkušnje:")
    vr_data = {
        "name": "Virtualni ogled vinskega kleta",
        "type": "virtual_tour",
        "description": "360° ogled vinskega kleta z degustacijo",
        "content_url": "/vr/wine_cellar.html",
        "duration_minutes": 15,
        "target_audience": "Ljubitelji vina"
    }
    
    vr_id = premium.create_vr_experience(vr_data)
    if vr_id:
        print(f"✅ VR izkušnja ustvarjena: {vr_id}")
    
    # Test IoT senzorja
    print("\n🌡️ Dodajanje IoT senzorja:")
    sensor_data = {
        "name": "Temperatura - Vinski klet",
        "type": "temperature",
        "location": "Vinski klet",
        "unit": "°C",
        "min_value": 10.0,
        "max_value": 20.0,
        "optimal_range": (12.0, 16.0),
        "alert_threshold": 18.0
    }
    
    sensor_id = premium.add_iot_sensor(sensor_data)
    if sensor_id:
        print(f"✅ IoT senzor dodan: {sensor_id}")
        
        # Test odčitka
        premium.record_sensor_reading(sensor_id, 14.5, "Normalen odčitek")
        premium.record_sensor_reading(sensor_id, 19.0, "Visoka temperatura!")
    
    # Test energetske porabe
    print("\n⚡ Beleženje energetske porabe:")
    energy_data = {
        "energy_type": "electricity",
        "location": "Restavracija",
        "consumption": 450.0,
        "cost": 67.50,
        "baseline": 500.0
    }
    
    energy_id = premium.record_energy_consumption(energy_data)
    if energy_id:
        print(f"✅ Energetska poraba zabeležena: {energy_id}")
    
    # Test optimizacijskih predlogov
    print("\n💡 Predlogi za optimizacijo:")
    suggestions = premium.get_energy_optimization_suggestions()
    for suggestion in suggestions[:3]:  # Prikaži prve 3
        print(f"✅ {suggestion['priority'].upper()}: {suggestion['suggestion']}")
    
    # Test AI simulacije
    print("\n🤖 AI simulacija poslovanja:")
    simulation_data = {
        "name": "Letna projekcija prihodkov",
        "base_revenue": 500000,
        "base_costs": 350000
    }
    
    simulation = premium.run_ai_simulation(simulation_data)
    if "error" not in simulation:
        print(f"✅ Simulacija: {simulation['simulation_id']}")
        print(f"✅ Pričakovani dobiček: {simulation['risk_analysis']['expected_value']:,.0f} EUR")
    
    # Test premium dashboard podatkov
    print("\n📊 Premium dashboard podatki:")
    dashboard_data = premium.get_premium_dashboard_data()
    if "error" not in dashboard_data:
        print(f"✅ VR/AR izkušnje: {len(dashboard_data['vr_ar_experiences'])}")
        print(f"✅ IoT senzorji: {len(dashboard_data['iot_sensors'])}")
        print(f"✅ Energetski podatki: {len(dashboard_data['energy_efficiency'])}")
    
    # Začni spremljanje senzorjev
    print("\n🔄 Začenjam spremljanje senzorjev...")
    premium.start_sensor_monitoring()
    
    # Počakaj malo in ustavi
    import time
    time.sleep(5)
    premium.stop_sensor_monitoring()
    
    logger.info("🌟 Premium Features sistem uspešno testiran!")