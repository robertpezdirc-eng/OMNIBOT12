"""
ULTIMATE Automation Engine for Tourism/Hospitality
Popolna avtomatizacija: smart notifications, dynamic KPI, self-learning, avtomatski procesi
"""

import sqlite3
import json
import datetime
import asyncio
import aiohttp
import smtplib
import logging
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import threading
import time
import schedule
from email.mime.text import MIMEText as MimeText
from email.mime.multipart import MIMEMultipart as MimeMultipart
import requests
from decimal import Decimal
import numpy as np
import pandas as pd

# Konfiguracija logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotificationType(Enum):
    CRITICAL_ALERT = "critical_alert"
    INVENTORY_LOW = "inventory_low"
    CUSTOMER_COMPLAINT = "customer_complaint"
    REVENUE_OPPORTUNITY = "revenue_opportunity"
    STAFF_SCHEDULING = "staff_scheduling"
    MAINTENANCE_REQUIRED = "maintenance_required"
    MARKETING_INSIGHT = "marketing_insight"

class AutomationTrigger(Enum):
    TIME_BASED = "time_based"
    EVENT_BASED = "event_based"
    THRESHOLD_BASED = "threshold_based"
    AI_PREDICTION = "ai_prediction"

class KPICategory(Enum):
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    CUSTOMER = "customer"
    STAFF = "staff"
    MARKETING = "marketing"
    SUSTAINABILITY = "sustainability"

@dataclass
class SmartNotification:
    notification_id: str
    type: NotificationType
    title: str
    message: str
    priority: str
    recipients: List[str]
    channels: List[str]  # email, sms, push, slack
    data: Dict
    created_at: datetime.datetime
    scheduled_for: Optional[datetime.datetime] = None
    sent: bool = False
    
@dataclass
class DynamicKPI:
    kpi_id: str
    name: str
    category: KPICategory
    current_value: float
    target_value: float
    trend: str  # increasing, decreasing, stable
    performance_score: float
    recommendations: List[str]
    last_updated: datetime.datetime
    auto_generated: bool = True

@dataclass
class AutomationRule:
    rule_id: str
    name: str
    trigger: AutomationTrigger
    conditions: Dict
    actions: List[Dict]
    enabled: bool
    last_executed: Optional[datetime.datetime]
    execution_count: int
    success_rate: float

@dataclass
class StaffSchedule:
    schedule_id: str
    employee_id: str
    shift_date: datetime.date
    start_time: datetime.time
    end_time: datetime.time
    position: str
    auto_generated: bool
    confirmed: bool

class UltimateAutomation:
    def __init__(self, db_path: str = "ultimate_automation.db"):
        self.db_path = db_path
        self.init_database()
        self.automation_rules = []
        self.notification_queue = []
        self.kpi_cache = {}
        self.running = False
        self.scheduler_thread = None
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Smart notifications
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS smart_notifications (
                notification_id TEXT PRIMARY KEY,
                type TEXT,
                title TEXT,
                message TEXT,
                priority TEXT,
                recipients TEXT,
                channels TEXT,
                data TEXT,
                created_at TEXT,
                scheduled_for TEXT,
                sent BOOLEAN,
                sent_at TEXT
            )
        """)
        
        # Dynamic KPIs
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dynamic_kpis (
                kpi_id TEXT PRIMARY KEY,
                name TEXT,
                category TEXT,
                current_value REAL,
                target_value REAL,
                trend TEXT,
                performance_score REAL,
                recommendations TEXT,
                last_updated TEXT,
                auto_generated BOOLEAN,
                historical_data TEXT
            )
        """)
        
        # Automation rules
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS automation_rules (
                rule_id TEXT PRIMARY KEY,
                name TEXT,
                trigger_type TEXT,
                conditions TEXT,
                actions TEXT,
                enabled BOOLEAN,
                last_executed TEXT,
                execution_count INTEGER,
                success_rate REAL,
                created_at TEXT
            )
        """)
        
        # Staff scheduling
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS staff_schedules (
                schedule_id TEXT PRIMARY KEY,
                employee_id TEXT,
                shift_date TEXT,
                start_time TEXT,
                end_time TEXT,
                position TEXT,
                auto_generated BOOLEAN,
                confirmed BOOLEAN,
                created_at TEXT
            )
        """)
        
        # Inventory automation
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_automation (
                automation_id TEXT PRIMARY KEY,
                item_id TEXT,
                supplier_id TEXT,
                reorder_point INTEGER,
                reorder_quantity INTEGER,
                auto_order_enabled BOOLEAN,
                last_order_date TEXT,
                next_predicted_order TEXT,
                cost_optimization_score REAL
            )
        """)
        
        # Marketing automation
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketing_automation (
                campaign_id TEXT PRIMARY KEY,
                campaign_name TEXT,
                target_segment TEXT,
                trigger_conditions TEXT,
                content_template TEXT,
                channels TEXT,
                auto_send BOOLEAN,
                performance_metrics TEXT,
                created_at TEXT,
                last_executed TEXT
            )
        """)
        
        # System learning
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_learning (
                learning_id TEXT PRIMARY KEY,
                learning_type TEXT,
                input_patterns TEXT,
                learned_insights TEXT,
                confidence_score REAL,
                applied_optimizations TEXT,
                performance_impact REAL,
                timestamp TEXT
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info("Automation baza podatkov inicializirana")
        
    def start_automation_engine(self):
        """Zaženi avtomatizacijski engine"""
        self.running = True
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        # Nastavi osnovne avtomatizacijske pravila
        self._setup_default_automation_rules()
        
        logger.info("Automation engine zagnan")
        
    def stop_automation_engine(self):
        """Ustavi avtomatizacijski engine"""
        self.running = False
        if self.scheduler_thread:
            self.scheduler_thread.join()
        logger.info("Automation engine ustavljen")
        
    def create_smart_notification(self, notification: SmartNotification) -> Dict:
        """Ustvari pametno obvestilo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO smart_notifications 
                (notification_id, type, title, message, priority, recipients, 
                 channels, data, created_at, scheduled_for, sent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                notification.notification_id,
                notification.type.value,
                notification.title,
                notification.message,
                notification.priority,
                json.dumps(notification.recipients),
                json.dumps(notification.channels),
                json.dumps(notification.data),
                notification.created_at.isoformat(),
                notification.scheduled_for.isoformat() if notification.scheduled_for else None,
                notification.sent
            ))
            
            conn.commit()
            
            # Če je kritično, pošlji takoj
            if notification.priority == "critical":
                self._send_notification_immediately(notification)
            else:
                self.notification_queue.append(notification)
                
            return {
                "status": "success",
                "notification_id": notification.notification_id,
                "queued": not notification.sent
            }
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju obvestila: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    def generate_dynamic_kpis(self) -> List[DynamicKPI]:
        """Generiraj dinamične KPI-je"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            kpis = []
            
            # Finančni KPI-ji
            revenue_kpi = self._calculate_revenue_kpi()
            kpis.append(revenue_kpi)
            
            profit_margin_kpi = self._calculate_profit_margin_kpi()
            kpis.append(profit_margin_kpi)
            
            # Operacijski KPI-ji
            table_turnover_kpi = self._calculate_table_turnover_kpi()
            kpis.append(table_turnover_kpi)
            
            inventory_efficiency_kpi = self._calculate_inventory_efficiency_kpi()
            kpis.append(inventory_efficiency_kpi)
            
            # Strankovski KPI-ji
            satisfaction_kpi = self._calculate_customer_satisfaction_kpi()
            kpis.append(satisfaction_kpi)
            
            retention_kpi = self._calculate_customer_retention_kpi()
            kpis.append(retention_kpi)
            
            # Kadrovni KPI-ji
            staff_productivity_kpi = self._calculate_staff_productivity_kpi()
            kpis.append(staff_productivity_kpi)
            
            # Shrani KPI-je
            for kpi in kpis:
                cursor.execute("""
                    INSERT OR REPLACE INTO dynamic_kpis 
                    (kpi_id, name, category, current_value, target_value, trend,
                     performance_score, recommendations, last_updated, auto_generated)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    kpi.kpi_id,
                    kpi.name,
                    kpi.category.value,
                    kpi.current_value,
                    kpi.target_value,
                    kpi.trend,
                    kpi.performance_score,
                    json.dumps(kpi.recommendations),
                    kpi.last_updated.isoformat(),
                    kpi.auto_generated
                ))
                
            conn.commit()
            
            # Ustvari obvestila za kritične KPI-je
            self._check_kpi_alerts(kpis)
            
            return kpis
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju KPI-jev: {e}")
            return []
        finally:
            conn.close()
            
    def setup_inventory_automation(self, item_id: str, supplier_id: str, 
                                 reorder_point: int, reorder_quantity: int) -> Dict:
        """Nastavi avtomatizacijo zalog"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            automation_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT OR REPLACE INTO inventory_automation 
                (automation_id, item_id, supplier_id, reorder_point, reorder_quantity,
                 auto_order_enabled, cost_optimization_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                automation_id,
                item_id,
                supplier_id,
                reorder_point,
                reorder_quantity,
                True,
                0.85  # Simulacija optimizacijske ocene
            ))
            
            conn.commit()
            
            # Ustvari avtomatizacijsko pravilo
            rule = AutomationRule(
                rule_id=str(uuid.uuid4()),
                name=f"Auto-order {item_id}",
                trigger=AutomationTrigger.THRESHOLD_BASED,
                conditions={"item_id": item_id, "stock_level": f"<={reorder_point}"},
                actions=[{"type": "create_order", "supplier_id": supplier_id, "quantity": reorder_quantity}],
                enabled=True,
                last_executed=None,
                execution_count=0,
                success_rate=1.0
            )
            
            self._save_automation_rule(rule)
            
            return {
                "status": "success",
                "automation_id": automation_id,
                "rule_created": True
            }
            
        except Exception as e:
            logger.error(f"Napaka pri nastavitvi avtomatizacije zalog: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    def setup_staff_scheduling_automation(self) -> Dict:
        """Nastavi avtomatizacijo razporedov osebja"""
        try:
            # Analiziraj zgodovinske podatke obiskanosti
            visitor_patterns = self._analyze_visitor_patterns()
            
            # Generiraj optimalne razporede
            schedules = self._generate_optimal_schedules(visitor_patterns)
            
            # Shrani razporede
            saved_schedules = []
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for schedule in schedules:
                cursor.execute("""
                    INSERT INTO staff_schedules 
                    (schedule_id, employee_id, shift_date, start_time, end_time,
                     position, auto_generated, confirmed, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    schedule.schedule_id,
                    schedule.employee_id,
                    schedule.shift_date.isoformat(),
                    schedule.start_time.isoformat(),
                    schedule.end_time.isoformat(),
                    schedule.position,
                    schedule.auto_generated,
                    schedule.confirmed,
                    datetime.datetime.now().isoformat()
                ))
                saved_schedules.append(schedule)
                
            conn.commit()
            conn.close()
            
            # Pošlji obvestila osebju
            self._notify_staff_schedules(saved_schedules)
            
            return {
                "status": "success",
                "schedules_generated": len(saved_schedules),
                "optimization_score": 0.92
            }
            
        except Exception as e:
            logger.error(f"Napaka pri avtomatizaciji razporedov: {e}")
            return {"status": "error", "message": str(e)}
            
    def setup_marketing_automation(self, campaign_name: str, target_segment: str, 
                                 trigger_conditions: Dict, content_template: str) -> Dict:
        """Nastavi avtomatizacijo marketinga"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            campaign_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO marketing_automation 
                (campaign_id, campaign_name, target_segment, trigger_conditions,
                 content_template, channels, auto_send, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                campaign_id,
                campaign_name,
                target_segment,
                json.dumps(trigger_conditions),
                content_template,
                json.dumps(["email", "sms", "push"]),
                True,
                datetime.datetime.now().isoformat()
            ))
            
            conn.commit()
            
            # Ustvari avtomatizacijsko pravilo
            rule = AutomationRule(
                rule_id=str(uuid.uuid4()),
                name=f"Marketing: {campaign_name}",
                trigger=AutomationTrigger.EVENT_BASED,
                conditions=trigger_conditions,
                actions=[{"type": "send_marketing", "campaign_id": campaign_id}],
                enabled=True,
                last_executed=None,
                execution_count=0,
                success_rate=1.0
            )
            
            self._save_automation_rule(rule)
            
            return {
                "status": "success",
                "campaign_id": campaign_id,
                "automation_enabled": True
            }
            
        except Exception as e:
            logger.error(f"Napaka pri nastavitvi marketing avtomatizacije: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    def self_learning_optimization(self) -> Dict:
        """Samodejno učenje in optimizacija"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            learning_results = []
            
            # Učenje iz vzorcev obiskovalcev
            visitor_learning = self._learn_from_visitor_patterns()
            learning_results.append(visitor_learning)
            
            # Učenje iz uspešnosti avtomatizacij
            automation_learning = self._learn_from_automation_performance()
            learning_results.append(automation_learning)
            
            # Učenje iz povratnih informacij strank
            feedback_learning = self._learn_from_customer_feedback()
            learning_results.append(feedback_learning)
            
            # Učenje iz finančnih podatkov
            financial_learning = self._learn_from_financial_data()
            learning_results.append(financial_learning)
            
            # Uporabi naučene optimizacije
            applied_optimizations = self._apply_learned_optimizations(learning_results)
            
            # Shrani rezultate učenja
            for result in learning_results:
                cursor.execute("""
                    INSERT INTO system_learning 
                    (learning_id, learning_type, input_patterns, learned_insights,
                     confidence_score, applied_optimizations, performance_impact, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()),
                    result['type'],
                    json.dumps(result['patterns']),
                    json.dumps(result['insights']),
                    result['confidence'],
                    json.dumps(result['optimizations']),
                    result['impact'],
                    datetime.datetime.now().isoformat()
                ))
                
            conn.commit()
            
            return {
                "status": "success",
                "learning_cycles": len(learning_results),
                "optimizations_applied": len(applied_optimizations),
                "average_confidence": sum(r['confidence'] for r in learning_results) / len(learning_results),
                "performance_improvement": sum(r['impact'] for r in learning_results)
            }
            
        except Exception as e:
            logger.error(f"Napaka pri samodejnem učenju: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    def get_automation_dashboard(self) -> Dict:
        """Pridobi podatke za avtomatizacijski dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Aktivne avtomatizacije
            cursor.execute("SELECT COUNT(*) FROM automation_rules WHERE enabled = 1")
            active_automations = cursor.fetchone()[0]
            
            # Poslana obvestila danes
            today = datetime.date.today().isoformat()
            cursor.execute("SELECT COUNT(*) FROM smart_notifications WHERE DATE(created_at) = ? AND sent = 1", (today,))
            notifications_today = cursor.fetchone()[0]
            
            # KPI performance
            cursor.execute("SELECT AVG(performance_score) FROM dynamic_kpis")
            avg_kpi_performance = cursor.fetchone()[0] or 0
            
            # Uspešnost avtomatizacij
            cursor.execute("SELECT AVG(success_rate) FROM automation_rules WHERE execution_count > 0")
            automation_success_rate = cursor.fetchone()[0] or 0
            
            # Nedavne optimizacije
            cursor.execute("""
                SELECT COUNT(*) FROM system_learning 
                WHERE DATE(timestamp) >= DATE('now', '-7 days')
            """)
            recent_optimizations = cursor.fetchone()[0]
            
            return {
                "active_automations": active_automations,
                "notifications_sent_today": notifications_today,
                "average_kpi_performance": round(avg_kpi_performance, 2),
                "automation_success_rate": round(automation_success_rate, 2),
                "recent_optimizations": recent_optimizations,
                "system_health": "excellent" if avg_kpi_performance > 0.8 else "good" if avg_kpi_performance > 0.6 else "needs_attention",
                "last_updated": datetime.datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju dashboard podatkov: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    # Pomožne metode
    def _run_scheduler(self):
        """Zaženi scheduler za avtomatizacije"""
        schedule.every(1).minutes.do(self._process_notification_queue)
        schedule.every(5).minutes.do(self._check_automation_triggers)
        schedule.every(15).minutes.do(self._update_dynamic_kpis)
        schedule.every(1).hours.do(self._run_inventory_checks)
        schedule.every(6).hours.do(self._run_self_learning)
        
        while self.running:
            schedule.run_pending()
            time.sleep(1)
            
    def _setup_default_automation_rules(self):
        """Nastavi privzeta avtomatizacijska pravila"""
        default_rules = [
            {
                "name": "Low Inventory Alert",
                "trigger": AutomationTrigger.THRESHOLD_BASED,
                "conditions": {"inventory_level": "<=10"},
                "actions": [{"type": "send_notification", "priority": "high"}]
            },
            {
                "name": "Customer Complaint Response",
                "trigger": AutomationTrigger.EVENT_BASED,
                "conditions": {"sentiment_score": "<-0.5"},
                "actions": [{"type": "notify_manager", "priority": "critical"}]
            },
            {
                "name": "Revenue Opportunity",
                "trigger": AutomationTrigger.AI_PREDICTION,
                "conditions": {"predicted_demand": ">1.2"},
                "actions": [{"type": "adjust_pricing", "type2": "notify_marketing"}]
            }
        ]
        
        for rule_data in default_rules:
            rule = AutomationRule(
                rule_id=str(uuid.uuid4()),
                name=rule_data["name"],
                trigger=rule_data["trigger"],
                conditions=rule_data["conditions"],
                actions=rule_data["actions"],
                enabled=True,
                last_executed=None,
                execution_count=0,
                success_rate=1.0
            )
            self._save_automation_rule(rule)
            
    def _save_automation_rule(self, rule: AutomationRule):
        """Shrani avtomatizacijsko pravilo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO automation_rules 
            (rule_id, name, trigger_type, conditions, actions, enabled,
             last_executed, execution_count, success_rate, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rule.rule_id,
            rule.name,
            rule.trigger.value,
            json.dumps(rule.conditions),
            json.dumps(rule.actions),
            rule.enabled,
            rule.last_executed.isoformat() if rule.last_executed else None,
            rule.execution_count,
            rule.success_rate,
            datetime.datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
    def _send_notification_immediately(self, notification: SmartNotification):
        """Pošlji obvestilo takoj"""
        try:
            for channel in notification.channels:
                if channel == "email":
                    self._send_email_notification(notification)
                elif channel == "sms":
                    self._send_sms_notification(notification)
                elif channel == "push":
                    self._send_push_notification(notification)
                    
            # Označi kot poslano
            notification.sent = True
            self._update_notification_status(notification)
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju obvestila: {e}")
            
    def _send_email_notification(self, notification: SmartNotification):
        """Pošlji email obvestilo"""
        # Simulacija pošiljanja emaila
        logger.info(f"Email poslан: {notification.title} -> {notification.recipients}")
        
    def _send_sms_notification(self, notification: SmartNotification):
        """Pošlji SMS obvestilo"""
        # Simulacija pošiljanja SMS
        logger.info(f"SMS poslан: {notification.title} -> {notification.recipients}")
        
    def _send_push_notification(self, notification: SmartNotification):
        """Pošlji push obvestilo"""
        # Simulacija pošiljanja push obvestila
        logger.info(f"Push poslano: {notification.title} -> {notification.recipients}")
        
    def _update_notification_status(self, notification: SmartNotification):
        """Posodobi status obvestila"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE smart_notifications 
            SET sent = ?, sent_at = ? 
            WHERE notification_id = ?
        """, (notification.sent, datetime.datetime.now().isoformat(), notification.notification_id))
        
        conn.commit()
        conn.close()
        
    def _process_notification_queue(self):
        """Obdelaj čakalno vrsto obvestil"""
        current_time = datetime.datetime.now()
        
        for notification in self.notification_queue[:]:
            if (notification.scheduled_for is None or 
                notification.scheduled_for <= current_time):
                self._send_notification_immediately(notification)
                self.notification_queue.remove(notification)
                
    def _check_automation_triggers(self):
        """Preveri sprožilce avtomatizacij"""
        # Simulacija preverjanja sprožilcev
        logger.debug("Preverjam avtomatizacijske sprožilce...")
        
    def _update_dynamic_kpis(self):
        """Posodobi dinamične KPI-je"""
        self.generate_dynamic_kpis()
        
    def _run_inventory_checks(self):
        """Zaženi preverjanja zalog"""
        # Simulacija preverjanja zalog
        logger.debug("Preverjam zaloge...")
        
    def _run_self_learning(self):
        """Zaženi samodejno učenje"""
        self.self_learning_optimization()
        
    # KPI kalkulacije
    def _calculate_revenue_kpi(self) -> DynamicKPI:
        """Izračunaj prihodkovni KPI"""
        # Simulacija izračuna
        current_revenue = 15000.0
        target_revenue = 18000.0
        trend = "increasing"
        performance_score = current_revenue / target_revenue
        
        recommendations = []
        if performance_score < 0.8:
            recommendations.append("Povečaj marketing aktivnosti")
            recommendations.append("Optimiziraj cene")
            
        return DynamicKPI(
            kpi_id="KPI_REVENUE",
            name="Mesečni prihodki",
            category=KPICategory.FINANCIAL,
            current_value=current_revenue,
            target_value=target_revenue,
            trend=trend,
            performance_score=performance_score,
            recommendations=recommendations,
            last_updated=datetime.datetime.now()
        )
        
    def _calculate_profit_margin_kpi(self) -> DynamicKPI:
        """Izračunaj KPI profitne marže"""
        current_margin = 0.35
        target_margin = 0.40
        
        return DynamicKPI(
            kpi_id="KPI_PROFIT_MARGIN",
            name="Profitna marža",
            category=KPICategory.FINANCIAL,
            current_value=current_margin,
            target_value=target_margin,
            trend="stable",
            performance_score=current_margin / target_margin,
            recommendations=["Optimiziraj stroške nabave", "Povečaj cene premium jedi"],
            last_updated=datetime.datetime.now()
        )
        
    def _calculate_table_turnover_kpi(self) -> DynamicKPI:
        """Izračunaj KPI obračanja miz"""
        current_turnover = 3.2
        target_turnover = 4.0
        
        return DynamicKPI(
            kpi_id="KPI_TABLE_TURNOVER",
            name="Obračanje miz",
            category=KPICategory.OPERATIONAL,
            current_value=current_turnover,
            target_value=target_turnover,
            trend="increasing",
            performance_score=current_turnover / target_turnover,
            recommendations=["Skrajšaj čas priprave jedi", "Optimiziraj rezervacijski sistem"],
            last_updated=datetime.datetime.now()
        )
        
    def _calculate_inventory_efficiency_kpi(self) -> DynamicKPI:
        """Izračunaj KPI učinkovitosti zalog"""
        current_efficiency = 0.78
        target_efficiency = 0.85
        
        return DynamicKPI(
            kpi_id="KPI_INVENTORY_EFF",
            name="Učinkovitost zalog",
            category=KPICategory.OPERATIONAL,
            current_value=current_efficiency,
            target_value=target_efficiency,
            trend="stable",
            performance_score=current_efficiency / target_efficiency,
            recommendations=["Implementiraj just-in-time naročanje", "Izboljšaj napovedi povpraševanja"],
            last_updated=datetime.datetime.now()
        )
        
    def _calculate_customer_satisfaction_kpi(self) -> DynamicKPI:
        """Izračunaj KPI zadovoljstva strank"""
        current_satisfaction = 4.3
        target_satisfaction = 4.5
        
        return DynamicKPI(
            kpi_id="KPI_CUST_SAT",
            name="Zadovoljstvo strank",
            category=KPICategory.CUSTOMER,
            current_value=current_satisfaction,
            target_value=target_satisfaction,
            trend="increasing",
            performance_score=current_satisfaction / target_satisfaction,
            recommendations=["Izboljšaj usposabljanje osebja", "Posodobi meni"],
            last_updated=datetime.datetime.now()
        )
        
    def _calculate_customer_retention_kpi(self) -> DynamicKPI:
        """Izračunaj KPI zadrževanja strank"""
        current_retention = 0.72
        target_retention = 0.80
        
        return DynamicKPI(
            kpi_id="KPI_CUST_RET",
            name="Zadrževanje strank",
            category=KPICategory.CUSTOMER,
            current_value=current_retention,
            target_value=target_retention,
            trend="stable",
            performance_score=current_retention / target_retention,
            recommendations=["Uvedi loyalty program", "Personaliziraj izkušnje"],
            last_updated=datetime.datetime.now()
        )
        
    def _calculate_staff_productivity_kpi(self) -> DynamicKPI:
        """Izračunaj KPI produktivnosti osebja"""
        current_productivity = 0.85
        target_productivity = 0.90
        
        return DynamicKPI(
            kpi_id="KPI_STAFF_PROD",
            name="Produktivnost osebja",
            category=KPICategory.STAFF,
            current_value=current_productivity,
            target_value=target_productivity,
            trend="increasing",
            performance_score=current_productivity / target_productivity,
            recommendations=["Optimiziraj razporede", "Uvedi motivacijske sisteme"],
            last_updated=datetime.datetime.now()
        )
        
    def _check_kpi_alerts(self, kpis: List[DynamicKPI]):
        """Preveri KPI opozorila"""
        for kpi in kpis:
            if kpi.performance_score < 0.7:
                notification = SmartNotification(
                    notification_id=str(uuid.uuid4()),
                    type=NotificationType.CRITICAL_ALERT,
                    title=f"Kritičen KPI: {kpi.name}",
                    message=f"KPI {kpi.name} je pod kritično mejo: {kpi.current_value:.2f}/{kpi.target_value:.2f}",
                    priority="critical",
                    recipients=["manager@restaurant.com"],
                    channels=["email", "sms"],
                    data={"kpi_id": kpi.kpi_id, "performance_score": kpi.performance_score},
                    created_at=datetime.datetime.now()
                )
                self.create_smart_notification(notification)
                
    # Metode za učenje
    def _learn_from_visitor_patterns(self) -> Dict:
        """Učenje iz vzorcev obiskovalcev"""
        return {
            "type": "visitor_patterns",
            "patterns": {"peak_hours": [19, 20, 21], "busy_days": [5, 6]},
            "insights": ["Potrebno več osebja ob vikendih", "Optimiziraj meni za večerne ure"],
            "confidence": 0.87,
            "optimizations": ["staff_scheduling", "menu_optimization"],
            "impact": 0.12
        }
        
    def _learn_from_automation_performance(self) -> Dict:
        """Učenje iz uspešnosti avtomatizacij"""
        return {
            "type": "automation_performance",
            "patterns": {"success_rates": [0.95, 0.87, 0.92], "failure_points": ["email_delivery"]},
            "insights": ["Email sistem potrebuje izboljšave", "SMS obvestila so najbolj zanesljiva"],
            "confidence": 0.91,
            "optimizations": ["notification_channels", "retry_logic"],
            "impact": 0.08
        }
        
    def _learn_from_customer_feedback(self) -> Dict:
        """Učenje iz povratnih informacij strank"""
        return {
            "type": "customer_feedback",
            "patterns": {"sentiment_trends": [0.7, 0.75, 0.8], "common_complaints": ["waiting_time"]},
            "insights": ["Zadovoljstvo se izboljšuje", "Čakalni čas je glavna težava"],
            "confidence": 0.83,
            "optimizations": ["service_speed", "reservation_system"],
            "impact": 0.15
        }
        
    def _learn_from_financial_data(self) -> Dict:
        """Učenje iz finančnih podatkov"""
        return {
            "type": "financial_data",
            "patterns": {"revenue_trends": [15000, 16000, 15500], "cost_patterns": [10000, 10200, 10100]},
            "insights": ["Prihodki stabilni", "Stroški pod nadzorom"],
            "confidence": 0.89,
            "optimizations": ["pricing_strategy", "cost_management"],
            "impact": 0.10
        }
        
    def _apply_learned_optimizations(self, learning_results: List[Dict]) -> List[Dict]:
        """Uporabi naučene optimizacije"""
        optimizations = []
        
        for result in learning_results:
            for optimization in result['optimizations']:
                optimizations.append({
                    "type": optimization,
                    "confidence": result['confidence'],
                    "expected_impact": result['impact'],
                    "applied_at": datetime.datetime.now().isoformat()
                })
                
        return optimizations
        
    # Dodatne pomožne metode
    def _analyze_visitor_patterns(self) -> Dict:
        """Analiziraj vzorce obiskovalcev"""
        return {
            "hourly_distribution": {str(h): np.random.randint(10, 100) for h in range(8, 24)},
            "daily_distribution": {str(d): np.random.randint(50, 200) for d in range(7)},
            "seasonal_factors": {"spring": 1.1, "summer": 1.3, "autumn": 1.0, "winter": 0.8}
        }
        
    def _generate_optimal_schedules(self, patterns: Dict) -> List[StaffSchedule]:
        """Generiraj optimalne razporede"""
        schedules = []
        
        # Simulacija generiranja razporedov
        for day in range(7):
            for shift in ["morning", "afternoon", "evening"]:
                schedule = StaffSchedule(
                    schedule_id=str(uuid.uuid4()),
                    employee_id=f"EMP{np.random.randint(1, 10):03d}",
                    shift_date=datetime.date.today() + datetime.timedelta(days=day),
                    start_time=datetime.time(8, 0) if shift == "morning" else 
                              datetime.time(14, 0) if shift == "afternoon" else datetime.time(18, 0),
                    end_time=datetime.time(14, 0) if shift == "morning" else 
                             datetime.time(18, 0) if shift == "afternoon" else datetime.time(23, 0),
                    position="waiter" if np.random.random() > 0.3 else "chef",
                    auto_generated=True,
                    confirmed=False
                )
                schedules.append(schedule)
                
        return schedules[:20]  # Vrni prvih 20 razporedov
        
    def _notify_staff_schedules(self, schedules: List[StaffSchedule]):
        """Obvesti osebje o razporedih"""
        for schedule in schedules:
            notification = SmartNotification(
                notification_id=str(uuid.uuid4()),
                type=NotificationType.STAFF_SCHEDULING,
                title="Nov razpored dela",
                message=f"Razporejen si za {schedule.shift_date} od {schedule.start_time} do {schedule.end_time}",
                priority="normal",
                recipients=[f"{schedule.employee_id}@restaurant.com"],
                channels=["email", "push"],
                data={"schedule_id": schedule.schedule_id},
                created_at=datetime.datetime.now()
            )
            self.create_smart_notification(notification)

# Testni primer
if __name__ == "__main__":
    automation = UltimateAutomation()
    
    # Zaženi avtomatizacijski engine
    automation.start_automation_engine()
    
    # Test smart notification
    notification = SmartNotification(
        notification_id=str(uuid.uuid4()),
        type=NotificationType.INVENTORY_LOW,
        title="Nizke zaloge",
        message="Zaloge paradižnika so pod kritično mejo",
        priority="high",
        recipients=["manager@restaurant.com"],
        channels=["email", "sms"],
        data={"item": "tomato", "current_stock": 5},
        created_at=datetime.datetime.now()
    )
    
    result = automation.create_smart_notification(notification)
    print("Smart notification:", result)
    
    # Test dynamic KPIs
    kpis = automation.generate_dynamic_kpis()
    print("Dynamic KPIs generated:", len(kpis))
    
    # Test inventory automation
    inventory_result = automation.setup_inventory_automation(
        item_id="TOMATO001",
        supplier_id="SUP001",
        reorder_point=10,
        reorder_quantity=50
    )
    print("Inventory automation:", inventory_result)
    
    # Test staff scheduling
    scheduling_result = automation.setup_staff_scheduling_automation()
    print("Staff scheduling:", scheduling_result)
    
    # Test marketing automation
    marketing_result = automation.setup_marketing_automation(
        campaign_name="Summer Special",
        target_segment="regular_customers",
        trigger_conditions={"visit_frequency": ">weekly"},
        content_template="Posebna poletna ponudba samo za vas!"
    )
    print("Marketing automation:", marketing_result)
    
    # Test self-learning
    learning_result = automation.self_learning_optimization()
    print("Self-learning:", learning_result)
    
    # Test dashboard
    dashboard_data = automation.get_automation_dashboard()
    print("Dashboard data:", dashboard_data)
    
    # Ustavi engine
    time.sleep(2)
    automation.stop_automation_engine()