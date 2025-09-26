#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌍 OmniCore Global Optimizer
============================

Centralni sistem za koordinacijo vseh Omni modulov:
- Globalna optimizacija vseh panog
- Avtonomno odločanje in učenje
- Koordinacija med moduli
- Centralno upravljanje in nadzor
- Inteligentna avtomatizacija

Panoge:
🔌 IoT in industrija
💶 Finance in računovodstvo  
🚚 Logistika in transport
🏥 Zdravstvo in medicina
🌱 Kmetijstvo in živinoreja
🌍 Turizem in gostinstvo
⚡ Energetika in trajnost
🛡️ Varnost in nadzor

Avtor: Omni AI Assistant
Datum: 22. september 2025
Verzija: 1.0 Production
"""

import sys
import os
import json
import threading
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import importlib.util
import traceback

# Dodaj omni module v path
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules'))

# Konfiguracija
OMNICORE_LOG = "omni/logs/omnicore.log"
GLOBAL_CONFIG = "omni/config/global_config.json"
MODULES_CONFIG = "omni/config/modules_config.json"
OPTIMIZATION_LOG = "omni/logs/optimization.log"

# Logging
os.makedirs(os.path.dirname(OMNICORE_LOG), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(OMNICORE_LOG, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def __name__():
    return "omnicore_global"

@dataclass
class ModuleInfo:
    name: str
    path: str
    status: str  # active, inactive, error, loading
    last_optimization: datetime
    optimization_count: int
    error_count: int
    performance_score: float
    capabilities: List[str]
    dependencies: List[str]

@dataclass
class OptimizationResult:
    module_name: str
    timestamp: datetime
    success: bool
    execution_time: float
    improvements: int
    errors: List[str]
    metrics: Dict[str, Any]

@dataclass
class GlobalMetrics:
    timestamp: datetime
    total_modules: int
    active_modules: int
    optimization_cycles: int
    total_improvements: int
    system_efficiency: float
    energy_savings: float
    cost_savings: float
    uptime_percentage: float

class OmniCore:
    """🌍 Centralni sistem Omni Global Optimizer"""
    
    def __init__(self):
        self.modules = {}
        self.module_info = {}
        self.optimization_results = []
        self.global_metrics = []
        self.is_running = False
        self.optimization_thread = None
        self.start_time = datetime.now()
        
        # Konfiguracija
        self.config = self._load_config()
        self.optimization_interval = self.config.get("optimization_interval", 300)  # 5 minut
        self.max_concurrent_optimizations = self.config.get("max_concurrent_optimizations", 3)
        
        # Inicializacija
        self._init_directories()
        self._register_core_modules()
        
        logger.info("🌍 OmniCore Global Optimizer inicializiran")
    
    def _load_config(self) -> Dict[str, Any]:
        """Naloži globalno konfiguracijo"""
        try:
            os.makedirs(os.path.dirname(GLOBAL_CONFIG), exist_ok=True)
            
            if os.path.exists(GLOBAL_CONFIG):
                with open(GLOBAL_CONFIG, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # Ustvari privzeto konfiguracijo
                default_config = {
                    "optimization_interval": 300,
                    "max_concurrent_optimizations": 3,
                    "auto_start": True,
                    "enable_learning": True,
                    "safety_mode": True,
                    "modules": {
                        "iot_autonomous_learning": {"enabled": True, "priority": 1},
                        "finance_optimizer": {"enabled": True, "priority": 2},
                        "logistics_optimizer": {"enabled": True, "priority": 2},
                        "healthcare_assistant": {"enabled": True, "priority": 3},
                        "tourism_planner": {"enabled": True, "priority": 3},
                        "agriculture_support": {"enabled": True, "priority": 3},
                        "energy_manager": {"enabled": True, "priority": 1},
                        "security_monitor": {"enabled": True, "priority": 1}
                    },
                    "thresholds": {
                        "max_error_rate": 0.1,
                        "min_efficiency": 0.7,
                        "max_response_time": 30.0
                    }
                }
                
                with open(GLOBAL_CONFIG, 'w', encoding='utf-8') as f:
                    json.dump(default_config, f, indent=2, ensure_ascii=False)
                
                return default_config
                
        except Exception as e:
            logger.error(f"❌ Napaka pri nalaganju konfiguracije: {e}")
            return {}
    
    def _init_directories(self):
        """Inicializiraj potrebne direktorije"""
        directories = [
            "omni/logs",
            "omni/config", 
            "omni/data",
            "omni/modules/iot",
            "omni/modules/finance",
            "omni/modules/logistics",
            "omni/modules/healthcare",
            "omni/modules/tourism",
            "omni/modules/agriculture",
            "omni/modules/energy",
            "omni/modules/security"
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
    
    def _register_core_modules(self):
        """Registriraj osnovne module"""
        try:
            # Seznam modulov za registracijo
            core_modules = [
                ("global_optimizer", "omni/modules/global_optimizer.py"),
                ("iot_autonomous_learning", "omni/modules/iot/iot_autonomous_learning.py"),
                ("finance_optimizer", "omni/modules/finance/finance_optimizer.py"),
                ("logistics_optimizer", "omni/modules/logistics/logistics_optimizer.py"),
                ("healthcare_optimizer", "omni/modules/healthcare/healthcare_optimizer.py"),
                ("tourism_optimizer", "omni/modules/tourism/tourism_optimizer.py"),
                ("agriculture_optimizer", "omni/modules/agriculture/agriculture_optimizer.py"),
                ("energy_manager", "omni/modules/energy/energy_manager.py"),
                ("security_monitor", "omni/modules/security/security_monitor.py"),
                # Novi univerzalni moduli
                ("industry_optimizer", "omni/modules/industry/industry_optimizer.py"),
                ("energy_optimizer", "omni/modules/energy/energy_optimizer.py"),
                ("smart_home_optimizer", "omni/modules/universal/smart_home_optimizer.py"),
                ("autonomous_vehicles_optimizer", "omni/modules/logistics/autonomous_vehicles_optimizer.py"),
                ("robotics_optimizer", "omni/modules/industry/robotics_optimizer.py"),
                ("science_optimizer", "omni/modules/universal/science_optimizer.py"),
                ("communications_optimizer", "omni/modules/universal/communications_optimizer.py")
            ]
            
            for module_name, module_path in core_modules:
                self.register_module(module_name, module_path)
                
        except Exception as e:
            logger.error(f"❌ Napaka pri registraciji osnovnih modulov: {e}")
    
    def register_module(self, module_name: str, module_path: str) -> bool:
        """Registriraj modul v OmniCore"""
        try:
            # Preveri, če datoteka obstaja
            if not os.path.exists(module_path):
                logger.warning(f"⚠️ Modul {module_name} ni najden: {module_path}")
                return False
            
            # Naloži modul
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            if spec is None or spec.loader is None:
                logger.error(f"❌ Ne morem naložiti modula {module_name}")
                return False
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Registriraj modul
            self.modules[module_name] = module
            
            # Ustvari info o modulu
            self.module_info[module_name] = ModuleInfo(
                name=module_name,
                path=module_path,
                status="active",
                last_optimization=datetime.now(),
                optimization_count=0,
                error_count=0,
                performance_score=1.0,
                capabilities=self._get_module_capabilities(module),
                dependencies=[]
            )
            
            logger.info(f"✅ Modul {module_name} uspešno registriran")
            return True
            
        except Exception as e:
            logger.error(f"❌ Napaka pri registraciji modula {module_name}: {e}")
            
            # Registriraj kot neaktiven modul
            self.module_info[module_name] = ModuleInfo(
                name=module_name,
                path=module_path,
                status="error",
                last_optimization=datetime.now(),
                optimization_count=0,
                error_count=1,
                performance_score=0.0,
                capabilities=[],
                dependencies=[]
            )
            return False
    
    def _get_module_capabilities(self, module) -> List[str]:
        """Pridobi zmožnosti modula"""
        capabilities = []
        
        # Preveri standardne funkcije
        if hasattr(module, 'auto_optimize'):
            capabilities.append('auto_optimize')
        if hasattr(module, 'get_status'):
            capabilities.append('get_status')
        if hasattr(module, 'get_metrics'):
            capabilities.append('get_metrics')
        if hasattr(module, 'configure'):
            capabilities.append('configure')
        
        return capabilities
    
    def optimize_module(self, module_name: str) -> OptimizationResult:
        """Optimiziraj posamezen modul"""
        start_time = time.time()
        result = OptimizationResult(
            module_name=module_name,
            timestamp=datetime.now(),
            success=False,
            execution_time=0.0,
            improvements=0,
            errors=[],
            metrics={}
        )
        
        try:
            if module_name not in self.modules:
                result.errors.append(f"Modul {module_name} ni registriran")
                return result
            
            module = self.modules[module_name]
            module_info = self.module_info[module_name]
            
            # Preveri, če modul podpira optimizacijo
            if not hasattr(module, 'auto_optimize'):
                result.errors.append(f"Modul {module_name} ne podpira auto_optimize")
                return result
            
            # Izvedi optimizacijo
            optimization_result = module.auto_optimize()
            
            # Obdelaj rezultat
            if isinstance(optimization_result, dict):
                result.success = optimization_result.get('success', False)
                result.improvements = optimization_result.get('improvements', 0)
                result.metrics = optimization_result
                
                if not result.success and 'message' in optimization_result:
                    result.errors.append(optimization_result['message'])
            else:
                result.success = True
                result.metrics = {"result": str(optimization_result)}
            
            # Posodobi info o modulu
            module_info.last_optimization = datetime.now()
            module_info.optimization_count += 1
            
            if result.success:
                module_info.performance_score = min(1.0, module_info.performance_score + 0.1)
                module_info.status = "active"
            else:
                module_info.error_count += 1
                module_info.performance_score = max(0.0, module_info.performance_score - 0.2)
                if module_info.error_count > 5:
                    module_info.status = "error"
            
        except Exception as e:
            result.errors.append(f"Napaka pri optimizaciji: {str(e)}")
            module_info.error_count += 1
            module_info.status = "error"
            logger.error(f"❌ Napaka pri optimizaciji modula {module_name}: {e}")
        
        finally:
            result.execution_time = time.time() - start_time
            self.optimization_results.append(result)
            
            # Obdrži samo zadnjih 1000 rezultatov
            if len(self.optimization_results) > 1000:
                self.optimization_results = self.optimization_results[-1000:]
        
        return result
    
    def global_optimization_cycle(self) -> Dict[str, Any]:
        """Izvedi globalni cikel optimizacije"""
        try:
            cycle_start = time.time()
            cycle_results = {
                "timestamp": datetime.now().isoformat(),
                "modules_optimized": 0,
                "successful_optimizations": 0,
                "total_improvements": 0,
                "errors": [],
                "execution_time": 0.0,
                "module_results": {}
            }
            
            logger.info("🌍 Začenjam globalni cikel optimizacije...")
            
            # Pridobi module za optimizacijo (glede na prioriteto)
            modules_to_optimize = []
            for module_name, module_config in self.config.get("modules", {}).items():
                if module_config.get("enabled", True) and module_name in self.modules:
                    priority = module_config.get("priority", 5)
                    modules_to_optimize.append((module_name, priority))
            
            # Razvrsti po prioriteti
            modules_to_optimize.sort(key=lambda x: x[1])
            
            # Optimiziraj module
            for module_name, priority in modules_to_optimize:
                try:
                    result = self.optimize_module(module_name)
                    
                    cycle_results["modules_optimized"] += 1
                    cycle_results["module_results"][module_name] = {
                        "success": result.success,
                        "improvements": result.improvements,
                        "execution_time": result.execution_time,
                        "errors": result.errors
                    }
                    
                    if result.success:
                        cycle_results["successful_optimizations"] += 1
                        cycle_results["total_improvements"] += result.improvements
                        logger.info(f"✅ {module_name}: {result.improvements} izboljšav")
                    else:
                        cycle_results["errors"].extend(result.errors)
                        logger.warning(f"⚠️ {module_name}: {', '.join(result.errors)}")
                
                except Exception as e:
                    error_msg = f"Napaka pri optimizaciji {module_name}: {str(e)}"
                    cycle_results["errors"].append(error_msg)
                    logger.error(f"❌ {error_msg}")
            
            cycle_results["execution_time"] = time.time() - cycle_start
            
            # Posodobi globalne metrike
            self._update_global_metrics(cycle_results)
            
            # Shrani rezultate
            self._save_optimization_log(cycle_results)
            
            logger.info(f"🌍 Globalni cikel dokončan: {cycle_results['successful_optimizations']}/{cycle_results['modules_optimized']} uspešnih")
            
            return cycle_results
            
        except Exception as e:
            logger.error(f"❌ Napaka pri globalnem ciklu optimizacije: {e}")
            return {"error": str(e), "timestamp": datetime.now().isoformat()}
    
    def _update_global_metrics(self, cycle_results: Dict[str, Any]):
        """Posodobi globalne metrike"""
        try:
            # Izračunaj metrike
            total_modules = len(self.modules)
            active_modules = sum(1 for info in self.module_info.values() if info.status == "active")
            
            # Izračunaj učinkovitost sistema
            if total_modules > 0:
                system_efficiency = active_modules / total_modules
            else:
                system_efficiency = 0.0
            
            # Izračunaj uptime
            uptime_seconds = (datetime.now() - self.start_time).total_seconds()
            uptime_percentage = min(100.0, (uptime_seconds / 86400) * 100)  # % zadnjih 24 ur
            
            # Oceni prihranke (simulacija)
            energy_savings = cycle_results.get("total_improvements", 0) * 0.05  # 5% na izboljšavo
            cost_savings = cycle_results.get("total_improvements", 0) * 10.0  # 10€ na izboljšavo
            
            metrics = GlobalMetrics(
                timestamp=datetime.now(),
                total_modules=total_modules,
                active_modules=active_modules,
                optimization_cycles=len(self.optimization_results),
                total_improvements=sum(r.improvements for r in self.optimization_results),
                system_efficiency=system_efficiency,
                energy_savings=energy_savings,
                cost_savings=cost_savings,
                uptime_percentage=uptime_percentage
            )
            
            self.global_metrics.append(metrics)
            
            # Obdrži samo zadnjih 1000 metrik
            if len(self.global_metrics) > 1000:
                self.global_metrics = self.global_metrics[-1000:]
                
        except Exception as e:
            logger.error(f"❌ Napaka pri posodabljanju globalnih metrik: {e}")
    
    def _save_optimization_log(self, cycle_results: Dict[str, Any]):
        """Shrani log optimizacije"""
        try:
            os.makedirs(os.path.dirname(OPTIMIZATION_LOG), exist_ok=True)
            
            with open(OPTIMIZATION_LOG, 'a', encoding='utf-8') as f:
                f.write(json.dumps(cycle_results, ensure_ascii=False, default=str) + '\n')
                
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju loga optimizacije: {e}")
    
    def start_global_optimizer(self) -> str:
        """Zaženi globalni optimizator"""
        try:
            if self.is_running:
                return "🌍 Globalni optimizator že teče"
            
            self.is_running = True
            
            def optimization_loop():
                logger.info("🌍 Globalni optimizator zagnan")
                
                while self.is_running:
                    try:
                        # Izvedi globalni cikel optimizacije
                        cycle_results = self.global_optimization_cycle()
                        
                        # Počakaj do naslednjega cikla
                        time.sleep(self.optimization_interval)
                        
                    except Exception as e:
                        logger.error(f"❌ Napaka v optimizacijski zanki: {e}")
                        time.sleep(60)  # Počakaj 1 minuto ob napaki
                
                logger.info("🌍 Globalni optimizator ustavljen")
            
            # Zaženi optimizacijsko nit
            self.optimization_thread = threading.Thread(target=optimization_loop, daemon=True)
            self.optimization_thread.start()
            
            return "🌍 Globalni avtonomni optimizator Omni zagnan ✅"
            
        except Exception as e:
            logger.error(f"❌ Napaka pri zagonu globalnega optimizatorja: {e}")
            return f"❌ Napaka pri zagonu: {str(e)}"
    
    def stop_global_optimizer(self) -> str:
        """Ustavi globalni optimizator"""
        try:
            if not self.is_running:
                return "🌍 Globalni optimizator ni aktiven"
            
            self.is_running = False
            
            if self.optimization_thread and self.optimization_thread.is_alive():
                self.optimization_thread.join(timeout=10)
            
            return "🌍 Globalni optimizator ustavljen ✅"
            
        except Exception as e:
            logger.error(f"❌ Napaka pri ustavljanju globalnega optimizatorja: {e}")
            return f"❌ Napaka pri ustavljanju: {str(e)}"
    
    def get_system_status(self) -> Dict[str, Any]:
        """Pridobi status celotnega sistema"""
        try:
            # Osnovne informacije
            status = {
                "system_info": {
                    "is_running": self.is_running,
                    "start_time": self.start_time.isoformat(),
                    "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
                    "optimization_interval": self.optimization_interval
                },
                "modules": {},
                "recent_optimizations": [],
                "global_metrics": {},
                "system_health": "unknown"
            }
            
            # Informacije o modulih
            for module_name, module_info in self.module_info.items():
                status["modules"][module_name] = {
                    "status": module_info.status,
                    "optimization_count": module_info.optimization_count,
                    "error_count": module_info.error_count,
                    "performance_score": module_info.performance_score,
                    "last_optimization": module_info.last_optimization.isoformat(),
                    "capabilities": module_info.capabilities
                }
            
            # Zadnje optimizacije
            recent_results = sorted(self.optimization_results, key=lambda x: x.timestamp, reverse=True)[:10]
            for result in recent_results:
                status["recent_optimizations"].append({
                    "module": result.module_name,
                    "timestamp": result.timestamp.isoformat(),
                    "success": result.success,
                    "improvements": result.improvements,
                    "execution_time": result.execution_time
                })
            
            # Globalne metrike
            if self.global_metrics:
                latest_metrics = self.global_metrics[-1]
                status["global_metrics"] = {
                    "total_modules": latest_metrics.total_modules,
                    "active_modules": latest_metrics.active_modules,
                    "system_efficiency": latest_metrics.system_efficiency,
                    "total_improvements": latest_metrics.total_improvements,
                    "energy_savings": latest_metrics.energy_savings,
                    "cost_savings": latest_metrics.cost_savings,
                    "uptime_percentage": latest_metrics.uptime_percentage
                }
            
            # Oceni zdravje sistema
            active_modules = sum(1 for info in self.module_info.values() if info.status == "active")
            total_modules = len(self.module_info)
            
            if total_modules == 0:
                status["system_health"] = "no_modules"
            elif active_modules / total_modules >= 0.8:
                status["system_health"] = "excellent"
            elif active_modules / total_modules >= 0.6:
                status["system_health"] = "good"
            elif active_modules / total_modules >= 0.4:
                status["system_health"] = "fair"
            else:
                status["system_health"] = "poor"
            
            return status
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju statusa sistema: {e}")
            return {"error": str(e)}
    
    def execute_command(self, command: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Izvršuj ukaze na globalnem nivoju"""
        try:
            if parameters is None:
                parameters = {}
            
            if command == "start":
                result = self.start_global_optimizer()
                return {"success": True, "message": result}
            
            elif command == "stop":
                result = self.stop_global_optimizer()
                return {"success": True, "message": result}
            
            elif command == "status":
                return {"success": True, "data": self.get_system_status()}
            
            elif command == "optimize":
                module_name = parameters.get("module")
                if module_name:
                    result = self.optimize_module(module_name)
                    return {"success": result.success, "data": asdict(result)}
                else:
                    result = self.global_optimization_cycle()
                    return {"success": True, "data": result}
            
            elif command == "reload_config":
                self.config = self._load_config()
                return {"success": True, "message": "Konfiguracija ponovno naložena"}
            
            elif command == "register_module":
                module_name = parameters.get("name")
                module_path = parameters.get("path")
                if module_name and module_path:
                    success = self.register_module(module_name, module_path)
                    return {"success": success, "message": f"Modul {module_name} {'registriran' if success else 'ni registriran'}"}
                else:
                    return {"success": False, "message": "Manjkajo parametri: name, path"}
            
            else:
                return {"success": False, "message": f"Neznan ukaz: {command}"}
                
        except Exception as e:
            logger.error(f"❌ Napaka pri izvršitvi ukaza {command}: {e}")
            return {"success": False, "message": f"Napaka: {str(e)}"}

# Globalna instanca OmniCore
omnicore = OmniCore()

# Funkcije za kompatibilnost
def start_global_optimizer():
    return omnicore.start_global_optimizer()

def stop_global_optimizer():
    return omnicore.stop_global_optimizer()

def get_system_status():
    return omnicore.get_system_status()

def optimize_all():
    return omnicore.global_optimization_cycle()

def register_module(name: str, path: str):
    return omnicore.register_module(name, path)

def execute_command(command: str, parameters: Dict[str, Any] = None):
    return omnicore.execute_command(command, parameters)

if __name__ == "__main__":
    # Test OmniCore sistema
    print("🌍 Testiranje OmniCore Global Optimizer...")
    
    # Pridobi status
    status = get_system_status()
    print(f"Status sistema: {status['system_health']}")
    print(f"Registriranih modulov: {len(status['modules'])}")
    
    # Zaženi optimizator
    start_result = start_global_optimizer()
    print(f"Zagon optimizatorja: {start_result}")
    
    # Počakaj in izvedi test optimizacijo
    time.sleep(2)
    optimization_result = optimize_all()
    print(f"Test optimizacija: {optimization_result.get('successful_optimizations', 0)} uspešnih")
    
    # Pridobi posodobljen status
    updated_status = get_system_status()
    print(f"Posodobljen status: {updated_status['system_health']}")
    
    print("🌍 OmniCore Global Optimizer pripravljen za produkcijo!")