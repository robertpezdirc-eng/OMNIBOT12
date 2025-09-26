"""
🏨 Advanced Tourism Dashboard - Napredni Dashboard za Turizem in Gostinstvo
Avtor: Omni AI Platform
Verzija: 1.0.0

Funkcionalnosti:
- Real-time pregled poslovanja (prodaja, zaloge, rezervacije)
- Grafi trendov in profitabilnosti (mesečno, sezonsko, letno)
- Heatmaps za goste in izkušnje
- KPI indikatorji (uspešnost zaposlenih, zadovoljstvo gostov)
- Interaktivni dashboard s filtriranjem
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import numpy as np

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DashboardType(Enum):
    OVERVIEW = "overview"
    SALES = "sales"
    RESERVATIONS = "reservations"
    INVENTORY = "inventory"
    STAFF = "staff"
    GUESTS = "guests"
    FINANCIAL = "financial"

class TimeRange(Enum):
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    CUSTOM = "custom"

class MetricType(Enum):
    REVENUE = "revenue"
    OCCUPANCY = "occupancy"
    SATISFACTION = "satisfaction"
    EFFICIENCY = "efficiency"
    COST = "cost"

@dataclass
class KPIMetric:
    metric_id: str
    name: str
    value: float
    target: float
    unit: str
    trend: float  # % sprememba
    status: str  # "good", "warning", "critical"
    description: str
    last_updated: datetime

@dataclass
class DashboardWidget:
    widget_id: str
    title: str
    widget_type: str  # "chart", "kpi", "table", "heatmap"
    data: Dict[str, Any]
    config: Dict[str, Any]
    position: Dict[str, int]  # x, y, width, height
    refresh_interval: int  # sekunde

@dataclass
class HeatmapData:
    x_axis: List[str]
    y_axis: List[str]
    values: List[List[float]]
    labels: List[List[str]]
    colorscale: str

class AdvancedDashboard:
    def __init__(self, db_path: str = "tourism_dashboard.db"):
        self.db_path = db_path
        self.init_database()
        logger.info("🏨 Advanced Dashboard inicializiran")
    
    def init_database(self):
        """Inicializiraj bazo podatkov"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Tabela za KPI metrike
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS kpi_metrics (
                        metric_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        value REAL NOT NULL,
                        target REAL NOT NULL,
                        unit TEXT NOT NULL,
                        trend REAL DEFAULT 0,
                        status TEXT DEFAULT 'good',
                        description TEXT,
                        category TEXT,
                        last_updated TEXT NOT NULL
                    )
                ''')
                
                # Tabela za dashboard widgete
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS dashboard_widgets (
                        widget_id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        widget_type TEXT NOT NULL,
                        data TEXT,
                        config TEXT,
                        position TEXT,
                        refresh_interval INTEGER DEFAULT 300,
                        dashboard_type TEXT,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                # Tabela za zgodovinske podatke
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS historical_data (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        metric_type TEXT NOT NULL,
                        date TEXT NOT NULL,
                        value REAL NOT NULL,
                        metadata TEXT,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                # Tabela za heatmap podatke
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS heatmap_data (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        heatmap_type TEXT NOT NULL,
                        x_coordinate TEXT NOT NULL,
                        y_coordinate TEXT NOT NULL,
                        value REAL NOT NULL,
                        label TEXT,
                        date TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                conn.commit()
                
                # Naloži vzorčne podatke
                self._load_sample_data()
                
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji baze: {e}")
    
    def _load_sample_data(self):
        """Naloži vzorčne podatke"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Preveri, če podatki že obstajajo
                cursor.execute("SELECT COUNT(*) FROM kpi_metrics")
                if cursor.fetchone()[0] > 0:
                    return
                
                # Vzorčni KPI podatki
                sample_kpis = [
                    {
                        "metric_id": "revenue_today",
                        "name": "Dnevni prihodek",
                        "value": 15420.50,
                        "target": 18000.00,
                        "unit": "EUR",
                        "trend": 12.5,
                        "status": "warning",
                        "description": "Skupni prihodek za danes",
                        "category": "financial"
                    },
                    {
                        "metric_id": "occupancy_rate",
                        "name": "Zasedenost",
                        "value": 87.5,
                        "target": 90.0,
                        "unit": "%",
                        "trend": -2.1,
                        "status": "good",
                        "description": "Trenutna zasedenost sob/miz",
                        "category": "operations"
                    },
                    {
                        "metric_id": "guest_satisfaction",
                        "name": "Zadovoljstvo gostov",
                        "value": 4.6,
                        "target": 4.5,
                        "unit": "/5",
                        "trend": 8.2,
                        "status": "good",
                        "description": "Povprečna ocena zadovoljstva",
                        "category": "service"
                    },
                    {
                        "metric_id": "staff_efficiency",
                        "name": "Učinkovitost osebja",
                        "value": 92.3,
                        "target": 95.0,
                        "unit": "%",
                        "trend": 5.7,
                        "status": "good",
                        "description": "Produktivnost zaposlenih",
                        "category": "hr"
                    },
                    {
                        "metric_id": "inventory_turnover",
                        "name": "Obrat zalog",
                        "value": 6.8,
                        "target": 8.0,
                        "unit": "x",
                        "trend": -12.3,
                        "status": "critical",
                        "description": "Hitrost obrata zalog",
                        "category": "inventory"
                    }
                ]
                
                for kpi in sample_kpis:
                    cursor.execute('''
                        INSERT OR REPLACE INTO kpi_metrics 
                        (metric_id, name, value, target, unit, trend, status, description, category, last_updated)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        kpi["metric_id"],
                        kpi["name"],
                        kpi["value"],
                        kpi["target"],
                        kpi["unit"],
                        kpi["trend"],
                        kpi["status"],
                        kpi["description"],
                        kpi["category"],
                        datetime.now().isoformat()
                    ))
                
                # Vzorčni zgodovinski podatki
                base_date = datetime.now() - timedelta(days=30)
                for i in range(30):
                    date = base_date + timedelta(days=i)
                    
                    # Simuliraj dnevne prihodke
                    revenue = 12000 + np.random.normal(3000, 1000)
                    cursor.execute('''
                        INSERT INTO historical_data (metric_type, date, value, created_at)
                        VALUES (?, ?, ?, ?)
                    ''', ("revenue", date.strftime("%Y-%m-%d"), revenue, datetime.now().isoformat()))
                    
                    # Simuliraj zasedenost
                    occupancy = 70 + np.random.normal(15, 10)
                    occupancy = max(0, min(100, occupancy))
                    cursor.execute('''
                        INSERT INTO historical_data (metric_type, date, value, created_at)
                        VALUES (?, ?, ?, ?)
                    ''', ("occupancy", date.strftime("%Y-%m-%d"), occupancy, datetime.now().isoformat()))
                
                # Vzorčni heatmap podatki (zasedenost po urah in dnevih)
                days = ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"]
                hours = [f"{h:02d}:00" for h in range(6, 24)]
                
                for day in days:
                    for hour in hours:
                        # Simuliraj zasedenost glede na dan in uro
                        base_occupancy = 50
                        if day in ["Sob", "Ned"]:
                            base_occupancy += 20
                        
                        hour_num = int(hour.split(":")[0])
                        if 12 <= hour_num <= 14 or 19 <= hour_num <= 22:
                            base_occupancy += 30
                        
                        occupancy = base_occupancy + np.random.normal(0, 15)
                        occupancy = max(0, min(100, occupancy))
                        
                        cursor.execute('''
                            INSERT INTO heatmap_data 
                            (heatmap_type, x_coordinate, y_coordinate, value, date, created_at)
                            VALUES (?, ?, ?, ?, ?, ?)
                        ''', (
                            "occupancy_heatmap",
                            hour,
                            day,
                            occupancy,
                            datetime.now().strftime("%Y-%m-%d"),
                            datetime.now().isoformat()
                        ))
                
                conn.commit()
                logger.info("✅ Vzorčni podatki naloženi")
                
        except Exception as e:
            logger.error(f"Napaka pri nalaganju vzorčnih podatkov: {e}")
    
    def get_kpi_metrics(self, category: str = None) -> List[KPIMetric]:
        """Pridobi KPI metrike"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if category:
                    cursor.execute('''
                        SELECT * FROM kpi_metrics WHERE category = ?
                        ORDER BY name
                    ''', (category,))
                else:
                    cursor.execute('''
                        SELECT * FROM kpi_metrics ORDER BY name
                    ''')
                
                metrics = []
                for row in cursor.fetchall():
                    metrics.append(KPIMetric(
                        metric_id=row[0],
                        name=row[1],
                        value=row[2],
                        target=row[3],
                        unit=row[4],
                        trend=row[5],
                        status=row[6],
                        description=row[7],
                        last_updated=datetime.fromisoformat(row[9])
                    ))
                
                return metrics
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju KPI metrik: {e}")
            return []
    
    def create_revenue_chart(self, time_range: TimeRange = TimeRange.MONTH) -> Dict[str, Any]:
        """Ustvari graf prihodkov"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Določi časovni razpon
                if time_range == TimeRange.MONTH:
                    since_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
                elif time_range == TimeRange.WEEK:
                    since_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
                else:
                    since_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
                
                cursor.execute('''
                    SELECT date, value FROM historical_data 
                    WHERE metric_type = 'revenue' AND date >= ?
                    ORDER BY date
                ''', (since_date,))
                
                data = cursor.fetchall()
                
                if not data:
                    return {"error": "Ni podatkov za graf prihodkov"}
                
                dates = [row[0] for row in data]
                values = [row[1] for row in data]
                
                # Ustvari Plotly graf
                fig = go.Figure()
                
                fig.add_trace(go.Scatter(
                    x=dates,
                    y=values,
                    mode='lines+markers',
                    name='Prihodki',
                    line=dict(color='#2E86AB', width=3),
                    marker=dict(size=6)
                ))
                
                # Dodaj trend linijo
                if len(values) > 1:
                    z = np.polyfit(range(len(values)), values, 1)
                    trend_line = np.poly1d(z)
                    
                    fig.add_trace(go.Scatter(
                        x=dates,
                        y=[trend_line(i) for i in range(len(values))],
                        mode='lines',
                        name='Trend',
                        line=dict(color='#A23B72', width=2, dash='dash')
                    ))
                
                fig.update_layout(
                    title='📈 Prihodki po dnevih',
                    xaxis_title='Datum',
                    yaxis_title='Prihodki (EUR)',
                    hovermode='x unified',
                    template='plotly_white'
                )
                
                return {
                    "chart_data": fig.to_json(),
                    "summary": {
                        "total_revenue": sum(values),
                        "avg_daily": sum(values) / len(values),
                        "best_day": max(values),
                        "worst_day": min(values)
                    }
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju grafa prihodkov: {e}")
            return {"error": str(e)}
    
    def create_occupancy_heatmap(self) -> Dict[str, Any]:
        """Ustvari heatmap zasedenosti"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT x_coordinate, y_coordinate, value 
                    FROM heatmap_data 
                    WHERE heatmap_type = 'occupancy_heatmap'
                    ORDER BY y_coordinate, x_coordinate
                ''')
                
                data = cursor.fetchall()
                
                if not data:
                    return {"error": "Ni podatkov za heatmap"}
                
                # Organiziraj podatke
                hours = sorted(list(set([row[0] for row in data])))
                days = ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"]
                
                # Ustvari matriko vrednosti
                values = []
                for day in days:
                    day_values = []
                    for hour in hours:
                        value = next((row[2] for row in data if row[0] == hour and row[1] == day), 0)
                        day_values.append(value)
                    values.append(day_values)
                
                # Ustvari Plotly heatmap
                fig = go.Figure(data=go.Heatmap(
                    z=values,
                    x=hours,
                    y=days,
                    colorscale='RdYlGn',
                    text=[[f"{val:.1f}%" for val in row] for row in values],
                    texttemplate="%{text}",
                    textfont={"size": 10},
                    hoverongaps=False
                ))
                
                fig.update_layout(
                    title='🔥 Heatmap zasedenosti po urah in dnevih',
                    xaxis_title='Ura',
                    yaxis_title='Dan v tednu',
                    template='plotly_white'
                )
                
                return {
                    "heatmap_data": fig.to_json(),
                    "insights": {
                        "peak_hours": "19:00-22:00",
                        "peak_days": "Sobota, Nedelja",
                        "avg_occupancy": np.mean([val for row in values for val in row]),
                        "max_occupancy": np.max([val for row in values for val in row])
                    }
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju heatmap: {e}")
            return {"error": str(e)}
    
    def create_kpi_dashboard(self) -> Dict[str, Any]:
        """Ustvari KPI dashboard"""
        try:
            metrics = self.get_kpi_metrics()
            
            if not metrics:
                return {"error": "Ni KPI podatkov"}
            
            # Organiziraj metrike po kategorijah
            categories = {}
            for metric in metrics:
                category = getattr(metric, 'category', 'general')
                if category not in categories:
                    categories[category] = []
                categories[category].append(metric)
            
            # Ustvari KPI kartice
            kpi_cards = []
            for metric in metrics:
                # Določi barvo glede na status
                color = {
                    "good": "#28a745",
                    "warning": "#ffc107", 
                    "critical": "#dc3545"
                }.get(metric.status, "#6c757d")
                
                # Izračunaj dosežek cilja
                achievement = (metric.value / metric.target * 100) if metric.target > 0 else 0
                
                kpi_cards.append({
                    "id": metric.metric_id,
                    "title": metric.name,
                    "value": metric.value,
                    "unit": metric.unit,
                    "target": metric.target,
                    "trend": metric.trend,
                    "status": metric.status,
                    "color": color,
                    "achievement": achievement,
                    "description": metric.description
                })
            
            # Ustvari povzetek
            total_metrics = len(metrics)
            good_metrics = len([m for m in metrics if m.status == "good"])
            warning_metrics = len([m for m in metrics if m.status == "warning"])
            critical_metrics = len([m for m in metrics if m.status == "critical"])
            
            summary = {
                "total_metrics": total_metrics,
                "good_metrics": good_metrics,
                "warning_metrics": warning_metrics,
                "critical_metrics": critical_metrics,
                "overall_health": "good" if critical_metrics == 0 and warning_metrics < total_metrics * 0.3 else "warning" if critical_metrics == 0 else "critical"
            }
            
            return {
                "kpi_cards": kpi_cards,
                "categories": list(categories.keys()),
                "summary": summary,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju KPI dashboard: {e}")
            return {"error": str(e)}
    
    def create_financial_overview(self) -> Dict[str, Any]:
        """Ustvari finančni pregled"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Prihodki zadnjih 30 dni
                cursor.execute('''
                    SELECT SUM(value) FROM historical_data 
                    WHERE metric_type = 'revenue' 
                    AND date >= date('now', '-30 days')
                ''')
                monthly_revenue = cursor.fetchone()[0] or 0
                
                # Prihodki zadnjih 7 dni
                cursor.execute('''
                    SELECT SUM(value) FROM historical_data 
                    WHERE metric_type = 'revenue' 
                    AND date >= date('now', '-7 days')
                ''')
                weekly_revenue = cursor.fetchone()[0] or 0
                
                # Današnji prihodki
                cursor.execute('''
                    SELECT SUM(value) FROM historical_data 
                    WHERE metric_type = 'revenue' 
                    AND date = date('now')
                ''')
                daily_revenue = cursor.fetchone()[0] or 0
                
                # Izračunaj trende
                cursor.execute('''
                    SELECT value FROM historical_data 
                    WHERE metric_type = 'revenue' 
                    AND date >= date('now', '-60 days')
                    ORDER BY date DESC
                    LIMIT 60
                ''')
                
                revenue_data = [row[0] for row in cursor.fetchall()]
                
                # Primerjaj zadnjih 30 dni z prejšnjimi 30 dni
                if len(revenue_data) >= 60:
                    current_30 = sum(revenue_data[:30])
                    previous_30 = sum(revenue_data[30:60])
                    monthly_trend = ((current_30 - previous_30) / previous_30 * 100) if previous_30 > 0 else 0
                else:
                    monthly_trend = 0
                
                # Ustvari graf mesečnih prihodkov
                cursor.execute('''
                    SELECT strftime('%Y-%m', date) as month, SUM(value) as total
                    FROM historical_data 
                    WHERE metric_type = 'revenue' 
                    AND date >= date('now', '-12 months')
                    GROUP BY strftime('%Y-%m', date)
                    ORDER BY month
                ''')
                
                monthly_data = cursor.fetchall()
                months = [row[0] for row in monthly_data]
                revenues = [row[1] for row in monthly_data]
                
                # Ustvari graf
                fig = go.Figure()
                
                fig.add_trace(go.Bar(
                    x=months,
                    y=revenues,
                    name='Mesečni prihodki',
                    marker_color='#2E86AB'
                ))
                
                fig.update_layout(
                    title='💰 Mesečni prihodki',
                    xaxis_title='Mesec',
                    yaxis_title='Prihodki (EUR)',
                    template='plotly_white'
                )
                
                return {
                    "daily_revenue": daily_revenue,
                    "weekly_revenue": weekly_revenue,
                    "monthly_revenue": monthly_revenue,
                    "monthly_trend": monthly_trend,
                    "avg_daily": monthly_revenue / 30,
                    "chart_data": fig.to_json(),
                    "projections": {
                        "weekly_projection": daily_revenue * 7,
                        "monthly_projection": daily_revenue * 30,
                        "yearly_projection": monthly_revenue * 12
                    }
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju finančnega pregleda: {e}")
            return {"error": str(e)}
    
    def get_real_time_data(self) -> Dict[str, Any]:
        """Pridobi real-time podatke"""
        try:
            # Simuliraj real-time podatke
            current_time = datetime.now()
            
            # Trenutna zasedenost
            base_occupancy = 75
            hour = current_time.hour
            if 12 <= hour <= 14 or 19 <= hour <= 22:
                base_occupancy += 15
            
            current_occupancy = base_occupancy + np.random.normal(0, 5)
            current_occupancy = max(0, min(100, current_occupancy))
            
            # Trenutni prihodek
            hourly_revenue = 500 + np.random.normal(200, 100)
            hourly_revenue = max(0, hourly_revenue)
            
            # Aktivni gosti
            active_guests = int(current_occupancy * 1.2)
            
            # Čakajoče rezervacije
            pending_reservations = np.random.randint(5, 25)
            
            # Kritična opozorila
            alerts = []
            if current_occupancy > 95:
                alerts.append({
                    "type": "warning",
                    "message": "Visoka zasedenost - razmislite o dodatnih virih",
                    "priority": "high"
                })
            
            # Simuliraj nizke zaloge
            if np.random.random() < 0.3:
                alerts.append({
                    "type": "critical",
                    "message": "Nizke zaloge v kuhinji - potrebno naročilo",
                    "priority": "critical"
                })
            
            return {
                "timestamp": current_time.isoformat(),
                "current_occupancy": round(current_occupancy, 1),
                "hourly_revenue": round(hourly_revenue, 2),
                "active_guests": active_guests,
                "pending_reservations": pending_reservations,
                "alerts": alerts,
                "system_status": "operational",
                "last_sync": current_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju real-time podatkov: {e}")
            return {"error": str(e)}
    
    def generate_executive_report(self) -> Dict[str, Any]:
        """Generiraj izvršni povzetek"""
        try:
            # Pridobi ključne metrike
            kpi_data = self.create_kpi_dashboard()
            financial_data = self.create_financial_overview()
            real_time_data = self.get_real_time_data()
            
            # Ustvari povzetek
            report = {
                "report_date": datetime.now().isoformat(),
                "executive_summary": {
                    "overall_performance": "good",  # good, warning, critical
                    "key_highlights": [
                        f"Mesečni prihodek: {financial_data.get('monthly_revenue', 0):,.2f} EUR",
                        f"Trenutna zasedenost: {real_time_data.get('current_occupancy', 0):.1f}%",
                        f"Zadovoljstvo gostov: 4.6/5",
                        f"Aktivni gosti: {real_time_data.get('active_guests', 0)}"
                    ],
                    "critical_issues": [
                        alert["message"] for alert in real_time_data.get("alerts", [])
                        if alert.get("priority") == "critical"
                    ],
                    "recommendations": [
                        "Optimiziraj urnik osebja za vrhunce obiska",
                        "Implementiraj dinamično ceno za povečanje prihodkov",
                        "Razširi marketing za dneve z nizko zasedenostjo"
                    ]
                },
                "kpi_summary": kpi_data.get("summary", {}),
                "financial_summary": {
                    "daily_revenue": financial_data.get("daily_revenue", 0),
                    "weekly_revenue": financial_data.get("weekly_revenue", 0),
                    "monthly_revenue": financial_data.get("monthly_revenue", 0),
                    "monthly_trend": financial_data.get("monthly_trend", 0)
                },
                "operational_summary": {
                    "current_occupancy": real_time_data.get("current_occupancy", 0),
                    "active_guests": real_time_data.get("active_guests", 0),
                    "pending_reservations": real_time_data.get("pending_reservations", 0),
                    "system_alerts": len(real_time_data.get("alerts", []))
                }
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju izvršnega poročila: {e}")
            return {"error": str(e)}

# Primer uporabe
if __name__ == "__main__":
    # Inicializacija
    dashboard = AdvancedDashboard()
    
    print("🏨 Advanced Tourism Dashboard - Test")
    print("=" * 50)
    
    # Test KPI dashboard
    print("\n📊 KPI Dashboard:")
    kpi_data = dashboard.create_kpi_dashboard()
    if "error" not in kpi_data:
        print(f"✅ Skupno metrik: {kpi_data['summary']['total_metrics']}")
        print(f"✅ Dobre metrike: {kpi_data['summary']['good_metrics']}")
        print(f"⚠️ Opozorila: {kpi_data['summary']['warning_metrics']}")
        print(f"🚨 Kritične: {kpi_data['summary']['critical_metrics']}")
    
    # Test finančni pregled
    print("\n💰 Finančni pregled:")
    financial_data = dashboard.create_financial_overview()
    if "error" not in financial_data:
        print(f"✅ Dnevni prihodek: {financial_data['daily_revenue']:,.2f} EUR")
        print(f"✅ Tedenski prihodek: {financial_data['weekly_revenue']:,.2f} EUR")
        print(f"✅ Mesečni prihodek: {financial_data['monthly_revenue']:,.2f} EUR")
        print(f"📈 Mesečni trend: {financial_data['monthly_trend']:+.1f}%")
    
    # Test real-time podatki
    print("\n⚡ Real-time podatki:")
    rt_data = dashboard.get_real_time_data()
    if "error" not in rt_data:
        print(f"✅ Trenutna zasedenost: {rt_data['current_occupancy']:.1f}%")
        print(f"✅ Urni prihodek: {rt_data['hourly_revenue']:,.2f} EUR")
        print(f"✅ Aktivni gosti: {rt_data['active_guests']}")
        print(f"⚠️ Opozorila: {len(rt_data['alerts'])}")
    
    # Test heatmap
    print("\n🔥 Heatmap zasedenosti:")
    heatmap_data = dashboard.create_occupancy_heatmap()
    if "error" not in heatmap_data:
        insights = heatmap_data['insights']
        print(f"✅ Vrhunec obiska: {insights['peak_hours']}")
        print(f"✅ Najboljši dnevi: {insights['peak_days']}")
        print(f"✅ Povprečna zasedenost: {insights['avg_occupancy']:.1f}%")
    
    # Test izvršni povzetek
    print("\n📋 Izvršni povzetek:")
    report = dashboard.generate_executive_report()
    if "error" not in report:
        summary = report['executive_summary']
        print(f"✅ Splošna ocena: {summary['overall_performance']}")
        print(f"✅ Ključni poudarki: {len(summary['key_highlights'])}")
        print(f"🚨 Kritične zadeve: {len(summary['critical_issues'])}")
        print(f"💡 Priporočila: {len(summary['recommendations'])}")
    
    logger.info("🏨 Advanced Dashboard sistem uspešno testiran!")