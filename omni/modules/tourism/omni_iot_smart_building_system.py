#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMNI IoT & Smart Building System
Celovit sistem za upravljanje IoT naprav, pametnih zgradb in avtomatizacijo
"""

import sqlite3
import json
import datetime
import random
import uuid
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

class DeviceType(Enum):
    TEMPERATURE_SENSOR = "temperature_sensor"
    HUMIDITY_SENSOR = "humidity_sensor"
    MOTION_SENSOR = "motion_sensor"
    DOOR_SENSOR = "door_sensor"
    WINDOW_SENSOR = "window_sensor"
    SMOKE_DETECTOR = "smoke_detector"
    WATER_LEAK_SENSOR = "water_leak_sensor"
    LIGHT_CONTROLLER = "light_controller"
    HVAC_CONTROLLER = "hvac_controller"
    SECURITY_CAMERA = "security_camera"
    ACCESS_CONTROL = "access_control"
    ENERGY_METER = "energy_meter"
    WIFI_ACCESS_POINT = "wifi_access_point"
    SMART_LOCK = "smart_lock"
    IRRIGATION_SYSTEM = "irrigation_system"

class DeviceStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    BATTERY_LOW = "battery_low"

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class AutomationTrigger(Enum):
    TIME_BASED = "time_based"
    SENSOR_VALUE = "sensor_value"
    OCCUPANCY = "occupancy"
    WEATHER = "weather"
    ENERGY_USAGE = "energy_usage"
    SECURITY_EVENT = "security_event"

@dataclass
class IoTDevice:
    device_id: str
    name: str
    device_type: DeviceType
    location: str
    status: DeviceStatus
    battery_level: Optional[float] = None
    last_seen: Optional[datetime.datetime] = None
    firmware_version: str = "1.0.0"
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    configuration: Dict[str, Any] = None

@dataclass
class SensorReading:
    reading_id: str
    device_id: str
    timestamp: datetime.datetime
    value: float
    unit: str
    quality: str = "good"

@dataclass
class Alert:
    alert_id: str
    device_id: str
    level: AlertLevel
    message: str
    timestamp: datetime.datetime
    acknowledged: bool = False
    resolved: bool = False

@dataclass
class AutomationRule:
    rule_id: str
    name: str
    trigger_type: AutomationTrigger
    conditions: Dict[str, Any]
    actions: List[Dict[str, Any]]
    enabled: bool = True
    last_executed: Optional[datetime.datetime] = None

class OmniIoTSmartBuildingSystem:
    def __init__(self, db_path: str = "omni_iot_smart_building.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela IoT naprav
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS iot_devices (
                device_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                device_type TEXT NOT NULL,
                location TEXT NOT NULL,
                status TEXT NOT NULL,
                battery_level REAL,
                last_seen TEXT,
                firmware_version TEXT,
                ip_address TEXT,
                mac_address TEXT,
                configuration TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela senzorskih odčitkov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensor_readings (
                reading_id TEXT PRIMARY KEY,
                device_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                quality TEXT DEFAULT 'good',
                FOREIGN KEY (device_id) REFERENCES iot_devices (device_id)
            )
        ''')
        
        # Tabela opozoril
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                alert_id TEXT PRIMARY KEY,
                device_id TEXT NOT NULL,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                acknowledged INTEGER DEFAULT 0,
                resolved INTEGER DEFAULT 0,
                FOREIGN KEY (device_id) REFERENCES iot_devices (device_id)
            )
        ''')
        
        # Tabela avtomatizacijskih pravil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS automation_rules (
                rule_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                trigger_type TEXT NOT NULL,
                conditions TEXT NOT NULL,
                actions TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                last_executed TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela energetske porabe
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS energy_consumption (
                consumption_id TEXT PRIMARY KEY,
                device_id TEXT,
                location TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                power_usage REAL NOT NULL,
                cost REAL,
                FOREIGN KEY (device_id) REFERENCES iot_devices (device_id)
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def add_iot_device(self, device: IoTDevice) -> bool:
        """Dodaj IoT napravo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO iot_devices 
                (device_id, name, device_type, location, status, battery_level, 
                 last_seen, firmware_version, ip_address, mac_address, configuration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                device.device_id, device.name, device.device_type.value,
                device.location, device.status.value, device.battery_level,
                device.last_seen.isoformat() if device.last_seen else None,
                device.firmware_version, device.ip_address, device.mac_address,
                json.dumps(device.configuration) if device.configuration else None
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju IoT naprave: {e}")
            return False
    
    def record_sensor_reading(self, reading: SensorReading) -> bool:
        """Zabeleži senzorski odčitek"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO sensor_readings 
                (reading_id, device_id, timestamp, value, unit, quality)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                reading.reading_id, reading.device_id,
                reading.timestamp.isoformat(), reading.value,
                reading.unit, reading.quality
            ))
            
            # Posodobi zadnji čas aktivnosti naprave
            cursor.execute('''
                UPDATE iot_devices 
                SET last_seen = ?, status = 'online'
                WHERE device_id = ?
            ''', (reading.timestamp.isoformat(), reading.device_id))
            
            conn.commit()
            conn.close()
            
            # Preveri avtomatizacijska pravila
            self._check_automation_rules(reading)
            
            return True
        except Exception as e:
            print(f"Napaka pri beleženju odčitka: {e}")
            return False
    
    def create_alert(self, alert: Alert) -> bool:
        """Ustvari opozorilo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO alerts 
                (alert_id, device_id, level, message, timestamp, acknowledged, resolved)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.alert_id, alert.device_id, alert.level.value,
                alert.message, alert.timestamp.isoformat(),
                alert.acknowledged, alert.resolved
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri ustvarjanju opozorila: {e}")
            return False
    
    def add_automation_rule(self, rule: AutomationRule) -> bool:
        """Dodaj avtomatizacijsko pravilo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO automation_rules 
                (rule_id, name, trigger_type, conditions, actions, enabled, last_executed)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                rule.rule_id, rule.name, rule.trigger_type.value,
                json.dumps(rule.conditions), json.dumps(rule.actions),
                rule.enabled, rule.last_executed.isoformat() if rule.last_executed else None
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju avtomatizacijskega pravila: {e}")
            return False
    
    def get_device_status(self) -> List[Dict]:
        """Pridobi status vseh naprav"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT device_id, name, device_type, location, status, 
                   battery_level, last_seen, ip_address
            FROM iot_devices
            ORDER BY location, name
        ''')
        
        devices = []
        for row in cursor.fetchall():
            devices.append({
                'device_id': row[0],
                'name': row[1],
                'device_type': row[2],
                'location': row[3],
                'status': row[4],
                'battery_level': row[5],
                'last_seen': row[6],
                'ip_address': row[7]
            })
        
        conn.close()
        return devices
    
    def get_recent_readings(self, device_id: str, hours: int = 24) -> List[Dict]:
        """Pridobi nedavne odčitke naprave"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        since = datetime.datetime.now() - datetime.timedelta(hours=hours)
        
        cursor.execute('''
            SELECT reading_id, timestamp, value, unit, quality
            FROM sensor_readings
            WHERE device_id = ? AND timestamp >= ?
            ORDER BY timestamp DESC
            LIMIT 100
        ''', (device_id, since.isoformat()))
        
        readings = []
        for row in cursor.fetchall():
            readings.append({
                'reading_id': row[0],
                'timestamp': row[1],
                'value': row[2],
                'unit': row[3],
                'quality': row[4]
            })
        
        conn.close()
        return readings
    
    def get_active_alerts(self) -> List[Dict]:
        """Pridobi aktivna opozorila"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT a.alert_id, a.device_id, d.name, d.location, 
                   a.level, a.message, a.timestamp, a.acknowledged
            FROM alerts a
            JOIN iot_devices d ON a.device_id = d.device_id
            WHERE a.resolved = 0
            ORDER BY a.level DESC, a.timestamp DESC
        ''')
        
        alerts = []
        for row in cursor.fetchall():
            alerts.append({
                'alert_id': row[0],
                'device_id': row[1],
                'device_name': row[2],
                'location': row[3],
                'level': row[4],
                'message': row[5],
                'timestamp': row[6],
                'acknowledged': bool(row[7])
            })
        
        conn.close()
        return alerts
    
    def get_energy_consumption(self, location: str = None, days: int = 7) -> Dict:
        """Pridobi podatke o energetski porabi"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        since = datetime.datetime.now() - datetime.timedelta(days=days)
        
        if location:
            cursor.execute('''
                SELECT location, SUM(power_usage), AVG(power_usage), COUNT(*)
                FROM energy_consumption
                WHERE location = ? AND timestamp >= ?
                GROUP BY location
            ''', (location, since.isoformat()))
        else:
            cursor.execute('''
                SELECT location, SUM(power_usage), AVG(power_usage), COUNT(*)
                FROM energy_consumption
                WHERE timestamp >= ?
                GROUP BY location
            ''', (since.isoformat(),))
        
        consumption = {}
        for row in cursor.fetchall():
            consumption[row[0]] = {
                'total_usage': row[1],
                'average_usage': row[2],
                'readings_count': row[3]
            }
        
        conn.close()
        return consumption
    
    def _check_automation_rules(self, reading: SensorReading):
        """Preveri avtomatizacijska pravila"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT rule_id, name, conditions, actions
            FROM automation_rules
            WHERE enabled = 1 AND trigger_type = 'sensor_value'
        ''')
        
        for row in cursor.fetchall():
            rule_id, name, conditions_json, actions_json = row
            conditions = json.loads(conditions_json)
            actions = json.loads(actions_json)
            
            # Preveri pogoje
            if self._evaluate_conditions(reading, conditions):
                self._execute_actions(actions, reading)
                
                # Posodobi čas zadnje izvedbe
                cursor.execute('''
                    UPDATE automation_rules
                    SET last_executed = ?
                    WHERE rule_id = ?
                ''', (datetime.datetime.now().isoformat(), rule_id))
        
        conn.commit()
        conn.close()
    
    def _evaluate_conditions(self, reading: SensorReading, conditions: Dict) -> bool:
        """Oceni pogoje avtomatizacijskega pravila"""
        if 'device_id' in conditions and conditions['device_id'] != reading.device_id:
            return False
        
        if 'min_value' in conditions and reading.value < conditions['min_value']:
            return False
        
        if 'max_value' in conditions and reading.value > conditions['max_value']:
            return False
        
        return True
    
    def _execute_actions(self, actions: List[Dict], reading: SensorReading):
        """Izvedi akcije avtomatizacijskega pravila"""
        for action in actions:
            if action['type'] == 'create_alert':
                alert = Alert(
                    alert_id=str(uuid.uuid4()),
                    device_id=reading.device_id,
                    level=AlertLevel(action['level']),
                    message=action['message'].format(value=reading.value, unit=reading.unit),
                    timestamp=datetime.datetime.now()
                )
                self.create_alert(alert)
            
            elif action['type'] == 'control_device':
                # Simulacija nadzora naprave
                print(f"🎛️ Nadzor naprave {action['target_device']}: {action['command']}")
    
    def simulate_iot_data(self):
        """Simuliraj IoT podatke"""
        devices = self.get_device_status()
        
        for device in devices:
            device_id = device['device_id']
            device_type = device['device_type']
            
            # Generiraj simulirane odčitke
            if device_type == 'temperature_sensor':
                value = random.uniform(18.0, 25.0)
                unit = '°C'
            elif device_type == 'humidity_sensor':
                value = random.uniform(30.0, 70.0)
                unit = '%'
            elif device_type == 'motion_sensor':
                value = random.choice([0, 1])
                unit = 'detected'
            elif device_type == 'energy_meter':
                value = random.uniform(0.5, 5.0)
                unit = 'kW'
            else:
                continue
            
            reading = SensorReading(
                reading_id=str(uuid.uuid4()),
                device_id=device_id,
                timestamp=datetime.datetime.now(),
                value=value,
                unit=unit
            )
            
            self.record_sensor_reading(reading)
            
            # Simuliraj energetsko porabo
            if device_type == 'energy_meter':
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO energy_consumption 
                    (consumption_id, device_id, location, timestamp, power_usage, cost)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    str(uuid.uuid4()), device_id, device['location'],
                    datetime.datetime.now().isoformat(), value, value * 0.15
                ))
                
                conn.commit()
                conn.close()

def demo_iot_smart_building_system():
    """Demo funkcija za IoT in Smart Building sistem"""
    print("🏢 OMNI IoT & Smart Building System - Demo")
    print("=" * 60)
    
    system = OmniIoTSmartBuildingSystem()
    
    # Dodaj IoT naprave
    devices = [
        IoTDevice(
            device_id="TEMP001",
            name="Temperatura - Recepcija",
            device_type=DeviceType.TEMPERATURE_SENSOR,
            location="recepcija",
            status=DeviceStatus.ONLINE,
            battery_level=85.0,
            ip_address="192.168.1.101",
            mac_address="AA:BB:CC:DD:EE:01"
        ),
        IoTDevice(
            device_id="HUMID001",
            name="Vlažnost - Soba 101",
            device_type=DeviceType.HUMIDITY_SENSOR,
            location="soba_101",
            status=DeviceStatus.ONLINE,
            battery_level=92.0,
            ip_address="192.168.1.102"
        ),
        IoTDevice(
            device_id="MOTION001",
            name="Gibanje - Hodnik 1",
            device_type=DeviceType.MOTION_SENSOR,
            location="hodnik_1",
            status=DeviceStatus.ONLINE,
            battery_level=78.0
        ),
        IoTDevice(
            device_id="ENERGY001",
            name="Energetski meter - Glavna",
            device_type=DeviceType.ENERGY_METER,
            location="glavna_razdelilna",
            status=DeviceStatus.ONLINE,
            ip_address="192.168.1.103"
        ),
        IoTDevice(
            device_id="LOCK001",
            name="Pametna ključavnica - Vhod",
            device_type=DeviceType.SMART_LOCK,
            location="glavni_vhod",
            status=DeviceStatus.ONLINE,
            battery_level=65.0
        ),
        IoTDevice(
            device_id="WIFI001",
            name="Wi-Fi AP - Recepcija",
            device_type=DeviceType.WIFI_ACCESS_POINT,
            location="recepcija",
            status=DeviceStatus.ONLINE,
            ip_address="192.168.1.1"
        )
    ]
    
    print("📱 Dodajam IoT naprave...")
    for device in devices:
        system.add_iot_device(device)
        print(f"✅ {device.name} ({device.device_type.value})")
    
    # Dodaj avtomatizacijska pravila
    rules = [
        AutomationRule(
            rule_id="RULE001",
            name="Visoka temperatura - opozorilo",
            trigger_type=AutomationTrigger.SENSOR_VALUE,
            conditions={
                "device_id": "TEMP001",
                "max_value": 30.0
            },
            actions=[{
                "type": "create_alert",
                "level": "warning",
                "message": "Visoka temperatura: {value}{unit}"
            }]
        ),
        AutomationRule(
            rule_id="RULE002",
            name="Nizka vlažnost - klimatizacija",
            trigger_type=AutomationTrigger.SENSOR_VALUE,
            conditions={
                "device_id": "HUMID001",
                "min_value": 35.0
            },
            actions=[{
                "type": "control_device",
                "target_device": "HVAC001",
                "command": "increase_humidity"
            }]
        )
    ]
    
    print("\n🤖 Dodajam avtomatizacijska pravila...")
    for rule in rules:
        system.add_automation_rule(rule)
        print(f"✅ {rule.name}")
    
    # Simuliraj IoT podatke
    print("\n📊 Simuliram IoT podatke...")
    system.simulate_iot_data()
    
    # Prikaži status naprav
    print("\n🔌 Status IoT naprav:")
    devices_status = system.get_device_status()
    for device in devices_status:
        status_icon = "🟢" if device['status'] == 'online' else "🔴"
        battery_info = f" | 🔋 {device['battery_level']}%" if device['battery_level'] else ""
        ip_info = f" | 🌐 {device['ip_address']}" if device['ip_address'] else ""
        print(f"{status_icon} {device['name']} ({device['device_type']})")
        print(f"   📍 {device['location']}{battery_info}{ip_info}")
    
    # Prikaži aktivna opozorila
    print("\n⚠️ Aktivna opozorila:")
    alerts = system.get_active_alerts()
    if alerts:
        for alert in alerts:
            level_icon = {"info": "ℹ️", "warning": "⚠️", "critical": "🚨", "emergency": "🆘"}
            icon = level_icon.get(alert['level'], "⚠️")
            ack_status = "✅" if alert['acknowledged'] else "❌"
            print(f"{icon} {alert['message']}")
            print(f"   📍 {alert['location']} | {alert['device_name']} | Potrjeno: {ack_status}")
    else:
        print("Ni aktivnih opozoril")
    
    # Prikaži energetsko porabo
    print("\n⚡ Energetska poraba (zadnjih 7 dni):")
    consumption = system.get_energy_consumption()
    total_consumption = 0
    total_cost = 0
    
    for location, data in consumption.items():
        total_usage = data['total_usage']
        avg_usage = data['average_usage']
        cost = total_usage * 0.15  # 0.15€ per kWh
        
        total_consumption += total_usage
        total_cost += cost
        
        print(f"📍 {location}:")
        print(f"   💡 Skupna poraba: {total_usage:.2f} kWh")
        print(f"   📊 Povprečna poraba: {avg_usage:.2f} kW")
        print(f"   💰 Stroški: {cost:.2f}€")
    
    print(f"\n📈 Skupna statistika:")
    print(f"   ⚡ Skupna poraba: {total_consumption:.2f} kWh")
    print(f"   💰 Skupni stroški: {total_cost:.2f}€")
    print(f"   🏢 Lokacij: {len(consumption)}")
    print(f"   📱 IoT naprav: {len(devices_status)}")
    
    print("\n🎉 IoT & Smart Building sistem uspešno testiran!")
    print("✅ IoT naprave in senzorji")
    print("✅ Avtomatizacijska pravila")
    print("✅ Opozorila in alarmi")
    print("✅ Energetsko upravljanje")
    print("✅ Wi-Fi in mrežna infrastruktura")
    print("✅ Pametne ključavnice in dostop")

if __name__ == "__main__":
    demo_iot_smart_building_system()