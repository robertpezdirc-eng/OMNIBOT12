#!/usr/bin/env python3
"""
IoT Security Layer
Varnostni sloj za IoT sistem z TLS šifriranjem, avtentikacijo in audit logiranjem
"""

import ssl
import json
import hashlib
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import jwt
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

class SecurityConfig:
    """Varnostne konfiguracije"""
    
    def __init__(self):
        self.jwt_secret = os.getenv('JWT_SECRET', self._generate_secret())
        self.encryption_key = os.getenv('ENCRYPTION_KEY', self._generate_encryption_key())
        self.api_key_length = 32
        self.token_expiry_hours = 24
        self.max_failed_attempts = 5
        self.lockout_duration_minutes = 30
        
    def _generate_secret(self) -> str:
        """Generiraj JWT secret"""
        return secrets.token_urlsafe(64)
    
    def _generate_encryption_key(self) -> str:
        """Generiraj encryption key"""
        key = Fernet.generate_key()
        return base64.urlsafe_b64encode(key).decode()

class TLSManager:
    """Upravljanje TLS certifikatov in šifriranja"""
    
    def __init__(self, cert_path: str = None, key_path: str = None):
        self.cert_path = cert_path or "certs/iot_cert.pem"
        self.key_path = key_path or "certs/iot_key.pem"
        self.ca_path = "certs/ca_cert.pem"
        
    def create_ssl_context(self, is_server: bool = False) -> ssl.SSLContext:
        """Ustvari SSL kontekst za varno komunikacijo"""
        try:
            if is_server:
                context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
                context.load_cert_chain(self.cert_path, self.key_path)
            else:
                context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
                if os.path.exists(self.ca_path):
                    context.load_verify_locations(self.ca_path)
            
            # Varnostne nastavitve
            context.minimum_version = ssl.TLSVersion.TLSv1_2
            context.set_ciphers('ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS')
            
            return context
            
        except Exception as e:
            logging.error(f"Napaka pri ustvarjanju SSL konteksta: {e}")
            # Fallback na default context
            return ssl.create_default_context()
    
    def generate_self_signed_cert(self):
        """Generiraj self-signed certifikat za testiranje"""
        try:
            from cryptography import x509
            from cryptography.x509.oid import NameOID
            from cryptography.hazmat.primitives import serialization
            from cryptography.hazmat.primitives.asymmetric import rsa
            
            # Generiraj private key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            
            # Ustvari certifikat
            subject = issuer = x509.Name([
                x509.NameAttribute(NameOID.COUNTRY_NAME, "SI"),
                x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Slovenia"),
                x509.NameAttribute(NameOID.LOCALITY_NAME, "Ljubljana"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "IoT Security"),
                x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
            ])
            
            cert = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                issuer
            ).public_key(
                private_key.public_key()
            ).serial_number(
                x509.random_serial_number()
            ).not_valid_before(
                datetime.utcnow()
            ).not_valid_after(
                datetime.utcnow() + timedelta(days=365)
            ).add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName("localhost"),
                    x509.IPAddress("127.0.0.1"),
                ]),
                critical=False,
            ).sign(private_key, hashes.SHA256())
            
            # Shrani certifikat in ključ
            os.makedirs("certs", exist_ok=True)
            
            with open(self.cert_path, "wb") as f:
                f.write(cert.public_bytes(serialization.Encoding.PEM))
            
            with open(self.key_path, "wb") as f:
                f.write(private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            
            logging.info("Self-signed certifikat uspešno ustvarjen")
            return True
            
        except Exception as e:
            logging.error(f"Napaka pri generiranju certifikata: {e}")
            return False

class AuthenticationManager:
    """Upravljanje avtentikacije in avtorizacije"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.users_file = "data/security/users.json"
        self.api_keys_file = "data/security/api_keys.json"
        self.failed_attempts = {}
        self.cipher_suite = Fernet(base64.urlsafe_b64decode(config.encryption_key))
        
        # Ustvari direktorije
        os.makedirs("data/security", exist_ok=True)
        
        # Inicializiraj datoteke
        self._init_users()
        self._init_api_keys()
    
    def _init_users(self):
        """Inicializiraj uporabnike"""
        if not os.path.exists(self.users_file):
            default_users = {
                "admin": {
                    "password_hash": self._hash_password("admin123"),
                    "role": "admin",
                    "permissions": ["read", "write", "control", "admin"],
                    "created_at": datetime.now().isoformat(),
                    "last_login": None,
                    "active": True
                },
                "operator": {
                    "password_hash": self._hash_password("operator123"),
                    "role": "operator", 
                    "permissions": ["read", "write", "control"],
                    "created_at": datetime.now().isoformat(),
                    "last_login": None,
                    "active": True
                },
                "viewer": {
                    "password_hash": self._hash_password("viewer123"),
                    "role": "viewer",
                    "permissions": ["read"],
                    "created_at": datetime.now().isoformat(),
                    "last_login": None,
                    "active": True
                }
            }
            
            with open(self.users_file, 'w') as f:
                json.dump(default_users, f, indent=2)
    
    def _init_api_keys(self):
        """Inicializiraj API ključe"""
        if not os.path.exists(self.api_keys_file):
            default_keys = {
                "demo_key_admin": {
                    "key_hash": self._hash_password("iot_admin_key_2024"),
                    "permissions": ["read", "write", "control", "admin"],
                    "created_at": datetime.now().isoformat(),
                    "last_used": None,
                    "active": True,
                    "description": "Admin API key"
                },
                "demo_key_device": {
                    "key_hash": self._hash_password("iot_device_key_2024"),
                    "permissions": ["read", "write"],
                    "created_at": datetime.now().isoformat(),
                    "last_used": None,
                    "active": True,
                    "description": "Device API key"
                }
            }
            
            with open(self.api_keys_file, 'w') as f:
                json.dump(default_keys, f, indent=2)
    
    def _hash_password(self, password: str) -> str:
        """Hash gesla z soljo"""
        salt = secrets.token_hex(16)
        pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return f"{salt}:{pwd_hash.hex()}"
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Preveri geslo"""
        try:
            salt, stored_hash = password_hash.split(':')
            pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
            return pwd_hash.hex() == stored_hash
        except:
            return False
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Avtenticiraj uporabnika"""
        # Preveri lockout
        if self._is_locked_out(username):
            return None
        
        try:
            with open(self.users_file, 'r') as f:
                users = json.load(f)
            
            if username not in users:
                self._record_failed_attempt(username)
                return None
            
            user = users[username]
            
            if not user.get('active', False):
                return None
            
            if self._verify_password(password, user['password_hash']):
                # Uspešna prijava
                self._clear_failed_attempts(username)
                user['last_login'] = datetime.now().isoformat()
                
                # Posodobi datoteko
                with open(self.users_file, 'w') as f:
                    json.dump(users, f, indent=2)
                
                return {
                    'username': username,
                    'role': user['role'],
                    'permissions': user['permissions']
                }
            else:
                self._record_failed_attempt(username)
                return None
                
        except Exception as e:
            logging.error(f"Napaka pri avtentikaciji: {e}")
            return None
    
    def authenticate_api_key(self, api_key: str) -> Optional[Dict]:
        """Avtenticiraj API ključ"""
        try:
            with open(self.api_keys_file, 'r') as f:
                api_keys = json.load(f)
            
            for key_id, key_data in api_keys.items():
                if not key_data.get('active', False):
                    continue
                
                if self._verify_password(api_key, key_data['key_hash']):
                    # Posodobi zadnjo uporabo
                    key_data['last_used'] = datetime.now().isoformat()
                    
                    with open(self.api_keys_file, 'w') as f:
                        json.dump(api_keys, f, indent=2)
                    
                    return {
                        'key_id': key_id,
                        'permissions': key_data['permissions'],
                        'description': key_data.get('description', '')
                    }
            
            return None
            
        except Exception as e:
            logging.error(f"Napaka pri avtentikaciji API ključa: {e}")
            return None
    
    def generate_jwt_token(self, user_data: Dict) -> str:
        """Generiraj JWT token"""
        payload = {
            'user': user_data,
            'exp': datetime.utcnow() + timedelta(hours=self.config.token_expiry_hours),
            'iat': datetime.utcnow()
        }
        
        return jwt.encode(payload, self.config.jwt_secret, algorithm='HS256')
    
    def verify_jwt_token(self, token: str) -> Optional[Dict]:
        """Preveri JWT token"""
        try:
            payload = jwt.decode(token, self.config.jwt_secret, algorithms=['HS256'])
            return payload.get('user')
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _is_locked_out(self, username: str) -> bool:
        """Preveri ali je uporabnik zaklenjen"""
        if username not in self.failed_attempts:
            return False
        
        attempts_data = self.failed_attempts[username]
        if attempts_data['count'] < self.config.max_failed_attempts:
            return False
        
        lockout_time = datetime.fromisoformat(attempts_data['lockout_until'])
        return datetime.now() < lockout_time
    
    def _record_failed_attempt(self, username: str):
        """Zabeleži neuspešen poskus prijave"""
        if username not in self.failed_attempts:
            self.failed_attempts[username] = {'count': 0, 'lockout_until': None}
        
        self.failed_attempts[username]['count'] += 1
        
        if self.failed_attempts[username]['count'] >= self.config.max_failed_attempts:
            lockout_until = datetime.now() + timedelta(minutes=self.config.lockout_duration_minutes)
            self.failed_attempts[username]['lockout_until'] = lockout_until.isoformat()
    
    def _clear_failed_attempts(self, username: str):
        """Počisti neuspešne poskuse"""
        if username in self.failed_attempts:
            del self.failed_attempts[username]

class AuditLogger:
    """Sistem za audit logiranje"""
    
    def __init__(self):
        self.audit_file = "data/logs/audit.json"
        os.makedirs("data/logs", exist_ok=True)
        
        # Inicializiraj audit log
        if not os.path.exists(self.audit_file):
            with open(self.audit_file, 'w') as f:
                json.dump([], f)
    
    def log_event(self, event_type: str, user: str, action: str, 
                  target: str = None, result: str = "success", 
                  details: Dict = None):
        """Zabeleži audit event"""
        try:
            event = {
                'timestamp': datetime.now().isoformat(),
                'event_type': event_type,  # auth, device_control, config_change, etc.
                'user': user,
                'action': action,
                'target': target,
                'result': result,
                'details': details or {},
                'ip_address': self._get_client_ip(),
                'session_id': self._get_session_id()
            }
            
            # Preberi obstoječe loge
            with open(self.audit_file, 'r') as f:
                logs = json.load(f)
            
            # Dodaj nov log
            logs.append(event)
            
            # Obdrži samo zadnjih 10000 logov
            if len(logs) > 10000:
                logs = logs[-10000:]
            
            # Shrani
            with open(self.audit_file, 'w') as f:
                json.dump(logs, f, indent=2)
            
            logging.info(f"Audit log: {event_type} - {user} - {action}")
            
        except Exception as e:
            logging.error(f"Napaka pri audit logiranju: {e}")
    
    def _get_client_ip(self) -> str:
        """Pridobi IP naslov klienta"""
        # V produkciji bi to pridobili iz request objekta
        return "127.0.0.1"
    
    def _get_session_id(self) -> str:
        """Pridobi session ID"""
        # V produkciji bi to pridobili iz session
        return secrets.token_hex(8)
    
    def get_audit_logs(self, limit: int = 100, event_type: str = None, 
                      user: str = None) -> List[Dict]:
        """Pridobi audit loge"""
        try:
            with open(self.audit_file, 'r') as f:
                logs = json.load(f)
            
            # Filtriraj
            if event_type:
                logs = [log for log in logs if log.get('event_type') == event_type]
            
            if user:
                logs = [log for log in logs if log.get('user') == user]
            
            # Vrni zadnje loge
            return logs[-limit:]
            
        except Exception as e:
            logging.error(f"Napaka pri branju audit logov: {e}")
            return []

class IoTSecurityManager:
    """Glavni varnostni manager za IoT sistem"""
    
    def __init__(self):
        self.config = SecurityConfig()
        self.tls_manager = TLSManager()
        self.auth_manager = AuthenticationManager(self.config)
        self.audit_logger = AuditLogger()
        
        # Generiraj certifikate če ne obstajajo
        if not os.path.exists(self.tls_manager.cert_path):
            self.tls_manager.generate_self_signed_cert()
    
    def secure_mqtt_config(self) -> Dict:
        """Vrni varno MQTT konfiguracijo"""
        return {
            'tls': {
                'ca_certs': self.tls_manager.ca_path,
                'certfile': self.tls_manager.cert_path,
                'keyfile': self.tls_manager.key_path,
                'cert_reqs': ssl.CERT_REQUIRED,
                'tls_version': ssl.PROTOCOL_TLSv1_2,
                'ciphers': None
            },
            'username': os.getenv('MQTT_USERNAME', 'iot_user'),
            'password': os.getenv('MQTT_PASSWORD', 'secure_password_2024')
        }
    
    def authenticate_request(self, auth_header: str = None, 
                           api_key: str = None) -> Optional[Dict]:
        """Avtenticiraj zahtevo"""
        try:
            # JWT token avtentikacija
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header[7:]
                user_data = self.auth_manager.verify_jwt_token(token)
                if user_data:
                    return user_data
            
            # API key avtentikacija
            if api_key:
                key_data = self.auth_manager.authenticate_api_key(api_key)
                if key_data:
                    return {
                        'username': key_data['key_id'],
                        'role': 'api_user',
                        'permissions': key_data['permissions']
                    }
            
            return None
            
        except Exception as e:
            logging.error(f"Napaka pri avtentikaciji zahteve: {e}")
            return None
    
    def check_permission(self, user_data: Dict, required_permission: str) -> bool:
        """Preveri dovoljenja"""
        if not user_data:
            return False
        
        permissions = user_data.get('permissions', [])
        return required_permission in permissions or 'admin' in permissions
    
    def log_device_action(self, user: str, device_id: str, action: str, 
                         result: str = "success", details: Dict = None):
        """Zabeleži akcijo na napravi"""
        self.audit_logger.log_event(
            event_type='device_control',
            user=user,
            action=action,
            target=device_id,
            result=result,
            details=details
        )
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """Šifriraj občutljive podatke"""
        try:
            return self.auth_manager.cipher_suite.encrypt(data.encode()).decode()
        except Exception as e:
            logging.error(f"Napaka pri šifriranju: {e}")
            return data
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """Dešifriraj občutljive podatke"""
        try:
            return self.auth_manager.cipher_suite.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            logging.error(f"Napaka pri dešifriranju: {e}")
            return encrypted_data

# Globalna instanca
security_manager = IoTSecurityManager()

def get_security_manager() -> IoTSecurityManager:
    """Pridobi varnostni manager"""
    return security_manager

# Dekoratorji za varnost
def require_auth(required_permission: str = "read"):
    """Dekorator za avtentikacijo"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # V produkciji bi to pridobili iz request konteksta
            auth_header = kwargs.get('auth_header')
            api_key = kwargs.get('api_key')
            
            user_data = security_manager.authenticate_request(auth_header, api_key)
            if not user_data:
                raise PermissionError("Avtentikacija neuspešna")
            
            if not security_manager.check_permission(user_data, required_permission):
                raise PermissionError(f"Ni dovoljenj za: {required_permission}")
            
            kwargs['user_data'] = user_data
            return func(*args, **kwargs)
        return wrapper
    return decorator

def audit_log(action: str):
    """Dekorator za audit logiranje"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            user_data = kwargs.get('user_data', {})
            user = user_data.get('username', 'unknown')
            
            try:
                result = func(*args, **kwargs)
                security_manager.audit_logger.log_event(
                    event_type='function_call',
                    user=user,
                    action=action,
                    result='success'
                )
                return result
            except Exception as e:
                security_manager.audit_logger.log_event(
                    event_type='function_call',
                    user=user,
                    action=action,
                    result='error',
                    details={'error': str(e)}
                )
                raise
        return wrapper
    return decorator

if __name__ == "__main__":
    # Test varnostnega sistema
    print("🔒 IoT Security System Test")
    print("=" * 50)
    
    # Test avtentikacije
    auth_result = security_manager.auth_manager.authenticate_user("admin", "admin123")
    if auth_result:
        print(f"✅ Avtentikacija uspešna: {auth_result}")
        
        # Generiraj JWT token
        token = security_manager.auth_manager.generate_jwt_token(auth_result)
        print(f"🎫 JWT Token: {token[:50]}...")
        
        # Preveri token
        verified = security_manager.auth_manager.verify_jwt_token(token)
        print(f"✅ Token verification: {verified}")
    
    # Test API ključa
    api_auth = security_manager.auth_manager.authenticate_api_key("iot_admin_key_2024")
    if api_auth:
        print(f"🔑 API Key avtentikacija: {api_auth}")
    
    # Test audit logiranja
    security_manager.log_device_action("admin", "test_device", "turn_on", "success")
    print("📝 Audit log zapisan")
    
    # Test šifriranja
    sensitive_data = "secret_device_config"
    encrypted = security_manager.encrypt_sensitive_data(sensitive_data)
    decrypted = security_manager.decrypt_sensitive_data(encrypted)
    print(f"🔐 Šifriranje test: {sensitive_data} -> {decrypted}")
    
    print("\n🔒 Varnostni sistem pripravljen!")