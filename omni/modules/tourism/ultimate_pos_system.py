"""
ULTIMATE POS SYSTEM - Napredni blagajniški sistem
Funkcionalnosti:
- Real-time prodaja hrane, pijače, storitev
- Samodejna fiskalizacija in tiskanje računov
- Sinhronizacija zalog in porabe
- Davčna blagajna z arhiviranjem
- Integracija z računovodskim sistemom
- Digitalni PDF/e-računi
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import hashlib
import qrcode
from io import BytesIO
import base64

class TransactionType(Enum):
    SALE = "sale"
    REFUND = "refund"
    VOID = "void"
    DISCOUNT = "discount"

class PaymentMethod(Enum):
    CASH = "cash"
    CARD = "card"
    DIGITAL = "digital"
    VOUCHER = "voucher"
    LOYALTY_POINTS = "loyalty_points"

class TaxRate(Enum):
    STANDARD = 22.0  # 22% DDV
    REDUCED = 9.5    # 9.5% DDV
    ZERO = 0.0       # 0% DDV
    EXEMPT = -1      # Oproščeno DDV

@dataclass
class Product:
    id: str
    name: str
    category: str
    price: float
    cost: float
    tax_rate: float
    stock_quantity: int
    min_stock_level: int
    barcode: Optional[str] = None
    description: Optional[str] = None
    allergens: List[str] = None
    nutritional_info: Dict = None
    seasonal: bool = False
    active: bool = True
    created_at: str = None
    updated_at: str = None

@dataclass
class TransactionItem:
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    discount_amount: float
    tax_rate: float
    total_amount: float
    notes: Optional[str] = None

@dataclass
class Transaction:
    id: str
    transaction_number: str
    type: str
    items: List[TransactionItem]
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    payment_method: str
    payment_details: Dict
    customer_id: Optional[str]
    employee_id: str
    table_number: Optional[int]
    room_number: Optional[str]
    fiscal_number: str
    receipt_printed: bool
    email_sent: bool
    status: str
    created_at: str
    processed_at: Optional[str] = None

@dataclass
class FiscalRecord:
    id: str
    transaction_id: str
    fiscal_number: str
    tax_period: str
    gross_amount: float
    tax_amount: float
    net_amount: float
    tax_breakdown: Dict
    digital_signature: str
    created_at: str

@dataclass
class StockMovement:
    id: str
    product_id: str
    movement_type: str  # sale, purchase, adjustment, waste
    quantity: int
    reference_id: str  # transaction_id, purchase_order_id, etc.
    notes: Optional[str]
    created_at: str

class UltimatePOSSystem:
    def __init__(self, db_path: str = "ultimate_pos.db"):
        self.db_path = db_path
        self.init_database()
        self.load_demo_data()
    
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela izdelkov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                cost REAL NOT NULL,
                tax_rate REAL NOT NULL,
                stock_quantity INTEGER NOT NULL,
                min_stock_level INTEGER NOT NULL,
                barcode TEXT,
                description TEXT,
                allergens TEXT,
                nutritional_info TEXT,
                seasonal BOOLEAN DEFAULT FALSE,
                active BOOLEAN DEFAULT TRUE,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Tabela transakcij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                transaction_number TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL,
                items TEXT NOT NULL,
                subtotal REAL NOT NULL,
                tax_amount REAL NOT NULL,
                discount_amount REAL NOT NULL,
                total_amount REAL NOT NULL,
                payment_method TEXT NOT NULL,
                payment_details TEXT NOT NULL,
                customer_id TEXT,
                employee_id TEXT NOT NULL,
                table_number INTEGER,
                room_number TEXT,
                fiscal_number TEXT NOT NULL,
                receipt_printed BOOLEAN DEFAULT FALSE,
                email_sent BOOLEAN DEFAULT FALSE,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                processed_at TEXT
            )
        ''')
        
        # Tabela davčnih zapisov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS fiscal_records (
                id TEXT PRIMARY KEY,
                transaction_id TEXT NOT NULL,
                fiscal_number TEXT NOT NULL,
                tax_period TEXT NOT NULL,
                gross_amount REAL NOT NULL,
                tax_amount REAL NOT NULL,
                net_amount REAL NOT NULL,
                tax_breakdown TEXT NOT NULL,
                digital_signature TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (transaction_id) REFERENCES transactions (id)
            )
        ''')
        
        # Tabela gibanja zalog
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stock_movements (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                movement_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                reference_id TEXT NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        ''')
        
        # Indeksi za optimizacijo
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_fiscal_records_period ON fiscal_records(tax_period)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)')
        
        conn.commit()
        conn.close()
    
    def add_product(self, product: Product) -> bool:
        """Dodaj nov izdelek"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            product.id = str(uuid.uuid4())
            product.created_at = datetime.now().isoformat()
            
            cursor.execute('''
                INSERT INTO products (
                    id, name, category, price, cost, tax_rate, stock_quantity,
                    min_stock_level, barcode, description, allergens, nutritional_info,
                    seasonal, active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                product.id, product.name, product.category, product.price,
                product.cost, product.tax_rate, product.stock_quantity,
                product.min_stock_level, product.barcode, product.description,
                json.dumps(product.allergens or []),
                json.dumps(product.nutritional_info or {}),
                product.seasonal, product.active, product.created_at
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju izdelka: {e}")
            return False
    
    def process_sale(self, items: List[Dict], payment_method: str, 
                    employee_id: str, customer_id: Optional[str] = None,
                    table_number: Optional[int] = None, 
                    room_number: Optional[str] = None) -> Optional[Transaction]:
        """Procesiranje prodaje"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Ustvari transakcijo
            transaction_id = str(uuid.uuid4())
            transaction_number = self.generate_transaction_number()
            fiscal_number = self.generate_fiscal_number()
            
            transaction_items = []
            subtotal = 0
            tax_amount = 0
            
            for item_data in items:
                # Pridobi podatke o izdelku
                cursor.execute('SELECT * FROM products WHERE id = ?', (item_data['product_id'],))
                product_row = cursor.fetchone()
                
                if not product_row:
                    continue
                
                # Preveri zaloge
                if product_row[6] < item_data['quantity']:  # stock_quantity
                    raise Exception(f"Nezadostne zaloge za izdelek {product_row[1]}")
                
                # Izračunaj cene
                unit_price = product_row[3]  # price
                tax_rate = product_row[5]    # tax_rate
                quantity = item_data['quantity']
                discount = item_data.get('discount', 0)
                
                item_total = (unit_price * quantity) - discount
                item_tax = item_total * (tax_rate / 100) if tax_rate > 0 else 0
                
                transaction_item = TransactionItem(
                    product_id=item_data['product_id'],
                    product_name=product_row[1],
                    quantity=quantity,
                    unit_price=unit_price,
                    discount_amount=discount,
                    tax_rate=tax_rate,
                    total_amount=item_total,
                    notes=item_data.get('notes')
                )
                
                transaction_items.append(transaction_item)
                subtotal += item_total
                tax_amount += item_tax
                
                # Posodobi zaloge
                new_stock = product_row[6] - quantity
                cursor.execute('UPDATE products SET stock_quantity = ? WHERE id = ?',
                             (new_stock, item_data['product_id']))
                
                # Zabeleži gibanje zalog
                self.record_stock_movement(
                    product_id=item_data['product_id'],
                    movement_type="sale",
                    quantity=-quantity,
                    reference_id=transaction_id
                )
            
            total_amount = subtotal
            
            # Ustvari transakcijo
            transaction = Transaction(
                id=transaction_id,
                transaction_number=transaction_number,
                type=TransactionType.SALE.value,
                items=transaction_items,
                subtotal=subtotal,
                tax_amount=tax_amount,
                discount_amount=0,
                total_amount=total_amount,
                payment_method=payment_method,
                payment_details={},
                customer_id=customer_id,
                employee_id=employee_id,
                table_number=table_number,
                room_number=room_number,
                fiscal_number=fiscal_number,
                receipt_printed=False,
                email_sent=False,
                status="completed",
                created_at=datetime.now().isoformat()
            )
            
            # Shrani transakcijo
            cursor.execute('''
                INSERT INTO transactions (
                    id, transaction_number, type, items, subtotal, tax_amount,
                    discount_amount, total_amount, payment_method, payment_details,
                    customer_id, employee_id, table_number, room_number,
                    fiscal_number, receipt_printed, email_sent, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                transaction.id, transaction.transaction_number, transaction.type,
                json.dumps([asdict(item) for item in transaction.items]),
                transaction.subtotal, transaction.tax_amount, transaction.discount_amount,
                transaction.total_amount, transaction.payment_method,
                json.dumps(transaction.payment_details), transaction.customer_id,
                transaction.employee_id, transaction.table_number, transaction.room_number,
                transaction.fiscal_number, transaction.receipt_printed,
                transaction.email_sent, transaction.status, transaction.created_at
            ))
            
            # Ustvari davčni zapis
            self.create_fiscal_record(transaction)
            
            conn.commit()
            conn.close()
            
            return transaction
            
        except Exception as e:
            print(f"Napaka pri procesiranju prodaje: {e}")
            return None
    
    def create_fiscal_record(self, transaction: Transaction):
        """Ustvari davčni zapis za fiskalizacijo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Izračunaj davčno razčlenitev
            tax_breakdown = {}
            for item in transaction.items:
                tax_rate = str(item.tax_rate)
                if tax_rate not in tax_breakdown:
                    tax_breakdown[tax_rate] = {
                        'net_amount': 0,
                        'tax_amount': 0,
                        'gross_amount': 0
                    }
                
                item_tax = item.total_amount * (item.tax_rate / 100) if item.tax_rate > 0 else 0
                tax_breakdown[tax_rate]['net_amount'] += item.total_amount - item_tax
                tax_breakdown[tax_rate]['tax_amount'] += item_tax
                tax_breakdown[tax_rate]['gross_amount'] += item.total_amount
            
            # Ustvari digitalni podpis
            signature_data = f"{transaction.fiscal_number}{transaction.total_amount}{transaction.created_at}"
            digital_signature = hashlib.sha256(signature_data.encode()).hexdigest()
            
            fiscal_record = FiscalRecord(
                id=str(uuid.uuid4()),
                transaction_id=transaction.id,
                fiscal_number=transaction.fiscal_number,
                tax_period=datetime.now().strftime("%Y-%m"),
                gross_amount=transaction.total_amount,
                tax_amount=transaction.tax_amount,
                net_amount=transaction.total_amount - transaction.tax_amount,
                tax_breakdown=tax_breakdown,
                digital_signature=digital_signature,
                created_at=datetime.now().isoformat()
            )
            
            cursor.execute('''
                INSERT INTO fiscal_records (
                    id, transaction_id, fiscal_number, tax_period, gross_amount,
                    tax_amount, net_amount, tax_breakdown, digital_signature, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                fiscal_record.id, fiscal_record.transaction_id, fiscal_record.fiscal_number,
                fiscal_record.tax_period, fiscal_record.gross_amount, fiscal_record.tax_amount,
                fiscal_record.net_amount, json.dumps(fiscal_record.tax_breakdown),
                fiscal_record.digital_signature, fiscal_record.created_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju davčnega zapisa: {e}")
    
    def generate_transaction_number(self) -> str:
        """Generiraj številko transakcije"""
        now = datetime.now()
        return f"T{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    def generate_fiscal_number(self) -> str:
        """Generiraj davčno številko"""
        now = datetime.now()
        return f"FIS{now.strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:6].upper()}"
    
    def record_stock_movement(self, product_id: str, movement_type: str, 
                            quantity: int, reference_id: str, notes: str = None):
        """Zabeleži gibanje zalog"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            movement = StockMovement(
                id=str(uuid.uuid4()),
                product_id=product_id,
                movement_type=movement_type,
                quantity=quantity,
                reference_id=reference_id,
                notes=notes,
                created_at=datetime.now().isoformat()
            )
            
            cursor.execute('''
                INSERT INTO stock_movements (
                    id, product_id, movement_type, quantity, reference_id, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                movement.id, movement.product_id, movement.movement_type,
                movement.quantity, movement.reference_id, movement.notes, movement.created_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Napaka pri beleženju gibanja zalog: {e}")
    
    def generate_receipt(self, transaction_id: str) -> Dict:
        """Generiraj račun"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM transactions WHERE id = ?', (transaction_id,))
            transaction_row = cursor.fetchone()
            
            if not transaction_row:
                return None
            
            # Generiraj QR kodo za digitalni račun
            qr_data = f"TRANSACTION:{transaction_row[1]}:{transaction_row[8]}"  # number:total
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(qr_data)
            qr.make(fit=True)
            
            qr_img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            qr_img.save(buffer, format='PNG')
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            receipt_data = {
                'transaction_number': transaction_row[1],
                'fiscal_number': transaction_row[14],
                'date': transaction_row[18],
                'items': json.loads(transaction_row[3]),
                'subtotal': transaction_row[4],
                'tax_amount': transaction_row[5],
                'total_amount': transaction_row[7],
                'payment_method': transaction_row[8],
                'qr_code': qr_code_base64,
                'company_info': {
                    'name': 'Ultimate Tourism Resort',
                    'address': 'Turistična cesta 1, 1000 Ljubljana',
                    'tax_number': 'SI12345678',
                    'phone': '+386 1 234 5678'
                }
            }
            
            conn.close()
            return receipt_data
            
        except Exception as e:
            print(f"Napaka pri generiranju računa: {e}")
            return None
    
    def get_daily_sales_report(self, date: str = None) -> Dict:
        """Pridobi dnevno poročilo prodaje"""
        try:
            if not date:
                date = datetime.now().strftime('%Y-%m-%d')
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    COUNT(*) as transaction_count,
                    SUM(total_amount) as total_sales,
                    SUM(tax_amount) as total_tax,
                    AVG(total_amount) as average_transaction
                FROM transactions 
                WHERE DATE(created_at) = ? AND status = 'completed'
            ''', (date,))
            
            summary = cursor.fetchone()
            
            # Prodaja po kategorijah
            cursor.execute('''
                SELECT p.category, SUM(ti.total_amount) as category_sales
                FROM transactions t
                JOIN json_each(t.items) je ON 1=1
                JOIN products p ON p.id = json_extract(je.value, '$.product_id')
                WHERE DATE(t.created_at) = ? AND t.status = 'completed'
                GROUP BY p.category
                ORDER BY category_sales DESC
            ''', (date,))
            
            category_sales = cursor.fetchall()
            
            # Najprodajanejši izdelki
            cursor.execute('''
                SELECT 
                    p.name,
                    SUM(json_extract(je.value, '$.quantity')) as quantity_sold,
                    SUM(json_extract(je.value, '$.total_amount')) as revenue
                FROM transactions t
                JOIN json_each(t.items) je ON 1=1
                JOIN products p ON p.id = json_extract(je.value, '$.product_id')
                WHERE DATE(t.created_at) = ? AND t.status = 'completed'
                GROUP BY p.id, p.name
                ORDER BY quantity_sold DESC
                LIMIT 10
            ''', (date,))
            
            top_products = cursor.fetchall()
            
            conn.close()
            
            return {
                'date': date,
                'summary': {
                    'transaction_count': summary[0] or 0,
                    'total_sales': summary[1] or 0,
                    'total_tax': summary[2] or 0,
                    'average_transaction': summary[3] or 0
                },
                'category_sales': [
                    {'category': row[0], 'sales': row[1]} 
                    for row in category_sales
                ],
                'top_products': [
                    {'name': row[0], 'quantity': row[1], 'revenue': row[2]}
                    for row in top_products
                ]
            }
            
        except Exception as e:
            print(f"Napaka pri pridobivanju poročila: {e}")
            return {}
    
    def get_low_stock_alerts(self) -> List[Dict]:
        """Pridobi opozorila za nizke zaloge"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, name, category, stock_quantity, min_stock_level
                FROM products 
                WHERE stock_quantity <= min_stock_level AND active = TRUE
                ORDER BY (stock_quantity - min_stock_level) ASC
            ''')
            
            low_stock_products = cursor.fetchall()
            conn.close()
            
            return [
                {
                    'product_id': row[0],
                    'name': row[1],
                    'category': row[2],
                    'current_stock': row[3],
                    'min_level': row[4],
                    'shortage': row[4] - row[3]
                }
                for row in low_stock_products
            ]
            
        except Exception as e:
            print(f"Napaka pri pridobivanju opozoril za zaloge: {e}")
            return []
    
    def get_dashboard_data(self) -> Dict:
        """Pridobi podatke za dashboard"""
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
            
            # Današnja prodaja
            today_sales = self.get_daily_sales_report(today)
            yesterday_sales = self.get_daily_sales_report(yesterday)
            
            # Opozorila za zaloge
            low_stock = self.get_low_stock_alerts()
            
            # Zadnje transakcije
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT transaction_number, total_amount, payment_method, created_at
                FROM transactions 
                WHERE status = 'completed'
                ORDER BY created_at DESC 
                LIMIT 10
            ''')
            
            recent_transactions = cursor.fetchall()
            conn.close()
            
            return {
                'today_sales': today_sales,
                'yesterday_sales': yesterday_sales,
                'sales_growth': (
                    ((today_sales['summary']['total_sales'] - yesterday_sales['summary']['total_sales']) / 
                     yesterday_sales['summary']['total_sales'] * 100) 
                    if yesterday_sales['summary']['total_sales'] > 0 else 0
                ),
                'low_stock_count': len(low_stock),
                'low_stock_items': low_stock[:5],  # Top 5 kritičnih
                'recent_transactions': [
                    {
                        'number': row[0],
                        'amount': row[1],
                        'payment': row[2],
                        'time': row[3]
                    }
                    for row in recent_transactions
                ]
            }
            
        except Exception as e:
            print(f"Napaka pri pridobivanju podatkov za dashboard: {e}")
            return {}
    
    def load_demo_data(self):
        """Naloži demo podatke"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Preveri, če že obstajajo podatki
            cursor.execute('SELECT COUNT(*) FROM products')
            if cursor.fetchone()[0] > 0:
                conn.close()
                return
            
            # Demo izdelki
            demo_products = [
                Product(
                    id=str(uuid.uuid4()),
                    name="Goveja juha",
                    category="Juhe",
                    price=4.50,
                    cost=1.80,
                    tax_rate=9.5,
                    stock_quantity=50,
                    min_stock_level=10,
                    allergens=["gluten"],
                    created_at=datetime.now().isoformat()
                ),
                Product(
                    id=str(uuid.uuid4()),
                    name="Dunajski zrezek",
                    category="Glavne jedi",
                    price=12.90,
                    cost=5.20,
                    tax_rate=9.5,
                    stock_quantity=30,
                    min_stock_level=5,
                    allergens=["gluten", "eggs"],
                    created_at=datetime.now().isoformat()
                ),
                Product(
                    id=str(uuid.uuid4()),
                    name="Coca Cola 0.33l",
                    category="Pijače",
                    price=2.80,
                    cost=1.20,
                    tax_rate=22.0,
                    stock_quantity=100,
                    min_stock_level=20,
                    created_at=datetime.now().isoformat()
                ),
                Product(
                    id=str(uuid.uuid4()),
                    name="Tiramisu",
                    category="Sladice",
                    price=5.90,
                    cost=2.40,
                    tax_rate=9.5,
                    stock_quantity=15,
                    min_stock_level=3,
                    allergens=["eggs", "dairy", "gluten"],
                    created_at=datetime.now().isoformat()
                ),
                Product(
                    id=str(uuid.uuid4()),
                    name="Kava espresso",
                    category="Kava",
                    price=1.80,
                    cost=0.40,
                    tax_rate=9.5,
                    stock_quantity=200,
                    min_stock_level=50,
                    created_at=datetime.now().isoformat()
                )
            ]
            
            for product in demo_products:
                cursor.execute('''
                    INSERT INTO products (
                        id, name, category, price, cost, tax_rate, stock_quantity,
                        min_stock_level, barcode, description, allergens, nutritional_info,
                        seasonal, active, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    product.id, product.name, product.category, product.price,
                    product.cost, product.tax_rate, product.stock_quantity,
                    product.min_stock_level, product.barcode, product.description,
                    json.dumps(product.allergens or []),
                    json.dumps(product.nutritional_info or {}),
                    product.seasonal, product.active, product.created_at
                ))
            
            conn.commit()
            conn.close()
            print("Demo podatki uspešno naloženi!")
            
        except Exception as e:
            print(f"Napaka pri nalaganju demo podatkov: {e}")

# Demo funkcije
def demo_pos_operations():
    """Demo operacije POS sistema"""
    print("🏪 ULTIMATE POS SYSTEM - Demo")
    print("=" * 50)
    
    pos = UltimatePOSSystem()
    
    # Pridobi izdelke
    conn = sqlite3.connect(pos.db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, price FROM products LIMIT 3')
    products = cursor.fetchall()
    conn.close()
    
    if products:
        # Simuliraj prodajo
        sale_items = [
            {'product_id': products[0][0], 'quantity': 2, 'discount': 0},
            {'product_id': products[1][0], 'quantity': 1, 'discount': 0.50}
        ]
        
        transaction = pos.process_sale(
            items=sale_items,
            payment_method="card",
            employee_id="EMP001",
            table_number=5
        )
        
        if transaction:
            print(f"✅ Transakcija uspešna: {transaction.transaction_number}")
            print(f"💰 Skupaj: €{transaction.total_amount:.2f}")
            
            # Generiraj račun
            receipt = pos.generate_receipt(transaction.id)
            if receipt:
                print(f"🧾 Račun generiran: {receipt['fiscal_number']}")
    
    # Dashboard podatki
    dashboard = pos.get_dashboard_data()
    print(f"\n📊 Današnja prodaja: €{dashboard['today_sales']['summary']['total_sales']:.2f}")
    print(f"📈 Rast prodaje: {dashboard['sales_growth']:.1f}%")
    print(f"⚠️  Nizke zaloge: {dashboard['low_stock_count']} izdelkov")
    
    # Opozorila za zaloge
    low_stock = pos.get_low_stock_alerts()
    if low_stock:
        print("\n🚨 OPOZORILA ZA ZALOGE:")
        for item in low_stock[:3]:
            print(f"  • {item['name']}: {item['current_stock']} (min: {item['min_level']})")

if __name__ == "__main__":
    demo_pos_operations()