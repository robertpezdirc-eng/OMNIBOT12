# omni/modules/iot/iot_groups.py
"""
Sistem za upravljanje skupin IoT naprav
Omogoča organizacijo naprav v logične skupine za lažje upravljanje
"""

import json
import os
import threading
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging
from dataclasses import dataclass, asdict
from enum import Enum

# Konfiguracija
GROUPS_CONFIG_FILE = "data/device_groups_config.json"
GROUPS_LOG_FILE = "data/logs/device_groups_logs.json"

class GroupType(Enum):
    ROOM = "room"
    FUNCTION = "function"
    BUILDING = "building"
    CUSTOM = "custom"

class DeviceType(Enum):
    LIGHT = "light"
    SWITCH = "switch"
    SENSOR = "sensor"
    CAMERA = "camera"
    HVAC = "hvac"
    SECURITY = "security"
    APPLIANCE = "appliance"
    INDUSTRIAL = "industrial"

@dataclass
class Device:
    id: str
    name: str
    topic: str
    device_type: DeviceType
    location: str = ""
    description: str = ""
    status_url: str = None
    capabilities: List[str] = None
    metadata: Dict[str, Any] = None
    last_seen: str = None
    online: bool = True

@dataclass
class DeviceGroup:
    id: str
    name: str
    description: str
    group_type: GroupType
    devices: List[str]  # Device IDs
    parent_group: str = None
    child_groups: List[str] = None
    automation_enabled: bool = True
    created_at: str = None
    updated_at: str = None
    metadata: Dict[str, Any] = None

class IoTGroupManager:
    def __init__(self, iot_secure_module=None):
        self.iot_secure = iot_secure_module
        self.devices: Dict[str, Device] = {}
        self.groups: Dict[str, DeviceGroup] = {}
        self.group_hierarchy: Dict[str, List[str]] = {}
        
        # Nastavi logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Naloži konfiguracijo
        self.load_configuration()

    def load_configuration(self):
        """Naloži konfiguracijo skupin in naprav"""
        try:
            if os.path.exists(GROUPS_CONFIG_FILE):
                with open(GROUPS_CONFIG_FILE, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    
                # Naloži naprave
                for device_data in config.get('devices', []):
                    device = Device(**device_data)
                    self.devices[device.id] = device
                    
                # Naloži skupine
                for group_data in config.get('groups', []):
                    group = DeviceGroup(**group_data)
                    self.groups[group.id] = group
                    
                # Izgradi hierarhijo
                self._build_hierarchy()
                    
                self.logger.info(f"Naloženih {len(self.devices)} naprav in {len(self.groups)} skupin")
        except Exception as e:
            self.logger.error(f"Napaka pri nalaganju konfiguracije: {e}")

    def save_configuration(self):
        """Shrani konfiguracijo skupin in naprav"""
        try:
            config = {
                'devices': [asdict(device) for device in self.devices.values()],
                'groups': [asdict(group) for group in self.groups.values()]
            }
            
            os.makedirs(os.path.dirname(GROUPS_CONFIG_FILE), exist_ok=True)
            with open(GROUPS_CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
                
            self.logger.info("Konfiguracija skupin shranjena")
        except Exception as e:
            self.logger.error(f"Napaka pri shranjevanju konfiguracije: {e}")

    def log_group_event(self, event_type: str, details: Dict[str, Any]):
        """Logiraj dogodek skupine"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "event_type": event_type,
                "details": details
            }
            
            os.makedirs(os.path.dirname(GROUPS_LOG_FILE), exist_ok=True)
            with open(GROUPS_LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        except Exception as e:
            self.logger.error(f"Napaka pri logiranju: {e}")

    def _build_hierarchy(self):
        """Izgradi hierarhijo skupin"""
        self.group_hierarchy = {}
        
        for group in self.groups.values():
            if group.parent_group:
                if group.parent_group not in self.group_hierarchy:
                    self.group_hierarchy[group.parent_group] = []
                self.group_hierarchy[group.parent_group].append(group.id)

    # ==================== UPRAVLJANJE NAPRAV ====================
    
    def add_device(self, device: Device) -> bool:
        """Dodaj novo napravo"""
        try:
            if not device.capabilities:
                device.capabilities = self._detect_device_capabilities(device.device_type)
                
            if not device.metadata:
                device.metadata = {}
                
            device.last_seen = datetime.now().isoformat()
            
            self.devices[device.id] = device
            self.save_configuration()
            
            self.log_group_event("device_added", {
                "device_id": device.id,
                "name": device.name,
                "type": device.device_type.value,
                "location": device.location
            })
            
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri dodajanju naprave: {e}")
            return False

    def remove_device(self, device_id: str) -> bool:
        """Odstrani napravo"""
        try:
            if device_id not in self.devices:
                return False
                
            device = self.devices[device_id]
            
            # Odstrani iz vseh skupin
            for group in self.groups.values():
                if device_id in group.devices:
                    group.devices.remove(device_id)
                    group.updated_at = datetime.now().isoformat()
            
            del self.devices[device_id]
            self.save_configuration()
            
            self.log_group_event("device_removed", {
                "device_id": device_id,
                "name": device.name
            })
            
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri odstranjevanju naprave: {e}")
            return False

    def update_device_status(self, device_id: str, online: bool, metadata: Dict[str, Any] = None):
        """Posodobi status naprave"""
        try:
            if device_id in self.devices:
                device = self.devices[device_id]
                device.online = online
                device.last_seen = datetime.now().isoformat()
                
                if metadata:
                    if not device.metadata:
                        device.metadata = {}
                    device.metadata.update(metadata)
                
                self.save_configuration()
                
                self.log_group_event("device_status_updated", {
                    "device_id": device_id,
                    "online": online,
                    "metadata": metadata
                })
        except Exception as e:
            self.logger.error(f"Napaka pri posodabljanju statusa naprave: {e}")

    def _detect_device_capabilities(self, device_type: DeviceType) -> List[str]:
        """Zazna zmožnosti naprave glede na tip"""
        capabilities_map = {
            DeviceType.LIGHT: ["on", "off", "dimming", "color"],
            DeviceType.SWITCH: ["on", "off"],
            DeviceType.SENSOR: ["read_value", "get_status"],
            DeviceType.CAMERA: ["capture", "stream", "record"],
            DeviceType.HVAC: ["temperature", "fan_speed", "mode"],
            DeviceType.SECURITY: ["arm", "disarm", "status"],
            DeviceType.APPLIANCE: ["on", "off", "status"],
            DeviceType.INDUSTRIAL: ["start", "stop", "restart", "status", "emergency_stop"]
        }
        
        return capabilities_map.get(device_type, ["on", "off", "status"])

    # ==================== UPRAVLJANJE SKUPIN ====================
    
    def create_group(self, group: DeviceGroup) -> bool:
        """Ustvari novo skupino naprav"""
        try:
            if not group.created_at:
                group.created_at = datetime.now().isoformat()
                
            if not group.child_groups:
                group.child_groups = []
                
            if not group.metadata:
                group.metadata = {}
            
            group.updated_at = datetime.now().isoformat()
            
            self.groups[group.id] = group
            self._build_hierarchy()
            self.save_configuration()
            
            self.log_group_event("group_created", {
                "group_id": group.id,
                "name": group.name,
                "type": group.group_type.value,
                "device_count": len(group.devices)
            })
            
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri ustvarjanju skupine: {e}")
            return False

    def delete_group(self, group_id: str) -> bool:
        """Izbriši skupino naprav"""
        try:
            if group_id not in self.groups:
                return False
                
            group = self.groups[group_id]
            
            # Odstrani iz hierarhije
            if group.parent_group and group.parent_group in self.group_hierarchy:
                if group_id in self.group_hierarchy[group.parent_group]:
                    self.group_hierarchy[group.parent_group].remove(group_id)
            
            # Premakni podskupine na višjo raven
            if group_id in self.group_hierarchy:
                for child_group_id in self.group_hierarchy[group_id]:
                    if child_group_id in self.groups:
                        self.groups[child_group_id].parent_group = group.parent_group
                del self.group_hierarchy[group_id]
            
            del self.groups[group_id]
            self._build_hierarchy()
            self.save_configuration()
            
            self.log_group_event("group_deleted", {
                "group_id": group_id,
                "name": group.name
            })
            
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri brisanju skupine: {e}")
            return False

    def add_device_to_group(self, device_id: str, group_id: str) -> bool:
        """Dodaj napravo v skupino"""
        try:
            if device_id not in self.devices or group_id not in self.groups:
                return False
                
            group = self.groups[group_id]
            if device_id not in group.devices:
                group.devices.append(device_id)
                group.updated_at = datetime.now().isoformat()
                self.save_configuration()
                
                self.log_group_event("device_added_to_group", {
                    "device_id": device_id,
                    "group_id": group_id,
                    "device_name": self.devices[device_id].name,
                    "group_name": group.name
                })
                
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri dodajanju naprave v skupino: {e}")
            return False

    def remove_device_from_group(self, device_id: str, group_id: str) -> bool:
        """Odstrani napravo iz skupine"""
        try:
            if group_id not in self.groups:
                return False
                
            group = self.groups[group_id]
            if device_id in group.devices:
                group.devices.remove(device_id)
                group.updated_at = datetime.now().isoformat()
                self.save_configuration()
                
                self.log_group_event("device_removed_from_group", {
                    "device_id": device_id,
                    "group_id": group_id,
                    "group_name": group.name
                })
                
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri odstranjevanju naprave iz skupine: {e}")
            return False

    # ==================== UPRAVLJANJE SKUPIN ====================
    
    def control_group(self, group_id: str, action: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Upravljaj skupino naprav"""
        try:
            if group_id not in self.groups:
                return {"error": f"Skupina {group_id} ne obstaja"}
                
            group = self.groups[group_id]
            results = []
            
            # Upravljaj vse naprave v skupini
            for device_id in group.devices:
                if device_id in self.devices:
                    device = self.devices[device_id]
                    result = self._control_device(device, action, parameters)
                    results.append({
                        "device_id": device_id,
                        "device_name": device.name,
                        "result": result
                    })
            
            # Upravljaj tudi podskupine (rekurzivno)
            if group_id in self.group_hierarchy:
                for child_group_id in self.group_hierarchy[group_id]:
                    child_result = self.control_group(child_group_id, action, parameters)
                    results.extend(child_result.get("results", []))
            
            self.log_group_event("group_controlled", {
                "group_id": group_id,
                "group_name": group.name,
                "action": action,
                "parameters": parameters,
                "device_count": len(results)
            })
            
            return {
                "success": True,
                "group_id": group_id,
                "group_name": group.name,
                "action": action,
                "results": results
            }
            
        except Exception as e:
            self.logger.error(f"Napaka pri upravljanju skupine: {e}")
            return {"error": str(e)}

    def _control_device(self, device: Device, action: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Upravljaj posamezno napravo"""
        try:
            if not device.online:
                return {"error": "Naprava ni dosegljiva"}
                
            # Preveri, ali naprava podpira akcijo
            if action not in device.capabilities:
                return {"error": f"Naprava ne podpira akcije: {action}"}
            
            # Izvršuj akcijo preko IoT Secure modula
            if self.iot_secure:
                if action == "on":
                    result = self.iot_secure.turn_on(device.topic)
                elif action == "off":
                    result = self.iot_secure.turn_off(device.topic)
                elif action == "restart":
                    result = self.iot_secure.restart(device.topic)
                elif action == "status":
                    result = self.iot_secure.status(device.topic, device.status_url)
                else:
                    # Pošlji custom ukaz
                    result = self._send_custom_command(device, action, parameters)
            else:
                result = {"error": "IoT Secure modul ni na voljo"}
            
            # Posodobi status naprave
            self.update_device_status(device.id, True, {"last_action": action})
            
            return {"success": True, "result": result}
            
        except Exception as e:
            self.logger.error(f"Napaka pri upravljanju naprave {device.id}: {e}")
            return {"error": str(e)}

    def _send_custom_command(self, device: Device, action: str, parameters: Dict[str, Any] = None) -> str:
        """Pošlji custom ukaz napravi"""
        try:
            # Tu bi implementirali pošiljanje custom ukazov
            # Za zdaj samo simuliramo
            command_data = {
                "action": action,
                "parameters": parameters or {}
            }
            
            # Simulacija pošiljanja ukaza
            return f"Custom ukaz '{action}' poslan napravi {device.name}"
            
        except Exception as e:
            self.logger.error(f"Napaka pri pošiljanju custom ukaza: {e}")
            return f"Napaka: {str(e)}"

    # ==================== POIZVEDBE IN POROČILA ====================
    
    def get_group_status(self, group_id: str) -> Dict[str, Any]:
        """Pridobi status skupine"""
        try:
            if group_id not in self.groups:
                return {"error": f"Skupina {group_id} ne obstaja"}
                
            group = self.groups[group_id]
            device_statuses = []
            
            for device_id in group.devices:
                if device_id in self.devices:
                    device = self.devices[device_id]
                    device_statuses.append({
                        "device_id": device_id,
                        "name": device.name,
                        "type": device.device_type.value,
                        "online": device.online,
                        "last_seen": device.last_seen,
                        "location": device.location
                    })
            
            return {
                "group_id": group_id,
                "name": group.name,
                "description": group.description,
                "type": group.group_type.value,
                "device_count": len(group.devices),
                "online_devices": len([d for d in device_statuses if d["online"]]),
                "devices": device_statuses,
                "automation_enabled": group.automation_enabled,
                "created_at": group.created_at,
                "updated_at": group.updated_at
            }
            
        except Exception as e:
            self.logger.error(f"Napaka pri pridobivanju statusa skupine: {e}")
            return {"error": str(e)}

    def get_all_groups(self) -> List[Dict[str, Any]]:
        """Pridobi vse skupine"""
        groups_list = []
        
        for group in self.groups.values():
            online_devices = len([
                device_id for device_id in group.devices 
                if device_id in self.devices and self.devices[device_id].online
            ])
            
            groups_list.append({
                "group_id": group.id,
                "name": group.name,
                "description": group.description,
                "type": group.group_type.value,
                "device_count": len(group.devices),
                "online_devices": online_devices,
                "automation_enabled": group.automation_enabled,
                "parent_group": group.parent_group,
                "child_groups": group.child_groups or []
            })
        
        return groups_list

    def get_devices_by_type(self, device_type: DeviceType) -> List[Dict[str, Any]]:
        """Pridobi naprave po tipu"""
        devices_list = []
        
        for device in self.devices.values():
            if device.device_type == device_type:
                devices_list.append({
                    "device_id": device.id,
                    "name": device.name,
                    "topic": device.topic,
                    "location": device.location,
                    "online": device.online,
                    "last_seen": device.last_seen,
                    "capabilities": device.capabilities
                })
        
        return devices_list

    def search_devices(self, query: str) -> List[Dict[str, Any]]:
        """Poišči naprave po imenu ali lokaciji"""
        results = []
        query_lower = query.lower()
        
        for device in self.devices.values():
            if (query_lower in device.name.lower() or 
                query_lower in device.location.lower() or
                query_lower in device.description.lower()):
                
                results.append({
                    "device_id": device.id,
                    "name": device.name,
                    "type": device.device_type.value,
                    "location": device.location,
                    "description": device.description,
                    "online": device.online
                })
        
        return results

# Glavna instanca group managerja
group_manager_instance = None

def __name__():
    return "iot_groups"

def initialize_group_manager(iot_secure_module=None):
    """Inicializiraj group manager"""
    global group_manager_instance
    if group_manager_instance is None:
        group_manager_instance = IoTGroupManager(iot_secure_module)
    return group_manager_instance

# Javne funkcije za uporabo v Omni
def create_device_group(group_data: Dict[str, Any]) -> bool:
    """Ustvari skupino naprav"""
    if group_manager_instance is None:
        return False
    
    group = DeviceGroup(**group_data)
    return group_manager_instance.create_group(group)

def add_device(device_data: Dict[str, Any]) -> bool:
    """Dodaj napravo"""
    if group_manager_instance is None:
        return False
    
    device = Device(**device_data)
    return group_manager_instance.add_device(device)

def control_group(group_id: str, action: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
    """Upravljaj skupino naprav"""
    if group_manager_instance is None:
        return {"error": "Group manager ni inicializiran"}
    
    return group_manager_instance.control_group(group_id, action, parameters)

def get_group_status(group_id: str) -> Dict[str, Any]:
    """Pridobi status skupine"""
    if group_manager_instance is None:
        return {"error": "Group manager ni inicializiran"}
    
    return group_manager_instance.get_group_status(group_id)

def get_all_groups() -> List[Dict[str, Any]]:
    """Pridobi vse skupine"""
    if group_manager_instance is None:
        return []
    
    return group_manager_instance.get_all_groups()

def get_group_devices(group_id: str) -> List[Dict[str, Any]]:
    """Pridobi naprave v skupini"""
    if group_manager_instance is None:
        return []
    
    group = group_manager_instance.get_group(group_id)
    if group:
        return [asdict(device) for device in group.devices]
    return []