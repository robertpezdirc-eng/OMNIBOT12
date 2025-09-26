"""
OMNI License System - Client Panel Integration
Integracija licenčnega preverjanja v obstoječe Client Panel aplikacije
"""

import requests
import json
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from functools import wraps
import hashlib
import platform
import uuid

# Konfiguracija
LICENSE_API_URL = os.getenv('LICENSE_API_URL', 'http://localhost:3000/api/license')
CLIENT_ID = os.getenv('OMNI_CLIENT_ID', 'OMNI001')
LICENSE_KEY = os.getenv('OMNI_LICENSE_KEY', '8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219')
CACHE_DURATION = int(os.getenv('LICENSE_CACHE_DURATION', '3600'))  # 1 ura

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LicenseManager:
    """Upravljanje licenc za Client Panel aplikacije"""
    
    def __init__(self, client_id: str = None, license_key: str = None):
        self.client_id = client_id or CLIENT_ID
        self.license_key = license_key or LICENSE_KEY
        self.api_url = LICENSE_API_URL
        self.cache = {}
        self.last_check = None
        self.license_status = None
        
        # Hardware fingerprint za varnost
        self.hardware_fingerprint = self._generate_hardware_fingerprint()
        
        logger.info(f"🔑 License Manager inicializiran za Client ID: {self.client_id}")
    
    def _generate_hardware_fingerprint(self) -> str:
        """Generiraj hardware fingerprint za varnost"""
        try:
            # Zberi sistemske informacije
            system_info = {
                'platform': platform.system(),
                'processor': platform.processor(),
                'machine': platform.machine(),
                'node': platform.node()
            }
            
            # Ustvari hash
            info_string = json.dumps(system_info, sort_keys=True)
            return hashlib.sha256(info_string.encode()).hexdigest()[:16]
        except Exception as e:
            logger.warning(f"Napaka pri generiranju hardware fingerprint: {e}")
            return str(uuid.uuid4())[:16]
    
    def check_license(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Preveri veljavnost licence"""
        try:
            # Preveri cache, če ni force refresh
            if not force_refresh and self._is_cache_valid():
                logger.info("📋 Uporabljam cached license status")
                return self.license_status
            
            # Pripravi podatke za API klic
            payload = {
                'client_id': self.client_id,
                'license_key': self.license_key,
                'hardware_fingerprint': self.hardware_fingerprint,
                'app_version': '1.0.0',
                'timestamp': datetime.now().isoformat()
            }
            
            # Pošlji zahtevo na licenčni API
            response = requests.post(
                f"{self.api_url}/validate",
                json=payload,
                timeout=10,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'OMNI-Client-Panel/1.0'
                }
            )
            
            if response.status_code == 200:
                license_data = response.json()
                
                # Posodobi cache
                self.license_status = license_data
                self.last_check = datetime.now()
                
                logger.info(f"✅ Licenca veljavna: {license_data.get('plan', 'unknown')}")
                return license_data
            
            else:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
                logger.error(f"❌ Licenca ni veljavna: {response.status_code} - {error_data.get('message', 'Unknown error')}")
                
                return {
                    'valid': False,
                    'error': error_data.get('message', 'License validation failed'),
                    'status_code': response.status_code
                }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"🌐 Napaka pri povezavi z licenčnim API: {e}")
            
            # Če je cache še vedno veljaven, uporabi cached podatke
            if self._is_cache_valid():
                logger.warning("⚠️ Uporabljam cached podatke zaradi napake API")
                return self.license_status
            
            return {
                'valid': False,
                'error': f'Connection error: {str(e)}',
                'offline_mode': True
            }
        
        except Exception as e:
            logger.error(f"❌ Nepričakovana napaka pri preverjanju licence: {e}")
            return {
                'valid': False,
                'error': f'Unexpected error: {str(e)}'
            }
    
    def _is_cache_valid(self) -> bool:
        """Preveri, če je cache še veljaven"""
        if not self.last_check or not self.license_status:
            return False
        
        cache_age = (datetime.now() - self.last_check).total_seconds()
        return cache_age < CACHE_DURATION
    
    def get_license_info(self) -> Dict[str, Any]:
        """Pridobi podrobne informacije o licenci"""
        try:
            response = requests.get(
                f"{self.api_url}/info/{self.client_id}",
                timeout=10,
                headers={'User-Agent': 'OMNI-Client-Panel/1.0'}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {'error': f'Failed to get license info: {response.status_code}'}
        
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju informacij o licenci: {e}")
            return {'error': str(e)}
    
    def is_module_enabled(self, module_name: str) -> bool:
        """Preveri, če je modul omogočen v licenci"""
        license_data = self.check_license()
        
        if not license_data.get('valid', False):
            return False
        
        enabled_modules = license_data.get('enabled_modules', [])
        return module_name.lower() in [m.lower() for m in enabled_modules]
    
    def get_plan_limits(self) -> Dict[str, Any]:
        """Pridobi omejitve trenutnega licenčnega paketa"""
        license_data = self.check_license()
        
        if not license_data.get('valid', False):
            return {}
        
        return license_data.get('plan_config', {})

# Globalna instanca license manager-ja
license_manager = LicenseManager()

def require_license(module_name: str = None):
    """Decorator za preverjanje licence pred dostopom do funkcionalnosti"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Preveri licenco
            license_data = license_manager.check_license()
            
            if not license_data.get('valid', False):
                error_msg = license_data.get('error', 'Invalid license')
                logger.warning(f"🚫 Dostop zavrnjen - {func.__name__}: {error_msg}")
                
                return {
                    'error': 'License required',
                    'message': error_msg,
                    'license_status': license_data
                }
            
            # Preveri modul, če je specificiran
            if module_name and not license_manager.is_module_enabled(module_name):
                logger.warning(f"🚫 Modul {module_name} ni omogočen v licenci")
                
                return {
                    'error': 'Module not enabled',
                    'message': f'Module "{module_name}" is not enabled in your license plan',
                    'required_module': module_name
                }
            
            # Izvršuj funkcijo
            return func(*args, **kwargs)
        
        return wrapper
    return decorator

def require_plan(required_plan: str):
    """Decorator za preverjanje specifičnega licenčnega paketa"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            license_data = license_manager.check_license()
            
            if not license_data.get('valid', False):
                return {
                    'error': 'License required',
                    'message': license_data.get('error', 'Invalid license')
                }
            
            current_plan = license_data.get('plan', '').lower()
            required_plan_lower = required_plan.lower()
            
            # Hierarhija paketov
            plan_hierarchy = ['demo', 'basic', 'premium', 'enterprise']
            
            try:
                current_level = plan_hierarchy.index(current_plan)
                required_level = plan_hierarchy.index(required_plan_lower)
                
                if current_level < required_level:
                    return {
                        'error': 'Insufficient license plan',
                        'message': f'This feature requires {required_plan} plan or higher',
                        'current_plan': current_plan,
                        'required_plan': required_plan
                    }
            except ValueError:
                return {
                    'error': 'Unknown license plan',
                    'message': f'Unknown plan: {current_plan}'
                }
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator

# Utility funkcije za integracijo
def get_license_status() -> Dict[str, Any]:
    """Pridobi trenutni status licence"""
    return license_manager.check_license()

def refresh_license() -> Dict[str, Any]:
    """Prisilno osveži licenco"""
    return license_manager.check_license(force_refresh=True)

def get_enabled_modules() -> List[str]:
    """Pridobi seznam omogočenih modulov"""
    license_data = license_manager.check_license()
    return license_data.get('enabled_modules', []) if license_data.get('valid') else []

def check_module_access(module_name: str) -> bool:
    """Preveri dostop do modula"""
    return license_manager.is_module_enabled(module_name)

def get_plan_info() -> Dict[str, Any]:
    """Pridobi informacije o trenutnem paketu"""
    license_data = license_manager.check_license()
    
    if not license_data.get('valid', False):
        return {}
    
    return {
        'plan': license_data.get('plan'),
        'expires_at': license_data.get('expires_at'),
        'enabled_modules': license_data.get('enabled_modules', []),
        'plan_config': license_data.get('plan_config', {}),
        'company_name': license_data.get('company_name'),
        'max_users': license_data.get('plan_config', {}).get('max_users'),
        'max_locations': license_data.get('plan_config', {}).get('max_locations')
    }

# Test funkcije
def test_license_integration():
    """Testira integracijo licenčnega sistema"""
    print("🧪 Testiram integracijo licenčnega sistema...")
    
    # Test osnovnega preverjanja
    status = get_license_status()
    print(f"📋 License Status: {status}")
    
    # Test modulov
    modules = get_enabled_modules()
    print(f"📦 Enabled Modules: {modules}")
    
    # Test plan informacij
    plan_info = get_plan_info()
    print(f"💼 Plan Info: {plan_info}")
    
    # Test dostopa do modula
    tourism_access = check_module_access('tourism')
    print(f"🏖️ Tourism Module Access: {tourism_access}")
    
    ai_access = check_module_access('ai_optimization')
    print(f"🤖 AI Module Access: {ai_access}")

if __name__ == "__main__":
    test_license_integration()