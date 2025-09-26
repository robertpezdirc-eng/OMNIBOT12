#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌍 Omni Tourism Planner
========================

Turistični načrtovalec za:
- Planiranje izletov in potovanj
- Upravljanje turističnih agencij
- Optimizacija turističnih storitev
- Rezervacije in booking
- Lokalne izkušnje in kultura
- Trajnostni turizem

Avtor: Omni AI Assistant
Datum: 22. september 2025
Verzija: 1.0 Production
"""

import json
import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import statistics
import random

# Konfiguracija
TOURISM_DB = "omni/data/tourism.db"
TOURISM_LOG = "omni/logs/tourism.log"
DESTINATIONS_FILE = "omni/data/destinations.json"
PACKAGES_FILE = "omni/data/tourism_packages.json"

# Logging
os.makedirs(os.path.dirname(TOURISM_LOG), exist_ok=True)
logger = logging.getLogger(__name__)

def __name__():
    return "tourism_planner"

class TripType(Enum):
    ADVENTURE = "adventure"
    CULTURAL = "cultural"
    RELAXATION = "relaxation"
    BUSINESS = "business"
    FAMILY = "family"
    ROMANTIC = "romantic"
    ECO_TOURISM = "eco_tourism"

class AccommodationType(Enum):
    HOTEL = "hotel"
    HOSTEL = "hostel"
    APARTMENT = "apartment"
    CAMPING = "camping"
    GLAMPING = "glamping"
    GUESTHOUSE = "guesthouse"

class TransportType(Enum):
    CAR = "car"
    BUS = "bus"
    TRAIN = "train"
    PLANE = "plane"
    BIKE = "bike"
    WALKING = "walking"

class Season(Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"

@dataclass
class Destination:
    id: str
    name: str
    country: str
    region: str
    coordinates: Dict[str, float]  # lat, lng
    description: str
    best_season: Season
    activities: List[str]
    accommodation_types: List[AccommodationType]
    average_cost_per_day: float  # EUR
    sustainability_score: float  # 0-10
    cultural_highlights: List[str]
    local_cuisine: List[str]

@dataclass
class TourismPackage:
    id: str
    name: str
    destination_ids: List[str]
    duration_days: int
    trip_type: TripType
    price_per_person: float
    max_participants: int
    included_services: List[str]
    activities: List[str]
    accommodation_type: AccommodationType
    transport_type: TransportType
    sustainability_rating: float
    available_dates: List[datetime]

@dataclass
class Booking:
    id: str
    package_id: str
    customer_name: str
    customer_email: str
    participants: int
    booking_date: datetime
    travel_date: datetime
    total_price: float
    status: str  # confirmed, pending, cancelled
    special_requests: List[str]

@dataclass
class LocalExperience:
    id: str
    destination_id: str
    name: str
    description: str
    duration_hours: float
    price_per_person: float
    max_participants: int
    cultural_value: float  # 0-10
    local_guide_required: bool
    seasonal_availability: List[Season]

class TourismPlanner:
    """🌍 Turistični načrtovalec Omni"""
    
    def __init__(self):
        self.destinations = {}
        self.packages = {}
        self.bookings = []
        self.local_experiences = {}
        self._init_database()
        self._load_destinations()
        self._load_packages()
        logger.info("🌍 Turistični načrtovalec inicializiran")
    
    def _init_database(self):
        """Inicializacija turistične baze"""
        try:
            os.makedirs(os.path.dirname(TOURISM_DB), exist_ok=True)
            conn = sqlite3.connect(TOURISM_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS destinations (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    country TEXT NOT NULL,
                    region TEXT NOT NULL,
                    coordinates TEXT NOT NULL,
                    description TEXT NOT NULL,
                    best_season TEXT NOT NULL,
                    activities TEXT NOT NULL,
                    accommodation_types TEXT NOT NULL,
                    average_cost_per_day REAL NOT NULL,
                    sustainability_score REAL NOT NULL,
                    cultural_highlights TEXT NOT NULL,
                    local_cuisine TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tourism_packages (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    destination_ids TEXT NOT NULL,
                    duration_days INTEGER NOT NULL,
                    trip_type TEXT NOT NULL,
                    price_per_person REAL NOT NULL,
                    max_participants INTEGER NOT NULL,
                    included_services TEXT NOT NULL,
                    activities TEXT NOT NULL,
                    accommodation_type TEXT NOT NULL,
                    transport_type TEXT NOT NULL,
                    sustainability_rating REAL NOT NULL,
                    available_dates TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS bookings (
                    id TEXT PRIMARY KEY,
                    package_id TEXT NOT NULL,
                    customer_name TEXT NOT NULL,
                    customer_email TEXT NOT NULL,
                    participants INTEGER NOT NULL,
                    booking_date TEXT NOT NULL,
                    travel_date TEXT NOT NULL,
                    total_price REAL NOT NULL,
                    status TEXT NOT NULL,
                    special_requests TEXT,
                    FOREIGN KEY (package_id) REFERENCES tourism_packages (id)
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS local_experiences (
                    id TEXT PRIMARY KEY,
                    destination_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    duration_hours REAL NOT NULL,
                    price_per_person REAL NOT NULL,
                    max_participants INTEGER NOT NULL,
                    cultural_value REAL NOT NULL,
                    local_guide_required BOOLEAN NOT NULL,
                    seasonal_availability TEXT NOT NULL,
                    FOREIGN KEY (destination_id) REFERENCES destinations (id)
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji turistične baze: {e}")
    
    def _load_destinations(self):
        """Naloži destinacije"""
        try:
            if os.path.exists(DESTINATIONS_FILE):
                with open(DESTINATIONS_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for dest_data in data:
                        dest = Destination(**dest_data)
                        self.destinations[dest.id] = dest
            else:
                self._create_default_destinations()
                
        except Exception as e:
            logger.error(f"❌ Napaka pri nalaganju destinacij: {e}")
            self._create_default_destinations()
    
    def _create_default_destinations(self):
        """Ustvari privzete destinacije"""
        default_destinations = [
            {
                "id": "DEST_BLED",
                "name": "Bled",
                "country": "Slovenija",
                "region": "Gorenjska",
                "coordinates": {"lat": 46.3683, "lng": 14.1147},
                "description": "Čudovito alpsko jezero z otokom in gradom",
                "best_season": Season.SUMMER.value,
                "activities": ["veslanje", "pohodništvo", "fotografiranje", "obisk gradu"],
                "accommodation_types": [AccommodationType.HOTEL.value, AccommodationType.GUESTHOUSE.value],
                "average_cost_per_day": 80.0,
                "sustainability_score": 8.5,
                "cultural_highlights": ["Blejski grad", "Cerkev na otoku", "Kremšnita"],
                "local_cuisine": ["kremšnita", "postrv", "štruklji"]
            },
            {
                "id": "DEST_KOLPA",
                "name": "Kolpa",
                "country": "Slovenija",
                "region": "Dolenjska",
                "coordinates": {"lat": 45.5547, "lng": 15.1675},
                "description": "Najčistejša in najlepša slovenska reka",
                "best_season": Season.SUMMER.value,
                "activities": ["kopanje", "kanuiranje", "ribolov", "kampiranje"],
                "accommodation_types": [AccommodationType.CAMPING.value, AccommodationType.GLAMPING.value],
                "average_cost_per_day": 45.0,
                "sustainability_score": 9.2,
                "cultural_highlights": ["Stari grad Žužemberk", "Kostanjevica na Krki"],
                "local_cuisine": ["cvičkova klobasa", "belokranjska pogača", "orehova potica"]
            },
            {
                "id": "DEST_LJUBLJANA",
                "name": "Ljubljana",
                "country": "Slovenija",
                "region": "Osrednjeslovenska",
                "coordinates": {"lat": 46.0569, "lng": 14.5058},
                "description": "Zelena prestolnica Slovenije",
                "best_season": Season.SPRING.value,
                "activities": ["mestni sprehodi", "muzeji", "galerije", "kulinarika"],
                "accommodation_types": [AccommodationType.HOTEL.value, AccommodationType.HOSTEL.value, AccommodationType.APARTMENT.value],
                "average_cost_per_day": 65.0,
                "sustainability_score": 8.8,
                "cultural_highlights": ["Ljubljanski grad", "Tromostovje", "Tivoli park"],
                "local_cuisine": ["žlikrofi", "kranjska klobasa", "prekmurska gibanica"]
            },
            {
                "id": "DEST_PIRAN",
                "name": "Piran",
                "country": "Slovenija",
                "region": "Primorska",
                "coordinates": {"lat": 45.5285, "lng": 13.5683},
                "description": "Beneška arhitektura ob Jadranskem morju",
                "best_season": Season.SUMMER.value,
                "activities": ["kopanje", "potapljanje", "degustacija vin", "obisk solinarjev"],
                "accommodation_types": [AccommodationType.HOTEL.value, AccommodationType.APARTMENT.value],
                "average_cost_per_day": 70.0,
                "sustainability_score": 7.8,
                "cultural_highlights": ["Tartinijev trg", "Piranske soline", "Cerkev sv. Jurija"],
                "local_cuisine": ["morski sadeži", "istrska malvazija", "pršut"]
            }
        ]
        
        for dest_data in default_destinations:
            dest = Destination(
                id=dest_data["id"],
                name=dest_data["name"],
                country=dest_data["country"],
                region=dest_data["region"],
                coordinates=dest_data["coordinates"],
                description=dest_data["description"],
                best_season=Season(dest_data["best_season"]),
                activities=dest_data["activities"],
                accommodation_types=[AccommodationType(t) for t in dest_data["accommodation_types"]],
                average_cost_per_day=dest_data["average_cost_per_day"],
                sustainability_score=dest_data["sustainability_score"],
                cultural_highlights=dest_data["cultural_highlights"],
                local_cuisine=dest_data["local_cuisine"]
            )
            self.destinations[dest.id] = dest
        
        self._save_destinations()
    
    def _save_destinations(self):
        """Shrani destinacije"""
        try:
            os.makedirs(os.path.dirname(DESTINATIONS_FILE), exist_ok=True)
            destinations_data = []
            for dest in self.destinations.values():
                dest_dict = asdict(dest)
                dest_dict["best_season"] = dest.best_season.value
                dest_dict["accommodation_types"] = [t.value for t in dest.accommodation_types]
                destinations_data.append(dest_dict)
            
            with open(DESTINATIONS_FILE, 'w', encoding='utf-8') as f:
                json.dump(destinations_data, f, indent=2, ensure_ascii=False, default=str)
                
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju destinacij: {e}")
    
    def _load_packages(self):
        """Naloži turistične pakete"""
        try:
            if os.path.exists(PACKAGES_FILE):
                with open(PACKAGES_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for pkg_data in data:
                        # Konvertiraj datume
                        pkg_data["available_dates"] = [datetime.fromisoformat(d) for d in pkg_data["available_dates"]]
                        pkg = TourismPackage(**pkg_data)
                        self.packages[pkg.id] = pkg
            else:
                self._create_default_packages()
                
        except Exception as e:
            logger.error(f"❌ Napaka pri nalaganju paketov: {e}")
            self._create_default_packages()
    
    def _create_default_packages(self):
        """Ustvari privzete turistične pakete"""
        # Generiraj datume za naslednje 6 mesecev
        available_dates = []
        for i in range(0, 180, 14):  # Vsak drugi teden
            date = datetime.now() + timedelta(days=i)
            available_dates.append(date)
        
        default_packages = [
            TourismPackage(
                id="PKG_BLED_ROMANTIC",
                name="Romantični vikend na Bledu",
                destination_ids=["DEST_BLED"],
                duration_days=3,
                trip_type=TripType.ROMANTIC,
                price_per_person=180.0,
                max_participants=2,
                included_services=["nastanitev", "zajtrk", "veslanje", "obisk gradu"],
                activities=["romantična večerja", "sprehod okoli jezera", "fotografiranje"],
                accommodation_type=AccommodationType.HOTEL,
                transport_type=TransportType.CAR,
                sustainability_rating=8.0,
                available_dates=available_dates[:10]
            ),
            TourismPackage(
                id="PKG_KOLPA_ADVENTURE",
                name="Adrenalinsko doživetje na Kolpi",
                destination_ids=["DEST_KOLPA"],
                duration_days=5,
                trip_type=TripType.ADVENTURE,
                price_per_person=220.0,
                max_participants=8,
                included_services=["kampiranje", "oprema za kanuiranje", "vodnik", "prehrana"],
                activities=["kanuiranje", "pohodništvo", "ribolov", "taborjenje"],
                accommodation_type=AccommodationType.CAMPING,
                transport_type=TransportType.BUS,
                sustainability_rating=9.5,
                available_dates=available_dates[2:12]
            ),
            TourismPackage(
                id="PKG_LJUBLJANA_CULTURAL",
                name="Kulturni izlet po Ljubljani",
                destination_ids=["DEST_LJUBLJANA"],
                duration_days=2,
                trip_type=TripType.CULTURAL,
                price_per_person=120.0,
                max_participants=15,
                included_services=["vodeni ogledi", "vstopnine", "degustacija"],
                activities=["obisk muzejev", "sprehod po starem mestru", "kulinarična tura"],
                accommodation_type=AccommodationType.HOTEL,
                transport_type=TransportType.WALKING,
                sustainability_rating=7.5,
                available_dates=available_dates[:15]
            ),
            TourismPackage(
                id="PKG_SLOVENIA_GRAND",
                name="Velika tura po Sloveniji",
                destination_ids=["DEST_LJUBLJANA", "DEST_BLED", "DEST_PIRAN", "DEST_KOLPA"],
                duration_days=10,
                trip_type=TripType.CULTURAL,
                price_per_person=850.0,
                max_participants=12,
                included_services=["nastanitev", "transport", "vodnik", "prehrana", "aktivnosti"],
                activities=["vsi kraji", "lokalne izkušnje", "kulinarika", "narava"],
                accommodation_type=AccommodationType.HOTEL,
                transport_type=TransportType.BUS,
                sustainability_rating=8.2,
                available_dates=available_dates[1:8]
            )
        ]
        
        for pkg in default_packages:
            self.packages[pkg.id] = pkg
        
        self._save_packages()
    
    def _save_packages(self):
        """Shrani turistične pakete"""
        try:
            os.makedirs(os.path.dirname(PACKAGES_FILE), exist_ok=True)
            packages_data = []
            for pkg in self.packages.values():
                pkg_dict = asdict(pkg)
                pkg_dict["trip_type"] = pkg.trip_type.value
                pkg_dict["accommodation_type"] = pkg.accommodation_type.value
                pkg_dict["transport_type"] = pkg.transport_type.value
                pkg_dict["available_dates"] = [d.isoformat() for d in pkg.available_dates]
                packages_data.append(pkg_dict)
            
            with open(PACKAGES_FILE, 'w', encoding='utf-8') as f:
                json.dump(packages_data, f, indent=2, ensure_ascii=False, default=str)
                
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju paketov: {e}")
    
    def search_destinations(self, criteria: Dict[str, Any]) -> List[Destination]:
        """Išči destinacije po kriterijih"""
        try:
            results = []
            
            for dest in self.destinations.values():
                match = True
                
                # Filtriraj po regiji
                if "region" in criteria and criteria["region"]:
                    if dest.region.lower() != criteria["region"].lower():
                        match = False
                
                # Filtriraj po sezoni
                if "season" in criteria and criteria["season"]:
                    if dest.best_season.value != criteria["season"]:
                        match = False
                
                # Filtriraj po proračunu
                if "max_budget" in criteria and criteria["max_budget"]:
                    if dest.average_cost_per_day > criteria["max_budget"]:
                        match = False
                
                # Filtriraj po aktivnostih
                if "activities" in criteria and criteria["activities"]:
                    required_activities = criteria["activities"]
                    if not any(activity in dest.activities for activity in required_activities):
                        match = False
                
                # Filtriraj po trajnostnosti
                if "min_sustainability" in criteria and criteria["min_sustainability"]:
                    if dest.sustainability_score < criteria["min_sustainability"]:
                        match = False
                
                if match:
                    results.append(dest)
            
            # Razvrsti po trajnostnosti in ceni
            results.sort(key=lambda x: (-x.sustainability_score, x.average_cost_per_day))
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Napaka pri iskanju destinacij: {e}")
            return []
    
    def create_custom_itinerary(self, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Ustvari prilagojen itinerar"""
        try:
            duration = preferences.get("duration_days", 7)
            budget_per_day = preferences.get("budget_per_day", 100.0)
            trip_type = preferences.get("trip_type", "cultural")
            participants = preferences.get("participants", 2)
            
            # Poišči primerne destinacije
            search_criteria = {
                "max_budget": budget_per_day,
                "activities": preferences.get("preferred_activities", []),
                "min_sustainability": preferences.get("min_sustainability", 7.0)
            }
            
            suitable_destinations = self.search_destinations(search_criteria)
            
            if not suitable_destinations:
                return {"error": "Ni primernih destinacij za vaše kriterije"}
            
            # Ustvari itinerar
            itinerary = {
                "id": f"ITIN_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "duration_days": duration,
                "total_budget": duration * budget_per_day * participants,
                "participants": participants,
                "trip_type": trip_type,
                "destinations": [],
                "daily_schedule": [],
                "sustainability_score": 0.0,
                "cultural_experiences": [],
                "local_cuisine_recommendations": []
            }
            
            # Razporedi destinacije
            days_per_destination = max(1, duration // min(len(suitable_destinations), 4))
            selected_destinations = suitable_destinations[:duration // days_per_destination]
            
            current_day = 1
            total_sustainability = 0.0
            
            for dest in selected_destinations:
                dest_days = min(days_per_destination, duration - current_day + 1)
                
                itinerary["destinations"].append({
                    "destination": dest.name,
                    "days": dest_days,
                    "activities": dest.activities[:3],  # Top 3 aktivnosti
                    "accommodation": dest.accommodation_types[0].value,
                    "daily_cost": dest.average_cost_per_day
                })
                
                # Dodaj dnevni urnik
                for day in range(dest_days):
                    day_number = current_day + day
                    daily_activities = self._generate_daily_activities(dest, trip_type)
                    
                    itinerary["daily_schedule"].append({
                        "day": day_number,
                        "destination": dest.name,
                        "morning": daily_activities["morning"],
                        "afternoon": daily_activities["afternoon"],
                        "evening": daily_activities["evening"],
                        "estimated_cost": dest.average_cost_per_day
                    })
                
                # Dodaj kulturne izkušnje
                itinerary["cultural_experiences"].extend(dest.cultural_highlights[:2])
                itinerary["local_cuisine_recommendations"].extend(dest.local_cuisine[:2])
                
                total_sustainability += dest.sustainability_score
                current_day += dest_days
                
                if current_day > duration:
                    break
            
            # Izračunaj povprečno trajnostnost
            if selected_destinations:
                itinerary["sustainability_score"] = total_sustainability / len(selected_destinations)
            
            # Dodaj priporočila
            itinerary["recommendations"] = self._generate_travel_recommendations(itinerary)
            
            return itinerary
            
        except Exception as e:
            logger.error(f"❌ Napaka pri ustvarjanju itinerarja: {e}")
            return {"error": str(e)}
    
    def _generate_daily_activities(self, destination: Destination, trip_type: str) -> Dict[str, str]:
        """Generiraj dnevne aktivnosti"""
        activities = destination.activities.copy()
        random.shuffle(activities)
        
        if trip_type == "adventure":
            focus_activities = [a for a in activities if any(word in a.lower() 
                             for word in ["pohodništvo", "kanuiranje", "plezanje", "kolesarjenje"])]
        elif trip_type == "cultural":
            focus_activities = [a for a in activities if any(word in a.lower() 
                             for word in ["obisk", "muzej", "galerija", "spomenik"])]
        elif trip_type == "relaxation":
            focus_activities = [a for a in activities if any(word in a.lower() 
                             for word in ["kopanje", "sprehod", "sproščanje", "wellness"])]
        else:
            focus_activities = activities
        
        if not focus_activities:
            focus_activities = activities
        
        return {
            "morning": focus_activities[0] if focus_activities else "Zajtrk in sprehod",
            "afternoon": focus_activities[1] if len(focus_activities) > 1 else "Kosilo in počitek",
            "evening": "Večerja z lokalno kulinariko"
        }
    
    def _generate_travel_recommendations(self, itinerary: Dict[str, Any]) -> List[str]:
        """Generiraj potovalna priporočila"""
        recommendations = []
        
        # Trajnostna priporočila
        if itinerary["sustainability_score"] > 8.0:
            recommendations.append("Odličen izbor za trajnostno potovanje!")
        
        # Sezonska priporočila
        current_season = self._get_current_season()
        recommendations.append(f"Trenutna sezona ({current_season}) je primerna za večino aktivnosti")
        
        # Proračunska priporočila
        avg_daily_cost = itinerary["total_budget"] / itinerary["duration_days"] / itinerary["participants"]
        if avg_daily_cost < 60:
            recommendations.append("Ekonomičen izbor - odličen za proračunsko potovanje")
        elif avg_daily_cost > 100:
            recommendations.append("Premium izkušnja z visokokakovostnimi storitvami")
        
        # Kulturna priporočila
        if len(itinerary["cultural_experiences"]) > 5:
            recommendations.append("Bogata kulturna izkušnja z mnogimi znamenitostmi")
        
        # Kulinarična priporočila
        recommendations.append("Ne pozabite poskusiti lokalne specialitete!")
        
        return recommendations
    
    def _get_current_season(self) -> str:
        """Pridobi trenutno sezono"""
        month = datetime.now().month
        if month in [3, 4, 5]:
            return "pomlad"
        elif month in [6, 7, 8]:
            return "poletje"
        elif month in [9, 10, 11]:
            return "jesen"
        else:
            return "zima"
    
    def create_booking(self, package_id: str, customer_name: str, customer_email: str,
                      participants: int, travel_date: datetime, special_requests: List[str] = None) -> str:
        """Ustvari rezervacijo"""
        try:
            if package_id not in self.packages:
                return ""
            
            package = self.packages[package_id]
            
            # Preveri razpoložljivost
            if travel_date not in package.available_dates:
                logger.error(f"❌ Datum {travel_date} ni na voljo za paket {package_id}")
                return ""
            
            if participants > package.max_participants:
                logger.error(f"❌ Preveč udeležencev ({participants}) za paket {package_id}")
                return ""
            
            booking_id = f"BOOK_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            total_price = package.price_per_person * participants
            
            booking = Booking(
                id=booking_id,
                package_id=package_id,
                customer_name=customer_name,
                customer_email=customer_email,
                participants=participants,
                booking_date=datetime.now(),
                travel_date=travel_date,
                total_price=total_price,
                status="confirmed",
                special_requests=special_requests or []
            )
            
            # Shrani v bazo
            conn = sqlite3.connect(TOURISM_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO bookings 
                (id, package_id, customer_name, customer_email, participants,
                 booking_date, travel_date, total_price, status, special_requests)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                booking.id, booking.package_id, booking.customer_name,
                booking.customer_email, booking.participants,
                booking.booking_date.isoformat(), booking.travel_date.isoformat(),
                booking.total_price, booking.status,
                json.dumps(booking.special_requests)
            ))
            
            conn.commit()
            conn.close()
            
            self.bookings.append(booking)
            
            logger.info(f"🌍 Ustvarjena rezervacija: {booking_id} za {customer_name}")
            return booking_id
            
        except Exception as e:
            logger.error(f"❌ Napaka pri ustvarjanju rezervacije: {e}")
            return ""
    
    def auto_optimize(self) -> Dict[str, Any]:
        """Avtomatska turistična optimizacija"""
        try:
            optimization_results = {
                "timestamp": datetime.now().isoformat(),
                "packages_optimized": 0,
                "bookings_processed": len(self.bookings),
                "revenue_generated": 0.0,
                "sustainability_improvements": 0,
                "customer_satisfaction": 0.0
            }
            
            # 1. Optimiziraj cene glede na povpraševanje
            current_season = self._get_current_season()
            for package in self.packages.values():
                # Simuliraj sezonsko prilagajanje cen
                if current_season == "poletje":
                    # Povišaj cene za poletne destinacije
                    summer_destinations = [d for d in package.destination_ids 
                                         if d in self.destinations and 
                                         self.destinations[d].best_season == Season.SUMMER]
                    if summer_destinations:
                        package.price_per_person *= 1.1  # 10% povišanje
                        optimization_results["packages_optimized"] += 1
                
                elif current_season == "zima":
                    # Znižaj cene za poletne destinacije
                    summer_destinations = [d for d in package.destination_ids 
                                         if d in self.destinations and 
                                         self.destinations[d].best_season == Season.SUMMER]
                    if summer_destinations:
                        package.price_per_person *= 0.9  # 10% znižanje
                        optimization_results["packages_optimized"] += 1
            
            # 2. Izračunaj prihodke
            total_revenue = sum(booking.total_price for booking in self.bookings)
            optimization_results["revenue_generated"] = total_revenue
            
            # 3. Izboljšaj trajnostnost
            for dest in self.destinations.values():
                if dest.sustainability_score < 8.0:
                    # Simuliraj izboljšanje trajnostnosti
                    dest.sustainability_score = min(dest.sustainability_score + 0.1, 10.0)
                    optimization_results["sustainability_improvements"] += 1
            
            # 4. Oceni zadovoljstvo strank
            if self.bookings:
                # Simuliraj zadovoljstvo na podlagi trajnostnosti in cene
                satisfaction_scores = []
                for booking in self.bookings:
                    package = self.packages.get(booking.package_id)
                    if package:
                        # Višja trajnostnost = višje zadovoljstvo
                        sustainability_factor = package.sustainability_rating / 10.0
                        # Nižja cena = višje zadovoljstvo
                        price_factor = max(0.5, 1.0 - (package.price_per_person / 1000.0))
                        satisfaction = (sustainability_factor + price_factor) / 2.0
                        satisfaction_scores.append(satisfaction)
                
                if satisfaction_scores:
                    optimization_results["customer_satisfaction"] = statistics.mean(satisfaction_scores)
            
            # 5. Izračunaj učinkovitost
            total_packages = len(self.packages)
            if total_packages > 0:
                efficiency = min(
                    (optimization_results["packages_optimized"] + 
                     optimization_results["sustainability_improvements"]) / (total_packages * 2), 
                    1.0
                )
            else:
                efficiency = 0.0
            
            logger.info(f"🌍 Turistična optimizacija: {optimization_results['packages_optimized']} paketov optimiziranih")
            
            return {
                "success": True,
                "message": f"Turistična optimizacija dokončana",
                "efficiency": efficiency,
                "cost_savings": optimization_results["packages_optimized"] * 25.0,  # Simulacija prihrankov
                "energy_reduction": optimization_results["sustainability_improvements"] * 0.05,  # 5% na izboljšanje
                "revenue_generated": optimization_results["revenue_generated"],
                "packages_optimized": optimization_results["packages_optimized"],
                "sustainability_score": sum(d.sustainability_score for d in self.destinations.values()) / len(self.destinations),
                "customer_satisfaction": optimization_results["customer_satisfaction"]
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri avtomatski turistični optimizaciji: {e}")
            return {
                "success": False,
                "message": f"Napaka pri turistični optimizaciji: {str(e)}",
                "efficiency": 0.0,
                "cost_savings": 0.0,
                "energy_reduction": 0.0
            }
    
    def get_tourism_analytics(self) -> Dict[str, Any]:
        """Pridobi turistične analitike"""
        try:
            # Statistike destinacij
            total_destinations = len(self.destinations)
            avg_sustainability = statistics.mean([d.sustainability_score for d in self.destinations.values()])
            avg_cost = statistics.mean([d.average_cost_per_day for d in self.destinations.values()])
            
            # Statistike paketov
            total_packages = len(self.packages)
            total_bookings = len(self.bookings)
            
            # Prihodki
            total_revenue = sum(booking.total_price for booking in self.bookings)
            
            # Priljubljene destinacije
            destination_popularity = {}
            for booking in self.bookings:
                package = self.packages.get(booking.package_id)
                if package:
                    for dest_id in package.destination_ids:
                        destination_popularity[dest_id] = destination_popularity.get(dest_id, 0) + 1
            
            popular_destinations = sorted(destination_popularity.items(), 
                                        key=lambda x: x[1], reverse=True)[:3]
            
            return {
                "destinations": {
                    "total": total_destinations,
                    "average_sustainability": round(avg_sustainability, 2),
                    "average_daily_cost": round(avg_cost, 2),
                    "most_popular": [self.destinations[dest_id].name for dest_id, _ in popular_destinations]
                },
                "packages": {
                    "total": total_packages,
                    "total_bookings": total_bookings,
                    "booking_rate": round(total_bookings / max(total_packages, 1), 2)
                },
                "revenue": {
                    "total": round(total_revenue, 2),
                    "average_per_booking": round(total_revenue / max(total_bookings, 1), 2)
                },
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju turističnih analitik: {e}")
            return {}

# Globalna instanca
tourism_planner = TourismPlanner()

# Funkcije za kompatibilnost
def auto_optimize():
    return tourism_planner.auto_optimize()

def search_destinations(criteria: Dict[str, Any]):
    return tourism_planner.search_destinations(criteria)

def create_custom_itinerary(preferences: Dict[str, Any]):
    return tourism_planner.create_custom_itinerary(preferences)

def create_booking(package_id: str, customer_name: str, customer_email: str,
                  participants: int, travel_date: str, special_requests: List[str] = None):
    travel_dt = datetime.fromisoformat(travel_date)
    return tourism_planner.create_booking(package_id, customer_name, customer_email,
                                        participants, travel_dt, special_requests)

def get_tourism_analytics():
    return tourism_planner.get_tourism_analytics()

if __name__ == "__main__":
    # Test turističnega načrtovalca
    print("🌍 Testiranje turističnega načrtovalca...")
    
    # Poišči destinacije
    criteria = {"region": "Gorenjska", "max_budget": 100}
    destinations = search_destinations(criteria)
    print(f"Najdenih destinacij: {len(destinations)}")
    
    # Ustvari itinerar
    preferences = {
        "duration_days": 5,
        "budget_per_day": 80,
        "trip_type": "cultural",
        "participants": 2,
        "preferred_activities": ["pohodništvo", "fotografiranje"]
    }
    itinerary = create_custom_itinerary(preferences)
    print(f"Ustvarjen itinerar: {itinerary.get('id', 'Napaka')}")
    
    # Izvedi optimizacijo
    result = auto_optimize()
    print(f"Rezultat optimizacije: {result}")
    
    # Pridobi analitike
    analytics = get_tourism_analytics()
    print(f"Turistične analitike: {analytics}")