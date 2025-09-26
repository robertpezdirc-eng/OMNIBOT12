"""
🏕️ OMNI TOURISM MODULE
Turizem, kampi, hoteli, booking sistemi, itinerarji
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class AccommodationType(Enum):
    HOTEL = "hotel"
    CAMP = "camp"
    APARTMENT = "apartment"
    HOSTEL = "hostel"
    VILLA = "villa"

class BookingStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class ActivityType(Enum):
    OUTDOOR = "outdoor"
    CULTURAL = "cultural"
    ADVENTURE = "adventure"
    RELAXATION = "relaxation"
    GASTRONOMY = "gastronomy"

@dataclass
class Accommodation:
    id: str
    name: str
    type: AccommodationType
    location: str
    price_per_night: float
    currency: str
    capacity: int
    amenities: List[str]
    rating: float
    contact_info: Dict[str, str]

@dataclass
class Booking:
    id: str
    accommodation_id: str
    guest_name: str
    guest_email: str
    check_in: datetime
    check_out: datetime
    guests_count: int
    total_price: float
    status: BookingStatus
    special_requests: str

@dataclass
class Activity:
    id: str
    name: str
    type: ActivityType
    location: str
    duration_hours: int
    price: float
    currency: str
    description: str
    min_participants: int
    max_participants: int

@dataclass
class Itinerary:
    id: str
    name: str
    destination: str
    duration_days: int
    activities: List[str]  # Activity IDs
    accommodations: List[str]  # Accommodation IDs
    total_cost: float
    difficulty_level: str

class TourismModule:
    """
    🏖️ Omni Tourism Module
    - Upravljanje nastanitev
    - Booking sistem
    - Aktivnosti in itinerarji
    - Analitika turizma
    """
    
    def __init__(self, db_path: str = "tourism.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela nastanitev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accommodations (
                id TEXT PRIMARY KEY,
                name TEXT,
                type TEXT,
                location TEXT,
                price_per_night REAL,
                currency TEXT,
                capacity INTEGER,
                amenities TEXT,
                rating REAL,
                contact_info TEXT
            )
        ''')
        
        # Tabela rezervacij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                accommodation_id TEXT,
                guest_name TEXT,
                guest_email TEXT,
                check_in TEXT,
                check_out TEXT,
                guests_count INTEGER,
                total_price REAL,
                status TEXT,
                special_requests TEXT,
                FOREIGN KEY (accommodation_id) REFERENCES accommodations (id)
            )
        ''')
        
        # Tabela aktivnosti
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activities (
                id TEXT PRIMARY KEY,
                name TEXT,
                type TEXT,
                location TEXT,
                duration_hours INTEGER,
                price REAL,
                currency TEXT,
                description TEXT,
                min_participants INTEGER,
                max_participants INTEGER
            )
        ''')
        
        # Tabela itinerarjev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS itineraries (
                id TEXT PRIMARY KEY,
                name TEXT,
                destination TEXT,
                duration_days INTEGER,
                activities TEXT,
                accommodations TEXT,
                total_cost REAL,
                difficulty_level TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_accommodation(self, accommodation: Accommodation) -> bool:
        """Dodaj novo nastanitev"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO accommodations 
                (id, name, type, location, price_per_night, currency, capacity, 
                 amenities, rating, contact_info)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                accommodation.id,
                accommodation.name,
                accommodation.type.value,
                accommodation.location,
                accommodation.price_per_night,
                accommodation.currency,
                accommodation.capacity,
                json.dumps(accommodation.amenities),
                accommodation.rating,
                json.dumps(accommodation.contact_info)
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Napaka pri dodajanju nastanitve: {e}")
            return False
    
    def search_accommodations(self, 
                            location: Optional[str] = None,
                            accommodation_type: Optional[AccommodationType] = None,
                            max_price: Optional[float] = None,
                            min_capacity: Optional[int] = None) -> List[Accommodation]:
        """Išči nastanitve s filtri"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT * FROM accommodations WHERE 1=1"
        params = []
        
        if location:
            query += " AND location LIKE ?"
            params.append(f"%{location}%")
        
        if accommodation_type:
            query += " AND type = ?"
            params.append(accommodation_type.value)
            
        if max_price:
            query += " AND price_per_night <= ?"
            params.append(max_price)
            
        if min_capacity:
            query += " AND capacity >= ?"
            params.append(min_capacity)
        
        query += " ORDER BY rating DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        accommodations = []
        for row in rows:
            accommodations.append(Accommodation(
                id=row[0],
                name=row[1],
                type=AccommodationType(row[2]),
                location=row[3],
                price_per_night=row[4],
                currency=row[5],
                capacity=row[6],
                amenities=json.loads(row[7]),
                rating=row[8],
                contact_info=json.loads(row[9])
            ))
        
        return accommodations
    
    def create_booking(self, booking: Booking) -> bool:
        """Ustvari novo rezervacijo"""
        try:
            # Preveri razpoložljivost
            if not self.check_availability(booking.accommodation_id, booking.check_in, booking.check_out):
                print("Nastanitev ni na voljo v izbranem terminu")
                return False
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO bookings 
                (id, accommodation_id, guest_name, guest_email, check_in, check_out,
                 guests_count, total_price, status, special_requests)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                booking.id,
                booking.accommodation_id,
                booking.guest_name,
                booking.guest_email,
                booking.check_in.isoformat(),
                booking.check_out.isoformat(),
                booking.guests_count,
                booking.total_price,
                booking.status.value,
                booking.special_requests
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju rezervacije: {e}")
            return False
    
    def check_availability(self, accommodation_id: str, check_in: datetime, check_out: datetime) -> bool:
        """Preveri razpoložljivost nastanitve"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT COUNT(*) FROM bookings 
            WHERE accommodation_id = ? 
            AND status IN ('confirmed', 'pending')
            AND (
                (check_in <= ? AND check_out > ?) OR
                (check_in < ? AND check_out >= ?) OR
                (check_in >= ? AND check_out <= ?)
            )
        ''', (
            accommodation_id,
            check_in.isoformat(), check_in.isoformat(),
            check_out.isoformat(), check_out.isoformat(),
            check_in.isoformat(), check_out.isoformat()
        ))
        
        count = cursor.fetchone()[0]
        conn.close()
        
        return count == 0
    
    def get_bookings(self, 
                    accommodation_id: Optional[str] = None,
                    status: Optional[BookingStatus] = None) -> List[Booking]:
        """Pridobi rezervacije s filtri"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT * FROM bookings WHERE 1=1"
        params = []
        
        if accommodation_id:
            query += " AND accommodation_id = ?"
            params.append(accommodation_id)
        
        if status:
            query += " AND status = ?"
            params.append(status.value)
        
        query += " ORDER BY check_in DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        bookings = []
        for row in rows:
            bookings.append(Booking(
                id=row[0],
                accommodation_id=row[1],
                guest_name=row[2],
                guest_email=row[3],
                check_in=datetime.fromisoformat(row[4]),
                check_out=datetime.fromisoformat(row[5]),
                guests_count=row[6],
                total_price=row[7],
                status=BookingStatus(row[8]),
                special_requests=row[9]
            ))
        
        return bookings
    
    def add_activity(self, activity: Activity) -> bool:
        """Dodaj novo aktivnost"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO activities 
                (id, name, type, location, duration_hours, price, currency,
                 description, min_participants, max_participants)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                activity.id,
                activity.name,
                activity.type.value,
                activity.location,
                activity.duration_hours,
                activity.price,
                activity.currency,
                activity.description,
                activity.min_participants,
                activity.max_participants
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Napaka pri dodajanju aktivnosti: {e}")
            return False
    
    def search_activities(self, 
                         location: Optional[str] = None,
                         activity_type: Optional[ActivityType] = None,
                         max_price: Optional[float] = None) -> List[Activity]:
        """Išči aktivnosti s filtri"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT * FROM activities WHERE 1=1"
        params = []
        
        if location:
            query += " AND location LIKE ?"
            params.append(f"%{location}%")
        
        if activity_type:
            query += " AND type = ?"
            params.append(activity_type.value)
            
        if max_price:
            query += " AND price <= ?"
            params.append(max_price)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        activities = []
        for row in rows:
            activities.append(Activity(
                id=row[0],
                name=row[1],
                type=ActivityType(row[2]),
                location=row[3],
                duration_hours=row[4],
                price=row[5],
                currency=row[6],
                description=row[7],
                min_participants=row[8],
                max_participants=row[9]
            ))
        
        return activities
    
    def create_itinerary(self, itinerary: Itinerary) -> bool:
        """Ustvari nov itinerar"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO itineraries 
                (id, name, destination, duration_days, activities, accommodations,
                 total_cost, difficulty_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                itinerary.id,
                itinerary.name,
                itinerary.destination,
                itinerary.duration_days,
                json.dumps(itinerary.activities),
                json.dumps(itinerary.accommodations),
                itinerary.total_cost,
                itinerary.difficulty_level
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju itinerarija: {e}")
            return False
    
    def generate_itinerary_suggestions(self, 
                                     destination: str, 
                                     duration_days: int,
                                     budget: float,
                                     interests: List[ActivityType]) -> List[Dict]:
        """Generiraj predloge itinerarjev"""
        suggestions = []
        
        # Išči nastanitve
        accommodations = self.search_accommodations(location=destination)
        
        # Išči aktivnosti
        activities = []
        for interest in interests:
            activities.extend(self.search_activities(location=destination, activity_type=interest))
        
        # Ustvari predloge
        for accommodation in accommodations[:3]:  # Top 3 nastanitve
            daily_accommodation_cost = accommodation.price_per_night
            total_accommodation_cost = daily_accommodation_cost * duration_days
            
            if total_accommodation_cost <= budget * 0.6:  # 60% proračuna za nastanitev
                remaining_budget = budget - total_accommodation_cost
                
                # Izberi aktivnosti v okviru proračuna
                selected_activities = []
                activity_cost = 0
                
                for activity in activities:
                    if activity_cost + activity.price <= remaining_budget:
                        selected_activities.append(activity)
                        activity_cost += activity.price
                
                suggestions.append({
                    'accommodation': accommodation,
                    'activities': selected_activities,
                    'total_cost': total_accommodation_cost + activity_cost,
                    'remaining_budget': budget - (total_accommodation_cost + activity_cost),
                    'value_score': len(selected_activities) * accommodation.rating
                })
        
        # Sortiraj po vrednosti
        suggestions.sort(key=lambda x: x['value_score'], reverse=True)
        
        return suggestions[:5]  # Top 5 predlogov
    
    def get_tourism_analytics(self) -> Dict:
        """Pridobi analitiko turizma"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Statistike rezervacij
        cursor.execute("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'")
        confirmed_bookings = cursor.fetchone()[0]
        
        cursor.execute("SELECT AVG(total_price) FROM bookings WHERE status = 'confirmed'")
        avg_booking_value = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT SUM(total_price) FROM bookings WHERE status = 'confirmed'")
        total_revenue = cursor.fetchone()[0] or 0
        
        # Priljubljene lokacije
        cursor.execute('''
            SELECT a.location, COUNT(b.id) as booking_count
            FROM accommodations a
            JOIN bookings b ON a.id = b.accommodation_id
            WHERE b.status = 'confirmed'
            GROUP BY a.location
            ORDER BY booking_count DESC
            LIMIT 5
        ''')
        popular_locations = cursor.fetchall()
        
        # Sezonska analiza
        cursor.execute('''
            SELECT strftime('%m', check_in) as month, COUNT(*) as bookings
            FROM bookings
            WHERE status = 'confirmed'
            GROUP BY month
            ORDER BY month
        ''')
        seasonal_data = cursor.fetchall()
        
        conn.close()
        
        return {
            'total_confirmed_bookings': confirmed_bookings,
            'average_booking_value': round(avg_booking_value, 2),
            'total_revenue': round(total_revenue, 2),
            'popular_locations': [{'location': loc, 'bookings': count} for loc, count in popular_locations],
            'seasonal_bookings': [{'month': month, 'bookings': count} for month, count in seasonal_data],
            'occupancy_rate': self.calculate_occupancy_rate()
        }
    
    def calculate_occupancy_rate(self) -> float:
        """Izračunaj stopnjo zasedenosti"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Skupno število nastanitev
        cursor.execute("SELECT COUNT(*) FROM accommodations")
        total_accommodations = cursor.fetchone()[0]
        
        if total_accommodations == 0:
            return 0.0
        
        # Rezervacije v zadnjih 30 dneh
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        cursor.execute('''
            SELECT COUNT(DISTINCT accommodation_id) 
            FROM bookings 
            WHERE status = 'confirmed' 
            AND check_in >= ?
        ''', (thirty_days_ago,))
        
        occupied_accommodations = cursor.fetchone()[0]
        conn.close()
        
        return round((occupied_accommodations / total_accommodations) * 100, 2)

# Test funkcije
if __name__ == "__main__":
    # Test tourism modula
    tourism = TourismModule("test_tourism.db")
    
    # Test nastanitev
    accommodation = Accommodation(
        id="camp_001",
        name="Kamp Kolpa",
        type=AccommodationType.CAMP,
        location="Kolpa, Slovenija",
        price_per_night=25.0,
        currency="EUR",
        capacity=4,
        amenities=["wifi", "parking", "restaurant", "river_access"],
        rating=4.5,
        contact_info={"phone": "+386 1 234 5678", "email": "info@kampkolpa.si"}
    )
    
    print("🧪 Testiranje Tourism modula...")
    print(f"Dodajanje nastanitve: {tourism.add_accommodation(accommodation)}")
    
    # Test aktivnosti
    activity = Activity(
        id="rafting_001",
        name="Rafting po Kolpi",
        type=ActivityType.ADVENTURE,
        location="Kolpa, Slovenija",
        duration_hours=3,
        price=35.0,
        currency="EUR",
        description="Vznemirljiv rafting po kristalno čisti Kolpi",
        min_participants=2,
        max_participants=8
    )
    
    print(f"Dodajanje aktivnosti: {tourism.add_activity(activity)}")
    
    # Test rezervacije
    booking = Booking(
        id="booking_001",
        accommodation_id="camp_001",
        guest_name="Janez Novak",
        guest_email="janez@example.com",
        check_in=datetime.now() + timedelta(days=7),
        check_out=datetime.now() + timedelta(days=10),
        guests_count=2,
        total_price=75.0,
        status=BookingStatus.CONFIRMED,
        special_requests="Prosimo za mirno lokacijo"
    )
    
    print(f"Ustvarjanje rezervacije: {tourism.create_booking(booking)}")
    
    # Test predlogov itinerarjev
    suggestions = tourism.generate_itinerary_suggestions(
        destination="Kolpa",
        duration_days=3,
        budget=200.0,
        interests=[ActivityType.ADVENTURE, ActivityType.RELAXATION]
    )
    
    print(f"\n🗺️ Predlogi itinerarjev: {len(suggestions)} najdenih")
    
    # Analitika
    analytics = tourism.get_tourism_analytics()
    print(f"\n📊 Analitika: {analytics['total_confirmed_bookings']} potrjenih rezervacij")
    
    print("\n✅ Tourism modul uspešno testiran!")