"""
OmniCore Message Broker System
Enterprise-grade event streaming with Kafka/RabbitMQ
"""

import asyncio
import json
import logging
import secrets
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import threading
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
import uuid

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EventType(Enum):
    SYSTEM = "system"
    FINANCE = "finance"
    LOGISTICS = "logistics"
    ANALYTICS = "analytics"
    AI_ROUTING = "ai_routing"
    TENANT = "tenant"
    SECURITY = "security"

class EventPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class OmniEvent:
    """Standard event structure for OmniCore system"""
    event_id: str
    event_type: EventType
    priority: EventPriority
    tenant_id: str
    source_service: str
    target_service: Optional[str]
    payload: Dict[str, Any]
    timestamp: datetime
    correlation_id: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3

class MessageBroker:
    """Enterprise message broker with Kafka-like functionality"""
    
    def __init__(self):
        self.topics: Dict[str, List[OmniEvent]] = {}
        self.subscribers: Dict[str, List[Callable]] = {}
        self.event_store: List[OmniEvent] = []
        self.websocket_connections: List[WebSocket] = []
        self.setup_default_topics()
        
    def setup_default_topics(self):
        """Initialize default topics for OmniCore system"""
        default_topics = [
            "omni.system.health",
            "omni.finance.transactions", 
            "omni.finance.reports",
            "omni.logistics.shipments",
            "omni.logistics.inventory",
            "omni.analytics.data_processed",
            "omni.analytics.insights",
            "omni.ai.routing_decisions",
            "omni.ai.optimization_results",
            "omni.tenant.activity",
            "omni.security.alerts",
            "omni.security.audit"
        ]
        
        for topic in default_topics:
            self.topics[topic] = []
            self.subscribers[topic] = []
            
    async def publish_event(self, topic: str, event: OmniEvent) -> bool:
        """Publish event to topic"""
        try:
            if topic not in self.topics:
                self.topics[topic] = []
                self.subscribers[topic] = []
                
            # Add to topic queue
            self.topics[topic].append(event)
            
            # Add to event store for persistence
            self.event_store.append(event)
            
            # Notify subscribers
            await self._notify_subscribers(topic, event)
            
            # Send to WebSocket connections
            await self._broadcast_to_websockets(topic, event)
            
            logger.info(f"Event published to {topic}: {event.event_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish event: {str(e)}")
            return False
            
    async def subscribe(self, topic: str, callback: Callable) -> bool:
        """Subscribe to topic"""
        try:
            if topic not in self.subscribers:
                self.subscribers[topic] = []
                
            self.subscribers[topic].append(callback)
            logger.info(f"New subscriber added to {topic}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe to {topic}: {str(e)}")
            return False
            
    async def _notify_subscribers(self, topic: str, event: OmniEvent):
        """Notify all subscribers of topic"""
        if topic in self.subscribers:
            for callback in self.subscribers[topic]:
                try:
                    await callback(event)
                except Exception as e:
                    logger.error(f"Subscriber callback failed: {str(e)}")
                    
    async def _broadcast_to_websockets(self, topic: str, event: OmniEvent):
        """Broadcast event to WebSocket connections"""
        if self.websocket_connections:
            message = {
                "topic": topic,
                "event": {
                    "event_id": event.event_id,
                    "event_type": event.event_type.value,
                    "priority": event.priority.value,
                    "tenant_id": event.tenant_id,
                    "source_service": event.source_service,
                    "target_service": event.target_service,
                    "payload": event.payload,
                    "timestamp": event.timestamp.isoformat()
                }
            }
            
            disconnected = []
            for websocket in self.websocket_connections:
                try:
                    await websocket.send_text(json.dumps(message))
                except:
                    disconnected.append(websocket)
                    
            # Remove disconnected WebSockets
            for ws in disconnected:
                self.websocket_connections.remove(ws)
                
    def get_topic_stats(self, topic: str) -> Dict[str, Any]:
        """Get statistics for specific topic"""
        if topic not in self.topics:
            return {"error": "Topic not found"}
            
        events = self.topics[topic]
        recent_events = [e for e in events if (datetime.now() - e.timestamp).seconds < 3600]  # Last hour
        
        return {
            "topic": topic,
            "total_events": len(events),
            "recent_events_1h": len(recent_events),
            "subscribers_count": len(self.subscribers.get(topic, [])),
            "last_event": events[-1].timestamp.isoformat() if events else None,
            "event_types": list(set(e.event_type.value for e in recent_events)),
            "priorities": list(set(e.priority.value for e in recent_events))
        }
        
    def get_global_stats(self) -> Dict[str, Any]:
        """Get global message broker statistics"""
        total_events = sum(len(events) for events in self.topics.values())
        total_subscribers = sum(len(subs) for subs in self.subscribers.values())
        
        # Recent activity (last hour)
        recent_events = [e for e in self.event_store if (datetime.now() - e.timestamp).seconds < 3600]
        
        return {
            "broker_status": "operational",
            "total_topics": len(self.topics),
            "total_events": total_events,
            "total_subscribers": total_subscribers,
            "active_websockets": len(self.websocket_connections),
            "recent_activity": {
                "events_last_hour": len(recent_events),
                "events_per_minute": len(recent_events) / 60 if recent_events else 0,
                "top_event_types": self._get_top_event_types(recent_events),
                "top_tenants": self._get_top_tenants(recent_events)
            },
            "timestamp": datetime.now().isoformat()
        }
        
    def _get_top_event_types(self, events: List[OmniEvent]) -> List[Dict[str, Any]]:
        """Get top event types from events list"""
        type_counts = {}
        for event in events:
            event_type = event.event_type.value
            type_counts[event_type] = type_counts.get(event_type, 0) + 1
            
        return [
            {"type": event_type, "count": count}
            for event_type, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
    def _get_top_tenants(self, events: List[OmniEvent]) -> List[Dict[str, Any]]:
        """Get top tenants from events list"""
        tenant_counts = {}
        for event in events:
            tenant_id = event.tenant_id
            tenant_counts[tenant_id] = tenant_counts.get(tenant_id, 0) + 1
            
        return [
            {"tenant_id": tenant_id, "events": count}
            for tenant_id, count in sorted(tenant_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

class EventGenerator:
    """Generate sample events for testing and demonstration"""
    
    def __init__(self, broker: MessageBroker):
        self.broker = broker
        
    async def generate_sample_events(self):
        """Generate sample events continuously"""
        while True:
            try:
                # Finance event
                finance_event = OmniEvent(
                    event_id=str(uuid.uuid4()),
                    event_type=EventType.FINANCE,
                    priority=EventPriority.MEDIUM,
                    tenant_id="company_001",
                    source_service="omni-finance",
                    target_service="omni-analytics",
                    payload={
                        "transaction_id": f"TXN_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                        "amount": 15750.50,
                        "currency": "EUR",
                        "type": "invoice_payment"
                    },
                    timestamp=datetime.now()
                )
                await self.broker.publish_event("omni.finance.transactions", finance_event)
                
                # Logistics event
                logistics_event = OmniEvent(
                    event_id=str(uuid.uuid4()),
                    event_type=EventType.LOGISTICS,
                    priority=EventPriority.HIGH,
                    tenant_id="company_002",
                    source_service="omni-logistics",
                    target_service="omni-analytics",
                    payload={
                        "shipment_id": f"SHP_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                        "status": "in_transit",
                        "location": "Ljubljana, Slovenia",
                        "estimated_delivery": "2024-01-15T14:30:00Z"
                    },
                    timestamp=datetime.now()
                )
                await self.broker.publish_event("omni.logistics.shipments", logistics_event)
                
                # AI Routing event
                ai_event = OmniEvent(
                    event_id=str(uuid.uuid4()),
                    event_type=EventType.AI_ROUTING,
                    priority=EventPriority.MEDIUM,
                    tenant_id="company_003",
                    source_service="omni-ai-router",
                    target_service="omni-core",
                    payload={
                        "request_id": f"REQ_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                        "routing_decision": "finance_module",
                        "confidence_score": 0.94,
                        "processing_time_ms": 45
                    },
                    timestamp=datetime.now()
                )
                await self.broker.publish_event("omni.ai.routing_decisions", ai_event)
                
                await asyncio.sleep(5)  # Generate events every 5 seconds
                
            except Exception as e:
                logger.error(f"Error generating sample events: {str(e)}")
                await asyncio.sleep(10)

# FastAPI application
app = FastAPI(
    title="OmniCore Message Broker",
    description="Enterprise-grade event streaming system",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
message_broker = MessageBroker()
event_generator = EventGenerator(message_broker)

# Pydantic models
class PublishEventRequest(BaseModel):
    topic: str
    event_type: str
    priority: str
    tenant_id: str
    source_service: str
    target_service: Optional[str] = None
    payload: Dict[str, Any]

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint with broker overview"""
    return {
        "system": "OmniCore Message Broker",
        "version": "2.0.0",
        "status": "operational",
        "topics": len(message_broker.topics),
        "active_connections": len(message_broker.websocket_connections),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/broker/status")
async def get_broker_status():
    """Get comprehensive broker status"""
    return message_broker.get_global_stats()

@app.get("/topics")
async def get_topics():
    """Get all available topics"""
    return {
        "topics": [
            {
                "name": topic,
                "events_count": len(events),
                "subscribers_count": len(message_broker.subscribers.get(topic, []))
            }
            for topic, events in message_broker.topics.items()
        ]
    }

@app.get("/topics/{topic}/stats")
async def get_topic_stats(topic: str):
    """Get statistics for specific topic"""
    return message_broker.get_topic_stats(topic)

@app.post("/publish")
async def publish_event(request: PublishEventRequest):
    """Publish event to topic"""
    try:
        event = OmniEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType(request.event_type),
            priority=EventPriority(request.priority),
            tenant_id=request.tenant_id,
            source_service=request.source_service,
            target_service=request.target_service,
            payload=request.payload,
            timestamp=datetime.now()
        )
        
        success = await message_broker.publish_event(request.topic, event)
        
        if success:
            return {
                "status": "published",
                "event_id": event.event_id,
                "topic": request.topic,
                "timestamp": event.timestamp.isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to publish event")
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid event type or priority: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Publishing failed: {str(e)}")

@app.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time event streaming"""
    await websocket.accept()
    message_broker.websocket_connections.append(websocket)
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        message_broker.websocket_connections.remove(websocket)

@app.get("/events/recent")
async def get_recent_events(limit: int = 50):
    """Get recent events from event store"""
    recent_events = sorted(
        message_broker.event_store,
        key=lambda e: e.timestamp,
        reverse=True
    )[:limit]
    
    return {
        "events": [
            {
                "event_id": event.event_id,
                "event_type": event.event_type.value,
                "priority": event.priority.value,
                "tenant_id": event.tenant_id,
                "source_service": event.source_service,
                "target_service": event.target_service,
                "payload": event.payload,
                "timestamp": event.timestamp.isoformat()
            }
            for event in recent_events
        ],
        "total_events": len(message_broker.event_store)
    }

@app.on_event("startup")
async def startup_event():
    """Start background tasks"""
    asyncio.create_task(event_generator.generate_sample_events())

if __name__ == "__main__":
    print("📡 Zaganjam OmniCore Message Broker...")
    print("🔄 Real-time event streaming: Kafka/RabbitMQ style")
    print("🌐 WebSocket support: Real-time notifications")
    print("📊 Event monitoring: http://localhost:8201")
    
    uvicorn.run(
        "omni_message_broker:app",
        host="0.0.0.0",
        port=8201,
        reload=True
    )