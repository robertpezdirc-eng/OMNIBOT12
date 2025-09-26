"""
OMNI Tourism Optimizer Module
Upravljanje destinacij, rezervacij, gostov in turistične analitike
"""

import threading
import time
from datetime import datetime, timedelta
import json
import random

# Globalne spremenljivke za shranjevanje podatkov
destinations = {}
bookings = []
guests = []
seasonal_data = {}
revenue_stats = {}

def add_destination(name, capacity, location, season_type="all_year"):
    """Dodaj novo destinacijo"""
    destinations[name] = {
        "capacity": capacity,
        "current_bookings": 0,
        "location": location,
        "season_type": season_type,
        "rating": 0.0,
        "reviews": [],
        "amenities": [],
        "price_per_night": 0,
        "status": "active"
    }
    print(f"🌴 Dodana destinacija: {name} (kapaciteta: {capacity})")
    return destinations[name]

def book_guest(destination_name, guest_name, check_in, check_out, guests_count=1):
    """Rezerviraj gosta na destinaciji"""
    if destination_name not in destinations:
        return {"error": "Destinacija ne obstaja"}
    
    dest = destinations[destination_name]
    
    # Preveri razpoložljivost
    if dest["current_bookings"] + guests_count > dest["capacity"]:
        return {"error": "Destinacija je polno zasedena"}
    
    booking = {
        "id": len(bookings) + 1,
        "destination": destination_name,
        "guest_name": guest_name,
        "check_in": check_in,
        "check_out": check_out,
        "guests_count": guests_count,
        "status": "confirmed",
        "booking_date": datetime.utcnow().isoformat(),
        "total_price": 0
    }
    
    # Izračunaj ceno
    check_in_date = datetime.fromisoformat(check_in)
    check_out_date = datetime.fromisoformat(check_out)
    nights = (check_out_date - check_in_date).days
    booking["total_price"] = nights * dest["price_per_night"] * guests_count
    
    bookings.append(booking)
    dest["current_bookings"] += guests_count
    
    print(f"✅ Rezervacija potrjena: {guest_name} v {destination_name}")
    return booking

def set_destination_pricing(destination_name, price_per_night):
    """Nastavi ceno za destinacijo"""
    if destination_name in destinations:
        destinations[destination_name]["price_per_night"] = price_per_night
        print(f"💰 Cena za {destination_name}: {price_per_night}€/noč")
        return True
    return False

def add_destination_review(destination_name, rating, comment):
    """Dodaj oceno destinaciji"""
    if destination_name in destinations:
        review = {
            "rating": rating,
            "comment": comment,
            "date": datetime.utcnow().isoformat()
        }
        destinations[destination_name]["reviews"].append(review)
        
        # Posodobi povprečno oceno
        reviews = destinations[destination_name]["reviews"]
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        destinations[destination_name]["rating"] = round(avg_rating, 1)
        
        print(f"⭐ Nova ocena za {destination_name}: {rating}/5")
        return True
    return False

def get_occupancy_rate(destination_name):
    """Pridobi stopnjo zasedenosti destinacije"""
    if destination_name in destinations:
        dest = destinations[destination_name]
        if dest["capacity"] > 0:
            return (dest["current_bookings"] / dest["capacity"]) * 100
    return 0

def get_revenue_statistics():
    """Pridobi statistike prihodkov"""
    total_revenue = sum(booking["total_price"] for booking in bookings)
    total_bookings = len(bookings)
    avg_booking_value = total_revenue / total_bookings if total_bookings > 0 else 0
    
    return {
        "total_revenue": total_revenue,
        "total_bookings": total_bookings,
        "average_booking_value": round(avg_booking_value, 2),
        "top_destinations": get_top_destinations()
    }

def get_top_destinations():
    """Pridobi najbolj priljubljene destinacije"""
    dest_bookings = {}
    for booking in bookings:
        dest = booking["destination"]
        if dest not in dest_bookings:
            dest_bookings[dest] = 0
        dest_bookings[dest] += 1
    
    # Sortiraj po številu rezervacij
    sorted_destinations = sorted(dest_bookings.items(), key=lambda x: x[1], reverse=True)
    return sorted_destinations[:5]  # Top 5

def check_seasonal_trends():
    """Analiziraj sezonske trende"""
    current_month = datetime.utcnow().month
    seasonal_tips = []
    
    if current_month in [6, 7, 8]:  # Poletje
        seasonal_tips.append("🌞 Poletna sezona - povečaj kapacitete na morskih destinacijah")
    elif current_month in [12, 1, 2]:  # Zima
        seasonal_tips.append("❄️ Zimska sezona - promovirati smučarske destinacije")
    elif current_month in [3, 4, 5]:  # Pomlad
        seasonal_tips.append("🌸 Pomladna sezona - idealno za mestni turizem")
    else:  # Jesen
        seasonal_tips.append("🍂 Jesenska sezona - wellness in spa destinacije")
    
    return seasonal_tips

def monitor_tourism():
    """Kontinuirano spremljanje turizma"""
    while True:
        try:
            print("🌴 TURISTIČNI PREGLED:")
            
            # Preveri zasedenost destinacij
            for dest_name, dest_info in destinations.items():
                occupancy = get_occupancy_rate(dest_name)
                if occupancy > 90:
                    print(f"⚠️ {dest_name} skoraj polno zaseden! ({occupancy:.1f}%)")
                elif occupancy > 70:
                    print(f"📈 {dest_name} dobro zaseden ({occupancy:.1f}%)")
                else:
                    print(f"📊 {dest_name}: {occupancy:.1f}% zasedenost")
            
            # Prikaži sezonske nasvete
            seasonal_tips = check_seasonal_trends()
            for tip in seasonal_tips:
                print(f"💡 {tip}")
            
            # Prikaži statistike prihodkov
            revenue_stats = get_revenue_statistics()
            print(f"💰 Skupni prihodki: {revenue_stats['total_revenue']}€")
            print(f"📋 Skupno rezervacij: {revenue_stats['total_bookings']}")
            
            # Prikaži top destinacije
            if revenue_stats['top_destinations']:
                print("🏆 TOP destinacije:")
                for dest, bookings_count in revenue_stats['top_destinations']:
                    print(f"   {dest}: {bookings_count} rezervacij")
            
        except Exception as e:
            print(f"❌ Napaka v turističnem spremljanju: {e}")
        
        time.sleep(300)  # Preveri vsakih 5 minut

def start_tourism_optimizer():
    """Zaženi turistični optimizer"""
    print("🌴 Zaganjam turistični optimizer...")
    
    # Dodaj nekaj testnih destinacij
    add_destination("Bled", 100, "Slovenija", "all_year")
    add_destination("Portorož", 150, "Slovenija", "summer")
    add_destination("Kranjska Gora", 80, "Slovenija", "winter")
    
    # Nastavi cene
    set_destination_pricing("Bled", 120)
    set_destination_pricing("Portorož", 180)
    set_destination_pricing("Kranjska Gora", 95)
    
    # Dodaj nekaj testnih rezervacij
    future_checkin = (datetime.utcnow() + timedelta(days=7)).isoformat()
    future_checkout = (datetime.utcnow() + timedelta(days=10)).isoformat()
    
    book_guest("Bled", "Ana Novak", future_checkin, future_checkout, 2)
    book_guest("Portorož", "Marko Kovač", future_checkin, future_checkout, 4)
    
    # Dodaj ocene
    add_destination_review("Bled", 5, "Čudovita lokacija!")
    add_destination_review("Portorož", 4, "Odličen morski oddih")
    
    # Zaženi monitoring thread
    t = threading.Thread(target=monitor_tourism)
    t.daemon = True
    t.start()
    
    return "🌴 Turizem modul zagnan ✅"

def auto_optimize():
    """Avtomatska optimizacija turističnega sistema"""
    result = start_tourism_optimizer()
    print("🔄 Turistična optimizacija v teku...")
    return "Turizem optimizacija v teku"

def get_tourism_statistics():
    """Pridobi turistične statistike"""
    return {
        "destinations": len(destinations),
        "total_bookings": len(bookings),
        "revenue": get_revenue_statistics(),
        "occupancy_rates": {name: get_occupancy_rate(name) for name in destinations.keys()},
        "last_update": datetime.utcnow().isoformat()
    }

# Funkcije za integracijo z OMNI sistemom
def get_module_status():
    """Status modula za OMNI dashboard"""
    total_capacity = sum(dest["capacity"] for dest in destinations.values())
    total_occupied = sum(dest["current_bookings"] for dest in destinations.values())
    avg_occupancy = (total_occupied / total_capacity * 100) if total_capacity > 0 else 0
    
    return {
        "name": "Tourism Optimizer",
        "status": "running",
        "destinations": len(destinations),
        "bookings": len(bookings),
        "occupancy": f"{avg_occupancy:.1f}%",
        "revenue": sum(booking["total_price"] for booking in bookings),
        "last_check": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    print("🌴 Testiranje Tourism Optimizer modula...")
    start_tourism_optimizer()
    time.sleep(5)
    print("✅ Testiranje končano")