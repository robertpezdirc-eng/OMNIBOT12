"""
💰 ROI Calculator - Kalkulacija tržne vrednosti in ROI
Avtor: Omni AI Platform
Verzija: 1.0.0

Funkcionalnosti:
- ROI kalkulacije za različne tipe podjetij
- Scenariji za investicije in širitev
- Predlogi cen za mali, srednji, veliki biznis
- Analiza prihrankov in izboljšanja prodaje
- Simulacije poslovnih scenarijev
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
import pandas as pd

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BusinessSize(Enum):
    SMALL = "small"      # 1-10 zaposlenih
    MEDIUM = "medium"    # 11-50 zaposlenih
    LARGE = "large"      # 50+ zaposlenih

class InvestmentType(Enum):
    SOFTWARE = "software"
    HARDWARE = "hardware"
    TRAINING = "training"
    INTEGRATION = "integration"
    MAINTENANCE = "maintenance"

class ROICategory(Enum):
    COST_REDUCTION = "cost_reduction"
    REVENUE_INCREASE = "revenue_increase"
    EFFICIENCY_GAIN = "efficiency_gain"
    RISK_MITIGATION = "risk_mitigation"

@dataclass
class BusinessProfile:
    business_id: str
    name: str
    size: BusinessSize
    industry: str
    annual_revenue: float
    employees: int
    locations: int
    current_systems: List[str]
    pain_points: List[str]
    goals: List[str]

@dataclass
class InvestmentScenario:
    scenario_id: str
    name: str
    description: str
    initial_investment: float
    monthly_costs: float
    implementation_time: int  # meseci
    expected_benefits: Dict[str, float]
    risk_factors: List[str]
    success_probability: float

@dataclass
class ROICalculation:
    calculation_id: str
    business_profile: BusinessProfile
    scenario: InvestmentScenario
    timeframe_years: int
    total_investment: float
    total_benefits: float
    net_benefit: float
    roi_percentage: float
    payback_period: float  # meseci
    npv: float
    irr: float
    created_at: datetime

class ROICalculator:
    def __init__(self, db_path: str = "roi_calculator.db"):
        self.db_path = db_path
        self.init_database()
        logger.info("💰 ROI Calculator inicializiran")
    
    def init_database(self):
        """Inicializiraj bazo podatkov"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Tabela za poslovne profile
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS business_profiles (
                        business_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        size TEXT NOT NULL,
                        industry TEXT NOT NULL,
                        annual_revenue REAL NOT NULL,
                        employees INTEGER NOT NULL,
                        locations INTEGER DEFAULT 1,
                        current_systems TEXT,
                        pain_points TEXT,
                        goals TEXT,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                # Tabela za investicijske scenarije
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS investment_scenarios (
                        scenario_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        business_size TEXT NOT NULL,
                        initial_investment REAL NOT NULL,
                        monthly_costs REAL NOT NULL,
                        implementation_time INTEGER NOT NULL,
                        expected_benefits TEXT,
                        risk_factors TEXT,
                        success_probability REAL DEFAULT 0.8,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                # Tabela za ROI kalkulacije
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS roi_calculations (
                        calculation_id TEXT PRIMARY KEY,
                        business_id TEXT NOT NULL,
                        scenario_id TEXT NOT NULL,
                        timeframe_years INTEGER NOT NULL,
                        total_investment REAL NOT NULL,
                        total_benefits REAL NOT NULL,
                        net_benefit REAL NOT NULL,
                        roi_percentage REAL NOT NULL,
                        payback_period REAL NOT NULL,
                        npv REAL NOT NULL,
                        irr REAL NOT NULL,
                        calculation_data TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (business_id) REFERENCES business_profiles (business_id),
                        FOREIGN KEY (scenario_id) REFERENCES investment_scenarios (scenario_id)
                    )
                ''')
                
                # Tabela za cenike
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS pricing_tiers (
                        tier_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        business_size TEXT NOT NULL,
                        monthly_price REAL NOT NULL,
                        annual_price REAL NOT NULL,
                        features TEXT,
                        max_users INTEGER,
                        max_locations INTEGER,
                        support_level TEXT,
                        created_at TEXT NOT NULL
                    )
                ''')
                
                conn.commit()
                
                # Naloži vzorčne podatke
                self._load_sample_data()
                
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji baze: {e}")
    
    def _load_sample_data(self):
        """Naloži vzorčne podatke"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Preveri, če podatki že obstajajo
                cursor.execute("SELECT COUNT(*) FROM pricing_tiers")
                if cursor.fetchone()[0] > 0:
                    return
                
                # Vzorčni cenniki
                pricing_tiers = [
                    {
                        "tier_id": "starter",
                        "name": "Starter",
                        "business_size": "small",
                        "monthly_price": 299.00,
                        "annual_price": 2990.00,
                        "features": json.dumps([
                            "Osnovni POS sistem",
                            "Rezervacijski sistem",
                            "Osnovno poročanje",
                            "Email podpora"
                        ]),
                        "max_users": 5,
                        "max_locations": 1,
                        "support_level": "email"
                    },
                    {
                        "tier_id": "professional",
                        "name": "Professional",
                        "business_size": "medium",
                        "monthly_price": 799.00,
                        "annual_price": 7990.00,
                        "features": json.dumps([
                            "Napredni POS sistem",
                            "Rezervacijski sistem",
                            "CRM integracija",
                            "AI predlogi menijev",
                            "Napredna analitika",
                            "Telefonska podpora"
                        ]),
                        "max_users": 25,
                        "max_locations": 3,
                        "support_level": "phone"
                    },
                    {
                        "tier_id": "enterprise",
                        "name": "Enterprise",
                        "business_size": "large",
                        "monthly_price": 1999.00,
                        "annual_price": 19990.00,
                        "features": json.dumps([
                            "Popoln sistem",
                            "Vse integracije",
                            "AI funkcionalnosti",
                            "Personalizacija",
                            "Virtual concierge",
                            "24/7 podpora",
                            "Prilagojene rešitve"
                        ]),
                        "max_users": 999,
                        "max_locations": 999,
                        "support_level": "24/7"
                    }
                ]
                
                for tier in pricing_tiers:
                    cursor.execute('''
                        INSERT OR REPLACE INTO pricing_tiers 
                        (tier_id, name, business_size, monthly_price, annual_price, 
                         features, max_users, max_locations, support_level, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        tier["tier_id"],
                        tier["name"],
                        tier["business_size"],
                        tier["monthly_price"],
                        tier["annual_price"],
                        tier["features"],
                        tier["max_users"],
                        tier["max_locations"],
                        tier["support_level"],
                        datetime.now().isoformat()
                    ))
                
                # Vzorčni investicijski scenariji
                scenarios = [
                    {
                        "scenario_id": "small_basic",
                        "name": "Mala restavracija - Osnovni paket",
                        "description": "Implementacija osnovnega sistema za malo restavracijo",
                        "business_size": "small",
                        "initial_investment": 5000.00,
                        "monthly_costs": 299.00,
                        "implementation_time": 2,
                        "expected_benefits": json.dumps({
                            "cost_reduction": 800.00,
                            "revenue_increase": 1200.00,
                            "efficiency_gain": 600.00
                        }),
                        "risk_factors": json.dumps([
                            "Odpor zaposlenih do sprememb",
                            "Tehnične težave pri implementaciji"
                        ]),
                        "success_probability": 0.85
                    },
                    {
                        "scenario_id": "medium_professional",
                        "name": "Srednji hotel - Profesionalni paket",
                        "description": "Popolna digitalizacija srednjega hotela",
                        "business_size": "medium",
                        "initial_investment": 15000.00,
                        "monthly_costs": 799.00,
                        "implementation_time": 4,
                        "expected_benefits": json.dumps({
                            "cost_reduction": 2500.00,
                            "revenue_increase": 4000.00,
                            "efficiency_gain": 1800.00
                        }),
                        "risk_factors": json.dumps([
                            "Kompleksnost integracije",
                            "Potreba po usposabljanju",
                            "Začetni padec produktivnosti"
                        ]),
                        "success_probability": 0.75
                    },
                    {
                        "scenario_id": "large_enterprise",
                        "name": "Velika hotelska veriga - Enterprise",
                        "description": "Celostna transformacija velike hotelske verige",
                        "business_size": "large",
                        "initial_investment": 50000.00,
                        "monthly_costs": 1999.00,
                        "implementation_time": 8,
                        "expected_benefits": json.dumps({
                            "cost_reduction": 8000.00,
                            "revenue_increase": 15000.00,
                            "efficiency_gain": 6000.00
                        }),
                        "risk_factors": json.dumps([
                            "Kompleksnost sistema",
                            "Dolgotrajnost implementacije",
                            "Visoki stroški usposabljanja",
                            "Integracija z obstoječimi sistemi"
                        ]),
                        "success_probability": 0.70
                    }
                ]
                
                for scenario in scenarios:
                    cursor.execute('''
                        INSERT OR REPLACE INTO investment_scenarios 
                        (scenario_id, name, description, business_size, initial_investment,
                         monthly_costs, implementation_time, expected_benefits, risk_factors,
                         success_probability, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        scenario["scenario_id"],
                        scenario["name"],
                        scenario["description"],
                        scenario["business_size"],
                        scenario["initial_investment"],
                        scenario["monthly_costs"],
                        scenario["implementation_time"],
                        scenario["expected_benefits"],
                        scenario["risk_factors"],
                        scenario["success_probability"],
                        datetime.now().isoformat()
                    ))
                
                conn.commit()
                logger.info("✅ Vzorčni ROI podatki naloženi")
                
        except Exception as e:
            logger.error(f"Napaka pri nalaganju vzorčnih podatkov: {e}")
    
    def create_business_profile(self, profile_data: Dict[str, Any]) -> str:
        """Ustvari poslovni profil"""
        try:
            business_id = f"BIZ_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            profile = BusinessProfile(
                business_id=business_id,
                name=profile_data["name"],
                size=BusinessSize(profile_data["size"]),
                industry=profile_data["industry"],
                annual_revenue=profile_data["annual_revenue"],
                employees=profile_data["employees"],
                locations=profile_data.get("locations", 1),
                current_systems=profile_data.get("current_systems", []),
                pain_points=profile_data.get("pain_points", []),
                goals=profile_data.get("goals", [])
            )
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO business_profiles 
                    (business_id, name, size, industry, annual_revenue, employees,
                     locations, current_systems, pain_points, goals, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    profile.business_id,
                    profile.name,
                    profile.size.value,
                    profile.industry,
                    profile.annual_revenue,
                    profile.employees,
                    profile.locations,
                    json.dumps(profile.current_systems),
                    json.dumps(profile.pain_points),
                    json.dumps(profile.goals),
                    datetime.now().isoformat()
                ))
                
                conn.commit()
            
            logger.info(f"✅ Poslovni profil ustvarjen: {business_id}")
            return business_id
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju poslovnega profila: {e}")
            return None
    
    def calculate_roi(self, business_id: str, scenario_id: str, timeframe_years: int = 3) -> ROICalculation:
        """Izračunaj ROI za določen scenarij"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi poslovni profil
                cursor.execute('''
                    SELECT * FROM business_profiles WHERE business_id = ?
                ''', (business_id,))
                
                business_data = cursor.fetchone()
                if not business_data:
                    raise ValueError(f"Poslovni profil {business_id} ni najden")
                
                # Pridobi scenarij
                cursor.execute('''
                    SELECT * FROM investment_scenarios WHERE scenario_id = ?
                ''', (scenario_id,))
                
                scenario_data = cursor.fetchone()
                if not scenario_data:
                    raise ValueError(f"Scenarij {scenario_id} ni najden")
                
                # Ustvari objekte
                business_profile = BusinessProfile(
                    business_id=business_data[0],
                    name=business_data[1],
                    size=BusinessSize(business_data[2]),
                    industry=business_data[3],
                    annual_revenue=business_data[4],
                    employees=business_data[5],
                    locations=business_data[6],
                    current_systems=json.loads(business_data[7] or "[]"),
                    pain_points=json.loads(business_data[8] or "[]"),
                    goals=json.loads(business_data[9] or "[]")
                )
                
                scenario = InvestmentScenario(
                    scenario_id=scenario_data[0],
                    name=scenario_data[1],
                    description=scenario_data[2],
                    initial_investment=scenario_data[4],
                    monthly_costs=scenario_data[5],
                    implementation_time=scenario_data[6],
                    expected_benefits=json.loads(scenario_data[7]),
                    risk_factors=json.loads(scenario_data[8]),
                    success_probability=scenario_data[9]
                )
                
                # Izračunaj ROI
                total_investment = scenario.initial_investment + (scenario.monthly_costs * 12 * timeframe_years)
                
                # Izračunaj koristi
                monthly_benefits = sum(scenario.expected_benefits.values())
                total_benefits = monthly_benefits * 12 * timeframe_years
                
                # Prilagodi glede na verjetnost uspeha
                adjusted_benefits = total_benefits * scenario.success_probability
                
                net_benefit = adjusted_benefits - total_investment
                roi_percentage = (net_benefit / total_investment * 100) if total_investment > 0 else 0
                
                # Izračunaj payback period
                payback_period = total_investment / (monthly_benefits * scenario.success_probability) if monthly_benefits > 0 else float('inf')
                
                # Izračunaj NPV (predpostavimo 10% diskontno stopnjo)
                discount_rate = 0.10
                npv = 0
                for year in range(1, timeframe_years + 1):
                    annual_cash_flow = (monthly_benefits * 12 * scenario.success_probability) - (scenario.monthly_costs * 12)
                    npv += annual_cash_flow / ((1 + discount_rate) ** year)
                npv -= scenario.initial_investment
                
                # Izračunaj IRR (poenostavljeno)
                irr = ((adjusted_benefits / total_investment) ** (1/timeframe_years) - 1) * 100 if total_investment > 0 else 0
                
                calculation_id = f"ROI_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                roi_calculation = ROICalculation(
                    calculation_id=calculation_id,
                    business_profile=business_profile,
                    scenario=scenario,
                    timeframe_years=timeframe_years,
                    total_investment=total_investment,
                    total_benefits=adjusted_benefits,
                    net_benefit=net_benefit,
                    roi_percentage=roi_percentage,
                    payback_period=payback_period,
                    npv=npv,
                    irr=irr,
                    created_at=datetime.now()
                )
                
                # Shrani kalkulacijo
                cursor.execute('''
                    INSERT INTO roi_calculations 
                    (calculation_id, business_id, scenario_id, timeframe_years,
                     total_investment, total_benefits, net_benefit, roi_percentage,
                     payback_period, npv, irr, calculation_data, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    calculation_id,
                    business_id,
                    scenario_id,
                    timeframe_years,
                    total_investment,
                    adjusted_benefits,
                    net_benefit,
                    roi_percentage,
                    payback_period,
                    npv,
                    irr,
                    json.dumps(asdict(roi_calculation), default=str),
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                logger.info(f"✅ ROI kalkulacija končana: {roi_percentage:.1f}%")
                return roi_calculation
                
        except Exception as e:
            logger.error(f"Napaka pri izračunu ROI: {e}")
            return None
    
    def get_pricing_recommendations(self, business_size: BusinessSize) -> Dict[str, Any]:
        """Pridobi priporočila za cene"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM pricing_tiers WHERE business_size = ?
                ''', (business_size.value,))
                
                tier_data = cursor.fetchone()
                
                if not tier_data:
                    return {"error": "Ni podatkov za to velikost podjetja"}
                
                features = json.loads(tier_data[5])
                
                # Izračunaj prihranke
                if business_size == BusinessSize.SMALL:
                    estimated_savings = {
                        "monthly_time_savings": 40,  # ur
                        "monthly_cost_reduction": 800,  # EUR
                        "revenue_increase": 1200  # EUR
                    }
                elif business_size == BusinessSize.MEDIUM:
                    estimated_savings = {
                        "monthly_time_savings": 120,
                        "monthly_cost_reduction": 2500,
                        "revenue_increase": 4000
                    }
                else:  # LARGE
                    estimated_savings = {
                        "monthly_time_savings": 300,
                        "monthly_cost_reduction": 8000,
                        "revenue_increase": 15000
                    }
                
                total_monthly_benefit = estimated_savings["monthly_cost_reduction"] + estimated_savings["revenue_increase"]
                monthly_price = tier_data[3]
                
                roi_monthly = ((total_monthly_benefit - monthly_price) / monthly_price * 100) if monthly_price > 0 else 0
                payback_months = monthly_price / (total_monthly_benefit - monthly_price) if total_monthly_benefit > monthly_price else float('inf')
                
                return {
                    "tier_name": tier_data[1],
                    "monthly_price": monthly_price,
                    "annual_price": tier_data[4],
                    "features": features,
                    "max_users": tier_data[6],
                    "max_locations": tier_data[7],
                    "support_level": tier_data[8],
                    "estimated_savings": estimated_savings,
                    "total_monthly_benefit": total_monthly_benefit,
                    "monthly_roi": roi_monthly,
                    "payback_months": payback_months,
                    "annual_net_benefit": (total_monthly_benefit - monthly_price) * 12
                }
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju priporočil cen: {e}")
            return {"error": str(e)}
    
    def create_expansion_scenario(self, current_business: Dict[str, Any], expansion_plan: Dict[str, Any]) -> Dict[str, Any]:
        """Ustvari scenarij za širitev poslovanja"""
        try:
            current_revenue = current_business["annual_revenue"]
            current_locations = current_business["locations"]
            
            new_locations = expansion_plan["new_locations"]
            investment_per_location = expansion_plan["investment_per_location"]
            expected_revenue_per_location = expansion_plan["expected_revenue_per_location"]
            
            # Izračunaj investicijo
            total_investment = new_locations * investment_per_location
            
            # Dodatni stroški sistema
            if new_locations <= 2:
                additional_monthly_cost = 200 * new_locations
            elif new_locations <= 5:
                additional_monthly_cost = 150 * new_locations
            else:
                additional_monthly_cost = 100 * new_locations
            
            # Pričakovani prihodki
            expected_annual_revenue = new_locations * expected_revenue_per_location
            
            # Operacijski stroški (30% prihodkov)
            operational_costs = expected_annual_revenue * 0.30
            
            # Neto korist
            annual_net_benefit = expected_annual_revenue - operational_costs - (additional_monthly_cost * 12)
            
            # ROI kalkulacija
            timeframe_years = 5
            total_benefits = annual_net_benefit * timeframe_years
            roi_percentage = (total_benefits - total_investment) / total_investment * 100 if total_investment > 0 else 0
            
            payback_period = total_investment / annual_net_benefit if annual_net_benefit > 0 else float('inf')
            
            # Tveganja
            risk_factors = [
                "Tržna konkurenca na novih lokacijah",
                "Težave pri iskanju primernih lokacij",
                "Višji stroški zaposlovanja",
                "Potreba po dodatnem usposabljanju"
            ]
            
            if new_locations > 3:
                risk_factors.append("Kompleksnost upravljanja večih lokacij")
            
            return {
                "expansion_summary": {
                    "new_locations": new_locations,
                    "total_investment": total_investment,
                    "expected_annual_revenue": expected_annual_revenue,
                    "annual_net_benefit": annual_net_benefit,
                    "roi_percentage": roi_percentage,
                    "payback_years": payback_period,
                    "additional_monthly_costs": additional_monthly_cost
                },
                "financial_projections": {
                    "year_1": {
                        "revenue": expected_annual_revenue * 0.7,  # Počasnejši začetek
                        "costs": operational_costs + (additional_monthly_cost * 12),
                        "net_profit": (expected_annual_revenue * 0.7) - operational_costs - (additional_monthly_cost * 12)
                    },
                    "year_3": {
                        "revenue": expected_annual_revenue,
                        "costs": operational_costs + (additional_monthly_cost * 12),
                        "net_profit": annual_net_benefit
                    },
                    "year_5": {
                        "revenue": expected_annual_revenue * 1.2,  # Rast
                        "costs": operational_costs * 1.1 + (additional_monthly_cost * 12),
                        "net_profit": (expected_annual_revenue * 1.2) - (operational_costs * 1.1) - (additional_monthly_cost * 12)
                    }
                },
                "risk_assessment": {
                    "risk_factors": risk_factors,
                    "success_probability": 0.75 if new_locations <= 3 else 0.65,
                    "mitigation_strategies": [
                        "Temeljita analiza trga pred odprtjem",
                        "Postopno odpiranje lokacij",
                        "Centralizirano upravljanje z digitalnimi orodji",
                        "Standardizirani procesi in usposabljanje"
                    ]
                },
                "recommendations": [
                    "Začnite z 1-2 lokacijami za testiranje",
                    "Implementirajte centralizirani sistem upravljanja",
                    "Investirajte v usposabljanje lokalnih managerjev",
                    "Spremljajte KPI metrike za vsako lokacijo"
                ]
            }
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju scenarija širitve: {e}")
            return {"error": str(e)}
    
    def generate_business_case(self, business_id: str, scenario_id: str) -> Dict[str, Any]:
        """Generiraj poslovni primer (business case)"""
        try:
            # Izračunaj ROI
            roi_calc = self.calculate_roi(business_id, scenario_id, 3)
            
            if not roi_calc:
                return {"error": "Ni mogoče izračunati ROI"}
            
            # Pridobi priporočila cen
            pricing = self.get_pricing_recommendations(roi_calc.business_profile.size)
            
            # Ustvari poslovni primer
            business_case = {
                "executive_summary": {
                    "investment_required": roi_calc.total_investment,
                    "expected_roi": roi_calc.roi_percentage,
                    "payback_period": roi_calc.payback_period,
                    "net_benefit": roi_calc.net_benefit,
                    "recommendation": "Priporočeno" if roi_calc.roi_percentage > 20 else "Pogojno priporočeno" if roi_calc.roi_percentage > 0 else "Ni priporočeno"
                },
                "financial_analysis": {
                    "initial_investment": roi_calc.scenario.initial_investment,
                    "monthly_costs": roi_calc.scenario.monthly_costs,
                    "total_investment_3_years": roi_calc.total_investment,
                    "expected_benefits": roi_calc.scenario.expected_benefits,
                    "total_benefits_3_years": roi_calc.total_benefits,
                    "npv": roi_calc.npv,
                    "irr": roi_calc.irr
                },
                "business_impact": {
                    "cost_reductions": [
                        "Avtomatizacija administrativnih nalog",
                        "Zmanjšanje napak pri rezervacijah",
                        "Optimizacija zalog in zmanjšanje odpadkov",
                        "Učinkovitejše upravljanje osebja"
                    ],
                    "revenue_increases": [
                        "Boljša izkušnja gostov in večja lojalnost",
                        "Dinamično oblikovanje cen",
                        "Personalizirane ponudbe",
                        "Povečana zasedenost"
                    ],
                    "efficiency_gains": [
                        "Hitrejše procesiranje rezervacij",
                        "Avtomatsko poročanje",
                        "Real-time pregled poslovanja",
                        "Boljša komunikacija z gosti"
                    ]
                },
                "risk_analysis": {
                    "risks": roi_calc.scenario.risk_factors,
                    "success_probability": roi_calc.scenario.success_probability,
                    "mitigation_strategies": [
                        "Postopna implementacija po fazah",
                        "Temeljito usposabljanje osebja",
                        "Redna podpora in vzdrževanje",
                        "Spremljanje KPI metrik"
                    ]
                },
                "implementation_plan": {
                    "phase_1": "Analiza potreb in priprava (1 mesec)",
                    "phase_2": f"Implementacija osnovnih funkcij ({roi_calc.scenario.implementation_time//2} meseci)",
                    "phase_3": f"Napredne funkcije in optimizacija ({roi_calc.scenario.implementation_time//2} meseci)",
                    "phase_4": "Usposabljanje in go-live (1 mesec)"
                },
                "success_metrics": [
                    "ROI > 20% v 3 letih",
                    "Payback period < 18 mesecev",
                    "Povečanje zadovoljstva gostov za 15%",
                    "Zmanjšanje operacijskih stroškov za 10%",
                    "Povečanje prihodkov za 20%"
                ]
            }
            
            return business_case
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju poslovnega primera: {e}")
            return {"error": str(e)}

# Primer uporabe
if __name__ == "__main__":
    # Inicializacija
    roi_calc = ROICalculator()
    
    print("💰 ROI Calculator - Test")
    print("=" * 50)
    
    # Test ustvarjanja poslovnega profila
    print("\n🏢 Ustvarjanje poslovnega profila:")
    business_data = {
        "name": "Hotel Slovenija",
        "size": "medium",
        "industry": "hospitality",
        "annual_revenue": 2500000,
        "employees": 35,
        "locations": 2,
        "current_systems": ["Stari POS", "Excel rezervacije"],
        "pain_points": ["Počasne rezervacije", "Napake pri obračunu", "Slaba analitika"],
        "goals": ["Digitalizacija", "Povečanje prihodkov", "Boljša izkušnja gostov"]
    }
    
    business_id = roi_calc.create_business_profile(business_data)
    if business_id:
        print(f"✅ Poslovni profil ustvarjen: {business_id}")
    
    # Test ROI kalkulacije
    print("\n📊 ROI kalkulacija:")
    roi_result = roi_calc.calculate_roi(business_id, "medium_professional", 3)
    if roi_result:
        print(f"✅ ROI: {roi_result.roi_percentage:.1f}%")
        print(f"✅ Payback period: {roi_result.payback_period:.1f} mesecev")
        print(f"✅ Net benefit: {roi_result.net_benefit:,.2f} EUR")
        print(f"✅ NPV: {roi_result.npv:,.2f} EUR")
    
    # Test priporočil cen
    print("\n💰 Priporočila cen:")
    pricing = roi_calc.get_pricing_recommendations(BusinessSize.MEDIUM)
    if "error" not in pricing:
        print(f"✅ Paket: {pricing['tier_name']}")
        print(f"✅ Mesečna cena: {pricing['monthly_price']:,.2f} EUR")
        print(f"✅ Letna korist: {pricing['annual_net_benefit']:,.2f} EUR")
        print(f"✅ Mesečni ROI: {pricing['monthly_roi']:.1f}%")
    
    # Test scenarija širitve
    print("\n🚀 Scenarij širitve:")
    expansion_data = {
        "new_locations": 2,
        "investment_per_location": 75000,
        "expected_revenue_per_location": 800000
    }
    
    expansion = roi_calc.create_expansion_scenario(business_data, expansion_data)
    if "error" not in expansion:
        summary = expansion["expansion_summary"]
        print(f"✅ Nove lokacije: {summary['new_locations']}")
        print(f"✅ Skupna investicija: {summary['total_investment']:,.2f} EUR")
        print(f"✅ ROI: {summary['roi_percentage']:.1f}%")
        print(f"✅ Payback: {summary['payback_years']:.1f} let")
    
    # Test poslovnega primera
    print("\n📋 Poslovni primer:")
    business_case = roi_calc.generate_business_case(business_id, "medium_professional")
    if "error" not in business_case:
        summary = business_case["executive_summary"]
        print(f"✅ Priporočilo: {summary['recommendation']}")
        print(f"✅ Pričakovani ROI: {summary['expected_roi']:.1f}%")
        print(f"✅ Neto korist: {summary['net_benefit']:,.2f} EUR")
    
    logger.info("💰 ROI Calculator sistem uspešno testiran!")