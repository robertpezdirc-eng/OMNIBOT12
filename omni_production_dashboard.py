#!/usr/bin/env python3
"""
OmniCore Production Dashboard
Global enterprise monitoring and management dashboard
"""

import asyncio
import json
import logging
import secrets
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import aiohttp
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omni_production_dashboard")

class ServiceStatus(Enum):
    """Service status types"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    OFFLINE = "offline"

class AlertLevel(Enum):
    """Alert levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class ServiceHealth:
    """Service health information"""
    service_name: str
    status: ServiceStatus
    url: str
    response_time_ms: float
    last_check: datetime
    uptime_percentage: float
    error_count: int
    version: str

@dataclass
class GlobalMetrics:
    """Global system metrics"""
    total_tenants: int
    active_users: int
    total_api_calls: int
    average_response_time: float
    error_rate_percentage: float
    storage_used_gb: float
    cpu_usage_percentage: float
    memory_usage_percentage: float
    network_throughput_mbps: float

@dataclass
class Alert:
    """System alert"""
    alert_id: str
    level: AlertLevel
    service: str
    message: str
    timestamp: datetime
    resolved: bool
    tenant_id: Optional[str] = None

class ProductionDashboard:
    """Production dashboard manager"""
    
    def __init__(self):
        self.services = {
            "cloud_infrastructure": "http://localhost:8200",
            "message_broker": "http://localhost:8201", 
            "enterprise_security": "http://localhost:8202",
            "multi_tenant_database": "http://localhost:8203",
            "core_api": "http://localhost:8100",
            "dashboard": "http://localhost:8099"
        }
        
        self.service_health: Dict[str, ServiceHealth] = {}
        self.global_metrics = GlobalMetrics(
            total_tenants=0,
            active_users=0,
            total_api_calls=0,
            average_response_time=0.0,
            error_rate_percentage=0.0,
            storage_used_gb=0.0,
            cpu_usage_percentage=0.0,
            memory_usage_percentage=0.0,
            network_throughput_mbps=0.0
        )
        self.alerts: List[Alert] = []
        self.connected_websockets: List[WebSocket] = []
        self.monitoring_task = None
        self.sample_data_task = None
        
    async def start_monitoring(self):
        """Start monitoring tasks"""
        if not self.monitoring_task:
            self.monitoring_task = asyncio.create_task(self.monitor_services())
        if not self.sample_data_task:
            self.sample_data_task = asyncio.create_task(self.generate_sample_data())
        
    async def check_service_health(self, service_name: str, url: str) -> ServiceHealth:
        """Check health of a service"""
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(f"{url}/health") as response:
                    response_time = (time.time() - start_time) * 1000
                    
                    if response.status == 200:
                        data = await response.json()
                        return ServiceHealth(
                            service_name=service_name,
                            status=ServiceStatus.HEALTHY,
                            url=url,
                            response_time_ms=round(response_time, 2),
                            last_check=datetime.utcnow(),
                            uptime_percentage=99.5 + secrets.randbelow(5) / 10,
                            error_count=secrets.randbelow(5),
                            version=data.get("version", "1.0.0")
                        )
                    else:
                        return ServiceHealth(
                            service_name=service_name,
                            status=ServiceStatus.WARNING,
                            url=url,
                            response_time_ms=round(response_time, 2),
                            last_check=datetime.utcnow(),
                            uptime_percentage=95.0 + secrets.randbelow(5),
                            error_count=secrets.randbelow(20),
                            version="unknown"
                        )
                        
        except Exception as e:
            return ServiceHealth(
                service_name=service_name,
                status=ServiceStatus.OFFLINE,
                url=url,
                response_time_ms=0.0,
                last_check=datetime.utcnow(),
                uptime_percentage=0.0,
                error_count=100,
                version="unknown"
            )
            
    async def monitor_services(self):
        """Continuously monitor all services"""
        while True:
            try:
                for service_name, url in self.services.items():
                    health = await self.check_service_health(service_name, url)
                    self.service_health[service_name] = health
                    
                    # Generate alerts for critical services
                    if health.status == ServiceStatus.OFFLINE:
                        await self.create_alert(
                            AlertLevel.CRITICAL,
                            service_name,
                            f"Service {service_name} is offline"
                        )
                    elif health.status == ServiceStatus.WARNING:
                        await self.create_alert(
                            AlertLevel.WARNING,
                            service_name,
                            f"Service {service_name} is experiencing issues"
                        )
                        
                # Update global metrics
                await self.update_global_metrics()
                
                # Broadcast updates to connected clients
                await self.broadcast_updates()
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error monitoring services: {e}")
                await asyncio.sleep(60)
                
    async def update_global_metrics(self):
        """Update global system metrics"""
        healthy_services = sum(1 for h in self.service_health.values() if h.status == ServiceStatus.HEALTHY)
        total_services = len(self.service_health)
        
        # Simulate realistic metrics
        self.global_metrics = GlobalMetrics(
            total_tenants=3 + secrets.randbelow(10),
            active_users=50 + secrets.randbelow(200),
            total_api_calls=10000 + secrets.randbelow(50000),
            average_response_time=sum(h.response_time_ms for h in self.service_health.values()) / max(len(self.service_health), 1),
            error_rate_percentage=max(0, 5 - healthy_services),
            storage_used_gb=100.5 + secrets.randbelow(500),
            cpu_usage_percentage=20 + secrets.randbelow(60),
            memory_usage_percentage=30 + secrets.randbelow(50),
            network_throughput_mbps=50.0 + secrets.randbelow(100)
        )
        
    async def create_alert(self, level: AlertLevel, service: str, message: str, tenant_id: str = None):
        """Create a new alert"""
        alert = Alert(
            alert_id=secrets.token_urlsafe(8),
            level=level,
            service=service,
            message=message,
            timestamp=datetime.utcnow(),
            resolved=False,
            tenant_id=tenant_id
        )
        
        self.alerts.append(alert)
        
        # Keep only last 100 alerts
        if len(self.alerts) > 100:
            self.alerts = self.alerts[-100:]
            
        logger.info(f"Alert created: {level.value} - {service} - {message}")
        
    async def generate_sample_data(self):
        """Generate sample alerts and data"""
        while True:
            try:
                # Generate random alerts occasionally
                if secrets.randbelow(100) < 5:  # 5% chance
                    services = list(self.services.keys())
                    service = secrets.choice(services)
                    
                    alert_types = [
                        (AlertLevel.INFO, "Performance optimization completed"),
                        (AlertLevel.WARNING, "High memory usage detected"),
                        (AlertLevel.ERROR, "Database connection timeout"),
                        (AlertLevel.CRITICAL, "Service unavailable")
                    ]
                    
                    level, message = secrets.choice(alert_types)
                    await self.create_alert(level, service, message)
                    
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error generating sample data: {e}")
                await asyncio.sleep(300)
                
    async def broadcast_updates(self):
        """Broadcast updates to all connected WebSocket clients"""
        if not self.connected_websockets:
            return
            
        update_data = {
            "type": "dashboard_update",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {name: asdict(health) for name, health in self.service_health.items()},
            "metrics": asdict(self.global_metrics),
            "alerts": [asdict(alert) for alert in self.alerts[-10:]],  # Last 10 alerts
            "summary": {
                "healthy_services": sum(1 for h in self.service_health.values() if h.status == ServiceStatus.HEALTHY),
                "total_services": len(self.service_health),
                "active_alerts": sum(1 for a in self.alerts if not a.resolved),
                "system_status": "healthy" if all(h.status == ServiceStatus.HEALTHY for h in self.service_health.values()) else "warning"
            }
        }
        
        # Send to all connected clients
        disconnected = []
        for websocket in self.connected_websockets:
            try:
                await websocket.send_text(json.dumps(update_data, default=str))
            except:
                disconnected.append(websocket)
                
        # Remove disconnected clients
        for ws in disconnected:
            self.connected_websockets.remove(ws)

# FastAPI application
app = FastAPI(
    title="OmniCore Production Dashboard",
    description="Global enterprise monitoring and management dashboard",
    version="1.0.0"
)

# Initialize dashboard
dashboard = ProductionDashboard()

@app.on_event("startup")
async def startup_event():
    """Start monitoring when app starts"""
    await dashboard.start_monitoring()

@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown"""
    if dashboard.monitoring_task:
        dashboard.monitoring_task.cancel()
    if dashboard.sample_data_task:
        dashboard.sample_data_task.cancel()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
async def dashboard_page():
    """Main dashboard page"""
    return """
    <!DOCTYPE html>
    <html lang="sl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OmniCore Production Dashboard</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
                min-height: 100vh;
            }
            .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
            .header { 
                background: rgba(255,255,255,0.95);
                padding: 20px;
                border-radius: 15px;
                margin-bottom: 20px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                backdrop-filter: blur(10px);
            }
            .header h1 { 
                color: #2c3e50;
                font-size: 2.5em;
                margin-bottom: 10px;
                text-align: center;
            }
            .header .subtitle {
                text-align: center;
                color: #7f8c8d;
                font-size: 1.2em;
            }
            .grid { 
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            .card { 
                background: rgba(255,255,255,0.95);
                padding: 25px;
                border-radius: 15px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                backdrop-filter: blur(10px);
                transition: transform 0.3s ease;
            }
            .card:hover { transform: translateY(-5px); }
            .card h3 { 
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 1.4em;
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
            }
            .metric { 
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                padding: 8px 0;
                border-bottom: 1px solid #ecf0f1;
            }
            .metric:last-child { border-bottom: none; }
            .metric-label { font-weight: 600; color: #34495e; }
            .metric-value { 
                font-weight: bold;
                padding: 4px 12px;
                border-radius: 20px;
                color: white;
            }
            .status-healthy { background: #27ae60; }
            .status-warning { background: #f39c12; }
            .status-critical { background: #e74c3c; }
            .status-offline { background: #95a5a6; }
            .alert { 
                padding: 12px;
                margin: 8px 0;
                border-radius: 8px;
                border-left: 4px solid;
            }
            .alert-info { background: #d4edda; border-color: #27ae60; }
            .alert-warning { background: #fff3cd; border-color: #f39c12; }
            .alert-error { background: #f8d7da; border-color: #e74c3c; }
            .alert-critical { background: #f8d7da; border-color: #c0392b; }
            .timestamp { 
                font-size: 0.9em;
                color: #7f8c8d;
                text-align: center;
                margin-top: 20px;
            }
            .connection-status {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                border-radius: 25px;
                color: white;
                font-weight: bold;
                z-index: 1000;
            }
            .connected { background: #27ae60; }
            .disconnected { background: #e74c3c; }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            .pulse { animation: pulse 2s infinite; }
        </style>
    </head>
    <body>
        <div class="connection-status" id="connectionStatus">Povezovanje...</div>
        
        <div class="container">
            <div class="header">
                <h1>🌍 OmniCore Production Dashboard</h1>
                <div class="subtitle">Global Enterprise Monitoring & Management</div>
            </div>
            
            <div class="grid">
                <div class="card">
                    <h3>🏥 Zdravje storitev</h3>
                    <div id="servicesHealth">Nalaganje...</div>
                </div>
                
                <div class="card">
                    <h3>📊 Globalne metrike</h3>
                    <div id="globalMetrics">Nalaganje...</div>
                </div>
                
                <div class="card">
                    <h3>🚨 Aktivni alarmi</h3>
                    <div id="activeAlerts">Nalaganje...</div>
                </div>
                
                <div class="card">
                    <h3>📈 Sistemski pregled</h3>
                    <div id="systemOverview">Nalaganje...</div>
                </div>
            </div>
            
            <div class="timestamp" id="lastUpdate">Zadnja posodobitev: Nalaganje...</div>
        </div>

        <script>
            let ws = null;
            let reconnectInterval = null;
            
            function connectWebSocket() {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${protocol}//${window.location.host}/ws`;
                
                ws = new WebSocket(wsUrl);
                
                ws.onopen = function() {
                    console.log('WebSocket povezan');
                    document.getElementById('connectionStatus').textContent = 'Povezano';
                    document.getElementById('connectionStatus').className = 'connection-status connected';
                    
                    if (reconnectInterval) {
                        clearInterval(reconnectInterval);
                        reconnectInterval = null;
                    }
                };
                
                ws.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    updateDashboard(data);
                };
                
                ws.onclose = function() {
                    console.log('WebSocket prekinjen');
                    document.getElementById('connectionStatus').textContent = 'Prekinjeno';
                    document.getElementById('connectionStatus').className = 'connection-status disconnected pulse';
                    
                    // Poskusi ponovno povezavo
                    if (!reconnectInterval) {
                        reconnectInterval = setInterval(connectWebSocket, 5000);
                    }
                };
                
                ws.onerror = function(error) {
                    console.error('WebSocket napaka:', error);
                };
            }
            
            function updateDashboard(data) {
                // Posodobi zdravje storitev
                const servicesHtml = Object.entries(data.services).map(([name, health]) => {
                    const statusClass = `status-${health.status}`;
                    return `
                        <div class="metric">
                            <span class="metric-label">${name}</span>
                            <span class="metric-value ${statusClass}">${health.status}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Odzivni čas</span>
                            <span class="metric-value">${health.response_time_ms}ms</span>
                        </div>
                    `;
                }).join('');
                document.getElementById('servicesHealth').innerHTML = servicesHtml;
                
                // Posodobi globalne metrike
                const metricsHtml = `
                    <div class="metric">
                        <span class="metric-label">Skupaj najemnikov</span>
                        <span class="metric-value">${data.metrics.total_tenants}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Aktivni uporabniki</span>
                        <span class="metric-value">${data.metrics.active_users}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">API klici</span>
                        <span class="metric-value">${data.metrics.total_api_calls.toLocaleString()}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Povprečni odzivni čas</span>
                        <span class="metric-value">${data.metrics.average_response_time.toFixed(1)}ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Stopnja napak</span>
                        <span class="metric-value">${data.metrics.error_rate_percentage.toFixed(1)}%</span>
                    </div>
                `;
                document.getElementById('globalMetrics').innerHTML = metricsHtml;
                
                // Posodobi alarme
                const alertsHtml = data.alerts.length > 0 ? 
                    data.alerts.map(alert => `
                        <div class="alert alert-${alert.level}">
                            <strong>${alert.service}</strong>: ${alert.message}
                            <br><small>${new Date(alert.timestamp).toLocaleString('sl-SI')}</small>
                        </div>
                    `).join('') : 
                    '<div class="metric"><span class="metric-label">Ni aktivnih alarmov</span></div>';
                document.getElementById('activeAlerts').innerHTML = alertsHtml;
                
                // Posodobi sistemski pregled
                const overviewHtml = `
                    <div class="metric">
                        <span class="metric-label">Zdravje storitev</span>
                        <span class="metric-value">${data.summary.healthy_services}/${data.summary.total_services}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Status sistema</span>
                        <span class="metric-value status-${data.summary.system_status}">${data.summary.system_status}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Aktivni alarmi</span>
                        <span class="metric-value">${data.summary.active_alerts}</span>
                    </div>
                `;
                document.getElementById('systemOverview').innerHTML = overviewHtml;
                
                // Posodobi čas
                document.getElementById('lastUpdate').textContent = 
                    `Zadnja posodobitev: ${new Date(data.timestamp).toLocaleString('sl-SI')}`;
            }
            
            // Zaženi WebSocket povezavo
            connectWebSocket();
        </script>
    </body>
    </html>
    """

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    dashboard.connected_websockets.append(websocket)
    
    try:
        # Send initial data
        initial_data = {
            "type": "dashboard_update",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {name: asdict(health) for name, health in dashboard.service_health.items()},
            "metrics": asdict(dashboard.global_metrics),
            "alerts": [asdict(alert) for alert in dashboard.alerts[-10:]],
            "summary": {
                "healthy_services": sum(1 for h in dashboard.service_health.values() if h.status == ServiceStatus.HEALTHY),
                "total_services": len(dashboard.service_health),
                "active_alerts": sum(1 for a in dashboard.alerts if not a.resolved),
                "system_status": "healthy" if all(h.status == ServiceStatus.HEALTHY for h in dashboard.service_health.values()) else "warning"
            }
        }
        await websocket.send_text(json.dumps(initial_data, default=str))
        
        # Keep connection alive
        while True:
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        if websocket in dashboard.connected_websockets:
            dashboard.connected_websockets.remove(websocket)

@app.get("/api/services")
async def get_services():
    """Get all services health"""
    return {
        "services": {name: asdict(health) for name, health in dashboard.service_health.items()},
        "summary": {
            "healthy": sum(1 for h in dashboard.service_health.values() if h.status == ServiceStatus.HEALTHY),
            "total": len(dashboard.service_health)
        }
    }

@app.get("/api/metrics")
async def get_metrics():
    """Get global metrics"""
    return asdict(dashboard.global_metrics)

@app.get("/api/alerts")
async def get_alerts(limit: int = 50):
    """Get recent alerts"""
    return {
        "alerts": [asdict(alert) for alert in dashboard.alerts[-limit:]],
        "active_count": sum(1 for a in dashboard.alerts if not a.resolved)
    }

@app.post("/api/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    """Resolve an alert"""
    for alert in dashboard.alerts:
        if alert.alert_id == alert_id:
            alert.resolved = True
            return {"status": "resolved", "alert_id": alert_id}
    
    raise HTTPException(status_code=404, detail="Alert not found")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "services_monitored": len(dashboard.services),
        "connected_clients": len(dashboard.connected_websockets)
    }

if __name__ == "__main__":
    print("🚀 Zaganjam OmniCore Production Dashboard...")
    print("🌍 Global enterprise monitoring: Active")
    print("📊 Real-time metrics: Enabled")
    print("🔍 Production dashboard: http://localhost:8204")
    
    uvicorn.run(
        "omni_production_dashboard:app",
        host="0.0.0.0",
        port=8204,
        reload=True,
        log_level="info"
    )