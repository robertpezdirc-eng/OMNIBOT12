"""
🏨 Tourism Platform Integration - Integracija s turističnimi platformami
Napredni sistem za integracijo z Booking.com, Airbnb, TripAdvisor in drugimi platformami
"""

import sqlite3
import json
import logging
import requests
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import secrets
import xml.etree.ElementTree as ET
from urllib.parse import urlencode
import base64
import hmac
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

class PlatformType(Enum):
    BOOKING = "booking"
    AIRBNB = "airbnb"
    TRIPADVISOR = "tripadvisor"
    EXPEDIA = "expedia"
    AGODA = "agoda"
    HOTELS_COM = "hotels_com"
    CUSTOM = "custom"

class ReservationStatus(Enum):
    CONFIRMED = "confirmed"
    PENDING = "pending"
    CANCELLED = "cancelled"
    MODIFIED = "modified"
    NO_SHOW = "no_show"

class RoomType(Enum):
    SINGLE = "single"
    DOUBLE = "double"
    TWIN = "twin"
    SUITE = "suite"
    APARTMENT = "apartment"
    FAMILY = "family"

class SyncStatus(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"
    PARTIAL = "partial"

@dataclass
class PlatformCredentials:
    """Podatki za dostop do platforme"""
    platform_id: str
    platform_type: PlatformType
    api_key: str
    secret_key: str
    username: str
    password: str
    property_id: str
    endpoint_url: str
    is_active: bool
    rate_limit: int  # requests per minute
    last_sync: Optional[datetime] = None

@dataclass
class Room:
    """Soba/nastanitev"""
    room_id: str
    room_type: RoomType
    name: str
    description: str
    max_occupancy: int
    base_price: float
    amenities: List[str]
    images: List[str]
    size_sqm: Optional[int] = None
    bed_configuration: str = ""
    is_active: bool = True

@dataclass
class Availability:
    """Razpoložljivost sobe"""
    room_id: str
    date: date
    available_rooms: int
    price: float
    min_stay: int
    max_stay: int
    closed_to_arrival: bool = False
    closed_to_departure: bool = False

@dataclass
class PlatformReservation:
    """Rezervacija s platforme"""
    reservation_id: str
    platform_type: PlatformType
    platform_reservation_id: str
    room_id: str
    guest_name: str
    guest_email: str
    guest_phone: str
    check_in: date
    check_out: date
    adults: int
    children: int
    total_price: float
    commission: float
    status: ReservationStatus
    special_requests: str = ""
    created_at: datetime = None
    updated_at: datetime = None

@dataclass
class Review:
    """Ocena/komentar"""
    review_id: str
    platform_type: PlatformType
    platform_review_id: str
    guest_name: str
    rating: float
    title: str
    comment: str
    response: str
    review_date: datetime
    stay_date: date
    room_type: str
    is_verified: bool = True

@dataclass
class SyncLog:
    """Dnevnik sinhronizacije"""
    log_id: str
    platform_type: PlatformType
    sync_type: str  # "availability", "reservations", "reviews"
    status: SyncStatus
    records_processed: int
    errors: List[str]
    started_at: datetime
    completed_at: Optional[datetime] = None

class TourismPlatformIntegration:
    """Glavni sistem za integracijo s turističnimi platformami"""
    
    def __init__(self, db_path: str = "tourism_platforms.db"):
        self.db_path = db_path
        self._init_database()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Tourism-Master-Integration/1.0'
        })
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela platform
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS platforms (
                    platform_id TEXT PRIMARY KEY,
                    platform_type TEXT NOT NULL,
                    api_key TEXT,
                    secret_key TEXT,
                    username TEXT,
                    password TEXT,
                    property_id TEXT,
                    endpoint_url TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    rate_limit INTEGER DEFAULT 60,
                    last_sync TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela sob
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS rooms (
                    room_id TEXT PRIMARY KEY,
                    room_type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    max_occupancy INTEGER NOT NULL,
                    base_price REAL NOT NULL,
                    amenities TEXT,
                    images TEXT,
                    size_sqm INTEGER,
                    bed_configuration TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela razpoložljivosti
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS availability (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    available_rooms INTEGER NOT NULL,
                    price REAL NOT NULL,
                    min_stay INTEGER DEFAULT 1,
                    max_stay INTEGER DEFAULT 30,
                    closed_to_arrival BOOLEAN DEFAULT 0,
                    closed_to_departure BOOLEAN DEFAULT 0,
                    updated_at TEXT NOT NULL,
                    UNIQUE(room_id, date),
                    FOREIGN KEY (room_id) REFERENCES rooms (room_id)
                )
            ''')
            
            # Tabela rezervacij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS platform_reservations (
                    reservation_id TEXT PRIMARY KEY,
                    platform_type TEXT NOT NULL,
                    platform_reservation_id TEXT NOT NULL,
                    room_id TEXT NOT NULL,
                    guest_name TEXT NOT NULL,
                    guest_email TEXT,
                    guest_phone TEXT,
                    check_in TEXT NOT NULL,
                    check_out TEXT NOT NULL,
                    adults INTEGER NOT NULL,
                    children INTEGER DEFAULT 0,
                    total_price REAL NOT NULL,
                    commission REAL DEFAULT 0,
                    status TEXT NOT NULL,
                    special_requests TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (room_id) REFERENCES rooms (room_id)
                )
            ''')
            
            # Tabela ocen
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS reviews (
                    review_id TEXT PRIMARY KEY,
                    platform_type TEXT NOT NULL,
                    platform_review_id TEXT NOT NULL,
                    guest_name TEXT NOT NULL,
                    rating REAL NOT NULL,
                    title TEXT,
                    comment TEXT,
                    response TEXT,
                    review_date TEXT NOT NULL,
                    stay_date TEXT,
                    room_type TEXT,
                    is_verified BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela dnevnikov sinhronizacije
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sync_logs (
                    log_id TEXT PRIMARY KEY,
                    platform_type TEXT NOT NULL,
                    sync_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    records_processed INTEGER DEFAULT 0,
                    errors TEXT,
                    started_at TEXT NOT NULL,
                    completed_at TEXT
                )
            ''')
            
            # Tabela cenovnih strategij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pricing_strategies (
                    strategy_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    room_id TEXT NOT NULL,
                    base_multiplier REAL DEFAULT 1.0,
                    weekend_multiplier REAL DEFAULT 1.2,
                    holiday_multiplier REAL DEFAULT 1.5,
                    season_multipliers TEXT,
                    occupancy_thresholds TEXT,
                    min_price REAL,
                    max_price REAL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (room_id) REFERENCES rooms (room_id)
                )
            ''')
            
            conn.commit()
            logger.info("🏨 Tourism Platform Integration baza podatkov inicializirana")
    
    def add_platform(self, credentials: PlatformCredentials) -> Dict[str, Any]:
        """Dodaj platformo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO platforms 
                    (platform_id, platform_type, api_key, secret_key, username,
                     password, property_id, endpoint_url, is_active, rate_limit,
                     last_sync, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    credentials.platform_id,
                    credentials.platform_type.value,
                    credentials.api_key,
                    credentials.secret_key,
                    credentials.username,
                    credentials.password,
                    credentials.property_id,
                    credentials.endpoint_url,
                    credentials.is_active,
                    credentials.rate_limit,
                    credentials.last_sync.isoformat() if credentials.last_sync else None,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                # Testiraj povezavo
                test_result = self._test_platform_connection(credentials)
                
                return {
                    "success": True,
                    "platform_id": credentials.platform_id,
                    "connection_test": test_result,
                    "message": f"Platforma {credentials.platform_type.value} uspešno dodana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju platforme: {e}")
            return {"success": False, "error": str(e)}
    
    def _test_platform_connection(self, credentials: PlatformCredentials) -> Dict[str, Any]:
        """Testiraj povezavo s platformo"""
        try:
            if credentials.platform_type == PlatformType.BOOKING:
                return self._test_booking_connection(credentials)
            elif credentials.platform_type == PlatformType.AIRBNB:
                return self._test_airbnb_connection(credentials)
            elif credentials.platform_type == PlatformType.TRIPADVISOR:
                return self._test_tripadvisor_connection(credentials)
            else:
                return {"success": True, "message": "Generična platforma - test preskočen"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _test_booking_connection(self, credentials: PlatformCredentials) -> Dict[str, Any]:
        """Testiraj Booking.com povezavo"""
        try:
            # Booking.com XML API test
            auth = base64.b64encode(f"{credentials.username}:{credentials.password}".encode()).decode()
            
            headers = {
                'Authorization': f'Basic {auth}',
                'Content-Type': 'application/xml'
            }
            
            # Test zahteva za pridobitev lastnosti
            test_url = f"{credentials.endpoint_url}/properties"
            
            response = self.session.get(test_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return {"success": True, "message": "Booking.com povezava uspešna"}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _test_airbnb_connection(self, credentials: PlatformCredentials) -> Dict[str, Any]:
        """Testiraj Airbnb povezavo"""
        try:
            headers = {
                'Authorization': f'Bearer {credentials.api_key}',
                'Content-Type': 'application/json'
            }
            
            # Test zahteva za pridobitev lastnosti
            test_url = f"{credentials.endpoint_url}/listings"
            
            response = self.session.get(test_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return {"success": True, "message": "Airbnb povezava uspešna"}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _test_tripadvisor_connection(self, credentials: PlatformCredentials) -> Dict[str, Any]:
        """Testiraj TripAdvisor povezavo"""
        try:
            headers = {
                'X-TripAdvisor-API-Key': credentials.api_key,
                'Content-Type': 'application/json'
            }
            
            # Test zahteva za pridobitev lastnosti
            test_url = f"{credentials.endpoint_url}/properties/{credentials.property_id}"
            
            response = self.session.get(test_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return {"success": True, "message": "TripAdvisor povezava uspešna"}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def add_room(self, room: Room) -> Dict[str, Any]:
        """Dodaj sobo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO rooms 
                    (room_id, room_type, name, description, max_occupancy,
                     base_price, amenities, images, size_sqm, bed_configuration,
                     is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    room.room_id,
                    room.room_type.value,
                    room.name,
                    room.description,
                    room.max_occupancy,
                    room.base_price,
                    json.dumps(room.amenities),
                    json.dumps(room.images),
                    room.size_sqm,
                    room.bed_configuration,
                    room.is_active,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "room_id": room.room_id,
                    "message": f"Soba '{room.name}' uspešno dodana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju sobe: {e}")
            return {"success": False, "error": str(e)}
    
    def update_availability(self, room_id: str, date_from: date, date_to: date,
                          available_rooms: int, price: float) -> Dict[str, Any]:
        """Posodobi razpoložljivost"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                current_date = date_from
                updated_dates = []
                
                while current_date <= date_to:
                    cursor.execute('''
                        INSERT OR REPLACE INTO availability 
                        (room_id, date, available_rooms, price, updated_at)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (
                        room_id,
                        current_date.isoformat(),
                        available_rooms,
                        price,
                        datetime.now().isoformat()
                    ))
                    
                    updated_dates.append(current_date.isoformat())
                    current_date += timedelta(days=1)
                
                conn.commit()
                
                # Sinhroniziraj s platformami
                sync_result = self._sync_availability_to_platforms(room_id, date_from, date_to)
                
                return {
                    "success": True,
                    "updated_dates": updated_dates,
                    "sync_result": sync_result,
                    "message": f"Razpoložljivost posodobljena za {len(updated_dates)} dni"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju razpoložljivosti: {e}")
            return {"success": False, "error": str(e)}
    
    def _sync_availability_to_platforms(self, room_id: str, date_from: date, date_to: date) -> Dict[str, Any]:
        """Sinhroniziraj razpoložljivost s platformami"""
        results = {}
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Pridobi aktivne platforme
            cursor.execute('''
                SELECT platform_id, platform_type, api_key, secret_key, username,
                       password, property_id, endpoint_url
                FROM platforms WHERE is_active = 1
            ''')
            
            platforms = cursor.fetchall()
            
            for platform_data in platforms:
                platform_id, platform_type, api_key, secret_key, username, password, property_id, endpoint_url = platform_data
                
                try:
                    if platform_type == "booking":
                        result = self._sync_booking_availability(
                            room_id, date_from, date_to, username, password, endpoint_url
                        )
                    elif platform_type == "airbnb":
                        result = self._sync_airbnb_availability(
                            room_id, date_from, date_to, api_key, endpoint_url
                        )
                    else:
                        result = {"success": True, "message": "Sinhronizacija ni implementirana"}
                    
                    results[platform_type] = result
                    
                except Exception as e:
                    results[platform_type] = {"success": False, "error": str(e)}
        
        return results
    
    def _sync_booking_availability(self, room_id: str, date_from: date, date_to: date,
                                 username: str, password: str, endpoint_url: str) -> Dict[str, Any]:
        """Sinhroniziraj razpoložljivost z Booking.com"""
        try:
            auth = base64.b64encode(f"{username}:{password}".encode()).decode()
            
            headers = {
                'Authorization': f'Basic {auth}',
                'Content-Type': 'application/xml'
            }
            
            # Pridobi razpoložljivost iz baze
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT date, available_rooms, price
                    FROM availability 
                    WHERE room_id = ? AND date BETWEEN ? AND ?
                    ORDER BY date
                ''', (room_id, date_from.isoformat(), date_to.isoformat()))
                
                availability_data = cursor.fetchall()
            
            # Ustvari XML za Booking.com
            root = ET.Element("request")
            
            for date_str, available_rooms, price in availability_data:
                availability_elem = ET.SubElement(root, "availability")
                ET.SubElement(availability_elem, "date").text = date_str
                ET.SubElement(availability_elem, "room_id").text = room_id
                ET.SubElement(availability_elem, "available").text = str(available_rooms)
                ET.SubElement(availability_elem, "price").text = str(price)
            
            xml_data = ET.tostring(root, encoding='unicode')
            
            # Pošlji na Booking.com
            response = self.session.post(
                f"{endpoint_url}/availability",
                data=xml_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return {"success": True, "message": "Booking.com sinhronizacija uspešna"}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _sync_airbnb_availability(self, room_id: str, date_from: date, date_to: date,
                                api_key: str, endpoint_url: str) -> Dict[str, Any]:
        """Sinhroniziraj razpoložljivost z Airbnb"""
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            # Pridobi razpoložljivost iz baze
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT date, available_rooms, price
                    FROM availability 
                    WHERE room_id = ? AND date BETWEEN ? AND ?
                    ORDER BY date
                ''', (room_id, date_from.isoformat(), date_to.isoformat()))
                
                availability_data = cursor.fetchall()
            
            # Ustvari JSON za Airbnb
            availability_updates = []
            for date_str, available_rooms, price in availability_data:
                availability_updates.append({
                    "date": date_str,
                    "available": available_rooms > 0,
                    "price": price
                })
            
            payload = {
                "listing_id": room_id,
                "availability": availability_updates
            }
            
            # Pošlji na Airbnb
            response = self.session.put(
                f"{endpoint_url}/calendar",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code in [200, 204]:
                return {"success": True, "message": "Airbnb sinhronizacija uspešna"}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def sync_reservations_from_platforms(self) -> Dict[str, Any]:
        """Sinhroniziraj rezervacije iz vseh platform"""
        results = {}
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Pridobi aktivne platforme
            cursor.execute('''
                SELECT platform_id, platform_type, api_key, secret_key, username,
                       password, property_id, endpoint_url, last_sync
                FROM platforms WHERE is_active = 1
            ''')
            
            platforms = cursor.fetchall()
            
            for platform_data in platforms:
                platform_id, platform_type, api_key, secret_key, username, password, property_id, endpoint_url, last_sync = platform_data
                
                try:
                    # Določi datum od kdaj sinhronizirati
                    since_date = datetime.now() - timedelta(days=30)  # Zadnjih 30 dni
                    if last_sync:
                        since_date = max(since_date, datetime.fromisoformat(last_sync))
                    
                    if platform_type == "booking":
                        result = self._sync_booking_reservations(
                            username, password, endpoint_url, since_date
                        )
                    elif platform_type == "airbnb":
                        result = self._sync_airbnb_reservations(
                            api_key, endpoint_url, since_date
                        )
                    elif platform_type == "tripadvisor":
                        result = self._sync_tripadvisor_reservations(
                            api_key, property_id, endpoint_url, since_date
                        )
                    else:
                        result = {"success": True, "reservations": 0, "message": "Sinhronizacija ni implementirana"}
                    
                    results[platform_type] = result
                    
                    # Posodobi zadnjo sinhronizacijo
                    if result.get("success"):
                        cursor.execute('''
                            UPDATE platforms SET last_sync = ? WHERE platform_id = ?
                        ''', (datetime.now().isoformat(), platform_id))
                    
                except Exception as e:
                    results[platform_type] = {"success": False, "error": str(e)}
            
            conn.commit()
        
        return results
    
    def _sync_booking_reservations(self, username: str, password: str, 
                                 endpoint_url: str, since_date: datetime) -> Dict[str, Any]:
        """Sinhroniziraj rezervacije iz Booking.com"""
        try:
            auth = base64.b64encode(f"{username}:{password}".encode()).decode()
            
            headers = {
                'Authorization': f'Basic {auth}',
                'Content-Type': 'application/xml'
            }
            
            # Pridobi rezervacije
            params = {
                'from_date': since_date.strftime('%Y-%m-%d'),
                'to_date': datetime.now().strftime('%Y-%m-%d')
            }
            
            response = self.session.get(
                f"{endpoint_url}/reservations",
                params=params,
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                return {"success": False, "error": f"HTTP {response.status_code}"}
            
            # Parsiraj XML odgovor
            root = ET.fromstring(response.text)
            reservations_processed = 0
            
            for reservation_elem in root.findall('.//reservation'):
                try:
                    reservation = PlatformReservation(
                        reservation_id=f"BOOK_{reservation_elem.find('id').text}",
                        platform_type=PlatformType.BOOKING,
                        platform_reservation_id=reservation_elem.find('id').text,
                        room_id=reservation_elem.find('room_id').text,
                        guest_name=reservation_elem.find('guest_name').text,
                        guest_email=reservation_elem.find('guest_email').text or "",
                        guest_phone=reservation_elem.find('guest_phone').text or "",
                        check_in=datetime.strptime(reservation_elem.find('checkin').text, '%Y-%m-%d').date(),
                        check_out=datetime.strptime(reservation_elem.find('checkout').text, '%Y-%m-%d').date(),
                        adults=int(reservation_elem.find('adults').text or 1),
                        children=int(reservation_elem.find('children').text or 0),
                        total_price=float(reservation_elem.find('total_price').text or 0),
                        commission=float(reservation_elem.find('commission').text or 0),
                        status=ReservationStatus(reservation_elem.find('status').text.lower()),
                        special_requests=reservation_elem.find('special_requests').text or "",
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    
                    self._save_platform_reservation(reservation)
                    reservations_processed += 1
                    
                except Exception as e:
                    logger.error(f"Napaka pri obdelavi Booking rezervacije: {e}")
            
            return {
                "success": True,
                "reservations": reservations_processed,
                "message": f"Sinhroniziranih {reservations_processed} Booking rezervacij"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _sync_airbnb_reservations(self, api_key: str, endpoint_url: str, 
                                since_date: datetime) -> Dict[str, Any]:
        """Sinhroniziraj rezervacije iz Airbnb"""
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            # Pridobi rezervacije
            params = {
                'start_date': since_date.strftime('%Y-%m-%d'),
                'end_date': datetime.now().strftime('%Y-%m-%d')
            }
            
            response = self.session.get(
                f"{endpoint_url}/reservations",
                params=params,
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                return {"success": False, "error": f"HTTP {response.status_code}"}
            
            data = response.json()
            reservations_processed = 0
            
            for res_data in data.get('reservations', []):
                try:
                    reservation = PlatformReservation(
                        reservation_id=f"AIRBNB_{res_data['id']}",
                        platform_type=PlatformType.AIRBNB,
                        platform_reservation_id=str(res_data['id']),
                        room_id=str(res_data['listing_id']),
                        guest_name=res_data['guest']['name'],
                        guest_email=res_data['guest'].get('email', ''),
                        guest_phone=res_data['guest'].get('phone', ''),
                        check_in=datetime.strptime(res_data['start_date'], '%Y-%m-%d').date(),
                        check_out=datetime.strptime(res_data['end_date'], '%Y-%m-%d').date(),
                        adults=res_data.get('adults', 1),
                        children=res_data.get('children', 0),
                        total_price=float(res_data.get('total_price', 0)),
                        commission=float(res_data.get('host_fee', 0)),
                        status=ReservationStatus(res_data['status'].lower()),
                        special_requests=res_data.get('special_requests', ''),
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    
                    self._save_platform_reservation(reservation)
                    reservations_processed += 1
                    
                except Exception as e:
                    logger.error(f"Napaka pri obdelavi Airbnb rezervacije: {e}")
            
            return {
                "success": True,
                "reservations": reservations_processed,
                "message": f"Sinhroniziranih {reservations_processed} Airbnb rezervacij"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _sync_tripadvisor_reservations(self, api_key: str, property_id: str,
                                     endpoint_url: str, since_date: datetime) -> Dict[str, Any]:
        """Sinhroniziraj rezervacije iz TripAdvisor"""
        try:
            headers = {
                'X-TripAdvisor-API-Key': api_key,
                'Content-Type': 'application/json'
            }
            
            # TripAdvisor običajno ne upravlja rezervacij direktno, ampak preusmeri na hotel
            # To je simulacija za primer, če bi imeli direktno integracijo
            
            return {
                "success": True,
                "reservations": 0,
                "message": "TripAdvisor ne upravlja rezervacij direktno"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _save_platform_reservation(self, reservation: PlatformReservation):
        """Shrani rezervacijo s platforme"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO platform_reservations 
                (reservation_id, platform_type, platform_reservation_id, room_id,
                 guest_name, guest_email, guest_phone, check_in, check_out,
                 adults, children, total_price, commission, status,
                 special_requests, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                reservation.reservation_id,
                reservation.platform_type.value,
                reservation.platform_reservation_id,
                reservation.room_id,
                reservation.guest_name,
                reservation.guest_email,
                reservation.guest_phone,
                reservation.check_in.isoformat(),
                reservation.check_out.isoformat(),
                reservation.adults,
                reservation.children,
                reservation.total_price,
                reservation.commission,
                reservation.status.value,
                reservation.special_requests,
                reservation.created_at.isoformat(),
                reservation.updated_at.isoformat()
            ))
            
            conn.commit()
    
    def sync_reviews_from_platforms(self) -> Dict[str, Any]:
        """Sinhroniziraj ocene iz vseh platform"""
        results = {}
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Pridobi aktivne platforme
            cursor.execute('''
                SELECT platform_id, platform_type, api_key, secret_key, username,
                       password, property_id, endpoint_url
                FROM platforms WHERE is_active = 1
            ''')
            
            platforms = cursor.fetchall()
            
            for platform_data in platforms:
                platform_id, platform_type, api_key, secret_key, username, password, property_id, endpoint_url = platform_data
                
                try:
                    if platform_type == "tripadvisor":
                        result = self._sync_tripadvisor_reviews(
                            api_key, property_id, endpoint_url
                        )
                    elif platform_type == "booking":
                        result = self._sync_booking_reviews(
                            username, password, endpoint_url
                        )
                    else:
                        result = {"success": True, "reviews": 0, "message": "Sinhronizacija ocen ni implementirana"}
                    
                    results[platform_type] = result
                    
                except Exception as e:
                    results[platform_type] = {"success": False, "error": str(e)}
        
        return results
    
    def _sync_tripadvisor_reviews(self, api_key: str, property_id: str, 
                                endpoint_url: str) -> Dict[str, Any]:
        """Sinhroniziraj ocene iz TripAdvisor"""
        try:
            headers = {
                'X-TripAdvisor-API-Key': api_key,
                'Content-Type': 'application/json'
            }
            
            # Pridobi ocene
            response = self.session.get(
                f"{endpoint_url}/properties/{property_id}/reviews",
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                return {"success": False, "error": f"HTTP {response.status_code}"}
            
            data = response.json()
            reviews_processed = 0
            
            for review_data in data.get('reviews', []):
                try:
                    review = Review(
                        review_id=f"TA_{review_data['id']}",
                        platform_type=PlatformType.TRIPADVISOR,
                        platform_review_id=str(review_data['id']),
                        guest_name=review_data['author']['name'],
                        rating=float(review_data['rating']),
                        title=review_data.get('title', ''),
                        comment=review_data.get('text', ''),
                        response=review_data.get('management_response', ''),
                        review_date=datetime.strptime(review_data['published_date'], '%Y-%m-%d'),
                        stay_date=datetime.strptime(review_data.get('stay_date', review_data['published_date']), '%Y-%m-%d').date(),
                        room_type=review_data.get('room_type', ''),
                        is_verified=review_data.get('verified', True)
                    )
                    
                    self._save_review(review)
                    reviews_processed += 1
                    
                except Exception as e:
                    logger.error(f"Napaka pri obdelavi TripAdvisor ocene: {e}")
            
            return {
                "success": True,
                "reviews": reviews_processed,
                "message": f"Sinhroniziranih {reviews_processed} TripAdvisor ocen"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _save_review(self, review: Review):
        """Shrani oceno"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO reviews 
                (review_id, platform_type, platform_review_id, guest_name,
                 rating, title, comment, response, review_date, stay_date,
                 room_type, is_verified, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                review.review_id,
                review.platform_type.value,
                review.platform_review_id,
                review.guest_name,
                review.rating,
                review.title,
                review.comment,
                review.response,
                review.review_date.isoformat(),
                review.stay_date.isoformat(),
                review.room_type,
                review.is_verified,
                datetime.now().isoformat()
            ))
            
            conn.commit()
    
    def get_platform_analytics(self) -> Dict[str, Any]:
        """Pridobi analitiko platform"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Statistike rezervacij po platformah
            cursor.execute('''
                SELECT platform_type, 
                       COUNT(*) as total_reservations,
                       SUM(total_price) as total_revenue,
                       SUM(commission) as total_commission,
                       AVG(total_price) as avg_booking_value
                FROM platform_reservations 
                WHERE status != 'cancelled'
                GROUP BY platform_type
            ''')
            
            platform_stats = cursor.fetchall()
            
            # Statistike ocen po platformah
            cursor.execute('''
                SELECT platform_type,
                       COUNT(*) as total_reviews,
                       AVG(rating) as avg_rating,
                       COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews
                FROM reviews
                GROUP BY platform_type
            ''')
            
            review_stats = cursor.fetchall()
            
            # Zasedenost po mesecih
            cursor.execute('''
                SELECT strftime('%Y-%m', check_in) as month,
                       COUNT(*) as reservations,
                       SUM(total_price) as revenue
                FROM platform_reservations
                WHERE status = 'confirmed'
                GROUP BY month
                ORDER BY month DESC
                LIMIT 12
            ''')
            
            monthly_stats = cursor.fetchall()
            
            # Top sobe po prihodkih
            cursor.execute('''
                SELECT r.name, r.room_type,
                       COUNT(pr.reservation_id) as bookings,
                       SUM(pr.total_price) as revenue
                FROM rooms r
                LEFT JOIN platform_reservations pr ON r.room_id = pr.room_id
                WHERE pr.status = 'confirmed'
                GROUP BY r.room_id
                ORDER BY revenue DESC
                LIMIT 10
            ''')
            
            top_rooms = cursor.fetchall()
            
            return {
                "platform_statistics": [
                    {
                        "platform": stat[0],
                        "total_reservations": stat[1],
                        "total_revenue": round(stat[2] or 0, 2),
                        "total_commission": round(stat[3] or 0, 2),
                        "avg_booking_value": round(stat[4] or 0, 2)
                    } for stat in platform_stats
                ],
                "review_statistics": [
                    {
                        "platform": stat[0],
                        "total_reviews": stat[1],
                        "avg_rating": round(stat[2] or 0, 2),
                        "positive_reviews": stat[3],
                        "positive_rate": round((stat[3] / stat[1] * 100) if stat[1] > 0 else 0, 1)
                    } for stat in review_stats
                ],
                "monthly_performance": [
                    {
                        "month": stat[0],
                        "reservations": stat[1],
                        "revenue": round(stat[2] or 0, 2)
                    } for stat in monthly_stats
                ],
                "top_performing_rooms": [
                    {
                        "room_name": room[0],
                        "room_type": room[1],
                        "bookings": room[2],
                        "revenue": round(room[3] or 0, 2)
                    } for room in top_rooms
                ],
                "generated_at": datetime.now().isoformat()
            }
    
    def generate_dynamic_pricing(self, room_id: str, date_from: date, date_to: date) -> Dict[str, Any]:
        """Generiraj dinamično ceno"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi osnovno ceno sobe
                cursor.execute('''
                    SELECT base_price FROM rooms WHERE room_id = ?
                ''', (room_id,))
                
                result = cursor.fetchone()
                if not result:
                    return {"success": False, "error": "Soba ne obstaja"}
                
                base_price = result[0]
                
                # Pridobi zgodovinske podatke o zasedenosti
                cursor.execute('''
                    SELECT date, available_rooms
                    FROM availability
                    WHERE room_id = ? AND date BETWEEN ? AND ?
                    ORDER BY date
                ''', (room_id, date_from.isoformat(), date_to.isoformat()))
                
                availability_data = cursor.fetchall()
                
                # Pridobi rezervacije za obdobje
                cursor.execute('''
                    SELECT check_in, check_out, total_price
                    FROM platform_reservations
                    WHERE room_id = ? AND check_in BETWEEN ? AND ?
                    AND status = 'confirmed'
                ''', (room_id, date_from.isoformat(), date_to.isoformat()))
                
                reservations = cursor.fetchall()
                
                pricing_suggestions = []
                current_date = date_from
                
                while current_date <= date_to:
                    # Osnovna cena
                    suggested_price = base_price
                    
                    # Faktor za dan v tednu (vikend +20%)
                    if current_date.weekday() >= 5:  # Sobota, nedelja
                        suggested_price *= 1.2
                    
                    # Faktor za sezono
                    month = current_date.month
                    if month in [6, 7, 8]:  # Poletje
                        suggested_price *= 1.3
                    elif month in [12, 1]:  # Zima/novo leto
                        suggested_price *= 1.4
                    elif month in [4, 5, 9, 10]:  # Pomlad/jesen
                        suggested_price *= 1.1
                    
                    # Faktor za zasedenost (če je malo prostih sob, dvigni ceno)
                    available_rooms = 1  # Privzeto
                    for avail_date, avail_count in availability_data:
                        if avail_date == current_date.isoformat():
                            available_rooms = avail_count
                            break
                    
                    if available_rooms <= 1:
                        suggested_price *= 1.5  # Zadnja soba
                    elif available_rooms <= 3:
                        suggested_price *= 1.2  # Malo sob
                    
                    # Faktor za povpraševanje (število rezervacij v bližini)
                    nearby_reservations = sum(1 for res in reservations 
                                            if abs((datetime.strptime(res[0], '%Y-%m-%d').date() - current_date).days) <= 3)
                    
                    if nearby_reservations >= 5:
                        suggested_price *= 1.3
                    elif nearby_reservations >= 3:
                        suggested_price *= 1.15
                    
                    # Omejitve (min/max cena)
                    min_price = base_price * 0.7
                    max_price = base_price * 2.5
                    
                    suggested_price = max(min_price, min(max_price, suggested_price))
                    
                    pricing_suggestions.append({
                        "date": current_date.isoformat(),
                        "base_price": base_price,
                        "suggested_price": round(suggested_price, 2),
                        "price_change": round(((suggested_price - base_price) / base_price) * 100, 1),
                        "available_rooms": available_rooms,
                        "demand_level": "high" if nearby_reservations >= 3 else "medium" if nearby_reservations >= 1 else "low"
                    })
                    
                    current_date += timedelta(days=1)
                
                return {
                    "success": True,
                    "room_id": room_id,
                    "pricing_period": f"{date_from} to {date_to}",
                    "pricing_suggestions": pricing_suggestions,
                    "avg_suggested_price": round(sum(p["suggested_price"] for p in pricing_suggestions) / len(pricing_suggestions), 2),
                    "generated_at": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Napaka pri generiranju dinamičnih cen: {e}")
            return {"success": False, "error": str(e)}

# Primer uporabe
if __name__ == "__main__":
    integration = TourismPlatformIntegration()
    
    # Dodaj Booking.com platformo
    booking_creds = PlatformCredentials(
        platform_id="BOOKING_001",
        platform_type=PlatformType.BOOKING,
        api_key="",
        secret_key="",
        username="hotel_username",
        password="hotel_password",
        property_id="12345",
        endpoint_url="https://supply-xml.booking.com/hotels/xml",
        is_active=True,
        rate_limit=60
    )
    
    result = integration.add_platform(booking_creds)
    print(f"Dodajanje Booking platforme: {result}")
    
    # Dodaj sobo
    room = Room(
        room_id="ROOM_001",
        room_type=RoomType.DOUBLE,
        name="Standardna dvoposteljna soba",
        description="Udobna soba z razgledom na morje",
        max_occupancy=2,
        base_price=120.0,
        amenities=["WiFi", "TV", "Klimatska naprava", "Mini bar"],
        images=["room1.jpg", "room2.jpg"],
        size_sqm=25,
        bed_configuration="1 zakonska postelja"
    )
    
    room_result = integration.add_room(room)
    print(f"Dodajanje sobe: {room_result}")
    
    # Posodobi razpoložljivost
    availability_result = integration.update_availability(
        "ROOM_001",
        date.today(),
        date.today() + timedelta(days=30),
        5,  # 5 razpoložljivih sob
        150.0  # Cena 150€
    )
    print(f"Posodabljanje razpoložljivosti: {availability_result}")
    
    # Sinhroniziraj rezervacije
    sync_result = integration.sync_reservations_from_platforms()
    print(f"Sinhronizacija rezervacij: {sync_result}")
    
    # Analitika
    analytics = integration.get_platform_analytics()
    print(f"Analitika platform: {json.dumps(analytics, indent=2, ensure_ascii=False)}")
    
    # Dinamično cenjenje
    pricing = integration.generate_dynamic_pricing(
        "ROOM_001",
        date.today(),
        date.today() + timedelta(days=14)
    )
    print(f"Dinamično cenjenje: {json.dumps(pricing, indent=2, ensure_ascii=False)}")