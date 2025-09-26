#!/usr/bin/env python3
"""
🧪 Test skripta za optimizirano MQTT konfiguracijo
Preveri delovanje in kompatibilnost MQTT nastavitev
"""

import sys
import os
import time
import json
from datetime import datetime

# Dodaj pot do modula
sys.path.append(os.path.join(os.path.dirname(__file__), 'omni'))

try:
    from config.mqtt_config import get_mqtt_config, create_optimized_client, test_mqtt_connection
    from modules.iot.iot_secure import IoTSecureModule
    from modules.iot.iot_real import IoTRealModule
except ImportError as e:
    print(f"❌ Napaka pri uvozu modulov: {e}")
    sys.exit(1)

def test_mqtt_config():
    """Testiraj MQTT konfiguracijo"""
    print("🔧 Testiram MQTT konfiguracijo...")
    
    config = get_mqtt_config()
    validation = config.validate_config()
    
    print(f"✅ Konfiguracija veljavna: {validation['valid']}")
    print(f"📊 Povzetek: {json.dumps(validation['config_summary'], indent=2, ensure_ascii=False)}")
    
    if validation['warnings']:
        print("\n⚠️ Opozorila:")
        for warning in validation['warnings']:
            print(f"  - {warning}")
    
    if validation['issues']:
        print("\n❌ Težave:")
        for issue in validation['issues']:
            print(f"  - {issue}")
    
    return validation['valid']

def test_mqtt_connection_basic():
    """Testiraj osnovno MQTT povezavo"""
    print("\n🔗 Testiram osnovno MQTT povezavo...")
    
    result = test_mqtt_connection()
    print(f"Rezultat: {result['message']}")
    print(f"Broker: {result['broker']}")
    
    return result['success']

def test_optimized_client():
    """Testiraj optimiziran MQTT klient"""
    print("\n🚀 Testiram optimiziran MQTT klient...")
    
    try:
        client = create_optimized_client("test_client_optimized")
        config = get_mqtt_config()
        
        # Test povezava
        connection_config = config.get_connection_config()
        client.connect(**connection_config)
        client.loop_start()
        
        # Počakaj na povezavo
        time.sleep(3)
        
        if client.is_connected():
            print("✅ Optimiziran klient uspešno povezan")
            
            # Test objavljanja
            publish_config = config.get_publish_config('command')
            result = client.publish("test/topic", "test_message", **publish_config)
            
            if result.rc == 0:
                print("✅ Test sporočilo uspešno objavljeno")
            else:
                print(f"❌ Napaka pri objavljanju: {result.rc}")
            
            client.disconnect()
            client.loop_stop()
            return True
        else:
            print("❌ Optimiziran klient se ni mogel povezati")
            return False
            
    except Exception as e:
        print(f"❌ Napaka pri testiranju optimiziranega klienta: {e}")
        return False

def test_iot_modules():
    """Testiraj IoT module z optimizirano konfiguracijo"""
    print("\n🏠 Testiram IoT module...")
    
    # Test IoT Secure Module
    try:
        print("  🔒 Testiram IoT Secure Module...")
        secure_module = IoTSecureModule()
        time.sleep(2)  # Počakaj na inicializacijo
        
        if hasattr(secure_module, 'is_connected') and secure_module.is_connected:
            print("  ✅ IoT Secure Module uspešno povezan")
        else:
            print("  ⚠️ IoT Secure Module ni povezan (normalno za test)")
            
    except Exception as e:
        print(f"  ❌ Napaka v IoT Secure Module: {e}")
    
    # Test Real IoT Module
    try:
        print("  🌐 Testiram Real IoT Module...")
        real_module = IoTRealModule()
        time.sleep(2)  # Počakaj na inicializacijo
        
        if hasattr(real_module, 'mqtt_connected') and real_module.mqtt_connected:
            print("  ✅ Real IoT Module uspešno povezan")
        else:
            print("  ⚠️ Real IoT Module ni povezan (normalno za test)")
            
    except Exception as e:
        print(f"  ❌ Napaka v Real IoT Module: {e}")

def test_performance():
    """Testiraj performanse MQTT konfiguracije"""
    print("\n⚡ Testiram performanse...")
    
    try:
        config = get_mqtt_config()
        
        # Test hitrosti ustvarjanja klientov
        start_time = time.time()
        clients = []
        
        for i in range(5):
            client = create_optimized_client(f"perf_test_{i}")
            clients.append(client)
        
        creation_time = time.time() - start_time
        print(f"  📊 Čas ustvarjanja 5 klientov: {creation_time:.3f}s")
        
        # Test povezav
        start_time = time.time()
        connected_count = 0
        
        for client in clients:
            try:
                connection_config = config.get_connection_config()
                client.connect(**connection_config)
                client.loop_start()
                time.sleep(0.5)  # Kratka pauza
                
                if client.is_connected():
                    connected_count += 1
                    
                client.disconnect()
                client.loop_stop()
                
            except Exception as e:
                print(f"    ⚠️ Klient {client._client_id} se ni mogel povezati: {e}")
        
        connection_time = time.time() - start_time
        print(f"  📊 Čas testiranja povezav: {connection_time:.3f}s")
        print(f"  📊 Uspešno povezanih: {connected_count}/5")
        
    except Exception as e:
        print(f"  ❌ Napaka pri testiranju performans: {e}")

def generate_report():
    """Generiraj poročilo o testiranju"""
    print("\n📋 Generiram poročilo...")
    
    config = get_mqtt_config()
    validation = config.validate_config()
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "mqtt_config": {
            "broker": config.broker,
            "port": config.port,
            "tls_enabled": config.use_tls,
            "auth_enabled": bool(config.username and config.password),
            "protocol": "MQTTv3.1.1",
            "qos_settings": {
                "default": config.default_qos,
                "command": config.command_qos,
                "status": config.status_qos
            }
        },
        "validation": validation,
        "test_results": {
            "config_valid": validation['valid'],
            "connection_test": test_mqtt_connection()['success']
        }
    }
    
    # Shrani poročilo
    report_file = "mqtt_optimization_report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"📄 Poročilo shranjeno v: {report_file}")
    return report

def main():
    """Glavna funkcija za testiranje"""
    print("🧪 MQTT Optimizacija - Test Suite")
    print("=" * 50)
    
    # Testiraj konfiguracijo
    config_ok = test_mqtt_config()
    
    # Testiraj povezavo
    connection_ok = test_mqtt_connection_basic()
    
    # Testiraj optimiziran klient
    client_ok = test_optimized_client()
    
    # Testiraj IoT module
    test_iot_modules()
    
    # Testiraj performanse
    test_performance()
    
    # Generiraj poročilo
    report = generate_report()
    
    # Povzetek
    print("\n" + "=" * 50)
    print("📊 POVZETEK TESTIRANJA")
    print("=" * 50)
    print(f"✅ Konfiguracija veljavna: {'DA' if config_ok else 'NE'}")
    print(f"✅ Osnovna povezava: {'DA' if connection_ok else 'NE'}")
    print(f"✅ Optimiziran klient: {'DA' if client_ok else 'NE'}")
    
    if config_ok and connection_ok and client_ok:
        print("\n🎉 Vsi testi uspešni! MQTT optimizacija je pripravljena.")
    else:
        print("\n⚠️ Nekateri testi niso uspešni. Preveri konfiguracijo.")
    
    print(f"\n📄 Podrobno poročilo: mqtt_optimization_report.json")

if __name__ == "__main__":
    main()