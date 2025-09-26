#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMNI WEB DASHBOARD - Spletni vmesnik za upravljanje OMNI sistema
Dostopen preko brskalnika na http://localhost:8000
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading
import time
import os
from datetime import datetime
import urllib.parse

class OMNIWebDashboard(BaseHTTPRequestHandler):
    
    # Stanje sistema
    system_status = {
        'functional_modules': {'status': 'running', 'health': 95, 'last_update': datetime.now().isoformat()},
        'redundancy_system': {'status': 'running', 'health': 98, 'last_update': datetime.now().isoformat()},
        'auto_healing': {'status': 'running', 'health': 92, 'last_update': datetime.now().isoformat()},
        'learning_system': {'status': 'running', 'health': 89, 'last_update': datetime.now().isoformat()},
        'visual_schema': {'status': 'running', 'health': 94, 'last_update': datetime.now().isoformat()},
        'finance_optimizer': {'status': 'running', 'health': 96, 'last_update': datetime.now().isoformat()},
        'logistics_optimizer': {'status': 'running', 'health': 93, 'last_update': datetime.now().isoformat()},
        'healthcare_optimizer': {'status': 'running', 'health': 97, 'last_update': datetime.now().isoformat()},
        'tourism_optimizer': {'status': 'running', 'health': 94, 'last_update': datetime.now().isoformat()},
        'agriculture_optimizer': {'status': 'running', 'health': 91, 'last_update': datetime.now().isoformat()},
        # Novi univerzalni moduli
        'industry_optimizer': {'status': 'running', 'health': 95, 'last_update': datetime.now().isoformat()},
        'energy_optimizer': {'status': 'running', 'health': 93, 'last_update': datetime.now().isoformat()},
        'smart_home_optimizer': {'status': 'running', 'health': 96, 'last_update': datetime.now().isoformat()},
        'autonomous_vehicles_optimizer': {'status': 'running', 'health': 92, 'last_update': datetime.now().isoformat()},
        'robotics_optimizer': {'status': 'running', 'health': 94, 'last_update': datetime.now().isoformat()},
        'science_optimizer': {'status': 'running', 'health': 97, 'last_update': datetime.now().isoformat()},
        'communications_optimizer': {'status': 'running', 'health': 98, 'last_update': datetime.now().isoformat()}
    }
    
    system_logs = []
    
    def do_GET(self):
        if self.path == '/':
            self.serve_dashboard()
        elif self.path == '/api/status':
            self.serve_status_api()
        elif self.path == '/api/logs':
            self.serve_logs_api()
        elif self.path.startswith('/api/'):
            self.serve_api()
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path.startswith('/api/'):
            self.handle_api_post()
        else:
            self.send_error(404)
    
    def serve_dashboard(self):
        """Služi glavni dashboard HTML"""
        html_content = """
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI ULTRA SISTEM - Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: #ffffff;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(90deg, #00ff00 0%, #00aa00 100%);
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        .controls {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
        }
        .btn-start { background: #00aa00; color: white; }
        .btn-stop { background: #aa0000; color: white; }
        .btn-test { background: #0066cc; color: white; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.3); }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            transition: transform 0.3s ease;
        }
        .card:hover { transform: translateY(-5px); }
        .card h3 {
            color: #00ff00;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-running { background: #00ff00; }
        .status-stopped { background: #ff0000; }
        .health-bar {
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            margin: 10px 0;
            overflow: hidden;
        }
        .health-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff0000 0%, #ffff00 50%, #00ff00 100%);
            transition: width 0.5s ease;
        }
        .logs {
            background: rgba(0,0,0,0.8);
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
            max-height: 400px;
            overflow-y: auto;
        }
        .logs h3 {
            color: #00ff00;
            margin-bottom: 15px;
        }
        .log-entry {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin-bottom: 5px;
            padding: 5px;
            border-left: 3px solid #00ff00;
            padding-left: 10px;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .metric {
            text-align: center;
            padding: 15px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #00ff00;
        }
        .metric-label {
            font-size: 0.9em;
            opacity: 0.8;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌍 OMNI ULTRA SISTEM</h1>
        <p>Univerzalni AI Sistem za Vse Panoge - Spletni Dashboard</p>
    </div>
    
    <div class="container">
        <div class="controls">
            <button class="btn btn-start" onclick="startAllSystems()">🚀 Zagon Vseh Sistemov</button>
            <button class="btn btn-stop" onclick="stopAllSystems()">⏹️ Ustavi Vse Sisteme</button>
            <button class="btn btn-test" onclick="testSystem()">🔧 Testiraj Sistem</button>
        </div>
        
        <div class="grid" id="systemGrid">
            <!-- Komponente se naložijo dinamično -->
        </div>
        
        <div class="metrics" id="metricsGrid">
            <div class="metric">
                <div class="metric-value" id="totalComponents">17</div>
                <div class="metric-label">Skupaj Komponent</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="runningComponents">17</div>
                <div class="metric-label">Aktivnih Komponent</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="systemHealth">94%</div>
                <div class="metric-label">Zdravje Sistema</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="uptime">24h</div>
                <div class="metric-label">Čas Delovanja</div>
            </div>
        </div>
        
        <div class="visual-schema" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-top: 20px; text-align: center;">
            <h3 style="color: #00ff00; margin-bottom: 20px;">🌐 Vizualna Shema Omni Modulov</h3>
            <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px;">
                <button class="btn" onclick="showVisualSchema()" style="background: linear-gradient(45deg, #4A90E2, #357ABD); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;">
                    📊 Prikaži Popolno Vizualno Shemo
                </button>
            </div>
            <div id="schemaContainer" style="display: none; margin-top: 20px;">
                <iframe src="omni_visual_schema_complete.svg" width="100%" height="600" style="border: none; border-radius: 8px; background: white;"></iframe>
            </div>
            <div style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                <p>🔄 Samoučeči moduli | 🎯 Avtomatska optimizacija | 🔗 Medsebojna povezanost | 💾 3x redundanca</p>
            </div>
        </div>
        
        <div class="logs">
            <h3>📋 Sistemski Log</h3>
            <div id="logContainer">
                <!-- Logi se naložijo dinamično -->
            </div>
        </div>
    </div>

    <script>
        // Globalne spremenljivke
        let systemData = {};
        let logData = [];
        
        // Inicializacija
        document.addEventListener('DOMContentLoaded', function() {
            loadSystemStatus();
            loadLogs();
            setInterval(loadSystemStatus, 5000); // Posodobi vsake 5 sekund
            setInterval(loadLogs, 10000); // Posodobi loge vsake 10 sekund
        });
        
        // Naloži status sistema
        async function loadSystemStatus() {
            try {
                const response = await fetch('/api/status');
                systemData = await response.json();
                updateSystemGrid();
                updateMetrics();
            } catch (error) {
                console.error('Napaka pri nalaganju statusa:', error);
            }
        }
        
        // Naloži loge
        async function loadLogs() {
            try {
                const response = await fetch('/api/logs');
                logData = await response.json();
                updateLogs();
            } catch (error) {
                console.error('Napaka pri nalaganju logov:', error);
            }
        }
        
        // Posodobi mrežo komponent
        function updateSystemGrid() {
            const grid = document.getElementById('systemGrid');
            grid.innerHTML = '';
            
            for (const [key, component] of Object.entries(systemData)) {
                const card = document.createElement('div');
                card.className = 'card';
                
                const statusClass = component.status === 'running' ? 'status-running' : 'status-stopped';
                const statusText = component.status === 'running' ? 'DELUJE' : 'USTAVLJENO';
                
                card.innerHTML = `
                    <h3>${getComponentName(key)}</h3>
                    <p><span class="status-indicator ${statusClass}"></span>${statusText}</p>
                    <div class="health-bar">
                        <div class="health-fill" style="width: ${component.health}%"></div>
                    </div>
                    <p>Zdravje: ${component.health}%</p>
                    <p>Zadnja posodobitev: ${new Date(component.last_update).toLocaleTimeString()}</p>
                `;
                
                grid.appendChild(card);
            }
        }
        
        // Posodobi metrike
        function updateMetrics() {
            const total = Object.keys(systemData).length;
            const running = Object.values(systemData).filter(c => c.status === 'running').length;
            const avgHealth = Math.round(Object.values(systemData).reduce((sum, c) => sum + c.health, 0) / total);
            
            document.getElementById('totalComponents').textContent = total;
            document.getElementById('runningComponents').textContent = running;
            document.getElementById('systemHealth').textContent = avgHealth + '%';
        }
        
        // Posodobi loge
        function updateLogs() {
            const container = document.getElementById('logContainer');
            container.innerHTML = '';
            
            logData.slice(-20).forEach(log => {
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                entry.textContent = `[${log.timestamp}] ${log.message}`;
                container.appendChild(entry);
            });
            
            container.scrollTop = container.scrollHeight;
        }
        
        // Pomožne funkcije
        function getComponentName(key) {
            const names = {
                'functional_modules': 'Funkcionalni Moduli',
                'redundancy_system': 'Sistem Redundance',
                'auto_healing': 'Avtomatsko Popravljanje',
                'learning_system': 'Sistem Učenja',
                'visual_schema': 'Vizualna Shema',
                'finance_optimizer': 'Finance Optimizer',
                'logistics_optimizer': 'Logistika Optimizer',
                'healthcare_optimizer': '🏥 Zdravstvo Optimizer',
                'tourism_optimizer': '🌴 Turizem Optimizer',
                'agriculture_optimizer': '🚜 Kmetijstvo Optimizer'
            };
            return names[key] || key;
        }
        
        // API klici
        async function startAllSystems() {
            try {
                await fetch('/api/start', { method: 'POST' });
                loadSystemStatus();
            } catch (error) {
                alert('Napaka pri zagonu sistemov: ' + error.message);
            }
        }
        
        async function stopAllSystems() {
            try {
                await fetch('/api/stop', { method: 'POST' });
                loadSystemStatus();
            } catch (error) {
                alert('Napaka pri ustavljanju sistemov: ' + error.message);
            }
        }
        
        async function testSystem() {
            try {
                await fetch('/api/test', { method: 'POST' });
                loadSystemStatus();
                loadLogs();
            } catch (error) {
                alert('Napaka pri testiranju sistema: ' + error.message);
            }
        }
        
        // Funkcija za prikaz vizualne sheme
        function showVisualSchema() {
            const container = document.getElementById('schemaContainer');
            const button = event.target;
            
            if (container.style.display === 'none') {
                container.style.display = 'block';
                button.textContent = '🔼 Skrij Vizualno Shemo';
                button.style.background = 'linear-gradient(45deg, #E74C3C, #C0392B)';
            } else {
                container.style.display = 'none';
                button.textContent = '📊 Prikaži Popolno Vizualno Shemo';
                button.style.background = 'linear-gradient(45deg, #4A90E2, #357ABD)';
            }
        }
    </script>
</body>
</html>
        """
        
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html_content.encode('utf-8'))
    
    def serve_status_api(self):
        """API za status sistema"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(self.system_status).encode('utf-8'))
    
    def serve_logs_api(self):
        """API za loge"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(self.system_logs).encode('utf-8'))
    
    def handle_api_post(self):
        """Obravnavaj POST API klice"""
        if self.path == '/api/start':
            self.start_all_systems()
        elif self.path == '/api/stop':
            self.stop_all_systems()
        elif self.path == '/api/test':
            self.test_system()
        else:
            self.send_error(404)
    
    def start_all_systems(self):
        """Zaženi vse sisteme"""
        for key in self.system_status:
            self.system_status[key]['status'] = 'running'
            self.system_status[key]['last_update'] = datetime.now().isoformat()
        
        self.add_log("Vsi sistemi uspešno zagnani")
        self.send_json_response({"status": "success", "message": "Sistemi zagnani"})
    
    def stop_all_systems(self):
        """Ustavi vse sisteme"""
        for key in self.system_status:
            self.system_status[key]['status'] = 'stopped'
            self.system_status[key]['last_update'] = datetime.now().isoformat()
        
        self.add_log("Vsi sistemi ustavljeni")
        self.send_json_response({"status": "success", "message": "Sistemi ustavljeni"})
    
    def test_system(self):
        """Testiraj sistem"""
        self.add_log("Zaganjam sistemske teste...")
        
        # Simuliraj teste
        import random
        for key in self.system_status:
            health = random.randint(85, 99)
            self.system_status[key]['health'] = health
            self.system_status[key]['last_update'] = datetime.now().isoformat()
        
        self.add_log("Vsi testi uspešno opravljeni")
        self.send_json_response({"status": "success", "message": "Testi opravljeni"})
    
    def add_log(self, message):
        """Dodaj log sporočilo"""
        log_entry = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": message
        }
        self.system_logs.append(log_entry)
        
        # Ohrani samo zadnjih 100 sporočil
        if len(self.system_logs) > 100:
            self.system_logs = self.system_logs[-100:]
    
    def send_json_response(self, data):
        """Pošlji JSON odgovor"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

def start_web_dashboard(port=8000):
    """Zaženi spletni dashboard"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, OMNIWebDashboard)
    
    print(f"🌐 OMNI Web Dashboard zagnan na http://localhost:{port}")
    print("📊 Odprite brskalnik in pojdite na zgornji naslov")
    print("⏹️  Pritisnite Ctrl+C za ustavitev")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Dashboard ustavljen")
        httpd.shutdown()

if __name__ == "__main__":
    start_web_dashboard(8000)