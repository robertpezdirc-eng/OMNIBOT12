"""
Thea Web Interface - Spletni vmesnik za Thea Queue System
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_socketio import SocketIO, emit
import asyncio
import json
from datetime import datetime
import os
import sys

# Dodaj pot do thea_queue_system
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from thea_queue_system import thea_system, add_prompt, merge_all, get_status, clear_all

app = Flask(__name__)
app.config['SECRET_KEY'] = 'thea_secret_key_2024'
socketio = SocketIO(app, cors_allowed_origins="*")

# Globalne spremenljivke
active_connections = 0

@app.route('/')
def index():
    """Glavna stran Thea vmesnika"""
    return render_template('thea_interface.html')

@app.route('/api/status')
def api_status():
    """API endpoint za status queue"""
    try:
        status = get_status()
        return jsonify({
            "success": True,
            "data": status
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/add_prompt', methods=['POST'])
def api_add_prompt():
    """API endpoint za dodajanje prompta"""
    try:
        data = request.get_json()
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({
                "success": False,
                "error": "Vsebina prompta je obvezna"
            }), 400
        
        metadata = data.get('metadata', {})
        prompt_id = add_prompt(content, metadata)
        
        # Pošlji posodobitev vsem povezanim odjemalcem
        socketio.emit('queue_updated', get_status())
        
        return jsonify({
            "success": True,
            "data": {
                "prompt_id": prompt_id,
                "message": "Prompt uspešno dodan v queue"
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/merge_all', methods=['POST'])
def api_merge_all():
    """API endpoint za združevanje vseh promptov"""
    try:
        # Zaženi async funkcijo v sync kontekstu
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            results = loop.run_until_complete(merge_all())
            
            # Pošlji posodobitev vsem povezanim odjemalcem
            socketio.emit('merge_completed', {
                "results": results,
                "status": get_status()
            })
            
            return jsonify({
                "success": True,
                "data": results
            })
            
        finally:
            loop.close()
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/clear_queue', methods=['POST'])
def api_clear_queue():
    """API endpoint za čiščenje queue"""
    try:
        clear_all()
        
        # Pošlji posodobitev vsem povezanim odjemalcem
        socketio.emit('queue_cleared', get_status())
        
        return jsonify({
            "success": True,
            "data": {
                "message": "Queue uspešno počiščen"
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/export_results')
def api_export_results():
    """API endpoint za izvoz rezultatov"""
    try:
        filename = f"thea_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = thea_system.export_results(filename)
        
        return jsonify({
            "success": True,
            "data": {
                "filename": filename,
                "filepath": filepath,
                "message": "Rezultati uspešno izvoženi"
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/queue_details')
def api_queue_details():
    """API endpoint za podrobnosti queue"""
    try:
        queue_data = []
        for prompt in thea_system.queue:
            queue_data.append({
                "id": prompt.id,
                "content": prompt.content[:100] + "..." if len(prompt.content) > 100 else prompt.content,
                "status": prompt.status.value,
                "timestamp": prompt.timestamp.isoformat(),
                "has_result": prompt.result is not None,
                "has_error": prompt.error is not None
            })
        
        return jsonify({
            "success": True,
            "data": queue_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# WebSocket dogodki
@socketio.on('connect')
def handle_connect():
    """Obravnava novo WebSocket povezavo"""
    global active_connections
    active_connections += 1
    
    # Pošlji trenutni status novemu odjemalcu
    emit('status_update', {
        "queue_status": get_status(),
        "active_connections": active_connections
    })
    
    print(f"Nova povezava. Aktivnih povezav: {active_connections}")

@socketio.on('disconnect')
def handle_disconnect():
    """Obravnava prekinitev WebSocket povezave"""
    global active_connections
    active_connections = max(0, active_connections - 1)
    print(f"Povezava prekinjena. Aktivnih povezav: {active_connections}")

@socketio.on('request_status')
def handle_status_request():
    """Obravnava zahtevo za status"""
    emit('status_update', {
        "queue_status": get_status(),
        "active_connections": active_connections
    })

# Ustvari HTML template
def create_html_template():
    """Ustvari HTML template za Thea vmesnik"""
    template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
    os.makedirs(template_dir, exist_ok=True)
    
    html_content = '''<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thea Queue System</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .main-content {
            padding: 30px;
        }
        
        .status-panel {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
            border-left: 5px solid #4facfe;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 15px;
        }
        
        .status-item {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .status-number {
            font-size: 2em;
            font-weight: bold;
            color: #4facfe;
        }
        
        .status-label {
            color: #666;
            margin-top: 5px;
        }
        
        .input-section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 30px;
        }
        
        .input-group {
            margin-bottom: 20px;
        }
        
        .input-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        .input-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 16px;
            resize: vertical;
            min-height: 100px;
        }
        
        .input-group textarea:focus {
            outline: none;
            border-color: #4facfe;
        }
        
        .button-group {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 12px 25px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
        }
        
        .btn-success {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            color: white;
        }
        
        .btn-warning {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            color: white;
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%);
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .queue-section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 30px;
        }
        
        .queue-item {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #4facfe;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .queue-item.processing {
            border-left-color: #ffa500;
            animation: pulse 2s infinite;
        }
        
        .queue-item.done {
            border-left-color: #28a745;
        }
        
        .queue-item.error {
            border-left-color: #dc3545;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        
        .results-section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 30px;
        }
        
        .results-content {
            background: white;
            border-radius: 8px;
            padding: 20px;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .connection-status {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 20px;
            color: white;
            font-weight: 600;
            z-index: 1000;
        }
        
        .connection-status.connected {
            background: #28a745;
        }
        
        .connection-status.disconnected {
            background: #dc3545;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4facfe;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
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
    </style>
</head>
<body>
    <div class="connection-status" id="connectionStatus">Povezovanje...</div>
    
    <div class="container">
        <div class="header">
            <h1>🤖 Thea Queue System</h1>
            <p>Queue + Merge on Demand - Inteligentno upravljanje promptov</p>
        </div>
        
        <div class="main-content">
            <!-- Status Panel -->
            <div class="status-panel">
                <h3>📊 Status Queue</h3>
                <div class="status-grid" id="statusGrid">
                    <div class="status-item">
                        <div class="status-number" id="totalPrompts">0</div>
                        <div class="status-label">Skupaj promptov</div>
                    </div>
                    <div class="status-item">
                        <div class="status-number" id="queuedPrompts">0</div>
                        <div class="status-label">V čakalni vrsti</div>
                    </div>
                    <div class="status-item">
                        <div class="status-number" id="processingPrompts">0</div>
                        <div class="status-label">V obdelavi</div>
                    </div>
                    <div class="status-item">
                        <div class="status-number" id="donePrompts">0</div>
                        <div class="status-label">Dokončano</div>
                    </div>
                    <div class="status-item">
                        <div class="status-number" id="activeConnections">0</div>
                        <div class="status-label">Aktivne povezave</div>
                    </div>
                </div>
            </div>
            
            <!-- Input Section -->
            <div class="input-section">
                <h3>➕ Dodaj nov prompt</h3>
                <div class="input-group">
                    <label for="promptContent">Vsebina prompta:</label>
                    <textarea id="promptContent" placeholder="Vnesite vaš prompt tukaj..."></textarea>
                </div>
                <div class="button-group">
                    <button class="btn btn-primary" onclick="addPrompt()">Dodaj v Queue</button>
                    <button class="btn btn-success" onclick="mergeAll()" id="mergeBtn">🔄 Združi vse skupaj</button>
                    <button class="btn btn-warning" onclick="exportResults()">💾 Izvozi rezultate</button>
                    <button class="btn btn-danger" onclick="clearQueue()">🗑️ Počisti Queue</button>
                </div>
            </div>
            
            <!-- Loading -->
            <div class="loading" id="loadingDiv">
                <div class="spinner"></div>
                <p>Obdelavam prompte...</p>
            </div>
            
            <!-- Alerts -->
            <div id="alertContainer"></div>
            
            <!-- Queue Details -->
            <div class="queue-section">
                <h3>📋 Podrobnosti Queue</h3>
                <div id="queueDetails">
                    <p>Ni promptov v queue.</p>
                </div>
            </div>
            
            <!-- Results Section -->
            <div class="results-section" id="resultsSection" style="display: none;">
                <h3>📊 Rezultati združevanja</h3>
                <div class="results-content" id="resultsContent"></div>
            </div>
        </div>
    </div>
    
    <script>
        // WebSocket povezava
        const socket = io();
        
        // Elementi DOM
        const connectionStatus = document.getElementById('connectionStatus');
        const promptContent = document.getElementById('promptContent');
        const mergeBtn = document.getElementById('mergeBtn');
        const loadingDiv = document.getElementById('loadingDiv');
        const alertContainer = document.getElementById('alertContainer');
        const queueDetails = document.getElementById('queueDetails');
        const resultsSection = document.getElementById('resultsSection');
        const resultsContent = document.getElementById('resultsContent');
        
        // WebSocket dogodki
        socket.on('connect', function() {
            connectionStatus.textContent = '🟢 Povezano';
            connectionStatus.className = 'connection-status connected';
            socket.emit('request_status');
        });
        
        socket.on('disconnect', function() {
            connectionStatus.textContent = '🔴 Prekinjeno';
            connectionStatus.className = 'connection-status disconnected';
        });
        
        socket.on('status_update', function(data) {
            updateStatus(data.queue_status);
            document.getElementById('activeConnections').textContent = data.active_connections || 0;
        });
        
        socket.on('queue_updated', function(status) {
            updateStatus(status);
            showAlert('Prompt uspešno dodan v queue!', 'success');
            loadQueueDetails();
        });
        
        socket.on('merge_completed', function(data) {
            updateStatus(data.status);
            showResults(data.results);
            showAlert('Vsi prompti uspešno združeni!', 'success');
            loadingDiv.style.display = 'none';
            mergeBtn.disabled = false;
            loadQueueDetails();
        });
        
        socket.on('queue_cleared', function(status) {
            updateStatus(status);
            showAlert('Queue uspešno počiščen!', 'success');
            loadQueueDetails();
            resultsSection.style.display = 'none';
        });
        
        // Funkcije
        function updateStatus(status) {
            document.getElementById('totalPrompts').textContent = status.total_prompts || 0;
            document.getElementById('queuedPrompts').textContent = status.queued || 0;
            document.getElementById('processingPrompts').textContent = status.processing || 0;
            document.getElementById('donePrompts').textContent = status.done || 0;
        }
        
        function showAlert(message, type) {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.textContent = message;
            alertContainer.appendChild(alert);
            
            setTimeout(() => {
                alert.remove();
            }, 5000);
        }
        
        function showResults(results) {
            resultsContent.textContent = results.summary;
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        async function addPrompt() {
            const content = promptContent.value.trim();
            if (!content) {
                showAlert('Prosimo, vnesite vsebino prompta.', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/add_prompt', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: content })
                });
                
                const data = await response.json();
                if (data.success) {
                    promptContent.value = '';
                } else {
                    showAlert(data.error, 'error');
                }
            } catch (error) {
                showAlert('Napaka pri dodajanju prompta: ' + error.message, 'error');
            }
        }
        
        async function mergeAll() {
            mergeBtn.disabled = true;
            loadingDiv.style.display = 'block';
            
            try {
                const response = await fetch('/api/merge_all', {
                    method: 'POST'
                });
                
                const data = await response.json();
                if (!data.success) {
                    showAlert(data.error, 'error');
                    loadingDiv.style.display = 'none';
                    mergeBtn.disabled = false;
                }
            } catch (error) {
                showAlert('Napaka pri združevanju: ' + error.message, 'error');
                loadingDiv.style.display = 'none';
                mergeBtn.disabled = false;
            }
        }
        
        async function clearQueue() {
            if (!confirm('Ali ste prepričani, da želite počistiti queue?')) {
                return;
            }
            
            try {
                const response = await fetch('/api/clear_queue', {
                    method: 'POST'
                });
                
                const data = await response.json();
                if (!data.success) {
                    showAlert(data.error, 'error');
                }
            } catch (error) {
                showAlert('Napaka pri čiščenju queue: ' + error.message, 'error');
            }
        }
        
        async function exportResults() {
            try {
                const response = await fetch('/api/export_results');
                const data = await response.json();
                
                if (data.success) {
                    showAlert(`Rezultati izvoženi v: ${data.data.filename}`, 'success');
                } else {
                    showAlert(data.error, 'error');
                }
            } catch (error) {
                showAlert('Napaka pri izvozu: ' + error.message, 'error');
            }
        }
        
        async function loadQueueDetails() {
            try {
                const response = await fetch('/api/queue_details');
                const data = await response.json();
                
                if (data.success) {
                    const details = data.data;
                    if (details.length === 0) {
                        queueDetails.innerHTML = '<p>Ni promptov v queue.</p>';
                    } else {
                        queueDetails.innerHTML = details.map(prompt => `
                            <div class="queue-item ${prompt.status}">
                                <strong>ID:</strong> ${prompt.id}<br>
                                <strong>Status:</strong> ${prompt.status}<br>
                                <strong>Vsebina:</strong> ${prompt.content}<br>
                                <strong>Čas:</strong> ${new Date(prompt.timestamp).toLocaleString()}
                            </div>
                        `).join('');
                    }
                }
            } catch (error) {
                console.error('Napaka pri nalaganju podrobnosti queue:', error);
            }
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                addPrompt();
            }
        });
        
        // Inicializacija
        document.addEventListener('DOMContentLoaded', function() {
            loadQueueDetails();
            
            // Periodično osveževanje
            setInterval(() => {
                socket.emit('request_status');
                loadQueueDetails();
            }, 5000);
        });
    </script>
</body>
</html>'''
    
    template_path = os.path.join(template_dir, 'thea_interface.html')
    with open(template_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return template_path

if __name__ == '__main__':
    # Ustvari HTML template
    create_html_template()
    
    print("🤖 Thea Web Interface se zaganja...")
    print("📱 Dostopen na: http://localhost:5001")
    print("🔄 WebSocket podpora omogočena")
    
    # Zaženi Flask aplikacijo
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)