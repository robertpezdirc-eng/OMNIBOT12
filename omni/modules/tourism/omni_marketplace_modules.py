#!/usr/bin/env python3
"""
OMNI Marketplace Modules - Tržnica modulov za dokup novih funkcionalnosti
AI optimizacija, AR katalog, ERP povezave, in drugi premium moduli
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

class OmniMarketplaceModules:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = secrets.token_hex(32)
        
        # Database and configuration
        self.db_path = "omni_marketplace.db"
        self.modules_catalog_path = "omni_modules_catalog.json"
        
        # Marketplace configuration
        self.marketplace_config = {
            "api_base_url": "https://api.omni-marketplace.com",
            "license_check_interval": 3600,  # 1 hour
            "module_update_interval": 86400,  # 24 hours
            "demo_mode": True,
            "sandbox_mode": True
        }
        
        # Available modules catalog
        self.modules_catalog = {
            "ai_optimization": {
                "id": "ai_optimization",
                "name": "AI Optimizacija",
                "description": "Napredna AI optimizacija cen, zasedenosti in prihodkov",
                "category": "artificial_intelligence",
                "version": "2.1.0",
                "price_monthly": 49.99,
                "price_yearly": 499.99,
                "features": [
                    "Dinamično prilagajanje cen",
                    "Napoved povpraševanja",
                    "Optimizacija zasedenosti",
                    "Analiza konkurence",
                    "Personalizirani predlogi",
                    "Real-time prilagajanje"
                ],
                "requirements": ["python>=3.8", "tensorflow>=2.8", "scikit-learn>=1.0"],
                "compatibility": ["tourism", "hospitality", "retail"],
                "demo_available": True,
                "trial_days": 14,
                "rating": 4.8,
                "downloads": 1247,
                "last_updated": "2024-09-15"
            },
            "ar_catalog": {
                "id": "ar_catalog",
                "name": "AR Katalog",
                "description": "Interaktivni AR katalog sob, jedilnikov in aktivnosti",
                "category": "augmented_reality",
                "version": "1.5.2",
                "price_monthly": 79.99,
                "price_yearly": 799.99,
                "features": [
                    "3D virtualni ogledi",
                    "AR menu prezentacije",
                    "Interaktivni katalogi",
                    "360° panorame",
                    "QR code integracija",
                    "Multi-platform podpora"
                ],
                "requirements": ["webgl", "camera_access", "ar_core"],
                "compatibility": ["tourism", "hospitality", "retail", "real_estate"],
                "demo_available": True,
                "trial_days": 7,
                "rating": 4.6,
                "downloads": 892,
                "last_updated": "2024-09-10"
            },
            "erp_connector": {
                "id": "erp_connector",
                "name": "ERP Konektor",
                "description": "Direktna integracija z ERP sistemi (SAP, Oracle, Microsoft)",
                "category": "integration",
                "version": "3.2.1",
                "price_monthly": 129.99,
                "price_yearly": 1299.99,
                "features": [
                    "SAP integracija",
                    "Oracle ERP podpora",
                    "Microsoft Dynamics",
                    "Real-time sinhronizacija",
                    "Avtomatski import/export",
                    "Custom API endpoints"
                ],
                "requirements": ["enterprise_license", "api_access", "ssl_certificate"],
                "compatibility": ["enterprise", "large_business"],
                "demo_available": False,
                "trial_days": 30,
                "rating": 4.9,
                "downloads": 456,
                "last_updated": "2024-09-20"
            },
            "pos_integration": {
                "id": "pos_integration",
                "name": "POS Integracija",
                "description": "Povezava z blagajnami in POS sistemi",
                "category": "point_of_sale",
                "version": "2.8.0",
                "price_monthly": 39.99,
                "price_yearly": 399.99,
                "features": [
                    "Square integracija",
                    "PayPal Here podpora",
                    "Stripe Terminal",
                    "Inventar sinhronizacija",
                    "Real-time prodaja",
                    "Poročila in analitika"
                ],
                "requirements": ["pos_hardware", "internet_connection"],
                "compatibility": ["retail", "hospitality", "food_service"],
                "demo_available": True,
                "trial_days": 14,
                "rating": 4.7,
                "downloads": 1834,
                "last_updated": "2024-09-18"
            },
            "advanced_analytics": {
                "id": "advanced_analytics",
                "name": "Napredna Analitika",
                "description": "Poglobljena analitika s prediktivnimi modeli",
                "category": "analytics",
                "version": "1.9.3",
                "price_monthly": 69.99,
                "price_yearly": 699.99,
                "features": [
                    "Prediktivni modeli",
                    "Segmentacija strank",
                    "Cohort analiza",
                    "A/B testiranje",
                    "Custom dashboardi",
                    "Avtomatska poročila"
                ],
                "requirements": ["python>=3.8", "pandas>=1.3", "plotly>=5.0"],
                "compatibility": ["all_industries"],
                "demo_available": True,
                "trial_days": 21,
                "rating": 4.5,
                "downloads": 723,
                "last_updated": "2024-09-12"
            },
            "mobile_app_builder": {
                "id": "mobile_app_builder",
                "name": "Mobile App Builder",
                "description": "Ustvarjalnik mobilnih aplikacij brez kodiranja",
                "category": "mobile_development",
                "version": "2.3.1",
                "price_monthly": 99.99,
                "price_yearly": 999.99,
                "features": [
                    "Drag & drop builder",
                    "Native iOS/Android",
                    "Push notifications",
                    "Offline funkcionalnost",
                    "App store deployment",
                    "Custom branding"
                ],
                "requirements": ["mobile_dev_license", "app_store_account"],
                "compatibility": ["all_industries"],
                "demo_available": True,
                "trial_days": 14,
                "rating": 4.4,
                "downloads": 567,
                "last_updated": "2024-09-08"
            }
        }
        
        self.setup_logging()
        self.init_database()
        self.setup_routes()
        self.start_marketplace_monitor()
        
    def setup_logging(self):
        """Setup logging for marketplace"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def init_database(self):
        """Initialize marketplace database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Purchased modules table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS purchased_modules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                module_id TEXT NOT NULL,
                module_name TEXT,
                version TEXT,
                purchase_type TEXT DEFAULT 'monthly',
                price_paid REAL,
                purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expiry_date TIMESTAMP,
                status TEXT DEFAULT 'active',
                license_key TEXT,
                installation_status TEXT DEFAULT 'pending',
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Module installations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS module_installations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module_id TEXT NOT NULL,
                installation_path TEXT,
                config_data TEXT,
                status TEXT DEFAULT 'installed',
                installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_health_check TIMESTAMP,
                health_status TEXT DEFAULT 'healthy'
            )
        ''')
        
        # Module usage analytics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS module_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module_id TEXT NOT NULL,
                user_id INTEGER,
                action TEXT,
                usage_data TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Module reviews and ratings
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS module_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module_id TEXT NOT NULL,
                user_id INTEGER,
                rating INTEGER CHECK(rating >= 1 AND rating <= 5),
                review_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                helpful_votes INTEGER DEFAULT 0
            )
        ''')
        
        # Create demo purchases
        demo_purchases = [
            ("ai_optimization", "AI Optimizacija", "2.1.0", "monthly", 49.99, "trial"),
            ("ar_catalog", "AR Katalog", "1.5.2", "trial", 0.00, "trial"),
            ("pos_integration", "POS Integracija", "2.8.0", "yearly", 399.99, "active")
        ]
        
        for module_id, name, version, purchase_type, price, status in demo_purchases:
            license_key = f"OMNI-{module_id.upper()}-{secrets.token_hex(8).upper()}"
            expiry_date = datetime.now() + timedelta(days=30 if status == "trial" else 365)
            
            cursor.execute('''
                INSERT OR IGNORE INTO purchased_modules 
                (user_id, module_id, module_name, version, purchase_type, price_paid, expiry_date, status, license_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (1, module_id, name, version, purchase_type, price, expiry_date.isoformat(), status, license_key))
        
        # Create demo installations
        demo_installations = [
            ("ai_optimization", "/modules/ai_optimization", '{"enabled": true, "auto_update": true}', "installed"),
            ("pos_integration", "/modules/pos_integration", '{"enabled": true, "pos_type": "square"}', "installed")
        ]
        
        for module_id, path, config, status in demo_installations:
            cursor.execute('''
                INSERT OR IGNORE INTO module_installations 
                (module_id, installation_path, config_data, status, last_health_check, health_status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (module_id, path, config, status, datetime.now().isoformat(), "healthy"))
        
        conn.commit()
        conn.close()
        
        self.logger.info("🛒 Marketplace database initialized with demo data")
        
    def start_marketplace_monitor(self):
        """Start background marketplace monitoring"""
        def monitor_marketplace():
            while True:
                try:
                    # Check license expiry
                    self.check_license_expiry()
                    
                    # Check for module updates
                    self.check_module_updates()
                    
                    # Health check installed modules
                    self.health_check_modules()
                    
                except Exception as e:
                    self.logger.error(f"Marketplace monitor error: {e}")
                
                time.sleep(self.marketplace_config["license_check_interval"])
        
        monitor_thread = threading.Thread(target=monitor_marketplace, daemon=True)
        monitor_thread.start()
        self.logger.info("🔍 Marketplace monitor started")
    
    def check_license_expiry(self):
        """Check for expiring licenses"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Find licenses expiring in next 7 days
        expiry_threshold = datetime.now() + timedelta(days=7)
        cursor.execute('''
            SELECT module_id, module_name, expiry_date, status
            FROM purchased_modules
            WHERE expiry_date < ? AND status = 'active'
        ''', (expiry_threshold.isoformat(),))
        
        expiring_licenses = cursor.fetchall()
        
        for module_id, module_name, expiry_date, status in expiring_licenses:
            self.logger.warning(f"License expiring soon: {module_name} ({module_id}) - {expiry_date}")
            
            # Update status if already expired
            if datetime.fromisoformat(expiry_date) < datetime.now():
                cursor.execute('''
                    UPDATE purchased_modules SET status = 'expired' WHERE module_id = ?
                ''', (module_id,))
        
        conn.commit()
        conn.close()
    
    def check_module_updates(self):
        """Check for available module updates"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT DISTINCT module_id, version FROM purchased_modules WHERE status = "active"')
        installed_modules = cursor.fetchall()
        
        for module_id, current_version in installed_modules:
            if module_id in self.modules_catalog:
                latest_version = self.modules_catalog[module_id]["version"]
                if latest_version != current_version:
                    self.logger.info(f"Update available for {module_id}: {current_version} -> {latest_version}")
        
        conn.close()
    
    def health_check_modules(self):
        """Perform health check on installed modules"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT module_id, installation_path FROM module_installations WHERE status = "installed"')
        installed_modules = cursor.fetchall()
        
        for module_id, installation_path in installed_modules:
            # Simulate health check
            health_status = "healthy" if secrets.randbelow(10) > 1 else "warning"
            
            cursor.execute('''
                UPDATE module_installations 
                SET last_health_check = ?, health_status = ?
                WHERE module_id = ?
            ''', (datetime.now().isoformat(), health_status, module_id))
        
        conn.commit()
        conn.close()
    
    def install_module(self, module_id, user_id):
        """Install a purchased module"""
        if module_id not in self.modules_catalog:
            return {"success": False, "message": "Module not found"}
        
        # Check if user has purchased the module
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, status FROM purchased_modules 
            WHERE module_id = ? AND user_id = ? AND status IN ('active', 'trial')
        ''', (module_id, user_id))
        
        purchase = cursor.fetchone()
        if not purchase:
            conn.close()
            return {"success": False, "message": "Module not purchased or expired"}
        
        # Simulate installation
        installation_path = f"/modules/{module_id}"
        config_data = json.dumps({"enabled": True, "auto_update": True})
        
        cursor.execute('''
            INSERT OR REPLACE INTO module_installations 
            (module_id, installation_path, config_data, status, health_status)
            VALUES (?, ?, ?, ?, ?)
        ''', (module_id, installation_path, config_data, "installed", "healthy"))
        
        # Update purchase status
        cursor.execute('''
            UPDATE purchased_modules SET installation_status = 'installed' WHERE id = ?
        ''', (purchase[0],))
        
        conn.commit()
        conn.close()
        
        self.logger.info(f"Module {module_id} installed successfully for user {user_id}")
        return {"success": True, "message": "Module installed successfully"}
    
    def uninstall_module(self, module_id, user_id):
        """Uninstall a module"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE module_installations SET status = 'uninstalled' WHERE module_id = ?
        ''', (module_id,))
        
        cursor.execute('''
            UPDATE purchased_modules SET installation_status = 'uninstalled' 
            WHERE module_id = ? AND user_id = ?
        ''', (module_id, user_id))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Module uninstalled successfully"}
    
    def setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/')
        def marketplace():
            return render_template_string('''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Marketplace Modules</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; color: white; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .tabs { display: flex; justify-content: center; margin-bottom: 30px; }
        .tab { background: rgba(255,255,255,0.2); color: white; padding: 12px 24px; margin: 0 5px; border-radius: 25px; cursor: pointer; transition: all 0.3s ease; }
        .tab.active { background: white; color: #667eea; }
        .tab:hover { background: rgba(255,255,255,0.3); }
        .modules-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .module-card { background: white; border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: transform 0.3s ease; position: relative; overflow: hidden; }
        .module-card:hover { transform: translateY(-5px); }
        .module-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .module-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
        .module-title { font-size: 1.4em; font-weight: bold; color: #333; margin-bottom: 5px; }
        .module-category { background: #f8f9fa; color: #666; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; text-transform: uppercase; }
        .module-description { color: #666; margin-bottom: 15px; line-height: 1.5; }
        .module-features { margin-bottom: 15px; }
        .module-features h4 { color: #333; margin-bottom: 8px; font-size: 1em; }
        .feature-list { list-style: none; padding: 0; }
        .feature-list li { padding: 4px 0; color: #666; font-size: 0.9em; }
        .feature-list li:before { content: "✓"; color: #28a745; font-weight: bold; margin-right: 8px; }
        .module-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-top: 15px; border-top: 1px solid #eee; }
        .module-price { font-size: 1.2em; font-weight: bold; color: #667eea; }
        .module-rating { display: flex; align-items: center; }
        .stars { color: #ffc107; margin-right: 5px; }
        .module-actions { display: flex; gap: 10px; }
        .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.3s ease; text-decoration: none; display: inline-block; text-align: center; }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .btn-success { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; }
        .btn-warning { background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); color: white; }
        .btn-danger { background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%); color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status-active { background: #28a745; color: white; }
        .status-trial { background: #ffc107; color: black; }
        .status-expired { background: #dc3545; color: white; }
        .status-installed { background: #17a2b8; color: white; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .dashboard-card { background: white; border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .dashboard-card h3 { color: #333; margin-bottom: 15px; }
        .metric { text-align: center; padding: 20px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .metric-label { color: #666; margin-top: 5px; }
        .module-item { padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .module-item h4 { margin: 0; color: #333; }
        .module-item p { margin: 5px 0 0 0; color: #666; font-size: 0.9em; }
        .search-box { width: 100%; max-width: 400px; margin: 0 auto 30px auto; padding: 12px 20px; border: 2px solid rgba(255,255,255,0.3); border-radius: 25px; background: rgba(255,255,255,0.1); color: white; font-size: 16px; }
        .search-box::placeholder { color: rgba(255,255,255,0.7); }
        .search-box:focus { outline: none; border-color: white; background: rgba(255,255,255,0.2); }
        .filter-tags { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-bottom: 30px; }
        .filter-tag { background: rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; transition: all 0.3s ease; }
        .filter-tag.active { background: white; color: #667eea; }
        .filter-tag:hover { background: rgba(255,255,255,0.3); }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .alert { padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .alert.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .alert.warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
        .modal-content { background: white; margin: 5% auto; padding: 30px; width: 90%; max-width: 600px; border-radius: 15px; position: relative; }
        .close { position: absolute; right: 20px; top: 20px; font-size: 28px; font-weight: bold; cursor: pointer; }
        .close:hover { color: #667eea; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛒 OMNI Marketplace</h1>
            <p>Tržnica modulov za dokup novih funkcionalnosti</p>
        </div>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('browse')">Prebrskaj module</div>
            <div class="tab" onclick="showTab('purchased')">Moji moduli</div>
            <div class="tab" onclick="showTab('installed')">Nameščeni</div>
            <div class="tab" onclick="showTab('analytics')">Analitika</div>
        </div>
        
        <div id="browse" class="tab-content active">
            <input type="text" class="search-box" placeholder="Išči module..." id="searchBox" onkeyup="filterModules()">
            
            <div class="filter-tags">
                <div class="filter-tag active" onclick="filterByCategory('all')">Vsi</div>
                <div class="filter-tag" onclick="filterByCategory('artificial_intelligence')">AI</div>
                <div class="filter-tag" onclick="filterByCategory('augmented_reality')">AR/VR</div>
                <div class="filter-tag" onclick="filterByCategory('integration')">Integracije</div>
                <div class="filter-tag" onclick="filterByCategory('analytics')">Analitika</div>
                <div class="filter-tag" onclick="filterByCategory('mobile_development')">Mobile</div>
            </div>
            
            <div class="modules-grid" id="modulesGrid"></div>
        </div>
        
        <div id="purchased" class="tab-content">
            <div class="dashboard">
                <div class="dashboard-card">
                    <h3>📊 Pregled nakupov</h3>
                    <div id="purchaseMetrics"></div>
                </div>
                
                <div class="dashboard-card">
                    <h3>💰 Stroški</h3>
                    <div id="costMetrics"></div>
                </div>
            </div>
            
            <div class="dashboard-card">
                <h3>🛍️ Kupljeni moduli</h3>
                <div id="purchasedModules"></div>
            </div>
        </div>
        
        <div id="installed" class="tab-content">
            <div class="dashboard">
                <div class="dashboard-card">
                    <h3>⚙️ Status namestitev</h3>
                    <div id="installationStatus"></div>
                </div>
                
                <div class="dashboard-card">
                    <h3>🔧 Zdravje modulov</h3>
                    <div id="moduleHealth"></div>
                </div>
            </div>
            
            <div class="dashboard-card">
                <h3>📦 Nameščeni moduli</h3>
                <div id="installedModules"></div>
            </div>
        </div>
        
        <div id="analytics" class="tab-content">
            <div class="dashboard">
                <div class="dashboard-card">
                    <h3>📈 Uporaba modulov</h3>
                    <div id="usageAnalytics"></div>
                </div>
                
                <div class="dashboard-card">
                    <h3>⭐ Ocene in mnenja</h3>
                    <div id="reviewsAnalytics"></div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Purchase Modal -->
    <div id="purchaseModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closePurchaseModal()">&times;</span>
            <h2>Nakup modula</h2>
            <div id="purchaseContent"></div>
        </div>
    </div>

    <script>
        let currentCategory = 'all';
        let modulesData = {};
        let purchasedModules = [];
        let installedModules = [];
        
        // Load initial data
        document.addEventListener('DOMContentLoaded', function() {
            loadModulesData();
            loadPurchasedModules();
            loadInstalledModules();
        });
        
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
            
            // Load tab-specific data
            if (tabName === 'purchased') loadPurchasedData();
            else if (tabName === 'installed') loadInstalledData();
            else if (tabName === 'analytics') loadAnalyticsData();
        }
        
        async function loadModulesData() {
            try {
                const response = await fetch('/api/modules');
                modulesData = await response.json();
                displayModules(modulesData);
            } catch (error) {
                console.error('Error loading modules:', error);
            }
        }
        
        function displayModules(modules) {
            const grid = document.getElementById('modulesGrid');
            grid.innerHTML = '';
            
            Object.values(modules).forEach(module => {
                if (currentCategory !== 'all' && module.category !== currentCategory) {
                    return;
                }
                
                const moduleCard = document.createElement('div');
                moduleCard.className = 'module-card';
                moduleCard.innerHTML = `
                    <div class="module-header">
                        <div>
                            <div class="module-title">${module.name}</div>
                            <div class="module-category">${module.category.replace('_', ' ')}</div>
                        </div>
                        <div class="module-rating">
                            <span class="stars">${'★'.repeat(Math.floor(module.rating))}${'☆'.repeat(5-Math.floor(module.rating))}</span>
                            <span>${module.rating}</span>
                        </div>
                    </div>
                    
                    <div class="module-description">${module.description}</div>
                    
                    <div class="module-features">
                        <h4>Funkcionalnosti:</h4>
                        <ul class="feature-list">
                            ${module.features.slice(0, 4).map(feature => `<li>${feature}</li>`).join('')}
                            ${module.features.length > 4 ? `<li>+ ${module.features.length - 4} več...</li>` : ''}
                        </ul>
                    </div>
                    
                    <div class="module-meta">
                        <div class="module-price">
                            €${module.price_monthly}/mes
                            <div style="font-size: 0.8em; color: #666;">€${module.price_yearly}/leto</div>
                        </div>
                        <div style="text-align: right; font-size: 0.9em; color: #666;">
                            <div>${module.downloads} prenosov</div>
                            <div>v${module.version}</div>
                        </div>
                    </div>
                    
                    <div class="module-actions">
                        ${module.demo_available ? `<button class="btn btn-secondary" onclick="startDemo('${module.id}')">Demo</button>` : ''}
                        <button class="btn btn-warning" onclick="startTrial('${module.id}')">Preizkus ${module.trial_days}d</button>
                        <button class="btn btn-primary" onclick="purchaseModule('${module.id}')">Kupi</button>
                    </div>
                `;
                
                grid.appendChild(moduleCard);
            });
        }
        
        function filterByCategory(category) {
            currentCategory = category;
            
            // Update active filter tag
            document.querySelectorAll('.filter-tag').forEach(tag => {
                tag.classList.remove('active');
            });
            event.target.classList.add('active');
            
            displayModules(modulesData);
        }
        
        function filterModules() {
            const searchTerm = document.getElementById('searchBox').value.toLowerCase();
            const filteredModules = {};
            
            Object.keys(modulesData).forEach(key => {
                const module = modulesData[key];
                if (module.name.toLowerCase().includes(searchTerm) || 
                    module.description.toLowerCase().includes(searchTerm) ||
                    module.features.some(feature => feature.toLowerCase().includes(searchTerm))) {
                    filteredModules[key] = module;
                }
            });
            
            displayModules(filteredModules);
        }
        
        async function purchaseModule(moduleId) {
            const module = modulesData[moduleId];
            if (!module) return;
            
            const modal = document.getElementById('purchaseModal');
            const content = document.getElementById('purchaseContent');
            
            content.innerHTML = `
                <h3>${module.name}</h3>
                <p>${module.description}</p>
                
                <div style="margin: 20px 0;">
                    <h4>Izberi paket:</h4>
                    <div style="display: flex; gap: 15px; margin-top: 10px;">
                        <label style="display: flex; align-items: center; padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer;">
                            <input type="radio" name="purchaseType" value="monthly" checked style="margin-right: 10px;">
                            <div>
                                <strong>Mesečno</strong><br>
                                <span style="color: #667eea; font-size: 1.2em;">€${module.price_monthly}/mes</span>
                            </div>
                        </label>
                        <label style="display: flex; align-items: center; padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer;">
                            <input type="radio" name="purchaseType" value="yearly" style="margin-right: 10px;">
                            <div>
                                <strong>Letno</strong> <span style="color: #28a745; font-size: 0.8em;">(2 meseca gratis)</span><br>
                                <span style="color: #667eea; font-size: 1.2em;">€${module.price_yearly}/leto</span>
                            </div>
                        </label>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <h4>Funkcionalnosti:</h4>
                    <ul class="feature-list">
                        ${module.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="closePurchaseModal()">Prekliči</button>
                    <button class="btn btn-primary" onclick="confirmPurchase('${moduleId}')">Potrdi nakup</button>
                </div>
            `;
            
            modal.style.display = 'block';
        }
        
        async function confirmPurchase(moduleId) {
            const purchaseType = document.querySelector('input[name="purchaseType"]:checked').value;
            
            try {
                const response = await fetch('/api/purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ module_id: moduleId, purchase_type: purchaseType })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Modul uspešno kupljen!');
                    closePurchaseModal();
                    loadPurchasedModules();
                } else {
                    alert('Napaka pri nakupu: ' + result.message);
                }
                
            } catch (error) {
                console.error('Purchase error:', error);
                alert('Napaka pri nakupu');
            }
        }
        
        async function startTrial(moduleId) {
            try {
                const response = await fetch('/api/start-trial', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ module_id: moduleId })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert(`Preizkusna doba za ${modulesData[moduleId].name} se je začela!`);
                    loadPurchasedModules();
                } else {
                    alert('Napaka: ' + result.message);
                }
                
            } catch (error) {
                console.error('Trial error:', error);
            }
        }
        
        async function startDemo(moduleId) {
            alert(`Demo za ${modulesData[moduleId].name} se zaganja...`);
            // Here you would typically open a demo environment
        }
        
        function closePurchaseModal() {
            document.getElementById('purchaseModal').style.display = 'none';
        }
        
        async function loadPurchasedModules() {
            try {
                const response = await fetch('/api/purchased-modules');
                purchasedModules = await response.json();
            } catch (error) {
                console.error('Error loading purchased modules:', error);
            }
        }
        
        async function loadInstalledModules() {
            try {
                const response = await fetch('/api/installed-modules');
                installedModules = await response.json();
            } catch (error) {
                console.error('Error loading installed modules:', error);
            }
        }
        
        async function loadPurchasedData() {
            await loadPurchasedModules();
            
            // Purchase metrics
            const metricsDiv = document.getElementById('purchaseMetrics');
            const activeCount = purchasedModules.filter(m => m.status === 'active').length;
            const trialCount = purchasedModules.filter(m => m.status === 'trial').length;
            
            metricsDiv.innerHTML = `
                <div class="metric">
                    <div class="metric-value">${purchasedModules.length}</div>
                    <div class="metric-label">Skupaj modulov</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${activeCount}</div>
                    <div class="metric-label">Aktivnih</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${trialCount}</div>
                    <div class="metric-label">Preizkusnih</div>
                </div>
            `;
            
            // Cost metrics
            const costDiv = document.getElementById('costMetrics');
            const totalCost = purchasedModules.reduce((sum, m) => sum + m.price_paid, 0);
            const monthlyCost = purchasedModules.filter(m => m.purchase_type === 'monthly').reduce((sum, m) => sum + m.price_paid, 0);
            
            costDiv.innerHTML = `
                <div class="metric">
                    <div class="metric-value">€${totalCost.toFixed(2)}</div>
                    <div class="metric-label">Skupaj plačano</div>
                </div>
                <div class="metric">
                    <div class="metric-value">€${monthlyCost.toFixed(2)}</div>
                    <div class="metric-label">Mesečni stroški</div>
                </div>
            `;
            
            // Purchased modules list
            const modulesDiv = document.getElementById('purchasedModules');
            modulesDiv.innerHTML = '';
            
            purchasedModules.forEach(module => {
                const div = document.createElement('div');
                div.className = 'module-item';
                div.innerHTML = `
                    <div>
                        <h4>${module.module_name}</h4>
                        <p>Verzija: ${module.version} | Tip: ${module.purchase_type}</p>
                        <p>Kupljeno: ${new Date(module.purchase_date).toLocaleDateString('sl-SI')}</p>
                        <p>Poteče: ${new Date(module.expiry_date).toLocaleDateString('sl-SI')}</p>
                    </div>
                    <div>
                        <span class="status-badge status-${module.status}">${module.status.toUpperCase()}</span>
                        <div style="margin-top: 10px;">
                            ${module.installation_status === 'installed' ? 
                                `<button class="btn btn-danger" onclick="uninstallModule('${module.module_id}')">Odstrani</button>` :
                                `<button class="btn btn-success" onclick="installModule('${module.module_id}')">Namesti</button>`
                            }
                        </div>
                    </div>
                `;
                modulesDiv.appendChild(div);
            });
        }
        
        async function loadInstalledData() {
            await loadInstalledModules();
            
            // Installation status
            const statusDiv = document.getElementById('installationStatus');
            const healthyCount = installedModules.filter(m => m.health_status === 'healthy').length;
            const warningCount = installedModules.filter(m => m.health_status === 'warning').length;
            
            statusDiv.innerHTML = `
                <div class="metric">
                    <div class="metric-value">${installedModules.length}</div>
                    <div class="metric-label">Nameščenih</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${healthyCount}</div>
                    <div class="metric-label">Zdravih</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${warningCount}</div>
                    <div class="metric-label">Opozoril</div>
                </div>
            `;
            
            // Module health
            const healthDiv = document.getElementById('moduleHealth');
            healthDiv.innerHTML = '';
            
            installedModules.forEach(module => {
                const div = document.createElement('div');
                div.className = 'module-item';
                div.innerHTML = `
                    <div>
                        <h4>${module.module_id}</h4>
                        <p>Pot: ${module.installation_path}</p>
                        <p>Zadnja preveritev: ${new Date(module.last_health_check).toLocaleString('sl-SI')}</p>
                    </div>
                    <div>
                        <span class="status-badge status-${module.health_status === 'healthy' ? 'active' : 'warning'}">
                            ${module.health_status.toUpperCase()}
                        </span>
                    </div>
                `;
                healthDiv.appendChild(div);
            });
        }
        
        async function loadAnalyticsData() {
            // Simulate analytics data
            const usageDiv = document.getElementById('usageAnalytics');
            usageDiv.innerHTML = `
                <div class="metric">
                    <div class="metric-value">1,247</div>
                    <div class="metric-label">Skupaj uporab</div>
                </div>
                <div class="metric">
                    <div class="metric-value">89%</div>
                    <div class="metric-label">Zadovoljstvo</div>
                </div>
            `;
            
            const reviewsDiv = document.getElementById('reviewsAnalytics');
            reviewsDiv.innerHTML = `
                <div class="metric">
                    <div class="metric-value">4.7</div>
                    <div class="metric-label">Povprečna ocena</div>
                </div>
                <div class="metric">
                    <div class="metric-value">23</div>
                    <div class="metric-label">Mnenj</div>
                </div>
            `;
        }
        
        async function installModule(moduleId) {
            try {
                const response = await fetch('/api/install-module', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ module_id: moduleId })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Modul uspešno nameščen!');
                    loadPurchasedData();
                    loadInstalledData();
                } else {
                    alert('Napaka pri namestitvi: ' + result.message);
                }
                
            } catch (error) {
                console.error('Installation error:', error);
            }
        }
        
        async function uninstallModule(moduleId) {
            if (!confirm('Ali ste prepričani, da želite odstraniti ta modul?')) return;
            
            try {
                const response = await fetch('/api/uninstall-module', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ module_id: moduleId })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Modul uspešno odstranjen!');
                    loadPurchasedData();
                    loadInstalledData();
                } else {
                    alert('Napaka pri odstranitvi: ' + result.message);
                }
                
            } catch (error) {
                console.error('Uninstallation error:', error);
            }
        }
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('purchaseModal');
            if (event.target === modal) {
                closePurchaseModal();
            }
        }
    </script>
</body>
</html>
            ''')
        
        @self.app.route('/api/modules')
        def get_modules():
            return jsonify(self.modules_catalog)
        
        @self.app.route('/api/purchased-modules')
        def get_purchased_modules():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT module_id, module_name, version, purchase_type, price_paid, 
                       purchase_date, expiry_date, status, installation_status
                FROM purchased_modules
                ORDER BY purchase_date DESC
            ''')
            
            modules = cursor.fetchall()
            conn.close()
            
            modules_list = []
            for module in modules:
                modules_list.append({
                    "module_id": module[0],
                    "module_name": module[1],
                    "version": module[2],
                    "purchase_type": module[3],
                    "price_paid": module[4],
                    "purchase_date": module[5],
                    "expiry_date": module[6],
                    "status": module[7],
                    "installation_status": module[8]
                })
            
            return jsonify(modules_list)
        
        @self.app.route('/api/installed-modules')
        def get_installed_modules():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT module_id, installation_path, status, installed_at, 
                       last_health_check, health_status
                FROM module_installations
                WHERE status = 'installed'
                ORDER BY installed_at DESC
            ''')
            
            modules = cursor.fetchall()
            conn.close()
            
            modules_list = []
            for module in modules:
                modules_list.append({
                    "module_id": module[0],
                    "installation_path": module[1],
                    "status": module[2],
                    "installed_at": module[3],
                    "last_health_check": module[4],
                    "health_status": module[5]
                })
            
            return jsonify(modules_list)
        
        @self.app.route('/api/purchase', methods=['POST'])
        def purchase_module():
            data = request.get_json()
            module_id = data.get('module_id')
            purchase_type = data.get('purchase_type', 'monthly')
            user_id = 1  # Demo user
            
            if module_id not in self.modules_catalog:
                return jsonify({"success": False, "message": "Module not found"})
            
            module = self.modules_catalog[module_id]
            price = module['price_monthly'] if purchase_type == 'monthly' else module['price_yearly']
            
            # Calculate expiry date
            if purchase_type == 'monthly':
                expiry_date = datetime.now() + timedelta(days=30)
            else:
                expiry_date = datetime.now() + timedelta(days=365)
            
            # Generate license key
            license_key = f"OMNI-{module_id.upper()}-{secrets.token_hex(8).upper()}"
            
            # Save purchase
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO purchased_modules 
                (user_id, module_id, module_name, version, purchase_type, price_paid, expiry_date, status, license_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, module_id, module['name'], module['version'], purchase_type, price, 
                  expiry_date.isoformat(), 'active', license_key))
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Module {module_id} purchased by user {user_id} - {purchase_type} - €{price}")
            
            return jsonify({
                "success": True, 
                "message": "Module purchased successfully",
                "license_key": license_key,
                "expiry_date": expiry_date.isoformat()
            })
        
        @self.app.route('/api/start-trial', methods=['POST'])
        def start_trial():
            data = request.get_json()
            module_id = data.get('module_id')
            user_id = 1  # Demo user
            
            if module_id not in self.modules_catalog:
                return jsonify({"success": False, "message": "Module not found"})
            
            module = self.modules_catalog[module_id]
            expiry_date = datetime.now() + timedelta(days=module['trial_days'])
            license_key = f"TRIAL-{module_id.upper()}-{secrets.token_hex(6).upper()}"
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if trial already exists
            cursor.execute('''
                SELECT id FROM purchased_modules 
                WHERE module_id = ? AND user_id = ? AND status = 'trial'
            ''', (module_id, user_id))
            
            if cursor.fetchone():
                conn.close()
                return jsonify({"success": False, "message": "Trial already active for this module"})
            
            cursor.execute('''
                INSERT INTO purchased_modules 
                (user_id, module_id, module_name, version, purchase_type, price_paid, expiry_date, status, license_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, module_id, module['name'], module['version'], 'trial', 0.00, 
                  expiry_date.isoformat(), 'trial', license_key))
            
            conn.commit()
            conn.close()
            
            return jsonify({
                "success": True, 
                "message": f"Trial started for {module['trial_days']} days",
                "license_key": license_key,
                "expiry_date": expiry_date.isoformat()
            })
        
        @self.app.route('/api/install-module', methods=['POST'])
        def install_module_api():
            data = request.get_json()
            module_id = data.get('module_id')
            user_id = 1  # Demo user
            
            result = self.install_module(module_id, user_id)
            return jsonify(result)
        
        @self.app.route('/api/uninstall-module', methods=['POST'])
        def uninstall_module_api():
            data = request.get_json()
            module_id = data.get('module_id')
            user_id = 1  # Demo user
            
            result = self.uninstall_module(module_id, user_id)
            return jsonify(result)
    
    def run_server(self, host='0.0.0.0', port=5019, debug=True):
        """Run the marketplace modules server"""
        print(f"🚀 Starting OMNI Marketplace Modules on http://{host}:{port}")
        print("🛒 Marketplace features:")
        print("   • AI Optimizacija - dinamično prilagajanje cen")
        print("   • AR Katalog - interaktivni virtualni ogledi")
        print("   • ERP Konektor - integracija z enterprise sistemi")
        print("   • POS Integracija - povezava z blagajnami")
        print("   • Napredna Analitika - prediktivni modeli")
        print("   • Mobile App Builder - ustvarjalnik aplikacij")
        print("\n📊 Demo podatki:")
        print("   • 3 kupljeni moduli (AI, AR trial, POS)")
        print("   • 2 nameščena modula")
        print("   • Marketplace monitoring aktiven")
        print("\n💡 Funkcionalnosti:")
        print("   • Prebrskaj in filtriraj module")
        print("   • Preizkusne dobe in demo verzije")
        print("   • Avtomatska namestitev in posodobitve")
        print("   • Analitika uporabe in ocene")
        
        self.app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    marketplace = OmniMarketplaceModules()
    marketplace.run_server()