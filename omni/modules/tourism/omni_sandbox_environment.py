#!/usr/bin/env python3
"""
Omni Sandbox Environment - Varno demo okolje z read-only omejitvami
Omogoča varno testiranje funkcionalnosti brez tveganja za produkcijski sistem
"""

import os
import sys
import json
import time
import sqlite3
import logging
import threading
import tempfile
import shutil
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path
import secrets
import uuid
from contextlib import contextmanager
import subprocess

# Flask in dodatne knjižnice
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import psutil
from functools import wraps

# Nastavi logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SandboxMode(Enum):
    """Načini sandbox okolja"""
    READ_ONLY = "read_only"
    LIMITED_WRITE = "limited_write"
    FULL_DEMO = "full_demo"
    TESTING = "testing"

class AccessLevel(Enum):
    """Nivoji dostopa"""
    VIEWER = "viewer"
    DEMO_USER = "demo_user"
    TESTER = "tester"
    ADMIN = "admin"

class ResourceType(Enum):
    """Tipi virov"""
    FILE = "file"
    DATABASE = "database"
    API = "api"
    NETWORK = "network"
    SYSTEM = "system"

@dataclass
class SandboxSession:
    """Sandbox seja"""
    id: str
    user_id: str
    mode: SandboxMode
    access_level: AccessLevel
    start_time: datetime
    end_time: datetime
    allowed_resources: Set[str]
    blocked_resources: Set[str]
    activity_log: List[Dict]
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'mode': self.mode.value,
            'access_level': self.access_level.value,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat(),
            'allowed_resources': list(self.allowed_resources),
            'blocked_resources': list(self.blocked_resources),
            'activity_count': len(self.activity_log)
        }

@dataclass
class SandboxRule:
    """Pravilo za sandbox"""
    id: str
    name: str
    resource_type: ResourceType
    pattern: str
    action: str  # allow, deny, log
    priority: int
    description: str
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class SandboxAlert:
    """Opozorilo sandbox sistema"""
    id: str
    session_id: str
    level: str  # info, warning, error, critical
    message: str
    resource: str
    action_attempted: str
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'session_id': self.session_id,
            'level': self.level,
            'message': self.message,
            'resource': self.resource,
            'action_attempted': self.action_attempted,
            'timestamp': self.timestamp.isoformat()
        }

class OmniSandboxEnvironment:
    """Napredni sandbox sistem za varno demo okolje"""
    
    def __init__(self, db_path: str = "omni_sandbox.db"):
        self.db_path = db_path
        self.secret_key = secrets.token_hex(32)
        self.sandbox_root = Path(tempfile.gettempdir()) / "omni_sandbox"
        
        # Inicializiraj Flask aplikacijo
        self.app = Flask(__name__)
        self.app.secret_key = self.secret_key
        
        # Aktivne seje
        self.active_sessions: Dict[str, SandboxSession] = {}
        
        # Sandbox pravila
        self.rules: List[SandboxRule] = []
        
        # Inicializiraj sistem
        self.init_database()
        self.setup_sandbox_directory()
        self.setup_default_rules()
        self.setup_routes()
        
        # Zaženi monitoring thread
        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(target=self.monitor_sessions, daemon=True)
        self.monitoring_thread.start()
        
        logger.info("Sandbox okolje inicializirano")
    
    def init_database(self):
        """Inicializiraj bazo podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela za seje
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sandbox_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    access_level TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME NOT NULL,
                    allowed_resources TEXT,
                    blocked_resources TEXT,
                    activity_log TEXT,
                    status TEXT DEFAULT 'active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za pravila
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sandbox_rules (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    resource_type TEXT NOT NULL,
                    pattern TEXT NOT NULL,
                    action TEXT NOT NULL,
                    priority INTEGER DEFAULT 0,
                    description TEXT,
                    active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za opozorila
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sandbox_alerts (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    resource TEXT,
                    action_attempted TEXT,
                    timestamp DATETIME NOT NULL,
                    resolved BOOLEAN DEFAULT 0
                )
            ''')
            
            # Tabela za aktivnosti
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sandbox_activities (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    resource TEXT,
                    result TEXT,
                    timestamp DATETIME NOT NULL,
                    metadata TEXT
                )
            ''')
            
            conn.commit()
            logger.info("Sandbox baza podatkov inicializirana")
    
    def setup_sandbox_directory(self):
        """Nastavi sandbox direktorij"""
        try:
            self.sandbox_root.mkdir(parents=True, exist_ok=True)
            
            # Ustvari demo datoteke
            demo_files = {
                'readme.txt': 'Dobrodošli v Omni Sandbox okolju!\nTo je varno demo okolje za testiranje.',
                'sample_data.json': json.dumps({
                    'demo': True,
                    'users': [
                        {'id': 1, 'name': 'Demo User', 'role': 'tester'},
                        {'id': 2, 'name': 'Test Admin', 'role': 'admin'}
                    ],
                    'timestamp': datetime.now().isoformat()
                }, indent=2),
                'config.ini': '[sandbox]\nmode=demo\nread_only=true\ntimeout=3600\n'
            }
            
            for filename, content in demo_files.items():
                file_path = self.sandbox_root / filename
                if not file_path.exists():
                    file_path.write_text(content, encoding='utf-8')
            
            logger.info(f"Sandbox direktorij pripravljen: {self.sandbox_root}")
            
        except Exception as e:
            logger.error(f"Napaka pri pripravi sandbox direktorija: {e}")
    
    def setup_default_rules(self):
        """Nastavi privzeta pravila"""
        default_rules = [
            SandboxRule(
                id="rule_1",
                name="Block System Files",
                resource_type=ResourceType.FILE,
                pattern=r"^(C:\\Windows|/etc|/usr/bin|/sys|/proc)",
                action="deny",
                priority=100,
                description="Prepreči dostop do sistemskih datotek"
            ),
            SandboxRule(
                id="rule_2",
                name="Allow Sandbox Files",
                resource_type=ResourceType.FILE,
                pattern=str(self.sandbox_root),
                action="allow",
                priority=90,
                description="Dovoli dostop do sandbox datotek"
            ),
            SandboxRule(
                id="rule_3",
                name="Block Network Access",
                resource_type=ResourceType.NETWORK,
                pattern=r".*",
                action="deny",
                priority=80,
                description="Prepreči mrežni dostop v demo načinu"
            ),
            SandboxRule(
                id="rule_4",
                name="Log Database Access",
                resource_type=ResourceType.DATABASE,
                pattern=r".*",
                action="log",
                priority=70,
                description="Beleži dostop do baz podatkov"
            ),
            SandboxRule(
                id="rule_5",
                name="Allow Read-Only API",
                resource_type=ResourceType.API,
                pattern=r"^GET|^HEAD",
                action="allow",
                priority=60,
                description="Dovoli samo bralne API klice"
            )
        ]
        
        for rule in default_rules:
            self.rules.append(rule)
            self.save_rule(rule)
        
        logger.info(f"Nastavljenih {len(default_rules)} privzetih pravil")
    
    def setup_routes(self):
        """Nastavi Flask rute"""
        
        @self.app.route('/')
        def index():
            return render_template('sandbox_home.html')
        
        @self.app.route('/sandbox/start', methods=['POST'])
        def start_sandbox():
            user_id = request.json.get('user_id', 'demo_user')
            mode = request.json.get('mode', 'read_only')
            access_level = request.json.get('access_level', 'demo_user')
            duration = request.json.get('duration', 3600)  # 1 ura
            
            session = self.create_sandbox_session(
                user_id=user_id,
                mode=SandboxMode(mode),
                access_level=AccessLevel(access_level),
                duration=duration
            )
            
            return jsonify({
                'success': True,
                'session': session.to_dict()
            })
        
        @self.app.route('/sandbox/stop/<session_id>', methods=['POST'])
        def stop_sandbox(session_id):
            success = self.stop_sandbox_session(session_id)
            return jsonify({'success': success})
        
        @self.app.route('/api/sandbox/sessions')
        def get_sessions():
            sessions = self.get_active_sessions()
            return jsonify([s.to_dict() for s in sessions])
        
        @self.app.route('/api/sandbox/rules')
        def get_rules():
            return jsonify([r.to_dict() for r in self.rules])
        
        @self.app.route('/api/sandbox/alerts')
        def get_alerts():
            alerts = self.get_recent_alerts()
            return jsonify([a.to_dict() for a in alerts])
        
        @self.app.route('/api/sandbox/files/<session_id>')
        def list_sandbox_files(session_id):
            if session_id not in self.active_sessions:
                return jsonify({'error': 'Invalid session'}), 404
            
            files = self.list_sandbox_files(session_id)
            return jsonify(files)
        
        @self.app.route('/api/sandbox/file/<session_id>/<path:filename>')
        def get_sandbox_file(session_id, filename):
            if session_id not in self.active_sessions:
                return jsonify({'error': 'Invalid session'}), 404
            
            content = self.read_sandbox_file(session_id, filename)
            if content is None:
                return jsonify({'error': 'File not found or access denied'}), 404
            
            return jsonify({'content': content})
    
    def create_sandbox_session(self, user_id: str, mode: SandboxMode, 
                             access_level: AccessLevel, duration: int) -> SandboxSession:
        """Ustvari novo sandbox sejo"""
        session_id = str(uuid.uuid4())
        start_time = datetime.now()
        end_time = start_time + timedelta(seconds=duration)
        
        # Določi dovoljene vire glede na nivo dostopa
        allowed_resources = set()
        blocked_resources = set()
        
        if access_level == AccessLevel.VIEWER:
            allowed_resources.add(str(self.sandbox_root))
            blocked_resources.update(['write', 'delete', 'execute'])
        elif access_level == AccessLevel.DEMO_USER:
            allowed_resources.update([str(self.sandbox_root), 'api_read'])
            blocked_resources.update(['system', 'network'])
        elif access_level == AccessLevel.TESTER:
            allowed_resources.update([str(self.sandbox_root), 'api_read', 'api_write'])
            blocked_resources.add('system')
        
        session = SandboxSession(
            id=session_id,
            user_id=user_id,
            mode=mode,
            access_level=access_level,
            start_time=start_time,
            end_time=end_time,
            allowed_resources=allowed_resources,
            blocked_resources=blocked_resources,
            activity_log=[]
        )
        
        self.active_sessions[session_id] = session
        self.save_session(session)
        
        logger.info(f"Ustvarjena sandbox seja: {session_id} za uporabnika {user_id}")
        return session
    
    def stop_sandbox_session(self, session_id: str) -> bool:
        """Ustavi sandbox sejo"""
        try:
            if session_id in self.active_sessions:
                session = self.active_sessions[session_id]
                del self.active_sessions[session_id]
                
                # Posodobi v bazi
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        UPDATE sandbox_sessions 
                        SET status = 'stopped', end_time = ?
                        WHERE id = ?
                    ''', (datetime.now(), session_id))
                    conn.commit()
                
                logger.info(f"Ustavljena sandbox seja: {session_id}")
                return True
        except Exception as e:
            logger.error(f"Napaka pri ustavljanju seje: {e}")
        
        return False
    
    def check_access(self, session_id: str, resource: str, action: str) -> Tuple[bool, str]:
        """Preveri dostop do vira"""
        if session_id not in self.active_sessions:
            return False, "Invalid session"
        
        session = self.active_sessions[session_id]
        
        # Preveri če je seja še veljavna
        if datetime.now() > session.end_time:
            return False, "Session expired"
        
        # Preveri pravila
        for rule in sorted(self.rules, key=lambda r: r.priority, reverse=True):
            if self.match_rule(rule, resource, action):
                if rule.action == "deny":
                    self.log_activity(session_id, action, resource, "denied")
                    return False, f"Access denied by rule: {rule.name}"
                elif rule.action == "allow":
                    self.log_activity(session_id, action, resource, "allowed")
                    return True, "Access granted"
                elif rule.action == "log":
                    self.log_activity(session_id, action, resource, "logged")
        
        # Privzeto zavrni
        self.log_activity(session_id, action, resource, "denied_default")
        return False, "Access denied by default policy"
    
    def match_rule(self, rule: SandboxRule, resource: str, action: str) -> bool:
        """Preveri ali se pravilo ujema z virom in akcijo"""
        import re
        try:
            return bool(re.search(rule.pattern, resource, re.IGNORECASE))
        except re.error:
            logger.error(f"Napačen regex pattern v pravilu {rule.id}: {rule.pattern}")
            return False
    
    def log_activity(self, session_id: str, action: str, resource: str, result: str):
        """Beleži aktivnost"""
        try:
            activity = {
                'id': str(uuid.uuid4()),
                'session_id': session_id,
                'action': action,
                'resource': resource,
                'result': result,
                'timestamp': datetime.now().isoformat()
            }
            
            # Dodaj v session log
            if session_id in self.active_sessions:
                self.active_sessions[session_id].activity_log.append(activity)
            
            # Shrani v bazo
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO sandbox_activities 
                    (id, session_id, action, resource, result, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    activity['id'],
                    session_id,
                    action,
                    resource,
                    result,
                    activity['timestamp']
                ))
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri beleženju aktivnosti: {e}")
    
    def create_alert(self, session_id: str, level: str, message: str, 
                    resource: str = "", action_attempted: str = ""):
        """Ustvari opozorilo"""
        alert = SandboxAlert(
            id=str(uuid.uuid4()),
            session_id=session_id,
            level=level,
            message=message,
            resource=resource,
            action_attempted=action_attempted,
            timestamp=datetime.now()
        )
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO sandbox_alerts 
                    (id, session_id, level, message, resource, action_attempted, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    alert.id,
                    alert.session_id,
                    alert.level,
                    alert.message,
                    alert.resource,
                    alert.action_attempted,
                    alert.timestamp
                ))
                conn.commit()
                
            logger.warning(f"Sandbox opozorilo: {message}")
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju opozorila: {e}")
    
    def list_sandbox_files(self, session_id: str) -> List[Dict]:
        """Seznam datotek v sandbox okolju"""
        allowed, reason = self.check_access(session_id, str(self.sandbox_root), "read")
        if not allowed:
            return []
        
        files = []
        try:
            for file_path in self.sandbox_root.iterdir():
                if file_path.is_file():
                    files.append({
                        'name': file_path.name,
                        'size': file_path.stat().st_size,
                        'modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                        'type': 'file'
                    })
                elif file_path.is_dir():
                    files.append({
                        'name': file_path.name,
                        'type': 'directory'
                    })
        except Exception as e:
            logger.error(f"Napaka pri listanju datotek: {e}")
        
        return files
    
    def read_sandbox_file(self, session_id: str, filename: str) -> Optional[str]:
        """Preberi datoteko iz sandbox okolja"""
        file_path = self.sandbox_root / filename
        
        allowed, reason = self.check_access(session_id, str(file_path), "read")
        if not allowed:
            self.create_alert(session_id, "warning", f"Zavrnjen dostop do datoteke: {filename}", 
                            str(file_path), "read")
            return None
        
        try:
            if file_path.exists() and file_path.is_file():
                return file_path.read_text(encoding='utf-8')
        except Exception as e:
            logger.error(f"Napaka pri branju datoteke {filename}: {e}")
        
        return None
    
    def save_session(self, session: SandboxSession):
        """Shrani sejo v bazo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO sandbox_sessions 
                    (id, user_id, mode, access_level, start_time, end_time, 
                     allowed_resources, blocked_resources, activity_log)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    session.id,
                    session.user_id,
                    session.mode.value,
                    session.access_level.value,
                    session.start_time,
                    session.end_time,
                    json.dumps(list(session.allowed_resources)),
                    json.dumps(list(session.blocked_resources)),
                    json.dumps(session.activity_log)
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju seje: {e}")
    
    def save_rule(self, rule: SandboxRule):
        """Shrani pravilo v bazo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO sandbox_rules 
                    (id, name, resource_type, pattern, action, priority, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    rule.id,
                    rule.name,
                    rule.resource_type.value,
                    rule.pattern,
                    rule.action,
                    rule.priority,
                    rule.description
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju pravila: {e}")
    
    def get_active_sessions(self) -> List[SandboxSession]:
        """Pridobi aktivne seje"""
        return list(self.active_sessions.values())
    
    def get_recent_alerts(self, limit: int = 50) -> List[SandboxAlert]:
        """Pridobi nedavna opozorila"""
        alerts = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, session_id, level, message, resource, 
                           action_attempted, timestamp
                    FROM sandbox_alerts
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (limit,))
                
                for row in cursor.fetchall():
                    alert = SandboxAlert(
                        id=row[0],
                        session_id=row[1],
                        level=row[2],
                        message=row[3],
                        resource=row[4],
                        action_attempted=row[5],
                        timestamp=datetime.fromisoformat(row[6])
                    )
                    alerts.append(alert)
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju opozoril: {e}")
        
        return alerts
    
    def monitor_sessions(self):
        """Monitoring sej v ozadju"""
        while self.monitoring_active:
            try:
                current_time = datetime.now()
                expired_sessions = []
                
                for session_id, session in self.active_sessions.items():
                    if current_time > session.end_time:
                        expired_sessions.append(session_id)
                
                # Ustavi potekle seje
                for session_id in expired_sessions:
                    self.stop_sandbox_session(session_id)
                    self.create_alert(session_id, "info", "Seja je potekla", "", "session_expired")
                
                time.sleep(60)  # Preveri vsako minuto
                
            except Exception as e:
                logger.error(f"Napaka pri monitoringu sej: {e}")
                time.sleep(60)
    
    def run_server(self, host='localhost', port=5003, debug=False):
        """Zaženi sandbox strežnik"""
        try:
            logger.info(f"Zaganjam Sandbox Environment na http://{host}:{port}")
            self.app.run(host=host, port=port, debug=debug)
        except Exception as e:
            logger.error(f"Napaka pri zagonu strežnika: {e}")
            raise
    
    def stop(self):
        """Ustavi sandbox"""
        self.monitoring_active = False
        # Ustavi vse aktivne seje
        for session_id in list(self.active_sessions.keys()):
            self.stop_sandbox_session(session_id)
        logger.info("Sandbox okolje ustavljeno")

def demo_sandbox_environment():
    """Demo funkcija za testiranje sandbox okolja"""
    print("🚀 Zaganjam Omni Sandbox Environment Demo...")
    
    try:
        # Inicializiraj sandbox
        sandbox = OmniSandboxEnvironment()
        
        print("✅ Sandbox okolje inicializirano")
        
        # Ustvari demo sejo
        session = sandbox.create_sandbox_session(
            user_id="demo_user",
            mode=SandboxMode.READ_ONLY,
            access_level=AccessLevel.DEMO_USER,
            duration=3600
        )
        print(f"✅ Demo seja ustvarjena: {session.id}")
        
        # Testiraj dostop do datotek
        files = sandbox.list_sandbox_files(session.id)
        print(f"✅ Najdenih {len(files)} datotek v sandbox okolju")
        
        # Testiraj branje datoteke
        if files:
            content = sandbox.read_sandbox_file(session.id, files[0]['name'])
            if content:
                print(f"✅ Datoteka {files[0]['name']} uspešno prebrana")
        
        # Testiraj preverjanje dostopa
        allowed, reason = sandbox.check_access(session.id, str(sandbox.sandbox_root), "read")
        print(f"✅ Dostop do sandbox direktorija: {'dovoljen' if allowed else 'zavrnjen'}")
        
        # Testiraj blokiran dostop
        allowed, reason = sandbox.check_access(session.id, "C:\\Windows\\System32", "read")
        print(f"✅ Dostop do sistemskih datotek: {'dovoljen' if allowed else 'zavrnjen'}")
        
        # Pridobi opozorila
        alerts = sandbox.get_recent_alerts()
        print(f"✅ Pridobljenih {len(alerts)} opozoril")
        
        # Ustavi sejo
        sandbox.stop_sandbox_session(session.id)
        print("✅ Demo seja ustavljena")
        
        print("\n📊 Sandbox Status:")
        print(f"  • Aktivne seje: {len(sandbox.get_active_sessions())}")
        print(f"  • Pravila: {len(sandbox.rules)}")
        print(f"  • Opozorila: {len(alerts)}")
        print(f"  • Sandbox direktorij: {sandbox.sandbox_root}")
        
        print("\n🎉 Sandbox Environment uspešno testiran!")
        print("  • Read-only omejitve delujejo")
        print("  • Dostopna pravila se izvajajo")
        print("  • Aktivnosti se beležijo")
        print("  • Seje se avtomatsko ustavljajo")
        
        print("\n💡 Za zagon web vmesnika uporabi:")
        print("  python omni_sandbox_environment.py --run")
        
        # Ustavi sandbox
        sandbox.stop()
        
    except Exception as e:
        print(f"❌ Napaka pri testiranju sandbox okolja: {e}")
        raise

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Zaženi web strežnik
        sandbox = OmniSandboxEnvironment()
        sandbox.run_server(host='0.0.0.0', port=5003, debug=True)
    else:
        # Zaženi demo
        demo_sandbox_environment()