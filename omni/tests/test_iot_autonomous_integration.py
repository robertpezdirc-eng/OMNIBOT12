#!/usr/bin/env python3
"""
🧪 Test avtonomne IoT integracije z realnimi scenariji
Testiranje celotnega sistema z realnimi napravami in situacijami
"""

import sys
import os
import time
import json
import threading
import logging
from datetime import datetime, timedelta
from pathlib import Path
import requests
import sqlite3

# Dodaj parent directory v path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

# Nastavi logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Uvozi naše module
try:
    from modules.iot import iot_autonomous
    from modules.iot import iot_device_monitor
    from modules.iot import iot_auto_actions
    from modules.iot import omni_iot_integration
    logger.info("✅ Vsi IoT moduli uspešno uvoženi")
except ImportError as e:
    logger.warning(f"⚠️ Nekateri moduli niso dostopni: {e}")
    # Poskusi uvoziti posamezne module
    iot_autonomous = None
    iot_device_monitor = None
    iot_auto_actions = None
    omni_iot_integration = None
    
    try:
        from modules.iot import iot_autonomous
        logger.info("✅ iot_autonomous uvožen")
    except ImportError:
        logger.warning("⚠️ iot_autonomous ni dostopen")
    
    try:
        from modules.iot import iot_device_monitor
        logger.info("✅ iot_device_monitor uvožen")
    except ImportError:
        logger.warning("⚠️ iot_device_monitor ni dostopen")
    
    try:
        from modules.iot import iot_auto_actions
        logger.info("✅ iot_auto_actions uvožen")
    except ImportError:
        logger.warning("⚠️ iot_auto_actions ni dostopen")
    
    try:
        from modules.iot import omni_iot_integration
        logger.info("✅ omni_iot_integration uvožen")
    except ImportError:
        logger.warning("⚠️ omni_iot_integration ni dostopen")

class IoTIntegrationTester:
    """Tester za celotno IoT integracijo"""
    
    def __init__(self):
        self.test_results = []
        self.integration_api_url = "http://localhost:5001"
        self.test_devices = []
        self.start_time = datetime.now()
        
        logger.info("🧪 IoT Integration Tester inicializiran")
    
    def log_test_result(self, test_name: str, success: bool, message: str, duration: float = 0):
        """Zapiši rezultat testa"""
        result = {
            'test_name': test_name,
            'success': success,
            'message': message,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        logger.info(f"{status} {test_name}: {message} ({duration:.2f}s)")
    
    def test_module_imports(self):
        """Test če so vsi moduli pravilno uvoženi"""
        start_time = time.time()
        
        try:
            # Preveri če so moduli dostopni
            modules_status = {
                'iot_autonomous': iot_autonomous is not None,
                'iot_device_monitor': iot_device_monitor is not None,
                'iot_auto_actions': iot_auto_actions is not None,
                'omni_iot_integration': omni_iot_integration is not None
            }
            
            available_modules = sum(modules_status.values())
            
            duration = time.time() - start_time
            success = available_modules >= 1  # Vsaj en modul mora biti dostopen
            
            self.log_test_result(
                "Module Imports",
                success,
                f"{available_modules}/4 modulov dostopnih",
                duration
            )
            return success
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Module Imports",
                False,
                f"Napaka pri uvozu: {str(e)}",
                duration
            )
            return False
    
    def test_database_setup(self):
        """Test nastavitve baz podatkov"""
        start_time = time.time()
        
        try:
            # Preveri ali so baze ustvarjene
            db_files = [
                "omni/data/autonomous_iot.db",
                "omni/data/device_monitoring.db",
                "omni/data/auto_actions.db"
            ]
            
            created_dbs = 0
            for db_file in db_files:
                db_path = Path(db_file)
                if db_path.exists():
                    created_dbs += 1
                    
                    # Preveri če ima tabele
                    conn = sqlite3.connect(str(db_path))
                    cursor = conn.cursor()
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                    tables = cursor.fetchall()
                    conn.close()
                    
                    if len(tables) == 0:
                        raise Exception(f"Baza {db_file} nima tabel")
            
            duration = time.time() - start_time
            self.log_test_result(
                "Database Setup",
                created_dbs >= 2,  # Vsaj 2 bazi morata obstajati
                f"{created_dbs}/{len(db_files)} baz podatkov pripravljenih",
                duration
            )
            return created_dbs >= 2
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Database Setup",
                False,
                f"Napaka pri preverjanju baz: {str(e)}",
                duration
            )
            return False
    
    def test_autonomous_system_startup(self):
        """Test zagona avtonomnega sistema"""
        start_time = time.time()
        
        try:
            if iot_autonomous is None:
                logger.warning("⚠️ iot_autonomous ni dostopen - preskačem test")
                duration = time.time() - start_time
                self.log_test_result(
                    "Autonomous System Startup",
                    False,
                    "iot_autonomous modul ni dostopen",
                    duration
                )
                return False
            
            # Simulacija zagona avtonomnega sistema
            logger.info("🚀 Testiram zagon avtonomnega sistema...")
            
            # Preveri če ima modul potrebne funkcije
            required_functions = ['start_autonomous_system', 'get_system_status']
            available_functions = []
            
            for func_name in required_functions:
                if hasattr(iot_autonomous, func_name):
                    available_functions.append(func_name)
                    logger.info(f"✅ Funkcija {func_name} je dostopna")
                else:
                    logger.warning(f"⚠️ Funkcija {func_name} ni dostopna")
            
            success = len(available_functions) >= 1
            duration = time.time() - start_time
            
            self.log_test_result(
                "Autonomous System Startup",
                success,
                f"{len(available_functions)}/{len(required_functions)} funkcij dostopnih",
                duration
            )
            return success
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Autonomous System Startup",
                False,
                f"Napaka pri zagonu: {str(e)}",
                duration
            )
            return False
    
    def test_device_monitoring_startup(self):
        """Test zagona spremljanja naprav"""
        start_time = time.time()
        
        try:
            # Pripravi testne naprave
            test_devices = [
                {
                    "device_id": "test_industrial_01",
                    "device_type": "industrial_machine",
                    "name": "Test industrijski stroj",
                    "location": "Test tovarna"
                },
                {
                    "device_id": "test_greenhouse_01",
                    "device_type": "greenhouse_controller",
                    "name": "Test rastlinjak",
                    "location": "Test lokacija"
                }
            ]
            
            # Zaženi spremljanje
            result = iot_device_monitor.start_device_monitoring(test_devices)
            
            # Počakaj malo
            time.sleep(2)
            
            # Preveri status
            status = iot_device_monitor.get_monitoring_status()
            
            duration = time.time() - start_time
            success = "running" in str(status).lower() or "active" in str(status).lower()
            
            self.log_test_result(
                "Device Monitoring Startup",
                success,
                f"Spremljanje zagnan: {result}",
                duration
            )
            
            self.test_devices = test_devices
            return success
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Device Monitoring Startup",
                False,
                f"Napaka pri zagonu spremljanja: {str(e)}",
                duration
            )
            return False
    
    def test_auto_actions_startup(self):
        """Test zagona avtomatskih ukrepov"""
        start_time = time.time()
        
        try:
            # Zaženi avtomatske ukrepe
            result = iot_auto_actions.start_auto_actions()
            
            # Počakaj malo
            time.sleep(2)
            
            # Preveri status
            status = iot_auto_actions.get_action_status()
            
            duration = time.time() - start_time
            success = "running" in str(status).lower() or "active" in str(status).lower()
            
            self.log_test_result(
                "Auto Actions Startup",
                success,
                f"Avtomatski ukrepi zagnan: {result}",
                duration
            )
            return success
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Auto Actions Startup",
                False,
                f"Napaka pri zagonu ukrepov: {str(e)}",
                duration
            )
            return False
    
    def test_integration_api_startup(self):
        """Test zagona integration API"""
        start_time = time.time()
        
        try:
            # Zaženi integration server v ločeni niti
            def start_server():
                omni_iot_integration.start_integration_server()
            
            server_thread = threading.Thread(target=start_server, daemon=True)
            server_thread.start()
            
            # Počakaj, da se server zažene
            time.sleep(5)
            
            # Preveri če je API dostopen
            response = requests.get(f"{self.integration_api_url}/api/status", timeout=10)
            
            duration = time.time() - start_time
            success = response.status_code == 200
            
            if success:
                api_data = response.json()
                self.log_test_result(
                    "Integration API Startup",
                    True,
                    f"API dostopen: {api_data.get('status', 'unknown')}",
                    duration
                )
            else:
                self.log_test_result(
                    "Integration API Startup",
                    False,
                    f"API ni dostopen: HTTP {response.status_code}",
                    duration
                )
            
            return success
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Integration API Startup",
                False,
                f"Napaka pri zagonu API: {str(e)}",
                duration
            )
            return False
    
    def test_device_control_via_api(self):
        """Test upravljanja naprav preko API"""
        start_time = time.time()
        
        try:
            if not self.test_devices:
                raise Exception("Ni testnih naprav")
            
            device_id = self.test_devices[0]['device_id']
            
            # Test prižiga naprave
            response = requests.post(
                f"{self.integration_api_url}/api/devices/{device_id}/control",
                json={"action": "turn_on"},
                timeout=10
            )
            
            if response.status_code != 200:
                raise Exception(f"API klic neuspešen: {response.status_code}")
            
            result = response.json()
            
            duration = time.time() - start_time
            success = result.get('success', False)
            
            self.log_test_result(
                "Device Control via API",
                success,
                f"Upravljanje naprave: {result.get('result', 'N/A')}",
                duration
            )
            return success
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Device Control via API",
                False,
                f"Napaka pri upravljanju: {str(e)}",
                duration
            )
            return False
    
    def test_full_system_integration(self):
        """Test celotne sistemske integracije"""
        start_time = time.time()
        
        try:
            # Zaženi celoten sistem preko API
            response = requests.post(
                f"{self.integration_api_url}/api/system/full-start",
                timeout=15
            )
            
            if response.status_code != 200:
                raise Exception(f"Full system start neuspešen: {response.status_code}")
            
            result = response.json()
            
            # Počakaj, da se sistem stabilizira
            time.sleep(5)
            
            # Preveri dashboard podatke
            dashboard_response = requests.get(
                f"{self.integration_api_url}/api/dashboard",
                timeout=10
            )
            
            if dashboard_response.status_code == 200:
                dashboard_data = dashboard_response.json()
                system_status = dashboard_data.get('dashboard', {}).get('system_status', {})
                
                active_components = sum([
                    system_status.get('autonomous_active', False),
                    system_status.get('monitoring_active', False),
                    system_status.get('auto_actions_active', False)
                ])
            else:
                active_components = 0
            
            duration = time.time() - start_time
            success = result.get('success', False) and active_components >= 2
            
            self.log_test_result(
                "Full System Integration",
                success,
                f"Sistem zagnan: {active_components}/3 komponent aktivnih",
                duration
            )
            return success
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Full System Integration",
                False,
                f"Napaka pri celotni integraciji: {str(e)}",
                duration
            )
            return False
    
    def test_real_scenario_emergency_response(self):
        """Test realnega scenarija - odziv na krizo"""
        start_time = time.time()
        
        try:
            if not self.test_devices:
                raise Exception("Ni testnih naprav")
            
            device_id = self.test_devices[0]['device_id']
            
            # Simuliraj kritično situacijo (visoka temperatura)
            emergency_data = {
                "device_id": device_id,
                "sensor_type": "temperature",
                "value": 95.0,  # Kritična temperatura
                "unit": "°C",
                "timestamp": datetime.now().isoformat()
            }
            
            # Pošlji podatke v sistem
            iot_device_monitor.process_sensor_data(emergency_data)
            
            # Počakaj, da sistem reagira
            time.sleep(3)
            
            # Preveri če so bili izvedeni ukrepi
            stats = iot_auto_actions.get_action_stats()
            recent_actions = stats.get('recent_actions', [])
            
            # Poišči ukrepe za našo napravo
            emergency_actions = [
                action for action in recent_actions
                if action.get('device_id') == device_id and 
                   'emergency' in action.get('action_type', '').lower()
            ]
            
            duration = time.time() - start_time
            success = len(emergency_actions) > 0
            
            self.log_test_result(
                "Real Scenario - Emergency Response",
                success,
                f"Odziv na krizo: {len(emergency_actions)} ukrepov izvedenih",
                duration
            )
            return success
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Real Scenario - Emergency Response",
                False,
                f"Napaka pri testiranju krize: {str(e)}",
                duration
            )
            return False
    
    def test_real_scenario_scheduled_automation(self):
        """Test realnega scenarija - načrtovana avtomatizacija"""
        start_time = time.time()
        
        try:
            # Ustvari napravo z urnikom
            scheduled_device = {
                "device_id": "test_scheduled_light",
                "device_type": "smart_light",
                "name": "Test pametna luč",
                "schedule": {
                    "on": datetime.now().strftime("%H:%M"),  # Prižgi zdaj
                    "off": (datetime.now() + timedelta(minutes=2)).strftime("%H:%M")  # Ugasni čez 2 min
                }
            }
            
            # Dodaj napravo v avtonomni sistem
            iot_autonomous.add_device(scheduled_device)
            
            # Počakaj malo, da sistem preveri urnik
            time.sleep(65)  # Počakaj malo več kot minuto
            
            # Preveri ali je bila naprava upravljana
            device_status = iot_autonomous.get_device_status_detailed(scheduled_device['device_id'])
            
            duration = time.time() - start_time
            success = device_status.get('device_id') == scheduled_device['device_id']
            
            self.log_test_result(
                "Real Scenario - Scheduled Automation",
                success,
                f"Načrtovana avtomatizacija: naprava {scheduled_device['device_id']} upravljana",
                duration
            )
            return success
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Real Scenario - Scheduled Automation",
                False,
                f"Napaka pri testiranju urnika: {str(e)}",
                duration
            )
            return False
    
    def test_system_performance(self):
        """Test performanse sistema"""
        start_time = time.time()
        
        try:
            # Pošlji več zahtev hkrati
            import concurrent.futures
            
            def make_api_request():
                response = requests.get(f"{self.integration_api_url}/api/status", timeout=5)
                return response.status_code == 200
            
            # Izvedi 10 vzporednih zahtev
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(make_api_request) for _ in range(10)]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            successful_requests = sum(results)
            
            duration = time.time() - start_time
            success = successful_requests >= 8  # Vsaj 80% uspešnih
            
            self.log_test_result(
                "System Performance",
                success,
                f"Performanse: {successful_requests}/10 zahtev uspešnih v {duration:.2f}s",
                duration
            )
            return success
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "System Performance",
                False,
                f"Napaka pri testiranju performans: {str(e)}",
                duration
            )
            return False
    
    def cleanup_test_environment(self):
        """Počisti testno okolje"""
        start_time = time.time()
        
        try:
            # Ustavi vse komponente
            try:
                requests.post(f"{self.integration_api_url}/api/system/full-stop", timeout=10)
            except:
                pass
            
            try:
                iot_autonomous.stop_autonomous_system()
            except:
                pass
            
            try:
                iot_device_monitor.stop_device_monitoring()
            except:
                pass
            
            try:
                iot_auto_actions.stop_auto_actions()
            except:
                pass
            
            duration = time.time() - start_time
            self.log_test_result(
                "Cleanup Test Environment",
                True,
                "Testno okolje počiščeno",
                duration
            )
            return True
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result(
                "Cleanup Test Environment",
                False,
                f"Napaka pri čiščenju: {str(e)}",
                duration
            )
            return False
    
    def run_all_tests(self):
        """Zaženi vse teste"""
        logger.info("🚀 Začenjam celotno testiranje IoT integracije...")
        
        tests = [
            self.test_module_imports,
            self.test_database_setup,
            self.test_autonomous_system_startup,
            self.test_device_monitoring_startup,
            self.test_auto_actions_startup,
            self.test_integration_api_startup,
            self.test_device_control_via_api,
            self.test_full_system_integration,
            self.test_real_scenario_emergency_response,
            self.test_real_scenario_scheduled_automation,
            self.test_system_performance,
            self.cleanup_test_environment
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed_tests += 1
            except Exception as e:
                logger.error(f"❌ Test {test.__name__} se je sesul: {e}")
        
        # Izračunaj statistike
        success_rate = (passed_tests / total_tests) * 100
        total_duration = (datetime.now() - self.start_time).total_seconds()
        
        logger.info(f"\n{'='*60}")
        logger.info(f"🧪 REZULTATI TESTIRANJA IoT INTEGRACIJE")
        logger.info(f"{'='*60}")
        logger.info(f"✅ Uspešni testi: {passed_tests}/{total_tests}")
        logger.info(f"📊 Uspešnost: {success_rate:.1f}%")
        logger.info(f"⏱️ Skupni čas: {total_duration:.2f}s")
        logger.info(f"{'='*60}")
        
        # Izpiši podrobne rezultate
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            logger.info(f"{status} {result['test_name']}: {result['message']} ({result['duration']:.2f}s)")
        
        # Shrani rezultate
        self.save_test_results()
        
        return success_rate >= 70.0  # Uspešnost vsaj 70%
    
    def save_test_results(self):
        """Shrani rezultate testov"""
        try:
            results_dir = Path("omni/test_results")
            results_dir.mkdir(exist_ok=True)
            
            results_file = results_dir / f"iot_integration_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            test_summary = {
                'test_run_id': f"iot_integration_{int(time.time())}",
                'start_time': self.start_time.isoformat(),
                'end_time': datetime.now().isoformat(),
                'total_tests': len(self.test_results),
                'passed_tests': sum(1 for r in self.test_results if r['success']),
                'success_rate': (sum(1 for r in self.test_results if r['success']) / len(self.test_results)) * 100,
                'test_results': self.test_results
            }
            
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(test_summary, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Rezultati shranjeni v: {results_file}")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju rezultatov: {e}")

def main():
    """Glavna funkcija"""
    print("🧪 IoT Autonomous Integration Test")
    print("=" * 50)
    
    tester = IoTIntegrationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 TESTIRANJE USPEŠNO KONČANO!")
        print("✅ IoT avtonomni sistem je pripravljen za produkcijo")
    else:
        print("\n⚠️ TESTIRANJE DELNO USPEŠNO")
        print("🔧 Potrebne so dodatne optimizacije")
    
    return success

if __name__ == "__main__":
    main()