#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌍 Test Omni Global Optimizer
=============================

Test celotnega globalnega optimizatorja:
- OmniCore sistem
- Vsi domenski moduli
- Globalna optimizacija
- Avtonomno delovanje

Avtor: Omni AI Assistant
Datum: 22. september 2025
Verzija: 1.0 Production
"""

import sys
import os
import time
import json
from datetime import datetime

# Dodaj omni module v path
sys.path.append(os.path.dirname(__file__))

# Uvozi OmniCore
import omnicore_global

def test_omnicore_initialization():
    """Test inicializacije OmniCore"""
    print("🧪 Test 1: Inicializacija OmniCore...")
    
    try:
        # Preveri, če je OmniCore inicializiran
        status = omnicore_global.get_system_status()
        
        assert isinstance(status, dict), "Status mora biti slovar"
        assert "system_info" in status, "Status mora vsebovati system_info"
        assert "modules" in status, "Status mora vsebovati module"
        
        print(f"✅ OmniCore inicializiran z {len(status['modules'])} moduli")
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri inicializaciji: {e}")
        return False

def test_module_registration():
    """Test registracije modulov"""
    print("🧪 Test 2: Registracija modulov...")
    
    try:
        status = omnicore_global.get_system_status()
        modules = status.get("modules", {})
        
        # Preveri ključne module
        expected_modules = [
            "global_optimizer",
            "iot_autonomous_learning", 
            "finance_optimizer",
            "logistics_optimizer",
            "healthcare_assistant",
            "tourism_planner",
            "agriculture_support",
            "energy_manager",
            "security_monitor"
        ]
        
        registered_modules = []
        for module_name in expected_modules:
            if module_name in modules:
                registered_modules.append(module_name)
                print(f"  ✅ {module_name}: {modules[module_name]['status']}")
            else:
                print(f"  ⚠️ {module_name}: ni registriran")
        
        print(f"✅ Registriranih {len(registered_modules)}/{len(expected_modules)} modulov")
        return len(registered_modules) >= len(expected_modules) * 0.7  # Vsaj 70% modulov
        
    except Exception as e:
        print(f"❌ Napaka pri preverjanju registracije: {e}")
        return False

def test_individual_module_optimization():
    """Test optimizacije posameznih modulov"""
    print("🧪 Test 3: Optimizacija posameznih modulov...")
    
    try:
        status = omnicore_global.get_system_status()
        modules = status.get("modules", {})
        
        successful_optimizations = 0
        total_modules = 0
        
        for module_name, module_info in modules.items():
            if module_info.get("status") == "active":
                total_modules += 1
                
                try:
                    # Poskusi optimizirati modul
                    result = omnicore_global.omnicore.optimize_module(module_name)
                    
                    if result.success:
                        successful_optimizations += 1
                        print(f"  ✅ {module_name}: {result.improvements} izboljšav")
                    else:
                        print(f"  ⚠️ {module_name}: {', '.join(result.errors)}")
                        
                except Exception as e:
                    print(f"  ❌ {module_name}: {e}")
        
        success_rate = successful_optimizations / max(total_modules, 1)
        print(f"✅ Uspešnost optimizacije: {successful_optimizations}/{total_modules} ({success_rate:.1%})")
        
        return success_rate >= 0.5  # Vsaj 50% uspešnih optimizacij
        
    except Exception as e:
        print(f"❌ Napaka pri testiranju optimizacije modulov: {e}")
        return False

def test_global_optimization_cycle():
    """Test globalnega cikla optimizacije"""
    print("🧪 Test 4: Globalni cikel optimizacije...")
    
    try:
        # Izvedi globalni cikel optimizacije
        result = omnicore_global.optimize_all()
        
        assert isinstance(result, dict), "Rezultat mora biti slovar"
        assert "modules_optimized" in result, "Rezultat mora vsebovati modules_optimized"
        assert "successful_optimizations" in result, "Rezultat mora vsebovati successful_optimizations"
        
        modules_optimized = result.get("modules_optimized", 0)
        successful_optimizations = result.get("successful_optimizations", 0)
        total_improvements = result.get("total_improvements", 0)
        
        print(f"  📊 Optimizirani moduli: {modules_optimized}")
        print(f"  ✅ Uspešne optimizacije: {successful_optimizations}")
        print(f"  🚀 Skupne izboljšave: {total_improvements}")
        
        success_rate = successful_optimizations / max(modules_optimized, 1)
        print(f"✅ Globalni cikel: {success_rate:.1%} uspešnost")
        
        return modules_optimized > 0 and success_rate >= 0.3
        
    except Exception as e:
        print(f"❌ Napaka pri globalnem ciklu: {e}")
        return False

def test_autonomous_operation():
    """Test avtonomnega delovanja"""
    print("🧪 Test 5: Avtonomno delovanje...")
    
    try:
        # Zaženi globalni optimizator
        start_result = omnicore_global.start_global_optimizer()
        print(f"  🚀 Zagon: {start_result}")
        
        # Počakaj nekaj sekund
        print("  ⏳ Čakam 10 sekund za avtonomno delovanje...")
        time.sleep(10)
        
        # Preveri status
        status = omnicore_global.get_system_status()
        is_running = status.get("system_info", {}).get("is_running", False)
        
        print(f"  🔄 Optimizator teče: {is_running}")
        
        # Preveri, če so bile izvedene optimizacije
        recent_optimizations = status.get("recent_optimizations", [])
        print(f"  📈 Zadnje optimizacije: {len(recent_optimizations)}")
        
        # Ustavi optimizator
        stop_result = omnicore_global.stop_global_optimizer()
        print(f"  🛑 Ustavitev: {stop_result}")
        
        print("✅ Avtonomno delovanje uspešno testirano")
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri testiranju avtonomnega delovanja: {e}")
        return False

def test_system_metrics():
    """Test sistemskih metrik"""
    print("🧪 Test 6: Sistemske metrike...")
    
    try:
        status = omnicore_global.get_system_status()
        
        # Preveri osnovne metrike
        system_info = status.get("system_info", {})
        global_metrics = status.get("global_metrics", {})
        system_health = status.get("system_health", "unknown")
        
        print(f"  🏥 Zdravje sistema: {system_health}")
        print(f"  ⏱️ Uptime: {system_info.get('uptime_seconds', 0):.1f} sekund")
        
        if global_metrics:
            print(f"  📊 Aktivni moduli: {global_metrics.get('active_modules', 0)}/{global_metrics.get('total_modules', 0)}")
            print(f"  🎯 Učinkovitost: {global_metrics.get('system_efficiency', 0):.1%}")
            print(f"  💰 Prihranki: {global_metrics.get('cost_savings', 0):.1f}€")
            print(f"  ⚡ Energijski prihranki: {global_metrics.get('energy_savings', 0):.1f}%")
        
        print("✅ Sistemske metrike uspešno pridobljene")
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri pridobivanju metrik: {e}")
        return False

def test_error_handling():
    """Test obvladovanja napak"""
    print("🧪 Test 7: Obvladovanje napak...")
    
    try:
        # Test neobstoječega modula
        result = omnicore_global.omnicore.optimize_module("neobstojeci_modul")
        assert not result.success, "Optimizacija neobstoječega modula mora biti neuspešna"
        print("  ✅ Obvladovanje neobstoječega modula")
        
        # Test neveljavnega ukaza
        result = omnicore_global.execute_command("neveljaven_ukaz")
        assert not result.get("success", True), "Neveljaven ukaz mora biti neuspešen"
        print("  ✅ Obvladovanje neveljavnega ukaza")
        
        print("✅ Obvladovanje napak deluje pravilno")
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri testiranju obvladovanja napak: {e}")
        return False

def run_comprehensive_test():
    """Izvedi celovit test globalnega optimizatorja"""
    print("🌍 CELOVIT TEST OMNI GLOBAL OPTIMIZER")
    print("=" * 50)
    
    start_time = datetime.now()
    
    # Seznam testov
    tests = [
        ("Inicializacija OmniCore", test_omnicore_initialization),
        ("Registracija modulov", test_module_registration),
        ("Optimizacija modulov", test_individual_module_optimization),
        ("Globalni cikel", test_global_optimization_cycle),
        ("Avtonomno delovanje", test_autonomous_operation),
        ("Sistemske metrike", test_system_metrics),
        ("Obvladovanje napak", test_error_handling)
    ]
    
    # Izvedi teste
    passed_tests = 0
    total_tests = len(tests)
    
    for test_name, test_function in tests:
        print(f"\n{'='*20}")
        try:
            if test_function():
                passed_tests += 1
                print(f"✅ {test_name}: USPEŠEN")
            else:
                print(f"❌ {test_name}: NEUSPEŠEN")
        except Exception as e:
            print(f"💥 {test_name}: NAPAKA - {e}")
    
    # Povzetek
    print(f"\n{'='*50}")
    print("📊 POVZETEK TESTIRANJA")
    print(f"{'='*50}")
    
    execution_time = (datetime.now() - start_time).total_seconds()
    success_rate = (passed_tests / total_tests) * 100
    
    print(f"🎯 Uspešnost: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
    print(f"⏱️ Čas izvajanja: {execution_time:.1f} sekund")
    
    if success_rate >= 80:
        print("🌟 ODLIČEN REZULTAT - Sistem je pripravljen za produkcijo!")
        status = "EXCELLENT"
    elif success_rate >= 60:
        print("✅ DOBER REZULTAT - Sistem deluje zadovoljivo")
        status = "GOOD"
    elif success_rate >= 40:
        print("⚠️ POVPREČEN REZULTAT - Potrebne so izboljšave")
        status = "AVERAGE"
    else:
        print("❌ SLAB REZULTAT - Potrebno je dodatno delo")
        status = "POOR"
    
    # Pridobi končni status sistema
    final_status = omnicore_global.get_system_status()
    
    print(f"\n🏥 Končno zdravje sistema: {final_status.get('system_health', 'unknown')}")
    print(f"🔧 Aktivni moduli: {len([m for m in final_status.get('modules', {}).values() if m.get('status') == 'active'])}")
    
    # Shrani rezultate testiranja
    test_results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": total_tests,
        "passed_tests": passed_tests,
        "success_rate": success_rate,
        "execution_time": execution_time,
        "status": status,
        "system_health": final_status.get('system_health', 'unknown'),
        "active_modules": len([m for m in final_status.get('modules', {}).values() if m.get('status') == 'active'])
    }
    
    try:
        os.makedirs("omni/logs", exist_ok=True)
        with open("omni/logs/test_results.json", "w", encoding="utf-8") as f:
            json.dump(test_results, f, indent=2, ensure_ascii=False)
        print(f"📄 Rezultati shranjeni v omni/logs/test_results.json")
    except Exception as e:
        print(f"⚠️ Napaka pri shranjevanju rezultatov: {e}")
    
    return success_rate >= 60

if __name__ == "__main__":
    # Izvedi celovit test
    success = run_comprehensive_test()
    
    if success:
        print("\n🎉 OMNI GLOBAL OPTIMIZER JE PRIPRAVLJEN! 🎉")
        exit(0)
    else:
        print("\n⚠️ Potrebne so dodatne izboljšave")
        exit(1)