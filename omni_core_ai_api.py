#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMNI CORE AI API - FastAPI strežnik z AI routing
Kombinira REST API vmesnik z naprednim AI-usmerjenim routanjem
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import uvicorn
import json
import datetime
import os
from omni_core_ai import OmniCoreAI

# Pydantic modeli za API
class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = "anonymous"
    context: Optional[Dict[str, Any]] = {}
    force_ai: Optional[bool] = None  # Prisilno uporabi AI ali fallback

class AIQueryResponse(BaseModel):
    module: str
    action: str
    result: str
    confidence: float
    reasoning: str
    ai_used: bool
    data: Optional[Dict[str, Any]] = {}
    success: bool
    timestamp: str

class AISystemStats(BaseModel):
    total_requests: int
    ai_requests: int
    fallback_requests: int
    module_usage: Dict[str, int]
    uptime_seconds: float
    ai_enabled: bool
    available_modules: List[str]
    system_status: str

class AIConfigRequest(BaseModel):
    openai_api_key: Optional[str] = None
    ai_enabled: Optional[bool] = None
    confidence_threshold: Optional[float] = None

# Inicializacija FastAPI aplikacije
app = FastAPI(
    title="Omni CORE AI API",
    description="Napredni AI-usmerjen integracijski sloj z OpenAI routing",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globalna instanca Omni CORE AI
omni_core_ai = OmniCoreAI()

@app.get("/", response_class=HTMLResponse)
async def root():
    """Glavna stran z dokumentacijo AI API-ja"""
    ai_status = "🤖 OMOGOČEN" if omni_core_ai.ai_enabled else "❌ ONEMOGOČEN"
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Omni CORE AI API</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }}
            .container {{ background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }}
            h1 {{ color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }}
            .endpoint {{ background: rgba(255,255,255,0.2); padding: 15px; margin: 10px 0; border-radius: 10px; }}
            .method {{ font-weight: bold; color: #4facfe; }}
            .status {{ background: rgba(0,255,0,0.2); padding: 10px; border-radius: 5px; margin: 20px 0; }}
            a {{ color: #4facfe; text-decoration: none; }}
            a:hover {{ text-decoration: underline; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧠 Omni CORE AI API</h1>
            <p>Napredni AI-usmerjen integracijski sloj z OpenAI routing</p>
            
            <div class="status">
                <strong>🤖 AI Status:</strong> {ai_status}<br>
                <strong>📊 Moduli:</strong> {len(omni_core_ai.modules)}<br>
                <strong>🔄 Fallback:</strong> Omogočen
            </div>
            
            <h2>📡 AI Endpoints:</h2>
            
            <div class="endpoint">
                <span class="method">POST</span> <strong>/ai/query</strong> - AI-usmerjeno routanje
                <br>Primer: {{"query": "Analiziraj prodajne podatke za Q4", "force_ai": true}}
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/ai/stats</strong> - AI statistike in performance
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/ai/capabilities</strong> - Zmožnosti AI modulov
            </div>
            
            <div class="endpoint">
                <span class="method">POST</span> <strong>/ai/config</strong> - Nastavi AI konfiguraciju
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/ai/health</strong> - AI zdravstveno preverjanje
            </div>
            
            <h2>📚 Dokumentacija:</h2>
            <p><a href="/docs">Swagger UI dokumentacija</a></p>
            <p><a href="/redoc">ReDoc dokumentacija</a></p>
            
            <h2>🧪 Test vmesniki:</h2>
            <p><a href="/ai/test">AI Test vmesnik</a></p>
            <p><a href="/ai/demo">AI Demo s primeri</a></p>
        </div>
    </body>
    </html>
    """

@app.post("/ai/query", response_model=AIQueryResponse)
async def ai_query(request: QueryRequest):
    """
    AI-usmerjeno routanje uporabniških zahtev
    """
    try:
        # Če je force_ai nastavljen, začasno spremeni AI status
        original_ai_enabled = omni_core_ai.ai_enabled
        if request.force_ai is not None:
            omni_core_ai.ai_enabled = request.force_ai and omni_core_ai.openai_api_key
        
        # Obdelaj zahtevo preko AI CORE
        result = omni_core_ai.route(request.query)
        
        # Obnovi originalni AI status
        omni_core_ai.ai_enabled = original_ai_enabled
        
        # Dodaj uporabniški kontekst
        if request.context:
            result["user_context"] = request.context
        
        return AIQueryResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri AI obdelavi: {str(e)}"
        )

@app.get("/ai/stats", response_model=AISystemStats)
async def get_ai_stats():
    """AI statistike in performance metrike"""
    try:
        stats = omni_core_ai.get_stats()
        return AISystemStats(**stats)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri pridobivanju AI statistik: {str(e)}"
        )

@app.get("/ai/capabilities")
async def get_ai_capabilities():
    """Zmožnosti AI modulov z detajli"""
    try:
        capabilities = omni_core_ai.list_capabilities()
        
        # Dodaj AI-specifične informacije
        ai_info = {
            "ai_enabled": omni_core_ai.ai_enabled,
            "fallback_available": True,
            "supported_languages": ["slovenščina", "angleščina"],
            "confidence_scoring": True,
            "reasoning_provided": True
        }
        
        return {
            "modules": capabilities,
            "ai_features": ai_info,
            "total_modules": len(capabilities)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri pridobivanju zmožnosti: {str(e)}"
        )

@app.post("/ai/config")
async def update_ai_config(config: AIConfigRequest):
    """Posodobi AI konfiguraciju"""
    try:
        updated = {}
        
        if config.openai_api_key:
            omni_core_ai.openai_api_key = config.openai_api_key
            omni_core_ai.ai_enabled = True
            updated["openai_api_key"] = "***nastavljeno***"
        
        if config.ai_enabled is not None:
            omni_core_ai.ai_enabled = config.ai_enabled and omni_core_ai.openai_api_key
            updated["ai_enabled"] = omni_core_ai.ai_enabled
        
        return {
            "message": "Konfiguracija posodobljena",
            "updated": updated,
            "current_status": {
                "ai_enabled": omni_core_ai.ai_enabled,
                "has_api_key": bool(omni_core_ai.openai_api_key)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri posodabljanju konfiguracije: {str(e)}"
        )

@app.get("/ai/health")
async def ai_health_check():
    """AI zdravstveno preverjanje"""
    try:
        # Test osnovne funkcionalnosti
        test_result = omni_core_ai.route("test zahteva")
        
        return {
            "status": "healthy",
            "ai_enabled": omni_core_ai.ai_enabled,
            "fallback_working": test_result["success"],
            "modules_count": len(omni_core_ai.modules),
            "uptime": (datetime.datetime.now() - omni_core_ai.stats["start_time"]).total_seconds(),
            "timestamp": datetime.datetime.now().isoformat(),
            "version": "2.0.0"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.datetime.now().isoformat()
        }

@app.get("/ai/test", response_class=HTMLResponse)
async def ai_test_interface():
    """Interaktivni AI test vmesnik"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Omni CORE AI Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .container { background: rgba(255,255,255,0.95); padding: 30px; border-radius: 15px; max-width: 900px; margin: 0 auto; }
            h1 { color: #333; text-align: center; }
            .form-group { margin: 20px 0; }
            label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
            input, textarea, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
            button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px; }
            button:hover { opacity: 0.9; }
            .result { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #667eea; }
            .examples { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .example { cursor: pointer; padding: 8px; margin: 5px 0; border-radius: 3px; background: rgba(102, 126, 234, 0.1); }
            .example:hover { background: rgba(102, 126, 234, 0.2); }
            .ai-info { background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0; }
            .confidence { font-weight: bold; }
            .high { color: #28a745; }
            .medium { color: #ffc107; }
            .low { color: #dc3545; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Omni CORE AI Test Vmesnik</h1>
            
            <div class="ai-info">
                <strong>🧠 AI Status:</strong> <span id="aiStatus">Preverjam...</span><br>
                <strong>📊 Confidence scoring:</strong> Omogočen<br>
                <strong>🔄 Fallback:</strong> Avtomatski
            </div>
            
            <div class="examples">
                <h3>💡 AI Test primeri (kliknite za uporabo):</h3>
                <div class="example" onclick="setQuery('Potrebujem analizo prodajnih trendov za zadnje tri mesece z grafičnim prikazom')">📊 Kompleksna analiza prodajnih trendov</div>
                <div class="example" onclick="setQuery('Organiziraj virtualni sestanek z mednarodno ekipo naslednji torek ob 14h CET')">🌍 Mednarodni sestanek z časovnimi conami</div>
                <div class="example" onclick="setQuery('Pripravi finančno poročilo o ROI za marketing kampanje in predlagaj optimizacije')">💰 Finančna analiza z priporočili</div>
                <div class="example" onclick="setQuery('Poišči najnovejše raziskave o kvantnem računalništvu in umetni inteligenci')">🔬 Raziskovalna naloga</div>
                <div class="example" onclick="setQuery('Ustvari nalogo za pripravo prezentacije o trajnostnem razvoju do petka')">📋 Naloga z rokom</div>
                <div class="example" onclick="setQuery('Kako pripraviti kavo?')">☕ Nejasna zahteva (test fallback)</div>
            </div>
            
            <div class="form-group">
                <label for="query">Vaša AI zahteva:</label>
                <textarea id="query" rows="3" placeholder="Vnesite kompleksno zahtevo za AI analizo..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="forceMode">AI način:</label>
                <select id="forceMode">
                    <option value="">Avtomatski (AI + fallback)</option>
                    <option value="true">Prisilno AI</option>
                    <option value="false">Samo fallback</option>
                </select>
            </div>
            
            <div class="form-group">
                <button onclick="sendAIQuery()">🚀 Pošlji AI zahtevo</button>
                <button onclick="getAIStats()">📊 AI Statistike</button>
                <button onclick="getAICapabilities()">🔧 AI Zmožnosti</button>
                <button onclick="checkAIHealth()">❤️ AI Zdravje</button>
            </div>
            
            <div id="result" class="result" style="display: none;">
                <h3>AI Rezultat:</h3>
                <pre id="resultContent"></pre>
            </div>
        </div>
        
        <script>
            // Preveri AI status ob nalaganju
            window.onload = function() {
                checkAIHealth();
            };
            
            function setQuery(text) {
                document.getElementById('query').value = text;
            }
            
            async function sendAIQuery() {
                const query = document.getElementById('query').value;
                const forceMode = document.getElementById('forceMode').value;
                
                if (!query.trim()) {
                    alert('Prosimo vnesite AI zahtevo');
                    return;
                }
                
                const requestBody = {
                    query: query,
                    user_id: 'ai_test_user',
                    context: { test_mode: true }
                };
                
                if (forceMode) {
                    requestBody.force_ai = forceMode === 'true';
                }
                
                try {
                    const response = await fetch('/ai/query', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });
                    
                    const result = await response.json();
                    showAIResult(result);
                } catch (error) {
                    showAIResult({error: 'AI komunikacijska napaka: ' + error.message});
                }
            }
            
            async function getAIStats() {
                try {
                    const response = await fetch('/ai/stats');
                    const result = await response.json();
                    showAIResult(result);
                } catch (error) {
                    showAIResult({error: 'Napaka pri AI statistikah: ' + error.message});
                }
            }
            
            async function getAICapabilities() {
                try {
                    const response = await fetch('/ai/capabilities');
                    const result = await response.json();
                    showAIResult(result);
                } catch (error) {
                    showAIResult({error: 'Napaka pri AI zmožnostih: ' + error.message});
                }
            }
            
            async function checkAIHealth() {
                try {
                    const response = await fetch('/ai/health');
                    const result = await response.json();
                    
                    const statusElement = document.getElementById('aiStatus');
                    if (result.ai_enabled) {
                        statusElement.innerHTML = '🤖 <span style="color: green;">OMOGOČEN</span>';
                    } else {
                        statusElement.innerHTML = '🔄 <span style="color: orange;">FALLBACK</span>';
                    }
                    
                    showAIResult(result);
                } catch (error) {
                    document.getElementById('aiStatus').innerHTML = '❌ <span style="color: red;">NAPAKA</span>';
                    showAIResult({error: 'AI zdravstvena napaka: ' + error.message});
                }
            }
            
            function showAIResult(data) {
                document.getElementById('result').style.display = 'block';
                
                // Posebno formatiranje za AI rezultate
                if (data.confidence !== undefined) {
                    let confidenceClass = 'low';
                    if (data.confidence > 0.7) confidenceClass = 'high';
                    else if (data.confidence > 0.4) confidenceClass = 'medium';
                    
                    const formatted = {
                        '🎯 Modul': data.module,
                        '🤖 AI uporabljen': data.ai_used ? '✅ DA' : '❌ NE',
                        '📊 Zaupanje': `${(data.confidence * 100).toFixed(1)}%`,
                        '💭 Razlog': data.reasoning,
                        '📤 Rezultat': data.result,
                        '⏰ Čas': data.timestamp
                    };
                    
                    document.getElementById('resultContent').innerHTML = 
                        Object.entries(formatted).map(([k,v]) => `${k}: ${v}`).join('\\n');
                } else {
                    document.getElementById('resultContent').textContent = JSON.stringify(data, null, 2);
                }
            }
        </script>
    </body>
    </html>
    """

@app.get("/ai/demo", response_class=HTMLResponse)
async def ai_demo():
    """AI Demo s primeri različnih scenarijev"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Omni CORE AI Demo</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .container { background: rgba(255,255,255,0.95); padding: 30px; border-radius: 15px; max-width: 1000px; margin: 0 auto; }
            .demo-section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
            .demo-button { background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
            .demo-result { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; font-family: monospace; }
            h1 { color: #333; text-align: center; }
            h2 { color: #667eea; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎭 Omni CORE AI Demo</h1>
            <p>Demonstracija AI routing zmožnosti z različnimi scenariji</p>
            
            <div class="demo-section">
                <h2>📊 Poslovni scenariji</h2>
                <button class="demo-button" onclick="runDemo('Pripravi analizo prodajnih rezultatov za Q4 2024 z grafičnim prikazom trendov')">Prodajna analiza</button>
                <button class="demo-button" onclick="runDemo('Organiziraj sestanek z vodstvom podjetja za predstavitev novih produktov')">Poslovni sestanek</button>
                <button class="demo-button" onclick="runDemo('Izračunaj ROI za digitalno marketing kampanjo in predlagaj optimizacije')">Marketing ROI</button>
            </div>
            
            <div class="demo-section">
                <h2>🔬 Raziskovalni scenariji</h2>
                <button class="demo-button" onclick="runDemo('Poišči najnovejše raziskave o umetni inteligenci v zdravstvu')">AI v zdravstvu</button>
                <button class="demo-button" onclick="runDemo('Analiziraj trende v kvantnem računalništvu za naslednje desetletje')">Kvantno računalništvo</button>
                <button class="demo-button" onclick="runDemo('Pripravi pregled trajnostnih tehnologij za energetski sektor')">Zelene tehnologije</button>
            </div>
            
            <div class="demo-section">
                <h2>📋 Projektni scenariji</h2>
                <button class="demo-button" onclick="runDemo('Ustvari projekt za razvoj mobilne aplikacije z rokom 6 mesecev')">Mobilna aplikacija</button>
                <button class="demo-button" onclick="runDemo('Dodaj nalogo: implementacija AI chatbota do konca meseca')">AI chatbot</button>
                <button class="demo-button" onclick="runDemo('Načrtuj lansiranje novega produkta z marketinško strategijo')">Lansiranje produkta</button>
            </div>
            
            <div class="demo-section">
                <h2>🤔 Dvoumni scenariji</h2>
                <button class="demo-button" onclick="runDemo('Kako narediti dobro kavo?')">Nejasna zahteva</button>
                <button class="demo-button" onclick="runDemo('Potrebujem pomoč')">Splošna zahteva</button>
                <button class="demo-button" onclick="runDemo('Optimiziraj')">Nepopolna zahteva</button>
            </div>
            
            <div id="demoResults"></div>
        </div>
        
        <script>
            async function runDemo(query) {
                const resultsDiv = document.getElementById('demoResults');
                
                // Dodaj loading indicator
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'demo-result';
                loadingDiv.innerHTML = `<strong>🔄 Obdelavam:</strong> "${query}"`;
                resultsDiv.appendChild(loadingDiv);
                
                try {
                    const response = await fetch('/ai/query', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: query,
                            user_id: 'demo_user',
                            context: { demo_mode: true }
                        })
                    });
                    
                    const result = await response.json();
                    
                    // Odstrani loading in dodaj rezultat
                    resultsDiv.removeChild(loadingDiv);
                    
                    const resultDiv = document.createElement('div');
                    resultDiv.className = 'demo-result';
                    
                    const aiIcon = result.ai_used ? '🤖' : '🔄';
                    const confidenceColor = result.confidence > 0.7 ? 'green' : result.confidence > 0.4 ? 'orange' : 'red';
                    
                    resultDiv.innerHTML = `
                        <strong>📝 Zahteva:</strong> ${query}<br>
                        <strong>🎯 Modul:</strong> ${result.module}<br>
                        <strong>${aiIcon} AI:</strong> ${result.ai_used ? 'DA' : 'NE'}<br>
                        <strong>📊 Zaupanje:</strong> <span style="color: ${confidenceColor}">${(result.confidence * 100).toFixed(1)}%</span><br>
                        <strong>💭 Razlog:</strong> ${result.reasoning}<br>
                        <strong>📤 Rezultat:</strong> ${result.result}
                    `;
                    
                    resultsDiv.appendChild(resultDiv);
                    
                    // Scroll to result
                    resultDiv.scrollIntoView({ behavior: 'smooth' });
                    
                } catch (error) {
                    resultsDiv.removeChild(loadingDiv);
                    
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'demo-result';
                    errorDiv.style.borderLeft = '4px solid red';
                    errorDiv.innerHTML = `<strong>❌ Napaka:</strong> ${error.message}`;
                    resultsDiv.appendChild(errorDiv);
                }
            }
        </script>
    </body>
    </html>
    """

# Background task za AI logiranje
async def log_ai_request(query: str, result: Dict[str, Any]):
    """Logiraj AI zahtevo z dodatnimi metrikami"""
    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "query": query,
        "ai_used": result.get("ai_used", False),
        "confidence": result.get("confidence", 0.0),
        "module": result.get("module", "unknown"),
        "success": result.get("success", False)
    }
    
    # V produkciji bi to shranili v AI analytics bazo
    print(f"AI_LOG: {json.dumps(log_entry, ensure_ascii=False)}")

if __name__ == "__main__":
    print("🚀 Zaganjam Omni CORE AI API strežnik...")
    print("🤖 AI routing omogočen!")
    print("📡 API bo dostopen na: http://localhost:8100")
    print("📚 Dokumentacija: http://localhost:8100/docs")
    print("🧪 AI Test: http://localhost:8100/ai/test")
    print("🎭 AI Demo: http://localhost:8100/ai/demo")
    
    uvicorn.run(
        "omni_core_ai_api:app",
        host="0.0.0.0",
        port=8100,
        reload=True,
        log_level="info"
    )