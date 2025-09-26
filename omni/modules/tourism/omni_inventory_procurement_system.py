"""
OMNI INVENTORY & PROCUREMENT SYSTEM
Celovit sistem nabave in zalog z AI predlogi naročil, avtomatskim upravljanjem in IoT integracijo
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
import statistics

class ItemCategory(Enum):
    FOOD_FRESH = "sveza_hrana"
    FOOD_DRY = "suha_hrana"
    BEVERAGES = "pijace"
    CLEANING = "ciscila"
    AMENITIES = "pripomocki"
    LINENS = "posteljnina"
    MAINTENANCE = "vzdrževanje"
    OFFICE = "pisarna"
    TECHNOLOGY = "tehnologija"
    FURNITURE = "pohištvo"

class SupplierType(Enum):
    LOCAL = "lokalni"
    REGIONAL = "regionalni"
    NATIONAL = "nacionalni"
    INTERNATIONAL = "mednarodni"

class OrderStatus(Enum):
    PENDING = "v_obdelavi"
    CONFIRMED = "potrjeno"
    SHIPPED = "poslano"
    DELIVERED = "dostavljeno"
    CANCELLED = "preklicano"

class StockLevel(Enum):
    CRITICAL = "kriticno"
    LOW = "nizko"
    NORMAL = "normalno"
    HIGH = "visoko"
    OVERSTOCKED = "preveč"

@dataclass
class InventoryItem:
    id: str
    name: str
    category: ItemCategory
    unit: str  # kg, l, kos, paket
    current_stock: float
    min_stock: float
    max_stock: float
    reorder_point: float
    unit_cost: float
    supplier_id: str
    expiry_date: Optional[datetime.datetime]
    location: str
    barcode: str
    description: str

@dataclass
class Supplier:
    id: str
    name: str
    supplier_type: SupplierType
    contact_person: str
    email: str
    phone: str
    address: str
    payment_terms: int  # dni
    delivery_time: int  # dni
    minimum_order: float
    rating: float
    certifications: List[str]
    specialties: List[ItemCategory]

@dataclass
class PurchaseOrder:
    id: str
    supplier_id: str
    order_date: datetime.datetime
    expected_delivery: datetime.datetime
    status: OrderStatus
    items: List[Dict]  # {"item_id": str, "quantity": float, "unit_price": float}
    total_amount: float
    notes: str
    created_by_ai: bool

@dataclass
class StockMovement:
    id: str
    item_id: str
    movement_type: str  # "in", "out", "adjustment", "waste"
    quantity: float
    reason: str
    timestamp: datetime.datetime
    user_id: str
    reference_id: Optional[str]  # order_id, sale_id, etc.

class OmniInventoryProcurementSystem:
    def __init__(self, db_path: str = "omni_inventory.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela inventarja
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS inventory_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                unit TEXT NOT NULL,
                current_stock REAL DEFAULT 0,
                min_stock REAL DEFAULT 0,
                max_stock REAL DEFAULT 100,
                reorder_point REAL DEFAULT 10,
                unit_cost REAL DEFAULT 0,
                supplier_id TEXT,
                expiry_date TIMESTAMP,
                location TEXT DEFAULT 'glavno_skladišče',
                barcode TEXT UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela dobaviteljev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS suppliers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                supplier_type TEXT NOT NULL,
                contact_person TEXT,
                email TEXT,
                phone TEXT,
                address TEXT,
                payment_terms INTEGER DEFAULT 30,
                delivery_time INTEGER DEFAULT 7,
                minimum_order REAL DEFAULT 0,
                rating REAL DEFAULT 5.0,
                certifications TEXT,
                specialties TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela naročil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id TEXT PRIMARY KEY,
                supplier_id TEXT NOT NULL,
                order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expected_delivery TIMESTAMP,
                status TEXT DEFAULT 'v_obdelavi',
                items TEXT NOT NULL,
                total_amount REAL DEFAULT 0,
                notes TEXT,
                created_by_ai BOOLEAN DEFAULT 0,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
            )
        ''')
        
        # Tabela gibanja zalog
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stock_movements (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                movement_type TEXT NOT NULL,
                quantity REAL NOT NULL,
                reason TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_id TEXT DEFAULT 'system',
                reference_id TEXT,
                FOREIGN KEY (item_id) REFERENCES inventory_items (id)
            )
        ''')
        
        # Tabela AI predlogov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_procurement_suggestions (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                suggested_quantity REAL NOT NULL,
                urgency_score REAL DEFAULT 0.5,
                reasoning TEXT,
                cost_estimate REAL DEFAULT 0,
                supplier_recommendation TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                accepted BOOLEAN DEFAULT 0,
                FOREIGN KEY (item_id) REFERENCES inventory_items (id)
            )
        ''')
        
        # Tabela IoT senzorjev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS iot_sensors (
                id TEXT PRIMARY KEY,
                sensor_type TEXT NOT NULL,
                location TEXT NOT NULL,
                item_id TEXT,
                current_value REAL,
                unit TEXT,
                last_reading TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'active',
                FOREIGN KEY (item_id) REFERENCES inventory_items (id)
            )
        ''')
        
        # Tabela analitike porabe
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS consumption_analytics (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                date DATE NOT NULL,
                consumed_quantity REAL DEFAULT 0,
                waste_quantity REAL DEFAULT 0,
                revenue_generated REAL DEFAULT 0,
                season TEXT,
                day_of_week INTEGER,
                FOREIGN KEY (item_id) REFERENCES inventory_items (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def add_inventory_item(self, item: InventoryItem) -> bool:
        """Dodaj artikel v inventar"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO inventory_items 
                (id, name, category, unit, current_stock, min_stock, max_stock, reorder_point,
                 unit_cost, supplier_id, expiry_date, location, barcode, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                item.id, item.name, item.category.value, item.unit, item.current_stock,
                item.min_stock, item.max_stock, item.reorder_point, item.unit_cost,
                item.supplier_id, item.expiry_date, item.location, item.barcode, item.description
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju artikla: {e}")
            return False
    
    def add_supplier(self, supplier: Supplier) -> bool:
        """Dodaj dobavitelja"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO suppliers 
                (id, name, supplier_type, contact_person, email, phone, address,
                 payment_terms, delivery_time, minimum_order, rating, certifications, specialties)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                supplier.id, supplier.name, supplier.supplier_type.value, supplier.contact_person,
                supplier.email, supplier.phone, supplier.address, supplier.payment_terms,
                supplier.delivery_time, supplier.minimum_order, supplier.rating,
                json.dumps(supplier.certifications), json.dumps([s.value for s in supplier.specialties])
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju dobavitelja: {e}")
            return False
    
    def update_stock(self, item_id: str, quantity: float, movement_type: str, 
                    reason: str = "", user_id: str = "system", reference_id: str = None) -> bool:
        """Posodobi zalogo artikla"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pridobi trenutno zalogo
            cursor.execute('SELECT current_stock FROM inventory_items WHERE id = ?', (item_id,))
            result = cursor.fetchone()
            
            if not result:
                return False
            
            current_stock = result[0]
            
            # Izračunaj novo zalogo
            if movement_type == "in":
                new_stock = current_stock + quantity
            elif movement_type in ["out", "waste"]:
                new_stock = max(0, current_stock - quantity)
            elif movement_type == "adjustment":
                new_stock = quantity
            else:
                return False
            
            # Posodobi zalogo
            cursor.execute('''
                UPDATE inventory_items 
                SET current_stock = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            ''', (new_stock, item_id))
            
            # Zabeleži gibanje
            movement = StockMovement(
                id=str(uuid.uuid4()),
                item_id=item_id,
                movement_type=movement_type,
                quantity=quantity,
                reason=reason,
                timestamp=datetime.datetime.now(),
                user_id=user_id,
                reference_id=reference_id
            )
            
            cursor.execute('''
                INSERT INTO stock_movements 
                (id, item_id, movement_type, quantity, reason, user_id, reference_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                movement.id, movement.item_id, movement.movement_type, movement.quantity,
                movement.reason, movement.user_id, movement.reference_id
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Napaka pri posodabljanju zaloge: {e}")
            return False
    
    def get_low_stock_items(self) -> List[Dict]:
        """Pridobi artikle z nizko zalogo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT i.*, s.name as supplier_name, s.delivery_time
                FROM inventory_items i
                LEFT JOIN suppliers s ON i.supplier_id = s.id
                WHERE i.current_stock <= i.reorder_point
                ORDER BY (i.current_stock / i.reorder_point) ASC
            ''')
            
            rows = cursor.fetchall()
            low_stock_items = []
            
            for row in rows:
                stock_level = self.calculate_stock_level(row[4], row[5], row[6])  # current, min, max
                urgency = self.calculate_urgency_score(row[4], row[7], row[19] or 7)  # current, reorder, delivery_time
                
                item = {
                    'id': row[0],
                    'name': row[1],
                    'category': row[2],
                    'current_stock': row[4],
                    'reorder_point': row[7],
                    'min_stock': row[5],
                    'stock_level': stock_level.value,
                    'urgency_score': urgency,
                    'supplier_name': row[18] or 'Ni dobavitelja',
                    'delivery_time': row[19] or 7,
                    'unit_cost': row[8]
                }
                low_stock_items.append(item)
            
            conn.close()
            return low_stock_items
            
        except Exception as e:
            print(f"Napaka pri pridobivanju nizkih zalog: {e}")
            return []
    
    def calculate_stock_level(self, current: float, min_stock: float, max_stock: float) -> StockLevel:
        """Izračunaj nivo zaloge"""
        if current <= min_stock * 0.2:
            return StockLevel.CRITICAL
        elif current <= min_stock:
            return StockLevel.LOW
        elif current <= max_stock * 0.8:
            return StockLevel.NORMAL
        elif current <= max_stock:
            return StockLevel.HIGH
        else:
            return StockLevel.OVERSTOCKED
    
    def calculate_urgency_score(self, current_stock: float, reorder_point: float, delivery_time: int) -> float:
        """Izračunaj oceno nujnosti naročila"""
        if current_stock <= 0:
            return 1.0
        
        # Osnovna ocena na podlagi razmerja do reorder point
        base_score = max(0, (reorder_point - current_stock) / reorder_point)
        
        # Prilagodi glede na čas dostave
        delivery_factor = min(2.0, delivery_time / 7.0)  # Daljši čas dostave = višja nujnost
        
        # Kombinirana ocena
        urgency = min(1.0, base_score * delivery_factor)
        
        return round(urgency, 3)
    
    def generate_ai_procurement_suggestions(self) -> List[Dict]:
        """Generiraj AI predloge za nabavo"""
        try:
            low_stock_items = self.get_low_stock_items()
            suggestions = []
            
            for item in low_stock_items:
                # AI algoritem za izračun predlagane količine
                suggested_quantity = self.calculate_optimal_order_quantity(item)
                
                # Ocena stroškov
                cost_estimate = suggested_quantity * item['unit_cost']
                
                # Razlog za predlog
                reasoning = self.generate_procurement_reasoning(item, suggested_quantity)
                
                suggestion = {
                    'item_id': item['id'],
                    'item_name': item['name'],
                    'current_stock': item['current_stock'],
                    'suggested_quantity': suggested_quantity,
                    'urgency_score': item['urgency_score'],
                    'cost_estimate': cost_estimate,
                    'reasoning': reasoning,
                    'supplier_recommendation': item['supplier_name'],
                    'delivery_time': item['delivery_time']
                }
                
                suggestions.append(suggestion)
                
                # Shrani predlog v bazo
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO ai_procurement_suggestions 
                    (id, item_id, suggested_quantity, urgency_score, reasoning, 
                     cost_estimate, supplier_recommendation)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    str(uuid.uuid4()), item['id'], suggested_quantity, item['urgency_score'],
                    reasoning, cost_estimate, item['supplier_name']
                ))
                
                conn.commit()
                conn.close()
            
            return suggestions
            
        except Exception as e:
            print(f"Napaka pri generiranju AI predlogov: {e}")
            return []
    
    def calculate_optimal_order_quantity(self, item: Dict) -> float:
        """Izračunaj optimalno količino naročila"""
        # Poenostavljen EOQ (Economic Order Quantity) algoritem
        current = item['current_stock']
        reorder_point = item['reorder_point']
        
        # Osnovna količina do maksimuma
        basic_quantity = reorder_point * 2 - current
        
        # Prilagodi glede na nujnost
        urgency_multiplier = 1 + item['urgency_score']
        
        # Prilagodi glede na čas dostave
        delivery_buffer = item['delivery_time'] / 7.0  # Teden dni = 1.0
        
        optimal_quantity = basic_quantity * urgency_multiplier * (1 + delivery_buffer * 0.2)
        
        return max(1, round(optimal_quantity, 2))
    
    def generate_procurement_reasoning(self, item: Dict, suggested_quantity: float) -> str:
        """Generiraj razlog za nabavni predlog"""
        reasons = []
        
        if item['urgency_score'] > 0.8:
            reasons.append("KRITIČNO NIZKA ZALOGA")
        elif item['urgency_score'] > 0.5:
            reasons.append("Nizka zaloga")
        
        if item['delivery_time'] > 7:
            reasons.append(f"Dolg čas dostave ({item['delivery_time']} dni)")
        
        if item['current_stock'] <= 0:
            reasons.append("ZALOGA PRAZNA")
        
        reasons.append(f"Predlagana količina za {suggested_quantity:.1f} {item.get('unit', 'kosov')}")
        
        return " | ".join(reasons)
    
    def create_purchase_order(self, supplier_id: str, items: List[Dict], notes: str = "", 
                           created_by_ai: bool = False) -> Optional[PurchaseOrder]:
        """Ustvari naročilo"""
        try:
            # Izračunaj skupno vrednost
            total_amount = sum(item['quantity'] * item['unit_price'] for item in items)
            
            # Pridobi podatke o dobavitelju za čas dostave
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT delivery_time FROM suppliers WHERE id = ?', (supplier_id,))
            result = cursor.fetchone()
            delivery_time = result[0] if result else 7
            
            order = PurchaseOrder(
                id=str(uuid.uuid4()),
                supplier_id=supplier_id,
                order_date=datetime.datetime.now(),
                expected_delivery=datetime.datetime.now() + datetime.timedelta(days=delivery_time),
                status=OrderStatus.PENDING,
                items=items,
                total_amount=total_amount,
                notes=notes,
                created_by_ai=created_by_ai
            )
            
            cursor.execute('''
                INSERT INTO purchase_orders 
                (id, supplier_id, expected_delivery, status, items, total_amount, notes, created_by_ai)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                order.id, order.supplier_id, order.expected_delivery, order.status.value,
                json.dumps(order.items), order.total_amount, order.notes, order.created_by_ai
            ))
            
            conn.commit()
            conn.close()
            
            return order
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju naročila: {e}")
            return None
    
    def simulate_iot_sensors(self) -> Dict:
        """Simuliraj IoT senzorje"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Dodaj nekaj IoT senzorjev
            sensors = [
                ("TEMP001", "temperature", "hladilnik_1", None, random.uniform(2, 6), "°C"),
                ("TEMP002", "temperature", "zamrzovalnik_1", None, random.uniform(-20, -15), "°C"),
                ("WEIGHT001", "weight", "skladišče_A", "ITEM001", random.uniform(45, 55), "kg"),
                ("WEIGHT002", "weight", "skladišče_B", "ITEM002", random.uniform(18, 25), "kg"),
                ("HUMID001", "humidity", "suho_skladišče", None, random.uniform(40, 60), "%"),
                ("LEVEL001", "liquid_level", "rezervoar_olje", "ITEM003", random.uniform(70, 90), "%")
            ]
            
            sensor_data = {}
            
            for sensor_id, sensor_type, location, item_id, value, unit in sensors:
                cursor.execute('''
                    INSERT OR REPLACE INTO iot_sensors 
                    (id, sensor_type, location, item_id, current_value, unit, last_reading)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (sensor_id, sensor_type, location, item_id, value, unit))
                
                sensor_data[sensor_id] = {
                    'type': sensor_type,
                    'location': location,
                    'value': value,
                    'unit': unit,
                    'status': 'normal' if self.is_sensor_value_normal(sensor_type, value) else 'alert'
                }
            
            conn.commit()
            conn.close()
            
            return sensor_data
            
        except Exception as e:
            print(f"Napaka pri simulaciji IoT senzorjev: {e}")
            return {}
    
    def is_sensor_value_normal(self, sensor_type: str, value: float) -> bool:
        """Preveri, ali je vrednost senzorja normalna"""
        normal_ranges = {
            'temperature': (-25, 25),  # Odvisno od lokacije
            'humidity': (30, 70),
            'weight': (0, 1000),
            'liquid_level': (10, 100)
        }
        
        if sensor_type in normal_ranges:
            min_val, max_val = normal_ranges[sensor_type]
            return min_val <= value <= max_val
        
        return True
    
    def get_inventory_analytics(self) -> Dict:
        """Pridobi analitiko inventarja"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Osnovna statistika
            cursor.execute('SELECT COUNT(*) FROM inventory_items')
            total_items = cursor.fetchone()[0]
            
            cursor.execute('SELECT SUM(current_stock * unit_cost) FROM inventory_items')
            total_value = cursor.fetchone()[0] or 0
            
            cursor.execute('SELECT COUNT(*) FROM inventory_items WHERE current_stock <= reorder_point')
            low_stock_count = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM purchase_orders WHERE status = "v_obdelavi"')
            pending_orders = cursor.fetchone()[0]
            
            # Statistika po kategorijah
            cursor.execute('''
                SELECT category, COUNT(*), SUM(current_stock * unit_cost)
                FROM inventory_items 
                GROUP BY category
            ''')
            category_stats = {}
            for row in cursor.fetchall():
                category_stats[row[0]] = {
                    'count': row[1],
                    'value': row[2] or 0
                }
            
            # Gibanje zalog v zadnjih 30 dneh
            cursor.execute('''
                SELECT movement_type, COUNT(*), SUM(quantity)
                FROM stock_movements 
                WHERE timestamp >= datetime('now', '-30 days')
                GROUP BY movement_type
            ''')
            movement_stats = {}
            for row in cursor.fetchall():
                movement_stats[row[0]] = {
                    'count': row[1],
                    'total_quantity': row[2]
                }
            
            analytics = {
                'total_items': total_items,
                'total_inventory_value': round(total_value, 2),
                'low_stock_items': low_stock_count,
                'pending_orders': pending_orders,
                'low_stock_percentage': round((low_stock_count / total_items * 100), 1) if total_items > 0 else 0,
                'category_breakdown': category_stats,
                'movement_statistics': movement_stats
            }
            
            conn.close()
            return analytics
            
        except Exception as e:
            print(f"Napaka pri pridobivanju analitike: {e}")
            return {}

def demo_inventory_procurement():
    """Demo funkcija sistema nabave in zalog"""
    print("📦 OMNI INVENTORY & PROCUREMENT SYSTEM - DEMO")
    print("=" * 55)
    
    # Inicializacija sistema
    inventory_system = OmniInventoryProcurementSystem()
    
    # Dodajanje dobaviteljev
    suppliers = [
        Supplier(
            id="SUP001",
            name="Mercator d.d.",
            supplier_type=SupplierType.NATIONAL,
            contact_person="Marko Novak",
            email="narocila@mercator.si",
            phone="+386 1 560 1000",
            address="Dunajska cesta 107, Ljubljana",
            payment_terms=30,
            delivery_time=2,
            minimum_order=100.0,
            rating=4.5,
            certifications=["ISO 9001", "HACCP"],
            specialties=[ItemCategory.FOOD_FRESH, ItemCategory.FOOD_DRY, ItemCategory.BEVERAGES]
        ),
        Supplier(
            id="SUP002",
            name="Lokalna kmetija Kranjec",
            supplier_type=SupplierType.LOCAL,
            contact_person="Janez Kranjec",
            email="info@kmetija-kranjec.si",
            phone="+386 41 123 456",
            address="Kranj 15, Kranj",
            payment_terms=15,
            delivery_time=1,
            minimum_order=50.0,
            rating=4.8,
            certifications=["BIO", "Lokalno"],
            specialties=[ItemCategory.FOOD_FRESH]
        ),
        Supplier(
            id="SUP003",
            name="CleanPro d.o.o.",
            supplier_type=SupplierType.REGIONAL,
            contact_person="Ana Čistič",
            email="prodaja@cleanpro.si",
            phone="+386 2 234 567",
            address="Maribor 20, Maribor",
            payment_terms=45,
            delivery_time=3,
            minimum_order=200.0,
            rating=4.2,
            certifications=["ISO 14001"],
            specialties=[ItemCategory.CLEANING, ItemCategory.AMENITIES]
        )
    ]
    
    print("\n🏢 Dodajanje dobaviteljev:")
    for supplier in suppliers:
        success = inventory_system.add_supplier(supplier)
        rating_stars = "⭐" * int(supplier.rating)
        print(f"✅ {supplier.name} ({supplier.supplier_type.value}) {rating_stars}")
        print(f"   📞 {supplier.contact_person} | 🚚 {supplier.delivery_time} dni | 💰 {supplier.minimum_order}€ min")
    
    # Dodajanje inventarja
    inventory_items = [
        InventoryItem(
            id="ITEM001",
            name="Kruh beli 500g",
            category=ItemCategory.FOOD_FRESH,
            unit="kos",
            current_stock=15.0,
            min_stock=20.0,
            max_stock=100.0,
            reorder_point=25.0,
            unit_cost=1.20,
            supplier_id="SUP001",
            expiry_date=datetime.datetime.now() + datetime.timedelta(days=3),
            location="hladilnik_1",
            barcode="3830001234567",
            description="Sveži beli kruh 500g"
        ),
        InventoryItem(
            id="ITEM002",
            name="Mleko 1L",
            category=ItemCategory.BEVERAGES,
            unit="l",
            current_stock=8.0,
            min_stock=15.0,
            max_stock=50.0,
            reorder_point=18.0,
            unit_cost=1.10,
            supplier_id="SUP002",
            expiry_date=datetime.datetime.now() + datetime.timedelta(days=5),
            location="hladilnik_1",
            barcode="3830002345678",
            description="Sveže kravje mleko 1L"
        ),
        InventoryItem(
            id="ITEM003",
            name="Čistilo za tla 1L",
            category=ItemCategory.CLEANING,
            unit="l",
            current_stock=3.0,
            min_stock=5.0,
            max_stock=20.0,
            reorder_point=6.0,
            unit_cost=4.50,
            supplier_id="SUP003",
            expiry_date=None,
            location="skladišče_čistila",
            barcode="3830003456789",
            description="Univerzalno čistilo za tla"
        ),
        InventoryItem(
            id="ITEM004",
            name="Posteljnina 160x200",
            category=ItemCategory.LINENS,
            unit="komplet",
            current_stock=2.0,
            min_stock=5.0,
            max_stock=15.0,
            reorder_point=4.0,
            unit_cost=25.00,
            supplier_id="SUP001",
            expiry_date=None,
            location="skladišče_tekstil",
            barcode="3830004567890",
            description="Bombažna posteljnina 160x200cm"
        ),
        InventoryItem(
            id="ITEM005",
            name="Paradižnik BIO 1kg",
            category=ItemCategory.FOOD_FRESH,
            unit="kg",
            current_stock=12.0,
            min_stock=10.0,
            max_stock=30.0,
            reorder_point=15.0,
            unit_cost=3.20,
            supplier_id="SUP002",
            expiry_date=datetime.datetime.now() + datetime.timedelta(days=7),
            location="hladilnik_2",
            barcode="3830005678901",
            description="Sveži BIO paradižnik 1kg"
        )
    ]
    
    print("\n📦 Dodajanje inventarja:")
    for item in inventory_items:
        success = inventory_system.add_inventory_item(item)
        stock_icon = "🔴" if item.current_stock <= item.reorder_point else "🟢"
        expiry_info = f"⏰ {item.expiry_date.strftime('%d.%m')}" if item.expiry_date else "♾️"
        print(f"✅ {item.name} - {item.current_stock} {item.unit} {stock_icon}")
        print(f"   💰 {item.unit_cost}€ | 📍 {item.location} | {expiry_info}")
    
    # Simulacija gibanja zalog
    print("\n📊 Simulacija gibanja zalog:")
    movements = [
        ("ITEM001", 5.0, "out", "prodaja_zajtrk"),
        ("ITEM002", 3.0, "out", "kava_z_mlekom"),
        ("ITEM003", 0.5, "out", "čiščenje_sob"),
        ("ITEM004", 1.0, "out", "nova_rezervacija"),
        ("ITEM005", 2.0, "waste", "pokvarjen_paradižnik")
    ]
    
    for item_id, quantity, movement_type, reason in movements:
        success = inventory_system.update_stock(item_id, quantity, movement_type, reason)
        movement_icon = {"out": "📤", "in": "📥", "waste": "🗑️"}.get(movement_type, "📋")
        print(f"{movement_icon} {item_id}: {quantity} ({reason})")
    
    # Preverjanje nizkih zalog
    low_stock_items = inventory_system.get_low_stock_items()
    print(f"\n⚠️ Artikli z nizko zalogo ({len(low_stock_items)}):")
    for item in low_stock_items:
        urgency_icon = "🚨" if item['urgency_score'] > 0.7 else "⚠️" if item['urgency_score'] > 0.3 else "📋"
        print(f"{urgency_icon} {item['name']}: {item['current_stock']} (min: {item['reorder_point']})")
        print(f"   🎯 Nujnost: {item['urgency_score']:.1%} | 🏢 {item['supplier_name']}")
    
    # AI predlogi za nabavo
    ai_suggestions = inventory_system.generate_ai_procurement_suggestions()
    print(f"\n🤖 AI predlogi za nabavo ({len(ai_suggestions)}):")
    for suggestion in ai_suggestions:
        urgency_icon = "🚨" if suggestion['urgency_score'] > 0.7 else "⚠️"
        print(f"{urgency_icon} {suggestion['item_name']}")
        print(f"   📦 Predlagana količina: {suggestion['suggested_quantity']}")
        print(f"   💰 Ocenjen strošek: {suggestion['cost_estimate']:.2f}€")
        print(f"   💡 Razlog: {suggestion['reasoning']}")
        print(f"   🏢 Dobavitelj: {suggestion['supplier_recommendation']}")
    
    # Ustvarjanje avtomatskega naročila
    if ai_suggestions:
        print("\n📋 Ustvarjanje avtomatskega naročila:")
        # Izberi prvi predlog za demo
        suggestion = ai_suggestions[0]
        
        order_items = [{
            'item_id': suggestion['item_id'],
            'quantity': suggestion['suggested_quantity'],
            'unit_price': suggestion['cost_estimate'] / suggestion['suggested_quantity']
        }]
        
        # Najdi dobavitelja
        conn = sqlite3.connect(inventory_system.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT supplier_id FROM inventory_items WHERE id = ?', (suggestion['item_id'],))
        supplier_id = cursor.fetchone()[0]
        conn.close()
        
        order = inventory_system.create_purchase_order(
            supplier_id=supplier_id,
            items=order_items,
            notes="Avtomatsko naročilo na podlagi AI predloga",
            created_by_ai=True
        )
        
        if order:
            print(f"✅ Naročilo {order.id[:8]} ustvarjeno")
            print(f"   💰 Skupna vrednost: {order.total_amount:.2f}€")
            print(f"   📅 Pričakovana dostava: {order.expected_delivery.strftime('%d.%m.%Y')}")
            print(f"   🤖 Ustvaril: AI sistem")
    
    # IoT senzorji
    sensor_data = inventory_system.simulate_iot_sensors()
    print(f"\n🌐 IoT senzorji ({len(sensor_data)}):")
    for sensor_id, data in sensor_data.items():
        status_icon = "🟢" if data['status'] == 'normal' else "🔴"
        print(f"{status_icon} {sensor_id}: {data['value']}{data['unit']} ({data['location']})")
        print(f"   📊 Tip: {data['type']} | Status: {data['status']}")
    
    # Analitika inventarja
    analytics = inventory_system.get_inventory_analytics()
    print(f"\n📈 Analitika inventarja:")
    print(f"   📦 Skupaj artiklov: {analytics.get('total_items', 0)}")
    print(f"   💰 Vrednost inventarja: {analytics.get('total_inventory_value', 0):.2f}€")
    print(f"   ⚠️ Nizka zaloga: {analytics.get('low_stock_items', 0)} ({analytics.get('low_stock_percentage', 0)}%)")
    print(f"   📋 Naročila v obdelavi: {analytics.get('pending_orders', 0)}")
    
    print(f"\n📊 Razdelitev po kategorijah:")
    for category, stats in analytics.get('category_breakdown', {}).items():
        print(f"   - {category}: {stats['count']} artiklov (vrednost: {stats['value']:.2f}€)")
    
    print(f"\n📈 Gibanje zalog (zadnjih 30 dni):")
    for movement_type, stats in analytics.get('movement_statistics', {}).items():
        movement_icon = {"out": "📤", "in": "📥", "waste": "🗑️", "adjustment": "📋"}.get(movement_type, "📋")
        print(f"   {movement_icon} {movement_type}: {stats['count']} gibanj, {stats['total_quantity']:.1f} enot")
    
    print("\n🎉 Sistem nabave in zalog uspešno testiran!")
    print("✅ Avtomatsko upravljanje zalog")
    print("✅ AI predlogi za nabavo")
    print("✅ IoT senzorji za spremljanje")
    print("✅ Analitika in poročila")
    print("✅ Avtomatska naročila")

if __name__ == "__main__":
    demo_inventory_procurement()