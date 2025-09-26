"""
OmniCore Global Orchestrator
Glavni orkestrator za koordinacijo vseh modulov in storitev
"""

import logging
import json
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from fastapi import FastAPI, HTTPException, Depends, Form, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Konfiguracija logginga
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ModuleConfig:
    name: str
    url: str
    port: int
    status: str  # active, inactive, error
    last_check: datetime
    response_time: float
    version: str

@dataclass
class OrchestratorRequest:
    query: str
    user_id: str
    tenant_id: str
    priority: str = "medium"
    modules: Optional[List[str]] = None

@dataclass
class OrchestratorResponse:
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    execution_time: float = 0.0
    modules_used: List[str] = None

class GlobalOrchestrator:
    """Globalni orkestrator za koordinacijo vseh OmniCore modulov"""
    
    def __init__(self):
        self.name = "global_orchestrator"
        self.version = "1.0.0"
        self.modules: Dict[str, ModuleConfig] = {}
        self.initialize_modules()
        self.request_history: List[Dict] = []
        logger.info("🎯 Global Orchestrator inicializiran")
    
    def initialize_modules(self):
        """Inicializacija konfiguracije modulov"""
        modules_config = [
            ModuleConfig(
                name="ai_router",
                url="http://localhost:8300",
                port=8300,
                status="unknown",
                last_check=datetime.now(),
                response_time=0.0,
                version="1.0.0"
            ),
            ModuleConfig(
                name="finance",
                url="http://localhost:8301",
                port=8301,
                status="unknown",
                last_check=datetime.now(),
                response_time=0.0,
                version="1.0.0"
            ),
            ModuleConfig(
                name="analytics",
                url="http://localhost:8302",
                port=8302,
                status="unknown",
                last_check=datetime.now(),
                response_time=0.0,
                version="1.0.0"
            ),
            ModuleConfig(
                name="task",
                url="http://localhost:8303",
                port=8303,
                status="unknown",
                last_check=datetime.now(),
                response_time=0.0,
                version="1.0.0"
            ),
            ModuleConfig(
                name="cloud_infrastructure",
                url="http://localhost:8200",
                port=8200,
                status="unknown",
                last_check=datetime.now(),
                response_time=0.0,
                version="1.0.0"
            ),
            ModuleConfig(
                name="production_dashboard",
                url="http://localhost:8204",
                port=8204,
                status="unknown",
                last_check=datetime.now(),
                response_time=0.0,
                version="1.0.0"
            )
        ]
        
        for module in modules_config:
            self.modules[module.name] = module
    
    async def check_module_health(self, module_name: str) -> bool:
        """Preveri zdravje modula"""
        if module_name not in self.modules:
            return False
        
        module = self.modules[module_name]
        start_time = datetime.now()
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(f"{module.url}/health") as response:
                    if response.status == 200:
                        module.status = "active"
                        module.response_time = (datetime.now() - start_time).total_seconds()
                        module.last_check = datetime.now()
                        return True
                    else:
                        module.status = "error"
                        return False
        except Exception as e:
            logger.warning(f"Modul {module_name} ni dosegljiv: {e}")
            module.status = "inactive"
            module.response_time = (datetime.now() - start_time).total_seconds()
            module.last_check = datetime.now()
            return False
    
    async def check_all_modules(self):
        """Preveri zdravje vseh modulov"""
        tasks = []
        for module_name in self.modules.keys():
            tasks.append(self.check_module_health(module_name))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        active_modules = sum(1 for result in results if result is True)
        logger.info(f"Zdravstveno preverjanje: {active_modules}/{len(self.modules)} modulov aktivnih")
        
        return {
            "total_modules": len(self.modules),
            "active_modules": active_modules,
            "inactive_modules": len(self.modules) - active_modules,
            "modules": {name: module.status for name, module in self.modules.items()}
        }
    
    async def route_request(self, request: OrchestratorRequest) -> OrchestratorResponse:
        """Usmeri zahtevo na ustrezne module"""
        start_time = datetime.now()
        modules_used = []
        
        try:
            # Najprej preveri AI Router za inteligentno usmerjanje
            if "ai_router" in self.modules and self.modules["ai_router"].status == "active":
                try:
                    async with aiohttp.ClientSession() as session:
                        data = {
                            "query": request.query,
                            "user_id": request.user_id,
                            "priority": request.priority
                        }
                        
                        async with session.post(f"{self.modules['ai_router'].url}/route", json=data) as response:
                            if response.status == 200:
                                ai_response = await response.json()
                                modules_used.append("ai_router")
                                
                                # Izvedi priporočene module
                                if "recommended_modules" in ai_response:
                                    for module_name in ai_response["recommended_modules"]:
                                        if module_name in self.modules and self.modules[module_name].status == "active":
                                            module_response = await self._execute_module_request(module_name, request)
                                            if module_response:
                                                modules_used.append(module_name)
                                
                                execution_time = (datetime.now() - start_time).total_seconds()
                                
                                # Shrani v zgodovino
                                self.request_history.append({
                                    "timestamp": datetime.now().isoformat(),
                                    "query": request.query,
                                    "user_id": request.user_id,
                                    "tenant_id": request.tenant_id,
                                    "modules_used": modules_used,
                                    "execution_time": execution_time,
                                    "success": True
                                })
                                
                                return OrchestratorResponse(
                                    success=True,
                                    message="Zahteva uspešno obdelana preko AI Router",
                                    data=ai_response,
                                    execution_time=execution_time,
                                    modules_used=modules_used
                                )
                except Exception as e:
                    logger.error(f"Napaka pri AI Router: {e}")
            
            # Fallback: direktno usmerjanje na podlagi ključnih besed
            target_modules = self._determine_target_modules(request.query)
            
            results = {}
            for module_name in target_modules:
                if module_name in self.modules and self.modules[module_name].status == "active":
                    module_response = await self._execute_module_request(module_name, request)
                    if module_response:
                        results[module_name] = module_response
                        modules_used.append(module_name)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # Shrani v zgodovino
            self.request_history.append({
                "timestamp": datetime.now().isoformat(),
                "query": request.query,
                "user_id": request.user_id,
                "tenant_id": request.tenant_id,
                "modules_used": modules_used,
                "execution_time": execution_time,
                "success": len(results) > 0
            })
            
            if results:
                return OrchestratorResponse(
                    success=True,
                    message=f"Zahteva obdelana preko {len(results)} modulov",
                    data={"results": results},
                    execution_time=execution_time,
                    modules_used=modules_used
                )
            else:
                return OrchestratorResponse(
                    success=False,
                    message="Noben modul ni bil sposoben obdelati zahteve",
                    execution_time=execution_time,
                    modules_used=modules_used
                )
                
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"Napaka pri usmerjanju zahteve: {e}")
            
            return OrchestratorResponse(
                success=False,
                message=f"Napaka pri obdelavi zahteve: {str(e)}",
                execution_time=execution_time,
                modules_used=modules_used
            )
    
    def _determine_target_modules(self, query: str) -> List[str]:
        """Določi ciljne module na podlagi zahteve"""
        query_lower = query.lower()
        target_modules = []
        
        # Finance keywords
        if any(keyword in query_lower for keyword in ["finance", "money", "invoice", "payment", "budget", "cost", "revenue", "profit"]):
            target_modules.append("finance")
        
        # Analytics keywords
        if any(keyword in query_lower for keyword in ["analytics", "report", "data", "chart", "statistics", "analysis", "dashboard"]):
            target_modules.append("analytics")
        
        # Task keywords
        if any(keyword in query_lower for keyword in ["task", "todo", "calendar", "meeting", "schedule", "event", "deadline"]):
            target_modules.append("task")
        
        # Če ni specifičnih ključnih besed, uporabi vse dostopne module
        if not target_modules:
            target_modules = ["finance", "analytics", "task"]
        
        return target_modules
    
    async def _execute_module_request(self, module_name: str, request: OrchestratorRequest) -> Optional[Dict]:
        """Izvedi zahtevo na specifičnem modulu"""
        try:
            module = self.modules[module_name]
            
            async with aiohttp.ClientSession() as session:
                data = {
                    "query": request.query,
                    "user_id": request.user_id,
                    "priority": request.priority
                }
                
                async with session.post(f"{module.url}/process", data=data) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning(f"Modul {module_name} vrnil status {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Napaka pri izvajanju zahteve na modulu {module_name}: {e}")
            return None
    
    def get_system_status(self) -> Dict[str, Any]:
        """Pridobi status celotnega sistema"""
        active_modules = [name for name, module in self.modules.items() if module.status == "active"]
        inactive_modules = [name for name, module in self.modules.items() if module.status != "active"]
        
        avg_response_time = sum(module.response_time for module in self.modules.values()) / len(self.modules)
        
        return {
            "orchestrator": {
                "name": self.name,
                "version": self.version,
                "status": "active",
                "uptime": "running"
            },
            "modules": {
                "total": len(self.modules),
                "active": len(active_modules),
                "inactive": len(inactive_modules),
                "active_list": active_modules,
                "inactive_list": inactive_modules,
                "average_response_time": round(avg_response_time, 3)
            },
            "requests": {
                "total_processed": len(self.request_history),
                "recent_requests": self.request_history[-10:] if self.request_history else []
            },
            "timestamp": datetime.now().isoformat()
        }

# Inicializacija orkestatorja
orchestrator = GlobalOrchestrator()

# FastAPI aplikacija
app = FastAPI(
    title="OmniCore Global Orchestrator",
    description="Glavni orkestrator za koordinacijo vseh OmniCore modulov",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Zagon aplikacije"""
    logger.info("🎯 Global Orchestrator zaganja...")
    # Preveri zdravje vseh modulov ob zagonu
    await orchestrator.check_all_modules()

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """Global Orchestrator dashboard"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>OmniCore Global Orchestrator</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .stat-number { font-size: 2em; font-weight: bold; }
            .stat-label { font-size: 0.9em; opacity: 0.9; }
            .modules-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .module-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; }
            .module-card.inactive { border-left-color: #dc3545; }
            .module-card.error { border-left-color: #ffc107; }
            .module-name { font-weight: bold; font-size: 1.1em; margin-bottom: 10px; }
            .module-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
            .status-active { background: #d4edda; color: #155724; }
            .status-inactive { background: #f8d7da; color: #721c24; }
            .status-error { background: #fff3cd; color: #856404; }
            .section { margin-bottom: 30px; }
            .section h3 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .request-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
            .api-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px; }
            .endpoint { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; }
            .test-section { background: #e3f2fd; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .test-input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
            .test-button { background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
            .test-result { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; border: 1px solid #ddd; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 OmniCore Global Orchestrator</h1>
                <p>Glavni orkestrator za koordinacijo vseh modulov</p>
            </div>
            
            <div class="stats" id="stats">
                <div class="stat-card">
                    <div class="stat-number" id="total-modules">-</div>
                    <div class="stat-label">Skupaj modulov</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="active-modules">-</div>
                    <div class="stat-label">Aktivni moduli</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="total-requests">-</div>
                    <div class="stat-label">Obdelane zahteve</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="avg-response-time">-</div>
                    <div class="stat-label">Povprečni odzivni čas (s)</div>
                </div>
            </div>
            
            <div class="section">
                <h3>🔧 Status modulov</h3>
                <div class="modules-grid" id="modules-grid"></div>
            </div>
            
            <div class="section">
                <h3>📊 Nedavne zahteve</h3>
                <div id="recent-requests"></div>
            </div>
            
            <div class="test-section">
                <h3>🧪 Test orkestatorja</h3>
                <input type="text" id="test-query" class="test-input" placeholder="Vnesite zahtevo za testiranje..." value="Prikaži finančni pregled">
                <input type="text" id="test-user" class="test-input" placeholder="User ID" value="test@company.com">
                <input type="text" id="test-tenant" class="test-input" placeholder="Tenant ID" value="company1">
                <button class="test-button" onclick="testOrchestrator()">Testiraj zahtevo</button>
                <div id="test-result" class="test-result" style="display: none;"></div>
            </div>
            
            <div class="api-section">
                <h3>🔗 API Endpoints</h3>
                <div class="endpoint">POST /orchestrate - Orkestriraj zahtevo</div>
                <div class="endpoint">GET /status - Status sistema</div>
                <div class="endpoint">GET /health - Zdravstveno preverjanje</div>
                <div class="endpoint">POST /check-modules - Preveri vse module</div>
                <div class="endpoint">GET /modules - Seznam modulov</div>
            </div>
        </div>
        
        <script>
            async function loadDashboard() {
                try {
                    const response = await fetch('/status');
                    const data = await response.json();
                    
                    // Posodobi statistike
                    document.getElementById('total-modules').textContent = data.modules.total;
                    document.getElementById('active-modules').textContent = data.modules.active;
                    document.getElementById('total-requests').textContent = data.requests.total_processed;
                    document.getElementById('avg-response-time').textContent = data.modules.average_response_time;
                    
                    // Prikaži module
                    const modulesGrid = document.getElementById('modules-grid');
                    modulesGrid.innerHTML = '';
                    
                    // Pridobi podrobnosti modulov
                    const modulesResponse = await fetch('/modules');
                    const modulesData = await modulesResponse.json();
                    
                    Object.entries(modulesData.modules).forEach(([name, module]) => {
                        const moduleDiv = document.createElement('div');
                        moduleDiv.className = `module-card ${module.status}`;
                        moduleDiv.innerHTML = `
                            <div class="module-name">${name}</div>
                            <div class="module-status status-${module.status}">${module.status.toUpperCase()}</div>
                            <div style="margin-top: 10px; font-size: 0.9em;">
                                <div>URL: ${module.url}</div>
                                <div>Port: ${module.port}</div>
                                <div>Odzivni čas: ${module.response_time}s</div>
                                <div>Zadnja preveritev: ${new Date(module.last_check).toLocaleString()}</div>
                            </div>
                        `;
                        modulesGrid.appendChild(moduleDiv);
                    });
                    
                    // Prikaži nedavne zahteve
                    const recentRequestsDiv = document.getElementById('recent-requests');
                    recentRequestsDiv.innerHTML = '';
                    data.requests.recent_requests.forEach(request => {
                        const requestDiv = document.createElement('div');
                        requestDiv.className = 'request-item';
                        requestDiv.innerHTML = `
                            <strong>${request.query}</strong><br>
                            <small>
                                Uporabnik: ${request.user_id} | 
                                Tenant: ${request.tenant_id} | 
                                Moduli: ${request.modules_used.join(', ')} | 
                                Čas: ${request.execution_time}s | 
                                ${new Date(request.timestamp).toLocaleString()}
                            </small>
                        `;
                        recentRequestsDiv.appendChild(requestDiv);
                    });
                    
                } catch (error) {
                    console.error('Napaka pri nalaganju dashboard podatkov:', error);
                }
            }
            
            async function testOrchestrator() {
                const query = document.getElementById('test-query').value;
                const userId = document.getElementById('test-user').value;
                const tenantId = document.getElementById('test-tenant').value;
                
                if (!query) {
                    alert('Prosimo vnesite zahtevo');
                    return;
                }
                
                try {
                    const formData = new FormData();
                    formData.append('query', query);
                    formData.append('user_id', userId);
                    formData.append('tenant_id', tenantId);
                    
                    const response = await fetch('/orchestrate', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    const resultDiv = document.getElementById('test-result');
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = `
                        <h4>Rezultat testa:</h4>
                        <pre>${JSON.stringify(result, null, 2)}</pre>
                    `;
                    
                    // Osveži dashboard
                    loadDashboard();
                    
                } catch (error) {
                    const resultDiv = document.getElementById('test-result');
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = `<h4>Napaka:</h4><p>${error.message}</p>`;
                }
            }
            
            // Naloži podatke ob zagonu
            loadDashboard();
            
            // Osveži podatke vsakih 30 sekund
            setInterval(loadDashboard, 30000);
        </script>
    </body>
    </html>
    """

@app.post("/orchestrate")
async def orchestrate_request(
    query: str = Form(...),
    user_id: str = Form(default="user@company.com"),
    tenant_id: str = Form(default="default_tenant"),
    priority: str = Form(default="medium")
):
    """Orkestriraj zahtevo"""
    request = OrchestratorRequest(
        query=query,
        user_id=user_id,
        tenant_id=tenant_id,
        priority=priority
    )
    
    response = await orchestrator.route_request(request)
    return response

@app.get("/status")
async def get_system_status():
    """Pridobi status sistema"""
    return orchestrator.get_system_status()

@app.post("/check-modules")
async def check_modules():
    """Preveri zdravje vseh modulov"""
    return await orchestrator.check_all_modules()

@app.get("/modules")
async def get_modules():
    """Pridobi seznam modulov"""
    return {
        "modules": {name: asdict(module) for name, module in orchestrator.modules.items()},
        "total": len(orchestrator.modules),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Zdravstveno preverjanje"""
    return {
        "status": "healthy",
        "service": "global_orchestrator",
        "version": orchestrator.version,
        "timestamp": datetime.now().isoformat(),
        "modules_count": len(orchestrator.modules)
    }

if __name__ == "__main__":
    print("🎯 Zaganjam OmniCore Global Orchestrator...")
    print("🔗 Multi-module coordination: Active")
    print("🤖 AI-powered routing: Enabled")
    print("🌐 Multi-tenant support: Ready")
    print("📊 Orchestrator dashboard: http://localhost:8400")
    
    uvicorn.run(
        "omni_global_orchestrator:app",
        host="0.0.0.0",
        port=8400,
        reload=True
    )