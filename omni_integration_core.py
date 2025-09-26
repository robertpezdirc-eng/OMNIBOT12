#!/usr/bin/env python3
"""
OMNI INTEGRATION CORE - Integracijsko jedro
============================================

Centralni sistem za povezovanje vseh Omni modulov v enoten ekosistem.
Vključuje meta-agenta, register modulov in upravljanje pretoka podatkov.

Avtor: Omni AI Platform
Verzija: 1.0.0
"""

import json
import sqlite3
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

# Konfiguracija logiranja
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('omni/logs/integration_core.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('OmniIntegrationCore')

class ModuleType(Enum):
    """Tipi modulov v Omni ekosistemu"""
    CORE = "core"
    ANALYTICS = "analytics"
    DOCUMENT = "document"
    CALENDAR = "calendar"
    TASK_MANAGER = "task_manager"
    SEARCH = "search"
    API = "api"
    FINANCE = "finance"
    TOURISM = "tourism"
    HEALTHCARE = "healthcare"
    AGRICULTURE = "agriculture"
    ENERGY = "energy"
    LOGISTICS = "logistics"
    SECURITY = "security"
    IOT = "iot"
    DEVOPS = "devops"
    ART = "art"
    INDUSTRY = "industry"

class TaskPriority(Enum):
    """Prioritete nalog"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class ModuleCapability:
    """Zmožnosti modula"""
    name: str
    description: str
    input_types: List[str]
    output_types: List[str]
    required_params: List[str]
    optional_params: List[str]

@dataclass
class ModuleInfo:
    """Informacije o modulu"""
    id: str
    name: str
    type: ModuleType
    version: str
    status: str  # active, inactive, error
    capabilities: List[ModuleCapability]
    api_endpoint: Optional[str]
    dependencies: List[str]
    last_updated: datetime
    performance_metrics: Dict[str, Any]

@dataclass
class Task:
    """Naloga za procesiranje"""
    id: str
    user_input: str
    intent: str
    priority: TaskPriority
    required_modules: List[str]
    data_flow: List[Dict[str, Any]]
    status: str  # pending, processing, completed, failed
    created_at: datetime
    completed_at: Optional[datetime]
    result: Optional[Dict[str, Any]]

class OmniIntegrationCore:
    """
    Glavno jedro za integracijo vseh Omni modulov
    """
    
    def __init__(self, db_path: str = "omni/data/integration.db"):
        self.db_path = db_path
        self.modules: Dict[str, ModuleInfo] = {}
        self.active_tasks: Dict[str, Task] = {}
        self.data_cache: Dict[str, Any] = {}
        self.event_handlers: Dict[str, List[Callable]] = {}
        
        # Inicializacija baze podatkov
        self._init_database()
        
        # Registracija osnovnih modulov
        self._register_core_modules()
        
        logger.info("Omni Integration Core inicializiran")

    def _init_database(self):
        """Inicializacija SQLite baze za centralno shranjevanje"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za module
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS modules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                version TEXT NOT NULL,
                status TEXT NOT NULL,
                capabilities TEXT,
                api_endpoint TEXT,
                dependencies TEXT,
                last_updated TIMESTAMP,
                performance_metrics TEXT
            )
        ''')
        
        # Tabela za naloge
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                user_input TEXT NOT NULL,
                intent TEXT NOT NULL,
                priority INTEGER NOT NULL,
                required_modules TEXT,
                data_flow TEXT,
                status TEXT NOT NULL,
                created_at TIMESTAMP,
                completed_at TIMESTAMP,
                result TEXT
            )
        ''')
        
        # Tabela za pretok podatkov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS data_flows (
                id TEXT PRIMARY KEY,
                source_module TEXT NOT NULL,
                target_module TEXT NOT NULL,
                data_type TEXT NOT NULL,
                data_content TEXT,
                timestamp TIMESTAMP,
                status TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Baza podatkov inicializirana")

    def _register_core_modules(self):
        """Registracija osnovnih modulov"""
        core_modules = [
            {
                "id": "global",
                "name": "Global Core",
                "type": ModuleType.CORE,
                "capabilities": [
                    ModuleCapability(
                        name="system_coordination",
                        description="Koordinacija celotnega sistema",
                        input_types=["any"],
                        output_types=["system_status", "coordination_result"],
                        required_params=["action"],
                        optional_params=["priority", "timeout"]
                    )
                ]
            },
            {
                "id": "analytics",
                "name": "Analytics Engine",
                "type": ModuleType.ANALYTICS,
                "capabilities": [
                    ModuleCapability(
                        name="data_analysis",
                        description="Analiza podatkov in statistik",
                        input_types=["csv", "json", "database"],
                        output_types=["report", "visualization", "insights"],
                        required_params=["data_source"],
                        optional_params=["analysis_type", "filters"]
                    )
                ]
            },
            {
                "id": "document",
                "name": "Document Processor",
                "type": ModuleType.DOCUMENT,
                "capabilities": [
                    ModuleCapability(
                        name="document_processing",
                        description="Procesiranje dokumentov",
                        input_types=["pdf", "docx", "txt", "html"],
                        output_types=["text", "summary", "metadata"],
                        required_params=["document_path"],
                        optional_params=["extract_images", "language"]
                    )
                ]
            }
        ]
        
        for module_data in core_modules:
            module_info = ModuleInfo(
                id=module_data["id"],
                name=module_data["name"],
                type=module_data["type"],
                version="1.0.0",
                status="active",
                capabilities=module_data["capabilities"],
                api_endpoint=f"http://localhost:8000/api/{module_data['id']}",
                dependencies=[],
                last_updated=datetime.now(),
                performance_metrics={"avg_response_time": 0.5, "success_rate": 0.95}
            )
            self.register_module(module_info)

    def register_module(self, module_info: ModuleInfo) -> bool:
        """Registracija novega modula"""
        try:
            self.modules[module_info.id] = module_info
            
            # Shranjevanje v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO modules 
                (id, name, type, version, status, capabilities, api_endpoint, 
                 dependencies, last_updated, performance_metrics)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                module_info.id,
                module_info.name,
                module_info.type.value,
                module_info.version,
                module_info.status,
                json.dumps([asdict(cap) for cap in module_info.capabilities]),
                module_info.api_endpoint,
                json.dumps(module_info.dependencies),
                module_info.last_updated.isoformat(),
                json.dumps(module_info.performance_metrics)
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Modul {module_info.name} uspešno registriran")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri registraciji modula {module_info.name}: {e}")
            return False

    def get_module_capabilities(self, module_id: str) -> List[ModuleCapability]:
        """Pridobi zmožnosti modula"""
        if module_id in self.modules:
            return self.modules[module_id].capabilities
        return []

    def analyze_user_intent(self, user_input: str) -> Dict[str, Any]:
        """
        Meta-agent za analizo uporabniške namere in določitev potrebnih modulov
        """
        intent_analysis = {
            "original_input": user_input,
            "detected_intent": "",
            "confidence": 0.0,
            "required_modules": [],
            "suggested_workflow": [],
            "priority": TaskPriority.MEDIUM
        }
        
        # Enostavna analiza na osnovi ključnih besed
        input_lower = user_input.lower()
        
        # Analiza dokumentov
        if any(word in input_lower for word in ["pdf", "dokument", "analiza", "preberi", "povzemi"]):
            intent_analysis["detected_intent"] = "document_analysis"
            intent_analysis["required_modules"] = ["document", "analytics"]
            intent_analysis["confidence"] = 0.8
            intent_analysis["suggested_workflow"] = [
                {"module": "document", "action": "extract_text"},
                {"module": "analytics", "action": "analyze_content"}
            ]
        
        # Načrtovanje sestankov
        elif any(word in input_lower for word in ["sestanek", "plan", "koledar", "termin"]):
            intent_analysis["detected_intent"] = "meeting_planning"
            intent_analysis["required_modules"] = ["calendar", "task_manager"]
            intent_analysis["confidence"] = 0.85
            intent_analysis["suggested_workflow"] = [
                {"module": "calendar", "action": "check_availability"},
                {"module": "task_manager", "action": "create_tasks"}
            ]
        
        # Finančna analiza
        elif any(word in input_lower for word in ["finance", "denar", "proračun", "stroški"]):
            intent_analysis["detected_intent"] = "financial_analysis"
            intent_analysis["required_modules"] = ["finance", "analytics"]
            intent_analysis["confidence"] = 0.9
            intent_analysis["priority"] = TaskPriority.HIGH
        
        # Iskanje informacij
        elif any(word in input_lower for word in ["išči", "najdi", "poišči", "search"]):
            intent_analysis["detected_intent"] = "information_search"
            intent_analysis["required_modules"] = ["search", "analytics"]
            intent_analysis["confidence"] = 0.75
        
        # Privzeta analiza
        else:
            intent_analysis["detected_intent"] = "general_query"
            intent_analysis["required_modules"] = ["global", "analytics"]
            intent_analysis["confidence"] = 0.5
        
        logger.info(f"Analiza namere: {intent_analysis['detected_intent']} (zaupanje: {intent_analysis['confidence']})")
        return intent_analysis

    async def process_task(self, user_input: str) -> Dict[str, Any]:
        """Procesiranje naloge z meta-agentom"""
        
        # Analiza namere
        intent_analysis = self.analyze_user_intent(user_input)
        
        # Ustvarjanje naloge
        task = Task(
            id=str(uuid.uuid4()),
            user_input=user_input,
            intent=intent_analysis["detected_intent"],
            priority=intent_analysis["priority"],
            required_modules=intent_analysis["required_modules"],
            data_flow=intent_analysis["suggested_workflow"],
            status="pending",
            created_at=datetime.now(),
            completed_at=None,
            result=None
        )
        
        self.active_tasks[task.id] = task
        
        try:
            # Izvajanje workflow-a
            task.status = "processing"
            results = []
            
            for step in task.data_flow:
                module_id = step["module"]
                action = step["action"]
                
                if module_id in self.modules:
                    # Simulacija klica modula
                    result = await self._call_module(module_id, action, user_input)
                    results.append({
                        "module": module_id,
                        "action": action,
                        "result": result,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    # Shranjevanje pretoka podatkov
                    self._log_data_flow(module_id, "integration_core", "processing_result", result)
            
            # Zaključek naloge
            task.status = "completed"
            task.completed_at = datetime.now()
            task.result = {
                "intent": intent_analysis["detected_intent"],
                "confidence": intent_analysis["confidence"],
                "results": results,
                "summary": f"Naloga '{user_input}' uspešno procesirana z {len(results)} koraki"
            }
            
            # Shranjevanje v bazo
            self._save_task_to_db(task)
            
            logger.info(f"Naloga {task.id} uspešno zaključena")
            return task.result
            
        except Exception as e:
            task.status = "failed"
            task.result = {"error": str(e)}
            logger.error(f"Napaka pri procesiranju naloge {task.id}: {e}")
            return task.result

    async def _call_module(self, module_id: str, action: str, data: Any) -> Dict[str, Any]:
        """Simulacija klica modula"""
        # V produkciji bi to bil pravi API klic
        await asyncio.sleep(0.1)  # Simulacija procesiranja
        
        return {
            "module_id": module_id,
            "action": action,
            "status": "success",
            "data": f"Procesiran rezultat za '{data}' z modulom {module_id}",
            "timestamp": datetime.now().isoformat()
        }

    def _log_data_flow(self, source: str, target: str, data_type: str, content: Any):
        """Beleženje pretoka podatkov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO data_flows 
                (id, source_module, target_module, data_type, data_content, timestamp, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()),
                source,
                target,
                data_type,
                json.dumps(content) if content else None,
                datetime.now().isoformat(),
                "completed"
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju pretoka podatkov: {e}")

    def _save_task_to_db(self, task: Task):
        """Shranjevanje naloge v bazo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO tasks 
                (id, user_input, intent, priority, required_modules, data_flow, 
                 status, created_at, completed_at, result)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                task.id,
                task.user_input,
                task.intent,
                task.priority.value,
                json.dumps(task.required_modules),
                json.dumps(task.data_flow),
                task.status,
                task.created_at.isoformat(),
                task.completed_at.isoformat() if task.completed_at else None,
                json.dumps(task.result) if task.result else None
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju naloge: {e}")

    def get_system_status(self) -> Dict[str, Any]:
        """Pridobi status celotnega sistema"""
        active_modules = len([m for m in self.modules.values() if m.status == "active"])
        
        return {
            "total_modules": len(self.modules),
            "active_modules": active_modules,
            "active_tasks": len(self.active_tasks),
            "system_health": "healthy" if active_modules > 0 else "warning",
            "last_updated": datetime.now().isoformat(),
            "modules": {mid: {"name": m.name, "status": m.status} for mid, m in self.modules.items()}
        }

    def get_module_registry(self) -> Dict[str, Dict[str, Any]]:
        """Pridobi register vseh modulov"""
        registry = {}
        for module_id, module_info in self.modules.items():
            registry[module_id] = {
                "name": module_info.name,
                "type": module_info.type.value,
                "version": module_info.version,
                "status": module_info.status,
                "capabilities": [asdict(cap) for cap in module_info.capabilities],
                "api_endpoint": module_info.api_endpoint,
                "dependencies": module_info.dependencies,
                "performance_metrics": module_info.performance_metrics
            }
        return registry

# Globalna instanca integracijskega jedra
integration_core = OmniIntegrationCore()

if __name__ == "__main__":
    # Test integracijskega jedra
    async def test_integration():
        print("🚀 Testiranje Omni Integration Core...")
        
        # Test analize namere
        test_inputs = [
            "Analiziraj PDF dokument o prodaji",
            "Naredi plan sestanka za naslednji teden",
            "Poišči informacije o energetski učinkovitosti",
            "Pripravi finančno poročilo"
        ]
        
        for test_input in test_inputs:
            print(f"\n📝 Test: '{test_input}'")
            result = await integration_core.process_task(test_input)
            print(f"✅ Rezultat: {result['summary']}")
        
        # Prikaz statusa sistema
        print(f"\n📊 Status sistema:")
        status = integration_core.get_system_status()
        print(json.dumps(status, indent=2, ensure_ascii=False))
    
    # Zagon testa
    asyncio.run(test_integration())