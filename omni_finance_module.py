#!/usr/bin/env python3
"""
OmniCore Finance Module
ERP integracija in finančni podatki
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from decimal import Decimal
import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import pandas as pd

# Konfiguracija logging-a
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omni_finance")

@dataclass
class Invoice:
    id: str
    customer_id: str
    amount: Decimal
    currency: str
    due_date: datetime
    status: str
    created_date: datetime
    description: str = ""

@dataclass
class Transaction:
    id: str
    account_id: str
    amount: Decimal
    currency: str
    transaction_type: str  # debit/credit
    date: datetime
    description: str
    category: str = ""

@dataclass
class FinancialSummary:
    total_revenue: Decimal
    total_expenses: Decimal
    net_profit: Decimal
    outstanding_invoices: Decimal
    cash_flow: Decimal
    period: str

class FinanceModule:
    """Finance modul za OmniCore sistem"""
    
    def __init__(self):
        self.name = "finance"
        self.module_type = "finance"
        self.is_active = True
        self.last_health_check = datetime.now()
        
        # Database konfiguracija
        self.db_config = {
            "host": os.getenv("FINANCE_DB_HOST", "localhost"),
            "database": os.getenv("FINANCE_DB_NAME", "omni_finance"),
            "user": os.getenv("FINANCE_DB_USER", "postgres"),
            "password": os.getenv("FINANCE_DB_PASSWORD", "password"),
            "port": os.getenv("FINANCE_DB_PORT", "5432")
        }
        
        # Inicializiraj bazo
        self._init_database()
        
        # Generiraj demo podatke
        self._generate_demo_data()
        
        logger.info("💰 Finance Module inicializiran")
    
    def _init_database(self):
        """Inicializiraj finance bazo podatkov"""
        try:
            # Ustvari tabele če ne obstajajo
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor()
            
            # Tabela za račune
            cur.execute("""
                CREATE TABLE IF NOT EXISTS invoices (
                    id VARCHAR(50) PRIMARY KEY,
                    customer_id VARCHAR(50) NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) DEFAULT 'EUR',
                    due_date DATE NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    description TEXT
                );
            """)
            
            # Tabela za transakcije
            cur.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id VARCHAR(50) PRIMARY KEY,
                    account_id VARCHAR(50) NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) DEFAULT 'EUR',
                    transaction_type VARCHAR(10) NOT NULL,
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    description TEXT,
                    category VARCHAR(50)
                );
            """)
            
            # Tabela za račune/accounts
            cur.execute("""
                CREATE TABLE IF NOT EXISTS accounts (
                    id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    account_type VARCHAR(20) NOT NULL,
                    balance DECIMAL(15,2) DEFAULT 0,
                    currency VARCHAR(3) DEFAULT 'EUR',
                    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            conn.commit()
            cur.close()
            conn.close()
            
            logger.info("✅ Finance baza inicializirana")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji baze: {str(e)}")
            # Fallback - uporabi in-memory podatke
            self._use_fallback_data()
    
    def _generate_demo_data(self):
        """Generiraj demo finančne podatke"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor()
            
            # Preveri če že imamo podatke
            cur.execute("SELECT COUNT(*) FROM invoices")
            invoice_count = cur.fetchone()[0]
            
            if invoice_count == 0:
                # Generiraj demo račune
                demo_invoices = [
                    ("INV-2024-001", "CUST-001", 15000.00, "EUR", "2024-02-15", "paid", "Spletna trgovina - januar"),
                    ("INV-2024-002", "CUST-002", 8500.50, "EUR", "2024-02-20", "pending", "Consulting storitve"),
                    ("INV-2024-003", "CUST-003", 22000.00, "EUR", "2024-02-25", "overdue", "Software licenca"),
                    ("INV-2024-004", "CUST-001", 12300.75, "EUR", "2024-03-01", "pending", "Mesečna naročnina"),
                    ("INV-2024-005", "CUST-004", 5600.00, "EUR", "2024-03-05", "paid", "Dodatne storitve")
                ]
                
                for invoice in demo_invoices:
                    cur.execute("""
                        INSERT INTO invoices (id, customer_id, amount, currency, due_date, status, description)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, invoice)
                
                # Generiraj demo transakcije
                demo_transactions = [
                    ("TXN-001", "ACC-MAIN", 15000.00, "EUR", "credit", "Plačilo INV-2024-001", "revenue"),
                    ("TXN-002", "ACC-MAIN", -3500.00, "EUR", "debit", "Pisarniški material", "expenses"),
                    ("TXN-003", "ACC-MAIN", -8200.00, "EUR", "debit", "Plače zaposlenih", "payroll"),
                    ("TXN-004", "ACC-MAIN", 5600.00, "EUR", "credit", "Plačilo INV-2024-005", "revenue"),
                    ("TXN-005", "ACC-MAIN", -1200.00, "EUR", "debit", "Marketing kampanja", "marketing")
                ]
                
                for txn in demo_transactions:
                    cur.execute("""
                        INSERT INTO transactions (id, account_id, amount, currency, transaction_type, description, category)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, txn)
                
                # Generiraj demo račune
                demo_accounts = [
                    ("ACC-MAIN", "Glavni poslovni račun", "checking", 45000.00, "EUR"),
                    ("ACC-SAVINGS", "Rezervni sklad", "savings", 120000.00, "EUR"),
                    ("ACC-PETTY", "Drobni stroški", "petty_cash", 500.00, "EUR")
                ]
                
                for account in demo_accounts:
                    cur.execute("""
                        INSERT INTO accounts (id, name, account_type, balance, currency)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, account)
                
                conn.commit()
                logger.info("✅ Demo finančni podatki generirani")
            
            cur.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri generiranju demo podatkov: {str(e)}")
    
    def _use_fallback_data(self):
        """Uporabi in-memory podatke kot fallback"""
        self.fallback_invoices = [
            {
                "id": "INV-2024-001",
                "customer_id": "CUST-001",
                "amount": 15000.00,
                "currency": "EUR",
                "due_date": "2024-02-15",
                "status": "paid",
                "description": "Spletna trgovina - januar"
            }
        ]
        
        self.fallback_transactions = [
            {
                "id": "TXN-001",
                "account_id": "ACC-MAIN",
                "amount": 15000.00,
                "currency": "EUR",
                "transaction_type": "credit",
                "description": "Plačilo INV-2024-001",
                "category": "revenue"
            }
        ]
        
        logger.info("⚠️ Uporabljam fallback podatke")
    
    async def handle_request(self, request) -> Dict[str, Any]:
        """Obdelaj finančno zahtevo"""
        query = request.query.lower()
        
        try:
            # Analiza zahteve
            if any(word in query for word in ['dolgovi', 'neporavnani', 'outstanding', 'due']):
                return await self.get_outstanding_invoices()
            
            elif any(word in query for word in ['prihodki', 'revenue', 'income']):
                return await self.get_revenue_summary()
            
            elif any(word in query for word in ['stroški', 'expenses', 'costs']):
                return await self.get_expenses_summary()
            
            elif any(word in query for word in ['bilanca', 'balance', 'summary']):
                return await self.get_financial_summary()
            
            elif any(word in query for word in ['transakcije', 'transactions']):
                return await self.get_recent_transactions()
            
            elif any(word in query for word in ['računi', 'invoices']):
                return await self.get_invoices_summary()
            
            else:
                # Splošni finančni pregled
                return await self.get_financial_dashboard()
        
        except Exception as e:
            logger.error(f"❌ Napaka pri obdelavi zahteve: {str(e)}")
            return {
                "error": f"Napaka pri obdelavi finančne zahteve: {str(e)}",
                "status": "error"
            }
    
    async def get_outstanding_invoices(self) -> Dict[str, Any]:
        """Vrni neporavnane račune"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            cur.execute("""
                SELECT * FROM invoices 
                WHERE status IN ('pending', 'overdue')
                ORDER BY due_date ASC
            """)
            
            invoices = cur.fetchall()
            
            # Izračunaj skupni znesek
            total_outstanding = sum(float(inv['amount']) for inv in invoices)
            
            cur.close()
            conn.close()
            
            return {
                "outstanding_invoices": [dict(inv) for inv in invoices],
                "total_outstanding": total_outstanding,
                "currency": "EUR",
                "count": len(invoices),
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju dolgov: {str(e)}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    async def get_revenue_summary(self) -> Dict[str, Any]:
        """Vrni povzetek prihodkov"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Prihodki zadnjih 30 dni
            cur.execute("""
                SELECT 
                    SUM(amount) as total_revenue,
                    COUNT(*) as transaction_count
                FROM transactions 
                WHERE transaction_type = 'credit' 
                AND date >= CURRENT_DATE - INTERVAL '30 days'
            """)
            
            result = cur.fetchone()
            
            # Prihodki po kategorijah
            cur.execute("""
                SELECT 
                    category,
                    SUM(amount) as amount,
                    COUNT(*) as count
                FROM transactions 
                WHERE transaction_type = 'credit' 
                AND date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY category
                ORDER BY amount DESC
            """)
            
            categories = cur.fetchall()
            
            cur.close()
            conn.close()
            
            return {
                "total_revenue": float(result['total_revenue'] or 0),
                "transaction_count": result['transaction_count'],
                "period": "Zadnjih 30 dni",
                "categories": [dict(cat) for cat in categories],
                "currency": "EUR",
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju prihodkov: {str(e)}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    async def get_expenses_summary(self) -> Dict[str, Any]:
        """Vrni povzetek stroškov"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Stroški zadnjih 30 dni
            cur.execute("""
                SELECT 
                    SUM(ABS(amount)) as total_expenses,
                    COUNT(*) as transaction_count
                FROM transactions 
                WHERE transaction_type = 'debit' 
                AND date >= CURRENT_DATE - INTERVAL '30 days'
            """)
            
            result = cur.fetchone()
            
            # Stroški po kategorijah
            cur.execute("""
                SELECT 
                    category,
                    SUM(ABS(amount)) as amount,
                    COUNT(*) as count
                FROM transactions 
                WHERE transaction_type = 'debit' 
                AND date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY category
                ORDER BY amount DESC
            """)
            
            categories = cur.fetchall()
            
            cur.close()
            conn.close()
            
            return {
                "total_expenses": float(result['total_expenses'] or 0),
                "transaction_count": result['transaction_count'],
                "period": "Zadnjih 30 dni",
                "categories": [dict(cat) for cat in categories],
                "currency": "EUR",
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju stroškov: {str(e)}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    async def get_financial_summary(self) -> Dict[str, Any]:
        """Vrni celotni finančni povzetek"""
        try:
            revenue_data = await self.get_revenue_summary()
            expenses_data = await self.get_expenses_summary()
            outstanding_data = await self.get_outstanding_invoices()
            
            total_revenue = revenue_data.get('total_revenue', 0)
            total_expenses = expenses_data.get('total_expenses', 0)
            net_profit = total_revenue - total_expenses
            
            return {
                "financial_summary": {
                    "total_revenue": total_revenue,
                    "total_expenses": total_expenses,
                    "net_profit": net_profit,
                    "outstanding_invoices": outstanding_data.get('total_outstanding', 0),
                    "profit_margin": (net_profit / max(total_revenue, 1)) * 100,
                    "period": "Zadnjih 30 dni"
                },
                "revenue_breakdown": revenue_data.get('categories', []),
                "expense_breakdown": expenses_data.get('categories', []),
                "currency": "EUR",
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri finančnem povzetku: {str(e)}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    async def get_recent_transactions(self, limit: int = 20) -> Dict[str, Any]:
        """Vrni zadnje transakcije"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            cur.execute("""
                SELECT * FROM transactions 
                ORDER BY date DESC 
                LIMIT %s
            """, (limit,))
            
            transactions = cur.fetchall()
            
            cur.close()
            conn.close()
            
            return {
                "transactions": [dict(txn) for txn in transactions],
                "count": len(transactions),
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju transakcij: {str(e)}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    async def get_invoices_summary(self) -> Dict[str, Any]:
        """Vrni povzetek računov"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Povzetek po statusu
            cur.execute("""
                SELECT 
                    status,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM invoices 
                GROUP BY status
                ORDER BY total_amount DESC
            """)
            
            status_summary = cur.fetchall()
            
            # Zadnji računi
            cur.execute("""
                SELECT * FROM invoices 
                ORDER BY created_date DESC 
                LIMIT 10
            """)
            
            recent_invoices = cur.fetchall()
            
            cur.close()
            conn.close()
            
            return {
                "status_summary": [dict(status) for status in status_summary],
                "recent_invoices": [dict(inv) for inv in recent_invoices],
                "currency": "EUR",
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri povzetku računov: {str(e)}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    async def get_financial_dashboard(self) -> Dict[str, Any]:
        """Vrni celotni finančni dashboard"""
        try:
            summary = await self.get_financial_summary()
            transactions = await self.get_recent_transactions(10)
            outstanding = await self.get_outstanding_invoices()
            
            return {
                "dashboard": {
                    "summary": summary.get('financial_summary', {}),
                    "recent_transactions": transactions.get('transactions', []),
                    "outstanding_invoices": outstanding.get('outstanding_invoices', []),
                    "alerts": self._generate_financial_alerts(summary, outstanding)
                },
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri dashboard: {str(e)}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def _generate_financial_alerts(self, summary: Dict, outstanding: Dict) -> List[Dict]:
        """Generiraj finančna opozorila"""
        alerts = []
        
        # Preveri negativni profit
        financial_summary = summary.get('financial_summary', {})
        net_profit = financial_summary.get('net_profit', 0)
        
        if net_profit < 0:
            alerts.append({
                "type": "warning",
                "message": f"Negativni profit: {net_profit:.2f} EUR",
                "priority": "high"
            })
        
        # Preveri neporavnane račune
        total_outstanding = outstanding.get('total_outstanding', 0)
        if total_outstanding > 20000:
            alerts.append({
                "type": "alert",
                "message": f"Visoki neporavnani računi: {total_outstanding:.2f} EUR",
                "priority": "medium"
            })
        
        # Preveri profit margin
        profit_margin = financial_summary.get('profit_margin', 0)
        if profit_margin < 10:
            alerts.append({
                "type": "info",
                "message": f"Nizka profitna marža: {profit_margin:.1f}%",
                "priority": "low"
            })
        
        return alerts
    
    async def health_check(self) -> bool:
        """Preveri zdravje Finance modula"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
            conn.close()
            
            self.last_health_check = datetime.now()
            self.is_active = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Finance health check failed: {str(e)}")
            self.is_active = False
            return False

# FastAPI aplikacija
app = FastAPI(
    title="OmniCore Finance Module",
    description="Finančni modul z ERP integracijo",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globalni Finance modul
finance_module = FinanceModule()

@app.get("/")
async def root():
    return {
        "service": "OmniCore Finance Module",
        "status": "active",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    is_healthy = await finance_module.health_check()
    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/dashboard")
async def get_dashboard():
    """Finančni dashboard"""
    return await finance_module.get_financial_dashboard()

@app.get("/summary")
async def get_summary():
    """Finančni povzetek"""
    return await finance_module.get_financial_summary()

@app.get("/invoices")
async def get_invoices():
    """Seznam računov"""
    return await finance_module.get_invoices_summary()

@app.get("/transactions")
async def get_transactions(limit: int = Query(20, ge=1, le=100)):
    """Seznam transakcij"""
    return await finance_module.get_recent_transactions(limit)

@app.get("/outstanding")
async def get_outstanding():
    """Neporavnani računi"""
    return await finance_module.get_outstanding_invoices()

@app.get("/revenue")
async def get_revenue():
    """Povzetek prihodkov"""
    return await finance_module.get_revenue_summary()

@app.get("/expenses")
async def get_expenses():
    """Povzetek stroškov"""
    return await finance_module.get_expenses_summary()

if __name__ == "__main__":
    print("💰 Zaganjam OmniCore Finance Module...")
    print("🏦 ERP integration: Active")
    print("📊 Real-time financial data: Enabled")
    print("💳 Finance dashboard: http://localhost:8301")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8301,
        reload=True
    )