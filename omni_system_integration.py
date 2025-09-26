#!/usr/bin/env python3
"""
Omni System Integration - Sistemska integracija
Povezovanje vseh komponent: Brain, Moduli, Oblačni pomnilnik, Mobilni terminal
Testiranje funkcionalnosti nadzora in avtonomnega delovanja
"""

import asyncio
import json
import logging
import time
import threading
import websockets
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import subprocess
import psutil
import os
from pathlib import Path

# Uvoz naših komponent
try:
    from omni_brain_core import OmniBrainCore
    from omni_module_connectors import ModuleConnectorManager
    from omni_cloud_memory import OmniCloudMemory, DataCategory
except ImportError as e:
    print(f"Napaka pri uvozu komponent: {e}")

logger = logging.getLogger('OmniSystemIntegration')

class SystemState(Enum):
    INITIALIZING = "initializing"
    RUNNING = "running"
    MONITORING = "monitoring"
    AUTONOMOUS = "autonomous"
    ERROR = "error"
    SHUTDOWN = "shutdown"

class ComponentStatus(Enum):
    OFFLINE = "offline"
    STARTING = "starting"
    ONLINE = "online"
    ERROR = "error"
    MAINTENANCE = "maintenance"

@dataclass
class SystemMetrics:
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_connections: int
    active_modules: int
    processed_tasks: int
    uptime_seconds: int
    last_update: datetime

@dataclass
class ComponentHealth:
    name: str
    status: ComponentStatus
    last_heartbeat: datetime
    error_count: int
    performance_score: float
    metadata: Dict[str, Any]

class OmniSystemIntegration:
    """Glavni sistem za integracijo vseh Omni komponent"""
    
    def __init__(self, config_path="config.json"):
        self.config_path = config_path
        self.config = {}
        self.system_state = SystemState.INITIALIZING
        self.start_time = datetime.now()
        
        # Komponente
        self.brain_core = None
        self.module_manager = None
        self.cloud_memory = None
        self.websocket_server = None
        
        # Stanje sistema
        self.components_health = {}
        self.system_metrics = None
        self.active_connections = {}
        self.task_queue = asyncio.Queue()
        self.autonomous_mode = False
        
        # Monitoring
        self.monitoring_active = False
        self.monitoring_thread = None
        self.metrics_history = []
        
        # WebSocket server za mobilni terminal
        self.ws_port = 8888
        self.connected_terminals = set()
        
    async def initialize_system(self):
        """Inicializacija celotnega sistema"""
        logger.info("🚀 Inicializacija Omni Sistema...")
        
        try:
            # 1. Naloži konfiguracijo
            await self._load_configuration()
            
            # 2. Inicializiraj komponente
            await self._initialize_components()
            
            # 3. Vzpostavi povezave
            await self._establish_connections()
            
            # 4. Zaženi WebSocket server
            await self._start_websocket_server()
            
            # 5. Zaženi monitoring
            await self._start_monitoring()
            
            # 6. Aktiviraj avtonomni način
            await self._activate_autonomous_mode()
            
            self.system_state = SystemState.RUNNING
            logger.info("✅ Omni Sistem uspešno inicializiran")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji: {e}")
            self.system_state = SystemState.ERROR
            return False
    
    async def _load_configuration(self):
        """Naloži konfiguracijo"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    self.config = json.load(f)
            else:
                # Privzeta konfiguracija
                self.config = {
                    "debug": True,
                    "log_level": "INFO",
                    "data_path": "./data",
                    "modules": {
                        "finance": {"enabled": True, "auto_start": True},
                        "tourism": {"enabled": True, "auto_start": True},
                        "iot": {"enabled": True, "auto_start": True},
                        "radio": {"enabled": True, "auto_start": True},
                        "beekeeping": {"enabled": True, "auto_start": True},
                        "devops": {"enabled": True, "auto_start": True},
                        "healthcare": {"enabled": True, "auto_start": True}
                    },
                    "cloud_memory": {
                        "redis_host": "localhost",
                        "redis_port": 6379,
                        "sqlite_path": "omni_cloud_memory.db"
                    },
                    "websocket": {
                        "port": 8888,
                        "max_connections": 10
                    },
                    "monitoring": {
                        "interval_seconds": 30,
                        "metrics_retention_hours": 24,
                        "alert_thresholds": {
                            "cpu_usage": 80,
                            "memory_usage": 85,
                            "error_rate": 5
                        }
                    }
                }
                
                # Shrani privzeto konfiguracijo
                with open(self.config_path, 'w', encoding='utf-8') as f:
                    json.dump(self.config, f, indent=2, ensure_ascii=False)
            
            logger.info("📋 Konfiguracija naložena")
            
        except Exception as e:
            logger.error(f"Napaka pri nalaganju konfiguracije: {e}")
            raise
    
    async def _initialize_components(self):
        """Inicializiraj vse komponente"""
        logger.info("🔧 Inicializacija komponent...")
        
        try:
            # 1. Omni Brain Core
            self.brain_core = OmniBrainCore()
            await self.brain_core.initialize()
            self._update_component_health("brain_core", ComponentStatus.ONLINE)
            
            # 2. Module Manager
            self.module_manager = ModuleConnectorManager()
            await self.module_manager.initialize_all_modules()
            self._update_component_health("module_manager", ComponentStatus.ONLINE)
            
            # 3. Cloud Memory
            cloud_config = self.config.get("cloud_memory", {})
            self.cloud_memory = OmniCloudMemory(
                redis_host=cloud_config.get("redis_host", "localhost"),
                redis_port=cloud_config.get("redis_port", 6379),
                db_path=cloud_config.get("sqlite_path", "omni_cloud_memory.db")
            )
            await self.cloud_memory.initialize()
            self._update_component_health("cloud_memory", ComponentStatus.ONLINE)
            
            logger.info("✅ Vse komponente inicializirane")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji komponent: {e}")
            raise
    
    async def _establish_connections(self):
        """Vzpostavi povezave med komponentami"""
        logger.info("🔗 Vzpostavljanje povezav...")
        
        try:
            # Poveži Brain z moduli
            if self.brain_core and self.module_manager:
                for module_name in self.module_manager.connectors:
                    connector = self.module_manager.connectors[module_name]
                    self.brain_core.register_module(module_name, connector)
                    logger.info(f"🔗 {module_name} povezan z Brain")
            
            # Poveži Brain z oblačnim pomnilnikom
            if self.brain_core and self.cloud_memory:
                self.brain_core.cloud_memory = self.cloud_memory
                logger.info("🔗 Brain povezan z oblačnim pomnilnikom")
            
            logger.info("✅ Povezave vzpostavljene")
            
        except Exception as e:
            logger.error(f"Napaka pri vzpostavljanju povezav: {e}")
            raise
    
    async def _start_websocket_server(self):
        """Zaženi WebSocket server za mobilni terminal"""
        logger.info("🌐 Zaganjam WebSocket server...")
        
        try:
            async def handle_terminal_connection(websocket, path):
                """Obravnavaj povezavo mobilnega terminala"""
                client_id = f"terminal_{int(time.time())}"
                self.connected_terminals.add(websocket)
                logger.info(f"📱 Mobilni terminal povezan: {client_id}")
                
                try:
                    async for message in websocket:
                        await self._handle_terminal_message(websocket, message)
                except websockets.exceptions.ConnectionClosed:
                    logger.info(f"📱 Terminal {client_id} prekinil povezavo")
                finally:
                    self.connected_terminals.discard(websocket)
            
            # Zaženi server
            self.websocket_server = await websockets.serve(
                handle_terminal_connection,
                "localhost",
                self.ws_port
            )
            
            logger.info(f"✅ WebSocket server aktiven na portu {self.ws_port}")
            
        except Exception as e:
            logger.error(f"Napaka pri zagonu WebSocket serverja: {e}")
            raise
    
    async def _handle_terminal_message(self, websocket, message_str: str):
        """Obravnavaj sporočilo iz mobilnega terminala"""
        try:
            message = json.loads(message_str)
            command_type = message.get("command_type")
            data = message.get("data", {})
            
            response = None
            
            if command_type == "system_status":
                response = await self._get_system_status()
            elif command_type == "module_control":
                response = await self._handle_module_control(data)
            elif command_type == "data_query":
                response = await self._handle_data_query(data)
            elif command_type == "task_management":
                response = await self._handle_task_management(data)
            elif command_type == "analytics":
                response = await self._get_analytics_data()
            elif command_type == "emergency_stop":
                response = await self._handle_emergency_stop()
            elif command_type == "health_check":
                response = await self._get_health_check()
            
            if response:
                await websocket.send(json.dumps({
                    "type": "response",
                    "command_type": command_type,
                    "data": response,
                    "timestamp": datetime.now().isoformat()
                }))
                
        except Exception as e:
            logger.error(f"Napaka pri obravnavi sporočila terminala: {e}")
            await websocket.send(json.dumps({
                "type": "error",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }))
    
    async def _get_system_status(self) -> Dict[str, Any]:
        """Pridobi status sistema"""
        uptime = datetime.now() - self.start_time
        
        return {
            "state": self.system_state.value,
            "uptime": str(uptime),
            "uptime_seconds": int(uptime.total_seconds()),
            "components": {name: health.status.value for name, health in self.components_health.items()},
            "active_modules": len([h for h in self.components_health.values() if h.status == ComponentStatus.ONLINE]),
            "connected_terminals": len(self.connected_terminals),
            "autonomous_mode": self.autonomous_mode,
            "last_update": datetime.now().isoformat()
        }
    
    async def _handle_module_control(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Upravljanje modulov"""
        module_name = data.get("module")
        action = data.get("action")
        
        if not module_name or not action:
            return {"error": "Manjka ime modula ali akcija"}
        
        try:
            if action == "start":
                result = await self.module_manager.start_module(module_name)
            elif action == "stop":
                result = await self.module_manager.stop_module(module_name)
            elif action == "restart":
                result = await self.module_manager.restart_module(module_name)
            elif action == "status":
                result = await self.module_manager.get_module_status(module_name)
            else:
                return {"error": f"Neznana akcija: {action}"}
            
            return {"success": True, "result": result}
            
        except Exception as e:
            return {"error": str(e)}
    
    async def _handle_data_query(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Poizvedba podatkov"""
        category = data.get("category")
        filters = data.get("filters", {})
        limit = data.get("limit", 10)
        
        try:
            if category:
                data_category = DataCategory(category)
                results = await self.cloud_memory.query_data(data_category, filters, limit)
                return {"results": results, "count": len(results)}
            else:
                # Pridobi statistike
                stats = await self.cloud_memory.get_storage_stats()
                return {"statistics": stats}
                
        except Exception as e:
            return {"error": str(e)}
    
    async def _handle_task_management(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Upravljanje nalog"""
        action = data.get("action")
        
        try:
            if action == "list":
                # Pridobi aktivne naloge iz Brain
                tasks = await self.brain_core.get_active_tasks()
                return {"tasks": tasks}
            elif action == "create":
                task_data = data.get("task_data", {})
                task_id = await self.brain_core.create_task(task_data)
                return {"task_id": task_id, "success": True}
            elif action == "complete":
                task_id = data.get("task_id")
                result = await self.brain_core.complete_task(task_id)
                return {"success": result}
            else:
                return {"error": f"Neznana akcija: {action}"}
                
        except Exception as e:
            return {"error": str(e)}
    
    async def _get_analytics_data(self) -> Dict[str, Any]:
        """Pridobi analitične podatke"""
        try:
            # Sistemske metrike
            metrics = self._collect_system_metrics()
            
            # Statistike modulov
            module_stats = {}
            for name, health in self.components_health.items():
                module_stats[name] = {
                    "status": health.status.value,
                    "performance_score": health.performance_score,
                    "error_count": health.error_count,
                    "last_heartbeat": health.last_heartbeat.isoformat()
                }
            
            # Statistike oblačnega pomnilnika
            storage_stats = await self.cloud_memory.get_storage_stats()
            
            return {
                "system_metrics": asdict(metrics),
                "module_statistics": module_stats,
                "storage_statistics": storage_stats,
                "metrics_history": self.metrics_history[-10:],  # Zadnjih 10 meritev
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    async def _handle_emergency_stop(self) -> Dict[str, Any]:
        """Nujna zaustavitev"""
        logger.warning("🆘 NUJNA ZAUSTAVITEV AKTIVIRANA!")
        
        try:
            # Zaustavi vse module
            if self.module_manager:
                await self.module_manager.emergency_shutdown()
            
            # Zaustavi avtonomni način
            self.autonomous_mode = False
            
            # Shrani kritične podatke
            await self._emergency_backup()
            
            # Obvesti vse terminale
            await self._broadcast_to_terminals({
                "type": "notification",
                "message": "🆘 Nujna zaustavitev izvedena",
                "priority": "critical",
                "timestamp": datetime.now().isoformat()
            })
            
            return {"success": True, "message": "Nujna zaustavitev izvedena"}
            
        except Exception as e:
            logger.error(f"Napaka pri nujni zaustavitvi: {e}")
            return {"error": str(e)}
    
    async def _get_health_check(self) -> Dict[str, Any]:
        """Preverjanje zdravja sistema"""
        health_report = {
            "overall_status": "healthy",
            "components": {},
            "issues": [],
            "recommendations": []
        }
        
        try:
            # Preveri vse komponente
            for name, health in self.components_health.items():
                component_health = {
                    "status": health.status.value,
                    "performance_score": health.performance_score,
                    "error_count": health.error_count,
                    "last_heartbeat_age": (datetime.now() - health.last_heartbeat).total_seconds()
                }
                
                health_report["components"][name] = component_health
                
                # Preveri probleme
                if health.status == ComponentStatus.ERROR:
                    health_report["issues"].append(f"Komponenta {name} ima napako")
                    health_report["overall_status"] = "degraded"
                
                if health.performance_score < 0.7:
                    health_report["issues"].append(f"Komponenta {name} ima nizko zmogljivost")
                    health_report["recommendations"].append(f"Preveri komponento {name}")
            
            # Sistemske metrike
            metrics = self._collect_system_metrics()
            if metrics.cpu_usage > 80:
                health_report["issues"].append("Visoka obremenitev CPU")
                health_report["recommendations"].append("Optimiziraj procese")
            
            if metrics.memory_usage > 85:
                health_report["issues"].append("Visoka poraba pomnilnika")
                health_report["recommendations"].append("Počisti pomnilnik")
            
            if health_report["issues"]:
                health_report["overall_status"] = "warning" if health_report["overall_status"] == "healthy" else "critical"
            
            return health_report
            
        except Exception as e:
            return {"error": str(e), "overall_status": "error"}
    
    async def _start_monitoring(self):
        """Zaženi monitoring sistema"""
        logger.info("📊 Zaganjam monitoring...")
        
        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_worker, daemon=True)
        self.monitoring_thread.start()
        
        logger.info("✅ Monitoring aktiven")
    
    def _monitoring_worker(self):
        """Delovni proces za monitoring"""
        while self.monitoring_active:
            try:
                # Zberi metrike
                metrics = self._collect_system_metrics()
                self.system_metrics = metrics
                
                # Dodaj v zgodovino
                self.metrics_history.append({
                    "timestamp": datetime.now().isoformat(),
                    "metrics": asdict(metrics)
                })
                
                # Ohrani samo zadnjih 100 meritev
                if len(self.metrics_history) > 100:
                    self.metrics_history = self.metrics_history[-100:]
                
                # Preveri alarme
                self._check_alerts(metrics)
                
                # Posodobi zdravje komponent
                self._update_components_health()
                
                # Shrani metrike v oblačni pomnilnik
                asyncio.run(self._store_metrics(metrics))
                
                # Počakaj do naslednje meritve
                interval = self.config.get("monitoring", {}).get("interval_seconds", 30)
                time.sleep(interval)
                
            except Exception as e:
                logger.error(f"Napaka v monitoring procesu: {e}")
                time.sleep(10)
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """Zberi sistemske metrike"""
        try:
            # CPU in pomnilnik
            cpu_usage = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Omrežne povezave
            connections = len(psutil.net_connections())
            
            # Aktivni moduli
            active_modules = len([h for h in self.components_health.values() 
                                if h.status == ComponentStatus.ONLINE])
            
            # Uptime
            uptime = (datetime.now() - self.start_time).total_seconds()
            
            return SystemMetrics(
                cpu_usage=cpu_usage,
                memory_usage=memory.percent,
                disk_usage=disk.percent,
                network_connections=connections,
                active_modules=active_modules,
                processed_tasks=0,  # To bo implementirano v Brain
                uptime_seconds=int(uptime),
                last_update=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Napaka pri zbiranju metrik: {e}")
            return SystemMetrics(0, 0, 0, 0, 0, 0, 0, datetime.now())
    
    def _check_alerts(self, metrics: SystemMetrics):
        """Preveri alarme"""
        thresholds = self.config.get("monitoring", {}).get("alert_thresholds", {})
        
        alerts = []
        
        if metrics.cpu_usage > thresholds.get("cpu_usage", 80):
            alerts.append(f"⚠️ Visoka obremenitev CPU: {metrics.cpu_usage:.1f}%")
        
        if metrics.memory_usage > thresholds.get("memory_usage", 85):
            alerts.append(f"⚠️ Visoka poraba pomnilnika: {metrics.memory_usage:.1f}%")
        
        if metrics.disk_usage > 90:
            alerts.append(f"⚠️ Disk skoraj poln: {metrics.disk_usage:.1f}%")
        
        # Pošlji alarme na terminale
        if alerts:
            asyncio.run(self._broadcast_alerts(alerts))
    
    async def _broadcast_alerts(self, alerts: List[str]):
        """Pošlji alarme na vse terminale"""
        for alert in alerts:
            await self._broadcast_to_terminals({
                "type": "notification",
                "message": alert,
                "priority": "warning",
                "timestamp": datetime.now().isoformat()
            })
    
    async def _broadcast_to_terminals(self, message: Dict[str, Any]):
        """Pošlji sporočilo na vse povezane terminale"""
        if self.connected_terminals:
            message_str = json.dumps(message)
            disconnected = set()
            
            for terminal in self.connected_terminals:
                try:
                    await terminal.send(message_str)
                except websockets.exceptions.ConnectionClosed:
                    disconnected.add(terminal)
            
            # Odstrani prekinjene povezave
            self.connected_terminals -= disconnected
    
    def _update_component_health(self, component_name: str, status: ComponentStatus, 
                               performance_score: float = 1.0, metadata: Dict[str, Any] = None):
        """Posodobi zdravje komponente"""
        if component_name not in self.components_health:
            self.components_health[component_name] = ComponentHealth(
                name=component_name,
                status=status,
                last_heartbeat=datetime.now(),
                error_count=0,
                performance_score=performance_score,
                metadata=metadata or {}
            )
        else:
            health = self.components_health[component_name]
            health.status = status
            health.last_heartbeat = datetime.now()
            health.performance_score = performance_score
            if metadata:
                health.metadata.update(metadata)
    
    def _update_components_health(self):
        """Posodobi zdravje vseh komponent"""
        try:
            # Preveri Brain
            if self.brain_core:
                self._update_component_health("brain_core", ComponentStatus.ONLINE, 0.95)
            
            # Preveri Module Manager
            if self.module_manager:
                active_modules = len([c for c in self.module_manager.connectors.values() 
                                    if c.is_connected()])
                total_modules = len(self.module_manager.connectors)
                score = active_modules / total_modules if total_modules > 0 else 0
                self._update_component_health("module_manager", ComponentStatus.ONLINE, score)
            
            # Preveri Cloud Memory
            if self.cloud_memory:
                self._update_component_health("cloud_memory", ComponentStatus.ONLINE, 0.9)
                
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju zdravja komponent: {e}")
    
    async def _store_metrics(self, metrics: SystemMetrics):
        """Shrani metrike v oblačni pomnilnik"""
        try:
            if self.cloud_memory:
                await self.cloud_memory.store_data(
                    category=DataCategory.SYSTEM_METRICS,
                    data=asdict(metrics),
                    metadata={"source": "system_integration", "type": "metrics"},
                    expires_in_hours=24
                )
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju metrik: {e}")
    
    async def _activate_autonomous_mode(self):
        """Aktiviraj avtonomni način delovanja"""
        logger.info("🤖 Aktivacija avtonomnega načina...")
        
        self.autonomous_mode = True
        
        # Zaženi avtonomni proces
        asyncio.create_task(self._autonomous_worker())
        
        logger.info("✅ Avtonomni način aktiven")
    
    async def _autonomous_worker(self):
        """Avtonomni delovni proces"""
        while self.autonomous_mode and self.system_state == SystemState.RUNNING:
            try:
                # Preveri stanje sistema
                if self.system_metrics:
                    # Avtomatska optimizacija
                    await self._auto_optimize_system()
                    
                    # Prediktivno vzdrževanje
                    await self._predictive_maintenance()
                    
                    # Samodejno upravljanje nalog
                    await self._auto_task_management()
                
                # Počakaj pred naslednjo iteracijo
                await asyncio.sleep(60)  # Vsako minuto
                
            except Exception as e:
                logger.error(f"Napaka v avtonomnem procesu: {e}")
                await asyncio.sleep(30)
    
    async def _auto_optimize_system(self):
        """Avtomatska optimizacija sistema"""
        if not self.system_metrics:
            return
        
        # Če je CPU obremenitev visoka, poskusi optimizirati
        if self.system_metrics.cpu_usage > 70:
            logger.info("🔧 Avtomatska optimizacija CPU...")
            # Implementiraj optimizacijske ukrepe
            
        # Če je pomnilnik poln, počisti cache
        if self.system_metrics.memory_usage > 80:
            logger.info("🧹 Čiščenje pomnilnika...")
            # Implementiraj čiščenje
    
    async def _predictive_maintenance(self):
        """Prediktivno vzdrževanje"""
        # Analiziraj trende in predvidi potrebe po vzdrževanju
        if len(self.metrics_history) > 10:
            # Implementiraj analizo trendov
            pass
    
    async def _auto_task_management(self):
        """Samodejno upravljanje nalog"""
        if self.brain_core:
            # Ustvari samodejne naloge glede na stanje sistema
            await self.brain_core.auto_generate_tasks(self.system_metrics)
    
    async def _emergency_backup(self):
        """Nujna varnostna kopija"""
        try:
            if self.cloud_memory:
                backup_path = f"emergency_backup_{int(time.time())}.gz"
                await self.cloud_memory.backup_to_file(backup_path)
                logger.info(f"💾 Nujna varnostna kopija: {backup_path}")
        except Exception as e:
            logger.error(f"Napaka pri nujni varnostni kopiji: {e}")
    
    async def run_integration_test(self):
        """Izvedi test integracije"""
        logger.info("🧪 Izvajam test integracije...")
        
        test_results = {
            "brain_to_modules": False,
            "brain_to_cloud": False,
            "cloud_to_terminal": False,
            "full_cycle": False,
            "autonomous_mode": False
        }
        
        try:
            # Test 1: Brain → Moduli
            if self.brain_core and self.module_manager:
                test_task = {"type": "test", "data": "integration_test"}
                result = await self.brain_core.process_task(test_task)
                test_results["brain_to_modules"] = result is not None
            
            # Test 2: Brain → Oblačni pomnilnik
            if self.brain_core and self.cloud_memory:
                test_data = {"test": "integration", "timestamp": datetime.now().isoformat()}
                data_id = await self.cloud_memory.store_data(
                    DataCategory.TASKS, test_data, {"source": "integration_test"}
                )
                retrieved = await self.cloud_memory.retrieve_data(data_id, DataCategory.TASKS)
                test_results["brain_to_cloud"] = retrieved is not None
            
            # Test 3: Oblačni pomnilnik → Terminal
            if self.connected_terminals:
                await self._broadcast_to_terminals({
                    "type": "notification",
                    "message": "🧪 Test integracije",
                    "priority": "info",
                    "timestamp": datetime.now().isoformat()
                })
                test_results["cloud_to_terminal"] = True
            
            # Test 4: Polni cikel
            test_results["full_cycle"] = all([
                test_results["brain_to_modules"],
                test_results["brain_to_cloud"],
                test_results["cloud_to_terminal"]
            ])
            
            # Test 5: Avtonomni način
            test_results["autonomous_mode"] = self.autonomous_mode
            
            logger.info(f"✅ Test integracije končan: {test_results}")
            return test_results
            
        except Exception as e:
            logger.error(f"❌ Napaka pri testu integracije: {e}")
            return test_results
    
    async def generate_system_report(self) -> Dict[str, Any]:
        """Generiraj podrobno poročilo o sistemu"""
        logger.info("📊 Generiranje sistemskega poročila...")
        
        try:
            # Osnovne informacije
            uptime = datetime.now() - self.start_time
            
            # Komponente
            components_status = {}
            for name, health in self.components_health.items():
                components_status[name] = {
                    "status": health.status.value,
                    "performance_score": health.performance_score,
                    "error_count": health.error_count,
                    "last_heartbeat": health.last_heartbeat.isoformat(),
                    "metadata": health.metadata
                }
            
            # Sistemske metrike
            current_metrics = self._collect_system_metrics()
            
            # Statistike oblačnega pomnilnika
            storage_stats = await self.cloud_memory.get_storage_stats() if self.cloud_memory else {}
            
            # Test integracije
            integration_test = await self.run_integration_test()
            
            report = {
                "report_info": {
                    "generated_at": datetime.now().isoformat(),
                    "system_version": "1.0.0",
                    "report_type": "full_system_status"
                },
                "system_overview": {
                    "state": self.system_state.value,
                    "uptime": str(uptime),
                    "uptime_seconds": int(uptime.total_seconds()),
                    "autonomous_mode": self.autonomous_mode,
                    "connected_terminals": len(self.connected_terminals)
                },
                "components": components_status,
                "current_metrics": asdict(current_metrics),
                "metrics_history": self.metrics_history[-24:],  # Zadnjih 24 meritev
                "storage_statistics": storage_stats,
                "integration_test": integration_test,
                "configuration": self.config,
                "recommendations": self._generate_recommendations()
            }
            
            # Shrani poročilo
            if self.cloud_memory:
                await self.cloud_memory.store_data(
                    DataCategory.ANALYTICS,
                    report,
                    metadata={"type": "system_report", "version": "1.0"},
                    custom_id=f"system_report_{int(time.time())}"
                )
            
            logger.info("✅ Sistemsko poročilo generirano")
            return report
            
        except Exception as e:
            logger.error(f"❌ Napaka pri generiranju poročila: {e}")
            return {"error": str(e)}
    
    def _generate_recommendations(self) -> List[str]:
        """Generiraj priporočila za optimizacijo"""
        recommendations = []
        
        if self.system_metrics:
            if self.system_metrics.cpu_usage > 80:
                recommendations.append("Optimiziraj procese za zmanjšanje obremenitve CPU")
            
            if self.system_metrics.memory_usage > 85:
                recommendations.append("Povečaj pomnilnik ali optimiziraj porabo")
            
            if self.system_metrics.disk_usage > 90:
                recommendations.append("Počisti disk ali dodaj dodatni prostor")
        
        # Preveri komponente
        offline_components = [name for name, health in self.components_health.items() 
                            if health.status == ComponentStatus.OFFLINE]
        if offline_components:
            recommendations.append(f"Ponovno zaženi komponente: {', '.join(offline_components)}")
        
        if not self.autonomous_mode:
            recommendations.append("Aktiviraj avtonomni način za boljšo optimizacijo")
        
        if not recommendations:
            recommendations.append("Sistem deluje optimalno")
        
        return recommendations
    
    async def shutdown(self):
        """Varno zaustavitev sistema"""
        logger.info("🛑 Zaustavlja Omni Sistem...")
        
        self.system_state = SystemState.SHUTDOWN
        self.autonomous_mode = False
        self.monitoring_active = False
        
        # Zaustavi komponente
        if self.module_manager:
            await self.module_manager.shutdown_all_modules()
        
        if self.cloud_memory:
            await self.cloud_memory.shutdown()
        
        if self.websocket_server:
            self.websocket_server.close()
            await self.websocket_server.wait_closed()
        
        # Počakaj na monitoring thread
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        
        logger.info("✅ Omni Sistem zaustavljen")

# Test funkcija
async def test_system_integration():
    """Test sistemske integracije"""
    integration = OmniSystemIntegration()
    
    try:
        # Inicializiraj sistem
        success = await integration.initialize_system()
        if not success:
            print("❌ Inicializacija neuspešna")
            return
        
        print("✅ Sistem inicializiran")
        
        # Počakaj malo
        await asyncio.sleep(5)
        
        # Izvedi test integracije
        test_results = await integration.run_integration_test()
        print(f"🧪 Test rezultati: {test_results}")
        
        # Generiraj poročilo
        report = await integration.generate_system_report()
        print("📊 Poročilo generirano")
        
        # Počakaj pred zaustavitvijo
        print("⏳ Sistem deluje... (Ctrl+C za zaustavitev)")
        await asyncio.sleep(30)
        
    except KeyboardInterrupt:
        print("\n👋 Zaustavlja sistem...")
    finally:
        await integration.shutdown()

if __name__ == "__main__":
    # Nastavi logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    asyncio.run(test_system_integration())