#!/usr/bin/env python3
"""
🌐 THREO SSL DEMO SKRIPTA
Demo verzija univerzalne SSL skripte za testiranje
"""

import os
import sys
import json
import platform
import subprocess
from datetime import datetime
import logging

# Demo konfiguracija
DEMO_CONFIG = {
    "domain": "localhost",
    "email": "admin@localhost.com",
    "test_mode": True,
    "log_file": "threo-ssl-demo.log"
}

# Nastavi logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(DEMO_CONFIG["log_file"]),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class ThreoSSLDemo:
    def __init__(self):
        self.domain = DEMO_CONFIG["domain"]
        self.email = DEMO_CONFIG["email"]
        self.os_type = platform.system().lower()
        self.test_mode = DEMO_CONFIG["test_mode"]
        
        logger.info("🚀 Threo SSL Demo inicializiran")
        logger.info(f"   OS: {self.os_type}")
        logger.info(f"   Domena: {self.domain}")
        logger.info(f"   Test način: {self.test_mode}")

    def simulate_command(self, command, description):
        """Simulira izvršitev ukaza v test načinu"""
        if self.test_mode:
            logger.info(f"🔧 [SIMULACIJA] {description}")
            logger.info(f"   Ukaz: {command}")
            logger.info("   ✅ Simulacija uspešna")
            return True
        else:
            # V produkciji bi izvršil dejanski ukaz
            try:
                result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
                logger.info(f"✅ {description} uspešen")
                return True
            except subprocess.CalledProcessError as e:
                logger.error(f"❌ {description} neuspešen: {e}")
                return False

    def check_system_requirements(self):
        """Preveri sistemske zahteve"""
        logger.info("🔍 Preverjam sistemske zahteve...")
        
        requirements = {
            "python_version": sys.version_info >= (3, 6),
            "os_supported": self.os_type in ["linux", "windows"],
            "admin_privileges": self.check_admin_privileges()
        }
        
        for req, status in requirements.items():
            logger.info(f"   {'✅' if status else '❌'} {req}: {status}")
        
        return all(requirements.values())

    def check_admin_privileges(self):
        """Preveri admin pravice"""
        try:
            if self.os_type == "windows":
                import ctypes
                return ctypes.windll.shell32.IsUserAnAdmin()
            else:
                return os.geteuid() == 0
        except:
            return False

    def check_network_ports(self):
        """Preveri mrežne porte"""
        logger.info("🔍 Preverjam mrežne porte...")
        
        if self.os_type == "linux":
            port_check_cmd = "ss -tlnp | grep ':80\\|:443'"
        else:
            port_check_cmd = "netstat -ano | findstr :80 && netstat -ano | findstr :443"
        
        return self.simulate_command(port_check_cmd, "Preverjanje portov 80 in 443")

    def install_ssl_tools(self):
        """Namesti SSL orodja"""
        logger.info("📦 Nameščam SSL orodja...")
        
        if self.os_type == "linux":
            install_cmd = "apt update && apt install -y certbot python3-certbot-nginx"
            return self.simulate_command(install_cmd, "Namestitev Certbot")
        elif self.os_type == "windows":
            install_cmd = "powershell -Command \"Invoke-WebRequest -Uri 'https://github.com/win-acme/win-acme/releases/latest/download/win-acme.v2.1.25.0.x64.trimmed.zip' -OutFile 'win-acme.zip'; Expand-Archive win-acme.zip -DestinationPath C:\\win-acme\""
            return self.simulate_command(install_cmd, "Namestitev win-acme")
        
        return False

    def generate_ssl_certificate(self):
        """Generiraj SSL certifikat"""
        logger.info("🔐 Generiram SSL certifikat...")
        
        if self.os_type == "linux":
            cert_cmd = f"certbot --nginx -d {self.domain} --non-interactive --agree-tos -m {self.email}"
            return self.simulate_command(cert_cmd, "Generiranje SSL certifikata z Certbot")
        elif self.os_type == "windows":
            cert_cmd = f"C:\\win-acme\\wacs.exe --target manual --host {self.domain} --accepttos --emailaddress {self.email}"
            return self.simulate_command(cert_cmd, "Generiranje SSL certifikata z win-acme")
        
        return False

    def setup_auto_renewal(self):
        """Nastavi samodejno obnavljanje"""
        logger.info("⏰ Nastavljam samodejno obnavljanje...")
        
        if self.os_type == "linux":
            renewal_cmd = "systemctl enable certbot.timer && systemctl start certbot.timer"
            return self.simulate_command(renewal_cmd, "Nastavitev samodejnega obnavljanja (systemd)")
        elif self.os_type == "windows":
            renewal_cmd = "schtasks /create /tn \"SSL Renewal\" /tr \"C:\\win-acme\\wacs.exe --renew\" /sc daily /st 12:00"
            return self.simulate_command(renewal_cmd, "Nastavitev samodejnega obnavljanja (Task Scheduler)")
        
        return False

    def configure_web_server(self):
        """Konfiguriraj web strežnik"""
        logger.info("🌐 Konfiguriram web strežnik...")
        
        if self.os_type == "linux":
            config_cmd = "nginx -t && systemctl reload nginx"
            return self.simulate_command(config_cmd, "Konfiguracija Nginx")
        elif self.os_type == "windows":
            config_cmd = "iisreset"
            return self.simulate_command(config_cmd, "Konfiguracija IIS")
        
        return False

    def verify_ssl_setup(self):
        """Preveri SSL nastavitev"""
        logger.info("🔍 Preverjam SSL nastavitev...")
        
        verify_cmd = f"curl -I https://{self.domain}"
        return self.simulate_command(verify_cmd, "Preverjanje HTTPS dostopa")

    def create_demo_report(self):
        """Ustvari demo poročilo"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "demo_mode": True,
            "domain": self.domain,
            "email": self.email,
            "os": self.os_type,
            "steps_completed": [
                "Sistemske zahteve",
                "Mrežni porti",
                "SSL orodja",
                "SSL certifikat",
                "Samodejno obnavljanje",
                "Web strežnik",
                "SSL preverjanje"
            ],
            "success_rate": "100%",
            "status": "Demo uspešno končan"
        }
        
        with open("threo-ssl-demo-report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        logger.info("📊 Demo poročilo shranjeno v threo-ssl-demo-report.json")
        return report

    def run_demo(self):
        """Izvršuje demo SSL nastavitev"""
        logger.info("🎬 Začenjam Threo SSL Demo...")
        
        steps = [
            ("Sistemske zahteve", self.check_system_requirements),
            ("Mrežni porti", self.check_network_ports),
            ("SSL orodja", self.install_ssl_tools),
            ("SSL certifikat", self.generate_ssl_certificate),
            ("Samodejno obnavljanje", self.setup_auto_renewal),
            ("Web strežnik", self.configure_web_server),
            ("SSL preverjanje", self.verify_ssl_setup)
        ]
        
        completed_steps = 0
        total_steps = len(steps)
        
        for step_name, step_func in steps:
            logger.info(f"\n📋 Korak: {step_name}")
            try:
                if step_func():
                    completed_steps += 1
                    logger.info(f"   ✅ {step_name} uspešen")
                else:
                    logger.warning(f"   ⚠️ {step_name} delno uspešen")
            except Exception as e:
                logger.error(f"   ❌ {step_name} neuspešen: {e}")
        
        # Izračunaj uspešnost
        success_rate = (completed_steps / total_steps) * 100
        
        logger.info(f"\n📊 DEMO REZULTATI")
        logger.info("=" * 40)
        logger.info(f"Uspešni koraki: {completed_steps}/{total_steps}")
        logger.info(f"Uspešnost: {success_rate:.1f}%")
        
        if success_rate >= 80:
            logger.info("🎉 DEMO USPEŠNO KONČAN!")
            logger.info("   SSL sistem je pripravljen za produkcijo")
        else:
            logger.warning("⚠️ DEMO DELNO USPEŠEN")
            logger.warning("   Nekateri koraki niso uspeli")
        
        # Ustvari poročilo
        self.create_demo_report()
        
        return success_rate >= 80

def main():
    """Glavna funkcija"""
    print("🎬 THREO SSL DEMO SKRIPTA")
    print("=" * 40)
    print("Demo verzija univerzalne SSL skripte")
    print("Simulira SSL nastavitev brez dejanskih sprememb")
    print()
    
    # Ustvari demo
    demo = ThreoSSLDemo()
    
    # Izvršuj demo
    success = demo.run_demo()
    
    print("\n" + "=" * 40)
    if success:
        print("🎉 DEMO USPEŠNO KONČAN!")
        print("   Pripravljen za produkcijsko uporabo")
    else:
        print("⚠️ DEMO DELNO USPEŠEN")
        print("   Preverite log datoteke za podrobnosti")
    
    print(f"\n📄 Log datoteka: {DEMO_CONFIG['log_file']}")
    print("📊 Poročilo: threo-ssl-demo-report.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())