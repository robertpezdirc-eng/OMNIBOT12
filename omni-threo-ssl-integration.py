#!/usr/bin/env python3
"""
🔐 OMNI THREO SSL INTEGRATION
Integracija Threo SSL sistema z oblačno namestitvijo Omni
Avtomatska namestitev, konfiguracija in obnavljanje SSL certifikatov
"""

import os
import sys
import json
import subprocess
import time
import requests
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

class OmniThreoSSLIntegrator:
    def __init__(self, config_file: str = "omni-cloud-config.json"):
        self.config_file = config_file
        self.config = {}
        self.ssl_config = {}
        self.threo_dir = "/opt/threo-ssl"
        self.nginx_dir = "/etc/nginx"
        self.ssl_dir = "/etc/letsencrypt/live"
        self.log_file = f"threo-ssl-integration-{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        self.status_file = "/var/log/omni-ssl-status.json"
        
    def log(self, message: str, level: str = "INFO"):
        """Logging funkcija"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}"
        print(log_entry)
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry + '\n')
    
    def error(self, message: str):
        """Error logging in exit"""
        self.log(message, "ERROR")
        sys.exit(1)
    
    def run_command(self, command: str, check: bool = True, timeout: int = 300) -> subprocess.CompletedProcess:
        """Izvršitev sistemskega ukaza"""
        self.log(f"Izvršujem: {command}")
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                check=check,
                timeout=timeout
            )
            if result.stdout:
                self.log(f"Output: {result.stdout.strip()}")
            if result.stderr and result.returncode != 0:
                self.log(f"Error: {result.stderr.strip()}", "ERROR")
            return result
        except subprocess.TimeoutExpired:
            self.error(f"Ukaz '{command}' je presegel časovno omejitev ({timeout}s)")
        except subprocess.CalledProcessError as e:
            if check:
                self.error(f"Napaka pri ukazu '{command}': {e}")
            return e
    
    def load_config(self):
        """Naloži konfiguracijo"""
        if not os.path.exists(self.config_file):
            self.error(f"Konfiguracija {self.config_file} ne obstaja")
        
        with open(self.config_file, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.ssl_config = self.config.get('ssl', {})
        self.log(f"Konfiguracija naložena iz {self.config_file}")
    
    def check_prerequisites(self):
        """Preveri predpogoje za SSL integracijo"""
        self.log("🔍 Preverjam predpogoje za SSL integracijo...")
        
        # Preveri root pravice
        if os.geteuid() != 0:
            self.error("Ta skripta mora biti zagnana kot root (sudo)")
        
        # Preveri Python odvisnosti
        required_packages = ['requests', 'cryptography']
        for package in required_packages:
            try:
                __import__(package)
            except ImportError:
                self.log(f"Nameščam Python paket: {package}")
                self.run_command(f"pip3 install {package}")
        
        # Preveri sistemske pakete
        system_packages = ['openssl', 'curl', 'wget']
        for package in system_packages:
            result = self.run_command(f"which {package}", check=False)
            if result.returncode != 0:
                self.log(f"Nameščam sistemski paket: {package}")
                self.run_command(f"apt-get update && apt-get install -y {package}")
        
        self.log("✅ Predpogoji izpolnjeni")
    
    def setup_threo_ssl_environment(self):
        """Nastavi Threo SSL okolje"""
        self.log("🔧 Nastavljam Threo SSL okolje...")
        
        # Ustvari Threo direktorij
        os.makedirs(self.threo_dir, exist_ok=True)
        
        # Kopiraj Threo SSL skripte
        threo_files = [
            "threo-universal-ssl.py",
            "threo-ssl-config.json",
            "threo-ssl-test.py"
        ]
        
        for file in threo_files:
            if os.path.exists(file):
                shutil.copy2(file, f"{self.threo_dir}/{file}")
                self.log(f"✅ Kopiran: {file}")
        
        # Ustvari Threo konfiguracijsko datoteko za oblačno uporabo
        threo_config = {
            "domains": [self.config['general']['domain']],
            "email": self.ssl_config.get('cert_email', self.config['general']['email']),
            "staging": self.ssl_config.get('staging', False),
            "auto_renew": self.ssl_config.get('auto_renew', True),
            "backup_certs": self.ssl_config.get('backup_certs', True),
            "key_size": self.ssl_config.get('key_size', 4096),
            "webroot_path": "/var/www/html",
            "nginx_reload": True,
            "post_hook_commands": [
                "systemctl reload nginx",
                f"python3 {self.threo_dir}/update-nginx-ssl.py"
            ]
        }
        
        with open(f"{self.threo_dir}/cloud-ssl-config.json", 'w') as f:
            json.dump(threo_config, f, indent=2)
        
        self.log("✅ Threo SSL okolje nastavljeno")
    
    def install_certbot(self):
        """Namesti Certbot za Let's Encrypt"""
        self.log("📦 Nameščam Certbot...")
        
        # Preveri, ali je Certbot že nameščen
        result = self.run_command("certbot --version", check=False)
        if result.returncode == 0:
            self.log("✅ Certbot je že nameščen")
            return
        
        # Namesti Certbot
        commands = [
            "apt-get update",
            "apt-get install -y snapd",
            "snap install core; snap refresh core",
            "snap install --classic certbot",
            "ln -sf /snap/bin/certbot /usr/bin/certbot"
        ]
        
        for cmd in commands:
            self.run_command(cmd)
        
        # Preveri namestitev
        result = self.run_command("certbot --version", check=False)
        if result.returncode == 0:
            self.log("✅ Certbot uspešno nameščen")
        else:
            self.error("❌ Napaka pri namestitvi Certbot")
    
    def prepare_webroot(self):
        """Pripravi webroot za Let's Encrypt validacijo"""
        self.log("🌐 Pripravljam webroot za SSL validacijo...")
        
        webroot_dir = "/var/www/html"
        acme_dir = f"{webroot_dir}/.well-known/acme-challenge"
        
        # Ustvari direktorije
        os.makedirs(acme_dir, exist_ok=True)
        
        # Nastavi pravice
        self.run_command(f"chown -R www-data:www-data {webroot_dir}")
        self.run_command(f"chmod -R 755 {webroot_dir}")
        
        # Ustvari test datoteko
        test_file = f"{acme_dir}/test"
        with open(test_file, 'w') as f:
            f.write("SSL validation test")
        
        self.log("✅ Webroot pripravljen")
    
    def test_domain_accessibility(self, domain: str) -> bool:
        """Testiraj dostopnost domene"""
        self.log(f"🔍 Testiram dostopnost domene: {domain}")
        
        try:
            # Testiraj HTTP dostop
            response = requests.get(f"http://{domain}/.well-known/acme-challenge/test", timeout=10)
            if response.status_code == 200:
                self.log("✅ Domena je dostopna preko HTTP")
                return True
            else:
                self.log(f"⚠️ HTTP status: {response.status_code}")
                return False
        except Exception as e:
            self.log(f"❌ Napaka pri dostopu do domene: {e}")
            return False
    
    def obtain_ssl_certificate(self, domain: str) -> bool:
        """Pridobi SSL certifikat za domeno"""
        self.log(f"🔐 Pridobivam SSL certifikat za: {domain}")
        
        email = self.ssl_config.get('cert_email', self.config['general']['email'])
        staging = self.ssl_config.get('staging', False)
        
        # Sestavi Certbot ukaz
        certbot_cmd = [
            "certbot", "certonly",
            "--webroot",
            "-w", "/var/www/html",
            "-d", domain,
            "--email", email,
            "--agree-tos",
            "--non-interactive",
            "--no-eff-email"
        ]
        
        if staging:
            certbot_cmd.append("--staging")
        
        # Izvršitev Certbot ukaza
        result = self.run_command(" ".join(certbot_cmd), check=False)
        
        if result.returncode == 0:
            self.log("✅ SSL certifikat uspešno pridobljen")
            return True
        else:
            self.log("❌ Napaka pri pridobivanju SSL certifikata")
            return False
    
    def update_nginx_ssl_config(self, domain: str):
        """Posodobi Nginx konfiguracijsko datoteko z SSL nastavitvami"""
        self.log(f"🔧 Posodabljam Nginx SSL konfiguracijsko datoteko za: {domain}")
        
        # Uvozi Nginx konfigurator
        sys.path.append('.')
        try:
            from omni_nginx_auto_config import OmniNginxConfigurator
            
            configurator = OmniNginxConfigurator(self.config_file)
            configurator.load_config()
            configurator.update_ssl_config(domain)
            
            self.log("✅ Nginx SSL konfiguracija posodobljena")
        except Exception as e:
            self.log(f"⚠️ Napaka pri posodobitvi Nginx konfiguracije: {e}")
            
            # Ročna posodobitev
            self.manual_nginx_ssl_update(domain)
    
    def manual_nginx_ssl_update(self, domain: str):
        """Ročna posodobitev Nginx SSL konfiguracije"""
        self.log("🔧 Izvajam ročno posodobitev Nginx SSL konfiguracije...")
        
        site_config_path = f"/etc/nginx/sites-available/{domain}"
        
        if not os.path.exists(site_config_path):
            self.log(f"⚠️ Nginx site konfiguracija ne obstaja: {site_config_path}")
            return
        
        # Preberi obstoječo konfiguracijsko datoteko
        with open(site_config_path, 'r') as f:
            config_content = f.read()
        
        # Zamenjaj SSL certifikat poti
        ssl_cert_path = f"/etc/letsencrypt/live/{domain}/fullchain.pem"
        ssl_key_path = f"/etc/letsencrypt/live/{domain}/privkey.pem"
        
        # Zamenjaj snakeoil certifikate z Let's Encrypt certifikati
        config_content = config_content.replace(
            "ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;",
            f"ssl_certificate {ssl_cert_path};"
        )
        config_content = config_content.replace(
            "ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;",
            f"ssl_certificate_key {ssl_key_path};"
        )
        
        # Dodaj trusted certificate
        if "ssl_trusted_certificate" not in config_content:
            ssl_trusted_line = f"    ssl_trusted_certificate /etc/letsencrypt/live/{domain}/chain.pem;"
            config_content = config_content.replace(
                f"ssl_certificate_key {ssl_key_path};",
                f"ssl_certificate_key {ssl_key_path};\n{ssl_trusted_line}"
            )
        
        # Zapiši posodobljeno konfiguracijsko datoteko
        with open(site_config_path, 'w') as f:
            f.write(config_content)
        
        # Testiraj in ponovno naloži Nginx
        result = self.run_command("nginx -t", check=False)
        if result.returncode == 0:
            self.run_command("systemctl reload nginx")
            self.log("✅ Nginx SSL konfiguracija ročno posodobljena")
        else:
            self.error("❌ Napaka v Nginx konfiguraciji")
    
    def setup_auto_renewal(self):
        """Nastavi avtomatsko obnavljanje SSL certifikatov"""
        self.log("⏰ Nastavljam avtomatsko obnavljanje SSL certifikatov...")
        
        # Ustvari renewal skripto
        renewal_script = f"""#!/bin/bash
# Omni SSL Certificate Auto-Renewal Script
# Generated: {datetime.now().isoformat()}

LOG_FILE="/var/log/omni-ssl-renewal.log"
DOMAIN="{self.config['general']['domain']}"

echo "[$(date)] Starting SSL certificate renewal check..." >> "$LOG_FILE"

# Obnovi certifikate
certbot renew --quiet --no-self-upgrade >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date)] Certificate renewal check completed successfully" >> "$LOG_FILE"
    
    # Ponovno naloži Nginx
    systemctl reload nginx >> "$LOG_FILE" 2>&1
    
    # Posodobi status
    python3 {self.threo_dir}/update-ssl-status.py >> "$LOG_FILE" 2>&1
    
    echo "[$(date)] Nginx reloaded and status updated" >> "$LOG_FILE"
else
    echo "[$(date)] Certificate renewal failed" >> "$LOG_FILE"
    exit 1
fi
"""
        
        renewal_script_path = f"{self.threo_dir}/ssl-auto-renewal.sh"
        with open(renewal_script_path, 'w') as f:
            f.write(renewal_script)
        
        # Nastavi pravice
        os.chmod(renewal_script_path, 0o755)
        
        # Dodaj v crontab
        cron_entry = f"0 2 * * * {renewal_script_path}"
        
        # Preveri obstoječi crontab
        result = self.run_command("crontab -l", check=False)
        existing_cron = result.stdout if result.returncode == 0 else ""
        
        if renewal_script_path not in existing_cron:
            new_cron = existing_cron + f"\n{cron_entry}\n"
            
            # Nastavi novi crontab
            process = subprocess.Popen(['crontab', '-'], stdin=subprocess.PIPE, text=True)
            process.communicate(input=new_cron)
            
            self.log("✅ Avtomatsko obnavljanje nastavljeno (cron)")
        else:
            self.log("✅ Avtomatsko obnavljanje je že nastavljeno")
    
    def create_ssl_status_updater(self):
        """Ustvari skripto za posodabljanje SSL statusa"""
        status_updater = f"""#!/usr/bin/env python3
# SSL Status Updater for Omni
import json
import os
import subprocess
from datetime import datetime
from cryptography import x509
from cryptography.hazmat.backends import default_backend

def get_cert_info(cert_path):
    try:
        with open(cert_path, 'rb') as f:
            cert_data = f.read()
        
        cert = x509.load_pem_x509_certificate(cert_data, default_backend())
        
        return {{
            "subject": str(cert.subject),
            "issuer": str(cert.issuer),
            "not_before": cert.not_valid_before.isoformat(),
            "not_after": cert.not_valid_after.isoformat(),
            "serial_number": str(cert.serial_number),
            "days_until_expiry": (cert.not_valid_after - datetime.now()).days
        }}
    except Exception as e:
        return {{"error": str(e)}}

def main():
    domain = "{self.config['general']['domain']}"
    cert_path = f"/etc/letsencrypt/live/{{domain}}/fullchain.pem"
    
    status = {{
        "timestamp": datetime.now().isoformat(),
        "domain": domain,
        "ssl_enabled": os.path.exists(cert_path),
        "certificate_info": get_cert_info(cert_path) if os.path.exists(cert_path) else None,
        "nginx_status": "unknown",
        "last_renewal_check": datetime.now().isoformat()
    }}
    
    # Preveri Nginx status
    try:
        result = subprocess.run(["systemctl", "is-active", "nginx"], 
                              capture_output=True, text=True)
        status["nginx_status"] = result.stdout.strip()
    except:
        pass
    
    # Shrani status
    with open("{self.status_file}", 'w') as f:
        json.dump(status, f, indent=2)

if __name__ == "__main__":
    main()
"""
        
        status_updater_path = f"{self.threo_dir}/update-ssl-status.py"
        with open(status_updater_path, 'w') as f:
            f.write(status_updater)
        
        os.chmod(status_updater_path, 0o755)
        
        # Zaženi prvič
        self.run_command(f"python3 {status_updater_path}")
        
        self.log("✅ SSL status updater ustvarjen")
    
    def verify_ssl_installation(self, domain: str) -> bool:
        """Preveri uspešnost SSL namestitve"""
        self.log(f"🔍 Preverjam SSL namestitev za: {domain}")
        
        try:
            # Počakaj malo, da se Nginx ponovno naloži
            time.sleep(5)
            
            # Testiraj HTTPS dostop
            response = requests.get(f"https://{domain}", timeout=30, verify=True)
            
            if response.status_code == 200:
                self.log("✅ HTTPS dostop deluje")
                
                # Preveri SSL certifikat
                cert_info = response.raw.connection.sock.getpeercert()
                if cert_info:
                    self.log(f"✅ SSL certifikat: {cert_info.get('subject', 'N/A')}")
                    return True
            
        except requests.exceptions.SSLError as e:
            self.log(f"❌ SSL napaka: {e}")
        except Exception as e:
            self.log(f"❌ Napaka pri preverjanju: {e}")
        
        return False
    
    def create_ssl_monitoring_dashboard(self):
        """Ustvari SSL monitoring dashboard"""
        dashboard_html = f"""<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Omni SSL Status Dashboard</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .status {{ padding: 10px; margin: 10px 0; border-radius: 4px; }}
        .status.ok {{ background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }}
        .status.warning {{ background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }}
        .status.error {{ background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }}
        .refresh {{ background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }}
        .refresh:hover {{ background: #0056b3; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Omni SSL Status Dashboard</h1>
        <button class="refresh" onclick="location.reload()">Osveži</button>
        
        <div id="status-container">
            <p>Nalagam SSL status...</p>
        </div>
    </div>
    
    <script>
        async function loadSSLStatus() {{
            try {{
                const response = await fetch('/api/ssl-status');
                const data = await response.json();
                
                const container = document.getElementById('status-container');
                container.innerHTML = `
                    <div class="status ${{data.ssl_enabled ? 'ok' : 'error'}}">
                        <strong>SSL Status:</strong> ${{data.ssl_enabled ? 'Omogočen' : 'Onemogočen'}}
                    </div>
                    <div class="status ok">
                        <strong>Domena:</strong> ${{data.domain}}
                    </div>
                    <div class="status ok">
                        <strong>Zadnja posodobitev:</strong> ${{new Date(data.timestamp).toLocaleString('sl-SI')}}
                    </div>
                    ${{data.certificate_info ? `
                        <div class="status ok">
                            <strong>Certifikat poteče:</strong> ${{new Date(data.certificate_info.not_after).toLocaleString('sl-SI')}}
                        </div>
                        <div class="status ${{data.certificate_info.days_until_expiry > 30 ? 'ok' : 'warning'}}">
                            <strong>Dni do poteka:</strong> ${{data.certificate_info.days_until_expiry}}
                        </div>
                    ` : ''}}
                `;
            }} catch (error) {{
                document.getElementById('status-container').innerHTML = 
                    '<div class="status error">Napaka pri nalaganju SSL statusa</div>';
            }}
        }}
        
        loadSSLStatus();
        setInterval(loadSSLStatus, 60000); // Osveži vsako minuto
    </script>
</body>
</html>"""
        
        dashboard_path = "/var/www/html/ssl-dashboard.html"
        with open(dashboard_path, 'w') as f:
            f.write(dashboard_html)
        
        self.log("✅ SSL monitoring dashboard ustvarjen")
    
    def integrate_ssl_with_omni(self):
        """Glavna funkcija za integracijo SSL z Omni"""
        domain = self.config['general']['domain']
        
        self.log(f"🚀 Začenjam SSL integracijo za domeno: {domain}")
        
        # Preveri predpogoje
        self.check_prerequisites()
        
        # Nastavi Threo SSL okolje
        self.setup_threo_ssl_environment()
        
        # Namesti Certbot
        self.install_certbot()
        
        # Pripravi webroot
        self.prepare_webroot()
        
        # Testiraj dostopnost domene
        if not self.test_domain_accessibility(domain):
            self.log("⚠️ Domena ni dostopna, poskušam vseeno...")
        
        # Pridobi SSL certifikat
        ssl_success = self.obtain_ssl_certificate(domain)
        
        if ssl_success:
            # Posodobi Nginx konfiguracijsko datoteko
            self.update_nginx_ssl_config(domain)
            
            # Nastavi avtomatsko obnavljanje
            self.setup_auto_renewal()
            
            # Ustvari status updater
            self.create_ssl_status_updater()
            
            # Ustvari monitoring dashboard
            self.create_ssl_monitoring_dashboard()
            
            # Preveri SSL namestitev
            if self.verify_ssl_installation(domain):
                self.log("🎉 SSL INTEGRACIJA USPEŠNO KONČANA!")
                return True
            else:
                self.log("⚠️ SSL integracija končana, vendar preverjanje ni uspešno")
                return False
        else:
            self.log("❌ SSL integracija neuspešna")
            return False
    
    def generate_integration_report(self, success: bool) -> Dict:
        """Generiraj poročilo o SSL integraciji"""
        domain = self.config['general']['domain']
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "domain": domain,
            "integration_success": success,
            "ssl_certificate_exists": os.path.exists(f"{self.ssl_dir}/{domain}/fullchain.pem"),
            "nginx_config_updated": os.path.exists(f"/etc/nginx/sites-available/{domain}"),
            "auto_renewal_setup": os.path.exists(f"{self.threo_dir}/ssl-auto-renewal.sh"),
            "monitoring_dashboard": os.path.exists("/var/www/html/ssl-dashboard.html"),
            "log_file": self.log_file,
            "status_file": self.status_file
        }
        
        return report

def main():
    """Glavna funkcija"""
    if len(sys.argv) > 1 and sys.argv[1] == "--status-only":
        # Samo posodobi status
        integrator = OmniThreoSSLIntegrator()
        integrator.load_config()
        integrator.create_ssl_status_updater()
        return
    
    integrator = OmniThreoSSLIntegrator()
    
    try:
        integrator.load_config()
        success = integrator.integrate_ssl_with_omni()
        
        # Generiraj poročilo
        report = integrator.generate_integration_report(success)
        
        report_file = f"ssl-integration-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        integrator.log(f"📊 Poročilo shranjeno: {report_file}")
        
        if success:
            integrator.log(f"🌐 Omni je sedaj dostopen na: https://{integrator.config['general']['domain']}")
            integrator.log(f"📊 SSL dashboard: https://{integrator.config['general']['domain']}/ssl-dashboard.html")
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        integrator.log("SSL integracija prekinjena s strani uporabnika")
        sys.exit(1)
    except Exception as e:
        integrator.error(f"Nepričakovana napaka: {e}")

if __name__ == "__main__":
    main()