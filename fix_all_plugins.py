#!/usr/bin/env python3
"""
Skripta za hitro popravljanje vseh plugin-ov
"""

import os
import re

def fix_plugin_file(file_path):
    """Popravi plugin datoteko"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Popravi handle metodo - dodaj context parameter
    content = re.sub(
        r'def handle\(self, query\):',
        'def handle(self, query, context=None):',
        content
    )
    
    # Dodaj get_info metodo, če ne obstaja
    if 'def get_info(self):' not in content:
        get_info_method = '''
    def get_info(self):
        """Vrni informacije o plugin-u"""
        return {
            "name": self.name,
            "version": getattr(self, 'version', '1.0.0'),
            "description": self.description,
            "author": getattr(self, 'author', 'OmniCore'),
            "capabilities": getattr(self, 'capabilities', [])
        }'''
        
        # Dodaj pred zadnjo funkcijo
        if 'def help_plugin():' in content:
            content = content.replace('def help_plugin():', get_info_method + '\n\ndef help_plugin():')
        else:
            content += get_info_method
    
    # Shrani popravljeno datoteko
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Popravil {file_path}")

# Seznam plugin-ov za popravljanje
plugins_to_fix = [
    'plugins/calendar_plugin.py',
    'plugins/analytics_plugin.py', 
    'plugins/search_plugin.py',
    'plugins/finance_plugin.py'
]

print("🔧 Popravljam plugin-e...")

for plugin_file in plugins_to_fix:
    if os.path.exists(plugin_file):
        fix_plugin_file(plugin_file)
    else:
        print(f"⚠️ Datoteka {plugin_file} ne obstaja")

print("✅ Vsi plugin-i popravljeni!")