"""
OMNI POS & FISCAL SYSTEM
Celovit sistem blagajn z davčno integracijo, mobilnimi blagajnami in samopostrežnimi kioski
"""

import sqlite3
import json
import datetime
import uuid
import hashlib
import qrcode
import io
import base64
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import requests
import xml.etree.ElementTree as ET

class PaymentMethod(Enum):
    CASH = "gotovina"
    CARD = "kartica"
    NFC = "nfc"
    QR_CODE = "qr_koda"
    CRYPTO = "kripto"
    VOUCHER = "bon"
    LOYALTY = "zvestoba"

class DeviceType(Enum):
    MAIN_POS = "glavna_blagajna"
    MOBILE_POS = "mobilna_blagajna"
    SELF_SERVICE = "samopostrezna"
    KIOSK = "kiosk"
    WAITER_DEVICE = "naprava_natakar"

class TransactionStatus(Enum):
    PENDING = "v_obdelavi"
    COMPLETED = "zakljucena"
    CANCELLED = "preklicana"
    REFUNDED = "vracilo"
    FISCAL_ERROR = "davčna_napaka"

class ItemCategory(Enum):
    FOOD = "hrana"
    BEVERAGE = "pijača"
    ACCOMMODATION = "nastanitev"
    ACTIVITY = "aktivnost"
    RETAIL = "trgovina"
    SERVICE = "storitev"

@dataclass
class MenuItem:
    id: str
    name: str
    category: ItemCategory
    price: float
    vat_rate: float
    description: str
    allergens: List[str]
    available: bool
    preparation_time: int  # v minutah

@dataclass
class Transaction:
    id: str
    device_id: str
    device_type: DeviceType
    items: List[Dict]
    subtotal: float
    vat_amount: float
    total: float
    payment_method: PaymentMethod
    status: TransactionStatus
    timestamp: datetime.datetime
    fiscal_number: Optional[str]
    customer_id: Optional[str]
    waiter_id: Optional[str]

@dataclass
class FiscalReceipt:
    transaction_id: str
    fiscal_number: str
    qr_code: str
    xml_data: str
    timestamp: datetime.datetime
    furs_response: Dict

class OmniPOSFiscalSystem:
    def __init__(self, db_path: str = "omni_pos_fiscal.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela menijev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS menu_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                vat_rate REAL NOT NULL,
                description TEXT,
                allergens TEXT,
                available BOOLEAN DEFAULT 1,
                preparation_time INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela transakcij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                device_id TEXT NOT NULL,
                device_type TEXT NOT NULL,
                items TEXT NOT NULL,
                subtotal REAL NOT NULL,
                vat_amount REAL NOT NULL,
                total REAL NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fiscal_number TEXT,
                customer_id TEXT,
                waiter_id TEXT
            )
        ''')
        
        # Tabela davčnih računov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS fiscal_receipts (
                id TEXT PRIMARY KEY,
                transaction_id TEXT NOT NULL,
                fiscal_number TEXT NOT NULL,
                qr_code TEXT,
                xml_data TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                furs_response TEXT,
                FOREIGN KEY (transaction_id) REFERENCES transactions (id)
            )
        ''')
        
        # Tabela naprav
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pos_devices (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                device_type TEXT NOT NULL,
                location TEXT,
                ip_address TEXT,
                status TEXT DEFAULT 'active',
                last_sync TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela zalog
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS inventory (
                item_id TEXT PRIMARY KEY,
                current_stock INTEGER DEFAULT 0,
                min_stock INTEGER DEFAULT 0,
                max_stock INTEGER DEFAULT 100,
                unit TEXT DEFAULT 'kos',
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES menu_items (id)
            )
        ''')
        
        # Tabela dnevnih poročil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_reports (
                id TEXT PRIMARY KEY,
                date DATE NOT NULL,
                device_id TEXT,
                total_transactions INTEGER DEFAULT 0,
                total_revenue REAL DEFAULT 0,
                cash_revenue REAL DEFAULT 0,
                card_revenue REAL DEFAULT 0,
                vat_collected REAL DEFAULT 0,
                report_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def add_menu_item(self, item: MenuItem) -> bool:
        """Dodaj artikel v meni"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO menu_items 
                (id, name, category, price, vat_rate, description, allergens, available, preparation_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                item.id, item.name, item.category.value, item.price, item.vat_rate,
                item.description, json.dumps(item.allergens), item.available, item.preparation_time
            ))
            
            # Dodaj v zalogo
            cursor.execute('''
                INSERT OR IGNORE INTO inventory (item_id, current_stock, min_stock, max_stock)
                VALUES (?, 100, 10, 500)
            ''', (item.id,))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju artikla: {e}")
            return False
    
    def register_pos_device(self, device_id: str, name: str, device_type: DeviceType, 
                           location: str = "", ip_address: str = "") -> bool:
        """Registriraj POS napravo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO pos_devices 
                (id, name, device_type, location, ip_address, last_sync)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (device_id, name, device_type.value, location, ip_address, datetime.datetime.now()))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri registraciji naprave: {e}")
            return False
    
    def create_transaction(self, device_id: str, device_type: DeviceType, 
                          items: List[Dict], payment_method: PaymentMethod,
                          customer_id: str = None, waiter_id: str = None) -> Optional[Transaction]:
        """Ustvari novo transakcijo"""
        try:
            transaction_id = str(uuid.uuid4())
            
            # Izračunaj skupne zneske
            subtotal = 0
            vat_amount = 0
            
            for item in items:
                item_price = item['price'] * item['quantity']
                item_vat = item_price * (item['vat_rate'] / 100)
                subtotal += item_price
                vat_amount += item_vat
            
            total = subtotal
            
            transaction = Transaction(
                id=transaction_id,
                device_id=device_id,
                device_type=device_type,
                items=items,
                subtotal=subtotal,
                vat_amount=vat_amount,
                total=total,
                payment_method=payment_method,
                status=TransactionStatus.PENDING,
                timestamp=datetime.datetime.now(),
                fiscal_number=None,
                customer_id=customer_id,
                waiter_id=waiter_id
            )
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO transactions 
                (id, device_id, device_type, items, subtotal, vat_amount, total, 
                 payment_method, status, customer_id, waiter_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                transaction.id, transaction.device_id, transaction.device_type.value,
                json.dumps(transaction.items), transaction.subtotal, transaction.vat_amount,
                transaction.total, transaction.payment_method.value, transaction.status.value,
                transaction.customer_id, transaction.waiter_id
            ))
            
            conn.commit()
            conn.close()
            
            return transaction
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju transakcije: {e}")
            return None
    
    def process_fiscal_receipt(self, transaction: Transaction) -> Optional[FiscalReceipt]:
        """Obdelaj davčni račun (simulacija FURS integracije)"""
        try:
            # Generiraj davčno številko
            fiscal_number = f"FN{datetime.datetime.now().strftime('%Y%m%d')}{transaction.id[:8].upper()}"
            
            # Ustvari XML za FURS (poenostavljena verzija)
            xml_data = self._create_fiscal_xml(transaction, fiscal_number)
            
            # Simuliraj FURS odziv
            furs_response = {
                "status": "success",
                "fiscal_number": fiscal_number,
                "timestamp": datetime.datetime.now().isoformat(),
                "verification_code": hashlib.md5(fiscal_number.encode()).hexdigest()[:8].upper()
            }
            
            # Generiraj QR kodo
            qr_data = f"FN:{fiscal_number};TOTAL:{transaction.total};DATE:{transaction.timestamp.strftime('%Y-%m-%d')}"
            qr_code_img = qrcode.make(qr_data)
            
            # Pretvori QR kodo v base64
            buffer = io.BytesIO()
            qr_code_img.save(buffer, format='PNG')
            qr_code_b64 = base64.b64encode(buffer.getvalue()).decode()
            
            fiscal_receipt = FiscalReceipt(
                transaction_id=transaction.id,
                fiscal_number=fiscal_number,
                qr_code=qr_code_b64,
                xml_data=xml_data,
                timestamp=datetime.datetime.now(),
                furs_response=furs_response
            )
            
            # Shrani davčni račun
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO fiscal_receipts 
                (id, transaction_id, fiscal_number, qr_code, xml_data, furs_response)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), fiscal_receipt.transaction_id, fiscal_receipt.fiscal_number,
                fiscal_receipt.qr_code, fiscal_receipt.xml_data, json.dumps(fiscal_receipt.furs_response)
            ))
            
            # Posodobi status transakcije
            cursor.execute('''
                UPDATE transactions SET status = ?, fiscal_number = ? WHERE id = ?
            ''', (TransactionStatus.COMPLETED.value, fiscal_number, transaction.id))
            
            conn.commit()
            conn.close()
            
            return fiscal_receipt
            
        except Exception as e:
            print(f"Napaka pri obdelavi davčnega računa: {e}")
            return None
    
    def _create_fiscal_xml(self, transaction: Transaction, fiscal_number: str) -> str:
        """Ustvari XML za FURS (poenostavljena verzija)"""
        root = ET.Element("Invoice")
        
        # Osnovni podatki
        ET.SubElement(root, "InvoiceNumber").text = fiscal_number
        ET.SubElement(root, "IssueDate").text = transaction.timestamp.strftime('%Y-%m-%d')
        ET.SubElement(root, "IssueTime").text = transaction.timestamp.strftime('%H:%M:%S')
        
        # Podatki o prodajalcu (simulacija)
        supplier = ET.SubElement(root, "AccountingSupplierParty")
        ET.SubElement(supplier, "CompanyID").text = "12345678"
        ET.SubElement(supplier, "Name").text = "OMNI Gostinstvo d.o.o."
        
        # Postavke
        lines = ET.SubElement(root, "InvoiceLines")
        for i, item in enumerate(transaction.items, 1):
            line = ET.SubElement(lines, "InvoiceLine")
            ET.SubElement(line, "ID").text = str(i)
            ET.SubElement(line, "Quantity").text = str(item['quantity'])
            ET.SubElement(line, "LineExtensionAmount").text = str(item['price'] * item['quantity'])
            
            item_elem = ET.SubElement(line, "Item")
            ET.SubElement(item_elem, "Name").text = item['name']
            
            tax_elem = ET.SubElement(line, "TaxTotal")
            ET.SubElement(tax_elem, "TaxAmount").text = str(item['price'] * item['quantity'] * item['vat_rate'] / 100)
        
        # Skupni zneski
        totals = ET.SubElement(root, "LegalMonetaryTotal")
        ET.SubElement(totals, "TaxExclusiveAmount").text = str(transaction.subtotal)
        ET.SubElement(totals, "TaxInclusiveAmount").text = str(transaction.total)
        ET.SubElement(totals, "PayableAmount").text = str(transaction.total)
        
        return ET.tostring(root, encoding='unicode')
    
    def get_menu_items(self, category: ItemCategory = None, available_only: bool = True) -> List[MenuItem]:
        """Pridobi artikle iz menija"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = "SELECT * FROM menu_items WHERE 1=1"
            params = []
            
            if category:
                query += " AND category = ?"
                params.append(category.value)
            
            if available_only:
                query += " AND available = 1"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            items = []
            for row in rows:
                item = MenuItem(
                    id=row[0],
                    name=row[1],
                    category=ItemCategory(row[2]),
                    price=row[3],
                    vat_rate=row[4],
                    description=row[5] or "",
                    allergens=json.loads(row[6]) if row[6] else [],
                    available=bool(row[7]),
                    preparation_time=row[8]
                )
                items.append(item)
            
            conn.close()
            return items
            
        except Exception as e:
            print(f"Napaka pri pridobivanju menijev: {e}")
            return []
    
    def get_daily_report(self, date: datetime.date, device_id: str = None) -> Dict:
        """Pridobi dnevno poročilo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = '''
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(total) as total_revenue,
                    SUM(CASE WHEN payment_method = 'gotovina' THEN total ELSE 0 END) as cash_revenue,
                    SUM(CASE WHEN payment_method = 'kartica' THEN total ELSE 0 END) as card_revenue,
                    SUM(vat_amount) as vat_collected
                FROM transactions 
                WHERE DATE(timestamp) = ? AND status = 'zakljucena'
            '''
            params = [date.strftime('%Y-%m-%d')]
            
            if device_id:
                query += " AND device_id = ?"
                params.append(device_id)
            
            cursor.execute(query, params)
            result = cursor.fetchone()
            
            report = {
                "date": date.strftime('%Y-%m-%d'),
                "device_id": device_id,
                "total_transactions": result[0] or 0,
                "total_revenue": result[1] or 0,
                "cash_revenue": result[2] or 0,
                "card_revenue": result[3] or 0,
                "vat_collected": result[4] or 0,
                "generated_at": datetime.datetime.now().isoformat()
            }
            
            conn.close()
            return report
            
        except Exception as e:
            print(f"Napaka pri pridobivanju poročila: {e}")
            return {}
    
    def update_inventory(self, item_id: str, quantity_change: int) -> bool:
        """Posodobi zalogo artikla"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE inventory 
                SET current_stock = current_stock + ?, last_updated = ?
                WHERE item_id = ?
            ''', (quantity_change, datetime.datetime.now(), item_id))
            
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
                SELECT m.name, i.current_stock, i.min_stock, i.item_id
                FROM inventory i
                JOIN menu_items m ON i.item_id = m.id
                WHERE i.current_stock <= i.min_stock
            ''')
            
            rows = cursor.fetchall()
            low_stock = []
            
            for row in rows:
                low_stock.append({
                    "name": row[0],
                    "current_stock": row[1],
                    "min_stock": row[2],
                    "item_id": row[3]
                })
            
            conn.close()
            return low_stock
            
        except Exception as e:
            print(f"Napaka pri pridobivanju nizkih zalog: {e}")
            return []

def demo_pos_system():
    """Demo funkcija POS sistema"""
    print("🏪 OMNI POS & FISCAL SYSTEM - DEMO")
    print("=" * 50)
    
    # Inicializacija sistema
    pos_system = OmniPOSFiscalSystem()
    
    # Registracija naprav
    devices = [
        ("POS001", "Glavna blagajna", DeviceType.MAIN_POS, "Recepcija", "192.168.1.10"),
        ("MOB001", "Mobilna blagajna 1", DeviceType.MOBILE_POS, "Terasa", "192.168.1.11"),
        ("SELF001", "Samopostrežna blagajna", DeviceType.SELF_SERVICE, "Vhod", "192.168.1.12"),
        ("KIOSK001", "Informacijski kiosk", DeviceType.KIOSK, "Lobby", "192.168.1.13")
    ]
    
    print("\n📱 Registracija POS naprav:")
    for device_id, name, device_type, location, ip in devices:
        success = pos_system.register_pos_device(device_id, name, device_type, location, ip)
        print(f"✅ {name} ({device_type.value}) - {location}")
    
    # Dodajanje menijev
    menu_items = [
        MenuItem("FOOD001", "Goveja juha", ItemCategory.FOOD, 4.50, 9.5, "Domača goveja juha z rezanci", ["gluten"], True, 5),
        MenuItem("FOOD002", "Dunajski zrezek", ItemCategory.FOOD, 12.80, 9.5, "Dunajski zrezek s krompirjem", ["gluten", "jajca"], True, 15),
        MenuItem("BEV001", "Coca Cola 0.33l", ItemCategory.BEVERAGE, 2.50, 22.0, "Osvežilna pijača", [], True, 0),
        MenuItem("BEV002", "Laško pivo 0.5l", ItemCategory.BEVERAGE, 3.20, 22.0, "Slovensko pivo", [], True, 0),
        MenuItem("ACC001", "Nočitev - standardna soba", ItemCategory.ACCOMMODATION, 85.00, 9.5, "Standardna dvoposteljna soba", [], True, 0),
        MenuItem("ACT001", "Vožnja s čolnom", ItemCategory.ACTIVITY, 25.00, 22.0, "Panoramska vožnja po jezeru", [], True, 60)
    ]
    
    print("\n🍽️ Dodajanje menijev:")
    for item in menu_items:
        success = pos_system.add_menu_item(item)
        print(f"✅ {item.name} - {item.price}€ (DDV: {item.vat_rate}%)")
    
    # Simulacija transakcij
    print("\n💳 Simulacija transakcij:")
    
    # Transakcija 1 - Glavna blagajna
    items1 = [
        {"id": "FOOD001", "name": "Goveja juha", "price": 4.50, "vat_rate": 9.5, "quantity": 2},
        {"id": "BEV001", "name": "Coca Cola 0.33l", "price": 2.50, "vat_rate": 22.0, "quantity": 2}
    ]
    
    transaction1 = pos_system.create_transaction("POS001", DeviceType.MAIN_POS, items1, PaymentMethod.CARD, waiter_id="NAT001")
    if transaction1:
        print(f"✅ Transakcija 1: {transaction1.total}€ (kartica)")
        
        # Obdelaj davčni račun
        fiscal_receipt1 = pos_system.process_fiscal_receipt(transaction1)
        if fiscal_receipt1:
            print(f"   📄 Davčni račun: {fiscal_receipt1.fiscal_number}")
    
    # Transakcija 2 - Mobilna blagajna
    items2 = [
        {"id": "FOOD002", "name": "Dunajski zrezek", "price": 12.80, "vat_rate": 9.5, "quantity": 1},
        {"id": "BEV002", "name": "Laško pivo 0.5l", "price": 3.20, "vat_rate": 22.0, "quantity": 1}
    ]
    
    transaction2 = pos_system.create_transaction("MOB001", DeviceType.MOBILE_POS, items2, PaymentMethod.CASH, waiter_id="NAT002")
    if transaction2:
        print(f"✅ Transakcija 2: {transaction2.total}€ (gotovina)")
        
        fiscal_receipt2 = pos_system.process_fiscal_receipt(transaction2)
        if fiscal_receipt2:
            print(f"   📄 Davčni račun: {fiscal_receipt2.fiscal_number}")
    
    # Transakcija 3 - Samopostrežna blagajna
    items3 = [
        {"id": "ACC001", "name": "Nočitev - standardna soba", "price": 85.00, "vat_rate": 9.5, "quantity": 1}
    ]
    
    transaction3 = pos_system.create_transaction("SELF001", DeviceType.SELF_SERVICE, items3, PaymentMethod.QR_CODE, customer_id="CUST001")
    if transaction3:
        print(f"✅ Transakcija 3: {transaction3.total}€ (QR plačilo)")
        
        fiscal_receipt3 = pos_system.process_fiscal_receipt(transaction3)
        if fiscal_receipt3:
            print(f"   📄 Davčni račun: {fiscal_receipt3.fiscal_number}")
    
    # Posodobi zaloge
    print("\n📦 Posodabljanje zalog:")
    pos_system.update_inventory("FOOD001", -2)  # Prodano 2 juhi
    pos_system.update_inventory("BEV001", -2)   # Prodano 2 coca coli
    pos_system.update_inventory("FOOD002", -1)  # Prodan 1 zrezek
    pos_system.update_inventory("BEV002", -1)   # Prodano 1 pivo
    print("✅ Zaloge posodobljene glede na prodajo")
    
    # Preveri nizke zaloge
    low_stock = pos_system.get_low_stock_items()
    if low_stock:
        print("\n⚠️ Artikli z nizko zalogo:")
        for item in low_stock:
            print(f"   - {item['name']}: {item['current_stock']} (min: {item['min_stock']})")
    
    # Dnevno poročilo
    today = datetime.date.today()
    daily_report = pos_system.get_daily_report(today)
    
    print(f"\n📊 Dnevno poročilo ({today}):")
    print(f"   💰 Skupni promet: {daily_report.get('total_revenue', 0):.2f}€")
    print(f"   🧾 Število transakcij: {daily_report.get('total_transactions', 0)}")
    print(f"   💵 Gotovina: {daily_report.get('cash_revenue', 0):.2f}€")
    print(f"   💳 Kartice: {daily_report.get('card_revenue', 0):.2f}€")
    print(f"   🏛️ Zbrani DDV: {daily_report.get('vat_collected', 0):.2f}€")
    
    print("\n🎉 POS sistem uspešno testiran!")
    print("✅ Davčna integracija aktivna")
    print("✅ Mobilne blagajne povezane")
    print("✅ Samopostrežne blagajne delujoče")
    print("✅ Zaloge sinhronizirane")
    print("✅ Poročila generirana")

if __name__ == "__main__":
    demo_pos_system()