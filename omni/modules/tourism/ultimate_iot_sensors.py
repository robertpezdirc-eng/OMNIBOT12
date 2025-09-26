#!/usr/bin/env python3
"""
🌡️ Ultimate IoT Sensors System
IoT senzorji za spremljanje temperature, vlage, energije s smart building nadzorom
"""

import json
import sqlite3
import random
import time
import threading
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple, Any
import statistics
from pathlib import Path

class SensorType(Enum):
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    ENERGY = "energy"
    MOTION = "motion"
    LIGHT = "light"
    AIR_QUALITY = "air_quality"
    WATER_USAGE = "water_usage"
    NOISE = "noise"

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class DeviceStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"
    ERROR = "error"

@dataclass
class SensorReading:
    sensor_id: str
    sensor_type: SensorType
    value: float
    unit: str
    timestamp: datetime
    location: str
    device_id: str

@dataclass
class IoTDevice:
    id: str
    name: str
    location: str
    sensor_types: List[SensorType]
    status: DeviceStatus
    battery_level: float
    last_seen: datetime
    firmware_version: str
    ip_address: str

@dataclass
class Alert:
    id: str
    sensor_id: str
    level: AlertLevel
    message: str
    timestamp: datetime
    acknowledged: bool = False
    resolved: bool = False

@dataclass
class AutomationRule:
    id: str
    name: str
    condition: str  # JSON string z pogoji
    action: str     # JSON string z akcijami
    enabled: bool
    last_triggered: Optional[datetime] = None

class UltimateIoTSensors:
    def __init__(self, db_path: str = "iot_sensors.db"):
        self.db_path = db_path
        self.devices: Dict[str, IoTDevice] = {}
        self.readings: List[SensorReading] = []
        self.alerts: Dict[str, Alert] = {}
        self.automation_rules: Dict[str, AutomationRule] = {}
        self.monitoring_active = False
        self.simulation_active = False
        
        # Pragovi za opozorila
        self.thresholds = {
            SensorType.TEMPERATURE: {"min": 18.0, "max": 26.0, "critical_min": 10.0, "critical_max": 35.0},
            SensorType.HUMIDITY: {"min": 40.0, "max": 60.0, "critical_min": 20.0, "critical_max": 80.0},
            SensorType.ENERGY: {"max": 1000.0, "critical_max": 1500.0},
            SensorType.AIR_QUALITY: {"max": 50.0, "critical_max": 100.0},
            SensorType.NOISE: {"max": 70.0, "critical_max": 85.0}
        }
        
        self.init_database()
        self.load_demo_data()
        print("🌡️ Ultimate IoT Sensors sistem inicializiran!")

    def init_database(self):
        """Inicializacija SQLite baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela naprav
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                location TEXT,
                sensor_types TEXT,
                status TEXT,
                battery_level REAL,
                last_seen TEXT,
                firmware_version TEXT,
                ip_address TEXT
            )
        ''')
        
        # Tabela odčitkov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT,
                sensor_type TEXT,
                value REAL,
                unit TEXT,
                timestamp TEXT,
                location TEXT,
                device_id TEXT,
                FOREIGN KEY (device_id) REFERENCES devices (id)
            )
        ''')
        
        # Tabela opozoril
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                sensor_id TEXT,
                level TEXT,
                message TEXT,
                timestamp TEXT,
                acknowledged BOOLEAN DEFAULT 0,
                resolved BOOLEAN DEFAULT 0
            )
        ''')
        
        # Tabela avtomatizacijskih pravil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS automation_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                condition TEXT,
                action TEXT,
                enabled BOOLEAN DEFAULT 1,
                last_triggered TEXT
            )
        ''')
        
        conn.commit()
        conn.close()

    def add_device(self, device: IoTDevice):
        """Dodaj novo IoT napravo"""
        self.devices[device.id] = device
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO devices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            device.id, device.name, device.location,
            json.dumps([st.value for st in device.sensor_types]),
            device.status.value, device.battery_level,
            device.last_seen.isoformat(), device.firmware_version, device.ip_address
        ))
        conn.commit()
        conn.close()

    def add_reading(self, reading: SensorReading):
        """Dodaj nov odčitek senzorja"""
        self.readings.append(reading)
        
        # Ohrani samo zadnjih 10000 odčitkov v pomnilniku
        if len(self.readings) > 10000:
            self.readings = self.readings[-10000:]
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO readings (sensor_id, sensor_type, value, unit, timestamp, location, device_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            reading.sensor_id, reading.sensor_type.value, reading.value,
            reading.unit, reading.timestamp.isoformat(), reading.location, reading.device_id
        ))
        conn.commit()
        conn.close()
        
        # Preveri pragove in ustvari opozorila
        self.check_thresholds(reading)

    def check_thresholds(self, reading: SensorReading):
        """Preveri pragove in ustvari opozorila"""
        if reading.sensor_type not in self.thresholds:
            return
        
        thresholds = self.thresholds[reading.sensor_type]
        alert_level = None
        message = ""
        
        # Preveri kritične pragove
        if "critical_min" in thresholds and reading.value < thresholds["critical_min"]:
            alert_level = AlertLevel.CRITICAL
            message = f"Kritično nizka vrednost {reading.sensor_type.value}: {reading.value} {reading.unit}"
        elif "critical_max" in thresholds and reading.value > thresholds["critical_max"]:
            alert_level = AlertLevel.CRITICAL
            message = f"Kritično visoka vrednost {reading.sensor_type.value}: {reading.value} {reading.unit}"
        # Preveri običajne pragove
        elif "min" in thresholds and reading.value < thresholds["min"]:
            alert_level = AlertLevel.WARNING
            message = f"Nizka vrednost {reading.sensor_type.value}: {reading.value} {reading.unit}"
        elif "max" in thresholds and reading.value > thresholds["max"]:
            alert_level = AlertLevel.WARNING
            message = f"Visoka vrednost {reading.sensor_type.value}: {reading.value} {reading.unit}"
        
        if alert_level:
            alert_id = f"ALERT_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{reading.sensor_id}"
            alert = Alert(
                id=alert_id,
                sensor_id=reading.sensor_id,
                level=alert_level,
                message=message,
                timestamp=datetime.now()
            )
            self.add_alert(alert)

    def add_alert(self, alert: Alert):
        """Dodaj novo opozorilo"""
        self.alerts[alert.id] = alert
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO alerts VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            alert.id, alert.sensor_id, alert.level.value, alert.message,
            alert.timestamp.isoformat(), alert.acknowledged, alert.resolved
        ))
        conn.commit()
        conn.close()
        
        print(f"🚨 {alert.level.value.upper()}: {alert.message}")

    def get_recent_readings(self, sensor_type: SensorType, hours: int = 24) -> List[SensorReading]:
        """Pridobi nedavne odčitke za določen tip senzorja"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [r for r in self.readings 
                if r.sensor_type == sensor_type and r.timestamp > cutoff_time]

    def get_sensor_statistics(self, sensor_type: SensorType, hours: int = 24) -> Dict:
        """Pridobi statistike za senzor"""
        readings = self.get_recent_readings(sensor_type, hours)
        if not readings:
            return {}
        
        values = [r.value for r in readings]
        return {
            'count': len(values),
            'min': min(values),
            'max': max(values),
            'avg': statistics.mean(values),
            'median': statistics.median(values),
            'latest': readings[-1].value if readings else None,
            'unit': readings[0].unit if readings else None
        }

    def get_device_health(self) -> Dict[str, Dict]:
        """Pridobi zdravje vseh naprav"""
        health_report = {}
        
        for device_id, device in self.devices.items():
            # Preveri, kdaj je bila naprava nazadnje vidna
            time_since_seen = datetime.now() - device.last_seen
            is_online = time_since_seen.total_seconds() < 300  # 5 minut
            
            # Pridobi nedavne odčitke
            device_readings = [r for r in self.readings[-1000:] if r.device_id == device_id]
            recent_readings = len([r for r in device_readings 
                                 if (datetime.now() - r.timestamp).total_seconds() < 3600])
            
            health_report[device_id] = {
                'name': device.name,
                'location': device.location,
                'status': device.status.value,
                'battery_level': device.battery_level,
                'is_online': is_online,
                'time_since_seen': time_since_seen.total_seconds(),
                'recent_readings': recent_readings,
                'health_score': self.calculate_device_health_score(device, is_online, recent_readings)
            }
        
        return health_report

    def calculate_device_health_score(self, device: IoTDevice, is_online: bool, recent_readings: int) -> float:
        """Izračunaj oceno zdravja naprave (0.0 - 1.0)"""
        score = 0.0
        
        # Online status (40%)
        if is_online:
            score += 0.4
        
        # Battery level (30%)
        if device.battery_level > 80:
            score += 0.3
        elif device.battery_level > 50:
            score += 0.2
        elif device.battery_level > 20:
            score += 0.1
        
        # Recent readings activity (30%)
        if recent_readings > 50:
            score += 0.3
        elif recent_readings > 20:
            score += 0.2
        elif recent_readings > 5:
            score += 0.1
        
        return min(score, 1.0)

    def add_automation_rule(self, rule: AutomationRule):
        """Dodaj avtomatizacijsko pravilo"""
        self.automation_rules[rule.id] = rule
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO automation_rules VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            rule.id, rule.name, rule.condition, rule.action, rule.enabled,
            rule.last_triggered.isoformat() if rule.last_triggered else None
        ))
        conn.commit()
        conn.close()

    def check_automation_rules(self):
        """Preveri in izvršuj avtomatizacijska pravila"""
        for rule in self.automation_rules.values():
            if not rule.enabled:
                continue
            
            try:
                # Preprosta implementacija pravil
                condition = json.loads(rule.condition)
                if self.evaluate_condition(condition):
                    action = json.loads(rule.action)
                    self.execute_action(action)
                    rule.last_triggered = datetime.now()
                    print(f"🤖 Izvršeno avtomatizacijsko pravilo: {rule.name}")
            except Exception as e:
                print(f"❌ Napaka pri izvrševanju pravila {rule.name}: {e}")

    def evaluate_condition(self, condition: Dict) -> bool:
        """Oceni pogoj avtomatizacijskega pravila"""
        # Preprosta implementacija - lahko razširiš
        sensor_type = SensorType(condition.get('sensor_type'))
        operator = condition.get('operator')  # >, <, ==, >=, <=
        threshold = condition.get('value')
        
        recent_readings = self.get_recent_readings(sensor_type, 1)
        if not recent_readings:
            return False
        
        latest_value = recent_readings[-1].value
        
        if operator == '>':
            return latest_value > threshold
        elif operator == '<':
            return latest_value < threshold
        elif operator == '>=':
            return latest_value >= threshold
        elif operator == '<=':
            return latest_value <= threshold
        elif operator == '==':
            return latest_value == threshold
        
        return False

    def execute_action(self, action: Dict):
        """Izvršuj akcijo avtomatizacijskega pravila"""
        action_type = action.get('type')
        
        if action_type == 'alert':
            # Ustvari opozorilo
            alert_id = f"AUTO_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            alert = Alert(
                id=alert_id,
                sensor_id="automation",
                level=AlertLevel(action.get('level', 'info')),
                message=action.get('message', 'Avtomatizacijsko opozorilo'),
                timestamp=datetime.now()
            )
            self.add_alert(alert)
        
        elif action_type == 'control_device':
            # Nadzor naprave (simulacija)
            device_id = action.get('device_id')
            command = action.get('command')
            print(f"🎛️ Pošiljam ukaz '{command}' napravi {device_id}")
        
        elif action_type == 'notification':
            # Pošlji obvestilo (simulacija)
            message = action.get('message')
            print(f"📱 Obvestilo: {message}")

    def simulate_sensor_data(self):
        """Simuliraj podatke senzorjev za demo"""
        if not self.simulation_active:
            return
        
        for device in self.devices.values():
            if device.status != DeviceStatus.ONLINE:
                continue
            
            for sensor_type in device.sensor_types:
                # Generiraj realistične podatke
                value = self.generate_realistic_value(sensor_type, device.location)
                
                reading = SensorReading(
                    sensor_id=f"{device.id}_{sensor_type.value}",
                    sensor_type=sensor_type,
                    value=value,
                    unit=self.get_sensor_unit(sensor_type),
                    timestamp=datetime.now(),
                    location=device.location,
                    device_id=device.id
                )
                
                self.add_reading(reading)

    def generate_realistic_value(self, sensor_type: SensorType, location: str) -> float:
        """Generiraj realistične vrednosti senzorjev"""
        base_values = {
            SensorType.TEMPERATURE: 22.0,
            SensorType.HUMIDITY: 50.0,
            SensorType.ENERGY: 500.0,
            SensorType.MOTION: random.choice([0, 1]),
            SensorType.LIGHT: 300.0,
            SensorType.AIR_QUALITY: 25.0,
            SensorType.WATER_USAGE: 10.0,
            SensorType.NOISE: 45.0
        }
        
        base = base_values.get(sensor_type, 0.0)
        
        # Dodaj variacije glede na lokacijo
        if location == "kuhinja":
            if sensor_type == SensorType.TEMPERATURE:
                base += random.uniform(2, 8)  # Kuhinja je toplejša
            elif sensor_type == SensorType.HUMIDITY:
                base += random.uniform(5, 15)  # Višja vlaga
        elif location == "jedilnica":
            if sensor_type == SensorType.NOISE:
                base += random.uniform(5, 20)  # Več hrupa
        elif location == "shramba":
            if sensor_type == SensorType.TEMPERATURE:
                base -= random.uniform(2, 5)  # Hladneje
        
        # Dodaj naključne variacije
        variation = base * 0.1  # 10% variacija
        return round(base + random.uniform(-variation, variation), 2)

    def get_sensor_unit(self, sensor_type: SensorType) -> str:
        """Pridobi enoto za tip senzorja"""
        units = {
            SensorType.TEMPERATURE: "°C",
            SensorType.HUMIDITY: "%",
            SensorType.ENERGY: "W",
            SensorType.MOTION: "bool",
            SensorType.LIGHT: "lux",
            SensorType.AIR_QUALITY: "AQI",
            SensorType.WATER_USAGE: "L/min",
            SensorType.NOISE: "dB"
        }
        return units.get(sensor_type, "")

    def start_monitoring(self):
        """Začni spremljanje senzorjev"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.simulation_active = True
        
        def monitoring_loop():
            while self.monitoring_active:
                try:
                    # Simuliraj podatke senzorjev
                    self.simulate_sensor_data()
                    
                    # Preveri avtomatizacijska pravila
                    self.check_automation_rules()
                    
                    # Posodobi status naprav
                    self.update_device_status()
                    
                    time.sleep(30)  # Počakaj 30 sekund
                except Exception as e:
                    print(f"❌ Napaka pri spremljanju: {e}")
                    time.sleep(10)
        
        monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
        monitor_thread.start()
        print("🔄 IoT spremljanje aktivirano")

    def stop_monitoring(self):
        """Ustavi spremljanje"""
        self.monitoring_active = False
        self.simulation_active = False
        print("⏹️ IoT spremljanje ustavljeno")

    def update_device_status(self):
        """Posodobi status naprav"""
        for device in self.devices.values():
            # Simuliraj občasne izpade
            if random.random() < 0.02:  # 2% možnost izpada
                device.status = DeviceStatus.OFFLINE
            elif device.status == DeviceStatus.OFFLINE and random.random() < 0.3:  # 30% možnost vrnitve
                device.status = DeviceStatus.ONLINE
            
            # Posodobi baterijo
            if device.battery_level > 0:
                device.battery_level = max(0, device.battery_level - random.uniform(0.1, 0.5))
            
            # Posodobi zadnji čas
            if device.status == DeviceStatus.ONLINE:
                device.last_seen = datetime.now()

    def get_dashboard_data(self) -> Dict:
        """Pridobi podatke za dashboard"""
        # Osnovne statistike
        total_devices = len(self.devices)
        online_devices = len([d for d in self.devices.values() if d.status == DeviceStatus.ONLINE])
        total_alerts = len([a for a in self.alerts.values() if not a.resolved])
        critical_alerts = len([a for a in self.alerts.values() 
                              if a.level == AlertLevel.CRITICAL and not a.resolved])
        
        # Statistike senzorjev
        sensor_stats = {}
        for sensor_type in SensorType:
            stats = self.get_sensor_statistics(sensor_type, 24)
            if stats:
                sensor_stats[sensor_type.value] = stats
        
        # Zdravje naprav
        device_health = self.get_device_health()
        avg_health = statistics.mean([h['health_score'] for h in device_health.values()]) if device_health else 0
        
        # Energijska poraba
        energy_readings = self.get_recent_readings(SensorType.ENERGY, 24)
        total_energy = sum(r.value for r in energy_readings) if energy_readings else 0
        
        return {
            'total_devices': total_devices,
            'online_devices': online_devices,
            'device_uptime': (online_devices / total_devices * 100) if total_devices > 0 else 0,
            'total_alerts': total_alerts,
            'critical_alerts': critical_alerts,
            'sensor_statistics': sensor_stats,
            'device_health': device_health,
            'avg_health_score': avg_health,
            'total_energy_consumption': total_energy,
            'monitoring_active': self.monitoring_active,
            'automation_rules': len(self.automation_rules)
        }

    def load_demo_data(self):
        """Naloži demo podatke"""
        # Demo naprave
        devices = [
            IoTDevice(
                id="DEV001", name="Kuhinjski senzor", location="kuhinja",
                sensor_types=[SensorType.TEMPERATURE, SensorType.HUMIDITY, SensorType.AIR_QUALITY],
                status=DeviceStatus.ONLINE, battery_level=85.0, last_seen=datetime.now(),
                firmware_version="1.2.3", ip_address="192.168.1.101"
            ),
            IoTDevice(
                id="DEV002", name="Jedilniški senzor", location="jedilnica",
                sensor_types=[SensorType.TEMPERATURE, SensorType.MOTION, SensorType.LIGHT, SensorType.NOISE],
                status=DeviceStatus.ONLINE, battery_level=92.0, last_seen=datetime.now(),
                firmware_version="1.2.3", ip_address="192.168.1.102"
            ),
            IoTDevice(
                id="DEV003", name="Energijski meter", location="glavna_razdelilna_omarica",
                sensor_types=[SensorType.ENERGY],
                status=DeviceStatus.ONLINE, battery_level=100.0, last_seen=datetime.now(),
                firmware_version="2.1.0", ip_address="192.168.1.103"
            ),
            IoTDevice(
                id="DEV004", name="Shrambni senzor", location="shramba",
                sensor_types=[SensorType.TEMPERATURE, SensorType.HUMIDITY],
                status=DeviceStatus.ONLINE, battery_level=67.0, last_seen=datetime.now(),
                firmware_version="1.2.3", ip_address="192.168.1.104"
            )
        ]
        
        for device in devices:
            self.add_device(device)
        
        # Demo avtomatizacijska pravila
        rules = [
            AutomationRule(
                id="RULE001", name="Visoka temperatura v kuhinji",
                condition=json.dumps({
                    "sensor_type": "temperature",
                    "operator": ">",
                    "value": 30.0
                }),
                action=json.dumps({
                    "type": "alert",
                    "level": "warning",
                    "message": "Temperatura v kuhinji je previsoka!"
                }),
                enabled=True
            ),
            AutomationRule(
                id="RULE002", name="Nizka baterija",
                condition=json.dumps({
                    "sensor_type": "battery",
                    "operator": "<",
                    "value": 20.0
                }),
                action=json.dumps({
                    "type": "notification",
                    "message": "Baterija naprave je nizka - potrebna je zamenjava"
                }),
                enabled=True
            )
        ]
        
        for rule in rules:
            self.add_automation_rule(rule)

def demo_iot_sensors():
    """Demo funkcija za testiranje IoT sistema"""
    print("\n🌡️ DEMO: Ultimate IoT Sensors System")
    print("=" * 50)
    
    # Inicializiraj sistem
    iot_system = UltimateIoTSensors()
    
    # Začni spremljanje
    print("\n🔄 Začenjam spremljanje senzorjev...")
    iot_system.start_monitoring()
    
    # Počakaj nekaj časa za zbiranje podatkov
    print("⏳ Zbiram podatke senzorjev (10 sekund)...")
    time.sleep(10)
    
    # Prikaži dashboard podatke
    print("\n📊 Dashboard statistike:")
    dashboard = iot_system.get_dashboard_data()
    print(f"   Skupno naprav: {dashboard['total_devices']}")
    print(f"   Online naprav: {dashboard['online_devices']}")
    print(f"   Dostopnost: {dashboard['device_uptime']:.1f}%")
    print(f"   Aktivna opozorila: {dashboard['total_alerts']}")
    print(f"   Kritična opozorila: {dashboard['critical_alerts']}")
    print(f"   Povprečno zdravje naprav: {dashboard['avg_health_score']:.2f}")
    print(f"   Energijska poraba: {dashboard['total_energy_consumption']:.1f} W")
    
    # Prikaži statistike senzorjev
    print("\n📈 Statistike senzorjev:")
    for sensor_type, stats in dashboard['sensor_statistics'].items():
        print(f"   {sensor_type.title()}:")
        print(f"     • Trenutno: {stats['latest']:.1f} {stats['unit']}")
        print(f"     • Povprečje: {stats['avg']:.1f} {stats['unit']}")
        print(f"     • Min/Max: {stats['min']:.1f} / {stats['max']:.1f} {stats['unit']}")
    
    # Prikaži zdravje naprav
    print("\n🏥 Zdravje naprav:")
    for device_id, health in dashboard['device_health'].items():
        status_icon = "🟢" if health['is_online'] else "🔴"
        battery_icon = "🔋" if health['battery_level'] > 50 else "🪫"
        print(f"   {status_icon} {health['name']} ({health['location']})")
        print(f"     • Status: {health['status']}")
        print(f"     • {battery_icon} Baterija: {health['battery_level']:.1f}%")
        print(f"     • Zdravje: {health['health_score']:.2f}/1.00")
        print(f"     • Nedavni odčitki: {health['recent_readings']}")
    
    # Prikaži nedavna opozorila
    recent_alerts = [alert for alert in iot_system.alerts.values() 
                    if not alert.resolved and (datetime.now() - alert.timestamp).total_seconds() < 3600]
    
    if recent_alerts:
        print(f"\n🚨 Nedavna opozorila ({len(recent_alerts)}):")
        for alert in recent_alerts[-5:]:  # Prikaži zadnjih 5
            level_icon = {"info": "ℹ️", "warning": "⚠️", "critical": "🚨", "emergency": "🆘"}
            icon = level_icon.get(alert.level.value, "❓")
            print(f"   {icon} {alert.message}")
            print(f"     • Čas: {alert.timestamp.strftime('%H:%M:%S')}")
    else:
        print("\n✅ Ni aktivnih opozoril")
    
    # Ustavi spremljanje
    print("\n⏹️ Ustavljam spremljanje...")
    iot_system.stop_monitoring()

if __name__ == "__main__":
    demo_iot_sensors()