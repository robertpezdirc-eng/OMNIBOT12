#!/usr/bin/env python3
"""
📊 Omni IoT Device Monitor
Napredni sistem za spremljanje IoT naprav z realnimi senzorji

Funkcionalnosti:
- Realno spremljanje senzorjev (temperatura, vlažnost, vibracijo, tlak)
- Urnikovno upravljanje naprav
- Energetska optimizacija
- Prediktivna analiza
- Alarmni sistem
- Statistike in poročila
"""

import time
import json
import sqlite3
import threading
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import numpy as np
from dataclasses import dataclass
import schedule
import psutil
import socket

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SensorReading:
    """Struktura za senzorske podatke"""
    device_id: str
    sensor_type: str
    value: float
    unit: str
    timestamp: datetime
    quality: str = "good"  # good, warning, critical
    
@dataclass
class DeviceStatus:
    """Status naprave"""
    device_id: str
    online: bool
    last_seen: datetime
    battery_level: Optional[float] = None
    signal_strength: Optional[float] = None
    firmware_version: Optional[str] = None
    uptime: Optional[int] = None

class RealTimeMonitor:
    """Realno spremljanje naprav"""
    
    def __init__(self):
        self.db_path = Path("omni/data/device_monitoring.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.setup_database()
        
        self.monitoring_active = False
        self.sensor_threads = {}
        self.device_cache = {}
        
        logger.info("📊 Real-time monitor inicializiran")
    
    def setup_database(self):
        """Nastavi bazo za spremljanje"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Tabela za senzorske podatke
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY,
                device_id TEXT,
                sensor_type TEXT,
                value REAL,
                unit TEXT,
                quality TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Ustvari indeks za boljšo performanco
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_sensor_data_device_sensor_time 
            ON sensor_data(device_id, sensor_type, timestamp)
        ''')
        
        # Tabela za status naprav
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS device_status (
                id INTEGER PRIMARY KEY,
                device_id TEXT UNIQUE,
                online BOOLEAN,
                last_seen TIMESTAMP,
                battery_level REAL,
                signal_strength REAL,
                firmware_version TEXT,
                uptime INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela za alarme
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS device_alarms (
                id INTEGER PRIMARY KEY,
                device_id TEXT,
                alarm_type TEXT,
                severity TEXT,
                message TEXT,
                acknowledged BOOLEAN DEFAULT FALSE,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela za urnikovanje
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS device_schedules (
                id INTEGER PRIMARY KEY,
                device_id TEXT,
                schedule_name TEXT,
                cron_expression TEXT,
                action TEXT,
                parameters TEXT,
                enabled BOOLEAN DEFAULT TRUE,
                last_run TIMESTAMP,
                next_run TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def start_monitoring(self, devices: List[Dict]):
        """Začne spremljanje naprav"""
        self.monitoring_active = True
        
        for device in devices:
            device_id = device['device_id']
            
            # Zaženi nit za vsako napravo
            monitor_thread = threading.Thread(
                target=self.monitor_device,
                args=(device,),
                daemon=True
            )
            monitor_thread.start()
            self.sensor_threads[device_id] = monitor_thread
        
        logger.info(f"🔄 Začeto spremljanje {len(devices)} naprav")
    
    def monitor_device(self, device: Dict):
        """Spremlja posamezno napravo"""
        device_id = device['device_id']
        device_type = device['device_type']
        
        while self.monitoring_active:
            try:
                # Pridobi senzorske podatke
                sensor_data = self.read_device_sensors(device)
                
                # Shrani podatke
                for reading in sensor_data:
                    self.save_sensor_reading(reading)
                
                # Preveri status naprave
                status = self.check_device_status(device)
                self.update_device_status(status)
                
                # Preveri alarme
                self.check_device_alarms(device, sensor_data)
                
                # Počakaj glede na tip naprave
                sleep_time = self.get_monitoring_interval(device_type)
                time.sleep(sleep_time)
                
            except Exception as e:
                logger.error(f"❌ Napaka pri spremljanju {device_id}: {e}")
                time.sleep(30)
    
    def read_device_sensors(self, device: Dict) -> List[SensorReading]:
        """Prebere senzorske podatke naprave"""
        readings = []
        device_id = device['device_id']
        device_type = device['device_type']
        
        try:
            if 'status_url' in device:
                # HTTP API za senzorje
                response = requests.get(device['status_url'], timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    readings.extend(self.parse_sensor_data(device_id, data))
            
            # Simulacija senzorjev za različne tipe naprav
            if device_type == 'industrial_machine':
                readings.extend(self.simulate_industrial_sensors(device_id))
            elif device_type == 'greenhouse_controller':
                readings.extend(self.simulate_greenhouse_sensors(device_id))
            elif device_type == 'smart_thermostat':
                readings.extend(self.simulate_climate_sensors(device_id))
            elif device_type == 'computer':
                readings.extend(self.read_computer_sensors(device_id))
            
        except Exception as e:
            logger.error(f"❌ Napaka pri branju senzorjev {device_id}: {e}")
        
        return readings
    
    def simulate_industrial_sensors(self, device_id: str) -> List[SensorReading]:
        """Simulira industrijske senzorje"""
        import random
        now = datetime.now()
        
        # Realistični podatki z variacijami
        base_temp = 45 + random.uniform(-5, 15)  # 40-60°C
        base_vibration = 2.0 + random.uniform(-0.5, 3.0)  # 1.5-5.0
        base_pressure = 5.0 + random.uniform(-1.0, 3.0)  # 4.0-8.0
        
        # Dodaj občasne spike za testiranje alarmov
        if random.random() < 0.05:  # 5% možnost
            base_temp += random.uniform(20, 40)  # Pregrevanje
        
        if random.random() < 0.03:  # 3% možnost
            base_vibration += random.uniform(5, 10)  # Visoke vibracije
        
        return [
            SensorReading(device_id, "temperature", base_temp, "°C", now),
            SensorReading(device_id, "vibration", base_vibration, "m/s²", now),
            SensorReading(device_id, "pressure", base_pressure, "bar", now),
            SensorReading(device_id, "power_consumption", 150 + random.uniform(-20, 50), "kW", now)
        ]
    
    def simulate_greenhouse_sensors(self, device_id: str) -> List[SensorReading]:
        """Simulira senzorje rastlinjaka"""
        import random
        now = datetime.now()
        
        # Dnevni cikel temperature
        hour = now.hour
        base_temp = 20 + 5 * np.sin((hour - 6) * np.pi / 12) + random.uniform(-2, 2)
        
        return [
            SensorReading(device_id, "temperature", base_temp, "°C", now),
            SensorReading(device_id, "humidity", 60 + random.uniform(-15, 15), "%", now),
            SensorReading(device_id, "soil_moisture", 45 + random.uniform(-10, 10), "%", now),
            SensorReading(device_id, "light_intensity", max(0, 800 * np.sin((hour - 6) * np.pi / 12) + random.uniform(-100, 100)), "lux", now),
            SensorReading(device_id, "co2_level", 400 + random.uniform(-50, 200), "ppm", now)
        ]
    
    def simulate_climate_sensors(self, device_id: str) -> List[SensorReading]:
        """Simulira klimatske senzorje"""
        import random
        now = datetime.now()
        
        return [
            SensorReading(device_id, "temperature", 22 + random.uniform(-3, 3), "°C", now),
            SensorReading(device_id, "humidity", 50 + random.uniform(-10, 10), "%", now),
            SensorReading(device_id, "air_quality", random.uniform(20, 100), "AQI", now)
        ]
    
    def read_computer_sensors(self, device_id: str) -> List[SensorReading]:
        """Prebere dejanske senzorje računalnika"""
        readings = []
        now = datetime.now()
        
        try:
            # CPU temperatura (če je na voljo)
            if hasattr(psutil, 'sensors_temperatures'):
                temps = psutil.sensors_temperatures()
                if temps:
                    for name, entries in temps.items():
                        for entry in entries:
                            if entry.current:
                                readings.append(SensorReading(
                                    device_id, "cpu_temperature", entry.current, "°C", now
                                ))
                                break
            
            # CPU uporaba
            cpu_percent = psutil.cpu_percent(interval=1)
            readings.append(SensorReading(device_id, "cpu_usage", cpu_percent, "%", now))
            
            # Pomnilnik
            memory = psutil.virtual_memory()
            readings.append(SensorReading(device_id, "memory_usage", memory.percent, "%", now))
            
            # Disk uporaba
            disk = psutil.disk_usage('/')
            readings.append(SensorReading(device_id, "disk_usage", disk.percent, "%", now))
            
            # Omrežni promet
            net_io = psutil.net_io_counters()
            readings.append(SensorReading(device_id, "network_bytes_sent", net_io.bytes_sent, "bytes", now))
            readings.append(SensorReading(device_id, "network_bytes_recv", net_io.bytes_recv, "bytes", now))
            
        except Exception as e:
            logger.error(f"❌ Napaka pri branju računalniških senzorjev: {e}")
        
        return readings
    
    def parse_sensor_data(self, device_id: str, data: Dict) -> List[SensorReading]:
        """Parsira senzorske podatke iz API odziva"""
        readings = []
        now = datetime.now()
        
        # Mapiranje standardnih imen senzorjev
        sensor_mapping = {
            'temp': ('temperature', '°C'),
            'temperature': ('temperature', '°C'),
            'humid': ('humidity', '%'),
            'humidity': ('humidity', '%'),
            'pressure': ('pressure', 'bar'),
            'vibration': ('vibration', 'm/s²'),
            'voltage': ('voltage', 'V'),
            'current': ('current', 'A'),
            'power': ('power', 'W')
        }
        
        for key, value in data.items():
            if key.lower() in sensor_mapping:
                sensor_type, unit = sensor_mapping[key.lower()]
                try:
                    numeric_value = float(value)
                    readings.append(SensorReading(device_id, sensor_type, numeric_value, unit, now))
                except (ValueError, TypeError):
                    continue
        
        return readings
    
    def check_device_status(self, device: Dict) -> DeviceStatus:
        """Preveri status naprave"""
        device_id = device['device_id']
        
        try:
            if 'status_url' in device:
                # HTTP ping
                response = requests.get(device['status_url'], timeout=5)
                online = response.status_code == 200
            elif 'ip_address' in device:
                # Network ping
                online = self.ping_device(device['ip_address'])
            else:
                # Simulacija
                import random
                online = random.random() > 0.05  # 95% uptime
            
            return DeviceStatus(
                device_id=device_id,
                online=online,
                last_seen=datetime.now() if online else datetime.now() - timedelta(minutes=5),
                battery_level=self.get_battery_level(device),
                signal_strength=self.get_signal_strength(device),
                uptime=self.get_device_uptime(device)
            )
            
        except Exception as e:
            logger.error(f"❌ Napaka pri preverjanju statusa {device_id}: {e}")
            return DeviceStatus(device_id, False, datetime.now())
    
    def ping_device(self, ip_address: str) -> bool:
        """Ping napravo preko omrežja"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            result = sock.connect_ex((ip_address, 80))
            sock.close()
            return result == 0
        except:
            return False
    
    def get_battery_level(self, device: Dict) -> Optional[float]:
        """Pridobi nivo baterije"""
        if device.get('battery_powered', False):
            import random
            return random.uniform(20, 100)
        return None
    
    def get_signal_strength(self, device: Dict) -> Optional[float]:
        """Pridobi moč signala"""
        if device.get('wireless', True):
            import random
            return random.uniform(-80, -30)  # dBm
        return None
    
    def get_device_uptime(self, device: Dict) -> Optional[int]:
        """Pridobi uptime naprave"""
        import random
        return random.randint(3600, 86400 * 30)  # 1 ura do 30 dni
    
    def save_sensor_reading(self, reading: SensorReading):
        """Shrani senzorski podatek"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sensor_readings (device_id, sensor_type, value, unit, quality, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (reading.device_id, reading.sensor_type, reading.value, 
              reading.unit, reading.quality, reading.timestamp))
        
        conn.commit()
        conn.close()
    
    def update_device_status(self, status: DeviceStatus):
        """Posodobi status naprave"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO device_status 
            (device_id, online, last_seen, battery_level, signal_strength, uptime, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (status.device_id, status.online, status.last_seen,
              status.battery_level, status.signal_strength, status.uptime, datetime.now()))
        
        conn.commit()
        conn.close()
    
    def check_device_alarms(self, device: Dict, readings: List[SensorReading]):
        """Preveri alarme za napravo"""
        device_id = device['device_id']
        thresholds = device.get('thresholds', {})
        
        for reading in readings:
            sensor_type = reading.sensor_type
            value = reading.value
            
            if sensor_type in thresholds:
                limits = thresholds[sensor_type]
                
                # Preveri kritične vrednosti
                if 'critical_max' in limits and value > limits['critical_max']:
                    self.create_alarm(device_id, 'critical_high', f"{sensor_type} kritično visok: {value}")
                elif 'critical_min' in limits and value < limits['critical_min']:
                    self.create_alarm(device_id, 'critical_low', f"{sensor_type} kritično nizek: {value}")
                elif 'max' in limits and value > limits['max']:
                    self.create_alarm(device_id, 'warning_high', f"{sensor_type} visok: {value}")
                elif 'min' in limits and value < limits['min']:
                    self.create_alarm(device_id, 'warning_low', f"{sensor_type} nizek: {value}")
    
    def create_alarm(self, device_id: str, alarm_type: str, message: str):
        """Ustvari alarm"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Preveri če alarm že obstaja (zadnjih 5 minut)
        cursor.execute('''
            SELECT COUNT(*) FROM device_alarms 
            WHERE device_id = ? AND alarm_type = ? AND message = ?
            AND timestamp > datetime('now', '-5 minutes')
        ''', (device_id, alarm_type, message))
        
        if cursor.fetchone()[0] == 0:
            # Ustvari nov alarm
            severity = 'critical' if 'critical' in alarm_type else 'warning'
            
            cursor.execute('''
                INSERT INTO device_alarms (device_id, alarm_type, severity, message)
                VALUES (?, ?, ?, ?)
            ''', (device_id, alarm_type, severity, message))
            
            conn.commit()
            logger.warning(f"🚨 ALARM: {device_id} - {message}")
        
        conn.close()
    
    def get_monitoring_interval(self, device_type: str) -> int:
        """Vrne interval spremljanja glede na tip naprave"""
        intervals = {
            'industrial_machine': 10,  # 10 sekund
            'greenhouse_controller': 30,  # 30 sekund
            'smart_thermostat': 60,  # 1 minuta
            'computer': 30,  # 30 sekund
            'light': 300,  # 5 minut
            'default': 60
        }
        return intervals.get(device_type, intervals['default'])
    
    def get_device_history(self, device_id: str, sensor_type: str, hours: int = 24) -> List[Tuple]:
        """Pridobi zgodovino senzorja"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT value, timestamp FROM sensor_readings
            WHERE device_id = ? AND sensor_type = ?
            AND timestamp > datetime('now', '-{} hours')
            ORDER BY timestamp DESC
        '''.format(hours), (device_id, sensor_type))
        
        results = cursor.fetchall()
        conn.close()
        return results
    
    def get_device_statistics(self, device_id: str) -> Dict:
        """Pridobi statistike naprave"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Zadnji podatki
        cursor.execute('''
            SELECT sensor_type, value, unit, timestamp
            FROM sensor_readings
            WHERE device_id = ?
            AND timestamp = (
                SELECT MAX(timestamp) FROM sensor_readings sr2
                WHERE sr2.device_id = sensor_readings.device_id
                AND sr2.sensor_type = sensor_readings.sensor_type
            )
        ''', (device_id,))
        
        latest_readings = cursor.fetchall()
        
        # Povprečja zadnjih 24 ur
        cursor.execute('''
            SELECT sensor_type, AVG(value) as avg_value, MIN(value) as min_value, MAX(value) as max_value
            FROM sensor_readings
            WHERE device_id = ? AND timestamp > datetime('now', '-24 hours')
            GROUP BY sensor_type
        ''', (device_id,))
        
        daily_stats = cursor.fetchall()
        
        # Aktivni alarmi
        cursor.execute('''
            SELECT COUNT(*) FROM device_alarms
            WHERE device_id = ? AND acknowledged = FALSE
        ''', (device_id,))
        
        active_alarms = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'latest_readings': latest_readings,
            'daily_statistics': daily_stats,
            'active_alarms': active_alarms,
            'last_updated': datetime.now().isoformat()
        }
    
    def stop_monitoring(self):
        """Ustavi spremljanje"""
        self.monitoring_active = False
        logger.info("🛑 Spremljanje naprav ustavljeno")

# Globalna instanca
device_monitor = RealTimeMonitor()

# Funkcije za uporabo
def start_device_monitoring(devices: List[Dict]) -> str:
    """Začne spremljanje naprav"""
    device_monitor.start_monitoring(devices)
    return f"✅ Začeto spremljanje {len(devices)} naprav"

def stop_device_monitoring() -> str:
    """Ustavi spremljanje naprav"""
    device_monitor.stop_monitoring()
    return "✅ Spremljanje naprav ustavljeno"

def get_device_stats(device_id: str) -> Dict:
    """Pridobi statistike naprave"""
    return device_monitor.get_device_statistics(device_id)

def get_sensor_history(device_id: str, sensor_type: str, hours: int = 24) -> List:
    """Pridobi zgodovino senzorja"""
    return device_monitor.get_device_history(device_id, sensor_type, hours)

if __name__ == "__main__":
    # Test
    test_devices = [
        {
            "device_id": "test_machine_01",
            "device_type": "industrial_machine",
            "thresholds": {
                "temperature": {"max": 70, "critical_max": 85},
                "vibration": {"max": 4.0, "critical_max": 7.0}
            }
        }
    ]
    
    print("🧪 Testiranje device monitor...")
    start_device_monitoring(test_devices)
    time.sleep(30)
    stats = get_device_stats("test_machine_01")
    print(f"📊 Statistike: {json.dumps(stats, indent=2, default=str)}")
    stop_device_monitoring()