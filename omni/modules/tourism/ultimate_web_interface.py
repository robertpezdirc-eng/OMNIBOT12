"""
ULTIMATE WEB INTERFACE
Napredni spletni vmesnik za upravljanje vseh sistemov z real-time dashboardom in vizualizacijami
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import sqlite3
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import threading
import time
import os
from werkzeug.security import generate_password_hash, check_password_hash

# Uvozi naše sisteme
try:
    from ultimate_pos_system import UltimatePOSSystem
    from ultimate_reservation_system import UltimateReservationSystem
    from ultimate_digital_checkin import UltimateDigitalCheckIn
    from ultimate_crm_loyalty import UltimateCRMLoyalty
    from ultimate_master_integration import UltimateMasterIntegration
except ImportError as e:
    print(f"Opozorilo: Nekateri moduli niso na voljo: {e}")

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ultimate-tourism-secret-key-2024'

class UltimateWebInterface:
    def __init__(self):
        self.app = app
        self.init_database()
        self.init_systems()
        self.setup_routes()
        self.start_background_tasks()
        
    def init_database(self):
        """Inicializacija baze za web vmesnik"""
        conn = sqlite3.connect('ultimate_web_interface.db')
        cursor = conn.cursor()
        
        # Tabela uporabnikov
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'staff',
                permissions TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        """)
        
        # Tabela sej
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                session_token TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Tabela sistemskih dogodkov
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                module TEXT NOT NULL,
                description TEXT,
                data TEXT,
                user_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                severity TEXT DEFAULT 'info'
            )
        """)
        
        # Tabela nastavitev
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT
            )
        """)
        
        # Ustvari admin uporabnika
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        if cursor.fetchone()[0] == 0:
            admin_id = str(uuid.uuid4())
            password_hash = generate_password_hash('admin123')
            cursor.execute("""
                INSERT INTO users (id, username, email, password_hash, role, permissions)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                admin_id, 'admin', 'admin@hotel.com', password_hash, 'admin',
                json.dumps(['all'])
            ))
        
        conn.commit()
        conn.close()
        
    def init_systems(self):
        """Inicializacija vseh sistemov"""
        try:
            self.pos_system = UltimatePOSSystem()
            self.reservation_system = UltimateReservationSystem()
            self.checkin_system = UltimateDigitalCheckIn()
            self.crm_system = UltimateCRMLoyalty()
            self.master_integration = UltimateMasterIntegration()
            
            print("✅ Vsi sistemi uspešno inicializirani")
        except Exception as e:
            print(f"⚠️ Napaka pri inicializaciji sistemov: {e}")
            # Ustvari mock sisteme
            self.pos_system = None
            self.reservation_system = None
            self.checkin_system = None
            self.crm_system = None
            self.master_integration = None
    
    def setup_routes(self):
        """Nastavi Flask route-e"""
        
        @app.route('/')
        def index():
            if 'user_id' not in session:
                return redirect(url_for('login'))
            return render_template('dashboard.html')
        
        @app.route('/login', methods=['GET', 'POST'])
        def login():
            if request.method == 'POST':
                username = request.form['username']
                password = request.form['password']
                
                if self.authenticate_user(username, password):
                    return redirect(url_for('index'))
                else:
                    flash('Napačno uporabniško ime ali geslo', 'error')
            
            return render_template('login.html')
        
        @app.route('/logout')
        def logout():
            session.clear()
            return redirect(url_for('login'))
        
        @app.route('/dashboard')
        def dashboard():
            if 'user_id' not in session:
                return redirect(url_for('login'))
            
            dashboard_data = self.get_dashboard_data()
            return render_template('dashboard.html', data=dashboard_data)
        
        @app.route('/pos')
        def pos_interface():
            if 'user_id' not in session:
                return redirect(url_for('login'))
            return render_template('pos.html')
        
        @app.route('/reservations')
        def reservations_interface():
            if 'user_id' not in session:
                return redirect(url_for('login'))
            return render_template('reservations.html')
        
        @app.route('/checkin')
        def checkin_interface():
            if 'user_id' not in session:
                return redirect(url_for('login'))
            return render_template('checkin.html')
        
        @app.route('/crm')
        def crm_interface():
            if 'user_id' not in session:
                return redirect(url_for('login'))
            return render_template('crm.html')
        
        @app.route('/analytics')
        def analytics_interface():
            if 'user_id' not in session:
                return redirect(url_for('login'))
            return render_template('analytics.html')
        
        @app.route('/settings')
        def settings_interface():
            if 'user_id' not in session:
                return redirect(url_for('login'))
            return render_template('settings.html')
        
        # API endpoints
        @app.route('/api/dashboard')
        def api_dashboard():
            return jsonify(self.get_dashboard_data())
        
        @app.route('/api/pos/products')
        def api_pos_products():
            if self.pos_system:
                return jsonify(self.pos_system.get_dashboard_data())
            return jsonify({'error': 'POS sistem ni na voljo'})
        
        @app.route('/api/pos/sale', methods=['POST'])
        def api_pos_sale():
            if not self.pos_system:
                return jsonify({'error': 'POS sistem ni na voljo'})
            
            data = request.json
            try:
                result = self.pos_system.process_sale(
                    items=data['items'],
                    payment_method=data['payment_method'],
                    customer_id=data.get('customer_id')
                )
                
                # Pošlji real-time update preko AJAX
                # self.socketio.emit('pos_sale', {
                #     'transaction_id': result['transaction_id'],
                #     'total': result['total'],
                #     'timestamp': datetime.now().isoformat()
                # })
                
                return jsonify(result)
            except Exception as e:
                return jsonify({'error': str(e)}), 400
        
        @app.route('/api/reservations')
        def api_reservations():
            if self.reservation_system:
                return jsonify(self.reservation_system.get_dashboard_data())
            return jsonify({'error': 'Rezervacijski sistem ni na voljo'})
        
        @app.route('/api/reservations/create', methods=['POST'])
        def api_create_reservation():
            if not self.reservation_system:
                return jsonify({'error': 'Rezervacijski sistem ni na voljo'})
            
            data = request.json
            try:
                result = self.reservation_system.create_reservation(
                    guest_name=data['guest_name'],
                    guest_email=data['guest_email'],
                    reservation_type=data['reservation_type'],
                    start_time=datetime.fromisoformat(data['start_time']),
                    end_time=datetime.fromisoformat(data['end_time']),
                    party_size=data['party_size']
                )
                
                # Pošlji real-time update preko AJAX
                # self.socketio.emit('new_reservation', {
                #     'reservation_id': result.id,
                #     'guest_name': result.guest_name,
                #     'type': result.reservation_type.value,
                #     'timestamp': datetime.now().isoformat()
                # })
                
                return jsonify({'success': True, 'reservation_id': result.id})
            except Exception as e:
                return jsonify({'error': str(e)}), 400
        
        @app.route('/api/crm/customers')
        def api_crm_customers():
            if self.crm_system:
                return jsonify(self.crm_system.get_customer_analytics())
            return jsonify({'error': 'CRM sistem ni na voljo'})
        
        @app.route('/api/system/health')
        def api_system_health():
            return jsonify(self.get_system_health())
    
    def authenticate_user(self, username: str, password: str) -> bool:
        """Avtentifikacija uporabnika"""
        conn = sqlite3.connect('ultimate_web_interface.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, password_hash, role, permissions 
            FROM users 
            WHERE username = ? AND is_active = TRUE
        """, (username,))
        
        user_data = cursor.fetchone()
        
        if user_data and check_password_hash(user_data[1], password):
            session['user_id'] = user_data[0]
            session['username'] = username
            session['role'] = user_data[2]
            session['permissions'] = json.loads(user_data[3] or '[]')
            
            # Posodobi zadnjo prijavo
            cursor.execute("""
                UPDATE users 
                SET last_login = ? 
                WHERE id = ?
            """, (datetime.now(), user_data[0]))
            
            conn.commit()
            conn.close()
            return True
        
        conn.close()
        return False
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Pridobi podatke za dashboard"""
        dashboard_data = {
            'timestamp': datetime.now().isoformat(),
            'system_status': 'operational',
            'modules': {}
        }
        
        # POS podatki
        if self.pos_system:
            try:
                pos_data = self.pos_system.get_dashboard_data()
                dashboard_data['modules']['pos'] = {
                    'status': 'active',
                    'today_sales': pos_data.get('today_sales', 0),
                    'transactions_count': pos_data.get('transactions_count', 0),
                    'average_transaction': pos_data.get('average_transaction', 0)
                }
            except Exception as e:
                dashboard_data['modules']['pos'] = {'status': 'error', 'error': str(e)}
        
        # Rezervacije podatki
        if self.reservation_system:
            try:
                res_data = self.reservation_system.get_dashboard_data()
                dashboard_data['modules']['reservations'] = {
                    'status': 'active',
                    'today_reservations': res_data.get('today_reservations', 0),
                    'occupancy_rate': res_data.get('occupancy_rate', 0),
                    'pending_checkins': res_data.get('pending_checkins', 0)
                }
            except Exception as e:
                dashboard_data['modules']['reservations'] = {'status': 'error', 'error': str(e)}
        
        # Check-in podatki
        if self.checkin_system:
            try:
                checkin_data = self.checkin_system.get_dashboard_data()
                dashboard_data['modules']['checkin'] = {
                    'status': 'active',
                    'active_sessions': checkin_data.get('active_sessions', 0),
                    'today_checkins': checkin_data.get('today_checkins', 0),
                    'gdpr_compliance': checkin_data.get('gdpr_compliance', 100)
                }
            except Exception as e:
                dashboard_data['modules']['checkin'] = {'status': 'error', 'error': str(e)}
        
        # CRM podatki
        if self.crm_system:
            try:
                crm_data = self.crm_system.get_dashboard_data()
                dashboard_data['modules']['crm'] = {
                    'status': 'active',
                    'total_customers': crm_data.get('today_registrations', 0),
                    'active_campaigns': crm_data.get('active_campaigns', 0),
                    'pending_rewards': crm_data.get('pending_rewards', 0)
                }
            except Exception as e:
                dashboard_data['modules']['crm'] = {'status': 'error', 'error': str(e)}
        
        return dashboard_data
    
    def get_system_health(self) -> Dict[str, Any]:
        """Preveri zdravje sistema"""
        health_data = {
            'overall_status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'modules': {}
        }
        
        modules = [
            ('pos', self.pos_system),
            ('reservations', self.reservation_system),
            ('checkin', self.checkin_system),
            ('crm', self.crm_system),
            ('integration', self.master_integration)
        ]
        
        for module_name, module_instance in modules:
            if module_instance:
                try:
                    # Poskusi osnovni test
                    if hasattr(module_instance, 'get_dashboard_data'):
                        module_instance.get_dashboard_data()
                    health_data['modules'][module_name] = {
                        'status': 'healthy',
                        'last_check': datetime.now().isoformat()
                    }
                except Exception as e:
                    health_data['modules'][module_name] = {
                        'status': 'unhealthy',
                        'error': str(e),
                        'last_check': datetime.now().isoformat()
                    }
                    health_data['overall_status'] = 'degraded'
            else:
                health_data['modules'][module_name] = {
                    'status': 'unavailable',
                    'last_check': datetime.now().isoformat()
                }
        
        return health_data
    
    def start_background_tasks(self):
        """Zaženi background naloge"""
        def background_worker():
            while True:
                try:
                    # Posodobi dashboard podatke vsakih 30 sekund
                    time.sleep(30)
                    # Lahko dodamo periodične naloge
                except Exception as e:
                    print(f"Napaka v background worker: {e}")
                    time.sleep(60)
        
        # Zaženi background thread
        thread = threading.Thread(target=background_worker, daemon=True)
        thread.start()
    
    def run(self, host='0.0.0.0', port=5000, debug=False):
        """Zaženi web server"""
        print(f"🌐 ULTIMATE WEB INTERFACE")
        print(f"=" * 50)
        print(f"🚀 Server se zaganja na http://{host}:{port}")
        print(f"👤 Admin prijava: admin / admin123")
        print(f"📊 Dashboard: http://{host}:{port}/dashboard")
        print(f"💳 POS: http://{host}:{port}/pos")
        print(f"📅 Rezervacije: http://{host}:{port}/reservations")
        print(f"🏨 Check-in: http://{host}:{port}/checkin")
        print(f"👥 CRM: http://{host}:{port}/crm")
        
        self.app.run(host=host, port=port, debug=debug)

# HTML Templates (shranimo v templates folder)
def create_templates():
    """Ustvari HTML template datoteke"""
    templates_dir = 'templates'
    if not os.path.exists(templates_dir):
        os.makedirs(templates_dir)
    
    # Base template
    base_template = """
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Ultimate Tourism System{% endblock %}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .sidebar { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .main-content { background-color: #f8f9fa; min-height: 100vh; }
        .card { box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075); border: none; }
        .metric-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .status-indicator { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .status-healthy { background-color: #28a745; }
        .status-warning { background-color: #ffc107; }
        .status-error { background-color: #dc3545; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <nav class="col-md-2 d-none d-md-block sidebar">
                <div class="position-sticky pt-3">
                    <div class="text-center mb-4">
                        <h4 class="text-white">🏨 Ultimate Tourism</h4>
                    </div>
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/dashboard">
                                <i class="fas fa-tachometer-alt"></i> Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/pos">
                                <i class="fas fa-cash-register"></i> POS Sistem
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/reservations">
                                <i class="fas fa-calendar-alt"></i> Rezervacije
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/checkin">
                                <i class="fas fa-key"></i> Check-in
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/crm">
                                <i class="fas fa-users"></i> CRM
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/analytics">
                                <i class="fas fa-chart-bar"></i> Analitika
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="/settings">
                                <i class="fas fa-cog"></i> Nastavitve
                            </a>
                        </li>
                        <li class="nav-item mt-4">
                            <a class="nav-link text-white" href="/logout">
                                <i class="fas fa-sign-out-alt"></i> Odjava
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
            
            <!-- Main content -->
            <main class="col-md-10 ms-sm-auto main-content">
                <div class="container-fluid py-4">
                    {% block content %}{% endblock %}
                </div>
            </main>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    {% block scripts %}{% endblock %}
</body>
</html>
    """
    
    # Dashboard template
    dashboard_template = """
{% extends "base.html" %}

{% block title %}Dashboard - Ultimate Tourism System{% endblock %}

{% block content %}
<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">Dashboard</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <div class="btn-group me-2">
            <button type="button" class="btn btn-sm btn-outline-secondary">
                <i class="fas fa-sync-alt"></i> Osveži
            </button>
        </div>
    </div>
</div>

<!-- Status Cards -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card metric-card">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6 class="card-title">POS Sistem</h6>
                        <h3 id="pos-sales">€0</h3>
                        <small>Danes prodaja</small>
                    </div>
                    <div class="align-self-center">
                        <i class="fas fa-cash-register fa-2x"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card metric-card">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6 class="card-title">Rezervacije</h6>
                        <h3 id="reservations-count">0</h3>
                        <small>Danes rezervacije</small>
                    </div>
                    <div class="align-self-center">
                        <i class="fas fa-calendar-alt fa-2x"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card metric-card">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6 class="card-title">Check-in</h6>
                        <h3 id="checkin-sessions">0</h3>
                        <small>Aktivne seje</small>
                    </div>
                    <div class="align-self-center">
                        <i class="fas fa-key fa-2x"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card metric-card">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6 class="card-title">CRM</h6>
                        <h3 id="crm-customers">0</h3>
                        <small>Novi kupci</small>
                    </div>
                    <div class="align-self-center">
                        <i class="fas fa-users fa-2x"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- System Status -->
<div class="row mb-4">
    <div class="col-md-12">
        <div class="card">
            <div class="card-header">
                <h5>Status Sistema</h5>
            </div>
            <div class="card-body">
                <div class="row" id="system-status">
                    <!-- Dinamično napolnjeno -->
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Real-time Activity -->
<div class="row">
    <div class="col-md-8">
        <div class="card">
            <div class="card-header">
                <h5>Real-time Aktivnost</h5>
            </div>
            <div class="card-body">
                <div id="activity-feed" style="height: 300px; overflow-y: auto;">
                    <!-- Dinamično napolnjeno -->
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card">
            <div class="card-header">
                <h5>Hitre Akcije</h5>
            </div>
            <div class="card-body">
                <div class="d-grid gap-2">
                    <button class="btn btn-primary" onclick="location.href='/pos'">
                        <i class="fas fa-cash-register"></i> Nova Prodaja
                    </button>
                    <button class="btn btn-success" onclick="location.href='/reservations'">
                        <i class="fas fa-plus"></i> Nova Rezervacija
                    </button>
                    <button class="btn btn-info" onclick="location.href='/checkin'">
                        <i class="fas fa-key"></i> Check-in Gost
                    </button>
                    <button class="btn btn-warning" onclick="location.href='/crm'">
                        <i class="fas fa-user-plus"></i> Nov Kupec
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
{% endblock %}

{% block scripts %}
<script>
    // Socket.IO povezava
    const socket = io();
    
    socket.on('connect', function() {
        console.log('Povezan z real-time sistemom');
        socket.emit('request_dashboard_update');
    });
    
    socket.on('dashboard_update', function(data) {
        updateDashboard(data);
    });
    
    socket.on('pos_sale', function(data) {
        addActivityItem('POS', `Nova prodaja: €${data.total}`, 'success');
    });
    
    socket.on('new_reservation', function(data) {
        addActivityItem('Rezervacije', `Nova rezervacija: ${data.guest_name}`, 'info');
    });
    
    function updateDashboard(data) {
        // Posodobi metrike
        if (data.modules.pos) {
            document.getElementById('pos-sales').textContent = `€${data.modules.pos.today_sales || 0}`;
        }
        if (data.modules.reservations) {
            document.getElementById('reservations-count').textContent = data.modules.reservations.today_reservations || 0;
        }
        if (data.modules.checkin) {
            document.getElementById('checkin-sessions').textContent = data.modules.checkin.active_sessions || 0;
        }
        if (data.modules.crm) {
            document.getElementById('crm-customers').textContent = data.modules.crm.total_customers || 0;
        }
        
        // Posodobi status sistema
        updateSystemStatus(data.modules);
    }
    
    function updateSystemStatus(modules) {
        const statusContainer = document.getElementById('system-status');
        statusContainer.innerHTML = '';
        
        Object.keys(modules).forEach(moduleName => {
            const module = modules[moduleName];
            const statusClass = module.status === 'active' ? 'status-healthy' : 
                               module.status === 'error' ? 'status-error' : 'status-warning';
            
            const moduleDiv = document.createElement('div');
            moduleDiv.className = 'col-md-2 text-center mb-3';
            moduleDiv.innerHTML = `
                <div class="status-indicator ${statusClass}"></div>
                <div class="mt-2">
                    <strong>${moduleName.toUpperCase()}</strong>
                    <br>
                    <small class="text-muted">${module.status}</small>
                </div>
            `;
            statusContainer.appendChild(moduleDiv);
        });
    }
    
    function addActivityItem(module, message, type) {
        const feed = document.getElementById('activity-feed');
        const item = document.createElement('div');
        item.className = `alert alert-${type} alert-dismissible fade show`;
        item.innerHTML = `
            <strong>${module}:</strong> ${message}
            <small class="float-end">${new Date().toLocaleTimeString()}</small>
        `;
        feed.insertBefore(item, feed.firstChild);
        
        // Odstrani stare elemente
        while (feed.children.length > 10) {
            feed.removeChild(feed.lastChild);
        }
    }
    
    // Osveži podatke vsakih 30 sekund
    setInterval(() => {
        socket.emit('request_dashboard_update');
    }, 30000);
</script>
{% endblock %}
    """
    
    # Login template
    login_template = """
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prijava - Ultimate Tourism System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .login-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
    </style>
</head>
<body class="d-flex align-items-center">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-4">
                <div class="card login-card">
                    <div class="card-body p-5">
                        <div class="text-center mb-4">
                            <h2>🏨 Ultimate Tourism</h2>
                            <p class="text-muted">Prijavite se v sistem</p>
                        </div>
                        
                        {% with messages = get_flashed_messages(with_categories=true) %}
                            {% if messages %}
                                {% for category, message in messages %}
                                    <div class="alert alert-danger">{{ message }}</div>
                                {% endfor %}
                            {% endif %}
                        {% endwith %}
                        
                        <form method="POST">
                            <div class="mb-3">
                                <label for="username" class="form-label">Uporabniško ime</label>
                                <input type="text" class="form-control" id="username" name="username" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Geslo</label>
                                <input type="password" class="form-control" id="password" name="password" required>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary">Prijava</button>
                            </div>
                        </form>
                        
                        <div class="text-center mt-4">
                            <small class="text-muted">
                                Demo prijava: admin / admin123
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    """
    
    # Shrani template datoteke
    with open(os.path.join(templates_dir, 'base.html'), 'w', encoding='utf-8') as f:
        f.write(base_template)
    
    with open(os.path.join(templates_dir, 'dashboard.html'), 'w', encoding='utf-8') as f:
        f.write(dashboard_template)
    
    with open(os.path.join(templates_dir, 'login.html'), 'w', encoding='utf-8') as f:
        f.write(login_template)
    
    print("✅ HTML template datoteke ustvarjene")

def demo_web_interface():
    """Demo spletnega vmesnika"""
    print("🌐 ULTIMATE WEB INTERFACE")
    print("=" * 50)
    
    # Ustvari template datoteke
    create_templates()
    
    # Inicializiraj web vmesnik
    web_interface = UltimateWebInterface()
    
    print("✅ Web vmesnik je pripravljen!")
    print("🚀 Zagon: python ultimate_web_interface.py")
    
    return web_interface

if __name__ == "__main__":
    # Ustvari in zaženi web vmesnik
    web_interface = demo_web_interface()
    web_interface.run(debug=True)