"""
ULTIMATE CRM & LOYALTY SYSTEM
Napredni CRM z zgodovino obiskov, personaliziranimi predlogi in samodejnimi programi nagrajevanja
"""

import sqlite3
import json
import uuid
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
import statistics
import logging

# Enumi
class CustomerTier(Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"

class InteractionType(Enum):
    VISIT = "visit"
    PURCHASE = "purchase"
    COMPLAINT = "complaint"
    COMPLIMENT = "compliment"
    INQUIRY = "inquiry"
    RESERVATION = "reservation"
    CANCELLATION = "cancellation"

class RewardType(Enum):
    POINTS = "points"
    DISCOUNT = "discount"
    FREE_ITEM = "free_item"
    UPGRADE = "upgrade"
    CASHBACK = "cashback"
    EXPERIENCE = "experience"

class CampaignStatus(Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"

class PreferenceCategory(Enum):
    DINING = "dining"
    ACCOMMODATION = "accommodation"
    ACTIVITIES = "activities"
    SERVICES = "services"
    COMMUNICATION = "communication"

# Podatkovni razredi
@dataclass
class Customer:
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    date_of_birth: Optional[datetime]
    tier: CustomerTier
    total_spent: float
    visit_count: int
    points_balance: int
    preferences: Dict[str, Any]
    tags: List[str]
    created_at: datetime
    last_visit: Optional[datetime]
    lifetime_value: float
    satisfaction_score: float

@dataclass
class Interaction:
    id: str
    customer_id: str
    interaction_type: InteractionType
    description: str
    amount: Optional[float]
    points_earned: int
    points_redeemed: int
    staff_member: str
    location: str
    metadata: Dict[str, Any]
    created_at: datetime
    satisfaction_rating: Optional[int]

@dataclass
class Reward:
    id: str
    customer_id: str
    reward_type: RewardType
    title: str
    description: str
    value: float
    points_cost: int
    expiry_date: Optional[datetime]
    is_redeemed: bool
    redeemed_at: Optional[datetime]
    created_at: datetime

@dataclass
class Campaign:
    id: str
    name: str
    description: str
    target_tier: Optional[CustomerTier]
    target_tags: List[str]
    reward_type: RewardType
    reward_value: float
    start_date: datetime
    end_date: datetime
    status: CampaignStatus
    budget: float
    spent: float
    participants: int
    conversions: int
    created_at: datetime

@dataclass
class PersonalizedRecommendation:
    id: str
    customer_id: str
    category: str
    item_name: str
    description: str
    confidence_score: float
    reasoning: str
    created_at: datetime
    is_accepted: Optional[bool]

class UltimateCRMLoyalty:
    def __init__(self, db_path: str = "ultimate_crm_loyalty.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela strank
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                date_of_birth DATE,
                tier TEXT NOT NULL,
                total_spent REAL DEFAULT 0,
                visit_count INTEGER DEFAULT 0,
                points_balance INTEGER DEFAULT 0,
                preferences TEXT,
                tags TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_visit TIMESTAMP,
                lifetime_value REAL DEFAULT 0,
                satisfaction_score REAL DEFAULT 0
            )
        """)
        
        # Tabela interakcij
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interactions (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                interaction_type TEXT NOT NULL,
                description TEXT,
                amount REAL,
                points_earned INTEGER DEFAULT 0,
                points_redeemed INTEGER DEFAULT 0,
                staff_member TEXT,
                location TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                satisfaction_rating INTEGER,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        """)
        
        # Tabela nagrad
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rewards (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                reward_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                value REAL NOT NULL,
                points_cost INTEGER NOT NULL,
                expiry_date TIMESTAMP,
                is_redeemed BOOLEAN DEFAULT FALSE,
                redeemed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        """)
        
        # Tabela kampanj
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaigns (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                target_tier TEXT,
                target_tags TEXT,
                reward_type TEXT NOT NULL,
                reward_value REAL NOT NULL,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                status TEXT NOT NULL,
                budget REAL DEFAULT 0,
                spent REAL DEFAULT 0,
                participants INTEGER DEFAULT 0,
                conversions INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabela priporočil
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS recommendations (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                category TEXT NOT NULL,
                item_name TEXT NOT NULL,
                description TEXT,
                confidence_score REAL NOT NULL,
                reasoning TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_accepted BOOLEAN,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        """)
        
        # Tabela segmentov
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_segments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                criteria TEXT NOT NULL,
                customer_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
        
    def create_customer(self, first_name: str, last_name: str, email: str,
                       phone: str = None, date_of_birth: datetime = None,
                       preferences: Dict[str, Any] = None) -> Customer:
        """Ustvari novega kupca"""
        customer_id = str(uuid.uuid4())
        customer = Customer(
            id=customer_id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            date_of_birth=date_of_birth,
            tier=CustomerTier.BRONZE,
            total_spent=0.0,
            visit_count=0,
            points_balance=100,  # Dobrodošlice točke
            preferences=preferences or {},
            tags=[],
            created_at=datetime.now(),
            last_visit=None,
            lifetime_value=0.0,
            satisfaction_score=0.0
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO customers (id, first_name, last_name, email, phone, date_of_birth, tier, points_balance, preferences, tags, lifetime_value, satisfaction_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            customer.id, customer.first_name, customer.last_name, customer.email,
            customer.phone, customer.date_of_birth, customer.tier.value,
            customer.points_balance, json.dumps(customer.preferences),
            json.dumps(customer.tags), customer.lifetime_value, customer.satisfaction_score
        ))
        
        conn.commit()
        conn.close()
        
        # Ustvari dobrodošlico nagrado
        self.create_welcome_reward(customer_id)
        
        return customer
    
    def create_welcome_reward(self, customer_id: str):
        """Ustvari dobrodošlico nagrado za novega kupca"""
        reward = Reward(
            id=str(uuid.uuid4()),
            customer_id=customer_id,
            reward_type=RewardType.DISCOUNT,
            title="Dobrodošlica popust",
            description="10% popust na prvi nakup",
            value=10.0,
            points_cost=0,
            expiry_date=datetime.now() + timedelta(days=30),
            is_redeemed=False,
            redeemed_at=None,
            created_at=datetime.now()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO rewards (id, customer_id, reward_type, title, description, value, points_cost, expiry_date, is_redeemed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            reward.id, reward.customer_id, reward.reward_type.value,
            reward.title, reward.description, reward.value, reward.points_cost,
            reward.expiry_date, reward.is_redeemed
        ))
        
        conn.commit()
        conn.close()
    
    def record_interaction(self, customer_id: str, interaction_type: InteractionType,
                          description: str, amount: float = None, staff_member: str = None,
                          location: str = None, satisfaction_rating: int = None,
                          metadata: Dict[str, Any] = None) -> Interaction:
        """Zabeleži interakcijo s kupcem"""
        interaction_id = str(uuid.uuid4())
        
        # Izračunaj točke
        points_earned = self.calculate_points_earned(interaction_type, amount)
        
        interaction = Interaction(
            id=interaction_id,
            customer_id=customer_id,
            interaction_type=interaction_type,
            description=description,
            amount=amount,
            points_earned=points_earned,
            points_redeemed=0,
            staff_member=staff_member,
            location=location,
            metadata=metadata or {},
            created_at=datetime.now(),
            satisfaction_rating=satisfaction_rating
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO interactions (id, customer_id, interaction_type, description, amount, points_earned, points_redeemed, staff_member, location, metadata, satisfaction_rating)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            interaction.id, interaction.customer_id, interaction.interaction_type.value,
            interaction.description, interaction.amount, interaction.points_earned,
            interaction.points_redeemed, interaction.staff_member, interaction.location,
            json.dumps(interaction.metadata), interaction.satisfaction_rating
        ))
        
        # Posodobi kupca
        self.update_customer_stats(customer_id, interaction)
        
        conn.commit()
        conn.close()
        
        return interaction
    
    def calculate_points_earned(self, interaction_type: InteractionType, amount: float = None) -> int:
        """Izračunaj zaslužene točke"""
        base_points = {
            InteractionType.VISIT: 10,
            InteractionType.PURCHASE: 0,  # Izračunano na podlagi zneska
            InteractionType.RESERVATION: 5,
            InteractionType.COMPLIMENT: 20,
            InteractionType.INQUIRY: 2,
            InteractionType.COMPLAINT: 0,
            InteractionType.CANCELLATION: 0
        }
        
        points = base_points.get(interaction_type, 0)
        
        # Za nakupe: 1 točka na 1€
        if interaction_type == InteractionType.PURCHASE and amount:
            points += int(amount)
            
        return points
    
    def update_customer_stats(self, customer_id: str, interaction: Interaction):
        """Posodobi statistike kupca"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pridobi trenutne podatke
        cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
        customer_data = cursor.fetchone()
        
        if not customer_data:
            conn.close()
            return
        
        # Posodobi statistike
        new_visit_count = customer_data[5] + (1 if interaction.interaction_type == InteractionType.VISIT else 0)
        new_total_spent = customer_data[4] + (interaction.amount or 0)
        new_points_balance = customer_data[6] + interaction.points_earned - interaction.points_redeemed
        new_last_visit = datetime.now() if interaction.interaction_type == InteractionType.VISIT else customer_data[9]
        
        # Izračunaj lifetime value
        new_lifetime_value = new_total_spent * 1.2  # Faktor profitabilnosti
        
        # Posodobi satisfaction score
        current_satisfaction = customer_data[11] or 0
        if interaction.satisfaction_rating:
            new_satisfaction = (current_satisfaction + interaction.satisfaction_rating) / 2
        else:
            new_satisfaction = current_satisfaction
        
        # Določi novi tier
        new_tier = self.calculate_customer_tier(new_total_spent, new_visit_count)
        
        cursor.execute("""
            UPDATE customers 
            SET visit_count = ?, total_spent = ?, points_balance = ?, last_visit = ?, 
                lifetime_value = ?, satisfaction_score = ?, tier = ?
            WHERE id = ?
        """, (
            new_visit_count, new_total_spent, new_points_balance, new_last_visit,
            new_lifetime_value, new_satisfaction, new_tier.value, customer_id
        ))
        
        conn.commit()
        conn.close()
        
        # Preveri za avtomatske nagrade
        self.check_automatic_rewards(customer_id, new_tier, new_visit_count, new_total_spent)
    
    def calculate_customer_tier(self, total_spent: float, visit_count: int) -> CustomerTier:
        """Izračunaj tier kupca"""
        if total_spent >= 5000 or visit_count >= 50:
            return CustomerTier.DIAMOND
        elif total_spent >= 2000 or visit_count >= 25:
            return CustomerTier.PLATINUM
        elif total_spent >= 1000 or visit_count >= 15:
            return CustomerTier.GOLD
        elif total_spent >= 500 or visit_count >= 8:
            return CustomerTier.SILVER
        else:
            return CustomerTier.BRONZE
    
    def check_automatic_rewards(self, customer_id: str, tier: CustomerTier, 
                               visit_count: int, total_spent: float):
        """Preveri za avtomatske nagrade"""
        rewards_to_create = []
        
        # Milestone nagrade
        if visit_count in [5, 10, 25, 50]:
            rewards_to_create.append({
                'reward_type': RewardType.POINTS,
                'title': f'Milestone {visit_count} obiskov',
                'description': f'Bonus točke za {visit_count} obiskov',
                'value': visit_count * 10,
                'points_cost': 0
            })
        
        # Tier upgrade nagrade
        tier_rewards = {
            CustomerTier.SILVER: {'value': 50, 'title': 'Silver Status'},
            CustomerTier.GOLD: {'value': 100, 'title': 'Gold Status'},
            CustomerTier.PLATINUM: {'value': 200, 'title': 'Platinum Status'},
            CustomerTier.DIAMOND: {'value': 500, 'title': 'Diamond Status'}
        }
        
        if tier in tier_rewards:
            rewards_to_create.append({
                'reward_type': RewardType.POINTS,
                'title': f'{tier_rewards[tier]["title"]} Bonus',
                'description': f'Čestitke za dosego {tier.value} statusa!',
                'value': tier_rewards[tier]['value'],
                'points_cost': 0
            })
        
        # Ustvari nagrade
        for reward_data in rewards_to_create:
            self.create_reward(customer_id, **reward_data)
    
    def create_reward(self, customer_id: str, reward_type: RewardType, title: str,
                     description: str, value: float, points_cost: int = 0,
                     expiry_days: int = 90) -> Reward:
        """Ustvari nagrado za kupca"""
        reward = Reward(
            id=str(uuid.uuid4()),
            customer_id=customer_id,
            reward_type=reward_type,
            title=title,
            description=description,
            value=value,
            points_cost=points_cost,
            expiry_date=datetime.now() + timedelta(days=expiry_days),
            is_redeemed=False,
            redeemed_at=None,
            created_at=datetime.now()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO rewards (id, customer_id, reward_type, title, description, value, points_cost, expiry_date, is_redeemed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            reward.id, reward.customer_id, reward.reward_type.value,
            reward.title, reward.description, reward.value, reward.points_cost,
            reward.expiry_date, reward.is_redeemed
        ))
        
        conn.commit()
        conn.close()
        
        return reward
    
    def redeem_reward(self, reward_id: str, customer_id: str) -> bool:
        """Unovči nagrado"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Preveri nagrado
        cursor.execute("""
            SELECT * FROM rewards 
            WHERE id = ? AND customer_id = ? AND is_redeemed = FALSE 
            AND (expiry_date IS NULL OR expiry_date > ?)
        """, (reward_id, customer_id, datetime.now()))
        
        reward_data = cursor.fetchone()
        if not reward_data:
            conn.close()
            return False
        
        points_cost = reward_data[6]
        
        # Preveri točke kupca
        cursor.execute("SELECT points_balance FROM customers WHERE id = ?", (customer_id,))
        customer_points = cursor.fetchone()[0]
        
        if customer_points < points_cost:
            conn.close()
            return False
        
        # Unovči nagrado
        cursor.execute("""
            UPDATE rewards 
            SET is_redeemed = TRUE, redeemed_at = ?
            WHERE id = ?
        """, (datetime.now(), reward_id))
        
        # Odštej točke
        cursor.execute("""
            UPDATE customers 
            SET points_balance = points_balance - ?
            WHERE id = ?
        """, (points_cost, customer_id))
        
        conn.commit()
        conn.close()
        
        return True
    
    def generate_personalized_recommendations(self, customer_id: str) -> List[PersonalizedRecommendation]:
        """Generiraj personalizirana priporočila"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pridobi podatke o kupcu
        cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
        customer_data = cursor.fetchone()
        
        if not customer_data:
            conn.close()
            return []
        
        preferences = json.loads(customer_data[7] or '{}')
        tier = customer_data[3]
        
        # Pridobi zgodovino interakcij
        cursor.execute("""
            SELECT interaction_type, description, amount, metadata 
            FROM interactions 
            WHERE customer_id = ? 
            ORDER BY created_at DESC 
            LIMIT 20
        """, (customer_id,))
        
        interactions = cursor.fetchall()
        conn.close()
        
        recommendations = []
        
        # Priporočila na podlagi tier-ja
        tier_recommendations = {
            'bronze': [
                {'category': 'dining', 'item': 'Dnevni meni', 'confidence': 0.7, 'reasoning': 'Primerno za bronze tier'},
                {'category': 'services', 'item': 'WiFi Premium', 'confidence': 0.6, 'reasoning': 'Upgrade storitev'}
            ],
            'silver': [
                {'category': 'dining', 'item': 'À la carte meni', 'confidence': 0.8, 'reasoning': 'Priporočeno za silver tier'},
                {'category': 'accommodation', 'item': 'Upgrade sobe', 'confidence': 0.7, 'reasoning': 'Silver tier benefit'}
            ],
            'gold': [
                {'category': 'experiences', 'item': 'Spa tretmaji', 'confidence': 0.9, 'reasoning': 'Premium doživetje za gold tier'},
                {'category': 'dining', 'item': 'Degustacijski meni', 'confidence': 0.8, 'reasoning': 'Ekskluzivna ponudba'}
            ]
        }
        
        if tier in tier_recommendations:
            for rec_data in tier_recommendations[tier]:
                recommendation = PersonalizedRecommendation(
                    id=str(uuid.uuid4()),
                    customer_id=customer_id,
                    category=rec_data['category'],
                    item_name=rec_data['item'],
                    description=f"Priporočeno na podlagi vašega {tier} statusa",
                    confidence_score=rec_data['confidence'],
                    reasoning=rec_data['reasoning'],
                    created_at=datetime.now(),
                    is_accepted=None
                )
                recommendations.append(recommendation)
        
        # Shrani priporočila
        self.save_recommendations(recommendations)
        
        return recommendations
    
    def save_recommendations(self, recommendations: List[PersonalizedRecommendation]):
        """Shrani priporočila v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for rec in recommendations:
            cursor.execute("""
                INSERT INTO recommendations (id, customer_id, category, item_name, description, confidence_score, reasoning)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                rec.id, rec.customer_id, rec.category, rec.item_name,
                rec.description, rec.confidence_score, rec.reasoning
            ))
        
        conn.commit()
        conn.close()
    
    def create_campaign(self, name: str, description: str, reward_type: RewardType,
                       reward_value: float, duration_days: int = 30,
                       target_tier: CustomerTier = None, target_tags: List[str] = None,
                       budget: float = 1000) -> Campaign:
        """Ustvari marketinško kampanjo"""
        campaign = Campaign(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            target_tier=target_tier,
            target_tags=target_tags or [],
            reward_type=reward_type,
            reward_value=reward_value,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=duration_days),
            status=CampaignStatus.ACTIVE,
            budget=budget,
            spent=0.0,
            participants=0,
            conversions=0,
            created_at=datetime.now()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO campaigns (id, name, description, target_tier, target_tags, reward_type, reward_value, start_date, end_date, status, budget)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            campaign.id, campaign.name, campaign.description,
            campaign.target_tier.value if campaign.target_tier else None,
            json.dumps(campaign.target_tags), campaign.reward_type.value,
            campaign.reward_value, campaign.start_date, campaign.end_date,
            campaign.status.value, campaign.budget
        ))
        
        conn.commit()
        conn.close()
        
        return campaign
    
    def get_customer_analytics(self) -> Dict[str, Any]:
        """Pridobi analitiko kupcev"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Skupno število kupcev
        cursor.execute("SELECT COUNT(*) FROM customers")
        total_customers = cursor.fetchone()[0]
        
        # Distribucija tier-jev
        cursor.execute("SELECT tier, COUNT(*) FROM customers GROUP BY tier")
        tier_distribution = dict(cursor.fetchall())
        
        # Povprečna vrednost kupca
        cursor.execute("SELECT AVG(lifetime_value) FROM customers")
        avg_lifetime_value = cursor.fetchone()[0] or 0
        
        # Aktivni kupci (zadnji mesec)
        cursor.execute("""
            SELECT COUNT(*) FROM customers 
            WHERE last_visit > ?
        """, (datetime.now() - timedelta(days=30),))
        active_customers = cursor.fetchone()[0]
        
        # Satisfaction score
        cursor.execute("SELECT AVG(satisfaction_score) FROM customers WHERE satisfaction_score > 0")
        avg_satisfaction = cursor.fetchone()[0] or 0
        
        # Top kupci
        cursor.execute("""
            SELECT first_name, last_name, tier, total_spent, visit_count
            FROM customers 
            ORDER BY lifetime_value DESC 
            LIMIT 10
        """)
        top_customers = [
            {
                'name': f"{row[0]} {row[1]}",
                'tier': row[2],
                'total_spent': row[3],
                'visit_count': row[4]
            }
            for row in cursor.fetchall()
        ]
        
        conn.close()
        
        return {
            'total_customers': total_customers,
            'tier_distribution': tier_distribution,
            'average_lifetime_value': round(avg_lifetime_value, 2),
            'active_customers': active_customers,
            'average_satisfaction': round(avg_satisfaction, 2),
            'top_customers': top_customers,
            'generated_at': datetime.now().isoformat()
        }
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Pridobi podatke za dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Danes registrirani kupci
        cursor.execute("""
            SELECT COUNT(*) FROM customers 
            WHERE DATE(created_at) = DATE('now')
        """)
        today_registrations = cursor.fetchone()[0]
        
        # Aktivne kampanje
        cursor.execute("""
            SELECT COUNT(*) FROM campaigns 
            WHERE status = 'active' AND end_date > ?
        """, (datetime.now(),))
        active_campaigns = cursor.fetchone()[0]
        
        # Neunovčene nagrade
        cursor.execute("""
            SELECT COUNT(*) FROM rewards 
            WHERE is_redeemed = FALSE AND (expiry_date IS NULL OR expiry_date > ?)
        """, (datetime.now(),))
        pending_rewards = cursor.fetchone()[0]
        
        # Nedavne interakcije
        cursor.execute("""
            SELECT c.first_name, c.last_name, i.interaction_type, i.description, i.created_at
            FROM interactions i
            JOIN customers c ON i.customer_id = c.id
            ORDER BY i.created_at DESC
            LIMIT 10
        """)
        recent_interactions = [
            {
                'customer_name': f"{row[0]} {row[1]}",
                'type': row[2],
                'description': row[3],
                'timestamp': row[4]
            }
            for row in cursor.fetchall()
        ]
        
        conn.close()
        
        return {
            'today_registrations': today_registrations,
            'active_campaigns': active_campaigns,
            'pending_rewards': pending_rewards,
            'recent_interactions': recent_interactions,
            'system_status': 'operational',
            'last_updated': datetime.now().isoformat()
        }

# Demo funkcije
def load_demo_data(system: UltimateCRMLoyalty):
    """Naloži demo podatke"""
    
    # Demo kupci
    customers_data = [
        {
            'first_name': 'Maja',
            'last_name': 'Horvat',
            'email': 'maja.horvat@email.com',
            'phone': '+386 40 111 222',
            'preferences': {
                'dining': {'cuisine': 'mediterranean', 'dietary': 'vegetarian'},
                'accommodation': {'room_type': 'sea_view', 'floor': 'high'},
                'communication': {'newsletter': True, 'sms': False}
            }
        },
        {
            'first_name': 'Peter',
            'last_name': 'Novak',
            'email': 'peter.novak@email.com',
            'phone': '+386 41 333 444',
            'preferences': {
                'dining': {'cuisine': 'local', 'wine': 'red'},
                'activities': {'spa': True, 'hiking': True},
                'services': {'early_checkin': True}
            }
        },
        {
            'first_name': 'Sara',
            'last_name': 'Kos',
            'email': 'sara.kos@email.com',
            'phone': '+386 42 555 666',
            'preferences': {
                'dining': {'cuisine': 'international', 'allergies': ['nuts']},
                'accommodation': {'quiet_room': True},
                'activities': {'wellness': True}
            }
        }
    ]
    
    for customer_data in customers_data:
        customer = system.create_customer(**customer_data)
        
        # Simuliraj interakcije
        interactions = [
            (InteractionType.VISIT, "Prvi obisk", None, 5),
            (InteractionType.PURCHASE, "Večerja v restavraciji", 45.50, 4),
            (InteractionType.RESERVATION, "Rezervacija spa tretmaja", None, 5),
            (InteractionType.PURCHASE, "Nakup v trgovini", 25.00, 4),
            (InteractionType.COMPLIMENT, "Pohvala za storitev", None, 5)
        ]
        
        for interaction_type, description, amount, rating in interactions:
            system.record_interaction(
                customer.id, interaction_type, description,
                amount=amount, satisfaction_rating=rating,
                staff_member="Demo Staff", location="Hotel Slovenija"
            )
        
        # Generiraj priporočila
        system.generate_personalized_recommendations(customer.id)
    
    # Ustvari demo kampanjo
    system.create_campaign(
        name="Poletna promocija",
        description="20% popust na spa storitve",
        reward_type=RewardType.DISCOUNT,
        reward_value=20.0,
        duration_days=30,
        target_tier=CustomerTier.GOLD,
        budget=2000
    )

def demo_crm_loyalty():
    """Demo CRM & Loyalty sistema"""
    print("🎯 ULTIMATE CRM & LOYALTY SYSTEM")
    print("=" * 50)
    
    # Inicializiraj sistem
    system = UltimateCRMLoyalty()
    
    # Naloži demo podatke
    load_demo_data(system)
    
    # Prikaži analitiko
    analytics = system.get_customer_analytics()
    print(f"\n📊 ANALITIKA KUPCEV:")
    print(f"Skupno kupcev: {analytics['total_customers']}")
    print(f"Povprečna vrednost kupca: €{analytics['average_lifetime_value']}")
    print(f"Povprečna zadovoljstvo: {analytics['average_satisfaction']}/5")
    print(f"Distribucija tier-jev: {analytics['tier_distribution']}")
    
    # Prikaži dashboard podatke
    dashboard = system.get_dashboard_data()
    print(f"\n📈 DASHBOARD:")
    print(f"Danes registrirani: {dashboard['today_registrations']}")
    print(f"Aktivne kampanje: {dashboard['active_campaigns']}")
    print(f"Neunovčene nagrade: {dashboard['pending_rewards']}")
    print(f"Status sistema: {dashboard['system_status']}")
    
    print(f"\n✅ CRM & Loyalty sistem je pripravljen!")
    print(f"💾 Baza: ultimate_crm_loyalty.db")

if __name__ == "__main__":
    demo_crm_loyalty()