import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from omni_core_plugins import PluginBase

class Plugin(PluginBase):
    name = "task"
    description = "Upravljanje nalog"
    version = "1.0.0"
    author = "OmniCore"
    capabilities = ["task_management", "todo_list", "reminders"]

    def handle(self, query, context=None):
        """Obravnava zahteve za upravljanje nalog"""
        return f"[TaskManager] Naloga dodana: {query}"