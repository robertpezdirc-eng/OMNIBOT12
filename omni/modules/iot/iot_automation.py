# omni/modules/iot/iot_automation.py
"""
Napredni avtomatizacijski sistem za IoT naprave
Omogoča urnikovanje, scenarije in pogojne ukaze
"""

import json
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Callable
import schedule
import logging
from dataclasses import dataclass, asdict
from enum import Enum

# Konfiguracija
AUTOMATION_CONFIG_FILE = "data/automation_config.json"
AUTOMATION_LOG_FILE = "data/logs/automation_logs.json"

class TriggerType(Enum):
    TIME = "time"
    SENSOR = "sensor"
    DEVICE_STATE = "device_state"
    MANUAL = "manual"

class ActionType(Enum):
    DEVICE_ON = "device_on"
    DEVICE_OFF = "device_off"
    DEVICE_RESTART = "device_restart"
    SCENE_ACTIVATE = "scene_activate"
    NOTIFICATION = "notification"

@dataclass
class AutomationRule:
    id: str
    name: str
    description: str
    trigger_type: TriggerType
    trigger_config: Dict[str, Any]
    actions: List[Dict[str, Any]]
    conditions: List[Dict[str, Any]] = None
    enabled: bool = True
    created_at: str = None
    last_executed: str = None

@dataclass
class DeviceGroup:
    id: str
    name: str
    devices: List[str]
    description: str = ""

@dataclass
class Scene:
    id: str
    name: str
    description: str
    actions: List[Dict[str, Any]]
    enabled: bool = True

class IoTAutomationEngine:
    def __init__(self, iot_secure_module=None):
        self.iot_secure = iot_secure_module
        self.rules: Dict[str, AutomationRule] = {}
        self.device_groups: Dict[str, DeviceGroup] = {}
        self.scenes: Dict[str, Scene] = {}
        self.running = False
        self.scheduler_thread = None
        
        # Nastavi logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Naloži konfiguracijo
        self.load_configuration()
        
        # Zaženi scheduler
        self.start_scheduler()

    def load_configuration(self):
        """Naloži avtomatizacijsko konfiguracijo iz datoteke"""
        try:
            if os.path.exists(AUTOMATION_CONFIG_FILE):
                with open(AUTOMATION_CONFIG_FILE, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    
                # Naloži pravila
                for rule_data in config.get('rules', []):
                    rule = AutomationRule(**rule_data)
                    self.rules[rule.id] = rule
                    
                # Naloži skupine naprav
                for group_data in config.get('device_groups', []):
                    group = DeviceGroup(**group_data)
                    self.device_groups[group.id] = group
                    
                # Naloži scene
                for scene_data in config.get('scenes', []):
                    scene = Scene(**scene_data)
                    self.scenes[scene.id] = scene
                    
                self.logger.info(f"Naložena konfiguracija: {len(self.rules)} pravil, {len(self.device_groups)} skupin, {len(self.scenes)} scen")
        except Exception as e:
            self.logger.error(f"Napaka pri nalaganju konfiguracije: {e}")

    def save_configuration(self):
        """Shrani avtomatizacijsko konfiguracijo v datoteko"""
        try:
            config = {
                'rules': [asdict(rule) for rule in self.rules.values()],
                'device_groups': [asdict(group) for group in self.device_groups.values()],
                'scenes': [asdict(scene) for scene in self.scenes.values()]
            }
            
            os.makedirs(os.path.dirname(AUTOMATION_CONFIG_FILE), exist_ok=True)
            with open(AUTOMATION_CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
                
            self.logger.info("Konfiguracija shranjena")
        except Exception as e:
            self.logger.error(f"Napaka pri shranjevanju konfiguracije: {e}")

    def log_automation_event(self, event_type: str, details: Dict[str, Any]):
        """Logiraj avtomatizacijski dogodek"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "event_type": event_type,
                "details": details
            }
            
            os.makedirs(os.path.dirname(AUTOMATION_LOG_FILE), exist_ok=True)
            with open(AUTOMATION_LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        except Exception as e:
            self.logger.error(f"Napaka pri logiranju: {e}")

    # ==================== UPRAVLJANJE PRAVIL ====================
    
    def add_rule(self, rule: AutomationRule) -> bool:
        """Dodaj novo avtomatizacijsko pravilo"""
        try:
            if not rule.created_at:
                rule.created_at = datetime.now().isoformat()
                
            self.rules[rule.id] = rule
            self.save_configuration()
            
            # Če je časovno pravilo, ga dodaj v scheduler
            if rule.trigger_type == TriggerType.TIME and rule.enabled:
                self._schedule_time_rule(rule)
            
            self.log_automation_event("rule_added", {"rule_id": rule.id, "name": rule.name})
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri dodajanju pravila: {e}")
            return False

    def remove_rule(self, rule_id: str) -> bool:
        """Odstrani avtomatizacijsko pravilo"""
        try:
            if rule_id in self.rules:
                rule = self.rules[rule_id]
                del self.rules[rule_id]
                self.save_configuration()
                
                # Odstrani iz schedulerja
                schedule.clear(rule_id)
                
                self.log_automation_event("rule_removed", {"rule_id": rule_id, "name": rule.name})
                return True
            return False
        except Exception as e:
            self.logger.error(f"Napaka pri odstranjevanju pravila: {e}")
            return False

    def toggle_rule(self, rule_id: str) -> bool:
        """Vklopi/izklopi avtomatizacijsko pravilo"""
        try:
            if rule_id in self.rules:
                rule = self.rules[rule_id]
                rule.enabled = not rule.enabled
                self.save_configuration()
                
                if rule.enabled and rule.trigger_type == TriggerType.TIME:
                    self._schedule_time_rule(rule)
                else:
                    schedule.clear(rule_id)
                
                self.log_automation_event("rule_toggled", {
                    "rule_id": rule_id, 
                    "enabled": rule.enabled
                })
                return True
            return False
        except Exception as e:
            self.logger.error(f"Napaka pri preklapljanju pravila: {e}")
            return False

    # ==================== SCHEDULER ====================
    
    def _schedule_time_rule(self, rule: AutomationRule):
        """Dodaj časovno pravilo v scheduler"""
        try:
            trigger_config = rule.trigger_config
            
            if trigger_config.get('type') == 'daily':
                time_str = trigger_config.get('time', '00:00')
                schedule.every().day.at(time_str).do(
                    self._execute_rule, rule.id
                ).tag(rule.id)
                
            elif trigger_config.get('type') == 'weekly':
                day = trigger_config.get('day', 'monday')
                time_str = trigger_config.get('time', '00:00')
                getattr(schedule.every(), day.lower()).at(time_str).do(
                    self._execute_rule, rule.id
                ).tag(rule.id)
                
            elif trigger_config.get('type') == 'interval':
                minutes = trigger_config.get('minutes', 60)
                schedule.every(minutes).minutes.do(
                    self._execute_rule, rule.id
                ).tag(rule.id)
                
            self.logger.info(f"Pravilo {rule.id} dodano v scheduler")
        except Exception as e:
            self.logger.error(f"Napaka pri dodajanju v scheduler: {e}")

    def start_scheduler(self):
        """Zaženi scheduler v ločeni niti"""
        if not self.running:
            self.running = True
            self.scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
            self.scheduler_thread.start()
            self.logger.info("Scheduler zagnan")

    def stop_scheduler(self):
        """Ustavi scheduler"""
        self.running = False
        if self.scheduler_thread:
            self.scheduler_thread.join()
        self.logger.info("Scheduler ustavljen")

    def _scheduler_loop(self):
        """Glavna zanka schedulerja"""
        while self.running:
            try:
                schedule.run_pending()
                time.sleep(1)
            except Exception as e:
                self.logger.error(f"Napaka v scheduler zanki: {e}")

    # ==================== IZVRŠITEV PRAVIL ====================
    
    def _execute_rule(self, rule_id: str):
        """Izvršuj avtomatizacijsko pravilo"""
        try:
            if rule_id not in self.rules:
                return
                
            rule = self.rules[rule_id]
            if not rule.enabled:
                return
            
            # Preveri pogoje
            if rule.conditions and not self._check_conditions(rule.conditions):
                self.log_automation_event("rule_conditions_failed", {"rule_id": rule_id})
                return
            
            # Izvršuj akcije
            results = []
            for action in rule.actions:
                result = self._execute_action(action)
                results.append(result)
            
            # Posodobi čas zadnje izvedbe
            rule.last_executed = datetime.now().isoformat()
            self.save_configuration()
            
            self.log_automation_event("rule_executed", {
                "rule_id": rule_id,
                "name": rule.name,
                "results": results
            })
            
        except Exception as e:
            self.logger.error(f"Napaka pri izvršitvi pravila {rule_id}: {e}")

    def _check_conditions(self, conditions: List[Dict[str, Any]]) -> bool:
        """Preveri pogoje za izvršitev pravila"""
        try:
            for condition in conditions:
                condition_type = condition.get('type')
                
                if condition_type == 'time_range':
                    start_time = condition.get('start_time')
                    end_time = condition.get('end_time')
                    current_time = datetime.now().strftime('%H:%M')
                    
                    if not (start_time <= current_time <= end_time):
                        return False
                        
                elif condition_type == 'device_state':
                    # Tu bi preverili stanje naprave
                    # Za zdaj vrnemo True
                    pass
                    
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri preverjanju pogojev: {e}")
            return False

    def _execute_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Izvršuj posamezno akcijo"""
        try:
            action_type = ActionType(action.get('type'))
            
            if action_type == ActionType.DEVICE_ON:
                device = action.get('device')
                if self.iot_secure and hasattr(self.iot_secure, 'turn_on'):
                    result = self.iot_secure.turn_on(device)
                    return {"action": "device_on", "device": device, "result": result}
                    
            elif action_type == ActionType.DEVICE_OFF:
                device = action.get('device')
                if self.iot_secure and hasattr(self.iot_secure, 'turn_off'):
                    result = self.iot_secure.turn_off(device)
                    return {"action": "device_off", "device": device, "result": result}
                    
            elif action_type == ActionType.DEVICE_RESTART:
                device = action.get('device')
                if self.iot_secure and hasattr(self.iot_secure, 'restart'):
                    result = self.iot_secure.restart(device)
                    return {"action": "device_restart", "device": device, "result": result}
                    
            elif action_type == ActionType.SCENE_ACTIVATE:
                scene_id = action.get('scene_id')
                result = self.activate_scene(scene_id)
                return {"action": "scene_activate", "scene_id": scene_id, "result": result}
                
            elif action_type == ActionType.NOTIFICATION:
                message = action.get('message', 'Avtomatizacija izvedena')
                self.logger.info(f"Obvestilo: {message}")
                return {"action": "notification", "message": message}
                
        except Exception as e:
            self.logger.error(f"Napaka pri izvršitvi akcije: {e}")
            return {"action": "error", "error": str(e)}

    # ==================== SCENE ====================
    
    def add_scene(self, scene: Scene) -> bool:
        """Dodaj novo sceno"""
        try:
            self.scenes[scene.id] = scene
            self.save_configuration()
            self.log_automation_event("scene_added", {"scene_id": scene.id, "name": scene.name})
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri dodajanju scene: {e}")
            return False

    def activate_scene(self, scene_id: str) -> Dict[str, Any]:
        """Aktiviraj sceno"""
        try:
            if scene_id not in self.scenes:
                return {"error": f"Scena {scene_id} ne obstaja"}
                
            scene = self.scenes[scene_id]
            if not scene.enabled:
                return {"error": f"Scena {scene_id} je onemogočena"}
            
            results = []
            for action in scene.actions:
                result = self._execute_action(action)
                results.append(result)
            
            self.log_automation_event("scene_activated", {
                "scene_id": scene_id,
                "name": scene.name,
                "results": results
            })
            
            return {"success": True, "scene": scene.name, "results": results}
            
        except Exception as e:
            self.logger.error(f"Napaka pri aktivaciji scene: {e}")
            return {"error": str(e)}

    # ==================== SKUPINE NAPRAV ====================
    
    def add_device_group(self, group: DeviceGroup) -> bool:
        """Dodaj skupino naprav"""
        try:
            self.device_groups[group.id] = group
            self.save_configuration()
            self.log_automation_event("device_group_added", {"group_id": group.id, "name": group.name})
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri dodajanju skupine: {e}")
            return False

    def control_device_group(self, group_id: str, action: str) -> Dict[str, Any]:
        """Upravljaj skupino naprav"""
        try:
            if group_id not in self.device_groups:
                return {"error": f"Skupina {group_id} ne obstaja"}
                
            group = self.device_groups[group_id]
            results = []
            
            for device in group.devices:
                if action == "on" and self.iot_secure:
                    result = self.iot_secure.turn_on(device)
                elif action == "off" and self.iot_secure:
                    result = self.iot_secure.turn_off(device)
                elif action == "restart" and self.iot_secure:
                    result = self.iot_secure.restart(device)
                else:
                    result = f"Neznana akcija: {action}"
                    
                results.append({"device": device, "result": result})
            
            self.log_automation_event("device_group_controlled", {
                "group_id": group_id,
                "action": action,
                "results": results
            })
            
            return {"success": True, "group": group.name, "action": action, "results": results}
            
        except Exception as e:
            self.logger.error(f"Napaka pri upravljanju skupine: {e}")
            return {"error": str(e)}

    # ==================== POROČILA ====================
    
    def get_automation_status(self) -> Dict[str, Any]:
        """Pridobi status avtomatizacije"""
        return {
            "scheduler_running": self.running,
            "rules_count": len(self.rules),
            "active_rules": len([r for r in self.rules.values() if r.enabled]),
            "scenes_count": len(self.scenes),
            "device_groups_count": len(self.device_groups),
            "next_scheduled": self._get_next_scheduled_jobs()
        }

    def _get_next_scheduled_jobs(self) -> List[Dict[str, Any]]:
        """Pridobi naslednje načrtovane naloge"""
        try:
            jobs = []
            for job in schedule.jobs:
                jobs.append({
                    "rule_id": list(job.tags)[0] if job.tags else "unknown",
                    "next_run": job.next_run.isoformat() if job.next_run else None
                })
            return jobs
        except Exception as e:
            self.logger.error(f"Napaka pri pridobivanju nalog: {e}")
            return []

# Glavna instanca avtomatizacijskega sistema
automation_engine = None

def __name__():
    return "iot_automation"

def initialize_automation(iot_secure_module=None):
    """Inicializiraj avtomatizacijski sistem"""
    global automation_engine
    if automation_engine is None:
        automation_engine = IoTAutomationEngine(iot_secure_module)
    return automation_engine

# Javne funkcije za uporabo v Omni
def add_automation_rule(rule_data: Dict[str, Any]) -> bool:
    """Dodaj avtomatizacijsko pravilo"""
    if automation_engine is None:
        return False
    
    rule = AutomationRule(**rule_data)
    return automation_engine.add_rule(rule)

def activate_scene(scene_id: str) -> Dict[str, Any]:
    """Aktiviraj sceno"""
    if automation_engine is None:
        return {"error": "Avtomatizacija ni inicializirana"}
    
    return automation_engine.activate_scene(scene_id)

def control_group(group_id: str, action: str) -> Dict[str, Any]:
    """Upravljaj skupino naprav"""
    if automation_engine is None:
        return {"error": "Avtomatizacija ni inicializirana"}
    
    return automation_engine.control_device_group(group_id, action)

def get_all_scenes() -> Dict[str, Any]:
    """Pridobi vse scene"""
    if automation_engine is None:
        return {"error": "Avtomatizacija ni inicializirana"}
    
    return {
        scene_id: asdict(scene) 
        for scene_id, scene in automation_engine.scenes.items()
    }

def get_status() -> Dict[str, Any]:
    """Pridobi status avtomatizacije"""
    if automation_engine is None:
        return {"error": "Avtomatizacija ni inicializirana"}
    
    return automation_engine.get_automation_status()