#!/usr/bin/env python3
"""
🌐 THREO UNIVERZALNA SSL SKRIPTA
Avtomatska namestitev in obnavljanje SSL certifikatov za OMNI-BRAIN
Podpira: Linux (Certbot) + Windows (win-acme)
"""

import os
import sys
import platform
import subprocess
import json
import urllib.request
import zipfile
import shutil
from pathlib import Path
from datetime import datetime
import logging

# Konfiguracija
CONFIG = {
    "domain": "localhost",  # Spremeni na svojo domeno
    "email": "admin@localhost.com",  # Spremeni na svoj email
    "webroot": "/var/www/html",  # Linux webroot
    "win_acme_version": "v2.1.25.0",
    "log_file": "threo-ssl.log"
}

# Nastavi logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(CONFIG["log_file"]),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class ThreoSSLManager:
    def __init__(self, domain=None, email=None):
        self.domain = domain or CONFIG["domain"]
        self.email = email or CONFIG["email"]
        self.os_type = platform.system().lower()
        self.is_admin = self.check_admin_privileges()
        
        logger.info(f"🚀 Threo SSL Manager inicializiran")
        logger.info(f"   OS: {self.os_type}")
        logger.info(f"   Domena: {self.domain}")
        logger.info(f"   Admin pravice: {self.is_admin}")

    def check_admin_privileges(self):
        """Preveri, ali ima skripta admin pravice"""
        try:
            if self.os_type == "windows":
                import ctypes
                return ctypes.windll.shell32.IsUserAnAdmin()
            else:
                return os.geteuid() == 0
        except:
            return False

    def run_command(self, command, shell=True, check=True):
        """Izvršuje sistemske ukaze z error handling"""
        try:
            logger.info(f"🔧 Izvršujem: {command}")
            result = subprocess.run(
                command, 
                shell=shell, 
                check=check, 
                capture_output=True, 
                text=True
            )
            if result.stdout:
                logger.info(f"✅ Izhod: {result.stdout.strip()}")
            return result
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Napaka pri ukazu: {e}")
            logger.error(f"   Stderr: {e.stderr}")
            return None

    def check_ports(self):
        """Preveri odprtost portov 80 in 443"""
        logger.info("🔍 Preverjanje portov 80 in 443...")
        
        if self.os_type == "linux":
            # Linux - uporabi ss ali netstat
            result80 = self.run_command("ss -tlnp | grep ':80 ' || netstat -tlnp | grep ':80 '", check=False)
            result443 = self.run_command("ss -tlnp | grep ':443 ' || netstat -tlnp | grep ':443 '", check=False)
        elif self.os_type == "windows":
            # Windows - uporabi netstat
            result80 = self.run_command("netstat -ano | findstr :80", check=False)
            result443 = self.run_command("netstat -ano | findstr :443", check=False)
        else:
            logger.warning("⚠️ Nepoznan OS - preskačem preverjanje portov")
            return True

        port80_open = result80 and result80.returncode == 0
        port443_open = result443 and result443.returncode == 0
        
        logger.info(f"   Port 80: {'✅ Odprt' if port80_open else '❌ Zaprt'}")
        logger.info(f"   Port 443: {'✅ Odprt' if port443_open else '❌ Zaprt'}")
        
        return {"port80": port80_open, "port443": port443_open}

    def install_dependencies_linux(self):
        """Namesti potrebne odvisnosti na Linux"""
        logger.info("📦 Nameščam odvisnosti za Linux...")
        
        # Posodobi package manager
        self.run_command("apt update -y || yum update -y || dnf update -y", check=False)
        
        # Namesti certbot
        commands = [
            "apt install -y certbot python3-certbot-nginx python3-certbot-apache",
            "yum install -y certbot python3-certbot-nginx python3-certbot-apache",
            "dnf install -y certbot python3-certbot-nginx python3-certbot-apache"
        ]
        
        for cmd in commands:
            result = self.run_command(cmd, check=False)
            if result and result.returncode == 0:
                logger.info("✅ Certbot uspešno nameščen")
                return True
        
        logger.error("❌ Napaka pri namestitvi Certbot")
        return False

    def install_dependencies_windows(self):
        """Namesti win-acme na Windows"""
        logger.info("📦 Nameščam win-acme za Windows...")
        
        win_acme_dir = Path("C:/win-acme")
        win_acme_zip = "win-acme.zip"
        
        try:
            # Ustvari direktorij
            win_acme_dir.mkdir(exist_ok=True)
            
            # Prenesi win-acme
            url = f"https://github.com/win-acme/win-acme/releases/latest/download/win-acme.{CONFIG['win_acme_version']}.x64.trimmed.zip"
            logger.info(f"📥 Prenašam win-acme iz: {url}")
            
            urllib.request.urlretrieve(url, win_acme_zip)
            
            # Razpakuj
            with zipfile.ZipFile(win_acme_zip, 'r') as zip_ref:
                zip_ref.extractall(win_acme_dir)
            
            # Počisti
            os.remove(win_acme_zip)
            
            logger.info("✅ win-acme uspešno nameščen")
            return True
            
        except Exception as e:
            logger.error(f"❌ Napaka pri namestitvi win-acme: {e}")
            return False

    def generate_certificate_linux(self):
        """Generiraj SSL certifikat z Certbot na Linux"""
        logger.info("🔐 Generiram SSL certifikat z Certbot...")
        
        # Poskusi različne načine
        commands = [
            f"certbot --nginx -d {self.domain} --non-interactive --agree-tos -m {self.email}",
            f"certbot --apache -d {self.domain} --non-interactive --agree-tos -m {self.email}",
            f"certbot certonly --webroot -w {CONFIG['webroot']} -d {self.domain} --non-interactive --agree-tos -m {self.email}",
            f"certbot certonly --standalone -d {self.domain} --non-interactive --agree-tos -m {self.email}"
        ]
        
        for cmd in commands:
            result = self.run_command(cmd, check=False)
            if result and result.returncode == 0:
                logger.info("✅ SSL certifikat uspešno generiran")
                return True
        
        logger.error("❌ Napaka pri generiranju SSL certifikata")
        return False

    def generate_certificate_windows(self):
        """Generiraj SSL certifikat z win-acme na Windows"""
        logger.info("🔐 Generiram SSL certifikat z win-acme...")
        
        wacs_exe = Path("C:/win-acme/wacs.exe")
        if not wacs_exe.exists():
            logger.error("❌ win-acme ni nameščen")
            return False
        
        # Generiraj certifikat
        cmd = f'"{wacs_exe}" --target manual --host {self.domain} --accepttos --emailaddress {self.email} --notaskscheduler'
        result = self.run_command(cmd, check=False)
        
        if result and result.returncode == 0:
            logger.info("✅ SSL certifikat uspešno generiran")
            return True
        else:
            logger.error("❌ Napaka pri generiranju SSL certifikata")
            return False

    def setup_auto_renewal_linux(self):
        """Nastavi samodejno obnavljanje na Linux"""
        logger.info("⏰ Nastavljam samodejno obnavljanje certifikatov...")
        
        # Omogoči certbot timer
        commands = [
            "systemctl enable certbot.timer",
            "systemctl start certbot.timer",
            "systemctl status certbot.timer"
        ]
        
        for cmd in commands:
            self.run_command(cmd, check=False)
        
        # Dodaj cron job kot backup
        cron_job = f"0 12 * * * /usr/bin/certbot renew --quiet"
        self.run_command(f'(crontab -l 2>/dev/null; echo "{cron_job}") | crontab -', check=False)
        
        logger.info("✅ Samodejno obnavljanje nastavljeno")
        return True

    def setup_auto_renewal_windows(self):
        """Nastavi samodejno obnavljanje na Windows"""
        logger.info("⏰ Nastavljam samodejno obnavljanje certifikatov...")
        
        # Ustvari PowerShell skripto za obnavljanje
        renewal_script = f"""
# Threo SSL Auto-Renewal Script
$logFile = "C:\\win-acme\\renewal.log"
$date = Get-Date
Add-Content $logFile "[$date] Zagon obnavljanja SSL certifikata"

try {{
    & "C:\\win-acme\\wacs.exe" --renew --baseuri https://acme-v02.api.letsencrypt.org/
    Add-Content $logFile "[$date] Obnavljanje uspešno"
}} catch {{
    Add-Content $logFile "[$date] Napaka pri obnavljanju: $_"
}}
"""
        
        script_path = "C:/win-acme/renewal.ps1"
        with open(script_path, 'w') as f:
            f.write(renewal_script)
        
        # Ustvari scheduled task
        task_cmd = f'''schtasks /create /tn "Threo SSL Renewal" /tr "powershell.exe -ExecutionPolicy Bypass -File {script_path}" /sc daily /st 12:00 /f'''
        result = self.run_command(task_cmd, check=False)
        
        if result and result.returncode == 0:
            logger.info("✅ Samodejno obnavljanje nastavljeno")
            return True
        else:
            logger.error("❌ Napaka pri nastavitvi samodejnega obnavljanja")
            return False

    def verify_ssl_certificate(self):
        """Preveri veljavnost SSL certifikata"""
        logger.info("🔍 Preverjam SSL certifikat...")
        
        try:
            import ssl
            import socket
            
            context = ssl.create_default_context()
            with socket.create_connection((self.domain, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=self.domain) as ssock:
                    cert = ssock.getpeercert()
                    
            logger.info("✅ SSL certifikat je veljaven")
            logger.info(f"   Izdajatelj: {cert.get('issuer', 'Neznano')}")
            logger.info(f"   Velja do: {cert.get('notAfter', 'Neznano')}")
            return True
            
        except Exception as e:
            logger.error(f"❌ SSL certifikat ni veljaven: {e}")
            return False

    def create_status_report(self):
        """Ustvari poročilo o stanju SSL"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "domain": self.domain,
            "os": self.os_type,
            "admin_privileges": self.is_admin,
            "ports": self.check_ports(),
            "ssl_valid": False
        }
        
        # Preveri SSL
        try:
            report["ssl_valid"] = self.verify_ssl_certificate()
        except:
            pass
        
        # Shrani poročilo
        with open("threo-ssl-report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        logger.info("📊 Poročilo shranjeno v threo-ssl-report.json")
        return report

    def run_full_setup(self):
        """Izvršuje popolno SSL nastavitev"""
        logger.info("🚀 Začenjam popolno SSL nastavitev za Threo...")
        
        if not self.is_admin:
            logger.error("❌ Potrebne so admin pravice!")
            return False
        
        # Preveri porte
        self.check_ports()
        
        success = False
        
        if self.os_type == "linux":
            logger.info("🐧 Linux sistem zaznan - uporabljam Certbot")
            if (self.install_dependencies_linux() and 
                self.generate_certificate_linux() and 
                self.setup_auto_renewal_linux()):
                success = True
                
        elif self.os_type == "windows":
            logger.info("🪟 Windows sistem zaznan - uporabljam win-acme")
            if (self.install_dependencies_windows() and 
                self.generate_certificate_windows() and 
                self.setup_auto_renewal_windows()):
                success = True
        else:
            logger.error(f"❌ Nepodprt OS: {self.os_type}")
            return False
        
        if success:
            logger.info("🎉 SSL nastavitev uspešno končana!")
            logger.info(f"   Domena {self.domain} je sedaj dostopna preko HTTPS")
            logger.info("   Samodejno obnavljanje je nastavljeno")
        else:
            logger.error("❌ SSL nastavitev neuspešna")
        
        # Ustvari poročilo
        self.create_status_report()
        
        return success

def main():
    """Glavna funkcija"""
    print("🌐 THREO UNIVERZALNA SSL SKRIPTA")
    print("=" * 40)
    
    # Preberi argumente iz ukazne vrstice
    domain = input("Vnesite domeno (ali pritisnite Enter za localhost): ").strip()
    if not domain:
        domain = CONFIG["domain"]
    
    email = input("Vnesite email (ali pritisnite Enter za privzeto): ").strip()
    if not email:
        email = CONFIG["email"]
    
    # Ustvari SSL manager
    ssl_manager = ThreoSSLManager(domain=domain, email=email)
    
    # Izvršuj nastavitev
    success = ssl_manager.run_full_setup()
    
    if success:
        print("\n🎉 SSL USPEŠNO NAMEŠČEN!")
        print(f"   Vaša domena {domain} je sedaj varna")
        print("   Certifikat se bo samodejno obnovil")
    else:
        print("\n❌ SSL NAMESTITEV NEUSPEŠNA")
        print("   Preverite log datoteko za podrobnosti")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())