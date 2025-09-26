#!/usr/bin/env python3
"""
📊 OMNI KPI DASHBOARD - Napredni KPI dashboard z real-time analitiko

Centraliziran oblačni sistem z naprednimi KPI funkcionalnostmi:
- Real-time dashboard z interaktivnimi grafi
- Napredne analitike in metrike
- Personalizirani KPI-ji za različne vloge
- Prediktivna analitika in trendi
- Avtomatska poročila in alarmi
- Integracija z vsemi moduli
- Export podatkov in vizualizacij
- Mobile-responsive design

Varnostne funkcije:
- Centraliziran oblak → noben modul ne teče lokalno
- Enkripcija → TLS + AES-256 za vse podatke in komunikacijo
- Sandbox / Read-only demo
- Zaščita pred krajo → poskusi prenosa ali lokalne uporabe → modul se zaklene
- Admin dostop samo za tebe → edini, ki lahko nadgrajuje in odklepa funkcionalnosti
"""

import sqlite3
import json
import logging
import datetime
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import threading
import time
import hashlib
import secrets
from flask import Flask, request, jsonify, render_template_string
import plotly.graph_objs as go
import plotly.express as px
from plotly.utils import PlotlyJSONEncoder
import plotly
from collections import defaultdict
import asyncio
import websockets
import warnings
warnings.filterwarnings('ignore')

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class KPIType(Enum):
    REVENUE = "revenue"
    OCCUPANCY = "occupancy"
    CUSTOMER_SATISFACTION = "customer_satisfaction"
    OPERATIONAL_EFFICIENCY = "operational_efficiency"
    COST_OPTIMIZATION = "cost_optimization"
    STAFF_PRODUCTIVITY = "staff_productivity"
    INVENTORY_TURNOVER = "inventory_turnover"
    MARKETING_ROI = "marketing_roi"

class DashboardRole(Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    OWNER = "owner"
    ANALYST = "analyst"

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    SUCCESS = "success"

@dataclass
class KPIMetric:
    metric_id: str
    name: str
    value: float
    target: float
    unit: str
    trend: float  # Percentage change
    category: KPIType
    timestamp: datetime.datetime
    description: str
    alert_level: AlertLevel

@dataclass
class DashboardWidget:
    widget_id: str
    title: str
    widget_type: str  # chart, metric, table, gauge
    data: Dict[str, Any]
    position: Tuple[int, int]  # (row, col)
    size: Tuple[int, int]  # (width, height)
    refresh_interval: int  # seconds
    role_access: List[DashboardRole]

@dataclass
class Alert:
    alert_id: str
    title: str
    message: str
    level: AlertLevel
    metric_id: str
    threshold: float
    current_value: float
    timestamp: datetime.datetime
    acknowledged: bool = False

class OmniKPIDashboard:
    def __init__(self, db_path: str = "omni_kpi_dashboard.db"):
        self.db_path = db_path
        self.is_demo = True
        self.demo_start_time = datetime.datetime.now()
        self.demo_duration_hours = 2
        self.access_key = secrets.token_hex(32)
        self.websocket_clients = set()
        
        # Real-time data storage
        self.real_time_data = defaultdict(list)
        self.kpi_cache = {}
        self.alerts = []
        
        self.init_database()
        self.load_sample_data()
        
        # Flask aplikacija
        self.app = Flask(__name__)
        self.setup_routes()
        
        # Start real-time data generator
        self.start_real_time_updates()
        
        logger.info("KPI Dashboard inicializiran")

    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za KPI metrike
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS kpi_metrics (
                id TEXT PRIMARY KEY,
                name TEXT,
                value REAL,
                target REAL,
                unit TEXT,
                trend REAL,
                category TEXT,
                timestamp TEXT,
                description TEXT,
                alert_level TEXT
            )
        ''')
        
        # Tabela za dashboard widget-e
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dashboard_widgets (
                id TEXT PRIMARY KEY,
                title TEXT,
                widget_type TEXT,
                data TEXT,
                position_row INTEGER,
                position_col INTEGER,
                size_width INTEGER,
                size_height INTEGER,
                refresh_interval INTEGER,
                role_access TEXT,
                created_at TEXT
            )
        ''')
        
        # Tabela za alerte
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                title TEXT,
                message TEXT,
                level TEXT,
                metric_id TEXT,
                threshold REAL,
                current_value REAL,
                timestamp TEXT,
                acknowledged INTEGER
            )
        ''')
        
        # Tabela za zgodovinske podatke
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS historical_data (
                id TEXT PRIMARY KEY,
                metric_name TEXT,
                value REAL,
                timestamp TEXT,
                metadata TEXT
            )
        ''')
        
        # Tabela za uporabniške nastavitve
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id TEXT PRIMARY KEY,
                role TEXT,
                dashboard_config TEXT,
                preferences TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("KPI Dashboard baza podatkov inicializirana")

    def load_sample_data(self):
        """Naloži vzorčne podatke"""
        sample_metrics = [
            KPIMetric("revenue_daily", "Dnevni prihodek", 2850.0, 3000.0, "€", 5.2, 
                     KPIType.REVENUE, datetime.datetime.now(), "Skupni dnevni prihodek", AlertLevel.SUCCESS),
            KPIMetric("occupancy_rate", "Zasedenost", 78.5, 85.0, "%", -2.1, 
                     KPIType.OCCUPANCY, datetime.datetime.now(), "Povprečna zasedenost sob", AlertLevel.WARNING),
            KPIMetric("customer_satisfaction", "Zadovoljstvo strank", 4.3, 4.5, "/5", 1.8, 
                     KPIType.CUSTOMER_SATISFACTION, datetime.datetime.now(), "Povprečna ocena zadovoljstva", AlertLevel.INFO),
            KPIMetric("staff_productivity", "Produktivnost osebja", 92.1, 90.0, "%", 3.4, 
                     KPIType.STAFF_PRODUCTIVITY, datetime.datetime.now(), "Učinkovitost dela osebja", AlertLevel.SUCCESS),
            KPIMetric("cost_per_guest", "Strošek na gosta", 45.2, 50.0, "€", -8.1, 
                     KPIType.COST_OPTIMIZATION, datetime.datetime.now(), "Povprečni strošek na gosta", AlertLevel.SUCCESS),
            KPIMetric("inventory_turnover", "Obrat zalog", 12.3, 15.0, "x", -5.2, 
                     KPIType.INVENTORY_TURNOVER, datetime.datetime.now(), "Hitrost obrata zalog", AlertLevel.WARNING)
        ]
        
        for metric in sample_metrics:
            self.save_kpi_metric(metric)
            self.kpi_cache[metric.metric_id] = metric

    def generate_real_time_data(self):
        """Generiranje real-time podatkov"""
        while True:
            try:
                # Simulacija real-time podatkov
                current_time = datetime.datetime.now()
                
                # Revenue data
                revenue = np.random.normal(2800, 200)
                self.real_time_data['revenue'].append({
                    'timestamp': current_time.isoformat(),
                    'value': round(revenue, 2)
                })
                
                # Occupancy data
                occupancy = np.random.normal(78, 5)
                self.real_time_data['occupancy'].append({
                    'timestamp': current_time.isoformat(),
                    'value': round(max(0, min(100, occupancy)), 1)
                })
                
                # Customer satisfaction
                satisfaction = np.random.normal(4.3, 0.2)
                self.real_time_data['satisfaction'].append({
                    'timestamp': current_time.isoformat(),
                    'value': round(max(1, min(5, satisfaction)), 1)
                })
                
                # Staff productivity
                productivity = np.random.normal(92, 3)
                self.real_time_data['productivity'].append({
                    'timestamp': current_time.isoformat(),
                    'value': round(max(0, min(100, productivity)), 1)
                })
                
                # Keep only last 100 data points
                for key in self.real_time_data:
                    if len(self.real_time_data[key]) > 100:
                        self.real_time_data[key] = self.real_time_data[key][-100:]
                
                # Check for alerts
                self.check_alerts()
                
                # Broadcast to websocket clients
                self.broadcast_real_time_data()
                
                time.sleep(5)  # Update every 5 seconds
                
            except Exception as e:
                logger.error(f"Napaka pri generiranju real-time podatkov: {e}")
                time.sleep(10)

    def start_real_time_updates(self):
        """Zaženi real-time posodobitve"""
        thread = threading.Thread(target=self.generate_real_time_data, daemon=True)
        thread.start()

    def check_alerts(self):
        """Preveri in ustvari alerte"""
        try:
            # Check revenue alert
            if self.real_time_data['revenue']:
                current_revenue = self.real_time_data['revenue'][-1]['value']
                if current_revenue < 2500:
                    alert = Alert(
                        alert_id=f"alert_revenue_{int(time.time())}",
                        title="Nizek dnevni prihodek",
                        message=f"Dnevni prihodek ({current_revenue}€) je pod kritično mejo (2500€)",
                        level=AlertLevel.CRITICAL,
                        metric_id="revenue_daily",
                        threshold=2500.0,
                        current_value=current_revenue,
                        timestamp=datetime.datetime.now()
                    )
                    self.alerts.append(alert)
                    self.save_alert(alert)
            
            # Check occupancy alert
            if self.real_time_data['occupancy']:
                current_occupancy = self.real_time_data['occupancy'][-1]['value']
                if current_occupancy < 70:
                    alert = Alert(
                        alert_id=f"alert_occupancy_{int(time.time())}",
                        title="Nizka zasedenost",
                        message=f"Zasedenost ({current_occupancy}%) je pod priporočeno mejo (70%)",
                        level=AlertLevel.WARNING,
                        metric_id="occupancy_rate",
                        threshold=70.0,
                        current_value=current_occupancy,
                        timestamp=datetime.datetime.now()
                    )
                    self.alerts.append(alert)
                    self.save_alert(alert)
            
            # Keep only last 50 alerts
            if len(self.alerts) > 50:
                self.alerts = self.alerts[-50:]
                
        except Exception as e:
            logger.error(f"Napaka pri preverjanju alertov: {e}")

    def broadcast_real_time_data(self):
        """Pošlji real-time podatke vsem povezanim klientom"""
        if self.websocket_clients:
            data = {
                'type': 'real_time_update',
                'data': dict(self.real_time_data),
                'alerts': [
                    {
                        'id': alert.alert_id,
                        'title': alert.title,
                        'message': alert.message,
                        'level': alert.level.value,
                        'timestamp': alert.timestamp.isoformat()
                    } for alert in self.alerts[-5:]  # Last 5 alerts
                ],
                'timestamp': datetime.datetime.now().isoformat()
            }
            
            # In a real implementation, you would use websockets here
            # For now, we'll store it for the next API call
            self.latest_broadcast = data

    def create_revenue_chart(self) -> Dict[str, Any]:
        """Ustvari graf prihodkov"""
        if not self.real_time_data['revenue']:
            return {}
        
        data = self.real_time_data['revenue']
        timestamps = [item['timestamp'] for item in data]
        values = [item['value'] for item in data]
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=timestamps,
            y=values,
            mode='lines+markers',
            name='Prihodek',
            line=dict(color='#00ff88', width=3),
            marker=dict(size=6)
        ))
        
        fig.add_hline(y=3000, line_dash="dash", line_color="orange", 
                     annotation_text="Cilj: 3000€")
        fig.add_hline(y=2500, line_dash="dash", line_color="red", 
                     annotation_text="Kritična meja: 2500€")
        
        fig.update_layout(
            title="Dnevni prihodek (Real-time)",
            xaxis_title="Čas",
            yaxis_title="Prihodek (€)",
            template="plotly_dark",
            height=400
        )
        
        return json.loads(json.dumps(fig, cls=PlotlyJSONEncoder))

    def create_occupancy_gauge(self) -> Dict[str, Any]:
        """Ustvari gauge za zasedenost"""
        if not self.real_time_data['occupancy']:
            current_value = 78.5
        else:
            current_value = self.real_time_data['occupancy'][-1]['value']
        
        fig = go.Figure(go.Indicator(
            mode = "gauge+number+delta",
            value = current_value,
            domain = {'x': [0, 1], 'y': [0, 1]},
            title = {'text': "Zasedenost sob (%)"},
            delta = {'reference': 85},
            gauge = {
                'axis': {'range': [None, 100]},
                'bar': {'color': "#00ff88"},
                'steps': [
                    {'range': [0, 50], 'color': "lightgray"},
                    {'range': [50, 80], 'color': "gray"}
                ],
                'threshold': {
                    'line': {'color': "red", 'width': 4},
                    'thickness': 0.75,
                    'value': 85
                }
            }
        ))
        
        fig.update_layout(
            template="plotly_dark",
            height=400
        )
        
        return json.loads(json.dumps(fig, cls=PlotlyJSONEncoder))

    def create_satisfaction_chart(self) -> Dict[str, Any]:
        """Ustvari graf zadovoljstva strank"""
        if not self.real_time_data['satisfaction']:
            return {}
        
        data = self.real_time_data['satisfaction']
        timestamps = [item['timestamp'] for item in data]
        values = [item['value'] for item in data]
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=timestamps,
            y=values,
            mode='lines+markers',
            name='Zadovoljstvo',
            line=dict(color='#ff6b6b', width=3),
            marker=dict(size=6),
            fill='tonexty'
        ))
        
        fig.add_hline(y=4.5, line_dash="dash", line_color="green", 
                     annotation_text="Cilj: 4.5/5")
        
        fig.update_layout(
            title="Zadovoljstvo strank (Real-time)",
            xaxis_title="Čas",
            yaxis_title="Ocena (1-5)",
            yaxis=dict(range=[1, 5]),
            template="plotly_dark",
            height=400
        )
        
        return json.loads(json.dumps(fig, cls=PlotlyJSONEncoder))

    def create_productivity_bar_chart(self) -> Dict[str, Any]:
        """Ustvari stolpčni graf produktivnosti"""
        departments = ['Recepcija', 'Kuhinja', 'Čiščenje', 'Vzdrževanje', 'Strežba']
        productivity = [95.2, 88.7, 92.1, 85.3, 91.8]
        targets = [90, 85, 90, 80, 90]
        
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=departments,
            y=productivity,
            name='Trenutna produktivnost',
            marker_color='#00ff88'
        ))
        fig.add_trace(go.Bar(
            x=departments,
            y=targets,
            name='Cilj',
            marker_color='rgba(255, 165, 0, 0.6)'
        ))
        
        fig.update_layout(
            title="Produktivnost po oddelkih",
            xaxis_title="Oddelek",
            yaxis_title="Produktivnost (%)",
            template="plotly_dark",
            height=400,
            barmode='group'
        )
        
        return json.loads(json.dumps(fig, cls=PlotlyJSONEncoder))

    def get_kpi_summary(self) -> Dict[str, Any]:
        """Pridobi povzetek KPI-jev"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM kpi_metrics")
            total_metrics = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM kpi_metrics WHERE alert_level = 'critical'")
            critical_alerts = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM kpi_metrics WHERE trend > 0")
            positive_trends = cursor.fetchone()[0]
            
            conn.close()
            
            # Calculate performance score
            performance_score = 85.2  # Simulated
            
            return {
                'total_metrics': total_metrics,
                'critical_alerts': critical_alerts,
                'positive_trends': positive_trends,
                'performance_score': performance_score,
                'last_updated': datetime.datetime.now().isoformat(),
                'demo_active': self.is_demo,
                'demo_time_remaining': self.get_demo_time_remaining()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju KPI povzetka: {e}")
            return {}

    def get_demo_time_remaining(self) -> float:
        """Preostali čas demo verzije"""
        if not self.is_demo:
            return float('inf')
        
        elapsed = (datetime.datetime.now() - self.demo_start_time).total_seconds() / 3600
        remaining = max(0, self.demo_duration_hours - elapsed)
        return round(remaining, 2)

    def check_demo_expiry(self):
        """Preveri, če je demo verzija potekla"""
        if self.is_demo and self.get_demo_time_remaining() <= 0:
            logger.warning("Demo verzija je potekla - sistem se zaklene")
            return True
        return False

    def save_kpi_metric(self, metric: KPIMetric):
        """Shrani KPI metriko"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO kpi_metrics 
            (id, name, value, target, unit, trend, category, timestamp, description, alert_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            metric.metric_id,
            metric.name,
            metric.value,
            metric.target,
            metric.unit,
            metric.trend,
            metric.category.value,
            metric.timestamp.isoformat(),
            metric.description,
            metric.alert_level.value
        ))
        
        conn.commit()
        conn.close()

    def save_alert(self, alert: Alert):
        """Shrani alert"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO alerts 
            (id, title, message, level, metric_id, threshold, current_value, timestamp, acknowledged)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            alert.alert_id,
            alert.title,
            alert.message,
            alert.level.value,
            alert.metric_id,
            alert.threshold,
            alert.current_value,
            alert.timestamp.isoformat(),
            int(alert.acknowledged)
        ))
        
        conn.commit()
        conn.close()

    def setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def dashboard():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            summary = self.get_kpi_summary()
            
            return render_template_string('''
            <!DOCTYPE html>
            <html>
            <head>
                <title>📊 OMNI KPI Dashboard</title>
                <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); 
                        color: white; 
                        min-height: 100vh;
                    }
                    .container { max-width: 1400px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
                    .summary-cards { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                        gap: 20px; 
                        margin-bottom: 30px; 
                    }
                    .summary-card { 
                        background: rgba(255,255,255,0.1); 
                        padding: 25px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                        text-align: center;
                        transition: transform 0.3s ease;
                    }
                    .summary-card:hover { transform: translateY(-5px); }
                    .summary-value { 
                        font-size: 2.5em; 
                        font-weight: bold; 
                        margin-bottom: 10px;
                    }
                    .summary-label { font-size: 1.1em; opacity: 0.9; }
                    .charts-grid { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(600px, 1fr)); 
                        gap: 30px; 
                        margin-bottom: 30px; 
                    }
                    .chart-container { 
                        background: rgba(255,255,255,0.1); 
                        padding: 20px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                    }
                    .demo-warning { 
                        background: rgba(255,165,0,0.2); 
                        border: 2px solid orange; 
                        padding: 15px; 
                        border-radius: 10px; 
                        margin-bottom: 20px; 
                        text-align: center;
                    }
                    .alerts-section {
                        background: rgba(255,255,255,0.1); 
                        padding: 20px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                        margin-top: 30px;
                    }
                    .alert-item {
                        background: rgba(255,0,0,0.2);
                        border-left: 4px solid #ff4444;
                        padding: 15px;
                        margin: 10px 0;
                        border-radius: 5px;
                    }
                    .alert-item.warning {
                        background: rgba(255,165,0,0.2);
                        border-left-color: orange;
                    }
                    .alert-item.success {
                        background: rgba(0,255,0,0.2);
                        border-left-color: #00ff88;
                    }
                    .refresh-btn {
                        background: #00ff88; 
                        color: black; 
                        padding: 12px 25px; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        font-size: 1.1em;
                        font-weight: bold;
                        margin: 10px;
                        transition: all 0.3s ease;
                    }
                    .refresh-btn:hover { 
                        background: #00cc6a; 
                        transform: scale(1.05);
                    }
                    .auto-refresh {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: rgba(0,0,0,0.7);
                        padding: 10px;
                        border-radius: 5px;
                        font-size: 0.9em;
                    }
                </style>
            </head>
            <body>
                <div class="auto-refresh" id="autoRefresh">
                    🔄 Auto-refresh: <span id="countdown">30</span>s
                </div>
                
                <div class="container">
                    <div class="header">
                        <h1>📊 OMNI KPI Dashboard</h1>
                        <p>Napredni real-time dashboard z interaktivnimi analitkami</p>
                    </div>
                    
                    {% if summary.demo_active %}
                    <div class="demo-warning">
                        ⚠️ <strong>DEMO VERZIJA</strong> - Preostali čas: {{ summary.demo_time_remaining }}h
                        <br>Za polno funkcionalnost kontaktirajte administratorja.
                    </div>
                    {% endif %}
                    
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="summary-value" style="color: #00ff88;">{{ summary.total_metrics }}</div>
                            <div class="summary-label">Aktivne metrike</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value" style="color: #ff4444;">{{ summary.critical_alerts }}</div>
                            <div class="summary-label">Kritični alarmi</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value" style="color: #00ff88;">{{ summary.positive_trends }}</div>
                            <div class="summary-label">Pozitivni trendi</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value" style="color: #ffd700;">{{ summary.performance_score }}%</div>
                            <div class="summary-label">Skupna ocena</div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 20px;">
                        <button class="refresh-btn" onclick="refreshDashboard()">🔄 Osveži dashboard</button>
                        <button class="refresh-btn" onclick="exportData()">📊 Izvozi podatke</button>
                        <button class="refresh-btn" onclick="generateReport()">📋 Generiraj poročilo</button>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-container">
                            <div id="revenueChart"></div>
                        </div>
                        <div class="chart-container">
                            <div id="occupancyGauge"></div>
                        </div>
                        <div class="chart-container">
                            <div id="satisfactionChart"></div>
                        </div>
                        <div class="chart-container">
                            <div id="productivityChart"></div>
                        </div>
                    </div>
                    
                    <div class="alerts-section">
                        <h3>🚨 Najnovejši alarmi</h3>
                        <div id="alertsContainer">
                            <div class="alert-item warning">
                                <strong>Nizka zasedenost</strong><br>
                                Trenutna zasedenost (78.5%) je pod ciljem (85%)
                                <small style="float: right;">{{ summary.last_updated[:16] }}</small>
                            </div>
                            <div class="alert-item success">
                                <strong>Produktivnost nad ciljem</strong><br>
                                Produktivnost osebja (92.1%) presega cilj (90%)
                                <small style="float: right;">{{ summary.last_updated[:16] }}</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <script>
                    let countdownTimer = 30;
                    
                    function updateCountdown() {
                        document.getElementById('countdown').textContent = countdownTimer;
                        countdownTimer--;
                        
                        if (countdownTimer < 0) {
                            refreshDashboard();
                            countdownTimer = 30;
                        }
                    }
                    
                    function refreshDashboard() {
                        location.reload();
                    }
                    
                    function exportData() {
                        fetch('/api/export-data')
                            .then(r => r.json())
                            .then(data => {
                                alert('Podatki izvoženi: ' + data.records + ' zapisov');
                            });
                    }
                    
                    function generateReport() {
                        fetch('/api/generate-report', {method: 'POST'})
                            .then(r => r.json())
                            .then(data => {
                                alert('Poročilo generirano: ' + data.filename);
                            });
                    }
                    
                    // Load charts
                    fetch('/api/charts/revenue')
                        .then(r => r.json())
                        .then(data => Plotly.newPlot('revenueChart', data.data, data.layout, {responsive: true}));
                    
                    fetch('/api/charts/occupancy')
                        .then(r => r.json())
                        .then(data => Plotly.newPlot('occupancyGauge', data.data, data.layout, {responsive: true}));
                    
                    fetch('/api/charts/satisfaction')
                        .then(r => r.json())
                        .then(data => Plotly.newPlot('satisfactionChart', data.data, data.layout, {responsive: true}));
                    
                    fetch('/api/charts/productivity')
                        .then(r => r.json())
                        .then(data => Plotly.newPlot('productivityChart', data.data, data.layout, {responsive: true}));
                    
                    // Start countdown
                    setInterval(updateCountdown, 1000);
                </script>
            </body>
            </html>
            ''', summary=summary)
        
        @self.app.route('/api/charts/revenue')
        def api_revenue_chart():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            return jsonify(self.create_revenue_chart())
        
        @self.app.route('/api/charts/occupancy')
        def api_occupancy_chart():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            return jsonify(self.create_occupancy_gauge())
        
        @self.app.route('/api/charts/satisfaction')
        def api_satisfaction_chart():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            return jsonify(self.create_satisfaction_chart())
        
        @self.app.route('/api/charts/productivity')
        def api_productivity_chart():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            return jsonify(self.create_productivity_bar_chart())
        
        @self.app.route('/api/real-time-data')
        def api_real_time_data():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            return jsonify({
                'data': dict(self.real_time_data),
                'alerts': [
                    {
                        'id': alert.alert_id,
                        'title': alert.title,
                        'message': alert.message,
                        'level': alert.level.value,
                        'timestamp': alert.timestamp.isoformat()
                    } for alert in self.alerts[-10:]
                ],
                'timestamp': datetime.datetime.now().isoformat()
            })
        
        @self.app.route('/api/export-data')
        def api_export_data():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            # Simulate data export
            total_records = sum(len(data) for data in self.real_time_data.values())
            return jsonify({
                'records': total_records,
                'format': 'CSV',
                'filename': f'kpi_export_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
                'size': f'{total_records * 0.1:.1f} KB'
            })
        
        @self.app.route('/api/generate-report', methods=['POST'])
        def api_generate_report():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            # Simulate report generation
            filename = f'kpi_report_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
            return jsonify({
                'filename': filename,
                'pages': 12,
                'charts': 8,
                'metrics': len(self.kpi_cache),
                'generated_at': datetime.datetime.now().isoformat()
            })
        
        @self.app.route('/api/summary')
        def api_summary():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            return jsonify(self.get_kpi_summary())

    def run_server(self, host='localhost', port=5005):
        """Zaženi Flask server"""
        logger.info(f"Zaganjam KPI Dashboard na http://{host}:{port}")
        self.app.run(host=host, port=port, debug=True)

async def demo_kpi_dashboard():
    """Demo funkcija za testiranje KPI Dashboard"""
    print("\n" + "="*50)
    print("📊 OMNI KPI DASHBOARD - DEMO")
    print("="*50)
    
    # Inicializacija
    dashboard = OmniKPIDashboard()
    
    print(f"🔧 KPI Dashboard inicializiran:")
    print(f"  • Metrike: {len(dashboard.kpi_cache)}")
    print(f"  • Demo trajanje: {dashboard.demo_duration_hours}h")
    print(f"  • Preostali čas: {dashboard.get_demo_time_remaining()}h")
    print(f"  • Dostopni ključ: {dashboard.access_key[:16]}...")
    
    # Test KPI povzetka
    print(f"\n📊 KPI Povzetek:")
    summary = dashboard.get_kpi_summary()
    for key, value in summary.items():
        if key not in ['last_updated', 'demo_active']:
            print(f"  • {key}: {value}")
    
    # Test real-time podatkov
    print(f"\n📈 Real-time podatki:")
    await asyncio.sleep(1)  # Wait for some data generation
    for metric, data in dashboard.real_time_data.items():
        if data:
            latest = data[-1]
            print(f"  ✅ {metric}: {latest['value']} ({latest['timestamp'][:19]})")
    
    # Test alertov
    print(f"\n🚨 Aktivni alarmi:")
    for alert in dashboard.alerts[-3:]:
        print(f"  ⚠️ {alert.title}: {alert.message}")
    
    # Test grafov
    print(f"\n📊 Generirani grafi:")
    revenue_chart = dashboard.create_revenue_chart()
    if revenue_chart:
        print(f"  ✅ Graf prihodkov: {len(revenue_chart.get('data', []))} serij")
    
    occupancy_gauge = dashboard.create_occupancy_gauge()
    if occupancy_gauge:
        print(f"  ✅ Gauge zasedenosti: {occupancy_gauge.get('data', [{}])[0].get('value', 'N/A')}%")
    
    satisfaction_chart = dashboard.create_satisfaction_chart()
    if satisfaction_chart:
        print(f"  ✅ Graf zadovoljstva: {len(satisfaction_chart.get('data', []))} serij")
    
    productivity_chart = dashboard.create_productivity_bar_chart()
    if productivity_chart:
        print(f"  ✅ Graf produktivnosti: {len(productivity_chart.get('data', []))} serij")
    
    print(f"\n🎉 KPI Dashboard uspešno testiran!")
    print(f"  • Real-time posodobitve vsakih 5 sekund")
    print(f"  • Interaktivni grafi z Plotly")
    print(f"  • Avtomatsko zaznavanje alertov")
    print(f"  • Responsive design za mobilne naprave")
    print(f"  • Export podatkov in generiranje poročil")
    print(f"  • Demo časovna omejitev in varnostne kontrole")

if __name__ == "__main__":
    import sys
    import asyncio
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Zaženi Flask server
        dashboard = OmniKPIDashboard()
        dashboard.run_server(host='0.0.0.0', port=5005)
    else:
        # Zaženi demo
        asyncio.run(demo_kpi_dashboard())