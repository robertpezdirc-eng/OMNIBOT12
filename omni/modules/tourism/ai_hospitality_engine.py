"""
🤖 AI HOSPITALITY ENGINE
Napredni AI sistem za gostinstvo in turizem

Funkcionalnosti:
- Menu optimizacija glede na sezono in zaloge
- Dinamično cenovni algoritmi
- Analiza zadovoljstva gostov
- Napovedi obiskanosti
- Personalizirani predlogi
- Marketinške kampanje
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import json
import sqlite3
from dataclasses import dataclass
import logging
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

@dataclass
class MenuSuggestion:
    """AI predlog za menu"""
    dish_name: str
    category: str
    ingredients: List[str]
    estimated_cost: float
    profit_margin: float
    seasonal_score: float
    popularity_prediction: float
    reason: str

@dataclass
class PricingRecommendation:
    """Cenovna priporočila"""
    item_name: str
    current_price: float
    recommended_price: float
    price_change_percent: float
    demand_forecast: float
    competitor_analysis: Dict
    reason: str

@dataclass
class CustomerInsight:
    """Vpogled v stranke"""
    customer_segment: str
    preferences: List[str]
    spending_pattern: Dict
    visit_frequency: str
    satisfaction_score: float
    recommendations: List[str]

class AIHospitalityEngine:
    """AI engine za gostinstvo"""
    
    def __init__(self, db_path: str = "tourism_premium.db"):
        self.db_path = db_path
        self.seasonal_factors = self._load_seasonal_factors()
        self.local_ingredients = self._load_local_ingredients()
        self.competitor_data = {}
        self.customer_segments = {}
        
        logger.info("🤖 AI Hospitality Engine inicializiran")
    
    def _load_seasonal_factors(self) -> Dict:
        """Naloži sezonske faktorje"""
        return {
            "spring": {
                "vegetables": ["asparagus", "artichoke", "peas", "radish", "spinach"],
                "fruits": ["strawberry", "rhubarb", "apricot"],
                "trends": ["light_dishes", "fresh_salads", "detox_menu"],
                "multiplier": 1.1
            },
            "summer": {
                "vegetables": ["tomato", "cucumber", "zucchini", "pepper", "eggplant"],
                "fruits": ["peach", "cherry", "berry", "melon"],
                "trends": ["grilled_food", "cold_soups", "ice_cream", "cocktails"],
                "multiplier": 1.3
            },
            "autumn": {
                "vegetables": ["pumpkin", "mushroom", "cabbage", "potato", "onion"],
                "fruits": ["apple", "pear", "grape", "plum"],
                "trends": ["comfort_food", "warm_soups", "wine_pairing"],
                "multiplier": 1.0
            },
            "winter": {
                "vegetables": ["carrot", "parsnip", "leek", "brussels_sprouts"],
                "fruits": ["orange", "lemon", "pomegranate"],
                "trends": ["hearty_meals", "hot_drinks", "festive_menu"],
                "multiplier": 0.9
            }
        }
    
    def _load_local_ingredients(self) -> Dict:
        """Naloži lokalne sestavine"""
        return {
            "slovenia": {
                "vegetables": ["kranjska_klobasa", "ajdova_kaša", "repa", "zelje"],
                "specialties": ["potica", "štruklji", "jota", "žganci"],
                "wines": ["cviček", "teran", "rebula", "sauvignon"],
                "seasonal_bonus": 1.2
            }
        }
    
    # ==================== MENU OPTIMIZACIJA ====================
    
    def generate_seasonal_menu(self, current_season: str, available_ingredients: List[str],
                             target_profit_margin: float = 0.65) -> List[MenuSuggestion]:
        """Generiraj sezonski menu"""
        suggestions = []
        seasonal_data = self.seasonal_factors.get(current_season, {})
        
        # Analiziraj razpoložljive sestavine
        seasonal_ingredients = seasonal_data.get("vegetables", []) + seasonal_data.get("fruits", [])
        available_seasonal = [ing for ing in available_ingredients if ing.lower() in seasonal_ingredients]
        
        # Generiraj predloge jedi
        for trend in seasonal_data.get("trends", []):
            suggestion = self._create_dish_suggestion(
                trend, available_seasonal, target_profit_margin, current_season
            )
            if suggestion:
                suggestions.append(suggestion)
        
        # Sortiraj po popularnosti
        suggestions.sort(key=lambda x: x.popularity_prediction, reverse=True)
        
        logger.info(f"🍽️ Generirano {len(suggestions)} sezonskih predlogov")
        return suggestions[:10]  # Vrni top 10
    
    def _create_dish_suggestion(self, trend: str, ingredients: List[str], 
                              profit_margin: float, season: str) -> Optional[MenuSuggestion]:
        """Ustvari predlog jedi"""
        if not ingredients:
            return None
        
        # Simulacija AI algoritma za kreiranje jedi
        dish_templates = {
            "light_dishes": ["Lahka {0} solata z {1}", "Parna {0} z {1}"],
            "grilled_food": ["Žar {0} s {1}", "BBQ {0} z {1} marinade"],
            "comfort_food": ["Tradicionalna {0} z {1}", "Domača {0} juha z {1}"],
            "fresh_salads": ["Svežа {0} solata", "Mešana solata z {0}"],
            "warm_soups": ["Kremna {0} juha", "Tradicionalna {0} juha"]
        }
        
        templates = dish_templates.get(trend, ["Specialiteta z {0}"])
        selected_ingredients = np.random.choice(ingredients, min(2, len(ingredients)), replace=False)
        
        dish_name = templates[0].format(*selected_ingredients)
        
        # Izračunaj stroške in ceno
        base_cost = len(selected_ingredients) * 3.5  # Povprečni strošek sestavine
        estimated_cost = base_cost * (1 + np.random.uniform(0.1, 0.3))
        
        # Sezonski bonus
        seasonal_multiplier = self.seasonal_factors[season].get("multiplier", 1.0)
        popularity_prediction = np.random.uniform(0.6, 0.95) * seasonal_multiplier
        
        return MenuSuggestion(
            dish_name=dish_name,
            category=trend.replace("_", " ").title(),
            ingredients=list(selected_ingredients),
            estimated_cost=round(estimated_cost, 2),
            profit_margin=profit_margin,
            seasonal_score=seasonal_multiplier,
            popularity_prediction=round(popularity_prediction, 2),
            reason=f"Sezonski trend '{trend}' z lokalnimi sestavinami"
        )
    
    # ==================== DINAMIČNO CENJENJE ====================
    
    def optimize_pricing(self, menu_items: List[Dict], 
                        demand_data: List[Dict], 
                        competitor_prices: Dict = None) -> List[PricingRecommendation]:
        """Optimiziraj cene glede na povpraševanje"""
        recommendations = []
        
        for item in menu_items:
            # Analiziraj povpraševanje
            demand_analysis = self._analyze_demand(item['name'], demand_data)
            
            # Konkurenčna analiza
            competitor_analysis = self._analyze_competitors(item['name'], competitor_prices or {})
            
            # Izračunaj optimalno ceno
            optimal_price = self._calculate_optimal_price(
                item, demand_analysis, competitor_analysis
            )
            
            recommendation = PricingRecommendation(
                item_name=item['name'],
                current_price=item['price'],
                recommended_price=optimal_price,
                price_change_percent=((optimal_price - item['price']) / item['price']) * 100,
                demand_forecast=demand_analysis['forecast'],
                competitor_analysis=competitor_analysis,
                reason=self._generate_pricing_reason(demand_analysis, competitor_analysis)
            )
            
            recommendations.append(recommendation)
        
        logger.info(f"💰 Generirano {len(recommendations)} cenovnih priporočil")
        return recommendations
    
    def _analyze_demand(self, item_name: str, demand_data: List[Dict]) -> Dict:
        """Analiziraj povpraševanje za izdelek"""
        # Filtriraj podatke za ta izdelek
        item_data = [d for d in demand_data if d.get('item_name') == item_name]
        
        if not item_data:
            return {"forecast": 0.5, "trend": "stable", "elasticity": 1.0}
        
        # Simulacija analize povpraševanja
        quantities = [d['quantity'] for d in item_data[-30:]]  # Zadnjih 30 dni
        
        if len(quantities) > 1:
            trend = "increasing" if quantities[-1] > quantities[0] else "decreasing"
            forecast = np.mean(quantities) * (1.1 if trend == "increasing" else 0.9)
        else:
            trend = "stable"
            forecast = quantities[0] if quantities else 0.5
        
        return {
            "forecast": forecast,
            "trend": trend,
            "elasticity": np.random.uniform(0.8, 1.5),  # Cenovna elastičnost
            "seasonality": np.random.uniform(0.9, 1.2)
        }
    
    def _analyze_competitors(self, item_name: str, competitor_prices: Dict) -> Dict:
        """Analiziraj konkurenčne cene"""
        if not competitor_prices:
            return {"average_price": 0, "position": "unknown", "advantage": 0}
        
        similar_items = [price for name, price in competitor_prices.items() 
                        if any(word in name.lower() for word in item_name.lower().split())]
        
        if similar_items:
            avg_price = np.mean(similar_items)
            return {
                "average_price": avg_price,
                "min_price": min(similar_items),
                "max_price": max(similar_items),
                "position": "competitive"
            }
        
        return {"average_price": 0, "position": "unique", "advantage": 0.1}
    
    def _calculate_optimal_price(self, item: Dict, demand_analysis: Dict, 
                               competitor_analysis: Dict) -> float:
        """Izračunaj optimalno ceno"""
        current_price = item['price']
        cost = item.get('cost', current_price * 0.4)  # Predpostavka 40% stroškov
        
        # Osnovna marža
        base_price = cost * 2.5  # 150% marža
        
        # Prilagoditve glede na povpraševanje
        demand_multiplier = 1.0
        if demand_analysis['trend'] == "increasing":
            demand_multiplier = 1.1
        elif demand_analysis['trend'] == "decreasing":
            demand_multiplier = 0.95
        
        # Konkurenčne prilagoditve
        competitor_multiplier = 1.0
        if competitor_analysis['position'] == "competitive":
            avg_competitor_price = competitor_analysis['average_price']
            if avg_competitor_price > 0:
                competitor_multiplier = min(1.05, avg_competitor_price / current_price)
        
        # Sezonske prilagoditve
        seasonal_multiplier = demand_analysis.get('seasonality', 1.0)
        
        optimal_price = base_price * demand_multiplier * competitor_multiplier * seasonal_multiplier
        
        # Omejitve (ne več kot ±20% sprememba)
        max_change = current_price * 0.2
        optimal_price = max(current_price - max_change, 
                          min(current_price + max_change, optimal_price))
        
        return round(optimal_price, 2)
    
    def _generate_pricing_reason(self, demand_analysis: Dict, competitor_analysis: Dict) -> str:
        """Generiraj razlog za cenovno priporočilo"""
        reasons = []
        
        if demand_analysis['trend'] == "increasing":
            reasons.append("naraščajoče povpraševanje")
        elif demand_analysis['trend'] == "decreasing":
            reasons.append("padajoče povpraševanje")
        
        if competitor_analysis['position'] == "competitive":
            reasons.append("konkurenčna analiza")
        
        if demand_analysis.get('seasonality', 1.0) > 1.05:
            reasons.append("sezonski dejavniki")
        
        return "Prilagoditev zaradi: " + ", ".join(reasons) if reasons else "Optimizacija profitabilnosti"
    
    # ==================== ANALIZA ZADOVOLJSTVA GOSTOV ====================
    
    def analyze_customer_satisfaction(self, reviews: List[Dict], 
                                    feedback_data: List[Dict]) -> Dict:
        """Analiziraj zadovoljstvo strank"""
        analysis = {
            "overall_score": 0.0,
            "category_scores": {},
            "sentiment_trends": [],
            "improvement_areas": [],
            "positive_highlights": [],
            "recommendations": []
        }
        
        if not reviews and not feedback_data:
            return analysis
        
        # Analiziraj ocene
        all_ratings = []
        category_ratings = {}
        
        for review in reviews:
            rating = review.get('rating', 0)
            all_ratings.append(rating)
            
            category = review.get('category', 'general')
            if category not in category_ratings:
                category_ratings[category] = []
            category_ratings[category].append(rating)
        
        # Izračunaj povprečja
        if all_ratings:
            analysis['overall_score'] = round(np.mean(all_ratings), 2)
        
        for category, ratings in category_ratings.items():
            analysis['category_scores'][category] = round(np.mean(ratings), 2)
        
        # Analiziraj besedilo (simulacija NLP)
        positive_keywords = ['odličen', 'super', 'priporočam', 'izvrstno', 'čudovito']
        negative_keywords = ['slabo', 'počasen', 'drag', 'nezadovoljen', 'problem']
        
        positive_mentions = 0
        negative_mentions = 0
        
        for review in reviews:
            text = review.get('text', '').lower()
            positive_mentions += sum(1 for keyword in positive_keywords if keyword in text)
            negative_mentions += sum(1 for keyword in negative_keywords if keyword in text)
        
        # Generiraj priporočila
        if analysis['overall_score'] < 3.5:
            analysis['recommendations'].append("Izboljšanje kakovosti storitev")
        
        if 'service' in analysis['category_scores'] and analysis['category_scores']['service'] < 3.5:
            analysis['recommendations'].append("Usposabljanje osebja")
        
        if 'food' in analysis['category_scores'] and analysis['category_scores']['food'] < 3.5:
            analysis['recommendations'].append("Pregled menuja in kakovosti hrane")
        
        logger.info(f"😊 Analiza zadovoljstva: {analysis['overall_score']}/5.0")
        return analysis
    
    # ==================== NAPOVEDI OBISKANOSTI ====================
    
    def predict_visitor_demand(self, historical_data: List[Dict], 
                             forecast_days: int = 30) -> Dict:
        """Napovej obiskanost"""
        if not historical_data:
            return {"error": "Ni zgodovinskih podatkov"}
        
        # Pripravi podatke
        df = pd.DataFrame(historical_data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # Dodaj značilke
        df['day_of_week'] = df['date'].dt.dayofweek
        df['month'] = df['date'].dt.month
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        
        # Pripravi model
        features = ['day_of_week', 'month', 'is_weekend']
        X = df[features]
        y = df['visitors']
        
        # Treniranje modela
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        # Napovedi
        future_dates = pd.date_range(
            start=df['date'].max() + timedelta(days=1),
            periods=forecast_days,
            freq='D'
        )
        
        future_df = pd.DataFrame({'date': future_dates})
        future_df['day_of_week'] = future_df['date'].dt.dayofweek
        future_df['month'] = future_df['date'].dt.month
        future_df['is_weekend'] = future_df['day_of_week'].isin([5, 6]).astype(int)
        
        predictions = model.predict(future_df[features])
        
        # Pripravi rezultate
        forecast = []
        for i, pred in enumerate(predictions):
            forecast.append({
                'date': future_dates[i].strftime('%Y-%m-%d'),
                'predicted_visitors': max(0, int(pred)),
                'confidence': 'high' if i < 7 else 'medium' if i < 14 else 'low'
            })
        
        # Statistike
        avg_prediction = np.mean(predictions)
        peak_day = future_dates[np.argmax(predictions)].strftime('%Y-%m-%d')
        low_day = future_dates[np.argmin(predictions)].strftime('%Y-%m-%d')
        
        result = {
            'forecast': forecast,
            'summary': {
                'average_daily_visitors': int(avg_prediction),
                'peak_day': peak_day,
                'lowest_day': low_day,
                'total_predicted_visitors': int(np.sum(predictions)),
                'weekend_boost': f"{((df[df['is_weekend']==1]['visitors'].mean() / df[df['is_weekend']==0]['visitors'].mean()) - 1) * 100:.1f}%"
            },
            'recommendations': self._generate_demand_recommendations(forecast)
        }
        
        logger.info(f"📈 Napoved obiskanosti za {forecast_days} dni")
        return result
    
    def _generate_demand_recommendations(self, forecast: List[Dict]) -> List[str]:
        """Generiraj priporočila glede na napoved povpraševanja"""
        recommendations = []
        
        # Analiziraj vzorce
        visitors = [f['predicted_visitors'] for f in forecast]
        avg_visitors = np.mean(visitors)
        
        peak_days = [f for f in forecast if f['predicted_visitors'] > avg_visitors * 1.2]
        low_days = [f for f in forecast if f['predicted_visitors'] < avg_visitors * 0.8]
        
        if peak_days:
            recommendations.append(f"Pripravite se na povečano obiskanost {len(peak_days)} dni")
            recommendations.append("Povečajte zaloge in osebje za vrhunske dni")
        
        if low_days:
            recommendations.append(f"Načrtujte posebne akcije za {len(low_days)} dni z nizko obiskanostjo")
            recommendations.append("Razmislite o promocijskih kampanjah")
        
        return recommendations
    
    # ==================== PERSONALIZIRANI PREDLOGI ====================
    
    def generate_personalized_recommendations(self, customer_data: Dict) -> CustomerInsight:
        """Generiraj personalizirane predloge"""
        # Analiziraj vzorce nakupovanja
        purchase_history = customer_data.get('purchases', [])
        preferences = self._extract_preferences(purchase_history)
        
        # Določi segment stranke
        segment = self._determine_customer_segment(customer_data)
        
        # Izračunaj vzorce porabe
        spending_pattern = self._analyze_spending_pattern(purchase_history)
        
        # Generiraj priporočila
        recommendations = self._generate_customer_recommendations(preferences, segment, spending_pattern)
        
        return CustomerInsight(
            customer_segment=segment,
            preferences=preferences,
            spending_pattern=spending_pattern,
            visit_frequency=customer_data.get('visit_frequency', 'unknown'),
            satisfaction_score=customer_data.get('satisfaction_score', 0.0),
            recommendations=recommendations
        )
    
    def _extract_preferences(self, purchases: List[Dict]) -> List[str]:
        """Izvleci preference iz zgodovine nakupov"""
        categories = {}
        for purchase in purchases:
            category = purchase.get('category', 'other')
            categories[category] = categories.get(category, 0) + 1
        
        # Vrni top 3 kategorije
        sorted_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)
        return [cat for cat, count in sorted_categories[:3]]
    
    def _determine_customer_segment(self, customer_data: Dict) -> str:
        """Določi segment stranke"""
        avg_spend = customer_data.get('average_spend', 0)
        visit_frequency = customer_data.get('visit_frequency', 'rare')
        
        if avg_spend > 50 and visit_frequency in ['weekly', 'daily']:
            return "VIP"
        elif avg_spend > 30 or visit_frequency == 'weekly':
            return "Regular"
        elif visit_frequency in ['monthly', 'occasional']:
            return "Casual"
        else:
            return "New"
    
    def _analyze_spending_pattern(self, purchases: List[Dict]) -> Dict:
        """Analiziraj vzorce porabe"""
        if not purchases:
            return {"average": 0, "trend": "unknown", "preferred_time": "unknown"}
        
        amounts = [p.get('amount', 0) for p in purchases]
        times = [p.get('time', '12:00') for p in purchases]
        
        # Analiza časa
        hour_counts = {}
        for time_str in times:
            try:
                hour = int(time_str.split(':')[0])
                period = "morning" if hour < 12 else "afternoon" if hour < 18 else "evening"
                hour_counts[period] = hour_counts.get(period, 0) + 1
            except:
                continue
        
        preferred_time = max(hour_counts.items(), key=lambda x: x[1])[0] if hour_counts else "unknown"
        
        return {
            "average": round(np.mean(amounts), 2),
            "trend": "increasing" if len(amounts) > 1 and amounts[-1] > amounts[0] else "stable",
            "preferred_time": preferred_time,
            "frequency": len(purchases)
        }
    
    def _generate_customer_recommendations(self, preferences: List[str], 
                                         segment: str, spending_pattern: Dict) -> List[str]:
        """Generiraj priporočila za stranko"""
        recommendations = []
        
        # Priporočila glede na segment
        if segment == "VIP":
            recommendations.append("Ekskluzivni degustacijski menu")
            recommendations.append("Prednostne rezervacije")
        elif segment == "Regular":
            recommendations.append("Loyalty program popusti")
            recommendations.append("Sezonski specialiteti")
        elif segment == "New":
            recommendations.append("Dobrodošli paket")
            recommendations.append("Predstavitev signature jedi")
        
        # Priporočila glede na preference
        for preference in preferences:
            if preference == "desserts":
                recommendations.append("Novi sezonski deserti")
            elif preference == "wine":
                recommendations.append("Wine pairing večerja")
            elif preference == "vegetarian":
                recommendations.append("Vegetarijanski teden")
        
        # Priporočila glede na čas obiska
        preferred_time = spending_pattern.get('preferred_time')
        if preferred_time == "morning":
            recommendations.append("Zajtrk speciali")
        elif preferred_time == "evening":
            recommendations.append("Večerni degustacijski menu")
        
        return recommendations[:5]  # Omejimo na 5 priporočil

# Primer uporabe
if __name__ == "__main__":
    ai_engine = AIHospitalityEngine()
    
    # Test sezonskih predlogov
    seasonal_menu = ai_engine.generate_seasonal_menu(
        current_season="summer",
        available_ingredients=["tomato", "cucumber", "basil", "mozzarella"],
        target_profit_margin=0.65
    )
    
    print("🍽️ Sezonski menu predlogi:")
    for suggestion in seasonal_menu:
        print(f"- {suggestion.dish_name} (Popularnost: {suggestion.popularity_prediction})")
    
    print("\n🤖 AI Hospitality Engine pripravljen!")