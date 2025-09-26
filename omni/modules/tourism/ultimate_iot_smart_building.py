"""
ULTIMATE IoT Smart Building System
Napredni sistem za nadzor in optimizacijo stavbe
- Svetloba, ogrevanje, hlajenje, voda, elektrika
- Energetska učinkovitost in trajnostni razvoj
- Real-time monitoring in avtomatizacija
- Prediktivno vzdrževanje
"""

import sqlite3
import json
from datetime import datetime, timedelta
import random
import time
from typing import Dict, List, Optional, Tuple

class IoTDevice:
    """Razred za IoT naprave"""
    def __init__(self, device_id: str, device_type: str, location: str, 
                 status: str = "active", battery_level: float = 100.0):
        self.device_id = device_id
        self.device_type = device_type  # light, heating, cooling, water, electricity, sensor
        self.location = location
        self.status = status
        self.battery_level = battery_level
        self.last_reading = None
        self.settings = {}

class SensorReading:
    """Razred za branja senzorjev"""
    def __init__(self, device_id: str, reading_type: str, value: float, 
                 unit: str, timestamp: datetime = None):
        self.device_id = device_id
        self.reading_type = reading_type  # temperature, humidity, light_level, energy_usage, water_flow
        self.value = value
        self.unit = unit
        self.timestamp = timestamp or datetime.now()

class EnergyOptimization:
    """Razred za energetsko optimizacijo"""
    def __init__(self):
        self.optimization_rules = []
        self.energy_targets = {}
        self.cost_savings = 0.0

class SmartBuildingSystem:
    """Glavni sistem za IoT Smart Building"""
    
    def __init__(self, db_path: str = "ultimate_smart_building.db"):
        self.db_path = db_path
        self.devices = {}
        self.sensor_readings = []
        self.energy_optimizer = EnergyOptimization()
        self.alerts = []
        self.automation_rules = []
        
    def initialize_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela naprav
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS devices (
                device_id TEXT PRIMARY KEY,
                device_type TEXT NOT NULL,
                location TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                battery_level REAL DEFAULT 100.0,
                settings TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela branj senzorjev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                reading_type TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices (device_id)
            )
        ''')
        
        # Tabela energetskih optimizacij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS energy_optimizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                optimization_type TEXT NOT NULL,
                description TEXT,
                energy_saved REAL DEFAULT 0.0,
                cost_saved REAL DEFAULT 0.0,
                implemented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela opozoril
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                device_id TEXT,
                message TEXT NOT NULL,
                severity TEXT DEFAULT 'medium',
                resolved BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela avtomatizacijskih pravil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS automation_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_name TEXT NOT NULL,
                trigger_condition TEXT NOT NULL,
                action TEXT NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def add_device(self, device: IoTDevice) -> bool:
        """Dodajanje IoT naprave"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO devices (device_id, device_type, location, status, 
                                   battery_level, settings)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (device.device_id, device.device_type, device.location,
                  device.status, device.battery_level, json.dumps(device.settings)))
            
            conn.commit()
            conn.close()
            
            self.devices[device.device_id] = device
            return True
            
        except Exception as e:
            print(f"Napaka pri dodajanju naprave: {e}")
            return False
    
    def record_sensor_reading(self, reading: SensorReading) -> bool:
        """Beleženje branja senzorja"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO sensor_readings (device_id, reading_type, value, unit, timestamp)
                VALUES (?, ?, ?, ?, ?)
            ''', (reading.device_id, reading.reading_type, reading.value,
                  reading.unit, reading.timestamp))
            
            conn.commit()
            conn.close()
            
            self.sensor_readings.append(reading)
            
            # Preveri za opozorila
            self._check_alerts(reading)
            
            return True
            
        except Exception as e:
            print(f"Napaka pri beleženju branja: {e}")
            return False
    
    def control_device(self, device_id: str, action: str, parameters: Dict = None) -> bool:
        """Nadzor naprave"""
        try:
            if device_id not in self.devices:
                return False
                
            device = self.devices[device_id]
            
            # Simulacija nadzora naprave
            if action == "turn_on":
                device.status = "active"
            elif action == "turn_off":
                device.status = "inactive"
            elif action == "set_temperature":
                if parameters and "temperature" in parameters:
                    device.settings["target_temperature"] = parameters["temperature"]
            elif action == "set_brightness":
                if parameters and "brightness" in parameters:
                    device.settings["brightness"] = parameters["brightness"]
            elif action == "set_schedule":
                if parameters and "schedule" in parameters:
                    device.settings["schedule"] = parameters["schedule"]
            
            # Posodobi v bazi
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE devices SET status = ?, settings = ? WHERE device_id = ?
            ''', (device.status, json.dumps(device.settings), device_id))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"Napaka pri nadzoru naprave: {e}")
            return False
    
    def optimize_energy_usage(self) -> Dict:
        """Optimizacija porabe energije"""
        try:
            # Analiza trenutne porabe
            current_usage = self._calculate_current_energy_usage()
            
            # Predlogi optimizacije
            optimizations = []
            
            # Optimizacija ogrevanja/hlajenja
            heating_savings = self._optimize_hvac()
            if heating_savings > 0:
                optimizations.append({
                    "type": "HVAC Optimization",
                    "description": "Optimizacija ogrevanja in hlajenja glede na zasedenost",
                    "energy_saved": heating_savings,
                    "cost_saved": heating_savings * 0.15  # 0.15€ per kWh
                })
            
            # Optimizacija razsvetljave
            lighting_savings = self._optimize_lighting()
            if lighting_savings > 0:
                optimizations.append({
                    "type": "Lighting Optimization",
                    "description": "Avtomatska regulacija svetlobe glede na naravno svetlobo",
                    "energy_saved": lighting_savings,
                    "cost_saved": lighting_savings * 0.15
                })
            
            # Optimizacija vode
            water_savings = self._optimize_water_usage()
            if water_savings > 0:
                optimizations.append({
                    "type": "Water Optimization",
                    "description": "Optimizacija porabe vode z pametnimi ventili",
                    "energy_saved": water_savings * 0.1,  # Energija za ogrevanje vode
                    "cost_saved": water_savings * 0.003  # 0.003€ per liter
                })
            
            # Shrani optimizacije
            for opt in optimizations:
                self._save_optimization(opt)
            
            total_energy_saved = sum(opt["energy_saved"] for opt in optimizations)
            total_cost_saved = sum(opt["cost_saved"] for opt in optimizations)
            
            return {
                "current_usage": current_usage,
                "optimizations": optimizations,
                "total_energy_saved": total_energy_saved,
                "total_cost_saved": total_cost_saved,
                "efficiency_improvement": (total_energy_saved / current_usage * 100) if current_usage > 0 else 0
            }
            
        except Exception as e:
            print(f"Napaka pri optimizaciji energije: {e}")
            return {}
    
    def create_automation_rule(self, rule_name: str, trigger_condition: str, action: str) -> bool:
        """Ustvarjanje avtomatizacijskega pravila"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO automation_rules (rule_name, trigger_condition, action)
                VALUES (?, ?, ?)
            ''', (rule_name, trigger_condition, action))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju pravila: {e}")
            return False
    
    def get_building_status(self) -> Dict:
        """Pridobi status stavbe"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Število naprav po tipih
            cursor.execute('''
                SELECT device_type, COUNT(*) as count, 
                       AVG(battery_level) as avg_battery
                FROM devices 
                WHERE status = 'active'
                GROUP BY device_type
            ''')
            device_stats = cursor.fetchall()
            
            # Zadnja branja senzorjev
            cursor.execute('''
                SELECT reading_type, AVG(value) as avg_value, unit
                FROM sensor_readings 
                WHERE timestamp > datetime('now', '-1 hour')
                GROUP BY reading_type, unit
            ''')
            sensor_stats = cursor.fetchall()
            
            # Nerazrešena opozorila
            cursor.execute('''
                SELECT COUNT(*) as count, severity
                FROM alerts 
                WHERE resolved = FALSE
                GROUP BY severity
            ''')
            alert_stats = cursor.fetchall()
            
            # Energetske optimizacije danes
            cursor.execute('''
                SELECT SUM(energy_saved) as total_energy, SUM(cost_saved) as total_cost
                FROM energy_optimizations 
                WHERE DATE(implemented_at) = DATE('now')
            ''')
            today_savings = cursor.fetchone()
            
            conn.close()
            
            return {
                "device_statistics": [
                    {
                        "type": stat[0],
                        "count": stat[1],
                        "avg_battery": round(stat[2], 1)
                    } for stat in device_stats
                ],
                "sensor_readings": [
                    {
                        "type": stat[0],
                        "average_value": round(stat[1], 2),
                        "unit": stat[2]
                    } for stat in sensor_stats
                ],
                "alerts": [
                    {
                        "severity": stat[1],
                        "count": stat[0]
                    } for stat in alert_stats
                ],
                "today_savings": {
                    "energy_saved": round(today_savings[0] or 0, 2),
                    "cost_saved": round(today_savings[1] or 0, 2)
                },
                "building_efficiency": self._calculate_building_efficiency()
            }
            
        except Exception as e:
            print(f"Napaka pri pridobivanju statusa: {e}")
            return {}
    
    def _check_alerts(self, reading: SensorReading):
        """Preveri za opozorila"""
        alerts_to_create = []
        
        # Temperatura opozorila
        if reading.reading_type == "temperature":
            if reading.value > 30:
                alerts_to_create.append({
                    "type": "High Temperature",
                    "message": f"Visoka temperatura v {self.devices[reading.device_id].location}: {reading.value}°C",
                    "severity": "high"
                })
            elif reading.value < 15:
                alerts_to_create.append({
                    "type": "Low Temperature", 
                    "message": f"Nizka temperatura v {self.devices[reading.device_id].location}: {reading.value}°C",
                    "severity": "medium"
                })
        
        # Energijska poraba opozorila
        elif reading.reading_type == "energy_usage":
            if reading.value > 1000:  # Več kot 1000W
                alerts_to_create.append({
                    "type": "High Energy Usage",
                    "message": f"Visoka poraba energije: {reading.value}W",
                    "severity": "medium"
                })
        
        # Baterija opozorila
        if reading.device_id in self.devices:
            device = self.devices[reading.device_id]
            if device.battery_level < 20:
                alerts_to_create.append({
                    "type": "Low Battery",
                    "message": f"Nizka baterija naprave {device.device_id}: {device.battery_level}%",
                    "severity": "high"
                })
        
        # Shrani opozorila
        for alert in alerts_to_create:
            self._create_alert(alert["type"], reading.device_id, alert["message"], alert["severity"])
    
    def _create_alert(self, alert_type: str, device_id: str, message: str, severity: str):
        """Ustvari opozorilo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO alerts (alert_type, device_id, message, severity)
                VALUES (?, ?, ?, ?)
            ''', (alert_type, device_id, message, severity))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju opozorila: {e}")
    
    def _calculate_current_energy_usage(self) -> float:
        """Izračunaj trenutno porabo energije"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT SUM(value) as total_usage
                FROM sensor_readings 
                WHERE reading_type = 'energy_usage' 
                AND timestamp > datetime('now', '-1 hour')
            ''')
            
            result = cursor.fetchone()
            conn.close()
            
            return result[0] or 0
            
        except Exception as e:
            print(f"Napaka pri izračunu porabe: {e}")
            return 0
    
    def _optimize_hvac(self) -> float:
        """Optimizacija HVAC sistema"""
        # Simulacija prihrankov HVAC optimizacije
        return random.uniform(50, 200)  # kWh prihranki
    
    def _optimize_lighting(self) -> float:
        """Optimizacija razsvetljave"""
        # Simulacija prihrankov razsvetljave
        return random.uniform(20, 100)  # kWh prihranki
    
    def _optimize_water_usage(self) -> float:
        """Optimizacija porabe vode"""
        # Simulacija prihrankov vode
        return random.uniform(100, 500)  # litri prihranki
    
    def _save_optimization(self, optimization: Dict):
        """Shrani optimizacijo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO energy_optimizations (optimization_type, description, 
                                                energy_saved, cost_saved)
                VALUES (?, ?, ?, ?)
            ''', (optimization["type"], optimization["description"],
                  optimization["energy_saved"], optimization["cost_saved"]))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Napaka pri shranjevanju optimizacije: {e}")
    
    def _calculate_building_efficiency(self) -> float:
        """Izračunaj učinkovitost stavbe"""
        # Simulacija izračuna učinkovitosti
        return random.uniform(75, 95)  # Odstotek učinkovitosti

def load_demo_data(system: SmartBuildingSystem):
    """Naloži demo podatke"""
    
    # Demo naprave
    devices = [
        # Razsvetljava
        IoTDevice("light_001", "light", "Recepcija", "active", 95.0),
        IoTDevice("light_002", "light", "Restavracija", "active", 88.0),
        IoTDevice("light_003", "light", "Soba 101", "active", 92.0),
        IoTDevice("light_004", "light", "Soba 102", "inactive", 85.0),
        
        # Ogrevanje/hlajenje
        IoTDevice("hvac_001", "heating", "Recepcija", "active", 100.0),
        IoTDevice("hvac_002", "heating", "Restavracija", "active", 95.0),
        IoTDevice("hvac_003", "cooling", "Soba 101", "active", 90.0),
        IoTDevice("hvac_004", "cooling", "Soba 102", "inactive", 88.0),
        
        # Voda
        IoTDevice("water_001", "water", "Kuhinja", "active", 100.0),
        IoTDevice("water_002", "water", "Kopalnica 101", "active", 95.0),
        IoTDevice("water_003", "water", "Kopalnica 102", "active", 92.0),
        
        # Senzorji
        IoTDevice("sensor_001", "sensor", "Recepcija", "active", 85.0),
        IoTDevice("sensor_002", "sensor", "Restavracija", "active", 90.0),
        IoTDevice("sensor_003", "sensor", "Soba 101", "active", 88.0),
        IoTDevice("sensor_004", "sensor", "Zunaj", "active", 75.0),
    ]
    
    # Dodaj naprave
    for device in devices:
        # Nastavi nastavitve naprav
        if device.device_type == "light":
            device.settings = {"brightness": 80, "color_temperature": 3000}
        elif device.device_type in ["heating", "cooling"]:
            device.settings = {"target_temperature": 22, "schedule": "auto"}
        elif device.device_type == "water":
            device.settings = {"flow_rate": "normal", "temperature": 40}
        elif device.device_type == "sensor":
            device.settings = {"reading_interval": 300}  # 5 minut
            
        system.add_device(device)
    
    # Demo branja senzorjev
    current_time = datetime.now()
    
    for i in range(24):  # 24 ur podatkov
        timestamp = current_time - timedelta(hours=i)
        
        # Temperatura branja
        for device_id in ["sensor_001", "sensor_002", "sensor_003", "sensor_004"]:
            base_temp = 22 if device_id != "sensor_004" else 15  # Zunanja temp
            temp_variation = random.uniform(-3, 3)
            
            reading = SensorReading(
                device_id, "temperature", 
                base_temp + temp_variation, "°C", timestamp
            )
            system.record_sensor_reading(reading)
        
        # Vlažnost branja
        for device_id in ["sensor_001", "sensor_002", "sensor_003"]:
            humidity = random.uniform(40, 60)
            reading = SensorReading(
                device_id, "humidity", humidity, "%", timestamp
            )
            system.record_sensor_reading(reading)
        
        # Energijska poraba
        for device_id in ["hvac_001", "hvac_002", "hvac_003", "light_001", "light_002"]:
            base_usage = 500 if "hvac" in device_id else 100
            usage_variation = random.uniform(0.8, 1.2)
            
            reading = SensorReading(
                device_id, "energy_usage",
                base_usage * usage_variation, "W", timestamp
            )
            system.record_sensor_reading(reading)
    
    # Demo avtomatizacijska pravila
    automation_rules = [
        ("Nočna razsvetljava", "time >= 22:00", "set_brightness(30%)"),
        ("Jutranjo ogrevanje", "time == 06:00", "set_temperature(23°C)"),
        ("Energijski varčevalni način", "occupancy == 0", "reduce_energy(50%)"),
        ("Visoka temperatura", "temperature > 28°C", "increase_cooling()"),
        ("Nizka vlažnost", "humidity < 30%", "activate_humidifier()"),
    ]
    
    for rule_name, trigger, action in automation_rules:
        system.create_automation_rule(rule_name, trigger, action)

def demo_smart_building():
    """Demo funkcija za Smart Building sistem"""
    print("🏢 ULTIMATE IoT Smart Building System Demo")
    print("=" * 50)
    
    # Inicializacija sistema
    system = SmartBuildingSystem()
    system.initialize_database()
    
    # Naloži demo podatke
    load_demo_data(system)
    
    # Prikaži status stavbe
    status = system.get_building_status()
    print("\n📊 Status stavbe:")
    print(f"Naprave: {len(status.get('device_statistics', []))}")
    print(f"Aktivna branja: {len(status.get('sensor_readings', []))}")
    print(f"Opozorila: {sum(alert['count'] for alert in status.get('alerts', []))}")
    print(f"Današnji prihranki: {status.get('today_savings', {}).get('cost_saved', 0)}€")
    
    # Optimizacija energije
    optimization = system.optimize_energy_usage()
    print(f"\n⚡ Energetska optimizacija:")
    print(f"Trenutna poraba: {optimization.get('current_usage', 0)} kWh")
    print(f"Prihranki energije: {optimization.get('total_energy_saved', 0)} kWh")
    print(f"Prihranki stroškov: {optimization.get('total_cost_saved', 0)}€")
    print(f"Izboljšanje učinkovitosti: {optimization.get('efficiency_improvement', 0):.1f}%")
    
    # Nadzor naprav
    print(f"\n🎛️ Nadzor naprav:")
    system.control_device("light_001", "set_brightness", {"brightness": 60})
    system.control_device("hvac_001", "set_temperature", {"temperature": 21})
    print("✅ Nastavitve naprav posodobljene")
    
    return system

if __name__ == "__main__":
    demo_smart_building()