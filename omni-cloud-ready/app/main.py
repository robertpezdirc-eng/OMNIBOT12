#!/usr/bin/env python3
"""
🚀 OMNI-BRAIN-MAXI-ULTRA Cloud Ready Application
Fast Mode optimizirana aplikacija za produkcijsko uporabo

Avtor: OMNI Team
Verzija: 2.0.0
Licenca: MIT
"""

import os
import sys
import json
import asyncio
import logging
import signal
import time
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# FastAPI za hitro API
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

# Performance optimizacije
import aioredis
import asyncpg
from concurrent.futures import ThreadPoolExecutor
import multiprocessing as mp

# Monitoring in logging
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import structlog

# Varnost
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import bcrypt
import jwt

# Load balancing in caching
from cachetools import TTLCache
import pickle

class OmniBrainFastMode:
    """
    🧠 OMNI-BRAIN Fast Mode Engine
    Optimiziran za hitrost, stabilnost in polno funkcionalnost
    """
    
    def __init__(self):
        self.config = self.load_fast_config()
        self.app = FastAPI(
            title="OMNI-BRAIN-MAXI-ULTRA",
            description="Univerzalna AI platforma - Fast Mode",
            version="2.0.0",
            docs_url="/api/docs",
            redoc_url="/api/redoc"
        )
        
        # Performance metrics
        self.request_count = Counter('omni_requests_total', 'Total requests')
        self.request_duration = Histogram('omni_request_duration_seconds', 'Request duration')
        self.active_connections = Gauge('omni_active_connections', 'Active connections')
        
        # Cache sistemi
        self.memory_cache = TTLCache(maxsize=1000, ttl=300)
        self.redis_client = None
        self.db_pool = None
        
        # Thread pool za CPU-intensive naloge
        self.executor = ThreadPoolExecutor(max_workers=self.config['performance']['max_workers'])
        
        # Logging setup
        self.setup_logging()
        self.logger = structlog.get_logger()
        
        # Inicializacija
        self.setup_middleware()
        self.setup_routes()
        
    def load_fast_config(self) -> Dict[str, Any]:
        """Naloži Fast Mode konfiguracijo"""
        config_path = Path(__file__).parent.parent / "config" / "fast_mode.json"
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            print(f"✅ Fast Mode konfiguracija naložena: {config['mode']}")
            return config
        except Exception as e:
            print(f"⚠️ Napaka pri nalaganju konfiguracije: {e}")
            return self.get_default_config()
    
    def get_default_config(self) -> Dict[str, Any]:
        """Privzeta konfiguracija če datoteka ni dostopna"""
        return {
            "mode": "fast",
            "settings": {
                "optimize_processes": True,
                "cache_enabled": True,
                "async_processing": True,
                "parallel_tasks": True
            },
            "performance": {
                "max_workers": 4,
                "connection_pool_size": 10,
                "cache_size_mb": 256,
                "request_timeout": 30
            }
        }
    
    def setup_logging(self):
        """Nastavi strukturirano logiranje"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.UnicodeDecoder(),
                structlog.processors.JSONRenderer()
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )
    
    def setup_middleware(self):
        """Nastavi middleware za optimizacijo"""
        
        # CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Gzip kompresija
        self.app.add_middleware(GZipMiddleware, minimum_size=1000)
        
        # Trusted hosts
        self.app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["*"]  # V produkciji nastavi specifične domene
        )
        
        # Performance middleware
        @self.app.middleware("http")
        async def performance_middleware(request: Request, call_next):
            start_time = time.time()
            self.request_count.inc()
            self.active_connections.inc()
            
            try:
                response = await call_next(request)
                process_time = time.time() - start_time
                self.request_duration.observe(process_time)
                
                response.headers["X-Process-Time"] = str(process_time)
                response.headers["X-Powered-By"] = "OMNI-BRAIN-Fast-Mode"
                
                return response
            finally:
                self.active_connections.dec()
    
    def setup_routes(self):
        """Nastavi API endpoints"""
        
        @self.app.get("/")
        async def root():
            """Glavna stran"""
            return HTMLResponse(content=self.get_dashboard_html())
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint"""
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "mode": self.config["mode"],
                "version": "2.0.0",
                "uptime": time.time() - self.start_time if hasattr(self, 'start_time') else 0
            }
        
        @self.app.get("/metrics")
        async def metrics():
            """Prometheus metrics"""
            return generate_latest()
        
        @self.app.get("/api/status")
        async def api_status():
            """API status in konfiguracija"""
            return {
                "api_version": "2.0.0",
                "fast_mode": True,
                "config": self.config,
                "performance": {
                    "cache_enabled": self.config['settings']['cache_enabled'],
                    "async_processing": self.config['settings']['async_processing'],
                    "parallel_tasks": self.config['settings']['parallel_tasks']
                }
            }
        
        @self.app.post("/api/process")
        async def process_request(request: Dict[str, Any], background_tasks: BackgroundTasks):
            """Glavna procesna funkcija z Fast Mode optimizacijami"""
            
            try:
                # Cache check
                cache_key = self.generate_cache_key(request)
                cached_result = await self.get_from_cache(cache_key)
                
                if cached_result:
                    self.logger.info("Cache hit", cache_key=cache_key)
                    return {"result": cached_result, "cached": True}
                
                # Asinhrono procesiranje
                if self.config['settings']['async_processing']:
                    result = await self.process_async(request)
                else:
                    result = await self.process_sync(request)
                
                # Shrani v cache
                if self.config['settings']['cache_enabled']:
                    background_tasks.add_task(self.save_to_cache, cache_key, result)
                
                return {"result": result, "cached": False}
                
            except Exception as e:
                self.logger.error("Processing error", error=str(e))
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/ai/chat")
        async def ai_chat(message: str):
            """AI chat endpoint z optimizacijami"""
            
            try:
                # Hitro AI procesiranje
                response = await self.process_ai_message(message)
                
                return {
                    "response": response,
                    "timestamp": datetime.now().isoformat(),
                    "mode": "fast"
                }
                
            except Exception as e:
                self.logger.error("AI chat error", error=str(e))
                raise HTTPException(status_code=500, detail="AI processing failed")
        
        @self.app.get("/api/analytics")
        async def get_analytics():
            """Analitika in performance metrics"""
            
            return {
                "requests_total": self.request_count._value._value,
                "active_connections": self.active_connections._value._value,
                "cache_size": len(self.memory_cache),
                "config": self.config,
                "timestamp": datetime.now().isoformat()
            }
    
    async def process_async(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Asinhrono procesiranje zahtev"""
        
        # Simulacija AI procesiranja
        await asyncio.sleep(0.1)  # Simulacija
        
        return {
            "processed": True,
            "data": request,
            "timestamp": datetime.now().isoformat(),
            "method": "async"
        }
    
    async def process_sync(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Sinhrono procesiranje zahtev"""
        
        # CPU-intensive naloge v thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            self.executor, 
            self._cpu_intensive_task, 
            request
        )
        
        return result
    
    def _cpu_intensive_task(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """CPU-intensive naloga v ločeni niti"""
        
        # Simulacija težke naloge
        time.sleep(0.05)
        
        return {
            "processed": True,
            "data": request,
            "timestamp": datetime.now().isoformat(),
            "method": "sync_threaded"
        }
    
    async def process_ai_message(self, message: str) -> str:
        """Procesiranje AI sporočil z optimizacijami"""
        
        # Cache check za AI odgovore
        cache_key = f"ai_chat:{hash(message)}"
        cached_response = await self.get_from_cache(cache_key)
        
        if cached_response:
            return cached_response
        
        # AI procesiranje (simulacija)
        await asyncio.sleep(0.2)  # Simulacija AI procesiranja
        
        response = f"OMNI-BRAIN Fast Mode odgovor na: '{message}' - Optimizirano za hitrost in kvaliteto!"
        
        # Shrani v cache
        await self.save_to_cache(cache_key, response)
        
        return response
    
    def generate_cache_key(self, data: Any) -> str:
        """Generiraj cache ključ"""
        return f"omni_cache:{hash(str(data))}"
    
    async def get_from_cache(self, key: str) -> Optional[Any]:
        """Pridobi iz cache"""
        
        # Memory cache
        if key in self.memory_cache:
            return self.memory_cache[key]
        
        # Redis cache (če je na voljo)
        if self.redis_client:
            try:
                cached = await self.redis_client.get(key)
                if cached:
                    return pickle.loads(cached)
            except Exception as e:
                self.logger.warning("Redis cache error", error=str(e))
        
        return None
    
    async def save_to_cache(self, key: str, value: Any):
        """Shrani v cache"""
        
        # Memory cache
        self.memory_cache[key] = value
        
        # Redis cache (če je na voljo)
        if self.redis_client:
            try:
                await self.redis_client.setex(
                    key, 
                    self.config.get('caching', {}).get('api_cache_ttl', 300),
                    pickle.dumps(value)
                )
            except Exception as e:
                self.logger.warning("Redis cache save error", error=str(e))
    
    def get_dashboard_html(self) -> str:
        """Generiraj dashboard HTML"""
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>OMNI-BRAIN Fast Mode Dashboard</title>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
                .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .status {{ display: flex; justify-content: space-around; margin: 20px 0; }}
                .status-item {{ text-align: center; padding: 20px; background: #e8f5e8; border-radius: 8px; }}
                .fast-mode {{ color: #28a745; font-weight: bold; }}
                .api-links {{ margin: 20px 0; }}
                .api-links a {{ display: inline-block; margin: 5px; padding: 10px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }}
                .config {{ background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚀 OMNI-BRAIN-MAXI-ULTRA</h1>
                    <h2 class="fast-mode">Fast Mode Aktiviran ⚡</h2>
                    <p>Univerzalna AI platforma - Optimizirana za produkcijo</p>
                </div>
                
                <div class="status">
                    <div class="status-item">
                        <h3>Status</h3>
                        <p class="fast-mode">ONLINE</p>
                    </div>
                    <div class="status-item">
                        <h3>Način</h3>
                        <p>{self.config['mode'].upper()}</p>
                    </div>
                    <div class="status-item">
                        <h3>Verzija</h3>
                        <p>2.0.0</p>
                    </div>
                    <div class="status-item">
                        <h3>Optimizacije</h3>
                        <p>✅ Aktivne</p>
                    </div>
                </div>
                
                <div class="api-links">
                    <h3>API Endpoints:</h3>
                    <a href="/health">Health Check</a>
                    <a href="/api/status">API Status</a>
                    <a href="/api/analytics">Analytics</a>
                    <a href="/api/docs">API Dokumentacija</a>
                    <a href="/metrics">Metrics</a>
                </div>
                
                <div class="config">
                    <h3>Fast Mode Konfiguracija:</h3>
                    <ul>
                        <li>✅ Optimizirani procesi: {self.config['settings']['optimize_processes']}</li>
                        <li>✅ Cache omogočen: {self.config['settings']['cache_enabled']}</li>
                        <li>✅ Asinhrono procesiranje: {self.config['settings']['async_processing']}</li>
                        <li>✅ Paralelne naloge: {self.config['settings']['parallel_tasks']}</li>
                        <li>✅ Brez izgube kvalitete: {self.config['guarantees']['no_loss_of_quality']}</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin-top: 30px; color: #666;">
                    <p>OMNI-BRAIN Fast Mode - Pripravljen za produkcijo 🌟</p>
                    <p>Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    async def startup(self):
        """Startup procedura"""
        self.start_time = time.time()
        self.logger.info("OMNI-BRAIN Fast Mode starting up...")
        
        # Inicializiraj Redis (če je na voljo)
        try:
            self.redis_client = await aioredis.from_url("redis://localhost:6379")
            self.logger.info("Redis connected")
        except Exception as e:
            self.logger.warning("Redis not available", error=str(e))
        
        self.logger.info("OMNI-BRAIN Fast Mode ready!", config=self.config['mode'])
    
    async def shutdown(self):
        """Shutdown procedura"""
        self.logger.info("OMNI-BRAIN Fast Mode shutting down...")
        
        if self.redis_client:
            await self.redis_client.close()
        
        self.executor.shutdown(wait=True)
        self.logger.info("OMNI-BRAIN Fast Mode stopped")

# Globalna instanca
omni_brain = OmniBrainFastMode()

# Event handlers
@omni_brain.app.on_event("startup")
async def startup_event():
    await omni_brain.startup()

@omni_brain.app.on_event("shutdown")
async def shutdown_event():
    await omni_brain.shutdown()

# Signal handlers za graceful shutdown
def signal_handler(signum, frame):
    print(f"\\n🛑 Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def main():
    """Glavna funkcija"""
    
    print("🚀 Zaganjam OMNI-BRAIN-MAXI-ULTRA Fast Mode...")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("⚡ Optimizirano za hitrost, stabilnost in polno funkcionalnost")
    
    # Uvicorn konfiguracija za produkcijo
    config = uvicorn.Config(
        app=omni_brain.app,
        host="0.0.0.0",
        port=8080,
        workers=1,  # Za async aplikacije je 1 worker optimalen
        loop="uvloop",  # Hitrejši event loop
        http="httptools",  # Hitrejši HTTP parser
        access_log=True,
        log_level="info"
    )
    
    server = uvicorn.Server(config)
    
    try:
        server.run()
    except KeyboardInterrupt:
        print("\\n🛑 Graceful shutdown...")
    except Exception as e:
        print(f"❌ Napaka: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()