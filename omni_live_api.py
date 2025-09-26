#!/usr/bin/env python3
"""
Omni Live API Server
Podpira Live Dashboard z real-time statusom modulov
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import threading
import time
import random
import json
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Module status data with real-time simulation
module_status = {
    'global_optimizer': {
        'name': 'Global Optimizer',
        'status': 'active',
        'performance': 98.5,
        'connections': 12,
        'dataflow': '2.3 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '99.8%',
        'cpu_usage': 15.2,
        'memory_usage': 45.8
    },
    'tourism': {
        'name': 'Tourism',
        'status': 'active',
        'performance': 95.2,
        'connections': 8,
        'dataflow': '1.8 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '98.5%',
        'cpu_usage': 12.1,
        'memory_usage': 32.4
    },
    'finance': {
        'name': 'Finance',
        'status': 'active',
        'performance': 97.1,
        'connections': 15,
        'dataflow': '3.2 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '99.2%',
        'cpu_usage': 18.7,
        'memory_usage': 52.3
    },
    'healthcare': {
        'name': 'Healthcare',
        'status': 'warning',
        'performance': 78.3,
        'connections': 6,
        'dataflow': '0.9 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '95.1%',
        'cpu_usage': 25.4,
        'memory_usage': 68.9
    },
    'agriculture': {
        'name': 'Agriculture',
        'status': 'active',
        'performance': 92.8,
        'connections': 10,
        'dataflow': '1.5 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '97.8%',
        'cpu_usage': 14.3,
        'memory_usage': 38.7
    },
    'it': {
        'name': 'IT & DevOps',
        'status': 'active',
        'performance': 99.1,
        'connections': 20,
        'dataflow': '4.1 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '99.9%',
        'cpu_usage': 22.1,
        'memory_usage': 58.2
    },
    'marketing': {
        'name': 'Marketing',
        'status': 'loading',
        'performance': 0,
        'connections': 0,
        'dataflow': '0 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '0%',
        'cpu_usage': 5.2,
        'memory_usage': 15.1
    },
    'education': {
        'name': 'Education',
        'status': 'active',
        'performance': 94.7,
        'connections': 12,
        'dataflow': '2.1 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '98.1%',
        'cpu_usage': 16.8,
        'memory_usage': 41.5
    },
    'logistics': {
        'name': 'Logistics',
        'status': 'active',
        'performance': 96.3,
        'connections': 14,
        'dataflow': '2.8 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '98.7%',
        'cpu_usage': 19.4,
        'memory_usage': 47.2
    },
    'art': {
        'name': 'Art & Creative',
        'status': 'offline',
        'performance': 0,
        'connections': 0,
        'dataflow': '0 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '0%',
        'cpu_usage': 0,
        'memory_usage': 0
    },
    'wellness': {
        'name': 'Wellness',
        'status': 'active',
        'performance': 93.5,
        'connections': 7,
        'dataflow': '1.2 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '97.3%',
        'cpu_usage': 11.7,
        'memory_usage': 29.8
    },
    'legal': {
        'name': 'Legal',
        'status': 'warning',
        'performance': 81.2,
        'connections': 4,
        'dataflow': '0.7 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '94.8%',
        'cpu_usage': 28.3,
        'memory_usage': 72.1
    },
    'innovation': {
        'name': 'Innovation',
        'status': 'active',
        'performance': 91.8,
        'connections': 9,
        'dataflow': '1.6 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '96.9%',
        'cpu_usage': 17.2,
        'memory_usage': 43.6
    },
    'energy': {
        'name': 'Energy',
        'status': 'active',
        'performance': 95.9,
        'connections': 11,
        'dataflow': '2.4 MB/s',
        'last_update': datetime.now().isoformat(),
        'uptime': '98.4%',
        'cpu_usage': 20.1,
        'memory_usage': 49.3
    }
}

# System metrics
system_metrics = {
    'total_modules': len(module_status),
    'active_modules': 0,
    'warning_modules': 0,
    'offline_modules': 0,
    'loading_modules': 0,
    'total_connections': 0,
    'system_uptime': '99.2%',
    'last_update': datetime.now().isoformat()
}

def update_system_metrics():
    """Update system-wide metrics"""
    active = warning = offline = loading = total_conn = 0
    
    for module_id, data in module_status.items():
        status = data['status']
        if status == 'active':
            active += 1
        elif status == 'warning':
            warning += 1
        elif status == 'offline':
            offline += 1
        elif status == 'loading':
            loading += 1
        
        total_conn += data['connections']
    
    system_metrics.update({
        'active_modules': active,
        'warning_modules': warning,
        'offline_modules': offline,
        'loading_modules': loading,
        'total_connections': total_conn,
        'last_update': datetime.now().isoformat()
    })

def simulate_real_time_updates():
    """Simulate real-time module updates"""
    while True:
        try:
            # Random module selection for updates
            module_id = random.choice(list(module_status.keys()))
            module = module_status[module_id]
            
            # Skip offline modules for most updates
            if module['status'] == 'offline' and random.random() > 0.1:
                time.sleep(2)
                continue
            
            # Simulate performance fluctuations
            if module['status'] == 'active':
                base_perf = module['performance']
                variation = random.uniform(-2, 2)
                new_perf = max(85, min(100, base_perf + variation))
                module['performance'] = round(new_perf, 1)
                
                # Simulate connection changes
                conn_change = random.randint(-2, 3)
                module['connections'] = max(0, module['connections'] + conn_change)
                
                # Update dataflow based on connections
                if module['connections'] > 0:
                    base_flow = module['connections'] * random.uniform(0.1, 0.3)
                    module['dataflow'] = f"{base_flow:.1f} MB/s"
                else:
                    module['dataflow'] = "0 MB/s"
                
                # Simulate CPU and memory usage
                module['cpu_usage'] = max(5, min(50, module['cpu_usage'] + random.uniform(-2, 2)))
                module['memory_usage'] = max(10, min(80, module['memory_usage'] + random.uniform(-3, 3)))
            
            elif module['status'] == 'warning':
                # Warning modules have more volatile performance
                variation = random.uniform(-5, 3)
                new_perf = max(60, min(90, module['performance'] + variation))
                module['performance'] = round(new_perf, 1)
                
                # Higher resource usage for warning modules
                module['cpu_usage'] = max(20, min(60, module['cpu_usage'] + random.uniform(-1, 3)))
                module['memory_usage'] = max(50, min(90, module['memory_usage'] + random.uniform(-2, 4)))
            
            elif module['status'] == 'loading':
                # Loading modules might become active
                if random.random() < 0.3:  # 30% chance to become active
                    module['status'] = 'active'
                    module['performance'] = random.uniform(85, 95)
                    module['connections'] = random.randint(5, 15)
                    module['dataflow'] = f"{random.uniform(1.0, 3.0):.1f} MB/s"
                    logger.info(f"Module {module_id} became active")
            
            # Random status changes (rare)
            if random.random() < 0.05:  # 5% chance
                current_status = module['status']
                if current_status == 'active' and random.random() < 0.3:
                    module['status'] = 'warning'
                    logger.info(f"Module {module_id} status changed to warning")
                elif current_status == 'warning' and random.random() < 0.4:
                    module['status'] = 'active'
                    logger.info(f"Module {module_id} recovered to active")
            
            # Update timestamp
            module['last_update'] = datetime.now().isoformat()
            
            # Update system metrics
            update_system_metrics()
            
            time.sleep(random.uniform(1, 3))  # Random update interval
            
        except Exception as e:
            logger.error(f"Error in simulation: {e}")
            time.sleep(5)

# API Routes

@app.route('/api/status', methods=['GET'])
def get_all_status():
    """Get status of all modules"""
    update_system_metrics()
    return jsonify({
        'modules': module_status,
        'system': system_metrics,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/status/<module_id>', methods=['GET'])
def get_module_status(module_id):
    """Get status of specific module"""
    if module_id not in module_status:
        return jsonify({'error': 'Module not found'}), 404
    
    module_data = module_status[module_id].copy()
    module_data['timestamp'] = datetime.now().isoformat()
    return jsonify(module_data)

@app.route('/api/restart/<module_id>', methods=['POST'])
def restart_module(module_id):
    """Restart specific module"""
    if module_id not in module_status:
        return jsonify({'error': 'Module not found'}), 404
    
    module = module_status[module_id]
    module['status'] = 'loading'
    module['performance'] = 0
    module['connections'] = 0
    module['dataflow'] = '0 MB/s'
    module['last_update'] = datetime.now().isoformat()
    
    logger.info(f"Module {module_id} restart initiated")
    
    return jsonify({
        'message': f'Module {module_id} restart initiated',
        'status': 'loading',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/system/metrics', methods=['GET'])
def get_system_metrics():
    """Get system-wide metrics"""
    update_system_metrics()
    return jsonify(system_metrics)

@app.route('/api/system/health', methods=['GET'])
def system_health():
    """Get overall system health"""
    update_system_metrics()
    
    total = system_metrics['total_modules']
    active = system_metrics['active_modules']
    warning = system_metrics['warning_modules']
    offline = system_metrics['offline_modules']
    
    health_score = ((active * 100) + (warning * 50)) / (total * 100) * 100
    
    if health_score >= 90:
        health_status = 'excellent'
    elif health_score >= 75:
        health_status = 'good'
    elif health_score >= 50:
        health_status = 'fair'
    else:
        health_status = 'poor'
    
    return jsonify({
        'health_score': round(health_score, 1),
        'health_status': health_status,
        'active_modules': active,
        'warning_modules': warning,
        'offline_modules': offline,
        'total_modules': total,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/simulate/activity', methods=['POST'])
def simulate_activity():
    """Trigger simulated activity"""
    module_id = random.choice(list(module_status.keys()))
    module = module_status[module_id]
    
    # Random status change
    statuses = ['active', 'warning', 'loading']
    new_status = random.choice(statuses)
    old_status = module['status']
    
    module['status'] = new_status
    module['last_update'] = datetime.now().isoformat()
    
    if new_status == 'active':
        module['performance'] = random.uniform(85, 98)
        module['connections'] = random.randint(5, 20)
        module['dataflow'] = f"{random.uniform(1.0, 4.0):.1f} MB/s"
    elif new_status == 'warning':
        module['performance'] = random.uniform(60, 85)
        module['connections'] = random.randint(2, 10)
        module['dataflow'] = f"{random.uniform(0.5, 2.0):.1f} MB/s"
    elif new_status == 'loading':
        module['performance'] = 0
        module['connections'] = 0
        module['dataflow'] = '0 MB/s'
    
    logger.info(f"Simulated activity: {module_id} changed from {old_status} to {new_status}")
    
    return jsonify({
        'message': f'Activity simulated for {module_id}',
        'module': module_id,
        'old_status': old_status,
        'new_status': new_status,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/logs', methods=['GET'])
def get_recent_logs():
    """Get recent system logs"""
    # Simulate recent logs
    logs = [
        {
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'module': 'global_optimizer',
            'message': 'System optimization completed successfully'
        },
        {
            'timestamp': datetime.now().isoformat(),
            'level': 'WARNING',
            'module': 'healthcare',
            'message': 'Performance degradation detected'
        },
        {
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'module': 'finance',
            'message': 'Budget analysis updated'
        }
    ]
    
    return jsonify({'logs': logs})

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize system metrics
    update_system_metrics()
    
    # Start background simulation thread
    simulation_thread = threading.Thread(target=simulate_real_time_updates, daemon=True)
    simulation_thread.start()
    
    logger.info("🚀 Omni Live API Server starting...")
    logger.info("📊 Real-time module simulation active")
    logger.info("🌐 CORS enabled for frontend integration")
    logger.info("⚡ Available endpoints:")
    logger.info("   GET  /api/status - All modules status")
    logger.info("   GET  /api/status/<module_id> - Specific module")
    logger.info("   POST /api/restart/<module_id> - Restart module")
    logger.info("   GET  /api/system/metrics - System metrics")
    logger.info("   GET  /api/system/health - System health")
    logger.info("   POST /api/simulate/activity - Trigger activity")
    logger.info("   GET  /api/logs - Recent logs")
    
    try:
        app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")