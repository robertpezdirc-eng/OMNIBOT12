# omni/modules/iot/iot_rules.py
"""
Napredni sistem pravil za IoT avtomatizacijo
Omogoča if-then logiko, pogojno izvrševanje in kompleksne scenarije
"""

import json
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
import logging
from dataclasses import dataclass, asdict
from enum import Enum
import re
import operator

# Konfiguracija
RULES_CONFIG_FILE = "data/automation_rules_config.json"
RULES_LOG_FILE = "data/logs/automation_rules_logs.json"

class ConditionType(Enum):
    TIME = "time"
    DEVICE_STATE = "device_state"
    SENSOR_VALUE = "sensor_value"
    GROUP_STATE = "group_state"
    WEATHER = "weather"
    CUSTOM = "custom"

class OperatorType(Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    GREATER_EQUAL = "greater_equal"
    LESS_EQUAL = "less_equal"
    CONTAINS = "contains"
    IN_RANGE = "in_range"
    REGEX_MATCH = "regex_match"

class ActionType(Enum):
    DEVICE_CONTROL = "device_control"
    GROUP_CONTROL = "group_control"
    SCENE_ACTIVATE = "scene_activate"
    NOTIFICATION = "notification"
    DELAY = "delay"
    VARIABLE_SET = "variable_set"
    RULE_ENABLE = "rule_enable"
    RULE_DISABLE = "rule_disable"
    CUSTOM_SCRIPT = "custom_script"

class LogicOperator(Enum):
    AND = "and"
    OR = "or"
    NOT = "not"

@dataclass
class Condition:
    id: str
    type: ConditionType
    target: str  # device_id, sensor_id, group_id, etc.
    property: str  # state, temperature, humidity, etc.
    operator: OperatorType
    value: Any
    metadata: Dict[str, Any] = None

@dataclass
class Action:
    id: str
    type: ActionType
    target: str
    command: str
    parameters: Dict[str, Any] = None
    delay_seconds: int = 0

@dataclass
class Rule:
    id: str
    name: str
    description: str
    conditions: List[Condition]
    actions: List[Action]
    logic_operator: LogicOperator = LogicOperator.AND
    enabled: bool = True
    priority: int = 1
    cooldown_seconds: int = 0
    max_executions_per_day: int = None
    created_at: str = None
    updated_at: str = None
    last_executed: str = None
    execution_count: int = 0
    execution_count_today: int = 0

class IoTRulesEngine:
    def __init__(self, iot_secure_module=None, automation_engine=None, group_manager=None):
        self.iot_secure = iot_secure_module
        self.automation_engine = automation_engine
        self.group_manager = group_manager
        
        self.rules: Dict[str, Rule] = {}
        self.variables: Dict[str, Any] = {}
        self.running = False
        self.evaluation_thread = None
        
        # Cache za device states
        self.device_states: Dict[str, Dict[str, Any]] = {}
        self.sensor_values: Dict[str, Dict[str, Any]] = {}
        
        # Nastavi logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Naloži konfiguracijo
        self.load_configuration()
        
        # Zaženi evalvacijski sistem
        self.start_evaluation()

    def load_configuration(self):
        """Naloži konfiguracijo pravil"""
        try:
            if os.path.exists(RULES_CONFIG_FILE):
                with open(RULES_CONFIG_FILE, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    
                # Naloži pravila
                for rule_data in config.get('rules', []):
                    # Pretvori conditions in actions iz dict v dataclass
                    conditions = [Condition(**cond) for cond in rule_data.get('conditions', [])]
                    actions = [Action(**act) for act in rule_data.get('actions', [])]
                    
                    rule_data['conditions'] = conditions
                    rule_data['actions'] = actions
                    
                    rule = Rule(**rule_data)
                    self.rules[rule.id] = rule
                    
                # Naloži spremenljivke
                self.variables = config.get('variables', {})
                    
                self.logger.info(f"Naloženih {len(self.rules)} pravil")
        except Exception as e:
            self.logger.error(f"Napaka pri nalaganju konfiguracije: {e}")

    def save_configuration(self):
        """Shrani konfiguracijo pravil"""
        try:
            # Pretvori dataclass objekte v dict
            rules_dict = {}
            for rule_id, rule in self.rules.items():
                rule_dict = asdict(rule)
                # Pretvori enum vrednosti v string
                rule_dict['logic_operator'] = rule.logic_operator.value
                
                for i, condition in enumerate(rule_dict['conditions']):
                    condition['type'] = rule.conditions[i].type.value
                    condition['operator'] = rule.conditions[i].operator.value
                    
                for i, action in enumerate(rule_dict['actions']):
                    action['type'] = rule.actions[i].type.value
                    
                rules_dict[rule_id] = rule_dict
            
            config = {
                'rules': list(rules_dict.values()),
                'variables': self.variables
            }
            
            os.makedirs(os.path.dirname(RULES_CONFIG_FILE), exist_ok=True)
            with open(RULES_CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
                
            self.logger.info("Konfiguracija pravil shranjena")
        except Exception as e:
            self.logger.error(f"Napaka pri shranjevanju konfiguracije: {e}")

    def log_rules_event(self, event_type: str, details: Dict[str, Any]):
        """Logiraj dogodek pravil"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "event_type": event_type,
                "details": details
            }
            
            os.makedirs(os.path.dirname(RULES_LOG_FILE), exist_ok=True)
            with open(RULES_LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        except Exception as e:
            self.logger.error(f"Napaka pri logiranju: {e}")

    # ==================== UPRAVLJANJE PRAVIL ====================
    
    def add_rule(self, rule: Rule) -> bool:
        """Dodaj novo pravilo"""
        try:
            if not rule.created_at:
                rule.created_at = datetime.now().isoformat()
                
            rule.updated_at = datetime.now().isoformat()
            
            self.rules[rule.id] = rule
            self.save_configuration()
            
            self.log_rules_event("rule_added", {
                "rule_id": rule.id,
                "name": rule.name,
                "conditions_count": len(rule.conditions),
                "actions_count": len(rule.actions)
            })
            
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri dodajanju pravila: {e}")
            return False

    def remove_rule(self, rule_id: str) -> bool:
        """Odstrani pravilo"""
        try:
            if rule_id in self.rules:
                rule = self.rules[rule_id]
                del self.rules[rule_id]
                self.save_configuration()
                
                self.log_rules_event("rule_removed", {
                    "rule_id": rule_id,
                    "name": rule.name
                })
                return True
            return False
        except Exception as e:
            self.logger.error(f"Napaka pri odstranjevanju pravila: {e}")
            return False

    def toggle_rule(self, rule_id: str) -> bool:
        """Vklopi/izklopi pravilo"""
        try:
            if rule_id in self.rules:
                rule = self.rules[rule_id]
                rule.enabled = not rule.enabled
                rule.updated_at = datetime.now().isoformat()
                self.save_configuration()
                
                self.log_rules_event("rule_toggled", {
                    "rule_id": rule_id,
                    "enabled": rule.enabled
                })
                return True
            return False
        except Exception as e:
            self.logger.error(f"Napaka pri preklapljanju pravila: {e}")
            return False

    # ==================== EVALVACIJA PRAVIL ====================
    
    def start_evaluation(self):
        """Zaženi evalvacijski sistem"""
        if not self.running:
            self.running = True
            self.evaluation_thread = threading.Thread(target=self._evaluation_loop, daemon=True)
            self.evaluation_thread.start()
            self.logger.info("Rules Engine zagnan")

    def stop_evaluation(self):
        """Ustavi evalvacijski sistem"""
        self.running = False
        if self.evaluation_thread:
            self.evaluation_thread.join()
        self.logger.info("Rules Engine ustavljen")

    def _evaluation_loop(self):
        """Glavna zanka za evalvacijo pravil"""
        while self.running:
            try:
                # Posodobi device states
                self._update_device_states()
                
                # Evalviraj vsa pravila
                for rule in list(self.rules.values()):
                    if rule.enabled and self._should_evaluate_rule(rule):
                        if self._evaluate_rule(rule):
                            self._execute_rule(rule)
                
                time.sleep(1)  # Evalviraj vsako sekundo
                
            except Exception as e:
                self.logger.error(f"Napaka v evalvacijski zanki: {e}")

    def _update_device_states(self):
        """Posodobi stanja naprav"""
        try:
            # Tu bi pridobili aktualna stanja naprav
            # Za zdaj simuliramo
            pass
        except Exception as e:
            self.logger.error(f"Napaka pri posodabljanju stanj naprav: {e}")

    def _should_evaluate_rule(self, rule: Rule) -> bool:
        """Preveri, ali naj se pravilo evalvira"""
        try:
            # Preveri cooldown
            if rule.last_executed and rule.cooldown_seconds > 0:
                last_exec = datetime.fromisoformat(rule.last_executed)
                if datetime.now() - last_exec < timedelta(seconds=rule.cooldown_seconds):
                    return False
            
            # Preveri dnevno omejitev
            if rule.max_executions_per_day:
                today = datetime.now().date()
                if rule.last_executed:
                    last_exec_date = datetime.fromisoformat(rule.last_executed).date()
                    if last_exec_date != today:
                        rule.execution_count_today = 0
                
                if rule.execution_count_today >= rule.max_executions_per_day:
                    return False
            
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri preverjanju evalvacije pravila: {e}")
            return False

    def _evaluate_rule(self, rule: Rule) -> bool:
        """Evalviraj pravilo"""
        try:
            if not rule.conditions:
                return True
            
            condition_results = []
            
            for condition in rule.conditions:
                result = self._evaluate_condition(condition)
                condition_results.append(result)
            
            # Uporabi logični operator
            if rule.logic_operator == LogicOperator.AND:
                return all(condition_results)
            elif rule.logic_operator == LogicOperator.OR:
                return any(condition_results)
            elif rule.logic_operator == LogicOperator.NOT:
                return not all(condition_results)
            
            return False
            
        except Exception as e:
            self.logger.error(f"Napaka pri evalvaciji pravila {rule.id}: {e}")
            return False

    def _evaluate_condition(self, condition: Condition) -> bool:
        """Evalviraj posamezen pogoj"""
        try:
            current_value = self._get_condition_value(condition)
            
            if current_value is None:
                return False
            
            return self._compare_values(current_value, condition.operator, condition.value)
            
        except Exception as e:
            self.logger.error(f"Napaka pri evalvaciji pogoja {condition.id}: {e}")
            return False

    def _get_condition_value(self, condition: Condition) -> Any:
        """Pridobi trenutno vrednost za pogoj"""
        try:
            if condition.type == ConditionType.TIME:
                now = datetime.now()
                if condition.property == "hour":
                    return now.hour
                elif condition.property == "minute":
                    return now.minute
                elif condition.property == "weekday":
                    return now.weekday()
                elif condition.property == "time":
                    return now.strftime("%H:%M")
                
            elif condition.type == ConditionType.DEVICE_STATE:
                # Pridobi stanje naprave
                if condition.target in self.device_states:
                    return self.device_states[condition.target].get(condition.property)
                
            elif condition.type == ConditionType.SENSOR_VALUE:
                # Pridobi vrednost senzorja
                if condition.target in self.sensor_values:
                    return self.sensor_values[condition.target].get(condition.property)
                
            elif condition.type == ConditionType.GROUP_STATE:
                # Pridobi stanje skupine
                if self.group_manager:
                    group_status = self.group_manager.get_group_status(condition.target)
                    return group_status.get(condition.property)
                
            elif condition.type == ConditionType.CUSTOM:
                # Custom pogoji
                return self.variables.get(condition.target)
            
            return None
            
        except Exception as e:
            self.logger.error(f"Napaka pri pridobivanju vrednosti pogoja: {e}")
            return None

    def _compare_values(self, current_value: Any, operator: OperatorType, target_value: Any) -> bool:
        """Primerja vrednosti z operatorjem"""
        try:
            if operator == OperatorType.EQUALS:
                return current_value == target_value
            elif operator == OperatorType.NOT_EQUALS:
                return current_value != target_value
            elif operator == OperatorType.GREATER_THAN:
                return current_value > target_value
            elif operator == OperatorType.LESS_THAN:
                return current_value < target_value
            elif operator == OperatorType.GREATER_EQUAL:
                return current_value >= target_value
            elif operator == OperatorType.LESS_EQUAL:
                return current_value <= target_value
            elif operator == OperatorType.CONTAINS:
                return str(target_value) in str(current_value)
            elif operator == OperatorType.IN_RANGE:
                if isinstance(target_value, list) and len(target_value) == 2:
                    return target_value[0] <= current_value <= target_value[1]
            elif operator == OperatorType.REGEX_MATCH:
                return bool(re.match(str(target_value), str(current_value)))
            
            return False
            
        except Exception as e:
            self.logger.error(f"Napaka pri primerjavi vrednosti: {e}")
            return False

    # ==================== IZVRŠITEV PRAVIL ====================
    
    def _execute_rule(self, rule: Rule):
        """Izvršuj pravilo"""
        try:
            self.logger.info(f"Izvršujem pravilo: {rule.name}")
            
            results = []
            
            for action in rule.actions:
                # Počakaj, če je potrebno
                if action.delay_seconds > 0:
                    time.sleep(action.delay_seconds)
                
                result = self._execute_action(action)
                results.append(result)
            
            # Posodobi statistike
            rule.last_executed = datetime.now().isoformat()
            rule.execution_count += 1
            rule.execution_count_today += 1
            rule.updated_at = datetime.now().isoformat()
            
            self.save_configuration()
            
            self.log_rules_event("rule_executed", {
                "rule_id": rule.id,
                "name": rule.name,
                "results": results,
                "execution_count": rule.execution_count
            })
            
        except Exception as e:
            self.logger.error(f"Napaka pri izvršitvi pravila {rule.id}: {e}")

    def _execute_action(self, action: Action) -> Dict[str, Any]:
        """Izvršuj akcijo"""
        try:
            if action.type == ActionType.DEVICE_CONTROL:
                if self.iot_secure:
                    if action.command == "on":
                        result = self.iot_secure.turn_on(action.target)
                    elif action.command == "off":
                        result = self.iot_secure.turn_off(action.target)
                    elif action.command == "restart":
                        result = self.iot_secure.restart(action.target)
                    else:
                        result = f"Neznana komanda: {action.command}"
                else:
                    result = "IoT Secure modul ni na voljo"
                
                return {"type": "device_control", "target": action.target, "command": action.command, "result": result}
                
            elif action.type == ActionType.GROUP_CONTROL:
                if self.group_manager:
                    result = self.group_manager.control_group(action.target, action.command, action.parameters)
                else:
                    result = {"error": "Group manager ni na voljo"}
                
                return {"type": "group_control", "target": action.target, "command": action.command, "result": result}
                
            elif action.type == ActionType.SCENE_ACTIVATE:
                if self.automation_engine:
                    result = self.automation_engine.activate_scene(action.target)
                else:
                    result = {"error": "Automation engine ni na voljo"}
                
                return {"type": "scene_activate", "target": action.target, "result": result}
                
            elif action.type == ActionType.NOTIFICATION:
                message = action.parameters.get("message", f"Pravilo izvršeno: {action.target}")
                self.logger.info(f"Obvestilo: {message}")
                return {"type": "notification", "message": message}
                
            elif action.type == ActionType.VARIABLE_SET:
                variable_name = action.target
                variable_value = action.parameters.get("value")
                self.variables[variable_name] = variable_value
                self.save_configuration()
                
                return {"type": "variable_set", "variable": variable_name, "value": variable_value}
                
            elif action.type == ActionType.RULE_ENABLE:
                self.toggle_rule(action.target)
                return {"type": "rule_enable", "rule_id": action.target}
                
            elif action.type == ActionType.RULE_DISABLE:
                if action.target in self.rules:
                    self.rules[action.target].enabled = False
                    self.save_configuration()
                return {"type": "rule_disable", "rule_id": action.target}
                
            else:
                return {"type": "unknown", "error": f"Neznana vrsta akcije: {action.type}"}
                
        except Exception as e:
            self.logger.error(f"Napaka pri izvršitvi akcije: {e}")
            return {"type": "error", "error": str(e)}

    # ==================== POROČILA IN STATUS ====================
    
    def get_rules_status(self) -> Dict[str, Any]:
        """Pridobi status pravil"""
        active_rules = [r for r in self.rules.values() if r.enabled]
        
        return {
            "engine_running": self.running,
            "total_rules": len(self.rules),
            "active_rules": len(active_rules),
            "disabled_rules": len(self.rules) - len(active_rules),
            "total_executions": sum(r.execution_count for r in self.rules.values()),
            "variables_count": len(self.variables),
            "recent_executions": self._get_recent_executions()
        }

    def _get_recent_executions(self) -> List[Dict[str, Any]]:
        """Pridobi nedavne izvršitve"""
        recent = []
        
        for rule in self.rules.values():
            if rule.last_executed:
                recent.append({
                    "rule_id": rule.id,
                    "name": rule.name,
                    "last_executed": rule.last_executed,
                    "execution_count": rule.execution_count
                })
        
        # Sortiraj po času zadnje izvršitve
        recent.sort(key=lambda x: x['last_executed'], reverse=True)
        
        return recent[:10]

    def get_rule_details(self, rule_id: str) -> Dict[str, Any]:
        """Pridobi podrobnosti pravila"""
        if rule_id not in self.rules:
            return {"error": f"Pravilo {rule_id} ne obstaja"}
        
        rule = self.rules[rule_id]
        
        return {
            "rule_id": rule.id,
            "name": rule.name,
            "description": rule.description,
            "enabled": rule.enabled,
            "priority": rule.priority,
            "logic_operator": rule.logic_operator.value,
            "conditions_count": len(rule.conditions),
            "actions_count": len(rule.actions),
            "execution_count": rule.execution_count,
            "execution_count_today": rule.execution_count_today,
            "last_executed": rule.last_executed,
            "created_at": rule.created_at,
            "updated_at": rule.updated_at,
            "cooldown_seconds": rule.cooldown_seconds,
            "max_executions_per_day": rule.max_executions_per_day
        }

# Glavna instanca rules engine
rules_engine_instance = None

# Ustvari rules_engine alias za kompatibilnost
rules_engine = None

def __name__():
    return "iot_rules"

def initialize_rules_engine(iot_secure_module=None, automation_engine=None, group_manager=None):
    """Inicializiraj rules engine"""
    global rules_engine_instance, rules_engine
    if rules_engine_instance is None:
        rules_engine_instance = IoTRulesEngine(iot_secure_module, automation_engine, group_manager)
        rules_engine = rules_engine_instance  # Alias za kompatibilnost
    return rules_engine_instance

# Javne funkcije za uporabo v Omni
def add_automation_rule(rule_data: Dict[str, Any]) -> bool:
    """Dodaj avtomatizacijsko pravilo"""
    if rules_engine_instance is None:
        return False
    
    # Pretvori dict v dataclass objekte
    conditions = [Condition(**cond) for cond in rule_data.get('conditions', [])]
    actions = [Action(**act) for act in rule_data.get('actions', [])]
    
    rule_data['conditions'] = conditions
    rule_data['actions'] = actions
    
    rule = Rule(**rule_data)
    return rules_engine_instance.add_rule(rule)

def get_rules_status() -> Dict[str, Any]:
    """Pridobi status pravil"""
    if rules_engine_instance is None:
        return {"error": "Rules engine ni inicializiran"}
    
    return rules_engine_instance.get_rules_status()

def set_variable(name: str, value: Any) -> bool:
    """Nastavi spremenljivko"""
    if rules_engine_instance is None:
        return False
    
    rules_engine_instance.variables[name] = value
    rules_engine_instance.save_configuration()
    return True

def get_variable(name: str) -> Any:
    """Pridobi vrednost spremenljivke"""
    if rules_engine_instance is None:
        return None
    
    return rules_engine_instance.variables.get(name)

def get_all_rules() -> List[Dict[str, Any]]:
    """Pridobi vsa pravila"""
    if rules_engine_instance is None:
        return []
    
    return [asdict(rule) for rule in rules_engine_instance.rules]

# Pomožne funkcije za ustvarjanje pravil
def create_time_condition(condition_id: str, property: str, operator: str, value: Any) -> Dict[str, Any]:
    """Ustvari časovni pogoj"""
    return {
        "id": condition_id,
        "type": ConditionType.TIME.value,
        "target": "system",
        "property": property,
        "operator": operator,
        "value": value
    }

def create_device_action(action_id: str, device_topic: str, command: str, delay: int = 0) -> Dict[str, Any]:
    """Ustvari akcijo naprave"""
    return {
        "id": action_id,
        "type": ActionType.DEVICE_CONTROL.value,
        "target": device_topic,
        "command": command,
        "delay_seconds": delay
    }