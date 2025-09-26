#!/usr/bin/env python3
"""
Test script za Web Search integracijo
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'omni'))

from core.engine import OmniCore
from integrations.web_search import WebSearchIntegration
import modules.finance as finance
import modules.tourism as tourism  
import modules.devops as devops

class MockWebSearchIntegration(WebSearchIntegration):
    """Mock verzija za demonstracijo brez API ključev"""
    
    def __init__(self):
        # Ne kličemo parent __init__, da se izognemo API preverjanju
        self.enabled_services = ['mock']
    
    def search_web(self, query: str, num_results: int = 5, prefer_service: str = 'auto'):
        """Mock spletno iskanje"""
        mock_results = [
            {
                'title': f'Rezultat 1 za "{query}"',
                'link': 'https://example1.com',
                'snippet': f'Mock opis za iskanje "{query}" - pomembne informacije o temi.',
                'source': 'mock'
            },
            {
                'title': f'Rezultat 2 za "{query}"',
                'link': 'https://example2.com', 
                'snippet': f'Dodatne informacije o "{query}" z relevantnimi podatki.',
                'source': 'mock'
            },
            {
                'title': f'Rezultat 3 za "{query}"',
                'link': 'https://example3.com',
                'snippet': f'Tretji vir informacij o "{query}" z uporabnimi nasveti.',
                'source': 'mock'
            }
        ]
        
        return {
            'query': query,
            'results': mock_results[:num_results],
            'sources': ['mock'],
            'total_found': min(len(mock_results), num_results),
            'timestamp': self._get_timestamp()
        }
    
    def get_status(self):
        return {
            'enabled_services': ['mock'],
            'google_configured': False,
            'bing_configured': False,
            'total_services': 1
        }

def test_web_integration():
    """Test spletne integracije z mock podatki"""
    print("🌐 Testiranje Web Search integracije...")
    
    # Inicializacija OmniCore
    omni = OmniCore(debug=True)
    
    # Registracija modulov
    print("\n📦 Registracija modulov...")
    omni.register_module("finance", finance)
    omni.register_module("tourism", tourism)
    omni.register_module("devops", devops)
    
    # Registracija mock web search integracije
    print("\n🔍 Registracija Web Search integracije...")
    web_search = MockWebSearchIntegration()
    omni.register_integration("web_search", web_search)
    
    print(f"✅ Status web search: {web_search.get_status()}")
    
    # Test spletnega iskanja
    print("\n🔍 Test spletnega iskanja...")
    search_results = web_search.search_web("Python programiranje", 3)
    print("Rezultati iskanja:")
    for i, result in enumerate(search_results['results'], 1):
        print(f"{i}. {result['title']}")
        print(f"   {result['snippet']}")
        print(f"   {result['link']}")
        print()
    
    # Test z aktualnim vprašanjem (sproži spletno iskanje)
    print("\n🧠 Test z aktualnim vprašanjem...")
    test_prompt = "Kakšne so aktualne cene nepremičnin v Ljubljani?"
    
    result = omni.run(test_prompt)
    
    print("\n📊 REZULTAT Z SPLETNIM KONTEKSTOM:")
    print("=" * 60)
    print(f"📝 Input: {result['input']}")
    print(f"🤖 AI Response: {result['ai_response']}")
    print(f"📦 Moduli: {result['modules']}")
    print(f"🧠 Spomin: {result['memory_length']} vnosov")
    print(f"⏱️ Čas izvajanja: {result['execution_time']}s")
    print("=" * 60)
    
    # Test brez spletnega iskanja
    print("\n🧠 Test brez spletnega iskanja...")
    normal_prompt = "Kako optimizirati finance podjetja?"
    
    result2 = omni.run(normal_prompt)
    print(f"📝 Input: {result2['input']}")
    print(f"🤖 AI Response: {result2['ai_response']}")
    
    # Status sistema
    print("\n📈 Status sistema:")
    status = omni.get_status()
    print(f"Moduli: {status['modules']}")
    print(f"Spomin: {status['memory_count']} vnosov")
    print(f"Integracije: {status['integrations']}")
    
    print("\n✅ Web integration test končan uspešno!")
    print("\n💡 Za realno spletno iskanje nastavi GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_ID ali BING_SEARCH_API_KEY")

if __name__ == "__main__":
    test_web_integration()