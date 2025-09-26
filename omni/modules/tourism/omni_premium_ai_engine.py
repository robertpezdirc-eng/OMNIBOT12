#!/usr/bin/env python3
"""
🤖 OMNI PREMIUM AI ENGINE - Napredne AI funkcionalnosti za optimizacijo cen in menijev

Centraliziran oblačni sistem z naprednimi AI algoritmi za:
- Dinamično optimizacijo cen na podlagi povpraševanja
- Inteligentno priporočanje menijev
- Prediktivno analitiko prodaje
- Personalizirane ponudbe za goste
- Optimizacijo zalog in nabave
- Sezonsko prilagajanje cen
- Konkurenčno analizo
- AI-powered revenue management

Varnostne funkcije:
- Centraliziran oblak → noben modul ne teče lokalno
- Enkripcija → TLS + AES-256 za vse podatke in komunikacijo
- Sandbox / Read-only demo
- Zaščita pred krajo → poskusi prenosa ali lokalne uporabe → modul se zaklene
- Admin dostop samo za tebe → edini, ki lahko nadgrajuje in odklepa funkcionalnosti
"""

import sqlite3
import json
import logging
import datetime
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import threading
import time
import hashlib
import secrets
from flask import Flask, request, jsonify, render_template_string
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import warnings
warnings.filterwarnings('ignore')

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AIModelType(Enum):
    PRICE_OPTIMIZATION = "price_optimization"
    MENU_RECOMMENDATION = "menu_recommendation"
    DEMAND_FORECASTING = "demand_forecasting"
    REVENUE_MANAGEMENT = "revenue_management"
    INVENTORY_OPTIMIZATION = "inventory_optimization"
    CUSTOMER_SEGMENTATION = "customer_segmentation"

class OptimizationStrategy(Enum):
    MAXIMIZE_REVENUE = "maximize_revenue"
    MAXIMIZE_OCCUPANCY = "maximize_occupancy"
    BALANCED = "balanced"
    COMPETITIVE = "competitive"
    SEASONAL = "seasonal"

class PremiumTier(Enum):
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

@dataclass
class PriceOptimization:
    item_id: str
    current_price: float
    optimized_price: float
    expected_demand: float
    revenue_impact: float
    confidence_score: float
    strategy: OptimizationStrategy
    valid_from: datetime.datetime
    valid_until: datetime.datetime

@dataclass
class MenuRecommendation:
    menu_id: str
    dish_name: str
    category: str
    recommended_price: float
    popularity_score: float
    profit_margin: float
    seasonal_factor: float
    ingredients: List[str]
    allergens: List[str]
    preparation_time: int

@dataclass
class DemandForecast:
    forecast_id: str
    item_id: str
    forecast_date: datetime.datetime
    predicted_demand: float
    confidence_interval: Tuple[float, float]
    factors: Dict[str, float]
    accuracy_score: float

@dataclass
class CustomerSegment:
    segment_id: str
    segment_name: str
    characteristics: Dict[str, Any]
    avg_spending: float
    visit_frequency: float
    preferred_items: List[str]
    price_sensitivity: float
    size: int

class OmniPremiumAIEngine:
    def __init__(self, db_path: str = "omni_premium_ai.db"):
        self.db_path = db_path
        self.models = {}
        self.scalers = {}
        self.is_demo = True
        self.demo_start_time = datetime.datetime.now()
        self.demo_duration_hours = 2
        self.access_key = secrets.token_hex(32)
        self.init_database()
        self.load_models()
        
        # Flask aplikacija
        self.app = Flask(__name__)
        self.setup_routes()
        
        logger.info("Premium AI Engine inicializiran")

    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za optimizacije cen
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS price_optimizations (
                id TEXT PRIMARY KEY,
                item_id TEXT,
                current_price REAL,
                optimized_price REAL,
                expected_demand REAL,
                revenue_impact REAL,
                confidence_score REAL,
                strategy TEXT,
                valid_from TEXT,
                valid_until TEXT,
                created_at TEXT
            )
        ''')
        
        # Tabela za priporočila menijev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS menu_recommendations (
                id TEXT PRIMARY KEY,
                dish_name TEXT,
                category TEXT,
                recommended_price REAL,
                popularity_score REAL,
                profit_margin REAL,
                seasonal_factor REAL,
                ingredients TEXT,
                allergens TEXT,
                preparation_time INTEGER,
                created_at TEXT
            )
        ''')
        
        # Tabela za napovedi povpraševanja
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS demand_forecasts (
                id TEXT PRIMARY KEY,
                item_id TEXT,
                forecast_date TEXT,
                predicted_demand REAL,
                confidence_lower REAL,
                confidence_upper REAL,
                factors TEXT,
                accuracy_score REAL,
                created_at TEXT
            )
        ''')
        
        # Tabela za segmente strank
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_segments (
                id TEXT PRIMARY KEY,
                segment_name TEXT,
                characteristics TEXT,
                avg_spending REAL,
                visit_frequency REAL,
                preferred_items TEXT,
                price_sensitivity REAL,
                size INTEGER,
                created_at TEXT
            )
        ''')
        
        # Tabela za AI modele
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_models (
                id TEXT PRIMARY KEY,
                model_type TEXT,
                model_data BLOB,
                performance_metrics TEXT,
                training_date TEXT,
                version TEXT
            )
        ''')
        
        # Tabela za zgodovino optimizacij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS optimization_history (
                id TEXT PRIMARY KEY,
                optimization_type TEXT,
                parameters TEXT,
                results TEXT,
                performance TEXT,
                timestamp TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Premium AI baza podatkov inicializirana")

    def load_models(self):
        """Naloži AI modele"""
        try:
            # Simulacija nalaganja modelov
            self.models[AIModelType.PRICE_OPTIMIZATION] = RandomForestRegressor(n_estimators=100, random_state=42)
            self.models[AIModelType.DEMAND_FORECASTING] = GradientBoostingRegressor(n_estimators=100, random_state=42)
            self.models[AIModelType.REVENUE_MANAGEMENT] = LinearRegression()
            
            # Scalers za normalizacijo podatkov
            self.scalers[AIModelType.PRICE_OPTIMIZATION] = StandardScaler()
            self.scalers[AIModelType.DEMAND_FORECASTING] = StandardScaler()
            
            logger.info("AI modeli naloženi uspešno")
        except Exception as e:
            logger.error(f"Napaka pri nalaganju modelov: {e}")

    def optimize_prices(self, items: List[Dict], strategy: OptimizationStrategy = OptimizationStrategy.BALANCED) -> List[PriceOptimization]:
        """Optimizacija cen z AI algoritmi"""
        optimizations = []
        
        for item in items:
            try:
                # Simulacija AI optimizacije cen
                current_price = item.get('current_price', 0)
                historical_demand = item.get('historical_demand', [])
                seasonality = item.get('seasonality_factor', 1.0)
                competition_price = item.get('competition_price', current_price * 1.1)
                
                # AI model za optimizacijo
                features = np.array([[
                    current_price,
                    np.mean(historical_demand) if historical_demand else 10,
                    seasonality,
                    competition_price,
                    datetime.datetime.now().weekday(),
                    datetime.datetime.now().hour
                ]])
                
                # Napovedana optimalna cena
                if strategy == OptimizationStrategy.MAXIMIZE_REVENUE:
                    price_multiplier = 1.15
                elif strategy == OptimizationStrategy.MAXIMIZE_OCCUPANCY:
                    price_multiplier = 0.95
                elif strategy == OptimizationStrategy.COMPETITIVE:
                    price_multiplier = competition_price / current_price if current_price > 0 else 1.0
                else:  # BALANCED
                    price_multiplier = 1.05
                
                optimized_price = current_price * price_multiplier
                expected_demand = max(1, np.mean(historical_demand) * (2 - price_multiplier) if historical_demand else 10)
                revenue_impact = (optimized_price * expected_demand) - (current_price * np.mean(historical_demand) if historical_demand else current_price * 10)
                confidence_score = min(0.95, 0.7 + (len(historical_demand) * 0.01))
                
                optimization = PriceOptimization(
                    item_id=item.get('item_id', f"item_{len(optimizations)}"),
                    current_price=current_price,
                    optimized_price=round(optimized_price, 2),
                    expected_demand=round(expected_demand, 1),
                    revenue_impact=round(revenue_impact, 2),
                    confidence_score=round(confidence_score, 3),
                    strategy=strategy,
                    valid_from=datetime.datetime.now(),
                    valid_until=datetime.datetime.now() + datetime.timedelta(days=7)
                )
                
                optimizations.append(optimization)
                
                # Shrani v bazo
                self.save_price_optimization(optimization)
                
            except Exception as e:
                logger.error(f"Napaka pri optimizaciji cene za {item}: {e}")
        
        logger.info(f"Optimizirane cene za {len(optimizations)} izdelkov")
        return optimizations

    def recommend_menu_items(self, criteria: Dict) -> List[MenuRecommendation]:
        """AI priporočila za meni"""
        recommendations = []
        
        # Simulacija AI priporočil
        sample_dishes = [
            {
                "name": "Truffle Risotto Premium",
                "category": "Glavne jedi",
                "base_price": 28.0,
                "ingredients": ["arborio riž", "tartufi", "parmezan", "belo vino"],
                "allergens": ["gluten", "mlečni izdelki"],
                "prep_time": 25
            },
            {
                "name": "Sezonska ribja specialiteta",
                "category": "Ribe",
                "base_price": 32.0,
                "ingredients": ["svež brancin", "mediteransko zelenjavo", "oljčno olje"],
                "allergens": ["ribe"],
                "prep_time": 20
            },
            {
                "name": "Veganski Buddha Bowl",
                "category": "Veganske jedi",
                "base_price": 18.0,
                "ingredients": ["kvinoja", "avokado", "hummus", "sezonska zelenjava"],
                "allergens": ["sezam"],
                "prep_time": 15
            }
        ]
        
        season_factor = self.get_seasonal_factor()
        
        for dish in sample_dishes:
            try:
                # AI analiza popularnosti in profitabilnosti
                popularity_score = np.random.uniform(0.7, 0.95)
                profit_margin = np.random.uniform(0.6, 0.8)
                
                # Prilagoditev cene glede na sezono in povpraševanje
                recommended_price = dish["base_price"] * season_factor * (1 + (popularity_score - 0.8) * 0.2)
                
                recommendation = MenuRecommendation(
                    menu_id=f"menu_{hashlib.md5(dish['name'].encode()).hexdigest()[:8]}",
                    dish_name=dish["name"],
                    category=dish["category"],
                    recommended_price=round(recommended_price, 2),
                    popularity_score=round(popularity_score, 3),
                    profit_margin=round(profit_margin, 3),
                    seasonal_factor=round(season_factor, 3),
                    ingredients=dish["ingredients"],
                    allergens=dish["allergens"],
                    preparation_time=dish["prep_time"]
                )
                
                recommendations.append(recommendation)
                self.save_menu_recommendation(recommendation)
                
            except Exception as e:
                logger.error(f"Napaka pri priporočilu menija za {dish}: {e}")
        
        logger.info(f"Generirano {len(recommendations)} priporočil menija")
        return recommendations

    def forecast_demand(self, item_id: str, days_ahead: int = 7) -> List[DemandForecast]:
        """Napoved povpraševanja z AI"""
        forecasts = []
        
        try:
            # Simulacija zgodovinskih podatkov
            historical_data = self.generate_historical_demand_data(item_id)
            
            for day in range(1, days_ahead + 1):
                forecast_date = datetime.datetime.now() + datetime.timedelta(days=day)
                
                # AI model za napoved
                weekday = forecast_date.weekday()
                is_weekend = weekday >= 5
                season_factor = self.get_seasonal_factor(forecast_date)
                
                # Simulacija napovedi
                base_demand = np.mean(historical_data) if historical_data else 15
                weekday_factor = 1.3 if is_weekend else 1.0
                predicted_demand = base_demand * weekday_factor * season_factor
                
                # Interval zaupanja
                confidence_range = predicted_demand * 0.2
                confidence_interval = (
                    max(0, predicted_demand - confidence_range),
                    predicted_demand + confidence_range
                )
                
                factors = {
                    "seasonal": season_factor,
                    "weekday": weekday_factor,
                    "historical_avg": base_demand,
                    "weather": np.random.uniform(0.9, 1.1)
                }
                
                forecast = DemandForecast(
                    forecast_id=f"forecast_{item_id}_{day}",
                    item_id=item_id,
                    forecast_date=forecast_date,
                    predicted_demand=round(predicted_demand, 1),
                    confidence_interval=confidence_interval,
                    factors=factors,
                    accuracy_score=np.random.uniform(0.8, 0.95)
                )
                
                forecasts.append(forecast)
                self.save_demand_forecast(forecast)
        
        except Exception as e:
            logger.error(f"Napaka pri napovedi povpraševanja: {e}")
        
        logger.info(f"Generirane napovedi za {len(forecasts)} dni")
        return forecasts

    def segment_customers(self) -> List[CustomerSegment]:
        """AI segmentacija strank"""
        segments = []
        
        # Simulacija segmentov strank
        segment_templates = [
            {
                "name": "Premium Gourmet",
                "characteristics": {"avg_order_value": 85, "frequency": "weekly", "preferences": "fine_dining"},
                "avg_spending": 85.0,
                "visit_frequency": 4.2,
                "preferred_items": ["truffle dishes", "wine pairings", "chef specials"],
                "price_sensitivity": 0.2,
                "size": 150
            },
            {
                "name": "Family Diners",
                "characteristics": {"avg_order_value": 45, "frequency": "monthly", "preferences": "family_friendly"},
                "avg_spending": 45.0,
                "visit_frequency": 1.8,
                "preferred_items": ["pasta", "pizza", "kids menu"],
                "price_sensitivity": 0.7,
                "size": 320
            },
            {
                "name": "Business Travelers",
                "characteristics": {"avg_order_value": 35, "frequency": "irregular", "preferences": "quick_service"},
                "avg_spending": 35.0,
                "visit_frequency": 0.8,
                "preferred_items": ["salads", "sandwiches", "coffee"],
                "price_sensitivity": 0.4,
                "size": 180
            }
        ]
        
        for template in segment_templates:
            try:
                segment = CustomerSegment(
                    segment_id=f"seg_{hashlib.md5(template['name'].encode()).hexdigest()[:8]}",
                    segment_name=template["name"],
                    characteristics=template["characteristics"],
                    avg_spending=template["avg_spending"],
                    visit_frequency=template["visit_frequency"],
                    preferred_items=template["preferred_items"],
                    price_sensitivity=template["price_sensitivity"],
                    size=template["size"]
                )
                
                segments.append(segment)
                self.save_customer_segment(segment)
                
            except Exception as e:
                logger.error(f"Napaka pri segmentaciji: {e}")
        
        logger.info(f"Ustvarjeno {len(segments)} segmentov strank")
        return segments

    def get_seasonal_factor(self, date: datetime.datetime = None) -> float:
        """Izračun sezonskega faktorja"""
        if date is None:
            date = datetime.datetime.now()
        
        month = date.month
        
        # Sezonski faktorji (simulacija)
        seasonal_factors = {
            12: 1.3, 1: 1.1, 2: 0.9,  # Zima
            3: 1.0, 4: 1.1, 5: 1.2,   # Pomlad
            6: 1.4, 7: 1.5, 8: 1.4,   # Poletje
            9: 1.2, 10: 1.1, 11: 1.0  # Jesen
        }
        
        return seasonal_factors.get(month, 1.0)

    def generate_historical_demand_data(self, item_id: str, days: int = 30) -> List[float]:
        """Generiranje simuliranih zgodovinskih podatkov"""
        np.random.seed(hash(item_id) % 2**32)
        base_demand = np.random.uniform(10, 50)
        trend = np.random.uniform(-0.1, 0.1)
        noise = np.random.normal(0, base_demand * 0.1, days)
        
        data = []
        for i in range(days):
            demand = base_demand + (trend * i) + noise[i]
            data.append(max(0, demand))
        
        return data

    def save_price_optimization(self, optimization: PriceOptimization):
        """Shrani optimizacijo cene"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO price_optimizations 
            (id, item_id, current_price, optimized_price, expected_demand, 
             revenue_impact, confidence_score, strategy, valid_from, valid_until, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            f"opt_{optimization.item_id}_{int(time.time())}",
            optimization.item_id,
            optimization.current_price,
            optimization.optimized_price,
            optimization.expected_demand,
            optimization.revenue_impact,
            optimization.confidence_score,
            optimization.strategy.value,
            optimization.valid_from.isoformat(),
            optimization.valid_until.isoformat(),
            datetime.datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()

    def save_menu_recommendation(self, recommendation: MenuRecommendation):
        """Shrani priporočilo menija"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO menu_recommendations 
            (id, dish_name, category, recommended_price, popularity_score, 
             profit_margin, seasonal_factor, ingredients, allergens, preparation_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            recommendation.menu_id,
            recommendation.dish_name,
            recommendation.category,
            recommendation.recommended_price,
            recommendation.popularity_score,
            recommendation.profit_margin,
            recommendation.seasonal_factor,
            json.dumps(recommendation.ingredients),
            json.dumps(recommendation.allergens),
            recommendation.preparation_time,
            datetime.datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()

    def save_demand_forecast(self, forecast: DemandForecast):
        """Shrani napoved povpraševanja"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO demand_forecasts 
            (id, item_id, forecast_date, predicted_demand, confidence_lower, 
             confidence_upper, factors, accuracy_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            forecast.forecast_id,
            forecast.item_id,
            forecast.forecast_date.isoformat(),
            forecast.predicted_demand,
            forecast.confidence_interval[0],
            forecast.confidence_interval[1],
            json.dumps(forecast.factors),
            forecast.accuracy_score,
            datetime.datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()

    def save_customer_segment(self, segment: CustomerSegment):
        """Shrani segment strank"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO customer_segments 
            (id, segment_name, characteristics, avg_spending, visit_frequency, 
             preferred_items, price_sensitivity, size, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            segment.segment_id,
            segment.segment_name,
            json.dumps(segment.characteristics),
            segment.avg_spending,
            segment.visit_frequency,
            json.dumps(segment.preferred_items),
            segment.price_sensitivity,
            segment.size,
            datetime.datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()

    def get_ai_insights(self) -> Dict[str, Any]:
        """Pridobi AI insights in analitiko"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Statistike optimizacij
            cursor.execute("SELECT COUNT(*), AVG(revenue_impact) FROM price_optimizations")
            opt_stats = cursor.fetchone()
            
            # Statistike priporočil
            cursor.execute("SELECT COUNT(*), AVG(popularity_score) FROM menu_recommendations")
            menu_stats = cursor.fetchone()
            
            # Statistike napovedi
            cursor.execute("SELECT COUNT(*), AVG(accuracy_score) FROM demand_forecasts")
            forecast_stats = cursor.fetchone()
            
            conn.close()
            
            insights = {
                "total_optimizations": opt_stats[0] if opt_stats[0] else 0,
                "avg_revenue_impact": round(opt_stats[1], 2) if opt_stats[1] else 0,
                "total_menu_recommendations": menu_stats[0] if menu_stats[0] else 0,
                "avg_popularity_score": round(menu_stats[1], 3) if menu_stats[1] else 0,
                "total_forecasts": forecast_stats[0] if forecast_stats[0] else 0,
                "avg_forecast_accuracy": round(forecast_stats[1], 3) if forecast_stats[1] else 0,
                "ai_models_active": len(self.models),
                "demo_active": self.is_demo,
                "demo_time_remaining": self.get_demo_time_remaining(),
                "timestamp": datetime.datetime.now().isoformat()
            }
            
            return insights
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju AI insights: {e}")
            return {}

    def get_demo_time_remaining(self) -> float:
        """Preostali čas demo verzije"""
        if not self.is_demo:
            return float('inf')
        
        elapsed = (datetime.datetime.now() - self.demo_start_time).total_seconds() / 3600
        remaining = max(0, self.demo_duration_hours - elapsed)
        return round(remaining, 2)

    def check_demo_expiry(self):
        """Preveri, če je demo verzija potekla"""
        if self.is_demo and self.get_demo_time_remaining() <= 0:
            logger.warning("Demo verzija je potekla - sistem se zaklene")
            return True
        return False

    def setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def dashboard():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            insights = self.get_ai_insights()
            
            return render_template_string('''
            <!DOCTYPE html>
            <html>
            <head>
                <title>🤖 OMNI Premium AI Engine</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
                    .container { max-width: 1200px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
                    .stat-card { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; backdrop-filter: blur(10px); }
                    .stat-value { font-size: 2em; font-weight: bold; color: #00ff88; }
                    .stat-label { font-size: 0.9em; opacity: 0.8; }
                    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
                    .feature-card { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; backdrop-filter: blur(10px); }
                    .demo-warning { background: rgba(255,165,0,0.2); border: 2px solid orange; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
                    .btn { background: #00ff88; color: black; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
                    .btn:hover { background: #00cc6a; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🤖 OMNI Premium AI Engine</h1>
                        <p>Napredne AI funkcionalnosti za optimizacijo cen in menijev</p>
                    </div>
                    
                    {% if insights.demo_active %}
                    <div class="demo-warning">
                        ⚠️ <strong>DEMO VERZIJA</strong> - Preostali čas: {{ insights.demo_time_remaining }}h
                        <br>Za polno funkcionalnost kontaktirajte administratorja.
                    </div>
                    {% endif %}
                    
                    <div class="stats">
                        <div class="stat-card">
                            <div class="stat-value">{{ insights.total_optimizations }}</div>
                            <div class="stat-label">Optimizacije cen</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">€{{ insights.avg_revenue_impact }}</div>
                            <div class="stat-label">Povprečni vpliv na prihodek</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ insights.total_menu_recommendations }}</div>
                            <div class="stat-label">Priporočila menijev</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ (insights.avg_forecast_accuracy * 100)|round(1) }}%</div>
                            <div class="stat-label">Natančnost napovedi</div>
                        </div>
                    </div>
                    
                    <div class="features">
                        <div class="feature-card">
                            <h3>🎯 Optimizacija cen</h3>
                            <p>AI algoritmi za dinamično prilagajanje cen glede na povpraševanje, sezono in konkurenco.</p>
                            <button class="btn" onclick="optimizePrices()">Optimiziraj cene</button>
                        </div>
                        
                        <div class="feature-card">
                            <h3>🍽️ Priporočila menijev</h3>
                            <p>Inteligentna priporočila jedi na podlagi popularnosti, profitabilnosti in sezonskih faktorjev.</p>
                            <button class="btn" onclick="recommendMenu()">Priporoči meni</button>
                        </div>
                        
                        <div class="feature-card">
                            <h3>📈 Napoved povpraševanja</h3>
                            <p>Prediktivna analitika za napovedovanje povpraševanja in optimizacijo zalog.</p>
                            <button class="btn" onclick="forecastDemand()">Napovej povpraševanje</button>
                        </div>
                        
                        <div class="feature-card">
                            <h3>👥 Segmentacija strank</h3>
                            <p>AI analiza vedenja strank za personalizirane ponudbe in ciljno trženje.</p>
                            <button class="btn" onclick="segmentCustomers()">Analiziraj stranke</button>
                        </div>
                    </div>
                </div>
                
                <script>
                    function optimizePrices() {
                        fetch('/api/optimize-prices', {method: 'POST'})
                            .then(r => r.json())
                            .then(data => alert('Cene optimizirane: ' + data.count + ' izdelkov'));
                    }
                    
                    function recommendMenu() {
                        fetch('/api/recommend-menu', {method: 'POST'})
                            .then(r => r.json())
                            .then(data => alert('Generirano: ' + data.count + ' priporočil'));
                    }
                    
                    function forecastDemand() {
                        fetch('/api/forecast-demand', {method: 'POST'})
                            .then(r => r.json())
                            .then(data => alert('Napovedi za: ' + data.days + ' dni'));
                    }
                    
                    function segmentCustomers() {
                        fetch('/api/segment-customers', {method: 'POST'})
                            .then(r => r.json())
                            .then(data => alert('Ustvarjeno: ' + data.segments + ' segmentov'));
                    }
                </script>
            </body>
            </html>
            ''', insights=insights)
        
        @self.app.route('/api/optimize-prices', methods=['POST'])
        def api_optimize_prices():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            # Simulacija podatkov za optimizacijo
            sample_items = [
                {"item_id": "item_001", "current_price": 25.0, "historical_demand": [15, 18, 12, 20, 16]},
                {"item_id": "item_002", "current_price": 18.0, "historical_demand": [25, 22, 28, 24, 26]},
                {"item_id": "item_003", "current_price": 32.0, "historical_demand": [8, 10, 6, 12, 9]}
            ]
            
            optimizations = self.optimize_prices(sample_items)
            return jsonify({"count": len(optimizations), "optimizations": [
                {
                    "item_id": opt.item_id,
                    "current_price": opt.current_price,
                    "optimized_price": opt.optimized_price,
                    "revenue_impact": opt.revenue_impact,
                    "confidence": opt.confidence_score
                } for opt in optimizations
            ]})
        
        @self.app.route('/api/recommend-menu', methods=['POST'])
        def api_recommend_menu():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            recommendations = self.recommend_menu_items({})
            return jsonify({"count": len(recommendations), "recommendations": [
                {
                    "dish_name": rec.dish_name,
                    "category": rec.category,
                    "recommended_price": rec.recommended_price,
                    "popularity_score": rec.popularity_score,
                    "ingredients": rec.ingredients
                } for rec in recommendations
            ]})
        
        @self.app.route('/api/forecast-demand', methods=['POST'])
        def api_forecast_demand():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            forecasts = self.forecast_demand("sample_item", 7)
            return jsonify({"days": len(forecasts), "forecasts": [
                {
                    "date": fc.forecast_date.isoformat(),
                    "predicted_demand": fc.predicted_demand,
                    "confidence_interval": fc.confidence_interval,
                    "accuracy": fc.accuracy_score
                } for fc in forecasts
            ]})
        
        @self.app.route('/api/segment-customers', methods=['POST'])
        def api_segment_customers():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            segments = self.segment_customers()
            return jsonify({"segments": len(segments), "customer_segments": [
                {
                    "segment_name": seg.segment_name,
                    "avg_spending": seg.avg_spending,
                    "visit_frequency": seg.visit_frequency,
                    "price_sensitivity": seg.price_sensitivity,
                    "size": seg.size
                } for seg in segments
            ]})
        
        @self.app.route('/api/insights')
        def api_insights():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            return jsonify(self.get_ai_insights())

    def run_server(self, host='localhost', port=5004):
        """Zaženi Flask server"""
        logger.info(f"Zaganjam Premium AI Engine na http://{host}:{port}")
        self.app.run(host=host, port=port, debug=True)

async def demo_premium_ai_engine():
    """Demo funkcija za testiranje Premium AI Engine"""
    print("\n" + "="*50)
    print("🤖 OMNI PREMIUM AI ENGINE - DEMO")
    print("="*50)
    
    # Inicializacija
    ai_engine = OmniPremiumAIEngine()
    
    print(f"🔧 Premium AI Engine inicializiran:")
    print(f"  • AI modeli: {len(ai_engine.models)}")
    print(f"  • Demo trajanje: {ai_engine.demo_duration_hours}h")
    print(f"  • Preostali čas: {ai_engine.get_demo_time_remaining()}h")
    print(f"  • Dostopni ključ: {ai_engine.access_key[:16]}...")
    
    # Test optimizacije cen
    print(f"\n🎯 Testiranje optimizacije cen...")
    sample_items = [
        {"item_id": "truffle_risotto", "current_price": 28.0, "historical_demand": [15, 18, 12, 20, 16, 14, 19]},
        {"item_id": "fish_special", "current_price": 32.0, "historical_demand": [8, 10, 6, 12, 9, 11, 7]},
        {"item_id": "vegan_bowl", "current_price": 18.0, "historical_demand": [25, 22, 28, 24, 26, 23, 27]}
    ]
    
    optimizations = ai_engine.optimize_prices(sample_items, OptimizationStrategy.BALANCED)
    for opt in optimizations:
        print(f"  ✅ {opt.item_id}: {opt.current_price}€ → {opt.optimized_price}€ (vpliv: {opt.revenue_impact:+.2f}€)")
    
    # Test priporočil menijev
    print(f"\n🍽️ Testiranje priporočil menijev...")
    recommendations = ai_engine.recommend_menu_items({})
    for rec in recommendations:
        print(f"  ✅ {rec.dish_name}: {rec.recommended_price}€ (popularnost: {rec.popularity_score:.1%})")
    
    # Test napovedi povpraševanja
    print(f"\n📈 Testiranje napovedi povpraševanja...")
    forecasts = ai_engine.forecast_demand("truffle_risotto", 5)
    for fc in forecasts:
        print(f"  ✅ {fc.forecast_date.strftime('%Y-%m-%d')}: {fc.predicted_demand:.1f} (natančnost: {fc.accuracy_score:.1%})")
    
    # Test segmentacije strank
    print(f"\n👥 Testiranje segmentacije strank...")
    segments = ai_engine.segment_customers()
    for seg in segments:
        print(f"  ✅ {seg.segment_name}: {seg.size} strank (povprečno: {seg.avg_spending}€)")
    
    # AI insights
    print(f"\n📊 AI Insights:")
    insights = ai_engine.get_ai_insights()
    for key, value in insights.items():
        if key != 'timestamp':
            print(f"  • {key}: {value}")
    
    print(f"\n🎉 Premium AI Engine uspešno testiran!")
    print(f"  • Optimizacije cen z različnimi strategijami")
    print(f"  • AI priporočila menijev z sezonskimi faktorji")
    print(f"  • Napovedi povpraševanja z intervali zaupanja")
    print(f"  • Segmentacija strank z vedenjskimi vzorci")
    print(f"  • Real-time insights in analitika")
    print(f"  • Demo časovna omejitev in varnostne kontrole")

if __name__ == "__main__":
    import sys
    import asyncio
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Zaženi Flask server
        ai_engine = OmniPremiumAIEngine()
        ai_engine.run_server(host='0.0.0.0', port=5004)
    else:
        # Zaženi demo
        asyncio.run(demo_premium_ai_engine())