"""
💰 OMNI FINANCE MODULE
Finance, računovodstvo, grant sistemi, investicije
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class TransactionType(Enum):
    INCOME = "income"
    EXPENSE = "expense"
    INVESTMENT = "investment"
    GRANT = "grant"

class Currency(Enum):
    EUR = "EUR"
    USD = "USD"
    GBP = "GBP"

@dataclass
class Transaction:
    id: str
    amount: float
    currency: Currency
    type: TransactionType
    category: str
    description: str
    date: datetime
    tags: List[str]

@dataclass
class Budget:
    category: str
    monthly_limit: float
    current_spent: float
    currency: Currency

@dataclass
class Investment:
    symbol: str
    name: str
    amount_invested: float
    current_value: float
    currency: Currency
    purchase_date: datetime

class FinanceModule:
    """
    🏦 Omni Finance Module
    - Upravljanje transakcij
    - Proračuni in analiza
    - Investicije
    - Grant sistemi
    """
    
    def __init__(self, db_path: str = "finance.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela transakcij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                amount REAL,
                currency TEXT,
                type TEXT,
                category TEXT,
                description TEXT,
                date TEXT,
                tags TEXT
            )
        ''')
        
        # Tabela proračunov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS budgets (
                category TEXT PRIMARY KEY,
                monthly_limit REAL,
                current_spent REAL,
                currency TEXT
            )
        ''')
        
        # Tabela investicij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS investments (
                symbol TEXT PRIMARY KEY,
                name TEXT,
                amount_invested REAL,
                current_value REAL,
                currency TEXT,
                purchase_date TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_transaction(self, transaction: Transaction) -> bool:
        """Dodaj novo transakcijo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO transactions 
                (id, amount, currency, type, category, description, date, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                transaction.id,
                transaction.amount,
                transaction.currency.value,
                transaction.type.value,
                transaction.category,
                transaction.description,
                transaction.date.isoformat(),
                json.dumps(transaction.tags)
            ))
            
            conn.commit()
            conn.close()
            
            # Posodobi proračun
            self.update_budget_spending(transaction.category, transaction.amount)
            return True
            
        except Exception as e:
            print(f"Napaka pri dodajanju transakcije: {e}")
            return False
    
    def get_transactions(self, 
                        start_date: Optional[datetime] = None,
                        end_date: Optional[datetime] = None,
                        category: Optional[str] = None) -> List[Transaction]:
        """Pridobi transakcije s filtri"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT * FROM transactions WHERE 1=1"
        params = []
        
        if start_date:
            query += " AND date >= ?"
            params.append(start_date.isoformat())
        
        if end_date:
            query += " AND date <= ?"
            params.append(end_date.isoformat())
            
        if category:
            query += " AND category = ?"
            params.append(category)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        transactions = []
        for row in rows:
            transactions.append(Transaction(
                id=row[0],
                amount=row[1],
                currency=Currency(row[2]),
                type=TransactionType(row[3]),
                category=row[4],
                description=row[5],
                date=datetime.fromisoformat(row[6]),
                tags=json.loads(row[7])
            ))
        
        return transactions
    
    def create_budget(self, category: str, monthly_limit: float, currency: Currency = Currency.EUR) -> bool:
        """Ustvari nov proračun"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO budgets 
                (category, monthly_limit, current_spent, currency)
                VALUES (?, ?, 0, ?)
            ''', (category, monthly_limit, currency.value))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju proračuna: {e}")
            return False
    
    def update_budget_spending(self, category: str, amount: float):
        """Posodobi porabo proračuna"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE budgets 
            SET current_spent = current_spent + ?
            WHERE category = ?
        ''', (amount, category))
        
        conn.commit()
        conn.close()
    
    def get_budget_status(self) -> List[Dict]:
        """Pridobi status vseh proračunov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM budgets")
        rows = cursor.fetchall()
        conn.close()
        
        budgets = []
        for row in rows:
            remaining = row[1] - row[2]  # limit - spent
            percentage = (row[2] / row[1]) * 100 if row[1] > 0 else 0
            
            budgets.append({
                'category': row[0],
                'monthly_limit': row[1],
                'current_spent': row[2],
                'remaining': remaining,
                'percentage_used': percentage,
                'currency': row[3],
                'status': 'over_budget' if remaining < 0 else 'warning' if percentage > 80 else 'ok'
            })
        
        return budgets
    
    def add_investment(self, investment: Investment) -> bool:
        """Dodaj investicijo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO investments 
                (symbol, name, amount_invested, current_value, currency, purchase_date)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                investment.symbol,
                investment.name,
                investment.amount_invested,
                investment.current_value,
                investment.currency.value,
                investment.purchase_date.isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Napaka pri dodajanju investicije: {e}")
            return False
    
    def get_portfolio_summary(self) -> Dict:
        """Pridobi povzetek portfelja"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM investments")
        rows = cursor.fetchall()
        conn.close()
        
        total_invested = 0
        total_current = 0
        investments = []
        
        for row in rows:
            invested = row[2]
            current = row[3]
            gain_loss = current - invested
            gain_loss_pct = (gain_loss / invested) * 100 if invested > 0 else 0
            
            total_invested += invested
            total_current += current
            
            investments.append({
                'symbol': row[0],
                'name': row[1],
                'amount_invested': invested,
                'current_value': current,
                'gain_loss': gain_loss,
                'gain_loss_percentage': gain_loss_pct,
                'currency': row[4]
            })
        
        total_gain_loss = total_current - total_invested
        total_gain_loss_pct = (total_gain_loss / total_invested) * 100 if total_invested > 0 else 0
        
        return {
            'total_invested': total_invested,
            'total_current_value': total_current,
            'total_gain_loss': total_gain_loss,
            'total_gain_loss_percentage': total_gain_loss_pct,
            'investments': investments
        }
    
    def generate_monthly_report(self, year: int, month: int) -> Dict:
        """Generiraj mesečno poročilo"""
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(days=1)
        
        transactions = self.get_transactions(start_date, end_date)
        
        income = sum(t.amount for t in transactions if t.type == TransactionType.INCOME)
        expenses = sum(t.amount for t in transactions if t.type == TransactionType.EXPENSE)
        investments = sum(t.amount for t in transactions if t.type == TransactionType.INVESTMENT)
        grants = sum(t.amount for t in transactions if t.type == TransactionType.GRANT)
        
        # Kategorije
        categories = {}
        for t in transactions:
            if t.category not in categories:
                categories[t.category] = 0
            categories[t.category] += t.amount
        
        return {
            'period': f"{year}-{month:02d}",
            'total_income': income + grants,
            'total_expenses': expenses,
            'total_investments': investments,
            'net_income': income + grants - expenses - investments,
            'categories': categories,
            'transaction_count': len(transactions),
            'budget_status': self.get_budget_status()
        }
    
    def get_financial_insights(self) -> List[str]:
        """Pridobi finančne vpoglede in priporočila"""
        insights = []
        
        # Analiza proračunov
        budgets = self.get_budget_status()
        for budget in budgets:
            if budget['status'] == 'over_budget':
                insights.append(f"⚠️ Prekoračili ste proračun za {budget['category']} za {abs(budget['remaining']):.2f} {budget['currency']}")
            elif budget['status'] == 'warning':
                insights.append(f"🟡 Blizu ste prekoračitve proračuna za {budget['category']} ({budget['percentage_used']:.1f}%)")
        
        # Analiza portfelja
        portfolio = self.get_portfolio_summary()
        if portfolio['total_gain_loss_percentage'] > 10:
            insights.append(f"📈 Odličen donos portfelja: +{portfolio['total_gain_loss_percentage']:.1f}%")
        elif portfolio['total_gain_loss_percentage'] < -10:
            insights.append(f"📉 Portfelj je v izgubi: {portfolio['total_gain_loss_percentage']:.1f}%")
        
        # Mesečna analiza
        current_date = datetime.now()
        monthly_report = self.generate_monthly_report(current_date.year, current_date.month)
        
        if monthly_report['net_income'] < 0:
            insights.append(f"💸 Ta mesec ste porabili več kot zaslužili: {monthly_report['net_income']:.2f}")
        else:
            insights.append(f"💰 Ta mesec ste prihranili: {monthly_report['net_income']:.2f}")
        
        return insights

# Test funkcije
if __name__ == "__main__":
    # Test finance modula
    finance = FinanceModule("test_finance.db")
    
    # Test transakcije
    transaction = Transaction(
        id="test_001",
        amount=1500.0,
        currency=Currency.EUR,
        type=TransactionType.INCOME,
        category="Plača",
        description="Mesečna plača",
        date=datetime.now(),
        tags=["work", "monthly"]
    )
    
    print("🧪 Testiranje Finance modula...")
    print(f"Dodajanje transakcije: {finance.add_transaction(transaction)}")
    
    # Test proračun
    print(f"Ustvarjanje proračuna: {finance.create_budget('Hrana', 400.0)}")
    
    # Test investicija
    investment = Investment(
        symbol="AAPL",
        name="Apple Inc.",
        amount_invested=1000.0,
        current_value=1150.0,
        currency=Currency.USD,
        purchase_date=datetime.now() - timedelta(days=30)
    )
    
    print(f"Dodajanje investicije: {finance.add_investment(investment)}")
    
    # Prikaz vpogledov
    insights = finance.get_financial_insights()
    print("\n💡 Finančni vpogledi:")
    for insight in insights:
        print(f"  {insight}")
    
    print("\n✅ Finance modul uspešno testiran!")