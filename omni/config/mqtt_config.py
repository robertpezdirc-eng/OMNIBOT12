"""
🔧 Optimizirana MQTT konfiguracija za Omniscient AI Platform
Zagotavlja kompatibilnost z različnimi MQTT brokerji in napravami
"""

import os
import logging
from typing import Dict, Any, Optional
import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)

class MQTTConfig:
    """Centralizirana MQTT konfiguracija z optimiziranimi nastavitvami"""
    
    def __init__(self):
        # Osnovne nastavitve
        self.broker = os.getenv('MQTT_BROKER', 'localhost')
        self.port = int(os.getenv('MQTT_PORT', '1883'))
        self.username = os.getenv('MQTT_USERNAME', None)
        self.password = os.getenv('MQTT_PASSWORD', None)
        
        # Varnostne nastavitve
        self.use_tls = os.getenv('MQTT_USE_TLS', 'false').lower() == 'true'
        self.tls_port = int(os.getenv('MQTT_TLS_PORT', '8883'))
        self.ca_cert = os.getenv('MQTT_CA_CERT', '')
        self.client_cert = os.getenv('MQTT_CLIENT_CERT', '')
        self.client_key = os.getenv('MQTT_CLIENT_KEY', '')
        
        # Optimizirane nastavitve za kompatibilnost
        self.protocol_version = mqtt.MQTTv311  # Najbolj kompatibilna verzija
        self.keep_alive = 60
        self.clean_session = True
        self.reconnect_delay_set = (1, 120)  # Min 1s, Max 120s
        
        # QoS nastavitve
        self.default_qos = 1  # Zagotovljena dostava
        self.command_qos = 2  # Natančno enkrat za kritične ukaze
        self.status_qos = 0   # Najboljši napor za status
        
        # Timeout nastavitve
        self.connect_timeout = 30
        self.message_timeout = 10
        self.publish_timeout = 5
        
        # Retry nastavitve
        self.max_retries = 3
        self.retry_delay = 2
        
    def get_client_config(self, client_id: str) -> Dict[str, Any]:
        """Vrni optimizirano konfiguracijo za MQTT klient"""
        return {
            'client_id': client_id,
            'protocol': self.protocol_version,
            'clean_session': self.clean_session,
            'userdata': None,
            'transport': 'tcp'
        }
    
    def get_connection_config(self) -> Dict[str, Any]:
        """Vrni konfiguracijo za povezavo"""
        port = self.tls_port if self.use_tls else self.port
        return {
            'host': self.broker,
            'port': port,
            'keepalive': self.keep_alive,
            'bind_address': '',
            'bind_port': 0,
            'clean_start': mqtt.MQTT_CLEAN_START_FIRST_ONLY
        }
    
    def get_auth_config(self) -> Optional[Dict[str, str]]:
        """Vrni avtentikacijske nastavitve"""
        if self.username and self.password:
            return {
                'username': self.username,
                'password': self.password
            }
        return None
    
    def get_tls_config(self) -> Optional[Dict[str, Any]]:
        """Vrni TLS konfiguracijo"""
        if not self.use_tls:
            return None
            
        config = {
            'ca_certs': self.ca_cert if self.ca_cert else None,
            'certfile': self.client_cert if self.client_cert else None,
            'keyfile': self.client_key if self.client_key else None,
            'cert_reqs': mqtt.ssl.CERT_REQUIRED if self.ca_cert else mqtt.ssl.CERT_NONE,
            'tls_version': mqtt.ssl.PROTOCOL_TLS,
            'ciphers': None
        }
        return config
    
    def get_publish_config(self, message_type: str = 'default') -> Dict[str, Any]:
        """Vrni konfiguracijo za objavljanje sporočil"""
        qos_map = {
            'command': self.command_qos,
            'status': self.status_qos,
            'default': self.default_qos
        }
        
        return {
            'qos': qos_map.get(message_type, self.default_qos),
            'retain': False,
            'properties': None
        }
    
    def get_subscribe_config(self) -> Dict[str, Any]:
        """Vrni konfiguracijo za naročanje na teme"""
        return {
            'qos': self.default_qos,
            'options': None,
            'properties': None
        }
    
    def get_optimized_topics(self, device_id: str) -> Dict[str, str]:
        """Vrni optimizirane MQTT teme za napravo"""
        base_topic = f"omni/devices/{device_id}"
        return {
            'command': f"{base_topic}/cmd",
            'status': f"{base_topic}/status",
            'telemetry': f"{base_topic}/telemetry",
            'config': f"{base_topic}/config",
            'response': f"{base_topic}/response"
        }
    
    def validate_config(self) -> Dict[str, Any]:
        """Preveri in validiraj konfiguracijo"""
        issues = []
        warnings = []
        
        # Preveri osnovne nastavitve
        if not self.broker or self.broker == 'localhost':
            warnings.append("MQTT broker je nastavljen na localhost - preveri za produkcijo")
        
        if not self.username or not self.password:
            warnings.append("MQTT avtentikacija ni nastavljena - priporočeno za varnost")
        
        if self.use_tls and not self.ca_cert:
            warnings.append("TLS je omogočen brez CA certifikata - lahko povzroči težave")
        
        # Preveri port
        if self.port not in [1883, 8883] and self.tls_port not in [1883, 8883]:
            warnings.append("Nestandardni MQTT port - preveri kompatibilnost")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'config_summary': {
                'broker': f"{self.broker}:{self.port}",
                'tls_enabled': self.use_tls,
                'auth_enabled': bool(self.username and self.password),
                'protocol': 'MQTTv3.1.1'
            }
        }

# Globalna instanca konfiguracije
mqtt_config = MQTTConfig()

def get_mqtt_config() -> MQTTConfig:
    """Vrni globalno MQTT konfiguracijo"""
    return mqtt_config

def create_optimized_client(client_id: str) -> mqtt.Client:
    """Ustvari optimiziran MQTT klient z najboljšimi nastavitvami"""
    config = mqtt_config
    
    # Ustvari klient z optimiziranimi nastavitvami
    client_config = config.get_client_config(client_id)
    client = mqtt.Client(**client_config)
    
    # Nastavi avtentikacijo
    auth_config = config.get_auth_config()
    if auth_config:
        client.username_pw_set(auth_config['username'], auth_config['password'])
    
    # Nastavi TLS
    tls_config = config.get_tls_config()
    if tls_config:
        client.tls_set(**tls_config)
    
    # Nastavi optimizirane callback funkcije
    client.on_connect = _on_connect_callback
    client.on_disconnect = _on_disconnect_callback
    client.on_publish = _on_publish_callback
    client.on_subscribe = _on_subscribe_callback
    
    # Nastavi reconnect delay
    client.reconnect_delay_set(*config.reconnect_delay_set)
    
    return client

def _on_connect_callback(client, userdata, flags, rc):
    """Optimiziran callback za povezavo"""
    if rc == 0:
        logger.info(f"✅ MQTT povezava uspešna: {client._client_id}")
    else:
        logger.error(f"❌ MQTT povezava neuspešna: {client._client_id}, koda: {rc}")

def _on_disconnect_callback(client, userdata, rc):
    """Optimiziran callback za prekinitev"""
    if rc != 0:
        logger.warning(f"⚠️ MQTT nepričakovana prekinitev: {client._client_id}, koda: {rc}")
    else:
        logger.info(f"🔌 MQTT povezava zaprta: {client._client_id}")

def _on_publish_callback(client, userdata, mid):
    """Optimiziran callback za objavljanje"""
    logger.debug(f"📤 MQTT sporočilo objavljeno: {client._client_id}, mid: {mid}")

def _on_subscribe_callback(client, userdata, mid, granted_qos):
    """Optimiziran callback za naročanje"""
    logger.debug(f"📥 MQTT naročilo uspešno: {client._client_id}, QoS: {granted_qos}")

# Utility funkcije
def test_mqtt_connection() -> Dict[str, Any]:
    """Testiraj MQTT povezavo"""
    config = mqtt_config
    test_client = create_optimized_client("omni_test_client")
    
    try:
        connection_config = config.get_connection_config()
        test_client.connect(**connection_config)
        test_client.loop_start()
        
        # Počakaj na povezavo
        import time
        time.sleep(2)
        
        if test_client.is_connected():
            test_client.disconnect()
            test_client.loop_stop()
            return {
                'success': True,
                'message': 'MQTT povezava uspešna',
                'broker': f"{config.broker}:{config.port}"
            }
        else:
            return {
                'success': False,
                'message': 'MQTT povezava neuspešna',
                'broker': f"{config.broker}:{config.port}"
            }
    except Exception as e:
        return {
            'success': False,
            'message': f'MQTT napaka: {str(e)}',
            'broker': f"{config.broker}:{config.port}"
        }

if __name__ == "__main__":
    # Test konfiguracije
    config = get_mqtt_config()
    validation = config.validate_config()
    
    print("🔧 MQTT Konfiguracija:")
    print(f"Broker: {config.broker}:{config.port}")
    print(f"TLS: {'Omogočen' if config.use_tls else 'Onemogočen'}")
    print(f"Avtentikacija: {'Omogočena' if config.username else 'Onemogočena'}")
    print(f"Protokol: MQTTv3.1.1")
    
    if validation['warnings']:
        print("\n⚠️ Opozorila:")
        for warning in validation['warnings']:
            print(f"  - {warning}")
    
    # Test povezave
    print("\n🧪 Testiram povezavo...")
    result = test_mqtt_connection()
    print(f"Rezultat: {result['message']}")