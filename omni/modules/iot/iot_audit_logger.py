"""
IoT Audit Logger - Sistem za logiranje vseh IoT ukazov in aktivnosti
Avtor: Omni AI Platform
Verzija: 1.0
"""

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
import threading
import hashlib
import hmac
from dataclasses import dataclass, asdict
from enum import Enum

class LogLevel(Enum):
    """Nivoji logiranja"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class ActionType(Enum):
    """Tipi akcij"""
    DEVICE_CONTROL = "device_control"
    DEVICE_STATUS = "device_status"
    AUTHENTICATION = "authentication"
    SECURITY_EVENT = "security_event"
    SYSTEM_EVENT = "system_event"
    ERROR_EVENT = "error_event"

@dataclass
class LogEntry:
    """Struktura log vnosa"""
    timestamp: str
    level: str
    action_type: str
    user: str
    device_id: Optional[str]
    command: Optional[str]
    parameters: Optional[Dict]
    result: Optional[Dict]
    ip_address: Optional[str]
    user_agent: Optional[str]
    session_id: Optional[str]
    execution_time: Optional[float]
    error_message: Optional[str]
    security_hash: Optional[str]
    
    def to_dict(self) -> Dict:
        """Pretvori v slovar"""
        return asdict(self)

class IoTAuditLogger:
    """Glavni razred za audit logiranje IoT aktivnosti"""
    
    def __init__(self, log_file: str = "iot_logs.json", 
                 max_file_size: int = 10 * 1024 * 1024,  # 10MB
                 backup_count: int = 5,
                 enable_encryption: bool = True,
                 secret_key: str = None):
        """
        Inicializiraj audit logger
        
        Args:
            log_file: Pot do log datoteke
            max_file_size: Maksimalna velikost datoteke v bytih
            backup_count: Število backup datotek
            enable_encryption: Ali omogočiti enkripcijo
            secret_key: Skrivni ključ za hash
        """
        self.log_file = Path(log_file)
        self.max_file_size = max_file_size
        self.backup_count = backup_count
        self.enable_encryption = enable_encryption
        self.secret_key = secret_key or "omni_iot_secret_2024"
        
        # Thread safety
        self._lock = threading.Lock()
        
        # Ustvari direktorij če ne obstaja
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Inicializiraj log datoteko
        self._init_log_file()
        
        print(f"✅ IoT Audit Logger inicializiran: {self.log_file}")
    
    def _init_log_file(self):
        """Inicializiraj log datoteko"""
        if not self.log_file.exists():
            initial_data = {
                "metadata": {
                    "created": datetime.now(timezone.utc).isoformat(),
                    "version": "1.0",
                    "encryption_enabled": self.enable_encryption
                },
                "logs": []
            }
            
            with open(self.log_file, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f, indent=2, ensure_ascii=False)
    
    def _generate_security_hash(self, entry: LogEntry) -> str:
        """Generiraj varnostni hash za integriteto"""
        if not self.enable_encryption:
            return None
            
        # Ustvari hash iz ključnih podatkov
        data = f"{entry.timestamp}:{entry.user}:{entry.device_id}:{entry.command}:{self.secret_key}"
        return hmac.new(
            self.secret_key.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def _rotate_logs(self):
        """Rotiraj log datoteke če so prevelike"""
        if not self.log_file.exists():
            return
            
        if self.log_file.stat().st_size > self.max_file_size:
            # Premakni obstoječe backup datoteke
            for i in range(self.backup_count - 1, 0, -1):
                old_backup = self.log_file.with_suffix(f'.{i}.json')
                new_backup = self.log_file.with_suffix(f'.{i + 1}.json')
                
                if old_backup.exists():
                    if new_backup.exists():
                        new_backup.unlink()
                    old_backup.rename(new_backup)
            
            # Premakni trenutno datoteko v .1 backup
            backup_file = self.log_file.with_suffix('.1.json')
            if backup_file.exists():
                backup_file.unlink()
            self.log_file.rename(backup_file)
            
            # Ustvari novo datoteko
            self._init_log_file()
            print(f"📁 Log datoteke rotirane, backup: {backup_file}")
    
    def log_device_action(self, user: str, device_id: str, command: str, 
                         parameters: Dict = None, result: Dict = None,
                         ip_address: str = None, user_agent: str = None,
                         session_id: str = None, execution_time: float = None,
                         level: LogLevel = LogLevel.INFO) -> bool:
        """
        Logiraj akcijo na napravi
        
        Args:
            user: Uporabnik ki je izvedel akcijo
            device_id: ID naprave
            command: Ukaz
            parameters: Parametri ukaza
            result: Rezultat ukaza
            ip_address: IP naslov uporabnika
            user_agent: User agent
            session_id: ID seje
            execution_time: Čas izvršitve v sekundah
            level: Nivo logiranja
        """
        return self._log_entry(
            level=level,
            action_type=ActionType.DEVICE_CONTROL,
            user=user,
            device_id=device_id,
            command=command,
            parameters=parameters,
            result=result,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            execution_time=execution_time
        )
    
    def log_authentication(self, user: str, success: bool, method: str = "unknown",
                          ip_address: str = None, user_agent: str = None,
                          error_message: str = None) -> bool:
        """Logiraj avtentikacijski dogodek"""
        level = LogLevel.INFO if success else LogLevel.WARNING
        
        return self._log_entry(
            level=level,
            action_type=ActionType.AUTHENTICATION,
            user=user,
            command=method,
            result={"success": success},
            ip_address=ip_address,
            user_agent=user_agent,
            error_message=error_message
        )
    
    def log_security_event(self, user: str, event_type: str, details: Dict = None,
                          severity: LogLevel = LogLevel.WARNING) -> bool:
        """Logiraj varnostni dogodek"""
        return self._log_entry(
            level=severity,
            action_type=ActionType.SECURITY_EVENT,
            user=user,
            command=event_type,
            parameters=details
        )
    
    def log_system_event(self, event_type: str, details: Dict = None,
                        level: LogLevel = LogLevel.INFO) -> bool:
        """Logiraj sistemski dogodek"""
        return self._log_entry(
            level=level,
            action_type=ActionType.SYSTEM_EVENT,
            user="system",
            command=event_type,
            parameters=details
        )
    
    def log_error(self, user: str, error_message: str, details: Dict = None,
                 device_id: str = None, command: str = None) -> bool:
        """Logiraj napako"""
        return self._log_entry(
            level=LogLevel.ERROR,
            action_type=ActionType.ERROR_EVENT,
            user=user,
            device_id=device_id,
            command=command,
            parameters=details,
            error_message=error_message
        )
    
    def _log_entry(self, level: LogLevel, action_type: ActionType, user: str,
                   device_id: str = None, command: str = None,
                   parameters: Dict = None, result: Dict = None,
                   ip_address: str = None, user_agent: str = None,
                   session_id: str = None, execution_time: float = None,
                   error_message: str = None) -> bool:
        """Interni method za logiranje"""
        try:
            with self._lock:
                # Ustvari log entry
                entry = LogEntry(
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    level=level.value,
                    action_type=action_type.value,
                    user=user,
                    device_id=device_id,
                    command=command,
                    parameters=parameters,
                    result=result,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    session_id=session_id,
                    execution_time=execution_time,
                    error_message=error_message,
                    security_hash=None
                )
                
                # Generiraj varnostni hash
                entry.security_hash = self._generate_security_hash(entry)
                
                # Preberi obstoječe loge
                try:
                    with open(self.log_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                except (FileNotFoundError, json.JSONDecodeError):
                    self._init_log_file()
                    with open(self.log_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                
                # Dodaj nov log
                data['logs'].append(entry.to_dict())
                
                # Zapiši nazaj
                with open(self.log_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                # Preveri ali je potrebna rotacija
                self._rotate_logs()
                
                return True
                
        except Exception as e:
            print(f"❌ Napaka pri logiranju: {e}")
            return False
    
    def get_logs(self, limit: int = 100, user: str = None, 
                device_id: str = None, action_type: str = None,
                start_time: str = None, end_time: str = None) -> List[Dict]:
        """
        Pridobi loge z filtriranjem
        
        Args:
            limit: Maksimalno število logov
            user: Filtriraj po uporabniku
            device_id: Filtriraj po napravi
            action_type: Filtriraj po tipu akcije
            start_time: Začetni čas (ISO format)
            end_time: Končni čas (ISO format)
        """
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            logs = data.get('logs', [])
            
            # Filtriraj
            if user:
                logs = [log for log in logs if log.get('user') == user]
            
            if device_id:
                logs = [log for log in logs if log.get('device_id') == device_id]
            
            if action_type:
                logs = [log for log in logs if log.get('action_type') == action_type]
            
            if start_time:
                logs = [log for log in logs if log.get('timestamp', '') >= start_time]
            
            if end_time:
                logs = [log for log in logs if log.get('timestamp', '') <= end_time]
            
            # Sortiraj po času (najnovejši prvi)
            logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return logs[:limit]
            
        except Exception as e:
            print(f"❌ Napaka pri branju logov: {e}")
            return []
    
    def get_statistics(self) -> Dict:
        """Pridobi statistike logiranja"""
        try:
            logs = self.get_logs(limit=10000)  # Pridobi vse loge
            
            stats = {
                'total_logs': len(logs),
                'users': {},
                'devices': {},
                'actions': {},
                'levels': {},
                'recent_activity': []
            }
            
            for log in logs:
                # Uporabniki
                user = log.get('user', 'unknown')
                stats['users'][user] = stats['users'].get(user, 0) + 1
                
                # Naprave
                device = log.get('device_id')
                if device:
                    stats['devices'][device] = stats['devices'].get(device, 0) + 1
                
                # Akcije
                action = log.get('action_type', 'unknown')
                stats['actions'][action] = stats['actions'].get(action, 0) + 1
                
                # Nivoji
                level = log.get('level', 'unknown')
                stats['levels'][level] = stats['levels'].get(level, 0) + 1
            
            # Nedavna aktivnost (zadnjih 10)
            stats['recent_activity'] = logs[:10]
            
            return stats
            
        except Exception as e:
            print(f"❌ Napaka pri pridobivanju statistik: {e}")
            return {}
    
    def verify_integrity(self) -> Dict:
        """Preveri integriteto logov"""
        try:
            logs = self.get_logs(limit=10000)
            
            result = {
                'total_logs': len(logs),
                'verified': 0,
                'failed': 0,
                'corrupted_entries': []
            }
            
            if not self.enable_encryption:
                result['message'] = "Enkripcija ni omogočena"
                return result
            
            for log in logs:
                if 'security_hash' not in log or not log['security_hash']:
                    continue
                
                # Rekonstruiraj entry za preverjanje
                entry = LogEntry(
                    timestamp=log.get('timestamp'),
                    level=log.get('level'),
                    action_type=log.get('action_type'),
                    user=log.get('user'),
                    device_id=log.get('device_id'),
                    command=log.get('command'),
                    parameters=log.get('parameters'),
                    result=log.get('result'),
                    ip_address=log.get('ip_address'),
                    user_agent=log.get('user_agent'),
                    session_id=log.get('session_id'),
                    execution_time=log.get('execution_time'),
                    error_message=log.get('error_message'),
                    security_hash=None
                )
                
                expected_hash = self._generate_security_hash(entry)
                actual_hash = log.get('security_hash')
                
                if expected_hash == actual_hash:
                    result['verified'] += 1
                else:
                    result['failed'] += 1
                    result['corrupted_entries'].append({
                        'timestamp': log.get('timestamp'),
                        'user': log.get('user'),
                        'device_id': log.get('device_id')
                    })
            
            return result
            
        except Exception as e:
            return {'error': str(e)}

# Globalna instanca
_audit_logger = None

def get_audit_logger() -> IoTAuditLogger:
    """Pridobi globalno instanco audit loggerja"""
    global _audit_logger
    if _audit_logger is None:
        log_dir = Path("omni/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        _audit_logger = IoTAuditLogger(log_file=str(log_dir / "iot_logs.json"))
    return _audit_logger

# Convenience funkcije
def log_device_action(user: str, device_id: str, command: str, **kwargs) -> bool:
    """Hitro logiranje akcije naprave"""
    return get_audit_logger().log_device_action(user, device_id, command, **kwargs)

def log_authentication(user: str, success: bool, **kwargs) -> bool:
    """Hitro logiranje avtentikacije"""
    return get_audit_logger().log_authentication(user, success, **kwargs)

def log_security_event(user: str, event_type: str, **kwargs) -> bool:
    """Hitro logiranje varnostnega dogodka"""
    return get_audit_logger().log_security_event(user, event_type, **kwargs)

def log_error(user: str, error_message: str, **kwargs) -> bool:
    """Hitro logiranje napake"""
    return get_audit_logger().log_error(user, error_message, **kwargs)

# Test funkcija
if __name__ == "__main__":
    print("🔧 Testiranje IoT Audit Logger...")
    
    # Ustvari test logger
    logger = IoTAuditLogger("test_iot_logs.json")
    
    # Test različnih tipov logiranja
    print("\n📝 Testiranje logiranja...")
    
    # Device actions
    logger.log_device_action(
        user="test_user",
        device_id="home/lights/living",
        command="turn_on",
        parameters={"brightness": 80},
        result={"success": True, "message": "Light turned on"},
        ip_address="192.168.1.100",
        execution_time=0.5
    )
    
    # Authentication
    logger.log_authentication(
        user="test_user",
        success=True,
        method="jwt",
        ip_address="192.168.1.100"
    )
    
    # Security event
    logger.log_security_event(
        user="test_user",
        event_type="unauthorized_access_attempt",
        details={"device": "home/security/camera1"},
        severity=LogLevel.WARNING
    )
    
    # Error
    logger.log_error(
        user="test_user",
        error_message="Device connection timeout",
        device_id="home/hvac/main",
        command="set_temperature"
    )
    
    print("✅ Test logiranje končano")
    
    # Pridobi statistike
    print("\n📊 Statistike:")
    stats = logger.get_statistics()
    print(f"Skupaj logov: {stats['total_logs']}")
    print(f"Uporabniki: {list(stats['users'].keys())}")
    print(f"Naprave: {list(stats['devices'].keys())}")
    
    # Preveri integriteto
    print("\n🔒 Preverjanje integritete:")
    integrity = logger.verify_integrity()
    print(f"Preverjenih: {integrity['verified']}")
    print(f"Neuspešnih: {integrity['failed']}")
    
    print("\n✅ Test končan")