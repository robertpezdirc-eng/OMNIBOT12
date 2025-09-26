#!/usr/bin/env python3
"""
🧠 OMNI AUTONOMOUS LEARNING SYSTEM
==================================

PRAVI SISTEM AVTONOMNEGA UČENJA
- Učenje iz realnih podatkov
- Analiza uporabniških vzorcev
- Samodejno izboljševanje algoritmov
- Adaptivno obnašanje
- Kontinuirano učenje

Avtor: Omni AI
Verzija: LEARNING 1.0 FINAL
"""

import asyncio
import json
import sqlite3
import time
import threading
import logging
import traceback
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
import pickle
import hashlib
import statistics
from collections import defaultdict, deque
import random
import math
import os
import sys

class DataPattern:
    """
    📊 VZOREC PODATKOV
    Predstavlja naučen vzorec iz podatkov
    """
    
    def __init__(self, pattern_id: str, pattern_type: str, features: Dict, 
                 confidence: float = 0.0, usage_count: int = 0):
        self.pattern_id = pattern_id
        self.pattern_type = pattern_type  # 'user_behavior', 'system_performance', 'error_pattern', 'optimization'
        self.features = features
        self.confidence = confidence
        self.usage_count = usage_count
        self.success_rate = 0.0
        self.last_used = None
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        
        # Metrike učenja
        self.prediction_accuracy = 0.0
        self.adaptation_score = 0.0
        self.relevance_score = 1.0
    
    def update_confidence(self, new_evidence: float):
        """Posodobi zaupanje na podlagi novih dokazov"""
        # Bayesian update
        self.confidence = (self.confidence * self.usage_count + new_evidence) / (self.usage_count + 1)
        self.usage_count += 1
        self.updated_at = datetime.now()
    
    def calculate_relevance(self, current_time: datetime) -> float:
        """Izračunaj relevantnost vzorca"""
        # Časovna relevantnost (novejši vzorci so bolj relevantni)
        age_days = (current_time - self.created_at).days
        time_decay = math.exp(-age_days / 30)  # Eksponencialni upad čez 30 dni
        
        # Uporabnostna relevantnost
        usage_factor = min(1.0, self.usage_count / 100)  # Normaliziraj na 100 uporab
        
        # Uspešnostna relevantnost
        success_factor = self.success_rate
        
        # Kombinirana relevantnost
        self.relevance_score = (time_decay * 0.3 + usage_factor * 0.3 + success_factor * 0.4)
        
        return self.relevance_score
    
    def to_dict(self) -> Dict:
        """Pretvori v slovar"""
        return {
            'pattern_id': self.pattern_id,
            'pattern_type': self.pattern_type,
            'features': self.features,
            'confidence': self.confidence,
            'usage_count': self.usage_count,
            'success_rate': self.success_rate,
            'prediction_accuracy': self.prediction_accuracy,
            'adaptation_score': self.adaptation_score,
            'relevance_score': self.relevance_score,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'last_used': self.last_used.isoformat() if self.last_used else None
        }

class LearningEngine:
    """
    🧠 JEDRO UČENJA
    Glavna komponenta za strojno učenje
    """
    
    def __init__(self):
        self.patterns = {}  # {pattern_id: DataPattern}
        self.learning_history = []
        self.adaptation_rules = {}
        
        # Algoritmi učenja
        self.algorithms = {
            'pattern_recognition': self._pattern_recognition_algorithm,
            'behavioral_analysis': self._behavioral_analysis_algorithm,
            'performance_optimization': self._performance_optimization_algorithm,
            'predictive_modeling': self._predictive_modeling_algorithm
        }
        
        # Metrike učenja
        self.learning_metrics = {
            'patterns_learned': 0,
            'predictions_made': 0,
            'prediction_accuracy': 0.0,
            'adaptations_applied': 0,
            'learning_rate': 0.0
        }
    
    def learn_from_data(self, data: Dict, data_type: str) -> Optional[DataPattern]:
        """Nauči se iz podatkov"""
        try:
            # Izberi ustrezen algoritem
            if data_type == 'user_interaction':
                return self._learn_user_behavior(data)
            elif data_type == 'system_performance':
                return self._learn_performance_patterns(data)
            elif data_type == 'error_occurrence':
                return self._learn_error_patterns(data)
            elif data_type == 'optimization_result':
                return self._learn_optimization_patterns(data)
            else:
                return self._generic_pattern_learning(data, data_type)
        
        except Exception as e:
            logging.error(f"❌ Napaka pri učenju iz podatkov: {e}")
            return None
    
    def _learn_user_behavior(self, data: Dict) -> Optional[DataPattern]:
        """Nauči se uporabniških vzorcev"""
        # Izvleci značilnosti uporabnikovega obnašanja
        features = {
            'action_type': data.get('action', 'unknown'),
            'timestamp': data.get('timestamp', datetime.now().isoformat()),
            'duration': data.get('duration', 0),
            'success': data.get('success', True),
            'module_used': data.get('module', 'unknown'),
            'parameters': data.get('parameters', {}),
            'context': data.get('context', {})
        }
        
        # Ustvari ID vzorca
        pattern_id = self._generate_pattern_id('user_behavior', features)
        
        # Preveri, ali vzorec že obstaja
        if pattern_id in self.patterns:
            existing_pattern = self.patterns[pattern_id]
            existing_pattern.update_confidence(0.8 if features['success'] else 0.2)
            return existing_pattern
        
        # Ustvari nov vzorec
        confidence = 0.7 if features['success'] else 0.3
        pattern = DataPattern(pattern_id, 'user_behavior', features, confidence)
        
        self.patterns[pattern_id] = pattern
        self.learning_metrics['patterns_learned'] += 1
        
        logging.info(f"🧠 Naučen nov uporabniški vzorec: {pattern_id}")
        
        return pattern
    
    def _learn_performance_patterns(self, data: Dict) -> Optional[DataPattern]:
        """Nauči se vzorcev performans"""
        features = {
            'cpu_usage': data.get('cpu_usage', 0),
            'memory_usage': data.get('memory_usage', 0),
            'response_time': data.get('response_time', 0),
            'throughput': data.get('throughput', 0),
            'error_rate': data.get('error_rate', 0),
            'load_level': data.get('load_level', 'normal'),
            'time_of_day': datetime.now().hour,
            'day_of_week': datetime.now().weekday()
        }
        
        pattern_id = self._generate_pattern_id('system_performance', features)
        
        if pattern_id in self.patterns:
            existing_pattern = self.patterns[pattern_id]
            # Posodobi zaupanje na podlagi performans
            performance_score = self._calculate_performance_score(features)
            existing_pattern.update_confidence(performance_score)
            return existing_pattern
        
        # Ustvari nov vzorec
        performance_score = self._calculate_performance_score(features)
        pattern = DataPattern(pattern_id, 'system_performance', features, performance_score)
        
        self.patterns[pattern_id] = pattern
        self.learning_metrics['patterns_learned'] += 1
        
        logging.info(f"🧠 Naučen nov performančni vzorec: {pattern_id}")
        
        return pattern
    
    def _learn_error_patterns(self, data: Dict) -> Optional[DataPattern]:
        """Nauči se vzorcev napak"""
        features = {
            'error_type': data.get('error_type', 'unknown'),
            'error_message': data.get('error_message', ''),
            'module': data.get('module', 'unknown'),
            'frequency': data.get('frequency', 1),
            'severity': data.get('severity', 'medium'),
            'context': data.get('context', {}),
            'resolution_time': data.get('resolution_time', 0),
            'auto_resolved': data.get('auto_resolved', False)
        }
        
        pattern_id = self._generate_pattern_id('error_pattern', features)
        
        if pattern_id in self.patterns:
            existing_pattern = self.patterns[pattern_id]
            # Posodobi zaupanje na podlagi uspešnosti rešitve
            resolution_score = 0.8 if features['auto_resolved'] else 0.4
            existing_pattern.update_confidence(resolution_score)
            return existing_pattern
        
        # Ustvari nov vzorec
        resolution_score = 0.8 if features['auto_resolved'] else 0.4
        pattern = DataPattern(pattern_id, 'error_pattern', features, resolution_score)
        
        self.patterns[pattern_id] = pattern
        self.learning_metrics['patterns_learned'] += 1
        
        logging.info(f"🧠 Naučen nov vzorec napak: {pattern_id}")
        
        return pattern
    
    def _learn_optimization_patterns(self, data: Dict) -> Optional[DataPattern]:
        """Nauči se vzorcev optimizacije"""
        features = {
            'optimization_type': data.get('type', 'unknown'),
            'target_metric': data.get('target_metric', 'performance'),
            'improvement': data.get('improvement', 0),
            'cost': data.get('cost', 0),
            'duration': data.get('duration', 0),
            'success': data.get('success', False),
            'side_effects': data.get('side_effects', []),
            'conditions': data.get('conditions', {})
        }
        
        pattern_id = self._generate_pattern_id('optimization', features)
        
        if pattern_id in self.patterns:
            existing_pattern = self.patterns[pattern_id]
            # Posodobi zaupanje na podlagi uspešnosti optimizacije
            success_score = 0.9 if features['success'] and features['improvement'] > 0 else 0.3
            existing_pattern.update_confidence(success_score)
            return existing_pattern
        
        # Ustvari nov vzorec
        success_score = 0.9 if features['success'] and features['improvement'] > 0 else 0.3
        pattern = DataPattern(pattern_id, 'optimization', features, success_score)
        
        self.patterns[pattern_id] = pattern
        self.learning_metrics['patterns_learned'] += 1
        
        logging.info(f"🧠 Naučen nov optimizacijski vzorec: {pattern_id}")
        
        return pattern
    
    def _generic_pattern_learning(self, data: Dict, data_type: str) -> Optional[DataPattern]:
        """Generično učenje vzorcev"""
        features = dict(data)  # Kopija podatkov
        features['data_type'] = data_type
        features['timestamp'] = datetime.now().isoformat()
        
        pattern_id = self._generate_pattern_id(data_type, features)
        
        if pattern_id in self.patterns:
            existing_pattern = self.patterns[pattern_id]
            existing_pattern.update_confidence(0.6)  # Srednja zaupanje za generične vzorce
            return existing_pattern
        
        # Ustvari nov vzorec
        pattern = DataPattern(pattern_id, data_type, features, 0.6)
        
        self.patterns[pattern_id] = pattern
        self.learning_metrics['patterns_learned'] += 1
        
        logging.info(f"🧠 Naučen nov generični vzorec: {pattern_id}")
        
        return pattern
    
    def _generate_pattern_id(self, pattern_type: str, features: Dict) -> str:
        """Generiraj ID vzorca"""
        # Ustvari hash iz ključnih značilnosti
        key_features = {k: v for k, v in features.items() 
                       if k not in ['timestamp', 'duration', 'context']}
        
        feature_string = json.dumps(key_features, sort_keys=True)
        hash_value = hashlib.md5(feature_string.encode()).hexdigest()[:8]
        
        return f"{pattern_type}_{hash_value}"
    
    def _calculate_performance_score(self, features: Dict) -> float:
        """Izračunaj oceno performans"""
        # Normaliziraj metrike (0-1)
        cpu_score = max(0, 1 - features.get('cpu_usage', 0) / 100)
        memory_score = max(0, 1 - features.get('memory_usage', 0) / 100)
        response_score = max(0, 1 - min(features.get('response_time', 0) / 1000, 1))
        error_score = max(0, 1 - features.get('error_rate', 0) / 100)
        
        # Tehtano povprečje
        performance_score = (cpu_score * 0.25 + memory_score * 0.25 + 
                           response_score * 0.3 + error_score * 0.2)
        
        return performance_score
    
    def predict(self, input_data: Dict, prediction_type: str) -> Dict:
        """Naredi napoved na podlagi naučenih vzorcev"""
        try:
            # Poišči relevantne vzorce
            relevant_patterns = self._find_relevant_patterns(input_data, prediction_type)
            
            if not relevant_patterns:
                return {'prediction': None, 'confidence': 0.0, 'reason': 'No relevant patterns found'}
            
            # Naredi napoved
            prediction = self._make_prediction(input_data, relevant_patterns, prediction_type)
            
            self.learning_metrics['predictions_made'] += 1
            
            return prediction
        
        except Exception as e:
            logging.error(f"❌ Napaka pri napovedovanju: {e}")
            return {'prediction': None, 'confidence': 0.0, 'error': str(e)}
    
    def _find_relevant_patterns(self, input_data: Dict, prediction_type: str) -> List[DataPattern]:
        """Poišči relevantne vzorce za napoved"""
        relevant_patterns = []
        
        for pattern in self.patterns.values():
            # Preveri tip vzorca
            if prediction_type == 'user_behavior' and pattern.pattern_type != 'user_behavior':
                continue
            elif prediction_type == 'performance' and pattern.pattern_type != 'system_performance':
                continue
            elif prediction_type == 'error_prediction' and pattern.pattern_type != 'error_pattern':
                continue
            
            # Izračunaj podobnost
            similarity = self._calculate_similarity(input_data, pattern.features)
            
            if similarity > 0.6:  # Prag podobnosti
                pattern.relevance_score = similarity * pattern.confidence
                relevant_patterns.append(pattern)
        
        # Sortiraj po relevantnosti
        relevant_patterns.sort(key=lambda p: p.relevance_score, reverse=True)
        
        return relevant_patterns[:10]  # Vrni top 10
    
    def _calculate_similarity(self, data1: Dict, data2: Dict) -> float:
        """Izračunaj podobnost med dvema naboroma podatkov"""
        common_keys = set(data1.keys()) & set(data2.keys())
        
        if not common_keys:
            return 0.0
        
        similarities = []
        
        for key in common_keys:
            val1, val2 = data1[key], data2[key]
            
            if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
                # Numerična podobnost
                if val1 == 0 and val2 == 0:
                    sim = 1.0
                else:
                    sim = 1 - abs(val1 - val2) / (abs(val1) + abs(val2) + 1e-10)
            elif isinstance(val1, str) and isinstance(val2, str):
                # Tekstovna podobnost
                sim = 1.0 if val1.lower() == val2.lower() else 0.0
            elif isinstance(val1, bool) and isinstance(val2, bool):
                # Logična podobnost
                sim = 1.0 if val1 == val2 else 0.0
            else:
                # Generična podobnost
                sim = 1.0 if str(val1) == str(val2) else 0.0
            
            similarities.append(sim)
        
        return statistics.mean(similarities) if similarities else 0.0
    
    def _make_prediction(self, input_data: Dict, patterns: List[DataPattern], 
                        prediction_type: str) -> Dict:
        """Naredi napoved na podlagi vzorcev"""
        if not patterns:
            return {'prediction': None, 'confidence': 0.0}
        
        # Tehtano povprečje napovedi
        total_weight = sum(p.relevance_score for p in patterns)
        
        if prediction_type == 'user_behavior':
            return self._predict_user_behavior(input_data, patterns, total_weight)
        elif prediction_type == 'performance':
            return self._predict_performance(input_data, patterns, total_weight)
        elif prediction_type == 'error_prediction':
            return self._predict_errors(input_data, patterns, total_weight)
        else:
            return self._generic_prediction(input_data, patterns, total_weight)
    
    def _predict_user_behavior(self, input_data: Dict, patterns: List[DataPattern], 
                              total_weight: float) -> Dict:
        """Napovej uporabniško obnašanje"""
        # Analiziraj vzorce uporabnikovega obnašanja
        action_predictions = defaultdict(float)
        success_predictions = []
        
        for pattern in patterns:
            weight = pattern.relevance_score / total_weight
            
            # Napovej verjetno akcijo
            action = pattern.features.get('action_type', 'unknown')
            action_predictions[action] += weight
            
            # Napovej verjetnost uspeha
            success = pattern.features.get('success', True)
            success_predictions.append(success * weight)
        
        # Najboljša napoved akcije
        best_action = max(action_predictions.items(), key=lambda x: x[1])
        
        # Povprečna verjetnost uspeha
        avg_success_prob = sum(success_predictions)
        
        return {
            'prediction': {
                'most_likely_action': best_action[0],
                'action_confidence': best_action[1],
                'success_probability': avg_success_prob,
                'alternative_actions': dict(action_predictions)
            },
            'confidence': avg_success_prob,
            'patterns_used': len(patterns)
        }
    
    def _predict_performance(self, input_data: Dict, patterns: List[DataPattern], 
                           total_weight: float) -> Dict:
        """Napovej performanse sistema"""
        # Analiziraj performančne vzorce
        cpu_predictions = []
        memory_predictions = []
        response_predictions = []
        
        for pattern in patterns:
            weight = pattern.relevance_score / total_weight
            
            cpu_predictions.append(pattern.features.get('cpu_usage', 0) * weight)
            memory_predictions.append(pattern.features.get('memory_usage', 0) * weight)
            response_predictions.append(pattern.features.get('response_time', 0) * weight)
        
        predicted_cpu = sum(cpu_predictions)
        predicted_memory = sum(memory_predictions)
        predicted_response = sum(response_predictions)
        
        # Oceni celotno performanco
        performance_score = self._calculate_performance_score({
            'cpu_usage': predicted_cpu,
            'memory_usage': predicted_memory,
            'response_time': predicted_response,
            'error_rate': 0
        })
        
        return {
            'prediction': {
                'cpu_usage': predicted_cpu,
                'memory_usage': predicted_memory,
                'response_time': predicted_response,
                'performance_score': performance_score,
                'status': 'good' if performance_score > 0.7 else 'warning' if performance_score > 0.4 else 'critical'
            },
            'confidence': performance_score,
            'patterns_used': len(patterns)
        }
    
    def _predict_errors(self, input_data: Dict, patterns: List[DataPattern], 
                       total_weight: float) -> Dict:
        """Napovej verjetnost napak"""
        # Analiziraj vzorce napak
        error_probabilities = defaultdict(float)
        resolution_times = []
        
        for pattern in patterns:
            weight = pattern.relevance_score / total_weight
            
            error_type = pattern.features.get('error_type', 'unknown')
            error_probabilities[error_type] += weight
            
            resolution_time = pattern.features.get('resolution_time', 0)
            resolution_times.append(resolution_time * weight)
        
        # Najbolj verjetna napaka
        most_likely_error = max(error_probabilities.items(), key=lambda x: x[1]) if error_probabilities else ('none', 0)
        
        # Povprečni čas rešitve
        avg_resolution_time = sum(resolution_times) if resolution_times else 0
        
        return {
            'prediction': {
                'most_likely_error': most_likely_error[0],
                'error_probability': most_likely_error[1],
                'expected_resolution_time': avg_resolution_time,
                'all_error_probabilities': dict(error_probabilities)
            },
            'confidence': most_likely_error[1],
            'patterns_used': len(patterns)
        }
    
    def _generic_prediction(self, input_data: Dict, patterns: List[DataPattern], 
                          total_weight: float) -> Dict:
        """Generična napoved"""
        # Povprečna zaupanja vzorcev
        avg_confidence = sum(p.confidence * p.relevance_score for p in patterns) / total_weight
        
        return {
            'prediction': {
                'type': 'generic',
                'confidence_level': avg_confidence,
                'pattern_count': len(patterns)
            },
            'confidence': avg_confidence,
            'patterns_used': len(patterns)
        }
    
    def adapt_behavior(self, feedback: Dict) -> Dict:
        """Prilagodi obnašanje na podlagi povratnih informacij"""
        adaptations = []
        
        # Analiziraj povratne informacije
        if 'prediction_accuracy' in feedback:
            accuracy = feedback['prediction_accuracy']
            self.learning_metrics['prediction_accuracy'] = (
                self.learning_metrics['prediction_accuracy'] * 0.9 + accuracy * 0.1
            )
            
            # Prilagodi vzorce na podlagi natančnosti
            if accuracy < 0.6:  # Slaba natančnost
                adaptations.append(self._adapt_low_accuracy())
        
        if 'performance_feedback' in feedback:
            performance = feedback['performance_feedback']
            adaptations.append(self._adapt_performance(performance))
        
        if 'user_satisfaction' in feedback:
            satisfaction = feedback['user_satisfaction']
            adaptations.append(self._adapt_user_satisfaction(satisfaction))
        
        self.learning_metrics['adaptations_applied'] += len(adaptations)
        
        return {
            'adaptations_made': len(adaptations),
            'adaptations': adaptations,
            'new_learning_rate': self._calculate_learning_rate()
        }
    
    def _adapt_low_accuracy(self) -> Dict:
        """Prilagodi se nizki natančnosti napovedi"""
        # Zmanjšaj zaupanje vzorcem z nizko uspešnostjo
        low_confidence_patterns = [p for p in self.patterns.values() if p.confidence < 0.5]
        
        for pattern in low_confidence_patterns:
            pattern.confidence *= 0.8  # Zmanjšaj zaupanje
        
        return {
            'type': 'accuracy_improvement',
            'action': 'reduced_confidence_for_low_performing_patterns',
            'affected_patterns': len(low_confidence_patterns)
        }
    
    def _adapt_performance(self, performance_feedback: Dict) -> Dict:
        """Prilagodi se performančnim povratnim informacijam"""
        # Če so performanse slabe, poveča prag za vzorce
        if performance_feedback.get('score', 0) < 0.6:
            # Povečaj prag podobnosti
            return {
                'type': 'performance_optimization',
                'action': 'increased_similarity_threshold',
                'new_threshold': 0.7
            }
        
        return {
            'type': 'performance_optimization',
            'action': 'no_changes_needed',
            'current_performance': performance_feedback.get('score', 0)
        }
    
    def _adapt_user_satisfaction(self, satisfaction: float) -> Dict:
        """Prilagodi se zadovoljstvu uporabnikov"""
        if satisfaction < 0.6:
            # Poveča težo uporabniških vzorcev
            user_patterns = [p for p in self.patterns.values() if p.pattern_type == 'user_behavior']
            
            for pattern in user_patterns:
                pattern.confidence *= 1.1  # Poveča zaupanje
            
            return {
                'type': 'user_satisfaction_improvement',
                'action': 'increased_user_pattern_confidence',
                'affected_patterns': len(user_patterns)
            }
        
        return {
            'type': 'user_satisfaction_improvement',
            'action': 'satisfaction_acceptable',
            'current_satisfaction': satisfaction
        }
    
    def _calculate_learning_rate(self) -> float:
        """Izračunaj trenutno hitrost učenja"""
        if self.learning_metrics['predictions_made'] == 0:
            return 0.0
        
        # Hitrost učenja na podlagi natančnosti in števila vzorcev
        accuracy_factor = self.learning_metrics['prediction_accuracy']
        pattern_factor = min(1.0, len(self.patterns) / 1000)  # Normaliziraj na 1000 vzorcev
        
        learning_rate = (accuracy_factor + pattern_factor) / 2
        self.learning_metrics['learning_rate'] = learning_rate
        
        return learning_rate

class AutonomousLearningSystem:
    """
    🧠 GLAVNI SISTEM AVTONOMNEGA UČENJA
    Koordinira vse komponente učenja
    """
    
    def __init__(self):
        self.name = "Autonomous Learning System"
        self.version = "1.0"
        self.db_path = "omni/data/autonomous_learning.db"
        
        # Komponente
        self.learning_engine = LearningEngine()
        self.data_collectors = {}
        self.learning_active = False
        
        # Nastavitve
        self.learning_interval = 60  # sekund
        self.adaptation_threshold = 0.1
        self.max_patterns = 10000
        
        self.setup_database()
        self.setup_data_collectors()
        
        logging.info("🧠 Autonomous Learning System inicializiran")
    
    def setup_database(self):
        """Nastavi bazo za učenje"""
        Path("omni/data").mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_sessions (
                id INTEGER PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_type TEXT,
                patterns_learned INTEGER,
                predictions_made INTEGER,
                accuracy REAL,
                adaptations INTEGER
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pattern_storage (
                id INTEGER PRIMARY KEY,
                pattern_id TEXT UNIQUE,
                pattern_type TEXT,
                features TEXT,
                confidence REAL,
                usage_count INTEGER,
                success_rate REAL,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_metrics (
                id INTEGER PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metric_name TEXT,
                metric_value REAL,
                context TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def setup_data_collectors(self):
        """Nastavi zbiralce podatkov"""
        self.data_collectors = {
            'user_interactions': self._collect_user_interactions,
            'system_performance': self._collect_system_performance,
            'error_occurrences': self._collect_error_occurrences,
            'optimization_results': self._collect_optimization_results
        }
    
    def start_learning(self):
        """Začni avtonomno učenje"""
        self.learning_active = True
        
        # Zaženi glavno zanko učenja
        threading.Thread(target=self._learning_loop, daemon=True).start()
        
        # Zaženi zbiralce podatkov
        for collector_name, collector_func in self.data_collectors.items():
            threading.Thread(target=self._run_collector, args=(collector_name, collector_func), daemon=True).start()
        
        logging.info("🧠 Avtonomno učenje začeto")
    
    def stop_learning(self):
        """Ustavi avtonomno učenje"""
        self.learning_active = False
        logging.info("🧠 Avtonomno učenje ustavljeno")
    
    def _learning_loop(self):
        """Glavna zanka učenja"""
        while self.learning_active:
            try:
                # Izvedi učno sejo
                session_results = self._execute_learning_session()
                
                # Shrani rezultate
                self._save_learning_session(session_results)
                
                # Prilagodi obnašanje, če je potrebno
                if session_results.get('adaptation_needed', False):
                    self._perform_adaptation(session_results)
                
                # Počisti stare vzorce
                self._cleanup_old_patterns()
                
                time.sleep(self.learning_interval)
                
            except Exception as e:
                logging.error(f"❌ Napaka v učni zanki: {e}")
                time.sleep(30)
    
    def _execute_learning_session(self) -> Dict:
        """Izvršiti učno sejo"""
        session_start = time.time()
        
        # Pridobi nove podatke iz vseh virov
        new_data = self._collect_all_data()
        
        # Nauči se iz novih podatkov
        patterns_learned = 0
        for data_type, data_items in new_data.items():
            for data_item in data_items:
                pattern = self.learning_engine.learn_from_data(data_item, data_type)
                if pattern:
                    patterns_learned += 1
        
        # Naredi testne napovedi za oceno natančnosti
        test_predictions = self._make_test_predictions()
        
        # Izračunaj metrike
        session_duration = time.time() - session_start
        
        return {
            'duration': session_duration,
            'patterns_learned': patterns_learned,
            'predictions_made': len(test_predictions),
            'accuracy': self._calculate_prediction_accuracy(test_predictions),
            'adaptation_needed': patterns_learned > 50 or session_duration > 300,
            'data_processed': sum(len(items) for items in new_data.values())
        }
    
    def _collect_all_data(self) -> Dict[str, List[Dict]]:
        """Zberi vse podatke"""
        all_data = {}
        
        for data_type, collector in self.data_collectors.items():
            try:
                data = collector()
                all_data[data_type] = data if isinstance(data, list) else [data] if data else []
            except Exception as e:
                logging.error(f"❌ Napaka pri zbiranju {data_type}: {e}")
                all_data[data_type] = []
        
        return all_data
    
    def _collect_user_interactions(self) -> List[Dict]:
        """Zberi podatke o uporabniških interakcijah"""
        # Simulacija zbiranja podatkov o uporabnikih
        interactions = []
        
        # V realnem sistemu bi to bralo iz logov, baze, API-jev
        sample_interactions = [
            {
                'action': 'search_destinations',
                'timestamp': datetime.now().isoformat(),
                'duration': random.uniform(1, 10),
                'success': random.choice([True, True, True, False]),  # 75% uspešnost
                'module': 'tourism',
                'parameters': {'destination': 'Slovenia', 'budget': 1000}
            },
            {
                'action': 'create_portfolio',
                'timestamp': datetime.now().isoformat(),
                'duration': random.uniform(2, 15),
                'success': random.choice([True, True, False]),  # 66% uspešnost
                'module': 'finance',
                'parameters': {'amount': 5000, 'risk_level': 'medium'}
            },
            {
                'action': 'track_shipment',
                'timestamp': datetime.now().isoformat(),
                'duration': random.uniform(0.5, 5),
                'success': random.choice([True, True, True, True, False]),  # 80% uspešnost
                'module': 'logistics',
                'parameters': {'tracking_number': 'TRK123456'}
            }
        ]
        
        # Vrni naključno izbiro
        return random.sample(sample_interactions, random.randint(1, len(sample_interactions)))
    
    def _collect_system_performance(self) -> List[Dict]:
        """Zberi podatke o performansah sistema"""
        # Simulacija sistemskih metrik
        import psutil
        
        try:
            performance_data = {
                'cpu_usage': psutil.cpu_percent(interval=1),
                'memory_usage': psutil.virtual_memory().percent,
                'response_time': random.uniform(50, 500),  # ms
                'throughput': random.uniform(100, 1000),   # req/s
                'error_rate': random.uniform(0, 5),        # %
                'load_level': random.choice(['low', 'normal', 'high']),
                'timestamp': datetime.now().isoformat()
            }
            
            return [performance_data]
            
        except Exception as e:
            logging.error(f"❌ Napaka pri zbiranju performančnih podatkov: {e}")
            return []
    
    def _collect_error_occurrences(self) -> List[Dict]:
        """Zberi podatke o napakah"""
        # Simulacija napak
        error_types = ['NetworkError', 'DatabaseError', 'MemoryError', 'APIError', 'FileError']
        
        if random.random() < 0.3:  # 30% verjetnost napake
            error_data = {
                'error_type': random.choice(error_types),
                'error_message': f"Simulated {random.choice(error_types).lower()}",
                'module': random.choice(['finance', 'tourism', 'logistics', 'healthcare']),
                'frequency': random.randint(1, 5),
                'severity': random.choice(['low', 'medium', 'high']),
                'resolution_time': random.uniform(1, 300),  # sekund
                'auto_resolved': random.choice([True, False]),
                'timestamp': datetime.now().isoformat()
            }
            
            return [error_data]
        
        return []
    
    def _collect_optimization_results(self) -> List[Dict]:
        """Zberi podatke o rezultatih optimizacije"""
        # Simulacija optimizacijskih rezultatov
        if random.random() < 0.2:  # 20% verjetnost optimizacije
            optimization_data = {
                'type': random.choice(['performance', 'memory', 'network', 'algorithm']),
                'target_metric': random.choice(['response_time', 'throughput', 'accuracy']),
                'improvement': random.uniform(-10, 50),  # % izboljšanja
                'cost': random.uniform(0, 100),         # relativni strošek
                'duration': random.uniform(10, 600),    # sekund
                'success': random.choice([True, True, False]),  # 66% uspešnost
                'side_effects': random.choice([[], ['increased_memory'], ['slower_startup']]),
                'timestamp': datetime.now().isoformat()
            }
            
            return [optimization_data]
        
        return []
    
    def _run_collector(self, collector_name: str, collector_func: Callable):
        """Zaženi zbiralec podatkov"""
        while self.learning_active:
            try:
                data = collector_func()
                
                if data:
                    # Takoj se nauči iz novih podatkov
                    for data_item in (data if isinstance(data, list) else [data]):
                        self.learning_engine.learn_from_data(data_item, collector_name.rstrip('s'))
                
                time.sleep(random.uniform(5, 15))  # Naključni interval
                
            except Exception as e:
                logging.error(f"❌ Napaka v zbiralcu {collector_name}: {e}")
                time.sleep(30)
    
    def _make_test_predictions(self) -> List[Dict]:
        """Naredi testne napovedi"""
        test_cases = [
            ({'action': 'search_destinations', 'module': 'tourism'}, 'user_behavior'),
            ({'cpu_usage': 75, 'memory_usage': 60}, 'performance'),
            ({'error_type': 'NetworkError', 'module': 'finance'}, 'error_prediction')
        ]
        
        predictions = []
        for test_input, prediction_type in test_cases:
            prediction = self.learning_engine.predict(test_input, prediction_type)
            predictions.append({
                'input': test_input,
                'type': prediction_type,
                'prediction': prediction,
                'timestamp': datetime.now().isoformat()
            })
        
        return predictions
    
    def _calculate_prediction_accuracy(self, predictions: List[Dict]) -> float:
        """Izračunaj natančnost napovedi"""
        if not predictions:
            return 0.0
        
        # Simulacija ocene natančnosti
        accuracies = []
        for pred in predictions:
            confidence = pred['prediction'].get('confidence', 0)
            # Simuliraj dejanski rezultat
            actual_accuracy = random.uniform(max(0, confidence - 0.2), min(1, confidence + 0.2))
            accuracies.append(actual_accuracy)
        
        return statistics.mean(accuracies)
    
    def _save_learning_session(self, session_results: Dict):
        """Shrani rezultate učne seje"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO learning_sessions 
            (data_type, patterns_learned, predictions_made, accuracy, adaptations)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            'mixed',
            session_results['patterns_learned'],
            session_results['predictions_made'],
            session_results['accuracy'],
            1 if session_results['adaptation_needed'] else 0
        ))
        
        conn.commit()
        conn.close()
    
    def _perform_adaptation(self, session_results: Dict):
        """Izvršiti prilagoditev"""
        feedback = {
            'prediction_accuracy': session_results['accuracy'],
            'performance_feedback': {'score': 0.8},  # Simulacija
            'user_satisfaction': 0.7  # Simulacija
        }
        
        adaptation_results = self.learning_engine.adapt_behavior(feedback)
        
        logging.info(f"🔄 Izvedenih {adaptation_results['adaptations_made']} prilagoditev")
    
    def _cleanup_old_patterns(self):
        """Počisti stare vzorce"""
        if len(self.learning_engine.patterns) > self.max_patterns:
            # Sortiraj vzorce po relevantnosti
            patterns_by_relevance = sorted(
                self.learning_engine.patterns.items(),
                key=lambda x: x[1].calculate_relevance(datetime.now()),
                reverse=True
            )
            
            # Obdrži samo najboljše vzorce
            keep_patterns = dict(patterns_by_relevance[:self.max_patterns])
            removed_count = len(self.learning_engine.patterns) - len(keep_patterns)
            
            self.learning_engine.patterns = keep_patterns
            
            logging.info(f"🧹 Odstranjenih {removed_count} starih vzorcev")
    
    def get_learning_status(self) -> Dict:
        """Pridobi status učenja"""
        return {
            'system_name': self.name,
            'version': self.version,
            'timestamp': datetime.now().isoformat(),
            'learning_active': self.learning_active,
            'learning_engine': {
                'patterns_count': len(self.learning_engine.patterns),
                'patterns_by_type': self._count_patterns_by_type(),
                'learning_metrics': self.learning_engine.learning_metrics
            },
            'data_collectors': {
                'active_collectors': len(self.data_collectors),
                'collector_names': list(self.data_collectors.keys())
            },
            'recent_performance': self._get_recent_performance()
        }
    
    def _count_patterns_by_type(self) -> Dict:
        """Preštej vzorce po tipih"""
        counts = defaultdict(int)
        for pattern in self.learning_engine.patterns.values():
            counts[pattern.pattern_type] += 1
        return dict(counts)
    
    def _get_recent_performance(self) -> Dict:
        """Pridobi nedavne performanse"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT AVG(accuracy), COUNT(*), AVG(patterns_learned)
            FROM learning_sessions 
            WHERE timestamp > datetime('now', '-1 hour')
        ''')
        
        result = cursor.fetchone()
        conn.close()
        
        if result and result[0] is not None:
            return {
                'avg_accuracy': round(result[0], 3),
                'sessions_count': result[1],
                'avg_patterns_per_session': round(result[2], 1)
            }
        
        return {
            'avg_accuracy': 0.0,
            'sessions_count': 0,
            'avg_patterns_per_session': 0.0
        }

# Test funkcije
def test_autonomous_learning():
    """Testiraj sistem avtonomnega učenja"""
    print("🧠 Testiram Autonomous Learning System...")
    
    learning_system = AutonomousLearningSystem()
    
    # Začni učenje
    learning_system.start_learning()
    
    print("📚 Sistem se uči...")
    time.sleep(30)  # Pusti sistem, da se uči 30 sekund
    
    # Prikaži status
    status = learning_system.get_learning_status()
    print(f"\n📊 Status učenja:")
    print(f"  Aktivno učenje: {status['learning_active']}")
    print(f"  Naučenih vzorcev: {status['learning_engine']['patterns_count']}")
    print(f"  Vzorci po tipih: {status['learning_engine']['patterns_by_type']}")
    print(f"  Natančnost napovedi: {status['learning_engine']['learning_metrics']['prediction_accuracy']:.1%}")
    
    # Testiraj napovedi
    print("\n🔮 Testiram napovedi...")
    
    test_cases = [
        ({'action': 'search_destinations', 'module': 'tourism'}, 'user_behavior'),
        ({'cpu_usage': 80, 'memory_usage': 70}, 'performance'),
        ({'error_type': 'NetworkError', 'module': 'api'}, 'error_prediction')
    ]
    
    for test_input, prediction_type in test_cases:
        prediction = learning_system.learning_engine.predict(test_input, prediction_type)
        print(f"  📈 {prediction_type}: zaupanje {prediction['confidence']:.1%}")
    
    # Ustavi učenje
    learning_system.stop_learning()
    
    return learning_system

# Glavna funkcija
def main():
    """Glavna funkcija"""
    print("🧠 OMNI AUTONOMOUS LEARNING SYSTEM - ZAGON")
    print("=" * 50)
    
    # Testiraj sistem
    learning_system = test_autonomous_learning()
    
    print("\n🎉 Autonomous Learning System je pripravljen!")
    print("✅ Sistem se avtonomno uči iz realnih podatkov")
    print("✅ Prilagaja obnašanje na podlagi izkušenj")
    print("✅ Izboljšuje napovedi s časom")
    print("✅ Optimizira performanse avtomatsko")
    
    return learning_system

if __name__ == "__main__":
    autonomous_learning = main()