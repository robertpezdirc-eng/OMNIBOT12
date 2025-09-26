#!/usr/bin/env python3
"""
OmniCore Monitoring System
Napredni sistem za nadzor zdravja in stanja modulov
"""

import os
import time
import json
import logging
import importlib
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class HealthStatus:
    """Struktura za zdravstveno stanje modula"""
    status: str  # active, error, standby, maintenance
    timestamp: float
    response_time: float = 0.0
    error_count: int = 0
    last_error: Optional[str] = None
    uptime: float = 0.0
    memory_usage: float = 0.0
    cpu_usage: float = 0.0

class PluginBase:
    """Osnovna klasa za vse module z monitoring funkcionalnostjo"""
    
    def __init__(self):
        self.name = "base"
        self.description = "Generic plugin"
        self.version = "1.0.0"
        self.author = "OmniCore"
        self.capabilities = []
        
        # Monitoring podatki
        self.status = "inactive"
        self.start_time = time.time()
        self.error_count = 0
        self.last_error = None
        self.request_count = 0
        self.total_response_time = 0.0
        
    def handle(self, query: str, context: Dict[str, Any] = None) -> str:
        """Glavna metoda za obravnavo zahtev"""
        raise NotImplementedError("Vsak modul mora implementirati handle() metodo")
    
    def health_check(self) -> HealthStatus:
        """Preveri zdravstveno stanje modula"""
        try:
            # Simulacija preverjanja stanja
            start_time = time.time()
            
            # Osnovni health check
            self._perform_health_check()
            
            response_time = time.time() - start_time
            uptime = time.time() - self.start_time
            
            # Izračunaj povprečni odzivni čas
            avg_response_time = (
                self.total_response_time / self.request_count 
                if self.request_count > 0 else 0.0
            )
            
            return HealthStatus(
                status=self.status,
                timestamp=time.time(),
                response_time=response_time,
                error_count=self.error_count,
                last_error=self.last_error,
                uptime=uptime,
                memory_usage=self._get_memory_usage(),
                cpu_usage=self._get_cpu_usage()
            )
            
        except Exception as e:
            self.error_count += 1
            self.last_error = str(e)
            self.status = "error"
            logger.error(f"Health check failed for {self.name}: {e}")
            
            return HealthStatus(
                status="error",
                timestamp=time.time(),
                error_count=self.error_count,
                last_error=str(e)
            )
    
    def _perform_health_check(self):
        """Specifičen health check za modul - lahko ga prepiše podrazred"""
        # Osnovni test - preveri, če je modul odziven
        test_query = "health_check_test"
        try:
            # Poskusi osnovni test
            if hasattr(self, '_test_functionality'):
                self._test_functionality()
        except Exception as e:
            raise Exception(f"Functionality test failed: {e}")
    
    def _get_memory_usage(self) -> float:
        """Pridobi porabo pomnilnika (simulacija)"""
        try:
            import psutil
            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024  # MB
        except ImportError:
            # Simulacija če psutil ni na voljo
            return round(10 + (self.request_count * 0.1), 2)
    
    def _get_cpu_usage(self) -> float:
        """Pridobi porabo CPU (simulacija)"""
        try:
            import psutil
            return psutil.cpu_percent(interval=0.1)
        except ImportError:
            # Simulacija če psutil ni na voljo
            return round(5 + (self.error_count * 2), 2)
    
    def get_info(self) -> Dict[str, Any]:
        """Vrni informacije o modulu"""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "author": self.author,
            "capabilities": self.capabilities,
            "status": self.status,
            "uptime": time.time() - self.start_time,
            "request_count": self.request_count,
            "error_count": self.error_count
        }

class SystemMonitor:
    """Sistem za nadzor zdravja vseh modulov"""
    
    def __init__(self):
        self.plugins: Dict[str, PluginBase] = {}
        self.health_history: Dict[str, List[HealthStatus]] = {}
        self.monitoring_active = False
        self.monitor_thread = None
        self.check_interval = 30  # sekund
        
    def register_plugin(self, plugin: PluginBase):
        """Registriraj plugin za monitoring"""
        self.plugins[plugin.name] = plugin
        self.health_history[plugin.name] = []
        logger.info(f"🔍 Plugin '{plugin.name}' registriran za monitoring")
    
    def start_monitoring(self):
        """Začni kontinuiran monitoring"""
        if self.monitoring_active:
            return
            
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("🚀 Monitoring sistem zagnan")
    
    def stop_monitoring(self):
        """Ustavi monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join()
        logger.info("🛑 Monitoring sistem ustavljen")
    
    def _monitor_loop(self):
        """Glavna zanka monitoringa"""
        while self.monitoring_active:
            try:
                self._check_all_plugins()
                time.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Napaka v monitoring zanki: {e}")
                time.sleep(5)
    
    def _check_all_plugins(self):
        """Preveri zdravje vseh registriranih plugin-ov"""
        for name, plugin in self.plugins.items():
            try:
                health = plugin.health_check()
                self.health_history[name].append(health)
                
                # Obdrži samo zadnjih 100 zapisov
                if len(self.health_history[name]) > 100:
                    self.health_history[name] = self.health_history[name][-100:]
                
                # Preveri kritične napake
                if health.status == "error":
                    logger.warning(f"⚠️ Plugin '{name}' ima napako: {health.last_error}")
                elif health.error_count > 10:
                    logger.warning(f"⚠️ Plugin '{name}' ima veliko napak: {health.error_count}")
                    
            except Exception as e:
                logger.error(f"Napaka pri preverjanju plugin-a '{name}': {e}")
    
    def get_system_health(self) -> Dict[str, Any]:
        """Pridobi celotno zdravstveno stanje sistema"""
        total_plugins = len(self.plugins)
        active_plugins = sum(1 for p in self.plugins.values() if p.status == "active")
        error_plugins = sum(1 for p in self.plugins.values() if p.status == "error")
        
        return {
            "timestamp": time.time(),
            "total_plugins": total_plugins,
            "active_plugins": active_plugins,
            "error_plugins": error_plugins,
            "system_status": "healthy" if error_plugins == 0 else "degraded" if error_plugins < total_plugins / 2 else "critical",
            "uptime": time.time() - getattr(self, 'start_time', time.time()),
            "monitoring_active": self.monitoring_active
        }
    
    def get_plugin_health(self, plugin_name: str) -> Optional[HealthStatus]:
        """Pridobi zdravstveno stanje specifičnega plugin-a"""
        if plugin_name not in self.plugins:
            return None
            
        return self.plugins[plugin_name].health_check()
    
    def get_health_history(self, plugin_name: str, hours: int = 24) -> List[HealthStatus]:
        """Pridobi zgodovino zdravja plugin-a"""
        if plugin_name not in self.health_history:
            return []
        
        cutoff_time = time.time() - (hours * 3600)
        return [
            h for h in self.health_history[plugin_name] 
            if h.timestamp > cutoff_time
        ]

class OmniCore:
    """Napredni OmniCore z monitoring sistemom"""
    
    def __init__(self, plugins_path: str = "plugins"):
        self.plugins: Dict[str, PluginBase] = {}
        self.monitor = SystemMonitor()
        self.plugins_path = plugins_path
        self.start_time = time.time()
        
        # Naloži plugin-e
        self.load_plugins()
        
        # Začni monitoring
        self.monitor.start_monitoring()
        
    def load_plugins(self):
        """Naloži vse plugin-e iz direktorija"""
        plugins_dir = Path(self.plugins_path)
        
        if not plugins_dir.exists():
            logger.warning(f"Plugin direktorij ne obstaja: {plugins_dir}")
            return
        
        for file_path in plugins_dir.glob("*.py"):
            if file_path.name.startswith("__"):
                continue
                
            try:
                module_name = file_path.stem
                spec = importlib.util.spec_from_file_location(
                    f"plugins.{module_name}", 
                    file_path
                )
                
                if spec is None or spec.loader is None:
                    continue
                
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Najdi Plugin razred
                plugin_class = getattr(module, "Plugin", None)
                if plugin_class and issubclass(plugin_class, PluginBase):
                    plugin = plugin_class()
                    plugin.status = "active"
                    
                    self.plugins[plugin.name] = plugin
                    self.monitor.register_plugin(plugin)
                    
                    logger.info(f"✅ Plugin '{plugin.name}' naložen in aktiven")
                    
            except Exception as e:
                logger.error(f"❌ Napaka pri nalaganju {file_path.name}: {e}")
    
    def route(self, query: str) -> Dict[str, Any]:
        """Usmeri zahtevo z monitoring funkcionalnostjo"""
        start_time = time.time()
        
        try:
            # Določi najboljši plugin (poenostavljeno)
            best_plugin = self._find_best_plugin(query)
            
            if not best_plugin:
                return {
                    "success": False,
                    "error": "Ni najden primeren plugin",
                    "response_time": time.time() - start_time
                }
            
            # Preveri stanje plugin-a
            if best_plugin.status != "active":
                return {
                    "success": False,
                    "error": f"Plugin '{best_plugin.name}' ni aktiven ({best_plugin.status})",
                    "response_time": time.time() - start_time
                }
            
            # Izvršuj zahtevo
            response = best_plugin.handle(query)
            response_time = time.time() - start_time
            
            # Posodobi statistike
            best_plugin.request_count += 1
            best_plugin.total_response_time += response_time
            
            return {
                "success": True,
                "response": response,
                "plugin_used": best_plugin.name,
                "response_time": response_time
            }
            
        except Exception as e:
            response_time = time.time() - start_time
            logger.error(f"Napaka pri usmerjanju: {e}")
            
            return {
                "success": False,
                "error": str(e),
                "response_time": response_time
            }
    
    def _find_best_plugin(self, query: str) -> Optional[PluginBase]:
        """Najdi najboljši plugin za zahtevo (poenostavljeno)"""
        query_lower = query.lower()
        
        # Enostavno ujemanje ključnih besed
        for plugin in self.plugins.values():
            if plugin.status == "active":
                for capability in plugin.capabilities:
                    if capability.lower() in query_lower:
                        return plugin
                        
                # Preveri ime plugin-a
                if plugin.name.lower() in query_lower:
                    return plugin
        
        # Vrni prvi aktivni plugin kot fallback
        for plugin in self.plugins.values():
            if plugin.status == "active":
                return plugin
                
        return None
    
    def get_system_status(self) -> Dict[str, Any]:
        """Pridobi celotno stanje sistema"""
        return {
            **self.monitor.get_system_health(),
            "core_uptime": time.time() - self.start_time,
            "loaded_plugins": list(self.plugins.keys()),
            "total_requests": sum(p.request_count for p in self.plugins.values()),
            "total_errors": sum(p.error_count for p in self.plugins.values())
        }

# Test funkcionalnost
if __name__ == "__main__":
    print("🧪 Testiram OmniCore Monitoring sistem...")
    
    # Ustvari test plugin
    class TestPlugin(PluginBase):
        def __init__(self):
            super().__init__()
            self.name = "test"
            self.description = "Test plugin za monitoring"
            self.capabilities = ["test", "demo"]
        
        def handle(self, query: str, context: Dict[str, Any] = None) -> str:
            return f"Test plugin odgovor na: {query}"
        
        def _test_functionality(self):
            # Simulacija testa
            if "error" in str(time.time()):
                raise Exception("Simulirana napaka")
    
    # Testiraj sistem
    core = OmniCore("plugins")
    
    # Dodaj test plugin
    test_plugin = TestPlugin()
    test_plugin.status = "active"
    core.plugins["test"] = test_plugin
    core.monitor.register_plugin(test_plugin)
    
    # Testiraj routing
    result = core.route("test zahteva")
    print(f"Routing rezultat: {result}")
    
    # Testiraj health check
    health = test_plugin.health_check()
    print(f"Health check: {asdict(health)}")
    
    # Testiraj sistem status
    status = core.get_system_status()
    print(f"Sistem status: {status}")
    
    print("✅ Test končan")