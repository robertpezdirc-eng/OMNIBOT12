#!/usr/bin/env python3
"""
Omni Module Connectors - Sistem povezovalnikov za AI module
Omogoča komunikacijo med Omni Brain in vsemi AI moduli
"""

import asyncio
import json
import logging
import sqlite3
import requests
import websockets
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod
import threading
import time

logger = logging.getLogger('OmniConnectors')

@dataclass
class ModuleCapability:
    name: str
    description: str
    parameters: Dict[str, Any]
    response_format: Dict[str, Any]

class BaseModuleConnector(ABC):
    """Bazni razred za vse module connectorje"""
    
    def __init__(self, module_name: str, endpoint: str, port: int):
        self.module_name = module_name
        self.endpoint = endpoint
        self.port = port
        self.is_connected = False
        self.capabilities: List[ModuleCapability] = []
        self.last_heartbeat = datetime.now()
        
    @abstractmethod
    async def initialize(self):
        """Inicializacija modula"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Preverjanje zdravja modula"""
        pass
    
    @abstractmethod
    async def execute_action(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Izvršitev akcije na modulu"""
        pass

class FinanceModuleConnector(BaseModuleConnector):
    """Connector za Finance modul"""
    
    def __init__(self):
        super().__init__("Finance", "http://localhost:3001", 3001)
        self.capabilities = [
            ModuleCapability(
                name="get_transactions",
                description="Pridobi finančne transakcije",
                parameters={"date_from": "string", "date_to": "string", "category": "string"},
                response_format={"transactions": "array", "total": "number"}
            ),
            ModuleCapability(
                name="create_budget",
                description="Ustvari proračun",
                parameters={"name": "string", "amount": "number", "category": "string"},
                response_format={"budget_id": "string", "status": "string"}
            ),
            ModuleCapability(
                name="analyze_spending",
                description="Analiziraj porabo",
                parameters={"period": "string"},
                response_format={"analysis": "object", "recommendations": "array"}
            ),
            ModuleCapability(
                name="investment_advice",
                description="Nasveti za investiranje",
                parameters={"amount": "number", "risk_level": "string"},
                response_format={"recommendations": "array", "expected_return": "number"}
            )
        ]
    
    async def initialize(self):
        """Inicializacija Finance modula"""
        try:
            response = requests.get(f"{self.endpoint}/api/finance/status", timeout=5)
            if response.status_code == 200:
                self.is_connected = True
                logger.info(f"Finance modul uspešno povezan na {self.endpoint}")
                return True
        except Exception as e:
            logger.error(f"Napaka pri povezovanju Finance modula: {e}")
        return False
    
    async def health_check(self) -> bool:
        try:
            response = requests.get(f"{self.endpoint}/api/finance/health", timeout=3)
            self.last_heartbeat = datetime.now()
            return response.status_code == 200
        except:
            return False
    
    async def execute_action(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = requests.post(
                f"{self.endpoint}/api/finance/{action}",
                json=parameters,
                timeout=30
            )
            return response.json() if response.status_code == 200 else {"error": "Action failed"}
        except Exception as e:
            return {"error": str(e)}

class TourismModuleConnector(BaseModuleConnector):
    """Connector za Tourism modul"""
    
    def __init__(self):
        super().__init__("Tourism", "http://localhost:3002", 3002)
        self.capabilities = [
            ModuleCapability(
                name="create_itinerary",
                description="Ustvari turistični itinerar",
                parameters={"destination": "string", "days": "number", "budget": "number", "interests": "array"},
                response_format={"itinerary_id": "string", "activities": "array", "total_cost": "number"}
            ),
            ModuleCapability(
                name="book_accommodation",
                description="Rezerviraj nastanitev",
                parameters={"location": "string", "check_in": "string", "check_out": "string", "guests": "number"},
                response_format={"booking_id": "string", "confirmation": "string", "price": "number"}
            ),
            ModuleCapability(
                name="find_activities",
                description="Najdi aktivnosti",
                parameters={"location": "string", "category": "string", "date": "string"},
                response_format={"activities": "array", "recommendations": "array"}
            ),
            ModuleCapability(
                name="weather_forecast",
                description="Vremenska napoved",
                parameters={"location": "string", "days": "number"},
                response_format={"forecast": "array", "recommendations": "array"}
            )
        ]
    
    async def initialize(self):
        try:
            response = requests.get(f"{self.endpoint}/api/tourism/status", timeout=5)
            if response.status_code == 200:
                self.is_connected = True
                logger.info(f"Tourism modul uspešno povezan na {self.endpoint}")
                return True
        except Exception as e:
            logger.error(f"Napaka pri povezovanju Tourism modula: {e}")
        return False
    
    async def health_check(self) -> bool:
        try:
            response = requests.get(f"{self.endpoint}/api/tourism/health", timeout=3)
            self.last_heartbeat = datetime.now()
            return response.status_code == 200
        except:
            return False
    
    async def execute_action(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = requests.post(
                f"{self.endpoint}/api/tourism/{action}",
                json=parameters,
                timeout=30
            )
            return response.json() if response.status_code == 200 else {"error": "Action failed"}
        except Exception as e:
            return {"error": str(e)}

class IoTModuleConnector(BaseModuleConnector):
    """Connector za IoT modul"""
    
    def __init__(self):
        super().__init__("IoT", "http://localhost:3003", 3003)
        self.capabilities = [
            ModuleCapability(
                name="get_sensor_data",
                description="Pridobi podatke senzorjev",
                parameters={"sensor_id": "string", "time_range": "string"},
                response_format={"data": "array", "statistics": "object"}
            ),
            ModuleCapability(
                name="control_device",
                description="Nadzoruj IoT napravo",
                parameters={"device_id": "string", "command": "string", "parameters": "object"},
                response_format={"status": "string", "response": "object"}
            ),
            ModuleCapability(
                name="create_automation",
                description="Ustvari avtomatizacijo",
                parameters={"trigger": "object", "actions": "array", "conditions": "array"},
                response_format={"automation_id": "string", "status": "string"}
            ),
            ModuleCapability(
                name="monitor_alerts",
                description="Spremljaj opozorila",
                parameters={"severity": "string", "category": "string"},
                response_format={"alerts": "array", "summary": "object"}
            )
        ]
    
    async def initialize(self):
        try:
            response = requests.get(f"{self.endpoint}/api/iot/status", timeout=5)
            if response.status_code == 200:
                self.is_connected = True
                logger.info(f"IoT modul uspešno povezan na {self.endpoint}")
                return True
        except Exception as e:
            logger.error(f"Napaka pri povezovanju IoT modula: {e}")
        return False
    
    async def health_check(self) -> bool:
        try:
            response = requests.get(f"{self.endpoint}/api/iot/health", timeout=3)
            self.last_heartbeat = datetime.now()
            return response.status_code == 200
        except:
            return False
    
    async def execute_action(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = requests.post(
                f"{self.endpoint}/api/iot/{action}",
                json=parameters,
                timeout=30
            )
            return response.json() if response.status_code == 200 else {"error": "Action failed"}
        except Exception as e:
            return {"error": str(e)}

class RadioModuleConnector(BaseModuleConnector):
    """Connector za Radio modul"""
    
    def __init__(self):
        super().__init__("Radio", "http://localhost:3004", 3004)
        self.capabilities = [
            ModuleCapability(
                name="start_stream",
                description="Zaženi radio stream",
                parameters={"playlist_id": "string", "quality": "string"},
                response_format={"stream_url": "string", "status": "string"}
            ),
            ModuleCapability(
                name="manage_playlist",
                description="Upravljaj playlist",
                parameters={"action": "string", "playlist_id": "string", "tracks": "array"},
                response_format={"playlist": "object", "status": "string"}
            ),
            ModuleCapability(
                name="chat_moderation",
                description="Moderiraj klepet",
                parameters={"message": "string", "user_id": "string"},
                response_format={"allowed": "boolean", "reason": "string"}
            ),
            ModuleCapability(
                name="broadcast_message",
                description="Oddaj sporočilo",
                parameters={"message": "string", "priority": "string"},
                response_format={"broadcast_id": "string", "status": "string"}
            )
        ]
    
    async def initialize(self):
        try:
            response = requests.get(f"{self.endpoint}/api/radio/status", timeout=5)
            if response.status_code == 200:
                self.is_connected = True
                logger.info(f"Radio modul uspešno povezan na {self.endpoint}")
                return True
        except Exception as e:
            logger.error(f"Napaka pri povezovanju Radio modula: {e}")
        return False
    
    async def health_check(self) -> bool:
        try:
            response = requests.get(f"{self.endpoint}/api/radio/health", timeout=3)
            self.last_heartbeat = datetime.now()
            return response.status_code == 200
        except:
            return False
    
    async def execute_action(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = requests.post(
                f"{self.endpoint}/api/radio/{action}",
                json=parameters,
                timeout=30
            )
            return response.json() if response.status_code == 200 else {"error": "Action failed"}
        except Exception as e:
            return {"error": str(e)}

class BeekeepingModuleConnector(BaseModuleConnector):
    """Connector za Čebelarstvo modul"""
    
    def __init__(self):
        super().__init__("Beekeeping", "http://localhost:3005", 3005)
        self.capabilities = [
            ModuleCapability(
                name="monitor_hives",
                description="Spremljaj panje",
                parameters={"hive_ids": "array", "metrics": "array"},
                response_format={"hive_data": "array", "alerts": "array"}
            ),
            ModuleCapability(
                name="track_production",
                description="Spremljaj proizvodnjo",
                parameters={"period": "string", "hive_id": "string"},
                response_format={"production": "object", "trends": "array"}
            ),
            ModuleCapability(
                name="health_assessment",
                description="Oceni zdravje čebel",
                parameters={"hive_id": "string", "symptoms": "array"},
                response_format={"assessment": "object", "recommendations": "array"}
            ),
            ModuleCapability(
                name="sales_management",
                description="Upravljaj prodajo medu",
                parameters={"product": "string", "quantity": "number", "price": "number"},
                response_format={"sale_id": "string", "profit": "number"}
            )
        ]
    
    async def initialize(self):
        try:
            response = requests.get(f"{self.endpoint}/api/beekeeping/status", timeout=5)
            if response.status_code == 200:
                self.is_connected = True
                logger.info(f"Beekeeping modul uspešno povezan na {self.endpoint}")
                return True
        except Exception as e:
            logger.error(f"Napaka pri povezovanju Beekeeping modula: {e}")
        return False
    
    async def health_check(self) -> bool:
        try:
            response = requests.get(f"{self.endpoint}/api/beekeeping/health", timeout=3)
            self.last_heartbeat = datetime.now()
            return response.status_code == 200
        except:
            return False
    
    async def execute_action(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = requests.post(
                f"{self.endpoint}/api/beekeeping/{action}",
                json=parameters,
                timeout=30
            )
            return response.json() if response.status_code == 200 else {"error": "Action failed"}
        except Exception as e:
            return {"error": str(e)}

class DevOpsModuleConnector(BaseModuleConnector):
    """Connector za DevOps modul"""
    
    def __init__(self):
        super().__init__("DevOps", "http://localhost:3006", 3006)
        self.capabilities = [
            ModuleCapability(
                name="system_monitoring",
                description="Spremljaj sistem",
                parameters={"metrics": "array", "time_range": "string"},
                response_format={"metrics": "object", "alerts": "array"}
            ),
            ModuleCapability(
                name="deploy_application",
                description="Namesti aplikacijo",
                parameters={"app_name": "string", "version": "string", "environment": "string"},
                response_format={"deployment_id": "string", "status": "string"}
            ),
            ModuleCapability(
                name="backup_system",
                description="Ustvari varnostno kopijo",
                parameters={"components": "array", "destination": "string"},
                response_format={"backup_id": "string", "size": "number"}
            ),
            ModuleCapability(
                name="security_scan",
                description="Varnostni pregled",
                parameters={"target": "string", "scan_type": "string"},
                response_format={"vulnerabilities": "array", "score": "number"}
            )
        ]
    
    async def initialize(self):
        try:
            response = requests.get(f"{self.endpoint}/api/devops/status", timeout=5)
            if response.status_code == 200:
                self.is_connected = True
                logger.info(f"DevOps modul uspešno povezan na {self.endpoint}")
                return True
        except Exception as e:
            logger.error(f"Napaka pri povezovanju DevOps modula: {e}")
        return False
    
    async def health_check(self) -> bool:
        try:
            response = requests.get(f"{self.endpoint}/api/devops/health", timeout=3)
            self.last_heartbeat = datetime.now()
            return response.status_code == 200
        except:
            return False
    
    async def execute_action(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = requests.post(
                f"{self.endpoint}/api/devops/{action}",
                json=parameters,
                timeout=30
            )
            return response.json() if response.status_code == 200 else {"error": "Action failed"}
        except Exception as e:
            return {"error": str(e)}

class HealthModuleConnector(BaseModuleConnector):
    """Connector za Health modul"""
    
    def __init__(self):
        super().__init__("Health", "http://localhost:3007", 3007)
        self.capabilities = [
            ModuleCapability(
                name="health_monitoring",
                description="Spremljaj zdravje",
                parameters={"user_id": "string", "metrics": "array"},
                response_format={"health_data": "object", "recommendations": "array"}
            ),
            ModuleCapability(
                name="fitness_tracking",
                description="Spremljaj fitnes",
                parameters={"activity_type": "string", "duration": "number", "intensity": "string"},
                response_format={"calories": "number", "progress": "object"}
            ),
            ModuleCapability(
                name="nutrition_analysis",
                description="Analiziraj prehrano",
                parameters={"meals": "array", "goals": "object"},
                response_format={"analysis": "object", "suggestions": "array"}
            ),
            ModuleCapability(
                name="wellness_recommendations",
                description="Priporočila za dobro počutje",
                parameters={"health_profile": "object", "preferences": "array"},
                response_format={"recommendations": "array", "priority": "string"}
            )
        ]
    
    async def initialize(self):
        try:
            response = requests.get(f"{self.endpoint}/api/health/status", timeout=5)
            if response.status_code == 200:
                self.is_connected = True
                logger.info(f"Health modul uspešno povezan na {self.endpoint}")
                return True
        except Exception as e:
            logger.error(f"Napaka pri povezovanju Health modula: {e}")
        return False
    
    async def health_check(self) -> bool:
        try:
            response = requests.get(f"{self.endpoint}/api/health/health", timeout=3)
            self.last_heartbeat = datetime.now()
            return response.status_code == 200
        except:
            return False
    
    async def execute_action(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = requests.post(
                f"{self.endpoint}/api/health/{action}",
                json=parameters,
                timeout=30
            )
            return response.json() if response.status_code == 200 else {"error": "Action failed"}
        except Exception as e:
            return {"error": str(e)}

class ModuleConnectionManager:
    """Manager za upravljanje vseh module connectorjev"""
    
    def __init__(self):
        self.connectors: Dict[str, BaseModuleConnector] = {}
        self.initialize_connectors()
    
    def initialize_connectors(self):
        """Inicializacija vseh connectorjev"""
        self.connectors = {
            "Finance": FinanceModuleConnector(),
            "Tourism": TourismModuleConnector(),
            "IoT": IoTModuleConnector(),
            "Radio": RadioModuleConnector(),
            "Beekeeping": BeekeepingModuleConnector(),
            "DevOps": DevOpsModuleConnector(),
            "Health": HealthModuleConnector()
        }
        logger.info(f"Inicializiranih {len(self.connectors)} module connectorjev")
    
    async def connect_all_modules(self) -> Dict[str, bool]:
        """Poveži vse module"""
        results = {}
        for name, connector in self.connectors.items():
            try:
                results[name] = await connector.initialize()
                if results[name]:
                    logger.info(f"✓ {name} modul uspešno povezan")
                else:
                    logger.warning(f"✗ {name} modul ni dosegljiv")
            except Exception as e:
                results[name] = False
                logger.error(f"✗ Napaka pri povezovanju {name} modula: {e}")
        
        connected_count = sum(results.values())
        logger.info(f"Povezanih {connected_count}/{len(results)} modulov")
        return results
    
    async def health_check_all(self) -> Dict[str, bool]:
        """Preveri zdravje vseh modulov"""
        results = {}
        for name, connector in self.connectors.items():
            results[name] = await connector.health_check()
        return results
    
    async def execute_module_action(self, module_name: str, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Izvršitev akcije na določenem modulu"""
        if module_name not in self.connectors:
            return {"error": f"Modul {module_name} ne obstaja"}
        
        connector = self.connectors[module_name]
        if not connector.is_connected:
            return {"error": f"Modul {module_name} ni povezan"}
        
        return await connector.execute_action(action, parameters)
    
    def get_module_capabilities(self, module_name: str) -> List[ModuleCapability]:
        """Pridobi zmožnosti modula"""
        if module_name in self.connectors:
            return self.connectors[module_name].capabilities
        return []
    
    def get_all_capabilities(self) -> Dict[str, List[ModuleCapability]]:
        """Pridobi zmožnosti vseh modulov"""
        return {
            name: connector.capabilities 
            for name, connector in self.connectors.items()
        }
    
    def get_connection_status(self) -> Dict[str, Dict[str, Any]]:
        """Pridobi status povezav vseh modulov"""
        return {
            name: {
                "connected": connector.is_connected,
                "endpoint": connector.endpoint,
                "port": connector.port,
                "last_heartbeat": connector.last_heartbeat.isoformat(),
                "capabilities_count": len(connector.capabilities)
            }
            for name, connector in self.connectors.items()
        }

# Testna funkcija
async def test_connections():
    """Test povezav z vsemi moduli"""
    manager = ModuleConnectionManager()
    
    print("🔄 Testiranje povezav z AI moduli...")
    results = await manager.connect_all_modules()
    
    print("\n📊 Status povezav:")
    for module, connected in results.items():
        status = "✅ Povezan" if connected else "❌ Ni dosegljiv"
        print(f"  {module}: {status}")
    
    print("\n🔍 Preverjanje zdravja modulov...")
    health_results = await manager.health_check_all()
    
    print("\n💊 Zdravje modulov:")
    for module, healthy in health_results.items():
        status = "✅ Zdrav" if healthy else "❌ Ni zdrav"
        print(f"  {module}: {status}")
    
    print("\n🎯 Zmožnosti modulov:")
    capabilities = manager.get_all_capabilities()
    for module, caps in capabilities.items():
        print(f"  {module}: {len(caps)} zmožnosti")
        for cap in caps[:2]:  # Prikaži prve 2 zmožnosti
            print(f"    - {cap.name}: {cap.description}")

if __name__ == "__main__":
    asyncio.run(test_connections())