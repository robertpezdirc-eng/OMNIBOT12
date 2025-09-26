#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌱 Omni Agriculture Support
===========================

Kmetijski pomočnik za:
- Upravljanje pridelave rastlin
- Živinoreja in veterinarska skrb
- Optimizacija kmetijskih procesov
- Sezonsko načrtovanje
- Trženje kmetijskih izdelkov
- Trajnostno kmetijstvo

Avtor: Omni AI Assistant
Datum: 22. september 2025
Verzija: 1.0 Production
"""

import json
import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import statistics
import random

# Konfiguracija
AGRICULTURE_DB = "omni/data/agriculture.db"
AGRICULTURE_LOG = "omni/logs/agriculture.log"
CROPS_FILE = "omni/data/crops.json"
LIVESTOCK_FILE = "omni/data/livestock.json"

# Logging
os.makedirs(os.path.dirname(AGRICULTURE_LOG), exist_ok=True)
logger = logging.getLogger(__name__)

def __name__():
    return "agriculture_support"

class CropType(Enum):
    VEGETABLES = "vegetables"
    FRUITS = "fruits"
    GRAINS = "grains"
    HERBS = "herbs"
    FLOWERS = "flowers"

class LivestockType(Enum):
    CATTLE = "cattle"
    PIGS = "pigs"
    SHEEP = "sheep"
    GOATS = "goats"
    POULTRY = "poultry"
    HORSES = "horses"

class Season(Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"

class GrowthStage(Enum):
    SEEDING = "seeding"
    GERMINATION = "germination"
    VEGETATIVE = "vegetative"
    FLOWERING = "flowering"
    FRUITING = "fruiting"
    HARVEST = "harvest"

class HealthStatus(Enum):
    HEALTHY = "healthy"
    SICK = "sick"
    RECOVERING = "recovering"
    CRITICAL = "critical"

@dataclass
class Crop:
    id: str
    name: str
    crop_type: CropType
    variety: str
    planting_date: datetime
    expected_harvest: datetime
    area_hectares: float
    growth_stage: GrowthStage
    health_status: HealthStatus
    soil_ph: float
    irrigation_schedule: List[str]
    fertilizer_schedule: List[str]
    pest_control: List[str]
    expected_yield_kg: float
    market_price_per_kg: float

@dataclass
class Livestock:
    id: str
    name: str
    livestock_type: LivestockType
    breed: str
    birth_date: datetime
    gender: str
    weight_kg: float
    health_status: HealthStatus
    vaccination_schedule: List[Dict[str, str]]
    feeding_schedule: List[str]
    breeding_history: List[str]
    production_data: Dict[str, float]  # mleko, jajca, volna, itd.
    market_value: float

@dataclass
class WeatherData:
    date: datetime
    temperature_min: float
    temperature_max: float
    humidity: float
    precipitation_mm: float
    wind_speed_kmh: float
    sunshine_hours: float

@dataclass
class SoilAnalysis:
    field_id: str
    analysis_date: datetime
    ph_level: float
    nitrogen_ppm: float
    phosphorus_ppm: float
    potassium_ppm: float
    organic_matter_percent: float
    moisture_percent: float
    recommendations: List[str]

@dataclass
class MarketPrice:
    product_name: str
    date: datetime
    price_per_kg: float
    market_location: str
    demand_level: str  # low, medium, high
    quality_grade: str

class AgricultureSupport:
    """🌱 Kmetijski pomočnik Omni"""
    
    def __init__(self):
        self.crops = {}
        self.livestock = {}
        self.weather_data = []
        self.soil_analyses = []
        self.market_prices = []
        self._init_database()
        self._load_sample_data()
        logger.info("🌱 Kmetijski pomočnik inicializiran")
    
    def _init_database(self):
        """Inicializacija kmetijske baze"""
        try:
            os.makedirs(os.path.dirname(AGRICULTURE_DB), exist_ok=True)
            conn = sqlite3.connect(AGRICULTURE_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS crops (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    crop_type TEXT NOT NULL,
                    variety TEXT NOT NULL,
                    planting_date TEXT NOT NULL,
                    expected_harvest TEXT NOT NULL,
                    area_hectares REAL NOT NULL,
                    growth_stage TEXT NOT NULL,
                    health_status TEXT NOT NULL,
                    soil_ph REAL NOT NULL,
                    irrigation_schedule TEXT NOT NULL,
                    fertilizer_schedule TEXT NOT NULL,
                    pest_control TEXT NOT NULL,
                    expected_yield_kg REAL NOT NULL,
                    market_price_per_kg REAL NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS livestock (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    livestock_type TEXT NOT NULL,
                    breed TEXT NOT NULL,
                    birth_date TEXT NOT NULL,
                    gender TEXT NOT NULL,
                    weight_kg REAL NOT NULL,
                    health_status TEXT NOT NULL,
                    vaccination_schedule TEXT NOT NULL,
                    feeding_schedule TEXT NOT NULL,
                    breeding_history TEXT NOT NULL,
                    production_data TEXT NOT NULL,
                    market_value REAL NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS weather_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    temperature_min REAL NOT NULL,
                    temperature_max REAL NOT NULL,
                    humidity REAL NOT NULL,
                    precipitation_mm REAL NOT NULL,
                    wind_speed_kmh REAL NOT NULL,
                    sunshine_hours REAL NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS soil_analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    field_id TEXT NOT NULL,
                    analysis_date TEXT NOT NULL,
                    ph_level REAL NOT NULL,
                    nitrogen_ppm REAL NOT NULL,
                    phosphorus_ppm REAL NOT NULL,
                    potassium_ppm REAL NOT NULL,
                    organic_matter_percent REAL NOT NULL,
                    moisture_percent REAL NOT NULL,
                    recommendations TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS market_prices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    price_per_kg REAL NOT NULL,
                    market_location TEXT NOT NULL,
                    demand_level TEXT NOT NULL,
                    quality_grade TEXT NOT NULL
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji kmetijske baze: {e}")
    
    def _load_sample_data(self):
        """Naloži vzorčne podatke"""
        try:
            # Ustvari vzorčne pridelke
            sample_crops = [
                {
                    "id": "CROP_TOMATO_001",
                    "name": "Paradižnik",
                    "crop_type": CropType.VEGETABLES,
                    "variety": "San Marzano",
                    "planting_date": datetime.now() - timedelta(days=60),
                    "expected_harvest": datetime.now() + timedelta(days=30),
                    "area_hectares": 0.5,
                    "growth_stage": GrowthStage.FLOWERING,
                    "health_status": HealthStatus.HEALTHY,
                    "soil_ph": 6.5,
                    "irrigation_schedule": ["zjutraj 7:00", "zvečer 19:00"],
                    "fertilizer_schedule": ["tedensko NPK", "mesečno kompost"],
                    "pest_control": ["biološki pripravki", "koristni insekti"],
                    "expected_yield_kg": 2500.0,
                    "market_price_per_kg": 3.50
                },
                {
                    "id": "CROP_WHEAT_001",
                    "name": "Pšenica",
                    "crop_type": CropType.GRAINS,
                    "variety": "Žitarka",
                    "planting_date": datetime.now() - timedelta(days=180),
                    "expected_harvest": datetime.now() + timedelta(days=45),
                    "area_hectares": 5.0,
                    "growth_stage": GrowthStage.FRUITING,
                    "health_status": HealthStatus.HEALTHY,
                    "soil_ph": 7.0,
                    "irrigation_schedule": ["po potrebi"],
                    "fertilizer_schedule": ["spomladansko gnojenje", "jesenska priprava"],
                    "pest_control": ["fungicidi", "herbicidi"],
                    "expected_yield_kg": 20000.0,
                    "market_price_per_kg": 0.25
                }
            ]
            
            for crop_data in sample_crops:
                crop = Crop(**crop_data)
                self.crops[crop.id] = crop
            
            # Ustvari vzorčno živino
            sample_livestock = [
                {
                    "id": "LIVE_COW_001",
                    "name": "Milka",
                    "livestock_type": LivestockType.CATTLE,
                    "breed": "Holstein",
                    "birth_date": datetime.now() - timedelta(days=1095),  # 3 leta
                    "gender": "female",
                    "weight_kg": 650.0,
                    "health_status": HealthStatus.HEALTHY,
                    "vaccination_schedule": [
                        {"vaccine": "BVD", "date": "2025-01-15", "next_due": "2026-01-15"},
                        {"vaccine": "IBR", "date": "2025-01-15", "next_due": "2026-01-15"}
                    ],
                    "feeding_schedule": ["seno 2x dnevno", "koncentrat 1x dnevno", "paša"],
                    "breeding_history": ["2024-03-15: osemenitev", "2024-12-20: tele"],
                    "production_data": {"milk_liters_per_day": 25.0, "fat_percentage": 3.8},
                    "market_value": 1800.0
                },
                {
                    "id": "LIVE_PIG_001",
                    "name": "Pepa",
                    "livestock_type": LivestockType.PIGS,
                    "breed": "Landrace",
                    "birth_date": datetime.now() - timedelta(days=180),  # 6 mesecev
                    "gender": "female",
                    "weight_kg": 85.0,
                    "health_status": HealthStatus.HEALTHY,
                    "vaccination_schedule": [
                        {"vaccine": "Parvoviroza", "date": "2024-12-01", "next_due": "2025-12-01"}
                    ],
                    "feeding_schedule": ["krmna mešanica 3x dnevno", "zelenjava"],
                    "breeding_history": [],
                    "production_data": {"weight_gain_kg_per_day": 0.8},
                    "market_value": 340.0
                }
            ]
            
            for livestock_data in sample_livestock:
                livestock = Livestock(**livestock_data)
                self.livestock[livestock.id] = livestock
            
            # Generiraj vzorčne vremenske podatke
            for i in range(30):  # Zadnjih 30 dni
                date = datetime.now() - timedelta(days=i)
                weather = WeatherData(
                    date=date,
                    temperature_min=random.uniform(5, 15),
                    temperature_max=random.uniform(15, 25),
                    humidity=random.uniform(40, 80),
                    precipitation_mm=random.uniform(0, 10),
                    wind_speed_kmh=random.uniform(5, 20),
                    sunshine_hours=random.uniform(4, 12)
                )
                self.weather_data.append(weather)
            
        except Exception as e:
            logger.error(f"❌ Napaka pri nalaganju vzorčnih podatkov: {e}")
    
    def add_crop(self, name: str, crop_type: str, variety: str, area_hectares: float,
                planting_date: datetime, expected_yield_kg: float) -> str:
        """Dodaj nov pridelek"""
        try:
            crop_id = f"CROP_{name.upper()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Izračunaj pričakovano žetev na podlagi vrste pridelka
            harvest_days = {
                "vegetables": 90,
                "fruits": 120,
                "grains": 180,
                "herbs": 60,
                "flowers": 75
            }
            
            expected_harvest = planting_date + timedelta(days=harvest_days.get(crop_type, 90))
            
            crop = Crop(
                id=crop_id,
                name=name,
                crop_type=CropType(crop_type),
                variety=variety,
                planting_date=planting_date,
                expected_harvest=expected_harvest,
                area_hectares=area_hectares,
                growth_stage=GrowthStage.SEEDING,
                health_status=HealthStatus.HEALTHY,
                soil_ph=7.0,  # Privzeta vrednost
                irrigation_schedule=["zjutraj", "zvečer"],
                fertilizer_schedule=["tedensko"],
                pest_control=["biološki pripravki"],
                expected_yield_kg=expected_yield_kg,
                market_price_per_kg=2.0  # Privzeta cena
            )
            
            self.crops[crop_id] = crop
            
            # Shrani v bazo
            self._save_crop_to_db(crop)
            
            logger.info(f"🌱 Dodan pridelek: {name} ({crop_id})")
            return crop_id
            
        except Exception as e:
            logger.error(f"❌ Napaka pri dodajanju pridelka: {e}")
            return ""
    
    def add_livestock(self, name: str, livestock_type: str, breed: str,
                     birth_date: datetime, gender: str, weight_kg: float) -> str:
        """Dodaj novo žival"""
        try:
            livestock_id = f"LIVE_{livestock_type.upper()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            livestock = Livestock(
                id=livestock_id,
                name=name,
                livestock_type=LivestockType(livestock_type),
                breed=breed,
                birth_date=birth_date,
                gender=gender,
                weight_kg=weight_kg,
                health_status=HealthStatus.HEALTHY,
                vaccination_schedule=[],
                feeding_schedule=["2x dnevno"],
                breeding_history=[],
                production_data={},
                market_value=weight_kg * 4.0  # Privzeta vrednost
            )
            
            self.livestock[livestock_id] = livestock
            
            # Shrani v bazo
            self._save_livestock_to_db(livestock)
            
            logger.info(f"🐄 Dodana žival: {name} ({livestock_id})")
            return livestock_id
            
        except Exception as e:
            logger.error(f"❌ Napaka pri dodajanju živali: {e}")
            return ""
    
    def _save_crop_to_db(self, crop: Crop):
        """Shrani pridelek v bazo"""
        try:
            conn = sqlite3.connect(AGRICULTURE_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO crops 
                (id, name, crop_type, variety, planting_date, expected_harvest,
                 area_hectares, growth_stage, health_status, soil_ph,
                 irrigation_schedule, fertilizer_schedule, pest_control,
                 expected_yield_kg, market_price_per_kg)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                crop.id, crop.name, crop.crop_type.value, crop.variety,
                crop.planting_date.isoformat(), crop.expected_harvest.isoformat(),
                crop.area_hectares, crop.growth_stage.value, crop.health_status.value,
                crop.soil_ph, json.dumps(crop.irrigation_schedule),
                json.dumps(crop.fertilizer_schedule), json.dumps(crop.pest_control),
                crop.expected_yield_kg, crop.market_price_per_kg
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju pridelka: {e}")
    
    def _save_livestock_to_db(self, livestock: Livestock):
        """Shrani žival v bazo"""
        try:
            conn = sqlite3.connect(AGRICULTURE_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO livestock 
                (id, name, livestock_type, breed, birth_date, gender, weight_kg,
                 health_status, vaccination_schedule, feeding_schedule,
                 breeding_history, production_data, market_value)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                livestock.id, livestock.name, livestock.livestock_type.value,
                livestock.breed, livestock.birth_date.isoformat(), livestock.gender,
                livestock.weight_kg, livestock.health_status.value,
                json.dumps(livestock.vaccination_schedule), json.dumps(livestock.feeding_schedule),
                json.dumps(livestock.breeding_history), json.dumps(livestock.production_data),
                livestock.market_value
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju živali: {e}")
    
    def get_seasonal_recommendations(self, season: Season = None) -> Dict[str, Any]:
        """Pridobi sezonska priporočila"""
        try:
            if not season:
                # Določi trenutno sezono
                month = datetime.now().month
                if month in [3, 4, 5]:
                    season = Season.SPRING
                elif month in [6, 7, 8]:
                    season = Season.SUMMER
                elif month in [9, 10, 11]:
                    season = Season.AUTUMN
                else:
                    season = Season.WINTER
            
            recommendations = {
                "season": season.value,
                "crop_activities": [],
                "livestock_activities": [],
                "general_tasks": [],
                "weather_considerations": []
            }
            
            if season == Season.SPRING:
                recommendations["crop_activities"] = [
                    "Priprava tal za setev",
                    "Setev zgodnje zelenjave",
                    "Sajenje sadnih dreves",
                    "Gnojenje z organskimi gnojili",
                    "Začetek namakanja"
                ]
                recommendations["livestock_activities"] = [
                    "Priprava pašnikov",
                    "Cepljenje živali",
                    "Začetek pašne sezone",
                    "Kontrola zdravja po zimi"
                ]
                recommendations["general_tasks"] = [
                    "Servis kmetijske mehanizacije",
                    "Priprava orodij",
                    "Načrtovanje letne pridelave"
                ]
            
            elif season == Season.SUMMER:
                recommendations["crop_activities"] = [
                    "Redna kontrola škodljivcev",
                    "Intenzivno namakanje",
                    "Obiranje zgodnje zelenjave",
                    "Košnja trav za seno",
                    "Setev pozne zelenjave"
                ]
                recommendations["livestock_activities"] = [
                    "Zagotavljanje sence in vode",
                    "Kontrola parazitov",
                    "Košnja pašnikov",
                    "Priprava krme za zimo"
                ]
                recommendations["general_tasks"] = [
                    "Vzdrževanje namakalnih sistemov",
                    "Priprava za žetev",
                    "Trženje svežih izdelkov"
                ]
            
            elif season == Season.AUTUMN:
                recommendations["crop_activities"] = [
                    "Žetev glavnih pridelkov",
                    "Priprava tal za zimo",
                    "Setev ozimin",
                    "Skladiščenje pridelkov",
                    "Obrezovanje sadnih dreves"
                ]
                recommendations["livestock_activities"] = [
                    "Priprava hlevov za zimo",
                    "Zagotavljanje zimske krme",
                    "Zdravstveni pregledi",
                    "Načrtovanje parjenja"
                ]
                recommendations["general_tasks"] = [
                    "Vzdrževanje strojev",
                    "Priprava na zimo",
                    "Prodaja pridelkov"
                ]
            
            else:  # WINTER
                recommendations["crop_activities"] = [
                    "Načrtovanje naslednje sezone",
                    "Vzdrževanje rastlinjakov",
                    "Kontrola skladiščenih pridelkov",
                    "Priprava semen",
                    "Študij novih sort"
                ]
                recommendations["livestock_activities"] = [
                    "Zimska nega živali",
                    "Kontrola krme",
                    "Vzdrževanje hlevov",
                    "Načrtovanje vzreje"
                ]
                recommendations["general_tasks"] = [
                    "Izobraževanje in usposabljanje",
                    "Načrtovanje investicij",
                    "Priprava na novo sezono"
                ]
            
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju sezonskih priporočil: {e}")
            return {}
    
    def analyze_crop_health(self, crop_id: str) -> Dict[str, Any]:
        """Analiziraj zdravje pridelka"""
        try:
            if crop_id not in self.crops:
                return {"error": "Pridelek ne obstaja"}
            
            crop = self.crops[crop_id]
            
            analysis = {
                "crop_id": crop_id,
                "crop_name": crop.name,
                "current_stage": crop.growth_stage.value,
                "health_status": crop.health_status.value,
                "days_since_planting": (datetime.now() - crop.planting_date).days,
                "days_to_harvest": (crop.expected_harvest - datetime.now()).days,
                "soil_conditions": {},
                "recommendations": [],
                "risk_factors": [],
                "expected_yield": crop.expected_yield_kg
            }
            
            # Analiza tal
            analysis["soil_conditions"] = {
                "ph_level": crop.soil_ph,
                "ph_status": "optimalen" if 6.0 <= crop.soil_ph <= 7.5 else "potrebna korekcija",
                "irrigation_frequency": len(crop.irrigation_schedule)
            }
            
            # Priporočila na podlagi faze rasti
            if crop.growth_stage == GrowthStage.SEEDING:
                analysis["recommendations"].extend([
                    "Zagotovi optimalno vlažnost tal",
                    "Zaščiti pred škodljivci",
                    "Preveri kalitev"
                ])
            elif crop.growth_stage == GrowthStage.VEGETATIVE:
                analysis["recommendations"].extend([
                    "Povečaj gnojenje z dušikom",
                    "Redna kontrola plevela",
                    "Optimiziraj namakanje"
                ])
            elif crop.growth_stage == GrowthStage.FLOWERING:
                analysis["recommendations"].extend([
                    "Zmanjšaj dušično gnojenje",
                    "Povečaj fosfor in kalij",
                    "Zaščiti pred vetrom"
                ])
            elif crop.growth_stage == GrowthStage.FRUITING:
                analysis["recommendations"].extend([
                    "Redna kontrola zrelosti",
                    "Priprava na obiranje",
                    "Kontrola škodljivcev na plodovih"
                ])
            
            # Analiza tveganj
            if crop.soil_ph < 6.0:
                analysis["risk_factors"].append("Preveč kisla tla - dodaj apno")
            elif crop.soil_ph > 8.0:
                analysis["risk_factors"].append("Preveč bazična tla - dodaj žveplo")
            
            if crop.health_status != HealthStatus.HEALTHY:
                analysis["risk_factors"].append("Zdravstvene težave - potreben veterinarski pregled")
            
            # Vremenska tveganja
            recent_weather = self.weather_data[:7]  # Zadnji teden
            if recent_weather:
                avg_precipitation = statistics.mean([w.precipitation_mm for w in recent_weather])
                if avg_precipitation > 20:
                    analysis["risk_factors"].append("Preveč padavin - tveganje za glivične bolezni")
                elif avg_precipitation < 2:
                    analysis["risk_factors"].append("Premalo padavin - povečaj namakanje")
            
            return analysis
            
        except Exception as e:
            logger.error(f"❌ Napaka pri analizi zdravja pridelka: {e}")
            return {"error": str(e)}
    
    def optimize_feeding_schedule(self, livestock_id: str) -> Dict[str, Any]:
        """Optimiziraj urnik hranjenja"""
        try:
            if livestock_id not in self.livestock:
                return {"error": "Žival ne obstaja"}
            
            livestock = self.livestock[livestock_id]
            
            # Izračunaj potrebe na podlagi vrste, starosti in teže
            age_days = (datetime.now() - livestock.birth_date).days
            
            optimization = {
                "livestock_id": livestock_id,
                "livestock_name": livestock.name,
                "current_weight": livestock.weight_kg,
                "age_days": age_days,
                "optimized_schedule": [],
                "daily_feed_kg": 0.0,
                "feed_cost_per_day": 0.0,
                "nutritional_requirements": {},
                "recommendations": []
            }
            
            # Osnove hranjenja po vrstah
            if livestock.livestock_type == LivestockType.CATTLE:
                # Krave potrebujejo 2-3% telesne teže v suhi snovi
                dry_matter_kg = livestock.weight_kg * 0.025
                optimization["daily_feed_kg"] = dry_matter_kg
                optimization["feed_cost_per_day"] = dry_matter_kg * 0.30  # 0.30 EUR/kg
                
                optimization["optimized_schedule"] = [
                    "06:00 - Seno (40% dnevnega obroka)",
                    "12:00 - Koncentrat (30% dnevnega obroka)",
                    "18:00 - Seno in silaža (30% dnevnega obroka)"
                ]
                
                optimization["nutritional_requirements"] = {
                    "protein_percent": 16,
                    "energy_MJ_per_kg": 11,
                    "calcium_g_per_kg": 6,
                    "phosphorus_g_per_kg": 4
                }
                
                if "milk_liters_per_day" in livestock.production_data:
                    milk_production = livestock.production_data["milk_liters_per_day"]
                    # Dodatne potrebe za mleko
                    additional_feed = milk_production * 0.4
                    optimization["daily_feed_kg"] += additional_feed
                    optimization["feed_cost_per_day"] += additional_feed * 0.35
                    optimization["recommendations"].append(f"Dodatna krma za {milk_production}L mleka dnevno")
            
            elif livestock.livestock_type == LivestockType.PIGS:
                # Prašiči potrebujejo 3-4% telesne teže
                daily_feed = livestock.weight_kg * 0.035
                optimization["daily_feed_kg"] = daily_feed
                optimization["feed_cost_per_day"] = daily_feed * 0.40  # 0.40 EUR/kg
                
                optimization["optimized_schedule"] = [
                    "07:00 - Krmna mešanica (33% dnevnega obroka)",
                    "13:00 - Krmna mešanica (33% dnevnega obroka)",
                    "19:00 - Krmna mešanica (34% dnevnega obroka)"
                ]
                
                optimization["nutritional_requirements"] = {
                    "protein_percent": 18,
                    "energy_MJ_per_kg": 13,
                    "lysine_percent": 1.1,
                    "calcium_g_per_kg": 7
                }
            
            elif livestock.livestock_type == LivestockType.POULTRY:
                # Perutnina potrebuje 8-10% telesne teže
                daily_feed = livestock.weight_kg * 0.09
                optimization["daily_feed_kg"] = daily_feed
                optimization["feed_cost_per_day"] = daily_feed * 0.50  # 0.50 EUR/kg
                
                optimization["optimized_schedule"] = [
                    "06:00 - Krmna mešanica (50% dnevnega obroka)",
                    "16:00 - Krmna mešanica (50% dnevnega obroka)"
                ]
                
                optimization["nutritional_requirements"] = {
                    "protein_percent": 20,
                    "energy_MJ_per_kg": 12,
                    "calcium_g_per_kg": 35,  # Višje za jajca
                    "methionine_percent": 0.5
                }
            
            # Splošna priporočila
            if age_days < 365:  # Mlada žival
                optimization["recommendations"].append("Povečaj beljakovine za rast")
                optimization["nutritional_requirements"]["protein_percent"] += 2
            
            if livestock.health_status != HealthStatus.HEALTHY:
                optimization["recommendations"].append("Dodaj probiotike in vitamine")
                optimization["feed_cost_per_day"] *= 1.1  # 10% povišanje za dodatke
            
            # Sezonska prilagoditev
            current_season = self._get_current_season()
            if current_season in ["winter"]:
                optimization["recommendations"].append("Povečaj energijsko vrednost krme za zimo")
                optimization["daily_feed_kg"] *= 1.1
            
            return optimization
            
        except Exception as e:
            logger.error(f"❌ Napaka pri optimizaciji hranjenja: {e}")
            return {"error": str(e)}
    
    def _get_current_season(self) -> str:
        """Pridobi trenutno sezono"""
        month = datetime.now().month
        if month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        elif month in [9, 10, 11]:
            return "autumn"
        else:
            return "winter"
    
    def calculate_farm_profitability(self) -> Dict[str, Any]:
        """Izračunaj donosnost kmetije"""
        try:
            profitability = {
                "analysis_date": datetime.now().isoformat(),
                "crop_revenue": 0.0,
                "livestock_revenue": 0.0,
                "total_revenue": 0.0,
                "crop_costs": 0.0,
                "livestock_costs": 0.0,
                "total_costs": 0.0,
                "net_profit": 0.0,
                "profit_margin": 0.0,
                "crop_details": [],
                "livestock_details": []
            }
            
            # Analiza pridelkov
            for crop in self.crops.values():
                crop_revenue = crop.expected_yield_kg * crop.market_price_per_kg
                crop_costs = crop.area_hectares * 1500  # Povprečni stroški na hektar
                
                profitability["crop_revenue"] += crop_revenue
                profitability["crop_costs"] += crop_costs
                
                profitability["crop_details"].append({
                    "name": crop.name,
                    "area_hectares": crop.area_hectares,
                    "expected_yield_kg": crop.expected_yield_kg,
                    "price_per_kg": crop.market_price_per_kg,
                    "revenue": crop_revenue,
                    "costs": crop_costs,
                    "profit": crop_revenue - crop_costs,
                    "profit_per_hectare": (crop_revenue - crop_costs) / crop.area_hectares
                })
            
            # Analiza živinoreje
            for livestock in self.livestock.values():
                # Letni prihodek na žival
                if livestock.livestock_type == LivestockType.CATTLE:
                    if "milk_liters_per_day" in livestock.production_data:
                        annual_revenue = livestock.production_data["milk_liters_per_day"] * 365 * 0.35  # 0.35 EUR/L
                    else:
                        annual_revenue = livestock.market_value * 0.8  # Meso
                    annual_costs = 1200  # Povprečni letni stroški za kravo
                
                elif livestock.livestock_type == LivestockType.PIGS:
                    annual_revenue = livestock.market_value
                    annual_costs = 180  # Stroški za prašiča
                
                elif livestock.livestock_type == LivestockType.POULTRY:
                    annual_revenue = 365 * 0.8 * 0.25  # 0.8 jajc na dan, 0.25 EUR/jajce
                    annual_costs = 25  # Stroški za kokoš
                
                else:
                    annual_revenue = livestock.market_value * 0.3
                    annual_costs = livestock.market_value * 0.2
                
                profitability["livestock_revenue"] += annual_revenue
                profitability["livestock_costs"] += annual_costs
                
                profitability["livestock_details"].append({
                    "name": livestock.name,
                    "type": livestock.livestock_type.value,
                    "market_value": livestock.market_value,
                    "annual_revenue": annual_revenue,
                    "annual_costs": annual_costs,
                    "annual_profit": annual_revenue - annual_costs
                })
            
            # Skupni izračuni
            profitability["total_revenue"] = profitability["crop_revenue"] + profitability["livestock_revenue"]
            profitability["total_costs"] = profitability["crop_costs"] + profitability["livestock_costs"]
            profitability["net_profit"] = profitability["total_revenue"] - profitability["total_costs"]
            
            if profitability["total_revenue"] > 0:
                profitability["profit_margin"] = (profitability["net_profit"] / profitability["total_revenue"]) * 100
            
            return profitability
            
        except Exception as e:
            logger.error(f"❌ Napaka pri izračunu donosnosti: {e}")
            return {"error": str(e)}
    
    def auto_optimize(self) -> Dict[str, Any]:
        """Avtomatska kmetijska optimizacija"""
        try:
            optimization_results = {
                "timestamp": datetime.now().isoformat(),
                "crops_optimized": 0,
                "livestock_optimized": 0,
                "yield_improvements": 0.0,
                "cost_reductions": 0.0,
                "sustainability_score": 0.0
            }
            
            # 1. Optimiziraj pridelke
            for crop in self.crops.values():
                # Simuliraj izboljšanje na podlagi analize
                analysis = self.analyze_crop_health(crop.id)
                
                if analysis and "recommendations" in analysis:
                    # Simuliraj implementacijo priporočil
                    improvement_factor = len(analysis["recommendations"]) * 0.02  # 2% na priporočilo
                    crop.expected_yield_kg *= (1 + improvement_factor)
                    optimization_results["crops_optimized"] += 1
                    optimization_results["yield_improvements"] += improvement_factor * 100
            
            # 2. Optimiziraj živinorejo
            for livestock in self.livestock.values():
                # Optimiziraj hranjenje
                feeding_opt = self.optimize_feeding_schedule(livestock.id)
                
                if feeding_opt and "feed_cost_per_day" in feeding_opt:
                    # Simuliraj zmanjšanje stroškov
                    cost_reduction = feeding_opt["feed_cost_per_day"] * 0.1  # 10% prihranek
                    optimization_results["livestock_optimized"] += 1
                    optimization_results["cost_reductions"] += cost_reduction * 365  # Letno
            
            # 3. Izračunaj trajnostnost
            sustainability_factors = []
            
            # Organska gnojila
            organic_fertilizer_crops = sum(1 for crop in self.crops.values() 
                                         if any("organski" in f or "kompost" in f 
                                               for f in crop.fertilizer_schedule))
            sustainability_factors.append(organic_fertilizer_crops / max(len(self.crops), 1))
            
            # Biološka zaščita
            bio_protection_crops = sum(1 for crop in self.crops.values() 
                                     if any("biološki" in p for p in crop.pest_control))
            sustainability_factors.append(bio_protection_crops / max(len(self.crops), 1))
            
            # Zdravje živali
            healthy_livestock = sum(1 for livestock in self.livestock.values() 
                                  if livestock.health_status == HealthStatus.HEALTHY)
            sustainability_factors.append(healthy_livestock / max(len(self.livestock), 1))
            
            if sustainability_factors:
                optimization_results["sustainability_score"] = statistics.mean(sustainability_factors)
            
            # 4. Izračunaj učinkovitost
            total_entities = len(self.crops) + len(self.livestock)
            if total_entities > 0:
                efficiency = (optimization_results["crops_optimized"] + 
                            optimization_results["livestock_optimized"]) / total_entities
            else:
                efficiency = 0.0
            
            logger.info(f"🌱 Kmetijska optimizacija: {optimization_results['crops_optimized']} pridelkov, {optimization_results['livestock_optimized']} živali optimizirano")
            
            return {
                "success": True,
                "message": f"Kmetijska optimizacija dokončana",
                "efficiency": efficiency,
                "cost_savings": optimization_results["cost_reductions"],
                "energy_reduction": optimization_results["sustainability_score"] * 0.1,  # 10% na trajnostno oceno
                "yield_improvement": optimization_results["yield_improvements"],
                "crops_optimized": optimization_results["crops_optimized"],
                "livestock_optimized": optimization_results["livestock_optimized"],
                "sustainability_score": optimization_results["sustainability_score"]
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri avtomatski kmetijski optimizaciji: {e}")
            return {
                "success": False,
                "message": f"Napaka pri kmetijski optimizaciji: {str(e)}",
                "efficiency": 0.0,
                "cost_savings": 0.0,
                "energy_reduction": 0.0
            }
    
    def get_farm_summary(self) -> Dict[str, Any]:
        """Pridobi povzetek kmetije"""
        try:
            # Osnovne statistike
            total_crops = len(self.crops)
            total_livestock = len(self.livestock)
            
            # Površina
            total_area = sum(crop.area_hectares for crop in self.crops.values())
            
            # Zdravje
            healthy_crops = sum(1 for crop in self.crops.values() 
                              if crop.health_status == HealthStatus.HEALTHY)
            healthy_livestock = sum(1 for livestock in self.livestock.values() 
                                  if livestock.health_status == HealthStatus.HEALTHY)
            
            # Donosnost
            profitability = self.calculate_farm_profitability()
            
            return {
                "farm_overview": {
                    "total_crops": total_crops,
                    "total_livestock": total_livestock,
                    "total_area_hectares": round(total_area, 2),
                    "crop_health_rate": round(healthy_crops / max(total_crops, 1), 2),
                    "livestock_health_rate": round(healthy_livestock / max(total_livestock, 1), 2)
                },
                "financial_summary": {
                    "expected_revenue": round(profitability.get("total_revenue", 0), 2),
                    "estimated_costs": round(profitability.get("total_costs", 0), 2),
                    "projected_profit": round(profitability.get("net_profit", 0), 2),
                    "profit_margin": round(profitability.get("profit_margin", 0), 2)
                },
                "production_summary": {
                    "crop_types": list(set(crop.crop_type.value for crop in self.crops.values())),
                    "livestock_types": list(set(livestock.livestock_type.value for livestock in self.livestock.values())),
                    "total_expected_yield": sum(crop.expected_yield_kg for crop in self.crops.values())
                },
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju povzetka kmetije: {e}")
            return {}

# Globalna instanca
agriculture_support = AgricultureSupport()

# Funkcije za kompatibilnost
def auto_optimize():
    return agriculture_support.auto_optimize()

def add_crop(name: str, crop_type: str, variety: str, area_hectares: float, 
            planting_date: str, expected_yield_kg: float):
    planting_dt = datetime.fromisoformat(planting_date)
    return agriculture_support.add_crop(name, crop_type, variety, area_hectares, planting_dt, expected_yield_kg)

def add_livestock(name: str, livestock_type: str, breed: str, birth_date: str, gender: str, weight_kg: float):
    birth_dt = datetime.fromisoformat(birth_date)
    return agriculture_support.add_livestock(name, livestock_type, breed, birth_dt, gender, weight_kg)

def get_seasonal_recommendations(season: str = None):
    season_enum = Season(season) if season else None
    return agriculture_support.get_seasonal_recommendations(season_enum)

def analyze_crop_health(crop_id: str):
    return agriculture_support.analyze_crop_health(crop_id)

def optimize_feeding_schedule(livestock_id: str):
    return agriculture_support.optimize_feeding_schedule(livestock_id)

def calculate_farm_profitability():
    return agriculture_support.calculate_farm_profitability()

def get_farm_summary():
    return agriculture_support.get_farm_summary()

if __name__ == "__main__":
    # Test kmetijskega pomočnika
    print("🌱 Testiranje kmetijskega pomočnika...")
    
    # Dodaj testni pridelek
    crop_id = add_crop("Korenje", "vegetables", "Nantska", 0.2, 
                      datetime.now().isoformat(), 800.0)
    print(f"Dodan pridelek: {crop_id}")
    
    # Dodaj testno žival
    livestock_id = add_livestock("Testna krava", "cattle", "Simmental", 
                                (datetime.now() - timedelta(days=1000)).isoformat(), 
                                "female", 550.0)
    print(f"Dodana žival: {livestock_id}")
    
    # Pridobi sezonska priporočila
    recommendations = get_seasonal_recommendations()
    print(f"Sezonska priporočila: {len(recommendations.get('crop_activities', []))} aktivnosti")
    
    # Izvedi optimizacijo
    result = auto_optimize()
    print(f"Rezultat optimizacije: {result}")
    
    # Pridobi povzetek
    summary = get_farm_summary()
    print(f"Povzetek kmetije: {summary}")