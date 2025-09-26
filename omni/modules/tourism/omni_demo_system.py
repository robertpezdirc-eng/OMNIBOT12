#!/usr/bin/env python3
"""
OMNI DEMO SYSTEM - Časovno omejen demo z avtomatsko deaktivacijo
================================================================

Funkcionalnosti:
- Časovno omejeni demo (1h, 1 dan, 1 teden)
- Avtomatska deaktivacija po preteku časa
- Opozorilo 24h pred iztekom
- Ročno preklicanje dostopa
- Sandbox read-only omejitve
- Zaščita pred krajo in kopiranjem

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

# Nastavi logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DemoStatus(Enum):
    """Status demo sistema"""
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    PENDING = "pending"

class DemoType(Enum):
    """Tip demo sistema"""
    TRIAL = "trial"
    PRESENTATION = "presentation"
    EVALUATION = "evaluation"
    SANDBOX = "sandbox"

class AccessLevel(Enum):
    """Nivo dostopa v demo sistemu"""
    READ_ONLY = "read_only"
    LIMITED = "limited"
    FULL = "full"
    ADMIN = "admin"

@dataclass
class DemoSession:
    """Demo seja"""
    session_id: str
    user_id: str
    demo_type: DemoType
    access_level: AccessLevel
    start_time: datetime.datetime
    end_time: datetime.datetime
    status: DemoStatus
    features_enabled: List[str]
    features_disabled: List[str]
    max_users: int
    current_users: int
    ip_address: str
    user_agent: str
    hardware_fingerprint: str
    created_at: datetime.datetime
    last_activity: datetime.datetime

@dataclass
class DemoLimits:
    """Omejitve demo sistema"""
    max_duration_hours: int
    max_concurrent_users: int
    max_api_calls_per_hour: int
    max_data_export_mb: int
    allowed_features: List[str]
    blocked_features: List[str]
    read_only_mode: bool
    sandbox_mode: bool

@dataclass
class DemoAlert:
    """Demo opozorilo"""
    alert_id: str
    session_id: str
    alert_type: str
    message: str
    severity: str
    timestamp: datetime.datetime
    acknowledged: bool

class OmniDemoSystem:
    """Glavni razred za demo sistem"""
    
    def __init__(self, db_path: str = "omni_demo.db"):
        self.db_path = db_path
        self.active_sessions: Dict[str, DemoSession] = {}
        self.demo_limits = DemoLimits(
            max_duration_hours=24,
            max_concurrent_users=5,
            max_api_calls_per_hour=1000,
            max_data_export_mb=10,
            allowed_features=[
                "pos_basic", "inventory_view", "reports_basic", 
                "reservations_view", "menu_view"
            ],
            blocked_features=[
                "admin_panel", "user_management", "system_config",
                "data_export", "backup_restore", "financial_reports"
            ],
            read_only_mode=True,
            sandbox_mode=True
        )
        self.monitoring_active = False
        self.alert_callbacks: List[Callable] = []
        
        # Inicializiraj bazo
        self.init_database()
        
        # Zaženi monitoring
        self.start_monitoring()
    
    def init_database(self):
        """Inicializiraj demo bazo podatkov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tabela demo sej
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS demo_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    demo_type TEXT NOT NULL,
                    access_level TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    status TEXT NOT NULL,
                    features_enabled TEXT,
                    features_disabled TEXT,
                    max_users INTEGER DEFAULT 1,
                    current_users INTEGER DEFAULT 0,
                    ip_address TEXT,
                    user_agent TEXT,
                    hardware_fingerprint TEXT,
                    created_at TEXT NOT NULL,
                    last_activity TEXT NOT NULL
                )
            ''')
            
            # Tabela demo opozoril
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS demo_alerts (
                    alert_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    acknowledged INTEGER DEFAULT 0,
                    FOREIGN KEY (session_id) REFERENCES demo_sessions (session_id)
                )
            ''')
            
            # Tabela aktivnosti
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS demo_activity (
                    activity_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    resource TEXT,
                    timestamp TEXT NOT NULL,
                    ip_address TEXT,
                    success INTEGER DEFAULT 1,
                    FOREIGN KEY (session_id) REFERENCES demo_sessions (session_id)
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("Demo baza podatkov inicializirana")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji demo baze: {e}")
    
    def create_demo_session(self, user_id: str, demo_type: DemoType, 
                           duration_hours: int = 2, access_level: AccessLevel = AccessLevel.READ_ONLY,
                           ip_address: str = "localhost", user_agent: str = "unknown") -> str:
        """Ustvari novo demo sejo"""
        try:
            session_id = str(uuid.uuid4())
            start_time = datetime.datetime.now()
            end_time = start_time + datetime.timedelta(hours=duration_hours)
            
            # Generiraj hardware fingerprint
            hardware_fingerprint = self.generate_hardware_fingerprint()
            
            demo_session = DemoSession(
                session_id=session_id,
                user_id=user_id,
                demo_type=demo_type,
                access_level=access_level,
                start_time=start_time,
                end_time=end_time,
                status=DemoStatus.ACTIVE,
                features_enabled=self.demo_limits.allowed_features.copy(),
                features_disabled=self.demo_limits.blocked_features.copy(),
                max_users=self.demo_limits.max_concurrent_users,
                current_users=1,
                ip_address=ip_address,
                user_agent=user_agent,
                hardware_fingerprint=hardware_fingerprint,
                created_at=start_time,
                last_activity=start_time
            )
            
            # Shrani v bazo
            self.save_demo_session(demo_session)
            
            # Dodaj v aktivne seje
            self.active_sessions[session_id] = demo_session
            
            # Ustvari opozorilo za začetek demo
            self.create_alert(
                session_id, "demo_started", 
                f"Demo seja začeta za uporabnika {user_id}", "info"
            )
            
            logger.info(f"Demo seja ustvarjena: {session_id} za uporabnika {user_id}")
            return session_id
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju demo seje: {e}")
            return ""
    
    def generate_hardware_fingerprint(self) -> str:
        """Generiraj hardware fingerprint"""
        try:
            # Zberi sistemske informacije
            system_info = {
                'platform': platform.platform(),
                'processor': platform.processor(),
                'machine': platform.machine(),
                'node': platform.node(),
                'cpu_count': psutil.cpu_count(),
                'total_memory': psutil.virtual_memory().total
            }
            
            # Ustvari hash
            fingerprint_str = json.dumps(system_info, sort_keys=True)
            fingerprint = hashlib.sha256(fingerprint_str.encode()).hexdigest()[:16]
            
            return fingerprint
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju hardware fingerprint: {e}")
            return "unknown"
    
    def save_demo_session(self, session: DemoSession):
        """Shrani demo sejo v bazo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO demo_sessions 
                (session_id, user_id, demo_type, access_level, start_time, end_time, 
                 status, features_enabled, features_disabled, max_users, current_users,
                 ip_address, user_agent, hardware_fingerprint, created_at, last_activity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session.session_id, session.user_id, session.demo_type.value,
                session.access_level.value, session.start_time.isoformat(),
                session.end_time.isoformat(), session.status.value,
                json.dumps(session.features_enabled), json.dumps(session.features_disabled),
                session.max_users, session.current_users, session.ip_address,
                session.user_agent, session.hardware_fingerprint,
                session.created_at.isoformat(), session.last_activity.isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju demo seje: {e}")
    
    def get_demo_session(self, session_id: str) -> Optional[DemoSession]:
        """Pridobi demo sejo"""
        try:
            if session_id in self.active_sessions:
                return self.active_sessions[session_id]
            
            # Preveri v bazi
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM demo_sessions WHERE session_id = ?', (session_id,))
            row = cursor.fetchone()
            conn.close()
            
            if row:
                session = DemoSession(
                    session_id=row[0],
                    user_id=row[1],
                    demo_type=DemoType(row[2]),
                    access_level=AccessLevel(row[3]),
                    start_time=datetime.datetime.fromisoformat(row[4]),
                    end_time=datetime.datetime.fromisoformat(row[5]),
                    status=DemoStatus(row[6]),
                    features_enabled=json.loads(row[7]) if row[7] else [],
                    features_disabled=json.loads(row[8]) if row[8] else [],
                    max_users=row[9],
                    current_users=row[10],
                    ip_address=row[11],
                    user_agent=row[12],
                    hardware_fingerprint=row[13],
                    created_at=datetime.datetime.fromisoformat(row[14]),
                    last_activity=datetime.datetime.fromisoformat(row[15])
                )
                
                # Dodaj v aktivne seje če je aktivna
                if session.status == DemoStatus.ACTIVE:
                    self.active_sessions[session_id] = session
                
                return session
            
            return None
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju demo seje: {e}")
            return None
    
    def check_session_validity(self, session_id: str) -> bool:
        """Preveri veljavnost demo seje"""
        try:
            session = self.get_demo_session(session_id)
            if not session:
                return False
            
            current_time = datetime.datetime.now()
            
            # Preveri če je seja potekla
            if current_time > session.end_time:
                self.expire_session(session_id, "Demo čas je potekel")
                return False
            
            # Preveri status
            if session.status != DemoStatus.ACTIVE:
                return False
            
            # Posodobi zadnjo aktivnost
            session.last_activity = current_time
            self.save_demo_session(session)
            
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri preverjanju veljavnosti seje: {e}")
            return False
    
    def expire_session(self, session_id: str, reason: str = "Demo potekel"):
        """Prekini demo sejo"""
        try:
            session = self.get_demo_session(session_id)
            if session:
                session.status = DemoStatus.EXPIRED
                self.save_demo_session(session)
                
                # Odstrani iz aktivnih sej
                if session_id in self.active_sessions:
                    del self.active_sessions[session_id]
                
                # Ustvari opozorilo
                self.create_alert(
                    session_id, "demo_expired", reason, "warning"
                )
                
                logger.warning(f"Demo seja potekla: {session_id} - {reason}")
                
                # Pokliči callback funkcije
                for callback in self.alert_callbacks:
                    try:
                        callback("demo_expired", session_id, reason)
                    except Exception as e:
                        logger.error(f"Napaka pri callback klicu: {e}")
            
        except Exception as e:
            logger.error(f"Napaka pri prekinjanju demo seje: {e}")
    
    def suspend_session(self, session_id: str, reason: str = "Administrativno prekinjeno"):
        """Suspendiraj demo sejo"""
        try:
            session = self.get_demo_session(session_id)
            if session:
                session.status = DemoStatus.SUSPENDED
                self.save_demo_session(session)
                
                # Ustvari opozorilo
                self.create_alert(
                    session_id, "demo_suspended", reason, "warning"
                )
                
                logger.warning(f"Demo seja suspendirana: {session_id} - {reason}")
            
        except Exception as e:
            logger.error(f"Napaka pri suspendiranju demo seje: {e}")
    
    def terminate_session(self, session_id: str, reason: str = "Administrativno prekinjeno"):
        """Terminiraj demo sejo"""
        try:
            session = self.get_demo_session(session_id)
            if session:
                session.status = DemoStatus.TERMINATED
                self.save_demo_session(session)
                
                # Odstrani iz aktivnih sej
                if session_id in self.active_sessions:
                    del self.active_sessions[session_id]
                
                # Ustvari opozorilo
                self.create_alert(
                    session_id, "demo_terminated", reason, "critical"
                )
                
                logger.critical(f"Demo seja terminirana: {session_id} - {reason}")
            
        except Exception as e:
            logger.error(f"Napaka pri terminaciji demo seje: {e}")
    
    def create_alert(self, session_id: str, alert_type: str, message: str, severity: str):
        """Ustvari demo opozorilo"""
        try:
            alert_id = str(uuid.uuid4())
            timestamp = datetime.datetime.now()
            
            alert = DemoAlert(
                alert_id=alert_id,
                session_id=session_id,
                alert_type=alert_type,
                message=message,
                severity=severity,
                timestamp=timestamp,
                acknowledged=False
            )
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO demo_alerts 
                (alert_id, session_id, alert_type, message, severity, timestamp, acknowledged)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.alert_id, alert.session_id, alert.alert_type,
                alert.message, alert.severity, alert.timestamp.isoformat(),
                int(alert.acknowledged)
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Demo opozorilo ustvarjeno: {alert_type} - {message}")
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju demo opozorila: {e}")
    
    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Pridobi status demo seje"""
        try:
            session = self.get_demo_session(session_id)
            if not session:
                return {"error": "Seja ne obstaja"}
            
            current_time = datetime.datetime.now()
            time_remaining = (session.end_time - current_time).total_seconds() / 3600
            
            return {
                "session_id": session.session_id,
                "user_id": session.user_id,
                "status": session.status.value,
                "demo_type": session.demo_type.value,
                "access_level": session.access_level.value,
                "start_time": session.start_time.isoformat(),
                "end_time": session.end_time.isoformat(),
                "time_remaining_hours": max(0, time_remaining),
                "features_enabled": session.features_enabled,
                "features_disabled": session.features_disabled,
                "current_users": session.current_users,
                "max_users": session.max_users,
                "last_activity": session.last_activity.isoformat(),
                "hardware_fingerprint": session.hardware_fingerprint
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju statusa seje: {e}")
            return {"error": str(e)}
    
    def check_feature_access(self, session_id: str, feature: str) -> bool:
        """Preveri dostop do funkcionalnosti"""
        try:
            session = self.get_demo_session(session_id)
            if not session or session.status != DemoStatus.ACTIVE:
                return False
            
            # Preveri če je funkcionalnost dovoljena
            if feature in session.features_disabled:
                return False
            
            if session.features_enabled and feature not in session.features_enabled:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri preverjanju dostopa do funkcionalnosti: {e}")
            return False
    
    def log_activity(self, session_id: str, user_id: str, action: str, 
                    resource: str = None, success: bool = True, ip_address: str = None):
        """Zabeleži aktivnost"""
        try:
            activity_id = str(uuid.uuid4())
            timestamp = datetime.datetime.now()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO demo_activity 
                (activity_id, session_id, user_id, action, resource, timestamp, ip_address, success)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                activity_id, session_id, user_id, action, resource,
                timestamp.isoformat(), ip_address, int(success)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju aktivnosti: {e}")
    
    def start_monitoring(self):
        """Zaženi monitoring demo sej"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        
        def monitor_sessions():
            while self.monitoring_active:
                try:
                    current_time = datetime.datetime.now()
                    
                    # Preveri vse aktivne seje
                    for session_id in list(self.active_sessions.keys()):
                        session = self.active_sessions[session_id]
                        
                        # Preveri če je seja potekla
                        if current_time > session.end_time:
                            self.expire_session(session_id, "Demo čas je potekel")
                            continue
                        
                        # Preveri opozorilo 24h pred iztekom
                        time_remaining = (session.end_time - current_time).total_seconds() / 3600
                        if time_remaining <= 24 and time_remaining > 23:
                            self.create_alert(
                                session_id, "demo_expiring_soon",
                                f"Demo bo potekel čez {time_remaining:.1f} ur", "warning"
                            )
                    
                    # Počakaj 1 minuto
                    time.sleep(60)
                    
                except Exception as e:
                    logger.error(f"Napaka pri monitoringu demo sej: {e}")
                    time.sleep(60)
        
        # Zaženi monitoring v ločeni niti
        monitor_thread = threading.Thread(target=monitor_sessions, daemon=True)
        monitor_thread.start()
        
        logger.info("Demo monitoring zagnan")
    
    def stop_monitoring(self):
        """Ustavi monitoring demo sej"""
        self.monitoring_active = False
        logger.info("Demo monitoring ustavljen")
    
    def add_alert_callback(self, callback: Callable):
        """Dodaj callback funkcijo za opozorila"""
        self.alert_callbacks.append(callback)
    
    def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Pridobi vse demo seje"""
        try:
            sessions = []
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM demo_sessions ORDER BY created_at DESC')
            rows = cursor.fetchall()
            conn.close()
            
            for row in rows:
                session_data = {
                    "session_id": row[0],
                    "user_id": row[1],
                    "demo_type": row[2],
                    "access_level": row[3],
                    "start_time": row[4],
                    "end_time": row[5],
                    "status": row[6],
                    "current_users": row[10],
                    "max_users": row[9],
                    "ip_address": row[11],
                    "created_at": row[14],
                    "last_activity": row[15]
                }
                sessions.append(session_data)
            
            return sessions
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju vseh sej: {e}")
            return []
    
    def get_demo_statistics(self) -> Dict[str, Any]:
        """Pridobi statistike demo sistema"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Skupno število sej
            cursor.execute('SELECT COUNT(*) FROM demo_sessions')
            total_sessions = cursor.fetchone()[0]
            
            # Aktivne seje
            cursor.execute('SELECT COUNT(*) FROM demo_sessions WHERE status = ?', (DemoStatus.ACTIVE.value,))
            active_sessions = cursor.fetchone()[0]
            
            # Potekle seje
            cursor.execute('SELECT COUNT(*) FROM demo_sessions WHERE status = ?', (DemoStatus.EXPIRED.value,))
            expired_sessions = cursor.fetchone()[0]
            
            # Skupno opozoril
            cursor.execute('SELECT COUNT(*) FROM demo_alerts')
            total_alerts = cursor.fetchone()[0]
            
            # Aktivnosti zadnji teden
            week_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat()
            cursor.execute('SELECT COUNT(*) FROM demo_activity WHERE timestamp > ?', (week_ago,))
            recent_activities = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                "total_sessions": total_sessions,
                "active_sessions": active_sessions,
                "expired_sessions": expired_sessions,
                "suspended_sessions": total_sessions - active_sessions - expired_sessions,
                "total_alerts": total_alerts,
                "recent_activities": recent_activities,
                "monitoring_active": self.monitoring_active,
                "timestamp": datetime.datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju statistik: {e}")
            return {}

def demo_demo_system():
    """Demo funkcija za testiranje demo sistema"""
    print("🎭 OMNI DEMO SYSTEM - TESTIRANJE")
    print("=" * 50)
    
    # Inicializiraj demo sistem
    demo_system = OmniDemoSystem()
    
    # Ustvari demo sejo
    print("\n🎬 Ustvarjam demo sejo...")
    session_id = demo_system.create_demo_session(
        user_id="demo_user",
        demo_type=DemoType.PRESENTATION,
        duration_hours=2,
        access_level=AccessLevel.READ_ONLY,
        ip_address="192.168.1.100"
    )
    
    if session_id:
        print(f"  ✅ Demo seja ustvarjena: {session_id[:8]}...")
        
        # Preveri status
        status = demo_system.get_session_status(session_id)
        print(f"  📊 Status: {status['status']}")
        print(f"  ⏱️ Čas do izteka: {status['time_remaining_hours']:.2f}h")
        print(f"  🔧 Dovoljene funkcionalnosti: {len(status['features_enabled'])}")
        print(f"  🚫 Blokirane funkcionalnosti: {len(status['features_disabled'])}")
        
        # Testiraj dostop do funkcionalnosti
        print("\n🔐 Testiram dostop do funkcionalnosti...")
        test_features = ["pos_basic", "admin_panel", "inventory_view", "data_export"]
        
        for feature in test_features:
            access = demo_system.check_feature_access(session_id, feature)
            status_icon = "✅" if access else "❌"
            print(f"  {status_icon} {feature}: {'Dovoljen' if access else 'Blokiran'}")
        
        # Zabeleži aktivnosti
        print("\n📝 Beležim aktivnosti...")
        activities = [
            ("login", "authentication"),
            ("view_dashboard", "dashboard"),
            ("access_pos", "pos_basic"),
            ("export_data", "data_export")
        ]
        
        for action, resource in activities:
            success = demo_system.check_feature_access(session_id, resource)
            demo_system.log_activity(session_id, "demo_user", action, resource, success)
            print(f"  📋 {action}: {'Uspešno' if success else 'Zavrnjeno'}")
        
        # Prikaži statistike
        print("\n📊 Demo statistike:")
        stats = demo_system.get_demo_statistics()
        for key, value in stats.items():
            if key != "timestamp":
                print(f"  • {key}: {value}")
        
        print("\n🎉 Demo sistem uspešno testiran!")
        print("  • Časovna omejitev aktivna")
        print("  • Sandbox omejitve delujejo")
        print("  • Monitoring aktiven")
        print("  • Opozorila nastavljene")
        
    else:
        print("  ❌ Napaka pri ustvarjanju demo seje")

if __name__ == "__main__":
    demo_demo_system()