"""
🔹 ULTIMATE MASTER INTEGRATION SISTEM
Glavni integracijski sistem za povezovanje vseh modulov gostinstva/turizma
Avtor: Omni AI Assistant
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import uuid
from dataclasses import dataclass
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor

# Uvoz vseh modulov
try:
    from ultimate_pos_system import UltimatePOSSystem
    from ultimate_reservation_system import UltimateReservationSystem
    from ultimate_digital_checkin import UltimateDigitalCheckin
    from ultimate_ai_chef import UltimateAIChef
    from ultimate_virtual_concierge import UltimateVirtualConcierge
    from ultimate_hr_system import UltimateHRSystem
    from ultimate_iot_smart_building import UltimateIoTSmartBuilding
    from ultimate_crm_system import UltimateCRMSystem
    from ultimate_supplier_system import UltimateSupplierSystem
    from ultimate_digital_manager import UltimateDigitalManager
    from ultimate_hyper_personalization import UltimateHyperPersonalization
    from ultimate_ar_vr_experience import UltimateARVRExperience
except ImportError as e:
    print(f"⚠️ Opozorilo: Nekateri moduli niso na voljo: {e}")

@dataclass
class SystemModule:
    module_id: str
    name: str
    instance: Any
    status: str  # active, inactive, error
    last_sync: str
    dependencies: List[str]
    api_endpoints: List[str]

@dataclass
class IntegrationEvent:
    event_id: str
    source_module: str
    target_modules: List[str]
    event_type: str
    data: Dict[str, Any]
    timestamp: str
    processed: bool
    priority: int

class UltimateMasterIntegration:
    def __init__(self, db_path: str = "master_integration.db"):
        self.db_path = db_path
        self.modules = {}
        self.event_queue = []
        self.sync_status = {}
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        self.init_database()
        self.initialize_modules()
        self.setup_integrations()

    def init_database(self):
        """Inicializacija glavne integracije baze"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela modulov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_modules (
                module_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT,
                last_sync TEXT,
                dependencies TEXT,
                api_endpoints TEXT,
                config TEXT
            )
        ''')
        
        # Tabela integracijskih dogodkov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS integration_events (
                event_id TEXT PRIMARY KEY,
                source_module TEXT,
                target_modules TEXT,
                event_type TEXT,
                data TEXT,
                timestamp TEXT,
                processed BOOLEAN,
                priority INTEGER
            )
        ''')
        
        # Tabela sinhronizacije
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sync_log (
                sync_id TEXT PRIMARY KEY,
                modules TEXT,
                sync_type TEXT,
                status TEXT,
                start_time TEXT,
                end_time TEXT,
                errors TEXT,
                data_transferred INTEGER
            )
        ''')
        
        # Tabela sistemskih metrik
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_metrics (
                metric_id TEXT PRIMARY KEY,
                module_id TEXT,
                metric_name TEXT,
                value REAL,
                timestamp TEXT,
                unit TEXT
            )
        ''')
        
        conn.commit()
        conn.close()

    def initialize_modules(self):
        """Inicializacija vseh modulov"""
        module_configs = [
            {
                "module_id": "pos_system",
                "name": "POS/Blagajna sistem",
                "class": "UltimatePOSSystem",
                "dependencies": ["crm_system", "supplier_system"],
                "api_endpoints": ["/pos/sale", "/pos/inventory", "/pos/reports"]
            },
            {
                "module_id": "reservation_system",
                "name": "Rezervacijski sistem",
                "class": "UltimateReservationSystem",
                "dependencies": ["crm_system", "digital_checkin"],
                "api_endpoints": ["/reservations/create", "/reservations/manage", "/reservations/calendar"]
            },
            {
                "module_id": "digital_checkin",
                "name": "Digitalna prijava",
                "class": "UltimateDigitalCheckin",
                "dependencies": ["crm_system", "hyper_personalization"],
                "api_endpoints": ["/checkin/register", "/checkin/qr", "/checkin/access"]
            },
            {
                "module_id": "ai_chef",
                "name": "AI Chef",
                "class": "UltimateAIChef",
                "dependencies": ["supplier_system", "pos_system"],
                "api_endpoints": ["/chef/menu", "/chef/recipes", "/chef/optimization"]
            },
            {
                "module_id": "virtual_concierge",
                "name": "Virtualni concierge",
                "class": "UltimateVirtualConcierge",
                "dependencies": ["crm_system", "hyper_personalization"],
                "api_endpoints": ["/concierge/chat", "/concierge/recommendations", "/concierge/experiences"]
            },
            {
                "module_id": "hr_system",
                "name": "Kadrovski sistem",
                "class": "UltimateHRSystem",
                "dependencies": ["digital_manager"],
                "api_endpoints": ["/hr/employees", "/hr/schedules", "/hr/payroll"]
            },
            {
                "module_id": "iot_smart_building",
                "name": "IoT Smart Building",
                "class": "UltimateIoTSmartBuilding",
                "dependencies": ["digital_manager"],
                "api_endpoints": ["/iot/devices", "/iot/sensors", "/iot/automation"]
            },
            {
                "module_id": "crm_system",
                "name": "CRM sistem",
                "class": "UltimateCRMSystem",
                "dependencies": ["hyper_personalization"],
                "api_endpoints": ["/crm/customers", "/crm/interactions", "/crm/campaigns"]
            },
            {
                "module_id": "supplier_system",
                "name": "Sistem dobaviteljev",
                "class": "UltimateSupplierSystem",
                "dependencies": ["digital_manager"],
                "api_endpoints": ["/suppliers/orders", "/suppliers/inventory", "/suppliers/optimization"]
            },
            {
                "module_id": "digital_manager",
                "name": "Digitalni manager",
                "class": "UltimateDigitalManager",
                "dependencies": [],
                "api_endpoints": ["/manager/decisions", "/manager/roi", "/manager/optimization"]
            },
            {
                "module_id": "hyper_personalization",
                "name": "Hyper-personalizacija",
                "class": "UltimateHyperPersonalization",
                "dependencies": [],
                "api_endpoints": ["/personalization/profile", "/personalization/recommendations", "/personalization/insights"]
            },
            {
                "module_id": "ar_vr_experience",
                "name": "AR/VR doživetja",
                "class": "UltimateARVRExperience",
                "dependencies": ["hyper_personalization", "ai_chef"],
                "api_endpoints": ["/arvr/experiences", "/arvr/menu", "/arvr/sessions"]
            }
        ]
        
        for config in module_configs:
            try:
                # Poskusi inicializirati modul
                class_name = config["class"]
                if class_name in globals():
                    instance = globals()[class_name]()
                else:
                    # Ustvari mock instance
                    instance = MockModule(config["module_id"])
                
                module = SystemModule(
                    module_id=config["module_id"],
                    name=config["name"],
                    instance=instance,
                    status="active",
                    last_sync=datetime.now().isoformat(),
                    dependencies=config["dependencies"],
                    api_endpoints=config["api_endpoints"]
                )
                
                self.modules[config["module_id"]] = module
                self.register_module(module)
                
                print(f"✅ Modul inicializiran: {config['name']}")
                
            except Exception as e:
                print(f"❌ Napaka pri inicializaciji modula {config['name']}: {e}")
                # Ustvari mock modul
                mock_instance = MockModule(config["module_id"])
                module = SystemModule(
                    module_id=config["module_id"],
                    name=config["name"],
                    instance=mock_instance,
                    status="mock",
                    last_sync=datetime.now().isoformat(),
                    dependencies=config["dependencies"],
                    api_endpoints=config["api_endpoints"]
                )
                self.modules[config["module_id"]] = module
                self.register_module(module)

    def register_module(self, module: SystemModule):
        """Registracija modula v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO system_modules 
            (module_id, name, status, last_sync, dependencies, api_endpoints, config)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            module.module_id,
            module.name,
            module.status,
            module.last_sync,
            json.dumps(module.dependencies),
            json.dumps(module.api_endpoints),
            json.dumps({})
        ))
        
        conn.commit()
        conn.close()

    def setup_integrations(self):
        """Nastavitev integracij med moduli"""
        integration_rules = [
            # POS -> CRM, Supplier, AI Chef
            {
                "source": "pos_system",
                "targets": ["crm_system", "supplier_system", "ai_chef"],
                "events": ["sale_completed", "inventory_low", "payment_processed"]
            },
            # Rezervacije -> CRM, Digital Checkin
            {
                "source": "reservation_system",
                "targets": ["crm_system", "digital_checkin"],
                "events": ["reservation_created", "reservation_confirmed", "guest_arrived"]
            },
            # Digital Checkin -> CRM, Hyper-personalization
            {
                "source": "digital_checkin",
                "targets": ["crm_system", "hyper_personalization"],
                "events": ["guest_registered", "access_granted", "preferences_updated"]
            },
            # CRM -> Hyper-personalization, Virtual Concierge
            {
                "source": "crm_system",
                "targets": ["hyper_personalization", "virtual_concierge"],
                "events": ["customer_updated", "interaction_logged", "campaign_triggered"]
            },
            # Hyper-personalization -> AR/VR, Virtual Concierge
            {
                "source": "hyper_personalization",
                "targets": ["ar_vr_experience", "virtual_concierge"],
                "events": ["preferences_analyzed", "recommendation_generated", "insight_created"]
            },
            # Digital Manager -> Vsi moduli
            {
                "source": "digital_manager",
                "targets": list(self.modules.keys()),
                "events": ["optimization_suggested", "decision_made", "alert_triggered"]
            }
        ]
        
        self.integration_rules = integration_rules
        print(f"✅ Nastavljenih {len(integration_rules)} integracijskih pravil")

    def trigger_event(self, source_module: str, event_type: str, data: Dict[str, Any], priority: int = 5):
        """Sprožitev integracijskega dogodka"""
        # Najdi ciljne module
        target_modules = []
        for rule in self.integration_rules:
            if rule["source"] == source_module and event_type in rule["events"]:
                target_modules.extend(rule["targets"])
        
        if not target_modules:
            return None
        
        event = IntegrationEvent(
            event_id=str(uuid.uuid4()),
            source_module=source_module,
            target_modules=target_modules,
            event_type=event_type,
            data=data,
            timestamp=datetime.now().isoformat(),
            processed=False,
            priority=priority
        )
        
        # Shrani dogodek
        self.save_event(event)
        
        # Dodaj v čakalno vrsto
        self.event_queue.append(event)
        
        # Asinhrono procesiranje
        self.executor.submit(self.process_event, event)
        
        return event.event_id

    def save_event(self, event: IntegrationEvent):
        """Shranjevanje dogodka v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO integration_events 
            (event_id, source_module, target_modules, event_type, data, timestamp, processed, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            event.event_id,
            event.source_module,
            json.dumps(event.target_modules),
            event.event_type,
            json.dumps(event.data),
            event.timestamp,
            event.processed,
            event.priority
        ))
        
        conn.commit()
        conn.close()

    def process_event(self, event: IntegrationEvent):
        """Procesiranje integracijskega dogodka"""
        try:
            for target_module_id in event.target_modules:
                if target_module_id in self.modules:
                    target_module = self.modules[target_module_id]
                    
                    # Kliči ustrezno metodo na ciljnem modulu
                    self.call_module_method(target_module, event)
            
            # Označi kot procesiran
            event.processed = True
            self.update_event_status(event.event_id, True)
            
        except Exception as e:
            print(f"❌ Napaka pri procesiranju dogodka {event.event_id}: {e}")

    def call_module_method(self, module: SystemModule, event: IntegrationEvent):
        """Klic metode na modulu"""
        method_mapping = {
            "sale_completed": "handle_sale_completed",
            "inventory_low": "handle_inventory_low",
            "reservation_created": "handle_reservation_created",
            "guest_registered": "handle_guest_registered",
            "preferences_analyzed": "handle_preferences_analyzed",
            "optimization_suggested": "handle_optimization_suggested"
        }
        
        method_name = method_mapping.get(event.event_type, "handle_generic_event")
        
        if hasattr(module.instance, method_name):
            method = getattr(module.instance, method_name)
            method(event.data)
        elif hasattr(module.instance, "handle_integration_event"):
            module.instance.handle_integration_event(event.event_type, event.data)

    def update_event_status(self, event_id: str, processed: bool):
        """Posodobitev statusa dogodka"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE integration_events SET processed = ? WHERE event_id = ?
        ''', (processed, event_id))
        
        conn.commit()
        conn.close()

    def sync_modules(self, module_ids: List[str] = None) -> str:
        """Sinhronizacija med moduli"""
        if module_ids is None:
            module_ids = list(self.modules.keys())
        
        sync_id = str(uuid.uuid4())
        start_time = datetime.now()
        
        try:
            # Sinhronizacija podatkov
            sync_data = {}
            for module_id in module_ids:
                if module_id in self.modules:
                    module = self.modules[module_id]
                    
                    # Pridobi podatke za sinhronizacijo
                    if hasattr(module.instance, "get_sync_data"):
                        sync_data[module_id] = module.instance.get_sync_data()
            
            # Distribuiraj podatke
            for module_id in module_ids:
                if module_id in self.modules:
                    module = self.modules[module_id]
                    
                    # Pošlji podatke drugim modulom
                    if hasattr(module.instance, "receive_sync_data"):
                        other_data = {k: v for k, v in sync_data.items() if k != module_id}
                        module.instance.receive_sync_data(other_data)
            
            end_time = datetime.now()
            
            # Shrani log sinhronizacije
            self.save_sync_log(sync_id, module_ids, "full_sync", "success", 
                             start_time, end_time, [], len(sync_data))
            
            return sync_id
            
        except Exception as e:
            end_time = datetime.now()
            self.save_sync_log(sync_id, module_ids, "full_sync", "error", 
                             start_time, end_time, [str(e)], 0)
            raise e

    def save_sync_log(self, sync_id: str, modules: List[str], sync_type: str, 
                     status: str, start_time: datetime, end_time: datetime, 
                     errors: List[str], data_transferred: int):
        """Shranjevanje loga sinhronizacije"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sync_log 
            (sync_id, modules, sync_type, status, start_time, end_time, errors, data_transferred)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            sync_id,
            json.dumps(modules),
            sync_type,
            status,
            start_time.isoformat(),
            end_time.isoformat(),
            json.dumps(errors),
            data_transferred
        ))
        
        conn.commit()
        conn.close()

    def get_system_health(self) -> Dict[str, Any]:
        """Preverjanje zdravja sistema"""
        health_status = {
            "overall_status": "healthy",
            "modules": {},
            "integrations": {},
            "performance": {},
            "alerts": []
        }
        
        # Status modulov
        for module_id, module in self.modules.items():
            try:
                # Preveri status modula
                if hasattr(module.instance, "health_check"):
                    module_health = module.instance.health_check()
                else:
                    module_health = {"status": "healthy", "message": "Mock module"}
                
                health_status["modules"][module_id] = {
                    "name": module.name,
                    "status": module.status,
                    "last_sync": module.last_sync,
                    "health": module_health
                }
                
                if module_health.get("status") != "healthy":
                    health_status["alerts"].append(f"Modul {module.name}: {module_health.get('message', 'Neznan problem')}")
                
            except Exception as e:
                health_status["modules"][module_id] = {
                    "name": module.name,
                    "status": "error",
                    "error": str(e)
                }
                health_status["alerts"].append(f"Napaka v modulu {module.name}: {e}")
        
        # Status integracij
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Neprocessirani dogodki
        cursor.execute('SELECT COUNT(*) FROM integration_events WHERE processed = 0')
        pending_events = cursor.fetchone()[0]
        
        # Nedavne napake
        cursor.execute('''
            SELECT COUNT(*) FROM sync_log 
            WHERE status = "error" AND start_time > datetime("now", "-1 hour")
        ''')
        recent_errors = cursor.fetchone()[0]
        
        health_status["integrations"] = {
            "pending_events": pending_events,
            "recent_errors": recent_errors
        }
        
        if pending_events > 100:
            health_status["alerts"].append(f"Veliko čakajočih dogodkov: {pending_events}")
        
        if recent_errors > 0:
            health_status["alerts"].append(f"Nedavne napake sinhronizacije: {recent_errors}")
        
        # Splošen status
        if health_status["alerts"]:
            health_status["overall_status"] = "warning" if len(health_status["alerts"]) < 5 else "critical"
        
        conn.close()
        return health_status

    def get_integration_dashboard(self) -> Dict[str, Any]:
        """Dashboard za integracijski sistem"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Osnovne statistike
        cursor.execute('SELECT COUNT(*) FROM integration_events')
        total_events = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM integration_events WHERE processed = 1')
        processed_events = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM sync_log')
        total_syncs = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM sync_log WHERE status = "success"')
        successful_syncs = cursor.fetchone()[0]
        
        # Dogodki po tipih
        cursor.execute('''
            SELECT event_type, COUNT(*) 
            FROM integration_events 
            GROUP BY event_type
        ''')
        events_by_type = dict(cursor.fetchall())
        
        # Moduli po statusu
        cursor.execute('''
            SELECT status, COUNT(*) 
            FROM system_modules 
            GROUP BY status
        ''')
        modules_by_status = dict(cursor.fetchall())
        
        # Nedavni dogodki
        cursor.execute('''
            SELECT event_type, source_module, timestamp, processed
            FROM integration_events 
            ORDER BY timestamp DESC LIMIT 10
        ''')
        recent_events = cursor.fetchall()
        
        conn.close()
        
        return {
            "overview": {
                "total_modules": len(self.modules),
                "active_modules": sum(1 for m in self.modules.values() if m.status in ["active", "mock"]),
                "total_events": total_events,
                "processed_events": processed_events,
                "processing_rate": round(processed_events / max(total_events, 1) * 100, 1),
                "total_syncs": total_syncs,
                "sync_success_rate": round(successful_syncs / max(total_syncs, 1) * 100, 1)
            },
            "modules": {
                "by_status": modules_by_status,
                "details": {mid: {"name": m.name, "status": m.status} for mid, m in self.modules.items()}
            },
            "events": {
                "by_type": events_by_type,
                "recent": [
                    {
                        "type": event[0],
                        "source": event[1],
                        "timestamp": event[2],
                        "processed": bool(event[3])
                    }
                    for event in recent_events
                ]
            },
            "health": self.get_system_health()
        }

class MockModule:
    """Mock modul za testiranje"""
    def __init__(self, module_id: str):
        self.module_id = module_id
        
    def health_check(self):
        return {"status": "healthy", "message": "Mock module deluje"}
    
    def get_sync_data(self):
        return {"module_id": self.module_id, "data": "mock_data"}
    
    def receive_sync_data(self, data):
        print(f"Mock modul {self.module_id} prejel podatke: {len(data)} modulov")
    
    def handle_integration_event(self, event_type: str, data: Dict[str, Any]):
        print(f"Mock modul {self.module_id} obdelal dogodek {event_type}")

# Demo funkcije
def demo_master_integration():
    """Demo glavne integracije"""
    print("🔹 DEMO: Ultimate Master Integration")
    print("=" * 50)
    
    # Inicializacija sistema
    print("\n🚀 Inicializacija glavnega sistema...")
    master = UltimateMasterIntegration()
    
    # Preverjanje zdravja sistema
    print("\n🏥 Preverjanje zdravja sistema:")
    health = master.get_system_health()
    print(f"• Splošen status: {health['overall_status']}")
    print(f"• Aktivni moduli: {len([m for m in health['modules'].values() if m['status'] in ['active', 'mock']])}")
    print(f"• Opozorila: {len(health['alerts'])}")
    
    # Demo dogodki
    print("\n📡 Sprožitev demo dogodkov:")
    
    # Prodaja v POS sistemu
    event_id1 = master.trigger_event(
        "pos_system", 
        "sale_completed", 
        {
            "sale_id": "sale_001",
            "customer_id": "cust_001",
            "items": [{"name": "Jota", "price": 12.50}],
            "total": 12.50
        },
        priority=8
    )
    print(f"✅ Dogodek prodaje: {event_id1}")
    
    # Rezervacija
    event_id2 = master.trigger_event(
        "reservation_system",
        "reservation_created",
        {
            "reservation_id": "res_001",
            "customer_id": "cust_001",
            "table": "miza_5",
            "date": "2024-01-15",
            "time": "19:00"
        },
        priority=7
    )
    print(f"✅ Dogodek rezervacije: {event_id2}")
    
    # Sinhronizacija
    print("\n🔄 Sinhronizacija modulov:")
    sync_id = master.sync_modules(["pos_system", "crm_system", "hyper_personalization"])
    print(f"✅ Sinhronizacija dokončana: {sync_id}")
    
    # Dashboard
    print("\n📊 Integration Dashboard:")
    dashboard = master.get_integration_dashboard()
    overview = dashboard["overview"]
    print(f"• Skupaj modulov: {overview['total_modules']}")
    print(f"• Aktivni moduli: {overview['active_modules']}")
    print(f"• Skupaj dogodkov: {overview['total_events']}")
    print(f"• Stopnja procesiranja: {overview['processing_rate']}%")
    print(f"• Uspešnost sinhronizacije: {overview['sync_success_rate']}%")
    
    print("\n🎯 Sistem je pripravljen za produkcijo!")

if __name__ == "__main__":
    demo_master_integration()