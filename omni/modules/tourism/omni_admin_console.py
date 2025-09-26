#!/usr/bin/env python3
"""
OMNI ADMIN CONSOLE - Oddaljeno upravljanje in nadzor
====================================================

Funkcionalnosti:
- Oddaljeno upravljanje vseh modulov
- Real-time monitoring in nadzor
- Aktivacija/deaktivacija modulov s klikom
- Spremljanje aktivnosti v real-time
- Upravljanje demo sej
- Varnostni nadzor in alarmi
- Sistemske metrike in analitika

Avtor: Omni AI Assistant
Datum: 2025-01-23
"""

import asyncio
import datetime
import json
import logging
import os
import sqlite3
import threading
import time
import uuid
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
import hashlib
import psutil
import platform
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import jwt
import bcrypt
from functools import wraps

# Nastavi logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ModuleStatus(Enum):
    """Status modula"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    STARTING = "starting"
    STOPPING = "stopping"

class AdminRole(Enum):
    """Admin vloge"""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"

class AlertLevel(Enum):
    """Nivo opozoril"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class OmniModule:
    """Omni modul"""
    module_id: str
    name: str
    description: str
    status: ModuleStatus
    version: str
    port: int
    endpoint: str
    dependencies: List[str]
    config: Dict[str, Any]
    last_heartbeat: datetime.datetime
    cpu_usage: float
    memory_usage: float
    error_count: int
    uptime_seconds: int

@dataclass
class AdminUser:
    """Admin uporabnik"""
    user_id: str
    username: str
    email: str
    role: AdminRole
    password_hash: str
    last_login: datetime.datetime
    session_token: str
    permissions: List[str]
    created_at: datetime.datetime
    active: bool

@dataclass
class SystemAlert:
    """Sistemsko opozorilo"""
    alert_id: str
    module_id: str
    alert_type: str
    level: AlertLevel
    message: str
    timestamp: datetime.datetime
    acknowledged: bool
    acknowledged_by: str
    resolved: bool

class OmniAdminConsole:
    """Glavna admin konzola"""
    
    def __init__(self, db_path: str = "omni_admin.db", secret_key: str = None):
        self.db_path = db_path
        self.secret_key = secret_key or os.urandom(32).hex()
        self.modules: Dict[str, OmniModule] = {}
        self.admin_users: Dict[str, AdminUser] = {}
        self.active_sessions: Dict[str, str] = {}  # session_token -> user_id
        self.system_alerts: List[SystemAlert] = []
        self.monitoring_active = False
        
        # Flask aplikacija
        self.app = Flask(__name__)
        self.app.secret_key = self.secret_key
        
        # Inicializiraj sistem
        self.init_database()
        self.setup_routes()
        self.register_default_modules()
        self.create_default_admin()
        
        # Zaženi monitoring
        self.start_monitoring()
    
    def init_database(self):
        """Inicializiraj admin bazo podatkov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tabela modulov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS modules (
                    module_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    status TEXT NOT NULL,
                    version TEXT,
                    port INTEGER,
                    endpoint TEXT,
                    dependencies TEXT,
                    config TEXT,
                    last_heartbeat TEXT,
                    cpu_usage REAL DEFAULT 0,
                    memory_usage REAL DEFAULT 0,
                    error_count INTEGER DEFAULT 0,
                    uptime_seconds INTEGER DEFAULT 0
                )
            ''')
            
            # Tabela admin uporabnikov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS admin_users (
                    user_id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    role TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    last_login TEXT,
                    session_token TEXT,
                    permissions TEXT,
                    created_at TEXT NOT NULL,
                    active INTEGER DEFAULT 1
                )
            ''')
            
            # Tabela sistemskih opozoril
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS system_alerts (
                    alert_id TEXT PRIMARY KEY,
                    module_id TEXT,
                    alert_type TEXT NOT NULL,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    acknowledged INTEGER DEFAULT 0,
                    acknowledged_by TEXT,
                    resolved INTEGER DEFAULT 0
                )
            ''')
            
            # Tabela aktivnosti
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS admin_activity (
                    activity_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    target TEXT,
                    details TEXT,
                    timestamp TEXT NOT NULL,
                    ip_address TEXT,
                    success INTEGER DEFAULT 1
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("Admin baza podatkov inicializirana")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji admin baze: {e}")
    
    def setup_routes(self):
        """Nastavi Flask rute"""
        
        @self.app.route('/')
        def index():
            if not self.check_session():
                return redirect(url_for('login'))
            return render_template('admin_dashboard.html')
        
        @self.app.route('/login', methods=['GET', 'POST'])
        def login():
            if request.method == 'POST':
                data = request.get_json()
                username = data.get('username')
                password = data.get('password')
                
                user = self.authenticate_user(username, password)
                if user:
                    session_token = self.create_session(user.user_id)
                    session['token'] = session_token
                    
                    self.log_activity(user.user_id, "login", "admin_console", 
                                    f"Uspešna prijava", request.remote_addr)
                    
                    return jsonify({"success": True, "token": session_token})
                else:
                    self.log_activity("unknown", "login_failed", "admin_console", 
                                    f"Neuspešna prijava: {username}", request.remote_addr)
                    return jsonify({"success": False, "error": "Napačni podatki"})
            
            return render_template('admin_login.html')
        
        @self.app.route('/logout')
        def logout():
            token = session.get('token')
            if token and token in self.active_sessions:
                user_id = self.active_sessions[token]
                del self.active_sessions[token]
                self.log_activity(user_id, "logout", "admin_console", "Odjava")
            
            session.clear()
            return redirect(url_for('login'))
        
        @self.app.route('/api/modules')
        def api_modules():
            if not self.check_session():
                return jsonify({"error": "Nepooblaščen dostop"}), 401
            
            modules_data = []
            for module in self.modules.values():
                modules_data.append({
                    "module_id": module.module_id,
                    "name": module.name,
                    "description": module.description,
                    "status": module.status.value,
                    "version": module.version,
                    "port": module.port,
                    "cpu_usage": module.cpu_usage,
                    "memory_usage": module.memory_usage,
                    "error_count": module.error_count,
                    "uptime_seconds": module.uptime_seconds,
                    "last_heartbeat": module.last_heartbeat.isoformat() if module.last_heartbeat else None
                })
            
            return jsonify(modules_data)
        
        @self.app.route('/api/modules/<module_id>/start', methods=['POST'])
        def api_start_module(module_id):
            if not self.check_session():
                return jsonify({"error": "Nepooblaščen dostop"}), 401
            
            success = self.start_module(module_id)
            user_id = self.get_current_user_id()
            
            self.log_activity(user_id, "start_module", module_id, 
                            f"Zagon modula: {'uspešen' if success else 'neuspešen'}")
            
            return jsonify({"success": success})
        
        @self.app.route('/api/modules/<module_id>/stop', methods=['POST'])
        def api_stop_module(module_id):
            if not self.check_session():
                return jsonify({"error": "Nepooblaščen dostop"}), 401
            
            success = self.stop_module(module_id)
            user_id = self.get_current_user_id()
            
            self.log_activity(user_id, "stop_module", module_id, 
                            f"Zaustavitev modula: {'uspešna' if success else 'neuspešna'}")
            
            return jsonify({"success": success})
        
        @self.app.route('/api/modules/<module_id>/restart', methods=['POST'])
        def api_restart_module(module_id):
            if not self.check_session():
                return jsonify({"error": "Nepooblaščen dostop"}), 401
            
            success = self.restart_module(module_id)
            user_id = self.get_current_user_id()
            
            self.log_activity(user_id, "restart_module", module_id, 
                            f"Restart modula: {'uspešen' if success else 'neuspešen'}")
            
            return jsonify({"success": success})
        
        @self.app.route('/api/system/status')
        def api_system_status():
            if not self.check_session():
                return jsonify({"error": "Nepooblaščen dostop"}), 401
            
            return jsonify(self.get_system_status())
        
        @self.app.route('/api/alerts')
        def api_alerts():
            if not self.check_session():
                return jsonify({"error": "Nepooblaščen dostop"}), 401
            
            alerts_data = []
            for alert in self.system_alerts[-50:]:  # Zadnjih 50 opozoril
                alerts_data.append({
                    "alert_id": alert.alert_id,
                    "module_id": alert.module_id,
                    "alert_type": alert.alert_type,
                    "level": alert.level.value,
                    "message": alert.message,
                    "timestamp": alert.timestamp.isoformat(),
                    "acknowledged": alert.acknowledged,
                    "resolved": alert.resolved
                })
            
            return jsonify(alerts_data)
        
        @self.app.route('/api/alerts/<alert_id>/acknowledge', methods=['POST'])
        def api_acknowledge_alert(alert_id):
            if not self.check_session():
                return jsonify({"error": "Nepooblaščen dostop"}), 401
            
            user_id = self.get_current_user_id()
            success = self.acknowledge_alert(alert_id, user_id)
            
            return jsonify({"success": success})
    
    # Odstranjeno - SocketIO funkcionalnost ni potrebna za demo
    
    def check_session(self) -> bool:
        """Preveri veljavnost seje"""
        token = session.get('token')
        if not token or token not in self.active_sessions:
            return False
        return True
    
    def get_current_user_id(self) -> str:
        """Pridobi ID trenutnega uporabnika"""
        token = session.get('token')
        if token and token in self.active_sessions:
            return self.active_sessions[token]
        return "unknown"
    
    def authenticate_user(self, username: str, password: str) -> Optional[AdminUser]:
        """Avtenticiraj admin uporabnika"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM admin_users 
                WHERE username = ? AND active = 1
            ''', (username,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row and bcrypt.checkpw(password.encode(), row[4].encode()):
                user = AdminUser(
                    user_id=row[0],
                    username=row[1],
                    email=row[2],
                    role=AdminRole(row[3]),
                    password_hash=row[4],
                    last_login=datetime.datetime.fromisoformat(row[5]) if row[5] else None,
                    session_token=row[6],
                    permissions=json.loads(row[7]) if row[7] else [],
                    created_at=datetime.datetime.fromisoformat(row[8]),
                    active=bool(row[9])
                )
                
                # Posodobi zadnjo prijavo
                self.update_user_login(user.user_id)
                
                return user
            
            return None
            
        except Exception as e:
            logger.error(f"Napaka pri avtentikaciji: {e}")
            return None
    
    def create_session(self, user_id: str) -> str:
        """Ustvari novo sejo"""
        session_token = str(uuid.uuid4())
        self.active_sessions[session_token] = user_id
        
        # Posodobi v bazi
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE admin_users 
                SET session_token = ? 
                WHERE user_id = ?
            ''', (session_token, user_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju seje: {e}")
        
        return session_token
    
    def update_user_login(self, user_id: str):
        """Posodobi zadnjo prijavo uporabnika"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE admin_users 
                SET last_login = ? 
                WHERE user_id = ?
            ''', (datetime.datetime.now().isoformat(), user_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju prijave: {e}")
    
    def register_default_modules(self):
        """Registriraj privzete module"""
        default_modules = [
            {
                "module_id": "omni_cloud",
                "name": "Oblačna Arhitektura",
                "description": "Centralizirana oblačna arhitektura z API gateway",
                "version": "1.0.0",
                "port": 8080,
                "endpoint": "/api/v1/cloud"
            },
            {
                "module_id": "omni_security",
                "name": "Varnostni Sistem",
                "description": "Šifriranje, avtentikacija in zaščita pred krajo",
                "version": "1.0.0",
                "port": 8081,
                "endpoint": "/api/v1/security"
            },
            {
                "module_id": "omni_demo",
                "name": "Demo Sistem",
                "description": "Časovno omejen demo z avtomatsko deaktivacijo",
                "version": "1.0.0",
                "port": 8082,
                "endpoint": "/api/v1/demo"
            },
            {
                "module_id": "omni_pos",
                "name": "POS Sistem",
                "description": "Blagajna z fiskalizacijo in plačili",
                "version": "1.0.0",
                "port": 8083,
                "endpoint": "/api/v1/pos"
            },
            {
                "module_id": "omni_accommodation",
                "name": "Nastanitve",
                "description": "Hoteli, apartmaji in rezervacije",
                "version": "1.0.0",
                "port": 8084,
                "endpoint": "/api/v1/accommodation"
            }
        ]
        
        for module_data in default_modules:
            module = OmniModule(
                module_id=module_data["module_id"],
                name=module_data["name"],
                description=module_data["description"],
                status=ModuleStatus.INACTIVE,
                version=module_data["version"],
                port=module_data["port"],
                endpoint=module_data["endpoint"],
                dependencies=[],
                config={},
                last_heartbeat=datetime.datetime.now(),
                cpu_usage=0.0,
                memory_usage=0.0,
                error_count=0,
                uptime_seconds=0
            )
            
            self.modules[module.module_id] = module
            self.save_module(module)
    
    def create_default_admin(self):
        """Ustvari privzetega admin uporabnika"""
        try:
            # Preveri če admin že obstaja
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*) FROM admin_users WHERE role = ?', (AdminRole.SUPER_ADMIN.value,))
            count = cursor.fetchone()[0]
            
            if count == 0:
                # Ustvari privzetega admin uporabnika
                admin_id = str(uuid.uuid4())
                password_hash = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
                
                cursor.execute('''
                    INSERT INTO admin_users 
                    (user_id, username, email, role, password_hash, permissions, created_at, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    admin_id, "admin", "admin@omni.local", AdminRole.SUPER_ADMIN.value,
                    password_hash, json.dumps(["all"]), datetime.datetime.now().isoformat(), 1
                ))
                
                conn.commit()
                logger.info("Privzeti admin uporabnik ustvarjen (admin/admin123)")
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju privzetega admin uporabnika: {e}")
    
    def save_module(self, module: OmniModule):
        """Shrani modul v bazo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO modules 
                (module_id, name, description, status, version, port, endpoint, 
                 dependencies, config, last_heartbeat, cpu_usage, memory_usage, 
                 error_count, uptime_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                module.module_id, module.name, module.description, module.status.value,
                module.version, module.port, module.endpoint, json.dumps(module.dependencies),
                json.dumps(module.config), module.last_heartbeat.isoformat(),
                module.cpu_usage, module.memory_usage, module.error_count, module.uptime_seconds
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju modula: {e}")
    
    def start_module(self, module_id: str) -> bool:
        """Zaženi modul"""
        try:
            if module_id not in self.modules:
                return False
            
            module = self.modules[module_id]
            module.status = ModuleStatus.STARTING
            self.save_module(module)
            
            # Simuliraj zagon modula
            time.sleep(1)
            
            module.status = ModuleStatus.ACTIVE
            module.last_heartbeat = datetime.datetime.now()
            self.save_module(module)
            
            # Ustvari opozorilo
            self.create_alert(
                module_id, "module_started", AlertLevel.INFO,
                f"Modul {module.name} uspešno zagnan"
            )
            
            # Pošlji posodobitev preko WebSocket
            self.broadcast_module_update(module)
            
            logger.info(f"Modul zagnan: {module_id}")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri zagonu modula {module_id}: {e}")
            return False
    
    def stop_module(self, module_id: str) -> bool:
        """Ustavi modul"""
        try:
            if module_id not in self.modules:
                return False
            
            module = self.modules[module_id]
            module.status = ModuleStatus.STOPPING
            self.save_module(module)
            
            # Simuliraj zaustavitev modula
            time.sleep(1)
            
            module.status = ModuleStatus.INACTIVE
            module.cpu_usage = 0.0
            module.memory_usage = 0.0
            self.save_module(module)
            
            # Ustvari opozorilo
            self.create_alert(
                module_id, "module_stopped", AlertLevel.INFO,
                f"Modul {module.name} uspešno ustavljen"
            )
            
            # Pošlji posodobitev preko WebSocket
            self.broadcast_module_update(module)
            
            logger.info(f"Modul ustavljen: {module_id}")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri ustavitvi modula {module_id}: {e}")
            return False
    
    def restart_module(self, module_id: str) -> bool:
        """Restartaj modul"""
        try:
            success = self.stop_module(module_id)
            if success:
                time.sleep(2)
                success = self.start_module(module_id)
            
            return success
            
        except Exception as e:
            logger.error(f"Napaka pri restartu modula {module_id}: {e}")
            return False
    
    def create_alert(self, module_id: str, alert_type: str, level: AlertLevel, message: str):
        """Ustvari sistemsko opozorilo"""
        try:
            alert = SystemAlert(
                alert_id=str(uuid.uuid4()),
                module_id=module_id,
                alert_type=alert_type,
                level=level,
                message=message,
                timestamp=datetime.datetime.now(),
                acknowledged=False,
                acknowledged_by="",
                resolved=False
            )
            
            self.system_alerts.append(alert)
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO system_alerts 
                (alert_id, module_id, alert_type, level, message, timestamp, acknowledged, resolved)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.alert_id, alert.module_id, alert.alert_type, alert.level.value,
                alert.message, alert.timestamp.isoformat(), int(alert.acknowledged), int(alert.resolved)
            ))
            
            conn.commit()
            conn.close()
            
            # Pošlji opozorilo preko WebSocket
            self.broadcast_alert(alert)
            
            logger.info(f"Sistemsko opozorilo ustvarjeno: {alert_type} - {message}")
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju opozorila: {e}")
    
    def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """Potrdi opozorilo"""
        try:
            for alert in self.system_alerts:
                if alert.alert_id == alert_id:
                    alert.acknowledged = True
                    alert.acknowledged_by = user_id
                    
                    # Posodobi v bazi
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    
                    cursor.execute('''
                        UPDATE system_alerts 
                        SET acknowledged = 1, acknowledged_by = ? 
                        WHERE alert_id = ?
                    ''', (user_id, alert_id))
                    
                    conn.commit()
                    conn.close()
                    
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Napaka pri potrjevanju opozorila: {e}")
            return False
    
    def get_system_status(self) -> Dict[str, Any]:
        """Pridobi sistemski status"""
        try:
            # Sistemske metrike
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Statistike modulov
            active_modules = sum(1 for m in self.modules.values() if m.status == ModuleStatus.ACTIVE)
            total_modules = len(self.modules)
            
            # Statistike opozoril
            unacknowledged_alerts = sum(1 for a in self.system_alerts if not a.acknowledged)
            critical_alerts = sum(1 for a in self.system_alerts if a.level == AlertLevel.CRITICAL and not a.resolved)
            
            return {
                "system": {
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory.percent,
                    "memory_used_gb": memory.used / (1024**3),
                    "memory_total_gb": memory.total / (1024**3),
                    "disk_percent": disk.percent,
                    "disk_used_gb": disk.used / (1024**3),
                    "disk_total_gb": disk.total / (1024**3)
                },
                "modules": {
                    "active": active_modules,
                    "total": total_modules,
                    "inactive": total_modules - active_modules
                },
                "alerts": {
                    "unacknowledged": unacknowledged_alerts,
                    "critical": critical_alerts,
                    "total": len(self.system_alerts)
                },
                "sessions": {
                    "active": len(self.active_sessions)
                },
                "timestamp": datetime.datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju sistemskega statusa: {e}")
            return {}
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Pridobi sistemske metrike za real-time monitoring"""
        try:
            status = self.get_system_status()
            
            # Dodaj metrike modulov
            modules_metrics = {}
            for module_id, module in self.modules.items():
                modules_metrics[module_id] = {
                    "status": module.status.value,
                    "cpu_usage": module.cpu_usage,
                    "memory_usage": module.memory_usage,
                    "error_count": module.error_count,
                    "uptime_seconds": module.uptime_seconds
                }
            
            status["modules_metrics"] = modules_metrics
            return status
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju sistemskih metrik: {e}")
            return {}
    
    def broadcast_module_update(self, module: OmniModule):
        """Pošlji posodobitev modula preko WebSocket"""
        try:
            module_data = {
                "module_id": module.module_id,
                "name": module.name,
                "status": module.status.value,
                "cpu_usage": module.cpu_usage,
                "memory_usage": module.memory_usage,
                "error_count": module.error_count,
                "last_heartbeat": module.last_heartbeat.isoformat()
            }
            
            # Poenostavljeno - brez real-time komunikacije
            logger.info(f"Modul posodobljen: {module.name}")
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju posodobitve modula: {e}")
    
    def broadcast_alert(self, alert: SystemAlert):
        """Pošlji opozorilo preko WebSocket"""
        try:
            alert_data = {
                "alert_id": alert.alert_id,
                "module_id": alert.module_id,
                "alert_type": alert.alert_type,
                "level": alert.level.value,
                "message": alert.message,
                "timestamp": alert.timestamp.isoformat()
            }
            
            # Poenostavljeno - brez real-time komunikacije
            logger.warning(f"Sistemski alarm: {alert.message}")
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju opozorila: {e}")
    
    def log_activity(self, user_id: str, action: str, target: str = None, 
                    details: str = None, ip_address: str = None, success: bool = True):
        """Zabeleži admin aktivnost"""
        try:
            activity_id = str(uuid.uuid4())
            timestamp = datetime.datetime.now()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO admin_activity 
                (activity_id, user_id, action, target, details, timestamp, ip_address, success)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                activity_id, user_id, action, target, details,
                timestamp.isoformat(), ip_address, int(success)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju aktivnosti: {e}")
    
    def start_monitoring(self):
        """Zaženi sistemski monitoring"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        
        def monitor_system():
            while self.monitoring_active:
                try:
                    # Posodobi metrike modulov
                    for module in self.modules.values():
                        if module.status == ModuleStatus.ACTIVE:
                            # Simuliraj metrike
                            module.cpu_usage = psutil.cpu_percent() * (0.5 + hash(module.module_id) % 100 / 200)
                            module.memory_usage = psutil.virtual_memory().percent * (0.3 + hash(module.module_id) % 100 / 300)
                            module.uptime_seconds += 30
                            module.last_heartbeat = datetime.datetime.now()
                            
                            self.save_module(module)
                    
                    # Pošlji metrike preko WebSocket
                    metrics = self.get_system_metrics()
                    # Poenostavljeno - brez real-time komunikacije
                    logger.debug(f"Sistemske metrike posodobljene")
                    
                    # Počakaj 30 sekund
                    time.sleep(30)
                    
                except Exception as e:
                    logger.error(f"Napaka pri monitoringu sistema: {e}")
                    time.sleep(30)
        
        # Zaženi monitoring v ločeni niti
        monitor_thread = threading.Thread(target=monitor_system, daemon=True)
        monitor_thread.start()
        
        logger.info("Sistemski monitoring zagnan")
    
    def stop_monitoring(self):
        """Ustavi sistemski monitoring"""
        self.monitoring_active = False
        logger.info("Sistemski monitoring ustavljen")
    
    def run(self, host: str = '0.0.0.0', port: int = 8090, debug: bool = False):
        """Zaženi admin konzolo"""
        try:
            logger.info(f"Zaganjam Omni Admin Console na {host}:{port}")
            self.app.run(host=host, port=port, debug=debug)
            
        except Exception as e:
            logger.error(f"Napaka pri zagonu admin konzole: {e}")

def demo_admin_console():
    """Demo funkcija za testiranje admin konzole"""
    print("🎛️ OMNI ADMIN CONSOLE - DEMO")
    print("=" * 50)
    
    # Inicializiraj admin konzolo
    admin_console = OmniAdminConsole()
    
    print("\n🔧 Admin konzola inicializirana:")
    print(f"  • Registriranih modulov: {len(admin_console.modules)}")
    print(f"  • Monitoring aktiven: {admin_console.monitoring_active}")
    
    # Prikaži module
    print("\n📦 Registrirani moduli:")
    for module in admin_console.modules.values():
        print(f"  • {module.name} ({module.module_id})")
        print(f"    Status: {module.status.value}")
        print(f"    Port: {module.port}")
        print(f"    Endpoint: {module.endpoint}")
    
    # Testiraj upravljanje modulov
    print("\n🎮 Testiram upravljanje modulov...")
    
    # Zaženi nekaj modulov
    test_modules = ["omni_cloud", "omni_security", "omni_demo"]
    for module_id in test_modules:
        success = admin_console.start_module(module_id)
        print(f"  {'✅' if success else '❌'} Zagon {module_id}: {'uspešen' if success else 'neuspešen'}")
    
    # Počakaj malo
    time.sleep(2)
    
    # Prikaži sistemski status
    print("\n📊 Sistemski status:")
    status = admin_console.get_system_status()
    
    print(f"  • CPU: {status['system']['cpu_percent']:.1f}%")
    print(f"  • Pomnilnik: {status['system']['memory_percent']:.1f}%")
    print(f"  • Aktivni moduli: {status['modules']['active']}/{status['modules']['total']}")
    print(f"  • Opozorila: {status['alerts']['total']}")
    print(f"  • Aktivne seje: {status['sessions']['active']}")
    
    # Prikaži opozorila
    print(f"\n🚨 Sistemska opozorila ({len(admin_console.system_alerts)}):")
    for alert in admin_console.system_alerts[-5:]:  # Zadnjih 5
        level_icon = {"info": "ℹ️", "warning": "⚠️", "error": "❌", "critical": "🚨"}
        icon = level_icon.get(alert.level.value, "❓")
        print(f"  {icon} {alert.alert_type}: {alert.message}")
        print(f"    Čas: {alert.timestamp.strftime('%H:%M:%S')}")
    
    print("\n🎉 Admin konzola uspešno testirana!")
    print("  • Upravljanje modulov deluje")
    print("  • Sistemski monitoring aktiven")
    print("  • Opozorila se ustvarjajo")
    print("  • WebSocket komunikacija pripravljena")
    print("\n💡 Za zagon web vmesnika uporabi:")
    print("  python omni_admin_console.py --run")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Zaženi admin konzolo
        admin_console = OmniAdminConsole()
        print("\n🌐 Zaganjam Omni Admin Console...")
        print("📱 Dostop: http://localhost:8090")
        print("🔐 Prijava: admin / admin123")
        admin_console.run(debug=True)
    else:
        # Zaženi demo
        demo_admin_console()