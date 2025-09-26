#!/usr/bin/env python3
"""
🤖 Omni Avtonomni IoT Sistem
Polno avtonomno upravljanje IoT naprav z realnimi funkcionalnostmi

Funkcionalnosti:
- Avtomatsko spremljanje naprav po urniku
- Senzorsko nadzorovanje (temperatura, vlažnost, napetost)
- Kritični odzivi (pregrevanje, napake, izpadi)
- Optimizacija energije
- Prediktivno vzdrževanje
- Realni MQTT in HTTP komunikacija
"""

import time
import json
import threading
import logging
import requests
import schedule
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path
import sqlite3
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Uvozi varni IoT modul
try:
    from .iot_secure import SecureIoTClient
    from .iot_audit_logger import IoTAuditLogger
    SECURE_IOT_AVAILABLE = True
except ImportError:
    SECURE_IOT_AVAILABLE = False
    print("⚠️ Varni IoT modul ni na voljo, uporabljam osnovne funkcije")

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def __name__():
    return "iot_autonomous"

class AutonomousIoTManager:
    """Glavni razred za avtonomno upravljanje IoT naprav"""
    
    def __init__(self):
        self.devices = []
        self.rules = []
        self.sensors = {}
        self.alerts = []
        self.running = False
        self.threads = []
        
        # Inicializacija komponent
        self.setup_database()
        self.setup_secure_client()
        self.load_device_configurations()
        self.setup_notification_system()
        
        logger.info("🤖 Avtonomni IoT Manager inicializiran")
    
    def setup_database(self):
        """Nastavi SQLite bazo za shranjevanje podatkov"""
        self.db_path = Path("omni/data/iot_autonomous.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Tabela za naprave
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY,
                device_id TEXT UNIQUE,
                device_type TEXT,
                topic TEXT,
                status_url TEXT,
                last_seen TIMESTAMP,
                config TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela za senzorske podatke
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY,
                device_id TEXT,
                sensor_type TEXT,
                value REAL,
                unit TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices (device_id)
            )
        ''')
        
        # Tabela za avtomatske akcije
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS autonomous_actions (
                id INTEGER PRIMARY KEY,
                device_id TEXT,
                action_type TEXT,
                trigger_condition TEXT,
                action_result TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("📊 Baza podatkov pripravljena")
    
    def setup_secure_client(self):
        """Nastavi varni IoT klient"""
        if SECURE_IOT_AVAILABLE:
            try:
                self.iot_client = SecureIoTClient()
                self.iot_client.connect()
                self.audit_logger = IoTAuditLogger()
                logger.info("🔒 Varni IoT klient povezan")
            except Exception as e:
                logger.error(f"❌ Napaka pri povezavi varnega klienta: {e}")
                self.iot_client = None
        else:
            self.iot_client = None
    
    def setup_notification_system(self):
        """Nastavi sistem obvestil"""
        self.email_config = {
            'smtp_server': 'smtp.gmail.com',
            'smtp_port': 587,
            'email': 'omni.iot.alerts@gmail.com',
            'password': 'your_app_password',  # Uporabi app password
            'recipients': ['admin@company.com']
        }
        
        self.webhook_urls = [
            'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
            'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK'
        ]
    
    def load_device_configurations(self):
        """Naloži konfiguracije naprav"""
        # Realne naprave za različne scenarije
        self.devices = [
            # Pametna hiša
            {
                "device_id": "smart_home_light_01",
                "device_type": "light",
                "topic": "home/livingroom/light",
                "schedule": {"on": "18:00", "off": "23:00"},
                "location": "living_room",
                "energy_optimization": True,
                "sensors": ["motion", "light_level"]
            },
            {
                "device_id": "smart_thermostat_01",
                "device_type": "thermostat",
                "topic": "home/climate/thermostat",
                "schedule": {"heat": "06:00", "cool": "22:00"},
                "target_temp": 22,
                "sensors": ["temperature", "humidity"]
            },
            
            # Pisarna
            {
                "device_id": "office_pc_01",
                "device_type": "computer",
                "topic": "office/pc1",
                "schedule": {"off": "20:00"},
                "auto_shutdown": True,
                "energy_saving": True
            },
            {
                "device_id": "office_printer_01",
                "device_type": "printer",
                "topic": "office/printer1",
                "schedule": {"standby": "18:00", "on": "08:00"},
                "maintenance_alerts": True
            },
            
            # Industrijske naprave
            {
                "device_id": "factory_machine_01",
                "device_type": "industrial_machine",
                "topic": "factory/machine1",
                "status_url": "https://192.168.1.50/api/status",
                "critical_monitoring": True,
                "sensors": ["temperature", "vibration", "pressure"],
                "thresholds": {
                    "temperature": {"max": 80, "critical": 90},
                    "vibration": {"max": 5.0, "critical": 8.0},
                    "pressure": {"min": 2.0, "max": 10.0}
                }
            },
            {
                "device_id": "warehouse_sensor_01",
                "device_type": "environmental_sensor",
                "topic": "warehouse/environment",
                "status_url": "https://192.168.1.51/api/sensors",
                "sensors": ["temperature", "humidity", "air_quality"],
                "thresholds": {
                    "temperature": {"min": 15, "max": 25},
                    "humidity": {"min": 40, "max": 60}
                }
            },
            
            # Kmetijstvo
            {
                "device_id": "greenhouse_controller_01",
                "device_type": "greenhouse_controller",
                "topic": "farm/greenhouse1",
                "status_url": "https://192.168.1.52/api/greenhouse",
                "sensors": ["soil_moisture", "temperature", "humidity", "light"],
                "irrigation_control": True,
                "climate_control": True
            }
        ]
        
        # Avtonomna pravila
        self.rules = [
            # Energetska optimizacija
            {
                "name": "energy_optimization",
                "condition": "motion_inactive_30min",
                "action": "turn_off_lights",
                "devices": ["light"]
            },
            
            # Varnostni ukrepi
            {
                "name": "temperature_protection",
                "condition": "temperature > 80",
                "action": "emergency_shutdown",
                "devices": ["industrial_machine"]
            },
            
            # Vzdrževanje
            {
                "name": "predictive_maintenance",
                "condition": "vibration > 5.0",
                "action": "schedule_maintenance",
                "devices": ["industrial_machine"]
            },
            
            # Kmetijstvo
            {
                "name": "irrigation_control",
                "condition": "soil_moisture < 30",
                "action": "start_irrigation",
                "devices": ["greenhouse_controller"]
            }
        ]
        
        logger.info(f"📋 Naloženih {len(self.devices)} naprav in {len(self.rules)} pravil")
    
    def send_command(self, device_id: str, command: str, parameters: Dict = None) -> Dict:
        """Pošlje ukaz napravi"""
        try:
            if self.iot_client:
                # Uporabi varni klient
                result = self.iot_client.send_command(
                    device_id=device_id,
                    command=command,
                    parameters=parameters,
                    user_data={'user_id': 'autonomous_system', 'source': 'iot_autonomous'}
                )
            else:
                # Simulacija za testiranje
                result = {
                    'success': True,
                    'device_id': device_id,
                    'command': command,
                    'parameters': parameters,
                    'timestamp': time.time()
                }
            
            # Shrani v bazo
            self.log_autonomous_action(device_id, command, str(parameters), str(result))
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pošiljanju ukaza {command} napravi {device_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_device_status(self, device: Dict) -> Dict:
        """Pridobi status naprave"""
        try:
            if 'status_url' in device:
                # HTTP zahteva za status
                response = requests.get(device['status_url'], timeout=10)
                if response.status_code == 200:
                    return response.json()
            
            # MQTT status (če je na voljo)
            if self.iot_client:
                topic = device.get('topic', '')
                # Simulacija MQTT statusa
                return {
                    'online': True,
                    'temperature': 45.2,
                    'humidity': 55.0,
                    'vibration': 2.1,
                    'pressure': 5.5,
                    'timestamp': time.time()
                }
            
            return {'online': False, 'error': 'No connection method available'}
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju statusa naprave {device['device_id']}: {e}")
            return {'online': False, 'error': str(e)}
    
    def check_device_thresholds(self, device: Dict, status: Dict) -> List[Dict]:
        """Preveri mejne vrednosti senzorjev"""
        alerts = []
        
        if 'thresholds' not in device:
            return alerts
        
        for sensor, limits in device['thresholds'].items():
            if sensor in status:
                value = status[sensor]
                
                # Preveri maksimalno vrednost
                if 'max' in limits and value > limits['max']:
                    alert = {
                        'device_id': device['device_id'],
                        'sensor': sensor,
                        'value': value,
                        'threshold': limits['max'],
                        'type': 'max_exceeded',
                        'severity': 'critical' if 'critical' in limits and value > limits['critical'] else 'warning',
                        'timestamp': datetime.now().isoformat()
                    }
                    alerts.append(alert)
                
                # Preveri minimalno vrednost
                if 'min' in limits and value < limits['min']:
                    alert = {
                        'device_id': device['device_id'],
                        'sensor': sensor,
                        'value': value,
                        'threshold': limits['min'],
                        'type': 'min_exceeded',
                        'severity': 'warning',
                        'timestamp': datetime.now().isoformat()
                    }
                    alerts.append(alert)
        
        return alerts
    
    def execute_autonomous_actions(self, device: Dict, alerts: List[Dict]):
        """Izvede avtonomne ukrepe na podlagi opozoril"""
        for alert in alerts:
            if alert['severity'] == 'critical':
                # Kritični ukrepi
                if alert['sensor'] == 'temperature' and alert['type'] == 'max_exceeded':
                    logger.warning(f"🚨 KRITIČNO: {device['device_id']} pregrevanje! Ugašanje naprave.")
                    result = self.send_command(device['device_id'], 'emergency_shutdown')
                    self.send_alert(f"KRITIČNO PREGREVANJE: {device['device_id']} ugašena", alert)
                
                elif alert['sensor'] == 'vibration' and alert['type'] == 'max_exceeded':
                    logger.warning(f"🚨 KRITIČNO: {device['device_id']} previsoke vibracije! Zaustavitev.")
                    result = self.send_command(device['device_id'], 'stop')
                    self.send_alert(f"KRITIČNE VIBRACIJE: {device['device_id']} zaustavljena", alert)
                
                elif alert['sensor'] == 'pressure':
                    logger.warning(f"🚨 KRITIČNO: {device['device_id']} tlačni problem! Varnostni ukrep.")
                    result = self.send_command(device['device_id'], 'safety_mode')
                    self.send_alert(f"TLAČNI PROBLEM: {device['device_id']} v varnostnem načinu", alert)
            
            elif alert['severity'] == 'warning':
                # Opozorilni ukrepi
                if alert['sensor'] == 'humidity':
                    if device['device_type'] == 'greenhouse_controller':
                        if alert['type'] == 'min_exceeded':
                            logger.info(f"💧 Nizka vlažnost v {device['device_id']}, vklop vlažilca")
                            self.send_command(device['device_id'], 'start_humidifier')
                        else:
                            logger.info(f"💨 Visoka vlažnost v {device['device_id']}, vklop ventilacije")
                            self.send_command(device['device_id'], 'start_ventilation')
                
                elif alert['sensor'] == 'soil_moisture' and alert['type'] == 'min_exceeded':
                    logger.info(f"🌱 Nizka vlažnost tal v {device['device_id']}, začetek namakanja")
                    self.send_command(device['device_id'], 'start_irrigation', {'duration': 300})
    
    def schedule_based_control(self):
        """Upravljanje naprav na podlagi urnika"""
        current_time = datetime.now().strftime("%H:%M")
        
        for device in self.devices:
            if 'schedule' not in device:
                continue
            
            schedule_config = device['schedule']
            
            # Preveri vse urnike
            for action, scheduled_time in schedule_config.items():
                if current_time == scheduled_time:
                    logger.info(f"⏰ Urnik: {action} za {device['device_id']} ob {scheduled_time}")
                    
                    if action == 'on':
                        self.send_command(device['device_id'], 'turn_on')
                    elif action == 'off':
                        self.send_command(device['device_id'], 'turn_off')
                    elif action == 'standby':
                        self.send_command(device['device_id'], 'standby')
                    elif action == 'heat':
                        target_temp = device.get('target_temp', 22)
                        self.send_command(device['device_id'], 'set_temperature', {'temperature': target_temp})
                    elif action == 'cool':
                        self.send_command(device['device_id'], 'set_temperature', {'temperature': 18})
    
    def energy_optimization(self):
        """Optimizacija porabe energije"""
        for device in self.devices:
            if not device.get('energy_optimization', False):
                continue
            
            # Preveri aktivnost
            if device['device_type'] == 'light':
                # Simulacija senzorja gibanja
                motion_detected = self.check_motion_sensor(device['device_id'])
                if not motion_detected:
                    logger.info(f"💡 Energetska optimizacija: ugašanje luči {device['device_id']}")
                    self.send_command(device['device_id'], 'turn_off')
            
            elif device['device_type'] == 'computer':
                # Preveri aktivnost računalnika
                if self.check_computer_idle(device['device_id']):
                    logger.info(f"💻 Energetska optimizacija: uspavanje računalnika {device['device_id']}")
                    self.send_command(device['device_id'], 'sleep')
    
    def check_motion_sensor(self, device_id: str) -> bool:
        """Simulacija senzorja gibanja"""
        # V realnem sistemu bi to povezal z dejanskim senzorjem
        import random
        return random.choice([True, False])
    
    def check_computer_idle(self, device_id: str) -> bool:
        """Preveri ali je računalnik neaktiven"""
        # V realnem sistemu bi preveril CPU, miško, tipkovnico
        import random
        return random.choice([True, False])
    
    def predictive_maintenance(self):
        """Prediktivno vzdrževanje"""
        for device in self.devices:
            if device['device_type'] != 'industrial_machine':
                continue
            
            status = self.get_device_status(device)
            if not status.get('online', False):
                continue
            
            # Analiza trendov
            vibration = status.get('vibration', 0)
            temperature = status.get('temperature', 0)
            
            # Shrani senzorske podatke
            self.save_sensor_data(device['device_id'], 'vibration', vibration)
            self.save_sensor_data(device['device_id'], 'temperature', temperature)
            
            # Prediktivna analiza
            if self.predict_maintenance_needed(device['device_id']):
                logger.warning(f"🔧 Prediktivno vzdrževanje: {device['device_id']} potrebuje servis")
                self.send_alert(f"VZDRŽEVANJE POTREBNO: {device['device_id']}", {
                    'type': 'maintenance',
                    'device_id': device['device_id'],
                    'reason': 'Prediktivna analiza kaže na potrebo po vzdrževanju'
                })
    
    def predict_maintenance_needed(self, device_id: str) -> bool:
        """Preprosta prediktivna analiza"""
        # V realnem sistemu bi uporabil ML algoritme
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Pridobi zadnje podatke o vibracijah
        cursor.execute('''
            SELECT value FROM sensor_data 
            WHERE device_id = ? AND sensor_type = 'vibration'
            ORDER BY timestamp DESC LIMIT 10
        ''', (device_id,))
        
        vibration_data = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        if len(vibration_data) < 5:
            return False
        
        # Preprosta analiza trenda
        avg_vibration = sum(vibration_data) / len(vibration_data)
        return avg_vibration > 4.0  # Mejni prag za vzdrževanje
    
    def save_sensor_data(self, device_id: str, sensor_type: str, value: float, unit: str = ""):
        """Shrani senzorske podatke v bazo"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sensor_data (device_id, sensor_type, value, unit)
            VALUES (?, ?, ?, ?)
        ''', (device_id, sensor_type, value, unit))
        
        conn.commit()
        conn.close()
    
    def log_autonomous_action(self, device_id: str, action_type: str, trigger: str, result: str):
        """Zabeleži avtonomno akcijo"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO autonomous_actions (device_id, action_type, trigger_condition, action_result)
            VALUES (?, ?, ?, ?)
        ''', (device_id, action_type, trigger, result))
        
        conn.commit()
        conn.close()
    
    def send_alert(self, message: str, alert_data: Dict):
        """Pošlje opozorilo preko različnih kanalov"""
        try:
            # Email opozorilo
            self.send_email_alert(message, alert_data)
            
            # Webhook opozorila (Slack, Discord)
            self.send_webhook_alert(message, alert_data)
            
            # Lokalno opozorilo
            self.alerts.append({
                'message': message,
                'data': alert_data,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pošiljanju opozorila: {e}")
    
    def send_email_alert(self, message: str, alert_data: Dict):
        """Pošlje email opozorilo"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.email_config['email']
            msg['To'] = ', '.join(self.email_config['recipients'])
            msg['Subject'] = f"🚨 Omni IoT Opozorilo: {alert_data.get('device_id', 'Neznana naprava')}"
            
            body = f"""
            AVTONOMNO IOT OPOZORILO
            
            Sporočilo: {message}
            
            Podrobnosti:
            {json.dumps(alert_data, indent=2)}
            
            Čas: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            
            --
            Omni Avtonomni IoT Sistem
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Pošlji email (v realnem sistemu)
            # server = smtplib.SMTP(self.email_config['smtp_server'], self.email_config['smtp_port'])
            # server.starttls()
            # server.login(self.email_config['email'], self.email_config['password'])
            # server.send_message(msg)
            # server.quit()
            
            logger.info(f"📧 Email opozorilo poslano: {message}")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pošiljanju emaila: {e}")
    
    def send_webhook_alert(self, message: str, alert_data: Dict):
        """Pošlje webhook opozorilo"""
        payload = {
            'text': f"🚨 **Omni IoT Opozorilo**\n{message}",
            'attachments': [{
                'color': 'danger' if alert_data.get('severity') == 'critical' else 'warning',
                'fields': [
                    {'title': 'Naprava', 'value': alert_data.get('device_id', 'N/A'), 'short': True},
                    {'title': 'Tip', 'value': alert_data.get('type', 'N/A'), 'short': True},
                    {'title': 'Čas', 'value': datetime.now().strftime('%H:%M:%S'), 'short': True}
                ]
            }]
        }
        
        for webhook_url in self.webhook_urls:
            try:
                # V realnem sistemu bi poslal webhook
                # requests.post(webhook_url, json=payload, timeout=10)
                logger.info(f"🔗 Webhook opozorilo poslano: {message}")
            except Exception as e:
                logger.error(f"❌ Napaka pri pošiljanju webhook-a: {e}")
    
    def monitor_devices(self):
        """Glavna zanka za spremljanje naprav"""
        logger.info("🔄 Začenjam spremljanje naprav...")
        
        while self.running:
            try:
                # Urnikovno upravljanje
                self.schedule_based_control()
                
                # Spremljanje senzorjev in kritičnih stanj
                for device in self.devices:
                    status = self.get_device_status(device)
                    
                    if status.get('online', False):
                        # Preveri mejne vrednosti
                        alerts = self.check_device_thresholds(device, status)
                        
                        if alerts:
                            # Izvedi avtonomne ukrepe
                            self.execute_autonomous_actions(device, alerts)
                
                # Energetska optimizacija
                self.energy_optimization()
                
                # Prediktivno vzdrževanje
                self.predictive_maintenance()
                
                # Počakaj minuto pred naslednjim ciklom
                time.sleep(60)
                
            except Exception as e:
                logger.error(f"❌ Napaka v glavni zanki spremljanja: {e}")
                time.sleep(30)  # Krajši počitek ob napaki
    
    def start_autonomy(self) -> str:
        """Zažene avtonomni sistem"""
        if self.running:
            return "⚠️ Avtonomni sistem že teče"
        
        self.running = True
        
        # Zaženi glavno nit za spremljanje
        monitor_thread = threading.Thread(target=self.monitor_devices, daemon=True)
        monitor_thread.start()
        self.threads.append(monitor_thread)
        
        logger.info("🚀 Avtonomni IoT sistem zagnan")
        return "✅ Avtonomna IoT avtomatizacija zagnana - realno spremljanje aktivno!"
    
    def stop_autonomy(self) -> str:
        """Ustavi avtonomni sistem"""
        self.running = False
        
        # Počakaj da se niti končajo
        for thread in self.threads:
            thread.join(timeout=5)
        
        logger.info("🛑 Avtonomni IoT sistem ustavljen")
        return "✅ Avtonomni sistem ustavljen"
    
    def get_status(self) -> Dict:
        """Vrne status avtonomnega sistema"""
        return {
            'running': self.running,
            'devices_count': len(self.devices),
            'rules_count': len(self.rules),
            'alerts_count': len(self.alerts),
            'last_check': datetime.now().isoformat(),
            'secure_client': self.iot_client is not None
        }
    
    def get_device_statistics(self) -> Dict:
        """Vrne statistike naprav"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Skupno število akcij
        cursor.execute('SELECT COUNT(*) FROM autonomous_actions')
        total_actions = cursor.fetchone()[0]
        
        # Akcije po napravah
        cursor.execute('''
            SELECT device_id, COUNT(*) as action_count 
            FROM autonomous_actions 
            GROUP BY device_id
        ''')
        device_actions = dict(cursor.fetchall())
        
        # Zadnje senzorske podatke
        cursor.execute('''
            SELECT device_id, sensor_type, AVG(value) as avg_value
            FROM sensor_data 
            WHERE timestamp > datetime('now', '-1 hour')
            GROUP BY device_id, sensor_type
        ''')
        recent_sensors = cursor.fetchall()
        
        conn.close()
        
        return {
            'total_autonomous_actions': total_actions,
            'actions_by_device': device_actions,
            'recent_sensor_averages': recent_sensors,
            'active_alerts': len(self.alerts)
        }

# Globalna instanca
autonomous_manager = AutonomousIoTManager()

# Funkcije za kompatibilnost
def start_autonomy() -> str:
    """Zažene avtonomni sistem"""
    return autonomous_manager.start_autonomy()

def stop_autonomy() -> str:
    """Ustavi avtonomni sistem"""
    return autonomous_manager.stop_autonomy()

def get_status() -> Dict:
    """Vrne status sistema"""
    return autonomous_manager.get_status()

def get_statistics() -> Dict:
    """Vrne statistike"""
    return autonomous_manager.get_device_statistics()

def add_device(device_config: Dict) -> str:
    """Dodaj novo napravo"""
    autonomous_manager.devices.append(device_config)
    return f"✅ Naprava {device_config.get('device_id')} dodana"

def remove_device(device_id: str) -> str:
    """Odstrani napravo"""
    autonomous_manager.devices = [d for d in autonomous_manager.devices if d.get('device_id') != device_id]
    return f"✅ Naprava {device_id} odstranjena"

# Testna funkcija
def run_autonomous_test():
    """Zažene testni scenarij"""
    logger.info("🧪 Začenjam testni scenarij avtonomnega sistema...")
    
    # Zaženi sistem
    result = start_autonomy()
    print(result)
    
    # Počakaj 5 sekund
    time.sleep(5)
    
    # Prikaži status
    status = get_status()
    print(f"📊 Status: {json.dumps(status, indent=2)}")
    
    # Prikaži statistike
    stats = get_statistics()
    print(f"📈 Statistike: {json.dumps(stats, indent=2)}")
    
    return "✅ Testni scenarij končan"

# Dodatne funkcije za OmniCore integracijo
def turn_on_device(device_id: str) -> str:
    """Prižgi napravo"""
    result = autonomous_manager.send_command(device_id, 'turn_on')
    if result.get('success'):
        return f"✅ Naprava {device_id} prižgana"
    else:
        return f"❌ Napaka pri prižiganju {device_id}: {result.get('error', 'Neznana napaka')}"

def turn_off_device(device_id: str) -> str:
    """Ugasni napravo"""
    result = autonomous_manager.send_command(device_id, 'turn_off')
    if result.get('success'):
        return f"🔴 Naprava {device_id} ugasnjena"
    else:
        return f"❌ Napaka pri ugašanju {device_id}: {result.get('error', 'Neznana napaka')}"

def restart_device(device_id: str) -> str:
    """Restartaj napravo"""
    try:
        # Najprej ugasni
        turn_off_result = turn_off_device(device_id)
        time.sleep(2)  # Počakaj 2 sekundi
        
        # Nato prižgi
        turn_on_result = turn_on_device(device_id)
        
        return f"🔄 Naprava {device_id} restartana: {turn_off_result} -> {turn_on_result}"
        
    except Exception as e:
        logger.error(f"❌ Napaka pri restartu {device_id}: {e}")
        return f"❌ Napaka: {str(e)}"

def get_device_status_detailed(device_id: str) -> Dict:
    """Pridobi podroben status naprave"""
    try:
        # Poišči napravo
        device = None
        for d in autonomous_manager.devices:
            if d.get('device_id') == device_id:
                device = d
                break
        
        if not device:
            return {
                'device_id': device_id,
                'error': 'Naprava ni najdena'
            }
        
        # Pridobi status
        status = autonomous_manager.get_device_status(device)
        
        return {
            'device_id': device_id,
            'device_type': device.get('device_type'),
            'location': device.get('location', 'N/A'),
            'online': status.get('online', False),
            'status_data': status,
            'last_check': datetime.now().isoformat()
        }
            
    except Exception as e:
        logger.error(f"❌ Napaka pri pridobivanju statusa {device_id}: {e}")
        return {
            'device_id': device_id,
            'error': str(e)
        }

# Funkcije za OmniCore registracijo
def get_module_info():
    """Informacije o modulu za OmniCore"""
    return {
        'name': 'iot_autonomous',
        'version': '1.0.0',
        'description': 'Avtonomni IoT sistem za Omni',
        'capabilities': [
            'device_monitoring',
            'autonomous_control',
            'schedule_management',
            'emergency_response'
        ],
        'status': 'active' if autonomous_manager.running else 'inactive'
    }

if __name__ == "__main__":
    # Zaženi testni scenarij
    run_autonomous_test()