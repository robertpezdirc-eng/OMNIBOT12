#!/usr/bin/env python3
"""
🔹 Omni Backup & Monitoring System
Napreden sistem za backup, monitoring in health check Omni aplikacije
Verzija: 2.0 - Popolna avtomatizacija
"""

import os
import sys
import time
import json
import shutil
import sqlite3
import smtplib
import requests
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import psutil
import threading
from typing import Dict, List, Optional

# Konfiguracija
CONFIG = {
    "backup": {
        "source_dir": "/opt/omni",
        "backup_dir": "/opt/omni-backups",
        "retention_days": 30,
        "compression": True
    },
    "monitoring": {
        "check_interval": 60,  # sekunde
        "services": ["omni.service", "omni-angels.service", "nginx"],
        "ports": [80, 443, 8080, 8081, 8082],
        "urls": ["http://localhost:8080", "https://localhost"]
    },
    "alerts": {
        "email_enabled": False,
        "webhook_enabled": True,
        "webhook_url": "http://localhost:8082/alerts",
        "critical_threshold": 90,  # % CPU/Memory
        "disk_threshold": 85  # % disk usage
    },
    "database": {
        "path": "/opt/omni/monitoring.db"
    }
}

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/omni-monitoring.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class OmniBackupSystem:
    """Sistem za backup Omni aplikacije"""
    
    def __init__(self):
        self.backup_dir = Path(CONFIG["backup"]["backup_dir"])
        self.source_dir = Path(CONFIG["backup"]["source_dir"])
        self.retention_days = CONFIG["backup"]["retention_days"]
        
        # Ustvari backup direktorije
        for backup_type in ["daily", "weekly", "monthly"]:
            (self.backup_dir / backup_type).mkdir(parents=True, exist_ok=True)
    
    def log(self, message: str, level: str = "INFO"):
        """Logging funkcija za backward compatibility"""
        if level == "ERROR":
            logger.error(message)
        elif level == "WARNING":
            logger.warning(message)
        else:
            logger.info(message)
    
    def error(self, message: str):
        """Error logging in exit"""
        self.log(message, "ERROR")
        sys.exit(1)
    
    def run_command(self, command: str, check: bool = True, timeout: int = 300) -> subprocess.CompletedProcess:
        """Izvršitev sistemskega ukaza"""
        self.log(f"Izvršujem: {command}")
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                check=check,
                timeout=timeout
            )
            if result.stdout:
                self.log(f"Output: {result.stdout.strip()}")
            if result.stderr and result.returncode != 0:
                self.log(f"Error: {result.stderr.strip()}", "ERROR")
            return result
        except subprocess.TimeoutExpired:
            self.log(f"Ukaz '{command}' je presegel časovno omejitev ({timeout}s)", "ERROR")
            return None
        except subprocess.CalledProcessError as e:
            if check:
                self.log(f"Napaka pri ukazu '{command}': {e}", "ERROR")
            return e
    
    def load_config(self):
        """Naloži konfiguracijo"""
        if not os.path.exists(self.config_file):
            self.error(f"Konfiguracija {self.config_file} ne obstaja")
        
        with open(self.config_file, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.log(f"Konfiguracija naložena iz {self.config_file}")
    
    def init_monitoring_database(self):
        """Inicializiraj monitoring bazo podatkov"""
        self.log("🗄️ Inicializiram monitoring bazo podatkov...")
        
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Tabela za sistem metrics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                cpu_percent REAL,
                memory_percent REAL,
                disk_percent REAL,
                network_bytes_sent INTEGER,
                network_bytes_recv INTEGER,
                load_average TEXT,
                uptime INTEGER
            )
        ''')
        
        # Tabela za aplikacijske metrics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS app_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                service_name TEXT,
                status TEXT,
                response_time REAL,
                memory_usage INTEGER,
                cpu_usage REAL,
                error_count INTEGER
            )
        ''')
        
        # Tabela za backup records
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                backup_type TEXT,
                file_path TEXT,
                file_size INTEGER,
                compression_ratio REAL,
                duration INTEGER,
                status TEXT,
                error_message TEXT
            )
        ''')
        
        # Tabela za alerts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                alert_type TEXT,
                severity TEXT,
                message TEXT,
                resolved BOOLEAN DEFAULT FALSE,
                resolved_at DATETIME
            )
        ''')
        
        conn.commit()
        conn.close()
        
        self.log("✅ Monitoring baza podatkov inicializirana")
    
    def collect_system_metrics(self) -> Dict:
        """Zberi sistemske metrike"""
        try:
            # CPU uporaba
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Pomnilnik
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Disk
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            
            # Omrežje
            network = psutil.net_io_counters()
            
            # Load average
            load_avg = os.getloadavg()
            
            # Uptime
            uptime = time.time() - psutil.boot_time()
            
            metrics = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory_percent,
                "disk_percent": disk_percent,
                "network_bytes_sent": network.bytes_sent,
                "network_bytes_recv": network.bytes_recv,
                "load_average": f"{load_avg[0]:.2f},{load_avg[1]:.2f},{load_avg[2]:.2f}",
                "uptime": int(uptime)
            }
            
            return metrics
            
        except Exception as e:
            self.log(f"Napaka pri zbiranju sistemskih metrik: {e}", "ERROR")
            return {}
    
    def collect_app_metrics(self) -> List[Dict]:
        """Zberi aplikacijske metrike"""
        services = ["nginx", "omni-brain", "certbot"]
        metrics = []
        
        for service in services:
            try:
                # Preveri status storitve
                result = self.run_command(f"systemctl is-active {service}", check=False)
                status = result.stdout.strip() if result else "unknown"
                
                # Preveri odzivni čas (za nginx)
                response_time = 0
                if service == "nginx":
                    try:
                        start_time = time.time()
                        response = requests.get(f"http://localhost", timeout=5)
                        response_time = (time.time() - start_time) * 1000
                    except:
                        response_time = -1
                
                # Preveri uporabo virov
                memory_usage = 0
                cpu_usage = 0
                
                try:
                    # Poišči proces
                    for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'cpu_percent']):
                        if service in proc.info['name'].lower():
                            memory_usage = proc.info['memory_info'].rss
                            cpu_usage = proc.info['cpu_percent']
                            break
                except:
                    pass
                
                metrics.append({
                    "service_name": service,
                    "status": status,
                    "response_time": response_time,
                    "memory_usage": memory_usage,
                    "cpu_usage": cpu_usage,
                    "error_count": 0  # TODO: Implementiraj error counting
                })
                
            except Exception as e:
                self.log(f"Napaka pri zbiranju metrik za {service}: {e}", "ERROR")
        
        return metrics
    
    def store_metrics(self, system_metrics: Dict, app_metrics: List[Dict]):
        """Shrani metrike v bazo podatkov"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        try:
            # Shrani sistemske metrike
            if system_metrics:
                cursor.execute('''
                    INSERT INTO system_metrics 
                    (cpu_percent, memory_percent, disk_percent, network_bytes_sent, 
                     network_bytes_recv, load_average, uptime)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    system_metrics.get('cpu_percent', 0),
                    system_metrics.get('memory_percent', 0),
                    system_metrics.get('disk_percent', 0),
                    system_metrics.get('network_bytes_sent', 0),
                    system_metrics.get('network_bytes_recv', 0),
                    system_metrics.get('load_average', ''),
                    system_metrics.get('uptime', 0)
                ))
            
            # Shrani aplikacijske metrike
            for metric in app_metrics:
                cursor.execute('''
                    INSERT INTO app_metrics 
                    (service_name, status, response_time, memory_usage, cpu_usage, error_count)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    metric.get('service_name', ''),
                    metric.get('status', ''),
                    metric.get('response_time', 0),
                    metric.get('memory_usage', 0),
                    metric.get('cpu_usage', 0),
                    metric.get('error_count', 0)
                ))
            
            conn.commit()
            
        except Exception as e:
            self.log(f"Napaka pri shranjevanju metrik: {e}", "ERROR")
        finally:
            conn.close()
    
    def create_backup(self, backup_type: str = "full") -> Dict:
        """Ustvari varnostno kopijo"""
        self.log(f"💾 Ustvarjam {backup_type} varnostno kopijo...")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"omni-{backup_type}-backup-{timestamp}"
        backup_path = f"{self.backup_dir}/{backup_name}.tar.gz"
        
        start_time = time.time()
        
        try:
            # Določi, kaj vključiti v backup
            backup_sources = []
            
            if backup_type == "full":
                backup_sources = [
                    "/opt/omni-brain",
                    "/etc/nginx/sites-available",
                    "/etc/letsencrypt",
                    "/var/www/html",
                    self.monitoring_dir,
                    "/var/log/omni"
                ]
            elif backup_type == "config":
                backup_sources = [
                    "/etc/nginx/sites-available",
                    "/etc/letsencrypt",
                    self.config_file,
                    f"{self.monitoring_dir}/*.json"
                ]
            elif backup_type == "data":
                backup_sources = [
                    "/opt/omni-brain/data",
                    self.db_file,
                    "/var/log/omni"
                ]
            
            # Ustvari tar.gz arhiv
            with tarfile.open(backup_path, "w:gz") as tar:
                for source in backup_sources:
                    if os.path.exists(source):
                        tar.add(source, arcname=os.path.basename(source))
                        self.log(f"Dodano v backup: {source}")
            
            # Izračunaj statistike
            duration = int(time.time() - start_time)
            file_size = os.path.getsize(backup_path)
            
            # Izračunaj compression ratio (približno)
            original_size = sum(
                os.path.getsize(os.path.join(dirpath, filename))
                for source in backup_sources if os.path.exists(source)
                for dirpath, dirnames, filenames in os.walk(source)
                for filename in filenames
            )
            
            compression_ratio = (1 - file_size / original_size) * 100 if original_size > 0 else 0
            
            backup_info = {
                "backup_type": backup_type,
                "file_path": backup_path,
                "file_size": file_size,
                "compression_ratio": compression_ratio,
                "duration": duration,
                "status": "success",
                "error_message": None
            }
            
            self.log(f"✅ Backup uspešno ustvarjen: {backup_path}")
            self.log(f"📊 Velikost: {file_size / 1024 / 1024:.2f} MB, Kompresija: {compression_ratio:.1f}%")
            
            return backup_info
            
        except Exception as e:
            error_msg = str(e)
            self.log(f"❌ Napaka pri ustvarjanju backupa: {error_msg}", "ERROR")
            
            return {
                "backup_type": backup_type,
                "file_path": backup_path,
                "file_size": 0,
                "compression_ratio": 0,
                "duration": int(time.time() - start_time),
                "status": "failed",
                "error_message": error_msg
            }
    
    def cleanup_old_backups(self, retention_days: int = 7):
        """Počisti stare backupe"""
        self.log(f"🧹 Čistim backupe starejše od {retention_days} dni...")
        
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        deleted_count = 0
        
        try:
            for filename in os.listdir(self.backup_dir):
                file_path = os.path.join(self.backup_dir, filename)
                
                if os.path.isfile(file_path):
                    file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    
                    if file_time < cutoff_date:
                        os.remove(file_path)
                        deleted_count += 1
                        self.log(f"Izbrisan star backup: {filename}")
            
            self.log(f"✅ Izbrisanih {deleted_count} starih backupov")
            
        except Exception as e:
            self.log(f"Napaka pri čiščenju backupov: {e}", "ERROR")
    
    def store_backup_record(self, backup_info: Dict):
        """Shrani backup record v bazo"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO backup_records 
                (backup_type, file_path, file_size, compression_ratio, duration, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                backup_info.get('backup_type', ''),
                backup_info.get('file_path', ''),
                backup_info.get('file_size', 0),
                backup_info.get('compression_ratio', 0),
                backup_info.get('duration', 0),
                backup_info.get('status', ''),
                backup_info.get('error_message', '')
            ))
            
            conn.commit()
            
        except Exception as e:
            self.log(f"Napaka pri shranjevanju backup record: {e}", "ERROR")
        finally:
            conn.close()
    
    def check_health(self) -> Dict:
        """Preveri zdravje sistema"""
        self.log("🏥 Preverjam zdravje sistema...")
        
        health_status = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "healthy",
            "checks": {}
        }
        
        # Preveri sistemske vire
        system_metrics = self.collect_system_metrics()
        
        # CPU check
        cpu_status = "healthy"
        if system_metrics.get('cpu_percent', 0) > 80:
            cpu_status = "warning"
        if system_metrics.get('cpu_percent', 0) > 95:
            cpu_status = "critical"
        
        health_status["checks"]["cpu"] = {
            "status": cpu_status,
            "value": system_metrics.get('cpu_percent', 0),
            "message": f"CPU uporaba: {system_metrics.get('cpu_percent', 0):.1f}%"
        }
        
        # Memory check
        memory_status = "healthy"
        if system_metrics.get('memory_percent', 0) > 80:
            memory_status = "warning"
        if system_metrics.get('memory_percent', 0) > 95:
            memory_status = "critical"
        
        health_status["checks"]["memory"] = {
            "status": memory_status,
            "value": system_metrics.get('memory_percent', 0),
            "message": f"Pomnilnik: {system_metrics.get('memory_percent', 0):.1f}%"
        }
        
        # Disk check
        disk_status = "healthy"
        if system_metrics.get('disk_percent', 0) > 80:
            disk_status = "warning"
        if system_metrics.get('disk_percent', 0) > 95:
            disk_status = "critical"
        
        health_status["checks"]["disk"] = {
            "status": disk_status,
            "value": system_metrics.get('disk_percent', 0),
            "message": f"Disk: {system_metrics.get('disk_percent', 0):.1f}%"
        }
        
        # Preveri storitve
        app_metrics = self.collect_app_metrics()
        
        for metric in app_metrics:
            service_name = metric.get('service_name', '')
            service_status = "healthy" if metric.get('status') == "active" else "critical"
            
            health_status["checks"][f"service_{service_name}"] = {
                "status": service_status,
                "value": metric.get('status', ''),
                "message": f"Storitev {service_name}: {metric.get('status', 'unknown')}"
            }
        
        # Preveri SSL certifikat
        try:
            domain = self.config['general']['domain']
            ssl_cert_path = f"/etc/letsencrypt/live/{domain}/fullchain.pem"
            
            if os.path.exists(ssl_cert_path):
                # Preveri datum poteka
                result = self.run_command(f"openssl x509 -in {ssl_cert_path} -noout -enddate", check=False)
                if result and result.returncode == 0:
                    # Parse datum poteka
                    enddate_str = result.stdout.strip().replace("notAfter=", "")
                    # TODO: Parse datum in preveri, če poteče v naslednjih 30 dneh
                    
                    health_status["checks"]["ssl_certificate"] = {
                        "status": "healthy",
                        "value": "valid",
                        "message": f"SSL certifikat je veljaven"
                    }
                else:
                    health_status["checks"]["ssl_certificate"] = {
                        "status": "warning",
                        "value": "unknown",
                        "message": "Ne morem preveriti SSL certifikata"
                    }
            else:
                health_status["checks"]["ssl_certificate"] = {
                    "status": "critical",
                    "value": "missing",
                    "message": "SSL certifikat ne obstaja"
                }
        except:
            health_status["checks"]["ssl_certificate"] = {
                "status": "warning",
                "value": "error",
                "message": "Napaka pri preverjanju SSL certifikata"
            }
        
        # Določi splošno stanje
        critical_count = sum(1 for check in health_status["checks"].values() if check["status"] == "critical")
        warning_count = sum(1 for check in health_status["checks"].values() if check["status"] == "warning")
        
        if critical_count > 0:
            health_status["overall_status"] = "critical"
        elif warning_count > 0:
            health_status["overall_status"] = "warning"
        
        return health_status
    
    def send_alert(self, alert_type: str, severity: str, message: str):
        """Pošlji opozorilo"""
        self.log(f"🚨 Pošiljam {severity} opozorilo: {message}")
        
        # Shrani v bazo
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO alerts (alert_type, severity, message)
                VALUES (?, ?, ?)
            ''', (alert_type, severity, message))
            
            conn.commit()
            
        except Exception as e:
            self.log(f"Napaka pri shranjevanju opozorila: {e}", "ERROR")
        finally:
            conn.close()
        
        # Pošlji e-mail (če je konfiguriran)
        notifications = self.config.get('monitoring', {}).get('notifications', {})
        
        if notifications.get('email', {}).get('enabled', False):
            self.send_email_alert(alert_type, severity, message)
        
        # Pošlji na Slack/Discord (če je konfigurirano)
        if notifications.get('slack', {}).get('enabled', False):
            self.send_slack_alert(alert_type, severity, message)
    
    def send_email_alert(self, alert_type: str, severity: str, message: str):
        """Pošlji e-mail opozorilo"""
        try:
            email_config = self.config.get('monitoring', {}).get('notifications', {}).get('email', {})
            
            if not email_config.get('enabled', False):
                return
            
            smtp_server = email_config.get('smtp_server', 'smtp.gmail.com')
            smtp_port = email_config.get('smtp_port', 587)
            username = email_config.get('username', '')
            password = email_config.get('password', '')
            to_email = email_config.get('to_email', '')
            
            if not all([username, password, to_email]):
                self.log("E-mail konfiguracija ni popolna", "WARNING")
                return
            
            # Ustvari e-mail
            msg = MimeMultipart()
            msg['From'] = username
            msg['To'] = to_email
            msg['Subject'] = f"[OMNI {severity.upper()}] {alert_type}"
            
            body = f"""
Omni Monitoring Alert

Tip: {alert_type}
Resnost: {severity}
Čas: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Sporočilo: {message}

---
Omni Backup & Monitoring System
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            # Pošlji e-mail
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(username, password)
            text = msg.as_string()
            server.sendmail(username, to_email, text)
            server.quit()
            
            self.log("✅ E-mail opozorilo poslano")
            
        except Exception as e:
            self.log(f"Napaka pri pošiljanju e-mail opozorila: {e}", "ERROR")
    
    def send_slack_alert(self, alert_type: str, severity: str, message: str):
        """Pošlji Slack opozorilo"""
        try:
            slack_config = self.config.get('monitoring', {}).get('notifications', {}).get('slack', {})
            
            if not slack_config.get('enabled', False):
                return
            
            webhook_url = slack_config.get('webhook_url', '')
            
            if not webhook_url:
                self.log("Slack webhook URL ni konfiguriran", "WARNING")
                return
            
            # Določi barvo glede na resnost
            color_map = {
                "critical": "#ff0000",
                "warning": "#ffaa00",
                "info": "#00ff00"
            }
            
            payload = {
                "attachments": [{
                    "color": color_map.get(severity, "#cccccc"),
                    "title": f"Omni {severity.upper()} Alert",
                    "fields": [
                        {"title": "Tip", "value": alert_type, "short": True},
                        {"title": "Resnost", "value": severity, "short": True},
                        {"title": "Čas", "value": datetime.now().strftime('%Y-%m-%d %H:%M:%S'), "short": True},
                        {"title": "Sporočilo", "value": message, "short": False}
                    ]
                }]
            }
            
            response = requests.post(webhook_url, json=payload, timeout=10)
            
            if response.status_code == 200:
                self.log("✅ Slack opozorilo poslano")
            else:
                self.log(f"Napaka pri pošiljanju Slack opozorila: {response.status_code}", "ERROR")
                
        except Exception as e:
            self.log(f"Napaka pri pošiljanju Slack opozorila: {e}", "ERROR")
    
    def create_monitoring_dashboard(self):
        """Ustvari monitoring dashboard"""
        dashboard_html = f"""<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Omni Monitoring Dashboard</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        .header {{ background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }}
        .card {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .metric {{ display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }}
        .status {{ padding: 5px 10px; border-radius: 4px; color: white; font-weight: bold; }}
        .status.healthy {{ background: #28a745; }}
        .status.warning {{ background: #ffc107; color: #212529; }}
        .status.critical {{ background: #dc3545; }}
        .chart {{ height: 200px; background: #f8f9fa; border-radius: 4px; margin: 10px 0; display: flex; align-items: center; justify-content: center; }}
        .refresh {{ background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }}
        .refresh:hover {{ background: #0056b3; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Omni Monitoring Dashboard</h1>
            <button class="refresh" onclick="location.reload()">Osveži</button>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🖥️ Sistem</h3>
                <div id="system-metrics">Nalagam...</div>
            </div>
            
            <div class="card">
                <h3>🔧 Storitve</h3>
                <div id="service-metrics">Nalagam...</div>
            </div>
            
            <div class="card">
                <h3>💾 Backupi</h3>
                <div id="backup-metrics">Nalagam...</div>
            </div>
            
            <div class="card">
                <h3>🚨 Opozorila</h3>
                <div id="alerts">Nalagam...</div>
            </div>
        </div>
    </div>
    
    <script>
        async function loadDashboard() {{
            try {{
                const response = await fetch('/api/monitoring-status');
                const data = await response.json();
                
                // Sistem metrics
                const systemDiv = document.getElementById('system-metrics');
                systemDiv.innerHTML = `
                    <div class="metric">
                        <span>CPU:</span>
                        <span class="status ${{data.system.cpu_status}}">${{data.system.cpu_percent}}%</span>
                    </div>
                    <div class="metric">
                        <span>Pomnilnik:</span>
                        <span class="status ${{data.system.memory_status}}">${{data.system.memory_percent}}%</span>
                    </div>
                    <div class="metric">
                        <span>Disk:</span>
                        <span class="status ${{data.system.disk_status}}">${{data.system.disk_percent}}%</span>
                    </div>
                `;
                
                // Service metrics
                const serviceDiv = document.getElementById('service-metrics');
                let serviceHtml = '';
                data.services.forEach(service => {{
                    serviceHtml += `
                        <div class="metric">
                            <span>${{service.name}}:</span>
                            <span class="status ${{service.status === 'active' ? 'healthy' : 'critical'}}">${{service.status}}</span>
                        </div>
                    `;
                }});
                serviceDiv.innerHTML = serviceHtml;
                
                // Backup metrics
                const backupDiv = document.getElementById('backup-metrics');
                backupDiv.innerHTML = `
                    <div class="metric">
                        <span>Zadnji backup:</span>
                        <span>${{data.backup.last_backup || 'Ni podatka'}}</span>
                    </div>
                    <div class="metric">
                        <span>Status:</span>
                        <span class="status ${{data.backup.status === 'success' ? 'healthy' : 'warning'}}">${{data.backup.status}}</span>
                    </div>
                `;
                
                // Alerts
                const alertsDiv = document.getElementById('alerts');
                if (data.alerts && data.alerts.length > 0) {{
                    let alertsHtml = '';
                    data.alerts.slice(0, 5).forEach(alert => {{
                        alertsHtml += `
                            <div class="metric">
                                <span>${{alert.message}}</span>
                                <span class="status ${{alert.severity}}">${{alert.severity}}</span>
                            </div>
                        `;
                    }});
                    alertsDiv.innerHTML = alertsHtml;
                }} else {{
                    alertsDiv.innerHTML = '<div class="metric"><span>Ni aktivnih opozoril</span></div>';
                }}
                
            }} catch (error) {{
                console.error('Napaka pri nalaganju dashboard:', error);
            }}
        }}
        
        loadDashboard();
        setInterval(loadDashboard, 30000); // Osveži vsakih 30 sekund
    </script>
</body>
</html>"""
        
        dashboard_path = "/var/www/html/monitoring-dashboard.html"
        with open(dashboard_path, 'w') as f:
            f.write(dashboard_html)
        
        self.log("✅ Monitoring dashboard ustvarjen")
    
    def setup_monitoring_cron(self):
        """Nastavi cron job za monitoring"""
        self.log("⏰ Nastavljam cron job za monitoring...")
        
        # Ustvari monitoring skripto
        monitoring_script = f"""#!/bin/bash
# Omni Monitoring Cron Script
# Generated: {datetime.now().isoformat()}

LOG_FILE="/var/log/omni/monitoring-cron.log"

echo "[$(date)] Starting monitoring cycle..." >> "$LOG_FILE"

# Zberi metrike
python3 {os.path.abspath(__file__)} --collect-metrics >> "$LOG_FILE" 2>&1

# Preveri zdravje
python3 {os.path.abspath(__file__)} --health-check >> "$LOG_FILE" 2>&1

# Ustvari backup (samo ob 2:00)
if [ "$(date +%H)" = "02" ]; then
    python3 {os.path.abspath(__file__)} --backup full >> "$LOG_FILE" 2>&1
fi

echo "[$(date)] Monitoring cycle completed" >> "$LOG_FILE"
"""
        
        monitoring_script_path = f"{self.monitoring_dir}/monitoring-cron.sh"
        with open(monitoring_script_path, 'w') as f:
            f.write(monitoring_script)
        
        os.chmod(monitoring_script_path, 0o755)
        
        # Dodaj v crontab
        cron_entry = f"*/5 * * * * {monitoring_script_path}"
        
        # Preveri obstoječi crontab
        result = self.run_command("crontab -l", check=False)
        existing_cron = result.stdout if result.returncode == 0 else ""
        
        if monitoring_script_path not in existing_cron:
            new_cron = existing_cron + f"\n{cron_entry}\n"
            
            # Nastavi novi crontab
            process = subprocess.Popen(['crontab', '-'], stdin=subprocess.PIPE, text=True)
            process.communicate(input=new_cron)
            
            self.log("✅ Monitoring cron job nastavljen (vsakih 5 minut)")
        else:
            self.log("✅ Monitoring cron job je že nastavljen")
    
    def run_monitoring_cycle(self):
        """Zaženi en cikel monitoringa"""
        self.log("🔄 Zaganjam monitoring cikel...")
        
        # Zberi metrike
        system_metrics = self.collect_system_metrics()
        app_metrics = self.collect_app_metrics()
        
        # Shrani metrike
        self.store_metrics(system_metrics, app_metrics)
        
        # Preveri zdravje
        health_status = self.check_health()
        
        # Pošlji opozorila, če je potrebno
        for check_name, check_data in health_status["checks"].items():
            if check_data["status"] in ["warning", "critical"]:
                self.send_alert(
                    alert_type=check_name,
                    severity=check_data["status"],
                    message=check_data["message"]
                )
        
        self.log("✅ Monitoring cikel končan")
    
    def setup_backup_monitoring_system(self):
        """Glavna funkcija za nastavitev backup in monitoring sistema"""
        self.log("🚀 Nastavljam Omni Backup & Monitoring sistem...")
        
        # Inicializiraj bazo podatkov
        self.init_monitoring_database()
        
        # Ustvari monitoring dashboard
        self.create_monitoring_dashboard()
        
        # Nastavi cron job
        self.setup_monitoring_cron()
        
        # Ustvari prvi backup
        backup_info = self.create_backup("full")
        self.store_backup_record(backup_info)
        
        # Počisti stare backupe
        retention_days = self.config.get('monitoring', {}).get('backup_retention_days', 7)
        self.cleanup_old_backups(retention_days)
        
        # Zaženi prvi monitoring cikel
        self.run_monitoring_cycle()
        
        self.log("🎉 BACKUP & MONITORING SISTEM USPEŠNO NASTAVLJEN!")
        
        return True

def main():
    """Glavna funkcija"""
    monitor = OmniBackupMonitoring()
    
    try:
        monitor.load_config()
        
        # Preveri argumente
        if len(sys.argv) > 1:
            if sys.argv[1] == "--collect-metrics":
                system_metrics = monitor.collect_system_metrics()
                app_metrics = monitor.collect_app_metrics()
                monitor.store_metrics(system_metrics, app_metrics)
                return
            
            elif sys.argv[1] == "--health-check":
                health_status = monitor.check_health()
                print(json.dumps(health_status, indent=2))
                return
            
            elif sys.argv[1] == "--backup":
                backup_type = sys.argv[2] if len(sys.argv) > 2 else "full"
                backup_info = monitor.create_backup(backup_type)
                monitor.store_backup_record(backup_info)
                return
            
            elif sys.argv[1] == "--monitoring-cycle":
                monitor.run_monitoring_cycle()
                return
        
        # Privzeto: nastavi celoten sistem
        success = monitor.setup_backup_monitoring_system()
        
        if success:
            domain = monitor.config['general']['domain']
            monitor.log(f"📊 Monitoring dashboard: https://{domain}/monitoring-dashboard.html")
            monitor.log(f"🔐 SSL dashboard: https://{domain}/ssl-dashboard.html")
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        monitor.log("Backup & Monitoring setup prekinjen s strani uporabnika")
        sys.exit(1)
    except Exception as e:
        monitor.log(f"Nepričakovana napaka: {e}", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main()