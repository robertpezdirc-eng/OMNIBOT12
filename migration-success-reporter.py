#!/usr/bin/env python3
"""
Omni AI Platform - Migration Success Reporter
Napreden sistem za poročanje o uspešnosti migracije z detajlnimi metrikami
"""

import json
import time
import requests
import subprocess
import socket
import ssl
import datetime
import os
import sys
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from pathlib import Path
import argparse

class MigrationSuccessReporter:
    def __init__(self, domain, email=None, webhook_url=None):
        self.domain = domain
        self.email = email
        self.webhook_url = webhook_url
        self.report_data = {
            'migration_timestamp': datetime.datetime.now().isoformat(),
            'domain': domain,
            'status': 'unknown',
            'services': {},
            'ssl': {},
            'performance': {},
            'angel_systems': {},
            'backup_monitoring': {},
            'security': {},
            'recommendations': [],
            'errors': [],
            'warnings': []
        }
        
    def check_service_status(self, service_name):
        """Preveri status systemd storitve"""
        try:
            result = subprocess.run(['systemctl', 'is-active', service_name], 
                                  capture_output=True, text=True)
            return result.stdout.strip() == 'active'
        except Exception as e:
            self.report_data['errors'].append(f"Service check error for {service_name}: {str(e)}")
            return False
    
    def check_port_availability(self, port):
        """Preveri ali je port odprt"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex(('localhost', port))
            sock.close()
            return result == 0
        except Exception as e:
            self.report_data['errors'].append(f"Port check error for {port}: {str(e)}")
            return False
    
    def check_ssl_certificate(self):
        """Preveri SSL certifikat"""
        ssl_info = {
            'valid': False,
            'issuer': None,
            'expires': None,
            'days_until_expiry': None,
            'https_redirect': False
        }
        
        try:
            # Preveri SSL certifikat
            context = ssl.create_default_context()
            with socket.create_connection((self.domain, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=self.domain) as ssock:
                    cert = ssock.getpeercert()
                    ssl_info['valid'] = True
                    ssl_info['issuer'] = dict(x[0] for x in cert['issuer'])['organizationName']
                    
                    # Datum poteka
                    expire_date = datetime.datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    ssl_info['expires'] = expire_date.isoformat()
                    ssl_info['days_until_expiry'] = (expire_date - datetime.datetime.now()).days
            
            # Preveri HTTPS preusmeritev
            try:
                response = requests.get(f'http://{self.domain}', allow_redirects=False, timeout=10)
                ssl_info['https_redirect'] = response.status_code in [301, 302] and 'https' in response.headers.get('Location', '')
            except:
                pass
                
        except Exception as e:
            self.report_data['errors'].append(f"SSL check error: {str(e)}")
        
        return ssl_info
    
    def check_application_health(self):
        """Preveri zdravje aplikacije"""
        health_info = {
            'main_app': False,
            'api_endpoints': False,
            'response_time': None,
            'status_code': None
        }
        
        try:
            start_time = time.time()
            response = requests.get(f'https://{self.domain}', timeout=15)
            response_time = time.time() - start_time
            
            health_info['main_app'] = response.status_code == 200
            health_info['status_code'] = response.status_code
            health_info['response_time'] = round(response_time * 1000, 2)  # ms
            
            # Preveri API endpoints
            try:
                api_response = requests.get(f'https://{self.domain}/api/health', timeout=10)
                health_info['api_endpoints'] = api_response.status_code == 200
            except:
                pass
                
        except Exception as e:
            self.report_data['errors'].append(f"Application health check error: {str(e)}")
        
        return health_info
    
    def check_angel_systems(self):
        """Preveri Angel sisteme"""
        angel_info = {
            'integration_service': False,
            'monitoring_dashboard': False,
            'task_distribution': False,
            'synchronization': False,
            'api_responses': {}
        }
        
        # Preveri Angel storitve
        services = {
            'integration_service': 'angel-integration',
            'monitoring_dashboard': 'angel-monitoring', 
            'task_distribution': 'angel-tasks'
        }
        
        for key, service in services.items():
            angel_info[key] = self.check_service_status(service)
        
        # Preveri Angel API endpoints
        endpoints = {
            'integration': f'https://{self.domain}/api/angel/integration/status',
            'monitoring': f'https://{self.domain}/monitoring/api/status',
            'tasks': f'https://{self.domain}/api/tasks/status'
        }
        
        for name, url in endpoints.items():
            try:
                response = requests.get(url, timeout=10)
                angel_info['api_responses'][name] = {
                    'status_code': response.status_code,
                    'response_time': response.elapsed.total_seconds() * 1000
                }
            except Exception as e:
                angel_info['api_responses'][name] = {'error': str(e)}
        
        # Preveri WebSocket port za sinhronizacijo
        angel_info['synchronization'] = self.check_port_availability(8084)
        
        return angel_info
    
    def check_backup_monitoring(self):
        """Preveri backup in monitoring sisteme"""
        backup_monitoring = {
            'backup_service': False,
            'backup_timer': False,
            'monitoring_service': False,
            'backup_files_exist': False,
            'monitoring_dashboard': False
        }
        
        # Preveri backup storitve
        backup_monitoring['backup_service'] = self.check_service_status('omni-backup.service')
        
        try:
            result = subprocess.run(['systemctl', 'is-active', 'omni-backup.timer'], 
                                  capture_output=True, text=True)
            backup_monitoring['backup_timer'] = result.stdout.strip() == 'active'
        except:
            pass
        
        # Preveri backup datoteke
        backup_dir = Path('/opt/omni/backups')
        if backup_dir.exists():
            backup_files = list(backup_dir.glob('*.tar.gz'))
            backup_monitoring['backup_files_exist'] = len(backup_files) > 0
        
        # Preveri monitoring dashboard
        try:
            response = requests.get(f'https://{self.domain}/monitoring/', timeout=10)
            backup_monitoring['monitoring_dashboard'] = response.status_code == 200
        except:
            pass
        
        return backup_monitoring
    
    def check_security_features(self):
        """Preveri varnostne funkcionalnosti"""
        security = {
            'firewall_active': False,
            'fail2ban_active': False,
            'nginx_security_headers': False,
            'ssl_grade': None
        }
        
        # Preveri UFW firewall
        try:
            result = subprocess.run(['ufw', 'status'], capture_output=True, text=True)
            security['firewall_active'] = 'Status: active' in result.stdout
        except:
            pass
        
        # Preveri Fail2ban
        security['fail2ban_active'] = self.check_service_status('fail2ban')
        
        # Preveri Nginx security headers
        try:
            response = requests.get(f'https://{self.domain}', timeout=10)
            headers = response.headers
            security_headers = ['X-Frame-Options', 'X-Content-Type-Options', 'X-XSS-Protection']
            security['nginx_security_headers'] = all(header in headers for header in security_headers)
        except:
            pass
        
        return security
    
    def generate_performance_metrics(self):
        """Generiraj performance metrike"""
        performance = {
            'load_average': None,
            'memory_usage': None,
            'disk_usage': None,
            'nginx_status': False
        }
        
        try:
            # Load average
            with open('/proc/loadavg', 'r') as f:
                load_avg = f.read().split()[:3]
                performance['load_average'] = [float(x) for x in load_avg]
        except:
            pass
        
        try:
            # Memory usage
            result = subprocess.run(['free', '-m'], capture_output=True, text=True)
            lines = result.stdout.split('\n')
            mem_line = lines[1].split()
            total_mem = int(mem_line[1])
            used_mem = int(mem_line[2])
            performance['memory_usage'] = {
                'total_mb': total_mem,
                'used_mb': used_mem,
                'percentage': round((used_mem / total_mem) * 100, 2)
            }
        except:
            pass
        
        try:
            # Disk usage
            result = subprocess.run(['df', '-h', '/'], capture_output=True, text=True)
            lines = result.stdout.split('\n')
            disk_line = lines[1].split()
            performance['disk_usage'] = {
                'total': disk_line[1],
                'used': disk_line[2],
                'available': disk_line[3],
                'percentage': disk_line[4]
            }
        except:
            pass
        
        # Nginx status
        performance['nginx_status'] = self.check_service_status('nginx')
        
        return performance
    
    def generate_recommendations(self):
        """Generiraj priporočila za optimizacijo"""
        recommendations = []
        
        # SSL priporočila
        if self.report_data['ssl'].get('days_until_expiry', 0) < 30:
            recommendations.append({
                'type': 'warning',
                'category': 'SSL',
                'message': f"SSL certifikat poteče čez {self.report_data['ssl']['days_until_expiry']} dni"
            })
        
        # Performance priporočila
        if self.report_data['performance'].get('memory_usage', {}).get('percentage', 0) > 80:
            recommendations.append({
                'type': 'warning',
                'category': 'Performance',
                'message': 'Visoka poraba pomnilnika (>80%)'
            })
        
        # Angel sistemi priporočila
        angel_down = []
        for service, status in self.report_data['angel_systems'].items():
            if service.endswith('_service') and not status:
                angel_down.append(service)
        
        if angel_down:
            recommendations.append({
                'type': 'error',
                'category': 'Angel Systems',
                'message': f'Neaktivni Angel sistemi: {", ".join(angel_down)}'
            })
        
        # Backup priporočila
        if not self.report_data['backup_monitoring'].get('backup_files_exist', False):
            recommendations.append({
                'type': 'warning',
                'category': 'Backup',
                'message': 'Ni najdenih backup datotek'
            })
        
        return recommendations
    
    def run_full_assessment(self):
        """Zaženi popolno oceno migracije"""
        print("🔍 Začenjam popolno oceno migracije...")
        
        # Preveri storitve
        print("📋 Preverjam sistemske storitve...")
        services = {
            'omni': self.check_service_status('omni'),
            'nginx': self.check_service_status('nginx'),
            'angel_integration': self.check_service_status('angel-integration'),
            'angel_monitoring': self.check_service_status('angel-monitoring'),
            'angel_tasks': self.check_service_status('angel-tasks')
        }
        self.report_data['services'] = services
        
        # Preveri SSL
        print("🔒 Preverjam SSL certifikat...")
        self.report_data['ssl'] = self.check_ssl_certificate()
        
        # Preveri aplikacijo
        print("🌐 Preverjam zdravje aplikacije...")
        app_health = self.check_application_health()
        self.report_data['application_health'] = app_health
        
        # Preveri Angel sisteme
        print("👼 Preverjam Angel sisteme...")
        self.report_data['angel_systems'] = self.check_angel_systems()
        
        # Preveri backup in monitoring
        print("💾 Preverjam backup in monitoring...")
        self.report_data['backup_monitoring'] = self.check_backup_monitoring()
        
        # Preveri varnost
        print("🛡️ Preverjam varnostne funkcionalnosti...")
        self.report_data['security'] = self.check_security_features()
        
        # Generiraj performance metrike
        print("📊 Generiram performance metrike...")
        self.report_data['performance'] = self.generate_performance_metrics()
        
        # Generiraj priporočila
        print("💡 Generiram priporočila...")
        self.report_data['recommendations'] = self.generate_recommendations()
        
        # Določi splošni status
        self.determine_overall_status()
        
        print("✅ Ocena migracije zaključena!")
        
    def determine_overall_status(self):
        """Določi splošni status migracije"""
        critical_services = ['omni', 'nginx']
        critical_checks = [
            self.report_data['ssl'].get('valid', False),
            self.report_data['application_health'].get('main_app', False),
            all(self.report_data['services'].get(service, False) for service in critical_services)
        ]
        
        if all(critical_checks):
            # Preveri Angel sisteme
            angel_services = ['integration_service', 'monitoring_dashboard', 'task_distribution']
            angel_status = sum(self.report_data['angel_systems'].get(service, False) for service in angel_services)
            
            if angel_status >= 2:  # Vsaj 2 od 3 Angel sistemov
                self.report_data['status'] = 'success'
            else:
                self.report_data['status'] = 'partial_success'
        else:
            self.report_data['status'] = 'failed'
    
    def generate_human_report(self):
        """Generiraj človeku berljivo poročilo"""
        status_emoji = {
            'success': '✅',
            'partial_success': '⚠️',
            'failed': '❌',
            'unknown': '❓'
        }
        
        report = f"""
🚀 OMNI AI PLATFORM - POROČILO O MIGRACIJI
{'='*60}

📅 Datum migracije: {self.report_data['migration_timestamp']}
🌐 Domena: {self.report_data['domain']}
📊 Status: {status_emoji.get(self.report_data['status'], '❓')} {self.report_data['status'].upper()}

{'='*60}
📋 SISTEMSKE STORITVE
{'='*60}
"""
        
        for service, status in self.report_data['services'].items():
            emoji = '✅' if status else '❌'
            report += f"{emoji} {service.replace('_', ' ').title()}: {'Aktivna' if status else 'Neaktivna'}\n"
        
        report += f"""
{'='*60}
🔒 SSL CERTIFIKAT
{'='*60}
"""
        ssl = self.report_data['ssl']
        report += f"✅ Veljavnost: {'Veljaven' if ssl.get('valid') else 'Neveljaven'}\n"
        if ssl.get('issuer'):
            report += f"🏢 Izdajatelj: {ssl['issuer']}\n"
        if ssl.get('days_until_expiry'):
            report += f"📅 Poteče čez: {ssl['days_until_expiry']} dni\n"
        report += f"🔄 HTTPS preusmeritev: {'Da' if ssl.get('https_redirect') else 'Ne'}\n"
        
        report += f"""
{'='*60}
🌐 APLIKACIJA
{'='*60}
"""
        app = self.report_data.get('application_health', {})
        report += f"✅ Glavna aplikacija: {'Deluje' if app.get('main_app') else 'Ne deluje'}\n"
        report += f"🔌 API endpoints: {'Dostopni' if app.get('api_endpoints') else 'Nedostopni'}\n"
        if app.get('response_time'):
            report += f"⚡ Odzivni čas: {app['response_time']} ms\n"
        
        report += f"""
{'='*60}
👼 ANGEL SISTEMI
{'='*60}
"""
        angel = self.report_data['angel_systems']
        angel_services = {
            'integration_service': 'Integration Service',
            'monitoring_dashboard': 'Monitoring Dashboard',
            'task_distribution': 'Task Distribution',
            'synchronization': 'Synchronization (WebSocket)'
        }
        
        for key, name in angel_services.items():
            status = angel.get(key, False)
            emoji = '✅' if status else '❌'
            report += f"{emoji} {name}: {'Aktiven' if status else 'Neaktiven'}\n"
        
        report += f"""
{'='*60}
💾 BACKUP & MONITORING
{'='*60}
"""
        backup = self.report_data['backup_monitoring']
        report += f"✅ Backup storitev: {'Aktivna' if backup.get('backup_service') else 'Neaktivna'}\n"
        report += f"⏰ Backup timer: {'Aktiven' if backup.get('backup_timer') else 'Neaktiven'}\n"
        report += f"📁 Backup datoteke: {'Obstajajo' if backup.get('backup_files_exist') else 'Ne obstajajo'}\n"
        report += f"📊 Monitoring dashboard: {'Dostopen' if backup.get('monitoring_dashboard') else 'Nedostopen'}\n"
        
        report += f"""
{'='*60}
🛡️ VARNOST
{'='*60}
"""
        security = self.report_data['security']
        report += f"🔥 Firewall (UFW): {'Aktiven' if security.get('firewall_active') else 'Neaktiven'}\n"
        report += f"🚫 Fail2ban: {'Aktiven' if security.get('fail2ban_active') else 'Neaktiven'}\n"
        report += f"🛡️ Security headers: {'Nastavljeni' if security.get('nginx_security_headers') else 'Niso nastavljeni'}\n"
        
        report += f"""
{'='*60}
📊 PERFORMANCE
{'='*60}
"""
        perf = self.report_data['performance']
        if perf.get('load_average'):
            report += f"📈 Load average: {' '.join(map(str, perf['load_average']))}\n"
        if perf.get('memory_usage'):
            mem = perf['memory_usage']
            report += f"💾 Pomnilnik: {mem['used_mb']}MB / {mem['total_mb']}MB ({mem['percentage']}%)\n"
        if perf.get('disk_usage'):
            disk = perf['disk_usage']
            report += f"💿 Disk: {disk['used']} / {disk['total']} ({disk['percentage']})\n"
        
        # Priporočila
        if self.report_data['recommendations']:
            report += f"""
{'='*60}
💡 PRIPOROČILA
{'='*60}
"""
            for rec in self.report_data['recommendations']:
                emoji = '⚠️' if rec['type'] == 'warning' else '❌'
                report += f"{emoji} [{rec['category']}] {rec['message']}\n"
        
        # Napake
        if self.report_data['errors']:
            report += f"""
{'='*60}
❌ NAPAKE
{'='*60}
"""
            for error in self.report_data['errors']:
                report += f"❌ {error}\n"
        
        report += f"""
{'='*60}
🎯 POVZETEK
{'='*60}
"""
        
        if self.report_data['status'] == 'success':
            report += """✅ MIGRACIJA USPEŠNA!
Omni AI Platform je uspešno migrirana v oblačno okolje.
Vsi ključni sistemi delujejo pravilno.
"""
        elif self.report_data['status'] == 'partial_success':
            report += """⚠️ MIGRACIJA DELNO USPEŠNA
Glavna aplikacija deluje, vendar nekateri Angel sistemi niso aktivni.
Priporočamo pregled in popravilo neaktivnih storitev.
"""
        else:
            report += """❌ MIGRACIJA NEUSPEŠNA
Kritične napake v sistemu. Potreben je takojšen pregled.
"""
        
        report += f"""
🌐 Dostopne storitve:
   • Glavna aplikacija: https://{self.domain}
   • Monitoring dashboard: https://{self.domain}/monitoring/
   • Angel Integration API: https://{self.domain}/api/angel/integration/

📞 Za podporo kontaktirajte: support@omni-platform.com
"""
        
        return report
    
    def send_email_report(self, smtp_server='localhost', smtp_port=587):
        """Pošlji poročilo po e-pošti"""
        if not self.email:
            return False
        
        try:
            msg = MimeMultipart()
            msg['From'] = f'omni-migration@{self.domain}'
            msg['To'] = self.email
            msg['Subject'] = f'Omni Migration Report - {self.report_data["status"].upper()}'
            
            # Dodaj človeku berljivo poročilo
            human_report = self.generate_human_report()
            msg.attach(MimeText(human_report, 'plain'))
            
            # Dodaj JSON poročilo kot prilogo
            json_report = json.dumps(self.report_data, indent=2)
            json_attachment = MimeText(json_report, 'plain')
            json_attachment.add_header('Content-Disposition', 'attachment', filename='migration-report.json')
            msg.attach(json_attachment)
            
            # Pošlji e-pošto
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.send_message(msg)
            server.quit()
            
            return True
        except Exception as e:
            self.report_data['errors'].append(f"Email sending error: {str(e)}")
            return False
    
    def send_webhook_notification(self):
        """Pošlji webhook obvestilo"""
        if not self.webhook_url:
            return False
        
        try:
            payload = {
                'domain': self.domain,
                'status': self.report_data['status'],
                'timestamp': self.report_data['migration_timestamp'],
                'summary': {
                    'services_active': sum(self.report_data['services'].values()),
                    'ssl_valid': self.report_data['ssl'].get('valid', False),
                    'application_healthy': self.report_data.get('application_health', {}).get('main_app', False),
                    'angel_systems_active': sum(1 for k, v in self.report_data['angel_systems'].items() 
                                               if k.endswith('_service') and v)
                }
            }
            
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            return response.status_code == 200
        except Exception as e:
            self.report_data['errors'].append(f"Webhook error: {str(e)}")
            return False
    
    def save_report(self, filename=None):
        """Shrani poročilo v datoteko"""
        if not filename:
            timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'/opt/omni/migration-report-{timestamp}.json'
        
        try:
            with open(filename, 'w') as f:
                json.dump(self.report_data, f, indent=2)
            return filename
        except Exception as e:
            self.report_data['errors'].append(f"Save report error: {str(e)}")
            return None

def main():
    parser = argparse.ArgumentParser(description='Omni Migration Success Reporter')
    parser.add_argument('--domain', required=True, help='Domain name')
    parser.add_argument('--email', help='Email for notifications')
    parser.add_argument('--webhook', help='Webhook URL for notifications')
    parser.add_argument('--format', choices=['human', 'json', 'both'], default='human',
                       help='Output format')
    parser.add_argument('--save', help='Save report to file')
    parser.add_argument('--send-email', action='store_true', help='Send email report')
    parser.add_argument('--send-webhook', action='store_true', help='Send webhook notification')
    
    args = parser.parse_args()
    
    # Ustvari reporter
    reporter = MigrationSuccessReporter(args.domain, args.email, args.webhook)
    
    # Zaženi oceno
    reporter.run_full_assessment()
    
    # Prikaži poročilo
    if args.format in ['human', 'both']:
        print(reporter.generate_human_report())
    
    if args.format in ['json', 'both']:
        print("\n" + "="*60)
        print("JSON REPORT")
        print("="*60)
        print(json.dumps(reporter.report_data, indent=2))
    
    # Shrani poročilo
    if args.save:
        saved_file = reporter.save_report(args.save)
        if saved_file:
            print(f"\n📁 Poročilo shranjeno: {saved_file}")
    
    # Pošlji e-pošto
    if args.send_email and args.email:
        if reporter.send_email_report():
            print(f"\n📧 E-poštno poročilo poslano na: {args.email}")
        else:
            print(f"\n❌ Napaka pri pošiljanju e-pošte")
    
    # Pošlji webhook
    if args.send_webhook and args.webhook:
        if reporter.send_webhook_notification():
            print(f"\n🔗 Webhook obvestilo poslano")
        else:
            print(f"\n❌ Napaka pri pošiljanju webhook obvestila")
    
    # Exit code glede na status
    exit_codes = {
        'success': 0,
        'partial_success': 1,
        'failed': 2,
        'unknown': 3
    }
    
    sys.exit(exit_codes.get(reporter.report_data['status'], 3))

if __name__ == '__main__':
    main()