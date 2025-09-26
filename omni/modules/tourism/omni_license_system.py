#!/usr/bin/env python3
"""
OMNI License System - Avtomatski check-in na oblak za preverjanje naročnine
Podpira Basic, Standard, Premium in Enterprise pakete z real-time validacijo
"""

import sqlite3
import json
import hashlib
import time
import requests
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template_string
import threading
import uuid
import os
from cryptography.fernet import Fernet
import base64

class OmniLicenseSystem:
    def __init__(self):
        self.app = Flask(__name__)
        self.db_path = "omni_licenses.db"
        self.cloud_endpoint = "https://api.omni-cloud.com/license/validate"  # Demo endpoint
        self.encryption_key = self._generate_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # License tiers and features
        self.license_tiers = {
            "basic": {
                "name": "Basic",
                "price": 29.99,
                "features": ["basic_pos", "simple_analytics", "basic_support"],
                "max_locations": 1,
                "max_users": 2,
                "storage_gb": 1
            },
            "standard": {
                "name": "Standard", 
                "price": 79.99,
                "features": ["advanced_pos", "detailed_analytics", "inventory_management", "email_support"],
                "max_locations": 3,
                "max_users": 5,
                "storage_gb": 5
            },
            "premium": {
                "name": "Premium",
                "price": 149.99,
                "features": ["ai_analytics", "ar_vr_tours", "advanced_integrations", "priority_support", "custom_reports"],
                "max_locations": 10,
                "max_users": 15,
                "storage_gb": 25
            },
            "enterprise": {
                "name": "Enterprise",
                "price": 299.99,
                "features": ["unlimited_features", "white_label", "api_access", "dedicated_support", "custom_development"],
                "max_locations": -1,  # Unlimited
                "max_users": -1,      # Unlimited
                "storage_gb": 100
            }
        }
        
        self.init_database()
        self.setup_routes()
        self.start_license_monitor()
        
    def _generate_encryption_key(self):
        """Generate or load encryption key for license data"""
        key_file = "license_key.key"
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            return key
    
    def init_database(self):
        """Initialize license database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Licenses table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                company_name TEXT,
                tier TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                last_check TIMESTAMP,
                features TEXT,
                usage_data TEXT,
                encrypted_data TEXT
            )
        ''')
        
        # License validation logs
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS license_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT,
                action TEXT,
                status TEXT,
                details TEXT,
                ip_address TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Usage tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usage_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT,
                feature_used TEXT,
                usage_count INTEGER DEFAULT 1,
                date DATE,
                metadata TEXT
            )
        ''')
        
        # Insert demo licenses
        demo_licenses = [
            {
                "license_key": "OMNI-BASIC-2024-DEMO1",
                "user_id": "demo_user_1",
                "company_name": "Demo Hotel Bled",
                "tier": "basic",
                "expires_at": (datetime.now() + timedelta(days=30)).isoformat()
            },
            {
                "license_key": "OMNI-PREMIUM-2024-DEMO2", 
                "user_id": "demo_user_2",
                "company_name": "Premium Resort Portorož",
                "tier": "premium",
                "expires_at": (datetime.now() + timedelta(days=90)).isoformat()
            },
            {
                "license_key": "OMNI-ENTERPRISE-2024-DEMO3",
                "user_id": "demo_user_3", 
                "company_name": "Enterprise Chain Slovenia",
                "tier": "enterprise",
                "expires_at": (datetime.now() + timedelta(days=365)).isoformat()
            }
        ]
        
        for license_data in demo_licenses:
            try:
                features = json.dumps(self.license_tiers[license_data["tier"]]["features"])
                encrypted_data = self.cipher_suite.encrypt(json.dumps(license_data).encode()).decode()
                
                cursor.execute('''
                    INSERT OR IGNORE INTO licenses 
                    (license_key, user_id, company_name, tier, expires_at, features, encrypted_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    license_data["license_key"],
                    license_data["user_id"],
                    license_data["company_name"],
                    license_data["tier"],
                    license_data["expires_at"],
                    features,
                    encrypted_data
                ))
            except Exception as e:
                print(f"Error inserting demo license: {e}")
        
        conn.commit()
        conn.close()
        print("✅ License database initialized with demo data")
    
    def validate_license_cloud(self, license_key):
        """Validate license with cloud server"""
        try:
            # Demo cloud validation - v produkciji bi to bil pravi API klic
            payload = {
                "license_key": license_key,
                "timestamp": int(time.time()),
                "client_version": "1.0.0"
            }
            
            # Simulate cloud response
            if "DEMO" in license_key:
                return {
                    "valid": True,
                    "tier": license_key.split("-")[1].lower(),
                    "expires_at": (datetime.now() + timedelta(days=30)).isoformat(),
                    "features": self.license_tiers.get(license_key.split("-")[1].lower(), {}).get("features", []),
                    "message": "Demo license validated successfully"
                }
            else:
                return {
                    "valid": False,
                    "message": "License not found in cloud database"
                }
                
        except Exception as e:
            print(f"Cloud validation error: {e}")
            return {"valid": False, "message": f"Cloud validation failed: {str(e)}"}
    
    def validate_license_local(self, license_key):
        """Validate license locally"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM licenses WHERE license_key = ? AND status = 'active'
        ''', (license_key,))
        
        license_data = cursor.fetchone()
        conn.close()
        
        if not license_data:
            return {"valid": False, "message": "License not found locally"}
        
        # Check expiration
        expires_at = datetime.fromisoformat(license_data[6])
        if expires_at < datetime.now():
            return {"valid": False, "message": "License expired"}
        
        return {
            "valid": True,
            "tier": license_data[3],
            "expires_at": license_data[6],
            "features": json.loads(license_data[8]) if license_data[8] else [],
            "company_name": license_data[2]
        }
    
    def check_feature_access(self, license_key, feature):
        """Check if license has access to specific feature"""
        validation = self.validate_license_local(license_key)
        if not validation["valid"]:
            return False
        
        return feature in validation.get("features", [])
    
    def log_license_action(self, license_key, action, status, details="", ip_address=""):
        """Log license validation actions"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO license_logs (license_key, action, status, details, ip_address)
            VALUES (?, ?, ?, ?, ?)
        ''', (license_key, action, status, details, ip_address))
        
        conn.commit()
        conn.close()
    
    def track_feature_usage(self, license_key, feature, metadata=None):
        """Track feature usage for analytics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        today = datetime.now().date().isoformat()
        
        # Check if usage exists for today
        cursor.execute('''
            SELECT usage_count FROM usage_tracking 
            WHERE license_key = ? AND feature_used = ? AND date = ?
        ''', (license_key, feature, today))
        
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute('''
                UPDATE usage_tracking 
                SET usage_count = usage_count + 1, metadata = ?
                WHERE license_key = ? AND feature_used = ? AND date = ?
            ''', (json.dumps(metadata) if metadata else None, license_key, feature, today))
        else:
            cursor.execute('''
                INSERT INTO usage_tracking (license_key, feature_used, date, metadata)
                VALUES (?, ?, ?, ?)
            ''', (license_key, feature, today, json.dumps(metadata) if metadata else None))
        
        conn.commit()
        conn.close()
    
    def start_license_monitor(self):
        """Start background license monitoring"""
        def monitor_licenses():
            while True:
                try:
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    
                    # Get all active licenses
                    cursor.execute('SELECT license_key FROM licenses WHERE status = "active"')
                    licenses = cursor.fetchall()
                    
                    for (license_key,) in licenses:
                        # Validate with cloud every hour
                        cloud_validation = self.validate_license_cloud(license_key)
                        
                        if cloud_validation["valid"]:
                            # Update last check
                            cursor.execute('''
                                UPDATE licenses SET last_check = CURRENT_TIMESTAMP 
                                WHERE license_key = ?
                            ''', (license_key,))
                            
                            self.log_license_action(license_key, "auto_check", "success", "Cloud validation passed")
                        else:
                            self.log_license_action(license_key, "auto_check", "failed", cloud_validation.get("message", "Unknown error"))
                    
                    conn.commit()
                    conn.close()
                    
                except Exception as e:
                    print(f"License monitor error: {e}")
                
                # Check every hour
                time.sleep(3600)
        
        monitor_thread = threading.Thread(target=monitor_licenses, daemon=True)
        monitor_thread.start()
        print("🔄 License monitor started")
    
    def setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/')
        def dashboard():
            return render_template_string('''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI License System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; color: white; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: transform 0.3s ease; }
        .card:hover { transform: translateY(-5px); }
        .card h3 { color: #333; margin-bottom: 15px; font-size: 1.3em; }
        .license-form { background: white; border-radius: 15px; padding: 30px; margin-bottom: 20px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        .form-group input, .form-group select { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #667eea; }
        .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; transition: all 0.3s ease; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .license-list { background: white; border-radius: 15px; padding: 25px; }
        .license-item { padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; }
        .license-item.active { border-color: #4CAF50; background: #f8fff8; }
        .license-item.expired { border-color: #f44336; background: #fff8f8; }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status.active { background: #4CAF50; color: white; }
        .status.expired { background: #f44336; color: white; }
        .tier-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
        .tier-basic { background: #2196F3; color: white; }
        .tier-standard { background: #FF9800; color: white; }
        .tier-premium { background: #9C27B0; color: white; }
        .tier-enterprise { background: #4CAF50; color: white; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .stat-item { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px; }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 OMNI License System</h1>
            <p>Avtomatski check-in na oblak za preverjanje naročnine</p>
        </div>
        
        <div class="dashboard">
            <div class="card">
                <h3>📊 Statistike</h3>
                <div class="stats" id="stats">
                    <div class="stat-item">
                        <div class="stat-number" id="totalLicenses">-</div>
                        <div class="stat-label">Skupaj licenc</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" id="activeLicenses">-</div>
                        <div class="stat-label">Aktivne</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" id="expiredLicenses">-</div>
                        <div class="stat-label">Potekle</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>🎯 License Tiers</h3>
                <div id="tierInfo">
                    <div style="margin-bottom: 10px;"><span class="tier-badge tier-basic">Basic</span> €29.99/mesec</div>
                    <div style="margin-bottom: 10px;"><span class="tier-badge tier-standard">Standard</span> €79.99/mesec</div>
                    <div style="margin-bottom: 10px;"><span class="tier-badge tier-premium">Premium</span> €149.99/mesec</div>
                    <div><span class="tier-badge tier-enterprise">Enterprise</span> €299.99/mesec</div>
                </div>
            </div>
        </div>
        
        <div class="license-form">
            <h3>🔍 Preveri licenco</h3>
            <div class="form-group">
                <label for="licenseKey">License Key:</label>
                <input type="text" id="licenseKey" placeholder="OMNI-BASIC-2024-DEMO1" value="OMNI-BASIC-2024-DEMO1">
            </div>
            <button class="btn" onclick="validateLicense()">Preveri licenco</button>
            <div id="validationResult" style="margin-top: 20px;"></div>
        </div>
        
        <div class="license-list">
            <h3>📋 Aktivne licence</h3>
            <div id="licensesList"></div>
        </div>
    </div>

    <script>
        async function loadData() {
            try {
                const response = await fetch('/api/licenses');
                const data = await response.json();
                
                // Update stats
                document.getElementById('totalLicenses').textContent = data.total || 0;
                document.getElementById('activeLicenses').textContent = data.active || 0;
                document.getElementById('expiredLicenses').textContent = data.expired || 0;
                
                // Update licenses list
                const licensesList = document.getElementById('licensesList');
                licensesList.innerHTML = '';
                
                data.licenses.forEach(license => {
                    const div = document.createElement('div');
                    div.className = `license-item ${license.status}`;
                    div.innerHTML = `
                        <div style="display: flex; justify-content: between; align-items: center;">
                            <div>
                                <strong>${license.license_key}</strong>
                                <span class="tier-badge tier-${license.tier}">${license.tier.toUpperCase()}</span>
                                <span class="status ${license.status}">${license.status}</span>
                            </div>
                            <div style="text-align: right; font-size: 0.9em; color: #666;">
                                ${license.company_name}<br>
                                Poteče: ${new Date(license.expires_at).toLocaleDateString('sl-SI')}
                            </div>
                        </div>
                    `;
                    licensesList.appendChild(div);
                });
                
            } catch (error) {
                console.error('Error loading data:', error);
            }
        }
        
        async function validateLicense() {
            const licenseKey = document.getElementById('licenseKey').value;
            if (!licenseKey) {
                alert('Prosim vnesite license key');
                return;
            }
            
            try {
                const response = await fetch('/api/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ license_key: licenseKey })
                });
                
                const result = await response.json();
                const resultDiv = document.getElementById('validationResult');
                
                if (result.valid) {
                    resultDiv.innerHTML = `
                        <div style="padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; color: #155724;">
                            <strong>✅ Licenca veljavna!</strong><br>
                            Tier: <span class="tier-badge tier-${result.tier}">${result.tier.toUpperCase()}</span><br>
                            Poteče: ${new Date(result.expires_at).toLocaleDateString('sl-SI')}<br>
                            Podjetje: ${result.company_name || 'N/A'}
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `
                        <div style="padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
                            <strong>❌ Licenca ni veljavna!</strong><br>
                            Razlog: ${result.message}
                        </div>
                    `;
                }
                
            } catch (error) {
                console.error('Validation error:', error);
                document.getElementById('validationResult').innerHTML = `
                    <div style="padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
                        <strong>❌ Napaka pri preverjanju!</strong><br>
                        ${error.message}
                    </div>
                `;
            }
        }
        
        // Load data on page load
        loadData();
        
        // Refresh data every 30 seconds
        setInterval(loadData, 30000);
    </script>
</body>
</html>
            ''')
        
        @self.app.route('/api/licenses')
        def get_licenses():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM licenses ORDER BY created_at DESC')
            licenses = cursor.fetchall()
            
            # Count statistics
            cursor.execute('SELECT COUNT(*) FROM licenses')
            total = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM licenses WHERE status = "active"')
            active = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM licenses WHERE expires_at < datetime("now")')
            expired = cursor.fetchone()[0]
            
            conn.close()
            
            license_list = []
            for license_data in licenses:
                license_list.append({
                    "license_key": license_data[1],
                    "user_id": license_data[2],
                    "company_name": license_data[3],
                    "tier": license_data[4],
                    "status": license_data[5],
                    "created_at": license_data[6],
                    "expires_at": license_data[7],
                    "last_check": license_data[8]
                })
            
            return jsonify({
                "total": total,
                "active": active,
                "expired": expired,
                "licenses": license_list
            })
        
        @self.app.route('/api/validate', methods=['POST'])
        def validate_license():
            data = request.get_json()
            license_key = data.get('license_key')
            
            if not license_key:
                return jsonify({"valid": False, "message": "License key required"})
            
            # First try cloud validation
            cloud_result = self.validate_license_cloud(license_key)
            
            # Then local validation
            local_result = self.validate_license_local(license_key)
            
            # Log the validation attempt
            ip_address = request.remote_addr
            self.log_license_action(license_key, "manual_validation", 
                                  "success" if local_result["valid"] else "failed",
                                  f"Cloud: {cloud_result['valid']}, Local: {local_result['valid']}", 
                                  ip_address)
            
            # Return local result (more reliable)
            return jsonify(local_result)
        
        @self.app.route('/api/feature-check', methods=['POST'])
        def check_feature():
            data = request.get_json()
            license_key = data.get('license_key')
            feature = data.get('feature')
            
            if not license_key or not feature:
                return jsonify({"access": False, "message": "License key and feature required"})
            
            has_access = self.check_feature_access(license_key, feature)
            
            if has_access:
                # Track feature usage
                self.track_feature_usage(license_key, feature, {"ip": request.remote_addr})
            
            return jsonify({
                "access": has_access,
                "feature": feature,
                "message": "Access granted" if has_access else "Feature not available in your plan"
            })
    
    def run_server(self, host='0.0.0.0', port=5016, debug=True):
        """Run the license system server"""
        print(f"🚀 Starting OMNI License System on http://{host}:{port}")
        print("📋 Demo License Keys:")
        print("   • OMNI-BASIC-2024-DEMO1 (Basic tier)")
        print("   • OMNI-PREMIUM-2024-DEMO2 (Premium tier)")  
        print("   • OMNI-ENTERPRISE-2024-DEMO3 (Enterprise tier)")
        print("🔄 License monitor running in background")
        
        self.app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    license_system = OmniLicenseSystem()
    license_system.run_server()