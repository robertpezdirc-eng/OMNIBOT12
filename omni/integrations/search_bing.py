#!/usr/bin/env python3
"""
Bing Search API integracija za Omni AI Platform
Hitra in enostavna integracija z Microsoft Azure Bing Search
"""

import os
import requests
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Konfiguracija
API_KEY = os.getenv("BING_API_KEY")
ENDPOINT = "https://api.bing.microsoft.com/v7.0/search"

def search(query: str, count: int = 5) -> List[Dict[str, Any]]:
    """
    Glavna funkcija za Bing iskanje
    
    Args:
        query: Iskalni niz
        count: Število rezultatov (max 50)
    
    Returns:
        Seznam rezultatov ali napak
    """
    if not API_KEY:
        logger.warning("⚠️ BING_API_KEY ni nastavljen")
        return [{"error": "BING_API_KEY ni konfiguriran"}]
    
    headers = {
        "Ocp-Apim-Subscription-Key": API_KEY
    }
    
    params = {
        "q": query,
        "count": min(count, 50),
        "textDecorations": True,
        "textFormat": "HTML"
    }
    
    try:
        logger.info(f"🔍 Bing iskanje: '{query}' ({count} rezultatov)")
        
        response = requests.get(ENDPOINT, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        results = []
        
        # Obdelaj web rezultate
        for item in data.get("webPages", {}).get("value", []):
            results.append({
                "name": item.get("name", ""),
                "url": item.get("url", ""),
                "snippet": item.get("snippet", ""),
                "displayUrl": item.get("displayUrl", ""),
                "dateLastCrawled": item.get("dateLastCrawled", "")
            })
        
        logger.info(f"✅ Bing: {len(results)} rezultatov najdenih")
        return results
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Bing API napaka: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return [{"error": error_msg}]
    
    except Exception as e:
        error_msg = f"Splošna napaka: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return [{"error": error_msg}]

def search_with_filters(query: str, count: int = 5, market: str = "sl-SI") -> Dict[str, Any]:
    """
    Napredno Bing iskanje z dodatnimi filtri
    
    Args:
        query: Iskalni niz
        count: Število rezultatov
        market: Trg/jezik (sl-SI za Slovenijo)
    
    Returns:
        Strukturiran rezultat z metapodatki
    """
    if not API_KEY:
        return {
            "query": query,
            "results": [],
            "error": "BING_API_KEY ni konfiguriran",
            "total_found": 0
        }
    
    headers = {
        "Ocp-Apim-Subscription-Key": API_KEY
    }
    
    params = {
        "q": query,
        "count": min(count, 50),
        "mkt": market,
        "textDecorations": True,
        "textFormat": "HTML",
        "responseFilter": "Webpages"
    }
    
    try:
        response = requests.get(ENDPOINT, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        results = []
        
        web_pages = data.get("webPages", {})
        
        for item in web_pages.get("value", []):
            results.append({
                "name": item.get("name", ""),
                "url": item.get("url", ""),
                "snippet": item.get("snippet", ""),
                "displayUrl": item.get("displayUrl", ""),
                "dateLastCrawled": item.get("dateLastCrawled", "")
            })
        
        return {
            "query": query,
            "results": results,
            "total_found": len(results),
            "total_estimated": web_pages.get("totalEstimatedMatches", 0),
            "market": market,
            "timestamp": _get_timestamp()
        }
        
    except Exception as e:
        return {
            "query": query,
            "results": [],
            "error": str(e),
            "total_found": 0
        }

def quick_search(query: str) -> List[str]:
    """
    Hitro iskanje - vrne samo naslove
    
    Args:
        query: Iskalni niz
    
    Returns:
        Seznam naslovov
    """
    results = search(query, 3)
    
    if results and not results[0].get("error"):
        return [result.get("name", "") for result in results if result.get("name")]
    
    return []

def search_slovenian(query: str, count: int = 5) -> List[Dict[str, Any]]:
    """
    Iskanje specifično za slovenski trg
    
    Args:
        query: Iskalni niz
        count: Število rezultatov
    
    Returns:
        Seznam rezultatov
    """
    return search_with_filters(query, count, "sl-SI")["results"]

def _get_timestamp() -> str:
    """Vrni trenutni timestamp"""
    from datetime import datetime
    return datetime.now().isoformat()

def get_status() -> Dict[str, Any]:
    """Vrni status Bing integracije"""
    return {
        "api_configured": bool(API_KEY),
        "endpoint": ENDPOINT,
        "available": bool(API_KEY),
        "service": "Microsoft Bing Search API"
    }

# Razred za objektno uporabo
class BingSearchIntegration:
    """Razred za Bing Search integracijo"""
    
    def __init__(self):
        self.api_key = API_KEY
        self.endpoint = ENDPOINT
        self.available = bool(API_KEY)
    
    def search(self, query: str, count: int = 5) -> List[Dict[str, Any]]:
        """Iskanje preko razreda"""
        return search(query, count)
    
    def run(self, input_text: str) -> Dict[str, Any]:
        """Run metoda za kompatibilnost z OmniCore"""
        results = self.search(input_text, 5)
        
        return {
            "service": "Bing Search",
            "query": input_text,
            "results_count": len(results) if not (results and results[0].get("error")) else 0,
            "results": results[:3],  # Omeji na 3 za pregled
            "status": "success" if not (results and results[0].get("error")) else "error"
        }
    
    def get_status(self) -> Dict[str, Any]:
        """Status integracije"""
        return get_status()

# Test funkcionalnost
if __name__ == "__main__":
    print("🔍 Bing Search API Test")
    print(f"Status: {get_status()}")
    
    if API_KEY:
        test_query = "najboljše turistične destinacije v Sloveniji"
        print(f"\nTestno iskanje: '{test_query}'")
        
        results = search(test_query, 3)
        
        if results and not results[0].get("error"):
            print(f"✅ Najdenih {len(results)} rezultatov:")
            for i, result in enumerate(results, 1):
                print(f"{i}. {result['name']}")
                print(f"   {result['snippet'][:100]}...")
                print(f"   {result['url']}")
                print()
        else:
            print(f"❌ Napaka: {results}")
    else:
        print("⚠️ Nastavi BING_API_KEY za testiranje")
        print("Primer: set BING_API_KEY=your-api-key-here")