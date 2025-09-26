#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMNI CORE - Integracijski sloj za pametno usmerjanje modulov
Centralni "router" ki sprejme uporabnikovo zahtevo in kliče ustrezne module.
"""

import re
import json
import datetime
from typing import Dict, List, Any, Optional

class TaskManager:
    """Modul za upravljanje nalog in projektov"""
    
    def __init__(self):
        self.tasks = []
        self.task_id_counter = 1
    
    def handle(self, query: str) -> Dict[str, Any]:
        # Izvleci nalogo iz query-ja
        task_match = re.search(r'naloga[:\s]*(.+)', query.lower())
        task_name = task_match.group(1).strip() if task_match else query
        
        task = {
            "id": self.task_id_counter,
            "name": task_name,
            "status": "nova",
            "created": datetime.datetime.now().isoformat(),
            "priority": "srednja"
        }
        
        self.tasks.append(task)
        self.task_id_counter += 1
        
        return {
            "module": "TaskManager",
            "action": "create_task",
            "result": f"✅ Dodana nova naloga: '{task_name}'",
            "data": task,
            "success": True
        }

class Calendar:
    """Modul za upravljanje koledarja in dogodkov"""
    
    def __init__(self):
        self.events = []
        self.event_id_counter = 1
    
    def handle(self, query: str) -> Dict[str, Any]:
        # Izvleci dogodek in čas
        event_match = re.search(r'dogodek[:\s]*(.+?)(?:\s+ob\s+(\d+)h?)?', query.lower())
        time_match = re.search(r'ob\s+(\d+)h?', query.lower())
        
        event_name = event_match.group(1).strip() if event_match else query
        event_time = time_match.group(1) + ":00" if time_match else "09:00"
        
        event = {
            "id": self.event_id_counter,
            "title": event_name,
            "time": event_time,
            "date": datetime.date.today().isoformat(),
            "created": datetime.datetime.now().isoformat()
        }
        
        self.events.append(event)
        self.event_id_counter += 1
        
        return {
            "module": "Calendar",
            "action": "create_event",
            "result": f"📅 Ustvarjen dogodek: '{event_name}' ob {event_time}",
            "data": event,
            "success": True
        }

class DataAnalyzer:
    """Modul za analizo podatkov in poročila"""
    
    def __init__(self):
        self.analyses = []
        self.analysis_id_counter = 1
    
    def handle(self, query: str) -> Dict[str, Any]:
        # Določi tip analize
        analysis_type = "splošna"
        if "prodaja" in query.lower():
            analysis_type = "prodajna"
        elif "finančn" in query.lower():
            analysis_type = "finančna"
        elif "uporabnik" in query.lower():
            analysis_type = "uporabniška"
        
        analysis = {
            "id": self.analysis_id_counter,
            "type": analysis_type,
            "query": query,
            "status": "v_obdelavi",
            "created": datetime.datetime.now().isoformat()
        }
        
        self.analyses.append(analysis)
        self.analysis_id_counter += 1
        
        return {
            "module": "DataAnalyzer",
            "action": "start_analysis",
            "result": f"📊 Začenjam {analysis_type} analizo podatkov",
            "data": analysis,
            "success": True
        }

class DocumentManager:
    """Modul za upravljanje dokumentov"""
    
    def __init__(self):
        self.documents = []
        self.doc_id_counter = 1
    
    def handle(self, query: str) -> Dict[str, Any]:
        # Izvleci ime dokumenta
        doc_match = re.search(r'dokument[:\s]*(.+)', query.lower())
        doc_name = doc_match.group(1).strip() if doc_match else "neznan_dokument"
        
        # Določi akcijo
        action = "open"
        if "ustvari" in query.lower() or "naredi" in query.lower():
            action = "create"
        elif "uredi" in query.lower():
            action = "edit"
        
        document = {
            "id": self.doc_id_counter,
            "name": doc_name,
            "action": action,
            "created": datetime.datetime.now().isoformat()
        }
        
        self.documents.append(document)
        self.doc_id_counter += 1
        
        action_text = {"open": "Odpiram", "create": "Ustvarjam", "edit": "Urejam"}
        
        return {
            "module": "DocumentManager",
            "action": action,
            "result": f"📄 {action_text[action]} dokument: '{doc_name}'",
            "data": document,
            "success": True
        }

class WebSearch:
    """Modul za spletno iskanje"""
    
    def __init__(self):
        self.searches = []
        self.search_id_counter = 1
    
    def handle(self, query: str) -> Dict[str, Any]:
        # Izvleci iskalni pojem
        search_match = re.search(r'(?:poišči|išči)[:\s]*(.+)', query.lower())
        search_term = search_match.group(1).strip() if search_match else query
        
        search = {
            "id": self.search_id_counter,
            "term": search_term,
            "results_count": 0,  # Simulacija
            "created": datetime.datetime.now().isoformat()
        }
        
        self.searches.append(search)
        self.search_id_counter += 1
        
        return {
            "module": "WebSearch",
            "action": "search",
            "result": f"🔍 Iščem po spletu: '{search_term}'",
            "data": search,
            "success": True
        }

class FinanceManager:
    """Modul za finančno upravljanje"""
    
    def __init__(self):
        self.transactions = []
        self.budgets = []
    
    def handle(self, query: str) -> Dict[str, Any]:
        if "proračun" in query.lower():
            return {
                "module": "FinanceManager",
                "action": "budget_analysis",
                "result": "💰 Analiziram proračun in finančne podatke",
                "data": {"type": "budget", "status": "analyzing"},
                "success": True
            }
        else:
            return {
                "module": "FinanceManager", 
                "action": "financial_query",
                "result": f"💰 Obdelavam finančno zahtevo: {query}",
                "data": {"query": query},
                "success": True
            }

# ------------------- CORE ------------------- 
class OmniCore:
    """
    Glavni integracijski sloj - "možgani" sistema
    Pametno usmerja zahteve na ustrezne module
    """
    
    def __init__(self):
        self.modules = {
            "task": TaskManager(),
            "calendar": Calendar(),
            "analyze": DataAnalyzer(),
            "docs": DocumentManager(),
            "search": WebSearch(),
            "finance": FinanceManager(),
        }
        
        # Statistike uporabe
        self.stats = {
            "total_requests": 0,
            "module_usage": {module: 0 for module in self.modules.keys()},
            "success_rate": 0,
            "start_time": datetime.datetime.now()
        }
        
        # Ključne besede za usmerjanje
        self.routing_keywords = {
            "task": ["naloga", "opravilo", "task", "projekt", "delo"],
            "calendar": ["dogodek", "sestanek", "termin", "koledar", "datum", "ura"],
            "analyze": ["analiziraj", "podatki", "statistika", "poročilo", "analiza"],
            "docs": ["dokument", "datoteka", "pdf", "word", "excel", "besedilo"],
            "search": ["poišči", "išči", "najdi", "search", "google"],
            "finance": ["denar", "proračun", "finance", "stroški", "račun", "plačilo"]
        }
    
    def route(self, query: str) -> Dict[str, Any]:
        """
        Glavna funkcija za usmerjanje zahtev
        """
        self.stats["total_requests"] += 1
        
        if not query or not query.strip():
            return {
                "module": "CORE",
                "action": "error",
                "result": "❌ Prazna zahteva",
                "success": False
            }
        
        query_lower = query.lower()
        
        # Poišči najboljši modul na podlagi ključnih besed
        best_module = None
        max_matches = 0
        
        for module_name, keywords in self.routing_keywords.items():
            matches = sum(1 for keyword in keywords if keyword in query_lower)
            if matches > max_matches:
                max_matches = matches
                best_module = module_name
        
        # Če ni najden ustrezen modul, uporabi privzeto logiko
        if not best_module:
            if any(word in query_lower for word in ["kaj", "kako", "zakaj", "kdo", "kje", "kdaj"]):
                best_module = "search"
            else:
                return {
                    "module": "CORE",
                    "action": "no_match",
                    "result": f"🤔 Ne najdem ustreznega modula za: '{query}'",
                    "suggestion": "Poskusite z bolj specifično zahtevo",
                    "available_modules": list(self.modules.keys()),
                    "success": False
                }
        
        # Kliči izbrani modul
        try:
            result = self.modules[best_module].handle(query)
            self.stats["module_usage"][best_module] += 1
            
            # Dodaj meta informacije
            result["routing_info"] = {
                "selected_module": best_module,
                "confidence": max_matches,
                "processing_time": datetime.datetime.now().isoformat()
            }
            
            return result
            
        except Exception as e:
            return {
                "module": "CORE",
                "action": "error",
                "result": f"❌ Napaka pri obdelavi: {str(e)}",
                "error_details": str(e),
                "success": False
            }
    
    def get_stats(self) -> Dict[str, Any]:
        """Vrni statistike uporabe sistema"""
        uptime = datetime.datetime.now() - self.stats["start_time"]
        
        return {
            "total_requests": self.stats["total_requests"],
            "module_usage": self.stats["module_usage"],
            "uptime_seconds": uptime.total_seconds(),
            "available_modules": list(self.modules.keys()),
            "system_status": "active"
        }
    
    def list_capabilities(self) -> Dict[str, List[str]]:
        """Seznam zmožnosti vseh modulov"""
        return {
            "TaskManager": ["Ustvarjanje nalog", "Sledenje projektov", "Prioritizacija"],
            "Calendar": ["Ustvarjanje dogodkov", "Časovno načrtovanje", "Opomniki"],
            "DataAnalyzer": ["Analiza podatkov", "Statistike", "Poročila"],
            "DocumentManager": ["Upravljanje dokumentov", "Urejanje besedil", "Organizacija datotek"],
            "WebSearch": ["Spletno iskanje", "Raziskave", "Informacije"],
            "FinanceManager": ["Finančno načrtovanje", "Proračuni", "Stroški"]
        }

# ------------------- TEST ------------------- 
def run_tests():
    """Testna funkcija za preverjanje delovanja"""
    print("🧠 OMNI CORE - Testiranje integracijskega sloja\n")
    print("=" * 60)
    
    core = OmniCore()
    
    test_queries = [
        "Dodaj naloga: pripraviti poročilo za direktorja",
        "Ustvari dogodek sestanek ob 14h",
        "Analiziraj podatki iz prodaje za zadnji mesec",
        "Odpri dokument pogodba.pdf",
        "Poišči informacije o umetni inteligenci",
        "Preveri proračun za marketing",
        "To je nekaj brez ključne besede",
        "Kako deluje strojno učenje?",
        ""  # Prazna zahteva
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i}. Zahteva: '{query}'")
        print("-" * 40)
        
        result = core.route(query)
        
        print(f"📍 Modul: {result.get('module', 'N/A')}")
        print(f"🎯 Akcija: {result.get('action', 'N/A')}")
        print(f"📝 Rezultat: {result.get('result', 'N/A')}")
        
        if result.get('success'):
            print("✅ Status: Uspešno")
        else:
            print("❌ Status: Neuspešno")
            if result.get('suggestion'):
                print(f"💡 Predlog: {result['suggestion']}")
    
    # Prikaži statistike
    print("\n" + "=" * 60)
    print("📊 STATISTIKE SISTEMA")
    print("=" * 60)
    
    stats = core.get_stats()
    print(f"Skupaj zahtev: {stats['total_requests']}")
    print(f"Čas delovanja: {stats['uptime_seconds']:.2f} sekund")
    print(f"Status sistema: {stats['system_status']}")
    
    print("\n📈 Uporaba modulov:")
    for module, count in stats['module_usage'].items():
        print(f"  • {module}: {count}x")
    
    # Prikaži zmožnosti
    print("\n🔧 ZMOŽNOSTI MODULOV")
    print("=" * 60)
    
    capabilities = core.list_capabilities()
    for module, caps in capabilities.items():
        print(f"\n{module}:")
        for cap in caps:
            print(f"  • {cap}")

if __name__ == "__main__":
    run_tests()