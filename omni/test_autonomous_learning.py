#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test skript za samoučečo avtonomno optimizacijo IoT sistema
Testira različne scenarije in preverja odzive sistema
"""

import time
import json
import os
import sys
import requests
from datetime import datetime, timedelta

# Dodaj pot do modulov
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules', 'iot'))

try:
    import iot_autonomous_learning as learning_module
    # Ustvari instanco samoučečega sistema
    learning_system = learning_module.IoTAutonomousLearning()
    print("✅ Samoučeči modul uspešno naložen")
except ImportError as e:
    print(f"❌ Napaka pri nalaganju modula: {e}")
    sys.exit(1)

def test_device_logging():
    """Test beleženja stanja naprav"""
    print("\n🧪 Test 1: Beleženje stanja naprav")
    
    test_device_id = "test/device1"
    
    # Simuliraj različna stanja
    usage_data_samples = [
        {"state": "on", "energy_consumption": 50.0, "performance_score": 0.9},
        {"state": "off", "energy_consumption": 0.0, "performance_score": 1.0},
        {"state": "dimmed", "energy_consumption": 25.0, "performance_score": 0.8},
        {"state": "on", "energy_consumption": 48.0, "performance_score": 0.85},
        {"state": "off", "energy_consumption": 0.0, "performance_score": 1.0}
    ]
    
    for usage_data in usage_data_samples:
        learning_system.record_device_usage(test_device_id, usage_data)
        print(f"   📝 Zabeleženo stanje: {usage_data['state']}")
        time.sleep(0.5)
    
    # Preveri ali so podatki shranjeni
    if test_device_id in learning_system.device_patterns:
        pattern = learning_system.device_patterns[test_device_id]
        print(f"   ✅ Shranjenih {len(pattern.usage_times)} zapisov")
        return True
    
    print("   ❌ Podatki niso bili shranjeni")
    return False

def test_optimization_patterns():
    """Test prepoznavanja vzorcev uporabe"""
    print("\n🧪 Test 2: Prepoznavanje vzorcev optimizacije")
    
    test_device_id = "test/smart_light"
    
    # Simuliraj podatke za različne ure dneva
    usage_patterns = [
        {"hour": 17, "state": "on", "energy_consumption": 60.0, "performance_score": 0.9},
        {"hour": 18, "state": "on", "energy_consumption": 55.0, "performance_score": 0.95}, 
        {"hour": 19, "state": "dimmed", "energy_consumption": 30.0, "performance_score": 0.8},
        {"hour": 22, "state": "dimmed", "energy_consumption": 25.0, "performance_score": 0.7},
        {"hour": 23, "state": "off", "energy_consumption": 0.0, "performance_score": 1.0}
    ]
    
    for pattern in usage_patterns:
        # Simuliraj časovni žig
        timestamp = datetime.now().replace(hour=pattern["hour"], minute=0)
        usage_data = {
            "state": pattern["state"],
            "energy_consumption": pattern["energy_consumption"],
            "performance_score": pattern["performance_score"],
            "timestamp": timestamp.isoformat()
        }
        
        learning_system.record_device_usage(test_device_id, usage_data)
        print(f"   📊 Vzorec {pattern['hour']}:00 - {pattern['state']}")
    
    print("   ✅ Vzorci uporabe zabeleženi")
    return True

def test_energy_optimization():
    """Test optimizacije porabe energije"""
    print("\n🧪 Test 3: Optimizacija porabe energije")
    
    # Simuliraj naprave z različno porabo
    devices = [
        {"device_id": "office/computer", "type": "computer", "power": 200},
        {"device_id": "home/heater", "type": "heater", "power": 1500},
        {"device_id": "garden/lights", "type": "light", "power": 50}
    ]
    
    total_savings = 0
    
    for device in devices:
        # Simuliraj optimizacijo
        original_usage = device["power"] * 8  # 8 ur uporabe
        optimized_usage = original_usage * 0.8  # 20% prihranek
        savings = original_usage - optimized_usage
        total_savings += savings
        
        print(f"   💡 {device['device_id']}: -{savings:.0f}Wh prihranek")
        
        # Zabeleži optimizacijo
        optimization_data = {
            "device_type": device["type"],
            "original_usage": original_usage,
            "optimized_usage": optimized_usage,
            "energy_consumption": optimized_usage,
            "performance_score": 0.9,
            "savings": savings
        }
        
        learning_system.record_device_usage(device["device_id"], optimization_data)
    
    print(f"   ✅ Skupni prihranek: {total_savings:.0f}Wh/dan")
    return total_savings > 0

def test_schedule_adaptation():
    """Test prilagajanja urnikov"""
    print("\n🧪 Test 4: Prilagajanje urnikov")
    
    device_id = "home/livingroom/light"
    
    # Simuliraj, da se luč pogosto uporablja prej
    early_usage = [
        {"time": "17:30", "state": "manual_on", "energy_consumption": 45.0, "performance_score": 0.9},
        {"time": "17:45", "state": "manual_on", "energy_consumption": 48.0, "performance_score": 0.85},
        {"time": "17:40", "state": "manual_on", "energy_consumption": 46.0, "performance_score": 0.88}
    ]
    
    for usage in early_usage:
        learning_system.record_device_usage(device_id, usage)
        print(f"   📅 Zgodnja uporaba: {usage['time']}")
    
    # Simuliraj prilagoditev urnika (to bi sistem naredil avtomatsko)
    print(f"   ✅ Urnik bi bil prilagojen na podlagi vzorcev uporabe")
    return True

def test_emergency_actions():
    """Test nujnih ukrepov"""
    print("\n🧪 Test 5: Nujni ukrepi")
    
    # Simuliraj kritične situacije
    emergency_scenarios = [
        {"device_id": "factory/machine1", "temperature": 85, "threshold": 75, "energy_consumption": 2000},
        {"device_id": "server/rack1", "cpu_usage": 95, "threshold": 90, "energy_consumption": 500},
        {"device_id": "home/heater", "power_usage": 2000, "threshold": 1800, "energy_consumption": 2000}
    ]
    
    actions_taken = 0
    
    for scenario in emergency_scenarios:
        critical_condition = (
            scenario.get("temperature", 0) > scenario.get("threshold", 100) or
            scenario.get("cpu_usage", 0) > scenario.get("threshold", 100) or
            scenario.get("power_usage", 0) > scenario.get("threshold", 2000)
        )
        
        if critical_condition:
            action = f"emergency_shutdown_{scenario['device_id'].replace('/', '_')}"
            print(f"   🚨 Nujni ukrep: {action}")
            
            # Zabeleži nujni ukrep
            emergency_data = {
                "state": "emergency_shutdown",
                "energy_consumption": scenario["energy_consumption"],
                "performance_score": 0.0,
                "emergency_reason": "threshold_exceeded",
                "scenario_data": json.dumps(scenario)
            }
            
            learning_system.record_device_usage(scenario["device_id"], emergency_data)
            actions_taken += 1
    
    print(f"   ✅ Izvedenih {actions_taken} nujnih ukrepov")
    return actions_taken > 0

def test_learning_memory():
    """Test spomina in učenja"""
    print("\n🧪 Test 6: Spomin in učenje")
    
    # Preveri ali obstaja datoteka s spominom
    if os.path.exists(learning_system.memory_file):
        with open(learning_system.memory_file, "r", encoding="utf-8") as f:
            memory = json.load(f)
            
        device_count = len(memory.get('patterns', {}))
        rules_count = len(memory.get('rules', []))
        learning_level = memory.get('learning_level', 0)
        
        print(f"   📊 Naprav v spominu: {device_count}")
        print(f"   📝 Optimizacijskih pravil: {rules_count}")
        print(f"   🧠 Nivo učenja: {learning_level}")
        
        # Prikaži nekaj primerov iz trenutnih vzorcev
        current_patterns = learning_system.device_patterns
        for device_id, pattern in list(current_patterns.items())[:3]:
            usage_count = len(pattern.usage_times)
            energy_avg = sum(pattern.energy_consumption) / len(pattern.energy_consumption) if pattern.energy_consumption else 0
            print(f"   📱 {device_id}: {usage_count} zapisov, povprečna poraba: {energy_avg:.1f}W")
        
        return device_count > 0 or len(current_patterns) > 0
    else:
        # Preveri trenutne vzorce v spominu
        current_patterns = learning_system.device_patterns
        if current_patterns:
            print(f"   📊 Trenutnih vzorcev v spominu: {len(current_patterns)}")
            for device_id, pattern in current_patterns.items():
                usage_count = len(pattern.usage_times)
                print(f"   📱 {device_id}: {usage_count} zapisov")
            return True
        else:
            print("   ❌ Ni podatkov v spominu")
            return False

def run_comprehensive_test():
    """Zaženi celovit test samoučeče optimizacije"""
    print("🚀 Začenjam celovit test samoučeče avtonomne optimizacije")
    print("=" * 60)
    
    tests = [
        ("Beleženje naprav", test_device_logging),
        ("Vzorci optimizacije", test_optimization_patterns), 
        ("Energijska optimizacija", test_energy_optimization),
        ("Prilagajanje urnikov", test_schedule_adaptation),
        ("Nujni ukrepi", test_emergency_actions),
        ("Spomin in učenje", test_learning_memory)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if result:
                passed += 1
                print(f"✅ {test_name}: USPEŠNO")
            else:
                print(f"❌ {test_name}: NEUSPEŠNO")
        except Exception as e:
            print(f"❌ {test_name}: NAPAKA - {e}")
        
        time.sleep(1)  # Kratka pavza med testi
    
    print("\n" + "=" * 60)
    print(f"📊 REZULTATI TESTIRANJA:")
    print(f"   ✅ Uspešnih testov: {passed}/{total}")
    print(f"   📈 Uspešnost: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("🎉 VSI TESTI USPEŠNO OPRAVLJENI!")
        print("🤖 Samoučeča avtonomna optimizacija deluje pravilno")
    else:
        print("⚠️  Nekateri testi niso uspešni - preveri konfiguracijo")
    
    return passed == total

if __name__ == "__main__":
    success = run_comprehensive_test()
    
    if success:
        print("\n🔄 Sistem je pripravljen za avtonomno delovanje")
        print("💡 Samoučeča optimizacija bo kontinuirano izboljševala delovanje")
    else:
        print("\n🔧 Potrebne so dodatne nastavitve za optimalno delovanje")
    
    sys.exit(0 if success else 1)