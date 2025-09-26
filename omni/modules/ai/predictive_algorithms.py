"""
🧠 Napredni AI algoritmi za napovedovanje - Omniscient AI Platform
Implementira različne algoritme strojnega učenja za napovedovanje in optimizacijo
"""

import numpy as np
import pandas as pd
import logging
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class PredictiveAI:
    """🔮 Napredni AI sistem za napovedovanje in optimizacijo"""
    
    def __init__(self, data_path: str = "data/ai_models"):
        """Inicializacija AI sistema"""
        self.data_path = data_path
        self.models = {}
        self.scalers = {}
        self.model_metrics = {}
        
        # Ustvari direktorij za modele
        os.makedirs(data_path, exist_ok=True)
        
        # Konfiguriraj algoritme
        self.algorithms = {
            'random_forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'gradient_boost': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'linear_regression': LinearRegression(),
            'ridge_regression': Ridge(alpha=1.0)
        }
        
        logger.info("🧠 Predictive AI sistem inicializiran")
    
    def prepare_data(self, data: pd.DataFrame, target_column: str, 
                    feature_columns: Optional[List[str]] = None) -> Tuple[np.ndarray, np.ndarray]:
        """Pripravi podatke za učenje"""
        try:
            if feature_columns is None:
                feature_columns = [col for col in data.columns if col != target_column]
            
            # Odstrani manjkajoče vrednosti
            data_clean = data.dropna()
            
            # Pripravi značilnosti
            X_df = data_clean[feature_columns].copy()
            
            # Pretvorimo datetime stolpce v numerične vrednosti
            for col in X_df.columns:
                if X_df[col].dtype == 'datetime64[ns]' or str(X_df[col].dtype).startswith('datetime'):
                    X_df[col] = pd.to_numeric(X_df[col])
                elif X_df[col].dtype == 'object':
                    try:
                        X_df[col] = pd.to_datetime(X_df[col])
                        X_df[col] = pd.to_numeric(X_df[col])
                    except:
                        # Če ni datetime, poskusimo numerično pretvorbo
                        X_df[col] = pd.to_numeric(X_df[col], errors='coerce')
            
            # Odstranimo NaN vrednosti
            X_df = X_df.fillna(X_df.mean())
            
            X = X_df.values
            y = data_clean[target_column].values
            
            # Normaliziraj podatke
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Shrani scaler
            model_key = f"{target_column}_scaler"
            self.scalers[model_key] = scaler
            
            logger.info(f"✅ Podatki pripravljeni: {X_scaled.shape[0]} vzorcev, {X_scaled.shape[1]} značilnosti")
            return X_scaled, y
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pripravi podatkov: {e}")
            raise
    
    def train_models(self, X: np.ndarray, y: np.ndarray, model_name: str) -> Dict[str, Any]:
        """Nauči vse algoritme in izberi najboljšega"""
        results = {}
        
        # Razdeli podatke
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        best_model = None
        best_score = float('-inf')
        best_algorithm = None
        
        for algo_name, algorithm in self.algorithms.items():
            try:
                logger.info(f"🔄 Učim {algo_name}...")
                
                # Nauči model
                algorithm.fit(X_train, y_train)
                
                # Napovej na testnih podatkih
                y_pred = algorithm.predict(X_test)
                
                # Izračunaj metrike
                mse = mean_squared_error(y_test, y_pred)
                mae = mean_absolute_error(y_test, y_pred)
                r2 = r2_score(y_test, y_pred)
                
                # Cross-validation
                cv_scores = cross_val_score(algorithm, X_train, y_train, cv=5, scoring='r2')
                cv_mean = cv_scores.mean()
                
                metrics = {
                    'mse': mse,
                    'mae': mae,
                    'r2': r2,
                    'cv_score': cv_mean,
                    'cv_std': cv_scores.std()
                }
                
                results[algo_name] = metrics
                
                # Preveri, če je to najboljši model
                if r2 > best_score:
                    best_score = r2
                    best_model = algorithm
                    best_algorithm = algo_name
                
                logger.info(f"✅ {algo_name}: R² = {r2:.4f}, MAE = {mae:.4f}")
                
            except Exception as e:
                logger.error(f"❌ Napaka pri učenju {algo_name}: {e}")
                results[algo_name] = {'error': str(e)}
        
        # Shrani najboljši model
        if best_model is not None:
            self.models[model_name] = best_model
            self.model_metrics[model_name] = {
                'algorithm': best_algorithm,
                'metrics': results[best_algorithm],
                'all_results': results,
                'trained_at': datetime.now().isoformat()
            }
            
            # Shrani model na disk
            model_file = os.path.join(self.data_path, f"{model_name}_model.joblib")
            joblib.dump(best_model, model_file)
            
            logger.info(f"🏆 Najboljši model ({best_algorithm}) shranjen: {model_name}")
        
        return results
    
    def predict(self, model_name: str, features: np.ndarray) -> np.ndarray:
        """Naredi napoved z modelom"""
        try:
            if model_name not in self.models:
                # Poskusi naložiti model z diska
                self.load_model(model_name)
            
            model = self.models[model_name]
            scaler_key = f"{model_name}_scaler"
            
            # Normaliziraj vhodne podatke
            if scaler_key in self.scalers:
                features_scaled = self.scalers[scaler_key].transform(features)
            else:
                features_scaled = features
            
            # Naredi napoved
            prediction = model.predict(features_scaled)
            
            logger.info(f"🔮 Napoved narejena z modelom {model_name}")
            return prediction
            
        except Exception as e:
            logger.error(f"❌ Napaka pri napovedovanju: {e}")
            raise
    
    def predict_time_series(self, data: pd.DataFrame, target_column: str, 
                          periods: int = 24) -> Dict[str, Any]:
        """Napovej časovne vrste"""
        try:
            # Pripravi podatke za časovne vrste
            data_sorted = data.sort_values('timestamp') if 'timestamp' in data.columns else data
            
            # Ustvari značilnosti za časovne vrste
            features = self._create_time_features(data_sorted)
            
            # Pripravi podatke
            X, y = self.prepare_data(features, target_column)
            
            # Nauči model
            model_name = f"timeseries_{target_column}"
            self.train_models(X, y, model_name)
            
            # Generiraj napovedi za prihodnost
            future_features = self._generate_future_features(data_sorted, periods)
            future_X, _ = self.prepare_data(future_features, target_column)
            
            predictions = self.predict(model_name, future_X[-periods:])
            
            # Ustvari časovne žige za napovedi
            last_timestamp = data_sorted['timestamp'].iloc[-1] if 'timestamp' in data_sorted.columns else datetime.now()
            future_timestamps = [last_timestamp + timedelta(hours=i+1) for i in range(periods)]
            
            result = {
                'predictions': predictions.tolist(),
                'timestamps': [ts.isoformat() for ts in future_timestamps],
                'model_metrics': self.model_metrics.get(model_name, {}),
                'confidence_interval': self._calculate_confidence_interval(predictions)
            }
            
            logger.info(f"📈 Časovna napoved narejena: {periods} obdobij")
            return result
            
        except Exception as e:
            logger.error(f"❌ Napaka pri napovedovanju časovnih vrst: {e}")
            raise
    
    def _create_time_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Ustvari značilnosti za časovne vrste"""
        features = data.copy()
        
        if 'timestamp' in data.columns:
            features['timestamp'] = pd.to_datetime(features['timestamp'])
            features['hour'] = features['timestamp'].dt.hour
            features['day_of_week'] = features['timestamp'].dt.dayofweek
            features['month'] = features['timestamp'].dt.month
            features['day_of_year'] = features['timestamp'].dt.dayofyear
        
        # Dodaj lag značilnosti
        numeric_columns = features.select_dtypes(include=[np.number]).columns
        for col in numeric_columns:
            if col not in ['hour', 'day_of_week', 'month', 'day_of_year']:
                features[f'{col}_lag1'] = features[col].shift(1)
                features[f'{col}_lag24'] = features[col].shift(24)  # 24 ur nazaj
                features[f'{col}_rolling_mean'] = features[col].rolling(window=24).mean()
        
        return features.dropna()
    
    def _generate_future_features(self, data: pd.DataFrame, periods: int) -> pd.DataFrame:
        """Generiraj značilnosti za prihodnje napovedi"""
        last_row = data.iloc[-1:].copy()
        future_data = []
        
        for i in range(periods):
            new_row = last_row.copy()
            
            if 'timestamp' in data.columns:
                new_timestamp = pd.to_datetime(last_row['timestamp'].iloc[0]) + timedelta(hours=i+1)
                new_row['timestamp'] = new_timestamp
                new_row['hour'] = new_timestamp.hour
                new_row['day_of_week'] = new_timestamp.dayofweek
                new_row['month'] = new_timestamp.month
                new_row['day_of_year'] = new_timestamp.dayofyear
            
            future_data.append(new_row)
        
        future_df = pd.concat(future_data, ignore_index=True)
        combined_data = pd.concat([data, future_df], ignore_index=True)
        
        return self._create_time_features(combined_data)
    
    def _calculate_confidence_interval(self, predictions: np.ndarray, 
                                     confidence: float = 0.95) -> Dict[str, List[float]]:
        """Izračunaj interval zaupanja"""
        std_dev = np.std(predictions)
        margin = 1.96 * std_dev  # 95% interval zaupanja
        
        return {
            'lower_bound': (predictions - margin).tolist(),
            'upper_bound': (predictions + margin).tolist()
        }
    
    def optimize_parameters(self, data: pd.DataFrame, target_column: str, 
                          optimization_target: str = 'maximize') -> Dict[str, Any]:
        """Optimiziraj parametre za doseganje cilja"""
        try:
            # Pripravi podatke
            X, y = self.prepare_data(data, target_column)
            
            # Nauči model
            model_name = f"optimization_{target_column}"
            self.train_models(X, y, model_name)
            
            # Analiziraj pomembnost značilnosti
            model = self.models[model_name]
            if hasattr(model, 'feature_importances_'):
                feature_importance = model.feature_importances_
                feature_names = [col for col in data.columns if col != target_column]
                
                importance_dict = dict(zip(feature_names, feature_importance))
                sorted_importance = sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
                
                # Generiraj optimizacijske priporočila
                recommendations = self._generate_optimization_recommendations(
                    sorted_importance, optimization_target
                )
                
                result = {
                    'feature_importance': dict(sorted_importance),
                    'recommendations': recommendations,
                    'model_metrics': self.model_metrics.get(model_name, {}),
                    'optimization_target': optimization_target
                }
                
                logger.info(f"🎯 Optimizacija parametrov dokončana")
                return result
            
        except Exception as e:
            logger.error(f"❌ Napaka pri optimizaciji: {e}")
            raise
    
    def _generate_optimization_recommendations(self, feature_importance: List[Tuple[str, float]], 
                                             target: str) -> List[Dict[str, Any]]:
        """Generiraj priporočila za optimizacijo"""
        recommendations = []
        
        for feature, importance in feature_importance[:5]:  # Top 5 značilnosti
            if target == 'maximize':
                action = "povečaj" if importance > 0 else "zmanjšaj"
                impact = "pozitiven" if importance > 0 else "negativen"
            else:
                action = "zmanjšaj" if importance > 0 else "povečaj"
                impact = "negativen" if importance > 0 else "pozitiven"
            
            recommendations.append({
                'feature': feature,
                'importance': float(importance),
                'action': action,
                'impact': impact,
                'priority': 'visoka' if importance > 0.1 else 'srednja' if importance > 0.05 else 'nizka'
            })
        
        return recommendations
    
    def anomaly_detection(self, data: pd.DataFrame, columns: List[str]) -> Dict[str, Any]:
        """Zaznaj anomalije v podatkih"""
        try:
            from sklearn.ensemble import IsolationForest
            from sklearn.preprocessing import StandardScaler
            
            # Pripravi podatke
            data_clean = data[columns].dropna()
            scaler = StandardScaler()
            data_scaled = scaler.fit_transform(data_clean)
            
            # Nauči model za zaznavanje anomalij
            iso_forest = IsolationForest(contamination=0.1, random_state=42)
            anomaly_labels = iso_forest.fit_predict(data_scaled)
            
            # Identificiraj anomalije
            anomalies = data_clean[anomaly_labels == -1]
            normal_data = data_clean[anomaly_labels == 1]
            
            # Izračunaj statistike
            anomaly_stats = {
                'total_samples': len(data_clean),
                'anomalies_count': len(anomalies),
                'anomaly_percentage': (len(anomalies) / len(data_clean)) * 100,
                'anomaly_indices': anomalies.index.tolist()
            }
            
            result = {
                'statistics': anomaly_stats,
                'anomalies': anomalies.to_dict('records'),
                'normal_ranges': {
                    col: {
                        'min': float(normal_data[col].min()),
                        'max': float(normal_data[col].max()),
                        'mean': float(normal_data[col].mean()),
                        'std': float(normal_data[col].std())
                    } for col in columns
                }
            }
            
            logger.info(f"🚨 Zaznanih {len(anomalies)} anomalij od {len(data_clean)} vzorcev")
            return result
            
        except Exception as e:
            logger.error(f"❌ Napaka pri zaznavanju anomalij: {e}")
            raise
    
    def save_model(self, model_name: str) -> bool:
        """Shrani model na disk"""
        try:
            if model_name in self.models:
                model_file = os.path.join(self.data_path, f"{model_name}_model.joblib")
                scaler_file = os.path.join(self.data_path, f"{model_name}_scaler.joblib")
                metrics_file = os.path.join(self.data_path, f"{model_name}_metrics.json")
                
                # Shrani model
                joblib.dump(self.models[model_name], model_file)
                
                # Shrani scaler
                scaler_key = f"{model_name}_scaler"
                if scaler_key in self.scalers:
                    joblib.dump(self.scalers[scaler_key], scaler_file)
                
                # Shrani metrike
                if model_name in self.model_metrics:
                    with open(metrics_file, 'w') as f:
                        json.dump(self.model_metrics[model_name], f, indent=2)
                
                logger.info(f"💾 Model {model_name} shranjen")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju modela: {e}")
            return False
    
    def load_model(self, model_name: str) -> bool:
        """Naloži model z diska"""
        try:
            model_file = os.path.join(self.data_path, f"{model_name}_model.joblib")
            scaler_file = os.path.join(self.data_path, f"{model_name}_scaler.joblib")
            metrics_file = os.path.join(self.data_path, f"{model_name}_metrics.json")
            
            if os.path.exists(model_file):
                # Naloži model
                self.models[model_name] = joblib.load(model_file)
                
                # Naloži scaler
                scaler_key = f"{model_name}_scaler"
                if os.path.exists(scaler_file):
                    self.scalers[scaler_key] = joblib.load(scaler_file)
                
                # Naloži metrike
                if os.path.exists(metrics_file):
                    with open(metrics_file, 'r') as f:
                        self.model_metrics[model_name] = json.load(f)
                
                logger.info(f"📂 Model {model_name} naložen")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Napaka pri nalaganju modela: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Vrni informacije o vseh modelih"""
        return {
            'loaded_models': list(self.models.keys()),
            'model_metrics': self.model_metrics,
            'available_algorithms': list(self.algorithms.keys()),
            'data_path': self.data_path
        }

# Utility funkcije
def create_sample_data(n_samples: int = 1000) -> pd.DataFrame:
    """Ustvari vzorčne podatke za testiranje"""
    np.random.seed(42)
    
    timestamps = pd.date_range(start='2024-01-01', periods=n_samples, freq='H')
    
    # Simuliraj senzorske podatke
    temperature = 20 + 10 * np.sin(np.arange(n_samples) * 2 * np.pi / 24) + np.random.normal(0, 2, n_samples)
    humidity = 50 + 20 * np.cos(np.arange(n_samples) * 2 * np.pi / 24) + np.random.normal(0, 5, n_samples)
    pressure = 1013 + np.random.normal(0, 10, n_samples)
    
    # Dodaj trend in sezonalnost
    energy_consumption = (
        100 + 
        0.1 * np.arange(n_samples) +  # Trend
        20 * np.sin(np.arange(n_samples) * 2 * np.pi / 24) +  # Dnevna sezonalnost
        temperature * 0.5 + 
        humidity * 0.2 + 
        np.random.normal(0, 5, n_samples)
    )
    
    return pd.DataFrame({
        'timestamp': timestamps,
        'temperature': temperature,
        'humidity': humidity,
        'pressure': pressure,
        'energy_consumption': energy_consumption
    })

if __name__ == "__main__":
    # Test AI sistema
    print("🧠 Testiram Predictive AI sistem...")
    
    # Ustvari AI sistem
    ai = PredictiveAI()
    
    # Generiraj vzorčne podatke
    data = create_sample_data(1000)
    print(f"📊 Generirani vzorčni podatki: {len(data)} vzorcev")
    
    # Test napovedovanja
    print("\n🔮 Testiram napovedovanje...")
    X, y = ai.prepare_data(data, 'energy_consumption', ['temperature', 'humidity', 'pressure'])
    results = ai.train_models(X, y, 'energy_model')
    
    # Test časovnih vrst
    print("\n📈 Testiram napovedovanje časovnih vrst...")
    ts_results = ai.predict_time_series(data, 'energy_consumption', periods=24)
    print(f"Napovedi za naslednjih 24 ur: {len(ts_results['predictions'])}")
    
    # Test optimizacije
    print("\n🎯 Testiram optimizacijo parametrov...")
    opt_results = ai.optimize_parameters(data, 'energy_consumption', 'minimize')
    if opt_results:
        print(f"Top 3 pomembne značilnosti: {list(opt_results['feature_importance'].keys())[:3]}")
    else:
        print("❌ Optimizacija parametrov ni uspela")
    
    # Test zaznavanja anomalij
    print("\n🚨 Testiram zaznavanje anomalij...")
    anomaly_results = ai.anomaly_detection(data, ['temperature', 'humidity', 'energy_consumption'])
    if anomaly_results is not None:
        print(f"Zaznanih anomalij: {anomaly_results['statistics']['anomalies_count']}")
    else:
        print("❌ Zaznavanje anomalij ni uspelo")
    
    print("\n✅ Vsi testi uspešno dokončani!")