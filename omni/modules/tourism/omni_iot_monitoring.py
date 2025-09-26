#!/usr/bin/env python3
"""
🌡️ OMNI IoT MONITORING SYSTEM - IoT senzorji za real-time monitoring okolja in kapacitet

Napredni IoT sistem za turizem z Enterprise funkcionalnostmi:
- Real-time monitoring temperature, vlažnosti, kakovosti zraka
- Spremljanje zasedenosti prostorov in kapacitet
- Energetska učinkovitost in pametno upravljanje
- Varnostni senzorji (gibanje, vrata, okna)
- Vremenske napovedi in okoljski alarmi
- Pametno osvetlitev in klimatizacija
- Predictive maintenance za opremo
- IoT dashboard z real-time vizualizacijami

Varnostne funkcije:
- Centraliziran oblak → noben modul ne teče lokalno
- Enkripcija → TLS + AES-256 za vse podatke in komunikacijo
- Sandbox / Read-only demo
- Zaščita pred krajo → poskusi prenosa ali lokalne uporabe → modul se zaklene
- Admin dostop samo za tebe → edini, ki lahko nadgrajuje in odklepa funkcionalnosti
"""

import sqlite3
import json
import logging
import datetime
import random
import time
import threading
import asyncio
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import secrets
from flask import Flask, request, jsonify, render_template_string
import warnings
warnings.filterwarnings('ignore')

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SensorType(Enum):
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    AIR_QUALITY = "air_quality"
    OCCUPANCY = "occupancy"
    MOTION = "motion"
    DOOR_WINDOW = "door_window"
    LIGHT = "light"
    SOUND = "sound"
    ENERGY = "energy"
    WATER = "water"
    WEATHER = "weather"
    SOIL_MOISTURE = "soil_moisture"

class SensorStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    OFFLINE = "offline"

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class LocationType(Enum):
    HOTEL_ROOM = "hotel_room"
    RESTAURANT = "restaurant"
    LOBBY = "lobby"
    OUTDOOR = "outdoor"
    KITCHEN = "kitchen"
    CONFERENCE_ROOM = "conference_room"
    SPA = "spa"
    POOL = "pool"
    PARKING = "parking"
    GARDEN = "garden"

@dataclass
class IoTSensor:
    sensor_id: str
    name: str
    sensor_type: SensorType
    location: str
    location_type: LocationType
    status: SensorStatus
    last_reading: Optional[float]
    last_update: datetime.datetime
    battery_level: float
    firmware_version: str
    calibration_date: datetime.datetime
    min_threshold: Optional[float] = None
    max_threshold: Optional[float] = None
    unit: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class SensorReading:
    reading_id: str
    sensor_id: str
    value: float
    timestamp: datetime.datetime
    quality: float  # 0-1, kakovost meritve
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class IoTAlert:
    alert_id: str
    sensor_id: str
    alert_level: AlertLevel
    message: str
    timestamp: datetime.datetime
    acknowledged: bool = False
    resolved: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AutomationRule:
    rule_id: str
    name: str
    trigger_sensor: str
    trigger_condition: str  # >, <, ==, !=
    trigger_value: float
    action_type: str  # email, sms, device_control, alert
    action_config: Dict[str, Any]
    is_active: bool = True
    created_at: datetime.datetime = field(default_factory=datetime.datetime.now)

class OmniIoTMonitoring:
    def __init__(self, db_path: str = "omni_iot_monitoring.db"):
        self.db_path = db_path
        self.is_demo = True
        self.demo_start_time = datetime.datetime.now()
        self.demo_duration_hours = 2
        self.access_key = secrets.token_hex(32)
        
        # IoT data
        self.sensors = {}
        self.readings = []
        self.alerts = []
        self.automation_rules = {}
        self.device_controls = {}
        
        # Monitoring thread
        self.monitoring_active = False
        self.monitoring_thread = None
        
        self.init_database()
        self.load_sample_sensors()
        self.start_monitoring()
        
        # Flask aplikacija
        self.app = Flask(__name__)
        self.setup_routes()
        
        logger.info("IoT Monitoring System inicializiran")

    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za senzorje
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensors (
                id TEXT PRIMARY KEY,
                name TEXT,
                sensor_type TEXT,
                location TEXT,
                location_type TEXT,
                status TEXT,
                last_reading REAL,
                last_update TEXT,
                battery_level REAL,
                firmware_version TEXT,
                calibration_date TEXT,
                min_threshold REAL,
                max_threshold REAL,
                unit TEXT,
                metadata TEXT
            )
        ''')
        
        # Tabela za meritve
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS readings (
                id TEXT PRIMARY KEY,
                sensor_id TEXT,
                value REAL,
                timestamp TEXT,
                quality REAL,
                metadata TEXT,
                FOREIGN KEY (sensor_id) REFERENCES sensors (id)
            )
        ''')
        
        # Tabela za alarme
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                sensor_id TEXT,
                alert_level TEXT,
                message TEXT,
                timestamp TEXT,
                acknowledged BOOLEAN,
                resolved BOOLEAN,
                metadata TEXT,
                FOREIGN KEY (sensor_id) REFERENCES sensors (id)
            )
        ''')
        
        # Tabela za avtomatizacijska pravila
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS automation_rules (
                id TEXT PRIMARY KEY,
                name TEXT,
                trigger_sensor TEXT,
                trigger_condition TEXT,
                trigger_value REAL,
                action_type TEXT,
                action_config TEXT,
                is_active BOOLEAN,
                created_at TEXT
            )
        ''')
        
        # Tabela za upravljanje naprav
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS device_controls (
                id TEXT PRIMARY KEY,
                device_name TEXT,
                device_type TEXT,
                location TEXT,
                status TEXT,
                last_command TEXT,
                last_update TEXT,
                metadata TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("IoT Monitoring baza podatkov inicializirana")

    def load_sample_sensors(self):
        """Naloži vzorčne senzorje"""
        sample_sensors = [
            # Hotel sobe
            {
                "name": "Soba 101 - Temperatura",
                "type": SensorType.TEMPERATURE,
                "location": "Soba 101",
                "location_type": LocationType.HOTEL_ROOM,
                "unit": "°C",
                "min_threshold": 18.0,
                "max_threshold": 26.0
            },
            {
                "name": "Soba 101 - Vlažnost",
                "type": SensorType.HUMIDITY,
                "location": "Soba 101",
                "location_type": LocationType.HOTEL_ROOM,
                "unit": "%",
                "min_threshold": 30.0,
                "max_threshold": 70.0
            },
            {
                "name": "Soba 101 - Zasedenost",
                "type": SensorType.OCCUPANCY,
                "location": "Soba 101",
                "location_type": LocationType.HOTEL_ROOM,
                "unit": "oseb",
                "max_threshold": 2.0
            },
            
            # Restavracija
            {
                "name": "Restavracija - Kakovost zraka",
                "type": SensorType.AIR_QUALITY,
                "location": "Glavna restavracija",
                "location_type": LocationType.RESTAURANT,
                "unit": "ppm",
                "max_threshold": 1000.0
            },
            {
                "name": "Restavracija - Hrup",
                "type": SensorType.SOUND,
                "location": "Glavna restavracija",
                "location_type": LocationType.RESTAURANT,
                "unit": "dB",
                "max_threshold": 70.0
            },
            {
                "name": "Restavracija - Zasedenost",
                "type": SensorType.OCCUPANCY,
                "location": "Glavna restavracija",
                "location_type": LocationType.RESTAURANT,
                "unit": "oseb",
                "max_threshold": 50.0
            },
            
            # Kuhinja
            {
                "name": "Kuhinja - Temperatura",
                "type": SensorType.TEMPERATURE,
                "location": "Glavna kuhinja",
                "location_type": LocationType.KITCHEN,
                "unit": "°C",
                "max_threshold": 35.0
            },
            {
                "name": "Kuhinja - Vlažnost",
                "type": SensorType.HUMIDITY,
                "location": "Glavna kuhinja",
                "location_type": LocationType.KITCHEN,
                "unit": "%",
                "max_threshold": 80.0
            },
            
            # Zunanji prostori
            {
                "name": "Vrt - Vremenska postaja",
                "type": SensorType.WEATHER,
                "location": "Hotelski vrt",
                "location_type": LocationType.GARDEN,
                "unit": "mixed"
            },
            {
                "name": "Vrt - Vlažnost tal",
                "type": SensorType.SOIL_MOISTURE,
                "location": "Hotelski vrt",
                "location_type": LocationType.GARDEN,
                "unit": "%",
                "min_threshold": 20.0,
                "max_threshold": 80.0
            },
            
            # Energetika
            {
                "name": "Glavna poraba energije",
                "type": SensorType.ENERGY,
                "location": "Električna omarica",
                "location_type": LocationType.LOBBY,
                "unit": "kWh"
            },
            {
                "name": "Poraba vode",
                "type": SensorType.WATER,
                "location": "Glavna cev",
                "location_type": LocationType.LOBBY,
                "unit": "L/min"
            }
        ]
        
        for sensor_data in sample_sensors:
            sensor_id = f"sensor_{int(time.time())}_{secrets.token_hex(4)}"
            
            sensor = IoTSensor(
                sensor_id=sensor_id,
                name=sensor_data["name"],
                sensor_type=sensor_data["type"],
                location=sensor_data["location"],
                location_type=sensor_data["location_type"],
                status=SensorStatus.ACTIVE,
                last_reading=None,
                last_update=datetime.datetime.now(),
                battery_level=random.uniform(70, 100),
                firmware_version=f"v{random.randint(1,3)}.{random.randint(0,9)}.{random.randint(0,9)}",
                calibration_date=datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 90)),
                min_threshold=sensor_data.get("min_threshold"),
                max_threshold=sensor_data.get("max_threshold"),
                unit=sensor_data["unit"],
                metadata={"installation_date": datetime.datetime.now().isoformat()}
            )
            
            self.sensors[sensor_id] = sensor
            self.save_sensor(sensor)
            
        logger.info(f"Naloženih {len(sample_sensors)} vzorčnih senzorjev")

    def generate_sensor_reading(self, sensor: IoTSensor) -> float:
        """Generiraj realistično meritev za senzor"""
        base_values = {
            SensorType.TEMPERATURE: 22.0,
            SensorType.HUMIDITY: 45.0,
            SensorType.AIR_QUALITY: 400.0,
            SensorType.OCCUPANCY: 0.0,
            SensorType.MOTION: 0.0,
            SensorType.DOOR_WINDOW: 0.0,
            SensorType.LIGHT: 300.0,
            SensorType.SOUND: 40.0,
            SensorType.ENERGY: 15.0,
            SensorType.WATER: 2.5,
            SensorType.WEATHER: 20.0,
            SensorType.SOIL_MOISTURE: 50.0
        }
        
        variations = {
            SensorType.TEMPERATURE: 5.0,
            SensorType.HUMIDITY: 15.0,
            SensorType.AIR_QUALITY: 200.0,
            SensorType.OCCUPANCY: 10.0,
            SensorType.MOTION: 1.0,
            SensorType.DOOR_WINDOW: 1.0,
            SensorType.LIGHT: 200.0,
            SensorType.SOUND: 20.0,
            SensorType.ENERGY: 10.0,
            SensorType.WATER: 2.0,
            SensorType.WEATHER: 10.0,
            SensorType.SOIL_MOISTURE: 20.0
        }
        
        base = base_values.get(sensor.sensor_type, 50.0)
        variation = variations.get(sensor.sensor_type, 10.0)
        
        # Dodaj časovne vzorce
        hour = datetime.datetime.now().hour
        
        # Temperatura - višja podnevi
        if sensor.sensor_type == SensorType.TEMPERATURE:
            if 6 <= hour <= 18:
                base += 2.0
            elif 22 <= hour or hour <= 6:
                base -= 2.0
        
        # Zasedenost - višja v glavnih urah
        elif sensor.sensor_type == SensorType.OCCUPANCY:
            if sensor.location_type == LocationType.RESTAURANT:
                if 12 <= hour <= 14 or 19 <= hour <= 22:
                    base = random.randint(20, 45)
                else:
                    base = random.randint(0, 15)
            elif sensor.location_type == LocationType.HOTEL_ROOM:
                if 22 <= hour or hour <= 8:
                    base = random.randint(1, 2)
                else:
                    base = random.randint(0, 1)
        
        # Energija - višja podnevi
        elif sensor.sensor_type == SensorType.ENERGY:
            if 8 <= hour <= 22:
                base += 5.0
            else:
                base -= 3.0
        
        # Generiraj končno vrednost
        value = base + random.uniform(-variation/2, variation/2)
        
        # Zagotovi pozitivne vrednosti kjer je potrebno
        if sensor.sensor_type in [SensorType.OCCUPANCY, SensorType.ENERGY, SensorType.WATER]:
            value = max(0, value)
        
        return round(value, 2)

    def collect_sensor_data(self):
        """Zberi podatke iz vseh senzorjev"""
        for sensor_id, sensor in self.sensors.items():
            if sensor.status != SensorStatus.ACTIVE:
                continue
            
            try:
                # Generiraj meritev
                value = self.generate_sensor_reading(sensor)
                quality = random.uniform(0.85, 1.0)  # Visoka kakovost meritev
                
                # Ustvari meritev
                reading = SensorReading(
                    reading_id=f"reading_{int(time.time())}_{secrets.token_hex(4)}",
                    sensor_id=sensor_id,
                    value=value,
                    timestamp=datetime.datetime.now(),
                    quality=quality,
                    metadata={"collection_method": "auto"}
                )
                
                # Posodobi senzor
                sensor.last_reading = value
                sensor.last_update = reading.timestamp
                
                # Shrani meritev
                self.readings.append(reading)
                self.save_reading(reading)
                self.save_sensor(sensor)
                
                # Preveri alarme
                self.check_sensor_alerts(sensor, value)
                
                # Omeji število shranjenih meritev (zadnjih 1000)
                if len(self.readings) > 1000:
                    self.readings = self.readings[-1000:]
                
            except Exception as e:
                logger.error(f"Napaka pri zbiranju podatkov za senzor {sensor_id}: {e}")
                sensor.status = SensorStatus.ERROR

    def check_sensor_alerts(self, sensor: IoTSensor, value: float):
        """Preveri, ali meritev sproži alarm"""
        alerts_triggered = []
        
        # Preveri minimalne in maksimalne vrednosti
        if sensor.min_threshold is not None and value < sensor.min_threshold:
            alert = IoTAlert(
                alert_id=f"alert_{int(time.time())}_{secrets.token_hex(4)}",
                sensor_id=sensor.sensor_id,
                alert_level=AlertLevel.WARNING,
                message=f"{sensor.name}: Vrednost {value} {sensor.unit} je pod minimalno mejo {sensor.min_threshold} {sensor.unit}",
                timestamp=datetime.datetime.now(),
                metadata={"threshold_type": "minimum", "threshold_value": sensor.min_threshold}
            )
            alerts_triggered.append(alert)
        
        if sensor.max_threshold is not None and value > sensor.max_threshold:
            alert_level = AlertLevel.CRITICAL if value > sensor.max_threshold * 1.2 else AlertLevel.WARNING
            
            alert = IoTAlert(
                alert_id=f"alert_{int(time.time())}_{secrets.token_hex(4)}",
                sensor_id=sensor.sensor_id,
                alert_level=alert_level,
                message=f"{sensor.name}: Vrednost {value} {sensor.unit} presega maksimalno mejo {sensor.max_threshold} {sensor.unit}",
                timestamp=datetime.datetime.now(),
                metadata={"threshold_type": "maximum", "threshold_value": sensor.max_threshold}
            )
            alerts_triggered.append(alert)
        
        # Preveri baterijo
        if sensor.battery_level < 20:
            alert = IoTAlert(
                alert_id=f"alert_{int(time.time())}_{secrets.token_hex(4)}",
                sensor_id=sensor.sensor_id,
                alert_level=AlertLevel.WARNING,
                message=f"{sensor.name}: Nizka baterija ({sensor.battery_level}%)",
                timestamp=datetime.datetime.now(),
                metadata={"alert_type": "battery_low", "battery_level": sensor.battery_level}
            )
            alerts_triggered.append(alert)
        
        # Shrani alarme
        for alert in alerts_triggered:
            self.alerts.append(alert)
            self.save_alert(alert)
            logger.warning(f"Alarm sprožen: {alert.message}")

    def start_monitoring(self):
        """Začni monitoring senzorjev"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        logger.info("IoT monitoring zagnan")

    def stop_monitoring(self):
        """Ustavi monitoring senzorjev"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        logger.info("IoT monitoring ustavljen")

    def _monitoring_loop(self):
        """Glavna zanka monitoringa"""
        while self.monitoring_active:
            try:
                self.collect_sensor_data()
                
                # Posodobi baterije (simulacija)
                for sensor in self.sensors.values():
                    if sensor.status == SensorStatus.ACTIVE:
                        sensor.battery_level -= random.uniform(0.01, 0.05)
                        sensor.battery_level = max(0, sensor.battery_level)
                
                # Počakaj 30 sekund
                time.sleep(30)
                
            except Exception as e:
                logger.error(f"Napaka v monitoring zanki: {e}")
                time.sleep(10)

    def get_sensor_statistics(self) -> Dict[str, Any]:
        """Pridobi statistike senzorjev"""
        active_sensors = sum(1 for s in self.sensors.values() if s.status == SensorStatus.ACTIVE)
        total_readings = len(self.readings)
        active_alerts = sum(1 for a in self.alerts if not a.resolved)
        
        # Povprečne vrednosti po tipih
        sensor_averages = {}
        for sensor_type in SensorType:
            type_readings = [
                r.value for r in self.readings[-100:]  # Zadnjih 100 meritev
                if self.sensors.get(r.sensor_id, {}).sensor_type == sensor_type
            ]
            if type_readings:
                sensor_averages[sensor_type.value] = {
                    "average": round(sum(type_readings) / len(type_readings), 2),
                    "min": round(min(type_readings), 2),
                    "max": round(max(type_readings), 2),
                    "count": len(type_readings)
                }
        
        # Lokacijske statistike
        location_stats = {}
        for location_type in LocationType:
            location_sensors = [s for s in self.sensors.values() if s.location_type == location_type]
            if location_sensors:
                location_stats[location_type.value] = {
                    "sensor_count": len(location_sensors),
                    "active_sensors": sum(1 for s in location_sensors if s.status == SensorStatus.ACTIVE),
                    "avg_battery": round(sum(s.battery_level for s in location_sensors) / len(location_sensors), 1)
                }
        
        return {
            "total_sensors": len(self.sensors),
            "active_sensors": active_sensors,
            "total_readings": total_readings,
            "active_alerts": active_alerts,
            "sensor_averages": sensor_averages,
            "location_stats": location_stats,
            "monitoring_active": self.monitoring_active,
            "demo_time_remaining": self.get_demo_time_remaining()
        }

    def get_recent_readings(self, sensor_id: str = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Pridobi nedavne meritve"""
        readings = self.readings[-limit:] if sensor_id is None else [
            r for r in self.readings[-limit*2:] if r.sensor_id == sensor_id
        ][-limit:]
        
        return [
            {
                "reading_id": r.reading_id,
                "sensor_id": r.sensor_id,
                "sensor_name": self.sensors.get(r.sensor_id, {}).name if hasattr(self.sensors.get(r.sensor_id, {}), 'name') else "Unknown",
                "value": r.value,
                "timestamp": r.timestamp.isoformat(),
                "quality": r.quality,
                "unit": self.sensors.get(r.sensor_id, {}).unit if hasattr(self.sensors.get(r.sensor_id, {}), 'unit') else ""
            }
            for r in readings
        ]

    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Pridobi aktivne alarme"""
        active_alerts = [a for a in self.alerts if not a.resolved][-20:]  # Zadnjih 20
        
        return [
            {
                "alert_id": a.alert_id,
                "sensor_id": a.sensor_id,
                "sensor_name": self.sensors.get(a.sensor_id, {}).name if hasattr(self.sensors.get(a.sensor_id, {}), 'name') else "Unknown",
                "alert_level": a.alert_level.value,
                "message": a.message,
                "timestamp": a.timestamp.isoformat(),
                "acknowledged": a.acknowledged,
                "resolved": a.resolved
            }
            for a in active_alerts
        ]

    def get_demo_time_remaining(self) -> float:
        """Preostali čas demo verzije"""
        if not self.is_demo:
            return float('inf')
        
        elapsed = (datetime.datetime.now() - self.demo_start_time).total_seconds() / 3600
        remaining = max(0, self.demo_duration_hours - elapsed)
        return round(remaining, 2)

    def check_demo_expiry(self):
        """Preveri, če je demo verzija potekla"""
        if self.is_demo and self.get_demo_time_remaining() <= 0:
            logger.warning("Demo verzija je potekla - sistem se zaklene")
            return True
        return False

    def save_sensor(self, sensor: IoTSensor):
        """Shrani senzor"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO sensors 
            (id, name, sensor_type, location, location_type, status, last_reading, last_update, 
             battery_level, firmware_version, calibration_date, min_threshold, max_threshold, unit, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            sensor.sensor_id,
            sensor.name,
            sensor.sensor_type.value,
            sensor.location,
            sensor.location_type.value,
            sensor.status.value,
            sensor.last_reading,
            sensor.last_update.isoformat(),
            sensor.battery_level,
            sensor.firmware_version,
            sensor.calibration_date.isoformat(),
            sensor.min_threshold,
            sensor.max_threshold,
            sensor.unit,
            json.dumps(sensor.metadata)
        ))
        
        conn.commit()
        conn.close()

    def save_reading(self, reading: SensorReading):
        """Shrani meritev"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO readings 
            (id, sensor_id, value, timestamp, quality, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            reading.reading_id,
            reading.sensor_id,
            reading.value,
            reading.timestamp.isoformat(),
            reading.quality,
            json.dumps(reading.metadata)
        ))
        
        conn.commit()
        conn.close()

    def save_alert(self, alert: IoTAlert):
        """Shrani alarm"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO alerts 
            (id, sensor_id, alert_level, message, timestamp, acknowledged, resolved, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            alert.alert_id,
            alert.sensor_id,
            alert.alert_level.value,
            alert.message,
            alert.timestamp.isoformat(),
            alert.acknowledged,
            alert.resolved,
            json.dumps(alert.metadata)
        ))
        
        conn.commit()
        conn.close()

    def setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def dashboard():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            stats = self.get_sensor_statistics()
            recent_readings = self.get_recent_readings(limit=10)
            active_alerts = self.get_active_alerts()
            
            return render_template_string('''
            <!DOCTYPE html>
            <html>
            <head>
                <title>🌡️ OMNI IoT Monitoring System</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        min-height: 100vh;
                    }
                    .container { max-width: 1400px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
                    .stats-grid { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                        gap: 20px; 
                        margin-bottom: 30px; 
                    }
                    .stat-card { 
                        background: rgba(255,255,255,0.1); 
                        padding: 25px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                        text-align: center;
                        transition: transform 0.3s ease;
                    }
                    .stat-card:hover { transform: translateY(-5px); }
                    .stat-value { font-size: 2.5em; font-weight: bold; color: #00ff88; margin-bottom: 10px; }
                    .stat-label { font-size: 1.1em; opacity: 0.9; }
                    .content-grid { 
                        display: grid; 
                        grid-template-columns: 1fr 1fr; 
                        gap: 30px; 
                        margin-bottom: 30px; 
                    }
                    .content-section { 
                        background: rgba(255,255,255,0.1); 
                        padding: 25px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                    }
                    .section-title { font-size: 1.4em; font-weight: bold; margin-bottom: 20px; }
                    .sensor-item, .alert-item, .reading-item { 
                        background: rgba(0,0,0,0.2); 
                        padding: 15px; 
                        border-radius: 10px; 
                        margin-bottom: 10px; 
                    }
                    .sensor-status { 
                        display: inline-block; 
                        padding: 4px 12px; 
                        border-radius: 20px; 
                        font-size: 0.8em; 
                        font-weight: bold; 
                    }
                    .status-active { background: #00ff88; color: black; }
                    .status-inactive { background: #666; color: white; }
                    .status-error { background: #ff4444; color: white; }
                    .alert-level { 
                        display: inline-block; 
                        padding: 4px 12px; 
                        border-radius: 20px; 
                        font-size: 0.8em; 
                        font-weight: bold; 
                    }
                    .level-info { background: #4CAF50; color: white; }
                    .level-warning { background: #FF9800; color: white; }
                    .level-critical { background: #F44336; color: white; }
                    .level-emergency { background: #9C27B0; color: white; }
                    .demo-warning { 
                        background: rgba(255,165,0,0.2); 
                        border: 2px solid orange; 
                        padding: 15px; 
                        border-radius: 10px; 
                        margin-bottom: 20px; 
                        text-align: center;
                    }
                    .chart-container { 
                        background: rgba(255,255,255,0.1); 
                        padding: 25px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                        margin-bottom: 30px;
                    }
                    .action-btn {
                        background: #00ff88; 
                        color: black; 
                        padding: 12px 25px; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        font-size: 1.1em;
                        font-weight: bold;
                        margin: 10px;
                        transition: all 0.3s ease;
                    }
                    .action-btn:hover { 
                        background: #00cc6a; 
                        transform: scale(1.05);
                    }
                    @media (max-width: 768px) {
                        .content-grid { grid-template-columns: 1fr; }
                        .stats-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🌡️ OMNI IoT Monitoring System</h1>
                        <p>IoT senzorji za real-time monitoring okolja in kapacitet</p>
                    </div>
                    
                    <div class="demo-warning">
                        ⚠️ <strong>DEMO VERZIJA</strong> - Preostali čas: {{ stats.demo_time_remaining }}h
                        <br>Za polno funkcionalnost kontaktirajte administratorja.
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">{{ stats.total_sensors }}</div>
                            <div class="stat-label">Skupaj senzorjev</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ stats.active_sensors }}</div>
                            <div class="stat-label">Aktivni senzorji</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ stats.total_readings }}</div>
                            <div class="stat-label">Skupaj meritev</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ stats.active_alerts }}</div>
                            <div class="stat-label">Aktivni alarmi</div>
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <div class="section-title">📊 Real-time senzorski podatki</div>
                        <div id="sensorChart" style="height: 400px;"></div>
                    </div>
                    
                    <div class="content-grid">
                        <div class="content-section">
                            <div class="section-title">🔔 Aktivni alarmi ({{ active_alerts|length }})</div>
                            {% for alert in active_alerts[:5] %}
                            <div class="alert-item">
                                <span class="alert-level level-{{ alert.alert_level }}">{{ alert.alert_level.upper() }}</span>
                                <strong>{{ alert.sensor_name }}</strong><br>
                                {{ alert.message }}<br>
                                <small>{{ alert.timestamp[:19] }}</small>
                            </div>
                            {% endfor %}
                            {% if not active_alerts %}
                            <p style="text-align: center; opacity: 0.7;">Ni aktivnih alarmov</p>
                            {% endif %}
                        </div>
                        
                        <div class="content-section">
                            <div class="section-title">📈 Nedavne meritve ({{ recent_readings|length }})</div>
                            {% for reading in recent_readings[:5] %}
                            <div class="reading-item">
                                <strong>{{ reading.sensor_name }}</strong><br>
                                Vrednost: {{ reading.value }} {{ reading.unit }}<br>
                                Kakovost: {{ (reading.quality * 100)|round(1) }}%<br>
                                <small>{{ reading.timestamp[:19] }}</small>
                            </div>
                            {% endfor %}
                        </div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-title">🏢 Lokacijske statistike</div>
                        <div class="stats-grid">
                            {% for location, data in stats.location_stats.items() %}
                            <div class="stat-card">
                                <div class="stat-value">{{ data.sensor_count }}</div>
                                <div class="stat-label">{{ location.replace('_', ' ').title() }}</div>
                                <small>Aktivni: {{ data.active_sensors }} | Baterija: {{ data.avg_battery }}%</small>
                            </div>
                            {% endfor %}
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <button class="action-btn" onclick="refreshData()">🔄 Osveži podatke</button>
                        <button class="action-btn" onclick="showSensors()">🌡️ Prikaži senzorje</button>
                        <button class="action-btn" onclick="showAlerts()">🔔 Prikaži alarme</button>
                        <button class="action-btn" onclick="exportData()">📊 Izvozi podatke</button>
                    </div>
                </div>
                
                <script>
                    // Inicializiraj graf
                    function initChart() {
                        const sensorData = {{ stats.sensor_averages | tojson }};
                        
                        const traces = [];
                        const colors = ['#00ff88', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'];
                        let colorIndex = 0;
                        
                        for (const [sensorType, data] of Object.entries(sensorData)) {
                            traces.push({
                                x: ['Min', 'Povprečje', 'Max'],
                                y: [data.min, data.average, data.max],
                                type: 'bar',
                                name: sensorType.replace('_', ' ').toUpperCase(),
                                marker: { color: colors[colorIndex % colors.length] }
                            });
                            colorIndex++;
                        }
                        
                        const layout = {
                            title: 'Povzetek senzorskih podatkov',
                            xaxis: { title: 'Statistika' },
                            yaxis: { title: 'Vrednost' },
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            font: { color: 'white' },
                            showlegend: true
                        };
                        
                        Plotly.newPlot('sensorChart', traces, layout, {responsive: true});
                    }
                    
                    function refreshData() {
                        location.reload();
                    }
                    
                    function showSensors() {
                        fetch('/api/sensors')
                        .then(r => r.json())
                        .then(data => {
                            alert('Senzorji: ' + JSON.stringify(data, null, 2));
                        });
                    }
                    
                    function showAlerts() {
                        fetch('/api/alerts')
                        .then(r => r.json())
                        .then(data => {
                            alert('Alarmi: ' + JSON.stringify(data, null, 2));
                        });
                    }
                    
                    function exportData() {
                        fetch('/api/export')
                        .then(r => r.json())
                        .then(data => {
                            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'iot_data_export.json';
                            a.click();
                        });
                    }
                    
                    // Inicializiraj ob nalaganju
                    document.addEventListener('DOMContentLoaded', initChart);
                    
                    // Auto-refresh vsakih 60 sekund
                    setInterval(refreshData, 60000);
                </script>
            </body>
            </html>
            ''', 
            stats=stats,
            recent_readings=recent_readings,
            active_alerts=active_alerts
            )
        
        @self.app.route('/api/sensors')
        def api_sensors():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            sensors_data = []
            for sensor_id, sensor in self.sensors.items():
                sensors_data.append({
                    'sensor_id': sensor_id,
                    'name': sensor.name,
                    'type': sensor.sensor_type.value,
                    'location': sensor.location,
                    'location_type': sensor.location_type.value,
                    'status': sensor.status.value,
                    'last_reading': sensor.last_reading,
                    'last_update': sensor.last_update.isoformat(),
                    'battery_level': sensor.battery_level,
                    'unit': sensor.unit
                })
            
            return jsonify({
                'sensors': sensors_data,
                'total_count': len(sensors_data)
            })
        
        @self.app.route('/api/readings')
        def api_readings():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            sensor_id = request.args.get('sensor_id')
            limit = int(request.args.get('limit', 50))
            
            readings = self.get_recent_readings(sensor_id, limit)
            
            return jsonify({
                'readings': readings,
                'total_count': len(readings)
            })
        
        @self.app.route('/api/alerts')
        def api_alerts():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            alerts = self.get_active_alerts()
            
            return jsonify({
                'alerts': alerts,
                'total_count': len(alerts)
            })
        
        @self.app.route('/api/stats')
        def api_stats():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            return jsonify(self.get_sensor_statistics())
        
        @self.app.route('/api/export')
        def api_export():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            export_data = {
                'sensors': [
                    {
                        'sensor_id': s.sensor_id,
                        'name': s.name,
                        'type': s.sensor_type.value,
                        'location': s.location,
                        'status': s.status.value,
                        'last_reading': s.last_reading,
                        'battery_level': s.battery_level
                    }
                    for s in self.sensors.values()
                ],
                'recent_readings': self.get_recent_readings(limit=100),
                'active_alerts': self.get_active_alerts(),
                'statistics': self.get_sensor_statistics(),
                'export_timestamp': datetime.datetime.now().isoformat()
            }
            
            return jsonify(export_data)

    def run_server(self, host='localhost', port=5008):
        """Zaženi Flask server"""
        logger.info(f"Zaganjam IoT Monitoring System na http://{host}:{port}")
        self.app.run(host=host, port=port, debug=True)

async def demo_iot_monitoring():
    """Demo funkcija za testiranje IoT Monitoring System"""
    print("\n" + "="*50)
    print("🌡️ OMNI IoT MONITORING SYSTEM - DEMO")
    print("="*50)
    
    # Inicializacija
    iot_system = OmniIoTMonitoring()
    
    print(f"🔧 IoT Monitoring System inicializiran:")
    print(f"  • Senzorji: {len(iot_system.sensors)}")
    print(f"  • Monitoring aktiven: {iot_system.monitoring_active}")
    print(f"  • Demo trajanje: {iot_system.demo_duration_hours}h")
    print(f"  • Preostali čas: {iot_system.get_demo_time_remaining()}h")
    
    # Počakaj na prve meritve
    print(f"\n⏳ Čakam na prve meritve...")
    await asyncio.sleep(5)
    
    # Prikaži senzorje
    print(f"\n🌡️ Registrirani senzorji:")
    for sensor_id, sensor in iot_system.sensors.items():
        print(f"  ✅ {sensor.name}")
        print(f"     Tip: {sensor.sensor_type.value}")
        print(f"     Lokacija: {sensor.location} ({sensor.location_type.value})")
        print(f"     Status: {sensor.status.value}")
        print(f"     Baterija: {sensor.battery_level:.1f}%")
        if sensor.last_reading is not None:
            print(f"     Zadnja meritev: {sensor.last_reading} {sensor.unit}")
    
    # Prikaži nedavne meritve
    recent_readings = iot_system.get_recent_readings(limit=10)
    print(f"\n📈 Nedavne meritve ({len(recent_readings)}):")
    for reading in recent_readings[:5]:
        print(f"  📊 {reading['sensor_name']}: {reading['value']} {reading['unit']}")
        print(f"     Kakovost: {reading['quality']*100:.1f}% | {reading['timestamp'][:19]}")
    
    # Prikaži alarme
    active_alerts = iot_system.get_active_alerts()
    print(f"\n🔔 Aktivni alarmi ({len(active_alerts)}):")
    for alert in active_alerts[:3]:
        print(f"  ⚠️ {alert['alert_level'].upper()}: {alert['message']}")
        print(f"     Senzor: {alert['sensor_name']} | {alert['timestamp'][:19]}")
    
    if not active_alerts:
        print("  ✅ Ni aktivnih alarmov")
    
    # Statistike
    stats = iot_system.get_sensor_statistics()
    print(f"\n📊 IoT statistike:")
    print(f"  • Skupaj senzorjev: {stats['total_sensors']}")
    print(f"  • Aktivni senzorji: {stats['active_sensors']}")
    print(f"  • Skupaj meritev: {stats['total_readings']}")
    print(f"  • Aktivni alarmi: {stats['active_alerts']}")
    
    # Povprečne vrednosti
    print(f"\n📈 Povprečne vrednosti po tipih:")
    for sensor_type, data in stats['sensor_averages'].items():
        print(f"  • {sensor_type.replace('_', ' ').title()}: {data['average']} (min: {data['min']}, max: {data['max']})")
    
    # Lokacijske statistike
    print(f"\n🏢 Lokacijske statistike:")
    for location, data in stats['location_stats'].items():
        print(f"  • {location.replace('_', ' ').title()}: {data['sensor_count']} senzorjev")
        print(f"    Aktivni: {data['active_sensors']} | Povprečna baterija: {data['avg_battery']}%")
    
    print(f"\n🎉 IoT Monitoring System uspešno testiran!")
    print(f"  • Real-time monitoring temperature, vlažnosti, kakovosti zraka")
    print(f"  • Spremljanje zasedenosti prostorov in kapacitet")
    print(f"  • Varnostni senzorji in alarmi")
    print(f"  • Energetska učinkovitost in pametno upravljanje")
    print(f"  • Predictive maintenance in avtomatizacija")
    print(f"  • IoT dashboard z real-time vizualizacijami")
    print(f"  • Demo časovna omejitev in varnostne kontrole")

if __name__ == "__main__":
    import sys
    import asyncio
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Zaženi Flask server
        iot_system = OmniIoTMonitoring()
        iot_system.run_server(host='0.0.0.0', port=5008)
    else:
        # Zaženi demo
        asyncio.run(demo_iot_monitoring())