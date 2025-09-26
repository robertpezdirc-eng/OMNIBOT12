#!/usr/bin/env python3
"""
OmniCore Plugin sistem z AI routing in hot-reload funkcionalnostjo

Omogoča dinamično nalaganje plugin-ov, pametno usmerjanje z AI,
fallback sistem in hot-reload funkcionalnost za razvoj.
"""

import os
import sys
import importlib
import importlib.util
import inspect
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from openai import OpenAI
from hot_reload_plugins import HotReloadManager
import logging
import time
import json
from datetime import datetime

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PluginBase:
    """
    Bazni razred za vse plugin-e
    Vsi plugin-i morajo dedovati od tega razreda
    """
    name = "base"
    description = "Bazni plugin"
    version = "1.0.0"
    author = "OmniCore"
    
    def handle(self, query: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Glavna metoda za obravnavo zahtev
        
        Args:
            query: Uporabniška zahteva
            context: Dodatni kontekst (opcijsko)
            
        Returns:
            str: Odgovor plugin-a
        """
        raise NotImplementedError("Plugin mora implementirati handle metodo")
    
    def get_info(self) -> Dict[str, Any]:
        """
        Vrni informacije o plugin-u
        
        Returns:
            Dict z informacijami o plugin-u
        """
        return {
            "name": self.name,
            "description": self.description,
            "version": getattr(self, 'version', '1.0.0'),
            "author": getattr(self, 'author', 'OmniCore'),
            "capabilities": getattr(self, 'capabilities', [])
        }
    
    def get_help(self) -> str:
        """
        Vrni pomoč za plugin
        
        Returns:
            str: Navodila za uporabo plugin-a
        """
        return f"Plugin {self.name}: {self.description}"

class PluginManager:
    """Manager za nalaganje in upravljanje plugin-ov"""
    
    def __init__(self, plugins_dir: str = "plugins"):
        self.plugins_dir = Path(plugins_dir)
        self.plugins: Dict[str, Any] = {}
        self.logger = logging.getLogger(__name__)
        
        # Ustvari plugins direktorij če ne obstaja
        self.plugins_dir.mkdir(exist_ok=True)
        
        # Ustvari __init__.py če ne obstaja
        init_file = self.plugins_dir / "__init__.py"
        if not init_file.exists():
            init_file.write_text("# Plugin direktorij\n")
    
    def find_plugin_files(self) -> List[str]:
        """Najdi vse plugin datoteke"""
        plugin_files = []
        
        if not self.plugins_dir.exists():
            self.logger.warning(f"Plugin direktorij ne obstaja: {self.plugins_dir}")
            return plugin_files
        
        for file_path in self.plugins_dir.glob("*_plugin.py"):
            plugin_name = file_path.stem
            plugin_files.append(plugin_name)
        
        # Dodaj tudi datoteke brez _plugin končnice (za kompatibilnost)
        for file_path in self.plugins_dir.glob("*.py"):
            if not file_path.name.startswith("__") and not file_path.name.endswith("_plugin.py"):
                plugin_name = file_path.stem
                plugin_files.append(plugin_name)
        
        return list(set(plugin_files))  # Odstrani duplikate
    
    def load_plugin(self, plugin_file: str) -> bool:
        """Naloži posamezen plugin"""
        try:
            # Določi ime plugin-a
            if plugin_file.endswith('_plugin'):
                plugin_name = plugin_file.replace('_plugin', '')
            else:
                plugin_name = plugin_file
            
            # Pot do plugin datoteke
            if plugin_file.endswith('_plugin'):
                plugin_path = self.plugins_dir / f"{plugin_file}.py"
            else:
                plugin_path = self.plugins_dir / f"{plugin_file}.py"
            
            if not plugin_path.exists():
                # Poskusi z _plugin končnico
                plugin_path = self.plugins_dir / f"{plugin_file}_plugin.py"
                if not plugin_path.exists():
                    self.logger.error(f"Plugin datoteka ne obstaja: {plugin_file}")
                    return False
            
            # Naloži modul
            spec = importlib.util.spec_from_file_location(
                f"plugins.{plugin_file}", 
                plugin_path
            )
            
            if spec is None or spec.loader is None:
                self.logger.error(f"Ne morem naložiti plugin-a: {plugin_file}")
                return False
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Najdi Plugin razred
            plugin_class = None
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    name == "Plugin" and 
                    obj != PluginBase):
                    plugin_class = obj
                    break
            
            if plugin_class is None:
                self.logger.error(f"Plugin razred ni najden v {plugin_file}")
                return False
            
            # Ustvari instanco plugin-a
            plugin_instance = plugin_class()
            
            # Preveri, če ima potrebne metode
            if not hasattr(plugin_instance, 'handle'):
                self.logger.error(f"Plugin {plugin_file} nima handle metode")
                return False
            
            # Registriraj plugin
            self.plugins[plugin_name] = plugin_instance
            self.logger.info(f"✅ Plugin '{plugin_name}' uspešno naložen")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Napaka pri nalaganju plugin-a {plugin_file}: {e}")
            return False
    
    def load_all_plugins(self):
        """Naloži vse plugin-e iz direktorija"""
        plugin_files = self.find_plugin_files()
        
        if not plugin_files:
            self.logger.warning("Ni najdenih plugin datotek")
            return
        
        self.logger.info(f"Najdenih {len(plugin_files)} plugin datotek: {plugin_files}")
        
        loaded_count = 0
        for plugin_file in plugin_files:
            if self.load_plugin(plugin_file):
                loaded_count += 1
        
        self.logger.info(f"🔌 Naloženih {loaded_count}/{len(plugin_files)} plugin-ov")
    
    def get_plugin(self, name: str):
        """Pridobi plugin po imenu"""
        return self.plugins.get(name)
    
    def list_plugins(self) -> Dict[str, Dict[str, Any]]:
        """Seznam vseh naloženih plugin-ov z informacijami"""
        plugins_info = {}
        
        for name, plugin in self.plugins.items():
            try:
                if hasattr(plugin, 'get_info'):
                    plugins_info[name] = plugin.get_info()
                else:
                    # Fallback za plugin-e brez get_info metode
                    plugins_info[name] = {
                        "name": getattr(plugin, 'name', name),
                        "description": getattr(plugin, 'description', 'Ni opisa'),
                        "version": getattr(plugin, 'version', '1.0.0'),
                        "author": getattr(plugin, 'author', 'OmniCore'),
                        "capabilities": getattr(plugin, 'capabilities', [])
                    }
            except Exception as e:
                self.logger.error(f"Napaka pri pridobivanju info za plugin {name}: {e}")
                plugins_info[name] = {
                    "name": name,
                    "description": "Napaka pri pridobivanju informacij",
                    "version": "unknown",
                    "author": "unknown",
                    "capabilities": []
                }
        
        return plugins_info

class OmniCorePlugins:
    """
    Glavni OmniCore Plugin sistem z AI routing in hot-reload
    """
    
    def __init__(self, plugins_path: str = "plugins", openai_api_key: str = None, enable_hot_reload: bool = True):
        """
        Inicializiraj OmniCore Plugin sistem
        
        Args:
            plugins_path: Direktorij z plugin-i
            openai_api_key: OpenAI API ključ
            enable_hot_reload: Ali omogočiti hot-reload funkcionalnost
        """
        self.plugin_manager = PluginManager(plugins_path)
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.ai_enabled = bool(self.openai_api_key)
        self.plugin_stats = {}  # Statistike uporabe plugin-ov
        
        # Hot-reload funkcionalnost
        self.enable_hot_reload = enable_hot_reload
        self.hot_reload_manager = None
        
        # Statistike
        self.stats = {
            "total_requests": 0,
            "ai_routing_requests": 0,
            "fallback_routing_requests": 0,
            "plugin_usage": {},
            "start_time": time.time()
        }
        
        self.logger = logging.getLogger(__name__)
        
        # Inicializiraj sistem
        self._initialize_system()
    
    def _initialize_system(self):
        """Inicializiraj plugin sistem"""
        # Nastavi OpenAI klient
        if self.ai_enabled:
            self.client = OpenAI(api_key=self.openai_api_key)
        else:
            self.client = None
            self.logger.warning("OpenAI API ključ ni nastavljen - uporabljam fallback sistem")
        
        # Naloži vse plugin-e
        self.plugin_manager.load_all_plugins()
        
        # Inicializiraj hot-reload če je omogočen
        if self.enable_hot_reload:
            try:
                self.hot_reload_manager = HotReloadManager(self.plugin_manager)
                self.hot_reload_manager.start_watching()
                self.logger.info("🔥 Hot-reload sistem aktiviran")
            except Exception as e:
                self.logger.warning(f"⚠️ Hot-reload sistem ni mogel biti aktiviran: {e}")
        
        # Inicializiraj statistike za plugin-e
        for plugin_name in self.plugin_manager.plugins:
            if plugin_name not in self.plugin_stats:
                self.plugin_stats[plugin_name] = {
                    "usage_count": 0,
                    "last_used": None,
                    "error_count": 0
                }
        
        self.logger.info(f"🚀 OmniCore Plugins inicializiran z {len(self.plugin_manager.plugins)} plugin-i")
    
    def route(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Glavna routing metoda z AI ali fallback
        """
        self.stats["total_requests"] += 1
        
        try:
            # Poskusi AI routing
            if self.ai_enabled:
                plugin_name, confidence = self._ai_route(query)
                if plugin_name and confidence > 0.3:
                    self.stats["ai_routing_requests"] += 1
                    result = self._execute_plugin(plugin_name, query, context)
                    result["routing_method"] = "ai"
                    result["confidence"] = confidence
                    return result
            
            # Fallback routing
            self.stats["fallback_routing_requests"] += 1
            plugin_name = self._fallback_route(query)
            result = self._execute_plugin(plugin_name, query, context)
            result["routing_method"] = "fallback"
            return result
            
        except Exception as e:
            self.logger.error(f"Napaka pri routing: {e}")
            return {
                "success": False,
                "response": f"Napaka pri obravnavi zahteve: {str(e)}",
                "plugin_used": None,
                "routing_method": "error"
            }
    
    def _ai_route(self, query: str) -> Tuple[Optional[str], float]:
        """AI routing z OpenAI"""
        try:
            # Pripravi seznam plugin-ov
            plugins_info = []
            for name, plugin in self.plugin_manager.plugins.items():
                info = plugin.get_info() if hasattr(plugin, 'get_info') else {"description": "Ni opisa"}
                plugins_info.append(f"- {name}: {info.get('description', 'Ni opisa')}")
            
            plugins_text = "\n".join(plugins_info)
            
            # AI prompt
            prompt = f"""
Analiziraj uporabniško zahtevo in izberi najprimernejši plugin.

Dostopni plugin-i:
{plugins_text}

Uporabniška zahteva: "{query}"

Odgovori SAMO z imenom plugin-a (brez dodatnih besed).
Če noben plugin ni primeren, odgovori z "task".
"""
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50,
                temperature=0.1
            )
            
            plugin_name = response.choices[0].message.content.strip().lower()
            
            # Preveri, če plugin obstaja
            if plugin_name in self.plugin_manager.plugins:
                return plugin_name, 0.8
            else:
                return None, 0.0
                
        except Exception as e:
            self.logger.error(f"AI routing napaka: {e}")
            return None, 0.0
    
    def _fallback_route(self, query: str) -> str:
        """Fallback routing na osnovi ključnih besed"""
        query_lower = query.lower()
        
        # Ključne besede za routing
        routing_rules = {
            "task": ["naloga", "dodaj", "ustvari", "task", "todo", "opravilo"],
            "calendar": ["koledar", "sestanek", "termin", "datum", "ura", "calendar", "event"],
            "finance": ["denar", "finance", "stroški", "račun", "plača", "budget", "finančni"],
            "search": ["išči", "najdi", "search", "poišči", "pokaži"],
            "analytics": ["analiza", "statistika", "poročilo", "graf", "podatki", "analyze"]
        }
        
        # Preveri ključne besede
        for plugin_name, keywords in routing_rules.items():
            if plugin_name in self.plugin_manager.plugins:
                for keyword in keywords:
                    if keyword in query_lower:
                        return plugin_name
        
        # Privzeti plugin
        available_plugins = list(self.plugin_manager.plugins.keys())
        return available_plugins[0] if available_plugins else "task"
    
    def _execute_plugin(self, plugin_name: str, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Izvršitev plugin-a z error handling"""
        try:
            # Posodobi statistike uporabe
            if plugin_name not in self.stats["plugin_usage"]:
                self.stats["plugin_usage"][plugin_name] = 0
            self.stats["plugin_usage"][plugin_name] += 1
            
            # Pridobi plugin
            plugin = self.plugin_manager.get_plugin(plugin_name)
            if not plugin:
                raise ValueError(f"Plugin '{plugin_name}' ni najden")
            
            # Izvršitev
            result = plugin.handle(query, context)
            
            # Posodobi statistike plugin-a
            if plugin_name in self.plugin_stats:
                self.plugin_stats[plugin_name]["usage_count"] += 1
                self.plugin_stats[plugin_name]["last_used"] = datetime.now().isoformat()
            
            # Preveri tip rezultata in ga pretvori v slovar
            if not isinstance(result, dict):
                result = {"response": str(result)}
            
            # Dodaj meta informacije
            result.update({
                "success": True,
                "plugin_used": plugin_name,
                "timestamp": datetime.now().isoformat()
            })
            
            return result
            
        except Exception as e:
            # Posodobi error statistike
            if plugin_name in self.plugin_stats:
                self.plugin_stats[plugin_name]["error_count"] += 1
            
            self.logger.error(f"Napaka pri izvršitvi plugin-a {plugin_name}: {e}")
            return {
                "success": False,
                "response": f"Napaka pri izvršitvi plugin-a {plugin_name}: {str(e)}",
                "plugin_used": plugin_name,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def add_plugin_runtime(self, plugin_name: str, plugin_instance):
        """Dodaj plugin med izvajanjem"""
        self.plugin_manager.plugins[plugin_name] = plugin_instance
        
        # Inicializiraj statistike
        if plugin_name not in self.plugin_stats:
            self.plugin_stats[plugin_name] = {
                "usage_count": 0,
                "last_used": None,
                "error_count": 0
            }
        
        self.logger.info(f"Plugin '{plugin_name}' dodan med izvajanjem")
    
    def get_stats(self) -> Dict[str, Any]:
        """Vrni statistike sistema"""
        return {
            "total_requests": self.stats["total_requests"],
            "ai_routing": self.stats["ai_routing_requests"],
            "fallback_routing": self.stats["fallback_routing_requests"],
            "plugin_usage": self.stats["plugin_usage"],
            "uptime_seconds": time.time() - self.stats["start_time"],
            "ai_enabled": self.ai_enabled
        }
    
    def cleanup(self):
        """Počisti resurse (vključno z hot-reload sistemom)"""
        if self.hot_reload_manager:
            self.hot_reload_manager.stop_watching()
            self.logger.info("🛑 Hot-reload sistem ustavljen")
    
    def reload_all_plugins(self):
        """Ponovno naloži vse plugin-e (API za ročno reload)"""
        if self.hot_reload_manager:
            self.hot_reload_manager.reload_all_plugins()
        else:
            self.logger.warning("⚠️ Hot-reload sistem ni aktiven")
    
    def reload_plugin(self, plugin_name: str):
        """Ponovno naloži specifičen plugin"""
        if self.hot_reload_manager:
            plugin_file = f"{plugin_name}_plugin"
            self.hot_reload_manager.handler.reload_plugin(plugin_name, plugin_file)
        else:
            self.logger.warning("⚠️ Hot-reload sistem ni aktiven")
    
    def get_plugin_stats(self) -> Dict[str, Any]:
        """Vrni statistike uporabe plugin-ov"""
        total_usage = sum(stats["usage_count"] for stats in self.plugin_stats.values())
        
        return {
            "plugins": self.plugin_stats,
            "total_usage": total_usage,
            "plugin_count": len(self.plugin_manager.plugins),
            "available_plugins": list(self.plugin_manager.plugins.keys())
        }

# Test funkcionalnost
if __name__ == "__main__":
    print("🧪 Testiram OmniCore Plugin sistem...")
    
    # Ustvari instanco
    core = OmniCorePlugins()
    
    # Test zahteve
    test_queries = [
        "Dodaj naloga: pripraviti poročilo",
        "Ustvari sestanek za jutri ob 10:00",
        "Analiziraj prodajne podatke",
        "Išči dokumente o projektu",
        "Preveri finančno stanje",
        "Dodaj opomnik za nakup",
        "Pokaži koledar za ta teden"
    ]
    
    print(f"\n🔌 Naloženih plugin-ov: {len(core.plugin_manager.plugins)}")
    print(f"📋 Plugin-i: {list(core.plugin_manager.plugins.keys())}")
    
    print(f"\n🧪 Testiram {len(test_queries)} zahtev...")
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n--- Test {i}: {query} ---")
        result = core.route(query)
        
        print(f"✅ Plugin: {result.get('plugin_used', 'N/A')}")
        print(f"🔄 Metoda: {result.get('routing_method', 'N/A')}")
        print(f"📝 Odgovor: {result.get('response', 'N/A')}")
        
        if result.get('confidence'):
            print(f"🎯 Zaupanje: {result['confidence']:.2f}")
    
    # Podrobne statistike
    print("\n" + "="*60)
    print("STATISTIKE SISTEMA")
    print("="*60)
    
    stats = core.get_stats()
    print(f"📈 Skupaj zahtev: {stats['total_requests']}")
    print(f"🤖 AI routing: {stats['ai_routing']}")
    print(f"🔄 Fallback routing: {stats['fallback_routing']}")
    print(f"⏱️ Uptime: {stats['uptime_seconds']:.1f}s")
    print(f"🔌 AI omogočen: {'Da' if stats['ai_enabled'] else 'Ne'}")
    
    # Plugin statistike
    plugin_stats = core.get_plugin_stats()
    if "plugins" in plugin_stats:
        print(f"\n📊 Plugin uporaba (skupno: {plugin_stats['total_usage']}):")
        for plugin_name, stats in plugin_stats["plugins"].items():
            print(f"  📦 {plugin_name}: {stats['usage_count']} uporab, {stats['error_count']} napak")
    
    print(f"\n🎯 Test končan!")