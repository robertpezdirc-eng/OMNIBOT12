#!/usr/bin/env python3
"""
💎 Omni Modular Premium System
Modularni sistem z različnimi paketi (Basic, Standard, Premium, Enterprise)
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from enum import Enum
import hashlib
import secrets
from flask import Flask, render_template_string, request, jsonify, session
import threading

# Konfiguracija logiranja
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PackageType(Enum):
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class ModuleType(Enum):
    CORE = "core"
    ADDON = "addon"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class SubscriptionStatus(Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    TRIAL = "trial"

@dataclass
class ModuleFeature:
    feature_id: str
    name: str
    description: str
    module_type: ModuleType
    required_package: PackageType
    price_monthly: float
    enabled: bool = True

@dataclass
class PackageConfig:
    package_id: str
    name: str
    description: str
    price_monthly: float
    features: List[str]
    max_users: int
    max_locations: int
    support_level: str
    trial_days: int = 14

@dataclass
class UserSubscription:
    subscription_id: str
    user_id: str
    package_type: PackageType
    status: SubscriptionStatus
    start_date: datetime
    end_date: datetime
    features_enabled: List[str]
    payment_status: str
    trial_used: bool = False

class OmniModularPremium:
    def __init__(self, db_path: str = "omni_premium.db"):
        self.db_path = db_path
        self.packages: Dict[str, PackageConfig] = {}
        self.features: Dict[str, ModuleFeature] = {}
        self.subscriptions: Dict[str, UserSubscription] = {}
        
        self._init_database()
        self._init_default_packages()
        self._init_default_features()
        
        logger.info("Omni Modular Premium System inicializiran")

    def _init_database(self):
        """Inicializira bazo podatkov za premium sistem"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tabela za pakete
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS packages (
                    package_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    price_monthly REAL NOT NULL,
                    features TEXT,
                    max_users INTEGER,
                    max_locations INTEGER,
                    support_level TEXT,
                    trial_days INTEGER DEFAULT 14,
                    config TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za funkcionalnosti
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS features (
                    feature_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    module_type TEXT NOT NULL,
                    required_package TEXT NOT NULL,
                    price_monthly REAL DEFAULT 0,
                    enabled INTEGER DEFAULT 1,
                    config TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za naročnine
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS subscriptions (
                    subscription_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    package_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    start_date TEXT NOT NULL,
                    end_date TEXT NOT NULL,
                    features_enabled TEXT,
                    payment_status TEXT DEFAULT 'pending',
                    trial_used INTEGER DEFAULT 0,
                    config TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za uporabo funkcionalnosti
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS feature_usage (
                    usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    feature_id TEXT NOT NULL,
                    usage_count INTEGER DEFAULT 1,
                    usage_date DATE DEFAULT CURRENT_DATE,
                    metadata TEXT,
                    FOREIGN KEY (feature_id) REFERENCES features (feature_id)
                )
            ''')
            
            # Tabela za plačila
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS payments (
                    payment_id TEXT PRIMARY KEY,
                    subscription_id TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT DEFAULT 'EUR',
                    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    payment_method TEXT,
                    status TEXT DEFAULT 'pending',
                    transaction_id TEXT,
                    FOREIGN KEY (subscription_id) REFERENCES subscriptions (subscription_id)
                )
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info("Premium baza podatkov inicializirana")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji baze: {e}")

    def _init_default_packages(self):
        """Inicializira privzete pakete"""
        default_packages = [
            PackageConfig(
                package_id="basic",
                name="Basic",
                description="Nastanitve + blagajna + osnovna analitika",
                price_monthly=200.0,
                features=["accommodations", "pos", "basic_analytics"],
                max_users=5,
                max_locations=1,
                support_level="email",
                trial_days=14
            ),
            PackageConfig(
                package_id="standard",
                name="Standard",
                description="Basic + kuhinja + AI predlogi menijev",
                price_monthly=400.0,
                features=["accommodations", "pos", "basic_analytics", "kitchen", "ai_menu"],
                max_users=15,
                max_locations=3,
                support_level="chat",
                trial_days=14
            ),
            PackageConfig(
                package_id="premium",
                name="Premium",
                description="Standard + turistične aktivnosti + AR/VR + KPI",
                price_monthly=800.0,
                features=["accommodations", "pos", "basic_analytics", "kitchen", "ai_menu", 
                         "tourism", "ar_vr", "advanced_kpi"],
                max_users=50,
                max_locations=10,
                support_level="phone",
                trial_days=30
            ),
            PackageConfig(
                package_id="enterprise",
                name="Enterprise",
                description="Premium + popolna integracija z ERP/POS",
                price_monthly=1500.0,
                features=["accommodations", "pos", "basic_analytics", "kitchen", "ai_menu", 
                         "tourism", "ar_vr", "advanced_kpi", "erp_integration", "custom_api"],
                max_users=999,
                max_locations=999,
                support_level="dedicated",
                trial_days=60
            )
        ]
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for package in default_packages:
                cursor.execute('''
                    INSERT OR REPLACE INTO packages (
                        package_id, name, description, price_monthly, features,
                        max_users, max_locations, support_level, trial_days, config
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    package.package_id, package.name, package.description,
                    package.price_monthly, json.dumps(package.features),
                    package.max_users, package.max_locations, package.support_level,
                    package.trial_days, json.dumps(asdict(package))
                ))
                
                self.packages[package.package_id] = package
            
            conn.commit()
            conn.close()
            
            logger.info(f"Inicializiranih {len(default_packages)} paketov")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji paketov: {e}")

    def _init_default_features(self):
        """Inicializira privzete funkcionalnosti"""
        default_features = [
            # Basic funkcionalnosti
            ModuleFeature("accommodations", "Nastanitve", "Upravljanje nastanitev in rezervacij", 
                         ModuleType.CORE, PackageType.BASIC, 0),
            ModuleFeature("pos", "Blagajna POS", "Sistem za prodajo in plačila", 
                         ModuleType.CORE, PackageType.BASIC, 0),
            ModuleFeature("basic_analytics", "Osnovna analitika", "Osnovni poročila in statistike", 
                         ModuleType.CORE, PackageType.BASIC, 0),
            
            # Standard funkcionalnosti
            ModuleFeature("kitchen", "Kuhinja KDS", "Kuhinjski display sistem", 
                         ModuleType.ADDON, PackageType.STANDARD, 100),
            ModuleFeature("ai_menu", "AI Predlogi menijev", "AI optimizacija menijev in cen", 
                         ModuleType.PREMIUM, PackageType.STANDARD, 150),
            
            # Premium funkcionalnosti
            ModuleFeature("tourism", "Turistične aktivnosti", "Upravljanje turističnih aktivnosti", 
                         ModuleType.PREMIUM, PackageType.PREMIUM, 200),
            ModuleFeature("ar_vr", "AR/VR doživetja", "Virtualni vodiči in AR doživetja", 
                         ModuleType.PREMIUM, PackageType.PREMIUM, 300),
            ModuleFeature("advanced_kpi", "Napredni KPI", "Napredna analitika in KPI dashboard", 
                         ModuleType.PREMIUM, PackageType.PREMIUM, 250),
            
            # Enterprise funkcionalnosti
            ModuleFeature("erp_integration", "ERP integracija", "Integracija z ERP sistemi", 
                         ModuleType.ENTERPRISE, PackageType.ENTERPRISE, 500),
            ModuleFeature("custom_api", "Custom API", "Prilagojen API dostop", 
                         ModuleType.ENTERPRISE, PackageType.ENTERPRISE, 400)
        ]
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for feature in default_features:
                cursor.execute('''
                    INSERT OR REPLACE INTO features (
                        feature_id, name, description, module_type, required_package,
                        price_monthly, enabled, config
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    feature.feature_id, feature.name, feature.description,
                    feature.module_type.value, feature.required_package.value,
                    feature.price_monthly, int(feature.enabled),
                    json.dumps(asdict(feature), default=str)
                ))
                
                self.features[feature.feature_id] = feature
            
            conn.commit()
            conn.close()
            
            logger.info(f"Inicializiranih {len(default_features)} funkcionalnosti")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji funkcionalnosti: {e}")

    def create_subscription(self, user_id: str, package_type: PackageType, 
                          is_trial: bool = False) -> Optional[str]:
        """Ustvari novo naročnino"""
        try:
            subscription_id = secrets.token_urlsafe(16)
            start_date = datetime.now()
            
            # Določi trajanje naročnine
            if is_trial:
                package = self.packages.get(package_type.value)
                trial_days = package.trial_days if package else 14
                end_date = start_date + timedelta(days=trial_days)
                status = SubscriptionStatus.TRIAL
            else:
                end_date = start_date + timedelta(days=30)  # Mesečna naročnina
                status = SubscriptionStatus.ACTIVE
            
            # Pridobi funkcionalnosti paketa
            package = self.packages.get(package_type.value)
            features_enabled = package.features if package else []
            
            subscription = UserSubscription(
                subscription_id=subscription_id,
                user_id=user_id,
                package_type=package_type,
                status=status,
                start_date=start_date,
                end_date=end_date,
                features_enabled=features_enabled,
                payment_status="pending" if not is_trial else "trial",
                trial_used=is_trial
            )
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO subscriptions (
                    subscription_id, user_id, package_type, status, start_date, end_date,
                    features_enabled, payment_status, trial_used, config
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                subscription_id, user_id, package_type.value, status.value,
                start_date.isoformat(), end_date.isoformat(),
                json.dumps(features_enabled), subscription.payment_status,
                int(subscription.trial_used), json.dumps(asdict(subscription), default=str)
            ))
            
            conn.commit()
            conn.close()
            
            self.subscriptions[subscription_id] = subscription
            
            logger.info(f"Naročnina ustvarjena: {subscription_id} za uporabnika {user_id}")
            return subscription_id
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju naročnine: {e}")
            return None

    def check_feature_access(self, user_id: str, feature_id: str) -> Dict[str, Any]:
        """Preveri dostop do funkcionalnosti"""
        try:
            # Poišči aktivno naročnino uporabnika
            user_subscription = None
            for subscription in self.subscriptions.values():
                if (subscription.user_id == user_id and 
                    subscription.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]):
                    user_subscription = subscription
                    break
            
            if not user_subscription:
                # Preveri v bazi
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM subscriptions 
                    WHERE user_id = ? AND status IN ('active', 'trial')
                    ORDER BY created_at DESC LIMIT 1
                ''', (user_id,))
                
                row = cursor.fetchone()
                conn.close()
                
                if not row:
                    return {
                        "access_granted": False,
                        "message": "Ni aktivne naročnine",
                        "required_package": None,
                        "upgrade_url": "/upgrade"
                    }
            
            # Preveri, če je funkcionalnost vključena v paket
            feature = self.features.get(feature_id)
            if not feature:
                return {
                    "access_granted": False,
                    "message": "Neznana funkcionalnost",
                    "required_package": None
                }
            
            if not feature.enabled:
                return {
                    "access_granted": False,
                    "message": "Funkcionalnost trenutno ni na voljo",
                    "required_package": feature.required_package.value
                }
            
            # Preveri, če je funkcionalnost v uporabnikovem paketu
            if user_subscription:
                if feature_id in user_subscription.features_enabled:
                    # Zabelži uporabo
                    self._log_feature_usage(user_id, feature_id)
                    
                    return {
                        "access_granted": True,
                        "message": "Dostop dovoljen",
                        "subscription_info": asdict(user_subscription),
                        "feature_info": asdict(feature)
                    }
            
            return {
                "access_granted": False,
                "message": f"Funkcionalnost zahteva {feature.required_package.value} paket",
                "required_package": feature.required_package.value,
                "current_package": user_subscription.package_type.value if user_subscription else None,
                "upgrade_url": f"/upgrade?to={feature.required_package.value}"
            }
            
        except Exception as e:
            logger.error(f"Napaka pri preverjanju dostopa: {e}")
            return {
                "access_granted": False,
                "message": f"Napaka pri preverjanju dostopa: {e}"
            }

    def _log_feature_usage(self, user_id: str, feature_id: str):
        """Zabelži uporabo funkcionalnosti"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Preveri, če že obstaja zapis za danes
            cursor.execute('''
                SELECT usage_count FROM feature_usage 
                WHERE user_id = ? AND feature_id = ? AND usage_date = DATE('now')
            ''', (user_id, feature_id))
            
            row = cursor.fetchone()
            
            if row:
                # Posodobi števec
                cursor.execute('''
                    UPDATE feature_usage 
                    SET usage_count = usage_count + 1 
                    WHERE user_id = ? AND feature_id = ? AND usage_date = DATE('now')
                ''', (user_id, feature_id))
            else:
                # Ustvari nov zapis
                cursor.execute('''
                    INSERT INTO feature_usage (user_id, feature_id, usage_count)
                    VALUES (?, ?, 1)
                ''', (user_id, feature_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju uporabe: {e}")

    def get_package_comparison(self) -> List[Dict[str, Any]]:
        """Vrne primerjavo paketov"""
        try:
            comparison = []
            
            for package_id, package in self.packages.items():
                package_features = []
                
                for feature_id in package.features:
                    feature = self.features.get(feature_id)
                    if feature:
                        package_features.append({
                            "id": feature.feature_id,
                            "name": feature.name,
                            "description": feature.description,
                            "type": feature.module_type.value
                        })
                
                comparison.append({
                    "package": asdict(package),
                    "features": package_features,
                    "total_features": len(package_features),
                    "value_score": len(package_features) / (package.price_monthly / 100)
                })
            
            # Razvrsti po ceni
            comparison.sort(key=lambda x: x["package"]["price_monthly"])
            
            return comparison
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju primerjave: {e}")
            return []

    def get_usage_statistics(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Vrne statistike uporabe"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            stats = {}
            
            # Skupne statistike
            if not user_id:
                cursor.execute('SELECT COUNT(*) FROM subscriptions')
                stats['total_subscriptions'] = cursor.fetchone()[0]
                
                cursor.execute('SELECT package_type, COUNT(*) FROM subscriptions GROUP BY package_type')
                stats['subscriptions_by_package'] = dict(cursor.fetchall())
                
                cursor.execute('SELECT SUM(usage_count) FROM feature_usage')
                stats['total_feature_usage'] = cursor.fetchone()[0] or 0
                
                cursor.execute('''
                    SELECT f.name, SUM(fu.usage_count) 
                    FROM feature_usage fu 
                    JOIN features f ON fu.feature_id = f.feature_id 
                    GROUP BY fu.feature_id 
                    ORDER BY SUM(fu.usage_count) DESC 
                    LIMIT 10
                ''')
                stats['top_features'] = dict(cursor.fetchall())
            
            # Statistike za uporabnika
            else:
                cursor.execute('SELECT * FROM subscriptions WHERE user_id = ?', (user_id,))
                user_subscriptions = cursor.fetchall()
                stats['user_subscriptions'] = len(user_subscriptions)
                
                cursor.execute('''
                    SELECT f.name, SUM(fu.usage_count) 
                    FROM feature_usage fu 
                    JOIN features f ON fu.feature_id = f.feature_id 
                    WHERE fu.user_id = ? 
                    GROUP BY fu.feature_id
                ''', (user_id,))
                stats['user_feature_usage'] = dict(cursor.fetchall())
            
            conn.close()
            return stats
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju statistik: {e}")
            return {}

    def upgrade_subscription(self, subscription_id: str, new_package: PackageType) -> bool:
        """Nadgradi naročnino"""
        try:
            if subscription_id not in self.subscriptions:
                return False
            
            subscription = self.subscriptions[subscription_id]
            old_package = subscription.package_type
            
            # Posodobi paket in funkcionalnosti
            subscription.package_type = new_package
            new_package_config = self.packages.get(new_package.value)
            if new_package_config:
                subscription.features_enabled = new_package_config.features
            
            # Posodobi v bazi
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE subscriptions 
                SET package_type = ?, features_enabled = ?, config = ?
                WHERE subscription_id = ?
            ''', (
                new_package.value,
                json.dumps(subscription.features_enabled),
                json.dumps(asdict(subscription), default=str),
                subscription_id
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Naročnina nadgrajena: {subscription_id} iz {old_package.value} v {new_package.value}")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri nadgradnji naročnine: {e}")
            return False

# Flask web vmesnik
app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

premium_system = OmniModularPremium()

@app.route('/')
def index():
    """Glavna stran s primerjavo paketov"""
    packages = premium_system.get_package_comparison()
    
    html_template = '''
    <!DOCTYPE html>
    <html lang="sl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>💎 Omni Premium Paketi</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; color: white; margin-bottom: 40px; }
            .header h1 { font-size: 3em; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
            .header p { font-size: 1.2em; opacity: 0.9; }
            .packages-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; margin-bottom: 40px; }
            .package-card { background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); transition: transform 0.3s ease; position: relative; overflow: hidden; }
            .package-card:hover { transform: translateY(-10px); }
            .package-card.premium { border: 3px solid #ffd700; }
            .package-card.premium::before { content: '⭐ PRIPOROČENO'; position: absolute; top: 15px; right: -30px; background: #ffd700; color: #333; padding: 5px 40px; font-size: 0.8em; font-weight: bold; transform: rotate(45deg); }
            .package-header { text-align: center; margin-bottom: 25px; }
            .package-name { font-size: 1.8em; font-weight: bold; color: #333; margin-bottom: 10px; }
            .package-price { font-size: 2.5em; font-weight: bold; color: #667eea; margin-bottom: 5px; }
            .package-price .currency { font-size: 0.6em; }
            .package-description { color: #666; font-size: 0.9em; margin-bottom: 20px; }
            .features-list { list-style: none; margin-bottom: 25px; }
            .features-list li { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; align-items: center; }
            .features-list li:last-child { border-bottom: none; }
            .feature-icon { color: #4CAF50; margin-right: 10px; font-weight: bold; }
            .package-limits { background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px; font-size: 0.9em; }
            .package-limits div { margin-bottom: 5px; }
            .cta-button { width: 100%; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-size: 1.1em; font-weight: bold; cursor: pointer; transition: all 0.3s ease; }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
            .trial-button { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); margin-bottom: 10px; }
            .stats-section { background: rgba(255,255,255,0.1); border-radius: 20px; padding: 30px; margin-top: 40px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
            .stat-card { text-align: center; color: white; }
            .stat-number { font-size: 2.5em; font-weight: bold; margin-bottom: 5px; }
            .stat-label { font-size: 1.1em; opacity: 0.9; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💎 Omni Premium Paketi</h1>
                <p>Izberite paket, ki najbolje ustreza vašim potrebam</p>
            </div>
            
            <div class="packages-grid">
                {% for pkg in packages %}
                <div class="package-card {% if pkg.package.package_id == 'premium' %}premium{% endif %}">
                    <div class="package-header">
                        <div class="package-name">{{ pkg.package.name }}</div>
                        <div class="package-price">{{ pkg.package.price_monthly|int }}<span class="currency">€/mes</span></div>
                        <div class="package-description">{{ pkg.package.description }}</div>
                    </div>
                    
                    <ul class="features-list">
                        {% for feature in pkg.features %}
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>{{ feature.name }}</span>
                        </li>
                        {% endfor %}
                    </ul>
                    
                    <div class="package-limits">
                        <div><strong>👥 Uporabniki:</strong> {{ pkg.package.max_users if pkg.package.max_users < 999 else 'Neomejeno' }}</div>
                        <div><strong>📍 Lokacije:</strong> {{ pkg.package.max_locations if pkg.package.max_locations < 999 else 'Neomejeno' }}</div>
                        <div><strong>🎧 Podpora:</strong> {{ pkg.package.support_level|title }}</div>
                        <div><strong>🆓 Preizkus:</strong> {{ pkg.package.trial_days }} dni</div>
                    </div>
                    
                    <button class="cta-button trial-button" onclick="startTrial('{{ pkg.package.package_id }}')">
                        🆓 Začni {{ pkg.package.trial_days }}-dnevni preizkus
                    </button>
                    <button class="cta-button" onclick="subscribe('{{ pkg.package.package_id }}')">
                        💳 Naroči se zdaj
                    </button>
                </div>
                {% endfor %}
            </div>
            
            <div class="stats-section">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">{{ packages|length }}</div>
                        <div class="stat-label">Razpoložljivih paketov</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{{ packages|sum(attribute='total_features') }}</div>
                        <div class="stat-label">Skupno funkcionalnosti</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">14-60</div>
                        <div class="stat-label">Dni brezplačnega preizkusa</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">24/7</div>
                        <div class="stat-label">Tehnična podpora</div>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            function startTrial(packageId) {
                const userId = 'demo_user_' + Math.random().toString(36).substr(2, 9);
                
                fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        package_type: packageId,
                        is_trial: true
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(`🎉 Preizkus paketa ${packageId.toUpperCase()} je uspešno zagnan!\\n\\nID naročnine: ${data.subscription_id}\\nVeljavnost: ${data.trial_days} dni`);
                    } else {
                        alert('❌ Napaka pri zagonu preizkusa: ' + data.message);
                    }
                })
                .catch(error => {
                    alert('❌ Napaka: ' + error.message);
                });
            }
            
            function subscribe(packageId) {
                const userId = 'user_' + Math.random().toString(36).substr(2, 9);
                
                fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        package_type: packageId,
                        is_trial: false
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(`💳 Naročnina na paket ${packageId.toUpperCase()} je uspešno ustvarjena!\\n\\nID naročnine: ${data.subscription_id}\\nStatus: Čaka plačilo`);
                    } else {
                        alert('❌ Napaka pri naročnini: ' + data.message);
                    }
                })
                .catch(error => {
                    alert('❌ Napaka: ' + error.message);
                });
            }
        </script>
    </body>
    </html>
    '''
    
    return render_template_string(html_template, packages=packages)

@app.route('/api/subscribe', methods=['POST'])
def api_subscribe():
    """API za naročnino"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        package_type = PackageType(data.get('package_type'))
        is_trial = data.get('is_trial', False)
        
        subscription_id = premium_system.create_subscription(user_id, package_type, is_trial)
        
        if subscription_id:
            package = premium_system.packages.get(package_type.value)
            return jsonify({
                "success": True,
                "subscription_id": subscription_id,
                "package_type": package_type.value,
                "is_trial": is_trial,
                "trial_days": package.trial_days if package and is_trial else None,
                "message": "Naročnina uspešno ustvarjena"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Napaka pri ustvarjanju naročnine"
            }), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/check-access/<user_id>/<feature_id>')
def api_check_access(user_id, feature_id):
    """API za preverjanje dostopa"""
    result = premium_system.check_feature_access(user_id, feature_id)
    return jsonify(result)

@app.route('/api/stats')
def api_stats():
    """API za statistike"""
    stats = premium_system.get_usage_statistics()
    return jsonify(stats)

def main():
    """Demo modularnega premium sistema"""
    print("💎 Zaganjam Omni Modular Premium Demo...")
    
    # Testiraj sistem
    demo_user = "demo_user_123"
    
    # Ustvari trial naročnino
    subscription_id = premium_system.create_subscription(demo_user, PackageType.PREMIUM, is_trial=True)
    
    if subscription_id:
        print(f"✅ Trial naročnina ustvarjena: {subscription_id}")
        
        # Testiraj dostop do funkcionalnosti
        access_result = premium_system.check_feature_access(demo_user, "tourism")
        print(f"🔍 Dostop do turizma: {access_result['message']}")
        
        # Prikaži primerjavo paketov
        comparison = premium_system.get_package_comparison()
        print(f"📊 Razpoložljivih paketov: {len(comparison)}")
        
        for pkg in comparison:
            print(f"  • {pkg['package']['name']}: {pkg['package']['price_monthly']}€/mes ({pkg['total_features']} funkcionalnosti)")
    
    print("🎉 Modular Premium System uspešno testiran!")
    print("💡 Za zagon web vmesnika uporabi:")
    print("  python omni_modular_premium.py --run")

if __name__ == "__main__":
    import sys
    if "--run" in sys.argv:
        print("🚀 Zaganjam Omni Modular Premium na http://0.0.0.0:5002")
        app.run(host='0.0.0.0', port=5002, debug=True)
    else:
        main()