#!/usr/bin/env python3
"""
🚀 OMNI - Univerzalni AI Pomočnik
Glavni vstopni program za Omni sistem

Avtor: Omni AI Team
Verzija: 1.0.0
"""

import sys
import os
import asyncio
import argparse
from datetime import datetime
from typing import Dict, List, Optional

# Dodaj omni directory v Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'omni'))

# Core imports
from core.engine import OmniCore
from core.nlp import OmniNLP
from core.memory import OmniMemoryManager
from core.learning import OmniAdaptiveLearning
from core.reasoning import OmniReasoningPlanner

# Module imports
from modules.finance import FinanceModule
from modules.tourism import TourismModule
from modules.devops import DevOpsModule
from modules.iot.iot import IoTModule
from modules.iot.iot_real import IoTRealModule
from modules.iot.iot_secure import IoTSecureModule

# Integration imports
from integrations.github import GitHubIntegration
from integrations.web_search import WebSearchIntegration
from integrations.search_bing import BingSearchIntegration

class OmniLauncher:
    """
    🎯 Omni Launcher - Glavni orkestrator sistema
    """
    
    def __init__(self):
        self.omni_core = None
        self.modules = {}
        self.integrations = {}
        self.config = self.load_config()
        
    def load_config(self) -> Dict:
        """Naloži konfiguracijo iz config.json ali uporabi privzeto"""
        config_path = os.path.join(os.path.dirname(__file__), 'config.json')
        
        default_config = {
            'debug': True,
            'log_level': 'INFO',
            'data_path': './omni/data',
            'modules': {
                'finance': {'enabled': True},
                'tourism': {'enabled': True},
                'devops': {'enabled': True}
            },
            'integrations': {
                'github': {
                    'enabled': False,
                    'token': None,
                    'auto_sync': False
                }
            },
            'ui': {
                'web_port': 8080,
                'voice_enabled': False
            }
        }
        
        try:
            if os.path.exists(config_path):
                import json
                with open(config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    # Merge z default config
                    default_config.update(user_config)
        except Exception as e:
            print(f"⚠️  Napaka pri nalaganju config.json: {e}")
            print("Uporabljam privzeto konfiguracijo...")
        
        return default_config
    
    def initialize_core(self):
        """Inicializiraj Omni jedro"""
        print("🧠 Inicializacija Omni jedra...")
        
        try:
            self.omni_core = OmniCore(
                debug=self.config.get('debug', True),
                data_path=self.config.get('data_path', './omni/data')
            )
            
            print("✅ Omni jedro uspešno inicializirano")
            return True
            
        except Exception as e:
            print(f"❌ Napaka pri inicializaciji jedra: {e}")
            return False
    
    def register_modules(self):
        """Registriraj vse module"""
        print("📦 Registracija modulov...")
        
        module_classes = {
            'finance': FinanceModule,
            'tourism': TourismModule,
            'devops': DevOpsModule,
            'iot': IoTModule,
            'iot_real': IoTRealModule,
            'iot_secure': IoTSecureModule
        }
        
        for module_name, module_class in module_classes.items():
            try:
                if self.config['modules'].get(module_name, {}).get('enabled', True):
                    module_instance = module_class()
                    self.omni_core.register_module(module_name, module_instance)
                    self.modules[module_name] = module_instance
                    print(f"  ✅ {module_name.capitalize()} modul registriran")
                else:
                    print(f"  ⏭️  {module_name.capitalize()} modul onemogočen")
                    
            except Exception as e:
                print(f"  ❌ Napaka pri registraciji {module_name}: {e}")
    
    def register_integrations(self):
        """Registriraj vse integracije"""
        print("🔗 Registracija integracij...")
        
        # GitHub integracija
        github_config = self.config['integrations'].get('github', {})
        if github_config.get('enabled', False) and github_config.get('token'):
            try:
                github_integration = GitHubIntegration(
                    token=github_config['token'],
                    base_path=os.path.join(self.config['data_path'], 'repos')
                )
                self.integrations['github'] = github_integration
                print("  ✅ GitHub integracija registrirana")
                
                # Avtomatski sync, če je omogočen
                if github_config.get('auto_sync', False):
                    print("  🔄 Izvajam avtomatski GitHub sync...")
                    github_integration.sync_all_repositories()
                    
            except Exception as e:
                print(f"  ❌ Napaka pri GitHub integraciji: {e}")
        else:
            print("  ⏭️  GitHub integracija onemogočena (manjka token)")
        
        # Web Search integracija
        try:
            web_search = WebSearchIntegration()
            self.omni_core.register_integration("web_search", web_search)
            self.integrations['web_search'] = web_search
            print("  ✅ Web Search integracija registrirana")
        except Exception as e:
            print(f"  ❌ Napaka pri Web Search integraciji: {e}")
        
        # Bing Search integracija
        try:
            bing_search = BingSearchIntegration()
            self.omni_core.register_integration("search_bing", bing_search)
            self.integrations['search_bing'] = bing_search
            print("  ✅ Bing Search integracija registrirana")
        except Exception as e:
            print(f"  ❌ Napaka pri Bing Search integraciji: {e}")
    
    def start_interactive_mode(self):
        """Zaženi interaktivni način"""
        print("\n" + "="*60)
        print("🚀 OMNI AI - Interaktivni način")
        print("="*60)
        print("Ukazi:")
        print("  help     - Prikaži pomoč")
        print("  status   - Prikaži status sistema")
        print("  modules  - Prikaži registrirane module")
        print("  finance  - Finančni modul")
        print("  tourism  - Turizem modul")
        print("  devops   - DevOps modul")
        print("  github   - GitHub integracija")
        print("  quit     - Izhod")
        print("-"*60)
        
        while True:
            try:
                user_input = input("\n🤖 Omni> ").strip().lower()
                
                if user_input in ['quit', 'exit', 'q']:
                    print("👋 Nasvidenje!")
                    break
                
                elif user_input == 'help':
                    self.show_help()
                
                elif user_input == 'status':
                    self.show_status()
                
                elif user_input == 'modules':
                    self.show_modules()
                
                elif user_input == 'finance':
                    self.finance_menu()
                
                elif user_input == 'tourism':
                    self.tourism_menu()
                
                elif user_input == 'devops':
                    self.devops_menu()
                
                elif user_input == 'github':
                    self.github_menu()
                
                elif user_input == '':
                    continue
                
                else:
                    # Pošlji na Omni jedro za procesiranje
                    response = self.omni_core.process_input(user_input)
                    print(f"💭 {response}")
                    
            except KeyboardInterrupt:
                print("\n👋 Nasvidenje!")
                break
            except Exception as e:
                print(f"❌ Napaka: {e}")
    
    def show_help(self):
        """Prikaži pomoč"""
        print("\n📚 OMNI AI - Pomoč")
        print("-"*40)
        print("Omni je univerzalni AI pomočnik za:")
        print("• Finance in računovodstvo")
        print("• Turizem in gostinstvo")
        print("• DevOps in IT avtomatizacijo")
        print("• GitHub upravljanje")
        print("\nPrimeri uporabe:")
        print("• 'dodaj transakcijo 150 EUR za kosilo'")
        print("• 'ustvari itinerar za Bled 3 dni'")
        print("• 'sinhroniziraj GitHub repozitorije'")
        print("• 'prikaži finančno poročilo'")
    
    def show_status(self):
        """Prikaži status sistema"""
        print(f"\n📊 OMNI Status - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-"*50)
        print(f"🧠 Jedro: {'✅ Aktivno' if self.omni_core else '❌ Neaktivno'}")
        print(f"📦 Moduli: {len(self.modules)} registriranih")
        print(f"🔗 Integracije: {len(self.integrations)} aktivnih")
        
        if self.omni_core:
            status = self.omni_core.get_status()
            print(f"💾 Spomin: {status.get('memory_items', 0)} elementov")
            print(f"🎯 Vzorci: {status.get('learning_patterns', 0)} naučenih")
    
    def show_modules(self):
        """Prikaži registrirane module"""
        print("\n📦 Registrirani moduli:")
        print("-"*30)
        for name, module in self.modules.items():
            print(f"  ✅ {name.capitalize()}: {module.__class__.__name__}")
    
    def finance_menu(self):
        """Finančni modul meni"""
        if 'finance' not in self.modules:
            print("❌ Finančni modul ni registriran")
            return
        
        print("\n💰 Finančni modul")
        print("1. Dodaj transakcijo")
        print("2. Prikaži proračun")
        print("3. Mesečno poročilo")
        print("4. Nazaj")
        
        choice = input("Izbira> ")
        
        if choice == '1':
            amount = float(input("Znesek: "))
            description = input("Opis: ")
            category = input("Kategorija: ")
            self.modules['finance'].add_transaction(amount, description, category)
            print("✅ Transakcija dodana")
        
        elif choice == '2':
            budget = self.modules['finance'].get_budget_overview()
            print(f"📊 Proračun: {budget}")
        
        elif choice == '3':
            report = self.modules['finance'].generate_monthly_report()
            print(f"📈 Mesečno poročilo: {report}")
    
    def tourism_menu(self):
        """Turizem modul meni"""
        if 'tourism' not in self.modules:
            print("❌ Turizem modul ni registriran")
            return
        
        print("\n🏖️  Turizem modul")
        print("1. Dodaj nastanitev")
        print("2. Ustvari itinerar")
        print("3. Prikaži aktivnosti")
        print("4. Nazaj")
        
        choice = input("Izbira> ")
        
        if choice == '1':
            name = input("Ime nastanitve: ")
            location = input("Lokacija: ")
            price = float(input("Cena na noč: "))
            self.modules['tourism'].add_accommodation(name, location, "hotel", price, 4.0)
            print("✅ Nastanitev dodana")
        
        elif choice == '2':
            destination = input("Destinacija: ")
            days = int(input("Število dni: "))
            itinerary = self.modules['tourism'].create_itinerary(destination, days)
            print(f"🗺️  Itinerar: {itinerary}")
    
    def devops_menu(self):
        """DevOps modul meni"""
        if 'devops' not in self.modules:
            print("❌ DevOps modul ni registriran")
            return
        
        print("\n⚙️ DevOps modul")
        print("1. Dodaj projekt")
        print("2. Prikaži projekte")
        print("3. Sistem metriki")
        print("4. Nazaj")
        
        choice = input("Izbira> ")
        
        if choice == '1':
            name = input("Ime projekta: ")
            description = input("Opis: ")
            self.modules['devops'].add_project(name, description, "active")
            print("✅ Projekt dodan")
        
        elif choice == '2':
            projects = self.modules['devops'].get_projects()
            print("📋 Projekti:")
            for project in projects:
                print(f"  • {project}")
        
        elif choice == '3':
            metrics = self.modules['devops'].get_system_metrics()
            print(f"📊 Sistem metriki: {metrics}")
    
    def github_menu(self):
        """GitHub integracija meni"""
        if 'github' not in self.integrations:
            print("❌ GitHub integracija ni aktivna")
            return
        
        github = self.integrations['github']
        
        print("\n🐙 GitHub integracija")
        print("1. Prikaži repozitorije")
        print("2. Sinhroniziraj vse")
        print("3. Analitika repozitorija")
        print("4. Nazaj")
        
        choice = input("Izbira> ")
        
        if choice == '1':
            repos = github.get_user_repos()
            print("📁 Repozitoriji:")
            for i, repo in enumerate(repos[:10], 1):
                print(f"  {i}. {repo.name} - {repo.description[:50]}...")
        
        elif choice == '2':
            results = github.sync_all_repositories()
            print(f"🔄 Sinhronizacija končana: {results}")
        
        elif choice == '3':
            repo_name = input("Ime repozitorija: ")
            repos = github.get_user_repos()
            repo = next((r for r in repos if r.name == repo_name), None)
            if repo:
                analytics = github.get_repository_analytics(repo)
                print(f"📊 Analitika: {analytics}")
            else:
                print("❌ Repozitorij ni najden")

def main():
    """Glavna funkcija"""
    parser = argparse.ArgumentParser(description='Omni AI - Univerzalni pomočnik')
    parser.add_argument('--config', help='Pot do config.json datoteke')
    parser.add_argument('--debug', action='store_true', help='Debug način')
    parser.add_argument('--web', action='store_true', help='Zaženi web vmesnik')
    parser.add_argument('--voice', action='store_true', help='Zaženi glasovni vmesnik')
    
    args = parser.parse_args()
    
    print("🚀 OMNI AI - Univerzalni pomočnik")
    print("="*50)
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*50)
    
    # Inicializiraj launcher
    launcher = OmniLauncher()
    
    # Inicializiraj jedro
    if not launcher.initialize_core():
        print("❌ Kritična napaka pri inicializaciji. Izhod.")
        sys.exit(1)
    
    # Registriraj module
    launcher.register_modules()
    
    # Registriraj integracije
    launcher.register_integrations()
    
    print(f"\n✅ Omni AI uspešno zagnan!")
    print(f"📦 {len(launcher.modules)} modulov registriranih")
    print(f"🔗 {len(launcher.integrations)} integracij aktivnih")
    
    # Zaženi vmesnik
    if args.web:
        print("🌐 Web vmesnik bo kmalu na voljo...")
        # TODO: Implementiraj web vmesnik
    elif args.voice:
        print("🎤 Glasovni vmesnik bo kmalu na voljo...")
        # TODO: Implementiraj glasovni vmesnik
    else:
        # Interaktivni način
        launcher.start_interactive_mode()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Omni AI zaustavljen. Nasvidenje!")
    except Exception as e:
        print(f"❌ Kritična napaka: {e}")
        sys.exit(1)