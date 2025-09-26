"""
OmniCore Global Database Manager
Multi-tenant database management z podporo za različne baze
"""

import asyncio
import asyncpg
import sqlite3
import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import json
import os
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Multi-tenant database manager"""
    
    def __init__(self, config):
        self.config = config
        self.db_config = config.get_database_config()
        self.connections = {}
        self.tenant_databases = {}
        
        # SQLite fallback za development
        self.use_sqlite = self.db_config.host == "localhost" and not self._check_postgres_available()
        
        logger.info(f"🗄️ Database Manager inicializiran ({'SQLite' if self.use_sqlite else 'PostgreSQL'})")
    
    def _check_postgres_available(self) -> bool:
        """Preveri, ali je PostgreSQL dostopen"""
        try:
            import psycopg2
            return True
        except ImportError:
            return False
    
    async def initialize(self):
        """Inicializacija baze podatkov"""
        try:
            if self.use_sqlite:
                await self._initialize_sqlite()
            else:
                await self._initialize_postgres()
            
            logger.info("✅ Database Manager pripravljen")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji baze: {e}")
            raise
    
    async def _initialize_sqlite(self):
        """Inicializacija SQLite baz"""
        # Ustvari direktorij za baze
        os.makedirs("data/databases", exist_ok=True)
        
        # Glavna baza
        self.main_db_path = "data/databases/omnicore_main.db"
        await self._create_sqlite_tables(self.main_db_path)
        
        # Tenant baze
        self.tenant_databases["default"] = "data/databases/tenant_default.db"
        await self._create_sqlite_tables(self.tenant_databases["default"])
    
    async def _initialize_postgres(self):
        """Inicializacija PostgreSQL"""
        try:
            # Glavna povezava
            self.pool = await asyncpg.create_pool(
                host=self.db_config.host,
                port=self.db_config.port,
                database=self.db_config.database,
                user=self.db_config.username,
                password=self.db_config.password,
                min_size=5,
                max_size=self.db_config.pool_size
            )
            
            # Ustvari tabele
            await self._create_postgres_tables()
            
        except Exception as e:
            logger.error(f"Napaka pri PostgreSQL inicializaciji: {e}")
            # Fallback na SQLite
            self.use_sqlite = True
            await self._initialize_sqlite()
    
    async def _create_sqlite_tables(self, db_path: str):
        """Ustvari SQLite tabele"""
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Tenants tabela
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tenants (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                settings TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Users tabela
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                tenant_id TEXT,
                username TEXT NOT NULL,
                email TEXT,
                settings TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants (id)
            )
        """)
        
        # Requests tabela za logging
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS requests (
                id TEXT PRIMARY KEY,
                tenant_id TEXT,
                user_id TEXT,
                module TEXT,
                query TEXT,
                response TEXT,
                execution_time REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Module data tabela
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS module_data (
                id TEXT PRIMARY KEY,
                tenant_id TEXT,
                module TEXT,
                data_type TEXT,
                data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants (id)
            )
        """)
        
        # Vstavi default tenant
        cursor.execute("""
            INSERT OR IGNORE INTO tenants (id, name, settings) 
            VALUES ('default', 'Default Tenant', '{}')
        """)
        
        conn.commit()
        conn.close()
    
    async def _create_postgres_tables(self):
        """Ustvari PostgreSQL tabele"""
        async with self.pool.acquire() as conn:
            # Tenants tabela
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS tenants (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    settings JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Users tabela
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) REFERENCES tenants(id),
                    username VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    settings JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Requests tabela
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS requests (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) REFERENCES tenants(id),
                    user_id VARCHAR(255) REFERENCES users(id),
                    module VARCHAR(100),
                    query TEXT,
                    response JSONB,
                    execution_time REAL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Module data tabela
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS module_data (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) REFERENCES tenants(id),
                    module VARCHAR(100),
                    data_type VARCHAR(100),
                    data JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Vstavi default tenant
            await conn.execute("""
                INSERT INTO tenants (id, name, settings) 
                VALUES ('default', 'Default Tenant', '{}')
                ON CONFLICT (id) DO NOTHING
            """)
    
    @asynccontextmanager
    async def get_connection(self, tenant_id: str = "default"):
        """Pridobi povezavo za specifičen tenant"""
        if self.use_sqlite:
            db_path = self.tenant_databases.get(tenant_id, self.tenant_databases["default"])
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row  # Za dict-like dostop
            try:
                yield conn
            finally:
                conn.close()
        else:
            async with self.pool.acquire() as conn:
                yield conn
    
    async def execute_query(self, query: str, params: tuple = (), tenant_id: str = "default") -> List[Dict[str, Any]]:
        """Izvršitev poizvedbe"""
        try:
            async with self.get_connection(tenant_id) as conn:
                if self.use_sqlite:
                    cursor = conn.cursor()
                    cursor.execute(query, params)
                    rows = cursor.fetchall()
                    return [dict(row) for row in rows]
                else:
                    rows = await conn.fetch(query, *params)
                    return [dict(row) for row in rows]
                    
        except Exception as e:
            logger.error(f"Napaka pri izvršitvi poizvedbe: {e}")
            raise
    
    async def execute_command(self, command: str, params: tuple = (), tenant_id: str = "default") -> bool:
        """Izvršitev ukaza (INSERT, UPDATE, DELETE)"""
        try:
            async with self.get_connection(tenant_id) as conn:
                if self.use_sqlite:
                    cursor = conn.cursor()
                    cursor.execute(command, params)
                    conn.commit()
                    return True
                else:
                    await conn.execute(command, *params)
                    return True
                    
        except Exception as e:
            logger.error(f"Napaka pri izvršitvi ukaza: {e}")
            return False
    
    async def create_tenant(self, tenant_id: str, name: str, settings: Dict[str, Any] = None) -> bool:
        """Ustvari novega tenant-a"""
        try:
            settings_json = json.dumps(settings or {})
            
            if self.use_sqlite:
                # Ustvari novo SQLite bazo za tenant
                tenant_db_path = f"data/databases/tenant_{tenant_id}.db"
                self.tenant_databases[tenant_id] = tenant_db_path
                await self._create_sqlite_tables(tenant_db_path)
            
            # Vstavi tenant v glavno bazo
            command = """
                INSERT INTO tenants (id, name, settings) 
                VALUES (?, ?, ?)
            """
            
            success = await self.execute_command(command, (tenant_id, name, settings_json))
            
            if success:
                logger.info(f"✅ Tenant '{tenant_id}' ustvarjen")
            
            return success
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju tenant-a: {e}")
            return False
    
    async def get_tenant(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Pridobi podatke o tenant-u"""
        query = "SELECT * FROM tenants WHERE id = ?"
        results = await self.execute_query(query, (tenant_id,))
        
        if results:
            tenant = results[0]
            if tenant.get("settings"):
                tenant["settings"] = json.loads(tenant["settings"])
            return tenant
        
        return None
    
    async def log_request(self, tenant_id: str, user_id: str, module: str, 
                         query: str, response: Any, execution_time: float) -> bool:
        """Zabeleži zahtevo"""
        try:
            request_id = f"req_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{tenant_id}"
            response_json = json.dumps(response) if response else None
            
            command = """
                INSERT INTO requests (id, tenant_id, user_id, module, query, response, execution_time)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            
            return await self.execute_command(
                command, 
                (request_id, tenant_id, user_id, module, query, response_json, execution_time)
            )
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju zahteve: {e}")
            return False
    
    async def save_module_data(self, tenant_id: str, module: str, data_type: str, 
                              data: Dict[str, Any]) -> bool:
        """Shrani podatke modula"""
        try:
            data_id = f"{module}_{data_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            data_json = json.dumps(data)
            
            command = """
                INSERT INTO module_data (id, tenant_id, module, data_type, data)
                VALUES (?, ?, ?, ?, ?)
            """
            
            return await self.execute_command(
                command,
                (data_id, tenant_id, module, data_type, data_json)
            )
            
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju podatkov modula: {e}")
            return False
    
    async def get_module_data(self, tenant_id: str, module: str, 
                             data_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Pridobi podatke modula"""
        if data_type:
            query = "SELECT * FROM module_data WHERE tenant_id = ? AND module = ? AND data_type = ?"
            params = (tenant_id, module, data_type)
        else:
            query = "SELECT * FROM module_data WHERE tenant_id = ? AND module = ?"
            params = (tenant_id, module)
        
        results = await self.execute_query(query, params)
        
        # Deserializiraj JSON podatke
        for result in results:
            if result.get("data"):
                result["data"] = json.loads(result["data"])
        
        return results
    
    async def get_analytics_data(self, tenant_id: str, 
                                start_date: Optional[datetime] = None,
                                end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Pridobi analitične podatke"""
        try:
            # Osnovne statistike zahtev
            query = """
                SELECT 
                    module,
                    COUNT(*) as request_count,
                    AVG(execution_time) as avg_execution_time,
                    MAX(execution_time) as max_execution_time
                FROM requests 
                WHERE tenant_id = ?
            """
            params = [tenant_id]
            
            if start_date:
                query += " AND timestamp >= ?"
                params.append(start_date.isoformat())
            
            if end_date:
                query += " AND timestamp <= ?"
                params.append(end_date.isoformat())
            
            query += " GROUP BY module"
            
            module_stats = await self.execute_query(query, tuple(params))
            
            # Skupne statistike
            total_query = """
                SELECT 
                    COUNT(*) as total_requests,
                    AVG(execution_time) as avg_response_time
                FROM requests 
                WHERE tenant_id = ?
            """
            
            total_params = [tenant_id]
            if start_date:
                total_query += " AND timestamp >= ?"
                total_params.append(start_date.isoformat())
            
            if end_date:
                total_query += " AND timestamp <= ?"
                total_params.append(end_date.isoformat())
            
            total_stats = await self.execute_query(total_query, tuple(total_params))
            
            return {
                "module_statistics": module_stats,
                "total_statistics": total_stats[0] if total_stats else {},
                "period": {
                    "start_date": start_date.isoformat() if start_date else None,
                    "end_date": end_date.isoformat() if end_date else None
                }
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju analitičnih podatkov: {e}")
            return {}
    
    async def health_check(self) -> Dict[str, Any]:
        """Zdravstveno preverjanje baze"""
        try:
            # Testna poizvedba
            test_query = "SELECT COUNT(*) as count FROM tenants"
            result = await self.execute_query(test_query)
            
            return {
                "status": "healthy",
                "database_type": "SQLite" if self.use_sqlite else "PostgreSQL",
                "tenant_count": result[0]["count"] if result else 0,
                "last_check": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }
    
    async def cleanup_old_data(self, days: int = 30) -> bool:
        """Počisti stare podatke"""
        try:
            cutoff_date = datetime.now().replace(day=datetime.now().day - days)
            
            # Počisti stare zahteve
            command = "DELETE FROM requests WHERE timestamp < ?"
            await self.execute_command(command, (cutoff_date.isoformat(),))
            
            logger.info(f"🧹 Počiščeni podatki starejši od {days} dni")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri čiščenju podatkov: {e}")
            return False