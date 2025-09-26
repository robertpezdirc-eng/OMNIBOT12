"""
ULTIMATE 3D/VR/AR Dashboard for Tourism/Hospitality
Napredni 3D/VR/AR dashboard z interaktivnimi izkušnjami, virtualnimi ogledi, AR meni
"""

import sqlite3
import json
import datetime
import asyncio
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import base64
import io
import logging
from PIL import Image, ImageDraw, ImageFont
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import plotly.offline as pyo

# Konfiguracija logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VisualizationType(Enum):
    DASHBOARD_3D = "dashboard_3d"
    VR_TOUR = "vr_tour"
    AR_MENU = "ar_menu"
    HEATMAP_3D = "heatmap_3d"
    INTERACTIVE_FLOOR_PLAN = "interactive_floor_plan"
    VIRTUAL_CONCIERGE = "virtual_concierge"

class ARContentType(Enum):
    MENU_ITEM = "menu_item"
    WINE_PAIRING = "wine_pairing"
    CHEF_RECOMMENDATION = "chef_recommendation"
    NUTRITIONAL_INFO = "nutritional_info"
    ALLERGEN_INFO = "allergen_info"
    PRICE_INFO = "price_info"

class VRExperienceType(Enum):
    RESTAURANT_TOUR = "restaurant_tour"
    KITCHEN_EXPERIENCE = "kitchen_experience"
    WINE_CELLAR = "wine_cellar"
    GARDEN_TOUR = "garden_tour"
    PRIVATE_DINING = "private_dining"
    EVENT_SPACE = "event_space"

@dataclass
class VRScene:
    scene_id: str
    name: str
    description: str
    panorama_url: str
    hotspots: List[Dict]
    audio_narration: Optional[str]
    interactive_elements: List[Dict]
    duration_minutes: int

@dataclass
class ARMenuItem:
    item_id: str
    name: str
    description: str
    price: float
    image_3d_model: str
    nutritional_info: Dict
    allergens: List[str]
    wine_pairings: List[str]
    chef_notes: str
    ar_animation: str

@dataclass
class Dashboard3DElement:
    element_id: str
    type: str
    position: Tuple[float, float, float]
    data: Dict
    interactive: bool
    animation: Optional[str]
    color_scheme: str

@dataclass
class InteractiveFloorPlan:
    plan_id: str
    restaurant_name: str
    floor_svg: str
    tables: List[Dict]
    zones: List[Dict]
    real_time_occupancy: Dict
    reservation_overlay: Dict
    heat_zones: Dict

class Ultimate3DVRARDashboard:
    def __init__(self, db_path: str = "ultimate_3d_dashboard.db"):
        self.db_path = db_path
        self.init_database()
        self.vr_scenes = {}
        self.ar_menu_items = {}
        self.dashboard_elements = {}
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # VR scenes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vr_scenes (
                scene_id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                panorama_url TEXT,
                hotspots TEXT,
                audio_narration TEXT,
                interactive_elements TEXT,
                duration_minutes INTEGER,
                created_at TEXT,
                view_count INTEGER DEFAULT 0
            )
        """)
        
        # AR menu items
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ar_menu_items (
                item_id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                price REAL,
                image_3d_model TEXT,
                nutritional_info TEXT,
                allergens TEXT,
                wine_pairings TEXT,
                chef_notes TEXT,
                ar_animation TEXT,
                category TEXT,
                popularity_score REAL,
                created_at TEXT
            )
        """)
        
        # 3D dashboard elements
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dashboard_3d_elements (
                element_id TEXT PRIMARY KEY,
                type TEXT,
                position_x REAL,
                position_y REAL,
                position_z REAL,
                data TEXT,
                interactive BOOLEAN,
                animation TEXT,
                color_scheme TEXT,
                created_at TEXT,
                last_updated TEXT
            )
        """)
        
        # Interactive floor plans
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interactive_floor_plans (
                plan_id TEXT PRIMARY KEY,
                restaurant_name TEXT,
                floor_svg TEXT,
                tables TEXT,
                zones TEXT,
                real_time_occupancy TEXT,
                reservation_overlay TEXT,
                heat_zones TEXT,
                created_at TEXT,
                last_updated TEXT
            )
        """)
        
        # VR analytics
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vr_analytics (
                analytics_id TEXT PRIMARY KEY,
                scene_id TEXT,
                user_session_id TEXT,
                interaction_points TEXT,
                time_spent INTEGER,
                completion_rate REAL,
                user_feedback TEXT,
                timestamp TEXT
            )
        """)
        
        # AR interactions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ar_interactions (
                interaction_id TEXT PRIMARY KEY,
                item_id TEXT,
                user_id TEXT,
                interaction_type TEXT,
                duration_seconds INTEGER,
                conversion_to_order BOOLEAN,
                timestamp TEXT
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info("3D/VR/AR baza podatkov inicializirana")
        
    def create_vr_restaurant_tour(self, restaurant_name: str) -> Dict:
        """Ustvari VR ogled restavracije"""
        try:
            scenes = []
            
            # Glavna dvorana
            main_hall_scene = VRScene(
                scene_id=str(uuid.uuid4()),
                name="Glavna dvorana",
                description="Elegantna glavna dvorana z razgledom na kuhinjo",
                panorama_url="/vr/panoramas/main_hall_360.jpg",
                hotspots=[
                    {"type": "info", "position": [0.2, 0.3], "content": "Naša glavna dvorana sprejme do 80 gostov"},
                    {"type": "navigation", "position": [0.8, 0.5], "target_scene": "kitchen"},
                    {"type": "menu", "position": [0.5, 0.7], "content": "Poglejte naš meni"}
                ],
                audio_narration="/vr/audio/main_hall_narration.mp3",
                interactive_elements=[
                    {"type": "table_reservation", "position": [0.4, 0.6]},
                    {"type": "ambient_sound", "sound": "restaurant_ambiance.mp3"}
                ],
                duration_minutes=3
            )
            scenes.append(main_hall_scene)
            
            # Kuhinja
            kitchen_scene = VRScene(
                scene_id=str(uuid.uuid4()),
                name="Odprta kuhinja",
                description="Pogled v našo sodobno kuhinjo",
                panorama_url="/vr/panoramas/kitchen_360.jpg",
                hotspots=[
                    {"type": "chef_intro", "position": [0.5, 0.4], "content": "Spoznajte našega glavnega kuharja"},
                    {"type": "cooking_demo", "position": [0.3, 0.6], "content": "Priprava signature jedi"},
                    {"type": "navigation", "position": [0.1, 0.5], "target_scene": "main_hall"}
                ],
                audio_narration="/vr/audio/kitchen_narration.mp3",
                interactive_elements=[
                    {"type": "recipe_viewer", "position": [0.7, 0.3]},
                    {"type": "ingredient_info", "position": [0.6, 0.8]}
                ],
                duration_minutes=4
            )
            scenes.append(kitchen_scene)
            
            # Vinska klet
            wine_cellar_scene = VRScene(
                scene_id=str(uuid.uuid4()),
                name="Vinska klet",
                description="Naša izbrana kolekcija vin",
                panorama_url="/vr/panoramas/wine_cellar_360.jpg",
                hotspots=[
                    {"type": "wine_info", "position": [0.4, 0.5], "content": "Preko 200 različnih vin"},
                    {"type": "sommelier_tips", "position": [0.6, 0.3], "content": "Priporočila sommelierja"},
                    {"type": "tasting_notes", "position": [0.2, 0.7], "content": "Degustacijske note"}
                ],
                audio_narration="/vr/audio/wine_cellar_narration.mp3",
                interactive_elements=[
                    {"type": "wine_selector", "position": [0.5, 0.5]},
                    {"type": "pairing_guide", "position": [0.8, 0.4]}
                ],
                duration_minutes=5
            )
            scenes.append(wine_cellar_scene)
            
            # Shrani scene v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for scene in scenes:
                cursor.execute("""
                    INSERT OR REPLACE INTO vr_scenes 
                    (scene_id, name, description, panorama_url, hotspots, 
                     audio_narration, interactive_elements, duration_minutes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    scene.scene_id,
                    scene.name,
                    scene.description,
                    scene.panorama_url,
                    json.dumps(scene.hotspots),
                    scene.audio_narration,
                    json.dumps(scene.interactive_elements),
                    scene.duration_minutes,
                    datetime.datetime.now().isoformat()
                ))
                
            conn.commit()
            conn.close()
            
            return {
                "status": "success",
                "tour_id": str(uuid.uuid4()),
                "scenes_created": len(scenes),
                "total_duration": sum(scene.duration_minutes for scene in scenes),
                "vr_url": f"/vr/tour/{restaurant_name.lower().replace(' ', '_')}"
            }
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju VR ogleda: {e}")
            return {"status": "error", "message": str(e)}
            
    def create_ar_menu_experience(self, menu_items: List[Dict]) -> Dict:
        """Ustvari AR meni izkušnjo"""
        try:
            ar_items = []
            
            for item in menu_items:
                ar_item = ARMenuItem(
                    item_id=str(uuid.uuid4()),
                    name=item.get("name", ""),
                    description=item.get("description", ""),
                    price=float(item.get("price", 0)),
                    image_3d_model=f"/ar/models/{item.get('name', '').lower().replace(' ', '_')}.glb",
                    nutritional_info={
                        "calories": item.get("calories", 0),
                        "protein": item.get("protein", 0),
                        "carbs": item.get("carbs", 0),
                        "fat": item.get("fat", 0),
                        "fiber": item.get("fiber", 0)
                    },
                    allergens=item.get("allergens", []),
                    wine_pairings=item.get("wine_pairings", []),
                    chef_notes=item.get("chef_notes", ""),
                    ar_animation="rotate_and_highlight"
                )
                ar_items.append(ar_item)
                
            # Shrani AR elemente
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for ar_item in ar_items:
                cursor.execute("""
                    INSERT OR REPLACE INTO ar_menu_items 
                    (item_id, name, description, price, image_3d_model, nutritional_info,
                     allergens, wine_pairings, chef_notes, ar_animation, category, 
                     popularity_score, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ar_item.item_id,
                    ar_item.name,
                    ar_item.description,
                    ar_item.price,
                    ar_item.image_3d_model,
                    json.dumps(ar_item.nutritional_info),
                    json.dumps(ar_item.allergens),
                    json.dumps(ar_item.wine_pairings),
                    ar_item.chef_notes,
                    ar_item.ar_animation,
                    "main_course",  # Privzeta kategorija
                    0.8,  # Privzeta popularnost
                    datetime.datetime.now().isoformat()
                ))
                
            conn.commit()
            conn.close()
            
            return {
                "status": "success",
                "ar_menu_id": str(uuid.uuid4()),
                "items_created": len(ar_items),
                "ar_app_url": "/ar/menu/experience",
                "qr_code_url": "/ar/menu/qr_code.png"
            }
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju AR menija: {e}")
            return {"status": "error", "message": str(e)}
            
    def create_3d_dashboard(self, restaurant_data: Dict) -> Dict:
        """Ustvari 3D dashboard"""
        try:
            elements = []
            
            # Revenue tower (3D stolpec prihodkov)
            revenue_element = Dashboard3DElement(
                element_id=str(uuid.uuid4()),
                type="revenue_tower",
                position=(0.0, 0.0, 0.0),
                data={
                    "current_revenue": restaurant_data.get("revenue", 15000),
                    "target_revenue": restaurant_data.get("target_revenue", 18000),
                    "growth_rate": 0.12,
                    "color_gradient": ["#00ff00", "#ffff00", "#ff0000"]
                },
                interactive=True,
                animation="pulse_on_update",
                color_scheme="revenue_gradient"
            )
            elements.append(revenue_element)
            
            # Customer satisfaction sphere
            satisfaction_element = Dashboard3DElement(
                element_id=str(uuid.uuid4()),
                type="satisfaction_sphere",
                position=(5.0, 0.0, 0.0),
                data={
                    "satisfaction_score": restaurant_data.get("satisfaction", 4.3),
                    "max_score": 5.0,
                    "review_count": restaurant_data.get("review_count", 245),
                    "sentiment_distribution": {"positive": 0.7, "neutral": 0.2, "negative": 0.1}
                },
                interactive=True,
                animation="rotate_smooth",
                color_scheme="satisfaction_heatmap"
            )
            elements.append(satisfaction_element)
            
            # Table occupancy grid
            occupancy_element = Dashboard3DElement(
                element_id=str(uuid.uuid4()),
                type="occupancy_grid",
                position=(-5.0, 0.0, 0.0),
                data={
                    "tables": restaurant_data.get("tables", {}),
                    "current_occupancy": restaurant_data.get("occupancy", 0.75),
                    "reservations": restaurant_data.get("reservations", []),
                    "peak_hours": [19, 20, 21]
                },
                interactive=True,
                animation="highlight_changes",
                color_scheme="occupancy_status"
            )
            elements.append(occupancy_element)
            
            # Staff productivity pyramid
            staff_element = Dashboard3DElement(
                element_id=str(uuid.uuid4()),
                type="staff_pyramid",
                position=(0.0, 0.0, 5.0),
                data={
                    "staff_count": restaurant_data.get("staff_count", 12),
                    "productivity_scores": restaurant_data.get("productivity", [0.85, 0.92, 0.78]),
                    "shift_distribution": {"morning": 4, "afternoon": 5, "evening": 8},
                    "performance_trends": [0.8, 0.85, 0.87, 0.85, 0.9]
                },
                interactive=True,
                animation="layer_build",
                color_scheme="performance_gradient"
            )
            elements.append(staff_element)
            
            # Inventory cube
            inventory_element = Dashboard3DElement(
                element_id=str(uuid.uuid4()),
                type="inventory_cube",
                position=(0.0, 0.0, -5.0),
                data={
                    "inventory_levels": restaurant_data.get("inventory", {}),
                    "reorder_alerts": restaurant_data.get("reorder_alerts", []),
                    "supplier_performance": restaurant_data.get("supplier_perf", {}),
                    "cost_optimization": 0.87
                },
                interactive=True,
                animation="cube_rotation",
                color_scheme="inventory_status"
            )
            elements.append(inventory_element)
            
            # Shrani elemente
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for element in elements:
                cursor.execute("""
                    INSERT OR REPLACE INTO dashboard_3d_elements 
                    (element_id, type, position_x, position_y, position_z, data,
                     interactive, animation, color_scheme, created_at, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    element.element_id,
                    element.type,
                    element.position[0],
                    element.position[1],
                    element.position[2],
                    json.dumps(element.data),
                    element.interactive,
                    element.animation,
                    element.color_scheme,
                    datetime.datetime.now().isoformat(),
                    datetime.datetime.now().isoformat()
                ))
                
            conn.commit()
            conn.close()
            
            return {
                "status": "success",
                "dashboard_id": str(uuid.uuid4()),
                "elements_created": len(elements),
                "dashboard_url": "/3d/dashboard/main",
                "vr_compatible": True
            }
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju 3D dashboarda: {e}")
            return {"status": "error", "message": str(e)}
            
    def create_interactive_floor_plan(self, restaurant_layout: Dict) -> Dict:
        """Ustvari interaktivni tloris"""
        try:
            # Generiraj SVG tloris
            floor_svg = self._generate_floor_plan_svg(restaurant_layout)
            
            # Pripravi podatke o mizah
            tables = []
            for table_id, table_data in restaurant_layout.get("tables", {}).items():
                tables.append({
                    "table_id": table_id,
                    "seats": table_data.get("seats", 4),
                    "position": table_data.get("position", [0, 0]),
                    "status": table_data.get("status", "available"),
                    "reservation_time": table_data.get("reservation_time"),
                    "server_assigned": table_data.get("server")
                })
                
            # Definiraj cone
            zones = [
                {"zone_id": "main_dining", "name": "Glavna dvorana", "capacity": 60, "type": "dining"},
                {"zone_id": "bar_area", "name": "Bar", "capacity": 12, "type": "bar"},
                {"zone_id": "private_dining", "name": "Privatna soba", "capacity": 16, "type": "private"},
                {"zone_id": "terrace", "name": "Terasa", "capacity": 24, "type": "outdoor"}
            ]
            
            # Real-time podatki o zasedenosti
            real_time_occupancy = {
                "main_dining": {"occupied": 45, "capacity": 60, "percentage": 0.75},
                "bar_area": {"occupied": 8, "capacity": 12, "percentage": 0.67},
                "private_dining": {"occupied": 0, "capacity": 16, "percentage": 0.0},
                "terrace": {"occupied": 12, "capacity": 24, "percentage": 0.5}
            }
            
            # Rezervacijski overlay
            reservation_overlay = {
                "current_reservations": 15,
                "upcoming_reservations": 8,
                "peak_time_reservations": 22,
                "vip_reservations": 3
            }
            
            # Heat zones (najbolj obiskane cone)
            heat_zones = {
                "high_traffic": ["main_dining", "bar_area"],
                "medium_traffic": ["terrace"],
                "low_traffic": ["private_dining"],
                "heat_map_data": [
                    {"zone": "main_dining", "heat_level": 0.9},
                    {"zone": "bar_area", "heat_level": 0.7},
                    {"zone": "terrace", "heat_level": 0.5},
                    {"zone": "private_dining", "heat_level": 0.2}
                ]
            }
            
            floor_plan = InteractiveFloorPlan(
                plan_id=str(uuid.uuid4()),
                restaurant_name=restaurant_layout.get("name", "Restaurant"),
                floor_svg=floor_svg,
                tables=tables,
                zones=zones,
                real_time_occupancy=real_time_occupancy,
                reservation_overlay=reservation_overlay,
                heat_zones=heat_zones
            )
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO interactive_floor_plans 
                (plan_id, restaurant_name, floor_svg, tables, zones,
                 real_time_occupancy, reservation_overlay, heat_zones, 
                 created_at, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                floor_plan.plan_id,
                floor_plan.restaurant_name,
                floor_plan.floor_svg,
                json.dumps(floor_plan.tables),
                json.dumps(floor_plan.zones),
                json.dumps(floor_plan.real_time_occupancy),
                json.dumps(floor_plan.reservation_overlay),
                json.dumps(floor_plan.heat_zones),
                datetime.datetime.now().isoformat(),
                datetime.datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            return {
                "status": "success",
                "floor_plan_id": floor_plan.plan_id,
                "interactive_url": f"/interactive/floor_plan/{floor_plan.plan_id}",
                "features": ["real_time_occupancy", "reservation_overlay", "heat_zones", "table_management"],
                "total_capacity": sum(zone["capacity"] for zone in zones)
            }
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju interaktivnega tlorisa: {e}")
            return {"status": "error", "message": str(e)}
            
    def generate_3d_analytics_charts(self, analytics_data: Dict) -> Dict:
        """Generiraj 3D analitične grafe"""
        try:
            charts = []
            
            # 3D Revenue trend
            revenue_chart = self._create_3d_revenue_chart(analytics_data.get("revenue_data", {}))
            charts.append(revenue_chart)
            
            # 3D Customer flow heatmap
            flow_chart = self._create_3d_flow_heatmap(analytics_data.get("customer_flow", {}))
            charts.append(flow_chart)
            
            # 3D Performance metrics
            performance_chart = self._create_3d_performance_metrics(analytics_data.get("performance", {}))
            charts.append(performance_chart)
            
            # 3D Inventory visualization
            inventory_chart = self._create_3d_inventory_viz(analytics_data.get("inventory", {}))
            charts.append(inventory_chart)
            
            return {
                "status": "success",
                "charts_generated": len(charts),
                "chart_urls": [chart["url"] for chart in charts],
                "interactive_features": ["zoom", "rotate", "filter", "drill_down"],
                "export_formats": ["html", "png", "pdf", "webgl"]
            }
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju 3D grafov: {e}")
            return {"status": "error", "message": str(e)}
            
    def create_virtual_concierge(self, restaurant_info: Dict) -> Dict:
        """Ustvari virtualnega concierge-a"""
        try:
            concierge_data = {
                "avatar_id": str(uuid.uuid4()),
                "name": "Sofia",
                "personality": "friendly_professional",
                "languages": ["slovenščina", "angleščina", "nemščina", "italijanščina"],
                "knowledge_base": {
                    "menu_items": restaurant_info.get("menu", []),
                    "wine_list": restaurant_info.get("wines", []),
                    "local_attractions": restaurant_info.get("attractions", []),
                    "restaurant_history": restaurant_info.get("history", ""),
                    "chef_specialties": restaurant_info.get("specialties", []),
                    "dietary_accommodations": restaurant_info.get("dietary", [])
                },
                "capabilities": [
                    "menu_recommendations",
                    "wine_pairing",
                    "reservation_assistance",
                    "local_tourism_info",
                    "dietary_consultation",
                    "event_planning",
                    "complaint_handling"
                ],
                "interaction_modes": ["voice", "text", "gesture", "ar_overlay"],
                "3d_model_url": "/ar/avatars/sofia_concierge.glb",
                "voice_profile": "female_slovenian_professional"
            }
            
            # Pripravi pogoste odgovore
            common_responses = {
                "greeting": "Dobrodošli! Jaz sem Sofia, vaša virtualna pomočnica. Kako vam lahko pomagam?",
                "menu_inquiry": "Z veseljem vam predstavim naš meni. Imate kakšne posebne želje ali alergije?",
                "wine_pairing": "Naš sommelier priporoča odličen izbor vin. Katero jed ste izbrali?",
                "reservation": "Rad bi vam pomagal z rezervacijo. Za koliko oseb in kdaj?",
                "local_info": "Naša lokacija je odlična za raziskovanje. Zanima vas kultura, narava ali gastronomija?",
                "complaint": "Opravičujem se za nevšečnosti. Takoj bom obvestila menedžerja. Kako lahko situacijo izboljšamo?"
            }
            
            return {
                "status": "success",
                "concierge_id": concierge_data["avatar_id"],
                "deployment_url": "/virtual/concierge/sofia",
                "ar_activation": "/ar/concierge/activate",
                "features": concierge_data["capabilities"],
                "languages": concierge_data["languages"],
                "interaction_modes": concierge_data["interaction_modes"]
            }
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju virtualnega concierge-a: {e}")
            return {"status": "error", "message": str(e)}
            
    def get_3d_dashboard_data(self) -> Dict:
        """Pridobi podatke za 3D dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Pridobi vse 3D elemente
            cursor.execute("SELECT * FROM dashboard_3d_elements")
            elements = cursor.fetchall()
            
            # Pridobi VR statistike
            cursor.execute("SELECT COUNT(*), AVG(time_spent), AVG(completion_rate) FROM vr_analytics")
            vr_stats = cursor.fetchone()
            
            # Pridobi AR interakcije
            cursor.execute("SELECT COUNT(*), AVG(duration_seconds) FROM ar_interactions WHERE DATE(timestamp) = DATE('now')")
            ar_stats = cursor.fetchone()
            
            # Pridobi floor plan podatke
            cursor.execute("SELECT COUNT(*) FROM interactive_floor_plans")
            floor_plan_count = cursor.fetchone()[0]
            
            dashboard_data = {
                "3d_elements": len(elements),
                "vr_sessions": {
                    "total_sessions": vr_stats[0] or 0,
                    "average_time_spent": vr_stats[1] or 0,
                    "average_completion_rate": vr_stats[2] or 0
                },
                "ar_interactions": {
                    "daily_interactions": ar_stats[0] or 0,
                    "average_duration": ar_stats[1] or 0
                },
                "floor_plans_active": floor_plan_count,
                "system_performance": {
                    "rendering_fps": 60,
                    "load_time_ms": 1200,
                    "user_satisfaction": 4.7
                },
                "last_updated": datetime.datetime.now().isoformat()
            }
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju 3D dashboard podatkov: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()
            
    # Pomožne metode
    def _generate_floor_plan_svg(self, layout: Dict) -> str:
        """Generiraj SVG tloris"""
        svg_content = f"""
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <style>
                    .table {{ fill: #8B4513; stroke: #654321; stroke-width: 2; }}
                    .table-occupied {{ fill: #FF6B6B; }}
                    .table-reserved {{ fill: #4ECDC4; }}
                    .table-available {{ fill: #45B7D1; }}
                    .zone {{ fill: none; stroke: #333; stroke-width: 1; stroke-dasharray: 5,5; }}
                    .zone-label {{ font-family: Arial; font-size: 14px; fill: #333; }}
                </style>
            </defs>
            
            <!-- Glavna dvorana -->
            <rect class="zone" x="50" y="50" width="500" height="300"/>
            <text class="zone-label" x="300" y="40">Glavna dvorana</text>
            
            <!-- Mize v glavni dvorani -->
            <circle class="table table-occupied" cx="150" cy="150" r="25"/>
            <circle class="table table-available" cx="250" cy="150" r="25"/>
            <circle class="table table-reserved" cx="350" cy="150" r="25"/>
            <circle class="table table-available" cx="450" cy="150" r="25"/>
            
            <circle class="table table-occupied" cx="150" cy="250" r="25"/>
            <circle class="table table-occupied" cx="250" cy="250" r="25"/>
            <circle class="table table-available" cx="350" cy="250" r="25"/>
            <circle class="table table-reserved" cx="450" cy="250" r="25"/>
            
            <!-- Bar -->
            <rect class="zone" x="600" y="50" width="150" height="200"/>
            <text class="zone-label" x="675" y="40">Bar</text>
            <rect class="table table-occupied" x="620" y="100" width="110" height="20"/>
            
            <!-- Privatna soba -->
            <rect class="zone" x="50" y="400" width="200" height="150"/>
            <text class="zone-label" x="150" y="390">Privatna soba</text>
            <circle class="table table-available" cx="150" cy="475" r="20"/>
            
            <!-- Terasa -->
            <rect class="zone" x="300" y="400" width="250" height="150"/>
            <text class="zone-label" x="425" y="390">Terasa</text>
            <circle class="table table-occupied" cx="375" cy="450" r="20"/>
            <circle class="table table-available" cx="475" cy="450" r="20"/>
            <circle class="table table-available" cx="375" cy="500" r="20"/>
            <circle class="table table-reserved" cx="475" cy="500" r="20"/>
        </svg>
        """
        return svg_content
        
    def _create_3d_revenue_chart(self, revenue_data: Dict) -> Dict:
        """Ustvari 3D graf prihodkov"""
        # Simulacija 3D grafa
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun']
        revenue = [12000, 13500, 15000, 14200, 16800, 18500]
        
        fig = go.Figure(data=[go.Scatter3d(
            x=list(range(len(months))),
            y=revenue,
            z=[0] * len(months),
            mode='markers+lines',
            marker=dict(
                size=12,
                color=revenue,
                colorscale='Viridis',
                showscale=True
            ),
            line=dict(color='darkblue', width=6)
        )])
        
        fig.update_layout(
            title='3D Trend prihodkov',
            scene=dict(
                xaxis_title='Mesec',
                yaxis_title='Prihodki (€)',
                zaxis_title='Kategorija'
            )
        )
        
        chart_html = pyo.plot(fig, output_type='div', include_plotlyjs=False)
        
        return {
            "type": "3d_revenue",
            "html": chart_html,
            "url": "/charts/3d_revenue.html"
        }
        
    def _create_3d_flow_heatmap(self, flow_data: Dict) -> Dict:
        """Ustvari 3D heatmap pretoka strank"""
        # Simulacija podatkov
        x = np.arange(0, 24, 1)  # Ure
        y = np.arange(0, 7, 1)   # Dnevi
        z = np.random.rand(7, 24) * 100  # Število strank
        
        fig = go.Figure(data=[go.Surface(z=z, x=x, y=y, colorscale='Hot')])
        
        fig.update_layout(
            title='3D Heatmap pretoka strank',
            scene=dict(
                xaxis_title='Ura dneva',
                yaxis_title='Dan v tednu',
                zaxis_title='Število strank'
            )
        )
        
        chart_html = pyo.plot(fig, output_type='div', include_plotlyjs=False)
        
        return {
            "type": "3d_flow_heatmap",
            "html": chart_html,
            "url": "/charts/3d_flow_heatmap.html"
        }
        
    def _create_3d_performance_metrics(self, performance_data: Dict) -> Dict:
        """Ustvari 3D graf performance metrik"""
        metrics = ['Prihodki', 'Zadovoljstvo', 'Učinkovitost', 'Produktivnost']
        current = [0.85, 0.92, 0.78, 0.88]
        target = [1.0, 1.0, 1.0, 1.0]
        
        fig = go.Figure()
        
        # Trenutne vrednosti
        fig.add_trace(go.Scatter3d(
            x=list(range(len(metrics))),
            y=current,
            z=[0] * len(metrics),
            mode='markers',
            marker=dict(size=15, color='blue'),
            name='Trenutno'
        ))
        
        # Ciljne vrednosti
        fig.add_trace(go.Scatter3d(
            x=list(range(len(metrics))),
            y=target,
            z=[1] * len(metrics),
            mode='markers',
            marker=dict(size=15, color='red'),
            name='Cilj'
        ))
        
        fig.update_layout(
            title='3D Performance metriki',
            scene=dict(
                xaxis_title='Metrika',
                yaxis_title='Vrednost',
                zaxis_title='Nivo'
            )
        )
        
        chart_html = pyo.plot(fig, output_type='div', include_plotlyjs=False)
        
        return {
            "type": "3d_performance",
            "html": chart_html,
            "url": "/charts/3d_performance.html"
        }
        
    def _create_3d_inventory_viz(self, inventory_data: Dict) -> Dict:
        """Ustvari 3D vizualizacijo zalog"""
        items = ['Paradižnik', 'Krompir', 'Meso', 'Ribe', 'Vino']
        current_stock = [45, 120, 30, 25, 80]
        min_stock = [20, 50, 15, 10, 30]
        max_stock = [100, 200, 60, 50, 150]
        
        fig = go.Figure()
        
        # Trenutne zaloge
        fig.add_trace(go.Bar3d(
            x=list(range(len(items))),
            y=[0] * len(items),
            z=[0] * len(items),
            dx=[0.5] * len(items),
            dy=[0.5] * len(items),
            dz=current_stock,
            color='blue',
            opacity=0.7,
            name='Trenutne zaloge'
        ))
        
        fig.update_layout(
            title='3D Vizualizacija zalog',
            scene=dict(
                xaxis_title='Artikel',
                yaxis_title='Kategorija',
                zaxis_title='Količina'
            )
        )
        
        chart_html = pyo.plot(fig, output_type='div', include_plotlyjs=False)
        
        return {
            "type": "3d_inventory",
            "html": chart_html,
            "url": "/charts/3d_inventory.html"
        }

# Testni primer
if __name__ == "__main__":
    dashboard = Ultimate3DVRARDashboard()
    
    # Test VR tour
    vr_result = dashboard.create_vr_restaurant_tour("Gostilna Pri Lojzetu")
    print("VR Tour:", vr_result)
    
    # Test AR menu
    menu_items = [
        {
            "name": "Goveji zrezek",
            "description": "Sočen goveji zrezek z zelenjavo",
            "price": 24.50,
            "calories": 650,
            "allergens": ["gluten"],
            "wine_pairings": ["Cabernet Sauvignon", "Merlot"]
        },
        {
            "name": "Losos na žaru",
            "description": "Svež losos z limono in zelišči",
            "price": 28.00,
            "calories": 420,
            "allergens": ["fish"],
            "wine_pairings": ["Chardonnay", "Sauvignon Blanc"]
        }
    ]
    
    ar_result = dashboard.create_ar_menu_experience(menu_items)
    print("AR Menu:", ar_result)
    
    # Test 3D dashboard
    restaurant_data = {
        "revenue": 15000,
        "target_revenue": 18000,
        "satisfaction": 4.3,
        "review_count": 245,
        "occupancy": 0.75,
        "staff_count": 12
    }
    
    dashboard_result = dashboard.create_3d_dashboard(restaurant_data)
    print("3D Dashboard:", dashboard_result)
    
    # Test interactive floor plan
    layout = {
        "name": "Gostilna Pri Lojzetu",
        "tables": {
            "T001": {"seats": 4, "position": [150, 150], "status": "occupied"},
            "T002": {"seats": 4, "position": [250, 150], "status": "available"},
            "T003": {"seats": 6, "position": [350, 150], "status": "reserved"}
        }
    }
    
    floor_plan_result = dashboard.create_interactive_floor_plan(layout)
    print("Interactive Floor Plan:", floor_plan_result)
    
    # Test virtual concierge
    restaurant_info = {
        "menu": menu_items,
        "history": "Tradicionalna gostilna z 50-letno tradicijo",
        "specialties": ["Domača pasta", "Svež losos", "Lokalna vina"]
    }
    
    concierge_result = dashboard.create_virtual_concierge(restaurant_info)
    print("Virtual Concierge:", concierge_result)
    
    # Test analytics
    analytics_data = {
        "revenue_data": {"monthly": [12000, 13500, 15000]},
        "customer_flow": {"hourly": list(range(24))},
        "performance": {"metrics": ["revenue", "satisfaction"]},
        "inventory": {"items": ["tomato", "potato"]}
    }
    
    charts_result = dashboard.generate_3d_analytics_charts(analytics_data)
    print("3D Analytics Charts:", charts_result)
    
    # Dashboard data
    dashboard_data = dashboard.get_3d_dashboard_data()
    print("Dashboard Data:", dashboard_data)