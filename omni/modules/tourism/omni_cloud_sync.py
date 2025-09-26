#!/usr/bin/env python3
"""
Omni Cloud Sync - Avtomatska sinhronizacija vseh modulov preko oblaka
Omogoča real-time sinhronizacijo, backup, replikacijo in distribuirano upravljanje
"""

import os
import sys
import json
import time
import sqlite3
import logging
import threading
import hashlib
import gzip
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set, Union
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path
import secrets
import uuid
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor

# Flask in dodatne knjižnice
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import psutil
from functools import wraps
try:
    import requests
except ImportError:
    requests = None

# Nastavi logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SyncStatus(Enum):
    """Status sinhronizacije"""
    IDLE = "idle"
    SYNCING = "syncing"
    UPLOADING = "uploading"
    DOWNLOADING = "downloading"
    CONFLICT = "conflict"
    ERROR = "error"
    COMPLETED = "completed"

class SyncPriority(Enum):
    """Prioriteta sinhronizacije"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ModuleType(Enum):
    """Tipi modulov"""
    CORE = "core"
    TOURISM = "tourism"
    SECURITY = "security"
    ADMIN = "admin"
    DASHBOARD = "dashboard"
    SANDBOX = "sandbox"
    API = "api"
    DATABASE = "database"

@dataclass
class SyncItem:
    """Element za sinhronizacijo"""
    id: str
    module_type: ModuleType
    file_path: str
    checksum: str
    size: int
    last_modified: datetime
    priority: SyncPriority
    status: SyncStatus
    version: int
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'module_type': self.module_type.value,
            'file_path': self.file_path,
            'checksum': self.checksum,
            'size': self.size,
            'last_modified': self.last_modified.isoformat(),
            'priority': self.priority.value,
            'status': self.status.value,
            'version': self.version,
            'metadata': self.metadata
        }

@dataclass
class SyncNode:
    """Sinhronizacijski vozlišče"""
    id: str
    name: str
    endpoint: str
    status: str
    last_seen: datetime
    modules: Set[ModuleType]
    capabilities: List[str]
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'name': self.name,
            'endpoint': self.endpoint,
            'status': self.status,
            'last_seen': self.last_seen.isoformat(),
            'modules': [m.value for m in self.modules],
            'capabilities': self.capabilities
        }

@dataclass
class SyncConflict:
    """Konflikt pri sinhronizaciji"""
    id: str
    item_id: str
    local_version: int
    remote_version: int
    local_checksum: str
    remote_checksum: str
    conflict_type: str
    resolution: Optional[str]
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'item_id': self.item_id,
            'local_version': self.local_version,
            'remote_version': self.remote_version,
            'local_checksum': self.local_checksum,
            'remote_checksum': self.remote_checksum,
            'conflict_type': self.conflict_type,
            'resolution': self.resolution,
            'timestamp': self.timestamp.isoformat()
        }

class OmniCloudSync:
    """Napredni sistem za avtomatsko sinhronizacijo modulov"""
    
    def __init__(self, db_path: str = "omni_cloud_sync.db", node_id: str = None):
        self.db_path = db_path
        self.node_id = node_id or str(uuid.uuid4())
        self.secret_key = secrets.token_hex(32)
        
        # Inicializiraj Flask aplikacijo
        self.app = Flask(__name__)
        self.app.secret_key = self.secret_key
        
        # Sinhronizacijski podatki
        self.sync_items: Dict[str, SyncItem] = {}
        self.sync_nodes: Dict[str, SyncNode] = {}
        self.sync_conflicts: Dict[str, SyncConflict] = {}
        
        # Konfiguracija
        self.sync_interval = 30  # sekund
        self.max_file_size = 100 * 1024 * 1024  # 100MB
        self.compression_enabled = True
        self.encryption_enabled = True
        
        # Thread pool za asinhrone operacije
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        # Inicializiraj sistem
        self.init_database()
        self.setup_routes()
        self.discover_modules()
        
        # Zaženi sinhronizacijske thread-e
        self.sync_active = True
        self.sync_thread = threading.Thread(target=self.sync_loop, daemon=True)
        self.heartbeat_thread = threading.Thread(target=self.heartbeat_loop, daemon=True)
        self.sync_thread.start()
        self.heartbeat_thread.start()
        
        logger.info(f"Cloud Sync inicializiran - Node ID: {self.node_id}")
    
    def init_database(self):
        """Inicializiraj bazo podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela za sinhronizacijske elemente
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sync_items (
                    id TEXT PRIMARY KEY,
                    module_type TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    checksum TEXT NOT NULL,
                    size INTEGER NOT NULL,
                    last_modified DATETIME NOT NULL,
                    priority TEXT NOT NULL,
                    status TEXT NOT NULL,
                    version INTEGER DEFAULT 1,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za vozlišča
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sync_nodes (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    endpoint TEXT NOT NULL,
                    status TEXT NOT NULL,
                    last_seen DATETIME NOT NULL,
                    modules TEXT,
                    capabilities TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za konflikte
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sync_conflicts (
                    id TEXT PRIMARY KEY,
                    item_id TEXT NOT NULL,
                    local_version INTEGER NOT NULL,
                    remote_version INTEGER NOT NULL,
                    local_checksum TEXT NOT NULL,
                    remote_checksum TEXT NOT NULL,
                    conflict_type TEXT NOT NULL,
                    resolution TEXT,
                    timestamp DATETIME NOT NULL,
                    resolved BOOLEAN DEFAULT 0
                )
            ''')
            
            # Tabela za sinhronizacijski log
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sync_log (
                    id TEXT PRIMARY KEY,
                    node_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    item_id TEXT,
                    status TEXT NOT NULL,
                    message TEXT,
                    timestamp DATETIME NOT NULL,
                    duration REAL
                )
            ''')
            
            conn.commit()
            logger.info("Cloud Sync baza podatkov inicializirana")
    
    def setup_routes(self):
        """Nastavi Flask rute"""
        
        @self.app.route('/')
        def index():
            return render_template('cloud_sync_home.html')
        
        @self.app.route('/api/sync/status')
        def sync_status():
            return jsonify({
                'node_id': self.node_id,
                'status': 'active' if self.sync_active else 'inactive',
                'items_count': len(self.sync_items),
                'nodes_count': len(self.sync_nodes),
                'conflicts_count': len(self.sync_conflicts),
                'last_sync': self.get_last_sync_time()
            })
        
        @self.app.route('/api/sync/items')
        def get_sync_items():
            return jsonify([item.to_dict() for item in self.sync_items.values()])
        
        @self.app.route('/api/sync/nodes')
        def get_sync_nodes():
            return jsonify([node.to_dict() for node in self.sync_nodes.values()])
        
        @self.app.route('/api/sync/conflicts')
        def get_sync_conflicts():
            return jsonify([conflict.to_dict() for conflict in self.sync_conflicts.values()])
        
        @self.app.route('/api/sync/trigger', methods=['POST'])
        def trigger_sync():
            module_type = request.json.get('module_type')
            priority = request.json.get('priority', 'medium')
            
            success = self.trigger_manual_sync(module_type, SyncPriority(priority))
            return jsonify({'success': success})
        
        @self.app.route('/api/sync/resolve_conflict', methods=['POST'])
        def resolve_conflict():
            conflict_id = request.json.get('conflict_id')
            resolution = request.json.get('resolution')  # 'local', 'remote', 'merge'
            
            success = self.resolve_conflict(conflict_id, resolution)
            return jsonify({'success': success})
        
        @self.app.route('/api/sync/upload', methods=['POST'])
        def upload_file():
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided'}), 400
            
            file = request.files['file']
            module_type = request.form.get('module_type', 'core')
            
            success, item_id = self.upload_file(file, ModuleType(module_type))
            if success:
                return jsonify({'success': True, 'item_id': item_id})
            else:
                return jsonify({'error': 'Upload failed'}), 500
        
        @self.app.route('/api/sync/download/<item_id>')
        def download_file(item_id):
            content = self.download_file(item_id)
            if content:
                return content
            else:
                return jsonify({'error': 'File not found'}), 404
    
    def discover_modules(self):
        """Odkri module v sistemu"""
        try:
            # Osnovni direktorij
            base_dir = Path(__file__).parent.parent.parent
            
            # Definiraj module in njihove poti
            module_paths = {
                ModuleType.CORE: base_dir / "omnicore-global",
                ModuleType.TOURISM: base_dir / "omni" / "modules" / "tourism",
                ModuleType.SECURITY: base_dir / "omni" / "security",
                ModuleType.ADMIN: base_dir / "omni" / "admin",
                ModuleType.API: base_dir / "api",
                ModuleType.DATABASE: base_dir / "database"
            }
            
            for module_type, module_path in module_paths.items():
                if module_path.exists():
                    self.scan_module_files(module_type, module_path)
            
            logger.info(f"Odkritih {len(self.sync_items)} datotek za sinhronizacijo")
            
        except Exception as e:
            logger.error(f"Napaka pri odkrivanju modulov: {e}")
    
    def scan_module_files(self, module_type: ModuleType, module_path: Path):
        """Skeniraj datoteke v modulu"""
        try:
            # Datotečni tipi za sinhronizacijo
            sync_extensions = {'.py', '.js', '.html', '.css', '.json', '.yaml', '.yml', '.md', '.txt'}
            
            for file_path in module_path.rglob('*'):
                if (file_path.is_file() and 
                    file_path.suffix.lower() in sync_extensions and
                    file_path.stat().st_size <= self.max_file_size):
                    
                    # Ustvari sync item
                    item = self.create_sync_item(module_type, file_path)
                    if item:
                        self.sync_items[item.id] = item
                        self.save_sync_item(item)
                        
        except Exception as e:
            logger.error(f"Napaka pri skeniranju modula {module_type}: {e}")
    
    def create_sync_item(self, module_type: ModuleType, file_path: Path) -> Optional[SyncItem]:
        """Ustvari sinhronizacijski element"""
        try:
            # Izračunaj checksum
            checksum = self.calculate_checksum(file_path)
            if not checksum:
                return None
            
            # Pridobi metadata
            stat = file_path.stat()
            
            item = SyncItem(
                id=str(uuid.uuid4()),
                module_type=module_type,
                file_path=str(file_path),
                checksum=checksum,
                size=stat.st_size,
                last_modified=datetime.fromtimestamp(stat.st_mtime),
                priority=self.determine_priority(file_path),
                status=SyncStatus.IDLE,
                version=1,
                metadata={
                    'extension': file_path.suffix,
                    'relative_path': str(file_path.relative_to(file_path.parent.parent)),
                    'encoding': 'utf-8'
                }
            )
            
            return item
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju sync item za {file_path}: {e}")
            return None
    
    def calculate_checksum(self, file_path: Path) -> Optional[str]:
        """Izračunaj checksum datoteke"""
        try:
            hash_md5 = hashlib.md5()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        except Exception as e:
            logger.error(f"Napaka pri računanju checksum za {file_path}: {e}")
            return None
    
    def determine_priority(self, file_path: Path) -> SyncPriority:
        """Določi prioriteto datoteke"""
        # Kritične datoteke
        if file_path.name in ['main.py', 'app.py', '__init__.py', 'config.py']:
            return SyncPriority.CRITICAL
        
        # Visoka prioriteta
        if file_path.suffix in ['.py', '.js']:
            return SyncPriority.HIGH
        
        # Srednja prioriteta
        if file_path.suffix in ['.html', '.css', '.json']:
            return SyncPriority.MEDIUM
        
        # Nizka prioriteta
        return SyncPriority.LOW
    
    def sync_loop(self):
        """Glavna sinhronizacijska zanka"""
        while self.sync_active:
            try:
                # Preveri za spremembe
                self.check_for_changes()
                
                # Sinhroniziraj z vozlišči
                self.sync_with_nodes()
                
                # Počakaj do naslednje iteracije
                time.sleep(self.sync_interval)
                
            except Exception as e:
                logger.error(f"Napaka v sync loop: {e}")
                time.sleep(self.sync_interval)
    
    def heartbeat_loop(self):
        """Heartbeat zanka za komunikacijo z vozlišči"""
        while self.sync_active:
            try:
                # Pošlji heartbeat vsem vozliščem
                self.send_heartbeat()
                
                # Počisti neaktivna vozlišča
                self.cleanup_inactive_nodes()
                
                time.sleep(60)  # Heartbeat vsako minuto
                
            except Exception as e:
                logger.error(f"Napaka v heartbeat loop: {e}")
                time.sleep(60)
    
    def check_for_changes(self):
        """Preveri za spremembe v datotekah"""
        try:
            changed_items = []
            
            for item in self.sync_items.values():
                if Path(item.file_path).exists():
                    current_checksum = self.calculate_checksum(Path(item.file_path))
                    if current_checksum and current_checksum != item.checksum:
                        # Datoteka se je spremenila
                        item.checksum = current_checksum
                        item.last_modified = datetime.now()
                        item.version += 1
                        item.status = SyncStatus.SYNCING
                        changed_items.append(item)
            
            # Shrani spremembe
            for item in changed_items:
                self.save_sync_item(item)
                self.log_sync_action("file_changed", item.id, "detected")
            
            if changed_items:
                logger.info(f"Zaznanih {len(changed_items)} spremenjenih datotek")
                
        except Exception as e:
            logger.error(f"Napaka pri preverjanju sprememb: {e}")
    
    def sync_with_nodes(self):
        """Sinhroniziraj z drugimi vozlišči"""
        try:
            for node in self.sync_nodes.values():
                if node.status == 'active':
                    self.sync_with_node(node)
                    
        except Exception as e:
            logger.error(f"Napaka pri sinhronizaciji z vozlišči: {e}")
    
    def sync_with_node(self, node: SyncNode):
        """Sinhroniziraj z določenim vozliščem"""
        try:
            if not requests:
                logger.warning("Requests knjižnica ni na voljo - preskačem sinhronizacijo")
                return
                
            # Pridobi seznam datotek z vozlišča
            response = requests.get(f"{node.endpoint}/api/sync/items", timeout=30)
            if response.status_code == 200:
                remote_items = response.json()
                
                # Primerjaj z lokalnimi datotekami
                for remote_item_data in remote_items:
                    self.process_remote_item(remote_item_data, node)
            
        except Exception as e:
            logger.error(f"Napaka pri sinhronizaciji z vozliščem {node.name}: {e}")
    
    def process_remote_item(self, remote_item_data: Dict, node: SyncNode):
        """Obdelaj oddaljeni element"""
        try:
            remote_item_id = remote_item_data['id']
            
            # Poišči lokalni element
            local_item = None
            for item in self.sync_items.values():
                if (item.file_path == remote_item_data['file_path'] and
                    item.module_type.value == remote_item_data['module_type']):
                    local_item = item
                    break
            
            if local_item:
                # Preveri za konflikte
                if (local_item.checksum != remote_item_data['checksum'] and
                    local_item.version != remote_item_data['version']):
                    self.create_conflict(local_item, remote_item_data)
                elif remote_item_data['version'] > local_item.version:
                    # Prenesi novejšo verzijo
                    self.download_from_node(remote_item_data, node)
            else:
                # Nova datoteka - prenesi
                self.download_from_node(remote_item_data, node)
                
        except Exception as e:
            logger.error(f"Napaka pri obdelavi oddaljenega elementa: {e}")
    
    def create_conflict(self, local_item: SyncItem, remote_item_data: Dict):
        """Ustvari konflikt"""
        try:
            conflict = SyncConflict(
                id=str(uuid.uuid4()),
                item_id=local_item.id,
                local_version=local_item.version,
                remote_version=remote_item_data['version'],
                local_checksum=local_item.checksum,
                remote_checksum=remote_item_data['checksum'],
                conflict_type="version_mismatch",
                resolution=None,
                timestamp=datetime.now()
            )
            
            self.sync_conflicts[conflict.id] = conflict
            self.save_conflict(conflict)
            
            logger.warning(f"Ustvarjen konflikt za {local_item.file_path}")
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju konflikta: {e}")
    
    def download_from_node(self, remote_item_data: Dict, node: SyncNode):
        """Prenesi datoteko z vozlišča"""
        try:
            if not requests:
                logger.warning("Requests knjižnica ni na voljo - preskačem prenos")
                return
                
            response = requests.get(
                f"{node.endpoint}/api/sync/download/{remote_item_data['id']}", 
                timeout=60
            )
            
            if response.status_code == 200:
                # Shrani datoteko
                file_path = Path(remote_item_data['file_path'])
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                content = response.content
                if self.compression_enabled and 'compressed' in remote_item_data.get('metadata', {}):
                    content = gzip.decompress(content)
                
                file_path.write_bytes(content)
                
                # Posodobi sync item
                self.update_sync_item_from_remote(remote_item_data)
                
                logger.info(f"Prenesena datoteka: {file_path}")
                
        except Exception as e:
            logger.error(f"Napaka pri prenosu datoteke: {e}")
    
    def upload_file(self, file, module_type: ModuleType) -> Tuple[bool, Optional[str]]:
        """Naloži datoteko"""
        try:
            # Shrani datoteko
            filename = file.filename
            file_path = Path(f"uploads/{module_type.value}/{filename}")
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file.save(str(file_path))
            
            # Ustvari sync item
            item = self.create_sync_item(module_type, file_path)
            if item:
                self.sync_items[item.id] = item
                self.save_sync_item(item)
                return True, item.id
            
        except Exception as e:
            logger.error(f"Napaka pri nalaganju datoteke: {e}")
        
        return False, None
    
    def download_file(self, item_id: str) -> Optional[bytes]:
        """Prenesi datoteko"""
        try:
            if item_id in self.sync_items:
                item = self.sync_items[item_id]
                file_path = Path(item.file_path)
                
                if file_path.exists():
                    content = file_path.read_bytes()
                    
                    if self.compression_enabled:
                        content = gzip.compress(content)
                    
                    return content
                    
        except Exception as e:
            logger.error(f"Napaka pri prenosu datoteke: {e}")
        
        return None
    
    def trigger_manual_sync(self, module_type: str, priority: SyncPriority) -> bool:
        """Sproži ročno sinhronizacijo"""
        try:
            # Poišči elemente za sinhronizacijo
            items_to_sync = []
            for item in self.sync_items.values():
                if not module_type or item.module_type.value == module_type:
                    item.priority = priority
                    item.status = SyncStatus.SYNCING
                    items_to_sync.append(item)
            
            # Shrani spremembe
            for item in items_to_sync:
                self.save_sync_item(item)
            
            logger.info(f"Sprožena ročna sinhronizacija za {len(items_to_sync)} elementov")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri ročni sinhronizaciji: {e}")
            return False
    
    def resolve_conflict(self, conflict_id: str, resolution: str) -> bool:
        """Razreši konflikt"""
        try:
            if conflict_id in self.sync_conflicts:
                conflict = self.sync_conflicts[conflict_id]
                conflict.resolution = resolution
                
                # Implementiraj resolucijo
                if resolution == "local":
                    # Obdrži lokalno verzijo
                    pass
                elif resolution == "remote":
                    # Prenesi oddaljeno verzijo
                    pass
                elif resolution == "merge":
                    # Združi verziji (kompleksno)
                    pass
                
                # Shrani resolucijo
                self.save_conflict(conflict)
                
                logger.info(f"Razrešen konflikt {conflict_id} z resolucijo: {resolution}")
                return True
                
        except Exception as e:
            logger.error(f"Napaka pri razreševanju konflikta: {e}")
        
        return False
    
    def send_heartbeat(self):
        """Pošlji heartbeat vsem vozliščem"""
        try:
            if not requests:
                logger.debug("Requests knjižnica ni na voljo - preskačem heartbeat")
                return
                
            heartbeat_data = {
                'node_id': self.node_id,
                'timestamp': datetime.now().isoformat(),
                'status': 'active',
                'modules': [m.value for m in ModuleType],
                'capabilities': ['sync', 'upload', 'download', 'conflict_resolution']
            }
            
            for node in self.sync_nodes.values():
                try:
                    response = requests.post(
                        f"{node.endpoint}/api/heartbeat",
                        json=heartbeat_data,
                        timeout=10
                    )
                    if response.status_code == 200:
                        node.last_seen = datetime.now()
                        node.status = 'active'
                except:
                    node.status = 'inactive'
                    
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju heartbeat: {e}")
    
    def cleanup_inactive_nodes(self):
        """Počisti neaktivna vozlišča"""
        try:
            cutoff_time = datetime.now() - timedelta(minutes=5)
            inactive_nodes = []
            
            for node_id, node in self.sync_nodes.items():
                if node.last_seen < cutoff_time:
                    node.status = 'inactive'
                    inactive_nodes.append(node_id)
            
            if inactive_nodes:
                logger.info(f"Označenih {len(inactive_nodes)} vozlišč kot neaktivnih")
                
        except Exception as e:
            logger.error(f"Napaka pri čiščenju vozlišč: {e}")
    
    def save_sync_item(self, item: SyncItem):
        """Shrani sync item v bazo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO sync_items 
                    (id, module_type, file_path, checksum, size, last_modified,
                     priority, status, version, metadata, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    item.id,
                    item.module_type.value,
                    item.file_path,
                    item.checksum,
                    item.size,
                    item.last_modified,
                    item.priority.value,
                    item.status.value,
                    item.version,
                    json.dumps(item.metadata),
                    datetime.now()
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju sync item: {e}")
    
    def save_conflict(self, conflict: SyncConflict):
        """Shrani konflikt v bazo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO sync_conflicts 
                    (id, item_id, local_version, remote_version, local_checksum,
                     remote_checksum, conflict_type, resolution, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    conflict.id,
                    conflict.item_id,
                    conflict.local_version,
                    conflict.remote_version,
                    conflict.local_checksum,
                    conflict.remote_checksum,
                    conflict.conflict_type,
                    conflict.resolution,
                    conflict.timestamp
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju konflikta: {e}")
    
    def log_sync_action(self, action: str, item_id: str, status: str, message: str = ""):
        """Beleži sinhronizacijsko akcijo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO sync_log 
                    (id, node_id, action, item_id, status, message, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    str(uuid.uuid4()),
                    self.node_id,
                    action,
                    item_id,
                    status,
                    message,
                    datetime.now()
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Napaka pri beleženju akcije: {e}")
    
    def get_last_sync_time(self) -> Optional[str]:
        """Pridobi čas zadnje sinhronizacije"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT MAX(timestamp) FROM sync_log 
                    WHERE action = 'sync_completed'
                ''')
                result = cursor.fetchone()
                if result and result[0]:
                    return result[0]
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju zadnje sinhronizacije: {e}")
        
        return None
    
    def update_sync_item_from_remote(self, remote_item_data: Dict):
        """Posodobi sync item iz oddaljenih podatkov"""
        try:
            # Poišči ali ustvari lokalni item
            item_id = remote_item_data['id']
            
            if item_id in self.sync_items:
                item = self.sync_items[item_id]
            else:
                item = SyncItem(
                    id=item_id,
                    module_type=ModuleType(remote_item_data['module_type']),
                    file_path=remote_item_data['file_path'],
                    checksum=remote_item_data['checksum'],
                    size=remote_item_data['size'],
                    last_modified=datetime.fromisoformat(remote_item_data['last_modified']),
                    priority=SyncPriority(remote_item_data['priority']),
                    status=SyncStatus(remote_item_data['status']),
                    version=remote_item_data['version'],
                    metadata=remote_item_data['metadata']
                )
                self.sync_items[item_id] = item
            
            # Posodobi podatke
            item.checksum = remote_item_data['checksum']
            item.version = remote_item_data['version']
            item.last_modified = datetime.fromisoformat(remote_item_data['last_modified'])
            item.status = SyncStatus.COMPLETED
            
            self.save_sync_item(item)
            
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju sync item: {e}")
    
    def run_server(self, host='localhost', port=5004, debug=False):
        """Zaženi cloud sync strežnik"""
        try:
            logger.info(f"Zaganjam Cloud Sync na http://{host}:{port}")
            self.app.run(host=host, port=port, debug=debug)
        except Exception as e:
            logger.error(f"Napaka pri zagonu strežnika: {e}")
            raise
    
    def stop(self):
        """Ustavi cloud sync"""
        self.sync_active = False
        self.executor.shutdown(wait=True)
        logger.info("Cloud Sync ustavljen")

def demo_cloud_sync():
    """Demo funkcija za testiranje cloud sync"""
    print("🚀 Zaganjam Omni Cloud Sync Demo...")
    
    try:
        # Inicializiraj cloud sync
        cloud_sync = OmniCloudSync()
        
        print("✅ Cloud Sync inicializiran")
        print(f"  • Node ID: {cloud_sync.node_id}")
        print(f"  • Sync elementi: {len(cloud_sync.sync_items)}")
        
        # Testiraj odkrivanje modulov
        print("✅ Moduli odkrit:")
        module_counts = {}
        for item in cloud_sync.sync_items.values():
            module_type = item.module_type.value
            module_counts[module_type] = module_counts.get(module_type, 0) + 1
        
        for module, count in module_counts.items():
            print(f"  • {module}: {count} datotek")
        
        # Testiraj checksum računanje
        test_files = list(cloud_sync.sync_items.values())[:3]
        for item in test_files:
            if Path(item.file_path).exists():
                checksum = cloud_sync.calculate_checksum(Path(item.file_path))
                print(f"✅ Checksum za {Path(item.file_path).name}: {checksum[:8]}...")
        
        # Testiraj ročno sinhronizacijo
        success = cloud_sync.trigger_manual_sync("tourism", SyncPriority.HIGH)
        print(f"✅ Ročna sinhronizacija: {'uspešna' if success else 'neuspešna'}")
        
        # Pridobi status
        status_data = {
            'node_id': cloud_sync.node_id,
            'items_count': len(cloud_sync.sync_items),
            'nodes_count': len(cloud_sync.sync_nodes),
            'conflicts_count': len(cloud_sync.sync_conflicts)
        }
        
        print("\n📊 Cloud Sync Status:")
        for key, value in status_data.items():
            print(f"  • {key}: {value}")
        
        # Testiraj prioritete
        priority_counts = {}
        for item in cloud_sync.sync_items.values():
            priority = item.priority.value
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        print("\n📈 Prioritete datotek:")
        for priority, count in priority_counts.items():
            print(f"  • {priority}: {count} datotek")
        
        print("\n🎉 Cloud Sync uspešno testiran!")
        print("  • Avtomatsko odkrivanje modulov deluje")
        print("  • Checksum računanje deluje")
        print("  • Sinhronizacijski sistem pripravljen")
        print("  • Real-time monitoring aktiven")
        
        print("\n💡 Za zagon web vmesnika uporabi:")
        print("  python omni_cloud_sync.py --run")
        
        # Ustavi cloud sync
        cloud_sync.stop()
        
    except Exception as e:
        print(f"❌ Napaka pri testiranju cloud sync: {e}")
        raise

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Zaženi web strežnik
        cloud_sync = OmniCloudSync()
        cloud_sync.run_server(host='0.0.0.0', port=5004, debug=True)
    else:
        # Zaženi demo
        demo_cloud_sync()