# omni/modules/iot/iot_monitoring.py
"""
Real-time monitoring sistem za IoT naprave
Omogoča spremljanje stanja, metrik, alarmov in dashboard funkcionalnosti
"""

import json
import os
import threading
import time
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
import logging
from dataclasses import dataclass, asdict
from enum import Enum
import statistics
import queue
import websocket
import requests

# Konfiguracija
MONITORING_DB = "data/monitoring.db"
MONITORING_CONFIG_FILE = "data/monitoring_config.json"
MONITORING_LOG_FILE = "data/logs/monitoring_logs.json"
DASHBOARD_PORT = 8081

class MetricType(Enum):
    DEVICE_STATE = "device_state"
    SENSOR_VALUE = "sensor_value"
    NETWORK_STATUS = "network_status"
    PERFORMANCE = "performance"
    ENERGY_CONSUMPTION = "energy_consumption"
    ERROR_COUNT = "error_count"
    UPTIME = "uptime"
    CUSTOM = "custom"

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlertType(Enum):
    DEVICE_OFFLINE = "device_offline"
    HIGH_TEMPERATURE = "high_temperature"
    LOW_BATTERY = "low_battery"
    NETWORK_ISSUE = "network_issue"
    SENSOR_MALFUNCTION = "sensor_malfunction"
    THRESHOLD_EXCEEDED = "threshold_exceeded"
    CUSTOM = "custom"

@dataclass
class Metric:
    device_id: str
    metric_type: MetricType
    name: str
    value: Any
    unit: str
    timestamp: str
    metadata: Dict[str, Any] = None

@dataclass
class Alert:
    id: str
    device_id: str
    alert_type: AlertType
    level: AlertLevel
    message: str
    timestamp: str
    acknowledged: bool = False
    resolved: bool = False
    metadata: Dict[str, Any] = None

@dataclass
class DeviceStatus:
    device_id: str
    name: str
    status: str  # online, offline, error, maintenance
    last_seen: str
    uptime_seconds: int
    metrics: Dict[str, Any]
    alerts_count: int
    location: str = None
    device_type: str = None

class IoTMonitoringSystem:
    def __init__(self, iot_secure_module=None):
        self.iot_secure = iot_secure_module
        
        # Database connection
        self.db_connection = None
        self.init_database()
        
        # Monitoring data
        self.devices: Dict[str, DeviceStatus] = {}
        self.metrics_queue = queue.Queue()
        self.alerts: Dict[str, Alert] = {}
        self.thresholds: Dict[str, Dict[str, Any]] = {}
        
        # Threading
        self.running = False
        self.monitoring_thread = None
        self.dashboard_thread = None
        
        # WebSocket connections za real-time dashboard
        self.websocket_clients = []
        
        # Nastavi logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Naloži konfiguracijo
        self.load_configuration()
        
        # Zaženi monitoring
        self.start_monitoring()

    def init_database(self):
        """Inicializiraj SQLite bazo za metriko"""
        try:
            os.makedirs(os.path.dirname(MONITORING_DB), exist_ok=True)
            self.db_connection = sqlite3.connect(MONITORING_DB, check_same_thread=False)
            
            # Ustvari tabele
            cursor = self.db_connection.cursor()
            
            # Tabela za metriko
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    value TEXT NOT NULL,
                    unit TEXT,
                    timestamp TEXT NOT NULL,
                    metadata TEXT
                )
            ''')
            
            # Tabela za alarme
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    device_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    acknowledged INTEGER DEFAULT 0,
                    resolved INTEGER DEFAULT 0,
                    metadata TEXT
                )
            ''')
            
            # Tabela za device status
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS device_status (
                    device_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    last_seen TEXT NOT NULL,
                    uptime_seconds INTEGER DEFAULT 0,
                    metrics TEXT,
                    alerts_count INTEGER DEFAULT 0,
                    location TEXT,
                    device_type TEXT
                )
            ''')
            
            # Indeksi za hitrejše poizvedbe
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_device_time ON metrics(device_id, timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_device_level ON alerts(device_id, level)')
            
            self.db_connection.commit()
            self.logger.info("Monitoring baza inicializirana")
            
        except Exception as e:
            self.logger.error(f"Napaka pri inicializaciji baze: {e}")

    def load_configuration(self):
        """Naloži monitoring konfiguracijo"""
        try:
            if os.path.exists(MONITORING_CONFIG_FILE):
                with open(MONITORING_CONFIG_FILE, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    
                self.thresholds = config.get('thresholds', {})
                
                # Naloži device konfiguracije
                devices_config = config.get('devices', {})
                for device_id, device_config in devices_config.items():
                    if device_id not in self.devices:
                        self.devices[device_id] = DeviceStatus(
                            device_id=device_id,
                            name=device_config.get('name', device_id),
                            status='unknown',
                            last_seen=datetime.now().isoformat(),
                            uptime_seconds=0,
                            metrics={},
                            alerts_count=0,
                            location=device_config.get('location'),
                            device_type=device_config.get('type')
                        )
                
                self.logger.info(f"Naložena konfiguracija za {len(self.devices)} naprav")
        except Exception as e:
            self.logger.error(f"Napaka pri nalaganju konfiguracije: {e}")

    def save_configuration(self):
        """Shrani monitoring konfiguracijo"""
        try:
            config = {
                'thresholds': self.thresholds,
                'devices': {}
            }
            
            for device_id, device in self.devices.items():
                config['devices'][device_id] = {
                    'name': device.name,
                    'location': device.location,
                    'type': device.device_type
                }
            
            os.makedirs(os.path.dirname(MONITORING_CONFIG_FILE), exist_ok=True)
            with open(MONITORING_CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
                
            self.logger.info("Monitoring konfiguracija shranjena")
        except Exception as e:
            self.logger.error(f"Napaka pri shranjevanju konfiguracije: {e}")

    # ==================== MONITORING FUNKCIJE ====================
    
    def start_monitoring(self):
        """Zaženi monitoring sistem"""
        if not self.running:
            self.running = True
            self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
            self.monitoring_thread.start()
            
            # Zaženi dashboard server
            self.dashboard_thread = threading.Thread(target=self._start_dashboard_server, daemon=True)
            self.dashboard_thread.start()
            
            self.logger.info("Monitoring sistem zagnan")

    def stop_monitoring(self):
        """Ustavi monitoring sistem"""
        self.running = False
        if self.monitoring_thread:
            self.monitoring_thread.join()
        if self.dashboard_thread:
            self.dashboard_thread.join()
        self.logger.info("Monitoring sistem ustavljen")

    def _monitoring_loop(self):
        """Glavna monitoring zanka"""
        while self.running:
            try:
                # Posodobi device status
                self._update_device_status()
                
                # Processiraj metriko iz queue
                self._process_metrics_queue()
                
                # Preveri alarme
                self._check_alerts()
                
                # Pošlji posodobitve na dashboard
                self._send_dashboard_updates()
                
                time.sleep(5)  # Posodobi vsakih 5 sekund
                
            except Exception as e:
                self.logger.error(f"Napaka v monitoring zanki: {e}")

    def _update_device_status(self):
        """Posodobi status naprav"""
        try:
            for device_id in list(self.devices.keys()):
                device = self.devices[device_id]
                
                # Preveri, ali je naprava online
                if self.iot_secure:
                    try:
                        # Poskusi pridobiti status naprave
                        status_result = self.iot_secure.status(device_id)
                        
                        if isinstance(status_result, dict) and 'error' not in status_result:
                            device.status = 'online'
                            device.last_seen = datetime.now().isoformat()
                            device.uptime_seconds += 5
                        else:
                            # Naprava ni dosegljiva
                            last_seen = datetime.fromisoformat(device.last_seen)
                            if datetime.now() - last_seen > timedelta(minutes=5):
                                device.status = 'offline'
                                device.uptime_seconds = 0
                                
                                # Ustvari alarm za offline napravo
                                self._create_alert(
                                    device_id=device_id,
                                    alert_type=AlertType.DEVICE_OFFLINE,
                                    level=AlertLevel.WARNING,
                                    message=f"Naprava {device.name} ni dosegljiva že več kot 5 minut"
                                )
                    except Exception as e:
                        device.status = 'error'
                        self.logger.error(f"Napaka pri preverjanju statusa naprave {device_id}: {e}")
                
                # Posodobi v bazi
                self._save_device_status(device)
                
        except Exception as e:
            self.logger.error(f"Napaka pri posodabljanju device status: {e}")

    def _process_metrics_queue(self):
        """Processiraj metriko iz queue"""
        try:
            while not self.metrics_queue.empty():
                metric = self.metrics_queue.get_nowait()
                
                # Shrani metriko v bazo
                self._save_metric(metric)
                
                # Posodobi device metrics
                if metric.device_id in self.devices:
                    device = self.devices[metric.device_id]
                    device.metrics[metric.name] = {
                        'value': metric.value,
                        'unit': metric.unit,
                        'timestamp': metric.timestamp
                    }
                
                # Preveri threshold
                self._check_metric_threshold(metric)
                
        except queue.Empty:
            pass
        except Exception as e:
            self.logger.error(f"Napaka pri procesiranju metrik: {e}")

    def _check_alerts(self):
        """Preveri in ustvari alarme"""
        try:
            for device_id, device in self.devices.items():
                # Preveri temperature threshold
                if 'temperature' in device.metrics:
                    temp_value = device.metrics['temperature']['value']
                    if isinstance(temp_value, (int, float)):
                        if temp_value > 80:  # Visoka temperatura
                            self._create_alert(
                                device_id=device_id,
                                alert_type=AlertType.HIGH_TEMPERATURE,
                                level=AlertLevel.ERROR,
                                message=f"Visoka temperatura: {temp_value}°C"
                            )
                
                # Preveri battery level
                if 'battery' in device.metrics:
                    battery_value = device.metrics['battery']['value']
                    if isinstance(battery_value, (int, float)):
                        if battery_value < 20:  # Nizka baterija
                            self._create_alert(
                                device_id=device_id,
                                alert_type=AlertType.LOW_BATTERY,
                                level=AlertLevel.WARNING,
                                message=f"Nizka baterija: {battery_value}%"
                            )
                
        except Exception as e:
            self.logger.error(f"Napaka pri preverjanju alarmov: {e}")

    def _check_metric_threshold(self, metric: Metric):
        """Preveri threshold za metriko"""
        try:
            threshold_key = f"{metric.device_id}.{metric.name}"
            
            if threshold_key in self.thresholds:
                threshold = self.thresholds[threshold_key]
                
                if isinstance(metric.value, (int, float)):
                    if 'max' in threshold and metric.value > threshold['max']:
                        self._create_alert(
                            device_id=metric.device_id,
                            alert_type=AlertType.THRESHOLD_EXCEEDED,
                            level=AlertLevel.WARNING,
                            message=f"{metric.name} presegel maksimum: {metric.value} > {threshold['max']}"
                        )
                    
                    if 'min' in threshold and metric.value < threshold['min']:
                        self._create_alert(
                            device_id=metric.device_id,
                            alert_type=AlertType.THRESHOLD_EXCEEDED,
                            level=AlertLevel.WARNING,
                            message=f"{metric.name} pod minimumom: {metric.value} < {threshold['min']}"
                        )
                        
        except Exception as e:
            self.logger.error(f"Napaka pri preverjanju threshold: {e}")

    # ==================== DATABASE FUNKCIJE ====================
    
    def _save_metric(self, metric: Metric):
        """Shrani metriko v bazo"""
        try:
            cursor = self.db_connection.cursor()
            cursor.execute('''
                INSERT INTO metrics (device_id, metric_type, name, value, unit, timestamp, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                metric.device_id,
                metric.metric_type.value,
                metric.name,
                json.dumps(metric.value),
                metric.unit,
                metric.timestamp,
                json.dumps(metric.metadata) if metric.metadata else None
            ))
            self.db_connection.commit()
        except Exception as e:
            self.logger.error(f"Napaka pri shranjevanju metrike: {e}")

    def _save_device_status(self, device: DeviceStatus):
        """Shrani device status v bazo"""
        try:
            cursor = self.db_connection.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO device_status 
                (device_id, name, status, last_seen, uptime_seconds, metrics, alerts_count, location, device_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                device.device_id,
                device.name,
                device.status,
                device.last_seen,
                device.uptime_seconds,
                json.dumps(device.metrics),
                device.alerts_count,
                device.location,
                device.device_type
            ))
            self.db_connection.commit()
        except Exception as e:
            self.logger.error(f"Napaka pri shranjevanju device status: {e}")

    def _create_alert(self, device_id: str, alert_type: AlertType, level: AlertLevel, message: str):
        """Ustvari alarm"""
        try:
            alert_id = f"{device_id}_{alert_type.value}_{int(time.time())}"
            
            # Preveri, ali podoben alarm že obstaja
            existing_alerts = [a for a in self.alerts.values() 
                             if a.device_id == device_id and a.alert_type == alert_type and not a.resolved]
            
            if existing_alerts:
                return  # Ne ustvari duplikata
            
            alert = Alert(
                id=alert_id,
                device_id=device_id,
                alert_type=alert_type,
                level=level,
                message=message,
                timestamp=datetime.now().isoformat()
            )
            
            self.alerts[alert_id] = alert
            
            # Posodobi alerts count za device
            if device_id in self.devices:
                self.devices[device_id].alerts_count += 1
            
            # Shrani v bazo
            cursor = self.db_connection.cursor()
            cursor.execute('''
                INSERT INTO alerts (id, device_id, alert_type, level, message, timestamp, acknowledged, resolved)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.id,
                alert.device_id,
                alert.alert_type.value,
                alert.level.value,
                alert.message,
                alert.timestamp,
                0,
                0
            ))
            self.db_connection.commit()
            
            self.logger.warning(f"Ustvarjen alarm: {message}")
            
        except Exception as e:
            self.logger.error(f"Napaka pri ustvarjanju alarma: {e}")

    # ==================== JAVNE FUNKCIJE ====================
    
    def add_metric(self, device_id: str, metric_type: str, name: str, value: Any, unit: str = "", metadata: Dict = None):
        """Dodaj metriko"""
        try:
            metric = Metric(
                device_id=device_id,
                metric_type=MetricType(metric_type),
                name=name,
                value=value,
                unit=unit,
                timestamp=datetime.now().isoformat(),
                metadata=metadata
            )
            
            self.metrics_queue.put(metric)
            return True
            
        except Exception as e:
            self.logger.error(f"Napaka pri dodajanju metrike: {e}")
            return False

    def register_device(self, device_id: str, name: str, device_type: str = None, location: str = None):
        """Registriraj novo napravo"""
        try:
            if device_id not in self.devices:
                self.devices[device_id] = DeviceStatus(
                    device_id=device_id,
                    name=name,
                    status='unknown',
                    last_seen=datetime.now().isoformat(),
                    uptime_seconds=0,
                    metrics={},
                    alerts_count=0,
                    location=location,
                    device_type=device_type
                )
                
                self.save_configuration()
                self.logger.info(f"Registrirana nova naprava: {name} ({device_id})")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Napaka pri registraciji naprave: {e}")
            return False

    def set_threshold(self, device_id: str, metric_name: str, min_value: float = None, max_value: float = None):
        """Nastavi threshold za metriko"""
        try:
            threshold_key = f"{device_id}.{metric_name}"
            threshold = {}
            
            if min_value is not None:
                threshold['min'] = min_value
            if max_value is not None:
                threshold['max'] = max_value
                
            self.thresholds[threshold_key] = threshold
            self.save_configuration()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Napaka pri nastavljanju threshold: {e}")
            return False

    def acknowledge_alert(self, alert_id: str) -> bool:
        """Potrdi alarm"""
        try:
            if alert_id in self.alerts:
                self.alerts[alert_id].acknowledged = True
                
                # Posodobi v bazi
                cursor = self.db_connection.cursor()
                cursor.execute('UPDATE alerts SET acknowledged = 1 WHERE id = ?', (alert_id,))
                self.db_connection.commit()
                
                return True
            return False
            
        except Exception as e:
            self.logger.error(f"Napaka pri potrjevanju alarma: {e}")
            return False

    def resolve_alert(self, alert_id: str) -> bool:
        """Razreši alarm"""
        try:
            if alert_id in self.alerts:
                self.alerts[alert_id].resolved = True
                
                # Posodobi v bazi
                cursor = self.db_connection.cursor()
                cursor.execute('UPDATE alerts SET resolved = 1 WHERE id = ?', (alert_id,))
                self.db_connection.commit()
                
                return True
            return False
            
        except Exception as e:
            self.logger.error(f"Napaka pri razreševanju alarma: {e}")
            return False

    # ==================== DASHBOARD FUNKCIJE ====================
    
    def _start_dashboard_server(self):
        """Zaženi dashboard server"""
        try:
            # Tu bi implementirali WebSocket server za real-time dashboard
            # Za zdaj samo simuliramo
            self.logger.info(f"Dashboard server zagnan na portu {DASHBOARD_PORT}")
            
            while self.running:
                time.sleep(10)
                
        except Exception as e:
            self.logger.error(f"Napaka v dashboard serverju: {e}")

    def _send_dashboard_updates(self):
        """Pošlji posodobitve na dashboard"""
        try:
            # Pripravi dashboard data
            dashboard_data = {
                'timestamp': datetime.now().isoformat(),
                'devices': {device_id: asdict(device) for device_id, device in self.devices.items()},
                'alerts': {alert_id: asdict(alert) for alert_id, alert in self.alerts.items() if not alert.resolved},
                'summary': self.get_monitoring_summary()
            }
            
            # Tu bi poslali data preko WebSocket
            # Za zdaj samo logiramo
            # self.logger.debug("Dashboard data posodobljen")
            
        except Exception as e:
            self.logger.error(f"Napaka pri pošiljanju dashboard posodobitev: {e}")

    def get_monitoring_summary(self) -> Dict[str, Any]:
        """Pridobi povzetek monitoringa"""
        try:
            online_devices = [d for d in self.devices.values() if d.status == 'online']
            offline_devices = [d for d in self.devices.values() if d.status == 'offline']
            error_devices = [d for d in self.devices.values() if d.status == 'error']
            
            active_alerts = [a for a in self.alerts.values() if not a.resolved]
            critical_alerts = [a for a in active_alerts if a.level == AlertLevel.CRITICAL]
            
            return {
                'total_devices': len(self.devices),
                'online_devices': len(online_devices),
                'offline_devices': len(offline_devices),
                'error_devices': len(error_devices),
                'total_alerts': len(active_alerts),
                'critical_alerts': len(critical_alerts),
                'uptime_percentage': (len(online_devices) / len(self.devices) * 100) if self.devices else 0,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Napaka pri pridobivanju povzetka: {e}")
            return {}

    def get_device_metrics_history(self, device_id: str, metric_name: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Pridobi zgodovino metrik za napravo"""
        try:
            cursor = self.db_connection.cursor()
            
            since_time = (datetime.now() - timedelta(hours=hours)).isoformat()
            
            cursor.execute('''
                SELECT value, timestamp FROM metrics 
                WHERE device_id = ? AND name = ? AND timestamp > ?
                ORDER BY timestamp ASC
            ''', (device_id, metric_name, since_time))
            
            results = cursor.fetchall()
            
            history = []
            for value_json, timestamp in results:
                try:
                    value = json.loads(value_json)
                    history.append({
                        'value': value,
                        'timestamp': timestamp
                    })
                except:
                    continue
            
            return history
            
        except Exception as e:
            self.logger.error(f"Napaka pri pridobivanju zgodovine metrik: {e}")
            return []

    def get_alerts_history(self, device_id: str = None, hours: int = 24) -> List[Dict[str, Any]]:
        """Pridobi zgodovino alarmov"""
        try:
            cursor = self.db_connection.cursor()
            
            since_time = (datetime.now() - timedelta(hours=hours)).isoformat()
            
            if device_id:
                cursor.execute('''
                    SELECT * FROM alerts 
                    WHERE device_id = ? AND timestamp > ?
                    ORDER BY timestamp DESC
                ''', (device_id, since_time))
            else:
                cursor.execute('''
                    SELECT * FROM alerts 
                    WHERE timestamp > ?
                    ORDER BY timestamp DESC
                ''', (since_time,))
            
            results = cursor.fetchall()
            
            alerts = []
            for row in results:
                alerts.append({
                    'id': row[0],
                    'device_id': row[1],
                    'alert_type': row[2],
                    'level': row[3],
                    'message': row[4],
                    'timestamp': row[5],
                    'acknowledged': bool(row[6]),
                    'resolved': bool(row[7])
                })
            
            return alerts
            
        except Exception as e:
            self.logger.error(f"Napaka pri pridobivanju zgodovine alarmov: {e}")
            return []

# Glavna instanca monitoring sistema
monitoring_system_instance = None

def __name__():
    return "iot_monitoring"

def initialize_monitoring_system(iot_secure_module=None):
    """Inicializiraj monitoring sistem"""
    global monitoring_system_instance
    if monitoring_system_instance is None:
        monitoring_system_instance = IoTMonitoringSystem(iot_secure_module)
    return monitoring_system_instance

# Javne funkcije za uporabo v Omni
def add_device_metric(device_id: str, metric_type: str, name: str, value: Any, unit: str = "") -> bool:
    """Dodaj metriko naprave"""
    if monitoring_system_instance is None:
        return False
    
    return monitoring_system_instance.add_metric(device_id, metric_type, name, value, unit)

def register_iot_device(device_id: str, name: str, device_type: str = None, location: str = None) -> bool:
    """Registriraj IoT napravo"""
    if monitoring_system_instance is None:
        return False
    
    return monitoring_system_instance.register_device(device_id, name, device_type, location)

def get_device_status(device_id: str = None) -> Dict[str, Any]:
    """Pridobi status naprav"""
    if monitoring_system_instance is None:
        return {"error": "Monitoring sistem ni inicializiran"}
    
    if device_id:
        if device_id in monitoring_system_instance.devices:
            return asdict(monitoring_system_instance.devices[device_id])
        else:
            return {"error": f"Naprava {device_id} ni registrirana"}
    else:
        return {device_id: asdict(device) for device_id, device in monitoring_system_instance.devices.items()}

def get_monitoring_dashboard() -> Dict[str, Any]:
    """Pridobi dashboard podatke"""
    if monitoring_system_instance is None:
        return {"error": "Monitoring sistem ni inicializiran"}
    
    return {
        'summary': monitoring_system_instance.get_monitoring_summary(),
        'devices': {device_id: asdict(device) for device_id, device in monitoring_system_instance.devices.items()},
        'active_alerts': [asdict(alert) for alert in monitoring_system_instance.alerts.values() if not alert.resolved]
    }

def get_device_metrics(device_id: str = None) -> Dict[str, Any]:
    """Pridobi metrike naprav"""
    if monitoring_system_instance is None:
        return {"error": "Monitoring sistem ni inicializiran"}
    
    if device_id:
        if device_id in monitoring_system_instance.devices:
            device = monitoring_system_instance.devices[device_id]
            return {
                "device_id": device_id,
                "metrics": device.metrics,
                "last_seen": device.last_seen,
                "status": device.status.value
            }
        else:
            return {"error": f"Naprava {device_id} ni registrirana"}
    else:
        return {
            device_id: {
                "metrics": device.metrics,
                "last_seen": device.last_seen,
                "status": device.status.value
            } for device_id, device in monitoring_system_instance.devices.items()
        }

def set_device_threshold(device_id: str, metric_name: str, min_value: float = None, max_value: float = None) -> bool:
    """Nastavi threshold za napravo"""
    if monitoring_system_instance is None:
        return False
    
    return monitoring_system_instance.set_threshold(device_id, metric_name, min_value, max_value)