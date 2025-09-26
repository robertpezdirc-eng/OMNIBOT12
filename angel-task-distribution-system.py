#!/usr/bin/env python3
"""
🔹 Angel Task Distribution System - Python Edition
Sistem za razporeditev in upravljanje nalog med Angel-i
Verzija: 2.0 - Cloud Ready
"""

import os
import sys
import json
import time
import uuid
import asyncio
import logging
import threading
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify
import sqlite3
from queue import Queue, PriorityQueue
from enum import Enum

# Konfiguracija
CONFIG = {
    "server": {
        "host": "0.0.0.0",
        "port": 8082,
        "debug": False
    },
    "distribution": {
        "max_concurrent_tasks": 50,
        "task_timeout": 600,
        "retry_attempts": 3,
        "load_balancing": True
    },
    "angels": {
        "integration_api": "http://localhost:8081/api"
    },
    "database": {
        "path": "/opt/omni/tasks.db"
    },
    "logging": {
        "level": "INFO",
        "file": "/var/log/omni/task-distribution.log"
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

class TaskStatus(Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TaskPriority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class Task:
    """Task entiteta"""
    id: str
    type: str
    data: Dict[str, Any]
    priority: int
    status: str
    assigned_angel: Optional[str] = None
    created_at: Optional[str] = None
    assigned_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    retry_count: int = 0
    timeout: int = 600

class TaskDatabase:
    """Database manager za naloge"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Inicializacija baze podatkov"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    data TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    assigned_angel TEXT,
                    created_at TEXT NOT NULL,
                    assigned_at TEXT,
                    completed_at TEXT,
                    result TEXT,
                    retry_count INTEGER DEFAULT 0,
                    timeout INTEGER DEFAULT 600
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS task_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    angel_id TEXT,
                    data TEXT,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (task_id) REFERENCES tasks (id)
                )
            """)
    
    def create_task(self, task: Task) -> bool:
        """Ustvari novo nalogo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO tasks 
                    (id, type, data, priority, status, assigned_angel, created_at, assigned_at, completed_at, result, retry_count, timeout)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    task.id, task.type, json.dumps(task.data), task.priority, task.status,
                    task.assigned_angel, task.created_at, task.assigned_at, task.completed_at,
                    json.dumps(task.result) if task.result else None, task.retry_count, task.timeout
                ))
            return True
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju naloge {task.id}: {e}")
            return False
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """Pridobi nalogo po ID-ju"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
                row = cursor.fetchone()
                
                if row:
                    return Task(
                        id=row[0], type=row[1], data=json.loads(row[2]), priority=row[3],
                        status=row[4], assigned_angel=row[5], created_at=row[6],
                        assigned_at=row[7], completed_at=row[8],
                        result=json.loads(row[9]) if row[9] else None,
                        retry_count=row[10], timeout=row[11]
                    )
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju naloge {task_id}: {e}")
        return None
    
    def get_pending_tasks(self) -> List[Task]:
        """Pridobi čakajoče naloge"""
        tasks = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "SELECT * FROM tasks WHERE status = ? ORDER BY priority DESC, created_at ASC",
                    (TaskStatus.PENDING.value,)
                )
                for row in cursor.fetchall():
                    tasks.append(Task(
                        id=row[0], type=row[1], data=json.loads(row[2]), priority=row[3],
                        status=row[4], assigned_angel=row[5], created_at=row[6],
                        assigned_at=row[7], completed_at=row[8],
                        result=json.loads(row[9]) if row[9] else None,
                        retry_count=row[10], timeout=row[11]
                    ))
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju čakajočih nalog: {e}")
        return tasks
    
    def update_task(self, task: Task) -> bool:
        """Posodobi nalogo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    UPDATE tasks SET 
                    type = ?, data = ?, priority = ?, status = ?, assigned_angel = ?,
                    assigned_at = ?, completed_at = ?, result = ?, retry_count = ?, timeout = ?
                    WHERE id = ?
                """, (
                    task.type, json.dumps(task.data), task.priority, task.status,
                    task.assigned_angel, task.assigned_at, task.completed_at,
                    json.dumps(task.result) if task.result else None,
                    task.retry_count, task.timeout, task.id
                ))
            return True
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju naloge {task.id}: {e}")
            return False

class AngelTaskDistributionSystem:
    """Glavni sistem za razporeditev nalog"""
    
    def __init__(self):
        self.config = CONFIG
        self.db = TaskDatabase(CONFIG["database"]["path"])
        self.app = Flask(__name__)
        self.running = False
        self.task_queue = PriorityQueue()
        self.active_tasks = {}
        
        # Nastavi API endpoints
        self.setup_routes()
        
        logger.info("🔹 Angel Task Distribution System inicializiran")
    
    def setup_routes(self):
        """Nastavi Flask API routes"""
        
        @self.app.route('/api/tasks', methods=['POST'])
        def create_task():
            try:
                data = request.get_json()
                
                task = Task(
                    id=str(uuid.uuid4()),
                    type=data.get('type'),
                    data=data.get('data', {}),
                    priority=data.get('priority', TaskPriority.MEDIUM.value),
                    status=TaskStatus.PENDING.value,
                    created_at=datetime.now().isoformat(),
                    timeout=data.get('timeout', 600)
                )
                
                if self.db.create_task(task):
                    # Dodaj v queue za razporeditev
                    self.task_queue.put((-task.priority, task.created_at, task))
                    logger.info(f"✅ Naloga {task.type} ({task.id}) ustvarjena")
                    return jsonify({"status": "success", "task_id": task.id})
                else:
                    return jsonify({"status": "error", "message": "Task creation failed"}), 500
                    
            except Exception as e:
                logger.error(f"Napaka pri ustvarjanju naloge: {e}")
                return jsonify({"status": "error", "message": str(e)}), 400
        
        @self.app.route('/api/tasks/<task_id>', methods=['GET'])
        def get_task(task_id):
            try:
                task = self.db.get_task(task_id)
                if task:
                    return jsonify({"status": "success", "task": asdict(task)})
                else:
                    return jsonify({"status": "error", "message": "Task not found"}), 404
            except Exception as e:
                logger.error(f"Napaka pri pridobivanju naloge: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/tasks/<task_id>/complete', methods=['POST'])
        def complete_task(task_id):
            try:
                data = request.get_json()
                task = self.db.get_task(task_id)
                
                if not task:
                    return jsonify({"status": "error", "message": "Task not found"}), 404
                
                task.status = TaskStatus.COMPLETED.value
                task.completed_at = datetime.now().isoformat()
                task.result = data.get('result', {})
                
                if self.db.update_task(task):
                    # Odstrani iz aktivnih nalog
                    if task_id in self.active_tasks:
                        del self.active_tasks[task_id]
                    
                    logger.info(f"✅ Naloga {task.type} ({task_id}) dokončana")
                    return jsonify({"status": "success"})
                else:
                    return jsonify({"status": "error", "message": "Task update failed"}), 500
                    
            except Exception as e:
                logger.error(f"Napaka pri dokončevanju naloge: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/tasks/pending', methods=['GET'])
        def get_pending_tasks():
            try:
                tasks = self.db.get_pending_tasks()
                return jsonify({
                    "status": "success",
                    "tasks": [asdict(task) for task in tasks],
                    "count": len(tasks)
                })
            except Exception as e:
                logger.error(f"Napaka pri pridobivanju čakajočih nalog: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        @self.app.route('/api/status', methods=['GET'])
        def system_status():
            try:
                pending_tasks = len(self.db.get_pending_tasks())
                active_tasks = len(self.active_tasks)
                
                return jsonify({
                    "status": "active",
                    "system": "Angel Task Distribution System",
                    "version": "2.0",
                    "pending_tasks": pending_tasks,
                    "active_tasks": active_tasks,
                    "queue_size": self.task_queue.qsize(),
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                logger.error(f"Napaka pri status preverjanju: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500
    
    def get_available_angels(self) -> List[Dict]:
        """Pridobi dostopne Angel-e"""
        try:
            response = requests.get(f"{CONFIG['angels']['integration_api']}/angels", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return [angel for angel in data.get('angels', []) if angel.get('status') == 'active']
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju Angel-ov: {e}")
        return []
    
    def assign_task_to_angel(self, task: Task, angel: Dict) -> bool:
        """Dodeli nalogo Angel-u"""
        try:
            # Posodobi nalogo
            task.status = TaskStatus.ASSIGNED.value
            task.assigned_angel = angel['id']
            task.assigned_at = datetime.now().isoformat()
            
            if self.db.update_task(task):
                self.active_tasks[task.id] = task
                logger.info(f"📋 Naloga {task.type} dodeljena Angel-u {angel['name']}")
                return True
                
        except Exception as e:
            logger.error(f"Napaka pri dodeljevanju naloge: {e}")
        return False
    
    def start_task_distributor(self):
        """Zagon razporeditelja nalog"""
        def distribute():
            while self.running:
                try:
                    if not self.task_queue.empty():
                        # Pridobi nalogo iz queue
                        priority, created_at, task = self.task_queue.get(timeout=1)
                        
                        # Pridobi dostopne Angel-e
                        angels = self.get_available_angels()
                        
                        if angels:
                            # Izberi najboljšega Angel-a (load balancing)
                            best_angel = self.select_best_angel(angels, task)
                            
                            if best_angel and self.assign_task_to_angel(task, best_angel):
                                logger.info(f"✅ Naloga {task.id} uspešno dodeljena")
                            else:
                                # Vrni nalogo v queue
                                self.task_queue.put((priority, created_at, task))
                                time.sleep(5)
                        else:
                            # Ni dostopnih Angel-ov, vrni nalogo v queue
                            self.task_queue.put((priority, created_at, task))
                            time.sleep(10)
                    else:
                        time.sleep(1)
                        
                except Exception as e:
                    logger.error(f"Napaka v razporeditelju nalog: {e}")
                    time.sleep(5)
        
        distributor_thread = threading.Thread(target=distribute, daemon=True)
        distributor_thread.start()
        logger.info("📋 Razporeditelj nalog zagnan")
    
    def select_best_angel(self, angels: List[Dict], task: Task) -> Optional[Dict]:
        """Izberi najboljšega Angel-a za nalogo"""
        if not angels:
            return None
        
        # Enostavna logika - izberi Angel-a z najmanj nalogami
        # V produkciji bi to bilo bolj sofisticirano
        best_angel = None
        min_tasks = float('inf')
        
        for angel in angels:
            # Preštej aktivne naloge za tega Angel-a
            angel_tasks = sum(1 for t in self.active_tasks.values() if t.assigned_angel == angel['id'])
            
            if angel_tasks < min_tasks:
                min_tasks = angel_tasks
                best_angel = angel
        
        return best_angel
    
    def start_timeout_monitor(self):
        """Zagon monitorja za timeout nalog"""
        def monitor():
            while self.running:
                try:
                    current_time = datetime.now()
                    expired_tasks = []
                    
                    for task_id, task in self.active_tasks.items():
                        if task.assigned_at:
                            assigned_time = datetime.fromisoformat(task.assigned_at)
                            if (current_time - assigned_time).seconds > task.timeout:
                                expired_tasks.append(task)
                    
                    # Obravnavaj potekle naloge
                    for task in expired_tasks:
                        logger.warning(f"⏰ Naloga {task.id} je potekla")
                        task.status = TaskStatus.FAILED.value
                        task.retry_count += 1
                        
                        if task.retry_count < CONFIG["distribution"]["retry_attempts"]:
                            # Ponovno dodeli nalogo
                            task.status = TaskStatus.PENDING.value
                            task.assigned_angel = None
                            task.assigned_at = None
                            self.task_queue.put((-task.priority, task.created_at, task))
                        
                        self.db.update_task(task)
                        if task.id in self.active_tasks:
                            del self.active_tasks[task.id]
                    
                    time.sleep(30)
                    
                except Exception as e:
                    logger.error(f"Napaka v timeout monitor: {e}")
                    time.sleep(10)
        
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
        logger.info("⏰ Timeout monitor zagnan")
    
    def start(self):
        """Zagon Angel Task Distribution System"""
        logger.info("🚀 Zagon Angel Task Distribution System...")
        
        try:
            self.running = True
            
            # Zagon razporeditelja nalog
            self.start_task_distributor()
            
            # Zagon timeout monitorja
            self.start_timeout_monitor()
            
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
        logger.info("🛑 Zaustavitev Angel Task Distribution System...")
        self.running = False

def main():
    """Glavna funkcija"""
    print("=" * 60)
    print("🔹 ANGEL TASK DISTRIBUTION SYSTEM - Python Edition")
    print("   Sistem za razporeditev nalog med Angel-e")
    print("=" * 60)
    
    try:
        system = AngelTaskDistributionSystem()
        system.start()
        
    except KeyboardInterrupt:
        logger.info("⏹️ Prekinitev sistema...")
    except Exception as e:
        logger.error(f"❌ Kritična napaka: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()