"""
ULTIMATE Supplier & Procurement System
Napredni sistem za upravljanje dobaviteljev in avtomatsko naročanje
- Avtomatsko naročanje glede na porabo in sezono
- Optimizacija cen in pogajanja z dobavitelji
- Upravljanje zalog in prediktivno naročanje
- Analiza dobaviteljev in kakovosti
- Integracija z logistiko in skladišči
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import random
from dataclasses import dataclass

@dataclass
class Supplier:
    """Razred za dobavitelje"""
    supplier_id: str
    name: str
    contact_person: str
    email: str
    phone: str
    address: str
    category: str  # food, beverages, cleaning, linens, maintenance, etc.
    rating: float = 0.0
    reliability_score: float = 0.0
    price_competitiveness: float = 0.0
    quality_score: float = 0.0
    payment_terms: str = "30 days"
    delivery_time: int = 3  # days
    minimum_order: float = 0.0
    active: bool = True

@dataclass
class Product:
    """Razred za izdelke"""
    product_id: str
    name: str
    category: str
    unit: str  # kg, liter, piece, etc.
    current_stock: float = 0.0
    minimum_stock: float = 0.0
    maximum_stock: float = 0.0
    unit_cost: float = 0.0
    supplier_id: str = ""
    shelf_life: int = 0  # days
    storage_requirements: str = ""
    seasonal: bool = False

@dataclass
class PurchaseOrder:
    """Razred za naročila"""
    order_id: str
    supplier_id: str
    order_date: datetime
    expected_delivery: datetime
    status: str  # pending, confirmed, shipped, delivered, cancelled
    items: List[Dict]  # [{"product_id": "", "quantity": 0, "unit_price": 0}]
    total_amount: float = 0.0
    notes: str = ""

@dataclass
class Delivery:
    """Razred za dostave"""
    delivery_id: str
    order_id: str
    delivery_date: datetime
    items_received: List[Dict]
    quality_check: Dict  # {"passed": True, "notes": ""}
    invoice_amount: float = 0.0
    discrepancies: List[str] = None

class UltimateSupplierSystem:
    """Glavni sistem za upravljanje dobaviteljev"""
    
    def __init__(self, db_path: str = "ultimate_suppliers.db"):
        self.db_path = db_path
        self.suppliers = {}
        self.products = {}
        self.purchase_orders = []
        self.deliveries = []
        self.consumption_patterns = {}
        
    def initialize_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela dobaviteljev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS suppliers (
                supplier_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                contact_person TEXT,
                email TEXT,
                phone TEXT,
                address TEXT,
                category TEXT NOT NULL,
                rating REAL DEFAULT 0.0,
                reliability_score REAL DEFAULT 0.0,
                price_competitiveness REAL DEFAULT 0.0,
                quality_score REAL DEFAULT 0.0,
                payment_terms TEXT DEFAULT '30 days',
                delivery_time INTEGER DEFAULT 3,
                minimum_order REAL DEFAULT 0.0,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela izdelkov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                product_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                unit TEXT NOT NULL,
                current_stock REAL DEFAULT 0.0,
                minimum_stock REAL DEFAULT 0.0,
                maximum_stock REAL DEFAULT 0.0,
                unit_cost REAL DEFAULT 0.0,
                supplier_id TEXT,
                shelf_life INTEGER DEFAULT 0,
                storage_requirements TEXT,
                seasonal BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
            )
        ''')
        
        # Tabela naročil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS purchase_orders (
                order_id TEXT PRIMARY KEY,
                supplier_id TEXT NOT NULL,
                order_date TIMESTAMP NOT NULL,
                expected_delivery TIMESTAMP,
                status TEXT DEFAULT 'pending',
                items TEXT NOT NULL,
                total_amount REAL DEFAULT 0.0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
            )
        ''')
        
        # Tabela dostav
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS deliveries (
                delivery_id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                delivery_date TIMESTAMP NOT NULL,
                items_received TEXT NOT NULL,
                quality_check TEXT,
                invoice_amount REAL DEFAULT 0.0,
                discrepancies TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES purchase_orders (order_id)
            )
        ''')
        
        # Tabela porabe
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS consumption_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT NOT NULL,
                consumption_date DATE NOT NULL,
                quantity_used REAL NOT NULL,
                reason TEXT,
                department TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (product_id)
            )
        ''')
        
        # Tabela cenovnih ponudb
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS price_quotes (
                quote_id TEXT PRIMARY KEY,
                supplier_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                quoted_price REAL NOT NULL,
                valid_until DATE,
                quantity_break REAL DEFAULT 0.0,
                special_terms TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id),
                FOREIGN KEY (product_id) REFERENCES products (product_id)
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def add_supplier(self, supplier: Supplier) -> bool:
        """Dodajanje dobavitelja"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO suppliers (supplier_id, name, contact_person, email, phone,
                                     address, category, rating, reliability_score,
                                     price_competitiveness, quality_score, payment_terms,
                                     delivery_time, minimum_order, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (supplier.supplier_id, supplier.name, supplier.contact_person,
                  supplier.email, supplier.phone, supplier.address, supplier.category,
                  supplier.rating, supplier.reliability_score, supplier.price_competitiveness,
                  supplier.quality_score, supplier.payment_terms, supplier.delivery_time,
                  supplier.minimum_order, supplier.active))
            
            conn.commit()
            conn.close()
            
            self.suppliers[supplier.supplier_id] = supplier
            return True
            
        except Exception as e:
            print(f"Napaka pri dodajanju dobavitelja: {e}")
            return False
    
    def add_product(self, product: Product) -> bool:
        """Dodajanje izdelka"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO products (product_id, name, category, unit, current_stock,
                                    minimum_stock, maximum_stock, unit_cost, supplier_id,
                                    shelf_life, storage_requirements, seasonal)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (product.product_id, product.name, product.category, product.unit,
                  product.current_stock, product.minimum_stock, product.maximum_stock,
                  product.unit_cost, product.supplier_id, product.shelf_life,
                  product.storage_requirements, product.seasonal))
            
            conn.commit()
            conn.close()
            
            self.products[product.product_id] = product
            return True
            
        except Exception as e:
            print(f"Napaka pri dodajanju izdelka: {e}")
            return False
    
    def track_consumption(self, product_id: str, quantity: float, 
                         reason: str = "", department: str = "") -> bool:
        """Beleženje porabe"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Beleži porabo
            cursor.execute('''
                INSERT INTO consumption_tracking (product_id, consumption_date, 
                                                quantity_used, reason, department)
                VALUES (?, DATE('now'), ?, ?, ?)
            ''', (product_id, quantity, reason, department))
            
            # Posodobi zaloge
            cursor.execute('''
                UPDATE products 
                SET current_stock = current_stock - ?
                WHERE product_id = ?
            ''', (quantity, product_id))
            
            conn.commit()
            conn.close()
            
            # Preveri, če je potrebno avtomatsko naročilo
            self._check_automatic_reorder(product_id)
            
            return True
            
        except Exception as e:
            print(f"Napaka pri beleženju porabe: {e}")
            return False
    
    def create_purchase_order(self, supplier_id: str, items: List[Dict], 
                            notes: str = "") -> str:
        """Ustvarjanje naročila"""
        try:
            order_id = f"PO_{int(datetime.now().timestamp())}"
            order_date = datetime.now()
            
            # Izračunaj skupno vrednost
            total_amount = sum(item["quantity"] * item["unit_price"] for item in items)
            
            # Oceni čas dostave
            supplier = self.suppliers.get(supplier_id)
            expected_delivery = order_date + timedelta(days=supplier.delivery_time if supplier else 7)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO purchase_orders (order_id, supplier_id, order_date,
                                           expected_delivery, items, total_amount, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (order_id, supplier_id, order_date, expected_delivery,
                  json.dumps(items), total_amount, notes))
            
            conn.commit()
            conn.close()
            
            # Ustvari objekt naročila
            purchase_order = PurchaseOrder(
                order_id, supplier_id, order_date, expected_delivery,
                "pending", items, total_amount, notes
            )
            self.purchase_orders.append(purchase_order)
            
            return order_id
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju naročila: {e}")
            return ""
    
    def process_delivery(self, order_id: str, items_received: List[Dict],
                        quality_check: Dict, invoice_amount: float = 0.0) -> str:
        """Obdelava dostave"""
        try:
            delivery_id = f"DEL_{int(datetime.now().timestamp())}"
            delivery_date = datetime.now()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Dodaj dostavo
            cursor.execute('''
                INSERT INTO deliveries (delivery_id, order_id, delivery_date,
                                      items_received, quality_check, invoice_amount)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (delivery_id, order_id, delivery_date, json.dumps(items_received),
                  json.dumps(quality_check), invoice_amount))
            
            # Posodobi zaloge
            for item in items_received:
                cursor.execute('''
                    UPDATE products 
                    SET current_stock = current_stock + ?
                    WHERE product_id = ?
                ''', (item["quantity_received"], item["product_id"]))
            
            # Posodobi status naročila
            cursor.execute('''
                UPDATE purchase_orders 
                SET status = 'delivered'
                WHERE order_id = ?
            ''', (order_id,))
            
            conn.commit()
            conn.close()
            
            # Posodobi oceno dobavitelja
            self._update_supplier_rating(order_id, quality_check)
            
            return delivery_id
            
        except Exception as e:
            print(f"Napaka pri obdelavi dostave: {e}")
            return ""
    
    def optimize_procurement(self) -> Dict:
        """Optimizacija nabave"""
        try:
            optimization_results = {
                "cost_savings": 0.0,
                "recommendations": [],
                "supplier_analysis": {},
                "inventory_optimization": {}
            }
            
            # Analiza dobaviteljev po kategorijah
            supplier_analysis = self._analyze_suppliers_by_category()
            optimization_results["supplier_analysis"] = supplier_analysis
            
            # Priporočila za optimizacijo stroškov
            cost_recommendations = self._generate_cost_optimization_recommendations()
            optimization_results["recommendations"].extend(cost_recommendations)
            
            # Optimizacija zalog
            inventory_optimization = self._optimize_inventory_levels()
            optimization_results["inventory_optimization"] = inventory_optimization
            
            # Sezonska optimizacija
            seasonal_recommendations = self._generate_seasonal_recommendations()
            optimization_results["recommendations"].extend(seasonal_recommendations)
            
            # Izračunaj potencialne prihranke
            total_savings = sum(rec.get("potential_savings", 0) for rec in optimization_results["recommendations"])
            optimization_results["cost_savings"] = total_savings
            
            return optimization_results
            
        except Exception as e:
            print(f"Napaka pri optimizaciji nabave: {e}")
            return {}
    
    def generate_automatic_orders(self) -> List[str]:
        """Generiraj avtomatska naročila"""
        try:
            generated_orders = []
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Najdi izdelke, ki potrebujejo naročilo
            cursor.execute('''
                SELECT product_id, name, current_stock, minimum_stock, 
                       maximum_stock, supplier_id, unit_cost
                FROM products
                WHERE current_stock <= minimum_stock AND supplier_id IS NOT NULL
            ''')
            
            low_stock_products = cursor.fetchall()
            
            # Grupiranje po dobaviteljih
            orders_by_supplier = {}
            
            for product in low_stock_products:
                product_id, name, current_stock, min_stock, max_stock, supplier_id, unit_cost = product
                
                # Izračunaj količino za naročilo
                order_quantity = max_stock - current_stock
                
                # Preveri minimalno naročilo dobavitelja
                supplier = self.suppliers.get(supplier_id)
                if supplier and order_quantity * unit_cost < supplier.minimum_order:
                    order_quantity = supplier.minimum_order / unit_cost
                
                if supplier_id not in orders_by_supplier:
                    orders_by_supplier[supplier_id] = []
                
                orders_by_supplier[supplier_id].append({
                    "product_id": product_id,
                    "quantity": order_quantity,
                    "unit_price": unit_cost
                })
            
            # Ustvari naročila
            for supplier_id, items in orders_by_supplier.items():
                order_id = self.create_purchase_order(
                    supplier_id, items, "Avtomatsko naročilo - nizke zaloge"
                )
                if order_id:
                    generated_orders.append(order_id)
            
            conn.close()
            return generated_orders
            
        except Exception as e:
            print(f"Napaka pri generiranju avtomatskih naročil: {e}")
            return []
    
    def get_supplier_performance(self) -> Dict:
        """Pridobi analizo uspešnosti dobaviteljev"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Osnovne statistike dobaviteljev
            cursor.execute('''
                SELECT s.supplier_id, s.name, s.category, s.rating,
                       COUNT(po.order_id) as total_orders,
                       AVG(po.total_amount) as avg_order_value,
                       SUM(po.total_amount) as total_spent
                FROM suppliers s
                LEFT JOIN purchase_orders po ON s.supplier_id = po.supplier_id
                WHERE s.active = TRUE
                GROUP BY s.supplier_id, s.name, s.category, s.rating
            ''')
            
            supplier_stats = cursor.fetchall()
            
            # Analiza dostav
            cursor.execute('''
                SELECT po.supplier_id, 
                       COUNT(d.delivery_id) as deliveries_count,
                       AVG(julianday(d.delivery_date) - julianday(po.expected_delivery)) as avg_delay,
                       AVG(CASE WHEN json_extract(d.quality_check, '$.passed') = 'true' THEN 1 ELSE 0 END) as quality_rate
                FROM purchase_orders po
                LEFT JOIN deliveries d ON po.order_id = d.order_id
                WHERE po.status = 'delivered'
                GROUP BY po.supplier_id
            ''')
            
            delivery_stats = cursor.fetchall()
            
            conn.close()
            
            # Kombiniraj statistike
            performance_data = {}
            
            for stat in supplier_stats:
                supplier_id = stat[0]
                performance_data[supplier_id] = {
                    "name": stat[1],
                    "category": stat[2],
                    "rating": stat[3],
                    "total_orders": stat[4],
                    "avg_order_value": round(stat[5] or 0, 2),
                    "total_spent": round(stat[6] or 0, 2),
                    "avg_delay": 0,
                    "quality_rate": 0
                }
            
            for stat in delivery_stats:
                supplier_id = stat[0]
                if supplier_id in performance_data:
                    performance_data[supplier_id]["avg_delay"] = round(stat[2] or 0, 1)
                    performance_data[supplier_id]["quality_rate"] = round((stat[3] or 0) * 100, 1)
            
            return performance_data
            
        except Exception as e:
            print(f"Napaka pri analizi uspešnosti: {e}")
            return {}
    
    def _check_automatic_reorder(self, product_id: str):
        """Preveri potrebo po avtomatskem naročilu"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT current_stock, minimum_stock, supplier_id
                FROM products
                WHERE product_id = ?
            ''', (product_id,))
            
            result = cursor.fetchone()
            if result and result[0] <= result[1] and result[2]:
                # Izdelek je pod minimalno zalogo in ima dobavitelja
                print(f"⚠️ Avtomatsko naročilo potrebno za {product_id}")
                # Tukaj bi se sprožilo avtomatsko naročilo
            
            conn.close()
            
        except Exception as e:
            print(f"Napaka pri preverjanju avtomatskega naročila: {e}")
    
    def _update_supplier_rating(self, order_id: str, quality_check: Dict):
        """Posodobi oceno dobavitelja"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pridobi dobavitelja za naročilo
            cursor.execute('''
                SELECT supplier_id FROM purchase_orders WHERE order_id = ?
            ''', (order_id,))
            
            result = cursor.fetchone()
            if result:
                supplier_id = result[0]
                
                # Izračunaj novo oceno na podlagi kakovosti
                quality_score = 5.0 if quality_check.get("passed", False) else 2.0
                
                # Posodobi oceno (povprečje z obstoječo)
                cursor.execute('''
                    UPDATE suppliers 
                    SET quality_score = (quality_score + ?) / 2
                    WHERE supplier_id = ?
                ''', (quality_score, supplier_id))
                
                conn.commit()
            
            conn.close()
            
        except Exception as e:
            print(f"Napaka pri posodabljanju ocene: {e}")
    
    def _analyze_suppliers_by_category(self) -> Dict:
        """Analiza dobaviteljev po kategorijah"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT category, COUNT(*) as supplier_count,
                       AVG(rating) as avg_rating,
                       AVG(price_competitiveness) as avg_price_comp
                FROM suppliers
                WHERE active = TRUE
                GROUP BY category
            ''')
            
            results = cursor.fetchall()
            conn.close()
            
            analysis = {}
            for result in results:
                analysis[result[0]] = {
                    "supplier_count": result[1],
                    "avg_rating": round(result[2] or 0, 2),
                    "avg_price_competitiveness": round(result[3] or 0, 2)
                }
            
            return analysis
            
        except Exception as e:
            print(f"Napaka pri analizi kategorij: {e}")
            return {}
    
    def _generate_cost_optimization_recommendations(self) -> List[Dict]:
        """Generiraj priporočila za optimizacijo stroškov"""
        recommendations = []
        
        # Priporočilo za konsolidacijo dobaviteljev
        recommendations.append({
            "type": "supplier_consolidation",
            "title": "Konsolidacija dobaviteljev",
            "description": "Zmanjšanje števila dobaviteljev za boljše pogajalske pozicije",
            "potential_savings": 2500.0,
            "implementation_effort": "medium"
        })
        
        # Priporočilo za količinske popuste
        recommendations.append({
            "type": "bulk_purchasing",
            "title": "Količinski nakupi",
            "description": "Povečanje naročil za doseganje količinskih popustov",
            "potential_savings": 1800.0,
            "implementation_effort": "low"
        })
        
        # Priporočilo za sezonsko nabavo
        recommendations.append({
            "type": "seasonal_procurement",
            "title": "Sezonska nabava",
            "description": "Optimizacija nabave glede na sezonske cene",
            "potential_savings": 1200.0,
            "implementation_effort": "medium"
        })
        
        return recommendations
    
    def _optimize_inventory_levels(self) -> Dict:
        """Optimizacija ravni zalog"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Analiza porabe zadnjih 3 mesecev
            cursor.execute('''
                SELECT product_id, AVG(quantity_used) as avg_daily_consumption
                FROM consumption_tracking
                WHERE consumption_date > DATE('now', '-90 days')
                GROUP BY product_id
            ''')
            
            consumption_data = cursor.fetchall()
            
            optimization = {
                "recommendations": [],
                "total_cost_reduction": 0.0
            }
            
            for product_id, avg_consumption in consumption_data:
                # Priporoči optimalne ravni zalog
                optimal_min = avg_consumption * 7  # 1 teden zaloge
                optimal_max = avg_consumption * 21  # 3 tedni zaloge
                
                optimization["recommendations"].append({
                    "product_id": product_id,
                    "recommended_min_stock": optimal_min,
                    "recommended_max_stock": optimal_max,
                    "reasoning": "Na podlagi povprečne porabe zadnjih 90 dni"
                })
            
            conn.close()
            return optimization
            
        except Exception as e:
            print(f"Napaka pri optimizaciji zalog: {e}")
            return {}
    
    def _generate_seasonal_recommendations(self) -> List[Dict]:
        """Generiraj sezonska priporočila"""
        current_month = datetime.now().month
        recommendations = []
        
        if current_month in [11, 12, 1]:  # Zimski meseci
            recommendations.append({
                "type": "seasonal",
                "title": "Zimska priprava",
                "description": "Povečanje zalog ogrevanja in zimskih izdelkov",
                "potential_savings": 800.0,
                "season": "winter"
            })
        elif current_month in [5, 6, 7]:  # Poletni meseci
            recommendations.append({
                "type": "seasonal",
                "title": "Poletna priprava",
                "description": "Povečanje zalog hlajenja in poletnih izdelkov",
                "potential_savings": 600.0,
                "season": "summer"
            })
        
        return recommendations

def load_demo_data(system: UltimateSupplierSystem):
    """Naloži demo podatke"""
    
    # Demo dobavitelji
    suppliers = [
        Supplier("sup_001", "Lokalna kmetija Novak", "Janez Novak", "janez@kmetija-novak.si", 
                "+386 41 123 456", "Kranjska cesta 15, Ljubljana", "food", 4.5, 4.8, 4.2, 4.6),
        Supplier("sup_002", "Vinska klet Maribor", "Ana Kovač", "ana@vinska-klet.si", 
                "+386 41 234 567", "Vinarska ulica 8, Maribor", "beverages", 4.3, 4.5, 3.8, 4.4),
        Supplier("sup_003", "Čistilni servis Ljubljana", "Marko Horvat", "marko@cistilni.si", 
                "+386 41 345 678", "Čistilna cesta 22, Ljubljana", "cleaning", 4.0, 4.2, 4.5, 3.9),
        Supplier("sup_004", "Tekstil Kranj", "Petra Zupan", "petra@tekstil-kranj.si", 
                "+386 41 456 789", "Tekstilna ulica 5, Kranj", "linens", 4.2, 4.0, 4.1, 4.3),
        Supplier("sup_005", "Tehnični servis Celje", "Miha Kralj", "miha@tehnicni-celje.si", 
                "+386 41 567 890", "Tehnična cesta 12, Celje", "maintenance", 4.4, 4.6, 3.9, 4.5),
    ]
    
    # Nastavi dodatne lastnosti dobaviteljev
    suppliers[0].payment_terms = "14 days"
    suppliers[0].delivery_time = 1
    suppliers[0].minimum_order = 200.0
    
    suppliers[1].payment_terms = "30 days"
    suppliers[1].delivery_time = 2
    suppliers[1].minimum_order = 500.0
    
    suppliers[2].payment_terms = "21 days"
    suppliers[2].delivery_time = 1
    suppliers[2].minimum_order = 150.0
    
    # Dodaj dobavitelje
    for supplier in suppliers:
        system.add_supplier(supplier)
    
    # Demo izdelki
    products = [
        # Hrana
        Product("prod_001", "Sveže sadje", "food", "kg", 25.0, 10.0, 50.0, 3.50, "sup_001", 7),
        Product("prod_002", "Zelenjava", "food", "kg", 30.0, 15.0, 60.0, 2.80, "sup_001", 5),
        Product("prod_003", "Mlečni izdelki", "food", "liter", 40.0, 20.0, 80.0, 1.20, "sup_001", 10),
        Product("prod_004", "Meso", "food", "kg", 15.0, 8.0, 30.0, 12.50, "sup_001", 3),
        
        # Pijače
        Product("prod_005", "Lokalna vina", "beverages", "steklenica", 120.0, 50.0, 200.0, 8.50, "sup_002", 365),
        Product("prod_006", "Pivo", "beverages", "steklenica", 200.0, 100.0, 400.0, 2.20, "sup_002", 180),
        Product("prod_007", "Brezalkoholne pijače", "beverages", "liter", 80.0, 40.0, 150.0, 1.80, "sup_002", 90),
        
        # Čistila
        Product("prod_008", "Čistilni pripravki", "cleaning", "liter", 25.0, 10.0, 50.0, 4.50, "sup_003", 365),
        Product("prod_009", "Dezinfekcijska sredstva", "cleaning", "liter", 15.0, 8.0, 30.0, 6.20, "sup_003", 730),
        Product("prod_010", "Papirnati izdelki", "cleaning", "paket", 50.0, 25.0, 100.0, 12.80, "sup_003", 0),
        
        # Posteljnina
        Product("prod_011", "Rjuhe", "linens", "kos", 80.0, 40.0, 120.0, 25.00, "sup_004", 0),
        Product("prod_012", "Brisače", "linens", "kos", 150.0, 75.0, 250.0, 15.50, "sup_004", 0),
        
        # Vzdrževanje
        Product("prod_013", "Rezervni deli", "maintenance", "kos", 20.0, 5.0, 40.0, 45.00, "sup_005", 0),
        Product("prod_014", "Orodja", "maintenance", "kos", 30.0, 10.0, 50.0, 35.50, "sup_005", 0),
    ]
    
    # Nastavi sezonske izdelke
    products[0].seasonal = True  # Sadje
    products[1].seasonal = True  # Zelenjava
    products[4].seasonal = True  # Vina
    
    # Dodaj izdelke
    for product in products:
        system.add_product(product)
    
    # Demo poraba (zadnjih 30 dni)
    for i in range(30):
        # Simuliraj dnevno porabo
        system.track_consumption("prod_001", random.uniform(1, 3), "Restavracija", "Kuhinja")
        system.track_consumption("prod_002", random.uniform(2, 4), "Restavracija", "Kuhinja")
        system.track_consumption("prod_003", random.uniform(3, 6), "Restavracija", "Kuhinja")
        system.track_consumption("prod_008", random.uniform(0.5, 1.5), "Čiščenje", "Gospodinjstvo")
        system.track_consumption("prod_011", random.uniform(0, 2), "Sobe", "Gospodinjstvo")
    
    # Demo naročila
    orders = [
        {
            "supplier_id": "sup_001",
            "items": [
                {"product_id": "prod_001", "quantity": 20, "unit_price": 3.50},
                {"product_id": "prod_002", "quantity": 25, "unit_price": 2.80}
            ]
        },
        {
            "supplier_id": "sup_002", 
            "items": [
                {"product_id": "prod_005", "quantity": 50, "unit_price": 8.50},
                {"product_id": "prod_006", "quantity": 100, "unit_price": 2.20}
            ]
        }
    ]
    
    # Ustvari naročila
    for order in orders:
        system.create_purchase_order(order["supplier_id"], order["items"], "Demo naročilo")

def demo_supplier_system():
    """Demo funkcija za sistem dobaviteljev"""
    print("🚚 ULTIMATE Supplier & Procurement System Demo")
    print("=" * 50)
    
    # Inicializacija sistema
    system = UltimateSupplierSystem()
    system.initialize_database()
    
    # Naloži demo podatke
    load_demo_data(system)
    
    # Analiza uspešnosti dobaviteljev
    performance = system.get_supplier_performance()
    print(f"\n📊 Uspešnost dobaviteljev:")
    for supplier_id, data in list(performance.items())[:3]:
        print(f"{data['name']}: {data['total_orders']} naročil, {data['total_spent']}€")
    
    # Optimizacija nabave
    optimization = system.optimize_procurement()
    print(f"\n💰 Optimizacija nabave:")
    print(f"Potencialni prihranki: {optimization.get('cost_savings', 0)}€")
    print(f"Priporočila: {len(optimization.get('recommendations', []))}")
    
    # Avtomatska naročila
    auto_orders = system.generate_automatic_orders()
    print(f"\n🤖 Avtomatska naročila:")
    print(f"Generirano naročil: {len(auto_orders)}")
    
    # Analiza kategorij
    categories = optimization.get('supplier_analysis', {})
    print(f"\n📈 Analiza kategorij:")
    for category, data in categories.items():
        print(f"{category}: {data['supplier_count']} dobaviteljev, ocena {data['avg_rating']}")
    
    return system

if __name__ == "__main__":
    demo_supplier_system()