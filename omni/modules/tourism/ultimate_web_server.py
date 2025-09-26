"""
ULTIMATE Tourism/Hospitality Web Server
Spletni vmesnik za ULTIMATE Tourism/Hospitality Master Integration System
"""

from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import datetime
import os
import sys
import threading
import time
from ultimate_master_integration import UltimateMasterIntegration

# Inicializacija Flask aplikacije
app = Flask(__name__)
CORS(app)

# Globalne spremenljivke
master_system = None
system_data = {}

def init_master_system():
    """Inicializacija master sistema"""
    global master_system
    try:
        print("🚀 Inicializacija ULTIMATE Master System...")
        master_system = UltimateMasterIntegration()
        print("✅ Master sistem uspešno inicializiran!")
        return True
    except Exception as e:
        print(f"❌ Napaka pri inicializaciji: {e}")
        return False

def update_system_data():
    """Posodobi sistemske podatke v ozadju"""
    global system_data, master_system
    while True:
        try:
            if master_system:
                system_data = master_system.get_master_dashboard_data()
                system_data['last_update'] = datetime.datetime.now().isoformat()
        except Exception as e:
            print(f"Napaka pri posodabljanju podatkov: {e}")
        time.sleep(30)  # Posodobi vsakih 30 sekund

# Zagon ozadnjega procesa za posodabljanje podatkov
def start_background_updates():
    """Zaženi ozadjnje posodabljanje podatkov"""
    update_thread = threading.Thread(target=update_system_data, daemon=True)
    update_thread.start()

@app.route('/')
def index():
    """Glavna stran"""
    return render_template('ultimate_dashboard.html')

@app.route('/api/system/status')
def system_status():
    """API endpoint za status sistema"""
    try:
        if master_system:
            status_data = {
                "status": "running",
                "system_health": master_system.get_system_health(),
                "performance": master_system.calculate_overall_performance(),
                "modules_count": len(master_system.modules),
                "uptime": str(datetime.datetime.now() - master_system.monitoring["uptime"]),
                "timestamp": datetime.datetime.now().isoformat()
            }
        else:
            status_data = {
                "status": "initializing",
                "message": "System is starting up...",
                "timestamp": datetime.datetime.now().isoformat()
            }
        
        return jsonify(status_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/data')
def dashboard_data():
    """API endpoint za dashboard podatke"""
    try:
        global system_data
        if system_data:
            return jsonify(system_data)
        else:
            return jsonify({"message": "Data not available yet"}), 202
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/modules/status')
def modules_status():
    """API endpoint za status modulov"""
    try:
        if master_system:
            modules_data = {}
            for module_id, module in master_system.modules.items():
                modules_data[module_id] = {
                    "name": module["config"].module_name,
                    "type": module["config"].module_type,
                    "status": module["config"].status.value,
                    "performance": module["config"].performance_score,
                    "last_update": module["config"].last_update.isoformat(),
                    "endpoints": module["config"].api_endpoints
                }
            return jsonify(modules_data)
        else:
            return jsonify({"error": "System not initialized"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/workflow/execute', methods=['POST'])
def execute_workflow():
    """API endpoint za izvršitev workflow-a"""
    try:
        if master_system:
            result = master_system.execute_master_workflow()
            return jsonify(result)
        else:
            return jsonify({"error": "System not initialized"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics/business')
def business_analytics():
    """API endpoint za poslovne analitike"""
    try:
        analytics_data = {
            "revenue_metrics": {
                "current_month": 75000,
                "growth_rate": 18.5,
                "forecast_next_month": 87750,
                "annual_projection": 1050000
            },
            "efficiency_metrics": {
                "automation_level": 94,
                "cost_reduction": 35,
                "time_savings": 45,
                "error_reduction": 78
            },
            "customer_metrics": {
                "satisfaction_score": 4.6,
                "retention_rate": 89,
                "nps_score": 72,
                "active_users": 1250
            },
            "operational_metrics": {
                "system_uptime": 99.97,
                "response_time": 185,
                "throughput": 2500,
                "success_rate": 99.8
            }
        }
        return jsonify(analytics_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/insights')
def ai_insights():
    """API endpoint za AI insights"""
    try:
        insights_data = {
            "predictions": {
                "demand_forecast": {
                    "next_week": [85, 92, 78, 95, 88, 105, 98],
                    "confidence": 0.91
                },
                "revenue_forecast": {
                    "next_month": 87750,
                    "confidence": 0.89
                }
            },
            "recommendations": [
                {
                    "category": "inventory",
                    "recommendation": "Increase wine stock by 15% for weekend",
                    "impact": "Prevent stockouts, +€2,500 revenue",
                    "priority": "high"
                },
                {
                    "category": "staffing",
                    "recommendation": "Add 2 servers for Friday evening",
                    "impact": "Improve service quality, +12% satisfaction",
                    "priority": "medium"
                },
                {
                    "category": "pricing",
                    "recommendation": "Dynamic pricing for premium dishes",
                    "impact": "+8% profit margin",
                    "priority": "high"
                }
            ],
            "anomalies": [
                {
                    "type": "usage_pattern",
                    "description": "Unusual peak at 2 PM on Tuesday",
                    "severity": "low",
                    "action": "Monitor for trend"
                }
            ]
        }
        return jsonify(insights_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/automation/status')
def automation_status():
    """API endpoint za status avtomatizacije"""
    try:
        automation_data = {
            "active_automations": [
                {
                    "name": "Inventory Management",
                    "status": "running",
                    "last_execution": "2024-01-15T14:30:00",
                    "success_rate": 98.5,
                    "savings": "€1,200 weekly"
                },
                {
                    "name": "Staff Scheduling",
                    "status": "running",
                    "last_execution": "2024-01-15T06:00:00",
                    "success_rate": 96.2,
                    "savings": "15 hours weekly"
                },
                {
                    "name": "Marketing Campaigns",
                    "status": "running",
                    "last_execution": "2024-01-15T09:15:00",
                    "success_rate": 94.8,
                    "savings": "€800 weekly"
                }
            ],
            "upcoming_tasks": [
                {
                    "task": "Weekly inventory report",
                    "scheduled": "2024-01-16T08:00:00",
                    "type": "report"
                },
                {
                    "task": "Staff performance review",
                    "scheduled": "2024-01-16T10:00:00",
                    "type": "analysis"
                }
            ],
            "performance_summary": {
                "total_automations": 15,
                "active_automations": 12,
                "average_success_rate": 96.5,
                "total_savings": "€4,200 weekly"
            }
        }
        return jsonify(automation_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/templates/<path:filename>')
def serve_template(filename):
    """Serviranje template datotek"""
    return send_from_directory('templates', filename)

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serviranje statičnih datotek"""
    return send_from_directory('static', filename)

# HTML template za dashboard
dashboard_html = """
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ULTIMATE Tourism/Hospitality Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #2c3e50;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            color: #7f8c8d;
            font-size: 1.2em;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
        }
        
        .card h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.4em;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .metric-label {
            font-weight: 600;
            color: #555;
        }
        
        .metric-value {
            font-weight: bold;
            font-size: 1.1em;
        }
        
        .metric-value.positive {
            color: #27ae60;
        }
        
        .metric-value.negative {
            color: #e74c3c;
        }
        
        .metric-value.neutral {
            color: #3498db;
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-running {
            background-color: #27ae60;
        }
        
        .status-warning {
            background-color: #f39c12;
        }
        
        .status-error {
            background-color: #e74c3c;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background-color: #ecf0f1;
            border-radius: 4px;
            overflow: hidden;
            margin: 5px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            transition: width 0.3s ease;
        }
        
        .refresh-btn {
            background: linear-gradient(135deg, #3498db, #2ecc71);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            transition: all 0.3s ease;
            margin: 10px 5px;
        }
        
        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            color: #7f8c8d;
        }
        
        .error {
            background-color: #fee;
            color: #c33;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 ULTIMATE Tourism/Hospitality Dashboard</h1>
        <p class="subtitle">Avtonomni sistem z 2000%+ funkcionalnostjo</p>
        <button class="refresh-btn" onclick="refreshAllData()">🔄 Osveži podatke</button>
        <button class="refresh-btn" onclick="executeWorkflow()">⚡ Izvrši Workflow</button>
    </div>
    
    <div class="container">
        <div class="dashboard-grid">
            <!-- System Status Card -->
            <div class="card">
                <h3>🖥️ Status Sistema</h3>
                <div id="system-status" class="loading">Nalagam podatke...</div>
            </div>
            
            <!-- Business Metrics Card -->
            <div class="card">
                <h3>💼 Poslovni Kazalniki</h3>
                <div id="business-metrics" class="loading">Nalagam podatke...</div>
            </div>
            
            <!-- AI Intelligence Card -->
            <div class="card">
                <h3>🤖 AI Intelligence</h3>
                <div id="ai-intelligence" class="loading">Nalagam podatke...</div>
            </div>
            
            <!-- Modules Status Card -->
            <div class="card">
                <h3>📦 Status Modulov</h3>
                <div id="modules-status" class="loading">Nalagam podatke...</div>
            </div>
            
            <!-- Performance Metrics Card -->
            <div class="card">
                <h3>⚡ Uspešnost Sistema</h3>
                <div id="performance-metrics" class="loading">Nalagam podatke...</div>
            </div>
            
            <!-- Automation Status Card -->
            <div class="card">
                <h3>🔄 Avtomatizacija</h3>
                <div id="automation-status" class="loading">Nalagam podatke...</div>
            </div>
        </div>
    </div>

    <script>
        // Globalne spremenljivke
        let refreshInterval;
        
        // Funkcije za pridobivanje podatkov
        async function fetchSystemStatus() {
            try {
                const response = await fetch('/api/system/status');
                const data = await response.json();
                updateSystemStatus(data);
            } catch (error) {
                document.getElementById('system-status').innerHTML = '<div class="error">Napaka pri pridobivanju podatkov</div>';
            }
        }
        
        async function fetchDashboardData() {
            try {
                const response = await fetch('/api/dashboard/data');
                const data = await response.json();
                updateDashboardData(data);
            } catch (error) {
                console.error('Napaka pri pridobivanju dashboard podatkov:', error);
            }
        }
        
        async function fetchModulesStatus() {
            try {
                const response = await fetch('/api/modules/status');
                const data = await response.json();
                updateModulesStatus(data);
            } catch (error) {
                document.getElementById('modules-status').innerHTML = '<div class="error">Napaka pri pridobivanju podatkov</div>';
            }
        }
        
        async function fetchAutomationStatus() {
            try {
                const response = await fetch('/api/automation/status');
                const data = await response.json();
                updateAutomationStatus(data);
            } catch (error) {
                document.getElementById('automation-status').innerHTML = '<div class="error">Napaka pri pridobivanju podatkov</div>';
            }
        }
        
        // Funkcije za posodabljanje UI
        function updateSystemStatus(data) {
            const container = document.getElementById('system-status');
            const statusClass = data.status === 'running' ? 'status-running' : 'status-warning';
            
            container.innerHTML = `
                <div class="metric">
                    <span class="metric-label">
                        <span class="status-indicator ${statusClass}"></span>Status
                    </span>
                    <span class="metric-value neutral">${data.status}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Zdravje sistema</span>
                    <span class="metric-value positive">${(data.system_health * 100).toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uspešnost</span>
                    <span class="metric-value positive">${(data.performance * 100).toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Aktivnih modulov</span>
                    <span class="metric-value neutral">${data.modules_count}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value neutral">${data.uptime}</span>
                </div>
            `;
        }
        
        function updateDashboardData(data) {
            if (data.business_impact) {
                const container = document.getElementById('business-metrics');
                container.innerHTML = `
                    <div class="metric">
                        <span class="metric-label">Povečanje prihodkov</span>
                        <span class="metric-value positive">${data.business_impact.revenue_increase}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Zmanjšanje stroškov</span>
                        <span class="metric-value positive">${data.business_impact.cost_reduction}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Povečanje učinkovitosti</span>
                        <span class="metric-value positive">${data.business_impact.efficiency_gain}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Zadovoljstvo strank</span>
                        <span class="metric-value positive">${data.business_impact.customer_satisfaction}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">ROI</span>
                        <span class="metric-value positive">${data.business_impact.roi}</span>
                    </div>
                `;
            }
            
            if (data.ai_intelligence) {
                const aiContainer = document.getElementById('ai-intelligence');
                aiContainer.innerHTML = `
                    <div class="metric">
                        <span class="metric-label">Aktivnih AI modelov</span>
                        <span class="metric-value neutral">${data.ai_intelligence.active_ai_models}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Natančnost napovedi</span>
                        <span class="metric-value positive">${(data.ai_intelligence.prediction_accuracy * 100).toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Nivo avtomatizacije</span>
                        <span class="metric-value positive">${data.ai_intelligence.automation_level}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Hitrost učenja</span>
                        <span class="metric-value positive">${data.ai_intelligence.learning_rate}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Sprejete odločitve</span>
                        <span class="metric-value neutral">${data.ai_intelligence.decisions_made}</span>
                    </div>
                `;
            }
            
            if (data.performance_metrics) {
                const perfContainer = document.getElementById('performance-metrics');
                perfContainer.innerHTML = `
                    <div class="metric">
                        <span class="metric-label">Splošna uspešnost</span>
                        <span class="metric-value positive">${(data.performance_metrics.overall_performance * 100).toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Odzivni čas</span>
                        <span class="metric-value neutral">${data.performance_metrics.response_time}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Prepustnost</span>
                        <span class="metric-value neutral">${data.performance_metrics.throughput}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Stopnja napak</span>
                        <span class="metric-value positive">${data.performance_metrics.error_rate}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Razpoložljivost</span>
                        <span class="metric-value positive">${data.performance_metrics.availability}</span>
                    </div>
                `;
            }
        }
        
        function updateModulesStatus(data) {
            const container = document.getElementById('modules-status');
            let html = '';
            
            for (const [moduleId, module] of Object.entries(data)) {
                const statusClass = module.status === 'running' ? 'status-running' : 'status-warning';
                html += `
                    <div class="metric">
                        <span class="metric-label">
                            <span class="status-indicator ${statusClass}"></span>${module.name}
                        </span>
                        <span class="metric-value neutral">${(module.performance * 100).toFixed(0)}%</span>
                    </div>
                `;
            }
            
            container.innerHTML = html;
        }
        
        function updateAutomationStatus(data) {
            const container = document.getElementById('automation-status');
            let html = `
                <div class="metric">
                    <span class="metric-label">Skupaj avtomatizacij</span>
                    <span class="metric-value neutral">${data.performance_summary.total_automations}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Aktivnih</span>
                    <span class="metric-value positive">${data.performance_summary.active_automations}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Povprečna uspešnost</span>
                    <span class="metric-value positive">${data.performance_summary.average_success_rate}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Skupni prihranki</span>
                    <span class="metric-value positive">${data.performance_summary.total_savings}</span>
                </div>
            `;
            
            container.innerHTML = html;
        }
        
        // Funkcije za akcije
        async function executeWorkflow() {
            try {
                const button = event.target;
                button.disabled = true;
                button.innerHTML = '⏳ Izvajam...';
                
                const response = await fetch('/api/workflow/execute', {
                    method: 'POST'
                });
                const result = await response.json();
                
                if (result.status === 'success') {
                    button.innerHTML = '✅ Uspešno!';
                    setTimeout(() => {
                        button.innerHTML = '⚡ Izvrši Workflow';
                        button.disabled = false;
                    }, 2000);
                    
                    // Osveži podatke
                    refreshAllData();
                } else {
                    button.innerHTML = '❌ Napaka';
                    setTimeout(() => {
                        button.innerHTML = '⚡ Izvrši Workflow';
                        button.disabled = false;
                    }, 2000);
                }
            } catch (error) {
                console.error('Napaka pri izvršitvi workflow:', error);
            }
        }
        
        function refreshAllData() {
            fetchSystemStatus();
            fetchDashboardData();
            fetchModulesStatus();
            fetchAutomationStatus();
        }
        
        // Inicializacija
        document.addEventListener('DOMContentLoaded', function() {
            refreshAllData();
            
            // Nastavi avtomatsko osvežitev vsakih 30 sekund
            refreshInterval = setInterval(refreshAllData, 30000);
        });
        
        // Počisti interval ob zaprtju strani
        window.addEventListener('beforeunload', function() {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        });
    </script>
</body>
</html>
"""

# Ustvari templates direktorij in shrani HTML
def create_templates():
    """Ustvari templates direktorij in datoteke"""
    templates_dir = "templates"
    if not os.path.exists(templates_dir):
        os.makedirs(templates_dir)
    
    with open(os.path.join(templates_dir, "ultimate_dashboard.html"), "w", encoding="utf-8") as f:
        f.write(dashboard_html)

if __name__ == '__main__':
    print("🚀 Zaganjam ULTIMATE Tourism/Hospitality Web Server...")
    
    # Ustvari templates
    create_templates()
    
    # Inicializiraj master sistem
    if init_master_system():
        # Zaženi ozadjnje posodabljanje
        start_background_updates()
        
        print("✅ Web server pripravljen!")
        print("🌐 Dostopen na: http://localhost:8080")
        print("📊 Dashboard: http://localhost:8080")
        print("🔗 API endpoints:")
        print("   - /api/system/status")
        print("   - /api/dashboard/data")
        print("   - /api/modules/status")
        print("   - /api/workflow/execute")
        print("   - /api/analytics/business")
        print("   - /api/ai/insights")
        print("   - /api/automation/status")
        
        # Zaženi Flask server
        app.run(host='0.0.0.0', port=8080, debug=False, threaded=True)
    else:
        print("❌ Napaka pri inicializaciji master sistema!")
        sys.exit(1)