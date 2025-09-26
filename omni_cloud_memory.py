#!/usr/bin/env python3
"""
Omni Cloud Memory - Oblačni pomnilniški sistem
Upravljanje vseh podatkovnih tokov: transakcije, rezervacije, logi, naloge, analitika, učni vzorci
"""

import asyncio
import json
import logging
import sqlite3
import redis
import hashlib
import gzip
import pickle
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
import threading
import time
from pathlib import Path

logger = logging.getLogger('OmniCloudMemory')

class DataCategory(Enum):
    TRANSACTIONS = "transactions"
    RESERVATIONS = "reservations"
    LOGS = "logs"
    TASKS = "tasks"
    ANALYTICS = "analytics"
    LEARNING_PATTERNS = "learning_patterns"
    USER_DATA = "user_data"
    SYSTEM_METRICS = "system_metrics"
    CACHE = "cache"

class StorageType(Enum):
    MEMORY = "memory"  # Redis
    PERSISTENT = "persistent"  # SQLite
    ARCHIVE = "archive"  # Compressed files

@dataclass
class DataEntry:
    id: str
    category: DataCategory
    data: Any
    metadata: Dict[str, Any]
    created_at: datetime
    expires_at: Optional[datetime] = None
    storage_type: StorageType = StorageType.PERSISTENT
    compressed: bool = False

class OmniCloudMemory:
    """Centralni oblačni pomnilniški sistem"""
    
    def __init__(self, redis_host="localhost", redis_port=6379, db_path="omni_cloud_memory.db"):
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.db_path = db_path
        self.redis_client = None
        self.sqlite_conn = None
        
        # Konfiguracija shranjevanja po kategorijah
        self.storage_config = {
            DataCategory.TRANSACTIONS: {
                "storage_type": StorageType.PERSISTENT,
                "retention_days": 365,
                "compress_after_days": 30
            },
            DataCategory.RESERVATIONS: {
                "storage_type": StorageType.PERSISTENT,
                "retention_days": 180,
                "compress_after_days": 30
            },
            DataCategory.LOGS: {
                "storage_type": StorageType.MEMORY,
                "retention_days": 7,
                "compress_after_days": 1
            },
            DataCategory.TASKS: {
                "storage_type": StorageType.MEMORY,
                "retention_days": 30,
                "compress_after_days": 7
            },
            DataCategory.ANALYTICS: {
                "storage_type": StorageType.PERSISTENT,
                "retention_days": 90,
                "compress_after_days": 14
            },
            DataCategory.LEARNING_PATTERNS: {
                "storage_type": StorageType.PERSISTENT,
                "retention_days": -1,  # Nikoli ne izbriši
                "compress_after_days": 90
            },
            DataCategory.USER_DATA: {
                "storage_type": StorageType.PERSISTENT,
                "retention_days": -1,
                "compress_after_days": -1
            },
            DataCategory.SYSTEM_METRICS: {
                "storage_type": StorageType.MEMORY,
                "retention_days": 14,
                "compress_after_days": 3
            },
            DataCategory.CACHE: {
                "storage_type": StorageType.MEMORY,
                "retention_days": 1,
                "compress_after_days": -1
            }
        }
        
        self.is_running = False
        self.cleanup_thread = None
        
    async def initialize(self):
        """Inicializacija oblačnega pomnilnika"""
        try:
            # Inicializacija Redis
            self.redis_client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                decode_responses=True,
                socket_connect_timeout=5
            )
            self.redis_client.ping()
            logger.info("Redis povezava uspešna")
        except Exception as e:
            logger.warning(f"Redis ni dosegljiv, uporabljam samo SQLite: {e}")
            self.redis_client = None
        
        # Inicializacija SQLite
        self.init_sqlite_database()
        
        # Zagon cleanup procesa
        self.is_running = True
        self.cleanup_thread = threading.Thread(target=self._cleanup_worker, daemon=True)
        self.cleanup_thread.start()
        
        logger.info("Omni Cloud Memory inicializiran")
    
    def init_sqlite_database(self):
        """Inicializacija SQLite baze"""
        self.sqlite_conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = self.sqlite_conn.cursor()
        
        # Glavna tabela za podatke
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cloud_data (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                data BLOB,
                metadata TEXT,
                created_at TIMESTAMP,
                expires_at TIMESTAMP,
                storage_type TEXT,
                compressed BOOLEAN DEFAULT 0,
                data_hash TEXT,
                size_bytes INTEGER
            )
        ''')
        
        # Indeksi za hitrejše iskanje
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_category ON cloud_data(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_created_at ON cloud_data(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_expires_at ON cloud_data(expires_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_storage_type ON cloud_data(storage_type)')
        
        # Tabela za statistike
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS storage_stats (
                category TEXT PRIMARY KEY,
                total_entries INTEGER DEFAULT 0,
                total_size_bytes INTEGER DEFAULT 0,
                last_cleanup TIMESTAMP,
                avg_entry_size REAL DEFAULT 0
            )
        ''')
        
        self.sqlite_conn.commit()
        logger.info("SQLite baza inicializirana")
    
    async def store_data(self, category: DataCategory, data: Any, metadata: Optional[Dict[str, Any]] = None, 
                        custom_id: Optional[str] = None, expires_in_hours: Optional[int] = None) -> str:
        """Shrani podatke v oblačni pomnilnik"""
        
        # Generiraj ID
        if custom_id:
            data_id = custom_id
        else:
            data_hash = hashlib.md5(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()
            data_id = f"{category.value}_{int(time.time())}_{data_hash[:8]}"
        
        # Pripravi metadata
        if metadata is None:
            metadata = {}
        metadata.update({
            "source": "omni_brain",
            "version": "1.0",
            "size_original": len(str(data))
        })
        
        # Določi čas poteka
        expires_at = None
        if expires_in_hours:
            expires_at = datetime.now() + timedelta(hours=expires_in_hours)
        elif self.storage_config[category]["retention_days"] > 0:
            expires_at = datetime.now() + timedelta(days=self.storage_config[category]["retention_days"])
        
        # Ustvari data entry
        entry = DataEntry(
            id=data_id,
            category=category,
            data=data,
            metadata=metadata,
            created_at=datetime.now(),
            expires_at=expires_at,
            storage_type=self.storage_config[category]["storage_type"]
        )
        
        # Shrani glede na tip shranjevanja
        if entry.storage_type == StorageType.MEMORY and self.redis_client:
            await self._store_in_redis(entry)
        else:
            await self._store_in_sqlite(entry)
        
        # Posodobi statistike
        await self._update_stats(category, len(str(data)))
        
        logger.debug(f"Shranjeni podatki {data_id} v kategorijo {category.value}")
        return data_id
    
    async def _store_in_redis(self, entry: DataEntry):
        """Shrani v Redis"""
        try:
            key = f"omni:{entry.category.value}:{entry.id}"
            value = {
                "data": entry.data,
                "metadata": entry.metadata,
                "created_at": entry.created_at.isoformat(),
                "expires_at": entry.expires_at.isoformat() if entry.expires_at else None
            }
            
            self.redis_client.set(key, json.dumps(value, default=str))
            
            if entry.expires_at:
                ttl = int((entry.expires_at - datetime.now()).total_seconds())
                if ttl > 0:
                    self.redis_client.expire(key, ttl)
                    
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju v Redis: {e}")
            # Fallback na SQLite
            await self._store_in_sqlite(entry)
    
    async def _store_in_sqlite(self, entry: DataEntry):
        """Shrani v SQLite"""
        try:
            cursor = self.sqlite_conn.cursor()
            
            # Kompresija podatkov če so veliki
            data_bytes = pickle.dumps(entry.data)
            compressed = False
            
            if len(data_bytes) > 1024:  # Kompresija za podatke > 1KB
                data_bytes = gzip.compress(data_bytes)
                compressed = True
            
            data_hash = hashlib.sha256(data_bytes).hexdigest()
            
            cursor.execute('''
                INSERT OR REPLACE INTO cloud_data 
                (id, category, data, metadata, created_at, expires_at, storage_type, compressed, data_hash, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                entry.id,
                entry.category.value,
                data_bytes,
                json.dumps(entry.metadata, default=str),
                entry.created_at,
                entry.expires_at,
                entry.storage_type.value,
                compressed,
                data_hash,
                len(data_bytes)
            ))
            
            self.sqlite_conn.commit()
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju v SQLite: {e}")
            raise
    
    async def retrieve_data(self, data_id: str, category: Optional[DataCategory] = None) -> Optional[Any]:
        """Pridobi podatke iz oblačnega pomnilnika"""
        
        # Poskusi Redis najprej
        if self.redis_client:
            try:
                if category:
                    key = f"omni:{category.value}:{data_id}"
                    result = self.redis_client.get(key)
                    if result:
                        data = json.loads(result)
                        return data["data"]
                else:
                    # Išči po vseh kategorijah
                    for cat in DataCategory:
                        key = f"omni:{cat.value}:{data_id}"
                        result = self.redis_client.get(key)
                        if result:
                            data = json.loads(result)
                            return data["data"]
            except Exception as e:
                logger.warning(f"Napaka pri branju iz Redis: {e}")
        
        # Poskusi SQLite
        try:
            cursor = self.sqlite_conn.cursor()
            
            if category:
                cursor.execute(
                    'SELECT data, compressed FROM cloud_data WHERE id = ? AND category = ?',
                    (data_id, category.value)
                )
            else:
                cursor.execute(
                    'SELECT data, compressed FROM cloud_data WHERE id = ?',
                    (data_id,)
                )
            
            result = cursor.fetchone()
            if result:
                data_bytes, compressed = result
                
                if compressed:
                    data_bytes = gzip.decompress(data_bytes)
                
                return pickle.loads(data_bytes)
                
        except Exception as e:
            logger.error(f"Napaka pri branju iz SQLite: {e}")
        
        return None
    
    async def query_data(self, category: DataCategory, filters: Optional[Dict[str, Any]] = None, 
                        limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Poizvedba podatkov po kategoriji"""
        results = []
        
        try:
            cursor = self.sqlite_conn.cursor()
            
            query = '''
                SELECT id, data, metadata, created_at, compressed 
                FROM cloud_data 
                WHERE category = ?
            '''
            params = [category.value]
            
            # Dodaj filtre
            if filters:
                for key, value in filters.items():
                    if key == "created_after":
                        query += " AND created_at > ?"
                        params.append(value)
                    elif key == "created_before":
                        query += " AND created_at < ?"
                        params.append(value)
            
            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            for row in rows:
                data_id, data_bytes, metadata_str, created_at, compressed = row
                
                # Dekompresija če potrebno
                if compressed:
                    data_bytes = gzip.decompress(data_bytes)
                
                data = pickle.loads(data_bytes)
                metadata = json.loads(metadata_str) if metadata_str else {}
                
                results.append({
                    "id": data_id,
                    "data": data,
                    "metadata": metadata,
                    "created_at": created_at
                })
                
        except Exception as e:
            logger.error(f"Napaka pri poizvedbi: {e}")
        
        return results
    
    async def delete_data(self, data_id: str, category: Optional[DataCategory] = None) -> bool:
        """Izbriši podatke"""
        success = False
        
        # Izbriši iz Redis
        if self.redis_client:
            try:
                if category:
                    key = f"omni:{category.value}:{data_id}"
                    self.redis_client.delete(key)
                else:
                    # Išči po vseh kategorijah
                    for cat in DataCategory:
                        key = f"omni:{cat.value}:{data_id}"
                        self.redis_client.delete(key)
                success = True
            except Exception as e:
                logger.warning(f"Napaka pri brisanju iz Redis: {e}")
        
        # Izbriši iz SQLite
        try:
            cursor = self.sqlite_conn.cursor()
            
            if category:
                cursor.execute('DELETE FROM cloud_data WHERE id = ? AND category = ?', 
                             (data_id, category.value))
            else:
                cursor.execute('DELETE FROM cloud_data WHERE id = ?', (data_id,))
            
            self.sqlite_conn.commit()
            success = cursor.rowcount > 0
            
        except Exception as e:
            logger.error(f"Napaka pri brisanju iz SQLite: {e}")
        
        return success
    
    async def get_storage_stats(self) -> Dict[str, Any]:
        """Pridobi statistike shranjevanja"""
        stats = {}
        
        try:
            cursor = self.sqlite_conn.cursor()
            
            # Statistike po kategorijah
            cursor.execute('''
                SELECT category, COUNT(*) as count, SUM(size_bytes) as total_size, AVG(size_bytes) as avg_size
                FROM cloud_data 
                GROUP BY category
            ''')
            
            category_stats = {}
            for row in cursor.fetchall():
                category, count, total_size, avg_size = row
                category_stats[category] = {
                    "count": count,
                    "total_size_bytes": total_size or 0,
                    "avg_size_bytes": avg_size or 0,
                    "total_size_mb": round((total_size or 0) / 1024 / 1024, 2)
                }
            
            # Skupne statistike
            cursor.execute('SELECT COUNT(*), SUM(size_bytes) FROM cloud_data')
            total_count, total_size = cursor.fetchone()
            
            stats = {
                "total_entries": total_count or 0,
                "total_size_bytes": total_size or 0,
                "total_size_mb": round((total_size or 0) / 1024 / 1024, 2),
                "categories": category_stats,
                "redis_connected": self.redis_client is not None,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju statistik: {e}")
        
        return stats
    
    async def _update_stats(self, category: DataCategory, size_bytes: int):
        """Posodobi statistike"""
        try:
            cursor = self.sqlite_conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO storage_stats 
                (category, total_entries, total_size_bytes, last_cleanup, avg_entry_size)
                VALUES (
                    ?, 
                    COALESCE((SELECT total_entries FROM storage_stats WHERE category = ?), 0) + 1,
                    COALESCE((SELECT total_size_bytes FROM storage_stats WHERE category = ?), 0) + ?,
                    datetime('now'),
                    (COALESCE((SELECT total_size_bytes FROM storage_stats WHERE category = ?), 0) + ?) / 
                    (COALESCE((SELECT total_entries FROM storage_stats WHERE category = ?), 0) + 1)
                )
            ''', (category.value, category.value, category.value, size_bytes, category.value, size_bytes, category.value))
            self.sqlite_conn.commit()
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju statistik: {e}")
    
    def _cleanup_worker(self):
        """Delovni proces za čiščenje starih podatkov"""
        while self.is_running:
            try:
                self._cleanup_expired_data()
                time.sleep(3600)  # Čisti vsako uro
            except Exception as e:
                logger.error(f"Napaka pri čiščenju: {e}")
                time.sleep(300)  # Počakaj 5 minut ob napaki
    
    def _cleanup_expired_data(self):
        """Počisti potekle podatke"""
        try:
            cursor = self.sqlite_conn.cursor()
            
            # Izbriši potekle podatke
            cursor.execute('DELETE FROM cloud_data WHERE expires_at IS NOT NULL AND expires_at < datetime("now")')
            deleted_count = cursor.rowcount
            
            if deleted_count > 0:
                logger.info(f"Počiščenih {deleted_count} poteklih zapisov")
            
            self.sqlite_conn.commit()
            
        except Exception as e:
            logger.error(f"Napaka pri čiščenju: {e}")
    
    async def backup_to_file(self, filepath: str, categories: Optional[List[DataCategory]] = None) -> bool:
        """Ustvari varnostno kopijo v datoteko"""
        try:
            backup_data = {
                "timestamp": datetime.now().isoformat(),
                "version": "1.0",
                "categories": {}
            }
            
            categories_to_backup = categories or list(DataCategory)
            
            for category in categories_to_backup:
                data = await self.query_data(category, limit=10000)  # Maksimalno 10k zapisov na kategorijo
                backup_data["categories"][category.value] = data
            
            # Kompresija in shranjevanje
            with gzip.open(filepath, 'wt', encoding='utf-8') as f:
                json.dump(backup_data, f, default=str, indent=2)
            
            logger.info(f"Varnostna kopija shranjena v {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju varnostne kopije: {e}")
            return False
    
    async def restore_from_file(self, filepath: str) -> bool:
        """Obnovi iz varnostne kopije"""
        try:
            with gzip.open(filepath, 'rt', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            restored_count = 0
            for category_name, entries in backup_data["categories"].items():
                category = DataCategory(category_name)
                
                for entry in entries:
                    await self.store_data(
                        category=category,
                        data=entry["data"],
                        metadata=entry["metadata"],
                        custom_id=entry["id"]
                    )
                    restored_count += 1
            
            logger.info(f"Obnovljenih {restored_count} zapisov iz varnostne kopije")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri obnovi iz varnostne kopije: {e}")
            return False
    
    async def shutdown(self):
        """Varno zaustavitev sistema"""
        logger.info("Zaustavlja Omni Cloud Memory...")
        self.is_running = False
        
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=5)
        
        if self.sqlite_conn:
            self.sqlite_conn.close()
        
        if self.redis_client:
            self.redis_client.close()
        
        logger.info("Omni Cloud Memory zaustavljen")

# Testne funkcije
async def test_cloud_memory():
    """Test oblačnega pomnilnika"""
    memory = OmniCloudMemory()
    await memory.initialize()
    
    print("🔄 Testiranje Omni Cloud Memory...")
    
    # Test shranjevanja
    test_data = {
        "user_id": "test_user",
        "action": "login",
        "timestamp": datetime.now().isoformat(),
        "ip_address": "192.168.1.1"
    }
    
    data_id = await memory.store_data(
        category=DataCategory.LOGS,
        data=test_data,
        metadata={"source": "test", "priority": "low"}
    )
    print(f"✅ Shranjeni podatki z ID: {data_id}")
    
    # Test pridobivanja
    retrieved_data = await memory.retrieve_data(data_id, DataCategory.LOGS)
    print(f"✅ Pridobljeni podatki: {retrieved_data}")
    
    # Test poizvedbe
    query_results = await memory.query_data(DataCategory.LOGS, limit=5)
    print(f"✅ Poizvedba vrnila {len(query_results)} rezultatov")
    
    # Test statistik
    stats = await memory.get_storage_stats()
    print(f"✅ Statistike: {stats}")
    
    await memory.shutdown()

if __name__ == "__main__":
    asyncio.run(test_cloud_memory())