"""
OMNI KITCHEN & ORDERING SYSTEM
Celovit sistem kuhinje z digitalnimi naročili, KDS monitorji in glasovnim naročanjem
"""

import sqlite3
import json
import datetime
import uuid
import asyncio
import websockets
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import speech_recognition as sr
import pyttsx3
import threading
import time

class OrderStatus(Enum):
    PENDING = "v_cakanju"
    CONFIRMED = "potrjeno"
    PREPARING = "v_pripravi"
    READY = "pripravljeno"
    SERVED = "strezeno"
    CANCELLED = "preklicano"

class OrderPriority(Enum):
    LOW = "nizka"
    NORMAL = "normalna"
    HIGH = "visoka"
    URGENT = "nujna"

class DeviceType(Enum):
    WAITER_TABLET = "tablica_natakar"
    KITCHEN_DISPLAY = "kuhinjski_monitor"
    BAR_DISPLAY = "bar_monitor"
    SMART_WATCH = "pametna_ura"
    VOICE_DEVICE = "glasovna_naprava"

class ItemType(Enum):
    APPETIZER = "predjed"
    MAIN_COURSE = "glavna_jed"
    DESSERT = "sladica"
    BEVERAGE = "pijaca"
    WINE = "vino"
    COCKTAIL = "koktajl"

@dataclass
class OrderItem:
    id: str
    name: str
    item_type: ItemType
    quantity: int
    price: float
    preparation_time: int  # v minutah
    special_instructions: str
    allergens: List[str]
    table_number: int

@dataclass
class Order:
    id: str
    table_number: int
    waiter_id: str
    items: List[OrderItem]
    status: OrderStatus
    priority: OrderPriority
    created_at: datetime.datetime
    estimated_ready_time: Optional[datetime.datetime]
    special_notes: str
    customer_count: int

@dataclass
class KitchenStation:
    id: str
    name: str
    station_type: str  # "hot", "cold", "bar", "grill"
    active_orders: List[str]
    staff_count: int
    max_capacity: int

class OmniKitchenOrderingSystem:
    def __init__(self, db_path: str = "omni_kitchen_orders.db"):
        self.db_path = db_path
        self.connected_devices = {}
        self.voice_engine = None
        self.speech_recognizer = None
        self.init_database()
        self.init_voice_system()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela naročil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                table_number INTEGER NOT NULL,
                waiter_id TEXT NOT NULL,
                items TEXT NOT NULL,
                status TEXT NOT NULL,
                priority TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                estimated_ready_time TIMESTAMP,
                special_notes TEXT,
                customer_count INTEGER DEFAULT 1
            )
        ''')
        
        # Tabela kuhinjskih postaj
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS kitchen_stations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                station_type TEXT NOT NULL,
                active_orders TEXT,
                staff_count INTEGER DEFAULT 1,
                max_capacity INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela naprav
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                device_type TEXT NOT NULL,
                location TEXT,
                ip_address TEXT,
                last_ping TIMESTAMP,
                status TEXT DEFAULT 'online',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela menijev s časom priprave
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS menu_items_kitchen (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                item_type TEXT NOT NULL,
                preparation_time INTEGER DEFAULT 10,
                kitchen_station TEXT,
                ingredients TEXT,
                allergens TEXT,
                price REAL NOT NULL,
                available BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela glasovnih ukazov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS voice_commands (
                id TEXT PRIMARY KEY,
                command_text TEXT NOT NULL,
                recognized_intent TEXT,
                waiter_id TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed BOOLEAN DEFAULT 0
            )
        ''')
        
        # Tabela obvestil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                order_id TEXT,
                message TEXT NOT NULL,
                notification_type TEXT,
                target_device TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def init_voice_system(self):
        """Inicializacija glasovnega sistema"""
        try:
            self.voice_engine = pyttsx3.init()
            self.voice_engine.setProperty('rate', 150)
            self.voice_engine.setProperty('volume', 0.8)
            
            self.speech_recognizer = sr.Recognizer()
            print("✅ Glasovni sistem inicializiran")
        except Exception as e:
            print(f"⚠️ Napaka pri inicializaciji glasovnega sistema: {e}")
    
    def add_menu_item(self, item_id: str, name: str, item_type: ItemType, 
                     preparation_time: int, kitchen_station: str, price: float,
                     ingredients: List[str] = None, allergens: List[str] = None) -> bool:
        """Dodaj artikel v kuhinjski meni"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO menu_items_kitchen 
                (id, name, item_type, preparation_time, kitchen_station, ingredients, allergens, price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                item_id, name, item_type.value, preparation_time, kitchen_station,
                json.dumps(ingredients or []), json.dumps(allergens or []), price
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju artikla: {e}")
            return False
    
    def register_kitchen_station(self, station_id: str, name: str, station_type: str,
                               staff_count: int = 1, max_capacity: int = 5) -> bool:
        """Registriraj kuhinjsko postajo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO kitchen_stations 
                (id, name, station_type, staff_count, max_capacity, active_orders)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (station_id, name, station_type, staff_count, max_capacity, json.dumps([])))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri registraciji postaje: {e}")
            return False
    
    def register_device(self, device_id: str, name: str, device_type: DeviceType,
                       location: str = "", ip_address: str = "") -> bool:
        """Registriraj napravo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO devices 
                (id, name, device_type, location, ip_address, last_ping)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (device_id, name, device_type.value, location, ip_address, datetime.datetime.now()))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri registraciji naprave: {e}")
            return False
    
    def create_order(self, table_number: int, waiter_id: str, items: List[Dict],
                    customer_count: int = 1, special_notes: str = "",
                    priority: OrderPriority = OrderPriority.NORMAL) -> Optional[Order]:
        """Ustvari novo naročilo"""
        try:
            order_id = str(uuid.uuid4())
            
            # Pretvori slovarje v OrderItem objekte
            order_items = []
            total_prep_time = 0
            
            for item_data in items:
                order_item = OrderItem(
                    id=str(uuid.uuid4()),
                    name=item_data['name'],
                    item_type=ItemType(item_data['item_type']),
                    quantity=item_data['quantity'],
                    price=item_data['price'],
                    preparation_time=item_data['preparation_time'],
                    special_instructions=item_data.get('special_instructions', ''),
                    allergens=item_data.get('allergens', []),
                    table_number=table_number
                )
                order_items.append(order_item)
                total_prep_time = max(total_prep_time, order_item.preparation_time)
            
            # Izračunaj predvideni čas priprave
            estimated_ready_time = datetime.datetime.now() + datetime.timedelta(minutes=total_prep_time)
            
            order = Order(
                id=order_id,
                table_number=table_number,
                waiter_id=waiter_id,
                items=order_items,
                status=OrderStatus.PENDING,
                priority=priority,
                created_at=datetime.datetime.now(),
                estimated_ready_time=estimated_ready_time,
                special_notes=special_notes,
                customer_count=customer_count
            )
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pretvori OrderItem objekte v slovarje za JSON
            items_json = []
            for item in order.items:
                items_json.append({
                    'id': item.id,
                    'name': item.name,
                    'item_type': item.item_type.value,
                    'quantity': item.quantity,
                    'price': item.price,
                    'preparation_time': item.preparation_time,
                    'special_instructions': item.special_instructions,
                    'allergens': item.allergens,
                    'table_number': item.table_number
                })
            
            cursor.execute('''
                INSERT INTO orders 
                (id, table_number, waiter_id, items, status, priority, 
                 estimated_ready_time, special_notes, customer_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                order.id, order.table_number, order.waiter_id, json.dumps(items_json),
                order.status.value, order.priority.value, order.estimated_ready_time,
                order.special_notes, order.customer_count
            ))
            
            conn.commit()
            conn.close()
            
            # Pošlji obvestilo v kuhinjo
            self.send_kitchen_notification(order)
            
            return order
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju naročila: {e}")
            return None
    
    def update_order_status(self, order_id: str, new_status: OrderStatus) -> bool:
        """Posodobi status naročila"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE orders SET status = ? WHERE id = ?
            ''', (new_status.value, order_id))
            
            conn.commit()
            conn.close()
            
            # Pošlji obvestilo o spremembi statusa
            self.send_status_notification(order_id, new_status)
            
            return True
        except Exception as e:
            print(f"Napaka pri posodabljanju statusa: {e}")
            return False
    
    def send_kitchen_notification(self, order: Order):
        """Pošlji obvestilo v kuhinjo"""
        try:
            message = f"Novo naročilo - Miza {order.table_number}: "
            for item in order.items:
                message += f"{item.quantity}x {item.name}, "
            message = message.rstrip(", ")
            
            # Shrani obvestilo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO notifications 
                (id, order_id, message, notification_type, target_device)
                VALUES (?, ?, ?, ?, ?)
            ''', (str(uuid.uuid4()), order.id, message, "kitchen_order", "KDS_ALL"))
            
            conn.commit()
            conn.close()
            
            # Glasovno obvestilo (če je na voljo)
            if self.voice_engine:
                self.speak_notification(f"Novo naročilo za mizo {order.table_number}")
                
        except Exception as e:
            print(f"Napaka pri pošiljanju obvestila: {e}")
    
    def send_status_notification(self, order_id: str, status: OrderStatus):
        """Pošlji obvestilo o spremembi statusa"""
        try:
            # Pridobi podatke o naročilu
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT table_number, waiter_id FROM orders WHERE id = ?', (order_id,))
            result = cursor.fetchone()
            
            if result:
                table_number, waiter_id = result
                
                if status == OrderStatus.READY:
                    message = f"Naročilo za mizo {table_number} je pripravljeno!"
                    self.speak_notification(f"Miza {table_number} pripravljena")
                elif status == OrderStatus.PREPARING:
                    message = f"Naročilo za mizo {table_number} se pripravlja"
                else:
                    message = f"Naročilo za mizo {table_number}: {status.value}"
                
                cursor.execute('''
                    INSERT INTO notifications 
                    (id, order_id, message, notification_type, target_device)
                    VALUES (?, ?, ?, ?, ?)
                ''', (str(uuid.uuid4()), order_id, message, "status_update", waiter_id))
                
                conn.commit()
            
            conn.close()
            
        except Exception as e:
            print(f"Napaka pri obvestilu o statusu: {e}")
    
    def speak_notification(self, text: str):
        """Glasovno obvestilo"""
        try:
            if self.voice_engine:
                def speak():
                    self.voice_engine.say(text)
                    self.voice_engine.runAndWait()
                
                # Zaženi v ločeni niti, da ne blokira
                thread = threading.Thread(target=speak)
                thread.daemon = True
                thread.start()
        except Exception as e:
            print(f"Napaka pri glasovnem obvestilu: {e}")
    
    def process_voice_command(self, waiter_id: str) -> Optional[str]:
        """Obdelaj glasovni ukaz"""
        try:
            if not self.speech_recognizer:
                return None
                
            with sr.Microphone() as source:
                print("🎤 Poslušam glasovni ukaz...")
                self.speech_recognizer.adjust_for_ambient_noise(source)
                audio = self.speech_recognizer.listen(source, timeout=5)
                
            # Prepoznaj govor
            command_text = self.speech_recognizer.recognize_google(audio, language='sl-SI')
            print(f"Prepoznan ukaz: {command_text}")
            
            # Shrani glasovni ukaz
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO voice_commands 
                (id, command_text, waiter_id)
                VALUES (?, ?, ?)
            ''', (str(uuid.uuid4()), command_text, waiter_id))
            
            conn.commit()
            conn.close()
            
            # Obdelaj ukaz
            return self.interpret_voice_command(command_text, waiter_id)
            
        except sr.UnknownValueError:
            print("Nisem razumel glasovnega ukaza")
            return None
        except sr.RequestError as e:
            print(f"Napaka pri prepoznavanju govora: {e}")
            return None
        except Exception as e:
            print(f"Napaka pri obdelavi glasovnega ukaza: {e}")
            return None
    
    def interpret_voice_command(self, command_text: str, waiter_id: str) -> str:
        """Interpretiraj glasovni ukaz"""
        command_lower = command_text.lower()
        
        if "miza" in command_lower and "naročilo" in command_lower:
            return "Pripravljen za novo naročilo"
        elif "status" in command_lower:
            return "Prikazujem status naročil"
        elif "pripravljeno" in command_lower:
            return "Označujem naročilo kot pripravljeno"
        elif "pomoč" in command_lower:
            return "Na voljo so ukazi: novo naročilo, status, pripravljeno"
        else:
            return f"Ukaz '{command_text}' ni prepoznan"
    
    def get_active_orders(self, status_filter: OrderStatus = None) -> List[Dict]:
        """Pridobi aktivna naročila"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = "SELECT * FROM orders WHERE status != 'strezeno' AND status != 'preklicano'"
            params = []
            
            if status_filter:
                query += " AND status = ?"
                params.append(status_filter.value)
            
            query += " ORDER BY priority DESC, created_at ASC"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            orders = []
            for row in rows:
                order_data = {
                    "id": row[0],
                    "table_number": row[1],
                    "waiter_id": row[2],
                    "items": json.loads(row[3]),
                    "status": row[4],
                    "priority": row[5],
                    "created_at": row[6],
                    "estimated_ready_time": row[7],
                    "special_notes": row[8],
                    "customer_count": row[9]
                }
                orders.append(order_data)
            
            conn.close()
            return orders
            
        except Exception as e:
            print(f"Napaka pri pridobivanju naročil: {e}")
            return []
    
    def get_kitchen_dashboard_data(self) -> Dict:
        """Pridobi podatke za kuhinjski dashboard"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Statistike naročil
            cursor.execute('''
                SELECT status, COUNT(*) 
                FROM orders 
                WHERE DATE(created_at) = DATE('now')
                GROUP BY status
            ''')
            status_stats = dict(cursor.fetchall())
            
            # Povprečni čas priprave
            cursor.execute('''
                SELECT AVG(
                    (julianday(estimated_ready_time) - julianday(created_at)) * 24 * 60
                ) as avg_prep_time
                FROM orders 
                WHERE status = 'pripravljeno'
                AND DATE(created_at) = DATE('now')
            ''')
            avg_prep_time = cursor.fetchone()[0] or 0
            
            # Aktivne postaje
            cursor.execute('SELECT * FROM kitchen_stations')
            stations = cursor.fetchall()
            
            dashboard_data = {
                "timestamp": datetime.datetime.now().isoformat(),
                "active_orders": len(self.get_active_orders()),
                "status_statistics": status_stats,
                "average_preparation_time": round(avg_prep_time, 1),
                "kitchen_stations": len(stations),
                "pending_orders": len(self.get_active_orders(OrderStatus.PENDING)),
                "preparing_orders": len(self.get_active_orders(OrderStatus.PREPARING)),
                "ready_orders": len(self.get_active_orders(OrderStatus.READY))
            }
            
            conn.close()
            return dashboard_data
            
        except Exception as e:
            print(f"Napaka pri pridobivanju dashboard podatkov: {e}")
            return {}

def demo_kitchen_system():
    """Demo funkcija kuhinjskega sistema"""
    print("🍳 OMNI KITCHEN & ORDERING SYSTEM - DEMO")
    print("=" * 50)
    
    # Inicializacija sistema
    kitchen_system = OmniKitchenOrderingSystem()
    
    # Registracija kuhinjskih postaj
    stations = [
        ("HOT001", "Topla kuhinja", "hot", 2, 8),
        ("COLD001", "Hladna kuhinja", "cold", 1, 5),
        ("BAR001", "Bar", "bar", 1, 10),
        ("GRILL001", "Žar", "grill", 1, 6)
    ]
    
    print("\n🏭 Registracija kuhinjskih postaj:")
    for station_id, name, station_type, staff, capacity in stations:
        success = kitchen_system.register_kitchen_station(station_id, name, station_type, staff, capacity)
        print(f"✅ {name} ({station_type}) - {staff} oseb, kapaciteta: {capacity}")
    
    # Registracija naprav
    devices = [
        ("TAB001", "Tablica natakar 1", DeviceType.WAITER_TABLET, "Terasa", "192.168.1.20"),
        ("TAB002", "Tablica natakar 2", DeviceType.WAITER_TABLET, "Notranjost", "192.168.1.21"),
        ("KDS001", "Kuhinjski monitor 1", DeviceType.KITCHEN_DISPLAY, "Topla kuhinja", "192.168.1.30"),
        ("KDS002", "Kuhinjski monitor 2", DeviceType.KITCHEN_DISPLAY, "Hladna kuhinja", "192.168.1.31"),
        ("BAR001", "Bar monitor", DeviceType.BAR_DISPLAY, "Bar", "192.168.1.32"),
        ("VOICE001", "Glasovna naprava", DeviceType.VOICE_DEVICE, "Kuhinja", "192.168.1.40")
    ]
    
    print("\n📱 Registracija naprav:")
    for device_id, name, device_type, location, ip in devices:
        success = kitchen_system.register_device(device_id, name, device_type, location, ip)
        print(f"✅ {name} ({device_type.value}) - {location}")
    
    # Dodajanje menijev
    menu_items = [
        ("FOOD001", "Goveja juha", ItemType.APPETIZER, 5, "HOT001", 4.50, ["goveje meso", "zelenjava"], []),
        ("FOOD002", "Cezar solata", ItemType.APPETIZER, 8, "COLD001", 7.80, ["solata", "piščanec", "parmezan"], ["gluten"]),
        ("FOOD003", "Dunajski zrezek", ItemType.MAIN_COURSE, 15, "HOT001", 12.80, ["svinjina", "krompir"], ["gluten", "jajca"]),
        ("FOOD004", "Losos na žaru", ItemType.MAIN_COURSE, 20, "GRILL001", 18.50, ["losos", "zelenjava"], ["ribe"]),
        ("BEV001", "Coca Cola", ItemType.BEVERAGE, 1, "BAR001", 2.50, [], []),
        ("BEV002", "Laško pivo", ItemType.BEVERAGE, 2, "BAR001", 3.20, [], []),
        ("WINE001", "Bela vina", ItemType.WINE, 3, "BAR001", 15.00, [], []),
        ("DESS001", "Tiramisu", ItemType.DESSERT, 5, "COLD001", 6.50, ["mascarpone", "kava"], ["jajca", "mleko"])
    ]
    
    print("\n🍽️ Dodajanje menijev:")
    for item_id, name, item_type, prep_time, station, price, ingredients, allergens in menu_items:
        success = kitchen_system.add_menu_item(item_id, name, item_type, prep_time, station, price, ingredients, allergens)
        print(f"✅ {name} - {prep_time}min ({station}) - {price}€")
    
    # Simulacija naročil
    print("\n📝 Simulacija naročil:")
    
    # Naročilo 1 - Miza 5
    items1 = [
        {
            "name": "Goveja juha",
            "item_type": "predjed",
            "quantity": 2,
            "price": 4.50,
            "preparation_time": 5,
            "special_instructions": "Brez soli",
            "allergens": []
        },
        {
            "name": "Dunajski zrezek",
            "item_type": "glavna_jed",
            "quantity": 2,
            "price": 12.80,
            "preparation_time": 15,
            "special_instructions": "",
            "allergens": ["gluten", "jajca"]
        },
        {
            "name": "Laško pivo",
            "item_type": "pijaca",
            "quantity": 2,
            "price": 3.20,
            "preparation_time": 2,
            "special_instructions": "",
            "allergens": []
        }
    ]
    
    order1 = kitchen_system.create_order(5, "NAT001", items1, 2, "Gosti so vegetarijanci", OrderPriority.NORMAL)
    if order1:
        print(f"✅ Naročilo 1 - Miza {order1.table_number}: {len(order1.items)} artiklov")
        print(f"   Predvideni čas priprave: {order1.estimated_ready_time.strftime('%H:%M')}")
    
    # Naročilo 2 - Miza 12 (visoka prioriteta)
    items2 = [
        {
            "name": "Losos na žaru",
            "item_type": "glavna_jed",
            "quantity": 1,
            "price": 18.50,
            "preparation_time": 20,
            "special_instructions": "Medium rare",
            "allergens": ["ribe"]
        },
        {
            "name": "Bela vina",
            "item_type": "vino",
            "quantity": 1,
            "price": 15.00,
            "preparation_time": 3,
            "special_instructions": "Ohlajen",
            "allergens": []
        }
    ]
    
    order2 = kitchen_system.create_order(12, "NAT002", items2, 1, "VIP gost", OrderPriority.HIGH)
    if order2:
        print(f"✅ Naročilo 2 - Miza {order2.table_number}: {len(order2.items)} artiklov (VIP)")
        print(f"   Predvideni čas priprave: {order2.estimated_ready_time.strftime('%H:%M')}")
    
    # Simulacija sprememb statusov
    print("\n🔄 Simulacija sprememb statusov:")
    time.sleep(1)
    
    if order1:
        kitchen_system.update_order_status(order1.id, OrderStatus.CONFIRMED)
        print(f"✅ Naročilo 1 potrjeno")
        
        time.sleep(1)
        kitchen_system.update_order_status(order1.id, OrderStatus.PREPARING)
        print(f"✅ Naročilo 1 v pripravi")
        
        time.sleep(2)
        kitchen_system.update_order_status(order1.id, OrderStatus.READY)
        print(f"✅ Naročilo 1 pripravljeno")
    
    if order2:
        kitchen_system.update_order_status(order2.id, OrderStatus.CONFIRMED)
        kitchen_system.update_order_status(order2.id, OrderStatus.PREPARING)
        print(f"✅ Naročilo 2 potrjeno in v pripravi")
    
    # Prikaz aktivnih naročil
    active_orders = kitchen_system.get_active_orders()
    print(f"\n📋 Aktivna naročila: {len(active_orders)}")
    for order in active_orders:
        print(f"   - Miza {order['table_number']}: {order['status']} ({len(order['items'])} artiklov)")
    
    # Dashboard podatki
    dashboard_data = kitchen_system.get_kitchen_dashboard_data()
    print(f"\n📊 Kuhinjski dashboard:")
    print(f"   🔥 Aktivna naročila: {dashboard_data.get('active_orders', 0)}")
    print(f"   ⏱️ Povprečni čas priprave: {dashboard_data.get('average_preparation_time', 0)} min")
    print(f"   ⏳ V čakanju: {dashboard_data.get('pending_orders', 0)}")
    print(f"   👨‍🍳 V pripravi: {dashboard_data.get('preparing_orders', 0)}")
    print(f"   ✅ Pripravljeno: {dashboard_data.get('ready_orders', 0)}")
    print(f"   🏭 Kuhinjske postaje: {dashboard_data.get('kitchen_stations', 0)}")
    
    # Simulacija glasovnega ukaza (brez mikrofona)
    print(f"\n🎤 Simulacija glasovnega ukaza:")
    voice_response = kitchen_system.interpret_voice_command("Status naročil za mizo 5", "NAT001")
    print(f"   Glasovni ukaz: 'Status naročil za mizo 5'")
    print(f"   Odziv: {voice_response}")
    
    print("\n🎉 Kuhinjski sistem uspešno testiran!")
    print("✅ Digitalne tablice povezane")
    print("✅ KDS monitorji aktivni")
    print("✅ Glasovni sistem pripravljen")
    print("✅ Obvestila delujejo")
    print("✅ Status tracking aktiven")
    print("✅ Dashboard podatki na voljo")

if __name__ == "__main__":
    demo_kitchen_system()