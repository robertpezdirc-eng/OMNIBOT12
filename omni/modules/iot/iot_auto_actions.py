#!/usr/bin/env python3
"""
🤖 Omni IoT Autonomous Actions System
Sistem avtomatskih ukrepov za kritične situacije

Funkcionalnosti:
- Avtomatski odziv na alarme
- Kritični ukrepi za varnost
- Energetska optimizacija
- Prediktivno vzdrževanje
- Eskalacijski protokoli
- Backup sistemi
"""

import time
import json
import sqlite3
import threading
import logging
import requests
import smtplib
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from pathlib import Path
from dataclasses import dataclass
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import subprocess
import os

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ActionRule:
    """Pravilo za avtomatski ukrep"""
    rule_id: str
    device_id: str
    trigger_condition: str  # sensor_type:operator:value
    action_type: str  # shutdown, restart, notify, adjust
    action_params: Dict[str, Any]
    priority: str = "medium"  # low, medium, high, critical
    cooldown_minutes: int = 5
    enabled: bool = True

@dataclass
class ExecutedAction:
    """Izvršen ukrep"""
    action_id: str
    rule_id: str
    device_id: str
    action_type: str
    timestamp: datetime
    success: bool
    details: str

class AutoActionEngine:
    """Motor za avtomatske ukrepe"""
    
    def __init__(self):
        self.db_path = Path("omni/data/auto_actions.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.setup_database()
        
        self.active = False
        self.action_thread = None
        self.rules = {}
        self.action_history = []
        self.cooldown_tracker = {}
        
        # Naložimo pravila
        self.load_action_rules()
        
        logger.info("🤖 Auto Action Engine inicializiran")
    
    def setup_database(self):
        """Nastavi bazo za avtomatske ukrepe"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Tabela za pravila
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS action_rules (
                rule_id TEXT PRIMARY KEY,
                device_id TEXT,
                trigger_condition TEXT,
                action_type TEXT,
                action_params TEXT,
                priority TEXT,
                cooldown_minutes INTEGER,
                enabled BOOLEAN,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela za izvršene ukrepe
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS executed_actions (
                id INTEGER PRIMARY KEY,
                action_id TEXT,
                rule_id TEXT,
                device_id TEXT,
                action_type TEXT,
                success BOOLEAN,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela za eskalacije
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS escalations (
                id INTEGER PRIMARY KEY,
                device_id TEXT,
                issue_type TEXT,
                severity TEXT,
                escalation_level INTEGER,
                notified_contacts TEXT,
                resolved BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def load_action_rules(self):
        """Naloži pravila iz baze"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM action_rules WHERE enabled = TRUE')
        rules_data = cursor.fetchall()
        
        for rule_data in rules_data:
            rule = ActionRule(
                rule_id=rule_data[0],
                device_id=rule_data[1],
                trigger_condition=rule_data[2],
                action_type=rule_data[3],
                action_params=json.loads(rule_data[4]),
                priority=rule_data[5],
                cooldown_minutes=rule_data[6],
                enabled=rule_data[7]
            )
            self.rules[rule.rule_id] = rule
        
        conn.close()
        logger.info(f"📋 Naloženih {len(self.rules)} pravil")
    
    def add_default_rules(self):
        """Dodaj privzeta pravila"""
        default_rules = [
            # Kritična temperatura
            ActionRule(
                rule_id="temp_critical_shutdown",
                device_id="*",  # Velja za vse naprave
                trigger_condition="temperature:>:85",
                action_type="emergency_shutdown",
                action_params={"reason": "Critical temperature", "notify": True},
                priority="critical",
                cooldown_minutes=1
            ),
            
            # Visoke vibracije
            ActionRule(
                rule_id="vibration_high_alert",
                device_id="*",
                trigger_condition="vibration:>:7.0",
                action_type="notify_maintenance",
                action_params={"urgency": "high", "schedule_check": True},
                priority="high",
                cooldown_minutes=10
            ),
            
            # Nizka baterija
            ActionRule(
                rule_id="battery_low_optimize",
                device_id="*",
                trigger_condition="battery_level:<:20",
                action_type="power_optimize",
                action_params={"reduce_frequency": True, "disable_non_critical": True},
                priority="medium",
                cooldown_minutes=30
            ),
            
            # Izguba povezave
            ActionRule(
                rule_id="connection_lost_backup",
                device_id="*",
                trigger_condition="online:==:false",
                action_type="activate_backup",
                action_params={"backup_device": "auto", "notify_admin": True},
                priority="high",
                cooldown_minutes=5
            ),
            
            # Visoka poraba energije
            ActionRule(
                rule_id="power_high_optimize",
                device_id="*",
                trigger_condition="power_consumption:>:200",
                action_type="power_limit",
                action_params={"max_power": 150, "gradual_reduction": True},
                priority="medium",
                cooldown_minutes=15
            )
        ]
        
        for rule in default_rules:
            self.save_rule(rule)
    
    def save_rule(self, rule: ActionRule):
        """Shrani pravilo v bazo"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO action_rules 
            (rule_id, device_id, trigger_condition, action_type, action_params, 
             priority, cooldown_minutes, enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (rule.rule_id, rule.device_id, rule.trigger_condition, rule.action_type,
              json.dumps(rule.action_params), rule.priority, rule.cooldown_minutes, rule.enabled))
        
        conn.commit()
        conn.close()
        
        self.rules[rule.rule_id] = rule
    
    def start_monitoring(self):
        """Začne spremljanje in avtomatske ukrepe"""
        if self.active:
            return "⚠️ Avtomatski ukrepi že aktivni"
        
        self.active = True
        self.action_thread = threading.Thread(target=self.action_loop, daemon=True)
        self.action_thread.start()
        
        logger.info("🚀 Avtomatski ukrepi aktivirani")
        return "✅ Avtomatski ukrepi aktivirani"
    
    def stop_monitoring(self):
        """Ustavi avtomatske ukrepe"""
        self.active = False
        logger.info("🛑 Avtomatski ukrepi ustavljeni")
        return "✅ Avtomatski ukrepi ustavljeni"
    
    def action_loop(self):
        """Glavna zanka za preverjanje in izvajanje ukrepov"""
        while self.active:
            try:
                # Preveri alarme iz device monitor
                self.check_and_execute_actions()
                
                # Preveri eskalacije
                self.check_escalations()
                
                # Počisti stare zapise
                self.cleanup_old_records()
                
                time.sleep(10)  # Preverjaj vsakih 10 sekund
                
            except Exception as e:
                logger.error(f"❌ Napaka v action loop: {e}")
                time.sleep(30)
    
    def check_and_execute_actions(self):
        """Preveri alarme in izvršuj ukrepe"""
        # Pridobi aktivne alarme
        alarms = self.get_active_alarms()
        
        for alarm in alarms:
            device_id = alarm['device_id']
            alarm_type = alarm['alarm_type']
            message = alarm['message']
            
            # Poišči ustrezna pravila
            matching_rules = self.find_matching_rules(device_id, alarm_type, message)
            
            for rule in matching_rules:
                if self.can_execute_action(rule):
                    self.execute_action(rule, alarm)
    
    def get_active_alarms(self) -> List[Dict]:
        """Pridobi aktivne alarme iz device monitor"""
        try:
            monitor_db = Path("omni/data/device_monitoring.db")
            if not monitor_db.exists():
                return []
            
            conn = sqlite3.connect(str(monitor_db))
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT device_id, alarm_type, severity, message, timestamp
                FROM device_alarms
                WHERE acknowledged = FALSE
                AND timestamp > datetime('now', '-1 hour')
                ORDER BY timestamp DESC
            ''')
            
            alarms = []
            for row in cursor.fetchall():
                alarms.append({
                    'device_id': row[0],
                    'alarm_type': row[1],
                    'severity': row[2],
                    'message': row[3],
                    'timestamp': row[4]
                })
            
            conn.close()
            return alarms
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju alarmov: {e}")
            return []
    
    def find_matching_rules(self, device_id: str, alarm_type: str, message: str) -> List[ActionRule]:
        """Poišči pravila, ki se ujemajo z alarmom"""
        matching_rules = []
        
        for rule in self.rules.values():
            if not rule.enabled:
                continue
            
            # Preveri device_id (wildcard * pomeni vse naprave)
            if rule.device_id != "*" and rule.device_id != device_id:
                continue
            
            # Preveri trigger condition
            if self.matches_trigger_condition(rule.trigger_condition, alarm_type, message):
                matching_rules.append(rule)
        
        # Razvrsti po prioriteti
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        matching_rules.sort(key=lambda r: priority_order.get(r.priority, 3))
        
        return matching_rules
    
    def matches_trigger_condition(self, condition: str, alarm_type: str, message: str) -> bool:
        """Preveri ali se alarm ujema s pogojem"""
        try:
            # Format: sensor_type:operator:value
            parts = condition.split(":")
            if len(parts) != 3:
                return False
            
            sensor_type, operator, threshold_str = parts
            
            # Izvleci vrednost iz sporočila
            value = self.extract_value_from_message(message, sensor_type)
            if value is None:
                return False
            
            threshold = float(threshold_str)
            
            # Preveri pogoj
            if operator == ">":
                return value > threshold
            elif operator == "<":
                return value < threshold
            elif operator == ">=":
                return value >= threshold
            elif operator == "<=":
                return value <= threshold
            elif operator == "==":
                return abs(value - threshold) < 0.001
            
        except Exception as e:
            logger.error(f"❌ Napaka pri preverjanju pogoja {condition}: {e}")
        
        return False
    
    def extract_value_from_message(self, message: str, sensor_type: str) -> Optional[float]:
        """Izvleci numerično vrednost iz sporočila alarma"""
        try:
            # Poišči številke v sporočilu
            import re
            numbers = re.findall(r'-?\d+\.?\d*', message)
            
            if numbers:
                return float(numbers[0])
            
            # Posebni primeri
            if "online" in sensor_type.lower():
                return 0.0 if "offline" in message.lower() else 1.0
            
        except Exception:
            pass
        
        return None
    
    def can_execute_action(self, rule: ActionRule) -> bool:
        """Preveri ali lahko izvršimo ukrep (cooldown)"""
        now = datetime.now()
        last_execution = self.cooldown_tracker.get(rule.rule_id)
        
        if last_execution:
            time_diff = (now - last_execution).total_seconds() / 60
            if time_diff < rule.cooldown_minutes:
                return False
        
        return True
    
    def execute_action(self, rule: ActionRule, alarm: Dict):
        """Izvršuj ukrep"""
        action_id = f"{rule.rule_id}_{int(time.time())}"
        device_id = alarm['device_id']
        
        logger.info(f"🎯 Izvajam ukrep {rule.action_type} za {device_id}")
        
        success = False
        details = ""
        
        try:
            if rule.action_type == "emergency_shutdown":
                success, details = self.emergency_shutdown(device_id, rule.action_params)
            
            elif rule.action_type == "notify_maintenance":
                success, details = self.notify_maintenance(device_id, rule.action_params, alarm)
            
            elif rule.action_type == "power_optimize":
                success, details = self.power_optimize(device_id, rule.action_params)
            
            elif rule.action_type == "activate_backup":
                success, details = self.activate_backup(device_id, rule.action_params)
            
            elif rule.action_type == "power_limit":
                success, details = self.power_limit(device_id, rule.action_params)
            
            elif rule.action_type == "restart_device":
                success, details = self.restart_device(device_id, rule.action_params)
            
            else:
                details = f"Neznan tip ukrepa: {rule.action_type}"
            
            # Shrani izvršen ukrep
            executed_action = ExecutedAction(
                action_id=action_id,
                rule_id=rule.rule_id,
                device_id=device_id,
                action_type=rule.action_type,
                timestamp=datetime.now(),
                success=success,
                details=details
            )
            
            self.save_executed_action(executed_action)
            
            # Posodobi cooldown
            self.cooldown_tracker[rule.rule_id] = datetime.now()
            
            if success:
                logger.info(f"✅ Ukrep {rule.action_type} uspešno izvršen: {details}")
            else:
                logger.error(f"❌ Ukrep {rule.action_type} neuspešen: {details}")
                
        except Exception as e:
            details = f"Napaka pri izvajanju: {str(e)}"
            logger.error(f"❌ {details}")
            
            executed_action = ExecutedAction(
                action_id=action_id,
                rule_id=rule.rule_id,
                device_id=device_id,
                action_type=rule.action_type,
                timestamp=datetime.now(),
                success=False,
                details=details
            )
            self.save_executed_action(executed_action)
    
    def emergency_shutdown(self, device_id: str, params: Dict) -> tuple[bool, str]:
        """Kritično ugašanje naprave"""
        try:
            # Pošlji MQTT ukaz za ugašanje
            import paho.mqtt.client as mqtt
            
            client = mqtt.Client()
            client.connect("localhost", 1883, 60)
            
            shutdown_topic = f"{device_id}/control/shutdown"
            client.publish(shutdown_topic, json.dumps({"action": "emergency_shutdown", "reason": params.get("reason", "Critical condition")}))
            
            client.disconnect()
            
            # Če je HTTP API na voljo
            try:
                response = requests.post(f"http://192.168.1.50/api/emergency_shutdown", 
                                       json={"device_id": device_id, "reason": params.get("reason")}, 
                                       timeout=5)
                if response.status_code == 200:
                    return True, f"HTTP emergency shutdown uspešen"
            except:
                pass
            
            # Obvestilo
            if params.get("notify", False):
                self.send_critical_notification(device_id, f"KRITIČNO UGAŠANJE: {params.get('reason', 'Neznana napaka')}")
            
            return True, f"MQTT emergency shutdown poslan"
            
        except Exception as e:
            return False, f"Napaka pri ugašanju: {str(e)}"
    
    def notify_maintenance(self, device_id: str, params: Dict, alarm: Dict) -> tuple[bool, str]:
        """Obvesti vzdrževalce"""
        try:
            urgency = params.get("urgency", "medium")
            message = f"VZDRŽEVANJE POTREBNO\n\nNaprava: {device_id}\nAlarm: {alarm['message']}\nČas: {datetime.now()}\nNujnost: {urgency}"
            
            # Email obvestilo
            if self.send_email_notification("maintenance@company.com", f"Vzdrževanje {device_id}", message):
                
                # Če je visoka nujnost, pošlji tudi SMS
                if urgency == "high":
                    self.send_sms_notification("+386123456789", f"NUJNO vzdrževanje {device_id}")
                
                # Načrtuj pregled
                if params.get("schedule_check", False):
                    self.schedule_maintenance_check(device_id, urgency)
                
                return True, f"Vzdrževalci obveščeni ({urgency})"
            
            return False, "Napaka pri pošiljanju obvestila"
            
        except Exception as e:
            return False, f"Napaka pri obveščanju: {str(e)}"
    
    def power_optimize(self, device_id: str, params: Dict) -> tuple[bool, str]:
        """Optimiziraj porabo energije"""
        try:
            actions_taken = []
            
            # Zmanjšaj frekvenco vzorčenja
            if params.get("reduce_frequency", False):
                self.send_device_command(device_id, "set_sampling_rate", {"rate": 0.5})
                actions_taken.append("zmanjšana frekvenca")
            
            # Onemogoči nekritične funkcije
            if params.get("disable_non_critical", False):
                self.send_device_command(device_id, "disable_features", {"features": ["led", "display", "wifi_scan"]})
                actions_taken.append("onemogočene nekritične funkcije")
            
            # Aktiviraj power saving mode
            self.send_device_command(device_id, "power_mode", {"mode": "saving"})
            actions_taken.append("power saving mode")
            
            return True, f"Energetska optimizacija: {', '.join(actions_taken)}"
            
        except Exception as e:
            return False, f"Napaka pri optimizaciji: {str(e)}"
    
    def activate_backup(self, device_id: str, params: Dict) -> tuple[bool, str]:
        """Aktiviraj backup napravo"""
        try:
            backup_device = params.get("backup_device", "auto")
            
            if backup_device == "auto":
                # Poišči najboljšo backup napravo
                backup_device = self.find_best_backup_device(device_id)
            
            if backup_device:
                # Aktiviraj backup
                self.send_device_command(backup_device, "activate_backup", {"primary_device": device_id})
                
                # Preusmeri promet
                self.redirect_traffic(device_id, backup_device)
                
                # Obvestilo
                if params.get("notify_admin", False):
                    self.send_email_notification("admin@company.com", 
                                               f"Backup aktiviran", 
                                               f"Naprava {device_id} nedostopna, aktiviran backup {backup_device}")
                
                return True, f"Backup {backup_device} aktiviran"
            else:
                return False, "Ni na voljo backup naprave"
                
        except Exception as e:
            return False, f"Napaka pri aktivaciji backup: {str(e)}"
    
    def power_limit(self, device_id: str, params: Dict) -> tuple[bool, str]:
        """Omeji porabo energije"""
        try:
            max_power = params.get("max_power", 100)
            gradual = params.get("gradual_reduction", True)
            
            if gradual:
                # Postopno zmanjševanje
                current_power = self.get_current_power(device_id)
                steps = 5
                step_reduction = (current_power - max_power) / steps
                
                for i in range(steps):
                    new_limit = current_power - (step_reduction * (i + 1))
                    self.send_device_command(device_id, "set_power_limit", {"limit": new_limit})
                    time.sleep(2)
            else:
                # Takojšnja omejitev
                self.send_device_command(device_id, "set_power_limit", {"limit": max_power})
            
            return True, f"Energija omejena na {max_power}W"
            
        except Exception as e:
            return False, f"Napaka pri omejevanju energije: {str(e)}"
    
    def restart_device(self, device_id: str, params: Dict) -> tuple[bool, str]:
        """Ponovno zaženi napravo"""
        try:
            delay = params.get("delay_seconds", 0)
            
            if delay > 0:
                time.sleep(delay)
            
            # MQTT restart
            self.send_device_command(device_id, "restart", {"reason": "Automatic restart"})
            
            # HTTP restart
            try:
                response = requests.post(f"http://192.168.1.50/api/restart", 
                                       json={"device_id": device_id}, 
                                       timeout=5)
            except:
                pass
            
            return True, f"Restart ukaz poslan"
            
        except Exception as e:
            return False, f"Napaka pri restartu: {str(e)}"
    
    def send_device_command(self, device_id: str, command: str, params: Dict = None):
        """Pošlji ukaz napravi"""
        try:
            import paho.mqtt.client as mqtt
            
            client = mqtt.Client()
            client.connect("localhost", 1883, 60)
            
            topic = f"{device_id}/control/{command}"
            payload = json.dumps(params or {})
            
            client.publish(topic, payload)
            client.disconnect()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pošiljanju ukaza {command} za {device_id}: {e}")
    
    def send_email_notification(self, to_email: str, subject: str, message: str) -> bool:
        """Pošlji email obvestilo"""
        try:
            # Konfiguracija (v produkciji iz .env)
            smtp_server = "smtp.gmail.com"
            smtp_port = 587
            from_email = "omni@company.com"
            password = "app_password"  # App password
            
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(message, 'plain'))
            
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(from_email, password)
            server.send_message(msg)
            server.quit()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pošiljanju emaila: {e}")
            return False
    
    def send_sms_notification(self, phone: str, message: str) -> bool:
        """Pošlji SMS obvestilo"""
        try:
            # Integracija s SMS API (Twilio, Nexmo, itd.)
            # V tem primeru simulacija
            logger.info(f"📱 SMS poslano na {phone}: {message}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pošiljanju SMS: {e}")
            return False
    
    def send_critical_notification(self, device_id: str, message: str):
        """Pošlji kritično obvestilo"""
        # Email
        self.send_email_notification("admin@company.com", f"KRITIČNO: {device_id}", message)
        
        # SMS
        self.send_sms_notification("+386123456789", f"KRITIČNO {device_id}: {message[:100]}")
        
        # Slack/Teams webhook
        try:
            webhook_url = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
            payload = {
                "text": f"🚨 KRITIČNO OBVESTILO",
                "attachments": [{
                    "color": "danger",
                    "fields": [{
                        "title": "Naprava",
                        "value": device_id,
                        "short": True
                    }, {
                        "title": "Sporočilo",
                        "value": message,
                        "short": False
                    }]
                }]
            }
            requests.post(webhook_url, json=payload, timeout=5)
        except:
            pass
    
    def find_best_backup_device(self, primary_device: str) -> Optional[str]:
        """Poišči najboljšo backup napravo"""
        # Simulacija - v realnosti bi preveril dostopne naprave
        backup_mapping = {
            "factory/machine1": "factory/machine1_backup",
            "office/pc1": "office/pc2",
            "home/livingroom/light": "home/kitchen/light"
        }
        return backup_mapping.get(primary_device)
    
    def redirect_traffic(self, from_device: str, to_device: str):
        """Preusmeri promet med napravami"""
        try:
            # MQTT topic redirection
            redirect_config = {
                "from": from_device,
                "to": to_device,
                "timestamp": datetime.now().isoformat()
            }
            
            # Shrani preusmeritev
            with open("omni/data/traffic_redirections.json", "w") as f:
                json.dump(redirect_config, f, indent=2)
                
        except Exception as e:
            logger.error(f"❌ Napaka pri preusmerjanju prometa: {e}")
    
    def get_current_power(self, device_id: str) -> float:
        """Pridobi trenutno porabo energije"""
        try:
            # Pridobi iz device monitor baze
            monitor_db = Path("omni/data/device_monitoring.db")
            if monitor_db.exists():
                conn = sqlite3.connect(str(monitor_db))
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT value FROM sensor_readings
                    WHERE device_id = ? AND sensor_type = 'power_consumption'
                    ORDER BY timestamp DESC LIMIT 1
                ''', (device_id,))
                
                result = cursor.fetchone()
                conn.close()
                
                if result:
                    return float(result[0])
            
            return 100.0  # Privzeta vrednost
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju porabe: {e}")
            return 100.0
    
    def schedule_maintenance_check(self, device_id: str, urgency: str):
        """Načrtuj vzdrževalni pregled"""
        try:
            # Določi čas pregleda glede na nujnost
            if urgency == "critical":
                check_time = datetime.now() + timedelta(hours=1)
            elif urgency == "high":
                check_time = datetime.now() + timedelta(hours=4)
            else:
                check_time = datetime.now() + timedelta(days=1)
            
            # Shrani v urnik
            schedule_data = {
                "device_id": device_id,
                "check_type": "maintenance",
                "scheduled_time": check_time.isoformat(),
                "urgency": urgency,
                "created_at": datetime.now().isoformat()
            }
            
            schedule_file = Path("omni/data/maintenance_schedule.json")
            
            if schedule_file.exists():
                with open(schedule_file, "r") as f:
                    schedules = json.load(f)
            else:
                schedules = []
            
            schedules.append(schedule_data)
            
            with open(schedule_file, "w") as f:
                json.dump(schedules, f, indent=2)
                
            logger.info(f"📅 Vzdrževanje načrtovano za {device_id} ob {check_time}")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri načrtovanju vzdrževanja: {e}")
    
    def save_executed_action(self, action: ExecutedAction):
        """Shrani izvršen ukrep"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO executed_actions 
            (action_id, rule_id, device_id, action_type, success, details, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (action.action_id, action.rule_id, action.device_id, action.action_type,
              action.success, action.details, action.timestamp))
        
        conn.commit()
        conn.close()
    
    def check_escalations(self):
        """Preveri in izvršuj eskalacije"""
        try:
            # Poišči nerešene probleme
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT device_id, issue_type, severity, escalation_level, created_at
                FROM escalations
                WHERE resolved = FALSE
                AND created_at < datetime('now', '-30 minutes')
            ''')
            
            unresolved = cursor.fetchall()
            
            for issue in unresolved:
                device_id, issue_type, severity, level, created_at = issue
                
                # Povečaj nivo eskalacije
                new_level = level + 1
                
                if new_level <= 3:  # Maksimalno 3 nivoji
                    self.escalate_issue(device_id, issue_type, severity, new_level)
                    
                    cursor.execute('''
                        UPDATE escalations 
                        SET escalation_level = ?, notified_contacts = ?
                        WHERE device_id = ? AND issue_type = ? AND resolved = FALSE
                    ''', (new_level, f"level_{new_level}_contacts", device_id, issue_type))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri preverjanju eskalacij: {e}")
    
    def escalate_issue(self, device_id: str, issue_type: str, severity: str, level: int):
        """Eskaliraj problem"""
        escalation_contacts = {
            1: ["technician@company.com"],
            2: ["supervisor@company.com", "manager@company.com"],
            3: ["director@company.com", "ceo@company.com"]
        }
        
        contacts = escalation_contacts.get(level, [])
        
        for contact in contacts:
            subject = f"ESKALACIJA NIVO {level}: {device_id}"
            message = f"Problem z napravo {device_id} ni bil rešen.\n\nTip: {issue_type}\nResnost: {severity}\nNivo eskalacije: {level}"
            
            self.send_email_notification(contact, subject, message)
        
        logger.warning(f"📈 Eskalacija nivo {level} za {device_id}")
    
    def cleanup_old_records(self):
        """Počisti stare zapise"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Počisti stare izvršene ukrepe (starejše od 30 dni)
            cursor.execute('''
                DELETE FROM executed_actions
                WHERE timestamp < datetime('now', '-30 days')
            ''')
            
            # Počisti rešene eskalacije (starejše od 7 dni)
            cursor.execute('''
                DELETE FROM escalations
                WHERE resolved = TRUE AND created_at < datetime('now', '-7 days')
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri čiščenju: {e}")
    
    def get_action_statistics(self) -> Dict:
        """Pridobi statistike ukrepov"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Skupno število ukrepov
        cursor.execute('SELECT COUNT(*) FROM executed_actions')
        total_actions = cursor.fetchone()[0]
        
        # Uspešni ukrepi
        cursor.execute('SELECT COUNT(*) FROM executed_actions WHERE success = TRUE')
        successful_actions = cursor.fetchone()[0]
        
        # Ukrepi po tipih
        cursor.execute('''
            SELECT action_type, COUNT(*) 
            FROM executed_actions 
            GROUP BY action_type
        ''')
        actions_by_type = dict(cursor.fetchall())
        
        # Zadnji ukrepi
        cursor.execute('''
            SELECT device_id, action_type, success, timestamp
            FROM executed_actions
            ORDER BY timestamp DESC LIMIT 10
        ''')
        recent_actions = cursor.fetchall()
        
        conn.close()
        
        success_rate = (successful_actions / total_actions * 100) if total_actions > 0 else 0
        
        return {
            'total_actions': total_actions,
            'successful_actions': successful_actions,
            'success_rate': round(success_rate, 2),
            'actions_by_type': actions_by_type,
            'recent_actions': recent_actions
        }

# Globalna instanca
auto_action_engine = AutoActionEngine()

# Funkcije za uporabo
def start_auto_actions() -> str:
    """Začne avtomatske ukrepe"""
    # Dodaj privzeta pravila če jih ni
    if not auto_action_engine.rules:
        auto_action_engine.add_default_rules()
    
    return auto_action_engine.start_monitoring()

def stop_auto_actions() -> str:
    """Ustavi avtomatske ukrepe"""
    return auto_action_engine.stop_monitoring()

def add_action_rule(rule: ActionRule) -> str:
    """Dodaj novo pravilo"""
    auto_action_engine.save_rule(rule)
    return f"✅ Pravilo {rule.rule_id} dodano"

def get_action_stats() -> Dict:
    """Pridobi statistike ukrepov"""
    return auto_action_engine.get_action_statistics()

if __name__ == "__main__":
    # Test
    print("🧪 Testiranje auto actions...")
    result = start_auto_actions()
    print(result)
    
    time.sleep(10)
    stats = get_action_stats()
    print(f"📊 Statistike: {json.dumps(stats, indent=2, default=str)}")
    
    stop_auto_actions()