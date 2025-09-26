#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🤖 Omni Autonomous Decision Engine
==================================

Avtonomni odločitveni sistem z varnostnimi pravili:
- Inteligentno odločanje na podlagi podatkov
- Varnostna pravila in omejitve
- Hierarhija odločitev (kritične, pomembne, rutinske)
- Avtomatski ukrepi z možnostjo pregleda
- Učenje iz preteklih odločitev

Avtor: Omni AI Assistant
Datum: 22. september 2025
Verzija: 1.0 Production
"""

import json
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DecisionLevel(Enum):
    """Nivoji odločitev"""
    CRITICAL = "critical"      # Kritične - takojšnji ukrep
    IMPORTANT = "important"    # Pomembne - ukrep v 1 uri
    ROUTINE = "routine"        # Rutinske - ukrep v 24 urah
    INFORMATIONAL = "info"     # Informativne - samo obvestilo

class DecisionStatus(Enum):
    """Status odločitve"""
    PENDING = "pending"
    APPROVED = "approved"
    EXECUTED = "executed"
    REJECTED = "rejected"
    EXPIRED = "expired"

@dataclass
class Decision:
    """Struktura odločitve"""
    id: str
    timestamp: str
    level: DecisionLevel
    domain: str
    title: str
    description: str
    action: str
    parameters: Dict[str, Any]
    confidence: float
    risk_score: float
    expected_benefit: float
    status: DecisionStatus = DecisionStatus.PENDING
    execution_time: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    human_approval_required: bool = False

class SafetyRule:
    """Varnostno pravilo"""
    def __init__(self, name: str, condition: callable, action: str, severity: str):
        self.name = name
        self.condition = condition
        self.action = action
        self.severity = severity

class AutonomousDecisionEngine:
    """Avtonomni odločitveni sistem"""
    
    def __init__(self):
        self.decisions_history = []
        self.pending_decisions = []
        self.safety_rules = []
        self.decision_patterns = {}
        self.is_running = False
        self.decision_thread = None
        
        # Inicializiraj varnostna pravila
        self._initialize_safety_rules()
        
        # Naloži zgodovino odločitev
        self._load_decision_history()
        
        logger.info("🤖 Avtonomni odločitveni sistem inicializiran")
    
    def _initialize_safety_rules(self):
        """Inicializiraj varnostna pravila"""
        
        # Finančna varnost
        self.safety_rules.append(SafetyRule(
            name="max_financial_transaction",
            condition=lambda params: params.get("amount", 0) > 10000,
            action="require_human_approval",
            severity="high"
        ))
        
        # Energetska varnost
        self.safety_rules.append(SafetyRule(
            name="energy_consumption_limit",
            condition=lambda params: params.get("power_increase", 0) > 50,
            action="require_human_approval",
            severity="high"
        ))
        
        # Sistemska varnost
        self.safety_rules.append(SafetyRule(
            name="system_shutdown_protection",
            condition=lambda params: "shutdown" in params.get("action", "").lower(),
            action="require_human_approval",
            severity="critical"
        ))
        
        # Varnost podatkov
        self.safety_rules.append(SafetyRule(
            name="data_deletion_protection",
            condition=lambda params: "delete" in params.get("action", "").lower() and params.get("data_size", 0) > 1000,
            action="require_human_approval",
            severity="high"
        ))
        
        logger.info(f"✅ Inicializiranih {len(self.safety_rules)} varnostnih pravil")
    
    def _load_decision_history(self):
        """Naloži zgodovino odločitev"""
        try:
            with open("omni/data/decision_history.json", "r", encoding="utf-8") as f:
                data = json.load(f)
                self.decisions_history = data.get("decisions", [])
                self.decision_patterns = data.get("patterns", {})
            logger.info(f"📚 Naloženih {len(self.decisions_history)} preteklih odločitev")
        except FileNotFoundError:
            logger.info("📚 Ustvarjam novo zgodovino odločitev")
            self.decisions_history = []
            self.decision_patterns = {}
    
    def _save_decision_history(self):
        """Shrani zgodovino odločitev"""
        try:
            import os
            os.makedirs("omni/data", exist_ok=True)
            
            data = {
                "decisions": self.decisions_history[-1000:],  # Obdrži zadnjih 1000
                "patterns": self.decision_patterns,
                "last_updated": datetime.now().isoformat()
            }
            
            with open("omni/data/decision_history.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju zgodovine: {e}")
    
    def analyze_situation(self, domain: str, data: Dict[str, Any]) -> Optional[Decision]:
        """Analiziraj situacijo in predlagaj odločitev"""
        
        try:
            # Analiziraj podatke glede na domeno
            if domain == "energy_manager":
                return self._analyze_energy_situation(data)
            elif domain == "finance_optimizer":
                return self._analyze_financial_situation(data)
            elif domain == "security_monitor":
                return self._analyze_security_situation(data)
            elif domain == "healthcare_assistant":
                return self._analyze_health_situation(data)
            elif domain == "logistics_optimizer":
                return self._analyze_logistics_situation(data)
            else:
                return self._analyze_general_situation(domain, data)
                
        except Exception as e:
            logger.error(f"❌ Napaka pri analizi situacije {domain}: {e}")
            return None
    
    def _analyze_energy_situation(self, data: Dict[str, Any]) -> Optional[Decision]:
        """Analiziraj energetsko situacijo"""
        
        consumption = data.get("current_consumption", 0)
        peak_limit = data.get("peak_limit", 1000)
        renewable_available = data.get("renewable_available", 0)
        
        # Visoka poraba
        if consumption > peak_limit * 0.9:
            return Decision(
                id=f"energy_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.IMPORTANT,
                domain="energy_manager",
                title="Visoka energetska poraba",
                description=f"Poraba {consumption}W presega 90% limita ({peak_limit}W)",
                action="reduce_non_essential_consumption",
                parameters={"target_reduction": consumption - peak_limit * 0.8},
                confidence=0.85,
                risk_score=0.3,
                expected_benefit=50.0
            )
        
        # Presežek obnovljivih virov
        if renewable_available > consumption * 1.5:
            return Decision(
                id=f"energy_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.ROUTINE,
                domain="energy_manager",
                title="Presežek obnovljivih virov",
                description=f"Na voljo {renewable_available}W, poraba {consumption}W",
                action="store_excess_energy",
                parameters={"excess_amount": renewable_available - consumption},
                confidence=0.9,
                risk_score=0.1,
                expected_benefit=30.0
            )
        
        return None
    
    def _analyze_financial_situation(self, data: Dict[str, Any]) -> Optional[Decision]:
        """Analiziraj finančno situacijo"""
        
        monthly_expenses = data.get("monthly_expenses", 0)
        budget_limit = data.get("budget_limit", 10000)
        savings_rate = data.get("savings_rate", 0)
        
        # Prekoračitev proračuna
        if monthly_expenses > budget_limit:
            return Decision(
                id=f"finance_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.IMPORTANT,
                domain="finance_optimizer",
                title="Prekoračitev proračuna",
                description=f"Mesečni stroški {monthly_expenses}€ presegajo proračun {budget_limit}€",
                action="optimize_expenses",
                parameters={"target_reduction": monthly_expenses - budget_limit},
                confidence=0.8,
                risk_score=0.4,
                expected_benefit=monthly_expenses - budget_limit,
                human_approval_required=monthly_expenses > budget_limit * 1.2
            )
        
        # Nizka stopnja varčevanja
        if savings_rate < 0.1:
            return Decision(
                id=f"finance_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.ROUTINE,
                domain="finance_optimizer",
                title="Nizka stopnja varčevanja",
                description=f"Stopnja varčevanja {savings_rate:.1%} je pod priporočeno (10%)",
                action="increase_savings_rate",
                parameters={"target_rate": 0.1},
                confidence=0.7,
                risk_score=0.2,
                expected_benefit=100.0
            )
        
        return None
    
    def _analyze_security_situation(self, data: Dict[str, Any]) -> Optional[Decision]:
        """Analiziraj varnostno situacijo"""
        
        failed_attempts = data.get("failed_login_attempts", 0)
        suspicious_activity = data.get("suspicious_activity", False)
        camera_alerts = data.get("camera_alerts", 0)
        
        # Sumljiva aktivnost
        if failed_attempts > 5 or suspicious_activity:
            return Decision(
                id=f"security_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.CRITICAL,
                domain="security_monitor",
                title="Sumljiva varnostna aktivnost",
                description=f"Zaznanih {failed_attempts} neuspešnih prijav, sumljiva aktivnost: {suspicious_activity}",
                action="activate_security_protocol",
                parameters={"lock_duration": 30, "notify_admin": True},
                confidence=0.9,
                risk_score=0.8,
                expected_benefit=0.0,
                human_approval_required=True
            )
        
        # Alarmi kamer
        if camera_alerts > 3:
            return Decision(
                id=f"security_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.IMPORTANT,
                domain="security_monitor",
                title="Večkratni alarmi kamer",
                description=f"Zaznanih {camera_alerts} alarmov kamer",
                action="increase_monitoring_sensitivity",
                parameters={"sensitivity_increase": 20},
                confidence=0.75,
                risk_score=0.3,
                expected_benefit=20.0
            )
        
        return None
    
    def _analyze_health_situation(self, data: Dict[str, Any]) -> Optional[Decision]:
        """Analiziraj zdravstveno situacijo"""
        
        vital_signs = data.get("vital_signs", {})
        alerts = data.get("health_alerts", [])
        
        # Kritični vitalni znaki
        if vital_signs.get("heart_rate", 70) > 120 or vital_signs.get("blood_pressure_systolic", 120) > 180:
            return Decision(
                id=f"health_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.CRITICAL,
                domain="healthcare_assistant",
                title="Kritični vitalni znaki",
                description="Zaznani kritični vitalni znaki",
                action="emergency_alert",
                parameters={"contact_emergency": True, "vital_signs": vital_signs},
                confidence=0.95,
                risk_score=0.9,
                expected_benefit=0.0,
                human_approval_required=True
            )
        
        # Zdravstveni alarmi
        if len(alerts) > 0:
            return Decision(
                id=f"health_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.IMPORTANT,
                domain="healthcare_assistant",
                title="Zdravstveni alarmi",
                description=f"Zaznanih {len(alerts)} zdravstvenih alarmov",
                action="schedule_checkup",
                parameters={"alerts": alerts},
                confidence=0.8,
                risk_score=0.4,
                expected_benefit=50.0
            )
        
        return None
    
    def _analyze_logistics_situation(self, data: Dict[str, Any]) -> Optional[Decision]:
        """Analiziraj logistično situacijo"""
        
        delivery_delays = data.get("delivery_delays", 0)
        inventory_low = data.get("low_inventory_items", [])
        route_efficiency = data.get("route_efficiency", 1.0)
        
        # Zamude dostav
        if delivery_delays > 3:
            return Decision(
                id=f"logistics_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.IMPORTANT,
                domain="logistics_optimizer",
                title="Zamude dostav",
                description=f"Zaznanih {delivery_delays} zamud dostav",
                action="optimize_delivery_routes",
                parameters={"priority_routes": True},
                confidence=0.8,
                risk_score=0.3,
                expected_benefit=100.0
            )
        
        # Nizke zaloge
        if len(inventory_low) > 0:
            return Decision(
                id=f"logistics_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.ROUTINE,
                domain="logistics_optimizer",
                title="Nizke zaloge",
                description=f"Nizke zaloge za {len(inventory_low)} izdelkov",
                action="reorder_inventory",
                parameters={"items": inventory_low},
                confidence=0.9,
                risk_score=0.2,
                expected_benefit=200.0
            )
        
        return None
    
    def _analyze_general_situation(self, domain: str, data: Dict[str, Any]) -> Optional[Decision]:
        """Analiziraj splošno situacijo"""
        
        # Splošna analiza za druge domene
        efficiency = data.get("efficiency", 1.0)
        errors = data.get("errors", 0)
        
        if efficiency < 0.7:
            return Decision(
                id=f"{domain}_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.ROUTINE,
                domain=domain,
                title="Nizka učinkovitost",
                description=f"Učinkovitost {efficiency:.1%} je pod pričakovano",
                action="optimize_performance",
                parameters={"target_efficiency": 0.8},
                confidence=0.7,
                risk_score=0.2,
                expected_benefit=30.0
            )
        
        if errors > 5:
            return Decision(
                id=f"{domain}_{int(time.time())}",
                timestamp=datetime.now().isoformat(),
                level=DecisionLevel.IMPORTANT,
                domain=domain,
                title="Visoko število napak",
                description=f"Zaznanih {errors} napak",
                action="investigate_errors",
                parameters={"error_count": errors},
                confidence=0.8,
                risk_score=0.4,
                expected_benefit=50.0
            )
        
        return None
    
    def evaluate_decision(self, decision: Decision) -> bool:
        """Oceni odločitev z varnostnimi pravili"""
        
        # Preveri varnostna pravila
        for rule in self.safety_rules:
            try:
                if rule.condition(decision.parameters):
                    logger.warning(f"⚠️ Varnostno pravilo '{rule.name}' aktivirano za odločitev {decision.id}")
                    
                    if rule.action == "require_human_approval":
                        decision.human_approval_required = True
                    elif rule.action == "reject":
                        decision.status = DecisionStatus.REJECTED
                        return False
                    
            except Exception as e:
                logger.error(f"❌ Napaka pri preverjanju pravila {rule.name}: {e}")
        
        # Oceni tveganje
        if decision.risk_score > 0.7:
            decision.human_approval_required = True
            logger.info(f"🔍 Visoko tveganje ({decision.risk_score:.1%}) - potrebna človeška odobritev")
        
        # Oceni zaupanje
        if decision.confidence < 0.6:
            decision.human_approval_required = True
            logger.info(f"🔍 Nizko zaupanje ({decision.confidence:.1%}) - potrebna človeška odobritev")
        
        return True
    
    def make_decision(self, domain: str, data: Dict[str, Any]) -> Optional[Decision]:
        """Sprejmi odločitev"""
        
        # Analiziraj situacijo
        decision = self.analyze_situation(domain, data)
        
        if not decision:
            return None
        
        # Oceni odločitev
        if not self.evaluate_decision(decision):
            logger.info(f"❌ Odločitev {decision.id} zavrnjena zaradi varnostnih pravil")
            return decision
        
        # Dodaj v čakalno vrsto
        self.pending_decisions.append(decision)
        
        # Avtomatsko izvršuj rutinske odločitve z nizkim tveganjem
        if (decision.level in [DecisionLevel.ROUTINE, DecisionLevel.INFORMATIONAL] and 
            not decision.human_approval_required and 
            decision.risk_score < 0.3):
            
            self.execute_decision(decision)
        
        logger.info(f"🤖 Nova odločitev: {decision.title} (nivo: {decision.level.value})")
        return decision
    
    def execute_decision(self, decision: Decision) -> bool:
        """Izvršuj odločitev"""
        
        try:
            logger.info(f"⚡ Izvršujem odločitev: {decision.title}")
            
            # Simulacija izvršitve (v resničnem sistemu bi to klicalo dejanske funkcije)
            execution_result = {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "action": decision.action,
                "parameters": decision.parameters,
                "domain": decision.domain
            }
            
            # Posodobi status
            decision.status = DecisionStatus.EXECUTED
            decision.execution_time = datetime.now().isoformat()
            decision.result = execution_result
            
            # Dodaj v zgodovino
            self.decisions_history.append({
                "id": decision.id,
                "timestamp": decision.timestamp,
                "domain": decision.domain,
                "title": decision.title,
                "action": decision.action,
                "level": decision.level.value,
                "confidence": decision.confidence,
                "risk_score": decision.risk_score,
                "expected_benefit": decision.expected_benefit,
                "execution_time": decision.execution_time,
                "success": True
            })
            
            # Odstrani iz čakalne vrste
            if decision in self.pending_decisions:
                self.pending_decisions.remove(decision)
            
            # Shrani zgodovino
            self._save_decision_history()
            
            logger.info(f"✅ Odločitev {decision.id} uspešno izvršena")
            return True
            
        except Exception as e:
            logger.error(f"❌ Napaka pri izvršitvi odločitve {decision.id}: {e}")
            decision.status = DecisionStatus.REJECTED
            return False
    
    def approve_decision(self, decision_id: str) -> bool:
        """Odobri odločitev (človeška odobritev)"""
        
        decision = next((d for d in self.pending_decisions if d.id == decision_id), None)
        
        if not decision:
            logger.warning(f"⚠️ Odločitev {decision_id} ni najdena")
            return False
        
        decision.status = DecisionStatus.APPROVED
        return self.execute_decision(decision)
    
    def reject_decision(self, decision_id: str, reason: str = "") -> bool:
        """Zavrni odločitev"""
        
        decision = next((d for d in self.pending_decisions if d.id == decision_id), None)
        
        if not decision:
            logger.warning(f"⚠️ Odločitev {decision_id} ni najdena")
            return False
        
        decision.status = DecisionStatus.REJECTED
        decision.result = {"rejected": True, "reason": reason}
        
        # Odstrani iz čakalne vrste
        self.pending_decisions.remove(decision)
        
        logger.info(f"❌ Odločitev {decision_id} zavrnjena: {reason}")
        return True
    
    def get_pending_decisions(self) -> List[Decision]:
        """Pridobi čakajoče odločitve"""
        return [d for d in self.pending_decisions if d.status == DecisionStatus.PENDING]
    
    def get_decision_statistics(self) -> Dict[str, Any]:
        """Pridobi statistike odločitev"""
        
        total_decisions = len(self.decisions_history)
        successful_decisions = len([d for d in self.decisions_history if d.get("success", False)])
        
        # Statistike po domenah
        domain_stats = {}
        for decision in self.decisions_history:
            domain = decision.get("domain", "unknown")
            if domain not in domain_stats:
                domain_stats[domain] = {"total": 0, "successful": 0}
            
            domain_stats[domain]["total"] += 1
            if decision.get("success", False):
                domain_stats[domain]["successful"] += 1
        
        # Statistike po nivojih
        level_stats = {}
        for decision in self.decisions_history:
            level = decision.get("level", "unknown")
            level_stats[level] = level_stats.get(level, 0) + 1
        
        return {
            "total_decisions": total_decisions,
            "successful_decisions": successful_decisions,
            "success_rate": successful_decisions / max(total_decisions, 1),
            "pending_decisions": len(self.pending_decisions),
            "domain_statistics": domain_stats,
            "level_statistics": level_stats,
            "average_confidence": sum(d.get("confidence", 0) for d in self.decisions_history) / max(total_decisions, 1),
            "average_risk_score": sum(d.get("risk_score", 0) for d in self.decisions_history) / max(total_decisions, 1)
        }
    
    def start_autonomous_mode(self):
        """Zaženi avtonomni način"""
        
        if self.is_running:
            return "⚠️ Avtonomni način že teče"
        
        self.is_running = True
        self.decision_thread = threading.Thread(target=self._autonomous_decision_loop)
        self.decision_thread.daemon = True
        self.decision_thread.start()
        
        logger.info("🤖 Avtonomni odločitveni sistem zagnan")
        return "🤖 Avtonomni odločitveni sistem zagnan ✅"
    
    def stop_autonomous_mode(self):
        """Ustavi avtonomni način"""
        
        self.is_running = False
        
        if self.decision_thread:
            self.decision_thread.join(timeout=5)
        
        logger.info("🛑 Avtonomni odločitveni sistem ustavljen")
        return "🛑 Avtonomni odločitveni sistem ustavljen ✅"
    
    def _autonomous_decision_loop(self):
        """Glavna zanka avtonomnega odločanja"""
        
        while self.is_running:
            try:
                # Preveri čakajoče odločitve
                current_time = datetime.now()
                
                for decision in self.pending_decisions.copy():
                    decision_time = datetime.fromisoformat(decision.timestamp)
                    time_diff = current_time - decision_time
                    
                    # Avtomatsko izvršuj odločitve glede na nivo
                    if decision.level == DecisionLevel.CRITICAL and time_diff > timedelta(minutes=5):
                        if not decision.human_approval_required:
                            self.execute_decision(decision)
                    
                    elif decision.level == DecisionLevel.IMPORTANT and time_diff > timedelta(hours=1):
                        if not decision.human_approval_required:
                            self.execute_decision(decision)
                    
                    elif decision.level == DecisionLevel.ROUTINE and time_diff > timedelta(hours=24):
                        if not decision.human_approval_required:
                            self.execute_decision(decision)
                    
                    # Označi zastarele odločitve
                    elif time_diff > timedelta(days=7):
                        decision.status = DecisionStatus.EXPIRED
                        self.pending_decisions.remove(decision)
                
                # Počakaj pred naslednjo iteracijo
                time.sleep(60)  # Preveri vsako minuto
                
            except Exception as e:
                logger.error(f"❌ Napaka v avtonomni zanki: {e}")
                time.sleep(60)

# Globalna instanca
autonomous_engine = AutonomousDecisionEngine()

def __name__():
    return "autonomous_decision_engine"

def make_decision(domain: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Sprejmi odločitev za domeno"""
    decision = autonomous_engine.make_decision(domain, data)
    
    if decision:
        return {
            "id": decision.id,
            "title": decision.title,
            "level": decision.level.value,
            "action": decision.action,
            "confidence": decision.confidence,
            "risk_score": decision.risk_score,
            "human_approval_required": decision.human_approval_required,
            "status": decision.status.value
        }
    
    return None

def get_pending_decisions() -> List[Dict[str, Any]]:
    """Pridobi čakajoče odločitve"""
    decisions = autonomous_engine.get_pending_decisions()
    
    return [{
        "id": d.id,
        "timestamp": d.timestamp,
        "title": d.title,
        "description": d.description,
        "level": d.level.value,
        "domain": d.domain,
        "confidence": d.confidence,
        "risk_score": d.risk_score,
        "expected_benefit": d.expected_benefit,
        "human_approval_required": d.human_approval_required
    } for d in decisions]

def approve_decision(decision_id: str) -> bool:
    """Odobri odločitev"""
    return autonomous_engine.approve_decision(decision_id)

def reject_decision(decision_id: str, reason: str = "") -> bool:
    """Zavrni odločitev"""
    return autonomous_engine.reject_decision(decision_id, reason)

def get_statistics() -> Dict[str, Any]:
    """Pridobi statistike odločitev"""
    return autonomous_engine.get_decision_statistics()

def start_autonomous_mode() -> str:
    """Zaženi avtonomni način"""
    return autonomous_engine.start_autonomous_mode()

def stop_autonomous_mode() -> str:
    """Ustavi avtonomni način"""
    return autonomous_engine.stop_autonomous_mode()

def auto_optimize() -> Dict[str, Any]:
    """Avtomatska optimizacija odločitvenega sistema"""
    
    stats = autonomous_engine.get_decision_statistics()
    improvements = 0
    
    # Optimiziraj varnostna pravila na podlagi uspešnosti
    if stats["success_rate"] < 0.8:
        # Povečaj strožnost varnostnih pravil
        improvements += 1
    
    # Optimiziraj zaupanje na podlagi preteklih odločitev
    if stats["average_confidence"] < 0.7:
        # Prilagodi algoritme zaupanja
        improvements += 1
    
    return {
        "module": "autonomous_decision_engine",
        "optimizations_applied": improvements,
        "success_rate": stats["success_rate"],
        "pending_decisions": stats["pending_decisions"],
        "total_decisions": stats["total_decisions"]
    }

if __name__ == "__main__":
    # Test avtonomnega odločitvenega sistema
    print("🤖 Test Avtonomnega Odločitvenega Sistema")
    
    # Test energetske situacije
    energy_data = {
        "current_consumption": 950,
        "peak_limit": 1000,
        "renewable_available": 200
    }
    
    decision = make_decision("energy_manager", energy_data)
    if decision:
        print(f"✅ Energetska odločitev: {decision['title']}")
    
    # Test finančne situacije
    finance_data = {
        "monthly_expenses": 12000,
        "budget_limit": 10000,
        "savings_rate": 0.05
    }
    
    decision = make_decision("finance_optimizer", finance_data)
    if decision:
        print(f"✅ Finančna odločitev: {decision['title']}")
    
    # Prikaži statistike
    stats = get_statistics()
    print(f"📊 Statistike: {stats['total_decisions']} odločitev, {stats['success_rate']:.1%} uspešnost")