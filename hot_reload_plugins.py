#!/usr/bin/env python3
"""
Hot-reload funkcionalnost za plugin-e
Omogoča dinamično ponovno nalaganje plugin-ov brez restarta strežnika
"""

import os
import time
import importlib
import sys
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import logging

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PluginReloadHandler(FileSystemEventHandler):
    """Handler za spremljanje sprememb plugin datotek"""
    
    def __init__(self, plugin_manager):
        self.plugin_manager = plugin_manager
        self.last_reload = {}
        
    def on_modified(self, event):
        """Ko se plugin datoteka spremeni"""
        if event.is_directory:
            return
            
        # Preveri, če je to plugin datoteka
        if not event.src_path.endswith('_plugin.py'):
            return
            
        # Prepreči preveč pogosto ponovno nalaganje
        current_time = time.time()
        if event.src_path in self.last_reload:
            if current_time - self.last_reload[event.src_path] < 2:
                return
                
        self.last_reload[event.src_path] = current_time
        
        try:
            # Pridobi ime plugin-a iz datoteke
            plugin_file = Path(event.src_path).stem
            plugin_name = plugin_file.replace('_plugin', '')
            
            logger.info(f"🔄 Zaznana sprememba v {plugin_file}, ponovno nalagam...")
            
            # Ponovno naloži plugin
            self.reload_plugin(plugin_name, plugin_file)
            
        except Exception as e:
            logger.error(f"❌ Napaka pri ponovnem nalaganju plugin-a: {e}")
    
    def reload_plugin(self, plugin_name, plugin_file):
        """Ponovno naloži specifičen plugin"""
        try:
            # Odstrani stari plugin iz cache-a
            if plugin_name in self.plugin_manager.plugins:
                del self.plugin_manager.plugins[plugin_name]
                
            # Odstrani modul iz sys.modules
            module_name = f"plugins.{plugin_file}"
            if module_name in sys.modules:
                del sys.modules[module_name]
                
            # Ponovno naloži plugin
            self.plugin_manager.load_plugin(plugin_file)
            
            logger.info(f"✅ Plugin '{plugin_name}' uspešno ponovno naložen")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri ponovnem nalaganju plugin-a '{plugin_name}': {e}")

class HotReloadManager:
    """Manager za hot-reload funkcionalnost"""
    
    def __init__(self, plugin_manager, plugins_dir="plugins"):
        self.plugin_manager = plugin_manager
        self.plugins_dir = plugins_dir
        self.observer = None
        self.handler = None
        
    def start_watching(self):
        """Začni spremljanje plugin direktorijev"""
        try:
            self.handler = PluginReloadHandler(self.plugin_manager)
            self.observer = Observer()
            
            # Dodaj watcher za plugins direktorij
            plugins_path = Path(self.plugins_dir).absolute()
            if plugins_path.exists():
                self.observer.schedule(self.handler, str(plugins_path), recursive=False)
                logger.info(f"🔍 Spremljam spremembe v: {plugins_path}")
            else:
                logger.warning(f"⚠️ Plugin direktorij ne obstaja: {plugins_path}")
                
            self.observer.start()
            logger.info("🚀 Hot-reload sistem aktiviran")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri zagonu hot-reload sistema: {e}")
            
    def stop_watching(self):
        """Ustavi spremljanje"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("🛑 Hot-reload sistem ustavljen")
            
    def reload_all_plugins(self):
        """Ponovno naloži vse plugin-e"""
        try:
            logger.info("🔄 Ponovno nalagam vse plugin-e...")
            
            # Shrani seznam trenutnih plugin-ov
            current_plugins = list(self.plugin_manager.plugins.keys())
            
            # Počisti vse plugin-e
            self.plugin_manager.plugins.clear()
            
            # Počisti sys.modules
            modules_to_remove = []
            for module_name in sys.modules:
                if module_name.startswith('plugins.') and module_name.endswith('_plugin'):
                    modules_to_remove.append(module_name)
                    
            for module_name in modules_to_remove:
                del sys.modules[module_name]
                
            # Ponovno naloži vse plugin-e
            self.plugin_manager.load_all_plugins()
            
            new_plugins = list(self.plugin_manager.plugins.keys())
            logger.info(f"✅ Ponovno naloženih {len(new_plugins)} plugin-ov: {new_plugins}")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri ponovnem nalaganju vseh plugin-ov: {e}")

# Test funkcionalnost
if __name__ == "__main__":
    # Simulacija za testiranje
    class MockPluginManager:
        def __init__(self):
            self.plugins = {}
            
        def load_plugin(self, plugin_file):
            plugin_name = plugin_file.replace('_plugin', '')
            self.plugins[plugin_name] = f"Mock plugin {plugin_name}"
            print(f"Naložen mock plugin: {plugin_name}")
            
        def load_plugins(self):
            print("Nalagam vse mock plugin-e...")
            
    # Test hot-reload sistema
    mock_manager = MockPluginManager()
    hot_reload = HotReloadManager(mock_manager)
    
    print("🧪 Testiram hot-reload sistem...")
    print("Pritisnite Ctrl+C za izhod")
    
    try:
        hot_reload.start_watching()
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        hot_reload.stop_watching()
        print("\n👋 Hot-reload sistem ustavljen")