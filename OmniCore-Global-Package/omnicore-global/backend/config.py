"""
OmniCore Global Configuration
Centralna konfiguracija za vse module in povezave
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
import json
import logging

logger = logging.getLogger(__name__)

@dataclass
class DatabaseConfig:
    """Konfiguracija baze podatkov"""
    host: str
    port: int
    database: str
    username: str
    password: str
    ssl_mode: str = "prefer"
    pool_size: int = 10
    max_overflow: int = 20

@dataclass
class ModuleConfig:
    """Konfiguracija modula"""
    enabled: bool = True
    host: str = "localhost"
    port: int = 8000
    api_key: Optional[str] = None
    settings: Dict[str, Any] = None

class Config:
    """Glavna konfiguracija OmniCore Global"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.config_file = config_file or "config.json"
        self.environment = os.getenv("OMNICORE_ENV", "development")
        
        # Osnovne nastavitve
        self.debug = os.getenv("DEBUG", "false").lower() == "true"
        self.secret_key = os.getenv("SECRET_KEY", "omnicore-secret-key-change-in-production")
        
        # Naložitev konfiguracije
        self._load_config()
        
        logger.info(f"🔧 Konfiguracija naložena za okolje: {self.environment}")
    
    def _load_config(self):
        """Naloži konfiguracijo iz datoteke in environment spremenljivk"""
        
        # Privzete nastavitve
        default_config = {
            "database": {
                "host": "localhost",
                "port": 5432,
                "database": "omnicore_global",
                "username": "omnicore_user",
                "password": "omnicore_password"
            },
            "modules": {
                "finance": {
                    "enabled": True,
                    "port": 8301,
                    "api_endpoints": {
                        "erp_system": "https://erp.company.com/api",
                        "banking_api": "https://api.bank.com/v1"
                    }
                },
                "analytics": {
                    "enabled": True,
                    "port": 8302,
                    "data_sources": {
                        "google_analytics": True,
                        "custom_tracking": True
                    }
                },
                "task": {
                    "enabled": True,
                    "port": 8303,
                    "integrations": {
                        "google_calendar": True,
                        "outlook": True,
                        "slack": False
                    }
                },
                "logistics": {
                    "enabled": True,
                    "port": 8304,
                    "providers": {
                        "dhl": False,
                        "ups": False,
                        "local_transport": True
                    }
                },
                "tourism": {
                    "enabled": True,
                    "port": 8305,
                    "booking_systems": {
                        "booking_com": False,
                        "airbnb": False,
                        "local_system": True
                    }
                },
                "healthcare": {
                    "enabled": True,
                    "port": 8306,
                    "integrations": {
                        "hospital_system": False,
                        "pharmacy_system": False,
                        "telemedicine": True
                    }
                }
            },
            "ai_router": {
                "model": "local",
                "confidence_threshold": 0.7,
                "fallback_module": "analytics"
            },
            "security": {
                "jwt_secret": "jwt-secret-key",
                "token_expiry": 3600,
                "rate_limiting": {
                    "enabled": True,
                    "requests_per_minute": 100
                }
            },
            "monitoring": {
                "enabled": True,
                "metrics_port": 9090,
                "log_level": "INFO"
            }
        }
        
        # Poskusi naložiti iz datoteke
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    file_config = json.load(f)
                    # Združi s privzetimi nastavitvami
                    self._merge_config(default_config, file_config)
        except Exception as e:
            logger.warning(f"Napaka pri nalaganju {self.config_file}: {e}")
        
        self.config = default_config
        
        # Override z environment spremenljivkami
        self._load_from_environment()
    
    def _merge_config(self, default: Dict[str, Any], override: Dict[str, Any]):
        """Rekurzivno združi konfiguracije"""
        for key, value in override.items():
            if key in default and isinstance(default[key], dict) and isinstance(value, dict):
                self._merge_config(default[key], value)
            else:
                default[key] = value
    
    def _load_from_environment(self):
        """Naloži nastavitve iz environment spremenljivk"""
        
        # Database
        if os.getenv("DB_HOST"):
            self.config["database"]["host"] = os.getenv("DB_HOST")
        if os.getenv("DB_PORT"):
            self.config["database"]["port"] = int(os.getenv("DB_PORT"))
        if os.getenv("DB_NAME"):
            self.config["database"]["database"] = os.getenv("DB_NAME")
        if os.getenv("DB_USER"):
            self.config["database"]["username"] = os.getenv("DB_USER")
        if os.getenv("DB_PASSWORD"):
            self.config["database"]["password"] = os.getenv("DB_PASSWORD")
        
        # API ključi
        for module in self.config["modules"]:
            api_key_env = f"{module.upper()}_API_KEY"
            if os.getenv(api_key_env):
                self.config["modules"][module]["api_key"] = os.getenv(api_key_env)
    
    def get_database_config(self) -> DatabaseConfig:
        """Pridobi konfiguracijo baze podatkov"""
        db_config = self.config["database"]
        return DatabaseConfig(
            host=db_config["host"],
            port=db_config["port"],
            database=db_config["database"],
            username=db_config["username"],
            password=db_config["password"]
        )
    
    def get_module_config(self, module_name: str) -> ModuleConfig:
        """Pridobi konfiguracijo modula"""
        if module_name not in self.config["modules"]:
            raise ValueError(f"Modul {module_name} ni konfiguriran")
        
        module_config = self.config["modules"][module_name]
        return ModuleConfig(
            enabled=module_config.get("enabled", True),
            port=module_config.get("port", 8000),
            api_key=module_config.get("api_key"),
            settings=module_config
        )
    
    def get_ai_router_config(self) -> Dict[str, Any]:
        """Pridobi konfiguracijo AI Router"""
        return self.config.get("ai_router", {})
    
    def get_security_config(self) -> Dict[str, Any]:
        """Pridobi varnostno konfiguracijo"""
        return self.config.get("security", {})
    
    def get_monitoring_config(self) -> Dict[str, Any]:
        """Pridobi konfiguracijo monitoringa"""
        return self.config.get("monitoring", {})
    
    def is_module_enabled(self, module_name: str) -> bool:
        """Preveri, ali je modul omogočen"""
        return self.config["modules"].get(module_name, {}).get("enabled", False)
    
    def get_external_api_config(self, module_name: str, api_name: str) -> Optional[str]:
        """Pridobi konfiguracijo zunanje API"""
        module_config = self.config["modules"].get(module_name, {})
        api_endpoints = module_config.get("api_endpoints", {})
        return api_endpoints.get(api_name)
    
    def save_config(self):
        """Shrani trenutno konfiguracijo v datoteko"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            logger.info(f"✅ Konfiguracija shranjena v {self.config_file}")
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju konfiguracije: {e}")
    
    def update_module_config(self, module_name: str, updates: Dict[str, Any]):
        """Posodobi konfiguracijo modula"""
        if module_name not in self.config["modules"]:
            self.config["modules"][module_name] = {}
        
        self.config["modules"][module_name].update(updates)
        logger.info(f"🔧 Posodobljena konfiguracija za {module_name}")
    
    def get_deployment_config(self) -> Dict[str, Any]:
        """Pridobi konfiguracijo za deployment"""
        return {
            "environment": self.environment,
            "debug": self.debug,
            "modules": {
                name: config.get("enabled", True) 
                for name, config in self.config["modules"].items()
            },
            "database": {
                "host": self.config["database"]["host"],
                "port": self.config["database"]["port"],
                "database": self.config["database"]["database"]
            }
        }
    
    def validate_config(self) -> Dict[str, Any]:
        """Validacija konfiguracije"""
        issues = []
        
        # Preveri obvezne nastavitve
        if not self.config["database"]["host"]:
            issues.append("Database host ni nastavljen")
        
        if not self.config["database"]["username"]:
            issues.append("Database username ni nastavljen")
        
        # Preveri module
        enabled_modules = [
            name for name, config in self.config["modules"].items() 
            if config.get("enabled", False)
        ]
        
        if not enabled_modules:
            issues.append("Noben modul ni omogočen")
        
        # Preveri porte
        ports = []
        for module_name, module_config in self.config["modules"].items():
            if module_config.get("enabled", False):
                port = module_config.get("port")
                if port in ports:
                    issues.append(f"Port {port} se uporablja v več modulih")
                ports.append(port)
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "enabled_modules": enabled_modules
        }