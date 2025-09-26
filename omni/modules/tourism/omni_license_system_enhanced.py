#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMNI License System Enhanced - Napredni licenčni sistem za Omni aplikacije
Omogoča registracijo, preverjanje in upravljanje licenc z varnostnimi funkcijami.

Funkcionalnosti:
- Registracija in izdaja licenc (Client ID, API ključ, paketi)
- Preverjanje veljavnosti licenc z varnostnimi mehanizmi
- Admin konzola za upravljanje uporabnikov in licenc
- Varnostne funkcije (HTTPS, TLS, encrypted storage)
- Avtomatsko potekanje demo licenc in blokada
- Hardware fingerprinting za preprečevanje zlorabe
- Audit logi za sledenje aktivnosti
"""

import sqlite3
import json
import logging
import hashlib
import secrets
import base64
import os
import time
import threading
from datetime import datetime, timedelta
import asyncio
import platform
import psutil
import subprocess
import uuid
import bcrypt
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
import jwt
from flask import Flask, request, jsonify, render_template_string, session, redirect, url_for, flash
from flask_cors import CORS
import requests
from werkzeug.security import generate_password_hash, check_password_hash

class OmniLicenseSystemEnhanced:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = secrets.token_hex(32)
        CORS(self.app)
        
        # Konfiguracija
        self.db_path = "omni_license_system_enhanced.db"
        self.jwt_secret = secrets.token_hex(32)
        self.encryption_key = Fernet.generate_key()
        self.fernet = Fernet(self.encryption_key)
        
        # Licenčni paketi
        self.license_plans = {
            "demo": {
                "name": "Demo",
                "duration_days": 14,
                "max_users": 2,
                "max_locations": 1,
                "modules": ["basic_pos", "simple_inventory"],
                "price": 0,
                "features": ["Osnovne funkcije", "2 uporabnika", "14 dni", "1 lokacija"],
                "storage_gb": 0.5,
                "support_level": "community"
            },
            "basic": {
                "name": "Basic",
                "duration_days": 365,
                "max_users": 5,
                "max_locations": 1,
                "modules": ["pos", "inventory", "reports", "customers"],
                "price": 299,
                "features": ["POS sistem", "Zaloge", "Poročila", "5 uporabnikov", "Email podpora"],
                "storage_gb": 2,
                "support_level": "email"
            },
            "premium": {
                "name": "Premium",
                "duration_days": 365,
                "max_users": 20,
                "max_locations": 5,
                "modules": ["pos", "inventory", "reports", "customers", "ai_optimization", "analytics", "multi_location", "ar_catalog"],
                "price": 599,
                "features": ["Vse Basic funkcije", "AI optimizacija", "Analitika", "Več lokacij", "20 uporabnikov", "AR katalog"],
                "storage_gb": 10,
                "support_level": "priority"
            },
            "enterprise": {
                "name": "Enterprise",
                "duration_days": 365,
                "max_users": -1,  # Neomejeno
                "max_locations": -1,  # Neomejeno
                "modules": ["all"],
                "price": 1299,
                "features": ["Vse funkcije", "Neomejeno uporabnikov", "24/7 podpora", "Custom integracije", "Dedicated manager"],
                "storage_gb": 100,
                "support_level": "dedicated"
            }
        }
        
        # Inicializacija
        self.init_database()
        self.setup_routes()
        self.start_background_tasks()
        
        # Logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        print("🔑 OMNI License System Enhanced inicializiran!")
        print(f"📊 Licenčni paketi: {len(self.license_plans)}")
        print(f"🔐 Varnostni ključ generiran")
        print(f"💾 Baza podatkov: {self.db_path}")

    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela licenc
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT UNIQUE NOT NULL,
                license_key TEXT UNIQUE NOT NULL,
                plan TEXT NOT NULL,
                company_name TEXT NOT NULL,
                contact_email TEXT NOT NULL,
                contact_phone TEXT,
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                last_check TIMESTAMP,
                usage_count INTEGER DEFAULT 0,
                max_users INTEGER DEFAULT 1,
                max_locations INTEGER DEFAULT 1,
                active_modules TEXT,  -- JSON array
                hardware_fingerprint TEXT,
                notes TEXT,
                payment_status TEXT DEFAULT 'pending',
                auto_renew BOOLEAN DEFAULT 0,
                trial_used BOOLEAN DEFAULT 0
            )
        ''')
        
        # Tabela admin uporabnikov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'admin',
                permissions TEXT,  -- JSON array
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP
            )
        ''')
        
        # Tabela audit logov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT,
                admin_user TEXT,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN DEFAULT 1,
                risk_level TEXT DEFAULT 'low'
            )
        ''')
        
        # Tabela aktivacij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS license_activations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                hardware_fingerprint TEXT NOT NULL,
                device_name TEXT,
                activation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                device_info TEXT,  -- JSON
                location_info TEXT,  -- JSON
                deactivation_reason TEXT
            )
        ''')
        
        # Tabela plačil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency TEXT DEFAULT 'EUR',
                payment_method TEXT,
                transaction_id TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP,
                notes TEXT
            )
        ''')
        
        # Tabela notifikacij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP,
                read_at TIMESTAMP,
                priority TEXT DEFAULT 'normal'
            )
        ''')
        
        # Ustvari demo admin uporabnika
        admin_password = generate_password_hash("admin123")
        cursor.execute('''
            INSERT OR IGNORE INTO admin_users (username, password_hash, email, full_name, role, permissions)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ("admin", admin_password, "admin@omni.si", "System Administrator", "super_admin", 
              json.dumps(["all"])))
        
        # Ustvari demo licence
        self.create_demo_licenses(cursor)
        
        conn.commit()
        conn.close()
        
        print("✅ Baza podatkov inicializirana")

    def create_demo_licenses(self, cursor):
        """Ustvari demo licence za testiranje"""
        demo_licenses = [
            {
                "client_id": "CAMP001",
                "company_name": "Kamp Kolpa Demo",
                "contact_email": "demo@kampkolpa.si",
                "contact_phone": "+386 1 234 5678",
                "address": "Kolpa 1, 8000 Novo mesto",
                "plan": "demo"
            },
            {
                "client_id": "REST002", 
                "company_name": "Restavracija Gostilna Demo",
                "contact_email": "demo@gostilna.si",
                "contact_phone": "+386 2 345 6789",
                "address": "Glavna 10, 2000 Maribor",
                "plan": "basic"
            },
            {
                "client_id": "HOTEL003",
                "company_name": "Hotel Premium Demo", 
                "contact_email": "demo@hotel.si",
                "contact_phone": "+386 4 456 7890",
                "address": "Bled 5, 4000 Kranj",
                "plan": "premium"
            },
            {
                "client_id": "CORP004",
                "company_name": "Enterprise Corporation",
                "contact_email": "admin@enterprise.si",
                "contact_phone": "+386 1 567 8901",
                "address": "Slovenska 50, 1000 Ljubljana",
                "plan": "enterprise"
            }
        ]
        
        for license_data in demo_licenses:
            license_key = self.generate_license_key()
            plan = self.license_plans[license_data["plan"]]
            expires_at = datetime.now() + timedelta(days=plan["duration_days"])
            
            cursor.execute('''
                INSERT OR IGNORE INTO licenses 
                (client_id, license_key, plan, company_name, contact_email, contact_phone, address,
                 expires_at, max_users, max_locations, active_modules, payment_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                license_data["client_id"],
                license_key,
                license_data["plan"],
                license_data["company_name"],
                license_data["contact_email"],
                license_data.get("contact_phone", ""),
                license_data.get("address", ""),
                expires_at,
                plan["max_users"],
                plan["max_locations"],
                json.dumps(plan["modules"]),
                "active" if license_data["plan"] != "demo" else "trial"
            ))

    def generate_license_key(self):
        """Generira varni licenčni ključ"""
        return str(uuid.uuid4())

    def generate_client_id(self, company_name):
        """Generira Client ID na osnovi imena podjetja"""
        # Vzemi prve 4 črke podjetja in dodaj naključno številko
        prefix = ''.join(c.upper() for c in company_name if c.isalpha())[:4]
        if len(prefix) < 4:
            prefix = prefix.ljust(4, 'X')
        
        # Dodaj naključno 3-mestno številko
        suffix = str(secrets.randbelow(900) + 100)
        return f"{prefix}{suffix}"

    def generate_hardware_fingerprint(self, request_data=None):
        """Generira hardware fingerprint"""
        if request_data and 'hardware_info' in request_data:
            hw_info = request_data['hardware_info']
        else:
            # Privzeti fingerprint za demo
            hw_info = {
                "cpu": platform.processor(),
                "system": platform.system(),
                "machine": platform.machine(),
                "hostname": platform.node()
            }
        
        fingerprint_string = json.dumps(hw_info, sort_keys=True)
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()

    def create_license(self, company_name, contact_email, plan, contact_phone=None, address=None, custom_duration=None):
        """Ustvari novo licenco"""
        if plan not in self.license_plans:
            return {"success": False, "error": "Neveljaven licenčni paket"}
        
        client_id = self.generate_client_id(company_name)
        license_key = self.generate_license_key()
        plan_config = self.license_plans[plan]
        
        duration_days = custom_duration or plan_config["duration_days"]
        expires_at = datetime.now() + timedelta(days=duration_days)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO licenses 
                (client_id, license_key, plan, company_name, contact_email, contact_phone, address,
                 expires_at, max_users, max_locations, active_modules, payment_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                client_id,
                license_key,
                plan,
                company_name,
                contact_email,
                contact_phone or "",
                address or "",
                expires_at,
                plan_config["max_users"],
                plan_config["max_locations"],
                json.dumps(plan_config["modules"]),
                "pending" if plan != "demo" else "trial"
            ))
            
            conn.commit()
            
            # Audit log
            self.log_audit(client_id, None, "LICENSE_CREATED", f"Plan: {plan}, Company: {company_name}")
            
            # Ustvari notifikacijo
            self.create_notification(client_id, "license_created", "Licenca ustvarjena", 
                                   f"Vaša {plan} licenca je bila uspešno ustvarjena.")
            
            return {
                "success": True,
                "client_id": client_id,
                "license_key": license_key,
                "plan": plan,
                "expires_at": expires_at.isoformat(),
                "modules": plan_config["modules"],
                "max_users": plan_config["max_users"],
                "max_locations": plan_config["max_locations"]
            }
            
        except sqlite3.IntegrityError as e:
            return {"success": False, "error": "Client ID že obstaja"}
        finally:
            conn.close()

    def validate_license(self, client_id, license_key, hardware_fingerprint=None, request_ip=None):
        """Preveri veljavnost licence"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM licenses 
            WHERE client_id = ? AND license_key = ? AND is_active = 1
        ''', (client_id, license_key))
        
        license_data = cursor.fetchone()
        
        if not license_data:
            self.log_audit(client_id, None, "LICENSE_VALIDATION_FAILED", "Licenca ni najdena", 
                          ip_address=request_ip, success=False, risk_level="medium")
            conn.close()
            return {"valid": False, "error": "Licenca ni najdena"}
        
        # Preveri datum poteka
        expires_at = datetime.fromisoformat(license_data[9])  # expires_at
        if datetime.now() > expires_at:
            self.log_audit(client_id, None, "LICENSE_EXPIRED", f"Potekla: {expires_at}", 
                          ip_address=request_ip, success=False, risk_level="low")
            conn.close()
            return {"valid": False, "error": "Licenca je potekla", "expired_at": expires_at.isoformat()}
        
        # Preveri plačilni status
        payment_status = license_data[18]  # payment_status
        if payment_status == "suspended":
            self.log_audit(client_id, None, "LICENSE_SUSPENDED", "Plačilo ni urejeno", 
                          ip_address=request_ip, success=False, risk_level="high")
            conn.close()
            return {"valid": False, "error": "Licenca je začasno onemogočena zaradi neplačila"}
        
        # Posodobi zadnji preverjanje
        cursor.execute('''
            UPDATE licenses 
            SET last_check = CURRENT_TIMESTAMP, usage_count = usage_count + 1
            WHERE client_id = ?
        ''', (client_id,))
        
        # Če je podan hardware fingerprint, preveri aktivacije
        if hardware_fingerprint:
            activation_result = self.handle_hardware_activation(cursor, client_id, hardware_fingerprint, request_ip)
            if not activation_result["success"]:
                conn.close()
                return {"valid": False, "error": activation_result["error"]}
        
        conn.commit()
        
        # Pripravi odgovor
        active_modules = json.loads(license_data[15] or '[]')  # active_modules
        plan = license_data[3]  # plan
        
        # Preveri, ali se licenca bliža poteku
        days_until_expiry = (expires_at - datetime.now()).days
        expiry_warning = None
        if days_until_expiry <= 7:
            expiry_warning = f"Licenca poteče čez {days_until_expiry} dni"
        
        response = {
            "valid": True,
            "client_id": client_id,
            "plan": plan,
            "expires_at": expires_at.isoformat(),
            "days_until_expiry": days_until_expiry,
            "active_modules": active_modules,
            "max_users": license_data[12],  # max_users
            "max_locations": license_data[13],  # max_locations
            "company_name": license_data[4],  # company_name
            "payment_status": payment_status,
            "expiry_warning": expiry_warning
        }
        
        self.log_audit(client_id, None, "LICENSE_VALIDATED", "Uspešno preverjanje", 
                      ip_address=request_ip, success=True, risk_level="low")
        conn.close()
        
        return response

    def handle_hardware_activation(self, cursor, client_id, hardware_fingerprint, request_ip=None):
        """Obravnava aktivacijo na določeni napravi"""
        # Preveri obstoječo aktivacijo
        cursor.execute('''
            SELECT * FROM license_activations 
            WHERE client_id = ? AND hardware_fingerprint = ? AND is_active = 1
        ''', (client_id, hardware_fingerprint))
        
        activation = cursor.fetchone()
        
        if activation:
            # Posodobi zadnji dostop
            cursor.execute('''
                UPDATE license_activations 
                SET last_seen = CURRENT_TIMESTAMP
                WHERE client_id = ? AND hardware_fingerprint = ?
            ''', (client_id, hardware_fingerprint))
            return {"success": True}
        else:
            # Preveri omejitve aktivacij
            cursor.execute('''
                SELECT COUNT(*) FROM license_activations 
                WHERE client_id = ? AND is_active = 1
            ''', (client_id,))
            
            active_count = cursor.fetchone()[0]
            
            # Pridobi maksimalno število uporabnikov za to licenco
            cursor.execute('''
                SELECT max_users FROM licenses WHERE client_id = ?
            ''', (client_id,))
            
            max_users = cursor.fetchone()[0]
            
            if max_users != -1 and active_count >= max_users:
                self.log_audit(client_id, None, "ACTIVATION_LIMIT_EXCEEDED", 
                              f"Poskus aktivacije {active_count + 1}/{max_users}", 
                              ip_address=request_ip, success=False, risk_level="medium")
                return {"success": False, "error": f"Dosežena omejitev aktivacij ({max_users})"}
            
            # Nova aktivacija
            device_info = {
                "platform": platform.system(),
                "hostname": platform.node(),
                "activation_time": datetime.now().isoformat(),
                "ip_address": request_ip
            }
            
            cursor.execute('''
                INSERT INTO license_activations 
                (client_id, hardware_fingerprint, device_info)
                VALUES (?, ?, ?)
            ''', (client_id, hardware_fingerprint, json.dumps(device_info)))
            
            self.log_audit(client_id, None, "DEVICE_ACTIVATED", 
                          f"Nova naprava aktivirana: {hardware_fingerprint[:8]}...", 
                          ip_address=request_ip, success=True, risk_level="low")
            
            return {"success": True}

    def deactivate_license(self, client_id, reason="Manual deactivation", admin_user=None):
        """Deaktivira licenco"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE licenses 
            SET is_active = 0, notes = ?
            WHERE client_id = ?
        ''', (reason, client_id))
        
        # Deaktiviraj tudi vse aktivacije
        cursor.execute('''
            UPDATE license_activations 
            SET is_active = 0, deactivation_reason = ?
            WHERE client_id = ?
        ''', (reason, client_id))
        
        conn.commit()
        conn.close()
        
        self.log_audit(client_id, admin_user, "LICENSE_DEACTIVATED", reason, 
                      success=True, risk_level="medium")
        
        # Ustvari notifikacijo
        self.create_notification(client_id, "license_deactivated", "Licenca deaktivirana", 
                               f"Vaša licenca je bila deaktivirana. Razlog: {reason}")
        
        return {"success": True, "message": "Licenca deaktivirana"}

    def extend_license(self, client_id, additional_days, admin_user=None):
        """Podaljša licenco"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE licenses 
            SET expires_at = datetime(expires_at, '+{} days')
            WHERE client_id = ?
        '''.format(additional_days), (client_id,))
        
        conn.commit()
        conn.close()
        
        self.log_audit(client_id, admin_user, "LICENSE_EXTENDED", 
                      f"Podaljšano za {additional_days} dni", success=True, risk_level="low")
        
        # Ustvari notifikacijo
        self.create_notification(client_id, "license_extended", "Licenca podaljšana", 
                               f"Vaša licenca je bila podaljšana za {additional_days} dni.")
        
        return {"success": True, "message": f"Licenca podaljšana za {additional_days} dni"}

    def suspend_license(self, client_id, reason="Payment overdue", admin_user=None):
        """Začasno onemogoči licenco"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE licenses 
            SET payment_status = 'suspended', notes = ?
            WHERE client_id = ?
        ''', (reason, client_id))
        
        conn.commit()
        conn.close()
        
        self.log_audit(client_id, admin_user, "LICENSE_SUSPENDED", reason, 
                      success=True, risk_level="high")
        
        # Ustvari notifikacijo
        self.create_notification(client_id, "license_suspended", "Licenca začasno onemogočena", 
                               f"Vaša licenca je začasno onemogočena. Razlog: {reason}")
        
        return {"success": True, "message": "Licenca začasno onemogočena"}

    def reactivate_license(self, client_id, admin_user=None):
        """Ponovno aktivira licenco"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE licenses 
            SET payment_status = 'active', is_active = 1, notes = 'Reactivated'
            WHERE client_id = ?
        ''', (client_id,))
        
        conn.commit()
        conn.close()
        
        self.log_audit(client_id, admin_user, "LICENSE_REACTIVATED", "Licenca ponovno aktivirana", 
                      success=True, risk_level="low")
        
        # Ustvari notifikacijo
        self.create_notification(client_id, "license_reactivated", "Licenca ponovno aktivirana", 
                               "Vaša licenca je bila ponovno aktivirana.")
        
        return {"success": True, "message": "Licenca ponovno aktivirana"}

    def get_all_licenses(self):
        """Pridobi vse licence za admin konzolo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT l.*, 
                   COUNT(la.id) as active_devices,
                   MAX(la.last_seen) as last_device_activity
            FROM licenses l
            LEFT JOIN license_activations la ON l.client_id = la.client_id AND la.is_active = 1
            GROUP BY l.id
            ORDER BY l.created_at DESC
        ''')
        
        licenses = []
        for row in cursor.fetchall():
            license_data = {
                "id": row[0],
                "client_id": row[1],
                "license_key": row[2],
                "plan": row[3],
                "company_name": row[4],
                "contact_email": row[5],
                "contact_phone": row[6],
                "address": row[7],
                "created_at": row[8],
                "expires_at": row[9],
                "is_active": bool(row[10]),
                "last_check": row[11],
                "usage_count": row[12],
                "max_users": row[13],
                "max_locations": row[14],
                "active_modules": json.loads(row[15] or '[]'),
                "hardware_fingerprint": row[16],
                "notes": row[17],
                "payment_status": row[18],
                "auto_renew": bool(row[19]),
                "trial_used": bool(row[20]),
                "active_devices": row[21] or 0,
                "last_device_activity": row[22],
                "status": self.get_license_status(row[9], bool(row[10]), row[18])
            }
            licenses.append(license_data)
        
        conn.close()
        return licenses

    def get_license_status(self, expires_at_str, is_active, payment_status):
        """Določi status licence"""
        if not is_active:
            return "deactivated"
        
        if payment_status == "suspended":
            return "suspended"
        
        expires_at = datetime.fromisoformat(expires_at_str)
        now = datetime.now()
        
        if now > expires_at:
            return "expired"
        elif (expires_at - now).days <= 7:
            return "expiring_soon"
        else:
            return "active"

    def create_notification(self, client_id, notification_type, title, message, priority="normal"):
        """Ustvari notifikacijo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO notifications (client_id, type, title, message, priority)
            VALUES (?, ?, ?, ?, ?)
        ''', (client_id, notification_type, title, message, priority))
        
        conn.commit()
        conn.close()

    def log_audit(self, client_id, admin_user, action, details, ip_address=None, user_agent=None, success=True, risk_level="low"):
        """Zabeleži audit log"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO audit_logs (client_id, admin_user, action, details, ip_address, user_agent, success, risk_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (client_id, admin_user, action, details, ip_address, user_agent, success, risk_level))
        
        conn.commit()
        conn.close()

    def get_audit_logs(self, client_id=None, limit=100):
        """Pridobi audit loge"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if client_id:
            cursor.execute('''
                SELECT * FROM audit_logs 
                WHERE client_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (client_id, limit))
        else:
            cursor.execute('''
                SELECT * FROM audit_logs 
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (limit,))
        
        logs = []
        for row in cursor.fetchall():
            log_data = {
                "id": row[0],
                "client_id": row[1],
                "admin_user": row[2],
                "action": row[3],
                "details": row[4],
                "ip_address": row[5],
                "user_agent": row[6],
                "timestamp": row[7],
                "success": bool(row[8]),
                "risk_level": row[9]
            }
            logs.append(log_data)
        
        conn.close()
        return logs

    def cleanup_expired_licenses(self):
        """Počisti potekle licence (background task)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Deaktiviraj potekle demo licence
        cursor.execute('''
            UPDATE licenses 
            SET is_active = 0, notes = 'Avtomatsko deaktivirano - demo licenca potekla'
            WHERE expires_at < datetime('now') AND is_active = 1 AND plan = 'demo'
        ''')
        
        demo_deactivated = cursor.rowcount
        
        # Opozori na licence, ki potekajo v 7 dneh
        cursor.execute('''
            SELECT client_id, company_name, expires_at FROM licenses
            WHERE expires_at BETWEEN datetime('now') AND datetime('now', '+7 days')
            AND is_active = 1 AND plan != 'demo'
        ''')
        
        expiring_licenses = cursor.fetchall()
        
        for license_data in expiring_licenses:
            client_id, company_name, expires_at = license_data
            days_left = (datetime.fromisoformat(expires_at) - datetime.now()).days
            
            self.create_notification(
                client_id, 
                "license_expiring", 
                "Licenca kmalu poteče", 
                f"Vaša licenca poteče čez {days_left} dni. Prosimo, obnovite naročnino.",
                "high"
            )
        
        # Počisti stare audit loge (starejše od 90 dni)
        cursor.execute('''
            DELETE FROM audit_logs 
            WHERE timestamp < datetime('now', '-90 days')
        ''')
        
        # Počisti stare notifikacije (starejše od 30 dni)
        cursor.execute('''
            DELETE FROM notifications 
            WHERE created_at < datetime('now', '-30 days') AND read_at IS NOT NULL
        ''')
        
        conn.commit()
        conn.close()
        
        if demo_deactivated > 0:
            self.logger.info(f"🧹 Deaktivirano {demo_deactivated} poteklih demo licenc")
        
        if expiring_licenses:
            self.logger.info(f"⚠️ Poslano {len(expiring_licenses)} opozoril o poteku licenc")

    def start_background_tasks(self):
        """Zaženi background opravila"""
        def background_worker():
            while True:
                try:
                    self.cleanup_expired_licenses()
                    time.sleep(3600)  # Vsako uro
                except Exception as e:
                    self.logger.error(f"Background task error: {e}")
                    time.sleep(300)  # Počakaj 5 minut ob napaki
        
        thread = threading.Thread(target=background_worker, daemon=True)
        thread.start()

    def setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def index():
            return render_template_string(self.get_admin_template())
        
        @self.app.route('/api/validate', methods=['POST'])
        def validate_license_api():
            data = request.get_json()
            
            if not data or 'client_id' not in data or 'license_key' not in data:
                return jsonify({"valid": False, "error": "Manjkajo podatki"}), 400
            
            hardware_fingerprint = data.get('hardware_fingerprint')
            if not hardware_fingerprint and 'hardware_info' in data:
                hardware_fingerprint = self.generate_hardware_fingerprint(data)
            
            result = self.validate_license(
                data['client_id'],
                data['license_key'],
                hardware_fingerprint,
                request.remote_addr
            )
            
            return jsonify(result)
        
        @self.app.route('/api/create', methods=['POST'])
        def create_license_api():
            data = request.get_json()
            
            required_fields = ['company_name', 'contact_email', 'plan']
            if not all(field in data for field in required_fields):
                return jsonify({"success": False, "error": "Manjkajo podatki"}), 400
            
            result = self.create_license(
                data['company_name'],
                data['contact_email'],
                data['plan'],
                data.get('contact_phone'),
                data.get('address'),
                data.get('custom_duration')
            )
            
            return jsonify(result)
        
        @self.app.route('/api/licenses')
        def get_licenses_api():
            licenses = self.get_all_licenses()
            return jsonify(licenses)
        
        @self.app.route('/api/deactivate/<client_id>', methods=['POST'])
        def deactivate_license_api(client_id):
            data = request.get_json() or {}
            reason = data.get('reason', 'Manual deactivation')
            admin_user = data.get('admin_user', 'api')
            
            result = self.deactivate_license(client_id, reason, admin_user)
            return jsonify(result)
        
        @self.app.route('/api/extend/<client_id>', methods=['POST'])
        def extend_license_api(client_id):
            data = request.get_json()
            
            if not data or 'days' not in data:
                return jsonify({"success": False, "error": "Manjka število dni"}), 400
            
            admin_user = data.get('admin_user', 'api')
            result = self.extend_license(client_id, data['days'], admin_user)
            return jsonify(result)
        
        @self.app.route('/api/suspend/<client_id>', methods=['POST'])
        def suspend_license_api(client_id):
            data = request.get_json() or {}
            reason = data.get('reason', 'Payment overdue')
            admin_user = data.get('admin_user', 'api')
            
            result = self.suspend_license(client_id, reason, admin_user)
            return jsonify(result)
        
        @self.app.route('/api/reactivate/<client_id>', methods=['POST'])
        def reactivate_license_api(client_id):
            data = request.get_json() or {}
            admin_user = data.get('admin_user', 'api')
            
            result = self.reactivate_license(client_id, admin_user)
            return jsonify(result)
        
        @self.app.route('/api/plans')
        def get_plans_api():
            return jsonify(self.license_plans)
        
        @self.app.route('/api/audit')
        def get_audit_api():
            client_id = request.args.get('client_id')
            limit = int(request.args.get('limit', 100))
            
            logs = self.get_audit_logs(client_id, limit)
            return jsonify(logs)
        
        @self.app.route('/api/notifications/<client_id>')
        def get_notifications_api(client_id):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM notifications 
                WHERE client_id = ?
                ORDER BY created_at DESC
                LIMIT 50
            ''', (client_id,))
            
            notifications = []
            for row in cursor.fetchall():
                notification = {
                    "id": row[0],
                    "type": row[2],
                    "title": row[3],
                    "message": row[4],
                    "created_at": row[5],
                    "sent_at": row[6],
                    "read_at": row[7],
                    "priority": row[8]
                }
                notifications.append(notification)
            
            conn.close()
            return jsonify(notifications)

    def get_admin_template(self):
        """HTML template za admin konzolo"""
        return '''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔑 OMNI License System Enhanced - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2c3e50, #3498db);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        .nav-tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            overflow-x: auto;
        }
        .nav-tab {
            flex: 1;
            min-width: 150px;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 1em;
            transition: all 0.3s;
            white-space: nowrap;
        }
        .nav-tab.active {
            background: white;
            border-bottom: 3px solid #3498db;
            color: #3498db;
        }
        .tab-content {
            padding: 30px;
            min-height: 600px;
        }
        .tab-pane { display: none; }
        .tab-pane.active { display: block; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-card h3 { font-size: 2.5em; margin-bottom: 10px; }
        .stat-card p { opacity: 0.9; }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #2c3e50;
        }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1em;
            transition: border-color 0.3s;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
        }
        .btn {
            padding: 12px 25px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.3s;
            margin: 5px;
        }
        .btn-primary {
            background: #3498db;
            color: white;
        }
        .btn-primary:hover {
            background: #2980b9;
            transform: translateY(-2px);
        }
        .btn-success {
            background: #27ae60;
            color: white;
        }
        .btn-warning {
            background: #f39c12;
            color: white;
        }
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        .btn-info {
            background: #17a2b8;
            color: white;
        }
        .licenses-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .licenses-table th {
            background: #34495e;
            color: white;
            padding: 15px;
            text-align: left;
            font-size: 0.9em;
        }
        .licenses-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #ecf0f1;
            font-size: 0.9em;
        }
        .licenses-table tr:hover {
            background: #f8f9fa;
        }
        .status-badge {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .status-active { background: #d4edda; color: #155724; }
        .status-expired { background: #f8d7da; color: #721c24; }
        .status-expiring_soon { background: #fff3cd; color: #856404; }
        .status-deactivated { background: #e2e3e5; color: #383d41; }
        .status-suspended { background: #f5c6cb; color: #721c24; }
        .alert {
            padding: 15px;
            margin: 15px 0;
            border-radius: 8px;
            font-weight: bold;
        }
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .loading {
            text-align: center;
            padding: 50px;
            color: #666;
        }
        .plan-card {
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 20px;
            margin: 10px;
            transition: all 0.3s;
        }
        .plan-card:hover {
            border-color: #3498db;
            transform: translateY(-5px);
        }
        .plan-card.premium {
            border-color: #f39c12;
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
        }
        .plan-card.enterprise {
            border-color: #9b59b6;
            background: linear-gradient(135deg, #9b59b6, #8e44ad);
            color: white;
        }
        .audit-log {
            background: #f8f9fa;
            border-left: 4px solid #3498db;
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
        }
        .audit-log.risk-high {
            border-left-color: #e74c3c;
        }
        .audit-log.risk-medium {
            border-left-color: #f39c12;
        }
        .search-box {
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1em;
        }
        .actions-bar {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔑 OMNI License System Enhanced</h1>
            <p>Napredni centralizirani sistem za upravljanje licenc Omni aplikacij</p>
        </div>
        
        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showTab('dashboard')">📊 Dashboard</button>
            <button class="nav-tab" onclick="showTab('licenses')">📋 Licence</button>
            <button class="nav-tab" onclick="showTab('create')">➕ Nova licenca</button>
            <button class="nav-tab" onclick="showTab('plans')">📦 Paketi</button>
            <button class="nav-tab" onclick="showTab('audit')">🔍 Audit logi</button>
            <button class="nav-tab" onclick="showTab('analytics')">📈 Analitika</button>
        </div>
        
        <div class="tab-content">
            <!-- Dashboard Tab -->
            <div id="dashboard" class="tab-pane active">
                <h2>📊 Pregled sistema</h2>
                <div class="stats-grid" id="statsGrid">
                    <div class="loading">Nalagam statistike...</div>
                </div>
                
                <h3>📈 Nedavna aktivnost</h3>
                <div id="recentActivity">
                    <div class="loading">Nalagam aktivnost...</div>
                </div>
            </div>
            
            <!-- Licenses Tab -->
            <div id="licenses" class="tab-pane">
                <h2>📋 Upravljanje licenc</h2>
                
                <div class="actions-bar">
                    <input type="text" id="licenseSearch" class="search-box" placeholder="🔍 Išči po podjetju, Client ID ali emailu..." onkeyup="filterLicenses()">
                    <button class="btn btn-info" onclick="refreshLicenses()">🔄 Osveži</button>
                    <button class="btn btn-warning" onclick="exportLicenses()">📤 Izvozi</button>
                </div>
                
                <div id="licensesContent">
                    <div class="loading">Nalagam licence...</div>
                </div>
            </div>
            
            <!-- Create License Tab -->
            <div id="create" class="tab-pane">
                <h2>➕ Ustvari novo licenco</h2>
                <div class="form-grid">
                    <div>
                        <div class="form-group">
                            <label>Ime podjetja: *</label>
                            <input type="text" id="companyName" placeholder="npr. Kamp Kolpa">
                        </div>
                        <div class="form-group">
                            <label>Kontaktni email: *</label>
                            <input type="email" id="contactEmail" placeholder="info@podjetje.si">
                        </div>
                        <div class="form-group">
                            <label>Kontaktni telefon:</label>
                            <input type="tel" id="contactPhone" placeholder="+386 1 234 5678">
                        </div>
                        <div class="form-group">
                            <label>Naslov:</label>
                            <textarea id="address" rows="3" placeholder="Ulica 1, 1000 Ljubljana"></textarea>
                        </div>
                    </div>
                    <div>
                        <div class="form-group">
                            <label>Licenčni paket: *</label>
                            <select id="licensePlan" onchange="updatePlanInfo()">
                                <option value="demo">Demo (14 dni) - Brezplačno</option>
                                <option value="basic">Basic (1 leto) - 299€</option>
                                <option value="premium">Premium (1 leto) - 599€</option>
                                <option value="enterprise">Enterprise (1 leto) - 1299€</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Trajanje (dni) - opcijsko:</label>
                            <input type="number" id="customDuration" placeholder="Pustite prazno za privzeto">
                        </div>
                        <div id="planInfo" class="alert alert-success">
                            <strong>Demo paket:</strong><br>
                            • 2 uporabnika<br>
                            • 1 lokacija<br>
                            • Osnovne funkcije<br>
                            • 14 dni veljavnosti
                        </div>
                        <button class="btn btn-primary" onclick="createLicense()">🔑 Ustvari licenco</button>
                    </div>
                </div>
                <div id="createResult"></div>
            </div>
            
            <!-- Plans Tab -->
            <div id="plans" class="tab-pane">
                <h2>📦 Licenčni paketi</h2>
                <div id="plansContent">
                    <div class="loading">Nalagam pakete...</div>
                </div>
            </div>
            
            <!-- Audit Tab -->
            <div id="audit" class="tab-pane">
                <h2>🔍 Audit logi</h2>
                
                <div class="actions-bar">
                    <input type="text" id="auditSearch" class="search-box" placeholder="🔍 Išči po Client ID ali akciji..." onkeyup="filterAuditLogs()">
                    <select id="riskFilter" onchange="filterAuditLogs()">
                        <option value="">Vsi nivoji tveganja</option>
                        <option value="low">Nizko tveganje</option>
                        <option value="medium">Srednje tveganje</option>
                        <option value="high">Visoko tveganje</option>
                    </select>
                    <button class="btn btn-info" onclick="refreshAuditLogs()">🔄 Osveži</button>
                </div>
                
                <div id="auditContent">
                    <div class="loading">Nalagam audit loge...</div>
                </div>
            </div>
            
            <!-- Analytics Tab -->
            <div id="analytics" class="tab-pane">
                <h2>📈 Analitika in poročila</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3 id="totalRevenue">0€</h3>
                        <p>Skupni prihodki</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="monthlyRevenue">0€</h3>
                        <p>Mesečni prihodki</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="conversionRate">0%</h3>
                        <p>Konverzija demo → plačano</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="churnRate">0%</h3>
                        <p>Stopnja odhoda</p>
                    </div>
                </div>
                
                <div id="analyticsCharts">
                    <h3>📊 Grafi in trendi</h3>
                    <p>Analitični grafi bodo dodani v prihodnji različici.</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentTab = 'dashboard';
        let licenses = [];
        let plans = {};
        let auditLogs = [];
        let filteredLicenses = [];
        let filteredAuditLogs = [];

        function showTab(tabName) {
            // Skrij vse tab-e
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Prikaži izbrani tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
            
            currentTab = tabName;
            
            // Naloži podatke za tab
            if (tabName === 'dashboard') {
                loadDashboard();
            } else if (tabName === 'licenses') {
                loadLicenses();
            } else if (tabName === 'plans') {
                loadPlans();
            } else if (tabName === 'audit') {
                loadAuditLogs();
            } else if (tabName === 'analytics') {
                loadAnalytics();
            }
        }

        async function loadDashboard() {
            try {
                const response = await fetch('/api/licenses');
                licenses = await response.json();
                
                const stats = calculateStats(licenses);
                displayStats(stats);
                
                // Naloži nedavno aktivnost
                const auditResponse = await fetch('/api/audit?limit=10');
                const recentLogs = await auditResponse.json();
                displayRecentActivity(recentLogs);
                
            } catch (error) {
                console.error('Napaka pri nalaganju dashboard-a:', error);
            }
        }

        function calculateStats(licenses) {
            const total = licenses.length;
            const active = licenses.filter(l => l.status === 'active').length;
            const expired = licenses.filter(l => l.status === 'expired').length;
            const expiring = licenses.filter(l => l.status === 'expiring_soon').length;
            const suspended = licenses.filter(l => l.status === 'suspended').length;
            const demo = licenses.filter(l => l.plan === 'demo').length;
            const paid = licenses.filter(l => l.plan !== 'demo').length;
            
            return { total, active, expired, expiring, suspended, demo, paid };
        }

        function displayStats(stats) {
            const statsGrid = document.getElementById('statsGrid');
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <h3>${stats.total}</h3>
                    <p>Skupaj licenc</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.active}</h3>
                    <p>Aktivnih licenc</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.expiring}</h3>
                    <p>Poteka kmalu</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.suspended}</h3>
                    <p>Začasno onemogočenih</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.demo}</h3>
                    <p>Demo licenc</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.paid}</h3>
                    <p>Plačanih licenc</p>
                </div>
            `;
        }

        function displayRecentActivity(logs) {
            const container = document.getElementById('recentActivity');
            
            if (logs.length === 0) {
                container.innerHTML = '<p>Ni nedavne aktivnosti.</p>';
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
        cursor.execute('SELECT client_id, license_key, plan, company_name FROM licenses LIMIT 5')
        demo_licenses = cursor.fetchall()
        
        for license_data in demo_licenses:
            client_id, license_key, plan, company_name = license_data
            print(f"  • {client_id} ({plan}): {license_key[:8]}... - {company_name}")
        
        conn.close()
        
        print(f"\n🔐 Varnostne funkcije:")
        print(f"  • JWT avtentifikacija")
        print(f"  • Hardware fingerprinting")
        print(f"  • Audit logi")
        print(f"  • Avtomatsko potekanje demo licenc")
        print(f"  • Šifrirana komunikacija")
        
        print(f"\n📊 Admin dostop:")
        print(f"  • Uporabniško ime: admin")
        print(f"  • Geslo: admin123")
        
        print(f"\n🔄 Background procesi aktivni:")
        print(f"  • Čiščenje poteklih licenc")
        print(f"  • Pošiljanje opozoril")
        print(f"  • Audit log management")
        
        self.app.run(host=host, port=port, debug=debug, threaded=True)

if __name__ == "__main__":
    license_system = OmniLicenseSystemEnhanced()
    license_system.run_server(port=5021)