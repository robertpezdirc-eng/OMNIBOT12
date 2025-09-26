#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚚 OMNI Logistics Optimizer - Napredni modul za logistično optimizacijo
Nadzor zalog, dostav in optimizacija poti
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

# Zaloge in dostave 
inventory = { 
    "products": {}, 
    "deliveries": [] 
}

# Funkcija za dodajanje izdelkov 
def add_product(name, quantity): 
    if name not in inventory["products"]: 
        inventory["products"][name] = 0 
    inventory["products"][name] += quantity
    
    logger.info(f"📦 Dodano v zalogo: {name} (+{quantity}), skupaj: {inventory['products'][name]}")
    return {
        'status': 'success',
        'product': name,
        'added_quantity': quantity,
        'total_quantity': inventory['products'][name]
    }

# Funkcija za beleženje dostav 
def add_delivery(product, quantity, destination): 
    inventory["deliveries"].append({ 
        "time": datetime.utcnow().isoformat(), 
        "product": product, 
        "quantity": quantity, 
        "destination": destination,
        "status": "pending"
    }) 
    add_product(product, -quantity)
    
    logger.info(f"🚚 Dodana dostava: {product} ({quantity}) -> {destination}")
    return {
        'status': 'success',
        'delivery_id': len(inventory["deliveries"]) - 1,
        'product': product,
        'quantity': quantity,
        'destination': destination
    }

# Samoučeča optimizacija logistike 
def auto_optimize_logistics(): 
    while True: 
        try:
            # Preprost primer: če zaloge nizke, predlagaj naročilo 
            for product, qty in inventory["products"].items(): 
                if qty < 10: 
                    logger.warning(f"⚠️ Nizka zaloga za {product}! Priporoči naročilo. Trenutno: {qty}")
                elif qty < 5:
                    logger.error(f"🚨 Kritično nizka zaloga za {product}! Nujno naročilo potrebno: {qty}")
            
            # Preveri stanje dostav
            pending_deliveries = [d for d in inventory["deliveries"] if d.get("status") == "pending"]
            if len(pending_deliveries) > 10:
                logger.warning(f"⚠️ Veliko čakajočih dostav: {len(pending_deliveries)}")
            
            # Analiziraj trende porabe
            if len(inventory["deliveries"]) >= 5:
                recent_deliveries = inventory["deliveries"][-5:]
                products_delivered = {}
                for delivery in recent_deliveries:
                    product = delivery["product"]
                    if product not in products_delivered:
                        products_delivered[product] = 0
                    products_delivered[product] += delivery["quantity"]
                
                # Najdi najbolj povpraševane izdelke
                if products_delivered:
                    most_demanded = max(products_delivered, key=products_delivered.get)
                    logger.info(f"📈 Najbolj povpraševan izdelek: {most_demanded} ({products_delivered[most_demanded]} enot)")
            
            # Optimizacija poti (simulacija)
            if pending_deliveries:
                destinations = list(set(d["destination"] for d in pending_deliveries))
                if len(destinations) > 1:
                    logger.info(f"🗺️ Optimizacija poti za {len(destinations)} destinacij")
            
            time.sleep(300)  # 5 minut
            
        except Exception as e:
            logger.error(f"❌ Napaka pri logistični optimizaciji: {e}")
            time.sleep(60)

def start_logistics_optimizer(): 
    t = threading.Thread(target=auto_optimize_logistics) 
    t.daemon = True 
    t.start() 
    logger.info("🚚 Logistics optimizer zagnan ✅")
    return "🚚 Logistika modul zagnan ✅"

# Funkcija za globalni optimizer 
def auto_optimize(): 
    start_logistics_optimizer() 
    return "Logistika optimizacija v teku"

# Dodatne funkcije za napredne analize
def get_inventory_status():
    """Pridobi status zalog"""
    status = {
        "total_products": len(inventory["products"]),
        "products": inventory["products"].copy(),
        "low_stock_products": [],
        "critical_stock_products": [],
        "total_deliveries": len(inventory["deliveries"]),
        "pending_deliveries": 0,
        "completed_deliveries": 0
    }
    
    # Analiziraj zaloge
    for product, qty in inventory["products"].items():
        if qty < 5:
            status["critical_stock_products"].append({"product": product, "quantity": qty})
        elif qty < 10:
            status["low_stock_products"].append({"product": product, "quantity": qty})
    
    # Analiziraj dostave
    for delivery in inventory["deliveries"]:
        if delivery.get("status") == "pending":
            status["pending_deliveries"] += 1
        else:
            status["completed_deliveries"] += 1
    
    return status

def get_delivery_history(limit=10):
    """Pridobi zgodovino dostav"""
    return inventory["deliveries"][-limit:] if inventory["deliveries"] else []

def update_delivery_status(delivery_id, new_status):
    """Posodobi status dostave"""
    if 0 <= delivery_id < len(inventory["deliveries"]):
        old_status = inventory["deliveries"][delivery_id].get("status", "pending")
        inventory["deliveries"][delivery_id]["status"] = new_status
        inventory["deliveries"][delivery_id]["status_updated"] = datetime.utcnow().isoformat()
        
        logger.info(f"📋 Posodobljen status dostave #{delivery_id}: {old_status} -> {new_status}")
        return {
            'status': 'success',
            'delivery_id': delivery_id,
            'old_status': old_status,
            'new_status': new_status
        }
    else:
        return {'status': 'error', 'message': 'Dostava ne obstaja'}

def calculate_logistics_stats():
    """Izračunaj logistične statistike"""
    if not inventory["deliveries"]:
        return {"total_delivered": 0, "average_delivery_size": 0, "most_popular_destination": None}
    
    # Zadnji mesec
    one_month_ago = datetime.now() - timedelta(days=30)
    recent_deliveries = [
        d for d in inventory["deliveries"] 
        if datetime.fromisoformat(d["time"]) > one_month_ago
    ]
    
    total_delivered = sum(d["quantity"] for d in recent_deliveries)
    avg_delivery_size = total_delivered / len(recent_deliveries) if recent_deliveries else 0
    
    # Najpriljubljenejša destinacija
    destinations = {}
    for delivery in recent_deliveries:
        dest = delivery["destination"]
        if dest not in destinations:
            destinations[dest] = 0
        destinations[dest] += delivery["quantity"]
    
    most_popular_dest = max(destinations, key=destinations.get) if destinations else None
    
    return {
        "period": "Zadnji mesec",
        "total_delivered": total_delivered,
        "average_delivery_size": avg_delivery_size,
        "delivery_count": len(recent_deliveries),
        "most_popular_destination": most_popular_dest,
        "destinations_served": len(destinations)
    }

def optimize_delivery_routes(deliveries_list=None):
    """Optimiziraj dostave poti (simulacija)"""
    if deliveries_list is None:
        deliveries_list = [d for d in inventory["deliveries"] if d.get("status") == "pending"]
    
    if not deliveries_list:
        return {"message": "Ni dostav za optimizacijo", "optimized_routes": []}
    
    # Grupiranje po destinacijah
    destinations = {}
    for delivery in deliveries_list:
        dest = delivery["destination"]
        if dest not in destinations:
            destinations[dest] = []
        destinations[dest].append(delivery)
    
    # Simulacija optimiziranih poti
    optimized_routes = []
    route_id = 1
    
    for destination, dest_deliveries in destinations.items():
        total_quantity = sum(d["quantity"] for d in dest_deliveries)
        products = list(set(d["product"] for d in dest_deliveries))
        
        optimized_routes.append({
            "route_id": route_id,
            "destination": destination,
            "total_quantity": total_quantity,
            "products": products,
            "delivery_count": len(dest_deliveries),
            "estimated_time": len(dest_deliveries) * 15,  # 15 min na dostavo
            "priority": "high" if total_quantity > 50 else "normal"
        })
        route_id += 1
    
    # Sortiraj po prioriteti in količini
    optimized_routes.sort(key=lambda x: (x["priority"] == "high", x["total_quantity"]), reverse=True)
    
    logger.info(f"🗺️ Optimizirane poti za {len(optimized_routes)} destinacij")
    return {
        "message": f"Optimizirane poti za {len(optimized_routes)} destinacij",
        "optimized_routes": optimized_routes,
        "total_deliveries": len(deliveries_list),
        "estimated_total_time": sum(r["estimated_time"] for r in optimized_routes)
    }

def generate_restock_recommendations():
    """Generiraj priporočila za dopolnitev zalog"""
    recommendations = []
    
    for product, qty in inventory["products"].items():
        if qty < 5:
            recommended_order = 50  # Osnovno naročilo
            recommendations.append({
                "product": product,
                "current_stock": qty,
                "recommended_order": recommended_order,
                "priority": "critical",
                "reason": "Kritično nizka zaloga"
            })
        elif qty < 10:
            recommended_order = 25
            recommendations.append({
                "product": product,
                "current_stock": qty,
                "recommended_order": recommended_order,
                "priority": "high",
                "reason": "Nizka zaloga"
            })
    
    # Analiziraj trende porabe za dodatna priporočila
    if len(inventory["deliveries"]) >= 10:
        recent_deliveries = inventory["deliveries"][-10:]
        product_demand = {}
        
        for delivery in recent_deliveries:
            product = delivery["product"]
            if product not in product_demand:
                product_demand[product] = 0
            product_demand[product] += delivery["quantity"]
        
        # Priporoči dodatne zaloge za visoko povpraševane izdelke
        for product, demand in product_demand.items():
            if demand > 20 and inventory["products"].get(product, 0) < 30:
                recommendations.append({
                    "product": product,
                    "current_stock": inventory["products"].get(product, 0),
                    "recommended_order": demand,
                    "priority": "medium",
                    "reason": f"Visoko povpraševanje ({demand} enot v zadnjih 10 dostav)"
                })
    
    return recommendations

def export_logistics_data():
    """Izvozi logistične podatke"""
    data = {
        "inventory": inventory,
        "inventory_status": get_inventory_status(),
        "logistics_stats": calculate_logistics_stats(),
        "restock_recommendations": generate_restock_recommendations(),
        "route_optimization": optimize_delivery_routes(),
        "export_time": datetime.utcnow().isoformat()
    }
    
    # Shrani v datoteko
    os.makedirs("omni/data", exist_ok=True)
    with open("omni/data/logistics_export.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    logger.info("📁 Logistični podatki izvoženi v logistics_export.json")
    return data

def get_module_status():
    """Pridobi status modula"""
    return {
        'module': 'logistics_optimizer',
        'status': 'active',
        'total_products': len(inventory["products"]),
        'total_deliveries': len(inventory["deliveries"]),
        'low_stock_count': len([p for p, q in inventory["products"].items() if q < 10]),
        'last_update': datetime.utcnow().isoformat()
    }

# Testne funkcije
def test_logistics_module():
    """Testiraj logistics modul z realnimi podatki"""
    logger.info("🧪 Testiranje logistics modula...")
    
    # Dodaj testne izdelke
    add_product("Laptop", 25)
    add_product("Miška", 50)
    add_product("Tipkovnica", 30)
    add_product("Monitor", 15)
    add_product("Slušalke", 8)  # Nizka zaloga
    add_product("Kabel USB", 3)  # Kritična zaloga
    
    # Dodaj testne dostave
    add_delivery("Laptop", 5, "Ljubljana")
    add_delivery("Miška", 10, "Maribor")
    add_delivery("Tipkovnica", 8, "Celje")
    add_delivery("Monitor", 3, "Ljubljana")
    add_delivery("Slušalke", 2, "Koper")
    add_delivery("Laptop", 3, "Kranj")
    add_delivery("Miška", 15, "Ljubljana")
    
    # Posodobi status nekaterih dostav
    update_delivery_status(0, "completed")
    update_delivery_status(1, "in_transit")
    update_delivery_status(2, "completed")
    
    # Prikaži status zalog
    status = get_inventory_status()
    logger.info(f"📦 Status zalog: {json.dumps(status, indent=2, ensure_ascii=False)}")
    
    # Prikaži statistike
    stats = calculate_logistics_stats()
    logger.info(f"📊 Logistične statistike: {json.dumps(stats, indent=2, ensure_ascii=False)}")
    
    # Prikaži priporočila za dopolnitev
    recommendations = generate_restock_recommendations()
    logger.info(f"💡 Priporočila za dopolnitev: {json.dumps(recommendations, indent=2, ensure_ascii=False)}")
    
    # Optimiziraj poti
    route_optimization = optimize_delivery_routes()
    logger.info(f"🗺️ Optimizacija poti: {json.dumps(route_optimization, indent=2, ensure_ascii=False)}")
    
    # Izvozi podatke
    export_data = export_logistics_data()
    
    return "✅ Logistics modul testiran uspešno"

if __name__ == "__main__":
    # Testiraj modul
    test_result = test_logistics_module()
    print(test_result)
    
    # Zaženi optimizer
    start_result = start_logistics_optimizer()
    print(start_result)
    
    # Počakaj malo za demonstracijo
    time.sleep(2)
    print("\n📦 Trenutno stanje zalog:")
    print(json.dumps(get_inventory_status(), indent=2, ensure_ascii=False))