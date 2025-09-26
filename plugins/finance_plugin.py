# Finance Management Plugin
import json
import os
from datetime import datetime, timedelta
import re
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
            transactions_accessible = os.path.exists(self.transactions_file)
            budgets_accessible = os.path.exists(self.budgets_file)
            
            # Preveri velikost podatkov
            transactions_count = len(self.transactions)
            budgets_count = len(self.budgets)
            
            # Določi status
            if transactions_accessible and budgets_accessible:
                status = "healthy"
            elif transactions_accessible or budgets_accessible:
                status = "standby"  # Delno dostopen
            else:
                status = "error"
            
            return {
                "status": status,
                "timestamp": datetime.now().timestamp(),
                "details": {
                    "transactions_accessible": transactions_accessible,
                    "budgets_accessible": budgets_accessible,
                    "transactions_count": transactions_count,
                    "budgets_count": budgets_count,
                    "data_files": {
                        "transactions": self.transactions_file,
                        "budgets": self.budgets_file
                    }
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "timestamp": datetime.now().timestamp(),
                "error": str(e)
            }


class Plugin(PluginBase):
    name = "finance"
    description = "Finančno upravljanje, proračuni, stroški, prihodki, analize"
    
    def __init__(self):
        self.transactions_file = "data/transactions.json"
        self.budgets_file = "data/budgets.json"
        self.ensure_data_dir()
        self.transactions = self.load_transactions()
        self.budgets = self.load_budgets()
    
    def ensure_data_dir(self):
        """Ustvari data direktorij če ne obstaja"""
        os.makedirs("data", exist_ok=True)
    
    def load_transactions(self):
        """Naloži transakcije iz datoteke"""
        if os.path.exists(self.transactions_file):
            try:
                with open(self.transactions_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def load_budgets(self):
        """Naloži proračune iz datoteke"""
        if os.path.exists(self.budgets_file):
            try:
                with open(self.budgets_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def save_transactions(self):
        """Shrani transakcije v datoteko"""
        with open(self.transactions_file, 'w', encoding='utf-8') as f:
            json.dump(self.transactions, f, ensure_ascii=False, indent=2)
    
    def save_budgets(self):
        """Shrani proračune v datoteko"""
        with open(self.budgets_file, 'w', encoding='utf-8') as f:
            json.dump(self.budgets, f, ensure_ascii=False, indent=2)
    
    def handle(self, query, context=None):
        """Obravnava finančne zahteve"""
        query_lower = query.lower()
        
        # Dodaj transakcijo
        if any(word in query_lower for word in ['dodaj', 'strošek', 'prihodek', 'plačilo', 'expense', 'income']):
            return self.add_transaction(query)
        
        # Finančni pregled
        elif any(word in query_lower for word in ['pregled', 'bilanca', 'stanje', 'balance', 'overview']):
            return self.financial_overview()
        
        # Proračun
        elif any(word in query_lower for word in ['proračun', 'budget', 'načrt']):
            return self.manage_budget(query)
        
        # Analiza
        elif any(word in query_lower for word in ['analiza', 'poročilo', 'report', 'analysis']):
            return self.financial_analysis(query)
        
        # Kategorije
        elif any(word in query_lower for word in ['kategorija', 'category', 'tip']):
            return self.category_analysis(query)
        
        else:
            return self.get_help()
    
    def add_transaction(self, query):
        """Dodaj novo transakcijo"""
        # Izvleci znesek iz zahteve
        amount_match = re.search(r'(\d+(?:[.,]\d{1,2})?)\s*€?', query)
        amount = 0
        
        if amount_match:
            amount_str = amount_match.group(1).replace(',', '.')
            amount = float(amount_str)
        
        # Določi tip transakcije
        transaction_type = "expense"  # privzeto strošek
        if any(word in query.lower() for word in ['prihodek', 'dohodek', 'income', 'revenue', 'zaslužek']):
            transaction_type = "income"
        
        # Izvleci opis
        description = query
        for prefix in ['dodaj strošek:', 'dodaj prihodek:', 'strošek:', 'prihodek:', 'plačilo:']:
            if prefix in query.lower():
                description = query[query.lower().find(prefix) + len(prefix):].strip()
                break
        
        # Očisti opis od zneska
        if amount_match:
            description = description.replace(amount_match.group(0), '').strip()
        
        if not description or len(description) < 3:
            description = f"{'Prihodek' if transaction_type == 'income' else 'Strošek'} - {datetime.now().strftime('%H:%M')}"
        
        # Določi kategorijo
        category = self.determine_category(description, transaction_type)
        
        new_transaction = {
            "id": len(self.transactions) + 1,
            "type": transaction_type,
            "amount": amount,
            "description": description,
            "category": category,
            "date": datetime.now().isoformat(),
            "created": datetime.now().isoformat()
        }
        
        self.transactions.append(new_transaction)
        self.save_transactions()
        
        type_icon = "💰" if transaction_type == "income" else "💸"
        return f"{type_icon} **Transakcija dodana:**\n📝 {description}\n💵 €{amount:.2f}\n📂 {category}\n🆔 ID: {new_transaction['id']}"
    
    def determine_category(self, description, transaction_type):
        """Določi kategorijo na podlagi opisa"""
        desc_lower = description.lower()
        
        if transaction_type == "income":
            if any(word in desc_lower for word in ['plača', 'salary', 'work']):
                return "plača"
            elif any(word in desc_lower for word in ['projekt', 'freelance', 'consulting']):
                return "projekti"
            elif any(word in desc_lower for word in ['investicija', 'dividend', 'interest']):
                return "investicije"
            else:
                return "ostali_prihodki"
        else:  # expense
            if any(word in desc_lower for word in ['hrana', 'restavracija', 'food', 'restaurant']):
                return "hrana"
            elif any(word in desc_lower for word in ['transport', 'gorivo', 'fuel', 'bus', 'taxi']):
                return "transport"
            elif any(word in desc_lower for word in ['stanovanje', 'najemnina', 'rent', 'utilities']):
                return "stanovanje"
            elif any(word in desc_lower for word in ['zdravje', 'health', 'doctor', 'medicine']):
                return "zdravje"
            elif any(word in desc_lower for word in ['zabava', 'entertainment', 'kino', 'cinema']):
                return "zabava"
            elif any(word in desc_lower for word in ['oblačila', 'clothes', 'shopping']):
                return "nakupi"
            else:
                return "ostalo"
    
    def financial_overview(self):
        """Finančni pregled"""
        if not self.transactions:
            return "💰 **Finančni pregled:**\n\nŠe ni transakcij. Dodajte prvo transakcijo!"
        
        # Izračunaj skupne zneske
        total_income = sum(t['amount'] for t in self.transactions if t['type'] == 'income')
        total_expenses = sum(t['amount'] for t in self.transactions if t['type'] == 'expense')
        balance = total_income - total_expenses
        
        # Zadnji mesec
        last_month = datetime.now() - timedelta(days=30)
        recent_transactions = [t for t in self.transactions 
                             if datetime.fromisoformat(t['date']) > last_month]
        
        monthly_income = sum(t['amount'] for t in recent_transactions if t['type'] == 'income')
        monthly_expenses = sum(t['amount'] for t in recent_transactions if t['type'] == 'expense')
        monthly_balance = monthly_income - monthly_expenses
        
        # Status
        status_icon = "🟢" if balance > 0 else "🔴" if balance < 0 else "🟡"
        monthly_status = "📈" if monthly_balance > 0 else "📉" if monthly_balance < 0 else "➡️"
        
        result = f"""
💰 **Finančni pregled:**

💵 **Skupno stanje:**
• Prihodki: €{total_income:,.2f}
• Stroški: €{total_expenses:,.2f}
• Bilanca: €{balance:,.2f} {status_icon}

📅 **Zadnjih 30 dni:**
• Prihodki: €{monthly_income:,.2f}
• Stroški: €{monthly_expenses:,.2f}
• Bilanca: €{monthly_balance:,.2f} {monthly_status}

📊 **Statistike:**
• Število transakcij: {len(self.transactions)}
• Povprečen strošek: €{total_expenses/max(len([t for t in self.transactions if t['type'] == 'expense']), 1):.2f}
• Povprečen prihodek: €{total_income/max(len([t for t in self.transactions if t['type'] == 'income']), 1):.2f}
        """
        
        return result.strip()
    
    def manage_budget(self, query):
        """Upravljanje proračuna"""
        query_lower = query.lower()
        
        if 'dodaj' in query_lower or 'ustvari' in query_lower:
            return self.create_budget(query)
        elif 'prikaži' in query_lower or 'seznam' in query_lower:
            return self.show_budgets()
        else:
            return self.budget_status()
    
    def create_budget(self, query):
        """Ustvari nov proračun"""
        # Enostaven parser za proračun
        # Format: "dodaj proračun [kategorija] [znesek]"
        
        amount_match = re.search(r'(\d+(?:[.,]\d{1,2})?)\s*€?', query)
        if not amount_match:
            return "❌ Prosim, navedite znesek proračuna (npr. 'dodaj proračun hrana 300€')"
        
        amount = float(amount_match.group(1).replace(',', '.'))
        
        # Določi kategorijo
        words = query.lower().split()
        category = "splošno"
        
        categories = ['hrana', 'transport', 'stanovanje', 'zabava', 'nakupi', 'zdravje']
        for cat in categories:
            if cat in query.lower():
                category = cat
                break
        
        # Preveri če proračun že obstaja
        existing_budget = next((b for b in self.budgets if b['category'] == category), None)
        
        if existing_budget:
            existing_budget['amount'] = amount
            existing_budget['updated'] = datetime.now().isoformat()
            action = "posodobljen"
        else:
            new_budget = {
                "id": len(self.budgets) + 1,
                "category": category,
                "amount": amount,
                "period": "monthly",
                "created": datetime.now().isoformat(),
                "updated": datetime.now().isoformat()
            }
            self.budgets.append(new_budget)
            action = "ustvarjen"
        
        self.save_budgets()
        
        return f"💰 **Proračun {action}:**\n📂 Kategorija: {category}\n💵 Znesek: €{amount:.2f}/mesec"
    
    def show_budgets(self):
        """Prikaži vse proračune"""
        if not self.budgets:
            return "📊 **Proračuni:**\n\nŠe ni nastavljenih proračunov."
        
        result = "📊 **Nastavljeni proračuni:**\n\n"
        
        for budget in self.budgets:
            # Izračunaj porabo za kategorijo
            category_expenses = sum(t['amount'] for t in self.transactions 
                                  if t['type'] == 'expense' and t['category'] == budget['category'])
            
            percentage = (category_expenses / budget['amount'] * 100) if budget['amount'] > 0 else 0
            status_icon = "🟢" if percentage < 80 else "🟡" if percentage < 100 else "🔴"
            
            result += f"{status_icon} **{budget['category'].upper()}**\n"
            result += f"   💰 Proračun: €{budget['amount']:.2f}\n"
            result += f"   💸 Porabljeno: €{category_expenses:.2f} ({percentage:.1f}%)\n"
            result += f"   💵 Ostane: €{max(0, budget['amount'] - category_expenses):.2f}\n\n"
        
        return result.strip()
    
    def budget_status(self):
        """Status proračuna"""
        if not self.budgets:
            return "📊 Ni nastavljenih proračunov. Uporabite 'dodaj proračun [kategorija] [znesek]'"
        
        # Skupni pregled proračuna
        total_budget = sum(b['amount'] for b in self.budgets)
        total_spent = 0
        
        result = "📊 **Status proračuna:**\n\n"
        
        over_budget = []
        for budget in self.budgets:
            category_expenses = sum(t['amount'] for t in self.transactions 
                                  if t['type'] == 'expense' and t['category'] == budget['category'])
            total_spent += category_expenses
            
            if category_expenses > budget['amount']:
                over_budget.append((budget['category'], category_expenses - budget['amount']))
        
        overall_percentage = (total_spent / total_budget * 100) if total_budget > 0 else 0
        status_icon = "🟢" if overall_percentage < 80 else "🟡" if overall_percentage < 100 else "🔴"
        
        result += f"{status_icon} **Skupno:**\n"
        result += f"💰 Proračun: €{total_budget:.2f}\n"
        result += f"💸 Porabljeno: €{total_spent:.2f} ({overall_percentage:.1f}%)\n"
        result += f"💵 Ostane: €{max(0, total_budget - total_spent):.2f}\n\n"
        
        if over_budget:
            result += "⚠️ **Prekoračitve:**\n"
            for category, amount in over_budget:
                result += f"• {category}: +€{amount:.2f}\n"
        
        return result.strip()
    
    def financial_analysis(self, query):
        """Finančna analiza"""
        if not self.transactions:
            return "📊 Ni podatkov za analizo. Dodajte transakcije."
        
        # Analiza po kategorijah
        categories = {}
        for transaction in self.transactions:
            if transaction['type'] == 'expense':
                cat = transaction['category']
                categories[cat] = categories.get(cat, 0) + transaction['amount']
        
        # Sortiraj po znesku
        sorted_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)
        
        # Mesečni trendi
        monthly_data = {}
        for transaction in self.transactions:
            date = datetime.fromisoformat(transaction['date'])
            month_key = date.strftime('%Y-%m')
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {'income': 0, 'expenses': 0}
            
            monthly_data[month_key][transaction['type'] + 's'] += transaction['amount']
        
        result = f"""
📊 **Finančna analiza:**

💸 **Stroški po kategorijah:**
"""
        
        for category, amount in sorted_categories[:5]:
            percentage = (amount / sum(categories.values()) * 100) if categories else 0
            result += f"• {category}: €{amount:.2f} ({percentage:.1f}%)\n"
        
        result += f"\n📈 **Mesečni trendi:**\n"
        for month, data in sorted(monthly_data.items())[-3:]:  # Zadnji 3 meseci
            balance = data['income'] - data['expenses']
            trend_icon = "📈" if balance > 0 else "📉"
            result += f"{trend_icon} {month}: €{balance:+.2f} (prihodki: €{data['income']:.2f}, stroški: €{data['expenses']:.2f})\n"
        
        return result.strip()
    
    def category_analysis(self, query):
        """Analiza po kategorijah"""
        # Analiza stroškov po kategorijah
        expense_categories = {}
        income_categories = {}
        
        for transaction in self.transactions:
            cat = transaction['category']
            amount = transaction['amount']
            
            if transaction['type'] == 'expense':
                expense_categories[cat] = expense_categories.get(cat, 0) + amount
            else:
                income_categories[cat] = income_categories.get(cat, 0) + amount
        
        result = "📂 **Analiza po kategorijah:**\n\n"
        
        if expense_categories:
            result += "💸 **Stroški:**\n"
            for cat, amount in sorted(expense_categories.items(), key=lambda x: x[1], reverse=True):
                result += f"• {cat}: €{amount:.2f}\n"
            result += "\n"
        
        if income_categories:
            result += "💰 **Prihodki:**\n"
            for cat, amount in sorted(income_categories.items(), key=lambda x: x[1], reverse=True):
                result += f"• {cat}: €{amount:.2f}\n"
        
        return result.strip()
    
    def get_help(self):
        """Pomoč za uporabo"""
        return """
💰 **Finance Plugin - Pomoč:**
• `dodaj strošek: [opis] [znesek]€` - Dodaj strošek
• `dodaj prihodek: [opis] [znesek]€` - Dodaj prihodek
• `finančni pregled` - Skupno stanje
• `dodaj proračun [kategorija] [znesek]€` - Nastavi proračun
• `prikaži proračune` - Status proračunov
• `finančna analiza` - Podrobna analiza

**Primeri:**
- "dodaj strošek: kosilo 12.50€"
- "dodaj prihodek: freelance projekt 500€"
- "dodaj proračun hrana 300€"
- "finančni pregled"

**Kategorije:**
- Stroški: hrana, transport, stanovanje, zabava, nakupi, zdravje
- Prihodki: plača, projekti, investicije
        """
    def get_info(self):
        """Vrni informacije o plugin-u"""
        return {
            "name": self.name,
            "version": getattr(self, 'version', '1.0.0'),
            "description": self.description,
            "author": getattr(self, 'author', 'OmniCore'),
            "capabilities": getattr(self, 'capabilities', [])
        }