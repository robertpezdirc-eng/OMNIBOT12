"""
ULTIMATE Tourism/Hospitality Integrations Module
Napredne integracije za e-commerce, VIP dogodke, poroke, konference in IoT senzorje
"""

import sqlite3
import json
import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
import aiohttp
import logging
from decimal import Decimal
import uuid

# Konfiguracija logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EventType(Enum):
    WEDDING = "wedding"
    CONFERENCE = "conference"
    VIP_DINNER = "vip_dinner"
    CORPORATE = "corporate"
    BIRTHDAY = "birthday"
    ANNIVERSARY = "anniversary"

class PaymentStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"

class IoTSensorType(Enum):
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    AIR_QUALITY = "air_quality"
    ENERGY = "energy"
    OCCUPANCY = "occupancy"
    NOISE_LEVEL = "noise_level"

@dataclass
class ECommerceTransaction:
    transaction_id: str
    customer_id: str
    items: List[Dict]
    total_amount: Decimal
    payment_status: PaymentStatus
    payment_method: str
    timestamp: datetime.datetime
    discount_applied: Optional[Decimal] = None
    loyalty_points_earned: int = 0
    
@dataclass
class VIPEvent:
    event_id: str
    event_type: EventType
    customer_id: str
    event_date: datetime.datetime
    guest_count: int
    special_requirements: List[str]
    budget: Decimal
    assigned_coordinator: str
    status: str
    custom_menu: Optional[Dict] = None
    decorations: Optional[Dict] = None
    entertainment: Optional[Dict] = None

@dataclass
class IoTSensorReading:
    sensor_id: str
    sensor_type: IoTSensorType
    location: str
    value: float
    unit: str
    timestamp: datetime.datetime
    alert_threshold: Optional[float] = None
    is_critical: bool = False

@dataclass
class CustomerProfile:
    customer_id: str
    name: str
    email: str
    phone: str
    preferences: Dict
    allergies: List[str]
    vip_status: bool
    loyalty_points: int
    visit_history: List[Dict]
    spending_pattern: Dict
    
class UltimateIntegrations:
    def __init__(self, db_path: str = "ultimate_integrations.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # E-commerce tabele
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ecommerce_transactions (
                transaction_id TEXT PRIMARY KEY,
                customer_id TEXT,
                items TEXT,
                total_amount REAL,
                payment_status TEXT,
                payment_method TEXT,
                timestamp TEXT,
                discount_applied REAL,
                loyalty_points_earned INTEGER
            )
        """)
        
        # VIP dogodki tabele
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vip_events (
                event_id TEXT PRIMARY KEY,
                event_type TEXT,
                customer_id TEXT,
                event_date TEXT,
                guest_count INTEGER,
                special_requirements TEXT,
                budget REAL,
                assigned_coordinator TEXT,
                status TEXT,
                custom_menu TEXT,
                decorations TEXT,
                entertainment TEXT
            )
        """)
        
        # IoT senzorji tabele
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS iot_sensors (
                sensor_id TEXT PRIMARY KEY,
                sensor_type TEXT,
                location TEXT,
                value REAL,
                unit TEXT,
                timestamp TEXT,
                alert_threshold REAL,
                is_critical BOOLEAN
            )
        """)
        
        # Profili strank
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_profiles (
                customer_id TEXT PRIMARY KEY,
                name TEXT,
                email TEXT,
                phone TEXT,
                preferences TEXT,
                allergies TEXT,
                vip_status BOOLEAN,
                loyalty_points INTEGER,
                visit_history TEXT,
                spending_pattern TEXT
            )
        """)
        
        # Rezervacijski sistem
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reservations (
                reservation_id TEXT PRIMARY KEY,
                customer_id TEXT,
                table_number INTEGER,
                room_number INTEGER,
                reservation_date TEXT,
                party_size INTEGER,
                special_requests TEXT,
                status TEXT,
                created_at TEXT
            )
        """)
        
        # Dobavitelji in nabava
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS suppliers (
                supplier_id TEXT PRIMARY KEY,
                name TEXT,
                contact_info TEXT,
                products TEXT,
                pricing TEXT,
                delivery_schedule TEXT,
                quality_rating REAL,
                payment_terms TEXT
            )
        """)
        
        # Zaloge
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                item_id TEXT PRIMARY KEY,
                name TEXT,
                category TEXT,
                current_stock INTEGER,
                min_threshold INTEGER,
                max_threshold INTEGER,
                unit_cost REAL,
                supplier_id TEXT,
                expiry_date TEXT,
                last_updated TEXT
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info("Baza podatkov inicializirana")
        
    def process_ecommerce_transaction(self, transaction: ECommerceTransaction) -> Dict:
        """Obdelava e-commerce transakcije"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO ecommerce_transactions 
                (transaction_id, customer_id, items, total_amount, payment_status, 
                 payment_method, timestamp, discount_applied, loyalty_points_earned)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                transaction.transaction_id,
                transaction.customer_id,
                json.dumps(transaction.items),
                float(transaction.total_amount),
                transaction.payment_status.value,
                transaction.payment_method,
                transaction.timestamp.isoformat(),
                float(transaction.discount_applied) if transaction.discount_applied else None,
                transaction.loyalty_points_earned
            ))
            
            # Posodobi loyalty točke stranke
            self._update_customer_loyalty_points(transaction.customer_id, transaction.loyalty_points_earned)
            
            # Posodobi zaloge
            self._update_inventory_from_transaction(transaction.items)
            
            conn.commit()
            
            return {
                "status": "success",
                "transaction_id": transaction.transaction_id,
                "loyalty_points_earned": transaction.loyalty_points_earned,
                "inventory_updated": True
            }
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Napaka pri obdelavi transakcije: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    def create_vip_event(self, event: VIPEvent) -> Dict:
        """Ustvarjanje VIP dogodka"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO vip_events 
                (event_id, event_type, customer_id, event_date, guest_count,
                 special_requirements, budget, assigned_coordinator, status,
                 custom_menu, decorations, entertainment)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id,
                event.event_type.value,
                event.customer_id,
                event.event_date.isoformat(),
                event.guest_count,
                json.dumps(event.special_requirements),
                float(event.budget),
                event.assigned_coordinator,
                event.status,
                json.dumps(event.custom_menu) if event.custom_menu else None,
                json.dumps(event.decorations) if event.decorations else None,
                json.dumps(event.entertainment) if event.entertainment else None
            ))
            
            # Ustvari avtomatske naloge za koordinatorja
            tasks = self._generate_event_tasks(event)
            
            # Rezerviraj potrebne vire
            resources = self._reserve_event_resources(event)
            
            conn.commit()
            
            return {
                "status": "success",
                "event_id": event.event_id,
                "tasks_created": len(tasks),
                "resources_reserved": resources,
                "estimated_revenue": float(event.budget)
            }
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Napaka pri ustvarjanju VIP dogodka: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    def process_iot_sensor_data(self, reading: IoTSensorReading) -> Dict:
        """Obdelava podatkov IoT senzorjev"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Preveri kritične vrednosti
            is_critical = self._check_critical_threshold(reading)
            reading.is_critical = is_critical
            
            cursor.execute("""
                INSERT INTO iot_sensors 
                (sensor_id, sensor_type, location, value, unit, timestamp, 
                 alert_threshold, is_critical)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                reading.sensor_id,
                reading.sensor_type.value,
                reading.location,
                reading.value,
                reading.unit,
                reading.timestamp.isoformat(),
                reading.alert_threshold,
                reading.is_critical
            ))
            
            # Če je kritično, ustvari opozorilo
            alerts = []
            if is_critical:
                alert = self._create_critical_alert(reading)
                alerts.append(alert)
                
            # Optimizacija na podlagi podatkov
            optimization_suggestions = self._generate_optimization_suggestions(reading)
            
            conn.commit()
            
            return {
                "status": "success",
                "sensor_id": reading.sensor_id,
                "is_critical": is_critical,
                "alerts_created": len(alerts),
                "optimization_suggestions": optimization_suggestions
            }
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Napaka pri obdelavi IoT podatkov: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    def create_customer_profile(self, profile: CustomerProfile) -> Dict:
        """Ustvarjanje profila stranke"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO customer_profiles 
                (customer_id, name, email, phone, preferences, allergies,
                 vip_status, loyalty_points, visit_history, spending_pattern)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                profile.customer_id,
                profile.name,
                profile.email,
                profile.phone,
                json.dumps(profile.preferences),
                json.dumps(profile.allergies),
                profile.vip_status,
                profile.loyalty_points,
                json.dumps(profile.visit_history),
                json.dumps(profile.spending_pattern)
            ))
            
            # Generiraj personalizirana priporočila
            recommendations = self._generate_personalized_recommendations(profile)
            
            conn.commit()
            
            return {
                "status": "success",
                "customer_id": profile.customer_id,
                "vip_status": profile.vip_status,
                "recommendations": recommendations
            }
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Napaka pri ustvarjanju profila stranke: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    def sync_with_booking_platforms(self) -> Dict:
        """Sinhronizacija z rezervacijskimi platformami (Booking, Airbnb, TripAdvisor)"""
        results = {
            "booking_com": {"status": "pending", "reservations": 0},
            "airbnb": {"status": "pending", "reservations": 0},
            "tripadvisor": {"status": "pending", "reviews": 0}
        }
        
        try:
            # Simulacija sinhronizacije z Booking.com
            booking_data = self._sync_booking_com()
            results["booking_com"] = booking_data
            
            # Simulacija sinhronizacije z Airbnb
            airbnb_data = self._sync_airbnb()
            results["airbnb"] = airbnb_data
            
            # Simulacija sinhronizacije z TripAdvisor
            tripadvisor_data = self._sync_tripadvisor()
            results["tripadvisor"] = tripadvisor_data
            
            return {
                "status": "success",
                "platforms_synced": 3,
                "results": results,
                "last_sync": datetime.datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri sinhronizaciji platform: {e}")
            return {"status": "error", "message": str(e)}
            
    def get_real_time_dashboard_data(self) -> Dict:
        """Pridobi podatke za real-time dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Današnje transakcije
            today = datetime.date.today().isoformat()
            cursor.execute("""
                SELECT COUNT(*), SUM(total_amount) 
                FROM ecommerce_transactions 
                WHERE DATE(timestamp) = ?
            """, (today,))
            transactions_today = cursor.fetchone()
            
            # Aktivni VIP dogodki
            cursor.execute("""
                SELECT COUNT(*) FROM vip_events 
                WHERE status = 'active' AND DATE(event_date) >= ?
            """, (today,))
            active_events = cursor.fetchone()[0]
            
            # Kritični IoT senzorji
            cursor.execute("""
                SELECT COUNT(*) FROM iot_sensors 
                WHERE is_critical = 1 AND DATE(timestamp) = ?
            """, (today,))
            critical_sensors = cursor.fetchone()[0]
            
            # Nizke zaloge
            cursor.execute("""
                SELECT COUNT(*) FROM inventory 
                WHERE current_stock <= min_threshold
            """, )
            low_stock_items = cursor.fetchone()[0]
            
            return {
                "transactions_today": {
                    "count": transactions_today[0] or 0,
                    "revenue": float(transactions_today[1] or 0)
                },
                "active_events": active_events,
                "critical_alerts": critical_sensors,
                "low_stock_items": low_stock_items,
                "timestamp": datetime.datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju dashboard podatkov: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    # Pomožne metode
    def _update_customer_loyalty_points(self, customer_id: str, points: int):
        """Posodobi loyalty točke stranke"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE customer_profiles 
            SET loyalty_points = loyalty_points + ? 
            WHERE customer_id = ?
        """, (points, customer_id))
        
        conn.commit()
        conn.close()
        
    def _update_inventory_from_transaction(self, items: List[Dict]):
        """Posodobi zaloge na podlagi transakcije"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for item in items:
            cursor.execute("""
                UPDATE inventory 
                SET current_stock = current_stock - ?, 
                    last_updated = ? 
                WHERE item_id = ?
            """, (item.get('quantity', 1), datetime.datetime.now().isoformat(), item.get('item_id')))
            
        conn.commit()
        conn.close()
        
    def _generate_event_tasks(self, event: VIPEvent) -> List[Dict]:
        """Generiraj naloge za VIP dogodek"""
        tasks = [
            {"task": "Pripravi meni", "deadline": event.event_date - datetime.timedelta(days=3)},
            {"task": "Rezerviraj dekoracijo", "deadline": event.event_date - datetime.timedelta(days=7)},
            {"task": "Potrdi zabavo", "deadline": event.event_date - datetime.timedelta(days=5)},
            {"task": "Pripravi prostor", "deadline": event.event_date - datetime.timedelta(hours=4)}
        ]
        return tasks
        
    def _reserve_event_resources(self, event: VIPEvent) -> Dict:
        """Rezerviraj vire za dogodek"""
        return {
            "tables_reserved": event.guest_count // 8 + 1,
            "staff_assigned": event.guest_count // 10 + 2,
            "equipment_reserved": ["sound_system", "lighting", "decorations"]
        }
        
    def _check_critical_threshold(self, reading: IoTSensorReading) -> bool:
        """Preveri kritične vrednosti senzorjev"""
        if reading.alert_threshold is None:
            return False
            
        if reading.sensor_type == IoTSensorType.TEMPERATURE:
            return reading.value < 0 or reading.value > 35
        elif reading.sensor_type == IoTSensorType.HUMIDITY:
            return reading.value > 80 or reading.value < 30
        elif reading.sensor_type == IoTSensorType.AIR_QUALITY:
            return reading.value > reading.alert_threshold
            
        return abs(reading.value) > reading.alert_threshold
        
    def _create_critical_alert(self, reading: IoTSensorReading) -> Dict:
        """Ustvari kritično opozorilo"""
        return {
            "alert_id": str(uuid.uuid4()),
            "sensor_id": reading.sensor_id,
            "message": f"Kritična vrednost {reading.sensor_type.value}: {reading.value} {reading.unit}",
            "location": reading.location,
            "timestamp": reading.timestamp.isoformat(),
            "priority": "high"
        }
        
    def _generate_optimization_suggestions(self, reading: IoTSensorReading) -> List[str]:
        """Generiraj predloge za optimizacijo"""
        suggestions = []
        
        if reading.sensor_type == IoTSensorType.ENERGY and reading.value > 100:
            suggestions.append("Razmisli o zmanjšanju energijske porabe")
            
        if reading.sensor_type == IoTSensorType.TEMPERATURE and reading.value > 25:
            suggestions.append("Prilagodi klimatsko napravo za boljše udobje gostov")
            
        return suggestions
        
    def _generate_personalized_recommendations(self, profile: CustomerProfile) -> List[str]:
        """Generiraj personalizirana priporočila"""
        recommendations = []
        
        if profile.vip_status:
            recommendations.append("Ponudi VIP mizo z razgledom")
            recommendations.append("Pripravi personalizirano pozdravno sporočilo")
            
        if "vegetarian" in profile.preferences:
            recommendations.append("Predlagaj vegetarijanski meni")
            
        if profile.loyalty_points > 1000:
            recommendations.append("Ponudi brezplačen desert")
            
        return recommendations
        
    def _sync_booking_com(self) -> Dict:
        """Sinhronizacija z Booking.com"""
        # Simulacija API klica
        return {
            "status": "success",
            "reservations": 15,
            "new_bookings": 3,
            "cancellations": 1
        }
        
    def _sync_airbnb(self) -> Dict:
        """Sinhronizacija z Airbnb"""
        # Simulacija API klica
        return {
            "status": "success",
            "reservations": 8,
            "new_bookings": 2,
            "reviews": 5
        }
        
    def _sync_tripadvisor(self) -> Dict:
        """Sinhronizacija z TripAdvisor"""
        # Simulacija API klica
        return {
            "status": "success",
            "reviews": 12,
            "average_rating": 4.5,
            "new_reviews": 3
        }

# Testni primer
if __name__ == "__main__":
    integrations = UltimateIntegrations()
    
    # Test e-commerce transakcije
    transaction = ECommerceTransaction(
        transaction_id="TXN001",
        customer_id="CUST001",
        items=[{"item_id": "ITEM001", "name": "Gourmet Menu", "quantity": 2, "price": 45.00}],
        total_amount=Decimal("90.00"),
        payment_status=PaymentStatus.PAID,
        payment_method="credit_card",
        timestamp=datetime.datetime.now(),
        loyalty_points_earned=90
    )
    
    result = integrations.process_ecommerce_transaction(transaction)
    print("E-commerce transakcija:", result)
    
    # Test VIP dogodka
    vip_event = VIPEvent(
        event_id="EVT001",
        event_type=EventType.WEDDING,
        customer_id="CUST001",
        event_date=datetime.datetime.now() + datetime.timedelta(days=30),
        guest_count=100,
        special_requirements=["vegetarian_options", "live_music", "flowers"],
        budget=Decimal("5000.00"),
        assigned_coordinator="coordinator_1",
        status="confirmed"
    )
    
    result = integrations.create_vip_event(vip_event)
    print("VIP dogodek:", result)
    
    # Test IoT senzorja
    sensor_reading = IoTSensorReading(
        sensor_id="TEMP001",
        sensor_type=IoTSensorType.TEMPERATURE,
        location="main_dining_room",
        value=22.5,
        unit="°C",
        timestamp=datetime.datetime.now(),
        alert_threshold=30.0
    )
    
    result = integrations.process_iot_sensor_data(sensor_reading)
    print("IoT senzor:", result)
    
    # Test dashboard podatkov
    dashboard_data = integrations.get_real_time_dashboard_data()
    print("Dashboard podatki:", dashboard_data)