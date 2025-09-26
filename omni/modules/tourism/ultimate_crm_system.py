"""
ULTIMATE CRM System
Napredni sistem za upravljanje odnosov s strankami
- Zgodovina obiskov in interakcij
- Personalizirani predlogi doživetij
- Programi zvestobe in nagrajevanja
- Segmentacija strank in targetiranje
- Avtomatski marketing in komunikacija
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import random
import hashlib

class Customer:
    """Razred za stranke"""
    def __init__(self, customer_id: str, first_name: str, last_name: str, 
                 email: str, phone: str = "", birth_date: str = ""):
        self.customer_id = customer_id
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.phone = phone
        self.birth_date = birth_date
        self.preferences = {}
        self.loyalty_points = 0
        self.total_spent = 0.0
        self.visit_count = 0
        self.last_visit = None
        self.segment = "new"  # new, regular, vip, premium

class Visit:
    """Razred za obiske"""
    def __init__(self, visit_id: str, customer_id: str, visit_date: datetime,
                 services_used: List[str], amount_spent: float, satisfaction_rating: int = 0):
        self.visit_id = visit_id
        self.customer_id = customer_id
        self.visit_date = visit_date
        self.services_used = services_used
        self.amount_spent = amount_spent
        self.satisfaction_rating = satisfaction_rating
        self.notes = ""

class Interaction:
    """Razred za interakcije"""
    def __init__(self, interaction_id: str, customer_id: str, interaction_type: str,
                 channel: str, content: str, timestamp: datetime = None):
        self.interaction_id = interaction_id
        self.customer_id = customer_id
        self.interaction_type = interaction_type  # email, sms, call, chat, social_media
        self.channel = channel
        self.content = content
        self.timestamp = timestamp or datetime.now()
        self.response_required = False

class LoyaltyProgram:
    """Razred za program zvestobe"""
    def __init__(self, program_id: str, name: str, description: str):
        self.program_id = program_id
        self.name = name
        self.description = description
        self.rules = {}
        self.rewards = []
        self.active = True

class PersonalizedRecommendation:
    """Razred za personalizirane priporočila"""
    def __init__(self, recommendation_id: str, customer_id: str, 
                 recommendation_type: str, content: str, confidence_score: float):
        self.recommendation_id = recommendation_id
        self.customer_id = customer_id
        self.recommendation_type = recommendation_type  # service, experience, offer, upsell
        self.content = content
        self.confidence_score = confidence_score
        self.created_at = datetime.now()
        self.accepted = False

class UltimateCRMSystem:
    """Glavni CRM sistem"""
    
    def __init__(self, db_path: str = "ultimate_crm.db"):
        self.db_path = db_path
        self.customers = {}
        self.visits = []
        self.interactions = []
        self.loyalty_programs = {}
        self.recommendations = []
        
    def initialize_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela strank
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                customer_id TEXT PRIMARY KEY,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                birth_date TEXT,
                preferences TEXT,
                loyalty_points INTEGER DEFAULT 0,
                total_spent REAL DEFAULT 0.0,
                visit_count INTEGER DEFAULT 0,
                last_visit TIMESTAMP,
                segment TEXT DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela obiskov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS visits (
                visit_id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                visit_date TIMESTAMP NOT NULL,
                services_used TEXT,
                amount_spent REAL NOT NULL,
                satisfaction_rating INTEGER DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
            )
        ''')
        
        # Tabela interakcij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS interactions (
                interaction_id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                interaction_type TEXT NOT NULL,
                channel TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                response_required BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
            )
        ''')
        
        # Tabela programov zvestobe
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS loyalty_programs (
                program_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                rules TEXT,
                rewards TEXT,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela priporočil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recommendations (
                recommendation_id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                recommendation_type TEXT NOT NULL,
                content TEXT NOT NULL,
                confidence_score REAL NOT NULL,
                accepted BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
            )
        ''')
        
        # Tabela kampanj
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                campaign_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                target_segment TEXT,
                channel TEXT NOT NULL,
                content TEXT NOT NULL,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                budget REAL DEFAULT 0.0,
                responses INTEGER DEFAULT 0,
                conversions INTEGER DEFAULT 0,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def add_customer(self, customer: Customer) -> bool:
        """Dodajanje stranke"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO customers (customer_id, first_name, last_name, email, phone,
                                     birth_date, preferences, loyalty_points, total_spent,
                                     visit_count, last_visit, segment)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (customer.customer_id, customer.first_name, customer.last_name,
                  customer.email, customer.phone, customer.birth_date,
                  json.dumps(customer.preferences), customer.loyalty_points,
                  customer.total_spent, customer.visit_count, customer.last_visit,
                  customer.segment))
            
            conn.commit()
            conn.close()
            
            self.customers[customer.customer_id] = customer
            return True
            
        except Exception as e:
            print(f"Napaka pri dodajanju stranke: {e}")
            return False
    
    def record_visit(self, visit: Visit) -> bool:
        """Beleženje obiska"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Dodaj obisk
            cursor.execute('''
                INSERT INTO visits (visit_id, customer_id, visit_date, services_used,
                                  amount_spent, satisfaction_rating, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (visit.visit_id, visit.customer_id, visit.visit_date,
                  json.dumps(visit.services_used), visit.amount_spent,
                  visit.satisfaction_rating, visit.notes))
            
            # Posodobi statistike stranke
            cursor.execute('''
                UPDATE customers 
                SET visit_count = visit_count + 1,
                    total_spent = total_spent + ?,
                    last_visit = ?,
                    loyalty_points = loyalty_points + ?
                WHERE customer_id = ?
            ''', (visit.amount_spent, visit.visit_date, 
                  int(visit.amount_spent / 10), visit.customer_id))  # 1 točka na 10€
            
            # Posodobi segment stranke
            self._update_customer_segment(visit.customer_id)
            
            conn.commit()
            conn.close()
            
            self.visits.append(visit)
            
            # Generiraj priporočila na podlagi obiska
            self._generate_visit_recommendations(visit)
            
            return True
            
        except Exception as e:
            print(f"Napaka pri beleženju obiska: {e}")
            return False
    
    def record_interaction(self, interaction: Interaction) -> bool:
        """Beleženje interakcije"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO interactions (interaction_id, customer_id, interaction_type,
                                        channel, content, timestamp, response_required)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (interaction.interaction_id, interaction.customer_id,
                  interaction.interaction_type, interaction.channel,
                  interaction.content, interaction.timestamp,
                  interaction.response_required))
            
            conn.commit()
            conn.close()
            
            self.interactions.append(interaction)
            return True
            
        except Exception as e:
            print(f"Napaka pri beleženju interakcije: {e}")
            return False
    
    def generate_personalized_recommendations(self, customer_id: str) -> List[Dict]:
        """Generiraj personalizirana priporočila"""
        try:
            if customer_id not in self.customers:
                return []
            
            customer = self.customers[customer_id]
            recommendations = []
            
            # Priporočila na podlagi zgodovine obiskov
            visit_recommendations = self._get_visit_based_recommendations(customer_id)
            recommendations.extend(visit_recommendations)
            
            # Priporočila na podlagi segmenta
            segment_recommendations = self._get_segment_based_recommendations(customer.segment)
            recommendations.extend(segment_recommendations)
            
            # Sezonska priporočila
            seasonal_recommendations = self._get_seasonal_recommendations()
            recommendations.extend(seasonal_recommendations)
            
            # Shrani priporočila v bazo
            for rec in recommendations:
                self._save_recommendation(rec)
            
            return recommendations
            
        except Exception as e:
            print(f"Napaka pri generiranju priporočil: {e}")
            return []
    
    def create_loyalty_program(self, program: LoyaltyProgram) -> bool:
        """Ustvarjanje programa zvestobe"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO loyalty_programs (program_id, name, description, rules, rewards, active)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (program.program_id, program.name, program.description,
                  json.dumps(program.rules), json.dumps(program.rewards), program.active))
            
            conn.commit()
            conn.close()
            
            self.loyalty_programs[program.program_id] = program
            return True
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju programa zvestobe: {e}")
            return False
    
    def segment_customers(self) -> Dict[str, List[str]]:
        """Segmentacija strank"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Posodobi segmente na podlagi kriterijev
            cursor.execute('''
                UPDATE customers 
                SET segment = CASE
                    WHEN total_spent > 5000 AND visit_count > 20 THEN 'premium'
                    WHEN total_spent > 2000 AND visit_count > 10 THEN 'vip'
                    WHEN visit_count > 3 THEN 'regular'
                    ELSE 'new'
                END
            ''')
            
            # Pridobi segmente
            cursor.execute('''
                SELECT segment, GROUP_CONCAT(customer_id) as customer_ids, COUNT(*) as count
                FROM customers
                GROUP BY segment
            ''')
            
            segments = {}
            for row in cursor.fetchall():
                segment_name = row[0]
                customer_ids = row[1].split(',') if row[1] else []
                segments[segment_name] = {
                    'customer_ids': customer_ids,
                    'count': row[2]
                }
            
            conn.commit()
            conn.close()
            
            return segments
            
        except Exception as e:
            print(f"Napaka pri segmentaciji: {e}")
            return {}
    
    def create_marketing_campaign(self, name: str, target_segment: str, 
                                channel: str, content: str, budget: float = 0.0) -> str:
        """Ustvarjanje marketinške kampanje"""
        try:
            campaign_id = f"campaign_{int(datetime.now().timestamp())}"
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO marketing_campaigns (campaign_id, name, target_segment,
                                               channel, content, budget, start_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (campaign_id, name, target_segment, channel, content, budget, datetime.now()))
            
            conn.commit()
            conn.close()
            
            return campaign_id
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju kampanje: {e}")
            return ""
    
    def get_customer_analytics(self) -> Dict:
        """Pridobi analitiko strank"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Osnovne statistike
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_customers,
                    AVG(total_spent) as avg_spent,
                    AVG(visit_count) as avg_visits,
                    AVG(loyalty_points) as avg_loyalty_points
                FROM customers
            ''')
            basic_stats = cursor.fetchone()
            
            # Segmentacija
            cursor.execute('''
                SELECT segment, COUNT(*) as count, AVG(total_spent) as avg_spent
                FROM customers
                GROUP BY segment
            ''')
            segment_stats = cursor.fetchall()
            
            # Zadnji obisk po mesecih
            cursor.execute('''
                SELECT 
                    strftime('%Y-%m', visit_date) as month,
                    COUNT(*) as visits,
                    SUM(amount_spent) as revenue
                FROM visits
                WHERE visit_date > datetime('now', '-12 months')
                GROUP BY strftime('%Y-%m', visit_date)
                ORDER BY month
            ''')
            monthly_stats = cursor.fetchall()
            
            # Top storitve
            cursor.execute('''
                SELECT 
                    json_extract(services_used, '$[0]') as service,
                    COUNT(*) as usage_count
                FROM visits
                WHERE services_used IS NOT NULL
                GROUP BY service
                ORDER BY usage_count DESC
                LIMIT 10
            ''')
            top_services = cursor.fetchall()
            
            conn.close()
            
            return {
                "basic_statistics": {
                    "total_customers": basic_stats[0],
                    "average_spent": round(basic_stats[1] or 0, 2),
                    "average_visits": round(basic_stats[2] or 0, 1),
                    "average_loyalty_points": round(basic_stats[3] or 0, 0)
                },
                "segment_analysis": [
                    {
                        "segment": stat[0],
                        "count": stat[1],
                        "average_spent": round(stat[2] or 0, 2)
                    } for stat in segment_stats
                ],
                "monthly_trends": [
                    {
                        "month": stat[0],
                        "visits": stat[1],
                        "revenue": round(stat[2] or 0, 2)
                    } for stat in monthly_stats
                ],
                "top_services": [
                    {
                        "service": stat[0],
                        "usage_count": stat[1]
                    } for stat in top_services if stat[0]
                ]
            }
            
        except Exception as e:
            print(f"Napaka pri pridobivanju analitike: {e}")
            return {}
    
    def _update_customer_segment(self, customer_id: str):
        """Posodobi segment stranke"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT total_spent, visit_count FROM customers WHERE customer_id = ?
            ''', (customer_id,))
            
            result = cursor.fetchone()
            if result:
                total_spent, visit_count = result
                
                if total_spent > 5000 and visit_count > 20:
                    new_segment = "premium"
                elif total_spent > 2000 and visit_count > 10:
                    new_segment = "vip"
                elif visit_count > 3:
                    new_segment = "regular"
                else:
                    new_segment = "new"
                
                cursor.execute('''
                    UPDATE customers SET segment = ? WHERE customer_id = ?
                ''', (new_segment, customer_id))
                
                conn.commit()
            
            conn.close()
            
        except Exception as e:
            print(f"Napaka pri posodabljanju segmenta: {e}")
    
    def _generate_visit_recommendations(self, visit: Visit):
        """Generiraj priporočila na podlagi obiska"""
        recommendations = []
        
        # Priporočila na podlagi uporabljenih storitev
        if "spa" in visit.services_used:
            recommendations.append({
                "customer_id": visit.customer_id,
                "type": "upsell",
                "content": "Poskusite naš premium spa paket z masažo in savno",
                "confidence": 0.8
            })
        
        if "restaurant" in visit.services_used:
            recommendations.append({
                "customer_id": visit.customer_id,
                "type": "experience",
                "content": "Rezervirajte degustacijski meni z lokalnimi specialitetami",
                "confidence": 0.7
            })
        
        # Priporočila na podlagi ocene zadovoljstva
        if visit.satisfaction_rating >= 4:
            recommendations.append({
                "customer_id": visit.customer_id,
                "type": "offer",
                "content": "Posebna ponudba za zveste goste - 20% popust na naslednji obisk",
                "confidence": 0.9
            })
        
        return recommendations
    
    def _get_visit_based_recommendations(self, customer_id: str) -> List[Dict]:
        """Priporočila na podlagi zgodovine obiskov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT services_used, satisfaction_rating
                FROM visits
                WHERE customer_id = ?
                ORDER BY visit_date DESC
                LIMIT 5
            ''', (customer_id,))
            
            recent_visits = cursor.fetchall()
            conn.close()
            
            recommendations = []
            
            # Analiza zadnjih obiskov
            all_services = []
            avg_satisfaction = 0
            
            for visit in recent_visits:
                if visit[0]:
                    services = json.loads(visit[0])
                    all_services.extend(services)
                avg_satisfaction += visit[1]
            
            if recent_visits:
                avg_satisfaction /= len(recent_visits)
            
            # Generiraj priporočila
            if "spa" in all_services:
                recommendations.append({
                    "customer_id": customer_id,
                    "type": "service",
                    "content": "Wellness vikend paket z dodatnimi spa storitvami",
                    "confidence": 0.85
                })
            
            if avg_satisfaction >= 4:
                recommendations.append({
                    "customer_id": customer_id,
                    "type": "offer",
                    "content": "VIP program za naše najbolj zadovoljne goste",
                    "confidence": 0.9
                })
            
            return recommendations
            
        except Exception as e:
            print(f"Napaka pri priporočilih na podlagi obiskov: {e}")
            return []
    
    def _get_segment_based_recommendations(self, segment: str) -> List[Dict]:
        """Priporočila na podlagi segmenta"""
        recommendations = []
        
        if segment == "premium":
            recommendations.append({
                "type": "experience",
                "content": "Ekskluzivni chef's table z degustacijo vin",
                "confidence": 0.9
            })
        elif segment == "vip":
            recommendations.append({
                "type": "service",
                "content": "Personalizirani concierge servis za vaš naslednji obisk",
                "confidence": 0.8
            })
        elif segment == "regular":
            recommendations.append({
                "type": "offer",
                "content": "Loyalty program z dodatnimi ugodnostmi",
                "confidence": 0.7
            })
        else:  # new
            recommendations.append({
                "type": "experience",
                "content": "Dobrodošli paket za nove goste s posebnim popustom",
                "confidence": 0.6
            })
        
        return recommendations
    
    def _get_seasonal_recommendations(self) -> List[Dict]:
        """Sezonska priporočila"""
        current_month = datetime.now().month
        recommendations = []
        
        if current_month in [12, 1, 2]:  # Zima
            recommendations.append({
                "type": "experience",
                "content": "Zimski wellness paket s savno in toplimi napitki",
                "confidence": 0.7
            })
        elif current_month in [6, 7, 8]:  # Poletje
            recommendations.append({
                "type": "experience",
                "content": "Poletni outdoor paket z aktivnostmi na prostem",
                "confidence": 0.7
            })
        
        return recommendations
    
    def _save_recommendation(self, recommendation: Dict):
        """Shrani priporočilo"""
        try:
            rec_id = f"rec_{int(datetime.now().timestamp())}_{random.randint(1000, 9999)}"
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO recommendations (recommendation_id, customer_id, 
                                           recommendation_type, content, confidence_score)
                VALUES (?, ?, ?, ?, ?)
            ''', (rec_id, recommendation.get("customer_id", ""), 
                  recommendation["type"], recommendation["content"], 
                  recommendation["confidence"]))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Napaka pri shranjevanju priporočila: {e}")

def load_demo_data(system: UltimateCRMSystem):
    """Naloži demo podatke"""
    
    # Demo stranke
    customers = [
        Customer("cust_001", "Ana", "Novak", "ana.novak@email.com", "+386 41 123 456", "1985-03-15"),
        Customer("cust_002", "Marko", "Kovač", "marko.kovac@email.com", "+386 41 234 567", "1978-07-22"),
        Customer("cust_003", "Petra", "Horvat", "petra.horvat@email.com", "+386 41 345 678", "1992-11-08"),
        Customer("cust_004", "Janez", "Kranjc", "janez.kranjc@email.com", "+386 41 456 789", "1980-05-30"),
        Customer("cust_005", "Maja", "Zupan", "maja.zupan@email.com", "+386 41 567 890", "1988-09-12"),
    ]
    
    # Nastavi preference strank
    customers[0].preferences = {"spa": True, "restaurant": True, "activities": ["wellness", "massage"]}
    customers[1].preferences = {"restaurant": True, "business": True, "activities": ["conference", "dining"]}
    customers[2].preferences = {"spa": True, "romance": True, "activities": ["couples_massage", "wine_tasting"]}
    customers[3].preferences = {"business": True, "golf": True, "activities": ["meetings", "golf"]}
    customers[4].preferences = {"family": True, "activities": ["family_room", "kids_activities"]}
    
    # Dodaj stranke
    for customer in customers:
        system.add_customer(customer)
    
    # Demo obisk
    visits = [
        Visit("visit_001", "cust_001", datetime.now() - timedelta(days=30), 
              ["spa", "restaurant"], 450.0, 5),
        Visit("visit_002", "cust_001", datetime.now() - timedelta(days=60), 
              ["spa", "massage"], 320.0, 4),
        Visit("visit_003", "cust_002", datetime.now() - timedelta(days=15), 
              ["restaurant", "conference"], 680.0, 5),
        Visit("visit_004", "cust_003", datetime.now() - timedelta(days=45), 
              ["spa", "couples_massage"], 520.0, 5),
        Visit("visit_005", "cust_004", datetime.now() - timedelta(days=20), 
              ["business_center", "restaurant"], 380.0, 4),
        Visit("visit_006", "cust_005", datetime.now() - timedelta(days=10), 
              ["family_room", "kids_activities"], 290.0, 4),
    ]
    
    # Dodaj obiske
    for visit in visits:
        system.record_visit(visit)
    
    # Demo interakcije
    interactions = [
        Interaction("int_001", "cust_001", "email", "newsletter", 
                   "Poslano mesečno glasilo z novimi spa storitvami"),
        Interaction("int_002", "cust_002", "call", "phone", 
                   "Klicali za rezervacijo konferenčne sale"),
        Interaction("int_003", "cust_003", "sms", "mobile", 
                   "Poslano SMS z obletnico poroke"),
        Interaction("int_004", "cust_004", "email", "promotion", 
                   "Poslana posebna ponudba za poslovne goste"),
    ]
    
    # Dodaj interakcije
    for interaction in interactions:
        system.record_interaction(interaction)
    
    # Demo programi zvestobe
    loyalty_programs = [
        LoyaltyProgram("loyalty_001", "Gold Member", "Premium program za zveste goste"),
        LoyaltyProgram("loyalty_002", "Business Elite", "Posebni program za poslovne goste"),
        LoyaltyProgram("loyalty_003", "Wellness Club", "Program za ljubitelje wellnessa"),
    ]
    
    # Nastavi pravila programov
    loyalty_programs[0].rules = {"min_visits": 10, "min_spent": 2000}
    loyalty_programs[0].rewards = ["free_spa_day", "room_upgrade", "late_checkout"]
    
    loyalty_programs[1].rules = {"min_visits": 5, "business_bookings": True}
    loyalty_programs[1].rewards = ["meeting_room_discount", "business_lounge", "priority_booking"]
    
    loyalty_programs[2].rules = {"spa_visits": 5, "wellness_focus": True}
    loyalty_programs[2].rewards = ["free_massage", "spa_discount", "wellness_consultation"]
    
    # Dodaj programe zvestobe
    for program in loyalty_programs:
        system.create_loyalty_program(program)

def demo_crm_system():
    """Demo funkcija za CRM sistem"""
    print("👥 ULTIMATE CRM System Demo")
    print("=" * 50)
    
    # Inicializacija sistema
    system = UltimateCRMSystem()
    system.initialize_database()
    
    # Naloži demo podatke
    load_demo_data(system)
    
    # Segmentacija strank
    segments = system.segment_customers()
    print(f"\n📊 Segmentacija strank:")
    for segment, data in segments.items():
        print(f"{segment}: {data['count']} strank")
    
    # Analitika strank
    analytics = system.get_customer_analytics()
    print(f"\n📈 Analitika strank:")
    print(f"Skupaj strank: {analytics.get('basic_statistics', {}).get('total_customers', 0)}")
    print(f"Povprečna poraba: {analytics.get('basic_statistics', {}).get('average_spent', 0)}€")
    print(f"Povprečno obiskov: {analytics.get('basic_statistics', {}).get('average_visits', 0)}")
    
    # Personalizirana priporočila
    recommendations = system.generate_personalized_recommendations("cust_001")
    print(f"\n🎯 Priporočila za stranko cust_001:")
    for rec in recommendations[:3]:
        print(f"- {rec['content']} (zaupanje: {rec['confidence']:.1%})")
    
    # Marketinška kampanja
    campaign_id = system.create_marketing_campaign(
        "Poletna wellness ponudba", "regular", "email", 
        "Posebna 30% popust na vse spa storitve v juliju", 1500.0
    )
    print(f"\n📧 Ustvarjena kampanja: {campaign_id}")
    
    return system

if __name__ == "__main__":
    demo_crm_system()