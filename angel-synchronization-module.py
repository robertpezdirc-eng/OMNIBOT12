#!/usr/bin/env python3
"""
🔹 Angel Synchronization Module - Python Edition
Sistem za sinhronizacijo in koordinacijo med Angel-i v Omni oblačni infrastrukturi
Verzija: 2.0 - Cloud Ready
"""

import os
import sys
import json
import time
import asyncio
import logging
import threading
import requests
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify
import sqlite3
from collections import defaultdict, deque
import websocket
import websocket_server
from concurrent.futures import ThreadPoolExecutor

# Konfiguracija
CONFIG = {
    "server": {
        "host": "0.0.0.0",
        "port": 8085,
        "debug": False
    },
    "synchronization": {
        "sync_interval": 15,
        "conflict_resolution": "timestamp_priority",
        "max_retry_attempts": 3,
        "batch_size": 100
    },
    "angels": {
        "integration_api": "http://localhost:8081/api",
        "task_distribution_api": "http://localhost:8082/api",
        "monitoring_api": "http://localhost:8084/api"
    },
    "websocket": {
        "port": 8086,
        "max_connections": 100
    },
    "database": {
        "path": "/opt/omni/synchronization.db"
    },
    "logging": {
        "level": "INFO",
        "file": "/var/log/omni/angel-synchronization.log"
    }
}

# Logging setup
logging.basicConfig(
    level=getattr(logging, CONFIG["logging"]["level"]),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(CONFIG["logging"]["file"]),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class SyncEvent:
    """Sinhronizacijski dogodek"""
    id: str
    type: str
    source_angel: str
    target_angels: List[str]
    data: Dict[str, Any]
    timestamp: str
    priority: int = 1
    status: str = "pending"
    retry_count: int = 0
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class ConflictResolution:
    """Razrešitev konflikta"""
    id: str
    conflict_type: str
    entities: List[str]
    resolution_strategy: str
    resolved_data: Dict[str, Any]
    resolved_at: str
    resolved_by: str

class SynchronizationDatabase:
    """Database manager za sinhronizacijske podatke"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Inicializacija baze podatkov"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sync_events (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    source_angel TEXT NOT NULL,
                    target_angels TEXT NOT NULL,
                    data TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    priority INTEGER DEFAULT 1,
                    status TEXT DEFAULT 'pending',
                    retry_count INTEGER DEFAULT 0,
                    metadata TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conflict_resolutions (
                    id TEXT PRIMARY KEY,
                    conflict_type TEXT NOT NULL,
                    entities TEXT NOT NULL,
                    resolution_strategy TEXT NOT NULL,
                    resolved_data TEXT NOT NULL,
                    resolved_at TEXT NOT NULL,
                    resolved_by TEXT NOT NULL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS angel_states (
                    angel_id TEXT PRIMARY KEY,
                    last_sync TEXT NOT NULL,
                    state_hash TEXT NOT NULL,
                    data TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            
            # Indeksi
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_events_timestamp ON sync_events(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_events_status ON sync_events(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_angel_states_updated ON angel_states(updated_at)")
    
    def store_sync_event(self, event: SyncEvent) -> bool:
        """Shrani sinhronizacijski dogodek"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO sync_events 
                    (id, type, source_angel, target_angels, data, timestamp, priority, status, retry_count, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event.id, event.type, event.source_angel,
                    json.dumps(event.target_angels), json.dumps(event.data),
                    event.timestamp, event.priority, event.status,
                    event.retry_count, json.dumps(event.metadata) if event.metadata else None
                ))
            return True
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju sync event: {e}")
            return False
    
    def get_pending_events(self, limit: int = 100) -> List[SyncEvent]:
        """Pridobi čakajoče dogodke"""
        events = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT * FROM sync_events 
                    WHERE status = 'pending' 
                    ORDER BY priority DESC, timestamp ASC 
                    LIMIT ?
                """, (limit,))
                
                for row in cursor.fetchall():
                    events.append(SyncEvent(
                        id=row[0], type=row[1], source_angel=row[2],
                        target_angels=json.loads(row[3]), data=json.loads(row[4]),
                        timestamp=row[5], priority=row[6], status=row[7],
                        retry_count=row[8],
                        metadata=json.loads(row[9]) if row[9] else None
                    ))
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju pending events: {e}")
        return events
    
    def update_event_status(self, event_id: str, status: str, retry_count: int = None) -> bool:
        """Posodobi status dogodka"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                if retry_count is not None:
                    conn.execute(
                        "UPDATE sync_events SET status = ?, retry_count = ? WHERE id = ?",
                        (status, retry_count, event_id)
                    )
                else:
                    conn.execute(
                        "UPDATE sync_events SET status = ? WHERE id = ?",
                        (status, event_id)
                    )
            return True
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju event status: {e}")
            return False
    
    def store_angel_state(self, angel_id: str, state_data: Dict[str, Any]) -> bool:
        """Shrani stanje Angel-a"""
        try:
            state_json = json.dumps(state_data, sort_keys=True)
            state_hash = hashlib.sha256(state_json.encode()).hexdigest()
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO angel_states 
                    (angel_id, last_sync, state_hash, data, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    angel_id, datetime.now().isoformat(),
                    state_hash, state_json, datetime.now().isoformat()
                ))
            return True
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju angel state: {e}")
            return False
    
    def get_angel_state(self, angel_id: str) -> Optional[Dict[str, Any]]:
        """Pridobi stanje Angel-a"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "SELECT data FROM angel_states WHERE angel_id = ?",
                    (angel_id,)
                )
                row = cursor.fetchone()
                if row:
                    return json.loads(row[0])
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju angel state: {e}")
        return None

class WebSocketManager:
    """Manager za WebSocket povezave"""
    
    def __init__(self, port: int):
        self.port = port
        self.server = None
        self.clients = {}
        self.running = False
    
    def start(self):
        """Zagon WebSocket strežnika"""
        def new_client(client, server):
            logger.info(f"🔗 Nova WebSocket povezava: {client['id']}")
            self.clients[client['id']] = client
        
        def client_left(client, server):
            logger.info(f"🔌 WebSocket povezava prekinjena: {client['id']}")
            if client['id'] in self.clients:
                del self.clients[client['id']]
        
        def message_received(client, server, message):
            try:
                data = json.loads(message)
                logger.info(f"📨 WebSocket sporočilo od {client['id']}: {data.get('type', 'unknown')}")
                # Procesiranje sporočil
                self.handle_websocket_message(client, data)
            except Exception as e:
                logger.error(f"Napaka pri procesiranju WebSocket sporočila: {e}")
        
        try:
            self.server = websocket_server.WebsocketServer(self.port, host='0.0.0.0')
            self.server.set_fn_new_client(new_client)
            self.server.set_fn_client_left(client_left)
            self.server.set_fn_message_received(message_received)
            
            self.running = True
            logger.info(f"🌐 WebSocket strežnik zagnan na portu {self.port}")
            self.server.run_forever()
            
        except Exception as e:
            logger.error(f"Napaka pri zagonu WebSocket strežnika: {e}")
            self.running = False
    
    def handle_websocket_message(self, client, data):
        """Obravnava WebSocket sporočila"""
        message_type = data.get('type')
        
        if message_type == 'angel_register':
            # Registracija Angel-a
            angel_id = data.get('angel_id')
            if angel_id:
                client['angel_id'] = angel_id
                logger.info(f"👼 Angel {angel_id} registriran preko WebSocket")
        
        elif message_type == 'sync_request':
            # Zahteva za sinhronizacijo
            self.handle_sync_request(client, data)
        
        elif message_type == 'state_update':
            # Posodobitev stanja
            self.handle_state_update(client, data)
    
    def handle_sync_request(self, client, data):
        """Obravnava zahtevo za sinhronizacijo"""
        try:
            angel_id = client.get('angel_id')
            if not angel_id:
                return
            
            # Ustvari sync event
            sync_event = SyncEvent(
                id=f"ws_sync_{int(time.time())}_{angel_id}",
                type="websocket_sync",
                source_angel=angel_id,
                target_angels=data.get('target_angels', []),
                data=data.get('data', {}),
                timestamp=datetime.now().isoformat(),
                priority=data.get('priority', 1)
            )
            
            # Dodaj v sync queue
            # To bi bilo povezano z glavnim sync sistemom
            logger.info(f"🔄 Sync zahteva od {angel_id} preko WebSocket")
            
        except Exception as e:
            logger.error(f"Napaka pri obravnavi sync zahteve: {e}")
    
    def handle_state_update(self, client, data):
        """Obravnava posodobitev stanja"""
        try:
            angel_id = client.get('angel_id')
            if not angel_id:
                return
            
            state_data = data.get('state', {})
            logger.info(f"📊 State update od {angel_id} preko WebSocket")
            
            # To bi bilo povezano z glavnim sync sistemom
            
        except Exception as e:
            logger.error(f"Napaka pri obravnavi state update: {e}")
    
    def broadcast_to_angels(self, message: Dict[str, Any], target_angels: List[str] = None):
        """Pošlje sporočilo Angel-om"""
        if not self.server:
            return
        
        try:
            message_json = json.dumps(message)
            
            for client_id, client in self.clients.items():
                angel_id = client.get('angel_id')
                
                if target_angels is None or angel_id in target_angels:
                    self.server.send_message(client, message_json)
                    logger.debug(f"📤 Sporočilo poslano Angel-u {angel_id}")
                    
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju broadcast sporočila: {e}")
    
    def stop(self):
        """Zaustavitev WebSocket strežnika"""
        self.running = False
        if self.server:
            self.server.shutdown()

class AngelSynchronizationModule:
    """Glavni modul za sinhronizacijo Angel-ov"""
    
    def __init__(self):
        self.config = CONFIG
        self.db = SynchronizationDatabase(CONFIG["database"]["path"])
        self.app = Flask(__name__)
        self.websocket_manager = WebSocketManager(CONFIG["websocket"]["port"])
        self.running = False
        self.sync_queue = deque()
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        # Nastavi API endpoints
        self.setup_routes()
        
        logger.info("🔹 Angel Synchronization Module inicializiran")
    
    def setup_routes(self):
        """Nastavi Flask API routes"""
        
        @self.app.route('/api/sync', methods=['POST'])
        def create_sync_event():
            try:
                data = request.get_json()
                
                sync_event = SyncEvent(
                    id=data.get('id', f"sync_{int(time.time())}_{data.get('source_angel')}"),
                    type=data.get('type'),
                    source_angel=data.get('source_angel'),
                    target_angels=data.get('target_angels', []),
                    data=data.get('data', {}),
                    timestamp=data.get('timestamp', datetime.now().isoformat()),
                    priority=data.get('priority', 1),
                    metadata=data.get('metadata')
                )
                
                if self.db.store_sync_event(sync_event):
                    self.sync_queue.append(sync_event)
                    return jsonify({"status": "success", "event_id": sync_event.id})
                else:
                    return jsonify({"status": "error", "message": "Failed to store sync event"}), 500
                    
            except Exception as e:
                logger.error(f"Napaka pri ustvarjanju sync event: {e}")
                return jsonify({"status": "error", "message": str(e)}), 400
        
        @self.app.route('/api/sync/status/<event_id>', methods=['GET'])
        def get_sync_status(event_id):
            try:
                # Implementacija za pridobivanje statusa
                return jsonify({
                    "status": "success",
                    "event_id": event_id,
                    "sync_status": "completed"  # Placeholder
                })
            except Exception as e:
                logger.error(f"Napaka pri pridobivanju sync status: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/angels/state/<angel_id>', methods=['GET'])
        def get_angel_state(angel_id):
            try:
                state = self.db.get_angel_state(angel_id)
                if state:
                    return jsonify({"status": "success", "state": state})
                else:
                    return jsonify({"status": "error", "message": "Angel state not found"}), 404
            except Exception as e:
                logger.error(f"Napaka pri pridobivanju angel state: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/angels/state/<angel_id>', methods=['POST'])
        def update_angel_state(angel_id):
            try:
                data = request.get_json()
                state_data = data.get('state', {})
                
                if self.db.store_angel_state(angel_id, state_data):
                    # Obvesti druge Angel-e o spremembi
                    self.notify_state_change(angel_id, state_data)
                    return jsonify({"status": "success"})
                else:
                    return jsonify({"status": "error", "message": "Failed to update state"}), 500
                    
            except Exception as e:
                logger.error(f"Napaka pri posodabljanju angel state: {e}")
                return jsonify({"status": "error", "message": str(e)}), 400
        
        @self.app.route('/api/conflicts', methods=['GET'])
        def get_conflicts():
            try:
                # Implementacija za pridobivanje konfliktov
                return jsonify({
                    "status": "success",
                    "conflicts": [],  # Placeholder
                    "count": 0
                })
            except Exception as e:
                logger.error(f"Napaka pri pridobivanju konfliktov: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/status', methods=['GET'])
        def system_status():
            try:
                return jsonify({
                    "status": "active",
                    "system": "Angel Synchronization Module",
                    "version": "2.0",
                    "sync_queue_size": len(self.sync_queue),
                    "websocket_connections": len(self.websocket_manager.clients),
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                logger.error(f"Napaka pri status preverjanju: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
    
    def notify_state_change(self, angel_id: str, state_data: Dict[str, Any]):
        """Obvesti druge Angel-e o spremembi stanja"""
        try:
            message = {
                "type": "state_change",
                "angel_id": angel_id,
                "state": state_data,
                "timestamp": datetime.now().isoformat()
            }
            
            # Pošlji preko WebSocket
            self.websocket_manager.broadcast_to_angels(message)
            
            logger.info(f"📢 State change notification poslana za Angel {angel_id}")
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju state change notification: {e}")
    
    def start_sync_processor(self):
        """Zagon procesiranja sinhronizacijskih dogodkov"""
        def process_sync_events():
            while self.running:
                try:
                    # Pridobi čakajoče dogodke iz baze
                    pending_events = self.db.get_pending_events(CONFIG["synchronization"]["batch_size"])
                    
                    # Dodaj v queue
                    for event in pending_events:
                        self.sync_queue.append(event)
                    
                    # Procesiraj queue
                    while self.sync_queue and self.running:
                        event = self.sync_queue.popleft()
                        self.process_sync_event(event)
                    
                    time.sleep(CONFIG["synchronization"]["sync_interval"])
                    
                except Exception as e:
                    logger.error(f"Napaka v sync processor: {e}")
                    time.sleep(5)
        
        processor_thread = threading.Thread(target=process_sync_events, daemon=True)
        processor_thread.start()
        logger.info("🔄 Sync processor zagnan")
    
    def process_sync_event(self, event: SyncEvent):
        """Procesiraj sinhronizacijski dogodek"""
        try:
            logger.info(f"🔄 Procesiranje sync event {event.id} od {event.source_angel}")
            
            # Simulacija procesiranja
            success = True
            
            if success:
                self.db.update_event_status(event.id, "completed")
                logger.info(f"✅ Sync event {event.id} uspešno dokončan")
            else:
                # Povečaj retry count
                event.retry_count += 1
                if event.retry_count < CONFIG["synchronization"]["max_retry_attempts"]:
                    self.db.update_event_status(event.id, "pending", event.retry_count)
                    logger.warning(f"🔄 Sync event {event.id} bo poskušen ponovno ({event.retry_count}/{CONFIG['synchronization']['max_retry_attempts']})")
                else:
                    self.db.update_event_status(event.id, "failed", event.retry_count)
                    logger.error(f"❌ Sync event {event.id} neuspešen po {event.retry_count} poskusih")
            
        except Exception as e:
            logger.error(f"Napaka pri procesiranju sync event {event.id}: {e}")
            self.db.update_event_status(event.id, "error")
    
    def start_websocket_server(self):
        """Zagon WebSocket strežnika"""
        def run_websocket():
            self.websocket_manager.start()
        
        websocket_thread = threading.Thread(target=run_websocket, daemon=True)
        websocket_thread.start()
        logger.info("🌐 WebSocket strežnik zagnan")
    
    def start(self):
        """Zagon Angel Synchronization Module"""
        logger.info("🚀 Zagon Angel Synchronization Module...")
        
        try:
            self.running = True
            
            # Zagon WebSocket strežnika
            self.start_websocket_server()
            
            # Zagon sync processorja
            self.start_sync_processor()
            
            # Zagon Flask strežnika
            logger.info(f"🌐 Synchronization API dostopen na http://{self.config['server']['host']}:{self.config['server']['port']}")
            self.app.run(
                host=self.config['server']['host'],
                port=self.config['server']['port'],
                debug=self.config['server']['debug'],
                threaded=True
            )
            
        except Exception as e:
            logger.error(f"❌ Napaka pri zagonu: {e}")
            self.running = False
    
    def stop(self):
        """Zaustavitev sistema"""
        logger.info("🛑 Zaustavitev Angel Synchronization Module...")
        self.running = False
        self.websocket_manager.stop()
        self.executor.shutdown(wait=True)

def main():
    """Glavna funkcija"""
    print("=" * 60)
    print("🔹 ANGEL SYNCHRONIZATION MODULE - Python Edition")
    print("   Sistem za sinhronizacijo Angel-ov v oblaku")
    print("=" * 60)
    
    try:
        system = AngelSynchronizationModule()
        system.start()
        
    except KeyboardInterrupt:
        logger.info("⏹️ Prekinitev sistema...")
    except Exception as e:
        logger.error(f"❌ Kritična napaka: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()