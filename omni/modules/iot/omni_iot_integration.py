#!/usr/bin/env python3
"""
🔗 Omni IoT Integration Module
Integracija avtonomnega IoT sistema v OmniCore

Funkcionalnosti:
- Registracija IoT modulov v OmniCore
- API endpoints za upravljanje
- Real-time komunikacija
- Status monitoring
- Avtomatska sinhronizacija
"""

import json
import time
import threading
import logging
import sqlite3
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

# Uvozi naše IoT module
try:
    from . import iot_autonomous
    from . import iot_device_monitor
    from . import iot_auto_actions
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).parent))
    import iot_autonomous
    import iot_device_monitor
    import iot_auto_actions

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OmniIoTIntegration:
    """Glavna integracija z OmniCore"""
    
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app)
        
        self.omni_core_url = "http://localhost:3000"
        self.integration_port = 5001
        self.registered = False
        
        # Status sistema
        self.system_status = {
            'autonomous_active': False,
            'monitoring_active': False,
            'auto_actions_active': False,
            'devices_count': 0,
            'last_update': None
        }
        
        # Nastavi API endpoints
        self.setup_api_routes()
        
        logger.info("🔗 Omni IoT Integration inicializiran")
    
    def setup_api_routes(self):
        """Nastavi API endpoints"""
        
        @self.app.route('/api/status', methods=['GET'])
        def get_status():
            """Pridobi status IoT sistema"""
            return jsonify({
                'status': 'active',
                'system': self.system_status,
                'timestamp': datetime.now().isoformat()
            })
        
        @self.app.route('/api/devices', methods=['GET'])
        def get_devices():
            """Pridobi seznam naprav"""
            try:
                devices = self.get_all_devices()
                return jsonify({
                    'success': True,
                    'devices': devices,
                    'count': len(devices)
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/devices/<device_id>/stats', methods=['GET'])
        def get_device_stats(device_id):
            """Pridobi statistike naprave"""
            try:
                stats = iot_device_monitor.get_device_stats(device_id)
                return jsonify({
                    'success': True,
                    'device_id': device_id,
                    'stats': stats
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/devices/<device_id>/control', methods=['POST'])
        def control_device(device_id):
            """Upravljaj napravo"""
            try:
                data = request.get_json()
                action = data.get('action')
                params = data.get('params', {})
                
                result = self.execute_device_action(device_id, action, params)
                
                return jsonify({
                    'success': True,
                    'device_id': device_id,
                    'action': action,
                    'result': result
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/autonomous/start', methods=['POST'])
        def start_autonomous():
            """Začni avtonomni sistem"""
            try:
                result = iot_autonomous.start_autonomous_system()
                self.system_status['autonomous_active'] = True
                self.system_status['last_update'] = datetime.now().isoformat()
                
                return jsonify({
                    'success': True,
                    'message': result
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/autonomous/stop', methods=['POST'])
        def stop_autonomous():
            """Ustavi avtonomni sistem"""
            try:
                result = iot_autonomous.stop_autonomous_system()
                self.system_status['autonomous_active'] = False
                self.system_status['last_update'] = datetime.now().isoformat()
                
                return jsonify({
                    'success': True,
                    'message': result
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/monitoring/start', methods=['POST'])
        def start_monitoring():
            """Začni spremljanje naprav"""
            try:
                data = request.get_json()
                devices = data.get('devices', [])
                
                if not devices:
                    devices = self.get_default_devices()
                
                result = iot_device_monitor.start_device_monitoring(devices)
                self.system_status['monitoring_active'] = True
                self.system_status['devices_count'] = len(devices)
                self.system_status['last_update'] = datetime.now().isoformat()
                
                return jsonify({
                    'success': True,
                    'message': result,
                    'devices_count': len(devices)
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/monitoring/stop', methods=['POST'])
        def stop_monitoring():
            """Ustavi spremljanje naprav"""
            try:
                result = iot_device_monitor.stop_device_monitoring()
                self.system_status['monitoring_active'] = False
                self.system_status['last_update'] = datetime.now().isoformat()
                
                return jsonify({
                    'success': True,
                    'message': result
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/actions/start', methods=['POST'])
        def start_auto_actions():
            """Začni avtomatske ukrepe"""
            try:
                result = iot_auto_actions.start_auto_actions()
                self.system_status['auto_actions_active'] = True
                self.system_status['last_update'] = datetime.now().isoformat()
                
                return jsonify({
                    'success': True,
                    'message': result
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/actions/stop', methods=['POST'])
        def stop_auto_actions():
            """Ustavi avtomatske ukrepe"""
            try:
                result = iot_auto_actions.stop_auto_actions()
                self.system_status['auto_actions_active'] = False
                self.system_status['last_update'] = datetime.now().isoformat()
                
                return jsonify({
                    'success': True,
                    'message': result
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/actions/stats', methods=['GET'])
        def get_action_stats():
            """Pridobi statistike ukrepov"""
            try:
                stats = iot_auto_actions.get_action_stats()
                return jsonify({
                    'success': True,
                    'stats': stats
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/system/full-start', methods=['POST'])
        def full_system_start():
            """Zaženi celoten IoT sistem"""
            try:
                results = []
                
                # 1. Začni spremljanje
                devices = self.get_default_devices()
                monitor_result = iot_device_monitor.start_device_monitoring(devices)
                results.append(f"Monitoring: {monitor_result}")
                self.system_status['monitoring_active'] = True
                self.system_status['devices_count'] = len(devices)
                
                # 2. Začni avtomatske ukrepe
                actions_result = iot_auto_actions.start_auto_actions()
                results.append(f"Auto Actions: {actions_result}")
                self.system_status['auto_actions_active'] = True
                
                # 3. Začni avtonomni sistem
                autonomous_result = iot_autonomous.start_autonomous_system()
                results.append(f"Autonomous: {autonomous_result}")
                self.system_status['autonomous_active'] = True
                
                self.system_status['last_update'] = datetime.now().isoformat()
                
                return jsonify({
                    'success': True,
                    'message': 'Celoten IoT sistem zagnan',
                    'results': results,
                    'system_status': self.system_status
                })
                
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/system/full-stop', methods=['POST'])
        def full_system_stop():
            """Ustavi celoten IoT sistem"""
            try:
                results = []
                
                # Ustavi vse komponente
                autonomous_result = iot_autonomous.stop_autonomous_system()
                results.append(f"Autonomous: {autonomous_result}")
                
                actions_result = iot_auto_actions.stop_auto_actions()
                results.append(f"Auto Actions: {actions_result}")
                
                monitor_result = iot_device_monitor.stop_device_monitoring()
                results.append(f"Monitoring: {monitor_result}")
                
                # Posodobi status
                self.system_status.update({
                    'autonomous_active': False,
                    'monitoring_active': False,
                    'auto_actions_active': False,
                    'last_update': datetime.now().isoformat()
                })
                
                return jsonify({
                    'success': True,
                    'message': 'Celoten IoT sistem ustavljen',
                    'results': results,
                    'system_status': self.system_status
                })
                
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/dashboard', methods=['GET'])
        def get_dashboard_data():
            """Pridobi podatke za dashboard"""
            try:
                # Pridobi statistike vseh komponent
                dashboard_data = {
                    'system_status': self.system_status,
                    'devices': self.get_all_devices(),
                    'recent_actions': iot_auto_actions.get_action_stats().get('recent_actions', []),
                    'active_alarms': self.get_active_alarms_count(),
                    'timestamp': datetime.now().isoformat()
                }
                
                return jsonify({
                    'success': True,
                    'dashboard': dashboard_data
                })
                
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
    
    def get_default_devices(self) -> List[Dict]:
        """Pridobi privzete naprave za testiranje"""
        return [
            {
                "device_id": "industrial_machine_01",
                "device_type": "industrial_machine",
                "name": "Industrijski stroj #1",
                "location": "Tovarna A",
                "thresholds": {
                    "temperature": {"max": 70, "critical_max": 85},
                    "vibration": {"max": 4.0, "critical_max": 7.0},
                    "power_consumption": {"max": 200, "critical_max": 250}
                }
            },
            {
                "device_id": "greenhouse_controller_01",
                "device_type": "greenhouse_controller",
                "name": "Rastlinjak kontroler #1",
                "location": "Rastlinjak B",
                "thresholds": {
                    "temperature": {"min": 15, "max": 30},
                    "humidity": {"min": 40, "max": 80},
                    "soil_moisture": {"min": 30, "max": 70}
                }
            },
            {
                "device_id": "smart_thermostat_01",
                "device_type": "smart_thermostat",
                "name": "Pametni termostat #1",
                "location": "Pisarna C",
                "thresholds": {
                    "temperature": {"min": 18, "max": 26},
                    "humidity": {"min": 30, "max": 60}
                }
            },
            {
                "device_id": "computer_workstation_01",
                "device_type": "computer",
                "name": "Delovna postaja #1",
                "location": "IT oddelek",
                "thresholds": {
                    "cpu_temperature": {"max": 80, "critical_max": 90},
                    "cpu_usage": {"max": 90, "critical_max": 95},
                    "memory_usage": {"max": 85, "critical_max": 95}
                }
            }
        ]
    
    def get_all_devices(self) -> List[Dict]:
        """Pridobi vse naprave iz baze"""
        try:
            devices = []
            
            # Pridobi iz device monitor baze
            monitor_db = Path("omni/data/device_monitoring.db")
            if monitor_db.exists():
                conn = sqlite3.connect(str(monitor_db))
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT DISTINCT device_id, online, last_seen, battery_level, signal_strength
                    FROM device_status
                    ORDER BY device_id
                ''')
                
                for row in cursor.fetchall():
                    device_id, online, last_seen, battery_level, signal_strength = row
                    
                    # Pridobi zadnje senzorske podatke
                    cursor.execute('''
                        SELECT sensor_type, value, unit, timestamp
                        FROM sensor_readings
                        WHERE device_id = ?
                        AND timestamp = (
                            SELECT MAX(timestamp) FROM sensor_readings sr2
                            WHERE sr2.device_id = sensor_readings.device_id
                            AND sr2.sensor_type = sensor_readings.sensor_type
                        )
                        ORDER BY sensor_type
                    ''', (device_id,))
                    
                    sensors = []
                    for sensor_row in cursor.fetchall():
                        sensors.append({
                            'type': sensor_row[0],
                            'value': sensor_row[1],
                            'unit': sensor_row[2],
                            'timestamp': sensor_row[3]
                        })
                    
                    devices.append({
                        'device_id': device_id,
                        'online': bool(online),
                        'last_seen': last_seen,
                        'battery_level': battery_level,
                        'signal_strength': signal_strength,
                        'sensors': sensors
                    })
                
                conn.close()
            
            # Če ni naprav v bazi, vrni privzete
            if not devices:
                devices = self.get_default_devices()
            
            return devices
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju naprav: {e}")
            return self.get_default_devices()
    
    def get_active_alarms_count(self) -> int:
        """Pridobi število aktivnih alarmov"""
        try:
            monitor_db = Path("omni/data/device_monitoring.db")
            if monitor_db.exists():
                conn = sqlite3.connect(str(monitor_db))
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT COUNT(*) FROM device_alarms
                    WHERE acknowledged = FALSE
                ''')
                
                count = cursor.fetchone()[0]
                conn.close()
                return count
            
            return 0
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju alarmov: {e}")
            return 0
    
    def execute_device_action(self, device_id: str, action: str, params: Dict) -> str:
        """Izvršuj ukrep na napravi"""
        try:
            if action == "turn_on":
                return iot_autonomous.turn_on_device(device_id)
            elif action == "turn_off":
                return iot_autonomous.turn_off_device(device_id)
            elif action == "restart":
                return iot_autonomous.restart_device(device_id)
            elif action == "get_status":
                return iot_autonomous.get_device_status(device_id)
            else:
                return f"❌ Neznan ukrep: {action}"
                
        except Exception as e:
            return f"❌ Napaka pri izvajanju {action}: {str(e)}"
    
    def register_with_omni_core(self):
        """Registriraj se z OmniCore"""
        try:
            registration_data = {
                'module_name': 'iot_autonomous',
                'module_type': 'iot_system',
                'api_url': f'http://localhost:{self.integration_port}',
                'capabilities': [
                    'device_monitoring',
                    'autonomous_control',
                    'auto_actions',
                    'real_time_alerts'
                ],
                'status': 'active'
            }
            
            response = requests.post(
                f"{self.omni_core_url}/api/modules/register",
                json=registration_data,
                timeout=10
            )
            
            if response.status_code == 200:
                self.registered = True
                logger.info("✅ Uspešno registriran z OmniCore")
                return True
            else:
                logger.warning(f"⚠️ Registracija z OmniCore neuspešna: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Napaka pri registraciji z OmniCore: {e}")
            return False
    
    def start_integration_server(self):
        """Zaženi integracijski server"""
        try:
            # Poskusi registracija z OmniCore
            self.register_with_omni_core()
            
            logger.info(f"🚀 IoT Integration server zagnan na portu {self.integration_port}")
            self.app.run(host='0.0.0.0', port=self.integration_port, debug=False)
            
        except Exception as e:
            logger.error(f"❌ Napaka pri zagonu integration server: {e}")
    
    def send_status_update_to_omni(self):
        """Pošlji status update OmniCore"""
        if not self.registered:
            return
        
        try:
            status_data = {
                'module_name': 'iot_autonomous',
                'status': self.system_status,
                'timestamp': datetime.now().isoformat()
            }
            
            requests.post(
                f"{self.omni_core_url}/api/modules/status",
                json=status_data,
                timeout=5
            )
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pošiljanju status update: {e}")

# Globalna instanca
omni_iot_integration = OmniIoTIntegration()

# Funkcije za uporabo
def start_integration_server():
    """Zaženi integracijski server"""
    omni_iot_integration.start_integration_server()

def get_system_status() -> Dict:
    """Pridobi status sistema"""
    return omni_iot_integration.system_status

def register_with_omni() -> bool:
    """Registriraj z OmniCore"""
    return omni_iot_integration.register_with_omni_core()

if __name__ == "__main__":
    print("🔗 Zaganjam Omni IoT Integration...")
    start_integration_server()