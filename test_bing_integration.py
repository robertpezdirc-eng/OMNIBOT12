#!/usr/bin/env python3
"""
Test Bing Search integracije z OmniCore
Demonstracija realnega iskanja po internetu
"""

import os
import sys
import time

# Dodaj trenutni direktorij v pot
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from omni.core.engine import OmniCore
from omni.modules.finance import FinanceModule
from omni.modules.tourism import TourismModule
from omni.modules.devops import DevOpsModule
from omni.integrations.search_bing import BingSearchIntegration

def test_bing_integration():
    """Test Bing Search integracije"""
    print("🔍 Test Bing Search integracije")
    print("=" * 50)
    
    # Inicializacija OmniCore
    omni = OmniCore()
    
    # Registracija modulov
    omni.register_module("finance", FinanceModule())
    omni.register_module("tourism", TourismModule())
    omni.register_module("devops", DevOpsModule())
    
    # Registracija Bing Search integracije
    bing_search = BingSearchIntegration()
    omni.register_integration("search_bing", bing_search)
    
    print(f"✅ Registrirani moduli: {list(omni.modules.keys())}")
    print(f"✅ Registrirane integracije: {list(omni.integrations.keys())}")
    
    # Test Bing Search status
    print("\n📊 Bing Search Status:")
    bing_status = bing_search.get_status()
    for key, value in bing_status.items():
        print(f"  {key}: {value}")
    
    # Test direktnega Bing iskanja
    print("\n🔍 Test direktnega Bing iskanja:")
    test_query = "najboljše turistične destinacije v Sloveniji"
    
    try:
        search_results = bing_search.search(test_query, 3)
        
        if search_results and not search_results[0].get("error"):
            print(f"✅ Najdenih {len(search_results)} rezultatov:")
            for i, result in enumerate(search_results, 1):
                print(f"\n{i}. {result.get('name', 'Brez naslova')}")
                print(f"   URL: {result.get('url', 'N/A')}")
                print(f"   Opis: {result.get('snippet', 'N/A')[:150]}...")
        else:
            print(f"❌ Napaka pri iskanju: {search_results}")
            
    except Exception as e:
        print(f"❌ Napaka: {e}")
    
    # Test omni.run z Bing integracijo
    print("\n🚀 Test omni.run z Bing integracijo:")
    test_prompt = "Predlagaj najboljše rešitve za optimizacijo turistične agencije v Sloveniji."
    
    try:
        start_time = time.time()
        result = omni.run(test_prompt)
        end_time = time.time()
        
        print(f"⏱️  Čas izvajanja: {end_time - start_time:.2f}s")
        print(f"📝 Vhod: {result['input']}")
        print(f"🤖 AI odgovor: {result.get('ai_response', 'N/A')[:200]}...")
        
        print(f"\n📦 Moduli ({len(result['modules'])}):")
        for module_name, module_result in result['modules'].items():
            status = "✅" if "Error" not in str(module_result) else "❌"
            print(f"  {status} {module_name}: {str(module_result)[:100]}...")
        
        print(f"\n🔍 Bing Search rezultati ({len(result.get('search_results', []))}):")
        search_results = result.get('search_results', [])
        
        if search_results and not search_results[0].get("error"):
            for i, result_item in enumerate(search_results[:3], 1):
                print(f"  {i}. {result_item.get('name', 'Brez naslova')}")
                print(f"     {result_item.get('snippet', 'N/A')[:100]}...")
        else:
            print(f"  ❌ {search_results}")
        
        print(f"\n📊 Sistem:")
        print(f"  💾 Spomin: {result['memory_length']} vnosov")
        print(f"  ⏱️  Čas: {result['execution_time']}s")
        
    except Exception as e:
        print(f"❌ Napaka pri omni.run: {e}")
        import traceback
        traceback.print_exc()
    
    # Test sistema status
    print("\n📊 Sistem Status:")
    try:
        status = omni.get_status()
        print(f"  🧠 Jedro aktivno: {status['core_active']}")
        print(f"  📦 Moduli: {status['modules_count']}")
        print(f"  🔗 Integracije: {status['integrations_count']}")
        print(f"  💾 Spomin: {status['memory_count']} vnosov")
    except Exception as e:
        print(f"❌ Napaka pri statusu: {e}")

def test_mock_bing():
    """Test z mock Bing podatki (brez API ključa)"""
    print("\n🧪 Mock Bing Test (brez API ključa):")
    
    # Simuliraj Bing rezultate
    mock_results = [
        {
            "name": "Slovenija.info - Uradni turistični portal",
            "url": "https://www.slovenia.info/",
            "snippet": "Odkrijte Slovenijo - zeleno, aktivno, zdravo destinacijo. Naravne lepote, kultura, gastronomija in wellness."
        },
        {
            "name": "Visit Ljubljana - Uradni turistični portal Ljubljane",
            "url": "https://www.visitljubljana.com/",
            "snippet": "Ljubljana je zelena prestolnica Slovenije z bogato kulturno dediščino in živahnim mestnim utripom."
        },
        {
            "name": "Bled - Alpska bisera Slovenije",
            "url": "https://www.bled.si/",
            "snippet": "Bled je ena najbolj priljubljenih turističnih destinacij v Sloveniji z jezerom in gradom."
        }
    ]
    
    print(f"✅ Mock rezultati ({len(mock_results)}):")
    for i, result in enumerate(mock_results, 1):
        print(f"{i}. {result['name']}")
        print(f"   {result['snippet']}")
        print(f"   {result['url']}")
        print()

if __name__ == "__main__":
    print("🔍 BING SEARCH INTEGRACIJA TEST")
    print("=" * 60)
    
    # Preveri API ključ
    api_key = os.getenv("BING_API_KEY")
    if api_key:
        print(f"✅ BING_API_KEY je nastavljen (dolžina: {len(api_key)})")
        test_bing_integration()
    else:
        print("⚠️ BING_API_KEY ni nastavljen")
        print("Za realno testiranje nastavi: set BING_API_KEY=your-api-key")
        print("\nIzvajam mock test...")
        test_mock_bing()
    
    print("\n" + "=" * 60)
    print("🎯 Test zaključen!")
    print("\n💡 Navodila za aktivacijo:")
    print("1. Nastavi BING_API_KEY: set BING_API_KEY=your-api-key")
    print("2. Nastavi OPENAI_API_KEY: set OPENAI_API_KEY=your-api-key")
    print("3. Zaženi: python test_bing_integration.py")