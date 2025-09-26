"""
🏨 Reservation System - Rezervacijski sistem za mize, sobe in dogodke
Napredni sistem za upravljanje rezervacij v gostinstvu in turizmu
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta, date, time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
from threading import Lock
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

logger = logging.getLogger(__name__)

class ReservationType(Enum):
    TABLE = "table"
    ROOM = "room"
    EVENT = "event"
    SERVICE = "service"

class ReservationStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

@dataclass
class Customer:
    """Podatki o stranki"""
    customer_id: str
    name: str
    email: str
    phone: str
    preferences: Dict[str, Any] = None
    loyalty_level: str = "standard"
    total_visits: int = 0
    
@dataclass
class Reservation:
    """Rezervacija"""
    reservation_id: str
    customer: Customer
    reservation_type: ReservationType
    resource_id: str  # ID mize, sobe, dogodka
    start_datetime: datetime
    end_datetime: datetime
    party_size: int
    status: ReservationStatus
    special_requests: str = ""
    total_amount: float = 0.0
    deposit_amount: float = 0.0
    created_at: datetime = None
    updated_at: datetime = None
    
@dataclass
class Resource:
    """Vir (miza, soba, prostor)"""
    resource_id: str
    name: str
    resource_type: ReservationType
    capacity: int
    features: List[str]
    base_price: float
    location: str = ""
    is_active: bool = True

class ReservationSystem:
    """Rezervacijski sistem"""
    
    def __init__(self, db_path: str = "reservations.db"):
        self.db_path = db_path
        self.lock = Lock()
        self._init_database()
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela strank
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS customers (
                    customer_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    preferences TEXT,
                    loyalty_level TEXT DEFAULT 'standard',
                    total_visits INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela virov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS resources (
                    resource_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    resource_type TEXT NOT NULL,
                    capacity INTEGER NOT NULL,
                    features TEXT,
                    base_price REAL NOT NULL,
                    location TEXT,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            # Tabela rezervacij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS reservations (
                    reservation_id TEXT PRIMARY KEY,
                    customer_id TEXT NOT NULL,
                    resource_id TEXT NOT NULL,
                    reservation_type TEXT NOT NULL,
                    start_datetime TEXT NOT NULL,
                    end_datetime TEXT NOT NULL,
                    party_size INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    special_requests TEXT,
                    total_amount REAL DEFAULT 0,
                    deposit_amount REAL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (customer_id) REFERENCES customers (customer_id),
                    FOREIGN KEY (resource_id) REFERENCES resources (resource_id)
                )
            ''')
            
            # Tabela dogodkov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    event_date TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    max_capacity INTEGER NOT NULL,
                    current_bookings INTEGER DEFAULT 0,
                    price_per_person REAL NOT NULL,
                    location TEXT,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            conn.commit()
            logger.info("📅 Rezervacijska baza podatkov inicializirana")
    
    def add_customer(self, customer: Customer) -> Dict[str, Any]:
        """Dodaj stranko"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO customers 
                    (customer_id, name, email, phone, preferences, loyalty_level, total_visits, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    customer.customer_id,
                    customer.name,
                    customer.email,
                    customer.phone,
                    json.dumps(customer.preferences or {}),
                    customer.loyalty_level,
                    customer.total_visits,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "customer_id": customer.customer_id,
                    "message": f"Stranka {customer.name} uspešno dodana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju stranke: {e}")
            return {"success": False, "error": str(e)}
    
    def add_resource(self, resource: Resource) -> Dict[str, Any]:
        """Dodaj vir (mizo, sobo, prostor)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO resources 
                    (resource_id, name, resource_type, capacity, features, base_price, location, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    resource.resource_id,
                    resource.name,
                    resource.resource_type.value,
                    resource.capacity,
                    json.dumps(resource.features),
                    resource.base_price,
                    resource.location,
                    resource.is_active
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "resource_id": resource.resource_id,
                    "message": f"Vir {resource.name} uspešno dodan"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju vira: {e}")
            return {"success": False, "error": str(e)}
    
    def check_availability(self, resource_id: str, start_datetime: datetime, 
                          end_datetime: datetime) -> Dict[str, Any]:
        """Preveri razpoložljivost vira"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Preveri obstoječe rezervacije
            cursor.execute('''
                SELECT COUNT(*) FROM reservations 
                WHERE resource_id = ? 
                AND status NOT IN ('cancelled', 'no_show')
                AND (
                    (start_datetime <= ? AND end_datetime > ?) OR
                    (start_datetime < ? AND end_datetime >= ?) OR
                    (start_datetime >= ? AND start_datetime < ?)
                )
            ''', (
                resource_id,
                start_datetime.isoformat(), start_datetime.isoformat(),
                end_datetime.isoformat(), end_datetime.isoformat(),
                start_datetime.isoformat(), end_datetime.isoformat()
            ))
            
            conflicts = cursor.fetchone()[0]
            
            # Pridobi podatke o viru
            cursor.execute('''
                SELECT name, resource_type, capacity, is_active 
                FROM resources WHERE resource_id = ?
            ''', (resource_id,))
            
            resource_data = cursor.fetchone()
            
            if not resource_data:
                return {
                    "available": False,
                    "reason": "Vir ne obstaja"
                }
            
            if not resource_data[3]:  # is_active
                return {
                    "available": False,
                    "reason": "Vir ni aktiven"
                }
            
            return {
                "available": conflicts == 0,
                "resource_name": resource_data[0],
                "resource_type": resource_data[1],
                "capacity": resource_data[2],
                "conflicts": conflicts,
                "reason": "Vir je zaseden" if conflicts > 0 else "Vir je na voljo"
            }
    
    def create_reservation(self, reservation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Ustvari novo rezervacijo"""
        try:
            with self.lock:
                # Generiraj ID rezervacije
                reservation_id = str(uuid.uuid4())
                
                # Preveri razpoložljivost
                availability = self.check_availability(
                    reservation_data['resource_id'],
                    datetime.fromisoformat(reservation_data['start_datetime']),
                    datetime.fromisoformat(reservation_data['end_datetime'])
                )
                
                if not availability['available']:
                    return {
                        "success": False,
                        "error": f"Vir ni na voljo: {availability['reason']}"
                    }
                
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    
                    # Ustvari rezervacijo
                    now = datetime.now().isoformat()
                    cursor.execute('''
                        INSERT INTO reservations 
                        (reservation_id, customer_id, resource_id, reservation_type,
                         start_datetime, end_datetime, party_size, status,
                         special_requests, total_amount, deposit_amount, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        reservation_id,
                        reservation_data['customer_id'],
                        reservation_data['resource_id'],
                        reservation_data['reservation_type'],
                        reservation_data['start_datetime'],
                        reservation_data['end_datetime'],
                        reservation_data['party_size'],
                        ReservationStatus.PENDING.value,
                        reservation_data.get('special_requests', ''),
                        reservation_data.get('total_amount', 0.0),
                        reservation_data.get('deposit_amount', 0.0),
                        now,
                        now
                    ))
                    
                    conn.commit()
                    
                    # Pošlji potrditev po e-pošti
                    self._send_confirmation_email(reservation_id)
                    
                    return {
                        "success": True,
                        "reservation_id": reservation_id,
                        "message": "Rezervacija uspešno ustvarjena",
                        "status": ReservationStatus.PENDING.value
                    }
                    
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju rezervacije: {e}")
            return {"success": False, "error": str(e)}
    
    def update_reservation_status(self, reservation_id: str, 
                                 new_status: ReservationStatus) -> Dict[str, Any]:
        """Posodobi status rezervacije"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE reservations 
                    SET status = ?, updated_at = ?
                    WHERE reservation_id = ?
                ''', (new_status.value, datetime.now().isoformat(), reservation_id))
                
                if cursor.rowcount == 0:
                    return {"success": False, "error": "Rezervacija ne obstaja"}
                
                conn.commit()
                
                # Če je rezervacija potrjena, posodobi število obiskov stranke
                if new_status == ReservationStatus.COMPLETED:
                    cursor.execute('''
                        UPDATE customers 
                        SET total_visits = total_visits + 1
                        WHERE customer_id = (
                            SELECT customer_id FROM reservations 
                            WHERE reservation_id = ?
                        )
                    ''', (reservation_id,))
                    conn.commit()
                
                return {
                    "success": True,
                    "reservation_id": reservation_id,
                    "new_status": new_status.value,
                    "message": f"Status rezervacije posodobljen na {new_status.value}"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju statusa: {e}")
            return {"success": False, "error": str(e)}
    
    def get_reservations(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Pridobi rezervacije z možnostjo filtriranja"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            query = '''
                SELECT r.*, c.name, c.email, c.phone, res.name as resource_name
                FROM reservations r
                JOIN customers c ON r.customer_id = c.customer_id
                JOIN resources res ON r.resource_id = res.resource_id
            '''
            
            conditions = []
            params = []
            
            if filters:
                if 'date' in filters:
                    conditions.append("DATE(r.start_datetime) = ?")
                    params.append(filters['date'])
                
                if 'status' in filters:
                    conditions.append("r.status = ?")
                    params.append(filters['status'])
                
                if 'resource_type' in filters:
                    conditions.append("r.reservation_type = ?")
                    params.append(filters['resource_type'])
                
                if 'customer_id' in filters:
                    conditions.append("r.customer_id = ?")
                    params.append(filters['customer_id'])
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += " ORDER BY r.start_datetime ASC"
            
            cursor.execute(query, params)
            
            reservations = []
            for row in cursor.fetchall():
                reservation = {
                    "reservation_id": row[0],
                    "customer_id": row[1],
                    "resource_id": row[2],
                    "reservation_type": row[3],
                    "start_datetime": row[4],
                    "end_datetime": row[5],
                    "party_size": row[6],
                    "status": row[7],
                    "special_requests": row[8],
                    "total_amount": row[9],
                    "deposit_amount": row[10],
                    "created_at": row[11],
                    "updated_at": row[12],
                    "customer_name": row[13],
                    "customer_email": row[14],
                    "customer_phone": row[15],
                    "resource_name": row[16]
                }
                reservations.append(reservation)
            
            return reservations
    
    def get_daily_schedule(self, target_date: date) -> Dict[str, Any]:
        """Pridobi dnevni urnik rezervacij"""
        reservations = self.get_reservations({
            'date': target_date.isoformat()
        })
        
        # Razvrsti po tipih
        schedule = {
            "date": target_date.isoformat(),
            "tables": [],
            "rooms": [],
            "events": [],
            "total_reservations": len(reservations)
        }
        
        for reservation in reservations:
            res_type = reservation['reservation_type']
            if res_type == ReservationType.TABLE.value:
                schedule['tables'].append(reservation)
            elif res_type == ReservationType.ROOM.value:
                schedule['rooms'].append(reservation)
            elif res_type == ReservationType.EVENT.value:
                schedule['events'].append(reservation)
        
        return schedule
    
    def find_available_resources(self, resource_type: ReservationType,
                               start_datetime: datetime, end_datetime: datetime,
                               party_size: int) -> List[Dict[str, Any]]:
        """Najdi razpoložljive vire"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Pridobi vse vire ustreznega tipa z zadostno kapaciteto
            cursor.execute('''
                SELECT * FROM resources 
                WHERE resource_type = ? AND capacity >= ? AND is_active = 1
            ''', (resource_type.value, party_size))
            
            available_resources = []
            
            for row in cursor.fetchall():
                resource_id = row[0]
                
                # Preveri razpoložljivost
                availability = self.check_availability(resource_id, start_datetime, end_datetime)
                
                if availability['available']:
                    resource = {
                        "resource_id": resource_id,
                        "name": row[1],
                        "resource_type": row[2],
                        "capacity": row[3],
                        "features": json.loads(row[4]) if row[4] else [],
                        "base_price": row[5],
                        "location": row[6]
                    }
                    available_resources.append(resource)
            
            return available_resources
    
    def generate_occupancy_report(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Generiraj poročilo o zasedenosti"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Skupno število rezervacij
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_reservations,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                    COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
                    AVG(total_amount) as avg_revenue
                FROM reservations 
                WHERE DATE(start_datetime) BETWEEN ? AND ?
            ''', (start_date, end_date))
            
            stats = cursor.fetchone()
            
            # Zasedenost po tipih virov
            cursor.execute('''
                SELECT 
                    reservation_type,
                    COUNT(*) as count,
                    SUM(total_amount) as revenue
                FROM reservations 
                WHERE DATE(start_datetime) BETWEEN ? AND ?
                GROUP BY reservation_type
            ''', (start_date, end_date))
            
            by_type = cursor.fetchall()
            
            # Dnevna zasedenost
            cursor.execute('''
                SELECT 
                    DATE(start_datetime) as date,
                    COUNT(*) as reservations,
                    SUM(total_amount) as daily_revenue
                FROM reservations 
                WHERE DATE(start_datetime) BETWEEN ? AND ?
                GROUP BY DATE(start_datetime)
                ORDER BY date
            ''', (start_date, end_date))
            
            daily_data = cursor.fetchall()
            
            return {
                "period": f"{start_date} - {end_date}",
                "summary": {
                    "total_reservations": stats[0] or 0,
                    "completed": stats[1] or 0,
                    "cancelled": stats[2] or 0,
                    "no_shows": stats[3] or 0,
                    "completion_rate": (stats[1] / stats[0] * 100) if stats[0] else 0,
                    "average_revenue": stats[4] or 0
                },
                "by_type": [
                    {
                        "type": row[0],
                        "count": row[1],
                        "revenue": row[2]
                    }
                    for row in by_type
                ],
                "daily_data": [
                    {
                        "date": row[0],
                        "reservations": row[1],
                        "revenue": row[2]
                    }
                    for row in daily_data
                ],
                "generated_at": datetime.now().isoformat()
            }
    
    def _send_confirmation_email(self, reservation_id: str):
        """Pošlji potrditveno e-pošto"""
        try:
            # Pridobi podatke o rezervaciji
            reservations = self.get_reservations()
            reservation = next((r for r in reservations if r['reservation_id'] == reservation_id), None)
            
            if not reservation:
                return
            
            # Sestavi e-pošto
            subject = f"Potrditev rezervacije #{reservation_id[:8]}"
            body = f"""
            Spoštovani {reservation['customer_name']},
            
            Vaša rezervacija je bila uspešno ustvarjena:
            
            Rezervacija: #{reservation_id[:8]}
            Tip: {reservation['reservation_type']}
            Vir: {reservation['resource_name']}
            Datum: {reservation['start_datetime']}
            Število oseb: {reservation['party_size']}
            Status: {reservation['status']}
            
            Hvala za zaupanje!
            """
            
            # Tukaj bi implementirali pošiljanje e-pošte
            logger.info(f"📧 Potrditvena e-pošta poslana za rezervacijo {reservation_id}")
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju e-pošte: {e}")
    
    def auto_check_in(self, reservation_id: str) -> Dict[str, Any]:
        """Samodejni check-in ob prihodu"""
        return self.update_reservation_status(reservation_id, ReservationStatus.CHECKED_IN)
    
    def handle_no_show(self, reservation_id: str) -> Dict[str, Any]:
        """Obravnavaj no-show rezervacije"""
        return self.update_reservation_status(reservation_id, ReservationStatus.NO_SHOW)

# Primer uporabe
if __name__ == "__main__":
    reservation_system = ReservationSystem()
    
    # Dodaj testno stranko
    customer = Customer(
        customer_id="CUST001",
        name="Janez Novak",
        email="janez.novak@email.com",
        phone="+386 40 123 456",
        preferences={"dietary": "vegetarian", "seating": "window"}
    )
    
    result = reservation_system.add_customer(customer)
    print(f"Dodajanje stranke: {result}")
    
    # Dodaj testno mizo
    table = Resource(
        resource_id="TABLE001",
        name="Miza 1",
        resource_type=ReservationType.TABLE,
        capacity=4,
        features=["window_view", "quiet"],
        base_price=0.0,
        location="Glavna dvorana"
    )
    
    result = reservation_system.add_resource(table)
    print(f"Dodajanje mize: {result}")
    
    # Ustvari rezervacijo
    reservation_data = {
        "customer_id": "CUST001",
        "resource_id": "TABLE001",
        "reservation_type": ReservationType.TABLE.value,
        "start_datetime": (datetime.now() + timedelta(hours=2)).isoformat(),
        "end_datetime": (datetime.now() + timedelta(hours=4)).isoformat(),
        "party_size": 2,
        "special_requests": "Okno z razgledom"
    }
    
    result = reservation_system.create_reservation(reservation_data)
    print(f"Ustvarjanje rezervacije: {result}")
    
    # Pridobi današnje rezervacije
    today_reservations = reservation_system.get_daily_schedule(date.today())
    print(f"Današnje rezervacije: {today_reservations}")