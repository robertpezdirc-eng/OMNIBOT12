"""
🎯 Personalization Engine - Sistem za personalizacijo ponudbe
VIP gostje, ponavljajoči se gostje, prilagojene izkušnje in priporočila
"""

import sqlite3
import json
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
from collections import defaultdict, Counter
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

logger = logging.getLogger(__name__)

class GuestTier(Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    VIP = "vip"

class PreferenceCategory(Enum):
    ROOM_TYPE = "room_type"
    AMENITIES = "amenities"
    DINING = "dining"
    ACTIVITIES = "activities"
    SERVICES = "services"
    COMMUNICATION = "communication"
    SPECIAL_REQUESTS = "special_requests"

class PersonalizationType(Enum):
    ROOM_UPGRADE = "room_upgrade"
    WELCOME_GIFT = "welcome_gift"
    DINING_OFFER = "dining_offer"
    ACTIVITY_SUGGESTION = "activity_suggestion"
    SPECIAL_SERVICE = "special_service"
    LOYALTY_REWARD = "loyalty_reward"
    BIRTHDAY_SURPRISE = "birthday_surprise"
    ANNIVERSARY_PACKAGE = "anniversary_package"

@dataclass
class GuestProfile:
    """Profil gosta"""
    guest_id: str
    email: str
    first_name: str
    last_name: str
    phone: str
    date_of_birth: date = None
    nationality: str = None
    language_preference: str = "sl"
    tier: GuestTier = GuestTier.BRONZE
    total_stays: int = 0
    total_spent: float = 0.0
    average_rating_given: float = 0.0
    last_stay_date: date = None
    preferences: Dict[PreferenceCategory, List[str]] = None
    special_occasions: List[Dict[str, Any]] = None
    dietary_restrictions: List[str] = None
    accessibility_needs: List[str] = None
    communication_preferences: Dict[str, bool] = None
    created_at: datetime = None
    updated_at: datetime = None

@dataclass
class StayHistory:
    """Zgodovina bivanja"""
    stay_id: str
    guest_id: str
    check_in_date: date
    check_out_date: date
    room_type: str
    room_number: str
    total_amount: float
    services_used: List[str]
    amenities_used: List[str]
    dining_preferences: List[str]
    activities_participated: List[str]
    special_requests: List[str]
    satisfaction_rating: int = None
    feedback: str = None
    created_at: datetime = None

@dataclass
class PersonalizationRule:
    """Pravilo personalizacije"""
    rule_id: str
    name: str
    description: str
    conditions: Dict[str, Any]
    actions: List[Dict[str, Any]]
    priority: int
    is_active: bool
    tier_restrictions: List[GuestTier] = None
    created_at: datetime = None

@dataclass
class PersonalizedOffer:
    """Personalizirana ponudba"""
    offer_id: str
    guest_id: str
    offer_type: PersonalizationType
    title: str
    description: str
    value: float
    validity_start: datetime
    validity_end: datetime
    conditions: Dict[str, Any]
    is_claimed: bool = False
    claimed_at: datetime = None
    created_at: datetime = None

@dataclass
class GuestInsight:
    """Vpogled o gostu"""
    insight_id: str
    guest_id: str
    insight_type: str
    insight_text: str
    confidence: float
    supporting_data: Dict[str, Any]
    actionable: bool
    created_at: datetime

class PersonalizationEngine:
    """Glavni sistem za personalizacijo"""
    
    def __init__(self, db_path: str = "personalization.db"):
        self.db_path = db_path
        self._init_database()
        self._init_default_rules()
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela profilov gostov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS guest_profiles (
                    guest_id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    phone TEXT,
                    date_of_birth TEXT,
                    nationality TEXT,
                    language_preference TEXT DEFAULT 'sl',
                    tier TEXT DEFAULT 'bronze',
                    total_stays INTEGER DEFAULT 0,
                    total_spent REAL DEFAULT 0.0,
                    average_rating_given REAL DEFAULT 0.0,
                    last_stay_date TEXT,
                    preferences TEXT,
                    special_occasions TEXT,
                    dietary_restrictions TEXT,
                    accessibility_needs TEXT,
                    communication_preferences TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # Tabela zgodovine bivanja
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS stay_history (
                    stay_id TEXT PRIMARY KEY,
                    guest_id TEXT NOT NULL,
                    check_in_date TEXT NOT NULL,
                    check_out_date TEXT NOT NULL,
                    room_type TEXT NOT NULL,
                    room_number TEXT,
                    total_amount REAL NOT NULL,
                    services_used TEXT,
                    amenities_used TEXT,
                    dining_preferences TEXT,
                    activities_participated TEXT,
                    special_requests TEXT,
                    satisfaction_rating INTEGER,
                    feedback TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (guest_id) REFERENCES guest_profiles (guest_id)
                )
            ''')
            
            # Tabela pravil personalizacije
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS personalization_rules (
                    rule_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    conditions TEXT NOT NULL,
                    actions TEXT NOT NULL,
                    priority INTEGER DEFAULT 1,
                    is_active BOOLEAN DEFAULT TRUE,
                    tier_restrictions TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela personaliziranih ponudb
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS personalized_offers (
                    offer_id TEXT PRIMARY KEY,
                    guest_id TEXT NOT NULL,
                    offer_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    value REAL NOT NULL,
                    validity_start TEXT NOT NULL,
                    validity_end TEXT NOT NULL,
                    conditions TEXT,
                    is_claimed BOOLEAN DEFAULT FALSE,
                    claimed_at TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (guest_id) REFERENCES guest_profiles (guest_id)
                )
            ''')
            
            # Tabela vpogledov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS guest_insights (
                    insight_id TEXT PRIMARY KEY,
                    guest_id TEXT NOT NULL,
                    insight_type TEXT NOT NULL,
                    insight_text TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    supporting_data TEXT,
                    actionable BOOLEAN DEFAULT TRUE,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (guest_id) REFERENCES guest_profiles (guest_id)
                )
            ''')
            
            # Tabela interakcij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS guest_interactions (
                    interaction_id TEXT PRIMARY KEY,
                    guest_id TEXT NOT NULL,
                    interaction_type TEXT NOT NULL,
                    interaction_data TEXT,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (guest_id) REFERENCES guest_profiles (guest_id)
                )
            ''')
            
            conn.commit()
            logger.info("🎯 Personalization baza podatkov inicializirana")
    
    def _init_default_rules(self):
        """Inicializacija privzetih pravil personalizacije"""
        default_rules = [
            {
                "rule_id": "VIP_WELCOME",
                "name": "VIP Dobrodošlica",
                "description": "Posebna dobrodošlica za VIP goste",
                "conditions": {"tier": ["vip", "platinum"]},
                "actions": [
                    {"type": "room_upgrade", "value": "suite"},
                    {"type": "welcome_gift", "value": "champagne_flowers"},
                    {"type": "personal_concierge", "value": True}
                ],
                "priority": 1
            },
            {
                "rule_id": "REPEAT_GUEST_LOYALTY",
                "name": "Zvestoba ponavljajočih gostov",
                "description": "Nagrade za goste z več kot 5 bivanj",
                "conditions": {"total_stays": {"min": 5}},
                "actions": [
                    {"type": "loyalty_discount", "value": 10},
                    {"type": "late_checkout", "value": "14:00"},
                    {"type": "welcome_drink", "value": True}
                ],
                "priority": 2
            },
            {
                "rule_id": "BIRTHDAY_SURPRISE",
                "name": "Rojstnodnevno presenečenje",
                "description": "Posebno presenečenje za rojstni dan",
                "conditions": {"special_occasion": "birthday"},
                "actions": [
                    {"type": "birthday_cake", "value": True},
                    {"type": "room_decoration", "value": "birthday"},
                    {"type": "complimentary_dessert", "value": True}
                ],
                "priority": 1
            },
            {
                "rule_id": "ANNIVERSARY_PACKAGE",
                "name": "Obletnica paketa",
                "description": "Romantični paket za obletnice",
                "conditions": {"special_occasion": "anniversary"},
                "actions": [
                    {"type": "romantic_setup", "value": True},
                    {"type": "champagne_service", "value": True},
                    {"type": "couples_spa", "value": "discount_20"}
                ],
                "priority": 1
            },
            {
                "rule_id": "BUSINESS_TRAVELER",
                "name": "Poslovni potnik",
                "description": "Prilagoditve za poslovne potnike",
                "conditions": {"preferences": {"services": ["business_center", "early_checkin"]}},
                "actions": [
                    {"type": "express_checkin", "value": True},
                    {"type": "business_amenities", "value": True},
                    {"type": "quiet_room", "value": True}
                ],
                "priority": 2
            }
        ]
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                for rule in default_rules:
                    cursor.execute('''
                        INSERT OR IGNORE INTO personalization_rules 
                        (rule_id, name, description, conditions, actions, priority, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        rule["rule_id"],
                        rule["name"],
                        rule["description"],
                        json.dumps(rule["conditions"]),
                        json.dumps(rule["actions"]),
                        rule["priority"],
                        datetime.now().isoformat()
                    ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji privzetih pravil: {e}")
    
    def create_guest_profile(self, profile: GuestProfile) -> Dict[str, Any]:
        """Ustvari profil gosta"""
        try:
            profile.guest_id = self._generate_guest_id(profile.email)
            profile.created_at = datetime.now()
            profile.updated_at = datetime.now()
            
            if not profile.preferences:
                profile.preferences = {}
            if not profile.special_occasions:
                profile.special_occasions = []
            if not profile.dietary_restrictions:
                profile.dietary_restrictions = []
            if not profile.accessibility_needs:
                profile.accessibility_needs = []
            if not profile.communication_preferences:
                profile.communication_preferences = {
                    "email": True,
                    "sms": False,
                    "push": True,
                    "marketing": True
                }
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO guest_profiles 
                    (guest_id, email, first_name, last_name, phone, date_of_birth,
                     nationality, language_preference, tier, total_stays, total_spent,
                     average_rating_given, last_stay_date, preferences, special_occasions,
                     dietary_restrictions, accessibility_needs, communication_preferences,
                     created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    profile.guest_id,
                    profile.email,
                    profile.first_name,
                    profile.last_name,
                    profile.phone,
                    profile.date_of_birth.isoformat() if profile.date_of_birth else None,
                    profile.nationality,
                    profile.language_preference,
                    profile.tier.value,
                    profile.total_stays,
                    profile.total_spent,
                    profile.average_rating_given,
                    profile.last_stay_date.isoformat() if profile.last_stay_date else None,
                    json.dumps({k.value if hasattr(k, 'value') else k: v for k, v in profile.preferences.items()}),
                    json.dumps(profile.special_occasions),
                    json.dumps(profile.dietary_restrictions),
                    json.dumps(profile.accessibility_needs),
                    json.dumps(profile.communication_preferences),
                    profile.created_at.isoformat(),
                    profile.updated_at.isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "guest_id": profile.guest_id,
                    "message": "Profil gosta uspešno ustvarjen"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju profila gosta: {e}")
            return {"success": False, "error": str(e)}
    
    def _generate_guest_id(self, email: str) -> str:
        """Generiraj ID gosta"""
        return f"GUEST_{hashlib.md5(email.encode()).hexdigest()[:8].upper()}"
    
    def add_stay_history(self, stay: StayHistory) -> Dict[str, Any]:
        """Dodaj zgodovino bivanja"""
        try:
            stay.created_at = datetime.now()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO stay_history 
                    (stay_id, guest_id, check_in_date, check_out_date, room_type,
                     room_number, total_amount, services_used, amenities_used,
                     dining_preferences, activities_participated, special_requests,
                     satisfaction_rating, feedback, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    stay.stay_id,
                    stay.guest_id,
                    stay.check_in_date.isoformat(),
                    stay.check_out_date.isoformat(),
                    stay.room_type,
                    stay.room_number,
                    stay.total_amount,
                    json.dumps(stay.services_used),
                    json.dumps(stay.amenities_used),
                    json.dumps(stay.dining_preferences),
                    json.dumps(stay.activities_participated),
                    json.dumps(stay.special_requests),
                    stay.satisfaction_rating,
                    stay.feedback,
                    stay.created_at.isoformat()
                ))
                
                # Posodobi profil gosta
                self._update_guest_profile_from_stay(stay)
                
                conn.commit()
                
                return {
                    "success": True,
                    "stay_id": stay.stay_id,
                    "message": "Zgodovina bivanja dodana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju zgodovine bivanja: {e}")
            return {"success": False, "error": str(e)}
    
    def _update_guest_profile_from_stay(self, stay: StayHistory):
        """Posodobi profil gosta na podlagi bivanja"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi trenutni profil
                cursor.execute('''
                    SELECT total_stays, total_spent, preferences 
                    FROM guest_profiles WHERE guest_id = ?
                ''', (stay.guest_id,))
                
                result = cursor.fetchone()
                if not result:
                    return
                
                total_stays, total_spent, preferences_json = result
                preferences = json.loads(preferences_json) if preferences_json else {}
                
                # Posodobi statistike
                new_total_stays = total_stays + 1
                new_total_spent = total_spent + stay.total_amount
                
                # Posodobi preference na podlagi bivanja
                if stay.room_type:
                    if 'room_type' not in preferences:
                        preferences['room_type'] = []
                    if stay.room_type not in preferences['room_type']:
                        preferences['room_type'].append(stay.room_type)
                
                if stay.amenities_used:
                    if 'amenities' not in preferences:
                        preferences['amenities'] = []
                    for amenity in stay.amenities_used:
                        if amenity not in preferences['amenities']:
                            preferences['amenities'].append(amenity)
                
                if stay.dining_preferences:
                    if 'dining' not in preferences:
                        preferences['dining'] = []
                    for dining in stay.dining_preferences:
                        if dining not in preferences['dining']:
                            preferences['dining'].append(dining)
                
                # Določi novi tier
                new_tier = self._calculate_guest_tier(new_total_stays, new_total_spent)
                
                # Posodobi profil
                cursor.execute('''
                    UPDATE guest_profiles 
                    SET total_stays = ?, total_spent = ?, tier = ?, 
                        last_stay_date = ?, preferences = ?, updated_at = ?
                    WHERE guest_id = ?
                ''', (
                    new_total_stays,
                    new_total_spent,
                    new_tier.value,
                    stay.check_out_date.isoformat(),
                    json.dumps(preferences),
                    datetime.now().isoformat(),
                    stay.guest_id
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju profila gosta: {e}")
    
    def _calculate_guest_tier(self, total_stays: int, total_spent: float) -> GuestTier:
        """Izračunaj tier gosta"""
        if total_stays >= 20 or total_spent >= 10000:
            return GuestTier.VIP
        elif total_stays >= 15 or total_spent >= 7500:
            return GuestTier.PLATINUM
        elif total_stays >= 10 or total_spent >= 5000:
            return GuestTier.GOLD
        elif total_stays >= 5 or total_spent >= 2500:
            return GuestTier.SILVER
        else:
            return GuestTier.BRONZE
    
    def generate_personalized_offers(self, guest_id: str) -> Dict[str, Any]:
        """Generiraj personalizirane ponudbe za gosta"""
        try:
            # Pridobi profil gosta
            profile = self._get_guest_profile(guest_id)
            if not profile:
                return {"success": False, "error": "Profil gosta ni najden"}
            
            # Pridobi zgodovino bivanja
            stay_history = self._get_stay_history(guest_id)
            
            # Analiziraj vzorce in preference
            insights = self._analyze_guest_patterns(profile, stay_history)
            
            # Generiraj ponudbe na podlagi pravil
            offers = []
            
            # Preveri vsa pravila personalizacije
            rules = self._get_active_personalization_rules()
            
            for rule in rules:
                if self._evaluate_rule_conditions(rule, profile, stay_history, insights):
                    rule_offers = self._generate_offers_from_rule(rule, profile)
                    offers.extend(rule_offers)
            
            # Dodaj dodatne ponudbe na podlagi AI analiz
            ai_offers = self._generate_ai_based_offers(profile, stay_history, insights)
            offers.extend(ai_offers)
            
            # Shrani ponudbe
            saved_offers = []
            for offer in offers:
                save_result = self._save_personalized_offer(offer)
                if save_result["success"]:
                    saved_offers.append(offer)
            
            return {
                "success": True,
                "guest_id": guest_id,
                "offers_count": len(saved_offers),
                "offers": [
                    {
                        "offer_id": offer.offer_id,
                        "type": offer.offer_type.value,
                        "title": offer.title,
                        "description": offer.description,
                        "value": offer.value,
                        "validity_end": offer.validity_end.isoformat()
                    }
                    for offer in saved_offers
                ],
                "insights": insights,
                "message": f"Generirane {len(saved_offers)} personalizirane ponudbe"
            }
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju personaliziranih ponudb: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_guest_profile(self, guest_id: str) -> Optional[GuestProfile]:
        """Pridobi profil gosta"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM guest_profiles WHERE guest_id = ?
                ''', (guest_id,))
                
                result = cursor.fetchone()
                if not result:
                    return None
                
                # Pretvori v GuestProfile objekt
                profile_data = {
                    'guest_id': result[0],
                    'email': result[1],
                    'first_name': result[2],
                    'last_name': result[3],
                    'phone': result[4],
                    'date_of_birth': datetime.fromisoformat(result[5]).date() if result[5] else None,
                    'nationality': result[6],
                    'language_preference': result[7],
                    'tier': GuestTier(result[8]),
                    'total_stays': result[9],
                    'total_spent': result[10],
                    'average_rating_given': result[11],
                    'last_stay_date': datetime.fromisoformat(result[12]).date() if result[12] else None,
                    'preferences': json.loads(result[13]) if result[13] else {},
                    'special_occasions': json.loads(result[14]) if result[14] else [],
                    'dietary_restrictions': json.loads(result[15]) if result[15] else [],
                    'accessibility_needs': json.loads(result[16]) if result[16] else [],
                    'communication_preferences': json.loads(result[17]) if result[17] else {},
                    'created_at': datetime.fromisoformat(result[18]),
                    'updated_at': datetime.fromisoformat(result[19])
                }
                
                return GuestProfile(**profile_data)
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju profila gosta: {e}")
            return None
    
    def _get_stay_history(self, guest_id: str) -> List[StayHistory]:
        """Pridobi zgodovino bivanja gosta"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM stay_history 
                    WHERE guest_id = ? 
                    ORDER BY check_in_date DESC
                ''', (guest_id,))
                
                results = cursor.fetchall()
                
                stays = []
                for result in results:
                    stay_data = {
                        'stay_id': result[0],
                        'guest_id': result[1],
                        'check_in_date': datetime.fromisoformat(result[2]).date(),
                        'check_out_date': datetime.fromisoformat(result[3]).date(),
                        'room_type': result[4],
                        'room_number': result[5],
                        'total_amount': result[6],
                        'services_used': json.loads(result[7]) if result[7] else [],
                        'amenities_used': json.loads(result[8]) if result[8] else [],
                        'dining_preferences': json.loads(result[9]) if result[9] else [],
                        'activities_participated': json.loads(result[10]) if result[10] else [],
                        'special_requests': json.loads(result[11]) if result[11] else [],
                        'satisfaction_rating': result[12],
                        'feedback': result[13],
                        'created_at': datetime.fromisoformat(result[14])
                    }
                    stays.append(StayHistory(**stay_data))
                
                return stays
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju zgodovine bivanja: {e}")
            return []
    
    def _analyze_guest_patterns(self, profile: GuestProfile, 
                               stay_history: List[StayHistory]) -> Dict[str, Any]:
        """Analiziraj vzorce gosta"""
        insights = {
            "behavioral_patterns": {},
            "preferences": {},
            "spending_patterns": {},
            "satisfaction_trends": {},
            "recommendations": []
        }
        
        if not stay_history:
            return insights
        
        # Analiziraj vzorce bivanja
        room_types = [stay.room_type for stay in stay_history]
        most_preferred_room = Counter(room_types).most_common(1)[0][0] if room_types else None
        
        # Analiziraj storitve
        all_services = []
        all_amenities = []
        for stay in stay_history:
            all_services.extend(stay.services_used)
            all_amenities.extend(stay.amenities_used)
        
        preferred_services = Counter(all_services).most_common(3)
        preferred_amenities = Counter(all_amenities).most_common(3)
        
        # Analiziraj porabo
        amounts = [stay.total_amount for stay in stay_history]
        avg_spending = np.mean(amounts) if amounts else 0
        spending_trend = "increasing" if len(amounts) > 1 and amounts[0] > amounts[-1] else "stable"
        
        # Analiziraj zadovoljstvo
        ratings = [stay.satisfaction_rating for stay in stay_history if stay.satisfaction_rating]
        avg_satisfaction = np.mean(ratings) if ratings else 0
        
        # Analiziraj sezonske vzorce
        months = [stay.check_in_date.month for stay in stay_history]
        preferred_months = Counter(months).most_common(2)
        
        insights["behavioral_patterns"] = {
            "most_preferred_room": most_preferred_room,
            "preferred_services": [service for service, count in preferred_services],
            "preferred_amenities": [amenity for amenity, count in preferred_amenities],
            "preferred_months": [month for month, count in preferred_months],
            "average_stay_duration": np.mean([(stay.check_out_date - stay.check_in_date).days for stay in stay_history])
        }
        
        insights["spending_patterns"] = {
            "average_spending": avg_spending,
            "spending_trend": spending_trend,
            "total_lifetime_value": profile.total_spent
        }
        
        insights["satisfaction_trends"] = {
            "average_satisfaction": avg_satisfaction,
            "satisfaction_trend": "improving" if len(ratings) > 1 and ratings[0] > ratings[-1] else "stable"
        }
        
        # Generiraj priporočila
        recommendations = []
        
        if profile.tier in [GuestTier.GOLD, GuestTier.PLATINUM, GuestTier.VIP]:
            recommendations.append("Ponudi VIP storitve in nadgradnje")
        
        if avg_satisfaction < 4.0:
            recommendations.append("Posebna pozornost za izboljšanje izkušnje")
        
        if spending_trend == "increasing":
            recommendations.append("Ponudi premium pakete in dodatne storitve")
        
        if profile.total_stays >= 5:
            recommendations.append("Aktiviraj program zvestobe")
        
        insights["recommendations"] = recommendations
        
        return insights
    
    def _get_active_personalization_rules(self) -> List[Dict[str, Any]]:
        """Pridobi aktivna pravila personalizacije"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM personalization_rules 
                    WHERE is_active = TRUE 
                    ORDER BY priority ASC
                ''')
                
                results = cursor.fetchall()
                
                rules = []
                for result in results:
                    rule = {
                        'rule_id': result[0],
                        'name': result[1],
                        'description': result[2],
                        'conditions': json.loads(result[3]),
                        'actions': json.loads(result[4]),
                        'priority': result[5],
                        'is_active': result[6],
                        'tier_restrictions': json.loads(result[7]) if result[7] else None
                    }
                    rules.append(rule)
                
                return rules
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju pravil: {e}")
            return []
    
    def _evaluate_rule_conditions(self, rule: Dict[str, Any], 
                                 profile: GuestProfile,
                                 stay_history: List[StayHistory],
                                 insights: Dict[str, Any]) -> bool:
        """Oceni ali so izpolnjeni pogoji pravila"""
        try:
            conditions = rule['conditions']
            
            # Preveri tier omejitve
            if rule.get('tier_restrictions'):
                if profile.tier.value not in rule['tier_restrictions']:
                    return False
            
            # Preveri tier pogoje
            if 'tier' in conditions:
                if profile.tier.value not in conditions['tier']:
                    return False
            
            # Preveri število bivanj
            if 'total_stays' in conditions:
                stay_condition = conditions['total_stays']
                if isinstance(stay_condition, dict):
                    if 'min' in stay_condition and profile.total_stays < stay_condition['min']:
                        return False
                    if 'max' in stay_condition and profile.total_stays > stay_condition['max']:
                        return False
                elif isinstance(stay_condition, int):
                    if profile.total_stays < stay_condition:
                        return False
            
            # Preveri posebne priložnosti
            if 'special_occasion' in conditions:
                occasion_type = conditions['special_occasion']
                today = date.today()
                
                if occasion_type == "birthday" and profile.date_of_birth:
                    # Preveri če je rojstni dan v naslednjih 7 dneh
                    birthday_this_year = profile.date_of_birth.replace(year=today.year)
                    if birthday_this_year < today:
                        birthday_this_year = birthday_this_year.replace(year=today.year + 1)
                    
                    days_to_birthday = (birthday_this_year - today).days
                    if days_to_birthday > 7:
                        return False
                
                elif occasion_type == "anniversary":
                    # Preveri če je obletnica prvega bivanja
                    if stay_history:
                        first_stay = min(stay_history, key=lambda x: x.check_in_date)
                        anniversary_date = first_stay.check_in_date.replace(year=today.year)
                        if anniversary_date < today:
                            anniversary_date = anniversary_date.replace(year=today.year + 1)
                        
                        days_to_anniversary = (anniversary_date - today).days
                        if days_to_anniversary > 7:
                            return False
            
            # Preveri preference
            if 'preferences' in conditions:
                pref_conditions = conditions['preferences']
                for pref_category, required_prefs in pref_conditions.items():
                    guest_prefs = profile.preferences.get(pref_category, [])
                    if not any(pref in guest_prefs for pref in required_prefs):
                        return False
            
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri ocenjevanju pogojev pravila: {e}")
            return False
    
    def _generate_offers_from_rule(self, rule: Dict[str, Any], 
                                  profile: GuestProfile) -> List[PersonalizedOffer]:
        """Generiraj ponudbe na podlagi pravila"""
        offers = []
        
        try:
            for action in rule['actions']:
                action_type = action['type']
                action_value = action['value']
                
                offer_id = f"OFFER_{profile.guest_id}_{rule['rule_id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                
                if action_type == "room_upgrade":
                    offer = PersonalizedOffer(
                        offer_id=offer_id,
                        guest_id=profile.guest_id,
                        offer_type=PersonalizationType.ROOM_UPGRADE,
                        title="Brezplačna nadgradnja sobe",
                        description=f"Nadgradnja na {action_value} sobo brez dodatnih stroškov",
                        value=0.0,
                        validity_start=datetime.now(),
                        validity_end=datetime.now() + timedelta(days=30),
                        conditions={"room_type": action_value},
                        created_at=datetime.now()
                    )
                    offers.append(offer)
                
                elif action_type == "welcome_gift":
                    offer = PersonalizedOffer(
                        offer_id=offer_id,
                        guest_id=profile.guest_id,
                        offer_type=PersonalizationType.WELCOME_GIFT,
                        title="Dobrodošli dar",
                        description=f"Posebni dar ob prihodu: {action_value}",
                        value=50.0,
                        validity_start=datetime.now(),
                        validity_end=datetime.now() + timedelta(days=60),
                        conditions={"gift_type": action_value},
                        created_at=datetime.now()
                    )
                    offers.append(offer)
                
                elif action_type == "loyalty_discount":
                    offer = PersonalizedOffer(
                        offer_id=offer_id,
                        guest_id=profile.guest_id,
                        offer_type=PersonalizationType.LOYALTY_REWARD,
                        title=f"{action_value}% popust za zvestobo",
                        description=f"Ekskluzivni {action_value}% popust za zveste goste",
                        value=float(action_value),
                        validity_start=datetime.now(),
                        validity_end=datetime.now() + timedelta(days=90),
                        conditions={"discount_percentage": action_value},
                        created_at=datetime.now()
                    )
                    offers.append(offer)
                
                elif action_type == "birthday_cake":
                    offer = PersonalizedOffer(
                        offer_id=offer_id,
                        guest_id=profile.guest_id,
                        offer_type=PersonalizationType.BIRTHDAY_SURPRISE,
                        title="Rojstnodnevna torta",
                        description="Brezplačna rojstnodnevna torta v vaši sobi",
                        value=25.0,
                        validity_start=datetime.now(),
                        validity_end=datetime.now() + timedelta(days=14),
                        conditions={"occasion": "birthday"},
                        created_at=datetime.now()
                    )
                    offers.append(offer)
                
                elif action_type == "romantic_setup":
                    offer = PersonalizedOffer(
                        offer_id=offer_id,
                        guest_id=profile.guest_id,
                        offer_type=PersonalizationType.ANNIVERSARY_PACKAGE,
                        title="Romantična ureditev sobe",
                        description="Romantična ureditev z rožami, svečami in šampanjcem",
                        value=75.0,
                        validity_start=datetime.now(),
                        validity_end=datetime.now() + timedelta(days=30),
                        conditions={"setup_type": "romantic"},
                        created_at=datetime.now()
                    )
                    offers.append(offer)
        
        except Exception as e:
            logger.error(f"Napaka pri generiranju ponudb iz pravila: {e}")
        
        return offers
    
    def _generate_ai_based_offers(self, profile: GuestProfile,
                                 stay_history: List[StayHistory],
                                 insights: Dict[str, Any]) -> List[PersonalizedOffer]:
        """Generiraj ponudbe na podlagi AI analiz"""
        offers = []
        
        try:
            # Ponudba na podlagi preteklih preferenc
            if insights["behavioral_patterns"].get("preferred_services"):
                preferred_service = insights["behavioral_patterns"]["preferred_services"][0]
                
                offer_id = f"AI_OFFER_{profile.guest_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                
                offer = PersonalizedOffer(
                    offer_id=offer_id,
                    guest_id=profile.guest_id,
                    offer_type=PersonalizationType.SPECIAL_SERVICE,
                    title=f"Vaša priljubljena storitev: {preferred_service}",
                    description=f"20% popust na {preferred_service} - vašo najpriljubljenejšo storitev",
                    value=20.0,
                    validity_start=datetime.now(),
                    validity_end=datetime.now() + timedelta(days=45),
                    conditions={"service": preferred_service, "discount": 20},
                    created_at=datetime.now()
                )
                offers.append(offer)
            
            # Ponudba na podlagi sezonskih vzorcev
            if insights["behavioral_patterns"].get("preferred_months"):
                current_month = datetime.now().month
                preferred_months = [month for month, _ in Counter(insights["behavioral_patterns"]["preferred_months"]).most_common(2)]
                
                if current_month in preferred_months:
                    offer_id = f"SEASONAL_OFFER_{profile.guest_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                    
                    offer = PersonalizedOffer(
                        offer_id=offer_id,
                        guest_id=profile.guest_id,
                        offer_type=PersonalizationType.SPECIAL_SERVICE,
                        title="Sezonska ponudba",
                        description="Posebna ponudba v vašem priljubljenem mesecu za obisk",
                        value=15.0,
                        validity_start=datetime.now(),
                        validity_end=datetime.now() + timedelta(days=30),
                        conditions={"seasonal_discount": 15},
                        created_at=datetime.now()
                    )
                    offers.append(offer)
            
            # Ponudba za povečanje zadovoljstva
            if insights["satisfaction_trends"].get("average_satisfaction", 0) < 4.0:
                offer_id = f"SATISFACTION_OFFER_{profile.guest_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                
                offer = PersonalizedOffer(
                    offer_id=offer_id,
                    guest_id=profile.guest_id,
                    offer_type=PersonalizationType.SPECIAL_SERVICE,
                    title="Posebna pozornost",
                    description="Brezplačna wellness storitev za izboljšanje vaše izkušnje",
                    value=40.0,
                    validity_start=datetime.now(),
                    validity_end=datetime.now() + timedelta(days=60),
                    conditions={"wellness_service": True},
                    created_at=datetime.now()
                )
                offers.append(offer)
        
        except Exception as e:
            logger.error(f"Napaka pri generiranju AI ponudb: {e}")
        
        return offers
    
    def _save_personalized_offer(self, offer: PersonalizedOffer) -> Dict[str, Any]:
        """Shrani personalizirano ponudbo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO personalized_offers 
                    (offer_id, guest_id, offer_type, title, description, value,
                     validity_start, validity_end, conditions, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    offer.offer_id,
                    offer.guest_id,
                    offer.offer_type.value,
                    offer.title,
                    offer.description,
                    offer.value,
                    offer.validity_start.isoformat(),
                    offer.validity_end.isoformat(),
                    json.dumps(offer.conditions),
                    offer.created_at.isoformat()
                ))
                
                conn.commit()
                
                return {"success": True, "offer_id": offer.offer_id}
                
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju ponudbe: {e}")
            return {"success": False, "error": str(e)}
    
    def get_guest_recommendations(self, guest_id: str) -> Dict[str, Any]:
        """Pridobi priporočila za gosta"""
        try:
            profile = self._get_guest_profile(guest_id)
            if not profile:
                return {"success": False, "error": "Profil gosta ni najden"}
            
            stay_history = self._get_stay_history(guest_id)
            insights = self._analyze_guest_patterns(profile, stay_history)
            
            # Generiraj priporočila
            recommendations = {
                "room_recommendations": self._get_room_recommendations(profile, stay_history),
                "service_recommendations": self._get_service_recommendations(profile, stay_history),
                "dining_recommendations": self._get_dining_recommendations(profile, stay_history),
                "activity_recommendations": self._get_activity_recommendations(profile, stay_history),
                "upsell_opportunities": self._get_upsell_opportunities(profile, insights)
            }
            
            return {
                "success": True,
                "guest_id": guest_id,
                "guest_name": f"{profile.first_name} {profile.last_name}",
                "tier": profile.tier.value,
                "recommendations": recommendations,
                "insights": insights
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju priporočil: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_room_recommendations(self, profile: GuestProfile, 
                                 stay_history: List[StayHistory]) -> List[Dict[str, Any]]:
        """Pridobi priporočila za sobe"""
        recommendations = []
        
        if stay_history:
            # Analiziraj pretekle izbire sob
            room_types = [stay.room_type for stay in stay_history]
            most_common_room = Counter(room_types).most_common(1)[0][0]
            
            recommendations.append({
                "type": "preferred_room",
                "title": f"Vaša priljubljena soba: {most_common_room}",
                "description": f"Na podlagi vaše zgodovine najpogosteje izbirate {most_common_room}",
                "confidence": 0.8
            })
            
            # Predlagaj nadgradnjo glede na tier
            if profile.tier in [GuestTier.GOLD, GuestTier.PLATINUM, GuestTier.VIP]:
                recommendations.append({
                    "type": "upgrade_suggestion",
                    "title": "Priporočena nadgradnja",
                    "description": f"Kot {profile.tier.value} gost imate možnost brezplačne nadgradnje",
                    "confidence": 0.9
                })
        
        return recommendations
    
    def _get_service_recommendations(self, profile: GuestProfile,
                                   stay_history: List[StayHistory]) -> List[Dict[str, Any]]:
        """Pridobi priporočila za storitve"""
        recommendations = []
        
        if stay_history:
            # Analiziraj uporabljene storitve
            all_services = []
            for stay in stay_history:
                all_services.extend(stay.services_used)
            
            if all_services:
                service_counts = Counter(all_services)
                top_service = service_counts.most_common(1)[0][0]
                
                recommendations.append({
                    "type": "preferred_service",
                    "title": f"Vaša priljubljena storitev: {top_service}",
                    "description": f"Pogosto uporabljate {top_service} - rezervirajte vnaprej",
                    "confidence": 0.7
                })
        
        # Priporoči storitve glede na tier
        if profile.tier == GuestTier.VIP:
            recommendations.append({
                "type": "vip_service",
                "title": "VIP concierge storitev",
                "description": "Osebni concierge za vse vaše potrebe",
                "confidence": 1.0
            })
        
        return recommendations
    
    def _get_dining_recommendations(self, profile: GuestProfile,
                                  stay_history: List[StayHistory]) -> List[Dict[str, Any]]:
        """Pridobi priporočila za prehrano"""
        recommendations = []
        
        if profile.dietary_restrictions:
            recommendations.append({
                "type": "dietary_accommodation",
                "title": "Prilagojeni meni",
                "description": f"Posebni meni za {', '.join(profile.dietary_restrictions)}",
                "confidence": 1.0
            })
        
        if stay_history:
            # Analiziraj prehranske preference
            all_dining = []
            for stay in stay_history:
                all_dining.extend(stay.dining_preferences)
            
            if all_dining:
                dining_counts = Counter(all_dining)
                top_dining = dining_counts.most_common(1)[0][0]
                
                recommendations.append({
                    "type": "preferred_cuisine",
                    "title": f"Vaša priljubljena kuhinja: {top_dining}",
                    "description": f"Priporočamo restavracijo z {top_dining} kuhinjo",
                    "confidence": 0.8
                })
        
        return recommendations
    
    def _get_activity_recommendations(self, profile: GuestProfile,
                                    stay_history: List[StayHistory]) -> List[Dict[str, Any]]:
        """Pridobi priporočila za aktivnosti"""
        recommendations = []
        
        if stay_history:
            # Analiziraj pretekle aktivnosti
            all_activities = []
            for stay in stay_history:
                all_activities.extend(stay.activities_participated)
            
            if all_activities:
                activity_counts = Counter(all_activities)
                top_activity = activity_counts.most_common(1)[0][0]
                
                recommendations.append({
                    "type": "preferred_activity",
                    "title": f"Vaša priljubljena aktivnost: {top_activity}",
                    "description": f"Rezervirajte {top_activity} - vedno vam je všeč",
                    "confidence": 0.8
                })
        
        # Sezonska priporočila
        current_month = datetime.now().month
        if current_month in [12, 1, 2]:  # Zima
            recommendations.append({
                "type": "seasonal_activity",
                "title": "Zimske aktivnosti",
                "description": "Wellness center, notranji bazen, spa tretmaji",
                "confidence": 0.6
            })
        elif current_month in [6, 7, 8]:  # Poletje
            recommendations.append({
                "type": "seasonal_activity",
                "title": "Poletne aktivnosti",
                "description": "Zunanji bazen, tenis, pohodništvo, kolesarjenje",
                "confidence": 0.6
            })
        
        return recommendations
    
    def _get_upsell_opportunities(self, profile: GuestProfile,
                                 insights: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Pridobi priložnosti za dodatno prodajo"""
        opportunities = []
        
        # Glede na tier
        if profile.tier in [GuestTier.SILVER, GuestTier.GOLD]:
            opportunities.append({
                "type": "tier_upgrade",
                "title": "Nadgradnja na višji tier",
                "description": f"Samo še {5 - (profile.total_stays % 5)} bivanj do naslednjega nivoja",
                "potential_value": 200.0,
                "confidence": 0.7
            })
        
        # Glede na porabo
        avg_spending = insights.get("spending_patterns", {}).get("average_spending", 0)
        if avg_spending > 150:
            opportunities.append({
                "type": "premium_package",
                "title": "Premium paket",
                "description": "Ekskluzivni paket s premium storitvami",
                "potential_value": avg_spending * 0.3,
                "confidence": 0.6
            })
        
        # Glede na zadovoljstvo
        avg_satisfaction = insights.get("satisfaction_trends", {}).get("average_satisfaction", 0)
        if avg_satisfaction >= 4.5:
            opportunities.append({
                "type": "loyalty_program",
                "title": "Program zvestobe",
                "description": "Pridružite se ekskluzivnemu programu zvestobe",
                "potential_value": 100.0,
                "confidence": 0.8
            })
        
        return opportunities
    
    def get_personalization_dashboard(self) -> Dict[str, Any]:
        """Pridobi podatke za dashboard personalizacije"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Osnovne statistike
                cursor.execute('''
                    SELECT 
                        COUNT(*) as total_guests,
                        COUNT(CASE WHEN tier = 'vip' THEN 1 END) as vip_guests,
                        COUNT(CASE WHEN tier = 'platinum' THEN 1 END) as platinum_guests,
                        COUNT(CASE WHEN tier = 'gold' THEN 1 END) as gold_guests,
                        AVG(total_spent) as avg_lifetime_value
                    FROM guest_profiles
                ''')
                
                stats = cursor.fetchone()
                
                # Aktivne ponudbe
                cursor.execute('''
                    SELECT COUNT(*) 
                    FROM personalized_offers 
                    WHERE validity_end > ? AND is_claimed = FALSE
                ''', (datetime.now().isoformat(),))
                
                active_offers = cursor.fetchone()[0]
                
                # Uspešnost ponudb
                cursor.execute('''
                    SELECT 
                        COUNT(*) as total_offers,
                        COUNT(CASE WHEN is_claimed = TRUE THEN 1 END) as claimed_offers
                    FROM personalized_offers
                ''')
                
                offer_stats = cursor.fetchone()
                
                # Distribucija tier-jev
                cursor.execute('''
                    SELECT tier, COUNT(*) 
                    FROM guest_profiles 
                    GROUP BY tier
                ''')
                
                tier_distribution = dict(cursor.fetchall())
                
                # Top personalizacije
                cursor.execute('''
                    SELECT offer_type, COUNT(*) 
                    FROM personalized_offers 
                    WHERE is_claimed = TRUE
                    GROUP BY offer_type 
                    ORDER BY COUNT(*) DESC 
                    LIMIT 5
                ''')
                
                top_personalizations = cursor.fetchall()
                
                return {
                    "success": True,
                    "summary": {
                        "total_guests": stats[0],
                        "vip_guests": stats[1],
                        "platinum_guests": stats[2],
                        "gold_guests": stats[3],
                        "average_lifetime_value": round(stats[4], 2) if stats[4] else 0,
                        "active_offers": active_offers
                    },
                    "offer_performance": {
                        "total_offers": offer_stats[0],
                        "claimed_offers": offer_stats[1],
                        "conversion_rate": round((offer_stats[1] / offer_stats[0] * 100), 1) if offer_stats[0] > 0 else 0
                    },
                    "tier_distribution": tier_distribution,
                    "top_personalizations": [
                        {"type": ptype, "count": count} 
                        for ptype, count in top_personalizations
                    ],
                    "insights": [
                        f"VIP gostje predstavljajo {round((stats[1] / stats[0] * 100), 1)}% vseh gostov",
                        f"Povprečna življenjska vrednost gosta: €{round(stats[4], 2) if stats[4] else 0}",
                        f"Stopnja izkoriščenosti ponudb: {round((offer_stats[1] / offer_stats[0] * 100), 1) if offer_stats[0] > 0 else 0}%"
                    ],
                    "dashboard_updated": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju dashboard podatkov: {e}")
            return {"success": False, "error": str(e)}

# Primer uporabe
if __name__ == "__main__":
    personalization_engine = PersonalizationEngine()
    
    # Ustvari testni profil gosta
    test_profile = GuestProfile(
        guest_id="",
        email="ana.novak@example.com",
        first_name="Ana",
        last_name="Novak",
        phone="+386 40 123 456",
        date_of_birth=date(1985, 6, 15),
        nationality="Slovenia",
        tier=GuestTier.GOLD,
        total_stays=8,
        total_spent=2400.0,
        preferences={
            PreferenceCategory.ROOM_TYPE: ["suite", "deluxe"],
            PreferenceCategory.AMENITIES: ["spa", "fitness", "pool"],
            PreferenceCategory.DINING: ["italian", "mediterranean"]
        },
        special_occasions=[
            {"type": "birthday", "date": "2024-06-15"},
            {"type": "anniversary", "date": "2024-09-20"}
        ]
    )
    
    result = personalization_engine.create_guest_profile(test_profile)
    print(f"Ustvarjanje profila: {result}")
    
    if result["success"]:
        guest_id = result["guest_id"]
        
        # Generiraj personalizirane ponudbe
        offers_result = personalization_engine.generate_personalized_offers(guest_id)
        print(f"Personalizirane ponudbe: {offers_result}")
        
        # Pridobi priporočila
        recommendations_result = personalization_engine.get_guest_recommendations(guest_id)
        print(f"Priporočila: {recommendations_result}")
        
        # Dashboard podatki
        dashboard_result = personalization_engine.get_personalization_dashboard()
        print(f"Dashboard podatki: {dashboard_result}")