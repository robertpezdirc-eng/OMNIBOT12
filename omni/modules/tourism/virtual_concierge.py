"""
🤖 Virtual Concierge - Virtualni concierge sistem
AI asistent za goste: odgovori na vprašanja, predlogi izletov, kulinarične izkušnje
"""

import sqlite3
import json
import logging
import requests
import openai
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import re
import random
from collections import defaultdict
import asyncio
import aiohttp
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

logger = logging.getLogger(__name__)

class QueryType(Enum):
    GENERAL_INFO = "general_info"
    RESTAURANT_RECOMMENDATION = "restaurant_recommendation"
    ACTIVITY_SUGGESTION = "activity_suggestion"
    TRANSPORTATION = "transportation"
    LOCAL_ATTRACTIONS = "local_attractions"
    WEATHER = "weather"
    EMERGENCY = "emergency"
    HOTEL_SERVICES = "hotel_services"
    CULTURAL_EVENTS = "cultural_events"
    SHOPPING = "shopping"
    NIGHTLIFE = "nightlife"
    OUTDOOR_ACTIVITIES = "outdoor_activities"

class ResponseType(Enum):
    TEXT = "text"
    STRUCTURED = "structured"
    MULTIMEDIA = "multimedia"
    INTERACTIVE = "interactive"

class ConversationStatus(Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ESCALATED = "escalated"
    WAITING = "waiting"

@dataclass
class GuestQuery:
    """Poizvedba gosta"""
    query_id: str
    guest_id: str
    conversation_id: str
    query_text: str
    query_type: QueryType
    language: str = "sl"
    context: Dict[str, Any] = None
    urgency: int = 1  # 1-5, 5 = urgent
    created_at: datetime = None

@dataclass
class ConciergeResponse:
    """Odgovor concierge-a"""
    response_id: str
    query_id: str
    response_text: str
    response_type: ResponseType
    confidence: float
    structured_data: Dict[str, Any] = None
    multimedia_urls: List[str] = None
    follow_up_suggestions: List[str] = None
    escalation_needed: bool = False
    created_at: datetime = None

@dataclass
class LocalAttraction:
    """Lokalna atrakcija"""
    attraction_id: str
    name: str
    description: str
    category: str
    location: Dict[str, float]  # lat, lng
    distance_km: float
    rating: float
    price_range: str  # €, €€, €€€
    opening_hours: Dict[str, str]
    contact_info: Dict[str, str]
    features: List[str]
    seasonal_availability: List[str]
    recommended_duration: str
    accessibility: List[str]

@dataclass
class Restaurant:
    """Restavracija"""
    restaurant_id: str
    name: str
    cuisine_type: str
    description: str
    location: Dict[str, float]
    distance_km: float
    rating: float
    price_range: str
    opening_hours: Dict[str, str]
    contact_info: Dict[str, str]
    specialties: List[str]
    dietary_options: List[str]
    atmosphere: str
    reservation_required: bool

@dataclass
class Activity:
    """Aktivnost"""
    activity_id: str
    name: str
    description: str
    category: str
    location: Dict[str, float]
    distance_km: float
    duration: str
    difficulty: str
    price: float
    group_size: Dict[str, int]  # min, max
    equipment_needed: List[str]
    seasonal: List[str]
    booking_required: bool
    contact_info: Dict[str, str]

@dataclass
class Conversation:
    """Pogovor z gostom"""
    conversation_id: str
    guest_id: str
    status: ConversationStatus
    language: str
    context: Dict[str, Any]
    queries_count: int = 0
    satisfaction_rating: int = None
    started_at: datetime = None
    last_activity: datetime = None
    ended_at: datetime = None

class VirtualConcierge:
    """Glavni virtualni concierge sistem"""
    
    def __init__(self, db_path: str = "virtual_concierge.db"):
        self.db_path = db_path
        self.openai_api_key = None  # Nastavi API ključ
        self._init_database()
        self._load_local_data()
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela pogovorov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS conversations (
                    conversation_id TEXT PRIMARY KEY,
                    guest_id TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    language TEXT DEFAULT 'sl',
                    context TEXT,
                    queries_count INTEGER DEFAULT 0,
                    satisfaction_rating INTEGER,
                    started_at TEXT NOT NULL,
                    last_activity TEXT NOT NULL,
                    ended_at TEXT
                )
            ''')
            
            # Tabela poizvedb
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS guest_queries (
                    query_id TEXT PRIMARY KEY,
                    guest_id TEXT NOT NULL,
                    conversation_id TEXT NOT NULL,
                    query_text TEXT NOT NULL,
                    query_type TEXT NOT NULL,
                    language TEXT DEFAULT 'sl',
                    context TEXT,
                    urgency INTEGER DEFAULT 1,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES conversations (conversation_id)
                )
            ''')
            
            # Tabela odgovorov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS concierge_responses (
                    response_id TEXT PRIMARY KEY,
                    query_id TEXT NOT NULL,
                    response_text TEXT NOT NULL,
                    response_type TEXT DEFAULT 'text',
                    confidence REAL NOT NULL,
                    structured_data TEXT,
                    multimedia_urls TEXT,
                    follow_up_suggestions TEXT,
                    escalation_needed BOOLEAN DEFAULT FALSE,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (query_id) REFERENCES guest_queries (query_id)
                )
            ''')
            
            # Tabela lokalnih atrakcij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS local_attractions (
                    attraction_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    category TEXT NOT NULL,
                    location TEXT NOT NULL,
                    distance_km REAL,
                    rating REAL DEFAULT 0.0,
                    price_range TEXT,
                    opening_hours TEXT,
                    contact_info TEXT,
                    features TEXT,
                    seasonal_availability TEXT,
                    recommended_duration TEXT,
                    accessibility TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela restavracij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS restaurants (
                    restaurant_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    cuisine_type TEXT NOT NULL,
                    description TEXT,
                    location TEXT NOT NULL,
                    distance_km REAL,
                    rating REAL DEFAULT 0.0,
                    price_range TEXT,
                    opening_hours TEXT,
                    contact_info TEXT,
                    specialties TEXT,
                    dietary_options TEXT,
                    atmosphere TEXT,
                    reservation_required BOOLEAN DEFAULT FALSE,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela aktivnosti
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS activities (
                    activity_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    category TEXT NOT NULL,
                    location TEXT NOT NULL,
                    distance_km REAL,
                    duration TEXT,
                    difficulty TEXT,
                    price REAL DEFAULT 0.0,
                    group_size TEXT,
                    equipment_needed TEXT,
                    seasonal TEXT,
                    booking_required BOOLEAN DEFAULT FALSE,
                    contact_info TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela znanja
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_base (
                    knowledge_id TEXT PRIMARY KEY,
                    category TEXT NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    keywords TEXT,
                    language TEXT DEFAULT 'sl',
                    confidence REAL DEFAULT 1.0,
                    usage_count INTEGER DEFAULT 0,
                    last_used TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            conn.commit()
            logger.info("🤖 Virtual Concierge baza podatkov inicializirana")
    
    def _load_local_data(self):
        """Naloži lokalne podatke"""
        self._load_sample_attractions()
        self._load_sample_restaurants()
        self._load_sample_activities()
        self._load_knowledge_base()
    
    def _load_sample_attractions(self):
        """Naloži vzorčne atrakcije"""
        sample_attractions = [
            {
                "attraction_id": "ATTR_001",
                "name": "Ljubljanski grad",
                "description": "Srednjeveški grad na griču nad Ljubljano z razgledom na mesto",
                "category": "historical",
                "location": {"lat": 46.0489, "lng": 14.5077},
                "distance_km": 2.5,
                "rating": 4.5,
                "price_range": "€€",
                "opening_hours": {"mon-sun": "09:00-21:00"},
                "contact_info": {"phone": "+386 1 306 42 93", "website": "www.ljubljanskigrad.si"},
                "features": ["razgled", "muzej", "restavracija", "trgovina"],
                "seasonal_availability": ["vse leto"],
                "recommended_duration": "2-3 ure",
                "accessibility": ["dostopno invalidom"]
            },
            {
                "attraction_id": "ATTR_002", 
                "name": "Jezero Bled",
                "description": "Alpsko jezero z otokom in gradom na skali",
                "category": "nature",
                "location": {"lat": 46.3683, "lng": 14.1147},
                "distance_km": 55.0,
                "rating": 4.8,
                "price_range": "€",
                "opening_hours": {"mon-sun": "00:00-24:00"},
                "contact_info": {"phone": "+386 4 578 05 00", "website": "www.bled.si"},
                "features": ["jezero", "otok", "grad", "veslanje", "sprehodi"],
                "seasonal_availability": ["vse leto"],
                "recommended_duration": "cel dan",
                "accessibility": ["delno dostopno"]
            },
            {
                "attraction_id": "ATTR_003",
                "name": "Postojnska jama",
                "description": "Svetovno znana kraška jama z jamskim vlakom",
                "category": "nature",
                "location": {"lat": 45.7817, "lng": 14.2145},
                "distance_km": 38.0,
                "rating": 4.6,
                "price_range": "€€€",
                "opening_hours": {"mon-sun": "09:00-18:00"},
                "contact_info": {"phone": "+386 5 700 01 00", "website": "www.postojnska-jama.eu"},
                "features": ["jama", "jamski vlak", "vodeni ogledi"],
                "seasonal_availability": ["vse leto"],
                "recommended_duration": "3-4 ure",
                "accessibility": ["dostopno invalidom"]
            }
        ]
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                for attraction in sample_attractions:
                    cursor.execute('''
                        INSERT OR IGNORE INTO local_attractions 
                        (attraction_id, name, description, category, location, distance_km,
                         rating, price_range, opening_hours, contact_info, features,
                         seasonal_availability, recommended_duration, accessibility, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        attraction["attraction_id"],
                        attraction["name"],
                        attraction["description"],
                        attraction["category"],
                        json.dumps(attraction["location"]),
                        attraction["distance_km"],
                        attraction["rating"],
                        attraction["price_range"],
                        json.dumps(attraction["opening_hours"]),
                        json.dumps(attraction["contact_info"]),
                        json.dumps(attraction["features"]),
                        json.dumps(attraction["seasonal_availability"]),
                        attraction["recommended_duration"],
                        json.dumps(attraction["accessibility"]),
                        datetime.now().isoformat()
                    ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri nalaganju atrakcij: {e}")
    
    def _load_sample_restaurants(self):
        """Naloži vzorčne restavracije"""
        sample_restaurants = [
            {
                "restaurant_id": "REST_001",
                "name": "Gostilna As",
                "cuisine_type": "slovenska",
                "description": "Tradicionalna slovenska kuhinja v srcu Ljubljane",
                "location": {"lat": 46.0514, "lng": 14.5060},
                "distance_km": 1.2,
                "rating": 4.4,
                "price_range": "€€€",
                "opening_hours": {"mon-sat": "12:00-24:00", "sun": "12:00-22:00"},
                "contact_info": {"phone": "+386 1 425 88 22", "website": "www.gostilna-as.si"},
                "specialties": ["jota", "žlikrofi", "potica"],
                "dietary_options": ["vegetarijanske", "veganske"],
                "atmosphere": "tradicionalna",
                "reservation_required": True
            },
            {
                "restaurant_id": "REST_002",
                "name": "Odprta kuhna",
                "cuisine_type": "mednarodna",
                "description": "Sezonski kulinarični festival na prostem",
                "location": {"lat": 46.0514, "lng": 14.5058},
                "distance_km": 1.0,
                "rating": 4.6,
                "price_range": "€€",
                "opening_hours": {"fri": "10:00-21:00", "sat": "10:00-21:00"},
                "contact_info": {"website": "www.odprtakuhna.si"},
                "specialties": ["street food", "lokalni pridelki", "craft pivo"],
                "dietary_options": ["vegetarijanske", "veganske", "brez glutena"],
                "atmosphere": "sproščena",
                "reservation_required": False
            },
            {
                "restaurant_id": "REST_003",
                "name": "Hiša Franko",
                "cuisine_type": "fine dining",
                "description": "Michelin zvezdica, Ana Roš, inovativna kuhinja",
                "location": {"lat": 46.2394, "lng": 13.5583},
                "distance_km": 85.0,
                "rating": 4.9,
                "price_range": "€€€€",
                "opening_hours": {"wed-sun": "19:00-22:00"},
                "contact_info": {"phone": "+386 5 389 40 20", "website": "www.hisafranko.com"},
                "specialties": ["degustacijski meni", "lokalni sestavine", "vino pairing"],
                "dietary_options": ["vegetarijanske po dogovoru"],
                "atmosphere": "ekskluzivna",
                "reservation_required": True
            }
        ]
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                for restaurant in sample_restaurants:
                    cursor.execute('''
                        INSERT OR IGNORE INTO restaurants 
                        (restaurant_id, name, cuisine_type, description, location, distance_km,
                         rating, price_range, opening_hours, contact_info, specialties,
                         dietary_options, atmosphere, reservation_required, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        restaurant["restaurant_id"],
                        restaurant["name"],
                        restaurant["cuisine_type"],
                        restaurant["description"],
                        json.dumps(restaurant["location"]),
                        restaurant["distance_km"],
                        restaurant["rating"],
                        restaurant["price_range"],
                        json.dumps(restaurant["opening_hours"]),
                        json.dumps(restaurant["contact_info"]),
                        json.dumps(restaurant["specialties"]),
                        json.dumps(restaurant["dietary_options"]),
                        restaurant["atmosphere"],
                        restaurant["reservation_required"],
                        datetime.now().isoformat()
                    ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri nalaganju restavracij: {e}")
    
    def _load_sample_activities(self):
        """Naloži vzorčne aktivnosti"""
        sample_activities = [
            {
                "activity_id": "ACT_001",
                "name": "Vožnja z ladjico po Ljubljanici",
                "description": "Sproščena vožnja po reki skozi center Ljubljane",
                "category": "sightseeing",
                "location": {"lat": 46.0514, "lng": 14.5058},
                "distance_km": 0.5,
                "duration": "1 ura",
                "difficulty": "lahka",
                "price": 12.0,
                "group_size": {"min": 1, "max": 50},
                "equipment_needed": [],
                "seasonal": ["april-oktober"],
                "booking_required": False,
                "contact_info": {"phone": "+386 41 710 710", "website": "www.ljubljanica.si"}
            },
            {
                "activity_id": "ACT_002",
                "name": "Pohodništvo na Triglav",
                "description": "Vzpon na najvišji vrh Slovenije",
                "category": "hiking",
                "location": {"lat": 46.3787, "lng": 13.8364},
                "distance_km": 75.0,
                "duration": "2 dni",
                "difficulty": "zahtevna",
                "price": 0.0,
                "group_size": {"min": 2, "max": 8},
                "equipment_needed": ["planinska oprema", "čelada", "samovarovalna oprema"],
                "seasonal": ["junij-september"],
                "booking_required": True,
                "contact_info": {"phone": "+386 4 588 19 30", "website": "www.pzs.si"}
            },
            {
                "activity_id": "ACT_003",
                "name": "Degustacija vin v Vipavski dolini",
                "description": "Obisk vinskih kleti in degustacija lokalnih vin",
                "category": "wine_tasting",
                "location": {"lat": 45.8833, "lng": 13.9667},
                "distance_km": 65.0,
                "duration": "pol dneva",
                "difficulty": "lahka",
                "price": 35.0,
                "group_size": {"min": 4, "max": 12},
                "equipment_needed": [],
                "seasonal": ["vse leto"],
                "booking_required": True,
                "contact_info": {"phone": "+386 5 368 70 56", "website": "www.vipavskadolina.si"}
            }
        ]
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                for activity in sample_activities:
                    cursor.execute('''
                        INSERT OR IGNORE INTO activities 
                        (activity_id, name, description, category, location, distance_km,
                         duration, difficulty, price, group_size, equipment_needed,
                         seasonal, booking_required, contact_info, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        activity["activity_id"],
                        activity["name"],
                        activity["description"],
                        activity["category"],
                        json.dumps(activity["location"]),
                        activity["distance_km"],
                        activity["duration"],
                        activity["difficulty"],
                        activity["price"],
                        json.dumps(activity["group_size"]),
                        json.dumps(activity["equipment_needed"]),
                        json.dumps(activity["seasonal"]),
                        activity["booking_required"],
                        json.dumps(activity["contact_info"]),
                        datetime.now().isoformat()
                    ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri nalaganju aktivnosti: {e}")
    
    def _load_knowledge_base(self):
        """Naloži bazo znanja"""
        knowledge_items = [
            {
                "category": "hotel_services",
                "question": "Kdaj je check-in in check-out?",
                "answer": "Check-in je možen od 15:00 naprej, check-out pa do 11:00. Za zgodnji check-in ali pozni check-out se obrnite na recepcijo.",
                "keywords": ["check-in", "check-out", "ura", "čas"]
            },
            {
                "category": "hotel_services", 
                "question": "Ali imate WiFi?",
                "answer": "Da, brezplačen WiFi je na voljo v vseh sobah in javnih prostorih. Geslo: HotelGuest2024",
                "keywords": ["wifi", "internet", "geslo", "brezplačen"]
            },
            {
                "category": "transportation",
                "question": "Kako pridem do letališča?",
                "answer": "Do letališča Jožeta Pučnika Ljubljana je 25 km. Možnosti: avtobusna povezava (45 min), taksi (25 min, ~25€), najem avtomobila.",
                "keywords": ["letališče", "transport", "avtobusna", "taksi"]
            },
            {
                "category": "local_attractions",
                "question": "Kaj si lahko ogledam v Ljubljani?",
                "answer": "Priporočamo: Ljubljanski grad, Tromostovje, Prešernov trg, Tivoli park, Metelkova, Odprto kuhno (petek/sobota).",
                "keywords": ["ljubljana", "ogledi", "atrakcije", "znamenitosti"]
            },
            {
                "category": "weather",
                "question": "Kakšno je vreme?",
                "answer": "Trenutno vreme lahko preverite na ARSO (www.arso.gov.si) ali pa vam pomagam z napovedjo za naslednje dni.",
                "keywords": ["vreme", "napoved", "temperatura", "dež"]
            },
            {
                "category": "emergency",
                "question": "Kje je najbližja bolnišnica?",
                "answer": "Najbližji zdravstveni dom je 500m stran na Trubarjevi 9. UKC Ljubljana je 2km stran. Nujna pomoč: 112",
                "keywords": ["bolnišnica", "zdravnik", "nujna pomoč", "112"]
            }
        ]
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                for item in knowledge_items:
                    knowledge_id = f"KB_{item['category'].upper()}_{len(item['question'])}"
                    
                    cursor.execute('''
                        INSERT OR IGNORE INTO knowledge_base 
                        (knowledge_id, category, question, answer, keywords, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        knowledge_id,
                        item["category"],
                        item["question"],
                        item["answer"],
                        json.dumps(item["keywords"]),
                        datetime.now().isoformat()
                    ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri nalaganju baze znanja: {e}")
    
    def start_conversation(self, guest_id: str, language: str = "sl") -> Dict[str, Any]:
        """Začni pogovor z gostom"""
        try:
            conversation_id = f"CONV_{guest_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            conversation = Conversation(
                conversation_id=conversation_id,
                guest_id=guest_id,
                status=ConversationStatus.ACTIVE,
                language=language,
                context={},
                started_at=datetime.now(),
                last_activity=datetime.now()
            )
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO conversations 
                    (conversation_id, guest_id, status, language, context, 
                     started_at, last_activity)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    conversation.conversation_id,
                    conversation.guest_id,
                    conversation.status.value,
                    conversation.language,
                    json.dumps(conversation.context),
                    conversation.started_at.isoformat(),
                    conversation.last_activity.isoformat()
                ))
                
                conn.commit()
            
            welcome_message = self._get_welcome_message(language)
            
            return {
                "success": True,
                "conversation_id": conversation_id,
                "welcome_message": welcome_message,
                "available_topics": [
                    "Lokalne atrakcije in znamenitosti",
                    "Restavracije in kulinarika", 
                    "Aktivnosti in izleti",
                    "Transport in navodila",
                    "Hotelske storitve",
                    "Vreme in praktične informacije"
                ]
            }
            
        except Exception as e:
            logger.error(f"Napaka pri začenjanju pogovora: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_welcome_message(self, language: str) -> str:
        """Pridobi pozdravno sporočilo"""
        messages = {
            "sl": """
🤖 Pozdravljeni! Jaz sem vaš virtualni concierge.

Pomagam vam lahko z:
• 🏛️ Predlogi lokalnih atrakcij in znamenitosti
• 🍽️ Priporočili restavracij in kulinaričnih izkušenj  
• 🚶 Idejami za aktivnosti in izlete
• 🚌 Informacijami o transportu in navodili za pot
• 🏨 Hotelskimi storitvami in informacijami
• 🌤️ Vremenom in praktičnimi nasveti

Kako vam lahko pomagam danes?
            """,
            "en": """
🤖 Welcome! I'm your virtual concierge.

I can help you with:
• 🏛️ Local attractions and sightseeing suggestions
• 🍽️ Restaurant recommendations and culinary experiences
• 🚶 Activity and excursion ideas
• 🚌 Transportation information and directions
• 🏨 Hotel services and information
• 🌤️ Weather and practical tips

How can I help you today?
            """
        }
        
        return messages.get(language, messages["sl"])
    
    def process_query(self, conversation_id: str, query_text: str) -> Dict[str, Any]:
        """Obdelaj poizvedbo gosta"""
        try:
            # Pridobi pogovor
            conversation = self._get_conversation(conversation_id)
            if not conversation:
                return {"success": False, "error": "Pogovor ni najden"}
            
            # Analiziraj poizvedbo
            query_analysis = self._analyze_query(query_text, conversation.language)
            
            # Ustvari poizvedbo
            query = GuestQuery(
                query_id=f"QUERY_{conversation_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                guest_id=conversation.guest_id,
                conversation_id=conversation_id,
                query_text=query_text,
                query_type=query_analysis["type"],
                language=conversation.language,
                context=query_analysis["context"],
                urgency=query_analysis["urgency"],
                created_at=datetime.now()
            )
            
            # Shrani poizvedbo
            self._save_query(query)
            
            # Generiraj odgovor
            response = self._generate_response(query, conversation)
            
            # Shrani odgovor
            self._save_response(response)
            
            # Posodobi pogovor
            self._update_conversation(conversation_id)
            
            return {
                "success": True,
                "query_id": query.query_id,
                "response": {
                    "text": response.response_text,
                    "type": response.response_type.value,
                    "confidence": response.confidence,
                    "structured_data": response.structured_data,
                    "multimedia_urls": response.multimedia_urls,
                    "follow_up_suggestions": response.follow_up_suggestions,
                    "escalation_needed": response.escalation_needed
                },
                "query_type": query.query_type.value
            }
            
        except Exception as e:
            logger.error(f"Napaka pri obdelavi poizvedbe: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Pridobi pogovor"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM conversations WHERE conversation_id = ?
                ''', (conversation_id,))
                
                result = cursor.fetchone()
                if not result:
                    return None
                
                return Conversation(
                    conversation_id=result[0],
                    guest_id=result[1],
                    status=ConversationStatus(result[2]),
                    language=result[3],
                    context=json.loads(result[4]) if result[4] else {},
                    queries_count=result[5],
                    satisfaction_rating=result[6],
                    started_at=datetime.fromisoformat(result[7]),
                    last_activity=datetime.fromisoformat(result[8]),
                    ended_at=datetime.fromisoformat(result[9]) if result[9] else None
                )
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju pogovora: {e}")
            return None
    
    def _analyze_query(self, query_text: str, language: str) -> Dict[str, Any]:
        """Analiziraj poizvedbo"""
        query_lower = query_text.lower()
        
        # Določi tip poizvedbe na podlagi ključnih besed
        query_type = QueryType.GENERAL_INFO
        urgency = 1
        context = {}
        
        # Restavracije in hrana
        if any(word in query_lower for word in ["restavracija", "hrana", "jesti", "restaurant", "food", "eat", "kuhinja", "meni"]):
            query_type = QueryType.RESTAURANT_RECOMMENDATION
            context["preferences"] = self._extract_food_preferences(query_text)
        
        # Aktivnosti in izleti
        elif any(word in query_lower for word in ["aktivnost", "izlet", "activity", "excursion", "početi", "obiskati", "videti"]):
            query_type = QueryType.ACTIVITY_SUGGESTION
            context["interests"] = self._extract_activity_interests(query_text)
        
        # Transport
        elif any(word in query_lower for word in ["transport", "avtobus", "vlak", "taksi", "letališče", "airport", "bus", "train"]):
            query_type = QueryType.TRANSPORTATION
            context["destination"] = self._extract_destination(query_text)
        
        # Lokalne atrakcije
        elif any(word in query_lower for word in ["atrakcija", "znamenitost", "grad", "muzej", "attraction", "sightseeing", "castle"]):
            query_type = QueryType.LOCAL_ATTRACTIONS
            context["category"] = self._extract_attraction_category(query_text)
        
        # Vreme
        elif any(word in query_lower for word in ["vreme", "weather", "temperatura", "dež", "sonce", "sneg"]):
            query_type = QueryType.WEATHER
        
        # Nujno
        elif any(word in query_lower for word in ["nujna pomoč", "emergency", "bolnišnica", "hospital", "zdravnik", "doctor"]):
            query_type = QueryType.EMERGENCY
            urgency = 5
        
        # Hotelske storitve
        elif any(word in query_lower for word in ["hotel", "soba", "room", "recepcija", "reception", "storitev", "service"]):
            query_type = QueryType.HOTEL_SERVICES
        
        # Nakupovanje
        elif any(word in query_lower for word in ["nakupovanje", "shopping", "trgovina", "shop", "center", "mall"]):
            query_type = QueryType.SHOPPING
        
        # Nočno življenje
        elif any(word in query_lower for word in ["bar", "klub", "nightlife", "zabava", "party", "glasba", "music"]):
            query_type = QueryType.NIGHTLIFE
        
        return {
            "type": query_type,
            "urgency": urgency,
            "context": context,
            "keywords": self._extract_keywords(query_text)
        }
    
    def _extract_food_preferences(self, query_text: str) -> List[str]:
        """Izvleci prehranske preference"""
        preferences = []
        query_lower = query_text.lower()
        
        cuisine_types = {
            "slovenska": ["slovenska", "tradicionalna", "domača"],
            "italijanska": ["italijanska", "pizza", "pasta", "italian"],
            "azijska": ["azijska", "kitajska", "japonska", "sushi", "asian"],
            "vegetarijanska": ["vegetarijanska", "vegetarian", "veganska", "vegan"],
            "fine dining": ["fine dining", "michelin", "ekskluzivna", "gourmet"]
        }
        
        for cuisine, keywords in cuisine_types.items():
            if any(keyword in query_lower for keyword in keywords):
                preferences.append(cuisine)
        
        return preferences
    
    def _extract_activity_interests(self, query_text: str) -> List[str]:
        """Izvleci interese za aktivnosti"""
        interests = []
        query_lower = query_text.lower()
        
        activity_types = {
            "narava": ["narava", "nature", "pohodništvo", "hiking", "gozd", "jezero"],
            "kultura": ["kultura", "culture", "muzej", "galerija", "zgodovina", "history"],
            "šport": ["šport", "sport", "kolesarjenje", "plavanje", "tenis", "golf"],
            "wellness": ["wellness", "spa", "masaža", "sproščanje", "relax"],
            "družina": ["družina", "family", "otroci", "children", "kids"]
        }
        
        for activity, keywords in activity_types.items():
            if any(keyword in query_lower for keyword in keywords):
                interests.append(activity)
        
        return interests
    
    def _extract_destination(self, query_text: str) -> Optional[str]:
        """Izvleci destinacijo"""
        destinations = ["letališče", "airport", "ljubljana", "bled", "postojna", "koper", "maribor"]
        query_lower = query_text.lower()
        
        for dest in destinations:
            if dest in query_lower:
                return dest
        
        return None
    
    def _extract_attraction_category(self, query_text: str) -> Optional[str]:
        """Izvleci kategorijo atrakcije"""
        categories = {
            "historical": ["grad", "castle", "zgodovina", "history", "cerkev", "church"],
            "nature": ["narava", "nature", "park", "jezero", "lake", "gora", "mountain"],
            "cultural": ["muzej", "museum", "galerija", "gallery", "kultura", "culture"]
        }
        
        query_lower = query_text.lower()
        
        for category, keywords in categories.items():
            if any(keyword in query_lower for keyword in keywords):
                return category
        
        return None
    
    def _extract_keywords(self, query_text: str) -> List[str]:
        """Izvleci ključne besede"""
        # Preprosta ekstrakcija ključnih besed
        stop_words = {"in", "ali", "je", "so", "na", "za", "z", "s", "v", "o", "do", "od", "pri", "po", "and", "or", "is", "are", "the", "a", "an", "to", "for", "with", "at", "by"}
        
        words = re.findall(r'\b\w+\b', query_text.lower())
        keywords = [word for word in words if len(word) > 2 and word not in stop_words]
        
        return keywords[:10]  # Omejimo na 10 ključnih besed
    
    def _generate_response(self, query: GuestQuery, conversation: Conversation) -> ConciergeResponse:
        """Generiraj odgovor"""
        response_id = f"RESP_{query.query_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Poskusi najti odgovor v bazi znanja
        kb_response = self._search_knowledge_base(query)
        
        if kb_response and kb_response["confidence"] > 0.7:
            return ConciergeResponse(
                response_id=response_id,
                query_id=query.query_id,
                response_text=kb_response["answer"],
                response_type=ResponseType.TEXT,
                confidence=kb_response["confidence"],
                follow_up_suggestions=kb_response.get("follow_up", []),
                created_at=datetime.now()
            )
        
        # Generiraj odgovor glede na tip poizvedbe
        if query.query_type == QueryType.RESTAURANT_RECOMMENDATION:
            return self._generate_restaurant_response(query, response_id)
        
        elif query.query_type == QueryType.ACTIVITY_SUGGESTION:
            return self._generate_activity_response(query, response_id)
        
        elif query.query_type == QueryType.LOCAL_ATTRACTIONS:
            return self._generate_attraction_response(query, response_id)
        
        elif query.query_type == QueryType.TRANSPORTATION:
            return self._generate_transport_response(query, response_id)
        
        elif query.query_type == QueryType.WEATHER:
            return self._generate_weather_response(query, response_id)
        
        elif query.query_type == QueryType.EMERGENCY:
            return self._generate_emergency_response(query, response_id)
        
        else:
            return self._generate_general_response(query, response_id)
    
    def _search_knowledge_base(self, query: GuestQuery) -> Optional[Dict[str, Any]]:
        """Poišči v bazi znanja"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Poišči po ključnih besedah
                keywords = query.context.get("keywords", [])
                
                if keywords:
                    # Ustvari SQL poizvedbo za iskanje po ključnih besedah
                    keyword_conditions = []
                    params = []
                    
                    for keyword in keywords:
                        keyword_conditions.append("(question LIKE ? OR answer LIKE ? OR keywords LIKE ?)")
                        params.extend([f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"])
                    
                    sql = f'''
                        SELECT question, answer, confidence, keywords
                        FROM knowledge_base 
                        WHERE language = ? AND ({" OR ".join(keyword_conditions)})
                        ORDER BY confidence DESC, usage_count DESC
                        LIMIT 3
                    '''
                    
                    params.insert(0, query.language)
                    cursor.execute(sql, params)
                    
                    results = cursor.fetchall()
                    
                    if results:
                        best_match = results[0]
                        
                        # Posodobi uporabo
                        cursor.execute('''
                            UPDATE knowledge_base 
                            SET usage_count = usage_count + 1, last_used = ?
                            WHERE question = ? AND answer = ?
                        ''', (datetime.now().isoformat(), best_match[0], best_match[1]))
                        
                        conn.commit()
                        
                        return {
                            "answer": best_match[1],
                            "confidence": best_match[2],
                            "follow_up": []
                        }
                
                return None
                
        except Exception as e:
            logger.error(f"Napaka pri iskanju v bazi znanja: {e}")
            return None
    
    def _generate_restaurant_response(self, query: GuestQuery, response_id: str) -> ConciergeResponse:
        """Generiraj odgovor za restavracije"""
        try:
            preferences = query.context.get("preferences", [])
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Poišči restavracije
                if preferences:
                    # Filtriraj po preferencah
                    conditions = []
                    params = []
                    
                    for pref in preferences:
                        conditions.append("(cuisine_type LIKE ? OR specialties LIKE ?)")
                        params.extend([f"%{pref}%", f"%{pref}%"])
                    
                    sql = f'''
                        SELECT * FROM restaurants 
                        WHERE {" OR ".join(conditions)}
                        ORDER BY rating DESC, distance_km ASC
                        LIMIT 3
                    '''
                    
                    cursor.execute(sql, params)
                else:
                    # Priporoči najboljše restavracije
                    cursor.execute('''
                        SELECT * FROM restaurants 
                        ORDER BY rating DESC, distance_km ASC
                        LIMIT 3
                    ''')
                
                results = cursor.fetchall()
                
                if results:
                    response_text = "🍽️ **Priporočila restavracij:**\n\n"
                    structured_data = {"restaurants": []}
                    
                    for result in results:
                        restaurant_data = {
                            "name": result[1],
                            "cuisine_type": result[2],
                            "description": result[3],
                            "rating": result[6],
                            "price_range": result[7],
                            "distance_km": result[5],
                            "contact_info": json.loads(result[9]) if result[9] else {}
                        }
                        
                        structured_data["restaurants"].append(restaurant_data)
                        
                        response_text += f"**{result[1]}** ({result[2]})\n"
                        response_text += f"📍 {result[5]}km stran | ⭐ {result[6]}/5 | {result[7]}\n"
                        response_text += f"{result[3]}\n"
                        
                        if result[9]:
                            contact = json.loads(result[9])
                            if "phone" in contact:
                                response_text += f"📞 {contact['phone']}\n"
                        
                        response_text += "\n"
                    
                    follow_up = [
                        "Potrebujete rezervacijo?",
                        "Vas zanima še kaj drugega o kulinariki?",
                        "Želite informacije o transportu do restavracije?"
                    ]
                    
                    return ConciergeResponse(
                        response_id=response_id,
                        query_id=query.query_id,
                        response_text=response_text,
                        response_type=ResponseType.STRUCTURED,
                        confidence=0.9,
                        structured_data=structured_data,
                        follow_up_suggestions=follow_up,
                        created_at=datetime.now()
                    )
                
                else:
                    return ConciergeResponse(
                        response_id=response_id,
                        query_id=query.query_id,
                        response_text="Oprostite, trenutno nimam priporočil restavracij, ki bi ustrezala vašim preferencam. Lahko se obrnete na recepcijo za dodatne informacije.",
                        response_type=ResponseType.TEXT,
                        confidence=0.3,
                        escalation_needed=True,
                        created_at=datetime.now()
                    )
                
        except Exception as e:
            logger.error(f"Napaka pri generiranju odgovora za restavracije: {e}")
            return self._generate_error_response(query, response_id)
    
    def _generate_activity_response(self, query: GuestQuery, response_id: str) -> ConciergeResponse:
        """Generiraj odgovor za aktivnosti"""
        try:
            interests = query.context.get("interests", [])
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Poišči aktivnosti
                if interests:
                    conditions = []
                    params = []
                    
                    for interest in interests:
                        conditions.append("(category LIKE ? OR description LIKE ?)")
                        params.extend([f"%{interest}%", f"%{interest}%"])
                    
                    sql = f'''
                        SELECT * FROM activities 
                        WHERE {" OR ".join(conditions)}
                        ORDER BY distance_km ASC
                        LIMIT 3
                    '''
                    
                    cursor.execute(sql, params)
                else:
                    cursor.execute('''
                        SELECT * FROM activities 
                        ORDER BY distance_km ASC
                        LIMIT 3
                    ''')
                
                results = cursor.fetchall()
                
                if results:
                    response_text = "🚶 **Priporočila aktivnosti:**\n\n"
                    structured_data = {"activities": []}
                    
                    for result in results:
                        activity_data = {
                            "name": result[1],
                            "description": result[2],
                            "category": result[3],
                            "duration": result[6],
                            "difficulty": result[7],
                            "price": result[8],
                            "distance_km": result[5]
                        }
                        
                        structured_data["activities"].append(activity_data)
                        
                        response_text += f"**{result[1]}** ({result[3]})\n"
                        response_text += f"📍 {result[5]}km | ⏱️ {result[6]} | 💪 {result[7]}\n"
                        
                        if result[8] > 0:
                            response_text += f"💰 {result[8]}€\n"
                        else:
                            response_text += "💰 Brezplačno\n"
                        
                        response_text += f"{result[2]}\n\n"
                    
                    follow_up = [
                        "Potrebujete rezervacijo?",
                        "Vas zanima transport do lokacije?",
                        "Želite več informacij o opremi?"
                    ]
                    
                    return ConciergeResponse(
                        response_id=response_id,
                        query_id=query.query_id,
                        response_text=response_text,
                        response_type=ResponseType.STRUCTURED,
                        confidence=0.9,
                        structured_data=structured_data,
                        follow_up_suggestions=follow_up,
                        created_at=datetime.now()
                    )
                
                else:
                    return ConciergeResponse(
                        response_id=response_id,
                        query_id=query.query_id,
                        response_text="Trenutno nimam priporočil aktivnosti, ki bi ustrezala vašim interesom. Obrnite se na recepcijo za dodatne možnosti.",
                        response_type=ResponseType.TEXT,
                        confidence=0.3,
                        escalation_needed=True,
                        created_at=datetime.now()
                    )
                
        except Exception as e:
            logger.error(f"Napaka pri generiranju odgovora za aktivnosti: {e}")
            return self._generate_error_response(query, response_id)
    
    def _generate_attraction_response(self, query: GuestQuery, response_id: str) -> ConciergeResponse:
        """Generiraj odgovor za atrakcije"""
        try:
            category = query.context.get("category")
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if category:
                    cursor.execute('''
                        SELECT * FROM local_attractions 
                        WHERE category = ?
                        ORDER BY rating DESC, distance_km ASC
                        LIMIT 3
                    ''', (category,))
                else:
                    cursor.execute('''
                        SELECT * FROM local_attractions 
                        ORDER BY rating DESC, distance_km ASC
                        LIMIT 3
                    ''')
                
                results = cursor.fetchall()
                
                if results:
                    response_text = "🏛️ **Priporočila atrakcij:**\n\n"
                    structured_data = {"attractions": []}
                    
                    for result in results:
                        attraction_data = {
                            "name": result[1],
                            "description": result[2],
                            "category": result[3],
                            "rating": result[6],
                            "price_range": result[7],
                            "distance_km": result[5],
                            "recommended_duration": result[12]
                        }
                        
                        structured_data["attractions"].append(attraction_data)
                        
                        response_text += f"**{result[1]}** ({result[3]})\n"
                        response_text += f"📍 {result[5]}km | ⭐ {result[6]}/5 | {result[7]}\n"
                        response_text += f"⏱️ Priporočen čas: {result[12]}\n"
                        response_text += f"{result[2]}\n\n"
                    
                    follow_up = [
                        "Potrebujete navodila za pot?",
                        "Vas zanimajo urniki obiskov?",
                        "Želite informacije o vstopninah?"
                    ]
                    
                    return ConciergeResponse(
                        response_id=response_id,
                        query_id=query.query_id,
                        response_text=response_text,
                        response_type=ResponseType.STRUCTURED,
                        confidence=0.9,
                        structured_data=structured_data,
                        follow_up_suggestions=follow_up,
                        created_at=datetime.now()
                    )
                
                else:
                    return ConciergeResponse(
                        response_id=response_id,
                        query_id=query.query_id,
                        response_text="Trenutno nimam informacij o atrakcijah v tej kategoriji. Obrnite se na recepcijo za dodatne informacije.",
                        response_type=ResponseType.TEXT,
                        confidence=0.3,
                        escalation_needed=True,
                        created_at=datetime.now()
                    )
                
        except Exception as e:
            logger.error(f"Napaka pri generiranju odgovora za atrakcije: {e}")
            return self._generate_error_response(query, response_id)
    
    def _generate_transport_response(self, query: GuestQuery, response_id: str) -> ConciergeResponse:
        """Generiraj odgovor za transport"""
        destination = query.context.get("destination", "").lower()
        
        transport_info = {
            "letališče": {
                "name": "Letališče Jožeta Pučnika Ljubljana",
                "distance": "25 km",
                "options": [
                    {"type": "Avtobusna povezava", "duration": "45 min", "price": "4.10€", "frequency": "vsako uro"},
                    {"type": "Taksi", "duration": "25 min", "price": "~25€", "note": "24/7 na voljo"},
                    {"type": "Najem avtomobila", "duration": "25 min", "price": "od 20€/dan", "note": "Rezervacija priporočena"}
                ]
            },
            "ljubljana": {
                "name": "Center Ljubljane",
                "distance": "2 km",
                "options": [
                    {"type": "Peš", "duration": "20 min", "price": "Brezplačno", "note": "Prijetna sprehajalna pot"},
                    {"type": "Mestni avtobus", "duration": "10 min", "price": "1.30€", "frequency": "vsakih 15 min"},
                    {"type": "Taksi", "duration": "5 min", "price": "~8€", "note": "Hitro in udobno"}
                ]
            }
        }
        
        if destination in transport_info:
            info = transport_info[destination]
            response_text = f"🚌 **Transport do: {info['name']}**\n"
            response_text += f"📍 Razdalja: {info['distance']}\n\n"
            
            for option in info['options']:
                response_text += f"**{option['type']}**\n"
                response_text += f"⏱️ {option['duration']} | 💰 {option['price']}\n"
                if 'frequency' in option:
                    response_text += f"🔄 {option['frequency']}\n"
                if 'note' in option:
                    response_text += f"ℹ️ {option['note']}\n"
                response_text += "\n"
            
            structured_data = {"destination": info}
            
        else:
            response_text = """🚌 **Splošne informacije o transportu:**

**Javni promet Ljubljana:**
• Mestni avtobusi: 1.30€ (Urbana kartica)
• Obratovanje: 05:00 - 23:00

**Taksi službe:**
• Taxi Ljubljana: +386 1 9700
• 24/7 na voljo

**Najem avtomobilov:**
• Hertz, Avis, Europcar
• Lokacije: letališče, center

**Vlaki:**
• Železniška postaja Ljubljana: 1.5km
• Povezave po Sloveniji in Evropi
            """
            structured_data = {"general_transport": True}
        
        follow_up = [
            "Potrebujete rezervacijo?",
            "Vas zanimajo urniki?",
            "Želite kontaktne informacije?"
        ]
        
        return ConciergeResponse(
            response_id=response_id,
            query_id=query.query_id,
            response_text=response_text,
            response_type=ResponseType.STRUCTURED,
            confidence=0.8,
            structured_data=structured_data,
            follow_up_suggestions=follow_up,
            created_at=datetime.now()
        )
    
    def _generate_weather_response(self, query: GuestQuery, response_id: str) -> ConciergeResponse:
        """Generiraj odgovor za vreme"""
        # V produkciji bi tukaj klical pravi vremenska API
        response_text = """🌤️ **Vremenska napoved:**

**Danes:**
• Temperatura: 18-24°C
• Delno oblačno z občasnimi padavinami
• Veter: šibak, južni

**Jutri:**
• Temperatura: 16-22°C  
• Spremenljivo oblačno
• Možnost kratkotrajnih nalivov

**Priporočila:**
• Vzemite dežnik za vsak slučaj
• Oblecite se v plasteh
• Idealno vreme za muzeje in notranje aktivnosti

**Aktualne informacije:**
• ARSO: www.arso.gov.si
• Aplikacija: ARSO vreme
        """
        
        follow_up = [
            "Vas zanimajo aktivnosti za to vreme?",
            "Potrebujete priporočila oblačil?",
            "Želite informacije o notranjih aktivnostih?"
        ]
        
        return ConciergeResponse(
            response_id=response_id,
            query_id=query.query_id,
            response_text=response_text,
            response_type=ResponseType.TEXT,
            confidence=0.7,
            follow_up_suggestions=follow_up,
            created_at=datetime.now()
        )
    
    def _generate_emergency_response(self, query: GuestQuery, response_id: str) -> ConciergeResponse:
        """Generiraj odgovor za nujne primere"""
        response_text = """🚨 **NUJNI KONTAKTI:**

**Nujna pomoč: 112** (brezplačno)
• Policija, gasilci, reševalci
• 24/7 na voljo

**Zdravstvene storitve:**
• Zdravstveni dom Ljubljana: +386 1 472 37 00
• UKC Ljubljana: +386 1 522 50 50
• Lekarna Prešeren (24h): +386 1 230 62 00

**Hotelska recepcija: 24/7**
• Notranji telefon: 0
• Zunanji: +386 1 XXX XX XX

**Druge koristne številke:**
• Informacije: 1188
• Taxi: +386 1 9700
• Izgubljeni predmeti: +386 1 472 41 25

**Lokacije:**
• Najbližja bolnišnica: UKC Ljubljana (2km)
• Najbližja lekarna: Trubarjeva 9 (500m)
        """
        
        return ConciergeResponse(
            response_id=response_id,
            query_id=query.query_id,
            response_text=response_text,
            response_type=ResponseType.TEXT,
            confidence=1.0,
            escalation_needed=True,  # Vedno eskalacija za nujne primere
            created_at=datetime.now()
        )
    
    def _generate_general_response(self, query: GuestQuery, response_id: str) -> ConciergeResponse:
        """Generiraj splošen odgovor"""
        response_text = """🤖 Hvala za vaše vprašanje! 

Pomagam lahko z:
• 🏛️ Lokalnimi atrakcijami in znamenitostmi
• 🍽️ Priporočili restavracij in kulinarike
• 🚶 Aktivnostmi in izleti
• 🚌 Transportom in navodili
• 🏨 Hotelskimi storitvami
• 🌤️ Vremenom in praktičnimi informacijami

Prosim, postavite mi konkretno vprašanje ali izberite eno od zgornjih tem!
        """
        
        follow_up = [
            "Kaj vas najbolj zanima?",
            "Potrebujete pomoč pri načrtovanju dneva?",
            "Imate posebne želje ali potrebe?"
        ]
        
        return ConciergeResponse(
            response_id=response_id,
            query_id=query.query_id,
            response_text=response_text,
            response_type=ResponseType.TEXT,
            confidence=0.5,
            follow_up_suggestions=follow_up,
            created_at=datetime.now()
        )
    
    def _generate_error_response(self, query: GuestQuery, response_id: str) -> ConciergeResponse:
        """Generiraj odgovor ob napaki"""
        return ConciergeResponse(
            response_id=response_id,
            query_id=query.query_id,
            response_text="Oprostite, prišlo je do napake pri obdelavi vašega vprašanja. Prosim, poskusite znova ali se obrnite na recepcijo za pomoč.",
            response_type=ResponseType.TEXT,
            confidence=0.1,
            escalation_needed=True,
            created_at=datetime.now()
        )
    
    def _save_query(self, query: GuestQuery):
        """Shrani poizvedbo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO guest_queries 
                    (query_id, guest_id, conversation_id, query_text, query_type,
                     language, context, urgency, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    query.query_id,
                    query.guest_id,
                    query.conversation_id,
                    query.query_text,
                    query.query_type.value,
                    query.language,
                    json.dumps(query.context) if query.context else None,
                    query.urgency,
                    query.created_at.isoformat()
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju poizvedbe: {e}")
    
    def _save_response(self, response: ConciergeResponse):
        """Shrani odgovor"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO concierge_responses 
                    (response_id, query_id, response_text, response_type, confidence,
                     structured_data, multimedia_urls, follow_up_suggestions,
                     escalation_needed, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    response.response_id,
                    response.query_id,
                    response.response_text,
                    response.response_type.value,
                    response.confidence,
                    json.dumps(response.structured_data) if response.structured_data else None,
                    json.dumps(response.multimedia_urls) if response.multimedia_urls else None,
                    json.dumps(response.follow_up_suggestions) if response.follow_up_suggestions else None,
                    response.escalation_needed,
                    response.created_at.isoformat()
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju odgovora: {e}")
    
    def _update_conversation(self, conversation_id: str):
        """Posodobi pogovor"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE conversations 
                    SET queries_count = queries_count + 1,
                        last_activity = ?
                    WHERE conversation_id = ?
                ''', (datetime.now().isoformat(), conversation_id))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju pogovora: {e}")
    
    def end_conversation(self, conversation_id: str, satisfaction_rating: int = None) -> Dict[str, Any]:
        """Končaj pogovor"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE conversations 
                    SET status = 'completed',
                        satisfaction_rating = ?,
                        ended_at = ?
                    WHERE conversation_id = ?
                ''', (satisfaction_rating, datetime.now().isoformat(), conversation_id))
                
                conn.commit()
            
            return {
                "success": True,
                "message": "Hvala za pogovor! Upam, da sem vam bil v pomoč. 😊"
            }
            
        except Exception as e:
            logger.error(f"Napaka pri končanju pogovora: {e}")
            return {"success": False, "error": str(e)}
    
    def get_conversation_history(self, conversation_id: str) -> Dict[str, Any]:
        """Pridobi zgodovino pogovora"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi pogovor
                cursor.execute('''
                    SELECT * FROM conversations WHERE conversation_id = ?
                ''', (conversation_id,))
                
                conversation_data = cursor.fetchone()
                if not conversation_data:
                    return {"success": False, "error": "Pogovor ni najden"}
                
                # Pridobi poizvedbe in odgovore
                cursor.execute('''
                    SELECT q.*, r.response_text, r.response_type, r.confidence,
                           r.structured_data, r.follow_up_suggestions
                    FROM guest_queries q
                    LEFT JOIN concierge_responses r ON q.query_id = r.query_id
                    WHERE q.conversation_id = ?
                    ORDER BY q.created_at ASC
                ''', (conversation_id,))
                
                interactions = cursor.fetchall()
                
                history = {
                    "conversation_id": conversation_data[0],
                    "guest_id": conversation_data[1],
                    "status": conversation_data[2],
                    "language": conversation_data[3],
                    "queries_count": conversation_data[5],
                    "satisfaction_rating": conversation_data[6],
                    "started_at": conversation_data[7],
                    "ended_at": conversation_data[9],
                    "interactions": []
                }
                
                for interaction in interactions:
                    history["interactions"].append({
                        "query": {
                            "text": interaction[3],
                            "type": interaction[4],
                            "created_at": interaction[8]
                        },
                        "response": {
                            "text": interaction[9] if interaction[9] else None,
                            "type": interaction[10] if interaction[10] else None,
                            "confidence": interaction[11] if interaction[11] else None,
                            "structured_data": json.loads(interaction[12]) if interaction[12] else None,
                            "follow_up_suggestions": json.loads(interaction[13]) if interaction[13] else None
                        }
                    })
                
                return {"success": True, "history": history}
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju zgodovine: {e}")
            return {"success": False, "error": str(e)}
    
    def get_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Pridobi analitiko concierge sistema"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                since_date = (datetime.now() - timedelta(days=days)).isoformat()
                
                # Skupno število pogovorov
                cursor.execute('''
                    SELECT COUNT(*) FROM conversations 
                    WHERE started_at >= ?
                ''', (since_date,))
                total_conversations = cursor.fetchone()[0]
                
                # Skupno število poizvedb
                cursor.execute('''
                    SELECT COUNT(*) FROM guest_queries 
                    WHERE created_at >= ?
                ''', (since_date,))
                total_queries = cursor.fetchone()[0]
                
                # Povprečna ocena zadovoljstva
                cursor.execute('''
                    SELECT AVG(satisfaction_rating) FROM conversations 
                    WHERE satisfaction_rating IS NOT NULL AND started_at >= ?
                ''', (since_date,))
                avg_satisfaction = cursor.fetchone()[0] or 0
                
                # Najpogostejši tipi poizvedb
                cursor.execute('''
                    SELECT query_type, COUNT(*) as count
                    FROM guest_queries 
                    WHERE created_at >= ?
                    GROUP BY query_type
                    ORDER BY count DESC
                    LIMIT 5
                ''', (since_date,))
                top_query_types = cursor.fetchall()
                
                # Povprečen čas odziva (simuliran)
                avg_response_time = 2.3  # sekunde
                
                # Stopnja eskalacije
                cursor.execute('''
                    SELECT COUNT(*) FROM concierge_responses 
                    WHERE escalation_needed = 1 AND created_at >= ?
                ''', (since_date,))
                escalations = cursor.fetchone()[0]
                
                escalation_rate = (escalations / total_queries * 100) if total_queries > 0 else 0
                
                return {
                    "success": True,
                    "analytics": {
                        "period_days": days,
                        "total_conversations": total_conversations,
                        "total_queries": total_queries,
                        "avg_satisfaction": round(avg_satisfaction, 2),
                        "avg_response_time_seconds": avg_response_time,
                        "escalation_rate_percent": round(escalation_rate, 2),
                        "top_query_types": [
                            {"type": row[0], "count": row[1]} 
                            for row in top_query_types
                        ],
                        "queries_per_conversation": round(total_queries / total_conversations, 2) if total_conversations > 0 else 0
                    }
                }
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju analitike: {e}")
            return {"success": False, "error": str(e)}

# Primer uporabe
if __name__ == "__main__":
    # Inicializacija
    concierge = VirtualConcierge()
    
    # Začni pogovor
    conversation = concierge.start_conversation("GUEST_001", "sl")
    print("🤖 Pogovor začet:", conversation)
    
    if conversation["success"]:
        conversation_id = conversation["conversation_id"]
        
        # Testne poizvedbe
        test_queries = [
            "Kje lahko dobro jem v Ljubljani?",
            "Kaj si lahko ogledam v bližini?",
            "Kako pridem do letališča?",
            "Kakšno je vreme jutri?",
            "Potrebujem zdravniško pomoč"
        ]
        
        for query_text in test_queries:
            print(f"\n👤 Gost: {query_text}")
            
            response = concierge.process_query(conversation_id, query_text)
            
            if response["success"]:
                print(f"🤖 Concierge: {response['response']['text']}")
                
                if response['response']['follow_up_suggestions']:
                    print("💡 Predlogi:", response['response']['follow_up_suggestions'])
            else:
                print(f"❌ Napaka: {response['error']}")
        
        # Končaj pogovor
        end_result = concierge.end_conversation(conversation_id, 5)
        print(f"\n✅ Pogovor končan: {end_result}")
        
        # Pridobi analitiko
        analytics = concierge.get_analytics(7)
        print(f"\n📊 Analitika: {analytics}")

    logger.info("🤖 Virtual Concierge sistem uspešno testiran!")