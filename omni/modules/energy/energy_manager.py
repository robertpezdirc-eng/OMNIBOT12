#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
⚡ Omni Energy Manager
=====================

Energetski upravljalec za:
- Optimizacija porabe energije
- Upravljanje obnovljivih virov
- Pametna distribucija energije
- Spremljanje stroškov
- Napovedovanje porabe
- Integracija s pametnimi napravami

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
import math

# Konfiguracija
ENERGY_DB = "omni/data/energy.db"
ENERGY_LOG = "omni/logs/energy.log"
DEVICES_FILE = "omni/data/energy_devices.json"
CONSUMPTION_FILE = "omni/data/energy_consumption.json"

# Logging
os.makedirs(os.path.dirname(ENERGY_LOG), exist_ok=True)
logger = logging.getLogger(__name__)

def __name__():
    return "energy_manager"

class EnergySource(Enum):
    GRID = "grid"
    SOLAR = "solar"
    WIND = "wind"
    HYDRO = "hydro"
    BATTERY = "battery"
    GENERATOR = "generator"

class DeviceType(Enum):
    HEATING = "heating"
    COOLING = "cooling"
    LIGHTING = "lighting"
    APPLIANCES = "appliances"
    INDUSTRIAL = "industrial"
    ELECTRIC_VEHICLE = "electric_vehicle"

class Priority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class EnergyMode(Enum):
    NORMAL = "normal"
    ECO = "eco"
    PEAK_SHAVING = "peak_shaving"
    EMERGENCY = "emergency"

@dataclass
class EnergyDevice:
    id: str
    name: str
    device_type: DeviceType
    power_rating_w: float
    current_consumption_w: float
    priority: Priority
    is_controllable: bool
    location: str
    schedule: List[Dict[str, str]]
    efficiency_rating: float  # 0.0 - 1.0
    last_maintenance: datetime
    status: str  # on, off, standby, error

@dataclass
class EnergySource:
    id: str
    name: str
    source_type: EnergySource
    capacity_kw: float
    current_output_kw: float
    efficiency: float
    cost_per_kwh: float
    availability: float  # 0.0 - 1.0
    location: str
    installation_date: datetime
    maintenance_schedule: List[str]

@dataclass
class EnergyConsumption:
    timestamp: datetime
    device_id: str
    consumption_kwh: float
    cost: float
    source: EnergySource
    efficiency: float

@dataclass
class EnergyForecast:
    timestamp: datetime
    predicted_consumption_kwh: float
    predicted_generation_kwh: float
    confidence: float
    weather_factor: float
    seasonal_factor: float

@dataclass
class OptimizationRule:
    id: str
    name: str
    condition: str
    action: str
    priority: int
    is_active: bool
    created_date: datetime

class EnergyManager:
    """⚡ Energetski upravljalec Omni"""
    
    def __init__(self):
        self.devices = {}
        self.energy_sources = {}
        self.consumption_history = []
        self.forecasts = []
        self.optimization_rules = []
        self.current_mode = EnergyMode.NORMAL
        self._init_database()
        self._load_sample_data()
        logger.info("⚡ Energetski upravljalec inicializiran")
    
    def _init_database(self):
        """Inicializacija energetske baze"""
        try:
            os.makedirs(os.path.dirname(ENERGY_DB), exist_ok=True)
            conn = sqlite3.connect(ENERGY_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS energy_devices (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    device_type TEXT NOT NULL,
                    power_rating_w REAL NOT NULL,
                    current_consumption_w REAL NOT NULL,
                    priority TEXT NOT NULL,
                    is_controllable BOOLEAN NOT NULL,
                    location TEXT NOT NULL,
                    schedule TEXT NOT NULL,
                    efficiency_rating REAL NOT NULL,
                    last_maintenance TEXT NOT NULL,
                    status TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS energy_sources (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    capacity_kw REAL NOT NULL,
                    current_output_kw REAL NOT NULL,
                    efficiency REAL NOT NULL,
                    cost_per_kwh REAL NOT NULL,
                    availability REAL NOT NULL,
                    location TEXT NOT NULL,
                    installation_date TEXT NOT NULL,
                    maintenance_schedule TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS energy_consumption (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    device_id TEXT NOT NULL,
                    consumption_kwh REAL NOT NULL,
                    cost REAL NOT NULL,
                    source TEXT NOT NULL,
                    efficiency REAL NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS energy_forecasts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    predicted_consumption_kwh REAL NOT NULL,
                    predicted_generation_kwh REAL NOT NULL,
                    confidence REAL NOT NULL,
                    weather_factor REAL NOT NULL,
                    seasonal_factor REAL NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS optimization_rules (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    condition TEXT NOT NULL,
                    action TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    is_active BOOLEAN NOT NULL,
                    created_date TEXT NOT NULL
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji energetske baze: {e}")
    
    def _load_sample_data(self):
        """Naloži vzorčne podatke"""
        try:
            # Ustvari vzorčne naprave
            sample_devices = [
                {
                    "id": "DEV_HEATING_001",
                    "name": "Toplotna črpalka",
                    "device_type": DeviceType.HEATING,
                    "power_rating_w": 3500.0,
                    "current_consumption_w": 2100.0,
                    "priority": Priority.HIGH,
                    "is_controllable": True,
                    "location": "Klet",
                    "schedule": [
                        {"time": "06:00", "action": "on", "temperature": "21"},
                        {"time": "22:00", "action": "off", "temperature": "18"}
                    ],
                    "efficiency_rating": 0.85,
                    "last_maintenance": datetime.now() - timedelta(days=90),
                    "status": "on"
                },
                {
                    "id": "DEV_LIGHTING_001",
                    "name": "LED osvetlitev",
                    "device_type": DeviceType.LIGHTING,
                    "power_rating_w": 800.0,
                    "current_consumption_w": 320.0,
                    "priority": Priority.MEDIUM,
                    "is_controllable": True,
                    "location": "Hiša",
                    "schedule": [
                        {"time": "sunset", "action": "on", "brightness": "80"},
                        {"time": "23:00", "action": "off", "brightness": "0"}
                    ],
                    "efficiency_rating": 0.95,
                    "last_maintenance": datetime.now() - timedelta(days=30),
                    "status": "on"
                },
                {
                    "id": "DEV_APPLIANCE_001",
                    "name": "Pralni stroj",
                    "device_type": DeviceType.APPLIANCES,
                    "power_rating_w": 2200.0,
                    "current_consumption_w": 0.0,
                    "priority": Priority.LOW,
                    "is_controllable": True,
                    "location": "Kopalnica",
                    "schedule": [
                        {"time": "14:00", "action": "auto", "program": "eco"}
                    ],
                    "efficiency_rating": 0.78,
                    "last_maintenance": datetime.now() - timedelta(days=180),
                    "status": "standby"
                }
            ]
            
            for device_data in sample_devices:
                device = EnergyDevice(**device_data)
                self.devices[device.id] = device
            
            # Ustvari vzorčne energetske vire
            sample_sources = [
                {
                    "id": "SRC_SOLAR_001",
                    "name": "Sončna elektrarna",
                    "source_type": EnergySource.SOLAR,
                    "capacity_kw": 10.0,
                    "current_output_kw": 6.5,
                    "efficiency": 0.22,
                    "cost_per_kwh": 0.0,  # Brezplačna sončna energija
                    "availability": 0.8,  # Odvisno od vremena
                    "location": "Streha",
                    "installation_date": datetime.now() - timedelta(days=365),
                    "maintenance_schedule": ["Letni pregled", "Čiščenje panelov"]
                },
                {
                    "id": "SRC_GRID_001",
                    "name": "Električno omrežje",
                    "source_type": EnergySource.GRID,
                    "capacity_kw": 50.0,
                    "current_output_kw": 8.2,
                    "efficiency": 0.95,
                    "cost_per_kwh": 0.12,
                    "availability": 0.99,
                    "location": "Priključek",
                    "installation_date": datetime.now() - timedelta(days=3650),
                    "maintenance_schedule": ["Redni pregledi"]
                },
                {
                    "id": "SRC_BATTERY_001",
                    "name": "Baterijski sistem",
                    "source_type": EnergySource.BATTERY,
                    "capacity_kw": 15.0,
                    "current_output_kw": 0.0,
                    "efficiency": 0.90,
                    "cost_per_kwh": 0.05,  # Stroški vzdrževanja
                    "availability": 0.95,
                    "location": "Klet",
                    "installation_date": datetime.now() - timedelta(days=180),
                    "maintenance_schedule": ["Mesečna kontrola", "Letna kalibracija"]
                }
            ]
            
            for source_data in sample_sources:
                source = EnergySource(**source_data)
                self.energy_sources[source.id] = source
            
            # Generiraj vzorčno porabo
            for i in range(168):  # Zadnji teden (ure)
                timestamp = datetime.now() - timedelta(hours=i)
                
                # Simuliraj dnevni cikel porabe
                hour = timestamp.hour
                base_consumption = 2.0  # Osnovna poraba
                
                if 6 <= hour <= 22:  # Dnevna poraba
                    consumption_factor = 1.5 + 0.5 * math.sin((hour - 6) * math.pi / 16)
                else:  # Nočna poraba
                    consumption_factor = 0.8
                
                consumption = EnergyConsumption(
                    timestamp=timestamp,
                    device_id="TOTAL",
                    consumption_kwh=base_consumption * consumption_factor,
                    cost=base_consumption * consumption_factor * 0.12,
                    source=EnergySource.GRID,
                    efficiency=0.95
                )
                self.consumption_history.append(consumption)
            
            # Ustvari optimizacijska pravila
            sample_rules = [
                {
                    "id": "RULE_PEAK_SHAVING",
                    "name": "Zmanjšanje koničnih obremenitev",
                    "condition": "grid_consumption > 15kW",
                    "action": "switch_to_battery",
                    "priority": 1,
                    "is_active": True,
                    "created_date": datetime.now()
                },
                {
                    "id": "RULE_SOLAR_PRIORITY",
                    "name": "Prednost sončni energiji",
                    "condition": "solar_available > 5kW",
                    "action": "use_solar_first",
                    "priority": 2,
                    "is_active": True,
                    "created_date": datetime.now()
                },
                {
                    "id": "RULE_ECO_MODE",
                    "name": "Ekonomski način",
                    "condition": "time_between(22:00, 06:00)",
                    "action": "reduce_non_critical_devices",
                    "priority": 3,
                    "is_active": True,
                    "created_date": datetime.now()
                }
            ]
            
            for rule_data in sample_rules:
                rule = OptimizationRule(**rule_data)
                self.optimization_rules.append(rule)
            
        except Exception as e:
            logger.error(f"❌ Napaka pri nalaganju vzorčnih podatkov: {e}")
    
    def add_device(self, name: str, device_type: str, power_rating_w: float,
                  location: str, is_controllable: bool = True) -> str:
        """Dodaj novo energetsko napravo"""
        try:
            device_id = f"DEV_{device_type.upper()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            device = EnergyDevice(
                id=device_id,
                name=name,
                device_type=DeviceType(device_type),
                power_rating_w=power_rating_w,
                current_consumption_w=0.0,
                priority=Priority.MEDIUM,
                is_controllable=is_controllable,
                location=location,
                schedule=[],
                efficiency_rating=0.85,  # Privzeta učinkovitost
                last_maintenance=datetime.now(),
                status="off"
            )
            
            self.devices[device_id] = device
            
            # Shrani v bazo
            self._save_device_to_db(device)
            
            logger.info(f"⚡ Dodana naprava: {name} ({device_id})")
            return device_id
            
        except Exception as e:
            logger.error(f"❌ Napaka pri dodajanju naprave: {e}")
            return ""
    
    def add_energy_source(self, name: str, source_type: str, capacity_kw: float,
                         cost_per_kwh: float, location: str) -> str:
        """Dodaj nov energetski vir"""
        try:
            source_id = f"SRC_{source_type.upper()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            source = EnergySource(
                id=source_id,
                name=name,
                source_type=EnergySource(source_type),
                capacity_kw=capacity_kw,
                current_output_kw=0.0,
                efficiency=0.90,  # Privzeta učinkovitost
                cost_per_kwh=cost_per_kwh,
                availability=0.95,
                location=location,
                installation_date=datetime.now(),
                maintenance_schedule=["Redni pregledi"]
            )
            
            self.energy_sources[source_id] = source
            
            # Shrani v bazo
            self._save_source_to_db(source)
            
            logger.info(f"⚡ Dodan energetski vir: {name} ({source_id})")
            return source_id
            
        except Exception as e:
            logger.error(f"❌ Napaka pri dodajanju energetskega vira: {e}")
            return ""
    
    def _save_device_to_db(self, device: EnergyDevice):
        """Shrani napravo v bazo"""
        try:
            conn = sqlite3.connect(ENERGY_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO energy_devices 
                (id, name, device_type, power_rating_w, current_consumption_w,
                 priority, is_controllable, location, schedule, efficiency_rating,
                 last_maintenance, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                device.id, device.name, device.device_type.value, device.power_rating_w,
                device.current_consumption_w, device.priority.value, device.is_controllable,
                device.location, json.dumps(device.schedule), device.efficiency_rating,
                device.last_maintenance.isoformat(), device.status
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju naprave: {e}")
    
    def _save_source_to_db(self, source: EnergySource):
        """Shrani energetski vir v bazo"""
        try:
            conn = sqlite3.connect(ENERGY_DB)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO energy_sources 
                (id, name, source_type, capacity_kw, current_output_kw,
                 efficiency, cost_per_kwh, availability, location,
                 installation_date, maintenance_schedule)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                source.id, source.name, source.source_type.value, source.capacity_kw,
                source.current_output_kw, source.efficiency, source.cost_per_kwh,
                source.availability, source.location, source.installation_date.isoformat(),
                json.dumps(source.maintenance_schedule)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju energetskega vira: {e}")
    
    def optimize_energy_distribution(self) -> Dict[str, Any]:
        """Optimiziraj distribucijo energije"""
        try:
            optimization = {
                "timestamp": datetime.now().isoformat(),
                "current_demand_kw": 0.0,
                "available_supply_kw": 0.0,
                "optimal_distribution": {},
                "cost_savings": 0.0,
                "efficiency_improvement": 0.0,
                "recommendations": []
            }
            
            # Izračunaj trenutno povpraševanje
            total_demand = sum(device.current_consumption_w / 1000 
                             for device in self.devices.values() 
                             if device.status == "on")
            optimization["current_demand_kw"] = total_demand
            
            # Izračunaj razpoložljivo oskrbo
            available_sources = []
            for source in self.energy_sources.values():
                if source.availability > 0.5:  # Vir je na voljo
                    available_sources.append({
                        "id": source.id,
                        "capacity": source.capacity_kw,
                        "cost": source.cost_per_kwh,
                        "efficiency": source.efficiency,
                        "type": source.source_type.value
                    })
            
            # Razvrsti vire po stroških (najcenejši najprej)
            available_sources.sort(key=lambda x: x["cost"])
            
            # Optimalna distribucija
            remaining_demand = total_demand
            total_cost = 0.0
            
            for source in available_sources:
                if remaining_demand <= 0:
                    break
                
                # Koliko lahko ta vir prispeva
                contribution = min(remaining_demand, source["capacity"])
                
                optimization["optimal_distribution"][source["id"]] = {
                    "allocation_kw": contribution,
                    "cost_per_hour": contribution * source["cost"],
                    "efficiency": source["efficiency"]
                }
                
                total_cost += contribution * source["cost"]
                remaining_demand -= contribution
            
            optimization["available_supply_kw"] = sum(s["capacity"] for s in available_sources)
            
            # Izračunaj prihranke
            # Primerjaj z uporabo samo omrežja
            grid_only_cost = total_demand * 0.12  # Povprečna cena omrežja
            optimization["cost_savings"] = max(0, grid_only_cost - total_cost)
            
            # Priporočila za optimizacijo
            if remaining_demand > 0:
                optimization["recommendations"].append(
                    f"Povpraševanje presega oskrbo za {remaining_demand:.2f} kW"
                )
            
            # Preveri sončno energijo
            solar_sources = [s for s in available_sources if s["type"] == "solar"]
            if solar_sources and datetime.now().hour in range(10, 16):
                optimization["recommendations"].append(
                    "Optimalen čas za uporabo sončne energije"
                )
            
            # Preveri baterije
            battery_sources = [s for s in available_sources if s["type"] == "battery"]
            if battery_sources and total_demand > 10:
                optimization["recommendations"].append(
                    "Razmisli o uporabi baterij za zmanjšanje koničnih obremenitev"
                )
            
            # Izračunaj izboljšanje učinkovitosti
            weighted_efficiency = sum(
                dist["allocation_kw"] * dist["efficiency"] 
                for dist in optimization["optimal_distribution"].values()
            ) / max(total_demand, 0.1)
            
            optimization["efficiency_improvement"] = max(0, weighted_efficiency - 0.85)
            
            return optimization
            
        except Exception as e:
            logger.error(f"❌ Napaka pri optimizaciji distribucije energije: {e}")
            return {"error": str(e)}
    
    def predict_consumption(self, hours_ahead: int = 24) -> List[EnergyForecast]:
        """Napovej porabo energije"""
        try:
            forecasts = []
            
            # Analiziraj zgodovinske podatke
            if not self.consumption_history:
                return forecasts
            
            # Izračunaj povprečno porabo po urah
            hourly_patterns = {}
            for consumption in self.consumption_history[-168:]:  # Zadnji teden
                hour = consumption.timestamp.hour
                if hour not in hourly_patterns:
                    hourly_patterns[hour] = []
                hourly_patterns[hour].append(consumption.consumption_kwh)
            
            # Izračunaj povprečja
            hourly_averages = {}
            for hour, consumptions in hourly_patterns.items():
                hourly_averages[hour] = statistics.mean(consumptions)
            
            # Generiraj napovedi
            for i in range(hours_ahead):
                future_time = datetime.now() + timedelta(hours=i)
                hour = future_time.hour
                
                # Osnovna napoved na podlagi vzorcev
                base_consumption = hourly_averages.get(hour, 3.0)
                
                # Sezonski faktor
                month = future_time.month
                if month in [12, 1, 2]:  # Zima
                    seasonal_factor = 1.3
                elif month in [6, 7, 8]:  # Poletje
                    seasonal_factor = 1.1
                else:
                    seasonal_factor = 1.0
                
                # Vremenski faktor (simuliran)
                weather_factor = random.uniform(0.9, 1.1)
                
                # Končna napoved
                predicted_consumption = base_consumption * seasonal_factor * weather_factor
                
                # Napoved proizvodnje (predvsem sončna)
                if 8 <= hour <= 18:  # Dnevne ure
                    predicted_generation = random.uniform(3.0, 8.0) * weather_factor
                else:
                    predicted_generation = 0.0
                
                # Zaupanje napovedi
                confidence = max(0.5, 1.0 - (i * 0.02))  # Zmanjšuje se z razdaljo
                
                forecast = EnergyForecast(
                    timestamp=future_time,
                    predicted_consumption_kwh=predicted_consumption,
                    predicted_generation_kwh=predicted_generation,
                    confidence=confidence,
                    weather_factor=weather_factor,
                    seasonal_factor=seasonal_factor
                )
                
                forecasts.append(forecast)
            
            # Shrani napovedi
            self.forecasts = forecasts
            
            return forecasts
            
        except Exception as e:
            logger.error(f"❌ Napaka pri napovedovanju porabe: {e}")
            return []
    
    def implement_peak_shaving(self, peak_threshold_kw: float = 15.0) -> Dict[str, Any]:
        """Implementiraj zmanjšanje koničnih obremenitev"""
        try:
            current_consumption = sum(device.current_consumption_w / 1000 
                                    for device in self.devices.values() 
                                    if device.status == "on")
            
            result = {
                "timestamp": datetime.now().isoformat(),
                "current_consumption_kw": current_consumption,
                "peak_threshold_kw": peak_threshold_kw,
                "peak_detected": current_consumption > peak_threshold_kw,
                "actions_taken": [],
                "estimated_reduction_kw": 0.0,
                "cost_savings": 0.0
            }
            
            if current_consumption > peak_threshold_kw:
                excess_consumption = current_consumption - peak_threshold_kw
                
                # 1. Preklopi na baterije, če so na voljo
                battery_sources = [s for s in self.energy_sources.values() 
                                 if s.source_type == EnergySource.BATTERY and s.availability > 0.8]
                
                if battery_sources:
                    battery_capacity = sum(s.capacity_kw for s in battery_sources)
                    battery_usage = min(excess_consumption, battery_capacity)
                    
                    result["actions_taken"].append(f"Preklopil na baterije: {battery_usage:.2f} kW")
                    result["estimated_reduction_kw"] += battery_usage
                    excess_consumption -= battery_usage
                
                # 2. Zmanjšaj porabo nekritičnih naprav
                if excess_consumption > 0:
                    controllable_devices = [d for d in self.devices.values() 
                                          if d.is_controllable and d.priority in [Priority.LOW, Priority.MEDIUM]
                                          and d.status == "on"]
                    
                    # Razvrsti po prioriteti (najnižja najprej)
                    controllable_devices.sort(key=lambda x: x.priority.value, reverse=True)
                    
                    for device in controllable_devices:
                        if excess_consumption <= 0:
                            break
                        
                        device_reduction = min(device.current_consumption_w / 1000, excess_consumption)
                        
                        # Simuliraj zmanjšanje porabe
                        device.current_consumption_w *= 0.7  # 30% zmanjšanje
                        
                        result["actions_taken"].append(
                            f"Zmanjšal porabo {device.name}: {device_reduction:.2f} kW"
                        )
                        result["estimated_reduction_kw"] += device_reduction
                        excess_consumption -= device_reduction
                
                # 3. Izračunaj prihranke
                # Konica stane več (simulacija)
                peak_cost_multiplier = 2.0
                normal_cost = 0.12  # EUR/kWh
                peak_cost = normal_cost * peak_cost_multiplier
                
                result["cost_savings"] = result["estimated_reduction_kw"] * (peak_cost - normal_cost)
            
            else:
                result["actions_taken"].append("Konica ni zaznana - ni potrebnih ukrepov")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Napaka pri zmanjševanju koničnih obremenitev: {e}")
            return {"error": str(e)}
    
    def calculate_energy_efficiency(self) -> Dict[str, Any]:
        """Izračunaj energetsko učinkovitost"""
        try:
            efficiency_analysis = {
                "timestamp": datetime.now().isoformat(),
                "overall_efficiency": 0.0,
                "device_efficiencies": {},
                "source_efficiencies": {},
                "improvement_opportunities": [],
                "potential_savings": 0.0
            }
            
            # Analiza učinkovitosti naprav
            total_devices = len(self.devices)
            total_device_efficiency = 0.0
            
            for device in self.devices.values():
                efficiency_analysis["device_efficiencies"][device.id] = {
                    "name": device.name,
                    "efficiency": device.efficiency_rating,
                    "power_rating": device.power_rating_w,
                    "current_consumption": device.current_consumption_w,
                    "utilization": device.current_consumption_w / max(device.power_rating_w, 1),
                    "last_maintenance_days": (datetime.now() - device.last_maintenance).days
                }
                
                total_device_efficiency += device.efficiency_rating
                
                # Priporočila za izboljšave
                if device.efficiency_rating < 0.8:
                    efficiency_analysis["improvement_opportunities"].append(
                        f"{device.name}: Nizka učinkovitost ({device.efficiency_rating:.2f})"
                    )
                
                if (datetime.now() - device.last_maintenance).days > 365:
                    efficiency_analysis["improvement_opportunities"].append(
                        f"{device.name}: Potrebno vzdrževanje"
                    )
            
            # Analiza učinkovitosti virov
            total_sources = len(self.energy_sources)
            total_source_efficiency = 0.0
            
            for source in self.energy_sources.values():
                efficiency_analysis["source_efficiencies"][source.id] = {
                    "name": source.name,
                    "efficiency": source.efficiency,
                    "capacity_utilization": source.current_output_kw / max(source.capacity_kw, 1),
                    "availability": source.availability,
                    "cost_per_kwh": source.cost_per_kwh
                }
                
                total_source_efficiency += source.efficiency
                
                # Priporočila za vire
                if source.efficiency < 0.85:
                    efficiency_analysis["improvement_opportunities"].append(
                        f"{source.name}: Nizka učinkovitost vira ({source.efficiency:.2f})"
                    )
            
            # Skupna učinkovitost
            if total_devices > 0 and total_sources > 0:
                device_avg = total_device_efficiency / total_devices
                source_avg = total_source_efficiency / total_sources
                efficiency_analysis["overall_efficiency"] = (device_avg + source_avg) / 2
            
            # Izračunaj potencialne prihranke
            current_consumption = sum(device.current_consumption_w / 1000 
                                    for device in self.devices.values())
            
            # Simuliraj izboljšanje učinkovitosti za 10%
            improved_efficiency = efficiency_analysis["overall_efficiency"] * 1.1
            potential_reduction = current_consumption * (1 - efficiency_analysis["overall_efficiency"] / improved_efficiency)
            efficiency_analysis["potential_savings"] = potential_reduction * 0.12 * 24 * 365  # Letni prihranki
            
            return efficiency_analysis
            
        except Exception as e:
            logger.error(f"❌ Napaka pri izračunu energetske učinkovitosti: {e}")
            return {"error": str(e)}
    
    def auto_optimize(self) -> Dict[str, Any]:
        """Avtomatska energetska optimizacija"""
        try:
            optimization_results = {
                "timestamp": datetime.now().isoformat(),
                "devices_optimized": 0,
                "sources_optimized": 0,
                "energy_savings_kwh": 0.0,
                "cost_savings_eur": 0.0,
                "efficiency_improvement": 0.0
            }
            
            # 1. Optimiziraj distribucijo energije
            distribution = self.optimize_energy_distribution()
            if "cost_savings" in distribution:
                optimization_results["cost_savings_eur"] += distribution["cost_savings"]
            
            # 2. Implementiraj zmanjšanje koničnih obremenitev
            peak_shaving = self.implement_peak_shaving()
            if "cost_savings" in peak_shaving:
                optimization_results["cost_savings_eur"] += peak_shaving["cost_savings"]
                optimization_results["energy_savings_kwh"] += peak_shaving.get("estimated_reduction_kw", 0)
            
            # 3. Optimiziraj naprave
            for device in self.devices.values():
                if device.is_controllable:
                    # Simuliraj optimizacijo naprave
                    old_consumption = device.current_consumption_w
                    
                    # Optimiziraj na podlagi urnika in prioritete
                    current_hour = datetime.now().hour
                    
                    # Nočni način (22:00 - 06:00)
                    if 22 <= current_hour or current_hour <= 6:
                        if device.priority in [Priority.LOW, Priority.MEDIUM]:
                            device.current_consumption_w *= 0.7  # 30% zmanjšanje
                    
                    # Dnevni način - optimiziraj glede na sončno energijo
                    elif 10 <= current_hour <= 16:
                        # Če imamo sončno energijo, lahko povečamo porabo
                        solar_available = sum(s.current_output_kw for s in self.energy_sources.values() 
                                            if s.source_type == EnergySource.SOLAR)
                        if solar_available > 5:
                            device.current_consumption_w = min(device.power_rating_w, 
                                                             device.current_consumption_w * 1.1)
                    
                    # Izračunaj prihranke
                    consumption_change = old_consumption - device.current_consumption_w
                    if consumption_change > 0:
                        optimization_results["devices_optimized"] += 1
                        optimization_results["energy_savings_kwh"] += consumption_change / 1000
            
            # 4. Optimiziraj energetske vire
            for source in self.energy_sources.values():
                # Simuliraj optimizacijo vira
                if source.source_type == EnergySource.SOLAR:
                    # Optimiziraj sončne panele glede na vreme
                    if 10 <= datetime.now().hour <= 16:
                        source.current_output_kw = min(source.capacity_kw, 
                                                     source.capacity_kw * 0.8)
                        optimization_results["sources_optimized"] += 1
                
                elif source.source_type == EnergySource.BATTERY:
                    # Optimiziraj baterije - polni čez dan, razpolni zvečer
                    if 10 <= datetime.now().hour <= 16:
                        source.current_output_kw = -source.capacity_kw * 0.3  # Polnjenje
                    elif 18 <= datetime.now().hour <= 22:
                        source.current_output_kw = source.capacity_kw * 0.5  # Razpolnjevanje
                    optimization_results["sources_optimized"] += 1
            
            # 5. Izračunaj skupne prihranke
            optimization_results["cost_savings_eur"] += optimization_results["energy_savings_kwh"] * 0.12
            
            # 6. Izračunaj izboljšanje učinkovitosti
            efficiency_analysis = self.calculate_energy_efficiency()
            optimization_results["efficiency_improvement"] = efficiency_analysis.get("overall_efficiency", 0.0)
            
            logger.info(f"⚡ Energetska optimizacija: {optimization_results['devices_optimized']} naprav, {optimization_results['sources_optimized']} virov optimizirano")
            
            return {
                "success": True,
                "message": f"Energetska optimizacija dokončana",
                "efficiency": optimization_results["efficiency_improvement"],
                "cost_savings": optimization_results["cost_savings_eur"],
                "energy_reduction": optimization_results["energy_savings_kwh"],
                "devices_optimized": optimization_results["devices_optimized"],
                "sources_optimized": optimization_results["sources_optimized"]
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri avtomatski energetski optimizaciji: {e}")
            return {
                "success": False,
                "message": f"Napaka pri energetski optimizaciji: {str(e)}",
                "efficiency": 0.0,
                "cost_savings": 0.0,
                "energy_reduction": 0.0
            }
    
    def get_energy_summary(self) -> Dict[str, Any]:
        """Pridobi povzetek energetskega sistema"""
        try:
            # Osnovne statistike
            total_devices = len(self.devices)
            active_devices = sum(1 for device in self.devices.values() if device.status == "on")
            total_sources = len(self.energy_sources)
            
            # Trenutna poraba in proizvodnja
            current_consumption = sum(device.current_consumption_w / 1000 
                                    for device in self.devices.values() 
                                    if device.status == "on")
            current_generation = sum(source.current_output_kw 
                                   for source in self.energy_sources.values() 
                                   if source.current_output_kw > 0)
            
            # Stroški
            hourly_cost = current_consumption * 0.12  # Povprečna cena
            daily_cost = hourly_cost * 24
            monthly_cost = daily_cost * 30
            
            # Učinkovitost
            efficiency_analysis = self.calculate_energy_efficiency()
            
            return {
                "system_overview": {
                    "total_devices": total_devices,
                    "active_devices": active_devices,
                    "total_energy_sources": total_sources,
                    "current_consumption_kw": round(current_consumption, 2),
                    "current_generation_kw": round(current_generation, 2),
                    "net_consumption_kw": round(current_consumption - current_generation, 2)
                },
                "cost_analysis": {
                    "hourly_cost_eur": round(hourly_cost, 2),
                    "daily_cost_eur": round(daily_cost, 2),
                    "monthly_cost_eur": round(monthly_cost, 2),
                    "annual_cost_eur": round(monthly_cost * 12, 2)
                },
                "efficiency_metrics": {
                    "overall_efficiency": round(efficiency_analysis.get("overall_efficiency", 0.0), 2),
                    "potential_annual_savings": round(efficiency_analysis.get("potential_savings", 0.0), 2),
                    "improvement_opportunities": len(efficiency_analysis.get("improvement_opportunities", []))
                },
                "renewable_energy": {
                    "solar_capacity_kw": sum(s.capacity_kw for s in self.energy_sources.values() 
                                           if s.source_type == EnergySource.SOLAR),
                    "battery_capacity_kw": sum(s.capacity_kw for s in self.energy_sources.values() 
                                             if s.source_type == EnergySource.BATTERY),
                    "renewable_percentage": round((current_generation / max(current_consumption, 0.1)) * 100, 1)
                },
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju povzetka energetskega sistema: {e}")
            return {}

# Globalna instanca
energy_manager = EnergyManager()

# Funkcije za kompatibilnost
def auto_optimize():
    return energy_manager.auto_optimize()

def add_device(name: str, device_type: str, power_rating_w: float, location: str, is_controllable: bool = True):
    return energy_manager.add_device(name, device_type, power_rating_w, location, is_controllable)

def add_energy_source(name: str, source_type: str, capacity_kw: float, cost_per_kwh: float, location: str):
    return energy_manager.add_energy_source(name, source_type, capacity_kw, cost_per_kwh, location)

def optimize_energy_distribution():
    return energy_manager.optimize_energy_distribution()

def predict_consumption(hours_ahead: int = 24):
    return energy_manager.predict_consumption(hours_ahead)

def implement_peak_shaving(peak_threshold_kw: float = 15.0):
    return energy_manager.implement_peak_shaving(peak_threshold_kw)

def calculate_energy_efficiency():
    return energy_manager.calculate_energy_efficiency()

def get_energy_summary():
    return energy_manager.get_energy_summary()

if __name__ == "__main__":
    # Test energetskega upravljalca
    print("⚡ Testiranje energetskega upravljalca...")
    
    # Dodaj testno napravo
    device_id = add_device("Testna naprava", "heating", 2000.0, "Testna lokacija")
    print(f"Dodana naprava: {device_id}")
    
    # Dodaj testni energetski vir
    source_id = add_energy_source("Testni vir", "solar", 5.0, 0.0, "Testna lokacija")
    print(f"Dodan energetski vir: {source_id}")
    
    # Optimiziraj distribucijo
    distribution = optimize_energy_distribution()
    print(f"Optimizacija distribucije: {len(distribution.get('optimal_distribution', {}))} virov")
    
    # Napovej porabo
    forecasts = predict_consumption(12)
    print(f"Napovedi porabe: {len(forecasts)} ur")
    
    # Izvedi optimizacijo
    result = auto_optimize()
    print(f"Rezultat optimizacije: {result}")
    
    # Pridobi povzetek
    summary = get_energy_summary()
    print(f"Povzetek energetskega sistema: {summary}")