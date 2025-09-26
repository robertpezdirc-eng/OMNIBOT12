#!/usr/bin/env python3
"""
🤖 Thea Advanced Queue System v2.0
Auto Queue + Merge on Demand Implementation

Funkcionalnosti:
1️⃣ Auto-shranjevanje vseh promptov v queue
2️⃣ Sekvenčna obdelava po ukazu "OBDELATI NAJ ZDALEČE"
3️⃣ Merge on demand z ukazom "ZDruži vse skupaj"
4️⃣ Lazy loading za optimalno porabo virov
5️⃣ Napredni monitoring in logging
"""

import asyncio
import json
import time
import uuid
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import pickle
import sqlite3
from contextlib import contextmanager

# Konfiguracija logging sistema
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('thea_advanced_queue.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('TheaAdvancedQueue')

class PromptStatus(Enum):
    """Status promptov v queue"""
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"
    MERGED = "merged"

class Priority(Enum):
    """Prioriteta promptov"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class PromptItem:
    """Struktura prompt elementa v queue"""
    id: str
    content: str
    status: PromptStatus
    priority: Priority
    timestamp: float
    metadata: Dict[str, Any]
    result: Optional[str] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None
    resources_loaded: List[str] = None
    
    def __post_init__(self):
        if self.resources_loaded is None:
            self.resources_loaded = []

class TheaAdvancedQueueSystem:
    """
    🎯 Napredni Thea Queue System
    
    Implementira:
    - Auto-shranjevanje promptov
    - Lazy loading virov
    - Sekvenčno obdelavo
    - Merge on demand
    - Persistent storage
    """
    
    def __init__(self, storage_path: str = "thea_advanced_queue.db"):
        self.storage_path = storage_path
        self.queue: Dict[str, PromptItem] = {}
        self.processing_lock = threading.Lock()
        self.is_processing = False
        self.resource_cache: Dict[str, Any] = {}
        self.merge_results: List[Dict] = []
        
        # Statistike
        self.stats = {
            'total_prompts': 0,
            'processed_prompts': 0,
            'failed_prompts': 0,
            'merge_operations': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }
        
        # Inicializacija
        self._init_database()
        self._load_queue_from_storage()
        
        logger.info("🚀 Thea Advanced Queue System inicializiran")
    
    def _init_database(self):
        """Inicializacija SQLite baze za persistent storage"""
        with sqlite3.connect(self.storage_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS prompt_queue (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    status TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    timestamp REAL NOT NULL,
                    metadata TEXT,
                    result TEXT,
                    error TEXT,
                    processing_time REAL,
                    resources_loaded TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS merge_history (
                    id TEXT PRIMARY KEY,
                    timestamp REAL NOT NULL,
                    prompt_ids TEXT NOT NULL,
                    merged_result TEXT NOT NULL,
                    metadata TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS system_stats (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at REAL NOT NULL
                )
            """)
    
    def _load_queue_from_storage(self):
        """Naloži queue iz persistent storage"""
        try:
            with sqlite3.connect(self.storage_path) as conn:
                cursor = conn.execute("SELECT * FROM prompt_queue")
                for row in cursor.fetchall():
                    prompt_item = PromptItem(
                        id=row[0],
                        content=row[1],
                        status=PromptStatus(row[2]),
                        priority=Priority(row[3]),
                        timestamp=row[4],
                        metadata=json.loads(row[5] or '{}'),
                        result=row[6],
                        error=row[7],
                        processing_time=row[8],
                        resources_loaded=json.loads(row[9] or '[]')
                    )
                    self.queue[prompt_item.id] = prompt_item
                    
            logger.info(f"📥 Naloženih {len(self.queue)} promptov iz storage")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri nalaganju queue: {e}")
    
    def _save_prompt_to_storage(self, prompt: PromptItem):
        """Shrani prompt v persistent storage"""
        try:
            with sqlite3.connect(self.storage_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO prompt_queue 
                    (id, content, status, priority, timestamp, metadata, result, error, processing_time, resources_loaded)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    prompt.id,
                    prompt.content,
                    prompt.status.value,
                    prompt.priority.value,
                    prompt.timestamp,
                    json.dumps(prompt.metadata),
                    prompt.result,
                    prompt.error,
                    prompt.processing_time,
                    json.dumps(prompt.resources_loaded)
                ))
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju prompt: {e}")
    
    def add_prompt(self, content: str, priority: Priority = Priority.MEDIUM, metadata: Dict = None) -> str:
        """
        🔄 AUTO-SHRANJEVANJE PROMPTOV
        
        Vse nove prompte avtomatsko shrani v queue kot "pending"
        """
        prompt_id = str(uuid.uuid4())
        
        prompt_item = PromptItem(
            id=prompt_id,
            content=content,
            status=PromptStatus.PENDING,
            priority=priority,
            timestamp=time.time(),
            metadata=metadata or {},
            resources_loaded=[]
        )
        
        # Shrani v memory queue
        self.queue[prompt_id] = prompt_item
        
        # Shrani v persistent storage
        self._save_prompt_to_storage(prompt_item)
        
        # Posodobi statistike
        self.stats['total_prompts'] += 1
        
        logger.info(f"📝 Prompt dodan v queue: {prompt_id[:8]}... (prioriteta: {priority.name})")
        
        return prompt_id
    
    def _lazy_load_resources(self, prompt: PromptItem) -> Dict[str, Any]:
        """
        🔄 LAZY LOADING VIROV
        
        Naloži le potrebne vire za trenutni prompt
        """
        resources = {}
        
        # Analiziraj prompt za potrebne vire
        content_lower = prompt.content.lower()
        
        # Določi potrebne vire na podlagi vsebine
        if any(keyword in content_lower for keyword in ['analiza', 'podatki', 'statistika']):
            resources['analytics'] = self._load_analytics_data()
            prompt.resources_loaded.append('analytics')
            
        if any(keyword in content_lower for keyword in ['finance', 'denar', 'proračun']):
            resources['finance'] = self._load_finance_data()
            prompt.resources_loaded.append('finance')
            
        if any(keyword in content_lower for keyword in ['turizem', 'potovanje', 'hotel']):
            resources['tourism'] = self._load_tourism_data()
            prompt.resources_loaded.append('tourism')
            
        if any(keyword in content_lower for keyword in ['iot', 'senzor', 'naprava']):
            resources['iot'] = self._load_iot_data()
            prompt.resources_loaded.append('iot')
            
        # Cache hit/miss tracking
        for resource_type in resources:
            if resource_type in self.resource_cache:
                self.stats['cache_hits'] += 1
            else:
                self.stats['cache_misses'] += 1
                self.resource_cache[resource_type] = resources[resource_type]
        
        logger.info(f"🔄 Lazy loaded {len(resources)} virov za prompt {prompt.id[:8]}")
        
        return resources
    
    def _load_analytics_data(self) -> Dict:
        """Simulacija nalaganja analytics podatkov"""
        return {
            'users': 1250,
            'sessions': 3400,
            'conversion_rate': 0.045,
            'revenue': 15600.50
        }
    
    def _load_finance_data(self) -> Dict:
        """Simulacija nalaganja finance podatkov"""
        return {
            'balance': 45000.00,
            'expenses': 12300.50,
            'income': 18900.75,
            'profit_margin': 0.35
        }
    
    def _load_tourism_data(self) -> Dict:
        """Simulacija nalaganja tourism podatkov"""
        return {
            'bookings': 89,
            'occupancy_rate': 0.78,
            'avg_stay': 3.2,
            'satisfaction': 4.6
        }
    
    def _load_iot_data(self) -> Dict:
        """Simulacija nalaganja IoT podatkov"""
        return {
            'active_devices': 156,
            'temperature': 22.5,
            'humidity': 65,
            'alerts': 3
        }
    
    def _process_single_prompt(self, prompt: PromptItem) -> str:
        """
        🔄 OBDELAVA POSAMEZNEGA PROMPTA
        
        Implementira AI processing logiko
        """
        start_time = time.time()
        
        try:
            # Lazy load potrebnih virov
            resources = self._lazy_load_resources(prompt)
            
            # Simulacija AI obdelave
            result_parts = []
            
            # Osnovna obdelava
            result_parts.append(f"🤖 Thea AI Odgovor na: '{prompt.content[:50]}...'")
            
            # Dodaj podatke iz naloženih virov
            for resource_type, data in resources.items():
                if resource_type == 'analytics':
                    result_parts.append(f"📊 Analytics: {data['users']} uporabnikov, {data['conversion_rate']:.1%} konverzija")
                elif resource_type == 'finance':
                    result_parts.append(f"💰 Finance: Bilanca {data['balance']:,.2f}€, Profit {data['profit_margin']:.1%}")
                elif resource_type == 'tourism':
                    result_parts.append(f"🏨 Turizem: {data['bookings']} rezervacij, {data['occupancy_rate']:.1%} zasedenost")
                elif resource_type == 'iot':
                    result_parts.append(f"🌡️ IoT: {data['active_devices']} naprav, {data['temperature']}°C")
            
            # Dodaj kontekstualne informacije
            result_parts.append(f"⏱️ Obdelano v {time.time() - start_time:.2f}s")
            result_parts.append(f"🔧 Uporabljeni viri: {', '.join(prompt.resources_loaded)}")
            
            result = "\n".join(result_parts)
            
            # Shrani processing time
            prompt.processing_time = time.time() - start_time
            
            return result
            
        except Exception as e:
            error_msg = f"❌ Napaka pri obdelavi: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def process_queue_sequential(self) -> Dict[str, Any]:
        """
        🔄 SEKVENČNA OBDELAVA QUEUE
        
        Ukaz: "OBDELATI NAJ ZDALEČE / po vrsti"
        """
        if self.is_processing:
            return {"error": "Obdelava že poteka", "status": "busy"}
        
        with self.processing_lock:
            self.is_processing = True
            
            try:
                # Filtriraj pending prompte in sortiraj po prioriteti in času
                pending_prompts = [
                    p for p in self.queue.values() 
                    if p.status == PromptStatus.PENDING
                ]
                
                if not pending_prompts:
                    return {"message": "Ni pending promptov za obdelavo", "processed": 0}
                
                # Sortiraj po prioriteti (višja prva) in času (starejši prvi)
                pending_prompts.sort(key=lambda x: (-x.priority.value, x.timestamp))
                
                processed_count = 0
                results = []
                
                logger.info(f"🚀 Začenjam sekvenčno obdelavo {len(pending_prompts)} promptov")
                
                for prompt in pending_prompts:
                    try:
                        # Označi kot processing
                        prompt.status = PromptStatus.PROCESSING
                        self._save_prompt_to_storage(prompt)
                        
                        logger.info(f"⚙️ Obdelujem prompt {prompt.id[:8]}... (prioriteta: {prompt.priority.name})")
                        
                        # Obdelaj prompt
                        result = self._process_single_prompt(prompt)
                        
                        # Shrani rezultat
                        prompt.result = result
                        prompt.status = PromptStatus.DONE
                        self._save_prompt_to_storage(prompt)
                        
                        processed_count += 1
                        self.stats['processed_prompts'] += 1
                        
                        results.append({
                            'id': prompt.id,
                            'content': prompt.content[:100] + "..." if len(prompt.content) > 100 else prompt.content,
                            'result': result,
                            'processing_time': prompt.processing_time,
                            'resources_used': prompt.resources_loaded
                        })
                        
                        logger.info(f"✅ Prompt {prompt.id[:8]} uspešno obdelan")
                        
                        # Kratka pavza med prompti
                        time.sleep(0.1)
                        
                    except Exception as e:
                        prompt.status = PromptStatus.ERROR
                        prompt.error = str(e)
                        self._save_prompt_to_storage(prompt)
                        self.stats['failed_prompts'] += 1
                        
                        logger.error(f"❌ Napaka pri obdelavi prompt {prompt.id[:8]}: {e}")
                
                logger.info(f"🎯 Sekvenčna obdelava končana: {processed_count} promptov obdelanih")
                
                return {
                    "message": f"Uspešno obdelanih {processed_count} promptov",
                    "processed": processed_count,
                    "results": results,
                    "stats": self.get_stats()
                }
                
            finally:
                self.is_processing = False
    
    def merge_all_results(self) -> Dict[str, Any]:
        """
        🔄 MERGE ON DEMAND
        
        Ukaz: "ZDruži vse skupaj"
        """
        # Poberi vse done prompte
        done_prompts = [
            p for p in self.queue.values() 
            if p.status == PromptStatus.DONE and p.result
        ]
        
        if not done_prompts:
            return {"error": "Ni obdelanih promptov za združevanje", "merged_count": 0}
        
        # Sortiraj po času obdelave
        done_prompts.sort(key=lambda x: x.timestamp)
        
        # Ustvari globalen merged rezultat
        merge_id = str(uuid.uuid4())
        merge_timestamp = time.time()
        
        merged_sections = []
        total_processing_time = 0
        all_resources = set()
        
        # Header
        merged_sections.append("🎯 THEA CONSOLIDATED RESULTS")
        merged_sections.append("=" * 60)
        merged_sections.append(f"📅 Merged at: {datetime.fromtimestamp(merge_timestamp).strftime('%Y-%m-%d %H:%M:%S')}")
        merged_sections.append(f"📊 Total prompts merged: {len(done_prompts)}")
        merged_sections.append("")
        
        # Dodaj vsak rezultat
        for i, prompt in enumerate(done_prompts, 1):
            merged_sections.append(f"📝 RESULT #{i}")
            merged_sections.append("-" * 40)
            merged_sections.append(f"🔸 Prompt: {prompt.content}")
            merged_sections.append(f"🔸 Processed: {datetime.fromtimestamp(prompt.timestamp).strftime('%H:%M:%S')}")
            merged_sections.append(f"🔸 Processing time: {prompt.processing_time:.2f}s")
            merged_sections.append(f"🔸 Resources: {', '.join(prompt.resources_loaded)}")
            merged_sections.append("")
            merged_sections.append("📋 RESULT:")
            merged_sections.append(prompt.result)
            merged_sections.append("")
            merged_sections.append("=" * 60)
            merged_sections.append("")
            
            # Statistike
            total_processing_time += prompt.processing_time or 0
            all_resources.update(prompt.resources_loaded)
            
            # Označi kot merged
            prompt.status = PromptStatus.MERGED
            self._save_prompt_to_storage(prompt)
        
        # Footer z statistikami
        merged_sections.append("📊 CONSOLIDATED STATISTICS")
        merged_sections.append("-" * 40)
        merged_sections.append(f"⏱️ Total processing time: {total_processing_time:.2f}s")
        merged_sections.append(f"🔧 Resources used: {', '.join(sorted(all_resources))}")
        merged_sections.append(f"📈 Average processing time: {total_processing_time/len(done_prompts):.2f}s")
        merged_sections.append(f"🎯 Success rate: 100%")
        
        merged_result = "\n".join(merged_sections)
        
        # Shrani merge v zgodovino
        try:
            with sqlite3.connect(self.storage_path) as conn:
                conn.execute("""
                    INSERT INTO merge_history (id, timestamp, prompt_ids, merged_result, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    merge_id,
                    merge_timestamp,
                    json.dumps([p.id for p in done_prompts]),
                    merged_result,
                    json.dumps({
                        'total_prompts': len(done_prompts),
                        'total_processing_time': total_processing_time,
                        'resources_used': list(all_resources)
                    })
                ))
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju merge: {e}")
        
        # Posodobi statistike
        self.stats['merge_operations'] += 1
        
        logger.info(f"🎯 Merged {len(done_prompts)} rezultatov v globalen output")
        
        return {
            "merge_id": merge_id,
            "merged_count": len(done_prompts),
            "total_processing_time": total_processing_time,
            "resources_used": list(all_resources),
            "merged_result": merged_result,
            "timestamp": merge_timestamp
        }
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Pridobi status queue"""
        status_counts = {}
        for status in PromptStatus:
            status_counts[status.value] = len([
                p for p in self.queue.values() if p.status == status
            ])
        
        return {
            "total_prompts": len(self.queue),
            "status_breakdown": status_counts,
            "is_processing": self.is_processing,
            "stats": self.stats,
            "cache_size": len(self.resource_cache)
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Pridobi sistemske statistike"""
        return {
            **self.stats,
            "queue_size": len(self.queue),
            "cache_efficiency": (
                self.stats['cache_hits'] / (self.stats['cache_hits'] + self.stats['cache_misses'])
                if (self.stats['cache_hits'] + self.stats['cache_misses']) > 0 else 0
            ),
            "success_rate": (
                self.stats['processed_prompts'] / self.stats['total_prompts']
                if self.stats['total_prompts'] > 0 else 0
            )
        }
    
    def clear_queue(self, status_filter: Optional[PromptStatus] = None):
        """Počisti queue (opcijsko le določen status)"""
        if status_filter:
            to_remove = [
                prompt_id for prompt_id, prompt in self.queue.items()
                if prompt.status == status_filter
            ]
            for prompt_id in to_remove:
                del self.queue[prompt_id]
            
            # Počisti tudi iz storage
            with sqlite3.connect(self.storage_path) as conn:
                conn.execute("DELETE FROM prompt_queue WHERE status = ?", (status_filter.value,))
                
            logger.info(f"🧹 Počiščenih {len(to_remove)} promptov s statusom {status_filter.value}")
        else:
            self.queue.clear()
            with sqlite3.connect(self.storage_path) as conn:
                conn.execute("DELETE FROM prompt_queue")
            logger.info("🧹 Queue popolnoma počiščen")
    
    def export_results(self, format_type: str = "json") -> str:
        """Izvozi rezultate v različnih formatih"""
        done_prompts = [
            p for p in self.queue.values() 
            if p.status in [PromptStatus.DONE, PromptStatus.MERGED]
        ]
        
        if format_type == "json":
            export_data = {
                "export_timestamp": time.time(),
                "total_results": len(done_prompts),
                "results": [
                    {
                        "id": p.id,
                        "content": p.content,
                        "result": p.result,
                        "timestamp": p.timestamp,
                        "processing_time": p.processing_time,
                        "resources_loaded": p.resources_loaded,
                        "priority": p.priority.name,
                        "status": p.status.value
                    }
                    for p in done_prompts
                ],
                "stats": self.get_stats()
            }
            
            filename = f"thea_results_export_{int(time.time())}.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
                
            return filename
        
        return "Nepodprt format"

# Test funkcije
def test_advanced_queue_system():
    """Test naprednega queue sistema"""
    print("🧪 Testiram Thea Advanced Queue System...")
    
    # Inicializacija
    thea = TheaAdvancedQueueSystem("test_advanced_queue.db")
    
    # Test 1: Auto-shranjevanje promptov
    print("\n1️⃣ Test auto-shranjevanja promptov:")
    prompt1 = thea.add_prompt("Analiziraj prodajne podatke za zadnji mesec", Priority.HIGH)
    prompt2 = thea.add_prompt("Pripravi finančno poročilo", Priority.MEDIUM, {"department": "finance"})
    prompt3 = thea.add_prompt("Preveri IoT senzorje v skladišču", Priority.LOW)
    prompt4 = thea.add_prompt("Optimiziraj turistične pakete", Priority.HIGH)
    
    print(f"✅ Dodanih {len(thea.queue)} promptov v queue")
    
    # Test 2: Status queue
    print("\n2️⃣ Status queue:")
    status = thea.get_queue_status()
    print(f"📊 Queue status: {status}")
    
    # Test 3: Sekvenčna obdelava
    print("\n3️⃣ Test sekvenčne obdelave:")
    print("🚀 Izvajam ukaz: 'OBDELATI NAJ ZDALEČE'")
    result = thea.process_queue_sequential()
    print(f"✅ Rezultat obdelave: {result['message']}")
    
    # Test 4: Merge on demand
    print("\n4️⃣ Test merge on demand:")
    print("🎯 Izvajam ukaz: 'ZDruži vse skupaj'")
    merged = thea.merge_all_results()
    print(f"✅ Merged {merged['merged_count']} rezultatov")
    
    # Test 5: Izvoz rezultatov
    print("\n5️⃣ Test izvoza:")
    export_file = thea.export_results()
    print(f"📄 Rezultati izvoženi v: {export_file}")
    
    # Test 6: Statistike
    print("\n6️⃣ Končne statistike:")
    stats = thea.get_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    print("\n🎉 Vsi testi uspešno končani!")

if __name__ == "__main__":
    test_advanced_queue_system()