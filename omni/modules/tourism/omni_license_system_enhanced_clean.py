#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMNI License System Enhanced - Licenčni sistem za OMNI aplikacije
Avtor: Omni AI Assistant
Verzija: 2.0
"""

import sqlite3
import uuid
import hashlib
import jwt
import json
import threading
import time
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template_string
from werkzeug.security import generate_password_hash, check_password_hash
import os

class OmniLicenseSystemEnhanced:
    def __init__(self, db_path='omni_licenses_enhanced.db'):
        self.db_path = db_path
        self.app = Flask(__name__)
        self.app.secret_key = 'omni-license-secret-key-2024'
        self.jwt_secret = 'omni-jwt-secret-2024'
        
        # Inicializiraj bazo podatkov
        self.init_database()
        
        # Nastavi API endpointe
        self.setup_routes()
        
        # Zaženi background procese
        self.start_background_tasks()
    
    def init_database(self):
        """Inicializiraj bazo podatkov z vsemi potrebnimi tabelami"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela licenc
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT UNIQUE NOT NULL,
                license_key TEXT UNIQUE NOT NULL,
                company_name TEXT NOT NULL,
                contact_email TEXT NOT NULL,
                contact_phone TEXT,
                address TEXT,
                plan TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                last_check TIMESTAMP,
                usage_count INTEGER DEFAULT 0,
                max_users INTEGER DEFAULT 1,
                max_locations INTEGER DEFAULT 1,
                storage_gb INTEGER DEFAULT 1,
                active_devices INTEGER DEFAULT 0,
                hardware_fingerprint TEXT,
                notes TEXT
            )
        ''')
        
        # Tabela admin uporabnikov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                role TEXT DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        
        # Tabela audit logov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                action TEXT NOT NULL,
                client_id TEXT,
                admin_user TEXT,
                ip_address TEXT,
                details TEXT,
                success BOOLEAN DEFAULT TRUE,
                risk_level TEXT DEFAULT 'low'
            )
        ''')
        
        # Tabela aktivacij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                device_name TEXT,
                activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP,
                status TEXT DEFAULT 'active',
                FOREIGN KEY (client_id) REFERENCES licenses (client_id)
            )
        ''')
        
        # Tabela plačil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency TEXT DEFAULT 'EUR',
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                payment_method TEXT,
                transaction_id TEXT,
                status TEXT DEFAULT 'completed',
                FOREIGN KEY (client_id) REFERENCES licenses (client_id)
            )
        ''')
        
        # Ustvari demo admin uporabnika
        cursor.execute('SELECT COUNT(*) FROM admin_users WHERE username = ?', ('admin',))
        if cursor.fetchone()[0] == 0:
            admin_password = generate_password_hash('admin123')
            cursor.execute('''
                INSERT INTO admin_users (username, password_hash, email, role)
                VALUES (?, ?, ?, ?)
            ''', ('admin', admin_password, 'admin@omni.si', 'super_admin'))
        
        # Ustvari demo licence
        self.create_demo_licenses(cursor)
        
        conn.commit()
        conn.close()
        
        print("✅ Baza podatkov inicializirana z demo podatki")
    
    def create_demo_licenses(self, cursor):
        """Ustvari demo licence za testiranje"""
        demo_licenses = [
            {
                'company_name': 'Hotel Bled d.o.o.',
                'contact_email': 'info@hotel-bled.si',
                'contact_phone': '+386 4 579 1000',
                'address': 'Cesta svobode 12, 4260 Bled',
                'plan': 'premium'
            },
            {
                'company_name': 'Kamp Soca',
                'contact_email': 'rezervacije@kamp-soca.si',
                'contact_phone': '+386 5 388 9900',
                'address': 'Trenta 50, 5232 Soča',
                'plan': 'basic'
            },
            {
                'company_name': 'Gostišče Pr\' Matevžu',
                'contact_email': 'matevz@gostisce.si',
                'contact_phone': '+386 1 234 5678',
                'address': 'Glavni trg 5, 1000 Ljubljana',
                'plan': 'demo'
            },
            {
                'company_name': 'Turistična agencija Alpina',
                'contact_email': 'info@alpina-tours.si',
                'contact_phone': '+386 4 201 2000',
                'address': 'Kidričeva 10, 4000 Kranj',
                'plan': 'enterprise'
            },
            {
                'company_name': 'Wellness Center Terme',
                'contact_email': 'wellness@terme.si',
                'contact_phone': '+386 3 423 4000',
                'address': 'Zdraviliška 20, 3000 Celje',
                'plan': 'premium'
            }
        ]
        
        for demo_data in demo_licenses:
            client_id = f"OMNI{str(uuid.uuid4())[:8].upper()}"
            license_key = str(uuid.uuid4())
            
            # Preveri, če licenca že obstaja
            cursor.execute('SELECT COUNT(*) FROM licenses WHERE company_name = ?', (demo_data['company_name'],))
            if cursor.fetchone()[0] == 0:
                plan_config = self.get_plan_config(demo_data['plan'])
                expires_at = datetime.now() + timedelta(days=plan_config['duration_days'])
                
                cursor.execute('''
                    INSERT INTO licenses (
                        client_id, license_key, company_name, contact_email, 
                        contact_phone, address, plan, expires_at, max_users, 
                        max_locations, storage_gb
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    client_id, license_key, demo_data['company_name'],
                    demo_data['contact_email'], demo_data['contact_phone'],
                    demo_data['address'], demo_data['plan'], expires_at,
                    plan_config['max_users'], plan_config['max_locations'],
                    plan_config['storage_gb']
                ))
    
    def get_plan_config(self, plan):
        """Vrni konfiguracijo za določen paket"""
        plans = {
            'demo': {
                'name': 'Demo',
                'price': 0,
                'duration_days': 14,
                'max_users': 2,
                'max_locations': 1,
                'storage_gb': 1,
                'support_level': 'Email',
                'features': ['Osnovne funkcije', 'POS sistem', 'Poročila'],
                'modules': ['pos', 'reports']
            },
            'basic': {
                'name': 'Basic',
                'price': 299,
                'duration_days': 365,
                'max_users': 5,
                'max_locations': 1,
                'storage_gb': 10,
                'support_level': 'Email + Chat',
                'features': ['POS sistem', 'Zaloge', 'Poročila', 'Rezervacije'],
                'modules': ['pos', 'inventory', 'reports', 'bookings']
            },
            'premium': {
                'name': 'Premium',
                'price': 599,
                'duration_days': 365,
                'max_users': 20,
                'max_locations': 5,
                'storage_gb': 50,
                'support_level': 'Prioritetna podpora',
                'features': ['Vse Basic funkcije', 'AI optimizacija', 'Analitika', 'Mobile app'],
                'modules': ['pos', 'inventory', 'reports', 'bookings', 'ai', 'analytics', 'mobile']
            },
            'enterprise': {
                'name': 'Enterprise',
                'price': 1299,
                'duration_days': 365,
                'max_users': -1,  # Neomejeno
                'max_locations': -1,  # Neomejeno
                'storage_gb': 500,
                'support_level': '24/7 podpora',
                'features': ['Vse Premium funkcije', 'Custom integracije', 'Dedicated support'],
                'modules': ['all']
            }
        }
        return plans.get(plan, plans['demo'])
    
    def setup_routes(self):
        """Nastavi Flask API endpointe"""
        
        @self.app.route('/')
        def admin_dashboard():
            """Admin konzola"""
            return render_template_string(self.get_admin_template())
        
        @self.app.route('/api/validate', methods=['POST'])
        def validate_license():
            """Preveri veljavnost licence"""
            try:
                data = request.get_json()
                client_id = data.get('client_id')
                license_key = data.get('license_key')
                hardware_fingerprint = data.get('hardware_fingerprint', '')
                
                if not client_id or not license_key:
                    return jsonify({
                        'valid': False,
                        'error': 'Manjkajo obvezni parametri'
                    }), 400
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Poišči licenco
                cursor.execute('''
                    SELECT * FROM licenses 
                    WHERE client_id = ? AND license_key = ?
                ''', (client_id, license_key))
                
                license_data = cursor.fetchone()
                
                if not license_data:
                    self.log_audit('license_validation', client_id, None, 
                                 request.remote_addr, 'Licenca ne obstaja', False, 'high')
                    return jsonify({
                        'valid': False,
                        'error': 'Licenca ne obstaja'
                    }), 404
                
                # Preveri status in datum poteka
                expires_at = datetime.fromisoformat(license_data[10])
                status = license_data[8]
                
                if status != 'active':
                    self.log_audit('license_validation', client_id, None,
                                 request.remote_addr, f'Licenca ni aktivna: {status}', False, 'medium')
                    return jsonify({
                        'valid': False,
                        'error': f'Licenca ni aktivna: {status}'
                    }), 403
                
                if expires_at < datetime.now():
                    # Avtomatsko nastavi status na expired
                    cursor.execute('UPDATE licenses SET status = ? WHERE client_id = ?', 
                                 ('expired', client_id))
                    conn.commit()
                    
                    self.log_audit('license_validation', client_id, None,
                                 request.remote_addr, 'Licenca je potekla', False, 'medium')
                    return jsonify({
                        'valid': False,
                        'error': 'Licenca je potekla'
                    }), 403
                
                # Posodobi statistike
                cursor.execute('''
                    UPDATE licenses 
                    SET last_check = CURRENT_TIMESTAMP, usage_count = usage_count + 1,
                        hardware_fingerprint = ?
                    WHERE client_id = ?
                ''', (hardware_fingerprint, client_id))
                
                conn.commit()
                conn.close()
                
                # Pripravi odgovor
                plan_config = self.get_plan_config(license_data[7])
                
                self.log_audit('license_validation', client_id, None,
                             request.remote_addr, 'Uspešna validacija licence', True, 'low')
                
                return jsonify({
                    'valid': True,
                    'client_id': client_id,
                    'plan': license_data[7],
                    'expires_at': license_data[10],
                    'max_users': license_data[13],
                    'max_locations': license_data[14],
                    'storage_gb': license_data[15],
                    'modules': plan_config['modules'],
                    'features': plan_config['features']
                })
                
            except Exception as e:
                self.log_audit('license_validation', client_id if 'client_id' in locals() else None, 
                             None, request.remote_addr, f'Napaka pri validaciji: {str(e)}', False, 'high')
                return jsonify({
                    'valid': False,
                    'error': 'Interna napaka strežnika'
                }), 500
        
        @self.app.route('/api/licenses', methods=['GET'])
        def get_licenses():
            """Vrni seznam vseh licenc"""
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT client_id, company_name, contact_email, plan, status, 
                       created_at, expires_at, usage_count, max_users, active_devices
                FROM licenses
                ORDER BY created_at DESC
            ''')
            
            licenses = []
            for row in cursor.fetchall():
                expires_at = datetime.fromisoformat(row[6])
                days_until_expiry = (expires_at - datetime.now()).days
                
                # Določi status glede na datum poteka
                if row[4] == 'active' and days_until_expiry <= 7:
                    status = 'expiring_soon'
                elif row[4] == 'active' and days_until_expiry < 0:
                    status = 'expired'
                else:
                    status = row[4]
                
                licenses.append({
                    'client_id': row[0],
                    'company_name': row[1],
                    'contact_email': row[2],
                    'plan': row[3],
                    'status': status,
                    'created_at': row[5],
                    'expires_at': row[6],
                    'usage_count': row[7],
                    'max_users': row[8],
                    'active_devices': row[9] or 0
                })
            
            conn.close()
            return jsonify(licenses)
        
        @self.app.route('/api/create', methods=['POST'])
        def create_license():
            """Ustvari novo licenco"""
            try:
                data = request.get_json()
                
                # Generiraj unikaten client_id in license_key
                client_id = f"OMNI{str(uuid.uuid4())[:8].upper()}"
                license_key = str(uuid.uuid4())
                
                plan = data.get('plan', 'demo')
                plan_config = self.get_plan_config(plan)
                
                # Izračunaj datum poteka
                duration_days = data.get('custom_duration', plan_config['duration_days'])
                expires_at = datetime.now() + timedelta(days=duration_days)
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO licenses (
                        client_id, license_key, company_name, contact_email,
                        contact_phone, address, plan, expires_at, max_users,
                        max_locations, storage_gb
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    client_id, license_key, data.get('company_name'),
                    data.get('contact_email'), data.get('contact_phone', ''),
                    data.get('address', ''), plan, expires_at,
                    plan_config['max_users'], plan_config['max_locations'],
                    plan_config['storage_gb']
                ))
                
                conn.commit()
                conn.close()
                
                self.log_audit('license_created', client_id, 'admin',
                             request.remote_addr, f'Ustvarjena nova licenca: {plan}', True, 'low')
                
                return jsonify({
                    'success': True,
                    'client_id': client_id,
                    'license_key': license_key,
                    'plan': plan,
                    'expires_at': expires_at.isoformat()
                })
                
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/extend/<client_id>', methods=['POST'])
        def extend_license(client_id):
            """Podaljšaj licenco"""
            try:
                data = request.get_json()
                days = data.get('days', 30)
                admin_user = data.get('admin_user', 'system')
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Poišči trenutni datum poteka
                cursor.execute('SELECT expires_at FROM licenses WHERE client_id = ?', (client_id,))
                result = cursor.fetchone()
                
                if not result:
                    return jsonify({'success': False, 'error': 'Licenca ne obstaja'}), 404
                
                current_expires = datetime.fromisoformat(result[0])
                new_expires = current_expires + timedelta(days=days)
                
                cursor.execute('''
                    UPDATE licenses 
                    SET expires_at = ?, status = 'active'
                    WHERE client_id = ?
                ''', (new_expires, client_id))
                
                conn.commit()
                conn.close()
                
                self.log_audit('license_extended', client_id, admin_user,
                             request.remote_addr, f'Licenca podaljšana za {days} dni', True, 'low')
                
                return jsonify({
                    'success': True,
                    'new_expires_at': new_expires.isoformat()
                })
                
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)}), 500
        
        @self.app.route('/api/suspend/<client_id>', methods=['POST'])
        def suspend_license(client_id):
            """Začasno onemogoči licenco"""
            try:
                data = request.get_json()
                reason = data.get('reason', 'Admin action')
                admin_user = data.get('admin_user', 'system')
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE licenses 
                    SET status = 'suspended', notes = ?
                    WHERE client_id = ?
                ''', (f'Suspended: {reason}', client_id))
                
                if cursor.rowcount == 0:
                    return jsonify({'success': False, 'error': 'Licenca ne obstaja'}), 404
                
                conn.commit()
                conn.close()
                
                self.log_audit('license_suspended', client_id, admin_user,
                             request.remote_addr, f'Licenca začasno onemogočena: {reason}', True, 'medium')
                
                return jsonify({'success': True})
                
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)}), 500
        
        @self.app.route('/api/reactivate/<client_id>', methods=['POST'])
        def reactivate_license(client_id):
            """Ponovno aktiviraj licenco"""
            try:
                data = request.get_json()
                admin_user = data.get('admin_user', 'system')
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE licenses 
                    SET status = 'active', notes = NULL
                    WHERE client_id = ?
                ''', (client_id,))
                
                if cursor.rowcount == 0:
                    return jsonify({'success': False, 'error': 'Licenca ne obstaja'}), 404
                
                conn.commit()
                conn.close()
                
                self.log_audit('license_reactivated', client_id, admin_user,
                             request.remote_addr, 'Licenca ponovno aktivirana', True, 'low')
                
                return jsonify({'success': True})
                
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)}), 500
        
        @self.app.route('/api/plans', methods=['GET'])
        def get_plans():
            """Vrni seznam vseh paketov"""
            plans = {
                'demo': self.get_plan_config('demo'),
                'basic': self.get_plan_config('basic'),
                'premium': self.get_plan_config('premium'),
                'enterprise': self.get_plan_config('enterprise')
            }
            return jsonify(plans)
        
        @self.app.route('/api/audit', methods=['GET'])
        def get_audit_logs():
            """Vrni audit loge"""
            limit = request.args.get('limit', 50, type=int)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT timestamp, action, client_id, admin_user, ip_address, 
                       details, success, risk_level
                FROM audit_logs
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (limit,))
            
            logs = []
            for row in cursor.fetchall():
                logs.append({
                    'timestamp': row[0],
                    'action': row[1],
                    'client_id': row[2],
                    'admin_user': row[3],
                    'ip_address': row[4],
                    'details': row[5],
                    'success': bool(row[6]),
                    'risk_level': row[7]
                })
            
            conn.close()
            return jsonify(logs)
    
    def log_audit(self, action, client_id, admin_user, ip_address, details, success=True, risk_level='low'):
        """Zapiši audit log"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO audit_logs (action, client_id, admin_user, ip_address, details, success, risk_level)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (action, client_id, admin_user, ip_address, details, success, risk_level))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Napaka pri pisanju audit loga: {e}")
    
    def start_background_tasks(self):
        """Zaženi background procese"""
        def cleanup_expired_licenses():
            """Počisti potekle licence"""
            while True:
                try:
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    
                    # Nastavi status poteklih licenc
                    cursor.execute('''
                        UPDATE licenses 
                        SET status = 'expired' 
                        WHERE expires_at < CURRENT_TIMESTAMP AND status = 'active'
                    ''')
                    
                    if cursor.rowcount > 0:
                        print(f"🔄 Označenih {cursor.rowcount} poteklih licenc")
                    
                    conn.commit()
                    conn.close()
                    
                    # Počakaj 1 uro
                    time.sleep(3600)
                    
                except Exception as e:
                    print(f"Napaka pri čiščenju licenc: {e}")
                    time.sleep(300)  # Počakaj 5 minut ob napaki
        
        # Zaženi background thread
        cleanup_thread = threading.Thread(target=cleanup_expired_licenses, daemon=True)
        cleanup_thread.start()
    
    def get_admin_template(self):
        """Vrni HTML template za admin konzolo"""
        return '''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI License System - Admin Konzola</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .nav-tabs { display: flex; background: white; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .nav-tab { flex: 1; padding: 15px; text-align: center; cursor: pointer; border-radius: 10px; transition: all 0.3s; }
        .nav-tab.active { background: #667eea; color: white; }
        .nav-tab:hover { background: #f0f0f0; }
        .nav-tab.active:hover { background: #667eea; }
        .tab-content { display: none; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .tab-content.active { display: block; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
        .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; transition: all 0.3s; margin: 5px; }
        .btn-primary { background: #667eea; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-warning { background: #ffc107; color: #212529; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-info { background: #17a2b8; color: white; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .licenses-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .licenses-table th, .licenses-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .licenses-table th { background: #f8f9fa; font-weight: bold; }
        .licenses-table tr:hover { background: #f5f5f5; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-active { background: #d4edda; color: #155724; }
        .status-expired { background: #f8d7da; color: #721c24; }
        .status-expiring_soon { background: #fff3cd; color: #856404; }
        .status-suspended { background: #f1f3f4; color: #5f6368; }
        .plan-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .plan-demo { background: #e2e3e5; color: #383d41; }
        .plan-basic { background: #cce5ff; color: #004085; }
        .plan-premium { background: #d4edda; color: #155724; }
        .plan-enterprise { background: #fff3cd; color: #856404; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 5px; }
        .alert { padding: 15px; margin: 10px 0; border-radius: 5px; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .search-box { width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .audit-log { padding: 10px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ddd; }
        .risk-low { border-left-color: #28a745; background: #f8fff9; }
        .risk-medium { border-left-color: #ffc107; background: #fffdf5; }
        .risk-high { border-left-color: #dc3545; background: #fff5f5; }
        .loading { text-align: center; padding: 20px; color: #666; }
        .plan-card { border: 2px solid #e9ecef; border-radius: 10px; padding: 20px; text-align: center; }
        .plan-card.premium { border-color: #28a745; }
        .plan-card.enterprise { border-color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 OMNI License System Enhanced</h1>
        <p>Centralizirano upravljanje licenc za OMNI aplikacije</p>
    </div>
    
    <div class="container">
        <div class="nav-tabs">
            <div class="nav-tab active" onclick="showTab('dashboard')">📊 Nadzorna plošča</div>
            <div class="nav-tab" onclick="showTab('licenses')">📋 Licence</div>
            <div class="nav-tab" onclick="showTab('create')">➕ Nova licenca</div>
            <div class="nav-tab" onclick="showTab('plans')">📦 Paketi</div>
            <div class="nav-tab" onclick="showTab('audit')">🔍 Audit logi</div>
        </div>
        
        <!-- Dashboard Tab -->
        <div id="dashboard" class="tab-content active">
            <h2>📊 Pregled sistema</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value" id="totalRevenue">0€</div>
                    <div class="stat-label">Skupni prihodki</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="monthlyRevenue">0€</div>
                    <div class="stat-label">Mesečni prihodki</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="conversionRate">0%</div>
                    <div class="stat-label">Konverzija demo → plačano</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="churnRate">0%</div>
                    <div class="stat-label">Churn rate</div>
                </div>
            </div>
            
            <div class="form-grid">
                <div>
                    <h3>🔄 Sistemske funkcije</h3>
                    <button class="btn btn-primary" onclick="refreshLicenses()">Osveži licence</button>
                    <button class="btn btn-info" onclick="exportLicenses()">Izvozi CSV</button>
                    <button class="btn btn-warning" onclick="refreshAuditLogs()">Osveži audit loge</button>
                </div>
                <div>
                    <h3>📈 Hitri pregled</h3>
                    <p>Sistem deluje normalno</p>
                    <p>Zadnja sinhronizacija: <span id="lastSync">Nalagam...</span></p>
                    <p>Aktivnih licenc: <span id="activeLicenses">Nalagam...</span></p>
                </div>
            </div>
        </div>
        
        <!-- Licenses Tab -->
        <div id="licenses" class="tab-content">
            <h2>📋 Upravljanje licenc</h2>
            <input type="text" id="licenseSearch" class="search-box" placeholder="Išči po podjetju, Client ID, emailu..." onkeyup="filterLicenses()">
            <div id="licensesContent">
                <div class="loading">Nalagam licence...</div>
            </div>
        </div>
        
        <!-- Create License Tab -->
        <div id="create" class="tab-content">
            <h2>➕ Ustvari novo licenco</h2>
            <div class="form-grid">
                <div>
                    <div class="form-group">
                        <label for="companyName">Ime podjetja *</label>
                        <input type="text" id="companyName" required>
                    </div>
                    <div class="form-group">
                        <label for="contactEmail">Kontaktni email *</label>
                        <input type="email" id="contactEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="contactPhone">Telefon</label>
                        <input type="tel" id="contactPhone">
                    </div>
                </div>
                <div>
                    <div class="form-group">
                        <label for="address">Naslov</label>
                        <textarea id="address" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="licensePlan">Licenčni paket *</label>
                        <select id="licensePlan" onchange="updatePlanInfo()" required>
                            <option value="demo">Demo (14 dni)</option>
                            <option value="basic">Basic (299€/leto)</option>
                            <option value="premium">Premium (599€/leto)</option>
                            <option value="enterprise">Enterprise (1299€/leto)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="customDuration">Prilagojeno trajanje (dni)</label>
                        <input type="number" id="customDuration" placeholder="Pustite prazno za privzeto">
                    </div>
                </div>
            </div>
            
            <div id="planInfo" class="alert alert-success">
                <strong>Demo paket: 2 uporabnika, 1 lokacija, osnovne funkcije, 14 dni veljavnosti</strong>
            </div>
            
            <button class="btn btn-success" onclick="createLicense()">🔐 Ustvari licenco</button>
            
            <div id="createResult"></div>
        </div>
        
        <!-- Plans Tab -->
        <div id="plans" class="tab-content">
            <h2>📦 Licenčni paketi</h2>
            <div id="plansContent">
                <div class="loading">Nalagam pakete...</div>
            </div>
        </div>
        
        <!-- Audit Tab -->
        <div id="audit" class="tab-content">
            <h2>🔍 Audit logi</h2>
            <div class="form-grid">
                <div>
                    <input type="text" id="auditSearch" class="search-box" placeholder="Išči po Client ID, akciji..." onkeyup="filterAuditLogs()">
                </div>
                <div>
                    <select id="riskFilter" onchange="filterAuditLogs()">
                        <option value="">Vsi nivoji tveganja</option>
                        <option value="low">Nizko tveganje</option>
                        <option value="medium">Srednje tveganje</option>
                        <option value="high">Visoko tveganje</option>
                    </select>
                </div>
            </div>
            <div id="auditContent">
                <div class="loading">Nalagam audit loge...</div>
            </div>
        </div>
    </div>

    <script>
        let licenses = [];
        let filteredLicenses = [];
        let plans = {};
        let auditLogs = [];
        let filteredAuditLogs = [];

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
            
            // Naloži podatke za tab
            if (tabName === 'licenses') {
                loadLicenses();
            } else if (tabName === 'plans') {
                loadPlans();
            } else if (tabName === 'audit') {
                loadAuditLogs();
            } else if (tabName === 'dashboard') {
                loadDashboard();
            }
        }

        async function loadDashboard() {
            await loadLicenses();
            loadAnalytics();
            
            document.getElementById('lastSync').textContent = new Date().toLocaleString('sl-SI');
            document.getElementById('activeLicenses').textContent = licenses.filter(l => l.status === 'active').length;
        }

        async function loadLicenses() {
            try {
                const response = await fetch('/api/licenses');
                licenses = await response.json();
                filteredLicenses = [...licenses];
                displayLicenses(filteredLicenses);
            } catch (error) {
                console.error('Napaka pri nalaganju licenc:', error);
            }
        }

        function displayLicenses(licensesToShow) {
            const content = document.getElementById('licensesContent');
            
            if (licensesToShow.length === 0) {
                content.innerHTML = '<p>Ni licenc, ki bi ustrezale filtru.</p>';
                return;
            }
            
            let html = `
                <table class="licenses-table">
                    <thead>
                        <tr>
                            <th>Client ID</th>
                            <th>Podjetje</th>
                            <th>Paket</th>
                            <th>Status</th>
                            <th>Poteče</th>
                            <th>Naprave</th>
                            <th>Uporaba</th>
                            <th>Akcije</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            licensesToShow.forEach(license => {
                const expiresAt = new Date(license.expires_at).toLocaleDateString('sl-SI');
                const statusClass = `status-${license.status}`;
                const statusText = getStatusText(license.status);
                
                html += `
                    <tr>
                        <td><strong>${license.client_id}</strong></td>
                        <td>
                            ${license.company_name}<br>
                            <small>${license.contact_email}</small>
                        </td>
                        <td>
                            <span class="plan-badge plan-${license.plan}">${license.plan.toUpperCase()}</span>
                        </td>
                        <td>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </td>
                        <td>${expiresAt}</td>
                        <td>${license.active_devices || 0}/${license.max_users === -1 ? '∞' : license.max_users}</td>
                        <td>${license.usage_count || 0}</td>
                        <td>
                            <button class="btn btn-info" onclick="viewLicense('${license.client_id}')">👁️</button>
                            <button class="btn btn-warning" onclick="extendLicense('${license.client_id}')">⏰</button>
                            ${license.status === 'suspended' ? 
                                `<button class="btn btn-success" onclick="reactivateLicense('${license.client_id}')">✅</button>` :
                                `<button class="btn btn-danger" onclick="suspendLicense('${license.client_id}')">⏸️</button>`
                            }
                        </td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            
            content.innerHTML = html;
        }

        function getStatusText(status) {
            const statusMap = {
                'active': 'Aktivna',
                'expired': 'Potekla',
                'expiring_soon': 'Poteče kmalu',
                'deactivated': 'Deaktivirana',
                'suspended': 'Začasno onemogočena'
            };
            return statusMap[status] || status;
        }

        function filterLicenses() {
            const searchTerm = document.getElementById('licenseSearch').value.toLowerCase();
            
            filteredLicenses = licenses.filter(license => 
                license.company_name.toLowerCase().includes(searchTerm) ||
                license.client_id.toLowerCase().includes(searchTerm) ||
                license.contact_email.toLowerCase().includes(searchTerm) ||
                license.plan.toLowerCase().includes(searchTerm)
            );
            
            displayLicenses(filteredLicenses);
        }

        async function refreshLicenses() {
            document.getElementById('licensesContent').innerHTML = '<div class="loading">Osvežujem licence...</div>';
            await loadLicenses();
        }

        async function createLicense() {
            const companyName = document.getElementById('companyName').value;
            const contactEmail = document.getElementById('contactEmail').value;
            const contactPhone = document.getElementById('contactPhone').value;
            const address = document.getElementById('address').value;
            const plan = document.getElementById('licensePlan').value;
            const customDuration = document.getElementById('customDuration').value;
            
            if (!companyName || !contactEmail || !plan) {
                showResult('createResult', 'Prosimo, izpolnite vsa obvezna polja.', 'error');
                return;
            }
            
            const data = {
                company_name: companyName,
                contact_email: contactEmail,
                contact_phone: contactPhone,
                address: address,
                plan: plan
            };
            
            if (customDuration) {
                data.custom_duration = parseInt(customDuration);
            }
            
            try {
                const response = await fetch('/api/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showResult('createResult', `
                        <strong>Licenca uspešno ustvarjena!</strong><br>
                        <strong>Client ID:</strong> ${result.client_id}<br>
                        <strong>License Key:</strong> ${result.license_key}<br>
                        <strong>Paket:</strong> ${result.plan}<br>
                        <strong>Poteče:</strong> ${new Date(result.expires_at).toLocaleDateString('sl-SI')}
                    `, 'success');
                    
                    // Počisti formo
                    document.getElementById('companyName').value = '';
                    document.getElementById('contactEmail').value = '';
                    document.getElementById('contactPhone').value = '';
                    document.getElementById('address').value = '';
                    document.getElementById('customDuration').value = '';
                } else {
                    showResult('createResult', `Napaka: ${result.error}`, 'error');
                }
            } catch (error) {
                showResult('createResult', `Napaka pri ustvarjanju licence: ${error.message}`, 'error');
            }
        }

        function updatePlanInfo() {
            const plan = document.getElementById('licensePlan').value;
            const planInfo = document.getElementById('planInfo');
            
            const planDetails = {
                'demo': {
                    text: 'Demo paket: 2 uporabnika, 1 lokacija, osnovne funkcije, 14 dni veljavnosti',
                    class: 'alert-success'
                },
                'basic': {
                    text: 'Basic paket: 5 uporabnikov, 1 lokacija, POS + zaloge + poročila, 1 leto, 299€',
                    class: 'alert-success'
                },
                'premium': {
                    text: 'Premium paket: 20 uporabnikov, 5 lokacij, AI optimizacija + analitika, 1 leto, 599€',
                    class: 'alert-success'
                },
                'enterprise': {
                    text: 'Enterprise paket: neomejeno uporabnikov in lokacij, vse funkcije, 1 leto, 1299€',
                    class: 'alert-success'
                }
            };
            
            const details = planDetails[plan];
            planInfo.className = `alert ${details.class}`;
            planInfo.innerHTML = `<strong>${details.text}</strong>`;
        }

        async function loadPlans() {
            try {
                const response = await fetch('/api/plans');
                plans = await response.json();
                displayPlans(plans);
            } catch (error) {
                console.error('Napaka pri nalaganju paketov:', error);
            }
        }

        function displayPlans(plans) {
            const content = document.getElementById('plansContent');
            let html = '<div class="form-grid">';
            
            Object.entries(plans).forEach(([key, plan]) => {
                const cardClass = key === 'premium' ? 'plan-card premium' : 
                                 key === 'enterprise' ? 'plan-card enterprise' : 'plan-card';
                
                html += `
                    <div class="${cardClass}">
                        <h3>${plan.name}</h3>
                        <h2>${plan.price === 0 ? 'Brezplačno' : plan.price + '€'}</h2>
                        <p><strong>Trajanje:</strong> ${plan.duration_days} dni</p>
                        <p><strong>Uporabniki:</strong> ${plan.max_users === -1 ? 'Neomejeno' : plan.max_users}</p>
                        <p><strong>Lokacije:</strong> ${plan.max_locations === -1 ? 'Neomejeno' : plan.max_locations}</p>
                        <p><strong>Shramba:</strong> ${plan.storage_gb}GB</p>
                        <p><strong>Podpora:</strong> ${plan.support_level}</p>
                        <hr>
                        <h4>Funkcije:</h4>
                        <ul>
                            ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                        <hr>
                        <h4>Moduli:</h4>
                        <p>${plan.modules.includes('all') ? 'Vsi moduli' : plan.modules.join(', ')}</p>
                    </div>
                `;
            });
            
            html += '</div>';
            content.innerHTML = html;
        }

        async function loadAuditLogs() {
            try {
                const response = await fetch('/api/audit?limit=100');
                auditLogs = await response.json();
                filteredAuditLogs = [...auditLogs];
                displayAuditLogs(filteredAuditLogs);
            } catch (error) {
                console.error('Napaka pri nalaganju audit logov:', error);
            }
        }

        function displayAuditLogs(logsToShow) {
            const content = document.getElementById('auditContent');
            
            if (logsToShow.length === 0) {
                content.innerHTML = '<p>Ni audit logov, ki bi ustrezali filtru.</p>';
                return;
            }
            
            let html = '';
            logsToShow.forEach(log => {
                const timestamp = new Date(log.timestamp).toLocaleString('sl-SI');
                const riskClass = `risk-${log.risk_level}`;
                const successIcon = log.success ? '✅' : '❌';
                
                html += `
                    <div class="audit-log ${riskClass}">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong>${successIcon} ${log.action}</strong>
                            <small>${timestamp}</small>
                        </div>
                        <div>
                            <strong>Client:</strong> ${log.client_id || 'N/A'} | 
                            <strong>Admin:</strong> ${log.admin_user || 'System'} | 
                            <strong>IP:</strong> ${log.ip_address || 'N/A'}
                        </div>
                        <div><small>${log.details}</small></div>
                    </div>
                `;
            });
            
            content.innerHTML = html;
        }

        function filterAuditLogs() {
            const searchTerm = document.getElementById('auditSearch').value.toLowerCase();
            const riskFilter = document.getElementById('riskFilter').value;
            
            filteredAuditLogs = auditLogs.filter(log => {
                const matchesSearch = !searchTerm || 
                    (log.client_id && log.client_id.toLowerCase().includes(searchTerm)) ||
                    log.action.toLowerCase().includes(searchTerm) ||
                    (log.details && log.details.toLowerCase().includes(searchTerm));
                
                const matchesRisk = !riskFilter || log.risk_level === riskFilter;
                
                return matchesSearch && matchesRisk;
            });
            
            displayAuditLogs(filteredAuditLogs);
        }

        async function refreshAuditLogs() {
            document.getElementById('auditContent').innerHTML = '<div class="loading">Osvežujem audit loge...</div>';
            await loadAuditLogs();
        }

        function loadAnalytics() {
            // Izračunaj analitiko na osnovi obstoječih licenc
            if (licenses.length === 0) {
                return;
            }
            
            const totalRevenue = licenses
                .filter(l => l.plan !== 'demo')
                .reduce((sum, l) => {
                    const planPrices = { basic: 299, premium: 599, enterprise: 1299 };
                    return sum + (planPrices[l.plan] || 0);
                }, 0);
            
            const monthlyRevenue = Math.round(totalRevenue / 12);
            
            const demoCount = licenses.filter(l => l.plan === 'demo').length;
            const paidCount = licenses.filter(l => l.plan !== 'demo').length;
            const conversionRate = demoCount > 0 ? Math.round((paidCount / (demoCount + paidCount)) * 100) : 0;
            
            const expiredCount = licenses.filter(l => l.status === 'expired').length;
            const churnRate = licenses.length > 0 ? Math.round((expiredCount / licenses.length) * 100) : 0;
            
            document.getElementById('totalRevenue').textContent = totalRevenue + '€';
            document.getElementById('monthlyRevenue').textContent = monthlyRevenue + '€';
            document.getElementById('conversionRate').textContent = conversionRate + '%';
            document.getElementById('churnRate').textContent = churnRate + '%';
        }

        // Funkcije za upravljanje licenc
        async function viewLicense(clientId) {
            const license = licenses.find(l => l.client_id === clientId);
            if (!license) return;
            
            alert(`
Podrobnosti licence:

Client ID: ${license.client_id}
Podjetje: ${license.company_name}
Email: ${license.contact_email}
Paket: ${license.plan}
Status: ${getStatusText(license.status)}
Ustvarjena: ${new Date(license.created_at).toLocaleDateString('sl-SI')}
Poteče: ${new Date(license.expires_at).toLocaleDateString('sl-SI')}
Aktivne naprave: ${license.active_devices || 0}/${license.max_users === -1 ? '∞' : license.max_users}
Uporaba: ${license.usage_count || 0}x
Zadnji dostop: ${license.last_check ? new Date(license.last_check).toLocaleString('sl-SI') : 'Nikoli'}
            `);
        }

        async function extendLicense(clientId) {
            const days = prompt('Za koliko dni želite podaljšati licenco?', '30');
            if (!days || isNaN(days)) return;
            
            try {
                const response = await fetch(`/api/extend/${clientId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        days: parseInt(days),
                        admin_user: 'admin'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Licenca uspešno podaljšana!');
                    refreshLicenses();
                } else {
                    alert('Napaka pri podaljšanju licence.');
                }
            } catch (error) {
                alert('Napaka pri podaljšanju licence: ' + error.message);
            }
        }

        async function suspendLicense(clientId) {
            const reason = prompt('Razlog za začasno onemogočenje:', 'Neplačilo');
            if (!reason) return;
            
            if (!confirm('Ali ste prepričani, da želite začasno onemogočiti to licenco?')) return;
            
            try {
                const response = await fetch(`/api/suspend/${clientId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        reason: reason,
                        admin_user: 'admin'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Licenca začasno onemogočena!');
                    refreshLicenses();
                } else {
                    alert('Napaka pri onemogočenju licence.');
                }
            } catch (error) {
                alert('Napaka pri onemogočenju licence: ' + error.message);
            }
        }

        async function reactivateLicense(clientId) {
            if (!confirm('Ali ste prepričani, da želite ponovno aktivirati to licenco?')) return;
            
            try {
                const response = await fetch(`/api/reactivate/${clientId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        admin_user: 'admin'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Licenca ponovno aktivirana!');
                    refreshLicenses();
                } else {
                    alert('Napaka pri ponovni aktivaciji licence.');
                }
            } catch (error) {
                alert('Napaka pri ponovni aktivaciji licence: ' + error.message);
            }
        }

        function exportLicenses() {
            const csvContent = "data:text/csv;charset=utf-8," + 
                "Client ID,Podjetje,Email,Paket,Status,Ustvarjena,Poteče,Aktivne naprave,Uporaba\\n" +
                filteredLicenses.map(l => 
                    `${l.client_id},"${l.company_name}","${l.contact_email}",${l.plan},${getStatusText(l.status)},${l.created_at},${l.expires_at},${l.active_devices || 0},${l.usage_count || 0}`
                ).join("\\n");
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `omni_licenses_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function showResult(elementId, message, type) {
            const element = document.getElementById(elementId);
            element.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
            
            // Avtomatsko skrij po 5 sekundah
            setTimeout(() => {
                element.innerHTML = '';
            }, 5000);
        }

        // Inicializacija ob nalaganju strani
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboard();
        });
    </script>
</body>
</html>
        '''

    def run_server(self, host='0.0.0.0', port=5021, debug=False):
        """Zaženi licenčni sistem"""
        print(f"\n🚀 Zaganjam OMNI License System Enhanced na portu {port}...")
        print(f"🌐 Admin konzola: http://localhost:{port}")
        print(f"🔗 API endpoint: http://localhost:{port}/api/validate")
        
        print(f"\n📋 Demo licence:")
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT client_id, license_key, company_name, plan FROM licenses LIMIT 5')
        
        for row in cursor.fetchall():
            print(f"   🏢 {row[2]} ({row[3].upper()})")
            print(f"      Client ID: {row[0]}")
            print(f"      License Key: {row[1]}")
            print()
        
        conn.close()
        
        print(f"\n🔐 Admin prijava:")
        print(f"   Uporabniško ime: admin")
        print(f"   Geslo: admin123")
        
        print(f"\n📊 Funkcionalnosti:")
        print(f"   ✅ Registracija in izdaja licenc")
        print(f"   ✅ API za preverjanje veljavnosti")
        print(f"   ✅ Admin konzola za upravljanje")
        print(f"   ✅ Audit logi in varnostni monitoring")
        print(f"   ✅ Avtomatsko potekanje demo licenc")
        print(f"   ✅ Analitika prihodkov in konverzij")
        print(f"   ✅ Izvoz podatkov in poročila")
        
        print(f"\n🔄 Background procesi aktivni...")
        print(f"💾 Baza podatkov: {self.db_path}")
        
        try:
            self.app.run(host=host, port=port, debug=debug)
        except KeyboardInterrupt:
            print(f"\n⏹️  OMNI License System Enhanced zaustavljen")
        except Exception as e:
            print(f"\n❌ Napaka pri zagonu: {e}")

if __name__ == '__main__':
    license_system = OmniLicenseSystemEnhanced()
    license_system.run_server()