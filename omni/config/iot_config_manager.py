#!/usr/bin/env python3
"""
IoT Configuration Manager
Omni AI Platform - Upravljalnik konfiguracije za IoT sistem

Funkcionalnosti:
- Dinamično nalaganje konfiguracije
- Environment variable substitucija
- Validacija nastavitev
- Hot-reload konfiguracije
- Varnostne preveritve

Avtor: Omni AI Platform
Verzija: 1.0
"""

import os
import yaml
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import re
from datetime import datetime
import hashlib

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ConfigValidationError(Exception):
    """Napaka pri validaciji konfiguracije"""
    message: str
    field: str
    value: Any

class IoTConfigManager:
    """Upravljalnik konfiguracije za IoT sistem"""
    
    def __init__(self, config_path: Optional[str] = None, environment: str = "production"):
        """
        Inicializacija upravljalnika konfiguracije
        
        Args:
            config_path: Pot do konfiguracijske datoteke
            environment: Okolje (production, development, testing)
        """
        self.environment = environment
        self.config_path = config_path or self._get_default_config_path()
        self.config = {}
        self.config_hash = ""
        self.last_modified = None
        
        # Naložimo konfiguracijo
        self.load_config()
        
        logger.info(f"IoT Configuration Manager inicializiran za okolje: {environment}")
    
    def _get_default_config_path(self) -> str:
        """Določi privzeto pot do konfiguracije"""
        base_dir = Path(__file__).parent
        
        if self.environment == "production":
            return str(base_dir / "iot_production.yaml")
        elif self.environment == "development":
            return str(base_dir / "iot_development.yaml")
        else:
            return str(base_dir / "iot_testing.yaml")
    
    def load_config(self) -> Dict[str, Any]:
        """Naloži konfiguracijo iz datoteke"""
        try:
            if not os.path.exists(self.config_path):
                raise FileNotFoundError(f"Konfiguracijska datoteka ne obstaja: {self.config_path}")
            
            # Preveri če se je datoteka spremenila
            current_modified = os.path.getmtime(self.config_path)
            if self.last_modified and current_modified == self.last_modified:
                return self.config
            
            with open(self.config_path, 'r', encoding='utf-8') as file:
                raw_config = yaml.safe_load(file)
            
            # Substitucija environment variables
            self.config = self._substitute_env_vars(raw_config)
            
            # Uporabi development overrides če ni production
            if self.environment != "production" and "development" in self.config:
                self.config = self._merge_configs(self.config, self.config["development"])
            
            # Validacija
            self._validate_config()
            
            # Posodobi metadata
            self.last_modified = current_modified
            self.config_hash = self._calculate_config_hash()
            
            logger.info("Konfiguracija uspešno naložena")
            return self.config
            
        except Exception as e:
            logger.error(f"Napaka pri nalaganju konfiguracije: {e}")
            raise
    
    def _substitute_env_vars(self, config: Any) -> Any:
        """Zamenjaj environment variables v konfiguraciji"""
        if isinstance(config, dict):
            return {key: self._substitute_env_vars(value) for key, value in config.items()}
        elif isinstance(config, list):
            return [self._substitute_env_vars(item) for item in config]
        elif isinstance(config, str):
            # Poišči ${VAR_NAME} pattern
            pattern = r'\$\{([^}]+)\}'
            matches = re.findall(pattern, config)
            
            result = config
            for var_name in matches:
                env_value = os.getenv(var_name)
                if env_value is not None:
                    result = result.replace(f"${{{var_name}}}", env_value)
                else:
                    logger.warning(f"Environment variable {var_name} ni definirana")
            
            return result
        else:
            return config
    
    def _merge_configs(self, base: Dict, override: Dict) -> Dict:
        """Združi dve konfiguraciji (override ima prednost)"""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._merge_configs(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def _validate_config(self):
        """Validacija konfiguracije"""
        required_sections = ["app", "mqtt", "security", "audit"]
        
        for section in required_sections:
            if section not in self.config:
                raise ConfigValidationError(
                    f"Manjka obvezna sekcija: {section}",
                    section,
                    None
                )
        
        # Validacija MQTT nastavitev
        mqtt_config = self.config.get("mqtt", {})
        if not mqtt_config.get("broker"):
            raise ConfigValidationError(
                "MQTT broker mora biti definiran",
                "mqtt.broker",
                mqtt_config.get("broker")
            )
        
        # Validacija varnostnih nastavitev
        security_config = self.config.get("security", {})
        if security_config.get("enabled", True):
            jwt_config = security_config.get("jwt", {})
            if not jwt_config.get("secret_key"):
                raise ConfigValidationError(
                    "JWT secret_key mora biti definiran",
                    "security.jwt.secret_key",
                    jwt_config.get("secret_key")
                )
        
        # Validacija portov
        web_port = self.config.get("web", {}).get("port", 5000)
        if not isinstance(web_port, int) or web_port < 1 or web_port > 65535:
            raise ConfigValidationError(
                "Web port mora biti veljavno število med 1 in 65535",
                "web.port",
                web_port
            )
        
        logger.info("Validacija konfiguracije uspešna")
    
    def _calculate_config_hash(self) -> str:
        """Izračunaj hash konfiguracije za spremljanje sprememb"""
        config_str = json.dumps(self.config, sort_keys=True)
        return hashlib.sha256(config_str.encode()).hexdigest()
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """
        Pridobi vrednost iz konfiguracije z dot notation
        
        Args:
            key_path: Pot do ključa (npr. "mqtt.broker")
            default: Privzeta vrednost
        
        Returns:
            Vrednost ali default
        """
        keys = key_path.split(".")
        value = self.config
        
        try:
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return default
    
    def set(self, key_path: str, value: Any):
        """
        Nastavi vrednost v konfiguraciji z dot notation
        
        Args:
            key_path: Pot do ključa (npr. "mqtt.broker")
            value: Nova vrednost
        """
        keys = key_path.split(".")
        config = self.config
        
        # Navigiraj do zadnjega ključa
        for key in keys[:-1]:
            if key not in config:
                config[key] = {}
            config = config[key]
        
        # Nastavi vrednost
        config[keys[-1]] = value
        
        # Posodobi hash
        self.config_hash = self._calculate_config_hash()
        
        logger.info(f"Konfiguracija posodobljena: {key_path} = {value}")
    
    def reload_if_changed(self) -> bool:
        """
        Ponovno naloži konfiguracijo če se je datoteka spremenila
        
        Returns:
            True če je bila konfiguracija ponovno naložena
        """
        if not os.path.exists(self.config_path):
            return False
        
        current_modified = os.path.getmtime(self.config_path)
        if self.last_modified and current_modified != self.last_modified:
            logger.info("Zaznana sprememba konfiguracije, ponovno nalagam...")
            self.load_config()
            return True
        
        return False
    
    def get_mqtt_config(self) -> Dict[str, Any]:
        """Pridobi MQTT konfiguracijo"""
        return self.get("mqtt", {})
    
    def get_security_config(self) -> Dict[str, Any]:
        """Pridobi varnostno konfiguracijo"""
        return self.get("security", {})
    
    def get_audit_config(self) -> Dict[str, Any]:
        """Pridobi audit konfiguracijo"""
        return self.get("audit", {})
    
    def get_database_config(self) -> Dict[str, Any]:
        """Pridobi database konfiguracijo"""
        return self.get("database", {})
    
    def get_web_config(self) -> Dict[str, Any]:
        """Pridobi web server konfiguracijo"""
        return self.get("web", {})
    
    def is_production(self) -> bool:
        """Preveri če je produkcijsko okolje"""
        return self.environment == "production"
    
    def is_development(self) -> bool:
        """Preveri če je razvojno okolje"""
        return self.environment == "development"
    
    def is_security_enabled(self) -> bool:
        """Preveri če je varnost omogočena"""
        return self.get("security.enabled", True)
    
    def is_audit_enabled(self) -> bool:
        """Preveri če je audit omogočen"""
        return self.get("audit.enabled", True)
    
    def get_required_env_vars(self) -> List[str]:
        """Pridobi seznam obveznih environment variables"""
        return self.get("environment_variables.required", [])
    
    def validate_env_vars(self) -> Dict[str, bool]:
        """
        Validacija environment variables
        
        Returns:
            Dict z rezultati validacije
        """
        required_vars = self.get_required_env_vars()
        results = {}
        
        for var in required_vars:
            results[var] = os.getenv(var) is not None
        
        return results
    
    def export_config(self, output_path: str, format: str = "yaml"):
        """
        Izvozi trenutno konfiguracijo
        
        Args:
            output_path: Pot za izvoz
            format: Format (yaml, json)
        """
        try:
            with open(output_path, 'w', encoding='utf-8') as file:
                if format.lower() == "json":
                    json.dump(self.config, file, indent=2, ensure_ascii=False)
                else:
                    yaml.dump(self.config, file, default_flow_style=False, allow_unicode=True)
            
            logger.info(f"Konfiguracija izvožena v: {output_path}")
            
        except Exception as e:
            logger.error(f"Napaka pri izvozu konfiguracije: {e}")
            raise
    
    def get_status(self) -> Dict[str, Any]:
        """Pridobi status upravljalnika konfiguracije"""
        env_validation = self.validate_env_vars()
        missing_vars = [var for var, exists in env_validation.items() if not exists]
        
        return {
            "environment": self.environment,
            "config_path": self.config_path,
            "config_hash": self.config_hash,
            "last_modified": datetime.fromtimestamp(self.last_modified) if self.last_modified else None,
            "security_enabled": self.is_security_enabled(),
            "audit_enabled": self.is_audit_enabled(),
            "missing_env_vars": missing_vars,
            "config_valid": len(missing_vars) == 0
        }

# Globalna instanca
_config_manager = None

def get_config_manager(environment: str = None) -> IoTConfigManager:
    """Pridobi globalno instanco upravljalnika konfiguracije"""
    global _config_manager
    
    if _config_manager is None or (environment and _config_manager.environment != environment):
        env = environment or os.getenv("IOT_ENVIRONMENT", "production")
        _config_manager = IoTConfigManager(environment=env)
    
    return _config_manager

def get_config(key_path: str, default: Any = None) -> Any:
    """Pridobi konfiguracijo z dot notation"""
    return get_config_manager().get(key_path, default)

def reload_config() -> bool:
    """Ponovno naloži konfiguracijo"""
    return get_config_manager().reload_if_changed()

# Test funkcija
def main():
    """Test funkcija za upravljalnik konfiguracije"""
    try:
        # Inicializacija
        config_manager = IoTConfigManager(environment="development")
        
        # Test osnovnih funkcij
        print("=== IoT Configuration Manager Test ===")
        print(f"Okolje: {config_manager.environment}")
        print(f"Konfiguracija: {config_manager.config_path}")
        
        # Test pridobivanja vrednosti
        mqtt_broker = config_manager.get("mqtt.broker", "localhost")
        print(f"MQTT Broker: {mqtt_broker}")
        
        security_enabled = config_manager.is_security_enabled()
        print(f"Varnost omogočena: {security_enabled}")
        
        # Test statusa
        status = config_manager.get_status()
        print(f"Status: {json.dumps(status, indent=2, default=str)}")
        
        # Test environment variables
        env_validation = config_manager.validate_env_vars()
        print(f"Environment variables: {env_validation}")
        
        print("Test uspešno končan!")
        
    except Exception as e:
        print(f"Napaka pri testu: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()