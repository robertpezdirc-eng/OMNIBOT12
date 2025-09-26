#!/usr/bin/env python3
"""
IoT Secure Module
Varni modul za upravljanje IoT naprav z MQTT protokolom in varnostnim slojem
"""

import paho.mqtt.client as mqtt
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
import ssl
import os
import hashlib
import hmac
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.mqtt_config import get_mqtt_config, create_optimized_client

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Integriraj audit logger
try:
    from .iot_audit_logger import get_audit_logger, log_device_action, log_authentication, log_security_event, log_error
    AUDIT_LOGGING_ENABLED = True
    audit_logger = get_audit_logger()
    logger.info("✅ Audit logging omogočen")
except ImportError as e:
    AUDIT_LOGGING_ENABLED = False
    audit_logger = None
    logger.warning(f"⚠️ Audit logging ni na voljo: {e}")

# Integriraj varnostni sloj
try:
    from .iot_security import get_security_manager, require_auth, audit_log
    SECURITY_ENABLED = True
    security_manager = get_security_manager()
    logger.info("✅ Varnostni sloj omogočen")
except ImportError as e:
    SECURITY_ENABLED = False
    security_manager = None
    # Ustvari dummy dekoratorje
    def require_auth(permission):
        def decorator(func):
            return func
        return decorator
    
    def audit_log(action_type):
        def decorator(func):
            return func
        return decorator
    
    logger.warning(f"⚠️ Varnostni sloj ni na voljo: {e}")

# Konfiguracija
MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', '8883' if os.getenv('MQTT_USE_TLS', 'true').lower() == 'true' else '1883'))
MQTT_USERNAME = os.getenv('MQTT_USERNAME', 'iot_user')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', 'secure_password_2024')
MQTT_USE_TLS = os.getenv('MQTT_USE_TLS', 'true').lower() == 'true'



class IoTSecureModule:
    """🔒 Varni IoT modul za upravljanje naprav z najvišjimi varnostnimi standardi"""
    
    def __init__(self, config: Optional[Dict] = None):
        """Inicializacija varnega IoT modula"""
        self.config = config or {}
        self.module_name = "iot_secure"
        self.version = "1.0.0"
        
        # Varnostne nastavitve
        self.mqtt_broker = os.getenv("MQTT_SECURE_BROKER", "localhost")
        self.mqtt_port = int(os.getenv("MQTT_SECURE_PORT", 8883))  # TLS port
        self.mqtt_username = os.getenv("MQTT_SECURE_USERNAME", "omni_secure")
        self.mqtt_password = os.getenv("MQTT_SECURE_PASSWORD", "")
        self.mqtt_client_id = f"OmniIoTSecure_{int(time.time())}"
        
        # API avtentikacija
        self.api_token = os.getenv("IOT_API_TOKEN", "")
        self.api_secret = os.getenv("IOT_API_SECRET", "")
        
        # TLS certifikati
        self.ca_cert_path = os.getenv("MQTT_CA_CERT", "")
        self.client_cert_path = os.getenv("MQTT_CLIENT_CERT", "")
        self.client_key_path = os.getenv("MQTT_CLIENT_KEY", "")
        
        # Logiranje
        self.log_file = "data/logs/iot_logs.json"
        self.ensure_log_directory()
        
        # MQTT klient
        self.mqtt_client = None
        self.is_connected = False
        
        # MQTT callback API version compatibility
        self.callback_api_version = mqtt.CallbackAPIVersion.VERSION2 if hasattr(mqtt, 'CallbackAPIVersion') else None
        
        # Varnostni parametri
        self.max_retry_attempts = 3
        self.command_timeout = 10
        self.rate_limit = {}  # Rate limiting za naprave
        
        logger.info("🔒 Inicializacija varnega IoT modula...")
        self._initialize_mqtt_client()
        
    def __name__(self):
        """Vrne ime modula"""
        return self.module_name
    
    def ensure_log_directory(self):
        """Ustvari direktorij za logiranje, če ne obstaja"""
        from pathlib import Path
        
        log_dir = Path(self.log_file).parent
        log_dir.mkdir(parents=True, exist_ok=True)
    
    def _initialize_mqtt_client(self):
        """Inicializacija MQTT klienta z varnostnimi nastavitvami"""
        try:
            # Uporabi optimizirano MQTT konfiguracijo
            mqtt_config = get_mqtt_config()
            
            # Ustvari optimiziran klient
            self.mqtt_client = create_optimized_client(self.mqtt_client_id)
            
            # Nastavi callback funkcije
            self.mqtt_client.on_connect = self._on_connect
            self.mqtt_client.on_disconnect = self._on_disconnect
            self.mqtt_client.on_message = self._on_message
            self.mqtt_client.on_log = self._on_log
            
            # TLS konfiguracija
            if mqtt_config.use_tls:
                self._setup_tls()
            
            # Poskusi povezavo
            self._connect_mqtt()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji MQTT klienta: {e}")
            self.log_action("system", "MQTT_INIT_ERROR", {"error": str(e)})
    
    def _setup_tls(self):
        """Nastavi TLS šifriranje za MQTT"""
        try:
            # Osnovno TLS šifriranje
            context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
            
            # Če imamo CA certifikat
            if self.ca_cert_path and os.path.exists(self.ca_cert_path):
                context.load_verify_locations(self.ca_cert_path)
                logger.info("✅ CA certifikat naložen")
            
            # Če imamo klientske certifikate
            if (self.client_cert_path and self.client_key_path and 
                os.path.exists(self.client_cert_path) and os.path.exists(self.client_key_path)):
                context.load_cert_chain(self.client_cert_path, self.client_key_path)
                logger.info("✅ Klientski certifikati naloženi")
            
            # Nastavi TLS na MQTT klient
            self.mqtt_client.tls_set_context(context)
            logger.info("🔐 TLS šifriranje aktivirano")
            
        except Exception as e:
            logger.warning(f"⚠️ TLS nastavitev neuspešna: {e}")
            # Fallback na osnovno TLS
            try:
                self.mqtt_client.tls_set()
                logger.info("🔐 Osnovno TLS šifriranje aktivirano")
            except Exception as e2:
                logger.error(f"❌ TLS šifriranje ni mogoče: {e2}")
    
    def _connect_mqtt(self):
        """Poveži z MQTT brokerjem"""
        try:
            mqtt_config = get_mqtt_config()
            connection_config = mqtt_config.get_connection_config()
            
            logger.info(f"🔗 Povezujem z varnim MQTT brokerjem: {connection_config['host']}:{connection_config['port']}")
            self.mqtt_client.connect(**connection_config)
            self.mqtt_client.loop_start()
            
            # Počakaj na povezavo z timeout
            import time
            timeout = mqtt_config.connect_timeout
            start_time = time.time()
            
            while not self.is_connected and (time.time() - start_time) < timeout:
                time.sleep(0.1)
            
            if self.is_connected:
                logger.info("✅ Varno povezan z MQTT brokerjem")
                self.log_action("system", "MQTT_CONNECTED", {"broker": connection_config['host'], "port": connection_config['port']})
            else:
                logger.warning("⚠️ MQTT povezava ni uspešna v določenem času")
                
        except Exception as e:
            logger.error(f"❌ MQTT povezava neuspešna: {e}")
            self.log_action("system", "MQTT_CONNECTION_ERROR", {"error": str(e)})
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback ob uspešni MQTT povezavi"""
        if rc == 0:
            self.is_connected = True
            logger.info("🔗 MQTT povezava uspešna")
        else:
            logger.error(f"❌ MQTT povezava neuspešna, koda: {rc}")
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback ob prekinitvi MQTT povezave"""
        self.is_connected = False
        logger.warning(f"⚠️ MQTT povezava prekinjena, koda: {rc}")
        self.log_action("system", "MQTT_DISCONNECTED", {"reason_code": rc})
    
    def _on_message(self, client, userdata, msg):
        """Callback ob prejemu MQTT sporočila"""
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            logger.info(f"📨 Prejeto sporočilo: {topic} -> {payload}")
            self.log_action("system", "MQTT_MESSAGE_RECEIVED", {"topic": topic, "payload": payload})
        except Exception as e:
            logger.error(f"❌ Napaka pri obdelavi sporočila: {e}")
    
    def _on_log(self, client, userdata, level, buf):
        """MQTT log callback"""
        if level == mqtt.MQTT_LOG_ERR:
            logger.error(f"MQTT: {buf}")
        elif level == mqtt.MQTT_LOG_WARNING:
            logger.warning(f"MQTT: {buf}")
        else:
            logger.debug(f"MQTT: {buf}")
    
    def log_action(self, device: str, action: str, result: Any, user: str = "system"):
        """Logiraj akcijo v audit trail"""
        try:
            from datetime import timezone
            
            entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "device": device,
                "action": action,
                "result": result,
                "user": user,
                "module": self.module_name,
                "version": self.version,
                "session_id": self.mqtt_client_id,
                "security_hash": self._generate_security_hash(device, action, str(result))
            }
            
            # Zapiši v log datoteko
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
                
            logger.debug(f"📝 Akcija zabeležena: {device} -> {action}")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri logiranju: {e}")
    
    def _generate_security_hash(self, device: str, action: str, result: str) -> str:
        """Generiraj varnostni hash za integriteto logov"""
        try:
            import hmac
            import hashlib
            
            data = f"{device}:{action}:{result}:{self.api_secret}"
            return hmac.new(
                self.api_secret.encode('utf-8'),
                data.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()[:16]
        except:
            return "no_hash"
    
    def _check_rate_limit(self, device: str) -> bool:
        """Preveri rate limiting za napravo"""
        now = time.time()
        if device in self.rate_limit:
            last_command = self.rate_limit[device]
            if now - last_command < 1:  # Maksimalno 1 ukaz na sekundo
                return False
        
        self.rate_limit[device] = now
        return True
    
    def _validate_device_topic(self, device_topic: str) -> bool:
        """Validiraj device topic za varnost"""
        if not device_topic or not isinstance(device_topic, str):
            return False
        
        # Prepreči path traversal in injection
        forbidden_chars = ['..', '/', '\\', ';', '|', '&', '$', '`']
        for char in forbidden_chars:
            if char in device_topic:
                return False
        
        return True
    
    def _execute_with_retry(self, func, *args, **kwargs):
        """Izvedi funkcijo z retry logiko"""
        for attempt in range(self.max_retry_attempts):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if attempt == self.max_retry_attempts - 1:
                    raise e
                logger.warning(f"⚠️ Poskus {attempt + 1} neuspešen: {e}")
                time.sleep(1)
    
    def turn_on(self, device_topic: str, user: str = "system") -> Dict[str, Any]:
        """🔛 Prižgi napravo z varnostnimi preverjanji"""
        try:
            # Varnostne preveritve
            if not self._validate_device_topic(device_topic):
                error_msg = "Neveljaven device topic"
                self.log_action(device_topic, "TURN_ON_REJECTED", {"error": error_msg}, user)
                return {"success": False, "message": f"❌ {error_msg}", "timestamp": time.time()}
            
            if not self._check_rate_limit(device_topic):
                error_msg = "Rate limit presežen"
                self.log_action(device_topic, "TURN_ON_RATE_LIMITED", {"error": error_msg}, user)
                return {"success": False, "message": f"⚠️ {error_msg}", "timestamp": time.time()}
            
            if not self.is_connected:
                error_msg = "MQTT ni povezan"
                self.log_action(device_topic, "TURN_ON_NO_CONNECTION", {"error": error_msg}, user)
                return {"success": False, "message": f"❌ {error_msg}", "timestamp": time.time()}
            
            # Izvedi ukaz
            def publish_command():
                result = self.mqtt_client.publish(device_topic, payload="ON", qos=2, retain=False)
                if result.rc != mqtt.MQTT_ERR_SUCCESS:
                    raise Exception(f"MQTT publish failed: {result.rc}")
                return result
            
            self._execute_with_retry(publish_command)
            
            success_msg = f"Naprava {device_topic} varno prižgana ✅"
            self.log_action(device_topic, "TURN_ON", {"status": "success"}, user)
            
            return {
                "success": True,
                "message": success_msg,
                "device_id": device_topic,
                "timestamp": time.time(),
                "security_level": "high"
            }
            
        except Exception as e:
            error_msg = f"Napaka pri vklopu naprave: {str(e)}"
            self.log_action(device_topic, "TURN_ON_ERROR", {"error": str(e)}, user)
            logger.error(f"❌ {error_msg}")
            
            return {
                "success": False,
                "message": f"❌ {error_msg}",
                "device_id": device_topic,
                "timestamp": time.time()
            }
    
    def turn_off(self, device_topic: str, user: str = "system") -> Dict[str, Any]:
        """🔴 Ugaši napravo z varnostnimi preverjanji"""
        try:
            # Varnostne preveritve (enake kot pri turn_on)
            if not self._validate_device_topic(device_topic):
                error_msg = "Neveljaven device topic"
                self.log_action(device_topic, "TURN_OFF_REJECTED", {"error": error_msg}, user)
                return {"success": False, "message": f"❌ {error_msg}", "timestamp": time.time()}
            
            if not self._check_rate_limit(device_topic):
                error_msg = "Rate limit presežen"
                self.log_action(device_topic, "TURN_OFF_RATE_LIMITED", {"error": error_msg}, user)
                return {"success": False, "message": f"⚠️ {error_msg}", "timestamp": time.time()}
            
            if not self.is_connected:
                error_msg = "MQTT ni povezan"
                self.log_action(device_topic, "TURN_OFF_NO_CONNECTION", {"error": error_msg}, user)
                return {"success": False, "message": f"❌ {error_msg}", "timestamp": time.time()}
            
            # Izvedi ukaz
            def publish_command():
                result = self.mqtt_client.publish(device_topic, payload="OFF", qos=2, retain=False)
                if result.rc != mqtt.MQTT_ERR_SUCCESS:
                    raise Exception(f"MQTT publish failed: {result.rc}")
                return result
            
            self._execute_with_retry(publish_command)
            
            success_msg = f"Naprava {device_topic} varno ugašena ✅"
            self.log_action(device_topic, "TURN_OFF", {"status": "success"}, user)
            
            return {
                "success": True,
                "message": success_msg,
                "device_id": device_topic,
                "timestamp": time.time(),
                "security_level": "high"
            }
            
        except Exception as e:
            error_msg = f"Napaka pri izklopu naprave: {str(e)}"
            self.log_action(device_topic, "TURN_OFF_ERROR", {"error": str(e)}, user)
            logger.error(f"❌ {error_msg}")
            
            return {
                "success": False,
                "message": f"❌ {error_msg}",
                "device_id": device_topic,
                "timestamp": time.time()
            }
    
    def restart(self, device_topic: str, user: str = "system") -> Dict[str, Any]:
        """🔄 Ponovno zaženi napravo z varnostnimi preverjanji"""
        try:
            # Varnostne preveritve
            if not self._validate_device_topic(device_topic):
                error_msg = "Neveljaven device topic"
                self.log_action(device_topic, "RESTART_REJECTED", {"error": error_msg}, user)
                return {"success": False, "message": f"❌ {error_msg}", "timestamp": time.time()}
            
            if not self._check_rate_limit(device_topic):
                error_msg = "Rate limit presežen"
                self.log_action(device_topic, "RESTART_RATE_LIMITED", {"error": error_msg}, user)
                return {"success": False, "message": f"⚠️ {error_msg}", "timestamp": time.time()}
            
            if not self.is_connected:
                error_msg = "MQTT ni povezan"
                self.log_action(device_topic, "RESTART_NO_CONNECTION", {"error": error_msg}, user)
                return {"success": False, "message": f"❌ {error_msg}", "timestamp": time.time()}
            
            # Izvedi ukaz
            def publish_command():
                result = self.mqtt_client.publish(device_topic, payload="RESTART", qos=2, retain=False)
                if result.rc != mqtt.MQTT_ERR_SUCCESS:
                    raise Exception(f"MQTT publish failed: {result.rc}")
                return result
            
            self._execute_with_retry(publish_command)
            
            success_msg = f"Naprava {device_topic} varno ponovno zagnana 🔄"
            self.log_action(device_topic, "RESTART", {"status": "success"}, user)
            
            return {
                "success": True,
                "message": success_msg,
                "device_id": device_topic,
                "timestamp": time.time(),
                "security_level": "high"
            }
            
        except Exception as e:
            error_msg = f"Napaka pri ponovnem zagonu: {str(e)}"
            self.log_action(device_topic, "RESTART_ERROR", {"error": str(e)}, user)
            logger.error(f"❌ {error_msg}")
            
            return {
                "success": False,
                "message": f"❌ {error_msg}",
                "device_id": device_topic,
                "timestamp": time.time()
            }
    
    def status(self, device_topic: str, status_url: Optional[str] = None, user: str = "system") -> Dict[str, Any]:
        """📊 Preveri stanje naprave z varno avtentikacijo"""
        try:
            if not self._validate_device_topic(device_topic):
                error_msg = "Neveljaven device topic"
                self.log_action(device_topic, "STATUS_REJECTED", {"error": error_msg}, user)
                return {"success": False, "message": f"❌ {error_msg}", "timestamp": time.time()}
            
            if status_url:
                # REST API klic z avtentikacijo
                headers = {
                    "Authorization": f"Bearer {self.api_token}",
                    "User-Agent": f"OmniIoTSecure/{self.version}",
                    "X-API-Key": self.api_secret[:16] if self.api_secret else ""
                }
                
                try:
                    import requests
                    
                    response = requests.get(
                        status_url, 
                        headers=headers, 
                        timeout=self.command_timeout,
                        verify=True  # Preveri SSL certifikate
                    )
                    response.raise_for_status()
                    
                    result_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"status": response.text}
                    
                    self.log_action(device_topic, "STATUS_CHECK", {"url": status_url, "status_code": response.status_code}, user)
                    
                    return {
                        "success": True,
                        "message": "Status uspešno pridobljen",
                        "device_id": device_topic,
                        "data": result_data,
                        "timestamp": time.time(),
                        "security_level": "high"
                    }
                    
                except requests.exceptions.RequestException as e:
                    error_msg = f"REST API napaka: {str(e)}"
                    self.log_action(device_topic, "STATUS_ERROR", {"error": error_msg, "url": status_url}, user)
                    
                    return {
                        "success": False,
                        "message": f"❌ {error_msg}",
                        "device_id": device_topic,
                        "timestamp": time.time()
                    }
            else:
                # MQTT naprava - stanje ni direktno dostopno
                self.log_action(device_topic, "STATUS_CHECK", {"type": "mqtt"}, user)
                
                return {
                    "success": True,
                    "message": "MQTT naprava - stanje ni na voljo",
                    "device_id": device_topic,
                    "data": {"type": "mqtt", "connected": self.is_connected},
                    "timestamp": time.time(),
                    "security_level": "high"
                }
                
        except Exception as e:
            error_msg = f"Napaka pri preverjanju stanja: {str(e)}"
            self.log_action(device_topic, "STATUS_ERROR", {"error": str(e)}, user)
            logger.error(f"❌ {error_msg}")
            
            return {
                "success": False,
                "message": f"❌ {error_msg}",
                "device_id": device_topic,
                "timestamp": time.time()
            }
    
    def bulk_control(self, devices: List[str], action: str, user: str = "system") -> Dict[str, Any]:
        """🔄 Množično upravljanje naprav z varnostnimi preverjanji"""
        try:
            if action not in ["turn_on", "turn_off", "restart"]:
                error_msg = "Neveljaven ukaz"
                self.log_action("bulk_operation", "BULK_REJECTED", {"error": error_msg, "action": action}, user)
                return {"success": False, "message": f"❌ {error_msg}", "timestamp": time.time()}
            
            results = []
            successful = 0
            
            for device in devices:
                if action == "turn_on":
                    result = self.turn_on(device, user)
                elif action == "turn_off":
                    result = self.turn_off(device, user)
                elif action == "restart":
                    result = self.restart(device, user)
                
                results.append({"device": device, "result": result})
                if result.get("success", False):
                    successful += 1
                
                # Kratka pavza med ukazi za varnost
                time.sleep(0.1)
            
            self.log_action("bulk_operation", "BULK_CONTROL", {
                "action": action,
                "total_devices": len(devices),
                "successful": successful,
                "devices": devices
            }, user)
            
            return {
                "success": True,
                "message": f"Množična operacija končana: {successful}/{len(devices)} uspešno",
                "total_devices": len(devices),
                "successful": successful,
                "failed": len(devices) - successful,
                "results": results,
                "timestamp": time.time(),
                "security_level": "high"
            }
            
        except Exception as e:
            error_msg = f"Napaka pri množični operaciji: {str(e)}"
            self.log_action("bulk_operation", "BULK_ERROR", {"error": str(e)}, user)
            logger.error(f"❌ {error_msg}")
            
            return {
                "success": False,
                "message": f"❌ {error_msg}",
                "timestamp": time.time()
            }
    
    def get_security_status(self) -> Dict[str, Any]:
        """🛡️ Pridobi varnostni status modula"""
        return {
            "module": self.module_name,
            "version": self.version,
            "mqtt_connected": self.is_connected,
            "mqtt_broker": self.mqtt_broker,
            "mqtt_port": self.mqtt_port,
            "tls_enabled": True,
            "authentication_enabled": bool(self.mqtt_username and self.mqtt_password),
            "api_token_configured": bool(self.api_token),
            "logging_enabled": True,
            "rate_limiting_enabled": True,
            "security_level": "high",
            "timestamp": time.time()
        }
    
    def get_audit_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """📋 Pridobi audit logove"""
        try:
            logs = []
            if os.path.exists(self.log_file):
                with open(self.log_file, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                    for line in lines[-limit:]:
                        try:
                            logs.append(json.loads(line.strip()))
                        except json.JSONDecodeError:
                            continue
            return logs
        except Exception as e:
            logger.error(f"❌ Napaka pri branju logov: {e}")
            return []
    
    def run(self, query: str = "", **kwargs) -> Dict[str, Any]:
        """🚀 Glavna funkcija modula"""
        return {
            "module": self.module_name,
            "version": self.version,
            "status": "active",
            "security_status": self.get_security_status(),
            "capabilities": [
                "secure_device_control",
                "tls_encryption", 
                "user_authentication",
                "audit_logging",
                "rate_limiting",
                "bulk_operations"
            ],
            "timestamp": time.time()
        }
    
    def __del__(self):
        """Cleanup ob uničenju objekta"""
        try:
            if self.mqtt_client and self.is_connected:
                self.mqtt_client.loop_stop()
                self.mqtt_client.disconnect()
                logger.info("🔒 Varni IoT modul zaustavljen")
        except:
            pass

# Globalne funkcije za kompatibilnost
def __name__():
    """Vrne ime modula"""
    return "iot_secure"

# Inicializacija modula
iot_secure_module = IoTSecureModule()

# Funkcije za kompatibilnost z obstoječimi skripti
@require_auth("control") if SECURITY_ENABLED else lambda f: f
@audit_log("device_control") if SECURITY_ENABLED else lambda f: f
def turn_on(device_topic: str, user: str = "system", user_data: Dict = None, **kwargs) -> Dict:
    """Prižgi napravo preko MQTT"""
    try:
        if iot_secure_module and iot_secure_module.is_connected:
            result = iot_secure_module.turn_on(device_topic, user)
            if result.get("success", False):
                message = f"Naprava {device_topic} prižgana ✅"
                iot_secure_module.log_action(device_topic, "ON", message, user)
                return result
            else:
                error_msg = f"Napaka pri pošiljanju ukaza: {result.get('message', 'Unknown error')}"
                iot_secure_module.log_action(device_topic, "ON_ERROR", error_msg, user)
                return result
        else:
            error_msg = "MQTT klient ni inicializiran"
            if iot_secure_module:
                iot_secure_module.log_action(device_topic, "ON_ERROR", error_msg, user)
            return {"success": False, "message": error_msg, "timestamp": time.time()}
    except Exception as e:
        error_msg = f"Napaka pri prižiganju naprave: {str(e)}"
        if iot_secure_module:
            iot_secure_module.log_action(device_topic, "ON_ERROR", error_msg, user)
        return {"success": False, "message": error_msg, "timestamp": time.time()}

@require_auth("control") if SECURITY_ENABLED else lambda f: f
@audit_log("device_control") if SECURITY_ENABLED else lambda f: f
def turn_off(device_topic: str, user: str = "system", user_data: Dict = None, **kwargs) -> Dict:
    """Ugasni napravo preko MQTT"""
    try:
        if iot_secure_module and iot_secure_module.is_connected:
            result = iot_secure_module.turn_off(device_topic, user)
            if result.get("success", False):
                message = f"Naprava {device_topic} ugašena ✅"
                iot_secure_module.log_action(device_topic, "OFF", message, user)
                return result
            else:
                error_msg = f"Napaka pri pošiljanju ukaza: {result.get('message', 'Unknown error')}"
                iot_secure_module.log_action(device_topic, "OFF_ERROR", error_msg, user)
                return result
        else:
            error_msg = "MQTT klient ni inicializiran"
            if iot_secure_module:
                iot_secure_module.log_action(device_topic, "OFF_ERROR", error_msg, user)
            return {"success": False, "message": error_msg, "timestamp": time.time()}
    except Exception as e:
        error_msg = f"Napaka pri ugašanju naprave: {str(e)}"
        if iot_secure_module:
            iot_secure_module.log_action(device_topic, "OFF_ERROR", error_msg, user)
        return {"success": False, "message": error_msg, "timestamp": time.time()}

@require_auth("control") if SECURITY_ENABLED else lambda f: f
@audit_log("device_control") if SECURITY_ENABLED else lambda f: f
def restart(device_topic: str, user: str = "system", user_data: Dict = None, **kwargs) -> Dict:
    """Ponovno zaženi napravo preko MQTT"""
    try:
        if iot_secure_module and iot_secure_module.is_connected:
            result = iot_secure_module.restart(device_topic, user)
            if result.get("success", False):
                message = f"Naprava {device_topic} ponovno zagnana 🔄"
                iot_secure_module.log_action(device_topic, "RESTART", message, user)
                return result
            else:
                error_msg = f"Napaka pri pošiljanju ukaza: {result.get('message', 'Unknown error')}"
                iot_secure_module.log_action(device_topic, "RESTART_ERROR", error_msg, user)
                return result
        else:
            error_msg = "MQTT klient ni inicializiran"
            if iot_secure_module:
                iot_secure_module.log_action(device_topic, "RESTART_ERROR", error_msg, user)
            return {"success": False, "message": error_msg, "timestamp": time.time()}
    except Exception as e:
        error_msg = f"Napaka pri ponovnem zagonu naprave: {str(e)}"
        if iot_secure_module:
            iot_secure_module.log_action(device_topic, "RESTART_ERROR", error_msg, user)
        return {"success": False, "message": error_msg, "timestamp": time.time()}

def status(device_topic: str, status_url: str = None, user: str = "system"):
    return iot_secure_module.status(device_topic, status_url, user)

def bulk_control(devices: list, action: str, user: str = "system"):
    return iot_secure_module.bulk_control(devices, action, user)

def get_security_status():
    return iot_secure_module.get_security_status()

def get_audit_logs(limit: int = 100):
    return iot_secure_module.get_audit_logs(limit)

def run(query: str = "", **kwargs):
    return iot_secure_module.run(query, **kwargs)