"""
🗣️ OMNI NLP PROCESSOR
Obdelava naravnega jezika in razumevanje konteksta
"""

import re
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

class OmniNLP:
    """
    Procesor za naravni jezik z osnovnimi funkcionalnostmi:
    - Analiza sentimenta
    - Prepoznavanje namenov
    - Ekstraktiranje entitet
    - Kontekstualno razumevanje
    """
    
    def __init__(self):
        self.intents = self._load_intents()
        self.entities = {}
        self.context_history = []
    
    def _load_intents(self) -> Dict[str, List[str]]:
        """Naloži osnovne namene in ključne besede"""
        return {
            "greeting": ["pozdrav", "zdravo", "dober dan", "živjo", "hej", "hello", "hi"],
            "question": ["kaj", "kako", "kdo", "kje", "kdaj", "zakaj", "what", "how", "who", "where", "when", "why"],
            "request": ["prosim", "lahko", "bi rad", "potrebujem", "please", "can you", "i need"],
            "finance": ["denar", "finance", "računovodstvo", "davki", "proračun", "money", "budget", "taxes"],
            "tourism": ["turizem", "potovanje", "hotel", "kamp", "rezervacija", "tourism", "travel", "booking"],
            "healthcare": ["zdravje", "zdravstvo", "bolezen", "zdravnik", "health", "medical", "doctor"],
            "devops": ["programiranje", "koda", "github", "deployment", "server", "programming", "code"],
            "art": ["umetnost", "glasba", "dizajn", "video", "art", "music", "design"],
            "help": ["pomoč", "navodila", "kako deluje", "help", "instructions", "how does it work"]
        }
    
    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Osnovna analiza sentimenta"""
        positive_words = ["dobro", "odlično", "super", "fantastično", "great", "excellent", "good", "amazing"]
        negative_words = ["slabo", "grozno", "težava", "problem", "bad", "terrible", "issue", "problem"]
        
        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            sentiment = "positive"
            score = min(0.8, 0.5 + (positive_count - negative_count) * 0.1)
        elif negative_count > positive_count:
            sentiment = "negative"
            score = max(0.2, 0.5 - (negative_count - positive_count) * 0.1)
        else:
            sentiment = "neutral"
            score = 0.5
        
        return {
            "sentiment": sentiment,
            "score": score,
            "positive_indicators": positive_count,
            "negative_indicators": negative_count
        }
    
    def detect_intent(self, text: str) -> Dict[str, Any]:
        """Prepoznaj namen uporabnika"""
        text_lower = text.lower()
        intent_scores = {}
        
        for intent, keywords in self.intents.items():
            score = 0
            matched_keywords = []
            
            for keyword in keywords:
                if keyword in text_lower:
                    score += 1
                    matched_keywords.append(keyword)
            
            if score > 0:
                intent_scores[intent] = {
                    "score": score / len(keywords),  # Normaliziraj
                    "matched_keywords": matched_keywords
                }
        
        # Najdi najbolj verjetni namen
        if intent_scores:
            best_intent = max(intent_scores.keys(), key=lambda x: intent_scores[x]["score"])
            confidence = intent_scores[best_intent]["score"]
        else:
            best_intent = "unknown"
            confidence = 0.0
        
        return {
            "intent": best_intent,
            "confidence": confidence,
            "all_intents": intent_scores
        }
    
    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Ekstraktiraj entitete iz besedila"""
        entities = {
            "emails": [],
            "urls": [],
            "numbers": [],
            "dates": [],
            "currencies": []
        }
        
        # Email naslovi
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        entities["emails"] = re.findall(email_pattern, text)
        
        # URL-ji
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        entities["urls"] = re.findall(url_pattern, text)
        
        # Številke
        number_pattern = r'\b\d+(?:\.\d+)?\b'
        entities["numbers"] = re.findall(number_pattern, text)
        
        # Valute (EUR, USD, itd.)
        currency_pattern = r'\b\d+(?:\.\d+)?\s*(?:EUR|USD|€|\$)\b'
        entities["currencies"] = re.findall(currency_pattern, text)
        
        # Datumi (osnovno)
        date_pattern = r'\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b'
        entities["dates"] = re.findall(date_pattern, text)
        
        return entities
    
    def process_text(self, text: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Celostna obdelava besedila"""
        if context is None:
            context = {}
        
        # Analiziraj sentiment
        sentiment = self.analyze_sentiment(text)
        
        # Prepoznaj namen
        intent = self.detect_intent(text)
        
        # Ekstraktiraj entitete
        entities = self.extract_entities(text)
        
        # Shrani v kontekst
        processed_context = {
            "timestamp": datetime.now().isoformat(),
            "original_text": text,
            "sentiment": sentiment,
            "intent": intent,
            "entities": entities,
            "context": context
        }
        
        self.context_history.append(processed_context)
        
        # Obdrži samo zadnjih 10 kontekstov
        if len(self.context_history) > 10:
            self.context_history = self.context_history[-10:]
        
        return processed_context
    
    def get_context_summary(self) -> Dict[str, Any]:
        """Vrni povzetek konteksta pogovora"""
        if not self.context_history:
            return {"message": "Ni konteksta"}
        
        # Analiziraj trende
        recent_intents = [ctx["intent"]["intent"] for ctx in self.context_history[-5:]]
        recent_sentiments = [ctx["sentiment"]["sentiment"] for ctx in self.context_history[-5:]]
        
        return {
            "total_interactions": len(self.context_history),
            "recent_intents": recent_intents,
            "recent_sentiments": recent_sentiments,
            "last_interaction": self.context_history[-1]["timestamp"],
            "dominant_intent": max(set(recent_intents), key=recent_intents.count) if recent_intents else None
        }
    
    def generate_response_suggestions(self, processed_text: Dict[str, Any]) -> List[str]:
        """Generiraj predloge odgovorov na podlagi analize"""
        intent = processed_text["intent"]["intent"]
        sentiment = processed_text["sentiment"]["sentiment"]
        
        suggestions = []
        
        if intent == "greeting":
            if sentiment == "positive":
                suggestions = ["Pozdravljen! Kako ti lahko pomagam?", "Živjo! Kaj te zanima?"]
            else:
                suggestions = ["Pozdrav. Kako ti lahko pomagam?", "Zdravo. V čem lahko pomagam?"]
        
        elif intent == "question":
            suggestions = [
                "To je zanimivo vprašanje. Povej mi več podrobnosti.",
                "Rad bi ti pomagal. Lahko podaš več informacij?",
                "Raziskal bom to za tebe. Kaj točno te zanima?"
            ]
        
        elif intent == "finance":
            suggestions = [
                "Za finančne zadeve lahko uporabim finance modul. Kaj potrebuješ?",
                "Pomagam lahko z računovodstvom, proračuni ali davki. Kaj te zanima?",
                "Finančno svetovanje je moja specialnost. Povej mi več."
            ]
        
        elif intent == "tourism":
            suggestions = [
                "Turizem je eno mojih področij! Kam bi rad potoval?",
                "Pomagam lahko z rezervacijami, itinerariji ali priporočili. Kaj potrebuješ?",
                "Načrtujem lahko popolno potovanje. Povej mi svoje želje."
            ]
        
        elif intent == "help":
            suggestions = [
                "Rad ti pomagam! Sem Omni - univerzalen AI pomočnik.",
                "Pomagam lahko pri turizmu, financah, programiranju, zdravstvu in še več.",
                "Povej mi, kaj te zanima, in poiščem najboljšo rešitev."
            ]
        
        else:
            suggestions = [
                "Zanimivo! Povej mi več o tem.",
                "Kako ti lahko pomagam s tem?",
                "Raziskal bom to za tebe."
            ]
        
        return suggestions

if __name__ == "__main__":
    # Test NLP procesorja
    nlp = OmniNLP()
    
    test_texts = [
        "Pozdrav! Kako si danes?",
        "Potrebujem pomoč z računovodstvom za moje podjetje",
        "Kam bi priporočil potovanje za vikend?",
        "Kako naredim GitHub integracijo?",
        "Slabo se počutim, kaj naj naredim?"
    ]
    
    for text in test_texts:
        print(f"\n📝 Besedilo: {text}")
        result = nlp.process_text(text)
        print(f"🎯 Namen: {result['intent']['intent']} ({result['intent']['confidence']:.2f})")
        print(f"😊 Sentiment: {result['sentiment']['sentiment']} ({result['sentiment']['score']:.2f})")
        print(f"🏷️ Entitete: {result['entities']}")
        
        suggestions = nlp.generate_response_suggestions(result)
        print(f"💡 Predlogi: {suggestions[0] if suggestions else 'Ni predlogov'}")
    
    print(f"\n📊 Povzetek konteksta: {nlp.get_context_summary()}")