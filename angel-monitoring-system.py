#!/usr/bin/env python3
"""
🔹 Angel Monitoring System - Python Edition
Sistem za monitoring in analitiko Angel-ov v Omni oblačni infrastrukturi
Verzija: 2.0 - Cloud Ready
"""

import os
import sys
import json
import time
import asyncio
import logging
import threading
import requests
import psutil
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify, render_template_string
import sqlite3
from collections import defaultdict, deque

# Konfiguracija
CONFIG = {
    "server": {
        "host": "0.0.0.0",
        "port": 8084,
        "debug": False
    },
    "monitoring": {
        "check_interval": 30,
        "metrics_retention_days": 30,
        "alert_thresholds": {
            "cpu_usage": 80,
            "memory_usage": 85,
            "response_time": 5000,
            "error_rate": 10
        }
    },
    "angels": {
        "integration_api": "http://localhost:8081/api",
        "task_distribution_api": "http://localhost:8082/api"
    },
    "database": {
        "path": "/opt/omni/monitoring.db"
    },
    "logging": {
        "level": "INFO",
        "file": "/var/log/omni/angel-monitoring.log"
    }
}

# Logging setup
logging.basicConfig(
    level=getattr(logging, CONFIG["logging"]["level"]),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(CONFIG["logging"]["file"]),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class MetricData:
    """Metrika podatki"""
    timestamp: str
    angel_id: str
    metric_type: str
    value: float
    unit: str
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class Alert:
    """Alert entiteta"""
    id: str
    type: str
    severity: str
    message: str
    angel_id: Optional[str]
    created_at: str
    resolved_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class MonitoringDatabase:
    """Database manager za monitoring podatke"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Inicializacija baze podatkov"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    angel_id TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    value REAL NOT NULL,
                    unit TEXT NOT NULL,
                    metadata TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    angel_id TEXT,
                    created_at TEXT NOT NULL,
                    resolved_at TEXT,
                    metadata TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS system_health (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    component TEXT NOT NULL,
                    status TEXT NOT NULL,
                    metrics TEXT NOT NULL
                )
            """)
            
            # Indeksi za boljšo performance
            conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_angel_id ON metrics(angel_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at)")
    
    def store_metric(self, metric: MetricData) -> bool:
        """Shrani metriko"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO metrics (timestamp, angel_id, metric_type, value, unit, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    metric.timestamp, metric.angel_id, metric.metric_type,
                    metric.value, metric.unit,
                    json.dumps(metric.metadata) if metric.metadata else None
                ))
            return True
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju metrike: {e}")
            return False
    
    def get_metrics(self, angel_id: str = None, metric_type: str = None, 
                   hours: int = 24) -> List[MetricData]:
        """Pridobi metrike"""
        metrics = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                query = "SELECT * FROM metrics WHERE timestamp > ?"
                params = [datetime.now() - timedelta(hours=hours)]
                
                if angel_id:
                    query += " AND angel_id = ?"
                    params.append(angel_id)
                
                if metric_type:
                    query += " AND metric_type = ?"
                    params.append(metric_type)
                
                query += " ORDER BY timestamp DESC"
                
                cursor = conn.execute(query, params)
                for row in cursor.fetchall():
                    metrics.append(MetricData(
                        timestamp=row[1], angel_id=row[2], metric_type=row[3],
                        value=row[4], unit=row[5],
                        metadata=json.loads(row[6]) if row[6] else None
                    ))
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju metrik: {e}")
        return metrics
    
    def create_alert(self, alert: Alert) -> bool:
        """Ustvari alert"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO alerts (id, type, severity, message, angel_id, created_at, resolved_at, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert.id, alert.type, alert.severity, alert.message,
                    alert.angel_id, alert.created_at, alert.resolved_at,
                    json.dumps(alert.metadata) if alert.metadata else None
                ))
            return True
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju alert-a: {e}")
            return False
    
    def get_active_alerts(self) -> List[Alert]:
        """Pridobi aktivne alert-e"""
        alerts = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "SELECT * FROM alerts WHERE resolved_at IS NULL ORDER BY created_at DESC"
                )
                for row in cursor.fetchall():
                    alerts.append(Alert(
                        id=row[0], type=row[1], severity=row[2], message=row[3],
                        angel_id=row[4], created_at=row[5], resolved_at=row[6],
                        metadata=json.loads(row[7]) if row[7] else None
                    ))
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju alert-ov: {e}")
        return alerts

class AngelMonitoringSystem:
    """Glavni sistem za monitoring Angel-ov"""
    
    def __init__(self):
        self.config = CONFIG
        self.db = MonitoringDatabase(CONFIG["database"]["path"])
        self.app = Flask(__name__)
        self.running = False
        self.metrics_buffer = deque(maxlen=1000)
        self.system_stats = {}
        
        # Nastavi API endpoints
        self.setup_routes()
        
        logger.info("🔹 Angel Monitoring System inicializiran")
    
    def setup_routes(self):
        """Nastavi Flask API routes"""
        
        @self.app.route('/api/metrics', methods=['POST'])
        def submit_metric():
            try:
                data = request.get_json()
                
                metric = MetricData(
                    timestamp=data.get('timestamp', datetime.now().isoformat()),
                    angel_id=data.get('angel_id'),
                    metric_type=data.get('metric_type'),
                    value=float(data.get('value')),
                    unit=data.get('unit', ''),
                    metadata=data.get('metadata')
                )
                
                if self.db.store_metric(metric):
                    self.metrics_buffer.append(metric)
                    return jsonify({"status": "success"})
                else:
                    return jsonify({"status": "error", "message": "Failed to store metric"}), 500
                    
            except Exception as e:
                logger.error(f"Napaka pri sprejemanju metrike: {e}")
                return jsonify({"status": "error", "message": str(e)}), 400
        
        @self.app.route('/api/metrics', methods=['GET'])
        def get_metrics():
            try:
                angel_id = request.args.get('angel_id')
                metric_type = request.args.get('metric_type')
                hours = int(request.args.get('hours', 24))
                
                metrics = self.db.get_metrics(angel_id, metric_type, hours)
                return jsonify({
                    "status": "success",
                    "metrics": [asdict(metric) for metric in metrics],
                    "count": len(metrics)
                })
            except Exception as e:
                logger.error(f"Napaka pri pridobivanju metrik: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/alerts', methods=['GET'])
        def get_alerts():
            try:
                alerts = self.db.get_active_alerts()
                return jsonify({
                    "status": "success",
                    "alerts": [asdict(alert) for alert in alerts],
                    "count": len(alerts)
                })
            except Exception as e:
                logger.error(f"Napaka pri pridobivanju alert-ov: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/system/health', methods=['GET'])
        def system_health():
            try:
                # Sistemske metrike
                cpu_percent = psutil.cpu_percent(interval=1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                
                # Angel sistemi status
                angels_status = self.check_angel_systems()
                
                health_data = {
                    "status": "healthy",
                    "timestamp": datetime.now().isoformat(),
                    "system": {
                        "cpu_usage": cpu_percent,
                        "memory_usage": memory.percent,
                        "disk_usage": disk.percent,
                        "uptime": time.time() - psutil.boot_time()
                    },
                    "angels": angels_status,
                    "alerts_count": len(self.db.get_active_alerts())
                }
                
                return jsonify(health_data)
            except Exception as e:
                logger.error(f"Napaka pri preverjanju zdravja sistema: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/dashboard', methods=['GET'])
        def dashboard():
            """Enostaven dashboard"""
            try:
                # Pridobi osnovne statistike
                angels = self.get_angels_stats()
                alerts = self.db.get_active_alerts()
                system_health = self.get_system_health()
                
                dashboard_html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Angel Monitoring Dashboard</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                        .container { max-width: 1200px; margin: 0 auto; }
                        .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                        .header { text-align: center; color: #333; }
                        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
                        .stat-item { text-align: center; }
                        .stat-value { font-size: 2em; font-weight: bold; color: #2196F3; }
                        .stat-label { color: #666; margin-top: 5px; }
                        .alert { padding: 10px; margin: 5px 0; border-radius: 4px; }
                        .alert-critical { background: #ffebee; border-left: 4px solid #f44336; }
                        .alert-warning { background: #fff3e0; border-left: 4px solid #ff9800; }
                        .status-active { color: #4caf50; }
                        .status-inactive { color: #f44336; }
                        .refresh-btn { background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
                    </style>
                    <script>
                        function refreshData() {
                            location.reload();
                        }
                        setInterval(refreshData, 30000); // Refresh every 30 seconds
                    </script>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <h1 class="header">🔹 Angel Monitoring Dashboard</h1>
                            <p style="text-align: center; color: #666;">
                                Zadnja posodobitev: {{ timestamp }}
                                <button class="refresh-btn" onclick="refreshData()">🔄 Osveži</button>
                            </p>
                        </div>
                        
                        <div class="card">
                            <h2>📊 Sistemske statistike</h2>
                            <div class="stats">
                                <div class="stat-item">
                                    <div class="stat-value">{{ angels_count }}</div>
                                    <div class="stat-label">Aktivni Angel-i</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{{ alerts_count }}</div>
                                    <div class="stat-label">Aktivni alarmi</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{{ cpu_usage }}%</div>
                                    <div class="stat-label">CPU uporaba</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{{ memory_usage }}%</div>
                                    <div class="stat-label">Pomnilnik</div>
                                </div>
                            </div>
                        </div>
                        
                        {% if alerts %}
                        <div class="card">
                            <h2>🚨 Aktivni alarmi</h2>
                            {% for alert in alerts %}
                            <div class="alert alert-{{ alert.severity }}">
                                <strong>{{ alert.type }}</strong>: {{ alert.message }}
                                <br><small>{{ alert.created_at }}</small>
                            </div>
                            {% endfor %}
                        </div>
                        {% endif %}
                        
                        <div class="card">
                            <h2>👼 Angel sistemi</h2>
                            <div class="stats">
                                {% for system, status in angel_systems.items() %}
                                <div class="stat-item">
                                    <div class="stat-value status-{{ status.status }}">
                                        {{ "✅" if status.status == "active" else "❌" }}
                                    </div>
                                    <div class="stat-label">{{ system }}</div>
                                </div>
                                {% endfor %}
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """
                
                from jinja2 import Template
                template = Template(dashboard_html)
                
                return template.render(
                    timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    angels_count=len(angels),
                    alerts_count=len(alerts),
                    alerts=alerts,
                    cpu_usage=round(system_health.get('cpu_usage', 0), 1),
                    memory_usage=round(system_health.get('memory_usage', 0), 1),
                    angel_systems=self.check_angel_systems()
                )
                
            except Exception as e:
                logger.error(f"Napaka pri generiranju dashboard-a: {e}")
                return f"<h1>Napaka: {e}</h1>", 500
        
        @self.app.route('/api/status', methods=['GET'])
        def system_status():
            try:
                return jsonify({
                    "status": "active",
                    "system": "Angel Monitoring System",
                    "version": "2.0",
                    "uptime": time.time() - psutil.boot_time(),
                    "metrics_buffer_size": len(self.metrics_buffer),
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                logger.error(f"Napaka pri status preverjanju: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
    
    def check_angel_systems(self) -> Dict[str, Dict]:
        """Preveri status Angel sistemov"""
        systems = {
            "Integration": {"url": f"{CONFIG['angels']['integration_api']}/status", "status": "unknown"},
            "Task Distribution": {"url": f"{CONFIG['angels']['task_distribution_api']}/status", "status": "unknown"}
        }
        
        for system_name, system_info in systems.items():
            try:
                response = requests.get(system_info["url"], timeout=5)
                if response.status_code == 200:
                    systems[system_name]["status"] = "active"
                else:
                    systems[system_name]["status"] = "inactive"
            except Exception as e:
                systems[system_name]["status"] = "inactive"
                systems[system_name]["error"] = str(e)
        
        return systems
    
    def get_angels_stats(self) -> List[Dict]:
        """Pridobi statistike Angel-ov"""
        try:
            response = requests.get(f"{CONFIG['angels']['integration_api']}/angels", timeout=5)
            if response.status_code == 200:
                return response.json().get('angels', [])
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju Angel statistik: {e}")
        return []
    
    def get_system_health(self) -> Dict:
        """Pridobi sistemsko zdravje"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                "cpu_usage": cpu_percent,
                "memory_usage": memory.percent,
                "disk_usage": disk.percent,
                "uptime": time.time() - psutil.boot_time()
            }
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju sistemskega zdravja: {e}")
            return {}
    
    def start_health_monitor(self):
        """Zagon health monitorja"""
        def monitor():
            while self.running:
                try:
                    # Preveri sistemsko zdravje
                    health = self.get_system_health()
                    
                    # Preveri Angel sisteme
                    angel_systems = self.check_angel_systems()
                    
                    # Generiraj alert-e če je potrebno
                    self.check_and_generate_alerts(health, angel_systems)
                    
                    time.sleep(CONFIG["monitoring"]["check_interval"])
                    
                except Exception as e:
                    logger.error(f"Napaka v health monitor: {e}")
                    time.sleep(10)
        
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
        logger.info("💓 Health monitor zagnan")
    
    def check_and_generate_alerts(self, health: Dict, angel_systems: Dict):
        """Preveri in generiraj alert-e"""
        thresholds = CONFIG["monitoring"]["alert_thresholds"]
        
        # CPU alert
        if health.get('cpu_usage', 0) > thresholds['cpu_usage']:
            alert = Alert(
                id=f"cpu_high_{int(time.time())}",
                type="high_cpu_usage",
                severity="warning",
                message=f"Visoka CPU uporaba: {health['cpu_usage']:.1f}%",
                angel_id=None,
                created_at=datetime.now().isoformat()
            )
            self.db.create_alert(alert)
        
        # Memory alert
        if health.get('memory_usage', 0) > thresholds['memory_usage']:
            alert = Alert(
                id=f"memory_high_{int(time.time())}",
                type="high_memory_usage",
                severity="warning",
                message=f"Visoka uporaba pomnilnika: {health['memory_usage']:.1f}%",
                angel_id=None,
                created_at=datetime.now().isoformat()
            )
            self.db.create_alert(alert)
        
        # Angel systems alerts
        for system_name, system_info in angel_systems.items():
            if system_info["status"] == "inactive":
                alert = Alert(
                    id=f"angel_system_down_{system_name.lower().replace(' ', '_')}_{int(time.time())}",
                    type="angel_system_down",
                    severity="critical",
                    message=f"Angel sistem {system_name} ni dostopen",
                    angel_id=None,
                    created_at=datetime.now().isoformat()
                )
                self.db.create_alert(alert)
    
    def start(self):
        """Zagon Angel Monitoring System"""
        logger.info("🚀 Zagon Angel Monitoring System...")
        
        try:
            self.running = True
            
            # Zagon health monitorja
            self.start_health_monitor()
            
            # Zagon Flask strežnika
            logger.info(f"🌐 Monitoring dashboard dostopen na http://{self.config['server']['host']}:{self.config['server']['port']}/api/dashboard")
            self.app.run(
                host=self.config['server']['host'],
                port=self.config['server']['port'],
                debug=self.config['server']['debug'],
                threaded=True
            )
            
        except Exception as e:
            logger.error(f"❌ Napaka pri zagonu: {e}")
            self.running = False
    
    def stop(self):
        """Zaustavitev sistema"""
        logger.info("🛑 Zaustavitev Angel Monitoring System...")
        self.running = False

def main():
    """Glavna funkcija"""
    print("=" * 60)
    print("🔹 ANGEL MONITORING SYSTEM - Python Edition")
    print("   Sistem za monitoring Angel-ov v oblaku")
    print("=" * 60)
    
    try:
        system = AngelMonitoringSystem()
        system.start()
        
    except KeyboardInterrupt:
        logger.info("⏹️ Prekinitev sistema...")
    except Exception as e:
        logger.error(f"❌ Kritična napaka: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()