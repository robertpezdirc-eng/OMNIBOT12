#!/usr/bin/env python3
"""
🛒 Ultimate Auto Ordering System
Samodejno naročanje pri dobaviteljih z optimizacijo cen in povezavo z logistiko
"""

import json
import sqlite3
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple
import threading
import time
import requests
from pathlib import Path

class SupplierType(Enum):
    LOCAL = "local"
    REGIONAL = "regional"
    NATIONAL = "national"
    INTERNATIONAL = "international"

class OrderStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    CONFIRMED = "confirmed"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class PriorityLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class Supplier:
    id: str
    name: str
    type: SupplierType
    contact_email: str
    contact_phone: str
    delivery_days: int
    minimum_order: float
    reliability_score: float  # 0.0 - 1.0
    price_competitiveness: float  # 0.0 - 1.0
    quality_rating: float  # 0.0 - 1.0
    payment_terms: str
    delivery_cost: float
    specialties: List[str]
    active: bool = True

@dataclass
class Product:
    id: str
    name: str
    category: str
    unit: str
    current_stock: float
    minimum_stock: float
    maximum_stock: float
    unit_cost: float
    shelf_life_days: int
    storage_requirements: str
    seasonal_factor: float = 1.0

@dataclass
class SupplierProduct:
    supplier_id: str
    product_id: str
    price_per_unit: float
    minimum_quantity: float
    lead_time_days: int
    quality_grade: str
    last_updated: datetime

@dataclass
class AutoOrder:
    id: str
    supplier_id: str
    products: Dict[str, float]  # product_id: quantity
    total_amount: float
    status: OrderStatus
    priority: PriorityLevel
    created_at: datetime
    expected_delivery: datetime
    notes: str = ""

class UltimateAutoOrdering:
    def __init__(self, db_path: str = "auto_ordering.db"):
        self.db_path = db_path
        self.suppliers: Dict[str, Supplier] = {}
        self.products: Dict[str, Product] = {}
        self.supplier_products: List[SupplierProduct] = []
        self.orders: Dict[str, AutoOrder] = {}
        self.monitoring_active = False
        
        self.init_database()
        self.load_demo_data()
        print("🛒 Ultimate Auto Ordering sistem inicializiran!")

    def init_database(self):
        """Inicializacija SQLite baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela dobaviteljev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS suppliers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                contact_email TEXT,
                contact_phone TEXT,
                delivery_days INTEGER,
                minimum_order REAL,
                reliability_score REAL,
                price_competitiveness REAL,
                quality_rating REAL,
                payment_terms TEXT,
                delivery_cost REAL,
                specialties TEXT,
                active BOOLEAN DEFAULT 1
            )
        ''')
        
        # Tabela produktov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT,
                unit TEXT,
                current_stock REAL,
                minimum_stock REAL,
                maximum_stock REAL,
                unit_cost REAL,
                shelf_life_days INTEGER,
                storage_requirements TEXT,
                seasonal_factor REAL DEFAULT 1.0
            )
        ''')
        
        # Tabela naročil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                supplier_id TEXT,
                products TEXT,
                total_amount REAL,
                status TEXT,
                priority TEXT,
                created_at TEXT,
                expected_delivery TEXT,
                notes TEXT,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
            )
        ''')
        
        # Tabela cen dobaviteljev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS supplier_products (
                supplier_id TEXT,
                product_id TEXT,
                price_per_unit REAL,
                minimum_quantity REAL,
                lead_time_days INTEGER,
                quality_grade TEXT,
                last_updated TEXT,
                PRIMARY KEY (supplier_id, product_id),
                FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        ''')
        
        conn.commit()
        conn.close()

    def add_supplier(self, supplier: Supplier):
        """Dodaj novega dobavitelja"""
        self.suppliers[supplier.id] = supplier
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO suppliers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            supplier.id, supplier.name, supplier.type.value, supplier.contact_email,
            supplier.contact_phone, supplier.delivery_days, supplier.minimum_order,
            supplier.reliability_score, supplier.price_competitiveness, supplier.quality_rating,
            supplier.payment_terms, supplier.delivery_cost, json.dumps(supplier.specialties),
            supplier.active
        ))
        conn.commit()
        conn.close()

    def add_product(self, product: Product):
        """Dodaj nov produkt"""
        self.products[product.id] = product
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            product.id, product.name, product.category, product.unit,
            product.current_stock, product.minimum_stock, product.maximum_stock,
            product.unit_cost, product.shelf_life_days, product.storage_requirements,
            product.seasonal_factor
        ))
        conn.commit()
        conn.close()

    def add_supplier_product(self, supplier_product: SupplierProduct):
        """Dodaj ceno produkta pri dobavitelju"""
        self.supplier_products.append(supplier_product)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO supplier_products VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            supplier_product.supplier_id, supplier_product.product_id,
            supplier_product.price_per_unit, supplier_product.minimum_quantity,
            supplier_product.lead_time_days, supplier_product.quality_grade,
            supplier_product.last_updated.isoformat()
        ))
        conn.commit()
        conn.close()

    def check_stock_levels(self) -> List[Tuple[Product, float]]:
        """Preveri zaloge in vrni produkte, ki potrebujejo naročilo"""
        low_stock_products = []
        
        for product in self.products.values():
            if product.current_stock <= product.minimum_stock:
                needed_quantity = product.maximum_stock - product.current_stock
                # Upoštevaj sezonski faktor
                needed_quantity *= product.seasonal_factor
                low_stock_products.append((product, needed_quantity))
        
        return low_stock_products

    def find_best_supplier(self, product_id: str, quantity: float) -> Optional[Tuple[Supplier, SupplierProduct, float]]:
        """Najdi najboljšega dobavitelja za produkt"""
        best_supplier = None
        best_product = None
        best_score = 0.0
        
        for sp in self.supplier_products:
            if sp.product_id == product_id and sp.minimum_quantity <= quantity:
                supplier = self.suppliers.get(sp.supplier_id)
                if not supplier or not supplier.active:
                    continue
                
                # Izračunaj skupni strošek
                total_cost = sp.price_per_unit * quantity + supplier.delivery_cost
                
                # Izračunaj oceno dobavitelja (nižji stroški = boljša ocena)
                cost_score = 1.0 / (1.0 + total_cost / 100)  # Normaliziraj stroške
                quality_score = supplier.quality_rating
                reliability_score = supplier.reliability_score
                speed_score = 1.0 / (1.0 + sp.lead_time_days / 7)  # Hitrejša dostava = boljša ocena
                
                # Skupna ocena (uteži lahko prilagodiš)
                total_score = (cost_score * 0.3 + quality_score * 0.25 + 
                             reliability_score * 0.25 + speed_score * 0.2)
                
                if total_score > best_score:
                    best_score = total_score
                    best_supplier = supplier
                    best_product = sp
        
        if best_supplier:
            total_cost = best_product.price_per_unit * quantity + best_supplier.delivery_cost
            return (best_supplier, best_product, total_cost)
        
        return None

    def create_auto_order(self, low_stock_products: List[Tuple[Product, float]]) -> List[AutoOrder]:
        """Ustvari samodejne naročila"""
        orders = []
        supplier_orders = {}  # Združi naročila po dobaviteljih
        
        for product, needed_quantity in low_stock_products:
            best_option = self.find_best_supplier(product.id, needed_quantity)
            if not best_option:
                print(f"⚠️ Ni najden dobavitelj za {product.name}")
                continue
            
            supplier, supplier_product, total_cost = best_option
            
            # Združi naročila istega dobavitelja
            if supplier.id not in supplier_orders:
                supplier_orders[supplier.id] = {
                    'supplier': supplier,
                    'products': {},
                    'total_amount': 0.0
                }
            
            supplier_orders[supplier.id]['products'][product.id] = needed_quantity
            supplier_orders[supplier.id]['total_amount'] += supplier_product.price_per_unit * needed_quantity
        
        # Ustvari naročila
        for supplier_id, order_data in supplier_orders.items():
            supplier = order_data['supplier']
            
            # Preveri minimalno naročilo
            if order_data['total_amount'] < supplier.minimum_order:
                print(f"⚠️ Naročilo pri {supplier.name} je premajhno (€{order_data['total_amount']:.2f} < €{supplier.minimum_order:.2f})")
                continue
            
            order_id = f"ORD_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{supplier_id}"
            
            # Določi prioriteto
            priority = PriorityLevel.MEDIUM
            critical_products = [pid for pid in order_data['products'].keys() 
                               if self.products[pid].current_stock <= 0]
            if critical_products:
                priority = PriorityLevel.CRITICAL
            
            order = AutoOrder(
                id=order_id,
                supplier_id=supplier_id,
                products=order_data['products'],
                total_amount=order_data['total_amount'] + supplier.delivery_cost,
                status=OrderStatus.PENDING,
                priority=priority,
                created_at=datetime.now(),
                expected_delivery=datetime.now() + timedelta(days=supplier.delivery_days),
                notes=f"Samodejno naročilo - {len(order_data['products'])} produktov"
            )
            
            orders.append(order)
            self.orders[order_id] = order
            self.save_order(order)
        
        return orders

    def save_order(self, order: AutoOrder):
        """Shrani naročilo v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            order.id, order.supplier_id, json.dumps(order.products),
            order.total_amount, order.status.value, order.priority.value,
            order.created_at.isoformat(), order.expected_delivery.isoformat(),
            order.notes
        ))
        conn.commit()
        conn.close()

    def send_order_to_supplier(self, order: AutoOrder) -> bool:
        """Pošlji naročilo dobavitelju (simulacija)"""
        supplier = self.suppliers.get(order.supplier_id)
        if not supplier:
            return False
        
        # Simulacija pošiljanja e-maila
        print(f"📧 Pošiljam naročilo {order.id} na {supplier.contact_email}")
        
        # V resničnem sistemu bi tukaj poslal e-mail ali API klic
        order.status = OrderStatus.SENT
        self.save_order(order)
        
        return True

    def process_pending_orders(self):
        """Obdelaj čakajoča naročila"""
        pending_orders = [order for order in self.orders.values() 
                         if order.status == OrderStatus.PENDING]
        
        for order in pending_orders:
            if self.send_order_to_supplier(order):
                print(f"✅ Naročilo {order.id} uspešno poslano")
            else:
                print(f"❌ Napaka pri pošiljanju naročila {order.id}")

    def update_stock_after_delivery(self, order_id: str):
        """Posodobi zaloge po dostavi"""
        order = self.orders.get(order_id)
        if not order or order.status != OrderStatus.DELIVERED:
            return False
        
        for product_id, quantity in order.products.items():
            if product_id in self.products:
                self.products[product_id].current_stock += quantity
                
                # Posodobi v bazi
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE products SET current_stock = ? WHERE id = ?
                ''', (self.products[product_id].current_stock, product_id))
                conn.commit()
                conn.close()
        
        print(f"📦 Zaloge posodobljene za naročilo {order_id}")
        return True

    def get_supplier_performance(self, supplier_id: str) -> Dict:
        """Pridobi statistike uspešnosti dobavitelja"""
        supplier_orders = [order for order in self.orders.values() 
                          if order.supplier_id == supplier_id]
        
        if not supplier_orders:
            return {}
        
        total_orders = len(supplier_orders)
        delivered_orders = len([o for o in supplier_orders if o.status == OrderStatus.DELIVERED])
        cancelled_orders = len([o for o in supplier_orders if o.status == OrderStatus.CANCELLED])
        total_value = sum(order.total_amount for order in supplier_orders)
        
        # Izračunaj povprečni čas dostave
        delivered = [o for o in supplier_orders if o.status == OrderStatus.DELIVERED]
        avg_delivery_time = 0
        if delivered:
            delivery_times = [(o.expected_delivery - o.created_at).days for o in delivered]
            avg_delivery_time = sum(delivery_times) / len(delivery_times)
        
        return {
            'total_orders': total_orders,
            'delivery_rate': delivered_orders / total_orders if total_orders > 0 else 0,
            'cancellation_rate': cancelled_orders / total_orders if total_orders > 0 else 0,
            'total_value': total_value,
            'avg_delivery_time': avg_delivery_time
        }

    def start_monitoring(self):
        """Začni samodejno spremljanje zalog"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        
        def monitor_loop():
            while self.monitoring_active:
                try:
                    # Preveri zaloge vsako uro
                    low_stock = self.check_stock_levels()
                    if low_stock:
                        print(f"🔍 Najdenih {len(low_stock)} produktov z nizko zalogo")
                        orders = self.create_auto_order(low_stock)
                        if orders:
                            print(f"🛒 Ustvarjenih {len(orders)} samodejnih naročil")
                            self.process_pending_orders()
                    
                    time.sleep(3600)  # Počakaj 1 uro
                except Exception as e:
                    print(f"❌ Napaka pri spremljanju: {e}")
                    time.sleep(60)  # Počakaj 1 minuto pri napaki
        
        monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        monitor_thread.start()
        print("🔄 Samodejno spremljanje zalog aktivirano")

    def stop_monitoring(self):
        """Ustavi samodejno spremljanje"""
        self.monitoring_active = False
        print("⏹️ Samodejno spremljanje ustavljeno")

    def get_dashboard_data(self) -> Dict:
        """Pridobi podatke za dashboard"""
        total_orders = len(self.orders)
        pending_orders = len([o for o in self.orders.values() if o.status == OrderStatus.PENDING])
        active_suppliers = len([s for s in self.suppliers.values() if s.active])
        low_stock_count = len(self.check_stock_levels())
        
        # Skupna vrednost naročil
        total_value = sum(order.total_amount for order in self.orders.values())
        
        # Najdražji dobavitelji
        supplier_spending = {}
        for order in self.orders.values():
            if order.supplier_id not in supplier_spending:
                supplier_spending[order.supplier_id] = 0
            supplier_spending[order.supplier_id] += order.total_amount
        
        return {
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'active_suppliers': active_suppliers,
            'low_stock_products': low_stock_count,
            'total_spending': total_value,
            'top_suppliers': sorted(supplier_spending.items(), key=lambda x: x[1], reverse=True)[:5],
            'monitoring_active': self.monitoring_active
        }

    def load_demo_data(self):
        """Naloži demo podatke"""
        # Demo dobavitelji
        suppliers = [
            Supplier(
                id="SUP001", name="Lokalna Kmetija Novak", type=SupplierType.LOCAL,
                contact_email="info@kmetija-novak.si", contact_phone="+386 1 234 5678",
                delivery_days=1, minimum_order=50.0, reliability_score=0.95,
                price_competitiveness=0.85, quality_rating=0.90, payment_terms="30 dni",
                delivery_cost=5.0, specialties=["zelenjava", "sadje", "mlečni_izdelki"]
            ),
            Supplier(
                id="SUP002", name="Mesnica Petek", type=SupplierType.REGIONAL,
                contact_email="narocila@mesnica-petek.si", contact_phone="+386 2 345 6789",
                delivery_days=2, minimum_order=100.0, reliability_score=0.90,
                price_competitiveness=0.80, quality_rating=0.95, payment_terms="15 dni",
                delivery_cost=10.0, specialties=["meso", "mesni_izdelki"]
            ),
            Supplier(
                id="SUP003", name="Trgovina Mercator", type=SupplierType.NATIONAL,
                contact_email="b2b@mercator.si", contact_phone="+386 1 456 7890",
                delivery_days=3, minimum_order=200.0, reliability_score=0.85,
                price_competitiveness=0.75, quality_rating=0.80, payment_terms="45 dni",
                delivery_cost=15.0, specialties=["suhe_dobrine", "pijače", "čistila"]
            )
        ]
        
        for supplier in suppliers:
            self.add_supplier(supplier)
        
        # Demo produkti
        products = [
            Product("PROD001", "Paradižnik", "zelenjava", "kg", 5.0, 10.0, 50.0, 2.50, 7, "hladno", 1.2),
            Product("PROD002", "Kruh", "pekovski_izdelki", "kos", 20.0, 30.0, 100.0, 1.20, 3, "sobna_temp", 1.0),
            Product("PROD003", "Mleko", "mlečni_izdelki", "l", 8.0, 15.0, 60.0, 0.80, 5, "hladno", 1.0),
            Product("PROD004", "Govedina", "meso", "kg", 2.0, 5.0, 20.0, 12.00, 3, "zamrznjeno", 0.9),
            Product("PROD005", "Pivo", "pijače", "steklenica", 50.0, 100.0, 500.0, 1.50, 180, "hladno", 1.5)
        ]
        
        for product in products:
            self.add_product(product)
        
        # Demo cene pri dobaviteljih
        supplier_products = [
            SupplierProduct("SUP001", "PROD001", 2.20, 5.0, 1, "A", datetime.now()),
            SupplierProduct("SUP001", "PROD003", 0.75, 10.0, 1, "A", datetime.now()),
            SupplierProduct("SUP002", "PROD004", 11.50, 2.0, 2, "Premium", datetime.now()),
            SupplierProduct("SUP003", "PROD002", 1.10, 20.0, 3, "B", datetime.now()),
            SupplierProduct("SUP003", "PROD005", 1.40, 24.0, 3, "Standard", datetime.now())
        ]
        
        for sp in supplier_products:
            self.add_supplier_product(sp)

def demo_auto_ordering():
    """Demo funkcija za testiranje sistema"""
    print("\n🛒 DEMO: Ultimate Auto Ordering System")
    print("=" * 50)
    
    # Inicializiraj sistem
    auto_ordering = UltimateAutoOrdering()
    
    # Preveri zaloge
    print("\n📊 Preverjam trenutne zaloge...")
    low_stock = auto_ordering.check_stock_levels()
    
    if low_stock:
        print(f"\n⚠️ Najdenih {len(low_stock)} produktov z nizko zalogo:")
        for product, needed_qty in low_stock:
            print(f"   • {product.name}: trenutno {product.current_stock} {product.unit}, potrebno {needed_qty:.1f} {product.unit}")
        
        # Ustvari samodejne naročila
        print("\n🛒 Ustvarjam samodejne naročila...")
        orders = auto_ordering.create_auto_order(low_stock)
        
        if orders:
            print(f"\n✅ Ustvarjenih {len(orders)} naročil:")
            for order in orders:
                supplier = auto_ordering.suppliers[order.supplier_id]
                print(f"\n📋 Naročilo {order.id}")
                print(f"   Dobavitelj: {supplier.name}")
                print(f"   Produkti: {len(order.products)}")
                print(f"   Skupna vrednost: €{order.total_amount:.2f}")
                print(f"   Prioriteta: {order.priority.value}")
                print(f"   Pričakovana dostava: {order.expected_delivery.strftime('%d.%m.%Y')}")
            
            # Pošlji naročila
            print("\n📧 Pošiljam naročila dobaviteljem...")
            auto_ordering.process_pending_orders()
        else:
            print("❌ Ni bilo mogoče ustvariti naročil")
    else:
        print("✅ Vse zaloge so zadostne")
    
    # Prikaži dashboard podatke
    print("\n📊 Dashboard statistike:")
    dashboard = auto_ordering.get_dashboard_data()
    print(f"   Skupno naročil: {dashboard['total_orders']}")
    print(f"   Čakajoča naročila: {dashboard['pending_orders']}")
    print(f"   Aktivni dobavitelji: {dashboard['active_suppliers']}")
    print(f"   Produkti z nizko zalogo: {dashboard['low_stock_products']}")
    print(f"   Skupna poraba: €{dashboard['total_spending']:.2f}")
    
    # Prikaži uspešnost dobaviteljev
    print("\n🏆 Uspešnost dobaviteljev:")
    for supplier_id, supplier in auto_ordering.suppliers.items():
        performance = auto_ordering.get_supplier_performance(supplier_id)
        if performance:
            print(f"   {supplier.name}:")
            print(f"     • Stopnja dostave: {performance['delivery_rate']*100:.1f}%")
            print(f"     • Skupna vrednost: €{performance['total_value']:.2f}")

if __name__ == "__main__":
    demo_auto_ordering()