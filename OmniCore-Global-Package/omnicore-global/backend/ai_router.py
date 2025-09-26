"""
OmniCore AI Router - Inteligentno usmerjanje poizvedb
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class AIRouter:
    """AI-powered router za usmerjanje poizvedb v ustrezne module"""
    
    def __init__(self, modules: Dict[str, Any], config: Any):
        self.modules = modules
        self.config = config
        self.routing_rules = self._initialize_routing_rules()
        self.learning_data = []
        
        logger.info("🤖 AI Router inicializiran")
    
    def _initialize_routing_rules(self) -> Dict[str, List[str]]:
        """Inicializacija pravil za usmerjanje"""
        return {
            "finance": [
                "finance", "financial", "money", "budget", "invoice", "payment", "cost", "revenue",
                "profit", "expense", "accounting", "tax", "denar", "proračun", "račun", "plačilo",
                "stroški", "prihodki", "dobiček", "izdatek", "računovodstvo", "davek", "finančni"
            ],
            "analytics": [
                "analytics", "analysis", "data", "report", "statistics", "metrics", "dashboard",
                "chart", "graph", "trend", "analiza", "podatki", "poročilo", "statistika",
                "metrike", "grafikon", "trend", "analitika"
            ],
            "task": [
                "task", "todo", "calendar", "schedule", "meeting", "appointment", "deadline",
                "project", "naloga", "opravilo", "koledar", "urnik", "sestanek", "termin",
                "rok", "projekt"
            ],
            "logistics": [
                "logistics", "transport", "shipping", "delivery", "warehouse", "inventory",
                "supply", "chain", "logistika", "prevoz", "dostava", "skladišče", "zaloge",
                "dobavna", "veriga"
            ],
            "tourism": [
                "tourism", "travel", "hotel", "booking", "vacation", "trip", "destination",
                "restaurant", "turizem", "potovanje", "hotel", "rezervacija", "počitnice",
                "izlet", "destinacija", "restavracija"
            ],
            "healthcare": [
                "health", "medical", "doctor", "patient", "treatment", "diagnosis", "medicine",
                "hospital", "zdravje", "medicinski", "zdravnik", "pacient", "zdravljenje",
                "diagnoza", "zdravilo", "bolnišnica"
            ]
        }
    
    async def route(self, query: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Glavna metoda za usmerjanje poizvedb"""
        try:
            # Normalizacija poizvedbe
            normalized_query = query.lower().strip()
            
            # 1. Kontekstno usmerjanje
            if context and "preferred_module" in context:
                preferred = context["preferred_module"]
                if preferred in self.modules:
                    logger.info(f"🎯 Kontekstno usmerjanje: {preferred}")
                    return preferred
            
            # 2. Keyword-based routing
            module_scores = {}
            
            for module_name, keywords in self.routing_rules.items():
                score = 0
                for keyword in keywords:
                    if keyword in normalized_query:
                        # Večji score za natančno ujemanje
                        if keyword == normalized_query:
                            score += 10
                        # Manjši score za delno ujemanje
                        elif re.search(r'\b' + re.escape(keyword) + r'\b', normalized_query):
                            score += 5
                        # Najmanši score za vsebovanje
                        else:
                            score += 1
                
                if score > 0:
                    module_scores[module_name] = score
            
            # 3. Izbira modula z najvišjim score-om
            if module_scores:
                best_module = max(module_scores, key=module_scores.get)
                confidence = module_scores[best_module] / max(module_scores.values())
                
                logger.info(f"🎯 AI Routing: {best_module} (confidence: {confidence:.2f})")
                
                # Shranjevanje za učenje
                self._save_routing_decision(query, best_module, confidence, context)
                
                return best_module
            
            # 4. Fallback na analytics modul
            logger.info("🎯 Fallback routing: analytics")
            return "analytics"
            
        except Exception as e:
            logger.error(f"Napaka pri AI routing: {str(e)}")
            return "analytics"  # Safe fallback
    
    def _save_routing_decision(self, query: str, module: str, confidence: float, context: Optional[Dict[str, Any]]):
        """Shranjevanje odločitev za učenje"""
        decision = {
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "module": module,
            "confidence": confidence,
            "context": context or {}
        }
        
        self.learning_data.append(decision)
        
        # Ohrani samo zadnjih 1000 odločitev
        if len(self.learning_data) > 1000:
            self.learning_data = self.learning_data[-1000:]
    
    async def get_routing_suggestions(self, query: str) -> List[Dict[str, Any]]:
        """Pridobi predloge za usmerjanje"""
        normalized_query = query.lower().strip()
        suggestions = []
        
        for module_name, keywords in self.routing_rules.items():
            score = 0
            matched_keywords = []
            
            for keyword in keywords:
                if keyword in normalized_query:
                    score += 1
                    matched_keywords.append(keyword)
            
            if score > 0:
                suggestions.append({
                    "module": module_name,
                    "score": score,
                    "matched_keywords": matched_keywords,
                    "confidence": min(score / 5.0, 1.0)  # Normaliziraj na 0-1
                })
        
        # Sortiraj po score-u
        suggestions.sort(key=lambda x: x["score"], reverse=True)
        
        return suggestions[:3]  # Vrni top 3 predloge
    
    async def learn_from_feedback(self, query: str, expected_module: str, actual_module: str):
        """Učenje iz povratnih informacij"""
        try:
            # Dodaj ključne besede iz poizvedbe v pravila za pričakovani modul
            words = query.lower().split()
            
            for word in words:
                if len(word) > 3 and word not in self.routing_rules[expected_module]:
                    self.routing_rules[expected_module].append(word)
            
            logger.info(f"📚 Učenje: dodal ključne besede za {expected_module}")
            
        except Exception as e:
            logger.error(f"Napaka pri učenju: {str(e)}")
    
    async def get_routing_analytics(self) -> Dict[str, Any]:
        """Analitika usmerjanja"""
        if not self.learning_data:
            return {"message": "Ni podatkov o usmerjanju"}
        
        # Statistike po modulih
        module_stats = {}
        total_decisions = len(self.learning_data)
        
        for decision in self.learning_data:
            module = decision["module"]
            if module not in module_stats:
                module_stats[module] = {
                    "count": 0,
                    "avg_confidence": 0,
                    "total_confidence": 0
                }
            
            module_stats[module]["count"] += 1
            module_stats[module]["total_confidence"] += decision["confidence"]
        
        # Izračunaj povprečja
        for module, stats in module_stats.items():
            stats["percentage"] = (stats["count"] / total_decisions) * 100
            stats["avg_confidence"] = stats["total_confidence"] / stats["count"]
            del stats["total_confidence"]  # Odstrani vmesni podatek
        
        return {
            "total_decisions": total_decisions,
            "module_statistics": module_stats,
            "last_updated": datetime.now().isoformat()
        }
    
    async def update_routing_rules(self, module: str, keywords: List[str]):
        """Posodobi pravila usmerjanja"""
        try:
            if module in self.routing_rules:
                # Dodaj nove ključne besede
                for keyword in keywords:
                    if keyword not in self.routing_rules[module]:
                        self.routing_rules[module].append(keyword.lower())
                
                logger.info(f"📝 Posodobil pravila za {module}: {keywords}")
                return True
            else:
                logger.error(f"Modul {module} ne obstaja")
                return False
                
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju pravil: {str(e)}")
            return False
    
    def get_module_keywords(self, module: str) -> List[str]:
        """Pridobi ključne besede za modul"""
        return self.routing_rules.get(module, [])
    
    async def health_check(self) -> Dict[str, Any]:
        """Zdravstveno preverjanje AI Router"""
        return {
            "status": "healthy",
            "modules_count": len(self.modules),
            "routing_rules_count": sum(len(keywords) for keywords in self.routing_rules.values()),
            "learning_data_count": len(self.learning_data),
            "last_check": datetime.now().isoformat()
        }