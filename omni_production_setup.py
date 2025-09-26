#!/usr/bin/env python3
"""
Omni Production Setup
Priprava Omni supermozga za produkcijsko uporabo z avtomatsko konfiguracijo
"""

import os
import json
import sqlite3
import shutil
import datetime
import subprocess
import sys
from pathlib import Path

class OmniProductionSetup:
    def __init__(self):
        self.setup_log = []
        self.config = {
            "production_mode": True,
            "debug_mode": False,
            "auto_start": True,
            "monitoring_enabled": True,
            "backup_enabled": True,
            "security_enhanced": True
        }
        
    def log_action(self, action, status="SUCCESS", details=""):
        """Zabeleži akcijo v setup log"""
        log_entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "action": action,
            "status": status,
            "details": details
        }
        self.setup_log.append(log_entry)
        print(f"[{status}] {action}: {details}")
    
    def create_production_directories(self):
        """Ustvari potrebne direktorije za produkcijo"""
        try:
            directories = [
                "production/logs",
                "production/backups",
                "production/config",
                "production/data",
                "production/monitoring",
                "production/security"
            ]
            
            for directory in directories:
                os.makedirs(directory, exist_ok=True)
                self.log_action("CREATE_DIRECTORY", "SUCCESS", f"Ustvarjen direktorij: {directory}")
                
        except Exception as e:
            self.log_action("CREATE_DIRECTORIES", "ERROR", str(e))
    
    def create_production_config(self):
        """Ustvari produkcijsko konfiguracijo"""
        try:
            prod_config = {
                "omni_brain": {
                    "mode": "production",
                    "debug": False,
                    "log_level": "INFO",
                    "auto_restart": True,
                    "max_memory_mb": 2048,
                    "max_cpu_percent": 80
                },
                "modules": {
                    "finance": {"enabled": True, "priority": "high"},
                    "tourism": {"enabled": True, "priority": "high"},
                    "iot": {"enabled": True, "priority": "medium"},
                    "radio": {"enabled": True, "priority": "low"},
                    "beekeeping": {"enabled": True, "priority": "medium"},
                    "devops": {"enabled": True, "priority": "high"},
                    "healthcare": {"enabled": True, "priority": "high"}
                },
                "cloud_memory": {
                    "redis_enabled": True,
                    "sqlite_enabled": True,
                    "compression": True,
                    "auto_backup": True,
                    "backup_interval_hours": 6,
                    "cleanup_old_data_days": 30
                },
                "mobile_terminal": {
                    "enabled": True,
                    "port": 8080,
                    "ssl_enabled": False,
                    "max_connections": 10
                },
                "learning_optimization": {
                    "enabled": True,
                    "auto_learn": True,
                    "optimization_interval_hours": 24,
                    "model_validation": True
                },
                "monitoring": {
                    "enabled": True,
                    "metrics_collection": True,
                    "alert_thresholds": {
                        "cpu_percent": 90,
                        "memory_percent": 85,
                        "disk_percent": 90
                    }
                },
                "security": {
                    "authentication_required": True,
                    "api_key_required": True,
                    "rate_limiting": True,
                    "audit_logging": True
                }
            }
            
            with open("production/config/omni_production.json", 'w', encoding='utf-8') as f:
                json.dump(prod_config, f, indent=2, ensure_ascii=False)
            
            self.log_action("CREATE_PROD_CONFIG", "SUCCESS", "Produkcijska konfiguracija ustvarjena")
            
        except Exception as e:
            self.log_action("CREATE_PROD_CONFIG", "ERROR", str(e))
    
    def create_startup_scripts(self):
        """Ustvari skripte za zagon sistema"""
        try:
            # Windows startup script
            windows_script = """@echo off
echo Starting Omni Supermozg...
cd /d "%~dp0"

echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)

echo Starting Omni Brain Core...
start "Omni Brain" python omni_brain_core.py

timeout /t 3 /nobreak > nul

echo Starting Cloud Memory...
start "Cloud Memory" python omni_cloud_memory.py

timeout /t 2 /nobreak > nul

echo Starting Mobile Terminal...
start "Mobile Terminal" python omni_mobile_terminal.py

timeout /t 2 /nobreak > nul

echo Starting Learning Optimization...
start "Learning" python omni_learning_optimization.py

echo Omni Supermozg started successfully!
echo Check the individual windows for status.
pause
"""
            
            with open("production/start_omni.bat", 'w', encoding='utf-8') as f:
                f.write(windows_script)
            
            # Python startup script
            python_script = """#!/usr/bin/env python3
import subprocess
import time
import sys
import os

def start_omni_system():
    print("🚀 Starting Omni Supermozg Production System...")
    
    components = [
        ("Omni Brain Core", "omni_brain_core.py"),
        ("Module Connectors", "omni_module_connectors.py"),
        ("Cloud Memory", "omni_cloud_memory.py"),
        ("Mobile Terminal", "omni_mobile_terminal.py"),
        ("Learning Optimization", "omni_learning_optimization.py"),
        ("System Integration", "omni_system_integration.py")
    ]
    
    processes = []
    
    for name, script in components:
        try:
            print(f"Starting {name}...")
            if os.path.exists(script):
                proc = subprocess.Popen([sys.executable, script])
                processes.append((name, proc))
                time.sleep(2)  # Wait between starts
            else:
                print(f"WARNING: {script} not found!")
        except Exception as e:
            print(f"ERROR starting {name}: {e}")
    
    print(f"✅ Started {len(processes)} components")
    return processes

if __name__ == "__main__":
    start_omni_system()
"""
            
            with open("production/start_omni.py", 'w', encoding='utf-8') as f:
                f.write(python_script)
            
            self.log_action("CREATE_STARTUP_SCRIPTS", "SUCCESS", "Startup skripti ustvarjeni")
            
        except Exception as e:
            self.log_action("CREATE_STARTUP_SCRIPTS", "ERROR", str(e))
    
    def create_monitoring_system(self):
        """Ustvari sistem za monitoring"""
        try:
            monitoring_script = """#!/usr/bin/env python3
import psutil
import time
import json
import datetime
import sqlite3

class OmniMonitor:
    def __init__(self):
        self.init_database()
    
    def init_database(self):
        conn = sqlite3.connect('production/monitoring/omni_monitor.db')
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                cpu_percent REAL,
                memory_percent REAL,
                disk_percent REAL,
                network_bytes_sent INTEGER,
                network_bytes_recv INTEGER
            )
        ''')
        conn.commit()
        conn.close()
    
    def collect_metrics(self):
        cpu = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('.')
        network = psutil.net_io_counters()
        
        metrics = {
            'timestamp': datetime.datetime.now().isoformat(),
            'cpu_percent': cpu,
            'memory_percent': memory.percent,
            'disk_percent': (disk.used / disk.total) * 100,
            'network_bytes_sent': network.bytes_sent,
            'network_bytes_recv': network.bytes_recv
        }
        
        # Save to database
        conn = sqlite3.connect('production/monitoring/omni_monitor.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO system_metrics 
            (timestamp, cpu_percent, memory_percent, disk_percent, network_bytes_sent, network_bytes_recv)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (metrics['timestamp'], metrics['cpu_percent'], metrics['memory_percent'],
              metrics['disk_percent'], metrics['network_bytes_sent'], metrics['network_bytes_recv']))
        conn.commit()
        conn.close()
        
        return metrics
    
    def run_monitoring(self, interval=60):
        print("🔍 Starting Omni System Monitoring...")
        while True:
            try:
                metrics = self.collect_metrics()
                print(f"[{metrics['timestamp']}] CPU: {metrics['cpu_percent']:.1f}% | "
                      f"RAM: {metrics['memory_percent']:.1f}% | "
                      f"Disk: {metrics['disk_percent']:.1f}%")
                
                # Check thresholds
                if metrics['cpu_percent'] > 90:
                    print("⚠️ HIGH CPU USAGE ALERT!")
                if metrics['memory_percent'] > 85:
                    print("⚠️ HIGH MEMORY USAGE ALERT!")
                if metrics['disk_percent'] > 90:
                    print("⚠️ HIGH DISK USAGE ALERT!")
                
                time.sleep(interval)
            except KeyboardInterrupt:
                print("Monitoring stopped.")
                break
            except Exception as e:
                print(f"Monitoring error: {e}")
                time.sleep(interval)

if __name__ == "__main__":
    monitor = OmniMonitor()
    monitor.run_monitoring()
"""
            
            with open("production/monitoring/omni_monitor.py", 'w', encoding='utf-8') as f:
                f.write(monitoring_script)
            
            self.log_action("CREATE_MONITORING", "SUCCESS", "Monitoring sistem ustvarjen")
            
        except Exception as e:
            self.log_action("CREATE_MONITORING", "ERROR", str(e))
    
    def create_backup_system(self):
        """Ustvari sistem za varnostne kopije"""
        try:
            backup_script = """#!/usr/bin/env python3
import os
import shutil
import datetime
import zipfile
import json

class OmniBackup:
    def __init__(self):
        self.backup_dir = "production/backups"
        os.makedirs(self.backup_dir, exist_ok=True)
    
    def create_backup(self):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"omni_backup_{timestamp}"
        backup_path = os.path.join(self.backup_dir, f"{backup_name}.zip")
        
        print(f"Creating backup: {backup_name}")
        
        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Backup databases
            for db_file in ["finance.db", "tourism.db", "devops.db", "omni_analytics.db", "omni_multitenant.db"]:
                if os.path.exists(db_file):
                    zipf.write(db_file, f"databases/{db_file}")
            
            # Backup configuration files
            config_files = ["config.json", "metadata.json"]
            for config_file in config_files:
                if os.path.exists(config_file):
                    zipf.write(config_file, f"config/{config_file}")
            
            # Backup data directory
            if os.path.exists("data"):
                for root, dirs, files in os.walk("data"):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, ".")
                        zipf.write(file_path, arcname)
            
            # Backup production config
            if os.path.exists("production/config"):
                for root, dirs, files in os.walk("production/config"):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, ".")
                        zipf.write(file_path, arcname)
        
        # Create backup manifest
        manifest = {
            "backup_name": backup_name,
            "timestamp": datetime.datetime.now().isoformat(),
            "backup_path": backup_path,
            "size_mb": round(os.path.getsize(backup_path) / (1024*1024), 2)
        }
        
        manifest_path = os.path.join(self.backup_dir, f"{backup_name}_manifest.json")
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Backup created: {backup_path} ({manifest['size_mb']} MB)")
        return backup_path
    
    def cleanup_old_backups(self, keep_days=7):
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=keep_days)
        
        for filename in os.listdir(self.backup_dir):
            if filename.startswith("omni_backup_") and filename.endswith(".zip"):
                file_path = os.path.join(self.backup_dir, filename)
                file_time = datetime.datetime.fromtimestamp(os.path.getctime(file_path))
                
                if file_time < cutoff_date:
                    os.remove(file_path)
                    # Also remove manifest
                    manifest_file = filename.replace(".zip", "_manifest.json")
                    manifest_path = os.path.join(self.backup_dir, manifest_file)
                    if os.path.exists(manifest_path):
                        os.remove(manifest_path)
                    print(f"🗑️ Removed old backup: {filename}")

if __name__ == "__main__":
    backup = OmniBackup()
    backup.create_backup()
    backup.cleanup_old_backups()
"""
            
            with open("production/backups/omni_backup.py", 'w', encoding='utf-8') as f:
                f.write(backup_script)
            
            self.log_action("CREATE_BACKUP_SYSTEM", "SUCCESS", "Backup sistem ustvarjen")
            
        except Exception as e:
            self.log_action("CREATE_BACKUP_SYSTEM", "ERROR", str(e))
    
    def install_dependencies(self):
        """Namesti potrebne odvisnosti"""
        try:
            requirements = [
                "psutil>=5.8.0",
                "websockets>=10.0",
                "redis>=4.0.0",
                "tkinter",  # Usually built-in
                "sqlite3",  # Built-in
                "json",     # Built-in
                "datetime", # Built-in
                "pathlib"   # Built-in
            ]
            
            # Create requirements.txt
            with open("production/requirements.txt", 'w') as f:
                f.write("\n".join(requirements))
            
            self.log_action("CREATE_REQUIREMENTS", "SUCCESS", "Requirements.txt ustvarjen")
            
            # Try to install psutil (most important external dependency)
            try:
                import psutil
                self.log_action("CHECK_PSUTIL", "SUCCESS", "psutil je na voljo")
            except ImportError:
                self.log_action("CHECK_PSUTIL", "WARNING", "psutil ni nameščen - potrebna namestitev")
            
        except Exception as e:
            self.log_action("INSTALL_DEPENDENCIES", "ERROR", str(e))
    
    def create_documentation(self):
        """Ustvari dokumentacijo za produkcijo"""
        try:
            readme_content = """# Omni Supermozg - Produkcijska Namestitev

## Pregled
Omni supermozg je napredna AI platforma za avtonomno delovanje z integriranimi moduli za finance, turizem, IoT, radio, čebelarstvo, DevOps in zdravstvo.

## Sistemske Zahteve
- Python 3.8+
- Windows 10/11 ali Linux
- Najmanj 4GB RAM
- 10GB prostora na disku
- Internetna povezava

## Namestitev

### 1. Priprava okolja
```bash
# Namestite Python odvisnosti
pip install -r production/requirements.txt
```

### 2. Zagon sistema
```bash
# Windows
production/start_omni.bat

# Linux/Mac
python production/start_omni.py
```

### 3. Preverjanje statusa
```bash
python omni_system_report.py
```

## Komponente Sistema

### Omni Brain Core
- Centralni krmilni center
- AI orchestrator
- Upravljanje modulov

### AI Moduli
- Finance: Finančna analitika in napovedovanje
- Turizem: Upravljanje turističnih storitev
- IoT: Internet stvari in senzorji
- Radio: Komunikacijske storitve
- Čebelarstvo: Upravljanje čebeljih družin
- DevOps: Avtomatizacija IT procesov
- Zdravstvo: Zdravstvena analitika

### Oblačni Pomnilnik
- Redis za hitro predpomnjenje
- SQLite za trajno shranjevanje
- Avtomatsko varnostno kopiranje

### Mobilni Terminal
- Grafični uporabniški vmesnik
- WebSocket komunikacija
- Real-time monitoring

### Učenje in Optimizacija
- Avtomatsko zaznavanje vzorcev
- Optimizacija algoritmov
- Validacija modelov

## Monitoring in Vzdrževanje

### Monitoring
```bash
python production/monitoring/omni_monitor.py
```

### Varnostne Kopije
```bash
python production/backups/omni_backup.py
```

### Generiranje Poročil
```bash
python omni_system_report.py
```

## Konfiguracija
Glavna konfiguracija se nahaja v `production/config/omni_production.json`

## Varnost
- Avtentifikacija uporabnikov
- API ključi
- Audit logging
- Rate limiting

## Podpora
Za tehnično podporo kontaktirajte sistemskega administratorja.
"""
            
            with open("production/README.md", 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            self.log_action("CREATE_DOCUMENTATION", "SUCCESS", "Dokumentacija ustvarjena")
            
        except Exception as e:
            self.log_action("CREATE_DOCUMENTATION", "ERROR", str(e))
    
    def run_full_setup(self):
        """Izvede celotno nastavitev za produkcijo"""
        print("🚀 Začenjam pripravo Omni supermozga za produkcijo...")
        
        self.log_action("SETUP_START", "INFO", "Začetek produkcijske nastavitve")
        
        # Izvedi vse korake
        self.create_production_directories()
        self.create_production_config()
        self.create_startup_scripts()
        self.create_monitoring_system()
        self.create_backup_system()
        self.install_dependencies()
        self.create_documentation()
        
        # Shrani setup log
        setup_log_file = f"production/logs/setup_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(setup_log_file, 'w', encoding='utf-8') as f:
            json.dump(self.setup_log, f, indent=2, ensure_ascii=False)
        
        self.log_action("SETUP_COMPLETE", "SUCCESS", f"Setup log shranjen v: {setup_log_file}")
        
        # Prikaži povzetek
        self.print_setup_summary()
    
    def print_setup_summary(self):
        """Prikaži povzetek nastavitve"""
        print("\n" + "="*80)
        print("✅ OMNI SUPERMOZG - PRODUKCIJSKA NASTAVITEV DOKONČANA")
        print("="*80)
        
        success_count = sum(1 for log in self.setup_log if log["status"] == "SUCCESS")
        error_count = sum(1 for log in self.setup_log if log["status"] == "ERROR")
        warning_count = sum(1 for log in self.setup_log if log["status"] == "WARNING")
        
        print(f"\n📊 STATISTIKA:")
        print(f"   ✅ Uspešne akcije: {success_count}")
        print(f"   ⚠️ Opozorila: {warning_count}")
        print(f"   ❌ Napake: {error_count}")
        
        print(f"\n📁 USTVARJENE DATOTEKE:")
        print(f"   📂 production/ - Glavna produkcijska mapa")
        print(f"   🚀 start_omni.bat - Windows startup skripta")
        print(f"   🐍 start_omni.py - Python startup skripta")
        print(f"   🔍 omni_monitor.py - Monitoring sistem")
        print(f"   💾 omni_backup.py - Backup sistem")
        print(f"   📋 README.md - Dokumentacija")
        
        print(f"\n🚀 NASLEDNJI KORAKI:")
        print(f"   1. Preverite sistemsko poročilo: python omni_system_report.py")
        print(f"   2. Zaženite sistem: production/start_omni.bat")
        print(f"   3. Preverite monitoring: python production/monitoring/omni_monitor.py")
        print(f"   4. Ustvarite prvo varnostno kopijo: python production/backups/omni_backup.py")
        
        if error_count > 0:
            print(f"\n⚠️ OPOZORILO: {error_count} napak med nastavitvijo!")
            print(f"   Preverite setup log za podrobnosti.")
        
        print("\n" + "="*80)

def main():
    """Glavna funkcija"""
    setup = OmniProductionSetup()
    setup.run_full_setup()

if __name__ == "__main__":
    main()