#!/usr/bin/env python3
"""
🎨 OMNI VISUAL CONNECTION SCHEMA GENERATOR
==========================================

VIZUALNA SHEMA POVEZAV
- Generira vizualne diagrame povezav med moduli
- Prikazuje odvisnosti in komunikacijske poti
- Ustvarja interaktivne sheme
- Analizira arhitekturo sistema
- Optimizira povezanost

Avtor: Omni AI
Verzija: VISUAL 1.0 FINAL
"""

import json
import sqlite3
import logging
import traceback
import networkx as nx
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, ConnectionPatch
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
import colorsys
import math
import os
import sys
import base64
from io import BytesIO
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import plotly.offline as pyo

class ModuleNode:
    """
    🔗 VOZLIŠČE MODULA
    Predstavlja posamezen modul v sistemu
    """
    
    def __init__(self, module_id: str, module_name: str, module_type: str, 
                 description: str = "", functions: List[str] = None):
        self.module_id = module_id
        self.module_name = module_name
        self.module_type = module_type  # 'core', 'functional', 'interface', 'data', 'learning'
        self.description = description
        self.functions = functions or []
        
        # Povezanosti
        self.connections = {}  # {target_module_id: connection_info}
        self.dependencies = set()  # Moduli, od katerih je odvisen
        self.dependents = set()   # Moduli, ki so odvisni od njega
        
        # Metrike
        self.usage_frequency = 0
        self.performance_score = 1.0
        self.reliability_score = 1.0
        self.complexity_score = 0.5
        
        # Vizualne lastnosti
        self.position = (0, 0)
        self.color = "#4A90E2"
        self.size = 50
        self.shape = "circle"
    
    def add_connection(self, target_module_id: str, connection_type: str, 
                      strength: float = 1.0, bidirectional: bool = False):
        """Dodaj povezavo z drugim modulom"""
        self.connections[target_module_id] = {
            'type': connection_type,  # 'data_flow', 'api_call', 'dependency', 'event'
            'strength': strength,     # 0.0 - 1.0
            'bidirectional': bidirectional,
            'created_at': datetime.now().isoformat()
        }
    
    def calculate_centrality(self, all_modules: Dict) -> float:
        """Izračunaj centralnost modula v omrežju"""
        # Število povezav
        connection_count = len(self.connections)
        
        # Število modulov, ki so odvisni od tega
        dependent_count = len(self.dependents)
        
        # Tehtana centralnost
        centrality = (connection_count * 0.6 + dependent_count * 0.4) / max(1, len(all_modules))
        
        return min(1.0, centrality)
    
    def get_visual_properties(self) -> Dict:
        """Pridobi vizualne lastnosti za prikaz"""
        # Določi barvo na podlagi tipa
        type_colors = {
            'core': '#FF6B6B',        # Rdeča
            'functional': '#4ECDC4',   # Turkizna
            'interface': '#45B7D1',    # Modra
            'data': '#96CEB4',         # Zelena
            'learning': '#FFEAA7',     # Rumena
            'integration': '#DDA0DD',  # Vijolična
            'monitoring': '#F39C12'    # Oranžna
        }
        
        self.color = type_colors.get(self.module_type, '#95A5A6')
        
        # Določi velikost na podlagi centralnosti in uporabe
        base_size = 30
        usage_factor = min(2.0, self.usage_frequency / 10)
        self.size = base_size + (usage_factor * 20)
        
        # Določi obliko na podlagi tipa
        type_shapes = {
            'core': 'diamond',
            'functional': 'circle',
            'interface': 'square',
            'data': 'triangle',
            'learning': 'hexagon',
            'integration': 'star',
            'monitoring': 'pentagon'
        }
        
        self.shape = type_shapes.get(self.module_type, 'circle')
        
        return {
            'color': self.color,
            'size': self.size,
            'shape': self.shape,
            'position': self.position
        }
    
    def to_dict(self) -> Dict:
        """Pretvori v slovar"""
        return {
            'module_id': self.module_id,
            'module_name': self.module_name,
            'module_type': self.module_type,
            'description': self.description,
            'functions': self.functions,
            'connections': self.connections,
            'dependencies': list(self.dependencies),
            'dependents': list(self.dependents),
            'usage_frequency': self.usage_frequency,
            'performance_score': self.performance_score,
            'reliability_score': self.reliability_score,
            'complexity_score': self.complexity_score,
            'visual_properties': self.get_visual_properties()
        }

class ConnectionEdge:
    """
    🔗 POVEZOVALNA ČRTA
    Predstavlja povezavo med moduli
    """
    
    def __init__(self, source_id: str, target_id: str, connection_type: str,
                 strength: float = 1.0, bidirectional: bool = False):
        self.source_id = source_id
        self.target_id = target_id
        self.connection_type = connection_type
        self.strength = strength
        self.bidirectional = bidirectional
        
        # Metrike
        self.usage_count = 0
        self.latency = 0.0  # ms
        self.error_rate = 0.0  # %
        self.throughput = 0.0  # req/s
        
        # Vizualne lastnosti
        self.color = self._get_connection_color()
        self.width = max(1, strength * 5)
        self.style = 'solid'
    
    def _get_connection_color(self) -> str:
        """Določi barvo povezave na podlagi tipa"""
        type_colors = {
            'data_flow': '#3498DB',      # Modra
            'api_call': '#E74C3C',       # Rdeča
            'dependency': '#F39C12',     # Oranžna
            'event': '#9B59B6',          # Vijolična
            'inheritance': '#2ECC71',    # Zelena
            'composition': '#E67E22',    # Temno oranžna
            'aggregation': '#1ABC9C'     # Turkizna
        }
        
        return type_colors.get(self.connection_type, '#95A5A6')
    
    def update_metrics(self, usage_count: int = None, latency: float = None,
                      error_rate: float = None, throughput: float = None):
        """Posodobi metrike povezave"""
        if usage_count is not None:
            self.usage_count = usage_count
        if latency is not None:
            self.latency = latency
        if error_rate is not None:
            self.error_rate = error_rate
        if throughput is not None:
            self.throughput = throughput
        
        # Posodobi vizualne lastnosti na podlagi metrik
        self._update_visual_properties()
    
    def _update_visual_properties(self):
        """Posodobi vizualne lastnosti na podlagi metrik"""
        # Širina na podlagi uporabe
        usage_factor = min(1.0, self.usage_count / 100)
        self.width = max(1, self.strength * 3 + usage_factor * 3)
        
        # Stil na podlagi napak
        if self.error_rate > 0.1:  # Več kot 10% napak
            self.style = 'dashed'
        elif self.error_rate > 0.05:  # Več kot 5% napak
            self.style = 'dotted'
        else:
            self.style = 'solid'
        
        # Barva na podlagi performans
        if self.latency > 1000:  # Več kot 1s
            self.color = '#E74C3C'  # Rdeča
        elif self.latency > 500:  # Več kot 0.5s
            self.color = '#F39C12'  # Oranžna
        else:
            self.color = self._get_connection_color()
    
    def to_dict(self) -> Dict:
        """Pretvori v slovar"""
        return {
            'source_id': self.source_id,
            'target_id': self.target_id,
            'connection_type': self.connection_type,
            'strength': self.strength,
            'bidirectional': self.bidirectional,
            'usage_count': self.usage_count,
            'latency': self.latency,
            'error_rate': self.error_rate,
            'throughput': self.throughput,
            'visual_properties': {
                'color': self.color,
                'width': self.width,
                'style': self.style
            }
        }

class VisualSchemaGenerator:
    """
    🎨 GENERATOR VIZUALNIH SHEM
    Ustvarja vizualne predstavitve sistema
    """
    
    def __init__(self):
        self.name = "Visual Schema Generator"
        self.version = "1.0"
        
        # Komponente
        self.modules = {}  # {module_id: ModuleNode}
        self.connections = {}  # {connection_id: ConnectionEdge}
        self.graph = nx.DiGraph()
        
        # Nastavitve vizualizacije
        self.layout_algorithms = {
            'spring': nx.spring_layout,
            'circular': nx.circular_layout,
            'shell': nx.shell_layout,
            'spectral': nx.spectral_layout,
            'kamada_kawai': nx.kamada_kawai_layout
        }
        
        self.color_schemes = {
            'default': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
            'professional': ['#2C3E50', '#3498DB', '#E74C3C', '#F39C12', '#27AE60'],
            'pastel': ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFDFBA'],
            'dark': ['#34495E', '#E74C3C', '#3498DB', '#F39C12', '#27AE60']
        }
        
        self.setup_omni_modules()
        
        logging.info("🎨 Visual Schema Generator inicializiran")
    
    def setup_omni_modules(self):
        """Nastavi OMNI module"""
        # Definiraj vse OMNI module
        omni_modules = [
            {
                'id': 'omni_core',
                'name': 'OMNI Core System',
                'type': 'core',
                'description': 'Glavno jedro sistema',
                'functions': ['system_coordination', 'resource_management', 'security']
            },
            {
                'id': 'omni_functional',
                'name': 'Real Functional Modules',
                'type': 'functional',
                'description': 'Realni funkcionalni moduli za vse sektorje',
                'functions': ['finance', 'healthcare', 'logistics', 'tourism', 'agriculture', 'energy']
            },
            {
                'id': 'omni_redundancy',
                'name': 'Triple Redundancy System',
                'type': 'integration',
                'description': 'Sistem trojne redundance z avtomatskim testiranjem',
                'functions': ['version_management', 'automated_testing', 'best_selection']
            },
            {
                'id': 'omni_healing',
                'name': 'Auto Healing Engine',
                'type': 'monitoring',
                'description': 'Sistem za avtomatsko popravljanje napak',
                'functions': ['error_detection', 'auto_diagnosis', 'self_repair']
            },
            {
                'id': 'omni_learning',
                'name': 'Autonomous Learning System',
                'type': 'learning',
                'description': 'Sistem avtonomnega učenja iz realnih podatkov',
                'functions': ['pattern_recognition', 'behavioral_analysis', 'predictive_modeling']
            },
            {
                'id': 'omni_interface',
                'name': 'Unified Interface',
                'type': 'interface',
                'description': 'Enotni uporabniški vmesnik',
                'functions': ['dashboard', 'api_gateway', 'user_management']
            },
            {
                'id': 'omni_data',
                'name': 'Knowledge Base',
                'type': 'data',
                'description': 'Celovita baza znanja',
                'functions': ['data_storage', 'knowledge_graph', 'search_engine']
            },
            {
                'id': 'omni_integrator',
                'name': 'Universal Integrator',
                'type': 'integration',
                'description': 'Univerzalni integrator za vse sisteme',
                'functions': ['api_integration', 'data_transformation', 'protocol_adaptation']
            }
        ]
        
        # Ustvari module
        for module_info in omni_modules:
            module = ModuleNode(
                module_info['id'],
                module_info['name'],
                module_info['type'],
                module_info['description'],
                module_info['functions']
            )
            
            self.modules[module_info['id']] = module
            self.graph.add_node(module_info['id'], **module.to_dict())
        
        # Definiraj povezave
        self.setup_omni_connections()
    
    def setup_omni_connections(self):
        """Nastavi povezave med OMNI moduli"""
        # Definiraj povezave
        connections = [
            # Core povezan z vsemi
            ('omni_core', 'omni_functional', 'api_call', 0.9, True),
            ('omni_core', 'omni_redundancy', 'dependency', 0.8, True),
            ('omni_core', 'omni_healing', 'dependency', 0.9, True),
            ('omni_core', 'omni_learning', 'data_flow', 0.7, True),
            ('omni_core', 'omni_interface', 'api_call', 0.9, True),
            ('omni_core', 'omni_data', 'data_flow', 0.8, True),
            ('omni_core', 'omni_integrator', 'api_call', 0.8, True),
            
            # Functional moduli
            ('omni_functional', 'omni_data', 'data_flow', 0.9, True),
            ('omni_functional', 'omni_learning', 'data_flow', 0.8, False),
            ('omni_functional', 'omni_interface', 'api_call', 0.7, False),
            
            # Redundancy sistem
            ('omni_redundancy', 'omni_functional', 'dependency', 0.9, False),
            ('omni_redundancy', 'omni_healing', 'event', 0.6, True),
            ('omni_redundancy', 'omni_learning', 'data_flow', 0.5, False),
            
            # Healing sistem
            ('omni_healing', 'omni_functional', 'dependency', 0.8, False),
            ('omni_healing', 'omni_learning', 'data_flow', 0.7, True),
            ('omni_healing', 'omni_data', 'data_flow', 0.6, False),
            
            # Learning sistem
            ('omni_learning', 'omni_data', 'data_flow', 0.9, True),
            ('omni_learning', 'omni_functional', 'data_flow', 0.8, False),
            ('omni_learning', 'omni_interface', 'api_call', 0.5, False),
            
            # Interface
            ('omni_interface', 'omni_functional', 'api_call', 0.9, False),
            ('omni_interface', 'omni_data', 'data_flow', 0.7, False),
            ('omni_interface', 'omni_learning', 'api_call', 0.6, False),
            
            # Integrator
            ('omni_integrator', 'omni_functional', 'api_call', 0.8, True),
            ('omni_integrator', 'omni_data', 'data_flow', 0.7, True),
            ('omni_integrator', 'omni_interface', 'api_call', 0.6, False)
        ]
        
        # Ustvari povezave
        for source, target, conn_type, strength, bidirectional in connections:
            self.add_connection(source, target, conn_type, strength, bidirectional)
    
    def add_module(self, module_id: str, module_name: str, module_type: str,
                   description: str = "", functions: List[str] = None) -> ModuleNode:
        """Dodaj nov modul"""
        module = ModuleNode(module_id, module_name, module_type, description, functions)
        self.modules[module_id] = module
        self.graph.add_node(module_id, **module.to_dict())
        
        logging.info(f"🔗 Dodan modul: {module_name}")
        
        return module
    
    def add_connection(self, source_id: str, target_id: str, connection_type: str,
                      strength: float = 1.0, bidirectional: bool = False) -> ConnectionEdge:
        """Dodaj povezavo med moduli"""
        if source_id not in self.modules or target_id not in self.modules:
            logging.error(f"❌ Modula {source_id} ali {target_id} ne obstaja")
            return None
        
        # Ustvari povezavo
        connection_id = f"{source_id}_{target_id}_{connection_type}"
        connection = ConnectionEdge(source_id, target_id, connection_type, strength, bidirectional)
        
        self.connections[connection_id] = connection
        
        # Posodobi module
        self.modules[source_id].add_connection(target_id, connection_type, strength, bidirectional)
        self.modules[source_id].dependents.add(target_id)
        self.modules[target_id].dependencies.add(source_id)
        
        # Posodobi graf
        self.graph.add_edge(source_id, target_id, **connection.to_dict())
        
        if bidirectional:
            # Dodaj tudi obratno povezavo
            reverse_connection_id = f"{target_id}_{source_id}_{connection_type}"
            reverse_connection = ConnectionEdge(target_id, source_id, connection_type, strength, True)
            self.connections[reverse_connection_id] = reverse_connection
            self.graph.add_edge(target_id, source_id, **reverse_connection.to_dict())
        
        logging.info(f"🔗 Dodana povezava: {source_id} -> {target_id} ({connection_type})")
        
        return connection
    
    def generate_network_diagram(self, layout: str = 'spring', color_scheme: str = 'default',
                                save_path: str = None) -> str:
        """Generiraj omrežni diagram"""
        try:
            # Nastavi layout
            if layout in self.layout_algorithms:
                pos = self.layout_algorithms[layout](self.graph, k=3, iterations=50)
            else:
                pos = nx.spring_layout(self.graph, k=3, iterations=50)
            
            # Posodobi pozicije modulov
            for module_id, position in pos.items():
                if module_id in self.modules:
                    self.modules[module_id].position = position
            
            # Ustvari matplotlib figure
            plt.figure(figsize=(16, 12))
            plt.title('OMNI ULTRA SYSTEM - Arhitekturna Shema', fontsize=20, fontweight='bold', pad=20)
            
            # Nariši povezave
            self._draw_connections(pos)
            
            # Nariši module
            self._draw_modules(pos, color_scheme)
            
            # Dodaj legendo
            self._add_legend()
            
            # Dodaj informacije
            self._add_info_panel()
            
            plt.axis('off')
            plt.tight_layout()
            
            # Shrani ali prikaži
            if save_path:
                plt.savefig(save_path, dpi=300, bbox_inches='tight', 
                           facecolor='white', edgecolor='none')
                logging.info(f"📊 Diagram shranjen: {save_path}")
                return save_path
            else:
                # Shrani v začasno datoteko
                temp_path = "omni/data/network_diagram.png"
                Path("omni/data").mkdir(parents=True, exist_ok=True)
                plt.savefig(temp_path, dpi=300, bbox_inches='tight',
                           facecolor='white', edgecolor='none')
                plt.close()
                return temp_path
        
        except Exception as e:
            logging.error(f"❌ Napaka pri generiranju diagrama: {e}")
            return None
    
    def _draw_connections(self, pos):
        """Nariši povezave"""
        for connection in self.connections.values():
            if connection.source_id in pos and connection.target_id in pos:
                source_pos = pos[connection.source_id]
                target_pos = pos[connection.target_id]
                
                # Nariši črto
                plt.plot([source_pos[0], target_pos[0]], 
                        [source_pos[1], target_pos[1]],
                        color=connection.color,
                        linewidth=connection.width,
                        linestyle=connection.style,
                        alpha=0.7,
                        zorder=1)
                
                # Dodaj puščico
                if not connection.bidirectional:
                    self._draw_arrow(source_pos, target_pos, connection.color)
    
    def _draw_arrow(self, source_pos, target_pos, color):
        """Nariši puščico"""
        # Izračunaj smer
        dx = target_pos[0] - source_pos[0]
        dy = target_pos[1] - source_pos[1]
        length = math.sqrt(dx**2 + dy**2)
        
        if length > 0:
            # Normaliziraj
            dx /= length
            dy /= length
            
            # Pozicija puščice (80% poti)
            arrow_x = source_pos[0] + dx * length * 0.8
            arrow_y = source_pos[1] + dy * length * 0.8
            
            # Nariši puščico
            plt.annotate('', xy=(target_pos[0], target_pos[1]), 
                        xytext=(arrow_x, arrow_y),
                        arrowprops=dict(arrowstyle='->', color=color, lw=2),
                        zorder=2)
    
    def _draw_modules(self, pos, color_scheme):
        """Nariši module"""
        colors = self.color_schemes.get(color_scheme, self.color_schemes['default'])
        
        for module_id, module in self.modules.items():
            if module_id in pos:
                position = pos[module_id]
                visual_props = module.get_visual_properties()
                
                # Nariši modul
                if module.shape == 'circle':
                    circle = plt.Circle(position, visual_props['size']/1000, 
                                      color=visual_props['color'], alpha=0.8, zorder=3)
                    plt.gca().add_patch(circle)
                elif module.shape == 'square':
                    square = plt.Rectangle((position[0] - visual_props['size']/2000, 
                                          position[1] - visual_props['size']/2000),
                                         visual_props['size']/1000, visual_props['size']/1000,
                                         color=visual_props['color'], alpha=0.8, zorder=3)
                    plt.gca().add_patch(square)
                elif module.shape == 'diamond':
                    # Diamond kot rotiran kvadrat
                    diamond = patches.RegularPolygon(position, 4, radius=visual_props['size']/1000,
                                                   orientation=math.pi/4,
                                                   color=visual_props['color'], alpha=0.8, zorder=3)
                    plt.gca().add_patch(diamond)
                
                # Dodaj besedilo
                plt.text(position[0], position[1] - visual_props['size']/800, 
                        module.module_name.replace(' ', '\n'), 
                        ha='center', va='top', fontsize=8, fontweight='bold',
                        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8),
                        zorder=4)
    
    def _add_legend(self):
        """Dodaj legendo"""
        # Legenda za tipe modulov
        legend_elements = []
        
        type_info = {
            'core': ('Core System', '#FF6B6B'),
            'functional': ('Functional Modules', '#4ECDC4'),
            'interface': ('User Interface', '#45B7D1'),
            'data': ('Data & Knowledge', '#96CEB4'),
            'learning': ('Learning System', '#FFEAA7'),
            'integration': ('Integration Layer', '#DDA0DD'),
            'monitoring': ('Monitoring & Healing', '#F39C12')
        }
        
        for module_type, (label, color) in type_info.items():
            legend_elements.append(plt.Line2D([0], [0], marker='o', color='w', 
                                            markerfacecolor=color, markersize=10, label=label))
        
        plt.legend(handles=legend_elements, loc='upper left', bbox_to_anchor=(0, 1))
    
    def _add_info_panel(self):
        """Dodaj informacijski panel"""
        info_text = f"""
OMNI ULTRA SYSTEM OVERVIEW
==========================
Moduli: {len(self.modules)}
Povezave: {len(self.connections)}
Generiran: {datetime.now().strftime('%Y-%m-%d %H:%M')}

LEGENDA POVEZAV:
• Modra: Data Flow
• Rdeča: API Call  
• Oranžna: Dependency
• Vijolična: Event
• Zelena: Inheritance
        """
        
        plt.text(0.02, 0.02, info_text, transform=plt.gca().transAxes,
                fontsize=9, verticalalignment='bottom',
                bbox=dict(boxstyle='round,pad=0.5', facecolor='lightgray', alpha=0.8))
    
    def generate_interactive_diagram(self, save_path: str = None) -> str:
        """Generiraj interaktivni diagram s Plotly"""
        try:
            # Pripravi podatke za Plotly
            node_trace, edge_trace = self._prepare_plotly_data()
            
            # Ustvari figure
            fig = go.Figure(data=[edge_trace, node_trace],
                           layout=go.Layout(
                               title=dict(
                                   text='OMNI ULTRA SYSTEM - Interaktivna Arhitekturna Shema',
                                   x=0.5,
                                   font=dict(size=20)
                               ),
                               titlefont_size=16,
                               showlegend=False,
                               hovermode='closest',
                               margin=dict(b=20,l=5,r=5,t=40),
                               annotations=[ dict(
                                   text="Interaktivni prikaz OMNI sistema - kliknite na module za podrobnosti",
                                   showarrow=False,
                                   xref="paper", yref="paper",
                                   x=0.005, y=-0.002,
                                   xanchor="left", yanchor="bottom",
                                   font=dict(color="#888", size=12)
                               )],
                               xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                               yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                               plot_bgcolor='white'
                           ))
            
            # Shrani ali prikaži
            if save_path:
                pyo.plot(fig, filename=save_path, auto_open=False)
                logging.info(f"📊 Interaktivni diagram shranjen: {save_path}")
                return save_path
            else:
                # Shrani v začasno datoteko
                temp_path = "omni/data/interactive_diagram.html"
                Path("omni/data").mkdir(parents=True, exist_ok=True)
                pyo.plot(fig, filename=temp_path, auto_open=False)
                return temp_path
        
        except Exception as e:
            logging.error(f"❌ Napaka pri generiranju interaktivnega diagrama: {e}")
            return None
    
    def _prepare_plotly_data(self):
        """Pripravi podatke za Plotly"""
        # Izračunaj pozicije
        pos = nx.spring_layout(self.graph, k=3, iterations=50)
        
        # Pripravi povezave
        edge_x = []
        edge_y = []
        
        for connection in self.connections.values():
            if connection.source_id in pos and connection.target_id in pos:
                x0, y0 = pos[connection.source_id]
                x1, y1 = pos[connection.target_id]
                edge_x.extend([x0, x1, None])
                edge_y.extend([y0, y1, None])
        
        edge_trace = go.Scatter(x=edge_x, y=edge_y,
                               line=dict(width=2, color='#888'),
                               hoverinfo='none',
                               mode='lines')
        
        # Pripravi module
        node_x = []
        node_y = []
        node_text = []
        node_color = []
        node_size = []
        
        for module_id, module in self.modules.items():
            if module_id in pos:
                x, y = pos[module_id]
                node_x.append(x)
                node_y.append(y)
                
                # Informacije o modulu
                connections_count = len(module.connections)
                functions_list = ', '.join(module.functions[:3])  # Prvi 3
                if len(module.functions) > 3:
                    functions_list += f" (+{len(module.functions)-3} več)"
                
                hover_text = f"""
<b>{module.module_name}</b><br>
Tip: {module.module_type}<br>
Opis: {module.description}<br>
Funkcije: {functions_list}<br>
Povezave: {connections_count}<br>
Uporaba: {module.usage_frequency}
                """.strip()
                
                node_text.append(hover_text)
                
                # Vizualne lastnosti
                visual_props = module.get_visual_properties()
                node_color.append(visual_props['color'])
                node_size.append(visual_props['size'])
        
        node_trace = go.Scatter(x=node_x, y=node_y,
                               mode='markers+text',
                               hoverinfo='text',
                               text=[module.module_name for module in self.modules.values()],
                               textposition="bottom center",
                               hovertext=node_text,
                               marker=dict(
                                   size=node_size,
                                   color=node_color,
                                   line=dict(width=2, color='white')
                               ))
        
        return node_trace, edge_trace
    
    def generate_dependency_matrix(self, save_path: str = None) -> str:
        """Generiraj matriko odvisnosti"""
        try:
            # Ustvari matriko odvisnosti
            module_ids = list(self.modules.keys())
            n = len(module_ids)
            
            dependency_matrix = np.zeros((n, n))
            
            for i, source_id in enumerate(module_ids):
                for j, target_id in enumerate(module_ids):
                    if target_id in self.modules[source_id].connections:
                        connection_info = self.modules[source_id].connections[target_id]
                        dependency_matrix[i][j] = connection_info['strength']
            
            # Ustvari heatmap
            plt.figure(figsize=(12, 10))
            
            im = plt.imshow(dependency_matrix, cmap='YlOrRd', aspect='auto')
            
            # Nastavi oznake
            plt.xticks(range(n), [self.modules[mid].module_name for mid in module_ids], 
                      rotation=45, ha='right')
            plt.yticks(range(n), [self.modules[mid].module_name for mid in module_ids])
            
            # Dodaj vrednosti v celice
            for i in range(n):
                for j in range(n):
                    if dependency_matrix[i][j] > 0:
                        plt.text(j, i, f'{dependency_matrix[i][j]:.1f}',
                                ha='center', va='center', color='white', fontweight='bold')
            
            plt.title('OMNI ULTRA SYSTEM - Matrika Odvisnosti', fontsize=16, fontweight='bold', pad=20)
            plt.xlabel('Ciljni Moduli', fontsize=12)
            plt.ylabel('Izvorni Moduli', fontsize=12)
            
            # Dodaj colorbar
            cbar = plt.colorbar(im)
            cbar.set_label('Moč Povezave', rotation=270, labelpad=20)
            
            plt.tight_layout()
            
            # Shrani ali prikaži
            if save_path:
                plt.savefig(save_path, dpi=300, bbox_inches='tight')
                logging.info(f"📊 Matrika odvisnosti shranjena: {save_path}")
                return save_path
            else:
                temp_path = "omni/data/dependency_matrix.png"
                Path("omni/data").mkdir(parents=True, exist_ok=True)
                plt.savefig(temp_path, dpi=300, bbox_inches='tight')
                plt.close()
                return temp_path
        
        except Exception as e:
            logging.error(f"❌ Napaka pri generiranju matrike odvisnosti: {e}")
            return None
    
    def analyze_system_architecture(self) -> Dict:
        """Analiziraj arhitekturo sistema"""
        analysis = {
            'overview': {
                'total_modules': len(self.modules),
                'total_connections': len(self.connections),
                'average_connections_per_module': len(self.connections) / max(1, len(self.modules)),
                'analysis_timestamp': datetime.now().isoformat()
            },
            'module_analysis': {},
            'connection_analysis': {},
            'architecture_metrics': {},
            'recommendations': []
        }
        
        # Analiziraj module
        for module_id, module in self.modules.items():
            centrality = module.calculate_centrality(self.modules)
            
            analysis['module_analysis'][module_id] = {
                'name': module.module_name,
                'type': module.module_type,
                'connections_count': len(module.connections),
                'dependencies_count': len(module.dependencies),
                'dependents_count': len(module.dependents),
                'centrality_score': centrality,
                'functions_count': len(module.functions),
                'complexity_assessment': self._assess_module_complexity(module)
            }
        
        # Analiziraj povezave
        connection_types = {}
        total_strength = 0
        
        for connection in self.connections.values():
            conn_type = connection.connection_type
            connection_types[conn_type] = connection_types.get(conn_type, 0) + 1
            total_strength += connection.strength
        
        analysis['connection_analysis'] = {
            'connection_types': connection_types,
            'average_connection_strength': total_strength / max(1, len(self.connections)),
            'bidirectional_connections': sum(1 for c in self.connections.values() if c.bidirectional),
            'strongest_connections': self._find_strongest_connections()
        }
        
        # Arhitekturne metrike
        analysis['architecture_metrics'] = {
            'modularity_score': self._calculate_modularity(),
            'coupling_score': self._calculate_coupling(),
            'cohesion_score': self._calculate_cohesion(),
            'complexity_score': self._calculate_system_complexity(),
            'maintainability_score': self._calculate_maintainability()
        }
        
        # Priporočila
        analysis['recommendations'] = self._generate_architecture_recommendations(analysis)
        
        return analysis
    
    def _assess_module_complexity(self, module: ModuleNode) -> Dict:
        """Oceni kompleksnost modula"""
        # Faktorji kompleksnosti
        connection_factor = len(module.connections) / 10  # Normaliziraj na 10 povezav
        function_factor = len(module.functions) / 5      # Normaliziraj na 5 funkcij
        dependency_factor = len(module.dependencies) / 5  # Normaliziraj na 5 odvisnosti
        
        complexity_score = (connection_factor + function_factor + dependency_factor) / 3
        
        if complexity_score > 0.8:
            complexity_level = 'high'
        elif complexity_score > 0.5:
            complexity_level = 'medium'
        else:
            complexity_level = 'low'
        
        return {
            'score': min(1.0, complexity_score),
            'level': complexity_level,
            'factors': {
                'connections': connection_factor,
                'functions': function_factor,
                'dependencies': dependency_factor
            }
        }
    
    def _find_strongest_connections(self) -> List[Dict]:
        """Poišči najšibkejše povezave"""
        connections_with_strength = [
            {
                'source': conn.source_id,
                'target': conn.target_id,
                'type': conn.connection_type,
                'strength': conn.strength
            }
            for conn in self.connections.values()
        ]
        
        # Sortiraj po moči
        connections_with_strength.sort(key=lambda x: x['strength'], reverse=True)
        
        return connections_with_strength[:5]  # Top 5
    
    def _calculate_modularity(self) -> float:
        """Izračunaj modularnost sistema"""
        # Preprosta metrika modularnosti na podlagi tipov modulov
        type_counts = {}
        for module in self.modules.values():
            type_counts[module.module_type] = type_counts.get(module.module_type, 0) + 1
        
        # Višja raznolikost tipov = boljša modularnost
        type_diversity = len(type_counts) / max(1, len(self.modules))
        
        # Uravnoteženost tipov
        if type_counts:
            type_balance = 1 - (max(type_counts.values()) / sum(type_counts.values()))
        else:
            type_balance = 0
        
        modularity = (type_diversity + type_balance) / 2
        
        return min(1.0, modularity)
    
    def _calculate_coupling(self) -> float:
        """Izračunaj sklopitev sistema"""
        if not self.modules:
            return 0.0
        
        total_possible_connections = len(self.modules) * (len(self.modules) - 1)
        actual_connections = len(self.connections)
        
        # Nižja sklopitev je boljša
        coupling = actual_connections / max(1, total_possible_connections)
        
        return min(1.0, coupling)
    
    def _calculate_cohesion(self) -> float:
        """Izračunaj kohezijo sistema"""
        # Kohezija na podlagi funkcij v modulih
        total_functions = sum(len(module.functions) for module in self.modules.values())
        
        if total_functions == 0:
            return 0.0
        
        # Povprečno število funkcij na modul
        avg_functions_per_module = total_functions / len(self.modules)
        
        # Normaliziraj na optimalno število (5 funkcij na modul)
        cohesion = min(1.0, avg_functions_per_module / 5)
        
        return cohesion
    
    def _calculate_system_complexity(self) -> float:
        """Izračunaj kompleksnost sistema"""
        # Kombinacija različnih faktorjev
        module_complexity = sum(
            self._assess_module_complexity(module)['score'] 
            for module in self.modules.values()
        ) / max(1, len(self.modules))
        
        connection_complexity = len(self.connections) / max(1, len(self.modules) * 2)
        
        system_complexity = (module_complexity + connection_complexity) / 2
        
        return min(1.0, system_complexity)
    
    def _calculate_maintainability(self) -> float:
        """Izračunaj vzdrževalnost sistema"""
        # Kombinacija modularnosti, sklopitve in kohezije
        modularity = self._calculate_modularity()
        coupling = self._calculate_coupling()
        cohesion = self._calculate_cohesion()
        
        # Višja modularnost in kohezija, nižja sklopitev = boljša vzdrževalnost
        maintainability = (modularity + cohesion + (1 - coupling)) / 3
        
        return maintainability
    
    def _generate_architecture_recommendations(self, analysis: Dict) -> List[str]:
        """Generiraj priporočila za arhitekturo"""
        recommendations = []
        
        # Preveri modularnost
        if analysis['architecture_metrics']['modularity_score'] < 0.6:
            recommendations.append("Povečaj modularnost z boljšo organizacijo modulov po tipih")
        
        # Preveri sklopitev
        if analysis['architecture_metrics']['coupling_score'] > 0.7:
            recommendations.append("Zmanjšaj sklopitev z zmanjšanjem nepotrebnih povezav")
        
        # Preveri kompleksnost modulov
        complex_modules = [
            module_id for module_id, info in analysis['module_analysis'].items()
            if info['complexity_assessment']['level'] == 'high'
        ]
        
        if complex_modules:
            recommendations.append(f"Razdeli kompleksne module: {', '.join(complex_modules)}")
        
        # Preveri centralne module
        central_modules = [
            module_id for module_id, info in analysis['module_analysis'].items()
            if info['centrality_score'] > 0.8
        ]
        
        if central_modules:
            recommendations.append(f"Preveri obremenitev centralnih modulov: {', '.join(central_modules)}")
        
        # Preveri vzdrževalnost
        if analysis['architecture_metrics']['maintainability_score'] < 0.7:
            recommendations.append("Izboljšaj vzdrževalnost z refaktoriranjem in dokumentacijo")
        
        return recommendations
    
    def export_schema_data(self, export_path: str = None) -> str:
        """Izvozi podatke sheme"""
        schema_data = {
            'metadata': {
                'generator': self.name,
                'version': self.version,
                'generated_at': datetime.now().isoformat(),
                'total_modules': len(self.modules),
                'total_connections': len(self.connections)
            },
            'modules': {module_id: module.to_dict() for module_id, module in self.modules.items()},
            'connections': {conn_id: conn.to_dict() for conn_id, conn in self.connections.items()},
            'analysis': self.analyze_system_architecture()
        }
        
        if export_path:
            file_path = export_path
        else:
            Path("omni/data").mkdir(parents=True, exist_ok=True)
            file_path = "omni/data/system_schema.json"
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(schema_data, f, indent=2, ensure_ascii=False)
        
        logging.info(f"📄 Shema izvožena: {file_path}")
        
        return file_path

# Test funkcije
def test_visual_schema():
    """Testiraj generator vizualnih shem"""
    print("🎨 Testiram Visual Schema Generator...")
    
    schema_generator = VisualSchemaGenerator()
    
    # Generiraj diagrame
    print("📊 Generiram omrežni diagram...")
    network_diagram = schema_generator.generate_network_diagram()
    
    print("📊 Generiram interaktivni diagram...")
    interactive_diagram = schema_generator.generate_interactive_diagram()
    
    print("📊 Generiram matriko odvisnosti...")
    dependency_matrix = schema_generator.generate_dependency_matrix()
    
    # Analiziraj arhitekturo
    print("🔍 Analiziram arhitekturo...")
    analysis = schema_generator.analyze_system_architecture()
    
    print(f"\n📈 Analiza arhitekture:")
    print(f"  Moduli: {analysis['overview']['total_modules']}")
    print(f"  Povezave: {analysis['overview']['total_connections']}")
    print(f"  Modularnost: {analysis['architecture_metrics']['modularity_score']:.1%}")
    print(f"  Sklopitev: {analysis['architecture_metrics']['coupling_score']:.1%}")
    print(f"  Vzdrževalnost: {analysis['architecture_metrics']['maintainability_score']:.1%}")
    
    if analysis['recommendations']:
        print(f"\n💡 Priporočila:")
        for rec in analysis['recommendations']:
            print(f"  • {rec}")
    
    # Izvozi podatke
    print("📄 Izvažam podatke sheme...")
    schema_file = schema_generator.export_schema_data()
    
    return schema_generator, {
        'network_diagram': network_diagram,
        'interactive_diagram': interactive_diagram,
        'dependency_matrix': dependency_matrix,
        'schema_file': schema_file,
        'analysis': analysis
    }

# Glavna funkcija
def main():
    """Glavna funkcija"""
    print("🎨 OMNI VISUAL CONNECTION SCHEMA - ZAGON")
    print("=" * 50)
    
    # Testiraj sistem
    schema_generator, results = test_visual_schema()
    
    print("\n🎉 Visual Schema Generator je pripravljen!")
    print("✅ Omrežni diagram generiran")
    print("✅ Interaktivni diagram ustvarjen")
    print("✅ Matrika odvisnosti pripravljena")
    print("✅ Arhitekturna analiza dokončana")
    print("✅ Podatki sheme izvoženi")
    
    print(f"\n📁 Generirane datoteke:")
    for key, path in results.items():
        if key != 'analysis' and path:
            print(f"  • {key}: {path}")
    
    return schema_generator, results

if __name__ == "__main__":
    visual_schema, schema_results = main()