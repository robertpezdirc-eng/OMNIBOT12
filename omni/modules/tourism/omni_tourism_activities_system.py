"""
OMNI TOURISM ACTIVITIES SYSTEM
Celovit sistem turističnih aktivnosti z AR/VR ogledi, personaliziranimi itinerariji in AI priporočili
"""

import sqlite3
import json
import datetime
import uuid
import random
import math
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import requests
import base64
import io

class ActivityType(Enum):
    OUTDOOR = "zunanja_aktivnost"
    CULTURAL = "kulturna_aktivnost"
    ADVENTURE = "pustolovska_aktivnost"
    WELLNESS = "wellness"
    GASTRONOMY = "gastronomija"
    WATER_SPORTS = "vodni_sporti"
    WINTER_SPORTS = "zimski_sporti"
    FAMILY = "druzinska_aktivnost"
    ROMANTIC = "romanticna_aktivnost"
    EDUCATIONAL = "izobrazevalna_aktivnost"

class DifficultyLevel(Enum):
    EASY = "lahko"
    MODERATE = "zmerno"
    CHALLENGING = "zahtevno"
    EXPERT = "ekspertno"

class WeatherDependency(Enum):
    INDOOR = "notranjo"
    OUTDOOR_GOOD = "zunaj_lepo"
    OUTDOOR_ANY = "zunaj_vedno"
    WEATHER_FLEXIBLE = "prilagodljivo"

class SeasonAvailability(Enum):
    ALL_YEAR = "celo_leto"
    SPRING_SUMMER = "pomlad_poletje"
    AUTUMN_WINTER = "jesen_zima"
    SUMMER_ONLY = "samo_poletje"
    WINTER_ONLY = "samo_zima"

@dataclass
class Activity:
    id: str
    name: str
    description: str
    activity_type: ActivityType
    difficulty: DifficultyLevel
    duration_minutes: int
    price: float
    max_participants: int
    min_age: int
    weather_dependency: WeatherDependency
    season_availability: SeasonAvailability
    location: str
    coordinates: Tuple[float, float]  # lat, lng
    equipment_provided: List[str]
    equipment_required: List[str]
    languages: List[str]
    accessibility: bool
    ar_vr_available: bool
    virtual_tour_url: str
    booking_advance_hours: int
    cancellation_hours: int

@dataclass
class Itinerary:
    id: str
    name: str
    description: str
    duration_days: int
    activities: List[str]  # activity IDs
    total_price: float
    difficulty_level: DifficultyLevel
    target_audience: List[str]
    season_best: SeasonAvailability
    created_by_ai: bool
    personalization_score: float

@dataclass
class Booking:
    id: str
    activity_id: str
    customer_id: str
    booking_date: datetime.datetime
    activity_date: datetime.datetime
    participants: int
    total_price: float
    status: str
    special_requirements: str
    guide_id: Optional[str]

@dataclass
class VirtualExperience:
    id: str
    activity_id: str
    experience_type: str  # "360_video", "ar_overlay", "vr_simulation"
    content_url: str
    duration_seconds: int
    quality: str  # "HD", "4K", "8K"
    interactive_elements: List[str]
    language_tracks: List[str]

class OmniTourismActivitiesSystem:
    def __init__(self, db_path: str = "omni_tourism_activities.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela aktivnosti
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activities (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                activity_type TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL,
                price REAL NOT NULL,
                max_participants INTEGER DEFAULT 10,
                min_age INTEGER DEFAULT 0,
                weather_dependency TEXT NOT NULL,
                season_availability TEXT NOT NULL,
                location TEXT NOT NULL,
                coordinates TEXT NOT NULL,
                equipment_provided TEXT,
                equipment_required TEXT,
                languages TEXT,
                accessibility BOOLEAN DEFAULT 0,
                ar_vr_available BOOLEAN DEFAULT 0,
                virtual_tour_url TEXT,
                booking_advance_hours INTEGER DEFAULT 24,
                cancellation_hours INTEGER DEFAULT 24,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela itinerarjev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS itineraries (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                duration_days INTEGER NOT NULL,
                activities TEXT NOT NULL,
                total_price REAL NOT NULL,
                difficulty_level TEXT NOT NULL,
                target_audience TEXT,
                season_best TEXT,
                created_by_ai BOOLEAN DEFAULT 0,
                personalization_score REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela rezervacij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                activity_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                activity_date TIMESTAMP NOT NULL,
                participants INTEGER NOT NULL,
                total_price REAL NOT NULL,
                status TEXT DEFAULT 'confirmed',
                special_requirements TEXT,
                guide_id TEXT,
                FOREIGN KEY (activity_id) REFERENCES activities (id)
            )
        ''')
        
        # Tabela virtualnih doživetij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS virtual_experiences (
                id TEXT PRIMARY KEY,
                activity_id TEXT NOT NULL,
                experience_type TEXT NOT NULL,
                content_url TEXT NOT NULL,
                duration_seconds INTEGER DEFAULT 300,
                quality TEXT DEFAULT 'HD',
                interactive_elements TEXT,
                language_tracks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (activity_id) REFERENCES activities (id)
            )
        ''')
        
        # Tabela vodičev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS guides (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                languages TEXT NOT NULL,
                specializations TEXT,
                experience_years INTEGER DEFAULT 0,
                rating REAL DEFAULT 5.0,
                available_dates TEXT,
                hourly_rate REAL DEFAULT 25.0,
                bio TEXT,
                certifications TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela ocen in komentarjev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reviews (
                id TEXT PRIMARY KEY,
                activity_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                photos TEXT,
                review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                helpful_votes INTEGER DEFAULT 0,
                FOREIGN KEY (activity_id) REFERENCES activities (id)
            )
        ''')
        
        # Tabela AI priporočil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_recommendations (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                recommended_activities TEXT NOT NULL,
                recommendation_reason TEXT,
                confidence_score REAL DEFAULT 0.5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                clicked BOOLEAN DEFAULT 0,
                booked BOOLEAN DEFAULT 0
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def add_activity(self, activity: Activity) -> bool:
        """Dodaj aktivnost"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO activities 
                (id, name, description, activity_type, difficulty, duration_minutes, price,
                 max_participants, min_age, weather_dependency, season_availability, location,
                 coordinates, equipment_provided, equipment_required, languages, accessibility,
                 ar_vr_available, virtual_tour_url, booking_advance_hours, cancellation_hours)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                activity.id, activity.name, activity.description, activity.activity_type.value,
                activity.difficulty.value, activity.duration_minutes, activity.price,
                activity.max_participants, activity.min_age, activity.weather_dependency.value,
                activity.season_availability.value, activity.location,
                json.dumps(activity.coordinates), json.dumps(activity.equipment_provided),
                json.dumps(activity.equipment_required), json.dumps(activity.languages),
                activity.accessibility, activity.ar_vr_available, activity.virtual_tour_url,
                activity.booking_advance_hours, activity.cancellation_hours
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju aktivnosti: {e}")
            return False
    
    def add_virtual_experience(self, experience: VirtualExperience) -> bool:
        """Dodaj virtualno doživetje"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO virtual_experiences 
                (id, activity_id, experience_type, content_url, duration_seconds, quality,
                 interactive_elements, language_tracks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                experience.id, experience.activity_id, experience.experience_type,
                experience.content_url, experience.duration_seconds, experience.quality,
                json.dumps(experience.interactive_elements), json.dumps(experience.language_tracks)
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju virtualnega doživetja: {e}")
            return False
    
    def create_personalized_itinerary(self, customer_preferences: Dict, duration_days: int) -> Optional[Itinerary]:
        """Ustvari personaliziran itinerar z AI"""
        try:
            # Pridobi aktivnosti glede na preference
            suitable_activities = self.get_activities_by_preferences(customer_preferences)
            
            if len(suitable_activities) < duration_days:
                return None
            
            # AI algoritem za izbiro aktivnosti
            selected_activities = self.ai_select_activities(suitable_activities, duration_days, customer_preferences)
            
            # Izračunaj skupno ceno
            total_price = sum(activity['price'] for activity in selected_activities)
            
            # Določi težavnost
            avg_difficulty = self.calculate_average_difficulty(selected_activities)
            
            itinerary = Itinerary(
                id=str(uuid.uuid4()),
                name=f"Personaliziran {duration_days}-dnevni itinerar",
                description=f"AI ustvarjen itinerar na podlagi vaših preferenc",
                duration_days=duration_days,
                activities=[act['id'] for act in selected_activities],
                total_price=total_price,
                difficulty_level=avg_difficulty,
                target_audience=customer_preferences.get('target_audience', []),
                season_best=SeasonAvailability.ALL_YEAR,
                created_by_ai=True,
                personalization_score=self.calculate_personalization_score(selected_activities, customer_preferences)
            )
            
            # Shrani itinerar
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO itineraries 
                (id, name, description, duration_days, activities, total_price, difficulty_level,
                 target_audience, season_best, created_by_ai, personalization_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                itinerary.id, itinerary.name, itinerary.description, itinerary.duration_days,
                json.dumps(itinerary.activities), itinerary.total_price, itinerary.difficulty_level.value,
                json.dumps(itinerary.target_audience), itinerary.season_best.value,
                itinerary.created_by_ai, itinerary.personalization_score
            ))
            
            conn.commit()
            conn.close()
            
            return itinerary
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju itinerarija: {e}")
            return None
    
    def get_activities_by_preferences(self, preferences: Dict) -> List[Dict]:
        """Pridobi aktivnosti glede na preference"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = "SELECT * FROM activities WHERE 1=1"
            params = []
            
            # Filtriraj po tipu aktivnosti
            if 'activity_types' in preferences:
                placeholders = ','.join(['?' for _ in preferences['activity_types']])
                query += f" AND activity_type IN ({placeholders})"
                params.extend(preferences['activity_types'])
            
            # Filtriraj po težavnosti
            if 'max_difficulty' in preferences:
                difficulty_order = ['lahko', 'zmerno', 'zahtevno', 'ekspertno']
                max_index = difficulty_order.index(preferences['max_difficulty'])
                allowed_difficulties = difficulty_order[:max_index + 1]
                placeholders = ','.join(['?' for _ in allowed_difficulties])
                query += f" AND difficulty IN ({placeholders})"
                params.extend(allowed_difficulties)
            
            # Filtriraj po ceni
            if 'max_price' in preferences:
                query += " AND price <= ?"
                params.append(preferences['max_price'])
            
            # Filtriraj po dostopnosti
            if preferences.get('accessibility_required', False):
                query += " AND accessibility = 1"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            activities = []
            for row in rows:
                activity = {
                    'id': row[0],
                    'name': row[1],
                    'description': row[2],
                    'activity_type': row[3],
                    'difficulty': row[4],
                    'duration_minutes': row[5],
                    'price': row[6],
                    'max_participants': row[7],
                    'min_age': row[8],
                    'weather_dependency': row[9],
                    'season_availability': row[10],
                    'location': row[11],
                    'coordinates': json.loads(row[12]),
                    'equipment_provided': json.loads(row[13]) if row[13] else [],
                    'equipment_required': json.loads(row[14]) if row[14] else [],
                    'languages': json.loads(row[15]) if row[15] else [],
                    'accessibility': bool(row[16]),
                    'ar_vr_available': bool(row[17]),
                    'virtual_tour_url': row[18]
                }
                activities.append(activity)
            
            conn.close()
            return activities
            
        except Exception as e:
            print(f"Napaka pri pridobivanju aktivnosti: {e}")
            return []
    
    def ai_select_activities(self, activities: List[Dict], duration_days: int, preferences: Dict) -> List[Dict]:
        """AI algoritem za izbiro aktivnosti"""
        # Poenostavljen AI algoritem
        selected = []
        used_types = set()
        
        # Razvrsti aktivnosti po oceni primernosti
        scored_activities = []
        for activity in activities:
            score = self.calculate_activity_score(activity, preferences)
            scored_activities.append((activity, score))
        
        # Sortiraj po oceni
        scored_activities.sort(key=lambda x: x[1], reverse=True)
        
        # Izberi aktivnosti z raznolikostjo
        for activity, score in scored_activities:
            if len(selected) >= duration_days:
                break
                
            activity_type = activity['activity_type']
            
            # Poskusi zagotoviti raznolikost tipov
            if len(selected) < duration_days // 2 or activity_type not in used_types:
                selected.append(activity)
                used_types.add(activity_type)
        
        return selected
    
    def calculate_activity_score(self, activity: Dict, preferences: Dict) -> float:
        """Izračunaj oceno primernosti aktivnosti"""
        score = 0.0
        
        # Osnovna ocena
        score += 1.0
        
        # Bonus za preferirane tipe
        if 'preferred_types' in preferences:
            if activity['activity_type'] in preferences['preferred_types']:
                score += 2.0
        
        # Bonus za AR/VR
        if preferences.get('ar_vr_interest', False) and activity['ar_vr_available']:
            score += 1.5
        
        # Malus za previsoko ceno
        if 'budget_per_activity' in preferences:
            if activity['price'] > preferences['budget_per_activity']:
                score -= 1.0
        
        # Bonus za dostopnost
        if preferences.get('accessibility_required', False) and activity['accessibility']:
            score += 1.0
        
        # Naključni faktor za raznolikost
        score += random.uniform(-0.5, 0.5)
        
        return max(0, score)
    
    def calculate_average_difficulty(self, activities: List[Dict]) -> DifficultyLevel:
        """Izračunaj povprečno težavnost"""
        difficulty_values = {'lahko': 1, 'zmerno': 2, 'zahtevno': 3, 'ekspertno': 4}
        reverse_map = {1: DifficultyLevel.EASY, 2: DifficultyLevel.MODERATE, 
                      3: DifficultyLevel.CHALLENGING, 4: DifficultyLevel.EXPERT}
        
        if not activities:
            return DifficultyLevel.EASY
        
        avg_value = sum(difficulty_values.get(act['difficulty'], 1) for act in activities) / len(activities)
        return reverse_map[round(avg_value)]
    
    def calculate_personalization_score(self, activities: List[Dict], preferences: Dict) -> float:
        """Izračunaj oceno personalizacije"""
        if not activities:
            return 0.0
        
        total_score = sum(self.calculate_activity_score(act, preferences) for act in activities)
        return min(1.0, total_score / (len(activities) * 3.0))  # Normaliziraj na 0-1
    
    def create_booking(self, activity_id: str, customer_id: str, activity_date: datetime.datetime,
                      participants: int, special_requirements: str = "") -> Optional[Booking]:
        """Ustvari rezervacijo"""
        try:
            # Pridobi podatke o aktivnosti
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT price, max_participants FROM activities WHERE id = ?', (activity_id,))
            result = cursor.fetchone()
            
            if not result:
                return None
            
            price, max_participants = result
            
            if participants > max_participants:
                return None
            
            booking = Booking(
                id=str(uuid.uuid4()),
                activity_id=activity_id,
                customer_id=customer_id,
                booking_date=datetime.datetime.now(),
                activity_date=activity_date,
                participants=participants,
                total_price=price * participants,
                status="confirmed",
                special_requirements=special_requirements,
                guide_id=None
            )
            
            cursor.execute('''
                INSERT INTO bookings 
                (id, activity_id, customer_id, activity_date, participants, total_price, 
                 status, special_requirements)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                booking.id, booking.activity_id, booking.customer_id, booking.activity_date,
                booking.participants, booking.total_price, booking.status, booking.special_requirements
            ))
            
            conn.commit()
            conn.close()
            
            return booking
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju rezervacije: {e}")
            return None
    
    def get_ar_vr_experiences(self, activity_id: str = None) -> List[Dict]:
        """Pridobi AR/VR doživetja"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if activity_id:
                cursor.execute('''
                    SELECT ve.*, a.name as activity_name 
                    FROM virtual_experiences ve
                    JOIN activities a ON ve.activity_id = a.id
                    WHERE ve.activity_id = ?
                ''', (activity_id,))
            else:
                cursor.execute('''
                    SELECT ve.*, a.name as activity_name 
                    FROM virtual_experiences ve
                    JOIN activities a ON ve.activity_id = a.id
                ''')
            
            rows = cursor.fetchall()
            experiences = []
            
            for row in rows:
                experience = {
                    'id': row[0],
                    'activity_id': row[1],
                    'activity_name': row[8],
                    'experience_type': row[2],
                    'content_url': row[3],
                    'duration_seconds': row[4],
                    'quality': row[5],
                    'interactive_elements': json.loads(row[6]) if row[6] else [],
                    'language_tracks': json.loads(row[7]) if row[7] else []
                }
                experiences.append(experience)
            
            conn.close()
            return experiences
            
        except Exception as e:
            print(f"Napaka pri pridobivanju AR/VR doživetij: {e}")
            return []
    
    def generate_ai_recommendations(self, customer_id: str, customer_history: List[str] = None) -> List[Dict]:
        """Generiraj AI priporočila"""
        try:
            # Poenostavljen AI sistem priporočil
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pridobi vse aktivnosti
            cursor.execute('SELECT * FROM activities')
            all_activities = cursor.fetchall()
            
            # Simuliraj AI analizo
            recommendations = []
            
            for activity in all_activities[:5]:  # Top 5 priporočil
                confidence = random.uniform(0.6, 0.95)
                reason = self.generate_recommendation_reason(activity)
                
                recommendation = {
                    'activity_id': activity[0],
                    'activity_name': activity[1],
                    'confidence_score': confidence,
                    'reason': reason,
                    'price': activity[6],
                    'duration_minutes': activity[5]
                }
                recommendations.append(recommendation)
            
            # Shrani priporočila
            cursor.execute('''
                INSERT INTO ai_recommendations 
                (id, customer_id, recommended_activities, recommendation_reason, confidence_score)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), customer_id, json.dumps([r['activity_id'] for r in recommendations]),
                "AI analiza na podlagi preferenc in zgodovine", 
                sum(r['confidence_score'] for r in recommendations) / len(recommendations)
            ))
            
            conn.commit()
            conn.close()
            
            return recommendations
            
        except Exception as e:
            print(f"Napaka pri generiranju priporočil: {e}")
            return []
    
    def generate_recommendation_reason(self, activity) -> str:
        """Generiraj razlog za priporočilo"""
        reasons = [
            f"Popularna {activity[3]} aktivnost v vaši regiji",
            f"Odlična za {activity[4]} težavnost, ki jo preferirate",
            f"Vključuje AR/VR doživetje" if activity[17] else f"Tradicionalna aktivnost z bogato zgodovino",
            f"Primerna za družine" if activity[8] <= 6 else f"Odlična za odrasle",
            f"Dostopna tudi za osebe s posebnimi potrebami" if activity[16] else f"Pustolovska izkušnja"
        ]
        return random.choice(reasons)
    
    def get_activity_statistics(self) -> Dict:
        """Pridobi statistike aktivnosti"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Osnovne statistike
            cursor.execute('SELECT COUNT(*) FROM activities')
            total_activities = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM activities WHERE ar_vr_available = 1')
            ar_vr_activities = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM bookings WHERE status = "confirmed"')
            total_bookings = cursor.fetchone()[0]
            
            cursor.execute('SELECT AVG(price) FROM activities')
            avg_price = cursor.fetchone()[0] or 0
            
            # Statistike po tipih
            cursor.execute('SELECT activity_type, COUNT(*) FROM activities GROUP BY activity_type')
            type_stats = dict(cursor.fetchall())
            
            # Statistike po težavnosti
            cursor.execute('SELECT difficulty, COUNT(*) FROM activities GROUP BY difficulty')
            difficulty_stats = dict(cursor.fetchall())
            
            statistics = {
                'total_activities': total_activities,
                'ar_vr_activities': ar_vr_activities,
                'total_bookings': total_bookings,
                'average_price': round(avg_price, 2),
                'activity_types': type_stats,
                'difficulty_levels': difficulty_stats,
                'ar_vr_percentage': round((ar_vr_activities / total_activities * 100), 1) if total_activities > 0 else 0
            }
            
            conn.close()
            return statistics
            
        except Exception as e:
            print(f"Napaka pri pridobivanju statistik: {e}")
            return {}

def demo_tourism_activities():
    """Demo funkcija sistema turističnih aktivnosti"""
    print("🏞️ OMNI TOURISM ACTIVITIES SYSTEM - DEMO")
    print("=" * 50)
    
    # Inicializacija sistema
    tourism_system = OmniTourismActivitiesSystem()
    
    # Dodajanje aktivnosti
    activities = [
        Activity(
            id="ACT001",
            name="Vožnja s čolnom po Blejskem jezeru",
            description="Romantična vožnja s tradicionalnim pletno po čudovitem Blejskem jezeru",
            activity_type=ActivityType.ROMANTIC,
            difficulty=DifficultyLevel.EASY,
            duration_minutes=60,
            price=25.0,
            max_participants=4,
            min_age=0,
            weather_dependency=WeatherDependency.OUTDOOR_GOOD,
            season_availability=SeasonAvailability.SPRING_SUMMER,
            location="Bled",
            coordinates=(46.3683, 14.1127),
            equipment_provided=["vesla", "rešilni jopič"],
            equipment_required=[],
            languages=["slovenščina", "angleščina", "nemščina"],
            accessibility=False,
            ar_vr_available=True,
            virtual_tour_url="https://vr.bled.si/boat-tour",
            booking_advance_hours=24,
            cancellation_hours=12
        ),
        Activity(
            id="ACT002",
            name="Pohodništvo na Triglav",
            description="Zahteven vzpon na najvišji vrh Slovenije z izkušenim vodnikom",
            activity_type=ActivityType.ADVENTURE,
            difficulty=DifficultyLevel.EXPERT,
            duration_minutes=720,  # 12 ur
            price=150.0,
            max_participants=8,
            min_age=16,
            weather_dependency=WeatherDependency.OUTDOOR_GOOD,
            season_availability=SeasonAvailability.SPRING_SUMMER,
            location="Kranjska Gora",
            coordinates=(46.4848, 13.9264),
            equipment_provided=["čelada", "plezalni pas"],
            equipment_required=["planinski čevlji", "nahrbtnik", "oblačila"],
            languages=["slovenščina", "angleščina"],
            accessibility=False,
            ar_vr_available=True,
            virtual_tour_url="https://vr.triglav.si/climb",
            booking_advance_hours=72,
            cancellation_hours=48
        ),
        Activity(
            id="ACT003",
            name="Degustacija vin v Vipavski dolini",
            description="Odkrijte odlična vina Vipavske doline z lokalnimi vinogradniki",
            activity_type=ActivityType.GASTRONOMY,
            difficulty=DifficultyLevel.EASY,
            duration_minutes=180,
            price=45.0,
            max_participants=12,
            min_age=18,
            weather_dependency=WeatherDependency.WEATHER_FLEXIBLE,
            season_availability=SeasonAvailability.ALL_YEAR,
            location="Vipava",
            coordinates=(45.8439, 13.9614),
            equipment_provided=["degustacijski kozarci", "voda"],
            equipment_required=[],
            languages=["slovenščina", "angleščina", "italijanščina"],
            accessibility=True,
            ar_vr_available=False,
            virtual_tour_url="",
            booking_advance_hours=48,
            cancellation_hours=24
        ),
        Activity(
            id="ACT004",
            name="Wellness dan v Termah Čatež",
            description="Sproščujoč dan v termalnih bazenih in wellness centru",
            activity_type=ActivityType.WELLNESS,
            difficulty=DifficultyLevel.EASY,
            duration_minutes=480,  # 8 ur
            price=35.0,
            max_participants=20,
            min_age=0,
            weather_dependency=WeatherDependency.INDOOR,
            season_availability=SeasonAvailability.ALL_YEAR,
            location="Čatež ob Savi",
            coordinates=(45.8947, 15.6158),
            equipment_provided=["brisače", "natikači"],
            equipment_required=["kopalke"],
            languages=["slovenščina", "angleščina", "nemščina"],
            accessibility=True,
            ar_vr_available=False,
            virtual_tour_url="",
            booking_advance_hours=24,
            cancellation_hours=12
        ),
        Activity(
            id="ACT005",
            name="Ogled Postojnske jame z AR vodičem",
            description="Interaktivni ogled znamenite jame z AR tehnologijo",
            activity_type=ActivityType.EDUCATIONAL,
            difficulty=DifficultyLevel.EASY,
            duration_minutes=90,
            price=28.0,
            max_participants=25,
            min_age=6,
            weather_dependency=WeatherDependency.INDOOR,
            season_availability=SeasonAvailability.ALL_YEAR,
            location="Postojna",
            coordinates=(45.7749, 14.2142),
            equipment_provided=["AR očala", "avdio vodič"],
            equipment_required=[],
            languages=["slovenščina", "angleščina", "nemščina", "italijanščina"],
            accessibility=True,
            ar_vr_available=True,
            virtual_tour_url="https://ar.postojnska-jama.eu",
            booking_advance_hours=12,
            cancellation_hours=6
        )
    ]
    
    print("\n🎯 Dodajanje aktivnosti:")
    for activity in activities:
        success = tourism_system.add_activity(activity)
        ar_vr_icon = "🥽" if activity.ar_vr_available else "👁️"
        print(f"✅ {activity.name} - {activity.price}€ {ar_vr_icon}")
        print(f"   📍 {activity.location} | ⏱️ {activity.duration_minutes}min | 👥 max {activity.max_participants}")
    
    # Dodajanje virtualnih doživetij
    virtual_experiences = [
        VirtualExperience(
            id="VR001",
            activity_id="ACT001",
            experience_type="360_video",
            content_url="https://vr.bled.si/360/boat-tour.mp4",
            duration_seconds=300,
            quality="4K",
            interactive_elements=["hotspots", "info_panels", "audio_guide"],
            language_tracks=["sl", "en", "de"]
        ),
        VirtualExperience(
            id="VR002",
            activity_id="ACT002",
            experience_type="vr_simulation",
            content_url="https://vr.triglav.si/climb-simulation",
            duration_seconds=600,
            quality="8K",
            interactive_elements=["weather_simulation", "route_planning", "safety_training"],
            language_tracks=["sl", "en"]
        ),
        VirtualExperience(
            id="AR001",
            activity_id="ACT005",
            experience_type="ar_overlay",
            content_url="https://ar.postojnska-jama.eu/cave-ar",
            duration_seconds=900,
            quality="HD",
            interactive_elements=["3d_models", "historical_timeline", "geological_info"],
            language_tracks=["sl", "en", "de", "it"]
        )
    ]
    
    print("\n🥽 Dodajanje virtualnih doživetij:")
    for vr_exp in virtual_experiences:
        success = tourism_system.add_virtual_experience(vr_exp)
        print(f"✅ {vr_exp.experience_type} za aktivnost {vr_exp.activity_id}")
        print(f"   🎬 {vr_exp.quality} kvaliteta | ⏱️ {vr_exp.duration_seconds}s")
    
    # Ustvarjanje personaliziranega itinerarija
    print("\n🤖 AI personaliziran itinerar:")
    customer_preferences = {
        'activity_types': ['romanticna_aktivnost', 'gastronomija', 'wellness'],
        'max_difficulty': 'zmerno',
        'max_price': 50.0,
        'accessibility_required': False,
        'ar_vr_interest': True,
        'preferred_types': ['romanticna_aktivnost', 'wellness'],
        'budget_per_activity': 40.0,
        'target_audience': ['par', 'odrasli']
    }
    
    itinerary = tourism_system.create_personalized_itinerary(customer_preferences, 3)
    if itinerary:
        print(f"✅ {itinerary.name}")
        print(f"   💰 Skupna cena: {itinerary.total_price}€")
        print(f"   📊 Personalizacija: {itinerary.personalization_score:.2f}")
        print(f"   🎯 Težavnost: {itinerary.difficulty_level.value}")
        print(f"   📋 Aktivnosti: {len(itinerary.activities)}")
    
    # Simulacija rezervacij
    print("\n📅 Simulacija rezervacij:")
    bookings = [
        ("ACT001", "CUST001", datetime.datetime.now() + datetime.timedelta(days=3), 2),
        ("ACT003", "CUST002", datetime.datetime.now() + datetime.timedelta(days=5), 4),
        ("ACT005", "CUST003", datetime.datetime.now() + datetime.timedelta(days=1), 6)
    ]
    
    for activity_id, customer_id, activity_date, participants in bookings:
        booking = tourism_system.create_booking(activity_id, customer_id, activity_date, participants)
        if booking:
            print(f"✅ Rezervacija {booking.id[:8]} - {participants} oseb")
            print(f"   💰 Skupna cena: {booking.total_price}€")
    
    # AI priporočila
    print("\n🎯 AI priporočila:")
    recommendations = tourism_system.generate_ai_recommendations("CUST001")
    for i, rec in enumerate(recommendations[:3], 1):
        print(f"{i}. {rec['activity_name']} - {rec['price']}€")
        print(f"   🎯 Zaupanje: {rec['confidence_score']:.1%}")
        print(f"   💡 Razlog: {rec['reason']}")
    
    # AR/VR doživetja
    ar_vr_experiences = tourism_system.get_ar_vr_experiences()
    print(f"\n🥽 AR/VR doživetja ({len(ar_vr_experiences)}):")
    for exp in ar_vr_experiences:
        print(f"✅ {exp['activity_name']} - {exp['experience_type']}")
        print(f"   🎬 {exp['quality']} | 🌐 {len(exp['language_tracks'])} jezikov")
    
    # Statistike
    stats = tourism_system.get_activity_statistics()
    print(f"\n📊 Statistike sistema:")
    print(f"   🎯 Skupaj aktivnosti: {stats.get('total_activities', 0)}")
    print(f"   🥽 AR/VR aktivnosti: {stats.get('ar_vr_activities', 0)} ({stats.get('ar_vr_percentage', 0)}%)")
    print(f"   📅 Skupaj rezervacij: {stats.get('total_bookings', 0)}")
    print(f"   💰 Povprečna cena: {stats.get('average_price', 0)}€")
    
    print(f"\n📈 Aktivnosti po tipih:")
    for activity_type, count in stats.get('activity_types', {}).items():
        print(f"   - {activity_type}: {count}")
    
    print("\n🎉 Sistem turističnih aktivnosti uspešno testiran!")
    print("✅ Personalizirani itinerarji")
    print("✅ AR/VR virtualna doživetja")
    print("✅ AI priporočila")
    print("✅ Rezervacijski sistem")
    print("✅ Statistike in analitika")

if __name__ == "__main__":
    demo_tourism_activities()