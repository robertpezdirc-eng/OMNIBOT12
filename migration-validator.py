#!/usr/bin/env python3
"""
============================================================================
OMNI MIGRATION VALIDATOR
Comprehensive validation system for cloud migration
============================================================================
"""

import os
import sys
import json
import time
import socket
import ssl
import subprocess
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging
import sqlite3

# Configuration
VALIDATION_CONFIG = {
    'domain': '',  # Will be set during validation
    'expected_services': [
        'omni',
        'angel-integration', 
        'angel-tasks',
        'angel-monitoring',
        'angel-sync',
        'nginx'
    ],
    'expected_ports': {
        'nginx': 80,
        'nginx-ssl': 443,
        'omni': 8080,
        'angel-integration': 5000,
        'angel-tasks': 5001,
        'angel-monitoring': 5003,
        'angel-sync': 5004
    },
    'ssl_check_timeout': 10,
    'endpoint_timeout': 15,
    'max_retries': 3,
    'retry_delay': 5
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('MigrationValidator')

class MigrationValidator:
    """Comprehensive migration validation system"""
    
    def __init__(self, domain: str = None):
        self.domain = domain or VALIDATION_CONFIG['domain']
        self.config = VALIDATION_CONFIG
        self.results = {
            'validation_time': datetime.now().isoformat(),
            'domain': self.domain,
            'overall_status': 'unknown',
            'checks': {},
            'errors': [],
            'warnings': [],
            'summary': {}
        }
        
    def validate_all(self) -> Dict:
        """Run complete migration validation"""
        logger.info("🔍 Starting comprehensive migration validation...")
        
        # System checks
        self.results['checks']['system'] = self._validate_system()
        
        # Service checks
        self.results['checks']['services'] = self._validate_services()
        
        # Network checks
        self.results['checks']['network'] = self._validate_network()
        
        # SSL certificate checks
        self.results['checks']['ssl'] = self._validate_ssl()
        
        # Application health checks
        self.results['checks']['applications'] = self._validate_applications()
        
        # Angel systems checks
        self.results['checks']['angels'] = self._validate_angels()
        
        # Backup system checks
        self.results['checks']['backup'] = self._validate_backup()
        
        # Monitoring system checks
        self.results['checks']['monitoring'] = self._validate_monitoring()
        
        # File system checks
        self.results['checks']['filesystem'] = self._validate_filesystem()
        
        # Performance checks
        self.results['checks']['performance'] = self._validate_performance()
        
        # Generate summary
        self._generate_summary()
        
        return self.results
    
    def _validate_system(self) -> Dict:
        """Validate system requirements and configuration"""
        logger.info("📋 Validating system configuration...")
        
        checks = {
            'os_version': self._check_os_version(),
            'python_version': self._check_python_version(),
            'disk_space': self._check_disk_space(),
            'memory': self._check_memory(),
            'user_permissions': self._check_user_permissions(),
            'directories': self._check_directories()
        }
        
        return {
            'status': 'passed' if all(c['status'] == 'passed' for c in checks.values()) else 'failed',
            'checks': checks
        }
    
    def _validate_services(self) -> Dict:
        """Validate systemd services"""
        logger.info("🔧 Validating systemd services...")
        
        service_checks = {}
        
        for service in self.config['expected_services']:
            service_checks[service] = self._check_service_status(service)
        
        return {
            'status': 'passed' if all(c['status'] == 'passed' for c in service_checks.values()) else 'failed',
            'services': service_checks
        }
    
    def _validate_network(self) -> Dict:
        """Validate network connectivity and ports"""
        logger.info("🌐 Validating network configuration...")
        
        checks = {
            'port_bindings': self._check_port_bindings(),
            'external_connectivity': self._check_external_connectivity(),
            'internal_connectivity': self._check_internal_connectivity(),
            'dns_resolution': self._check_dns_resolution()
        }
        
        return {
            'status': 'passed' if all(c['status'] == 'passed' for c in checks.values()) else 'failed',
            'checks': checks
        }
    
    def _validate_ssl(self) -> Dict:
        """Validate SSL certificates"""
        logger.info("🔒 Validating SSL certificates...")
        
        if not self.domain:
            return {
                'status': 'skipped',
                'message': 'No domain specified for SSL validation'
            }
        
        checks = {
            'certificate_exists': self._check_ssl_certificate_exists(),
            'certificate_valid': self._check_ssl_certificate_valid(),
            'certificate_expiry': self._check_ssl_certificate_expiry(),
            'https_redirect': self._check_https_redirect()
        }
        
        return {
            'status': 'passed' if all(c['status'] == 'passed' for c in checks.values()) else 'failed',
            'checks': checks
        }
    
    def _validate_applications(self) -> Dict:
        """Validate application endpoints"""
        logger.info("🚀 Validating application endpoints...")
        
        endpoints = {
            'main_app': f"http://localhost:8080/health",
            'main_app_external': f"https://{self.domain}/" if self.domain else None
        }
        
        checks = {}
        for name, url in endpoints.items():
            if url:
                checks[name] = self._check_endpoint_health(url)
        
        return {
            'status': 'passed' if all(c['status'] == 'passed' for c in checks.values()) else 'failed',
            'endpoints': checks
        }
    
    def _validate_angels(self) -> Dict:
        """Validate Angel systems"""
        logger.info("👼 Validating Angel systems...")
        
        angel_endpoints = {
            'integration': 'http://localhost:5000/health',
            'tasks': 'http://localhost:5001/health', 
            'monitoring': 'http://localhost:5003/health',
            'sync': 'http://localhost:5004/health'
        }
        
        checks = {}
        for angel, url in angel_endpoints.items():
            checks[angel] = self._check_endpoint_health(url)
        
        return {
            'status': 'passed' if all(c['status'] == 'passed' for c in checks.values()) else 'failed',
            'angels': checks
        }
    
    def _validate_backup(self) -> Dict:
        """Validate backup system"""
        logger.info("💾 Validating backup system...")
        
        checks = {
            'backup_service': self._check_service_status('omni-backup'),
            'backup_directory': self._check_backup_directory(),
            'backup_script': self._check_backup_script(),
            'cron_job': self._check_backup_cron()
        }
        
        return {
            'status': 'passed' if all(c['status'] == 'passed' for c in checks.values()) else 'failed',
            'checks': checks
        }
    
    def _validate_monitoring(self) -> Dict:
        """Validate monitoring system"""
        logger.info("📊 Validating monitoring system...")
        
        checks = {
            'monitoring_service': self._check_service_status('angel-monitoring'),
            'monitoring_dashboard': self._check_endpoint_health('http://localhost:5003/'),
            'monitoring_database': self._check_monitoring_database(),
            'log_files': self._check_log_files()
        }
        
        return {
            'status': 'passed' if all(c['status'] == 'passed' for c in checks.values()) else 'failed',
            'checks': checks
        }
    
    def _validate_filesystem(self) -> Dict:
        """Validate file system structure"""
        logger.info("📁 Validating file system structure...")
        
        required_paths = [
            '/opt/omni',
            '/var/lib/omni',
            '/var/log/omni',
            '/etc/nginx/sites-available/omni',
            '/etc/systemd/system/omni.service'
        ]
        
        checks = {}
        for path in required_paths:
            checks[path] = self._check_path_exists(path)
        
        return {
            'status': 'passed' if all(c['status'] == 'passed' for c in checks.values()) else 'failed',
            'paths': checks
        }
    
    def _validate_performance(self) -> Dict:
        """Validate system performance"""
        logger.info("⚡ Validating system performance...")
        
        checks = {
            'response_times': self._check_response_times(),
            'resource_usage': self._check_resource_usage(),
            'load_test': self._perform_basic_load_test()
        }
        
        return {
            'status': 'passed' if all(c['status'] == 'passed' for c in checks.values()) else 'failed',
            'checks': checks
        }
    
    # Individual check methods
    def _check_os_version(self) -> Dict:
        """Check OS version"""
        try:
            result = subprocess.run(['lsb_release', '-d'], capture_output=True, text=True)
            if result.returncode == 0:
                os_info = result.stdout.strip()
                return {
                    'status': 'passed',
                    'message': f"OS: {os_info}",
                    'details': os_info
                }
            else:
                return {
                    'status': 'warning',
                    'message': 'Could not determine OS version'
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f"Error checking OS version: {str(e)}"
            }
    
    def _check_python_version(self) -> Dict:
        """Check Python version"""
        try:
            version = sys.version_info
            if version.major >= 3 and version.minor >= 8:
                return {
                    'status': 'passed',
                    'message': f"Python {version.major}.{version.minor}.{version.micro}",
                    'details': sys.version
                }
            else:
                return {
                    'status': 'failed',
                    'message': f"Python version too old: {version.major}.{version.minor}"
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f"Error checking Python version: {str(e)}"
            }
    
    def _check_disk_space(self) -> Dict:
        """Check available disk space"""
        try:
            import shutil
            total, used, free = shutil.disk_usage('/')
            free_gb = free / (1024**3)
            
            if free_gb > 5:  # At least 5GB free
                return {
                    'status': 'passed',
                    'message': f"Free disk space: {free_gb:.1f} GB",
                    'details': {'total_gb': total/(1024**3), 'used_gb': used/(1024**3), 'free_gb': free_gb}
                }
            else:
                return {
                    'status': 'warning',
                    'message': f"Low disk space: {free_gb:.1f} GB"
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f"Error checking disk space: {str(e)}"
            }
    
    def _check_memory(self) -> Dict:
        """Check available memory"""
        try:
            with open('/proc/meminfo', 'r') as f:
                meminfo = f.read()
            
            for line in meminfo.split('\n'):
                if 'MemAvailable:' in line:
                    available_kb = int(line.split()[1])
                    available_gb = available_kb / (1024**2)
                    
                    if available_gb > 1:  # At least 1GB available
                        return {
                            'status': 'passed',
                            'message': f"Available memory: {available_gb:.1f} GB"
                        }
                    else:
                        return {
                            'status': 'warning',
                            'message': f"Low memory: {available_gb:.1f} GB"
                        }
            
            return {
                'status': 'failed',
                'message': 'Could not determine memory usage'
            }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f"Error checking memory: {str(e)}"
            }
    
    def _check_user_permissions(self) -> Dict:
        """Check user permissions"""
        try:
            # Check if running as root or with sudo
            if os.geteuid() == 0:
                return {
                    'status': 'passed',
                    'message': 'Running with root privileges'
                }
            else:
                # Check if user can sudo
                result = subprocess.run(['sudo', '-n', 'true'], capture_output=True)
                if result.returncode == 0:
                    return {
                        'status': 'passed',
                        'message': 'User has sudo privileges'
                    }
                else:
                    return {
                        'status': 'failed',
                        'message': 'Insufficient privileges (need root or sudo)'
                    }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f"Error checking permissions: {str(e)}"
            }
    
    def _check_directories(self) -> Dict:
        """Check required directories"""
        required_dirs = ['/opt', '/var/lib', '/var/log', '/etc/systemd/system']
        
        for directory in required_dirs:
            if not os.path.exists(directory):
                return {
                    'status': 'failed',
                    'message': f'Required directory missing: {directory}'
                }
        
        return {
            'status': 'passed',
            'message': 'All required directories exist'
        }
    
    def _check_service_status(self, service_name: str) -> Dict:
        """Check systemd service status"""
        try:
            result = subprocess.run(
                ['systemctl', 'is-active', service_name],
                capture_output=True,
                text=True
            )
            
            status = result.stdout.strip()
            
            if status == 'active':
                return {
                    'status': 'passed',
                    'message': f'Service {service_name} is active',
                    'service_status': status
                }
            else:
                return {
                    'status': 'failed',
                    'message': f'Service {service_name} is not active (status: {status})',
                    'service_status': status
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Error checking service {service_name}: {str(e)}'
            }
    
    def _check_port_bindings(self) -> Dict:
        """Check if required ports are bound"""
        bound_ports = []
        failed_ports = []
        
        for service, port in self.config['expected_ports'].items():
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex(('localhost', port))
                sock.close()
                
                if result == 0:
                    bound_ports.append(f"{service}:{port}")
                else:
                    failed_ports.append(f"{service}:{port}")
            except Exception:
                failed_ports.append(f"{service}:{port}")
        
        if not failed_ports:
            return {
                'status': 'passed',
                'message': f'All ports bound: {", ".join(bound_ports)}'
            }
        else:
            return {
                'status': 'failed',
                'message': f'Ports not bound: {", ".join(failed_ports)}'
            }
    
    def _check_external_connectivity(self) -> Dict:
        """Check external connectivity"""
        if not self.domain:
            return {
                'status': 'skipped',
                'message': 'No domain specified for external connectivity check'
            }
        
        try:
            response = requests.get(f'https://{self.domain}', timeout=10)
            if response.status_code == 200:
                return {
                    'status': 'passed',
                    'message': f'External access to https://{self.domain} successful'
                }
            else:
                return {
                    'status': 'failed',
                    'message': f'External access failed with status {response.status_code}'
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'External connectivity failed: {str(e)}'
            }
    
    def _check_internal_connectivity(self) -> Dict:
        """Check internal service connectivity"""
        try:
            response = requests.get('http://localhost:8080/health', timeout=5)
            if response.status_code == 200:
                return {
                    'status': 'passed',
                    'message': 'Internal connectivity to main app successful'
                }
            else:
                return {
                    'status': 'failed',
                    'message': f'Internal connectivity failed with status {response.status_code}'
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Internal connectivity failed: {str(e)}'
            }
    
    def _check_dns_resolution(self) -> Dict:
        """Check DNS resolution"""
        if not self.domain:
            return {
                'status': 'skipped',
                'message': 'No domain specified for DNS check'
            }
        
        try:
            import socket
            ip = socket.gethostbyname(self.domain)
            return {
                'status': 'passed',
                'message': f'DNS resolution successful: {self.domain} -> {ip}'
            }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'DNS resolution failed: {str(e)}'
            }
    
    def _check_ssl_certificate_exists(self) -> Dict:
        """Check if SSL certificate files exist"""
        cert_path = f'/etc/letsencrypt/live/{self.domain}/fullchain.pem'
        key_path = f'/etc/letsencrypt/live/{self.domain}/privkey.pem'
        
        if os.path.exists(cert_path) and os.path.exists(key_path):
            return {
                'status': 'passed',
                'message': 'SSL certificate files exist'
            }
        else:
            return {
                'status': 'failed',
                'message': 'SSL certificate files not found'
            }
    
    def _check_ssl_certificate_valid(self) -> Dict:
        """Check SSL certificate validity"""
        try:
            context = ssl.create_default_context()
            with socket.create_connection((self.domain, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=self.domain) as ssock:
                    cert = ssock.getpeercert()
                    return {
                        'status': 'passed',
                        'message': f'SSL certificate valid for {self.domain}',
                        'details': cert
                    }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'SSL certificate validation failed: {str(e)}'
            }
    
    def _check_ssl_certificate_expiry(self) -> Dict:
        """Check SSL certificate expiry"""
        try:
            context = ssl.create_default_context()
            with socket.create_connection((self.domain, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=self.domain) as ssock:
                    cert = ssock.getpeercert()
                    expiry_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    days_until_expiry = (expiry_date - datetime.now()).days
                    
                    if days_until_expiry > 30:
                        return {
                            'status': 'passed',
                            'message': f'SSL certificate expires in {days_until_expiry} days'
                        }
                    elif days_until_expiry > 7:
                        return {
                            'status': 'warning',
                            'message': f'SSL certificate expires soon: {days_until_expiry} days'
                        }
                    else:
                        return {
                            'status': 'failed',
                            'message': f'SSL certificate expires very soon: {days_until_expiry} days'
                        }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'SSL certificate expiry check failed: {str(e)}'
            }
    
    def _check_https_redirect(self) -> Dict:
        """Check HTTP to HTTPS redirect"""
        try:
            response = requests.get(f'http://{self.domain}', allow_redirects=False, timeout=10)
            if response.status_code in [301, 302] and 'https' in response.headers.get('Location', ''):
                return {
                    'status': 'passed',
                    'message': 'HTTP to HTTPS redirect working'
                }
            else:
                return {
                    'status': 'failed',
                    'message': 'HTTP to HTTPS redirect not configured'
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'HTTPS redirect check failed: {str(e)}'
            }
    
    def _check_endpoint_health(self, url: str) -> Dict:
        """Check endpoint health"""
        try:
            response = requests.get(url, timeout=self.config['endpoint_timeout'])
            if response.status_code == 200:
                return {
                    'status': 'passed',
                    'message': f'Endpoint {url} is healthy',
                    'response_time': response.elapsed.total_seconds()
                }
            else:
                return {
                    'status': 'failed',
                    'message': f'Endpoint {url} returned status {response.status_code}'
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Endpoint {url} check failed: {str(e)}'
            }
    
    def _check_backup_directory(self) -> Dict:
        """Check backup directory"""
        backup_dir = '/var/backups/omni'
        if os.path.exists(backup_dir) and os.path.isdir(backup_dir):
            return {
                'status': 'passed',
                'message': f'Backup directory exists: {backup_dir}'
            }
        else:
            return {
                'status': 'failed',
                'message': f'Backup directory not found: {backup_dir}'
            }
    
    def _check_backup_script(self) -> Dict:
        """Check backup script"""
        script_path = '/opt/omni/cloud-backup-system.py'
        if os.path.exists(script_path):
            return {
                'status': 'passed',
                'message': 'Backup script exists'
            }
        else:
            return {
                'status': 'failed',
                'message': 'Backup script not found'
            }
    
    def _check_backup_cron(self) -> Dict:
        """Check backup cron job"""
        try:
            result = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
            if 'cloud-backup-system.py' in result.stdout:
                return {
                    'status': 'passed',
                    'message': 'Backup cron job configured'
                }
            else:
                return {
                    'status': 'failed',
                    'message': 'Backup cron job not found'
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Error checking backup cron: {str(e)}'
            }
    
    def _check_monitoring_database(self) -> Dict:
        """Check monitoring database"""
        db_path = '/var/lib/omni/monitoring.db'
        if os.path.exists(db_path):
            return {
                'status': 'passed',
                'message': 'Monitoring database exists'
            }
        else:
            return {
                'status': 'failed',
                'message': 'Monitoring database not found'
            }
    
    def _check_log_files(self) -> Dict:
        """Check log files"""
        log_dir = '/var/log/omni'
        if os.path.exists(log_dir) and os.path.isdir(log_dir):
            log_files = list(Path(log_dir).glob('*.log'))
            if log_files:
                return {
                    'status': 'passed',
                    'message': f'Log files found: {len(log_files)} files'
                }
            else:
                return {
                    'status': 'warning',
                    'message': 'Log directory exists but no log files found'
                }
        else:
            return {
                'status': 'failed',
                'message': 'Log directory not found'
            }
    
    def _check_path_exists(self, path: str) -> Dict:
        """Check if path exists"""
        if os.path.exists(path):
            return {
                'status': 'passed',
                'message': f'Path exists: {path}'
            }
        else:
            return {
                'status': 'failed',
                'message': f'Path not found: {path}'
            }
    
    def _check_response_times(self) -> Dict:
        """Check application response times"""
        endpoints = [
            'http://localhost:8080/health',
            'http://localhost:5000/health',
            'http://localhost:5001/health'
        ]
        
        total_time = 0
        successful_checks = 0
        
        for endpoint in endpoints:
            try:
                start_time = time.time()
                response = requests.get(endpoint, timeout=5)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    total_time += response_time
                    successful_checks += 1
            except Exception:
                pass
        
        if successful_checks > 0:
            avg_response_time = total_time / successful_checks
            if avg_response_time < 2.0:  # Less than 2 seconds
                return {
                    'status': 'passed',
                    'message': f'Average response time: {avg_response_time:.2f}s'
                }
            else:
                return {
                    'status': 'warning',
                    'message': f'Slow response time: {avg_response_time:.2f}s'
                }
        else:
            return {
                'status': 'failed',
                'message': 'No endpoints responded'
            }
    
    def _check_resource_usage(self) -> Dict:
        """Check system resource usage"""
        try:
            import psutil
            
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_percent = psutil.virtual_memory().percent
            
            if cpu_percent < 80 and memory_percent < 80:
                return {
                    'status': 'passed',
                    'message': f'Resource usage normal (CPU: {cpu_percent}%, Memory: {memory_percent}%)'
                }
            else:
                return {
                    'status': 'warning',
                    'message': f'High resource usage (CPU: {cpu_percent}%, Memory: {memory_percent}%)'
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Error checking resource usage: {str(e)}'
            }
    
    def _perform_basic_load_test(self) -> Dict:
        """Perform basic load test"""
        try:
            # Simple load test - make 10 concurrent requests
            import concurrent.futures
            import threading
            
            def make_request():
                try:
                    response = requests.get('http://localhost:8080/health', timeout=10)
                    return response.status_code == 200
                except:
                    return False
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(make_request) for _ in range(10)]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            success_rate = sum(results) / len(results)
            
            if success_rate >= 0.9:  # 90% success rate
                return {
                    'status': 'passed',
                    'message': f'Load test passed (success rate: {success_rate:.1%})'
                }
            else:
                return {
                    'status': 'warning',
                    'message': f'Load test concerns (success rate: {success_rate:.1%})'
                }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Load test failed: {str(e)}'
            }
    
    def _generate_summary(self):
        """Generate validation summary"""
        total_checks = 0
        passed_checks = 0
        failed_checks = 0
        warning_checks = 0
        
        def count_checks(check_dict):
            nonlocal total_checks, passed_checks, failed_checks, warning_checks
            
            for key, value in check_dict.items():
                if isinstance(value, dict):
                    if 'status' in value:
                        total_checks += 1
                        if value['status'] == 'passed':
                            passed_checks += 1
                        elif value['status'] == 'failed':
                            failed_checks += 1
                        elif value['status'] == 'warning':
                            warning_checks += 1
                    else:
                        count_checks(value)
        
        count_checks(self.results['checks'])
        
        # Determine overall status
        if failed_checks == 0:
            if warning_checks == 0:
                overall_status = 'passed'
            else:
                overall_status = 'passed_with_warnings'
        else:
            overall_status = 'failed'
        
        self.results['overall_status'] = overall_status
        self.results['summary'] = {
            'total_checks': total_checks,
            'passed': passed_checks,
            'failed': failed_checks,
            'warnings': warning_checks,
            'success_rate': f"{(passed_checks/total_checks)*100:.1f}%" if total_checks > 0 else "0%"
        }
    
    def print_report(self):
        """Print validation report"""
        print("\n" + "="*80)
        print("🔍 OMNI MIGRATION VALIDATION REPORT")
        print("="*80)
        
        print(f"\n📅 Validation Time: {self.results['validation_time']}")
        print(f"🌐 Domain: {self.domain or 'Not specified'}")
        
        # Overall status
        status_emoji = {
            'passed': '✅',
            'passed_with_warnings': '⚠️',
            'failed': '❌',
            'unknown': '❓'
        }
        
        emoji = status_emoji.get(self.results['overall_status'], '❓')
        print(f"\n{emoji} Overall Status: {self.results['overall_status'].upper()}")
        
        # Summary
        summary = self.results['summary']
        print(f"\n📊 Summary:")
        print(f"   Total Checks: {summary['total_checks']}")
        print(f"   ✅ Passed: {summary['passed']}")
        print(f"   ⚠️  Warnings: {summary['warnings']}")
        print(f"   ❌ Failed: {summary['failed']}")
        print(f"   📈 Success Rate: {summary['success_rate']}")
        
        # Detailed results
        print(f"\n📋 Detailed Results:")
        self._print_check_results(self.results['checks'], indent=0)
        
        print("\n" + "="*80)

    def _print_check_results(self, checks, indent=0):
        """Print check results recursively"""
        for category, data in checks.items():
            prefix = "  " * indent
            
            if isinstance(data, dict) and 'status' in data:
                # This is a check result
                status_emoji = {
                    'passed': '✅',
                    'failed': '❌',
                    'warning': '⚠️',
                    'skipped': '⏭️'
                }
                emoji = status_emoji.get(data['status'], '❓')
                print(f"{prefix}{emoji} {category}: {data.get('message', 'No message')}")
                
            elif isinstance(data, dict):
                # This is a category with sub-checks
                print(f"{prefix}📁 {category.upper()}:")
                self._print_check_results(data, indent + 1)

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python migration-validator.py <domain> [--json]")
        print("Example: python migration-validator.py moja-domena.com")
        sys.exit(1)
    
    domain = sys.argv[1]
    output_json = '--json' in sys.argv
    
    # Create validator
    validator = MigrationValidator(domain)
    
    # Run validation
    results = validator.validate_all()
    
    if output_json:
        # Output JSON results
        print(json.dumps(results, indent=2))
    else:
        # Print human-readable report
        validator.print_report()
        
        # Exit with appropriate code
        if results['overall_status'] == 'failed':
            sys.exit(1)
        elif results['overall_status'] == 'passed_with_warnings':
            sys.exit(2)
        else:
            sys.exit(0)

if __name__ == '__main__':
    main()