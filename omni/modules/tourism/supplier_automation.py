"""
🚚 Supplier Automation System - Samodejno naročanje pri dobaviteljih
Inteligentni sistem za upravljanje dobaviteljev, samodejno naročanje in nadzor zalog
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import requests
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import schedule
import threading
import time

logger = logging.getLogger(__name__)

class OrderStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class SupplierType(Enum):
    FOOD = "food"
    BEVERAGE = "beverage"
    CLEANING = "cleaning"
    EQUIPMENT = "equipment"
    LINEN = "linen"
    OTHER = "other"

class DeliveryMethod(Enum):
    PICKUP = "pickup"
    DELIVERY = "delivery"
    COURIER = "courier"

@dataclass
class Supplier:
    """Dobavitelj"""
    supplier_id: str
    name: str
    contact_person: str
    email: str
    phone: str
    address: str
    supplier_type: SupplierType
    payment_terms: str  # "NET30", "COD", etc.
    delivery_method: DeliveryMethod
    min_order_amount: float
    delivery_fee: float
    lead_time_days: int
    reliability_score: float  # 0-1
    quality_score: float  # 0-1
    price_competitiveness: float  # 0-1
    api_endpoint: Optional[str] = None
    api_key: Optional[str] = None
    is_active: bool = True

@dataclass
class Product:
    """Produkt dobavitelja"""
    product_id: str
    supplier_id: str
    name: str
    description: str
    category: str
    unit: str  # "kg", "l", "kom", etc.
    unit_price: float
    min_order_quantity: int
    max_order_quantity: int
    shelf_life_days: int
    storage_requirements: str
    seasonal_availability: List[str]
    quality_grade: str
    certifications: List[str]  # "BIO", "HACCP", etc.

@dataclass
class InventoryItem:
    """Zaloga"""
    item_id: str
    product_id: str
    name: str
    current_stock: int
    min_stock: int
    max_stock: int
    reorder_point: int
    unit: str
    last_updated: datetime
    expiry_date: Optional[date] = None
    location: str = "main_storage"

@dataclass
class PurchaseOrder:
    """Naročilo"""
    order_id: str
    supplier_id: str
    order_date: datetime
    requested_delivery_date: date
    status: OrderStatus
    items: List[Dict[str, Any]]  # {product_id, quantity, unit_price}
    subtotal: float
    delivery_fee: float
    tax_amount: float
    total_amount: float
    notes: str = ""
    tracking_number: Optional[str] = None

class SupplierAutomation:
    """Sistem za samodejno naročanje pri dobaviteljih"""
    
    def __init__(self, db_path: str = "supplier_automation.db"):
        self.db_path = db_path
        self._init_database()
        self.scheduler_running = False
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela dobaviteljev
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS suppliers (
                    supplier_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    contact_person TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT,
                    address TEXT,
                    supplier_type TEXT NOT NULL,
                    payment_terms TEXT NOT NULL,
                    delivery_method TEXT NOT NULL,
                    min_order_amount REAL NOT NULL,
                    delivery_fee REAL DEFAULT 0,
                    lead_time_days INTEGER NOT NULL,
                    reliability_score REAL DEFAULT 0.5,
                    quality_score REAL DEFAULT 0.5,
                    price_competitiveness REAL DEFAULT 0.5,
                    api_endpoint TEXT,
                    api_key TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela produktov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS products (
                    product_id TEXT PRIMARY KEY,
                    supplier_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    category TEXT NOT NULL,
                    unit TEXT NOT NULL,
                    unit_price REAL NOT NULL,
                    min_order_quantity INTEGER NOT NULL,
                    max_order_quantity INTEGER NOT NULL,
                    shelf_life_days INTEGER NOT NULL,
                    storage_requirements TEXT,
                    seasonal_availability TEXT,
                    quality_grade TEXT,
                    certifications TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
                )
            ''')
            
            # Tabela zalog
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS inventory (
                    item_id TEXT PRIMARY KEY,
                    product_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    current_stock INTEGER NOT NULL,
                    min_stock INTEGER NOT NULL,
                    max_stock INTEGER NOT NULL,
                    reorder_point INTEGER NOT NULL,
                    unit TEXT NOT NULL,
                    last_updated TEXT NOT NULL,
                    expiry_date TEXT,
                    location TEXT DEFAULT 'main_storage',
                    FOREIGN KEY (product_id) REFERENCES products (product_id)
                )
            ''')
            
            # Tabela naročil
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS purchase_orders (
                    order_id TEXT PRIMARY KEY,
                    supplier_id TEXT NOT NULL,
                    order_date TEXT NOT NULL,
                    requested_delivery_date TEXT NOT NULL,
                    status TEXT NOT NULL,
                    items TEXT NOT NULL,
                    subtotal REAL NOT NULL,
                    delivery_fee REAL NOT NULL,
                    tax_amount REAL NOT NULL,
                    total_amount REAL NOT NULL,
                    notes TEXT,
                    tracking_number TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
                )
            ''')
            
            # Tabela zgodovine naročil
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS order_history (
                    history_id TEXT PRIMARY KEY,
                    order_id TEXT NOT NULL,
                    status_change TEXT NOT NULL,
                    changed_at TEXT NOT NULL,
                    notes TEXT,
                    FOREIGN KEY (order_id) REFERENCES purchase_orders (order_id)
                )
            ''')
            
            # Tabela avtomatskih pravil
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS automation_rules (
                    rule_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    product_id TEXT NOT NULL,
                    supplier_id TEXT NOT NULL,
                    trigger_condition TEXT NOT NULL,
                    order_quantity INTEGER NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (product_id) REFERENCES products (product_id),
                    FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
                )
            ''')
            
            conn.commit()
            logger.info("🚚 Supplier Automation baza podatkov inicializirana")
    
    def add_supplier(self, supplier: Supplier) -> Dict[str, Any]:
        """Dodaj dobavitelja"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO suppliers 
                    (supplier_id, name, contact_person, email, phone, address,
                     supplier_type, payment_terms, delivery_method, min_order_amount,
                     delivery_fee, lead_time_days, reliability_score, quality_score,
                     price_competitiveness, api_endpoint, api_key, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    supplier.supplier_id,
                    supplier.name,
                    supplier.contact_person,
                    supplier.email,
                    supplier.phone,
                    supplier.address,
                    supplier.supplier_type.value,
                    supplier.payment_terms,
                    supplier.delivery_method.value,
                    supplier.min_order_amount,
                    supplier.delivery_fee,
                    supplier.lead_time_days,
                    supplier.reliability_score,
                    supplier.quality_score,
                    supplier.price_competitiveness,
                    supplier.api_endpoint,
                    supplier.api_key,
                    supplier.is_active,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "supplier_id": supplier.supplier_id,
                    "message": f"Dobavitelj {supplier.name} uspešno dodan"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju dobavitelja: {e}")
            return {"success": False, "error": str(e)}
    
    def add_product(self, product: Product) -> Dict[str, Any]:
        """Dodaj produkt"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO products 
                    (product_id, supplier_id, name, description, category, unit,
                     unit_price, min_order_quantity, max_order_quantity, shelf_life_days,
                     storage_requirements, seasonal_availability, quality_grade, certifications)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    product.product_id,
                    product.supplier_id,
                    product.name,
                    product.description,
                    product.category,
                    product.unit,
                    product.unit_price,
                    product.min_order_quantity,
                    product.max_order_quantity,
                    product.shelf_life_days,
                    product.storage_requirements,
                    json.dumps(product.seasonal_availability),
                    product.quality_grade,
                    json.dumps(product.certifications)
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "product_id": product.product_id,
                    "message": f"Produkt {product.name} uspešno dodan"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju produkta: {e}")
            return {"success": False, "error": str(e)}
    
    def update_inventory(self, item: InventoryItem) -> Dict[str, Any]:
        """Posodobi zalogo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO inventory 
                    (item_id, product_id, name, current_stock, min_stock, max_stock,
                     reorder_point, unit, last_updated, expiry_date, location)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    item.item_id,
                    item.product_id,
                    item.name,
                    item.current_stock,
                    item.min_stock,
                    item.max_stock,
                    item.reorder_point,
                    item.unit,
                    item.last_updated.isoformat(),
                    item.expiry_date.isoformat() if item.expiry_date else None,
                    item.location
                ))
                
                conn.commit()
                
                # Preveri, ali je potrebno samodejno naročilo
                self._check_reorder_triggers(item.item_id)
                
                return {
                    "success": True,
                    "item_id": item.item_id,
                    "message": f"Zaloga {item.name} posodobljena"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju zaloge: {e}")
            return {"success": False, "error": str(e)}
    
    def _check_reorder_triggers(self, item_id: str):
        """Preveri, ali je potrebno samodejno naročilo"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Pridobi podatke o zalogi
            cursor.execute('''
                SELECT i.*, p.supplier_id, p.min_order_quantity, p.unit_price
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                WHERE i.item_id = ?
            ''', (item_id,))
            
            result = cursor.fetchone()
            if not result:
                return
            
            current_stock = result[3]
            reorder_point = result[6]
            max_stock = result[5]
            supplier_id = result[11]
            min_order_quantity = result[12]
            unit_price = result[13]
            
            # Če je zaloga pod točko ponovnega naročila
            if current_stock <= reorder_point:
                # Izračunaj količino za naročilo
                order_quantity = max(min_order_quantity, max_stock - current_stock)
                
                # Ustvari samodejno naročilo
                self._create_automatic_order(
                    supplier_id=supplier_id,
                    product_id=result[1],
                    quantity=order_quantity,
                    unit_price=unit_price,
                    reason=f"Avtomatsko naročilo - zaloga pod {reorder_point}"
                )
    
    def _create_automatic_order(self, supplier_id: str, product_id: str, 
                               quantity: int, unit_price: float, reason: str):
        """Ustvari samodejno naročilo"""
        try:
            order_id = f"AUTO_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{supplier_id}"
            
            items = [{
                "product_id": product_id,
                "quantity": quantity,
                "unit_price": unit_price
            }]
            
            subtotal = quantity * unit_price
            
            # Pridobi podatke o dobavitelju
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT delivery_fee, min_order_amount FROM suppliers 
                    WHERE supplier_id = ?
                ''', (supplier_id,))
                
                supplier_data = cursor.fetchone()
                if not supplier_data:
                    return
                
                delivery_fee = supplier_data[0]
                min_order_amount = supplier_data[1]
                
                # Preveri minimalno vrednost naročila
                if subtotal < min_order_amount:
                    logger.warning(f"Naročilo {order_id} pod minimalno vrednostjo {min_order_amount}")
                    return
                
                tax_amount = subtotal * 0.22  # 22% DDV
                total_amount = subtotal + delivery_fee + tax_amount
                
                order = PurchaseOrder(
                    order_id=order_id,
                    supplier_id=supplier_id,
                    order_date=datetime.now(),
                    requested_delivery_date=date.today() + timedelta(days=3),
                    status=OrderStatus.PENDING,
                    items=items,
                    subtotal=subtotal,
                    delivery_fee=delivery_fee,
                    tax_amount=tax_amount,
                    total_amount=total_amount,
                    notes=reason
                )
                
                # Shrani naročilo
                cursor.execute('''
                    INSERT INTO purchase_orders 
                    (order_id, supplier_id, order_date, requested_delivery_date, status,
                     items, subtotal, delivery_fee, tax_amount, total_amount, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    order.order_id,
                    order.supplier_id,
                    order.order_date.isoformat(),
                    order.requested_delivery_date.isoformat(),
                    order.status.value,
                    json.dumps(order.items),
                    order.subtotal,
                    order.delivery_fee,
                    order.tax_amount,
                    order.total_amount,
                    order.notes,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                # Pošlji naročilo dobavitelju
                self._send_order_to_supplier(order)
                
                logger.info(f"🤖 Samodejno naročilo {order_id} ustvarjeno")
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju samodejnega naročila: {e}")
    
    def _send_order_to_supplier(self, order: PurchaseOrder):
        """Pošlji naročilo dobavitelju"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi podatke o dobavitelju
                cursor.execute('''
                    SELECT name, email, api_endpoint, api_key FROM suppliers 
                    WHERE supplier_id = ?
                ''', (order.supplier_id,))
                
                supplier_data = cursor.fetchone()
                if not supplier_data:
                    return
                
                supplier_name, email, api_endpoint, api_key = supplier_data
                
                # Če ima dobavitelj API
                if api_endpoint and api_key:
                    self._send_order_via_api(order, api_endpoint, api_key)
                else:
                    # Pošlji po e-pošti
                    self._send_order_via_email(order, email, supplier_name)
                
                # Posodobi status naročila
                cursor.execute('''
                    UPDATE purchase_orders SET status = ? WHERE order_id = ?
                ''', (OrderStatus.SENT.value, order.order_id))
                
                # Dodaj v zgodovino
                cursor.execute('''
                    INSERT INTO order_history (history_id, order_id, status_change, changed_at)
                    VALUES (?, ?, ?, ?)
                ''', (
                    f"HIST_{order.order_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    order.order_id,
                    f"Status spremenjen na {OrderStatus.SENT.value}",
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju naročila: {e}")
    
    def _send_order_via_api(self, order: PurchaseOrder, api_endpoint: str, api_key: str):
        """Pošlji naročilo preko API-ja"""
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            order_data = {
                "order_id": order.order_id,
                "order_date": order.order_date.isoformat(),
                "requested_delivery_date": order.requested_delivery_date.isoformat(),
                "items": order.items,
                "total_amount": order.total_amount,
                "notes": order.notes
            }
            
            response = requests.post(
                f"{api_endpoint}/orders",
                headers=headers,
                json=order_data,
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Naročilo {order.order_id} uspešno poslano preko API")
            else:
                logger.error(f"❌ Napaka pri pošiljanju preko API: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Napaka pri API pošiljanju: {e}")
    
    def _send_order_via_email(self, order: PurchaseOrder, email: str, supplier_name: str):
        """Pošlji naročilo po e-pošti"""
        try:
            # Ustvari e-poštno sporočilo
            msg = MimeMultipart()
            msg['From'] = "orders@restaurant.com"  # Konfiguriraj
            msg['To'] = email
            msg['Subject'] = f"Novo naročilo #{order.order_id}"
            
            # Ustvari vsebino
            body = f"""
            Spoštovani {supplier_name},
            
            Pošiljamo vam novo naročilo:
            
            Številka naročila: {order.order_id}
            Datum naročila: {order.order_date.strftime('%d.%m.%Y %H:%M')}
            Želeni datum dostave: {order.requested_delivery_date.strftime('%d.%m.%Y')}
            
            Naročeni artikli:
            """
            
            for item in order.items:
                body += f"- {item['product_id']}: {item['quantity']} x {item['unit_price']:.2f}€\n"
            
            body += f"""
            
            Skupaj brez DDV: {order.subtotal:.2f}€
            Dostava: {order.delivery_fee:.2f}€
            DDV: {order.tax_amount:.2f}€
            SKUPAJ: {order.total_amount:.2f}€
            
            Opombe: {order.notes}
            
            Prosimo potrdite sprejem naročila.
            
            Lep pozdrav,
            Sistem za naročanje
            """
            
            msg.attach(MimeText(body, 'plain', 'utf-8'))
            
            # Pošlji e-pošto (konfiguriraj SMTP nastavitve)
            # smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
            # smtp_server.starttls()
            # smtp_server.login("your_email", "your_password")
            # smtp_server.send_message(msg)
            # smtp_server.quit()
            
            logger.info(f"📧 Naročilo {order.order_id} poslano po e-pošti na {email}")
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju e-pošte: {e}")
    
    def get_low_stock_items(self) -> List[Dict[str, Any]]:
        """Pridobi artikle z nizko zalogo"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    i.item_id,
                    i.name,
                    i.current_stock,
                    i.min_stock,
                    i.reorder_point,
                    p.supplier_id,
                    s.name as supplier_name
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                JOIN suppliers s ON p.supplier_id = s.supplier_id
                WHERE i.current_stock <= i.reorder_point
                ORDER BY (i.current_stock / i.reorder_point) ASC
            ''')
            
            low_stock_items = []
            for row in cursor.fetchall():
                low_stock_items.append({
                    "item_id": row[0],
                    "name": row[1],
                    "current_stock": row[2],
                    "min_stock": row[3],
                    "reorder_point": row[4],
                    "supplier_id": row[5],
                    "supplier_name": row[6],
                    "urgency": "CRITICAL" if row[2] <= row[3] else "LOW"
                })
            
            return low_stock_items
    
    def get_pending_orders(self) -> List[Dict[str, Any]]:
        """Pridobi čakajoča naročila"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    po.order_id,
                    po.supplier_id,
                    s.name as supplier_name,
                    po.order_date,
                    po.requested_delivery_date,
                    po.status,
                    po.total_amount
                FROM purchase_orders po
                JOIN suppliers s ON po.supplier_id = s.supplier_id
                WHERE po.status IN ('pending', 'sent', 'confirmed')
                ORDER BY po.requested_delivery_date ASC
            ''')
            
            orders = []
            for row in cursor.fetchall():
                orders.append({
                    "order_id": row[0],
                    "supplier_id": row[1],
                    "supplier_name": row[2],
                    "order_date": row[3],
                    "requested_delivery_date": row[4],
                    "status": row[5],
                    "total_amount": row[6]
                })
            
            return orders
    
    def generate_supplier_report(self, supplier_id: str, 
                                start_date: date, end_date: date) -> Dict[str, Any]:
        """Generiraj poročilo o dobavitelju"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Osnovni podatki o dobavitelju
            cursor.execute('''
                SELECT * FROM suppliers WHERE supplier_id = ?
            ''', (supplier_id,))
            
            supplier_data = cursor.fetchone()
            if not supplier_data:
                return {"error": "Dobavitelj ne obstaja"}
            
            # Statistike naročil
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(total_amount) as total_spent,
                    AVG(total_amount) as avg_order_value,
                    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
                FROM purchase_orders 
                WHERE supplier_id = ? AND order_date BETWEEN ? AND ?
            ''', (supplier_id, start_date.isoformat(), end_date.isoformat()))
            
            stats = cursor.fetchone()
            
            # Zadnje naročilo
            cursor.execute('''
                SELECT order_id, order_date, total_amount, status
                FROM purchase_orders 
                WHERE supplier_id = ? 
                ORDER BY order_date DESC LIMIT 1
            ''', (supplier_id,))
            
            last_order = cursor.fetchone()
            
            return {
                "supplier_id": supplier_id,
                "supplier_name": supplier_data[1],
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "statistics": {
                    "total_orders": stats[0] or 0,
                    "total_spent": stats[1] or 0,
                    "avg_order_value": stats[2] or 0,
                    "delivered_orders": stats[3] or 0,
                    "delivery_rate": (stats[3] / stats[0] * 100) if stats[0] > 0 else 0
                },
                "last_order": {
                    "order_id": last_order[0] if last_order else None,
                    "date": last_order[1] if last_order else None,
                    "amount": last_order[2] if last_order else None,
                    "status": last_order[3] if last_order else None
                } if last_order else None,
                "scores": {
                    "reliability": supplier_data[12],
                    "quality": supplier_data[13],
                    "price_competitiveness": supplier_data[14]
                }
            }
    
    def start_automation_scheduler(self):
        """Zaženi avtomatski razporejevalnik"""
        if self.scheduler_running:
            return
        
        # Nastavi urnik
        schedule.every(1).hours.do(self._check_all_inventory)
        schedule.every().day.at("08:00").do(self._send_daily_report)
        schedule.every().monday.at("09:00").do(self._send_weekly_report)
        
        self.scheduler_running = True
        
        def run_scheduler():
            while self.scheduler_running:
                schedule.run_pending()
                time.sleep(60)  # Preveri vsako minuto
        
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        
        logger.info("🤖 Avtomatski razporejevalnik zagnan")
    
    def stop_automation_scheduler(self):
        """Ustavi avtomatski razporejevalnik"""
        self.scheduler_running = False
        schedule.clear()
        logger.info("⏹️ Avtomatski razporejevalnik ustavljen")
    
    def _check_all_inventory(self):
        """Preveri vse zaloge"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT item_id FROM inventory')
            for row in cursor.fetchall():
                self._check_reorder_triggers(row[0])
    
    def _send_daily_report(self):
        """Pošlji dnevno poročilo"""
        low_stock = self.get_low_stock_items()
        pending_orders = self.get_pending_orders()
        
        logger.info(f"📊 Dnevno poročilo: {len(low_stock)} nizkih zalog, {len(pending_orders)} čakajočih naročil")
    
    def _send_weekly_report(self):
        """Pošlji tedensko poročilo"""
        logger.info("📊 Tedensko poročilo poslano")

# Primer uporabe
if __name__ == "__main__":
    automation = SupplierAutomation()
    
    # Dodaj testnega dobavitelja
    supplier = Supplier(
        supplier_id="SUP001",
        name="Lokalni kmet d.o.o.",
        contact_person="Janez Novak",
        email="janez@lokalni-kmet.si",
        phone="+386 1 234 5678",
        address="Kmetijska ulica 1, 1000 Ljubljana",
        supplier_type=SupplierType.FOOD,
        payment_terms="NET30",
        delivery_method=DeliveryMethod.DELIVERY,
        min_order_amount=100.0,
        delivery_fee=15.0,
        lead_time_days=2,
        reliability_score=0.9,
        quality_score=0.95,
        price_competitiveness=0.8
    )
    
    result = automation.add_supplier(supplier)
    print(f"Dodajanje dobavitelja: {result}")
    
    # Dodaj testni produkt
    product = Product(
        product_id="PROD001",
        supplier_id="SUP001",
        name="Ekološki paradižnik",
        description="Svež ekološki paradižnik iz lokalnega pridelovanja",
        category="Zelenjava",
        unit="kg",
        unit_price=3.50,
        min_order_quantity=5,
        max_order_quantity=100,
        shelf_life_days=7,
        storage_requirements="Hladno, suho mesto",
        seasonal_availability=["summer", "autumn"],
        quality_grade="A",
        certifications=["BIO", "HACCP"]
    )
    
    result = automation.add_product(product)
    print(f"Dodajanje produkta: {result}")
    
    # Posodobi zalogo
    inventory_item = InventoryItem(
        item_id="INV001",
        product_id="PROD001",
        name="Ekološki paradižnik",
        current_stock=3,  # Nizka zaloga
        min_stock=5,
        max_stock=50,
        reorder_point=8,
        unit="kg",
        last_updated=datetime.now()
    )
    
    result = automation.update_inventory(inventory_item)
    print(f"Posodabljanje zaloge: {result}")
    
    # Pridobi nizke zaloge
    low_stock = automation.get_low_stock_items()
    print(f"Nizke zaloge: {low_stock}")
    
    # Zaženi avtomatizacijo
    automation.start_automation_scheduler()
    print("Avtomatizacija zagnana")