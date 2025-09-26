#!/usr/bin/env python3
"""
IoT Modul za Omni AI Platform
Nadzor naprav v realnem svetu - računalniki, TV, pametne naprave, industrijski stroji

Funkcionalnosti:
- Prižiganje/ugašanje naprav
- Ponovni zagon
- Preverjanje stanja
- Simulacija za testiranje
- Pripravljen za realne API integracije
"""

import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class IoTModule:
    """IoT modul za nadzor naprav"""
    
    def __init__(self):
        self.name = "iot"
        self.description = "IoT nadzor naprav v realnem svetu"
        self.version = "1.0.0"
        
        # Simulacija stanja naprav
        self.device_states = {
            "Pametna TV": {"status": "off", "last_action": None},
            "Računalnik v pisarni": {"status": "on", "last_action": None},
            "Stroj 1": {"status": "on", "last_action": None},
            "Stroj 2": {"status": "off", "last_action": None},
            "Pametna luč": {"status": "on", "last_action": None},
            "Klimatska naprava": {"status": "off", "last_action": None}
        }
        
        logger.info("🏠 IoT modul inicializiran")
    
    def turn_on(self, device_name: str) -> str:
        """
        Prižge napravo
        
        Args:
            device_name: Ime naprave
            
        Returns:
            Sporočilo o uspešnosti
        """
        try:
            logger.info(f"🔌 Prižigam napravo: {device_name}")
            
            # Simulacija odziva naprave
            time.sleep(0.5)
            
            # Posodobi stanje
            if device_name not in self.device_states:
                self.device_states[device_name] = {"status": "unknown", "last_action": None}
            
            self.device_states[device_name]["status"] = "on"
            self.device_states[device_name]["last_action"] = f"turned_on_{datetime.now().strftime('%H:%M:%S')}"
            
            result = f"✅ Naprava '{device_name}' prižgana"
            logger.info(result)
            return result
            
        except Exception as e:
            error_msg = f"❌ Napaka pri prižiganju {device_name}: {str(e)}"
            logger.error(error_msg)
            return error_msg
    
    def turn_off(self, device_name: str) -> str:
        """
        Ugaši napravo
        
        Args:
            device_name: Ime naprave
            
        Returns:
            Sporočilo o uspešnosti
        """
        try:
            logger.info(f"🔌 Ugašam napravo: {device_name}")
            
            # Simulacija odziva naprave
            time.sleep(0.5)
            
            # Posodobi stanje
            if device_name not in self.device_states:
                self.device_states[device_name] = {"status": "unknown", "last_action": None}
            
            self.device_states[device_name]["status"] = "off"
            self.device_states[device_name]["last_action"] = f"turned_off_{datetime.now().strftime('%H:%M:%S')}"
            
            result = f"✅ Naprava '{device_name}' ugašena"
            logger.info(result)
            return result
            
        except Exception as e:
            error_msg = f"❌ Napaka pri ugašanju {device_name}: {str(e)}"
            logger.error(error_msg)
            return error_msg
    
    def restart(self, device_name: str) -> str:
        """
        Ponovni zagon naprave
        
        Args:
            device_name: Ime naprave
            
        Returns:
            Sporočilo o uspešnosti
        """
        try:
            logger.info(f"🔄 Ponovno zaganjam napravo: {device_name}")
            
            # Simulacija ponovnega zagona
            time.sleep(1.0)
            
            # Posodobi stanje
            if device_name not in self.device_states:
                self.device_states[device_name] = {"status": "unknown", "last_action": None}
            
            self.device_states[device_name]["status"] = "on"
            self.device_states[device_name]["last_action"] = f"restarted_{datetime.now().strftime('%H:%M:%S')}"
            
            result = f"🔄 Naprava '{device_name}' ponovno zagnana"
            logger.info(result)
            return result
            
        except Exception as e:
            error_msg = f"❌ Napaka pri ponovnem zagonu {device_name}: {str(e)}"
            logger.error(error_msg)
            return error_msg
    
    def status(self, device_name: str) -> str:
        """
        Preveri stanje naprave
        
        Args:
            device_name: Ime naprave
            
        Returns:
            Stanje naprave
        """
        try:
            logger.info(f"📊 Preverjam stanje naprave: {device_name}")
            
            if device_name in self.device_states:
                device_info = self.device_states[device_name]
                status_icon = "✅" if device_info["status"] == "on" else "⭕"
                
                result = f"{status_icon} Naprava '{device_name}' je {device_info['status']}"
                if device_info["last_action"]:
                    result += f" (zadnja akcija: {device_info['last_action']})"
            else:
                result = f"❓ Naprava '{device_name}' ni registrirana"
            
            logger.info(result)
            return result
            
        except Exception as e:
            error_msg = f"❌ Napaka pri preverjanju stanja {device_name}: {str(e)}"
            logger.error(error_msg)
            return error_msg
    
    def list_devices(self) -> List[Dict[str, Any]]:
        """
        Seznam vseh registriranih naprav
        
        Returns:
            Seznam naprav z njihovimi stanji
        """
        devices = []
        for device_name, device_info in self.device_states.items():
            devices.append({
                "name": device_name,
                "status": device_info["status"],
                "last_action": device_info["last_action"]
            })
        
        logger.info(f"📋 Seznam naprav: {len(devices)} naprav")
        return devices
    
    def bulk_control(self, action: str, device_names: List[str]) -> Dict[str, str]:
        """
        Množični nadzor naprav
        
        Args:
            action: Akcija (turn_on, turn_off, restart)
            device_names: Seznam imen naprav
            
        Returns:
            Rezultati za vsako napravo
        """
        results = {}
        
        for device_name in device_names:
            if action == "turn_on":
                results[device_name] = self.turn_on(device_name)
            elif action == "turn_off":
                results[device_name] = self.turn_off(device_name)
            elif action == "restart":
                results[device_name] = self.restart(device_name)
            else:
                results[device_name] = f"❌ Neznana akcija: {action}"
        
        return results
    
    def run(self, input_text: str) -> Dict[str, Any]:
        """
        Glavna run metoda za kompatibilnost z OmniCore
        
        Args:
            input_text: Vhodni tekst z ukazi
            
        Returns:
            Rezultat izvajanja
        """
        try:
            logger.info(f"🏠 IoT modul obdeluje: {input_text}")
            
            # Prepoznavanje ukazov v tekstu
            input_lower = input_text.lower()
            results = []
            
            # Prepoznaj naprave v tekstu
            mentioned_devices = []
            for device_name in self.device_states.keys():
                if device_name.lower() in input_lower:
                    mentioned_devices.append(device_name)
            
            # Če ni omenjenih naprav, uporabi splošne
            if not mentioned_devices:
                mentioned_devices = ["Pametna TV", "Računalnik v pisarni"]
            
            # Prepoznaj akcije
            if any(word in input_lower for word in ["prižgi", "vklopi", "turn on", "start"]):
                for device in mentioned_devices:
                    results.append(self.turn_on(device))
                    
            elif any(word in input_lower for word in ["ugasni", "izklopi", "turn off", "stop"]):
                for device in mentioned_devices:
                    results.append(self.turn_off(device))
                    
            elif any(word in input_lower for word in ["restart", "reboot", "ponovno", "zagon"]):
                for device in mentioned_devices:
                    results.append(self.restart(device))
                    
            elif any(word in input_lower for word in ["status", "stanje", "preveri", "check"]):
                for device in mentioned_devices:
                    results.append(self.status(device))
                    
            elif any(word in input_lower for word in ["seznam", "list", "naprave", "devices"]):
                devices = self.list_devices()
                results.append(f"📋 Registrirane naprave: {len(devices)}")
                for device in devices:
                    results.append(f"  {device['name']}: {device['status']}")
            else:
                # Privzeta akcija - prikaži stanje
                results.append("🏠 IoT modul pripravljen za nadzor naprav")
                results.append(f"📊 Registrirane naprave: {len(self.device_states)}")
            
            return {
                "module": "iot",
                "action": "device_control",
                "results": results,
                "devices_count": len(self.device_states),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            error_msg = f"❌ IoT modul napaka: {str(e)}"
            logger.error(error_msg)
            return {
                "module": "iot",
                "action": "error",
                "error": error_msg,
                "timestamp": datetime.now().isoformat()
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Status IoT modula"""
        return {
            "module": self.name,
            "version": self.version,
            "description": self.description,
            "devices_registered": len(self.device_states),
            "devices_online": len([d for d in self.device_states.values() if d["status"] == "on"]),
            "ready": True
        }

# Funkcije za kompatibilnost z originalnim predlogom
def __name__():
    """Vrni ime modula"""
    return "iot"

def turn_on(device_name: str) -> str:
    """Prižge napravo (placeholder)"""
    time.sleep(0.5)
    return f"Naprava '{device_name}' prižgana ✅"

def turn_off(device_name: str) -> str:
    """Ugaši napravo (placeholder)"""
    time.sleep(0.5)
    return f"Naprava '{device_name}' ugašena ✅"

def restart(device_name: str) -> str:
    """Ponovni zagon naprave"""
    time.sleep(1)
    return f"Naprava '{device_name}' ponovno zagnana 🔄"

def status(device_name: str) -> str:
    """Preveri stanje naprave"""
    return f"Naprava '{device_name}' trenutno deluje normalno ✅"

# Glavna instanca modula
iot_module = IoTModule()

# Test funkcionalnost
if __name__ == "__main__":
    print("🏠 IoT Modul Test")
    print("=" * 40)
    
    # Test osnovnih funkcij
    print(iot_module.turn_on("Pametna TV"))
    print(iot_module.turn_off("Računalnik v pisarni"))
    print(iot_module.restart("Stroj 1"))
    print(iot_module.status("Stroj 1"))
    
    # Test seznama naprav
    print("\n📋 Seznam naprav:")
    devices = iot_module.list_devices()
    for device in devices:
        print(f"  {device['name']}: {device['status']}")
    
    # Test run metode
    print("\n🚀 Test run metode:")
    result = iot_module.run("Prižgi pametno TV in preveri stanje")
    print(f"Rezultat: {result}")
    
    print("\n✅ IoT modul test zaključen!")