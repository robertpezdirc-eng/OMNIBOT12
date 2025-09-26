#!/usr/bin/env python3
"""
🧪 Test Thea Advanced Queue System
Enostavni test brez konfliktov z obstoječimi datotekami
"""

import sys
import os
import time

# Dodaj trenutni direktorij v Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from thea_advanced_queue_system import TheaAdvancedQueueSystem, Priority
    from thea_command_interface import TheaCommandInterface
except ImportError as e:
    print(f"❌ Napaka pri uvozu: {e}")
    sys.exit(1)

def test_basic_functionality():
    """Test osnovnih funkcionalnosti"""
    print("🧪 TESTIRANJE THEA ADVANCED QUEUE SYSTEM")
    print("=" * 60)
    
    # Test 1: Inicializacija
    print("\n1️⃣ Test inicializacije...")
    try:
        thea = TheaAdvancedQueueSystem("test_thea_queue.db")
        print("✅ Sistem uspešno inicializiran")
    except Exception as e:
        print(f"❌ Napaka pri inicializaciji: {e}")
        return False
    
    # Test 2: Dodajanje promptov
    print("\n2️⃣ Test dodajanja promptov...")
    try:
        prompt1 = thea.add_prompt("Test prompt 1 - analiza podatkov", Priority.HIGH)
        prompt2 = thea.add_prompt("Test prompt 2 - finančno poročilo", Priority.MEDIUM)
        prompt3 = thea.add_prompt("Test prompt 3 - IoT monitoring", Priority.LOW)
        
        print(f"✅ Dodanih {len(thea.queue)} promptov")
        print(f"   - Prompt 1: {prompt1[:8]}...")
        print(f"   - Prompt 2: {prompt2[:8]}...")
        print(f"   - Prompt 3: {prompt3[:8]}...")
    except Exception as e:
        print(f"❌ Napaka pri dodajanju promptov: {e}")
        return False
    
    # Test 3: Status queue
    print("\n3️⃣ Test status queue...")
    try:
        status = thea.get_queue_status()
        print(f"✅ Queue status:")
        print(f"   - Skupaj promptov: {status['total_prompts']}")
        print(f"   - Pending: {status['status_breakdown'].get('pending', 0)}")
        print(f"   - Cache velikost: {status['cache_size']}")
    except Exception as e:
        print(f"❌ Napaka pri pridobivanju statusa: {e}")
        return False
    
    # Test 4: Sekvenčna obdelava
    print("\n4️⃣ Test sekvenčne obdelave...")
    try:
        print("🚀 Izvajam 'OBDELATI NAJ ZDALEČE'...")
        result = thea.process_queue_sequential()
        
        if 'error' in result:
            print(f"❌ {result['error']}")
        else:
            print(f"✅ {result['message']}")
            print(f"   - Obdelanih: {result['processed']} promptov")
    except Exception as e:
        print(f"❌ Napaka pri obdelavi: {e}")
        return False
    
    # Test 5: Merge rezultatov
    print("\n5️⃣ Test merge rezultatov...")
    try:
        print("🎯 Izvajam 'ZDruži vse skupaj'...")
        merged = thea.merge_all_results()
        
        if 'error' in merged:
            print(f"❌ {merged['error']}")
        else:
            print(f"✅ Merged {merged['merged_count']} rezultatov")
            print(f"   - Skupni čas: {merged['total_processing_time']:.2f}s")
            print(f"   - Viri: {', '.join(merged['resources_used'])}")
    except Exception as e:
        print(f"❌ Napaka pri merge: {e}")
        return False
    
    # Test 6: Statistike
    print("\n6️⃣ Test statistik...")
    try:
        stats = thea.get_stats()
        print("✅ Statistike:")
        print(f"   - Skupaj promptov: {stats['total_prompts']}")
        print(f"   - Obdelanih: {stats['processed_prompts']}")
        print(f"   - Uspešnost: {stats['success_rate']:.1%}")
        print(f"   - Cache učinkovitost: {stats['cache_efficiency']:.1%}")
    except Exception as e:
        print(f"❌ Napaka pri statistikah: {e}")
        return False
    
    print("\n🎉 VSI TESTI USPEŠNO KONČANI!")
    return True

def test_command_interface():
    """Test command interface"""
    print("\n\n🎮 TESTIRANJE COMMAND INTERFACE")
    print("=" * 50)
    
    try:
        interface = TheaCommandInterface()
        print("✅ Command interface uspešno inicializiran")
        
        # Test osnovnih ukazov
        print("\n📝 Test dodajanja prompta...")
        interface.add_prompt_with_text("Test prompt preko interface")
        
        print("\n📊 Test status prikaza...")
        interface.show_status()
        
        print("\n📈 Test statistik...")
        interface.show_stats()
        
        print("\n✅ Command interface testi uspešni")
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri testiranju interface: {e}")
        return False

def demo_workflow():
    """Demonstracija celotnega workflow"""
    print("\n\n🎯 DEMO WORKFLOW - THEA AUTO QUEUE + MERGE ON DEMAND")
    print("=" * 70)
    
    try:
        # Inicializacija
        thea = TheaAdvancedQueueSystem("demo_thea_queue.db")
        
        # Simulacija dodajanja promptov
        print("\n1️⃣ Dodajam prompte v queue...")
        prompts = [
            ("Analiziraj prodajne podatke za Q4 2024", Priority.HIGH),
            ("Pripravi finančno poročilo za management", Priority.HIGH),
            ("Preveri IoT senzorje v skladišču A", Priority.MEDIUM),
            ("Optimiziraj turistične pakete za poletje", Priority.MEDIUM),
            ("Generiraj marketing kampanjo za novo storitev", Priority.LOW)
        ]
        
        for content, priority in prompts:
            prompt_id = thea.add_prompt(content, priority)
            print(f"   ✅ {content[:40]}... (ID: {prompt_id[:8]})")
        
        print(f"\n📊 Queue status: {len(thea.queue)} promptov dodanih")
        
        # Sekvenčna obdelava
        print("\n2️⃣ Izvajam ukaz: 'OBDELATI NAJ ZDALEČE'")
        print("⏳ Obdelujem prompte po vrsti...")
        
        result = thea.process_queue_sequential()
        print(f"✅ {result['message']}")
        
        # Merge rezultatov
        print("\n3️⃣ Izvajam ukaz: 'ZDruži vse skupaj'")
        merged = thea.merge_all_results()
        
        if 'error' not in merged:
            print(f"✅ Uspešno združenih {merged['merged_count']} rezultatov")
            
            # Shrani demo rezultat
            demo_file = f"thea_demo_results_{int(time.time())}.txt"
            with open(demo_file, 'w', encoding='utf-8') as f:
                f.write(merged['merged_result'])
            
            print(f"📄 Demo rezultati shranjeni v: {demo_file}")
        
        # Končne statistike
        print("\n4️⃣ Končne statistike:")
        stats = thea.get_stats()
        print(f"   📝 Skupaj promptov: {stats['total_prompts']}")
        print(f"   ✅ Obdelanih: {stats['processed_prompts']}")
        print(f"   🎯 Merge operacij: {stats['merge_operations']}")
        print(f"   📊 Uspešnost: {stats['success_rate']:.1%}")
        
        print("\n🎉 DEMO WORKFLOW USPEŠNO KONČAN!")
        return True
        
    except Exception as e:
        print(f"❌ Napaka v demo workflow: {e}")
        return False

def main():
    """Glavna funkcija"""
    print("🤖 THEA ADVANCED QUEUE SYSTEM - COMPREHENSIVE TEST")
    print("=" * 80)
    
    # Zaženi vse teste
    tests_passed = 0
    total_tests = 3
    
    if test_basic_functionality():
        tests_passed += 1
    
    if test_command_interface():
        tests_passed += 1
    
    if demo_workflow():
        tests_passed += 1
    
    # Končni rezultat
    print(f"\n\n🏁 KONČNI REZULTAT: {tests_passed}/{total_tests} testov uspešnih")
    
    if tests_passed == total_tests:
        print("🎉 VSI TESTI USPEŠNI - THEA SISTEM PRIPRAVLJEN ZA UPORABO!")
        print("\n💡 Za interaktivno uporabo zaženi:")
        print("   python thea_command_interface.py")
    else:
        print("❌ Nekateri testi neuspešni - preveri napake zgoraj")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())