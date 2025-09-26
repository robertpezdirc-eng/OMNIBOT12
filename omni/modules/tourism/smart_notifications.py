"""
🔔 Smart Notifications System - Sistem pametnih obvestil
Napredni sistem za avtomatska opozorila, kritične zaloge, prodajne trende in pametne notifikacije
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta, date, time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import requests
import threading
import schedule
import time as time_module
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)

class NotificationType(Enum):
    CRITICAL_INVENTORY = "critical_inventory"
    LOW_STOCK = "low_stock"
    SALES_TREND = "sales_trend"
    PERFORMANCE_ALERT = "performance_alert"
    SYSTEM_ALERT = "system_alert"
    MAINTENANCE = "maintenance"
    CUSTOMER_FEEDBACK = "customer_feedback"
    REVENUE_MILESTONE = "revenue_milestone"
    STAFF_ALERT = "staff_alert"
    BOOKING_ALERT = "booking_alert"

class Priority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4
    URGENT = 5

class NotificationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    SLACK = "slack"
    WEBHOOK = "webhook"
    IN_APP = "in_app"

@dataclass
class NotificationRule:
    """Pravilo za obvestila"""
    rule_id: str
    name: str
    notification_type: NotificationType
    conditions: Dict[str, Any]
    channels: List[NotificationChannel]
    recipients: List[str]
    priority: Priority
    is_active: bool
    cooldown_minutes: int = 60  # Minimalni čas med obvestili
    template: str = ""

@dataclass
class Notification:
    """Obvestilo"""
    notification_id: str
    rule_id: str
    notification_type: NotificationType
    title: str
    message: str
    priority: Priority
    channels: List[NotificationChannel]
    recipients: List[str]
    data: Dict[str, Any]
    created_at: datetime
    sent_at: Optional[datetime] = None
    is_read: bool = False
    is_sent: bool = False

@dataclass
class AlertMetrics:
    """Metrike za opozorila"""
    metric_name: str
    current_value: float
    threshold_value: float
    comparison: str  # "greater_than", "less_than", "equals"
    trend_direction: str  # "up", "down", "stable"
    change_percentage: float

class SmartNotifications:
    """Sistem pametnih obvestil"""
    
    def __init__(self, db_path: str = "smart_notifications.db"):
        self.db_path = db_path
        self.notification_handlers = {}
        self.last_notification_times = defaultdict(datetime)
        self._init_database()
        self._setup_default_rules()
        self._start_monitoring()
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela pravil za obvestila
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS notification_rules (
                    rule_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    notification_type TEXT NOT NULL,
                    conditions TEXT NOT NULL,
                    channels TEXT NOT NULL,
                    recipients TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    cooldown_minutes INTEGER DEFAULT 60,
                    template TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela obvestil
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS notifications (
                    notification_id TEXT PRIMARY KEY,
                    rule_id TEXT NOT NULL,
                    notification_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    channels TEXT NOT NULL,
                    recipients TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    sent_at TEXT,
                    is_read BOOLEAN DEFAULT 0,
                    is_sent BOOLEAN DEFAULT 0,
                    FOREIGN KEY (rule_id) REFERENCES notification_rules (rule_id)
                )
            ''')
            
            # Tabela metrik
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS alert_metrics (
                    metric_id TEXT PRIMARY KEY,
                    metric_name TEXT NOT NULL,
                    current_value REAL NOT NULL,
                    previous_value REAL,
                    threshold_value REAL,
                    comparison TEXT NOT NULL,
                    trend_direction TEXT,
                    change_percentage REAL,
                    recorded_at TEXT NOT NULL
                )
            ''')
            
            # Tabela zgodovine obvestil
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS notification_history (
                    history_id TEXT PRIMARY KEY,
                    notification_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    status TEXT NOT NULL,
                    response_data TEXT,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (notification_id) REFERENCES notifications (notification_id)
                )
            ''')
            
            conn.commit()
            logger.info("🔔 Smart Notifications baza podatkov inicializirana")
    
    def _setup_default_rules(self):
        """Nastavi privzeta pravila za obvestila"""
        default_rules = [
            NotificationRule(
                rule_id="RULE_CRITICAL_INVENTORY",
                name="Kritične zaloge",
                notification_type=NotificationType.CRITICAL_INVENTORY,
                conditions={"stock_level": {"less_than": 5}},
                channels=[NotificationChannel.EMAIL, NotificationChannel.PUSH],
                recipients=["manager@restaurant.com"],
                priority=Priority.CRITICAL,
                is_active=True,
                cooldown_minutes=30,
                template="KRITIČNO: Zaloge artikla {item_name} so kritično nizke ({current_stock} kosov)!"
            ),
            NotificationRule(
                rule_id="RULE_LOW_STOCK",
                name="Nizke zaloge",
                notification_type=NotificationType.LOW_STOCK,
                conditions={"stock_level": {"less_than": 20}},
                channels=[NotificationChannel.EMAIL],
                recipients=["inventory@restaurant.com"],
                priority=Priority.HIGH,
                is_active=True,
                cooldown_minutes=120,
                template="Opozorilo: Zaloge artikla {item_name} so nizke ({current_stock} kosov)"
            ),
            NotificationRule(
                rule_id="RULE_SALES_SPIKE",
                name="Povečanje prodaje",
                notification_type=NotificationType.SALES_TREND,
                conditions={"sales_increase": {"greater_than": 50}},
                channels=[NotificationChannel.EMAIL, NotificationChannel.SLACK],
                recipients=["sales@restaurant.com"],
                priority=Priority.MEDIUM,
                is_active=True,
                cooldown_minutes=60,
                template="Odličo! Prodaja se je povečala za {percentage}% v zadnjih {period} urah"
            ),
            NotificationRule(
                rule_id="RULE_REVENUE_MILESTONE",
                name="Mejnik prihodkov",
                notification_type=NotificationType.REVENUE_MILESTONE,
                conditions={"daily_revenue": {"greater_than": 5000}},
                channels=[NotificationChannel.EMAIL, NotificationChannel.PUSH],
                recipients=["management@restaurant.com"],
                priority=Priority.MEDIUM,
                is_active=True,
                cooldown_minutes=1440,  # Enkrat na dan
                template="🎉 Čestitamo! Dnevni prihodki so presegli {amount}€!"
            ),
            NotificationRule(
                rule_id="RULE_BOOKING_CAPACITY",
                name="Visoka zasedenost rezervacij",
                notification_type=NotificationType.BOOKING_ALERT,
                conditions={"booking_capacity": {"greater_than": 90}},
                channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
                recipients=["reservations@restaurant.com"],
                priority=Priority.HIGH,
                is_active=True,
                cooldown_minutes=180,
                template="Opozorilo: Zasedenost rezervacij je {capacity}% za {date}"
            )
        ]
        
        for rule in default_rules:
            self.add_notification_rule(rule)
    
    def add_notification_rule(self, rule: NotificationRule) -> Dict[str, Any]:
        """Dodaj pravilo za obvestila"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO notification_rules 
                    (rule_id, name, notification_type, conditions, channels, recipients,
                     priority, is_active, cooldown_minutes, template, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    rule.rule_id,
                    rule.name,
                    rule.notification_type.value,
                    json.dumps(rule.conditions),
                    json.dumps([ch.value for ch in rule.channels]),
                    json.dumps(rule.recipients),
                    rule.priority.value,
                    rule.is_active,
                    rule.cooldown_minutes,
                    rule.template,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "rule_id": rule.rule_id,
                    "message": f"Pravilo '{rule.name}' uspešno dodano"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju pravila: {e}")
            return {"success": False, "error": str(e)}
    
    def create_notification(self, rule_id: str, title: str, message: str, 
                          data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Ustvari obvestilo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi pravilo
                cursor.execute('''
                    SELECT notification_type, channels, recipients, priority, cooldown_minutes
                    FROM notification_rules WHERE rule_id = ? AND is_active = 1
                ''', (rule_id,))
                
                rule_data = cursor.fetchone()
                if not rule_data:
                    return {"success": False, "error": "Pravilo ne obstaja ali ni aktivno"}
                
                notification_type, channels_json, recipients_json, priority, cooldown_minutes = rule_data
                
                # Preveri cooldown
                last_notification = self.last_notification_times.get(rule_id)
                if last_notification:
                    time_diff = datetime.now() - last_notification
                    if time_diff.total_seconds() < cooldown_minutes * 60:
                        return {"success": False, "error": "Cooldown period active"}
                
                # Ustvari obvestilo
                notification_id = f"NOTIF_{rule_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                notification = Notification(
                    notification_id=notification_id,
                    rule_id=rule_id,
                    notification_type=NotificationType(notification_type),
                    title=title,
                    message=message,
                    priority=Priority(priority),
                    channels=[NotificationChannel(ch) for ch in json.loads(channels_json)],
                    recipients=json.loads(recipients_json),
                    data=data or {},
                    created_at=datetime.now()
                )
                
                # Shrani obvestilo
                cursor.execute('''
                    INSERT INTO notifications 
                    (notification_id, rule_id, notification_type, title, message,
                     priority, channels, recipients, data, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    notification.notification_id,
                    notification.rule_id,
                    notification.notification_type.value,
                    notification.title,
                    notification.message,
                    notification.priority.value,
                    json.dumps([ch.value for ch in notification.channels]),
                    json.dumps(notification.recipients),
                    json.dumps(notification.data),
                    notification.created_at.isoformat()
                ))
                
                conn.commit()
                
                # Pošlji obvestilo
                self._send_notification(notification)
                
                # Posodobi čas zadnjega obvestila
                self.last_notification_times[rule_id] = datetime.now()
                
                return {
                    "success": True,
                    "notification_id": notification_id,
                    "message": "Obvestilo uspešno ustvarjeno in poslano"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju obvestila: {e}")
            return {"success": False, "error": str(e)}
    
    def _send_notification(self, notification: Notification):
        """Pošlji obvestilo preko različnih kanalov"""
        for channel in notification.channels:
            try:
                if channel == NotificationChannel.EMAIL:
                    self._send_email(notification)
                elif channel == NotificationChannel.SMS:
                    self._send_sms(notification)
                elif channel == NotificationChannel.PUSH:
                    self._send_push_notification(notification)
                elif channel == NotificationChannel.SLACK:
                    self._send_slack_notification(notification)
                elif channel == NotificationChannel.WEBHOOK:
                    self._send_webhook(notification)
                
                # Zabeleži uspešno pošiljanje
                self._log_notification_history(
                    notification.notification_id, 
                    "sent", 
                    channel.value, 
                    "success"
                )
                
            except Exception as e:
                logger.error(f"Napaka pri pošiljanju preko {channel.value}: {e}")
                self._log_notification_history(
                    notification.notification_id, 
                    "failed", 
                    channel.value, 
                    "error",
                    {"error": str(e)}
                )
    
    def _send_email(self, notification: Notification):
        """Pošlji e-mail obvestilo"""
        # Simulacija pošiljanja e-maila
        logger.info(f"📧 E-mail poslano: {notification.title} -> {notification.recipients}")
        
        # V produkciji bi uporabili pravi SMTP
        # smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
        # smtp_server.starttls()
        # smtp_server.login(email, password)
        # smtp_server.send_message(msg)
        # smtp_server.quit()
    
    def _send_sms(self, notification: Notification):
        """Pošlji SMS obvestilo"""
        # Simulacija pošiljanja SMS
        logger.info(f"📱 SMS poslano: {notification.title} -> {notification.recipients}")
        
        # V produkciji bi uporabili SMS API (Twilio, Nexmo, itd.)
    
    def _send_push_notification(self, notification: Notification):
        """Pošlji push obvestilo"""
        # Simulacija push obvestila
        logger.info(f"🔔 Push obvestilo: {notification.title}")
        
        # V produkciji bi uporabili Firebase Cloud Messaging ali podobno
    
    def _send_slack_notification(self, notification: Notification):
        """Pošlji Slack obvestilo"""
        # Simulacija Slack obvestila
        logger.info(f"💬 Slack obvestilo: {notification.title}")
        
        # V produkciji bi uporabili Slack Webhook API
        # webhook_url = "https://hooks.slack.com/services/..."
        # payload = {"text": notification.message}
        # requests.post(webhook_url, json=payload)
    
    def _send_webhook(self, notification: Notification):
        """Pošlji webhook obvestilo"""
        # Simulacija webhook klica
        logger.info(f"🔗 Webhook obvestilo: {notification.title}")
        
        # V produkciji bi poslali HTTP POST zahtevo
        # requests.post(webhook_url, json=asdict(notification))
    
    def _log_notification_history(self, notification_id: str, action: str, 
                                 channel: str, status: str, response_data: Dict = None):
        """Zabeleži zgodovino obvestil"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            history_id = f"HIST_{notification_id}_{channel}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            cursor.execute('''
                INSERT INTO notification_history 
                (history_id, notification_id, action, channel, status, response_data, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                history_id,
                notification_id,
                action,
                channel,
                status,
                json.dumps(response_data or {}),
                datetime.now().isoformat()
            ))
            
            conn.commit()
    
    def check_inventory_alerts(self, inventory_data: List[Dict[str, Any]]):
        """Preveri opozorila za zaloge"""
        for item in inventory_data:
            item_name = item.get('name', 'Neznani artikel')
            current_stock = item.get('quantity', 0)
            min_stock = item.get('min_quantity', 10)
            
            # Kritične zaloge
            if current_stock <= 5:
                self.create_notification(
                    "RULE_CRITICAL_INVENTORY",
                    f"KRITIČNE ZALOGE: {item_name}",
                    f"Zaloge artikla {item_name} so kritično nizke ({current_stock} kosov)!",
                    {
                        "item_name": item_name,
                        "current_stock": current_stock,
                        "min_stock": min_stock,
                        "item_id": item.get('id')
                    }
                )
            
            # Nizke zaloge
            elif current_stock <= min_stock:
                self.create_notification(
                    "RULE_LOW_STOCK",
                    f"Nizke zaloge: {item_name}",
                    f"Zaloge artikla {item_name} so nizke ({current_stock} kosov)",
                    {
                        "item_name": item_name,
                        "current_stock": current_stock,
                        "min_stock": min_stock,
                        "item_id": item.get('id')
                    }
                )
    
    def check_sales_trends(self, sales_data: Dict[str, Any]):
        """Preveri prodajne trende"""
        current_sales = sales_data.get('current_period', 0)
        previous_sales = sales_data.get('previous_period', 0)
        
        if previous_sales > 0:
            change_percentage = ((current_sales - previous_sales) / previous_sales) * 100
            
            # Povečanje prodaje
            if change_percentage >= 50:
                self.create_notification(
                    "RULE_SALES_SPIKE",
                    "Odličo! Povečanje prodaje",
                    f"Prodaja se je povečala za {change_percentage:.1f}% v zadnjih {sales_data.get('period', '24')} urah",
                    {
                        "percentage": round(change_percentage, 1),
                        "period": sales_data.get('period', '24'),
                        "current_sales": current_sales,
                        "previous_sales": previous_sales
                    }
                )
            
            # Zmanjšanje prodaje
            elif change_percentage <= -30:
                self.create_notification(
                    "RULE_SALES_DECLINE",
                    "Opozorilo: Zmanjšanje prodaje",
                    f"Prodaja se je zmanjšala za {abs(change_percentage):.1f}% v zadnjih {sales_data.get('period', '24')} urah",
                    {
                        "percentage": round(abs(change_percentage), 1),
                        "period": sales_data.get('period', '24'),
                        "current_sales": current_sales,
                        "previous_sales": previous_sales
                    }
                )
    
    def check_revenue_milestones(self, daily_revenue: float):
        """Preveri mejnike prihodkov"""
        milestones = [1000, 2500, 5000, 10000, 15000, 20000]
        
        for milestone in milestones:
            if daily_revenue >= milestone:
                # Preveri, ali je bilo obvestilo že poslano danes
                today = date.today().isoformat()
                rule_id = f"RULE_REVENUE_MILESTONE_{milestone}"
                
                if rule_id not in self.last_notification_times or \
                   self.last_notification_times[rule_id].date() < date.today():
                    
                    self.create_notification(
                        "RULE_REVENUE_MILESTONE",
                        f"🎉 Mejnik prihodkov dosežen!",
                        f"Čestitamo! Dnevni prihodki so presegli {milestone}€! Trenutno: {daily_revenue:.2f}€",
                        {
                            "amount": milestone,
                            "current_revenue": daily_revenue,
                            "date": today
                        }
                    )
                    
                    self.last_notification_times[rule_id] = datetime.now()
                    break  # Pošlji samo za najvišji doseženi mejnik
    
    def check_booking_capacity(self, booking_data: Dict[str, Any]):
        """Preveri zasedenost rezervacij"""
        capacity_percentage = booking_data.get('capacity_percentage', 0)
        booking_date = booking_data.get('date', date.today().isoformat())
        
        if capacity_percentage >= 90:
            self.create_notification(
                "RULE_BOOKING_CAPACITY",
                "Visoka zasedenost rezervacij",
                f"Opozorilo: Zasedenost rezervacij je {capacity_percentage}% za {booking_date}",
                {
                    "capacity": capacity_percentage,
                    "date": booking_date,
                    "available_slots": booking_data.get('available_slots', 0),
                    "total_slots": booking_data.get('total_slots', 0)
                }
            )
    
    def record_metric(self, metric: AlertMetrics):
        """Zabeleži metriko za opozorila"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            metric_id = f"METRIC_{metric.metric_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            cursor.execute('''
                INSERT INTO alert_metrics 
                (metric_id, metric_name, current_value, threshold_value, comparison,
                 trend_direction, change_percentage, recorded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                metric_id,
                metric.metric_name,
                metric.current_value,
                metric.threshold_value,
                metric.comparison,
                metric.trend_direction,
                metric.change_percentage,
                datetime.now().isoformat()
            ))
            
            conn.commit()
    
    def get_active_notifications(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Pridobi aktivna obvestila"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT notification_id, rule_id, notification_type, title, message,
                       priority, channels, recipients, data, created_at, is_read
                FROM notifications 
                ORDER BY priority DESC, created_at DESC
                LIMIT ?
            ''', (limit,))
            
            notifications = []
            for row in cursor.fetchall():
                notifications.append({
                    "notification_id": row[0],
                    "rule_id": row[1],
                    "notification_type": row[2],
                    "title": row[3],
                    "message": row[4],
                    "priority": row[5],
                    "channels": json.loads(row[6]),
                    "recipients": json.loads(row[7]),
                    "data": json.loads(row[8]),
                    "created_at": row[9],
                    "is_read": bool(row[10])
                })
            
            return notifications
    
    def mark_notification_read(self, notification_id: str) -> Dict[str, Any]:
        """Označi obvestilo kot prebrano"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE notifications SET is_read = 1 WHERE notification_id = ?
                ''', (notification_id,))
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Obvestilo označeno kot prebrano"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri označevanju obvestila: {e}")
            return {"success": False, "error": str(e)}
    
    def get_notification_statistics(self) -> Dict[str, Any]:
        """Pridobi statistike obvestil"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Skupno število obvestil
            cursor.execute('SELECT COUNT(*) FROM notifications')
            total_notifications = cursor.fetchone()[0]
            
            # Obvestila po tipih
            cursor.execute('''
                SELECT notification_type, COUNT(*) 
                FROM notifications 
                GROUP BY notification_type
            ''')
            by_type = dict(cursor.fetchall())
            
            # Obvestila po prioriteti
            cursor.execute('''
                SELECT priority, COUNT(*) 
                FROM notifications 
                GROUP BY priority
            ''')
            by_priority = dict(cursor.fetchall())
            
            # Neprebrana obvestila
            cursor.execute('SELECT COUNT(*) FROM notifications WHERE is_read = 0')
            unread_count = cursor.fetchone()[0]
            
            # Obvestila zadnji teden
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            cursor.execute('''
                SELECT COUNT(*) FROM notifications WHERE created_at >= ?
            ''', (week_ago,))
            last_week_count = cursor.fetchone()[0]
            
            return {
                "total_notifications": total_notifications,
                "unread_notifications": unread_count,
                "last_week_notifications": last_week_count,
                "by_type": by_type,
                "by_priority": by_priority,
                "generated_at": datetime.now().isoformat()
            }
    
    def _start_monitoring(self):
        """Zaženi monitoring sistem"""
        def run_scheduler():
            while True:
                schedule.run_pending()
                time_module.sleep(60)  # Preveri vsako minuto
        
        # Nastavi razporede
        schedule.every(5).minutes.do(self._check_system_health)
        schedule.every(15).minutes.do(self._check_automated_alerts)
        schedule.every().hour.do(self._cleanup_old_notifications)
        
        # Zaženi scheduler v ločeni niti
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        
        logger.info("🔔 Smart Notifications monitoring zagnan")
    
    def _check_system_health(self):
        """Preveri zdravje sistema"""
        # Simulacija preverjanja sistema
        logger.info("🔍 Preverjam zdravje sistema...")
        
        # V produkciji bi preverili:
        # - Porabo pomnilnika
        # - Porabo diska
        # - Odzivnost baze podatkov
        # - Status zunanjih storitev
    
    def _check_automated_alerts(self):
        """Preveri avtomatska opozorila"""
        logger.info("🤖 Preverjam avtomatska opozorila...")
        
        # Simulacija podatkov za testiranje
        # V produkciji bi pridobili prave podatke iz sistema
        
        # Test zalog
        test_inventory = [
            {"id": "ITEM001", "name": "Paradižnik", "quantity": 3, "min_quantity": 10},
            {"id": "ITEM002", "name": "Mozzarella", "quantity": 25, "min_quantity": 20}
        ]
        self.check_inventory_alerts(test_inventory)
        
        # Test prodaje
        test_sales = {
            "current_period": 1200,
            "previous_period": 800,
            "period": "24"
        }
        self.check_sales_trends(test_sales)
    
    def _cleanup_old_notifications(self):
        """Počisti stara obvestila"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Izbriši obvestila starejša od 30 dni
                cutoff_date = (datetime.now() - timedelta(days=30)).isoformat()
                
                cursor.execute('''
                    DELETE FROM notifications WHERE created_at < ?
                ''', (cutoff_date,))
                
                deleted_count = cursor.rowcount
                conn.commit()
                
                if deleted_count > 0:
                    logger.info(f"🧹 Počiščenih {deleted_count} starih obvestil")
                    
        except Exception as e:
            logger.error(f"Napaka pri čiščenju obvestil: {e}")

# Primer uporabe
if __name__ == "__main__":
    notifications = SmartNotifications()
    
    # Test kritičnih zalog
    test_inventory = [
        {"id": "ITEM001", "name": "Paradižnik", "quantity": 2, "min_quantity": 10},
        {"id": "ITEM002", "name": "Mozzarella", "quantity": 15, "min_quantity": 20}
    ]
    
    notifications.check_inventory_alerts(test_inventory)
    
    # Test prodajnih trendov
    test_sales = {
        "current_period": 1500,
        "previous_period": 1000,
        "period": "24"
    }
    
    notifications.check_sales_trends(test_sales)
    
    # Test mejnikov prihodkov
    notifications.check_revenue_milestones(5500.0)
    
    # Pridobi aktivna obvestila
    active_notifications = notifications.get_active_notifications()
    print(f"Aktivna obvestila: {len(active_notifications)}")
    
    for notif in active_notifications:
        print(f"- {notif['title']}: {notif['message']}")
    
    # Statistike
    stats = notifications.get_notification_statistics()
    print(f"Statistike obvestil: {json.dumps(stats, indent=2, ensure_ascii=False)}")
    
    # Počakaj malo, da se monitoring zažene
    time_module.sleep(2)
    print("🔔 Smart Notifications sistem je aktiven!")