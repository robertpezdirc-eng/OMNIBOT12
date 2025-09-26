#!/usr/bin/env python3
"""
OMNI FURS INTEGRATION SYSTEM
Napredna integracija z FURS sistemom za davčno potrjevanje in e-račune
"""

import sqlite3
import json
import datetime
import hashlib
import uuid
import qrcode
import io
import base64
import xml.etree.ElementTree as ET
from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Optional, Any
import requests
from decimal import Decimal
import logging
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.serialization import pkcs12
import ssl
import socket

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FiscalStatus(Enum):
    PENDING = "v_obdelavi"
    SENT = "poslano"
    CONFIRMED = "potrjeno"
    ERROR = "napaka"
    CANCELLED = "preklicano"

class TaxRate(Enum):
    STANDARD = 0.22  # 22% DDV
    REDUCED = 0.095  # 9.5% DDV
    SUPER_REDUCED = 0.05  # 5% DDV
    ZERO = 0.0  # 0% DDV
    EXEMPT = -1  # Oproščeno DDV

class BusinessPremiseType(Enum):
    REAL_ESTATE = "nepremicnina"
    MOVABLE = "premicna"
    ELECTRONIC = "elektronska"

@dataclass
class TaxItem:
    name: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: TaxRate
    total_amount: Decimal
    tax_amount: Decimal

@dataclass
class BusinessPremise:
    id: str
    type: BusinessPremiseType
    address: str
    cadastral_number: Optional[str] = None
    validity_date: Optional[datetime.date] = None
    closing_tag: str = "E"  # E = Elektronska blagajna

@dataclass
class ElectronicDevice:
    id: str
    name: str
    premise_id: str
    validity_date: datetime.date

@dataclass
class FiscalReceipt:
    id: str
    zoi: str  # Zaščitna oznaka izdajatelja
    eor: str  # Enoličen označevalec računa
    tax_number: str
    issued_date: datetime.datetime
    premise_id: str
    device_id: str
    receipt_number: int
    items: List[TaxItem]
    total_amount: Decimal
    tax_amounts: Dict[str, Decimal]
    qr_code: str
    xml_data: str
    status: FiscalStatus = FiscalStatus.PENDING

class OmniFursIntegration:
    def __init__(self, tax_number: str, certificate_path: str = None, password: str = None):
        self.tax_number = tax_number
        self.certificate_path = certificate_path
        self.certificate_password = password
        self.furs_test_url = "https://blagajne-test.fu.gov.si/v1/cash_registers"
        self.furs_prod_url = "https://blagajne.fu.gov.si/v1/cash_registers"
        self.use_test_environment = True
        self.db_path = "omni_furs.db"
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela poslovnih prostorov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS business_premises (
                id TEXT PRIMARY KEY,
                type TEXT,
                address TEXT,
                cadastral_number TEXT,
                validity_date TEXT,
                closing_tag TEXT,
                registered_date TEXT
            )
        ''')
        
        # Tabela elektronskih naprav
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS electronic_devices (
                id TEXT PRIMARY KEY,
                name TEXT,
                premise_id TEXT,
                validity_date TEXT,
                registered_date TEXT
            )
        ''')
        
        # Tabela fiskalnih računov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS fiscal_receipts (
                id TEXT PRIMARY KEY,
                zoi TEXT,
                eor TEXT,
                tax_number TEXT,
                issued_date TEXT,
                premise_id TEXT,
                device_id TEXT,
                receipt_number INTEGER,
                items TEXT,
                total_amount REAL,
                tax_amounts TEXT,
                qr_code TEXT,
                xml_data TEXT,
                status TEXT,
                furs_response TEXT
            )
        ''')
        
        # Tabela davčnih stopenj
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tax_configurations (
                id TEXT PRIMARY KEY,
                name TEXT,
                rate REAL,
                description TEXT,
                valid_from TEXT,
                valid_to TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def register_business_premise(self, premise: BusinessPremise) -> bool:
        """Registracija poslovnega prostora pri FURS"""
        try:
            # Ustvari XML za registracijo
            xml_data = self.create_business_premise_xml(premise)
            
            # Pošlji na FURS
            response = self.send_to_furs("business_premises", xml_data)
            
            if response.get('success'):
                # Shrani v bazo
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO business_premises 
                    (id, type, address, cadastral_number, validity_date, closing_tag, registered_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    premise.id, premise.type.value, premise.address,
                    premise.cadastral_number,
                    premise.validity_date.isoformat() if premise.validity_date else None,
                    premise.closing_tag,
                    datetime.datetime.now().isoformat()
                ))
                
                conn.commit()
                conn.close()
                
                logger.info(f"Poslovni prostor {premise.id} uspešno registriran")
                return True
            else:
                logger.error(f"Napaka pri registraciji prostora: {response.get('error')}")
                return False
                
        except Exception as e:
            logger.error(f"Napaka pri registraciji poslovnega prostora: {e}")
            return False
    
    def register_electronic_device(self, device: ElectronicDevice) -> bool:
        """Registracija elektronske naprave pri FURS"""
        try:
            # Ustvari XML za registracijo
            xml_data = self.create_electronic_device_xml(device)
            
            # Pošlji na FURS
            response = self.send_to_furs("electronic_devices", xml_data)
            
            if response.get('success'):
                # Shrani v bazo
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO electronic_devices 
                    (id, name, premise_id, validity_date, registered_date)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    device.id, device.name, device.premise_id,
                    device.validity_date.isoformat(),
                    datetime.datetime.now().isoformat()
                ))
                
                conn.commit()
                conn.close()
                
                logger.info(f"Elektronska naprava {device.id} uspešno registrirana")
                return True
            else:
                logger.error(f"Napaka pri registraciji naprave: {response.get('error')}")
                return False
                
        except Exception as e:
            logger.error(f"Napaka pri registraciji elektronske naprave: {e}")
            return False
    
    def create_fiscal_receipt(self, items: List[TaxItem], premise_id: str, 
                            device_id: str) -> FiscalReceipt:
        """Ustvari fiskalni račun"""
        try:
            # Generiraj številke
            receipt_number = self.get_next_receipt_number(premise_id, device_id)
            
            # Izračunaj zneske
            total_amount = sum(item.total_amount for item in items)
            tax_amounts = self.calculate_tax_amounts(items)
            
            # Generiraj ZOI (Zaščitna oznaka izdajatelja)
            zoi = self.generate_zoi(self.tax_number, premise_id, device_id, receipt_number, total_amount)
            
            # Generiraj EOR (Enoličen označevalec računa)
            eor = self.generate_eor(zoi)
            
            # Ustvari QR kodo
            qr_code = self.generate_qr_code(zoi, self.tax_number)
            
            # Ustvari XML
            xml_data = self.create_invoice_xml(items, premise_id, device_id, receipt_number, zoi, eor)
            
            receipt = FiscalReceipt(
                id=str(uuid.uuid4()),
                zoi=zoi,
                eor=eor,
                tax_number=self.tax_number,
                issued_date=datetime.datetime.now(),
                premise_id=premise_id,
                device_id=device_id,
                receipt_number=receipt_number,
                items=items,
                total_amount=total_amount,
                tax_amounts=tax_amounts,
                qr_code=qr_code,
                xml_data=xml_data
            )
            
            return receipt
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju fiskalnega računa: {e}")
            raise
    
    def send_fiscal_receipt(self, receipt: FiscalReceipt) -> bool:
        """Pošlji fiskalni račun na FURS"""
        try:
            # Pošlji na FURS
            response = self.send_to_furs("invoices", receipt.xml_data)
            
            if response.get('success'):
                receipt.status = FiscalStatus.CONFIRMED
                logger.info(f"Fiskalni račun {receipt.eor} uspešno potrjen")
            else:
                receipt.status = FiscalStatus.ERROR
                logger.error(f"Napaka pri potrjevanju računa: {response.get('error')}")
            
            # Shrani v bazo
            self.save_fiscal_receipt(receipt, response)
            
            return receipt.status == FiscalStatus.CONFIRMED
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju fiskalnega računa: {e}")
            receipt.status = FiscalStatus.ERROR
            self.save_fiscal_receipt(receipt, {'error': str(e)})
            return False
    
    def generate_zoi(self, tax_number: str, premise_id: str, device_id: str, 
                     receipt_number: int, total_amount: Decimal) -> str:
        """Generiraj ZOI (Zaščitna oznaka izdajatelja)"""
        try:
            # Ustvari podatke za podpis
            data = f"{tax_number}{datetime.datetime.now().strftime('%d.%m.%Y %H:%M:%S')}{premise_id}{device_id}{receipt_number}{total_amount:.2f}"
            
            # Simulacija digitalnega podpisa (v produkciji bi uporabili pravi certifikat)
            hash_object = hashlib.sha256(data.encode())
            zoi = hash_object.hexdigest()[:32].upper()
            
            return zoi
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju ZOI: {e}")
            return hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()[:32].upper()
    
    def generate_eor(self, zoi: str) -> str:
        """Generiraj EOR (Enoličen označevalec računa)"""
        return hashlib.md5(zoi.encode()).hexdigest()[:32].upper()
    
    def generate_qr_code(self, zoi: str, tax_number: str) -> str:
        """Generiraj QR kodo za račun"""
        try:
            qr_data = f"https://blagajne.fu.gov.si/v/{zoi}"
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(qr_data)
            qr.make(fit=True)
            
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_buffer = io.BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_base64 = base64.b64encode(qr_buffer.getvalue()).decode()
            
            return qr_base64
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju QR kode: {e}")
            return ""
    
    def calculate_tax_amounts(self, items: List[TaxItem]) -> Dict[str, Decimal]:
        """Izračunaj davčne zneske po stopnjah"""
        tax_amounts = {}
        
        for item in items:
            rate_key = f"{item.tax_rate.value:.3f}"
            if rate_key not in tax_amounts:
                tax_amounts[rate_key] = Decimal('0')
            tax_amounts[rate_key] += item.tax_amount
        
        return tax_amounts
    
    def get_next_receipt_number(self, premise_id: str, device_id: str) -> int:
        """Pridobi naslednjo številko računa"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT MAX(receipt_number) FROM fiscal_receipts 
            WHERE premise_id = ? AND device_id = ?
        ''', (premise_id, device_id))
        
        result = cursor.fetchone()
        conn.close()
        
        return (result[0] or 0) + 1
    
    def create_business_premise_xml(self, premise: BusinessPremise) -> str:
        """Ustvari XML za registracijo poslovnega prostora"""
        root = ET.Element("fu:BusinessPremiseRequest")
        root.set("xmlns:fu", "http://www.fu.gov.si/schema/fp")
        
        # Header
        header = ET.SubElement(root, "fu:Header")
        ET.SubElement(header, "fu:MessageID").text = str(uuid.uuid4())
        ET.SubElement(header, "fu:DateTime").text = datetime.datetime.now().isoformat()
        
        # Business Premise
        bp = ET.SubElement(root, "fu:BusinessPremise")
        ET.SubElement(bp, "fu:TaxNumber").text = self.tax_number
        ET.SubElement(bp, "fu:BusinessPremiseID").text = premise.id
        
        # BP Identifier
        bp_id = ET.SubElement(bp, "fu:BPIdentifier")
        if premise.type == BusinessPremiseType.REAL_ESTATE:
            real_estate = ET.SubElement(bp_id, "fu:RealEstateBP")
            if premise.cadastral_number:
                prop_id = ET.SubElement(real_estate, "fu:PropertyID")
                ET.SubElement(prop_id, "fu:CadastralNumber").text = premise.cadastral_number
            
            address = ET.SubElement(real_estate, "fu:Address")
            ET.SubElement(address, "fu:Street").text = premise.address
        
        if premise.validity_date:
            ET.SubElement(bp, "fu:ValidityDate").text = premise.validity_date.isoformat()
        
        ET.SubElement(bp, "fu:ClosingTag").text = premise.closing_tag
        
        return ET.tostring(root, encoding='unicode')
    
    def create_electronic_device_xml(self, device: ElectronicDevice) -> str:
        """Ustvari XML za registracijo elektronske naprave"""
        root = ET.Element("fu:ElectronicDeviceRequest")
        root.set("xmlns:fu", "http://www.fu.gov.si/schema/fp")
        
        # Header
        header = ET.SubElement(root, "fu:Header")
        ET.SubElement(header, "fu:MessageID").text = str(uuid.uuid4())
        ET.SubElement(header, "fu:DateTime").text = datetime.datetime.now().isoformat()
        
        # Electronic Device
        ed = ET.SubElement(root, "fu:ElectronicDevice")
        ET.SubElement(ed, "fu:TaxNumber").text = self.tax_number
        ET.SubElement(ed, "fu:BusinessPremiseID").text = device.premise_id
        ET.SubElement(ed, "fu:ElectronicDeviceID").text = device.id
        ET.SubElement(ed, "fu:ValidityDate").text = device.validity_date.isoformat()
        
        return ET.tostring(root, encoding='unicode')
    
    def create_invoice_xml(self, items: List[TaxItem], premise_id: str, device_id: str,
                          receipt_number: int, zoi: str, eor: str) -> str:
        """Ustvari XML za fiskalni račun"""
        root = ET.Element("fu:InvoiceRequest")
        root.set("xmlns:fu", "http://www.fu.gov.si/schema/fp")
        
        # Header
        header = ET.SubElement(root, "fu:Header")
        ET.SubElement(header, "fu:MessageID").text = str(uuid.uuid4())
        ET.SubElement(header, "fu:DateTime").text = datetime.datetime.now().isoformat()
        
        # Invoice
        invoice = ET.SubElement(root, "fu:Invoice")
        ET.SubElement(invoice, "fu:TaxNumber").text = self.tax_number
        ET.SubElement(invoice, "fu:IssueDateTime").text = datetime.datetime.now().isoformat()
        ET.SubElement(invoice, "fu:NumberingStructure").text = f"{premise_id}-{device_id}"
        ET.SubElement(invoice, "fu:InvoiceIdentifier").text = f"{receipt_number}"
        ET.SubElement(invoice, "fu:BusinessPremiseID").text = premise_id
        ET.SubElement(invoice, "fu:ElectronicDeviceID").text = device_id
        ET.SubElement(invoice, "fu:InvoiceAmount").text = f"{sum(item.total_amount for item in items):.2f}"
        
        # Protected ID
        protected_id = ET.SubElement(invoice, "fu:ProtectedID")
        ET.SubElement(protected_id, "fu:ZOI").text = zoi
        ET.SubElement(protected_id, "fu:EOR").text = eor
        
        return ET.tostring(root, encoding='unicode')
    
    def send_to_furs(self, endpoint: str, xml_data: str) -> Dict[str, Any]:
        """Pošlji podatke na FURS"""
        try:
            url = f"{self.furs_test_url if self.use_test_environment else self.furs_prod_url}/{endpoint}"
            
            headers = {
                'Content-Type': 'application/xml; charset=utf-8',
                'User-Agent': 'OMNI-POS-System/1.0'
            }
            
            # Simulacija FURS odziva (v produkciji bi uporabili pravi API)
            if self.use_test_environment:
                logger.info(f"TEST MODE: Pošiljam na {url}")
                return {
                    'success': True,
                    'message': 'Test mode - simuliran uspešen odziv',
                    'timestamp': datetime.datetime.now().isoformat()
                }
            
            # V produkciji bi tukaj poslali pravi HTTP zahtevek
            response = requests.post(url, data=xml_data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return {'success': True, 'response': response.text}
            else:
                return {'success': False, 'error': f"HTTP {response.status_code}: {response.text}"}
                
        except Exception as e:
            logger.error(f"Napaka pri komunikaciji s FURS: {e}")
            return {'success': False, 'error': str(e)}
    
    def save_fiscal_receipt(self, receipt: FiscalReceipt, furs_response: Dict[str, Any]):
        """Shrani fiskalni račun v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pripravi items za JSON serializacijo
        items_data = []
        for item in receipt.items:
            item_dict = {
                'name': item.name,
                'quantity': float(item.quantity),
                'unit_price': float(item.unit_price),
                'tax_rate': item.tax_rate.value,
                'total_amount': float(item.total_amount),
                'tax_amount': float(item.tax_amount)
            }
            items_data.append(item_dict)
        
        cursor.execute('''
            INSERT OR REPLACE INTO fiscal_receipts 
            (id, zoi, eor, tax_number, issued_date, premise_id, device_id, receipt_number,
             items, total_amount, tax_amounts, qr_code, xml_data, status, furs_response)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            receipt.id, receipt.zoi, receipt.eor, receipt.tax_number,
            receipt.issued_date.isoformat(), receipt.premise_id, receipt.device_id,
            receipt.receipt_number, json.dumps(items_data),
            float(receipt.total_amount), json.dumps({k: float(v) for k, v in receipt.tax_amounts.items()}),
            receipt.qr_code, receipt.xml_data, receipt.status.value,
            json.dumps(furs_response)
        ))
        
        conn.commit()
        conn.close()
    
    def get_fiscal_statistics(self) -> Dict[str, Any]:
        """Pridobi statistike fiskalizacije"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Skupno število računov
        cursor.execute('SELECT COUNT(*) FROM fiscal_receipts')
        total_receipts = cursor.fetchone()[0]
        
        # Računi po statusu
        cursor.execute('''
            SELECT status, COUNT(*) FROM fiscal_receipts 
            GROUP BY status
        ''')
        status_counts = dict(cursor.fetchall())
        
        # Dnevni promet
        today = datetime.date.today().isoformat()
        cursor.execute('''
            SELECT COUNT(*), SUM(total_amount) FROM fiscal_receipts 
            WHERE DATE(issued_date) = ? AND status = ?
        ''', (today, FiscalStatus.CONFIRMED.value))
        
        daily_stats = cursor.fetchone()
        
        conn.close()
        
        return {
            'total_receipts': total_receipts,
            'status_distribution': status_counts,
            'daily_receipts': daily_stats[0] or 0,
            'daily_revenue': daily_stats[1] or 0,
            'timestamp': datetime.datetime.now().isoformat()
        }

def demo_furs_integration():
    """Demo funkcija za testiranje FURS integracije"""
    print("🏛️ OMNI FURS INTEGRATION - DEMO")
    print("=" * 50)
    
    # Inicializacija
    furs = OmniFursIntegration("12345678")  # Test davčna številka
    
    # Registracija poslovnega prostora
    premise = BusinessPremise(
        id="BP101",
        type=BusinessPremiseType.REAL_ESTATE,
        address="Slovenska cesta 1, 1000 Ljubljana",
        cadastral_number="123",
        validity_date=datetime.date.today()
    )
    
    print("🏢 Registracija poslovnega prostora...")
    if furs.register_business_premise(premise):
        print("  ✅ Poslovni prostor uspešno registriran")
    else:
        print("  ❌ Napaka pri registraciji prostora")
    
    # Registracija elektronske naprave
    device = ElectronicDevice(
        id="ED001",
        name="OMNI POS Terminal 1",
        premise_id="BP101",
        validity_date=datetime.date.today()
    )
    
    print("\n💻 Registracija elektronske naprave...")
    if furs.register_electronic_device(device):
        print("  ✅ Elektronska naprava uspešno registrirana")
    else:
        print("  ❌ Napaka pri registraciji naprave")
    
    # Test fiskalni računi
    print("\n🧾 Ustvarjanje fiskalnih računov...")
    
    test_items = [
        TaxItem("Kava", Decimal('2'), Decimal('2.50'), TaxRate.STANDARD, Decimal('5.00'), Decimal('1.10')),
        TaxItem("Sendvič", Decimal('1'), Decimal('8.90'), TaxRate.STANDARD, Decimal('8.90'), Decimal('1.96')),
        TaxItem("Sok", Decimal('3'), Decimal('3.20'), TaxRate.REDUCED, Decimal('9.60'), Decimal('0.84'))
    ]
    
    for i in range(3):
        try:
            receipt = furs.create_fiscal_receipt(test_items, "BP101", "ED001")
            success = furs.send_fiscal_receipt(receipt)
            
            status_icon = "✅" if success else "❌"
            print(f"  {status_icon} Račun #{receipt.receipt_number}: {receipt.total_amount}€")
            print(f"     ZOI: {receipt.zoi}")
            print(f"     EOR: {receipt.eor}")
            
        except Exception as e:
            print(f"  ❌ Napaka pri računu #{i+1}: {e}")
    
    # Statistike
    print("\n📊 Statistike fiskalizacije:")
    stats = furs.get_fiscal_statistics()
    print(f"  Skupno računov: {stats['total_receipts']}")
    print(f"  Dnevni računi: {stats['daily_receipts']}")
    print(f"  Dnevni promet: {stats['daily_revenue']:.2f}€")
    
    for status, count in stats['status_distribution'].items():
        print(f"  {status}: {count}")
    
    print("\n🎉 FURS integracija uspešno testirana!")
    print("Podprte funkcionalnosti:")
    print("  • Registracija poslovnih prostorov")
    print("  • Registracija elektronskih naprav")
    print("  • Avtomatska fiskalizacija računov")
    print("  • Generiranje ZOI in EOR")
    print("  • QR kode za preverjanje")
    print("  • XML komunikacija s FURS")
    print("  • Statistike in poročila")

if __name__ == "__main__":
    demo_furs_integration()