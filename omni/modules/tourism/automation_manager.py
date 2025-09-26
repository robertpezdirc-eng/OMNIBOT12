"""
🔄 AUTOMATION MANAGER
Sistem za avtomatizacijo procesov v gostinstvu in turizmu

Funkcionalnosti:
- Avtomatsko naročanje zalog
- Kadrovski management (urniki, plače)
- Smart notifikacije
- Avtomatska poročila
- Workflow avtomatizacija
- Integracija s tretjimi sistemi
"""

import asyncio
import smtplib
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from email.mime.text import MIMEText as MimeText
from email.mime.multipart import MIMEMultipart as MimeMultipart
import logging
import threading
import time
import requests
from enum import Enum

logger = logging.getLogger(__name__)

class NotificationType(Enum):
    LOW_STOCK = "low_stock"
    HIGH_DEMAND = "high_demand"
    STAFF_SHORTAGE = "staff_shortage"
    FINANCIAL_ALERT = "financial_alert"
    CUSTOMER_COMPLAINT = "customer_complaint"
    SYSTEM_ERROR = "system_error"

class AutomationTrigger(Enum):
    TIME_BASED = "time_based"
    EVENT_BASED = "event_based"
    THRESHOLD_BASED = "threshold_based"
    CONDITION_BASED = "condition_based"

@dataclass
class AutomationRule:
    """Pravilo za avtomatizacijo"""
    id: str
    name: str
    trigger_type: AutomationTrigger
    conditions: Dict
    actions: List[Dict]
    enabled: bool = True
    last_executed: Optional[datetime] = None
    execution_count: int = 0

@dataclass
class StockOrder:
    """Naročilo zalog"""
    id: str
    supplier_id: str
    items: List[Dict]
    total_amount: float
    order_date: datetime
    expected_delivery: datetime
    status: str = "pending"
    notes: str = ""

@dataclass
class StaffSchedule:
    """Urnik osebja"""
    id: str
    employee_id: str
    date: datetime
    shift_start: str
    shift_end: str
    position: str
    status: str = "scheduled"
    notes: str = ""

@dataclass
class Notification:
    """Notifikacija"""
    id: str
    type: NotificationType
    title: str
    message: str
    priority: str  # low, medium, high, critical
    timestamp: datetime
    recipients: List[str]
    sent: bool = False
    data: Dict = None

class AutomationManager:
    """Manager za avtomatizacijo procesov"""
    
    def __init__(self, db_path: str = "tourism_premium.db"):
        self.db_path = db_path
        self.automation_rules = {}
        self.notification_queue = []
        self.running = False
        self.email_config = {}
        self.webhook_urls = {}
        
        # Inicializiraj bazo
        self._init_automation_database()
        
        # Naloži pravila
        self._load_automation_rules()
        
        logger.info("🔄 Automation Manager inicializiran")
    
    def _init_automation_database(self):
        """Inicializiraj tabele za avtomatizacijo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Avtomatizacijska pravila
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS automation_rules (
                id TEXT PRIMARY KEY,
                name TEXT,
                trigger_type TEXT,
                conditions TEXT,
                actions TEXT,
                enabled BOOLEAN,
                last_executed TEXT,
                execution_count INTEGER
            )
        ''')
        
        # Naročila zalog
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stock_orders (
                id TEXT PRIMARY KEY,
                supplier_id TEXT,
                items TEXT,
                total_amount REAL,
                order_date TEXT,
                expected_delivery TEXT,
                status TEXT,
                notes TEXT
            )
        ''')
        
        # Urniki osebja
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS staff_schedules (
                id TEXT PRIMARY KEY,
                employee_id TEXT,
                date TEXT,
                shift_start TEXT,
                shift_end TEXT,
                position TEXT,
                status TEXT,
                notes TEXT
            )
        ''')
        
        # Notifikacije
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                type TEXT,
                title TEXT,
                message TEXT,
                priority TEXT,
                timestamp TEXT,
                recipients TEXT,
                sent BOOLEAN,
                data TEXT
            )
        ''')
        
        # Osebje
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS staff (
                id TEXT PRIMARY KEY,
                name TEXT,
                position TEXT,
                email TEXT,
                phone TEXT,
                hourly_rate REAL,
                max_hours_per_week INTEGER,
                availability TEXT,
                active BOOLEAN
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _load_automation_rules(self):
        """Naloži avtomatizacijska pravila"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM automation_rules WHERE enabled = 1')
        rules = cursor.fetchall()
        
        for rule_data in rules:
            rule = AutomationRule(
                id=rule_data[0],
                name=rule_data[1],
                trigger_type=AutomationTrigger(rule_data[2]),
                conditions=json.loads(rule_data[3]),
                actions=json.loads(rule_data[4]),
                enabled=bool(rule_data[5]),
                last_executed=datetime.fromisoformat(rule_data[6]) if rule_data[6] else None,
                execution_count=rule_data[7]
            )
            self.automation_rules[rule.id] = rule
        
        conn.close()
        logger.info(f"📋 Naloženo {len(self.automation_rules)} avtomatizacijskih pravil")
    
    # ==================== AVTOMATSKO NAROČANJE ZALOG ====================
    
    def setup_auto_inventory_ordering(self):
        """Nastavi avtomatsko naročanje zalog"""
        rule = AutomationRule(
            id="auto_inventory_order",
            name="Avtomatsko naročanje zalog",
            trigger_type=AutomationTrigger.THRESHOLD_BASED,
            conditions={
                "check_interval": 3600,  # Vsako uro
                "stock_threshold": "min_stock",
                "supplier_availability": True
            },
            actions=[
                {"type": "check_stock_levels"},
                {"type": "create_purchase_orders"},
                {"type": "notify_management"}
            ]
        )
        
        self._save_automation_rule(rule)
        self.automation_rules[rule.id] = rule
        
        logger.info("📦 Avtomatsko naročanje zalog nastavljeno")
    
    def check_and_order_inventory(self) -> List[StockOrder]:
        """Preveri zaloge in ustvari naročila"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Najdi izdelke z nizko zalogo
        cursor.execute('''
            SELECT i.*, s.name as supplier_name, s.email as supplier_email
            FROM inventory i
            JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.current_stock <= i.min_stock
            AND i.supplier_id IS NOT NULL
        ''')
        
        low_stock_items = cursor.fetchall()
        orders = []
        
        # Grupiranje po dobaviteljih
        supplier_items = {}
        for item in low_stock_items:
            supplier_id = item[9]  # supplier_id
            if supplier_id not in supplier_items:
                supplier_items[supplier_id] = []
            
            order_quantity = item[5] - item[3]  # max_stock - current_stock
            supplier_items[supplier_id].append({
                'item_id': item[0],
                'name': item[1],
                'quantity': order_quantity,
                'unit_cost': item[7],
                'total_cost': order_quantity * item[7]
            })
        
        # Ustvari naročila
        for supplier_id, items in supplier_items.items():
            order = self._create_stock_order(supplier_id, items)
            orders.append(order)
            
            # Pošlji naročilo dobavitelju
            self._send_order_to_supplier(order)
        
        conn.close()
        logger.info(f"📋 Ustvarjeno {len(orders)} naročil zalog")
        return orders
    
    def _create_stock_order(self, supplier_id: str, items: List[Dict]) -> StockOrder:
        """Ustvari naročilo zalog"""
        order_id = f"ORD_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        total_amount = sum(item['total_cost'] for item in items)
        
        order = StockOrder(
            id=order_id,
            supplier_id=supplier_id,
            items=items,
            total_amount=total_amount,
            order_date=datetime.now(),
            expected_delivery=datetime.now() + timedelta(days=3),  # Predvidena dostava v 3 dneh
            status="pending"
        )
        
        # Shrani v bazo
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO stock_orders 
            (id, supplier_id, items, total_amount, order_date, expected_delivery, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            order.id, order.supplier_id, json.dumps(order.items),
            order.total_amount, order.order_date.isoformat(),
            order.expected_delivery.isoformat(), order.status, order.notes
        ))
        
        conn.commit()
        conn.close()
        
        return order
    
    def _send_order_to_supplier(self, order: StockOrder):
        """Pošlji naročilo dobavitelju"""
        # Pridobi podatke dobavitelja
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM suppliers WHERE id = ?', (order.supplier_id,))
        supplier = cursor.fetchone()
        conn.close()
        
        if not supplier:
            logger.error(f"Dobavitelj {order.supplier_id} ni najden")
            return
        
        # Pripravi email
        subject = f"Naročilo #{order.id}"
        body = self._generate_order_email(order, supplier)
        
        # Pošlji email
        self._send_email(supplier[3], subject, body)  # supplier[3] = email
        
        # Ustvari notifikacijo
        self._create_notification(
            NotificationType.LOW_STOCK,
            f"Naročilo poslano: {supplier[1]}",
            f"Naročilo #{order.id} poslano dobavitelju {supplier[1]} v vrednosti {order.total_amount}€",
            "medium",
            ["management@restaurant.com"]
        )
    
    def _generate_order_email(self, order: StockOrder, supplier: tuple) -> str:
        """Generiraj email za naročilo"""
        items_text = "\n".join([
            f"- {item['name']}: {item['quantity']} {item.get('unit', 'kos')} @ {item['unit_cost']}€ = {item['total_cost']}€"
            for item in order.items
        ])
        
        return f"""
Spoštovani {supplier[2]},

prosimo za dostavo naslednjih izdelkov:

{items_text}

SKUPAJ: {order.total_amount}€

Želena dostava: {order.expected_delivery.strftime('%d.%m.%Y')}
Naročilo št.: {order.id}

Lep pozdrav,
Avtomatski sistem naročanja
        """.strip()
    
    # ==================== KADROVSKI MANAGEMENT ====================
    
    def setup_staff_management(self):
        """Nastavi kadrovski management"""
        rule = AutomationRule(
            id="staff_scheduling",
            name="Avtomatsko razporejanje osebja",
            trigger_type=AutomationTrigger.TIME_BASED,
            conditions={
                "schedule_time": "06:00",  # Vsak dan ob 6:00
                "days_ahead": 7  # Razporedi za naslednji teden
            },
            actions=[
                {"type": "generate_schedules"},
                {"type": "check_staff_availability"},
                {"type": "notify_staff"}
            ]
        )
        
        self._save_automation_rule(rule)
        self.automation_rules[rule.id] = rule
        
        logger.info("👥 Kadrovski management nastavljen")
    
    def generate_staff_schedules(self, start_date: datetime, days: int = 7) -> List[StaffSchedule]:
        """Generiraj urnike osebja"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pridobi aktivno osebje
        cursor.execute('SELECT * FROM staff WHERE active = 1')
        staff_members = cursor.fetchall()
        
        schedules = []
        
        for day_offset in range(days):
            current_date = start_date + timedelta(days=day_offset)
            day_name = current_date.strftime('%A').lower()
            
            # Določi potrebe po osebju glede na dan
            staff_needs = self._calculate_staff_needs(current_date)
            
            # Razporedi osebje
            assigned_staff = self._assign_staff_to_shifts(staff_members, current_date, staff_needs)
            
            for assignment in assigned_staff:
                schedule = StaffSchedule(
                    id=f"SCH_{current_date.strftime('%Y%m%d')}_{assignment['employee_id']}",
                    employee_id=assignment['employee_id'],
                    date=current_date,
                    shift_start=assignment['shift_start'],
                    shift_end=assignment['shift_end'],
                    position=assignment['position']
                )
                
                schedules.append(schedule)
                self._save_staff_schedule(schedule)
        
        conn.close()
        logger.info(f"📅 Generirano {len(schedules)} urnikov")
        return schedules
    
    def _calculate_staff_needs(self, date: datetime) -> Dict:
        """Izračunaj potrebe po osebju"""
        day_of_week = date.weekday()  # 0 = ponedeljek
        is_weekend = day_of_week >= 5
        
        # Osnovna potreba po osebju
        base_needs = {
            "waiter": 2 if not is_weekend else 3,
            "cook": 1 if not is_weekend else 2,
            "bartender": 1,
            "manager": 1
        }
        
        # Prilagodi glede na napovedi obiskanosti
        # (Tu bi lahko integrirali AI napovedi)
        multiplier = 1.3 if is_weekend else 1.0
        
        return {position: int(count * multiplier) for position, count in base_needs.items()}
    
    def _assign_staff_to_shifts(self, staff_members: List, date: datetime, needs: Dict) -> List[Dict]:
        """Razporedi osebje na izmene"""
        assignments = []
        day_name = date.strftime('%A').lower()
        
        # Definiraj izmene
        shifts = [
            {"name": "morning", "start": "08:00", "end": "16:00"},
            {"name": "evening", "start": "16:00", "end": "24:00"}
        ]
        
        for position, needed_count in needs.items():
            # Najdi razpoložljivo osebje za to pozicijo
            available_staff = [
                staff for staff in staff_members 
                if staff[2] == position  # position column
            ]
            
            # Razporedi na izmene
            assigned_count = 0
            for shift in shifts:
                if assigned_count >= needed_count:
                    break
                
                for staff_member in available_staff:
                    if assigned_count >= needed_count:
                        break
                    
                    # Preveri razpoložljivost (simulacija)
                    if self._is_staff_available(staff_member[0], date, shift):
                        assignments.append({
                            "employee_id": staff_member[0],
                            "position": position,
                            "shift_start": shift["start"],
                            "shift_end": shift["end"]
                        })
                        assigned_count += 1
        
        return assignments
    
    def _is_staff_available(self, employee_id: str, date: datetime, shift: Dict) -> bool:
        """Preveri razpoložljivost osebja"""
        # Simulacija preverjanja razpoložljivosti
        # V resničnem sistemu bi preverili:
        # - Dopust
        # - Bolniška
        # - Že razporejene izmene
        # - Maksimalne ure na teden
        return True
    
    def _save_staff_schedule(self, schedule: StaffSchedule):
        """Shrani urnik osebja"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO staff_schedules 
            (id, employee_id, date, shift_start, shift_end, position, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            schedule.id, schedule.employee_id, schedule.date.isoformat(),
            schedule.shift_start, schedule.shift_end, schedule.position,
            schedule.status, schedule.notes
        ))
        
        conn.commit()
        conn.close()
    
    # ==================== SMART NOTIFIKACIJE ====================
    
    def _create_notification(self, notification_type: NotificationType, title: str,
                           message: str, priority: str, recipients: List[str],
                           data: Dict = None):
        """Ustvari notifikacijo"""
        notification = Notification(
            id=f"NOT_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{notification_type.value}",
            type=notification_type,
            title=title,
            message=message,
            priority=priority,
            timestamp=datetime.now(),
            recipients=recipients,
            data=data or {}
        )
        
        # Shrani v bazo
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO notifications 
            (id, type, title, message, priority, timestamp, recipients, sent, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            notification.id, notification.type.value, notification.title,
            notification.message, notification.priority, notification.timestamp.isoformat(),
            json.dumps(notification.recipients), notification.sent,
            json.dumps(notification.data)
        ))
        
        conn.commit()
        conn.close()
        
        # Dodaj v queue za pošiljanje
        self.notification_queue.append(notification)
        
        logger.info(f"🔔 Ustvarjena notifikacija: {title}")
    
    def process_notifications(self):
        """Procesiraj notifikacije v queue"""
        while self.notification_queue:
            notification = self.notification_queue.pop(0)
            
            try:
                # Pošlji glede na prioriteto
                if notification.priority == "critical":
                    self._send_immediate_notification(notification)
                else:
                    self._send_standard_notification(notification)
                
                # Označi kot poslano
                self._mark_notification_sent(notification.id)
                
            except Exception as e:
                logger.error(f"Napaka pri pošiljanju notifikacije {notification.id}: {e}")
    
    def _send_immediate_notification(self, notification: Notification):
        """Pošlji takojšnjo notifikacijo"""
        # Email
        for recipient in notification.recipients:
            self._send_email(recipient, f"🚨 KRITIČNO: {notification.title}", notification.message)
        
        # SMS (simulacija)
        self._send_sms_notification(notification)
        
        # Webhook
        self._send_webhook_notification(notification)
    
    def _send_standard_notification(self, notification: Notification):
        """Pošlji standardno notifikacijo"""
        for recipient in notification.recipients:
            self._send_email(recipient, notification.title, notification.message)
    
    def _send_email(self, recipient: str, subject: str, body: str):
        """Pošlji email"""
        try:
            if not self.email_config:
                logger.warning("Email konfiguracija ni nastavljena")
                return
            
            msg = MimeMultipart()
            msg['From'] = self.email_config.get('from_email', 'system@restaurant.com')
            msg['To'] = recipient
            msg['Subject'] = subject
            
            msg.attach(MimeText(body, 'plain', 'utf-8'))
            
            # Simulacija pošiljanja
            logger.info(f"📧 Email poslan: {recipient} - {subject}")
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju emaila: {e}")
    
    def _send_sms_notification(self, notification: Notification):
        """Pošlji SMS notifikacijo"""
        # Simulacija SMS pošiljanja
        logger.info(f"📱 SMS poslan: {notification.title}")
    
    def _send_webhook_notification(self, notification: Notification):
        """Pošlji webhook notifikacijo"""
        if not self.webhook_urls:
            return
        
        payload = {
            "type": notification.type.value,
            "title": notification.title,
            "message": notification.message,
            "priority": notification.priority,
            "timestamp": notification.timestamp.isoformat(),
            "data": notification.data
        }
        
        for webhook_url in self.webhook_urls.values():
            try:
                requests.post(webhook_url, json=payload, timeout=10)
                logger.info(f"🔗 Webhook poslan: {webhook_url}")
            except Exception as e:
                logger.error(f"Napaka pri pošiljanju webhook: {e}")
    
    def _mark_notification_sent(self, notification_id: str):
        """Označi notifikacijo kot poslano"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('UPDATE notifications SET sent = 1 WHERE id = ?', (notification_id,))
        conn.commit()
        conn.close()
    
    # ==================== AVTOMATSKA POROČILA ====================
    
    def setup_automated_reports(self):
        """Nastavi avtomatska poročila"""
        # Dnevno poročilo
        daily_rule = AutomationRule(
            id="daily_report",
            name="Dnevno poslovno poročilo",
            trigger_type=AutomationTrigger.TIME_BASED,
            conditions={"time": "23:00"},
            actions=[
                {"type": "generate_daily_report"},
                {"type": "send_to_management"}
            ]
        )
        
        # Tedensko poročilo
        weekly_rule = AutomationRule(
            id="weekly_report",
            name="Tedensko analitično poročilo",
            trigger_type=AutomationTrigger.TIME_BASED,
            conditions={"time": "08:00", "day": "monday"},
            actions=[
                {"type": "generate_weekly_report"},
                {"type": "send_to_management"}
            ]
        )
        
        self._save_automation_rule(daily_rule)
        self._save_automation_rule(weekly_rule)
        
        self.automation_rules[daily_rule.id] = daily_rule
        self.automation_rules[weekly_rule.id] = weekly_rule
        
        logger.info("📊 Avtomatska poročila nastavljena")
    
    def generate_daily_report(self) -> Dict:
        """Generiraj dnevno poročilo"""
        today = datetime.now().date()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Prodaja
        cursor.execute('''
            SELECT COUNT(*), SUM(total_amount)
            FROM pos_transactions 
            WHERE DATE(timestamp) = ?
        ''', (today.isoformat(),))
        
        sales_data = cursor.fetchone()
        
        # Rezervacije
        cursor.execute('''
            SELECT COUNT(*)
            FROM reservations 
            WHERE DATE(datetime_start) = ?
        ''', (today.isoformat(),))
        
        reservations_count = cursor.fetchone()[0]
        
        # Top izdelki
        cursor.execute('''
            SELECT items
            FROM pos_transactions 
            WHERE DATE(timestamp) = ?
        ''', (today.isoformat(),))
        
        transactions = cursor.fetchall()
        conn.close()
        
        # Analiziraj top izdelke
        item_counts = {}
        for transaction in transactions:
            items = json.loads(transaction[0])
            for item in items:
                name = item.get('name', 'Unknown')
                item_counts[name] = item_counts.get(name, 0) + item.get('quantity', 1)
        
        top_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        report = {
            "date": today.isoformat(),
            "sales": {
                "transaction_count": sales_data[0] or 0,
                "total_revenue": sales_data[1] or 0.0
            },
            "reservations": reservations_count,
            "top_items": top_items,
            "generated_at": datetime.now().isoformat()
        }
        
        # Pošlji poročilo
        self._send_daily_report(report)
        
        return report
    
    def _send_daily_report(self, report: Dict):
        """Pošlji dnevno poročilo"""
        subject = f"Dnevno poročilo - {report['date']}"
        
        body = f"""
DNEVNO POSLOVNO POROČILO
Datum: {report['date']}

PRODAJA:
- Število transakcij: {report['sales']['transaction_count']}
- Skupni prihodek: {report['sales']['total_revenue']:.2f}€

REZERVACIJE: {report['reservations']}

TOP IZDELKI:
"""
        
        for i, (item, count) in enumerate(report['top_items'], 1):
            body += f"{i}. {item}: {count}x\n"
        
        body += f"\nPoročilo generirano: {report['generated_at']}"
        
        # Pošlji management-u
        management_emails = ["management@restaurant.com", "owner@restaurant.com"]
        for email in management_emails:
            self._send_email(email, subject, body)
    
    # ==================== UPRAVLJANJE PRAVIL ====================
    
    def _save_automation_rule(self, rule: AutomationRule):
        """Shrani avtomatizacijsko pravilo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO automation_rules 
            (id, name, trigger_type, conditions, actions, enabled, last_executed, execution_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            rule.id, rule.name, rule.trigger_type.value,
            json.dumps(rule.conditions), json.dumps(rule.actions),
            rule.enabled, rule.last_executed.isoformat() if rule.last_executed else None,
            rule.execution_count
        ))
        
        conn.commit()
        conn.close()
    
    # ==================== GLAVNI LOOP ====================
    
    def start_automation(self):
        """Zaženi avtomatizacijski sistem"""
        self.running = True
        
        # Zaženi background procese
        threading.Thread(target=self._automation_loop, daemon=True).start()
        threading.Thread(target=self._notification_processor, daemon=True).start()
        
        logger.info("🚀 Automation Manager zagnan")
    
    def stop_automation(self):
        """Ustavi avtomatizacijski sistem"""
        self.running = False
        logger.info("⏹️ Automation Manager ustavljen")
    
    def _automation_loop(self):
        """Glavni avtomatizacijski loop"""
        while self.running:
            try:
                current_time = datetime.now()
                
                for rule in self.automation_rules.values():
                    if not rule.enabled:
                        continue
                    
                    if self._should_execute_rule(rule, current_time):
                        self._execute_rule(rule)
                
                time.sleep(60)  # Preveri vsako minuto
                
            except Exception as e:
                logger.error(f"Napaka v automation loop: {e}")
                time.sleep(60)
    
    def _notification_processor(self):
        """Procesor notifikacij"""
        while self.running:
            try:
                if self.notification_queue:
                    self.process_notifications()
                time.sleep(30)  # Preveri vsakih 30 sekund
            except Exception as e:
                logger.error(f"Napaka v notification processor: {e}")
                time.sleep(30)
    
    def _should_execute_rule(self, rule: AutomationRule, current_time: datetime) -> bool:
        """Preveri, ali naj se pravilo izvršuje"""
        if rule.trigger_type == AutomationTrigger.TIME_BASED:
            target_time = rule.conditions.get('time', '00:00')
            current_time_str = current_time.strftime('%H:%M')
            
            # Preveri, ali je čas za izvršitev
            if current_time_str == target_time:
                # Preveri, ali se je že izvršilo danes
                if rule.last_executed:
                    last_date = rule.last_executed.date()
                    if last_date == current_time.date():
                        return False
                return True
        
        elif rule.trigger_type == AutomationTrigger.THRESHOLD_BASED:
            # Preveri interval
            interval = rule.conditions.get('check_interval', 3600)
            if rule.last_executed:
                time_diff = (current_time - rule.last_executed).total_seconds()
                return time_diff >= interval
            return True
        
        return False
    
    def _execute_rule(self, rule: AutomationRule):
        """Izvršuj pravilo"""
        try:
            logger.info(f"🔄 Izvršujem pravilo: {rule.name}")
            
            for action in rule.actions:
                action_type = action.get('type')
                
                if action_type == "check_stock_levels":
                    self.check_and_order_inventory()
                elif action_type == "generate_schedules":
                    self.generate_staff_schedules(datetime.now() + timedelta(days=7))
                elif action_type == "generate_daily_report":
                    self.generate_daily_report()
                elif action_type == "notify_management":
                    self._create_notification(
                        NotificationType.SYSTEM_ERROR,
                        f"Pravilo izvršeno: {rule.name}",
                        f"Avtomatizacijsko pravilo '{rule.name}' je bilo uspešno izvršeno.",
                        "low",
                        ["management@restaurant.com"]
                    )
            
            # Posodobi statistike pravila
            rule.last_executed = datetime.now()
            rule.execution_count += 1
            self._save_automation_rule(rule)
            
        except Exception as e:
            logger.error(f"Napaka pri izvrševanju pravila {rule.name}: {e}")
            
            # Ustvari error notifikacijo
            self._create_notification(
                NotificationType.SYSTEM_ERROR,
                f"Napaka v pravilu: {rule.name}",
                f"Napaka pri izvrševanju pravila '{rule.name}': {str(e)}",
                "high",
                ["admin@restaurant.com"]
            )

# Primer uporabe
if __name__ == "__main__":
    automation = AutomationManager()
    
    # Nastavi avtomatizacijo
    automation.setup_auto_inventory_ordering()
    automation.setup_staff_management()
    automation.setup_automated_reports()
    
    # Zaženi sistem
    automation.start_automation()
    
    print("🔄 Automation Manager pripravljen!")
    
    # Simulacija - sistem bo tekel v ozadju
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        automation.stop_automation()
        print("🛑 Automation Manager ustavljen")