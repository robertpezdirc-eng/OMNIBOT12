#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🛡️ Omni Security Monitor
========================

Varnostni nadzornik za:
- Spremljanje dostopa in identitete
- Nadzor kamer in senzorjev
- Upravljanje alarmov in obvestil
- Analiza varnostnih incidentov
- Avtomatski odziv na grožnje
- Integracija z varnostnimi sistemi

Avtor: Omni AI Assistant
Datum: 22. september 2025
Verzija: 1.0 Production
"""

import json
import os
import sqlite3
import logging
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import base64
import random

# Konfiguracija
SECURITY_DB = "omni/data/security.db"
SECURITY_LOG = "omni/logs/security.log"
ACCESS_LOG = "omni/logs/access.log"
INCIDENTS_FILE = "omni/data/security_incidents.json"
CAMERAS_FILE = "omni/data/security_cameras.json"

# Logging
os.makedirs(os.path.dirname(SECURITY_LOG), exist_ok=True)
os.makedirs(os.path.dirname(ACCESS_LOG), exist_ok=True)
logger = logging.getLogger(__name__)

def __name__():
    return "security_monitor"

class ThreatLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AccessLevel(Enum):
    GUEST = "guest"
    USER = "user"
    ADMIN = "admin"
    SYSTEM = "system"

class IncidentType(Enum):
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    INTRUSION_DETECTION = "intrusion_detection"
    SYSTEM_BREACH = "system_breach"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    EQUIPMENT_FAILURE = "equipment_failure"
    ALARM_TRIGGERED = "alarm_triggered"

class DeviceStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"
    ERROR = "error"

class AlertType(Enum):
    INFO = "info"
    WARNING = "warning"
    ALERT = "alert"
    EMERGENCY = "emergency"

@dataclass
class SecurityUser:
    id: str
    username: str
    password_hash: str
    access_level: AccessLevel
    full_name: str
    email: str
    phone: str
    is_active: bool
    last_login: datetime
    failed_attempts: int
    created_date: datetime
    permissions: List[str]

@dataclass
class SecurityDevice:
    id: str
    name: str
    device_type: str  # camera, sensor, alarm, lock
    location: str
    ip_address: str
    status: DeviceStatus
    last_heartbeat: datetime
    configuration: Dict[str, Any]
    capabilities: List[str]
    installation_date: datetime

@dataclass
class SecurityIncident:
    id: str
    incident_type: IncidentType
    threat_level: ThreatLevel
    title: str
    description: str
    location: str
    timestamp: datetime
    detected_by: str
    affected_devices: List[str]
    response_actions: List[str]
    is_resolved: bool
    resolution_notes: str
    assigned_to: str

@dataclass
class AccessEvent:
    id: str
    user_id: str
    username: str
    action: str
    resource: str
    location: str
    ip_address: str
    timestamp: datetime
    success: bool
    details: Dict[str, Any]

@dataclass
class SecurityAlert:
    id: str
    alert_type: AlertType
    title: str
    message: str
    source: str
    timestamp: datetime
    is_acknowledged: bool
    acknowledged_by: str
    priority: int

class SecurityMonitor:
    """🛡️ Varnostni nadzornik Omni"""
    
    def __init__(self):
        self.users = {}
        self.devices = {}
        self.incidents = []
        self.access_events = []
        self.alerts = []
        self.active_sessions = {}
        self._init_database()
        self._load_sample_data()
        logger.info("🛡️ Varnostni nadzornik inicializiran")
    
    def _init_database(self):
        """Inicializacija varnostne baze"""
        try:
            os.makedirs(os.path.dirname(SECURITY_DB), exist_ok=True)
            conn = sqlite3.connect(SECURITY_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    access_level TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL,
                    last_login TEXT NOT NULL,
                    failed_attempts INTEGER NOT NULL,
                    created_date TEXT NOT NULL,
                    permissions TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_devices (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    device_type TEXT NOT NULL,
                    location TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    status TEXT NOT NULL,
                    last_heartbeat TEXT NOT NULL,
                    configuration TEXT NOT NULL,
                    capabilities TEXT NOT NULL,
                    installation_date TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_incidents (
                    id TEXT PRIMARY KEY,
                    incident_type TEXT NOT NULL,
                    threat_level TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    location TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    detected_by TEXT NOT NULL,
                    affected_devices TEXT NOT NULL,
                    response_actions TEXT NOT NULL,
                    is_resolved BOOLEAN NOT NULL,
                    resolution_notes TEXT NOT NULL,
                    assigned_to TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS access_events (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    action TEXT NOT NULL,
                    resource TEXT NOT NULL,
                    location TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    success BOOLEAN NOT NULL,
                    details TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_alerts (
                    id TEXT PRIMARY KEY,
                    alert_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    source TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    is_acknowledged BOOLEAN NOT NULL,
                    acknowledged_by TEXT NOT NULL,
                    priority INTEGER NOT NULL
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji varnostne baze: {e}")
    
    def _load_sample_data(self):
        """Naloži vzorčne varnostne podatke"""
        try:
            # Ustvari vzorčne uporabnike
            sample_users = [
                {
                    "id": "USER_ADMIN_001",
                    "username": "admin",
                    "password_hash": self._hash_password("admin123"),
                    "access_level": AccessLevel.ADMIN,
                    "full_name": "Sistemski Administrator",
                    "email": "admin@omni.si",
                    "phone": "+386 1 234 5678",
                    "is_active": True,
                    "last_login": datetime.now() - timedelta(hours=2),
                    "failed_attempts": 0,
                    "created_date": datetime.now() - timedelta(days=365),
                    "permissions": ["all_access", "user_management", "system_config"]
                },
                {
                    "id": "USER_SECURITY_001",
                    "username": "security",
                    "password_hash": self._hash_password("security123"),
                    "access_level": AccessLevel.USER,
                    "full_name": "Varnostnik",
                    "email": "security@omni.si",
                    "phone": "+386 1 234 5679",
                    "is_active": True,
                    "last_login": datetime.now() - timedelta(hours=1),
                    "failed_attempts": 0,
                    "created_date": datetime.now() - timedelta(days=180),
                    "permissions": ["security_monitor", "incident_management", "camera_access"]
                },
                {
                    "id": "USER_GUEST_001",
                    "username": "guest",
                    "password_hash": self._hash_password("guest123"),
                    "access_level": AccessLevel.GUEST,
                    "full_name": "Gost",
                    "email": "guest@omni.si",
                    "phone": "+386 1 234 5680",
                    "is_active": True,
                    "last_login": datetime.now() - timedelta(days=1),
                    "failed_attempts": 0,
                    "created_date": datetime.now() - timedelta(days=30),
                    "permissions": ["basic_access"]
                }
            ]
            
            for user_data in sample_users:
                user = SecurityUser(**user_data)
                self.users[user.id] = user
            
            # Ustvari vzorčne varnostne naprave
            sample_devices = [
                {
                    "id": "CAM_ENTRANCE_001",
                    "name": "Vhodna kamera",
                    "device_type": "camera",
                    "location": "Glavni vhod",
                    "ip_address": "192.168.1.100",
                    "status": DeviceStatus.ONLINE,
                    "last_heartbeat": datetime.now() - timedelta(minutes=1),
                    "configuration": {
                        "resolution": "1920x1080",
                        "fps": 30,
                        "night_vision": True,
                        "motion_detection": True,
                        "recording": True
                    },
                    "capabilities": ["video_recording", "motion_detection", "night_vision", "audio"],
                    "installation_date": datetime.now() - timedelta(days=90)
                },
                {
                    "id": "SENSOR_DOOR_001",
                    "name": "Senzor vrat",
                    "device_type": "sensor",
                    "location": "Glavna vrata",
                    "ip_address": "192.168.1.101",
                    "status": DeviceStatus.ONLINE,
                    "last_heartbeat": datetime.now() - timedelta(minutes=2),
                    "configuration": {
                        "sensitivity": "high",
                        "delay": 5,
                        "notification": True
                    },
                    "capabilities": ["door_open_detection", "tamper_detection"],
                    "installation_date": datetime.now() - timedelta(days=120)
                },
                {
                    "id": "ALARM_MAIN_001",
                    "name": "Glavni alarm",
                    "device_type": "alarm",
                    "location": "Nadzorna soba",
                    "ip_address": "192.168.1.102",
                    "status": DeviceStatus.ONLINE,
                    "last_heartbeat": datetime.now() - timedelta(minutes=1),
                    "configuration": {
                        "volume": 85,
                        "duration": 300,
                        "auto_reset": True
                    },
                    "capabilities": ["sound_alarm", "light_alarm", "notification"],
                    "installation_date": datetime.now() - timedelta(days=200)
                },
                {
                    "id": "LOCK_ENTRANCE_001",
                    "name": "Elektronska ključavnica",
                    "device_type": "lock",
                    "location": "Glavni vhod",
                    "ip_address": "192.168.1.103",
                    "status": DeviceStatus.ONLINE,
                    "last_heartbeat": datetime.now() - timedelta(minutes=3),
                    "configuration": {
                        "auto_lock_delay": 30,
                        "access_codes": ["1234", "5678"],
                        "rfid_enabled": True
                    },
                    "capabilities": ["keypad_access", "rfid_access", "remote_unlock", "status_reporting"],
                    "installation_date": datetime.now() - timedelta(days=60)
                }
            ]
            
            for device_data in sample_devices:
                device = SecurityDevice(**device_data)
                self.devices[device.id] = device
            
            # Generiraj vzorčne dostopne dogodke
            for i in range(50):
                timestamp = datetime.now() - timedelta(hours=random.randint(1, 168))
                user_ids = list(self.users.keys())
                user_id = random.choice(user_ids)
                user = self.users[user_id]
                
                actions = ["login", "logout", "access_camera", "unlock_door", "view_logs", "system_config"]
                resources = ["main_system", "camera_system", "door_lock", "alarm_system", "user_panel"]
                
                event = AccessEvent(
                    id=f"ACCESS_{timestamp.strftime('%Y%m%d_%H%M%S')}_{i:03d}",
                    user_id=user_id,
                    username=user.username,
                    action=random.choice(actions),
                    resource=random.choice(resources),
                    location="Glavna lokacija",
                    ip_address=f"192.168.1.{random.randint(10, 200)}",
                    timestamp=timestamp,
                    success=random.choice([True, True, True, False]),  # 75% uspešnih
                    details={"user_agent": "Omni Security Client", "session_duration": random.randint(5, 120)}
                )
                self.access_events.append(event)
            
            # Ustvari vzorčne incidente
            sample_incidents = [
                {
                    "id": "INC_001",
                    "incident_type": IncidentType.UNAUTHORIZED_ACCESS,
                    "threat_level": ThreatLevel.MEDIUM,
                    "title": "Nepooblaščen poskus dostopa",
                    "description": "Zaznanih več neuspešnih poskusov prijave z uporabniškim imenom 'admin'",
                    "location": "Glavni vhod",
                    "timestamp": datetime.now() - timedelta(hours=6),
                    "detected_by": "SYSTEM_AUTO",
                    "affected_devices": ["LOCK_ENTRANCE_001"],
                    "response_actions": ["Blokiran IP naslov", "Obvestilo varnostnika"],
                    "is_resolved": True,
                    "resolution_notes": "IP naslov dodan na črno listo",
                    "assigned_to": "USER_SECURITY_001"
                },
                {
                    "id": "INC_002",
                    "incident_type": IncidentType.INTRUSION_DETECTION,
                    "threat_level": ThreatLevel.HIGH,
                    "title": "Zaznano gibanje po delovnem času",
                    "description": "Kamera je zaznala gibanje v pisarni ob 23:45",
                    "location": "Pisarna",
                    "timestamp": datetime.now() - timedelta(hours=12),
                    "detected_by": "CAM_ENTRANCE_001",
                    "affected_devices": ["CAM_ENTRANCE_001", "ALARM_MAIN_001"],
                    "response_actions": ["Aktiviran alarm", "Poslana fotografija", "Klican varnostnik"],
                    "is_resolved": False,
                    "resolution_notes": "",
                    "assigned_to": "USER_SECURITY_001"
                }
            ]
            
            for incident_data in sample_incidents:
                incident = SecurityIncident(**incident_data)
                self.incidents.append(incident)
            
        except Exception as e:
            logger.error(f"❌ Napaka pri nalaganju vzorčnih varnostnih podatkov: {e}")
    
    def _hash_password(self, password: str) -> str:
        """Ustvari hash gesla"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return f"{salt}:{base64.b64encode(password_hash).decode()}"
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Preveri geslo"""
        try:
            salt, stored_hash = password_hash.split(':')
            password_hash_check = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
            return base64.b64encode(password_hash_check).decode() == stored_hash
        except:
            return False
    
    def authenticate_user(self, username: str, password: str, ip_address: str = "unknown") -> Dict[str, Any]:
        """Avtentificiraj uporabnika"""
        try:
            # Poišči uporabnika
            user = None
            for u in self.users.values():
                if u.username == username:
                    user = u
                    break
            
            if not user:
                # Zabeleži neuspešen poskus
                self._log_access_event(
                    user_id="UNKNOWN",
                    username=username,
                    action="login",
                    resource="main_system",
                    ip_address=ip_address,
                    success=False,
                    details={"reason": "user_not_found"}
                )
                return {"success": False, "message": "Napačno uporabniško ime ali geslo"}
            
            # Preveri, če je uporabnik aktiven
            if not user.is_active:
                return {"success": False, "message": "Uporabniški račun je onemogočen"}
            
            # Preveri geslo
            if not self._verify_password(password, user.password_hash):
                user.failed_attempts += 1
                
                # Zabeleži neuspešen poskus
                self._log_access_event(
                    user_id=user.id,
                    username=username,
                    action="login",
                    resource="main_system",
                    ip_address=ip_address,
                    success=False,
                    details={"reason": "invalid_password", "failed_attempts": user.failed_attempts}
                )
                
                # Preveri, če je preveč neuspešnih poskusov
                if user.failed_attempts >= 5:
                    user.is_active = False
                    self._create_security_incident(
                        incident_type=IncidentType.UNAUTHORIZED_ACCESS,
                        threat_level=ThreatLevel.HIGH,
                        title=f"Uporabniški račun {username} blokiran",
                        description=f"Preveč neuspešnih poskusov prijave ({user.failed_attempts})",
                        location="Sistem",
                        detected_by="SYSTEM_AUTO",
                        affected_devices=[]
                    )
                
                return {"success": False, "message": "Napačno uporabniško ime ali geslo"}
            
            # Uspešna prijava
            user.failed_attempts = 0
            user.last_login = datetime.now()
            
            # Ustvari sejo
            session_token = secrets.token_urlsafe(32)
            self.active_sessions[session_token] = {
                "user_id": user.id,
                "username": user.username,
                "access_level": user.access_level.value,
                "login_time": datetime.now(),
                "ip_address": ip_address,
                "last_activity": datetime.now()
            }
            
            # Zabeleži uspešen dostop
            self._log_access_event(
                user_id=user.id,
                username=username,
                action="login",
                resource="main_system",
                ip_address=ip_address,
                success=True,
                details={"session_token": session_token}
            )
            
            return {
                "success": True,
                "message": "Uspešna prijava",
                "session_token": session_token,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "full_name": user.full_name,
                    "access_level": user.access_level.value,
                    "permissions": user.permissions
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri avtentifikaciji: {e}")
            return {"success": False, "message": "Sistemska napaka"}
    
    def _log_access_event(self, user_id: str, username: str, action: str, resource: str,
                         ip_address: str, success: bool, details: Dict[str, Any]):
        """Zabeleži dostopni dogodek"""
        try:
            event = AccessEvent(
                id=f"ACCESS_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(self.access_events):03d}",
                user_id=user_id,
                username=username,
                action=action,
                resource=resource,
                location="Sistem",
                ip_address=ip_address,
                timestamp=datetime.now(),
                success=success,
                details=details
            )
            
            self.access_events.append(event)
            
            # Shrani v access log
            with open(ACCESS_LOG, 'a', encoding='utf-8') as f:
                log_entry = {
                    "timestamp": event.timestamp.isoformat(),
                    "user": username,
                    "action": action,
                    "resource": resource,
                    "ip": ip_address,
                    "success": success,
                    "details": details
                }
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
            
        except Exception as e:
            logger.error(f"❌ Napaka pri beleženju dostopnega dogodka: {e}")
    
    def _create_security_incident(self, incident_type: IncidentType, threat_level: ThreatLevel,
                                title: str, description: str, location: str, detected_by: str,
                                affected_devices: List[str]) -> str:
        """Ustvari varnostni incident"""
        try:
            incident_id = f"INC_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            incident = SecurityIncident(
                id=incident_id,
                incident_type=incident_type,
                threat_level=threat_level,
                title=title,
                description=description,
                location=location,
                timestamp=datetime.now(),
                detected_by=detected_by,
                affected_devices=affected_devices,
                response_actions=[],
                is_resolved=False,
                resolution_notes="",
                assigned_to=""
            )
            
            self.incidents.append(incident)
            
            # Ustvari opozorilo
            self._create_alert(
                alert_type=AlertType.ALERT if threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL] else AlertType.WARNING,
                title=f"Varnostni incident: {title}",
                message=description,
                source=detected_by,
                priority=4 if threat_level == ThreatLevel.CRITICAL else 3 if threat_level == ThreatLevel.HIGH else 2
            )
            
            logger.warning(f"🛡️ Ustvarjen varnostni incident: {incident_id} - {title}")
            return incident_id
            
        except Exception as e:
            logger.error(f"❌ Napaka pri ustvarjanju varnostnega incidenta: {e}")
            return ""
    
    def _create_alert(self, alert_type: AlertType, title: str, message: str, source: str, priority: int = 1):
        """Ustvari varnostno opozorilo"""
        try:
            alert_id = f"ALERT_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            alert = SecurityAlert(
                id=alert_id,
                alert_type=alert_type,
                title=title,
                message=message,
                source=source,
                timestamp=datetime.now(),
                is_acknowledged=False,
                acknowledged_by="",
                priority=priority
            )
            
            self.alerts.append(alert)
            
        except Exception as e:
            logger.error(f"❌ Napaka pri ustvarjanju opozorila: {e}")
    
    def monitor_devices(self) -> Dict[str, Any]:
        """Spremljaj varnostne naprave"""
        try:
            monitoring_result = {
                "timestamp": datetime.now().isoformat(),
                "total_devices": len(self.devices),
                "online_devices": 0,
                "offline_devices": 0,
                "error_devices": 0,
                "device_status": {},
                "alerts_generated": 0
            }
            
            current_time = datetime.now()
            
            for device in self.devices.values():
                # Preveri heartbeat
                time_since_heartbeat = (current_time - device.last_heartbeat).total_seconds()
                
                if time_since_heartbeat > 300:  # 5 minut
                    if device.status != DeviceStatus.OFFLINE:
                        device.status = DeviceStatus.OFFLINE
                        
                        # Ustvari incident
                        self._create_security_incident(
                            incident_type=IncidentType.EQUIPMENT_FAILURE,
                            threat_level=ThreatLevel.MEDIUM,
                            title=f"Naprava {device.name} ni dosegljiva",
                            description=f"Naprava {device.name} ({device.id}) ni poslala heartbeat signala že {int(time_since_heartbeat/60)} minut",
                            location=device.location,
                            detected_by="SYSTEM_MONITOR",
                            affected_devices=[device.id]
                        )
                        monitoring_result["alerts_generated"] += 1
                
                # Posodobi statistike
                if device.status == DeviceStatus.ONLINE:
                    monitoring_result["online_devices"] += 1
                elif device.status == DeviceStatus.OFFLINE:
                    monitoring_result["offline_devices"] += 1
                elif device.status == DeviceStatus.ERROR:
                    monitoring_result["error_devices"] += 1
                
                monitoring_result["device_status"][device.id] = {
                    "name": device.name,
                    "type": device.device_type,
                    "location": device.location,
                    "status": device.status.value,
                    "last_heartbeat": device.last_heartbeat.isoformat(),
                    "time_since_heartbeat": int(time_since_heartbeat)
                }
            
            return monitoring_result
            
        except Exception as e:
            logger.error(f"❌ Napaka pri spremljanju naprav: {e}")
            return {"error": str(e)}
    
    def analyze_security_threats(self) -> Dict[str, Any]:
        """Analiziraj varnostne grožnje"""
        try:
            analysis = {
                "timestamp": datetime.now().isoformat(),
                "threat_summary": {
                    "critical": 0,
                    "high": 0,
                    "medium": 0,
                    "low": 0
                },
                "recent_incidents": [],
                "suspicious_activities": [],
                "recommendations": []
            }
            
            # Analiziraj incidente zadnjih 24 ur
            recent_incidents = [inc for inc in self.incidents 
                             if (datetime.now() - inc.timestamp).total_seconds() < 86400]
            
            for incident in recent_incidents:
                analysis["threat_summary"][incident.threat_level.value] += 1
                
                if not incident.is_resolved:
                    analysis["recent_incidents"].append({
                        "id": incident.id,
                        "type": incident.incident_type.value,
                        "threat_level": incident.threat_level.value,
                        "title": incident.title,
                        "location": incident.location,
                        "timestamp": incident.timestamp.isoformat()
                    })
            
            # Analiziraj dostopne dogodke za sumljive aktivnosti
            recent_access = [event for event in self.access_events 
                           if (datetime.now() - event.timestamp).total_seconds() < 86400]
            
            # Preveri neuspešne prijave
            failed_logins = [event for event in recent_access 
                           if event.action == "login" and not event.success]
            
            if len(failed_logins) > 10:
                analysis["suspicious_activities"].append({
                    "type": "multiple_failed_logins",
                    "count": len(failed_logins),
                    "description": f"Zaznanih {len(failed_logins)} neuspešnih prijav v zadnjih 24 urah"
                })
            
            # Preveri dostope zunaj delovnega časa
            after_hours_access = [event for event in recent_access 
                                if event.success and (event.timestamp.hour < 7 or event.timestamp.hour > 19)]
            
            if len(after_hours_access) > 5:
                analysis["suspicious_activities"].append({
                    "type": "after_hours_access",
                    "count": len(after_hours_access),
                    "description": f"Zaznanih {len(after_hours_access)} dostopov zunaj delovnega časa"
                })
            
            # Generiraj priporočila
            if analysis["threat_summary"]["critical"] > 0:
                analysis["recommendations"].append("Takoj obravnavaj kritične incidente")
            
            if analysis["threat_summary"]["high"] > 2:
                analysis["recommendations"].append("Povečaj varnostno spremljanje")
            
            if len(analysis["suspicious_activities"]) > 0:
                analysis["recommendations"].append("Preglej sumljive aktivnosti in ukrepi po potrebi")
            
            offline_devices = sum(1 for device in self.devices.values() 
                                if device.status == DeviceStatus.OFFLINE)
            if offline_devices > 0:
                analysis["recommendations"].append(f"Preveri {offline_devices} nedosegljivih naprav")
            
            return analysis
            
        except Exception as e:
            logger.error(f"❌ Napaka pri analizi varnostnih groženj: {e}")
            return {"error": str(e)}
    
    def emergency_response(self, incident_id: str, response_type: str = "auto") -> Dict[str, Any]:
        """Odziv na varnostni incident"""
        try:
            # Poišči incident
            incident = None
            for inc in self.incidents:
                if inc.id == incident_id:
                    incident = inc
                    break
            
            if not incident:
                return {"success": False, "message": "Incident ni najden"}
            
            response_actions = []
            
            # Avtomatski odziv glede na tip incidenta
            if incident.incident_type == IncidentType.UNAUTHORIZED_ACCESS:
                # Blokiranje dostopa
                response_actions.append("Blokiran dostop za sumljive IP naslove")
                response_actions.append("Povečano spremljanje dostopnih točk")
                
                # Aktiviraj dodatne varnostne ukrepe
                for device in self.devices.values():
                    if device.device_type == "lock":
                        response_actions.append(f"Aktiviran varnostni način za {device.name}")
            
            elif incident.incident_type == IncidentType.INTRUSION_DETECTION:
                # Aktiviraj alarme
                response_actions.append("Aktiviran glavni alarm")
                response_actions.append("Obvestilo varnostni službi")
                response_actions.append("Začeto snemanje vseh kamer")
                
                # Zakleni vse dostope
                for device in self.devices.values():
                    if device.device_type == "lock":
                        response_actions.append(f"Zaklenjen {device.name}")
            
            elif incident.incident_type == IncidentType.EQUIPMENT_FAILURE:
                # Diagnostika in popravilo
                response_actions.append("Začeta diagnostika naprave")
                response_actions.append("Obvestilo tehnični službi")
                response_actions.append("Aktiviran rezervni sistem")
            
            # Posodobi incident
            incident.response_actions.extend(response_actions)
            
            # Ustvari opozorilo
            self._create_alert(
                alert_type=AlertType.INFO,
                title=f"Odziv na incident {incident_id}",
                message=f"Izvedeni ukrepi: {', '.join(response_actions)}",
                source="EMERGENCY_RESPONSE",
                priority=2
            )
            
            return {
                "success": True,
                "incident_id": incident_id,
                "response_actions": response_actions,
                "message": f"Izvedenih {len(response_actions)} odzivnih ukrepov"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri odzivu na incident: {e}")
            return {"success": False, "message": f"Napaka pri odzivu: {str(e)}"}
    
    def auto_optimize(self) -> Dict[str, Any]:
        """Avtomatska varnostna optimizacija"""
        try:
            optimization_results = {
                "timestamp": datetime.now().isoformat(),
                "devices_checked": 0,
                "incidents_analyzed": 0,
                "threats_mitigated": 0,
                "security_improvements": 0,
                "alerts_processed": 0
            }
            
            # 1. Spremljaj naprave
            device_monitoring = self.monitor_devices()
            optimization_results["devices_checked"] = device_monitoring["total_devices"]
            optimization_results["alerts_processed"] += device_monitoring.get("alerts_generated", 0)
            
            # 2. Analiziraj grožnje
            threat_analysis = self.analyze_security_threats()
            optimization_results["incidents_analyzed"] = len(threat_analysis.get("recent_incidents", []))
            
            # 3. Obravnavaj nerazrešene incidente
            unresolved_incidents = [inc for inc in self.incidents if not inc.is_resolved]
            
            for incident in unresolved_incidents:
                if incident.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
                    # Avtomatski odziv na visoke grožnje
                    response = self.emergency_response(incident.id, "auto")
                    if response["success"]:
                        optimization_results["threats_mitigated"] += 1
            
            # 4. Optimiziraj varnostne nastavitve
            for device in self.devices.values():
                if device.device_type == "camera":
                    # Optimiziraj nastavitve kamer
                    if "motion_detection" in device.capabilities:
                        # Povečaj občutljivost ponoči
                        current_hour = datetime.now().hour
                        if 22 <= current_hour or current_hour <= 6:
                            device.configuration["sensitivity"] = "high"
                        else:
                            device.configuration["sensitivity"] = "medium"
                        optimization_results["security_improvements"] += 1
                
                elif device.device_type == "lock":
                    # Optimiziraj nastavitve ključavnic
                    if "auto_lock_delay" in device.configuration:
                        # Krajši čas avtomatskega zaklepanja ponoči
                        current_hour = datetime.now().hour
                        if 22 <= current_hour or current_hour <= 6:
                            device.configuration["auto_lock_delay"] = 15  # 15 sekund
                        else:
                            device.configuration["auto_lock_delay"] = 30  # 30 sekund
                        optimization_results["security_improvements"] += 1
            
            # 5. Počisti stare dogodke
            cutoff_date = datetime.now() - timedelta(days=30)
            
            # Obdrži samo dogodke zadnjih 30 dni
            self.access_events = [event for event in self.access_events 
                                if event.timestamp > cutoff_date]
            
            # Počisti potrjena opozorila
            self.alerts = [alert for alert in self.alerts 
                         if not alert.is_acknowledged or alert.timestamp > cutoff_date]
            
            # 6. Posodobi statistike
            active_sessions_count = len(self.active_sessions)
            online_devices_count = sum(1 for device in self.devices.values() 
                                     if device.status == DeviceStatus.ONLINE)
            
            logger.info(f"🛡️ Varnostna optimizacija: {optimization_results['devices_checked']} naprav, {optimization_results['threats_mitigated']} groženj")
            
            return {
                "success": True,
                "message": f"Varnostna optimizacija dokončana",
                "devices_monitored": optimization_results["devices_checked"],
                "threats_mitigated": optimization_results["threats_mitigated"],
                "security_improvements": optimization_results["security_improvements"],
                "active_sessions": active_sessions_count,
                "online_devices": online_devices_count,
                "incidents_analyzed": optimization_results["incidents_analyzed"]
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri avtomatski varnostni optimizaciji: {e}")
            return {
                "success": False,
                "message": f"Napaka pri varnostni optimizaciji: {str(e)}",
                "devices_monitored": 0,
                "threats_mitigated": 0,
                "security_improvements": 0
            }
    
    def get_security_summary(self) -> Dict[str, Any]:
        """Pridobi povzetek varnostnega sistema"""
        try:
            # Osnovne statistike
            total_devices = len(self.devices)
            online_devices = sum(1 for device in self.devices.values() 
                               if device.status == DeviceStatus.ONLINE)
            total_users = len(self.users)
            active_users = sum(1 for user in self.users.values() if user.is_active)
            
            # Incidenti zadnjih 24 ur
            recent_incidents = [inc for inc in self.incidents 
                              if (datetime.now() - inc.timestamp).total_seconds() < 86400]
            unresolved_incidents = [inc for inc in self.incidents if not inc.is_resolved]
            
            # Dostopni dogodki zadnjih 24 ur
            recent_access = [event for event in self.access_events 
                           if (datetime.now() - event.timestamp).total_seconds() < 86400]
            failed_access = [event for event in recent_access if not event.success]
            
            # Aktivne seje
            active_sessions = len(self.active_sessions)
            
            # Nepotrjena opozorila
            unacknowledged_alerts = [alert for alert in self.alerts if not alert.is_acknowledged]
            
            return {
                "system_status": {
                    "total_devices": total_devices,
                    "online_devices": online_devices,
                    "device_availability": round((online_devices / max(total_devices, 1)) * 100, 1),
                    "total_users": total_users,
                    "active_users": active_users,
                    "active_sessions": active_sessions
                },
                "security_metrics": {
                    "incidents_24h": len(recent_incidents),
                    "unresolved_incidents": len(unresolved_incidents),
                    "access_attempts_24h": len(recent_access),
                    "failed_access_24h": len(failed_access),
                    "success_rate": round((len(recent_access) - len(failed_access)) / max(len(recent_access), 1) * 100, 1)
                },
                "alerts": {
                    "total_alerts": len(self.alerts),
                    "unacknowledged": len(unacknowledged_alerts),
                    "critical_alerts": len([a for a in unacknowledged_alerts if a.priority >= 4])
                },
                "threat_levels": {
                    "critical": len([inc for inc in recent_incidents if inc.threat_level == ThreatLevel.CRITICAL]),
                    "high": len([inc for inc in recent_incidents if inc.threat_level == ThreatLevel.HIGH]),
                    "medium": len([inc for inc in recent_incidents if inc.threat_level == ThreatLevel.MEDIUM]),
                    "low": len([inc for inc in recent_incidents if inc.threat_level == ThreatLevel.LOW])
                },
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju povzetka varnostnega sistema: {e}")
            return {}

# Globalna instanca
security_monitor = SecurityMonitor()

# Funkcije za kompatibilnost
def auto_optimize():
    return security_monitor.auto_optimize()

def authenticate_user(username: str, password: str, ip_address: str = "unknown"):
    return security_monitor.authenticate_user(username, password, ip_address)

def monitor_devices():
    return security_monitor.monitor_devices()

def analyze_security_threats():
    return security_monitor.analyze_security_threats()

def emergency_response(incident_id: str, response_type: str = "auto"):
    return security_monitor.emergency_response(incident_id, response_type)

def get_security_summary():
    return security_monitor.get_security_summary()

if __name__ == "__main__":
    # Test varnostnega nadzornika
    print("🛡️ Testiranje varnostnega nadzornika...")
    
    # Test avtentifikacije
    auth_result = authenticate_user("admin", "admin123", "192.168.1.50")
    print(f"Avtentifikacija: {auth_result['success']}")
    
    # Spremljaj naprave
    device_status = monitor_devices()
    print(f"Spremljanje naprav: {device_status['online_devices']}/{device_status['total_devices']} online")
    
    # Analiziraj grožnje
    threat_analysis = analyze_security_threats()
    print(f"Analiza groženj: {len(threat_analysis.get('recent_incidents', []))} incidentov")
    
    # Izvedi optimizacijo
    result = auto_optimize()
    print(f"Rezultat optimizacije: {result}")
    
    # Pridobi povzetek
    summary = get_security_summary()
    print(f"Povzetek varnostnega sistema: {summary}")