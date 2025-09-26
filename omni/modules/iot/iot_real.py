#!/usr/bin/env python3
"""
🏠 Omni IoT Real Module - Realna integracija z IoT napravami
Podpira MQTT, REST API in Home Assistant protokole za upravljanje resničnih naprav.

Avtor: Omni AI Platform
Verzija: 1.0.0
"""

import paho.mqtt.client as mqtt
import requests
import os
import json
import logging
import time
from typing import Dict, Any, Optional, List
import threading
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.mqtt_config import get_mqtt_config, create_optimized_client

# Nastavi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def __name__():
    return "iot_real"

class IoTRealModule:
    """
    🏠 Realni IoT modul za upravljanje resničnih naprav
    
    Podpira:
    - MQTT protokol (Mosquitto, Home Assistant)
    - REST API klici
    - Home Assistant integracija
    - Industrijske naprave z API
    """
    
    def __init__(self):
        """Inicializiraj realni IoT modul"""
        logger.info("🏠 Inicializacija realnega IoT modula...")
        
        # MQTT konfiguracija
        self.mqtt_broker = os.getenv("MQTT_BROKER", "localhost")
        self.mqtt_port = int(os.getenv("MQTT_PORT", 1883))
        self.mqtt_username = os.getenv("MQTT_USERNAME", None)
        self.mqtt_password = os.getenv("MQTT_PASSWORD", None)
        self.mqtt_client_id = "OmniIoT_Real"
        
        # Home Assistant konfiguracija
        self.ha_url = os.getenv("HOME_ASSISTANT_URL", "http://localhost:8123")
        self.ha_token = os.getenv("HOME_ASSISTANT_TOKEN", None)
        
        # MQTT client
        self.mqtt_client = None
        self.mqtt_connected = False
        
        # Sledenje stanja naprav
        self.device_states = {}
        self.device_responses = {}
        
        # Inicializiraj MQTT
        self._init_mqtt()
        
        logger.info("✅ Realni IoT modul inicializiran")
    
    def _init_mqtt(self):
        """Inicializiraj MQTT povezavo"""
        try:
            # Uporabi optimizirano MQTT konfiguracijo
            mqtt_config = get_mqtt_config()
            
            # Ustvari optimiziran klient
            self.mqtt_client = create_optimized_client(self.mqtt_client_id)
            
            # Nastavi callback funkcije
            self.mqtt_client.on_connect = self._on_mqtt_connect
            self.mqtt_client.on_disconnect = self._on_mqtt_disconnect
            self.mqtt_client.on_message = self._on_mqtt_message
            
            # Poskusi povezavo
            connection_config = mqtt_config.get_connection_config()
            logger.info(f"🔗 Povezujem z MQTT broker: {connection_config['host']}:{connection_config['port']}")
            self.mqtt_client.connect_async(**connection_config)
            self.mqtt_client.loop_start()
            
        except Exception as e:
            logger.warning(f"⚠️ MQTT povezava ni uspešna: {e}")
            logger.info("📝 Nastavi MQTT_BROKER, MQTT_PORT, MQTT_USERNAME, MQTT_PASSWORD v .env datoteki")
    
    def _on_mqtt_connect(self, client, userdata, flags, rc):
        """Callback za uspešno MQTT povezavo"""
        if rc == 0:
            self.mqtt_connected = True
            logger.info("✅ MQTT povezava uspešna")
            # Naroči se na status topike
            client.subscribe("omni/+/status")
            client.subscribe("homeassistant/+/+/state")
        else:
            logger.error(f"❌ MQTT povezava neuspešna, koda: {rc}")
    
    def _on_mqtt_disconnect(self, client, userdata, rc):
        """Callback za prekinitev MQTT povezave"""
        self.mqtt_connected = False
        logger.warning("⚠️ MQTT povezava prekinjena")
    
    def _on_mqtt_message(self, client, userdata, msg):
        """Callback za prejete MQTT sporočila"""
        topic = msg.topic
        payload = msg.payload.decode('utf-8')
        
        # Shrani stanje naprave
        if "/status" in topic or "/state" in topic:
            device_name = topic.split('/')[1]
            self.device_responses[device_name] = {
                "topic": topic,
                "payload": payload,
                "timestamp": time.time()
            }
            logger.info(f"📊 Prejeto stanje naprave {device_name}: {payload}")
    
    # ========================
    # MQTT funkcije
    # ========================
    
    def turn_on(self, device_topic: str) -> Dict[str, Any]:
        """
        🔌 Prižgi napravo preko MQTT
        
        Args:
            device_topic: MQTT topic naprave (npr. "home/livingroom/light")
        
        Returns:
            Dict z rezultatom operacije
        """
        if not self.mqtt_connected:
            return {
                "success": False,
                "message": "❌ MQTT ni povezan",
                "device": device_topic,
                "action": "turn_on"
            }
        
        try:
            # Pošlji MQTT sporočilo
            result = self.mqtt_client.publish(device_topic, payload="ON", qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                # Posodobi lokalno stanje
                self.device_states[device_topic] = {
                    "state": "on",
                    "last_action": f"turned_on_{time.strftime('%H:%M:%S')}",
                    "timestamp": time.time()
                }
                
                logger.info(f"🔌 Prižigam napravo: {device_topic}")
                return {
                    "success": True,
                    "message": f"✅ Naprava '{device_topic}' prižgana",
                    "device": device_topic,
                    "action": "turn_on",
                    "mqtt_result": result.rc
                }
            else:
                return {
                    "success": False,
                    "message": f"❌ MQTT napaka: {result.rc}",
                    "device": device_topic,
                    "action": "turn_on"
                }
                
        except Exception as e:
            logger.error(f"❌ Napaka pri prižiganju {device_topic}: {e}")
            return {
                "success": False,
                "message": f"❌ Napaka: {str(e)}",
                "device": device_topic,
                "action": "turn_on"
            }
    
    def turn_off(self, device_topic: str) -> Dict[str, Any]:
        """
        🔌 Ugaši napravo preko MQTT
        
        Args:
            device_topic: MQTT topic naprave
        
        Returns:
            Dict z rezultatom operacije
        """
        if not self.mqtt_connected:
            return {
                "success": False,
                "message": "❌ MQTT ni povezan",
                "device": device_topic,
                "action": "turn_off"
            }
        
        try:
            result = self.mqtt_client.publish(device_topic, payload="OFF", qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                self.device_states[device_topic] = {
                    "state": "off",
                    "last_action": f"turned_off_{time.strftime('%H:%M:%S')}",
                    "timestamp": time.time()
                }
                
                logger.info(f"🔌 Ugašam napravo: {device_topic}")
                return {
                    "success": True,
                    "message": f"✅ Naprava '{device_topic}' ugašena",
                    "device": device_topic,
                    "action": "turn_off",
                    "mqtt_result": result.rc
                }
            else:
                return {
                    "success": False,
                    "message": f"❌ MQTT napaka: {result.rc}",
                    "device": device_topic,
                    "action": "turn_off"
                }
                
        except Exception as e:
            logger.error(f"❌ Napaka pri ugašanju {device_topic}: {e}")
            return {
                "success": False,
                "message": f"❌ Napaka: {str(e)}",
                "device": device_topic,
                "action": "turn_off"
            }
    
    def restart(self, device_topic: str) -> Dict[str, Any]:
        """
        🔄 Ponovno zaženi napravo preko MQTT
        
        Args:
            device_topic: MQTT topic naprave
        
        Returns:
            Dict z rezultatom operacije
        """
        if not self.mqtt_connected:
            return {
                "success": False,
                "message": "❌ MQTT ni povezan",
                "device": device_topic,
                "action": "restart"
            }
        
        try:
            result = self.mqtt_client.publish(device_topic, payload="RESTART", qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                self.device_states[device_topic] = {
                    "state": "restarting",
                    "last_action": f"restarted_{time.strftime('%H:%M:%S')}",
                    "timestamp": time.time()
                }
                
                logger.info(f"🔄 Ponovno zaganjam napravo: {device_topic}")
                return {
                    "success": True,
                    "message": f"🔄 Naprava '{device_topic}' ponovno zagnana",
                    "device": device_topic,
                    "action": "restart",
                    "mqtt_result": result.rc
                }
            else:
                return {
                    "success": False,
                    "message": f"❌ MQTT napaka: {result.rc}",
                    "device": device_topic,
                    "action": "restart"
                }
                
        except Exception as e:
            logger.error(f"❌ Napaka pri ponovnem zagonu {device_topic}: {e}")
            return {
                "success": False,
                "message": f"❌ Napaka: {str(e)}",
                "device": device_topic,
                "action": "restart"
            }
    
    # ========================
    # REST API funkcije
    # ========================
    
    def status(self, device_topic: str, status_url: Optional[str] = None) -> Dict[str, Any]:
        """
        📊 Preveri stanje naprave preko REST API ali MQTT
        
        Args:
            device_topic: MQTT topic naprave
            status_url: Opcijski REST API URL za stanje
        
        Returns:
            Dict s stanjem naprave
        """
        logger.info(f"📊 Preverjam stanje naprave: {device_topic}")
        
        # Če je podan REST API URL, uporabi HTTP
        if status_url:
            try:
                response = requests.get(status_url, timeout=5)
                if response.status_code == 200:
                    return {
                        "success": True,
                        "device": device_topic,
                        "status_url": status_url,
                        "data": response.json(),
                        "method": "REST_API",
                        "timestamp": time.time()
                    }
                else:
                    return {
                        "success": False,
                        "device": device_topic,
                        "message": f"❌ HTTP napaka: {response.status_code}",
                        "method": "REST_API"
                    }
            except Exception as e:
                logger.error(f"❌ REST API napaka za {device_topic}: {e}")
                return {
                    "success": False,
                    "device": device_topic,
                    "message": f"❌ REST API napaka: {str(e)}",
                    "method": "REST_API"
                }
        
        # Uporabi MQTT stanje
        if device_topic in self.device_states:
            state = self.device_states[device_topic]
            return {
                "success": True,
                "device": device_topic,
                "state": state["state"],
                "last_action": state["last_action"],
                "method": "MQTT_LOCAL",
                "timestamp": state["timestamp"]
            }
        
        # Preveri prejeta MQTT sporočila
        if device_topic in self.device_responses:
            response = self.device_responses[device_topic]
            return {
                "success": True,
                "device": device_topic,
                "mqtt_topic": response["topic"],
                "mqtt_payload": response["payload"],
                "method": "MQTT_RECEIVED",
                "timestamp": response["timestamp"]
            }
        
        return {
            "success": False,
            "device": device_topic,
            "message": "❌ Stanje naprave ni na voljo",
            "method": "UNKNOWN"
        }
    
    # ========================
    # Home Assistant integracija
    # ========================
    
    def home_assistant_call(self, entity_id: str, service: str, service_data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        🏠 Kliči Home Assistant servis
        
        Args:
            entity_id: ID entitete (npr. "light.living_room")
            service: Servis (npr. "turn_on", "turn_off")
            service_data: Dodatni podatki za servis
        
        Returns:
            Dict z rezultatom klica
        """
        if not self.ha_token:
            return {
                "success": False,
                "message": "❌ HOME_ASSISTANT_TOKEN ni nastavljen",
                "entity_id": entity_id,
                "service": service
            }
        
        try:
            domain = entity_id.split('.')[0]
            url = f"{self.ha_url}/api/services/{domain}/{service}"
            
            headers = {
                "Authorization": f"Bearer {self.ha_token}",
                "Content-Type": "application/json"
            }
            
            data = {"entity_id": entity_id}
            if service_data:
                data.update(service_data)
            
            response = requests.post(url, headers=headers, json=data, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"🏠 Home Assistant: {service} za {entity_id}")
                return {
                    "success": True,
                    "entity_id": entity_id,
                    "service": service,
                    "message": f"✅ {service} uspešno izvršen",
                    "response": response.json()
                }
            else:
                return {
                    "success": False,
                    "entity_id": entity_id,
                    "service": service,
                    "message": f"❌ Home Assistant napaka: {response.status_code}",
                    "response_text": response.text
                }
                
        except Exception as e:
            logger.error(f"❌ Home Assistant napaka: {e}")
            return {
                "success": False,
                "entity_id": entity_id,
                "service": service,
                "message": f"❌ Napaka: {str(e)}"
            }
    
    # ========================
    # Napredne funkcije
    # ========================
    
    def list_devices(self) -> Dict[str, Any]:
        """
        📋 Seznam vseh registriranih naprav
        
        Returns:
            Dict s seznamom naprav
        """
        return {
            "success": True,
            "mqtt_connected": self.mqtt_connected,
            "mqtt_broker": f"{self.mqtt_broker}:{self.mqtt_port}",
            "home_assistant_url": self.ha_url,
            "home_assistant_configured": bool(self.ha_token),
            "tracked_devices": len(self.device_states),
            "device_states": self.device_states,
            "recent_responses": len(self.device_responses),
            "timestamp": time.time()
        }
    
    def bulk_control(self, devices: List[str], action: str) -> Dict[str, Any]:
        """
        🔄 Množično upravljanje naprav
        
        Args:
            devices: Seznam MQTT topikov naprav
            action: Akcija ("turn_on", "turn_off", "restart")
        
        Returns:
            Dict z rezultati za vse naprave
        """
        results = {}
        
        for device in devices:
            if action == "turn_on":
                results[device] = self.turn_on(device)
            elif action == "turn_off":
                results[device] = self.turn_off(device)
            elif action == "restart":
                results[device] = self.restart(device)
            else:
                results[device] = {
                    "success": False,
                    "message": f"❌ Neznana akcija: {action}",
                    "device": device
                }
        
        successful = sum(1 for r in results.values() if r.get("success", False))
        
        return {
            "success": True,
            "action": action,
            "total_devices": len(devices),
            "successful": successful,
            "failed": len(devices) - successful,
            "results": results,
            "timestamp": time.time()
        }
    
    def send_custom_mqtt(self, topic: str, payload: str, qos: int = 1) -> Dict[str, Any]:
        """
        📡 Pošlji poljubno MQTT sporočilo
        
        Args:
            topic: MQTT topic
            payload: Vsebina sporočila
            qos: Quality of Service (0, 1, 2)
        
        Returns:
            Dict z rezultatom
        """
        if not self.mqtt_connected:
            return {
                "success": False,
                "message": "❌ MQTT ni povezan",
                "topic": topic
            }
        
        try:
            result = self.mqtt_client.publish(topic, payload=payload, qos=qos)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"📡 MQTT sporočilo poslano: {topic} -> {payload}")
                return {
                    "success": True,
                    "topic": topic,
                    "payload": payload,
                    "qos": qos,
                    "message": "✅ MQTT sporočilo poslano",
                    "mqtt_result": result.rc
                }
            else:
                return {
                    "success": False,
                    "topic": topic,
                    "message": f"❌ MQTT napaka: {result.rc}"
                }
                
        except Exception as e:
            logger.error(f"❌ Napaka pri pošiljanju MQTT: {e}")
            return {
                "success": False,
                "topic": topic,
                "message": f"❌ Napaka: {str(e)}"
            }
    
    # ========================
    # OmniCore kompatibilnost
    # ========================
    
    def run(self, query: str = "", context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        🚀 Glavna funkcija za OmniCore integracijo
        
        Args:
            query: Uporabniška zahteva
            context: Kontekst izvršitve
        
        Returns:
            Dict z rezultatom
        """
        if context is None:
            context = {}
        
        return {
            "module": "iot_real",
            "version": "1.0.0",
            "query": query,
            "mqtt_status": "connected" if self.mqtt_connected else "disconnected",
            "mqtt_broker": f"{self.mqtt_broker}:{self.mqtt_port}",
            "home_assistant": "configured" if self.ha_token else "not_configured",
            "capabilities": [
                "MQTT device control",
                "REST API integration", 
                "Home Assistant integration",
                "Bulk device control",
                "Real-time status monitoring",
                "Custom MQTT messaging"
            ],
            "available_functions": [
                "turn_on(device_topic)",
                "turn_off(device_topic)", 
                "restart(device_topic)",
                "status(device_topic, status_url=None)",
                "home_assistant_call(entity_id, service, service_data=None)",
                "bulk_control(devices, action)",
                "send_custom_mqtt(topic, payload, qos=1)",
                "list_devices()"
            ],
            "tracked_devices": len(self.device_states),
            "timestamp": time.time()
        }
    
    def __del__(self):
        """Počisti MQTT povezavo ob uničenju objekta"""
        if hasattr(self, 'mqtt_client') and self.mqtt_client:
            try:
                self.mqtt_client.loop_stop()
                self.mqtt_client.disconnect()
            except:
                pass

# Ustvari instanco modula za direktno uporabo
iot_real_module = IoTRealModule()

# Test funkcija
if __name__ == "__main__":
    print("🏠 Test realnega IoT modula")
    
    # Test osnovnih funkcij
    print("\n=== Test osnovnih funkcij ===")
    print(iot_real_module.turn_on("home/livingroom/light"))
    print(iot_real_module.turn_off("office/pc1"))
    print(iot_real_module.restart("factory/machine1"))
    print(iot_real_module.status("home/livingroom/light"))
    
    # Test Home Assistant
    print("\n=== Test Home Assistant ===")
    print(iot_real_module.home_assistant_call("light.living_room", "turn_on"))
    
    # Test množičnega upravljanja
    print("\n=== Test množičnega upravljanja ===")
    devices = ["home/bedroom/light", "home/kitchen/light", "office/pc2"]
    print(iot_real_module.bulk_control(devices, "turn_on"))
    
    # Test seznama naprav
    print("\n=== Seznam naprav ===")
    print(iot_real_module.list_devices())
    
    # Test run() funkcije
    print("\n=== Test run() funkcije ===")
    print(iot_real_module.run("Upravljaj IoT naprave"))
    
    print("\n✅ Vsi testi končani!")