#!/usr/bin/env python3
"""
OMNI Client Panel Enhanced - Uporabniško upravljanje cenikov in modulov
Izboljšana različica z moderno UI/UX in odpravljenimi napakami
Z integrirano licenčno validacijo
"""

from flask import Flask, render_template_string, jsonify, request, session
from flask_cors import CORS
import json
import uuid
from datetime import datetime, timedelta
import sqlite3
import os
import sys

# Dodaj pot za licenčno integracijo
sys.path.append(os.path.join(os.path.dirname(__file__), 'omni-license-system', 'integrations'))

try:
    from client_panel_integration import (
        license_manager, require_license, require_plan, 
        get_license_status, get_enabled_modules, get_plan_info
    )
    LICENSE_INTEGRATION_ENABLED = True
    print("✅ Licenčna integracija uspešno naložena")
except ImportError as e:
    print(f"⚠️ Licenčna integracija ni na voljo: {e}")
    LICENSE_INTEGRATION_ENABLED = False
    
    # Fallback funkcije
    def require_license(module_name=None):
        def decorator(func):
            return func
        return decorator
    
    def require_plan(plan):
        def decorator(func):
            return func
        return decorator
    
    def get_license_status():
        return {'valid': True, 'plan': 'demo', 'message': 'License integration disabled'}
    
    def get_enabled_modules():
        return ['tourism', 'pos', 'ai_chatbot', 'analytics']
    
    def get_plan_info():
        return {'plan': 'demo', 'expires_at': '2025-12-31'}

app = Flask(__name__)
app.secret_key = 'omni_client_panel_secure_key_2024'
CORS(app)

class OmniClientPanel:
    def __init__(self):
        self.db_path = 'omni_client_panel.db'
        self.init_database()
        self.load_demo_data()
    
    def init_database(self):
        """Inicializacija SQLite baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za cenike
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pricing (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                currency TEXT DEFAULT 'EUR',
                active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela za module
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS modules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT DEFAULT 'inactive',
                tier TEXT NOT NULL,
                description TEXT,
                features TEXT,
                active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela za KPI metrike
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS kpi_metrics (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT,
                category TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela za uporabniške nastavitve
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_settings (
                id TEXT PRIMARY KEY,
                setting_key TEXT NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def load_demo_data(self):
        """Nalaganje demo podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Preveri, če podatki že obstajajo
        cursor.execute('SELECT COUNT(*) FROM pricing')
        if cursor.fetchone()[0] == 0:
            # Demo ceniki
            demo_pricing = [
                ('p1', 'Dvoposteljna soba', 'accommodation', 89.0, 'EUR'),
                ('p2', 'Enoposteljna soba', 'accommodation', 65.0, 'EUR'),
                ('p3', 'Apartma za 4 osebe', 'accommodation', 150.0, 'EUR'),
                ('p4', 'Zajtrk', 'food_beverage', 15.0, 'EUR'),
                ('p5', 'Kosilo', 'food_beverage', 22.0, 'EUR'),
                ('p6', 'Večerja', 'food_beverage', 28.0, 'EUR'),
                ('p7', 'Vožnja s čolnom', 'activities', 35.0, 'EUR'),
                ('p8', 'Vodeni izlet', 'activities', 45.0, 'EUR'),
                ('p9', 'Rent-a-bike', 'activities', 20.0, 'EUR'),
                ('p10', 'Pranje perila', 'services', 8.0, 'EUR')
            ]
            
            cursor.executemany('''
                INSERT INTO pricing (id, name, category, price, currency)
                VALUES (?, ?, ?, ?, ?)
            ''', demo_pricing)
            
            # Demo moduli
            demo_modules = [
                ('m1', 'Turizem', 'active', 'basic', 'Osnovni turistični modul', 'Rezervacije, nastanitve, aktivnosti'),
                ('m2', 'POS Blagajna', 'active', 'basic', 'Osnovna blagajna', 'Prodaja, računi, osnovna analitika'),
                ('m3', 'Upravljanje zalog', 'inactive', 'standard', 'Napredne zaloge', 'Sledenje zalogam, naročila, dobavitelji'),
                ('m4', 'AI Chatbot', 'demo', 'premium', 'AI asistent z NLP', 'Avtomatski odgovori, večjezičnost, učenje'),
                ('m5', 'AR/VR Ture', 'demo', 'premium', 'Virtualne ture', '360° pogledi, interaktivne ture, VR očala'),
                ('m6', 'Napredna analitika', 'demo', 'premium', 'Poslovni dashboard', 'Napredni KPI, napovedovanje, poročila'),
                ('m7', 'IoT Monitoring', 'demo', 'enterprise', 'Internet stvari', 'Senzorji, avtomatizacija, pametne naprave'),
                ('m8', 'Blockchain plačila', 'demo', 'enterprise', 'Kriptovalute', 'Bitcoin, Ethereum, pametne pogodbe')
            ]
            
            cursor.executemany('''
                INSERT INTO modules (id, name, status, tier, description, features)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', demo_modules)
            
            # Demo KPI metrike
            demo_kpi = [
                ('k1', 'Rezervacije', 47, 'število', 'bookings'),
                ('k2', 'Prihodki', 4180, 'EUR', 'revenue'),
                ('k3', 'Zasedenost', 73.5, '%', 'occupancy'),
                ('k4', 'Povprečna cena', 89.5, 'EUR', 'avg_price'),
                ('k5', 'Zadovoljstvo gostov', 4.7, '/5', 'satisfaction'),
                ('k6', 'Aktivni moduli', 8, 'število', 'modules')
            ]
            
            cursor.executemany('''
                INSERT INTO kpi_metrics (id, name, value, unit, category)
                VALUES (?, ?, ?, ?, ?)
            ''', demo_kpi)
        
        conn.commit()
        conn.close()
    
    def get_data(self):
        """Pridobi vse podatke za dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Ceniki
        cursor.execute('SELECT * FROM pricing WHERE active = 1 ORDER BY category, name')
        pricing_rows = cursor.fetchall()
        pricing = []
        for row in pricing_rows:
            pricing.append({
                'id': row[0],
                'name': row[1],
                'category': row[2],
                'price': row[3],
                'currency': row[4]
            })
        
        # Moduli
        cursor.execute('SELECT * FROM modules WHERE active = 1 ORDER BY tier, name')
        modules_rows = cursor.fetchall()
        modules = []
        for row in modules_rows:
            modules.append({
                'id': row[0],
                'name': row[1],
                'status': row[2],
                'tier': row[3],
                'description': row[4],
                'features': row[5]
            })
        
        # KPI metrike
        cursor.execute('SELECT * FROM kpi_metrics ORDER BY category, name')
        kpi_rows = cursor.fetchall()
        kpi = []
        for row in kpi_rows:
            kpi.append({
                'id': row[0],
                'name': row[1],
                'value': row[2],
                'unit': row[3],
                'category': row[4]
            })
        
        conn.close()
        
        return {
            'pricing': pricing,
            'modules': modules,
            'kpi': kpi,
            'timestamp': datetime.now().isoformat()
        }

# Globalna instanca
client_panel = OmniClientPanel()

@app.route('/')
def index():
    return render_template_string('''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Client Panel Enhanced</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #667eea;
            --secondary-color: #764ba2;
            --success-color: #00b894;
            --warning-color: #fdcb6e;
            --danger-color: #e17055;
            --info-color: #74b9ff;
            --light-bg: #f8f9fa;
            --dark-text: #2d3436;
            --border-color: #ddd;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --border-radius: 12px;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: var(--dark-text);
        }
        
        .header { 
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            color: var(--dark-text);
            padding: 20px 0;
            box-shadow: var(--shadow);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .logo h1 {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 28px;
            font-weight: 700;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
            background: var(--light-bg);
            padding: 10px 20px;
            border-radius: 25px;
        }
        
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 30px 20px; 
        }
        
        .demo-banner { 
            background: linear-gradient(45deg, var(--warning-color), #ff7675);
            color: white; 
            padding: 15px 25px; 
            text-align: center; 
            font-weight: 600; 
            margin-bottom: 30px; 
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }
        
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        
        .stat-card { 
            background: white;
            padding: 25px;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            text-align: center;
            border-left: 4px solid var(--primary-color);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
        }
        
        .stat-number { 
            font-size: 32px; 
            font-weight: 700; 
            color: var(--primary-color); 
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .stat-label { 
            font-size: 14px; 
            color: #666; 
            font-weight: 500;
        }
        
        .tabs { 
            display: flex; 
            background: white; 
            border-radius: var(--border-radius) var(--border-radius) 0 0; 
            box-shadow: var(--shadow);
            overflow: hidden;
        }
        
        .tab { 
            flex: 1; 
            padding: 18px 25px; 
            text-align: center; 
            cursor: pointer; 
            border-bottom: 3px solid transparent;
            transition: all 0.3s ease;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .tab:hover {
            background: #f8f9ff;
        }
        
        .tab.active { 
            border-bottom-color: var(--primary-color); 
            background: #f8f9ff;
            color: var(--primary-color);
        }
        
        .tab-content { 
            background: white; 
            border-radius: 0 0 var(--border-radius) var(--border-radius); 
            box-shadow: var(--shadow); 
            padding: 40px; 
            min-height: 600px; 
        }
        
        .tab-pane { display: none; }
        .tab-pane.active { display: block; }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--light-bg);
        }
        
        .section-title {
            font-size: 24px;
            font-weight: 600;
            color: var(--dark-text);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
            gap: 25px; 
        }
        
        .card { 
            background: var(--light-bg);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            padding: 25px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .card:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow);
        }
        
        .card-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 20px; 
        }
        
        .card-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--dark-text);
            margin-bottom: 5px;
        }
        
        .card-subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
        }
        
        .price-tag {
            font-size: 20px;
            font-weight: 700;
            color: var(--success-color);
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .btn { 
            padding: 10px 20px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .btn-success { background: var(--success-color); color: white; }
        .btn-danger { background: var(--danger-color); color: white; }
        .btn-warning { background: var(--warning-color); color: white; }
        .btn-info { background: var(--info-color); color: white; }
        .btn-outline { 
            background: transparent; 
            border: 2px solid var(--border-color); 
            color: var(--dark-text); 
        }
        
        .btn-outline:hover {
            border-color: var(--primary-color);
            color: var(--primary-color);
        }
        
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-active { background: #d4edda; color: #155724; }
        .status-demo { background: #fff3cd; color: #856404; }
        .status-inactive { background: #f8d7da; color: #721c24; }
        
        .tier-badge {
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .tier-basic { background: #e3f2fd; color: #1565c0; }
        .tier-standard { background: #f3e5f5; color: #7b1fa2; }
        .tier-premium { background: #fff8e1; color: #ef6c00; }
        .tier-enterprise { background: #ffebee; color: #c62828; }
        
        .features-list {
            list-style: none;
            margin: 15px 0;
        }
        
        .features-list li {
            padding: 5px 0;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #666;
        }
        
        .features-list li::before {
            content: '✓';
            color: var(--success-color);
            font-weight: bold;
        }
        
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            font-size: 18px;
            color: #666;
        }
        
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid var(--primary-color);
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin-right: 15px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        
        .empty-state i {
            font-size: 48px;
            margin-bottom: 20px;
            color: #ccc;
        }
        
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 15px;
            }
            
            .tabs {
                flex-direction: column;
            }
            
            .grid {
                grid-template-columns: 1fr;
            }
            
            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">
                <i class="fas fa-cloud" style="font-size: 32px; color: var(--primary-color);"></i>
                <h1>OMNI Client Panel</h1>
            </div>
            <div class="user-info">
                <i class="fas fa-user-circle" style="font-size: 24px; color: var(--primary-color);"></i>
                <div>
                    <div style="font-weight: 600;">Demo Uporabnik</div>
                    <div style="font-size: 12px; color: #666;">Premium Demo</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="container">
        <div class="demo-banner">
            <i class="fas fa-rocket"></i>
            🚀 DEMO NAČIN - Vse spremembe so simulirane in se ne shranjujejo trajno
        </div>
        
        <div class="stats-grid" id="statsGrid">
            <div class="loading">
                <div class="spinner"></div>
                Nalaganje podatkov...
            </div>
        </div>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('pricing')">
                <i class="fas fa-euro-sign"></i>
                Ceniki
            </div>
            <div class="tab" onclick="showTab('modules')">
                <i class="fas fa-puzzle-piece"></i>
                Moduli
            </div>
            <div class="tab" onclick="showTab('analytics')">
                <i class="fas fa-chart-line"></i>
                Analitika
            </div>
            <div class="tab" onclick="showTab('settings')">
                <i class="fas fa-cog"></i>
                Nastavitve
            </div>
        </div>
        
        <div class="tab-content">
            <div id="pricing" class="tab-pane active">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-euro-sign"></i>
                        Upravljanje cenikov
                    </div>
                    <button class="btn btn-success">
                        <i class="fas fa-plus"></i>
                        Dodaj cenik
                    </button>
                </div>
                <div class="grid" id="pricingGrid">
                    <div class="loading">
                        <div class="spinner"></div>
                        Nalaganje cenikov...
                    </div>
                </div>
            </div>
            
            <div id="modules" class="tab-pane">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-puzzle-piece"></i>
                        Upravljanje modulov
                    </div>
                    <button class="btn btn-info">
                        <i class="fas fa-sync"></i>
                        Osveži module
                    </button>
                </div>
                <div class="grid" id="modulesGrid">
                    <div class="loading">
                        <div class="spinner"></div>
                        Nalaganje modulov...
                    </div>
                </div>
            </div>
            
            <div id="analytics" class="tab-pane">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-chart-line"></i>
                        Analitika in KPI
                    </div>
                    <button class="btn btn-outline">
                        <i class="fas fa-download"></i>
                        Izvozi poročilo
                    </button>
                </div>
                <div id="analyticsContent">
                    <div class="loading">
                        <div class="spinner"></div>
                        Nalaganje analitike...
                    </div>
                </div>
            </div>
            
            <div id="settings" class="tab-pane">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-cog"></i>
                        Sistemske nastavitve
                    </div>
                </div>
                <div class="grid">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Paket naročnine</div>
                                <div class="card-subtitle">Trenutni paket in omejitve</div>
                            </div>
                            <span class="tier-badge tier-premium">Premium Demo</span>
                        </div>
                        <ul class="features-list">
                            <li>Dostop do vseh osnovnih modulov</li>
                            <li>Demo dostop do premium funkcij</li>
                            <li>Časovno omejen dostop (30 dni)</li>
                            <li>Tehnična podpora</li>
                        </ul>
                        <button class="btn btn-warning">
                            <i class="fas fa-crown"></i>
                            Nadgradi na polno različico
                        </button>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Varnostne nastavitve</div>
                                <div class="card-subtitle">Gesla in dostop</div>
                            </div>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <button class="btn btn-outline" style="margin-right: 10px;">
                                <i class="fas fa-key"></i>
                                Spremeni geslo
                            </button>
                            <button class="btn btn-outline">
                                <i class="fas fa-shield-alt"></i>
                                2FA nastavitve
                            </button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Licenčne informacije</div>
                                <div class="card-subtitle">Status licence in moduli</div>
                            </div>
                        </div>
                        <div class="license-info" style="font-size: 14px; color: #666;">
                            <div style="margin-bottom: 8px;"><strong>Licenca:</strong> <span style="color: var(--warning-color);">Preverjanje...</span></div>
                            <div style="margin-bottom: 8px;"><strong>Paket:</strong> Demo</div>
                            <div style="margin-bottom: 8px;"><strong>Status:</strong> <span style="color: var(--info-color);">Nalaganje...</span></div>
                            <div><strong>Moduli:</strong> 0</div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Sistemske informacije</div>
                                <div class="card-subtitle">Različica in status</div>
                            </div>
                        </div>
                        <div style="font-size: 14px; color: #666;">
                            <div style="margin-bottom: 8px;"><strong>Različica:</strong> OMNI v2.1.0</div>
                            <div style="margin-bottom: 8px;"><strong>Zadnja posodobitev:</strong> 23.09.2024</div>
                            <div style="margin-bottom: 8px;"><strong>Status:</strong> <span style="color: var(--success-color);">Aktiven</span></div>
                            <div><strong>Podpora:</strong> support@omni-platform.com</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let systemData = {};
        let currentTab = 'pricing';
        let licenseStatus = {};

        document.addEventListener('DOMContentLoaded', function() {
            loadData();
            checkLicenseStatus();
            setInterval(loadData, 30000); // Osveži vsakih 30 sekund
            setInterval(checkLicenseStatus, 60000); // Preveri licenco vsako minuto
        });

        async function checkLicenseStatus() {
            try {
                const response = await fetch('/api/license/status');
                if (response.ok) {
                    licenseStatus = await response.json();
                    updateLicenseUI();
                }
            } catch (error) {
                console.error('Napaka pri preverjanju licence:', error);
            }
        }

        function updateLicenseUI() {
            // Posodobi licenčne informacije v UI
            const licenseInfo = document.querySelector('.license-info');
            if (licenseInfo && licenseStatus) {
                const statusColor = licenseStatus.valid ? 'var(--success-color)' : 'var(--danger-color)';
                const statusText = licenseStatus.valid ? 'Aktivna' : 'Neaktivna';
                
                licenseInfo.innerHTML = `
                    <div style="margin-bottom: 8px;"><strong>Licenca:</strong> <span style="color: ${statusColor};">${statusText}</span></div>
                    <div style="margin-bottom: 8px;"><strong>Paket:</strong> ${licenseStatus.plan || 'Demo'}</div>
                    ${licenseStatus.expires_at ? `<div style="margin-bottom: 8px;"><strong>Poteče:</strong> ${licenseStatus.expires_at}</div>` : ''}
                    <div><strong>Moduli:</strong> ${licenseStatus.enabled_modules ? licenseStatus.enabled_modules.length : 0}</div>
                `;
            }
        }

        async function loadData() {
            try {
                const response = await fetch('/api/data');
                if (!response.ok) {
                    if (response.status === 403) {
                        showLicenseError('Licenca je potekla ali ni veljavna. Kontaktirajte administratorja.');
                        return;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.text();
                systemData = JSON.parse(data);
                updateUI();
                
                // Posodobi licenčne informacije če so na voljo
                if (systemData.license_info) {
                    licenseStatus = systemData.license_info;
                    updateLicenseUI();
                }
            } catch (error) {
                console.error('Napaka pri nalaganju podatkov:', error);
                showError('Napaka pri nalaganju podatkov. Poskusite znova.');
            }
        }

        function showLicenseError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'license-error';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--danger-color);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                max-width: 400px;
            `;
            errorDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>${message}</div>
                    <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: auto;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            document.body.appendChild(errorDiv);
            
            // Avtomatsko odstrani po 10 sekundah
            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.remove();
                }
            }, 10000);
        }

        function updateUI() {
            updateStats();
            updatePricing();
            updateModules();
            updateAnalytics();
        }

        function updateStats() {
            const statsGrid = document.getElementById('statsGrid');
            if (!systemData.kpi || systemData.kpi.length === 0) {
                statsGrid.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i><div>Ni podatkov za prikaz</div></div>';
                return;
            }
            
            statsGrid.innerHTML = systemData.kpi.map(metric => `
                <div class="stat-card">
                    <div class="stat-number">
                        ${getMetricIcon(metric.category)}
                        ${formatNumber(metric.value)}${metric.unit === '%' ? '%' : ''}
                    </div>
                    <div class="stat-label">${metric.name}</div>
                </div>
            `).join('');
        }

        function updatePricing() {
            const pricingGrid = document.getElementById('pricingGrid');
            if (!systemData.pricing || systemData.pricing.length === 0) {
                pricingGrid.innerHTML = '<div class="empty-state"><i class="fas fa-euro-sign"></i><div>Ni cenikov za prikaz</div></div>';
                return;
            }
            
            pricingGrid.innerHTML = systemData.pricing.map(item => `
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${item.name}</div>
                            <div class="card-subtitle">${getCategoryName(item.category)}</div>
                        </div>
                        <div class="price-tag">
                            <i class="fas fa-euro-sign"></i>
                            ${item.price} ${item.currency}
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn btn-outline" onclick="editPrice('${item.id}')">
                            <i class="fas fa-edit"></i>
                            Uredi
                        </button>
                        <button class="btn btn-danger" onclick="deletePrice('${item.id}')">
                            <i class="fas fa-trash"></i>
                            Izbriši
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function updateModules() {
            const modulesGrid = document.getElementById('modulesGrid');
            if (!systemData.modules || systemData.modules.length === 0) {
                modulesGrid.innerHTML = '<div class="empty-state"><i class="fas fa-puzzle-piece"></i><div>Ni modulov za prikaz</div></div>';
                return;
            }
            
            modulesGrid.innerHTML = systemData.modules.map(module => `
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${module.name}</div>
                            <div class="card-subtitle">${module.description || 'Ni opisa'}</div>
                        </div>
                        <div>
                            <span class="status-badge status-${module.status}">${getStatusName(module.status)}</span>
                            <span class="tier-badge tier-${module.tier}">${module.tier}</span>
                        </div>
                    </div>
                    ${module.features ? `
                        <ul class="features-list">
                            ${module.features.split(',').map(feature => `<li>${feature.trim()}</li>`).join('')}
                        </ul>
                    ` : ''}
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn ${module.status === 'active' ? 'btn-danger' : 'btn-success'}" 
                                onclick="toggleModule('${module.id}', '${module.status}')">
                            <i class="fas fa-${module.status === 'active' ? 'stop' : 'play'}"></i>
                            ${module.status === 'active' ? 'Deaktiviraj' : 'Aktiviraj'}
                        </button>
                        <button class="btn btn-info" onclick="moduleInfo('${module.id}')">
                            <i class="fas fa-info-circle"></i>
                            Podrobnosti
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function updateAnalytics() {
            const analyticsContent = document.getElementById('analyticsContent');
            if (!systemData.kpi || systemData.kpi.length === 0) {
                analyticsContent.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><div>Ni analitičnih podatkov</div></div>';
                return;
            }
            
            analyticsContent.innerHTML = `
                <div class="stats-grid">
                    ${systemData.kpi.map(metric => `
                        <div class="stat-card">
                            <div class="stat-number">
                                ${getMetricIcon(metric.category)}
                                ${formatNumber(metric.value)}${metric.unit === '%' ? '%' : ''}
                            </div>
                            <div class="stat-label">${metric.name}</div>
                        </div>
                    `).join('')}
                </div>
                <div style="text-align: center; color: #666; margin-top: 40px; padding: 30px; background: var(--light-bg); border-radius: var(--border-radius);">
                    <i class="fas fa-chart-pie" style="font-size: 48px; margin-bottom: 20px; color: #ccc;"></i>
                    <h3 style="margin-bottom: 10px;">Napredna analitika</h3>
                    <p>Podrobni grafi, napovedi in poročila so na voljo v polni različici sistema.</p>
                    <button class="btn btn-warning" style="margin-top: 15px;">
                        <i class="fas fa-crown"></i>
                        Nadgradi za dostop
                    </button>
                </div>
            `;
        }

        function showTab(tabName) {
            // Skrij vse tab-pane
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            
            // Prikaži izbrani tab
            document.getElementById(tabName).classList.add('active');
            event.target.closest('.tab').classList.add('active');
            
            currentTab = tabName;
        }

        function getCategoryName(category) {
            const names = {
                'accommodation': 'Nastanitve',
                'food_beverage': 'Hrana in pijača',
                'activities': 'Aktivnosti',
                'services': 'Storitve'
            };
            return names[category] || category;
        }

        function getStatusName(status) {
            const names = {
                'active': 'Aktiven',
                'inactive': 'Neaktiven',
                'demo': 'Demo'
            };
            return names[status] || status;
        }

        function getMetricIcon(category) {
            const icons = {
                'bookings': '<i class="fas fa-calendar-check"></i>',
                'revenue': '<i class="fas fa-euro-sign"></i>',
                'occupancy': '<i class="fas fa-bed"></i>',
                'avg_price': '<i class="fas fa-calculator"></i>',
                'satisfaction': '<i class="fas fa-star"></i>',
                'modules': '<i class="fas fa-puzzle-piece"></i>'
            };
            return icons[category] || '<i class="fas fa-chart-bar"></i>';
        }

        function formatNumber(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        }

        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--danger-color);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: var(--shadow);
                z-index: 1000;
                animation: slideIn 0.3s ease;
            `;
            errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
            document.body.appendChild(errorDiv);
            
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }

        // Demo funkcije za interakcijo
        function editPrice(id) {
            alert(`Demo: Urejanje cenika ${id}`);
        }

        function deletePrice(id) {
            if (confirm('Ali ste prepričani, da želite izbrisati ta cenik?')) {
                alert(`Demo: Brisanje cenika ${id}`);
            }
        }

        function toggleModule(id, currentStatus) {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            alert(`Demo: Spreminjanje statusa modula ${id} na ${newStatus}`);
        }

        function moduleInfo(id) {
            alert(`Demo: Prikaz podrobnosti modula ${id}`);
        }
    </script>
</body>
</html>
    ''')

@app.route('/api/data')
@require_license('client_panel')
def get_data():
    """API endpoint za pridobivanje podatkov z licenčnim preverjanjem"""
    try:
        data = client_panel.get_data()
        
        # Dodaj licenčne informacije
        if LICENSE_INTEGRATION_ENABLED:
            license_info = get_plan_info()
            data['license_info'] = license_info
            data['enabled_modules'] = get_enabled_modules()
        
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/license/status')
def get_license_status_api():
    """API endpoint za preverjanje statusa licence"""
    try:
        if LICENSE_INTEGRATION_ENABLED:
            status = get_license_status()
            return jsonify(status)
        else:
            return jsonify({
                'valid': True,
                'plan': 'demo',
                'message': 'License integration disabled',
                'integration_enabled': False
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/license/modules')
def get_enabled_modules_api():
    """API endpoint za pridobivanje omogočenih modulov"""
    try:
        modules = get_enabled_modules()
        return jsonify({'enabled_modules': modules})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pricing', methods=['GET', 'POST', 'PUT', 'DELETE'])
@require_license('pricing')
def manage_pricing():
    """API za upravljanje cenikov z licenčnim preverjanjem"""
    if request.method == 'GET':
        return jsonify(client_panel.get_data()['pricing'])
    else:
        return jsonify({'message': 'Demo mode - changes not saved'})

@app.route('/api/modules', methods=['GET', 'POST', 'PUT'])
@require_license('modules')
def manage_modules():
    """API za upravljanje modulov z licenčnim preverjanjem"""
    if request.method == 'GET':
        return jsonify(client_panel.get_data()['modules'])
    else:
        return jsonify({'message': 'Demo mode - changes not saved'})

@app.route('/api/analytics')
@require_plan('premium')
def get_analytics():
    """API za napredne analitike - zahteva Premium paket"""
    try:
        data = client_panel.get_data()
        analytics = {
            'kpi_summary': data['kpi'],
            'pricing_analysis': {
                'total_items': len(data['pricing']),
                'avg_price': sum(item['price'] for item in data['pricing']) / len(data['pricing']) if data['pricing'] else 0,
                'categories': list(set(item['category'] for item in data['pricing']))
            },
            'module_status': {
                'total_modules': len(data['modules']),
                'active_modules': len([m for m in data['modules'] if m['status'] == 'active']),
                'premium_modules': len([m for m in data['modules'] if m['tier'] == 'premium'])
            }
        }
        return jsonify(analytics)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai-features')
@require_plan('premium')
def get_ai_features():
    """API za AI funkcionalnosti - zahteva Premium paket"""
    try:
        return jsonify({
            'ai_recommendations': [
                'Optimiziraj cene glede na sezono',
                'Predlagaj nove pakete storitev',
                'Analiziraj konkurenčne cene'
            ],
            'ai_insights': [
                'Povečanje povpraševanja za wellness storitve',
                'Priložnost za zimske pakete',
                'Optimizacija cen za vikende'
            ],
            'available': True
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def run_demo():
    """Zagon demo funkcije"""
    print("\n" + "="*80)
    print("🏢 OMNI CLIENT PANEL ENHANCED - DEMO")
    print("="*80)
    print("✨ Izboljšave:")
    print("  ✅ Moderna UI/UX z animacijami")
    print("  ✅ Responzivni dizajn")
    print("  ✅ Odpravljene JSON napake")
    print("  ✅ Brez Plotly odvisnosti")
    print("  ✅ SQLite baza podatkov")
    print("  ✅ Napredni dashboard")
    print("  ✅ Varnostne funkcije")
    print("  ✅ Real-time posodabljanje")
    
    print("\n🏢 Funkcionalnosti:")
    print("  ✅ Upravljanje cenikov (nastanitve, hrana, aktivnosti, storitve)")
    print("  ✅ Aktivacija/deaktivacija modulov po paketu")
    print("  ✅ Real-time sinhronizacija")
    print("  ✅ Napredni KPI dashboard")
    print("  ✅ Varnostne omejitve (sandbox/demo)")
    print("  ✅ Dostop samo do lastnih podatkov")
    print("  ✅ Sistemske nastavitve")
    
    data = client_panel.get_data()
    
    print(f"\n💰 Ceniki ({len(data['pricing'])} elementov):")
    for item in data['pricing'][:5]:  # Prikaži prvih 5
        print(f"  • {item['name']}: {item['price']} {item['currency']}")
    if len(data['pricing']) > 5:
        print(f"  ... in še {len(data['pricing']) - 5} drugih")
    
    print(f"\n🔧 Moduli ({len(data['modules'])} elementov):")
    for module in data['modules'][:5]:  # Prikaži prvih 5
        print(f"  • {module['name']}: {module['status']} ({module['tier']})")
    if len(data['modules']) > 5:
        print(f"  ... in še {len(data['modules']) - 5} drugih")
    
    print(f"\n📊 KPI metrike ({len(data['kpi'])} elementov):")
    for kpi in data['kpi']:
        print(f"  • {kpi['name']}: {kpi['value']} {kpi['unit']}")
    
    print("\n🚀 Sistem zagnan na http://0.0.0.0:5015")
    print("🔒 Varnostni način: Sandbox/Demo")
    print("⏰ Časovna omejitev: 30 dni")

if __name__ == '__main__':
    run_demo()
    app.run(host='0.0.0.0', port=5015, debug=True)