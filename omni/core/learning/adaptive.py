"""
🎓 OMNI ADAPTIVE LEARNING
Sistem za samo-učenje in evolucijo
"""

import json
import os
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import statistics

@dataclass
class LearningPattern:
    """Vzorec učenja"""
    id: str
    pattern_type: str
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    success_rate: float
    usage_count: int
    last_used: datetime
    confidence: float
    metadata: Dict[str, Any]

@dataclass
class PerformanceMetric:
    """Metrika uspešnosti"""
    metric_name: str
    value: float
    timestamp: datetime
    context: Dict[str, Any]

class OmniAdaptiveLearning:
    """
    Sistem za adaptivno učenje z naslednjimi funkcionalnostmi:
    - Prepoznavanje vzorcev v interakcijah
    - Učenje iz uspehov in napak
    - Optimizacija odzivov
    - Personalizacija za uporabnike
    - Evolucija strategij
    """
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.learning_dir = os.path.join(data_dir, "learning")
        self.patterns: Dict[str, LearningPattern] = {}
        self.performance_history: List[PerformanceMetric] = []
        self.user_preferences: Dict[str, Dict[str, Any]] = {}
        
        self._init_directories()
        self._load_patterns()
        self._load_performance_history()
        self._load_user_preferences()
    
    def _init_directories(self):
        """Ustvari potrebne direktorije"""
        os.makedirs(self.learning_dir, exist_ok=True)
        os.makedirs(os.path.join(self.learning_dir, "patterns"), exist_ok=True)
        os.makedirs(os.path.join(self.learning_dir, "performance"), exist_ok=True)
        os.makedirs(os.path.join(self.learning_dir, "users"), exist_ok=True)
    
    def _load_patterns(self):
        """Naloži naučene vzorce"""
        patterns_file = os.path.join(self.learning_dir, "patterns", "learned_patterns.json")
        if os.path.exists(patterns_file):
            try:
                with open(patterns_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for pattern_data in data:
                        pattern = LearningPattern(
                            id=pattern_data['id'],
                            pattern_type=pattern_data['pattern_type'],
                            input_data=pattern_data['input_data'],
                            output_data=pattern_data['output_data'],
                            success_rate=pattern_data['success_rate'],
                            usage_count=pattern_data['usage_count'],
                            last_used=datetime.fromisoformat(pattern_data['last_used']),
                            confidence=pattern_data['confidence'],
                            metadata=pattern_data['metadata']
                        )
                        self.patterns[pattern.id] = pattern
            except Exception as e:
                print(f"❌ Napaka pri nalaganju vzorcev: {e}")
    
    def _save_patterns(self):
        """Shrani naučene vzorce"""
        patterns_file = os.path.join(self.learning_dir, "patterns", "learned_patterns.json")
        try:
            data = []
            for pattern in self.patterns.values():
                pattern_dict = asdict(pattern)
                pattern_dict['last_used'] = pattern.last_used.isoformat()
                data.append(pattern_dict)
            
            with open(patterns_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ Napaka pri shranjevanju vzorcev: {e}")
    
    def _load_performance_history(self):
        """Naloži zgodovino uspešnosti"""
        performance_file = os.path.join(self.learning_dir, "performance", "metrics.json")
        if os.path.exists(performance_file):
            try:
                with open(performance_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.performance_history = [
                        PerformanceMetric(
                            metric_name=item['metric_name'],
                            value=item['value'],
                            timestamp=datetime.fromisoformat(item['timestamp']),
                            context=item['context']
                        ) for item in data
                    ]
            except Exception as e:
                print(f"❌ Napaka pri nalaganju metrik: {e}")
    
    def _save_performance_history(self):
        """Shrani zgodovino uspešnosti"""
        performance_file = os.path.join(self.learning_dir, "performance", "metrics.json")
        try:
            data = []
            for metric in self.performance_history:
                metric_dict = asdict(metric)
                metric_dict['timestamp'] = metric.timestamp.isoformat()
                data.append(metric_dict)
            
            with open(performance_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ Napaka pri shranjevanju metrik: {e}")
    
    def _load_user_preferences(self):
        """Naloži uporabniške preference"""
        users_file = os.path.join(self.learning_dir, "users", "preferences.json")
        if os.path.exists(users_file):
            try:
                with open(users_file, 'r', encoding='utf-8') as f:
                    self.user_preferences = json.load(f)
            except Exception as e:
                print(f"❌ Napaka pri nalaganju preferenc: {e}")
    
    def _save_user_preferences(self):
        """Shrani uporabniške preference"""
        users_file = os.path.join(self.learning_dir, "users", "preferences.json")
        try:
            with open(users_file, 'w', encoding='utf-8') as f:
                json.dump(self.user_preferences, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ Napaka pri shranjevanju preferenc: {e}")
    
    def learn_from_interaction(self, interaction_data: Dict[str, Any], 
                             success_score: float, user_id: Optional[str] = None):
        """Učenje iz interakcije"""
        try:
            # Generiraj ID vzorca
            pattern_id = f"pattern_{len(self.patterns)}_{datetime.now().timestamp()}"
            
            # Ustvari nov vzorec
            pattern = LearningPattern(
                id=pattern_id,
                pattern_type=interaction_data.get('type', 'general'),
                input_data=interaction_data.get('input', {}),
                output_data=interaction_data.get('output', {}),
                success_rate=success_score,
                usage_count=1,
                last_used=datetime.now(),
                confidence=min(success_score, 0.8),  # Začetna zaupljivost
                metadata={
                    'user_id': user_id,
                    'learned_at': datetime.now().isoformat(),
                    'context': interaction_data.get('context', {})
                }
            )
            
            self.patterns[pattern_id] = pattern
            self._save_patterns()
            
            # Posodobi uporabniške preference
            if user_id:
                self._update_user_preferences(user_id, interaction_data, success_score)
            
            # Dodaj metriko uspešnosti
            self.add_performance_metric("interaction_success", success_score, {
                'pattern_id': pattern_id,
                'user_id': user_id,
                'type': interaction_data.get('type', 'general')
            })
            
            print(f"🎓 Naučil sem se iz interakcije: {pattern_id}")
            
        except Exception as e:
            print(f"❌ Napaka pri učenju: {e}")
    
    def _update_user_preferences(self, user_id: str, interaction_data: Dict[str, Any], 
                               success_score: float):
        """Posodobi uporabniške preference"""
        if user_id not in self.user_preferences:
            self.user_preferences[user_id] = {
                'preferred_modules': {},
                'communication_style': 'neutral',
                'response_length': 'medium',
                'interaction_count': 0,
                'average_satisfaction': 0.0,
                'last_interaction': datetime.now().isoformat()
            }
        
        user_prefs = self.user_preferences[user_id]
        
        # Posodobi statistike
        user_prefs['interaction_count'] += 1
        current_avg = user_prefs['average_satisfaction']
        new_avg = (current_avg * (user_prefs['interaction_count'] - 1) + success_score) / user_prefs['interaction_count']
        user_prefs['average_satisfaction'] = new_avg
        user_prefs['last_interaction'] = datetime.now().isoformat()
        
        # Posodobi preference modulov
        module_type = interaction_data.get('type', 'general')
        if module_type not in user_prefs['preferred_modules']:
            user_prefs['preferred_modules'][module_type] = {'usage': 0, 'satisfaction': 0.0}
        
        module_prefs = user_prefs['preferred_modules'][module_type]
        module_prefs['usage'] += 1
        module_satisfaction = (module_prefs['satisfaction'] * (module_prefs['usage'] - 1) + success_score) / module_prefs['usage']
        module_prefs['satisfaction'] = module_satisfaction
        
        self._save_user_preferences()
    
    def find_similar_patterns(self, input_data: Dict[str, Any], 
                            pattern_type: Optional[str] = None) -> List[LearningPattern]:
        """Poišči podobne vzorce"""
        similar_patterns = []
        
        for pattern in self.patterns.values():
            if pattern_type and pattern.pattern_type != pattern_type:
                continue
            
            # Preprosta podobnost na podlagi ključnih besed
            similarity_score = self._calculate_similarity(input_data, pattern.input_data)
            
            if similarity_score > 0.3:  # Prag podobnosti
                pattern.confidence = similarity_score * pattern.success_rate
                similar_patterns.append(pattern)
        
        # Razvrsti po zaupljivosti
        similar_patterns.sort(key=lambda x: x.confidence, reverse=True)
        return similar_patterns[:5]  # Vrni top 5
    
    def _calculate_similarity(self, data1: Dict[str, Any], data2: Dict[str, Any]) -> float:
        """Izračunaj podobnost med dvema podatkovnima strukturama"""
        try:
            # Preprosta implementacija - primerjaj ključne besede
            text1 = str(data1).lower()
            text2 = str(data2).lower()
            
            words1 = set(text1.split())
            words2 = set(text2.split())
            
            if not words1 or not words2:
                return 0.0
            
            intersection = words1.intersection(words2)
            union = words1.union(words2)
            
            return len(intersection) / len(union) if union else 0.0
            
        except Exception:
            return 0.0
    
    def get_recommendation(self, input_data: Dict[str, Any], 
                         user_id: Optional[str] = None) -> Dict[str, Any]:
        """Pridobi priporočilo na podlagi naučenih vzorcev"""
        # Poišči podobne vzorce
        similar_patterns = self.find_similar_patterns(input_data)
        
        if not similar_patterns:
            return {
                'recommendation': 'no_pattern_found',
                'confidence': 0.0,
                'explanation': 'Ni najdenih podobnih vzorcev'
            }
        
        best_pattern = similar_patterns[0]
        
        # Upoštevaj uporabniške preference
        if user_id and user_id in self.user_preferences:
            user_prefs = self.user_preferences[user_id]
            # Prilagodi priporočilo glede na preference
            confidence_boost = user_prefs.get('average_satisfaction', 0.5) * 0.2
            best_pattern.confidence = min(1.0, best_pattern.confidence + confidence_boost)
        
        # Posodobi statistike uporabe
        best_pattern.usage_count += 1
        best_pattern.last_used = datetime.now()
        self._save_patterns()
        
        return {
            'recommendation': best_pattern.output_data,
            'confidence': best_pattern.confidence,
            'pattern_id': best_pattern.id,
            'explanation': f'Priporočilo na podlagi vzorca z {best_pattern.usage_count} uporabami'
        }
    
    def add_performance_metric(self, metric_name: str, value: float, 
                             context: Dict[str, Any] = None):
        """Dodaj metriko uspešnosti"""
        if context is None:
            context = {}
        
        metric = PerformanceMetric(
            metric_name=metric_name,
            value=value,
            timestamp=datetime.now(),
            context=context
        )
        
        self.performance_history.append(metric)
        
        # Obdrži samo zadnjih 1000 metrik
        if len(self.performance_history) > 1000:
            self.performance_history = self.performance_history[-1000:]
        
        self._save_performance_history()
    
    def get_performance_analysis(self, days: int = 7) -> Dict[str, Any]:
        """Analiziraj uspešnost v zadnjih N dneh"""
        cutoff_date = datetime.now() - timedelta(days=days)
        recent_metrics = [m for m in self.performance_history if m.timestamp >= cutoff_date]
        
        if not recent_metrics:
            return {'message': 'Ni podatkov za analizo'}
        
        # Grupiranje po imenih metrik
        metrics_by_name = {}
        for metric in recent_metrics:
            if metric.metric_name not in metrics_by_name:
                metrics_by_name[metric.metric_name] = []
            metrics_by_name[metric.metric_name].append(metric.value)
        
        # Izračunaj statistike
        analysis = {}
        for name, values in metrics_by_name.items():
            analysis[name] = {
                'count': len(values),
                'average': statistics.mean(values),
                'median': statistics.median(values),
                'min': min(values),
                'max': max(values),
                'trend': 'improving' if len(values) > 1 and values[-1] > values[0] else 'stable'
            }
        
        return {
            'period_days': days,
            'total_metrics': len(recent_metrics),
            'metrics_analysis': analysis,
            'overall_performance': statistics.mean([m.value for m in recent_metrics])
        }
    
    def optimize_patterns(self):
        """Optimiziraj naučene vzorce"""
        optimized_count = 0
        
        for pattern in self.patterns.values():
            # Posodobi zaupljivost na podlagi uporabe
            if pattern.usage_count > 10:
                # Vzorci z več uporabami so bolj zanesljivi
                pattern.confidence = min(1.0, pattern.confidence + 0.1)
                optimized_count += 1
            
            # Zmanjšaj zaupljivost starih vzorcev
            days_old = (datetime.now() - pattern.last_used).days
            if days_old > 30:
                pattern.confidence = max(0.1, pattern.confidence - 0.05)
                optimized_count += 1
        
        self._save_patterns()
        return optimized_count
    
    def get_learning_stats(self) -> Dict[str, Any]:
        """Pridobi statistike učenja"""
        if not self.patterns:
            return {'message': 'Ni naučenih vzorcev'}
        
        # Analiza vzorcev
        pattern_types = {}
        total_usage = 0
        avg_confidence = 0
        
        for pattern in self.patterns.values():
            if pattern.pattern_type not in pattern_types:
                pattern_types[pattern.pattern_type] = 0
            pattern_types[pattern.pattern_type] += 1
            total_usage += pattern.usage_count
            avg_confidence += pattern.confidence
        
        avg_confidence /= len(self.patterns)
        
        return {
            'total_patterns': len(self.patterns),
            'pattern_types': pattern_types,
            'total_usage': total_usage,
            'average_confidence': round(avg_confidence, 3),
            'total_users': len(self.user_preferences),
            'performance_metrics': len(self.performance_history)
        }

if __name__ == "__main__":
    # Test adaptive learning sistema
    learning = OmniAdaptiveLearning()
    
    # Simuliraj učenje
    test_interactions = [
        {
            'type': 'tourism',
            'input': {'query': 'priporoči hotel v Ljubljani'},
            'output': {'recommendation': 'Hotel Cubo', 'rating': 4.5},
            'context': {'location': 'Ljubljana'}
        },
        {
            'type': 'finance',
            'input': {'query': 'kako naredim proračun'},
            'output': {'steps': ['analiza prihodkov', 'kategorizacija stroškov']},
            'context': {'user_type': 'beginner'}
        }
    ]
    
    print("🎓 Simuliram učenje...")
    for i, interaction in enumerate(test_interactions):
        success_score = 0.8 + (i * 0.1)  # Simuliraj različne uspešnosti
        learning.learn_from_interaction(interaction, success_score, f"user_{i}")
        print(f"✅ Naučil sem se iz interakcije {i+1}")
    
    # Test priporočil
    print("\n💡 Testiram priporočila...")
    test_input = {'query': 'potrebujem hotel v Ljubljani'}
    recommendation = learning.get_recommendation(test_input, "user_0")
    print(f"Priporočilo: {recommendation}")
    
    # Statistike
    print(f"\n📊 Statistike učenja: {learning.get_learning_stats()}")
    
    # Analiza uspešnosti
    analysis = learning.get_performance_analysis(days=1)
    print(f"\n📈 Analiza uspešnosti: {analysis}")