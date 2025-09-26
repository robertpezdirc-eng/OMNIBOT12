#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test integracije Finance in Logistika modulov z OMNI sistemom
"""

import sys
import os
import time
import threading
from datetime import datetime

# Dodaj pot do OMNI modulov
sys.path.append(os.path.join(os.path.dirname(__file__), 'omni'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'omni', 'modules'))

# Uvozi OMNI sistem
from omnicore_global import OmniCore

# Uvozi module
from modules.finance.finance_optimizer import *
from modules.logistics.logistics_optimizer import *

def test_finance_module():
    """Test finance modula"""
    print("🧪 Testiram Finance modul...")
    
    # Test dodajanja transakcij
    add_transaction(1000.0, "income", "Plača")
    add_transaction(300.0, "expense", "Najemnina")
    add_transaction(150.0, "expense", "Hrana")
    
    print(f"💰 Stanje računov: {accounts}")
    print(f"📊 Transakcije: {len(transactions)}")
    
    # Test analize
    summary = get_financial_summary()
    print(f"📈 Finančni povzetek: {summary}")
    
    # Test optimizacije
    monthly_stats = calculate_monthly_stats()
    print(f"🎯 Mesečne statistike: {monthly_stats}")
    
    return True

def test_logistics_module():
    """Test logistika modula"""
    print("\n🧪 Testiram Logistika modul...")
    
    # Test dodajanja izdelkov
    add_product("Laptop", 50)
    add_product("Miška", 100)
    add_product("Tipkovnica", 75)
    
    print(f"📦 Zaloge: {inventory['products']}")
    
    # Test dostav
    add_delivery("Laptop", 5, "Ljubljana")
    add_delivery("Miška", 10, "Maribor")
    
    print(f"🚚 Dostave: {len(inventory['deliveries'])}")
    print(f"📦 Posodobljene zaloge: {inventory['products']}")
    
    # Test analize
    status = get_inventory_status()
    print(f"📊 Status zalog: {status}")
    
    # Test optimizacije
    history = get_delivery_history(5)
    print(f"🛣️ Zgodovina dostav: {len(history)} zapisov")
    
    return True

def test_omni_integration():
    """Test integracije z OMNI sistemom"""
    print("\n🧪 Testiram integracijo z OMNI sistemom...")
    
    try:
        # Inicializiraj OMNI Core
        omni = OmniCore()
        
        # Registriraj module
        finance_registered = omni.register_module("finance_optimizer", "omni/modules/finance/finance_optimizer.py")
        logistics_registered = omni.register_module("logistics_optimizer", "omni/modules/logistics/logistics_optimizer.py")
        
        print(f"✅ Finance modul registriran: {finance_registered}")
        print(f"✅ Logistika modul registriran: {logistics_registered}")
        
        # Preveri registrirane module
        print(f"📋 Registrirani moduli: {list(omni.modules.keys())}")
        
        # Test avtomatske optimizacije
        if 'finance_optimizer' in omni.modules:
            finance_module = omni.modules['finance_optimizer']
            if hasattr(finance_module, 'auto_optimize'):
                result = finance_module.auto_optimize()
                print(f"💰 Finance auto-optimizacija: {result}")
        
        if 'logistics_optimizer' in omni.modules:
            logistics_module = omni.modules['logistics_optimizer']
            if hasattr(logistics_module, 'auto_optimize'):
                result = logistics_module.auto_optimize()
                print(f"🚚 Logistika auto-optimizacija: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri integraciji: {e}")
        return False

def test_threading_functionality():
    """Test threading funkcionalnosti"""
    print("\n🧪 Testiram threading funkcionalnost...")
    
    try:
        # Zaženi finance optimizer
        finance_result = start_finance_optimizer()
        print(f"💰 {finance_result}")
        
        # Zaženi logistics optimizer
        logistics_result = start_logistics_optimizer()
        print(f"🚚 {logistics_result}")
        
        # Počakaj malo, da se threading zažene
        time.sleep(2)
        
        print("✅ Threading funkcionalnost deluje")
        return True
        
    except Exception as e:
        print(f"❌ Napaka pri threading testu: {e}")
        return False

def main():
    """Glavni test"""
    print("🚀 OMNI Finance & Logistics Integration Test")
    print("=" * 50)
    
    results = []
    
    # Test posameznih modulov
    results.append(("Finance Module", test_finance_module()))
    results.append(("Logistics Module", test_logistics_module()))
    results.append(("OMNI Integration", test_omni_integration()))
    results.append(("Threading Functionality", test_threading_functionality()))
    
    # Povzetek rezultatov
    print("\n" + "=" * 50)
    print("📊 POVZETEK TESTOV:")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Rezultat: {passed}/{total} testov uspešnih")
    
    if passed == total:
        print("🎉 Vsi testi so uspešno opravljeni!")
        print("💰 Finance modul je pripravljen za uporabo")
        print("🚚 Logistika modul je pripravljen za uporabo")
        print("🔗 Integracija z OMNI sistemom deluje")
    else:
        print("⚠️ Nekateri testi niso uspešni - preveri napake")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)