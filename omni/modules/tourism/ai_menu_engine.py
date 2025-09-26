"""
🤖 AI Menu Engine - Inteligentni predlogi menijev
AI sistem za generiranje menijev glede na sezono, zaloge, lokalne surovine in preference
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import random
import math
from collections import defaultdict

logger = logging.getLogger(__name__)

class Season(Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"

class DietaryRestriction(Enum):
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    GLUTEN_FREE = "gluten_free"
    DAIRY_FREE = "dairy_free"
    KETO = "keto"
    HALAL = "halal"
    KOSHER = "kosher"

class MealType(Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"
    DESSERT = "dessert"
    BEVERAGE = "beverage"

@dataclass
class Ingredient:
    """Sestavina"""
    ingredient_id: str
    name: str
    category: str
    seasonal_availability: List[Season]
    local_source: bool
    cost_per_unit: float
    current_stock: int
    min_stock: int
    nutritional_info: Dict[str, float]
    allergens: List[str]
    dietary_tags: List[DietaryRestriction]

@dataclass
class Recipe:
    """Recept"""
    recipe_id: str
    name: str
    description: str
    meal_type: MealType
    ingredients: List[Dict[str, Any]]  # {ingredient_id, quantity, unit}
    instructions: List[str]
    prep_time: int  # minute
    cook_time: int  # minute
    servings: int
    difficulty: int  # 1-5
    cost_per_serving: float
    selling_price: float
    dietary_tags: List[DietaryRestriction]
    seasonal_score: Dict[Season, float]
    popularity_score: float

@dataclass
class MenuSuggestion:
    """Predlog menija"""
    menu_id: str
    name: str
    date: date
    meal_type: MealType
    recipes: List[Recipe]
    total_cost: float
    total_price: float
    profit_margin: float
    seasonal_score: float
    availability_score: float
    popularity_score: float
    overall_score: float

class AIMenuEngine:
    """AI Engine za predloge menijev"""
    
    def __init__(self, db_path: str = "menu_ai.db"):
        self.db_path = db_path
        self._init_database()
        self._load_seasonal_data()
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela sestavin
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ingredients (
                    ingredient_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    seasonal_availability TEXT NOT NULL,
                    local_source BOOLEAN DEFAULT 0,
                    cost_per_unit REAL NOT NULL,
                    current_stock INTEGER DEFAULT 0,
                    min_stock INTEGER DEFAULT 0,
                    nutritional_info TEXT,
                    allergens TEXT,
                    dietary_tags TEXT
                )
            ''')
            
            # Tabela receptov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS recipes (
                    recipe_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    meal_type TEXT NOT NULL,
                    ingredients TEXT NOT NULL,
                    instructions TEXT NOT NULL,
                    prep_time INTEGER NOT NULL,
                    cook_time INTEGER NOT NULL,
                    servings INTEGER NOT NULL,
                    difficulty INTEGER NOT NULL,
                    cost_per_serving REAL NOT NULL,
                    selling_price REAL NOT NULL,
                    dietary_tags TEXT,
                    seasonal_score TEXT,
                    popularity_score REAL DEFAULT 0
                )
            ''')
            
            # Tabela predlogov menijev
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS menu_suggestions (
                    menu_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    meal_type TEXT NOT NULL,
                    recipes TEXT NOT NULL,
                    total_cost REAL NOT NULL,
                    total_price REAL NOT NULL,
                    profit_margin REAL NOT NULL,
                    seasonal_score REAL NOT NULL,
                    availability_score REAL NOT NULL,
                    popularity_score REAL NOT NULL,
                    overall_score REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    is_approved BOOLEAN DEFAULT 0
                )
            ''')
            
            # Tabela prodajnih podatkov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sales_history (
                    sale_id TEXT PRIMARY KEY,
                    recipe_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    quantity_sold INTEGER NOT NULL,
                    revenue REAL NOT NULL,
                    customer_rating REAL,
                    weather_condition TEXT,
                    special_event TEXT
                )
            ''')
            
            conn.commit()
            logger.info("🤖 AI Menu baza podatkov inicializirana")
    
    def _load_seasonal_data(self):
        """Naloži sezonske podatke"""
        self.seasonal_ingredients = {
            Season.SPRING: ["asparagus", "artichoke", "peas", "radish", "spinach", "strawberry"],
            Season.SUMMER: ["tomato", "cucumber", "zucchini", "peach", "berry", "corn"],
            Season.AUTUMN: ["pumpkin", "apple", "pear", "mushroom", "chestnut", "grape"],
            Season.WINTER: ["cabbage", "potato", "carrot", "citrus", "root_vegetables", "game"]
        }
        
        self.seasonal_preferences = {
            Season.SPRING: {"light": 0.8, "fresh": 0.9, "warm": 0.6},
            Season.SUMMER: {"cold": 0.9, "fresh": 1.0, "light": 0.9},
            Season.AUTUMN: {"warm": 0.8, "hearty": 0.7, "comfort": 0.8},
            Season.WINTER: {"warm": 1.0, "hearty": 0.9, "comfort": 1.0}
        }
    
    def get_current_season(self) -> Season:
        """Določi trenutno sezono"""
        month = datetime.now().month
        if month in [3, 4, 5]:
            return Season.SPRING
        elif month in [6, 7, 8]:
            return Season.SUMMER
        elif month in [9, 10, 11]:
            return Season.AUTUMN
        else:
            return Season.WINTER
    
    def add_ingredient(self, ingredient: Ingredient) -> Dict[str, Any]:
        """Dodaj sestavino"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO ingredients 
                    (ingredient_id, name, category, seasonal_availability, local_source,
                     cost_per_unit, current_stock, min_stock, nutritional_info, allergens, dietary_tags)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    ingredient.ingredient_id,
                    ingredient.name,
                    ingredient.category,
                    json.dumps([s.value for s in ingredient.seasonal_availability]),
                    ingredient.local_source,
                    ingredient.cost_per_unit,
                    ingredient.current_stock,
                    ingredient.min_stock,
                    json.dumps(ingredient.nutritional_info),
                    json.dumps(ingredient.allergens),
                    json.dumps([d.value for d in ingredient.dietary_tags])
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "ingredient_id": ingredient.ingredient_id,
                    "message": f"Sestavina {ingredient.name} uspešno dodana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju sestavine: {e}")
            return {"success": False, "error": str(e)}
    
    def add_recipe(self, recipe: Recipe) -> Dict[str, Any]:
        """Dodaj recept"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO recipes 
                    (recipe_id, name, description, meal_type, ingredients, instructions,
                     prep_time, cook_time, servings, difficulty, cost_per_serving, selling_price,
                     dietary_tags, seasonal_score, popularity_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    recipe.recipe_id,
                    recipe.name,
                    recipe.description,
                    recipe.meal_type.value,
                    json.dumps(recipe.ingredients),
                    json.dumps(recipe.instructions),
                    recipe.prep_time,
                    recipe.cook_time,
                    recipe.servings,
                    recipe.difficulty,
                    recipe.cost_per_serving,
                    recipe.selling_price,
                    json.dumps([d.value for d in recipe.dietary_tags]),
                    json.dumps({s.value: score for s, score in recipe.seasonal_score.items()}),
                    recipe.popularity_score
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "recipe_id": recipe.recipe_id,
                    "message": f"Recept {recipe.name} uspešno dodan"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju recepta: {e}")
            return {"success": False, "error": str(e)}
    
    def calculate_ingredient_availability(self, ingredient_id: str) -> float:
        """Izračunaj razpoložljivost sestavine"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT current_stock, min_stock FROM ingredients 
                WHERE ingredient_id = ?
            ''', (ingredient_id,))
            
            result = cursor.fetchone()
            if not result:
                return 0.0
            
            current_stock, min_stock = result
            
            if current_stock <= min_stock:
                return 0.1  # Nizka razpoložljivost
            elif current_stock <= min_stock * 2:
                return 0.5  # Srednja razpoložljivost
            else:
                return 1.0  # Visoka razpoložljivost
    
    def calculate_seasonal_score(self, recipe: Recipe, target_season: Season) -> float:
        """Izračunaj sezonski rezultat recepta"""
        if target_season in recipe.seasonal_score:
            base_score = recipe.seasonal_score[target_season]
        else:
            base_score = 0.5
        
        # Dodatni bonus za lokalne sezonske sestavine
        seasonal_bonus = 0.0
        total_ingredients = len(recipe.ingredients)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            for ingredient_data in recipe.ingredients:
                ingredient_id = ingredient_data['ingredient_id']
                
                cursor.execute('''
                    SELECT seasonal_availability, local_source 
                    FROM ingredients WHERE ingredient_id = ?
                ''', (ingredient_id,))
                
                result = cursor.fetchone()
                if result:
                    seasonal_availability = json.loads(result[0])
                    local_source = result[1]
                    
                    if target_season.value in seasonal_availability:
                        seasonal_bonus += 0.1
                        if local_source:
                            seasonal_bonus += 0.1
        
        return min(1.0, base_score + (seasonal_bonus / total_ingredients))
    
    def calculate_availability_score(self, recipe: Recipe) -> float:
        """Izračunaj rezultat razpoložljivosti sestavin"""
        availability_scores = []
        
        for ingredient_data in recipe.ingredients:
            ingredient_id = ingredient_data['ingredient_id']
            availability = self.calculate_ingredient_availability(ingredient_id)
            availability_scores.append(availability)
        
        return sum(availability_scores) / len(availability_scores) if availability_scores else 0.0
    
    def update_popularity_scores(self):
        """Posodobi rezultate priljubljenosti na podlagi prodajnih podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Izračunaj priljubljenost na podlagi zadnjih 30 dni
            cursor.execute('''
                SELECT 
                    recipe_id,
                    SUM(quantity_sold) as total_sold,
                    AVG(customer_rating) as avg_rating,
                    COUNT(*) as sale_count
                FROM sales_history 
                WHERE date >= date('now', '-30 days')
                GROUP BY recipe_id
            ''', )
            
            for row in cursor.fetchall():
                recipe_id, total_sold, avg_rating, sale_count = row
                
                # Kombiniran rezultat priljubljenosti
                popularity_score = (
                    (total_sold / 100) * 0.4 +  # Količina prodaje
                    (avg_rating / 5) * 0.4 +    # Ocena strank
                    (sale_count / 30) * 0.2     # Pogostost prodaje
                )
                
                popularity_score = min(1.0, popularity_score)
                
                cursor.execute('''
                    UPDATE recipes SET popularity_score = ? WHERE recipe_id = ?
                ''', (popularity_score, recipe_id))
            
            conn.commit()
            logger.info("📊 Rezultati priljubljenosti posodobljeni")
    
    def generate_menu_suggestions(self, target_date: date, meal_type: MealType,
                                 dietary_restrictions: List[DietaryRestriction] = None,
                                 max_suggestions: int = 5) -> List[MenuSuggestion]:
        """Generiraj predloge menijev"""
        try:
            # Posodobi rezultate priljubljenosti
            self.update_popularity_scores()
            
            target_season = self._get_season_for_date(target_date)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi vse recepte za določen tip obroka
                query = '''
                    SELECT * FROM recipes WHERE meal_type = ?
                '''
                params = [meal_type.value]
                
                cursor.execute(query, params)
                recipes_data = cursor.fetchall()
                
                # Pretvori v Recipe objekte
                recipes = []
                for row in recipes_data:
                    recipe = Recipe(
                        recipe_id=row[0],
                        name=row[1],
                        description=row[2],
                        meal_type=MealType(row[3]),
                        ingredients=json.loads(row[4]),
                        instructions=json.loads(row[5]),
                        prep_time=row[6],
                        cook_time=row[7],
                        servings=row[8],
                        difficulty=row[9],
                        cost_per_serving=row[10],
                        selling_price=row[11],
                        dietary_tags=[DietaryRestriction(tag) for tag in json.loads(row[12])],
                        seasonal_score={Season(k): v for k, v in json.loads(row[13]).items()},
                        popularity_score=row[14]
                    )
                    
                    # Filtriraj po dietnih omejitvah
                    if dietary_restrictions:
                        if not all(restriction in recipe.dietary_tags for restriction in dietary_restrictions):
                            continue
                    
                    recipes.append(recipe)
                
                # Oceni recepte
                scored_recipes = []
                for recipe in recipes:
                    seasonal_score = self.calculate_seasonal_score(recipe, target_season)
                    availability_score = self.calculate_availability_score(recipe)
                    popularity_score = recipe.popularity_score
                    
                    # Skupni rezultat
                    overall_score = (
                        seasonal_score * 0.3 +
                        availability_score * 0.4 +
                        popularity_score * 0.3
                    )
                    
                    scored_recipes.append({
                        'recipe': recipe,
                        'seasonal_score': seasonal_score,
                        'availability_score': availability_score,
                        'popularity_score': popularity_score,
                        'overall_score': overall_score
                    })
                
                # Razvrsti po skupnem rezultatu
                scored_recipes.sort(key=lambda x: x['overall_score'], reverse=True)
                
                # Ustvari predloge menijev
                suggestions = []
                for i, scored_recipe in enumerate(scored_recipes[:max_suggestions]):
                    recipe = scored_recipe['recipe']
                    
                    suggestion = MenuSuggestion(
                        menu_id=f"MENU_{target_date.isoformat()}_{meal_type.value}_{i+1}",
                        name=f"{recipe.name} - {target_date.strftime('%d.%m.%Y')}",
                        date=target_date,
                        meal_type=meal_type,
                        recipes=[recipe],
                        total_cost=recipe.cost_per_serving,
                        total_price=recipe.selling_price,
                        profit_margin=((recipe.selling_price - recipe.cost_per_serving) / recipe.selling_price * 100),
                        seasonal_score=scored_recipe['seasonal_score'],
                        availability_score=scored_recipe['availability_score'],
                        popularity_score=scored_recipe['popularity_score'],
                        overall_score=scored_recipe['overall_score']
                    )
                    
                    suggestions.append(suggestion)
                
                # Shrani predloge v bazo
                for suggestion in suggestions:
                    self._save_menu_suggestion(suggestion)
                
                return suggestions
                
        except Exception as e:
            logger.error(f"Napaka pri generiranju predlogov: {e}")
            return []
    
    def _get_season_for_date(self, target_date: date) -> Season:
        """Določi sezono za določen datum"""
        month = target_date.month
        if month in [3, 4, 5]:
            return Season.SPRING
        elif month in [6, 7, 8]:
            return Season.SUMMER
        elif month in [9, 10, 11]:
            return Season.AUTUMN
        else:
            return Season.WINTER
    
    def _save_menu_suggestion(self, suggestion: MenuSuggestion):
        """Shrani predlog menija v bazo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO menu_suggestions 
                    (menu_id, name, date, meal_type, recipes, total_cost, total_price,
                     profit_margin, seasonal_score, availability_score, popularity_score,
                     overall_score, created_at, is_approved)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    suggestion.menu_id,
                    suggestion.name,
                    suggestion.date.isoformat(),
                    suggestion.meal_type.value,
                    json.dumps([asdict(recipe) for recipe in suggestion.recipes]),
                    suggestion.total_cost,
                    suggestion.total_price,
                    suggestion.profit_margin,
                    suggestion.seasonal_score,
                    suggestion.availability_score,
                    suggestion.popularity_score,
                    suggestion.overall_score,
                    datetime.now().isoformat(),
                    False
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju predloga: {e}")
    
    def generate_weekly_menu(self, start_date: date) -> Dict[str, Any]:
        """Generiraj tedenski meni"""
        weekly_menu = {
            "week_start": start_date.isoformat(),
            "week_end": (start_date + timedelta(days=6)).isoformat(),
            "daily_menus": {},
            "total_cost": 0.0,
            "total_revenue": 0.0,
            "profit_margin": 0.0
        }
        
        meal_types = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
        
        for day in range(7):
            current_date = start_date + timedelta(days=day)
            day_name = current_date.strftime('%A')
            
            daily_menu = {
                "date": current_date.isoformat(),
                "day_name": day_name,
                "meals": {}
            }
            
            for meal_type in meal_types:
                suggestions = self.generate_menu_suggestions(
                    current_date, meal_type, max_suggestions=1
                )
                
                if suggestions:
                    suggestion = suggestions[0]
                    daily_menu["meals"][meal_type.value] = {
                        "menu_id": suggestion.menu_id,
                        "name": suggestion.name,
                        "recipes": [recipe.name for recipe in suggestion.recipes],
                        "cost": suggestion.total_cost,
                        "price": suggestion.total_price,
                        "profit_margin": suggestion.profit_margin
                    }
                    
                    weekly_menu["total_cost"] += suggestion.total_cost
                    weekly_menu["total_revenue"] += suggestion.total_price
            
            weekly_menu["daily_menus"][day_name] = daily_menu
        
        # Izračunaj skupno maržo
        if weekly_menu["total_revenue"] > 0:
            weekly_menu["profit_margin"] = (
                (weekly_menu["total_revenue"] - weekly_menu["total_cost"]) / 
                weekly_menu["total_revenue"] * 100
            )
        
        return weekly_menu
    
    def analyze_menu_performance(self, menu_id: str) -> Dict[str, Any]:
        """Analiziraj uspešnost menija"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Pridobi podatke o meniju
            cursor.execute('''
                SELECT * FROM menu_suggestions WHERE menu_id = ?
            ''', (menu_id,))
            
            menu_data = cursor.fetchone()
            if not menu_data:
                return {"error": "Meni ne obstaja"}
            
            # Pridobi prodajne podatke
            recipes = json.loads(menu_data[4])
            recipe_ids = [recipe['recipe_id'] for recipe in recipes]
            
            performance_data = {}
            for recipe_id in recipe_ids:
                cursor.execute('''
                    SELECT 
                        SUM(quantity_sold) as total_sold,
                        SUM(revenue) as total_revenue,
                        AVG(customer_rating) as avg_rating,
                        COUNT(*) as sale_days
                    FROM sales_history 
                    WHERE recipe_id = ? AND date >= ?
                ''', (recipe_id, menu_data[2]))  # datum menija
                
                result = cursor.fetchone()
                if result:
                    performance_data[recipe_id] = {
                        "total_sold": result[0] or 0,
                        "total_revenue": result[1] or 0,
                        "avg_rating": result[2] or 0,
                        "sale_days": result[3] or 0
                    }
            
            return {
                "menu_id": menu_id,
                "menu_name": menu_data[1],
                "predicted_scores": {
                    "seasonal": menu_data[8],
                    "availability": menu_data[9],
                    "popularity": menu_data[10],
                    "overall": menu_data[11]
                },
                "actual_performance": performance_data,
                "analysis_date": datetime.now().isoformat()
            }

# Primer uporabe
if __name__ == "__main__":
    ai_menu = AIMenuEngine()
    
    # Dodaj testno sestavino
    ingredient = Ingredient(
        ingredient_id="ING001",
        name="Paradižnik",
        category="Zelenjava",
        seasonal_availability=[Season.SUMMER, Season.AUTUMN],
        local_source=True,
        cost_per_unit=2.50,
        current_stock=50,
        min_stock=10,
        nutritional_info={"calories": 18, "protein": 0.9, "carbs": 3.9},
        allergens=[],
        dietary_tags=[DietaryRestriction.VEGETARIAN, DietaryRestriction.VEGAN]
    )
    
    result = ai_menu.add_ingredient(ingredient)
    print(f"Dodajanje sestavine: {result}")
    
    # Dodaj testni recept
    recipe = Recipe(
        recipe_id="REC001",
        name="Paradižnikova juha",
        description="Kremna paradižnikova juha z baziliko",
        meal_type=MealType.LUNCH,
        ingredients=[{"ingredient_id": "ING001", "quantity": 500, "unit": "g"}],
        instructions=["Narežite paradižnike", "Kuhajte 20 minut", "Zmešajte"],
        prep_time=15,
        cook_time=20,
        servings=4,
        difficulty=2,
        cost_per_serving=3.50,
        selling_price=8.00,
        dietary_tags=[DietaryRestriction.VEGETARIAN],
        seasonal_score={Season.SUMMER: 0.9, Season.AUTUMN: 0.8},
        popularity_score=0.7
    )
    
    result = ai_menu.add_recipe(recipe)
    print(f"Dodajanje recepta: {result}")
    
    # Generiraj predloge menijev
    suggestions = ai_menu.generate_menu_suggestions(
        date.today(), MealType.LUNCH, max_suggestions=3
    )
    
    print(f"Predlogi menijev: {len(suggestions)}")
    for suggestion in suggestions:
        print(f"- {suggestion.name}: {suggestion.overall_score:.2f}")
    
    # Generiraj tedenski meni
    weekly_menu = ai_menu.generate_weekly_menu(date.today())
    print(f"Tedenski meni: {json.dumps(weekly_menu, indent=2, ensure_ascii=False)}")