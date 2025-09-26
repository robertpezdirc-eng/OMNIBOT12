#!/usr/bin/env python3
"""
Web Search Integration za Omni AI Platform
Podpira Google Custom Search API in Bing Search API
"""

import os
import json
import requests
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class WebSearchIntegration:
    """Integracija za spletno iskanje preko Google in Bing API-jev"""
    
    def __init__(self):
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.google_cx = os.getenv('GOOGLE_SEARCH_ENGINE_ID')
        self.bing_api_key = os.getenv('BING_SEARCH_API_KEY')
        
        self.enabled_services = []
        self._check_api_availability()
    
    def _check_api_availability(self):
        """Preveri dostopnost API ključev"""
        if self.google_api_key and self.google_cx:
            self.enabled_services.append('google')
            logger.info("🔍 Google Search API na voljo")
        else:
            logger.warning("⚠️ Google Search API ni konfiguriran")
        
        if self.bing_api_key:
            self.enabled_services.append('bing')
            logger.info("🔍 Bing Search API na voljo")
        else:
            logger.warning("⚠️ Bing Search API ni konfiguriran")
    
    def search_google(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """Iskanje preko Google Custom Search API"""
        if 'google' not in self.enabled_services:
            return []
        
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': self.google_api_key,
                'cx': self.google_cx,
                'q': query,
                'num': min(num_results, 10)
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            for item in data.get('items', []):
                results.append({
                    'title': item.get('title', ''),
                    'link': item.get('link', ''),
                    'snippet': item.get('snippet', ''),
                    'source': 'google'
                })
            
            logger.info(f"🔍 Google: {len(results)} rezultatov za '{query}'")
            return results
            
        except Exception as e:
            logger.error(f"❌ Google Search napaka: {e}")
            return []
    
    def search_bing(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """Iskanje preko Bing Search API"""
        if 'bing' not in self.enabled_services:
            return []
        
        try:
            url = "https://api.bing.microsoft.com/v7.0/search"
            headers = {
                'Ocp-Apim-Subscription-Key': self.bing_api_key
            }
            params = {
                'q': query,
                'count': min(num_results, 50),
                'responseFilter': 'Webpages'
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            for item in data.get('webPages', {}).get('value', []):
                results.append({
                    'title': item.get('name', ''),
                    'link': item.get('url', ''),
                    'snippet': item.get('snippet', ''),
                    'source': 'bing'
                })
            
            logger.info(f"🔍 Bing: {len(results)} rezultatov za '{query}'")
            return results
            
        except Exception as e:
            logger.error(f"❌ Bing Search napaka: {e}")
            return []
    
    def search_web(self, query: str, num_results: int = 5, prefer_service: str = 'auto') -> Dict[str, Any]:
        """
        Glavna funkcija za spletno iskanje
        
        Args:
            query: Iskalni niz
            num_results: Število rezultatov
            prefer_service: 'google', 'bing' ali 'auto'
        """
        if not self.enabled_services:
            return {
                'query': query,
                'results': [],
                'sources': [],
                'error': 'Ni konfiguriranih API ključev za spletno iskanje'
            }
        
        all_results = []
        used_sources = []
        
        # Določi vrstni red iskanja
        if prefer_service == 'google' and 'google' in self.enabled_services:
            search_order = ['google', 'bing']
        elif prefer_service == 'bing' and 'bing' in self.enabled_services:
            search_order = ['bing', 'google']
        else:
            search_order = self.enabled_services
        
        # Izvedi iskanje
        for service in search_order:
            if service == 'google':
                results = self.search_google(query, num_results)
                if results:
                    all_results.extend(results)
                    used_sources.append('google')
            elif service == 'bing':
                results = self.search_bing(query, num_results)
                if results:
                    all_results.extend(results)
                    used_sources.append('bing')
            
            # Če imamo dovolj rezultatov, prenehaj
            if len(all_results) >= num_results:
                break
        
        # Omeji rezultate
        final_results = all_results[:num_results]
        
        return {
            'query': query,
            'results': final_results,
            'sources': used_sources,
            'total_found': len(final_results),
            'timestamp': self._get_timestamp()
        }
    
    def search_and_summarize(self, query: str, num_results: int = 3) -> Dict[str, Any]:
        """Iskanje z osnovnim povzetkom rezultatov"""
        search_results = self.search_web(query, num_results)
        
        if not search_results['results']:
            return search_results
        
        # Ustvari povzetek
        summary_points = []
        for result in search_results['results']:
            if result['snippet']:
                summary_points.append(f"• {result['snippet'][:100]}...")
        
        search_results['summary'] = summary_points
        return search_results
    
    def _get_timestamp(self) -> str:
        """Vrni trenutni timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def get_status(self) -> Dict[str, Any]:
        """Vrni status integracije"""
        return {
            'enabled_services': self.enabled_services,
            'google_configured': bool(self.google_api_key and self.google_cx),
            'bing_configured': bool(self.bing_api_key),
            'total_services': len(self.enabled_services)
        }

# Funkcije za enostavno uporabo
def search_web(query: str, num_results: int = 5) -> Dict[str, Any]:
    """Enostavna funkcija za spletno iskanje"""
    integration = WebSearchIntegration()
    return integration.search_web(query, num_results)

def quick_search(query: str) -> List[str]:
    """Hitro iskanje - vrne samo naslove"""
    integration = WebSearchIntegration()
    results = integration.search_web(query, 3)
    return [result['title'] for result in results.get('results', [])]

if __name__ == "__main__":
    # Test funkcionalnosti
    integration = WebSearchIntegration()
    print("🔍 Web Search Integration Test")
    print(f"Status: {integration.get_status()}")
    
    if integration.enabled_services:
        test_query = "Python programiranje"
        results = integration.search_and_summarize(test_query)
        print(f"\nRezultati za '{test_query}':")
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        print("⚠️ Ni konfiguriranih API ključev za testiranje")