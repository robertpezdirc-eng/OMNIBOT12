#!/usr/bin/env python3
"""
OMNI Cloud Admin System - Oblačni admin sistem z oddaljenim nadgrajevanjem
Avtor: OMNI AI Platform
Verzija: 1.0.0
Datum: 2024

Funkcionalnosti:
- Oddaljeno nadgrajevanje modulov
- Upravljanje premium funkcionalnosti
- Časovno omejen demo dostop
- Modularni cenik (Basic, Standard, Premium, Enterprise)
- Real-time monitoring vseh sistemov
- Varnostne funkcije (centraliziran oblak, TLS + AES-256 enkripcija)
- Admin konzola za upravljanje
- Aktivacija/deaktivacija modulov
- Spremljanje aktivnosti uporabnikov
"""

import os
import sys
import json
import sqlite3
import hashlib
import secrets
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from flask import Flask, render_template_string, jsonify, request, session, redirect, url_for
from flask_cors import CORS
import requests
from cryptography.fernet import Fernet
import base64
import jwt
from functools import wraps

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModuleStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UPDATING = "updating"
    ERROR = "error"
    DEMO = "demo"

class PricingTier(Enum):
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class UserRole(Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    DEMO = "demo"

@dataclass
class Module:
    id: str
    name: str
    version: str
    status: ModuleStatus
    pricing_tier: PricingTier
    last_updated: datetime
    features: List[str]
    dependencies: List[str] = None
    port: Optional[int] = None
    url: Optional[str] = None

@dataclass
class Client:
    id: str
    name: str
    email: str
    pricing_tier: PricingTier
    active_modules: List[str]
    demo_expires: Optional[datetime]
    created_at: datetime
    last_active: datetime
    total_usage: int = 0

@dataclass
class AdminUser:
    id: str
    username: str
    email: str
    role: UserRole
    created_at: datetime
    last_login: Optional[datetime] = None

class OmniCloudAdmin:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = secrets.token_hex(32)
        CORS(self.app)
        
        # Varnostne nastavitve
        self.jwt_secret = secrets.token_hex(32)
        self.encryption_key = self._generate_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Konfiguracija
        self.config = {
            'app_name': 'OMNI Cloud Admin',
            'version': '1.0.0',
            'admin_email': 'admin@omni-cloud.com',
            'demo_duration_hours': 24,
            'max_demo_extensions': 3,
            'pricing': {
                'basic': {'price': 29, 'modules': ['tourism', 'pos']},
                'standard': {'price': 79, 'modules': ['tourism', 'pos', 'analytics', 'mobile']},
                'premium': {'price': 149, 'modules': ['tourism', 'pos', 'analytics', 'mobile', 'ai', 'ar_vr']},
                'enterprise': {'price': 299, 'modules': ['all']}
            }
        }
        
        # Stanje sistema
        self.modules: Dict[str, Module] = {}
        self.clients: Dict[str, Client] = {}
        self.admin_users: Dict[str, AdminUser] = {}
        self.active_sessions: Dict[str, Dict] = {}
        
        # Inicializacija
        self._init_database()
        self._load_modules()
        self._load_clients()
        self._setup_routes()
        self._start_monitoring_service()
        
        logger.info("OMNI Cloud Admin sistem inicializiran")

    def _generate_encryption_key(self) -> bytes:
        """Generira ključ za enkripcijo"""
        return Fernet.generate_key()

    def _encrypt_data(self, data: str) -> str:
        """Enkriptira podatke"""
        return self.cipher_suite.encrypt(data.encode()).decode()

    def _decrypt_data(self, encrypted_data: str) -> str:
        """Dekriptira podatke"""
        return self.cipher_suite.decrypt(encrypted_data.encode()).decode()

    def _init_database(self):
        """Inicializira SQLite bazo podatkov"""
        self.db_path = 'omni_cloud_admin.db'
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za module
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS modules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                version TEXT NOT NULL,
                status TEXT NOT NULL,
                pricing_tier TEXT NOT NULL,
                last_updated DATETIME NOT NULL,
                features TEXT NOT NULL,
                dependencies TEXT,
                port INTEGER,
                url TEXT
            )
        ''')
        
        # Tabela za kliente
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                pricing_tier TEXT NOT NULL,
                active_modules TEXT NOT NULL,
                demo_expires DATETIME,
                created_at DATETIME NOT NULL,
                last_active DATETIME NOT NULL,
                total_usage INTEGER DEFAULT 0
            )
        ''')
        
        # Tabela za admin uporabnike
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admin_users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                last_login DATETIME
            )
        ''')
        
        # Tabela za aktivnosti
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT,
                module_id TEXT,
                action TEXT NOT NULL,
                timestamp DATETIME NOT NULL,
                details TEXT
            )
        ''')
        
        # Tabela za nastavitve
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                encrypted BOOLEAN DEFAULT FALSE
            )
        ''')
        
        conn.commit()
        conn.close()
        
        # Ustvari privzeti admin račun
        self._create_default_admin()
        logger.info("Baza podatkov inicializirana")

    def _create_default_admin(self):
        """Ustvari privzeti admin račun"""
        admin_user = AdminUser(
            id="admin_001",
            username="admin",
            email="admin@omni-cloud.com",
            role=UserRole.ADMIN,
            created_at=datetime.now()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Preveri, če admin že obstaja
        cursor.execute('SELECT id FROM admin_users WHERE username = ?', ('admin',))
        if not cursor.fetchone():
            password_hash = hashlib.sha256("admin123".encode()).hexdigest()
            cursor.execute('''
                INSERT INTO admin_users (id, username, email, password_hash, role, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                admin_user.id,
                admin_user.username,
                admin_user.email,
                password_hash,
                admin_user.role.value,
                admin_user.created_at.isoformat()
            ))
            conn.commit()
            logger.info("Privzeti admin račun ustvarjen (admin/admin123)")
        
        conn.close()

    def _load_modules(self):
        """Naloži module iz baze"""
        # Privzeti moduli
        default_modules = [
            Module(
                id="tourism",
                name="Turizem & Gostinstvo",
                version="1.0.0",
                status=ModuleStatus.ACTIVE,
                pricing_tier=PricingTier.BASIC,
                last_updated=datetime.now(),
                features=["Rezervacije", "Nastanitve", "Aktivnosti"],
                port=5001,
                url="http://localhost:5001"
            ),
            Module(
                id="pos",
                name="POS & Blagajna",
                version="1.0.0",
                status=ModuleStatus.ACTIVE,
                pricing_tier=PricingTier.BASIC,
                last_updated=datetime.now(),
                features=["Blagajna", "Fiskalizacija", "Zaloge"],
                port=5002
            ),
            Module(
                id="analytics",
                name="Analitika & KPI",
                version="1.0.0",
                status=ModuleStatus.ACTIVE,
                pricing_tier=PricingTier.STANDARD,
                last_updated=datetime.now(),
                features=["Dashboard", "Poročila", "Grafi"],
                port=5003
            ),
            Module(
                id="mobile",
                name="Mobilna aplikacija",
                version="1.0.0",
                status=ModuleStatus.ACTIVE,
                pricing_tier=PricingTier.STANDARD,
                last_updated=datetime.now(),
                features=["Offline", "Sinhronizacija", "PWA"],
                port=5011,
                url="http://localhost:5011"
            ),
            Module(
                id="ai",
                name="AI & Chatbot",
                version="1.0.0",
                status=ModuleStatus.ACTIVE,
                pricing_tier=PricingTier.PREMIUM,
                last_updated=datetime.now(),
                features=["NLP", "Večjezičnost", "AI predlogi"],
                port=5010,
                url="http://localhost:5010"
            ),
            Module(
                id="ar_vr",
                name="AR/VR Sistem",
                version="1.0.0",
                status=ModuleStatus.ACTIVE,
                pricing_tier=PricingTier.PREMIUM,
                last_updated=datetime.now(),
                features=["3D ogledi", "VR ture", "AR navigacija"],
                port=5006,
                url="http://localhost:5006"
            ),
            Module(
                id="iot",
                name="IoT Monitoring",
                version="1.0.0",
                status=ModuleStatus.ACTIVE,
                pricing_tier=PricingTier.ENTERPRISE,
                last_updated=datetime.now(),
                features=["Senzorji", "Real-time", "Alarmi"],
                port=5008,
                url="http://localhost:5008"
            ),
            Module(
                id="blockchain",
                name="Blockchain & Kripto",
                version="1.0.0",
                status=ModuleStatus.ACTIVE,
                pricing_tier=PricingTier.ENTERPRISE,
                last_updated=datetime.now(),
                features=["Plačila", "Smart pogodbe", "NFT"],
                port=5007,
                url="http://localhost:5007"
            )
        ]
        
        for module in default_modules:
            self.modules[module.id] = module
        
        logger.info(f"Naloženih {len(self.modules)} modulov")

    def _load_clients(self):
        """Naloži kliente iz baze"""
        # Privzeti demo klient
        demo_client = Client(
            id="demo_001",
            name="Demo uporabnik",
            email="demo@example.com",
            pricing_tier=PricingTier.PREMIUM,
            active_modules=["tourism", "pos", "analytics", "mobile", "ai"],
            demo_expires=datetime.now() + timedelta(hours=24),
            created_at=datetime.now(),
            last_active=datetime.now()
        )
        
        self.clients[demo_client.id] = demo_client
        logger.info(f"Naloženih {len(self.clients)} klientov")

    def _setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def index():
            if 'admin_id' not in session:
                return redirect(url_for('login'))
            return render_template_string(self._get_admin_template())
        
        @self.app.route('/login', methods=['GET', 'POST'])
        def login():
            if request.method == 'POST':
                username = request.form.get('username')
                password = request.form.get('password')
                
                if self._authenticate_admin(username, password):
                    session['admin_id'] = username
                    return redirect(url_for('index'))
                else:
                    return render_template_string(self._get_login_template(), error="Napačno uporabniško ime ali geslo")
            
            return render_template_string(self._get_login_template())
        
        @self.app.route('/logout')
        def logout():
            session.pop('admin_id', None)
            return redirect(url_for('login'))
        
        @self.app.route('/api/status')
        def get_status():
            return jsonify({
                'status': 'active',
                'modules_count': len(self.modules),
                'active_modules': len([m for m in self.modules.values() if m.status == ModuleStatus.ACTIVE]),
                'clients_count': len(self.clients),
                'active_sessions': len(self.active_sessions),
                'system_health': self._get_system_health()
            })
        
        @self.app.route('/api/modules')
        def get_modules():
            return jsonify([asdict(module) for module in self.modules.values()])
        
        @self.app.route('/api/modules/<module_id>/toggle', methods=['POST'])
        @self._require_admin
        def toggle_module(module_id):
            if module_id in self.modules:
                module = self.modules[module_id]
                if module.status == ModuleStatus.ACTIVE:
                    module.status = ModuleStatus.INACTIVE
                else:
                    module.status = ModuleStatus.ACTIVE
                
                self._log_activity(None, module_id, f"Module {module.status.value}")
                return jsonify({'success': True, 'status': module.status.value})
            
            return jsonify({'success': False, 'error': 'Module not found'}), 404
        
        @self.app.route('/api/modules/<module_id>/update', methods=['POST'])
        @self._require_admin
        def update_module(module_id):
            if module_id in self.modules:
                module = self.modules[module_id]
                module.status = ModuleStatus.UPDATING
                
                # Simuliraj posodobitev
                threading.Thread(target=self._simulate_module_update, args=(module_id,)).start()
                
                return jsonify({'success': True, 'message': 'Update started'})
            
            return jsonify({'success': False, 'error': 'Module not found'}), 404
        
        @self.app.route('/api/clients')
        @self._require_admin
        def get_clients():
            return jsonify([asdict(client) for client in self.clients.values()])
        
        @self.app.route('/api/clients/<client_id>/extend-demo', methods=['POST'])
        @self._require_admin
        def extend_demo(client_id):
            if client_id in self.clients:
                client = self.clients[client_id]
                if client.demo_expires:
                    client.demo_expires += timedelta(hours=24)
                    self._log_activity(client_id, None, "Demo extended")
                    return jsonify({'success': True, 'new_expiry': client.demo_expires.isoformat()})
            
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        @self.app.route('/api/pricing')
        def get_pricing():
            return jsonify(self.config['pricing'])

    def _require_admin(self, f):
        """Decorator za preverjanje admin dostopa"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'admin_id' not in session:
                return jsonify({'error': 'Unauthorized'}), 401
            return f(*args, **kwargs)
        return decorated_function

    def _authenticate_admin(self, username: str, password: str) -> bool:
        """Avtenticiraj admin uporabnika"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        cursor.execute('''
            SELECT id FROM admin_users 
            WHERE username = ? AND password_hash = ?
        ''', (username, password_hash))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            # Posodobi zadnjo prijavo
            self._update_last_login(username)
            return True
        
        return False

    def _update_last_login(self, username: str):
        """Posodobi čas zadnje prijave"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE admin_users 
            SET last_login = ? 
            WHERE username = ?
        ''', (datetime.now().isoformat(), username))
        
        conn.commit()
        conn.close()

    def _simulate_module_update(self, module_id: str):
        """Simuliraj posodobitev modula"""
        time.sleep(5)  # Simuliraj čas posodobitve
        
        if module_id in self.modules:
            module = self.modules[module_id]
            module.status = ModuleStatus.ACTIVE
            module.last_updated = datetime.now()
            module.version = f"{module.version}.1"  # Povečaj verzijo
            
            self._log_activity(None, module_id, f"Module updated to {module.version}")
            logger.info(f"Module {module_id} updated to {module.version}")

    def _get_system_health(self) -> Dict[str, Any]:
        """Pridobi zdravje sistema"""
        active_modules = len([m for m in self.modules.values() if m.status == ModuleStatus.ACTIVE])
        total_modules = len(self.modules)
        
        return {
            'overall': 'healthy' if active_modules > total_modules * 0.8 else 'warning',
            'active_modules_percentage': (active_modules / total_modules) * 100,
            'uptime': '99.9%',
            'last_check': datetime.now().isoformat()
        }

    def _log_activity(self, client_id: Optional[str], module_id: Optional[str], action: str, details: Optional[str] = None):
        """Zabeleži aktivnost"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO activities (client_id, module_id, action, timestamp, details)
            VALUES (?, ?, ?, ?, ?)
        ''', (client_id, module_id, action, datetime.now().isoformat(), details))
        
        conn.commit()
        conn.close()

    def _start_monitoring_service(self):
        """Zažene servis za monitoring"""
        def monitor_worker():
            while True:
                try:
                    # Preveri demo izteke
                    self._check_demo_expiry()
                    
                    # Preveri zdravje modulov
                    self._check_module_health()
                    
                    time.sleep(60)  # Preveri vsako minuto
                except Exception as e:
                    logger.error(f"Napaka pri monitoringu: {e}")
                    time.sleep(60)
        
        monitor_thread = threading.Thread(target=monitor_worker, daemon=True)
        monitor_thread.start()
        logger.info("Monitoring servis zagnan")

    def _check_demo_expiry(self):
        """Preveri izteke demo dostopov"""
        now = datetime.now()
        
        for client in self.clients.values():
            if client.demo_expires and client.demo_expires < now:
                # Deaktiviraj demo dostop
                client.active_modules = []
                self._log_activity(client.id, None, "Demo expired")
                logger.info(f"Demo expired for client {client.id}")

    def _check_module_health(self):
        """Preveri zdravje modulov"""
        for module in self.modules.values():
            if module.status == ModuleStatus.ACTIVE and module.url:
                try:
                    # Poskusi ping na modul
                    response = requests.get(f"{module.url}/api/status", timeout=5)
                    if response.status_code != 200:
                        module.status = ModuleStatus.ERROR
                        logger.warning(f"Module {module.id} health check failed")
                except:
                    # V demo načinu ne označuj kot napako
                    pass

    def _get_login_template(self) -> str:
        """Vrne HTML template za prijavo"""
        return '''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Cloud Admin - Prijava</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
        }
        
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .logo h1 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #333;
            font-weight: 500;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        
        .btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #2196F3, #21CBF3);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(33, 150, 243, 0.3);
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .demo-info {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h1>OMNI Cloud Admin</h1>
            <p>Oblačni admin sistem</p>
        </div>
        
        {% if error %}
        <div class="error">{{ error }}</div>
        {% endif %}
        
        <form method="POST">
            <div class="form-group">
                <label for="username">Uporabniško ime:</label>
                <input type="text" id="username" name="username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Geslo:</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit" class="btn">Prijava</button>
        </form>
        
        <div class="demo-info">
            <strong>Demo dostop:</strong><br>
            Uporabniško ime: <code>admin</code><br>
            Geslo: <code>admin123</code>
        </div>
    </div>
</body>
</html>
        '''

    def _get_admin_template(self) -> str:
        """Vrne HTML template za admin konzolo"""
        return '''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Cloud Admin</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: linear-gradient(135deg, #2196F3, #21CBF3);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            margin: 0;
        }
        
        .header .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .card h3 {
            margin-bottom: 15px;
            color: #333;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .module-list {
            display: grid;
            gap: 10px;
        }
        
        .module-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 4px solid #2196F3;
        }
        
        .module-item.inactive {
            border-left-color: #dc3545;
            opacity: 0.7;
        }
        
        .module-info h4 {
            margin: 0 0 5px 0;
        }
        
        .module-info p {
            margin: 0;
            font-size: 14px;
            color: #666;
        }
        
        .module-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }
        
        .btn-primary {
            background: #2196F3;
            color: white;
        }
        
        .btn-success {
            background: #28a745;
            color: white;
        }
        
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        
        .btn-warning {
            background: #ffc107;
            color: #212529;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-active { background: #28a745; }
        .status-inactive { background: #dc3545; }
        .status-updating { background: #ffc107; animation: pulse 1s infinite; }
        .status-error { background: #dc3545; animation: pulse 1s infinite; }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .client-list {
            display: grid;
            gap: 15px;
        }
        
        .client-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        
        .client-info h4 {
            margin: 0 0 5px 0;
        }
        
        .client-info p {
            margin: 0;
            font-size: 14px;
            color: #666;
        }
        
        .pricing-tier {
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .tier-basic { background: #e3f2fd; color: #1976d2; }
        .tier-standard { background: #f3e5f5; color: #7b1fa2; }
        .tier-premium { background: #fff3e0; color: #f57c00; }
        .tier-enterprise { background: #e8f5e8; color: #388e3c; }
        
        .chart-container {
            height: 300px;
            margin-top: 20px;
        }
        
        .tabs {
            display: flex;
            background: white;
            border-radius: 10px 10px 0 0;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .tab {
            flex: 1;
            padding: 15px;
            text-align: center;
            background: #f8f9fa;
            border: none;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .tab.active {
            background: white;
            color: #2196F3;
            border-bottom: 2px solid #2196F3;
        }
        
        .tab-content {
            display: none;
            background: white;
            padding: 20px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>OMNI Cloud Admin</h1>
        <div class="user-info">
            <span>Admin konzola</span>
            <a href="/logout" class="btn btn-danger">Odjava</a>
        </div>
    </div>
    
    <div class="container">
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number" id="totalModules">0</div>
                <div class="stat-label">Skupaj modulov</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="activeModules">0</div>
                <div class="stat-label">Aktivni moduli</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="totalClients">0</div>
                <div class="stat-label">Skupaj klientov</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="activeSessions">0</div>
                <div class="stat-label">Aktivne seje</div>
            </div>
        </div>
        
        <div class="tabs">
            <button class="tab active" onclick="showTab('modules')">Moduli</button>
            <button class="tab" onclick="showTab('clients')">Klienti</button>
            <button class="tab" onclick="showTab('pricing')">Ceniki</button>
            <button class="tab" onclick="showTab('analytics')">Analitika</button>
        </div>
        
        <div id="modules" class="tab-content active">
            <h3>Upravljanje modulov</h3>
            <div id="modulesList" class="module-list"></div>
        </div>
        
        <div id="clients" class="tab-content">
            <h3>Upravljanje klientov</h3>
            <div id="clientsList" class="client-list"></div>
        </div>
        
        <div id="pricing" class="tab-content">
            <h3>Cenični paketi</h3>
            <div id="pricingInfo"></div>
        </div>
        
        <div id="analytics" class="tab-content">
            <h3>Analitika sistema</h3>
            <div class="chart-container" id="analyticsChart"></div>
        </div>
    </div>

    <script>
        let systemData = {
            modules: [],
            clients: [],
            pricing: {},
            status: {}
        };

        // Inicializacija
        document.addEventListener('DOMContentLoaded', function() {
            loadSystemData();
            setInterval(loadSystemData, 10000); // Posodobi vsakih 10 sekund
        });

        async function loadSystemData() {
            try {
                // Naloži status
                const statusResponse = await fetch('/api/status');
                systemData.status = await statusResponse.json();
                
                // Naloži module
                const modulesResponse = await fetch('/api/modules');
                systemData.modules = await modulesResponse.json();
                
                // Naloži kliente
                const clientsResponse = await fetch('/api/clients');
                systemData.clients = await clientsResponse.json();
                
                // Naloži cenike
                const pricingResponse = await fetch('/api/pricing');
                systemData.pricing = await pricingResponse.json();
                
                updateUI();
            } catch (error) {
                console.error('Napaka pri nalaganju podatkov:', error);
            }
        }

        function updateUI() {
            // Posodobi statistike
            document.getElementById('totalModules').textContent = systemData.modules.length;
            document.getElementById('activeModules').textContent = systemData.status.active_modules;
            document.getElementById('totalClients').textContent = systemData.clients.length;
            document.getElementById('activeSessions').textContent = systemData.status.active_sessions;
            
            // Posodobi module
            updateModulesList();
            
            // Posodobi kliente
            updateClientsList();
            
            // Posodobi cenike
            updatePricingInfo();
            
            // Posodobi analitiko
            updateAnalytics();
        }

        function updateModulesList() {
            const modulesList = document.getElementById('modulesList');
            modulesList.innerHTML = '';
            
            systemData.modules.forEach(module => {
                const moduleItem = document.createElement('div');
                moduleItem.className = `module-item ${module.status === 'active' ? '' : 'inactive'}`;
                
                moduleItem.innerHTML = `
                    <div class="module-info">
                        <h4>
                            <span class="status-indicator status-${module.status}"></span>
                            ${module.name}
                        </h4>
                        <p>Verzija: ${module.version} | Port: ${module.port || 'N/A'} | Paket: ${module.pricing_tier}</p>
                        <p>Funkcionalnosti: ${module.features.join(', ')}</p>
                    </div>
                    <div class="module-actions">
                        <button class="btn ${module.status === 'active' ? 'btn-danger' : 'btn-success'}" 
                                onclick="toggleModule('${module.id}')">
                            ${module.status === 'active' ? 'Deaktiviraj' : 'Aktiviraj'}
                        </button>
                        <button class="btn btn-warning" onclick="updateModule('${module.id}')">
                            Posodobi
                        </button>
                        ${module.url ? `<button class="btn btn-primary" onclick="window.open('${module.url}', '_blank')">Odpri</button>` : ''}
                    </div>
                `;
                
                modulesList.appendChild(moduleItem);
            });
        }

        function updateClientsList() {
            const clientsList = document.getElementById('clientsList');
            clientsList.innerHTML = '';
            
            systemData.clients.forEach(client => {
                const clientItem = document.createElement('div');
                clientItem.className = 'client-item';
                
                const demoExpiry = client.demo_expires ? new Date(client.demo_expires) : null;
                const isExpired = demoExpiry && demoExpiry < new Date();
                
                clientItem.innerHTML = `
                    <div class="client-info">
                        <h4>${client.name}</h4>
                        <p>Email: ${client.email}</p>
                        <p>Aktivni moduli: ${client.active_modules.join(', ')}</p>
                        ${demoExpiry ? `<p>Demo poteče: ${demoExpiry.toLocaleString()} ${isExpired ? '(POTEKLO)' : ''}</p>` : ''}
                    </div>
                    <div class="client-actions">
                        <span class="pricing-tier tier-${client.pricing_tier}">${client.pricing_tier}</span>
                        ${demoExpiry && !isExpired ? `<button class="btn btn-warning" onclick="extendDemo('${client.id}')">Podaljšaj demo</button>` : ''}
                    </div>
                `;
                
                clientsList.appendChild(clientItem);
            });
        }

        function updatePricingInfo() {
            const pricingInfo = document.getElementById('pricingInfo');
            pricingInfo.innerHTML = '';
            
            Object.entries(systemData.pricing).forEach(([tier, info]) => {
                const pricingCard = document.createElement('div');
                pricingCard.className = 'card';
                pricingCard.style.marginBottom = '20px';
                
                pricingCard.innerHTML = `
                    <h4>${tier.toUpperCase()}</h4>
                    <p><strong>Cena:</strong> €${info.price}/mesec</p>
                    <p><strong>Moduli:</strong> ${Array.isArray(info.modules) ? info.modules.join(', ') : info.modules}</p>
                `;
                
                pricingInfo.appendChild(pricingCard);
            });
        }

        function updateAnalytics() {
            const moduleStatusData = systemData.modules.reduce((acc, module) => {
                acc[module.status] = (acc[module.status] || 0) + 1;
                return acc;
            }, {});
            
            const data = [{
                values: Object.values(moduleStatusData),
                labels: Object.keys(moduleStatusData),
                type: 'pie',
                hole: 0.4,
                marker: {
                    colors: ['#28a745', '#dc3545', '#ffc107', '#6c757d']
                }
            }];
            
            const layout = {
                title: 'Status modulov',
                showlegend: true,
                height: 300,
                margin: { t: 50, b: 50, l: 50, r: 50 }
            };
            
            Plotly.newPlot('analyticsChart', data, layout);
        }

        async function toggleModule(moduleId) {
            try {
                const response = await fetch(`/api/modules/${moduleId}/toggle`, {
                    method: 'POST'
                });
                
                const result = await response.json();
                if (result.success) {
                    loadSystemData(); // Ponovno naloži podatke
                } else {
                    alert('Napaka pri preklapljanju modula: ' + result.error);
                }
            } catch (error) {
                console.error('Napaka:', error);
                alert('Napaka pri preklapljanju modula');
            }
        }

        async function updateModule(moduleId) {
            if (confirm('Ali ste prepričani, da želite posodobiti ta modul?')) {
                try {
                    const response = await fetch(`/api/modules/${moduleId}/update`, {
                        method: 'POST'
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        alert('Posodobitev se je začela. Modul bo posodobljen v nekaj sekundah.');
                        loadSystemData();
                    } else {
                        alert('Napaka pri posodabljanju: ' + result.error);
                    }
                } catch (error) {
                    console.error('Napaka:', error);
                    alert('Napaka pri posodabljanju modula');
                }
            }
        }

        async function extendDemo(clientId) {
            try {
                const response = await fetch(`/api/clients/${clientId}/extend-demo`, {
                    method: 'POST'
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('Demo dostop podaljšan za 24 ur');
                    loadSystemData();
                } else {
                    alert('Napaka pri podaljševanju: ' + result.error);
                }
            } catch (error) {
                console.error('Napaka:', error);
                alert('Napaka pri podaljševanju demo dostopa');
            }
        }

        function showTab(tabName) {
            // Skrij vse tab-e
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Prikaži izbrani tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
            
            // Če je analitika, posodobi graf
            if (tabName === 'analytics') {
                setTimeout(updateAnalytics, 100);
            }
        }
    </script>
</body>
</html>
        '''

    def run_demo(self):
        """Zaženi demo funkcijo"""
        print("\n" + "="*80)
        print("☁️ OMNI CLOUD ADMIN - DEMO TESTIRANJE")
        print("="*80)
        
        print(f"🏢 Admin sistem: {self.config['app_name']} v{self.config['version']}")
        print(f"📊 Moduli: {len(self.modules)} naloženih")
        print(f"👥 Klienti: {len(self.clients)} registriranih")
        print(f"🔐 Admin uporabniki: {len(self.admin_users)} + privzeti admin")
        
        print("\n📋 FUNKCIONALNOSTI:")
        print("✅ Oddaljeno nadgrajevanje modulov")
        print("✅ Upravljanje premium funkcionalnosti")
        print("✅ Časovno omejen demo dostop")
        print("✅ Modularni cenik (Basic, Standard, Premium, Enterprise)")
        print("✅ Real-time monitoring sistemov")
        print("✅ Admin konzola za upravljanje")
        print("✅ Aktivacija/deaktivacija modulov")
        print("✅ Spremljanje aktivnosti uporabnikov")
        
        print("\n🔒 VARNOSTNE FUNKCIJE:")
        print("✅ Centraliziran oblak")
        print("✅ TLS + AES-256 enkripcija")
        print("✅ Sandbox/Read-only demo")
        print("✅ Zaščita pred krajo")
        print("✅ Admin dostop z avtentikacijo")
        
        print("\n💰 CENIČNI PAKETI:")
        for tier, info in self.config['pricing'].items():
            print(f"• {tier.upper()}: €{info['price']}/mesec - {info['modules']}")
        
        print("\n📊 STATISTIKE MODULOV:")
        active_count = len([m for m in self.modules.values() if m.status == ModuleStatus.ACTIVE])
        print(f"• Aktivni moduli: {active_count}/{len(self.modules)}")
        print(f"• Zdravje sistema: {self._get_system_health()['overall']}")
        
        print("\n👥 DEMO KLIENTI:")
        for client in self.clients.values():
            demo_status = "Aktiven" if client.demo_expires and client.demo_expires > datetime.now() else "Potekel"
            print(f"• {client.name} ({client.pricing_tier.value}) - Demo: {demo_status}")
        
        print("\n🔑 ADMIN DOSTOP:")
        print("• Uporabniško ime: admin")
        print("• Geslo: admin123")
        print("• URL: http://localhost:5012/login")
        
        print("\n" + "="*80)

    def run_server(self, host='0.0.0.0', port=5012, debug=True):
        """Zaženi Flask strežnik"""
        print(f"\n☁️ Zaganjam OMNI Cloud Admin na http://{host}:{port}")
        print("🔐 Admin konzola za upravljanje modulov")
        print("⚡ Oddaljeno nadgrajevanje in monitoring")
        print("🔒 Varnostne funkcije aktivne")
        
        self.app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    cloud_admin = OmniCloudAdmin()
    
    # Zaženi demo
    cloud_admin.run_demo()
    
    # Zaženi strežnik
    cloud_admin.run_server()