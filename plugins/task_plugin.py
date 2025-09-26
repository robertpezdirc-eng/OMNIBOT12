# Task Management Plugin
import json
import os
from datetime import datetime
import sys
sys.path.append('..')

# Definiramo PluginBase lokalno za neodvisnost
class PluginBase:
    """Osnova za vse plugin-e"""
    name = "base"
    description = "Generic plugin"
    version = "1.0.0"
    author = "OmniCore"
    enabled = True
    capabilities = []
    dependencies = []
    
    def handle(self, query, context=None):
        raise NotImplementedError("Vsak plugin mora implementirati handle()")
    
    def can_handle(self, query):
        """Vrni oceno 0-1 kako dobro plugin lahko obravnava zahtevo"""
        return 0.0
    
    def get_help(self):
        """Vrni pomoč za plugin"""
        return f"Plugin {self.name}: {self.description}"
    
    def update_stats(self, success=True):
        """Posodobi statistike plugin-a"""
        pass
    
    def health_check(self):
        """Preveri zdravje plugin-a"""
        try:
            # Preveri dostopnost podatkovnih datotek
            tasks_accessible = os.path.exists(self.tasks_file)
            
            # Preveri velikost podatkov
            tasks_count = len(self.tasks)
            
            # Preveri status nalog
            completed_tasks = sum(1 for task in self.tasks if task.get('completed', False))
            pending_tasks = tasks_count - completed_tasks
            
            # Določi status
            if tasks_accessible:
                status = "healthy"
            else:
                status = "error"
            
            return {
                "status": status,
                "timestamp": datetime.now().timestamp(),
                "details": {
                    "tasks_accessible": tasks_accessible,
                    "total_tasks": tasks_count,
                    "completed_tasks": completed_tasks,
                    "pending_tasks": pending_tasks,
                    "tasks_file": self.tasks_file
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "timestamp": datetime.now().timestamp(),
                "error": str(e)
            }

class Plugin(PluginBase):
    name = "task"
    description = "Upravljanje nalog, dodajanje, brisanje, označevanje kot opravljeno"
    version = "1.0.0"
    author = "OmniCore"
    capabilities = ["task_management", "todo_list", "productivity"]
    
    def __init__(self):
        self.tasks_file = "data/tasks.json"
        self.ensure_data_dir()
        self.tasks = self.load_tasks()
    
    def can_handle(self, query):
        """Oceni kako dobro plugin lahko obravnava zahtevo"""
        query_lower = query.lower()
        keywords = ["naloga", "task", "todo", "dodaj", "opravljeno", "seznam", "nalog"]
        
        score = 0
        for keyword in keywords:
            if keyword in query_lower:
                score += 0.2
        
        return min(score, 1.0)
    
    def ensure_data_dir(self):
        """Ustvari data direktorij če ne obstaja"""
        os.makedirs("data", exist_ok=True)
    
    def load_tasks(self):
        """Naloži naloge iz datoteke"""
        if os.path.exists(self.tasks_file):
            try:
                with open(self.tasks_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def save_tasks(self):
        """Shrani naloge v datoteko"""
        with open(self.tasks_file, 'w', encoding='utf-8') as f:
            json.dump(self.tasks, f, ensure_ascii=False, indent=2)
    
    def handle(self, query, context=None):
        """Obravnava zahteve za naloge"""
        query_lower = query.lower()
        
        # Dodaj nalogo
        if any(word in query_lower for word in ['dodaj', 'ustvari', 'nova naloga', 'add task']):
            return self.add_task(query)
        
        # Prikaži naloge
        elif any(word in query_lower for word in ['prikaži', 'seznam', 'show tasks', 'list tasks']):
            return self.list_tasks()
        
        # Označi kot opravljeno
        elif any(word in query_lower for word in ['opravljeno', 'končano', 'complete', 'done']):
            return self.complete_task(query)
        
        # Izbriši nalogo
        elif any(word in query_lower for word in ['izbriši', 'odstrani', 'delete', 'remove']):
            return self.delete_task(query)
        
        else:
            return self.get_help()
    
    def add_task(self, query):
        """Dodaj novo nalogo"""
        # Izvleci naslov naloge iz zahteve
        task_title = query
        for prefix in ['dodaj nalogo:', 'dodaj naloga:', 'ustvari nalogo:', 'nova naloga:', 'add task:']:
            if prefix in query.lower():
                task_title = query[query.lower().find(prefix) + len(prefix):].strip()
                break
        
        if not task_title or task_title.lower() == query.lower():
            task_title = f"Nova naloga - {datetime.now().strftime('%H:%M')}"
        
        new_task = {
            "id": len(self.tasks) + 1,
            "title": task_title,
            "status": "pending",
            "created": datetime.now().isoformat(),
            "completed": None
        }
        
        self.tasks.append(new_task)
        self.save_tasks()
        
        return f"✅ Naloga dodana: '{task_title}' (ID: {new_task['id']})"
    
    def list_tasks(self):
        """Prikaži vse naloge"""
        if not self.tasks:
            return "📝 Trenutno ni nalog."
        
        result = "📋 **Seznam nalog:**\n"
        for task in self.tasks:
            status_icon = "✅" if task['status'] == 'completed' else "⏳"
            result += f"{status_icon} [{task['id']}] {task['title']}\n"
        
        return result
    
    def complete_task(self, query):
        """Označi nalogo kot opravljeno"""
        # Poskusi najti ID naloge
        words = query.split()
        task_id = None
        
        for word in words:
            if word.isdigit():
                task_id = int(word)
                break
        
        if task_id is None:
            return "❌ Prosim, navedite ID naloge (npr. 'opravljeno 1')"
        
        for task in self.tasks:
            if task['id'] == task_id:
                task['status'] = 'completed'
                task['completed'] = datetime.now().isoformat()
                self.save_tasks()
                return f"✅ Naloga '{task['title']}' označena kot opravljena!"
        
        return f"❌ Naloga z ID {task_id} ni najdena."
    
    def delete_task(self, query):
        """Izbriši nalogo"""
        words = query.split()
        task_id = None
        
        for word in words:
            if word.isdigit():
                task_id = int(word)
                break
        
        if task_id is None:
            return "❌ Prosim, navedite ID naloge (npr. 'izbriši 1')"
        
        for i, task in enumerate(self.tasks):
            if task['id'] == task_id:
                deleted_task = self.tasks.pop(i)
                self.save_tasks()
                return f"🗑️ Naloga '{deleted_task['title']}' izbrisana!"
        
        return f"❌ Naloga z ID {task_id} ni najdena."
    
    def get_info(self):
        """Vrni informacije o plugin-u"""
        return {
            "name": self.name,
            "version": getattr(self, 'version', '1.0.0'),
            "description": self.description,
            "author": getattr(self, 'author', 'OmniCore'),
            "capabilities": getattr(self, 'capabilities', [])
        }
    
    def get_help(self):
        """Pomoč za uporabo"""
        return """
📋 **Task Plugin - Pomoč:**
• `dodaj nalogo: [opis]` - Dodaj novo nalogo
• `prikaži naloge` - Prikaži vse naloge
• `opravljeno [ID]` - Označi nalogo kot opravljeno
• `izbriši [ID]` - Izbriši nalogo

**Primeri:**
- "dodaj nalogo: pripraviti poročilo"
- "prikaži naloge"
- "opravljeno 1"
- "izbriši 2"
        """
# Hot-reload test - 1758558414
