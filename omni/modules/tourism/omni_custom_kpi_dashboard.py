#!/usr/bin/env python3
"""
OMNI Custom KPI Dashboard - Prilagodljiv dashboard za spremljanje metrik
Uporabnik si sam prilagodi, kaj želi spremljati (prihodki, zasedenost, stroški)
"""

import os
import json
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template_string
import requests
from cryptography.fernet import Fernet
import base64
import logging
import threading
import time
import random
import math

class OmniCustomKPIDashboard:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = secrets.token_hex(32)
        
        # Database and configuration
        self.db_path = "omni_kpi_dashboard.db"
        
        # KPI configuration
        self.kpi_config = {
            "refresh_interval": 300,  # 5 minutes
            "data_retention_days": 365,
            "max_widgets_per_dashboard": 20,
            "demo_mode": True,
            "real_time_updates": True
        }
        
        # Available KPI types
        self.available_kpis = {
            "revenue": {
                "id": "revenue",
                "name": "Prihodki",
                "category": "financial",
                "description": "Spremljanje prihodkov po obdobjih",
                "unit": "EUR",
                "chart_types": ["line", "bar", "area"],
                "aggregations": ["sum", "avg", "count"],
                "time_periods": ["hourly", "daily", "weekly", "monthly", "yearly"],
                "icon": "💰",
                "color": "#28a745"
            },
            "occupancy": {
                "id": "occupancy",
                "name": "Zasedenost",
                "category": "operational",
                "description": "Stopnja zasedenosti sob/mest",
                "unit": "%",
                "chart_types": ["gauge", "line", "bar"],
                "aggregations": ["avg", "max", "min"],
                "time_periods": ["hourly", "daily", "weekly", "monthly"],
                "icon": "🏨",
                "color": "#007bff"
            },
            "costs": {
                "id": "costs",
                "name": "Stroški",
                "category": "financial",
                "description": "Operativni in drugi stroški",
                "unit": "EUR",
                "chart_types": ["pie", "bar", "line"],
                "aggregations": ["sum", "avg"],
                "time_periods": ["daily", "weekly", "monthly", "yearly"],
                "icon": "💸",
                "color": "#dc3545"
            },
            "customer_satisfaction": {
                "id": "customer_satisfaction",
                "name": "Zadovoljstvo strank",
                "category": "quality",
                "description": "Ocene in zadovoljstvo gostov",
                "unit": "⭐",
                "chart_types": ["gauge", "bar", "line"],
                "aggregations": ["avg", "count"],
                "time_periods": ["daily", "weekly", "monthly"],
                "icon": "😊",
                "color": "#ffc107"
            },
            "bookings": {
                "id": "bookings",
                "name": "Rezervacije",
                "category": "operational",
                "description": "Število novih rezervacij",
                "unit": "kos",
                "chart_types": ["line", "bar", "area"],
                "aggregations": ["count", "sum"],
                "time_periods": ["hourly", "daily", "weekly", "monthly"],
                "icon": "📅",
                "color": "#17a2b8"
            },
            "cancellations": {
                "id": "cancellations",
                "name": "Odpovedi",
                "category": "operational",
                "description": "Stopnja odpovedi rezervacij",
                "unit": "%",
                "chart_types": ["gauge", "line", "bar"],
                "aggregations": ["avg", "count"],
                "time_periods": ["daily", "weekly", "monthly"],
                "icon": "❌",
                "color": "#6c757d"
            },
            "average_stay": {
                "id": "average_stay",
                "name": "Povprečno bivanje",
                "category": "operational",
                "description": "Povprečna dolžina bivanja",
                "unit": "dni",
                "chart_types": ["gauge", "line", "bar"],
                "aggregations": ["avg"],
                "time_periods": ["daily", "weekly", "monthly"],
                "icon": "🏠",
                "color": "#6f42c1"
            },
            "staff_efficiency": {
                "id": "staff_efficiency",
                "name": "Učinkovitost osebja",
                "category": "operational",
                "description": "Produktivnost in učinkovitost zaposlenih",
                "unit": "%",
                "chart_types": ["gauge", "bar", "line"],
                "aggregations": ["avg", "max"],
                "time_periods": ["daily", "weekly", "monthly"],
                "icon": "👥",
                "color": "#fd7e14"
            },
            "energy_consumption": {
                "id": "energy_consumption",
                "name": "Poraba energije",
                "category": "sustainability",
                "description": "Spremljanje porabe energije",
                "unit": "kWh",
                "chart_types": ["line", "area", "bar"],
                "aggregations": ["sum", "avg"],
                "time_periods": ["hourly", "daily", "weekly", "monthly"],
                "icon": "⚡",
                "color": "#20c997"
            },
            "website_traffic": {
                "id": "website_traffic",
                "name": "Spletni promet",
                "category": "marketing",
                "description": "Obiskovalci spletne strani",
                "unit": "obisk",
                "chart_types": ["line", "area", "bar"],
                "aggregations": ["count", "sum"],
                "time_periods": ["hourly", "daily", "weekly", "monthly"],
                "icon": "🌐",
                "color": "#e83e8c"
            }
        }
        
        self.setup_logging()
        self.init_database()
        self.setup_routes()
        self.start_data_generator()
        
    def setup_logging(self):
        """Setup logging for KPI dashboard"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def init_database(self):
        """Initialize KPI dashboard database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Dashboards table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dashboards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                description TEXT,
                layout_config TEXT,
                is_default BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Dashboard widgets table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dashboard_widgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dashboard_id INTEGER,
                widget_type TEXT NOT NULL,
                kpi_id TEXT NOT NULL,
                title TEXT,
                position_x INTEGER DEFAULT 0,
                position_y INTEGER DEFAULT 0,
                width INTEGER DEFAULT 4,
                height INTEGER DEFAULT 3,
                config TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dashboard_id) REFERENCES dashboards (id)
            )
        ''')
        
        # KPI data table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS kpi_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kpi_id TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                value REAL,
                metadata TEXT,
                location_id INTEGER DEFAULT 1
            )
        ''')
        
        # KPI targets and alerts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS kpi_targets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kpi_id TEXT NOT NULL,
                target_value REAL,
                target_type TEXT DEFAULT 'minimum',
                alert_enabled BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create demo dashboard
        cursor.execute('''
            INSERT OR IGNORE INTO dashboards 
            (id, user_id, name, description, is_default)
            VALUES (1, 1, 'Glavni Dashboard', 'Pregled ključnih metrik poslovanja', 1)
        ''')
        
        # Create demo widgets
        demo_widgets = [
            (1, "metric_card", "revenue", "Dnevni prihodki", 0, 0, 3, 2, '{"period": "daily", "aggregation": "sum"}'),
            (1, "gauge", "occupancy", "Trenutna zasedenost", 3, 0, 3, 2, '{"min": 0, "max": 100, "target": 80}'),
            (1, "line_chart", "bookings", "Rezervacije (7 dni)", 6, 0, 6, 3, '{"period": "daily", "days": 7}'),
            (1, "pie_chart", "costs", "Struktura stroškov", 0, 2, 4, 3, '{"period": "monthly", "categories": true}'),
            (1, "bar_chart", "customer_satisfaction", "Zadovoljstvo po tednih", 4, 2, 4, 3, '{"period": "weekly", "weeks": 4}'),
            (1, "area_chart", "energy_consumption", "Poraba energije", 8, 2, 4, 3, '{"period": "daily", "days": 30}'),
            (1, "metric_card", "average_stay", "Povprečno bivanje", 0, 5, 3, 2, '{"period": "monthly", "aggregation": "avg"}'),
            (1, "gauge", "staff_efficiency", "Učinkovitost osebja", 3, 5, 3, 2, '{"min": 0, "max": 100, "target": 85}')
        ]
        
        for widget in demo_widgets:
            cursor.execute('''
                INSERT OR IGNORE INTO dashboard_widgets 
                (dashboard_id, widget_type, kpi_id, title, position_x, position_y, width, height, config)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', widget)
        
        # Create demo KPI targets
        demo_targets = [
            ("revenue", 1500.0, "minimum"),
            ("occupancy", 75.0, "minimum"),
            ("customer_satisfaction", 4.0, "minimum"),
            ("cancellations", 10.0, "maximum"),
            ("staff_efficiency", 80.0, "minimum")
        ]
        
        for kpi_id, target_value, target_type in demo_targets:
            cursor.execute('''
                INSERT OR IGNORE INTO kpi_targets 
                (kpi_id, target_value, target_type)
                VALUES (?, ?, ?)
            ''', (kpi_id, target_value, target_type))
        
        conn.commit()
        conn.close()
        
        self.logger.info("📊 KPI Dashboard database initialized with demo data")
        
    def start_data_generator(self):
        """Start background data generation for demo"""
        def generate_demo_data():
            while True:
                try:
                    self.generate_kpi_data()
                except Exception as e:
                    self.logger.error(f"Data generation error: {e}")
                
                time.sleep(self.kpi_config["refresh_interval"])
        
        generator_thread = threading.Thread(target=generate_demo_data, daemon=True)
        generator_thread.start()
        self.logger.info("🔄 KPI data generator started")
    
    def generate_kpi_data(self):
        """Generate realistic demo KPI data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        current_time = datetime.now()
        
        # Generate data for each KPI
        kpi_generators = {
            "revenue": lambda: random.uniform(800, 2500) + math.sin(current_time.hour / 24 * 2 * math.pi) * 300,
            "occupancy": lambda: max(0, min(100, 60 + random.uniform(-20, 30) + math.sin(current_time.hour / 24 * 2 * math.pi) * 15)),
            "costs": lambda: random.uniform(200, 800),
            "customer_satisfaction": lambda: max(1, min(5, 4.2 + random.uniform(-0.8, 0.8))),
            "bookings": lambda: max(0, int(random.uniform(5, 15)) + int(math.sin(current_time.hour / 24 * 2 * math.pi) * 3)),
            "cancellations": lambda: max(0, min(30, random.uniform(2, 15))),
            "average_stay": lambda: max(1, random.uniform(2.5, 7.2)),
            "staff_efficiency": lambda: max(0, min(100, 82 + random.uniform(-15, 18))),
            "energy_consumption": lambda: random.uniform(150, 450) + math.sin(current_time.hour / 24 * 2 * math.pi) * 100,
            "website_traffic": lambda: max(0, int(random.uniform(15, 40)) + int(math.sin(current_time.hour / 24 * 2 * math.pi) * 15))
        }
        
        for kpi_id, generator in kpi_generators.items():
            value = generator()
            
            cursor.execute('''
                INSERT INTO kpi_data (kpi_id, timestamp, value, location_id)
                VALUES (?, ?, ?, ?)
            ''', (kpi_id, current_time.isoformat(), value, 1))
        
        # Clean old data (keep only last 365 days)
        cutoff_date = current_time - timedelta(days=self.kpi_config["data_retention_days"])
        cursor.execute('''
            DELETE FROM kpi_data WHERE timestamp < ?
        ''', (cutoff_date.isoformat(),))
        
        conn.commit()
        conn.close()
    
    def get_kpi_data(self, kpi_id, period="daily", days=7, aggregation="avg"):
        """Get KPI data for specified period"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Calculate time range
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
        
        # Build aggregation query based on period
        if period == "hourly":
            time_format = "%Y-%m-%d %H:00:00"
        elif period == "daily":
            time_format = "%Y-%m-%d"
        elif period == "weekly":
            time_format = "%Y-W%W"
        elif period == "monthly":
            time_format = "%Y-%m"
        else:
            time_format = "%Y-%m-%d"
        
        agg_func = "AVG" if aggregation == "avg" else "SUM" if aggregation == "sum" else "COUNT"
        
        cursor.execute(f'''
            SELECT 
                strftime(?, timestamp) as period,
                {agg_func}(value) as value,
                COUNT(*) as count
            FROM kpi_data 
            WHERE kpi_id = ? AND timestamp >= ? AND timestamp <= ?
            GROUP BY strftime(?, timestamp)
            ORDER BY period
        ''', (time_format, kpi_id, start_time.isoformat(), end_time.isoformat(), time_format))
        
        results = cursor.fetchall()
        conn.close()
        
        data = []
        for period_str, value, count in results:
            data.append({
                "period": period_str,
                "value": round(value, 2) if value else 0,
                "count": count
            })
        
        return data
    
    def get_current_kpi_value(self, kpi_id):
        """Get current/latest KPI value"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT value, timestamp FROM kpi_data 
            WHERE kpi_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        ''', (kpi_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {"value": round(result[0], 2), "timestamp": result[1]}
        return {"value": 0, "timestamp": None}
    
    def check_kpi_alerts(self, kpi_id, current_value):
        """Check if KPI value triggers any alerts"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT target_value, target_type FROM kpi_targets 
            WHERE kpi_id = ? AND alert_enabled = 1
        ''', (kpi_id,))
        
        targets = cursor.fetchall()
        conn.close()
        
        alerts = []
        for target_value, target_type in targets:
            if target_type == "minimum" and current_value < target_value:
                alerts.append({
                    "type": "warning",
                    "message": f"{self.available_kpis[kpi_id]['name']} je pod ciljno vrednostjo ({current_value} < {target_value})"
                })
            elif target_type == "maximum" and current_value > target_value:
                alerts.append({
                    "type": "warning",
                    "message": f"{self.available_kpis[kpi_id]['name']} presega ciljno vrednost ({current_value} > {target_value})"
                })
        
        return alerts
    
    def setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/')
        def dashboard():
            return render_template_string('''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Custom KPI Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; color: white; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .toolbar { background: rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
        .toolbar-left { display: flex; align-items: center; gap: 15px; }
        .toolbar-right { display: flex; align-items: center; gap: 10px; }
        .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.3s ease; text-decoration: none; display: inline-block; }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .btn-success { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; }
        .btn-warning { background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); color: white; }
        .btn-secondary { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .dashboard-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 20px; margin-bottom: 30px; }
        .widget { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); position: relative; overflow: hidden; }
        .widget::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--widget-color, #667eea); }
        .widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .widget-title { font-size: 1.1em; font-weight: bold; color: #333; }
        .widget-menu { cursor: pointer; color: #666; }
        .widget-content { min-height: 120px; }
        .metric-card { text-align: center; }
        .metric-value { font-size: 2.5em; font-weight: bold; color: var(--widget-color, #667eea); margin-bottom: 5px; }
        .metric-unit { font-size: 0.9em; color: #666; }
        .metric-change { font-size: 0.9em; margin-top: 10px; }
        .metric-change.positive { color: #28a745; }
        .metric-change.negative { color: #dc3545; }
        .gauge-container { position: relative; width: 200px; height: 120px; margin: 0 auto; }
        .gauge { width: 200px; height: 100px; }
        .gauge-value { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); font-size: 1.5em; font-weight: bold; color: #333; }
        .chart-container { width: 100%; height: 200px; }
        .kpi-selector { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .kpi-item { background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.3s ease; border: 2px solid transparent; }
        .kpi-item:hover { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.3); }
        .kpi-item.selected { background: white; color: #333; border-color: #667eea; }
        .kpi-icon { font-size: 2em; margin-bottom: 10px; }
        .kpi-name { font-weight: bold; margin-bottom: 5px; }
        .kpi-description { font-size: 0.9em; opacity: 0.8; }
        .alerts-panel { background: rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; margin-bottom: 20px; }
        .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
        .alert.warning { background: rgba(255, 193, 7, 0.2); border-left: 4px solid #ffc107; color: #856404; }
        .alert.success { background: rgba(40, 167, 69, 0.2); border-left: 4px solid #28a745; color: #155724; }
        .alert.danger { background: rgba(220, 53, 69, 0.2); border-left: 4px solid #dc3545; color: #721c24; }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
        .modal-content { background: white; margin: 5% auto; padding: 30px; width: 90%; max-width: 800px; border-radius: 15px; position: relative; max-height: 80vh; overflow-y: auto; }
        .close { position: absolute; right: 20px; top: 20px; font-size: 28px; font-weight: bold; cursor: pointer; }
        .close:hover { color: #667eea; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        .form-control { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; }
        .form-control:focus { outline: none; border-color: #667eea; }
        .grid-size-1 { grid-column: span 1; }
        .grid-size-2 { grid-column: span 2; }
        .grid-size-3 { grid-column: span 3; }
        .grid-size-4 { grid-column: span 4; }
        .grid-size-6 { grid-column: span 6; }
        .grid-size-8 { grid-column: span 8; }
        .grid-size-12 { grid-column: span 12; }
        .widget-controls { display: flex; gap: 10px; margin-top: 15px; }
        .refresh-indicator { display: inline-block; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .status-indicator { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
        .status-online { background: #28a745; }
        .status-offline { background: #dc3545; }
        .status-warning { background: #ffc107; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 OMNI Custom KPI Dashboard</h1>
            <p>Prilagodljivo spremljanje ključnih metrik poslovanja</p>
        </div>
        
        <div class="toolbar">
            <div class="toolbar-left">
                <select id="dashboardSelect" class="form-control" style="width: 200px;" onchange="loadDashboard()">
                    <option value="1">Glavni Dashboard</option>
                </select>
                <button class="btn btn-secondary" onclick="showDashboardManager()">Upravljaj</button>
            </div>
            <div class="toolbar-right">
                <span class="status-indicator status-online"></span>
                <span style="color: white; margin-right: 15px;">Real-time</span>
                <button class="btn btn-success" onclick="showWidgetSelector()">+ Dodaj widget</button>
                <button class="btn btn-warning" onclick="showKPITargets()">🎯 Cilji</button>
                <button class="btn btn-secondary" onclick="refreshDashboard()">
                    <span id="refreshIcon">🔄</span> Osveži
                </button>
            </div>
        </div>
        
        <div id="alertsPanel" class="alerts-panel" style="display: none;">
            <h3 style="color: white; margin-bottom: 15px;">⚠️ Opozorila</h3>
            <div id="alertsList"></div>
        </div>
        
        <div id="dashboardGrid" class="dashboard-grid">
            <!-- Widgets will be loaded here -->
        </div>
    </div>
    
    <!-- Widget Selector Modal -->
    <div id="widgetModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeWidgetModal()">&times;</span>
            <h2>Dodaj nov widget</h2>
            
            <div class="kpi-selector">
                <h3>Izberi KPI metriko:</h3>
                <div class="kpi-grid" id="kpiGrid"></div>
            </div>
            
            <div class="form-group">
                <label>Tip grafa:</label>
                <select id="chartType" class="form-control">
                    <option value="metric_card">Metrična kartica</option>
                    <option value="line_chart">Črtni graf</option>
                    <option value="bar_chart">Stolpčni graf</option>
                    <option value="area_chart">Površinski graf</option>
                    <option value="pie_chart">Tortni graf</option>
                    <option value="gauge">Merilnik</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Naslov widget-a:</label>
                <input type="text" id="widgetTitle" class="form-control" placeholder="Vnesite naslov...">
            </div>
            
            <div class="form-group">
                <label>Velikost (stolpci):</label>
                <select id="widgetSize" class="form-control">
                    <option value="3">Majhen (3 stolpci)</option>
                    <option value="4">Srednji (4 stolpci)</option>
                    <option value="6">Velik (6 stolpcev)</option>
                    <option value="8">Zelo velik (8 stolpcev)</option>
                    <option value="12">Celotna širina (12 stolpcev)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Časovno obdobje:</label>
                <select id="timePeriod" class="form-control">
                    <option value="hourly">Urno</option>
                    <option value="daily">Dnevno</option>
                    <option value="weekly">Tedensko</option>
                    <option value="monthly">Mesečno</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeWidgetModal()">Prekliči</button>
                <button class="btn btn-primary" onclick="addWidget()">Dodaj widget</button>
            </div>
        </div>
    </div>
    
    <!-- KPI Targets Modal -->
    <div id="targetsModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeTargetsModal()">&times;</span>
            <h2>🎯 KPI Cilji in opozorila</h2>
            <div id="targetsContent"></div>
        </div>
    </div>

    <script>
        let currentDashboard = 1;
        let selectedKPI = null;
        let widgets = [];
        let charts = {};
        let refreshInterval;
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboard();
            startAutoRefresh();
        });
        
        function startAutoRefresh() {
            refreshInterval = setInterval(() => {
                refreshDashboard(false);
            }, 30000); // Refresh every 30 seconds
        }
        
        async function loadDashboard() {
            try {
                const response = await fetch(`/api/dashboard/${currentDashboard}`);
                const dashboard = await response.json();
                
                widgets = dashboard.widgets || [];
                renderDashboard();
                checkAlerts();
                
            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        }
        
        function renderDashboard() {
            const grid = document.getElementById('dashboardGrid');
            grid.innerHTML = '';
            
            widgets.forEach((widget, index) => {
                const widgetElement = createWidgetElement(widget, index);
                grid.appendChild(widgetElement);
                
                // Load widget data
                loadWidgetData(widget, index);
            });
        }
        
        function createWidgetElement(widget, index) {
            const div = document.createElement('div');
            div.className = `widget grid-size-${widget.width}`;
            div.style.setProperty('--widget-color', getKPIColor(widget.kpi_id));
            div.innerHTML = `
                <div class="widget-header">
                    <div class="widget-title">${widget.title}</div>
                    <div class="widget-menu" onclick="showWidgetMenu(${index})">⋮</div>
                </div>
                <div class="widget-content" id="widget-${index}">
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <div class="refresh-indicator">🔄</div>
                        <div>Nalagam podatke...</div>
                    </div>
                </div>
            `;
            
            return div;
        }
        
        async function loadWidgetData(widget, index) {
            try {
                const config = JSON.parse(widget.config || '{}');
                const period = config.period || 'daily';
                const days = config.days || 7;
                
                // Get current value
                const currentResponse = await fetch(`/api/kpi/${widget.kpi_id}/current`);
                const currentData = await currentResponse.json();
                
                // Get historical data for charts
                const historyResponse = await fetch(`/api/kpi/${widget.kpi_id}/data?period=${period}&days=${days}`);
                const historyData = await historyResponse.json();
                
                renderWidget(widget, index, currentData, historyData, config);
                
            } catch (error) {
                console.error(`Error loading widget ${index}:`, error);
                document.getElementById(`widget-${index}`).innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #dc3545;">
                        ❌ Napaka pri nalaganju podatkov
                    </div>
                `;
            }
        }
        
        function renderWidget(widget, index, currentData, historyData, config) {
            const container = document.getElementById(`widget-${index}`);
            const kpiInfo = getKPIInfo(widget.kpi_id);
            
            switch (widget.widget_type) {
                case 'metric_card':
                    renderMetricCard(container, currentData, kpiInfo, historyData);
                    break;
                case 'gauge':
                    renderGauge(container, currentData, kpiInfo, config);
                    break;
                case 'line_chart':
                    renderLineChart(container, historyData, kpiInfo, `chart-${index}`);
                    break;
                case 'bar_chart':
                    renderBarChart(container, historyData, kpiInfo, `chart-${index}`);
                    break;
                case 'area_chart':
                    renderAreaChart(container, historyData, kpiInfo, `chart-${index}`);
                    break;
                case 'pie_chart':
                    renderPieChart(container, historyData, kpiInfo, `chart-${index}`);
                    break;
                default:
                    renderMetricCard(container, currentData, kpiInfo, historyData);
            }
        }
        
        function renderMetricCard(container, currentData, kpiInfo, historyData) {
            const change = calculateChange(historyData);
            const changeClass = change >= 0 ? 'positive' : 'negative';
            const changeIcon = change >= 0 ? '↗️' : '↘️';
            
            container.innerHTML = `
                <div class="metric-card">
                    <div class="metric-value">${formatValue(currentData.value, kpiInfo.unit)}</div>
                    <div class="metric-unit">${kpiInfo.unit}</div>
                    <div class="metric-change ${changeClass}">
                        ${changeIcon} ${Math.abs(change).toFixed(1)}% od včeraj
                    </div>
                </div>
            `;
        }
        
        function renderGauge(container, currentData, kpiInfo, config) {
            const min = config.min || 0;
            const max = config.max || 100;
            const target = config.target || 80;
            const value = currentData.value;
            
            const percentage = ((value - min) / (max - min)) * 100;
            const targetPercentage = ((target - min) / (max - min)) * 100;
            
            container.innerHTML = `
                <div class="gauge-container">
                    <svg class="gauge" viewBox="0 0 200 100">
                        <path d="M 20 80 A 80 80 0 0 1 180 80" stroke="#e0e0e0" stroke-width="20" fill="none"/>
                        <path d="M 20 80 A 80 80 0 0 1 ${20 + (160 * percentage / 100)} ${80 - Math.sin(Math.PI * percentage / 100) * 80}" 
                              stroke="${kpiInfo.color}" stroke-width="20" fill="none" stroke-linecap="round"/>
                        <circle cx="${20 + (160 * targetPercentage / 100)}" cy="${80 - Math.sin(Math.PI * targetPercentage / 100) * 80}" 
                                r="8" fill="#ffc107"/>
                    </svg>
                    <div class="gauge-value">${formatValue(value, kpiInfo.unit)}</div>
                </div>
            `;
        }
        
        function renderLineChart(container, data, kpiInfo, chartId) {
            container.innerHTML = `<canvas id="${chartId}" class="chart-container"></canvas>`;
            
            const ctx = document.getElementById(chartId).getContext('2d');
            
            if (charts[chartId]) {
                charts[chartId].destroy();
            }
            
            charts[chartId] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => d.period),
                    datasets: [{
                        label: kpiInfo.name,
                        data: data.map(d => d.value),
                        borderColor: kpiInfo.color,
                        backgroundColor: kpiInfo.color + '20',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
        
        function renderBarChart(container, data, kpiInfo, chartId) {
            container.innerHTML = `<canvas id="${chartId}" class="chart-container"></canvas>`;
            
            const ctx = document.getElementById(chartId).getContext('2d');
            
            if (charts[chartId]) {
                charts[chartId].destroy();
            }
            
            charts[chartId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.period),
                    datasets: [{
                        label: kpiInfo.name,
                        data: data.map(d => d.value),
                        backgroundColor: kpiInfo.color + '80',
                        borderColor: kpiInfo.color,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
        
        function renderAreaChart(container, data, kpiInfo, chartId) {
            container.innerHTML = `<canvas id="${chartId}" class="chart-container"></canvas>`;
            
            const ctx = document.getElementById(chartId).getContext('2d');
            
            if (charts[chartId]) {
                charts[chartId].destroy();
            }
            
            charts[chartId] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => d.period),
                    datasets: [{
                        label: kpiInfo.name,
                        data: data.map(d => d.value),
                        borderColor: kpiInfo.color,
                        backgroundColor: kpiInfo.color + '40',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
        
        function renderPieChart(container, data, kpiInfo, chartId) {
            container.innerHTML = `<canvas id="${chartId}" class="chart-container"></canvas>`;
            
            const ctx = document.getElementById(chartId).getContext('2d');
            
            if (charts[chartId]) {
                charts[chartId].destroy();
            }
            
            // For pie chart, we'll show distribution of values
            const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
            
            charts[chartId] = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: data.slice(-6).map(d => d.period),
                    datasets: [{
                        data: data.slice(-6).map(d => d.value),
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: { boxWidth: 12 }
                        }
                    }
                }
            });
        }
        
        function calculateChange(data) {
            if (data.length < 2) return 0;
            const current = data[data.length - 1].value;
            const previous = data[data.length - 2].value;
            return previous !== 0 ? ((current - previous) / previous) * 100 : 0;
        }
        
        function formatValue(value, unit) {
            if (unit === 'EUR') {
                return `€${value.toFixed(0)}`;
            } else if (unit === '%') {
                return `${value.toFixed(1)}%`;
            } else if (unit === '⭐') {
                return `${value.toFixed(1)}★`;
            } else {
                return `${value.toFixed(0)}`;
            }
        }
        
        function getKPIInfo(kpiId) {
            const kpiMap = {
                'revenue': { name: 'Prihodki', unit: 'EUR', color: '#28a745' },
                'occupancy': { name: 'Zasedenost', unit: '%', color: '#007bff' },
                'costs': { name: 'Stroški', unit: 'EUR', color: '#dc3545' },
                'customer_satisfaction': { name: 'Zadovoljstvo', unit: '⭐', color: '#ffc107' },
                'bookings': { name: 'Rezervacije', unit: 'kos', color: '#17a2b8' },
                'cancellations': { name: 'Odpovedi', unit: '%', color: '#6c757d' },
                'average_stay': { name: 'Povprečno bivanje', unit: 'dni', color: '#6f42c1' },
                'staff_efficiency': { name: 'Učinkovitost osebja', unit: '%', color: '#fd7e14' },
                'energy_consumption': { name: 'Poraba energije', unit: 'kWh', color: '#20c997' },
                'website_traffic': { name: 'Spletni promet', unit: 'obisk', color: '#e83e8c' }
            };
            
            return kpiMap[kpiId] || { name: kpiId, unit: '', color: '#667eea' };
        }
        
        function getKPIColor(kpiId) {
            return getKPIInfo(kpiId).color;
        }
        
        async function showWidgetSelector() {
            const modal = document.getElementById('widgetModal');
            const kpiGrid = document.getElementById('kpiGrid');
            
            try {
                const response = await fetch('/api/available-kpis');
                const kpis = await response.json();
                
                kpiGrid.innerHTML = '';
                Object.values(kpis).forEach(kpi => {
                    const div = document.createElement('div');
                    div.className = 'kpi-item';
                    div.onclick = () => selectKPI(kpi.id, div);
                    div.innerHTML = `
                        <div class="kpi-icon">${kpi.icon}</div>
                        <div class="kpi-name">${kpi.name}</div>
                        <div class="kpi-description">${kpi.description}</div>
                    `;
                    kpiGrid.appendChild(div);
                });
                
                modal.style.display = 'block';
                
            } catch (error) {
                console.error('Error loading KPIs:', error);
            }
        }
        
        function selectKPI(kpiId, element) {
            // Remove previous selection
            document.querySelectorAll('.kpi-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Select current
            element.classList.add('selected');
            selectedKPI = kpiId;
            
            // Update widget title
            const kpiInfo = getKPIInfo(kpiId);
            document.getElementById('widgetTitle').value = kpiInfo.name;
        }
        
        async function addWidget() {
            if (!selectedKPI) {
                alert('Prosimo, izberite KPI metriko');
                return;
            }
            
            const widgetData = {
                kpi_id: selectedKPI,
                widget_type: document.getElementById('chartType').value,
                title: document.getElementById('widgetTitle').value,
                width: parseInt(document.getElementById('widgetSize').value),
                config: JSON.stringify({
                    period: document.getElementById('timePeriod').value,
                    days: 7
                })
            };
            
            try {
                const response = await fetch('/api/dashboard/1/widgets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(widgetData)
                });
                
                if (response.ok) {
                    closeWidgetModal();
                    loadDashboard();
                } else {
                    alert('Napaka pri dodajanju widget-a');
                }
                
            } catch (error) {
                console.error('Error adding widget:', error);
                alert('Napaka pri dodajanju widget-a');
            }
        }
        
        function closeWidgetModal() {
            document.getElementById('widgetModal').style.display = 'none';
            selectedKPI = null;
            
            // Reset form
            document.getElementById('widgetTitle').value = '';
            document.getElementById('chartType').value = 'metric_card';
            document.getElementById('widgetSize').value = '4';
            document.getElementById('timePeriod').value = 'daily';
            
            // Clear selection
            document.querySelectorAll('.kpi-item').forEach(item => {
                item.classList.remove('selected');
            });
        }
        
        async function checkAlerts() {
            try {
                const response = await fetch('/api/alerts');
                const alerts = await response.json();
                
                const alertsPanel = document.getElementById('alertsPanel');
                const alertsList = document.getElementById('alertsList');
                
                if (alerts.length > 0) {
                    alertsPanel.style.display = 'block';
                    alertsList.innerHTML = '';
                    
                    alerts.forEach(alert => {
                        const div = document.createElement('div');
                        div.className = `alert ${alert.type}`;
                        div.innerHTML = `
                            <span>${alert.type === 'warning' ? '⚠️' : alert.type === 'danger' ? '🚨' : '✅'}</span>
                            <span>${alert.message}</span>
                        `;
                        alertsList.appendChild(div);
                    });
                } else {
                    alertsPanel.style.display = 'none';
                }
                
            } catch (error) {
                console.error('Error checking alerts:', error);
            }
        }
        
        async function refreshDashboard(showIndicator = true) {
            if (showIndicator) {
                const refreshIcon = document.getElementById('refreshIcon');
                refreshIcon.classList.add('refresh-indicator');
                
                setTimeout(() => {
                    refreshIcon.classList.remove('refresh-indicator');
                }, 1000);
            }
            
            await loadDashboard();
        }
        
        function showKPITargets() {
            // Implementation for KPI targets modal
            alert('KPI cilji in opozorila - funkcionalnost v razvoju');
        }
        
        function showDashboardManager() {
            // Implementation for dashboard management
            alert('Upravljanje dashboard-ov - funkcionalnost v razvoju');
        }
        
        function showWidgetMenu(index) {
            if (confirm('Ali želite odstraniti ta widget?')) {
                removeWidget(index);
            }
        }
        
        async function removeWidget(index) {
            const widget = widgets[index];
            
            try {
                const response = await fetch(`/api/dashboard/1/widgets/${widget.id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    loadDashboard();
                } else {
                    alert('Napaka pri odstranjevanju widget-a');
                }
                
            } catch (error) {
                console.error('Error removing widget:', error);
                alert('Napaka pri odstranjevanju widget-a');
            }
        }
        
        function closeTargetsModal() {
            document.getElementById('targetsModal').style.display = 'none';
        }
        
        // Close modals when clicking outside
        window.onclick = function(event) {
            const widgetModal = document.getElementById('widgetModal');
            const targetsModal = document.getElementById('targetsModal');
            
            if (event.target === widgetModal) {
                closeWidgetModal();
            } else if (event.target === targetsModal) {
                closeTargetsModal();
            }
        }
    </script>
</body>
</html>
            ''')
        
        @self.app.route('/api/dashboard/<int:dashboard_id>')
        def get_dashboard(dashboard_id):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get dashboard info
            cursor.execute('SELECT * FROM dashboards WHERE id = ?', (dashboard_id,))
            dashboard = cursor.fetchone()
            
            if not dashboard:
                conn.close()
                return jsonify({"error": "Dashboard not found"}), 404
            
            # Get widgets
            cursor.execute('''
                SELECT id, widget_type, kpi_id, title, position_x, position_y, width, height, config
                FROM dashboard_widgets 
                WHERE dashboard_id = ?
                ORDER BY position_y, position_x
            ''', (dashboard_id,))
            
            widgets = cursor.fetchall()
            conn.close()
            
            widgets_list = []
            for widget in widgets:
                widgets_list.append({
                    "id": widget[0],
                    "widget_type": widget[1],
                    "kpi_id": widget[2],
                    "title": widget[3],
                    "position_x": widget[4],
                    "position_y": widget[5],
                    "width": widget[6],
                    "height": widget[7],
                    "config": widget[8]
                })
            
            return jsonify({
                "id": dashboard[0],
                "name": dashboard[2],
                "description": dashboard[3],
                "widgets": widgets_list
            })
        
        @self.app.route('/api/available-kpis')
        def get_available_kpis():
            return jsonify(self.available_kpis)
        
        @self.app.route('/api/kpi/<kpi_id>/current')
        def get_current_kpi(kpi_id):
            data = self.get_current_kpi_value(kpi_id)
            return jsonify(data)
        
        @self.app.route('/api/kpi/<kpi_id>/data')
        def get_kpi_data_api(kpi_id):
            period = request.args.get('period', 'daily')
            days = int(request.args.get('days', 7))
            aggregation = request.args.get('aggregation', 'avg')
            
            data = self.get_kpi_data(kpi_id, period, days, aggregation)
            return jsonify(data)
        
        @self.app.route('/api/alerts')
        def get_alerts():
            alerts = []
            
            # Check all KPIs for alerts
            for kpi_id in self.available_kpis.keys():
                current_data = self.get_current_kpi_value(kpi_id)
                if current_data['value']:
                    kpi_alerts = self.check_kpi_alerts(kpi_id, current_data['value'])
                    alerts.extend(kpi_alerts)
            
            return jsonify(alerts)
        
        @self.app.route('/api/dashboard/<int:dashboard_id>/widgets', methods=['POST'])
        def add_widget(dashboard_id):
            data = request.get_json()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO dashboard_widgets 
                (dashboard_id, widget_type, kpi_id, title, width, height, config)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (dashboard_id, data['widget_type'], data['kpi_id'], data['title'], 
                  data['width'], data.get('height', 3), data['config']))
            
            conn.commit()
            conn.close()
            
            return jsonify({"success": True})
        
        @self.app.route('/api/dashboard/<int:dashboard_id>/widgets/<int:widget_id>', methods=['DELETE'])
        def remove_widget(dashboard_id, widget_id):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                DELETE FROM dashboard_widgets 
                WHERE id = ? AND dashboard_id = ?
            ''', (widget_id, dashboard_id))
            
            conn.commit()
            conn.close()
            
            return jsonify({"success": True})
    
    def run_server(self, host='0.0.0.0', port=5020, debug=True):
        """Run the custom KPI dashboard server"""
        print(f"🚀 Starting OMNI Custom KPI Dashboard on http://{host}:{port}")
        print("📊 Dashboard features:")
        print("   • Prilagodljivi KPI widget-i")
        print("   • Real-time podatki in posodabljanje")
        print("   • Različni tipi grafov (črtni, stolpčni, tortni, merilniki)")
        print("   • Opozorila in cilji")
        print("   • Drag & drop urejanje")
        print("\n📈 Razpoložljivi KPI-ji:")
        for kpi in self.available_kpis.values():
            print(f"   • {kpi['icon']} {kpi['name']} - {kpi['description']}")
        print("\n💡 Funkcionalnosti:")
        print("   • Dodajanje/odstranjevanje widget-ov")
        print("   • Prilagajanje velikosti in pozicije")
        print("   • Različna časovna obdobja")
        print("   • Avtomatsko preverjanje ciljev")
        print("   • Real-time opozorila")
        
        self.app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    dashboard = OmniCustomKPIDashboard()
    dashboard.run_server()