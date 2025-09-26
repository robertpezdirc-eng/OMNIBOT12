#!/usr/bin/env python3
"""
============================================================================
OMNI CLOUD MONITORING SYSTEM
Advanced monitoring and alerting system for cloud deployment
============================================================================
"""

import os
import sys
import json
import time
import psutil
import sqlite3
import logging
import requests
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from flask import Flask, render_template_string, jsonify, request
import threading
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configuration
MONITORING_CONFIG = {
    'check_interval': 60,  # seconds
    'alert_thresholds': {
        'cpu_percent': 80,
        'memory_percent': 85,
        'disk_percent': 90,
        'response_time': 5000,  # milliseconds
    },
    'services_to_monitor': [
        'omni',
        'angel-integration',
        'angel-tasks',
        'angel-monitoring',
        'angel-sync',
        'nginx'
    ],
    'endpoints_to_monitor': [
        {'name': 'Main App', 'url': 'http://localhost:8080/health', 'timeout': 10},
        {'name': 'Angel Integration', 'url': 'http://localhost:5000/health', 'timeout': 5},
        {'name': 'Angel Tasks', 'url': 'http://localhost:5001/health', 'timeout': 5},
        {'name': 'Angel Monitoring', 'url': 'http://localhost:5003/health', 'timeout': 5},
        {'name': 'Angel Sync', 'url': 'http://localhost:5004/health', 'timeout': 5},
    ],
    'email_alerts': True,
    'webhook_alerts': False,
    'retention_days': 30,
}

# Email configuration
EMAIL_CONFIG = {
    'smtp_server': 'localhost',
    'smtp_port': 587,
    'username': '',
    'password': '',
    'from_email': 'omni-monitoring@localhost',
    'to_emails': ['admin@localhost'],
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/omni/monitoring.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('OmniMonitoring')

class SystemMonitor:
    """Advanced system monitoring class"""
    
    def __init__(self):
        self.config = MONITORING_CONFIG
        self.db_path = Path('/var/lib/omni/monitoring.db')
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.init_database()
        self.alert_cooldown = {}  # Prevent spam alerts
        
    def init_database(self):
        """Initialize monitoring database"""
        with sqlite3.connect(self.db_path) as conn:
            # System metrics table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS system_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    cpu_percent REAL,
                    memory_percent REAL,
                    memory_used_gb REAL,
                    memory_total_gb REAL,
                    disk_percent REAL,
                    disk_used_gb REAL,
                    disk_total_gb REAL,
                    load_average REAL,
                    network_bytes_sent INTEGER,
                    network_bytes_recv INTEGER
                )
            ''')
            
            # Service status table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS service_status (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    service_name TEXT,
                    status TEXT,
                    cpu_percent REAL,
                    memory_mb REAL,
                    pid INTEGER
                )
            ''')
            
            # Endpoint monitoring table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS endpoint_checks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    endpoint_name TEXT,
                    url TEXT,
                    status_code INTEGER,
                    response_time_ms REAL,
                    is_healthy BOOLEAN,
                    error_message TEXT
                )
            ''')
            
            # Alerts table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    alert_type TEXT,
                    severity TEXT,
                    message TEXT,
                    resolved BOOLEAN DEFAULT FALSE,
                    resolved_at DATETIME
                )
            ''')
            
            conn.commit()
    
    def collect_system_metrics(self) -> Dict:
        """Collect system performance metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            load_avg = os.getloadavg()[0] if hasattr(os, 'getloadavg') else 0
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used_gb = memory.used / (1024**3)
            memory_total_gb = memory.total / (1024**3)
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            disk_used_gb = disk.used / (1024**3)
            disk_total_gb = disk.total / (1024**3)
            
            # Network metrics
            network = psutil.net_io_counters()
            network_bytes_sent = network.bytes_sent
            network_bytes_recv = network.bytes_recv
            
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'cpu_percent': cpu_percent,
                'memory_percent': memory_percent,
                'memory_used_gb': memory_used_gb,
                'memory_total_gb': memory_total_gb,
                'disk_percent': disk_percent,
                'disk_used_gb': disk_used_gb,
                'disk_total_gb': disk_total_gb,
                'load_average': load_avg,
                'network_bytes_sent': network_bytes_sent,
                'network_bytes_recv': network_bytes_recv
            }
            
            # Store in database
            self._store_system_metrics(metrics)
            
            # Check for alerts
            self._check_system_alerts(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {str(e)}")
            return {}
    
    def check_services(self) -> List[Dict]:
        """Check status of monitored services"""
        service_statuses = []
        
        for service_name in self.config['services_to_monitor']:
            try:
                # Check systemd service status
                result = subprocess.run(
                    ['systemctl', 'is-active', service_name],
                    capture_output=True,
                    text=True
                )
                
                status = result.stdout.strip()
                is_active = status == 'active'
                
                # Get process info if service is active
                cpu_percent = 0
                memory_mb = 0
                pid = None
                
                if is_active:
                    try:
                        # Get service PID
                        pid_result = subprocess.run(
                            ['systemctl', 'show', service_name, '--property=MainPID'],
                            capture_output=True,
                            text=True
                        )
                        
                        if pid_result.returncode == 0:
                            pid_line = pid_result.stdout.strip()
                            if '=' in pid_line:
                                pid = int(pid_line.split('=')[1])
                                
                                if pid > 0:
                                    process = psutil.Process(pid)
                                    cpu_percent = process.cpu_percent()
                                    memory_mb = process.memory_info().rss / (1024**2)
                    
                    except (psutil.NoSuchProcess, ValueError, IndexError):
                        pass
                
                service_status = {
                    'service_name': service_name,
                    'status': status,
                    'is_active': is_active,
                    'cpu_percent': cpu_percent,
                    'memory_mb': memory_mb,
                    'pid': pid,
                    'timestamp': datetime.now().isoformat()
                }
                
                service_statuses.append(service_status)
                
                # Store in database
                self._store_service_status(service_status)
                
                # Check for service alerts
                if not is_active:
                    self._create_alert(
                        'service_down',
                        'critical',
                        f"Service {service_name} is not active (status: {status})"
                    )
                
            except Exception as e:
                logger.error(f"Error checking service {service_name}: {str(e)}")
                
                service_status = {
                    'service_name': service_name,
                    'status': 'error',
                    'is_active': False,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                
                service_statuses.append(service_status)
        
        return service_statuses
    
    def check_endpoints(self) -> List[Dict]:
        """Check health of monitored endpoints"""
        endpoint_statuses = []
        
        for endpoint in self.config['endpoints_to_monitor']:
            try:
                start_time = time.time()
                
                response = requests.get(
                    endpoint['url'],
                    timeout=endpoint['timeout'],
                    headers={'User-Agent': 'Omni-Monitor/1.0'}
                )
                
                response_time_ms = (time.time() - start_time) * 1000
                
                endpoint_status = {
                    'endpoint_name': endpoint['name'],
                    'url': endpoint['url'],
                    'status_code': response.status_code,
                    'response_time_ms': response_time_ms,
                    'is_healthy': 200 <= response.status_code < 400,
                    'error_message': None,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Check response time alert
                if response_time_ms > self.config['alert_thresholds']['response_time']:
                    self._create_alert(
                        'slow_response',
                        'warning',
                        f"Endpoint {endpoint['name']} is slow: {response_time_ms:.0f}ms"
                    )
                
                # Check status code alert
                if not endpoint_status['is_healthy']:
                    self._create_alert(
                        'endpoint_error',
                        'critical',
                        f"Endpoint {endpoint['name']} returned status {response.status_code}"
                    )
                
            except requests.exceptions.RequestException as e:
                endpoint_status = {
                    'endpoint_name': endpoint['name'],
                    'url': endpoint['url'],
                    'status_code': 0,
                    'response_time_ms': 0,
                    'is_healthy': False,
                    'error_message': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                
                self._create_alert(
                    'endpoint_down',
                    'critical',
                    f"Endpoint {endpoint['name']} is unreachable: {str(e)}"
                )
            
            endpoint_statuses.append(endpoint_status)
            
            # Store in database
            self._store_endpoint_check(endpoint_status)
        
        return endpoint_statuses
    
    def _store_system_metrics(self, metrics: Dict):
        """Store system metrics in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO system_metrics 
                (cpu_percent, memory_percent, memory_used_gb, memory_total_gb,
                 disk_percent, disk_used_gb, disk_total_gb, load_average,
                 network_bytes_sent, network_bytes_recv)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                metrics['cpu_percent'],
                metrics['memory_percent'],
                metrics['memory_used_gb'],
                metrics['memory_total_gb'],
                metrics['disk_percent'],
                metrics['disk_used_gb'],
                metrics['disk_total_gb'],
                metrics['load_average'],
                metrics['network_bytes_sent'],
                metrics['network_bytes_recv']
            ))
    
    def _store_service_status(self, status: Dict):
        """Store service status in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO service_status 
                (service_name, status, cpu_percent, memory_mb, pid)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                status['service_name'],
                status['status'],
                status.get('cpu_percent', 0),
                status.get('memory_mb', 0),
                status.get('pid')
            ))
    
    def _store_endpoint_check(self, check: Dict):
        """Store endpoint check in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO endpoint_checks 
                (endpoint_name, url, status_code, response_time_ms, is_healthy, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                check['endpoint_name'],
                check['url'],
                check['status_code'],
                check['response_time_ms'],
                check['is_healthy'],
                check['error_message']
            ))
    
    def _check_system_alerts(self, metrics: Dict):
        """Check system metrics for alert conditions"""
        thresholds = self.config['alert_thresholds']
        
        # CPU alert
        if metrics['cpu_percent'] > thresholds['cpu_percent']:
            self._create_alert(
                'high_cpu',
                'warning',
                f"High CPU usage: {metrics['cpu_percent']:.1f}%"
            )
        
        # Memory alert
        if metrics['memory_percent'] > thresholds['memory_percent']:
            self._create_alert(
                'high_memory',
                'warning',
                f"High memory usage: {metrics['memory_percent']:.1f}%"
            )
        
        # Disk alert
        if metrics['disk_percent'] > thresholds['disk_percent']:
            self._create_alert(
                'high_disk',
                'critical',
                f"High disk usage: {metrics['disk_percent']:.1f}%"
            )
    
    def _create_alert(self, alert_type: str, severity: str, message: str):
        """Create and send alert"""
        # Check cooldown to prevent spam
        cooldown_key = f"{alert_type}:{message}"
        now = datetime.now()
        
        if cooldown_key in self.alert_cooldown:
            last_alert = self.alert_cooldown[cooldown_key]
            if (now - last_alert).total_seconds() < 300:  # 5 minute cooldown
                return
        
        self.alert_cooldown[cooldown_key] = now
        
        # Store alert in database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO alerts (alert_type, severity, message)
                VALUES (?, ?, ?)
            ''', (alert_type, severity, message))
        
        logger.warning(f"ALERT [{severity.upper()}] {alert_type}: {message}")
        
        # Send email alert if configured
        if self.config['email_alerts']:
            self._send_email_alert(alert_type, severity, message)
    
    def _send_email_alert(self, alert_type: str, severity: str, message: str):
        """Send email alert"""
        try:
            if not EMAIL_CONFIG['username']:
                return
            
            msg = MIMEMultipart()
            msg['From'] = EMAIL_CONFIG['from_email']
            msg['To'] = ', '.join(EMAIL_CONFIG['to_emails'])
            
            severity_emoji = {
                'info': 'ℹ️',
                'warning': '⚠️',
                'critical': '🚨'
            }
            
            emoji = severity_emoji.get(severity, '⚠️')
            msg['Subject'] = f"{emoji} Omni Alert [{severity.upper()}] - {alert_type}"
            
            body = f"""
Omni Monitoring Alert

Alert Type: {alert_type}
Severity: {severity.upper()}
Message: {message}
Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Please check the system immediately.

---
Omni Cloud Monitoring System
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port'])
            if EMAIL_CONFIG['username']:
                server.starttls()
                server.login(EMAIL_CONFIG['username'], EMAIL_CONFIG['password'])
            
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Alert email sent: {alert_type}")
            
        except Exception as e:
            logger.error(f"Failed to send alert email: {str(e)}")
    
    def get_dashboard_data(self) -> Dict:
        """Get data for monitoring dashboard"""
        with sqlite3.connect(self.db_path) as conn:
            # Latest system metrics
            cursor = conn.execute('''
                SELECT * FROM system_metrics 
                ORDER BY timestamp DESC 
                LIMIT 1
            ''')
            latest_metrics = cursor.fetchone()
            
            # Service statuses
            cursor = conn.execute('''
                SELECT DISTINCT service_name,
                       FIRST_VALUE(status) OVER (PARTITION BY service_name ORDER BY timestamp DESC) as status,
                       FIRST_VALUE(cpu_percent) OVER (PARTITION BY service_name ORDER BY timestamp DESC) as cpu_percent,
                       FIRST_VALUE(memory_mb) OVER (PARTITION BY service_name ORDER BY timestamp DESC) as memory_mb
                FROM service_status
                WHERE timestamp > datetime('now', '-5 minutes')
            ''')
            services = cursor.fetchall()
            
            # Recent alerts
            cursor = conn.execute('''
                SELECT alert_type, severity, message, timestamp
                FROM alerts
                WHERE resolved = FALSE
                ORDER BY timestamp DESC
                LIMIT 10
            ''')
            alerts = cursor.fetchall()
            
            # Endpoint health
            cursor = conn.execute('''
                SELECT DISTINCT endpoint_name,
                       FIRST_VALUE(is_healthy) OVER (PARTITION BY endpoint_name ORDER BY timestamp DESC) as is_healthy,
                       FIRST_VALUE(response_time_ms) OVER (PARTITION BY endpoint_name ORDER BY timestamp DESC) as response_time_ms
                FROM endpoint_checks
                WHERE timestamp > datetime('now', '-5 minutes')
            ''')
            endpoints = cursor.fetchall()
        
        return {
            'system_metrics': latest_metrics,
            'services': services,
            'alerts': alerts,
            'endpoints': endpoints,
            'timestamp': datetime.now().isoformat()
        }

# Flask web dashboard
app = Flask(__name__)
monitor = SystemMonitor()

@app.route('/')
def dashboard():
    """Main monitoring dashboard"""
    dashboard_html = '''
<!DOCTYPE html>
<html>
<head>
    <title>Omni Cloud Monitoring</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .metric-value { font-weight: bold; }
        .status-ok { color: #27ae60; }
        .status-warning { color: #f39c12; }
        .status-error { color: #e74c3c; }
        .progress-bar { width: 100%; height: 20px; background: #ecf0f1; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s; }
        .progress-ok { background: #27ae60; }
        .progress-warning { background: #f39c12; }
        .progress-critical { background: #e74c3c; }
        .alert { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .alert-warning { background: #fff3cd; border-left: 4px solid #f39c12; }
        .alert-critical { background: #f8d7da; border-left: 4px solid #e74c3c; }
        .refresh-btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
    </style>
    <script>
        function refreshData() {
            fetch('/api/dashboard')
                .then(response => response.json())
                .then(data => updateDashboard(data))
                .catch(error => console.error('Error:', error));
        }
        
        function updateDashboard(data) {
            // Update system metrics
            if (data.system_metrics) {
                const metrics = data.system_metrics;
                document.getElementById('cpu-value').textContent = metrics[2] + '%';
                document.getElementById('memory-value').textContent = metrics[3] + '%';
                document.getElementById('disk-value').textContent = metrics[5] + '%';
                
                // Update progress bars
                updateProgressBar('cpu-bar', metrics[2]);
                updateProgressBar('memory-bar', metrics[3]);
                updateProgressBar('disk-bar', metrics[5]);
            }
            
            // Update timestamp
            document.getElementById('last-update').textContent = new Date().toLocaleString();
        }
        
        function updateProgressBar(id, value) {
            const bar = document.getElementById(id);
            const fill = bar.querySelector('.progress-fill');
            fill.style.width = value + '%';
            
            // Update color based on value
            fill.className = 'progress-fill ';
            if (value < 70) fill.className += 'progress-ok';
            else if (value < 85) fill.className += 'progress-warning';
            else fill.className += 'progress-critical';
        }
        
        // Auto-refresh every 30 seconds
        setInterval(refreshData, 30000);
        
        // Initial load
        window.onload = refreshData;
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Omni Cloud Monitoring</h1>
            <p>Real-time system monitoring and alerting</p>
            <button class="refresh-btn" onclick="refreshData()">🔄 Refresh</button>
            <span style="float: right;">Last Update: <span id="last-update">Loading...</span></span>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>📊 System Metrics</h3>
                <div class="metric">
                    <span>CPU Usage:</span>
                    <span id="cpu-value" class="metric-value">Loading...</span>
                </div>
                <div class="progress-bar" id="cpu-bar">
                    <div class="progress-fill progress-ok" style="width: 0%"></div>
                </div>
                
                <div class="metric">
                    <span>Memory Usage:</span>
                    <span id="memory-value" class="metric-value">Loading...</span>
                </div>
                <div class="progress-bar" id="memory-bar">
                    <div class="progress-fill progress-ok" style="width: 0%"></div>
                </div>
                
                <div class="metric">
                    <span>Disk Usage:</span>
                    <span id="disk-value" class="metric-value">Loading...</span>
                </div>
                <div class="progress-bar" id="disk-bar">
                    <div class="progress-fill progress-ok" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="card">
                <h3>🔧 Services Status</h3>
                <div id="services-list">Loading...</div>
            </div>
            
            <div class="card">
                <h3>🌐 Endpoints Health</h3>
                <div id="endpoints-list">Loading...</div>
            </div>
            
            <div class="card">
                <h3>🚨 Recent Alerts</h3>
                <div id="alerts-list">Loading...</div>
            </div>
        </div>
    </div>
</body>
</html>
    '''
    return dashboard_html

@app.route('/api/dashboard')
def api_dashboard():
    """API endpoint for dashboard data"""
    return jsonify(monitor.get_dashboard_data())

def monitoring_loop():
    """Main monitoring loop"""
    logger.info("Starting monitoring loop...")
    
    while True:
        try:
            # Collect system metrics
            monitor.collect_system_metrics()
            
            # Check services
            monitor.check_services()
            
            # Check endpoints
            monitor.check_endpoints()
            
            logger.debug("Monitoring cycle completed")
            
        except Exception as e:
            logger.error(f"Error in monitoring loop: {str(e)}")
        
        time.sleep(monitor.config['check_interval'])

def main():
    """Main function"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'dashboard':
            # Start web dashboard
            logger.info("Starting monitoring dashboard on port 5003...")
            app.run(host='0.0.0.0', port=5003, debug=False)
            
        elif command == 'check':
            # Single check
            print("System Metrics:")
            print(json.dumps(monitor.collect_system_metrics(), indent=2))
            print("\nServices:")
            print(json.dumps(monitor.check_services(), indent=2))
            print("\nEndpoints:")
            print(json.dumps(monitor.check_endpoints(), indent=2))
            
        elif command == 'monitor':
            # Start monitoring loop
            monitoring_loop()
            
        else:
            print("Usage: python cloud-monitoring-system.py {dashboard|check|monitor}")
            sys.exit(1)
    else:
        # Default: start both monitoring and dashboard
        # Start monitoring in background thread
        monitoring_thread = threading.Thread(target=monitoring_loop, daemon=True)
        monitoring_thread.start()
        
        # Start web dashboard
        logger.info("Starting monitoring system with dashboard on port 5003...")
        app.run(host='0.0.0.0', port=5003, debug=False)

if __name__ == '__main__':
    main()