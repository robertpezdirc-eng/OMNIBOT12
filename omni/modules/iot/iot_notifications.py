# omni/modules/iot/iot_notifications.py
"""
IoT Notification System
Sistem obvestil za kritične dogodke, alarme in statusne spremembe
"""

import json
import os
import smtplib
import requests
import logging
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional, Any
import threading
import time
from dataclasses import dataclass, asdict
from enum import Enum

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotificationLevel(Enum):
    """Nivoji obvestil"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class NotificationChannel(Enum):
    """Kanali obvestil"""
    EMAIL = "email"
    SMS = "sms"
    WEBHOOK = "webhook"
    PUSH = "push"
    SLACK = "slack"
    TELEGRAM = "telegram"

@dataclass
class NotificationRule:
    """Pravilo za obvestila"""
    id: str
    name: str
    conditions: List[Dict[str, Any]]
    channels: List[str]
    level: str
    enabled: bool = True
    cooldown_minutes: int = 15
    template: Optional[str] = None
    recipients: List[str] = None

@dataclass
class Notification:
    """Obvestilo"""
    id: str
    title: str
    message: str
    level: str
    source: str
    timestamp: str
    channels: List[str]
    recipients: List[str]
    metadata: Dict[str, Any] = None
    sent: bool = False
    attempts: int = 0

class NotificationManager:
    """Glavni manager za obvestila"""
    
    def __init__(self, config_file: str = "data/config/notifications.json"):
        self.config_file = config_file
        self.config = self._load_config()
        self.rules = {}
        self.notifications = {}
        self.cooldowns = {}
        self.channels = {}
        
        # Inicializiraj kanale
        self._init_channels()
        
        # Naloži pravila
        self._load_rules()
        
        # Zaženi background worker
        self.running = True
        self.worker_thread = threading.Thread(target=self._background_worker, daemon=True)
        self.worker_thread.start()
        
        logger.info("NotificationManager inicializiran")
    
    def _load_config(self) -> Dict[str, Any]:
        """Naloži konfiguracijo"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Napaka pri nalaganju konfiguracije: {e}")
        
        # Default konfiguracija
        return {
            "email": {
                "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
                "smtp_port": int(os.getenv("SMTP_PORT", "587")),
                "username": os.getenv("EMAIL_USERNAME", ""),
                "password": os.getenv("EMAIL_PASSWORD", ""),
                "from_email": os.getenv("FROM_EMAIL", "omni@example.com")
            },
            "webhook": {
                "default_url": os.getenv("WEBHOOK_URL", ""),
                "timeout": 10
            },
            "slack": {
                "webhook_url": os.getenv("SLACK_WEBHOOK", ""),
                "channel": os.getenv("SLACK_CHANNEL", "#alerts")
            },
            "telegram": {
                "bot_token": os.getenv("TELEGRAM_BOT_TOKEN", ""),
                "chat_id": os.getenv("TELEGRAM_CHAT_ID", "")
            }
        }
    
    def _init_channels(self):
        """Inicializiraj komunikacijske kanale"""
        self.channels = {
            NotificationChannel.EMAIL.value: EmailChannel(self.config.get("email", {})),
            NotificationChannel.WEBHOOK.value: WebhookChannel(self.config.get("webhook", {})),
            NotificationChannel.SLACK.value: SlackChannel(self.config.get("slack", {})),
            NotificationChannel.TELEGRAM.value: TelegramChannel(self.config.get("telegram", {}))
        }
    
    def _load_rules(self):
        """Naloži pravila obvestil"""
        rules_file = "data/config/notification_rules.json"
        try:
            if os.path.exists(rules_file):
                with open(rules_file, 'r', encoding='utf-8') as f:
                    rules_data = json.load(f)
                    for rule_data in rules_data:
                        rule = NotificationRule(**rule_data)
                        self.rules[rule.id] = rule
        except Exception as e:
            logger.error(f"Napaka pri nalaganju pravil: {e}")
            
        # Dodaj default pravila če ni nobenih
        if not self.rules:
            self._create_default_rules()
    
    def _create_default_rules(self):
        """Ustvari privzeta pravila"""
        default_rules = [
            NotificationRule(
                id="device_offline",
                name="Naprava offline",
                conditions=[
                    {"type": "device_status", "operator": "equals", "value": "offline"}
                ],
                channels=["email", "webhook"],
                level=NotificationLevel.ERROR.value,
                cooldown_minutes=30,
                recipients=["admin@example.com"]
            ),
            NotificationRule(
                id="high_temperature",
                name="Visoka temperatura",
                conditions=[
                    {"type": "sensor_value", "property": "temperature", "operator": "greater_than", "value": 30}
                ],
                channels=["email", "slack"],
                level=NotificationLevel.WARNING.value,
                cooldown_minutes=15,
                recipients=["admin@example.com"]
            ),
            NotificationRule(
                id="security_breach",
                name="Varnostni incident",
                conditions=[
                    {"type": "security_event", "operator": "equals", "value": "unauthorized_access"}
                ],
                channels=["email", "webhook", "telegram"],
                level=NotificationLevel.CRITICAL.value,
                cooldown_minutes=0,
                recipients=["admin@example.com", "security@example.com"]
            ),
            NotificationRule(
                id="automation_failure",
                name="Napaka avtomatizacije",
                conditions=[
                    {"type": "automation_status", "operator": "equals", "value": "failed"}
                ],
                channels=["email"],
                level=NotificationLevel.ERROR.value,
                cooldown_minutes=10,
                recipients=["admin@example.com"]
            )
        ]
        
        for rule in default_rules:
            self.rules[rule.id] = rule
        
        self._save_rules()
    
    def _save_rules(self):
        """Shrani pravila"""
        rules_file = "data/config/notification_rules.json"
        try:
            os.makedirs(os.path.dirname(rules_file), exist_ok=True)
            with open(rules_file, 'w', encoding='utf-8') as f:
                rules_data = [asdict(rule) for rule in self.rules.values()]
                json.dump(rules_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju pravil: {e}")
    
    def add_rule(self, rule: NotificationRule) -> bool:
        """Dodaj pravilo obvestil"""
        try:
            self.rules[rule.id] = rule
            self._save_rules()
            logger.info(f"Pravilo '{rule.name}' dodano")
            return True
        except Exception as e:
            logger.error(f"Napaka pri dodajanju pravila: {e}")
            return False
    
    def remove_rule(self, rule_id: str) -> bool:
        """Odstrani pravilo"""
        try:
            if rule_id in self.rules:
                del self.rules[rule_id]
                self._save_rules()
                logger.info(f"Pravilo '{rule_id}' odstranjeno")
                return True
            return False
        except Exception as e:
            logger.error(f"Napaka pri odstranjevanju pravila: {e}")
            return False
    
    def process_event(self, event: Dict[str, Any]) -> List[str]:
        """Procesiraj dogodek in pošlji obvestila"""
        triggered_notifications = []
        
        for rule in self.rules.values():
            if not rule.enabled:
                continue
                
            # Preveri cooldown
            if self._is_in_cooldown(rule.id):
                continue
            
            # Evalviraj pogoje
            if self._evaluate_conditions(rule.conditions, event):
                notification = self._create_notification(rule, event)
                if self._send_notification(notification):
                    triggered_notifications.append(notification.id)
                    self._set_cooldown(rule.id, rule.cooldown_minutes)
        
        return triggered_notifications
    
    def _evaluate_conditions(self, conditions: List[Dict[str, Any]], event: Dict[str, Any]) -> bool:
        """Evalviraj pogoje pravila"""
        for condition in conditions:
            if not self._evaluate_single_condition(condition, event):
                return False
        return True
    
    def _evaluate_single_condition(self, condition: Dict[str, Any], event: Dict[str, Any]) -> bool:
        """Evalviraj posamezen pogoj"""
        condition_type = condition.get("type")
        operator = condition.get("operator")
        expected_value = condition.get("value")
        
        if condition_type == "device_status":
            actual_value = event.get("device_status")
        elif condition_type == "sensor_value":
            property_name = condition.get("property")
            actual_value = event.get("sensor_data", {}).get(property_name)
        elif condition_type == "security_event":
            actual_value = event.get("security_event_type")
        elif condition_type == "automation_status":
            actual_value = event.get("automation_status")
        else:
            return False
        
        if actual_value is None:
            return False
        
        # Evalviraj operator
        if operator == "equals":
            return actual_value == expected_value
        elif operator == "greater_than":
            return float(actual_value) > float(expected_value)
        elif operator == "less_than":
            return float(actual_value) < float(expected_value)
        elif operator == "contains":
            return expected_value in str(actual_value)
        
        return False
    
    def _create_notification(self, rule: NotificationRule, event: Dict[str, Any]) -> Notification:
        """Ustvari obvestilo"""
        notification_id = f"notif_{rule.id}_{int(time.time())}"
        
        # Generiraj naslov in sporočilo
        title = f"IoT Alert: {rule.name}"
        message = self._generate_message(rule, event)
        
        notification = Notification(
            id=notification_id,
            title=title,
            message=message,
            level=rule.level,
            source=event.get("source", "unknown"),
            timestamp=datetime.now().isoformat(),
            channels=rule.channels,
            recipients=rule.recipients or [],
            metadata=event
        )
        
        self.notifications[notification_id] = notification
        return notification
    
    def _generate_message(self, rule: NotificationRule, event: Dict[str, Any]) -> str:
        """Generiraj sporočilo obvestila"""
        if rule.template:
            # Uporabi template
            return rule.template.format(**event)
        
        # Default sporočilo
        device = event.get("device_id", "Unknown device")
        timestamp = event.get("timestamp", datetime.now().isoformat())
        
        if rule.id == "device_offline":
            return f"Naprava {device} je offline od {timestamp}"
        elif rule.id == "high_temperature":
            temp = event.get("sensor_data", {}).get("temperature", "N/A")
            return f"Visoka temperatura na napravi {device}: {temp}°C"
        elif rule.id == "security_breach":
            return f"Varnostni incident na napravi {device}: {event.get('security_event_type', 'Unknown')}"
        elif rule.id == "automation_failure":
            return f"Napaka avtomatizacije: {event.get('error_message', 'Unknown error')}"
        
        return f"Dogodek na napravi {device}: {rule.name}"
    
    def _send_notification(self, notification: Notification) -> bool:
        """Pošlji obvestilo preko vseh kanalov"""
        success = True
        
        for channel_name in notification.channels:
            channel = self.channels.get(channel_name)
            if channel:
                try:
                    if channel.send(notification):
                        logger.info(f"Obvestilo {notification.id} poslano preko {channel_name}")
                    else:
                        logger.error(f"Napaka pri pošiljanju preko {channel_name}")
                        success = False
                except Exception as e:
                    logger.error(f"Napaka pri pošiljanju preko {channel_name}: {e}")
                    success = False
            else:
                logger.warning(f"Kanal {channel_name} ni na voljo")
                success = False
        
        notification.sent = success
        notification.attempts += 1
        return success
    
    def _is_in_cooldown(self, rule_id: str) -> bool:
        """Preveri ali je pravilo v cooldown obdobju"""
        if rule_id not in self.cooldowns:
            return False
        
        cooldown_until = self.cooldowns[rule_id]
        return datetime.now() < cooldown_until
    
    def _set_cooldown(self, rule_id: str, minutes: int):
        """Nastavi cooldown za pravilo"""
        if minutes > 0:
            self.cooldowns[rule_id] = datetime.now() + timedelta(minutes=minutes)
    
    def _background_worker(self):
        """Background worker za retry in cleanup"""
        while self.running:
            try:
                # Retry neuspešnih obvestil
                self._retry_failed_notifications()
                
                # Cleanup starih obvestil
                self._cleanup_old_notifications()
                
                # Cleanup cooldowns
                self._cleanup_cooldowns()
                
                time.sleep(60)  # Preveri vsako minuto
                
            except Exception as e:
                logger.error(f"Napaka v background worker: {e}")
                time.sleep(60)
    
    def _retry_failed_notifications(self):
        """Ponovno poskusi poslati neuspešna obvestila"""
        for notification in self.notifications.values():
            if not notification.sent and notification.attempts < 3:
                if self._send_notification(notification):
                    logger.info(f"Obvestilo {notification.id} uspešno poslano ob ponovnem poskusu")
    
    def _cleanup_old_notifications(self):
        """Počisti stara obvestila"""
        cutoff_time = datetime.now() - timedelta(days=7)
        to_remove = []
        
        for notif_id, notification in self.notifications.items():
            notif_time = datetime.fromisoformat(notification.timestamp)
            if notif_time < cutoff_time:
                to_remove.append(notif_id)
        
        for notif_id in to_remove:
            del self.notifications[notif_id]
    
    def _cleanup_cooldowns(self):
        """Počisti pretečene cooldowns"""
        now = datetime.now()
        to_remove = []
        
        for rule_id, cooldown_until in self.cooldowns.items():
            if now >= cooldown_until:
                to_remove.append(rule_id)
        
        for rule_id in to_remove:
            del self.cooldowns[rule_id]
    
    def get_notification_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Pridobi zgodovino obvestil"""
        notifications = list(self.notifications.values())
        notifications.sort(key=lambda x: x.timestamp, reverse=True)
        return [asdict(n) for n in notifications[:limit]]
    
    def get_active_rules(self) -> List[Dict[str, Any]]:
        """Pridobi aktivna pravila"""
        return [asdict(rule) for rule in self.rules.values() if rule.enabled]
    
    def stop(self):
        """Ustavi notification manager"""
        self.running = False
        if self.worker_thread.is_alive():
            self.worker_thread.join(timeout=5)
        logger.info("NotificationManager ustavljen")

class EmailChannel:
    """Email kanal za obvestila"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.enabled = bool(config.get("username") and config.get("password"))
    
    def send(self, notification: Notification) -> bool:
        """Pošlji email obvestilo"""
        if not self.enabled:
            return False
        
        try:
            msg = MIMEMultipart()
            msg['From'] = self.config['from_email']
            msg['Subject'] = notification.title
            
            # HTML body
            html_body = f"""
            <html>
            <body>
                <h2>{notification.title}</h2>
                <p><strong>Nivo:</strong> {notification.level.upper()}</p>
                <p><strong>Vir:</strong> {notification.source}</p>
                <p><strong>Čas:</strong> {notification.timestamp}</p>
                <hr>
                <p>{notification.message}</p>
                
                {self._format_metadata(notification.metadata) if notification.metadata else ''}
            </body>
            </html>
            """
            
            msg.attach(MIMEText(html_body, 'html'))
            
            # Pošlji vsem prejemnikom
            server = smtplib.SMTP(self.config['smtp_server'], self.config['smtp_port'])
            server.starttls()
            server.login(self.config['username'], self.config['password'])
            
            for recipient in notification.recipients:
                msg['To'] = recipient
                server.send_message(msg)
                del msg['To']
            
            server.quit()
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju emaila: {e}")
            return False
    
    def _format_metadata(self, metadata: Dict[str, Any]) -> str:
        """Formatiraj metadata za email"""
        if not metadata:
            return ""
        
        html = "<h3>Dodatne informacije:</h3><ul>"
        for key, value in metadata.items():
            html += f"<li><strong>{key}:</strong> {value}</li>"
        html += "</ul>"
        return html

class WebhookChannel:
    """Webhook kanal za obvestila"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.enabled = bool(config.get("default_url"))
    
    def send(self, notification: Notification) -> bool:
        """Pošlji webhook obvestilo"""
        if not self.enabled:
            return False
        
        try:
            payload = {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "level": notification.level,
                "source": notification.source,
                "timestamp": notification.timestamp,
                "metadata": notification.metadata
            }
            
            response = requests.post(
                self.config['default_url'],
                json=payload,
                timeout=self.config.get('timeout', 10),
                headers={'Content-Type': 'application/json'}
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju webhook: {e}")
            return False

class SlackChannel:
    """Slack kanal za obvestila"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.enabled = bool(config.get("webhook_url"))
    
    def send(self, notification: Notification) -> bool:
        """Pošlji Slack obvestilo"""
        if not self.enabled:
            return False
        
        try:
            # Določi barvo glede na nivo
            color_map = {
                "info": "#36a64f",
                "warning": "#ff9500",
                "error": "#ff0000",
                "critical": "#8b0000"
            }
            
            payload = {
                "channel": self.config.get("channel", "#alerts"),
                "username": "Omni IoT",
                "icon_emoji": ":robot_face:",
                "attachments": [{
                    "color": color_map.get(notification.level, "#36a64f"),
                    "title": notification.title,
                    "text": notification.message,
                    "fields": [
                        {"title": "Nivo", "value": notification.level.upper(), "short": True},
                        {"title": "Vir", "value": notification.source, "short": True},
                        {"title": "Čas", "value": notification.timestamp, "short": False}
                    ],
                    "footer": "Omni IoT System",
                    "ts": int(time.time())
                }]
            }
            
            response = requests.post(
                self.config['webhook_url'],
                json=payload,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju Slack obvestila: {e}")
            return False

class TelegramChannel:
    """Telegram kanal za obvestila"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.enabled = bool(config.get("bot_token") and config.get("chat_id"))
    
    def send(self, notification: Notification) -> bool:
        """Pošlji Telegram obvestilo"""
        if not self.enabled:
            return False
        
        try:
            # Emoji za različne nivoje
            emoji_map = {
                "info": "ℹ️",
                "warning": "⚠️",
                "error": "❌",
                "critical": "🚨"
            }
            
            emoji = emoji_map.get(notification.level, "ℹ️")
            
            message = f"{emoji} *{notification.title}*\n\n"
            message += f"*Nivo:* {notification.level.upper()}\n"
            message += f"*Vir:* {notification.source}\n"
            message += f"*Čas:* {notification.timestamp}\n\n"
            message += f"{notification.message}"
            
            url = f"https://api.telegram.org/bot{self.config['bot_token']}/sendMessage"
            payload = {
                "chat_id": self.config['chat_id'],
                "text": message,
                "parse_mode": "Markdown"
            }
            
            response = requests.post(url, json=payload, timeout=10)
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju Telegram obvestila: {e}")
            return False

# Globalna instanca
notification_manager = None

def init_notifications(config_file: str = "data/config/notifications.json") -> NotificationManager:
    """Inicializiraj notification manager"""
    global notification_manager
    if notification_manager is None:
        notification_manager = NotificationManager(config_file)
    return notification_manager

def send_alert(event: Dict[str, Any]) -> List[str]:
    """Pošlji alarm na podlagi dogodka"""
    global notification_manager
    if notification_manager is None:
        notification_manager = init_notifications()
    
    return notification_manager.process_event(event)

def add_notification_rule(rule: NotificationRule) -> bool:
    """Dodaj pravilo obvestil"""
    global notification_manager
    if notification_manager is None:
        notification_manager = init_notifications()
    
    return notification_manager.add_rule(rule)

def get_notification_history(limit: int = 100) -> List[Dict[str, Any]]:
    """Pridobi zgodovino obvestil"""
    global notification_manager
    if notification_manager is None:
        return []
    
    return notification_manager.get_notification_history(limit)

def __name__():
    return "iot_notifications"

# Test funkcije
if __name__ == "__main__":
    # Test notification sistema
    print("🔔 Testiram IoT Notification System...")
    
    # Inicializiraj
    manager = init_notifications()
    
    # Test dogodek - naprava offline
    test_event = {
        "device_id": "home/sensor/temp1",
        "device_status": "offline",
        "timestamp": datetime.now().isoformat(),
        "source": "monitoring_system"
    }
    
    print(f"Pošiljam test dogodek: {test_event}")
    triggered = send_alert(test_event)
    print(f"Sprožena obvestila: {triggered}")
    
    # Test dogodek - visoka temperatura
    temp_event = {
        "device_id": "home/sensor/temp1",
        "sensor_data": {"temperature": 32.5},
        "timestamp": datetime.now().isoformat(),
        "source": "sensor_monitoring"
    }
    
    print(f"Pošiljam temperaturni dogodek: {temp_event}")
    triggered = send_alert(temp_event)
    print(f"Sprožena obvestila: {triggered}")
    
    # Prikaži zgodovino
    history = get_notification_history(5)
    print(f"Zgodovina obvestil: {len(history)} zapisov")
    
    print("✅ Test notification sistema končan")