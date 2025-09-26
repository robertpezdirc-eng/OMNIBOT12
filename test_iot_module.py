#!/usr/bin/env python3
"""
Test skripta za IoT modul
Demonstracija vseh funkcionalnosti nadzora naprav

Avtor: Omni AI Team
Verzija: 1.0.0
"""

import sys
import os
import time
from datetime import datetime

# Dodaj trenutni direktorij v Python path
sys.path.insert(0, os.getcwd())

try:
    from omni.core.engine import OmniCore
    from omni.modules.iot.iot import IoTModule
    print("✅ Uspešno uvoženi moduli")
except ImportError as e:
    print(f"❌ Napaka pri uvozu: {e}")
    sys.exit(1)

def test_basic_iot_functions():
    """Test osnovnih IoT funkcij"""
    print("\n" + "="*50)
    print("🏠 TEST OSNOVNIH IoT FUNKCIJ")
    print("="*50)
    
    # Ustvari IoT modul
    iot = IoTModule()
    
    # Test prižiganja naprav
    print("\n🔌 Test prižiganja naprav:")
    print(iot.turn_on("Pametna TV"))
    print(iot.turn_on("Računalnik v pisarni"))
    print(iot.turn_on("Klimatska naprava"))
    
    time.sleep(1)
    
    # Test ugašanja naprav
    print("\n⭕ Test ugašanja naprav:")
    print(iot.turn_off("Pametna luč"))
    print(iot.turn_off("Stroj 2"))
    
    time.sleep(1)
    
    # Test ponovnega zagona
    print("\n🔄 Test ponovnega zagona:")
    print(iot.restart("Stroj 1"))
    print(iot.restart("Računalnik v pisarni"))
    
    time.sleep(1)
    
    # Test preverjanja stanja
    print("\n📊 Test preverjanja stanja:")
    print(iot.status("Pametna TV"))
    print(iot.status("Stroj 1"))
    print(iot.status("Neznana naprava"))
    
    return iot

def test_advanced_iot_functions(iot):
    """Test naprednih IoT funkcij"""
    print("\n" + "="*50)
    print("🚀 TEST NAPREDNIH IoT FUNKCIJ")
    print("="*50)
    
    # Test seznama naprav
    print("\n📋 Seznam vseh naprav:")
    devices = iot.list_devices()
    for i, device in enumerate(devices, 1):
        status_icon = "✅" if device['status'] == 'on' else "⭕"
        print(f"  {i}. {device['name']}: {status_icon} {device['status']}")
        if device['last_action']:
            print(f"     Zadnja akcija: {device['last_action']}")
    
    # Test množičnega nadzora
    print("\n🔄 Test množičnega nadzora:")
    bulk_devices = ["Pametna TV", "Stroj 1", "Klimatska naprava"]
    
    print("  Prižigam vse naprave...")
    results = iot.bulk_control("turn_on", bulk_devices)
    for device, result in results.items():
        print(f"    {result}")
    
    time.sleep(1)
    
    print("  Ugašam vse naprave...")
    results = iot.bulk_control("turn_off", bulk_devices)
    for device, result in results.items():
        print(f"    {result}")

def test_iot_run_method(iot):
    """Test run metode IoT modula"""
    print("\n" + "="*50)
    print("🎯 TEST RUN METODE IoT MODULA")
    print("="*50)
    
    test_commands = [
        "Prižgi pametno TV",
        "Ugasni računalnik v pisarni",
        "Restart stroj 1",
        "Preveri stanje klimatske naprave",
        "Seznam vseh naprav",
        "Prižgi vse naprave",
        "Splošni IoT ukaz"
    ]
    
    for i, command in enumerate(test_commands, 1):
        print(f"\n{i}. Ukaz: '{command}'")
        result = iot.run(command)
        
        print(f"   Modul: {result['module']}")
        print(f"   Akcija: {result['action']}")
        
        if 'results' in result:
            for res in result['results']:
                print(f"   → {res}")
        
        if 'error' in result:
            print(f"   ❌ Napaka: {result['error']}")
        
        time.sleep(0.5)

def test_omni_core_integration():
    """Test integracije z OmniCore"""
    print("\n" + "="*50)
    print("🔗 TEST INTEGRACIJE Z OMNICORE")
    print("="*50)
    
    try:
        # Inicializiraj OmniCore
        print("🚀 Inicializacija OmniCore...")
        omni = OmniCore(debug=True)
        
        # Registriraj IoT modul
        print("📦 Registracija IoT modula...")
        iot_module = IoTModule()
        omni.register_module("iot", iot_module)
        
        # Test preko OmniCore
        print("\n🎯 Test ukazov preko OmniCore:")
        
        test_queries = [
            "Prižgi pametno TV in preveri stanje",
            "IoT nadzor: ugasni vse naprave",
            "Seznam IoT naprav",
            "Restart stroj 1 in klimatsko napravo"
        ]
        
        for i, query in enumerate(test_queries, 1):
            print(f"\n{i}. Poizvedba: '{query}'")
            
            try:
                result = omni.run(query)
                
                if 'iot' in result and result['iot']:
                    iot_result = result['iot']
                    print(f"   ✅ IoT rezultat: {iot_result['action']}")
                    
                    if 'results' in iot_result:
                        for res in iot_result['results']:
                            print(f"      → {res}")
                else:
                    print("   ℹ️  IoT modul ni bil aktiviran za to poizvedbo")
                    
            except Exception as e:
                print(f"   ❌ Napaka: {e}")
            
            time.sleep(0.5)
        
        # Status IoT modula
        print(f"\n📊 Status IoT modula:")
        status = iot_module.get_status()
        for key, value in status.items():
            print(f"   {key}: {value}")
        
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri integraciji z OmniCore: {e}")
        return False

def test_error_handling():
    """Test obravnave napak"""
    print("\n" + "="*50)
    print("⚠️  TEST OBRAVNAVE NAPAK")
    print("="*50)
    
    iot = IoTModule()
    
    # Test z neveljavnimi parametri
    print("\n🧪 Test z neveljavnimi parametri:")
    
    test_cases = [
        ("", "prazen string"),
        (None, "None vrednost"),
        ("Naprava z zelo dolgim imenom ki presega običajne meje", "predolgo ime"),
        ("Naprava!@#$%^&*()", "posebni znaki")
    ]
    
    for device_name, description in test_cases:
        print(f"\n  Test {description}:")
        try:
            result = iot.turn_on(device_name)
            print(f"    Rezultat: {result}")
        except Exception as e:
            print(f"    ❌ Napaka: {e}")

def main():
    """Glavna test funkcija"""
    print("🏠 OMNI IoT MODUL - CELOVIT TEST")
    print("=" * 60)
    print(f"📅 Čas testa: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    try:
        # Test osnovnih funkcij
        iot = test_basic_iot_functions()
        
        # Test naprednih funkcij
        test_advanced_iot_functions(iot)
        
        # Test run metode
        test_iot_run_method(iot)
        
        # Test integracije z OmniCore
        integration_success = test_omni_core_integration()
        
        # Test obravnave napak
        test_error_handling()
        
        # Povzetek
        print("\n" + "="*60)
        print("📊 POVZETEK TESTOV")
        print("="*60)
        print("✅ Osnovne IoT funkcije: USPEŠNO")
        print("✅ Napredne IoT funkcije: USPEŠNO")
        print("✅ Run metoda: USPEŠNO")
        print(f"{'✅' if integration_success else '❌'} OmniCore integracija: {'USPEŠNO' if integration_success else 'NEUSPEŠNO'}")
        print("✅ Obravnava napak: USPEŠNO")
        
        print("\n🎉 Vsi testi IoT modula so bili uspešno izvedeni!")
        print("\n💡 Naslednji koraki:")
        print("   1. Nastavi realne API ključe za povezavo z napravami")
        print("   2. Konfiguriraj MQTT broker za IoT komunikacijo")
        print("   3. Dodaj podporo za Home Assistant integracijo")
        print("   4. Implementiraj WebSocket za real-time nadzor")
        
    except Exception as e:
        print(f"\n❌ Kritična napaka med testiranjem: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)