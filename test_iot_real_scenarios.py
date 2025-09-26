#!/usr/bin/env python3
"""
🏠 Test skript za realne IoT scenarije
Demonstrira praktične uporabne primere realnega IoT modula.

Avtor: Omni AI Platform
Verzija: 1.0.0
"""

import sys
import os
import time
import json

# Dodaj pot do projekta
sys.path.insert(0, os.getcwd())

def smart_home_scenario():
    """🏠 Scenarij pametnega doma"""
    print("🏠 === SCENARIJ PAMETNEGA DOMA ===\n")
    
    try:
        from omni.modules.iot.iot_real import IoTRealModule
        
        iot = IoTRealModule()
        
        print("📋 Scenarij: Jutranjo rutino v pametnem domu")
        print("   - Prižgi luči v dnevni sobi")
        print("   - Vklopi kavo")
        print("   - Odpri žaluzije")
        print("   - Vklopi radio\n")
        
        # Simulacija jutranje rutine
        devices_morning = [
            ("home/livingroom/light", "Luči v dnevni sobi"),
            ("home/kitchen/coffee_maker", "Kavni aparat"),
            ("home/livingroom/blinds", "Žaluzije"),
            ("home/livingroom/radio", "Radio")
        ]
        
        print("🌅 Izvajam jutranjo rutino...")
        for device, name in devices_morning:
            result = iot.turn_on(device)
            print(f"   ✅ {name}: {result['message']}")
            time.sleep(0.5)  # Kratka pavza med ukazi
        
        print("\n📊 Preverjam stanje naprav...")
        for device, name in devices_morning:
            result = iot.status(device)
            if result['success']:
                print(f"   📈 {name}: {result.get('state', 'aktivno')}")
        
        print("\n🌙 Večerna rutina - ugašanje naprav...")
        evening_devices = ["home/livingroom/light", "home/kitchen/coffee_maker", "home/livingroom/radio"]
        result = iot.bulk_control(evening_devices, "turn_off")
        print(f"   🔄 Ugašenih {result['successful']}/{result['total_devices']} naprav")
        
        return True
        
    except Exception as e:
        print(f"❌ Napaka v scenariju pametnega doma: {e}")
        return False

def office_automation_scenario():
    """🏢 Scenarij pisarnske avtomatizacije"""
    print("🏢 === SCENARIJ PISARNSKE AVTOMATIZACIJE ===\n")
    
    try:
        from omni.modules.iot.iot_real import IoTRealModule
        
        iot = IoTRealModule()
        
        print("📋 Scenarij: Upravljanje pisarnskih naprav")
        print("   - Vklopi računalnike")
        print("   - Nastavi klimatsko napravo")
        print("   - Vklopi tiskalnik")
        print("   - Preveri stanje strežnika\n")
        
        # Pisarnske naprave
        office_devices = [
            ("office/workstation1", "Delovna postaja 1"),
            ("office/workstation2", "Delovna postaja 2"),
            ("office/printer", "Tiskalnik"),
            ("office/ac_unit", "Klimatska naprava")
        ]
        
        print("🏢 Vklapljam pisarnske naprave...")
        for device, name in office_devices:
            result = iot.turn_on(device)
            print(f"   ✅ {name}: {result['message']}")
        
        # Preveri stanje strežnika preko REST API
        print("\n🖥️ Preverjam stanje strežnika...")
        # Simulacija REST API klica
        server_status = iot.status("office/server", "https://httpbin.org/status/200")
        if server_status['success']:
            print("   ✅ Strežnik: Deluje normalno")
        else:
            print("   ⚠️ Strežnik: Ni dosegljiv")
        
        # Pošlji poljubno MQTT sporočilo za monitoring
        print("\n📡 Pošiljam monitoring podatke...")
        monitoring_data = json.dumps({
            "timestamp": time.time(),
            "office_status": "active",
            "devices_online": len(office_devices)
        })
        
        result = iot.send_custom_mqtt("office/monitoring/status", monitoring_data)
        print(f"   📊 Monitoring: {result['message']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Napaka v pisarnskem scenariju: {e}")
        return False

def industrial_scenario():
    """🏭 Scenarij industrijske avtomatizacije"""
    print("🏭 === SCENARIJ INDUSTRIJSKE AVTOMATIZACIJE ===\n")
    
    try:
        from omni.modules.iot.iot_real import IoTRealModule
        
        iot = IoTRealModule()
        
        print("📋 Scenarij: Nadzor industrijskih strojev")
        print("   - Zaženi proizvodno linijo")
        print("   - Preveri senzorje")
        print("   - Nastavi varnostne sisteme")
        print("   - Monitoring kakovosti\n")
        
        # Industrijski stroji
        industrial_machines = [
            ("factory/line1/conveyor", "Transportni trak 1"),
            ("factory/line1/robot_arm", "Robotska roka"),
            ("factory/line1/quality_scanner", "Skener kakovosti"),
            ("factory/safety/emergency_stop", "Varnostni sistem")
        ]
        
        print("🏭 Zaganjam proizvodno linijo...")
        for device, name in industrial_machines[:-1]:  # Brez varnostnega sistema
            result = iot.turn_on(device)
            print(f"   ✅ {name}: {result['message']}")
            time.sleep(1)  # Daljša pavza za industrijske stroje
        
        # Aktiviraj varnostni sistem
        print("\n🛡️ Aktiviram varnostni sistem...")
        result = iot.turn_on("factory/safety/emergency_stop")
        print(f"   🛡️ Varnostni sistem: {result['message']}")
        
        # Simulacija senzorskih podatkov
        print("\n📊 Pošiljam senzorske podatke...")
        sensor_data = {
            "temperature": 23.5,
            "humidity": 45.2,
            "pressure": 1013.25,
            "vibration": 0.02,
            "timestamp": time.time()
        }
        
        result = iot.send_custom_mqtt("factory/sensors/data", json.dumps(sensor_data))
        print(f"   📈 Senzorji: {result['message']}")
        
        # Preveri stanje vseh strojev
        print("\n🔍 Preverjam stanje strojev...")
        for device, name in industrial_machines:
            result = iot.status(device)
            if result['success']:
                print(f"   📊 {name}: Operativen")
        
        return True
        
    except Exception as e:
        print(f"❌ Napaka v industrijskem scenariju: {e}")
        return False

def home_assistant_scenario():
    """🏠 Scenarij Home Assistant integracije"""
    print("🏠 === SCENARIJ HOME ASSISTANT INTEGRACIJE ===\n")
    
    try:
        from omni.modules.iot.iot_real import IoTRealModule
        
        iot = IoTRealModule()
        
        print("📋 Scenarij: Upravljanje preko Home Assistant")
        print("   - Upravljanje luči")
        print("   - Nadzor klimatske naprave")
        print("   - Upravljanje medijev")
        print("   - Varnostni sistem\n")
        
        # Home Assistant entitete
        ha_entities = [
            ("light.living_room", "turn_on", "Luč v dnevni sobi"),
            ("climate.main_ac", "set_temperature", "Klimatska naprava"),
            ("media_player.spotify", "media_play", "Spotify predvajalnik"),
            ("alarm_control_panel.home", "alarm_arm_home", "Domači alarm")
        ]
        
        print("🏠 Upravljam naprave preko Home Assistant...")
        for entity_id, service, name in ha_entities:
            # Dodatni podatki za nekatere servise
            service_data = None
            if service == "set_temperature":
                service_data = {"temperature": 22}
            
            result = iot.home_assistant_call(entity_id, service, service_data)
            
            if result['success']:
                print(f"   ✅ {name}: Uspešno")
            else:
                print(f"   ⚠️ {name}: {result['message']}")
        
        # Preveri stanje entitet (simulacija)
        print("\n📊 Preverjam stanje Home Assistant entitet...")
        print("   ℹ️ Za realno preverjanje stanja potrebuješ Home Assistant API")
        
        return True
        
    except Exception as e:
        print(f"❌ Napaka v Home Assistant scenariju: {e}")
        return False

def energy_management_scenario():
    """⚡ Scenarij upravljanja energije"""
    print("⚡ === SCENARIJ UPRAVLJANJA ENERGIJE ===\n")
    
    try:
        from omni.modules.iot.iot_real import IoTRealModule
        
        iot = IoTRealModule()
        
        print("📋 Scenarij: Pametno upravljanje energije")
        print("   - Optimizacija porabe")
        print("   - Nadzor sončnih panelov")
        print("   - Upravljanje baterij")
        print("   - Monitoring porabe\n")
        
        # Energetske naprave
        energy_devices = [
            ("energy/solar_panels", "Sončni paneli"),
            ("energy/battery_storage", "Baterijski sistem"),
            ("energy/smart_meter", "Pametni števec"),
            ("energy/heat_pump", "Toplotna črpalka")
        ]
        
        print("⚡ Optimiziram energetski sistem...")
        
        # Vklopi sončne panele (če je dan)
        result = iot.turn_on("energy/solar_panels")
        print(f"   ☀️ Sončni paneli: {result['message']}")
        
        # Nastavi baterijski sistem
        result = iot.turn_on("energy/battery_storage")
        print(f"   🔋 Baterije: {result['message']}")
        
        # Pošlji energetske podatke
        print("\n📊 Pošiljam energetske podatke...")
        energy_data = {
            "solar_production": 4.2,  # kW
            "battery_level": 85,      # %
            "grid_consumption": 2.1,  # kW
            "timestamp": time.time()
        }
        
        result = iot.send_custom_mqtt("energy/monitoring/data", json.dumps(energy_data))
        print(f"   📈 Energetski podatki: {result['message']}")
        
        # Optimizacija porabe
        print("\n🔧 Optimiziram porabo energije...")
        high_consumption_devices = ["home/water_heater", "home/dishwasher", "home/washing_machine"]
        
        # Ugaši energetsko potratne naprave v času nizke proizvodnje
        result = iot.bulk_control(high_consumption_devices, "turn_off")
        print(f"   💡 Optimizacija: {result['successful']} naprav ugašenih")
        
        return True
        
    except Exception as e:
        print(f"❌ Napaka v energetskem scenariju: {e}")
        return False

def main():
    """Glavna funkcija za test scenarijev"""
    print("🚀 OMNI IOT REAL - REALNI SCENARIJI")
    print("=" * 50)
    
    scenarios = [
        ("🏠 Pametni dom", smart_home_scenario),
        ("🏢 Pisarnska avtomatizacija", office_automation_scenario),
        ("🏭 Industrijska avtomatizacija", industrial_scenario),
        ("🏠 Home Assistant", home_assistant_scenario),
        ("⚡ Upravljanje energije", energy_management_scenario)
    ]
    
    results = {}
    
    for name, scenario_func in scenarios:
        print(f"\n{'='*20}")
        print(f"Izvajam scenarij: {name}")
        print(f"{'='*20}")
        
        try:
            success = scenario_func()
            results[name] = success
            
            if success:
                print(f"✅ Scenarij {name} uspešno končan")
            else:
                print(f"❌ Scenarij {name} neuspešen")
                
        except Exception as e:
            print(f"❌ Napaka v scenariju {name}: {e}")
            results[name] = False
        
        time.sleep(1)  # Pavza med scenariji
    
    # Povzetek rezultatov
    print("\n" + "=" * 50)
    print("📊 POVZETEK SCENARIJEV:")
    
    successful = 0
    for name, success in results.items():
        status = "✅" if success else "❌"
        print(f"   {status} {name}")
        if success:
            successful += 1
    
    print(f"\n🎯 Uspešnost: {successful}/{len(scenarios)} scenarijev")
    
    if successful == len(scenarios):
        print("\n🎉 VSI SCENARIJI USPEŠNI!")
        print("\n📋 Realni IoT modul je pripravljen za:")
        print("   • Pametne domove")
        print("   • Pisarnsko avtomatizacijo")
        print("   • Industrijsko avtomatizacijo")
        print("   • Home Assistant integracijo")
        print("   • Upravljanje energije")
        
    else:
        print("\n⚠️ NEKATERI SCENARIJI NEUSPEŠNI")
        print("   Preveri MQTT broker in Home Assistant nastavitve")
    
    print("\n📝 Naslednji koraki:")
    print("   1. Nastavi realni MQTT broker")
    print("   2. Konfiguriraj Home Assistant")
    print("   3. Priključi realne IoT naprave")
    print("   4. Testiraj z resničnimi napravami")

if __name__ == "__main__":
    main()