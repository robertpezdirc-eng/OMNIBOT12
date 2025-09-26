"""
🔹 ULTIMATE HYPER-PERSONALIZACIJA SISTEM
Napredni sistem za beleženje vseh interakcij in maksimalno personalizacijo
Avtor: Omni AI Assistant
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import uuid
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib

class InteractionType(Enum):
    VISIT = "visit"
    PURCHASE = "purchase"
    PREFERENCE = "preference"
    FEEDBACK = "feedback"
    BEHAVIOR = "behavior"
    COMMUNICATION = "communication"
    LOCATION = "location"
    DEVICE = "device"
    SOCIAL = "social"
    EMOTION = "emotion"

class PersonalizationLevel(Enum):
    BASIC = "basic"
    ADVANCED = "advanced"
    HYPER = "hyper"
    PREDICTIVE = "predictive"

@dataclass
class CustomerProfile:
    customer_id: str
    name: str
    email: str
    phone: str
    birth_date: Optional[str]
    preferences: Dict[str, Any]
    behavioral_patterns: Dict[str, Any]
    interaction_history: List[Dict]
    personalization_level: str
    privacy_settings: Dict[str, bool]
    created_at: str
    updated_at: str

@dataclass
class Interaction:
    interaction_id: str
    customer_id: str
    interaction_type: str
    timestamp: str
    location: str
    device_info: Dict[str, str]
    context: Dict[str, Any]
    data: Dict[str, Any]
    sentiment_score: float
    importance_level: int
    processed: bool

@dataclass
class PersonalizationRule:
    rule_id: str
    name: str
    condition: Dict[str, Any]
    action: Dict[str, Any]
    priority: int
    active: bool
    success_rate: float
    created_at: str

@dataclass
class PredictiveInsight:
    insight_id: str
    customer_id: str
    prediction_type: str
    confidence_score: float
    predicted_value: Any
    reasoning: str
    valid_until: str
    created_at: str

class UltimateHyperPersonalization:
    def __init__(self, db_path: str = "hyper_personalization.db"):
        self.db_path = db_path
        self.init_database()
        self.load_demo_data()

    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela profilov strank
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_profiles (
                customer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT,
                birth_date TEXT,
                preferences TEXT,
                behavioral_patterns TEXT,
                interaction_history TEXT,
                personalization_level TEXT,
                privacy_settings TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # Tabela interakcij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS interactions (
                interaction_id TEXT PRIMARY KEY,
                customer_id TEXT,
                interaction_type TEXT,
                timestamp TEXT,
                location TEXT,
                device_info TEXT,
                context TEXT,
                data TEXT,
                sentiment_score REAL,
                importance_level INTEGER,
                processed BOOLEAN,
                FOREIGN KEY (customer_id) REFERENCES customer_profiles (customer_id)
            )
        ''')
        
        # Tabela personalizacijskih pravil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS personalization_rules (
                rule_id TEXT PRIMARY KEY,
                name TEXT,
                condition TEXT,
                action TEXT,
                priority INTEGER,
                active BOOLEAN,
                success_rate REAL,
                created_at TEXT
            )
        ''')
        
        # Tabela prediktivnih vpogledov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictive_insights (
                insight_id TEXT PRIMARY KEY,
                customer_id TEXT,
                prediction_type TEXT,
                confidence_score REAL,
                predicted_value TEXT,
                reasoning TEXT,
                valid_until TEXT,
                created_at TEXT,
                FOREIGN KEY (customer_id) REFERENCES customer_profiles (customer_id)
            )
        ''')
        
        conn.commit()
        conn.close()

    def load_demo_data(self):
        """Nalaganje demo podatkov"""
        demo_customers = [
            {
                "customer_id": "cust_001",
                "name": "Ana Novak",
                "email": "ana.novak@email.com",
                "phone": "+386 40 123 456",
                "birth_date": "1985-03-15",
                "preferences": {
                    "cuisine": ["mediteranska", "vegetarijanska"],
                    "ambiance": "romantična",
                    "seating": "terasa",
                    "dietary": ["brez glutena"],
                    "price_range": "srednji",
                    "communication": "email"
                },
                "behavioral_patterns": {
                    "visit_frequency": "tedensko",
                    "avg_spending": 45.50,
                    "favorite_time": "večer",
                    "group_size": 2,
                    "loyalty_score": 8.5
                },
                "personalization_level": "hyper",
                "privacy_settings": {
                    "track_location": True,
                    "personalized_offers": True,
                    "data_sharing": False
                }
            },
            {
                "customer_id": "cust_002",
                "name": "Marko Kovač",
                "email": "marko.kovac@email.com",
                "phone": "+386 41 987 654",
                "birth_date": "1978-11-22",
                "preferences": {
                    "cuisine": ["tradicionalna", "mesna"],
                    "ambiance": "družabna",
                    "seating": "notranjost",
                    "dietary": [],
                    "price_range": "višji",
                    "communication": "sms"
                },
                "behavioral_patterns": {
                    "visit_frequency": "mesečno",
                    "avg_spending": 85.20,
                    "favorite_time": "kosilo",
                    "group_size": 4,
                    "loyalty_score": 6.8
                },
                "personalization_level": "advanced",
                "privacy_settings": {
                    "track_location": False,
                    "personalized_offers": True,
                    "data_sharing": True
                }
            }
        ]
        
        for customer_data in demo_customers:
            self.create_customer_profile(customer_data)
        
        # Demo personalizacijska pravila
        demo_rules = [
            {
                "name": "Vegetarijanski predlogi",
                "condition": {"preferences.dietary": "vegetarijanska"},
                "action": {"recommend": "vegetarijanski_meni", "discount": 10},
                "priority": 8
            },
            {
                "name": "Zvesti gost bonus",
                "condition": {"behavioral_patterns.loyalty_score": ">8"},
                "action": {"upgrade": "premium_storitev", "discount": 15},
                "priority": 9
            },
            {
                "name": "Rojstni dan posebnost",
                "condition": {"birth_date": "today"},
                "action": {"gift": "desert", "message": "Vse najboljše!"},
                "priority": 10
            }
        ]
        
        for rule_data in demo_rules:
            self.create_personalization_rule(rule_data)

    def create_customer_profile(self, customer_data: Dict) -> str:
        """Ustvarjanje profila stranke"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        customer_id = customer_data.get("customer_id", str(uuid.uuid4()))
        now = datetime.now().isoformat()
        
        cursor.execute('''
            INSERT OR REPLACE INTO customer_profiles 
            (customer_id, name, email, phone, birth_date, preferences, 
             behavioral_patterns, interaction_history, personalization_level, 
             privacy_settings, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            customer_id,
            customer_data["name"],
            customer_data["email"],
            customer_data.get("phone"),
            customer_data.get("birth_date"),
            json.dumps(customer_data.get("preferences", {})),
            json.dumps(customer_data.get("behavioral_patterns", {})),
            json.dumps(customer_data.get("interaction_history", [])),
            customer_data.get("personalization_level", "basic"),
            json.dumps(customer_data.get("privacy_settings", {})),
            now,
            now
        ))
        
        conn.commit()
        conn.close()
        return customer_id

    def log_interaction(self, interaction_data: Dict) -> str:
        """Beleženje interakcije"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        interaction_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        # Analiza sentimenta (poenostavljena)
        sentiment_score = self._analyze_sentiment(interaction_data.get("data", {}))
        
        cursor.execute('''
            INSERT INTO interactions 
            (interaction_id, customer_id, interaction_type, timestamp, location,
             device_info, context, data, sentiment_score, importance_level, processed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            interaction_id,
            interaction_data["customer_id"],
            interaction_data["interaction_type"],
            now,
            interaction_data.get("location", ""),
            json.dumps(interaction_data.get("device_info", {})),
            json.dumps(interaction_data.get("context", {})),
            json.dumps(interaction_data.get("data", {})),
            sentiment_score,
            interaction_data.get("importance_level", 5),
            False
        ))
        
        conn.commit()
        conn.close()
        
        # Posodobi profil stranke
        self._update_customer_profile(interaction_data["customer_id"], interaction_data)
        
        return interaction_id

    def _analyze_sentiment(self, data: Dict) -> float:
        """Analiza sentimenta (poenostavljena)"""
        positive_words = ["odličen", "super", "fantastičen", "priporočam", "ljubim"]
        negative_words = ["slab", "grozno", "počasen", "drag", "ne priporočam"]
        
        text = str(data).lower()
        positive_count = sum(1 for word in positive_words if word in text)
        negative_count = sum(1 for word in negative_words if word in text)
        
        if positive_count + negative_count == 0:
            return 0.5  # Nevtralno
        
        return positive_count / (positive_count + negative_count)

    def _update_customer_profile(self, customer_id: str, interaction_data: Dict):
        """Posodobitev profila stranke na podlagi interakcije"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pridobi trenutni profil
        cursor.execute('''
            SELECT preferences, behavioral_patterns, interaction_history 
            FROM customer_profiles WHERE customer_id = ?
        ''', (customer_id,))
        
        result = cursor.fetchone()
        if not result:
            conn.close()
            return
        
        preferences = json.loads(result[0] or '{}')
        behavioral_patterns = json.loads(result[1] or '{}')
        interaction_history = json.loads(result[2] or '[]')
        
        # Posodobi preference na podlagi interakcije
        if interaction_data["interaction_type"] == "purchase":
            data = interaction_data.get("data", {})
            if "items" in data:
                for item in data["items"]:
                    category = item.get("category")
                    if category:
                        if "favorite_categories" not in preferences:
                            preferences["favorite_categories"] = {}
                        preferences["favorite_categories"][category] = \
                            preferences["favorite_categories"].get(category, 0) + 1
        
        # Posodobi vedenjske vzorce
        if "spending" in interaction_data.get("data", {}):
            spending = interaction_data["data"]["spending"]
            current_avg = behavioral_patterns.get("avg_spending", 0)
            visit_count = behavioral_patterns.get("visit_count", 0) + 1
            behavioral_patterns["avg_spending"] = \
                (current_avg * (visit_count - 1) + spending) / visit_count
            behavioral_patterns["visit_count"] = visit_count
        
        # Dodaj v zgodovino
        interaction_history.append({
            "timestamp": datetime.now().isoformat(),
            "type": interaction_data["interaction_type"],
            "summary": interaction_data.get("data", {})
        })
        
        # Obdrži samo zadnjih 100 interakcij
        interaction_history = interaction_history[-100:]
        
        # Posodobi bazo
        cursor.execute('''
            UPDATE customer_profiles 
            SET preferences = ?, behavioral_patterns = ?, interaction_history = ?, updated_at = ?
            WHERE customer_id = ?
        ''', (
            json.dumps(preferences),
            json.dumps(behavioral_patterns),
            json.dumps(interaction_history),
            datetime.now().isoformat(),
            customer_id
        ))
        
        conn.commit()
        conn.close()

    def create_personalization_rule(self, rule_data: Dict) -> str:
        """Ustvarjanje personalizacijskega pravila"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        rule_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        cursor.execute('''
            INSERT INTO personalization_rules 
            (rule_id, name, condition, action, priority, active, success_rate, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            rule_id,
            rule_data["name"],
            json.dumps(rule_data["condition"]),
            json.dumps(rule_data["action"]),
            rule_data.get("priority", 5),
            True,
            0.0,
            now
        ))
        
        conn.commit()
        conn.close()
        return rule_id

    def get_personalized_recommendations(self, customer_id: str) -> Dict[str, Any]:
        """Pridobivanje personaliziranih priporočil"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pridobi profil stranke
        cursor.execute('''
            SELECT * FROM customer_profiles WHERE customer_id = ?
        ''', (customer_id,))
        
        profile_data = cursor.fetchone()
        if not profile_data:
            conn.close()
            return {"error": "Profil stranke ni najden"}
        
        preferences = json.loads(profile_data[5] or '{}')
        behavioral_patterns = json.loads(profile_data[6] or '{}')
        
        # Pridobi aktivna pravila
        cursor.execute('''
            SELECT * FROM personalization_rules WHERE active = 1 ORDER BY priority DESC
        ''')
        
        rules = cursor.fetchall()
        recommendations = {
            "customer_id": customer_id,
            "recommendations": [],
            "offers": [],
            "messages": [],
            "personalization_level": profile_data[8]
        }
        
        for rule in rules:
            condition = json.loads(rule[2])
            action = json.loads(rule[3])
            
            if self._evaluate_condition(condition, preferences, behavioral_patterns):
                recommendations["recommendations"].append({
                    "rule_name": rule[1],
                    "action": action,
                    "priority": rule[4]
                })
        
        conn.close()
        return recommendations

    def _evaluate_condition(self, condition: Dict, preferences: Dict, behavioral_patterns: Dict) -> bool:
        """Evalvacija pogoja za personalizacijo"""
        for key, value in condition.items():
            if "." in key:
                # Nested key (npr. "preferences.dietary")
                parts = key.split(".")
                data = preferences if parts[0] == "preferences" else behavioral_patterns
                
                if parts[1] not in data:
                    return False
                
                actual_value = data[parts[1]]
                
                if isinstance(value, str) and value.startswith(">"):
                    threshold = float(value[1:])
                    if not (isinstance(actual_value, (int, float)) and actual_value > threshold):
                        return False
                elif isinstance(actual_value, list):
                    if value not in actual_value:
                        return False
                elif actual_value != value:
                    return False
        
        return True

    def generate_predictive_insights(self, customer_id: str) -> List[Dict]:
        """Generiranje prediktivnih vpogledov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pridobi zgodovino interakcij
        cursor.execute('''
            SELECT * FROM interactions WHERE customer_id = ? 
            ORDER BY timestamp DESC LIMIT 50
        ''', (customer_id,))
        
        interactions = cursor.fetchall()
        insights = []
        
        if len(interactions) >= 5:
            # Predviditev naslednjega obiska
            visit_intervals = []
            visit_times = [datetime.fromisoformat(i[3]) for i in interactions if i[2] == "visit"]
            
            for i in range(1, len(visit_times)):
                interval = (visit_times[i-1] - visit_times[i]).days
                visit_intervals.append(interval)
            
            if visit_intervals:
                avg_interval = sum(visit_intervals) / len(visit_intervals)
                next_visit = datetime.now() + timedelta(days=avg_interval)
                
                insights.append({
                    "insight_id": str(uuid.uuid4()),
                    "customer_id": customer_id,
                    "prediction_type": "next_visit",
                    "confidence_score": 0.75,
                    "predicted_value": next_visit.isoformat(),
                    "reasoning": f"Na podlagi povprečnega intervala {avg_interval:.1f} dni",
                    "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
                    "created_at": datetime.now().isoformat()
                })
        
        # Shrani vpoglede
        for insight in insights:
            cursor.execute('''
                INSERT INTO predictive_insights 
                (insight_id, customer_id, prediction_type, confidence_score, 
                 predicted_value, reasoning, valid_until, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                insight["insight_id"],
                insight["customer_id"],
                insight["prediction_type"],
                insight["confidence_score"],
                insight["predicted_value"],
                insight["reasoning"],
                insight["valid_until"],
                insight["created_at"]
            ))
        
        conn.commit()
        conn.close()
        return insights

    def get_hyper_personalization_dashboard(self) -> Dict[str, Any]:
        """Dashboard za hyper-personalizacijo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Statistike strank
        cursor.execute('SELECT COUNT(*) FROM customer_profiles')
        total_customers = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT personalization_level, COUNT(*) 
            FROM customer_profiles 
            GROUP BY personalization_level
        ''')
        personalization_levels = dict(cursor.fetchall())
        
        # Statistike interakcij
        cursor.execute('SELECT COUNT(*) FROM interactions')
        total_interactions = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT interaction_type, COUNT(*) 
            FROM interactions 
            GROUP BY interaction_type
        ''')
        interaction_types = dict(cursor.fetchall())
        
        # Povprečni sentiment
        cursor.execute('SELECT AVG(sentiment_score) FROM interactions')
        avg_sentiment = cursor.fetchone()[0] or 0
        
        # Aktivna pravila
        cursor.execute('SELECT COUNT(*) FROM personalization_rules WHERE active = 1')
        active_rules = cursor.fetchone()[0]
        
        # Nedavne interakcije
        cursor.execute('''
            SELECT i.*, cp.name 
            FROM interactions i
            JOIN customer_profiles cp ON i.customer_id = cp.customer_id
            ORDER BY i.timestamp DESC LIMIT 10
        ''')
        recent_interactions = cursor.fetchall()
        
        conn.close()
        
        return {
            "overview": {
                "total_customers": total_customers,
                "total_interactions": total_interactions,
                "avg_sentiment": round(avg_sentiment, 2),
                "active_rules": active_rules
            },
            "personalization_levels": personalization_levels,
            "interaction_types": interaction_types,
            "recent_interactions": [
                {
                    "customer_name": interaction[12],
                    "type": interaction[2],
                    "timestamp": interaction[3],
                    "sentiment": round(interaction[8], 2)
                }
                for interaction in recent_interactions
            ],
            "recommendations": [
                "Povečajte personalizacijo za stranke z osnovnim nivojem",
                "Analizirajte vzorce strank z negativnim sentimentom",
                "Ustvarite nova pravila za pogostejše goste"
            ]
        }

# Demo funkcije
def demo_hyper_personalization():
    """Demo hyper-personalizacije"""
    print("🔹 DEMO: Ultimate Hyper-Personalizacija")
    print("=" * 50)
    
    system = UltimateHyperPersonalization()
    
    # Demo interakcije
    demo_interactions = [
        {
            "customer_id": "cust_001",
            "interaction_type": "visit",
            "location": "glavna_restavracija",
            "device_info": {"type": "mobile", "os": "android"},
            "context": {"weather": "sončno", "day": "sobota"},
            "data": {"table": "terasa_5", "duration": 90},
            "importance_level": 7
        },
        {
            "customer_id": "cust_001",
            "interaction_type": "purchase",
            "location": "glavna_restavracija",
            "data": {
                "items": [
                    {"name": "Vegetarijanska pica", "category": "vegetarijanska", "price": 12.50},
                    {"name": "Zelena solata", "category": "vegetarijanska", "price": 8.00}
                ],
                "spending": 20.50,
                "payment_method": "kartica"
            },
            "importance_level": 8
        },
        {
            "customer_id": "cust_001",
            "interaction_type": "feedback",
            "data": {
                "rating": 5,
                "comment": "Odličen vegetarijanski meni, priporočam!",
                "category": "hrana"
            },
            "importance_level": 9
        }
    ]
    
    # Beleženje interakcij
    print("\n📝 Beleženje interakcij:")
    for interaction in demo_interactions:
        interaction_id = system.log_interaction(interaction)
        print(f"✅ Interakcija zabeležena: {interaction_id}")
    
    # Personalizirana priporočila
    print("\n🎯 Personalizirana priporočila:")
    recommendations = system.get_personalized_recommendations("cust_001")
    for rec in recommendations["recommendations"]:
        print(f"• {rec['rule_name']}: {rec['action']}")
    
    # Prediktivni vpogledi
    print("\n🔮 Prediktivni vpogledi:")
    insights = system.generate_predictive_insights("cust_001")
    for insight in insights:
        print(f"• {insight['prediction_type']}: {insight['predicted_value']}")
        print(f"  Zaupanje: {insight['confidence_score']:.0%}")
        print(f"  Razlog: {insight['reasoning']}")
    
    # Dashboard
    print("\n📊 Dashboard:")
    dashboard = system.get_hyper_personalization_dashboard()
    print(f"• Skupaj strank: {dashboard['overview']['total_customers']}")
    print(f"• Skupaj interakcij: {dashboard['overview']['total_interactions']}")
    print(f"• Povprečni sentiment: {dashboard['overview']['avg_sentiment']}")
    print(f"• Aktivna pravila: {dashboard['overview']['active_rules']}")

if __name__ == "__main__":
    demo_hyper_personalization()