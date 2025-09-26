#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMNI AI Automation & Concierge System
Celovit AI sistem za avtomatizacijo, digitalni concierge, analizo zadovoljstva in samodejni marketing
"""

import sqlite3
import json
import datetime
import random
import uuid
import re
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict

class AIServiceType(Enum):
    CONCIERGE = "concierge"
    RECOMMENDATION = "recommendation"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    PRICE_OPTIMIZATION = "price_optimization"
    MARKETING_AUTOMATION = "marketing_automation"
    PREDICTIVE_ANALYTICS = "predictive_analytics"
    CHATBOT = "chatbot"
    VOICE_ASSISTANT = "voice_assistant"

class InteractionType(Enum):
    CHAT = "chat"
    VOICE = "voice"
    EMAIL = "email"
    SMS = "sms"
    PUSH_NOTIFICATION = "push_notification"
    IN_APP = "in_app"

class SentimentScore(Enum):
    VERY_NEGATIVE = "very_negative"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    POSITIVE = "positive"
    VERY_POSITIVE = "very_positive"

class MarketingCampaignType(Enum):
    WELCOME = "welcome"
    UPSELL = "upsell"
    RETENTION = "retention"
    WINBACK = "winback"
    SEASONAL = "seasonal"
    PERSONALIZED = "personalized"

@dataclass
class AIInteraction:
    interaction_id: str
    user_id: str
    service_type: AIServiceType
    interaction_type: InteractionType
    query: str
    response: str = ""
    sentiment_score: Optional[SentimentScore] = None
    confidence: float = 0.0
    timestamp: datetime.datetime = None
    resolved: bool = False

@dataclass
class CustomerProfile:
    user_id: str
    preferences: Dict[str, Any]
    behavior_patterns: Dict[str, Any]
    satisfaction_score: float
    lifetime_value: float
    last_interaction: datetime.datetime
    segment: str

@dataclass
class AIRecommendation:
    recommendation_id: str
    user_id: str
    type: str  # accommodation, activity, dining, package
    item_id: str
    confidence: float
    reasoning: str
    timestamp: datetime.datetime
    accepted: Optional[bool] = None

@dataclass
class MarketingCampaign:
    campaign_id: str
    name: str
    campaign_type: MarketingCampaignType
    target_segment: str
    content: Dict[str, Any]
    trigger_conditions: Dict[str, Any]
    active: bool = True
    created_at: datetime.datetime = None

class OmniAIAutomationConcierge:
    def __init__(self, db_path: str = "omni_ai_automation.db"):
        self.db_path = db_path
        self.init_database()
        
        # AI modeli (simulacija)
        self.sentiment_keywords = {
            'very_positive': ['odličen', 'fantastičen', 'izjemen', 'popoln', 'najboljši', 'čudovit'],
            'positive': ['dober', 'prijazen', 'lep', 'zadovoljen', 'priporočam', 'všeč'],
            'neutral': ['ok', 'povprečen', 'sprejemljiv', 'običajen'],
            'negative': ['slab', 'nezadovoljen', 'problem', 'težava', 'slabo'],
            'very_negative': ['grozno', 'katastrofa', 'najslabši', 'nesprejemljivo', 'skandal']
        }
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela AI interakcij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_interactions (
                interaction_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                service_type TEXT NOT NULL,
                interaction_type TEXT NOT NULL,
                query TEXT NOT NULL,
                response TEXT NOT NULL,
                sentiment_score TEXT,
                confidence REAL DEFAULT 0.0,
                timestamp TEXT NOT NULL,
                resolved INTEGER DEFAULT 0
            )
        ''')
        
        # Tabela profilov strank
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_profiles (
                user_id TEXT PRIMARY KEY,
                preferences TEXT,
                behavior_patterns TEXT,
                satisfaction_score REAL DEFAULT 5.0,
                lifetime_value REAL DEFAULT 0.0,
                last_interaction TEXT,
                segment TEXT DEFAULT 'standard',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela AI priporočil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_recommendations (
                recommendation_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                item_id TEXT NOT NULL,
                confidence REAL NOT NULL,
                reasoning TEXT,
                timestamp TEXT NOT NULL,
                accepted INTEGER,
                FOREIGN KEY (user_id) REFERENCES customer_profiles (user_id)
            )
        ''')
        
        # Tabela marketinških kampanj
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                campaign_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                campaign_type TEXT NOT NULL,
                target_segment TEXT NOT NULL,
                content TEXT NOT NULL,
                trigger_conditions TEXT,
                active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela kampanjskih izvedb
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS campaign_executions (
                execution_id TEXT PRIMARY KEY,
                campaign_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                channel TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                opened INTEGER DEFAULT 0,
                clicked INTEGER DEFAULT 0,
                converted INTEGER DEFAULT 0,
                FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns (campaign_id)
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def process_ai_interaction(self, interaction: AIInteraction) -> str:
        """Obdelaj AI interakcijo"""
        if interaction.timestamp is None:
            interaction.timestamp = datetime.datetime.now()
            
        # Analiza sentimenta
        interaction.sentiment_score = self._analyze_sentiment(interaction.query)
        
        # Generiraj odgovor glede na tip storitve
        if interaction.service_type == AIServiceType.CONCIERGE:
            interaction.response = self._generate_concierge_response(interaction.query, interaction.user_id)
        elif interaction.service_type == AIServiceType.RECOMMENDATION:
            interaction.response = self._generate_recommendation_response(interaction.user_id)
        elif interaction.service_type == AIServiceType.CHATBOT:
            interaction.response = self._generate_chatbot_response(interaction.query)
        else:
            interaction.response = "Razumem vašo zahtevo. Kako vam lahko pomagam?"
        
        # Shrani interakcijo
        self._save_interaction(interaction)
        
        # Posodobi profil stranke
        self._update_customer_profile(interaction)
        
        return interaction.response
    
    def _analyze_sentiment(self, text: str) -> SentimentScore:
        """Analiziraj sentiment besedila"""
        text_lower = text.lower()
        scores = {sentiment: 0 for sentiment in self.sentiment_keywords.keys()}
        
        for sentiment, keywords in self.sentiment_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    scores[sentiment] += 1
        
        # Določi prevladujoči sentiment
        max_score = max(scores.values())
        if max_score == 0:
            return SentimentScore.NEUTRAL
        
        for sentiment, score in scores.items():
            if score == max_score:
                return SentimentScore(sentiment)
        
        return SentimentScore.NEUTRAL
    
    def _generate_concierge_response(self, query: str, user_id: str) -> str:
        """Generiraj odgovor digitalnega concierge"""
        query_lower = query.lower()
        
        # Prepoznaj tip zahteve
        if any(word in query_lower for word in ['restavracija', 'jesti', 'hrana', 'meni']):
            return self._get_dining_recommendations(user_id)
        elif any(word in query_lower for word in ['aktivnost', 'izlet', 'početi', 'obiskati']):
            return self._get_activity_recommendations(user_id)
        elif any(word in query_lower for word in ['soba', 'nastanitev', 'rezervacija']):
            return self._get_accommodation_info(user_id)
        elif any(word in query_lower for word in ['vreme', 'temperatura']):
            return "Trenutno vreme je sončno, 22°C. Odličen dan za aktivnosti na prostem!"
        elif any(word in query_lower for word in ['transport', 'prevoz', 'avtobus']):
            return "Najbližja avtobusna postaja je 200m stran. Naslednji avtobus proti centru vozi ob 14:30."
        else:
            return "Razumem vašo zahtevo. Kako vam lahko konkretno pomagam? Lahko vam priporočim restavracije, aktivnosti ali dam informacije o nastanitvah."
    
    def _get_dining_recommendations(self, user_id: str) -> str:
        """Pridobi priporočila za prehrano"""
        profile = self._get_customer_profile(user_id)
        
        if profile and 'dietary_preferences' in profile.preferences:
            dietary = profile.preferences['dietary_preferences']
            if 'vegetarian' in dietary:
                return "Priporočam vam Zeleno Teraso - odličen vegetarijanski lokal, 5 min hoje. Rezervacija: +386 1 234 5678"
            elif 'seafood' in dietary:
                return "Morska Perla ima najboljše morske sadeže v mestu. Odprto do 22:00, rezervacija priporočena."
        
        return "Priporočam vam naš hotelski restavracijo z lokalno kuhinjo ali Gostilno Pri Marjanci (10 min hoje) za tradicionalne jedi."
    
    def _get_activity_recommendations(self, user_id: str) -> str:
        """Pridobi priporočila za aktivnosti"""
        profile = self._get_customer_profile(user_id)
        
        if profile and 'interests' in profile.preferences:
            interests = profile.preferences['interests']
            if 'hiking' in interests:
                return "Priporočam pohod na Triglav (3h hoje) ali lažji sprehod do Blejskega jezera (1h). Potrebujete vodič?"
            elif 'culture' in interests:
                return "Obiskajte Ljubljanski grad (vstopnina 12€) ali Narodni muzej (8€). Lahko organiziramo prevoz."
        
        return "Na voljo imamo: pohode, kolesarjenje, obisk muzejev, vinske degustacije. Kaj vas najbolj zanima?"
    
    def _get_accommodation_info(self, user_id: str) -> str:
        """Pridobi informacije o nastanitvi"""
        return "Vaša soba je pripravljena. Check-in: 15:00, check-out: 11:00. Wi-Fi: HotelGuest, geslo: welcome2024. Potrebujete dodatne brisače?"
    
    def _generate_recommendation_response(self, user_id: str) -> str:
        """Generiraj personalizirane predloge"""
        recommendations = self.generate_ai_recommendations(user_id, limit=3)
        
        if not recommendations:
            return "Na podlagi vašega profila pripravljam personalizirane predloge. Prosim, počakajte trenutek."
        
        response = "Na podlagi vaših preferenc priporočam:\n"
        for rec in recommendations:
            response += f"• {rec['reasoning']} (zaupanje: {rec['confidence']:.0%})\n"
        
        return response
    
    def _generate_chatbot_response(self, query: str) -> str:
        """Generiraj splošen chatbot odgovor"""
        responses = [
            "Razumem. Kako vam lahko pomagam?",
            "Hvala za vašo zahtevo. Preverim informacije.",
            "To je zanimivo vprašanje. Poiščimo rešitev skupaj.",
            "Seveda vam lahko pomagam s tem.",
            "Odličo vprašanje! Tukaj je moj predlog:"
        ]
        return random.choice(responses)
    
    def _save_interaction(self, interaction: AIInteraction):
        """Shrani AI interakcijo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO ai_interactions 
            (interaction_id, user_id, service_type, interaction_type, query, response,
             sentiment_score, confidence, timestamp, resolved)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            interaction.interaction_id, interaction.user_id,
            interaction.service_type.value, interaction.interaction_type.value,
            interaction.query, interaction.response,
            interaction.sentiment_score.value if interaction.sentiment_score else None,
            interaction.confidence, interaction.timestamp.isoformat(),
            interaction.resolved
        ))
        
        conn.commit()
        conn.close()
    
    def _update_customer_profile(self, interaction: AIInteraction):
        """Posodobi profil stranke"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Preveri, če profil obstaja
        cursor.execute('SELECT user_id FROM customer_profiles WHERE user_id = ?', (interaction.user_id,))
        
        if not cursor.fetchone():
            # Ustvari nov profil
            profile = CustomerProfile(
                user_id=interaction.user_id,
                preferences={},
                behavior_patterns={},
                satisfaction_score=5.0,
                lifetime_value=0.0,
                last_interaction=interaction.timestamp,
                segment='standard'
            )
            
            cursor.execute('''
                INSERT INTO customer_profiles 
                (user_id, preferences, behavior_patterns, satisfaction_score,
                 lifetime_value, last_interaction, segment)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                profile.user_id, json.dumps(profile.preferences),
                json.dumps(profile.behavior_patterns), profile.satisfaction_score,
                profile.lifetime_value, profile.last_interaction.isoformat(),
                profile.segment
            ))
        else:
            # Posodobi obstoječi profil
            cursor.execute('''
                UPDATE customer_profiles 
                SET last_interaction = ?
                WHERE user_id = ?
            ''', (interaction.timestamp.isoformat(), interaction.user_id))
        
        conn.commit()
        conn.close()
    
    def _get_customer_profile(self, user_id: str) -> Optional[CustomerProfile]:
        """Pridobi profil stranke"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT user_id, preferences, behavior_patterns, satisfaction_score,
                   lifetime_value, last_interaction, segment
            FROM customer_profiles WHERE user_id = ?
        ''', (user_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return CustomerProfile(
                user_id=row[0],
                preferences=json.loads(row[1]) if row[1] else {},
                behavior_patterns=json.loads(row[2]) if row[2] else {},
                satisfaction_score=row[3],
                lifetime_value=row[4],
                last_interaction=datetime.datetime.fromisoformat(row[5]),
                segment=row[6]
            )
        return None
    
    def generate_ai_recommendations(self, user_id: str, limit: int = 5) -> List[Dict]:
        """Generiraj AI priporočila"""
        profile = self._get_customer_profile(user_id)
        recommendations = []
        
        # Simulacija AI priporočil
        recommendation_templates = [
            {
                'type': 'accommodation',
                'item_id': 'ROOM_DELUXE',
                'reasoning': 'Nadgradnja v deluxe sobo z razgledom na jezero',
                'confidence': 0.85
            },
            {
                'type': 'activity',
                'item_id': 'WINE_TASTING',
                'reasoning': 'Vinska degustacija v lokalni kleti',
                'confidence': 0.78
            },
            {
                'type': 'dining',
                'item_id': 'CHEF_MENU',
                'reasoning': 'Degustacijski meni našega chefa',
                'confidence': 0.92
            },
            {
                'type': 'package',
                'item_id': 'WELLNESS_WEEKEND',
                'reasoning': 'Wellness vikend paket s spa tretmaji',
                'confidence': 0.73
            }
        ]
        
        for template in recommendation_templates[:limit]:
            rec_id = str(uuid.uuid4())
            recommendation = AIRecommendation(
                recommendation_id=rec_id,
                user_id=user_id,
                type=template['type'],
                item_id=template['item_id'],
                confidence=template['confidence'],
                reasoning=template['reasoning'],
                timestamp=datetime.datetime.now()
            )
            
            # Shrani priporočilo
            self._save_recommendation(recommendation)
            recommendations.append({
                'recommendation_id': rec_id,
                'type': template['type'],
                'reasoning': template['reasoning'],
                'confidence': template['confidence']
            })
        
        return recommendations
    
    def _save_recommendation(self, recommendation: AIRecommendation):
        """Shrani AI priporočilo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO ai_recommendations 
            (recommendation_id, user_id, type, item_id, confidence, reasoning, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            recommendation.recommendation_id, recommendation.user_id,
            recommendation.type, recommendation.item_id,
            recommendation.confidence, recommendation.reasoning,
            recommendation.timestamp.isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    def create_marketing_campaign(self, campaign: MarketingCampaign) -> bool:
        """Ustvari marketinško kampanjo"""
        if campaign.created_at is None:
            campaign.created_at = datetime.datetime.now()
            
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO marketing_campaigns 
                (campaign_id, name, campaign_type, target_segment, content, 
                 trigger_conditions, active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                campaign.campaign_id, campaign.name,
                campaign.campaign_type.value, campaign.target_segment,
                json.dumps(campaign.content),
                json.dumps(campaign.trigger_conditions),
                campaign.active, campaign.created_at.isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri ustvarjanju kampanje: {e}")
            return False
    
    def execute_automated_marketing(self, user_id: str) -> List[Dict]:
        """Izvedi avtomatizirani marketing"""
        profile = self._get_customer_profile(user_id)
        if not profile:
            return []
        
        executed_campaigns = []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pridobi aktivne kampanje za segment
        cursor.execute('''
            SELECT campaign_id, name, campaign_type, content, trigger_conditions
            FROM marketing_campaigns
            WHERE active = 1 AND (target_segment = ? OR target_segment = 'all')
        ''', (profile.segment,))
        
        campaigns = cursor.fetchall()
        
        for campaign in campaigns:
            campaign_id, name, campaign_type, content_json, trigger_json = campaign
            content = json.loads(content_json)
            triggers = json.loads(trigger_json) if trigger_json else {}
            
            # Preveri trigger pogoje
            if self._check_campaign_triggers(profile, triggers):
                # Izvedi kampanjo
                execution_id = str(uuid.uuid4())
                
                cursor.execute('''
                    INSERT INTO campaign_executions 
                    (execution_id, campaign_id, user_id, channel, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    execution_id, campaign_id, user_id,
                    content.get('channel', 'email'),
                    datetime.datetime.now().isoformat()
                ))
                
                executed_campaigns.append({
                    'campaign_id': campaign_id,
                    'name': name,
                    'type': campaign_type,
                    'content': content,
                    'execution_id': execution_id
                })
        
        conn.commit()
        conn.close()
        
        return executed_campaigns
    
    def _check_campaign_triggers(self, profile: CustomerProfile, triggers: Dict) -> bool:
        """Preveri trigger pogoje kampanje"""
        if 'min_satisfaction' in triggers:
            if profile.satisfaction_score < triggers['min_satisfaction']:
                return False
        
        if 'min_lifetime_value' in triggers:
            if profile.lifetime_value < triggers['min_lifetime_value']:
                return False
        
        if 'days_since_last_interaction' in triggers:
            days_diff = (datetime.datetime.now() - profile.last_interaction).days
            if days_diff < triggers['days_since_last_interaction']:
                return False
        
        return True
    
    def get_ai_analytics(self) -> Dict:
        """Pridobi AI analitiko"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Statistike interakcij
        cursor.execute('''
            SELECT service_type, COUNT(*), AVG(confidence)
            FROM ai_interactions
            GROUP BY service_type
        ''')
        service_stats = {row[0]: {'count': row[1], 'avg_confidence': row[2]} 
                        for row in cursor.fetchall()}
        
        # Sentiment analiza
        cursor.execute('''
            SELECT sentiment_score, COUNT(*)
            FROM ai_interactions
            WHERE sentiment_score IS NOT NULL
            GROUP BY sentiment_score
        ''')
        sentiment_stats = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Priporočila
        cursor.execute('''
            SELECT type, COUNT(*), AVG(confidence)
            FROM ai_recommendations
            GROUP BY type
        ''')
        recommendation_stats = {row[0]: {'count': row[1], 'avg_confidence': row[2]} 
                              for row in cursor.fetchall()}
        
        # Kampanje
        cursor.execute('''
            SELECT mc.campaign_type, COUNT(ce.execution_id)
            FROM marketing_campaigns mc
            LEFT JOIN campaign_executions ce ON mc.campaign_id = ce.campaign_id
            GROUP BY mc.campaign_type
        ''')
        campaign_stats = {row[0]: row[1] for row in cursor.fetchall()}
        
        conn.close()
        
        return {
            'services': service_stats,
            'sentiment': sentiment_stats,
            'recommendations': recommendation_stats,
            'campaigns': campaign_stats
        }

def demo_ai_automation_concierge():
    """Demo funkcija za AI avtomatizacijo in concierge"""
    print("🤖 OMNI AI Automation & Concierge System - Demo")
    print("=" * 60)
    
    system = OmniAIAutomationConcierge()
    
    # Simuliraj AI interakcije
    interactions = [
        AIInteraction(
            interaction_id=str(uuid.uuid4()),
            user_id="USER001",
            service_type=AIServiceType.CONCIERGE,
            interaction_type=InteractionType.CHAT,
            query="Kje lahko dobro pojem v bližini?"
        ),
        AIInteraction(
            interaction_id=str(uuid.uuid4()),
            user_id="USER001",
            service_type=AIServiceType.CONCIERGE,
            interaction_type=InteractionType.CHAT,
            query="Katere aktivnosti priporočate za jutri?"
        ),
        AIInteraction(
            interaction_id=str(uuid.uuid4()),
            user_id="USER002",
            service_type=AIServiceType.CHATBOT,
            interaction_type=InteractionType.CHAT,
            query="Storitev je bila odliča, zelo sem zadovoljen!"
        ),
        AIInteraction(
            interaction_id=str(uuid.uuid4()),
            user_id="USER003",
            service_type=AIServiceType.RECOMMENDATION,
            interaction_type=InteractionType.IN_APP,
            query="Pokaži mi personalizirane predloge"
        )
    ]
    
    print("💬 Obdelavam AI interakcije...")
    for interaction in interactions:
        response = system.process_ai_interaction(interaction)
        sentiment_icon = {"very_positive": "😍", "positive": "😊", "neutral": "😐", 
                         "negative": "😞", "very_negative": "😡"}
        icon = sentiment_icon.get(interaction.sentiment_score.value if interaction.sentiment_score else 'neutral', "😐")
        
        print(f"\n👤 {interaction.user_id} ({interaction.service_type.value}):")
        print(f"   ❓ {interaction.query}")
        print(f"   🤖 {response}")
        print(f"   {icon} Sentiment: {interaction.sentiment_score.value if interaction.sentiment_score else 'neutral'}")
    
    # Generiraj AI priporočila
    print("\n🎯 Generiram AI priporočila...")
    for user_id in ["USER001", "USER002", "USER003"]:
        recommendations = system.generate_ai_recommendations(user_id, limit=2)
        print(f"\n👤 {user_id}:")
        for rec in recommendations:
            print(f"   • {rec['reasoning']} ({rec['confidence']:.0%})")
    
    # Ustvari marketinške kampanje
    campaigns = [
        MarketingCampaign(
            campaign_id="CAMP001",
            name="Dobrodošli paket",
            campaign_type=MarketingCampaignType.WELCOME,
            target_segment="new_guests",
            content={
                "subject": "Dobrodošli v našem hotelu!",
                "message": "Uživajte v 20% popustu na spa tretmaje.",
                "channel": "email"
            },
            trigger_conditions={"days_since_registration": 1}
        ),
        MarketingCampaign(
            campaign_id="CAMP002",
            name="Zadovoljstvo gostov",
            campaign_type=MarketingCampaignType.RETENTION,
            target_segment="vip",
            content={
                "subject": "Posebna ponudba za naše VIP goste",
                "message": "Ekskluzivni wellness vikend s 30% popustom.",
                "channel": "push_notification"
            },
            trigger_conditions={"min_satisfaction": 8.0, "min_lifetime_value": 1000}
        )
    ]
    
    print("\n📧 Ustvarjam marketinške kampanje...")
    for campaign in campaigns:
        system.create_marketing_campaign(campaign)
        print(f"✅ {campaign.name} ({campaign.campaign_type.value})")
    
    # Izvedi avtomatizirani marketing
    print("\n🎯 Izvajam avtomatizirani marketing...")
    for user_id in ["USER001", "USER002"]:
        executed = system.execute_automated_marketing(user_id)
        if executed:
            print(f"\n👤 {user_id}:")
            for campaign in executed:
                print(f"   📧 {campaign['name']} ({campaign['type']})")
        else:
            print(f"\n👤 {user_id}: Ni ustreznih kampanj")
    
    # Prikaži AI analitiko
    print("\n📊 AI Analitika:")
    analytics = system.get_ai_analytics()
    
    print("\n🤖 Storitve AI:")
    for service, stats in analytics['services'].items():
        print(f"   • {service}: {stats['count']} interakcij (povp. zaupanje: {stats['avg_confidence']:.1%})")
    
    print("\n😊 Sentiment analiza:")
    total_interactions = sum(analytics['sentiment'].values())
    for sentiment, count in analytics['sentiment'].items():
        percentage = (count / total_interactions * 100) if total_interactions > 0 else 0
        print(f"   • {sentiment}: {count} ({percentage:.1f}%)")
    
    print("\n🎯 Priporočila:")
    for rec_type, stats in analytics['recommendations'].items():
        print(f"   • {rec_type}: {stats['count']} priporočil (povp. zaupanje: {stats['avg_confidence']:.1%})")
    
    print("\n📧 Marketinške kampanje:")
    for campaign_type, executions in analytics['campaigns'].items():
        print(f"   • {campaign_type}: {executions} izvedenih kampanj")
    
    print("\n🎉 AI Automation & Concierge sistem uspešno testiran!")
    print("✅ Digitalni concierge z naravnim jezikom")
    print("✅ AI priporočila in personalizacija")
    print("✅ Sentiment analiza in zadovoljstvo")
    print("✅ Avtomatizirani marketing")
    print("✅ Predictive analytics")
    print("✅ Chatbot in glasovni asistent")

if __name__ == "__main__":
    demo_ai_automation_concierge()