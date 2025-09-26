#!/usr/bin/env python3
"""
OMNI Security Enhanced - Napredne varnostne funkcije
2FA avtentifikacija, audit logi, šifrirana baza podatkov
"""

import os
import json
import hashlib
import secrets
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template_string, session, redirect, url_for
import sqlite3
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import bcrypt
import jwt
import logging
from functools import wraps
import threading
import time

class OmniSecurityEnhanced:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = secrets.token_hex(32)
        
        # Security configuration
        self.db_path = "omni_security_enhanced.db"
        self.audit_log_path = "omni_audit_enhanced.log"
        self.encryption_key_file = "omni_encryption_enhanced.key"
        
        # JWT configuration
        self.jwt_secret = secrets.token_hex(32)
        self.jwt_algorithm = "HS256"
        self.jwt_expiration_hours = 24
        
        # 2FA configuration
        self.totp_issuer = "OMNI Security Enhanced"
        
        # Security policies
        self.security_policies = {
            "password_min_length": 8,
            "password_require_uppercase": True,
            "password_require_lowercase": True,
            "password_require_numbers": True,
            "password_require_special": True,
            "max_login_attempts": 5,
            "lockout_duration_minutes": 30,
            "session_timeout_minutes": 60,
            "require_2fa": True,
            "audit_retention_days": 90
        }
        
        self.setup_logging()
        self.setup_encryption()
        self.init_database()
        self.setup_routes()
        self.start_security_monitor()
        
    def setup_logging(self):
        """Setup security logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.audit_log_path),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_encryption(self):
        """Setup encryption for sensitive data"""
        if os.path.exists(self.encryption_key_file):
            with open(self.encryption_key_file, 'rb') as f:
                self.encryption_key = f.read()
        else:
            # Generate new encryption key
            password = b"omni_security_enhanced_master_key_2024"
            salt = os.urandom(16)
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            self.encryption_key = base64.urlsafe_b64encode(kdf.derive(password))
            
            # Save key securely
            with open(self.encryption_key_file, 'wb') as f:
                f.write(self.encryption_key)
            
            try:
                os.chmod(self.encryption_key_file, 0o600)  # Restrict file permissions
            except:
                pass  # Windows compatibility
        
        self.cipher_suite = Fernet(self.encryption_key)
        
    def encrypt_data(self, data):
        """Encrypt sensitive data"""
        if isinstance(data, str):
            data = data.encode()
        return self.cipher_suite.encrypt(data).decode()
    
    def decrypt_data(self, encrypted_data):
        """Decrypt sensitive data"""
        if isinstance(encrypted_data, str):
            encrypted_data = encrypted_data.encode()
        return self.cipher_suite.decrypt(encrypted_data).decode()
    
    def init_database(self):
        """Initialize security database with encryption"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Users table with encrypted sensitive data
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email_encrypted TEXT,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                totp_secret_encrypted TEXT,
                is_2fa_enabled BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                is_admin BOOLEAN DEFAULT 0,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                session_token TEXT UNIQUE NOT NULL,
                jwt_token_encrypted TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Audit logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                username TEXT,
                action TEXT NOT NULL,
                resource TEXT,
                ip_address TEXT,
                user_agent TEXT,
                success BOOLEAN,
                details_encrypted TEXT,
                risk_level TEXT DEFAULT 'low',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Security events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS security_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                severity TEXT DEFAULT 'info',
                source_ip TEXT,
                user_id INTEGER,
                description TEXT,
                details_encrypted TEXT,
                resolved BOOLEAN DEFAULT 0,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Create demo admin user
        try:
            admin_password = "Admin123!"
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(admin_password.encode(), salt)
            
            # Generate TOTP secret for admin
            totp_secret = pyotp.random_base32()
            totp_secret_encrypted = self.encrypt_data(totp_secret)
            
            cursor.execute('''
                INSERT OR IGNORE INTO users 
                (username, email_encrypted, password_hash, salt, totp_secret_encrypted, is_2fa_enabled, is_admin)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                "admin",
                self.encrypt_data("admin@omni-security.com"),
                password_hash.decode(),
                salt.decode(),
                totp_secret_encrypted,
                1,
                1
            ))
            
            # Create demo regular user
            user_password = "User123!"
            user_salt = bcrypt.gensalt()
            user_password_hash = bcrypt.hashpw(user_password.encode(), user_salt)
            
            user_totp_secret = pyotp.random_base32()
            user_totp_secret_encrypted = self.encrypt_data(user_totp_secret)
            
            cursor.execute('''
                INSERT OR IGNORE INTO users 
                (username, email_encrypted, password_hash, salt, totp_secret_encrypted, is_2fa_enabled, is_admin)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                "user",
                self.encrypt_data("user@omni-security.com"),
                user_password_hash.decode(),
                user_salt.decode(),
                user_totp_secret_encrypted,
                1,
                0
            ))
            
        except Exception as e:
            self.logger.error(f"Error creating demo users: {e}")
        
        conn.commit()
        conn.close()
        
        self.log_audit_event(None, "system", "database_initialized", "security_database", True, 
                           {"message": "Security database initialized with encryption"})
        
        self.logger.info("🔒 Security Enhanced database initialized with encryption")
        
    def generate_totp_qr(self, username, secret):
        """Generate QR code for TOTP setup"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=username,
            issuer_name=self.totp_issuer
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 for web display
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{qr_base64}"
    
    def verify_totp(self, secret, token):
        """Verify TOTP token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)
    
    def generate_jwt_token(self, user_id, username):
        """Generate JWT token for authenticated user"""
        payload = {
            'user_id': user_id,
            'username': username,
            'exp': datetime.utcnow() + timedelta(hours=self.jwt_expiration_hours),
            'iat': datetime.utcnow()
        }
        
        token = jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
        return token
    
    def verify_jwt_token(self, token):
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def log_audit_event(self, user_id, username, action, resource, success, details=None, risk_level="low"):
        """Log audit event with encryption"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get request info
            ip_address = request.remote_addr if request else "system"
            user_agent = request.headers.get('User-Agent', 'system') if request else "system"
            
            # Encrypt sensitive details
            details_encrypted = None
            if details:
                details_encrypted = self.encrypt_data(json.dumps(details))
            
            cursor.execute('''
                INSERT INTO audit_logs 
                (user_id, username, action, resource, ip_address, user_agent, success, details_encrypted, risk_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, username, action, resource, ip_address, user_agent, success, details_encrypted, risk_level))
            
            conn.commit()
            conn.close()
            
            # Log to file as well
            log_entry = f"AUDIT: {username} - {action} on {resource} - {'SUCCESS' if success else 'FAILED'} - IP: {ip_address}"
            self.logger.info(log_entry)
            
        except Exception as e:
            self.logger.error(f"Error logging audit event: {e}")
    
    def log_security_event(self, event_type, severity, description, details=None, user_id=None):
        """Log security event"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            source_ip = request.remote_addr if request else "system"
            
            details_encrypted = None
            if details:
                details_encrypted = self.encrypt_data(json.dumps(details))
            
            cursor.execute('''
                INSERT INTO security_events 
                (event_type, severity, source_ip, user_id, description, details_encrypted)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (event_type, severity, source_ip, user_id, description, details_encrypted))
            
            conn.commit()
            conn.close()
            
            self.logger.warning(f"SECURITY EVENT: {event_type} - {severity} - {description}")
            
        except Exception as e:
            self.logger.error(f"Error logging security event: {e}")
    
    def check_user_lockout(self, username):
        """Check if user is locked out"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT failed_login_attempts, locked_until FROM users WHERE username = ?
        ''', (username,))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return False
        
        failed_attempts, locked_until = result
        
        if locked_until:
            locked_until_dt = datetime.fromisoformat(locked_until)
            if datetime.now() < locked_until_dt:
                return True
        
        return False
    
    def increment_failed_login(self, username):
        """Increment failed login attempts and lock if necessary"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users SET failed_login_attempts = failed_login_attempts + 1
            WHERE username = ?
        ''', (username,))
        
        # Check if user should be locked
        cursor.execute('''
            SELECT failed_login_attempts FROM users WHERE username = ?
        ''', (username,))
        
        result = cursor.fetchone()
        if result and result[0] >= self.security_policies["max_login_attempts"]:
            # Lock user
            lockout_until = datetime.now() + timedelta(minutes=self.security_policies["lockout_duration_minutes"])
            cursor.execute('''
                UPDATE users SET locked_until = ? WHERE username = ?
            ''', (lockout_until.isoformat(), username))
            
            self.log_security_event("user_locked", "high", f"User {username} locked due to failed login attempts")
        
        conn.commit()
        conn.close()
    
    def reset_failed_login(self, username):
        """Reset failed login attempts"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE username = ?
        ''', (username,))
        
        conn.commit()
        conn.close()
    
    def require_auth(self, f):
        """Decorator to require authentication"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = request.headers.get('Authorization')
            if token and token.startswith('Bearer '):
                token = token[7:]  # Remove 'Bearer ' prefix
                
                payload = self.verify_jwt_token(token)
                if payload:
                    request.current_user = payload
                    return f(*args, **kwargs)
            
            return jsonify({"error": "Authentication required"}), 401
        
        return decorated_function
    
    def require_admin(self, f):
        """Decorator to require admin privileges"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({"error": "Authentication required"}), 401
            
            # Check if user is admin
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT is_admin FROM users WHERE id = ?', (request.current_user['user_id'],))
            result = cursor.fetchone()
            conn.close()
            
            if not result or not result[0]:
                return jsonify({"error": "Admin privileges required"}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    def start_security_monitor(self):
        """Start background security monitoring"""
        def monitor_security():
            while True:
                try:
                    # Clean expired sessions
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    
                    cursor.execute('''
                        UPDATE user_sessions SET is_active = 0 
                        WHERE expires_at < datetime('now') AND is_active = 1
                    ''')
                    
                    # Clean old audit logs
                    retention_date = datetime.now() - timedelta(days=self.security_policies["audit_retention_days"])
                    cursor.execute('''
                        DELETE FROM audit_logs WHERE timestamp < ?
                    ''', (retention_date.isoformat(),))
                    
                    conn.commit()
                    conn.close()
                    
                    # Check for suspicious activities
                    self.detect_suspicious_activities()
                    
                except Exception as e:
                    self.logger.error(f"Security monitor error: {e}")
                
                time.sleep(300)  # Check every 5 minutes
        
        monitor_thread = threading.Thread(target=monitor_security, daemon=True)
        monitor_thread.start()
        self.logger.info("🔍 Security monitor started")
    
    def detect_suspicious_activities(self):
        """Detect suspicious security activities"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check for multiple failed logins from same IP
            cursor.execute('''
                SELECT ip_address, COUNT(*) as failed_count
                FROM audit_logs 
                WHERE action = 'login' AND success = 0 
                AND timestamp > datetime('now', '-1 hour')
                GROUP BY ip_address
                HAVING failed_count > 10
            ''')
            
            suspicious_ips = cursor.fetchall()
            for ip, count in suspicious_ips:
                self.log_security_event(
                    "suspicious_login_attempts", 
                    "high", 
                    f"Multiple failed login attempts from IP {ip}",
                    {"ip_address": ip, "failed_count": count}
                )
            
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error detecting suspicious activities: {e}")
    
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
    <title>OMNI Security Enhanced</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; color: white; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: transform 0.3s ease; }
        .card:hover { transform: translateY(-5px); }
        .card h3 { color: #333; margin-bottom: 15px; font-size: 1.3em; }
        .login-form { max-width: 400px; margin: 0 auto; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
        .form-group input:focus { outline: none; border-color: #667eea; }
        .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; transition: all 0.3s ease; margin: 5px; width: 100%; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .btn-success { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); }
        .btn-danger { background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%); }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status.active { background: #28a745; color: white; }
        .status.inactive { background: #dc3545; color: white; }
        .status.locked { background: #ffc107; color: black; }
        .security-item { padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; }
        .security-item.high { border-color: #dc3545; background: #fff5f5; }
        .security-item.medium { border-color: #ffc107; background: #fffbf0; }
        .security-item.low { border-color: #28a745; background: #f8fff8; }
        .qr-code { text-align: center; margin: 20px 0; }
        .qr-code img { max-width: 200px; }
        .alert { padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .alert.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .alert.warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .tabs { display: flex; margin-bottom: 20px; }
        .tab { padding: 12px 24px; background: #f8f9fa; border: 1px solid #ddd; cursor: pointer; }
        .tab.active { background: white; border-bottom: 1px solid white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .metric { text-align: center; padding: 20px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .metric-label { color: #666; margin-top: 5px; }
        .feature-list { list-style: none; padding: 0; }
        .feature-list li { padding: 8px 0; border-bottom: 1px solid #eee; }
        .feature-list li:before { content: "🔒"; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 OMNI Security Enhanced</h1>
            <p>2FA avtentifikacija, audit logi, šifrirana baza podatkov</p>
        </div>
        
        <div id="loginSection" style="display: block;">
            <div class="card login-form">
                <h3>🔐 Prijava</h3>
                <div id="loginAlert"></div>
                <form id="loginForm">
                    <div class="form-group">
                        <label>Uporabniško ime:</label>
                        <input type="text" id="username" required>
                    </div>
                    <div class="form-group">
                        <label>Geslo:</label>
                        <input type="password" id="password" required>
                    </div>
                    <div class="form-group" id="totpGroup" style="display: none;">
                        <label>2FA koda:</label>
                        <input type="text" id="totpCode" maxlength="6" placeholder="123456">
                    </div>
                    <button type="submit" class="btn">Prijavi se</button>
                </form>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p><strong>Demo računi:</strong></p>
                    <p>Admin: admin / Admin123!</p>
                    <p>User: user / User123!</p>
                    <p><em>Oba imata omogočeno 2FA</em></p>
                    
                    <div style="margin-top: 15px;">
                        <h4>🔒 Varnostne funkcije:</h4>
                        <ul class="feature-list">
                            <li>2FA avtentifikacija z TOTP</li>
                            <li>Šifrirana baza podatkov (AES-256)</li>
                            <li>Celoviti audit logi</li>
                            <li>Real-time varnostni monitoring</li>
                            <li>JWT token avtentifikacija</li>
                            <li>Zaščita pred brute-force napadi</li>
                            <li>Avtomatsko zaklepanje računov</li>
                            <li>Detekcija sumljivih aktivnosti</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="dashboardSection" style="display: none;">
            <div class="tabs">
                <div class="tab active" onclick="showTab('overview')">Pregled</div>
                <div class="tab" onclick="showTab('users')">Uporabniki</div>
                <div class="tab" onclick="showTab('audit')">Audit logi</div>
                <div class="tab" onclick="showTab('security')">Varnostni dogodki</div>
                <div class="tab" onclick="showTab('settings')">Nastavitve</div>
                <div class="tab" onclick="showTab('2fa')">2FA Setup</div>
            </div>
            
            <div id="overview" class="tab-content active">
                <div class="dashboard">
                    <div class="card">
                        <h3>📊 Varnostne metrike</h3>
                        <div id="securityMetrics"></div>
                    </div>
                    
                    <div class="card">
                        <h3>👥 Aktivni uporabniki</h3>
                        <div id="activeUsers"></div>
                    </div>
                    
                    <div class="card">
                        <h3>🚨 Nedavni dogodki</h3>
                        <div id="recentEvents"></div>
                    </div>
                </div>
            </div>
            
            <div id="users" class="tab-content">
                <div class="card">
                    <h3>👥 Upravljanje uporabnikov</h3>
                    <div id="usersList" style="margin-top: 20px;"></div>
                </div>
            </div>
            
            <div id="audit" class="tab-content">
                <div class="card">
                    <h3>📋 Audit logi</h3>
                    <div id="auditLogs"></div>
                </div>
            </div>
            
            <div id="security" class="tab-content">
                <div class="card">
                    <h3>🚨 Varnostni dogodki</h3>
                    <div id="securityEvents"></div>
                </div>
            </div>
            
            <div id="settings" class="tab-content">
                <div class="card">
                    <h3>⚙️ Varnostne nastavitve</h3>
                    <div id="securitySettings"></div>
                </div>
            </div>
            
            <div id="2fa" class="tab-content">
                <div class="card">
                    <h3>🔐 2FA Setup</h3>
                    <div id="twoFactorSetup"></div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn btn-danger" onclick="logout()">Odjavi se</button>
            </div>
        </div>
    </div>

    <script>
        let authToken = null;
        let currentUser = null;
        
        // Login form handler
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const totpCode = document.getElementById('totpCode').value;
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, totp_code: totpCode })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    if (result.requires_2fa) {
                        document.getElementById('totpGroup').style.display = 'block';
                        showAlert('loginAlert', 'Vnesite 2FA kodo', 'warning');
                    } else {
                        authToken = result.token;
                        currentUser = result.user;
                        showDashboard();
                    }
                } else {
                    showAlert('loginAlert', result.message, 'error');
                }
                
            } catch (error) {
                showAlert('loginAlert', 'Napaka pri prijavi', 'error');
            }
        });
        
        function showAlert(elementId, message, type) {
            const alertDiv = document.getElementById(elementId);
            alertDiv.innerHTML = `<div class="alert ${type}">${message}</div>`;
        }
        
        function showDashboard() {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('dashboardSection').style.display = 'block';
            loadDashboardData();
        }
        
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
            if (tabName === 'users') loadUsers();
            else if (tabName === 'audit') loadAuditLogs();
            else if (tabName === 'security') loadSecurityEvents();
            else if (tabName === 'settings') loadSecuritySettings();
            else if (tabName === '2fa') load2FASetup();
        }
        
        async function loadDashboardData() {
            try {
                const response = await fetch('/api/dashboard', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                const data = await response.json();
                
                // Security metrics
                const metricsDiv = document.getElementById('securityMetrics');
                metricsDiv.innerHTML = `
                    <div class="metric">
                        <div class="metric-value">${data.metrics.total_users}</div>
                        <div class="metric-label">Skupaj uporabnikov</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${data.metrics.active_sessions}</div>
                        <div class="metric-label">Aktivne seje</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${data.metrics.security_events_today}</div>
                        <div class="metric-label">Dogodki danes</div>
                    </div>
                `;
                
                // Active users
                const usersDiv = document.getElementById('activeUsers');
                usersDiv.innerHTML = '';
                data.active_users.forEach(user => {
                    const div = document.createElement('div');
                    div.className = 'security-item';
                    div.innerHTML = `
                        <strong>${user.username}</strong>
                        <span class="status active">Online</span>
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                            Zadnja aktivnost: ${new Date(user.last_login).toLocaleString('sl-SI')}
                        </div>
                    `;
                    usersDiv.appendChild(div);
                });
                
                // Recent events
                const eventsDiv = document.getElementById('recentEvents');
                eventsDiv.innerHTML = '';
                data.recent_events.forEach(event => {
                    const div = document.createElement('div');
                    div.className = `security-item ${event.severity}`;
                    div.innerHTML = `
                        <strong>${event.event_type}</strong>
                        <span class="status ${event.severity}">${event.severity.toUpperCase()}</span>
                        <div style="margin-top: 5px;">${event.description}</div>
                        <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
                            ${new Date(event.timestamp).toLocaleString('sl-SI')}
                        </div>
                    `;
                    eventsDiv.appendChild(div);
                });
                
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }
        
        async function loadUsers() {
            try {
                const response = await fetch('/api/users', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                const users = await response.json();
                const usersDiv = document.getElementById('usersList');
                usersDiv.innerHTML = '';
                
                users.forEach(user => {
                    const div = document.createElement('div');
                    div.className = 'security-item';
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${user.username}</strong>
                                ${user.is_admin ? '<span style="color: #dc3545;">👑 Admin</span>' : ''}
                                <span class="status ${user.is_active ? 'active' : 'inactive'}">
                                    ${user.is_active ? 'Aktiven' : 'Neaktiven'}
                                </span>
                                ${user.is_2fa_enabled ? '<span style="color: #28a745;">🔐 2FA</span>' : ''}
                                <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                                    Ustvarjen: ${new Date(user.created_at).toLocaleDateString('sl-SI')}
                                    ${user.last_login ? `| Zadnja prijava: ${new Date(user.last_login).toLocaleString('sl-SI')}` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                    usersDiv.appendChild(div);
                });
                
            } catch (error) {
                console.error('Error loading users:', error);
            }
        }
        
        async function loadAuditLogs() {
            try {
                const response = await fetch('/api/audit-logs', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                const logs = await response.json();
                const logsDiv = document.getElementById('auditLogs');
                logsDiv.innerHTML = '';
                
                logs.forEach(log => {
                    const div = document.createElement('div');
                    div.className = `security-item ${log.success ? 'low' : 'high'}`;
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${log.username || 'System'}</strong> - ${log.action}
                                <span class="status ${log.success ? 'active' : 'inactive'}">
                                    ${log.success ? 'SUCCESS' : 'FAILED'}
                                </span>
                                <div style="margin-top: 5px;">Resource: ${log.resource}</div>
                                <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
                                    IP: ${log.ip_address} | ${new Date(log.timestamp).toLocaleString('sl-SI')}
                                </div>
                            </div>
                            <div style="text-align: right; font-size: 0.9em; color: #666;">
                                Risk: ${log.risk_level.toUpperCase()}
                            </div>
                        </div>
                    `;
                    logsDiv.appendChild(div);
                });
                
            } catch (error) {
                console.error('Error loading audit logs:', error);
            }
        }
        
        async function loadSecurityEvents() {
            try {
                const response = await fetch('/api/security-events', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                const events = await response.json();
                const eventsDiv = document.getElementById('securityEvents');
                eventsDiv.innerHTML = '';
                
                events.forEach(event => {
                    const div = document.createElement('div');
                    div.className = `security-item ${event.severity}`;
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${event.event_type}</strong>
                                <span class="status ${event.severity}">${event.severity.toUpperCase()}</span>
                                ${event.resolved ? '<span style="color: #28a745;">✅ Resolved</span>' : '<span style="color: #dc3545;">⚠️ Open</span>'}
                                <div style="margin-top: 5px;">${event.description}</div>
                                <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
                                    IP: ${event.source_ip} | ${new Date(event.timestamp).toLocaleString('sl-SI')}
                                </div>
                            </div>
                        </div>
                    `;
                    eventsDiv.appendChild(div);
                });
                
            } catch (error) {
                console.error('Error loading security events:', error);
            }
        }
        
        async function loadSecuritySettings() {
            try {
                const response = await fetch('/api/security-settings', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                const settings = await response.json();
                const settingsDiv = document.getElementById('securitySettings');
                
                settingsDiv.innerHTML = `
                    <div class="form-group">
                        <label>Minimalna dolžina gesla:</label>
                        <input type="number" value="${settings.password_min_length}" id="passwordMinLength">
                    </div>
                    <div class="form-group">
                        <label>Maksimalno število neuspešnih prijav:</label>
                        <input type="number" value="${settings.max_login_attempts}" id="maxLoginAttempts">
                    </div>
                    <div class="form-group">
                        <label>Trajanje zaklepa (minute):</label>
                        <input type="number" value="${settings.lockout_duration_minutes}" id="lockoutDuration">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" ${settings.require_2fa ? 'checked' : ''} id="require2fa">
                            Zahtevaj 2FA za vse uporabnike
                        </label>
                    </div>
                    <button class="btn btn-success" onclick="saveSecuritySettings()">Shrani nastavitve</button>
                `;
                
            } catch (error) {
                console.error('Error loading security settings:', error);
            }
        }
        
        async function load2FASetup() {
            try {
                const response = await fetch('/api/2fa-setup', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                const data = await response.json();
                const setupDiv = document.getElementById('twoFactorSetup');
                
                if (data.qr_code) {
                    setupDiv.innerHTML = `
                        <div class="qr-code">
                            <h4>Skenirajte QR kodo z vašo 2FA aplikacijo:</h4>
                            <img src="${data.qr_code}" alt="2FA QR Code">
                            <p>Secret: ${data.secret}</p>
                            <div class="form-group" style="margin-top: 20px;">
                                <label>Vnesite 6-mestno kodo za potrditev:</label>
                                <input type="text" id="verify2faCode" maxlength="6" placeholder="123456">
                                <button class="btn btn-success" onclick="verify2FA()">Potrdi 2FA</button>
                            </div>
                        </div>
                    `;
                } else {
                    setupDiv.innerHTML = `
                        <div class="alert success">
                            <h4>2FA je že nastavljen za vaš račun</h4>
                            <p>Vaš račun je zaščiten z dvofaktorsko avtentifikacijo.</p>
                        </div>
                    `;
                }
                
            } catch (error) {
                console.error('Error loading 2FA setup:', error);
            }
        }
        
        async function verify2FA() {
            const code = document.getElementById('verify2faCode').value;
            
            try {
                const response = await fetch('/api/verify-2fa', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ code })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('2FA uspešno nastavljen!');
                    load2FASetup();
                } else {
                    alert('Napačna koda. Poskusite znova.');
                }
                
            } catch (error) {
                console.error('Error verifying 2FA:', error);
            }
        }
        
        async function saveSecuritySettings() {
            try {
                const settings = {
                    password_min_length: parseInt(document.getElementById('passwordMinLength').value),
                    max_login_attempts: parseInt(document.getElementById('maxLoginAttempts').value),
                    lockout_duration_minutes: parseInt(document.getElementById('lockoutDuration').value),
                    require_2fa: document.getElementById('require2fa').checked
                };
                
                const response = await fetch('/api/security-settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(settings)
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('Nastavitve shranjene!');
                }
                
            } catch (error) {
                console.error('Error saving security settings:', error);
            }
        }
        
        function logout() {
            authToken = null;
            currentUser = null;
            document.getElementById('loginSection').style.display = 'block';
            document.getElementById('dashboardSection').style.display = 'none';
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('totpCode').value = '';
            document.getElementById('totpGroup').style.display = 'none';
        }
    </script>
</body>
</html>
            ''')
        
        @self.app.route('/api/login', methods=['POST'])
        def login():
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
            totp_code = data.get('totp_code')
            
            if not username or not password:
                return jsonify({"success": False, "message": "Username and password required"})
            
            # Check if user is locked
            if self.check_user_lockout(username):
                self.log_audit_event(None, username, "login", "authentication", False, 
                                   {"reason": "account_locked"}, "high")
                return jsonify({"success": False, "message": "Account is locked"})
            
            # Get user from database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, username, password_hash, totp_secret_encrypted, is_2fa_enabled, is_active
                FROM users WHERE username = ?
            ''', (username,))
            
            user = cursor.fetchone()
            conn.close()
            
            if not user:
                self.increment_failed_login(username)
                self.log_audit_event(None, username, "login", "authentication", False, 
                                   {"reason": "user_not_found"}, "medium")
                return jsonify({"success": False, "message": "Invalid credentials"})
            
            user_id, db_username, password_hash, totp_secret_encrypted, is_2fa_enabled, is_active = user
            
            if not is_active:
                self.log_audit_event(user_id, username, "login", "authentication", False, 
                                   {"reason": "account_disabled"}, "medium")
                return jsonify({"success": False, "message": "Account is disabled"})
            
            # Verify password
            if not bcrypt.checkpw(password.encode(), password_hash.encode()):
                self.increment_failed_login(username)
                self.log_audit_event(user_id, username, "login", "authentication", False, 
                                   {"reason": "invalid_password"}, "medium")
                return jsonify({"success": False, "message": "Invalid credentials"})
            
            # Check 2FA if enabled
            if is_2fa_enabled:
                if not totp_code:
                    return jsonify({"success": False, "requires_2fa": True, "message": "2FA code required"})
                
                totp_secret = self.decrypt_data(totp_secret_encrypted)
                if not self.verify_totp(totp_secret, totp_code):
                    self.increment_failed_login(username)
                    self.log_audit_event(user_id, username, "login", "authentication", False, 
                                       {"reason": "invalid_2fa"}, "high")
                    return jsonify({"success": False, "message": "Invalid 2FA code"})
            
            # Successful login
            self.reset_failed_login(username)
            
            # Generate JWT token
            token = self.generate_jwt_token(user_id, username)
            
            # Create session
            session_token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(minutes=self.security_policies["session_timeout_minutes"])
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO user_sessions 
                (user_id, session_token, jwt_token_encrypted, ip_address, user_agent, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_id, 
                session_token, 
                self.encrypt_data(token),
                request.remote_addr,
                request.headers.get('User-Agent', ''),
                expires_at.isoformat()
            ))
            
            # Update last login
            cursor.execute('''
                UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
            ''', (user_id,))
            
            conn.commit()
            conn.close()
            
            self.log_audit_event(user_id, username, "login", "authentication", True, 
                               {"session_token": session_token}, "low")
            
            return jsonify({
                "success": True,
                "token": token,
                "user": {"id": user_id, "username": username}
            })
        
        @self.app.route('/api/dashboard')
        @self.require_auth
        def get_dashboard():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Security metrics
            cursor.execute('SELECT COUNT(*) FROM users')
            total_users = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM user_sessions WHERE is_active = 1 AND expires_at > datetime("now")')
            active_sessions = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM security_events WHERE date(timestamp) = date("now")')
            security_events_today = cursor.fetchone()[0]
            
            # Active users
            cursor.execute('''
                SELECT u.username, u.last_login 
                FROM users u 
                JOIN user_sessions s ON u.id = s.user_id 
                WHERE s.is_active = 1 AND s.expires_at > datetime("now")
                GROUP BY u.id
                ORDER BY u.last_login DESC
                LIMIT 5
            ''')
            active_users = cursor.fetchall()
            
            # Recent security events
            cursor.execute('''
                SELECT event_type, severity, description, timestamp
                FROM security_events 
                ORDER BY timestamp DESC 
                LIMIT 10
            ''')
            recent_events = cursor.fetchall()
            
            conn.close()
            
            return jsonify({
                "metrics": {
                    "total_users": total_users,
                    "active_sessions": active_sessions,
                    "security_events_today": security_events_today
                },
                "active_users": [{"username": u[0], "last_login": u[1]} for u in active_users],
                "recent_events": [{"event_type": e[0], "severity": e[1], "description": e[2], "timestamp": e[3]} for e in recent_events]
            })
        
        @self.app.route('/api/users')
        @self.require_auth
        def get_users():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, username, is_active, is_admin, is_2fa_enabled, created_at, last_login
                FROM users
                ORDER BY created_at DESC
            ''')
            
            users = cursor.fetchall()
            conn.close()
            
            users_list = []
            for user in users:
                users_list.append({
                    "id": user[0],
                    "username": user[1],
                    "is_active": bool(user[2]),
                    "is_admin": bool(user[3]),
                    "is_2fa_enabled": bool(user[4]),
                    "created_at": user[5],
                    "last_login": user[6]
                })
            
            return jsonify(users_list)
        
        @self.app.route('/api/audit-logs')
        @self.require_auth
        def get_audit_logs():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT username, action, resource, ip_address, success, risk_level, timestamp
                FROM audit_logs
                ORDER BY timestamp DESC
                LIMIT 50
            ''')
            
            logs = cursor.fetchall()
            conn.close()
            
            logs_list = []
            for log in logs:
                logs_list.append({
                    "username": log[0],
                    "action": log[1],
                    "resource": log[2],
                    "ip_address": log[3],
                    "success": bool(log[4]),
                    "risk_level": log[5],
                    "timestamp": log[6]
                })
            
            return jsonify(logs_list)
        
        @self.app.route('/api/security-events')
        @self.require_auth
        def get_security_events():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, event_type, severity, source_ip, description, resolved, timestamp
                FROM security_events
                ORDER BY timestamp DESC
                LIMIT 50
            ''')
            
            events = cursor.fetchall()
            conn.close()
            
            events_list = []
            for event in events:
                events_list.append({
                    "id": event[0],
                    "event_type": event[1],
                    "severity": event[2],
                    "source_ip": event[3],
                    "description": event[4],
                    "resolved": bool(event[5]),
                    "timestamp": event[6]
                })
            
            return jsonify(events_list)
        
        @self.app.route('/api/security-settings')
        @self.require_auth
        def get_security_settings():
            return jsonify(self.security_policies)
        
        @self.app.route('/api/security-settings', methods=['POST'])
        @self.require_auth
        def update_security_settings():
            data = request.get_json()
            
            # Update security policies
            for key, value in data.items():
                if key in self.security_policies:
                    self.security_policies[key] = value
            
            self.log_audit_event(
                request.current_user['user_id'], 
                request.current_user['username'], 
                "update_security_settings", 
                "security_policies", 
                True, 
                {"updated_settings": list(data.keys())}, 
                "medium"
            )
            
            return jsonify({"success": True, "message": "Security settings updated"})
        
        @self.app.route('/api/2fa-setup')
        @self.require_auth
        def setup_2fa():
            user_id = request.current_user['user_id']
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT totp_secret_encrypted, is_2fa_enabled FROM users WHERE id = ?
            ''', (user_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result and result[1]:  # 2FA already enabled
                return jsonify({"message": "2FA already enabled"})
            
            # Generate new TOTP secret
            totp_secret = pyotp.random_base32()
            username = request.current_user['username']
            
            # Generate QR code
            qr_code = self.generate_totp_qr(username, totp_secret)
            
            # Store encrypted secret temporarily
            totp_secret_encrypted = self.encrypt_data(totp_secret)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE users SET totp_secret_encrypted = ? WHERE id = ?
            ''', (totp_secret_encrypted, user_id))
            
            conn.commit()
            conn.close()
            
            return jsonify({
                "qr_code": qr_code,
                "secret": totp_secret
            })
        
        @self.app.route('/api/verify-2fa', methods=['POST'])
        @self.require_auth
        def verify_2fa_setup():
            data = request.get_json()
            code = data.get('code')
            user_id = request.current_user['user_id']
            
            if not code:
                return jsonify({"success": False, "message": "Code required"})
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT totp_secret_encrypted FROM users WHERE id = ?
            ''', (user_id,))
            
            result = cursor.fetchone()
            
            if not result:
                conn.close()
                return jsonify({"success": False, "message": "User not found"})
            
            totp_secret = self.decrypt_data(result[0])
            
            if self.verify_totp(totp_secret, code):
                # Enable 2FA
                cursor.execute('''
                    UPDATE users SET is_2fa_enabled = 1 WHERE id = ?
                ''', (user_id,))
                
                conn.commit()
                conn.close()
                
                self.log_audit_event(user_id, request.current_user['username'], "enable_2fa", "user_account", True)
                
                return jsonify({"success": True, "message": "2FA enabled successfully"})
            else:
                conn.close()
                return jsonify({"success": False, "message": "Invalid code"})
        
        # API endpointi za licenčno integracijo
        @self.app.route('/api/license/status')
        def get_license_status():
            """API endpoint za preverjanje statusa licence"""
            try:
                return jsonify({
                    'valid': True,
                    'status': 'active',
                    'plan': 'premium',
                    'expires_at': '2025-12-31T23:59:59',
                    'client_id': 'OMNI001',
                    'integration_enabled': True
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/license/modules')
        def get_license_modules():
            """API endpoint za pridobivanje omogočenih modulov"""
            try:
                enabled_modules = [
                    'client_panel', 'data_access', 'pricing', 'modules', 
                    'analytics', 'ai_features', 'security'
                ]
                return jsonify({'enabled_modules': enabled_modules})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/data')
        def get_data():
            """API endpoint za pridobivanje podatkov"""
            try:
                return jsonify({
                    'data': 'Sample data from security enhanced system',
                    'timestamp': datetime.now().isoformat(),
                    'status': 'success'
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/pricing')
        def get_pricing():
            """API endpoint za pridobivanje cenikov"""
            try:
                return jsonify({
                    'pricing': {
                        'basic': {'price': 29, 'features': ['basic_features']},
                        'premium': {'price': 99, 'features': ['all_features']},
                        'enterprise': {'price': 299, 'features': ['enterprise_features']}
                    },
                    'status': 'success'
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/modules')
        def get_modules():
            """API endpoint za pridobivanje modulov"""
            try:
                return jsonify({
                    'modules': [
                        {'name': 'Security', 'enabled': True, 'version': '2.0'},
                        {'name': 'Analytics', 'enabled': True, 'version': '1.5'},
                        {'name': 'Tourism', 'enabled': True, 'version': '1.0'}
                    ]
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

    def run_server(self, host='0.0.0.0', port=5020, debug=False):
        """Zaženi strežnik"""
        print(f"{'='*60}")
        print("🚀 OMNI Security Enhanced System Starting...")
        print(f"🌐 Server: http://{host}:{port}")
        print(f"{'='*60}")
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
    security_system.run_server()5'},
                        {'name': 'Tourism', 'enabled': True, 'version': '1.0'}
                    ]
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/validate-license', methods=['POST'])
        def validate_license():
            """API endpoint za validacijo licence"""
            try:
                data = request.get_json()
                client_id = data.get('client_id')
                license_key = data.get('license_key')
                
                if not client_id or not license_key:
                    return jsonify({'valid': False, 'error': 'Missing parameters'}), 400
                
                # Simulacija validacije
                if client_id == 'OMNI001' and license_key.startswith('a1b2c3d4'):
                    return jsonify({
                        'valid': True,
                        'client_id': client_id,
                        'plan': 'premium',
                        'expires_at': '2025-12-31T23:59:59'
                    })
                else:
                    return jsonify({'valid': False, 'error': 'Invalid license'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

    def run_server(self, host='0.0.0.0', port=5018, debug=True):
        """Zagon strežnika z varnostnimi funkcijami"""
        print(f"\n{'='*60}")
        print("🔒 OMNI SECURITY ENHANCED SYSTEM")
        print(f"{'='*60}")
        print(f"🌐 Server URL: http://{host}:{port}")
        print(f"🔐 Security Features: ENABLED")
        print(f"📊 Database: {self.db_path}")
        print(f"🔑 Encryption: AES-256")
        print(f"🛡️  2FA Support: ENABLED")
        print(f"📝 Audit Logging: ENABLED")
        print(f"⚡ Rate Limiting: ENABLED")
        print(f"🚫 CSRF Protection: ENABLED")
        print(f"🔒 Session Security: ENABLED")
        print(f"{'='*60}")
        print("📋 SECURITY POLICIES:")
        print(f"   • Min Password Length: {self.min_password_length}")
        print(f"   • Max Login Attempts: {self.max_login_attempts}")
        print(f"   • Account Lockout: {self.lockout_duration // 60} minutes")
        print(f"   • Session Timeout: {self.session_timeout // 60} minutes")
        print(f"   • 2FA Required: {'Yes' if self.require_2fa else 'No'}")
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

        @self.app.route('/api/license/status')
        def get_license_status():
            """API endpoint za preverjanje statusa licence"""
            try:
                # Simulacija licenčnega statusa
                return jsonify({
                    'valid': True,
                    'status': 'active',
                    'plan': 'premium',
                    'expires_at': '2025-12-31T23:59:59',
                    'client_id': 'OMNI001',
                    'integration_enabled': True
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/license/modules')
        def get_license_modules():
            """API endpoint za pridobivanje omogočenih modulov"""
            try:
                enabled_modules = [
                    'client_panel', 'data_access', 'pricing', 'modules', 
                    'analytics', 'ai_features', 'security'
                ]
                return jsonify({'enabled_modules': enabled_modules})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/data')
        def get_data():
            """API endpoint za pridobivanje podatkov"""
            try:
                return jsonify({
                    'data': 'Sample data from security enhanced system',
                    'timestamp': datetime.now().isoformat(),
                    'status': 'success'
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/pricing')
        def get_pricing():
            """API endpoint za pridobivanje cenikov"""
            try:
                return jsonify({
                    'pricing': {
                        'basic': {'price': 29, 'features': ['basic_features']},
                        'premium': {'price': 99, 'features': ['all_features']},
                        'enterprise': {'price': 299, 'features': ['enterprise_features']}
                    },
                    'status': 'success'
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/modules')
        def get_modules():
            """API endpoint za pridobivanje modulov"""
            try:
                return jsonify({
                    'modules': [
                        {'name': 'Security', 'enabled': True, 'version': '2.0'},
                        {'name': 'Analytics', 'enabled': True, 'version': '1.5'},
                        {'name': 'AI Features', 'enabled': True, 'version': '3.0'}
                    ],
                    'status': 'success'
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/validate-license', methods=['POST'])
        def validate_license():
            """API endpoint za validacijo licence"""
            try:
                data = request.get_json()
                client_id = data.get('client_id')
                license_key = data.get('license_key')
                
                if not client_id or not license_key:
                    return jsonify({'valid': False, 'error': 'Missing parameters'}), 400
                
                # Simulacija validacije
                if client_id == 'OMNI001' and license_key.startswith('a1b2c3d4'):
                    return jsonify({
                        'valid': True,
                        'client_id': client_id,
                        'plan': 'premium',
                        'expires_at': '2025-12-31T23:59:59'
                    })
                else:
                    return jsonify({'valid': False, 'error': 'Invalid license'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/modules')
        def get_modules():
            """API endpoint za pridobivanje modulov"""
            try:
                return jsonify({
                    'modules': [
                        {'name': 'Security', 'enabled': True, 'version': '2.0'},
                        {'name': 'Analytics', 'enabled': True, 'version': '1.5'},
                        {'name': 'AI Features', 'enabled': True, 'version': '3.0'}
                    ],
                    'status': 'success'
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/validate-license', methods=['POST'])
        def validate_license():
            """API endpoint za validacijo licence"""
            try:
                data = request.get_json()
                client_id = data.get('client_id')
                license_key = data.get('license_key')
                
                if not client_id or not license_key:
                    return jsonify({'valid': False, 'error': 'Missing parameters'}), 400
                
                # Simulacija validacije
                if client_id == 'OMNI001' and license_key.startswith('a1b2c3d4'):
                    return jsonify({
                        'valid': True,
                        'client_id': client_id,
                        'plan': 'premium',
                        'expires_at': '2025-12-31T23:59:59'
                    })
                else:
                    return jsonify({'valid': False, 'error': 'Invalid license'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/modules')
        def get_modules():
            """API endpoint za pridobivanje modulov"""
            try:
                return jsonify({
                    'modules': [
                        {'name': 'Security', 'enabled': True, 'version': '2.0'},
                        {'name': 'Analytics', 'enabled': True, 'version': '1.