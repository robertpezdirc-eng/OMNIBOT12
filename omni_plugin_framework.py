#!/usr/bin/env python3
"""
OMNI PLUGIN FRAMEWORK - Plug-in ogrodje
========================================

Sistem za dinamično nalaganje in upravljanje plug-in modulov v Omni ekosistemu.
Omogoča enostavno dodajanje novih funkcionalnosti brez spreminjanja osnovne kode.

Avtor: Omni AI Platform
Verzija: 1.0.0
"""

import os
import sys
import json
import importlib
import inspect
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Type, Callable
from dataclasses import dataclass, asdict
from datetime import datetime
import asyncio
import traceback

# Konfiguracija logiranja
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('omni/logs/plugin_framework.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('OmniPluginFramework')

@dataclass
class PluginMetadata:
    """Metapodatki plug-in modula"""
    name: str
    version: str
    description: str
    author: str
    dependencies: List[str]
    api_version: str
    category: str
    tags: List[str]
    min_omni_version: str
    max_omni_version: Optional[str] = None
    license: str = "MIT"
    homepage: Optional[str] = None
    documentation: Optional[str] = None

@dataclass
class PluginCapability:
    """Zmožnost plug-in modula"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    examples: List[Dict[str, Any]]
    async_support: bool = False

class PluginInterface(ABC):
    """
    Osnovni vmesnik za vse plug-in module
    """
    
    def __init__(self):
        self.metadata: Optional[PluginMetadata] = None
        self.capabilities: List[PluginCapability] = []
        self.is_initialized = False
        self.config: Dict[str, Any] = {}
    
    @abstractmethod
    async def initialize(self, config: Dict[str, Any]) -> bool:
        """Inicializacija plug-in modula"""
        pass
    
    @abstractmethod
    async def execute(self, capability: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Izvršitev zmožnosti plug-in modula"""
        pass
    
    @abstractmethod
    async def cleanup(self) -> bool:
        """Čiščenje virov ob zaustavitvi"""
        pass
    
    def get_metadata(self) -> PluginMetadata:
        """Pridobi metapodatke plug-in modula"""
        return self.metadata
    
    def get_capabilities(self) -> List[PluginCapability]:
        """Pridobi zmožnosti plug-in modula"""
        return self.capabilities
    
    def validate_input(self, capability: str, input_data: Dict[str, Any]) -> bool:
        """Validacija vhodnih podatkov"""
        # Osnovna validacija - lahko se razširi v podrazredih
        return True
    
    def get_health_status(self) -> Dict[str, Any]:
        """Pridobi zdravstveno stanje plug-in modula"""
        return {
            "status": "healthy" if self.is_initialized else "not_initialized",
            "initialized": self.is_initialized,
            "last_check": datetime.now().isoformat()
        }

class PluginManager:
    """
    Upravljalec plug-in modulov
    """
    
    def __init__(self, plugin_directory: str = "omni/plugins"):
        self.plugin_directory = plugin_directory
        self.loaded_plugins: Dict[str, PluginInterface] = {}
        self.plugin_registry: Dict[str, Dict[str, Any]] = {}
        self.event_handlers: Dict[str, List[Callable]] = {}
        
        # Ustvarjanje direktorija za plug-ine
        os.makedirs(plugin_directory, exist_ok=True)
        
        # Dodajanje v Python path
        if plugin_directory not in sys.path:
            sys.path.insert(0, plugin_directory)
        
        logger.info(f"Plugin Manager inicializiran z direktorijem: {plugin_directory}")
    
    async def discover_plugins(self) -> List[str]:
        """Odkrivanje plug-in modulov v direktoriju"""
        discovered_plugins = []
        
        try:
            for item in os.listdir(self.plugin_directory):
                plugin_path = os.path.join(self.plugin_directory, item)
                
                # Preverjanje Python modulov
                if item.endswith('.py') and not item.startswith('__'):
                    module_name = item[:-3]
                    discovered_plugins.append(module_name)
                
                # Preverjanje paketov
                elif os.path.isdir(plugin_path) and os.path.exists(os.path.join(plugin_path, '__init__.py')):
                    discovered_plugins.append(item)
            
            logger.info(f"Odkritih {len(discovered_plugins)} plug-in modulov: {discovered_plugins}")
            return discovered_plugins
            
        except Exception as e:
            logger.error(f"Napaka pri odkrivanju plug-in modulov: {e}")
            return []
    
    async def load_plugin(self, plugin_name: str, config: Dict[str, Any] = None) -> bool:
        """Nalaganje plug-in modula"""
        try:
            if plugin_name in self.loaded_plugins:
                logger.warning(f"Plug-in {plugin_name} je že naložen")
                return True
            
            # Uvoz modula
            module = importlib.import_module(plugin_name)
            
            # Iskanje razreda, ki implementira PluginInterface
            plugin_class = None
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    issubclass(obj, PluginInterface) and 
                    obj != PluginInterface):
                    plugin_class = obj
                    break
            
            if not plugin_class:
                logger.error(f"Plug-in {plugin_name} ne implementira PluginInterface")
                return False
            
            # Ustvarjanje instance
            plugin_instance = plugin_class()
            
            # Inicializacija
            init_config = config or {}
            if await plugin_instance.initialize(init_config):
                self.loaded_plugins[plugin_name] = plugin_instance
                
                # Registracija v register
                metadata = plugin_instance.get_metadata()
                capabilities = plugin_instance.get_capabilities()
                
                self.plugin_registry[plugin_name] = {
                    "metadata": asdict(metadata) if metadata else {},
                    "capabilities": [asdict(cap) for cap in capabilities],
                    "status": "loaded",
                    "loaded_at": datetime.now().isoformat()
                }
                
                logger.info(f"Plug-in {plugin_name} uspešno naložen")
                await self._trigger_event("plugin_loaded", {"plugin_name": plugin_name})
                return True
            else:
                logger.error(f"Inicializacija plug-in modula {plugin_name} neuspešna")
                return False
                
        except Exception as e:
            logger.error(f"Napaka pri nalaganju plug-in modula {plugin_name}: {e}")
            logger.error(traceback.format_exc())
            return False
    
    async def unload_plugin(self, plugin_name: str) -> bool:
        """Raznalaganje plug-in modula"""
        try:
            if plugin_name not in self.loaded_plugins:
                logger.warning(f"Plug-in {plugin_name} ni naložen")
                return True
            
            plugin = self.loaded_plugins[plugin_name]
            
            # Čiščenje virov
            if await plugin.cleanup():
                del self.loaded_plugins[plugin_name]
                
                if plugin_name in self.plugin_registry:
                    self.plugin_registry[plugin_name]["status"] = "unloaded"
                    self.plugin_registry[plugin_name]["unloaded_at"] = datetime.now().isoformat()
                
                logger.info(f"Plug-in {plugin_name} uspešno raznaložen")
                await self._trigger_event("plugin_unloaded", {"plugin_name": plugin_name})
                return True
            else:
                logger.error(f"Čiščenje plug-in modula {plugin_name} neuspešno")
                return False
                
        except Exception as e:
            logger.error(f"Napaka pri raznalaganju plug-in modula {plugin_name}: {e}")
            return False
    
    async def execute_plugin_capability(self, plugin_name: str, capability: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Izvršitev zmožnosti plug-in modula"""
        try:
            if plugin_name not in self.loaded_plugins:
                return {
                    "success": False,
                    "error": f"Plug-in {plugin_name} ni naložen"
                }
            
            plugin = self.loaded_plugins[plugin_name]
            
            # Validacija vhodnih podatkov
            if not plugin.validate_input(capability, input_data):
                return {
                    "success": False,
                    "error": "Neveljavni vhodni podatki"
                }
            
            # Izvršitev
            result = await plugin.execute(capability, input_data)
            
            await self._trigger_event("capability_executed", {
                "plugin_name": plugin_name,
                "capability": capability,
                "success": True
            })
            
            return {
                "success": True,
                "result": result,
                "plugin": plugin_name,
                "capability": capability,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri izvršitvi {capability} v plug-in modulu {plugin_name}: {e}")
            
            await self._trigger_event("capability_executed", {
                "plugin_name": plugin_name,
                "capability": capability,
                "success": False,
                "error": str(e)
            })
            
            return {
                "success": False,
                "error": str(e),
                "plugin": plugin_name,
                "capability": capability
            }
    
    def get_loaded_plugins(self) -> List[str]:
        """Pridobi seznam naloženih plug-in modulov"""
        return list(self.loaded_plugins.keys())
    
    def get_plugin_registry(self) -> Dict[str, Dict[str, Any]]:
        """Pridobi register vseh plug-in modulov"""
        return self.plugin_registry.copy()
    
    def get_plugin_capabilities(self, plugin_name: str) -> List[Dict[str, Any]]:
        """Pridobi zmožnosti določenega plug-in modula"""
        if plugin_name in self.plugin_registry:
            return self.plugin_registry[plugin_name].get("capabilities", [])
        return []
    
    async def health_check(self) -> Dict[str, Any]:
        """Preverjanje zdravja vseh plug-in modulov"""
        health_status = {
            "total_plugins": len(self.loaded_plugins),
            "healthy_plugins": 0,
            "unhealthy_plugins": 0,
            "plugin_status": {},
            "timestamp": datetime.now().isoformat()
        }
        
        for plugin_name, plugin in self.loaded_plugins.items():
            try:
                status = plugin.get_health_status()
                health_status["plugin_status"][plugin_name] = status
                
                if status.get("status") == "healthy":
                    health_status["healthy_plugins"] += 1
                else:
                    health_status["unhealthy_plugins"] += 1
                    
            except Exception as e:
                health_status["plugin_status"][plugin_name] = {
                    "status": "error",
                    "error": str(e)
                }
                health_status["unhealthy_plugins"] += 1
        
        return health_status
    
    def register_event_handler(self, event_type: str, handler: Callable):
        """Registracija event handler-ja"""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)
    
    async def _trigger_event(self, event_type: str, data: Dict[str, Any]):
        """Sprožitev event-a"""
        if event_type in self.event_handlers:
            for handler in self.event_handlers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(data)
                    else:
                        handler(data)
                except Exception as e:
                    logger.error(f"Napaka v event handler-ju za {event_type}: {e}")
    
    async def auto_discover_and_load(self, config: Dict[str, Any] = None) -> Dict[str, bool]:
        """Avtomatsko odkrivanje in nalaganje vseh plug-in modulov"""
        discovered_plugins = await self.discover_plugins()
        load_results = {}
        
        for plugin_name in discovered_plugins:
            plugin_config = config.get(plugin_name, {}) if config else {}
            success = await self.load_plugin(plugin_name, plugin_config)
            load_results[plugin_name] = success
        
        return load_results

# Primer osnovnega plug-in modula
class ExamplePlugin(PluginInterface):
    """Primer plug-in modula"""
    
    def __init__(self):
        super().__init__()
        self.metadata = PluginMetadata(
            name="Example Plugin",
            version="1.0.0",
            description="Primer plug-in modula za demonstracijo",
            author="Omni AI Platform",
            dependencies=[],
            api_version="1.0",
            category="example",
            tags=["demo", "example"],
            min_omni_version="1.0.0"
        )
        
        self.capabilities = [
            PluginCapability(
                name="echo",
                description="Vrne vhodni tekst",
                input_schema={"type": "object", "properties": {"text": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"echo": {"type": "string"}}},
                examples=[{"input": {"text": "Hello"}, "output": {"echo": "Hello"}}]
            ),
            PluginCapability(
                name="uppercase",
                description="Pretvori tekst v velike črke",
                input_schema={"type": "object", "properties": {"text": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"result": {"type": "string"}}},
                examples=[{"input": {"text": "hello"}, "output": {"result": "HELLO"}}]
            )
        ]
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        """Inicializacija"""
        self.config = config
        self.is_initialized = True
        logger.info("Example Plugin inicializiran")
        return True
    
    async def execute(self, capability: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Izvršitev zmožnosti"""
        if capability == "echo":
            return {"echo": input_data.get("text", "")}
        elif capability == "uppercase":
            return {"result": input_data.get("text", "").upper()}
        else:
            raise ValueError(f"Neznana zmožnost: {capability}")
    
    async def cleanup(self) -> bool:
        """Čiščenje"""
        self.is_initialized = False
        logger.info("Example Plugin počiščen")
        return True

# Globalna instanca plugin manager-ja
plugin_manager = PluginManager()

if __name__ == "__main__":
    # Test plugin framework-a
    async def test_plugin_framework():
        print("🔌 Testiranje Omni Plugin Framework...")
        
        # Ustvarjanje test plug-in modula
        test_plugin_code = '''
from omni_plugin_framework import PluginInterface, PluginMetadata, PluginCapability

class TestPlugin(PluginInterface):
    def __init__(self):
        super().__init__()
        self.metadata = PluginMetadata(
            name="Test Plugin",
            version="1.0.0",
            description="Test plug-in modul",
            author="Test",
            dependencies=[],
            api_version="1.0",
            category="test",
            tags=["test"],
            min_omni_version="1.0.0"
        )
        
        self.capabilities = [
            PluginCapability(
                name="greet",
                description="Pozdrav uporabnika",
                input_schema={"type": "object", "properties": {"name": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"greeting": {"type": "string"}}},
                examples=[{"input": {"name": "Ana"}, "output": {"greeting": "Pozdravljena, Ana!"}}]
            )
        ]
    
    async def initialize(self, config):
        self.is_initialized = True
        return True
    
    async def execute(self, capability, input_data):
        if capability == "greet":
            name = input_data.get("name", "Neznanec")
            return {"greeting": f"Pozdravljen, {name}!"}
        raise ValueError(f"Neznana zmožnost: {capability}")
    
    async def cleanup(self):
        self.is_initialized = False
        return True
'''
        
        # Shranjevanje test plug-in modula
        os.makedirs("omni/plugins", exist_ok=True)
        with open("omni/plugins/test_plugin.py", "w", encoding="utf-8") as f:
            f.write(test_plugin_code)
        
        # Odkrivanje plug-in modulov
        discovered = await plugin_manager.discover_plugins()
        print(f"📦 Odkritih plug-in modulov: {discovered}")
        
        # Nalaganje plug-in modula
        success = await plugin_manager.load_plugin("test_plugin")
        print(f"✅ Nalaganje test_plugin: {'Uspešno' if success else 'Neuspešno'}")
        
        # Izvršitev zmožnosti
        if success:
            result = await plugin_manager.execute_plugin_capability(
                "test_plugin", 
                "greet", 
                {"name": "Omni"}
            )
            print(f"🎯 Rezultat izvršitve: {result}")
        
        # Preverjanje zdravja
        health = await plugin_manager.health_check()
        print(f"🏥 Zdravje sistema: {health}")
        
        # Prikaz registra
        registry = plugin_manager.get_plugin_registry()
        print(f"📋 Register plug-in modulov:")
        for name, info in registry.items():
            print(f"  - {name}: {info['metadata'].get('description', 'Brez opisa')}")
    
    # Zagon testa
    asyncio.run(test_plugin_framework())