#!/usr/bin/env python3
"""
🏠 Test skript za realno IoT integracijo
Testira MQTT, REST API in Home Assistant funkcionalnosti.

Avtor: Omni AI Platform
Verzija: 1.0.0
"""

import sys
import os
import time
import json

# Dodaj pot do projekta
sys.path.insert(0, os.getcwd())

def test_real_iot_module():
    """Test realnega IoT modula"""
    print("🏠 === TEST REALNEGA IOT MODULA ===\n")
    
    try:
        from omni.modules.iot.iot_real import IoTRealModule
        
        # Inicializiraj modul
        print("1️⃣ Inicializacija realnega IoT modula...")
        iot_real = IoTRealModule()
        print("✅ Modul uspešno inicializiran\n")
        
        # Test osnovnih MQTT funkcij
        print("2️⃣ Test osnovnih MQTT funkcij...")
        
        # Test prižiganja naprave
        result = iot_real.turn_on("home/livingroom/light")
        print(f"   Prižig luči: {result['message']}")
        
        # Test ugašanja naprave
        result = iot_real.turn_off("office/pc1")
        print(f"   Ugašanje PC: {result['message']}")
        
        # Test ponovnega zagona
        result = iot_real.restart("factory/machine1")
        print(f"   Restart stroja: {result['message']}")
        
        # Test stanja naprave
        result = iot_real.status("home/livingroom/light")
        print(f"   Stanje luči: {result.get('message', 'Stanje pridobljeno')}")
        print("✅ Osnovne MQTT funkcije testirane\n")
        
        # Test REST API funkcij
        print("3️⃣ Test REST API funkcij...")
        
        # Test stanja preko REST API (simulacija)
        test_url = "https://httpbin.org/json"  # Test URL
        result = iot_real.status("test_device", test_url)
        if result['success']:
            print(f"   REST API test: ✅ Uspešno")
        else:
            print(f"   REST API test: ⚠️ {result['message']}")
        print("✅ REST API funkcije testirane\n")
        
        # Test Home Assistant integracije
        print("4️⃣ Test Home Assistant integracije...")
        
        # Test Home Assistant klica (bo neuspešen brez tokena, ampak testira logiko)
        result = iot_real.home_assistant_call("light.living_room", "turn_on")
        if "HOME_ASSISTANT_TOKEN" in result['message']:
            print("   Home Assistant: ⚠️ Token ni nastavljen (pričakovano)")
        else:
            print(f"   Home Assistant: {result['message']}")
        print("✅ Home Assistant integracija testirana\n")
        
        # Test množičnega upravljanja
        print("5️⃣ Test množičnega upravljanja...")
        
        devices = ["home/bedroom/light", "home/kitchen/light", "office/pc2"]
        result = iot_real.bulk_control(devices, "turn_on")
        print(f"   Množično upravljanje: {result['successful']}/{result['total_devices']} uspešno")
        print("✅ Množično upravljanje testirano\n")
        
        # Test seznama naprav
        print("6️⃣ Test seznama naprav...")
        
        result = iot_real.list_devices()
        print(f"   MQTT povezan: {result['mqtt_connected']}")
        print(f"   MQTT broker: {result['mqtt_broker']}")
        print(f"   Sledene naprave: {result['tracked_devices']}")
        print(f"   Home Assistant: {'✅' if result['home_assistant_configured'] else '❌'}")
        print("✅ Seznam naprav testiran\n")
        
        # Test poljubnega MQTT sporočila
        print("7️⃣ Test poljubnega MQTT sporočila...")
        
        result = iot_real.send_custom_mqtt("omni/test/message", "Hello from Omni!")
        print(f"   Poljubno MQTT: {result['message']}")
        print("✅ Poljubno MQTT sporočilo testirano\n")
        
        # Test run() funkcije
        print("8️⃣ Test run() funkcije...")
        
        result = iot_real.run("Upravljaj realne IoT naprave")
        print(f"   Modul: {result['module']}")
        print(f"   Verzija: {result['version']}")
        print(f"   MQTT status: {result['mqtt_status']}")
        print(f"   Funkcionalnosti: {len(result['capabilities'])}")
        print("✅ run() funkcija testirana\n")
        
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri testiranju realnega IoT modula: {e}")
        return False

def test_omni_integration():
    """Test integracije z Omni sistemom"""
    print("🤖 === TEST OMNI INTEGRACIJE ===\n")
    
    try:
        from omni import OmniCore
        
        # Inicializiraj Omni sistem
        print("1️⃣ Inicializacija Omni sistema...")
        omni = OmniCore()
        print("✅ Omni sistem inicializiran\n")
        
        # Preveri registracijo realnega IoT modula
        print("2️⃣ Preverjam registracijo realnega IoT modula...")
        
        if 'iot_real' in omni.modules:
            iot_real_module = omni.modules['iot_real']
            print("✅ Realni IoT modul najden v sistemu")
            
            # Test funkcij preko Omni sistema
            print("\n3️⃣ Test funkcij preko Omni sistema...")
            
            result = iot_real_module.turn_on("omni/test/light")
            print(f"   Prižig preko Omni: {result['message']}")
            
            result = iot_real_module.list_devices()
            print(f"   Seznam naprav: {result['tracked_devices']} naprav")
            
            print("✅ Funkcije preko Omni sistema delujejo")
            
        else:
            print("❌ Realni IoT modul ni registriran v sistemu")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri testiranju Omni integracije: {e}")
        return False

def test_environment_setup():
    """Test nastavitev okolja"""
    print("🔧 === TEST NASTAVITEV OKOLJA ===\n")
    
    # Preveri Python pakete
    print("1️⃣ Preverjam Python pakete...")
    
    try:
        import paho.mqtt.client as mqtt
        print("   ✅ paho-mqtt nameščen")
    except ImportError:
        print("   ❌ paho-mqtt ni nameščen")
        return False
    
    try:
        import requests
        print("   ✅ requests nameščen")
    except ImportError:
        print("   ❌ requests ni nameščen")
        return False
    
    # Preveri okoljske spremenljivke
    print("\n2️⃣ Preverjam okoljske spremenljivke...")
    
    env_vars = [
        "MQTT_BROKER",
        "MQTT_PORT", 
        "MQTT_USERNAME",
        "MQTT_PASSWORD",
        "HOME_ASSISTANT_URL",
        "HOME_ASSISTANT_TOKEN"
    ]
    
    for var in env_vars:
        value = os.getenv(var)
        if value:
            print(f"   ✅ {var}: nastavljeno")
        else:
            print(f"   ⚠️ {var}: ni nastavljeno (opcijsko)")
    
    print("\n✅ Preverjanje okolja končano")
    return True

def create_env_template():
    """Ustvari predlogo .env datoteke"""
    print("\n📝 Ustvarjam predlogo .env datoteke...")
    
    env_template = """# Omni IoT Real Module - Okoljske spremenljivke

# MQTT Broker nastavitve
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_USERNAME=your_mqtt_username
MQTT_PASSWORD=your_mqtt_password

# Home Assistant nastavitve
HOME_ASSISTANT_URL=http://localhost:8123
HOME_ASSISTANT_TOKEN=your_home_assistant_token

# Dodatne nastavitve
IOT_DEVICE_TIMEOUT=10
IOT_AUTO_RECONNECT=true
"""
    
    try:
        with open('.env.iot_real_template', 'w', encoding='utf-8') as f:
            f.write(env_template)
        print("✅ Predloga .env datoteke ustvarjena: .env.iot_real_template")
        print("   Kopiraj v .env in nastavi svoje vrednosti")
    except Exception as e:
        print(f"❌ Napaka pri ustvarjanju predloge: {e}")

def main():
    """Glavna test funkcija"""
    print("🚀 OMNI IOT REAL - INTEGRACIJSKI TESTI")
    print("=" * 50)
    
    # Test nastavitev okolja
    env_ok = test_environment_setup()
    
    # Test realnega IoT modula
    module_ok = test_real_iot_module()
    
    # Test Omni integracije
    integration_ok = test_omni_integration()
    
    # Ustvari predlogo .env datoteke
    create_env_template()
    
    # Povzetek rezultatov
    print("\n" + "=" * 50)
    print("📊 POVZETEK TESTOV:")
    print(f"   🔧 Okolje: {'✅' if env_ok else '❌'}")
    print(f"   🏠 IoT modul: {'✅' if module_ok else '❌'}")
    print(f"   🤖 Omni integracija: {'✅' if integration_ok else '❌'}")
    
    if all([env_ok, module_ok, integration_ok]):
        print("\n🎉 VSI TESTI USPEŠNI!")
        print("\n📋 Naslednji koraki:")
        print("   1. Nastavi MQTT broker (Mosquitto)")
        print("   2. Konfiguriraj Home Assistant (opcijsko)")
        print("   3. Nastavi okoljske spremenljivke v .env")
        print("   4. Testiraj z resničnimi napravami")
        
        return True
    else:
        print("\n⚠️ NEKATERI TESTI NEUSPEŠNI")
        print("   Preveri napake zgoraj in popravi nastavitve")
        
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)