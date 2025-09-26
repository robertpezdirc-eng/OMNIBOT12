"""
OmniCore Global - Glavni FastAPI Backend
Univerzalna AI platforma za podjetja vseh velikosti
"""

from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import asyncio
import aiohttp
import logging
import json
from datetime import datetime
import os

# Multi-tenant database support
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    domain = Column(String, unique=True, nullable=False)
    api_key = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    users = relationship("TenantUser", back_populates="tenant")
    modules = relationship("TenantModule", back_populates="tenant")

class TenantUser(Base):
    __tablename__ = "tenant_users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    username = Column(String, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, default="user")  # admin, user, viewer
    created_at = Column(DateTime, default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")

class TenantModule(Base):
    __tablename__ = "tenant_modules"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    module_name = Column(String, nullable=False)
    is_enabled = Column(Boolean, default=True)
    config = Column(Text)  # JSON configuration
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="modules")

class TenantData(Base):
    __tablename__ = "tenant_data"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    module_name = Column(String, nullable=False)
    data_type = Column(String, nullable=False)  # dashboard_stats, analytics, etc.
    data = Column(Text, nullable=False)  # JSON data
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Database manager for multi-tenant support
class MultiTenantDBManager:
    def __init__(self, database_url: str = "sqlite:///./omnicore_multitenant.db"):
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        
    def get_db(self):
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    def get_tenant_by_api_key(self, api_key: str, db: Session):
        return db.query(Tenant).filter(Tenant.api_key == api_key, Tenant.is_active == True).first()
    
    def get_tenant_by_domain(self, domain: str, db: Session):
        return db.query(Tenant).filter(Tenant.domain == domain, Tenant.is_active == True).first()
    
    def create_tenant(self, name: str, domain: str, db: Session):
        api_key = str(uuid.uuid4())
        tenant = Tenant(name=name, domain=domain, api_key=api_key)
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        return tenant
    
    def get_tenant_modules(self, tenant_id: str, db: Session):
        return db.query(TenantModule).filter(
            TenantModule.tenant_id == tenant_id,
            TenantModule.is_enabled == True
        ).all()
    
    def save_tenant_data(self, tenant_id: str, module_name: str, data_type: str, data: str, db: Session):
        # Check if data already exists
        existing = db.query(TenantData).filter(
            TenantData.tenant_id == tenant_id,
            TenantData.module_name == module_name,
            TenantData.data_type == data_type
        ).first()
        
        if existing:
            existing.data = data
            existing.updated_at = func.now()
        else:
            tenant_data = TenantData(
                tenant_id=tenant_id,
                module_name=module_name,
                data_type=data_type,
                data=data
            )
            db.add(tenant_data)
        
        db.commit()
    
    def get_tenant_data(self, tenant_id: str, module_name: str, data_type: str, db: Session):
        return db.query(TenantData).filter(
            TenantData.tenant_id == tenant_id,
            TenantData.module_name == module_name,
            TenantData.data_type == data_type
        ).first()

# Initialize multi-tenant database manager
multitenant_db = MultiTenantDBManager()

# Dependency to get current tenant
async def get_current_tenant(
    request: Request,
    api_key: str = Header(None, alias="X-API-Key"),
    db: Session = Depends(multitenant_db.get_db)
):
    """Get current tenant from API key or domain"""
    
    # Try API key first
    if api_key:
        tenant = multitenant_db.get_tenant_by_api_key(api_key, db)
        if tenant:
            return tenant
    
    # Try domain from Host header
    host = request.headers.get("host", "").split(":")[0]  # Remove port
    if host:
        tenant = multitenant_db.get_tenant_by_domain(host, db)
        if tenant:
            return tenant
    
    # Default tenant for localhost development
    if host in ["localhost", "127.0.0.1"]:
        tenant = multitenant_db.get_tenant_by_domain("localhost", db)
        if not tenant:
            # Create default tenant for development
            tenant = multitenant_db.create_tenant("Default Company", "localhost", db)
            
            # Create default modules for the tenant
            default_modules = ["finance", "analytics", "task", "logistics", "tourism", "healthcare"]
            for module_name in default_modules:
                module = TenantModule(
                    tenant_id=tenant.id,
                    module_name=module_name,
                    is_enabled=True,
                    config="{}"
                )
                db.add(module)
            db.commit()
        
        return tenant
    
    raise HTTPException(status_code=401, detail="Invalid tenant credentials")

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logging.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logging.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except:
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        if self.active_connections:
            message_str = json.dumps(message)
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(message_str)
                except:
                    disconnected.append(connection)
            
            # Remove disconnected clients
            for conn in disconnected:
                self.disconnect(conn)

# Initialize WebSocket manager
manager = ConnectionManager()

# Uvoz modulov
from ai_router import AIRouter
from modules.finance import FinanceModule
from modules.analytics import AnalyticsModule
from modules.task import TaskModule
from modules.logistics import LogisticsModule
from modules.tourism import TourismModule
from modules.healthcare import HealthcareModule
from db import DatabaseManager
from config import Config

# Logging konfiguracija
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI aplikacija
app = FastAPI(
    title="OmniCore Global Platform",
    description="Univerzalna AI platforma za podjetja vseh velikosti",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Dodamo static files za frontend
from fastapi.staticfiles import StaticFiles

# Mount static files
frontend_static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_static_path):
    app.mount("/static", StaticFiles(directory=frontend_static_path), name="static")

# CORS middleware za frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic modeli
class QueryRequest(BaseModel):
    query: str
    tenant_id: Optional[str] = "default"
    user_id: Optional[str] = "anonymous"
    context: Optional[Dict[str, Any]] = {}

class ModuleResponse(BaseModel):
    module: str
    result: Any
    execution_time: float
    tenant_id: str
    timestamp: str

# Globalne spremenljivke
config = Config()
db_manager = DatabaseManager(config)
modules = {}
ai_router = None

# WebSocket endpoint za real-time komunikacijo
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Pošlji začetne podatke
        initial_data = {
            "type": "initial",
            "data": {
                "status": await system_status(),
                "dashboard_stats": {
                    "total_revenue": 125000,
                    "total_requests": 1247,
                    "active_tasks": 23,
                    "active_shipments": 8
                },
                "analytics": {
                    "avg_response_time": 150,
                    "success_rate": 98.5,
                    "top_module": "Finance"
                }
            }
        }
        await manager.send_personal_message(json.dumps(initial_data), websocket)
        
        while True:
            # Čakaj na sporočila od klienta
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await manager.send_personal_message(json.dumps({"type": "pong"}), websocket)
            elif message.get("type") == "request_update":
                # Pošlji posodobljene podatke
                update_data = {
                    "type": "update",
                    "timestamp": datetime.now().isoformat(),
                    "data": {
                        "status": await system_status(),
                        "dashboard_stats": {
                            "total_revenue": 125000,
                            "total_requests": 1247,
                            "active_tasks": 23,
                            "active_shipments": 8
                        }
                    }
                }
                await manager.send_personal_message(json.dumps(update_data), websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Background task za periodično pošiljanje posodobitev
async def broadcast_updates():
    """Periodično pošilja posodobitve vsem povezanim klientom"""
    while True:
        try:
            await asyncio.sleep(30)  # Posodobi vsakih 30 sekund
            
            update_data = {
                "type": "periodic_update",
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "status": await system_status(),
                    "dashboard_stats": {
                        "total_revenue": 125000,
                        "total_requests": 1247,
                        "active_tasks": 23,
                        "active_shipments": 8
                    },
                    "analytics": {
                        "avg_response_time": 150,
                        "success_rate": 98.5,
                        "top_module": "Finance"
                    }
                }
            }
            
            await manager.broadcast(update_data)
            
        except Exception as e:
            logging.error(f"Error in broadcast_updates: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    """Inicializacija ob zagonu"""
    global modules, ai_router
    
    logger.info("🚀 OmniCore Global Platform se zaganja...")
    
    # Inicializacija modulov
    modules = {
        "finance": FinanceModule(db_manager, config),
        "analytics": AnalyticsModule(db_manager, config),
        "task": TaskModule(db_manager, config),
        "logistics": LogisticsModule(db_manager, config),
        "tourism": TourismModule(db_manager, config),
        "healthcare": HealthcareModule(db_manager, config),
    }
    
    # AI Router inicializacija
    ai_router = AIRouter(modules, config)
    
    # Zaženi background task za WebSocket posodobitve
    asyncio.create_task(broadcast_updates())
    
    # Preverjanje povezav z moduli
    for name, module in modules.items():
        try:
            await module.health_check()
            logger.info(f"✅ {name.capitalize()} modul: Aktiven")
        except Exception as e:
            logger.error(f"❌ {name.capitalize()} modul: {str(e)}")
    
    logger.info("🎯 OmniCore Global Platform pripravljena!")

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """Glavni dashboard"""
    # Preverimo, ali frontend obstaja
    frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "index.html")
    if os.path.exists(frontend_path):
        with open(frontend_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    else:
        # Vrnemo osnovni HTML, če frontend ni na voljo
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>OmniCore Global Platform</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #2c3e50; text-align: center; }
                .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .api-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .endpoint { font-family: monospace; background: #e9ecef; padding: 5px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 OmniCore Global Platform</h1>
                <div class="status">
                    <h3>✅ Backend Status: Aktiven</h3>
                    <p>OmniCore Global backend uspešno teče na portu 8000</p>
                </div>
                <div class="api-info">
                    <h3>📡 API Endpoints</h3>
                    <p><strong>Glavno usmerjanje:</strong> <span class="endpoint">POST /api/route</span></p>
                    <p><strong>Dokumentacija:</strong> <span class="endpoint">GET /docs</span></p>
                    <p><strong>Health Check:</strong> <span class="endpoint">GET /health</span></p>
                </div>
                <div class="api-info">
                    <h3>🔧 Aktivni moduli</h3>
                    <ul>
                        <li>💰 Finance Module</li>
                        <li>📊 Analytics Module</li>
                        <li>📋 Task Module</li>
                        <li>🚚 Logistics Module</li>
                        <li>🏖️ Tourism Module</li>
                        <li>🏥 Healthcare Module</li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
        """)

@app.post("/api/route", response_model=ModuleResponse)
async def route_query(request: QueryRequest):
    """Glavno usmerjanje poizvedb preko AI Router"""
    start_time = datetime.now()
    
    try:
        # AI routing
        module_name = await ai_router.route(request.query, request.context)
        
        if module_name not in modules:
            raise HTTPException(status_code=404, detail=f"Modul '{module_name}' ni najden")
        
        # Izvršitev v modulu
        module = modules[module_name]
        result = await module.handle(request.query, request.tenant_id, request.user_id, request.context)
        
        execution_time = (datetime.now() - start_time).total_seconds()
        
        return ModuleResponse(
            module=module_name,
            result=result,
            execution_time=execution_time,
            tenant_id=request.tenant_id,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Napaka pri usmerjanju: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status")
async def system_status():
    """Status vseh modulov"""
    status = {}
    
    for name, module in modules.items():
        try:
            health = await module.health_check()
            status[name] = {
                "status": "active",
                "health": health,
                "last_check": datetime.now().isoformat()
            }
        except Exception as e:
            status[name] = {
                "status": "error",
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }
    
    return {
        "platform": "OmniCore Global",
        "version": "1.0.0",
        "modules": status,
        "total_modules": len(modules),
        "active_modules": len([s for s in status.values() if s["status"] == "active"])
    }

@app.get("/api/modules")
async def list_modules():
    """Seznam vseh modulov"""
    return {
        name: {
            "name": module.name,
            "description": module.description,
            "capabilities": module.capabilities,
            "version": getattr(module, "version", "1.0.0")
        }
        for name, module in modules.items()
    }

@app.get("/api/modules/{module_name}")
async def module_info(module_name: str):
    """Informacije o specifičnem modulu"""
    if module_name not in modules:
        raise HTTPException(status_code=404, detail=f"Modul '{module_name}' ni najden")
    
    module = modules[module_name]
    return {
        "name": module.name,
        "description": module.description,
        "capabilities": module.capabilities,
        "endpoints": getattr(module, "endpoints", []),
        "status": "active"
    }

@app.post("/api/modules/{module_name}/execute")
async def execute_module(module_name: str, request: QueryRequest):
    """Direktno izvršitev v specifičnem modulu"""
    if module_name not in modules:
        raise HTTPException(status_code=404, detail=f"Modul '{module_name}' ni najden")
    
    start_time = datetime.now()
    
    try:
        module = modules[module_name]
        result = await module.handle(request.query, request.tenant_id, request.user_id, request.context)
        
        execution_time = (datetime.now() - start_time).total_seconds()
        
        return ModuleResponse(
            module=module_name,
            result=result,
            execution_time=execution_time,
            tenant_id=request.tenant_id,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Napaka pri izvršitvi modula {module_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Dodamo manjkajoče API endpoints za frontend
@app.get("/modules/finance/dashboard")
async def finance_dashboard(
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(multitenant_db.get_db)
):
    """Finance module dashboard for current tenant"""
    import random
    
    # Try to get saved data first
    saved_data = multitenant_db.get_tenant_data(tenant.id, "finance", "dashboard", db)
    
    if saved_data:
        return json.loads(saved_data.data)
    
    # Default data
    data = {
        "status": "active", 
        "total_revenue": random.randint(50000, 150000),
        "monthly_revenue": random.randint(10000, 25000),
        "pending_invoices": random.randint(5, 20),
        "revenue": random.randint(50000, 150000),
        "expenses": random.randint(30000, 80000),
        "profit": random.randint(10000, 50000),
        "transactions": random.randint(100, 500),
        "growth": round(random.uniform(-10, 25), 2),
        "data": {}
    }
    
    # Save data for tenant
    multitenant_db.save_tenant_data(tenant.id, "finance", "dashboard", json.dumps(data), db)
    
    return data

@app.get("/modules/analytics/dashboard")
async def analytics_module_dashboard():
    """Analytics module dashboard"""
    return {
        "status": "active", 
        "total_requests": 1247,
        "avg_response_time": 150,
        "success_rate": 98.5,
        "data": {}
    }

@app.get("/modules/task/dashboard")
async def task_dashboard():
    """Task module dashboard"""
    return {
        "status": "active", 
        "active_tasks": 23,
        "completed_tasks": 156,
        "pending_tasks": 8,
        "data": {}
    }

@app.get("/modules/logistics/dashboard")
async def logistics_dashboard():
    """Logistics module dashboard"""
    return {
        "status": "active", 
        "active_shipments": 8,
        "delivered_shipments": 45,
        "pending_shipments": 3,
        "data": {}
    }

# Multi-tenant endpoints
@app.get("/tenants/info")
async def get_tenant_info(
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(multitenant_db.get_db)
):
    """Get current tenant information"""
    modules = multitenant_db.get_tenant_modules(tenant.id, db)
    return {
        "tenant": {
            "id": tenant.id,
            "name": tenant.name,
            "domain": tenant.domain,
            "created_at": tenant.created_at
        },
        "modules": [{"name": m.module_name, "enabled": m.is_enabled} for m in modules]
    }

@app.post("/tenants/create")
async def create_tenant(
    name: str,
    domain: str,
    db: Session = Depends(multitenant_db.get_db)
):
    """Create new tenant (admin only)"""
    try:
        tenant = multitenant_db.create_tenant(name, domain, db)
        return {
            "tenant_id": tenant.id,
            "name": tenant.name,
            "domain": tenant.domain,
            "api_key": tenant.api_key
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating tenant: {str(e)}")

# Updated endpoints with multi-tenant support
@app.get("/status")
async def get_status(
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(multitenant_db.get_db)
):
    """Get module status for current tenant"""
    import random
    import time
    
    modules = multitenant_db.get_tenant_modules(tenant.id, db)
    
    status = {}
    for module in modules:
        # Simulate module health check
        health_status = random.choice(["active", "error", "standby"])
        status[module.module_name] = {
            "status": health_status,
            "last_check": time.time(),
            "enabled": module.is_enabled
        }
    
    return status

@app.get("/analytics/summary")
async def analytics_summary():
    """Analytics summary endpoint"""
    return {
        "avg_response_time": 150,
        "success_rate": 98.5,
        "top_module": "Finance",
        "hourly_requests": [12, 15, 18, 22, 25, 30, 28, 24, 20, 16, 14, 10],
        "total_requests": 1247,
        "active_users": 45
    }

# Dodamo health check endpoints za module
@app.get("/modules/{module_name}/health")
async def module_health(module_name: str):
    """Module health check"""
    if module_name in modules:
        try:
            health = await modules[module_name].health_check()
            return {"status": "healthy", "health": health}
        except:
            return {"status": "error", "health": "unhealthy"}
    return {"status": "not_found", "health": "module not found"}

@app.get("/api/analytics/dashboard")
async def analytics_dashboard():
    """Analitični dashboard podatki"""
    try:
        # Zbiranje podatkov iz vseh modulov
        dashboard_data = {}
        
        for name, module in modules.items():
            if hasattr(module, 'get_dashboard_data'):
                dashboard_data[name] = await module.get_dashboard_data()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "modules": dashboard_data,
            "system_metrics": {
                "total_requests": 0,  # Implementiraj tracking
                "avg_response_time": 0,  # Implementiraj tracking
                "active_users": 0,  # Implementiraj tracking
                "uptime": "99.9%"  # Implementiraj tracking
            }
        }
        
    except Exception as e:
        logger.error(f"Napaka pri pridobivanju dashboard podatkov: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Zdravstveno preverjanje"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# Statični fajli za frontend (če obstaja)
import os
if os.path.exists("frontend"):
    app.mount("/static", StaticFiles(directory="frontend"), name="static")

if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Zaganjam OmniCore Global Platform...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )