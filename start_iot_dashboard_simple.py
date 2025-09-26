#!/usr/bin/env python3
"""
IoT Dashboard Simple Starter
Poenostavljena verzija za demo brez kompleksnih odvisnosti
"""

import os
import sys
from flask import Flask, render_template_string, jsonify, request, session, redirect
from flask_socketio import SocketIO, emit
import json
from datetime import datetime

# Flask aplikacija
app = Flask(__name__)
app.secret_key = 'iot_dashboard_demo_key_2024'
socketio = SocketIO(app, cors_allowed_origins="*")

# Demo podatki
demo_devices = {
    "home/lights/living": {
        "name": "Dnevna luč",
        "status": "online",
        "type": "light",
        "last_seen": datetime.now().strftime("%H:%M:%S")
    },
    "home/lights/bedroom": {
        "name": "Spalnica luč",
        "status": "online", 
        "type": "light",
        "last_seen": datetime.now().strftime("%H:%M:%S")
    },
    "home/hvac/main": {
        "name": "Glavna klima",
        "status": "offline",
        "type": "hvac",
        "last_seen": "10:30:15"
    },
    "home/sensors/temp1": {
        "name": "Temperaturni senzor",
        "status": "online",
        "type": "sensor",
        "last_seen": datetime.now().strftime("%H:%M:%S")
    }
}

demo_scenes = {
    "morning_routine": {
        "name": "Jutranja rutina",
        "description": "Prižgi luči, zaženi kavo"
    },
    "evening_routine": {
        "name": "Večerna rutina", 
        "description": "Ugasni luči, aktiviraj varnost"
    }
}

# Avtentikacija
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if username == 'admin' and password == 'demo123':
            session['authenticated'] = True
            session['username'] = username
            return jsonify({'success': True, 'message': 'Uspešna prijava'})
        else:
            return jsonify({'success': False, 'message': 'Napačni podatki'})
    
    login_html = """
<!DOCTYPE html>
<html>
<head>
    <title>IoT Dashboard - Prijava</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f0f0f0; margin: 0; padding: 0; }
        .login-container { max-width: 400px; margin: 100px auto; padding: 30px; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h2 { text-align: center; color: #2c3e50; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #555; font-weight: bold; }
        input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; }
        input:focus { border-color: #007bff; outline: none; }
        button { width: 100%; padding: 15px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; }
        button:hover { background: #0056b3; }
        .error { color: red; margin-top: 15px; text-align: center; }
        .demo-info { background: #e7f3ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .demo-info h4 { margin: 0 0 10px 0; color: #0066cc; }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>🏠 IoT Dashboard</h2>
        <div class="demo-info">
            <h4>Demo Dostop:</h4>
            <p><strong>Uporabnik:</strong> admin<br>
            <strong>Geslo:</strong> demo123</p>
        </div>
        <form id="loginForm">
            <div class="form-group">
                <label>Uporabniško ime:</label>
                <input type="text" id="username" value="admin" required>
            </div>
            <div class="form-group">
                <label>Geslo:</label>
                <input type="password" id="password" value="demo123" required>
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
    return login_html

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

@app.route('/')
def dashboard():
    if not session.get('authenticated'):
        return redirect('/login')
    
    dashboard_html = """
<!DOCTYPE html>
<html>
<head>
    <title>IoT Dashboard</title>
    <meta charset="utf-8">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .header { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); color: #333; padding: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 20px rgba(0,0,0,0.1); }
        .header h1 { font-size: 28px; font-weight: 300; }
        .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; padding: 25px; max-width: 1400px; margin: 0 auto; }
        .card { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 15px; padding: 25px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2); }
        .card h3 { margin-bottom: 20px; color: #333; font-weight: 500; }
        .device-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
        .device-card { border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; text-align: center; transition: all 0.3s ease; background: white; }
        .device-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        .device-online { border-color: #4CAF50; }
        .device-offline { border-color: #f44336; }
        .btn { padding: 10px 18px; border: none; border-radius: 8px; cursor: pointer; margin: 3px; font-weight: 500; transition: all 0.2s ease; }
        .btn:hover { transform: translateY(-2px); }
        .btn-success { background: #4CAF50; color: white; }
        .btn-success:hover { background: #45a049; }
        .btn-danger { background: #f44336; color: white; }
        .btn-danger:hover { background: #da190b; }
        .btn-warning { background: #ff9800; color: white; }
        .btn-warning:hover { background: #e68900; }
        .btn-info { background: #2196F3; color: white; }
        .btn-info:hover { background: #1976D2; }
        .status-online { color: #4CAF50; font-weight: bold; }
        .status-offline { color: #f44336; font-weight: bold; }
        .metrics { font-size: 0.9em; color: #666; margin-top: 15px; }
        .scene-list { max-height: 350px; overflow-y: auto; }
        .scene-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; background: #f9f9f9; }
        .scene-item:hover { background: #f0f0f0; }
        .alerts { position: fixed; top: 100px; right: 30px; z-index: 1000; }
        .alert { background: #4CAF50; color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); animation: slideIn 0.3s ease; }
        .alert.error { background: #f44336; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .system-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        .connection-status { display: flex; align-items: center; gap: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏠 IoT Dashboard</h1>
        <div class="connection-status">
            <span id="connectionStatus">🔴 Povezovanje...</span>
            <button class="btn btn-danger" onclick="logout()">Odjava</button>
        </div>
    </div>
    
    <div class="alerts" id="alerts"></div>
    
    <div class="main-content">
        <div class="card">
            <h3>📊 Pregled Sistema</h3>
            <div class="system-stats">
                <div class="stat-card">
                    <div class="stat-number" id="totalDevices">4</div>
                    <div class="stat-label">Skupaj naprav</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="onlineDevices">3</div>
                    <div class="stat-label">Online</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="offlineDevices">1</div>
                    <div class="stat-label">Offline</div>
                </div>
            </div>
            <div id="systemOverview">
                <p><strong>Zadnja posodobitev:</strong> <span id="lastUpdate">{{ current_time }}</span></p>
                <p><strong>Sistem:</strong> <span style="color: #4CAF50;">✅ Operativen</span></p>
            </div>
        </div>
        
        <div class="card">
            <h3>🎬 Scene</h3>
            <div id="scenesList" class="scene-list">
                <div class="scene-item">
                    <div>
                        <strong>Jutranja rutina</strong><br>
                        <small>Prižgi luči, zaženi kavo</small>
                    </div>
                    <button class="btn btn-success" onclick="executeScene('morning_routine')">Izvedi</button>
                </div>
                <div class="scene-item">
                    <div>
                        <strong>Večerna rutina</strong><br>
                        <small>Ugasni luči, aktiviraj varnost</small>
                    </div>
                    <button class="btn btn-success" onclick="executeScene('evening_routine')">Izvedi</button>
                </div>
            </div>
        </div>
        
        <div class="card" style="grid-column: 1 / -1;">
            <h3>📱 Naprave</h3>
            <div id="devicesList" class="device-grid">
                <!-- Naprave se naložijo dinamično -->
            </div>
        </div>
    </div>
    
    <script>
        const socket = io();
        
        socket.on('connect', () => {
            document.getElementById('connectionStatus').innerHTML = '🟢 Povezano';
            loadDevices();
        });
        
        socket.on('disconnect', () => {
            document.getElementById('connectionStatus').innerHTML = '🔴 Prekinjeno';
        });
        
        socket.on('device_update', (data) => {
            showAlert(`Naprava ${data.device_id}: ${data.result}`, 'success');
            loadDevices(); // Osveži seznam naprav
        });
        
        function loadDevices() {
            fetch('/api/devices')
                .then(response => response.json())
                .then(data => {
                    updateDevicesList(data.devices);
                    updateStats(data.devices);
                })
                .catch(error => console.error('Error loading devices:', error));
        }
        
        function updateDevicesList(devices) {
            const devicesList = document.getElementById('devicesList');
            devicesList.innerHTML = '';
            
            for (const [deviceId, device] of Object.entries(devices)) {
                const deviceCard = document.createElement('div');
                deviceCard.className = `device-card ${device.status === 'online' ? 'device-online' : 'device-offline'}`;
                deviceCard.innerHTML = `
                    <h4>${device.name}</h4>
                    <p class="${device.status === 'online' ? 'status-online' : 'status-offline'}">
                        ${device.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                    </p>
                    <div class="metrics">
                        <small>Tip: ${device.type}</small><br>
                        <small>Zadnja aktivnost: ${device.last_seen}</small>
                    </div>
                    <div style="margin-top: 15px;">
                        <button class="btn btn-success" onclick="controlDevice('${deviceId}', 'turn_on')">ON</button>
                        <button class="btn btn-danger" onclick="controlDevice('${deviceId}', 'turn_off')">OFF</button>
                        <button class="btn btn-warning" onclick="controlDevice('${deviceId}', 'restart')">⟲</button>
                        <button class="btn btn-info" onclick="controlDevice('${deviceId}', 'status')">📊</button>
                    </div>
                `;
                devicesList.appendChild(deviceCard);
            }
        }
        
        function updateStats(devices) {
            const total = Object.keys(devices).length;
            const online = Object.values(devices).filter(d => d.status === 'online').length;
            const offline = total - online;
            
            document.getElementById('totalDevices').textContent = total;
            document.getElementById('onlineDevices').textContent = online;
            document.getElementById('offlineDevices').textContent = offline;
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
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
                    showAlert(`Uspešno: ${result.message}`, 'success');
                } else {
                    showAlert(`Napaka: ${result.error}`, 'error');
                }
            } catch (error) {
                showAlert(`Napaka: ${error.message}`, 'error');
            }
        }
        
        async function executeScene(sceneId) {
            try {
                const response = await fetch(`/api/scenes/${sceneId}/execute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const result = await response.json();
                if (result.success) {
                    showAlert(`Scena "${sceneId}" uspešno izvedena`, 'success');
                } else {
                    showAlert(`Napaka pri izvajanju scene: ${result.error}`, 'error');
                }
            } catch (error) {
                showAlert(`Napaka: ${error.message}`, 'error');
            }
        }
        
        function showAlert(message, type) {
            const alertsContainer = document.getElementById('alerts');
            const alert = document.createElement('div');
            alert.className = `alert ${type === 'error' ? 'error' : ''}`;
            alert.textContent = message;
            alertsContainer.appendChild(alert);
            
            setTimeout(() => {
                alert.remove();
            }, 4000);
        }
        
        async function logout() {
            try {
                await fetch('/logout');
                window.location.href = '/login';
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        
        // Naloži naprave ob zagonu
        loadDevices();
        
        // Posodobi podatke vsakih 30 sekund
        setInterval(loadDevices, 30000);
    </script>
</body>
</html>
    """.replace('{{ current_time }}', datetime.now().strftime("%H:%M:%S"))
    
    return dashboard_html

@app.route('/api/devices')
def get_devices():
    if not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Posodobi čase za online naprave
    for device_id, device in demo_devices.items():
        if device['status'] == 'online':
            device['last_seen'] = datetime.now().strftime("%H:%M:%S")
    
    return jsonify({'devices': demo_devices})

@app.route('/api/device/<device_id>/control', methods=['POST'])
def control_device(device_id):
    if not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        action = request.json.get('action')
        
        if device_id not in demo_devices:
            return jsonify({'error': f'Naprava {device_id} ne obstaja'}), 404
        
        # Simuliraj akcijo
        if action == 'turn_on':
            demo_devices[device_id]['status'] = 'online'
            message = f"Naprava {demo_devices[device_id]['name']} prižgana ✅"
        elif action == 'turn_off':
            demo_devices[device_id]['status'] = 'offline'
            message = f"Naprava {demo_devices[device_id]['name']} ugašena ✅"
        elif action == 'restart':
            demo_devices[device_id]['status'] = 'online'
            message = f"Naprava {demo_devices[device_id]['name']} ponovno zagnana 🔄"
        elif action == 'status':
            message = f"Status naprave {demo_devices[device_id]['name']}: {demo_devices[device_id]['status']}"
        else:
            return jsonify({'error': f'Neznana akcija: {action}'}), 400
        
        # Posodobi čas
        demo_devices[device_id]['last_seen'] = datetime.now().strftime("%H:%M:%S")
        
        # Pošlji update vsem klientom
        socketio.emit('device_update', {
            'device_id': device_id,
            'action': action,
            'result': message,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({'success': True, 'message': message})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scenes/<scene_id>/execute', methods=['POST'])
def execute_scene(scene_id):
    if not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        if scene_id not in demo_scenes:
            return jsonify({'error': f'Scena {scene_id} ne obstaja'}), 404
        
        scene = demo_scenes[scene_id]
        
        # Simuliraj izvajanje scene
        if scene_id == 'morning_routine':
            demo_devices['home/lights/living']['status'] = 'online'
            demo_devices['home/lights/bedroom']['status'] = 'online'
            message = "Jutranja rutina izvedena: luči prižgane"
        elif scene_id == 'evening_routine':
            demo_devices['home/lights/living']['status'] = 'offline'
            demo_devices['home/lights/bedroom']['status'] = 'offline'
            message = "Večerna rutina izvedena: luči ugašene"
        else:
            message = f"Scena {scene['name']} izvedena"
        
        # Pošlji update
        socketio.emit('scene_executed', {
            'scene_id': scene_id,
            'result': message,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({'success': True, 'message': message})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    print("🚀 IoT Dashboard Demo se zaganja...")
    print("=" * 50)
    print("🌐 URL: http://localhost:5000")
    print("👤 Username: admin")
    print("🔑 Password: demo123")
    print("=" * 50)
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)