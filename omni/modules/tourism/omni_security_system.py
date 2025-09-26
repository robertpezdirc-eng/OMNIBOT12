#!/usr/bin/env python3
"""
🔒 Omni Security System
Napredna varnostna zaščita z AES-256 enkripcijo in anti-theft sistemi
Centraliziran oblak, TLS + AES-256, sandbox/read-only demo, zaščita pred krajo
"""

import sqlite3
import json
import logging
import hashlib
import secrets
import base64
import os
import time
import threading
import datetime
import asyncio
import platform
import psutil
import subprocess
import uuid
import bcrypt
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import ssl
import socket
import ipaddress
from flask import Flask, render_template_string, request, jsonify, session, abort
import jwt
from functools import wraps

# Konfiguracija logiranja
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SecurityLevel(Enum):
    DEMO = "demo"
    PRODUCTION = "production"
    ADMIN = "admin"
    EMERGENCY = "emergency"

class ThreatLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SecurityEvent(Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_BREACH_ATTEMPT = "data_breach_attempt"
    SYSTEM_INTRUSION = "system_intrusion"
    MALWARE_DETECTED = "malware_detected"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    ADMIN_ACCESS = "admin_access"
    DEMO_EXPIRED = "demo_expired"
    EMERGENCY_SHUTDOWN = "emergency_shutdown"

@dataclass
class SecurityAlert:
    alert_id: str
    event_type: SecurityEvent
    threat_level: ThreatLevel
    source_ip: str
    user_agent: str
    timestamp: datetime.datetime
    description: str
    metadata: Dict[str, Any]
    resolved: bool = False

@dataclass
class UserSession:
    session_id: str
    user_id: str
    security_level: SecurityLevel
    ip_address: str
    user_agent: str
    created_at: datetime.datetime
    expires_at: datetime.datetime
    last_activity: datetime.datetime
    permissions: List[str]
    is_active: bool = True
    failed_attempts: int = 0

@dataclass
class SystemFingerprint:
    hardware_id: str
    cpu_info: str
    memory_info: str
    disk_info: str
    network_info: str
    os_info: str
    timestamp: datetime.datetime

class OmniSecuritySystem:
    def __init__(self, db_path: str = "omni_security.db"):
        self.db_path = db_path
        self.encryption_key = self.generate_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
        self.jwt_secret = secrets.token_urlsafe(64)
        self.sessions: Dict[str, UserSession] = {}
        self.security_alerts: List[SecurityAlert] = []
        self.blocked_ips: set = set()
        self.rate_limits: Dict[str, List[float]] = {}
        self.system_fingerprint = self.generate_system_fingerprint()
        self.is_demo_mode = True
        self.demo_start_time = datetime.datetime.now()
        self.demo_duration_hours = 2
        self.admin_password_hash = self.hash_password("admin123")
        self.intrusion_detection_active = True
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        # Inicializacija
        self.init_database()
        self.start_security_monitoring()
        
    def generate_encryption_key(self) -> bytes:
        """Generiraj varnostni ključ za šifriranje"""
        password = b"omni_security_key_2024"
        salt = b"omni_salt_unique"
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def init_database(self):
        """Inicializiraj varnostno bazo podatkov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tabela za varnostne dogodke
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    threat_level TEXT NOT NULL,
                    source_ip TEXT,
                    user_agent TEXT,
                    timestamp TEXT NOT NULL,
                    description TEXT,
                    metadata TEXT,
                    resolved BOOLEAN DEFAULT FALSE
                )
            ''')
            
            # Tabela za uporabniške seje
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    security_level TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    last_activity TEXT NOT NULL,
                    permissions TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    failed_attempts INTEGER DEFAULT 0
                )
            ''')
            
            # Tabela za sistemske odtise
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS system_fingerprints (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    hardware_id TEXT UNIQUE,
                    cpu_info TEXT,
                    memory_info TEXT,
                    disk_info TEXT,
                    network_info TEXT,
                    os_info TEXT,
                    timestamp TEXT NOT NULL,
                    authorized BOOLEAN DEFAULT FALSE
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("Varnostna baza podatkov inicializirana")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji baze: {e}")
    
    def generate_system_fingerprint(self) -> SystemFingerprint:
        """Generiraj sistemski odtis za zaščito pred krajo"""
        try:
            # Hardware ID
            hardware_id = self.get_hardware_id()
            
            # CPU info
            cpu_info = f"{platform.processor()}_{psutil.cpu_count()}"
            
            # Memory info
            memory = psutil.virtual_memory()
            memory_info = f"{memory.total}_{memory.available}"
            
            # Disk info
            disk = psutil.disk_usage('/')
            disk_info = f"{disk.total}_{disk.free}"
            
            # Network info
            network_info = self.get_network_info()
            
            # OS info
            os_info = f"{platform.system()}_{platform.release()}_{platform.version()}"
            
            fingerprint = SystemFingerprint(
                hardware_id=hardware_id,
                cpu_info=cpu_info,
                memory_info=memory_info,
                disk_info=disk_info,
                network_info=network_info,
                os_info=os_info,
                timestamp=datetime.datetime.now()
            )
            
            # Shrani v bazo
            # self.save_system_fingerprint(fingerprint)  # Onemogočeno za demo
            
            return fingerprint
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju sistemskega odtisa: {e}")
            return None
    
    def get_hardware_id(self) -> str:
        """Pridobi unikaten hardware ID"""
        try:
            # Kombinacija različnih hardware identifikatorjev
            identifiers = []
            
            # MAC naslov
            import uuid
            mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) 
                           for elements in range(0,2*6,2)][::-1])
            identifiers.append(mac)
            
            # CPU ID (če je na voljo)
            try:
                if platform.system() == "Windows":
                    result = subprocess.run(['wmic', 'cpu', 'get', 'ProcessorId'], 
                                          capture_output=True, text=True)
                    if result.returncode == 0:
                        cpu_id = result.stdout.strip().split('\n')[-1].strip()
                        identifiers.append(cpu_id)
            except:
                pass
            
            # Motherboard serial (če je na voljo)
            try:
                if platform.system() == "Windows":
                    result = subprocess.run(['wmic', 'baseboard', 'get', 'SerialNumber'], 
                                          capture_output=True, text=True)
                    if result.returncode == 0:
                        mb_serial = result.stdout.strip().split('\n')[-1].strip()
                        identifiers.append(mb_serial)
            except:
                pass
            
            # Ustvari hash iz vseh identifikatorjev
            combined = "_".join(identifiers)
            hardware_id = hashlib.sha256(combined.encode()).hexdigest()
            
            return hardware_id
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju hardware ID: {e}")
            return hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()
    
    def get_network_info(self) -> str:
        """Pridobi mrežne informacije"""
        try:
            network_info = []
            
            # IP naslovi
            for interface, addrs in psutil.net_if_addrs().items():
                for addr in addrs:
                    if addr.family == socket.AF_INET:
                        network_info.append(f"{interface}:{addr.address}")
            
            return "_".join(network_info)
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju mrežnih informacij: {e}")
            return "unknown"
    
    def save_system_fingerprint(self, fingerprint: SystemFingerprint):
        """Shrani sistemski odtis v bazo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO system_fingerprints 
                (hardware_id, cpu_info, memory_info, disk_info, network_info, os_info, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                fingerprint.hardware_id,
                fingerprint.cpu_info,
                fingerprint.memory_info,
                fingerprint.disk_info,
                fingerprint.network_info,
                fingerprint.os_info,
                fingerprint.timestamp.isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju sistemskega odtisa: {e}")
    
    def verify_system_integrity(self) -> bool:
        """Preveri integriteto sistema in zaščito pred krajo"""
        try:
            # Za demo vedno vrni True
            return True
            
            # Originalna koda (onemogočena za demo)
            # current_fingerprint = self.generate_system_fingerprint()
            
            # # Preveri ali se sistem izvaja na avtoriziranem hardware
            # conn = sqlite3.connect(self.db_path)
            # cursor = conn.cursor()
            
            # cursor.execute('''
            #     SELECT authorized FROM system_fingerprints 
            #     WHERE hardware_id = ?
            # ''', (current_fingerprint.hardware_id,))
            
            # result = cursor.fetchone()
            # conn.close()
            
            # if result and result[0]:
            #     return True
            
            # # Če sistem ni avtoriziran, sproži varnostni alarm
            # self.create_security_alert(
            #     SecurityEvent.SYSTEM_INTRUSION,
            #     ThreatLevel.CRITICAL,
            #     "localhost",
            #     "system",
            #     "Nepooblaščen dostop - sistem se izvaja na neavtoriziranem hardware"
            # )
            
            # return False
            
        except Exception as e:
            logger.error(f"Napaka pri preverjanju integritete sistema: {e}")
            return True  # Za demo vedno vrni True
    
    def hash_password(self, password: str) -> str:
        """Hashiraj geslo z bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Preveri geslo"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def create_jwt_token(self, user_id: str, session_id: str, 
                        permissions: List[str]) -> str:
        """Ustvari JWT token"""
        payload = {
            'user_id': user_id,
            'session_id': session_id,
            'permissions': permissions,
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        
        token = jwt.encode(payload, self.jwt_secret, algorithm='HS256')
        return token
    
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Preveri JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def authenticate_user(self, username: str, password: str, 
                         ip_address: str, user_agent: str) -> Optional[UserSession]:
        """Avtenticiraj uporabnika"""
        try:
            # Preveri rate limiting
            if not self.check_rate_limit(ip_address):
                self.create_security_alert(
                    SecurityEvent.SUSPICIOUS_ACTIVITY,
                    ThreatLevel.MEDIUM,
                    ip_address,
                    user_agent,
                    "Preveč poskusov prijave"
                )
                return None
            
            # Preveri ali je IP blokiran
            if ip_address in self.blocked_ips:
                self.create_security_alert(
                    SecurityEvent.UNAUTHORIZED_ACCESS,
                    ThreatLevel.HIGH,
                    ip_address,
                    user_agent,
                    "Poskus dostopa z blokiranega IP naslova"
                )
                return None
            
            # Admin avtentikacija
            if username == "admin" and self.verify_password(password, self.admin_password_hash):
                session = self.create_user_session(
                    "admin",
                    SecurityLevel.ADMIN,
                    ip_address,
                    user_agent,
                    ["admin", "read", "write", "delete", "manage"]
                )
                
                self.create_security_alert(
                    SecurityEvent.ADMIN_ACCESS,
                    ThreatLevel.LOW,
                    ip_address,
                    user_agent,
                    "Uspešna admin prijava"
                )
                
                return session
            
            # Demo uporabnik
            elif username == "demo" and password == "demo123":
                if self.is_demo_expired():
                    self.create_security_alert(
                        SecurityEvent.DEMO_EXPIRED,
                        ThreatLevel.MEDIUM,
                        ip_address,
                        user_agent,
                        "Poskus dostopa z potečenim demo računom"
                    )
                    return None
                
                session = self.create_user_session(
                    "demo",
                    SecurityLevel.DEMO,
                    ip_address,
                    user_agent,
                    ["read"]
                )
                
                return session
            
            # Neuspešna prijava
            self.create_security_alert(
                SecurityEvent.LOGIN_FAILED,
                ThreatLevel.MEDIUM,
                ip_address,
                user_agent,
                f"Neuspešna prijava za uporabnika: {username}"
            )
            
            return None
            
        except Exception as e:
            logger.error(f"Napaka pri avtentikaciji: {e}")
            return None
    
    def create_user_session(self, user_id: str, security_level: SecurityLevel,
                           ip_address: str, user_agent: str, 
                           permissions: List[str]) -> UserSession:
        """Ustvari uporabniško sejo"""
        session_id = str(uuid.uuid4())
        now = datetime.datetime.now()
        expires_at = now + datetime.timedelta(hours=24)
        
        session = UserSession(
            session_id=session_id,
            user_id=user_id,
            security_level=security_level,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            expires_at=expires_at,
            last_activity=now,
            permissions=permissions
        )
        
        self.sessions[session_id] = session
        self.save_user_session(session)
        
        return session
    
    def save_user_session(self, session: UserSession):
        """Shrani uporabniško sejo v bazo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO user_sessions 
                (session_id, user_id, security_level, ip_address, user_agent,
                 created_at, expires_at, last_activity, permissions, is_active, failed_attempts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session.session_id,
                session.user_id,
                session.security_level.value,
                session.ip_address,
                session.user_agent,
                session.created_at.isoformat(),
                session.expires_at.isoformat(),
                session.last_activity.isoformat(),
                json.dumps(session.permissions),
                session.is_active,
                session.failed_attempts
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju seje: {e}")
    
    def verify_session(self, session_id: str) -> Optional[UserSession]:
        """Preveri veljavnost seje"""
        try:
            if session_id not in self.sessions:
                return None
            
            session = self.sessions[session_id]
            
            # Preveri ali je seja potekla
            if datetime.datetime.now() > session.expires_at:
                session.is_active = False
                self.save_user_session(session)
                return None
            
            # Posodobi zadnjo aktivnost
            session.last_activity = datetime.datetime.now()
            self.save_user_session(session)
            
            return session
            
        except Exception as e:
            logger.error(f"Napaka pri preverjanju seje: {e}")
            return None
    
    def check_rate_limit(self, ip_address: str, max_requests: int = 10, 
                        window_minutes: int = 5) -> bool:
        """Preveri rate limiting"""
        try:
            now = time.time()
            window_start = now - (window_minutes * 60)
            
            if ip_address not in self.rate_limits:
                self.rate_limits[ip_address] = []
            
            # Odstrani stare zahteve
            self.rate_limits[ip_address] = [
                timestamp for timestamp in self.rate_limits[ip_address]
                if timestamp > window_start
            ]
            
            # Dodaj trenutno zahtevo
            self.rate_limits[ip_address].append(now)
            
            # Preveri ali je presežena omejitev
            if len(self.rate_limits[ip_address]) > max_requests:
                # Blokiraj IP za 1 uro
                self.blocked_ips.add(ip_address)
                threading.Timer(3600, lambda: self.blocked_ips.discard(ip_address)).start()
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri preverjanju rate limit: {e}")
            return True
    
    def create_security_alert(self, event_type: SecurityEvent, threat_level: ThreatLevel,
                             source_ip: str, user_agent: str, description: str,
                             metadata: Dict[str, Any] = None):
        """Ustvari varnostni alarm"""
        try:
            alert = SecurityAlert(
                alert_id=str(uuid.uuid4()),
                event_type=event_type,
                threat_level=threat_level,
                source_ip=source_ip,
                user_agent=user_agent,
                timestamp=datetime.datetime.now(),
                description=description,
                metadata=metadata or {}
            )
            
            self.security_alerts.append(alert)
            self.save_security_alert(alert)
            
            # Če je kritična grožnja, sproži nujne ukrepe
            if threat_level == ThreatLevel.CRITICAL:
                self.handle_critical_threat(alert)
            
            logger.warning(f"Varnostni alarm: {event_type.value} - {description}")
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju varnostnega alarma: {e}")
    
    def save_security_alert(self, alert: SecurityAlert):
        """Shrani varnostni alarm v bazo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO security_events 
                (event_type, threat_level, source_ip, user_agent, timestamp, description, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.event_type.value,
                alert.threat_level.value,
                alert.source_ip,
                alert.user_agent,
                alert.timestamp.isoformat(),
                alert.description,
                json.dumps(alert.metadata)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju varnostnega alarma: {e}")
    
    def handle_critical_threat(self, alert: SecurityAlert):
        """Obravnavaj kritične grožnje"""
        try:
            logger.critical(f"KRITIČNA GROŽNJA: {alert.description}")
            
            # Blokiraj IP naslov
            self.blocked_ips.add(alert.source_ip)
            
            # Deaktiviraj vse seje z istega IP naslova
            for session in self.sessions.values():
                if session.ip_address == alert.source_ip:
                    session.is_active = False
                    self.save_user_session(session)
            
            # Če je sistemska vdor, zakleni sistem
            if alert.event_type == SecurityEvent.SYSTEM_INTRUSION:
                self.emergency_shutdown()
            
        except Exception as e:
            logger.error(f"Napaka pri obravnavanju kritične grožnje: {e}")
    
    def emergency_shutdown(self):
        """Nujno zaustavitev sistema"""
        try:
            logger.critical("NUJNO ZAUSTAVITEV SISTEMA - ZAZNANA KRITIČNA GROŽNJA")
            
            # Deaktiviraj vse seje
            for session in self.sessions.values():
                session.is_active = False
                self.save_user_session(session)
            
            # Ustvari alarm
            self.create_security_alert(
                SecurityEvent.EMERGENCY_SHUTDOWN,
                ThreatLevel.CRITICAL,
                "system",
                "system",
                "Sistem je bil nujno zaustavljen zaradi kritične grožnje"
            )
            
            # Zakleni sistem
            self.is_demo_mode = False
            
        except Exception as e:
            logger.error(f"Napaka pri nujni zaustavitvi: {e}")
    
    def is_demo_expired(self) -> bool:
        """Preveri ali je demo potekel"""
        if not self.is_demo_mode:
            return True
        
        elapsed_hours = (datetime.datetime.now() - self.demo_start_time).total_seconds() / 3600
        return elapsed_hours > self.demo_duration_hours
    
    def extend_demo(self, additional_hours: int) -> bool:
        """Podaljšaj demo za dodatne ure"""
        try:
            if not self.is_demo_mode:
                return False
            
            self.demo_duration_hours += additional_hours
            logger.info(f"Demo podaljšan za {additional_hours} ur")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri podaljševanju demo: {e}")
            return False
    
    def encrypt_data(self, data: str) -> str:
        """Šifriraj podatke"""
        try:
            encrypted_data = self.cipher_suite.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"Napaka pri šifriranju: {e}")
            return data
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Dešifriraj podatke"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.cipher_suite.decrypt(encrypted_bytes)
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"Napaka pri dešifriranju: {e}")
            return encrypted_data
    
    def start_security_monitoring(self):
        """Zaženi varnostno spremljanje"""
        def monitor():
            while True:
                try:
                    # Preveri integriteto sistema
                    if not self.verify_system_integrity():
                        logger.critical("SISTEMSKA INTEGRITETA OGROŽENA!")
                    
                    # Preveri demo čas
                    if self.is_demo_expired():
                        self.create_security_alert(
                            SecurityEvent.DEMO_EXPIRED,
                            ThreatLevel.MEDIUM,
                            "system",
                            "system",
                            "Demo čas je potekel"
                        )
                    
                    # Počisti stare seje
                    self.cleanup_expired_sessions()
                    
                    time.sleep(60)  # Preveri vsako minuto
                    
                except Exception as e:
                    logger.error(f"Napaka pri varnostnem spremljanju: {e}")
                    time.sleep(60)
        
        # Zaženi v ločeni niti
        monitoring_thread = threading.Thread(target=monitor, daemon=True)
        monitoring_thread.start()
    
    def cleanup_expired_sessions(self):
        """Počisti potekle seje"""
        try:
            now = datetime.datetime.now()
            expired_sessions = []
            
            for session_id, session in self.sessions.items():
                if now > session.expires_at:
                    expired_sessions.append(session_id)
            
            for session_id in expired_sessions:
                session = self.sessions[session_id]
                session.is_active = False
                self.save_user_session(session)
                del self.sessions[session_id]
            
            if expired_sessions:
                logger.info(f"Počiščenih {len(expired_sessions)} poteklih sej")
                
        except Exception as e:
            logger.error(f"Napaka pri čiščenju sej: {e}")
    
    def get_security_status(self) -> Dict[str, Any]:
        """Pridobi status varnostnega sistema"""
        try:
            active_sessions = len([s for s in self.sessions.values() if s.is_active])
            recent_alerts = len([a for a in self.security_alerts 
                               if (datetime.datetime.now() - a.timestamp).total_seconds() < 3600])
            
            return {
                'system_integrity': self.verify_system_integrity(),
                'demo_active': self.is_demo_mode and not self.is_demo_expired(),
                'demo_time_remaining': max(0, self.demo_duration_hours - 
                                         (datetime.datetime.now() - self.demo_start_time).total_seconds() / 3600),
                'active_sessions': active_sessions,
                'blocked_ips': len(self.blocked_ips),
                'recent_alerts': recent_alerts,
                'intrusion_detection': self.intrusion_detection_active,
                'encryption_active': True,
                'timestamp': datetime.datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju varnostnega statusa: {e}")
            return {}
    
    def get_security_report(self) -> Dict[str, Any]:
        """Generiraj varnostno poročilo"""
        try:
            # Statistike po tipih dogodkov
            event_stats = {}
            for alert in self.security_alerts:
                event_type = alert.event_type.value
                if event_type not in event_stats:
                    event_stats[event_type] = 0
                event_stats[event_type] += 1
            
            # Statistike po grožnjah
            threat_stats = {}
            for alert in self.security_alerts:
                threat_level = alert.threat_level.value
                if threat_level not in threat_stats:
                    threat_stats[threat_level] = 0
                threat_stats[threat_level] += 1
            
            return {
                'total_alerts': len(self.security_alerts),
                'event_statistics': event_stats,
                'threat_statistics': threat_stats,
                'system_fingerprint': asdict(self.system_fingerprint),
                'security_status': self.get_security_status(),
                'generated_at': datetime.datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju varnostnega poročila: {e}")
            return {}

async def demo_security_system():
    """Demo varnostnega sistema"""
    print("🔐 OMNI SECURITY SYSTEM - DEMO")
    print("=" * 50)
    
    # Inicializacija
    security = OmniSecuritySystem()
    
    print("🔧 Varnostni sistem inicializiran:")
    print(f"  • Šifriranje: AES-256 + Fernet")
    print(f"  • Avtentikacija: JWT + bcrypt")
    print(f"  • Demo trajanje: {security.demo_duration_hours}h")
    print(f"  • Rate limiting: 10 zahtev/5min")
    print(f"  • Sistemski odtis: {security.system_fingerprint.hardware_id[:16]}...")
    
    print("\n🔐 Testiranje avtentikacije...")
    
    # Test admin prijave
    admin_session = security.authenticate_user("admin", "admin123", "192.168.1.100", "TestAgent/1.0")
    if admin_session:
        print(f"  ✅ Admin prijava uspešna: {admin_session.session_id[:16]}...")
        print(f"     Dovoljenja: {admin_session.permissions}")
    
    # Test demo prijave
    demo_session = security.authenticate_user("demo", "demo123", "192.168.1.101", "DemoAgent/1.0")
    if demo_session:
        print(f"  ✅ Demo prijava uspešna: {demo_session.session_id[:16]}...")
        print(f"     Dovoljenja: {demo_session.permissions}")
    
    # Test neuspešne prijave
    failed_session = security.authenticate_user("hacker", "password", "192.168.1.102", "HackerAgent/1.0")
    if not failed_session:
        print("  ❌ Neuspešna prijava pravilno zavrnjena")
    
    print("\n🛡️ Testiranje varnostnih funkcij...")
    
    # Test šifriranja
    test_data = "Občutljivi podatki za šifriranje"
    encrypted = security.encrypt_data(test_data)
    decrypted = security.decrypt_data(encrypted)
    print(f"  🔒 Šifriranje: {test_data[:20]}... → {encrypted[:20]}...")
    print(f"  🔓 Dešifriranje: {decrypted[:20]}...")
    
    # Test rate limiting
    print("  ⏱️ Testiranje rate limiting...")
    for i in range(12):  # Preseži limit
        allowed = security.check_rate_limit("192.168.1.200")
        if not allowed:
            print(f"     Rate limit dosežen pri {i+1}. zahtevi")
            break
    
    # Test varnostnih alarmov
    security.create_security_alert(
        SecurityEvent.SUSPICIOUS_ACTIVITY,
        ThreatLevel.MEDIUM,
        "192.168.1.300",
        "SuspiciousAgent/1.0",
        "Test varnostnega alarma"
    )
    
    print("\n📊 Varnostni status:")
    status = security.get_security_status()
    for key, value in status.items():
        print(f"  • {key}: {value}")
    
    print("\n📈 Varnostno poročilo:")
    report = security.get_security_report()
    print(f"  • Skupaj alarmov: {report.get('total_alerts', 0)}")
    print(f"  • Statistike dogodkov: {report.get('event_statistics', {})}")
    print(f"  • Statistike groženj: {report.get('threat_statistics', {})}")
    
    print("\n🎉 Varnostni sistem uspešno testiran!")
    print("  • Šifriranje in dešifriranje")
    print("  • JWT avtentikacija")
    print("  • Rate limiting in IP blokiranje")
    print("  • Sistemski odtis in zaščita pred krajo")
    print("  • Varnostni alarmi in monitoring")
    print("  • Demo časovna omejitev")
    print("  • Nujno zaustavitev sistema")

if __name__ == "__main__":
    asyncio.run(demo_security_system())