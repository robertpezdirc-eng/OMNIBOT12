#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMNI CORE AI - Napredni AI-usmerjen routing sistem
Uporablja OpenAI za pametno razpoznavanje namenov in usmerjanje na ustrezne module
"""

import os
import json
import datetime
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import logging

# Poskusi uvoziti OpenAI - če ni na voljo, uporabi mock
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️  OpenAI knjižnica ni nameščena. Uporabljam mock AI routing.")

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class RoutingResult:
    """Rezultat AI routanja"""
    module: str
    confidence: float
    reasoning: str
    action: str
    result: str
    timestamp: str
    ai_used: bool = False

class TaskManager:
    """Upravljanje nalog in projektov"""
    
    def __init__(self):
        self.tasks = []
        self.capabilities = [
            "dodajanje nalog", "upravljanje projektov", "sledenje napredka",
            "prioritizacija", "deadlines", "timesheets", "produktivnost"
        ]
    
    def handle(self, query: str) -> Dict[str, Any]:
        self.tasks.append({
            "query": query,
            "created": datetime.datetime.now().isoformat(),
            "status": "nova"
        })
        return {
            "action": "task_created",
            "result": f"[TaskManager] ✅ Dodal sem novo nalogo: {query}",
            "data": {"task_count": len(self.tasks), "latest_task": query}
        }

class Calendar:
    """Upravljanje koledarja in dogodkov"""
    
    def __init__(self):
        self.events = []
        self.capabilities = [
            "ustvarjanje dogodkov", "sestanki", "opomniki", "urniki",
            "rezervacije", "časovni načrti", "koordinacija"
        ]
    
    def handle(self, query: str) -> Dict[str, Any]:
        self.events.append({
            "query": query,
            "created": datetime.datetime.now().isoformat(),
            "type": "event"
        })
        return {
            "action": "event_created",
            "result": f"[Koledar] 📅 Ustvaril sem dogodek: {query}",
            "data": {"event_count": len(self.events), "latest_event": query}
        }

class DataAnalyzer:
    """Analiza podatkov in statistik"""
    
    def __init__(self):
        self.analyses = []
        self.capabilities = [
            "analiza podatkov", "statistike", "poročila", "grafi",
            "trendi", "KPI", "dashboard", "metrike", "vizualizacija"
        ]
    
    def handle(self, query: str) -> Dict[str, Any]:
        self.analyses.append({
            "query": query,
            "created": datetime.datetime.now().isoformat(),
            "type": "analysis"
        })
        return {
            "action": "analysis_started",
            "result": f"[DataAnalyzer] 📊 Analiziram podatke: {query}",
            "data": {"analysis_count": len(self.analyses), "query": query}
        }

class DocumentManager:
    """Upravljanje dokumentov in datotek"""
    
    def __init__(self):
        self.documents = []
        self.capabilities = [
            "upravljanje dokumentov", "datoteke", "PDF", "Word", "Excel",
            "shranjevanje", "iskanje", "organizacija", "verzije"
        ]
    
    def handle(self, query: str) -> Dict[str, Any]:
        self.documents.append({
            "query": query,
            "created": datetime.datetime.now().isoformat(),
            "type": "document"
        })
        return {
            "action": "document_processed",
            "result": f"[DocumentManager] 📄 Upravljam z dokumentom: {query}",
            "data": {"document_count": len(self.documents), "query": query}
        }

class WebSearch:
    """Spletno iskanje in raziskave"""
    
    def __init__(self):
        self.searches = []
        self.capabilities = [
            "spletno iskanje", "raziskave", "informacije", "novice",
            "Google", "Bing", "Wikipedia", "akademski članki"
        ]
    
    def handle(self, query: str) -> Dict[str, Any]:
        self.searches.append({
            "query": query,
            "created": datetime.datetime.now().isoformat(),
            "type": "search"
        })
        return {
            "action": "search_executed",
            "result": f"[WebSearch] 🔍 Iščem po spletu: {query}",
            "data": {"search_count": len(self.searches), "query": query}
        }

class FinanceManager:
    """Finančno upravljanje in proračuni"""
    
    def __init__(self):
        self.transactions = []
        self.capabilities = [
            "finančno upravljanje", "proračuni", "stroški", "prihodki",
            "investicije", "davki", "računovodstvo", "analiza ROI"
        ]
    
    def handle(self, query: str) -> Dict[str, Any]:
        self.transactions.append({
            "query": query,
            "created": datetime.datetime.now().isoformat(),
            "type": "finance"
        })
        return {
            "action": "finance_processed",
            "result": f"[FinanceManager] 💰 Obdelavam finančno zahtevo: {query}",
            "data": {"transaction_count": len(self.transactions), "query": query}
        }

class OmniCoreAI:
    """
    Napredni AI-usmerjen CORE z OpenAI integracijo
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        # Inicializacija modulov
        self.modules = {
            "task": TaskManager(),
            "calendar": Calendar(),
            "analyze": DataAnalyzer(),
            "docs": DocumentManager(),
            "search": WebSearch(),
            "finance": FinanceManager()
        }
        
        # AI konfiguracija
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.ai_enabled = OPENAI_AVAILABLE and self.openai_api_key
        
        if self.ai_enabled:
            logger.info("🤖 AI routing omogočen z OpenAI")
        else:
            logger.info("🔄 Uporabljam fallback keyword routing")
        
        # Statistike
        self.stats = {
            "total_requests": 0,
            "ai_requests": 0,
            "fallback_requests": 0,
            "module_usage": {module: 0 for module in self.modules.keys()},
            "start_time": datetime.datetime.now()
        }
        
        # Fallback ključne besede
        self.fallback_keywords = {
            "task": ["naloga", "projekt", "todo", "opravilo", "zadolžitev", "dodaj", "ustvari"],
            "calendar": ["koledar", "dogodek", "sestanek", "termin", "rezervacija", "urnik"],
            "analyze": ["analiziraj", "podatki", "statistika", "poročilo", "graf", "trend"],
            "docs": ["dokument", "datoteka", "pdf", "word", "excel", "odpri", "shrani"],
            "search": ["poišči", "išči", "google", "splet", "informacije", "raziskava"],
            "finance": ["finance", "denar", "proračun", "strošek", "prihodek", "davek", "investicija"]
        }
    
    def classify_intent_ai(self, query: str) -> RoutingResult:
        """Uporabi OpenAI za klasifikacijo namena z optimiziranim promptom"""
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.openai_api_key)
            
            prompt = f"""Analiziraj uporabnikovo zahtevo in izberi NAJBOLJ PRIMEREN modul:

ZAHTEVA: "{query}"

MODULI IN NJIHOVE FUNKCIJE:
• task - Upravljanje nalog, opomnikov, projektov, dodajanje stvari na seznam
• calendar - Sestanki, dogodki, termini, urniki, rezervacije
• analyze - Analiza podatkov, statistike, poročila, trendi, metrike, grafiki
• docs - Dokumenti, datoteke, pisanje, urejanje besedil, PDF-ji
• search - Iskanje informacij, raziskave, spletno brskanje, najnovejše novice
• finance - Finančne zadeve, proračuni, stroški, investicije, ROI, kalkulacije

PRAVILA:
1. Izberi modul, ki NAJBOLJE ustreza glavni funkciji zahteve
2. Če zahteva vsebuje več funkcij, izberi PRIMARNO
3. Za nejasne zahteve uporabi "search"
4. Oceni zaupanje (0.0-1.0)
5. Kratko razloži odločitev

PRIMERI:
"Dodaj nalogo za pripravo poročila" → task
"Analiziraj prodajne podatke Q4" → analyze  
"Organiziraj sestanek z ekipo" → calendar
"Poišči informacije o AI" → search
"Izračunaj ROI kampanje" → finance
"Pripravi dokument pogodbe" → docs

Odgovori v JSON formatu:
{{
    "module": "ime_modula",
    "confidence": 0.95,
    "reasoning": "kratka razlaga"
}}"""
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Si strokovnjak za klasifikacijo uporabniških zahtev. Odgovarjaš samo v JSON formatu."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.1,
                top_p=0.9
            )
            
            # Parsiraj odgovor
            ai_response = response.choices[0].message.content.strip()
            result_data = json.loads(ai_response)
            
            # Preveri veljavnost modula
            selected_module = result_data.get("module", "search")
            if selected_module not in self.modules:
                selected_module = "search"
                result_data["confidence"] = 0.4
                result_data["reasoning"] = "Fallback na search - neveljaven modul"
            
            # Prilagodi zaupnost na podlagi ključnih besed
            confidence = self._calculate_confidence(query, selected_module, result_data.get("confidence", 0.5))
            
            return RoutingResult(
                module=selected_module,
                confidence=confidence,
                reasoning=result_data.get("reasoning", "AI klasifikacija"),
                action="ai_routing",
                result="",
                timestamp=datetime.datetime.now().isoformat(),
                ai_used=True
            )
            
        except Exception as e:
            logger.error(f"AI routing napaka: {e}")
            # Fallback na keyword routing
            return self.classify_intent_fallback(query)
    
    def _calculate_confidence(self, query: str, module: str, base_confidence: float) -> float:
        """Izračunaj zaupnost na podlagi ključnih besed in dolžine zahteve"""
        confidence = base_confidence
        
        # Ključne besede za vsak modul
        keywords = {
            "task": ["nalog", "dodaj", "opomni", "seznam", "projekt", "to-do"],
            "calendar": ["sestanek", "dogodek", "termin", "rezerv", "urnik", "koledar"],
            "analyze": ["analiz", "podatk", "statistik", "poročil", "trend", "graf"],
            "docs": ["dokument", "datoteka", "piš", "uredi", "pdf", "besedil"],
            "search": ["poišč", "iskal", "razisk", "informacij", "splet", "najd"],
            "finance": ["financ", "proračun", "stroš", "investicij", "roi", "kalkulacij"]
        }
        
        # Povečaj zaupnost, če so prisotne ključne besede
        query_lower = query.lower()
        if module in keywords:
            for keyword in keywords[module]:
                if keyword in query_lower:
                    confidence += 0.1
                    break
        
        # Prilagodi zaupnost glede na dolžino zahteve
        word_count = len(query.split())
        if word_count > 5:
            confidence += 0.05  # Daljše zahteve so običajno jasnejše
        elif word_count < 3:
            confidence -= 0.1  # Kratke zahteve so manj jasne
        
        return min(confidence, 0.95)  # Maksimalna zaupnost 95%
    
    def classify_intent_fallback(self, query: str) -> RoutingResult:
        """Fallback keyword-based routing"""
        query_lower = query.lower()
        best_match = "search"  # default
        best_score = 0
        
        for module, keywords in self.fallback_keywords.items():
            score = sum(1 for keyword in keywords if keyword in query_lower)
            if score > best_score:
                best_score = score
                best_match = module
        
        confidence = min(best_score / 3.0, 1.0)  # Normaliziraj na 0-1
        
        return RoutingResult(
            module=best_match,
            confidence=confidence,
            reasoning=f"Keyword match (score: {best_score})",
            action="fallback_routing",
            result="",
            timestamp=datetime.datetime.now().isoformat(),
            ai_used=False
        )
    
    def route(self, query: str) -> Dict[str, Any]:
        """Glavna routing funkcija"""
        self.stats["total_requests"] += 1
        
        # Izberi routing metodo
        if self.ai_enabled:
            routing_result = self.classify_intent_ai(query)
            self.stats["ai_requests"] += 1
        else:
            routing_result = self.classify_intent_fallback(query)
            self.stats["fallback_requests"] += 1
        
        # Izvršuj na modulu
        if routing_result.module in self.modules:
            module_result = self.modules[routing_result.module].handle(query)
            routing_result.result = module_result["result"]
            routing_result.action = module_result["action"]
            
            # Posodobi statistike
            self.stats["module_usage"][routing_result.module] += 1
            
            return {
                "module": routing_result.module,
                "action": routing_result.action,
                "result": routing_result.result,
                "confidence": routing_result.confidence,
                "reasoning": routing_result.reasoning,
                "ai_used": routing_result.ai_used,
                "timestamp": routing_result.timestamp,
                "success": True,
                "data": module_result.get("data", {})
            }
        else:
            return {
                "module": "unknown",
                "action": "error",
                "result": f"[CORE] ❌ Ne najdem ustreznega modula za: {query}",
                "confidence": 0.0,
                "reasoning": "Modul ne obstaja",
                "ai_used": routing_result.ai_used,
                "timestamp": routing_result.timestamp,
                "success": False
            }
    
    def get_stats(self) -> Dict[str, Any]:
        """Vrni statistike sistema"""
        uptime = (datetime.datetime.now() - self.stats["start_time"]).total_seconds()
        
        return {
            "total_requests": self.stats["total_requests"],
            "ai_requests": self.stats["ai_requests"],
            "fallback_requests": self.stats["fallback_requests"],
            "module_usage": self.stats["module_usage"],
            "uptime_seconds": uptime,
            "ai_enabled": self.ai_enabled,
            "available_modules": list(self.modules.keys()),
            "system_status": "healthy"
        }
    
    def list_capabilities(self) -> Dict[str, List[str]]:
        """Seznam zmožnosti vseh modulov"""
        return {
            module_name: module_obj.capabilities 
            for module_name, module_obj in self.modules.items()
        }

# ------------------- TEST FUNKCIJE -------------------
def test_ai_routing():
    """Test AI routing funkcionalnosti"""
    print("🧪 Testiram AI Routing sistem...\n")
    
    # Inicializiraj CORE (brez API ključa za demo)
    core = OmniCoreAI()
    
    test_queries = [
        "Dodaj naloga: pripraviti mesečno poročilo za management",
        "Ustvari sestanek z razvojno ekipo v četrtek ob 14h",
        "Analiziraj podatke iz prodaje za zadnji kvartal in pripravi graf",
        "Odpri dokument pogodba_2024.pdf in preveri pogoje",
        "Poišči najnovejše informacije o kvantnem računalništvu",
        "Preveri proračun za marketing kampanjo in izračunaj ROI",
        "Kaj je danes za kosilo?",  # Nejasna zahteva
    ]
    
    print("📋 Testni primeri:\n")
    
    for i, query in enumerate(test_queries, 1):
        print(f"{i}. Uporabnik: {query}")
        result = core.route(query)
        
        print(f"   🎯 Modul: {result['module']}")
        print(f"   🤖 AI uporabljen: {'✅' if result['ai_used'] else '❌'}")
        print(f"   📊 Zaupanje: {result['confidence']:.2f}")
        print(f"   💭 Razlog: {result['reasoning']}")
        print(f"   📤 Rezultat: {result['result']}")
        print()
    
    # Prikaži statistike
    print("📊 Statistike sistema:")
    stats = core.get_stats()
    for key, value in stats.items():
        if key != "start_time":
            print(f"   {key}: {value}")
    
    print("\n🔧 Zmožnosti modulov:")
    capabilities = core.list_capabilities()
    for module, caps in capabilities.items():
        print(f"   {module}: {', '.join(caps[:3])}...")

if __name__ == "__main__":
    test_ai_routing()