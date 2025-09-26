"""
🏨 OMNI PREMIUM TOURISM & HOSPITALITY CORE
Napredni sistem za gostinstvo in turizem z AI, avtomatizacijo in integracijami

Funkcionalnosti:
- POS integracija in sinhronizacija
- Rezervacijski sistemi (mize, sobe, dogodki)
- Računovodska integracija
- Dobaviteljski management
- AI predlogi in optimizacija
- Avtomatizacija procesov
- Real-time dashboard
- Tržna analiza in ROI
"""

import sqlite3
import json
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import logging

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BusinessType(Enum):
    RESTAURANT = "restaurant"
    HOTEL = "hotel"
    CAFE = "cafe"
    BAR = "bar"
    EVENT_VENUE = "event_venue"
    TOURISM_AGENCY = "tourism_agency"

class ReservationType(Enum):
    TABLE = "table"
    ROOM = "room"
    EVENT = "event"
    EXPERIENCE = "experience"

@dataclass
class POSTransaction:
    """POS transakcija"""
    id: str
    timestamp: datetime
    items: List[Dict]
    total_amount: float
    payment_method: str
    table_number: Optional[int] = None
    room_number: Optional[str] = None
    staff_id: str = ""
    customer_id: Optional[str] = None

@dataclass
class Reservation:
    """Rezervacija"""
    id: str
    type: ReservationType
    customer_name: str
    customer_contact: str
    datetime_start: datetime
    datetime_end: datetime
    party_size: int
    special_requests: str = ""
    status: str = "confirmed"
    table_number: Optional[int] = None
    room_number: Optional[str] = None

@dataclass
class InventoryItem:
    """Zaloga"""
    id: str
    name: str
    category: str
    current_stock: float
    min_stock: float
    max_stock: float
    unit: str
    cost_per_unit: float
    supplier_id: str
    last_ordered: Optional[datetime] = None

@dataclass
class Supplier:
    """Dobavitelj"""
    id: str
    name: str
    contact_person: str
    email: str
    phone: str
    products: List[str]
    delivery_days: List[str]
    payment_terms: str
    rating: float = 0.0

class TourismPremiumCore:
    """Jedro premium turističnega sistema"""
    
    def __init__(self, business_type: BusinessType, db_path: str = "tourism_premium.db"):
        self.business_type = business_type
        self.db_path = db_path
        self.pos_transactions = []
        self.reservations = []
        self.inventory = {}
        self.suppliers = {}
        self.staff = {}
        self.customers = {}
        self.ai_insights = {}
        
        # Inicializiraj bazo podatkov
        self._init_database()
        
        # Zaženi background procese
        self._start_background_processes()
        
        logger.info(f"🏨 Tourism Premium Core inicializiran za {business_type}")
    
    def _init_database(self):
        """Inicializiraj SQLite bazo podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # POS transakcije
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pos_transactions (
                id TEXT PRIMARY KEY,
                timestamp TEXT,
                items TEXT,
                total_amount REAL,
                payment_method TEXT,
                table_number INTEGER,
                room_number TEXT,
                staff_id TEXT,
                customer_id TEXT
            )
        ''')
        
        # Rezervacije
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
                type TEXT,
                customer_name TEXT,
                customer_contact TEXT,
                datetime_start TEXT,
                datetime_end TEXT,
                party_size INTEGER,
                special_requests TEXT,
                status TEXT,
                table_number INTEGER,
                room_number TEXT
            )
        ''')
        
        # Zaloge
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS inventory (
                id TEXT PRIMARY KEY,
                name TEXT,
                category TEXT,
                current_stock REAL,
                min_stock REAL,
                max_stock REAL,
                unit TEXT,
                cost_per_unit REAL,
                supplier_id TEXT,
                last_ordered TEXT
            )
        ''')
        
        # Dobavitelji
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS suppliers (
                id TEXT PRIMARY KEY,
                name TEXT,
                contact_person TEXT,
                email TEXT,
                phone TEXT,
                products TEXT,
                delivery_days TEXT,
                payment_terms TEXT,
                rating REAL
            )
        ''')
        
        # Finančni podatki
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS financial_records (
                id TEXT PRIMARY KEY,
                date TEXT,
                type TEXT,
                category TEXT,
                amount REAL,
                description TEXT,
                reference_id TEXT
            )
        ''')
        
        # AI insights
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_insights (
                id TEXT PRIMARY KEY,
                timestamp TEXT,
                type TEXT,
                data TEXT,
                confidence REAL,
                implemented BOOLEAN
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("📊 Baza podatkov inicializirana")
    
    def _start_background_processes(self):
        """Zaženi background procese"""
        # AI analiza
        threading.Thread(target=self._ai_analysis_loop, daemon=True).start()
        
        # Avtomatsko naročanje zalog
        threading.Thread(target=self._auto_inventory_management, daemon=True).start()
        
        # Finančna sinhronizacija
        threading.Thread(target=self._financial_sync_loop, daemon=True).start()
        
        logger.info("🔄 Background procesi zagnani")
    
    # ==================== POS INTEGRACIJA ====================
    
    def process_pos_transaction(self, items: List[Dict], payment_method: str, 
                              table_number: Optional[int] = None, 
                              room_number: Optional[str] = None,
                              staff_id: str = "", customer_id: Optional[str] = None) -> str:
        """Procesiraj POS transakcijo"""
        transaction_id = str(uuid.uuid4())
        total_amount = sum(item['price'] * item['quantity'] for item in items)
        
        transaction = POSTransaction(
            id=transaction_id,
            timestamp=datetime.now(),
            items=items,
            total_amount=total_amount,
            payment_method=payment_method,
            table_number=table_number,
            room_number=room_number,
            staff_id=staff_id,
            customer_id=customer_id
        )
        
        # Shrani v bazo
        self._save_pos_transaction(transaction)
        
        # Posodobi zaloge
        self._update_inventory_from_sale(items)
        
        # Ustvari finančni zapis
        self._create_financial_record("revenue", "sales", total_amount, 
                                    f"POS Sale #{transaction_id[:8]}", transaction_id)
        
        logger.info(f"💰 POS transakcija procesirana: {total_amount}€")
        return transaction_id
    
    def _save_pos_transaction(self, transaction: POSTransaction):
        """Shrani POS transakcijo v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO pos_transactions 
            (id, timestamp, items, total_amount, payment_method, table_number, 
             room_number, staff_id, customer_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            transaction.id,
            transaction.timestamp.isoformat(),
            json.dumps(transaction.items),
            transaction.total_amount,
            transaction.payment_method,
            transaction.table_number,
            transaction.room_number,
            transaction.staff_id,
            transaction.customer_id
        ))
        
        conn.commit()
        conn.close()
    
    # ==================== REZERVACIJSKI SISTEM ====================
    
    def create_reservation(self, reservation_type: ReservationType, customer_name: str,
                         customer_contact: str, datetime_start: datetime,
                         datetime_end: datetime, party_size: int,
                         special_requests: str = "") -> str:
        """Ustvari novo rezervacijo"""
        reservation_id = str(uuid.uuid4())
        
        # Preveri razpoložljivost
        if not self._check_availability(reservation_type, datetime_start, datetime_end, party_size):
            raise ValueError("Termin ni na voljo")
        
        # Dodeli mizo/sobo
        assigned_resource = self._assign_resource(reservation_type, datetime_start, party_size)
        
        reservation = Reservation(
            id=reservation_id,
            type=reservation_type,
            customer_name=customer_name,
            customer_contact=customer_contact,
            datetime_start=datetime_start,
            datetime_end=datetime_end,
            party_size=party_size,
            special_requests=special_requests,
            table_number=assigned_resource.get('table_number'),
            room_number=assigned_resource.get('room_number')
        )
        
        # Shrani v bazo
        self._save_reservation(reservation)
        
        logger.info(f"📅 Rezervacija ustvarjena: {customer_name} za {datetime_start}")
        return reservation_id
    
    def _check_availability(self, reservation_type: ReservationType, 
                          start: datetime, end: datetime, party_size: int) -> bool:
        """Preveri razpoložljivost"""
        # Implementacija preverjanja razpoložljivosti
        # Za demo vrnemo True
        return True
    
    def _assign_resource(self, reservation_type: ReservationType, 
                        datetime_start: datetime, party_size: int) -> Dict:
        """Dodeli vir (miza, soba)"""
        if reservation_type == ReservationType.TABLE:
            # Logika za dodelitev mize
            return {"table_number": party_size + 10}  # Demo logika
        elif reservation_type == ReservationType.ROOM:
            # Logika za dodelitev sobe
            return {"room_number": f"R{datetime_start.day:02d}{party_size}"}
        return {}
    
    def _save_reservation(self, reservation: Reservation):
        """Shrani rezervacijo v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO reservations 
            (id, type, customer_name, customer_contact, datetime_start, 
             datetime_end, party_size, special_requests, status, table_number, room_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            reservation.id,
            reservation.type.value,
            reservation.customer_name,
            reservation.customer_contact,
            reservation.datetime_start.isoformat(),
            reservation.datetime_end.isoformat(),
            reservation.party_size,
            reservation.special_requests,
            reservation.status,
            reservation.table_number,
            reservation.room_number
        ))
        
        conn.commit()
        conn.close()
    
    # ==================== UPRAVLJANJE ZALOG ====================
    
    def add_inventory_item(self, name: str, category: str, current_stock: float,
                          min_stock: float, max_stock: float, unit: str,
                          cost_per_unit: float, supplier_id: str) -> str:
        """Dodaj novo zalogo"""
        item_id = str(uuid.uuid4())
        
        item = InventoryItem(
            id=item_id,
            name=name,
            category=category,
            current_stock=current_stock,
            min_stock=min_stock,
            max_stock=max_stock,
            unit=unit,
            cost_per_unit=cost_per_unit,
            supplier_id=supplier_id
        )
        
        self._save_inventory_item(item)
        logger.info(f"📦 Dodana zaloga: {name}")
        return item_id
    
    def _update_inventory_from_sale(self, items: List[Dict]):
        """Posodobi zaloge po prodaji"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for item in items:
            cursor.execute('''
                UPDATE inventory 
                SET current_stock = current_stock - ?
                WHERE name = ?
            ''', (item['quantity'], item['name']))
        
        conn.commit()
        conn.close()
    
    def _save_inventory_item(self, item: InventoryItem):
        """Shrani zalogo v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO inventory 
            (id, name, category, current_stock, min_stock, max_stock, 
             unit, cost_per_unit, supplier_id, last_ordered)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            item.id, item.name, item.category, item.current_stock,
            item.min_stock, item.max_stock, item.unit, item.cost_per_unit,
            item.supplier_id, item.last_ordered.isoformat() if item.last_ordered else None
        ))
        
        conn.commit()
        conn.close()
    
    # ==================== DOBAVITELJSKI MANAGEMENT ====================
    
    def add_supplier(self, name: str, contact_person: str, email: str,
                    phone: str, products: List[str], delivery_days: List[str],
                    payment_terms: str) -> str:
        """Dodaj novega dobavitelja"""
        supplier_id = str(uuid.uuid4())
        
        supplier = Supplier(
            id=supplier_id,
            name=name,
            contact_person=contact_person,
            email=email,
            phone=phone,
            products=products,
            delivery_days=delivery_days,
            payment_terms=payment_terms
        )
        
        self._save_supplier(supplier)
        logger.info(f"🚚 Dodan dobavitelj: {name}")
        return supplier_id
    
    def _save_supplier(self, supplier: Supplier):
        """Shrani dobavitelja v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO suppliers 
            (id, name, contact_person, email, phone, products, 
             delivery_days, payment_terms, rating)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            supplier.id, supplier.name, supplier.contact_person,
            supplier.email, supplier.phone, json.dumps(supplier.products),
            json.dumps(supplier.delivery_days), supplier.payment_terms,
            supplier.rating
        ))
        
        conn.commit()
        conn.close()
    
    # ==================== FINANČNA INTEGRACIJA ====================
    
    def _create_financial_record(self, record_type: str, category: str, 
                               amount: float, description: str, reference_id: str):
        """Ustvari finančni zapis"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO financial_records 
            (id, date, type, category, amount, description, reference_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()),
            datetime.now().isoformat(),
            record_type,
            category,
            amount,
            description,
            reference_id
        ))
        
        conn.commit()
        conn.close()
    
    def get_financial_summary(self, start_date: datetime, end_date: datetime) -> Dict:
        """Pridobi finančni povzetek"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT type, category, SUM(amount) as total
            FROM financial_records 
            WHERE date BETWEEN ? AND ?
            GROUP BY type, category
        ''', (start_date.isoformat(), end_date.isoformat()))
        
        results = cursor.fetchall()
        conn.close()
        
        summary = {"revenue": {}, "expenses": {}, "total_revenue": 0, "total_expenses": 0}
        
        for record_type, category, total in results:
            if record_type == "revenue":
                summary["revenue"][category] = total
                summary["total_revenue"] += total
            else:
                summary["expenses"][category] = total
                summary["total_expenses"] += total
        
        summary["profit"] = summary["total_revenue"] - summary["total_expenses"]
        return summary
    
    # ==================== BACKGROUND PROCESI ====================
    
    def _ai_analysis_loop(self):
        """AI analiza v ozadju"""
        while True:
            try:
                # Analiziraj trende
                self._analyze_sales_trends()
                
                # Generiraj predloge
                self._generate_ai_suggestions()
                
                time.sleep(3600)  # Vsako uro
            except Exception as e:
                logger.error(f"AI analiza napaka: {e}")
                time.sleep(300)  # Počakaj 5 minut ob napaki
    
    def _auto_inventory_management(self):
        """Avtomatsko upravljanje zalog"""
        while True:
            try:
                self._check_low_stock()
                self._auto_order_supplies()
                time.sleep(1800)  # Vsakih 30 minut
            except Exception as e:
                logger.error(f"Inventory management napaka: {e}")
                time.sleep(300)
    
    def _financial_sync_loop(self):
        """Sinhronizacija finančnih podatkov"""
        while True:
            try:
                self._sync_with_accounting_system()
                time.sleep(7200)  # Vsaki 2 uri
            except Exception as e:
                logger.error(f"Financial sync napaka: {e}")
                time.sleep(600)
    
    def _analyze_sales_trends(self):
        """Analiziraj prodajne trende"""
        # Implementacija AI analize trendov
        pass
    
    def _generate_ai_suggestions(self):
        """Generiraj AI predloge"""
        # Implementacija AI predlogov
        pass
    
    def _check_low_stock(self):
        """Preveri nizke zaloge"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT name, current_stock, min_stock, supplier_id
            FROM inventory 
            WHERE current_stock <= min_stock
        ''')
        
        low_stock_items = cursor.fetchall()
        conn.close()
        
        for item_name, current, minimum, supplier_id in low_stock_items:
            logger.warning(f"⚠️ Nizka zaloga: {item_name} ({current}/{minimum})")
            # Pošlji notifikacijo
    
    def _auto_order_supplies(self):
        """Avtomatsko naroči zaloge"""
        # Implementacija avtomatskega naročanja
        pass
    
    def _sync_with_accounting_system(self):
        """Sinhroniziraj z računovodskim sistemom"""
        # Implementacija sinhronizacije
        pass

# Primer uporabe
if __name__ == "__main__":
    # Inicializiraj sistem za restavracijo
    tourism_core = TourismPremiumCore(BusinessType.RESTAURANT)
    
    # Dodaj dobavitelja
    supplier_id = tourism_core.add_supplier(
        name="Lokalni Kmet d.o.o.",
        contact_person="Janez Novak",
        email="janez@lokalni-kmet.si",
        phone="+386 1 234 5678",
        products=["zelenjava", "sadje", "meso"],
        delivery_days=["ponedeljek", "sreda", "petek"],
        payment_terms="30 dni"
    )
    
    # Dodaj zalogo
    tourism_core.add_inventory_item(
        name="Paradižnik",
        category="zelenjava",
        current_stock=50.0,
        min_stock=10.0,
        max_stock=100.0,
        unit="kg",
        cost_per_unit=2.5,
        supplier_id=supplier_id
    )
    
    print("🏨 Tourism Premium Core sistem inicializiran!")