#!/usr/bin/env python3
"""
Test skripta za demonstracijo hot-reload funkcionalnosti
Spremeni plugin datoteko in preveri, če se avtomatsko ponovno naloži
"""

import requests
import time
import json
from pathlib import Path

# API endpoint
API_BASE = "http://localhost:8099"

def test_api_call(query):
    """Testiraj API klic"""
    try:
        response = requests.post(f"{API_BASE}/query", 
                               json={"query": query},
                               timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Uspešen odgovor: {data.get('response', 'N/A')}")
            print(f"   Plugin: {data.get('plugin_used', 'N/A')}")
            print(f"   Metoda: {data.get('routing_method', 'N/A')}")
            return True
        else:
            print(f"❌ Napaka: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Napaka pri API klicu: {e}")
        return False

def modify_plugin():
    """Spremeni task plugin za testiranje hot-reload"""
    plugin_file = Path("plugins/task_plugin.py")
    
    if not plugin_file.exists():
        print(f"❌ Plugin datoteka ne obstaja: {plugin_file}")
        return False
    
    # Preberi trenutno vsebino
    content = plugin_file.read_text(encoding='utf-8')
    
    # Dodaj komentar z timestamp
    timestamp = int(time.time())
    new_comment = f"\n# Hot-reload test - {timestamp}\n"
    
    # Dodaj komentar na konec datoteke
    if f"# Hot-reload test - {timestamp}" not in content:
        content += new_comment
        plugin_file.write_text(content, encoding='utf-8')
        print(f"✅ Plugin spremenjen z timestamp: {timestamp}")
        return True
    else:
        print("⚠️ Plugin že vsebuje ta timestamp")
        return False

def test_hot_reload():
    """Glavni test hot-reload funkcionalnosti"""
    print("🧪 TESTIRANJE HOT-RELOAD FUNKCIONALNOSTI")
    print("="*50)
    
    # 1. Testiraj začetno stanje
    print("\n1️⃣ Testiram začetno stanje...")
    if not test_api_call("Dodaj naloga: testna naloga"):
        print("❌ Začetni test ni uspešen")
        return
    
    # 2. Spremeni plugin
    print("\n2️⃣ Spreminjam plugin datoteko...")
    if not modify_plugin():
        print("❌ Sprememba plugin-a ni uspešna")
        return
    
    # 3. Počakaj na hot-reload
    print("\n3️⃣ Čakam na hot-reload (5 sekund)...")
    time.sleep(5)
    
    # 4. Testiraj po spremembi
    print("\n4️⃣ Testiram po spremembi...")
    if test_api_call("Dodaj naloga: testna naloga po reload"):
        print("✅ Hot-reload test uspešen!")
    else:
        print("❌ Hot-reload test ni uspešen")
    
    # 5. Testiraj ročni reload API
    print("\n5️⃣ Testiram ročni reload API...")
    try:
        response = requests.post(f"{API_BASE}/reload-plugin/task", timeout=10)
        if response.status_code == 200:
            print("✅ Ročni reload uspešen")
            data = response.json()
            print(f"   Sporočilo: {data.get('message', 'N/A')}")
        else:
            print(f"❌ Ročni reload neuspešen: {response.status_code}")
    except Exception as e:
        print(f"❌ Napaka pri ročnem reload: {e}")
    
    # 6. Testiraj statistike
    print("\n6️⃣ Preverjam statistike...")
    try:
        response = requests.get(f"{API_BASE}/stats", timeout=10)
        if response.status_code == 200:
            stats = response.json()
            print("✅ Statistike:")
            print(f"   Skupaj zahtev: {stats.get('total_requests', 0)}")
            print(f"   Dostopni moduli: {len(stats.get('available_modules', []))}")
            print(f"   Status sistema: {stats.get('system_status', 'N/A')}")
        else:
            print(f"❌ Napaka pri pridobivanju statistik: {response.status_code}")
    except Exception as e:
        print(f"❌ Napaka pri statistikah: {e}")

def test_capabilities():
    """Testiraj capabilities endpoint"""
    print("\n7️⃣ Testiram capabilities endpoint...")
    try:
        response = requests.get(f"{API_BASE}/capabilities", timeout=10)
        if response.status_code == 200:
            capabilities = response.json()
            print("✅ Zmožnosti plugin-ov:")
            for plugin_name, info in capabilities.items():
                print(f"   📦 {plugin_name}: {info.get('description', 'N/A')}")
        else:
            print(f"❌ Napaka pri capabilities: {response.status_code}")
    except Exception as e:
        print(f"❌ Napaka pri capabilities: {e}")

if __name__ == "__main__":
    print("🚀 Začenjam test hot-reload funkcionalnosti...")
    print("⚠️  Prepričaj se, da je API strežnik zagnan na http://localhost:8099")
    
    # Počakaj malo, da se uporabnik pripravi
    time.sleep(2)
    
    try:
        # Glavni test
        test_hot_reload()
        
        # Dodatni testi
        test_capabilities()
        
        print("\n" + "="*50)
        print("🎉 TESTIRANJE KONČANO")
        print("="*50)
        
    except KeyboardInterrupt:
        print("\n\n⏹️ Test prekinjen s strani uporabnika")
    except Exception as e:
        print(f"\n❌ Nepričakovana napaka: {e}")