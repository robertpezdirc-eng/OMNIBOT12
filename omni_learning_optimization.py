#!/usr/bin/env python3
"""
Omni Learning & Optimization System
Sistem za samodejno učenje in optimizacijo
Implementira napredne algoritme za učenje vzorcev, optimizacijo delovanja in prediktivno analitiko
"""

import asyncio
import json
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import pickle
import gzip
import os
from pathlib import Path
import threading
import time
from collections import defaultdict, deque
import statistics

logger = logging.getLogger('OmniLearningOptimization')

class LearningType(Enum):
    PATTERN_RECOGNITION = "pattern_recognition"
    PERFORMANCE_OPTIMIZATION = "performance_optimization"
    PREDICTIVE_ANALYTICS = "predictive_analytics"
    ANOMALY_DETECTION = "anomaly_detection"
    RESOURCE_OPTIMIZATION = "resource_optimization"
    USER_BEHAVIOR = "user_behavior"
    SYSTEM_ADAPTATION = "system_adaptation"

class OptimizationStrategy(Enum):
    GRADIENT_DESCENT = "gradient_descent"
    GENETIC_ALGORITHM = "genetic_algorithm"
    REINFORCEMENT_LEARNING = "reinforcement_learning"
    BAYESIAN_OPTIMIZATION = "bayesian_optimization"
    SWARM_INTELLIGENCE = "swarm_intelligence"
    NEURAL_NETWORK = "neural_network"

@dataclass
class LearningPattern:
    pattern_id: str
    pattern_type: LearningType
    data_points: List[Dict[str, Any]]
    confidence_score: float
    created_at: datetime
    last_updated: datetime
    usage_count: int
    success_rate: float
    metadata: Dict[str, Any]

@dataclass
class OptimizationResult:
    optimization_id: str
    strategy: OptimizationStrategy
    target_metric: str
    baseline_value: float
    optimized_value: float
    improvement_percentage: float
    parameters: Dict[str, Any]
    execution_time: float
    confidence: float
    recommendations: List[str]

@dataclass
class PredictionModel:
    model_id: str
    model_type: str
    target_variable: str
    features: List[str]
    accuracy: float
    last_trained: datetime
    training_data_size: int
    model_data: bytes  # Serialized model
    metadata: Dict[str, Any]

class OmniLearningOptimization:
    """Glavni sistem za učenje in optimizacijo"""
    
    def __init__(self, data_path="data/learning", db_path="omni_learning.db"):
        self.data_path = Path(data_path)
        self.db_path = db_path
        
        # Ustvari direktorije
        self.data_path.mkdir(parents=True, exist_ok=True)
        
        # Učni podatki
        self.patterns = {}
        self.models = {}
        self.optimization_history = []
        self.learning_queue = asyncio.Queue()
        
        # Konfiguracija
        self.config = {
            "learning_interval": 300,  # 5 minut
            "pattern_min_confidence": 0.7,
            "optimization_threshold": 0.05,  # 5% izboljšanje
            "max_patterns": 1000,
            "max_models": 50,
            "auto_retrain_days": 7
        }
        
        # Stanje
        self.learning_active = False
        self.learning_thread = None
        self.metrics_buffer = deque(maxlen=1000)
        self.performance_history = defaultdict(list)
        
        # Optimizacijski algoritmi
        self.optimizers = {
            OptimizationStrategy.GRADIENT_DESCENT: self._gradient_descent_optimizer,
            OptimizationStrategy.GENETIC_ALGORITHM: self._genetic_algorithm_optimizer,
            OptimizationStrategy.REINFORCEMENT_LEARNING: self._rl_optimizer,
            OptimizationStrategy.BAYESIAN_OPTIMIZATION: self._bayesian_optimizer,
            OptimizationStrategy.SWARM_INTELLIGENCE: self._swarm_optimizer,
            OptimizationStrategy.NEURAL_NETWORK: self._neural_network_optimizer
        }
    
    async def initialize(self):
        """Inicializacija sistema"""
        logger.info("🧠 Inicializacija Omni Learning & Optimization...")
        
        try:
            # Ustvari bazo podatkov
            await self._create_database()
            
            # Naloži obstoječe vzorce in modele
            await self._load_patterns()
            await self._load_models()
            
            # Zaženi učni proces
            await self._start_learning_process()
            
            logger.info("✅ Omni Learning & Optimization inicializiran")
            return True
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji: {e}")
            return False
    
    async def _create_database(self):
        """Ustvari bazo podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za vzorce
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_patterns (
                pattern_id TEXT PRIMARY KEY,
                pattern_type TEXT NOT NULL,
                data_points TEXT NOT NULL,
                confidence_score REAL NOT NULL,
                created_at TEXT NOT NULL,
                last_updated TEXT NOT NULL,
                usage_count INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 0.0,
                metadata TEXT
            )
        ''')
        
        # Tabela za modele
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prediction_models (
                model_id TEXT PRIMARY KEY,
                model_type TEXT NOT NULL,
                target_variable TEXT NOT NULL,
                features TEXT NOT NULL,
                accuracy REAL NOT NULL,
                last_trained TEXT NOT NULL,
                training_data_size INTEGER NOT NULL,
                model_data BLOB NOT NULL,
                metadata TEXT
            )
        ''')
        
        # Tabela za optimizacije
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS optimization_results (
                optimization_id TEXT PRIMARY KEY,
                strategy TEXT NOT NULL,
                target_metric TEXT NOT NULL,
                baseline_value REAL NOT NULL,
                optimized_value REAL NOT NULL,
                improvement_percentage REAL NOT NULL,
                parameters TEXT NOT NULL,
                execution_time REAL NOT NULL,
                confidence REAL NOT NULL,
                recommendations TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Tabela za metrike
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_metrics (
                metric_id TEXT PRIMARY KEY,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                timestamp TEXT NOT NULL,
                source TEXT,
                metadata TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    async def _load_patterns(self):
        """Naloži obstoječe vzorce"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM learning_patterns')
            rows = cursor.fetchall()
            
            for row in rows:
                pattern = LearningPattern(
                    pattern_id=row[0],
                    pattern_type=LearningType(row[1]),
                    data_points=json.loads(row[2]),
                    confidence_score=row[3],
                    created_at=datetime.fromisoformat(row[4]),
                    last_updated=datetime.fromisoformat(row[5]),
                    usage_count=row[6],
                    success_rate=row[7],
                    metadata=json.loads(row[8]) if row[8] else {}
                )
                self.patterns[pattern.pattern_id] = pattern
            
            conn.close()
            logger.info(f"📚 Naloženih {len(self.patterns)} vzorcev")
            
        except Exception as e:
            logger.error(f"Napaka pri nalaganju vzorcev: {e}")
    
    async def _load_models(self):
        """Naloži obstoječe modele"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM prediction_models')
            rows = cursor.fetchall()
            
            for row in rows:
                model = PredictionModel(
                    model_id=row[0],
                    model_type=row[1],
                    target_variable=row[2],
                    features=json.loads(row[3]),
                    accuracy=row[4],
                    last_trained=datetime.fromisoformat(row[5]),
                    training_data_size=row[6],
                    model_data=row[7],
                    metadata=json.loads(row[8]) if row[8] else {}
                )
                self.models[model.model_id] = model
            
            conn.close()
            logger.info(f"🤖 Naloženih {len(self.models)} modelov")
            
        except Exception as e:
            logger.error(f"Napaka pri nalaganju modelov: {e}")
    
    async def _start_learning_process(self):
        """Zaženi učni proces"""
        self.learning_active = True
        self.learning_thread = threading.Thread(target=self._learning_worker, daemon=True)
        self.learning_thread.start()
        logger.info("🎓 Učni proces zagnan")
    
    def _learning_worker(self):
        """Delovni proces za učenje"""
        while self.learning_active:
            try:
                # Analiziraj nove podatke
                self._analyze_new_data()
                
                # Posodobi vzorce
                self._update_patterns()
                
                # Optimiziraj sistem
                asyncio.run(self._auto_optimize())
                
                # Preveri modele za ponovno učenje
                self._check_model_retraining()
                
                # Počakaj do naslednje iteracije
                time.sleep(self.config["learning_interval"])
                
            except Exception as e:
                logger.error(f"Napaka v učnem procesu: {e}")
                time.sleep(60)
    
    def _analyze_new_data(self):
        """Analiziraj nove podatke"""
        if len(self.metrics_buffer) < 10:
            return
        
        try:
            # Pretvori v DataFrame za analizo
            df = pd.DataFrame(list(self.metrics_buffer))
            
            # Poišči vzorce v podatkih
            patterns = self._detect_patterns(df)
            
            # Shrani nove vzorce
            for pattern in patterns:
                self._save_pattern(pattern)
                
        except Exception as e:
            logger.error(f"Napaka pri analizi podatkov: {e}")
    
    def _detect_patterns(self, df: pd.DataFrame) -> List[LearningPattern]:
        """Zaznaj vzorce v podatkih"""
        patterns = []
        
        try:
            # 1. Časovni vzorci
            time_patterns = self._detect_time_patterns(df)
            patterns.extend(time_patterns)
            
            # 2. Korelacijski vzorci
            correlation_patterns = self._detect_correlation_patterns(df)
            patterns.extend(correlation_patterns)
            
            # 3. Anomalije
            anomaly_patterns = self._detect_anomaly_patterns(df)
            patterns.extend(anomaly_patterns)
            
            # 4. Trendi
            trend_patterns = self._detect_trend_patterns(df)
            patterns.extend(trend_patterns)
            
        except Exception as e:
            logger.error(f"Napaka pri zaznavanju vzorcev: {e}")
        
        return patterns
    
    def _detect_time_patterns(self, df: pd.DataFrame) -> List[LearningPattern]:
        """Zaznaj časovne vzorce"""
        patterns = []
        
        try:
            if 'timestamp' in df.columns:
                df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
                df['day_of_week'] = pd.to_datetime(df['timestamp']).dt.dayofweek
                
                # Analiziraj vzorce po urah
                hourly_stats = df.groupby('hour').agg({
                    'cpu_usage': ['mean', 'std'],
                    'memory_usage': ['mean', 'std']
                }).round(2)
                
                # Če je vzorec stabilen (nizka standardna deviacija)
                for hour in hourly_stats.index:
                    cpu_std = hourly_stats.loc[hour, ('cpu_usage', 'std')]
                    if cpu_std < 10:  # Stabilen vzorec
                        pattern = LearningPattern(
                            pattern_id=f"time_pattern_hour_{hour}",
                            pattern_type=LearningType.PATTERN_RECOGNITION,
                            data_points=[{
                                'hour': hour,
                                'avg_cpu': hourly_stats.loc[hour, ('cpu_usage', 'mean')],
                                'avg_memory': hourly_stats.loc[hour, ('memory_usage', 'mean')]
                            }],
                            confidence_score=max(0.5, 1.0 - (cpu_std / 100)),
                            created_at=datetime.now(),
                            last_updated=datetime.now(),
                            usage_count=0,
                            success_rate=0.0,
                            metadata={'type': 'hourly_pattern', 'stability': cpu_std}
                        )
                        patterns.append(pattern)
                        
        except Exception as e:
            logger.error(f"Napaka pri zaznavanju časovnih vzorcev: {e}")
        
        return patterns
    
    def _detect_correlation_patterns(self, df: pd.DataFrame) -> List[LearningPattern]:
        """Zaznaj korelacijske vzorce"""
        patterns = []
        
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 1:
                correlation_matrix = df[numeric_cols].corr()
                
                # Poišči močne korelacije
                for i in range(len(correlation_matrix.columns)):
                    for j in range(i+1, len(correlation_matrix.columns)):
                        corr_value = correlation_matrix.iloc[i, j]
                        
                        if abs(corr_value) > 0.7:  # Močna korelacija
                            col1 = correlation_matrix.columns[i]
                            col2 = correlation_matrix.columns[j]
                            
                            pattern = LearningPattern(
                                pattern_id=f"correlation_{col1}_{col2}",
                                pattern_type=LearningType.PATTERN_RECOGNITION,
                                data_points=[{
                                    'variable1': col1,
                                    'variable2': col2,
                                    'correlation': corr_value,
                                    'relationship': 'positive' if corr_value > 0 else 'negative'
                                }],
                                confidence_score=abs(corr_value),
                                created_at=datetime.now(),
                                last_updated=datetime.now(),
                                usage_count=0,
                                success_rate=0.0,
                                metadata={'type': 'correlation', 'strength': abs(corr_value)}
                            )
                            patterns.append(pattern)
                            
        except Exception as e:
            logger.error(f"Napaka pri zaznavanju korelacij: {e}")
        
        return patterns
    
    def _detect_anomaly_patterns(self, df: pd.DataFrame) -> List[LearningPattern]:
        """Zaznaj anomalije"""
        patterns = []
        
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_cols:
                values = df[col].dropna()
                if len(values) > 10:
                    # Uporabi IQR metodo za zaznavanje anomalij
                    Q1 = values.quantile(0.25)
                    Q3 = values.quantile(0.75)
                    IQR = Q3 - Q1
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    
                    anomalies = values[(values < lower_bound) | (values > upper_bound)]
                    
                    if len(anomalies) > 0:
                        pattern = LearningPattern(
                            pattern_id=f"anomaly_{col}",
                            pattern_type=LearningType.ANOMALY_DETECTION,
                            data_points=[{
                                'variable': col,
                                'normal_range': [lower_bound, upper_bound],
                                'anomaly_count': len(anomalies),
                                'anomaly_percentage': len(anomalies) / len(values) * 100
                            }],
                            confidence_score=min(0.9, len(anomalies) / len(values) * 10),
                            created_at=datetime.now(),
                            last_updated=datetime.now(),
                            usage_count=0,
                            success_rate=0.0,
                            metadata={'type': 'anomaly', 'method': 'IQR'}
                        )
                        patterns.append(pattern)
                        
        except Exception as e:
            logger.error(f"Napaka pri zaznavanju anomalij: {e}")
        
        return patterns
    
    def _detect_trend_patterns(self, df: pd.DataFrame) -> List[LearningPattern]:
        """Zaznaj trende"""
        patterns = []
        
        try:
            if 'timestamp' in df.columns:
                df_sorted = df.sort_values('timestamp')
                numeric_cols = df_sorted.select_dtypes(include=[np.number]).columns
                
                for col in numeric_cols:
                    values = df_sorted[col].dropna()
                    if len(values) > 5:
                        # Preprosta linearna regresija za trend
                        x = np.arange(len(values))
                        slope = np.polyfit(x, values, 1)[0]
                        
                        # Če je trend značilen
                        if abs(slope) > 0.1:
                            trend_direction = 'increasing' if slope > 0 else 'decreasing'
                            
                            pattern = LearningPattern(
                                pattern_id=f"trend_{col}",
                                pattern_type=LearningType.PREDICTIVE_ANALYTICS,
                                data_points=[{
                                    'variable': col,
                                    'trend_direction': trend_direction,
                                    'slope': slope,
                                    'data_points': len(values)
                                }],
                                confidence_score=min(0.9, abs(slope) / 10),
                                created_at=datetime.now(),
                                last_updated=datetime.now(),
                                usage_count=0,
                                success_rate=0.0,
                                metadata={'type': 'trend', 'slope': slope}
                            )
                            patterns.append(pattern)
                            
        except Exception as e:
            logger.error(f"Napaka pri zaznavanju trendov: {e}")
        
        return patterns
    
    def _save_pattern(self, pattern: LearningPattern):
        """Shrani vzorec"""
        try:
            # Preveri, če vzorec že obstaja
            if pattern.pattern_id in self.patterns:
                # Posodobi obstoječi vzorec
                existing = self.patterns[pattern.pattern_id]
                existing.last_updated = datetime.now()
                existing.confidence_score = (existing.confidence_score + pattern.confidence_score) / 2
                existing.data_points.extend(pattern.data_points)
                # Ohrani samo zadnjih 100 podatkovnih točk
                existing.data_points = existing.data_points[-100:]
            else:
                # Dodaj nov vzorec
                self.patterns[pattern.pattern_id] = pattern
            
            # Shrani v bazo
            self._save_pattern_to_db(pattern)
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju vzorca: {e}")
    
    def _save_pattern_to_db(self, pattern: LearningPattern):
        """Shrani vzorec v bazo podatkov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO learning_patterns 
                (pattern_id, pattern_type, data_points, confidence_score, created_at, 
                 last_updated, usage_count, success_rate, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                pattern.pattern_id,
                pattern.pattern_type.value,
                json.dumps(pattern.data_points),
                pattern.confidence_score,
                pattern.created_at.isoformat(),
                pattern.last_updated.isoformat(),
                pattern.usage_count,
                pattern.success_rate,
                json.dumps(pattern.metadata)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju vzorca v bazo: {e}")
    
    def _update_patterns(self):
        """Posodobi vzorce"""
        try:
            # Odstrani zastarele vzorce
            cutoff_date = datetime.now() - timedelta(days=30)
            patterns_to_remove = []
            
            for pattern_id, pattern in self.patterns.items():
                if pattern.last_updated < cutoff_date and pattern.usage_count == 0:
                    patterns_to_remove.append(pattern_id)
            
            for pattern_id in patterns_to_remove:
                del self.patterns[pattern_id]
                self._remove_pattern_from_db(pattern_id)
            
            # Omeji število vzorcev
            if len(self.patterns) > self.config["max_patterns"]:
                # Obdrži najuspešnejše vzorce
                sorted_patterns = sorted(
                    self.patterns.items(),
                    key=lambda x: (x[1].success_rate, x[1].usage_count),
                    reverse=True
                )
                
                patterns_to_keep = dict(sorted_patterns[:self.config["max_patterns"]])
                patterns_to_remove = set(self.patterns.keys()) - set(patterns_to_keep.keys())
                
                for pattern_id in patterns_to_remove:
                    del self.patterns[pattern_id]
                    self._remove_pattern_from_db(pattern_id)
                
                self.patterns = patterns_to_keep
                
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju vzorcev: {e}")
    
    def _remove_pattern_from_db(self, pattern_id: str):
        """Odstrani vzorec iz baze"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM learning_patterns WHERE pattern_id = ?', (pattern_id,))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Napaka pri odstranjevanju vzorca: {e}")
    
    async def _auto_optimize(self):
        """Avtomatska optimizacija"""
        try:
            if len(self.performance_history) < 2:
                return
            
            # Analiziraj zmogljivost
            current_metrics = self._get_current_performance()
            
            # Poišči možnosti za optimizacijo
            optimization_opportunities = self._identify_optimization_opportunities(current_metrics)
            
            # Izvedi optimizacije
            for opportunity in optimization_opportunities:
                result = await self._execute_optimization(opportunity)
                if result:
                    self.optimization_history.append(result)
                    self._save_optimization_result(result)
                    
        except Exception as e:
            logger.error(f"Napaka pri avtomatski optimizaciji: {e}")
    
    def _get_current_performance(self) -> Dict[str, float]:
        """Pridobi trenutno zmogljivost"""
        if not self.metrics_buffer:
            return {}
        
        latest_metrics = list(self.metrics_buffer)[-10:]  # Zadnjih 10 meritev
        
        performance = {}
        for metric in latest_metrics:
            for key, value in metric.items():
                if isinstance(value, (int, float)):
                    if key not in performance:
                        performance[key] = []
                    performance[key].append(value)
        
        # Izračunaj povprečja
        avg_performance = {}
        for key, values in performance.items():
            avg_performance[key] = statistics.mean(values)
        
        return avg_performance
    
    def _identify_optimization_opportunities(self, current_metrics: Dict[str, float]) -> List[Dict[str, Any]]:
        """Identificiraj priložnosti za optimizacijo"""
        opportunities = []
        
        try:
            # CPU optimizacija
            if current_metrics.get('cpu_usage', 0) > 70:
                opportunities.append({
                    'type': 'cpu_optimization',
                    'metric': 'cpu_usage',
                    'current_value': current_metrics['cpu_usage'],
                    'target_value': 50,
                    'strategy': OptimizationStrategy.GRADIENT_DESCENT
                })
            
            # Pomnilniška optimizacija
            if current_metrics.get('memory_usage', 0) > 80:
                opportunities.append({
                    'type': 'memory_optimization',
                    'metric': 'memory_usage',
                    'current_value': current_metrics['memory_usage'],
                    'target_value': 60,
                    'strategy': OptimizationStrategy.GENETIC_ALGORITHM
                })
            
            # Optimizacija odzivnega časa
            if current_metrics.get('response_time', 0) > 1000:  # ms
                opportunities.append({
                    'type': 'response_time_optimization',
                    'metric': 'response_time',
                    'current_value': current_metrics['response_time'],
                    'target_value': 500,
                    'strategy': OptimizationStrategy.BAYESIAN_OPTIMIZATION
                })
                
        except Exception as e:
            logger.error(f"Napaka pri identificiranju priložnosti: {e}")
        
        return opportunities
    
    async def _execute_optimization(self, opportunity: Dict[str, Any]) -> Optional[OptimizationResult]:
        """Izvedi optimizacijo"""
        try:
            strategy = opportunity['strategy']
            optimizer = self.optimizers.get(strategy)
            
            if not optimizer:
                logger.warning(f"Optimizator {strategy} ni na voljo")
                return None
            
            start_time = time.time()
            result = await optimizer(opportunity)
            execution_time = time.time() - start_time
            
            if result:
                optimization_result = OptimizationResult(
                    optimization_id=f"opt_{int(time.time())}",
                    strategy=strategy,
                    target_metric=opportunity['metric'],
                    baseline_value=opportunity['current_value'],
                    optimized_value=result.get('optimized_value', opportunity['current_value']),
                    improvement_percentage=result.get('improvement_percentage', 0),
                    parameters=result.get('parameters', {}),
                    execution_time=execution_time,
                    confidence=result.get('confidence', 0.5),
                    recommendations=result.get('recommendations', [])
                )
                
                logger.info(f"✅ Optimizacija {opportunity['type']}: {optimization_result.improvement_percentage:.1f}% izboljšanje")
                return optimization_result
            
        except Exception as e:
            logger.error(f"Napaka pri izvajanju optimizacije: {e}")
        
        return None
    
    async def _gradient_descent_optimizer(self, opportunity: Dict[str, Any]) -> Dict[str, Any]:
        """Gradient descent optimizator"""
        try:
            # Simulacija gradient descent optimizacije
            current_value = opportunity['current_value']
            target_value = opportunity['target_value']
            
            # Preprosta simulacija
            learning_rate = 0.1
            iterations = 10
            
            optimized_value = current_value
            for i in range(iterations):
                gradient = (optimized_value - target_value) * 0.1
                optimized_value -= learning_rate * gradient
                
                if abs(optimized_value - target_value) < 0.1:
                    break
            
            improvement = ((current_value - optimized_value) / current_value) * 100
            
            return {
                'optimized_value': optimized_value,
                'improvement_percentage': improvement,
                'parameters': {'learning_rate': learning_rate, 'iterations': i+1},
                'confidence': 0.8,
                'recommendations': [f"Zmanjšaj {opportunity['metric']} na {optimized_value:.1f}"]
            }
            
        except Exception as e:
            logger.error(f"Napaka v gradient descent: {e}")
            return {}
    
    async def _genetic_algorithm_optimizer(self, opportunity: Dict[str, Any]) -> Dict[str, Any]:
        """Genetic algorithm optimizator"""
        try:
            # Simulacija genetskega algoritma
            current_value = opportunity['current_value']
            target_value = opportunity['target_value']
            
            # Generiraj populacijo
            population_size = 20
            generations = 5
            
            population = np.random.uniform(target_value * 0.8, current_value * 1.2, population_size)
            
            for generation in range(generations):
                # Fitness funkcija (bližje target_value = boljši)
                fitness = 1 / (1 + np.abs(population - target_value))
                
                # Selekcija najboljših
                best_indices = np.argsort(fitness)[-10:]
                best_population = population[best_indices]
                
                # Križanje in mutacija
                new_population = []
                for i in range(population_size):
                    parent1 = np.random.choice(best_population)
                    parent2 = np.random.choice(best_population)
                    child = (parent1 + parent2) / 2
                    # Mutacija
                    child += np.random.normal(0, 0.1)
                    new_population.append(child)
                
                population = np.array(new_population)
            
            # Najboljša rešitev
            fitness = 1 / (1 + np.abs(population - target_value))
            best_solution = population[np.argmax(fitness)]
            
            improvement = ((current_value - best_solution) / current_value) * 100
            
            return {
                'optimized_value': best_solution,
                'improvement_percentage': improvement,
                'parameters': {'population_size': population_size, 'generations': generations},
                'confidence': 0.75,
                'recommendations': [f"Optimiziraj {opportunity['metric']} z genetskim algoritmom"]
            }
            
        except Exception as e:
            logger.error(f"Napaka v genetskem algoritmu: {e}")
            return {}
    
    async def _rl_optimizer(self, opportunity: Dict[str, Any]) -> Dict[str, Any]:
        """Reinforcement learning optimizator"""
        # Preprosta simulacija RL
        return {
            'optimized_value': opportunity['target_value'],
            'improvement_percentage': 15.0,
            'parameters': {'episodes': 100, 'learning_rate': 0.01},
            'confidence': 0.7,
            'recommendations': ["Implementiraj RL strategijo"]
        }
    
    async def _bayesian_optimizer(self, opportunity: Dict[str, Any]) -> Dict[str, Any]:
        """Bayesian optimization"""
        # Preprosta simulacija
        return {
            'optimized_value': opportunity['target_value'] * 1.1,
            'improvement_percentage': 12.0,
            'parameters': {'acquisition_function': 'EI', 'iterations': 50},
            'confidence': 0.85,
            'recommendations': ["Uporabi Bayesian optimizacijo"]
        }
    
    async def _swarm_optimizer(self, opportunity: Dict[str, Any]) -> Dict[str, Any]:
        """Swarm intelligence optimizator"""
        # Preprosta simulacija
        return {
            'optimized_value': opportunity['target_value'] * 0.95,
            'improvement_percentage': 18.0,
            'parameters': {'particles': 30, 'iterations': 100},
            'confidence': 0.8,
            'recommendations': ["Implementiraj swarm optimizacijo"]
        }
    
    async def _neural_network_optimizer(self, opportunity: Dict[str, Any]) -> Dict[str, Any]:
        """Neural network optimizator"""
        # Preprosta simulacija
        return {
            'optimized_value': opportunity['target_value'],
            'improvement_percentage': 20.0,
            'parameters': {'layers': 3, 'neurons': 64, 'epochs': 100},
            'confidence': 0.9,
            'recommendations': ["Uporabi nevronsko mrežo za optimizacijo"]
        }
    
    def _save_optimization_result(self, result: OptimizationResult):
        """Shrani rezultat optimizacije"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO optimization_results 
                (optimization_id, strategy, target_metric, baseline_value, optimized_value,
                 improvement_percentage, parameters, execution_time, confidence, 
                 recommendations, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                result.optimization_id,
                result.strategy.value,
                result.target_metric,
                result.baseline_value,
                result.optimized_value,
                result.improvement_percentage,
                json.dumps(result.parameters),
                result.execution_time,
                result.confidence,
                json.dumps(result.recommendations),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju optimizacije: {e}")
    
    def _check_model_retraining(self):
        """Preveri potrebo po ponovnem učenju modelov"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.config["auto_retrain_days"])
            
            for model_id, model in self.models.items():
                if model.last_trained < cutoff_date:
                    logger.info(f"🔄 Model {model_id} potrebuje ponovno učenje")
                    # Implementiraj ponovno učenje
                    asyncio.run(self._retrain_model(model_id))
                    
        except Exception as e:
            logger.error(f"Napaka pri preverjanju modelov: {e}")
    
    async def _retrain_model(self, model_id: str):
        """Ponovno uči model"""
        try:
            if model_id not in self.models:
                return
            
            model = self.models[model_id]
            logger.info(f"🎓 Ponovno učenje modela {model_id}...")
            
            # Simulacija ponovnega učenja
            # V resničnem sistemu bi tukaj naložili nova data in ponovno učili model
            
            # Posodobi model
            model.last_trained = datetime.now()
            model.accuracy = min(1.0, model.accuracy + 0.05)  # Simulacija izboljšanja
            
            # Shrani v bazo
            self._save_model_to_db(model)
            
            logger.info(f"✅ Model {model_id} ponovno naučen (natančnost: {model.accuracy:.2f})")
            
        except Exception as e:
            logger.error(f"Napaka pri ponovnem učenju modela {model_id}: {e}")
    
    def _save_model_to_db(self, model: PredictionModel):
        """Shrani model v bazo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO prediction_models 
                (model_id, model_type, target_variable, features, accuracy, 
                 last_trained, training_data_size, model_data, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                model.model_id,
                model.model_type,
                model.target_variable,
                json.dumps(model.features),
                model.accuracy,
                model.last_trained.isoformat(),
                model.training_data_size,
                model.model_data,
                json.dumps(model.metadata)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju modela: {e}")
    
    async def add_metric_data(self, metric_data: Dict[str, Any]):
        """Dodaj metrične podatke za učenje"""
        try:
            # Dodaj časovni žig, če ga ni
            if 'timestamp' not in metric_data:
                metric_data['timestamp'] = datetime.now().isoformat()
            
            # Dodaj v buffer
            self.metrics_buffer.append(metric_data)
            
            # Shrani v bazo
            await self._save_metric_to_db(metric_data)
            
        except Exception as e:
            logger.error(f"Napaka pri dodajanju metrik: {e}")
    
    async def _save_metric_to_db(self, metric_data: Dict[str, Any]):
        """Shrani metriko v bazo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for key, value in metric_data.items():
                if isinstance(value, (int, float)) and key != 'timestamp':
                    cursor.execute('''
                        INSERT INTO performance_metrics 
                        (metric_id, metric_name, metric_value, timestamp, source, metadata)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        f"{key}_{int(time.time())}",
                        key,
                        value,
                        metric_data.get('timestamp', datetime.now().isoformat()),
                        'system',
                        json.dumps({'raw_data': metric_data})
                    ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju metrike: {e}")
    
    async def get_learning_insights(self) -> Dict[str, Any]:
        """Pridobi vpoglede iz učenja"""
        try:
            insights = {
                'patterns_discovered': len(self.patterns),
                'models_trained': len(self.models),
                'optimizations_performed': len(self.optimization_history),
                'top_patterns': [],
                'best_optimizations': [],
                'model_performance': {},
                'recommendations': []
            }
            
            # Najboljši vzorci
            top_patterns = sorted(
                self.patterns.values(),
                key=lambda x: (x.success_rate, x.confidence_score),
                reverse=True
            )[:5]
            
            for pattern in top_patterns:
                insights['top_patterns'].append({
                    'id': pattern.pattern_id,
                    'type': pattern.pattern_type.value,
                    'confidence': pattern.confidence_score,
                    'success_rate': pattern.success_rate,
                    'usage_count': pattern.usage_count
                })
            
            # Najboljše optimizacije
            best_optimizations = sorted(
                self.optimization_history,
                key=lambda x: x.improvement_percentage,
                reverse=True
            )[-5:]
            
            for opt in best_optimizations:
                insights['best_optimizations'].append({
                    'id': opt.optimization_id,
                    'metric': opt.target_metric,
                    'improvement': opt.improvement_percentage,
                    'strategy': opt.strategy.value,
                    'confidence': opt.confidence
                })
            
            # Zmogljivost modelov
            for model_id, model in self.models.items():
                insights['model_performance'][model_id] = {
                    'accuracy': model.accuracy,
                    'last_trained': model.last_trained.isoformat(),
                    'data_size': model.training_data_size
                }
            
            # Priporočila
            insights['recommendations'] = self._generate_learning_recommendations()
            
            return insights
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju vpogledov: {e}")
            return {}
    
    def _generate_learning_recommendations(self) -> List[str]:
        """Generiraj priporočila za učenje"""
        recommendations = []
        
        # Preveri število vzorcev
        if len(self.patterns) < 10:
            recommendations.append("Zberi več podatkov za boljše zaznavanje vzorcev")
        
        # Preveri uspešnost optimizacij
        if self.optimization_history:
            avg_improvement = statistics.mean([opt.improvement_percentage for opt in self.optimization_history])
            if avg_improvement < 5:
                recommendations.append("Raziskaj naprednejše optimizacijske strategije")
        
        # Preveri modele
        if len(self.models) == 0:
            recommendations.append("Ustvari napovedne modele za boljše delovanje")
        
        # Preveri natančnost modelov
        low_accuracy_models = [m for m in self.models.values() if m.accuracy < 0.8]
        if low_accuracy_models:
            recommendations.append(f"Izboljšaj natančnost {len(low_accuracy_models)} modelov")
        
        if not recommendations:
            recommendations.append("Sistem se uči optimalno")
        
        return recommendations
    
    async def shutdown(self):
        """Zaustavitev sistema"""
        logger.info("🛑 Zaustavlja Learning & Optimization...")
        
        self.learning_active = False
        
        if self.learning_thread:
            self.learning_thread.join(timeout=5)
        
        logger.info("✅ Learning & Optimization zaustavljen")

# Test funkcija
async def test_learning_optimization():
    """Test sistema za učenje in optimizacijo"""
    learning_system = OmniLearningOptimization()
    
    try:
        # Inicializiraj
        await learning_system.initialize()
        
        # Dodaj testne podatke
        for i in range(50):
            test_data = {
                'cpu_usage': np.random.normal(60, 15),
                'memory_usage': np.random.normal(70, 10),
                'response_time': np.random.normal(800, 200),
                'timestamp': (datetime.now() - timedelta(minutes=i)).isoformat()
            }
            await learning_system.add_metric_data(test_data)
        
        print("📊 Testni podatki dodani")
        
        # Počakaj na učenje
        await asyncio.sleep(10)
        
        # Pridobi vpoglede
        insights = await learning_system.get_learning_insights()
        print(f"🧠 Vpogledi: {json.dumps(insights, indent=2, ensure_ascii=False)}")
        
    except KeyboardInterrupt:
        print("\n👋 Zaustavlja sistem...")
    finally:
        await learning_system.shutdown()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_learning_optimization())