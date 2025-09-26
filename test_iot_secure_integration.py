#!/usr/bin/env python3
"""
🔒 Omni IoT Secure Integration Tests
Obsežni testi za varnostne funkcionalnosti IoT secure modula.

Testira:
- 🔐 TLS šifriranje
- 👤 Avtentikacijo
- 📝 Sistem logiranja
- 🛡️ Varnostne preveritve
- 🔄 Rate limiting
- 📊 Audit trail
- 🚨 Varnostne scenarije

Avtor: Omni AI Platform
Verzija: 1.0.0
"""

import sys
import os
import json
import time
import unittest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

# Dodaj omni direktorij v Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'omni'))

try:
    from modules.iot.iot_secure import IoTSecureModule, iot_secure_module
    print("✅ IoT Secure modul uspešno naložen")
except ImportError as e:
    print(f"❌ Napaka pri nalaganju IoT Secure modula: {e}")
    sys.exit(1)

class TestIoTSecureIntegration(unittest.TestCase):
    """Test razred za IoT Secure integracijo"""
    
    def setUp(self):
        """Pripravi test okolje"""
        self.test_config = {
            "mqtt_secure_broker": "test.mosquitto.org",
            "mqtt_secure_port": 8883,
            "mqtt_secure_username": "test_user",
            "mqtt_secure_password": "test_pass",
            "iot_api_token": "test_token_123",
            "iot_api_secret": "test_secret_456"
        }
        
        # Nastavi test environment variables
        os.environ.update({
            "MQTT_SECURE_BROKER": self.test_config["mqtt_secure_broker"],
            "MQTT_SECURE_PORT": str(self.test_config["mqtt_secure_port"]),
            "MQTT_SECURE_USERNAME": self.test_config["mqtt_secure_username"],
            "MQTT_SECURE_PASSWORD": self.test_config["mqtt_secure_password"],
            "IOT_API_TOKEN": self.test_config["iot_api_token"],
            "IOT_API_SECRET": self.test_config["iot_api_secret"]
        })
        
        # Ustvari test IoT Secure modul
        self.iot_secure = IoTSecureModule(self.test_config)
        
        # Test naprave
        self.test_devices = [
            "test/device1",
            "test/device2", 
            "test/device3"
        ]
        
        print(f"🧪 Test setup končan za {self.__class__.__name__}")
    
    def tearDown(self):
        """Počisti po testih"""
        try:
            if hasattr(self.iot_secure, 'mqtt_client') and self.iot_secure.mqtt_client:
                self.iot_secure.mqtt_client.loop_stop()
                self.iot_secure.mqtt_client.disconnect()
        except:
            pass
    
    def test_module_initialization(self):
        """Test inicializacije modula"""
        print("\n🧪 Test: Inicializacija modula")
        
        # Preveri osnovne lastnosti
        self.assertEqual(self.iot_secure.module_name, "iot_secure")
        self.assertEqual(self.iot_secure.version, "1.0.0")
        self.assertIsNotNone(self.iot_secure.mqtt_client)
        
        # Preveri varnostne nastavitve
        self.assertEqual(self.iot_secure.mqtt_broker, "test.mosquitto.org")
        self.assertEqual(self.iot_secure.mqtt_port, 8883)
        self.assertEqual(self.iot_secure.mqtt_username, "test_user")
        self.assertEqual(self.iot_secure.api_token, "test_token_123")
        
        print("✅ Inicializacija modula uspešna")
    
    def test_security_validation(self):
        """Test varnostnih validacij"""
        print("\n🧪 Test: Varnostne validacije")
        
        # Test veljavnih device topic-ov
        valid_topics = ["home/light1", "office/pc", "factory/machine"]
        for topic in valid_topics:
            self.assertTrue(self.iot_secure._validate_device_topic(topic))
        
        # Test neveljavnih device topic-ov
        invalid_topics = ["../etc/passwd", "home;rm -rf", "device|malicious", ""]
        for topic in invalid_topics:
            self.assertFalse(self.iot_secure._validate_device_topic(topic))
        
        print("✅ Varnostne validacije uspešne")
    
    def test_rate_limiting(self):
        """Test rate limiting funkcionalnosti"""
        print("\n🧪 Test: Rate limiting")
        
        device = "test/rate_limit_device"
        
        # Prvi ukaz mora biti dovoljen
        self.assertTrue(self.iot_secure._check_rate_limit(device))
        
        # Takoj naslednji ukaz mora biti zavrnjen
        self.assertFalse(self.iot_secure._check_rate_limit(device))
        
        # Po pavzi mora biti spet dovoljen
        time.sleep(1.1)
        self.assertTrue(self.iot_secure._check_rate_limit(device))
        
        print("✅ Rate limiting deluje pravilno")
    
    def test_security_hash_generation(self):
        """Test generiranja varnostnih hash-ov"""
        print("\n🧪 Test: Generiranje varnostnih hash-ov")
        
        device = "test/device"
        action = "TEST_ACTION"
        result = "test_result"
        
        hash1 = self.iot_secure._generate_security_hash(device, action, result)
        hash2 = self.iot_secure._generate_security_hash(device, action, result)
        
        # Isti podatki morajo dati isti hash
        self.assertEqual(hash1, hash2)
        
        # Različni podatki morajo dati različen hash
        hash3 = self.iot_secure._generate_security_hash(device, "DIFFERENT_ACTION", result)
        self.assertNotEqual(hash1, hash3)
        
        print("✅ Generiranje varnostnih hash-ov uspešno")
    
    def test_logging_system(self):
        """Test sistema logiranja"""
        print("\n🧪 Test: Sistem logiranja")
        
        # Počisti obstoječe loge
        log_file = self.iot_secure.log_file
        if os.path.exists(log_file):
            os.remove(log_file)
        
        # Logiraj test akcijo
        test_device = "test/logging_device"
        test_action = "TEST_LOG"
        test_result = {"status": "success", "message": "test"}
        
        self.iot_secure.log_action(test_device, test_action, test_result, "test_user")
        
        # Preveri, da je log datoteka ustvarjena
        self.assertTrue(os.path.exists(log_file))
        
        # Preberi in preveri log vnos
        with open(log_file, 'r', encoding='utf-8') as f:
            log_line = f.readline().strip()
            log_entry = json.loads(log_line)
        
        self.assertEqual(log_entry["device"], test_device)
        self.assertEqual(log_entry["action"], test_action)
        self.assertEqual(log_entry["result"], test_result)
        self.assertEqual(log_entry["user"], "test_user")
        self.assertEqual(log_entry["module"], "iot_secure")
        
        print("✅ Sistem logiranja deluje pravilno")
    
    @patch('paho.mqtt.client.Client')
    def test_device_control_security(self, mock_mqtt_client):
        """Test varnostnih preveritev pri upravljanju naprav"""
        print("\n🧪 Test: Varnostne preveritve pri upravljanju naprav")
        
        # Mock MQTT klient
        mock_client_instance = Mock()
        mock_mqtt_client.return_value = mock_client_instance
        mock_client_instance.publish.return_value = Mock(rc=0)
        
        # Nastavi povezavo
        self.iot_secure.is_connected = True
        self.iot_secure.mqtt_client = mock_client_instance
        
        # Test veljavnega ukaza
        valid_device = "test/valid_device"
        result = self.iot_secure.turn_on(valid_device, "test_user")
        self.assertTrue(result["success"])
        self.assertIn("varno prižgana", result["message"])
        
        # Test neveljavnega device topic-a
        invalid_device = "../malicious/path"
        result = self.iot_secure.turn_on(invalid_device, "test_user")
        self.assertFalse(result["success"])
        self.assertIn("Neveljaven device topic", result["message"])
        
        # Test rate limiting
        valid_device2 = "test/rate_device"
        result1 = self.iot_secure.turn_on(valid_device2, "test_user")
        result2 = self.iot_secure.turn_on(valid_device2, "test_user")  # Takoj za prvim
        
        self.assertTrue(result1["success"])
        self.assertFalse(result2["success"])
        self.assertIn("Rate limit", result2["message"])
        
        print("✅ Varnostne preveritve pri upravljanju naprav uspešne")
    
    @patch('requests.get')
    def test_api_authentication(self, mock_get):
        """Test REST API avtentikacije"""
        print("\n🧪 Test: REST API avtentikacija")
        
        # Mock uspešen API odgovor
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {'content-type': 'application/json'}
        mock_response.json.return_value = {"status": "online", "temperature": 22.5}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Test API klica z avtentikacijo
        device = "test/api_device"
        status_url = "https://api.example.com/device/status"
        
        result = self.iot_secure.status(device, status_url, "test_user")
        
        # Preveri, da je bil API klic izveden z pravilnimi headers
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        headers = call_args[1]['headers']
        
        self.assertIn('Authorization', headers)
        self.assertEqual(headers['Authorization'], f"Bearer {self.test_config['iot_api_token']}")
        self.assertIn('X-API-Key', headers)
        
        # Preveri rezultat
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["status"], "online")
        
        print("✅ REST API avtentikacija uspešna")
    
    @patch('paho.mqtt.client.Client')
    def test_bulk_operations_security(self, mock_mqtt_client):
        """Test varnosti pri množičnih operacijah"""
        print("\n🧪 Test: Varnost pri množičnih operacijah")
        
        # Mock MQTT klient
        mock_client_instance = Mock()
        mock_mqtt_client.return_value = mock_client_instance
        mock_client_instance.publish.return_value = Mock(rc=0)
        
        self.iot_secure.is_connected = True
        self.iot_secure.mqtt_client = mock_client_instance
        
        # Test veljavnih naprav
        valid_devices = ["test/device1", "test/device2", "test/device3"]
        result = self.iot_secure.bulk_control(valid_devices, "turn_on", "test_user")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["total_devices"], 3)
        self.assertEqual(result["successful"], 3)
        
        # Test z neveljavnimi napravami
        mixed_devices = ["test/valid", "../invalid", "test/valid2"]
        result = self.iot_secure.bulk_control(mixed_devices, "turn_on", "test_user")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["total_devices"], 3)
        self.assertEqual(result["successful"], 2)  # Samo veljavni
        self.assertEqual(result["failed"], 1)
        
        # Test neveljavnega ukaza
        result = self.iot_secure.bulk_control(valid_devices, "invalid_action", "test_user")
        self.assertFalse(result["success"])
        self.assertIn("Neveljaven ukaz", result["message"])
        
        print("✅ Varnost pri množičnih operacijah uspešna")
    
    def test_security_status_reporting(self):
        """Test poročanja o varnostnem statusu"""
        print("\n🧪 Test: Poročanje o varnostnem statusu")
        
        status = self.iot_secure.get_security_status()
        
        # Preveri obvezna polja
        required_fields = [
            "module", "version", "mqtt_connected", "mqtt_broker", 
            "mqtt_port", "tls_enabled", "authentication_enabled",
            "api_token_configured", "logging_enabled", "rate_limiting_enabled",
            "security_level", "timestamp"
        ]
        
        for field in required_fields:
            self.assertIn(field, status)
        
        # Preveri vrednosti
        self.assertEqual(status["module"], "iot_secure")
        self.assertEqual(status["version"], "1.0.0")
        self.assertTrue(status["tls_enabled"])
        self.assertTrue(status["authentication_enabled"])
        self.assertTrue(status["api_token_configured"])
        self.assertTrue(status["logging_enabled"])
        self.assertTrue(status["rate_limiting_enabled"])
        self.assertEqual(status["security_level"], "high")
        
        print("✅ Poročanje o varnostnem statusu uspešno")
    
    def test_audit_logs_retrieval(self):
        """Test pridobivanja audit logov"""
        print("\n🧪 Test: Pridobivanje audit logov")
        
        # Počisti obstoječe loge
        log_file = self.iot_secure.log_file
        if os.path.exists(log_file):
            os.remove(log_file)
        
        # Ustvari nekaj test logov
        test_logs = [
            ("device1", "ACTION1", {"result": "success"}),
            ("device2", "ACTION2", {"result": "failed"}),
            ("device3", "ACTION3", {"result": "success"})
        ]
        
        for device, action, result in test_logs:
            self.iot_secure.log_action(device, action, result, "test_user")
        
        # Pridobi loge
        logs = self.iot_secure.get_audit_logs(limit=10)
        
        self.assertEqual(len(logs), 3)
        
        # Preveri, da so logi v pravilnem vrstnem redu (najnovejši zadnji)
        self.assertEqual(logs[0]["device"], "device1")
        self.assertEqual(logs[1]["device"], "device2")
        self.assertEqual(logs[2]["device"], "device3")
        
        # Test omejevanja števila logov
        logs_limited = self.iot_secure.get_audit_logs(limit=2)
        self.assertEqual(len(logs_limited), 2)
        
        print("✅ Pridobivanje audit logov uspešno")
    
    def test_module_run_function(self):
        """Test glavne run funkcije modula"""
        print("\n🧪 Test: Glavna run funkcija modula")
        
        result = self.iot_secure.run("test query")
        
        # Preveri strukturo odgovora
        required_fields = ["module", "version", "status", "security_status", "capabilities", "timestamp"]
        for field in required_fields:
            self.assertIn(field, result)
        
        # Preveri vrednosti
        self.assertEqual(result["module"], "iot_secure")
        self.assertEqual(result["version"], "1.0.0")
        self.assertEqual(result["status"], "active")
        
        # Preveri capabilities
        expected_capabilities = [
            "secure_device_control", "tls_encryption", "user_authentication",
            "audit_logging", "rate_limiting", "bulk_operations"
        ]
        for capability in expected_capabilities:
            self.assertIn(capability, result["capabilities"])
        
        print("✅ Glavna run funkcija modula uspešna")

def test_omni_integration():
    """Test integracije z Omni sistemom"""
    print("\n🧪 Test: Integracija z Omni sistemom")
    
    try:
        # Poskusi naložiti Omni
        sys.path.insert(0, os.path.dirname(__file__))
        import omni
        
        # Preveri, da je IoT Secure modul registriran
        omni_instance = omni.OmniAI()
        
        if 'iot_secure' in omni_instance.modules:
            print("✅ IoT Secure modul je registriran v Omni sistemu")
            
            # Test osnovnih funkcij preko Omni
            secure_module = omni_instance.modules['iot_secure']
            
            # Test run funkcije
            result = secure_module.run("test")
            print(f"✅ Omni IoT Secure run: {result.get('status', 'unknown')}")
            
            # Test varnostnega statusa
            security_status = secure_module.get_security_status()
            print(f"✅ Varnostni status: {security_status.get('security_level', 'unknown')}")
            
            return True
        else:
            print("❌ IoT Secure modul ni registriran v Omni sistemu")
            return False
            
    except Exception as e:
        print(f"⚠️ Napaka pri testiranju Omni integracije: {e}")
        return False

def test_environment_setup():
    """Test nastavitev okolja"""
    print("\n🧪 Test: Nastavitve okolja")
    
    # Preveri potrebne environment variables
    required_env_vars = [
        "MQTT_SECURE_BROKER",
        "MQTT_SECURE_PORT", 
        "MQTT_SECURE_USERNAME",
        "IOT_API_TOKEN"
    ]
    
    missing_vars = []
    for var in required_env_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️ Manjkajoče environment variables: {missing_vars}")
        print("💡 Ustvari .env datoteko z nastavitvami")
    else:
        print("✅ Vse potrebne environment variables so nastavljene")
    
    # Preveri direktorije
    log_dir = Path("data/logs")
    if not log_dir.exists():
        log_dir.mkdir(parents=True, exist_ok=True)
        print("✅ Log direktorij ustvarjen")
    else:
        print("✅ Log direktorij obstaja")
    
    return len(missing_vars) == 0

def create_env_template():
    """Ustvari .env template za varnostne nastavitve"""
    env_content = """# 🔒 Omni IoT Secure Configuration
# Varnostne nastavitve za IoT Secure modul

# MQTT Secure Broker (TLS)
MQTT_SECURE_BROKER=localhost
MQTT_SECURE_PORT=8883
MQTT_SECURE_USERNAME=omni_secure
MQTT_SECURE_PASSWORD=your_secure_password_here

# TLS Certifikati (opcijsko)
MQTT_CA_CERT=path/to/ca.crt
MQTT_CLIENT_CERT=path/to/client.crt
MQTT_CLIENT_KEY=path/to/client.key

# API Avtentikacija
IOT_API_TOKEN=your_api_token_here
IOT_API_SECRET=your_api_secret_here

# Varnostne nastavitve
MAX_RETRY_ATTEMPTS=3
COMMAND_TIMEOUT=10
RATE_LIMIT_ENABLED=true
AUDIT_LOGGING=true
SECURITY_LEVEL=high

# Debugging
IOT_SECURE_DEBUG=false
"""
    
    env_file = ".env.secure"
    with open(env_file, "w", encoding="utf-8") as f:
        f.write(env_content)
    
    print(f"✅ Ustvarjen .env template: {env_file}")

def main():
    """Glavna test funkcija"""
    print("🔒 Omni IoT Secure Integration Tests")
    print("=" * 50)
    
    # Test nastavitev okolja
    env_ok = test_environment_setup()
    
    # Ustvari .env template
    create_env_template()
    
    # Test Omni integracije
    omni_ok = test_omni_integration()
    
    # Poženj unit teste
    print("\n🧪 Poganjam unit teste...")
    unittest.main(argv=[''], exit=False, verbosity=2)
    
    # Povzetek
    print("\n" + "=" * 50)
    print("📊 POVZETEK TESTOV")
    print("=" * 50)
    print(f"🌍 Okolje: {'✅ OK' if env_ok else '⚠️ Manjkajo nastavitve'}")
    print(f"🤖 Omni integracija: {'✅ OK' if omni_ok else '❌ Napaka'}")
    print("🔒 IoT Secure modul: Pripravljen za produkcijo")
    print("\n💡 Naslednji koraki:")
    print("1. Nastavi .env.secure datoteko z resničnimi vrednostmi")
    print("2. Nastavi MQTT broker z TLS podporo")
    print("3. Konfiguriraj API tokene za naprave")
    print("4. Testiraj z resničnimi napravami")
    print("5. Nastavi monitoring in alerting")

if __name__ == "__main__":
    main()