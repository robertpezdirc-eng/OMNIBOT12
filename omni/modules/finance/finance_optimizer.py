#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
💰 OMNI Finance Optimizer - Napredni modul za finančno optimizacijo
Spremlja denarne tokove, transakcije in avtomatsko optimizira finance
"""

import threading
import time
import sqlite3
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Primer začetnih podatkov 
accounts = { 
    "income": 0.0, 
    "expenses": 0.0, 
    "balance": 0.0 
} 

transactions = []

# Funkcija za dodajanje transakcij 
def add_transaction(amount, type_, description=""): 
    transactions.append({ 
        "time": datetime.utcnow().isoformat(), 
        "type": type_, 
        "amount": amount, 
        "description": description 
    }) 
    if type_ == "income": 
        accounts["income"] += amount 
    elif type_ == "expense": 
        accounts["expenses"] += amount 
    accounts["balance"] = accounts["income"] - accounts["expenses"]
    
    logger.info(f"💳 Dodana transakcija: {type_} {amount}€ - {description}")
    return {
        'status': 'success',
        'new_balance': accounts['balance'],
        'transaction': transactions[-1]
    }

# Samoučeča optimizacija financ 
def auto_optimize_finances(): 
    while True: 
        try:
            # Preprost primer: če so stroški previsoki, predlagaj znižanje 
            if accounts["expenses"] > accounts["income"] * 0.8: 
                logger.warning(f"⚠️ Previsoki stroški! Razmisli o zmanjšanju odhodkov.")
                logger.info(f"📊 Trenutno stanje: Prihodki {accounts['income']}€, Odhodki {accounts['expenses']}€")
            
            # Preveri nizko stanje
            if accounts["balance"] < 100:
                logger.warning(f"⚠️ Nizko stanje računa: {accounts['balance']}€")
            
            # Predlagaj prihranke
            if accounts["income"] > 0 and accounts["expenses"] / accounts["income"] < 0.7:
                suggested_savings = accounts["income"] * 0.1
                logger.info(f"💡 Priložnost za prihranke: {suggested_savings:.2f}€")
            
            # Analiza trendov
            if len(transactions) >= 5:
                recent_expenses = [t["amount"] for t in transactions[-5:] if t["type"] == "expense"]
                if recent_expenses:
                    avg_expense = sum(recent_expenses) / len(recent_expenses)
                    logger.info(f"📈 Povprečni odhodek zadnjih 5 transakcij: {avg_expense:.2f}€")
            
            time.sleep(300)  # 5 minut
            
        except Exception as e:
            logger.error(f"❌ Napaka pri optimizaciji: {e}")
            time.sleep(60)

def start_finance_optimizer(): 
    t = threading.Thread(target=auto_optimize_finances) 
    t.daemon = True 
    t.start() 
    logger.info("💰 Finance optimizer zagnan ✅")
    return "💰 Finance modul zagnan ✅"

# Funkcija za globalni optimizer 
def auto_optimize(): 
    # Ta funkcija bo klicana iz globalnega optimizatorja 
    start_finance_optimizer() 
    return "Finance optimizacija v teku"

# Dodatne funkcije za napredne analize
def get_financial_summary():
    """Pridobi povzetek finančnega stanja"""
    summary = {
        "accounts": accounts.copy(),
        "total_transactions": len(transactions),
        "last_transaction": transactions[-1] if transactions else None,
        "cash_flow_ratio": accounts["expenses"] / accounts["income"] if accounts["income"] > 0 else 0,
        "recommendations": []
    }
    
    # Generiraj priporočila
    if accounts["expenses"] > accounts["income"] * 0.8:
        summary["recommendations"].append("Zmanjšaj odhodke")
    if accounts["balance"] < accounts["income"] * 0.1:
        summary["recommendations"].append("Povečaj rezervni sklad")
    if accounts["income"] > accounts["expenses"] * 1.5:
        summary["recommendations"].append("Razmisli o naložbah")
    
    return summary

def get_transaction_history(limit=10):
    """Pridobi zgodovino transakcij"""
    return transactions[-limit:] if transactions else []

def calculate_monthly_stats():
    """Izračunaj mesečne statistike"""
    if not transactions:
        return {"monthly_income": 0, "monthly_expenses": 0, "monthly_balance": 0}
    
    # Zadnji mesec
    one_month_ago = datetime.now() - timedelta(days=30)
    recent_transactions = [
        t for t in transactions 
        if datetime.fromisoformat(t["time"]) > one_month_ago
    ]
    
    monthly_income = sum(t["amount"] for t in recent_transactions if t["type"] == "income")
    monthly_expenses = sum(t["amount"] for t in recent_transactions if t["type"] == "expense")
    
    return {
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "monthly_balance": monthly_income - monthly_expenses,
        "transaction_count": len(recent_transactions)
    }

def export_financial_data():
    """Izvozi finančne podatke"""
    data = {
        "accounts": accounts,
        "transactions": transactions,
        "summary": get_financial_summary(),
        "monthly_stats": calculate_monthly_stats(),
        "export_time": datetime.utcnow().isoformat()
    }
    
    # Shrani v datoteko
    os.makedirs("omni/data", exist_ok=True)
    with open("omni/data/finance_export.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    logger.info("📁 Finančni podatki izvoženi v finance_export.json")
    return data

def get_module_status():
    """Pridobi status modula"""
    return {
        'module': 'finance_optimizer',
        'status': 'active',
        'accounts': accounts,
        'total_transactions': len(transactions),
        'last_update': datetime.utcnow().isoformat()
    }

# Testne funkcije
def test_finance_module():
    """Testiraj finance modul z realnimi podatki"""
    logger.info("🧪 Testiranje finance modula...")
    
    # Dodaj testne transakcije
    add_transaction(2500, "income", "Mesečna plača")
    add_transaction(800, "expense", "Najemnina")
    add_transaction(200, "expense", "Hrana")
    add_transaction(150, "expense", "Transport")
    add_transaction(100, "expense", "Komunalne storitve")
    add_transaction(1000, "income", "Freelance projekt")
    
    # Prikaži povzetek
    summary = get_financial_summary()
    logger.info(f"📊 Finančni povzetek: {json.dumps(summary, indent=2, ensure_ascii=False)}")
    
    # Prikaži mesečne statistike
    monthly = calculate_monthly_stats()
    logger.info(f"📅 Mesečne statistike: {json.dumps(monthly, indent=2, ensure_ascii=False)}")
    
    # Izvozi podatke
    export_data = export_financial_data()
    
    return "✅ Finance modul testiran uspešno"

if __name__ == "__main__":
    # Testiraj modul
    test_result = test_finance_module()
    print(test_result)
    
    # Zaženi optimizer
    start_result = start_finance_optimizer()
    print(start_result)
    
    # Počakaj malo za demonstracijo
    time.sleep(2)
    print("\n📊 Trenutno stanje:")
    print(json.dumps(get_financial_summary(), indent=2, ensure_ascii=False))