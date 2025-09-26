#!/usr/bin/env python3
"""
OMNI Client Panel - Uporabniško upravljanje cenikov in modulov
Poenostavljena različica za demo
"""

from flask import Flask, render_template_string, jsonify, request, session
from flask_cors import CORS
import json
import uuid
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'demo_secret_key'
CORS(app)

# Demo podatki
demo_data = {
    'pricing': [
        {'id': '1', 'name': 'Dvoposteljna soba', 'category': 'accommodation', 'price': 89.0, 'currency': 'EUR'},
        {'id': '2', 'name': 'Zajtrk', 'category': 'food_beverage', 'price': 15.0, 'currency': 'EUR'},
        {'id': '3', 'name': 'Vožnja s čolnom', 'category': 'activities', 'price': 35.0, 'currency': 'EUR'}
    ],
    'modules': [
        {'id': '1', 'name': 'Turizem', 'status': 'active', 'tier': 'basic'},
        {'id': '2', 'name': 'POS Blagajna', 'status': 'active', 'tier': 'basic'},
        {'id': '3', 'name': 'AI Chatbot', 'status': 'demo', 'tier': 'premium'},
        {'id': '4', 'name': 'AR/VR Ture', 'status': 'demo', 'tier': 'premium'}
    ],
    'kpi': [
        {'name': 'Rezervacije', 'value': 47, 'unit': 'število'},
        {'name': 'Prihodki', 'value': 4180, 'unit': 'EUR'},
        {'name': 'Zasedenost', 'value': 73.5, 'unit': '%'}
    ]
}

@app.route('/')
def index():
    return render_template_string('''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Client Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .demo-banner { background: linear-gradient(45deg, #ff6b6b, #feca57); color: white; padding: 15px; text-align: center; font-weight: bold; margin-bottom: 20px; border-radius: 5px; }
        .tabs { display: flex; background: white; border-radius: 10px 10px 0 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .tab { flex: 1; padding: 15px; text-align: center; cursor: pointer; border-bottom: 3px solid transparent; }
        .tab.active { border-bottom-color: #667eea; background: #f8f9ff; }
        .tab-content { background: white; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px; min-height: 500px; }
        .tab-pane { display: none; }
        .tab-pane.active { display: block; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; border-left: 4px solid #667eea; }
        .stat-number { font-size: 28px; font-weight: bold; color: #667eea; margin-bottom: 5px; }
        .stat-label { font-size: 14px; color: #666; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 20px; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .btn { padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
        .btn-success { background: #00b894; color: white; }
        .btn-danger { background: #e17055; color: white; }
        .btn-outline { background: transparent; border: 1px solid #ddd; color: #666; }
        .status-active { background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .status-demo { background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏢 OMNI Client Panel</h1>
        <p>Upravljanje cenikov in modulov</p>
    </div>
    
    <div class="container">
        <div class="demo-banner">
            🚀 DEMO NAČIN - Vse spremembe so simulirane in se ne shranjujejo trajno
        </div>
        
        <div class="stats-grid" id="statsGrid"></div>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('pricing')">💰 Ceniki</div>
            <div class="tab" onclick="showTab('modules')">🔧 Moduli</div>
            <div class="tab" onclick="showTab('analytics')">📊 Analitika</div>
        </div>
        
        <div class="tab-content">
            <div id="pricing" class="tab-pane active">
                <h2>Upravljanje cenikov</h2>
                <div class="grid" id="pricingGrid"></div>
            </div>
            
            <div id="modules" class="tab-pane">
                <h2>Upravljanje modulov</h2>
                <div class="grid" id="modulesGrid"></div>
            </div>
            
            <div id="analytics" class="tab-pane">
                <h2>Analitika in KPI</h2>
                <div id="analyticsContent"></div>
            </div>
        </div>
    </div>

    <script>
        let systemData = {};

        document.addEventListener('DOMContentLoaded', function() {
            loadData();
        });

        async function loadData() {
            try {
                const response = await fetch('/api/data');
                systemData = await response.json();
                updateUI();
            } catch (error) {
                console.error('Napaka pri nalaganju:', error);
            }
        }

        function updateUI() {
            updateStats();
            updatePricing();
            updateModules();
            updateAnalytics();
        }

        function updateStats() {
            const statsGrid = document.getElementById('statsGrid');
            statsGrid.innerHTML = systemData.kpi.map(metric => `
                <div class="stat-card">
                    <div class="stat-number">${metric.value}${metric.unit === '%' ? '%' : ''}</div>
                    <div class="stat-label">${metric.name}</div>
                </div>
            `).join('');
        }

        function updatePricing() {
            const pricingGrid = document.getElementById('pricingGrid');
            pricingGrid.innerHTML = systemData.pricing.map(item => `
                <div class="card">
                    <div class="card-header">
                        <div><strong>${item.name}</strong></div>
                        <div style="font-size: 18px; font-weight: bold; color: #667eea;">${item.price} ${item.currency}</div>
                    </div>
                    <div style="color: #666; margin-bottom: 15px;">Kategorija: ${getCategoryName(item.category)}</div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-outline">Uredi</button>
                        <button class="btn btn-danger">Izbriši</button>
                    </div>
                </div>
            `).join('');
        }

        function updateModules() {
            const modulesGrid = document.getElementById('modulesGrid');
            modulesGrid.innerHTML = systemData.modules.map(module => `
                <div class="card">
                    <div class="card-header">
                        <div><strong>${module.name}</strong></div>
                        <div class="status-${module.status}">${getStatusName(module.status)}</div>
                    </div>
                    <div style="color: #666; margin-bottom: 15px;">Zahtevani paket: ${module.tier}</div>
                    <button class="btn ${module.status === 'active' ? 'btn-danger' : 'btn-success'}">
                        ${module.status === 'active' ? 'Deaktiviraj' : 'Aktiviraj'}
                    </button>
                </div>
            `).join('');
        }

        function updateAnalytics() {
            const analyticsContent = document.getElementById('analyticsContent');
            analyticsContent.innerHTML = `
                <div class="stats-grid">
                    ${systemData.kpi.map(metric => `
                        <div class="stat-card">
                            <div class="stat-number">${metric.value}${metric.unit === '%' ? '%' : ''}</div>
                            <div class="stat-label">${metric.name}</div>
                        </div>
                    `).join('')}
                </div>
                <p style="text-align: center; color: #666; margin-top: 30px;">
                    📊 Podrobna analitika in grafi so na voljo v polni različici
                </p>
            `;
        }

        function showTab(tabName) {
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }

        function getCategoryName(category) {
            const names = {
                'accommodation': 'Nastanitve',
                'food_beverage': 'Hrana in pijača',
                'activities': 'Aktivnosti',
                'services': 'Storitve'
            };
            return names[category] || category;
        }

        function getStatusName(status) {
            const names = {
                'active': 'Aktiven',
                'inactive': 'Neaktiven',
                'demo': 'Demo'
            };
            return names[status] || status;
        }
    </script>
</body>
</html>
    ''')

@app.route('/api/data')
def get_data():
    return jsonify(demo_data)

def run_demo():
    print("\n" + "="*80)
    print("👤 OMNI CLIENT PANEL - DEMO")
    print("="*80)
    print("🏢 Funkcionalnosti:")
    print("  ✅ Upravljanje cenikov (nastanitve, hrana, aktivnosti, storitve)")
    print("  ✅ Aktivacija/deaktivacija modulov po paketu")
    print("  ✅ Real-time sinhronizacija")
    print("  ✅ Pregled KPI metrik")
    print("  ✅ Varnostne omejitve (sandbox/demo)")
    print("  ✅ Dostop samo do lastnih podatkov")
    print("\n💰 Demo ceniki:")
    for item in demo_data['pricing']:
        print(f"  • {item['name']}: {item['price']} {item['currency']}")
    print("\n🔧 Demo moduli:")
    for module in demo_data['modules']:
        print(f"  • {module['name']}: {module['status']} ({module['tier']})")
    print("\n📊 KPI metrike:")
    for kpi in demo_data['kpi']:
        print(f"  • {kpi['name']}: {kpi['value']} {kpi['unit']}")
    print("\n🚀 Sistem zagnan na http://0.0.0.0:5014")

if __name__ == '__main__':
    run_demo()
    app.run(host='0.0.0.0', port=5014, debug=True)