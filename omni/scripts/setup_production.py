#!/usr/bin/env python3
"""
Production Setup Script
Omni AI Platform - Skripta za nastavitev produkcijskega IoT okolja

Funkcionalnosti:
- Avtomatska konfiguracija produkcijskega okolja
- Generiranje varnih ključev
- Validacija nastavitev
- Kreiranje potrebnih direktorijev
- Nastavitev permissions
- Backup konfiguracije

Avtor: Omni AI Platform
Verzija: 1.0
"""

import os
import sys
import json
import yaml
import secrets
import hashlib
import subprocess
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import logging

# Nastavi logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProductionSetup:
    """Upravljalnik za nastavitev produkcijskega okolja"""
    
    def __init__(self, base_dir: Optional[str] = None):
        """
        Inicializacija
        
        Args:
            base_dir: Osnovna mapa projekta
        """
        self.base_dir = Path(base_dir) if base_dir else Path(__file__).parent.parent
        self.config_dir = self.base_dir / "config"
        self.logs_dir = self.base_dir / "logs"
        self.data_dir = self.base_dir / "data"
        self.backup_dir = self.base_dir / "backups"
        
        # Datoteke
        self.env_template = self.config_dir / ".env.template"
        self.env_file = self.config_dir / ".env"
        self.production_config = self.config_dir / "iot_production.yaml"
        
        logger.info(f"Production Setup inicializiran v: {self.base_dir}")
    
    def check_prerequisites(self) -> bool:
        """Preveri predpogoje za produkcijsko namestitev"""
        logger.info("Preverjam predpogoje...")
        
        issues = []
        
        # Preveri Python verzijo
        if sys.version_info < (3, 8):
            issues.append(f"Python 3.8+ je potreben, trenutna verzija: {sys.version}")
        
        # Preveri potrebne pakete
        required_packages = [
            "paho-mqtt", "flask", "pyjwt", "cryptography", 
            "pyyaml", "redis", "psycopg2-binary"
        ]
        
        for package in required_packages:
            try:
                __import__(package.replace("-", "_"))
            except ImportError:
                issues.append(f"Manjka paket: {package}")
        
        # Preveri konfiguracijske datoteke
        if not self.production_config.exists():
            issues.append(f"Manjka produkcijska konfiguracija: {self.production_config}")
        
        if not self.env_template.exists():
            issues.append(f"Manjka .env predloga: {self.env_template}")
        
        # Preveri permissions
        if os.name != 'nt':  # Unix/Linux
            try:
                # Preveri write permissions
                test_file = self.base_dir / "test_write"
                test_file.touch()
                test_file.unlink()
            except PermissionError:
                issues.append(f"Ni write permissions v: {self.base_dir}")
        
        if issues:
            logger.error("Najdene težave:")
            for issue in issues:
                logger.error(f"  - {issue}")
            return False
        
        logger.info("Vsi predpogoji izpolnjeni ✓")
        return True
    
    def create_directories(self):
        """Ustvari potrebne direktorije"""
        logger.info("Ustvarjam direktorije...")
        
        directories = [
            self.config_dir,
            self.logs_dir,
            self.data_dir,
            self.backup_dir,
            self.logs_dir / "audit",
            self.data_dir / "devices",
            self.data_dir / "certificates"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            logger.info(f"  ✓ {directory}")
        
        # Nastavi permissions (Unix/Linux)
        if os.name != 'nt':
            for directory in directories:
                os.chmod(directory, 0o755)
            
            # Posebne permissions za sensitive direktorije
            os.chmod(self.config_dir, 0o750)
            os.chmod(self.data_dir / "certificates", 0o700)
    
    def generate_secure_keys(self) -> Dict[str, str]:
        """Generiraj varne ključe"""
        logger.info("Generiram varne ključe...")
        
        keys = {}
        
        # JWT Secret Key
        keys['JWT_SECRET_KEY'] = secrets.token_urlsafe(32)
        
        # API Admin Key
        keys['API_ADMIN_KEY'] = secrets.token_urlsafe(32)
        
        # Session Secret Key
        keys['SESSION_SECRET_KEY'] = secrets.token_urlsafe(32)
        
        # Encryption Key (Fernet compatible)
        try:
            from cryptography.fernet import Fernet
            keys['ENCRYPTION_KEY'] = Fernet.generate_key().decode()
        except ImportError:
            logger.warning("Cryptography paket ni na voljo, generiram osnovni ključ")
            keys['ENCRYPTION_KEY'] = secrets.token_urlsafe(32)
        
        # MQTT Password
        keys['MQTT_PASSWORD'] = self._generate_strong_password(16)
        
        # Database Password
        keys['DB_PASSWORD'] = self._generate_strong_password(16)
        
        # Redis Password
        keys['REDIS_PASSWORD'] = self._generate_strong_password(16)
        
        logger.info("Ključi uspešno generirani ✓")
        return keys
    
    def _generate_strong_password(self, length: int = 16) -> str:
        """Generiraj močno geslo"""
        import string
        
        # Kombinacija črk, številk in simbolov
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(chars) for _ in range(length))
        
        # Zagotovi da ima vsaj eno črko, številko in simbol
        if not any(c.isalpha() for c in password):
            password = password[:-1] + secrets.choice(string.ascii_letters)
        if not any(c.isdigit() for c in password):
            password = password[:-1] + secrets.choice(string.digits)
        if not any(c in "!@#$%^&*" for c in password):
            password = password[:-1] + secrets.choice("!@#$%^&*")
        
        return password
    
    def create_env_file(self, keys: Dict[str, str], interactive: bool = True):
        """Ustvari .env datoteko"""
        logger.info("Ustvarjam .env datoteko...")
        
        if self.env_file.exists():
            if interactive:
                response = input(f".env datoteka že obstaja. Prepiši? (y/N): ")
                if response.lower() != 'y':
                    logger.info("Preskačem kreiranje .env datoteke")
                    return
            else:
                # Backup obstoječe datoteke
                backup_path = self.env_file.with_suffix(f".env.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}")
                self.env_file.rename(backup_path)
                logger.info(f"Backup obstoječe .env datoteke: {backup_path}")
        
        # Preberi template
        if not self.env_template.exists():
            logger.error(f"Template datoteka ne obstaja: {self.env_template}")
            return
        
        with open(self.env_template, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Zamenjaj placeholder vrednosti
        env_content = template_content
        
        # Avtomatsko generirani ključi
        for key, value in keys.items():
            env_content = env_content.replace(f"{key}=your_{key.lower()}_here", f"{key}={value}")
            env_content = env_content.replace(f"{key}=your_{key.lower().replace('_', '_')}", f"{key}={value}")
        
        # Dodatne zamenjave
        replacements = {
            "your_mqtt_username": "omni_iot_client",
            "your_secure_mqtt_password_2024": keys.get('MQTT_PASSWORD', 'secure_mqtt_2024'),
            "your_secure_db_password_2024": keys.get('DB_PASSWORD', 'secure_db_2024'),
            "your_secure_redis_password_2024": keys.get('REDIS_PASSWORD', 'secure_redis_2024'),
            "omni_iot_production": "omni_iot_prod",
            "omni_iot_user": "omni_iot",
            "your_email@gmail.com": "admin@omni-platform.com",
            "your_app_specific_password": "app_specific_password_here"
        }
        
        for old, new in replacements.items():
            env_content = env_content.replace(old, new)
        
        # Shrani .env datoteko
        with open(self.env_file, 'w', encoding='utf-8') as f:
            f.write(env_content)
        
        # Nastavi permissions
        if os.name != 'nt':
            os.chmod(self.env_file, 0o600)
        
        logger.info(f"✓ .env datoteka ustvarjena: {self.env_file}")
    
    def validate_configuration(self) -> bool:
        """Validiraj produkcijsko konfiguracijo"""
        logger.info("Validiram konfiguracijo...")
        
        try:
            # Naloži config manager
            sys.path.append(str(self.config_dir))
            from iot_config_manager import IoTConfigManager
            
            config_manager = IoTConfigManager(
                config_path=str(self.production_config),
                environment="production"
            )
            
            # Preveri status
            status = config_manager.get_status()
            
            if not status['config_valid']:
                logger.error("Konfiguracija ni veljavna:")
                for var in status['missing_env_vars']:
                    logger.error(f"  - Manjka: {var}")
                return False
            
            logger.info("Konfiguracija veljavna ✓")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri validaciji: {e}")
            return False
    
    def setup_ssl_certificates(self):
        """Nastavi SSL certifikate (za produkcijo)"""
        logger.info("Nastavljam SSL certifikate...")
        
        cert_dir = self.data_dir / "certificates"
        
        # Za development/testing generiraj self-signed certifikate
        if not (cert_dir / "omni-iot.pem").exists():
            logger.info("Generiram self-signed certifikate za testiranje...")
            
            try:
                # Generiraj private key
                subprocess.run([
                    "openssl", "genrsa", "-out", 
                    str(cert_dir / "omni-iot.key"), "2048"
                ], check=True, capture_output=True)
                
                # Generiraj certificate
                subprocess.run([
                    "openssl", "req", "-new", "-x509", "-key",
                    str(cert_dir / "omni-iot.key"), "-out",
                    str(cert_dir / "omni-iot.pem"), "-days", "365",
                    "-subj", "/C=SI/ST=Slovenia/L=Ljubljana/O=Omni/CN=localhost"
                ], check=True, capture_output=True)
                
                logger.info("✓ Self-signed certifikati generirani")
                
            except (subprocess.CalledProcessError, FileNotFoundError):
                logger.warning("OpenSSL ni na voljo, preskačem generiranje certifikatov")
                logger.info("Za produkcijo uporabi prave SSL certifikate!")
    
    def create_systemd_service(self):
        """Ustvari systemd service datoteko (Linux)"""
        if os.name == 'nt':
            logger.info("Windows sistem - preskačem systemd service")
            return
        
        logger.info("Ustvarjam systemd service...")
        
        service_content = f"""[Unit]
Description=Omni IoT Platform
After=network.target

[Service]
Type=simple
User=omni-iot
Group=omni-iot
WorkingDirectory={self.base_dir}
Environment=IOT_ENVIRONMENT=production
ExecStart=/usr/bin/python3 {self.base_dir}/start_iot_dashboard_simple.py
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths={self.base_dir}

[Install]
WantedBy=multi-user.target
"""
        
        service_file = self.base_dir / "omni-iot.service"
        with open(service_file, 'w') as f:
            f.write(service_content)
        
        logger.info(f"✓ Systemd service ustvarjen: {service_file}")
        logger.info("Za namestitev zaženi:")
        logger.info(f"  sudo cp {service_file} /etc/systemd/system/")
        logger.info("  sudo systemctl daemon-reload")
        logger.info("  sudo systemctl enable omni-iot")
        logger.info("  sudo systemctl start omni-iot")
    
    def create_backup_script(self):
        """Ustvari backup skripto"""
        logger.info("Ustvarjam backup skripto...")
        
        backup_script = f"""#!/bin/bash
# Omni IoT Platform Backup Script
# Generirano: {datetime.now().isoformat()}

BACKUP_DIR="{self.backup_dir}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="omni_iot_backup_$DATE"

echo "Začenjam backup: $BACKUP_NAME"

# Ustvari backup direktorij
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup konfiguracije
cp -r "{self.config_dir}" "$BACKUP_DIR/$BACKUP_NAME/"

# Backup podatkov
cp -r "{self.data_dir}" "$BACKUP_DIR/$BACKUP_NAME/"

# Backup logov (zadnjih 7 dni)
find "{self.logs_dir}" -name "*.log" -mtime -7 -exec cp {{}} "$BACKUP_DIR/$BACKUP_NAME/logs/" \\;

# Kompresija
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

echo "Backup končan: $BACKUP_DIR/$BACKUP_NAME.tar.gz"

# Počisti stare backupe (starejše od 30 dni)
find "$BACKUP_DIR" -name "omni_iot_backup_*.tar.gz" -mtime +30 -delete

echo "Stari backupi počiščeni"
"""
        
        backup_file = self.base_dir / "scripts" / "backup.sh"
        backup_file.parent.mkdir(exist_ok=True)
        
        with open(backup_file, 'w') as f:
            f.write(backup_script)
        
        # Nastavi executable permissions
        if os.name != 'nt':
            os.chmod(backup_file, 0o755)
        
        logger.info(f"✓ Backup skripta ustvarjena: {backup_file}")
    
    def print_summary(self, keys: Dict[str, str]):
        """Izpiši povzetek nastavitve"""
        print("\n" + "="*60)
        print("🚀 OMNI IOT PLATFORM - PRODUKCIJSKA NASTAVITEV")
        print("="*60)
        
        print(f"\n📁 Osnovna mapa: {self.base_dir}")
        print(f"⚙️  Konfiguracija: {self.config_dir}")
        print(f"📊 Podatki: {self.data_dir}")
        print(f"📝 Logi: {self.logs_dir}")
        print(f"💾 Backupi: {self.backup_dir}")
        
        print(f"\n🔐 Generirani ključi:")
        for key in ['JWT_SECRET_KEY', 'API_ADMIN_KEY', 'ENCRYPTION_KEY']:
            if key in keys:
                print(f"   {key}: {keys[key][:8]}...{keys[key][-8:]}")
        
        print(f"\n📋 Naslednji koraki:")
        print(f"   1. Preveri .env datoteko: {self.env_file}")
        print(f"   2. Posodobi database nastavitve")
        print(f"   3. Nastavi SSL certifikate za produkcijo")
        print(f"   4. Konfiguriraj MQTT broker")
        print(f"   5. Zaženi: python start_iot_dashboard_simple.py")
        
        print(f"\n⚠️  VARNOSTNI OPOMINI:")
        print(f"   - Nikoli ne commitaj .env datoteke!")
        print(f"   - Redno menjaj gesla")
        print(f"   - Nastavi firewall pravila")
        print(f"   - Omogoči SSL/TLS za vse povezave")
        print(f"   - Redno preverjaj loge")
        
        print("\n" + "="*60)
    
    def run_setup(self, interactive: bool = True):
        """Zaženi celotno nastavitev"""
        logger.info("🚀 Začenjam produkcijsko nastavitev...")
        
        try:
            # 1. Preveri predpogoje
            if not self.check_prerequisites():
                logger.error("Predpogoji niso izpolnjeni!")
                return False
            
            # 2. Ustvari direktorije
            self.create_directories()
            
            # 3. Generiraj ključe
            keys = self.generate_secure_keys()
            
            # 4. Ustvari .env datoteko
            self.create_env_file(keys, interactive)
            
            # 5. Validiraj konfiguracijo
            if not self.validate_configuration():
                logger.error("Konfiguracija ni veljavna!")
                return False
            
            # 6. SSL certifikati
            self.setup_ssl_certificates()
            
            # 7. Systemd service
            self.create_systemd_service()
            
            # 8. Backup skripta
            self.create_backup_script()
            
            # 9. Povzetek
            self.print_summary(keys)
            
            logger.info("✅ Produkcijska nastavitev uspešno končana!")
            return True
            
        except Exception as e:
            logger.error(f"Napaka pri nastavitvi: {e}")
            import traceback
            traceback.print_exc()
            return False

def main():
    """Glavna funkcija"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Omni IoT Platform - Production Setup")
    parser.add_argument("--base-dir", help="Osnovna mapa projekta")
    parser.add_argument("--non-interactive", action="store_true", help="Ne-interaktivni način")
    parser.add_argument("--check-only", action="store_true", help="Samo preveri predpogoje")
    
    args = parser.parse_args()
    
    # Inicializacija
    setup = ProductionSetup(args.base_dir)
    
    if args.check_only:
        # Samo preveri predpogoje
        success = setup.check_prerequisites()
        sys.exit(0 if success else 1)
    
    # Zaženi celotno nastavitev
    success = setup.run_setup(interactive=not args.non_interactive)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()