#!/usr/bin/env python3
"""
Omni-APP Enhanced API Server
Backend API za podporo enhanced dashboarda z real-time podatki
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import time
import random
from datetime import datetime
import threading
import sqlite3
import os

app = Flask(__name__)
CORS(app)  # Omogoči CORS za frontend

# Globalne spremenljivke
module_status = {}
system_metrics = {
    'total_modules': 17,
    'active_modules': 17,
    'system_uptime': time.time(),
    'total_requests': 0,
    'last_update': datetime.now().isoformat()
}

# Definicija modulov
MODULES = {
    'global': {
        'name': 'Global Optimizer',
        'type': 'core',
        'description': 'Centralni nadzorni sistem za koordinacijo vseh modulov',
        'features': ['AI Koordinacija', 'Samoučenje', 'Optimizacija', 'Monitoring'],
        'dependencies': []
    },
    'finance': {
        'name': 'Finančni Modul',
        'type': 'business',
        'description': 'Upravljanje financ, proračunov in investicij',
        'features': ['Proračuni', 'Investicije', 'Analitika', 'Poročila'],
        'dependencies': ['global']
    },
    'logistics': {
        'name': 'Logistični Modul', 
        'type': 'business',
        'description': 'Optimizacija transporta in dobavnih verig',
        'features': ['Transport', 'Skladišče', 'Dobavne verige', 'Optimizacija poti'],
        'dependencies': ['global']
    },
    'healthcare': {
        'name': 'Zdravstveni Modul',
        'type': 'specialized',
        'description': 'Zdravstveno spremljanje in diagnostika',
        'features': ['Diagnostika', 'Monitoring', 'Wellness', 'Preventiva'],
        'dependencies': ['global', 'iot']
    },
    'tourism': {
        'name': 'Turistični Modul',
        'type': 'business',
        'description': 'Upravljanje turizma in gostinskih storitev',
        'features': ['Rezervacije', 'Itinerarji', 'Gostinstvo', 'Marketing'],
        'dependencies': ['global', 'finance']
    },
    'agriculture': {
        'name': 'Kmetijski Modul',
        'type': 'specialized',
        'description': 'Pametno kmetijstvo in živinoreja',
        'features': ['Pridelava', 'Živinoreja', 'IoT senzorji', 'Optimizacija'],
        'dependencies': ['global', 'iot', 'environment']
    },
    'industry': {
        'name': 'Industrijski Modul',
        'type': 'business',
        'description': 'Industrija 4.0 in avtomatizacija',
        'features': ['Avtomatizacija', 'Proizvodnja', 'Kakovost', 'Vzdrževanje'],
        'dependencies': ['global', 'robotics', 'iot']
    },
    'energy': {
        'name': 'Energetski Modul',
        'type': 'infrastructure',
        'description': 'Upravljanje energije in obnovljivih virov',
        'features': ['Obnovljivi viri', 'Učinkovitost', 'Shranjevanje', 'Distribucija'],
        'dependencies': ['global', 'iot', 'environment']
    },
    'smart_home': {
        'name': 'Pametni Dom',
        'type': 'consumer',
        'description': 'Avtomatizacija doma in udobje',
        'features': ['Avtomatizacija', 'Varnost', 'Klimatizacija', 'Osvetlitev'],
        'dependencies': ['global', 'iot', 'energy', 'security']
    },
    'vehicles': {
        'name': 'Avtonomna Vozila',
        'type': 'transport',
        'description': 'Samovozeča vozila in prometna optimizacija',
        'features': ['Avtonomija', 'Navigacija', 'Varnost', 'Optimizacija'],
        'dependencies': ['global', 'communications', 'security']
    },
    'robotics': {
        'name': 'Robotika',
        'type': 'technology',
        'description': 'Robotski sistemi in AI asistenti',
        'features': ['AI Asistenti', 'Avtomatizacija', 'Učenje', 'Interakcija'],
        'dependencies': ['global', 'communications']
    },
    'science': {
        'name': 'Znanstveni Modul',
        'type': 'research',
        'description': 'Raziskave in znanstvene analize',
        'features': ['Raziskave', 'Eksperimenti', 'Analize', 'Publikacije'],
        'dependencies': ['global']
    },
    'communications': {
        'name': 'Komunikacijski Modul',
        'type': 'infrastructure',
        'description': 'Komunikacijske mreže in povezljivost',
        'features': ['5G/6G', 'IoT', 'Sateliti', 'Mesh mreže'],
        'dependencies': ['global']
    },
    'education': {
        'name': 'Izobraževalni Modul',
        'type': 'social',
        'description': 'E-učenje in izobraževalne platforme',
        'features': ['E-učenje', 'Mentorstvo', 'Certifikati', 'Personalizacija'],
        'dependencies': ['global', 'communications']
    },
    'security': {
        'name': 'Varnostni Modul',
        'type': 'infrastructure',
        'description': 'Kibernetska varnost in zaščita podatkov',
        'features': ['Kibernetska varnost', 'Nadzor', 'Zaščita', 'Analitika'],
        'dependencies': ['global']
    },
    'environment': {
        'name': 'Okoljski Modul',
        'type': 'monitoring',
        'description': 'Okoljski monitoring in trajnostni razvoj',
        'features': ['Monitoring', 'Trajnostnost', 'Ekologija', 'Klima'],
        'dependencies': ['global', 'iot']
    },
    'creative': {
        'name': 'Kreativni Modul',
        'type': 'creative',
        'description': 'Umetnost, glasba in kreativne tehnologije',
        'features': ['AI Umetnost', 'Glasba', 'Video', 'Dizajn'],
        'dependencies': ['global', 'communications']
    },
    'iot': {
        'name': 'IoT Modul',
        'type': 'infrastructure',
        'description': 'Internet stvari in pametne naprave',
        'features': ['Senzorji', 'Pametne naprave', 'Edge computing', 'Analitika'],
        'dependencies': ['global', 'communications']
    }
}

def initialize_module_status():
    """Inicializacija statusa vseh modulov"""
    global module_status
    for module_id, module_info in MODULES.items():
        module_status[module_id] = {
            'status': 'online',
            'uptime': round(random.uniform(98.0, 99.9), 1),
            'last_heartbeat': datetime.now().isoformat(),
            'cpu_usage': round(random.uniform(10, 80), 1),
            'memory_usage': round(random.uniform(20, 70), 1),
            'requests_per_minute': random.randint(50, 500),
            'errors_last_hour': random.randint(0, 5),
            'version': '2.1.0',
            **module_info
        }

def update_system_metrics():
    """Posodobi sistemske metrike"""
    global system_metrics
    system_metrics.update({
        'active_modules': sum(1 for status in module_status.values() if status['status'] == 'online'),
        'system_uptime': time.time() - system_metrics['system_uptime'],
        'last_update': datetime.now().isoformat(),
        'avg_cpu_usage': round(sum(s['cpu_usage'] for s in module_status.values()) / len(module_status), 1),
        'avg_memory_usage': round(sum(s['memory_usage'] for s in module_status.values()) / len(module_status), 1)
    })

def simulate_real_time_updates():
    """Simulacija real-time posodobitev modulov"""
    while True:
        try:
            # Posodobi naključne module
            for module_id in random.sample(list(module_status.keys()), k=random.randint(1, 5)):
                if module_id in module_status:
                    module_status[module_id].update({
                        'cpu_usage': max(5, min(95, module_status[module_id]['cpu_usage'] + random.uniform(-10, 10))),
                        'memory_usage': max(10, min(90, module_status[module_id]['memory_usage'] + random.uniform(-5, 5))),
                        'requests_per_minute': max(0, module_status[module_id]['requests_per_minute'] + random.randint(-50, 100)),
                        'last_heartbeat': datetime.now().isoformat()
                    })
            
            update_system_metrics()
            time.sleep(5)  # Posodobi vsakih 5 sekund
        except Exception as e:
            print(f"Napaka pri posodabljanju: {e}")
            time.sleep(10)

# API Endpoints

@app.route('/api/status/<module_id>')
def get_module_status(module_id):
    """Pridobi status določenega modula"""
    global system_metrics
    system_metrics['total_requests'] += 1
    
    if module_id not in module_status:
        return jsonify({'error': f'Modul {module_id} ne obstaja'}), 404
    
    return jsonify(module_status[module_id])

@app.route('/api/status')
def get_all_status():
    """Pridobi status vseh modulov"""
    global system_metrics
    system_metrics['total_requests'] += 1
    
    return jsonify({
        'modules': module_status,
        'system_metrics': system_metrics,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/restart/<module_id>', methods=['POST'])
def restart_module(module_id):
    """Ponovno zaženi določen modul"""
    if module_id not in module_status:
        return jsonify({'error': f'Modul {module_id} ne obstaja'}), 404
    
    # Simulacija restarta
    module_status[module_id].update({
        'status': 'restarting',
        'last_heartbeat': datetime.now().isoformat()
    })
    
    # Simulacija časa restarta
    def complete_restart():
        time.sleep(3)
        module_status[module_id].update({
            'status': 'online',
            'uptime': 100.0,
            'cpu_usage': round(random.uniform(10, 30), 1),
            'memory_usage': round(random.uniform(15, 40), 1),
            'last_heartbeat': datetime.now().isoformat()
        })
    
    threading.Thread(target=complete_restart).start()
    
    return jsonify({
        'message': f'Modul {module_id} se ponovno zaganja',
        'estimated_time': '3 sekunde'
    })

@app.route('/api/configure/<module_id>', methods=['POST'])
def configure_module(module_id):
    """Konfiguriraj določen modul"""
    if module_id not in module_status:
        return jsonify({'error': f'Modul {module_id} ne obstaja'}), 404
    
    config_data = request.get_json() or {}
    
    return jsonify({
        'message': f'Konfiguracija modula {module_id} posodobljena',
        'config': config_data,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/metrics')
def get_system_metrics():
    """Pridobi sistemske metrike"""
    return jsonify(system_metrics)

@app.route('/api/health')
def health_check():
    """Preveri zdravje sistema"""
    healthy_modules = sum(1 for status in module_status.values() if status['status'] == 'online')
    total_modules = len(module_status)
    
    health_status = 'healthy' if healthy_modules == total_modules else 'degraded'
    if healthy_modules < total_modules * 0.8:
        health_status = 'critical'
    
    return jsonify({
        'status': health_status,
        'healthy_modules': healthy_modules,
        'total_modules': total_modules,
        'uptime_seconds': time.time() - system_metrics['system_uptime'],
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/logs/<module_id>')
def get_module_logs(module_id):
    """Pridobi loge določenega modula"""
    if module_id not in module_status:
        return jsonify({'error': f'Modul {module_id} ne obstaja'}), 404
    
    # Simulacija logov
    logs = [
        {
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'message': f'Modul {module_id} deluje normalno'
        },
        {
            'timestamp': datetime.now().isoformat(),
            'level': 'DEBUG', 
            'message': f'Procesiranje zahteve za {module_id}'
        }
    ]
    
    return jsonify({'logs': logs})

@app.route('/')
def index():
    """Glavna stran API-ja"""
    return jsonify({
        'name': 'Omni-APP Enhanced API',
        'version': '2.1.0',
        'description': 'Backend API za Omni-APP Enhanced Dashboard',
        'endpoints': [
            '/api/status/<module_id>',
            '/api/status',
            '/api/restart/<module_id>',
            '/api/configure/<module_id>',
            '/api/metrics',
            '/api/health',
            '/api/logs/<module_id>'
        ],
        'total_modules': len(MODULES),
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("🚀 Zaganjam Omni-APP Enhanced API Server...")
    
    # Inicializacija
    initialize_module_status()
    
    # Zagon background thread za real-time posodobitve
    update_thread = threading.Thread(target=simulate_real_time_updates, daemon=True)
    update_thread.start()
    
    print(f"✅ API Server pripravljen z {len(MODULES)} moduli")
    print("📡 Dostopni endpoints:")
    print("   - http://localhost:5000/api/status")
    print("   - http://localhost:5000/api/health") 
    print("   - http://localhost:5000/api/metrics")
    
    # Zagon Flask aplikacije
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)