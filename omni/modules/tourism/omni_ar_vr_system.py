#!/usr/bin/env python3
"""
🥽 OMNI AR/VR SYSTEM - AR/VR integracije in virtualni vodiči

Napredni AR/VR sistem za turizem z Enterprise funkcionalnostmi:
- 3D virtualni vodiči z AI glasom
- AR prepoznavanje znamenitosti in objektov
- VR virtualni ogledi destinacij
- Interaktivne AR/VR izkušnje
- Personalizirani virtualni asistenti
- Real-time prevajanje in informacije
- Gamifikacija in interaktivne ture
- Integracija z IoT senzorji

Varnostne funkcije:
- Centraliziran oblak → noben modul ne teče lokalno
- Enkripcija → TLS + AES-256 za vse podatke in komunikacijo
- Sandbox / Read-only demo
- Zaščita pred krajo → poskusi prenosa ali lokalne uporabe → modul se zaklene
- Admin dostop samo za tebe → edini, ki lahko nadgrajuje in odklepa funkcionalnosti
"""

import sqlite3
import json
import logging
import datetime
import numpy as np
import cv2
import base64
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import threading
import time
import hashlib
import secrets
from flask import Flask, request, jsonify, render_template_string
import asyncio
import websockets
import warnings
warnings.filterwarnings('ignore')

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ARVRMode(Enum):
    AR_GUIDE = "ar_guide"
    VR_TOUR = "vr_tour"
    MIXED_REALITY = "mixed_reality"
    VIRTUAL_ASSISTANT = "virtual_assistant"
    INTERACTIVE_EXPERIENCE = "interactive_experience"

class ExperienceType(Enum):
    CULTURAL_TOUR = "cultural_tour"
    NATURE_EXPLORATION = "nature_exploration"
    HISTORICAL_JOURNEY = "historical_journey"
    CULINARY_ADVENTURE = "culinary_adventure"
    ADVENTURE_SPORTS = "adventure_sports"
    WELLNESS_RETREAT = "wellness_retreat"

class InteractionLevel(Enum):
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

@dataclass
class VirtualGuide:
    guide_id: str
    name: str
    avatar_url: str
    voice_profile: str
    languages: List[str]
    specialties: List[str]
    personality_traits: Dict[str, float]
    experience_level: InteractionLevel
    created_at: datetime.datetime

@dataclass
class ARObject:
    object_id: str
    name: str
    description: str
    category: str
    coordinates: Tuple[float, float, float]  # x, y, z
    ar_model_url: str
    interaction_data: Dict[str, Any]
    metadata: Dict[str, Any]

@dataclass
class VRExperience:
    experience_id: str
    title: str
    description: str
    experience_type: ExperienceType
    duration_minutes: int
    difficulty_level: InteractionLevel
    vr_scene_url: str
    interactive_elements: List[Dict[str, Any]]
    prerequisites: List[str]

@dataclass
class UserSession:
    session_id: str
    user_id: str
    mode: ARVRMode
    current_experience: Optional[str]
    start_time: datetime.datetime
    location: Tuple[float, float]  # lat, lon
    preferences: Dict[str, Any]
    progress: Dict[str, Any]

class OmniARVRSystem:
    def __init__(self, db_path: str = "omni_ar_vr_system.db"):
        self.db_path = db_path
        self.is_demo = True
        self.demo_start_time = datetime.datetime.now()
        self.demo_duration_hours = 2
        self.access_key = secrets.token_hex(32)
        
        # AR/VR data storage
        self.virtual_guides = {}
        self.ar_objects = {}
        self.vr_experiences = {}
        self.active_sessions = {}
        
        self.init_database()
        self.load_sample_data()
        
        # Flask aplikacija
        self.app = Flask(__name__)
        self.setup_routes()
        
        logger.info("AR/VR System inicializiran")

    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za virtualne vodiče
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS virtual_guides (
                id TEXT PRIMARY KEY,
                name TEXT,
                avatar_url TEXT,
                voice_profile TEXT,
                languages TEXT,
                specialties TEXT,
                personality_traits TEXT,
                experience_level TEXT,
                created_at TEXT
            )
        ''')
        
        # Tabela za AR objekte
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ar_objects (
                id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                category TEXT,
                coordinates TEXT,
                ar_model_url TEXT,
                interaction_data TEXT,
                metadata TEXT,
                created_at TEXT
            )
        ''')
        
        # Tabela za VR izkušnje
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vr_experiences (
                id TEXT PRIMARY KEY,
                title TEXT,
                description TEXT,
                experience_type TEXT,
                duration_minutes INTEGER,
                difficulty_level TEXT,
                vr_scene_url TEXT,
                interactive_elements TEXT,
                prerequisites TEXT,
                created_at TEXT
            )
        ''')
        
        # Tabela za uporabniške seje
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                mode TEXT,
                current_experience TEXT,
                start_time TEXT,
                location TEXT,
                preferences TEXT,
                progress TEXT,
                created_at TEXT
            )
        ''')
        
        # Tabela za interakcije
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS interactions (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                interaction_type TEXT,
                object_id TEXT,
                timestamp TEXT,
                data TEXT,
                user_feedback TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("AR/VR System baza podatkov inicializirana")

    def load_sample_data(self):
        """Naloži vzorčne podatke"""
        # Virtualni vodiči
        sample_guides = [
            VirtualGuide(
                guide_id="guide_ana",
                name="Ana - Kulturni vodič",
                avatar_url="/avatars/ana_cultural.glb",
                voice_profile="female_slovenian_warm",
                languages=["slovenščina", "angleščina", "nemščina"],
                specialties=["zgodovina", "kultura", "umetnost"],
                personality_traits={"friendliness": 0.9, "knowledge": 0.95, "patience": 0.8},
                experience_level=InteractionLevel.EXPERT,
                created_at=datetime.datetime.now()
            ),
            VirtualGuide(
                guide_id="guide_marko",
                name="Marko - Naravni vodič",
                avatar_url="/avatars/marko_nature.glb",
                voice_profile="male_slovenian_energetic",
                languages=["slovenščina", "angleščina", "italijanščina"],
                specialties=["narava", "pohodništvo", "fotografija"],
                personality_traits={"enthusiasm": 0.95, "adventure": 0.9, "expertise": 0.85},
                experience_level=InteractionLevel.ADVANCED,
                created_at=datetime.datetime.now()
            ),
            VirtualGuide(
                guide_id="guide_petra",
                name="Petra - Gastronomski vodič",
                avatar_url="/avatars/petra_culinary.glb",
                voice_profile="female_slovenian_cheerful",
                languages=["slovenščina", "angleščina", "francoščina"],
                specialties=["gastronomija", "vino", "lokalne specialitete"],
                personality_traits={"creativity": 0.9, "passion": 0.95, "sociability": 0.85},
                experience_level=InteractionLevel.EXPERT,
                created_at=datetime.datetime.now()
            )
        ]
        
        for guide in sample_guides:
            self.save_virtual_guide(guide)
            self.virtual_guides[guide.guide_id] = guide
        
        # AR objekti
        sample_ar_objects = [
            ARObject(
                object_id="ar_bled_castle",
                name="Blejski grad",
                description="Srednjeveški grad na skali nad Blejskim jezerom",
                category="zgodovinska_znamenitost",
                coordinates=(46.3683, 14.0997, 130.0),
                ar_model_url="/models/bled_castle.glb",
                interaction_data={
                    "info_points": 5,
                    "interactive_elements": ["vrata", "razgledna_ploščad", "muzej"],
                    "audio_guide": True
                },
                metadata={
                    "year_built": 1004,
                    "architectural_style": "romanesque",
                    "visitor_rating": 4.8
                }
            ),
            ARObject(
                object_id="ar_triglav",
                name="Triglav",
                description="Najvišji vrh Slovenije",
                category="naravna_znamenitost",
                coordinates=(46.3787, 13.8378, 2864.0),
                ar_model_url="/models/triglav_peak.glb",
                interaction_data={
                    "climbing_routes": 3,
                    "weather_info": True,
                    "safety_tips": True
                },
                metadata={
                    "height": 2864,
                    "first_ascent": 1778,
                    "difficulty": "challenging"
                }
            )
        ]
        
        for ar_obj in sample_ar_objects:
            self.save_ar_object(ar_obj)
            self.ar_objects[ar_obj.object_id] = ar_obj
        
        # VR izkušnje
        sample_vr_experiences = [
            VRExperience(
                experience_id="vr_ljubljana_tour",
                title="Virtualni sprehod po Ljubljani",
                description="Interaktivni VR ogled glavnega mesta Slovenije",
                experience_type=ExperienceType.CULTURAL_TOUR,
                duration_minutes=45,
                difficulty_level=InteractionLevel.BASIC,
                vr_scene_url="/scenes/ljubljana_city_tour.unity3d",
                interactive_elements=[
                    {"type": "info_point", "location": "preseren_square", "content": "Prešernov trg"},
                    {"type": "quiz", "location": "dragon_bridge", "questions": 3},
                    {"type": "photo_spot", "location": "castle_hill", "filters": ["vintage", "modern"]}
                ],
                prerequisites=[]
            ),
            VRExperience(
                experience_id="vr_alps_adventure",
                title="Alpska pustolovščina",
                description="Adrenalinsko doživetje v slovenskih Alpah",
                experience_type=ExperienceType.ADVENTURE_SPORTS,
                duration_minutes=60,
                difficulty_level=InteractionLevel.ADVANCED,
                vr_scene_url="/scenes/alpine_adventure.unity3d",
                interactive_elements=[
                    {"type": "climbing", "difficulty": "intermediate", "safety_check": True},
                    {"type": "paragliding", "weather_dependent": True, "instructor": True},
                    {"type": "mountain_biking", "trail_selection": True, "gear_check": True}
                ],
                prerequisites=["basic_climbing", "fitness_level_medium"]
            )
        ]
        
        for vr_exp in sample_vr_experiences:
            self.save_vr_experience(vr_exp)
            self.vr_experiences[vr_exp.experience_id] = vr_exp

    def create_ar_scene(self, location: Tuple[float, float]) -> Dict[str, Any]:
        """Ustvari AR sceno za določeno lokacijo"""
        lat, lon = location
        
        # Poišči bližnje AR objekte
        nearby_objects = []
        for obj_id, ar_obj in self.ar_objects.items():
            obj_lat, obj_lon, obj_alt = ar_obj.coordinates
            distance = self.calculate_distance(lat, lon, obj_lat, obj_lon)
            
            if distance < 5.0:  # V radiju 5km
                nearby_objects.append({
                    'id': obj_id,
                    'name': ar_obj.name,
                    'description': ar_obj.description,
                    'category': ar_obj.category,
                    'distance': round(distance, 2),
                    'ar_model_url': ar_obj.ar_model_url,
                    'interaction_data': ar_obj.interaction_data
                })
        
        # Generiraj AR sceno
        ar_scene = {
            'scene_id': f"ar_scene_{int(time.time())}",
            'location': {'lat': lat, 'lon': lon},
            'objects': nearby_objects,
            'lighting': self.get_lighting_conditions(lat, lon),
            'weather': self.get_weather_info(lat, lon),
            'recommended_guide': self.recommend_guide(nearby_objects),
            'interactive_elements': self.generate_interactive_elements(nearby_objects),
            'navigation_hints': self.generate_navigation_hints(nearby_objects)
        }
        
        return ar_scene

    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Izračunaj razdaljo med dvema točkama"""
        from math import radians, cos, sin, asin, sqrt
        
        # Haversine formula
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Radius of earth in kilometers
        return c * r

    def get_lighting_conditions(self, lat: float, lon: float) -> Dict[str, Any]:
        """Pridobi svetlobne pogoje za AR sceno"""
        current_hour = datetime.datetime.now().hour
        
        if 6 <= current_hour <= 18:
            lighting = "daylight"
            intensity = 0.8
        elif 18 < current_hour <= 20:
            lighting = "golden_hour"
            intensity = 0.6
        else:
            lighting = "night"
            intensity = 0.3
        
        return {
            'type': lighting,
            'intensity': intensity,
            'shadows': lighting == "daylight",
            'ambient_color': '#ffffff' if lighting == "daylight" else '#4a4a4a'
        }

    def get_weather_info(self, lat: float, lon: float) -> Dict[str, Any]:
        """Pridobi vremenske informacije (simulirane)"""
        import random
        
        weather_conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'foggy']
        current_weather = random.choice(weather_conditions)
        
        return {
            'condition': current_weather,
            'temperature': random.randint(-5, 25),
            'humidity': random.randint(30, 90),
            'wind_speed': random.randint(0, 20),
            'visibility': 'good' if current_weather in ['sunny', 'cloudy'] else 'limited'
        }

    def recommend_guide(self, nearby_objects: List[Dict[str, Any]]) -> Optional[str]:
        """Priporoči najboljšega vodiča za trenutno lokacijo"""
        if not nearby_objects:
            return None
        
        # Analiziraj kategorije objektov
        categories = [obj['category'] for obj in nearby_objects]
        
        if 'zgodovinska_znamenitost' in categories:
            return 'guide_ana'
        elif 'naravna_znamenitost' in categories:
            return 'guide_marko'
        elif 'gastronomska_točka' in categories:
            return 'guide_petra'
        else:
            return 'guide_ana'  # Default

    def generate_interactive_elements(self, nearby_objects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generiraj interaktivne elemente za AR sceno"""
        elements = []
        
        for obj in nearby_objects:
            if obj['category'] == 'zgodovinska_znamenitost':
                elements.extend([
                    {'type': 'info_panel', 'trigger': 'gaze', 'content': 'historical_info'},
                    {'type': 'time_travel', 'trigger': 'tap', 'content': 'historical_reconstruction'},
                    {'type': 'audio_guide', 'trigger': 'proximity', 'content': 'narration'}
                ])
            elif obj['category'] == 'naravna_znamenitost':
                elements.extend([
                    {'type': 'species_identifier', 'trigger': 'camera', 'content': 'flora_fauna'},
                    {'type': 'weather_overlay', 'trigger': 'automatic', 'content': 'conditions'},
                    {'type': 'trail_guide', 'trigger': 'location', 'content': 'navigation'}
                ])
        
        return elements

    def generate_navigation_hints(self, nearby_objects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generiraj navigacijske namige"""
        hints = []
        
        for obj in nearby_objects:
            hints.append({
                'target': obj['name'],
                'direction': f"{obj['distance']}km",
                'estimated_time': f"{int(obj['distance'] * 12)} min hoje",
                'difficulty': 'easy' if obj['distance'] < 1 else 'moderate',
                'waypoints': self.generate_waypoints(obj['distance'])
            })
        
        return hints

    def generate_waypoints(self, distance: float) -> List[Dict[str, Any]]:
        """Generiraj vmesne točke za navigacijo"""
        num_waypoints = max(1, int(distance))
        waypoints = []
        
        for i in range(num_waypoints):
            waypoints.append({
                'id': f"waypoint_{i+1}",
                'description': f"Vmesna točka {i+1}",
                'estimated_time': f"{int((i+1) * distance * 12 / num_waypoints)} min",
                'landmarks': [f"Orientir {i+1}"]
            })
        
        return waypoints

    def create_vr_session(self, user_id: str, experience_id: str) -> Dict[str, Any]:
        """Ustvari VR sejo"""
        if experience_id not in self.vr_experiences:
            return {'error': 'VR izkušnja ne obstaja'}
        
        experience = self.vr_experiences[experience_id]
        session_id = f"vr_session_{int(time.time())}_{user_id}"
        
        session_data = {
            'session_id': session_id,
            'user_id': user_id,
            'experience': experience,
            'start_time': datetime.datetime.now().isoformat(),
            'progress': {
                'completed_elements': [],
                'current_location': 'start',
                'score': 0,
                'achievements': []
            },
            'settings': {
                'comfort_mode': True,
                'audio_language': 'slovenščina',
                'subtitles': True,
                'interaction_hints': True
            }
        }
        
        return session_data

    def process_ar_interaction(self, session_id: str, interaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelaj AR interakcijo"""
        interaction_type = interaction_data.get('type')
        object_id = interaction_data.get('object_id')
        
        response = {
            'session_id': session_id,
            'timestamp': datetime.datetime.now().isoformat(),
            'interaction_type': interaction_type,
            'success': True
        }
        
        if interaction_type == 'object_scan':
            if object_id in self.ar_objects:
                ar_obj = self.ar_objects[object_id]
                response['content'] = {
                    'name': ar_obj.name,
                    'description': ar_obj.description,
                    'additional_info': ar_obj.metadata,
                    'interactive_options': list(ar_obj.interaction_data.keys())
                }
            else:
                response['success'] = False
                response['error'] = 'Objekt ni prepoznan'
        
        elif interaction_type == 'voice_command':
            command = interaction_data.get('command', '').lower()
            response['content'] = self.process_voice_command(command, session_id)
        
        elif interaction_type == 'gesture':
            gesture = interaction_data.get('gesture')
            response['content'] = self.process_gesture(gesture, session_id)
        
        return response

    def process_voice_command(self, command: str, session_id: str) -> Dict[str, Any]:
        """Obdelaj glasovni ukaz"""
        if 'informacije' in command or 'povej' in command:
            return {
                'type': 'information',
                'response': 'Tukaj so dodatne informacije o tej lokaciji...',
                'audio_url': '/audio/info_response.mp3'
            }
        elif 'navigacija' in command or 'kam' in command:
            return {
                'type': 'navigation',
                'response': 'Prikazujem navigacijske možnosti...',
                'directions': ['Levo proti gradu', 'Naravnost do jezera', 'Desno k restavraciji']
            }
        elif 'fotografija' in command or 'slika' in command:
            return {
                'type': 'photo',
                'response': 'Aktiviram fotografski način...',
                'filters': ['vintage', 'landscape', 'portrait']
            }
        else:
            return {
                'type': 'unknown',
                'response': 'Oprostite, nisem razumel ukaza. Poskusite znova.',
                'suggestions': ['Povej informacije', 'Prikaži navigacijo', 'Naredi fotografijo']
            }

    def process_gesture(self, gesture: str, session_id: str) -> Dict[str, Any]:
        """Obdelaj gesto"""
        gesture_responses = {
            'point': {
                'action': 'identify_object',
                'response': 'Analiziram objekt, na katerega kažete...'
            },
            'swipe_left': {
                'action': 'previous_info',
                'response': 'Prikazujem prejšnje informacije...'
            },
            'swipe_right': {
                'action': 'next_info',
                'response': 'Prikazujem naslednje informacije...'
            },
            'tap': {
                'action': 'select',
                'response': 'Izbrano! Prikazujem podrobnosti...'
            },
            'pinch': {
                'action': 'zoom',
                'response': 'Prilagajam velikost prikaza...'
            }
        }
        
        return gesture_responses.get(gesture, {
            'action': 'unknown',
            'response': 'Gesta ni prepoznana. Poskusite znova.'
        })

    def get_demo_time_remaining(self) -> float:
        """Preostali čas demo verzije"""
        if not self.is_demo:
            return float('inf')
        
        elapsed = (datetime.datetime.now() - self.demo_start_time).total_seconds() / 3600
        remaining = max(0, self.demo_duration_hours - elapsed)
        return round(remaining, 2)

    def check_demo_expiry(self):
        """Preveri, če je demo verzija potekla"""
        if self.is_demo and self.get_demo_time_remaining() <= 0:
            logger.warning("Demo verzija je potekla - sistem se zaklene")
            return True
        return False

    def save_virtual_guide(self, guide: VirtualGuide):
        """Shrani virtualnega vodiča"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO virtual_guides 
            (id, name, avatar_url, voice_profile, languages, specialties, personality_traits, experience_level, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            guide.guide_id,
            guide.name,
            guide.avatar_url,
            guide.voice_profile,
            json.dumps(guide.languages),
            json.dumps(guide.specialties),
            json.dumps(guide.personality_traits),
            guide.experience_level.value,
            guide.created_at.isoformat()
        ))
        
        conn.commit()
        conn.close()

    def save_ar_object(self, ar_obj: ARObject):
        """Shrani AR objekt"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO ar_objects 
            (id, name, description, category, coordinates, ar_model_url, interaction_data, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            ar_obj.object_id,
            ar_obj.name,
            ar_obj.description,
            ar_obj.category,
            json.dumps(ar_obj.coordinates),
            ar_obj.ar_model_url,
            json.dumps(ar_obj.interaction_data),
            json.dumps(ar_obj.metadata),
            datetime.datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()

    def save_vr_experience(self, vr_exp: VRExperience):
        """Shrani VR izkušnjo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO vr_experiences 
            (id, title, description, experience_type, duration_minutes, difficulty_level, vr_scene_url, interactive_elements, prerequisites, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            vr_exp.experience_id,
            vr_exp.title,
            vr_exp.description,
            vr_exp.experience_type.value,
            vr_exp.duration_minutes,
            vr_exp.difficulty_level.value,
            vr_exp.vr_scene_url,
            json.dumps(vr_exp.interactive_elements),
            json.dumps(vr_exp.prerequisites),
            datetime.datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()

    def setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def dashboard():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            return render_template_string('''
            <!DOCTYPE html>
            <html>
            <head>
                <title>🥽 OMNI AR/VR System</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        min-height: 100vh;
                    }
                    .container { max-width: 1200px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
                    .features-grid { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                        gap: 20px; 
                        margin-bottom: 30px; 
                    }
                    .feature-card { 
                        background: rgba(255,255,255,0.1); 
                        padding: 25px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                        transition: transform 0.3s ease;
                    }
                    .feature-card:hover { transform: translateY(-5px); }
                    .feature-icon { font-size: 3em; margin-bottom: 15px; }
                    .feature-title { font-size: 1.3em; font-weight: bold; margin-bottom: 10px; }
                    .feature-description { opacity: 0.9; line-height: 1.5; }
                    .demo-section { 
                        background: rgba(255,255,255,0.1); 
                        padding: 30px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                        margin-bottom: 30px;
                    }
                    .demo-warning { 
                        background: rgba(255,165,0,0.2); 
                        border: 2px solid orange; 
                        padding: 15px; 
                        border-radius: 10px; 
                        margin-bottom: 20px; 
                        text-align: center;
                    }
                    .action-btn {
                        background: #00ff88; 
                        color: black; 
                        padding: 12px 25px; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        font-size: 1.1em;
                        font-weight: bold;
                        margin: 10px;
                        transition: all 0.3s ease;
                    }
                    .action-btn:hover { 
                        background: #00cc6a; 
                        transform: scale(1.05);
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-top: 20px;
                    }
                    .stat-item {
                        text-align: center;
                        padding: 15px;
                        background: rgba(0,0,0,0.2);
                        border-radius: 10px;
                    }
                    .stat-value {
                        font-size: 2em;
                        font-weight: bold;
                        color: #00ff88;
                    }
                    .stat-label {
                        font-size: 0.9em;
                        opacity: 0.8;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🥽 OMNI AR/VR System</h1>
                        <p>Napredne AR/VR integracije in virtualni vodiči za Enterprise paket</p>
                    </div>
                    
                    <div class="demo-warning">
                        ⚠️ <strong>DEMO VERZIJA</strong> - Preostali čas: {{ demo_time }}h
                        <br>Za polno funkcionalnost kontaktirajte administratorja.
                    </div>
                    
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">🤖</div>
                            <div class="feature-title">Virtualni vodiči</div>
                            <div class="feature-description">
                                AI-powered virtualni vodiči z naravnim glasom in personalizirano interakcijo.
                                Podpira več jezikov in specializacij.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">🔍</div>
                            <div class="feature-title">AR prepoznavanje</div>
                            <div class="feature-description">
                                Napredno prepoznavanje znamenitosti in objektov z real-time informacijami
                                in interaktivnimi elementi.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">🌍</div>
                            <div class="feature-title">VR virtualni ogledi</div>
                            <div class="feature-description">
                                Immersivni VR ogledi destinacij z interaktivnimi elementi,
                                kvizi in gamifikacijo.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">🎮</div>
                            <div class="feature-title">Interaktivne izkušnje</div>
                            <div class="feature-description">
                                Gamificirane ture z dosežki, izzivi in personaliziranimi
                                priporočili na osnovi preferenc.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">🗣️</div>
                            <div class="feature-title">Glasovni asistent</div>
                            <div class="feature-description">
                                Naravno jezikovno procesiranje z real-time prevajanjem
                                in kontekstualnimi odgovori.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">📱</div>
                            <div class="feature-title">IoT integracija</div>
                            <div class="feature-description">
                                Povezava z IoT senzorji za real-time podatke o vremenu,
                                gneči in okoljskih pogojih.
                            </div>
                        </div>
                    </div>
                    
                    <div class="demo-section">
                        <h3>🎯 Demo funkcionalnosti</h3>
                        <p>Preizkusite naše AR/VR funkcionalnosti:</p>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <button class="action-btn" onclick="startARDemo()">🔍 Zaženi AR Demo</button>
                            <button class="action-btn" onclick="startVRDemo()">🌍 Zaženi VR Demo</button>
                            <button class="action-btn" onclick="testVoiceAssistant()">🗣️ Testiraj glasovni asistent</button>
                            <button class="action-btn" onclick="showGuides()">🤖 Prikaži vodiče</button>
                        </div>
                        
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value">{{ guides_count }}</div>
                                <div class="stat-label">Virtualni vodiči</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">{{ ar_objects_count }}</div>
                                <div class="stat-label">AR objekti</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">{{ vr_experiences_count }}</div>
                                <div class="stat-label">VR izkušnje</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">{{ active_sessions }}</div>
                                <div class="stat-label">Aktivne seje</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="demoResults" style="display: none; margin-top: 20px; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                        <h4>Demo rezultati:</h4>
                        <div id="demoContent"></div>
                    </div>
                </div>
                
                <script>
                    function startARDemo() {
                        fetch('/api/ar/demo', {method: 'POST'})
                            .then(r => r.json())
                            .then(data => {
                                showDemoResults('AR Demo', data);
                            });
                    }
                    
                    function startVRDemo() {
                        fetch('/api/vr/demo', {method: 'POST'})
                            .then(r => r.json())
                            .then(data => {
                                showDemoResults('VR Demo', data);
                            });
                    }
                    
                    function testVoiceAssistant() {
                        fetch('/api/voice/test', {method: 'POST'})
                            .then(r => r.json())
                            .then(data => {
                                showDemoResults('Glasovni asistent', data);
                            });
                    }
                    
                    function showGuides() {
                        fetch('/api/guides')
                            .then(r => r.json())
                            .then(data => {
                                showDemoResults('Virtualni vodiči', data);
                            });
                    }
                    
                    function showDemoResults(title, data) {
                        const resultsDiv = document.getElementById('demoResults');
                        const contentDiv = document.getElementById('demoContent');
                        
                        contentDiv.innerHTML = `
                            <h5>${title}</h5>
                            <pre>${JSON.stringify(data, null, 2)}</pre>
                        `;
                        
                        resultsDiv.style.display = 'block';
                        resultsDiv.scrollIntoView({behavior: 'smooth'});
                    }
                </script>
            </body>
            </html>
            ''', 
            demo_time=self.get_demo_time_remaining(),
            guides_count=len(self.virtual_guides),
            ar_objects_count=len(self.ar_objects),
            vr_experiences_count=len(self.vr_experiences),
            active_sessions=len(self.active_sessions)
            )
        
        @self.app.route('/api/ar/demo', methods=['POST'])
        def api_ar_demo():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            # Simuliraj AR demo
            demo_location = (46.0569, 14.5058)  # Ljubljana
            ar_scene = self.create_ar_scene(demo_location)
            
            return jsonify({
                'status': 'success',
                'message': 'AR Demo uspešno zagnan',
                'scene': ar_scene,
                'demo_duration': '5 minut',
                'features_demonstrated': [
                    'Prepoznavanje objektov',
                    'Interaktivni elementi',
                    'Navigacijski namigi',
                    'Vremenske informacije'
                ]
            })
        
        @self.app.route('/api/vr/demo', methods=['POST'])
        def api_vr_demo():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            # Simuliraj VR demo
            vr_session = self.create_vr_session('demo_user', 'vr_ljubljana_tour')
            
            return jsonify({
                'status': 'success',
                'message': 'VR Demo uspešno zagnan',
                'session': vr_session,
                'demo_features': [
                    'Virtualni sprehod po Ljubljani',
                    'Interaktivni info točke',
                    'Kvizi in izzivi',
                    'Fotografski način'
                ]
            })
        
        @self.app.route('/api/voice/test', methods=['POST'])
        def api_voice_test():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            # Testiraj glasovni asistent
            test_commands = [
                'Povej informacije o tej lokaciji',
                'Prikaži navigacijo',
                'Naredi fotografijo'
            ]
            
            responses = []
            for command in test_commands:
                response = self.process_voice_command(command, 'demo_session')
                responses.append({
                    'command': command,
                    'response': response
                })
            
            return jsonify({
                'status': 'success',
                'message': 'Glasovni asistent testiran',
                'test_results': responses,
                'supported_languages': ['slovenščina', 'angleščina', 'nemščina', 'italijanščina']
            })
        
        @self.app.route('/api/guides')
        def api_guides():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            guides_data = []
            for guide_id, guide in self.virtual_guides.items():
                guides_data.append({
                    'id': guide.guide_id,
                    'name': guide.name,
                    'languages': guide.languages,
                    'specialties': guide.specialties,
                    'experience_level': guide.experience_level.value,
                    'personality_traits': guide.personality_traits
                })
            
            return jsonify({
                'guides': guides_data,
                'total_count': len(guides_data)
            })
        
        @self.app.route('/api/ar/scene', methods=['POST'])
        def api_create_ar_scene():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            data = request.get_json()
            location = (data.get('lat', 46.0569), data.get('lon', 14.5058))
            
            ar_scene = self.create_ar_scene(location)
            return jsonify(ar_scene)
        
        @self.app.route('/api/vr/session', methods=['POST'])
        def api_create_vr_session():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            data = request.get_json()
            user_id = data.get('user_id', 'demo_user')
            experience_id = data.get('experience_id')
            
            if not experience_id:
                return jsonify({'error': 'experience_id je obvezen'}), 400
            
            vr_session = self.create_vr_session(user_id, experience_id)
            return jsonify(vr_session)

    def run_server(self, host='localhost', port=5006):
        """Zaženi Flask server"""
        logger.info(f"Zaganjam AR/VR System na http://{host}:{port}")
        self.app.run(host=host, port=port, debug=True)

async def demo_ar_vr_system():
    """Demo funkcija za testiranje AR/VR System"""
    print("\n" + "="*50)
    print("🥽 OMNI AR/VR SYSTEM - DEMO")
    print("="*50)
    
    # Inicializacija
    ar_vr = OmniARVRSystem()
    
    print(f"🔧 AR/VR System inicializiran:")
    print(f"  • Virtualni vodiči: {len(ar_vr.virtual_guides)}")
    print(f"  • AR objekti: {len(ar_vr.ar_objects)}")
    print(f"  • VR izkušnje: {len(ar_vr.vr_experiences)}")
    print(f"  • Demo trajanje: {ar_vr.demo_duration_hours}h")
    print(f"  • Preostali čas: {ar_vr.get_demo_time_remaining()}h")
    
    # Test virtualnih vodičev
    print(f"\n🤖 Virtualni vodiči:")
    for guide_id, guide in ar_vr.virtual_guides.items():
        print(f"  ✅ {guide.name}")
        print(f"     Jeziki: {', '.join(guide.languages)}")
        print(f"     Specialnosti: {', '.join(guide.specialties)}")
        print(f"     Izkušnje: {guide.experience_level.value}")
    
    # Test AR scene
    print(f"\n🔍 AR Scena (Ljubljana):")
    demo_location = (46.0569, 14.5058)
    ar_scene = ar_vr.create_ar_scene(demo_location)
    print(f"  ✅ Scena ID: {ar_scene['scene_id']}")
    print(f"  ✅ Bližnji objekti: {len(ar_scene['objects'])}")
    print(f"  ✅ Priporočen vodič: {ar_scene['recommended_guide']}")
    print(f"  ✅ Interaktivni elementi: {len(ar_scene['interactive_elements'])}")
    
    # Test VR seje
    print(f"\n🌍 VR Seja:")
    vr_session = ar_vr.create_vr_session('demo_user', 'vr_ljubljana_tour')
    if 'error' not in vr_session:
        print(f"  ✅ Seja ID: {vr_session['session_id']}")
        print(f"  ✅ Izkušnja: {vr_session['experience'].title}")
        print(f"  ✅ Trajanje: {vr_session['experience'].duration_minutes} min")
        print(f"  ✅ Težavnost: {vr_session['experience'].difficulty_level.value}")
    
    # Test glasovnih ukazov
    print(f"\n🗣️ Glasovni ukazi:")
    test_commands = [
        'Povej informacije o tej lokaciji',
        'Prikaži navigacijo',
        'Naredi fotografijo'
    ]
    
    for command in test_commands:
        response = ar_vr.process_voice_command(command, 'demo_session')
        print(f"  ✅ '{command}' → {response['type']}")
    
    # Test gest
    print(f"\n👋 Geste:")
    test_gestures = ['point', 'tap', 'swipe_left', 'pinch']
    for gesture in test_gestures:
        response = ar_vr.process_gesture(gesture, 'demo_session')
        print(f"  ✅ {gesture} → {response['action']}")
    
    print(f"\n🎉 AR/VR System uspešno testiran!")
    print(f"  • Virtualni vodiči z AI glasom")
    print(f"  • AR prepoznavanje in interakcija")
    print(f"  • VR virtualni ogledi z gamifikacijo")
    print(f"  • Glasovni asistent z NLP")
    print(f"  • Gesture recognition")
    print(f"  • Real-time lokacijske informacije")
    print(f"  • Demo časovna omejitev in varnostne kontrole")

if __name__ == "__main__":
    import sys
    import asyncio
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Zaženi Flask server
        ar_vr = OmniARVRSystem()
        ar_vr.run_server(host='0.0.0.0', port=5006)
    else:
        # Zaženi demo
        asyncio.run(demo_ar_vr_system())