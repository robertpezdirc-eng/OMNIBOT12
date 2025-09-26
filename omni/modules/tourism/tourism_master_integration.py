"""
🚀 TOURISM MASTER INTEGRATION
Glavni integracijski modul za gostinstvo in turizem

Povezuje vse komponente:
- Premium Core (POS, rezervacije, zaloge)
- AI Hospitality Engine (menu, promocije, analitika)
- Automation Manager (avtomatizacija procesov)
- Premium Dashboard (vizualizacija)
- Market Analysis (ROI, cenovna strategija)

Funkcionalnosti:
- Centralizirano upravljanje
- Real-time sinhronizacija
- API endpoints
- Monitoring in logging
- Backup in recovery
"""

import asyncio
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import logging
import threading
import schedule
import time

# Import naših modulov
from tourism_premium_core import TourismPremiumCore
from ai_hospitality_engine import AIHospitalityEngine
from automation_manager import AutomationManager
from premium_dashboard import PremiumDashboard
from market_analysis import MarketAnalysis, BusinessMetrics

# Nastavi logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tourism_master.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class TourismMasterIntegration:
    """Master integracijski sistem za gostinstvo"""
    
    def __init__(self, db_path: str = "tourism_premium.db"):
        self.db_path = db_path
        
        # Inicializiraj komponente
        self.core = TourismPremiumCore(db_path)
        self.ai_engine = AIHospitalityEngine(db_path)
        self.automation = AutomationManager(db_path)
        self.dashboard = PremiumDashboard(db_path)
        self.market_analysis = MarketAnalysis(db_path)
        
        # Flask aplikacija
        self.app = Flask(__name__)
        CORS(self.app)
        
        # Status sistema
        self.system_status = {
            "started_at": datetime.now().isoformat(),
            "components": {
                "core": True,
                "ai_engine": True,
                "automation": True,
                "dashboard": True,
                "market_analysis": True
            },
            "active_processes": 0,
            "last_sync": None
        }
        
        # Nastavi API endpoints
        self.setup_api_routes()
        
        # Zaženi background procese
        self.start_background_processes()
        
        logger.info("🚀 Tourism Master Integration inicializiran")
    
    def setup_api_routes(self):
        """Nastavi API endpoints"""
        
        # ==================== SISTEM STATUS ====================
        
        @self.app.route('/api/status')
        def system_status():
            """Status sistema"""
            return jsonify(self.get_system_status())
        
        @self.app.route('/api/health')
        def health_check():
            """Health check"""
            return jsonify({
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "components": self.system_status["components"]
            })
        
        # ==================== POS & CORE ====================
        
        @self.app.route('/api/pos/transaction', methods=['POST'])
        def create_pos_transaction():
            """Ustvari POS transakcijo"""
            data = request.json
            try:
                transaction_id = self.core.process_pos_transaction(
                    items=data['items'],
                    payment_method=data.get('payment_method', 'cash'),
                    customer_id=data.get('customer_id')
                )
                
                # Trigger AI analizo
                self.ai_engine.analyze_transaction_patterns()
                
                return jsonify({
                    "success": True,
                    "transaction_id": transaction_id,
                    "message": "Transakcija uspešno procesirana"
                })
            except Exception as e:
                logger.error(f"Napaka pri POS transakciji: {e}")
                return jsonify({"success": False, "error": str(e)}), 500
        
        @self.app.route('/api/reservations', methods=['POST'])
        def create_reservation():
            """Ustvari rezervacijo"""
            data = request.json
            try:
                reservation_id = self.core.create_reservation(
                    customer_name=data['customer_name'],
                    datetime_start=data['datetime_start'],
                    duration_hours=data.get('duration_hours', 2),
                    party_size=data.get('party_size', 2),
                    special_requests=data.get('special_requests', '')
                )
                
                return jsonify({
                    "success": True,
                    "reservation_id": reservation_id,
                    "message": "Rezervacija uspešno ustvarjena"
                })
            except Exception as e:
                logger.error(f"Napaka pri rezervaciji: {e}")
                return jsonify({"success": False, "error": str(e)}), 500
        
        @self.app.route('/api/inventory')
        def get_inventory():
            """Pridobi stanje zalog"""
            return jsonify(self.core.get_inventory_status())
        
        @self.app.route('/api/inventory/update', methods=['POST'])
        def update_inventory():
            """Posodobi zaloge"""
            data = request.json
            try:
                self.core.update_inventory_stock(
                    item_name=data['item_name'],
                    quantity_change=data['quantity_change'],
                    reason=data.get('reason', 'manual_update')
                )
                
                # Preveri, če je potrebno avtomatsko naročilo
                self.automation.check_and_create_stock_orders()
                
                return jsonify({
                    "success": True,
                    "message": "Zaloge posodobljene"
                })
            except Exception as e:
                logger.error(f"Napaka pri posodobitvi zalog: {e}")
                return jsonify({"success": False, "error": str(e)}), 500
        
        # ==================== AI FUNKCIONALNOSTI ====================
        
        @self.app.route('/api/ai/menu-suggestions')
        def get_menu_suggestions():
            """AI predlogi za menu"""
            suggestions = self.ai_engine.generate_menu_suggestions()
            return jsonify(suggestions)
        
        @self.app.route('/api/ai/pricing-optimization')
        def get_pricing_optimization():
            """AI optimizacija cen"""
            optimization = self.ai_engine.optimize_pricing()
            return jsonify(optimization)
        
        @self.app.route('/api/ai/customer-insights')
        def get_customer_insights():
            """AI analiza strank"""
            insights = self.ai_engine.analyze_customer_satisfaction()
            return jsonify(insights)
        
        @self.app.route('/api/ai/demand-forecast')
        def get_demand_forecast():
            """AI napoved povpraševanja"""
            forecast = self.ai_engine.predict_demand()
            return jsonify(forecast)
        
        # ==================== AVTOMATIZACIJA ====================
        
        @self.app.route('/api/automation/rules')
        def get_automation_rules():
            """Pridobi avtomatizacijske pravila"""
            return jsonify(self.automation.get_active_rules())
        
        @self.app.route('/api/automation/rules', methods=['POST'])
        def create_automation_rule():
            """Ustvari avtomatizacijsko pravilo"""
            data = request.json
            try:
                rule_id = self.automation.create_automation_rule(
                    name=data['name'],
                    trigger_type=data['trigger_type'],
                    conditions=data['conditions'],
                    actions=data['actions']
                )
                
                return jsonify({
                    "success": True,
                    "rule_id": rule_id,
                    "message": "Pravilo uspešno ustvarjeno"
                })
            except Exception as e:
                logger.error(f"Napaka pri ustvarjanju pravila: {e}")
                return jsonify({"success": False, "error": str(e)}), 500
        
        @self.app.route('/api/automation/notifications')
        def get_notifications():
            """Pridobi notifikacije"""
            return jsonify(self.automation.get_pending_notifications())
        
        # ==================== DASHBOARD & ANALYTICS ====================
        
        @self.app.route('/api/dashboard/kpi')
        def dashboard_kpi():
            """Dashboard KPI"""
            return self.dashboard.get_kpi_data()
        
        @self.app.route('/api/analytics/sales')
        def sales_analytics():
            """Prodajne analitike"""
            return jsonify(self.get_comprehensive_sales_analytics())
        
        @self.app.route('/api/analytics/performance')
        def performance_analytics():
            """Performance analitike"""
            return jsonify(self.get_performance_metrics())
        
        # ==================== MARKET ANALYSIS ====================
        
        @self.app.route('/api/market/roi-calculator', methods=['POST'])
        def calculate_roi():
            """ROI kalkulator"""
            data = request.json
            try:
                metrics = BusinessMetrics(**data)
                roi = self.market_analysis.calculate_roi(metrics)
                
                return jsonify({
                    "success": True,
                    "roi_calculation": roi.__dict__
                })
            except Exception as e:
                logger.error(f"Napaka pri ROI kalkulaciji: {e}")
                return jsonify({"success": False, "error": str(e)}), 500
        
        @self.app.route('/api/market/pricing-plans')
        def get_pricing_plans():
            """Cenovna strategija"""
            plans = self.market_analysis.create_pricing_strategy()
            return jsonify([plan.__dict__ for plan in plans])
        
        @self.app.route('/api/market/business-case/<business_type>')
        def get_business_case(business_type):
            """Business case za tip podjetja"""
            case = self.market_analysis.generate_business_case(business_type)
            return jsonify(case)
        
        # ==================== ADMIN & MANAGEMENT ====================
        
        @self.app.route('/api/admin/backup', methods=['POST'])
        def create_backup():
            """Ustvari backup"""
            try:
                backup_path = self.create_system_backup()
                return jsonify({
                    "success": True,
                    "backup_path": backup_path,
                    "message": "Backup uspešno ustvarjen"
                })
            except Exception as e:
                logger.error(f"Napaka pri backup-u: {e}")
                return jsonify({"success": False, "error": str(e)}), 500
        
        @self.app.route('/api/admin/sync', methods=['POST'])
        def force_sync():
            """Prisilna sinhronizacija"""
            try:
                self.sync_all_components()
                return jsonify({
                    "success": True,
                    "message": "Sinhronizacija uspešna"
                })
            except Exception as e:
                logger.error(f"Napaka pri sinhronizaciji: {e}")
                return jsonify({"success": False, "error": str(e)}), 500
        
        # ==================== WEB INTERFACE ====================
        
        @self.app.route('/')
        def main_dashboard():
            """Glavni dashboard"""
            return render_template('master_dashboard.html')
        
        @self.app.route('/admin')
        def admin_panel():
            """Admin panel"""
            return render_template('admin_panel.html')
    
    # ==================== SISTEM MANAGEMENT ====================
    
    def get_system_status(self) -> Dict[str, Any]:
        """Pridobi status sistema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Statistike baze
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        table_stats = {}
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            table_stats[table] = count
        
        conn.close()
        
        # Sistemske metrike
        uptime = datetime.now() - datetime.fromisoformat(self.system_status["started_at"])
        
        return {
            "system_info": {
                "status": "running",
                "uptime_seconds": uptime.total_seconds(),
                "uptime_formatted": str(uptime),
                "version": "1.0.0",
                "database_path": self.db_path
            },
            "components": self.system_status["components"],
            "database_stats": table_stats,
            "performance": {
                "active_processes": self.system_status["active_processes"],
                "last_sync": self.system_status["last_sync"],
                "memory_usage": "N/A",  # Bi lahko dodali psutil
                "cpu_usage": "N/A"
            }
        }
    
    def sync_all_components(self):
        """Sinhroniziraj vse komponente"""
        logger.info("🔄 Začenjam sinhronizacijo vseh komponent...")
        
        try:
            # Sinhroniziraj AI insights
            self.ai_engine.analyze_customer_satisfaction([], {})
            # self.ai_engine.analyze_customer_satisfaction()
            
            # Preveri avtomatizacijske pravila
            self.automation.start_automation()
            
            # Posodobi dashboard podatke
            # (Dashboard se posodablja preko API klicev)
            
            self.system_status["last_sync"] = datetime.now().isoformat()
            logger.info("✅ Sinhronizacija uspešna")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri sinhronizaciji: {e}")
            raise
    
    def create_system_backup(self) -> str:
        """Ustvari backup sistema"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"backup_tourism_{timestamp}.db"
        
        # Kopiraj glavno bazo
        import shutil
        shutil.copy2(self.db_path, backup_path)
        
        logger.info(f"💾 Backup ustvarjen: {backup_path}")
        return backup_path
    
    # ==================== ANALYTICS ====================
    
    def get_comprehensive_sales_analytics(self) -> Dict[str, Any]:
        """Celovite prodajne analitike"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Zadnjih 30 dni
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        # Osnovne statistike
        cursor.execute('''
            SELECT 
                COUNT(*) as total_transactions,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as avg_transaction,
                MIN(total_amount) as min_transaction,
                MAX(total_amount) as max_transaction
            FROM pos_transactions 
            WHERE DATE(timestamp) BETWEEN ? AND ?
        ''', (start_date.isoformat(), end_date.isoformat()))
        
        basic_stats = cursor.fetchone()
        
        # Trendi po dnevih
        cursor.execute('''
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as transactions,
                SUM(total_amount) as revenue,
                AVG(total_amount) as avg_amount
            FROM pos_transactions 
            WHERE DATE(timestamp) BETWEEN ? AND ?
            GROUP BY DATE(timestamp)
            ORDER BY date
        ''', (start_date.isoformat(), end_date.isoformat()))
        
        daily_trends = cursor.fetchall()
        
        # Top izdelki
        cursor.execute('''
            SELECT items
            FROM pos_transactions 
            WHERE DATE(timestamp) BETWEEN ? AND ?
        ''', (start_date.isoformat(), end_date.isoformat()))
        
        transactions = cursor.fetchall()
        
        # Analiziraj izdelke
        item_stats = {}
        for transaction in transactions:
            items = json.loads(transaction[0])
            for item in items:
                name = item.get('name', 'Unknown')
                quantity = item.get('quantity', 1)
                price = item.get('price', 0)
                
                if name not in item_stats:
                    item_stats[name] = {"quantity": 0, "revenue": 0, "transactions": 0}
                
                item_stats[name]["quantity"] += quantity
                item_stats[name]["revenue"] += price * quantity
                item_stats[name]["transactions"] += 1
        
        # Sortiraj po prihodku
        top_items = sorted(item_stats.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]
        
        conn.close()
        
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": (end_date - start_date).days + 1
            },
            "summary": {
                "total_transactions": basic_stats[0],
                "total_revenue": basic_stats[1],
                "average_transaction": basic_stats[2],
                "min_transaction": basic_stats[3],
                "max_transaction": basic_stats[4]
            },
            "daily_trends": [
                {
                    "date": row[0],
                    "transactions": row[1],
                    "revenue": row[2],
                    "avg_amount": row[3]
                } for row in daily_trends
            ],
            "top_items": [
                {
                    "name": name,
                    "quantity_sold": stats["quantity"],
                    "revenue": stats["revenue"],
                    "transactions": stats["transactions"],
                    "avg_price": stats["revenue"] / stats["quantity"] if stats["quantity"] > 0 else 0
                } for name, stats in top_items
            ]
        }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Performance metrike"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Učinkovitost osebja
        cursor.execute('''
            SELECT 
                AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate,
                COUNT(*) as total_schedules
            FROM staff_schedules 
            WHERE date >= date('now', '-30 days')
        ''')
        
        staff_performance = cursor.fetchone()
        
        # Učinkovitost zalog
        cursor.execute('''
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN current_stock <= min_stock THEN 1 ELSE 0 END) as low_stock_items,
                AVG(current_stock * 1.0 / max_stock) as avg_stock_level
            FROM inventory
        ''')
        
        inventory_performance = cursor.fetchone()
        
        # Rezervacije
        cursor.execute('''
            SELECT 
                COUNT(*) as total_reservations,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_reservations,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_reservations
            FROM reservations 
            WHERE DATE(datetime_start) >= date('now', '-30 days')
        ''')
        
        reservation_performance = cursor.fetchone()
        
        conn.close()
        
        # Izračunaj metrike
        staff_efficiency = (staff_performance[0] * 100) if staff_performance[0] else 0
        inventory_efficiency = (1 - (inventory_performance[1] / inventory_performance[0])) * 100 if inventory_performance[0] > 0 else 100
        reservation_success_rate = (reservation_performance[1] / reservation_performance[0]) * 100 if reservation_performance[0] > 0 else 0
        
        return {
            "staff_performance": {
                "efficiency_percentage": round(staff_efficiency, 1),
                "total_schedules": staff_performance[1],
                "completion_rate": round(staff_performance[0] * 100, 1) if staff_performance[0] else 0
            },
            "inventory_performance": {
                "efficiency_percentage": round(inventory_efficiency, 1),
                "total_items": inventory_performance[0],
                "low_stock_items": inventory_performance[1],
                "avg_stock_level": round(inventory_performance[2] * 100, 1) if inventory_performance[2] else 0
            },
            "reservation_performance": {
                "success_rate": round(reservation_success_rate, 1),
                "total_reservations": reservation_performance[0],
                "confirmed": reservation_performance[1],
                "cancelled": reservation_performance[2]
            },
            "overall_score": round((staff_efficiency + inventory_efficiency + reservation_success_rate) / 3, 1)
        }
    
    # ==================== BACKGROUND PROCESI ====================
    
    def start_background_processes(self):
        """Zaženi background procese"""
        
        def run_scheduler():
            """Zaženi scheduler v ločeni niti"""
            while True:
                schedule.run_pending()
                time.sleep(60)  # Preveri vsako minuto
        
        # Nastavi scheduled naloge
        schedule.every(5).minutes.do(self.automation.start_automation)
        schedule.every(15).minutes.do(lambda: self.ai_engine.analyze_customer_satisfaction([], {}))
        schedule.every(1).hours.do(self.sync_all_components)
        schedule.every(6).hours.do(self.create_system_backup)
        
        # Zaženi scheduler v background
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        
        logger.info("⚙️ Background procesi zagnani")
    
    # ==================== ZAGON SISTEMA ====================
    
    def run(self, host='0.0.0.0', port=8080, debug=False):
        """Zaženi master sistem"""
        logger.info(f"🚀 Tourism Master System zagnan na http://{host}:{port}")
        logger.info("📊 Dashboard: http://localhost:8080")
        logger.info("⚙️ Admin panel: http://localhost:8080/admin")
        logger.info("📡 API dokumentacija: http://localhost:8080/api/status")
        
        self.app.run(host=host, port=port, debug=debug, threaded=True)

# HTML Template za master dashboard
MASTER_DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tourism Master System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; text-align: center; }
        .header h1 { font-size: 3rem; margin-bottom: 1rem; }
        .header p { font-size: 1.2rem; opacity: 0.9; }
        .nav { background: white; padding: 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .nav-links { display: flex; gap: 2rem; justify-content: center; }
        .nav-link { padding: 0.75rem 1.5rem; background: #667eea; color: white; text-decoration: none; border-radius: 25px; transition: all 0.3s; }
        .nav-link:hover { background: #5a67d8; transform: translateY(-2px); }
        .main-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem; padding: 2rem; }
        .module-card { background: white; border-radius: 15px; padding: 2rem; box-shadow: 0 5px 20px rgba(0,0,0,0.1); transition: transform 0.3s; }
        .module-card:hover { transform: translateY(-5px); }
        .module-icon { font-size: 3rem; margin-bottom: 1rem; }
        .module-title { font-size: 1.5rem; margin-bottom: 1rem; color: #333; }
        .module-desc { color: #666; margin-bottom: 1.5rem; line-height: 1.6; }
        .module-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        .stat { text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
        .stat-value { font-size: 1.5rem; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 0.9rem; color: #666; }
        .module-actions { display: flex; gap: 1rem; }
        .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; text-decoration: none; text-align: center; transition: all 0.3s; }
        .btn-primary { background: #667eea; color: white; }
        .btn-secondary { background: #e2e8f0; color: #4a5568; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .status-online { background: #48bb78; }
        .status-offline { background: #f56565; }
        .footer { text-align: center; padding: 2rem; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏨 Tourism Master System</h1>
        <p>Centralizirano upravljanje gostinstva in turizma</p>
    </div>

    <nav class="nav">
        <div class="nav-links">
            <a href="/" class="nav-link">🏠 Dashboard</a>
            <a href="/admin" class="nav-link">⚙️ Admin</a>
            <a href="/api/status" class="nav-link">📡 API Status</a>
            <a href="http://localhost:5000" class="nav-link" target="_blank">📊 Analytics</a>
        </div>
    </nav>

    <div class="main-grid">
        <!-- POS & Core Module -->
        <div class="module-card">
            <div class="module-icon">🛒</div>
            <h3 class="module-title">POS & Core System</h3>
            <p class="module-desc">Upravljanje prodaje, rezervacij, zalog in osnovnih poslovnih procesov.</p>
            <div class="module-stats">
                <div class="stat">
                    <div class="stat-value" id="todayTransactions">-</div>
                    <div class="stat-label">Današnje transakcije</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="todayRevenue">-</div>
                    <div class="stat-label">Današnji prihodek</div>
                </div>
            </div>
            <div class="module-actions">
                <button class="btn btn-primary" onclick="openPOSInterface()">Odpri POS</button>
                <button class="btn btn-secondary" onclick="viewInventory()">Zaloge</button>
            </div>
        </div>

        <!-- AI Engine Module -->
        <div class="module-card">
            <div class="module-icon">🤖</div>
            <h3 class="module-title">AI Hospitality Engine</h3>
            <p class="module-desc">Inteligentni predlogi za menu, cene, promocije in analiza zadovoljstva strank.</p>
            <div class="module-stats">
                <div class="stat">
                    <div class="stat-value" id="aiInsights">-</div>
                    <div class="stat-label">AI Insights</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="satisfactionScore">-</div>
                    <div class="stat-label">Zadovoljstvo (%)</div>
                </div>
            </div>
            <div class="module-actions">
                <button class="btn btn-primary" onclick="getMenuSuggestions()">Menu predlogi</button>
                <button class="btn btn-secondary" onclick="viewAIInsights()">AI Analitika</button>
            </div>
        </div>

        <!-- Automation Module -->
        <div class="module-card">
            <div class="module-icon">⚡</div>
            <h3 class="module-title">Automation Manager</h3>
            <p class="module-desc">Avtomatizacija naročanja zalog, kadrovskih procesov in pošiljanja notifikacij.</p>
            <div class="module-stats">
                <div class="stat">
                    <div class="stat-value" id="activeRules">-</div>
                    <div class="stat-label">Aktivna pravila</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="pendingNotifications">-</div>
                    <div class="stat-label">Čakajoče notifikacije</div>
                </div>
            </div>
            <div class="module-actions">
                <button class="btn btn-primary" onclick="manageAutomation()">Upravljaj pravila</button>
                <button class="btn btn-secondary" onclick="viewNotifications()">Notifikacije</button>
            </div>
        </div>

        <!-- Dashboard Module -->
        <div class="module-card">
            <div class="module-icon">📊</div>
            <h3 class="module-title">Premium Dashboard</h3>
            <p class="module-desc">Real-time vizualizacija poslovanja, KPI indikatorji in napredne analitike.</p>
            <div class="module-stats">
                <div class="stat">
                    <div class="stat-value" id="dashboardViews">-</div>
                    <div class="stat-label">Dnevni pogledi</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="kpiScore">-</div>
                    <div class="stat-label">KPI Score</div>
                </div>
            </div>
            <div class="module-actions">
                <button class="btn btn-primary" onclick="openDashboard()">Odpri Dashboard</button>
                <button class="btn btn-secondary" onclick="exportReports()">Izvozi poročila</button>
            </div>
        </div>

        <!-- Market Analysis Module -->
        <div class="module-card">
            <div class="module-icon">💰</div>
            <h3 class="module-title">Market Analysis</h3>
            <p class="module-desc">ROI kalkulacije, cenovna strategija, konkurenčna analiza in tržne projekcije.</p>
            <div class="module-stats">
                <div class="stat">
                    <div class="stat-value" id="monthlyROI">-</div>
                    <div class="stat-label">Mesečni ROI (%)</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="savings">-</div>
                    <div class="stat-label">Prihranki (€)</div>
                </div>
            </div>
            <div class="module-actions">
                <button class="btn btn-primary" onclick="calculateROI()">ROI Kalkulator</button>
                <button class="btn btn-secondary" onclick="viewMarketAnalysis()">Tržna analiza</button>
            </div>
        </div>

        <!-- System Status Module -->
        <div class="module-card">
            <div class="module-icon">⚙️</div>
            <h3 class="module-title">System Status</h3>
            <p class="module-desc">Monitoring sistema, backup, sinhronizacija in sistemske nastavitve.</p>
            <div class="module-stats">
                <div class="stat">
                    <div class="stat-value" id="systemUptime">-</div>
                    <div class="stat-label">Uptime</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="lastBackup">-</div>
                    <div class="stat-label">Zadnji backup</div>
                </div>
            </div>
            <div class="module-actions">
                <button class="btn btn-primary" onclick="viewSystemStatus()">Status sistema</button>
                <button class="btn btn-secondary" onclick="createBackup()">Ustvari backup</button>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Tourism Master System v1.0 | Powered by Omni AI Platform</p>
    </div>

    <script>
        // Load system data
        async function loadSystemData() {
            try {
                // Load KPI data
                const kpiResponse = await fetch('/api/dashboard/kpi');
                const kpiData = await kpiResponse.json();
                
                document.getElementById('todayTransactions').textContent = kpiData.transactions?.value || '0';
                document.getElementById('todayRevenue').textContent = '€' + (kpiData.revenue?.value || 0).toFixed(2);
                document.getElementById('satisfactionScore').textContent = (kpiData.satisfaction?.value || 0).toFixed(1);
                
                // Load system status
                const statusResponse = await fetch('/api/status');
                const statusData = await statusResponse.json();
                
                const uptime = Math.floor(statusData.system_info.uptime_seconds / 3600);
                document.getElementById('systemUptime').textContent = uptime + 'h';
                
                // Load automation data
                const automationResponse = await fetch('/api/automation/rules');
                const automationData = await automationResponse.json();
                
                document.getElementById('activeRules').textContent = automationData.length || '0';
                
            } catch (error) {
                console.error('Error loading system data:', error);
            }
        }

        // Module functions
        function openPOSInterface() {
            alert('POS Interface - V razvoju');
        }

        function viewInventory() {
            window.open('/api/inventory', '_blank');
        }

        function getMenuSuggestions() {
            window.open('/api/ai/menu-suggestions', '_blank');
        }

        function viewAIInsights() {
            window.open('/api/ai/customer-insights', '_blank');
        }

        function manageAutomation() {
            window.open('/api/automation/rules', '_blank');
        }

        function viewNotifications() {
            window.open('/api/automation/notifications', '_blank');
        }

        function openDashboard() {
            window.open('http://localhost:5000', '_blank');
        }

        function exportReports() {
            alert('Export Reports - V razvoju');
        }

        function calculateROI() {
            window.open('/api/market/pricing-plans', '_blank');
        }

        function viewMarketAnalysis() {
            window.open('/api/market/business-case/restaurant', '_blank');
        }

        function viewSystemStatus() {
            window.open('/api/status', '_blank');
        }

        async function createBackup() {
            try {
                const response = await fetch('/api/admin/backup', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    alert('Backup uspešno ustvarjen: ' + result.backup_path);
                } else {
                    alert('Napaka pri ustvarjanju backup-a: ' + result.error);
                }
            } catch (error) {
                alert('Napaka: ' + error.message);
            }
        }

        // Auto refresh every 30 seconds
        setInterval(loadSystemData, 30000);

        // Initial load
        loadSystemData();
    </script>
</body>
</html>
"""

# Ustvari template
def create_master_templates():
    """Ustvari HTML template-e"""
    import os
    
    template_dir = "templates"
    if not os.path.exists(template_dir):
        os.makedirs(template_dir)
    
    with open(os.path.join(template_dir, "master_dashboard.html"), "w", encoding="utf-8") as f:
        f.write(MASTER_DASHBOARD_HTML)
    
    # Admin panel template (poenostavljen)
    admin_html = """
    <!DOCTYPE html>
    <html>
    <head><title>Admin Panel</title></head>
    <body>
        <h1>Admin Panel</h1>
        <p>Admin funkcionalnosti v razvoju...</p>
        <a href="/">Nazaj na dashboard</a>
    </body>
    </html>
    """
    
    with open(os.path.join(template_dir, "admin_panel.html"), "w", encoding="utf-8") as f:
        f.write(admin_html)

# Primer uporabe
def main():
    """Glavna funkcija za zagon sistema"""
    # Ustvari template-e
    create_master_templates()
    
    # Zaženi master sistem
    master = TourismMasterIntegration()
    master.run(debug=True)

if __name__ == "__main__":
    main()