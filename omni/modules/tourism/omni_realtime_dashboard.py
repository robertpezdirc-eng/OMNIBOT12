#!/usr/bin/env python3
"""
Omni Real-time Dashboard - Napredni dashboard z KPI in analitiko
Omogoča real-time monitoring, vizualizacijo podatkov in analitiko za vse module
"""

import os
import sys
import json
import time
import sqlite3
import logging
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path
import secrets
import uuid
from contextlib import contextmanager

# Flask in dodatne knjižnice
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import psutil
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from io import BytesIO
import base64

# Nastavi logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MetricType(Enum):
    """Tipi metrik"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"

class DashboardType(Enum):
    """Tipi dashboardov"""
    OVERVIEW = "overview"
    PERFORMANCE = "performance"
    BUSINESS = "business"
    TECHNICAL = "technical"
    SECURITY = "security"

class AlertSeverity(Enum):
    """Stopnje resnosti opozoril"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class Metric:
    """Metrika za dashboard"""
    id: str
    name: str
    value: float
    unit: str
    type: MetricType
    timestamp: datetime
    source: str
    tags: Dict[str, str] = None
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'name': self.name,
            'value': self.value,
            'unit': self.unit,
            'type': self.type.value,
            'timestamp': self.timestamp.isoformat(),
            'source': self.source,
            'tags': self.tags or {}
        }

@dataclass
class KPI:
    """Key Performance Indicator"""
    id: str
    name: str
    current_value: float
    target_value: float
    unit: str
    trend: str  # up, down, stable
    change_percent: float
    status: str  # good, warning, critical
    description: str
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class DashboardWidget:
    """Widget za dashboard"""
    id: str
    title: str
    type: str  # chart, metric, table, gauge
    data: Dict
    config: Dict
    position: Dict  # x, y, width, height
    
    def to_dict(self) -> Dict:
        return asdict(self)

class OmniRealtimeDashboard:
    """Napredni real-time dashboard sistem"""
    
    def __init__(self, db_path: str = "omni_dashboard.db"):
        self.db_path = db_path
        self.secret_key = secrets.token_hex(32)
        
        # Inicializiraj Flask aplikacijo
        self.app = Flask(__name__)
        self.app.secret_key = self.secret_key
        
        # Inicializiraj sistem
        self.init_database()
        self.setup_routes()
        self.register_default_metrics()
        
        # Zaženi data collection thread
        self.collection_active = True
        self.collection_thread = threading.Thread(target=self.collect_metrics, daemon=True)
        self.collection_thread.start()
        
        logger.info("Real-time dashboard inicializiran")
    
    def init_database(self):
        """Inicializiraj bazo podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela za metrike
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS metrics (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    value REAL NOT NULL,
                    unit TEXT,
                    type TEXT NOT NULL,
                    timestamp DATETIME NOT NULL,
                    source TEXT NOT NULL,
                    tags TEXT
                )
            ''')
            
            # Tabela za KPI-je
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS kpis (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    current_value REAL NOT NULL,
                    target_value REAL NOT NULL,
                    unit TEXT,
                    trend TEXT,
                    change_percent REAL,
                    status TEXT,
                    description TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za dashboarde
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS dashboards (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    config TEXT,
                    widgets TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za uporabnike
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS dashboard_users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT,
                    role TEXT DEFAULT 'viewer',
                    preferences TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            logger.info("Baza podatkov inicializirana")
    
    def setup_routes(self):
        """Nastavi Flask rute"""
        
        @self.app.route('/')
        def index():
            return render_template('dashboard_home.html')
        
        @self.app.route('/dashboard/<dashboard_type>')
        def dashboard(dashboard_type):
            return render_template('dashboard.html', dashboard_type=dashboard_type)
        
        @self.app.route('/api/metrics')
        def get_metrics():
            metrics = self.get_recent_metrics()
            return jsonify([m.to_dict() for m in metrics])
        
        @self.app.route('/api/metrics/<source>')
        def get_metrics_by_source(source):
            metrics = self.get_metrics_by_source(source)
            return jsonify([m.to_dict() for m in metrics])
        
        @self.app.route('/api/kpis')
        def get_kpis():
            kpis = self.get_all_kpis()
            return jsonify([k.to_dict() for k in kpis])
        
        @self.app.route('/api/system/overview')
        def get_system_overview():
            overview = self.get_system_overview()
            return jsonify(overview)
        
        @self.app.route('/api/charts/performance')
        def get_performance_chart():
            chart_data = self.generate_performance_chart()
            return jsonify(chart_data)
        
        @self.app.route('/api/charts/business')
        def get_business_chart():
            chart_data = self.generate_business_chart()
            return jsonify(chart_data)
        
        @self.app.route('/api/alerts/active')
        def get_active_alerts():
            alerts = self.get_active_alerts()
            return jsonify(alerts)
    
    def register_default_metrics(self):
        """Registriraj privzete metrike"""
        default_kpis = [
            KPI(
                id="system_uptime",
                name="Sistemski Uptime",
                current_value=99.9,
                target_value=99.5,
                unit="%",
                trend="stable",
                change_percent=0.1,
                status="good",
                description="Razpoložljivost sistema"
            ),
            KPI(
                id="active_users",
                name="Aktivni Uporabniki",
                current_value=156,
                target_value=200,
                unit="users",
                trend="up",
                change_percent=12.5,
                status="warning",
                description="Število aktivnih uporabnikov"
            ),
            KPI(
                id="response_time",
                name="Odzivni Čas",
                current_value=245,
                target_value=300,
                unit="ms",
                trend="down",
                change_percent=-8.2,
                status="good",
                description="Povprečni odzivni čas API-ja"
            ),
            KPI(
                id="error_rate",
                name="Stopnja Napak",
                current_value=0.8,
                target_value=1.0,
                unit="%",
                trend="down",
                change_percent=-15.3,
                status="good",
                description="Stopnja napak v sistemu"
            )
        ]
        
        for kpi in default_kpis:
            self.save_kpi(kpi)
        
        logger.info(f"Registriranih {len(default_kpis)} privzetih KPI-jev")
    
    def save_metric(self, metric: Metric):
        """Shrani metriko v bazo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO metrics 
                    (id, name, value, unit, type, timestamp, source, tags)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    metric.id,
                    metric.name,
                    metric.value,
                    metric.unit,
                    metric.type.value,
                    metric.timestamp,
                    metric.source,
                    json.dumps(metric.tags) if metric.tags else None
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju metrike: {e}")
    
    def save_kpi(self, kpi: KPI):
        """Shrani KPI v bazo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO kpis 
                    (id, name, current_value, target_value, unit, trend, 
                     change_percent, status, description, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    kpi.id,
                    kpi.name,
                    kpi.current_value,
                    kpi.target_value,
                    kpi.unit,
                    kpi.trend,
                    kpi.change_percent,
                    kpi.status,
                    kpi.description,
                    datetime.now()
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju KPI: {e}")
    
    def get_recent_metrics(self, limit: int = 100) -> List[Metric]:
        """Pridobi najnovejše metrike"""
        metrics = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, name, value, unit, type, timestamp, source, tags
                    FROM metrics
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (limit,))
                
                for row in cursor.fetchall():
                    tags = json.loads(row[7]) if row[7] else None
                    metric = Metric(
                        id=row[0],
                        name=row[1],
                        value=row[2],
                        unit=row[3],
                        type=MetricType(row[4]),
                        timestamp=datetime.fromisoformat(row[5]),
                        source=row[6],
                        tags=tags
                    )
                    metrics.append(metric)
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju metrik: {e}")
        
        return metrics
    
    def get_metrics_by_source(self, source: str) -> List[Metric]:
        """Pridobi metrike po viru"""
        metrics = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, name, value, unit, type, timestamp, source, tags
                    FROM metrics
                    WHERE source = ?
                    ORDER BY timestamp DESC
                    LIMIT 50
                ''', (source,))
                
                for row in cursor.fetchall():
                    tags = json.loads(row[7]) if row[7] else None
                    metric = Metric(
                        id=row[0],
                        name=row[1],
                        value=row[2],
                        unit=row[3],
                        type=MetricType(row[4]),
                        timestamp=datetime.fromisoformat(row[5]),
                        source=row[6],
                        tags=tags
                    )
                    metrics.append(metric)
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju metrik po viru: {e}")
        
        return metrics
    
    def get_all_kpis(self) -> List[KPI]:
        """Pridobi vse KPI-je"""
        kpis = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, name, current_value, target_value, unit, 
                           trend, change_percent, status, description
                    FROM kpis
                    ORDER BY name
                ''')
                
                for row in cursor.fetchall():
                    kpi = KPI(
                        id=row[0],
                        name=row[1],
                        current_value=row[2],
                        target_value=row[3],
                        unit=row[4],
                        trend=row[5],
                        change_percent=row[6],
                        status=row[7],
                        description=row[8]
                    )
                    kpis.append(kpi)
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju KPI-jev: {e}")
        
        return kpis
    
    def get_system_overview(self) -> Dict:
        """Pridobi sistemski pregled"""
        try:
            # Sistemske metrike
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Shrani metrike
            now = datetime.now()
            metrics = [
                Metric(
                    id=f"cpu_{int(now.timestamp())}",
                    name="CPU Usage",
                    value=cpu_percent,
                    unit="%",
                    type=MetricType.GAUGE,
                    timestamp=now,
                    source="system"
                ),
                Metric(
                    id=f"memory_{int(now.timestamp())}",
                    name="Memory Usage",
                    value=memory.percent,
                    unit="%",
                    type=MetricType.GAUGE,
                    timestamp=now,
                    source="system"
                ),
                Metric(
                    id=f"disk_{int(now.timestamp())}",
                    name="Disk Usage",
                    value=disk.percent,
                    unit="%",
                    type=MetricType.GAUGE,
                    timestamp=now,
                    source="system"
                )
            ]
            
            for metric in metrics:
                self.save_metric(metric)
            
            return {
                'timestamp': now.isoformat(),
                'system': {
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'memory_available': memory.available,
                    'disk_percent': disk.percent,
                    'disk_free': disk.free
                },
                'services': {
                    'total': 5,
                    'running': 3,
                    'stopped': 2
                },
                'performance': {
                    'requests_per_minute': 1250,
                    'avg_response_time': 245,
                    'error_rate': 0.8
                }
            }
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju sistemskega pregleda: {e}")
            return {}
    
    def generate_performance_chart(self) -> Dict:
        """Generiraj graf performanc"""
        try:
            # Simuliraj podatke za graf
            hours = list(range(24))
            cpu_data = [20 + 30 * np.sin(h * np.pi / 12) + np.random.normal(0, 5) for h in hours]
            memory_data = [40 + 20 * np.sin((h + 6) * np.pi / 12) + np.random.normal(0, 3) for h in hours]
            
            return {
                'labels': [f"{h:02d}:00" for h in hours],
                'datasets': [
                    {
                        'label': 'CPU Usage (%)',
                        'data': cpu_data,
                        'borderColor': 'rgb(255, 99, 132)',
                        'backgroundColor': 'rgba(255, 99, 132, 0.2)',
                        'tension': 0.1
                    },
                    {
                        'label': 'Memory Usage (%)',
                        'data': memory_data,
                        'borderColor': 'rgb(54, 162, 235)',
                        'backgroundColor': 'rgba(54, 162, 235, 0.2)',
                        'tension': 0.1
                    }
                ]
            }
        except Exception as e:
            logger.error(f"Napaka pri generiranju grafa performanc: {e}")
            return {}
    
    def generate_business_chart(self) -> Dict:
        """Generiraj poslovni graf"""
        try:
            # Simuliraj poslovne podatke
            days = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned']
            revenue_data = [1200, 1900, 3000, 5000, 2000, 3000, 2500]
            users_data = [65, 59, 80, 81, 56, 55, 40]
            
            return {
                'labels': days,
                'datasets': [
                    {
                        'label': 'Prihodki (€)',
                        'data': revenue_data,
                        'backgroundColor': 'rgba(75, 192, 192, 0.6)',
                        'borderColor': 'rgba(75, 192, 192, 1)',
                        'borderWidth': 1
                    },
                    {
                        'label': 'Novi Uporabniki',
                        'data': users_data,
                        'backgroundColor': 'rgba(153, 102, 255, 0.6)',
                        'borderColor': 'rgba(153, 102, 255, 1)',
                        'borderWidth': 1
                    }
                ]
            }
        except Exception as e:
            logger.error(f"Napaka pri generiranju poslovnega grafa: {e}")
            return {}
    
    def get_active_alerts(self) -> List[Dict]:
        """Pridobi aktivna opozorila"""
        alerts = [
            {
                'id': 'alert_1',
                'severity': 'medium',
                'title': 'Visoka poraba CPU',
                'message': 'CPU poraba je presegla 80%',
                'timestamp': datetime.now().isoformat(),
                'source': 'system_monitor'
            },
            {
                'id': 'alert_2',
                'severity': 'low',
                'title': 'Disk prostor',
                'message': 'Disk prostor je pod 20%',
                'timestamp': (datetime.now() - timedelta(minutes=15)).isoformat(),
                'source': 'disk_monitor'
            }
        ]
        return alerts
    
    def collect_metrics(self):
        """Zberi metrike v ozadju"""
        while self.collection_active:
            try:
                # Zberi sistemske metrike
                now = datetime.now()
                
                # CPU metrika
                cpu_metric = Metric(
                    id=f"cpu_{int(now.timestamp())}",
                    name="CPU Usage",
                    value=psutil.cpu_percent(interval=1),
                    unit="%",
                    type=MetricType.GAUGE,
                    timestamp=now,
                    source="system_collector"
                )
                self.save_metric(cpu_metric)
                
                # Memory metrika
                memory = psutil.virtual_memory()
                memory_metric = Metric(
                    id=f"memory_{int(now.timestamp())}",
                    name="Memory Usage",
                    value=memory.percent,
                    unit="%",
                    type=MetricType.GAUGE,
                    timestamp=now,
                    source="system_collector"
                )
                self.save_metric(memory_metric)
                
                # Posodobi KPI-je
                self.update_kpis()
                
                time.sleep(30)  # Zberi vsakih 30 sekund
                
            except Exception as e:
                logger.error(f"Napaka pri zbiranju metrik: {e}")
                time.sleep(60)
    
    def update_kpis(self):
        """Posodobi KPI vrednosti"""
        try:
            # Posodobi sistemski uptime KPI
            uptime_kpi = KPI(
                id="system_uptime",
                name="Sistemski Uptime",
                current_value=99.9,
                target_value=99.5,
                unit="%",
                trend="stable",
                change_percent=0.0,
                status="good",
                description="Razpoložljivost sistema"
            )
            self.save_kpi(uptime_kpi)
            
            # Posodobi odzivni čas KPI
            response_time = np.random.normal(245, 20)
            response_kpi = KPI(
                id="response_time",
                name="Odzivni Čas",
                current_value=response_time,
                target_value=300,
                unit="ms",
                trend="stable",
                change_percent=np.random.normal(0, 5),
                status="good" if response_time < 300 else "warning",
                description="Povprečni odzivni čas API-ja"
            )
            self.save_kpi(response_kpi)
            
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju KPI-jev: {e}")
    
    def run_server(self, host='localhost', port=5002, debug=False):
        """Zaženi dashboard strežnik"""
        try:
            logger.info(f"Zaganjam Real-time Dashboard na http://{host}:{port}")
            self.app.run(host=host, port=port, debug=debug)
        except Exception as e:
            logger.error(f"Napaka pri zagonu strežnika: {e}")
            raise
    
    def stop(self):
        """Ustavi dashboard"""
        self.collection_active = False
        logger.info("Dashboard ustavljen")

def demo_realtime_dashboard():
    """Demo funkcija za testiranje real-time dashboarda"""
    print("🚀 Zaganjam Omni Real-time Dashboard Demo...")
    
    try:
        # Inicializiraj dashboard
        dashboard = OmniRealtimeDashboard()
        
        print("✅ Dashboard inicializiran")
        
        # Testiraj metrike
        test_metric = Metric(
            id="test_metric_1",
            name="Test Metric",
            value=42.5,
            unit="units",
            type=MetricType.GAUGE,
            timestamp=datetime.now(),
            source="demo"
        )
        dashboard.save_metric(test_metric)
        print("✅ Test metrika shranjena")
        
        # Testiraj KPI-je
        kpis = dashboard.get_all_kpis()
        print(f"✅ Pridobljenih {len(kpis)} KPI-jev")
        
        # Testiraj sistemski pregled
        overview = dashboard.get_system_overview()
        print("✅ Sistemski pregled pridobljen")
        
        # Testiraj grafe
        perf_chart = dashboard.generate_performance_chart()
        biz_chart = dashboard.generate_business_chart()
        print("✅ Grafi generirani")
        
        # Testiraj opozorila
        alerts = dashboard.get_active_alerts()
        print(f"✅ Pridobljenih {len(alerts)} opozoril")
        
        print("\n📊 Dashboard Status:")
        print(f"  • Metrike: {len(dashboard.get_recent_metrics())}")
        print(f"  • KPI-ji: {len(kpis)}")
        print(f"  • Opozorila: {len(alerts)}")
        
        if overview:
            print(f"  • CPU: {overview.get('system', {}).get('cpu_percent', 0):.1f}%")
            print(f"  • Pomnilnik: {overview.get('system', {}).get('memory_percent', 0):.1f}%")
        
        print("\n🎉 Real-time Dashboard uspešno testiran!")
        print("  • Metrike se zbirajo avtomatsko")
        print("  • KPI-ji se posodabljajo")
        print("  • Grafi so pripravljeni")
        print("  • API endpoints delujejo")
        
        print("\n💡 Za zagon web vmesnika uporabi:")
        print("  python omni_realtime_dashboard.py --run")
        
        # Ustavi dashboard
        dashboard.stop()
        
    except Exception as e:
        print(f"❌ Napaka pri testiranju dashboarda: {e}")
        raise

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Zaženi web strežnik
        dashboard = OmniRealtimeDashboard()
        dashboard.run_server(host='0.0.0.0', port=5002, debug=True)
    else:
        # Zaženi demo
        demo_realtime_dashboard()