"""
🧠 AI Analytics Engine - Napredni analitični sistem
AI-powered analitika, napovedi, optimizacije in poslovni vpogledi
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
import pickle
import joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class AnalysisType(Enum):
    REVENUE_FORECAST = "revenue_forecast"
    OCCUPANCY_PREDICTION = "occupancy_prediction"
    CUSTOMER_SEGMENTATION = "customer_segmentation"
    PRICE_OPTIMIZATION = "price_optimization"
    DEMAND_FORECASTING = "demand_forecasting"
    SEASONAL_ANALYSIS = "seasonal_analysis"
    COMPETITOR_ANALYSIS = "competitor_analysis"
    SATISFACTION_ANALYSIS = "satisfaction_analysis"

class ModelType(Enum):
    LINEAR_REGRESSION = "linear_regression"
    RANDOM_FOREST = "random_forest"
    GRADIENT_BOOSTING = "gradient_boosting"
    KMEANS_CLUSTERING = "kmeans_clustering"
    TIME_SERIES = "time_series"

class PredictionHorizon(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

@dataclass
class AnalysisResult:
    """Rezultat analize"""
    analysis_id: str
    analysis_type: AnalysisType
    model_type: ModelType
    accuracy_score: float
    predictions: Dict[str, Any]
    insights: List[str]
    recommendations: List[str]
    visualizations: List[str]
    confidence_interval: Tuple[float, float]
    created_at: datetime = None

@dataclass
class BusinessMetric:
    """Poslovna metrika"""
    metric_id: str
    name: str
    value: float
    unit: str
    category: str
    date: date
    source: str
    metadata: Dict[str, Any] = None

@dataclass
class CustomerSegment:
    """Segment strank"""
    segment_id: str
    name: str
    characteristics: Dict[str, Any]
    size: int
    avg_value: float
    behavior_patterns: Dict[str, Any]
    recommendations: List[str]

@dataclass
class PriceRecommendation:
    """Priporočilo za ceno"""
    room_type: str
    date: date
    current_price: float
    recommended_price: float
    expected_occupancy: float
    revenue_impact: float
    confidence: float
    reasoning: str

class AIAnalyticsEngine:
    """Glavni AI analitični sistem"""
    
    def __init__(self, db_path: str = "ai_analytics.db"):
        self.db_path = db_path
        self._init_database()
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela metrik
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS business_metrics (
                    metric_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    value REAL NOT NULL,
                    unit TEXT,
                    category TEXT NOT NULL,
                    date TEXT NOT NULL,
                    source TEXT NOT NULL,
                    metadata TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela analiz
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS analysis_results (
                    analysis_id TEXT PRIMARY KEY,
                    analysis_type TEXT NOT NULL,
                    model_type TEXT NOT NULL,
                    accuracy_score REAL,
                    predictions TEXT,
                    insights TEXT,
                    recommendations TEXT,
                    visualizations TEXT,
                    confidence_interval TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela modelov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ml_models (
                    model_id TEXT PRIMARY KEY,
                    model_type TEXT NOT NULL,
                    analysis_type TEXT NOT NULL,
                    model_data BLOB,
                    scaler_data BLOB,
                    encoder_data BLOB,
                    features TEXT,
                    target TEXT,
                    accuracy_score REAL,
                    created_at TEXT NOT NULL,
                    last_trained TEXT NOT NULL
                )
            ''')
            
            # Tabela segmentov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS customer_segments (
                    segment_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    characteristics TEXT,
                    size INTEGER,
                    avg_value REAL,
                    behavior_patterns TEXT,
                    recommendations TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela cenovnih priporočil
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS price_recommendations (
                    recommendation_id TEXT PRIMARY KEY,
                    room_type TEXT NOT NULL,
                    date TEXT NOT NULL,
                    current_price REAL,
                    recommended_price REAL,
                    expected_occupancy REAL,
                    revenue_impact REAL,
                    confidence REAL,
                    reasoning TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela napovedi
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS predictions (
                    prediction_id TEXT PRIMARY KEY,
                    analysis_type TEXT NOT NULL,
                    target_date TEXT NOT NULL,
                    predicted_value REAL NOT NULL,
                    confidence_lower REAL,
                    confidence_upper REAL,
                    actual_value REAL,
                    model_version TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            conn.commit()
            logger.info("🧠 AI Analytics baza podatkov inicializirana")
    
    def add_business_metric(self, metric: BusinessMetric) -> Dict[str, Any]:
        """Dodaj poslovno metriko"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO business_metrics 
                    (metric_id, name, value, unit, category, date, source, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    metric.metric_id,
                    metric.name,
                    metric.value,
                    metric.unit,
                    metric.category,
                    metric.date.isoformat(),
                    metric.source,
                    json.dumps(metric.metadata) if metric.metadata else None,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "metric_id": metric.metric_id,
                    "message": f"Metrika '{metric.name}' uspešno dodana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju metrike: {e}")
            return {"success": False, "error": str(e)}
    
    def revenue_forecast(self, horizon: PredictionHorizon, 
                        periods: int = 30) -> Dict[str, Any]:
        """Napoved prihodkov"""
        try:
            # Pridobi zgodovinske podatke
            with sqlite3.connect(self.db_path) as conn:
                df = pd.read_sql_query('''
                    SELECT date, value, metadata
                    FROM business_metrics 
                    WHERE category = 'revenue' 
                    ORDER BY date
                ''', conn)
            
            if df.empty:
                return {"success": False, "error": "Ni podatkov o prihodkih"}
            
            # Pripravi podatke
            df['date'] = pd.to_datetime(df['date'])
            df = df.set_index('date')
            df['value'] = pd.to_numeric(df['value'])
            
            # Dodaj značilke
            df['day_of_week'] = df.index.dayofweek
            df['month'] = df.index.month
            df['quarter'] = df.index.quarter
            df['is_weekend'] = (df.index.dayofweek >= 5).astype(int)
            
            # Dodaj lag značilke
            for lag in [1, 7, 30]:
                df[f'revenue_lag_{lag}'] = df['value'].shift(lag)
            
            # Dodaj rolling statistike
            df['revenue_ma_7'] = df['value'].rolling(window=7).mean()
            df['revenue_ma_30'] = df['value'].rolling(window=30).mean()
            df['revenue_std_7'] = df['value'].rolling(window=7).std()
            
            # Odstrani NaN vrednosti
            df = df.dropna()
            
            if len(df) < 30:
                return {"success": False, "error": "Premalo podatkov za napoved"}
            
            # Pripravi značilke in target
            feature_cols = ['day_of_week', 'month', 'quarter', 'is_weekend',
                          'revenue_lag_1', 'revenue_lag_7', 'revenue_lag_30',
                          'revenue_ma_7', 'revenue_ma_30', 'revenue_std_7']
            
            X = df[feature_cols]
            y = df['value']
            
            # Razdeli podatke
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, shuffle=False
            )
            
            # Treniraj model
            model = GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                random_state=42
            )
            
            model.fit(X_train, y_train)
            
            # Evalviraj model
            y_pred = model.predict(X_test)
            mae = mean_absolute_error(y_test, y_pred)
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            r2 = r2_score(y_test, y_pred)
            
            # Generiraj napovedi
            last_date = df.index[-1]
            future_dates = pd.date_range(
                start=last_date + timedelta(days=1),
                periods=periods,
                freq='D'
            )
            
            predictions = []
            confidence_intervals = []
            
            # Pripravi podatke za napoved
            last_data = df.iloc[-1:].copy()
            
            for future_date in future_dates:
                # Ustvari značilke za prihodnji datum
                future_features = {
                    'day_of_week': future_date.dayofweek,
                    'month': future_date.month,
                    'quarter': future_date.quarter,
                    'is_weekend': int(future_date.dayofweek >= 5),
                    'revenue_lag_1': last_data['value'].iloc[-1],
                    'revenue_lag_7': df['value'].iloc[-7] if len(df) >= 7 else df['value'].mean(),
                    'revenue_lag_30': df['value'].iloc[-30] if len(df) >= 30 else df['value'].mean(),
                    'revenue_ma_7': df['value'].tail(7).mean(),
                    'revenue_ma_30': df['value'].tail(30).mean(),
                    'revenue_std_7': df['value'].tail(7).std()
                }
                
                X_future = pd.DataFrame([future_features])
                
                # Napoved
                pred = model.predict(X_future)[0]
                predictions.append(pred)
                
                # Confidence interval (približek)
                std_error = rmse
                confidence_intervals.append((
                    pred - 1.96 * std_error,
                    pred + 1.96 * std_error
                ))
                
                # Posodobi last_data za naslednjo iteracijo
                last_data.loc[future_date] = {
                    'value': pred,
                    'day_of_week': future_date.dayofweek,
                    'month': future_date.month,
                    'quarter': future_date.quarter,
                    'is_weekend': int(future_date.dayofweek >= 5)
                }
            
            # Izračunaj skupne statistike
            total_predicted_revenue = sum(predictions)
            avg_daily_revenue = np.mean(predictions)
            revenue_trend = "naraščajoč" if predictions[-1] > predictions[0] else "padajoč"
            
            # Generiraj vpoglede
            insights = [
                f"Napovedan skupni prihodek za naslednjih {periods} dni: €{total_predicted_revenue:,.2f}",
                f"Povprečni dnevni prihodek: €{avg_daily_revenue:,.2f}",
                f"Trend prihodkov: {revenue_trend}",
                f"Model natančnost (R²): {r2:.3f}",
                f"Povprečna napaka: €{mae:,.2f}"
            ]
            
            # Priporočila
            recommendations = []
            
            if r2 > 0.8:
                recommendations.append("Model ima visoko natančnost - priporočamo uporabo za planiranje")
            elif r2 > 0.6:
                recommendations.append("Model ima zmerno natančnost - priporočamo previdnost pri odločitvah")
            else:
                recommendations.append("Model ima nizko natančnost - potrebni dodatni podatki")
            
            if revenue_trend == "padajoč":
                recommendations.append("Prihodki kažejo padajoč trend - priporočamo marketing aktivnosti")
            
            # Shrani rezultat
            analysis_result = AnalysisResult(
                analysis_id=f"revenue_forecast_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                analysis_type=AnalysisType.REVENUE_FORECAST,
                model_type=ModelType.GRADIENT_BOOSTING,
                accuracy_score=r2,
                predictions={
                    "dates": [d.isoformat() for d in future_dates],
                    "values": predictions,
                    "confidence_intervals": confidence_intervals,
                    "total_revenue": total_predicted_revenue,
                    "avg_daily_revenue": avg_daily_revenue
                },
                insights=insights,
                recommendations=recommendations,
                visualizations=[],
                confidence_interval=(min(p[0] for p in confidence_intervals), 
                                   max(p[1] for p in confidence_intervals)),
                created_at=datetime.now()
            )
            
            self._save_analysis_result(analysis_result)
            
            return {
                "success": True,
                "analysis_id": analysis_result.analysis_id,
                "predictions": analysis_result.predictions,
                "insights": insights,
                "recommendations": recommendations,
                "model_accuracy": r2,
                "forecast_period": f"{periods} dni",
                "total_predicted_revenue": total_predicted_revenue
            }
            
        except Exception as e:
            logger.error(f"Napaka pri napovedi prihodkov: {e}")
            return {"success": False, "error": str(e)}
    
    def customer_segmentation_analysis(self) -> Dict[str, Any]:
        """Analiza segmentacije strank"""
        try:
            # Pridobi podatke o strankah (simulirani podatki)
            # V resničnem sistemu bi to prišlo iz CRM/POS sistema
            
            # Generiraj simulirane podatke strank
            np.random.seed(42)
            n_customers = 1000
            
            customers_data = {
                'customer_id': [f'CUST_{i:04d}' for i in range(n_customers)],
                'total_spent': np.random.lognormal(5, 1, n_customers),
                'visit_frequency': np.random.poisson(3, n_customers) + 1,
                'avg_order_value': np.random.normal(45, 15, n_customers),
                'days_since_last_visit': np.random.exponential(30, n_customers),
                'preferred_time': np.random.choice(['morning', 'afternoon', 'evening'], n_customers),
                'age_group': np.random.choice(['18-25', '26-35', '36-45', '46-55', '55+'], n_customers),
                'customer_type': np.random.choice(['local', 'tourist', 'business'], n_customers)
            }
            
            df = pd.DataFrame(customers_data)
            
            # Pripravi značilke za clustering
            # Encode kategorične spremenljivke
            le_time = LabelEncoder()
            le_age = LabelEncoder()
            le_type = LabelEncoder()
            
            df['preferred_time_encoded'] = le_time.fit_transform(df['preferred_time'])
            df['age_group_encoded'] = le_age.fit_transform(df['age_group'])
            df['customer_type_encoded'] = le_type.fit_transform(df['customer_type'])
            
            # Izberi značilke za clustering
            features = ['total_spent', 'visit_frequency', 'avg_order_value', 
                       'days_since_last_visit', 'preferred_time_encoded', 
                       'age_group_encoded', 'customer_type_encoded']
            
            X = df[features]
            
            # Standardiziraj podatke
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Določi optimalno število clustrov (elbow method)
            inertias = []
            K_range = range(2, 11)
            
            for k in K_range:
                kmeans = KMeans(n_clusters=k, random_state=42)
                kmeans.fit(X_scaled)
                inertias.append(kmeans.inertia_)
            
            # Izberi optimalno število clustrov (poenostavljeno)
            optimal_k = 5  # Lahko bi uporabili elbow method
            
            # Izvedi clustering
            kmeans = KMeans(n_clusters=optimal_k, random_state=42)
            df['segment'] = kmeans.fit_predict(X_scaled)
            
            # Analiziraj segmente
            segments = []
            segment_names = ['VIP Stranke', 'Redni Gostje', 'Občasni Obiskovalci', 
                           'Novi Gostje', 'Neaktivni Gostje']
            
            for i in range(optimal_k):
                segment_data = df[df['segment'] == i]
                
                characteristics = {
                    'avg_total_spent': float(segment_data['total_spent'].mean()),
                    'avg_visit_frequency': float(segment_data['visit_frequency'].mean()),
                    'avg_order_value': float(segment_data['avg_order_value'].mean()),
                    'avg_days_since_last_visit': float(segment_data['days_since_last_visit'].mean()),
                    'most_common_time': segment_data['preferred_time'].mode().iloc[0],
                    'most_common_age_group': segment_data['age_group'].mode().iloc[0],
                    'most_common_type': segment_data['customer_type'].mode().iloc[0]
                }
                
                # Generiraj priporočila za segment
                recommendations = []
                
                if characteristics['avg_total_spent'] > df['total_spent'].quantile(0.8):
                    recommendations.extend([
                        "VIP program z ekskluzivnimi ugodnostmi",
                        "Personalizirane ponudbe in storitve",
                        "Prednostno obravnavanje"
                    ])
                elif characteristics['avg_visit_frequency'] > df['visit_frequency'].quantile(0.7):
                    recommendations.extend([
                        "Lojalnostni program s točkami",
                        "Redne promocije in popusti",
                        "Zgodnje obvestilo o novih ponudbah"
                    ])
                elif characteristics['avg_days_since_last_visit'] > 60:
                    recommendations.extend([
                        "Win-back kampanja",
                        "Posebni popusti za vrnitev",
                        "Personalizirani email z novostmi"
                    ])
                else:
                    recommendations.extend([
                        "Dobrodošli paket za nove stranke",
                        "Predstavitev vseh storitev",
                        "Povabilo k registraciji v program zvestobe"
                    ])
                
                segment = CustomerSegment(
                    segment_id=f"SEG_{i:02d}",
                    name=segment_names[i] if i < len(segment_names) else f"Segment {i+1}",
                    characteristics=characteristics,
                    size=len(segment_data),
                    avg_value=float(segment_data['total_spent'].mean()),
                    behavior_patterns={
                        'preferred_time_distribution': segment_data['preferred_time'].value_counts().to_dict(),
                        'age_group_distribution': segment_data['age_group'].value_counts().to_dict(),
                        'customer_type_distribution': segment_data['customer_type'].value_counts().to_dict()
                    },
                    recommendations=recommendations
                )
                
                segments.append(segment)
                
                # Shrani segment v bazo
                self._save_customer_segment(segment)
            
            # Generiraj splošne vpoglede
            insights = [
                f"Identificiranih {optimal_k} glavnih segmentov strank",
                f"Največji segment: {max(segments, key=lambda s: s.size).name} ({max(s.size for s in segments)} strank)",
                f"Najvrednejši segment: {max(segments, key=lambda s: s.avg_value).name} (€{max(s.avg_value for s in segments):.2f} povprečno)",
                f"Skupno analiziranih strank: {n_customers}",
                "Segmentacija omogoča ciljno usmerjene marketing kampanje"
            ]
            
            recommendations = [
                "Implementiraj različne marketing strategije za vsak segment",
                "Prilagodi komunikacijske kanale glede na preference segmentov",
                "Razvij specifične ponudbe za visoko-vredne segmente",
                "Ustvari avtomatizirane kampanje za reaktivacijo neaktivnih strank",
                "Redno spremljaj in posodabljaj segmentacijo"
            ]
            
            return {
                "success": True,
                "segments": [
                    {
                        "segment_id": s.segment_id,
                        "name": s.name,
                        "size": s.size,
                        "avg_value": round(s.avg_value, 2),
                        "characteristics": s.characteristics,
                        "recommendations": s.recommendations
                    } for s in segments
                ],
                "insights": insights,
                "recommendations": recommendations,
                "total_customers": n_customers,
                "analysis_date": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri segmentaciji strank: {e}")
            return {"success": False, "error": str(e)}
    
    def price_optimization(self, room_type: str, 
                          target_date: date) -> Dict[str, Any]:
        """Optimizacija cen"""
        try:
            # Simuliraj zgodovinske podatke o cenah in zasedenosti
            np.random.seed(42)
            
            # Generiraj podatke za zadnjih 365 dni
            dates = pd.date_range(
                start=datetime.now() - timedelta(days=365),
                end=datetime.now(),
                freq='D'
            )
            
            historical_data = []
            for date_val in dates:
                # Simuliraj sezonske vplive
                season_factor = 1.0
                if date_val.month in [6, 7, 8]:  # Poletje
                    season_factor = 1.3
                elif date_val.month in [12, 1]:  # Zima/Nova leta
                    season_factor = 1.2
                elif date_val.month in [4, 5, 9, 10]:  # Pomlad/Jesen
                    season_factor = 1.1
                
                # Weekend faktor
                weekend_factor = 1.15 if date_val.weekday() >= 5 else 1.0
                
                # Osnovna cena
                base_price = 80 + np.random.normal(0, 10)
                price = base_price * season_factor * weekend_factor
                
                # Zasedenost (obratno sorazmerna s ceno)
                base_occupancy = 0.7
                price_sensitivity = -0.002
                occupancy = base_occupancy + price_sensitivity * (price - 100) + np.random.normal(0, 0.1)
                occupancy = max(0.1, min(1.0, occupancy))
                
                historical_data.append({
                    'date': date_val,
                    'price': price,
                    'occupancy': occupancy,
                    'revenue': price * occupancy,
                    'day_of_week': date_val.weekday(),
                    'month': date_val.month,
                    'is_weekend': int(date_val.weekday() >= 5),
                    'season': season_factor
                })
            
            df = pd.DataFrame(historical_data)
            
            # Pripravi značilke za model
            features = ['price', 'day_of_week', 'month', 'is_weekend', 'season']
            X = df[features]
            y_occupancy = df['occupancy']
            y_revenue = df['revenue']
            
            # Treniraj model za napoved zasedenosti
            occupancy_model = RandomForestRegressor(n_estimators=100, random_state=42)
            occupancy_model.fit(X, y_occupancy)
            
            # Treniraj model za napoved prihodkov
            revenue_model = RandomForestRegressor(n_estimators=100, random_state=42)
            revenue_model.fit(X, y_revenue)
            
            # Pripravi značilke za ciljni datum
            target_features = {
                'day_of_week': target_date.weekday(),
                'month': target_date.month,
                'is_weekend': int(target_date.weekday() >= 5),
                'season': 1.3 if target_date.month in [6, 7, 8] else
                         1.2 if target_date.month in [12, 1] else
                         1.1 if target_date.month in [4, 5, 9, 10] else 1.0
            }
            
            # Testiraj različne cene
            price_range = np.arange(60, 150, 5)
            optimization_results = []
            
            for test_price in price_range:
                test_features = target_features.copy()
                test_features['price'] = test_price
                
                X_test = pd.DataFrame([test_features])
                
                predicted_occupancy = occupancy_model.predict(X_test)[0]
                predicted_revenue = revenue_model.predict(X_test)[0]
                
                optimization_results.append({
                    'price': test_price,
                    'predicted_occupancy': max(0, min(1, predicted_occupancy)),
                    'predicted_revenue': max(0, predicted_revenue),
                    'revenue_per_room': test_price * max(0, min(1, predicted_occupancy))
                })
            
            # Najdi optimalno ceno
            optimal_result = max(optimization_results, key=lambda x: x['revenue_per_room'])
            
            # Trenutna cena (simulirana)
            current_price = 90.0
            
            # Izračunaj vpliv
            current_occupancy = occupancy_model.predict(pd.DataFrame([{
                **target_features, 'price': current_price
            }]))[0]
            
            revenue_impact = optimal_result['revenue_per_room'] - (current_price * current_occupancy)
            
            # Generiraj priporočilo
            recommendation = PriceRecommendation(
                room_type=room_type,
                date=target_date,
                current_price=current_price,
                recommended_price=optimal_result['price'],
                expected_occupancy=optimal_result['predicted_occupancy'],
                revenue_impact=revenue_impact,
                confidence=0.85,  # Simulirana zaupljivost
                reasoning=f"Optimalna cena €{optimal_result['price']:.0f} maksimizira prihodek na sobo"
            )
            
            # Shrani priporočilo
            self._save_price_recommendation(recommendation)
            
            # Generiraj vpoglede
            insights = [
                f"Optimalna cena za {room_type} na {target_date}: €{optimal_result['price']:.0f}",
                f"Pričakovana zasedenost: {optimal_result['predicted_occupancy']:.1%}",
                f"Pričakovan prihodek na sobo: €{optimal_result['revenue_per_room']:.2f}",
                f"Izboljšanje prihodka: €{revenue_impact:.2f} na sobo",
                f"Trenutna cena €{current_price:.0f} {'je optimalna' if abs(optimal_result['price'] - current_price) < 5 else 'ni optimalna'}"
            ]
            
            recommendations = []
            
            if optimal_result['price'] > current_price + 5:
                recommendations.append(f"Priporočamo zvišanje cene za €{optimal_result['price'] - current_price:.0f}")
            elif optimal_result['price'] < current_price - 5:
                recommendations.append(f"Priporočamo znižanje cene za €{current_price - optimal_result['price']:.0f}")
            else:
                recommendations.append("Trenutna cena je blizu optimalni")
            
            if optimal_result['predicted_occupancy'] < 0.6:
                recommendations.append("Nizka pričakovana zasedenost - razmislite o promocijah")
            elif optimal_result['predicted_occupancy'] > 0.9:
                recommendations.append("Visoka pričakovana zasedenost - možnost višjih cen")
            
            return {
                "success": True,
                "room_type": room_type,
                "target_date": target_date.isoformat(),
                "current_price": current_price,
                "recommended_price": optimal_result['price'],
                "expected_occupancy": round(optimal_result['predicted_occupancy'], 3),
                "revenue_impact": round(revenue_impact, 2),
                "confidence": recommendation.confidence,
                "insights": insights,
                "recommendations": recommendations,
                "price_analysis": optimization_results,
                "reasoning": recommendation.reasoning
            }
            
        except Exception as e:
            logger.error(f"Napaka pri optimizaciji cen: {e}")
            return {"success": False, "error": str(e)}
    
    def satisfaction_analysis(self) -> Dict[str, Any]:
        """Analiza zadovoljstva gostov"""
        try:
            # Simuliraj podatke o ocenah in komentarjih
            np.random.seed(42)
            n_reviews = 500
            
            # Generiraj simulirane ocene
            reviews_data = {
                'review_id': [f'REV_{i:04d}' for i in range(n_reviews)],
                'overall_rating': np.random.choice([1, 2, 3, 4, 5], n_reviews, p=[0.05, 0.1, 0.2, 0.35, 0.3]),
                'service_rating': np.random.choice([1, 2, 3, 4, 5], n_reviews, p=[0.03, 0.07, 0.25, 0.4, 0.25]),
                'cleanliness_rating': np.random.choice([1, 2, 3, 4, 5], n_reviews, p=[0.02, 0.08, 0.2, 0.4, 0.3]),
                'location_rating': np.random.choice([1, 2, 3, 4, 5], n_reviews, p=[0.05, 0.1, 0.15, 0.35, 0.35]),
                'value_rating': np.random.choice([1, 2, 3, 4, 5], n_reviews, p=[0.08, 0.12, 0.3, 0.3, 0.2]),
                'room_type': np.random.choice(['Standard', 'Deluxe', 'Suite'], n_reviews),
                'guest_type': np.random.choice(['Business', 'Leisure', 'Family'], n_reviews),
                'stay_duration': np.random.poisson(3, n_reviews) + 1,
                'review_date': pd.date_range(
                    start=datetime.now() - timedelta(days=365),
                    end=datetime.now(),
                    periods=n_reviews
                )
            }
            
            df = pd.DataFrame(reviews_data)
            
            # Osnovne statistike
            overall_avg = df['overall_rating'].mean()
            service_avg = df['service_rating'].mean()
            cleanliness_avg = df['cleanliness_rating'].mean()
            location_avg = df['location_rating'].mean()
            value_avg = df['value_rating'].mean()
            
            # Analiza po kategorijah
            room_type_analysis = df.groupby('room_type').agg({
                'overall_rating': ['mean', 'count'],
                'service_rating': 'mean',
                'cleanliness_rating': 'mean'
            }).round(2)
            
            guest_type_analysis = df.groupby('guest_type').agg({
                'overall_rating': ['mean', 'count'],
                'value_rating': 'mean'
            }).round(2)
            
            # Trend analiza (zadnjih 12 mesecev)
            df['month'] = df['review_date'].dt.to_period('M')
            monthly_trends = df.groupby('month')['overall_rating'].mean()
            
            # Identifikacija problemov
            low_ratings = df[df['overall_rating'] <= 2]
            problem_areas = []
            
            if len(low_ratings) > 0:
                if low_ratings['service_rating'].mean() < 3:
                    problem_areas.append("Storitve")
                if low_ratings['cleanliness_rating'].mean() < 3:
                    problem_areas.append("Čistoča")
                if low_ratings['value_rating'].mean() < 3:
                    problem_areas.append("Razmerje cena-vrednost")
            
            # Sentiment analiza (simulirana)
            positive_keywords = ['odličen', 'čudovit', 'priporočam', 'super', 'fantastičen']
            negative_keywords = ['slab', 'grozno', 'ne priporočam', 'razočaran', 'slabo']
            
            # Simuliraj sentiment score
            sentiment_scores = []
            for rating in df['overall_rating']:
                if rating >= 4:
                    sentiment_scores.append(np.random.uniform(0.6, 1.0))
                elif rating == 3:
                    sentiment_scores.append(np.random.uniform(0.2, 0.6))
                else:
                    sentiment_scores.append(np.random.uniform(0.0, 0.4))
            
            df['sentiment_score'] = sentiment_scores
            avg_sentiment = np.mean(sentiment_scores)
            
            # Generiraj vpoglede
            insights = [
                f"Povprečna ocena: {overall_avg:.2f}/5.0",
                f"Najboljša kategorija: {'Lokacija' if location_avg == max(service_avg, cleanliness_avg, location_avg, value_avg) else 'Storitve' if service_avg == max(service_avg, cleanliness_avg, location_avg, value_avg) else 'Čistoča' if cleanliness_avg == max(service_avg, cleanliness_avg, location_avg, value_avg) else 'Vrednost'} ({max(service_avg, cleanliness_avg, location_avg, value_avg):.2f}/5.0)",
                f"Najslabša kategorija: {'Vrednost' if value_avg == min(service_avg, cleanliness_avg, location_avg, value_avg) else 'Storitve' if service_avg == min(service_avg, cleanliness_avg, location_avg, value_avg) else 'Čistoča' if cleanliness_avg == min(service_avg, cleanliness_avg, location_avg, value_avg) else 'Lokacija'} ({min(service_avg, cleanliness_avg, location_avg, value_avg):.2f}/5.0)",
                f"Delež pozitivnih ocen (4-5): {len(df[df['overall_rating'] >= 4]) / len(df) * 100:.1f}%",
                f"Delež negativnih ocen (1-2): {len(df[df['overall_rating'] <= 2]) / len(df) * 100:.1f}%",
                f"Povprečen sentiment: {avg_sentiment:.2f} (0=negativen, 1=pozitiven)"
            ]
            
            # Priporočila
            recommendations = []
            
            if overall_avg < 3.5:
                recommendations.append("KRITIČNO: Povprečna ocena je pod 3.5 - potrebne takojšnje izboljšave")
            elif overall_avg < 4.0:
                recommendations.append("Povprečna ocena je pod 4.0 - priporočamo fokus na izboljšave")
            
            if problem_areas:
                recommendations.append(f"Problematična področja: {', '.join(problem_areas)}")
            
            if service_avg < 4.0:
                recommendations.append("Izboljšajte usposabljanje osebja za boljše storitve")
            
            if cleanliness_avg < 4.0:
                recommendations.append("Povečajte standarde čistoče in vzdrževanja")
            
            if value_avg < 3.5:
                recommendations.append("Preučite razmerje cena-vrednost in prilagodite ponudbo")
            
            # Dodaj pozitivna priporočila
            if overall_avg >= 4.0:
                recommendations.append("Odlične ocene - uporabite za marketing in promocijo")
            
            if location_avg >= 4.5:
                recommendations.append("Lokacija je močna prednost - poudarite v promocijah")
            
            return {
                "success": True,
                "overall_metrics": {
                    "average_rating": round(overall_avg, 2),
                    "total_reviews": n_reviews,
                    "positive_reviews_percent": round(len(df[df['overall_rating'] >= 4]) / len(df) * 100, 1),
                    "negative_reviews_percent": round(len(df[df['overall_rating'] <= 2]) / len(df) * 100, 1),
                    "average_sentiment": round(avg_sentiment, 2)
                },
                "category_ratings": {
                    "service": round(service_avg, 2),
                    "cleanliness": round(cleanliness_avg, 2),
                    "location": round(location_avg, 2),
                    "value": round(value_avg, 2)
                },
                "room_type_analysis": {
                    room_type: {
                        "average_rating": float(data[0]),
                        "review_count": int(data[1])
                    } for room_type, data in room_type_analysis.iterrows()
                },
                "guest_type_analysis": {
                    guest_type: {
                        "average_rating": float(data[0]),
                        "review_count": int(data[1])
                    } for guest_type, data in guest_type_analysis.iterrows()
                },
                "problem_areas": problem_areas,
                "insights": insights,
                "recommendations": recommendations,
                "analysis_date": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri analizi zadovoljstva: {e}")
            return {"success": False, "error": str(e)}
    
    def _save_analysis_result(self, result: AnalysisResult):
        """Shrani rezultat analize"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO analysis_results 
                    (analysis_id, analysis_type, model_type, accuracy_score,
                     predictions, insights, recommendations, visualizations,
                     confidence_interval, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    result.analysis_id,
                    result.analysis_type.value,
                    result.model_type.value,
                    result.accuracy_score,
                    json.dumps(result.predictions),
                    json.dumps(result.insights),
                    json.dumps(result.recommendations),
                    json.dumps(result.visualizations),
                    json.dumps(result.confidence_interval),
                    result.created_at.isoformat()
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju rezultata: {e}")
    
    def _save_customer_segment(self, segment: CustomerSegment):
        """Shrani segment strank"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO customer_segments 
                    (segment_id, name, characteristics, size, avg_value,
                     behavior_patterns, recommendations, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    segment.segment_id,
                    segment.name,
                    json.dumps(segment.characteristics),
                    segment.size,
                    segment.avg_value,
                    json.dumps(segment.behavior_patterns),
                    json.dumps(segment.recommendations),
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju segmenta: {e}")
    
    def _save_price_recommendation(self, recommendation: PriceRecommendation):
        """Shrani cenovno priporočilo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO price_recommendations 
                    (recommendation_id, room_type, date, current_price,
                     recommended_price, expected_occupancy, revenue_impact,
                     confidence, reasoning, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    f"PRICE_{recommendation.room_type}_{recommendation.date.strftime('%Y%m%d')}",
                    recommendation.room_type,
                    recommendation.date.isoformat(),
                    recommendation.current_price,
                    recommendation.recommended_price,
                    recommendation.expected_occupancy,
                    recommendation.revenue_impact,
                    recommendation.confidence,
                    recommendation.reasoning,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju cenovnega priporočila: {e}")
    
    def get_business_insights_dashboard(self) -> Dict[str, Any]:
        """Pridobi poslovne vpoglede za dashboard"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Zadnje analize
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT analysis_type, accuracy_score, created_at
                    FROM analysis_results 
                    ORDER BY created_at DESC 
                    LIMIT 10
                ''')
                
                recent_analyses = cursor.fetchall()
                
                # Segmenti strank
                cursor.execute('''
                    SELECT name, size, avg_value
                    FROM customer_segments 
                    ORDER BY avg_value DESC
                ''')
                
                segments = cursor.fetchall()
                
                # Cenovna priporočila
                cursor.execute('''
                    SELECT room_type, recommended_price, revenue_impact, confidence
                    FROM price_recommendations 
                    WHERE date >= date('now')
                    ORDER BY revenue_impact DESC
                    LIMIT 5
                ''')
                
                price_recommendations = cursor.fetchall()
                
                return {
                    "success": True,
                    "recent_analyses": [
                        {
                            "type": analysis[0],
                            "accuracy": analysis[1],
                            "date": analysis[2]
                        } for analysis in recent_analyses
                    ],
                    "customer_segments": [
                        {
                            "name": seg[0],
                            "size": seg[1],
                            "avg_value": seg[2]
                        } for seg in segments
                    ],
                    "price_recommendations": [
                        {
                            "room_type": rec[0],
                            "recommended_price": rec[1],
                            "revenue_impact": rec[2],
                            "confidence": rec[3]
                        } for rec in price_recommendations
                    ],
                    "dashboard_generated_at": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju dashboard podatkov: {e}")
            return {"success": False, "error": str(e)}

# Primer uporabe
if __name__ == "__main__":
    analytics = AIAnalyticsEngine()
    
    # Dodaj nekaj metrik
    revenue_metric = BusinessMetric(
        metric_id="REV_20241201",
        name="Dnevni prihodek",
        value=1250.50,
        unit="EUR",
        category="revenue",
        date=date.today(),
        source="POS_system"
    )
    
    result = analytics.add_business_metric(revenue_metric)
    print(f"Dodajanje metrike: {result}")
    
    # Napoved prihodkov
    forecast_result = analytics.revenue_forecast(PredictionHorizon.DAILY, 30)
    print(f"Napoved prihodkov: {forecast_result}")
    
    # Segmentacija strank
    segmentation_result = analytics.customer_segmentation_analysis()
    print(f"Segmentacija strank: {segmentation_result}")
    
    # Optimizacija cen
    price_result = analytics.price_optimization("Standard", date.today() + timedelta(days=7))
    print(f"Optimizacija cen: {price_result}")
    
    # Analiza zadovoljstva
    satisfaction_result = analytics.satisfaction_analysis()
    print(f"Analiza zadovoljstva: {satisfaction_result}")
    
    # Dashboard vpogledi
    dashboard_result = analytics.get_business_insights_dashboard()
    print(f"Dashboard vpogledi: {dashboard_result}")