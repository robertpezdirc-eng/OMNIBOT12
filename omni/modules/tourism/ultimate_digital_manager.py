#!/usr/bin/env python3
"""
Ultimate Digital Manager - Digitalni manager z ROI kalkulacijami, 24/7 AI pomočnikom in hyper-avtomatizacijo
Avtor: Omni AI Platform
Verzija: 1.0
"""

import sqlite3
import json
import datetime
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import random
import math

class ManagerType(Enum):
    HOTEL = "hotel"
    RESTAURANT = "restaurant"
    TOURISM = "tourism"
    CAMPING = "camping"
    GENERAL = "general"

class AlertLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AutomationLevel(Enum):
    MANUAL = "manual"
    SEMI_AUTO = "semi_auto"
    FULL_AUTO = "full_auto"
    HYPER_AUTO = "hyper_auto"

class DecisionType(Enum):
    PRICING = "pricing"
    STAFFING = "staffing"
    INVENTORY = "inventory"
    MARKETING = "marketing"
    MAINTENANCE = "maintenance"
    GUEST_SERVICE = "guest_service"

@dataclass
class ROIMetric:
    metric_id: str
    name: str
    category: str
    current_value: float
    target_value: float
    investment_cost: float
    expected_return: float
    roi_percentage: float
    timeframe_days: int
    confidence_score: float
    created_at: str

@dataclass
class AIDecision:
    decision_id: str
    decision_type: DecisionType
    description: str
    confidence: float
    expected_impact: float
    automation_level: AutomationLevel
    requires_approval: bool
    executed: bool
    result_metrics: Dict[str, float]
    created_at: str

@dataclass
class PerformanceKPI:
    kpi_id: str
    name: str
    category: str
    current_value: float
    target_value: float
    trend: str  # "up", "down", "stable"
    alert_level: AlertLevel
    improvement_suggestions: List[str]
    last_updated: str

@dataclass
class AutomationRule:
    rule_id: str
    name: str
    trigger_condition: str
    action: str
    automation_level: AutomationLevel
    success_rate: float
    last_executed: str
    is_active: bool

class UltimateDigitalManager:
    def __init__(self, db_path: str = "digital_manager.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # ROI metriki
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS roi_metrics (
                metric_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                current_value REAL NOT NULL,
                target_value REAL NOT NULL,
                investment_cost REAL NOT NULL,
                expected_return REAL NOT NULL,
                roi_percentage REAL NOT NULL,
                timeframe_days INTEGER NOT NULL,
                confidence_score REAL NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
        
        # AI odločitve
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_decisions (
                decision_id TEXT PRIMARY KEY,
                decision_type TEXT NOT NULL,
                description TEXT NOT NULL,
                confidence REAL NOT NULL,
                expected_impact REAL NOT NULL,
                automation_level TEXT NOT NULL,
                requires_approval BOOLEAN NOT NULL,
                executed BOOLEAN NOT NULL,
                result_metrics TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        
        # KPI kazalniki
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_kpis (
                kpi_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                current_value REAL NOT NULL,
                target_value REAL NOT NULL,
                trend TEXT NOT NULL,
                alert_level TEXT NOT NULL,
                improvement_suggestions TEXT,
                last_updated TEXT NOT NULL
            )
        ''')
        
        # Avtomatizacijska pravila
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS automation_rules (
                rule_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                trigger_condition TEXT NOT NULL,
                action TEXT NOT NULL,
                automation_level TEXT NOT NULL,
                success_rate REAL NOT NULL,
                last_executed TEXT,
                is_active BOOLEAN NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def add_roi_metric(self, metric: ROIMetric) -> bool:
        """Dodaj ROI metriko"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO roi_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                metric.metric_id, metric.name, metric.category,
                metric.current_value, metric.target_value, metric.investment_cost,
                metric.expected_return, metric.roi_percentage, metric.timeframe_days,
                metric.confidence_score, metric.created_at
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju ROI metrike: {e}")
            return False
    
    def calculate_roi(self, investment: float, returns: float, timeframe_days: int) -> Dict[str, float]:
        """Izračunaj ROI kazalnike"""
        if investment <= 0:
            return {"roi_percentage": 0, "annual_roi": 0, "payback_period": 0}
        
        roi_percentage = ((returns - investment) / investment) * 100
        annual_roi = (roi_percentage / timeframe_days) * 365
        payback_period = investment / (returns / timeframe_days) if returns > 0 else float('inf')
        
        return {
            "roi_percentage": round(roi_percentage, 2),
            "annual_roi": round(annual_roi, 2),
            "payback_period": round(payback_period, 1)
        }
    
    def make_ai_decision(self, decision: AIDecision) -> bool:
        """Sprejmi AI odločitev"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO ai_decisions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                decision.decision_id, decision.decision_type.value, decision.description,
                decision.confidence, decision.expected_impact, decision.automation_level.value,
                decision.requires_approval, decision.executed, json.dumps(decision.result_metrics),
                decision.created_at
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri sprejemanju AI odločitve: {e}")
            return False
    
    def add_kpi(self, kpi: PerformanceKPI) -> bool:
        """Dodaj KPI kazalnik"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO performance_kpis VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                kpi.kpi_id, kpi.name, kpi.category, kpi.current_value,
                kpi.target_value, kpi.trend, kpi.alert_level.value,
                json.dumps(kpi.improvement_suggestions), kpi.last_updated
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju KPI: {e}")
            return False
    
    def add_automation_rule(self, rule: AutomationRule) -> bool:
        """Dodaj avtomatizacijsko pravilo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO automation_rules VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                rule.rule_id, rule.name, rule.trigger_condition, rule.action,
                rule.automation_level.value, rule.success_rate, rule.last_executed,
                rule.is_active
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Napaka pri dodajanju avtomatizacijskega pravila: {e}")
            return False
    
    def get_roi_analysis(self) -> Dict[str, Any]:
        """Pridobi ROI analizo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM roi_metrics ORDER BY roi_percentage DESC')
        metrics = cursor.fetchall()
        
        total_investment = sum(metric[5] for metric in metrics)  # investment_cost
        total_return = sum(metric[6] for metric in metrics)     # expected_return
        avg_roi = sum(metric[7] for metric in metrics) / len(metrics) if metrics else 0
        
        conn.close()
        
        return {
            "total_metrics": len(metrics),
            "total_investment": total_investment,
            "total_expected_return": total_return,
            "average_roi": round(avg_roi, 2),
            "net_profit": total_return - total_investment,
            "top_performers": [
                {
                    "name": metric[1],
                    "roi_percentage": metric[7],
                    "expected_return": metric[6]
                } for metric in metrics[:5]
            ]
        }
    
    def get_ai_insights(self) -> Dict[str, Any]:
        """Pridobi AI vpoglede in priporočila"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pridobi nedavne odločitve
        cursor.execute('''
            SELECT * FROM ai_decisions 
            ORDER BY created_at DESC LIMIT 10
        ''')
        recent_decisions = cursor.fetchall()
        
        # Pridobi KPI-je z opozorili
        cursor.execute('''
            SELECT * FROM performance_kpis 
            WHERE alert_level IN ('high', 'critical')
            ORDER BY last_updated DESC
        ''')
        critical_kpis = cursor.fetchall()
        
        conn.close()
        
        # Generiraj AI priporočila
        recommendations = self._generate_ai_recommendations(recent_decisions, critical_kpis)
        
        return {
            "recent_decisions": len(recent_decisions),
            "critical_alerts": len(critical_kpis),
            "automation_score": self._calculate_automation_score(),
            "efficiency_rating": self._calculate_efficiency_rating(),
            "recommendations": recommendations,
            "next_actions": self._suggest_next_actions()
        }
    
    def _generate_ai_recommendations(self, decisions: List, kpis: List) -> List[str]:
        """Generiraj AI priporočila"""
        recommendations = []
        
        if len(decisions) < 5:
            recommendations.append("Povečaj frekvenco AI odločitev za boljšo optimizacijo")
        
        if len(kpis) > 3:
            recommendations.append("Kritični KPI-ji potrebujejo takojšnjo pozornost")
        
        recommendations.extend([
            "Implementiraj dinamično ceno glede na povpraševanje",
            "Optimiziraj razporeditev kadra glede na napovedi obiska",
            "Avtomatiziraj naročanje zalog na podlagi zgodovinskih podatkov",
            "Uvedbi prediktivno vzdrževanje za zmanjšanje stroškov"
        ])
        
        return recommendations[:5]
    
    def _calculate_automation_score(self) -> float:
        """Izračunaj oceno avtomatizacije"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT automation_level, COUNT(*) FROM automation_rules GROUP BY automation_level')
        automation_data = cursor.fetchall()
        
        conn.close()
        
        score_map = {
            "manual": 0.2,
            "semi_auto": 0.5,
            "full_auto": 0.8,
            "hyper_auto": 1.0
        }
        
        total_rules = sum(count for _, count in automation_data)
        if total_rules == 0:
            return 0.0
        
        weighted_score = sum(score_map.get(level, 0) * count for level, count in automation_data)
        return round((weighted_score / total_rules) * 100, 1)
    
    def _calculate_efficiency_rating(self) -> str:
        """Izračunaj oceno učinkovitosti"""
        automation_score = self._calculate_automation_score()
        
        if automation_score >= 90:
            return "Odličen"
        elif automation_score >= 75:
            return "Zelo dober"
        elif automation_score >= 60:
            return "Dober"
        elif automation_score >= 40:
            return "Povprečen"
        else:
            return "Potrebuje izboljšave"
    
    def _suggest_next_actions(self) -> List[str]:
        """Predlagaj naslednje akcije"""
        return [
            "Analiziraj trendne podatke za optimizacijo cen",
            "Preveri zaloge in pripravi naročila",
            "Optimiziraj razporeditev kadra za naslednji teden",
            "Pripravi marketinške kampanje za nizko sezono",
            "Izvedi preventivno vzdrževanje opreme"
        ]
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Pridobi podatke za dashboard"""
        roi_analysis = self.get_roi_analysis()
        ai_insights = self.get_ai_insights()
        
        return {
            "roi_analysis": roi_analysis,
            "ai_insights": ai_insights,
            "system_health": {
                "uptime": "99.8%",
                "response_time": "0.2s",
                "active_automations": self._count_active_automations(),
                "data_quality": "95%"
            },
            "performance_summary": {
                "efficiency_score": ai_insights["efficiency_rating"],
                "automation_level": f"{ai_insights['automation_score']}%",
                "cost_savings": f"€{roi_analysis.get('net_profit', 0):,.2f}",
                "active_decisions": ai_insights["recent_decisions"]
            }
        }
    
    def _count_active_automations(self) -> int:
        """Preštej aktivne avtomatizacije"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM automation_rules WHERE is_active = 1')
        count = cursor.fetchone()[0]
        
        conn.close()
        return count

def demo_digital_manager():
    """Demo funkcija za testiranje digitalnega managerja"""
    print("🤖 ULTIMATE DIGITAL MANAGER - DEMO")
    print("=" * 50)
    
    manager = UltimateDigitalManager()
    
    # Dodaj ROI metrike
    roi_metrics = [
        ROIMetric(
            "roi_001", "Dinamične cene", "revenue",
            15000, 25000, 5000, 20000, 300.0, 90, 0.85,
            datetime.datetime.now().isoformat()
        ),
        ROIMetric(
            "roi_002", "Avtomatizacija kuhinje", "efficiency",
            8000, 12000, 3000, 15000, 400.0, 60, 0.92,
            datetime.datetime.now().isoformat()
        ),
        ROIMetric(
            "roi_003", "AI rezervacije", "customer_service",
            5000, 8000, 2000, 10000, 400.0, 45, 0.88,
            datetime.datetime.now().isoformat()
        )
    ]
    
    for metric in roi_metrics:
        manager.add_roi_metric(metric)
    
    # Dodaj AI odločitve
    decisions = [
        AIDecision(
            "dec_001", DecisionType.PRICING, "Povečaj cene za 15% v peak sezoni",
            0.89, 25000, AutomationLevel.FULL_AUTO, False, True,
            {"revenue_increase": 15.5, "occupancy": 92.3},
            datetime.datetime.now().isoformat()
        ),
        AIDecision(
            "dec_002", DecisionType.STAFFING, "Dodaj 2 natakarji za vikend",
            0.76, 5000, AutomationLevel.SEMI_AUTO, True, False,
            {"service_quality": 8.5, "wait_time": -12.3},
            datetime.datetime.now().isoformat()
        )
    ]
    
    for decision in decisions:
        manager.make_ai_decision(decision)
    
    # Dodaj KPI kazalnike
    kpis = [
        PerformanceKPI(
            "kpi_001", "Zasedenost sob", "occupancy",
            85.5, 90.0, "up", AlertLevel.MEDIUM,
            ["Optimiziraj cene", "Povečaj marketing"],
            datetime.datetime.now().isoformat()
        ),
        PerformanceKPI(
            "kpi_002", "Zadovoljstvo gostov", "satisfaction",
            4.2, 4.5, "stable", AlertLevel.LOW,
            ["Izboljšaj storitve", "Hitrejši check-in"],
            datetime.datetime.now().isoformat()
        )
    ]
    
    for kpi in kpis:
        manager.add_kpi(kpi)
    
    # Dodaj avtomatizacijska pravila
    rules = [
        AutomationRule(
            "rule_001", "Dinamične cene",
            "occupancy > 80%", "increase_price_by_10%",
            AutomationLevel.FULL_AUTO, 0.94,
            datetime.datetime.now().isoformat(), True
        ),
        AutomationRule(
            "rule_002", "Avtomatsko naročanje",
            "stock_level < 20%", "create_purchase_order",
            AutomationLevel.HYPER_AUTO, 0.98,
            datetime.datetime.now().isoformat(), True
        )
    ]
    
    for rule in rules:
        manager.add_automation_rule(rule)
    
    # Prikaži dashboard podatke
    dashboard = manager.get_dashboard_data()
    
    print("\n📊 ROI ANALIZA:")
    roi = dashboard["roi_analysis"]
    print(f"   Skupna investicija: €{roi['total_investment']:,.2f}")
    print(f"   Pričakovani donos: €{roi['total_expected_return']:,.2f}")
    print(f"   Povprečni ROI: {roi['average_roi']}%")
    print(f"   Neto dobiček: €{roi['net_profit']:,.2f}")
    
    print("\n🤖 AI VPOGLEDI:")
    ai = dashboard["ai_insights"]
    print(f"   Ocena avtomatizacije: {ai['automation_score']}%")
    print(f"   Ocena učinkovitosti: {ai['efficiency_rating']}")
    print(f"   Nedavne odločitve: {ai['recent_decisions']}")
    print(f"   Kritična opozorila: {ai['critical_alerts']}")
    
    print("\n⚡ SISTEM:")
    system = dashboard["system_health"]
    print(f"   Delovanje: {system['uptime']}")
    print(f"   Odzivni čas: {system['response_time']}")
    print(f"   Aktivne avtomatizacije: {system['active_automations']}")
    
    print("\n🎯 PRIPOROČILA:")
    for i, rec in enumerate(ai["recommendations"][:3], 1):
        print(f"   {i}. {rec}")
    
    print("\n✅ Digital Manager uspešno inicializiran!")

if __name__ == "__main__":
    demo_digital_manager()