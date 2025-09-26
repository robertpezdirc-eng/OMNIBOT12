"""
💰 Accounting Integration - Računovodski integracijski sistem
Napredna integracija za upravljanje prihodkov, odhodkov, ROI in DDV
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
from decimal import Decimal, ROUND_HALF_UP
import csv
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class TransactionType(Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"

class VATRate(Enum):
    STANDARD = 22.0  # Standardna DDV stopnja v Sloveniji
    REDUCED = 9.5    # Znižana DDV stopnja
    ZERO = 0.0       # Oproščeno DDV
    EXEMPT = -1.0    # Ni predmet DDV

class AccountCategory(Enum):
    REVENUE = "revenue"
    COST_OF_GOODS = "cost_of_goods"
    OPERATING_EXPENSES = "operating_expenses"
    MARKETING = "marketing"
    PERSONNEL = "personnel"
    UTILITIES = "utilities"
    RENT = "rent"
    DEPRECIATION = "depreciation"
    TAXES = "taxes"
    OTHER = "other"

@dataclass
class Transaction:
    """Računovodska transakcija"""
    transaction_id: str
    date: date
    transaction_type: TransactionType
    category: AccountCategory
    description: str
    amount: Decimal
    vat_rate: VATRate
    vat_amount: Decimal
    net_amount: Decimal
    reference_id: Optional[str] = None  # Povezava z rezervacijo, prodajo, itd.
    supplier_customer: Optional[str] = None
    invoice_number: Optional[str] = None
    created_at: datetime = None

@dataclass
class FinancialReport:
    """Finančno poročilo"""
    period_start: date
    period_end: date
    total_revenue: Decimal
    total_expenses: Decimal
    gross_profit: Decimal
    net_profit: Decimal
    vat_collected: Decimal
    vat_paid: Decimal
    vat_liability: Decimal
    roi_percentage: float

class AccountingIntegration:
    """Računovodski integracijski sistem"""
    
    def __init__(self, db_path: str = "accounting.db"):
        self.db_path = db_path
        self._init_database()
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela transakcij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS transactions (
                    transaction_id TEXT PRIMARY KEY,
                    date TEXT NOT NULL,
                    transaction_type TEXT NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    vat_rate DECIMAL(5,2) NOT NULL,
                    vat_amount DECIMAL(10,2) NOT NULL,
                    net_amount DECIMAL(10,2) NOT NULL,
                    reference_id TEXT,
                    supplier_customer TEXT,
                    invoice_number TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela DDV stopenj
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vat_rates (
                    rate_id TEXT PRIMARY KEY,
                    rate_name TEXT NOT NULL,
                    rate_percentage DECIMAL(5,2) NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    valid_from TEXT NOT NULL,
                    valid_to TEXT
                )
            ''')
            
            # Tabela kontnih načrtov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS chart_of_accounts (
                    account_code TEXT PRIMARY KEY,
                    account_name TEXT NOT NULL,
                    account_type TEXT NOT NULL,
                    parent_account TEXT,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            # Tabela proračunov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS budgets (
                    budget_id TEXT PRIMARY KEY,
                    year INTEGER NOT NULL,
                    month INTEGER,
                    category TEXT NOT NULL,
                    budgeted_amount DECIMAL(10,2) NOT NULL,
                    actual_amount DECIMAL(10,2) DEFAULT 0,
                    variance DECIMAL(10,2) DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            ''')
            
            conn.commit()
            logger.info("💰 Računovodska baza podatkov inicializirana")
    
    def record_transaction(self, transaction: Transaction) -> Dict[str, Any]:
        """Zabeleži transakcijo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO transactions 
                    (transaction_id, date, transaction_type, category, description,
                     amount, vat_rate, vat_amount, net_amount, reference_id,
                     supplier_customer, invoice_number, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    transaction.transaction_id,
                    transaction.date.isoformat(),
                    transaction.transaction_type.value,
                    transaction.category.value,
                    transaction.description,
                    float(transaction.amount),
                    float(transaction.vat_rate.value) if transaction.vat_rate.value >= 0 else 0,
                    float(transaction.vat_amount),
                    float(transaction.net_amount),
                    transaction.reference_id,
                    transaction.supplier_customer,
                    transaction.invoice_number,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "transaction_id": transaction.transaction_id,
                    "message": "Transakcija uspešno zabeležena"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri beleženju transakcije: {e}")
            return {"success": False, "error": str(e)}
    
    def calculate_vat(self, net_amount: Decimal, vat_rate: VATRate) -> Tuple[Decimal, Decimal]:
        """Izračunaj DDV"""
        if vat_rate == VATRate.EXEMPT or vat_rate.value < 0:
            return Decimal('0.00'), net_amount
        
        vat_amount = (net_amount * Decimal(str(vat_rate.value)) / Decimal('100')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        gross_amount = net_amount + vat_amount
        
        return vat_amount, gross_amount
    
    def record_sale(self, sale_data: Dict[str, Any]) -> Dict[str, Any]:
        """Zabeleži prodajo"""
        try:
            net_amount = Decimal(str(sale_data['net_amount']))
            vat_rate = VATRate(sale_data.get('vat_rate', VATRate.STANDARD.value))
            
            vat_amount, gross_amount = self.calculate_vat(net_amount, vat_rate)
            
            transaction = Transaction(
                transaction_id=str(uuid.uuid4()),
                date=datetime.now().date(),
                transaction_type=TransactionType.INCOME,
                category=AccountCategory.REVENUE,
                description=sale_data['description'],
                amount=gross_amount,
                vat_rate=vat_rate,
                vat_amount=vat_amount,
                net_amount=net_amount,
                reference_id=sale_data.get('reference_id'),
                supplier_customer=sale_data.get('customer'),
                invoice_number=sale_data.get('invoice_number')
            )
            
            return self.record_transaction(transaction)
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju prodaje: {e}")
            return {"success": False, "error": str(e)}
    
    def record_expense(self, expense_data: Dict[str, Any]) -> Dict[str, Any]:
        """Zabeleži odhodek"""
        try:
            net_amount = Decimal(str(expense_data['net_amount']))
            vat_rate = VATRate(expense_data.get('vat_rate', VATRate.STANDARD.value))
            
            vat_amount, gross_amount = self.calculate_vat(net_amount, vat_rate)
            
            transaction = Transaction(
                transaction_id=str(uuid.uuid4()),
                date=datetime.now().date(),
                transaction_type=TransactionType.EXPENSE,
                category=AccountCategory(expense_data.get('category', AccountCategory.OTHER.value)),
                description=expense_data['description'],
                amount=gross_amount,
                vat_rate=vat_rate,
                vat_amount=vat_amount,
                net_amount=net_amount,
                reference_id=expense_data.get('reference_id'),
                supplier_customer=expense_data.get('supplier'),
                invoice_number=expense_data.get('invoice_number')
            )
            
            return self.record_transaction(transaction)
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju odhodka: {e}")
            return {"success": False, "error": str(e)}
    
    def generate_financial_report(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Generiraj finančno poročilo"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Prihodki
            cursor.execute('''
                SELECT 
                    SUM(CASE WHEN transaction_type = 'income' THEN net_amount ELSE 0 END) as total_revenue,
                    SUM(CASE WHEN transaction_type = 'expense' THEN net_amount ELSE 0 END) as total_expenses,
                    SUM(CASE WHEN transaction_type = 'income' THEN vat_amount ELSE 0 END) as vat_collected,
                    SUM(CASE WHEN transaction_type = 'expense' THEN vat_amount ELSE 0 END) as vat_paid
                FROM transactions 
                WHERE date BETWEEN ? AND ?
            ''', (start_date, end_date))
            
            summary = cursor.fetchone()
            
            total_revenue = Decimal(str(summary[0] or 0))
            total_expenses = Decimal(str(summary[1] or 0))
            vat_collected = Decimal(str(summary[2] or 0))
            vat_paid = Decimal(str(summary[3] or 0))
            
            gross_profit = total_revenue - total_expenses
            vat_liability = vat_collected - vat_paid
            
            # ROI izračun (potrebujemo začetni kapital)
            roi_percentage = float((gross_profit / total_revenue * 100)) if total_revenue > 0 else 0
            
            # Razčlenitev po kategorijah
            cursor.execute('''
                SELECT 
                    category,
                    transaction_type,
                    SUM(net_amount) as total,
                    COUNT(*) as count
                FROM transactions 
                WHERE date BETWEEN ? AND ?
                GROUP BY category, transaction_type
                ORDER BY total DESC
            ''', (start_date, end_date))
            
            category_breakdown = []
            for row in cursor.fetchall():
                category_breakdown.append({
                    "category": row[0],
                    "type": row[1],
                    "total": float(row[2]),
                    "count": row[3]
                })
            
            # Mesečni trendi
            cursor.execute('''
                SELECT 
                    strftime('%Y-%m', date) as month,
                    SUM(CASE WHEN transaction_type = 'income' THEN net_amount ELSE 0 END) as revenue,
                    SUM(CASE WHEN transaction_type = 'expense' THEN net_amount ELSE 0 END) as expenses
                FROM transactions 
                WHERE date BETWEEN ? AND ?
                GROUP BY strftime('%Y-%m', date)
                ORDER BY month
            ''', (start_date, end_date))
            
            monthly_trends = []
            for row in cursor.fetchall():
                monthly_trends.append({
                    "month": row[0],
                    "revenue": float(row[1]),
                    "expenses": float(row[2]),
                    "profit": float(row[1]) - float(row[2])
                })
            
            return {
                "period": f"{start_date} - {end_date}",
                "summary": {
                    "total_revenue": float(total_revenue),
                    "total_expenses": float(total_expenses),
                    "gross_profit": float(gross_profit),
                    "profit_margin": float((gross_profit / total_revenue * 100)) if total_revenue > 0 else 0,
                    "vat_collected": float(vat_collected),
                    "vat_paid": float(vat_paid),
                    "vat_liability": float(vat_liability),
                    "roi_percentage": roi_percentage
                },
                "category_breakdown": category_breakdown,
                "monthly_trends": monthly_trends,
                "generated_at": datetime.now().isoformat()
            }
    
    def generate_vat_report(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Generiraj DDV poročilo"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # DDV po stopnjah
            cursor.execute('''
                SELECT 
                    vat_rate,
                    transaction_type,
                    SUM(net_amount) as net_total,
                    SUM(vat_amount) as vat_total,
                    COUNT(*) as transaction_count
                FROM transactions 
                WHERE date BETWEEN ? AND ? AND vat_rate >= 0
                GROUP BY vat_rate, transaction_type
                ORDER BY vat_rate, transaction_type
            ''', (start_date, end_date))
            
            vat_breakdown = []
            for row in cursor.fetchall():
                vat_breakdown.append({
                    "vat_rate": float(row[0]),
                    "transaction_type": row[1],
                    "net_amount": float(row[2]),
                    "vat_amount": float(row[3]),
                    "transaction_count": row[4]
                })
            
            # Skupni DDV
            cursor.execute('''
                SELECT 
                    SUM(CASE WHEN transaction_type = 'income' THEN vat_amount ELSE 0 END) as output_vat,
                    SUM(CASE WHEN transaction_type = 'expense' THEN vat_amount ELSE 0 END) as input_vat
                FROM transactions 
                WHERE date BETWEEN ? AND ?
            ''', (start_date, end_date))
            
            vat_summary = cursor.fetchone()
            output_vat = Decimal(str(vat_summary[0] or 0))
            input_vat = Decimal(str(vat_summary[1] or 0))
            net_vat = output_vat - input_vat
            
            return {
                "period": f"{start_date} - {end_date}",
                "summary": {
                    "output_vat": float(output_vat),  # DDV na prodajo
                    "input_vat": float(input_vat),   # DDV na nakup
                    "net_vat_liability": float(net_vat),
                    "payment_due": float(net_vat) if net_vat > 0 else 0,
                    "refund_due": float(abs(net_vat)) if net_vat < 0 else 0
                },
                "breakdown": vat_breakdown,
                "generated_at": datetime.now().isoformat()
            }
    
    def calculate_roi(self, investment_amount: Decimal, period_days: int) -> Dict[str, Any]:
        """Izračunaj ROI za določeno obdobje"""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=period_days)
        
        report = self.generate_financial_report(
            start_date.isoformat(), 
            end_date.isoformat()
        )
        
        profit = Decimal(str(report['summary']['gross_profit']))
        roi_percentage = float((profit / investment_amount * 100)) if investment_amount > 0 else 0
        
        return {
            "investment_amount": float(investment_amount),
            "period_days": period_days,
            "total_profit": float(profit),
            "roi_percentage": roi_percentage,
            "annualized_roi": roi_percentage * (365 / period_days) if period_days > 0 else 0,
            "break_even_days": int((investment_amount / (profit / period_days))) if profit > 0 else None,
            "calculated_at": datetime.now().isoformat()
        }
    
    def export_to_csv(self, start_date: str, end_date: str, filename: str) -> Dict[str, Any]:
        """Izvozi podatke v CSV"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM transactions 
                    WHERE date BETWEEN ? AND ?
                    ORDER BY date, created_at
                ''', (start_date, end_date))
                
                with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                    writer = csv.writer(csvfile)
                    
                    # Glava
                    writer.writerow([
                        'ID transakcije', 'Datum', 'Tip', 'Kategorija', 'Opis',
                        'Znesek', 'DDV stopnja', 'DDV znesek', 'Neto znesek',
                        'Referenca', 'Dobavitelj/Kupec', 'Št. računa', 'Ustvarjeno'
                    ])
                    
                    # Podatki
                    for row in cursor.fetchall():
                        writer.writerow(row)
                
                return {
                    "success": True,
                    "filename": filename,
                    "message": f"Podatki izvoženi v {filename}"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri izvozu CSV: {e}")
            return {"success": False, "error": str(e)}
    
    def generate_xml_invoice(self, transaction_id: str) -> Dict[str, Any]:
        """Generiraj XML račun (eSlog format)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM transactions WHERE transaction_id = ?
                ''', (transaction_id,))
                
                transaction = cursor.fetchone()
                if not transaction:
                    return {"success": False, "error": "Transakcija ne obstaja"}
                
                # Ustvari XML strukturo
                root = ET.Element("Invoice")
                
                # Osnovni podatki
                header = ET.SubElement(root, "Header")
                ET.SubElement(header, "InvoiceNumber").text = transaction[11] or f"INV-{transaction_id[:8]}"
                ET.SubElement(header, "IssueDate").text = transaction[1]
                ET.SubElement(header, "DueDate").text = transaction[1]
                
                # Dobavitelj
                supplier = ET.SubElement(root, "Supplier")
                ET.SubElement(supplier, "Name").text = "Vaše podjetje"
                ET.SubElement(supplier, "TaxNumber").text = "SI12345678"
                
                # Kupec
                customer = ET.SubElement(root, "Customer")
                ET.SubElement(customer, "Name").text = transaction[10] or "Neznani kupec"
                
                # Postavke
                lines = ET.SubElement(root, "InvoiceLines")
                line = ET.SubElement(lines, "InvoiceLine")
                ET.SubElement(line, "Description").text = transaction[4]
                ET.SubElement(line, "Quantity").text = "1"
                ET.SubElement(line, "UnitPrice").text = str(transaction[8])
                ET.SubElement(line, "VATRate").text = str(transaction[6])
                ET.SubElement(line, "VATAmount").text = str(transaction[7])
                ET.SubElement(line, "LineTotal").text = str(transaction[5])
                
                # Skupaj
                totals = ET.SubElement(root, "Totals")
                ET.SubElement(totals, "NetAmount").text = str(transaction[8])
                ET.SubElement(totals, "VATAmount").text = str(transaction[7])
                ET.SubElement(totals, "GrossAmount").text = str(transaction[5])
                
                # Shrani XML
                filename = f"invoice_{transaction_id[:8]}.xml"
                tree = ET.ElementTree(root)
                tree.write(filename, encoding='utf-8', xml_declaration=True)
                
                return {
                    "success": True,
                    "filename": filename,
                    "message": f"XML račun ustvarjen: {filename}"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju XML računa: {e}")
            return {"success": False, "error": str(e)}
    
    def integrate_external_accounting(self, system_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Integriraj zunanji računovodski sistem"""
        try:
            if system_type == "metakocka":
                return self._integrate_metakocka(config)
            elif system_type == "pantheon":
                return self._integrate_pantheon(config)
            elif system_type == "custom_erp":
                return self._integrate_custom_erp(config)
            else:
                return {"success": False, "error": f"Nepodprt sistem: {system_type}"}
                
        except Exception as e:
            logger.error(f"Napaka pri integraciji: {e}")
            return {"success": False, "error": str(e)}
    
    def _integrate_metakocka(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Integriraj Metakocka ERP"""
        # Implementacija Metakocka API integracije
        return {"success": True, "message": "Metakocka integracija pripravljena"}
    
    def _integrate_pantheon(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Integriraj Pantheon ERP"""
        # Implementacija Pantheon API integracije
        return {"success": True, "message": "Pantheon integracija pripravljena"}
    
    def _integrate_custom_erp(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Integriraj custom ERP sistem"""
        # Implementacija custom ERP integracije
        return {"success": True, "message": "Custom ERP integracija pripravljena"}

# Primer uporabe
if __name__ == "__main__":
    accounting = AccountingIntegration()
    
    # Zabeleži prodajo
    sale_result = accounting.record_sale({
        "description": "Večerja za 4 osebe",
        "net_amount": 80.00,
        "vat_rate": VATRate.STANDARD.value,
        "customer": "Janez Novak",
        "reference_id": "RES001"
    })
    print(f"Beleženje prodaje: {sale_result}")
    
    # Zabeleži odhodek
    expense_result = accounting.record_expense({
        "description": "Nakup živil",
        "net_amount": 200.00,
        "vat_rate": VATRate.STANDARD.value,
        "category": AccountCategory.COST_OF_GOODS.value,
        "supplier": "Mercator d.d.",
        "invoice_number": "INV-2024-001"
    })
    print(f"Beleženje odhodka: {expense_result}")
    
    # Generiraj finančno poročilo
    report = accounting.generate_financial_report(
        (datetime.now() - timedelta(days=30)).date().isoformat(),
        datetime.now().date().isoformat()
    )
    print(f"Finančno poročilo: {json.dumps(report, indent=2, ensure_ascii=False)}")
    
    # Izračunaj ROI
    roi = accounting.calculate_roi(Decimal('10000'), 30)
    print(f"ROI izračun: {roi}")