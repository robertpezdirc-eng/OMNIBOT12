"""
🍽️ ULTIMATE AI CHEF SYSTEM
==================================================
Napredni AI Chef sistem za predloge menijev glede na sezono, zaloge, lokalne surovine z optimizacijo

Funkcionalnosti:
- Sezonski predlogi menijev
- Optimizacija glede na zaloge
- Lokalne surovine in dobavitelje
- Kalkulacija stroškov in marže
- Nutritivna analiza
- Alergeni in diete
- Kreativni predlogi kombinacij
- Analiza priljubljenosti jedi
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import random
import math

class SeasonType(Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"

class DietType(Enum):
    STANDARD = "standard"
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    GLUTEN_FREE = "gluten_free"
    KETO = "keto"
    PALEO = "paleo"
    MEDITERRANEAN = "mediterranean"

class CuisineType(Enum):
    SLOVENIAN = "slovenian"
    ITALIAN = "italian"
    BALKAN = "balkan"
    MEDITERRANEAN = "mediterranean"
    INTERNATIONAL = "international"
    FUSION = "fusion"

class IngredientCategory(Enum):
    MEAT = "meat"
    FISH = "fish"
    VEGETABLES = "vegetables"
    FRUITS = "fruits"
    DAIRY = "dairy"
    GRAINS = "grains"
    HERBS = "herbs"
    SPICES = "spices"

class MenuCategory(Enum):
    APPETIZER = "appetizer"
    SOUP = "soup"
    MAIN_COURSE = "main_course"
    DESSERT = "dessert"
    BEVERAGE = "beverage"
    SIDE_DISH = "side_dish"

class Ingredient:
    def __init__(self, name: str, category: IngredientCategory, 
                 seasonal_availability: List[SeasonType], 
                 local_supplier: str = None, price_per_kg: float = 0.0,
                 nutritional_info: Dict = None, allergens: List[str] = None):
        self.name = name
        self.category = category
        self.seasonal_availability = seasonal_availability
        self.local_supplier = local_supplier
        self.price_per_kg = price_per_kg
        self.nutritional_info = nutritional_info or {}
        self.allergens = allergens or []
        self.current_stock = 0.0
        self.min_stock = 0.0

class Recipe:
    def __init__(self, name: str, category: MenuCategory, cuisine: CuisineType,
                 ingredients: Dict[str, float], instructions: List[str],
                 prep_time: int, cook_time: int, servings: int = 4,
                 difficulty: int = 1, diet_types: List[DietType] = None):
        self.id = None
        self.name = name
        self.category = category
        self.cuisine = cuisine
        self.ingredients = ingredients  # {ingredient_name: quantity_kg}
        self.instructions = instructions
        self.prep_time = prep_time
        self.cook_time = cook_time
        self.servings = servings
        self.difficulty = difficulty  # 1-5
        self.diet_types = diet_types or [DietType.STANDARD]
        self.popularity_score = 0.0
        self.cost_per_serving = 0.0
        self.nutritional_info = {}
        self.allergens = []
        self.created_at = datetime.now()

class MenuSuggestion:
    def __init__(self, recipe: Recipe, reason: str, confidence: float,
                 seasonal_score: float, availability_score: float,
                 cost_efficiency: float):
        self.recipe = recipe
        self.reason = reason
        self.confidence = confidence
        self.seasonal_score = seasonal_score
        self.availability_score = availability_score
        self.cost_efficiency = cost_efficiency
        self.total_score = (confidence + seasonal_score + availability_score + cost_efficiency) / 4

class UltimateAIChef:
    def __init__(self, db_path: str = "ultimate_ai_chef.db"):
        self.db_path = db_path
        self.init_database()
        self.load_base_ingredients()
        self.load_base_recipes()
        print("🍽️ Ultimate AI Chef sistem inicializiran!")

    def init_database(self):
        """Inicializiraj bazo podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela sestavin
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL,
                seasonal_availability TEXT NOT NULL,
                local_supplier TEXT,
                price_per_kg REAL DEFAULT 0.0,
                nutritional_info TEXT,
                allergens TEXT,
                current_stock REAL DEFAULT 0.0,
                min_stock REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela receptov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL,
                cuisine TEXT NOT NULL,
                ingredients TEXT NOT NULL,
                instructions TEXT NOT NULL,
                prep_time INTEGER NOT NULL,
                cook_time INTEGER NOT NULL,
                servings INTEGER DEFAULT 4,
                difficulty INTEGER DEFAULT 1,
                diet_types TEXT,
                popularity_score REAL DEFAULT 0.0,
                cost_per_serving REAL DEFAULT 0.0,
                nutritional_info TEXT,
                allergens TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela menijev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS menus (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                date DATE NOT NULL,
                season TEXT NOT NULL,
                recipes TEXT NOT NULL,
                total_cost REAL DEFAULT 0.0,
                estimated_revenue REAL DEFAULT 0.0,
                nutritional_balance REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela analitike
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recipe_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipe_id INTEGER NOT NULL,
                date DATE NOT NULL,
                orders_count INTEGER DEFAULT 0,
                revenue REAL DEFAULT 0.0,
                customer_rating REAL DEFAULT 0.0,
                waste_percentage REAL DEFAULT 0.0,
                FOREIGN KEY (recipe_id) REFERENCES recipes (id)
            )
        ''')
        
        conn.commit()
        conn.close()

    def add_ingredient(self, ingredient: Ingredient) -> int:
        """Dodaj sestavino"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO ingredients 
            (name, category, seasonal_availability, local_supplier, price_per_kg,
             nutritional_info, allergens, current_stock, min_stock)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            ingredient.name,
            ingredient.category.value,
            json.dumps([s.value for s in ingredient.seasonal_availability]),
            ingredient.local_supplier,
            ingredient.price_per_kg,
            json.dumps(ingredient.nutritional_info),
            json.dumps(ingredient.allergens),
            ingredient.current_stock,
            ingredient.min_stock
        ))
        
        ingredient_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return ingredient_id

    def add_recipe(self, recipe: Recipe) -> int:
        """Dodaj recept"""
        # Izračunaj stroške in nutritivne vrednosti
        self.calculate_recipe_cost(recipe)
        self.calculate_recipe_nutrition(recipe)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO recipes 
            (name, category, cuisine, ingredients, instructions, prep_time, cook_time,
             servings, difficulty, diet_types, popularity_score, cost_per_serving,
             nutritional_info, allergens)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            recipe.name,
            recipe.category.value,
            recipe.cuisine.value,
            json.dumps(recipe.ingredients),
            json.dumps(recipe.instructions),
            recipe.prep_time,
            recipe.cook_time,
            recipe.servings,
            recipe.difficulty,
            json.dumps([d.value for d in recipe.diet_types]),
            recipe.popularity_score,
            recipe.cost_per_serving,
            json.dumps(recipe.nutritional_info),
            json.dumps(recipe.allergens)
        ))
        
        recipe.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return recipe.id

    def calculate_recipe_cost(self, recipe: Recipe):
        """Izračunaj stroške recepta"""
        total_cost = 0.0
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for ingredient_name, quantity in recipe.ingredients.items():
            cursor.execute(
                'SELECT price_per_kg FROM ingredients WHERE name = ?',
                (ingredient_name,)
            )
            result = cursor.fetchone()
            if result:
                ingredient_cost = result[0] * quantity
                total_cost += ingredient_cost
        
        conn.close()
        recipe.cost_per_serving = total_cost / recipe.servings

    def calculate_recipe_nutrition(self, recipe: Recipe):
        """Izračunaj nutritivne vrednosti recepta"""
        total_nutrition = {
            'calories': 0,
            'protein': 0,
            'carbs': 0,
            'fat': 0,
            'fiber': 0
        }
        
        allergens = set()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for ingredient_name, quantity in recipe.ingredients.items():
            cursor.execute(
                'SELECT nutritional_info, allergens FROM ingredients WHERE name = ?',
                (ingredient_name,)
            )
            result = cursor.fetchone()
            if result:
                nutrition_data = json.loads(result[0] or '{}')
                ingredient_allergens = json.loads(result[1] or '[]')
                
                # Seštej nutritivne vrednosti
                for key in total_nutrition:
                    if key in nutrition_data:
                        total_nutrition[key] += nutrition_data[key] * quantity
                
                # Dodaj alergene
                allergens.update(ingredient_allergens)
        
        conn.close()
        
        # Izračunaj na porcijo
        for key in total_nutrition:
            total_nutrition[key] = total_nutrition[key] / recipe.servings
        
        recipe.nutritional_info = total_nutrition
        recipe.allergens = list(allergens)

    def get_seasonal_ingredients(self, season: SeasonType) -> List[Ingredient]:
        """Pridobi sezonske sestavine"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM ingredients')
        results = cursor.fetchall()
        
        seasonal_ingredients = []
        for row in results:
            seasonal_availability = json.loads(row[3])
            if season.value in seasonal_availability:
                ingredient = Ingredient(
                    name=row[1],
                    category=IngredientCategory(row[2]),
                    seasonal_availability=[SeasonType(s) for s in seasonal_availability],
                    local_supplier=row[4],
                    price_per_kg=row[5],
                    nutritional_info=json.loads(row[6] or '{}'),
                    allergens=json.loads(row[7] or '[]')
                )
                ingredient.current_stock = row[8]
                ingredient.min_stock = row[9]
                seasonal_ingredients.append(ingredient)
        
        conn.close()
        return seasonal_ingredients

    def suggest_menu(self, date: datetime, dietary_restrictions: List[DietType] = None,
                    budget_per_serving: float = None, cuisine_preference: CuisineType = None) -> List[MenuSuggestion]:
        """Predlagaj meni za določen datum"""
        season = self.get_season_for_date(date)
        seasonal_ingredients = self.get_seasonal_ingredients(season)
        available_ingredients = {ing.name for ing in seasonal_ingredients if ing.current_stock > ing.min_stock}
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pridobi vse recepte
        cursor.execute('SELECT * FROM recipes')
        recipes = []
        
        for row in cursor.fetchall():
            recipe = Recipe(
                name=row[1],
                category=MenuCategory(row[2]),
                cuisine=CuisineType(row[3]),
                ingredients=json.loads(row[4]),
                instructions=json.loads(row[5]),
                prep_time=row[6],
                cook_time=row[7],
                servings=row[8],
                difficulty=row[9],
                diet_types=[DietType(d) for d in json.loads(row[10] or '["standard"]')]
            )
            recipe.id = row[0]
            recipe.popularity_score = row[11]
            recipe.cost_per_serving = row[12]
            recipe.nutritional_info = json.loads(row[13] or '{}')
            recipe.allergens = json.loads(row[14] or '[]')
            recipes.append(recipe)
        
        conn.close()
        
        # Oceni recepte
        suggestions = []
        for recipe in recipes:
            # Preveri dietetske omejitve
            if dietary_restrictions:
                if not any(diet in recipe.diet_types for diet in dietary_restrictions):
                    continue
            
            # Preveri proračun
            if budget_per_serving and recipe.cost_per_serving > budget_per_serving:
                continue
            
            # Preveri kuhinjo
            if cuisine_preference and recipe.cuisine != cuisine_preference:
                continue
            
            # Izračunaj ocene
            seasonal_score = self.calculate_seasonal_score(recipe, seasonal_ingredients)
            availability_score = self.calculate_availability_score(recipe, available_ingredients)
            cost_efficiency = self.calculate_cost_efficiency(recipe, budget_per_serving)
            confidence = self.calculate_confidence_score(recipe, season)
            
            reason = self.generate_suggestion_reason(recipe, season, seasonal_score, availability_score)
            
            suggestion = MenuSuggestion(
                recipe=recipe,
                reason=reason,
                confidence=confidence,
                seasonal_score=seasonal_score,
                availability_score=availability_score,
                cost_efficiency=cost_efficiency
            )
            
            suggestions.append(suggestion)
        
        # Razvrsti po skupni oceni
        suggestions.sort(key=lambda x: x.total_score, reverse=True)
        
        return suggestions[:10]  # Vrni top 10 predlogov

    def calculate_seasonal_score(self, recipe: Recipe, seasonal_ingredients: List[Ingredient]) -> float:
        """Izračunaj sezonsko oceno recepta"""
        seasonal_ingredient_names = {ing.name for ing in seasonal_ingredients}
        recipe_ingredients = set(recipe.ingredients.keys())
        
        seasonal_match = len(recipe_ingredients.intersection(seasonal_ingredient_names))
        total_ingredients = len(recipe_ingredients)
        
        return seasonal_match / total_ingredients if total_ingredients > 0 else 0.0

    def calculate_availability_score(self, recipe: Recipe, available_ingredients: set) -> float:
        """Izračunaj oceno razpoložljivosti sestavin"""
        recipe_ingredients = set(recipe.ingredients.keys())
        available_match = len(recipe_ingredients.intersection(available_ingredients))
        total_ingredients = len(recipe_ingredients)
        
        return available_match / total_ingredients if total_ingredients > 0 else 0.0

    def calculate_cost_efficiency(self, recipe: Recipe, budget: float = None) -> float:
        """Izračunaj stroškovno učinkovitost"""
        if not budget:
            return 0.8  # Nevtralna ocena
        
        if recipe.cost_per_serving <= budget * 0.7:
            return 1.0  # Odličen
        elif recipe.cost_per_serving <= budget:
            return 0.8  # Dober
        else:
            return 0.3  # Drag

    def calculate_confidence_score(self, recipe: Recipe, season: SeasonType) -> float:
        """Izračunaj oceno zaupanja v predlog"""
        base_score = 0.5
        
        # Dodaj za priljubljenost
        base_score += recipe.popularity_score * 0.3
        
        # Dodaj za težavnost (lažji recepti so boljši)
        base_score += (6 - recipe.difficulty) * 0.1
        
        # Sezonski bonus
        if season in [SeasonType.SUMMER, SeasonType.SPRING] and recipe.category in [MenuCategory.APPETIZER]:
            base_score += 0.1
        elif season in [SeasonType.WINTER, SeasonType.AUTUMN] and recipe.category == MenuCategory.SOUP:
            base_score += 0.1
        
        return min(base_score, 1.0)

    def generate_suggestion_reason(self, recipe: Recipe, season: SeasonType, 
                                 seasonal_score: float, availability_score: float) -> str:
        """Generiraj razlog za predlog"""
        reasons = []
        
        if seasonal_score > 0.7:
            reasons.append(f"Odličen za {season.value} sezono")
        
        if availability_score > 0.8:
            reasons.append("Vse sestavine so na voljo")
        
        if recipe.popularity_score > 0.7:
            reasons.append("Priljubljena jed med gosti")
        
        if recipe.difficulty <= 2:
            reasons.append("Enostavna za pripravo")
        
        if recipe.cost_per_serving < 8.0:
            reasons.append("Stroškovno učinkovita")
        
        return "; ".join(reasons) if reasons else "Priporočeno na podlagi AI analize"

    def get_season_for_date(self, date: datetime) -> SeasonType:
        """Določi sezono za datum"""
        month = date.month
        
        if month in [3, 4, 5]:
            return SeasonType.SPRING
        elif month in [6, 7, 8]:
            return SeasonType.SUMMER
        elif month in [9, 10, 11]:
            return SeasonType.AUTUMN
        else:
            return SeasonType.WINTER

    def create_balanced_menu(self, suggestions: List[MenuSuggestion], 
                           target_categories: List[MenuCategory] = None) -> Dict[str, Any]:
        """Ustvari uravnotežen meni"""
        if not target_categories:
            target_categories = [
                MenuCategory.APPETIZER,
                MenuCategory.SOUP,
                MenuCategory.MAIN_COURSE,
                MenuCategory.DESSERT
            ]
        
        balanced_menu = {}
        total_cost = 0.0
        total_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
        
        for category in target_categories:
            # Najdi najboljši predlog za kategorijo
            category_suggestions = [s for s in suggestions if s.recipe.category == category]
            if category_suggestions:
                best_suggestion = category_suggestions[0]
                balanced_menu[category.value] = {
                    'recipe': best_suggestion.recipe,
                    'reason': best_suggestion.reason,
                    'score': best_suggestion.total_score
                }
                total_cost += best_suggestion.recipe.cost_per_serving
                
                # Seštej nutritivne vrednosti
                for key in total_nutrition:
                    if key in best_suggestion.recipe.nutritional_info:
                        total_nutrition[key] += best_suggestion.recipe.nutritional_info[key]
        
        return {
            'menu': balanced_menu,
            'total_cost_per_person': total_cost,
            'nutritional_summary': total_nutrition,
            'balance_score': self.calculate_nutritional_balance(total_nutrition)
        }

    def calculate_nutritional_balance(self, nutrition: Dict[str, float]) -> float:
        """Izračunaj nutritivno uravnoteženost"""
        # Idealni deleži: protein 20%, carbs 50%, fat 30%
        total_calories = nutrition.get('calories', 0)
        if total_calories == 0:
            return 0.0
        
        protein_calories = nutrition.get('protein', 0) * 4
        carb_calories = nutrition.get('carbs', 0) * 4
        fat_calories = nutrition.get('fat', 0) * 9
        
        protein_ratio = protein_calories / total_calories
        carb_ratio = carb_calories / total_calories
        fat_ratio = fat_calories / total_calories
        
        # Izračunaj odstopanje od idealnih razmerij
        protein_deviation = abs(protein_ratio - 0.20)
        carb_deviation = abs(carb_ratio - 0.50)
        fat_deviation = abs(fat_ratio - 0.30)
        
        average_deviation = (protein_deviation + carb_deviation + fat_deviation) / 3
        balance_score = max(0, 1 - average_deviation * 2)
        
        return balance_score

    def get_recipe_analytics(self, recipe_id: int, days: int = 30) -> Dict[str, Any]:
        """Pridobi analitiko recepta"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        start_date = datetime.now() - timedelta(days=days)
        
        cursor.execute('''
            SELECT 
                SUM(orders_count) as total_orders,
                AVG(customer_rating) as avg_rating,
                SUM(revenue) as total_revenue,
                AVG(waste_percentage) as avg_waste
            FROM recipe_analytics 
            WHERE recipe_id = ? AND date >= ?
        ''', (recipe_id, start_date.date()))
        
        result = cursor.fetchone()
        conn.close()
        
        return {
            'total_orders': result[0] or 0,
            'average_rating': result[1] or 0.0,
            'total_revenue': result[2] or 0.0,
            'average_waste': result[3] or 0.0,
            'period_days': days
        }

    def load_base_ingredients(self):
        """Naloži osnovne sestavine"""
        base_ingredients = [
            # Meso
            Ingredient("Goveje meso", IngredientCategory.MEAT, 
                      [SeasonType.AUTUMN, SeasonType.WINTER], 
                      "Lokalna kmetija Novak", 18.50,
                      {'calories': 250, 'protein': 26, 'fat': 15, 'carbs': 0},
                      ['beef']),
            
            # Zelenjava
            Ingredient("Krompir", IngredientCategory.VEGETABLES,
                      [SeasonType.AUTUMN, SeasonType.WINTER],
                      "Kmetija Žagar", 1.20,
                      {'calories': 77, 'protein': 2, 'fat': 0.1, 'carbs': 17},
                      []),
            
            Ingredient("Paradižnik", IngredientCategory.VEGETABLES,
                      [SeasonType.SUMMER, SeasonType.AUTUMN],
                      "Vrtnarija Sončnica", 3.50,
                      {'calories': 18, 'protein': 0.9, 'fat': 0.2, 'carbs': 3.9},
                      []),
            
            # Sadje
            Ingredient("Jabolka", IngredientCategory.FRUITS,
                      [SeasonType.AUTUMN, SeasonType.WINTER],
                      "Sadjarstvo Kovač", 2.80,
                      {'calories': 52, 'protein': 0.3, 'fat': 0.2, 'carbs': 14},
                      []),
            
            # Mlečni izdelki
            Ingredient("Sir", IngredientCategory.DAIRY,
                      [SeasonType.SPRING, SeasonType.SUMMER, SeasonType.AUTUMN, SeasonType.WINTER],
                      "Mlekarna Celeia", 12.00,
                      {'calories': 113, 'protein': 25, 'fat': 0.2, 'carbs': 4},
                      ['milk', 'lactose']),
            
            # Žita
            Ingredient("Pšenična moka", IngredientCategory.GRAINS,
                      [SeasonType.SPRING, SeasonType.SUMMER, SeasonType.AUTUMN, SeasonType.WINTER],
                      "Mlin Ajdovščina", 0.85,
                      {'calories': 364, 'protein': 10, 'fat': 1, 'carbs': 76},
                      ['gluten']),
        ]
        
        for ingredient in base_ingredients:
            ingredient.current_stock = random.uniform(10, 50)
            ingredient.min_stock = 5.0
            self.add_ingredient(ingredient)

    def load_base_recipes(self):
        """Naloži osnovne recepte"""
        base_recipes = [
            Recipe(
                name="Goveja juha z zelenjavo",
                category=MenuCategory.SOUP,
                cuisine=CuisineType.SLOVENIAN,
                ingredients={"Goveje meso": 0.3, "Krompir": 0.2, "Paradižnik": 0.1},
                instructions=[
                    "Goveje meso narežite na kocke",
                    "Zelenjavo očistite in narežite",
                    "Kuhajte 2 uri na počasnem ognju",
                    "Začinite po okusu"
                ],
                prep_time=20,
                cook_time=120,
                servings=4,
                difficulty=2,
                diet_types=[DietType.STANDARD]
            ),
            
            Recipe(
                name="Pečen krompir s sirom",
                category=MenuCategory.SIDE_DISH,
                cuisine=CuisineType.SLOVENIAN,
                ingredients={"Krompir": 0.5, "Sir": 0.1},
                instructions=[
                    "Krompir očistite in narežite na rezine",
                    "Položite v pekač",
                    "Potresite s sirom",
                    "Pecite 45 minut na 200°C"
                ],
                prep_time=15,
                cook_time=45,
                servings=4,
                difficulty=1,
                diet_types=[DietType.STANDARD, DietType.VEGETARIAN]
            ),
            
            Recipe(
                name="Jabolčna pita",
                category=MenuCategory.DESSERT,
                cuisine=CuisineType.SLOVENIAN,
                ingredients={"Jabolka": 0.6, "Pšenična moka": 0.3},
                instructions=[
                    "Pripravite testo iz moke",
                    "Jabolka narežite na tanke rezine",
                    "Sestavite pito",
                    "Pecite 40 minut na 180°C"
                ],
                prep_time=30,
                cook_time=40,
                servings=8,
                difficulty=3,
                diet_types=[DietType.STANDARD, DietType.VEGETARIAN]
            )
        ]
        
        for recipe in base_recipes:
            recipe.popularity_score = random.uniform(0.6, 0.9)
            self.add_recipe(recipe)

    def get_dashboard_data(self) -> Dict[str, Any]:
        """Pridobi podatke za dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Statistike receptov
        cursor.execute('SELECT COUNT(*) FROM recipes')
        total_recipes = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM ingredients WHERE current_stock > min_stock')
        available_ingredients = cursor.fetchone()[0]
        
        cursor.execute('SELECT AVG(cost_per_serving) FROM recipes')
        avg_cost = cursor.fetchone()[0] or 0.0
        
        # Sezonski predlogi
        today = datetime.now()
        season = self.get_season_for_date(today)
        seasonal_suggestions = self.suggest_menu(today)[:5]
        
        conn.close()
        
        return {
            'total_recipes': total_recipes,
            'available_ingredients': available_ingredients,
            'average_cost_per_serving': round(avg_cost, 2),
            'current_season': season.value,
            'top_suggestions': [
                {
                    'name': s.recipe.name,
                    'category': s.recipe.category.value,
                    'score': round(s.total_score, 2),
                    'reason': s.reason
                }
                for s in seasonal_suggestions
            ]
        }

# Demo funkcije
def demo_ai_chef():
    """Demo AI Chef sistema"""
    print("\n🍽️ DEMO: Ultimate AI Chef System")
    print("=" * 50)
    
    chef = UltimateAIChef()
    
    # Predlogi za danes
    today = datetime.now()
    suggestions = chef.suggest_menu(today)
    
    print(f"\n📅 Predlogi menijev za {today.strftime('%d.%m.%Y')}:")
    print(f"🌿 Sezona: {chef.get_season_for_date(today).value}")
    
    for i, suggestion in enumerate(suggestions[:5], 1):
        print(f"\n{i}. {suggestion.recipe.name}")
        print(f"   Kategorija: {suggestion.recipe.category.value}")
        print(f"   Ocena: {suggestion.total_score:.2f}/1.00")
        print(f"   Razlog: {suggestion.reason}")
        print(f"   Cena/porcija: €{suggestion.recipe.cost_per_serving:.2f}")
    
    # Uravnotežen meni
    balanced_menu = chef.create_balanced_menu(suggestions)
    
    print(f"\n🍽️ Priporočen uravnotežen meni:")
    print(f"💰 Skupna cena: €{balanced_menu['total_cost_per_person']:.2f}/osebo")
    print(f"⚖️ Nutritivna ocena: {balanced_menu['balance_score']:.2f}/1.00")
    
    for category, item in balanced_menu['menu'].items():
        print(f"   {category}: {item['recipe'].name}")
    
    # Dashboard podatki
    dashboard = chef.get_dashboard_data()
    print(f"\n📊 Dashboard statistike:")
    print(f"   Recepti v bazi: {dashboard['total_recipes']}")
    print(f"   Razpoložljive sestavine: {dashboard['available_ingredients']}")
    print(f"   Povprečna cena: €{dashboard['average_cost_per_serving']}")

if __name__ == "__main__":
    demo_ai_chef()