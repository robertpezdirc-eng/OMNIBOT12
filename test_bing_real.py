#!/usr/bin/env python3
"""
Test Bing Search integracije z realnim API klicem
Demonstracija celotne funkcionalnosti z omni.run()
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

def test_full_integration():
    """Test celotne integracije z omni.run()"""
    print("🚀 Test celotne Bing Search integracije")
    print("=" * 60)
    
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
    
    # Test query kot je predlagan
    test_query = "Predlagaj najboljše rešitve za optimizacijo turistične agencije v Sloveniji."
    
    print(f"\n🔍 Test query: {test_query}")
    print("-" * 60)
    
    try:
        # Izvedi omni.run()
        start_time = time.time()
        result = omni.run(test_query)
        end_time = time.time()
        
        # Prikaži rezultate
        print(f"⏱️  Čas izvajanja: {end_time - start_time:.2f}s")
        print(f"📝 Vhod: {result['input']}")
        
        # AI odgovor
        ai_response = result.get('ai_response', 'AI ni na voljo')
        print(f"\n🤖 AI odgovor:")
        print(f"   {ai_response[:300]}{'...' if len(ai_response) > 300 else ''}")
        
        # Moduli
        print(f"\n📦 Moduli ({len(result['modules'])}):")
        for module_name, module_result in result['modules'].items():
            status = "✅" if "Error" not in str(module_result) else "❌"
            print(f"  {status} {module_name}: {str(module_result)[:100]}...")
        
        # Bing Search rezultati
        search_results = result.get('search_results', [])
        print(f"\n🔍 Bing Search rezultati ({len(search_results)}):")
        
        if search_results and not search_results[0].get("error"):
            for i, search_result in enumerate(search_results[:5], 1):
                print(f"\n  {i}. {search_result.get('name', 'Brez naslova')}")
                print(f"     URL: {search_result.get('url', 'N/A')}")
                print(f"     Opis: {search_result.get('snippet', 'N/A')[:150]}...")
        else:
            print(f"  ❌ Napaka ali ni rezultatov: {search_results}")
        
        # Sistem info
        print(f"\n📊 Sistem:")
        print(f"  💾 Spomin: {result['memory_length']} vnosov")
        print(f"  ⏱️  Čas: {result['execution_time']}s")
        
        # JSON struktura rezultata
        print(f"\n📋 JSON struktura rezultata:")
        print(f"  - input: {type(result.get('input', ''))}")
        print(f"  - ai_response: {type(result.get('ai_response', ''))}")
        print(f"  - modules: {type(result.get('modules', {}))}")
        print(f"  - search_results: {type(result.get('search_results', []))}")
        print(f"  - memory_length: {type(result.get('memory_length', 0))}")
        print(f"  - execution_time: {type(result.get('execution_time', 0))}")
        
        return result
        
    except Exception as e:
        print(f"❌ Napaka pri omni.run: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_direct_bing():
    """Test direktnega Bing API klica"""
    print("\n🔍 Test direktnega Bing API klica:")
    print("-" * 40)
    
    bing_search = BingSearchIntegration()
    
    # Status
    status = bing_search.get_status()
    print(f"📊 Status: {status}")
    
    if not status.get('api_configured'):
        print("⚠️ BING_API_KEY ni nastavljen")
        return
    
    # Test iskanja
    test_queries = [
        "turistične agencije Slovenije optimizacija",
        "najboljše turistične destinacije Slovenija",
        "digitalni marketing turizem"
    ]
    
    for query in test_queries:
        print(f"\n🔍 Iskanje: '{query}'")
        try:
            results = bing_search.search(query, 3)
            
            if results and not results[0].get("error"):
                print(f"✅ Najdenih {len(results)} rezultatov:")
                for i, result in enumerate(results, 1):
                    print(f"  {i}. {result.get('name', 'N/A')}")
                    print(f"     {result.get('snippet', 'N/A')[:100]}...")
            else:
                print(f"❌ Napaka: {results}")
                
        except Exception as e:
            print(f"❌ Napaka: {e}")

if __name__ == "__main__":
    print("🔍 BING SEARCH REALNI TEST")
    print("=" * 60)
    
    # Preveri API ključe
    bing_key = os.getenv("BING_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    print(f"🔑 BING_API_KEY: {'✅ Nastavljen' if bing_key else '❌ Ni nastavljen'}")
    print(f"🔑 OPENAI_API_KEY: {'✅ Nastavljen' if openai_key else '❌ Ni nastavljen'}")
    
    if not bing_key:
        print("\n⚠️ Za realni test nastavi BING_API_KEY:")
        print("set BING_API_KEY=your-bing-api-key")
        print("\n🧪 Izvajam test brez API ključa...")
        
        # Mock test
        print("\n📋 Mock rezultat strukture:")
        mock_result = {
            "input": "Predlagaj najboljše rešitve za optimizacijo turistične agencije v Sloveniji.",
            "ai_response": "AI odgovor bi bil tukaj (potreben OPENAI_API_KEY)",
            "modules": {
                "finance": "Finance modul pripravljen",
                "tourism": "Tourism modul pripravljen", 
                "devops": "DevOps modul pripravljen"
            },
            "search_results": [
                {"error": "BING_API_KEY ni konfiguriran"}
            ],
            "memory_length": 1,
            "execution_time": 0.5
        }
        
        print("✅ Struktura JSON rezultata:")
        for key, value in mock_result.items():
            print(f"  {key}: {type(value)} = {str(value)[:100]}...")
    else:
        # Realni test
        print("\n🚀 Izvajam realni test z API ključi...")
        test_direct_bing()
        result = test_full_integration()
        
        if result:
            print("\n✅ Test uspešno zaključen!")
            print("\n💡 Rezultat je pripravljen za:")
            print("  - UI prikaz")
            print("  - Glasovni vmesnik")
            print("  - Nadaljnjo analizo")
            print("  - JSON API odgovor")
    
    print("\n" + "=" * 60)
    print("🎯 Test zaključen!")
    
    if not bing_key or not openai_key:
        print("\n💡 Za popolno funkcionalnost nastavi:")
        print("1. set BING_API_KEY=your-bing-api-key")
        print("2. set OPENAI_API_KEY=your-openai-api-key")
        print("3. python test_bing_real.py")