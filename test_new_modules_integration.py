"""
Test integracije novih modulov (Healthcare, Tourism, Agriculture) v OMNI sistem
"""

import sys
import os
import time
import threading
from datetime import datetime

# Dodaj omni direktorij v Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'omni'))

def test_healthcare_module():
    """Test zdravstvenega modula"""
    print("🏥 Testiranje Healthcare modula...")
    
    try:
        from modules.healthcare import healthcare_optimizer
        
        # Test osnovnih funkcij
        patient = healthcare_optimizer.add_patient("Test Pacient", 45, "Diabetes", "high")
        print(f"  ✅ Pacient dodan: {patient['name']}")
        
        # Test terminov
        future_date = (datetime.utcnow()).isoformat()
        appointment = healthcare_optimizer.schedule_appointment(1, future_date, "Dr. Test", "Kontrola")
        print(f"  ✅ Termin razporejen: {appointment['id']}")
        
        # Test statistik
        stats = healthcare_optimizer.get_health_statistics()
        print(f"  ✅ Statistike: {stats['patients']['total_patients']} pacientov")
        
        # Test optimizatorja
        result = healthcare_optimizer.auto_optimize()
        print(f"  ✅ Optimizer zagnan: {result}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Napaka v Healthcare modulu: {e}")
        return False

def test_tourism_module():
    """Test turističnega modula"""
    print("🌴 Testiranje Tourism modula...")
    
    try:
        from modules.tourism import tourism_optimizer
        
        # Test destinacij
        dest = tourism_optimizer.add_destination("Test Destinacija", 50, "Slovenija")
        print(f"  ✅ Destinacija dodana: {dest}")
        
        # Test cen
        tourism_optimizer.set_destination_pricing("Test Destinacija", 100)
        print("  ✅ Cena nastavljena")
        
        # Test rezervacij
        future_checkin = (datetime.utcnow()).isoformat()
        future_checkout = (datetime.utcnow()).isoformat()
        booking = tourism_optimizer.book_guest("Test Destinacija", "Test Gost", future_checkin, future_checkout, 2)
        print(f"  ✅ Rezervacija: {booking.get('id', 'Napaka')}")
        
        # Test statistik
        stats = tourism_optimizer.get_tourism_statistics()
        print(f"  ✅ Statistike: {stats['destinations']} destinacij")
        
        # Test optimizatorja
        result = tourism_optimizer.auto_optimize()
        print(f"  ✅ Optimizer zagnan: {result}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Napaka v Tourism modulu: {e}")
        return False

def test_agriculture_module():
    """Test kmetijskega modula"""
    print("🚜 Testiranje Agriculture modula...")
    
    try:
        from modules.agriculture import agriculture_optimizer
        
        # Test polj
        field = agriculture_optimizer.add_field("Test Polje", "Pšenica", 5.0)
        print(f"  ✅ Polje dodano: {field['crop']}")
        
        # Test živali
        animal = agriculture_optimizer.add_animal("Test Krave", 10)
        print(f"  ✅ Živali dodane: {animal['total_count']}")
        
        # Test sajenja
        planting_date = datetime.utcnow().isoformat()
        plant_result = agriculture_optimizer.plant_crop("Test Polje", planting_date)
        print(f"  ✅ Posajeno: {plant_result}")
        
        # Test hranjenja
        feed_result = agriculture_optimizer.feed_animals("Test Krave", "seno", 50)
        print(f"  ✅ Nahranjen: {feed_result}")
        
        # Test statistik
        stats = agriculture_optimizer.get_agriculture_statistics()
        print(f"  ✅ Statistike: {stats['production']['fields']} polj")
        
        # Test optimizatorja
        result = agriculture_optimizer.auto_optimize()
        print(f"  ✅ Optimizer zagnan: {result}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Napaka v Agriculture modulu: {e}")
        return False

def test_omnicore_integration():
    """Test integracije z OmniCore sistemom"""
    print("🌍 Testiranje OmniCore integracije...")
    
    try:
        import omnicore_global
        
        # Pridobi status sistema
        status = omnicore_global.get_system_status()
        print(f"  ✅ Sistem status: {status['system_health']}")
        
        # Preveri registrirane module
        modules = status.get('modules', {})
        new_modules = ['healthcare_optimizer', 'tourism_optimizer', 'agriculture_optimizer']
        
        registered_count = 0
        for module_name in new_modules:
            if module_name in modules:
                module_status = modules[module_name]['status']
                print(f"  ✅ {module_name}: {module_status}")
                registered_count += 1
            else:
                print(f"  ⚠️ {module_name}: ni registriran")
        
        print(f"  📊 Registriranih {registered_count}/{len(new_modules)} novih modulov")
        
        # Test globalnega optimizatorja
        if registered_count > 0:
            optimization_result = omnicore_global.optimize_all()
            successful = optimization_result.get('successful_optimizations', 0)
            print(f"  ✅ Globalna optimizacija: {successful} uspešnih")
        
        return registered_count >= len(new_modules) * 0.7  # Vsaj 70% modulov
        
    except Exception as e:
        print(f"  ❌ Napaka v OmniCore integraciji: {e}")
        return False

def test_module_status():
    """Test status funkcij modulov"""
    print("📊 Testiranje module status funkcij...")
    
    try:
        from modules.healthcare import healthcare_optimizer
        from modules.tourism import tourism_optimizer
        from modules.agriculture import agriculture_optimizer
        
        # Test status funkcij
        healthcare_status = healthcare_optimizer.get_module_status()
        tourism_status = tourism_optimizer.get_module_status()
        agriculture_status = agriculture_optimizer.get_module_status()
        
        print(f"  ✅ Healthcare status: {healthcare_status['name']} - {healthcare_status['status']}")
        print(f"  ✅ Tourism status: {tourism_status['name']} - {tourism_status['status']}")
        print(f"  ✅ Agriculture status: {agriculture_status['name']} - {agriculture_status['status']}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Napaka pri preverjanju status funkcij: {e}")
        return False

def run_all_tests():
    """Zaženi vse teste"""
    print("🧪 ZAČETEK TESTIRANJA NOVIH MODULOV")
    print("=" * 50)
    
    tests = [
        ("Healthcare Module", test_healthcare_module),
        ("Tourism Module", test_tourism_module),
        ("Agriculture Module", test_agriculture_module),
        ("Module Status Functions", test_module_status),
        ("OmniCore Integration", test_omnicore_integration)
    ]
    
    results = []
    
    for test_name, test_function in tests:
        print(f"\n🔍 {test_name}")
        print("-" * 30)
        
        try:
            result = test_function()
            results.append((test_name, result))
            
            if result:
                print(f"✅ {test_name}: USPEŠEN")
            else:
                print(f"❌ {test_name}: NEUSPEŠEN")
                
        except Exception as e:
            print(f"💥 {test_name}: KRITIČNA NAPAKA - {e}")
            results.append((test_name, False))
    
    # Povzetek rezultatov
    print("\n" + "=" * 50)
    print("📋 POVZETEK TESTIRANJA")
    print("=" * 50)
    
    successful_tests = sum(1 for _, result in results if result)
    total_tests = len(results)
    
    for test_name, result in results:
        status = "✅ USPEŠEN" if result else "❌ NEUSPEŠEN"
        print(f"{status:12} | {test_name}")
    
    print("-" * 50)
    print(f"📊 SKUPNI REZULTAT: {successful_tests}/{total_tests} testov uspešnih")
    
    if successful_tests == total_tests:
        print("🎉 VSI TESTI USPEŠNI! Novi moduli so pripravljeni za uporabo.")
    elif successful_tests >= total_tests * 0.8:
        print("✅ VEČINA TESTOV USPEŠNIH. Sistem je v veliki meri funkcionalen.")
    else:
        print("⚠️ POTREBNE POPRAVKE. Nekateri moduli potrebujejo dodatno delo.")
    
    return successful_tests, total_tests

if __name__ == "__main__":
    print("🌍 OMNI - Test integracije novih modulov")
    print("Healthcare, Tourism, Agriculture")
    print("=" * 50)
    
    successful, total = run_all_tests()
    
    print(f"\n🏁 TESTIRANJE KONČANO: {successful}/{total}")
    
    if successful == total:
        print("🚀 Sistem pripravljen za produkcijo!")
    else:
        print("🔧 Potrebne dodatne optimizacije.")