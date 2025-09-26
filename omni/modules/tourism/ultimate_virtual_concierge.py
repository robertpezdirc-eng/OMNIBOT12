"""
ULTIMATE Virtual Concierge System
Napredni virtualni concierge z AI odgovori, predlogi doživetij in personalizacijo
"""

import sqlite3
import json
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import logging
import re
from collections import defaultdict
import uuid

# Nastavitev logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Experience:
    """Razred za doživetje"""
    id: str
    name: str
    category: str  # dining, entertainment, wellness, adventure, culture, shopping
    description: str
    location: str
    duration_minutes: int
    price: float
    rating: float
    difficulty: int  # 1-5
    age_group: str  # family, adult, senior, children
    weather_dependent: bool
    seasonal_availability: List[str]  # spring, summer, autumn, winter
    tags: List[str]
    booking_required: bool = False
    max_capacity: int = 0
    contact_info: Dict[str, str] = None
    
    def __post_init__(self):
        if self.contact_info is None:
            self.contact_info = {}

@dataclass
class Conversation:
    """Razred za pogovor"""
    id: str
    guest_id: str
    start_time: str
    end_time: Optional[str]
    messages: List[Dict[str, Any]]
    context: Dict[str, Any]  # preferences, current_location, weather, etc.
    satisfaction_rating: Optional[float] = None
    resolved: bool = False
    
    def __post_init__(self):
        if not self.messages:
            self.messages = []
        if not self.context:
            self.context = {}

@dataclass
class Recommendation:
    """Razred za priporočilo"""
    id: str
    guest_id: str
    experience_id: str
    reason: str
    confidence_score: float
    created_at: str
    accepted: Optional[bool] = None
    feedback: str = ""

class UltimateVirtualConcierge:
    """Glavni razred za virtualni concierge"""
    
    def __init__(self, db_path: str = "ultimate_concierge.db"):
        self.db_path = db_path
        self.init_database()
        self.load_demo_data()
        self.knowledge_base = self.load_knowledge_base()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tabela doživetij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS experiences (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT,
                    description TEXT,
                    location TEXT,
                    duration_minutes INTEGER,
                    price REAL,
                    rating REAL,
                    difficulty INTEGER,
                    age_group TEXT,
                    weather_dependent BOOLEAN,
                    seasonal_availability TEXT,
                    tags TEXT,
                    booking_required BOOLEAN DEFAULT FALSE,
                    max_capacity INTEGER DEFAULT 0,
                    contact_info TEXT
                )
            ''')
            
            # Tabela pogovorov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    guest_id TEXT,
                    start_time TEXT,
                    end_time TEXT,
                    messages TEXT,
                    context TEXT,
                    satisfaction_rating REAL,
                    resolved BOOLEAN DEFAULT FALSE
                )
            ''')
            
            # Tabela priporočil
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS recommendations (
                    id TEXT PRIMARY KEY,
                    guest_id TEXT,
                    experience_id TEXT,
                    reason TEXT,
                    confidence_score REAL,
                    created_at TEXT,
                    accepted BOOLEAN,
                    feedback TEXT,
                    FOREIGN KEY (experience_id) REFERENCES experiences (id)
                )
            ''')
            
            # Tabela FAQ
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS faq (
                    id TEXT PRIMARY KEY,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    category TEXT,
                    keywords TEXT,
                    usage_count INTEGER DEFAULT 0,
                    last_used TEXT
                )
            ''')
            
            # Tabela gostovih preferenc
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS guest_preferences (
                    id TEXT PRIMARY KEY,
                    guest_id TEXT,
                    preference_type TEXT,
                    preference_value TEXT,
                    confidence REAL DEFAULT 1.0,
                    created_at TEXT,
                    updated_at TEXT
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("Virtual Concierge baza podatkov uspešno inicializirana")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji baze: {e}")
    
    def load_demo_data(self):
        """Naloži demo podatke"""
        try:
            # Preveri ali podatki že obstajajo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM experiences')
            if cursor.fetchone()[0] > 0:
                conn.close()
                return
            
            # Demo doživetja
            demo_experiences = [
                {
                    'id': 'exp_001',
                    'name': 'Degustacija lokalnih vin',
                    'category': 'dining',
                    'description': 'Odkrijte najboljša lokalna vina z izkušenim sommelierjem',
                    'location': 'Vinska klet Jeruzalem',
                    'duration_minutes': 120,
                    'price': 35.00,
                    'rating': 4.8,
                    'difficulty': 1,
                    'age_group': 'adult',
                    'weather_dependent': False,
                    'seasonal_availability': ['spring', 'summer', 'autumn', 'winter'],
                    'tags': ['vino', 'kulinarika', 'lokalno', 'degustacija'],
                    'booking_required': True,
                    'max_capacity': 12,
                    'contact_info': {'phone': '+386 2 123 456', 'email': 'info@jeruzalem.si'}
                },
                {
                    'id': 'exp_002',
                    'name': 'Sprehod po starem mestnem jedru',
                    'category': 'culture',
                    'description': 'Vodeni sprehod z lokalnim vodnikom po zgodovinskih znamenitostih',
                    'location': 'Staro mestno jedro',
                    'duration_minutes': 90,
                    'price': 15.00,
                    'rating': 4.5,
                    'difficulty': 2,
                    'age_group': 'family',
                    'weather_dependent': True,
                    'seasonal_availability': ['spring', 'summer', 'autumn'],
                    'tags': ['zgodovina', 'kultura', 'sprehod', 'vodnik'],
                    'booking_required': True,
                    'max_capacity': 20,
                    'contact_info': {'phone': '+386 1 234 567', 'email': 'vodniki@mesto.si'}
                },
                {
                    'id': 'exp_003',
                    'name': 'Wellness & Spa doživetje',
                    'category': 'wellness',
                    'description': 'Popolno sprostitev z masažo, savno in termalnimi bazeni',
                    'location': 'Hotel Spa Center',
                    'duration_minutes': 180,
                    'price': 65.00,
                    'rating': 4.9,
                    'difficulty': 1,
                    'age_group': 'adult',
                    'weather_dependent': False,
                    'seasonal_availability': ['spring', 'summer', 'autumn', 'winter'],
                    'tags': ['wellness', 'spa', 'masaža', 'sprostitev'],
                    'booking_required': True,
                    'max_capacity': 8,
                    'contact_info': {'phone': '+386 3 345 678', 'email': 'spa@hotel.si'}
                },
                {
                    'id': 'exp_004',
                    'name': 'Kolesarjenje po vinogradih',
                    'category': 'adventure',
                    'description': 'Kolesarska tura skozi slikovite vinograde s postanki pri vinarjih',
                    'location': 'Vinorodna dežela',
                    'duration_minutes': 240,
                    'price': 45.00,
                    'rating': 4.6,
                    'difficulty': 3,
                    'age_group': 'adult',
                    'weather_dependent': True,
                    'seasonal_availability': ['spring', 'summer', 'autumn'],
                    'tags': ['kolesarjenje', 'vinograd', 'narava', 'aktivno'],
                    'booking_required': True,
                    'max_capacity': 15,
                    'contact_info': {'phone': '+386 4 456 789', 'email': 'kolesa@vinograd.si'}
                },
                {
                    'id': 'exp_005',
                    'name': 'Tradicionalna slovenska večerja',
                    'category': 'dining',
                    'description': 'Avtentična slovenska kuhinja z lokalnimi sestavinami',
                    'location': 'Gostilna Pri Janku',
                    'duration_minutes': 150,
                    'price': 28.00,
                    'rating': 4.7,
                    'difficulty': 1,
                    'age_group': 'family',
                    'weather_dependent': False,
                    'seasonal_availability': ['spring', 'summer', 'autumn', 'winter'],
                    'tags': ['slovenska kuhinja', 'tradicionalno', 'lokalno', 'večerja'],
                    'booking_required': True,
                    'max_capacity': 40,
                    'contact_info': {'phone': '+386 5 567 890', 'email': 'rezervacije@janko.si'}
                }
            ]
            
            for experience_data in demo_experiences:
                self.add_experience(experience_data)
            
            # Demo FAQ
            demo_faq = [
                {
                    'id': 'faq_001',
                    'question': 'Kakšen je WiFi dostop?',
                    'answer': 'Brezplačen WiFi je na voljo v vseh prostorih hotela. Geslo: Hotel2024',
                    'category': 'hotel_services',
                    'keywords': ['wifi', 'internet', 'geslo', 'dostop']
                },
                {
                    'id': 'faq_002',
                    'question': 'Kdaj je zajtrk?',
                    'answer': 'Zajtrk se streže od 7:00 do 10:00 v restavraciji na pritličju.',
                    'category': 'dining',
                    'keywords': ['zajtrk', 'čas', 'restavracija', 'ure']
                },
                {
                    'id': 'faq_003',
                    'question': 'Kje lahko parkiram?',
                    'answer': 'Na voljo je brezplačno parkiranje za goste hotela v garaži pod hotelom.',
                    'category': 'parking',
                    'keywords': ['parkiranje', 'garaža', 'brezplačno', 'avto']
                },
                {
                    'id': 'faq_004',
                    'question': 'Kakšno je vreme?',
                    'answer': 'Trenutno vreme lahko preverite na recepciji ali v aplikaciji. Priporočamo, da se pozanimate o vremenski napovedi za načrtovane aktivnosti.',
                    'category': 'weather',
                    'keywords': ['vreme', 'napoved', 'temperatura', 'dež']
                },
                {
                    'id': 'faq_005',
                    'question': 'Kje je najbližja lekarna?',
                    'answer': 'Najbližja lekarna je 200m stran na Glavni ulici 15. Odprta je od 8:00 do 20:00.',
                    'category': 'local_services',
                    'keywords': ['lekarna', 'zdravila', 'blizu', 'naslov']
                }
            ]
            
            for faq_data in demo_faq:
                self.add_faq(faq_data)
            
            conn.close()
            logger.info("Demo podatki uspešno naloženi")
            
        except Exception as e:
            logger.error(f"Napaka pri nalaganju demo podatkov: {e}")
    
    def load_knowledge_base(self) -> Dict[str, Any]:
        """Naloži bazo znanja"""
        return {
            'greetings': [
                'Pozdravljeni! Sem vaš virtualni concierge. Kako vam lahko pomagam?',
                'Dobrodošli! Kaj vas zanima?',
                'Pozdrav! Pripravljen sem odgovoriti na vaša vprašanja.',
                'Zdravo! Kako vam lahko pomagam pri načrtovanju vašega obiska?'
            ],
            'farewells': [
                'Hvala za pogovor! Želim vam lep dan.',
                'Upam, da sem vam pomagal. Lepo se imejte!',
                'Če potrebujete še kaj, sem vedno na voljo. Nasvidenje!',
                'Hvala in prijetno bivanje!'
            ],
            'categories': {
                'dining': 'kulinarika in restavracije',
                'entertainment': 'zabava in dogodki',
                'wellness': 'wellness in sprostitev',
                'adventure': 'pustolovščine in aktivnosti',
                'culture': 'kultura in zgodovina',
                'shopping': 'nakupovanje'
            },
            'weather_responses': {
                'sunny': 'Ker je lepo sončno vreme, priporočam aktivnosti na prostem.',
                'rainy': 'Zaradi dežja priporočam notranje aktivnosti.',
                'cloudy': 'Oblačno vreme je idealno za sprehode in oglede.',
                'cold': 'Zaradi hladnega vremena priporočam toplejše aktivnosti.'
            }
        }
    
    def add_experience(self, experience_data: Dict[str, Any]) -> Dict[str, Any]:
        """Dodaj novo doživetje"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO experiences (
                    id, name, category, description, location, duration_minutes,
                    price, rating, difficulty, age_group, weather_dependent,
                    seasonal_availability, tags, booking_required, max_capacity, contact_info
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                experience_data['id'],
                experience_data['name'],
                experience_data['category'],
                experience_data['description'],
                experience_data['location'],
                experience_data['duration_minutes'],
                experience_data['price'],
                experience_data['rating'],
                experience_data['difficulty'],
                experience_data['age_group'],
                experience_data['weather_dependent'],
                json.dumps(experience_data['seasonal_availability']),
                json.dumps(experience_data['tags']),
                experience_data.get('booking_required', False),
                experience_data.get('max_capacity', 0),
                json.dumps(experience_data.get('contact_info', {}))
            ))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': f'Doživetje {experience_data["name"]} uspešno dodano'
            }
            
        except Exception as e:
            logger.error(f"Napaka pri dodajanju doživetja: {e}")
            return {
                'success': False,
                'message': f'Napaka: {str(e)}'
            }
    
    def add_faq(self, faq_data: Dict[str, Any]) -> Dict[str, Any]:
        """Dodaj FAQ vnos"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO faq (
                    id, question, answer, category, keywords, usage_count, last_used
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                faq_data['id'],
                faq_data['question'],
                faq_data['answer'],
                faq_data['category'],
                json.dumps(faq_data['keywords']),
                0,
                None
            ))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': 'FAQ vnos uspešno dodan'
            }
            
        except Exception as e:
            logger.error(f"Napaka pri dodajanju FAQ: {e}")
            return {
                'success': False,
                'message': f'Napaka: {str(e)}'
            }
    
    def process_message(self, guest_id: str, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Obdelaj sporočilo gosta"""
        try:
            if context is None:
                context = {}
            
            # Analiziraj sporočilo
            intent = self.analyze_intent(message)
            
            # Generiraj odgovor
            response = self.generate_response(message, intent, context, guest_id)
            
            # Shrani pogovor
            conversation_id = self.save_conversation(guest_id, message, response, context)
            
            return {
                'success': True,
                'response': response,
                'intent': intent,
                'conversation_id': conversation_id,
                'recommendations': self.get_recommendations_for_intent(intent, guest_id, context)
            }
            
        except Exception as e:
            logger.error(f"Napaka pri obdelavi sporočila: {e}")
            return {
                'success': False,
                'response': 'Oprostite, prišlo je do napake. Poskusite znova ali se obrnite na recepcijo.',
                'error': str(e)
            }
    
    def analyze_intent(self, message: str) -> Dict[str, Any]:
        """Analiziraj namen sporočila"""
        message_lower = message.lower()
        
        # Prepoznavanje namenov
        intents = {
            'greeting': ['pozdravljeni', 'pozdrav', 'zdravo', 'dobro jutro', 'dober dan'],
            'dining': ['restavracija', 'hrana', 'zajtrk', 'kosilo', 'večerja', 'meni', 'kulinarika'],
            'activities': ['aktivnost', 'doživetje', 'izlet', 'ogled', 'sprehod', 'kolesarjenje'],
            'accommodation': ['soba', 'nastanitev', 'ključ', 'check-in', 'check-out'],
            'local_info': ['kje je', 'kako do', 'naslov', 'lokacija', 'bližina'],
            'weather': ['vreme', 'temperatura', 'dež', 'sonce', 'napoved'],
            'services': ['wifi', 'parkiranje', 'lekarna', 'banka', 'trgovina'],
            'complaint': ['pritožba', 'problem', 'napaka', 'nezadovoljen', 'slabo'],
            'farewell': ['hvala', 'nasvidenje', 'adijo', 'se vidimo']
        }
        
        detected_intent = 'general'
        confidence = 0.0
        
        for intent, keywords in intents.items():
            matches = sum(1 for keyword in keywords if keyword in message_lower)
            if matches > 0:
                current_confidence = matches / len(keywords)
                if current_confidence > confidence:
                    detected_intent = intent
                    confidence = current_confidence
        
        return {
            'intent': detected_intent,
            'confidence': confidence,
            'keywords': self.extract_keywords(message)
        }
    
    def extract_keywords(self, message: str) -> List[str]:
        """Izvleci ključne besede iz sporočila"""
        # Preproste ključne besede
        words = re.findall(r'\b\w+\b', message.lower())
        
        # Filtriraj kratke besede in stopwords
        stopwords = ['in', 'je', 'na', 'za', 'se', 'z', 'v', 'ki', 'da', 'so', 'ali', 'pa', 'ko', 'če']
        keywords = [word for word in words if len(word) > 2 and word not in stopwords]
        
        return keywords[:10]  # Vrni največ 10 ključnih besed
    
    def generate_response(self, message: str, intent: Dict[str, Any], context: Dict[str, Any], guest_id: str) -> str:
        """Generiraj odgovor"""
        intent_type = intent['intent']
        
        if intent_type == 'greeting':
            return random.choice(self.knowledge_base['greetings'])
        
        elif intent_type == 'farewell':
            return random.choice(self.knowledge_base['farewells'])
        
        elif intent_type == 'dining':
            return self.get_dining_response(intent['keywords'], context)
        
        elif intent_type == 'activities':
            return self.get_activities_response(intent['keywords'], context, guest_id)
        
        elif intent_type == 'local_info':
            return self.get_local_info_response(intent['keywords'])
        
        elif intent_type == 'weather':
            return self.get_weather_response(context)
        
        elif intent_type == 'services':
            return self.get_services_response(intent['keywords'])
        
        elif intent_type == 'complaint':
            return self.get_complaint_response()
        
        else:
            # Poskusi najti odgovor v FAQ
            faq_response = self.search_faq(message)
            if faq_response:
                return faq_response
            
            return "Razumem vaše vprašanje, vendar nimam specifičnega odgovora. Lahko se obrnete na recepcijo za dodatne informacije, ali mi zastavite vprašanje drugače?"
    
    def get_dining_response(self, keywords: List[str], context: Dict[str, Any]) -> str:
        """Generiraj odgovor za kulinariko"""
        responses = [
            "Za kulinarična doživetja priporočam degustacijo lokalnih vin ali tradicionalno slovensko večerjo. Želite več informacij?",
            "Imamo odličen hotelski restavracija, ki streže zajtrk od 7:00 do 10:00. Za večerjo priporočam lokalne gostilne.",
            "Če iščete avtentično slovensko kuhinjo, vam lahko priporočim nekaj odličnih lokalnih restavracij."
        ]
        
        return random.choice(responses)
    
    def get_activities_response(self, keywords: List[str], context: Dict[str, Any], guest_id: str) -> str:
        """Generiraj odgovor za aktivnosti"""
        # Pridobi priporočila
        recommendations = self.get_personalized_recommendations(guest_id, context)
        
        if recommendations:
            top_rec = recommendations[0]
            return f"Glede na vaše preference priporočam '{top_rec['name']}'. To je {top_rec['description']} Cena: €{top_rec['price']:.2f}. Želite rezervacijo?"
        
        return "Na voljo je veliko aktivnosti - od kulturnih ogledov do pustolovščin v naravi. Kaj vas najbolj zanima?"
    
    def get_local_info_response(self, keywords: List[str]) -> str:
        """Generiraj odgovor za lokalne informacije"""
        return "Za lokalne informacije in nasvete se lahko obrnete na recepcijo. Lahko vam pomagam z osnovnimi informacijami o bližnjih storitvah."
    
    def get_weather_response(self, context: Dict[str, Any]) -> str:
        """Generiraj odgovor za vreme"""
        weather = context.get('weather', 'unknown')
        
        if weather in self.knowledge_base['weather_responses']:
            return self.knowledge_base['weather_responses'][weather]
        
        return "Trenutno vreme lahko preverite na recepciji ali v aplikaciji. Priporočam, da se pozanimate o vremenski napovedi za načrtovane aktivnosti."
    
    def get_services_response(self, keywords: List[str]) -> str:
        """Generiraj odgovor za storitve"""
        return "Za informacije o hotelskih storitvah se obrnite na recepcijo. WiFi geslo je Hotel2024, parkiranje je brezplačno v garaži."
    
    def get_complaint_response(self) -> str:
        """Generiraj odgovor za pritožbe"""
        return "Oprostite za nevšečnosti. Vaša povratna informacija je pomembna. Prosim, obrnite se na recepcijo, kjer vam bomo takoj pomagali rešiti problem."
    
    def search_faq(self, message: str) -> Optional[str]:
        """Poišči odgovor v FAQ"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Poišči podobna vprašanja
            cursor.execute('SELECT * FROM faq')
            faqs = cursor.fetchall()
            
            message_lower = message.lower()
            best_match = None
            best_score = 0
            
            for faq in faqs:
                faq_id, question, answer, category, keywords_json, usage_count, last_used = faq
                keywords = json.loads(keywords_json)
                
                # Izračunaj podobnost
                score = 0
                for keyword in keywords:
                    if keyword.lower() in message_lower:
                        score += 1
                
                if score > best_score:
                    best_score = score
                    best_match = (faq_id, answer)
            
            if best_match and best_score > 0:
                # Posodobi statistike uporabe
                cursor.execute('''
                    UPDATE faq 
                    SET usage_count = usage_count + 1, last_used = ?
                    WHERE id = ?
                ''', (datetime.now().isoformat(), best_match[0]))
                
                conn.commit()
                conn.close()
                return best_match[1]
            
            conn.close()
            return None
            
        except Exception as e:
            logger.error(f"Napaka pri iskanju FAQ: {e}")
            return None
    
    def get_personalized_recommendations(self, guest_id: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Pridobi personalizirana priporočila"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pridobi preference gosta
            cursor.execute('''
                SELECT preference_type, preference_value, confidence
                FROM guest_preferences
                WHERE guest_id = ?
            ''', (guest_id,))
            
            preferences = {}
            for row in cursor.fetchall():
                preferences[row[0]] = {'value': row[1], 'confidence': row[2]}
            
            # Pridobi doživetja
            cursor.execute('SELECT * FROM experiences')
            experiences = []
            
            for row in cursor.fetchall():
                columns = [description[0] for description in cursor.description]
                experience = dict(zip(columns, row))
                
                # Pretvori JSON polja
                experience['seasonal_availability'] = json.loads(experience['seasonal_availability'])
                experience['tags'] = json.loads(experience['tags'])
                experience['contact_info'] = json.loads(experience['contact_info'])
                
                # Izračunaj primernost
                score = self.calculate_recommendation_score(experience, preferences, context)
                experience['recommendation_score'] = score
                
                experiences.append(experience)
            
            # Razvrsti po primernosti
            experiences.sort(key=lambda x: x['recommendation_score'], reverse=True)
            
            conn.close()
            return experiences[:5]  # Vrni top 5
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju priporočil: {e}")
            return []
    
    def calculate_recommendation_score(self, experience: Dict[str, Any], preferences: Dict[str, Any], context: Dict[str, Any]) -> float:
        """Izračunaj rezultat priporočila"""
        score = experience['rating']  # Osnova je ocena
        
        # Preference kategorije
        if 'category' in preferences:
            if experience['category'] == preferences['category']['value']:
                score += 2.0 * preferences['category']['confidence']
        
        # Vremenske razmere
        weather = context.get('weather', 'unknown')
        if weather == 'rainy' and experience['weather_dependent']:
            score -= 1.0
        elif weather == 'sunny' and not experience['weather_dependent']:
            score += 0.5
        
        # Sezonska primernost
        current_season = self.get_current_season()
        if current_season in experience['seasonal_availability']:
            score += 1.0
        
        # Cenovna kategorija
        if 'budget' in preferences:
            budget = float(preferences['budget']['value'])
            if experience['price'] <= budget:
                score += 1.0
            elif experience['price'] > budget * 1.5:
                score -= 1.0
        
        return max(0, score)  # Minimalna ocena je 0
    
    def get_current_season(self) -> str:
        """Določi trenutno sezono"""
        month = datetime.now().month
        if month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        elif month in [9, 10, 11]:
            return "autumn"
        else:
            return "winter"
    
    def save_conversation(self, guest_id: str, message: str, response: str, context: Dict[str, Any]) -> str:
        """Shrani pogovor"""
        try:
            conversation_id = str(uuid.uuid4())
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            messages = [
                {
                    'timestamp': datetime.now().isoformat(),
                    'sender': 'guest',
                    'message': message
                },
                {
                    'timestamp': datetime.now().isoformat(),
                    'sender': 'concierge',
                    'message': response
                }
            ]
            
            cursor.execute('''
                INSERT INTO conversations (
                    id, guest_id, start_time, messages, context, resolved
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                conversation_id,
                guest_id,
                datetime.now().isoformat(),
                json.dumps(messages),
                json.dumps(context),
                False
            ))
            
            conn.commit()
            conn.close()
            
            return conversation_id
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju pogovora: {e}")
            return ""
    
    def get_recommendations_for_intent(self, intent: Dict[str, Any], guest_id: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Pridobi priporočila za določen namen"""
        if intent['intent'] in ['activities', 'dining']:
            return self.get_personalized_recommendations(guest_id, context)
        return []
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Pridobi podatke za dashboard"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Skupno število pogovorov
            cursor.execute('SELECT COUNT(*) FROM conversations')
            total_conversations = cursor.fetchone()[0]
            
            # Povprečna ocena zadovoljstva
            cursor.execute('SELECT AVG(satisfaction_rating) FROM conversations WHERE satisfaction_rating IS NOT NULL')
            avg_satisfaction = cursor.fetchone()[0] or 0
            
            # Najpogostejše kategorije vprašanj
            cursor.execute('''
                SELECT category, COUNT(*) as count
                FROM faq
                WHERE usage_count > 0
                GROUP BY category
                ORDER BY count DESC
            ''')
            
            popular_categories = {}
            for row in cursor.fetchall():
                popular_categories[row[0]] = row[1]
            
            # Top doživetja
            cursor.execute('''
                SELECT name, rating, price, category
                FROM experiences
                ORDER BY rating DESC
                LIMIT 5
            ''')
            
            top_experiences = []
            for row in cursor.fetchall():
                top_experiences.append({
                    'name': row[0],
                    'rating': row[1],
                    'price': row[2],
                    'category': row[3]
                })
            
            # Aktivni pogovori
            cursor.execute('SELECT COUNT(*) FROM conversations WHERE resolved = FALSE')
            active_conversations = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_conversations': total_conversations,
                'avg_satisfaction': round(avg_satisfaction, 2),
                'popular_categories': popular_categories,
                'top_experiences': top_experiences,
                'active_conversations': active_conversations,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju dashboard podatkov: {e}")
            return {}

# Demo funkcije
def demo_virtual_concierge():
    """Demo virtualnega concierge"""
    concierge = UltimateVirtualConcierge()
    
    print("=== DEMO: Virtual Concierge sistem ===")
    
    guest_id = "guest_demo_001"
    
    # Demo pogovori
    demo_messages = [
        "Pozdravljeni! Kaj lahko počnem danes?",
        "Zanima me kulinarika in lokalna hrana",
        "Kakšno je vreme danes?",
        "Kje lahko parkiram?",
        "Hvala za pomoč!"
    ]
    
    context = {
        'weather': 'sunny',
        'location': 'hotel',
        'time_of_day': 'morning'
    }
    
    for message in demo_messages:
        print(f"\nGost: {message}")
        
        result = concierge.process_message(guest_id, message, context)
        
        if result['success']:
            print(f"Concierge: {result['response']}")
            
            if result['recommendations']:
                print("Priporočila:")
                for rec in result['recommendations'][:2]:
                    print(f"  - {rec['name']} (€{rec['price']:.2f}) - {rec['rating']}⭐")
        else:
            print(f"Napaka: {result.get('error', 'Neznana napaka')}")
    
    # Dashboard podatki
    print("\n=== Dashboard podatki ===")
    dashboard = concierge.get_dashboard_data()
    print(f"Skupno pogovorov: {dashboard.get('total_conversations', 0)}")
    print(f"Povprečna ocena zadovoljstva: {dashboard.get('avg_satisfaction', 0):.1f}/5.0")
    print(f"Aktivni pogovori: {dashboard.get('active_conversations', 0)}")
    
    if dashboard.get('top_experiences'):
        print("Top doživetja:")
        for exp in dashboard['top_experiences'][:3]:
            print(f"  - {exp['name']} ({exp['rating']}⭐, €{exp['price']:.2f})")

if __name__ == "__main__":
    demo_virtual_concierge()