"""
IoT Dashboard - Web vmesnik za upravljanje IoT naprav
Omogoča real-time monitoring, upravljanje naprav in avtomatizacijo preko spletnega vmesnika.
"""

from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit
import json
import os
from datetime import datetime, timedelta
import sqlite3
from .iot_secure import *
from .iot_monitoring import get_monitoring_dashboard, get_device_metrics
from .iot_automation import automation_engine, get_all_scenes
from .iot_scheduler import scheduler
from .iot_groups import get_all_groups, get_group_devices
from .iot_rules import rules_engine, get_all_rules

# Flask aplikacija
app = Flask("iot_dashboard")
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'iot_dashboard_secret_key_2024')
socketio = SocketIO(app, cors_allowed_origins="*")

# Globalne spremenljivke
connected_clients = []
dashboard_data = {}

# ===========================
# Avtentikacija
# ===========================

def require_auth():
    """Preveri avtentikacijo uporabnika"""
    if 'authenticated' not in session:
        return False
    return session['authenticated']

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Prijava v dashboard"""
    if request.method == 'POST':
        username = request.json.get('username')
        password = request.json.get('password')
        
        # Preveri credentials (v produkciji uporabi pravo bazo)
        admin_user = os.getenv('DASHBOARD_USERNAME', 'admin')
        admin_pass = os.getenv('DASHBOARD_PASSWORD', 'secure123')
        
        if username == admin_user and password == admin_pass:
            session['authenticated'] = True
            session['username'] = username
            log_action('dashboard', 'login_success', f'User {username} logged in')
            return jsonify({'success': True, 'message': 'Uspešna prijava'})
        else:
            log_action('dashboard', 'login_failed', f'Failed login attempt for {username}')
            return jsonify({'success': False, 'message': 'Napačni podatki'})
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    """Odjava iz dashboard"""
    username = session.get('username', 'unknown')
    session.clear()
    log_action('dashboard', 'logout', f'User {username} logged out')
    return jsonify({'success': True, 'message': 'Uspešna odjava'})

# ===========================
# Dashboard Routes
# ===========================

@app.route('/')
def dashboard():
    """Glavna dashboard stran"""
    if not require_auth():
        return redirect('/login')
    
    return render_template('dashboard.html')

@app.route('/api/dashboard/data')
def get_dashboard_data():
    """API za dashboard podatke"""
    if not require_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Pridobi monitoring podatke
        monitoring_data = get_monitoring_dashboard()
        
        # Pridobi scene
        scenes = get_all_scenes()
        
        # Pridobi skupine
        groups = get_all_groups()
        
        # Pridobi pravila
        rules = get_all_rules()
        
        # Pridobi scheduled tasks
        scheduled_tasks = scheduler.get_all_tasks()
        
        dashboard_data = {
            'monitoring': monitoring_data,
            'scenes': scenes,
            'groups': groups,
            'rules': rules,
            'scheduled_tasks': scheduled_tasks,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        log_action('dashboard', 'error', f'Dashboard data error: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices')
def get_devices():
    """API za seznam naprav"""
    if not require_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Pridobi naprave iz monitoring sistema
        monitoring_data = get_monitoring_dashboard()
        devices = monitoring_data.get('devices', {})
        
        return jsonify({'devices': devices})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/device/<device_id>/control', methods=['POST'])
def control_device(device_id):
    """API za upravljanje naprav"""
    if not require_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        action = request.json.get('action')
        params = request.json.get('params', {})
        
        # Izvedi akcijo
        if action == 'turn_on':
            result = turn_on(device_id)
        elif action == 'turn_off':
            result = turn_off(device_id)
        elif action == 'restart':
            result = restart(device_id)
        elif action == 'status':
            status_url = params.get('status_url')
            result = status(device_id, status_url)
        else:
            return jsonify({'error': f'Unknown action: {action}'}), 400
        
        # Pošlji update vsem povezanim klientom
        socketio.emit('device_update', {
            'device_id': device_id,
            'action': action,
            'result': result,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({'success': True, 'result': result})
        
    except Exception as e:
        log_action('dashboard', 'device_control_error', f'Device {device_id}, action {action}: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/scenes/<scene_id>/execute', methods=['POST'])
def execute_scene(scene_id):
    """API za izvajanje scen"""
    if not require_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        result = automation_engine.execute_scene(scene_id)
        
        # Pošlji update
        socketio.emit('scene_executed', {
            'scene_id': scene_id,
            'result': result,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({'success': True, 'result': result})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<rule_id>/toggle', methods=['POST'])
def toggle_rule(rule_id):
    """API za vklop/izklop pravil"""
    if not require_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        enabled = request.json.get('enabled', True)
        result = rules_engine.toggle_rule(rule_id, enabled)
        
        return jsonify({'success': True, 'result': result})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===========================
# WebSocket Events
# ===========================

@socketio.on('connect')
def handle_connect():
    """Novi klient se je povezal"""
    if not require_auth():
        emit('error', {'message': 'Unauthorized'})
        return False
    
    connected_clients.append(request.sid)
    emit('connected', {'message': 'Povezan z IoT Dashboard'})
    
    # Pošlji trenutne podatke
    try:
        dashboard_data = get_monitoring_dashboard()
        emit('dashboard_update', dashboard_data)
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('disconnect')
def handle_disconnect():
    """Klient se je odklopil"""
    if request.sid in connected_clients:
        connected_clients.remove(request.sid)

@socketio.on('request_update')
def handle_update_request():
    """Klient zahteva posodobitev podatkov"""
    if not require_auth():
        emit('error', {'message': 'Unauthorized'})
        return
    
    try:
        dashboard_data = get_monitoring_dashboard()
        emit('dashboard_update', dashboard_data)
    except Exception as e:
        emit('error', {'message': str(e)})

# ===========================
# Real-time Updates
# ===========================

def broadcast_device_update(device_id, status, metrics=None):
    """Pošlje posodobitev naprave vsem povezanim klientom"""
    update_data = {
        'device_id': device_id,
        'status': status,
        'metrics': metrics or {},
        'timestamp': datetime.now().isoformat()
    }
    
    socketio.emit('device_update', update_data)

def broadcast_alert(alert_data):
    """Pošlje alarm vsem povezanim klientom"""
    socketio.emit('alert', alert_data)

def broadcast_system_status(status_data):
    """Pošlje sistemski status vsem povezanim klientom"""
    socketio.emit('system_status', status_data)

# ===========================
# HTML Templates (inline za demo)
# ===========================

def create_templates():
    """Ustvari HTML template datoteke"""
    templates_dir = "templates"
    if not os.path.exists(templates_dir):
        os.makedirs(templates_dir)
    
    # Login template
    login_html = """
<!DOCTYPE html>
<html>
<head>
    <title>IoT Dashboard - Prijava</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f0f0f0; }
        .login-container { max-width: 400px; margin: 100px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; }
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .error { color: red; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>IoT Dashboard</h2>
        <form id="loginForm">
            <div class="form-group">
                <label>Uporabniško ime:</label>
                <input type="text" id="username" required>
            </div>
            <div class="form-group">
                <label>Geslo:</label>
                <input type="password" id="password" required>
            </div>
            <button type="submit">Prijava</button>
            <div id="error" class="error"></div>
        </form>
    </div>
    
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const result = await response.json();
                if (result.success) {
                    window.location.href = '/';
                } else {
                    document.getElementById('error').textContent = result.message;
                }
            } catch (error) {
                document.getElementById('error').textContent = 'Napaka pri prijavi';
            }
        });
    </script>
</body>
</html>
    """
    
    # Dashboard template
    dashboard_html = """
<!DOCTYPE html>
<html>
<head>
    <title>IoT Dashboard</title>
    <meta charset="utf-8">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px; }
        .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .device-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
        .device-card { border: 1px solid #ddd; border-radius: 6px; padding: 15px; text-align: center; }
        .device-online { border-color: #28a745; }
        .device-offline { border-color: #dc3545; }
        .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin: 2px; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-warning { background: #ffc107; color: black; }
        .btn-info { background: #17a2b8; color: white; }
        .status-online { color: #28a745; }
        .status-offline { color: #dc3545; }
        .metrics { font-size: 0.9em; color: #666; margin-top: 10px; }
        .scene-list, .rule-list { max-height: 300px; overflow-y: auto; }
        .scene-item, .rule-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
        .alerts { position: fixed; top: 80px; right: 20px; z-index: 1000; }
        .alert { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏠 IoT Dashboard</h1>
        <div>
            <span id="connectionStatus">🔴 Povezovanje...</span>
            <button class="btn btn-danger" onclick="logout()">Odjava</button>
        </div>
    </div>
    
    <div class="alerts" id="alerts"></div>
    
    <div class="main-content">
        <div class="card">
            <h3>📊 Pregled Sistema</h3>
            <div id="systemOverview">
                <p>Nalaganje podatkov...</p>
            </div>
        </div>
        
        <div class="card">
            <h3>🎬 Scene</h3>
            <div id="scenesList" class="scene-list">
                <p>Nalaganje scen...</p>
            </div>
        </div>
        
        <div class="card">
            <h3>📱 Naprave</h3>
            <div id="devicesList" class="device-grid">
                <p>Nalaganje naprav...</p>
            </div>
        </div>
        
        <div class="card">
            <h3>📏 Avtomatizacijska Pravila</h3>
            <div id="rulesList" class="rule-list">
                <p>Nalaganje pravil...</p>
            </div>
        </div>
    </div>
    
    <script>
        const socket = io();
        
        socket.on('connect', () => {
            document.getElementById('connectionStatus').innerHTML = '🟢 Povezano';
            socket.emit('request_update');
        });
        
        socket.on('disconnect', () => {
            document.getElementById('connectionStatus').innerHTML = '🔴 Prekinjeno';
        });
        
        socket.on('dashboard_update', (data) => {
            updateSystemOverview(data.monitoring);
            updateDevicesList(data.monitoring.devices);
        });
        
        socket.on('device_update', (data) => {
            showAlert(`Naprava ${data.device_id}: ${data.result}`, 'info');
        });
        
        socket.on('alert', (data) => {
            showAlert(data.message, data.level);
        });
        
        function updateSystemOverview(monitoring) {
            const summary = monitoring.summary;
            document.getElementById('systemOverview').innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div><strong>Skupaj naprav:</strong> ${summary.total_devices}</div>
                    <div><strong>Online:</strong> <span class="status-online">${summary.online_devices}</span></div>
                    <div><strong>Offline:</strong> <span class="status-offline">${summary.offline_devices}</span></div>
                    <div><strong>Alarmi:</strong> ${summary.total_alerts}</div>
                    <div><strong>Uptime:</strong> ${summary.uptime_percentage}%</div>
                    <div><strong>Zadnja posodobitev:</strong> ${new Date().toLocaleTimeString()}</div>
                </div>
            `;
        }
        
        function updateDevicesList(devices) {
            const devicesList = document.getElementById('devicesList');
            devicesList.innerHTML = '';
            
            for (const [deviceId, device] of Object.entries(devices)) {
                const deviceCard = document.createElement('div');
                deviceCard.className = `device-card ${device.status === 'online' ? 'device-online' : 'device-offline'}`;
                deviceCard.innerHTML = `
                    <h4>${device.name || deviceId}</h4>
                    <p class="${device.status === 'online' ? 'status-online' : 'status-offline'}">
                        ${device.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                    </p>
                    <div class="metrics">
                        <small>Zadnja aktivnost: ${device.last_seen || 'N/A'}</small>
                    </div>
                    <div style="margin-top: 10px;">
                        <button class="btn btn-success" onclick="controlDevice('${deviceId}', 'turn_on')">ON</button>
                        <button class="btn btn-danger" onclick="controlDevice('${deviceId}', 'turn_off')">OFF</button>
                        <button class="btn btn-warning" onclick="controlDevice('${deviceId}', 'restart')">⟲</button>
                        <button class="btn btn-info" onclick="controlDevice('${deviceId}', 'status')">📊</button>
                    </div>
                `;
                devicesList.appendChild(deviceCard);
            }
        }
        
        async function controlDevice(deviceId, action) {
            try {
                const response = await fetch(`/api/device/${deviceId}/control`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action })
                });
                
                const result = await response.json();
                if (result.success) {
                    showAlert(`Uspešno: ${result.result}`, 'success');
                } else {
                    showAlert(`Napaka: ${result.error}`, 'error');
                }
            } catch (error) {
                showAlert(`Napaka: ${error.message}`, 'error');
            }
        }
        
        function showAlert(message, type) {
            const alertsContainer = document.getElementById('alerts');
            const alert = document.createElement('div');
            alert.className = 'alert';
            alert.textContent = message;
            alertsContainer.appendChild(alert);
            
            setTimeout(() => {
                alert.remove();
            }, 5000);
        }
        
        async function logout() {
            try {
                await fetch('/logout');
                window.location.href = '/login';
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        
        // Posodobi podatke vsakih 30 sekund
        setInterval(() => {
            socket.emit('request_update');
        }, 30000);
    </script>
</body>
</html>
    """
    
    # Zapiši template datoteke
    with open(os.path.join(templates_dir, 'login.html'), 'w', encoding='utf-8') as f:
        f.write(login_html)
    
    with open(os.path.join(templates_dir, 'dashboard.html'), 'w', encoding='utf-8') as f:
        f.write(dashboard_html)

# ===========================
# Inicializacija
# ===========================

def start_dashboard(host='0.0.0.0', port=5000, debug=False):
    """Zaženi IoT Dashboard"""
    try:
        # Ustvari template datoteke
        create_templates()
        
        print(f"🚀 IoT Dashboard se zaganja na http://{host}:{port}")
        print(f"📊 Uporabniško ime: {os.getenv('DASHBOARD_USERNAME', 'admin')}")
        print(f"🔑 Geslo: {os.getenv('DASHBOARD_PASSWORD', 'secure123')}")
        
        # Zaženi Flask aplikacijo
        socketio.run(app, host=host, port=port, debug=debug)
        
    except Exception as e:
        print(f"❌ Napaka pri zagonu dashboard: {str(e)}")
        log_action('dashboard', 'startup_error', str(e))

# Javne funkcije za integracijo
def get_dashboard_app():
    """Vrne Flask aplikacijo za integracijo"""
    return app

def get_socketio():
    """Vrne SocketIO instanco za integracijo"""
    return socketio

# Test funkcija
if __name__ == "__main__":
    start_dashboard(debug=True)