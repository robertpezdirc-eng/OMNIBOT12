#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌍 Omni Global Autonomous Optimizer
===================================

Globalni avtonomni optimizator, ki koordinira vse panoge in procese:
- IoT in industrija
- Finance in računovodstvo  
- Logistika in transport
- Zdravstvo in wellness
- Turizem in gostinstvo
- Kmetijstvo in živinoreja
- Energetika in trajnostni razvoj
- Varnost in nadzor

Avtor: Omni AI Assistant
Datum: 22. september 2025
Verzija: 1.0 Global Production
"""

import threading
import time
import json
import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import statistics
import traceback

# Konfiguracija
GLOBAL_DB = "omni/data/global_optimizer.db"
GLOBAL_LOG = "omni/logs/global_optimizer.log"
GLOBAL_CONFIG = "omni/data/global_config.json"
OPTIMIZATION_INTERVAL = 300  # 5 minut
CRITICAL_INTERVAL = 60      # 1 minuta za kritične sisteme
LEARNING_THRESHOLD = 0.85   # 85% uspešnost za napredovanje

# Logging setup
os.makedirs(os.path.dirname(GLOBAL_LOG), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(GLOBAL_LOG, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def __name__():
    return "global_optimizer"

class OptimizationLevel(Enum):
    """Nivoji optimizacije"""
    BASIC = "basic"
    ADVANCED = "advanced"
    EXPERT = "expert"
    AUTONOMOUS = "autonomous"

class DomainStatus(Enum):
    """Status posamezne panoge"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    OPTIMIZING = "optimizing"
    CRITICAL = "critical"

class Priority(Enum):
    """Prioritete optimizacije"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4
    EMERGENCY = 5

@dataclass
class DomainMetrics:
    """Metriki posamezne panoge"""
    domain: str
    status: DomainStatus
    efficiency: float
    cost_savings: float
    energy_usage: float
    performance_score: float
    last_optimization: datetime
    optimization_count: int
    error_count: int
    uptime_percentage: float

@dataclass
class GlobalOptimizationResult:
    """Rezultat globalne optimizacije"""
    timestamp: datetime
    total_domains: int
    optimized_domains: int
    failed_domains: int
    total_savings: float
    energy_reduction: float
    efficiency_improvement: float
    critical_issues: List[str]
    recommendations: List[str]

class GlobalOptimizer:
    """
    🌍 Globalni avtonomni optimizator Omni
    
    Koordinira vse panoge in procese za maksimalno učinkovitost
    """
    
    def __init__(self):
        self.domains = {
            "iot_autonomous_learning": {"priority": Priority.HIGH, "critical": True},
            "finance_optimizer": {"priority": Priority.HIGH, "critical": True},
            "logistics_optimizer": {"priority": Priority.MEDIUM, "critical": False},
            "healthcare_assistant": {"priority": Priority.HIGH, "critical": True},
            "tourism_planner": {"priority": Priority.LOW, "critical": False},
            "energy_manager": {"priority": Priority.HIGH, "critical": True},
            "agriculture_support": {"priority": Priority.MEDIUM, "critical": False},
            "security_monitor": {"priority": Priority.CRITICAL, "critical": True},
            "education_system": {"priority": Priority.MEDIUM, "critical": False}
        }
        
        self.optimization_level = OptimizationLevel.BASIC
        self.is_running = False
        self.optimization_thread = None
        self.critical_thread = None
        self.domain_metrics = {}
        self.global_config = self._load_global_config()
        self.optimization_history = []
        
        # Inicializacija baze podatkov
        self._init_database()
        
        logger.info("🌍 Globalni optimizator Omni inicializiran")
    
    def _load_global_config(self) -> Dict[str, Any]:
        """Naloži globalno konfiguracijo"""
        default_config = {
            "auto_optimization": True,
            "learning_enabled": True,
            "critical_monitoring": True,
            "max_cost_per_optimization": 1000.0,
            "min_efficiency_threshold": 0.7,
            "emergency_contacts": [],
            "backup_systems": True,
            "audit_logging": True
        }
        
        try:
            if os.path.exists(GLOBAL_CONFIG):
                with open(GLOBAL_CONFIG, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    return {**default_config, **config}
        except Exception as e:
            logger.warning(f"Napaka pri nalaganju konfiguracije: {e}")
        
        return default_config
    
    def _save_global_config(self):
        """Shrani globalno konfiguracijo"""
        try:
            os.makedirs(os.path.dirname(GLOBAL_CONFIG), exist_ok=True)
            with open(GLOBAL_CONFIG, 'w', encoding='utf-8') as f:
                json.dump(self.global_config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju konfiguracije: {e}")
    
    def _init_database(self):
        """Inicializacija baze podatkov"""
        try:
            os.makedirs(os.path.dirname(GLOBAL_DB), exist_ok=True)
            conn = sqlite3.connect(GLOBAL_DB)
            cursor = conn.cursor()
            
            # Tabela za metriki panog
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS domain_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    status TEXT NOT NULL,
                    efficiency REAL NOT NULL,
                    cost_savings REAL NOT NULL,
                    energy_usage REAL NOT NULL,
                    performance_score REAL NOT NULL,
                    optimization_count INTEGER NOT NULL,
                    error_count INTEGER NOT NULL,
                    uptime_percentage REAL NOT NULL
                )
            ''')
            
            # Tabela za globalne optimizacije
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS global_optimizations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    total_domains INTEGER NOT NULL,
                    optimized_domains INTEGER NOT NULL,
                    failed_domains INTEGER NOT NULL,
                    total_savings REAL NOT NULL,
                    energy_reduction REAL NOT NULL,
                    efficiency_improvement REAL NOT NULL,
                    critical_issues TEXT,
                    recommendations TEXT
                )
            ''')
            
            # Tabela za avtonomne odločitve
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS autonomous_decisions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    decision_type TEXT NOT NULL,
                    action_taken TEXT NOT NULL,
                    reasoning TEXT NOT NULL,
                    impact_score REAL NOT NULL,
                    success BOOLEAN NOT NULL
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("✅ Baza podatkov globalnega optimizatorja inicializirana")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji baze: {e}")
    
    def register_domain_module(self, domain_name: str, module_instance):
        """Registrira modul panoge"""
        try:
            if hasattr(module_instance, 'auto_optimize'):
                self.domains[domain_name]["module"] = module_instance
                logger.info(f"✅ Registriran modul: {domain_name}")
                return True
            else:
                logger.warning(f"⚠️ Modul {domain_name} nima auto_optimize metode")
                return False
        except Exception as e:
            logger.error(f"❌ Napaka pri registraciji modula {domain_name}: {e}")
            return False
    
    def optimize_domain(self, domain_name: str) -> Dict[str, Any]:
        """Optimizira posamezno panogo"""
        try:
            if domain_name not in self.domains:
                return {"success": False, "error": f"Neznana panoga: {domain_name}"}
            
            domain_config = self.domains[domain_name]
            
            # Preveri, če je modul registriran
            if "module" not in domain_config:
                return {"success": False, "error": f"Modul {domain_name} ni registriran"}
            
            module = domain_config["module"]
            
            # Izvedi optimizacijo
            start_time = time.time()
            result = module.auto_optimize()
            optimization_time = time.time() - start_time
            
            # Posodobi metriki
            self._update_domain_metrics(domain_name, result, optimization_time)
            
            logger.info(f"✅ {domain_name} optimiziran: {result}")
            return {"success": True, "result": result, "time": optimization_time}
            
        except Exception as e:
            error_msg = f"Napaka pri optimizaciji {domain_name}: {str(e)}"
            logger.error(f"❌ {error_msg}")
            self._record_domain_error(domain_name, error_msg)
            return {"success": False, "error": error_msg}
    
    def _update_domain_metrics(self, domain_name: str, result: Dict[str, Any], optimization_time: float):
        """Posodobi metriki panoge"""
        try:
            # Izračunaj metriki na podlagi rezultata
            efficiency = result.get("efficiency", 0.8)
            cost_savings = result.get("cost_savings", 0.0)
            energy_usage = result.get("energy_usage", 100.0)
            performance_score = result.get("performance_score", 0.75)
            
            # Ustvari metriki objekt
            metrics = DomainMetrics(
                domain=domain_name,
                status=DomainStatus.ACTIVE,
                efficiency=efficiency,
                cost_savings=cost_savings,
                energy_usage=energy_usage,
                performance_score=performance_score,
                last_optimization=datetime.now(),
                optimization_count=self.domain_metrics.get(domain_name, {}).get("optimization_count", 0) + 1,
                error_count=self.domain_metrics.get(domain_name, {}).get("error_count", 0),
                uptime_percentage=99.5
            )
            
            # Shrani v spomin
            self.domain_metrics[domain_name] = asdict(metrics)
            
            # Shrani v bazo
            self._save_domain_metrics(metrics)
            
        except Exception as e:
            logger.error(f"❌ Napaka pri posodabljanju metrik {domain_name}: {e}")
    
    def _save_domain_metrics(self, metrics: DomainMetrics):
        """Shrani metriki panoge v bazo"""
        try:
            conn = sqlite3.connect(GLOBAL_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO domain_metrics 
                (timestamp, domain, status, efficiency, cost_savings, energy_usage, 
                 performance_score, optimization_count, error_count, uptime_percentage)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                metrics.domain,
                metrics.status.value,
                metrics.efficiency,
                metrics.cost_savings,
                metrics.energy_usage,
                metrics.performance_score,
                metrics.optimization_count,
                metrics.error_count,
                metrics.uptime_percentage
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju metrik: {e}")
    
    def _record_domain_error(self, domain_name: str, error_msg: str):
        """Zabeleži napako panoge"""
        try:
            if domain_name in self.domain_metrics:
                self.domain_metrics[domain_name]["error_count"] += 1
                self.domain_metrics[domain_name]["status"] = DomainStatus.ERROR.value
            
            logger.error(f"🚨 Napaka v panogi {domain_name}: {error_msg}")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri beleženju napake: {e}")
    
    def optimize_world(self):
        """
        🌍 Glavna zanka globalne optimizacije
        
        Izvaja optimizacijo vseh panog v rednih intervalih
        """
        logger.info("🌍 Začenjam globalno optimizacijo sveta...")
        
        while self.is_running:
            try:
                start_time = time.time()
                now = datetime.now()
                
                logger.info(f"[{now.isoformat()}] 🌍 Omni izvaja globalno optimizacijo...")
                
                # Statistike optimizacije
                total_domains = len(self.domains)
                optimized_domains = 0
                failed_domains = 0
                total_savings = 0.0
                energy_reduction = 0.0
                critical_issues = []
                recommendations = []
                
                # Optimiziraj vsako panogo
                for domain_name, domain_config in self.domains.items():
                    try:
                        result = self.optimize_domain(domain_name)
                        
                        if result["success"]:
                            optimized_domains += 1
                            if "result" in result and isinstance(result["result"], dict):
                                total_savings += result["result"].get("cost_savings", 0.0)
                                energy_reduction += result["result"].get("energy_reduction", 0.0)
                        else:
                            failed_domains += 1
                            if domain_config.get("critical", False):
                                critical_issues.append(f"Kritična panoga {domain_name}: {result.get('error', 'Neznana napaka')}")
                    
                    except Exception as e:
                        failed_domains += 1
                        error_msg = f"Napaka v {domain_name}: {str(e)}"
                        logger.error(f"❌ {error_msg}")
                        if domain_config.get("critical", False):
                            critical_issues.append(error_msg)
                
                # Izračunaj izboljšanje učinkovitosti
                efficiency_improvement = self._calculate_efficiency_improvement()
                
                # Generiraj priporočila
                recommendations = self._generate_recommendations()
                
                # Ustvari rezultat globalne optimizacije
                global_result = GlobalOptimizationResult(
                    timestamp=now,
                    total_domains=total_domains,
                    optimized_domains=optimized_domains,
                    failed_domains=failed_domains,
                    total_savings=total_savings,
                    energy_reduction=energy_reduction,
                    efficiency_improvement=efficiency_improvement,
                    critical_issues=critical_issues,
                    recommendations=recommendations
                )
                
                # Shrani rezultat
                self._save_global_optimization(global_result)
                self.optimization_history.append(asdict(global_result))
                
                # Prikaži rezultate
                optimization_time = time.time() - start_time
                logger.info(f"✅ Globalna optimizacija dokončana v {optimization_time:.2f}s")
                logger.info(f"📊 Optimizirane panoge: {optimized_domains}/{total_domains}")
                logger.info(f"💰 Skupni prihranki: {total_savings:.2f}€")
                logger.info(f"⚡ Zmanjšanje energije: {energy_reduction:.2f}kWh")
                
                if critical_issues:
                    logger.warning(f"🚨 Kritične težave: {len(critical_issues)}")
                    for issue in critical_issues:
                        logger.warning(f"   - {issue}")
                
                # Avtonomno učenje in prilagajanje
                self._autonomous_learning()
                
                # Počakaj do naslednje optimizacije
                time.sleep(OPTIMIZATION_INTERVAL)
                
            except Exception as e:
                logger.error(f"❌ Kritična napaka v globalni optimizaciji: {e}")
                logger.error(traceback.format_exc())
                time.sleep(60)  # Počakaj minuto pred ponovnim poskusom
    
    def _calculate_efficiency_improvement(self) -> float:
        """Izračuna izboljšanje učinkovitosti"""
        try:
            if not self.domain_metrics:
                return 0.0
            
            efficiencies = [metrics.get("efficiency", 0.0) for metrics in self.domain_metrics.values()]
            return statistics.mean(efficiencies) if efficiencies else 0.0
            
        except Exception as e:
            logger.error(f"❌ Napaka pri izračunu učinkovitosti: {e}")
            return 0.0
    
    def _generate_recommendations(self) -> List[str]:
        """Generiraj priporočila za izboljšave"""
        recommendations = []
        
        try:
            # Analiziraj metriki in generiraj priporočila
            for domain_name, metrics in self.domain_metrics.items():
                efficiency = metrics.get("efficiency", 0.0)
                error_count = metrics.get("error_count", 0)
                
                if efficiency < 0.7:
                    recommendations.append(f"Izboljšaj učinkovitost panoge {domain_name} (trenutno {efficiency:.1%})")
                
                if error_count > 5:
                    recommendations.append(f"Preglej napake v panogi {domain_name} ({error_count} napak)")
            
            # Splošna priporočila
            if len(self.domain_metrics) < len(self.domains):
                recommendations.append("Registriraj manjkajoče module panog")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Napaka pri generiranju priporočil: {e}")
            return ["Preveri sistem za napake"]
    
    def _save_global_optimization(self, result: GlobalOptimizationResult):
        """Shrani rezultat globalne optimizacije"""
        try:
            conn = sqlite3.connect(GLOBAL_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO global_optimizations 
                (timestamp, total_domains, optimized_domains, failed_domains, 
                 total_savings, energy_reduction, efficiency_improvement, 
                 critical_issues, recommendations)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                result.timestamp.isoformat(),
                result.total_domains,
                result.optimized_domains,
                result.failed_domains,
                result.total_savings,
                result.energy_reduction,
                result.efficiency_improvement,
                json.dumps(result.critical_issues),
                json.dumps(result.recommendations)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju globalne optimizacije: {e}")
    
    def _autonomous_learning(self):
        """Avtonomno učenje in prilagajanje"""
        try:
            # Analiziraj uspešnost optimizacij
            if len(self.optimization_history) >= 10:
                recent_results = self.optimization_history[-10:]
                success_rate = sum(1 for r in recent_results if r["failed_domains"] == 0) / len(recent_results)
                
                # Napreduj nivo optimizacije, če je uspešnost visoka
                if success_rate >= LEARNING_THRESHOLD:
                    if self.optimization_level == OptimizationLevel.BASIC:
                        self.optimization_level = OptimizationLevel.ADVANCED
                        logger.info("🧠 Napredoval na ADVANCED nivo optimizacije")
                    elif self.optimization_level == OptimizationLevel.ADVANCED:
                        self.optimization_level = OptimizationLevel.EXPERT
                        logger.info("🧠 Napredoval na EXPERT nivo optimizacije")
                    elif self.optimization_level == OptimizationLevel.EXPERT:
                        self.optimization_level = OptimizationLevel.AUTONOMOUS
                        logger.info("🧠 Napredoval na AUTONOMOUS nivo optimizacije")
            
            # Prilagodi intervale optimizacije glede na uspešnost
            self._adjust_optimization_intervals()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri avtonomnem učenju: {e}")
    
    def _adjust_optimization_intervals(self):
        """Prilagodi intervale optimizacije"""
        try:
            # Na podlagi nivoja optimizacije prilagodi intervale
            global OPTIMIZATION_INTERVAL
            
            if self.optimization_level == OptimizationLevel.AUTONOMOUS:
                OPTIMIZATION_INTERVAL = 180  # 3 minute
            elif self.optimization_level == OptimizationLevel.EXPERT:
                OPTIMIZATION_INTERVAL = 240  # 4 minute
            elif self.optimization_level == OptimizationLevel.ADVANCED:
                OPTIMIZATION_INTERVAL = 300  # 5 minut
            else:
                OPTIMIZATION_INTERVAL = 360  # 6 minut
                
        except Exception as e:
            logger.error(f"❌ Napaka pri prilagajanju intervalov: {e}")
    
    def critical_monitoring(self):
        """
        🚨 Kritično spremljanje sistema
        
        Spremlja kritične panoge in izvaja nujne ukrepe
        """
        logger.info("🚨 Začenjam kritično spremljanje...")
        
        while self.is_running:
            try:
                # Preveri kritične panoge
                for domain_name, domain_config in self.domains.items():
                    if domain_config.get("critical", False):
                        self._check_critical_domain(domain_name)
                
                time.sleep(CRITICAL_INTERVAL)
                
            except Exception as e:
                logger.error(f"❌ Napaka v kritičnem spremljanju: {e}")
                time.sleep(30)
    
    def _check_critical_domain(self, domain_name: str):
        """Preveri kritično panogo"""
        try:
            if domain_name in self.domain_metrics:
                metrics = self.domain_metrics[domain_name]
                
                # Preveri kritične parametre
                if metrics.get("efficiency", 1.0) < 0.5:
                    self._handle_critical_issue(domain_name, "Nizka učinkovitost", "efficiency")
                
                if metrics.get("error_count", 0) > 10:
                    self._handle_critical_issue(domain_name, "Preveč napak", "errors")
                
                if metrics.get("uptime_percentage", 100.0) < 95.0:
                    self._handle_critical_issue(domain_name, "Nizka dostopnost", "uptime")
        
        except Exception as e:
            logger.error(f"❌ Napaka pri preverjanju kritične panoge {domain_name}: {e}")
    
    def _handle_critical_issue(self, domain_name: str, issue_type: str, category: str):
        """Obravnavaj kritično težavo"""
        try:
            logger.warning(f"🚨 Kritična težava v {domain_name}: {issue_type}")
            
            # Avtonomni ukrepi
            if self.optimization_level == OptimizationLevel.AUTONOMOUS:
                action_taken = self._autonomous_critical_action(domain_name, category)
            else:
                action_taken = f"Obvestilo administratorja o {issue_type}"
            
            # Zabeleži odločitev
            self._record_autonomous_decision(
                domain_name, 
                "critical_response", 
                action_taken, 
                f"Kritična težava: {issue_type}",
                0.9
            )
            
        except Exception as e:
            logger.error(f"❌ Napaka pri obravnavanju kritične težave: {e}")
    
    def _autonomous_critical_action(self, domain_name: str, category: str) -> str:
        """Izvedi avtonomni kritični ukrep"""
        try:
            if category == "efficiency":
                # Poskusi optimizirati panogo
                self.optimize_domain(domain_name)
                return f"Izvedena nujna optimizacija panoge {domain_name}"
            
            elif category == "errors":
                # Poskusi resetirati panogo
                if domain_name in self.domains and "module" in self.domains[domain_name]:
                    module = self.domains[domain_name]["module"]
                    if hasattr(module, 'reset'):
                        module.reset()
                        return f"Resetirana panoga {domain_name}"
                
                return f"Poskus resetiranja panoge {domain_name}"
            
            elif category == "uptime":
                # Poskusi restartirati panogo
                return f"Poskus restarta panoge {domain_name}"
            
            return f"Splošni kritični ukrep za {domain_name}"
            
        except Exception as e:
            logger.error(f"❌ Napaka pri avtonomnem kritičnem ukrepu: {e}")
            return f"Napaka pri ukrepu za {domain_name}"
    
    def _record_autonomous_decision(self, domain: str, decision_type: str, action: str, reasoning: str, impact: float):
        """Zabeleži avtonomno odločitev"""
        try:
            conn = sqlite3.connect(GLOBAL_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO autonomous_decisions 
                (timestamp, domain, decision_type, action_taken, reasoning, impact_score, success)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                domain,
                decision_type,
                action,
                reasoning,
                impact,
                True  # Predpostavimo uspeh, dokler ni drugače
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"📝 Zabeležena avtonomna odločitev: {action}")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri beleženju avtonomne odločitve: {e}")
    
    def start_global_optimizer(self) -> str:
        """Zaženi globalni optimizator"""
        try:
            if self.is_running:
                return "⚠️ Globalni optimizator že teče"
            
            self.is_running = True
            
            # Zaženi glavno optimizacijsko nit
            self.optimization_thread = threading.Thread(target=self.optimize_world)
            self.optimization_thread.daemon = True
            self.optimization_thread.start()
            
            # Zaženi kritično spremljanje
            if self.global_config.get("critical_monitoring", True):
                self.critical_thread = threading.Thread(target=self.critical_monitoring)
                self.critical_thread.daemon = True
                self.critical_thread.start()
            
            logger.info("🌍 Globalni avtonomni optimizator Omni zagnan")
            return "🌍 Globalni avtonomni optimizator Omni zagnan ✅"
            
        except Exception as e:
            error_msg = f"❌ Napaka pri zagonu globalnega optimizatorja: {e}"
            logger.error(error_msg)
            return error_msg
    
    def stop_global_optimizer(self) -> str:
        """Ustavi globalni optimizator"""
        try:
            self.is_running = False
            
            # Počakaj, da se niti ustavijo
            if self.optimization_thread and self.optimization_thread.is_alive():
                self.optimization_thread.join(timeout=10)
            
            if self.critical_thread and self.critical_thread.is_alive():
                self.critical_thread.join(timeout=5)
            
            logger.info("🛑 Globalni optimizator ustavljen")
            return "🛑 Globalni optimizator ustavljen ✅"
            
        except Exception as e:
            error_msg = f"❌ Napaka pri ustavljanju globalnega optimizatorja: {e}"
            logger.error(error_msg)
            return error_msg
    
    def get_global_status(self) -> Dict[str, Any]:
        """Pridobi globalni status sistema"""
        try:
            return {
                "is_running": self.is_running,
                "optimization_level": self.optimization_level.value,
                "total_domains": len(self.domains),
                "active_domains": len([d for d in self.domain_metrics.values() if d.get("status") == "active"]),
                "domain_metrics": self.domain_metrics,
                "recent_optimizations": self.optimization_history[-5:] if self.optimization_history else [],
                "global_config": self.global_config
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju globalnega statusa: {e}")
            return {"error": str(e)}
    
    def auto_optimize(self) -> Dict[str, Any]:
        """Avtomatska optimizacija (za kompatibilnost z drugimi moduli)"""
        try:
            if not self.is_running:
                return {
                    "success": False,
                    "message": "Globalni optimizator ni zagnan",
                    "efficiency": 0.0,
                    "cost_savings": 0.0,
                    "energy_reduction": 0.0
                }
            
            # Vrni trenutne statistike
            total_savings = sum(metrics.get("cost_savings", 0.0) for metrics in self.domain_metrics.values())
            avg_efficiency = statistics.mean([metrics.get("efficiency", 0.0) for metrics in self.domain_metrics.values()]) if self.domain_metrics else 0.0
            total_energy_reduction = sum(metrics.get("energy_usage", 0.0) for metrics in self.domain_metrics.values())
            
            return {
                "success": True,
                "message": f"Globalni optimizator deluje na {self.optimization_level.value} nivoju",
                "efficiency": avg_efficiency,
                "cost_savings": total_savings,
                "energy_reduction": total_energy_reduction,
                "active_domains": len([d for d in self.domain_metrics.values() if d.get("status") == "active"]),
                "optimization_level": self.optimization_level.value
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri avtomatski optimizaciji: {e}")
            return {
                "success": False,
                "message": f"Napaka: {str(e)}",
                "efficiency": 0.0,
                "cost_savings": 0.0,
                "energy_reduction": 0.0
            }

# Globalna instanca optimizatorja
global_optimizer = GlobalOptimizer()

# Funkcije za kompatibilnost
def start_global_optimizer():
    """Zaženi globalni optimizator"""
    return global_optimizer.start_global_optimizer()

def stop_global_optimizer():
    """Ustavi globalni optimizator"""
    return global_optimizer.stop_global_optimizer()

def get_global_status():
    """Pridobi globalni status"""
    return global_optimizer.get_global_status()

def register_domain_module(domain_name: str, module_instance):
    """Registriraj modul panoge"""
    return global_optimizer.register_domain_module(domain_name, module_instance)

def auto_optimize():
    """Avtomatska optimizacija"""
    return global_optimizer.auto_optimize()

if __name__ == "__main__":
    # Test globalnega optimizatorja
    print("🌍 Testiranje globalnega optimizatorja...")
    
    # Zaženi optimizator
    result = start_global_optimizer()
    print(result)
    
    # Počakaj nekaj sekund
    time.sleep(10)
    
    # Pridobi status
    status = get_global_status()
    print(f"📊 Status: {status}")
    
    # Ustavi optimizator
    stop_result = stop_global_optimizer()
    print(stop_result)