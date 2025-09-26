import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from omni_core_plugins import PluginBase

class Plugin(PluginBase):
    name = "calendar"
    description = "Koledar in dogodki"
    version = "1.0.0"
    author = "OmniCore"
    capabilities = ["calendar_management", "events", "scheduling"]

    def handle(self, query, context=None):
        """Obravnava zahteve za koledar in dogodke"""
        return f"[Koledar] Dogodek ustvarjen: {query}"