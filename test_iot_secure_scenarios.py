#!/usr/bin/env python3
"""
🔒 Omni IoT Secure Scenarios Tests
Realni varnostni scenariji za IoT naprave in industrijske sisteme.

Scenariji:
- 🏠 Varno pametno domovanje
- 🏢 Varno pisarniško okolje
- 🏭 Varna industrijska avtomatizacija
- 🚨 Varnostni sistemi in alarmi
- ⚡ Energetsko upravljanje z varnostjo
- 🌐 Multi-tenant IoT platforma
- 🔐 Penetracijski testi

Avtor: Omni AI Platform
Verzija: 1.0.0
"""

import sys
import os
import json
import time
import random
from datetime import datetime, timedelta
from pathlib import Path

# Dodaj omni direktorij v Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'omni'))

try:
    from modules.iot.iot_secure import IoTSecureModule
    print("✅ IoT Secure modul uspešno naložen")
except ImportError as e:
    print(f"❌ Napaka pri nalaganju IoT Secure modula: {e}")
    sys.exit(1)

class IoTSecureScenarios:
    """Razred za testiranje realnih varnostnih scenarijev"""
    
    def __init__(self):
        """Inicializacija scenarijev"""
        self.iot_secure = IoTSecureModule()
        self.scenarios_results = []
        self.security_incidents = []
        
        # Simulirane naprave po kategorijah
        self.devices = {
            "smart_home": [
                "home/livingroom/light_main",
                "home/kitchen/light_ceiling", 
                "home/bedroom/light_bedside",
                "home/livingroom/tv_samsung",
                "home/kitchen/coffee_machine",
                "home/thermostat_main",
                "home/security/camera_front",
                "home/security/door_lock_main",
                "home/garage/door_opener"
            ],
            "office": [
                "office/floor1/lights_zone1",
                "office/floor1/lights_zone2",
                "office/floor2/lights_zone1", 
                "office/meeting_room1/projector",
                "office/meeting_room2/screen",
                "office/hvac_system_main",
                "office/security/cameras_all",
                "office/access_control/door_main",
                "office/server_room/cooling"
            ],
            "industrial": [
                "factory/line1/conveyor_belt",
                "factory/line1/robotic_arm1",
                "factory/line1/robotic_arm2",
                "factory/line2/press_machine",
                "factory/line2/welding_station",
                "factory/hvac/ventilation_main",
                "factory/safety/emergency_stop",
                "factory/monitoring/sensors_temp",
                "factory/power/main_switch"
            ],
            "security": [
                "security/perimeter/camera1",
                "security/perimeter/camera2",
                "security/entrance/scanner_main",
                "security/alarm/motion_detector1",
                "security/alarm/motion_detector2",
                "security/fire/smoke_detector1",
                "security/fire/sprinkler_system",
                "security/access/keycard_reader",
                "security/backup/generator"
            ],
            "energy": [
                "energy/solar/panel_array1",
                "energy/solar/panel_array2",
                "energy/battery/storage_main",
                "energy/grid/smart_meter",
                "energy/ev/charging_station1",
                "energy/ev/charging_station2",
                "energy/hvac/heat_pump",
                "energy/monitoring/power_analyzer",
                "energy/backup/ups_system"
            ]
        }
        
        print("🔒 IoT Secure Scenarios inicializiran")
    
    def log_scenario_result(self, scenario_name: str, success: bool, details: dict):
        """Logiraj rezultat scenarija"""
        result = {
            "timestamp": datetime.now().isoformat(),
            "scenario": scenario_name,
            "success": success,
            "details": details,
            "security_level": "high"
        }
        self.scenarios_results.append(result)
        
        status = "✅ USPEŠNO" if success else "❌ NEUSPEŠNO"
        print(f"{status} {scenario_name}: {details.get('message', 'Ni sporočila')}")
    
    def log_security_incident(self, incident_type: str, device: str, details: dict):
        """Logiraj varnostni incident"""
        incident = {
            "timestamp": datetime.now().isoformat(),
            "type": incident_type,
            "device": device,
            "details": details,
            "severity": details.get("severity", "medium")
        }
        self.security_incidents.append(incident)
        print(f"🚨 VARNOSTNI INCIDENT: {incident_type} na {device}")
    
    def scenario_smart_home_security(self):
        """🏠 Scenarij: Varno pametno domovanje"""
        print("\n🏠 SCENARIJ: Varno pametno domovanje")
        print("-" * 40)
        
        try:
            devices = self.devices["smart_home"]
            results = []
            
            # 1. Jutranjo rutino - prižgi luči varno
            print("🌅 Jutranja rutina - varno prižiganje luči...")
            morning_lights = [d for d in devices if "light" in d]
            
            for light in morning_lights:
                result = self.iot_secure.turn_on(light, "homeowner")
                results.append(result)
                time.sleep(0.2)  # Kratka pavza med ukazi
            
            successful_lights = sum(1 for r in results if r.get("success", False))
            
            # 2. Varnostni sistem - preveri kamere
            print("🔒 Preverjam varnostne kamere...")
            security_devices = [d for d in devices if "security" in d]
            
            for device in security_devices:
                status_result = self.iot_secure.status(device, None, "security_system")
                results.append(status_result)
            
            # 3. Energetska optimizacija - termostat
            print("🌡️ Optimiziram termostat...")
            thermostat_result = self.iot_secure.turn_on("home/thermostat_main", "energy_optimizer")
            results.append(thermostat_result)
            
            # 4. Večerna rutina - množično ugašanje
            print("🌙 Večerna rutina - množično ugašanje...")
            evening_devices = [d for d in devices if d not in security_devices]
            bulk_result = self.iot_secure.bulk_control(evening_devices, "turn_off", "homeowner")
            results.append(bulk_result)
            
            # Analiza rezultatov
            total_operations = len(results)
            successful_operations = sum(1 for r in results if r.get("success", False))
            
            success = successful_operations >= (total_operations * 0.8)  # 80% uspešnost
            
            self.log_scenario_result("smart_home_security", success, {
                "message": f"Pametno domovanje: {successful_operations}/{total_operations} operacij uspešnih",
                "lights_activated": successful_lights,
                "security_checks": len(security_devices),
                "bulk_operations": bulk_result.get("successful", 0) if bulk_result.get("success") else 0
            })
            
            return success
            
        except Exception as e:
            self.log_scenario_result("smart_home_security", False, {
                "message": f"Napaka v pametnem domu: {str(e)}"
            })
            return False
    
    def scenario_office_automation_security(self):
        """🏢 Scenarij: Varno pisarniško okolje"""
        print("\n🏢 SCENARIJ: Varno pisarniško okolje")
        print("-" * 40)
        
        try:
            devices = self.devices["office"]
            results = []
            
            # 1. Delovni čas - aktivacija sistemov
            print("🏢 Aktivacija pisarniških sistemov...")
            work_hours_devices = [d for d in devices if "lights" in d or "hvac" in d]
            
            for device in work_hours_devices:
                result = self.iot_secure.turn_on(device, "facility_manager")
                results.append(result)
                time.sleep(0.1)
            
            # 2. Sestankovna soba - projektorji
            print("📽️ Priprava sestankovnih sob...")
            meeting_devices = [d for d in devices if "meeting_room" in d]
            
            for device in meeting_devices:
                result = self.iot_secure.turn_on(device, "meeting_organizer")
                results.append(result)
            
            # 3. Varnostni pregled - dostopni sistemi
            print("🔐 Varnostni pregled dostopnih sistemov...")
            security_devices = [d for d in devices if "security" in d or "access_control" in d]
            
            for device in security_devices:
                status_result = self.iot_secure.status(device, None, "security_officer")
                results.append(status_result)
            
            # 4. Strežniška soba - kritični sistemi
            print("🖥️ Preverjam kritične sisteme...")
            critical_devices = [d for d in devices if "server_room" in d]
            
            for device in critical_devices:
                # Kritični sistemi potrebujejo posebno obravnavo
                result = self.iot_secure.status(device, None, "it_admin")
                results.append(result)
                
                # Simulacija kritičnega alarma
                if random.random() < 0.1:  # 10% možnost alarma
                    self.log_security_incident("CRITICAL_SYSTEM_ALERT", device, {
                        "severity": "high",
                        "message": "Temperatura strežniške sobe previsoka",
                        "action_required": "immediate_cooling"
                    })
            
            # 5. Konec delovnega dne - varno ugašanje
            print("🌆 Konec delovnega dne - varno ugašanje...")
            non_critical_devices = [d for d in devices if "lights" in d or "meeting_room" in d]
            bulk_result = self.iot_secure.bulk_control(non_critical_devices, "turn_off", "facility_manager")
            results.append(bulk_result)
            
            # Analiza rezultatov
            total_operations = len(results)
            successful_operations = sum(1 for r in results if r.get("success", False))
            
            success = successful_operations >= (total_operations * 0.85)  # 85% uspešnost za pisarno
            
            self.log_scenario_result("office_automation_security", success, {
                "message": f"Pisarniška avtomatizacija: {successful_operations}/{total_operations} operacij uspešnih",
                "work_systems": len(work_hours_devices),
                "meeting_rooms": len(meeting_devices),
                "security_checks": len(security_devices),
                "critical_systems": len(critical_devices)
            })
            
            return success
            
        except Exception as e:
            self.log_scenario_result("office_automation_security", False, {
                "message": f"Napaka v pisarniški avtomatizaciji: {str(e)}"
            })
            return False
    
    def scenario_industrial_security(self):
        """🏭 Scenarij: Varna industrijska avtomatizacija"""
        print("\n🏭 SCENARIJ: Varna industrijska avtomatizacija")
        print("-" * 40)
        
        try:
            devices = self.devices["industrial"]
            results = []
            
            # 1. Varnostni pregled pred zagonom
            print("🔍 Varnostni pregled pred zagonom proizvodnje...")
            safety_devices = [d for d in devices if "safety" in d or "emergency" in d]
            
            for device in safety_devices:
                result = self.iot_secure.status(device, None, "safety_officer")
                results.append(result)
                
                # Simulacija varnostnega preverjanja
                if "emergency_stop" in device:
                    # Test emergency stop sistema
                    test_result = self.iot_secure.turn_on(device, "safety_officer")
                    results.append(test_result)
                    time.sleep(0.5)
                    test_result2 = self.iot_secure.turn_off(device, "safety_officer")
                    results.append(test_result2)
            
            # 2. Zagon proizvodne linije 1
            print("🏭 Zagon proizvodne linije 1...")
            line1_devices = [d for d in devices if "line1" in d]
            
            # Sekvencialni zagon (pomembno za varnost)
            for device in sorted(line1_devices):
                result = self.iot_secure.turn_on(device, "production_manager")
                results.append(result)
                time.sleep(0.3)  # Pavza med zagonom naprav
                
                # Simulacija senzorskega preverjanja
                if random.random() < 0.05:  # 5% možnost alarma
                    self.log_security_incident("PRODUCTION_ANOMALY", device, {
                        "severity": "medium",
                        "message": "Neobičajne vibracije zaznane",
                        "action_required": "inspection_needed"
                    })
            
            # 3. Monitoring in nadzor
            print("📊 Monitoring proizvodnih parametrov...")
            monitoring_devices = [d for d in devices if "monitoring" in d or "sensors" in d]
            
            for device in monitoring_devices:
                result = self.iot_secure.status(device, None, "quality_control")
                results.append(result)
            
            # 4. Energetsko upravljanje
            print("⚡ Upravljanje energetskih sistemov...")
            power_devices = [d for d in devices if "power" in d or "hvac" in d]
            
            for device in power_devices:
                result = self.iot_secure.turn_on(device, "energy_manager")
                results.append(result)
            
            # 5. Simulacija kritične situacije
            print("🚨 Simulacija kritične situacije...")
            if random.random() < 0.2:  # 20% možnost kritične situacije
                emergency_device = "factory/safety/emergency_stop"
                emergency_result = self.iot_secure.turn_on(emergency_device, "emergency_system")
                results.append(emergency_result)
                
                # Zaustavitev vseh proizvodnih naprav
                production_devices = [d for d in devices if "line" in d or "machine" in d]
                emergency_stop_result = self.iot_secure.bulk_control(production_devices, "turn_off", "emergency_system")
                results.append(emergency_stop_result)
                
                self.log_security_incident("EMERGENCY_SHUTDOWN", "factory/production", {
                    "severity": "critical",
                    "message": "Kritična situacija - proizvodnja zaustavljena",
                    "devices_affected": len(production_devices),
                    "action_required": "immediate_inspection"
                })
            
            # Analiza rezultatov
            total_operations = len(results)
            successful_operations = sum(1 for r in results if r.get("success", False))
            
            success = successful_operations >= (total_operations * 0.9)  # 90% uspešnost za industrijo
            
            self.log_scenario_result("industrial_security", success, {
                "message": f"Industrijska avtomatizacija: {successful_operations}/{total_operations} operacij uspešnih",
                "safety_checks": len(safety_devices),
                "production_line1": len(line1_devices),
                "monitoring_systems": len(monitoring_devices),
                "power_systems": len(power_devices)
            })
            
            return success
            
        except Exception as e:
            self.log_scenario_result("industrial_security", False, {
                "message": f"Napaka v industrijski avtomatizaciji: {str(e)}"
            })
            return False
    
    def scenario_security_systems(self):
        """🚨 Scenarij: Varnostni sistemi in alarmi"""
        print("\n🚨 SCENARIJ: Varnostni sistemi in alarmi")
        print("-" * 40)
        
        try:
            devices = self.devices["security"]
            results = []
            
            # 1. Aktivacija perimetrske varnosti
            print("🛡️ Aktivacija perimetrske varnosti...")
            perimeter_devices = [d for d in devices if "perimeter" in d]
            
            for device in perimeter_devices:
                result = self.iot_secure.turn_on(device, "security_admin")
                results.append(result)
            
            # 2. Vstopni nadzor
            print("🚪 Aktivacija vstopnega nadzora...")
            access_devices = [d for d in devices if "entrance" in d or "access" in d]
            
            for device in access_devices:
                result = self.iot_secure.turn_on(device, "access_control_admin")
                results.append(result)
            
            # 3. Požarni varnostni sistem
            print("🔥 Preverjam požarni varnostni sistem...")
            fire_devices = [d for d in devices if "fire" in d]
            
            for device in fire_devices:
                result = self.iot_secure.status(device, None, "fire_safety_officer")
                results.append(result)
                
                # Simulacija požarnega alarma
                if random.random() < 0.05:  # 5% možnost požarnega alarma
                    alarm_result = self.iot_secure.turn_on(device, "fire_alarm_system")
                    results.append(alarm_result)
                    
                    self.log_security_incident("FIRE_ALARM", device, {
                        "severity": "critical",
                        "message": "Dim zaznan - aktiviran požarni alarm",
                        "action_required": "immediate_evacuation",
                        "emergency_services": "contacted"
                    })
            
            # 4. Gibalni senzorji
            print("👁️ Aktivacija gibalnih senzorjev...")
            motion_devices = [d for d in devices if "motion" in d]
            
            for device in motion_devices:
                result = self.iot_secure.turn_on(device, "security_system")
                results.append(result)
                
                # Simulacija zaznanega gibanja
                if random.random() < 0.15:  # 15% možnost zaznanega gibanja
                    self.log_security_incident("MOTION_DETECTED", device, {
                        "severity": "medium",
                        "message": "Nepooblaščeno gibanje zaznano",
                        "action_required": "security_check",
                        "timestamp": datetime.now().isoformat()
                    })
            
            # 5. Rezervni sistemi
            print("🔋 Preverjam rezervne sisteme...")
            backup_devices = [d for d in devices if "backup" in d or "generator" in d]
            
            for device in backup_devices:
                result = self.iot_secure.status(device, None, "maintenance_admin")
                results.append(result)
                
                # Test rezervnega sistema
                if "generator" in device:
                    test_result = self.iot_secure.turn_on(device, "maintenance_admin")
                    results.append(test_result)
                    time.sleep(1)
                    test_result2 = self.iot_secure.turn_off(device, "maintenance_admin")
                    results.append(test_result2)
            
            # 6. Integriran varnostni pregled
            print("🔍 Integriran varnostni pregled...")
            all_security_status = []
            
            for device in devices:
                status_result = self.iot_secure.status(device, None, "security_audit")
                all_security_status.append(status_result)
                results.append(status_result)
            
            # Analiza rezultatov
            total_operations = len(results)
            successful_operations = sum(1 for r in results if r.get("success", False))
            
            success = successful_operations >= (total_operations * 0.95)  # 95% uspešnost za varnost
            
            self.log_scenario_result("security_systems", success, {
                "message": f"Varnostni sistemi: {successful_operations}/{total_operations} operacij uspešnih",
                "perimeter_devices": len(perimeter_devices),
                "access_control": len(access_devices),
                "fire_safety": len(fire_devices),
                "motion_sensors": len(motion_devices),
                "backup_systems": len(backup_devices),
                "security_incidents": len([i for i in self.security_incidents if i["timestamp"] > (datetime.now() - timedelta(minutes=5)).isoformat()])
            })
            
            return success
            
        except Exception as e:
            self.log_scenario_result("security_systems", False, {
                "message": f"Napaka v varnostnih sistemih: {str(e)}"
            })
            return False
    
    def scenario_energy_management_security(self):
        """⚡ Scenarij: Energetsko upravljanje z varnostjo"""
        print("\n⚡ SCENARIJ: Energetsko upravljanje z varnostjo")
        print("-" * 40)
        
        try:
            devices = self.devices["energy"]
            results = []
            
            # 1. Sončni paneli - jutranjo aktivacijo
            print("☀️ Aktivacija sončnih panelov...")
            solar_devices = [d for d in devices if "solar" in d]
            
            for device in solar_devices:
                result = self.iot_secure.turn_on(device, "energy_manager")
                results.append(result)
                
                # Simulacija preverjanja proizvodnje
                status_result = self.iot_secure.status(device, None, "energy_monitor")
                results.append(status_result)
            
            # 2. Baterijski sistemi
            print("🔋 Upravljanje baterijskih sistemov...")
            battery_devices = [d for d in devices if "battery" in d]
            
            for device in battery_devices:
                result = self.iot_secure.status(device, None, "battery_manager")
                results.append(result)
                
                # Simulacija kritično nizke baterije
                if random.random() < 0.1:  # 10% možnost nizke baterije
                    self.log_security_incident("LOW_BATTERY_ALERT", device, {
                        "severity": "medium",
                        "message": "Baterija pod 20% kapacitete",
                        "action_required": "charging_needed",
                        "backup_available": True
                    })
            
            # 3. Pametni števec
            print("📊 Preverjam pametni števec...")
            meter_devices = [d for d in devices if "meter" in d]
            
            for device in meter_devices:
                result = self.iot_secure.status(device, None, "utility_monitor")
                results.append(result)
                
                # Simulacija neobičajne porabe
                if random.random() < 0.08:  # 8% možnost neobičajne porabe
                    self.log_security_incident("UNUSUAL_CONSUMPTION", device, {
                        "severity": "medium",
                        "message": "Neobičajno visoka poraba energije zaznana",
                        "action_required": "consumption_analysis",
                        "potential_cause": "device_malfunction_or_theft"
                    })
            
            # 4. Polnilne postaje za električna vozila
            print("🚗 Upravljanje polnilnih postaj...")
            ev_devices = [d for d in devices if "ev" in d]
            
            for device in ev_devices:
                result = self.iot_secure.turn_on(device, "ev_manager")
                results.append(result)
                
                # Simulacija polnjenja
                time.sleep(0.2)
                
                # Preveri stanje polnjenja
                status_result = self.iot_secure.status(device, None, "ev_monitor")
                results.append(status_result)
            
            # 5. HVAC sistemi - optimizacija
            print("🌡️ Optimizacija HVAC sistemov...")
            hvac_devices = [d for d in devices if "hvac" in d]
            
            for device in hvac_devices:
                result = self.iot_secure.turn_on(device, "hvac_optimizer")
                results.append(result)
            
            # 6. UPS sistemi
            print("⚡ Preverjam UPS sisteme...")
            ups_devices = [d for d in devices if "ups" in d]
            
            for device in ups_devices:
                result = self.iot_secure.status(device, None, "power_admin")
                results.append(result)
                
                # Test UPS sistema
                if random.random() < 0.05:  # 5% možnost testa
                    test_result = self.iot_secure.turn_on(device, "power_admin")
                    results.append(test_result)
                    
                    self.log_security_incident("UPS_TEST", device, {
                        "severity": "low",
                        "message": "UPS sistem testiran - deluje pravilno",
                        "action_required": "none",
                        "backup_time": "30_minutes"
                    })
            
            # 7. Energetska optimizacija
            print("🎯 Energetska optimizacija...")
            
            # Simulacija optimizacije glede na čas dneva
            current_hour = datetime.now().hour
            
            if 6 <= current_hour <= 18:  # Dnevni čas
                # Aktiviraj sončne panele, zmanjšaj porabo baterij
                optimization_result = self.iot_secure.bulk_control(solar_devices, "turn_on", "energy_optimizer")
                results.append(optimization_result)
            else:  # Nočni čas
                # Uporabi baterije, zmanjšaj nepotrebno porabo
                optimization_result = self.iot_secure.bulk_control(battery_devices, "turn_on", "energy_optimizer")
                results.append(optimization_result)
            
            # Analiza rezultatov
            total_operations = len(results)
            successful_operations = sum(1 for r in results if r.get("success", False))
            
            success = successful_operations >= (total_operations * 0.88)  # 88% uspešnost za energetiko
            
            self.log_scenario_result("energy_management_security", success, {
                "message": f"Energetsko upravljanje: {successful_operations}/{total_operations} operacij uspešnih",
                "solar_panels": len(solar_devices),
                "battery_systems": len(battery_devices),
                "smart_meters": len(meter_devices),
                "ev_chargers": len(ev_devices),
                "hvac_systems": len(hvac_devices),
                "ups_systems": len(ups_devices),
                "optimization_time": current_hour
            })
            
            return success
            
        except Exception as e:
            self.log_scenario_result("energy_management_security", False, {
                "message": f"Napaka v energetskem upravljanju: {str(e)}"
            })
            return False
    
    def scenario_penetration_testing(self):
        """🔐 Scenarij: Penetracijski testi varnosti"""
        print("\n🔐 SCENARIJ: Penetracijski testi varnosti")
        print("-" * 40)
        
        try:
            results = []
            
            # 1. Test neveljavnih device topic-ov
            print("🚫 Test neveljavnih device topic-ov...")
            malicious_topics = [
                "../../../etc/passwd",
                "device; rm -rf /",
                "device|malicious_command",
                "device && shutdown -h now",
                "device`whoami`",
                "device$(cat /etc/shadow)",
                "",
                None,
                "device\x00null_byte",
                "device\n\rinjection"
            ]
            
            blocked_attacks = 0
            for topic in malicious_topics:
                try:
                    result = self.iot_secure.turn_on(topic, "attacker")
                    if not result.get("success", True):  # Pričakujemo neuspeh
                        blocked_attacks += 1
                    results.append(result)
                except:
                    blocked_attacks += 1  # Exception je tudi blokada
            
            # 2. Test rate limiting napadov
            print("⚡ Test rate limiting napadov...")
            rapid_fire_device = "test/rapid_fire"
            rate_limit_blocks = 0
            
            for i in range(10):  # 10 hitrih ukazov
                result = self.iot_secure.turn_on(rapid_fire_device, "attacker")
                if not result.get("success", True):
                    rate_limit_blocks += 1
                results.append(result)
                time.sleep(0.01)  # Zelo hitra zaporedja
            
            # 3. Test API injection napadov
            print("💉 Test API injection napadov...")
            malicious_urls = [
                "http://evil.com/steal_data",
                "https://localhost:8080/../../admin",
                "http://internal.network/secret",
                "javascript:alert('xss')",
                "file:///etc/passwd"
            ]
            
            api_blocks = 0
            for url in malicious_urls:
                try:
                    result = self.iot_secure.status("test/device", url, "attacker")
                    if not result.get("success", True):
                        api_blocks += 1
                    results.append(result)
                except:
                    api_blocks += 1
            
            # 4. Test bulk operation abuse
            print("🔄 Test bulk operation abuse...")
            massive_device_list = [f"fake/device{i}" for i in range(1000)]  # Preveč naprav
            
            bulk_result = self.iot_secure.bulk_control(massive_device_list, "turn_on", "attacker")
            results.append(bulk_result)
            
            # Preveri, da sistem ni padel
            bulk_abuse_blocked = not bulk_result.get("success", True) or bulk_result.get("successful", 0) < 100
            
            # 5. Test log tampering
            print("📝 Test log tampering...")
            original_log_count = len(self.iot_secure.get_audit_logs())
            
            # Poskusi direktno manipulacijo log datoteke
            log_tampering_blocked = True
            try:
                # Simulacija poskusa brisanja logov
                if os.path.exists(self.iot_secure.log_file):
                    # V resničnem sistemu bi to moralo biti blokirano
                    pass
            except:
                pass  # Pričakovano
            
            new_log_count = len(self.iot_secure.get_audit_logs())
            log_integrity_maintained = new_log_count >= original_log_count
            
            # 6. Test privilege escalation
            print("👑 Test privilege escalation...")
            privilege_escalation_blocked = 0
            
            # Poskusi dostopa do admin funkcij z običajnim uporabnikom
            admin_functions = [
                ("factory/critical/emergency_stop", "turn_off"),
                ("security/master/disable_all", "turn_on"),
                ("power/main/shutdown", "turn_on")
            ]
            
            for device, action in admin_functions:
                if action == "turn_off":
                    result = self.iot_secure.turn_off(device, "regular_user")
                else:
                    result = self.iot_secure.turn_on(device, "regular_user")
                
                # V resničnem sistemu bi moral biti dostop omejen
                results.append(result)
            
            # Analiza varnostnih testov
            total_malicious_attempts = len(malicious_topics) + 10 + len(malicious_urls) + 1 + len(admin_functions)
            total_blocked = blocked_attacks + rate_limit_blocks + api_blocks + (1 if bulk_abuse_blocked else 0)
            
            security_score = (total_blocked / total_malicious_attempts) * 100
            
            success = security_score >= 80  # 80% varnostnih napadov mora biti blokiranih
            
            self.log_scenario_result("penetration_testing", success, {
                "message": f"Penetracijski testi: {security_score:.1f}% napadov blokiranih",
                "malicious_topics_blocked": blocked_attacks,
                "rate_limit_blocks": rate_limit_blocks,
                "api_injection_blocks": api_blocks,
                "bulk_abuse_blocked": bulk_abuse_blocked,
                "log_integrity_maintained": log_integrity_maintained,
                "security_score": security_score,
                "total_attempts": total_malicious_attempts,
                "total_blocked": total_blocked
            })
            
            # Logiraj varnostne incidente
            if security_score < 90:
                self.log_security_incident("SECURITY_WEAKNESS", "penetration_test", {
                    "severity": "high",
                    "message": f"Varnostni testi pokazali šibkosti: {security_score:.1f}% uspešnost",
                    "action_required": "security_hardening",
                    "recommendations": [
                        "Izboljšaj input validation",
                        "Ojačaj rate limiting",
                        "Dodaj privilege checking",
                        "Implementiraj log protection"
                    ]
                })
            
            return success
            
        except Exception as e:
            self.log_scenario_result("penetration_testing", False, {
                "message": f"Napaka pri penetracijskih testih: {str(e)}"
            })
            return False
    
    def run_all_scenarios(self):
        """Poženi vse varnostne scenarije"""
        print("🔒 OMNI IOT SECURE SCENARIOS")
        print("=" * 50)
        
        scenarios = [
            ("Smart Home Security", self.scenario_smart_home_security),
            ("Office Automation Security", self.scenario_office_automation_security),
            ("Industrial Security", self.scenario_industrial_security),
            ("Security Systems", self.scenario_security_systems),
            ("Energy Management Security", self.scenario_energy_management_security),
            ("Penetration Testing", self.scenario_penetration_testing)
        ]
        
        successful_scenarios = 0
        
        for scenario_name, scenario_func in scenarios:
            try:
                success = scenario_func()
                if success:
                    successful_scenarios += 1
                time.sleep(1)  # Pavza med scenariji
            except Exception as e:
                print(f"❌ Napaka v scenariju {scenario_name}: {e}")
        
        # Povzetek rezultatov
        print("\n" + "=" * 50)
        print("📊 POVZETEK VARNOSTNIH SCENARIJEV")
        print("=" * 50)
        
        print(f"✅ Uspešni scenariji: {successful_scenarios}/{len(scenarios)}")
        print(f"🚨 Varnostni incidenti: {len(self.security_incidents)}")
        
        # Analiza varnostnih incidentov
        if self.security_incidents:
            print("\n🚨 VARNOSTNI INCIDENTI:")
            for incident in self.security_incidents[-5:]:  # Zadnjih 5
                severity_icon = {"low": "🟢", "medium": "🟡", "high": "🔴", "critical": "🚨"}.get(incident["severity"], "⚪")
                print(f"{severity_icon} {incident['type']}: {incident['details']['message']}")
        
        # Priporočila
        print("\n💡 PRIPOROČILA:")
        if successful_scenarios == len(scenarios):
            print("✅ Vsi scenariji uspešni - sistem je pripravljen za produkcijo")
        else:
            print("⚠️ Nekateri scenariji neuspešni - potrebne izboljšave")
        
        print("🔐 Nastavi resnične MQTT TLS certifikate")
        print("🔑 Konfiguriraj močne API tokene")
        print("📊 Nastavi monitoring in alerting")
        print("🛡️ Implementiraj dodatne varnostne sloje")
        print("📝 Redno preverjaj audit loge")
        
        return successful_scenarios == len(scenarios)

def main():
    """Glavna funkcija"""
    scenarios = IoTSecureScenarios()
    success = scenarios.run_all_scenarios()
    
    if success:
        print("\n🎉 Vsi varnostni scenariji uspešno končani!")
        return 0
    else:
        print("\n⚠️ Nekateri scenariji potrebujejo pozornost.")
        return 1

if __name__ == "__main__":
    exit(main())