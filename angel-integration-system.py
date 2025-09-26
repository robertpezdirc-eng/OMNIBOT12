#!/usr/bin/env python3
"""
🔹 Angel Integration System - Python Edition
Sistem za integracijo in koordinacijo Angel-ov v Omni oblačni infrastrukturi
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
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify
import sqlite3

# Konfiguracija
CONFIG = {
    "server": {
        "host": "0.0.0.0",
        "port": 8081,
        "debug": False
    },
    "angels": {
        "max_angels": 100,
        "heartbeat_interval": 30,
        "task_timeout": 300,
        "coordination_enabled": True
    },
    "database": {
        "path": "/opt/omni/angels.db"
    },
    "logging": {
        "level": "INFO",
        "file": "/var/log/omni/angel-integration.log"
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
class Angel:
    """Angel entiteta"""
    id: str
    name: str
    type: str
    status: str
    capabilities: List[str]
    current_task: Optional[str] = None
    last_heartbeat: Optional[str] = None
    performance_score: float = 100.0
    created_at: Optional[str] = None

class AngelDatabase:
    """Database manager za Angel-e"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Inicializacija baze podatkov"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS angels (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    capabilities TEXT NOT NULL,
                    current_task TEXT,
                    last_heartbeat TEXT,
                    performance_score REAL DEFAULT 100.0,
                    created_at TEXT NOT NULL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    angel_id TEXT,
                    task_type TEXT NOT NULL,
                    task_data TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    completed_at TEXT,
                    FOREIGN KEY (angel_id) REFERENCES angels (id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS coordination_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    angel_id TEXT,
                    data TEXT,
                    timestamp TEXT NOT NULL
                )
            """)
    
    def register_angel(self, angel: Angel) -> bool:
        """Registracija novega Angel-a"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO angels 
                    (id, name, type, status, capabilities, current_task, last_heartbeat, performance_score, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    angel.id, angel.name, angel.type, angel.status,
                    json.dumps(angel.capabilities), angel.current_task,
                    angel.last_heartbeat, angel.performance_score, angel.created_at
                ))
            return True
        except Exception as e:
            logger.error(f"Napaka pri registraciji Angel-a {angel.id}: {e}")
            return False
    
    def get_angel(self, angel_id: str) -> Optional[Angel]:
        """Pridobi Angel po ID-ju"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("SELECT * FROM angels WHERE id = ?", (angel_id,))
                row = cursor.fetchone()
                
                if row:
                    return Angel(
                        id=row[0], name=row[1], type=row[2], status=row[3],
                        capabilities=json.loads(row[4]), current_task=row[5],
                        last_heartbeat=row[6], performance_score=row[7], created_at=row[8]
                    )
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju Angel-a {angel_id}: {e}")
        return None
    
    def get_all_angels(self) -> List[Angel]:
        """Pridobi vse Angel-e"""
        angels = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("SELECT * FROM angels")
                for row in cursor.fetchall():
                    angels.append(Angel(
                        id=row[0], name=row[1], type=row[2], status=row[3],
                        capabilities=json.loads(row[4]), current_task=row[5],
                        last_heartbeat=row[6], performance_score=row[7], created_at=row[8]
                    ))
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju Angel-ov: {e}")
        return angels
    
    def update_angel_status(self, angel_id: str, status: str) -> bool:
        """Posodobi status Angel-a"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    "UPDATE angels SET status = ?, last_heartbeat = ? WHERE id = ?",
                    (status, datetime.now().isoformat(), angel_id)
                )
            return True
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju statusa Angel-a {angel_id}: {e}")
            return False

class AngelIntegrationSystem:
    """Glavni sistem za integracijo Angel-ov"""
    
    def __init__(self):
        self.config = CONFIG
        self.db = AngelDatabase(CONFIG["database"]["path"])
        self.app = Flask(__name__)
        self.running = False
        self.angels = {}
        
        # Nastavi API endpoints
        self.setup_routes()
        
        logger.info("🔹 Angel Integration System inicializiran")
    
    def setup_routes(self):
        """Nastavi Flask API routes"""
        
        @self.app.route('/api/angels/register', methods=['POST'])
        def register_angel():
            try:
                data = request.get_json()
                
                angel = Angel(
                    id=data.get('id'),
                    name=data.get('name'),
                    type=data.get('type'),
                    status='active',
                    capabilities=data.get('capabilities', []),
                    created_at=datetime.now().isoformat()
                )
                
                if self.db.register_angel(angel):
                    self.angels[angel.id] = angel
                    logger.info(f"✅ Angel {angel.name} ({angel.id}) registriran")
                    return jsonify({"status": "success", "angel_id": angel.id})
                else:
                    return jsonify({"status": "error", "message": "Registration failed"}), 500
                    
            except Exception as e:
                logger.error(f"Napaka pri registraciji: {e}")
                return jsonify({"status": "error", "message": str(e)}), 400
        
        @self.app.route('/api/angels', methods=['GET'])
        def get_angels():
            try:
                angels = self.db.get_all_angels()
                return jsonify({
                    "status": "success",
                    "angels": [asdict(angel) for angel in angels],
                    "count": len(angels)
                })
            except Exception as e:
                logger.error(f"Napaka pri pridobivanju Angel-ov: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/angels/<angel_id>', methods=['GET'])
        def get_angel(angel_id):
            try:
                angel = self.db.get_angel(angel_id)
                if angel:
                    return jsonify({"status": "success", "angel": asdict(angel)})
                else:
                    return jsonify({"status": "error", "message": "Angel not found"}), 404
            except Exception as e:
                logger.error(f"Napaka pri pridobivanju Angel-a: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/angels/<angel_id>/heartbeat', methods=['POST'])
        def angel_heartbeat(angel_id):
            try:
                if self.db.update_angel_status(angel_id, 'active'):
                    return jsonify({"status": "success", "timestamp": datetime.now().isoformat()})
                else:
                    return jsonify({"status": "error", "message": "Heartbeat failed"}), 500
            except Exception as e:
                logger.error(f"Napaka pri heartbeat: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/status', methods=['GET'])
        def system_status():
            try:
                angels = self.db.get_all_angels()
                active_angels = [a for a in angels if a.status == 'active']
                
                return jsonify({
                    "status": "active",
                    "system": "Angel Integration System",
                    "version": "2.0",
                    "total_angels": len(angels),
                    "active_angels": len(active_angels),
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                logger.error(f"Napaka pri status preverjanju: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
    
    def start_heartbeat_monitor(self):
        """Zagon heartbeat monitoringa"""
        def monitor():
            while self.running:
                try:
                    # Preveri Angel-e, ki niso poslali heartbeat
                    angels = self.db.get_all_angels()
                    current_time = datetime.now()
                    
                    for angel in angels:
                        if angel.last_heartbeat:
                            last_heartbeat = datetime.fromisoformat(angel.last_heartbeat)
                            if (current_time - last_heartbeat).seconds > CONFIG["angels"]["heartbeat_interval"] * 2:
                                logger.warning(f"⚠️ Angel {angel.name} ni poslal heartbeat")
                                self.db.update_angel_status(angel.id, 'inactive')
                    
                    time.sleep(CONFIG["angels"]["heartbeat_interval"])
                    
                except Exception as e:
                    logger.error(f"Napaka v heartbeat monitor: {e}")
                    time.sleep(10)
        
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
        logger.info("💓 Heartbeat monitor zagnan")
    
    def start(self):
        """Zagon Angel Integration System"""
        logger.info("🚀 Zagon Angel Integration System...")
        
        try:
            self.running = True
            
            # Zagon heartbeat monitor
            self.start_heartbeat_monitor()
            
            # Zagon Flask strežnika
            logger.info(f"🌐 API strežnik zagnan na portu {self.config['server']['port']}")
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
        logger.info("🛑 Zaustavitev Angel Integration System...")
        self.running = False

def main():
    """Glavna funkcija"""
    print("=" * 60)
    print("🔹 ANGEL INTEGRATION SYSTEM - Python Edition")
    print("   Sistem za koordinacijo Angel-ov v oblaku")
    print("=" * 60)
    
    try:
        system = AngelIntegrationSystem()
        system.start()
        
    except KeyboardInterrupt:
        logger.info("⏹️ Prekinitev sistema...")
    except Exception as e:
        logger.error(f"❌ Kritična napaka: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()