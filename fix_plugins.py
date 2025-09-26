#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Skripta za popravilo plugin-ov - dodaj PluginBase definicijo in can_handle metodo
"""

import os
import re

def fix_plugin(plugin_path, plugin_name, keywords):
    """Popravi posamezen plugin"""
    
    base_class = '''
# Definiramo PluginBase lokalno za neodvisnost
class PluginBase:
    """Osnova za vse plugin-e"""
    name = "base"
    description = "Generic plugin"
    version = "1.0.0"
    author = "OmniCore"
    enabled = True
    capabilities = []
    dependencies = []
    
    def handle(self, query, context=None):
        raise NotImplementedError("Vsak plugin mora implementirati handle()")
    
    def can_handle(self, query):
        """Vrni oceno 0-1 kako dobro plugin lahko obravnava zahtevo"""
        return 0.0
    
    def get_help(self):
        """Vrni pomoč za plugin"""
        return f"Plugin {self.name}: {self.description}"
    
    def update_stats(self, success=True):
        """Posodobi statistike plugin-a"""
        pass
'''
    
    can_handle_method = f'''
    def can_handle(self, query):
        """Oceni kako dobro plugin lahko obravnava zahtevo"""
        query_lower = query.lower()
        keywords = {keywords}
        
        score = 0
        for keyword in keywords:
            if keyword in query_lower:
                score += 0.2
        
        return min(score, 1.0)
'''
    
    if not os.path.exists(plugin_path):
        print(f"❌ {plugin_path} ne obstaja")
        return False
    
    try:
        with open(plugin_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Zamenjaj import
        content = content.replace('from omni_core_plugins import PluginBase', base_class)
        
        # Dodaj metadata in can_handle če ni
        if 'def can_handle(self, query):' not in content:
            # Najdi class Plugin definicijo in dodaj metadata
            class_match = re.search(r'(class Plugin\(PluginBase\):\s*\n\s*name = "[^"]*"\s*\n\s*description = "[^"]*")', content, re.MULTILINE)
            if class_match:
                old_class = class_match.group(1)
                new_class = old_class + f'\n    version = "1.0.0"\n    author = "OmniCore"\n    capabilities = ["{plugin_name}_management"]'
                content = content.replace(old_class, new_class)
                
                # Dodaj can_handle metodo za __init__
                init_match = re.search(r'(\s+def __init__\(self\):.*?\n)', content, re.DOTALL)
                if init_match:
                    init_method = init_match.group(1)
                    content = content.replace(init_method, can_handle_method + '\n' + init_method)
        
        with open(plugin_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Popravljen {plugin_path}")
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri {plugin_path}: {e}")
        return False

def main():
    """Glavna funkcija"""
    plugins_config = {
        'analytics_plugin.py': {
            'name': 'analytics',
            'keywords': ['analiza', 'statistike', 'podatki', 'poročilo', 'metrics', 'dashboard']
        },
        'search_plugin.py': {
            'name': 'search', 
            'keywords': ['išči', 'najdi', 'search', 'find', 'dokumenti', 'iskanje']
        },
        'finance_plugin.py': {
            'name': 'finance',
            'keywords': ['finance', 'denar', 'strošek', 'prihodek', 'proračun', 'budget', 'plačilo']
        }
    }
    
    print("🔧 Popravljam plugin-e...")
    
    for plugin_file, config in plugins_config.items():
        plugin_path = f"plugins/{plugin_file}"
        fix_plugin(plugin_path, config['name'], config['keywords'])
    
    print("✅ Vsi plugin-i popravljeni!")

if __name__ == "__main__":
    main()