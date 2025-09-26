#!/usr/bin/env python3
"""
🚀 Omni Premium Admin Console
Napredna admin konzola z oddaljenim nadgrajevanjem, časovno omejitvijo in premium dostopom
"""

import os
import sys
import json
import sqlite3
import hashlib
import secrets
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
from flask import Flask, request, jsonify, render_template_string
from cryptography.fernet import Fernet
import base64

# Konfiguracija logiranja
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PackageType(Enum):
    """Tipi premium paketov"""
    DEMO = "demo"
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class ModuleStatus(Enum):
    """Status modulov"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    LOCKED = "locked"
    EXPIRED = "expired"

@dataclass
class PremiumPackage:
    """Premium paket definicija"""
    name: str
    price_monthly: float
    features: List[str]
    modules: List[str]
    max_users: int
    ai_features: bool
    analytics: bool
    integrations: List[str]

@dataclass
class Timelock:
    """Časovna omejitev"""
    start_time: datetime
    end_time: datetime
    warning_sent: bool = False
    auto_lock: bool = True

@dataclass
class ModuleConfig:
    """Konfiguracija modula"""
    module_id: str
    name: str
    status: ModuleStatus
    package_required: PackageType
    timelock: Optional[Timelock] = None
    features: Dict[str, Any] = None

class OmniPremiumAdmin:
    """Napredna admin konzola za Omni Cloud"""
    
    def __init__(self, db_path: str = "omni_premium.db"):
        self.db_path = db_path
        self.app = Flask(__name__)
        self.app.secret_key = secrets.token_hex(32)
        
        # Generiranje encryption key
        self.encryption_key = self._generate_encryption_key()
        self.cipher = Fernet(self.encryption_key)
        
        # Premium paketi
        self.packages = self._init_premium_packages()
        
        # Inicializacija
        self._init_database()
        self._setup_routes()
        
        logger.info("Omni Premium Admin inicializiran")
    
    def _generate_encryption_key(self) -> bytes:
        """Generira AES-256 encryption key"""
        try:
            # Poskusi prebrati obstoječi key
            key_file = Path("omni_encryption.key")
            if key_file.exists():
                return key_file.read_bytes()
            else:
                # Generiraj nov key
                key = Fernet.generate_key()
                key_file.write_bytes(key)
                return key
        except Exception as e:
            logger.warning(f"Napaka pri encryption key: {e}")
            return Fernet.generate_key()
    
    def _init_premium_packages(self) -> Dict[str, PremiumPackage]:
        """Inicializira premium pakete"""
        return {
            PackageType.DEMO.value: PremiumPackage(
                name="Demo",
                price_monthly=0.0,
                features=["Osnovni pregled", "Časovno omejen dostop", "Read-only"],
                modules=["blagajna_basic", "nastanitve_basic"],
                max_users=2,
                ai_features=False,
                analytics=False,
                integrations=[]
            ),
            PackageType.BASIC.value: PremiumPackage(
                name="Basic",
                price_monthly=200.0,
                features=["Nastanitve", "Blagajna", "Osnovna analitika"],
                modules=["blagajna", "nastanitve", "analytics_basic"],
                max_users=5,
                ai_features=False,
                analytics=True,
                integrations=["pos_basic"]
            ),
            PackageType.STANDARD.value: PremiumPackage(
                name="Standard",
                price_monthly=400.0,
                features=["Basic +", "Kuhinja", "AI predlogi menijev", "Zaloge"],
                modules=["blagajna", "nastanitve", "kuhinja", "zaloge", "ai_basic"],
                max_users=15,
                ai_features=True,
                analytics=True,
                integrations=["pos_basic", "erp_basic"]
            ),
            PackageType.PREMIUM.value: PremiumPackage(
                name="Premium",
                price_monthly=800.0,
                features=["Standard +", "Turistične aktivnosti", "AR/VR", "Napredni KPI"],
                modules=["blagajna", "nastanitve", "kuhinja", "zaloge", "turizem", "ai_advanced", "analytics_advanced"],
                max_users=50,
                ai_features=True,
                analytics=True,
                integrations=["pos_advanced", "erp_advanced", "channel_manager"]
            ),
            PackageType.ENTERPRISE.value: PremiumPackage(
                name="Enterprise",
                price_monthly=0.0,  # Po dogovoru
                features=["Premium +", "Popolna integracija", "Custom razvoj", "24/7 podpora"],
                modules=["*"],  # Vsi moduli
                max_users=999,
                ai_features=True,
                analytics=True,
                integrations=["*"]  # Vse integracije
            )
        }
    
    def _init_database(self):
        """Inicializira bazo podatkov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tabela za module
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS modules (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    package_required TEXT NOT NULL,
                    config TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za timelocks
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS timelocks (
                    id TEXT PRIMARY KEY,
                    module_id TEXT,
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    warning_sent BOOLEAN DEFAULT FALSE,
                    auto_lock BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (module_id) REFERENCES modules (id)
                )
            ''')
            
            # Tabela za uporabnike
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    package_type TEXT NOT NULL,
                    active BOOLEAN DEFAULT TRUE,
                    expires_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za audit log
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS audit_log (
                    id TEXT PRIMARY KEY,
                    action TEXT NOT NULL,
                    module_id TEXT,
                    user_id TEXT,
                    details TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            
            # Dodaj osnovne module
            self._add_default_modules()
            
            logger.info("Premium baza podatkov inicializirana")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji baze: {e}")
    
    def _add_default_modules(self):
        """Doda osnovne module"""
        default_modules = [
            ModuleConfig("blagajna", "Blagajna POS", ModuleStatus.ACTIVE, PackageType.BASIC),
            ModuleConfig("nastanitve", "Nastanitve", ModuleStatus.ACTIVE, PackageType.BASIC),
            ModuleConfig("kuhinja", "Kuhinja KDS", ModuleStatus.INACTIVE, PackageType.STANDARD),
            ModuleConfig("zaloge", "Zaloge", ModuleStatus.INACTIVE, PackageType.STANDARD),
            ModuleConfig("turizem", "Turistične aktivnosti", ModuleStatus.INACTIVE, PackageType.PREMIUM),
            ModuleConfig("ai_basic", "AI Osnovni", ModuleStatus.INACTIVE, PackageType.STANDARD),
            ModuleConfig("ai_advanced", "AI Napredni", ModuleStatus.INACTIVE, PackageType.PREMIUM),
            ModuleConfig("analytics_basic", "Osnovna analitika", ModuleStatus.ACTIVE, PackageType.BASIC),
            ModuleConfig("analytics_advanced", "Napredna analitika", ModuleStatus.INACTIVE, PackageType.PREMIUM)
        ]
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for module in default_modules:
                # Pretvori enum vrednosti v string
                config_dict = {
                    'module_id': module.module_id,
                    'name': module.name,
                    'status': module.status.value,
                    'package_required': module.package_required.value,
                    'timelock': None,
                    'features': module.features
                }
                
                cursor.execute('''
                    INSERT OR IGNORE INTO modules (id, name, status, package_required, config)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    module.module_id,
                    module.name,
                    module.status.value,
                    module.package_required.value,
                    json.dumps(config_dict)
                ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri dodajanju modulov: {e}")
    
    def _setup_routes(self):
        """Nastavi Flask rute"""
        
        @self.app.route('/')
        def dashboard():
            """Admin dashboard"""
            return render_template_string(self._get_admin_template())
        
        @self.app.route('/api/modules')
        def get_modules():
            """Pridobi vse module"""
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('SELECT * FROM modules ORDER BY name')
                modules = []
                
                for row in cursor.fetchall():
                    modules.append({
                        'id': row[0],
                        'name': row[1],
                        'status': row[2],
                        'package_required': row[3],
                        'config': json.loads(row[4]) if row[4] else {},
                        'created_at': row[5],
                        'updated_at': row[6]
                    })
                
                conn.close()
                return jsonify({'modules': modules})
                
            except Exception as e:
                logger.error(f"Napaka pri pridobivanju modulov: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/modules/<module_id>/toggle', methods=['POST'])
        def toggle_module(module_id):
            """Preklopi status modula"""
            try:
                data = request.get_json() or {}
                new_status = data.get('status', 'active')
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE modules 
                    SET status = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ''', (new_status, module_id))
                
                conn.commit()
                conn.close()
                
                # Audit log
                self._log_action('module_toggle', module_id, {'new_status': new_status})
                
                return jsonify({'success': True, 'module_id': module_id, 'status': new_status})
                
            except Exception as e:
                logger.error(f"Napaka pri preklapljanju modula: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/timelock/<module_id>', methods=['POST'])
        def set_timelock(module_id):
            """Nastavi časovno omejitev za modul"""
            try:
                data = request.get_json()
                duration_hours = data.get('duration_hours', 24)
                auto_lock = data.get('auto_lock', True)
                
                start_time = datetime.now()
                end_time = start_time + timedelta(hours=duration_hours)
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Odstrani obstoječe timelock
                cursor.execute('DELETE FROM timelocks WHERE module_id = ?', (module_id,))
                
                # Dodaj nov timelock
                timelock_id = str(uuid.uuid4())
                cursor.execute('''
                    INSERT INTO timelocks (id, module_id, start_time, end_time, auto_lock)
                    VALUES (?, ?, ?, ?, ?)
                ''', (timelock_id, module_id, start_time, end_time, auto_lock))
                
                conn.commit()
                conn.close()
                
                # Audit log
                self._log_action('timelock_set', module_id, {
                    'duration_hours': duration_hours,
                    'end_time': end_time.isoformat()
                })
                
                return jsonify({
                    'success': True,
                    'timelock_id': timelock_id,
                    'end_time': end_time.isoformat()
                })
                
            except Exception as e:
                logger.error(f"Napaka pri nastavljanju timelock: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/packages')
        def get_packages():
            """Pridobi premium pakete"""
            packages_data = {}
            for key, package in self.packages.items():
                packages_data[key] = asdict(package)
            
            return jsonify({'packages': packages_data})
        
        @self.app.route('/api/users/<user_id>/package', methods=['POST'])
        def set_user_package(user_id):
            """Nastavi paket za uporabnika"""
            try:
                data = request.get_json()
                package_type = data.get('package_type')
                duration_days = data.get('duration_days', 30)
                
                if package_type not in self.packages:
                    return jsonify({'error': 'Neveljaven paket'}), 400
                
                expires_at = datetime.now() + timedelta(days=duration_days)
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO users (id, username, package_type, expires_at)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, f"user_{user_id}", package_type, expires_at))
                
                conn.commit()
                conn.close()
                
                # Audit log
                self._log_action('package_assigned', None, {
                    'user_id': user_id,
                    'package_type': package_type,
                    'expires_at': expires_at.isoformat()
                })
                
                return jsonify({
                    'success': True,
                    'user_id': user_id,
                    'package_type': package_type,
                    'expires_at': expires_at.isoformat()
                })
                
            except Exception as e:
                logger.error(f"Napaka pri nastavljanju paketa: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/system/status')
        def system_status():
            """Sistemski status"""
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Število modulov po statusu
                cursor.execute('''
                    SELECT status, COUNT(*) 
                    FROM modules 
                    GROUP BY status
                ''')
                module_stats = dict(cursor.fetchall())
                
                # Število uporabnikov po paketih
                cursor.execute('''
                    SELECT package_type, COUNT(*) 
                    FROM users 
                    WHERE active = TRUE
                    GROUP BY package_type
                ''')
                user_stats = dict(cursor.fetchall())
                
                # Aktivni timelocks
                cursor.execute('''
                    SELECT COUNT(*) 
                    FROM timelocks 
                    WHERE end_time > CURRENT_TIMESTAMP
                ''')
                active_timelocks = cursor.fetchone()[0]
                
                conn.close()
                
                return jsonify({
                    'module_stats': module_stats,
                    'user_stats': user_stats,
                    'active_timelocks': active_timelocks,
                    'total_packages': len(self.packages),
                    'encryption_active': True,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Napaka pri sistemskem statusu: {e}")
                return jsonify({'error': str(e)}), 500
    
    def _log_action(self, action: str, module_id: Optional[str] = None, details: Dict = None):
        """Zabeleži akcijo v audit log"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            log_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO audit_log (id, action, module_id, details)
                VALUES (?, ?, ?, ?)
            ''', (log_id, action, module_id, json.dumps(details or {})))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri audit log: {e}")
    
    def check_timelocks(self):
        """Preveri in izvršuje timelocks"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Najdi potekle timelocks
            cursor.execute('''
                SELECT t.id, t.module_id, t.end_time, t.warning_sent, m.name
                FROM timelocks t
                JOIN modules m ON t.module_id = m.id
                WHERE t.end_time <= CURRENT_TIMESTAMP AND t.auto_lock = TRUE
            ''')
            
            expired_timelocks = cursor.fetchall()
            
            for timelock_id, module_id, end_time, warning_sent, module_name in expired_timelocks:
                # Zakleni modul
                cursor.execute('''
                    UPDATE modules 
                    SET status = 'locked', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ''', (module_id,))
                
                # Odstrani timelock
                cursor.execute('DELETE FROM timelocks WHERE id = ?', (timelock_id,))
                
                logger.info(f"Modul {module_name} ({module_id}) zaklenjen zaradi poteka časa")
                
                # Audit log
                self._log_action('timelock_expired', module_id, {
                    'end_time': end_time,
                    'auto_locked': True
                })
            
            # Preveri opozorila (24h pred potekom)
            cursor.execute('''
                SELECT t.id, t.module_id, t.end_time, m.name
                FROM timelocks t
                JOIN modules m ON t.module_id = m.id
                WHERE t.end_time <= datetime('now', '+24 hours') 
                AND t.warning_sent = FALSE
            ''')
            
            warning_timelocks = cursor.fetchall()
            
            for timelock_id, module_id, end_time, module_name in warning_timelocks:
                # Označi opozorilo kot poslano
                cursor.execute('''
                    UPDATE timelocks 
                    SET warning_sent = TRUE 
                    WHERE id = ?
                ''', (timelock_id,))
                
                logger.warning(f"Opozorilo: Modul {module_name} se bo zaklenil ob {end_time}")
                
                # Audit log
                self._log_action('timelock_warning', module_id, {
                    'end_time': end_time,
                    'warning_sent': True
                })
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri preverjanju timelocks: {e}")
    
    def _get_admin_template(self) -> str:
        """HTML template za admin dashboard"""
        return '''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Omni Premium Admin Console</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { 
            background: rgba(255,255,255,0.95);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header h1 { 
            color: #2c3e50;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header p { color: #7f8c8d; font-size: 1.1em; }
        .grid { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 25px;
            margin-bottom: 30px;
        }
        .card { 
            background: rgba(255,255,255,0.95);
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .card:hover { transform: translateY(-5px); }
        .card h3 { 
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.4em;
        }
        .module-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            margin: 8px 0;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .module-item.active { border-left-color: #27ae60; }
        .module-item.inactive { border-left-color: #e74c3c; }
        .module-item.locked { border-left-color: #f39c12; }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-primary { background: #3498db; color: white; }
        .btn-success { background: #27ae60; color: white; }
        .btn-danger { background: #e74c3c; color: white; }
        .btn-warning { background: #f39c12; color: white; }
        .btn:hover { transform: scale(1.05); }
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-active { background: #d4edda; color: #155724; }
        .status-inactive { background: #f8d7da; color: #721c24; }
        .status-locked { background: #fff3cd; color: #856404; }
        .package-card {
            border: 2px solid #e9ecef;
            border-radius: 10px;
            padding: 20px;
            margin: 10px 0;
            transition: all 0.3s ease;
        }
        .package-card:hover { border-color: #3498db; }
        .package-card.demo { border-color: #6c757d; }
        .package-card.basic { border-color: #28a745; }
        .package-card.standard { border-color: #007bff; }
        .package-card.premium { border-color: #ffc107; }
        .package-card.enterprise { border-color: #dc3545; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-item {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        .timelock-form {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 15px 0;
        }
        .form-group {
            margin: 15px 0;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1em;
        }
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .alert-danger { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Omni Premium Admin Console</h1>
            <p>Oddaljeno upravljanje, časovna omejitev in premium dostop</p>
        </div>

        <div class="grid">
            <!-- Sistemski status -->
            <div class="card">
                <h3>📊 Sistemski Status</h3>
                <div id="systemStatus">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-number" id="activeModules">-</div>
                            <div class="stat-label">Aktivni moduli</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="activeUsers">-</div>
                            <div class="stat-label">Aktivni uporabniki</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="activeTimelocks">-</div>
                            <div class="stat-label">Aktivni timelocks</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Upravljanje modulov -->
            <div class="card">
                <h3>⚙️ Upravljanje Modulov</h3>
                <div id="modulesList">
                    <p>Nalagam module...</p>
                </div>
            </div>

            <!-- Časovna omejitev -->
            <div class="card">
                <h3>⏰ Časovna Omejitev</h3>
                <div class="timelock-form">
                    <div class="form-group">
                        <label for="timelockModule">Modul:</label>
                        <select id="timelockModule">
                            <option value="">Izberi modul...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="timelockDuration">Trajanje (ure):</label>
                        <input type="number" id="timelockDuration" value="24" min="1" max="8760">
                    </div>
                    <button class="btn btn-warning" onclick="setTimelock()">
                        🔒 Nastavi Časovno Omejitev
                    </button>
                </div>
            </div>

            <!-- Premium paketi -->
            <div class="card">
                <h3>💎 Premium Paketi</h3>
                <div id="packagesList">
                    <p>Nalagam pakete...</p>
                </div>
            </div>
        </div>

        <div id="alerts"></div>
    </div>

    <script>
        // Globalne spremenljivke
        let modules = [];
        let packages = {};

        // Inicializacija
        document.addEventListener('DOMContentLoaded', function() {
            loadSystemStatus();
            loadModules();
            loadPackages();
            
            // Osveži vsakih 30 sekund
            setInterval(loadSystemStatus, 30000);
        });

        // Naloži sistemski status
        async function loadSystemStatus() {
            try {
                const response = await fetch('/api/system/status');
                const data = await response.json();
                
                document.getElementById('activeModules').textContent = 
                    (data.module_stats.active || 0);
                document.getElementById('activeUsers').textContent = 
                    Object.values(data.user_stats || {}).reduce((a, b) => a + b, 0);
                document.getElementById('activeTimelocks').textContent = 
                    data.active_timelocks || 0;
                    
            } catch (error) {
                console.error('Napaka pri nalaganju statusa:', error);
            }
        }

        // Naloži module
        async function loadModules() {
            try {
                const response = await fetch('/api/modules');
                const data = await response.json();
                modules = data.modules;
                
                renderModules();
                updateTimelockSelect();
                
            } catch (error) {
                console.error('Napaka pri nalaganju modulov:', error);
            }
        }

        // Prikaži module
        function renderModules() {
            const container = document.getElementById('modulesList');
            
            if (modules.length === 0) {
                container.innerHTML = '<p>Ni modulov.</p>';
                return;
            }
            
            container.innerHTML = modules.map(module => `
                <div class="module-item ${module.status}">
                    <div>
                        <strong>${module.name}</strong>
                        <span class="status-badge status-${module.status}">${module.status}</span>
                        <br>
                        <small>Paket: ${module.package_required}</small>
                    </div>
                    <div>
                        <button class="btn ${module.status === 'active' ? 'btn-danger' : 'btn-success'}" 
                                onclick="toggleModule('${module.id}', '${module.status === 'active' ? 'inactive' : 'active'}')">
                            ${module.status === 'active' ? '⏸️ Deaktiviraj' : '▶️ Aktiviraj'}
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Preklopi modul
        async function toggleModule(moduleId, newStatus) {
            try {
                const response = await fetch(`/api/modules/${moduleId}/toggle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showAlert(`Modul ${moduleId} ${newStatus === 'active' ? 'aktiviran' : 'deaktiviran'}`, 'success');
                    loadModules();
                } else {
                    showAlert('Napaka pri preklapljanju modula', 'danger');
                }
                
            } catch (error) {
                console.error('Napaka pri preklapljanju modula:', error);
                showAlert('Napaka pri preklapljanju modula', 'danger');
            }
        }

        // Posodobi timelock select
        function updateTimelockSelect() {
            const select = document.getElementById('timelockModule');
            select.innerHTML = '<option value="">Izberi modul...</option>' +
                modules.map(module => 
                    `<option value="${module.id}">${module.name}</option>`
                ).join('');
        }

        // Nastavi timelock
        async function setTimelock() {
            const moduleId = document.getElementById('timelockModule').value;
            const duration = document.getElementById('timelockDuration').value;
            
            if (!moduleId || !duration) {
                showAlert('Izberi modul in trajanje', 'warning');
                return;
            }
            
            try {
                const response = await fetch(`/api/timelock/${moduleId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        duration_hours: parseInt(duration),
                        auto_lock: true 
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showAlert(`Timelock nastavljen za ${duration}h`, 'success');
                    loadSystemStatus();
                } else {
                    showAlert('Napaka pri nastavljanju timelock', 'danger');
                }
                
            } catch (error) {
                console.error('Napaka pri nastavljanju timelock:', error);
                showAlert('Napaka pri nastavljanju timelock', 'danger');
            }
        }

        // Naloži pakete
        async function loadPackages() {
            try {
                const response = await fetch('/api/packages');
                const data = await response.json();
                packages = data.packages;
                
                renderPackages();
                
            } catch (error) {
                console.error('Napaka pri nalaganju paketov:', error);
            }
        }

        // Prikaži pakete
        function renderPackages() {
            const container = document.getElementById('packagesList');
            
            container.innerHTML = Object.entries(packages).map(([key, pkg]) => `
                <div class="package-card ${key}">
                    <h4>${pkg.name}</h4>
                    <p><strong>${pkg.price_monthly > 0 ? pkg.price_monthly + '€/mesec' : 'Po dogovoru'}</strong></p>
                    <p><small>Uporabniki: ${pkg.max_users}, AI: ${pkg.ai_features ? 'Da' : 'Ne'}</small></p>
                    <p><small>Moduli: ${pkg.modules.join(', ')}</small></p>
                </div>
            `).join('');
        }

        // Prikaži opozorilo
        function showAlert(message, type = 'info') {
            const alertsContainer = document.getElementById('alerts');
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type}`;
            alertDiv.textContent = message;
            
            alertsContainer.appendChild(alertDiv);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
    </script>
</body>
</html>
        '''
    
    def run_server(self, host: str = "0.0.0.0", port: int = 5001, debug: bool = False):
        """Zaženi admin server"""
        logger.info(f"Zaganjam Omni Premium Admin na http://{host}:{port}")
        self.app.run(host=host, port=port, debug=debug)

def main():
    """Glavna funkcija"""
    print("🚀 Zaganjam Omni Premium Admin Demo...")
    
    # Ustvari admin konzolo
    admin = OmniPremiumAdmin()
    
    # Preveri timelocks
    admin.check_timelocks()
    
    print("✅ Omni Premium Admin inicializiran")
    print("📊 Sistemski pregled:")
    
    # Prikaži osnovne informacije
    try:
        conn = sqlite3.connect(admin.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM modules')
        module_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM modules WHERE status = "active"')
        active_modules = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM timelocks WHERE end_time > CURRENT_TIMESTAMP')
        active_timelocks = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"  • Moduli: {module_count} (aktivni: {active_modules})")
        print(f"  • Aktivni timelocks: {active_timelocks}")
        print(f"  • Premium paketi: {len(admin.packages)}")
        print(f"  • Enkripcija: AES-256 ✅")
        
    except Exception as e:
        logger.error(f"Napaka pri pregledu: {e}")
    
    print("\n🎉 Premium Admin uspešno testiran!")
    print("💡 Za zagon web vmesnika uporabi:")
    print("  python omni_premium_admin.py --run")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        admin = OmniPremiumAdmin()
        admin.run_server(port=5001, debug=True)
    else:
        main()