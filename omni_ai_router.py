#!/usr/bin/env python3
"""
OmniCore AI Router
Inteligentno usmerjanje zahtev z OpenAI GPT-4
"""

import os
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import openai
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Konfiguracija logging-a
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omni_ai_router")

class ModuleType(Enum):
    FINANCE = "finance"
    ANALYTICS = "analytics"
    TASK_CALENDAR = "task_calendar"
    LOGISTICS = "logistics"
    SECURITY = "security"
    GENERAL = "general"

class RequestPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class RoutingRequest:
    id: str
    query: str
    user_id: str
    tenant_id: str
    priority: RequestPriority
    timestamp: datetime
    context: Dict[str, Any] = None

@dataclass
class RoutingResponse:
    request_id: str
    selected_module: str
    confidence: float
    reasoning: str
    execution_time: float
    result: Any = None
    error: str = None

class ModuleInterface:
    """Bazni interface za vse module"""
    
    def __init__(self, name: str, module_type: ModuleType):
        self.name = name
        self.module_type = module_type
        self.is_active = True
        self.last_health_check = datetime.now()
    
    async def handle_request(self, request: RoutingRequest) -> Dict[str, Any]:
        """Obdelaj zahtevo - implementira vsak modul"""
        raise NotImplementedError
    
    async def health_check(self) -> bool:
        """Preveri zdravje modula"""
        self.last_health_check = datetime.now()
        return self.is_active

class AIRouter:
    """Glavni AI Router sistem"""
    
    def __init__(self, openai_api_key: str = None):
        # OpenAI konfiguracija
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
        
        # Registrirani moduli
        self.modules: Dict[str, ModuleInterface] = {}
        
        # Routing zgodovina
        self.routing_history: List[RoutingResponse] = []
        
        # Statistike
        self.stats = {
            "total_requests": 0,
            "successful_routes": 0,
            "failed_routes": 0,
            "average_confidence": 0.0,
            "module_usage": {}
        }
        
        logger.info("🤖 AI Router inicializiran")
    
    def register_module(self, module: ModuleInterface):
        """Registriraj novi modul"""
        self.modules[module.name] = module
        self.stats["module_usage"][module.name] = 0
        logger.info(f"📦 Modul registriran: {module.name} ({module.module_type.value})")
    
    async def route_request(self, request: RoutingRequest) -> RoutingResponse:
        """Usmeri zahtevo v ustrezen modul z AI"""
        start_time = datetime.now()
        
        try:
            # AI analiza zahteve
            selected_module, confidence, reasoning = await self._ai_analyze_request(request)
            
            # Preveri če modul obstaja in je aktiven
            if selected_module not in self.modules:
                raise ValueError(f"Modul '{selected_module}' ne obstaja")
            
            module = self.modules[selected_module]
            if not module.is_active:
                raise ValueError(f"Modul '{selected_module}' ni aktiven")
            
            # Izvršitev zahteve
            result = await module.handle_request(request)
            
            # Izračunaj čas izvršitve
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # Ustvari odgovor
            response = RoutingResponse(
                request_id=request.id,
                selected_module=selected_module,
                confidence=confidence,
                reasoning=reasoning,
                execution_time=execution_time,
                result=result
            )
            
            # Posodobi statistike
            self._update_stats(response, success=True)
            
            # Shrani v zgodovino
            self.routing_history.append(response)
            
            logger.info(f"✅ Zahteva {request.id} uspešno usmerjena v {selected_module} (confidence: {confidence:.2f})")
            
            return response
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            
            response = RoutingResponse(
                request_id=request.id,
                selected_module="error",
                confidence=0.0,
                reasoning=f"Napaka pri usmerjanju: {str(e)}",
                execution_time=execution_time,
                error=str(e)
            )
            
            self._update_stats(response, success=False)
            self.routing_history.append(response)
            
            logger.error(f"❌ Napaka pri usmerjanju zahteve {request.id}: {str(e)}")
            
            return response
    
    async def _ai_analyze_request(self, request: RoutingRequest) -> tuple[str, float, str]:
        """AI analiza zahteve za določitev ustreznega modula"""
        
        # Če ni OpenAI ključa, uporabi preprost rule-based routing
        if not self.openai_api_key:
            return self._rule_based_routing(request)
        
        try:
            # Pripravi kontekst za AI
            available_modules = list(self.modules.keys())
            module_descriptions = {
                "finance": "Finančne analize, računi, plačila, proračuni, ERP podatki",
                "analytics": "Podatkovne analize, poročila, statistike, KPI metrike",
                "task_calendar": "Upravljanje nalog, koledar, sestanki, opomniki",
                "logistics": "Logistika, dostava, skladiščenje, transport",
                "security": "Varnost, dostop, avtentikacija, audit",
                "general": "Splošne informacije, pomoč, dokumentacija"
            }
            
            prompt = f"""
Analiziraj uporabnikovo zahtevo in določi najbolj ustrezen modul za obdelavo.

Zahteva: "{request.query}"
Kontekst: {request.context or 'Ni dodatnega konteksta'}
Prioriteta: {request.priority.value}

Na voljo so naslednji moduli:
{json.dumps(module_descriptions, indent=2, ensure_ascii=False)}

Aktivni moduli: {', '.join(available_modules)}

Vrni JSON odgovor v tej obliki:
{{
    "selected_module": "ime_modula",
    "confidence": 0.95,
    "reasoning": "Razlog za izbiro tega modula"
}}

Confidence naj bo med 0.0 in 1.0, kjer 1.0 pomeni popolno gotovost.
"""
            
            # OpenAI API klic
            response = openai.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "Si strokovnjak za usmerjanje poslovnih zahtev v ustrezne module. Vedno vrni veljavni JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            # Parsiraj odgovor
            ai_response = json.loads(response.choices[0].message.content.strip())
            
            selected_module = ai_response.get("selected_module", "general")
            confidence = float(ai_response.get("confidence", 0.5))
            reasoning = ai_response.get("reasoning", "AI analiza")
            
            # Preveri če je izbrani modul aktiven
            if selected_module not in available_modules:
                selected_module = "general"
                confidence = 0.3
                reasoning = f"Prvotno izbrani modul ni na voljo, preusmerjeno na {selected_module}"
            
            return selected_module, confidence, reasoning
            
        except Exception as e:
            logger.warning(f"AI analiza neuspešna, uporabljam rule-based routing: {str(e)}")
            return self._rule_based_routing(request)
    
    def _rule_based_routing(self, request: RoutingRequest) -> tuple[str, float, str]:
        """Preprost rule-based routing kot fallback"""
        query_lower = request.query.lower()
        
        # Finančne ključne besede
        if any(word in query_lower for word in ['denar', 'račun', 'plačilo', 'stroški', 'proračun', 'finance', 'invoice']):
            return "finance", 0.8, "Rule-based: finančne ključne besede"
        
        # Analytics ključne besede
        if any(word in query_lower for word in ['analiza', 'poročilo', 'statistika', 'graf', 'podatki', 'metrics']):
            return "analytics", 0.8, "Rule-based: analytics ključne besede"
        
        # Task/Calendar ključne besede
        if any(word in query_lower for word in ['naloga', 'sestanek', 'koledar', 'opomnik', 'task', 'meeting']):
            return "task_calendar", 0.8, "Rule-based: task/calendar ključne besede"
        
        # Logistics ključne besede
        if any(word in query_lower for word in ['dostava', 'transport', 'skladišče', 'logistika', 'shipping']):
            return "logistics", 0.8, "Rule-based: logistics ključne besede"
        
        # Default na general
        return "general", 0.5, "Rule-based: splošna zahteva"
    
    def _update_stats(self, response: RoutingResponse, success: bool):
        """Posodobi statistike"""
        self.stats["total_requests"] += 1
        
        if success:
            self.stats["successful_routes"] += 1
            self.stats["module_usage"][response.selected_module] += 1
            
            # Posodobi povprečno zaupanje
            total_confidence = self.stats["average_confidence"] * (self.stats["successful_routes"] - 1)
            self.stats["average_confidence"] = (total_confidence + response.confidence) / self.stats["successful_routes"]
        else:
            self.stats["failed_routes"] += 1
    
    async def get_module_health(self) -> Dict[str, Any]:
        """Preveri zdravje vseh modulov"""
        health_status = {}
        
        for name, module in self.modules.items():
            try:
                is_healthy = await module.health_check()
                health_status[name] = {
                    "status": "healthy" if is_healthy else "unhealthy",
                    "last_check": module.last_health_check.isoformat(),
                    "type": module.module_type.value
                }
            except Exception as e:
                health_status[name] = {
                    "status": "error",
                    "error": str(e),
                    "type": module.module_type.value
                }
        
        return health_status
    
    def get_stats(self) -> Dict[str, Any]:
        """Vrni statistike routing-a"""
        return {
            **self.stats,
            "success_rate": (self.stats["successful_routes"] / max(self.stats["total_requests"], 1)) * 100,
            "active_modules": len([m for m in self.modules.values() if m.is_active]),
            "total_modules": len(self.modules)
        }

# FastAPI aplikacija
app = FastAPI(
    title="OmniCore AI Router",
    description="Inteligentno usmerjanje zahtev z AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globalni AI Router
ai_router = AIRouter()

# Pydantic modeli za API
class RouteRequest(BaseModel):
    query: str
    user_id: str = "default"
    tenant_id: str = "default"
    priority: str = "medium"
    context: Dict[str, Any] = None

class RouteResponse(BaseModel):
    request_id: str
    selected_module: str
    confidence: float
    reasoning: str
    execution_time: float
    result: Any = None
    error: str = None

@app.get("/")
async def root():
    return {
        "service": "OmniCore AI Router",
        "status": "active",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/route", response_model=RouteResponse)
async def route_request(request: RouteRequest):
    """Usmeri zahtevo v ustrezen modul"""
    
    # Ustvari routing request
    routing_request = RoutingRequest(
        id=f"req_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(request.query) % 10000}",
        query=request.query,
        user_id=request.user_id,
        tenant_id=request.tenant_id,
        priority=RequestPriority(request.priority),
        timestamp=datetime.now(),
        context=request.context
    )
    
    # Usmeri zahtevo
    response = await ai_router.route_request(routing_request)
    
    return RouteResponse(**asdict(response))

@app.get("/health")
async def health_check():
    """Preveri zdravje AI Router-ja in vseh modulov"""
    module_health = await ai_router.get_module_health()
    
    return {
        "router_status": "healthy",
        "modules": module_health,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/stats")
async def get_statistics():
    """Vrni statistike routing-a"""
    return ai_router.get_stats()

@app.get("/modules")
async def list_modules():
    """Seznam vseh registriranih modulov"""
    modules = {}
    for name, module in ai_router.modules.items():
        modules[name] = {
            "name": name,
            "type": module.module_type.value,
            "active": module.is_active,
            "last_health_check": module.last_health_check.isoformat()
        }
    
    return {"modules": modules}

@app.get("/history")
async def get_routing_history(limit: int = 50):
    """Vrni zgodovino routing-a"""
    recent_history = ai_router.routing_history[-limit:]
    return {
        "history": [asdict(response) for response in recent_history],
        "total_requests": len(ai_router.routing_history)
    }

if __name__ == "__main__":
    print("🤖 Zaganjam OmniCore AI Router...")
    print("🧠 AI-powered request routing: Active")
    print("🔗 Multi-module orchestration: Enabled")
    print("📊 AI Router dashboard: http://localhost:8300")
    
    uvicorn.run(
        "omni_ai_router:app",
        host="0.0.0.0",
        port=8300,
        reload=True
    )