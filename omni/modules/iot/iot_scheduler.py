# omni/modules/iot/iot_scheduler.py
"""
Napredni časovni scheduler za IoT naprave
Omogoča cron-like funkcionalnost za avtomatizacijo
"""

import json
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Callable
import croniter
import logging
from dataclasses import dataclass, asdict
from enum import Enum

# Konfiguracija
SCHEDULER_CONFIG_FILE = "data/scheduler_config.json"
SCHEDULER_LOG_FILE = "data/logs/scheduler_logs.json"

class ScheduleType(Enum):
    CRON = "cron"
    INTERVAL = "interval"
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"

@dataclass
class ScheduledTask:
    id: str
    name: str
    description: str
    schedule_type: ScheduleType
    schedule_config: Dict[str, Any]
    action: Dict[str, Any]
    enabled: bool = True
    created_at: str = None
    last_run: str = None
    next_run: str = None
    run_count: int = 0
    max_runs: int = None

class IoTScheduler:
    def __init__(self, iot_secure_module=None, automation_engine=None):
        self.iot_secure = iot_secure_module
        self.automation_engine = automation_engine
        self.tasks: Dict[str, ScheduledTask] = {}
        self.running = False
        self.scheduler_thread = None
        
        # Nastavi logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("IoTScheduler")
        
        # Naloži konfiguracijo
        self.load_configuration()
        
        # Zaženi scheduler
        self.start()

    def load_configuration(self):
        """Naloži scheduler konfiguracijo iz datoteke"""
        try:
            if os.path.exists(SCHEDULER_CONFIG_FILE):
                with open(SCHEDULER_CONFIG_FILE, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    
                for task_data in config.get('tasks', []):
                    task = ScheduledTask(**task_data)
                    self.tasks[task.id] = task
                    # Izračunaj naslednji zagon
                    self._calculate_next_run(task)
                    
                self.logger.info(f"Naloženih {len(self.tasks)} načrtovanih nalog")
        except Exception as e:
            self.logger.error(f"Napaka pri nalaganju konfiguracije: {e}")

    def save_configuration(self):
        """Shrani scheduler konfiguracijo v datoteko"""
        try:
            config = {
                'tasks': [asdict(task) for task in self.tasks.values()]
            }
            
            os.makedirs(os.path.dirname(SCHEDULER_CONFIG_FILE), exist_ok=True)
            with open(SCHEDULER_CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
                
            self.logger.info("Scheduler konfiguracija shranjena")
        except Exception as e:
            self.logger.error(f"Napaka pri shranjevanju konfiguracije: {e}")

    def log_scheduler_event(self, event_type: str, details: Dict[str, Any]):
        """Logiraj scheduler dogodek"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "event_type": event_type,
                "details": details
            }
            
            os.makedirs(os.path.dirname(SCHEDULER_LOG_FILE), exist_ok=True)
            with open(SCHEDULER_LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        except Exception as e:
            self.logger.error(f"Napaka pri logiranju: {e}")

    # ==================== UPRAVLJANJE NALOG ====================
    
    def add_task(self, task: ScheduledTask) -> bool:
        """Dodaj novo načrtovano nalogo"""
        try:
            if not task.created_at:
                task.created_at = datetime.now().isoformat()
                
            # Izračunaj naslednji zagon
            self._calculate_next_run(task)
            
            self.tasks[task.id] = task
            self.save_configuration()
            
            self.log_scheduler_event("task_added", {
                "task_id": task.id, 
                "name": task.name,
                "next_run": task.next_run
            })
            return True
        except Exception as e:
            self.logger.error(f"Napaka pri dodajanju naloge: {e}")
            return False

    def remove_task(self, task_id: str) -> bool:
        """Odstrani načrtovano nalogo"""
        try:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                del self.tasks[task_id]
                self.save_configuration()
                
                self.log_scheduler_event("task_removed", {
                    "task_id": task_id, 
                    "name": task.name
                })
                return True
            return False
        except Exception as e:
            self.logger.error(f"Napaka pri odstranjevanju naloge: {e}")
            return False

    def toggle_task(self, task_id: str) -> bool:
        """Vklopi/izklopi načrtovano nalogo"""
        try:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                task.enabled = not task.enabled
                
                if task.enabled:
                    self._calculate_next_run(task)
                else:
                    task.next_run = None
                    
                self.save_configuration()
                
                self.log_scheduler_event("task_toggled", {
                    "task_id": task_id, 
                    "enabled": task.enabled
                })
                return True
            return False
        except Exception as e:
            self.logger.error(f"Napaka pri preklapljanju naloge: {e}")
            return False

    # ==================== IZRAČUN ČASOV ====================
    
    def _calculate_next_run(self, task: ScheduledTask):
        """Izračunaj naslednji čas zagona naloge"""
        try:
            now = datetime.now()
            
            if task.schedule_type == ScheduleType.CRON:
                cron_expr = task.schedule_config.get('cron_expression')
                if cron_expr:
                    cron = croniter.croniter(cron_expr, now)
                    task.next_run = cron.get_next(datetime).isoformat()
                    
            elif task.schedule_type == ScheduleType.INTERVAL:
                minutes = task.schedule_config.get('minutes', 60)
                next_time = now + timedelta(minutes=minutes)
                task.next_run = next_time.isoformat()
                
            elif task.schedule_type == ScheduleType.ONCE:
                scheduled_time = task.schedule_config.get('datetime')
                if scheduled_time:
                    scheduled_dt = datetime.fromisoformat(scheduled_time)
                    if scheduled_dt > now:
                        task.next_run = scheduled_dt.isoformat()
                    else:
                        task.next_run = None  # Že preteklo
                        
            elif task.schedule_type == ScheduleType.DAILY:
                time_str = task.schedule_config.get('time', '00:00')
                hour, minute = map(int, time_str.split(':'))
                
                next_time = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if next_time <= now:
                    next_time += timedelta(days=1)
                    
                task.next_run = next_time.isoformat()
                
            elif task.schedule_type == ScheduleType.WEEKLY:
                day_name = task.schedule_config.get('day', 'monday').lower()
                time_str = task.schedule_config.get('time', '00:00')
                
                days = {
                    'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
                    'friday': 4, 'saturday': 5, 'sunday': 6
                }
                
                target_day = days.get(day_name, 0)
                hour, minute = map(int, time_str.split(':'))
                
                days_ahead = target_day - now.weekday()
                if days_ahead <= 0:  # Cilj je že bil ta teden
                    days_ahead += 7
                    
                next_time = now + timedelta(days=days_ahead)
                next_time = next_time.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                task.next_run = next_time.isoformat()
                
        except Exception as e:
            self.logger.error(f"Napaka pri izračunu naslednjega zagona: {e}")
            task.next_run = None

    # ==================== SCHEDULER ZANKA ====================
    
    def start(self):
        """Zaženi scheduler"""
        if not self.running:
            self.running = True
            self.scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
            self.scheduler_thread.start()
            self.logger.info("IoT Scheduler zagnan")

    def stop(self):
        """Ustavi scheduler"""
        self.running = False
        if self.scheduler_thread:
            self.scheduler_thread.join()
        self.logger.info("IoT Scheduler ustavljen")

    def _scheduler_loop(self):
        """Glavna zanka schedulerja"""
        while self.running:
            try:
                now = datetime.now()
                
                for task in list(self.tasks.values()):
                    if self._should_run_task(task, now):
                        self._execute_task(task)
                        
                time.sleep(1)  # Preveri vsako sekundo
                
            except Exception as e:
                self.logger.error(f"Napaka v scheduler zanki: {e}")

    def _should_run_task(self, task: ScheduledTask, now: datetime) -> bool:
        """Preveri, ali naj se naloga izvršuje"""
        if not task.enabled or not task.next_run:
            return False
            
        # Preveri, ali je čas za zagon
        next_run_dt = datetime.fromisoformat(task.next_run)
        if now < next_run_dt:
            return False
            
        # Preveri maksimalno število zagonov
        if task.max_runs and task.run_count >= task.max_runs:
            task.enabled = False
            self.save_configuration()
            return False
            
        return True

    def _execute_task(self, task: ScheduledTask):
        """Izvršuj načrtovano nalogo"""
        try:
            self.logger.info(f"Izvršujem nalogo: {task.name}")
            
            # Izvršuj akcijo
            result = self._execute_action(task.action)
            
            # Posodobi statistike
            task.last_run = datetime.now().isoformat()
            task.run_count += 1
            
            # Izračunaj naslednji zagon (razen za enkratne naloge)
            if task.schedule_type != ScheduleType.ONCE:
                self._calculate_next_run(task)
            else:
                task.enabled = False  # Enkratne naloge se onemogočijo
                
            self.save_configuration()
            
            self.log_scheduler_event("task_executed", {
                "task_id": task.id,
                "name": task.name,
                "result": result,
                "run_count": task.run_count,
                "next_run": task.next_run
            })
            
        except Exception as e:
            self.logger.error(f"Napaka pri izvršitvi naloge {task.id}: {e}")
            self.log_scheduler_event("task_error", {
                "task_id": task.id,
                "error": str(e)
            })

    def _execute_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Izvršuj akcijo naloge"""
        try:
            action_type = action.get('type')
            
            if action_type == 'device_control':
                device = action.get('device')
                command = action.get('command')
                
                if self.iot_secure:
                    if command == 'on':
                        result = self.iot_secure.turn_on(device)
                    elif command == 'off':
                        result = self.iot_secure.turn_off(device)
                    elif command == 'restart':
                        result = self.iot_secure.restart(device)
                    else:
                        result = f"Neznana komanda: {command}"
                else:
                    result = "IoT Secure modul ni na voljo"
                    
                return {"type": "device_control", "device": device, "command": command, "result": result}
                
            elif action_type == 'scene_activation':
                scene_id = action.get('scene_id')
                
                if self.automation_engine:
                    result = self.automation_engine.activate_scene(scene_id)
                else:
                    result = {"error": "Automation engine ni na voljo"}
                    
                return {"type": "scene_activation", "scene_id": scene_id, "result": result}
                
            elif action_type == 'group_control':
                group_id = action.get('group_id')
                command = action.get('command')
                
                if self.automation_engine:
                    result = self.automation_engine.control_device_group(group_id, command)
                else:
                    result = {"error": "Automation engine ni na voljo"}
                    
                return {"type": "group_control", "group_id": group_id, "command": command, "result": result}
                
            elif action_type == 'custom_script':
                script_path = action.get('script_path')
                # Tu bi lahko izvršili custom skripto
                return {"type": "custom_script", "script_path": script_path, "result": "Ni implementirano"}
                
            else:
                return {"type": "unknown", "error": f"Neznana vrsta akcije: {action_type}"}
                
        except Exception as e:
            self.logger.error(f"Napaka pri izvršitvi akcije: {e}")
            return {"type": "error", "error": str(e)}

    # ==================== POROČILA IN STATUS ====================
    
    def get_scheduler_status(self) -> Dict[str, Any]:
        """Pridobi status schedulerja"""
        now = datetime.now()
        
        active_tasks = [t for t in self.tasks.values() if t.enabled]
        upcoming_tasks = []
        
        for task in active_tasks:
            if task.next_run:
                next_run_dt = datetime.fromisoformat(task.next_run)
                time_until = next_run_dt - now
                upcoming_tasks.append({
                    "task_id": task.id,
                    "name": task.name,
                    "next_run": task.next_run,
                    "time_until_seconds": int(time_until.total_seconds())
                })
        
        # Sortiraj po času naslednjega zagona
        upcoming_tasks.sort(key=lambda x: x['time_until_seconds'])
        
        return {
            "scheduler_running": self.running,
            "total_tasks": len(self.tasks),
            "active_tasks": len(active_tasks),
            "disabled_tasks": len(self.tasks) - len(active_tasks),
            "upcoming_tasks": upcoming_tasks[:10],  # Prikaži samo naslednjih 10
            "total_executions": sum(t.run_count for t in self.tasks.values())
        }

    def get_task_history(self, task_id: str = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Pridobi zgodovino izvršitev nalog"""
        try:
            history = []
            
            if os.path.exists(SCHEDULER_LOG_FILE):
                with open(SCHEDULER_LOG_FILE, 'r', encoding='utf-8') as f:
                    for line in f:
                        try:
                            entry = json.loads(line.strip())
                            if task_id is None or entry.get('details', {}).get('task_id') == task_id:
                                history.append(entry)
                        except json.JSONDecodeError:
                            continue
            
            # Sortiraj po času (najnovejši prvi)
            history.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return history[:limit]
            
        except Exception as e:
            self.logger.error(f"Napaka pri pridobivanju zgodovine: {e}")
            return []

# Glavna instanca schedulerja
scheduler_instance = None

def __name__():
    return "iot_scheduler"

def initialize_scheduler(iot_secure_module=None, automation_engine=None):
    """Inicializiraj scheduler"""
    global scheduler_instance
    if scheduler_instance is None:
        scheduler_instance = IoTScheduler(iot_secure_module, automation_engine)
    return scheduler_instance

# Javne funkcije za uporabo v Omni
def add_scheduled_task(task_data: Dict[str, Any]) -> bool:
    """Dodaj načrtovano nalogo"""
    if scheduler_instance is None:
        return False
    
    task = ScheduledTask(**task_data)
    return scheduler_instance.add_task(task)

def remove_scheduled_task(task_id: str) -> bool:
    """Odstrani načrtovano nalogo"""
    if scheduler_instance is None:
        return False
    
    return scheduler_instance.remove_task(task_id)

def get_scheduler_status() -> Dict[str, Any]:
    """Pridobi status schedulerja"""
    if scheduler_instance is None:
        return {"error": "Scheduler ni inicializiran"}
    
    return scheduler_instance.get_scheduler_status()

def get_task_history(task_id: str = None) -> List[Dict[str, Any]]:
    """Pridobi zgodovino nalog"""
    if scheduler_instance is None:
        return []
    
    return scheduler_instance.get_task_history(task_id)

# Pomožne funkcije za ustvarjanje nalog
def create_daily_task(task_id: str, name: str, time: str, action: Dict[str, Any]) -> Dict[str, Any]:
    """Ustvari dnevno nalogo"""
    return {
        "id": task_id,
        "name": name,
        "description": f"Dnevna naloga ob {time}",
        "schedule_type": ScheduleType.DAILY.value,
        "schedule_config": {"time": time},
        "action": action
    }

def create_cron_task(task_id: str, name: str, cron_expr: str, action: Dict[str, Any]) -> Dict[str, Any]:
    """Ustvari cron nalogo"""
    return {
        "id": task_id,
        "name": name,
        "description": f"Cron naloga: {cron_expr}",
        "schedule_type": ScheduleType.CRON.value,
        "schedule_config": {"cron_expression": cron_expr},
        "action": action
    }

def create_interval_task(task_id: str, name: str, minutes: int, action: Dict[str, Any]) -> Dict[str, Any]:
    """Ustvari intervalno nalogo"""
    return {
        "id": task_id,
        "name": name,
        "description": f"Intervalna naloga vsakih {minutes} minut",
        "schedule_type": ScheduleType.INTERVAL.value,
        "schedule_config": {"minutes": minutes},
        "action": action
    }

# Globalni scheduler objekt
scheduler = IoTScheduler()