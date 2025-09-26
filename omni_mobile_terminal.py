#!/usr/bin/env python3
"""
Omni Mobile Terminal - Mobilni uporabniški vmesnik
Real-time povezava z Omni Brain sistemom za upravljanje in nadzor
"""

import asyncio
import json
import logging
import websockets
import threading
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import queue
import requests
from pathlib import Path

logger = logging.getLogger('OmniMobileTerminal')

class CommandType(Enum):
    SYSTEM_STATUS = "system_status"
    MODULE_CONTROL = "module_control"
    DATA_QUERY = "data_query"
    TASK_MANAGEMENT = "task_management"
    ANALYTICS = "analytics"
    EMERGENCY_STOP = "emergency_stop"
    HEALTH_CHECK = "health_check"
    CONFIGURATION = "configuration"

class MessageType(Enum):
    COMMAND = "command"
    RESPONSE = "response"
    NOTIFICATION = "notification"
    ERROR = "error"
    STATUS_UPDATE = "status_update"

@dataclass
class TerminalMessage:
    type: MessageType
    command_type: Optional[CommandType]
    data: Any
    timestamp: datetime
    user_id: str
    session_id: str
    priority: str = "normal"

class OmniMobileTerminal:
    """Mobilni terminal za upravljanje Omni Brain sistema"""
    
    def __init__(self, brain_host="localhost", brain_port=8888, user_id="admin"):
        self.brain_host = brain_host
        self.brain_port = brain_port
        self.user_id = user_id
        self.session_id = f"terminal_{int(time.time())}"
        
        # WebSocket povezava
        self.websocket = None
        self.is_connected = False
        self.connection_thread = None
        
        # GUI komponente
        self.root = None
        self.command_entry = None
        self.output_text = None
        self.status_label = None
        self.module_frame = None
        
        # Sporočilna vrsta
        self.message_queue = queue.Queue()
        self.response_queue = queue.Queue()
        
        # Stanje sistema
        self.system_status = {}
        self.module_status = {}
        self.active_tasks = []
        
        # Preddefinirani ukazi
        self.commands = {
            "status": self._cmd_system_status,
            "modules": self._cmd_list_modules,
            "tasks": self._cmd_list_tasks,
            "analytics": self._cmd_show_analytics,
            "help": self._cmd_help,
            "clear": self._cmd_clear,
            "connect": self._cmd_connect,
            "disconnect": self._cmd_disconnect,
            "emergency": self._cmd_emergency_stop,
            "health": self._cmd_health_check,
            "backup": self._cmd_create_backup,
            "restore": self._cmd_restore_backup
        }
        
    def initialize_gui(self):
        """Inicializacija grafičnega vmesnika"""
        self.root = tk.Tk()
        self.root.title("Omni Mobile Terminal")
        self.root.geometry("1200x800")
        self.root.configure(bg='#1e1e1e')
        
        # Stil
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('Dark.TFrame', background='#1e1e1e')
        style.configure('Dark.TLabel', background='#1e1e1e', foreground='#ffffff')
        style.configure('Dark.TButton', background='#333333', foreground='#ffffff')
        
        self._create_main_layout()
        self._create_status_bar()
        self._create_module_panel()
        
        # Zagon sporočilnega procesa
        self.root.after(100, self._process_messages)
        
    def _create_main_layout(self):
        """Ustvari glavni layout"""
        # Glavni okvir
        main_frame = ttk.Frame(self.root, style='Dark.TFrame')
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Naslovni panel
        title_frame = ttk.Frame(main_frame, style='Dark.TFrame')
        title_frame.pack(fill=tk.X, pady=(0, 10))
        
        title_label = ttk.Label(title_frame, text="🧠 OMNI MOBILE TERMINAL", 
                               font=('Consolas', 16, 'bold'), style='Dark.TLabel')
        title_label.pack(side=tk.LEFT)
        
        # Gumbi za povezavo
        connect_btn = ttk.Button(title_frame, text="🔗 Poveži", 
                                command=self._gui_connect, style='Dark.TButton')
        connect_btn.pack(side=tk.RIGHT, padx=(5, 0))
        
        disconnect_btn = ttk.Button(title_frame, text="🔌 Prekini", 
                                   command=self._gui_disconnect, style='Dark.TButton')
        disconnect_btn.pack(side=tk.RIGHT)
        
        # Izhodna konzola
        console_frame = ttk.Frame(main_frame, style='Dark.TFrame')
        console_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        console_label = ttk.Label(console_frame, text="Konzola:", style='Dark.TLabel')
        console_label.pack(anchor=tk.W)
        
        self.output_text = scrolledtext.ScrolledText(
            console_frame, 
            height=20, 
            bg='#000000', 
            fg='#00ff00', 
            font=('Consolas', 10),
            insertbackground='#00ff00'
        )
        self.output_text.pack(fill=tk.BOTH, expand=True)
        
        # Vnosno polje za ukaze
        command_frame = ttk.Frame(main_frame, style='Dark.TFrame')
        command_frame.pack(fill=tk.X, pady=(0, 10))
        
        command_label = ttk.Label(command_frame, text="Ukaz:", style='Dark.TLabel')
        command_label.pack(anchor=tk.W)
        
        self.command_entry = tk.Entry(
            command_frame, 
            bg='#333333', 
            fg='#ffffff', 
            font=('Consolas', 10),
            insertbackground='#ffffff'
        )
        self.command_entry.pack(fill=tk.X, pady=(5, 0))
        self.command_entry.bind('<Return>', self._execute_command)
        
        # Gumbi za hitre ukaze
        quick_frame = ttk.Frame(main_frame, style='Dark.TFrame')
        quick_frame.pack(fill=tk.X)
        
        quick_commands = [
            ("📊 Status", "status"),
            ("🔧 Moduli", "modules"),
            ("📋 Naloge", "tasks"),
            ("📈 Analitika", "analytics"),
            ("🆘 Nujna zaustavitev", "emergency")
        ]
        
        for text, cmd in quick_commands:
            btn = ttk.Button(quick_frame, text=text, 
                           command=lambda c=cmd: self._execute_quick_command(c),
                           style='Dark.TButton')
            btn.pack(side=tk.LEFT, padx=(0, 5))
    
    def _create_status_bar(self):
        """Ustvari statusno vrstico"""
        status_frame = ttk.Frame(self.root, style='Dark.TFrame')
        status_frame.pack(fill=tk.X, side=tk.BOTTOM)
        
        self.status_label = ttk.Label(status_frame, text="🔴 Nepovezan", style='Dark.TLabel')
        self.status_label.pack(side=tk.LEFT, padx=10, pady=5)
        
        time_label = ttk.Label(status_frame, text="", style='Dark.TLabel')
        time_label.pack(side=tk.RIGHT, padx=10, pady=5)
        
        def update_time():
            time_label.config(text=datetime.now().strftime("%H:%M:%S"))
            self.root.after(1000, update_time)
        
        update_time()
    
    def _create_module_panel(self):
        """Ustvari panel za module"""
        # To bo dodano v desni panel
        pass
    
    def _process_messages(self):
        """Procesiranje sporočil iz vrste"""
        try:
            while not self.message_queue.empty():
                message = self.message_queue.get_nowait()
                self._display_message(message)
        except queue.Empty:
            pass
        finally:
            self.root.after(100, self._process_messages)
    
    def _display_message(self, message: str):
        """Prikaži sporočilo v konzoli"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        formatted_message = f"[{timestamp}] {message}\n"
        
        self.output_text.insert(tk.END, formatted_message)
        self.output_text.see(tk.END)
    
    def _execute_command(self, event=None):
        """Izvršitev ukaza iz vnosnega polja"""
        command = self.command_entry.get().strip()
        if command:
            self.command_entry.delete(0, tk.END)
            self._process_command(command)
    
    def _execute_quick_command(self, command: str):
        """Izvršitev hitrega ukaza"""
        self._process_command(command)
    
    def _process_command(self, command: str):
        """Procesiranje ukaza"""
        self._display_message(f"💻 > {command}")
        
        parts = command.split()
        cmd_name = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []
        
        if cmd_name in self.commands:
            try:
                result = self.commands[cmd_name](args)
                if result:
                    self._display_message(f"✅ {result}")
            except Exception as e:
                self._display_message(f"❌ Napaka: {e}")
        else:
            # Pošlji ukaz na Omni Brain
            if self.is_connected:
                asyncio.create_task(self._send_command_to_brain(command, args))
            else:
                self._display_message("❌ Ni povezave z Omni Brain")
    
    # Preddefinirani ukazi
    def _cmd_system_status(self, args):
        """Prikaži status sistema"""
        if self.is_connected:
            asyncio.create_task(self._request_system_status())
            return "Zahtevam status sistema..."
        else:
            return "Ni povezave z Omni Brain"
    
    def _cmd_list_modules(self, args):
        """Seznam modulov"""
        if self.module_status:
            result = "📋 Aktivni moduli:\n"
            for module, status in self.module_status.items():
                status_icon = "🟢" if status.get("active", False) else "🔴"
                result += f"  {status_icon} {module}: {status.get('status', 'Unknown')}\n"
            return result
        else:
            return "Ni podatkov o modulih"
    
    def _cmd_list_tasks(self, args):
        """Seznam nalog"""
        if self.active_tasks:
            result = "📋 Aktivne naloge:\n"
            for task in self.active_tasks:
                result += f"  • {task.get('title', 'Unknown')}: {task.get('status', 'Unknown')}\n"
            return result
        else:
            return "Ni aktivnih nalog"
    
    def _cmd_show_analytics(self, args):
        """Prikaži analitiko"""
        if self.is_connected:
            asyncio.create_task(self._request_analytics())
            return "Zahtevam analitične podatke..."
        else:
            return "Ni povezave z Omni Brain"
    
    def _cmd_help(self, args):
        """Pomoč"""
        help_text = """
🆘 OMNI TERMINAL - POMOČ

Osnovni ukazi:
  status      - Status sistema
  modules     - Seznam modulov
  tasks       - Seznam nalog
  analytics   - Analitični podatki
  health      - Preverjanje zdravja
  connect     - Poveži z Omni Brain
  disconnect  - Prekini povezavo
  emergency   - Nujna zaustavitev
  backup      - Ustvari varnostno kopijo
  restore     - Obnovi iz varnostne kopije
  clear       - Počisti konzolo
  help        - Ta pomoč

Napredni ukazi:
  module <ime> start/stop/restart - Upravljanje modulov
  task create <opis>             - Ustvari nalogo
  query <kategorija>             - Poizvedba podatkov
  config <parameter> <vrednost>  - Konfiguracija
        """
        return help_text
    
    def _cmd_clear(self, args):
        """Počisti konzolo"""
        self.output_text.delete(1.0, tk.END)
        return None
    
    def _cmd_connect(self, args):
        """Poveži z Omni Brain"""
        self._gui_connect()
        return None
    
    def _cmd_disconnect(self, args):
        """Prekini povezavo"""
        self._gui_disconnect()
        return None
    
    def _cmd_emergency_stop(self, args):
        """Nujna zaustavitev"""
        if self.is_connected:
            asyncio.create_task(self._send_emergency_stop())
            return "🆘 Poslana nujna zaustavitev!"
        else:
            return "Ni povezave z Omni Brain"
    
    def _cmd_health_check(self, args):
        """Preverjanje zdravja"""
        if self.is_connected:
            asyncio.create_task(self._request_health_check())
            return "Preverjam zdravje sistema..."
        else:
            return "Ni povezave z Omni Brain"
    
    def _cmd_create_backup(self, args):
        """Ustvari varnostno kopijo"""
        if self.is_connected:
            asyncio.create_task(self._request_backup())
            return "Ustvarjam varnostno kopijo..."
        else:
            return "Ni povezave z Omni Brain"
    
    def _cmd_restore_backup(self, args):
        """Obnovi iz varnostne kopije"""
        if args and self.is_connected:
            backup_file = args[0]
            asyncio.create_task(self._request_restore(backup_file))
            return f"Obnavljam iz {backup_file}..."
        else:
            return "Podaj ime datoteke ali ni povezave"
    
    # WebSocket komunikacija
    async def connect_to_brain(self):
        """Poveži z Omni Brain"""
        try:
            uri = f"ws://{self.brain_host}:{self.brain_port}/terminal"
            self.websocket = await websockets.connect(uri)
            self.is_connected = True
            
            # Pošlji pozdravno sporočilo
            hello_message = TerminalMessage(
                type=MessageType.COMMAND,
                command_type=CommandType.SYSTEM_STATUS,
                data={"action": "connect", "user_id": self.user_id},
                timestamp=datetime.now(),
                user_id=self.user_id,
                session_id=self.session_id
            )
            
            await self.websocket.send(json.dumps(asdict(hello_message), default=str))
            
            # Poslušaj sporočila
            async for message in self.websocket:
                await self._handle_brain_message(message)
                
        except Exception as e:
            self.is_connected = False
            self.message_queue.put(f"❌ Napaka pri povezavi: {e}")
    
    async def _handle_brain_message(self, message_str: str):
        """Obravnavaj sporočilo iz Omni Brain"""
        try:
            message_data = json.loads(message_str)
            message_type = MessageType(message_data.get("type", "response"))
            
            if message_type == MessageType.RESPONSE:
                self._handle_response(message_data)
            elif message_type == MessageType.NOTIFICATION:
                self._handle_notification(message_data)
            elif message_type == MessageType.STATUS_UPDATE:
                self._handle_status_update(message_data)
            elif message_type == MessageType.ERROR:
                self._handle_error(message_data)
                
        except Exception as e:
            self.message_queue.put(f"❌ Napaka pri obravnavi sporočila: {e}")
    
    def _handle_response(self, data: Dict[str, Any]):
        """Obravnavaj odgovor"""
        command_type = data.get("command_type")
        response_data = data.get("data", {})
        
        if command_type == "system_status":
            self.system_status = response_data
            self._display_system_status()
        elif command_type == "module_status":
            self.module_status = response_data
            self._display_module_status()
        elif command_type == "analytics":
            self._display_analytics(response_data)
        else:
            self.message_queue.put(f"📨 Odgovor: {response_data}")
    
    def _handle_notification(self, data: Dict[str, Any]):
        """Obravnavaj obvestilo"""
        message = data.get("message", "")
        priority = data.get("priority", "normal")
        
        icon = "🔔" if priority == "normal" else "⚠️" if priority == "warning" else "🚨"
        self.message_queue.put(f"{icon} {message}")
    
    def _handle_status_update(self, data: Dict[str, Any]):
        """Obravnavaj posodobitev statusa"""
        module = data.get("module")
        status = data.get("status")
        
        if module:
            self.module_status[module] = status
            self.message_queue.put(f"🔄 {module}: {status.get('status', 'Unknown')}")
    
    def _handle_error(self, data: Dict[str, Any]):
        """Obravnavaj napako"""
        error_message = data.get("message", "Neznana napaka")
        self.message_queue.put(f"❌ Napaka: {error_message}")
    
    def _display_system_status(self):
        """Prikaži status sistema"""
        if self.system_status:
            status_text = "📊 STATUS SISTEMA:\n"
            status_text += f"  🕐 Čas zagona: {self.system_status.get('uptime', 'N/A')}\n"
            status_text += f"  💾 Pomnilnik: {self.system_status.get('memory_usage', 'N/A')}\n"
            status_text += f"  🖥️ CPU: {self.system_status.get('cpu_usage', 'N/A')}\n"
            status_text += f"  🌐 Aktivne povezave: {self.system_status.get('active_connections', 0)}\n"
            self.message_queue.put(status_text)
    
    def _display_module_status(self):
        """Prikaži status modulov"""
        if self.module_status:
            status_text = "🔧 STATUS MODULOV:\n"
            for module, status in self.module_status.items():
                icon = "🟢" if status.get("active", False) else "🔴"
                status_text += f"  {icon} {module}: {status.get('status', 'Unknown')}\n"
            self.message_queue.put(status_text)
    
    def _display_analytics(self, analytics_data: Dict[str, Any]):
        """Prikaži analitične podatke"""
        analytics_text = "📈 ANALITIKA:\n"
        for key, value in analytics_data.items():
            analytics_text += f"  📊 {key}: {value}\n"
        self.message_queue.put(analytics_text)
    
    # GUI dogodki
    def _gui_connect(self):
        """GUI povezava"""
        if not self.is_connected:
            self.connection_thread = threading.Thread(
                target=lambda: asyncio.run(self.connect_to_brain()),
                daemon=True
            )
            self.connection_thread.start()
            self.status_label.config(text="🟡 Povezujem...")
            self.message_queue.put("🔗 Povezujem z Omni Brain...")
    
    def _gui_disconnect(self):
        """GUI prekinitev"""
        if self.is_connected and self.websocket:
            asyncio.create_task(self.websocket.close())
            self.is_connected = False
            self.status_label.config(text="🔴 Nepovezan")
            self.message_queue.put("🔌 Povezava prekinjena")
    
    # Zahteve za Omni Brain
    async def _send_command_to_brain(self, command: str, args: List[str]):
        """Pošlji ukaz na Omni Brain"""
        if self.websocket:
            message = TerminalMessage(
                type=MessageType.COMMAND,
                command_type=CommandType.SYSTEM_STATUS,  # Določi glede na ukaz
                data={"command": command, "args": args},
                timestamp=datetime.now(),
                user_id=self.user_id,
                session_id=self.session_id
            )
            
            await self.websocket.send(json.dumps(asdict(message), default=str))
    
    async def _request_system_status(self):
        """Zahtevaj status sistema"""
        await self._send_command_to_brain("system_status", [])
    
    async def _request_analytics(self):
        """Zahtevaj analitične podatke"""
        await self._send_command_to_brain("analytics", [])
    
    async def _send_emergency_stop(self):
        """Pošlji nujno zaustavitev"""
        await self._send_command_to_brain("emergency_stop", [])
    
    async def _request_health_check(self):
        """Zahtevaj preverjanje zdravja"""
        await self._send_command_to_brain("health_check", [])
    
    async def _request_backup(self):
        """Zahtevaj varnostno kopijo"""
        await self._send_command_to_brain("backup", [])
    
    async def _request_restore(self, backup_file: str):
        """Zahtevaj obnovitev"""
        await self._send_command_to_brain("restore", [backup_file])
    
    def run(self):
        """Zaženi mobilni terminal"""
        self.initialize_gui()
        self._display_message("🧠 Omni Mobile Terminal inicializiran")
        self._display_message("💡 Vtipkaj 'help' za pomoč")
        self._display_message("🔗 Klikni 'Poveži' za povezavo z Omni Brain")
        
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            self._display_message("👋 Zaustavlja terminal...")
        finally:
            if self.is_connected and self.websocket:
                asyncio.run(self.websocket.close())

# Test funkcija
def test_mobile_terminal():
    """Test mobilnega terminala"""
    terminal = OmniMobileTerminal()
    terminal.run()

if __name__ == "__main__":
    # Nastavi logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    test_mobile_terminal()