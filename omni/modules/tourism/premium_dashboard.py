"""
📊 PREMIUM DASHBOARD
Real-time dashboard za gostinstvo in turizem

Funkcionalnosti:
- Real-time pregled poslovanja
- Interaktivni grafi in KPI
- Heatmaps in analitika
- Mobilno prilagojeno
- Izvoz poročil
- Personalizirani pogledi
"""

from flask import Flask, render_template, jsonify, request
import sqlite3
import json
from datetime import datetime, timedelta
import pandas as pd
import plotly.graph_objs as go
import plotly.utils
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class PremiumDashboard:
    """Premium dashboard za gostinstvo"""
    
    def __init__(self, db_path: str = "tourism_premium.db"):
        self.db_path = db_path
        self.app = Flask(__name__)
        self.setup_routes()
        
        logger.info("📊 Premium Dashboard inicializiran")
    
    def setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def dashboard():
            return render_template('dashboard.html')
        
        @self.app.route('/api/kpi')
        def get_kpi():
            return jsonify(self.get_kpi_data())
        
        @self.app.route('/api/sales-chart')
        def get_sales_chart():
            return jsonify(self.get_sales_chart_data())
        
        @self.app.route('/api/inventory-status')
        def get_inventory_status():
            return jsonify(self.get_inventory_status())
        
        @self.app.route('/api/reservations-heatmap')
        def get_reservations_heatmap():
            return jsonify(self.get_reservations_heatmap())
        
        @self.app.route('/api/staff-overview')
        def get_staff_overview():
            return jsonify(self.get_staff_overview())
        
        @self.app.route('/api/financial-summary')
        def get_financial_summary():
            return jsonify(self.get_financial_summary())
        
        @self.app.route('/api/customer-analytics')
        def get_customer_analytics():
            return jsonify(self.get_customer_analytics())
        
        @self.app.route('/api/alerts')
        def get_alerts():
            return jsonify(self.get_active_alerts())
    
    # ==================== KPI PODATKI ====================
    
    def get_kpi_data(self) -> Dict:
        """Pridobi KPI podatke"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        
        # Današnja prodaja
        cursor.execute('''
            SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
            FROM pos_transactions 
            WHERE DATE(timestamp) = ?
        ''', (today.isoformat(),))
        
        today_sales = cursor.fetchone()
        
        # Včerajšnja prodaja
        cursor.execute('''
            SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
            FROM pos_transactions 
            WHERE DATE(timestamp) = ?
        ''', (yesterday.isoformat(),))
        
        yesterday_sales = cursor.fetchone()
        
        # Rezervacije danes
        cursor.execute('''
            SELECT COUNT(*)
            FROM reservations 
            WHERE DATE(datetime_start) = ? AND status = 'confirmed'
        ''', (today.isoformat(),))
        
        today_reservations = cursor.fetchone()[0]
        
        # Povprečna ocena zadovoljstva
        cursor.execute('''
            SELECT AVG(CAST(data AS REAL))
            FROM ai_insights 
            WHERE type = 'customer_satisfaction' 
            AND timestamp >= ?
        ''', ((today - timedelta(days=30)).isoformat(),))
        
        avg_satisfaction = cursor.fetchone()[0] or 0
        
        # Zaloge pod minimumom
        cursor.execute('''
            SELECT COUNT(*)
            FROM inventory 
            WHERE current_stock <= min_stock
        ''')
        
        low_stock_count = cursor.fetchone()[0]
        
        # Aktivno osebje
        cursor.execute('''
            SELECT COUNT(*)
            FROM staff 
            WHERE active = 1
        ''')
        
        active_staff = cursor.fetchone()[0]
        
        conn.close()
        
        # Izračunaj spremembe
        revenue_change = 0
        if yesterday_sales[1] > 0:
            revenue_change = ((today_sales[1] - yesterday_sales[1]) / yesterday_sales[1]) * 100
        
        transactions_change = 0
        if yesterday_sales[0] > 0:
            transactions_change = ((today_sales[0] - yesterday_sales[0]) / yesterday_sales[0]) * 100
        
        return {
            "revenue": {
                "value": today_sales[1],
                "change": round(revenue_change, 1),
                "trend": "up" if revenue_change > 0 else "down" if revenue_change < 0 else "stable"
            },
            "transactions": {
                "value": today_sales[0],
                "change": round(transactions_change, 1),
                "trend": "up" if transactions_change > 0 else "down" if transactions_change < 0 else "stable"
            },
            "reservations": {
                "value": today_reservations,
                "trend": "stable"  # Bi lahko primerjali z včeraj
            },
            "satisfaction": {
                "value": round(avg_satisfaction, 1),
                "max": 5.0,
                "trend": "stable"
            },
            "low_stock_items": {
                "value": low_stock_count,
                "alert": low_stock_count > 0
            },
            "active_staff": {
                "value": active_staff
            }
        }
    
    # ==================== PRODAJNI GRAFI ====================
    
    def get_sales_chart_data(self) -> Dict:
        """Pridobi podatke za prodajne grafe"""
        conn = sqlite3.connect(self.db_path)
        
        # Zadnjih 30 dni
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        # Dnevna prodaja
        daily_sales_query = '''
            SELECT DATE(timestamp) as date, 
                   COUNT(*) as transactions,
                   SUM(total_amount) as revenue
            FROM pos_transactions 
            WHERE DATE(timestamp) BETWEEN ? AND ?
            GROUP BY DATE(timestamp)
            ORDER BY date
        '''
        
        df_daily = pd.read_sql_query(daily_sales_query, conn, params=(start_date.isoformat(), end_date.isoformat()))
        
        # Urna prodaja za danes
        today = datetime.now().date()
        hourly_sales_query = '''
            SELECT strftime('%H', timestamp) as hour,
                   COUNT(*) as transactions,
                   SUM(total_amount) as revenue
            FROM pos_transactions 
            WHERE DATE(timestamp) = ?
            GROUP BY strftime('%H', timestamp)
            ORDER BY hour
        '''
        
        df_hourly = pd.read_sql_query(hourly_sales_query, conn, params=(today.isoformat(),))
        
        # Top izdelki
        top_items_query = '''
            SELECT items
            FROM pos_transactions 
            WHERE DATE(timestamp) BETWEEN ? AND ?
        '''
        
        cursor = conn.cursor()
        cursor.execute(top_items_query, (start_date.isoformat(), end_date.isoformat()))
        transactions = cursor.fetchall()
        
        # Analiziraj top izdelke
        item_counts = {}
        item_revenue = {}
        
        for transaction in transactions:
            items = json.loads(transaction[0])
            for item in items:
                name = item.get('name', 'Unknown')
                quantity = item.get('quantity', 1)
                price = item.get('price', 0)
                
                item_counts[name] = item_counts.get(name, 0) + quantity
                item_revenue[name] = item_revenue.get(name, 0) + (price * quantity)
        
        top_items_by_quantity = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        top_items_by_revenue = sorted(item_revenue.items(), key=lambda x: x[1], reverse=True)[:10]
        
        conn.close()
        
        return {
            "daily_sales": {
                "dates": df_daily['date'].tolist(),
                "revenue": df_daily['revenue'].tolist(),
                "transactions": df_daily['transactions'].tolist()
            },
            "hourly_sales": {
                "hours": [f"{int(h):02d}:00" for h in df_hourly['hour'].tolist()],
                "revenue": df_hourly['revenue'].tolist(),
                "transactions": df_hourly['transactions'].tolist()
            },
            "top_items": {
                "by_quantity": [{"name": name, "value": count} for name, count in top_items_by_quantity],
                "by_revenue": [{"name": name, "value": revenue} for name, revenue in top_items_by_revenue]
            }
        }
    
    # ==================== STANJE ZALOG ====================
    
    def get_inventory_status(self) -> Dict:
        """Pridobi stanje zalog"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Vse zaloge
        cursor.execute('''
            SELECT name, category, current_stock, min_stock, max_stock, unit
            FROM inventory
            ORDER BY category, name
        ''')
        
        inventory_items = cursor.fetchall()
        
        # Kategoriziraj zaloge
        categories = {}
        low_stock_items = []
        critical_items = []
        
        for item in inventory_items:
            name, category, current, minimum, maximum, unit = item
            
            if category not in categories:
                categories[category] = []
            
            stock_percentage = (current / maximum) * 100 if maximum > 0 else 0
            status = "good"
            
            if current <= minimum:
                status = "critical"
                critical_items.append({
                    "name": name,
                    "current": current,
                    "minimum": minimum,
                    "unit": unit
                })
            elif current <= minimum * 1.5:
                status = "low"
                low_stock_items.append({
                    "name": name,
                    "current": current,
                    "minimum": minimum,
                    "unit": unit
                })
            
            categories[category].append({
                "name": name,
                "current": current,
                "minimum": minimum,
                "maximum": maximum,
                "unit": unit,
                "percentage": round(stock_percentage, 1),
                "status": status
            })
        
        conn.close()
        
        return {
            "categories": categories,
            "alerts": {
                "critical": critical_items,
                "low_stock": low_stock_items
            },
            "summary": {
                "total_items": len(inventory_items),
                "critical_count": len(critical_items),
                "low_stock_count": len(low_stock_items)
            }
        }
    
    # ==================== REZERVACIJE HEATMAP ====================
    
    def get_reservations_heatmap(self) -> Dict:
        """Pridobi podatke za heatmap rezervacij"""
        conn = sqlite3.connect(self.db_path)
        
        # Zadnjih 30 dni rezervacij
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        query = '''
            SELECT DATE(datetime_start) as date,
                   strftime('%H', datetime_start) as hour,
                   COUNT(*) as reservations
            FROM reservations 
            WHERE DATE(datetime_start) BETWEEN ? AND ?
            AND status = 'confirmed'
            GROUP BY DATE(datetime_start), strftime('%H', datetime_start)
            ORDER BY date, hour
        '''
        
        df = pd.read_sql_query(query, conn, params=(start_date.isoformat(), end_date.isoformat()))
        
        # Pripravi heatmap podatke
        heatmap_data = []
        hours = list(range(8, 24))  # 8:00 - 23:00
        
        # Ustvari polno matriko
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        
        for date in date_range:
            date_str = date.strftime('%Y-%m-%d')
            day_name = date.strftime('%A')
            
            for hour in hours:
                # Najdi rezervacije za ta datum in uro
                reservations = df[(df['date'] == date_str) & (df['hour'] == f'{hour:02d}')]['reservations'].sum()
                
                heatmap_data.append({
                    "date": date_str,
                    "day": day_name,
                    "hour": f"{hour:02d}:00",
                    "reservations": int(reservations),
                    "intensity": min(reservations / 5, 1.0)  # Normaliziraj na 0-1
                })
        
        # Statistike
        peak_times = df.groupby('hour')['reservations'].sum().sort_values(ascending=False).head(3)
        busy_days = df.groupby('date')['reservations'].sum().sort_values(ascending=False).head(5)
        
        conn.close()
        
        return {
            "heatmap_data": heatmap_data,
            "statistics": {
                "peak_hours": [f"{hour}:00" for hour in peak_times.index.tolist()],
                "busiest_days": busy_days.index.tolist(),
                "total_reservations": int(df['reservations'].sum()),
                "average_per_day": round(df.groupby('date')['reservations'].sum().mean(), 1)
            }
        }
    
    # ==================== PREGLED OSEBJA ====================
    
    def get_staff_overview(self) -> Dict:
        """Pridobi pregled osebja"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Aktivno osebje
        cursor.execute('''
            SELECT position, COUNT(*) as count
            FROM staff 
            WHERE active = 1
            GROUP BY position
        ''')
        
        staff_by_position = dict(cursor.fetchall())
        
        # Današnji urniki
        today = datetime.now().date()
        cursor.execute('''
            SELECT s.name, s.position, ss.shift_start, ss.shift_end, ss.status
            FROM staff_schedules ss
            JOIN staff s ON ss.employee_id = s.id
            WHERE DATE(ss.date) = ?
            ORDER BY ss.shift_start
        ''', (today.isoformat(),))
        
        today_schedules = cursor.fetchall()
        
        # Urne postavke osebja
        cursor.execute('''
            SELECT position, AVG(hourly_rate) as avg_rate, COUNT(*) as count
            FROM staff 
            WHERE active = 1
            GROUP BY position
        ''')
        
        position_rates = cursor.fetchall()
        
        conn.close()
        
        # Pripravi podatke za urnik
        schedule_data = []
        for schedule in today_schedules:
            name, position, start, end, status = schedule
            schedule_data.append({
                "name": name,
                "position": position,
                "shift": f"{start} - {end}",
                "status": status
            })
        
        # Pripravi podatke za pozicije
        position_data = []
        for position, avg_rate, count in position_rates:
            position_data.append({
                "position": position,
                "count": count,
                "avg_hourly_rate": round(avg_rate, 2)
            })
        
        return {
            "staff_by_position": staff_by_position,
            "today_schedule": schedule_data,
            "position_analytics": position_data,
            "summary": {
                "total_active": sum(staff_by_position.values()),
                "scheduled_today": len(today_schedules),
                "positions": len(staff_by_position)
            }
        }
    
    # ==================== FINANČNI POVZETEK ====================
    
    def get_financial_summary(self) -> Dict:
        """Pridobi finančni povzetek"""
        conn = sqlite3.connect(self.db_path)
        
        # Zadnjih 30 dni
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        # Prihodki in odhodki
        query = '''
            SELECT type, category, SUM(amount) as total
            FROM financial_records 
            WHERE DATE(date) BETWEEN ? AND ?
            GROUP BY type, category
        '''
        
        df = pd.read_sql_query(query, conn, params=(start_date.isoformat(), end_date.isoformat()))
        
        # Dnevni cash flow
        daily_query = '''
            SELECT DATE(date) as date, type, SUM(amount) as amount
            FROM financial_records 
            WHERE DATE(date) BETWEEN ? AND ?
            GROUP BY DATE(date), type
            ORDER BY date
        '''
        
        df_daily = pd.read_sql_query(daily_query, conn, params=(start_date.isoformat(), end_date.isoformat()))
        
        conn.close()
        
        # Analiziraj podatke
        revenue_data = df[df['type'] == 'revenue']
        expense_data = df[df['type'] == 'expense']
        
        total_revenue = revenue_data['total'].sum()
        total_expenses = expense_data['total'].sum()
        profit = total_revenue - total_expenses
        profit_margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
        
        # Pripravi kategorije
        revenue_by_category = revenue_data.set_index('category')['total'].to_dict()
        expenses_by_category = expense_data.set_index('category')['total'].to_dict()
        
        # Dnevni cash flow
        daily_cashflow = []
        for date in pd.date_range(start=start_date, end=end_date, freq='D'):
            date_str = date.strftime('%Y-%m-%d')
            day_revenue = df_daily[(df_daily['date'] == date_str) & (df_daily['type'] == 'revenue')]['amount'].sum()
            day_expenses = df_daily[(df_daily['date'] == date_str) & (df_daily['type'] == 'expense')]['amount'].sum()
            
            daily_cashflow.append({
                "date": date_str,
                "revenue": float(day_revenue),
                "expenses": float(day_expenses),
                "profit": float(day_revenue - day_expenses)
            })
        
        return {
            "summary": {
                "total_revenue": round(total_revenue, 2),
                "total_expenses": round(total_expenses, 2),
                "profit": round(profit, 2),
                "profit_margin": round(profit_margin, 1)
            },
            "revenue_by_category": revenue_by_category,
            "expenses_by_category": expenses_by_category,
            "daily_cashflow": daily_cashflow,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": (end_date - start_date).days + 1
            }
        }
    
    # ==================== ANALITIKA STRANK ====================
    
    def get_customer_analytics(self) -> Dict:
        """Pridobi analitiko strank"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Simulacija podatkov o strankah (v resničnem sistemu bi imeli customer tabelo)
        # Za demo uporabimo POS transakcije
        
        # Zadnjih 30 dni
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        cursor.execute('''
            SELECT customer_id, COUNT(*) as visits, SUM(total_amount) as total_spent
            FROM pos_transactions 
            WHERE DATE(timestamp) BETWEEN ? AND ?
            AND customer_id IS NOT NULL
            GROUP BY customer_id
        ''', (start_date.isoformat(), end_date.isoformat()))
        
        customer_data = cursor.fetchall()
        
        # Analiza po urah
        cursor.execute('''
            SELECT strftime('%H', timestamp) as hour, COUNT(*) as transactions
            FROM pos_transactions 
            WHERE DATE(timestamp) BETWEEN ? AND ?
            GROUP BY strftime('%H', timestamp)
            ORDER BY hour
        ''', (start_date.isoformat(), end_date.isoformat()))
        
        hourly_traffic = cursor.fetchall()
        
        # Analiza po dnevih v tednu
        cursor.execute('''
            SELECT 
                CASE strftime('%w', timestamp)
                    WHEN '0' THEN 'Nedelja'
                    WHEN '1' THEN 'Ponedeljek'
                    WHEN '2' THEN 'Torek'
                    WHEN '3' THEN 'Sreda'
                    WHEN '4' THEN 'Četrtek'
                    WHEN '5' THEN 'Petek'
                    WHEN '6' THEN 'Sobota'
                END as day_name,
                COUNT(*) as transactions,
                AVG(total_amount) as avg_amount
            FROM pos_transactions 
            WHERE DATE(timestamp) BETWEEN ? AND ?
            GROUP BY strftime('%w', timestamp)
            ORDER BY strftime('%w', timestamp)
        ''', (start_date.isoformat(), end_date.isoformat()))
        
        daily_patterns = cursor.fetchall()
        
        conn.close()
        
        # Analiziraj stranke
        if customer_data:
            total_customers = len(customer_data)
            avg_visits = sum(visits for _, visits, _ in customer_data) / total_customers
            avg_spending = sum(spent for _, _, spent in customer_data) / total_customers
            
            # Segmentiraj stranke
            vip_customers = [c for c in customer_data if c[2] > 200]  # Več kot 200€
            regular_customers = [c for c in customer_data if 50 <= c[2] <= 200]
            casual_customers = [c for c in customer_data if c[2] < 50]
        else:
            total_customers = avg_visits = avg_spending = 0
            vip_customers = regular_customers = casual_customers = []
        
        return {
            "customer_segments": {
                "vip": len(vip_customers),
                "regular": len(regular_customers),
                "casual": len(casual_customers)
            },
            "customer_metrics": {
                "total_customers": total_customers,
                "avg_visits_per_customer": round(avg_visits, 1),
                "avg_spending_per_customer": round(avg_spending, 2)
            },
            "traffic_patterns": {
                "hourly": [{"hour": f"{int(h):02d}:00", "transactions": t} for h, t in hourly_traffic],
                "daily": [{"day": day, "transactions": t, "avg_amount": round(a, 2)} 
                         for day, t, a in daily_patterns]
            }
        }
    
    # ==================== AKTIVNI ALARMI ====================
    
    def get_active_alerts(self) -> Dict:
        """Pridobi aktivne alarme"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        alerts = []
        
        # Nizke zaloge
        cursor.execute('''
            SELECT name, current_stock, min_stock, unit
            FROM inventory 
            WHERE current_stock <= min_stock
        ''')
        
        low_stock = cursor.fetchall()
        for item in low_stock:
            alerts.append({
                "type": "warning",
                "category": "inventory",
                "title": f"Nizka zaloga: {item[0]}",
                "message": f"Trenutno stanje: {item[1]} {item[3]} (minimum: {item[2]} {item[3]})",
                "timestamp": datetime.now().isoformat(),
                "priority": "high" if item[1] == 0 else "medium"
            })
        
        # Nepotrjene rezervacije
        cursor.execute('''
            SELECT customer_name, datetime_start
            FROM reservations 
            WHERE status = 'pending'
            AND datetime_start >= ?
        ''', (datetime.now().isoformat(),))
        
        pending_reservations = cursor.fetchall()
        for reservation in pending_reservations:
            alerts.append({
                "type": "info",
                "category": "reservations",
                "title": f"Nepotrjena rezervacija: {reservation[0]}",
                "message": f"Rezervacija za {reservation[1]} čaka na potrditev",
                "timestamp": datetime.now().isoformat(),
                "priority": "medium"
            })
        
        # Sistemske notifikacije
        cursor.execute('''
            SELECT type, title, message, priority, timestamp
            FROM notifications 
            WHERE sent = 0
            ORDER BY timestamp DESC
            LIMIT 10
        ''')
        
        notifications = cursor.fetchall()
        for notification in notifications:
            alerts.append({
                "type": "notification",
                "category": notification[0],
                "title": notification[1],
                "message": notification[2],
                "priority": notification[3],
                "timestamp": notification[4]
            })
        
        conn.close()
        
        # Sortiraj po prioriteti
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        alerts.sort(key=lambda x: priority_order.get(x["priority"], 4))
        
        return {
            "alerts": alerts,
            "summary": {
                "total": len(alerts),
                "critical": len([a for a in alerts if a["priority"] == "critical"]),
                "high": len([a for a in alerts if a["priority"] == "high"]),
                "medium": len([a for a in alerts if a["priority"] == "medium"]),
                "low": len([a for a in alerts if a["priority"] == "low"])
            }
        }
    
    # ==================== ZAGON DASHBOARDA ====================
    
    def run(self, host='0.0.0.0', port=5000, debug=False):
        """Zaženi dashboard"""
        logger.info(f"🚀 Premium Dashboard zagnan na http://{host}:{port}")
        self.app.run(host=host, port=port, debug=debug)

# HTML Template za dashboard
DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Tourism Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem; }
        .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .header p { opacity: 0.9; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; padding: 1rem; }
        .card { background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .kpi-card { text-align: center; padding: 1rem; border-radius: 8px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
        .kpi-value { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .kpi-label { font-size: 0.9rem; opacity: 0.9; }
        .chart-container { height: 400px; }
        .alert { padding: 0.75rem; margin: 0.5rem 0; border-radius: 4px; border-left: 4px solid; }
        .alert-high { background: #fee; border-color: #f56565; }
        .alert-medium { background: #fef5e7; border-color: #ed8936; }
        .alert-low { background: #f0fff4; border-color: #48bb78; }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .status-good { background: #48bb78; }
        .status-warning { background: #ed8936; }
        .status-critical { background: #f56565; }
        .refresh-btn { position: fixed; bottom: 20px; right: 20px; background: #667eea; color: white; border: none; padding: 12px 20px; border-radius: 50px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .refresh-btn:hover { background: #5a67d8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏨 Premium Tourism Dashboard</h1>
        <p>Real-time pregled poslovanja • Posodobljeno: <span id="lastUpdate"></span></p>
    </div>

    <div class="dashboard">
        <!-- KPI Cards -->
        <div class="card">
            <h3>📊 Ključni kazalniki</h3>
            <div id="kpiContainer" class="kpi-grid">
                <!-- KPI cards will be loaded here -->
            </div>
        </div>

        <!-- Sales Chart -->
        <div class="card">
            <h3>💰 Prodajni trendi</h3>
            <div id="salesChart" class="chart-container"></div>
        </div>

        <!-- Inventory Status -->
        <div class="card">
            <h3>📦 Stanje zalog</h3>
            <div id="inventoryStatus"></div>
        </div>

        <!-- Reservations Heatmap -->
        <div class="card">
            <h3>📅 Rezervacije - Heatmap</h3>
            <div id="reservationsHeatmap" class="chart-container"></div>
        </div>

        <!-- Staff Overview -->
        <div class="card">
            <h3>👥 Pregled osebja</h3>
            <div id="staffOverview"></div>
        </div>

        <!-- Financial Summary -->
        <div class="card">
            <h3>💼 Finančni povzetek</h3>
            <div id="financialSummary" class="chart-container"></div>
        </div>

        <!-- Customer Analytics -->
        <div class="card">
            <h3>👤 Analitika strank</h3>
            <div id="customerAnalytics" class="chart-container"></div>
        </div>

        <!-- Active Alerts -->
        <div class="card">
            <h3>🚨 Aktivni alarmi</h3>
            <div id="activeAlerts"></div>
        </div>
    </div>

    <button class="refresh-btn" onclick="refreshDashboard()">🔄 Osveži</button>

    <script>
        // Dashboard JavaScript
        let dashboardData = {};

        async function loadDashboard() {
            try {
                // Load all data
                const [kpi, sales, inventory, reservations, staff, financial, customer, alerts] = await Promise.all([
                    fetch('/api/kpi').then(r => r.json()),
                    fetch('/api/sales-chart').then(r => r.json()),
                    fetch('/api/inventory-status').then(r => r.json()),
                    fetch('/api/reservations-heatmap').then(r => r.json()),
                    fetch('/api/staff-overview').then(r => r.json()),
                    fetch('/api/financial-summary').then(r => r.json()),
                    fetch('/api/customer-analytics').then(r => r.json()),
                    fetch('/api/alerts').then(r => r.json())
                ]);

                dashboardData = { kpi, sales, inventory, reservations, staff, financial, customer, alerts };

                // Render all components
                renderKPI(kpi);
                renderSalesChart(sales);
                renderInventoryStatus(inventory);
                renderReservationsHeatmap(reservations);
                renderStaffOverview(staff);
                renderFinancialSummary(financial);
                renderCustomerAnalytics(customer);
                renderActiveAlerts(alerts);

                // Update timestamp
                document.getElementById('lastUpdate').textContent = new Date().toLocaleString('sl-SI');

            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        }

        function renderKPI(data) {
            const container = document.getElementById('kpiContainer');
            container.innerHTML = `
                <div class="kpi-card">
                    <div class="kpi-value">€${data.revenue.value.toFixed(2)}</div>
                    <div class="kpi-label">Dnevni prihodek</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${data.transactions.value}</div>
                    <div class="kpi-label">Transakcije</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${data.reservations.value}</div>
                    <div class="kpi-label">Rezervacije</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${data.satisfaction.value}/5</div>
                    <div class="kpi-label">Zadovoljstvo</div>
                </div>
            `;
        }

        function renderSalesChart(data) {
            const trace1 = {
                x: data.daily_sales.dates,
                y: data.daily_sales.revenue,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Prihodek',
                line: { color: '#667eea' }
            };

            const layout = {
                title: 'Dnevni prihodek (zadnjih 30 dni)',
                xaxis: { title: 'Datum' },
                yaxis: { title: 'Prihodek (€)' },
                margin: { t: 50, r: 50, b: 50, l: 50 }
            };

            Plotly.newPlot('salesChart', [trace1], layout, { responsive: true });
        }

        function renderInventoryStatus(data) {
            const container = document.getElementById('inventoryStatus');
            let html = `<div style="margin-bottom: 1rem;">
                <strong>Skupaj izdelkov:</strong> ${data.summary.total_items} | 
                <strong>Kritično:</strong> ${data.summary.critical_count} | 
                <strong>Nizko:</strong> ${data.summary.low_stock_count}
            </div>`;

            if (data.alerts.critical.length > 0) {
                html += '<h4>🚨 Kritične zaloge:</h4>';
                data.alerts.critical.forEach(item => {
                    html += `<div class="alert alert-high">
                        <span class="status-indicator status-critical"></span>
                        ${item.name}: ${item.current} ${item.unit} (min: ${item.minimum})
                    </div>`;
                });
            }

            container.innerHTML = html;
        }

        function renderReservationsHeatmap(data) {
            // Simplified heatmap representation
            const container = document.getElementById('reservationsHeatmap');
            container.innerHTML = `
                <div>
                    <p><strong>Skupaj rezervacij:</strong> ${data.statistics.total_reservations}</p>
                    <p><strong>Povprečno na dan:</strong> ${data.statistics.average_per_day}</p>
                    <p><strong>Vrhunski časi:</strong> ${data.statistics.peak_hours.join(', ')}</p>
                </div>
            `;
        }

        function renderStaffOverview(data) {
            const container = document.getElementById('staffOverview');
            let html = `<div style="margin-bottom: 1rem;">
                <strong>Aktivno osebje:</strong> ${data.summary.total_active} | 
                <strong>Danes razporejeno:</strong> ${data.summary.scheduled_today}
            </div>`;

            html += '<h4>Današnji urnik:</h4>';
            data.today_schedule.forEach(schedule => {
                html += `<div style="padding: 0.5rem; margin: 0.25rem 0; background: #f8f9fa; border-radius: 4px;">
                    <strong>${schedule.name}</strong> (${schedule.position}) - ${schedule.shift}
                </div>`;
            });

            container.innerHTML = html;
        }

        function renderFinancialSummary(data) {
            const trace1 = {
                values: Object.values(data.revenue_by_category),
                labels: Object.keys(data.revenue_by_category),
                type: 'pie',
                name: 'Prihodki po kategorijah'
            };

            const layout = {
                title: `Finančni povzetek (${data.period.days} dni)`,
                margin: { t: 50, r: 50, b: 50, l: 50 }
            };

            Plotly.newPlot('financialSummary', [trace1], layout, { responsive: true });
        }

        function renderCustomerAnalytics(data) {
            const trace1 = {
                x: data.traffic_patterns.hourly.map(h => h.hour),
                y: data.traffic_patterns.hourly.map(h => h.transactions),
                type: 'bar',
                name: 'Promet po urah',
                marker: { color: '#f093fb' }
            };

            const layout = {
                title: 'Promet strank po urah',
                xaxis: { title: 'Ura' },
                yaxis: { title: 'Število transakcij' },
                margin: { t: 50, r: 50, b: 50, l: 50 }
            };

            Plotly.newPlot('customerAnalytics', [trace1], layout, { responsive: true });
        }

        function renderActiveAlerts(data) {
            const container = document.getElementById('activeAlerts');
            let html = `<div style="margin-bottom: 1rem;">
                <strong>Skupaj alarmov:</strong> ${data.summary.total} | 
                <strong>Kritični:</strong> ${data.summary.critical} | 
                <strong>Visoki:</strong> ${data.summary.high}
            </div>`;

            data.alerts.slice(0, 5).forEach(alert => {
                const alertClass = alert.priority === 'critical' ? 'alert-high' : 
                                 alert.priority === 'high' ? 'alert-high' : 
                                 alert.priority === 'medium' ? 'alert-medium' : 'alert-low';
                
                html += `<div class="alert ${alertClass}">
                    <strong>${alert.title}</strong><br>
                    ${alert.message}
                </div>`;
            });

            container.innerHTML = html;
        }

        function refreshDashboard() {
            loadDashboard();
        }

        // Auto refresh every 5 minutes
        setInterval(loadDashboard, 5 * 60 * 1000);

        // Initial load
        loadDashboard();
    </script>
</body>
</html>
"""

# Ustvari template direktorij in datoteko
import os

def create_dashboard_template():
    """Ustvari HTML template za dashboard"""
    template_dir = "templates"
    if not os.path.exists(template_dir):
        os.makedirs(template_dir)
    
    with open(os.path.join(template_dir, "dashboard.html"), "w", encoding="utf-8") as f:
        f.write(DASHBOARD_HTML)

# Primer uporabe
if __name__ == "__main__":
    # Ustvari template
    create_dashboard_template()
    
    # Zaženi dashboard
    dashboard = PremiumDashboard()
    dashboard.run(debug=True)