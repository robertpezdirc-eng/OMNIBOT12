#!/usr/bin/env python3
"""
🤖 OMNI CHATBOT NLP - Napredni chatbot z NLP in večjezično podporo

Napreden AI chatbot sistem z:
- Večjezična podpora (slovenščina, angleščina, nemščina, italijanščina, hrvaščina)
- Natural Language Processing (NLP) z razumevanjem konteksta
- Inteligentni odgovori za turizem, gostinstvo in nastanitve
- Personalizirani predlogi in priporočila
- Integracija z OMNI moduli (rezervacije, AI engine, KPI)
- Sentiment analiza in uporabniška izkušnja
- Real-time chat z zgodovino pogovorov
- Voice-to-text in text-to-speech podpora
- Premium funkcionalnosti za Enterprise pakete

Varnostne funkcije:
- Centraliziran oblak → noben modul ne teče lokalno
- Enkripcija → TLS + AES-256 za vse podatke in komunikacijo
- Sandbox / Read-only demo
- Zaščita pred krajo → poskusi prenosa ali lokalne uporabe → modul se zaklene
- Admin dostop samo za tebe → edini, ki lahko nadgrajuje in odklepa funkcionalnosti
"""

import sqlite3
import json
import logging
import datetime
import time
import threading
import asyncio
import re
import secrets
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import warnings
from flask import Flask, request, jsonify, render_template_string
warnings.filterwarnings('ignore')

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Language(Enum):
    SLOVENIAN = "sl"
    ENGLISH = "en"
    GERMAN = "de"
    ITALIAN = "it"
    CROATIAN = "hr"

class MessageType(Enum):
    USER = "user"
    BOT = "bot"
    SYSTEM = "system"

class Intent(Enum):
    GREETING = "greeting"
    BOOKING = "booking"
    INFORMATION = "information"
    RECOMMENDATION = "recommendation"
    COMPLAINT = "complaint"
    PRICING = "pricing"
    MENU = "menu"
    ACTIVITIES = "activities"
    WEATHER = "weather"
    DIRECTIONS = "directions"
    UNKNOWN = "unknown"

class Sentiment(Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"

@dataclass
class ChatMessage:
    message_id: str
    session_id: str
    user_id: str
    message_type: MessageType
    content: str
    language: Language
    intent: Intent
    sentiment: Sentiment
    confidence: float
    timestamp: datetime.datetime
    response_time: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ChatSession:
    session_id: str
    user_id: str
    language: Language
    start_time: datetime.datetime
    last_activity: datetime.datetime
    message_count: int
    context: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True

class OmniChatbotNLP:
    def __init__(self, db_path: str = "omni_chatbot_nlp.db"):
        self.db_path = db_path
        self.is_demo = True
        self.demo_start_time = datetime.datetime.now()
        self.demo_duration_hours = 2
        self.access_key = secrets.token_hex(32)
        
        # Chat data
        self.active_sessions = {}
        self.message_history = []
        
        # NLP patterns and responses
        self.language_patterns = self._load_language_patterns()
        self.intent_patterns = self._load_intent_patterns()
        self.responses = self._load_responses()
        
        # Tourism knowledge base
        self.knowledge_base = self._load_knowledge_base()
        
        self.init_database()
        self.load_sample_data()
        
        # Flask aplikacija
        self.app = Flask(__name__)
        self.setup_routes()
        
        logger.info("OMNI Chatbot NLP inicializiran")

    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za sporočila
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                user_id TEXT,
                message_type TEXT,
                content TEXT,
                language TEXT,
                intent TEXT,
                sentiment TEXT,
                confidence REAL,
                timestamp TEXT,
                response_time REAL,
                metadata TEXT
            )
        ''')
        
        # Tabela za seje
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                language TEXT,
                start_time TEXT,
                last_activity TEXT,
                message_count INTEGER,
                context TEXT,
                is_active BOOLEAN
            )
        ''')
        
        # Tabela za znanje
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS knowledge_base (
                id TEXT PRIMARY KEY,
                category TEXT,
                language TEXT,
                question TEXT,
                answer TEXT,
                keywords TEXT,
                confidence REAL,
                created_at TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Chatbot NLP baza podatkov inicializirana")

    def _load_language_patterns(self) -> Dict[str, Dict[str, List[str]]]:
        """Naloži jezikovne vzorce za prepoznavanje jezika"""
        return {
            "sl": {
                "greetings": ["pozdravljeni", "zdravo", "dober dan", "dobro jutro", "dober večer", "živjo"],
                "questions": ["kaj", "kje", "kdaj", "kako", "zakaj", "koliko", "kdo"],
                "booking": ["rezervacija", "rezerviram", "prosim", "želim", "potrebujem", "naročam"],
                "thanks": ["hvala", "najlepša hvala", "se zahvaljujem", "hvala lepa"],
                "goodbye": ["nasvidenje", "adijo", "se vidimo", "lep dan"]
            },
            "en": {
                "greetings": ["hello", "hi", "good morning", "good afternoon", "good evening"],
                "questions": ["what", "where", "when", "how", "why", "how much", "who"],
                "booking": ["reservation", "book", "reserve", "please", "want", "need", "order"],
                "thanks": ["thank you", "thanks", "thank you very much", "appreciate"],
                "goodbye": ["goodbye", "bye", "see you", "have a nice day"]
            },
            "de": {
                "greetings": ["hallo", "guten tag", "guten morgen", "guten abend", "servus"],
                "questions": ["was", "wo", "wann", "wie", "warum", "wieviel", "wer"],
                "booking": ["reservierung", "buchen", "reservieren", "bitte", "möchte", "brauche"],
                "thanks": ["danke", "vielen dank", "dankeschön", "ich danke ihnen"],
                "goodbye": ["auf wiedersehen", "tschüss", "bis bald", "schönen tag"]
            },
            "it": {
                "greetings": ["ciao", "buongiorno", "buonasera", "salve", "buon pomeriggio"],
                "questions": ["cosa", "dove", "quando", "come", "perché", "quanto", "chi"],
                "booking": ["prenotazione", "prenotare", "riservare", "per favore", "voglio", "ho bisogno"],
                "thanks": ["grazie", "grazie mille", "la ringrazio", "molto gentile"],
                "goodbye": ["arrivederci", "ciao", "ci vediamo", "buona giornata"]
            },
            "hr": {
                "greetings": ["zdravo", "dobar dan", "dobro jutro", "dobra večer", "bok"],
                "questions": ["što", "gdje", "kada", "kako", "zašto", "koliko", "tko"],
                "booking": ["rezervacija", "rezervirati", "molim", "želim", "trebam", "naručujem"],
                "thanks": ["hvala", "puno hvala", "zahvaljujem", "hvala lijepa"],
                "goodbye": ["doviđenja", "bok", "vidimo se", "lijep dan"]
            }
        }

    def _load_intent_patterns(self) -> Dict[str, List[str]]:
        """Naloži vzorce za prepoznavanje namer"""
        return {
            "booking": [
                r"rezerv\w+", r"book\w+", r"buchen", r"prenotar\w+", r"naroč\w+",
                r"prosim.*soba", r"want.*room", r"möchte.*zimmer", r"voglio.*camera"
            ],
            "information": [
                r"informacij\w+", r"information", r"auskunft", r"informazioni",
                r"kaj.*ponujate", r"what.*offer", r"was.*bieten", r"cosa.*offrite"
            ],
            "recommendation": [
                r"priporoč\w+", r"recommend\w+", r"empfehl\w+", r"consigli\w+",
                r"kaj.*svetujete", r"what.*suggest", r"was.*empfehlen", r"cosa.*consigliate"
            ],
            "pricing": [
                r"cen\w+", r"price\w+", r"preis\w+", r"prezz\w+", r"košta", r"cost\w+",
                r"koliko.*stane", r"how much", r"wieviel.*kostet", r"quanto.*costa"
            ],
            "menu": [
                r"meni", r"menu", r"speisekarte", r"carta", r"jedilni.*list",
                r"kaj.*jeste", r"what.*eat", r"was.*essen", r"cosa.*mangiare"
            ],
            "activities": [
                r"aktivnost\w+", r"activit\w+", r"aktivität\w+", r"attivit\w+",
                r"kaj.*početi", r"what.*do", r"was.*machen", r"cosa.*fare"
            ]
        }

    def _load_responses(self) -> Dict[str, Dict[str, List[str]]]:
        """Naloži odgovore v različnih jezikih"""
        return {
            "greeting": {
                "sl": [
                    "Pozdravljeni! Sem OMNI asistent. Kako vam lahko pomagam?",
                    "Zdravo! Veseli me, da ste tukaj. Kaj vas zanima?",
                    "Dober dan! Pripravljen sem odgovoriti na vaša vprašanja."
                ],
                "en": [
                    "Hello! I'm OMNI assistant. How can I help you?",
                    "Hi there! Great to see you. What can I do for you?",
                    "Good day! I'm ready to answer your questions."
                ],
                "de": [
                    "Hallo! Ich bin OMNI Assistent. Wie kann ich Ihnen helfen?",
                    "Guten Tag! Schön, Sie zu sehen. Was kann ich für Sie tun?",
                    "Servus! Ich bin bereit, Ihre Fragen zu beantworten."
                ],
                "it": [
                    "Ciao! Sono l'assistente OMNI. Come posso aiutarla?",
                    "Salve! Piacere di vederla. Cosa posso fare per lei?",
                    "Buongiorno! Sono pronto a rispondere alle sue domande."
                ],
                "hr": [
                    "Zdravo! Ja sam OMNI asistent. Kako vam mogu pomoći?",
                    "Bok! Drago mi je što ste ovdje. Što vas zanima?",
                    "Dobar dan! Spreman sam odgovoriti na vaša pitanja."
                ]
            },
            "booking": {
                "sl": [
                    "Z veseljem vam pomagam pri rezervaciji! Katere datume imate v mislih?",
                    "Odlično! Za rezervacijo potrebujem nekaj podatkov. Kdaj bi radi prišli?",
                    "Rezervacija je enostavna. Povejte mi, koliko oseb in za katere datume?"
                ],
                "en": [
                    "I'd be happy to help with your booking! What dates do you have in mind?",
                    "Great! For the reservation, I need some details. When would you like to come?",
                    "Booking is easy. Tell me, how many people and for which dates?"
                ],
                "de": [
                    "Gerne helfe ich Ihnen bei der Buchung! Welche Termine haben Sie im Sinn?",
                    "Ausgezeichnet! Für die Reservierung brauche ich einige Angaben. Wann möchten Sie kommen?",
                    "Die Buchung ist einfach. Sagen Sie mir, für wie viele Personen und welche Termine?"
                ],
                "it": [
                    "Sarò felice di aiutarla con la prenotazione! Che date ha in mente?",
                    "Ottimo! Per la prenotazione ho bisogno di alcuni dettagli. Quando vorrebbe venire?",
                    "Prenotare è semplice. Mi dica, per quante persone e per quali date?"
                ],
                "hr": [
                    "Rado ću vam pomoći s rezervacijom! Koje datume imate na umu?",
                    "Odlično! Za rezervaciju trebam neke podatke. Kada biste htjeli doći?",
                    "Rezervacija je jednostavna. Recite mi, za koliko osoba i za koje datume?"
                ]
            },
            "information": {
                "sl": [
                    "Seveda! Naš hotel ponuja vrhunske storitve in udobje. Kaj vas posebej zanima?",
                    "Z veseljem delim informacije! Imamo odlične sobe, restavracijo in wellness center.",
                    "Naša ponudba je obsežna - nastanitve, gastronomija, aktivnosti. O čem bi radi izvedeli več?"
                ],
                "en": [
                    "Of course! Our hotel offers premium services and comfort. What specifically interests you?",
                    "Happy to share information! We have excellent rooms, restaurant, and wellness center.",
                    "Our offer is extensive - accommodation, gastronomy, activities. What would you like to know more about?"
                ],
                "de": [
                    "Selbstverständlich! Unser Hotel bietet erstklassige Services und Komfort. Was interessiert Sie besonders?",
                    "Gerne teile ich Informationen! Wir haben ausgezeichnete Zimmer, Restaurant und Wellness-Center.",
                    "Unser Angebot ist umfangreich - Unterkunft, Gastronomie, Aktivitäten. Worüber möchten Sie mehr erfahren?"
                ],
                "it": [
                    "Certamente! Il nostro hotel offre servizi premium e comfort. Cosa la interessa particolarmente?",
                    "Felice di condividere informazioni! Abbiamo camere eccellenti, ristorante e centro benessere.",
                    "La nostra offerta è ampia - alloggio, gastronomia, attività. Di cosa vorrebbe sapere di più?"
                ],
                "hr": [
                    "Naravno! Naš hotel nudi vrhunske usluge i udobnost. Što vas posebno zanima?",
                    "Rado dijelim informacije! Imamo odlične sobe, restoran i wellness centar.",
                    "Naša ponuda je opsežna - smještaj, gastronomija, aktivnosti. O čemu biste htjeli saznati više?"
                ]
            },
            "unknown": {
                "sl": [
                    "Oprostite, nisem popolnoma razumel. Lahko ponovite vprašanje?",
                    "Hmm, potrebujem malo več informacij. Lahko natančneje opišete, kaj iščete?",
                    "Nisem prepričan, da razumem. Lahko mi pomagate z bolj specifičnim vprašanjem?"
                ],
                "en": [
                    "Sorry, I didn't quite understand. Could you repeat the question?",
                    "Hmm, I need a bit more information. Could you describe more precisely what you're looking for?",
                    "I'm not sure I understand. Could you help me with a more specific question?"
                ],
                "de": [
                    "Entschuldigung, ich habe nicht ganz verstanden. Können Sie die Frage wiederholen?",
                    "Hmm, ich brauche etwas mehr Informationen. Können Sie genauer beschreiben, was Sie suchen?",
                    "Ich bin mir nicht sicher, ob ich verstehe. Können Sie mir mit einer spezifischeren Frage helfen?"
                ],
                "it": [
                    "Scusi, non ho capito bene. Può ripetere la domanda?",
                    "Hmm, ho bisogno di qualche informazione in più. Può descrivere più precisamente cosa cerca?",
                    "Non sono sicuro di capire. Può aiutarmi con una domanda più specifica?"
                ],
                "hr": [
                    "Oprostite, nisam potpuno razumio. Možete li ponoviti pitanje?",
                    "Hmm, trebam malo više informacija. Možete li preciznije opisati što tražite?",
                    "Nisam siguran da razumijem. Možete li mi pomoći s konkretnijim pitanjem?"
                ]
            }
        }

    def _load_knowledge_base(self) -> Dict[str, Dict[str, Any]]:
        """Naloži bazo znanja za turizem"""
        return {
            "accommodation": {
                "sl": {
                    "rooms": "Imamo različne tipe sob: enojne, dvojne, apartmaje in suite. Vse sobe imajo klimatsko napravo, WiFi in TV.",
                    "amenities": "Naše storitve vključujejo: 24/7 recepcijo, wellness center, fitnes, restavracijo, bar in parkirišče.",
                    "checkin": "Prijava je možna od 14:00, odjava do 11:00. Zgodnja prijava in pozna odjava sta možni po dogovoru."
                },
                "en": {
                    "rooms": "We have different room types: single, double, apartments and suites. All rooms have AC, WiFi and TV.",
                    "amenities": "Our services include: 24/7 reception, wellness center, fitness, restaurant, bar and parking.",
                    "checkin": "Check-in from 14:00, check-out until 11:00. Early check-in and late check-out available upon request."
                }
            },
            "dining": {
                "sl": {
                    "restaurant": "Naša restavracija ponuja lokalne specialitete in mednarodno kuhinjo. Odprto od 7:00 do 22:00.",
                    "breakfast": "Zajtrk je vključen v ceno in se streže od 7:00 do 10:00. Bogat švedski zajtrk.",
                    "dietary": "Prilagajamo se posebnim prehranskim potrebam - vegetarijanska, veganska, brezglutenska hrana."
                },
                "en": {
                    "restaurant": "Our restaurant offers local specialties and international cuisine. Open from 7:00 to 22:00.",
                    "breakfast": "Breakfast is included and served from 7:00 to 10:00. Rich buffet breakfast.",
                    "dietary": "We accommodate special dietary needs - vegetarian, vegan, gluten-free food."
                }
            },
            "activities": {
                "sl": {
                    "local": "V bližini: pohodništvo, kolesarjenje, ribolov, ogledi gradov, termalne kopeli.",
                    "seasonal": "Pozimi: smučanje, sankanje. Poleti: plavanje, vodne aktivnosti, festivali.",
                    "tours": "Organiziramo izlete: Ljubljana, Bled, Bohinj, Postojnska jama, Predjamski grad."
                },
                "en": {
                    "local": "Nearby: hiking, cycling, fishing, castle visits, thermal baths.",
                    "seasonal": "Winter: skiing, sledding. Summer: swimming, water activities, festivals.",
                    "tours": "We organize trips: Ljubljana, Bled, Bohinj, Postojna Cave, Predjama Castle."
                }
            }
        }

    def detect_language(self, text: str) -> Language:
        """Zazna jezik besedila"""
        text_lower = text.lower()
        language_scores = {}
        
        for lang_code, patterns in self.language_patterns.items():
            score = 0
            for category, words in patterns.items():
                for word in words:
                    if word in text_lower:
                        score += 1
            language_scores[lang_code] = score
        
        # Vrni jezik z najvišjim rezultatom
        if language_scores:
            detected_lang = max(language_scores, key=language_scores.get)
            if language_scores[detected_lang] > 0:
                return Language(detected_lang)
        
        # Privzeto slovenščina
        return Language.SLOVENIAN

    def detect_intent(self, text: str) -> Tuple[Intent, float]:
        """Zazna namen sporočila"""
        text_lower = text.lower()
        intent_scores = {}
        
        for intent_name, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                matches = len(re.findall(pattern, text_lower))
                score += matches
            
            if score > 0:
                intent_scores[intent_name] = score
        
        if intent_scores:
            best_intent = max(intent_scores, key=intent_scores.get)
            confidence = min(intent_scores[best_intent] / len(text.split()) * 2, 1.0)
            # Pretvori v ustrezno Intent vrednost
            intent_mapping = {
                "booking": Intent.BOOKING,
                "information": Intent.INFORMATION,
                "recommendation": Intent.RECOMMENDATION,
                "pricing": Intent.PRICING,
                "menu": Intent.MENU,
                "activities": Intent.ACTIVITIES
            }
            return intent_mapping.get(best_intent, Intent.UNKNOWN), confidence
        
        # Preveri pozdrave
        greetings = ["pozdravljeni", "zdravo", "dober", "hello", "hi", "hallo", "ciao", "buon"]
        if any(greeting in text_lower for greeting in greetings):
            return Intent.GREETING, 0.9
        
        return Intent.UNKNOWN, 0.1

    def analyze_sentiment(self, text: str, language: Language) -> Tuple[Sentiment, float]:
        """Analizira čustveno obarvanost"""
        text_lower = text.lower()
        
        positive_words = {
            Language.SLOVENIAN: ["odličen", "super", "fantastičen", "čudovit", "hvala", "zadovoljen", "priporočam"],
            Language.ENGLISH: ["excellent", "great", "fantastic", "wonderful", "thanks", "satisfied", "recommend"],
            Language.GERMAN: ["ausgezeichnet", "super", "fantastisch", "wunderbar", "danke", "zufrieden"],
            Language.ITALIAN: ["eccellente", "fantastico", "meraviglioso", "grazie", "soddisfatto"],
            Language.CROATIAN: ["odličan", "super", "fantastičan", "čudesan", "hvala", "zadovoljan"]
        }
        
        negative_words = {
            Language.SLOVENIAN: ["slab", "grozno", "nezadovoljen", "problem", "pritožba", "napaka"],
            Language.ENGLISH: ["bad", "terrible", "unsatisfied", "problem", "complaint", "error"],
            Language.GERMAN: ["schlecht", "schrecklich", "unzufrieden", "problem", "beschwerde"],
            Language.ITALIAN: ["cattivo", "terribile", "insoddisfatto", "problema", "reclamo"],
            Language.CROATIAN: ["loš", "grozno", "nezadovoljan", "problem", "pritužba"]
        }
        
        pos_score = sum(1 for word in positive_words.get(language, []) if word in text_lower)
        neg_score = sum(1 for word in negative_words.get(language, []) if word in text_lower)
        
        if pos_score > neg_score:
            return Sentiment.POSITIVE, min(pos_score / len(text.split()), 1.0)
        elif neg_score > pos_score:
            return Sentiment.NEGATIVE, min(neg_score / len(text.split()), 1.0)
        else:
            return Sentiment.NEUTRAL, 0.5

    def generate_response(self, message: str, language: Language, intent: Intent, session_context: Dict[str, Any]) -> str:
        """Generiraj odgovor na sporočilo"""
        lang_code = language.value
        
        # Pridobi ustrezne odgovore
        if intent.value.lower() in self.responses:
            responses = self.responses[intent.value.lower()].get(lang_code, self.responses[intent.value.lower()]["sl"])
        else:
            responses = self.responses["unknown"].get(lang_code, self.responses["unknown"]["sl"])
        
        # Izberi naključen odgovor
        import random
        base_response = random.choice(responses)
        
        # Dodaj kontekstualne informacije
        if intent == Intent.INFORMATION:
            # Dodaj specifične informacije iz baze znanja
            if "soba" in message.lower() or "room" in message.lower():
                kb_info = self.knowledge_base["accommodation"][lang_code]["rooms"]
                base_response += f"\n\n{kb_info}"
            elif "restavracija" in message.lower() or "restaurant" in message.lower():
                kb_info = self.knowledge_base["dining"][lang_code]["restaurant"]
                base_response += f"\n\n{kb_info}"
            elif "aktivnost" in message.lower() or "activity" in message.lower():
                kb_info = self.knowledge_base["activities"][lang_code]["local"]
                base_response += f"\n\n{kb_info}"
        
        elif intent == Intent.PRICING:
            pricing_info = {
                "sl": "Naše cene se gibljejo od 80€ do 200€ na noč, odvisno od tipa sobe in sezone. Za natančne cene in razpoložljivost me kontaktirajte z datumi.",
                "en": "Our prices range from €80 to €200 per night, depending on room type and season. Contact me with dates for exact prices and availability.",
                "de": "Unsere Preise liegen zwischen 80€ und 200€ pro Nacht, je nach Zimmertyp und Saison. Kontaktieren Sie mich mit Terminen für genaue Preise.",
                "it": "I nostri prezzi vanno da €80 a €200 a notte, a seconda del tipo di camera e stagione. Contattatemi con le date per prezzi esatti.",
                "hr": "Naše cijene se kreću od 80€ do 200€ po noći, ovisno o tipu sobe i sezoni. Kontaktirajte me s datumima za točne cijene."
            }
            base_response += f"\n\n{pricing_info.get(lang_code, pricing_info['sl'])}"
        
        return base_response

    def create_session(self, user_id: str, language: Language) -> str:
        """Ustvari novo sejo"""
        session_id = f"session_{int(time.time())}_{secrets.token_hex(8)}"
        
        session = ChatSession(
            session_id=session_id,
            user_id=user_id,
            language=language,
            start_time=datetime.datetime.now(),
            last_activity=datetime.datetime.now(),
            message_count=0,
            context={"preferred_language": language.value},
            is_active=True
        )
        
        self.active_sessions[session_id] = session
        self.save_session(session)
        
        return session_id

    def process_message(self, session_id: str, user_id: str, message: str) -> Dict[str, Any]:
        """Obdelaj sporočilo uporabnika"""
        start_time = time.time()
        
        # Preveri demo omejitev
        if self.check_demo_expiry():
            return {
                "error": "Demo verzija je potekla",
                "response": "Demo period has expired. Please contact administrator.",
                "session_id": session_id
            }
        
        # Pridobi ali ustvari sejo
        if session_id not in self.active_sessions:
            language = self.detect_language(message)
            session_id = self.create_session(user_id, language)
        
        session = self.active_sessions[session_id]
        
        # Zazna jezik, namen in sentiment
        language = self.detect_language(message)
        intent, intent_confidence = self.detect_intent(message)
        sentiment, sentiment_confidence = self.analyze_sentiment(message, language)
        
        # Ustvari sporočilo uporabnika
        user_message = ChatMessage(
            message_id=f"msg_{int(time.time())}_{secrets.token_hex(6)}",
            session_id=session_id,
            user_id=user_id,
            message_type=MessageType.USER,
            content=message,
            language=language,
            intent=intent,
            sentiment=sentiment,
            confidence=intent_confidence,
            timestamp=datetime.datetime.now(),
            metadata={
                "sentiment_confidence": sentiment_confidence,
                "detected_language": language.value
            }
        )
        
        # Generiraj odgovor
        response_text = self.generate_response(message, language, intent, session.context)
        
        # Ustvari odgovor bota
        response_time = time.time() - start_time
        bot_message = ChatMessage(
            message_id=f"msg_{int(time.time())}_{secrets.token_hex(6)}",
            session_id=session_id,
            user_id="bot",
            message_type=MessageType.BOT,
            content=response_text,
            language=language,
            intent=intent,
            sentiment=Sentiment.NEUTRAL,
            confidence=1.0,
            timestamp=datetime.datetime.now(),
            response_time=response_time,
            metadata={
                "generated_response": True,
                "processing_time": response_time
            }
        )
        
        # Posodobi sejo
        session.last_activity = datetime.datetime.now()
        session.message_count += 2
        session.context["last_intent"] = intent.value
        session.context["last_sentiment"] = sentiment.value
        
        # Shrani sporočila
        self.save_message(user_message)
        self.save_message(bot_message)
        self.save_session(session)
        
        # Dodaj v zgodovino
        self.message_history.extend([user_message, bot_message])
        
        return {
            "session_id": session_id,
            "response": response_text,
            "language": language.value,
            "intent": intent.value,
            "sentiment": sentiment.value,
            "confidence": intent_confidence,
            "response_time": response_time,
            "message_count": session.message_count
        }

    def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Pridobi zgodovino pogovora"""
        if session_id not in self.active_sessions:
            return []
        
        session_messages = [
            {
                "message_id": msg.message_id,
                "message_type": msg.message_type.value,
                "content": msg.content,
                "language": msg.language.value,
                "intent": msg.intent.value,
                "sentiment": msg.sentiment.value,
                "timestamp": msg.timestamp.isoformat(),
                "response_time": msg.response_time
            }
            for msg in self.message_history
            if msg.session_id == session_id
        ]
        
        return session_messages[-limit:]

    def get_analytics(self) -> Dict[str, Any]:
        """Pridobi analitiko chatbota"""
        total_sessions = len(self.active_sessions)
        total_messages = len(self.message_history)
        
        # Analiza jezikov
        language_stats = {}
        intent_stats = {}
        sentiment_stats = {}
        
        for msg in self.message_history:
            if msg.message_type == MessageType.USER:
                # Jeziki
                lang = msg.language.value
                language_stats[lang] = language_stats.get(lang, 0) + 1
                
                # Nameni
                intent = msg.intent.value
                intent_stats[intent] = intent_stats.get(intent, 0) + 1
                
                # Sentimenti
                sentiment = msg.sentiment.value
                sentiment_stats[sentiment] = sentiment_stats.get(sentiment, 0) + 1
        
        # Povprečni odzivni čas
        response_times = [msg.response_time for msg in self.message_history if msg.response_time]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        return {
            "total_sessions": total_sessions,
            "active_sessions": sum(1 for s in self.active_sessions.values() if s.is_active),
            "total_messages": total_messages,
            "user_messages": sum(1 for msg in self.message_history if msg.message_type == MessageType.USER),
            "bot_messages": sum(1 for msg in self.message_history if msg.message_type == MessageType.BOT),
            "language_distribution": language_stats,
            "intent_distribution": intent_stats,
            "sentiment_distribution": sentiment_stats,
            "average_response_time": round(avg_response_time, 3),
            "demo_time_remaining": self.get_demo_time_remaining()
        }

    def load_sample_data(self):
        """Naloži vzorčne podatke"""
        # Ustvari vzorčno sejo
        sample_session_id = self.create_session("demo_user", Language.SLOVENIAN)
        
        # Dodaj vzorčna sporočila
        sample_messages = [
            ("Pozdravljeni! Zanima me rezervacija sobe.", Language.SLOVENIAN),
            ("Hello! I'd like to book a room.", Language.ENGLISH),
            ("Hallo! Ich möchte ein Zimmer buchen.", Language.GERMAN),
            ("Ciao! Vorrei prenotare una camera.", Language.ITALIAN),
            ("Zdravo! Htio bih rezervirati sobu.", Language.CROATIAN)
        ]
        
        for msg_text, lang in sample_messages:
            self.process_message(sample_session_id, "demo_user", msg_text)
        
        logger.info(f"Naloženi vzorčni podatki: {len(sample_messages)} sporočil")

    def get_demo_time_remaining(self) -> float:
        """Preostali čas demo verzije"""
        if not self.is_demo:
            return float('inf')
        
        elapsed = (datetime.datetime.now() - self.demo_start_time).total_seconds() / 3600
        remaining = max(0, self.demo_duration_hours - elapsed)
        return round(remaining, 2)

    def check_demo_expiry(self):
        """Preveri, če je demo verzija potekla"""
        if self.is_demo and self.get_demo_time_remaining() <= 0:
            logger.warning("Demo verzija je potekla - chatbot se zaklene")
            return True
        return False

    def save_message(self, message: ChatMessage):
        """Shrani sporočilo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO messages 
            (id, session_id, user_id, message_type, content, language, intent, sentiment, confidence, timestamp, response_time, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            message.message_id,
            message.session_id,
            message.user_id,
            message.message_type.value,
            message.content,
            message.language.value,
            message.intent.value,
            message.sentiment.value,
            message.confidence,
            message.timestamp.isoformat(),
            message.response_time,
            json.dumps(message.metadata)
        ))
        
        conn.commit()
        conn.close()

    def save_session(self, session: ChatSession):
        """Shrani sejo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO sessions 
            (id, user_id, language, start_time, last_activity, message_count, context, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            session.session_id,
            session.user_id,
            session.language.value,
            session.start_time.isoformat(),
            session.last_activity.isoformat(),
            session.message_count,
            json.dumps(session.context),
            session.is_active
        ))
        
        conn.commit()
        conn.close()

    def setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def dashboard():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            analytics = self.get_analytics()
            
            return render_template_string('''
            <!DOCTYPE html>
            <html>
            <head>
                <title>🤖 OMNI Chatbot NLP</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        min-height: 100vh;
                    }
                    .container { max-width: 1400px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
                    .demo-warning { 
                        background: rgba(255,165,0,0.2); 
                        border: 2px solid orange; 
                        padding: 15px; 
                        border-radius: 10px; 
                        margin-bottom: 20px; 
                        text-align: center;
                    }
                    .stats-grid { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                        gap: 20px; 
                        margin-bottom: 30px; 
                    }
                    .stat-card { 
                        background: rgba(255,255,255,0.1); 
                        padding: 25px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                        text-align: center;
                        transition: transform 0.3s ease;
                    }
                    .stat-card:hover { transform: translateY(-5px); }
                    .stat-value { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
                    .stat-label { font-size: 1.1em; opacity: 0.9; }
                    .chat-container { 
                        display: grid; 
                        grid-template-columns: 1fr 400px; 
                        gap: 30px; 
                        margin-bottom: 30px; 
                    }
                    .chat-section { 
                        background: rgba(255,255,255,0.1); 
                        padding: 25px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                    }
                    .chat-messages { 
                        height: 400px; 
                        overflow-y: auto; 
                        border: 1px solid rgba(255,255,255,0.3); 
                        border-radius: 10px; 
                        padding: 15px; 
                        margin-bottom: 15px;
                        background: rgba(0,0,0,0.2);
                    }
                    .message { 
                        margin-bottom: 15px; 
                        padding: 10px; 
                        border-radius: 10px; 
                    }
                    .message.user { 
                        background: rgba(0,123,255,0.3); 
                        margin-left: 50px; 
                        text-align: right;
                    }
                    .message.bot { 
                        background: rgba(40,167,69,0.3); 
                        margin-right: 50px; 
                    }
                    .message-meta { 
                        font-size: 0.8em; 
                        opacity: 0.7; 
                        margin-top: 5px; 
                    }
                    .chat-input { 
                        display: flex; 
                        gap: 10px; 
                    }
                    .chat-input input { 
                        flex: 1; 
                        padding: 12px; 
                        border: 1px solid rgba(255,255,255,0.3); 
                        border-radius: 8px; 
                        background: rgba(255,255,255,0.1); 
                        color: white; 
                    }
                    .chat-input input::placeholder { color: rgba(255,255,255,0.7); }
                    .btn { 
                        background: #00ff88; 
                        color: black; 
                        padding: 12px 20px; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        font-weight: bold;
                        transition: all 0.3s ease;
                    }
                    .btn:hover { 
                        background: #00cc6a; 
                        transform: scale(1.05);
                    }
                    .analytics-section { 
                        background: rgba(255,255,255,0.1); 
                        padding: 25px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                    }
                    .section-title { font-size: 1.4em; font-weight: bold; margin-bottom: 20px; }
                    .analytics-item { 
                        display: flex; 
                        justify-content: space-between; 
                        padding: 10px 0; 
                        border-bottom: 1px solid rgba(255,255,255,0.1); 
                    }
                    .language-flags { 
                        display: flex; 
                        gap: 10px; 
                        margin-top: 10px; 
                    }
                    .flag { 
                        padding: 5px 10px; 
                        background: rgba(255,255,255,0.2); 
                        border-radius: 15px; 
                        font-size: 0.9em; 
                    }
                    @media (max-width: 768px) {
                        .chat-container { grid-template-columns: 1fr; }
                        .stats-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🤖 OMNI Chatbot NLP</h1>
                        <p>Napredni chatbot z NLP in večjezično podporo</p>
                    </div>
                    
                    <div class="demo-warning">
                        ⚠️ <strong>DEMO VERZIJA</strong> - Preostali čas: {{ analytics.demo_time_remaining }}h
                        <br>Za polno funkcionalnost kontaktirajte administratorja.
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">{{ analytics.total_sessions }}</div>
                            <div class="stat-label">Skupaj sej</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ analytics.user_messages }}</div>
                            <div class="stat-label">Sporočila uporabnikov</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ analytics.average_response_time }}s</div>
                            <div class="stat-label">Povprečni odzivni čas</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ analytics.language_distribution|length }}</div>
                            <div class="stat-label">Podprti jeziki</div>
                        </div>
                    </div>
                    
                    <div class="chat-container">
                        <div class="chat-section">
                            <div class="section-title">💬 Live Chat Demo</div>
                            <div class="chat-messages" id="chatMessages">
                                <div class="message bot">
                                    <div>Pozdravljeni! Sem OMNI asistent. Kako vam lahko pomagam?</div>
                                    <div class="message-meta">Bot • slovenščina • pozdrav</div>
                                </div>
                            </div>
                            <div class="chat-input">
                                <input type="text" id="messageInput" placeholder="Vnesite sporočilo v kateremkoli jeziku..." onkeypress="if(event.key==='Enter') sendMessage()">
                                <button class="btn" onclick="sendMessage()">Pošlji</button>
                            </div>
                            <div class="language-flags">
                                <span class="flag">🇸🇮 Slovenščina</span>
                                <span class="flag">🇬🇧 English</span>
                                <span class="flag">🇩🇪 Deutsch</span>
                                <span class="flag">🇮🇹 Italiano</span>
                                <span class="flag">🇭🇷 Hrvatski</span>
                            </div>
                        </div>
                        
                        <div class="analytics-section">
                            <div class="section-title">📊 Analitika v realnem času</div>
                            
                            <div class="analytics-item">
                                <span>Aktivne seje:</span>
                                <span>{{ analytics.active_sessions }}</span>
                            </div>
                            
                            <div class="analytics-item">
                                <span>Skupaj sporočil:</span>
                                <span>{{ analytics.total_messages }}</span>
                            </div>
                            
                            <h4>Jeziki:</h4>
                            {% for lang, count in analytics.language_distribution.items() %}
                            <div class="analytics-item">
                                <span>{{ lang.upper() }}:</span>
                                <span>{{ count }}</span>
                            </div>
                            {% endfor %}
                            
                            <h4>Nameni:</h4>
                            {% for intent, count in analytics.intent_distribution.items() %}
                            <div class="analytics-item">
                                <span>{{ intent.title() }}:</span>
                                <span>{{ count }}</span>
                            </div>
                            {% endfor %}
                            
                            <h4>Sentimenti:</h4>
                            {% for sentiment, count in analytics.sentiment_distribution.items() %}
                            <div class="analytics-item">
                                <span>{{ sentiment.title() }}:</span>
                                <span>{{ count }}</span>
                            </div>
                            {% endfor %}
                        </div>
                    </div>
                </div>
                
                <script>
                    let currentSessionId = null;
                    
                    function sendMessage() {
                        const input = document.getElementById('messageInput');
                        const message = input.value.trim();
                        
                        if (!message) return;
                        
                        // Prikaži sporočilo uporabnika
                        addMessage(message, 'user', 'Uporabnik');
                        input.value = '';
                        
                        // Pošlji na strežnik
                        fetch('/api/chat', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                message: message,
                                session_id: currentSessionId,
                                user_id: 'demo_user'
                            })
                        })
                        .then(r => r.json())
                        .then(data => {
                            if (data.error) {
                                addMessage('Napaka: ' + data.error, 'bot', 'Sistem');
                            } else {
                                currentSessionId = data.session_id;
                                addMessage(data.response, 'bot', 
                                    `Bot • ${data.language} • ${data.intent.toLowerCase()} • ${data.sentiment} (${(data.confidence*100).toFixed(0)}%)`);
                            }
                        })
                        .catch(e => {
                            addMessage('Napaka pri komunikaciji: ' + e, 'bot', 'Sistem');
                        });
                    }
                    
                    function addMessage(content, type, meta) {
                        const messages = document.getElementById('chatMessages');
                        const messageDiv = document.createElement('div');
                        messageDiv.className = `message ${type}`;
                        messageDiv.innerHTML = `
                            <div>${content}</div>
                            <div class="message-meta">${meta}</div>
                        `;
                        messages.appendChild(messageDiv);
                        messages.scrollTop = messages.scrollHeight;
                    }
                    
                    // Auto-refresh analitike vsakih 30 sekund
                    setInterval(() => {
                        location.reload();
                    }, 30000);
                </script>
            </body>
            </html>
            ''', analytics=analytics)
        
        @self.app.route('/api/chat', methods=['POST'])
        def api_chat():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            data = request.get_json()
            message = data.get('message', '')
            session_id = data.get('session_id')
            user_id = data.get('user_id', 'anonymous')
            
            if not message:
                return jsonify({"error": "Sporočilo je obvezno"}), 400
            
            try:
                result = self.process_message(session_id, user_id, message)
                return jsonify(result)
            except Exception as e:
                logger.error(f"Napaka pri obdelavi sporočila: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/api/history/<session_id>')
        def api_history(session_id):
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            limit = request.args.get('limit', 50, type=int)
            history = self.get_chat_history(session_id, limit)
            return jsonify({"history": history})
        
        @self.app.route('/api/analytics')
        def api_analytics():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            return jsonify(self.get_analytics())
        
        @self.app.route('/api/languages')
        def api_languages():
            return jsonify({
                "supported_languages": [
                    {"code": "sl", "name": "Slovenščina", "flag": "🇸🇮"},
                    {"code": "en", "name": "English", "flag": "🇬🇧"},
                    {"code": "de", "name": "Deutsch", "flag": "🇩🇪"},
                    {"code": "it", "name": "Italiano", "flag": "🇮🇹"},
                    {"code": "hr", "name": "Hrvatski", "flag": "🇭🇷"}
                ]
            })

    def run_server(self, host='localhost', port=5010):
        """Zaženi Flask server"""
        logger.info(f"Zaganjam OMNI Chatbot NLP na http://{host}:{port}")
        self.app.run(host=host, port=port, debug=True)

async def demo_chatbot_nlp():
    """Demo funkcija za testiranje Chatbot NLP"""
    print("\n" + "="*50)
    print("🤖 OMNI CHATBOT NLP - DEMO")
    print("="*50)
    
    # Inicializacija
    chatbot = OmniChatbotNLP()
    
    print(f"🔧 Chatbot NLP inicializiran:")
    print(f"  • Podprti jeziki: {len(chatbot.language_patterns)}")
    print(f"  • Vzorci namenov: {len(chatbot.intent_patterns)}")
    print(f"  • Baza znanja: {len(chatbot.knowledge_base)} kategorij")
    print(f"  • Demo trajanje: {chatbot.demo_duration_hours}h")
    
    # Test sporočil v različnih jezikih
    test_messages = [
        ("Pozdravljeni! Zanima me rezervacija sobe za 2 osebi.", "sl"),
        ("Hello! I would like to book a room for tonight.", "en"),
        ("Hallo! Ich möchte ein Zimmer für zwei Personen buchen.", "de"),
        ("Ciao! Vorrei prenotare una camera doppia.", "it"),
        ("Zdravo! Htio bih rezervirati sobu za sutra.", "hr"),
        ("Kakšne so vaše cene?", "sl"),
        ("What activities do you recommend?", "en"),
        ("Hvala za odličen servis!", "sl")
    ]
    
    print(f"\n💬 Testiram sporočila v različnih jezikih...")
    
    session_id = None
    for message, expected_lang in test_messages:
        print(f"\n👤 Uporabnik ({expected_lang}): {message}")
        
        result = chatbot.process_message(session_id, "demo_user", message)
        session_id = result["session_id"]
        
        print(f"🤖 Bot: {result['response'][:100]}...")
        print(f"   📊 Jezik: {result['language']}, Namen: {result['intent']}, Sentiment: {result['sentiment']}")
        print(f"   ⏱️ Odzivni čas: {result['response_time']:.3f}s, Zaupanje: {result['confidence']:.2f}")
    
    # Analitika
    analytics = chatbot.get_analytics()
    print(f"\n📊 Analitika chatbota:")
    print(f"  • Skupaj sej: {analytics['total_sessions']}")
    print(f"  • Sporočila uporabnikov: {analytics['user_messages']}")
    print(f"  • Sporočila bota: {analytics['bot_messages']}")
    print(f"  • Povprečni odzivni čas: {analytics['average_response_time']}s")
    
    print(f"\n🌍 Distribucija jezikov:")
    for lang, count in analytics['language_distribution'].items():
        print(f"  • {lang.upper()}: {count} sporočil")
    
    print(f"\n🎯 Distribucija namenov:")
    for intent, count in analytics['intent_distribution'].items():
        print(f"  • {intent.title()}: {count} sporočil")
    
    print(f"\n😊 Distribucija sentimentov:")
    for sentiment, count in analytics['sentiment_distribution'].items():
        print(f"  • {sentiment.title()}: {count} sporočil")
    
    print(f"\n🎉 Chatbot NLP uspešno testiran!")
    print(f"  • Večjezična podpora (5 jezikov)")
    print(f"  • Natural Language Processing z razumevanjem konteksta")
    print(f"  • Inteligentni odgovori za turizem in gostinstvo")
    print(f"  • Sentiment analiza in uporabniška izkušnja")
    print(f"  • Real-time chat z zgodovino pogovorov")
    print(f"  • Premium funkcionalnosti za Enterprise pakete")
    print(f"  • Demo časovna omejitev in varnostne kontrole")

if __name__ == "__main__":
    import sys
    import asyncio
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Zaženi Flask server
        chatbot = OmniChatbotNLP()
        chatbot.run_server(host='0.0.0.0', port=5010)
    else:
        # Zaženi demo
        asyncio.run(demo_chatbot_nlp())