#!/usr/bin/env python3
"""
🚀 OMNI SINGLE ICON LAUNCHER
============================

ENOTNA IKONA ZA ZAGON VSEH FUNKCIJ
- Ena ikona za dostop do celotnega sistema
- Realni dashboard z vsemi moduli
- Avtomatski zagon vseh komponent
- Centralizirano upravljanje
- Sistemski pregled v realnem času

Avtor: Omni AI
Verzija: LAUNCHER 1.0 FINAL
"""

import os
import sys
import json
import sqlite3
import logging
import traceback
import subprocess
import threading
import time
import webbrowser
import socket
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import requests
from PIL import Image, ImageTk, ImageDraw
import psutil
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import numpy as np

class SystemMonitor:
    """
    📊 SISTEMSKI MONITOR
    Spremlja stanje vseh komponent
    """
    
    def __init__(self):
        self.components = {}
        self.metrics = {}
        self.alerts = []
        
        # Definiraj komponente
        self.setup_components()
    
    def setup_components(self):
        """Nastavi komponente za spremljanje"""
        self.components = {
            'omni_core': {
                'name': 'OMNI Core System',
                'type': 'core',
                'port': 8090,
                'process': None,
                'status': 'stopped',
                'health': 'unknown',
                'start_command': 'python omni_ultra_app.py',
                'health_endpoint': 'http://localhost:8090/health'
            },
            'omni_functional': {
                'name': 'Real Functional Modules',
                'type': 'functional',
                'port': None,
                'process': None,
                'status': 'stopped',
                'health': 'unknown',
                'start_command': 'python omni_real_functional_modules.py',
                'health_endpoint': None
            },
            'omni_redundancy': {
                'name': 'Triple Redundancy System',
                'type': 'redundancy',
                'port': None,
                'process': None,
                'status': 'stopped',
                'health': 'unknown',
                'start_command': 'python omni_triple_redundancy_system.py',
                'health_endpoint': None
            },
            'omni_healing': {
                'name': 'Auto Healing Engine',
                'type': 'healing',
                'port': None,
                'process': None,
                'status': 'stopped',
                'health': 'unknown',
                'start_command': 'python omni_auto_healing_engine.py',
                'health_endpoint': None
            },
            'omni_learning': {
                'name': 'Autonomous Learning System',
                'type': 'learning',
                'port': None,
                'process': None,
                'status': 'stopped',
                'health': 'unknown',
                'start_command': 'python omni_autonomous_learning_real.py',
                'health_endpoint': None
            },
            'omni_visual': {
                'name': 'Visual Connection Schema',
                'type': 'visual',
                'port': None,
                'process': None,
                'status': 'stopped',
                'health': 'unknown',
                'start_command': 'python omni_visual_connection_schema.py',
                'health_endpoint': None
            },
            'omni_interface': {
                'name': 'Unified Interface',
                'type': 'interface',
                'port': 8080,
                'process': None,
                'status': 'stopped',
                'health': 'unknown',
                'start_command': 'python -m http.server 8080 --directory omni',
                'health_endpoint': 'http://localhost:8080'
            },
            'iot_system': {
                'name': 'IoT Dashboard',
                'type': 'iot',
                'port': 5000,
                'process': None,
                'status': 'stopped',
                'health': 'unknown',
                'start_command': 'python start_iot_dashboard_simple.py',
                'health_endpoint': 'http://localhost:5000'
            }
        }
    
    def check_component_health(self, component_id: str) -> str:
        """Preveri zdravje komponente"""
        component = self.components.get(component_id)
        if not component:
            return 'unknown'
        
        try:
            # Preveri proces
            if component['process'] and component['process'].poll() is None:
                component['status'] = 'running'
                
                # Preveri HTTP endpoint če obstaja
                if component['health_endpoint']:
                    try:
                        response = requests.get(component['health_endpoint'], timeout=2)
                        if response.status_code == 200:
                            component['health'] = 'healthy'
                        else:
                            component['health'] = 'unhealthy'
                    except:
                        component['health'] = 'unreachable'
                else:
                    component['health'] = 'healthy'  # Predpostavimo, da je zdrav če teče
            else:
                component['status'] = 'stopped'
                component['health'] = 'stopped'
        
        except Exception as e:
            component['health'] = 'error'
            logging.error(f"❌ Napaka pri preverjanju {component_id}: {e}")
        
        return component['health']
    
    def get_system_metrics(self) -> Dict:
        """Pridobi sistemske metrike"""
        try:
            # CPU in pomnilnik
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Omrežje
            network = psutil.net_io_counters()
            
            # Procesi
            running_processes = len([p for p in psutil.process_iter() if p.is_running()])
            
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'cpu': {
                    'percent': cpu_percent,
                    'count': psutil.cpu_count()
                },
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': (disk.used / disk.total) * 100
                },
                'network': {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv
                },
                'processes': {
                    'running': running_processes
                }
            }
            
            self.metrics = metrics
            return metrics
        
        except Exception as e:
            logging.error(f"❌ Napaka pri pridobivanju metrik: {e}")
            return {}
    
    def start_component(self, component_id: str) -> bool:
        """Zaženi komponento"""
        component = self.components.get(component_id)
        if not component:
            return False
        
        try:
            # Preveri ali že teče
            if component['process'] and component['process'].poll() is None:
                logging.info(f"✅ Komponenta {component_id} že teče")
                return True
            
            # Zaženi proces
            logging.info(f"🚀 Zaganjam {component['name']}...")
            
            process = subprocess.Popen(
                component['start_command'].split(),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=os.getcwd()
            )
            
            component['process'] = process
            component['status'] = 'starting'
            
            # Počakaj malo in preveri
            time.sleep(2)
            
            if process.poll() is None:
                component['status'] = 'running'
                logging.info(f"✅ {component['name']} uspešno zagnan")
                return True
            else:
                component['status'] = 'failed'
                logging.error(f"❌ {component['name']} se ni zagnal")
                return False
        
        except Exception as e:
            logging.error(f"❌ Napaka pri zagonu {component_id}: {e}")
            component['status'] = 'error'
            return False
    
    def stop_component(self, component_id: str) -> bool:
        """Ustavi komponento"""
        component = self.components.get(component_id)
        if not component:
            return False
        
        try:
            if component['process']:
                component['process'].terminate()
                component['process'].wait(timeout=5)
                component['process'] = None
            
            component['status'] = 'stopped'
            component['health'] = 'stopped'
            
            logging.info(f"🛑 {component['name']} ustavljen")
            return True
        
        except Exception as e:
            logging.error(f"❌ Napaka pri ustavljanju {component_id}: {e}")
            return False
    
    def get_component_status(self, component_id: str) -> Dict:
        """Pridobi status komponente"""
        component = self.components.get(component_id, {})
        health = self.check_component_health(component_id)
        
        return {
            'name': component.get('name', 'Unknown'),
            'type': component.get('type', 'unknown'),
            'status': component.get('status', 'unknown'),
            'health': health,
            'port': component.get('port'),
            'endpoint': component.get('health_endpoint')
        }

class OmniLauncherGUI:
    """
    🖥️ OMNI LAUNCHER GUI
    Grafični vmesnik za upravljanje sistema
    """
    
    def __init__(self):
        self.root = tk.Tk()
        self.monitor = SystemMonitor()
        
        # Nastavitve okna
        self.setup_window()
        
        # Ustvari komponente
        self.create_widgets()
        
        # Zaženi monitoring
        self.start_monitoring()
    
    def setup_window(self):
        """Nastavi glavno okno"""
        self.root.title("🚀 OMNI ULTRA SYSTEM - Launcher & Dashboard")
        self.root.geometry("1200x800")
        self.root.configure(bg='#2C3E50')
        
        # Ikona
        self.create_system_icon()
        
        # Nastavi stil
        style = ttk.Style()
        style.theme_use('clam')
        
        # Prilagodi barve
        style.configure('Title.TLabel', 
                       background='#2C3E50', 
                       foreground='#ECF0F1', 
                       font=('Arial', 16, 'bold'))
        
        style.configure('Status.TLabel',
                       background='#34495E',
                       foreground='#ECF0F1',
                       font=('Arial', 10))
        
        style.configure('Success.TButton',
                       background='#27AE60',
                       foreground='white')
        
        style.configure('Danger.TButton',
                       background='#E74C3C',
                       foreground='white')
    
    def create_system_icon(self):
        """Ustvari sistemsko ikono"""
        try:
            # Ustvari preprosto ikono
            icon_size = 64
            icon = Image.new('RGBA', (icon_size, icon_size), (0, 0, 0, 0))
            draw = ImageDraw.Draw(icon)
            
            # Nariši krog
            draw.ellipse([4, 4, icon_size-4, icon_size-4], 
                        fill='#3498DB', outline='#2980B9', width=2)
            
            # Nariši "O" za OMNI
            draw.text((icon_size//2-10, icon_size//2-12), "O", 
                     fill='white', font_size=24)
            
            # Shrani ikono
            icon_path = "omni/data/omni_icon.png"
            Path("omni/data").mkdir(parents=True, exist_ok=True)
            icon.save(icon_path)
            
            # Nastavi kot ikono okna
            self.root.iconphoto(True, ImageTk.PhotoImage(icon))
        
        except Exception as e:
            logging.error(f"❌ Napaka pri ustvarjanju ikone: {e}")
    
    def create_widgets(self):
        """Ustvari GUI komponente"""
        # Glavni naslov
        title_frame = tk.Frame(self.root, bg='#2C3E50')
        title_frame.pack(fill='x', padx=10, pady=5)
        
        title_label = ttk.Label(title_frame, 
                               text="🚀 OMNI ULTRA SYSTEM", 
                               style='Title.TLabel')
        title_label.pack()
        
        subtitle_label = ttk.Label(title_frame,
                                  text="Univerzalni AI Sistem - Centralni Launcher",
                                  style='Status.TLabel')
        subtitle_label.pack()
        
        # Glavni container
        main_frame = tk.Frame(self.root, bg='#2C3E50')
        main_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        # Levi panel - komponente
        left_frame = tk.Frame(main_frame, bg='#34495E', relief='raised', bd=1)
        left_frame.pack(side='left', fill='both', expand=True, padx=(0, 5))
        
        # Desni panel - metrike
        right_frame = tk.Frame(main_frame, bg='#34495E', relief='raised', bd=1)
        right_frame.pack(side='right', fill='both', expand=True, padx=(5, 0))
        
        # Ustvari komponente
        self.create_components_panel(left_frame)
        self.create_metrics_panel(right_frame)
        self.create_control_panel()
    
    def create_components_panel(self, parent):
        """Ustvari panel komponent"""
        # Naslov
        comp_title = ttk.Label(parent, text="🔧 SISTEMSKE KOMPONENTE", style='Title.TLabel')
        comp_title.pack(pady=10)
        
        # Scrollable frame za komponente
        canvas = tk.Canvas(parent, bg='#34495E', highlightthickness=0)
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg='#34495E')
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True, padx=10)
        scrollbar.pack(side="right", fill="y")
        
        # Ustvari komponente
        self.component_widgets = {}
        
        for comp_id, component in self.monitor.components.items():
            comp_frame = self.create_component_widget(scrollable_frame, comp_id, component)
            comp_frame.pack(fill='x', padx=5, pady=2)
    
    def create_component_widget(self, parent, comp_id, component):
        """Ustvari widget za komponento"""
        # Glavni frame
        comp_frame = tk.Frame(parent, bg='#2C3E50', relief='raised', bd=1)
        
        # Naslov komponente
        title_frame = tk.Frame(comp_frame, bg='#2C3E50')
        title_frame.pack(fill='x', padx=5, pady=2)
        
        name_label = tk.Label(title_frame, 
                             text=component['name'], 
                             bg='#2C3E50', fg='#ECF0F1',
                             font=('Arial', 10, 'bold'))
        name_label.pack(side='left')
        
        # Status indikator
        status_label = tk.Label(title_frame,
                               text="●",
                               bg='#2C3E50', fg='#95A5A6',
                               font=('Arial', 12))
        status_label.pack(side='right')
        
        # Informacije
        info_frame = tk.Frame(comp_frame, bg='#2C3E50')
        info_frame.pack(fill='x', padx=5)
        
        type_label = tk.Label(info_frame,
                             text=f"Tip: {component['type']}",
                             bg='#2C3E50', fg='#BDC3C7',
                             font=('Arial', 8))
        type_label.pack(side='left')
        
        if component['port']:
            port_label = tk.Label(info_frame,
                                 text=f"Port: {component['port']}",
                                 bg='#2C3E50', fg='#BDC3C7',
                                 font=('Arial', 8))
            port_label.pack(side='right')
        
        # Gumbi
        button_frame = tk.Frame(comp_frame, bg='#2C3E50')
        button_frame.pack(fill='x', padx=5, pady=2)
        
        start_btn = tk.Button(button_frame,
                             text="▶ Start",
                             bg='#27AE60', fg='white',
                             font=('Arial', 8),
                             command=lambda: self.start_component(comp_id))
        start_btn.pack(side='left', padx=2)
        
        stop_btn = tk.Button(button_frame,
                            text="⏹ Stop",
                            bg='#E74C3C', fg='white',
                            font=('Arial', 8),
                            command=lambda: self.stop_component(comp_id))
        stop_btn.pack(side='left', padx=2)
        
        if component['health_endpoint']:
            open_btn = tk.Button(button_frame,
                               text="🌐 Open",
                               bg='#3498DB', fg='white',
                               font=('Arial', 8),
                               command=lambda: self.open_component(comp_id))
            open_btn.pack(side='right', padx=2)
        
        # Shrani reference
        self.component_widgets[comp_id] = {
            'frame': comp_frame,
            'status_label': status_label,
            'start_btn': start_btn,
            'stop_btn': stop_btn
        }
        
        return comp_frame
    
    def create_metrics_panel(self, parent):
        """Ustvari panel metrik"""
        # Naslov
        metrics_title = ttk.Label(parent, text="📊 SISTEMSKE METRIKE", style='Title.TLabel')
        metrics_title.pack(pady=10)
        
        # Notebook za različne poglede
        notebook = ttk.Notebook(parent)
        notebook.pack(fill='both', expand=True, padx=10, pady=5)
        
        # Tab za sistemske metrike
        system_frame = tk.Frame(notebook, bg='#34495E')
        notebook.add(system_frame, text="Sistem")
        
        # Tab za komponente
        components_frame = tk.Frame(notebook, bg='#34495E')
        notebook.add(components_frame, text="Komponente")
        
        # Tab za grafe
        charts_frame = tk.Frame(notebook, bg='#34495E')
        notebook.add(charts_frame, text="Grafi")
        
        # Ustvari vsebino
        self.create_system_metrics(system_frame)
        self.create_components_metrics(components_frame)
        self.create_charts(charts_frame)
    
    def create_system_metrics(self, parent):
        """Ustvari sistemske metrike"""
        # Scrollable text za metrike
        self.metrics_text = scrolledtext.ScrolledText(
            parent,
            bg='#2C3E50', fg='#ECF0F1',
            font=('Courier', 9),
            height=20
        )
        self.metrics_text.pack(fill='both', expand=True, padx=5, pady=5)
    
    def create_components_metrics(self, parent):
        """Ustvari metrike komponent"""
        # Treeview za komponente
        columns = ('Komponenta', 'Status', 'Zdravje', 'Port')
        self.components_tree = ttk.Treeview(parent, columns=columns, show='headings')
        
        for col in columns:
            self.components_tree.heading(col, text=col)
            self.components_tree.column(col, width=100)
        
        # Scrollbar
        tree_scroll = ttk.Scrollbar(parent, orient="vertical", command=self.components_tree.yview)
        self.components_tree.configure(yscrollcommand=tree_scroll.set)
        
        self.components_tree.pack(side='left', fill='both', expand=True, padx=5, pady=5)
        tree_scroll.pack(side='right', fill='y')
    
    def create_charts(self, parent):
        """Ustvari grafe"""
        # Matplotlib figure
        self.fig, ((self.ax1, self.ax2), (self.ax3, self.ax4)) = plt.subplots(2, 2, figsize=(8, 6))
        self.fig.patch.set_facecolor('#34495E')
        
        # Canvas
        self.chart_canvas = FigureCanvasTkAgg(self.fig, parent)
        self.chart_canvas.get_tk_widget().pack(fill='both', expand=True, padx=5, pady=5)
        
        # Inicializiraj grafe
        self.init_charts()
    
    def init_charts(self):
        """Inicializiraj grafe"""
        # CPU graf
        self.ax1.set_title('CPU Usage', color='white')
        self.ax1.set_facecolor('#2C3E50')
        
        # Memory graf
        self.ax2.set_title('Memory Usage', color='white')
        self.ax2.set_facecolor('#2C3E50')
        
        # Disk graf
        self.ax3.set_title('Disk Usage', color='white')
        self.ax3.set_facecolor('#2C3E50')
        
        # Components graf
        self.ax4.set_title('Components Status', color='white')
        self.ax4.set_facecolor('#2C3E50')
        
        # Nastavi barve
        for ax in [self.ax1, self.ax2, self.ax3, self.ax4]:
            ax.tick_params(colors='white')
            ax.spines['bottom'].set_color('white')
            ax.spines['top'].set_color('white')
            ax.spines['right'].set_color('white')
            ax.spines['left'].set_color('white')
    
    def create_control_panel(self):
        """Ustvari kontrolni panel"""
        control_frame = tk.Frame(self.root, bg='#2C3E50')
        control_frame.pack(fill='x', padx=10, pady=5)
        
        # Glavni gumbi
        start_all_btn = tk.Button(control_frame,
                                 text="🚀 ZAŽENI VSE",
                                 bg='#27AE60', fg='white',
                                 font=('Arial', 12, 'bold'),
                                 command=self.start_all_components)
        start_all_btn.pack(side='left', padx=5)
        
        stop_all_btn = tk.Button(control_frame,
                                text="🛑 USTAVI VSE",
                                bg='#E74C3C', fg='white',
                                font=('Arial', 12, 'bold'),
                                command=self.stop_all_components)
        stop_all_btn.pack(side='left', padx=5)
        
        dashboard_btn = tk.Button(control_frame,
                                 text="📊 DASHBOARD",
                                 bg='#3498DB', fg='white',
                                 font=('Arial', 12, 'bold'),
                                 command=self.open_dashboard)
        dashboard_btn.pack(side='left', padx=5)
        
        # Status
        self.status_label = tk.Label(control_frame,
                                    text="Sistem pripravljen",
                                    bg='#2C3E50', fg='#ECF0F1',
                                    font=('Arial', 10))
        self.status_label.pack(side='right', padx=5)
    
    def start_monitoring(self):
        """Zaženi monitoring"""
        self.update_display()
        self.root.after(5000, self.start_monitoring)  # Posodobi vsakih 5 sekund
    
    def update_display(self):
        """Posodobi prikaz"""
        try:
            # Posodobi metrike
            metrics = self.monitor.get_system_metrics()
            self.update_metrics_display(metrics)
            
            # Posodobi komponente
            self.update_components_display()
            
            # Posodobi grafe
            self.update_charts(metrics)
            
        except Exception as e:
            logging.error(f"❌ Napaka pri posodabljanju prikaza: {e}")
    
    def update_metrics_display(self, metrics):
        """Posodobi prikaz metrik"""
        if not metrics:
            return
        
        # Formatiran prikaz metrik
        metrics_text = f"""
SISTEMSKE METRIKE - {datetime.now().strftime('%H:%M:%S')}
{'='*50}

💻 CPU:
   Uporaba: {metrics['cpu']['percent']:.1f}%
   Jedra: {metrics['cpu']['count']}

🧠 POMNILNIK:
   Skupaj: {metrics['memory']['total'] / (1024**3):.1f} GB
   Uporabljeno: {metrics['memory']['used'] / (1024**3):.1f} GB ({metrics['memory']['percent']:.1f}%)
   Na voljo: {metrics['memory']['available'] / (1024**3):.1f} GB

💾 DISK:
   Skupaj: {metrics['disk']['total'] / (1024**3):.1f} GB
   Uporabljeno: {metrics['disk']['used'] / (1024**3):.1f} GB ({metrics['disk']['percent']:.1f}%)
   Prosto: {metrics['disk']['free'] / (1024**3):.1f} GB

🌐 OMREŽJE:
   Poslano: {metrics['network']['bytes_sent'] / (1024**2):.1f} MB
   Prejeto: {metrics['network']['bytes_recv'] / (1024**2):.1f} MB
   Paketi poslani: {metrics['network']['packets_sent']:,}
   Paketi prejeti: {metrics['network']['packets_recv']:,}

⚙️ PROCESI:
   Aktivni: {metrics['processes']['running']}
        """
        
        # Posodobi text widget
        self.metrics_text.delete(1.0, tk.END)
        self.metrics_text.insert(1.0, metrics_text)
    
    def update_components_display(self):
        """Posodobi prikaz komponent"""
        # Počisti treeview
        for item in self.components_tree.get_children():
            self.components_tree.delete(item)
        
        # Dodaj komponente
        for comp_id, component in self.monitor.components.items():
            status = self.monitor.get_component_status(comp_id)
            
            # Posodobi status indikator
            if comp_id in self.component_widgets:
                widget = self.component_widgets[comp_id]
                
                # Barva statusa
                if status['health'] == 'healthy':
                    color = '#27AE60'  # Zelena
                elif status['health'] == 'unhealthy':
                    color = '#F39C12'  # Oranžna
                elif status['health'] == 'stopped':
                    color = '#95A5A6'  # Siva
                else:
                    color = '#E74C3C'  # Rdeča
                
                widget['status_label'].config(fg=color)
            
            # Dodaj v treeview
            self.components_tree.insert('', 'end', values=(
                status['name'],
                status['status'],
                status['health'],
                status['port'] or 'N/A'
            ))
    
    def update_charts(self, metrics):
        """Posodobi grafe"""
        if not metrics:
            return
        
        try:
            # Počisti grafe
            self.ax1.clear()
            self.ax2.clear()
            self.ax3.clear()
            self.ax4.clear()
            
            # CPU graf
            self.ax1.pie([metrics['cpu']['percent'], 100 - metrics['cpu']['percent']], 
                        labels=['Used', 'Free'], 
                        colors=['#E74C3C', '#27AE60'],
                        autopct='%1.1f%%')
            self.ax1.set_title('CPU Usage', color='white')
            
            # Memory graf
            self.ax2.pie([metrics['memory']['percent'], 100 - metrics['memory']['percent']], 
                        labels=['Used', 'Free'], 
                        colors=['#3498DB', '#27AE60'],
                        autopct='%1.1f%%')
            self.ax2.set_title('Memory Usage', color='white')
            
            # Disk graf
            self.ax3.pie([metrics['disk']['percent'], 100 - metrics['disk']['percent']], 
                        labels=['Used', 'Free'], 
                        colors=['#F39C12', '#27AE60'],
                        autopct='%1.1f%%')
            self.ax3.set_title('Disk Usage', color='white')
            
            # Components status
            status_counts = {'running': 0, 'stopped': 0, 'error': 0}
            for comp_id in self.monitor.components:
                status = self.monitor.get_component_status(comp_id)
                if status['status'] in status_counts:
                    status_counts[status['status']] += 1
            
            if sum(status_counts.values()) > 0:
                self.ax4.pie(status_counts.values(), 
                            labels=status_counts.keys(),
                            colors=['#27AE60', '#95A5A6', '#E74C3C'],
                            autopct='%1.0f')
            self.ax4.set_title('Components Status', color='white')
            
            # Posodobi canvas
            self.chart_canvas.draw()
        
        except Exception as e:
            logging.error(f"❌ Napaka pri posodabljanju grafov: {e}")
    
    def start_component(self, comp_id):
        """Zaženi komponento"""
        self.status_label.config(text=f"Zaganjam {comp_id}...")
        success = self.monitor.start_component(comp_id)
        
        if success:
            self.status_label.config(text=f"✅ {comp_id} zagnan")
        else:
            self.status_label.config(text=f"❌ Napaka pri zagonu {comp_id}")
    
    def stop_component(self, comp_id):
        """Ustavi komponento"""
        self.status_label.config(text=f"Ustavljam {comp_id}...")
        success = self.monitor.stop_component(comp_id)
        
        if success:
            self.status_label.config(text=f"🛑 {comp_id} ustavljen")
        else:
            self.status_label.config(text=f"❌ Napaka pri ustavljanju {comp_id}")
    
    def open_component(self, comp_id):
        """Odpri komponento v brskalniku"""
        component = self.monitor.components.get(comp_id)
        if component and component['health_endpoint']:
            webbrowser.open(component['health_endpoint'])
            self.status_label.config(text=f"🌐 Odprt {comp_id}")
    
    def start_all_components(self):
        """Zaženi vse komponente"""
        self.status_label.config(text="🚀 Zaganjam vse komponente...")
        
        # Zaženi v ločeni niti
        def start_all():
            success_count = 0
            for comp_id in self.monitor.components:
                if self.monitor.start_component(comp_id):
                    success_count += 1
                time.sleep(1)  # Počakaj med zagoni
            
            self.root.after(0, lambda: self.status_label.config(
                text=f"✅ Zagnal {success_count}/{len(self.monitor.components)} komponent"
            ))
        
        threading.Thread(target=start_all, daemon=True).start()
    
    def stop_all_components(self):
        """Ustavi vse komponente"""
        self.status_label.config(text="🛑 Ustavljam vse komponente...")
        
        success_count = 0
        for comp_id in self.monitor.components:
            if self.monitor.stop_component(comp_id):
                success_count += 1
        
        self.status_label.config(text=f"🛑 Ustavil {success_count}/{len(self.monitor.components)} komponent")
    
    def open_dashboard(self):
        """Odpri glavni dashboard"""
        # Poskusi odpreti različne dashboarde
        dashboards = [
            'http://localhost:8090/omni_unified_interface.html',
            'http://localhost:8080/omni_unified_interface.html',
            'http://localhost:5000'
        ]
        
        for dashboard in dashboards:
            try:
                response = requests.get(dashboard, timeout=2)
                if response.status_code == 200:
                    webbrowser.open(dashboard)
                    self.status_label.config(text=f"📊 Dashboard odprt: {dashboard}")
                    return
            except:
                continue
        
        self.status_label.config(text="❌ Dashboard ni na voljo")
    
    def run(self):
        """Zaženi GUI"""
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            self.stop_all_components()
            self.root.quit()

# Glavna funkcija
def main():
    """Glavna funkcija"""
    print("🚀 OMNI SINGLE ICON LAUNCHER - ZAGON")
    print("=" * 50)
    
    # Nastavi logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('omni/logs/launcher.log'),
            logging.StreamHandler()
        ]
    )
    
    # Ustvari potrebne direktorije
    Path("omni/logs").mkdir(parents=True, exist_ok=True)
    Path("omni/data").mkdir(parents=True, exist_ok=True)
    
    try:
        # Zaženi GUI
        launcher = OmniLauncherGUI()
        
        print("🖥️ GUI launcher zagnan")
        print("✅ Sistem pripravljen za uporabo")
        print("\n📋 Navodila:")
        print("  • Kliknite '🚀 ZAŽENI VSE' za zagon vseh komponent")
        print("  • Uporabite posamezne gumbе za upravljanje komponent")
        print("  • Kliknite '📊 DASHBOARD' za odprtje glavnega dashboarda")
        print("  • Spremljajte metrike v realnem času")
        
        launcher.run()
    
    except Exception as e:
        logging.error(f"❌ Napaka pri zagonu: {e}")
        print(f"❌ Napaka: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main()