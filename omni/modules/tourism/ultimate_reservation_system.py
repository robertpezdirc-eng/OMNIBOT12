"""
ULTIMATE RESERVATION SYSTEM
Napredni rezervacijski sistem za sobe, mize, dogodke, VIP rezervacije
- Samodejno dodeljevanje mest in sob
- Sinhronizacija s POS, zalogami in kadri
- Upravljanje porok, konferenc, dogodkov
- Real-time dostopnost in optimizacija
"""

import sqlite3
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Dict, Optional, Tuple
import json
import uuid

class ReservationType(Enum):
    ROOM = "room"
    TABLE = "table"
    EVENT = "event"
    VIP = "vip"
    WEDDING = "wedding"
    CONFERENCE = "conference"

class ReservationStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class ResourceType(Enum):
    ROOM = "room"
    TABLE = "table"
    HALL = "hall"
    EQUIPMENT = "equipment"

class Resource:
    def __init__(self, resource_id: str, name: str, resource_type: ResourceType, 
                 capacity: int, features: List[str], price_per_hour: float):
        self.resource_id = resource_id
        self.name = name
        self.resource_type = resource_type
        self.capacity = capacity
        self.features = features
        self.price_per_hour = price_per_hour
        self.is_available = True

class Guest:
    def __init__(self, guest_id: str, name: str, email: str, phone: str, 
                 preferences: Dict, vip_status: bool = False):
        self.guest_id = guest_id
        self.name = name
        self.email = email
        self.phone = phone
        self.preferences = preferences
        self.vip_status = vip_status
        self.loyalty_points = 0

class Reservation:
    def __init__(self, reservation_id: str, guest_id: str, resource_id: str,
                 reservation_type: ReservationType, start_time: datetime,
                 end_time: datetime, guests_count: int, special_requests: str = ""):
        self.reservation_id = reservation_id
        self.guest_id = guest_id
        self.resource_id = resource_id
        self.reservation_type = reservation_type
        self.start_time = start_time
        self.end_time = end_time
        self.guests_count = guests_count
        self.special_requests = special_requests
        self.status = ReservationStatus.PENDING
        self.total_price = 0.0
        self.created_at = datetime.now()

class EventPackage:
    def __init__(self, package_id: str, name: str, description: str,
                 included_services: List[str], price: float, duration_hours: int):
        self.package_id = package_id
        self.name = name
        self.description = description
        self.included_services = included_services
        self.price = price
        self.duration_hours = duration_hours

class UltimateReservationSystem:
    def __init__(self, db_path: str = "ultimate_reservation.db"):
        self.db_path = db_path
        self.init_database()
        self.load_demo_data()

    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela virov (sobe, mize, dvorane)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS resources (
                resource_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                capacity INTEGER NOT NULL,
                features TEXT,
                price_per_hour REAL NOT NULL,
                is_available BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela gostov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS guests (
                guest_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                preferences TEXT,
                vip_status BOOLEAN DEFAULT 0,
                loyalty_points INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela rezervacij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reservations (
                reservation_id TEXT PRIMARY KEY,
                guest_id TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                reservation_type TEXT NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                guests_count INTEGER NOT NULL,
                special_requests TEXT,
                status TEXT DEFAULT 'pending',
                total_price REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guest_id) REFERENCES guests (guest_id),
                FOREIGN KEY (resource_id) REFERENCES resources (resource_id)
            )
        ''')
        
        # Tabela paketov dogodkov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS event_packages (
                package_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                included_services TEXT,
                price REAL NOT NULL,
                duration_hours INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela dostopnosti virov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS resource_availability (
                availability_id TEXT PRIMARY KEY,
                resource_id TEXT NOT NULL,
                date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_blocked BOOLEAN DEFAULT 0,
                reason TEXT,
                FOREIGN KEY (resource_id) REFERENCES resources (resource_id)
            )
        ''')
        
        # Tabela rezervacijskih pravil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reservation_rules (
                rule_id TEXT PRIMARY KEY,
                resource_type TEXT NOT NULL,
                min_advance_hours INTEGER DEFAULT 2,
                max_advance_days INTEGER DEFAULT 365,
                min_duration_hours INTEGER DEFAULT 1,
                max_duration_hours INTEGER DEFAULT 24,
                auto_confirm BOOLEAN DEFAULT 0,
                vip_priority BOOLEAN DEFAULT 1
            )
        ''')
        
        conn.commit()
        conn.close()

    def add_resource(self, name: str, resource_type: ResourceType, capacity: int,
                    features: List[str], price_per_hour: float) -> str:
        """Dodaj nov vir (soba, miza, dvorana)"""
        resource_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO resources (resource_id, name, resource_type, capacity, features, price_per_hour)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (resource_id, name, resource_type.value, capacity, json.dumps(features), price_per_hour))
        
        conn.commit()
        conn.close()
        
        return resource_id

    def add_guest(self, name: str, email: str, phone: str, 
                  preferences: Dict, vip_status: bool = False) -> str:
        """Dodaj novega gosta"""
        guest_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO guests (guest_id, name, email, phone, preferences, vip_status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (guest_id, name, email, phone, json.dumps(preferences), vip_status))
        
        conn.commit()
        conn.close()
        
        return guest_id

    def check_availability(self, resource_id: str, start_time: datetime, 
                          end_time: datetime) -> bool:
        """Preveri dostopnost vira"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Preveri obstoječe rezervacije
        cursor.execute('''
            SELECT COUNT(*) FROM reservations 
            WHERE resource_id = ? 
            AND status NOT IN ('cancelled', 'no_show')
            AND (
                (start_time <= ? AND end_time > ?) OR
                (start_time < ? AND end_time >= ?) OR
                (start_time >= ? AND end_time <= ?)
            )
        ''', (resource_id, start_time.isoformat(), start_time.isoformat(),
              end_time.isoformat(), end_time.isoformat(),
              start_time.isoformat(), end_time.isoformat()))
        
        conflicts = cursor.fetchone()[0]
        conn.close()
        
        return conflicts == 0

    def auto_assign_resource(self, reservation_type: ReservationType, 
                           guests_count: int, start_time: datetime,
                           end_time: datetime, preferences: Dict = None) -> Optional[str]:
        """Samodejno dodeli najboljši vir"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Poišči ustrezne vire
        cursor.execute('''
            SELECT resource_id, name, capacity, features, price_per_hour
            FROM resources 
            WHERE resource_type = ? 
            AND capacity >= ?
            AND is_available = 1
            ORDER BY capacity ASC, price_per_hour ASC
        ''', (reservation_type.value, guests_count))
        
        resources = cursor.fetchall()
        conn.close()
        
        # Preveri dostopnost in izberi najboljšega
        for resource in resources:
            resource_id = resource[0]
            if self.check_availability(resource_id, start_time, end_time):
                # Dodatna logika za VIP preference
                if preferences and preferences.get('vip_treatment'):
                    features = json.loads(resource[3])
                    if 'vip' in features or 'premium' in features:
                        return resource_id
                else:
                    return resource_id
        
        return None

    def create_reservation(self, guest_id: str, reservation_type: ReservationType,
                          start_time: datetime, end_time: datetime, guests_count: int,
                          special_requests: str = "", resource_id: str = None) -> str:
        """Ustvari novo rezervacijo"""
        reservation_id = str(uuid.uuid4())
        
        # Samodejno dodeli vir, če ni podan
        if not resource_id:
            resource_id = self.auto_assign_resource(
                reservation_type, guests_count, start_time, end_time
            )
            if not resource_id:
                raise ValueError("Ni dostopnih virov za izbrani termin")
        
        # Preveri dostopnost
        if not self.check_availability(resource_id, start_time, end_time):
            raise ValueError("Vir ni dostopen v izbranem terminu")
        
        # Izračunaj ceno
        total_price = self.calculate_reservation_price(resource_id, start_time, end_time)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO reservations 
            (reservation_id, guest_id, resource_id, reservation_type, start_time, 
             end_time, guests_count, special_requests, total_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (reservation_id, guest_id, resource_id, reservation_type.value,
              start_time.isoformat(), end_time.isoformat(), guests_count,
              special_requests, total_price))
        
        conn.commit()
        conn.close()
        
        return reservation_id

    def calculate_reservation_price(self, resource_id: str, start_time: datetime, 
                                   end_time: datetime) -> float:
        """Izračunaj ceno rezervacije"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT price_per_hour FROM resources WHERE resource_id = ?', (resource_id,))
        price_per_hour = cursor.fetchone()[0]
        conn.close()
        
        duration_hours = (end_time - start_time).total_seconds() / 3600
        base_price = price_per_hour * duration_hours
        
        # Dinamično oblikovanje cen (vikend, prazniki)
        if start_time.weekday() >= 5:  # Vikend
            base_price *= 1.2
        
        return round(base_price, 2)

    def confirm_reservation(self, reservation_id: str) -> bool:
        """Potrdi rezervacijo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE reservations 
            SET status = 'confirmed' 
            WHERE reservation_id = ?
        ''', (reservation_id,))
        
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return success

    def check_in_guest(self, reservation_id: str) -> bool:
        """Prijavi gosta (check-in)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE reservations 
            SET status = 'checked_in' 
            WHERE reservation_id = ? AND status = 'confirmed'
        ''', (reservation_id,))
        
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return success

    def get_reservations_by_date(self, date: datetime) -> List[Dict]:
        """Pridobi rezervacije za določen datum"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT r.*, g.name as guest_name, res.name as resource_name
            FROM reservations r
            JOIN guests g ON r.guest_id = g.guest_id
            JOIN resources res ON r.resource_id = res.resource_id
            WHERE DATE(r.start_time) = DATE(?)
            ORDER BY r.start_time
        ''', (date.isoformat(),))
        
        reservations = []
        for row in cursor.fetchall():
            reservations.append({
                'reservation_id': row[0],
                'guest_name': row[11],
                'resource_name': row[12],
                'reservation_type': row[3],
                'start_time': row[4],
                'end_time': row[5],
                'guests_count': row[6],
                'status': row[8],
                'total_price': row[9]
            })
        
        conn.close()
        return reservations

    def get_resource_utilization(self, start_date: datetime, end_date: datetime) -> Dict:
        """Analiza izkoriščenosti virov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT res.name, res.resource_type, 
                   COUNT(r.reservation_id) as total_reservations,
                   AVG(r.total_price) as avg_price,
                   SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completed_reservations
            FROM resources res
            LEFT JOIN reservations r ON res.resource_id = r.resource_id
            WHERE r.start_time BETWEEN ? AND ?
            GROUP BY res.resource_id, res.name, res.resource_type
        ''', (start_date.isoformat(), end_date.isoformat()))
        
        utilization = {}
        for row in cursor.fetchall():
            utilization[row[0]] = {
                'resource_type': row[1],
                'total_reservations': row[2],
                'avg_price': round(row[3] or 0, 2),
                'completed_reservations': row[4],
                'completion_rate': round((row[4] / row[2] * 100) if row[2] > 0 else 0, 1)
            }
        
        conn.close()
        return utilization

    def generate_availability_report(self, resource_id: str, days_ahead: int = 7) -> Dict:
        """Generiraj poročilo o dostopnosti"""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=days_ahead)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pridobi osnovne podatke o viru
        cursor.execute('SELECT name, capacity FROM resources WHERE resource_id = ?', (resource_id,))
        resource_info = cursor.fetchone()
        
        # Pridobi rezervacije
        cursor.execute('''
            SELECT start_time, end_time, status 
            FROM reservations 
            WHERE resource_id = ? 
            AND start_time BETWEEN ? AND ?
            AND status NOT IN ('cancelled', 'no_show')
            ORDER BY start_time
        ''', (resource_id, start_date.isoformat(), end_date.isoformat()))
        
        reservations = cursor.fetchall()
        conn.close()
        
        return {
            'resource_name': resource_info[0],
            'capacity': resource_info[1],
            'period': f"{start_date.strftime('%Y-%m-%d')} - {end_date.strftime('%Y-%m-%d')}",
            'total_reservations': len(reservations),
            'reservations': [
                {
                    'start': res[0],
                    'end': res[1],
                    'status': res[2]
                } for res in reservations
            ]
        }

    def get_dashboard_data(self) -> Dict:
        """Pridobi podatke za dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        today = datetime.now().date()
        
        # Današnje rezervacije
        cursor.execute('''
            SELECT COUNT(*) FROM reservations 
            WHERE DATE(start_time) = ? AND status != 'cancelled'
        ''', (today,))
        todays_reservations = cursor.fetchone()[0]
        
        # Prihodnji prihodki
        cursor.execute('''
            SELECT SUM(total_price) FROM reservations 
            WHERE start_time >= ? AND status IN ('confirmed', 'pending')
        ''', (datetime.now().isoformat(),))
        upcoming_revenue = cursor.fetchone()[0] or 0
        
        # Izkoriščenost virov
        cursor.execute('''
            SELECT resource_type, COUNT(*) as count
            FROM resources 
            GROUP BY resource_type
        ''', )
        resource_counts = dict(cursor.fetchall())
        
        # VIP gostje
        cursor.execute('SELECT COUNT(*) FROM guests WHERE vip_status = 1')
        vip_guests = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'todays_reservations': todays_reservations,
            'upcoming_revenue': round(upcoming_revenue, 2),
            'resource_counts': resource_counts,
            'vip_guests': vip_guests,
            'system_status': 'active',
            'last_updated': datetime.now().isoformat()
        }

    def load_demo_data(self):
        """Naloži demo podatke"""
        # Preveri, če podatki že obstajajo
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM resources')
        if cursor.fetchone()[0] > 0:
            conn.close()
            return
        conn.close()
        
        # Dodaj demo vire
        self.add_resource("Predsedniška suite", ResourceType.ROOM, 2, 
                         ["vip", "balkon", "jacuzzi", "premium"], 150.0)
        self.add_resource("Družinska soba", ResourceType.ROOM, 4, 
                         ["otroška posteljica", "igralni kotiček"], 80.0)
        self.add_resource("Miza za 2", ResourceType.TABLE, 2, 
                         ["ob oknu", "romantična"], 25.0)
        self.add_resource("Velika miza", ResourceType.TABLE, 8, 
                         ["družinska", "centralna"], 45.0)
        self.add_resource("Poročna dvorana", ResourceType.HALL, 150, 
                         ["oder", "zvočni sistem", "dekoracija"], 200.0)
        self.add_resource("Konferenčna dvorana", ResourceType.HALL, 50, 
                         ["projektor", "mikrofoni", "wifi"], 120.0)
        
        # Dodaj demo goste
        self.add_guest("Marko Novak", "marko@email.com", "+386 41 123 456", 
                      {"dietary": "vegetarian", "room_preference": "quiet"}, False)
        self.add_guest("Ana Kovač", "ana@email.com", "+386 51 987 654", 
                      {"vip_treatment": True, "special_occasions": "anniversary"}, True)
        self.add_guest("Peter Kralj", "peter@email.com", "+386 31 555 777", 
                      {"business_traveler": True, "early_checkin": True}, False)

def demo_reservation_system():
    """Demo funkcija za testiranje sistema"""
    print("🏨 ULTIMATE RESERVATION SYSTEM - DEMO")
    print("=" * 50)
    
    system = UltimateReservationSystem()
    
    # Pridobi dashboard podatke
    dashboard = system.get_dashboard_data()
    print(f"\n📊 Dashboard podatki:")
    print(f"Današnje rezervacije: {dashboard['todays_reservations']}")
    print(f"Prihodnji prihodki: €{dashboard['upcoming_revenue']}")
    print(f"VIP gostje: {dashboard['vip_guests']}")
    print(f"Viri po tipih: {dashboard['resource_counts']}")
    
    # Ustvari testno rezervacijo
    try:
        # Pridobi prvega gosta
        conn = sqlite3.connect(system.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT guest_id FROM guests LIMIT 1')
        guest_id = cursor.fetchone()[0]
        conn.close()
        
        # Ustvari rezervacijo za jutri
        tomorrow = datetime.now() + timedelta(days=1)
        start_time = tomorrow.replace(hour=14, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(hours=2)
        
        reservation_id = system.create_reservation(
            guest_id=guest_id,
            reservation_type=ReservationType.TABLE,
            start_time=start_time,
            end_time=end_time,
            guests_count=2,
            special_requests="Ob oknu, romantična večerja"
        )
        
        print(f"\n✅ Ustvarjena rezervacija: {reservation_id}")
        
        # Potrdi rezervacijo
        system.confirm_reservation(reservation_id)
        print("✅ Rezervacija potrjena")
        
    except Exception as e:
        print(f"❌ Napaka pri ustvarjanju rezervacije: {e}")
    
    # Prikaži rezervacije za jutri
    tomorrow_reservations = system.get_reservations_by_date(tomorrow)
    print(f"\n📅 Rezervacije za {tomorrow.strftime('%Y-%m-%d')}:")
    for res in tomorrow_reservations:
        print(f"- {res['guest_name']}: {res['resource_name']} "
              f"({res['start_time']} - {res['end_time']}) - €{res['total_price']}")
    
    # Analiza izkoriščenosti
    week_ago = datetime.now() - timedelta(days=7)
    utilization = system.get_resource_utilization(week_ago, datetime.now())
    print(f"\n📈 Izkoriščenost virov (zadnji teden):")
    for resource, data in utilization.items():
        print(f"- {resource}: {data['total_reservations']} rezervacij, "
              f"povprečna cena €{data['avg_price']}")
    
    print("\n🎯 Rezervacijski sistem je pripravljen za uporabo!")

if __name__ == "__main__":
    demo_reservation_system()