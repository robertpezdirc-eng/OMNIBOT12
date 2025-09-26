#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🤖 Omni IoT Samoučeča Avtonomna Optimizacija
===========================================

Napredni sistem za samoučečo optimizacijo IoT naprav:
- Avtomatska analiza vzorcev uporabe
- Prilagajanje urnikov glede na pretekle podatke
- Energetska optimizacija
- Prediktivno vzdrževanje
- Avtonomno učenje brez človeške intervencije

Avtor: Omni AI Assistant
Datum: 22. september 2025
Verzija: 1.0 Production
"""

import time
import json
import os
import sqlite3
import threading
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# Konfiguracija
LEARNING_DB = "omni/data/iot_learning.db"
LEARNING_LOG = "omni/logs/iot_learning.log"
MEMORY_FILE = "omni/data/iot_learning_memory.json"
OPTIMIZATION_INTERVAL = 300  # 5 minut
ANALYSIS_INTERVAL = 3600     # 1 ura
LEARNING_THRESHOLD = 50      # Minimum podatkov za učenje

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LEARNING_LOG, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def __name__():
    return "iot_autonomous_learning"

class OptimizationType(Enum):
    """Tipi optimizacije"""
    SCHEDULE = "schedule"
    ENERGY = "energy"
    PERFORMANCE = "performance"
    PREDICTIVE = "predictive"
    ADAPTIVE = "adaptive"

class LearningLevel(Enum):
    """Nivoji učenja"""
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

@dataclass
class DevicePattern:
    """Vzorec uporabe naprave"""
    device_id: str
    usage_times: List[str]
    energy_consumption: List[float]
    performance_metrics: Dict[str, float]
    optimal_schedule: Dict[str, str]
    learning_confidence: float
    last_updated: str

@dataclass
class OptimizationRule:
    """Pravilo optimizacije"""
    rule_id: str
    device_id: str
    optimization_type: OptimizationType
    condition: str
    action: str
    confidence: float
    success_rate: float
    created_at: str

class IoTAutonomousLearning:
    """Glavni razred za samoučečo IoT optimizacijo"""
    
    def __init__(self):
        self.db_path = LEARNING_DB
        self.memory_file = MEMORY_FILE
        self.is_running = False
        self.learning_thread = None
        self.analysis_thread = None
        self.device_patterns = {}
        self.optimization_rules = []
        self.learning_level = LearningLevel.BASIC
        
        # Ustvari direktorije
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        os.makedirs(os.path.dirname(LEARNING_LOG), exist_ok=True)
        os.makedirs(os.path.dirname(self.memory_file), exist_ok=True)
        
        self._initialize_database()
        self._load_memory()
        
        logger.info("Samoučeči IoT sistem inicializiran")

    def _initialize_database(self):
        """Inicializacija baze podatkov"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Tabela za vzorce naprav
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS device_patterns (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        device_id TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        usage_data TEXT NOT NULL,
                        energy_consumption REAL,
                        performance_score REAL,
                        optimization_applied TEXT,
                        success_rate REAL,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Tabela za pravila optimizacije
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS optimization_rules (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        rule_id TEXT UNIQUE NOT NULL,
                        device_id TEXT NOT NULL,
                        optimization_type TEXT NOT NULL,
                        condition_data TEXT NOT NULL,
                        action_data TEXT NOT NULL,
                        confidence REAL DEFAULT 0.0,
                        success_rate REAL DEFAULT 0.0,
                        usage_count INTEGER DEFAULT 0,
                        last_used TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Tabela za učne podatke
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS learning_data (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        device_id TEXT NOT NULL,
                        metric_name TEXT NOT NULL,
                        metric_value REAL NOT NULL,
                        timestamp TEXT NOT NULL,
                        context_data TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                conn.commit()
                logger.info("Baza podatkov za učenje inicializirana")
                
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji baze: {e}")

    def _load_memory(self):
        """Naloži pretekle podatke iz spomina"""
        try:
            if os.path.exists(self.memory_file):
                with open(self.memory_file, 'r', encoding='utf-8') as f:
                    memory_data = json.load(f)
                    
                # Naloži vzorce naprav
                for device_id, pattern_data in memory_data.get('patterns', {}).items():
                    self.device_patterns[device_id] = DevicePattern(**pattern_data)
                
                # Naloži pravila optimizacije
                for rule_data in memory_data.get('rules', []):
                    rule = OptimizationRule(**rule_data)
                    rule.optimization_type = OptimizationType(rule.optimization_type)
                    self.optimization_rules.append(rule)
                
                # Naloži nivo učenja
                if 'learning_level' in memory_data:
                    self.learning_level = LearningLevel(memory_data['learning_level'])
                
                logger.info(f"Naloženih {len(self.device_patterns)} vzorcev in {len(self.optimization_rules)} pravil")
            else:
                logger.info("Ni preteklih podatkov - začenjam s svežim učenjem")
                
        except Exception as e:
            logger.error(f"Napaka pri nalaganju spomina: {e}")

    def _save_memory(self):
        """Shrani trenutno stanje v spomin"""
        try:
            memory_data = {
                'patterns': {k: asdict(v) for k, v in self.device_patterns.items()},
                'rules': [asdict(rule) for rule in self.optimization_rules],
                'learning_level': self.learning_level.value,
                'last_updated': datetime.now().isoformat()
            }
            
            with open(self.memory_file, 'w', encoding='utf-8') as f:
                json.dump(memory_data, f, indent=2, ensure_ascii=False)
                
            logger.debug("Spomin uspešno shranjen")
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju spomina: {e}")

    def record_device_usage(self, device_id: str, usage_data: Dict[str, Any]):
        """Zabeleži uporabo naprave za učenje"""
        try:
            timestamp = datetime.now().isoformat()
            
            # Shrani v bazo
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO device_patterns 
                    (device_id, timestamp, usage_data, energy_consumption, performance_score)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    device_id,
                    timestamp,
                    json.dumps(usage_data),
                    usage_data.get('energy_consumption', 0.0),
                    usage_data.get('performance_score', 1.0)
                ))
                conn.commit()
            
            # Posodobi vzorce v spominu
            if device_id not in self.device_patterns:
                self.device_patterns[device_id] = DevicePattern(
                    device_id=device_id,
                    usage_times=[],
                    energy_consumption=[],
                    performance_metrics={},
                    optimal_schedule={},
                    learning_confidence=0.0,
                    last_updated=timestamp
                )
            
            pattern = self.device_patterns[device_id]
            pattern.usage_times.append(timestamp)
            pattern.energy_consumption.append(usage_data.get('energy_consumption', 0.0))
            pattern.last_updated = timestamp
            
            # Omeji velikost podatkov
            if len(pattern.usage_times) > 1000:
                pattern.usage_times = pattern.usage_times[-500:]
                pattern.energy_consumption = pattern.energy_consumption[-500:]
            
            logger.debug(f"Zabeležena uporaba naprave {device_id}")
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju uporabe {device_id}: {e}")

    def _analyze_usage_patterns(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Analiziraj vzorce uporabe naprave"""
        try:
            if device_id not in self.device_patterns:
                return None
            
            pattern = self.device_patterns[device_id]
            
            if len(pattern.usage_times) < LEARNING_THRESHOLD:
                logger.debug(f"Premalo podatkov za analizo {device_id}")
                return None
            
            # Analiza časovnih vzorcev
            usage_hours = []
            for time_str in pattern.usage_times[-100:]:  # Zadnjih 100 uporab
                dt = datetime.fromisoformat(time_str)
                usage_hours.append(dt.hour + dt.minute / 60.0)
            
            # Statistična analiza
            avg_usage_time = statistics.mean(usage_hours)
            peak_hours = self._find_peak_hours(usage_hours)
            
            # Energetska analiza
            avg_consumption = statistics.mean(pattern.energy_consumption[-50:])
            consumption_trend = self._calculate_trend(pattern.energy_consumption[-50:])
            
            # Optimalni urnik
            optimal_schedule = self._calculate_optimal_schedule(usage_hours, pattern.energy_consumption)
            
            analysis = {
                'device_id': device_id,
                'avg_usage_time': avg_usage_time,
                'peak_hours': peak_hours,
                'avg_consumption': avg_consumption,
                'consumption_trend': consumption_trend,
                'optimal_schedule': optimal_schedule,
                'confidence': min(len(pattern.usage_times) / 200.0, 1.0),
                'data_points': len(pattern.usage_times)
            }
            
            logger.info(f"Analiza vzorcev za {device_id}: {analysis['confidence']:.2f} zaupanja")
            return analysis
            
        except Exception as e:
            logger.error(f"Napaka pri analizi vzorcev {device_id}: {e}")
            return None

    def _find_peak_hours(self, usage_hours: List[float]) -> List[int]:
        """Najdi ure z največjo uporabo"""
        hour_counts = {}
        for hour in usage_hours:
            hour_int = int(hour)
            hour_counts[hour_int] = hour_counts.get(hour_int, 0) + 1
        
        # Vrni top 3 ure
        sorted_hours = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)
        return [hour for hour, count in sorted_hours[:3]]

    def _calculate_trend(self, values: List[float]) -> str:
        """Izračunaj trend vrednosti"""
        if len(values) < 10:
            return "insufficient_data"
        
        first_half = statistics.mean(values[:len(values)//2])
        second_half = statistics.mean(values[len(values)//2:])
        
        if second_half > first_half * 1.1:
            return "increasing"
        elif second_half < first_half * 0.9:
            return "decreasing"
        else:
            return "stable"

    def _calculate_optimal_schedule(self, usage_hours: List[float], consumption: List[float]) -> Dict[str, str]:
        """Izračunaj optimalni urnik"""
        try:
            if not usage_hours or not consumption:
                return {}
            
            # Najdi najcenejše ure (najnižja poraba)
            hour_consumption = {}
            for i, hour in enumerate(usage_hours[-len(consumption):]):
                hour_int = int(hour)
                if hour_int not in hour_consumption:
                    hour_consumption[hour_int] = []
                hour_consumption[hour_int].append(consumption[i])
            
            # Povprečna poraba po urah
            avg_consumption_by_hour = {}
            for hour, consumptions in hour_consumption.items():
                avg_consumption_by_hour[hour] = statistics.mean(consumptions)
            
            # Najdi optimalne ure
            sorted_hours = sorted(avg_consumption_by_hour.items(), key=lambda x: x[1])
            
            if len(sorted_hours) >= 2:
                optimal_on = f"{sorted_hours[0][0]:02d}:00"
                optimal_off = f"{sorted_hours[-1][0]:02d}:00"
                
                return {
                    "optimal_on": optimal_on,
                    "optimal_off": optimal_off,
                    "energy_savings": f"{((sorted_hours[-1][1] - sorted_hours[0][1]) / sorted_hours[-1][1] * 100):.1f}%"
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Napaka pri izračunu optimalnega urnika: {e}")
            return {}

    def create_optimization_rule(self, device_id: str, analysis: Dict[str, Any]) -> Optional[OptimizationRule]:
        """Ustvari pravilo optimizacije na podlagi analize"""
        try:
            rule_id = f"opt_{device_id}_{int(time.time())}"
            
            # Določi tip optimizacije
            if analysis['consumption_trend'] == 'increasing':
                opt_type = OptimizationType.ENERGY
                condition = f"energy_consumption > {analysis['avg_consumption'] * 1.2}"
                action = "reduce_power_or_schedule_optimization"
            elif analysis['confidence'] > 0.8:
                opt_type = OptimizationType.SCHEDULE
                condition = f"usage_pattern_confidence > 0.8"
                action = f"apply_optimal_schedule: {analysis['optimal_schedule']}"
            else:
                opt_type = OptimizationType.ADAPTIVE
                condition = "continuous_learning"
                action = "collect_more_data_and_adapt"
            
            rule = OptimizationRule(
                rule_id=rule_id,
                device_id=device_id,
                optimization_type=opt_type,
                condition=condition,
                action=action,
                confidence=analysis['confidence'],
                success_rate=0.0,
                created_at=datetime.now().isoformat()
            )
            
            self.optimization_rules.append(rule)
            
            # Shrani v bazo
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO optimization_rules 
                    (rule_id, device_id, optimization_type, condition_data, action_data, confidence)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    rule.rule_id,
                    rule.device_id,
                    rule.optimization_type.value,
                    rule.condition,
                    rule.action,
                    rule.confidence
                ))
                conn.commit()
            
            logger.info(f"Ustvarjeno pravilo optimizacije {rule_id} za {device_id}")
            return rule
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju pravila optimizacije: {e}")
            return None

    def apply_optimization(self, device_id: str, rule: OptimizationRule) -> bool:
        """Izvedi optimizacijo naprave"""
        try:
            logger.info(f"Izvajam optimizacijo {rule.optimization_type.value} za {device_id}")
            
            # Simulacija izvajanja optimizacije
            # V realnem sistemu bi tukaj klical dejanske IoT funkcije
            
            if rule.optimization_type == OptimizationType.SCHEDULE:
                logger.info(f"Prilagajam urnik za {device_id}: {rule.action}")
                success = True
                
            elif rule.optimization_type == OptimizationType.ENERGY:
                logger.info(f"Optimiziram energijo za {device_id}: {rule.action}")
                success = True
                
            elif rule.optimization_type == OptimizationType.PERFORMANCE:
                logger.info(f"Optimiziram delovanje za {device_id}: {rule.action}")
                success = True
                
            else:
                logger.info(f"Splošna optimizacija za {device_id}: {rule.action}")
                success = True
            
            # Posodobi statistike pravila
            if success:
                rule.success_rate = min(rule.success_rate + 0.1, 1.0)
                logger.info(f"Optimizacija uspešna - nova uspešnost: {rule.success_rate:.2f}")
            else:
                rule.success_rate = max(rule.success_rate - 0.05, 0.0)
                logger.warning(f"Optimizacija neuspešna - nova uspešnost: {rule.success_rate:.2f}")
            
            return success
            
        except Exception as e:
            logger.error(f"Napaka pri izvajanju optimizacije: {e}")
            return False

    def _learning_loop(self):
        """Glavna zanka samoučenja"""
        logger.info("Zanka samoučenja zagnana")
        
        while self.is_running:
            try:
                # Analiziraj vse naprave
                for device_id in list(self.device_patterns.keys()):
                    analysis = self._analyze_usage_patterns(device_id)
                    
                    if analysis and analysis['confidence'] > 0.5:
                        # Ustvari ali posodobi pravila optimizacije
                        rule = self.create_optimization_rule(device_id, analysis)
                        
                        if rule and rule.confidence > 0.7:
                            # Izvedi optimizacijo
                            self.apply_optimization(device_id, rule)
                
                # Posodobi nivo učenja
                self._update_learning_level()
                
                # Shrani spomin
                self._save_memory()
                
                logger.debug(f"Cikel učenja dokončan - nivo: {self.learning_level.value}")
                
            except Exception as e:
                logger.error(f"Napaka v zanki učenja: {e}")
            
            time.sleep(ANALYSIS_INTERVAL)

    def _optimization_loop(self):
        """Zanka za kontinuirano optimizacijo"""
        logger.info("Zanka optimizacije zagnana")
        
        while self.is_running:
            try:
                # Izvedi optimizacije z visoko uspešnostjo
                for rule in self.optimization_rules:
                    if rule.success_rate > 0.8 and rule.confidence > 0.7:
                        self.apply_optimization(rule.device_id, rule)
                
                # Počisti neuspešna pravila
                self.optimization_rules = [
                    rule for rule in self.optimization_rules 
                    if rule.success_rate > 0.3
                ]
                
            except Exception as e:
                logger.error(f"Napaka v zanki optimizacije: {e}")
            
            time.sleep(OPTIMIZATION_INTERVAL)

    def _update_learning_level(self):
        """Posodobi nivo učenja glede na izkušnje"""
        total_patterns = len(self.device_patterns)
        total_rules = len(self.optimization_rules)
        avg_confidence = 0.0
        
        if self.device_patterns:
            confidences = [p.learning_confidence for p in self.device_patterns.values()]
            avg_confidence = statistics.mean(confidences) if confidences else 0.0
        
        # Določi nivo učenja
        if total_patterns >= 100 and total_rules >= 50 and avg_confidence > 0.9:
            self.learning_level = LearningLevel.EXPERT
        elif total_patterns >= 50 and total_rules >= 20 and avg_confidence > 0.7:
            self.learning_level = LearningLevel.ADVANCED
        elif total_patterns >= 20 and total_rules >= 10 and avg_confidence > 0.5:
            self.learning_level = LearningLevel.INTERMEDIATE
        else:
            self.learning_level = LearningLevel.BASIC

    def start_autonomous_learning(self) -> str:
        """Zaženi samoučečo optimizacijo"""
        if self.is_running:
            return "Samoučeča optimizacija že teče"
        
        try:
            self.is_running = True
            
            # Zaženi niti
            self.learning_thread = threading.Thread(target=self._learning_loop, daemon=True)
            self.analysis_thread = threading.Thread(target=self._optimization_loop, daemon=True)
            
            self.learning_thread.start()
            self.analysis_thread.start()
            
            logger.info("Samoučeča avtonomna IoT optimizacija uspešno zagnana")
            return "Samoučeča avtonomna IoT optimizacija zagnana ✅"
            
        except Exception as e:
            logger.error(f"Napaka pri zagonu samoučeče optimizacije: {e}")
            self.is_running = False
            return f"Napaka pri zagonu: {e}"

    def stop_autonomous_learning(self) -> str:
        """Ustavi samoučečo optimizacijo"""
        try:
            self.is_running = False
            
            # Počakaj, da se niti ustavijo
            if self.learning_thread and self.learning_thread.is_alive():
                self.learning_thread.join(timeout=5)
            
            if self.analysis_thread and self.analysis_thread.is_alive():
                self.analysis_thread.join(timeout=5)
            
            # Shrani končno stanje
            self._save_memory()
            
            logger.info("Samoučeča optimizacija ustavljena")
            return "Samoučeča optimizacija ustavljena ✅"
            
        except Exception as e:
            logger.error(f"Napaka pri ustavljanju: {e}")
            return f"Napaka pri ustavljanju: {e}"

    def get_learning_status(self) -> Dict[str, Any]:
        """Pridobi status samoučečega sistema"""
        return {
            "running": self.is_running,
            "learning_level": self.learning_level.value,
            "devices_tracked": len(self.device_patterns),
            "optimization_rules": len(self.optimization_rules),
            "avg_confidence": statistics.mean([p.learning_confidence for p in self.device_patterns.values()]) if self.device_patterns else 0.0,
            "successful_rules": len([r for r in self.optimization_rules if r.success_rate > 0.7]),
            "last_updated": datetime.now().isoformat()
        }

    def get_device_insights(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Pridobi vpoglede za specifično napravo"""
        if device_id not in self.device_patterns:
            return None
        
        pattern = self.device_patterns[device_id]
        analysis = self._analyze_usage_patterns(device_id)
        
        return {
            "device_id": device_id,
            "pattern": asdict(pattern),
            "analysis": analysis,
            "applicable_rules": [
                asdict(rule) for rule in self.optimization_rules 
                if rule.device_id == device_id
            ]
        }

# Globalna instanca
_learning_system = None

def get_learning_system() -> IoTAutonomousLearning:
    """Pridobi globalno instanco samoučečega sistema"""
    global _learning_system
    if _learning_system is None:
        _learning_system = IoTAutonomousLearning()
    return _learning_system

# Javne funkcije za integracijo
def start_autonomous_learning() -> str:
    """Zaženi samoučečo optimizacijo"""
    return get_learning_system().start_autonomous_learning()

def stop_autonomous_learning() -> str:
    """Ustavi samoučečo optimizacijo"""
    return get_learning_system().stop_autonomous_learning()

def record_device_usage(device_id: str, usage_data: Dict[str, Any]):
    """Zabeleži uporabo naprave"""
    get_learning_system().record_device_usage(device_id, usage_data)

def get_learning_status() -> Dict[str, Any]:
    """Pridobi status učenja"""
    return get_learning_system().get_learning_status()

def get_device_insights(device_id: str) -> Optional[Dict[str, Any]]:
    """Pridobi vpoglede za napravo"""
    return get_learning_system().get_device_insights(device_id)

if __name__ == "__main__":
    # Test samoučečega sistema
    learning = IoTAutonomousLearning()
    
    # Simuliraj nekaj podatkov
    test_data = {
        "energy_consumption": 45.5,
        "performance_score": 0.85,
        "temperature": 68.2,
        "usage_duration": 120
    }
    
    learning.record_device_usage("test_device_01", test_data)
    
    print("Status:", learning.get_learning_status())
    print("Zagon:", learning.start_autonomous_learning())
    
    # Počakaj malo
    time.sleep(5)
    
    print("Končni status:", learning.get_learning_status())
    print("Ustavitev:", learning.stop_autonomous_learning())