"""
💰 MARKET ANALYSIS & ROI CALCULATOR
Tržna analiza, ROI kalkulacije in cenovna strategija za gostinstvo

Funkcionalnosti:
- ROI kalkulacije in prihranki
- Cenovna strategija po segmentih
- Konkurenčna analiza
- Tržne priložnosti
- Finančne projekcije
- Subscription modeli
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
import pandas as pd
import numpy as np
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class BusinessMetrics:
    """Poslovni kazalniki"""
    monthly_revenue: float
    monthly_costs: float
    staff_count: int
    avg_transaction: float
    daily_transactions: int
    inventory_turnover: float
    customer_retention: float

@dataclass
class ROICalculation:
    """ROI kalkulacija"""
    investment: float
    monthly_savings: float
    annual_savings: float
    payback_period_months: float
    roi_percentage: float
    net_present_value: float

@dataclass
class PricingPlan:
    """Cenovni načrt"""
    name: str
    monthly_price: float
    features: List[str]
    target_segment: str
    max_users: int
    support_level: str

class MarketAnalysis:
    """Tržna analiza in ROI kalkulacije"""
    
    def __init__(self, db_path: str = "tourism_premium.db"):
        self.db_path = db_path
        self.init_database()
        
        logger.info("💰 Market Analysis inicializiran")
    
    def init_database(self):
        """Inicializiraj bazo podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za tržne analize
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS market_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_type TEXT NOT NULL,
                business_size TEXT NOT NULL,
                current_metrics TEXT NOT NULL,
                roi_calculation TEXT NOT NULL,
                recommendations TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela za cenovna načrta
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pricing_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_name TEXT NOT NULL,
                monthly_price REAL NOT NULL,
                features TEXT NOT NULL,
                target_segment TEXT NOT NULL,
                max_users INTEGER,
                support_level TEXT,
                active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela za konkurenčno analizo
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS competitor_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                competitor_name TEXT NOT NULL,
                product_name TEXT NOT NULL,
                monthly_price REAL,
                features TEXT,
                strengths TEXT,
                weaknesses TEXT,
                market_share REAL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    # ==================== ROI KALKULACIJE ====================
    
    def calculate_roi(self, business_metrics: BusinessMetrics, 
                     system_cost: float = 299.0) -> ROICalculation:
        """Izračunaj ROI za implementacijo sistema"""
        
        # Prihranki zaradi avtomatizacije
        staff_savings = self._calculate_staff_savings(business_metrics)
        inventory_savings = self._calculate_inventory_savings(business_metrics)
        efficiency_savings = self._calculate_efficiency_savings(business_metrics)
        error_reduction_savings = self._calculate_error_reduction_savings(business_metrics)
        
        # Skupni mesečni prihranki
        monthly_savings = (
            staff_savings + 
            inventory_savings + 
            efficiency_savings + 
            error_reduction_savings
        )
        
        annual_savings = monthly_savings * 12
        annual_investment = system_cost * 12
        
        # ROI kalkulacije
        payback_period = annual_investment / monthly_savings if monthly_savings > 0 else float('inf')
        roi_percentage = ((annual_savings - annual_investment) / annual_investment) * 100 if annual_investment > 0 else 0
        
        # NPV (Net Present Value) za 3 leta
        discount_rate = 0.1  # 10% diskontna stopnja
        npv = 0
        for year in range(1, 4):
            npv += (annual_savings - annual_investment) / ((1 + discount_rate) ** year)
        
        return ROICalculation(
            investment=annual_investment,
            monthly_savings=monthly_savings,
            annual_savings=annual_savings,
            payback_period_months=payback_period,
            roi_percentage=roi_percentage,
            net_present_value=npv
        )
    
    def _calculate_staff_savings(self, metrics: BusinessMetrics) -> float:
        """Prihranki pri osebju zaradi avtomatizacije"""
        # Avtomatizacija lahko zmanjša potrebo po administrativnem osebju za 20-30%
        avg_hourly_wage = 12.0  # €/uro
        hours_saved_per_month = metrics.staff_count * 40  # 40 ur/mesec na zaposlenega
        automation_efficiency = 0.25  # 25% prihranek
        
        return hours_saved_per_month * avg_hourly_wage * automation_efficiency
    
    def _calculate_inventory_savings(self, metrics: BusinessMetrics) -> float:
        """Prihranki pri upravljanju zalog"""
        # Optimizacija zalog lahko zmanjša stroške za 15-20%
        monthly_inventory_cost = metrics.monthly_costs * 0.3  # 30% stroškov je zaloge
        optimization_savings = 0.18  # 18% prihranek
        
        return monthly_inventory_cost * optimization_savings
    
    def _calculate_efficiency_savings(self, metrics: BusinessMetrics) -> float:
        """Prihranki zaradi povečane učinkovitosti"""
        # Avtomatizacija poveča učinkovitost za 10-15%
        efficiency_increase = 0.12  # 12% povečanje
        additional_revenue = metrics.monthly_revenue * efficiency_increase
        
        return additional_revenue * 0.3  # 30% je čisti dobiček
    
    def _calculate_error_reduction_savings(self, metrics: BusinessMetrics) -> float:
        """Prihranki zaradi zmanjšanja napak"""
        # Zmanjšanje napak pri naročanju, računovodstvu, itd.
        error_cost_percentage = 0.02  # 2% prihodka gre za napake
        error_reduction = 0.7  # 70% zmanjšanje napak
        
        return metrics.monthly_revenue * error_cost_percentage * error_reduction
    
    # ==================== CENOVNA STRATEGIJA ====================
    
    def create_pricing_strategy(self) -> List[PricingPlan]:
        """Ustvari cenovne načrte za različne segmente"""
        
        plans = [
            PricingPlan(
                name="Starter",
                monthly_price=99.0,
                features=[
                    "Osnovno POS povezovanje",
                    "Enostavno upravljanje zalog",
                    "Osnovni dashboard",
                    "Email podpora",
                    "Do 2 uporabnika",
                    "Mesečna poročila"
                ],
                target_segment="Mala podjetja (1-5 zaposlenih)",
                max_users=2,
                support_level="Email"
            ),
            
            PricingPlan(
                name="Professional",
                monthly_price=299.0,
                features=[
                    "Napredne POS integracije",
                    "AI menu optimizacija",
                    "Avtomatsko naročanje zalog",
                    "Rezervacijski sistem",
                    "Napredni dashboard z KPI",
                    "Kadrovski modul",
                    "Finančno poročanje",
                    "Telefonska podpora",
                    "Do 10 uporabnikov",
                    "Tedenski AI insights"
                ],
                target_segment="Srednja podjetja (5-20 zaposlenih)",
                max_users=10,
                support_level="Telefon + Email"
            ),
            
            PricingPlan(
                name="Enterprise",
                monthly_price=699.0,
                features=[
                    "Vse Professional funkcije",
                    "Multi-lokacijska podpora",
                    "Napredna AI analitika",
                    "Personalizirani dashboard",
                    "API integracije",
                    "Dedicirani account manager",
                    "24/7 podpora",
                    "Neomejeno uporabnikov",
                    "Dnevni AI insights",
                    "Prilagojeni poročila",
                    "Mobilna aplikacija"
                ],
                target_segment="Velika podjetja (20+ zaposlenih)",
                max_users=999,
                support_level="24/7 Premium"
            ),
            
            PricingPlan(
                name="Custom",
                monthly_price=1299.0,
                features=[
                    "Vse Enterprise funkcije",
                    "Popolnoma prilagojena rešitev",
                    "On-premise namestitev",
                    "Dedicirani strežnik",
                    "Prilagojeni moduli",
                    "Integracija z obstoječimi sistemi",
                    "Usposabljanje osebja",
                    "Mesečni business review",
                    "Prioritetna podpora"
                ],
                target_segment="Hotelske verige, veliki kompleksi",
                max_users=9999,
                support_level="Dedicated Team"
            )
        ]
        
        # Shrani v bazo
        self._save_pricing_plans(plans)
        
        return plans
    
    def _save_pricing_plans(self, plans: List[PricingPlan]):
        """Shrani cenovne načrte v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for plan in plans:
            cursor.execute('''
                INSERT OR REPLACE INTO pricing_plans 
                (plan_name, monthly_price, features, target_segment, max_users, support_level)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                plan.name,
                plan.monthly_price,
                json.dumps(plan.features),
                plan.target_segment,
                plan.max_users,
                plan.support_level
            ))
        
        conn.commit()
        conn.close()
    
    # ==================== KONKURENČNA ANALIZA ====================
    
    def analyze_competition(self) -> Dict[str, Any]:
        """Analiziraj konkurenco"""
        
        competitors = [
            {
                "name": "Toast POS",
                "product": "Restaurant Management",
                "monthly_price": 165.0,
                "features": ["POS", "Inventory", "Payroll", "Reporting"],
                "strengths": ["Established brand", "Wide adoption", "Good hardware"],
                "weaknesses": ["Expensive", "Limited AI", "Complex setup"],
                "market_share": 15.2
            },
            {
                "name": "Square",
                "product": "Square for Restaurants",
                "monthly_price": 60.0,
                "features": ["POS", "Payments", "Basic inventory"],
                "strengths": ["Low cost", "Easy setup", "Good payments"],
                "weaknesses": ["Limited features", "No AI", "Basic reporting"],
                "market_share": 22.1
            },
            {
                "name": "Lightspeed",
                "product": "Restaurant POS",
                "monthly_price": 189.0,
                "features": ["POS", "Inventory", "Analytics", "Multi-location"],
                "strengths": ["Good analytics", "Multi-location", "Integrations"],
                "weaknesses": ["Expensive", "Complex", "Limited AI"],
                "market_share": 8.7
            },
            {
                "name": "Revel Systems",
                "product": "POS + Management",
                "monthly_price": 99.0,
                "features": ["POS", "Inventory", "Employee management"],
                "strengths": ["Comprehensive", "Good support"],
                "weaknesses": ["Outdated UI", "No AI", "Limited automation"],
                "market_share": 5.4
            }
        ]
        
        # Shrani v bazo
        self._save_competitor_analysis(competitors)
        
        # Analiziraj pozicioniranje
        our_advantages = [
            "Napredna AI funkcionalnost",
            "Popolna avtomatizacija",
            "Slovensko podporo",
            "Prilagojene rešitve",
            "Boljše razmerje cena/vrednost",
            "Real-time analytics",
            "Prediktivne funkcije"
        ]
        
        market_opportunities = [
            "AI-driven optimization (manjka pri konkurenci)",
            "Lokalna podpora v slovenščini",
            "Cenovno dostopnejše enterprise rešitve",
            "Boljša uporabniška izkušnja",
            "Hitrejša implementacija",
            "Personalizirani pristop"
        ]
        
        return {
            "competitors": competitors,
            "our_advantages": our_advantages,
            "market_opportunities": market_opportunities,
            "market_size_estimate": "€2.1M (Slovenija), €450M (EU)",
            "growth_rate": "12.5% letno",
            "target_market_share": "5% v 3 letih"
        }
    
    def _save_competitor_analysis(self, competitors: List[Dict]):
        """Shrani konkurenčno analizo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for comp in competitors:
            cursor.execute('''
                INSERT OR REPLACE INTO competitor_analysis 
                (competitor_name, product_name, monthly_price, features, 
                 strengths, weaknesses, market_share)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                comp["name"],
                comp["product"],
                comp["monthly_price"],
                json.dumps(comp["features"]),
                json.dumps(comp["strengths"]),
                json.dumps(comp["weaknesses"]),
                comp["market_share"]
            ))
        
        conn.commit()
        conn.close()
    
    # ==================== TRŽNE PROJEKCIJE ====================
    
    def create_market_projections(self, pricing_plans: List[PricingPlan]) -> Dict[str, Any]:
        """Ustvari tržne projekcije"""
        
        # Predpostavke za projekcije
        market_assumptions = {
            "total_restaurants_slovenia": 8500,
            "target_market_percentage": 15,  # 15% je naš target market
            "adoption_rate_year1": 2,  # 2% v prvem letu
            "adoption_rate_year2": 5,  # 5% v drugem letu
            "adoption_rate_year3": 8,  # 8% v tretjem letu
            "churn_rate": 5,  # 5% letno
            "upsell_rate": 15  # 15% strank nadgradi paket
        }
        
        target_market = market_assumptions["total_restaurants_slovenia"] * (market_assumptions["target_market_percentage"] / 100)
        
        projections = {}
        
        for year in range(1, 4):
            year_key = f"year_{year}"
            
            # Izračunaj število strank po načrtih
            adoption_rate = market_assumptions[f"adoption_rate_year{year}"] / 100
            new_customers = target_market * adoption_rate
            
            # Distribucija po načrtih (predpostavka)
            plan_distribution = {
                "Starter": 0.4,      # 40% malih podjetij
                "Professional": 0.45, # 45% srednjih podjetij
                "Enterprise": 0.12,   # 12% velikih podjetij
                "Custom": 0.03       # 3% enterprise
            }
            
            year_revenue = 0
            customers_by_plan = {}
            
            for plan in pricing_plans:
                customers = new_customers * plan_distribution.get(plan.name, 0)
                annual_revenue = customers * plan.monthly_price * 12
                year_revenue += annual_revenue
                
                customers_by_plan[plan.name] = {
                    "customers": round(customers),
                    "monthly_revenue": customers * plan.monthly_price,
                    "annual_revenue": annual_revenue
                }
            
            projections[year_key] = {
                "total_customers": round(new_customers),
                "total_monthly_revenue": year_revenue / 12,
                "total_annual_revenue": year_revenue,
                "customers_by_plan": customers_by_plan,
                "market_penetration": adoption_rate * 100
            }
        
        # Kumulativne projekcije
        cumulative_projections = self._calculate_cumulative_projections(projections, market_assumptions)
        
        return {
            "market_assumptions": market_assumptions,
            "annual_projections": projections,
            "cumulative_projections": cumulative_projections,
            "target_market_size": target_market,
            "revenue_forecast": {
                "year_1": projections["year_1"]["total_annual_revenue"],
                "year_2": projections["year_2"]["total_annual_revenue"],
                "year_3": projections["year_3"]["total_annual_revenue"]
            }
        }
    
    def _calculate_cumulative_projections(self, projections: Dict, assumptions: Dict) -> Dict:
        """Izračunaj kumulativne projekcije"""
        cumulative = {}
        total_customers = 0
        total_revenue = 0
        
        for year in range(1, 4):
            year_key = f"year_{year}"
            
            # Dodaj nove stranke
            new_customers = projections[year_key]["total_customers"]
            
            # Odštej churn iz prejšnjih let
            if year > 1:
                churn = total_customers * (assumptions["churn_rate"] / 100)
                total_customers -= churn
            
            total_customers += new_customers
            total_revenue = total_customers * 299 * 12  # Povprečna cena
            
            cumulative[year_key] = {
                "total_customers": round(total_customers),
                "annual_revenue": total_revenue,
                "monthly_revenue": total_revenue / 12
            }
        
        return cumulative
    
    # ==================== BUSINESS CASE ====================
    
    def generate_business_case(self, business_type: str = "restaurant") -> Dict[str, Any]:
        """Generiraj business case za potencialno stranko"""
        
        # Tipični kazalniki za različne tipe podjetij
        typical_metrics = {
            "restaurant": BusinessMetrics(
                monthly_revenue=25000,
                monthly_costs=20000,
                staff_count=8,
                avg_transaction=35,
                daily_transactions=120,
                inventory_turnover=12,
                customer_retention=0.65
            ),
            "hotel": BusinessMetrics(
                monthly_revenue=85000,
                monthly_costs=65000,
                staff_count=25,
                avg_transaction=180,
                daily_transactions=45,
                inventory_turnover=8,
                customer_retention=0.45
            ),
            "cafe": BusinessMetrics(
                monthly_revenue=12000,
                monthly_costs=9500,
                staff_count=4,
                avg_transaction=8,
                daily_transactions=200,
                inventory_turnover=20,
                customer_retention=0.75
            )
        }
        
        metrics = typical_metrics.get(business_type, typical_metrics["restaurant"])
        
        # Izračunaj ROI
        roi_calc = self.calculate_roi(metrics)
        
        # Priporočeni načrt
        if metrics.monthly_revenue < 15000:
            recommended_plan = "Starter"
        elif metrics.monthly_revenue < 50000:
            recommended_plan = "Professional"
        else:
            recommended_plan = "Enterprise"
        
        # Ključne koristi
        key_benefits = [
            f"Prihranek {roi_calc.monthly_savings:.0f}€/mesec",
            f"ROI {roi_calc.roi_percentage:.1f}% letno",
            f"Povrnitev investicije v {roi_calc.payback_period_months:.1f} mesecih",
            "Zmanjšanje napak za 70%",
            "Povečanje učinkovitosti za 12%",
            "Avtomatizacija 80% administrativnih nalog"
        ]
        
        # Implementacijski načrt
        implementation_plan = [
            "Teden 1: Analiza obstoječih procesov",
            "Teden 2: Namestitev in konfiguracija",
            "Teden 3: Integracija s POS in sistemi",
            "Teden 4: Usposabljanje osebja",
            "Teden 5-6: Testiranje in optimizacija",
            "Teden 7: Polna implementacija",
            "Teden 8+: Spremljanje in podpora"
        ]
        
        return {
            "business_type": business_type,
            "current_metrics": metrics.__dict__,
            "roi_calculation": roi_calc.__dict__,
            "recommended_plan": recommended_plan,
            "key_benefits": key_benefits,
            "implementation_plan": implementation_plan,
            "investment_summary": {
                "monthly_cost": 299.0,
                "annual_cost": 3588.0,
                "annual_savings": roi_calc.annual_savings,
                "net_benefit": roi_calc.annual_savings - 3588.0
            }
        }
    
    # ==================== POROČILA ====================
    
    def generate_market_report(self) -> Dict[str, Any]:
        """Generiraj celostno tržno poročilo"""
        
        pricing_plans = self.create_pricing_strategy()
        competition = self.analyze_competition()
        projections = self.create_market_projections(pricing_plans)
        business_cases = {
            "restaurant": self.generate_business_case("restaurant"),
            "hotel": self.generate_business_case("hotel"),
            "cafe": self.generate_business_case("cafe")
        }
        
        # Povzetek priložnosti
        market_opportunity = {
            "total_addressable_market": "€450M (EU)",
            "serviceable_addressable_market": "€2.1M (Slovenija)",
            "serviceable_obtainable_market": "€315K (15% target)",
            "competitive_advantage": [
                "Prvi AI-driven sistem v Sloveniji",
                "Lokalna podpora in prilagoditve",
                "Boljše razmerje cena/vrednost",
                "Hitrejša implementacija"
            ]
        }
        
        # Finančne projekcije
        financial_summary = {
            "year_1_revenue": projections["revenue_forecast"]["year_1"],
            "year_3_revenue": projections["revenue_forecast"]["year_3"],
            "break_even_customers": 50,  # Pri Professional planu
            "target_customers_year_3": projections["cumulative_projections"]["year_3"]["total_customers"]
        }
        
        return {
            "executive_summary": {
                "market_opportunity": market_opportunity,
                "financial_projections": financial_summary,
                "competitive_position": "Market Leader Potential"
            },
            "pricing_strategy": [plan.__dict__ for plan in pricing_plans],
            "competitive_analysis": competition,
            "market_projections": projections,
            "business_cases": business_cases,
            "recommendations": [
                "Fokus na Professional segment (najboljši ROI)",
                "Agresivno trženje AI funkcionalnosti",
                "Partnerstva z lokalnimi POS ponudniki",
                "Freemium model za pridobivanje strank",
                "Močna lokalna podpora kot diferenciator"
            ],
            "generated_at": datetime.now().isoformat()
        }

# Primer uporabe
if __name__ == "__main__":
    # Inicializiraj market analysis
    market = MarketAnalysis()
    
    # Generiraj celostno poročilo
    report = market.generate_market_report()
    
    print("📊 TRŽNO POROČILO GENERIRANO")
    print(f"Letni prihodek leto 3: €{report['executive_summary']['financial_projections']['year_3_revenue']:,.0f}")
    print(f"Target stranke leto 3: {report['executive_summary']['financial_projections']['target_customers_year_3']}")
    
    # Primer ROI kalkulacije
    restaurant_metrics = BusinessMetrics(
        monthly_revenue=25000,
        monthly_costs=20000,
        staff_count=8,
        avg_transaction=35,
        daily_transactions=120,
        inventory_turnover=12,
        customer_retention=0.65
    )
    
    roi = market.calculate_roi(restaurant_metrics)
    print(f"\n💰 ROI KALKULACIJA:")
    print(f"Mesečni prihranki: €{roi.monthly_savings:.0f}")
    print(f"Letni ROI: {roi.roi_percentage:.1f}%")
    print(f"Povrnitev v: {roi.payback_period_months:.1f} mesecih")