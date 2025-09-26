"""
🧠 OMNI MEMORY MANAGER
Upravljanje kratkoročnega in dolgoročnega spomina
"""

import os
import json
import sqlite3
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import hashlib

@dataclass
class MemoryItem:
    """Struktura spominskega elementa"""
    id: str
    content: str
    timestamp: datetime
    category: str
    importance: float
    access_count: int
    last_accessed: datetime
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None

class OmniMemoryManager:
    """
    Upravljalec spomina z naslednjimi funkcionalnostmi:
    - Kratkoročni spomin (working memory)
    - Dolgoročni spomin (long-term memory)
    - Semantično iskanje
    - Avtomatsko pozabljanje
    - Pomembnostno razvrščanje
    """
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.db_path = os.path.join(data_dir, "memory", "memory.db")
        self.working_memory: List[MemoryItem] = []
        self.working_memory_limit = 20  # Maksimalno število elementov v kratkoročnem spominu
        
        self._init_database()
        self._load_working_memory()
    
    def _init_database(self):
        """Inicializiraj SQLite bazo za dolgoročni spomin"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    category TEXT NOT NULL,
                    importance REAL NOT NULL,
                    access_count INTEGER DEFAULT 0,
                    last_accessed TEXT NOT NULL,
                    metadata TEXT NOT NULL,
                    embedding TEXT
                )
            ''')
            
            # Indeksi za hitrejše iskanje
            conn.execute('CREATE INDEX IF NOT EXISTS idx_category ON memories(category)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_importance ON memories(importance)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON memories(timestamp)')
    
    def _generate_id(self, content: str) -> str:
        """Generiraj unikaten ID za spomin"""
        timestamp = datetime.now().isoformat()
        hash_input = f"{content}_{timestamp}".encode('utf-8')
        return hashlib.md5(hash_input).hexdigest()[:12]
    
    def _load_working_memory(self):
        """Naloži najnovejše spomine v kratkoročni spomin"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('''
                SELECT * FROM memories 
                ORDER BY last_accessed DESC, importance DESC 
                LIMIT ?
            ''', (self.working_memory_limit,))
            
            for row in cursor.fetchall():
                memory_item = self._row_to_memory_item(row)
                self.working_memory.append(memory_item)
    
    def _row_to_memory_item(self, row) -> MemoryItem:
        """Pretvori vrstico iz baze v MemoryItem"""
        return MemoryItem(
            id=row[0],
            content=row[1],
            timestamp=datetime.fromisoformat(row[2]),
            category=row[3],
            importance=row[4],
            access_count=row[5],
            last_accessed=datetime.fromisoformat(row[6]),
            metadata=json.loads(row[7]),
            embedding=json.loads(row[8]) if row[8] else None
        )
    
    def add_memory(self, content: str, category: str = "general", 
                   importance: float = 0.5, metadata: Dict[str, Any] = None) -> str:
        """Dodaj nov spomin"""
        if metadata is None:
            metadata = {}
        
        memory_id = self._generate_id(content)
        now = datetime.now()
        
        memory_item = MemoryItem(
            id=memory_id,
            content=content,
            timestamp=now,
            category=category,
            importance=importance,
            access_count=1,
            last_accessed=now,
            metadata=metadata
        )
        
        # Dodaj v kratkoročni spomin
        self.working_memory.append(memory_item)
        self._manage_working_memory()
        
        # Shrani v dolgoročni spomin
        self._save_to_long_term(memory_item)
        
        return memory_id
    
    def _save_to_long_term(self, memory_item: MemoryItem):
        """Shrani spomin v dolgoročno bazo"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT OR REPLACE INTO memories 
                (id, content, timestamp, category, importance, access_count, last_accessed, metadata, embedding)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                memory_item.id,
                memory_item.content,
                memory_item.timestamp.isoformat(),
                memory_item.category,
                memory_item.importance,
                memory_item.access_count,
                memory_item.last_accessed.isoformat(),
                json.dumps(memory_item.metadata, ensure_ascii=False),
                json.dumps(memory_item.embedding) if memory_item.embedding else None
            ))
    
    def _manage_working_memory(self):
        """Upravljaj kratkoročni spomin - odstrani najmanj pomembne elemente"""
        if len(self.working_memory) > self.working_memory_limit:
            # Razvrsti po pomembnosti in zadnjem dostopu
            self.working_memory.sort(
                key=lambda x: (x.importance, x.last_accessed), 
                reverse=True
            )
            # Obdrži samo najvažnejše
            self.working_memory = self.working_memory[:self.working_memory_limit]
    
    def search_memory(self, query: str, category: Optional[str] = None, 
                     limit: int = 10) -> List[MemoryItem]:
        """Poišči spomine po vsebini"""
        results = []
        query_lower = query.lower()
        
        # Iskanje v kratkoročnem spominu
        for memory in self.working_memory:
            if query_lower in memory.content.lower():
                if category is None or memory.category == category:
                    memory.access_count += 1
                    memory.last_accessed = datetime.now()
                    results.append(memory)
        
        # Iskanje v dolgoročnem spominu
        with sqlite3.connect(self.db_path) as conn:
            sql = '''
                SELECT * FROM memories 
                WHERE content LIKE ? 
            '''
            params = [f'%{query}%']
            
            if category:
                sql += ' AND category = ?'
                params.append(category)
            
            sql += ' ORDER BY importance DESC, last_accessed DESC LIMIT ?'
            params.append(limit)
            
            cursor = conn.execute(sql, params)
            
            for row in cursor.fetchall():
                memory_item = self._row_to_memory_item(row)
                # Preveri, če ni že v rezultatih
                if not any(r.id == memory_item.id for r in results):
                    # Posodobi statistike dostopa
                    memory_item.access_count += 1
                    memory_item.last_accessed = datetime.now()
                    self._save_to_long_term(memory_item)
                    results.append(memory_item)
        
        # Razvrsti po pomembnosti
        results.sort(key=lambda x: (x.importance, x.access_count), reverse=True)
        return results[:limit]
    
    def get_memory_by_id(self, memory_id: str) -> Optional[MemoryItem]:
        """Pridobi spomin po ID-ju"""
        # Preveri kratkoročni spomin
        for memory in self.working_memory:
            if memory.id == memory_id:
                memory.access_count += 1
                memory.last_accessed = datetime.now()
                return memory
        
        # Preveri dolgoročni spomin
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('SELECT * FROM memories WHERE id = ?', (memory_id,))
            row = cursor.fetchone()
            
            if row:
                memory_item = self._row_to_memory_item(row)
                memory_item.access_count += 1
                memory_item.last_accessed = datetime.now()
                self._save_to_long_term(memory_item)
                return memory_item
        
        return None
    
    def get_memories_by_category(self, category: str, limit: int = 20) -> List[MemoryItem]:
        """Pridobi spomine po kategoriji"""
        results = []
        
        # Kratkoročni spomin
        for memory in self.working_memory:
            if memory.category == category:
                results.append(memory)
        
        # Dolgoročni spomin
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('''
                SELECT * FROM memories 
                WHERE category = ? 
                ORDER BY importance DESC, last_accessed DESC 
                LIMIT ?
            ''', (category, limit))
            
            for row in cursor.fetchall():
                memory_item = self._row_to_memory_item(row)
                if not any(r.id == memory_item.id for r in results):
                    results.append(memory_item)
        
        return results[:limit]
    
    def update_memory_importance(self, memory_id: str, new_importance: float):
        """Posodobi pomembnost spomina"""
        # Posodobi v kratkoročnem spominu
        for memory in self.working_memory:
            if memory.id == memory_id:
                memory.importance = new_importance
                break
        
        # Posodobi v dolgoročnem spominu
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                UPDATE memories 
                SET importance = ?, last_accessed = ? 
                WHERE id = ?
            ''', (new_importance, datetime.now().isoformat(), memory_id))
    
    def forget_old_memories(self, days_old: int = 30, min_importance: float = 0.3):
        """Pozabi stare in nepomembne spomine"""
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('''
                DELETE FROM memories 
                WHERE timestamp < ? AND importance < ?
            ''', (cutoff_date.isoformat(), min_importance))
            
            deleted_count = cursor.rowcount
        
        # Odstrani tudi iz kratkoročnega spomina
        self.working_memory = [
            m for m in self.working_memory 
            if not (m.timestamp < cutoff_date and m.importance < min_importance)
        ]
        
        return deleted_count
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Pridobi statistike spomina"""
        with sqlite3.connect(self.db_path) as conn:
            # Skupno število spominov
            total_cursor = conn.execute('SELECT COUNT(*) FROM memories')
            total_memories = total_cursor.fetchone()[0]
            
            # Spomin po kategorijah
            category_cursor = conn.execute('''
                SELECT category, COUNT(*) 
                FROM memories 
                GROUP BY category 
                ORDER BY COUNT(*) DESC
            ''')
            categories = dict(category_cursor.fetchall())
            
            # Povprečna pomembnost
            avg_cursor = conn.execute('SELECT AVG(importance) FROM memories')
            avg_importance = avg_cursor.fetchone()[0] or 0
        
        return {
            "total_memories": total_memories,
            "working_memory_size": len(self.working_memory),
            "categories": categories,
            "average_importance": round(avg_importance, 3),
            "memory_limit": self.working_memory_limit
        }
    
    def export_memories(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Izvozi spomine v JSON format"""
        memories = []
        
        with sqlite3.connect(self.db_path) as conn:
            if category:
                cursor = conn.execute('SELECT * FROM memories WHERE category = ?', (category,))
            else:
                cursor = conn.execute('SELECT * FROM memories')
            
            for row in cursor.fetchall():
                memory_item = self._row_to_memory_item(row)
                memory_dict = asdict(memory_item)
                memory_dict['timestamp'] = memory_item.timestamp.isoformat()
                memory_dict['last_accessed'] = memory_item.last_accessed.isoformat()
                memories.append(memory_dict)
        
        return memories

if __name__ == "__main__":
    # Test memory managerja
    memory_manager = OmniMemoryManager()
    
    # Dodaj teste spomine
    test_memories = [
        ("Uporabnik je vprašal o turizmu v Sloveniji", "tourism", 0.8),
        ("Potrebuje pomoč z računovodstvom", "finance", 0.7),
        ("Zanima ga programiranje v Pythonu", "devops", 0.6),
        ("Pogovarjal se je o zdravju", "healthcare", 0.5),
        ("Rad ima jazz glasbo", "art", 0.4)
    ]
    
    print("🧠 Dodajam teste spomine...")
    for content, category, importance in test_memories:
        memory_id = memory_manager.add_memory(content, category, importance)
        print(f"✅ Dodan spomin: {memory_id}")
    
    # Test iskanja
    print("\n🔍 Iskanje spominov...")
    results = memory_manager.search_memory("turizem")
    for result in results:
        print(f"📝 {result.content} (pomembnost: {result.importance})")
    
    # Statistike
    print(f"\n📊 Statistike spomina: {memory_manager.get_memory_stats()}")
    
    # Test pozabljanja
    print(f"\n🗑️ Pozabljanje starih spominov...")
    deleted = memory_manager.forget_old_memories(days_old=0, min_importance=0.45)
    print(f"Pozabljenih {deleted} spominov")