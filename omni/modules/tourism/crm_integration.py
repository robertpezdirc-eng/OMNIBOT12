"""
👥 CRM Integration System - Sistem za upravljanje odnosov s strankami
Napredni CRM sistem za sledenje strankam, lojalnostne programe, personalizirane promocije in analitiko strank
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import secrets
import statistics
from collections import defaultdict
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

logger = logging.getLogger(__name__)

class CustomerStatus(Enum):
    NEW = "new"
    ACTIVE = "active"
    VIP = "vip"
    INACTIVE = "inactive"
    BLOCKED = "blocked"

class CustomerSegment(Enum):
    BUDGET = "budget"
    STANDARD = "standard"
    PREMIUM = "premium"
    LUXURY = "luxury"
    BUSINESS = "business"
    FAMILY = "family"

class CommunicationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    PHONE = "phone"
    SOCIAL_MEDIA = "social_media"
    IN_PERSON = "in_person"

class CampaignType(Enum):
    PROMOTIONAL = "promotional"
    LOYALTY = "loyalty"
    SEASONAL = "seasonal"
    BIRTHDAY = "birthday"
    WELCOME = "welcome"
    RETENTION = "retention"

@dataclass
class Customer:
    """Stranka"""
    customer_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    date_of_birth: Optional[date]
    address: Dict[str, str]
    preferences: Dict[str, Any]
    status: CustomerStatus
    segment: CustomerSegment
    loyalty_points: int
    total_spent: float
    visit_count: int
    last_visit: Optional[datetime]
    acquisition_source: str
    notes: str = ""
    created_at: datetime = None

@dataclass
class CustomerInteraction:
    """Interakcija s stranko"""
    interaction_id: str
    customer_id: str
    interaction_type: str
    channel: CommunicationChannel
    subject: str
    description: str
    outcome: str
    follow_up_required: bool
    follow_up_date: Optional[datetime]
    staff_member: str
    created_at: datetime

@dataclass
class LoyaltyProgram:
    """Lojalnostni program"""
    program_id: str
    name: str
    description: str
    points_per_euro: float
    welcome_bonus: int
    tier_thresholds: Dict[str, int]  # {"silver": 1000, "gold": 5000, "platinum": 10000}
    tier_benefits: Dict[str, List[str]]
    expiry_months: int
    is_active: bool

@dataclass
class Promotion:
    """Promocija"""
    promotion_id: str
    name: str
    description: str
    discount_type: str  # "percentage", "fixed_amount", "buy_x_get_y"
    discount_value: float
    min_purchase_amount: float
    valid_from: datetime
    valid_until: datetime
    usage_limit: Optional[int]
    usage_count: int
    target_segments: List[CustomerSegment]
    promo_code: str
    is_active: bool

@dataclass
class Campaign:
    """Marketinška kampanja"""
    campaign_id: str
    name: str
    campaign_type: CampaignType
    description: str
    target_segments: List[CustomerSegment]
    channels: List[CommunicationChannel]
    start_date: datetime
    end_date: datetime
    budget: float
    expected_reach: int
    actual_reach: int
    conversion_rate: float
    roi: float
    is_active: bool

class CRMIntegration:
    """CRM integracijski sistem"""
    
    def __init__(self, db_path: str = "crm_integration.db"):
        self.db_path = db_path
        self._init_database()
        self._setup_default_loyalty_program()
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela strank
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS customers (
                    customer_id TEXT PRIMARY KEY,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    date_of_birth TEXT,
                    address TEXT,
                    preferences TEXT,
                    status TEXT NOT NULL,
                    segment TEXT NOT NULL,
                    loyalty_points INTEGER DEFAULT 0,
                    total_spent REAL DEFAULT 0,
                    visit_count INTEGER DEFAULT 0,
                    last_visit TEXT,
                    acquisition_source TEXT,
                    notes TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela interakcij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS customer_interactions (
                    interaction_id TEXT PRIMARY KEY,
                    customer_id TEXT NOT NULL,
                    interaction_type TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    description TEXT,
                    outcome TEXT,
                    follow_up_required BOOLEAN DEFAULT 0,
                    follow_up_date TEXT,
                    staff_member TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
                )
            ''')
            
            # Tabela lojalnostnih programov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS loyalty_programs (
                    program_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    points_per_euro REAL NOT NULL,
                    welcome_bonus INTEGER DEFAULT 0,
                    tier_thresholds TEXT,
                    tier_benefits TEXT,
                    expiry_months INTEGER DEFAULT 12,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela promocij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS promotions (
                    promotion_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    discount_type TEXT NOT NULL,
                    discount_value REAL NOT NULL,
                    min_purchase_amount REAL DEFAULT 0,
                    valid_from TEXT NOT NULL,
                    valid_until TEXT NOT NULL,
                    usage_limit INTEGER,
                    usage_count INTEGER DEFAULT 0,
                    target_segments TEXT,
                    promo_code TEXT UNIQUE,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela kampanj
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS campaigns (
                    campaign_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    campaign_type TEXT NOT NULL,
                    description TEXT,
                    target_segments TEXT,
                    channels TEXT,
                    start_date TEXT NOT NULL,
                    end_date TEXT NOT NULL,
                    budget REAL DEFAULT 0,
                    expected_reach INTEGER DEFAULT 0,
                    actual_reach INTEGER DEFAULT 0,
                    conversion_rate REAL DEFAULT 0,
                    roi REAL DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela uporabe promocij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS promotion_usage (
                    usage_id TEXT PRIMARY KEY,
                    promotion_id TEXT NOT NULL,
                    customer_id TEXT NOT NULL,
                    order_id TEXT,
                    discount_amount REAL NOT NULL,
                    used_at TEXT NOT NULL,
                    FOREIGN KEY (promotion_id) REFERENCES promotions (promotion_id),
                    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
                )
            ''')
            
            # Tabela transakcij lojalnostnih točk
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS loyalty_transactions (
                    transaction_id TEXT PRIMARY KEY,
                    customer_id TEXT NOT NULL,
                    transaction_type TEXT NOT NULL,
                    points_change INTEGER NOT NULL,
                    description TEXT,
                    order_id TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
                )
            ''')
            
            conn.commit()
            logger.info("👥 CRM Integration baza podatkov inicializirana")
    
    def _setup_default_loyalty_program(self):
        """Nastavi privzeti lojalnostni program"""
        default_program = LoyaltyProgram(
            program_id="LOYALTY_DEFAULT",
            name="Gostinski lojalnostni program",
            description="Zbirajte točke z vsakim obiskom in jih uporabite za popuste!",
            points_per_euro=10,  # 10 točk na evro
            welcome_bonus=100,
            tier_thresholds={
                "bronze": 0,
                "silver": 1000,
                "gold": 5000,
                "platinum": 15000
            },
            tier_benefits={
                "bronze": ["10% popust na rojstni dan"],
                "silver": ["15% popust na rojstni dan", "Prednostne rezervacije"],
                "gold": ["20% popust na rojstni dan", "Brezplačen desert", "VIP miza"],
                "platinum": ["25% popust na rojstni dan", "Brezplačna pijača", "Osebni natakar"]
            },
            expiry_months=24,
            is_active=True
        )
        
        self.add_loyalty_program(default_program)
    
    def add_customer(self, customer: Customer) -> Dict[str, Any]:
        """Dodaj stranko"""
        try:
            if not customer.created_at:
                customer.created_at = datetime.now()
                
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO customers 
                    (customer_id, first_name, last_name, email, phone, date_of_birth,
                     address, preferences, status, segment, loyalty_points, total_spent,
                     visit_count, last_visit, acquisition_source, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    customer.customer_id,
                    customer.first_name,
                    customer.last_name,
                    customer.email,
                    customer.phone,
                    customer.date_of_birth.isoformat() if customer.date_of_birth else None,
                    json.dumps(customer.address),
                    json.dumps(customer.preferences),
                    customer.status.value,
                    customer.segment.value,
                    customer.loyalty_points,
                    customer.total_spent,
                    customer.visit_count,
                    customer.last_visit.isoformat() if customer.last_visit else None,
                    customer.acquisition_source,
                    customer.notes,
                    customer.created_at.isoformat()
                ))
                
                conn.commit()
                
                # Dodeli dobrodošlice bonus
                self._award_welcome_bonus(customer.customer_id)
                
                return {
                    "success": True,
                    "customer_id": customer.customer_id,
                    "message": f"Stranka {customer.first_name} {customer.last_name} uspešno dodana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju stranke: {e}")
            return {"success": False, "error": str(e)}
    
    def _award_welcome_bonus(self, customer_id: str):
        """Dodeli dobrodošlice bonus"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi dobrodošlice bonus
                cursor.execute('''
                    SELECT welcome_bonus FROM loyalty_programs 
                    WHERE program_id = 'LOYALTY_DEFAULT' AND is_active = 1
                ''')
                
                result = cursor.fetchone()
                if result and result[0] > 0:
                    welcome_bonus = result[0]
                    
                    # Dodeli točke
                    self.award_loyalty_points(
                        customer_id, 
                        welcome_bonus, 
                        "Dobrodošlice bonus"
                    )
                    
        except Exception as e:
            logger.error(f"Napaka pri dodeljevanju dobrodošlice bonusa: {e}")
    
    def update_customer_visit(self, customer_id: str, purchase_amount: float = 0) -> Dict[str, Any]:
        """Posodobi obisk stranke"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Posodobi podatke o obisku
                cursor.execute('''
                    UPDATE customers 
                    SET visit_count = visit_count + 1,
                        last_visit = ?,
                        total_spent = total_spent + ?
                    WHERE customer_id = ?
                ''', (datetime.now().isoformat(), purchase_amount, customer_id))
                
                # Dodeli lojalnostne točke
                if purchase_amount > 0:
                    points_earned = int(purchase_amount * 10)  # 10 točk na evro
                    self.award_loyalty_points(
                        customer_id, 
                        points_earned, 
                        f"Nakup v vrednosti {purchase_amount}€"
                    )
                
                # Preveri in posodobi segment stranke
                self._update_customer_segment(customer_id)
                
                conn.commit()
                
                return {
                    "success": True,
                    "points_earned": points_earned if purchase_amount > 0 else 0,
                    "message": "Obisk stranke uspešno posodobljen"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju obiska: {e}")
            return {"success": False, "error": str(e)}
    
    def _update_customer_segment(self, customer_id: str):
        """Posodobi segment stranke glede na porabo"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT total_spent, visit_count FROM customers WHERE customer_id = ?
            ''', (customer_id,))
            
            result = cursor.fetchone()
            if result:
                total_spent, visit_count = result
                
                # Določi segment glede na porabo in obiske
                if total_spent >= 5000 or visit_count >= 50:
                    segment = CustomerSegment.LUXURY
                elif total_spent >= 2000 or visit_count >= 20:
                    segment = CustomerSegment.PREMIUM
                elif total_spent >= 500 or visit_count >= 10:
                    segment = CustomerSegment.STANDARD
                else:
                    segment = CustomerSegment.BUDGET
                
                cursor.execute('''
                    UPDATE customers SET segment = ? WHERE customer_id = ?
                ''', (segment.value, customer_id))
    
    def award_loyalty_points(self, customer_id: str, points: int, description: str, 
                           order_id: str = None) -> Dict[str, Any]:
        """Dodeli lojalnostne točke"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Posodobi točke stranke
                cursor.execute('''
                    UPDATE customers 
                    SET loyalty_points = loyalty_points + ?
                    WHERE customer_id = ?
                ''', (points, customer_id))
                
                # Zabeleži transakcijo
                transaction_id = f"LOYALTY_{customer_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                cursor.execute('''
                    INSERT INTO loyalty_transactions 
                    (transaction_id, customer_id, transaction_type, points_change,
                     description, order_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    transaction_id,
                    customer_id,
                    "earned",
                    points,
                    description,
                    order_id,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "points_awarded": points,
                    "transaction_id": transaction_id,
                    "message": f"Dodeljenih {points} lojalnostnih točk"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodeljevanju točk: {e}")
            return {"success": False, "error": str(e)}
    
    def redeem_loyalty_points(self, customer_id: str, points: int, description: str) -> Dict[str, Any]:
        """Uporabi lojalnostne točke"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Preveri razpoložljive točke
                cursor.execute('''
                    SELECT loyalty_points FROM customers WHERE customer_id = ?
                ''', (customer_id,))
                
                result = cursor.fetchone()
                if not result:
                    return {"success": False, "error": "Stranka ne obstaja"}
                
                available_points = result[0]
                if available_points < points:
                    return {"success": False, "error": "Ni dovolj lojalnostnih točk"}
                
                # Odštej točke
                cursor.execute('''
                    UPDATE customers 
                    SET loyalty_points = loyalty_points - ?
                    WHERE customer_id = ?
                ''', (points, customer_id))
                
                # Zabeleži transakcijo
                transaction_id = f"REDEEM_{customer_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                cursor.execute('''
                    INSERT INTO loyalty_transactions 
                    (transaction_id, customer_id, transaction_type, points_change,
                     description, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    transaction_id,
                    customer_id,
                    "redeemed",
                    -points,
                    description,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "points_redeemed": points,
                    "remaining_points": available_points - points,
                    "transaction_id": transaction_id,
                    "message": f"Uporabljenih {points} lojalnostnih točk"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri uporabi točk: {e}")
            return {"success": False, "error": str(e)}
    
    def create_promotion(self, promotion: Promotion) -> Dict[str, Any]:
        """Ustvari promocijo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO promotions 
                    (promotion_id, name, description, discount_type, discount_value,
                     min_purchase_amount, valid_from, valid_until, usage_limit,
                     usage_count, target_segments, promo_code, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    promotion.promotion_id,
                    promotion.name,
                    promotion.description,
                    promotion.discount_type,
                    promotion.discount_value,
                    promotion.min_purchase_amount,
                    promotion.valid_from.isoformat(),
                    promotion.valid_until.isoformat(),
                    promotion.usage_limit,
                    promotion.usage_count,
                    json.dumps([seg.value for seg in promotion.target_segments]),
                    promotion.promo_code,
                    promotion.is_active,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "promotion_id": promotion.promotion_id,
                    "promo_code": promotion.promo_code,
                    "message": f"Promocija '{promotion.name}' uspešno ustvarjena"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju promocije: {e}")
            return {"success": False, "error": str(e)}
    
    def apply_promotion(self, customer_id: str, promo_code: str, 
                       purchase_amount: float) -> Dict[str, Any]:
        """Uporabi promocijo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi promocijo
                cursor.execute('''
                    SELECT promotion_id, name, discount_type, discount_value,
                           min_purchase_amount, usage_limit, usage_count, target_segments,
                           valid_from, valid_until, is_active
                    FROM promotions WHERE promo_code = ?
                ''', (promo_code,))
                
                promo_data = cursor.fetchone()
                if not promo_data:
                    return {"success": False, "error": "Promocijska koda ne obstaja"}
                
                (promotion_id, name, discount_type, discount_value, min_purchase_amount,
                 usage_limit, usage_count, target_segments_json, valid_from, valid_until, is_active) = promo_data
                
                # Preveri veljavnost
                if not is_active:
                    return {"success": False, "error": "Promocija ni aktivna"}
                
                now = datetime.now()
                if now < datetime.fromisoformat(valid_from) or now > datetime.fromisoformat(valid_until):
                    return {"success": False, "error": "Promocija ni veljavna"}
                
                if usage_limit and usage_count >= usage_limit:
                    return {"success": False, "error": "Promocija je izčrpana"}
                
                if purchase_amount < min_purchase_amount:
                    return {"success": False, "error": f"Minimalni znesek nakupa je {min_purchase_amount}€"}
                
                # Preveri segment stranke
                cursor.execute('''
                    SELECT segment FROM customers WHERE customer_id = ?
                ''', (customer_id,))
                
                customer_result = cursor.fetchone()
                if not customer_result:
                    return {"success": False, "error": "Stranka ne obstaja"}
                
                customer_segment = customer_result[0]
                target_segments = json.loads(target_segments_json)
                
                if target_segments and customer_segment not in target_segments:
                    return {"success": False, "error": "Promocija ni na voljo za vaš segment"}
                
                # Izračunaj popust
                if discount_type == "percentage":
                    discount_amount = purchase_amount * (discount_value / 100)
                elif discount_type == "fixed_amount":
                    discount_amount = min(discount_value, purchase_amount)
                else:
                    discount_amount = 0
                
                # Zabeleži uporabo
                usage_id = f"USAGE_{promotion_id}_{customer_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                cursor.execute('''
                    INSERT INTO promotion_usage 
                    (usage_id, promotion_id, customer_id, discount_amount, used_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    usage_id,
                    promotion_id,
                    customer_id,
                    discount_amount,
                    datetime.now().isoformat()
                ))
                
                # Posodobi števec uporabe
                cursor.execute('''
                    UPDATE promotions SET usage_count = usage_count + 1
                    WHERE promotion_id = ?
                ''', (promotion_id,))
                
                conn.commit()
                
                return {
                    "success": True,
                    "promotion_name": name,
                    "discount_amount": round(discount_amount, 2),
                    "final_amount": round(purchase_amount - discount_amount, 2),
                    "usage_id": usage_id,
                    "message": f"Promocija uspešno uporabljena. Prihranek: {discount_amount:.2f}€"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri uporabi promocije: {e}")
            return {"success": False, "error": str(e)}
    
    def create_campaign(self, campaign: Campaign) -> Dict[str, Any]:
        """Ustvari marketinško kampanjo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO campaigns 
                    (campaign_id, name, campaign_type, description, target_segments,
                     channels, start_date, end_date, budget, expected_reach,
                     actual_reach, conversion_rate, roi, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    campaign.campaign_id,
                    campaign.name,
                    campaign.campaign_type.value,
                    campaign.description,
                    json.dumps([seg.value for seg in campaign.target_segments]),
                    json.dumps([ch.value for ch in campaign.channels]),
                    campaign.start_date.isoformat(),
                    campaign.end_date.isoformat(),
                    campaign.budget,
                    campaign.expected_reach,
                    campaign.actual_reach,
                    campaign.conversion_rate,
                    campaign.roi,
                    campaign.is_active,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "campaign_id": campaign.campaign_id,
                    "message": f"Kampanja '{campaign.name}' uspešno ustvarjena"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju kampanje: {e}")
            return {"success": False, "error": str(e)}
    
    def get_customer_profile(self, customer_id: str) -> Dict[str, Any]:
        """Pridobi profil stranke"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Osnovni podatki stranke
            cursor.execute('''
                SELECT * FROM customers WHERE customer_id = ?
            ''', (customer_id,))
            
            customer_data = cursor.fetchone()
            if not customer_data:
                return {"error": "Stranka ne obstaja"}
            
            # Zadnje interakcije
            cursor.execute('''
                SELECT interaction_type, subject, description, created_at
                FROM customer_interactions 
                WHERE customer_id = ? 
                ORDER BY created_at DESC LIMIT 5
            ''', (customer_id,))
            
            recent_interactions = cursor.fetchall()
            
            # Zgodovina lojalnostnih točk
            cursor.execute('''
                SELECT transaction_type, points_change, description, created_at
                FROM loyalty_transactions 
                WHERE customer_id = ? 
                ORDER BY created_at DESC LIMIT 10
            ''', (customer_id,))
            
            loyalty_history = cursor.fetchall()
            
            # Uporabljene promocije
            cursor.execute('''
                SELECT p.name, pu.discount_amount, pu.used_at
                FROM promotion_usage pu
                JOIN promotions p ON pu.promotion_id = p.promotion_id
                WHERE pu.customer_id = ?
                ORDER BY pu.used_at DESC LIMIT 5
            ''', (customer_id,))
            
            used_promotions = cursor.fetchall()
            
            # Določi tier
            loyalty_points = customer_data[10]  # loyalty_points column
            tier = self._determine_loyalty_tier(loyalty_points)
            
            return {
                "customer_id": customer_data[0],
                "name": f"{customer_data[1]} {customer_data[2]}",
                "email": customer_data[3],
                "phone": customer_data[4],
                "status": customer_data[8],
                "segment": customer_data[9],
                "loyalty_points": loyalty_points,
                "loyalty_tier": tier,
                "total_spent": customer_data[11],
                "visit_count": customer_data[12],
                "last_visit": customer_data[13],
                "recent_interactions": [
                    {
                        "type": interaction[0],
                        "subject": interaction[1],
                        "description": interaction[2],
                        "date": interaction[3]
                    } for interaction in recent_interactions
                ],
                "loyalty_history": [
                    {
                        "type": transaction[0],
                        "points": transaction[1],
                        "description": transaction[2],
                        "date": transaction[3]
                    } for transaction in loyalty_history
                ],
                "used_promotions": [
                    {
                        "promotion_name": promo[0],
                        "discount_amount": promo[1],
                        "used_at": promo[2]
                    } for promo in used_promotions
                ]
            }
    
    def _determine_loyalty_tier(self, points: int) -> str:
        """Določi lojalnostni tier"""
        if points >= 15000:
            return "platinum"
        elif points >= 5000:
            return "gold"
        elif points >= 1000:
            return "silver"
        else:
            return "bronze"
    
    def get_customer_recommendations(self, customer_id: str) -> Dict[str, Any]:
        """Pridobi priporočila za stranko"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Pridobi podatke o stranki
            cursor.execute('''
                SELECT segment, total_spent, visit_count, last_visit, preferences
                FROM customers WHERE customer_id = ?
            ''', (customer_id,))
            
            customer_data = cursor.fetchone()
            if not customer_data:
                return {"error": "Stranka ne obstaja"}
            
            segment, total_spent, visit_count, last_visit, preferences_json = customer_data
            preferences = json.loads(preferences_json) if preferences_json else {}
            
            recommendations = []
            
            # Priporočila glede na segment
            if segment == "luxury":
                recommendations.extend([
                    "Ekskluzivni degustacijski meni",
                    "Privatna jedilnica za posebne priložnosti",
                    "Osebni sommelier"
                ])
            elif segment == "premium":
                recommendations.extend([
                    "Sezonski specialiteti",
                    "Vinska degustacija",
                    "VIP rezervacije"
                ])
            elif segment == "family":
                recommendations.extend([
                    "Družinski paketi",
                    "Otroški meni",
                    "Zabavni program za otroke"
                ])
            
            # Priporočila glede na obiske
            if visit_count > 20:
                recommendations.append("Lojalnostni popust za redne goste")
            
            # Priporočila glede na zadnji obisk
            if last_visit:
                days_since_visit = (datetime.now() - datetime.fromisoformat(last_visit)).days
                if days_since_visit > 30:
                    recommendations.append("Povabilo za vrnitev z posebnim popustom")
            
            # Priporočila glede na preference
            if preferences.get("dietary_restrictions"):
                recommendations.append("Specialni meni za dietne omejitve")
            
            if preferences.get("favorite_cuisine"):
                recommendations.append(f"Novi {preferences['favorite_cuisine']} specialiteti")
            
            return {
                "customer_id": customer_id,
                "recommendations": recommendations,
                "personalized_offers": self._generate_personalized_offers(customer_data),
                "next_best_action": self._determine_next_best_action(customer_data)
            }
    
    def _generate_personalized_offers(self, customer_data) -> List[Dict[str, Any]]:
        """Generiraj personalizirane ponudbe"""
        segment, total_spent, visit_count, last_visit, preferences_json = customer_data
        
        offers = []
        
        # Ponudbe glede na segment
        if segment == "luxury":
            offers.append({
                "title": "Ekskluzivna degustacija",
                "description": "7-hodni degustacijski meni z vinsko spremljavo",
                "discount": 15,
                "valid_days": 14
            })
        elif segment == "premium":
            offers.append({
                "title": "Sezonski specialiteti",
                "description": "Poskusite naše nove jesenske specialitete",
                "discount": 10,
                "valid_days": 7
            })
        else:
            offers.append({
                "title": "Dobrodošli nazaj",
                "description": "20% popust na glavni obrok",
                "discount": 20,
                "valid_days": 10
            })
        
        return offers
    
    def _determine_next_best_action(self, customer_data) -> str:
        """Določi najboljše naslednje dejanje"""
        segment, total_spent, visit_count, last_visit, preferences_json = customer_data
        
        if not last_visit:
            return "Pošlji dobrodošlico e-mail"
        
        days_since_visit = (datetime.now() - datetime.fromisoformat(last_visit)).days
        
        if days_since_visit > 60:
            return "Pošlji povabilo za vrnitev"
        elif days_since_visit > 30:
            return "Pošlji personalizirano ponudbo"
        elif visit_count > 10 and segment != "vip":
            return "Predlagaj nadgradnjo na VIP status"
        else:
            return "Pošlji informacije o novih ponudbah"
    
    def generate_crm_analytics(self) -> Dict[str, Any]:
        """Generiraj CRM analitiko"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Statistike strank
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_customers,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
                    COUNT(CASE WHEN status = 'vip' THEN 1 END) as vip_customers,
                    AVG(total_spent) as avg_spent,
                    AVG(visit_count) as avg_visits,
                    SUM(loyalty_points) as total_loyalty_points
                FROM customers
            ''')
            
            customer_stats = cursor.fetchone()
            
            # Segmentacija strank
            cursor.execute('''
                SELECT segment, COUNT(*), AVG(total_spent)
                FROM customers 
                GROUP BY segment
            ''')
            
            segment_stats = cursor.fetchall()
            
            # Promocijske statistike
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_promotions,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_promotions,
                    SUM(usage_count) as total_usage
                FROM promotions
            ''')
            
            promo_stats = cursor.fetchone()
            
            # Top stranke
            cursor.execute('''
                SELECT first_name, last_name, total_spent, visit_count
                FROM customers 
                ORDER BY total_spent DESC 
                LIMIT 10
            ''')
            
            top_customers = cursor.fetchall()
            
            return {
                "customer_statistics": {
                    "total_customers": customer_stats[0],
                    "active_customers": customer_stats[1],
                    "vip_customers": customer_stats[2],
                    "average_spent": round(customer_stats[3] or 0, 2),
                    "average_visits": round(customer_stats[4] or 0, 1),
                    "total_loyalty_points": customer_stats[5] or 0
                },
                "segment_distribution": [
                    {
                        "segment": segment[0],
                        "count": segment[1],
                        "avg_spent": round(segment[2] or 0, 2)
                    } for segment in segment_stats
                ],
                "promotion_statistics": {
                    "total_promotions": promo_stats[0],
                    "active_promotions": promo_stats[1],
                    "total_usage": promo_stats[2] or 0
                },
                "top_customers": [
                    {
                        "name": f"{customer[0]} {customer[1]}",
                        "total_spent": customer[2],
                        "visit_count": customer[3]
                    } for customer in top_customers
                ],
                "generated_at": datetime.now().isoformat()
            }
    
    def add_loyalty_program(self, program: LoyaltyProgram) -> Dict[str, Any]:
        """Dodaj lojalnostni program"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO loyalty_programs 
                    (program_id, name, description, points_per_euro, welcome_bonus,
                     tier_thresholds, tier_benefits, expiry_months, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    program.program_id,
                    program.name,
                    program.description,
                    program.points_per_euro,
                    program.welcome_bonus,
                    json.dumps(program.tier_thresholds),
                    json.dumps(program.tier_benefits),
                    program.expiry_months,
                    program.is_active,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "program_id": program.program_id,
                    "message": f"Lojalnostni program '{program.name}' uspešno dodan"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju lojalnostnega programa: {e}")
            return {"success": False, "error": str(e)}

# Primer uporabe
if __name__ == "__main__":
    crm = CRMIntegration()
    
    # Dodaj testno stranko
    customer = Customer(
        customer_id="CUST001",
        first_name="Marija",
        last_name="Novak",
        email="marija.novak@email.com",
        phone="+386 40 123 456",
        date_of_birth=date(1985, 5, 15),
        address={"street": "Trubarjeva 1", "city": "Ljubljana", "postal_code": "1000"},
        preferences={"favorite_cuisine": "italijanska", "dietary_restrictions": []},
        status=CustomerStatus.NEW,
        segment=CustomerSegment.STANDARD,
        loyalty_points=0,
        total_spent=0.0,
        visit_count=0,
        last_visit=None,
        acquisition_source="spletna stran"
    )
    
    result = crm.add_customer(customer)
    print(f"Dodajanje stranke: {result}")
    
    # Posodobi obisk
    visit_result = crm.update_customer_visit("CUST001", 45.50)
    print(f"Posodabljanje obiska: {visit_result}")
    
    # Ustvari promocijo
    promotion = Promotion(
        promotion_id="PROMO001",
        name="Jesenski popust",
        description="20% popust na vse glavne jedi",
        discount_type="percentage",
        discount_value=20.0,
        min_purchase_amount=30.0,
        valid_from=datetime.now(),
        valid_until=datetime.now() + timedelta(days=30),
        usage_limit=100,
        usage_count=0,
        target_segments=[CustomerSegment.STANDARD, CustomerSegment.PREMIUM],
        promo_code="JESEN20",
        is_active=True
    )
    
    promo_result = crm.create_promotion(promotion)
    print(f"Ustvarjanje promocije: {promo_result}")
    
    # Profil stranke
    profile = crm.get_customer_profile("CUST001")
    print(f"Profil stranke: {json.dumps(profile, indent=2, ensure_ascii=False)}")
    
    # Analitika
    analytics = crm.generate_crm_analytics()
    print(f"CRM analitika: {json.dumps(analytics, indent=2, ensure_ascii=False)}")