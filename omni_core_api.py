#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMNI CORE API - REST API vmesnik za integracijski sloj
Omogoča dostop do Omni CORE preko HTTP zahtev z dinamičnimi plugin-i
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import uvicorn
import json
import datetime
import time
from omni_core import OmniCore
from omni_core_plugins import OmniCorePlugins
from omni_real_data import OmniRealDataCore
from omni_business_modules import OmniBusinessCore

# Globalna spremenljivka za sledenje start time
start_time = time.time()

# Pydantic modeli za API
class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = "anonymous"
    context: Optional[Dict[str, Any]] = {}

class QueryResponse(BaseModel):
    module: str
    action: str
    result: str
    data: Optional[Dict[str, Any]] = {}
    routing_info: Optional[Dict[str, Any]] = {}
    success: bool
    timestamp: str

class SystemStats(BaseModel):
    total_requests: int
    module_usage: Dict[str, int]
    uptime_seconds: float
    available_modules: List[str]
    system_status: str

# Inicializacija FastAPI aplikacije
app = FastAPI(
    title="Omni CORE API",
    description="Centralni integracijski sloj za pametno usmerjanje modulov",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware za cross-origin zahteve
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globalna instanca Omni CORE z plugin sistemom
omni_core = OmniCore()
omni_plugins = OmniCorePlugins(enable_hot_reload=True)
omni_real_data = OmniRealDataCore()
omni_business = OmniBusinessCore()

# API endpoints
@app.get("/", response_class=HTMLResponse)
async def root():
    """Glavna stran z dokumentacijo API-ja"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Omni CORE API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .container { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
            h1 { color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
            .endpoint { background: rgba(255,255,255,0.2); padding: 15px; margin: 10px 0; border-radius: 10px; }
            .method { font-weight: bold; color: #4facfe; }
            a { color: #4facfe; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧠 Omni CORE API z Plugin Sistemom</h1>
            <p>Centralni integracijski sloj za pametno usmerjanje dinamičnih plugin-ov</p>
            
            <h2>📡 Dostopni endpoints:</h2>
            
            <div class="endpoint">
                <span class="method">POST</span> <strong>/query</strong> - Pošlji zahtevo na Plugin sistem
                <br>Primer: {"query": "Dodaj naloga: pripraviti poročilo"}
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/stats</strong> - Statistike plugin sistema
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/capabilities</strong> - Seznam zmožnosti plugin-ov
            </div>
            
            <div class="endpoint">
                <span class="method">POST</span> <strong>/reload-plugins</strong> - Ponovno naloži vse plugin-e
            </div>
            
            <div class="endpoint">
                <span class="method">POST</span> <strong>/reload-plugin/{plugin_name}</strong> - Ponovno naloži specifičen plugin
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/health</strong> - Zdravstveno preverjanje
            </div>
            
            <h2>📚 Dokumentacija:</h2>
            <p><a href="/docs">Swagger UI dokumentacija</a></p>
            <p><a href="/redoc">ReDoc dokumentacija</a></p>
            
            <h2>🧪 Test vmesnik:</h2>
            <p><a href="/test">Interaktivni test vmesnik</a></p>
        </div>
    </body>
    </html>
    """

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """
    Glavna funkcija za obdelavo uporabniških zahtev preko plugin sistema
    """
    try:
        # Obdelaj zahtevo preko Plugin sistema
        result = omni_plugins.route(request.query, request.context)
        
        # Dodaj timestamp
        result["timestamp"] = datetime.datetime.now().isoformat()
        
        # Dodaj uporabniški kontekst če obstaja
        if request.context:
            result["user_context"] = request.context
        
        # Prilagodi format za QueryResponse
        response_data = {
            "module": result.get("plugin", "unknown"),
            "action": result.get("method", "unknown"),
            "result": result.get("message", str(result)),
            "data": result,
            "routing_info": {
                "confidence": result.get("confidence", 0),
                "method": result.get("method", "unknown")
            },
            "success": result.get("success", True),
            "timestamp": result["timestamp"]
        }
        
        return QueryResponse(**response_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri obdelavi zahteve: {str(e)}"
        )

@app.get("/stats", response_model=SystemStats)
async def get_system_stats():
    """Vrni statistike plugin sistema"""
    try:
        stats = omni_plugins.get_stats()
        
        # Prilagodi format za SystemStats
        system_stats = {
            "total_requests": stats.get("total_requests", 0),
            "module_usage": stats.get("plugin_usage", {}),
            "uptime_seconds": stats.get("uptime_seconds", 0),
            "available_modules": list(omni_plugins.plugin_manager.plugins.keys()),
            "system_status": "active" if omni_plugins.plugin_manager.plugins else "no_plugins"
        }
        
        return SystemStats(**system_stats)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri pridobivanju statistik: {str(e)}"
        )

@app.get("/capabilities")
async def get_capabilities():
    """Seznam zmožnosti vseh plugin-ov"""
    try:
        plugins_info = omni_plugins.plugin_manager.list_plugins()
        capabilities = {}
        
        for plugin_name, plugin_info in plugins_info.items():
            capabilities[plugin_name] = {
                "description": plugin_info.get("description", ""),
                "capabilities": plugin_info.get("capabilities", []),
                "version": plugin_info.get("version", "1.0.0"),
                "author": plugin_info.get("author", "OmniCore")
            }
        
        return capabilities
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri pridobivanju zmožnosti: {str(e)}"
        )

@app.post("/reload-plugins")
async def reload_plugins():
    """Ponovno naloži vse plugin-e"""
    try:
        omni_plugins.reload_all_plugins()
        return {"status": "success", "message": "Vsi plugin-i so bili ponovno naloženi"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri ponovnem nalaganju plugin-ov: {str(e)}"
        )

@app.post("/reload-plugin/{plugin_name}")
async def reload_plugin(plugin_name: str):
    """Ponovno naloži specifičen plugin"""
    try:
        omni_plugins.reload_plugin(plugin_name)
        return {"status": "success", "message": f"Plugin '{plugin_name}' je bil ponovno naložen"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri ponovnem nalaganju plugin-a '{plugin_name}': {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Osnovni health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "service": "omni-core-api",
        "version": "1.0.0"
    }

@app.get("/health/plugins")
async def plugins_health_check():
    """Preveri zdravje vseh naloženih plugin-ov"""
    try:
        plugin_health = {}
        
        # Preveri OmniCore plugin-e
        if hasattr(omni_core, 'plugins'):
            for plugin_name, plugin in omni_core.plugins.items():
                try:
                    if hasattr(plugin, 'health_check'):
                        health_data = plugin.health_check()
                        plugin_health[plugin_name] = {
                            "status": health_data.get("status", "unknown"),
                            "timestamp": health_data.get("timestamp", datetime.datetime.now().timestamp()),
                            "source": "omni_core"
                        }
                    else:
                        plugin_health[plugin_name] = {
                            "status": "no_health_check",
                            "timestamp": datetime.datetime.now().timestamp(),
                            "source": "omni_core"
                        }
                except Exception as e:
                    plugin_health[plugin_name] = {
                        "status": "error",
                        "error": str(e),
                        "timestamp": datetime.datetime.now().timestamp(),
                        "source": "omni_core"
                    }
        
        # Preveri OmniCorePlugins
        if hasattr(omni_plugins, 'plugins'):
            for plugin_name, plugin in omni_plugins.plugins.items():
                try:
                    if hasattr(plugin, 'health_check'):
                        health_data = plugin.health_check()
                        plugin_health[f"{plugin_name}_core"] = {
                            "status": health_data.get("status", "unknown"),
                            "timestamp": health_data.get("timestamp", datetime.datetime.now().timestamp()),
                            "source": "omni_core_plugins"
                        }
                    else:
                        plugin_health[f"{plugin_name}_core"] = {
                            "status": "active",
                            "timestamp": datetime.datetime.now().timestamp(),
                            "source": "omni_core_plugins"
                        }
                except Exception as e:
                    plugin_health[f"{plugin_name}_core"] = {
                        "status": "error",
                        "error": str(e),
                        "timestamp": datetime.datetime.now().timestamp(),
                        "source": "omni_core_plugins"
                    }
        
        # Skupno stanje sistema
        all_healthy = all(
            plugin.get("status") in ["active", "healthy", "standby"] 
            for plugin in plugin_health.values()
        )
        
        return {
            "system_status": "healthy" if all_healthy else "degraded",
            "timestamp": datetime.datetime.now().isoformat(),
            "plugins": plugin_health,
            "total_plugins": len(plugin_health),
            "healthy_plugins": sum(1 for p in plugin_health.values() if p.get("status") in ["active", "healthy", "standby"]),
            "error_plugins": sum(1 for p in plugin_health.values() if p.get("status") == "error")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Napaka pri preverjanju zdravja plugin-ov: {str(e)}")

@app.get("/monitoring/status")
async def monitoring_status():
    """Podroben monitoring status sistema"""
    try:
        # Osnovne sistemske informacije
        system_info = {
            "uptime": datetime.datetime.now().timestamp() - start_time if 'start_time' in globals() else 0,
            "timestamp": datetime.datetime.now().isoformat(),
            "api_version": "1.0.0"
        }
        
        # Plugin statistike
        plugin_stats = {
            "omni_core_plugins": len(omni_core.plugins) if hasattr(omni_core, 'plugins') else 0,
            "omni_core_plugins_loaded": len(omni_plugins.plugins) if hasattr(omni_plugins, 'plugins') else 0,
            "hot_reload_enabled": getattr(omni_plugins, 'hot_reload_enabled', False)
        }
        
        # Preveri dostopnost modulov
        module_status = {}
        if hasattr(omni_core, 'plugins'):
            for name, plugin in omni_core.plugins.items():
                module_status[name] = {
                    "loaded": True,
                    "type": type(plugin).__name__,
                    "has_health_check": hasattr(plugin, 'health_check')
                }
        
        return {
            "system": system_info,
            "plugins": plugin_stats,
            "modules": module_status,
            "monitoring": {
                "enabled": True,
                "health_checks_available": True,
                "hot_reload_active": getattr(omni_plugins, 'hot_reload_enabled', False)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Napaka pri pridobivanju monitoring statusa: {str(e)}")

@app.get("/modules")
async def list_modules():
    """Seznam vseh razpoložljivih modulov"""
    return {
        "modules": list(omni_core.modules.keys()),
        "count": len(omni_core.modules),
        "routing_keywords": omni_core.routing_keywords
    }

@app.get("/status")
async def dashboard_status():
    """Vrne JSON s stanjem vseh modulov za dashboard"""
    try:
        # Pridobimo stanje vseh pluginov
        plugins_status = {}
        
        # Preverimo stanje osnovnih modulov
        available_modules = list(omni_core.modules.keys()) if hasattr(omni_core, 'modules') else []
        
        for module in available_modules:
            try:
                # Poskusimo pridobiti stanje modula
                plugins_status[module] = {
                    "status": "active",
                    "last_check": datetime.datetime.now().isoformat(),
                    "uptime": time.time() - start_time
                }
            except Exception as e:
                plugins_status[module] = {
                    "status": "error",
                    "last_check": datetime.datetime.now().isoformat(),
                    "error": str(e)
                }
        
        # Dodamo stanje pluginov
        if hasattr(omni_plugins, 'plugin_manager') and hasattr(omni_plugins.plugin_manager, 'plugins'):
            for plugin_name, plugin in omni_plugins.plugin_manager.plugins.items():
                try:
                    if hasattr(plugin, 'health_check'):
                        health = plugin.health_check()
                        plugins_status[plugin_name] = {
                            "status": health.get("status", "standby"),
                            "last_check": health.get("timestamp", datetime.datetime.now().isoformat()),
                            "details": health.get("details", {})
                        }
                    else:
                        plugins_status[plugin_name] = {
                            "status": "active",
                            "last_check": datetime.datetime.now().isoformat()
                        }
                except Exception as e:
                    plugins_status[plugin_name] = {
                        "status": "error",
                        "last_check": datetime.datetime.now().isoformat(),
                        "error": str(e)
                    }
        
        return plugins_status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Napaka pri pridobivanju statusa: {str(e)}")

@app.get("/route/{query:path}")
async def dashboard_route(query: str):
    """Obdelava zahteve preko OmniCore za dashboard testiranje"""
    try:
        # Ustvarimo QueryRequest objekt
        request = QueryRequest(
            query=query,
            user_id="dashboard",
            context={"source": "dashboard"}
        )
        
        # Obdelamo zahtevo preko obstoječe logike
        result = await process_query(request)
        
        return {
            "query": query,
            "response": result.dict(),
            "timestamp": datetime.datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "query": query,
            "response": {"error": str(e)},
            "timestamp": datetime.datetime.now().isoformat()
        }

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    """Servira interaktivni monitoring dashboard"""
    try:
        with open("omni_dashboard.html", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return """
        <html>
            <body>
                <h1>Dashboard ni na voljo</h1>
                <p>Datoteka omni_dashboard.html ni bila najdena.</p>
                <p><a href="/docs">Pojdi na API dokumentacijo</a></p>
            </body>
        </html>
        """

@app.get("/test", response_class=HTMLResponse)
async def test_interface():
    """Interaktivni test vmesnik"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Omni CORE Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .container { background: rgba(255,255,255,0.95); padding: 30px; border-radius: 15px; max-width: 800px; margin: 0 auto; }
            h1 { color: #333; text-align: center; }
            .form-group { margin: 20px 0; }
            label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
            input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
            button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
            button:hover { opacity: 0.9; }
            .result { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #667eea; }
            .examples { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .example { cursor: pointer; padding: 5px; margin: 2px 0; border-radius: 3px; }
            .example:hover { background: rgba(102, 126, 234, 0.1); }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧠 Omni CORE Test Vmesnik</h1>
            
            <div class="examples">
                <h3>💡 Primeri zahtev (kliknite za uporabo):</h3>
                <div class="example" onclick="setQuery('Dodaj naloga: pripraviti mesečno poročilo')">📋 Dodaj naloga: pripraviti mesečno poročilo</div>
                <div class="example" onclick="setQuery('Ustvari dogodek sestanek z ekipo ob 15h')">📅 Ustvari dogodek sestanek z ekipo ob 15h</div>
                <div class="example" onclick="setQuery('Analiziraj podatki iz prodaje za zadnji kvartal')">📊 Analiziraj podatki iz prodaje za zadnji kvartal</div>
                <div class="example" onclick="setQuery('Odpri dokument pogodba_2024.pdf')">📄 Odpri dokument pogodba_2024.pdf</div>
                <div class="example" onclick="setQuery('Poišči informacije o kvantnem računalništvu')">🔍 Poišči informacije o kvantnem računalništvu</div>
                <div class="example" onclick="setQuery('Preveri proračun za marketing kampanjo')">💰 Preveri proračun za marketing kampanjo</div>
            </div>
            
            <div class="form-group">
                <label for="query">Vaša zahteva:</label>
                <textarea id="query" rows="3" placeholder="Vnesite svojo zahtevo..."></textarea>
            </div>
            
            <div class="form-group">
                <button onclick="sendQuery()">🚀 Pošlji zahtevo</button>
                <button onclick="getStats()" style="margin-left: 10px;">📊 Statistike</button>
                <button onclick="getCapabilities()" style="margin-left: 10px;">🔧 Zmožnosti</button>
            </div>
            
            <div id="result" class="result" style="display: none;">
                <h3>Rezultat:</h3>
                <pre id="resultContent"></pre>
            </div>
        </div>
        
        <script>
            function setQuery(text) {
                document.getElementById('query').value = text;
            }
            
            async function sendQuery() {
                const query = document.getElementById('query').value;
                if (!query.trim()) {
                    alert('Prosimo vnesite zahtevo');
                    return;
                }
                
                try {
                    const response = await fetch('/query', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            query: query,
                            user_id: 'test_user',
                            context: {}
                        })
                    });
                    
                    const result = await response.json();
                    showResult(result);
                } catch (error) {
                    showResult({error: 'Napaka pri komunikaciji: ' + error.message});
                }
            }
            
            async function getStats() {
                try {
                    const response = await fetch('/stats');
                    const result = await response.json();
                    showResult(result);
                } catch (error) {
                    showResult({error: 'Napaka pri pridobivanju statistik: ' + error.message});
                }
            }
            
            async function getCapabilities() {
                try {
                    const response = await fetch('/capabilities');
                    const result = await response.json();
                    showResult(result);
                } catch (error) {
                    showResult({error: 'Napaka pri pridobivanju zmožnosti: ' + error.message});
                }
            }
            
            function showResult(data) {
                document.getElementById('result').style.display = 'block';
                document.getElementById('resultContent').textContent = JSON.stringify(data, null, 2);
            }
        </script>
    </body>
    </html>
    """

# Background task za logiranje
async def log_request(query: str, result: Dict[str, Any]):
    """Logiraj zahtevo v datoteko"""
    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "query": query,
        "result": result
    }
    
    # V produkciji bi to shranili v bazo ali log datoteko
    print(f"LOG: {json.dumps(log_entry, ensure_ascii=False)}")

# Novi endpointi za realne podatke
@app.post("/real-data/analyze")
async def analyze_real_data(request: QueryRequest):
    """Analiza realnih podatkov iz baz"""
    try:
        result = omni_real_data.route_query(request.query)
        
        response_data = {
            "module": "real_data_analyzer",
            "action": "analyze",
            "result": result,
            "data": {"query": request.query},
            "routing_info": {"source": "real_database"},
            "success": True,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        return QueryResponse(**response_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri analizi realnih podatkov: {str(e)}"
        )

@app.post("/business/query")
async def business_query(request: QueryRequest):
    """Poslovne analize preko specializiranih modulov"""
    try:
        result = omni_business.route_business_query(request.query)
        
        response_data = {
            "module": "business_modules",
            "action": "business_analysis",
            "result": result,
            "data": {"query": request.query},
            "routing_info": {"source": "business_modules"},
            "success": True,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        return QueryResponse(**response_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri poslovni analizi: {str(e)}"
        )

@app.get("/real-data/status")
async def get_real_data_status():
    """Status sistema za realne podatke"""
    try:
        status = omni_real_data.get_system_status()
        return status
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri pridobivanju statusa: {str(e)}"
        )

@app.get("/business/status")
async def get_business_status():
    """Status poslovnih modulov"""
    try:
        status = omni_business.get_business_status()
        return status
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri pridobivanju statusa: {str(e)}"
        )

@app.get("/real-data/kpi")
async def get_real_kpi():
    """Pridobi realne KPI podatke"""
    try:
        # Finančni KPI
        finance_kpi = omni_business.modules['finance'].analyze_financial_kpi()
        
        # Logistični KPI
        logistics_kpi = omni_business.modules['logistics'].optimize_delivery_routes()
        
        # Turistični KPI (če je na voljo)
        tourism_kpi = omni_business.modules['tourism'].analyze_bookings()
        
        kpi_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "finance": {
                "total_revenue": finance_kpi.get('total_revenue', 0),
                "profit": finance_kpi.get('profit', 0),
                "profit_margin": finance_kpi.get('profit_margin', 0)
            },
            "logistics": {
                "completion_rate": logistics_kpi.get('completion_rate', 0),
                "efficiency_score": logistics_kpi.get('efficiency_score', 0),
                "total_deliveries": logistics_kpi.get('total_deliveries', 0)
            },
            "tourism": {
                "total_bookings": tourism_kpi.get('total_bookings', 0),
                "total_revenue": tourism_kpi.get('total_revenue', 0),
                "occupancy_rate": tourism_kpi.get('occupancy_rate', 0)
            }
        }
        
        return kpi_data
        
    except Exception as e:
        return {
            "error": f"Napaka pri pridobivanju KPI: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
            "finance": {"total_revenue": 0, "profit": 0, "profit_margin": 0},
            "logistics": {"completion_rate": 0, "efficiency_score": 0, "total_deliveries": 0},
            "tourism": {"total_bookings": 0, "total_revenue": 0, "occupancy_rate": 0}
        }

if __name__ == "__main__":
    print("🚀 Zaganjam Omni CORE API strežnik...")
    print("📡 API bo dostopen na: http://localhost:8099")
    print("📚 Dokumentacija: http://localhost:8099/docs")
    print("🧪 Test vmesnik: http://localhost:8099/test")
    
    uvicorn.run(
        "omni_core_api:app",
        host="0.0.0.0",
        port=8099,
        reload=True,
        log_level="info"
    )