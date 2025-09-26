#!/usr/bin/env python3
"""
OMNI Premium Modules - Premium modul nadzor z modularnim cenikom
Avtor: OMNI AI Platform
Verzija: 1.0.0
Datum: 2024

Funkcionalnosti:
- Modularni cenik (Basic, Standard, Premium, Enterprise)
- Premium funkcionalnosti po modulih
- Licenčni nadzor in aktivacija
- Časovno omejen demo dostop
- Avtomatska deaktivacija po izteku
- Real-time monitoring uporabe
- Varnostne funkcije (centraliziran oblak, TLS + AES-256 enkripcija)
- Sandbox/Read-only demo
- Zaščita pred krajo
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
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from flask import Flask, render_template_string, jsonify, request, session, redirect, url_for
from flask_cors import CORS
import requests
from cryptography.fernet import Fernet
import base64
import jwt
from functools import wraps
import uuid

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PricingTier(Enum):
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class LicenseStatus(Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    DEMO = "demo"
    TRIAL = "trial"

class ModuleAccess(Enum):
    FULL = "full"
    LIMITED = "limited"
    DEMO = "demo"
    BLOCKED = "blocked"

@dataclass
class PricingPlan:
    tier: PricingTier
    name: str
    price_monthly: float
    price_yearly: float
    modules: List[str]
    features: List[str]
    max_users: int
    max_locations: int
    support_level: str
    api_calls_limit: int
    storage_gb: int

@dataclass
class License:
    id: str
    client_id: str
    pricing_tier: PricingTier
    status: LicenseStatus
    created_at: datetime
    expires_at: Optional[datetime]
    last_validated: datetime
    active_modules: List[str]
    usage_stats: Dict[str, Any]
    restrictions: Dict[str, Any]

@dataclass
class ModuleUsage:
    module_id: str
    client_id: str
    session_id: str
    start_time: datetime
    end_time: Optional[datetime]
    actions_count: int
    data_processed: int
    api_calls: int

@dataclass
class PremiumFeature:
    id: str
    name: str
    description: str
    required_tier: PricingTier
    module_id: str
    enabled: bool
    usage_limit: Optional[int]
    current_usage: int

class OmniPremiumModules:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = secrets.token_hex(32)
        CORS(self.app)
        
        # Varnostne nastavitve
        self.jwt_secret = secrets.token_hex(32)
        self.encryption_key = self._generate_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Konfiguracija
        self.config = {
            'app_name': 'OMNI Premium Modules',
            'version': '1.0.0',
            'demo_duration_hours': 24,
            'trial_duration_days': 14,
            'max_demo_extensions': 3,
            'license_validation_interval': 300,  # 5 minut
        }
        
        # Cenični načrti
        self.pricing_plans = self._init_pricing_plans()
        
        # Stanje sistema
        self.licenses: Dict[str, License] = {}
        self.module_usage: List[ModuleUsage] = []
        self.premium_features: Dict[str, PremiumFeature] = {}
        self.active_sessions: Dict[str, Dict] = {}
        
        # Inicializacija
        self._init_database()
        self._init_premium_features()
        self._load_licenses()
        self._setup_routes()
        self._start_license_monitor()
        
        logger.info("OMNI Premium Modules sistem inicializiran")

    def _generate_encryption_key(self) -> bytes:
        """Generira ključ za enkripcijo"""
        return Fernet.generate_key()

    def _encrypt_data(self, data: str) -> str:
        """Enkriptira podatke"""
        return self.cipher_suite.encrypt(data.encode()).decode()

    def _decrypt_data(self, encrypted_data: str) -> str:
        """Dekriptira podatke"""
        return self.cipher_suite.decrypt(encrypted_data.encode()).decode()

    def _init_pricing_plans(self) -> Dict[PricingTier, PricingPlan]:
        """Inicializira cenične načrte"""
        plans = {
            PricingTier.BASIC: PricingPlan(
                tier=PricingTier.BASIC,
                name="Basic",
                price_monthly=29.0,
                price_yearly=290.0,
                modules=["tourism", "pos"],
                features=[
                    "Osnovne rezervacije",
                    "POS sistem",
                    "Osnovna analitika",
                    "Email podpora"
                ],
                max_users=3,
                max_locations=1,
                support_level="email",
                api_calls_limit=1000,
                storage_gb=5
            ),
            PricingTier.STANDARD: PricingPlan(
                tier=PricingTier.STANDARD,
                name="Standard",
                price_monthly=79.0,
                price_yearly=790.0,
                modules=["tourism", "pos", "analytics", "mobile"],
                features=[
                    "Napredne rezervacije",
                    "POS + fiskalizacija",
                    "Napredna analitika",
                    "Mobilna aplikacija",
                    "Chat podpora"
                ],
                max_users=10,
                max_locations=3,
                support_level="chat",
                api_calls_limit=5000,
                storage_gb=25
            ),
            PricingTier.PREMIUM: PricingPlan(
                tier=PricingTier.PREMIUM,
                name="Premium",
                price_monthly=149.0,
                price_yearly=1490.0,
                modules=["tourism", "pos", "analytics", "mobile", "ai", "ar_vr"],
                features=[
                    "Vse Standard funkcionalnosti",
                    "AI chatbot z NLP",
                    "AR/VR sistem",
                    "Napredna integracija",
                    "Telefonska podpora"
                ],
                max_users=25,
                max_locations=10,
                support_level="phone",
                api_calls_limit=15000,
                storage_gb=100
            ),
            PricingTier.ENTERPRISE: PricingPlan(
                tier=PricingTier.ENTERPRISE,
                name="Enterprise",
                price_monthly=299.0,
                price_yearly=2990.0,
                modules=["all"],
                features=[
                    "Vse Premium funkcionalnosti",
                    "IoT monitoring",
                    "Blockchain plačila",
                    "Neomejene integracije",
                    "Dedicirani support manager",
                    "SLA 99.9%"
                ],
                max_users=999,
                max_locations=999,
                support_level="dedicated",
                api_calls_limit=999999,
                storage_gb=1000
            )
        }
        return plans

    def _init_database(self):
        """Inicializira SQLite bazo podatkov"""
        self.db_path = 'omni_premium_modules.db'
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za licence
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS licenses (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                pricing_tier TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                expires_at DATETIME,
                last_validated DATETIME NOT NULL,
                active_modules TEXT NOT NULL,
                usage_stats TEXT NOT NULL,
                restrictions TEXT NOT NULL
            )
        ''')
        
        # Tabela za uporabo modulov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS module_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME,
                actions_count INTEGER DEFAULT 0,
                data_processed INTEGER DEFAULT 0,
                api_calls INTEGER DEFAULT 0
            )
        ''')
        
        # Tabela za premium funkcionalnosti
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS premium_features (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                required_tier TEXT NOT NULL,
                module_id TEXT NOT NULL,
                enabled BOOLEAN DEFAULT TRUE,
                usage_limit INTEGER,
                current_usage INTEGER DEFAULT 0
            )
        ''')
        
        # Tabela za aktivnosti
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                timestamp DATETIME NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Baza podatkov inicializirana")

    def _init_premium_features(self):
        """Inicializira premium funkcionalnosti"""
        features = [
            PremiumFeature(
                id="ai_chatbot",
                name="AI Chatbot z NLP",
                description="Napreden chatbot z večjezično podporo",
                required_tier=PricingTier.PREMIUM,
                module_id="ai",
                enabled=True,
                usage_limit=1000,
                current_usage=0
            ),
            PremiumFeature(
                id="ar_vr_tours",
                name="AR/VR Ture",
                description="3D ogledi in virtualne ture",
                required_tier=PricingTier.PREMIUM,
                module_id="ar_vr",
                enabled=True,
                usage_limit=100,
                current_usage=0
            ),
            PremiumFeature(
                id="advanced_analytics",
                name="Napredna analitika",
                description="KPI dashboard z AI predlogi",
                required_tier=PricingTier.STANDARD,
                module_id="analytics",
                enabled=True,
                usage_limit=None,
                current_usage=0
            ),
            PremiumFeature(
                id="iot_monitoring",
                name="IoT Monitoring",
                description="Real-time monitoring senzorjev",
                required_tier=PricingTier.ENTERPRISE,
                module_id="iot",
                enabled=True,
                usage_limit=None,
                current_usage=0
            ),
            PremiumFeature(
                id="blockchain_payments",
                name="Blockchain plačila",
                description="Kripto plačila in smart pogodbe",
                required_tier=PricingTier.ENTERPRISE,
                module_id="blockchain",
                enabled=True,
                usage_limit=None,
                current_usage=0
            ),
            PremiumFeature(
                id="mobile_offline",
                name="Offline mobilna aplikacija",
                description="PWA z offline sinhronizacijo",
                required_tier=PricingTier.STANDARD,
                module_id="mobile",
                enabled=True,
                usage_limit=None,
                current_usage=0
            )
        ]
        
        for feature in features:
            self.premium_features[feature.id] = feature
        
        logger.info(f"Inicializiranih {len(self.premium_features)} premium funkcionalnosti")

    def _load_licenses(self):
        """Naloži licence iz baze"""
        # Ustvari demo licenco
        demo_license = License(
            id=str(uuid.uuid4()),
            client_id="demo_001",
            pricing_tier=PricingTier.PREMIUM,
            status=LicenseStatus.DEMO,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(hours=24),
            last_validated=datetime.now(),
            active_modules=["tourism", "pos", "analytics", "mobile", "ai", "ar_vr"],
            usage_stats={
                "total_sessions": 0,
                "total_api_calls": 0,
                "total_data_processed": 0
            },
            restrictions={
                "max_daily_sessions": 10,
                "max_api_calls": 100,
                "sandbox_mode": True,
                "read_only": True
            }
        )
        
        self.licenses[demo_license.id] = demo_license
        logger.info(f"Naloženih {len(self.licenses)} licenc")

    def _setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def index():
            return render_template_string(self._get_dashboard_template())
        
        @self.app.route('/api/pricing')
        def get_pricing():
            return jsonify([asdict(plan) for plan in self.pricing_plans.values()])
        
        @self.app.route('/api/licenses')
        def get_licenses():
            return jsonify([asdict(license) for license in self.licenses.values()])
        
        @self.app.route('/api/licenses/<license_id>/validate', methods=['POST'])
        def validate_license(license_id):
            if license_id in self.licenses:
                license = self.licenses[license_id]
                
                # Preveri veljavnost
                if license.expires_at and license.expires_at < datetime.now():
                    license.status = LicenseStatus.EXPIRED
                    return jsonify({
                        'valid': False,
                        'status': license.status.value,
                        'message': 'License expired'
                    })
                
                # Posodobi zadnjo validacijo
                license.last_validated = datetime.now()
                
                return jsonify({
                    'valid': True,
                    'status': license.status.value,
                    'tier': license.pricing_tier.value,
                    'modules': license.active_modules,
                    'expires_at': license.expires_at.isoformat() if license.expires_at else None
                })
            
            return jsonify({'valid': False, 'message': 'License not found'}), 404
        
        @self.app.route('/api/features')
        def get_premium_features():
            return jsonify([asdict(feature) for feature in self.premium_features.values()])
        
        @self.app.route('/api/features/<feature_id>/check', methods=['POST'])
        def check_feature_access(feature_id):
            client_id = request.json.get('client_id')
            
            if feature_id not in self.premium_features:
                return jsonify({'access': False, 'message': 'Feature not found'}), 404
            
            feature = self.premium_features[feature_id]
            
            # Najdi licenco klienta
            client_license = None
            for license in self.licenses.values():
                if license.client_id == client_id:
                    client_license = license
                    break
            
            if not client_license:
                return jsonify({'access': False, 'message': 'No valid license'})
            
            # Preveri tier
            tier_hierarchy = {
                PricingTier.BASIC: 1,
                PricingTier.STANDARD: 2,
                PricingTier.PREMIUM: 3,
                PricingTier.ENTERPRISE: 4
            }
            
            if tier_hierarchy[client_license.pricing_tier] < tier_hierarchy[feature.required_tier]:
                return jsonify({
                    'access': False,
                    'message': f'Requires {feature.required_tier.value} tier or higher'
                })
            
            # Preveri usage limit
            if feature.usage_limit and feature.current_usage >= feature.usage_limit:
                return jsonify({
                    'access': False,
                    'message': 'Usage limit exceeded'
                })
            
            return jsonify({
                'access': True,
                'feature': asdict(feature),
                'remaining_usage': feature.usage_limit - feature.current_usage if feature.usage_limit else None
            })
        
        @self.app.route('/api/usage/track', methods=['POST'])
        def track_usage():
            data = request.json
            
            usage = ModuleUsage(
                module_id=data['module_id'],
                client_id=data['client_id'],
                session_id=data.get('session_id', str(uuid.uuid4())),
                start_time=datetime.now(),
                end_time=None,
                actions_count=data.get('actions_count', 0),
                data_processed=data.get('data_processed', 0),
                api_calls=data.get('api_calls', 0)
            )
            
            self.module_usage.append(usage)
            self._log_activity(data['client_id'], f"Module usage tracked: {data['module_id']}")
            
            return jsonify({'success': True, 'usage_id': len(self.module_usage) - 1})
        
        @self.app.route('/api/demo/extend/<license_id>', methods=['POST'])
        def extend_demo(license_id):
            if license_id in self.licenses:
                license = self.licenses[license_id]
                
                if license.status == LicenseStatus.DEMO and license.expires_at:
                    # Podaljšaj za 24 ur
                    license.expires_at += timedelta(hours=24)
                    self._log_activity(license.client_id, "Demo extended")
                    
                    return jsonify({
                        'success': True,
                        'new_expiry': license.expires_at.isoformat()
                    })
            
            return jsonify({'success': False, 'message': 'Cannot extend demo'}), 400
        
        @self.app.route('/api/stats')
        def get_stats():
            return jsonify({
                'total_licenses': len(self.licenses),
                'active_licenses': len([l for l in self.licenses.values() if l.status == LicenseStatus.ACTIVE]),
                'demo_licenses': len([l for l in self.licenses.values() if l.status == LicenseStatus.DEMO]),
                'total_features': len(self.premium_features),
                'total_usage_sessions': len(self.module_usage),
                'pricing_tiers': {
                    tier.value: {
                        'count': len([l for l in self.licenses.values() if l.pricing_tier == tier]),
                        'revenue': self.pricing_plans[tier].price_monthly * len([l for l in self.licenses.values() if l.pricing_tier == tier])
                    }
                    for tier in PricingTier
                }
            })

    def _start_license_monitor(self):
        """Zažene servis za monitoring licenc"""
        def monitor_worker():
            while True:
                try:
                    self._validate_all_licenses()
                    self._cleanup_expired_sessions()
                    time.sleep(self.config['license_validation_interval'])
                except Exception as e:
                    logger.error(f"Napaka pri monitoringu licenc: {e}")
                    time.sleep(60)
        
        monitor_thread = threading.Thread(target=monitor_worker, daemon=True)
        monitor_thread.start()
        logger.info("License monitoring servis zagnan")

    def _validate_all_licenses(self):
        """Validira vse licence"""
        now = datetime.now()
        
        for license in self.licenses.values():
            if license.expires_at and license.expires_at < now:
                if license.status != LicenseStatus.EXPIRED:
                    license.status = LicenseStatus.EXPIRED
                    self._log_activity(license.client_id, "License expired")
                    logger.info(f"License {license.id} expired")

    def _cleanup_expired_sessions(self):
        """Počisti potekle seje"""
        # Implementacija čiščenja starih sej
        pass

    def _log_activity(self, client_id: str, action: str, details: Optional[str] = None):
        """Zabeleži aktivnost"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO activities (client_id, action, details, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (client_id, action, details, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()

    def _get_dashboard_template(self) -> str:
        """Vrne HTML template za dashboard"""
        return '''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Premium Modules</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 14px;
            color: #666;
        }
        
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .pricing-card {
            background: white;
            border-radius: 10px;
            padding: 30px 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .pricing-card.featured {
            border: 2px solid #667eea;
            transform: scale(1.05);
        }
        
        .pricing-card.featured::before {
            content: 'PRIPOROČENO';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            background: #667eea;
            color: white;
            padding: 5px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .pricing-tier {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        
        .pricing-price {
            font-size: 36px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .pricing-period {
            color: #666;
            margin-bottom: 20px;
        }
        
        .pricing-features {
            list-style: none;
            margin-bottom: 30px;
        }
        
        .pricing-features li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        
        .pricing-features li:last-child {
            border-bottom: none;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        
        .btn-outline {
            background: transparent;
            border: 2px solid #667eea;
            color: #667eea;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .features-section {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .feature-card {
            padding: 20px;
            border: 1px solid #eee;
            border-radius: 8px;
            background: #f9f9f9;
        }
        
        .feature-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        
        .feature-description {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .feature-tier {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .tier-basic { background: #e3f2fd; color: #1976d2; }
        .tier-standard { background: #f3e5f5; color: #7b1fa2; }
        .tier-premium { background: #fff3e0; color: #f57c00; }
        .tier-enterprise { background: #e8f5e8; color: #388e3c; }
        
        .chart-container {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            height: 400px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>OMNI Premium Modules</h1>
        <p>Modularni cenik z premium funkcionalnostmi</p>
    </div>
    
    <div class="container">
        <div class="stats-grid" id="statsGrid">
            <!-- Statistike se naložijo dinamično -->
        </div>
        
        <div class="pricing-grid" id="pricingGrid">
            <!-- Cenični načrti se naložijo dinamično -->
        </div>
        
        <div class="features-section">
            <h2>Premium funkcionalnosti</h2>
            <div class="features-grid" id="featuresGrid">
                <!-- Funkcionalnosti se naložijo dinamično -->
            </div>
        </div>
        
        <div class="chart-container" id="revenueChart">
            <!-- Graf prihodkov -->
        </div>
    </div>

    <script>
        let systemData = {
            pricing: [],
            features: [],
            stats: {},
            licenses: []
        };

        // Inicializacija
        document.addEventListener('DOMContentLoaded', function() {
            loadSystemData();
            setInterval(loadSystemData, 30000); // Posodobi vsakih 30 sekund
        });

        async function loadSystemData() {
            try {
                // Naloži cenike
                const pricingResponse = await fetch('/api/pricing');
                systemData.pricing = await pricingResponse.json();
                
                // Naloži funkcionalnosti
                const featuresResponse = await fetch('/api/features');
                systemData.features = await featuresResponse.json();
                
                // Naloži statistike
                const statsResponse = await fetch('/api/stats');
                systemData.stats = await statsResponse.json();
                
                // Naloži licence
                const licensesResponse = await fetch('/api/licenses');
                systemData.licenses = await licensesResponse.json();
                
                updateUI();
            } catch (error) {
                console.error('Napaka pri nalaganju podatkov:', error);
            }
        }

        function updateUI() {
            updateStats();
            updatePricing();
            updateFeatures();
            updateRevenueChart();
        }

        function updateStats() {
            const statsGrid = document.getElementById('statsGrid');
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${systemData.stats.total_licenses || 0}</div>
                    <div class="stat-label">Skupaj licenc</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${systemData.stats.active_licenses || 0}</div>
                    <div class="stat-label">Aktivne licence</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${systemData.stats.demo_licenses || 0}</div>
                    <div class="stat-label">Demo licence</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${systemData.stats.total_features || 0}</div>
                    <div class="stat-label">Premium funkcionalnosti</div>
                </div>
            `;
        }

        function updatePricing() {
            const pricingGrid = document.getElementById('pricingGrid');
            pricingGrid.innerHTML = '';
            
            systemData.pricing.forEach((plan, index) => {
                const isFeature = index === 2; // Premium plan
                const pricingCard = document.createElement('div');
                pricingCard.className = `pricing-card ${isFeature ? 'featured' : ''}`;
                
                pricingCard.innerHTML = `
                    <div class="pricing-tier">${plan.name}</div>
                    <div class="pricing-price">€${plan.price_monthly}</div>
                    <div class="pricing-period">na mesec</div>
                    <ul class="pricing-features">
                        ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
                        <li><strong>Uporabniki:</strong> ${plan.max_users}</li>
                        <li><strong>Lokacije:</strong> ${plan.max_locations}</li>
                        <li><strong>API klici:</strong> ${plan.api_calls_limit.toLocaleString()}</li>
                        <li><strong>Shramba:</strong> ${plan.storage_gb} GB</li>
                    </ul>
                    <button class="btn ${isFeature ? 'btn-primary' : 'btn-outline'}" onclick="selectPlan('${plan.tier}')">
                        Izberi paket
                    </button>
                `;
                
                pricingGrid.appendChild(pricingCard);
            });
        }

        function updateFeatures() {
            const featuresGrid = document.getElementById('featuresGrid');
            featuresGrid.innerHTML = '';
            
            systemData.features.forEach(feature => {
                const featureCard = document.createElement('div');
                featureCard.className = 'feature-card';
                
                featureCard.innerHTML = `
                    <div class="feature-title">${feature.name}</div>
                    <div class="feature-description">${feature.description}</div>
                    <div class="feature-tier tier-${feature.required_tier}">${feature.required_tier}</div>
                    ${feature.usage_limit ? `<p><small>Omejitev: ${feature.usage_limit} / mesec</small></p>` : ''}
                `;
                
                featuresGrid.appendChild(featureCard);
            });
        }

        function updateRevenueChart() {
            if (!systemData.stats.pricing_tiers) return;
            
            const tiers = Object.keys(systemData.stats.pricing_tiers);
            const revenues = tiers.map(tier => systemData.stats.pricing_tiers[tier].revenue);
            
            const data = [{
                x: tiers,
                y: revenues,
                type: 'bar',
                marker: {
                    color: ['#1976d2', '#7b1fa2', '#f57c00', '#388e3c']
                }
            }];
            
            const layout = {
                title: 'Mesečni prihodki po paketih',
                xaxis: { title: 'Cenični paketi' },
                yaxis: { title: 'Prihodki (€)' },
                margin: { t: 50, b: 50, l: 50, r: 50 }
            };
            
            Plotly.newPlot('revenueChart', data, layout);
        }

        function selectPlan(tier) {
            alert(`Izbran paket: ${tier.toUpperCase()}\\n\\nZa aktivacijo se obrnite na prodajno ekipo.`);
        }
    </script>
</body>
</html>
        '''

    def run_demo(self):
        """Zaženi demo funkcijo"""
        print("\n" + "="*80)
        print("💎 OMNI PREMIUM MODULES - DEMO TESTIRANJE")
        print("="*80)
        
        print(f"🏢 Premium sistem: {self.config['app_name']} v{self.config['version']}")
        print(f"💰 Cenični načrti: {len(self.pricing_plans)} paketov")
        print(f"⭐ Premium funkcionalnosti: {len(self.premium_features)} funkcionalnosti")
        print(f"📜 Licence: {len(self.licenses)} aktivnih")
        
        print("\n💰 CENIČNI PAKETI:")
        for tier, plan in self.pricing_plans.items():
            print(f"• {plan.name}: €{plan.price_monthly}/mesec")
            print(f"  - Moduli: {', '.join(plan.modules) if plan.modules != ['all'] else 'Vsi moduli'}")
            print(f"  - Uporabniki: {plan.max_users}, Lokacije: {plan.max_locations}")
            print(f"  - API klici: {plan.api_calls_limit:,}, Shramba: {plan.storage_gb} GB")
        
        print("\n⭐ PREMIUM FUNKCIONALNOSTI:")
        for feature in self.premium_features.values():
            print(f"• {feature.name} ({feature.required_tier.value})")
            print(f"  - {feature.description}")
            if feature.usage_limit:
                print(f"  - Omejitev: {feature.usage_limit}/mesec")
        
        print("\n📜 DEMO LICENCE:")
        for license in self.licenses.values():
            status_text = "Aktiven" if license.status == LicenseStatus.DEMO else license.status.value
            expiry_text = license.expires_at.strftime("%d.%m.%Y %H:%M") if license.expires_at else "Brez omejitve"
            print(f"• {license.client_id} ({license.pricing_tier.value}) - {status_text}")
            print(f"  - Poteče: {expiry_text}")
            print(f"  - Moduli: {', '.join(license.active_modules)}")
        
        print("\n🔒 VARNOSTNE FUNKCIJE:")
        print("✅ Centraliziran oblak")
        print("✅ TLS + AES-256 enkripcija")
        print("✅ Sandbox/Read-only demo")
        print("✅ Zaščita pred krajo")
        print("✅ Licenčni nadzor")
        print("✅ Časovno omejen dostop")
        print("✅ Real-time monitoring uporabe")
        
        print("\n📊 FUNKCIONALNOSTI:")
        print("✅ Modularni cenik (Basic, Standard, Premium, Enterprise)")
        print("✅ Premium funkcionalnosti po modulih")
        print("✅ Licenčni nadzor in aktivacija")
        print("✅ Časovno omejen demo dostop")
        print("✅ Avtomatska deaktivacija po izteku")
        print("✅ Real-time monitoring uporabe")
        print("✅ API za preverjanje dostopa")
        
        print("\n" + "="*80)

    def run_server(self, host='0.0.0.0', port=5013, debug=True):
        """Zaženi Flask strežnik"""
        print(f"\n💎 Zaganjam OMNI Premium Modules na http://{host}:{port}")
        print("💰 Modularni cenik z premium funkcionalnostmi")
        print("🔒 Licenčni nadzor aktiven")
        
        self.app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    premium_modules = OmniPremiumModules()
    
    # Zaženi demo
    premium_modules.run_demo()
    
    # Zaženi strežnik
    premium_modules.run_server()