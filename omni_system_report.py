#!/usr/bin/env python3
"""
Omni System Report Generator
Generira podrobno poročilo o stanju Omni supermozga in pripravi sistem za produkcijo
"""

import json
import sqlite3
import os
import datetime
import psutil
import platform
from pathlib import Path
import subprocess
import sys

class OmniSystemReporter:
    def __init__(self):
        self.report_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "system_info": {},
            "omni_brain_status": {},
            "modules_status": {},
            "cloud_memory_status": {},
            "mobile_terminal_status": {},
            "learning_optimization_status": {},
            "database_status": {},
            "security_status": {},
            "performance_metrics": {},
            "recommendations": [],
            "production_readiness": {}
        }
        
    def collect_system_info(self):
        """Zbere osnovne informacije o sistemu"""
        try:
            self.report_data["system_info"] = {
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "cpu_count": psutil.cpu_count(),
                "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
                "memory_available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
                "disk_usage": {
                    "total_gb": round(psutil.disk_usage('.').total / (1024**3), 2),
                    "free_gb": round(psutil.disk_usage('.').free / (1024**3), 2)
                },
                "network_interfaces": len(psutil.net_if_addrs())
            }
        except Exception as e:
            self.report_data["system_info"]["error"] = str(e)
    
    def check_omni_brain_status(self):
        """Preveri stanje Omni Brain jedra"""
        try:
            brain_file = "omni_brain_core.py"
            if os.path.exists(brain_file):
                with open(brain_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                self.report_data["omni_brain_status"] = {
                    "core_file_exists": True,
                    "file_size_kb": round(os.path.getsize(brain_file) / 1024, 2),
                    "has_orchestrator": "OmniBrainOrchestrator" in content,
                    "has_database_init": "init_database" in content,
                    "has_module_registry": "register_module" in content,
                    "status": "READY"
                }
            else:
                self.report_data["omni_brain_status"] = {
                    "core_file_exists": False,
                    "status": "NOT_FOUND"
                }
        except Exception as e:
            self.report_data["omni_brain_status"]["error"] = str(e)
    
    def check_modules_status(self):
        """Preveri stanje AI modulov"""
        try:
            modules_file = "omni_module_connectors.py"
            if os.path.exists(modules_file):
                with open(modules_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                modules = ["Finance", "Tourism", "IoT", "Radio", "Beekeeping", "DevOps", "Healthcare"]
                module_status = {}
                
                for module in modules:
                    module_class = f"{module}ModuleConnector"
                    module_status[module] = {
                        "connector_exists": module_class in content,
                        "status": "READY" if module_class in content else "MISSING"
                    }
                
                self.report_data["modules_status"] = {
                    "connectors_file_exists": True,
                    "modules": module_status,
                    "total_modules": len(modules),
                    "ready_modules": sum(1 for m in module_status.values() if m["status"] == "READY")
                }
            else:
                self.report_data["modules_status"] = {
                    "connectors_file_exists": False,
                    "status": "NOT_FOUND"
                }
        except Exception as e:
            self.report_data["modules_status"]["error"] = str(e)
    
    def check_cloud_memory_status(self):
        """Preveri stanje oblačnega pomnilnika"""
        try:
            cloud_file = "omni_cloud_memory.py"
            if os.path.exists(cloud_file):
                with open(cloud_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                self.report_data["cloud_memory_status"] = {
                    "cloud_file_exists": True,
                    "has_redis_support": "redis" in content.lower(),
                    "has_sqlite_support": "sqlite" in content.lower(),
                    "has_compression": "compress" in content.lower(),
                    "has_backup_restore": "backup" in content.lower() and "restore" in content.lower(),
                    "status": "READY"
                }
            else:
                self.report_data["cloud_memory_status"] = {
                    "cloud_file_exists": False,
                    "status": "NOT_FOUND"
                }
        except Exception as e:
            self.report_data["cloud_memory_status"]["error"] = str(e)
    
    def check_mobile_terminal_status(self):
        """Preveri stanje mobilnega terminala"""
        try:
            terminal_file = "omni_mobile_terminal.py"
            if os.path.exists(terminal_file):
                with open(terminal_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                self.report_data["mobile_terminal_status"] = {
                    "terminal_file_exists": True,
                    "has_gui": "tkinter" in content.lower(),
                    "has_websocket": "websocket" in content.lower(),
                    "has_commands": "predefined_commands" in content,
                    "status": "READY"
                }
            else:
                self.report_data["mobile_terminal_status"] = {
                    "terminal_file_exists": False,
                    "status": "NOT_FOUND"
                }
        except Exception as e:
            self.report_data["mobile_terminal_status"]["error"] = str(e)
    
    def check_learning_optimization_status(self):
        """Preveri stanje sistema za učenje in optimizacijo"""
        try:
            learning_file = "omni_learning_optimization.py"
            if os.path.exists(learning_file):
                with open(learning_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                self.report_data["learning_optimization_status"] = {
                    "learning_file_exists": True,
                    "has_pattern_detection": "detect_patterns" in content,
                    "has_auto_optimization": "auto_optimize" in content,
                    "has_model_validation": "validate_model" in content,
                    "has_neural_networks": "neural" in content.lower(),
                    "status": "READY"
                }
            else:
                self.report_data["learning_optimization_status"] = {
                    "learning_file_exists": False,
                    "status": "NOT_FOUND"
                }
        except Exception as e:
            self.report_data["learning_optimization_status"]["error"] = str(e)
    
    def check_database_status(self):
        """Preveri stanje baz podatkov"""
        try:
            db_files = [
                "finance.db", "tourism.db", "devops.db", 
                "omni_analytics.db", "omni_multitenant.db"
            ]
            
            db_status = {}
            for db_file in db_files:
                if os.path.exists(db_file):
                    try:
                        conn = sqlite3.connect(db_file)
                        cursor = conn.cursor()
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                        tables = cursor.fetchall()
                        conn.close()
                        
                        db_status[db_file] = {
                            "exists": True,
                            "size_kb": round(os.path.getsize(db_file) / 1024, 2),
                            "tables_count": len(tables),
                            "status": "READY"
                        }
                    except Exception as e:
                        db_status[db_file] = {
                            "exists": True,
                            "error": str(e),
                            "status": "ERROR"
                        }
                else:
                    db_status[db_file] = {
                        "exists": False,
                        "status": "MISSING"
                    }
            
            self.report_data["database_status"] = db_status
        except Exception as e:
            self.report_data["database_status"]["error"] = str(e)
    
    def check_security_status(self):
        """Preveri varnostno stanje"""
        try:
            security_files = ["data/security/users.json", "data/security/api_keys.json"]
            security_status = {}
            
            for sec_file in security_files:
                if os.path.exists(sec_file):
                    security_status[sec_file] = {
                        "exists": True,
                        "size_kb": round(os.path.getsize(sec_file) / 1024, 2),
                        "status": "READY"
                    }
                else:
                    security_status[sec_file] = {
                        "exists": False,
                        "status": "MISSING"
                    }
            
            self.report_data["security_status"] = security_status
        except Exception as e:
            self.report_data["security_status"]["error"] = str(e)
    
    def calculate_performance_metrics(self):
        """Izračuna metrike zmogljivosti"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            self.report_data["performance_metrics"] = {
                "cpu_usage_percent": cpu_percent,
                "memory_usage_percent": memory.percent,
                "memory_used_gb": round(memory.used / (1024**3), 2),
                "load_average": os.getloadavg() if hasattr(os, 'getloadavg') else "N/A",
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            self.report_data["performance_metrics"]["error"] = str(e)
    
    def generate_recommendations(self):
        """Generira priporočila za optimizacijo"""
        recommendations = []
        
        # Preveri stanje modulov
        if self.report_data.get("modules_status", {}).get("ready_modules", 0) < 7:
            recommendations.append({
                "priority": "HIGH",
                "category": "Modules",
                "issue": "Nekateri AI moduli niso pripravljeni",
                "recommendation": "Preverite in popravite manjkajoče module connectore"
            })
        
        # Preveri pomnilnik
        memory_usage = self.report_data.get("performance_metrics", {}).get("memory_usage_percent", 0)
        if memory_usage > 80:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Performance",
                "issue": f"Visoka uporaba pomnilnika: {memory_usage}%",
                "recommendation": "Razmislite o povečanju RAM-a ali optimizaciji procesov"
            })
        
        # Preveri CPU
        cpu_usage = self.report_data.get("performance_metrics", {}).get("cpu_usage_percent", 0)
        if cpu_usage > 90:
            recommendations.append({
                "priority": "HIGH",
                "category": "Performance",
                "issue": f"Visoka uporaba CPU: {cpu_usage}%",
                "recommendation": "Optimizirajte procese ali povečajte računsko moč"
            })
        
        # Preveri baze podatkov
        db_errors = sum(1 for db in self.report_data.get("database_status", {}).values() 
                       if isinstance(db, dict) and db.get("status") == "ERROR")
        if db_errors > 0:
            recommendations.append({
                "priority": "HIGH",
                "category": "Database",
                "issue": f"{db_errors} baz podatkov ima napake",
                "recommendation": "Popravite napake v bazah podatkov pred produkcijo"
            })
        
        self.report_data["recommendations"] = recommendations
    
    def assess_production_readiness(self):
        """Oceni pripravljenost za produkcijo"""
        readiness_score = 0
        max_score = 100
        
        # Omni Brain (20 točk)
        if self.report_data.get("omni_brain_status", {}).get("status") == "READY":
            readiness_score += 20
        
        # Moduli (25 točk)
        ready_modules = self.report_data.get("modules_status", {}).get("ready_modules", 0)
        total_modules = self.report_data.get("modules_status", {}).get("total_modules", 7)
        if total_modules > 0:
            readiness_score += int((ready_modules / total_modules) * 25)
        
        # Oblačni pomnilnik (15 točk)
        if self.report_data.get("cloud_memory_status", {}).get("status") == "READY":
            readiness_score += 15
        
        # Mobilni terminal (10 točk)
        if self.report_data.get("mobile_terminal_status", {}).get("status") == "READY":
            readiness_score += 10
        
        # Učenje in optimizacija (15 točk)
        if self.report_data.get("learning_optimization_status", {}).get("status") == "READY":
            readiness_score += 15
        
        # Baze podatkov (10 točk)
        db_ready = sum(1 for db in self.report_data.get("database_status", {}).values() 
                      if isinstance(db, dict) and db.get("status") == "READY")
        total_dbs = len(self.report_data.get("database_status", {}))
        if total_dbs > 0:
            readiness_score += int((db_ready / total_dbs) * 10)
        
        # Varnost (5 točk)
        security_ready = sum(1 for sec in self.report_data.get("security_status", {}).values() 
                           if isinstance(sec, dict) and sec.get("status") == "READY")
        total_security = len(self.report_data.get("security_status", {}))
        if total_security > 0:
            readiness_score += int((security_ready / total_security) * 5)
        
        # Določi status pripravljenosti
        if readiness_score >= 90:
            status = "PRODUCTION_READY"
        elif readiness_score >= 70:
            status = "MOSTLY_READY"
        elif readiness_score >= 50:
            status = "NEEDS_WORK"
        else:
            status = "NOT_READY"
        
        self.report_data["production_readiness"] = {
            "score": readiness_score,
            "max_score": max_score,
            "percentage": round((readiness_score / max_score) * 100, 1),
            "status": status,
            "assessment_time": datetime.datetime.now().isoformat()
        }
    
    def generate_full_report(self):
        """Generira celotno poročilo"""
        print("🔍 Zbiram podatke o sistemu...")
        self.collect_system_info()
        
        print("🧠 Preverjam Omni Brain jedro...")
        self.check_omni_brain_status()
        
        print("🔌 Preverjam AI module...")
        self.check_modules_status()
        
        print("☁️ Preverjam oblačni pomnilnik...")
        self.check_cloud_memory_status()
        
        print("📱 Preverjam mobilni terminal...")
        self.check_mobile_terminal_status()
        
        print("🤖 Preverjam sistem za učenje...")
        self.check_learning_optimization_status()
        
        print("🗄️ Preverjam baze podatkov...")
        self.check_database_status()
        
        print("🔒 Preverjam varnost...")
        self.check_security_status()
        
        print("📊 Računam metrike zmogljivosti...")
        self.calculate_performance_metrics()
        
        print("💡 Generiram priporočila...")
        self.generate_recommendations()
        
        print("✅ Ocenjujem pripravljenost za produkcijo...")
        self.assess_production_readiness()
        
        return self.report_data
    
    def save_report(self, filename="omni_system_report.json"):
        """Shrani poročilo v datoteko"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.report_data, f, indent=2, ensure_ascii=False)
        print(f"📄 Poročilo shranjeno v: {filename}")
    
    def print_summary(self):
        """Izpiše povzetek poročila"""
        print("\n" + "="*80)
        print("🚀 OMNI SUPERMOZG - POROČILO O STANJU SISTEMA")
        print("="*80)
        
        # Osnovne informacije
        print(f"\n📅 Čas generiranja: {self.report_data['timestamp']}")
        print(f"💻 Platforma: {self.report_data.get('system_info', {}).get('platform', 'N/A')}")
        
        # Pripravljenost za produkcijo
        readiness = self.report_data.get('production_readiness', {})
        print(f"\n🎯 PRIPRAVLJENOST ZA PRODUKCIJO: {readiness.get('percentage', 0)}%")
        print(f"📊 Status: {readiness.get('status', 'UNKNOWN')}")
        
        # Stanje komponent
        print(f"\n🧠 Omni Brain: {self.report_data.get('omni_brain_status', {}).get('status', 'UNKNOWN')}")
        modules_status = self.report_data.get('modules_status', {})
        print(f"🔌 AI Moduli: {modules_status.get('ready_modules', 0)}/{modules_status.get('total_modules', 0)} pripravljenih")
        print(f"☁️ Oblačni pomnilnik: {self.report_data.get('cloud_memory_status', {}).get('status', 'UNKNOWN')}")
        print(f"📱 Mobilni terminal: {self.report_data.get('mobile_terminal_status', {}).get('status', 'UNKNOWN')}")
        print(f"🤖 Učenje/Optimizacija: {self.report_data.get('learning_optimization_status', {}).get('status', 'UNKNOWN')}")
        
        # Zmogljivost
        perf = self.report_data.get('performance_metrics', {})
        print(f"\n📊 CPU uporaba: {perf.get('cpu_usage_percent', 'N/A')}%")
        print(f"🧠 RAM uporaba: {perf.get('memory_usage_percent', 'N/A')}%")
        
        # Priporočila
        recommendations = self.report_data.get('recommendations', [])
        if recommendations:
            print(f"\n⚠️ PRIPOROČILA ({len(recommendations)}):")
            for i, rec in enumerate(recommendations[:3], 1):  # Prikaži samo prva 3
                print(f"  {i}. [{rec.get('priority', 'N/A')}] {rec.get('issue', 'N/A')}")
        else:
            print("\n✅ Ni kritičnih priporočil!")
        
        print("\n" + "="*80)

def main():
    """Glavna funkcija"""
    reporter = OmniSystemReporter()
    
    print("🚀 Začenjam generiranje poročila o Omni supermozgu...")
    report_data = reporter.generate_full_report()
    
    # Shrani poročilo
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    report_filename = f"omni_system_report_{timestamp}.json"
    reporter.save_report(report_filename)
    
    # Prikaži povzetek
    reporter.print_summary()
    
    return report_data

if __name__ == "__main__":
    main()