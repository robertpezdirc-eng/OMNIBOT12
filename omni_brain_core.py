#!/usr/bin/env python3
"""
Omni Brain Core - Centralni krmilni center za Omni supermozg
Avtonomni AI orchestrator za upravljanje vseh modulov in sistemov
"""

import asyncio
import json
import logging
import sqlite3
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import threading
import queue
import websockets
import requests
from pathlib import Path

# Konfiguracija logiranja
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('omni_brain.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('OmniBrain')

class ModuleStatus(Enum):
    OFFLINE = "offline"
    ONLINE = "online"
    ERROR = "error"
    MAINTENANCE = "maintenance"

class TaskPriority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class AIModule:
    name: str
    endpoint: str
    status: ModuleStatus
    capabilities: List[str]
    last_heartbeat: datetime
    performance_score: float = 1.0

@dataclass
class Task:
    id: str
    module: str
    action: str
    parameters: Dict[str, Any]
    priority: TaskPriority
    created_at: datetime
    status: str = "pending"
    result: Optional[Dict[str, Any]] = None

class OmniBrainCore:
    """Centralni AI orchestrator za Omni supermozg"""
    
    def __init__(self):
        self.modules: Dict[str, AIModule] = {}
        self.task_queue = queue.PriorityQueue()
        self.active_tasks: Dict[str, Task] = {}
        self.cloud_memory: Dict[str, Any] = {}
        self.learning_patterns: Dict[str, Any] = {}
        self.is_running = False
        self.websocket_server = None
        
        # Inicializacija baze podatkov
        self.init_database()
        
        # Registracija osnovnih modulov
        self.register_default_modules()
        
        logger.info("Omni Brain Core inicializiran")

    def init_database(self):
        """Inicializacija SQLite baze za Omni Brain"""
        self.db_path = "omni_brain.db"
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za module
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS modules (
                name TEXT PRIMARY KEY,
                endpoint TEXT,
                status TEXT,
                capabilities TEXT,
                last_heartbeat TIMESTAMP,
                performance_score REAL
            )
        ''')
        
        # Tabela za naloge
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                module TEXT,
                action TEXT,
                parameters TEXT,
                priority INTEGER,
                created_at TIMESTAMP,
                status TEXT,
                result TEXT
            )
        ''')
        
        # Tabela za učne vzorce
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_patterns (
                id TEXT PRIMARY KEY,
                pattern_type TEXT,
                data TEXT,
                confidence REAL,
                created_at TIMESTAMP
            )
        ''')
        
        # Tabela za oblačni pomnilnik
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cloud_memory (
                key TEXT PRIMARY KEY,
                value TEXT,
                category TEXT,
                updated_at TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Baza podatkov inicializirana")

    def register_default_modules(self):
        """Registracija osnovnih AI modulov"""
        default_modules = [
            {
                "name": "Finance",
                "endpoint": "http://localhost:3001/api/finance",
                "capabilities": ["transactions", "budgets", "investments", "analytics"]
            },
            {
                "name": "Tourism",
                "endpoint": "http://localhost:3002/api/tourism",
                "capabilities": ["itineraries", "bookings", "accommodations", "activities"]
            },
            {
                "name": "IoT",
                "endpoint": "http://localhost:3003/api/iot",
                "capabilities": ["sensors", "monitoring", "automation", "alerts"]
            },
            {
                "name": "Radio",
                "endpoint": "http://localhost:3004/api/radio",
                "capabilities": ["streaming", "playlists", "chat", "broadcasting"]
            },
            {
                "name": "Beekeeping",
                "endpoint": "http://localhost:3005/api/beekeeping",
                "capabilities": ["hives", "monitoring", "production", "sales"]
            },
            {
                "name": "DevOps",
                "endpoint": "http://localhost:3006/api/devops",
                "capabilities": ["monitoring", "deployment", "metrics", "alerts"]
            },
            {
                "name": "Health",
                "endpoint": "http://localhost:3007/api/health",
                "capabilities": ["monitoring", "analytics", "recommendations", "tracking"]
            }
        ]
        
        for module_config in default_modules:
            module = AIModule(
                name=module_config["name"],
                endpoint=module_config["endpoint"],
                status=ModuleStatus.OFFLINE,
                capabilities=module_config["capabilities"],
                last_heartbeat=datetime.now()
            )
            self.modules[module.name] = module
            
        logger.info(f"Registriranih {len(default_modules)} osnovnih modulov")

    async def start_brain(self):
        """Zagon Omni Brain sistema"""
        self.is_running = True
        logger.info("Zaganjam Omni Brain Core...")
        
        # Zagon WebSocket strežnika
        await self.start_websocket_server()
        
        # Zagon glavnih procesov
        tasks = [
            asyncio.create_task(self.module_health_monitor()),
            asyncio.create_task(self.task_processor()),
            asyncio.create_task(self.learning_engine()),
            asyncio.create_task(self.autonomous_decision_maker())
        ]
        
        logger.info("Omni Brain Core aktiven - avtonomno delovanje omogočeno")
        await asyncio.gather(*tasks)

    async def start_websocket_server(self):
        """Zagon WebSocket strežnika za real-time komunikacijo"""
        async def handle_client(websocket, path):
            logger.info(f"Nova WebSocket povezava: {websocket.remote_address}")
            try:
                async for message in websocket:
                    data = json.loads(message)
                    response = await self.handle_websocket_message(data)
                    await websocket.send(json.dumps(response))
            except Exception as e:
                logger.error(f"WebSocket napaka: {e}")
        
        self.websocket_server = await websockets.serve(handle_client, "localhost", 8765)
        logger.info("WebSocket strežnik zagnan na portu 8765")

    async def handle_websocket_message(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Obravnava WebSocket sporočil"""
        message_type = data.get("type")
        
        if message_type == "module_status":
            return {"type": "status", "modules": self.get_modules_status()}
        elif message_type == "execute_task":
            task_id = await self.create_task(
                data["module"], 
                data["action"], 
                data.get("parameters", {}),
                TaskPriority(data.get("priority", 2))
            )
            return {"type": "task_created", "task_id": task_id}
        elif message_type == "get_memory":
            return {"type": "memory", "data": self.get_cloud_memory(data.get("category"))}
        else:
            return {"type": "error", "message": "Neznana vrsta sporočila"}

    async def module_health_monitor(self):
        """Spremljanje zdravja modulov"""
        while self.is_running:
            for module_name, module in self.modules.items():
                try:
                    # Pošljemo heartbeat zahtevo
                    response = requests.get(f"{module.endpoint}/health", timeout=5)
                    if response.status_code == 200:
                        module.status = ModuleStatus.ONLINE
                        module.last_heartbeat = datetime.now()
                        module.performance_score = min(1.0, module.performance_score + 0.1)
                    else:
                        module.status = ModuleStatus.ERROR
                        module.performance_score = max(0.1, module.performance_score - 0.2)
                except Exception as e:
                    module.status = ModuleStatus.OFFLINE
                    module.performance_score = max(0.1, module.performance_score - 0.3)
                    logger.warning(f"Modul {module_name} ni dosegljiv: {e}")
                
                # Shranimo stanje v bazo
                self.save_module_status(module)
            
            await asyncio.sleep(30)  # Preverjamo vsakih 30 sekund

    async def task_processor(self):
        """Procesiranje nalog iz čakalne vrste"""
        while self.is_running:
            try:
                if not self.task_queue.empty():
                    priority, task = self.task_queue.get()
                    await self.execute_task(task)
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Napaka pri procesiranju nalog: {e}")

    async def execute_task(self, task: Task):
        """Izvršitev naloge"""
        logger.info(f"Izvršujem nalogo {task.id} za modul {task.module}")
        
        module = self.modules.get(task.module)
        if not module or module.status != ModuleStatus.ONLINE:
            task.status = "failed"
            task.result = {"error": "Modul ni dosegljiv"}
            return
        
        try:
            # Pošljemo zahtevo modulu
            response = requests.post(
                f"{module.endpoint}/{task.action}",
                json=task.parameters,
                timeout=30
            )
            
            if response.status_code == 200:
                task.status = "completed"
                task.result = response.json()
                logger.info(f"Naloga {task.id} uspešno dokončana")
            else:
                task.status = "failed"
                task.result = {"error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            task.status = "failed"
            task.result = {"error": str(e)}
            logger.error(f"Napaka pri izvršitvi naloge {task.id}: {e}")
        
        # Shranimo rezultat
        self.save_task_result(task)
        
        # Odstranimo iz aktivnih nalog
        if task.id in self.active_tasks:
            del self.active_tasks[task.id]

    async def learning_engine(self):
        """AI učni sistem za optimizacijo delovanja"""
        while self.is_running:
            try:
                # Analiziramo vzorce uporabe
                patterns = self.analyze_usage_patterns()
                
                # Optimiziramo delovanje na podlagi vzorcev
                await self.optimize_performance(patterns)
                
                # Shranimo naučene vzorce
                self.save_learning_patterns(patterns)
                
                await asyncio.sleep(300)  # Učimo se vsakih 5 minut
            except Exception as e:
                logger.error(f"Napaka v učnem sistemu: {e}")

    async def autonomous_decision_maker(self):
        """Avtonomno sprejemanje odločitev"""
        while self.is_running:
            try:
                # Analiziramo trenutno stanje sistema
                system_state = self.analyze_system_state()
                
                # Sprejemamo avtonomne odločitve
                decisions = self.make_autonomous_decisions(system_state)
                
                # Izvršimo odločitve
                for decision in decisions:
                    await self.execute_autonomous_decision(decision)
                
                await asyncio.sleep(60)  # Odločamo vsakih 60 sekund
            except Exception as e:
                logger.error(f"Napaka pri avtonomnem odločanju: {e}")

    async def create_task(self, module: str, action: str, parameters: Dict[str, Any], priority: TaskPriority) -> str:
        """Ustvarjanje nove naloge"""
        task_id = f"task_{int(time.time() * 1000)}"
        task = Task(
            id=task_id,
            module=module,
            action=action,
            parameters=parameters,
            priority=priority,
            created_at=datetime.now()
        )
        
        self.active_tasks[task_id] = task
        self.task_queue.put((priority.value, task))
        
        logger.info(f"Ustvarjena naloga {task_id} za modul {module}")
        return task_id

    def get_modules_status(self) -> Dict[str, Any]:
        """Pridobi status vseh modulov"""
        return {
            name: {
                "status": module.status.value,
                "capabilities": module.capabilities,
                "performance_score": module.performance_score,
                "last_heartbeat": module.last_heartbeat.isoformat()
            }
            for name, module in self.modules.items()
        }

    def save_module_status(self, module: AIModule):
        """Shrani status modula v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO modules 
            (name, endpoint, status, capabilities, last_heartbeat, performance_score)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            module.name,
            module.endpoint,
            module.status.value,
            json.dumps(module.capabilities),
            module.last_heartbeat,
            module.performance_score
        ))
        conn.commit()
        conn.close()

    def save_task_result(self, task: Task):
        """Shrani rezultat naloge v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO tasks 
            (id, module, action, parameters, priority, created_at, status, result)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            task.id,
            task.module,
            task.action,
            json.dumps(task.parameters),
            task.priority.value,
            task.created_at,
            task.status,
            json.dumps(task.result) if task.result else None
        ))
        conn.commit()
        conn.close()

    def analyze_usage_patterns(self) -> Dict[str, Any]:
        """Analiza vzorcev uporabe"""
        # Implementacija analize vzorcev
        return {
            "most_used_modules": ["Finance", "Tourism", "IoT"],
            "peak_hours": [9, 14, 18],
            "common_tasks": ["analytics", "monitoring", "reporting"]
        }

    async def optimize_performance(self, patterns: Dict[str, Any]):
        """Optimizacija delovanja na podlagi vzorcev"""
        # Implementacija optimizacije
        logger.info("Optimiziram delovanje sistema na podlagi naučenih vzorcev")

    def save_learning_patterns(self, patterns: Dict[str, Any]):
        """Shrani naučene vzorce"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        pattern_id = f"pattern_{int(time.time())}"
        cursor.execute('''
            INSERT INTO learning_patterns (id, pattern_type, data, confidence, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (pattern_id, "usage_patterns", json.dumps(patterns), 0.8, datetime.now()))
        conn.commit()
        conn.close()

    def analyze_system_state(self) -> Dict[str, Any]:
        """Analiza trenutnega stanja sistema"""
        online_modules = sum(1 for m in self.modules.values() if m.status == ModuleStatus.ONLINE)
        total_modules = len(self.modules)
        
        return {
            "system_health": online_modules / total_modules,
            "active_tasks": len(self.active_tasks),
            "queue_size": self.task_queue.qsize(),
            "timestamp": datetime.now().isoformat()
        }

    def make_autonomous_decisions(self, system_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Sprejemanje avtonomnih odločitev"""
        decisions = []
        
        # Če je sistem health pod 0.7, poskusi restart modulov
        if system_state["system_health"] < 0.7:
            decisions.append({
                "type": "restart_modules",
                "reason": "Nizko zdravje sistema"
            })
        
        # Če je čakalna vrsta prevelika, povečaj prioriteto
        if system_state["queue_size"] > 50:
            decisions.append({
                "type": "increase_processing_speed",
                "reason": "Prevelika čakalna vrsta"
            })
        
        return decisions

    async def execute_autonomous_decision(self, decision: Dict[str, Any]):
        """Izvršitev avtonomne odločitve"""
        logger.info(f"Izvršujem avtonomno odločitev: {decision['type']} - {decision['reason']}")
        
        if decision["type"] == "restart_modules":
            await self.restart_offline_modules()
        elif decision["type"] == "increase_processing_speed":
            # Implementacija povečanja hitrosti procesiranja
            pass

    async def restart_offline_modules(self):
        """Poskus ponovnega zagona offline modulov"""
        for module_name, module in self.modules.items():
            if module.status == ModuleStatus.OFFLINE:
                logger.info(f"Poskušam ponovno zagnati modul {module_name}")
                # Implementacija ponovnega zagona

    def get_cloud_memory(self, category: Optional[str] = None) -> Dict[str, Any]:
        """Pridobi podatke iz oblačnega pomnilnika"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if category:
            cursor.execute('SELECT key, value FROM cloud_memory WHERE category = ?', (category,))
        else:
            cursor.execute('SELECT key, value FROM cloud_memory')
        
        results = cursor.fetchall()
        conn.close()
        
        return {key: json.loads(value) for key, value in results}

    def set_cloud_memory(self, key: str, value: Any, category: str = "general"):
        """Nastavi podatke v oblačni pomnilnik"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO cloud_memory (key, value, category, updated_at)
            VALUES (?, ?, ?, ?)
        ''', (key, json.dumps(value), category, datetime.now()))
        conn.commit()
        conn.close()

    async def shutdown(self):
        """Varno zaustavitev sistema"""
        logger.info("Zaustavlja Omni Brain Core...")
        self.is_running = False
        
        if self.websocket_server:
            self.websocket_server.close()
            await self.websocket_server.wait_closed()
        
        logger.info("Omni Brain Core zaustavljen")

# Glavna funkcija za zagon
async def main():
    brain = OmniBrainCore()
    try:
        await brain.start_brain()
    except KeyboardInterrupt:
        await brain.shutdown()

if __name__ == "__main__":
    asyncio.run(main())