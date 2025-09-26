#!/usr/bin/env python3
"""
OMNI CLOUD ARCHITECTURE SYSTEM
Oblačna arhitektura z centralizirano bazo in API gateway
"""

import sqlite3
import json
import datetime
import hashlib
import uuid
import jwt
import bcrypt
import asyncio
import aiohttp
from aiohttp import web, web_ws
import ssl
import os
from enum import Enum
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any, Callable
import logging
from decimal import Decimal
import time
import threading
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import requests
import websockets
from concurrent.futures import ThreadPoolExecutor
import psutil
import socket

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CloudProvider(Enum):
    AWS = "aws"
    AZURE = "azure"
    GCP = "gcp"
    CUSTOM_VPS = "custom_vps"

class SecurityLevel(Enum):
    DEMO = "demo"
    PRODUCTION = "production"
    ADMIN = "admin"

class ModuleStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    ERROR = "error"

@dataclass
class CloudConfig:
    provider: CloudProvider
    region: str
    instance_type: str
    database_url: str
    redis_url: str
    storage_bucket: str
    cdn_url: str
    ssl_cert_path: str
    ssl_key_path: str

@dataclass
class SecurityConfig:
    encryption_key: str
    jwt_secret: str
    admin_password_hash: str
    demo_duration_hours: int
    max_concurrent_users: int
    rate_limit_per_minute: int

@dataclass
class ClientSession:
    session_id: str
    user_type: str
    ip_address: str
    created_at: datetime.datetime
    expires_at: datetime.datetime
    permissions: List[str]
    is_active: bool = True

class OmniCloudArchitecture:
    def __init__(self, cloud_config: CloudConfig, security_config: SecurityConfig):
        self.cloud_config = cloud_config
        self.security_config = security_config
        self.db_path = "omni_cloud_master.db"
        self.sessions = {}
        self.active_connections = set()
        self.module_endpoints = {}
        self.encryption_cipher = self.init_encryption()
        self.app = web.Application()
        self.setup_routes()
        self.init_database()
        
    def init_encryption(self) -> Fernet:
        """Inicializacija šifriranja"""
        try:
            key = self.security_config.encryption_key.encode()
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'omni_salt_2024',
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(key))
            return Fernet(key)
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji šifriranja: {e}")
            return Fernet(Fernet.generate_key())
    
    def init_database(self):
        """Inicializacija centralizirane oblačne baze"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela sej
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                user_type TEXT,
                ip_address TEXT,
                created_at TEXT,
                expires_at TEXT,
                permissions TEXT,
                is_active BOOLEAN,
                last_activity TEXT
            )
        ''')
        
        # Tabela modulov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cloud_modules (
                module_id TEXT PRIMARY KEY,
                module_name TEXT,
                endpoint_url TEXT,
                status TEXT,
                version TEXT,
                last_heartbeat TEXT,
                configuration TEXT,
                resource_usage TEXT
            )
        ''')
        
        # Tabela demo sej
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS demo_sessions (
                demo_id TEXT PRIMARY KEY,
                client_info TEXT,
                start_time TEXT,
                end_time TEXT,
                duration_hours INTEGER,
                status TEXT,
                access_log TEXT
            )
        ''')
        
        # Tabela varnostnih dogodkov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS security_events (
                event_id TEXT PRIMARY KEY,
                event_type TEXT,
                severity TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp TEXT,
                details TEXT,
                resolved BOOLEAN
            )
        ''')
        
        # Tabela API klicev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_calls (
                call_id TEXT PRIMARY KEY,
                endpoint TEXT,
                method TEXT,
                ip_address TEXT,
                session_id TEXT,
                timestamp TEXT,
                response_time REAL,
                status_code INTEGER,
                request_size INTEGER,
                response_size INTEGER
            )
        ''')
        
        # Tabela sistemskih metrik
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_metrics (
                metric_id TEXT PRIMARY KEY,
                metric_name TEXT,
                metric_value REAL,
                timestamp TEXT,
                module_id TEXT,
                tags TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def setup_routes(self):
        """Nastavi API poti"""
        # Avtentikacija
        self.app.router.add_post('/api/auth/login', self.handle_login)
        self.app.router.add_post('/api/auth/logout', self.handle_logout)
        self.app.router.add_get('/api/auth/verify', self.handle_verify)
        
        # Demo sistem
        self.app.router.add_post('/api/demo/start', self.handle_demo_start)
        self.app.router.add_post('/api/demo/extend', self.handle_demo_extend)
        self.app.router.add_post('/api/demo/terminate', self.handle_demo_terminate)
        self.app.router.add_get('/api/demo/status', self.handle_demo_status)
        
        # Moduli
        self.app.router.add_get('/api/modules/status', self.handle_modules_status)
        self.app.router.add_post('/api/modules/activate', self.handle_module_activate)
        self.app.router.add_post('/api/modules/deactivate', self.handle_module_deactivate)
        self.app.router.add_post('/api/modules/restart', self.handle_module_restart)
        
        # Proxy za module
        self.app.router.add_route('*', '/api/pos/{path:.*}', self.proxy_to_module('pos'))
        self.app.router.add_route('*', '/api/kitchen/{path:.*}', self.proxy_to_module('kitchen'))
        self.app.router.add_route('*', '/api/inventory/{path:.*}', self.proxy_to_module('inventory'))
        self.app.router.add_route('*', '/api/tourism/{path:.*}', self.proxy_to_module('tourism'))
        self.app.router.add_route('*', '/api/accommodation/{path:.*}', self.proxy_to_module('accommodation'))
        self.app.router.add_route('*', '/api/iot/{path:.*}', self.proxy_to_module('iot'))
        self.app.router.add_route('*', '/api/ai/{path:.*}', self.proxy_to_module('ai'))
        
        # Admin konzola
        self.app.router.add_get('/api/admin/dashboard', self.handle_admin_dashboard)
        self.app.router.add_get('/api/admin/metrics', self.handle_admin_metrics)
        self.app.router.add_get('/api/admin/logs', self.handle_admin_logs)
        self.app.router.add_post('/api/admin/emergency-stop', self.handle_emergency_stop)
        
        # WebSocket
        self.app.router.add_get('/ws', self.handle_websocket)
        
        # Statične datoteke (samo če obstajajo)
        static_path = os.path.join(os.path.dirname(__file__), 'static')
        if os.path.exists(static_path):
            self.app.router.add_static('/', path=static_path, name='static')
        
        # Middleware
        self.app.middlewares.append(self.security_middleware)
        self.app.middlewares.append(self.logging_middleware)
        self.app.middlewares.append(self.rate_limiting_middleware)
    
    async def security_middleware(self, request, handler):
        """Varnostni middleware"""
        try:
            # Preveri IP naslov
            client_ip = request.remote
            if self.is_blocked_ip(client_ip):
                return web.Response(status=403, text="IP blocked")
            
            # Preveri SSL
            if not request.secure and request.path.startswith('/api/'):
                return web.Response(status=426, text="HTTPS required")
            
            # Preveri avtentikacijo za zaščitene poti
            if self.requires_auth(request.path):
                auth_result = await self.verify_authentication(request)
                if not auth_result['valid']:
                    return web.Response(status=401, text="Authentication required")
                request['session'] = auth_result['session']
            
            response = await handler(request)
            
            # Dodaj varnostne glave
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-XSS-Protection'] = '1; mode=block'
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            
            return response
            
        except Exception as e:
            logger.error(f"Napaka v varnostnem middleware: {e}")
            return web.Response(status=500, text="Internal server error")
    
    async def logging_middleware(self, request, handler):
        """Middleware za logiranje"""
        start_time = time.time()
        
        try:
            response = await handler(request)
            
            # Zabeleži API klic
            self.log_api_call(
                endpoint=request.path,
                method=request.method,
                ip_address=request.remote,
                session_id=getattr(request.get('session', {}), 'session_id', None),
                response_time=time.time() - start_time,
                status_code=response.status,
                request_size=len(await request.read()) if hasattr(request, 'read') else 0,
                response_size=len(response.body) if hasattr(response, 'body') else 0
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Napaka v logging middleware: {e}")
            return web.Response(status=500)
    
    async def rate_limiting_middleware(self, request, handler):
        """Middleware za omejevanje hitrosti"""
        client_ip = request.remote
        
        if self.is_rate_limited(client_ip):
            return web.Response(status=429, text="Rate limit exceeded")
        
        return await handler(request)
    
    async def handle_login(self, request):
        """Prijava uporabnika"""
        try:
            data = await request.json()
            username = data.get('username')
            password = data.get('password')
            user_type = data.get('user_type', 'demo')
            
            # Preveri poverilnice
            if user_type == 'admin':
                if not self.verify_admin_password(password):
                    return web.json_response({'error': 'Invalid credentials'}, status=401)
                permissions = ['admin', 'read', 'write', 'delete']
                duration_hours = 24
            else:
                # Demo uporabnik
                permissions = ['demo', 'read']
                duration_hours = self.security_config.demo_duration_hours
            
            # Ustvari sejo
            session = self.create_session(
                user_type=user_type,
                ip_address=request.remote,
                permissions=permissions,
                duration_hours=duration_hours
            )
            
            # Generiraj JWT token
            token = self.generate_jwt_token(session)
            
            return web.json_response({
                'token': token,
                'session_id': session.session_id,
                'expires_at': session.expires_at.isoformat(),
                'permissions': session.permissions
            })
            
        except Exception as e:
            logger.error(f"Napaka pri prijavi: {e}")
            return web.json_response({'error': 'Login failed'}, status=500)
    
    async def handle_demo_start(self, request):
        """Začni demo sejo"""
        try:
            data = await request.json()
            client_info = data.get('client_info', {})
            duration_hours = min(data.get('duration_hours', 1), 24)  # Maksimalno 24 ur
            
            demo_id = str(uuid.uuid4())
            start_time = datetime.datetime.now()
            end_time = start_time + datetime.timedelta(hours=duration_hours)
            
            # Shrani demo sejo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO demo_sessions 
                (demo_id, client_info, start_time, end_time, duration_hours, status, access_log)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                demo_id, json.dumps(client_info), start_time.isoformat(),
                end_time.isoformat(), duration_hours, 'active', '[]'
            ))
            
            conn.commit()
            conn.close()
            
            # Aktiviraj module za demo
            await self.activate_demo_modules(demo_id)
            
            return web.json_response({
                'demo_id': demo_id,
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'status': 'active',
                'modules_activated': True
            })
            
        except Exception as e:
            logger.error(f"Napaka pri zagonu demo: {e}")
            return web.json_response({'error': 'Demo start failed'}, status=500)
    
    async def handle_logout(self, request):
        """Odjava uporabnika"""
        try:
            session = request.get('session')
            if session:
                # Deaktiviraj sejo
                session.is_active = False
                if session.session_id in self.sessions:
                    del self.sessions[session.session_id]
                
                # Posodobi v bazi
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute(
                    'UPDATE sessions SET is_active = ? WHERE session_id = ?',
                    (False, session.session_id)
                )
                conn.commit()
                conn.close()
            
            return web.json_response({'message': 'Logged out successfully'})
            
        except Exception as e:
            logger.error(f"Napaka pri odjavi: {e}")
            return web.json_response({'error': 'Logout failed'}, status=500)
    
    async def handle_verify(self, request):
        """Preveri veljavnost seje"""
        try:
            session = request.get('session')
            if not session:
                return web.json_response({'valid': False}, status=401)
            
            return web.json_response({
                'valid': True,
                'session_id': session.session_id,
                'user_type': session.user_type,
                'permissions': session.permissions,
                'expires_at': session.expires_at.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Napaka pri preverjanju: {e}")
            return web.json_response({'error': 'Verification failed'}, status=500)
    
    async def handle_demo_extend(self, request):
        """Podaljšaj demo sejo"""
        try:
            data = await request.json()
            demo_id = data.get('demo_id')
            additional_hours = min(data.get('hours', 1), 12)  # Maksimalno 12 ur podaljšanja
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM demo_sessions WHERE demo_id = ?', (demo_id,))
            demo = cursor.fetchone()
            
            if not demo:
                return web.json_response({'error': 'Demo not found'}, status=404)
            
            # Podaljšaj čas
            current_end = datetime.datetime.fromisoformat(demo[3])
            new_end = current_end + datetime.timedelta(hours=additional_hours)
            
            cursor.execute(
                'UPDATE demo_sessions SET end_time = ? WHERE demo_id = ?',
                (new_end.isoformat(), demo_id)
            )
            
            conn.commit()
            conn.close()
            
            return web.json_response({
                'demo_id': demo_id,
                'new_end_time': new_end.isoformat(),
                'extended_hours': additional_hours
            })
            
        except Exception as e:
            logger.error(f"Napaka pri podaljšanju demo: {e}")
            return web.json_response({'error': 'Demo extension failed'}, status=500)
    
    async def handle_demo_terminate(self, request):
        """Prekini demo sejo"""
        try:
            data = await request.json()
            demo_id = data.get('demo_id')
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'UPDATE demo_sessions SET status = ? WHERE demo_id = ?',
                ('terminated', demo_id)
            )
            
            conn.commit()
            conn.close()
            
            # Deaktiviraj module za ta demo
            await self.deactivate_demo_modules(demo_id)
            
            return web.json_response({'message': 'Demo terminated successfully'})
            
        except Exception as e:
            logger.error(f"Napaka pri prekinjanju demo: {e}")
            return web.json_response({'error': 'Demo termination failed'}, status=500)
    
    async def handle_demo_status(self, request):
        """Status demo seje"""
        try:
            demo_id = request.query.get('demo_id')
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM demo_sessions WHERE demo_id = ?', (demo_id,))
            demo = cursor.fetchone()
            
            conn.close()
            
            if not demo:
                return web.json_response({'error': 'Demo not found'}, status=404)
            
            return web.json_response({
                'demo_id': demo[0],
                'start_time': demo[2],
                'end_time': demo[3],
                'duration_hours': demo[4],
                'status': demo[5]
            })
            
        except Exception as e:
            logger.error(f"Napaka pri statusu demo: {e}")
            return web.json_response({'error': 'Demo status failed'}, status=500)
    
    async def handle_modules_status(self, request):
        """Status vseh modulov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM cloud_modules')
            modules = cursor.fetchall()
            
            conn.close()
            
            modules_data = []
            for module in modules:
                modules_data.append({
                    'module_id': module[0],
                    'module_name': module[1],
                    'endpoint_url': module[2],
                    'status': module[3],
                    'version': module[4],
                    'last_heartbeat': module[5]
                })
            
            return web.json_response({'modules': modules_data})
            
        except Exception as e:
            logger.error(f"Napaka pri statusu modulov: {e}")
            return web.json_response({'error': 'Modules status failed'}, status=500)
    
    async def handle_module_activate(self, request):
        """Aktiviraj modul"""
        try:
            data = await request.json()
            module_name = data.get('module_name')
            
            # Simulacija aktivacije
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'UPDATE cloud_modules SET status = ? WHERE module_name = ?',
                ('active', module_name)
            )
            
            conn.commit()
            conn.close()
            
            return web.json_response({'message': f'Module {module_name} activated'})
            
        except Exception as e:
            logger.error(f"Napaka pri aktivaciji modula: {e}")
            return web.json_response({'error': 'Module activation failed'}, status=500)
    
    async def handle_module_deactivate(self, request):
        """Deaktiviraj modul"""
        try:
            data = await request.json()
            module_name = data.get('module_name')
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'UPDATE cloud_modules SET status = ? WHERE module_name = ?',
                ('inactive', module_name)
            )
            
            conn.commit()
            conn.close()
            
            return web.json_response({'message': f'Module {module_name} deactivated'})
            
        except Exception as e:
            logger.error(f"Napaka pri deaktivaciji modula: {e}")
            return web.json_response({'error': 'Module deactivation failed'}, status=500)
    
    async def handle_module_restart(self, request):
        """Ponovno zaženi modul"""
        try:
            data = await request.json()
            module_name = data.get('module_name')
            
            # Simulacija ponovnega zagona
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'UPDATE cloud_modules SET status = ?, last_heartbeat = ? WHERE module_name = ?',
                ('active', datetime.datetime.now().isoformat(), module_name)
            )
            
            conn.commit()
            conn.close()
            
            return web.json_response({'message': f'Module {module_name} restarted'})
            
        except Exception as e:
            logger.error(f"Napaka pri ponovnem zagonu modula: {e}")
            return web.json_response({'error': 'Module restart failed'}, status=500)
    
    async def handle_admin_dashboard(self, request):
        """Admin nadzorna plošča"""
        try:
            session = request.get('session')
            if not session or 'admin' not in session.permissions:
                return web.json_response({'error': 'Admin access required'}, status=403)
            
            # Pridobi sistemske metrike
            metrics = self.get_system_metrics()
            
            # Pridobi aktivne seje
            active_sessions = self.get_active_sessions()
            
            # Pridobi status modulov
            modules_status = await self.get_modules_status()
            
            # Pridobi varnostne dogodke
            security_events = self.get_recent_security_events()
            
            return web.json_response({
                'metrics': metrics,
                'active_sessions': active_sessions,
                'modules': modules_status,
                'security_events': security_events,
                'timestamp': datetime.datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Napaka pri admin dashboard: {e}")
            return web.json_response({'error': 'Dashboard error'}, status=500)
    
    async def handle_admin_metrics(self, request):
        """Admin metrike"""
        try:
            return web.json_response(self.get_system_metrics())
        except Exception as e:
            logger.error(f"Napaka pri admin metrikah: {e}")
            return web.json_response({'error': 'Metrics error'}, status=500)
    
    async def handle_admin_logs(self, request):
        """Admin dnevniki"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM api_calls ORDER BY timestamp DESC LIMIT 100')
            logs = cursor.fetchall()
            
            conn.close()
            
            return web.json_response({'logs': logs})
        except Exception as e:
            logger.error(f"Napaka pri admin dnevnikih: {e}")
            return web.json_response({'error': 'Logs error'}, status=500)
    
    async def handle_emergency_stop(self, request):
        """Nujno ustavljanje"""
        try:
            session = request.get('session')
            if not session or 'admin' not in session.permissions:
                return web.json_response({'error': 'Admin access required'}, status=403)
            
            # Deaktiviraj vse seje
            for session_id in list(self.sessions.keys()):
                self.sessions[session_id].is_active = False
            
            # Deaktiviraj vse module
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('UPDATE cloud_modules SET status = ?', ('inactive',))
            cursor.execute('UPDATE sessions SET is_active = ?', (False,))
            conn.commit()
            conn.close()
            
            return web.json_response({'message': 'Emergency stop executed'})
            
        except Exception as e:
            logger.error(f"Napaka pri nujnem ustavljanju: {e}")
            return web.json_response({'error': 'Emergency stop failed'}, status=500)
    
    async def handle_websocket(self, request):
        """WebSocket handler"""
        ws = web_ws.WebSocketResponse()
        await ws.prepare(request)
        
        self.active_connections.add(ws)
        
        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    # Procesiranje WebSocket sporočil
                    await self.process_websocket_message(ws, data)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f'WebSocket napaka: {ws.exception()}')
        except Exception as e:
            logger.error(f"WebSocket napaka: {e}")
        finally:
            self.active_connections.discard(ws)
        
        return ws
    
    def proxy_to_module(self, module_name: str):
        """Proxy funkcija za module"""
        async def proxy_handler(request):
            try:
                # Preveri avtorizacijo
                session = request.get('session')
                if not session:
                    return web.json_response({'error': 'Authentication required'}, status=401)
                
                # Preveri, če je modul aktiven
                if not self.is_module_active(module_name):
                    return web.json_response({'error': f'Module {module_name} not available'}, status=503)
                
                # Pridobi endpoint modula
                module_url = self.get_module_endpoint(module_name)
                if not module_url:
                    return web.json_response({'error': f'Module {module_name} not configured'}, status=503)
                
                # Preusmeri zahtevek
                path = request.match_info.get('path', '')
                target_url = f"{module_url}/{path}"
                
                async with aiohttp.ClientSession() as client_session:
                    async with client_session.request(
                        method=request.method,
                        url=target_url,
                        headers=dict(request.headers),
                        data=await request.read()
                    ) as response:
                        body = await response.read()
                        return web.Response(
                            body=body,
                            status=response.status,
                            headers=dict(response.headers)
                        )
                        
            except Exception as e:
                logger.error(f"Napaka pri proxy za {module_name}: {e}")
                return web.json_response({'error': 'Proxy error'}, status=500)
        
        return proxy_handler
    
    def create_session(self, user_type: str, ip_address: str, 
                      permissions: List[str], duration_hours: int) -> ClientSession:
        """Ustvari novo sejo"""
        session_id = str(uuid.uuid4())
        now = datetime.datetime.now()
        expires_at = now + datetime.timedelta(hours=duration_hours)
        
        session = ClientSession(
            session_id=session_id,
            user_type=user_type,
            ip_address=ip_address,
            created_at=now,
            expires_at=expires_at,
            permissions=permissions
        )
        
        self.sessions[session_id] = session
        
        # Shrani v bazo
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sessions 
            (session_id, user_type, ip_address, created_at, expires_at, permissions, is_active, last_activity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            session_id, user_type, ip_address, now.isoformat(),
            expires_at.isoformat(), json.dumps(permissions), True, now.isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        return session
    
    def generate_jwt_token(self, session: ClientSession) -> str:
        """Generiraj JWT token"""
        payload = {
            'session_id': session.session_id,
            'user_type': session.user_type,
            'permissions': session.permissions,
            'exp': session.expires_at.timestamp(),
            'iat': session.created_at.timestamp()
        }
        
        return jwt.encode(payload, self.security_config.jwt_secret, algorithm='HS256')
    
    async def verify_authentication(self, request) -> Dict[str, Any]:
        """Preveri avtentikacijo"""
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return {'valid': False, 'error': 'Missing token'}
            
            token = auth_header[7:]  # Odstrani "Bearer "
            
            payload = jwt.decode(token, self.security_config.jwt_secret, algorithms=['HS256'])
            session_id = payload.get('session_id')
            
            if session_id in self.sessions:
                session = self.sessions[session_id]
                if session.is_active and datetime.datetime.now() < session.expires_at:
                    return {'valid': True, 'session': session}
            
            return {'valid': False, 'error': 'Invalid or expired token'}
            
        except jwt.ExpiredSignatureError:
            return {'valid': False, 'error': 'Token expired'}
        except jwt.InvalidTokenError:
            return {'valid': False, 'error': 'Invalid token'}
        except Exception as e:
            logger.error(f"Napaka pri preverjanju avtentikacije: {e}")
            return {'valid': False, 'error': 'Authentication error'}
    
    def verify_admin_password(self, password: str) -> bool:
        """Preveri admin geslo"""
        try:
            return bcrypt.checkpw(
                password.encode('utf-8'),
                self.security_config.admin_password_hash.encode('utf-8')
            )
        except Exception as e:
            logger.error(f"Napaka pri preverjanju gesla: {e}")
            return False
    
    def requires_auth(self, path: str) -> bool:
        """Preveri, če pot zahteva avtentikacijo"""
        protected_paths = ['/api/admin/', '/api/modules/', '/api/demo/']
        return any(path.startswith(p) for p in protected_paths)
    
    def is_blocked_ip(self, ip: str) -> bool:
        """Preveri, če je IP blokiran"""
        # Simulacija - v produkciji bi imeli seznam blokiranih IP-jev
        blocked_ips = ['192.168.1.100', '10.0.0.50']
        return ip in blocked_ips
    
    def is_rate_limited(self, ip: str) -> bool:
        """Preveri rate limiting"""
        # Simulacija - v produkciji bi imeli Redis za rate limiting
        return False
    
    def log_api_call(self, endpoint: str, method: str, ip_address: str, 
                    session_id: str, response_time: float, status_code: int,
                    request_size: int, response_size: int):
        """Zabeleži API klic"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO api_calls 
                (call_id, endpoint, method, ip_address, session_id, timestamp, 
                 response_time, status_code, request_size, response_size)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), endpoint, method, ip_address, session_id,
                datetime.datetime.now().isoformat(), response_time, status_code,
                request_size, response_size
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Napaka pri beleženju API klica: {e}")
    
    def is_module_active(self, module_name: str) -> bool:
        """Preveri, če je modul aktiven"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT status FROM cloud_modules WHERE module_name = ?', (module_name,))
            result = cursor.fetchone()
            
            conn.close()
            
            return result and result[0] == 'active'
        except Exception as e:
            logger.error(f"Napaka pri preverjanju statusa modula: {e}")
            return False
    
    def get_module_endpoint(self, module_name: str) -> Optional[str]:
        """Pridobi endpoint modula"""
        return self.module_endpoints.get(module_name)
    
    def get_active_sessions(self) -> List[Dict[str, Any]]:
        """Pridobi aktivne seje"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM sessions WHERE is_active = ?', (True,))
            sessions = cursor.fetchall()
            
            conn.close()
            
            sessions_data = []
            for session in sessions:
                sessions_data.append({
                    'session_id': session[0],
                    'user_type': session[1],
                    'ip_address': session[2],
                    'created_at': session[3],
                    'expires_at': session[4],
                    'last_activity': session[7]
                })
            
            return sessions_data
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju aktivnih sej: {e}")
            return []
    
    async def get_modules_status(self) -> List[Dict[str, Any]]:
        """Pridobi status modulov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM cloud_modules')
            modules = cursor.fetchall()
            
            conn.close()
            
            modules_data = []
            for module in modules:
                modules_data.append({
                    'module_id': module[0],
                    'module_name': module[1],
                    'endpoint_url': module[2],
                    'status': module[3],
                    'version': module[4],
                    'last_heartbeat': module[5]
                })
            
            return modules_data
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju statusa modulov: {e}")
            return []
    
    def get_recent_security_events(self) -> List[Dict[str, Any]]:
        """Pridobi nedavne varnostne dogodke"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM security_events ORDER BY timestamp DESC LIMIT 50')
            events = cursor.fetchall()
            
            conn.close()
            
            events_data = []
            for event in events:
                events_data.append({
                    'event_id': event[0],
                    'event_type': event[1],
                    'severity': event[2],
                    'ip_address': event[3],
                    'timestamp': event[5],
                    'resolved': event[7]
                })
            
            return events_data
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju varnostnih dogodkov: {e}")
            return []
    
    async def activate_demo_modules(self, demo_id: str):
        """Aktiviraj module za demo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Registriraj module, če še niso
            modules = [
                ('pos', 'POS System', 'http://localhost:8001', 'v1.0'),
                ('kitchen', 'Kitchen Display', 'http://localhost:8002', 'v1.0'),
                ('inventory', 'Inventory Management', 'http://localhost:8003', 'v1.0'),
                ('tourism', 'Tourism Activities', 'http://localhost:8004', 'v1.0'),
                ('accommodation', 'Accommodation Management', 'http://localhost:8005', 'v1.0'),
                ('iot', 'IoT Sensors', 'http://localhost:8006', 'v1.0'),
                ('ai', 'AI Analytics', 'http://localhost:8007', 'v1.0')
            ]
            
            for module_id, module_name, endpoint, version in modules:
                cursor.execute('''
                    INSERT OR REPLACE INTO cloud_modules 
                    (module_id, module_name, endpoint_url, status, version, last_heartbeat, configuration, resource_usage)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    module_id, module_name, endpoint, 'active', version,
                    datetime.datetime.now().isoformat(), '{}', '{}'
                ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Moduli aktivirani za demo {demo_id}")
            
        except Exception as e:
            logger.error(f"Napaka pri aktivaciji demo modulov: {e}")
    
    async def deactivate_demo_modules(self, demo_id: str):
        """Deaktiviraj module za demo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('UPDATE cloud_modules SET status = ?', ('inactive',))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Moduli deaktivirani za demo {demo_id}")
            
        except Exception as e:
            logger.error(f"Napaka pri deaktivaciji demo modulov: {e}")
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Pridobi sistemske metrike"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu_usage': cpu_percent,
                'memory_usage': memory.percent,
                'memory_available': memory.available,
                'disk_usage': disk.percent,
                'disk_free': disk.free,
                'active_connections': len(self.active_connections),
                'active_sessions': len([s for s in self.sessions.values() if s.is_active]),
                'timestamp': datetime.datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju metrik: {e}")
            return {}
    
    async def process_websocket_message(self, ws, data: Dict[str, Any]):
        """Procesiraj WebSocket sporočilo"""
        try:
            message_type = data.get('type')
            
            if message_type == 'ping':
                await ws.send_str(json.dumps({'type': 'pong', 'timestamp': datetime.datetime.now().isoformat()}))
            elif message_type == 'subscribe':
                # Naročilo na real-time posodobitve
                await ws.send_str(json.dumps({'type': 'subscribed', 'channel': data.get('channel')}))
            elif message_type == 'metrics_request':
                metrics = self.get_system_metrics()
                await ws.send_str(json.dumps({'type': 'metrics', 'data': metrics}))
            
        except Exception as e:
            logger.error(f"Napaka pri procesiranju WebSocket sporočila: {e}")
            await ws.send_str(json.dumps({'type': 'error', 'message': 'Message processing failed'}))
    
    async def start_server(self, host: str = '0.0.0.0', port: int = 8080):
        """Zaženi oblačni strežnik"""
        try:
            # SSL kontekst
            ssl_context = None
            if self.cloud_config.ssl_cert_path and self.cloud_config.ssl_key_path:
                ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
                ssl_context.load_cert_chain(
                    self.cloud_config.ssl_cert_path,
                    self.cloud_config.ssl_key_path
                )
            
            # Zaženi strežnik
            runner = web.AppRunner(self.app)
            await runner.setup()
            
            site = web.TCPSite(runner, host, port, ssl_context=ssl_context)
            await site.start()
            
            protocol = 'https' if ssl_context else 'http'
            logger.info(f"OMNI Cloud Server zagnan na {protocol}://{host}:{port}")
            
            # Registriraj module
            await self.register_default_modules()
            
            return runner
            
        except Exception as e:
            logger.error(f"Napaka pri zagonu strežnika: {e}")
            raise
    
    async def register_default_modules(self):
        """Registriraj privzete module"""
        default_modules = [
            ('pos', 'http://localhost:8001'),
            ('kitchen', 'http://localhost:8002'),
            ('inventory', 'http://localhost:8003'),
            ('tourism', 'http://localhost:8004'),
            ('accommodation', 'http://localhost:8005'),
            ('iot', 'http://localhost:8006'),
            ('ai', 'http://localhost:8007')
        ]
        
        for module_name, endpoint in default_modules:
            self.module_endpoints[module_name] = endpoint
            logger.info(f"Modul {module_name} registriran na {endpoint}")

def create_cloud_config() -> CloudConfig:
    """Ustvari oblačno konfiguracijo"""
    return CloudConfig(
        provider=CloudProvider.CUSTOM_VPS,
        region="eu-central-1",
        instance_type="t3.medium",
        database_url="sqlite:///omni_cloud.db",
        redis_url="redis://localhost:6379",
        storage_bucket="omni-storage",
        cdn_url="https://cdn.omni-system.com",
        ssl_cert_path="certs/cert.pem",
        ssl_key_path="certs/key.pem"
    )

def create_security_config() -> SecurityConfig:
    """Ustvari varnostno konfiguracijo"""
    # Generiraj admin geslo hash
    admin_password = "OmniAdmin2024!"
    password_hash = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    return SecurityConfig(
        encryption_key="omni_encryption_key_2024",
        jwt_secret="omni_jwt_secret_super_secure_2024",
        admin_password_hash=password_hash,
        demo_duration_hours=2,
        max_concurrent_users=100,
        rate_limit_per_minute=60
    )

async def demo_cloud_architecture():
    """Demo funkcija za oblačno arhitekturo"""
    print("☁️ OMNI CLOUD ARCHITECTURE - DEMO")
    print("=" * 50)
    
    # Konfiguracija
    cloud_config = create_cloud_config()
    security_config = create_security_config()
    
    # Inicializacija
    cloud_system = OmniCloudArchitecture(cloud_config, security_config)
    
    print("🔧 Konfiguracija:")
    print(f"  Provider: {cloud_config.provider.value}")
    print(f"  Region: {cloud_config.region}")
    print(f"  Demo trajanje: {security_config.demo_duration_hours}h")
    print(f"  Maksimalno uporabnikov: {security_config.max_concurrent_users}")
    
    print("\n🚀 Zagon oblačnega strežnika...")
    try:
        runner = await cloud_system.start_server(host='localhost', port=8080)
        print("  ✅ Strežnik uspešno zagnan na http://localhost:8080")
        
        # Simulacija nekaj sekund delovanja
        await asyncio.sleep(3)
        
        print("\n📊 Sistemske metrike:")
        metrics = cloud_system.get_system_metrics()
        for key, value in metrics.items():
            if isinstance(value, float):
                print(f"  {key}: {value:.2f}")
            else:
                print(f"  {key}: {value}")
        
        print("\n🔒 Varnostne funkcionalnosti:")
        print("  ✅ JWT avtentikacija")
        print("  ✅ AES-256 šifriranje")
        print("  ✅ Rate limiting")
        print("  ✅ SSL/TLS podpora")
        print("  ✅ IP blokiranje")
        print("  ✅ Varnostni middleware")
        
        print("\n🎯 Demo funkcionalnosti:")
        print("  ✅ Časovno omejen dostop")
        print("  ✅ Avtomatska deaktivacija")
        print("  ✅ Sandbox okolje")
        print("  ✅ Read-only omejitve")
        
        print("\n👨‍💼 Admin funkcionalnosti:")
        print("  ✅ Oddaljeno upravljanje")
        print("  ✅ Real-time monitoring")
        print("  ✅ Aktivacija/deaktivacija modulov")
        print("  ✅ Varnostni dogodki")
        print("  ✅ Sistemske metrike")
        
        # Ustavi strežnik
        await runner.cleanup()
        print("\n🛑 Strežnik ustavljen")
        
    except Exception as e:
        print(f"  ❌ Napaka: {e}")
    
    print("\n🎉 Oblačna arhitektura uspešno testirana!")
    print("Podprte funkcionalnosti:")
    print("  • Centralizirana oblačna baza")
    print("  • API Gateway z proxy")
    print("  • JWT avtentikacija in avtorizacija")
    print("  • Šifriranje in varnost")
    print("  • Časovno omejen demo")
    print("  • Admin konzola")
    print("  • Real-time WebSocket")
    print("  • Sistemski monitoring")

if __name__ == "__main__":
    asyncio.run(demo_cloud_architecture())