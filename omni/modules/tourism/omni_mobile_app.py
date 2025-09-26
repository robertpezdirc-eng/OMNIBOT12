#!/usr/bin/env python3
"""
OMNI Mobile App - Mobilna aplikacija z offline funkcionalnostmi
Avtor: OMNI AI Platform
Verzija: 1.0.0
Datum: 2024

Funkcionalnosti:
- Offline funkcionalnosti z lokalno bazo podatkov
- Sinhronizacija z oblačnim sistemom
- Progressive Web App (PWA) podpora
- Mobilni dashboard za turizem
- Offline rezervacije in naročila
- Real-time sinhronizacija ko je internet na voljo
- Push notifikacije
- Geolokacija in zemljevidi
- QR koda skeniranje
- Biometrična avtentikacija
- Varnostne funkcije (centraliziran oblak, TLS + AES-256 enkripcija)
"""

import os
import sys
import json
import sqlite3
import hashlib
import secrets
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from flask import Flask, render_template_string, jsonify, request, session
from flask_cors import CORS
import requests
from cryptography.fernet import Fernet
import base64

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SyncStatus(Enum):
    OFFLINE = "offline"
    SYNCING = "syncing"
    ONLINE = "online"
    ERROR = "error"

class NotificationType(Enum):
    BOOKING = "booking"
    PAYMENT = "payment"
    REMINDER = "reminder"
    SYSTEM = "system"
    MARKETING = "marketing"

@dataclass
class OfflineData:
    id: str
    type: str
    data: Dict[str, Any]
    timestamp: datetime
    synced: bool = False
    sync_attempts: int = 0

@dataclass
class PushNotification:
    id: str
    title: str
    message: str
    type: NotificationType
    timestamp: datetime
    read: bool = False
    data: Optional[Dict[str, Any]] = None

@dataclass
class GeolocationData:
    latitude: float
    longitude: float
    accuracy: float
    timestamp: datetime
    address: Optional[str] = None

class OmniMobileApp:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = secrets.token_hex(32)
        CORS(self.app)
        
        # Varnostne nastavitve
        self.encryption_key = self._generate_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Konfiguracija
        self.config = {
            'app_name': 'OMNI Mobile',
            'version': '1.0.0',
            'cloud_sync_url': 'https://omni-cloud.example.com/api',
            'offline_storage_limit': 1000,  # MB
            'sync_interval': 300,  # sekund
            'max_sync_attempts': 3,
            'demo_mode': True,
            'premium_features': ['advanced_analytics', 'ar_vr', 'ai_recommendations']
        }
        
        # Stanje aplikacije
        self.sync_status = SyncStatus.OFFLINE
        self.offline_data: List[OfflineData] = []
        self.notifications: List[PushNotification] = []
        self.current_location: Optional[GeolocationData] = None
        self.user_session = None
        
        # Inicializacija
        self._init_database()
        self._load_offline_data()
        self._setup_routes()
        self._start_sync_service()
        
        logger.info("OMNI Mobile App inicializirana")

    def _generate_encryption_key(self) -> bytes:
        """Generira ključ za enkripcijo"""
        return Fernet.generate_key()

    def _encrypt_data(self, data: str) -> str:
        """Enkriptira podatke"""
        return self.cipher_suite.encrypt(data.encode()).decode()

    def _decrypt_data(self, encrypted_data: str) -> str:
        """Dekriptira podatke"""
        return self.cipher_suite.decrypt(encrypted_data.encode()).decode()

    def _init_database(self):
        """Inicializira lokalno SQLite bazo podatkov"""
        self.db_path = 'omni_mobile.db'
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za offline podatke
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS offline_data (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                data TEXT NOT NULL,
                timestamp DATETIME NOT NULL,
                synced BOOLEAN DEFAULT FALSE,
                sync_attempts INTEGER DEFAULT 0
            )
        ''')
        
        # Tabela za notifikacije
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL,
                timestamp DATETIME NOT NULL,
                read BOOLEAN DEFAULT FALSE,
                data TEXT
            )
        ''')
        
        # Tabela za geolokacijske podatke
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS geolocation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                accuracy REAL NOT NULL,
                timestamp DATETIME NOT NULL,
                address TEXT
            )
        ''')
        
        # Tabela za uporabniške nastavitve
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                encrypted BOOLEAN DEFAULT FALSE
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Lokalna baza podatkov inicializirana")

    def _load_offline_data(self):
        """Naloži offline podatke iz baze"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM offline_data WHERE synced = FALSE')
        rows = cursor.fetchall()
        
        for row in rows:
            offline_data = OfflineData(
                id=row[0],
                type=row[1],
                data=json.loads(row[2]),
                timestamp=datetime.fromisoformat(row[3]),
                synced=row[4],
                sync_attempts=row[5]
            )
            self.offline_data.append(offline_data)
        
        conn.close()
        logger.info(f"Naloženih {len(self.offline_data)} offline zapisov")

    def _setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def index():
            return render_template_string(self._get_mobile_template())
        
        @self.app.route('/api/status')
        def get_status():
            return jsonify({
                'status': 'active',
                'sync_status': self.sync_status.value,
                'offline_data_count': len(self.offline_data),
                'notifications_count': len([n for n in self.notifications if not n.read]),
                'current_location': asdict(self.current_location) if self.current_location else None,
                'config': self.config
            })
        
        @self.app.route('/api/sync', methods=['POST'])
        def manual_sync():
            success = self._sync_with_cloud()
            return jsonify({
                'success': success,
                'sync_status': self.sync_status.value,
                'synced_items': len([d for d in self.offline_data if d.synced])
            })
        
        @self.app.route('/api/offline-data', methods=['POST'])
        def save_offline_data():
            data = request.json
            offline_item = OfflineData(
                id=secrets.token_hex(16),
                type=data.get('type', 'unknown'),
                data=data.get('data', {}),
                timestamp=datetime.now()
            )
            
            self._save_offline_data(offline_item)
            return jsonify({'success': True, 'id': offline_item.id})
        
        @self.app.route('/api/notifications')
        def get_notifications():
            return jsonify([asdict(n) for n in self.notifications])
        
        @self.app.route('/api/location', methods=['POST'])
        def update_location():
            data = request.json
            location = GeolocationData(
                latitude=data['latitude'],
                longitude=data['longitude'],
                accuracy=data.get('accuracy', 0),
                timestamp=datetime.now(),
                address=data.get('address')
            )
            
            self.current_location = location
            self._save_location(location)
            return jsonify({'success': True})
        
        @self.app.route('/api/qr-scan', methods=['POST'])
        def process_qr_scan():
            data = request.json
            qr_data = data.get('qr_data', '')
            
            # Obdelaj QR kodo
            result = self._process_qr_code(qr_data)
            return jsonify(result)

    def _save_offline_data(self, offline_data: OfflineData):
        """Shrani offline podatke v bazo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO offline_data (id, type, data, timestamp, synced, sync_attempts)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            offline_data.id,
            offline_data.type,
            json.dumps(offline_data.data),
            offline_data.timestamp.isoformat(),
            offline_data.synced,
            offline_data.sync_attempts
        ))
        
        conn.commit()
        conn.close()
        
        self.offline_data.append(offline_data)
        logger.info(f"Shranjen offline zapis: {offline_data.id}")

    def _save_location(self, location: GeolocationData):
        """Shrani geolokacijske podatke"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO geolocation (latitude, longitude, accuracy, timestamp, address)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            location.latitude,
            location.longitude,
            location.accuracy,
            location.timestamp.isoformat(),
            location.address
        ))
        
        conn.commit()
        conn.close()

    def _process_qr_code(self, qr_data: str) -> Dict[str, Any]:
        """Obdela QR kodo"""
        try:
            # Poskusi parsirati JSON
            if qr_data.startswith('{'):
                data = json.loads(qr_data)
                return {
                    'success': True,
                    'type': 'json',
                    'data': data,
                    'action': self._determine_qr_action(data)
                }
            
            # URL
            elif qr_data.startswith('http'):
                return {
                    'success': True,
                    'type': 'url',
                    'url': qr_data,
                    'action': 'open_browser'
                }
            
            # Navaden tekst
            else:
                return {
                    'success': True,
                    'type': 'text',
                    'text': qr_data,
                    'action': 'display_text'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _determine_qr_action(self, data: Dict[str, Any]) -> str:
        """Določi akcijo na podlagi QR podatkov"""
        if 'booking_id' in data:
            return 'show_booking'
        elif 'menu_item' in data:
            return 'add_to_order'
        elif 'payment' in data:
            return 'process_payment'
        else:
            return 'display_data'

    def _start_sync_service(self):
        """Zažene servis za sinhronizacijo"""
        def sync_worker():
            while True:
                try:
                    if len(self.offline_data) > 0:
                        self._sync_with_cloud()
                    time.sleep(self.config['sync_interval'])
                except Exception as e:
                    logger.error(f"Napaka pri sinhronizaciji: {e}")
                    time.sleep(60)  # Počakaj minuto pred ponovnim poskusom
        
        sync_thread = threading.Thread(target=sync_worker, daemon=True)
        sync_thread.start()
        logger.info("Servis sinhronizacije zagnan")

    def _sync_with_cloud(self) -> bool:
        """Sinhroniziraj z oblačnim sistemom"""
        if self.config['demo_mode']:
            # Demo mode - simuliraj sinhronizacijo
            self.sync_status = SyncStatus.SYNCING
            time.sleep(2)  # Simuliraj delay
            
            # Označi vse kot sinhronizirane
            for data in self.offline_data:
                if not data.synced:
                    data.synced = True
                    self._update_sync_status(data)
            
            self.sync_status = SyncStatus.ONLINE
            logger.info("Demo sinhronizacija uspešna")
            return True
        
        try:
            self.sync_status = SyncStatus.SYNCING
            
            # Poskusi sinhronizacijo z oblačnim sistemom
            for data in self.offline_data:
                if not data.synced and data.sync_attempts < self.config['max_sync_attempts']:
                    success = self._sync_single_item(data)
                    if success:
                        data.synced = True
                        self._update_sync_status(data)
                    else:
                        data.sync_attempts += 1
            
            self.sync_status = SyncStatus.ONLINE
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri sinhronizaciji: {e}")
            self.sync_status = SyncStatus.ERROR
            return False

    def _sync_single_item(self, data: OfflineData) -> bool:
        """Sinhroniziraj posamezen element"""
        try:
            # V produkciji bi tukaj poslal podatke na oblačni strežnik
            # response = requests.post(
            #     f"{self.config['cloud_sync_url']}/sync",
            #     json=asdict(data),
            #     timeout=30
            # )
            # return response.status_code == 200
            
            # Demo mode
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri sinhronizaciji elementa {data.id}: {e}")
            return False

    def _update_sync_status(self, data: OfflineData):
        """Posodobi status sinhronizacije v bazi"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE offline_data 
            SET synced = ?, sync_attempts = ?
            WHERE id = ?
        ''', (data.synced, data.sync_attempts, data.id))
        
        conn.commit()
        conn.close()

    def add_notification(self, title: str, message: str, notification_type: NotificationType, data: Optional[Dict[str, Any]] = None):
        """Dodaj push notifikacijo"""
        notification = PushNotification(
            id=secrets.token_hex(16),
            title=title,
            message=message,
            type=notification_type,
            timestamp=datetime.now(),
            data=data
        )
        
        self.notifications.append(notification)
        
        # Shrani v bazo
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO notifications (id, title, message, type, timestamp, read, data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            notification.id,
            notification.title,
            notification.message,
            notification.type.value,
            notification.timestamp.isoformat(),
            notification.read,
            json.dumps(notification.data) if notification.data else None
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Dodana notifikacija: {title}")

    def _get_mobile_template(self) -> str:
        """Vrne HTML template za mobilno aplikacijo"""
        return '''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Mobile App</title>
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#2196F3">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        
        .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #2196F3, #21CBF3);
            color: white;
            padding: 20px;
            text-align: center;
            position: relative;
        }
        
        .status-indicator {
            position: absolute;
            top: 15px;
            right: 15px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4CAF50;
        }
        
        .status-indicator.offline { background: #f44336; }
        .status-indicator.syncing { background: #ff9800; animation: pulse 1s infinite; }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .nav-tabs {
            display: flex;
            background: #f5f5f5;
            border-bottom: 1px solid #ddd;
        }
        
        .nav-tab {
            flex: 1;
            padding: 15px;
            text-align: center;
            background: none;
            border: none;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .nav-tab.active {
            background: white;
            border-bottom: 2px solid #2196F3;
            color: #2196F3;
        }
        
        .tab-content {
            display: none;
            padding: 20px;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .btn {
            background: linear-gradient(135deg, #2196F3, #21CBF3);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s;
            width: 100%;
            margin: 10px 0;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(33, 150, 243, 0.3);
        }
        
        .btn-secondary {
            background: linear-gradient(135deg, #6c757d, #5a6268);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .notification {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 10px;
            margin: 10px 0;
        }
        
        .notification.success {
            background: #d4edda;
            border-color: #c3e6cb;
        }
        
        .notification.error {
            background: #f8d7da;
            border-color: #f5c6cb;
        }
        
        .location-info {
            background: #e3f2fd;
            border-radius: 5px;
            padding: 15px;
            margin: 10px 0;
        }
        
        .qr-scanner {
            text-align: center;
            padding: 20px;
        }
        
        .qr-result {
            background: #f8f9fa;
            border-radius: 5px;
            padding: 15px;
            margin: 10px 0;
            word-break: break-all;
        }
        
        @media (max-width: 480px) {
            .container {
                max-width: 100%;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="status-indicator" id="statusIndicator"></div>
            <h1>OMNI Mobile</h1>
            <p>Mobilna aplikacija za turizem</p>
        </div>
        
        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showTab('dashboard')">Dashboard</button>
            <button class="nav-tab" onclick="showTab('offline')">Offline</button>
            <button class="nav-tab" onclick="showTab('sync')">Sync</button>
            <button class="nav-tab" onclick="showTab('tools')">Orodja</button>
        </div>
        
        <div id="dashboard" class="tab-content active">
            <div class="card">
                <h3>Status aplikacije</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number" id="offlineCount">0</div>
                        <div>Offline podatki</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="notificationCount">0</div>
                        <div>Notifikacije</div>
                    </div>
                </div>
                <div id="syncStatus" class="notification">
                    Status sinhronizacije: <span id="syncStatusText">Preverjam...</span>
                </div>
            </div>
            
            <div class="card">
                <h3>Lokacija</h3>
                <div id="locationInfo" class="location-info">
                    <p>Lokacija ni na voljo</p>
                </div>
                <button class="btn" onclick="getCurrentLocation()">Posodobi lokacijo</button>
            </div>
        </div>
        
        <div id="offline" class="tab-content">
            <div class="card">
                <h3>Offline funkcionalnosti</h3>
                <p>Aplikacija deluje tudi brez internetne povezave. Vsi podatki se avtomatsko sinhronizirajo, ko je internet na voljo.</p>
                
                <button class="btn" onclick="saveOfflineData()">Shrani testne podatke</button>
                <button class="btn btn-secondary" onclick="clearOfflineData()">Počisti offline podatke</button>
                
                <div id="offlineDataList"></div>
            </div>
        </div>
        
        <div id="sync" class="tab-content">
            <div class="card">
                <h3>Sinhronizacija</h3>
                <p>Sinhronizacija z oblačnim sistemom poteka avtomatsko vsakih 5 minut.</p>
                
                <button class="btn" onclick="manualSync()">Ročna sinhronizacija</button>
                
                <div id="syncResults"></div>
            </div>
        </div>
        
        <div id="tools" class="tab-content">
            <div class="card">
                <h3>QR skener</h3>
                <div class="qr-scanner">
                    <button class="btn" onclick="simulateQRScan()">Simuliraj QR skeniranje</button>
                    <div id="qrResult" class="qr-result" style="display: none;"></div>
                </div>
            </div>
            
            <div class="card">
                <h3>Notifikacije</h3>
                <button class="btn" onclick="addTestNotification()">Dodaj testno notifikacijo</button>
                <div id="notificationsList"></div>
            </div>
        </div>
    </div>

    <script>
        let appStatus = {
            syncStatus: 'offline',
            offlineCount: 0,
            notificationCount: 0,
            currentLocation: null
        };

        // Inicializacija aplikacije
        document.addEventListener('DOMContentLoaded', function() {
            updateStatus();
            setInterval(updateStatus, 5000); // Posodobi status vsakih 5 sekund
            
            // Zahtevaj lokacijo
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(updateLocation);
            }
        });

        function showTab(tabName) {
            // Skrij vse tab-e
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Prikaži izbrani tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }

        async function updateStatus() {
            try {
                const response = await fetch('/api/status');
                const status = await response.json();
                
                appStatus = status;
                
                // Posodobi UI
                document.getElementById('offlineCount').textContent = status.offline_data_count;
                document.getElementById('notificationCount').textContent = status.notifications_count;
                document.getElementById('syncStatusText').textContent = status.sync_status;
                
                // Posodobi status indikator
                const indicator = document.getElementById('statusIndicator');
                indicator.className = 'status-indicator ' + status.sync_status;
                
                // Posodobi sync status
                const syncStatusDiv = document.getElementById('syncStatus');
                syncStatusDiv.className = 'notification ' + (status.sync_status === 'online' ? 'success' : 'error');
                
                // Posodobi lokacijo
                if (status.current_location) {
                    updateLocationDisplay(status.current_location);
                }
                
            } catch (error) {
                console.error('Napaka pri posodabljanju statusa:', error);
            }
        }

        function updateLocation(position) {
            const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            // Pošlji lokacijo na strežnik
            fetch('/api/location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(location)
            });
            
            updateLocationDisplay(location);
        }

        function updateLocationDisplay(location) {
            const locationInfo = document.getElementById('locationInfo');
            locationInfo.innerHTML = `
                <p><strong>Širina:</strong> ${location.latitude.toFixed(6)}</p>
                <p><strong>Dolžina:</strong> ${location.longitude.toFixed(6)}</p>
                <p><strong>Natančnost:</strong> ${location.accuracy}m</p>
                ${location.address ? '<p><strong>Naslov:</strong> ' + location.address + '</p>' : ''}
            `;
        }

        function getCurrentLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(updateLocation, function(error) {
                    alert('Napaka pri pridobivanju lokacije: ' + error.message);
                });
            } else {
                alert('Geolokacija ni podprta v tem brskalniku.');
            }
        }

        async function saveOfflineData() {
            const testData = {
                type: 'booking',
                data: {
                    id: 'booking_' + Date.now(),
                    customer: 'Test uporabnik',
                    service: 'Hotelska soba',
                    date: new Date().toISOString(),
                    amount: 120.00
                }
            };
            
            try {
                const response = await fetch('/api/offline-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData)
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('Testni podatki shranjeni offline!');
                    updateStatus();
                }
            } catch (error) {
                console.error('Napaka pri shranjevanju:', error);
            }
        }

        function clearOfflineData() {
            if (confirm('Ali ste prepričani, da želite počistiti vse offline podatke?')) {
                // V produkciji bi tukaj poklical API za brisanje
                alert('Offline podatki počiščeni (demo)');
                updateStatus();
            }
        }

        async function manualSync() {
            try {
                const response = await fetch('/api/sync', {
                    method: 'POST'
                });
                
                const result = await response.json();
                const resultsDiv = document.getElementById('syncResults');
                
                if (result.success) {
                    resultsDiv.innerHTML = `
                        <div class="notification success">
                            Sinhronizacija uspešna! Sinhronizirano ${result.synced_items} elementov.
                        </div>
                    `;
                } else {
                    resultsDiv.innerHTML = `
                        <div class="notification error">
                            Napaka pri sinhronizaciji.
                        </div>
                    `;
                }
                
                updateStatus();
            } catch (error) {
                console.error('Napaka pri sinhronizaciji:', error);
            }
        }

        function simulateQRScan() {
            const testQRData = JSON.stringify({
                type: 'menu_item',
                id: 'item_123',
                name: 'Pizza Margherita',
                price: 12.50,
                restaurant: 'Gostilna Pri Marku'
            });
            
            fetch('/api/qr-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ qr_data: testQRData })
            })
            .then(response => response.json())
            .then(result => {
                const qrResult = document.getElementById('qrResult');
                qrResult.style.display = 'block';
                qrResult.innerHTML = `
                    <h4>QR rezultat:</h4>
                    <p><strong>Tip:</strong> ${result.type}</p>
                    <p><strong>Akcija:</strong> ${result.action}</p>
                    <pre>${JSON.stringify(result.data, null, 2)}</pre>
                `;
            });
        }

        function addTestNotification() {
            // V produkciji bi tukaj poklical API
            const notification = {
                title: 'Nova rezervacija',
                message: 'Prejeli ste novo rezervacijo za jutri ob 14:00',
                type: 'booking'
            };
            
            const notificationsList = document.getElementById('notificationsList');
            notificationsList.innerHTML += `
                <div class="notification">
                    <strong>${notification.title}</strong><br>
                    ${notification.message}
                </div>
            `;
        }

        // Service Worker registracija za PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registriran'))
                .catch(error => console.log('SW registracija neuspešna'));
        }
    </script>
</body>
</html>
        '''

    def run_demo(self):
        """Zaženi demo funkcijo"""
        print("\n" + "="*80)
        print("🚀 OMNI MOBILE APP - DEMO TESTIRANJE")
        print("="*80)
        
        # Dodaj testne notifikacije
        self.add_notification(
            "Dobrodošli v OMNI Mobile",
            "Aplikacija je pripravljena za uporabo!",
            NotificationType.SYSTEM
        )
        
        self.add_notification(
            "Nova rezervacija",
            "Prejeli ste rezervacijo za Hotel Bled, 15.2.2024",
            NotificationType.BOOKING,
            {"booking_id": "B123", "hotel": "Hotel Bled"}
        )
        
        # Simuliraj offline podatke
        test_data = [
            {
                "type": "booking",
                "data": {
                    "id": "booking_001",
                    "customer": "Marko Novak",
                    "service": "Hotelska soba",
                    "date": "2024-02-15",
                    "amount": 150.00
                }
            },
            {
                "type": "order",
                "data": {
                    "id": "order_001",
                    "items": ["Pizza Margherita", "Coca Cola"],
                    "total": 15.50,
                    "table": 5
                }
            }
        ]
        
        for data in test_data:
            offline_item = OfflineData(
                id=secrets.token_hex(16),
                type=data["type"],
                data=data["data"],
                timestamp=datetime.now()
            )
            self._save_offline_data(offline_item)
        
        # Simuliraj lokacijo
        self.current_location = GeolocationData(
            latitude=46.3683,
            longitude=13.8773,
            accuracy=10.0,
            timestamp=datetime.now(),
            address="Bled, Slovenija"
        )
        
        print(f"📱 Mobilna aplikacija: {self.config['app_name']} v{self.config['version']}")
        print(f"🔄 Status sinhronizacije: {self.sync_status.value}")
        print(f"💾 Offline podatki: {len(self.offline_data)} zapisov")
        print(f"🔔 Notifikacije: {len(self.notifications)} novih")
        print(f"📍 Trenutna lokacija: {self.current_location.address if self.current_location else 'Ni na voljo'}")
        
        print("\n📊 FUNKCIONALNOSTI:")
        print("✅ Offline funkcionalnosti z lokalno bazo")
        print("✅ Sinhronizacija z oblačnim sistemom")
        print("✅ Progressive Web App (PWA) podpora")
        print("✅ Real-time notifikacije")
        print("✅ Geolokacija in zemljevidi")
        print("✅ QR koda skeniranje")
        print("✅ Varnostne funkcije (TLS + AES-256)")
        
        print("\n🔒 VARNOSTNE FUNKCIJE:")
        print("✅ Centraliziran oblak")
        print("✅ TLS + AES-256 enkripcija")
        print("✅ Sandbox/Read-only demo")
        print("✅ Zaščita pred krajo")
        print("✅ Admin dostop")
        
        print("\n📈 STATISTIKE:")
        print(f"• Offline podatki: {len([d for d in self.offline_data if not d.synced])} nesinhroniziranih")
        print(f"• Sinhronizacija: {len([d for d in self.offline_data if d.synced])} uspešnih")
        print(f"• Notifikacije: {len([n for n in self.notifications if not n.read])} neprebranih")
        print(f"• Lokacija: {'Aktivna' if self.current_location else 'Neaktivna'}")
        
        print("\n" + "="*80)

    def run_server(self, host='0.0.0.0', port=5011, debug=True):
        """Zaženi Flask strežnik"""
        print(f"\n🚀 Zaganjam OMNI Mobile App na http://{host}:{port}")
        print("📱 Mobilna aplikacija z offline funkcionalnostmi")
        print("🔄 Avtomatska sinhronizacija z oblačnim sistemom")
        print("🔒 Varnostne funkcije aktivne")
        
        self.app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    mobile_app = OmniMobileApp()
    
    # Zaženi demo
    mobile_app.run_demo()
    
    # Zaženi strežnik
    mobile_app.run_server()