#!/usr/bin/env python3
"""
🚀 Omni IoT Avtonomni Sistem - Glavni Zagon
Celotna avtonomna IoT avtomatizacija za Omni platformo
"""

import sys
import os
import time
import logging
import threading
from datetime import datetime

# Dodaj omni direktorij v Python path
sys.path.append(os.path.join(os.path.dirname(__file__)))

# Nastavi logging z UTF-8 encoding
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('omni/logs/iot_system.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class OmniIoTSystem:
    """Glavni razred za upravljanje celotnega IoT sistema"""
    
    def __init__(self):
        self.modules = {}
        self.running = False
        self.threads = []
        
    def load_modules(self):
        """Naloži vse IoT module"""
        logger.info("Nalagam IoT module...")
        
        # Naloži avtonomni modul direktno
        try:
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), 'modules', 'iot'))
            
            import iot_autonomous
            self.modules['autonomous'] = iot_autonomous
            logger.info("Avtonomni modul naložen")
        except ImportError as e:
            logger.warning(f"Avtonomni modul ni dostopen: {e}")
        
        # Naloži samoučeči modul direktno
        try:
            import iot_autonomous_learning
            self.modules['learning'] = iot_autonomous_learning
            logger.info("Samoučeči modul naložen")
        except ImportError as e:
            logger.warning(f"Samoučeči modul ni dostopen: {e}")
        
        # Naloži monitoring modul direktno
        try:
            import iot_device_monitor
            self.modules['monitor'] = iot_device_monitor
            logger.info("Monitoring modul naložen")
        except ImportError as e:
            logger.warning(f"Monitoring modul ni dostopen: {e}")
        
        # Naloži avtomatske akcije direktno
        try:
            import iot_auto_actions
            self.modules['actions'] = iot_auto_actions
            logger.info("Avtomatske akcije naložene")
        except ImportError as e:
            logger.warning(f"Avtomatske akcije niso dostopne: {e}")
        
        # Naloži integracijo direktno
        try:
            import omni_iot_integration
            self.modules['integration'] = omni_iot_integration
            logger.info("Omni integracija naložena")
        except ImportError as e:
            logger.warning(f"Omni integracija ni dostopna: {e}")
    
    def start_autonomous_monitoring(self):
        """Zaženi avtonomno spremljanje naprav"""
        if 'autonomous' not in self.modules:
            logger.error("❌ Avtonomni modul ni dostopen")
            return False
        
        try:
            # Definiraj testne naprave
            test_devices = [
                {
                    "id": "test_light_01",
                    "topic": "home/livingroom/light",
                    "type": "light",
                    "schedule": {"on": "18:00", "off": "23:00"}
                },
                {
                    "id": "test_pc_01", 
                    "topic": "office/pc1",
                    "type": "computer",
                    "schedule": {"off": "20:00"}
                },
                {
                    "id": "test_sensor_01",
                    "topic": "factory/sensor1",
                    "type": "sensor",
                    "max_temp": 75
                }
            ]
            
            # Simulacija avtonomnega spremljanja
            def autonomous_loop():
                logger.info("Avtonomno spremljanje zagnano")
                while self.running:
                    try:
                        current_time = datetime.now().strftime("%H:%M")
                        
                        # Preveri stanje naprav
                        if 'autonomous' in self.modules:
                            try:
                                status = self.modules['autonomous'].get_system_status() if hasattr(self.modules['autonomous'], 'get_system_status') else {}
                                logger.debug(f"Avtonomni sistem status: {status}")
                            except Exception as e:
                                logger.warning(f"Napaka pri preverjanju avtonomnega sistema: {e}")
                        
                        # Zaženi samoučečo optimizacijo
                        if 'learning' in self.modules:
                            try:
                                learning_status = self.modules['learning'].get_learning_status() if hasattr(self.modules['learning'], 'get_learning_status') else {}
                                if not learning_status.get('running', False):
                                    result = self.modules['learning'].start_autonomous_learning() if hasattr(self.modules['learning'], 'start_autonomous_learning') else "Not available"
                                    logger.info(f"Samoučeča optimizacija: {result}")
                                else:
                                    logger.debug(f"Samoučeča optimizacija aktivna - nivo: {learning_status.get('learning_level', 'unknown')}")
                            except Exception as e:
                                logger.warning(f"Napaka pri samoučeči optimizaciji: {e}")
                        
                        for device in test_devices:
                            # Preveri urnik
                            if "schedule" in device:
                                schedule = device["schedule"]
                                if "on" in schedule and current_time == schedule["on"]:
                                    logger.info(f"Prizigam {device['id']} po urniku")
                                elif "off" in schedule and current_time == schedule["off"]:
                                    logger.info(f"Ugasam {device['id']} po urniku")
                            
                            # Preveri senzorje
                            if device["type"] == "sensor":
                                # Simulacija temperature
                                import random
                                temp = random.randint(20, 85)
                                
                                # Zabeleži podatke za učenje
                                if 'learning' in self.modules:
                                    try:
                                        if hasattr(self.modules['learning'], 'record_device_usage'):
                                            self.modules['learning'].record_device_usage(device['id'], {'temperature': temp})
                                    except Exception as e:
                                        logger.debug(f"Napaka pri beleženju podatkov za učenje: {e}")
                                
                                if temp > device.get("max_temp", 80):
                                    logger.warning(f"{device['id']} pregrevanje: {temp}°C")
                                    # Izvedi nujne ukrepe
                                    if 'actions' in self.modules:
                                        try:
                                            if hasattr(self.modules['actions'], 'emergency_shutdown'):
                                                self.modules['actions'].emergency_shutdown(device['id'])
                                        except Exception as e:
                                            logger.error(f"Napaka pri nujnem ukrepanju: {e}")
                        
                        # Izvedi avtomatske akcije
                        if 'actions' in self.modules:
                            try:
                                if hasattr(self.modules['actions'], 'check_and_execute_actions'):
                                    self.modules['actions'].check_and_execute_actions()
                            except Exception as e:
                                logger.warning(f"Napaka pri avtomatskih akcijah: {e}")
                        
                        time.sleep(30)  # Preveri vsakih 30 sekund
                        
                    except Exception as e:
                        logger.error(f"Napaka v avtonomni zanki: {e}")
                        time.sleep(60)  # Počakaj dlje ob napaki
            
            # Zaženi v ločeni niti
            thread = threading.Thread(target=autonomous_loop, daemon=True)
            thread.start()
            self.threads.append(thread)
            
            logger.info("✅ Avtonomno spremljanje uspešno zagnano")
            return True
            
        except Exception as e:
            logger.error(f"❌ Napaka pri zagonu avtonomnega spremljanja: {e}")
            return False
    
    def start_device_monitoring(self):
        """Zaženi spremljanje naprav"""
        if 'monitor' not in self.modules:
            logger.warning("⚠️ Monitoring modul ni dostopen")
            return False
        
        try:
            def monitoring_loop():
                logger.info("📊 Monitoring naprav zagnan")
                while self.running:
                    try:
                        # Simulacija monitoringa
                        devices_status = {
                            "online_devices": 3,
                            "offline_devices": 0,
                            "alerts": 0,
                            "last_check": datetime.now().isoformat()
                        }
                        
                        logger.info(f"📈 Status naprav: {devices_status['online_devices']} online")
                        time.sleep(60)  # Preveri vsako minuto
                        
                    except Exception as e:
                        logger.error(f"❌ Napaka v monitoring zanki: {e}")
                        time.sleep(10)
            
            thread = threading.Thread(target=monitoring_loop, daemon=True)
            thread.start()
            self.threads.append(thread)
            
            logger.info("✅ Monitoring naprav uspešno zagnan")
            return True
            
        except Exception as e:
            logger.error(f"❌ Napaka pri zagonu monitoringa: {e}")
            return False
    
    def start_system(self):
        """Zaženi celoten IoT sistem"""
        logger.info("🚀 Zaganjam Omni IoT Avtonomni Sistem...")
        
        # Naloži module
        self.load_modules()
        
        if not self.modules:
            logger.error("❌ Noben modul ni naložen - sistem se ne more zagnati")
            return False
        
        self.running = True
        
        # Zaženi podsisteme
        autonomous_started = self.start_autonomous_monitoring()
        monitoring_started = self.start_device_monitoring()
        
        if autonomous_started or monitoring_started:
            logger.info("✅ IoT sistem uspešno zagnan!")
            logger.info(f"📊 Aktivni moduli: {list(self.modules.keys())}")
            return True
        else:
            logger.error("❌ Noben podsistem se ni uspešno zagnal")
            self.running = False
            return False
    
    def stop_system(self):
        """Ustavi celoten sistem"""
        logger.info("🛑 Ustavljam IoT sistem...")
        self.running = False
        
        # Počakaj da se niti končajo
        for thread in self.threads:
            if thread.is_alive():
                thread.join(timeout=5)
        
        logger.info("✅ IoT sistem ustavljen")
    
    def get_system_status(self):
        """Vrni status sistema"""
        return {
            "running": self.running,
            "modules_loaded": len(self.modules),
            "active_threads": len([t for t in self.threads if t.is_alive()]),
            "modules": list(self.modules.keys()),
            "timestamp": datetime.now().isoformat()
        }

def main():
    """Glavna funkcija"""
    print("🤖 Omni IoT Avtonomni Sistem")
    print("=" * 50)
    
    # Ustvari sistem
    iot_system = OmniIoTSystem()
    
    try:
        # Zaženi sistem
        if iot_system.start_system():
            print("\n✅ Sistem uspešno zagnan!")
            print("📊 Status sistema:")
            status = iot_system.get_system_status()
            for key, value in status.items():
                print(f"   {key}: {value}")
            
            print("\n🔄 Sistem teče avtonomno...")
            print("💡 Pritisnite Ctrl+C za ustavitev")
            
            # Drži sistem živ
            try:
                while True:
                    time.sleep(10)
                    # Prikaži status vsakih 5 minut
                    if int(time.time()) % 300 == 0:
                        status = iot_system.get_system_status()
                        logger.info(f"💓 Sistem status: {status}")
                        
            except KeyboardInterrupt:
                print("\n🛑 Prejel signal za ustavitev...")
                
        else:
            print("❌ Sistem se ni mogel zagnati")
            return 1
            
    except Exception as e:
        logger.error(f"❌ Kritična napaka: {e}")
        return 1
        
    finally:
        iot_system.stop_system()
        print("👋 Sistem ustavljen")
    
    return 0

if __name__ == "__main__":
    exit(main())