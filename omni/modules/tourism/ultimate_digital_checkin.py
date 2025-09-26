"""
ULTIMATE DIGITAL CHECK-IN SYSTEM
Napredni sistem digitalne prijave z GDPR skladnostjo, QR kodami za dostop in zapisom preferenc
"""

import sqlite3
import json
import uuid
import hashlib
import qrcode
import io
import base64
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
import secrets
import logging

# Enumi
class CheckInStatus(Enum):
    PENDING = "pending"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"

class GuestType(Enum):
    INDIVIDUAL = "individual"
    BUSINESS = "business"
    VIP = "vip"
    GROUP = "group"

class ConsentType(Enum):
    MARKETING = "marketing"
    ANALYTICS = "analytics"
    PERSONALIZATION = "personalization"
    THIRD_PARTY = "third_party"

class AccessLevel(Enum):
    BASIC = "basic"
    PREMIUM = "premium"
    VIP = "vip"
    STAFF = "staff"

# Podatkovni razredi
@dataclass
class Guest:
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    guest_type: GuestType
    preferences: Dict[str, Any]
    gdpr_consents: Dict[ConsentType, bool]
    created_at: datetime
    last_updated: datetime

@dataclass
class CheckInSession:
    id: str
    guest_id: str
    reservation_id: Optional[str]
    status: CheckInStatus
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    room_number: Optional[str]
    access_code: str
    qr_code_data: str
    preferences_snapshot: Dict[str, Any]
    special_requests: List[str]
    created_at: datetime

@dataclass
class AccessToken:
    id: str
    guest_id: str
    session_id: str
    token: str
    access_level: AccessLevel
    valid_from: datetime
    valid_until: datetime
    is_active: bool
    usage_count: int
    max_usage: int

@dataclass
class GDPRConsent:
    id: str
    guest_id: str
    consent_type: ConsentType
    granted: bool
    granted_at: datetime
    ip_address: str
    user_agent: str
    consent_version: str

class UltimateDigitalCheckIn:
    def __init__(self, db_path: str = "ultimate_digital_checkin.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela gostov
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS guests (
                id TEXT PRIMARY KEY,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                guest_type TEXT NOT NULL,
                preferences TEXT,
                gdpr_consents TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabela prijav
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checkin_sessions (
                id TEXT PRIMARY KEY,
                guest_id TEXT NOT NULL,
                reservation_id TEXT,
                status TEXT NOT NULL,
                check_in_time TIMESTAMP,
                check_out_time TIMESTAMP,
                room_number TEXT,
                access_code TEXT NOT NULL,
                qr_code_data TEXT NOT NULL,
                preferences_snapshot TEXT,
                special_requests TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guest_id) REFERENCES guests (id)
            )
        """)
        
        # Tabela dostopnih žetonov
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS access_tokens (
                id TEXT PRIMARY KEY,
                guest_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                access_level TEXT NOT NULL,
                valid_from TIMESTAMP NOT NULL,
                valid_until TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                usage_count INTEGER DEFAULT 0,
                max_usage INTEGER DEFAULT 100,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guest_id) REFERENCES guests (id),
                FOREIGN KEY (session_id) REFERENCES checkin_sessions (id)
            )
        """)
        
        # Tabela GDPR soglasij
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gdpr_consents (
                id TEXT PRIMARY KEY,
                guest_id TEXT NOT NULL,
                consent_type TEXT NOT NULL,
                granted BOOLEAN NOT NULL,
                granted_at TIMESTAMP NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                consent_version TEXT DEFAULT '1.0',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guest_id) REFERENCES guests (id)
            )
        """)
        
        # Tabela preferenc
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS guest_preferences (
                id TEXT PRIMARY KEY,
                guest_id TEXT NOT NULL,
                category TEXT NOT NULL,
                preference_key TEXT NOT NULL,
                preference_value TEXT,
                priority INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guest_id) REFERENCES guests (id)
            )
        """)
        
        # Tabela dostopnih dnevnikov
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS access_logs (
                id TEXT PRIMARY KEY,
                guest_id TEXT NOT NULL,
                session_id TEXT,
                token_id TEXT,
                access_type TEXT NOT NULL,
                location TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT,
                success BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (guest_id) REFERENCES guests (id)
            )
        """)
        
        conn.commit()
        conn.close()
        
    def create_guest(self, first_name: str, last_name: str, email: str, 
                    phone: str = None, guest_type: GuestType = GuestType.INDIVIDUAL,
                    preferences: Dict[str, Any] = None) -> Guest:
        """Ustvari novega gosta"""
        guest_id = str(uuid.uuid4())
        guest = Guest(
            id=guest_id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            guest_type=guest_type,
            preferences=preferences or {},
            gdpr_consents={},
            created_at=datetime.now(),
            last_updated=datetime.now()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO guests (id, first_name, last_name, email, phone, guest_type, preferences, gdpr_consents)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            guest.id, guest.first_name, guest.last_name, guest.email,
            guest.phone, guest.guest_type.value, json.dumps(guest.preferences),
            json.dumps({})
        ))
        
        conn.commit()
        conn.close()
        
        return guest
    
    def record_gdpr_consent(self, guest_id: str, consent_type: ConsentType,
                           granted: bool, ip_address: str = None,
                           user_agent: str = None) -> GDPRConsent:
        """Zabeleži GDPR soglasje"""
        consent_id = str(uuid.uuid4())
        consent = GDPRConsent(
            id=consent_id,
            guest_id=guest_id,
            consent_type=consent_type,
            granted=granted,
            granted_at=datetime.now(),
            ip_address=ip_address,
            user_agent=user_agent,
            consent_version="1.0"
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO gdpr_consents (id, guest_id, consent_type, granted, granted_at, ip_address, user_agent, consent_version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            consent.id, consent.guest_id, consent.consent_type.value,
            consent.granted, consent.granted_at, consent.ip_address,
            consent.user_agent, consent.consent_version
        ))
        
        conn.commit()
        conn.close()
        
        return consent
    
    def start_checkin_session(self, guest_id: str, reservation_id: str = None,
                             room_number: str = None, special_requests: List[str] = None) -> CheckInSession:
        """Začni sejo prijave"""
        session_id = str(uuid.uuid4())
        access_code = secrets.token_hex(8).upper()
        qr_data = f"CHECKIN:{session_id}:{access_code}"
        
        # Pridobi preference gosta
        guest_preferences = self.get_guest_preferences(guest_id)
        
        session = CheckInSession(
            id=session_id,
            guest_id=guest_id,
            reservation_id=reservation_id,
            status=CheckInStatus.PENDING,
            check_in_time=None,
            check_out_time=None,
            room_number=room_number,
            access_code=access_code,
            qr_code_data=qr_data,
            preferences_snapshot=guest_preferences,
            special_requests=special_requests or [],
            created_at=datetime.now()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO checkin_sessions (id, guest_id, reservation_id, status, room_number, access_code, qr_code_data, preferences_snapshot, special_requests)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session.id, session.guest_id, session.reservation_id,
            session.status.value, session.room_number, session.access_code,
            session.qr_code_data, json.dumps(session.preferences_snapshot),
            json.dumps(session.special_requests)
        ))
        
        conn.commit()
        conn.close()
        
        return session
    
    def generate_qr_code(self, session_id: str) -> str:
        """Generiraj QR kodo za sejo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT qr_code_data FROM checkin_sessions WHERE id = ?", (session_id,))
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return None
            
        qr_data = result[0]
        
        # Ustvari QR kodo
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Pretvori v base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def complete_checkin(self, session_id: str, access_code: str) -> bool:
        """Dokončaj prijavo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Preveri dostopno kodo
        cursor.execute("""
            SELECT id, guest_id, access_code, status FROM checkin_sessions 
            WHERE id = ? AND access_code = ?
        """, (session_id, access_code))
        
        result = cursor.fetchone()
        if not result or result[3] != CheckInStatus.PENDING.value:
            conn.close()
            return False
        
        # Posodobi status
        cursor.execute("""
            UPDATE checkin_sessions 
            SET status = ?, check_in_time = ?
            WHERE id = ?
        """, (CheckInStatus.CHECKED_IN.value, datetime.now(), session_id))
        
        # Ustvari dostopni žeton
        self.create_access_token(result[1], session_id, AccessLevel.BASIC)
        
        # Zabeleži dostop
        self.log_access(result[1], session_id, "checkin", "reception")
        
        conn.commit()
        conn.close()
        
        return True
    
    def create_access_token(self, guest_id: str, session_id: str, 
                           access_level: AccessLevel, valid_hours: int = 24) -> AccessToken:
        """Ustvari dostopni žeton"""
        token_id = str(uuid.uuid4())
        token = secrets.token_urlsafe(32)
        
        access_token = AccessToken(
            id=token_id,
            guest_id=guest_id,
            session_id=session_id,
            token=token,
            access_level=access_level,
            valid_from=datetime.now(),
            valid_until=datetime.now() + timedelta(hours=valid_hours),
            is_active=True,
            usage_count=0,
            max_usage=100
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO access_tokens (id, guest_id, session_id, token, access_level, valid_from, valid_until, is_active, usage_count, max_usage)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            access_token.id, access_token.guest_id, access_token.session_id,
            access_token.token, access_token.access_level.value,
            access_token.valid_from, access_token.valid_until,
            access_token.is_active, access_token.usage_count, access_token.max_usage
        ))
        
        conn.commit()
        conn.close()
        
        return access_token
    
    def validate_access_token(self, token: str) -> Optional[AccessToken]:
        """Preveri veljavnost dostopnega žetona"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, guest_id, session_id, token, access_level, valid_from, valid_until, is_active, usage_count, max_usage
            FROM access_tokens 
            WHERE token = ? AND is_active = TRUE AND valid_until > ?
        """, (token, datetime.now()))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return None
            
        return AccessToken(
            id=result[0],
            guest_id=result[1],
            session_id=result[2],
            token=result[3],
            access_level=AccessLevel(result[4]),
            valid_from=datetime.fromisoformat(result[5]),
            valid_until=datetime.fromisoformat(result[6]),
            is_active=result[7],
            usage_count=result[8],
            max_usage=result[9]
        )
    
    def log_access(self, guest_id: str, session_id: str = None, 
                   access_type: str = "general", location: str = None,
                   ip_address: str = None, user_agent: str = None, success: bool = True):
        """Zabeleži dostop"""
        log_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO access_logs (id, guest_id, session_id, access_type, location, ip_address, user_agent, success)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (log_id, guest_id, session_id, access_type, location, ip_address, user_agent, success))
        
        conn.commit()
        conn.close()
    
    def get_guest_preferences(self, guest_id: str) -> Dict[str, Any]:
        """Pridobi preference gosta"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT category, preference_key, preference_value, priority
            FROM guest_preferences 
            WHERE guest_id = ?
            ORDER BY priority DESC
        """, (guest_id,))
        
        results = cursor.fetchall()
        conn.close()
        
        preferences = {}
        for category, key, value, priority in results:
            if category not in preferences:
                preferences[category] = {}
            preferences[category][key] = {
                'value': value,
                'priority': priority
            }
        
        return preferences
    
    def update_guest_preferences(self, guest_id: str, category: str, 
                                preferences: Dict[str, Any]):
        """Posodobi preference gosta"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for key, value in preferences.items():
            pref_id = str(uuid.uuid4())
            priority = value.get('priority', 1) if isinstance(value, dict) else 1
            pref_value = value.get('value') if isinstance(value, dict) else value
            
            cursor.execute("""
                INSERT OR REPLACE INTO guest_preferences (id, guest_id, category, preference_key, preference_value, priority, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (pref_id, guest_id, category, key, str(pref_value), priority, datetime.now()))
        
        conn.commit()
        conn.close()
    
    def get_checkin_analytics(self) -> Dict[str, Any]:
        """Pridobi analitiko prijav"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Skupno število prijav
        cursor.execute("SELECT COUNT(*) FROM checkin_sessions")
        total_checkins = cursor.fetchone()[0]
        
        # Prijave po statusu
        cursor.execute("""
            SELECT status, COUNT(*) 
            FROM checkin_sessions 
            GROUP BY status
        """)
        status_counts = dict(cursor.fetchall())
        
        # Povprečen čas prijave
        cursor.execute("""
            SELECT AVG(julianday(check_in_time) - julianday(created_at)) * 24 * 60
            FROM checkin_sessions 
            WHERE check_in_time IS NOT NULL
        """)
        avg_checkin_time = cursor.fetchone()[0] or 0
        
        # GDPR soglasja
        cursor.execute("""
            SELECT consent_type, granted, COUNT(*)
            FROM gdpr_consents
            GROUP BY consent_type, granted
        """)
        gdpr_stats = {}
        for consent_type, granted, count in cursor.fetchall():
            if consent_type not in gdpr_stats:
                gdpr_stats[consent_type] = {'granted': 0, 'denied': 0}
            gdpr_stats[consent_type]['granted' if granted else 'denied'] = count
        
        conn.close()
        
        return {
            'total_checkins': total_checkins,
            'status_distribution': status_counts,
            'average_checkin_time_minutes': round(avg_checkin_time, 2),
            'gdpr_consent_stats': gdpr_stats,
            'generated_at': datetime.now().isoformat()
        }
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Pridobi podatke za dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Aktivne seje
        cursor.execute("""
            SELECT COUNT(*) FROM checkin_sessions 
            WHERE status = 'checked_in'
        """)
        active_sessions = cursor.fetchone()[0]
        
        # Danes prijavljeni
        cursor.execute("""
            SELECT COUNT(*) FROM checkin_sessions 
            WHERE DATE(check_in_time) = DATE('now')
        """)
        today_checkins = cursor.fetchone()[0]
        
        # Nedavni dostopi
        cursor.execute("""
            SELECT g.first_name, g.last_name, al.access_type, al.location, al.timestamp
            FROM access_logs al
            JOIN guests g ON al.guest_id = g.id
            ORDER BY al.timestamp DESC
            LIMIT 10
        """)
        recent_access = [
            {
                'guest_name': f"{row[0]} {row[1]}",
                'access_type': row[2],
                'location': row[3],
                'timestamp': row[4]
            }
            for row in cursor.fetchall()
        ]
        
        conn.close()
        
        return {
            'active_sessions': active_sessions,
            'today_checkins': today_checkins,
            'recent_access': recent_access,
            'system_status': 'operational',
            'last_updated': datetime.now().isoformat()
        }

# Demo funkcije
def load_demo_data(system: UltimateDigitalCheckIn):
    """Naloži demo podatke"""
    
    # Demo gostje
    guests = [
        {
            'first_name': 'Ana',
            'last_name': 'Novak',
            'email': 'ana.novak@email.com',
            'phone': '+386 40 123 456',
            'guest_type': GuestType.VIP,
            'preferences': {
                'room': {'floor': 'high', 'view': 'sea'},
                'dining': {'diet': 'vegetarian', 'allergies': []},
                'services': {'spa': True, 'gym': True}
            }
        },
        {
            'first_name': 'Marko',
            'last_name': 'Kovač',
            'email': 'marko.kovac@email.com',
            'phone': '+386 41 234 567',
            'guest_type': GuestType.BUSINESS,
            'preferences': {
                'room': {'wifi': 'premium', 'workspace': True},
                'dining': {'breakfast': 'early'},
                'services': {'laundry': 'express'}
            }
        }
    ]
    
    for guest_data in guests:
        guest = system.create_guest(**guest_data)
        
        # Dodaj GDPR soglasja
        system.record_gdpr_consent(guest.id, ConsentType.MARKETING, True)
        system.record_gdpr_consent(guest.id, ConsentType.ANALYTICS, True)
        system.record_gdpr_consent(guest.id, ConsentType.PERSONALIZATION, True)
        
        # Začni sejo prijave
        session = system.start_checkin_session(
            guest.id, 
            reservation_id=f"RES-{guest.id[:8]}",
            room_number=f"20{len(guest.id) % 10}",
            special_requests=['Late checkout', 'Extra towels']
        )
        
        # Dokončaj prijavo
        system.complete_checkin(session.id, session.access_code)

def demo_digital_checkin():
    """Demo digitalne prijave"""
    print("🏨 ULTIMATE DIGITAL CHECK-IN SYSTEM")
    print("=" * 50)
    
    # Inicializiraj sistem
    system = UltimateDigitalCheckIn()
    
    # Naloži demo podatke
    load_demo_data(system)
    
    # Prikaži analitiko
    analytics = system.get_checkin_analytics()
    print(f"\n📊 ANALITIKA PRIJAV:")
    print(f"Skupno prijav: {analytics['total_checkins']}")
    print(f"Povprečen čas prijave: {analytics['average_checkin_time_minutes']} min")
    print(f"Distribucija statusov: {analytics['status_distribution']}")
    
    # Prikaži dashboard podatke
    dashboard = system.get_dashboard_data()
    print(f"\n📈 DASHBOARD:")
    print(f"Aktivne seje: {dashboard['active_sessions']}")
    print(f"Danes prijavljeni: {dashboard['today_checkins']}")
    print(f"Status sistema: {dashboard['system_status']}")
    
    print(f"\n✅ Sistem digitalne prijave je pripravljen!")
    print(f"💾 Baza: ultimate_digital_checkin.db")

if __name__ == "__main__":
    demo_digital_checkin()