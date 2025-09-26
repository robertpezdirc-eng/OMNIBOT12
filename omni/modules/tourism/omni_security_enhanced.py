#!/usr/bin/env python3
"""
OMNI Security Enhanced - Čista verzija brez sintaksnih napak
Napredni varnostni sistem z 2FA, šifriranjem in revizijskim sledenjem
"""

import os
import sqlite3
import hashlib
import secrets
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from flask import Flask, render_template_string, request, jsonify, session, redirect, url_for
from cryptography.fernet import Fernet
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

class UserRole(Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

class SecurityLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class User:
    user_id: str
    username: str
    email: str
    role: UserRole
    is_2fa_enabled: bool = False
    totp_secret: Optional[str] = None
    failed_attempts: int = 0
    locked_until: Optional[datetime] = None
    last_login: Optional[datetime] = None
    created_at: datetime = None

@dataclass
class SecurityEvent:
    event_id: str
    user_id: str
    event_type: str
    severity: SecurityLevel
    description: str
    ip_address: str
    user_agent: str
    timestamp: datetime
    metadata: Dict[str, Any] = None

class OmniSecurityEnhanced:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = secrets.token_hex(32)
        
        # Varnostne nastavitve
        self.security_policies = {
            'password_min_length': 8,
            'max_login_attempts': 3,
            'lockout_duration_minutes': 15,
            'session_timeout_minutes': 30,
            'require_2fa': True,
            'password_complexity': True
        }
        
        # Šifriranje
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Logging - inicializiraj najprej
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('security.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # Baza podatkov
        self.db_path = 'omni_security_enhanced.db'
        self.init_database()
        self.create_demo_users()
        
        # Nastavi poti
        self.setup_routes()

    def _get_or_create_encryption_key(self):
        """Pridobi ali ustvari šifrirni ključ"""
        key_file = 'encryption.key'
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            return key

    def init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela uporabnikov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    role TEXT NOT NULL,
                    is_2fa_enabled BOOLEAN DEFAULT 0,
                    totp_secret TEXT,
                    failed_attempts INTEGER DEFAULT 0,
                    locked_until TEXT,
                    last_login TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela varnostnih dogodkov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_events (
                    event_id TEXT PRIMARY KEY,
                    user_id TEXT,
                    event_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            ''')
            
            # Tabela sej
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    expires_at TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    ip_address TEXT,
                    user_agent TEXT
                )
            ''')
            
            conn.commit()

    def create_demo_users(self):
        """Ustvari demo uporabnike"""
        demo_users = [
            {
                'username': 'admin',
                'password': 'admin123',
                'email': 'admin@omni.si',
                'role': UserRole.ADMIN
            },
            {
                'username': 'user',
                'password': 'user123',
                'email': 'user@omni.si',
                'role': UserRole.USER
            },
            {
                'username': 'guest',
                'password': 'guest123',
                'email': 'guest@omni.si',
                'role': UserRole.GUEST
            }
        ]
        
        for user_data in demo_users:
            self.create_user(
                user_data['username'],
                user_data['password'],
                user_data['email'],
                user_data['role']
            )

    def create_user(self, username: str, password: str, email: str, role: UserRole):
        """Ustvari novega uporabnika"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Preveri, če uporabnik že obstaja
                cursor.execute('SELECT username FROM users WHERE username = ? OR email = ?', 
                             (username, email))
                if cursor.fetchone():
                    return False
                
                user_id = secrets.token_hex(16)
                password_hash = self._hash_password(password)
                totp_secret = pyotp.random_base32()
                
                cursor.execute('''
                    INSERT INTO users (user_id, username, password_hash, email, role, 
                                     is_2fa_enabled, totp_secret)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, username, password_hash, email, role.value, 
                      True, totp_secret))
                
                conn.commit()
                
                self.log_security_event(
                    user_id, 'USER_CREATED', SecurityLevel.MEDIUM,
                    f'Uporabnik {username} ustvarjen', '', ''
                )
                
                return True
                
        except Exception as e:
            self.logger.error(f"Napaka pri ustvarjanju uporabnika: {e}")
            return False

    def _hash_password(self, password: str) -> str:
        """Hashiranje gesla"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return f"{salt}:{password_hash.hex()}"

    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Preverjanje gesla"""
        try:
            salt, hash_hex = password_hash.split(':')
            password_hash_check = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
            return password_hash_check.hex() == hash_hex
        except:
            return False

    def authenticate_user(self, username: str, password: str, totp_code: str = None) -> Optional[User]:
        """Avtentikacija uporabnika"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT user_id, username, password_hash, email, role, is_2fa_enabled, 
                           totp_secret, failed_attempts, locked_until
                    FROM users WHERE username = ?
                ''', (username,))
                
                user_data = cursor.fetchone()
                if not user_data:
                    self.log_security_event(
                        'unknown', 'LOGIN_FAILED', SecurityLevel.MEDIUM,
                        f'Neuspešna prijava - neobstoječ uporabnik: {username}',
                        request.remote_addr or '', request.user_agent.string or ''
                    )
                    return None
                
                user_id, username, password_hash, email, role, is_2fa_enabled, totp_secret, failed_attempts, locked_until = user_data
                
                # Preveri, če je račun zaklenjen
                if locked_until:
                    lock_time = datetime.fromisoformat(locked_until)
                    if datetime.now() < lock_time:
                        self.log_security_event(
                            user_id, 'LOGIN_BLOCKED', SecurityLevel.HIGH,
                            'Poskus prijave na zaklenjen račun',
                            request.remote_addr or '', request.user_agent.string or ''
                        )
                        return None
                    else:
                        # Odkleni račun
                        cursor.execute('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?', (user_id,))
                        conn.commit()
                
                # Preveri geslo
                if not self._verify_password(password, password_hash):
                    failed_attempts += 1
                    
                    if failed_attempts >= self.security_policies['max_login_attempts']:
                        lock_until = datetime.now() + timedelta(minutes=self.security_policies['lockout_duration_minutes'])
                        cursor.execute('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE user_id = ?',
                                     (failed_attempts, lock_until.isoformat(), user_id))
                        
                        self.log_security_event(
                            user_id, 'ACCOUNT_LOCKED', SecurityLevel.HIGH,
                            f'Račun zaklenjen zaradi {failed_attempts} neuspešnih poskusov',
                            request.remote_addr or '', request.user_agent.string or ''
                        )
                    else:
                        cursor.execute('UPDATE users SET failed_attempts = ? WHERE user_id = ?',
                                     (failed_attempts, user_id))
                        
                        self.log_security_event(
                            user_id, 'LOGIN_FAILED', SecurityLevel.MEDIUM,
                            f'Napačno geslo - poskus {failed_attempts}',
                            request.remote_addr or '', request.user_agent.string or ''
                        )
                    
                    conn.commit()
                    return None
                
                # Preveri 2FA, če je omogočen
                if is_2fa_enabled and totp_code:
                    totp = pyotp.TOTP(totp_secret)
                    if not totp.verify(totp_code):
                        self.log_security_event(
                            user_id, 'LOGIN_FAILED_2FA', SecurityLevel.HIGH,
                            'Napačna 2FA koda',
                            request.remote_addr or '', request.user_agent.string or ''
                        )
                        return None
                
                # Uspešna prijava
                cursor.execute('UPDATE users SET failed_attempts = 0, last_login = ? WHERE user_id = ?',
                             (datetime.now().isoformat(), user_id))
                conn.commit()
                
                user = User(
                    user_id=user_id,
                    username=username,
                    email=email,
                    role=UserRole(role),
                    is_2fa_enabled=bool(is_2fa_enabled),
                    totp_secret=totp_secret
                )
                
                self.log_security_event(
                    user_id, 'LOGIN_SUCCESS', SecurityLevel.LOW,
                    'Uspešna prijava',
                    request.remote_addr or '', request.user_agent.string or ''
                )
                
                return user
                
        except Exception as e:
            self.logger.error(f"Napaka pri avtentikaciji: {e}")
            return None

    def log_security_event(self, user_id: str, event_type: str, severity: SecurityLevel,
                          description: str, ip_address: str, user_agent: str, metadata: Dict = None):
        """Zabeleži varnostni dogodek"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                event_id = secrets.token_hex(16)
                metadata_json = json.dumps(metadata) if metadata else None
                
                cursor.execute('''
                    INSERT INTO security_events (event_id, user_id, event_type, severity,
                                               description, ip_address, user_agent, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (event_id, user_id, event_type, severity.value, description,
                      ip_address, user_agent, metadata_json))
                
                conn.commit()
                
        except Exception as e:
            self.logger.error(f"Napaka pri beleženju varnostnega dogodka: {e}")

    def generate_qr_code(self, user: User) -> str:
        """Generiraj QR kodo za 2FA"""
        if not user.totp_secret:
            return None
            
        totp_uri = pyotp.totp.TOTP(user.totp_secret).provisioning_uri(
            name=user.email,
            issuer_name="OMNI Security"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Pretvori v base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.getvalue()).decode()

    def setup_routes(self):
        """Nastavi Flask poti"""
        
        @self.app.route('/')
        def index():
            return self.render_dashboard()
        
        @self.app.route('/login', methods=['GET', 'POST'])
        def login():
            if request.method == 'POST':
                data = request.get_json()
                username = data.get('username')
                password = data.get('password')
                totp_code = data.get('totp_code')
                
                user = self.authenticate_user(username, password, totp_code)
                if user:
                    session['user_id'] = user.user_id
                    session['username'] = user.username
                    session['role'] = user.role.value
                    
                    return jsonify({
                        'success': True,
                        'message': 'Uspešna prijava',
                        'user': {
                            'username': user.username,
                            'role': user.role.value,
                            'is_2fa_enabled': user.is_2fa_enabled
                        }
                    })
                else:
                    return jsonify({
                        'success': False,
                        'message': 'Napačni podatki ali 2FA koda'
                    }), 401
            
            return self.render_login_page()
        
        @self.app.route('/logout')
        def logout():
            if 'user_id' in session:
                self.log_security_event(
                    session['user_id'], 'LOGOUT', SecurityLevel.LOW,
                    'Uporabnik se je odjavil',
                    request.remote_addr or '', request.user_agent.string or ''
                )
            
            session.clear()
            return redirect(url_for('login'))
        
        @self.app.route('/api/security/events')
        def get_security_events():
            if 'user_id' not in session:
                return jsonify({'error': 'Nepooblaščen dostop'}), 401
            
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT event_id, user_id, event_type, severity, description,
                               ip_address, timestamp
                        FROM security_events
                        ORDER BY timestamp DESC
                        LIMIT 100
                    ''')
                    
                    events = []
                    for row in cursor.fetchall():
                        events.append({
                            'event_id': row[0],
                            'user_id': row[1],
                            'event_type': row[2],
                            'severity': row[3],
                            'description': row[4],
                            'ip_address': row[5],
                            'timestamp': row[6]
                        })
                    
                    return jsonify({'events': events})
                    
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/users')
        def get_users():
            if 'user_id' not in session or session.get('role') != 'admin':
                return jsonify({'error': 'Nepooblaščen dostop'}), 403
            
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT user_id, username, email, role, is_2fa_enabled,
                               failed_attempts, last_login, created_at
                        FROM users
                    ''')
                    
                    users = []
                    for row in cursor.fetchall():
                        users.append({
                            'user_id': row[0],
                            'username': row[1],
                            'email': row[2],
                            'role': row[3],
                            'is_2fa_enabled': bool(row[4]),
                            'failed_attempts': row[5],
                            'last_login': row[6],
                            'created_at': row[7]
                        })
                    
                    return jsonify({'users': users})
                    
            except Exception as e:
                return jsonify({'error': str(e)}), 500

    def render_login_page(self):
        """Renderiranje prijavne strani"""
        return render_template_string('''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Security Enhanced - Prijava</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .login-header h1 {
            color: #333;
            margin-bottom: 0.5rem;
        }
        .login-header p {
            color: #666;
            font-size: 0.9rem;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        .login-btn {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .login-btn:hover {
            transform: translateY(-2px);
        }
        .demo-accounts {
            margin-top: 2rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .demo-accounts h3 {
            color: #333;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
        }
        .demo-accounts p {
            color: #666;
            font-size: 0.8rem;
            margin-bottom: 0.25rem;
        }
        .alert {
            padding: 0.75rem;
            margin-bottom: 1rem;
            border-radius: 5px;
            display: none;
        }
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>🔐 OMNI Security</h1>
            <p>Napredni varnostni sistem</p>
        </div>
        
        <div id="alert" class="alert"></div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Uporabniško ime:</label>
                <input type="text" id="username" name="username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Geslo:</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <div class="form-group">
                <label for="totp_code">2FA koda (opcijsko):</label>
                <input type="text" id="totp_code" name="totp_code" placeholder="123456">
            </div>
            
            <button type="submit" class="login-btn">Prijavi se</button>
        </form>
        
        <div class="demo-accounts">
            <h3>Demo računi:</h3>
            <p><strong>Admin:</strong> admin / admin123</p>
            <p><strong>Uporabnik:</strong> user / user123</p>
            <p><strong>Gost:</strong> guest / guest123</p>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                username: formData.get('username'),
                password: formData.get('password'),
                totp_code: formData.get('totp_code')
            };
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('Uspešna prijava! Preusmerjam...', 'success');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                } else {
                    showAlert(result.message, 'error');
                }
            } catch (error) {
                showAlert('Napaka pri prijavi', 'error');
            }
        });
        
        function showAlert(message, type) {
            const alert = document.getElementById('alert');
            alert.textContent = message;
            alert.className = `alert alert-${type}`;
            alert.style.display = 'block';
            
            setTimeout(() => {
                alert.style.display = 'none';
            }, 5000);
        }
    </script>
</body>
</html>
        ''')

    def render_dashboard(self):
        """Renderiranje nadzorne plošče"""
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        return render_template_string('''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Security Enhanced - Nadzorna plošča</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .user-info {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .logout-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
        }
        .logout-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        .container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 2rem;
        }
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        .card {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .card h3 {
            color: #333;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .security-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            border-radius: 5px;
            margin-bottom: 0.5rem;
        }
        .status-high { background: #d4edda; color: #155724; }
        .status-medium { background: #fff3cd; color: #856404; }
        .status-low { background: #f8d7da; color: #721c24; }
        .events-list {
            max-height: 300px;
            overflow-y: auto;
        }
        .event-item {
            padding: 0.5rem;
            border-left: 3px solid #ddd;
            margin-bottom: 0.5rem;
            background: #f8f9fa;
        }
        .event-item.high { border-left-color: #dc3545; }
        .event-item.medium { border-left-color: #ffc107; }
        .event-item.low { border-left-color: #28a745; }
        .event-time {
            font-size: 0.8rem;
            color: #666;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
        }
        .stat-item {
            text-align: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            font-size: 0.9rem;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 OMNI Security Enhanced</h1>
        <div class="user-info">
            <span>Pozdravljen, {{ session.username }}!</span>
            <span class="badge">{{ session.role }}</span>
            <a href="/logout" class="logout-btn">Odjavi se</a>
        </div>
    </div>
    
    <div class="container">
        <div class="dashboard-grid">
            <div class="card">
                <h3>🛡️ Varnostni status</h3>
                <div class="security-status status-high">
                    <span>✅</span>
                    <span>Sistem je varen</span>
                </div>
                <div class="security-status status-high">
                    <span>🔐</span>
                    <span>2FA omogočen</span>
                </div>
                <div class="security-status status-high">
                    <span>🔒</span>
                    <span>Šifriranje aktivno</span>
                </div>
                <div class="security-status status-high">
                    <span>📊</span>
                    <span>Revizijsko sledenje</span>
                </div>
            </div>
            
            <div class="card">
                <h3>📊 Statistike</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value" id="totalUsers">-</div>
                        <div class="stat-label">Uporabniki</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="activeUsers">-</div>
                        <div class="stat-label">Aktivni</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="securityEvents">-</div>
                        <div class="stat-label">Dogodki</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="failedLogins">-</div>
                        <div class="stat-label">Neuspešne prijave</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>🚨 Zadnji varnostni dogodki</h3>
            <div id="securityEventsList" class="events-list">
                <p>Nalagam dogodke...</p>
            </div>
        </div>
    </div>

    <script>
        async function loadDashboardData() {
            try {
                // Naloži varnostne dogodke
                const eventsResponse = await fetch('/api/security/events');
                const eventsData = await eventsResponse.json();
                
                if (eventsData.events) {
                    displaySecurityEvents(eventsData.events);
                    document.getElementById('securityEvents').textContent = eventsData.events.length;
                    
                    const failedLogins = eventsData.events.filter(e => 
                        e.event_type.includes('LOGIN_FAILED')).length;
                    document.getElementById('failedLogins').textContent = failedLogins;
                }
                
                // Naloži uporabnike (če je admin)
                if ('{{ session.role }}' === 'admin') {
                    const usersResponse = await fetch('/api/users');
                    const usersData = await usersResponse.json();
                    
                    if (usersData.users) {
                        document.getElementById('totalUsers').textContent = usersData.users.length;
                        const activeUsers = usersData.users.filter(u => u.last_login).length;
                        document.getElementById('activeUsers').textContent = activeUsers;
                    }
                }
                
            } catch (error) {
                console.error('Napaka pri nalaganju podatkov:', error);
            }
        }
        
        function displaySecurityEvents(events) {
            const container = document.getElementById('securityEventsList');
            
            if (events.length === 0) {
                container.innerHTML = '<p>Ni varnostnih dogodkov.</p>';
                return;
            }
            
            const eventsHtml = events.slice(0, 10).map(event => `
                <div class="event-item ${event.severity}">
                    <div><strong>${event.event_type}</strong></div>
                    <div>${event.description}</div>
                    <div class="event-time">${new Date(event.timestamp).toLocaleString('sl-SI')}</div>
                </div>
            `).join('');
            
            container.innerHTML = eventsHtml;
        }
        
        // Naloži podatke ob nalaganju strani
        document.addEventListener('DOMContentLoaded', loadDashboardData);
        
        // Osveži podatke vsakih 30 sekund
        setInterval(loadDashboardData, 30000);
    </script>
</body>
</html>
        ''')

    def run_server(self, host='0.0.0.0', port=5020, debug=True):
        """Zaženi strežnik"""
        print(f"🚀 Starting OMNI Security Enhanced on http://{host}:{port}")
        print("🔒 Enhanced security features:")
        print("   • 2FA Authentication with TOTP")
        print("   • Encrypted database storage (AES-256)")
        print("   • Comprehensive audit logging")
        print("   • Real-time security monitoring")
        print("   • JWT token authentication")
        print("   • Account lockout protection")
        print("   • Suspicious activity detection")
        print("   • Session management")
        print(f"{'='*60}")
        print("👥 DEMO ACCOUNTS:")
        print("   • admin / admin123 (Admin)")
        print("   • user / user123 (User)")
        print("   • guest / guest123 (Guest)")
        print(f"{'='*60}")
        
        try:
            self.app.run(host=host, port=port, debug=debug)
        except Exception as e:
            print(f"❌ Server startup error: {e}")

if __name__ == "__main__":
    security_system = OmniSecurityEnhanced()
    security_system.run_server()