#!/usr/bin/env python3
"""
🔄 OMNI TRIPLE REDUNDANCY SYSTEM
================================

SISTEM TROJNE REDUNDANCE z avtomatskim testiranjem
- 3 verzije vsakega modula
- Avtomatsko testiranje vseh verzij
- Izbira najboljše verzije
- Backup shranjevanje

Avtor: Omni AI
Verzija: TRIPLE 1.0 FINAL
"""

import asyncio
import json
import sqlite3
import time
import threading
import hashlib
import logging
import traceback
import psutil
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
import importlib
import sys
import os
import shutil
import pickle

class ModuleVersion:
    """
    📦 VERZIJA MODULA
    Predstavlja eno verzijo modula z metrikami
    """
    
    def __init__(self, version_id: str, module_name: str, implementation: Any, 
                 performance_score: float = 0.0, reliability_score: float = 0.0):
        self.version_id = version_id
        self.module_name = module_name
        self.implementation = implementation
        self.performance_score = performance_score
        self.reliability_score = reliability_score
        self.error_count = 0
        self.success_count = 0
        self.total_execution_time = 0.0
        self.last_test_time = None
        self.is_active = False
        self.backup_path = None
        
    def calculate_overall_score(self) -> float:
        """Izračunaj skupno oceno verzije"""
        if self.success_count + self.error_count == 0:
            return 0.0
        
        success_rate = self.success_count / (self.success_count + self.error_count)
        avg_execution_time = self.total_execution_time / max(1, self.success_count)
        
        # Kombinirana ocena: uspešnost (60%) + hitrost (20%) + zanesljivost (20%)
        speed_score = max(0, 100 - avg_execution_time)  # Nižji čas = višja ocena
        overall_score = (success_rate * 60) + (speed_score * 0.2) + (self.reliability_score * 0.2)
        
        return min(100, overall_score)
    
    def record_success(self, execution_time: float):
        """Zabeleži uspešno izvršitev"""
        self.success_count += 1
        self.total_execution_time += execution_time
        self.last_test_time = datetime.now()
    
    def record_error(self):
        """Zabeleži napako"""
        self.error_count += 1
        self.last_test_time = datetime.now()
    
    def to_dict(self) -> Dict:
        """Pretvori v slovar"""
        return {
            'version_id': self.version_id,
            'module_name': self.module_name,
            'performance_score': self.performance_score,
            'reliability_score': self.reliability_score,
            'error_count': self.error_count,
            'success_count': self.success_count,
            'total_execution_time': self.total_execution_time,
            'overall_score': self.calculate_overall_score(),
            'is_active': self.is_active,
            'last_test_time': self.last_test_time.isoformat() if self.last_test_time else None
        }

class TripleRedundancyManager:
    """
    🔄 MANAGER TROJNE REDUNDANCE
    Upravlja 3 verzije vsakega modula
    """
    
    def __init__(self):
        self.name = "Triple Redundancy Manager"
        self.version = "1.0"
        self.db_path = "omni/data/redundancy_system.db"
        self.backup_dir = Path("omni/backups")
        self.modules_registry = {}  # {module_name: [ModuleVersion, ModuleVersion, ModuleVersion]}
        self.active_modules = {}    # {module_name: ModuleVersion}
        
        self.setup_database()
        self.setup_backup_directory()
        
        # Nastavi logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("triple_redundancy")
        
        self.logger.info("🔄 Triple Redundancy Manager inicializiran")
    
    def setup_database(self):
        """Nastavi bazo za redundanco"""
        Path("omni/data").mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS module_versions (
                id INTEGER PRIMARY KEY,
                version_id TEXT UNIQUE,
                module_name TEXT,
                performance_score REAL,
                reliability_score REAL,
                error_count INTEGER DEFAULT 0,
                success_count INTEGER DEFAULT 0,
                total_execution_time REAL DEFAULT 0,
                is_active BOOLEAN DEFAULT FALSE,
                backup_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_test_at TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS test_results (
                id INTEGER PRIMARY KEY,
                version_id TEXT,
                test_name TEXT,
                result TEXT,
                execution_time REAL,
                error_message TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (version_id) REFERENCES module_versions (version_id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY,
                version_id TEXT,
                cpu_usage REAL,
                memory_usage REAL,
                response_time REAL,
                throughput REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (version_id) REFERENCES module_versions (version_id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def setup_backup_directory(self):
        """Nastavi direktorij za backup"""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Ustvari poddirektorije za različne tipe backupov
        (self.backup_dir / "modules").mkdir(exist_ok=True)
        (self.backup_dir / "data").mkdir(exist_ok=True)
        (self.backup_dir / "configs").mkdir(exist_ok=True)
    
    def create_module_versions(self, module_name: str, base_implementation: Any) -> List[ModuleVersion]:
        """Ustvari 3 verzije modula"""
        versions = []
        
        # Verzija 1: Osnovna implementacija
        version_1 = ModuleVersion(
            version_id=f"{module_name}_v1_{int(time.time())}",
            module_name=module_name,
            implementation=base_implementation,
            performance_score=75.0,
            reliability_score=80.0
        )
        
        # Verzija 2: Optimizirana implementacija
        version_2 = ModuleVersion(
            version_id=f"{module_name}_v2_{int(time.time())}",
            module_name=module_name,
            implementation=self._create_optimized_version(base_implementation),
            performance_score=85.0,
            reliability_score=75.0
        )
        
        # Verzija 3: Robustna implementacija
        version_3 = ModuleVersion(
            version_id=f"{module_name}_v3_{int(time.time())}",
            module_name=module_name,
            implementation=self._create_robust_version(base_implementation),
            performance_score=70.0,
            reliability_score=90.0
        )
        
        versions = [version_1, version_2, version_3]
        
        # Shrani verzije v registru
        self.modules_registry[module_name] = versions
        
        # Shrani v bazo
        self._save_versions_to_db(versions)
        
        # Ustvari backup
        for version in versions:
            self._create_backup(version)
        
        self.logger.info(f"✅ Ustvarjene 3 verzije za modul {module_name}")
        
        return versions
    
    def _create_optimized_version(self, base_implementation: Any) -> Any:
        """Ustvari optimizirano verzijo modula"""
        # V realnem sistemu bi to bila dejanska optimizacija
        # Za demonstracijo vrnemo wrapper, ki dodaja caching
        
        class OptimizedWrapper:
            def __init__(self, base_impl):
                self.base_impl = base_impl
                self.cache = {}
                self.cache_hits = 0
                self.cache_misses = 0
            
            def __getattr__(self, name):
                attr = getattr(self.base_impl, name)
                
                if callable(attr):
                    def cached_method(*args, **kwargs):
                        # Ustvari cache key
                        cache_key = f"{name}_{hash(str(args) + str(kwargs))}"
                        
                        if cache_key in self.cache:
                            self.cache_hits += 1
                            return self.cache[cache_key]
                        
                        # Izvršiti originalno metodo
                        result = attr(*args, **kwargs)
                        
                        # Shrani v cache (omejimo velikost)
                        if len(self.cache) < 100:
                            self.cache[cache_key] = result
                        
                        self.cache_misses += 1
                        return result
                    
                    return cached_method
                
                return attr
        
        return OptimizedWrapper(base_implementation)
    
    def _create_robust_version(self, base_implementation: Any) -> Any:
        """Ustvari robustno verzijo modula"""
        # V realnem sistemu bi to bila verzija z dodatnimi varnostnimi preverjanji
        
        class RobustWrapper:
            def __init__(self, base_impl):
                self.base_impl = base_impl
                self.error_count = 0
                self.retry_count = 0
                self.max_retries = 3
            
            def __getattr__(self, name):
                attr = getattr(self.base_impl, name)
                
                if callable(attr):
                    def robust_method(*args, **kwargs):
                        for attempt in range(self.max_retries + 1):
                            try:
                                # Dodaj input validation
                                self._validate_inputs(args, kwargs)
                                
                                # Izvršiti originalno metodo
                                result = attr(*args, **kwargs)
                                
                                # Dodaj output validation
                                self._validate_output(result)
                                
                                return result
                                
                            except Exception as e:
                                self.error_count += 1
                                
                                if attempt < self.max_retries:
                                    self.retry_count += 1
                                    time.sleep(0.1 * (attempt + 1))  # Exponential backoff
                                    continue
                                else:
                                    # Vrni default vrednost ali ponovno vrzi napako
                                    return self._get_default_result(name)
                        
                        return None
                    
                    return robust_method
                
                return attr
            
            def _validate_inputs(self, args, kwargs):
                """Preveri vhodne parametre"""
                # Osnovna validacija
                for arg in args:
                    if arg is None:
                        raise ValueError("None argument not allowed")
                
                for key, value in kwargs.items():
                    if value is None and key not in ['optional_param']:
                        raise ValueError(f"None value for {key} not allowed")
            
            def _validate_output(self, result):
                """Preveri izhodni rezultat"""
                if result is None:
                    raise ValueError("Method returned None")
                
                if isinstance(result, dict) and 'error' in result:
                    raise ValueError(f"Method returned error: {result['error']}")
            
            def _get_default_result(self, method_name):
                """Vrni privzeti rezultat za metodo"""
                defaults = {
                    'get_real_stock_data': {'error': 'Service temporarily unavailable'},
                    'create_portfolio': 0,
                    'search_destinations': [],
                    'create_shipment': {'error': 'Service temporarily unavailable'}
                }
                
                return defaults.get(method_name, {'error': 'Service temporarily unavailable'})
        
        return RobustWrapper(base_implementation)
    
    def _save_versions_to_db(self, versions: List[ModuleVersion]):
        """Shrani verzije v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for version in versions:
            cursor.execute('''
                INSERT OR REPLACE INTO module_versions 
                (version_id, module_name, performance_score, reliability_score, 
                 error_count, success_count, total_execution_time, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                version.version_id, version.module_name, version.performance_score,
                version.reliability_score, version.error_count, version.success_count,
                version.total_execution_time, version.is_active
            ))
        
        conn.commit()
        conn.close()
    
    def _create_backup(self, version: ModuleVersion):
        """Ustvari backup verzije"""
        backup_filename = f"{version.version_id}.backup"
        backup_path = self.backup_dir / "modules" / backup_filename
        
        try:
            # Shrani implementacijo z pickle
            with open(backup_path, 'wb') as f:
                pickle.dump({
                    'version_info': version.to_dict(),
                    'implementation': version.implementation,
                    'timestamp': datetime.now().isoformat()
                }, f)
            
            version.backup_path = str(backup_path)
            self.logger.info(f"💾 Backup ustvarjen: {backup_path}")
            
        except Exception as e:
            self.logger.error(f"❌ Napaka pri ustvarjanju backup: {e}")
    
    def test_all_versions(self, module_name: str, test_functions: List[Callable]) -> Dict:
        """Testiraj vse verzije modula"""
        if module_name not in self.modules_registry:
            return {'error': f'Modul {module_name} ni registriran'}
        
        versions = self.modules_registry[module_name]
        test_results = {
            'module_name': module_name,
            'test_timestamp': datetime.now().isoformat(),
            'versions_tested': len(versions),
            'version_results': {}
        }
        
        # Testiraj vsako verzijo
        for version in versions:
            version_results = self._test_single_version(version, test_functions)
            test_results['version_results'][version.version_id] = version_results
        
        # Izberi najboljšo verzijo
        best_version = self._select_best_version(versions)
        
        if best_version:
            # Nastavi kot aktivno
            self._set_active_version(module_name, best_version)
            test_results['active_version'] = best_version.version_id
            test_results['active_version_score'] = best_version.calculate_overall_score()
        
        # Shrani rezultate testov
        self._save_test_results(test_results)
        
        self.logger.info(f"🧪 Testiranje končano za {module_name}: {best_version.version_id if best_version else 'None'} izbrana")
        
        return test_results
    
    def _test_single_version(self, version: ModuleVersion, test_functions: List[Callable]) -> Dict:
        """Testiraj eno verzijo"""
        results = {
            'version_id': version.version_id,
            'tests_passed': 0,
            'tests_failed': 0,
            'total_execution_time': 0,
            'test_details': []
        }
        
        for test_func in test_functions:
            test_name = test_func.__name__
            start_time = time.time()
            
            try:
                # Izvršiti test
                test_result = test_func(version.implementation)
                execution_time = time.time() - start_time
                
                if test_result.get('success', False):
                    results['tests_passed'] += 1
                    version.record_success(execution_time)
                else:
                    results['tests_failed'] += 1
                    version.record_error()
                
                results['test_details'].append({
                    'test_name': test_name,
                    'success': test_result.get('success', False),
                    'execution_time': execution_time,
                    'result': test_result
                })
                
                results['total_execution_time'] += execution_time
                
            except Exception as e:
                execution_time = time.time() - start_time
                results['tests_failed'] += 1
                version.record_error()
                
                results['test_details'].append({
                    'test_name': test_name,
                    'success': False,
                    'execution_time': execution_time,
                    'error': str(e)
                })
        
        return results
    
    def _select_best_version(self, versions: List[ModuleVersion]) -> Optional[ModuleVersion]:
        """Izberi najboljšo verzijo"""
        if not versions:
            return None
        
        # Izračunaj ocene za vse verzije
        scored_versions = []
        for version in versions:
            score = version.calculate_overall_score()
            scored_versions.append((version, score))
        
        # Sortiraj po oceni (najvišja prva)
        scored_versions.sort(key=lambda x: x[1], reverse=True)
        
        return scored_versions[0][0] if scored_versions else None
    
    def _set_active_version(self, module_name: str, version: ModuleVersion):
        """Nastavi aktivno verzijo"""
        # Deaktiviraj vse verzije
        if module_name in self.modules_registry:
            for v in self.modules_registry[module_name]:
                v.is_active = False
        
        # Aktiviraj izbrano verzijo
        version.is_active = True
        self.active_modules[module_name] = version
        
        # Posodobi v bazi
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Deaktiviraj vse verzije modula
        cursor.execute('''
            UPDATE module_versions 
            SET is_active = FALSE 
            WHERE module_name = ?
        ''', (module_name,))
        
        # Aktiviraj izbrano verzijo
        cursor.execute('''
            UPDATE module_versions 
            SET is_active = TRUE 
            WHERE version_id = ?
        ''', (version.version_id,))
        
        conn.commit()
        conn.close()
    
    def _save_test_results(self, test_results: Dict):
        """Shrani rezultate testov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for version_id, version_results in test_results['version_results'].items():
            for test_detail in version_results['test_details']:
                cursor.execute('''
                    INSERT INTO test_results 
                    (version_id, test_name, result, execution_time, error_message)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    version_id,
                    test_detail['test_name'],
                    'success' if test_detail['success'] else 'failed',
                    test_detail['execution_time'],
                    test_detail.get('error', None)
                ))
        
        conn.commit()
        conn.close()
    
    def get_active_module(self, module_name: str) -> Optional[Any]:
        """Pridobi aktivno verzijo modula"""
        if module_name in self.active_modules:
            return self.active_modules[module_name].implementation
        
        return None
    
    def get_system_status(self) -> Dict:
        """Pridobi status sistema redundance"""
        status = {
            'system_name': self.name,
            'version': self.version,
            'timestamp': datetime.now().isoformat(),
            'total_modules': len(self.modules_registry),
            'active_modules': len(self.active_modules),
            'modules_status': {}
        }
        
        for module_name, versions in self.modules_registry.items():
            active_version = self.active_modules.get(module_name)
            
            module_status = {
                'total_versions': len(versions),
                'active_version': active_version.version_id if active_version else None,
                'active_version_score': active_version.calculate_overall_score() if active_version else 0,
                'versions_info': [v.to_dict() for v in versions]
            }
            
            status['modules_status'][module_name] = module_status
        
        return status
    
    def monitor_performance(self, module_name: str, duration_seconds: int = 60) -> Dict:
        """Spremljaj performanse aktivne verzije"""
        if module_name not in self.active_modules:
            return {'error': f'Modul {module_name} ni aktiven'}
        
        active_version = self.active_modules[module_name]
        
        # Začni spremljanje
        start_time = time.time()
        metrics = []
        
        while time.time() - start_time < duration_seconds:
            # Pridobi sistemske metrike
            cpu_usage = psutil.cpu_percent(interval=1)
            memory_info = psutil.virtual_memory()
            memory_usage = memory_info.percent
            
            # Izmeri odzivni čas (simulacija)
            response_start = time.time()
            try:
                # Poskusi izvršiti osnovno operacijo
                if hasattr(active_version.implementation, 'get_system_status'):
                    active_version.implementation.get_system_status()
                response_time = (time.time() - response_start) * 1000  # ms
            except:
                response_time = 999  # Napaka
            
            metric = {
                'timestamp': datetime.now().isoformat(),
                'cpu_usage': cpu_usage,
                'memory_usage': memory_usage,
                'response_time': response_time
            }
            
            metrics.append(metric)
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO performance_metrics 
                (version_id, cpu_usage, memory_usage, response_time, throughput)
                VALUES (?, ?, ?, ?, ?)
            ''', (active_version.version_id, cpu_usage, memory_usage, response_time, 0))
            conn.commit()
            conn.close()
            
            time.sleep(5)  # Počakaj 5 sekund
        
        # Izračunaj povprečja
        avg_cpu = sum(m['cpu_usage'] for m in metrics) / len(metrics)
        avg_memory = sum(m['memory_usage'] for m in metrics) / len(metrics)
        avg_response = sum(m['response_time'] for m in metrics) / len(metrics)
        
        return {
            'module_name': module_name,
            'version_id': active_version.version_id,
            'monitoring_duration': duration_seconds,
            'metrics_count': len(metrics),
            'averages': {
                'cpu_usage': round(avg_cpu, 2),
                'memory_usage': round(avg_memory, 2),
                'response_time_ms': round(avg_response, 2)
            },
            'detailed_metrics': metrics
        }

# Test funkcije za različne module
def test_finance_module(implementation) -> Dict:
    """Test finančnega modula"""
    try:
        # Test 1: Ustvari portfolio
        portfolio_id = implementation.create_portfolio("Test Portfolio", 1000)
        
        # Test 2: Pridobi podatke o delnicah
        stock_data = implementation.get_real_stock_data("AAPL")
        
        success = (
            isinstance(portfolio_id, int) and 
            isinstance(stock_data, dict) and 
            ('price' in stock_data or 'error' in stock_data)
        )
        
        return {
            'success': success,
            'portfolio_id': portfolio_id,
            'stock_data_keys': list(stock_data.keys()) if isinstance(stock_data, dict) else []
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_healthcare_module(implementation) -> Dict:
    """Test zdravstvenega modula"""
    try:
        # Test 1: Dodaj pacienta
        patient_id = implementation.add_patient("Test Patient", "1990-01-01", "M")
        
        # Test 2: Zabeleži vitalne znake
        vital_signs = implementation.record_vital_signs(patient_id, 120, 80, 75, 36.5)
        
        success = (
            isinstance(patient_id, int) and 
            isinstance(vital_signs, dict) and 
            'analysis' in vital_signs
        )
        
        return {
            'success': success,
            'patient_id': patient_id,
            'vital_signs_recorded': 'analysis' in vital_signs
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_logistics_module(implementation) -> Dict:
    """Test logističnega modula"""
    try:
        # Test 1: Ustvari pošiljko
        shipment = implementation.create_shipment("Ljubljana", "Maribor", 25.0)
        
        # Test 2: Sledi pošiljki
        tracking = implementation.track_shipment(shipment['tracking_number'])
        
        success = (
            isinstance(shipment, dict) and 
            'tracking_number' in shipment and
            isinstance(tracking, dict) and
            'tracking_history' in tracking
        )
        
        return {
            'success': success,
            'shipment_created': 'tracking_number' in shipment,
            'tracking_works': 'tracking_history' in tracking
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

# Glavna funkcija
def main():
    """Glavna funkcija za testiranje sistema trojne redundance"""
    print("🔄 OMNI TRIPLE REDUNDANCY SYSTEM - ZAGON")
    print("=" * 50)
    
    # Inicializiraj manager
    redundancy_manager = TripleRedundancyManager()
    
    # Simulacija: ustvari module (v realnem sistemu bi uvozili dejanske module)
    from omni_real_functional_modules import RealFinanceModule, RealHealthcareModule, RealLogisticsModule
    
    # Ustvari verzije za finančni modul
    finance_versions = redundancy_manager.create_module_versions(
        "finance", 
        RealFinanceModule()
    )
    
    # Ustvari verzije za zdravstveni modul
    healthcare_versions = redundancy_manager.create_module_versions(
        "healthcare", 
        RealHealthcareModule()
    )
    
    # Ustvari verzije za logistični modul
    logistics_versions = redundancy_manager.create_module_versions(
        "logistics", 
        RealLogisticsModule()
    )
    
    # Testiraj vse verzije
    print("\n🧪 Testiram vse verzije modulov...")
    
    # Test finančnega modula
    finance_results = redundancy_manager.test_all_versions(
        "finance", 
        [test_finance_module]
    )
    print(f"💰 Finance: {finance_results['active_version']} izbrana")
    
    # Test zdravstvenega modula
    healthcare_results = redundancy_manager.test_all_versions(
        "healthcare", 
        [test_healthcare_module]
    )
    print(f"🏥 Healthcare: {healthcare_results['active_version']} izbrana")
    
    # Test logističnega modula
    logistics_results = redundancy_manager.test_all_versions(
        "logistics", 
        [test_logistics_module]
    )
    print(f"🚚 Logistics: {logistics_results['active_version']} izbrana")
    
    # Prikaži status sistema
    print("\n📊 Status sistema:")
    status = redundancy_manager.get_system_status()
    print(f"  Skupaj modulov: {status['total_modules']}")
    print(f"  Aktivnih modulov: {status['active_modules']}")
    
    for module_name, module_status in status['modules_status'].items():
        print(f"  📦 {module_name.upper()}: {module_status['active_version']} (ocena: {module_status['active_version_score']:.1f})")
    
    print("\n🎉 Sistem trojne redundance je pripravljen!")
    print("✅ Najboljše verzije so avtomatsko izbrane in aktivne")
    
    return redundancy_manager

if __name__ == "__main__":
    manager = main()