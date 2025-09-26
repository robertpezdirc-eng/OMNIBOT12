#!/usr/bin/env python3
"""
Demo skripta za realne IoT scenarije
Demonstracija praktične uporabe IoT modula v različnih okoljih

Avtor: Omni AI Team
Verzija: 1.0.0
"""

import sys
import os
import time
from datetime import datetime

# Dodaj trenutni direktorij v Python path
sys.path.insert(0, os.getcwd())

try:
    from omni.core.engine import OmniCore
    from omni.modules.iot.iot import IoTModule
    print("✅ Uspešno uvoženi moduli")
except ImportError as e:
    print(f"❌ Napaka pri uvozu: {e}")
    sys.exit(1)

def demo_smart_home():
    """Demo pametnega doma"""
    print("\n" + "="*50)
    print("🏠 DEMO: PAMETNI DOM")
    print("="*50)
    
    omni = OmniCore(debug=False)
    iot_module = IoTModule()
    omni.register_module("iot", iot_module)
    
    scenarios = [
        {
            "name": "🌅 Dobro jutro rutina",
            "commands": [
                "Prižgi luči v spalnici",
                "Prižgi kavo v kuhinji", 
                "Vklopi radio za novice",
                "Nastavi temperaturo na 22°C"
            ]
        },
        {
            "name": "🏃 Odhod od doma",
            "commands": [
                "Ugasni vse luči",
                "Izklopi TV in radio",
                "Nastavi varčevalni način klimatske",
                "Vklopi varnostni sistem"
            ]
        },
        {
            "name": "🌙 Večerna rutina",
            "commands": [
                "Zatemnitev luči v dnevni sobi",
                "Prižgi TV za sproščanje",
                "Ugasni nepotrebne naprave",
                "Nastavi nočni način"
            ]
        }
    ]
    
    for scenario in scenarios:
        print(f"\n{scenario['name']}:")
        for command in scenario['commands']:
            print(f"  🎯 {command}")
            result = omni.run(command)
            if 'iot' in result and result['iot']:
                for res in result['iot']['results']:
                    print(f"     → {res}")
            time.sleep(0.5)
        print("  ✅ Scenarij zaključen")
        time.sleep(1)

def demo_smart_office():
    """Demo pametne pisarne"""
    print("\n" + "="*50)
    print("🏢 DEMO: PAMETNA PISARNA")
    print("="*50)
    
    omni = OmniCore(debug=False)
    iot_module = IoTModule()
    omni.register_module("iot", iot_module)
    
    scenarios = [
        {
            "name": "🌅 Jutranjo priprava pisarne",
            "commands": [
                "Prižgi vse računalnike v pisarni",
                "Vklopi klimatsko napravo",
                "Prižgi luči v vseh prostorih",
                "Vklopi tiskalnik in skener"
            ]
        },
        {
            "name": "📊 Priprava prezentacijske sobe",
            "commands": [
                "Prižgi projektor v konferenčni sobi",
                "Vklopi zvočni sistem",
                "Nastavi osvetlitev za prezentacijo",
                "Preveri delovanje mikrofonov"
            ]
        },
        {
            "name": "💡 Varčevanje energije",
            "commands": [
                "Ugasni luči v praznih prostorih",
                "Nastavi varčevalni način klimatske",
                "Izklopi neaktivne računalnike",
                "Preveri porabo energije"
            ]
        }
    ]
    
    for scenario in scenarios:
        print(f"\n{scenario['name']}:")
        for command in scenario['commands']:
            print(f"  🎯 {command}")
            result = omni.run(command)
            if 'iot' in result and result['iot']:
                for res in result['iot']['results']:
                    print(f"     → {res}")
            time.sleep(0.5)
        print("  ✅ Scenarij zaključen")
        time.sleep(1)

def demo_industrial_factory():
    """Demo industrijske tovarne"""
    print("\n" + "="*50)
    print("🏭 DEMO: INDUSTRIJSKA TOVARNA")
    print("="*50)
    
    omni = OmniCore(debug=False)
    iot_module = IoTModule()
    omni.register_module("iot", iot_module)
    
    # Dodaj industrijske naprave
    industrial_devices = [
        "Proizvodni stroj A1",
        "Proizvodni stroj A2", 
        "Transportni trak 1",
        "Transportni trak 2",
        "Varnostni sistem",
        "Ventilacijski sistem",
        "Kompresor 1",
        "Kompresor 2"
    ]
    
    for device in industrial_devices:
        iot_module.device_states[device] = {"status": "off", "last_action": None}
    
    scenarios = [
        {
            "name": "🚀 Zagon proizvodne linije",
            "commands": [
                "Prižgi varnostni sistem",
                "Vklopi ventilacijski sistem",
                "Zaženi kompresor 1 in 2",
                "Prižgi proizvodni stroj A1",
                "Vklopi transportni trak 1"
            ]
        },
        {
            "name": "⚡ Povečanje proizvodnje",
            "commands": [
                "Prižgi proizvodni stroj A2",
                "Vklopi transportni trak 2", 
                "Preveri stanje vseh strojev",
                "Optimiziraj hitrost proizvodnje"
            ]
        },
        {
            "name": "🛑 Varnostni izklop",
            "commands": [
                "Ustavi vse proizvodne stroje",
                "Izklopi transportne trakove",
                "Ohrani varnostni sistem aktiven",
                "Preveri stanje po izklopu"
            ]
        }
    ]
    
    for scenario in scenarios:
        print(f"\n{scenario['name']}:")
        for command in scenario['commands']:
            print(f"  🎯 {command}")
            result = omni.run(command)
            if 'iot' in result and result['iot']:
                for res in result['iot']['results']:
                    print(f"     → {res}")
            time.sleep(0.5)
        print("  ✅ Scenarij zaključen")
        time.sleep(1)

def demo_energy_management():
    """Demo upravljanja energije"""
    print("\n" + "="*50)
    print("⚡ DEMO: UPRAVLJANJE ENERGIJE")
    print("="*50)
    
    omni = OmniCore(debug=False)
    iot_module = IoTModule()
    omni.register_module("iot", iot_module)
    
    # Simulacija porabe energije
    energy_devices = {
        "Klimatska naprava": {"power": 2500, "status": "on"},
        "Pametna TV": {"power": 150, "status": "on"},
        "Računalnik v pisarni": {"power": 300, "status": "on"},
        "LED luči": {"power": 50, "status": "on"},
        "Pralni stroj": {"power": 2000, "status": "off"},
        "Pomivalni stroj": {"power": 1800, "status": "off"}
    }
    
    def calculate_total_power():
        total = sum(device["power"] for device in energy_devices.values() if device["status"] == "on")
        return total
    
    print(f"\n📊 Trenutna poraba energije: {calculate_total_power()}W")
    
    scenarios = [
        {
            "name": "💡 Optimizacija porabe",
            "actions": [
                ("Ugasni nepotrebne luči", "LED luči", "off"),
                ("Nastavi varčevalni način klimatske", "Klimatska naprava", "eco"),
                ("Izklopi TV v prazni sobi", "Pametna TV", "off"),
                ("Preveri novo porabo energije", None, None)
            ]
        },
        {
            "name": "🌙 Nočni način",
            "actions": [
                ("Ugasni vse razen osnovnih naprav", "Računalnik v pisarni", "off"),
                ("Minimalna osvetlitev", "LED luči", "dim"),
                ("Varčevalni način klimatske", "Klimatska naprava", "night"),
                ("Izračunaj prihranke", None, None)
            ]
        }
    ]
    
    for scenario in scenarios:
        print(f"\n{scenario['name']}:")
        initial_power = calculate_total_power()
        
        for action_desc, device, new_status in scenario['actions']:
            print(f"  🎯 {action_desc}")
            
            if device and device in energy_devices:
                if new_status == "off":
                    energy_devices[device]["status"] = "off"
                    result = omni.run(f"Ugasni {device}")
                elif new_status in ["eco", "night", "dim"]:
                    # Simulacija varčevalnih načinov
                    energy_devices[device]["power"] = int(energy_devices[device]["power"] * 0.5)
                    result = omni.run(f"Nastavi varčevalni način {device}")
                
                if 'iot' in result and result['iot']:
                    for res in result['iot']['results']:
                        print(f"     → {res}")
            else:
                current_power = calculate_total_power()
                savings = initial_power - current_power
                print(f"     → Trenutna poraba: {current_power}W")
                print(f"     → Prihranek: {savings}W ({savings/initial_power*100:.1f}%)")
            
            time.sleep(0.5)
        
        print("  ✅ Scenarij zaključen")
        time.sleep(1)

def demo_voice_commands():
    """Demo glasovnih ukazov"""
    print("\n" + "="*50)
    print("🎤 DEMO: GLASOVNI UKAZI")
    print("="*50)
    
    omni = OmniCore(debug=False)
    iot_module = IoTModule()
    omni.register_module("iot", iot_module)
    
    voice_commands = [
        "Alexa, prižgi luči v dnevni sobi",
        "OK Google, ugasni TV",
        "Siri, nastavi temperaturo na 23 stopinj",
        "Omni, pripravi dom za spanje",
        "Hey Omni, vklopi varčevalni način",
        "Omni, preveri stanje vseh naprav"
    ]
    
    print("🎤 Simulacija glasovnih ukazov:")
    
    for i, command in enumerate(voice_commands, 1):
        print(f"\n{i}. 🗣️  Uporabnik: '{command}'")
        
        # Odstrani glasovne aktivatorje
        clean_command = command
        for wake_word in ["Alexa,", "OK Google,", "Siri,", "Omni,", "Hey Omni,"]:
            clean_command = clean_command.replace(wake_word, "").strip()
        
        print(f"   🧠 Obdelava: '{clean_command}'")
        
        result = omni.run(clean_command)
        if 'iot' in result and result['iot']:
            print("   🤖 Omni odgovor:")
            for res in result['iot']['results']:
                print(f"      → {res}")
        else:
            print("   🤖 Omni: Ukaz ni prepoznan kot IoT ukaz")
        
        time.sleep(1)

def main():
    """Glavna demo funkcija"""
    print("🚀 OMNI IoT MODUL - REALNI SCENARIJI DEMO")
    print("=" * 60)
    print(f"📅 Čas demo: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    demos = [
        ("🏠 Pametni dom", demo_smart_home),
        ("🏢 Pametna pisarna", demo_smart_office), 
        ("🏭 Industrijska tovarna", demo_industrial_factory),
        ("⚡ Upravljanje energije", demo_energy_management),
        ("🎤 Glasovni ukazi", demo_voice_commands)
    ]
    
    print("\nIzberi demo scenarij:")
    for i, (name, _) in enumerate(demos, 1):
        print(f"  {i}. {name}")
    print(f"  {len(demos)+1}. Izvedi vse demo scenarije")
    print("  0. Izhod")
    
    try:
        choice = input("\nVnesi izbiro (0-6): ").strip()
        
        if choice == "0":
            print("👋 Nasvidenje!")
            return
        elif choice == str(len(demos)+1):
            print("\n🚀 Izvajam vse demo scenarije...")
            for name, demo_func in demos:
                print(f"\n▶️  Začenjam: {name}")
                demo_func()
                print(f"✅ Zaključen: {name}")
                time.sleep(2)
        elif choice.isdigit() and 1 <= int(choice) <= len(demos):
            demo_index = int(choice) - 1
            name, demo_func = demos[demo_index]
            print(f"\n▶️  Začenjam: {name}")
            demo_func()
            print(f"✅ Zaključen: {name}")
        else:
            print("❌ Neveljavna izbira!")
            return
        
        print("\n" + "="*60)
        print("🎉 DEMO ZAKLJUČEN")
        print("="*60)
        print("💡 Naslednji koraki:")
        print("   1. Konfiguriraj realne API ključe")
        print("   2. Nastavi MQTT broker")
        print("   3. Integriraj z Home Assistant")
        print("   4. Dodaj varnostne certifikate")
        print("   5. Ustvari mobilno aplikacijo")
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Demo prekinjen s strani uporabnika")
    except Exception as e:
        print(f"\n❌ Napaka med demo: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()