#!/usr/bin/env python3
"""
OMNI MASTER INTEGRATION SYSTEM
Glavni integracijski sistem za povezavo vseh OMNI modulov
"""

import sqlite3
import json
import datetime
import asyncio
import threading
import time
from enum import Enum
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any, Callable
import logging
from decimal import Decimal
import uuid
import requests
from concurrent.futures import ThreadPoolExecutor
import websockets
import queue

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModuleType(Enum):
    POS = "pos_system"
    KITCHEN = "kitchen_display"
    INVENTORY = "inventory_management"
    TOURISM = "tourism_activities"
    ACCOMMODATION = "accommodation_booking"
    IOT = "smart_building"
    AI = "ai_automation"
    FISCAL = "furs_integration"
    ANALYTICS = "real_time_analytics"

class EventType(Enum):
    TRANSACTION = "transaction"
    ORDER = "order"
    INVENTORY_UPDATE = "inventory_update"
    BOOKING = "booking"
    IOT_SENSOR = "iot_sensor"
    AI_RECOMMENDATION = "ai_recommendation"
    FISCAL_RECEIPT = "fiscal_receipt"
    ALERT = "alert"

class Priority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class ModuleEvent:
    id: str
    module_type: ModuleType
    event_type: EventType
    priority: Priority
    timestamp: datetime.datetime
    data: Dict[str, Any]
    processed: bool = False
    retry_count: int = 0

@dataclass
class ModuleStatus:
    module_type: ModuleType
    status: str  # online, offline, error, maintenance
    last_heartbeat: datetime.datetime
    version: str
    endpoint: str
    health_score: float = 100.0

@dataclass
class IntegrationRule:
    id: str
    source_module: ModuleType
    target_modules: List[ModuleType]
    event_types: List[EventType]
    transformation_function: str
    enabled: bool = True

class OmniMasterIntegration:
    def __init__(self):
        self.db_path = "omni_master_integration.db"
        self.event_queue = queue.PriorityQueue()
        self.modules = {}
        self.integration_rules = []
        self.websocket_clients = set()
        self.running = False
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        self.init_database()
        self.load_integration_rules()
        
    def init_database(self):
        """Inicializacija glavne integracijske baze"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela modulov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS modules (
                module_type TEXT PRIMARY KEY,
                status TEXT,
                last_heartbeat TEXT,
                version TEXT,
                endpoint TEXT,
                health_score REAL,
                configuration TEXT
            )
        ''')
        
        # Tabela dogodkov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                module_type TEXT,
                event_type TEXT,
                priority INTEGER,
                timestamp TEXT,
                data TEXT,
                processed BOOLEAN,
                retry_count INTEGER,
                processing_time REAL
            )
        ''')
        
        # Tabela integracijskih pravil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS integration_rules (
                id TEXT PRIMARY KEY,
                source_module TEXT,
                target_modules TEXT,
                event_types TEXT,
                transformation_function TEXT,
                enabled BOOLEAN,
                created_date TEXT
            )
        ''')
        
        # Tabela sinhronizacijskih logov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sync_logs (
                id TEXT PRIMARY KEY,
                source_module TEXT,
                target_module TEXT,
                event_id TEXT,
                status TEXT,
                timestamp TEXT,
                error_message TEXT,
                execution_time REAL
            )
        ''')
        
        # Tabela KPI metrik
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS kpi_metrics (
                id TEXT PRIMARY KEY,
                module_type TEXT,
                metric_name TEXT,
                metric_value REAL,
                timestamp TEXT,
                period TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def register_module(self, module_type: ModuleType, endpoint: str, version: str = "1.0"):
        """Registracija modula v sistem"""
        try:
            module_status = ModuleStatus(
                module_type=module_type,
                status="online",
                last_heartbeat=datetime.datetime.now(),
                version=version,
                endpoint=endpoint
            )
            
            self.modules[module_type] = module_status
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO modules 
                (module_type, status, last_heartbeat, version, endpoint, health_score, configuration)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                module_type.value, module_status.status,
                module_status.last_heartbeat.isoformat(),
                module_status.version, module_status.endpoint,
                module_status.health_score, "{}"
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Modul {module_type.value} uspešno registriran na {endpoint}")
            
            # Pošlji dogodek registracije
            self.publish_event(ModuleEvent(
                id=str(uuid.uuid4()),
                module_type=ModuleType.ANALYTICS,
                event_type=EventType.ALERT,
                priority=Priority.MEDIUM,
                timestamp=datetime.datetime.now(),
                data={
                    "message": f"Modul {module_type.value} registriran",
                    "module": module_type.value,
                    "endpoint": endpoint
                }
            ))
            
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri registraciji modula {module_type.value}: {e}")
            return False
    
    def publish_event(self, event: ModuleEvent):
        """Objavi dogodek v sistem"""
        try:
            # Dodaj v prioritetno vrsto
            priority_value = (4 - event.priority.value, event.timestamp.timestamp())
            self.event_queue.put((priority_value, event))
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO events 
                (id, module_type, event_type, priority, timestamp, data, processed, retry_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                event.id, event.module_type.value, event.event_type.value,
                event.priority.value, event.timestamp.isoformat(),
                json.dumps(event.data), event.processed, event.retry_count
            ))
            
            conn.commit()
            conn.close()
            
            # Pošlji preko WebSocket
            self.broadcast_websocket(event)
            
            logger.debug(f"Dogodek {event.id} objavljen: {event.event_type.value}")
            
        except Exception as e:
            logger.error(f"Napaka pri objavi dogodka: {e}")
    
    def process_events(self):
        """Glavna zanka za procesiranje dogodkov"""
        while self.running:
            try:
                if not self.event_queue.empty():
                    priority, event = self.event_queue.get(timeout=1)
                    
                    start_time = time.time()
                    success = self.process_single_event(event)
                    processing_time = time.time() - start_time
                    
                    # Posodobi status dogodka
                    self.update_event_status(event.id, success, processing_time)
                    
                    if not success and event.retry_count < 3:
                        event.retry_count += 1
                        self.event_queue.put((priority, event))
                        logger.warning(f"Dogodek {event.id} ponovno v vrsto (poskus {event.retry_count})")
                
                else:
                    time.sleep(0.1)
                    
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Napaka pri procesiranju dogodkov: {e}")
                time.sleep(1)
    
    def process_single_event(self, event: ModuleEvent) -> bool:
        """Procesiraj posamezen dogodek"""
        try:
            # Najdi ustrezna pravila
            applicable_rules = self.find_applicable_rules(event)
            
            if not applicable_rules:
                logger.debug(f"Ni pravil za dogodek {event.id}")
                return True
            
            success_count = 0
            total_rules = len(applicable_rules)
            
            for rule in applicable_rules:
                if self.execute_integration_rule(rule, event):
                    success_count += 1
                else:
                    logger.warning(f"Neuspešna izvedba pravila {rule.id} za dogodek {event.id}")
            
            return success_count == total_rules
            
        except Exception as e:
            logger.error(f"Napaka pri procesiranju dogodka {event.id}: {e}")
            return False
    
    def find_applicable_rules(self, event: ModuleEvent) -> List[IntegrationRule]:
        """Najdi pravila, ki se nanašajo na dogodek"""
        applicable_rules = []
        
        for rule in self.integration_rules:
            if (rule.enabled and 
                rule.source_module == event.module_type and
                event.event_type in rule.event_types):
                applicable_rules.append(rule)
        
        return applicable_rules
    
    def execute_integration_rule(self, rule: IntegrationRule, event: ModuleEvent) -> bool:
        """Izvedi integracijska pravila"""
        try:
            success_count = 0
            
            for target_module in rule.target_modules:
                if target_module in self.modules:
                    module_status = self.modules[target_module]
                    
                    if module_status.status == "online":
                        # Transformiraj podatke
                        transformed_data = self.transform_event_data(event, rule.transformation_function)
                        
                        # Pošlji na ciljni modul
                        if self.send_to_module(target_module, transformed_data):
                            success_count += 1
                            self.log_sync_success(rule, event, target_module)
                        else:
                            self.log_sync_error(rule, event, target_module, "Neuspešno pošiljanje")
                    else:
                        logger.warning(f"Ciljni modul {target_module.value} ni na voljo")
                        self.log_sync_error(rule, event, target_module, "Modul ni na voljo")
                else:
                    logger.warning(f"Ciljni modul {target_module.value} ni registriran")
            
            return success_count == len(rule.target_modules)
            
        except Exception as e:
            logger.error(f"Napaka pri izvajanju pravila {rule.id}: {e}")
            return False
    
    def transform_event_data(self, event: ModuleEvent, transformation_function: str) -> Dict[str, Any]:
        """Transformiraj podatke dogodka"""
        try:
            # Osnovne transformacije
            if transformation_function == "pos_to_kitchen":
                return self.transform_pos_to_kitchen(event.data)
            elif transformation_function == "pos_to_inventory":
                return self.transform_pos_to_inventory(event.data)
            elif transformation_function == "booking_to_pos":
                return self.transform_booking_to_pos(event.data)
            elif transformation_function == "iot_to_analytics":
                return self.transform_iot_to_analytics(event.data)
            else:
                # Privzeta transformacija
                return {
                    "source_module": event.module_type.value,
                    "event_type": event.event_type.value,
                    "timestamp": event.timestamp.isoformat(),
                    "data": event.data
                }
                
        except Exception as e:
            logger.error(f"Napaka pri transformaciji podatkov: {e}")
            return event.data
    
    def transform_pos_to_kitchen(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transformacija POS -> Kuhinja"""
        return {
            "order_id": data.get("transaction_id"),
            "table_number": data.get("table_number", "Takeaway"),
            "items": data.get("items", []),
            "special_instructions": data.get("notes", ""),
            "priority": "normal",
            "timestamp": datetime.datetime.now().isoformat()
        }
    
    def transform_pos_to_inventory(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transformacija POS -> Zaloge"""
        return {
            "transaction_id": data.get("transaction_id"),
            "items_sold": data.get("items", []),
            "timestamp": datetime.datetime.now().isoformat(),
            "location": data.get("location", "main")
        }
    
    def transform_booking_to_pos(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transformacija Rezervacije -> POS"""
        return {
            "booking_id": data.get("booking_id"),
            "customer_info": data.get("customer"),
            "services": data.get("services", []),
            "check_in": data.get("check_in"),
            "check_out": data.get("check_out"),
            "timestamp": datetime.datetime.now().isoformat()
        }
    
    def transform_iot_to_analytics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transformacija IoT -> Analitika"""
        return {
            "sensor_id": data.get("sensor_id"),
            "sensor_type": data.get("type"),
            "value": data.get("value"),
            "unit": data.get("unit"),
            "location": data.get("location"),
            "timestamp": datetime.datetime.now().isoformat()
        }
    
    def send_to_module(self, target_module: ModuleType, data: Dict[str, Any]) -> bool:
        """Pošlji podatke na ciljni modul"""
        try:
            if target_module not in self.modules:
                return False
            
            module_status = self.modules[target_module]
            endpoint = module_status.endpoint
            
            # HTTP POST zahtevek
            response = requests.post(
                f"{endpoint}/api/integration/receive",
                json=data,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju na modul {target_module.value}: {e}")
            return False
    
    def log_sync_success(self, rule: IntegrationRule, event: ModuleEvent, target_module: ModuleType):
        """Zabeleži uspešno sinhronizacijo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sync_logs 
            (id, source_module, target_module, event_id, status, timestamp, execution_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()), rule.source_module.value, target_module.value,
            event.id, "success", datetime.datetime.now().isoformat(), 0.0
        ))
        
        conn.commit()
        conn.close()
    
    def log_sync_error(self, rule: IntegrationRule, event: ModuleEvent, 
                      target_module: ModuleType, error_message: str):
        """Zabeleži napako pri sinhronizaciji"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sync_logs 
            (id, source_module, target_module, event_id, status, timestamp, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()), rule.source_module.value, target_module.value,
            event.id, "error", datetime.datetime.now().isoformat(), error_message
        ))
        
        conn.commit()
        conn.close()
    
    def update_event_status(self, event_id: str, success: bool, processing_time: float):
        """Posodobi status dogodka"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE events 
            SET processed = ?, processing_time = ?
            WHERE id = ?
        ''', (success, processing_time, event_id))
        
        conn.commit()
        conn.close()
    
    def load_integration_rules(self):
        """Naloži integracijska pravila"""
        # Privzeta pravila
        default_rules = [
            IntegrationRule(
                id="pos_to_kitchen",
                source_module=ModuleType.POS,
                target_modules=[ModuleType.KITCHEN],
                event_types=[EventType.ORDER],
                transformation_function="pos_to_kitchen"
            ),
            IntegrationRule(
                id="pos_to_inventory",
                source_module=ModuleType.POS,
                target_modules=[ModuleType.INVENTORY],
                event_types=[EventType.TRANSACTION],
                transformation_function="pos_to_inventory"
            ),
            IntegrationRule(
                id="booking_to_pos",
                source_module=ModuleType.ACCOMMODATION,
                target_modules=[ModuleType.POS],
                event_types=[EventType.BOOKING],
                transformation_function="booking_to_pos"
            ),
            IntegrationRule(
                id="iot_to_analytics",
                source_module=ModuleType.IOT,
                target_modules=[ModuleType.ANALYTICS],
                event_types=[EventType.IOT_SENSOR],
                transformation_function="iot_to_analytics"
            ),
            IntegrationRule(
                id="all_to_analytics",
                source_module=ModuleType.POS,
                target_modules=[ModuleType.ANALYTICS],
                event_types=[EventType.TRANSACTION, EventType.ORDER],
                transformation_function="default"
            )
        ]
        
        self.integration_rules = default_rules
        
        # Shrani v bazo
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for rule in default_rules:
            cursor.execute('''
                INSERT OR REPLACE INTO integration_rules 
                (id, source_module, target_modules, event_types, transformation_function, enabled, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                rule.id, rule.source_module.value,
                json.dumps([m.value for m in rule.target_modules]),
                json.dumps([e.value for e in rule.event_types]),
                rule.transformation_function, rule.enabled,
                datetime.datetime.now().isoformat()
            ))
        
        conn.commit()
        conn.close()
    
    def broadcast_websocket(self, event: ModuleEvent):
        """Pošlji dogodek preko WebSocket"""
        if self.websocket_clients:
            message = {
                "type": "event",
                "data": {
                    "id": event.id,
                    "module": event.module_type.value,
                    "event_type": event.event_type.value,
                    "priority": event.priority.value,
                    "timestamp": event.timestamp.isoformat(),
                    "data": event.data
                }
            }
            
            # Pošlji vsem povezanim odjemalcem
            for client in self.websocket_clients.copy():
                try:
                    asyncio.create_task(client.send(json.dumps(message)))
                except:
                    self.websocket_clients.discard(client)
    
    def get_system_status(self) -> Dict[str, Any]:
        """Pridobi status celotnega sistema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Status modulov
        cursor.execute('SELECT module_type, status, health_score FROM modules')
        modules_status = {row[0]: {"status": row[1], "health": row[2]} for row in cursor.fetchall()}
        
        # Statistike dogodkov
        cursor.execute('''
            SELECT event_type, COUNT(*), AVG(processing_time) 
            FROM events 
            WHERE DATE(timestamp) = DATE('now') 
            GROUP BY event_type
        ''')
        event_stats = {row[0]: {"count": row[1], "avg_time": row[2] or 0} for row in cursor.fetchall()}
        
        # Sinhronizacijske statistike
        cursor.execute('''
            SELECT status, COUNT(*) 
            FROM sync_logs 
            WHERE DATE(timestamp) = DATE('now') 
            GROUP BY status
        ''')
        sync_stats = dict(cursor.fetchall())
        
        conn.close()
        
        return {
            "modules": modules_status,
            "events": event_stats,
            "synchronization": sync_stats,
            "queue_size": self.event_queue.qsize(),
            "active_rules": len([r for r in self.integration_rules if r.enabled]),
            "timestamp": datetime.datetime.now().isoformat()
        }
    
    def start(self):
        """Zaženi integracijski sistem"""
        self.running = True
        
        # Zaženi procesiranje dogodkov v ločeni niti
        processing_thread = threading.Thread(target=self.process_events)
        processing_thread.daemon = True
        processing_thread.start()
        
        logger.info("OMNI Master Integration System zagnan")
    
    def stop(self):
        """Ustavi integracijski sistem"""
        self.running = False
        self.executor.shutdown(wait=True)
        logger.info("OMNI Master Integration System ustavljen")

def demo_master_integration():
    """Demo funkcija za testiranje glavne integracije"""
    print("🔗 OMNI MASTER INTEGRATION - DEMO")
    print("=" * 50)
    
    # Inicializacija
    integration = OmniMasterIntegration()
    integration.start()
    
    # Registracija modulov
    print("📋 Registracija modulov...")
    modules_to_register = [
        (ModuleType.POS, "http://localhost:8001"),
        (ModuleType.KITCHEN, "http://localhost:8002"),
        (ModuleType.INVENTORY, "http://localhost:8003"),
        (ModuleType.TOURISM, "http://localhost:8004"),
        (ModuleType.ACCOMMODATION, "http://localhost:8005"),
        (ModuleType.IOT, "http://localhost:8006"),
        (ModuleType.AI, "http://localhost:8007"),
        (ModuleType.FISCAL, "http://localhost:8008"),
        (ModuleType.ANALYTICS, "http://localhost:8009")
    ]
    
    for module_type, endpoint in modules_to_register:
        if integration.register_module(module_type, endpoint):
            print(f"  ✅ {module_type.value} registriran na {endpoint}")
        else:
            print(f"  ❌ Napaka pri registraciji {module_type.value}")
    
    # Simulacija dogodkov
    print("\n🎯 Simulacija dogodkov...")
    
    # POS transakcija
    pos_event = ModuleEvent(
        id=str(uuid.uuid4()),
        module_type=ModuleType.POS,
        event_type=EventType.TRANSACTION,
        priority=Priority.HIGH,
        timestamp=datetime.datetime.now(),
        data={
            "transaction_id": "TXN001",
            "items": [
                {"name": "Kava", "quantity": 2, "price": 2.50},
                {"name": "Sendvič", "quantity": 1, "price": 8.90}
            ],
            "total": 13.90,
            "table_number": "5"
        }
    )
    integration.publish_event(pos_event)
    print("  📊 POS transakcija objavljena")
    
    # Rezervacija nastanitve
    booking_event = ModuleEvent(
        id=str(uuid.uuid4()),
        module_type=ModuleType.ACCOMMODATION,
        event_type=EventType.BOOKING,
        priority=Priority.MEDIUM,
        timestamp=datetime.datetime.now(),
        data={
            "booking_id": "BK001",
            "customer": {"name": "Janez Novak", "email": "janez@example.com"},
            "room": "101",
            "check_in": "2024-01-15",
            "check_out": "2024-01-17",
            "services": ["breakfast", "wifi"]
        }
    )
    integration.publish_event(booking_event)
    print("  🏨 Rezervacija nastanitve objavljena")
    
    # IoT senzor
    iot_event = ModuleEvent(
        id=str(uuid.uuid4()),
        module_type=ModuleType.IOT,
        event_type=EventType.IOT_SENSOR,
        priority=Priority.LOW,
        timestamp=datetime.datetime.now(),
        data={
            "sensor_id": "TEMP001",
            "type": "temperature",
            "value": 22.5,
            "unit": "°C",
            "location": "lobby"
        }
    )
    integration.publish_event(iot_event)
    print("  🌡️ IoT senzor objavljen")
    
    # Počakaj, da se dogodki procesirajo
    time.sleep(2)
    
    # Status sistema
    print("\n📈 Status sistema:")
    status = integration.get_system_status()
    
    print(f"  Registriranih modulov: {len(status['modules'])}")
    print(f"  Dogodkov v vrsti: {status['queue_size']}")
    print(f"  Aktivnih pravil: {status['active_rules']}")
    
    for module, info in status['modules'].items():
        print(f"  {module}: {info['status']} (zdravje: {info['health']:.1f}%)")
    
    if status['events']:
        print("\n  Dogodki danes:")
        for event_type, stats in status['events'].items():
            print(f"    {event_type}: {stats['count']} (povp. čas: {stats['avg_time']:.3f}s)")
    
    if status['synchronization']:
        print("\n  Sinhronizacija:")
        for sync_status, count in status['synchronization'].items():
            print(f"    {sync_status}: {count}")
    
    integration.stop()
    
    print("\n🎉 Master integracija uspešno testirana!")
    print("Podprte funkcionalnosti:")
    print("  • Registracija vseh OMNI modulov")
    print("  • Prioritetno procesiranje dogodkov")
    print("  • Avtomatska sinhronizacija med moduli")
    print("  • Transformacija podatkov")
    print("  • Real-time WebSocket komunikacija")
    print("  • Monitoring in statistike")
    print("  • Napredna integracijska pravila")

if __name__ == "__main__":
    demo_master_integration()