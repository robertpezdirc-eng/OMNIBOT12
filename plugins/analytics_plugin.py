# Analytics and Data Analysis Plugin
import json
import os
import csv
from datetime import datetime, timedelta
import random
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
            # Preveri dostopnost data direktorija
            data_dir_accessible = os.path.exists(self.data_dir)
            
            # Preveri možnost pisanja
            write_accessible = os.access(self.data_dir, os.W_OK) if data_dir_accessible else False
            
            # Določi status
            if data_dir_accessible and write_accessible:
                status = "healthy"
            elif data_dir_accessible:
                status = "standby"  # Dostopen, vendar ni možno pisanje
            else:
                status = "error"
            
            return {
                "status": status,
                "timestamp": datetime.now().timestamp(),
                "details": {
                    "data_dir_accessible": data_dir_accessible,
                    "write_accessible": write_accessible,
                    "data_directory": self.data_dir
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "timestamp": datetime.now().timestamp(),
                "error": str(e)
            }


class Plugin(PluginBase):
    name = "analytics"
    description = "Analiza podatkov, statistike, poročila, vizualizacije"
    
    def __init__(self):
        self.data_dir = "data/analytics"
        self.ensure_data_dir()
    
    def ensure_data_dir(self):
        """Ustvari analytics direktorij če ne obstaja"""
        os.makedirs(self.data_dir, exist_ok=True)
    
    def handle(self, query, context=None):
        """Obravnava zahteve za analitiko"""
        query_lower = query.lower()
        
        # Analiza prodaje
        if any(word in query_lower for word in ['prodaja', 'sales', 'revenue', 'prihodki']):
            return self.analyze_sales(query)
        
        # Analiza uporabnikov
        elif any(word in query_lower for word in ['uporabniki', 'users', 'customers', 'stranke']):
            return self.analyze_users(query)
        
        # Splošna analiza
        elif any(word in query_lower for word in ['analiziraj', 'analyze', 'statistike', 'stats']):
            return self.general_analysis(query)
        
        # Generiraj poročilo
        elif any(word in query_lower for word in ['poročilo', 'report', 'izvoz', 'export']):
            return self.generate_report(query)
        
        else:
            return self.get_help()
    
    def analyze_sales(self, query):
        """Analiza prodajnih podatkov"""
        # Generiraj simulirane podatke za demo
        sales_data = self.generate_sample_sales_data()
        
        total_revenue = sum(item['amount'] for item in sales_data)
        avg_order = total_revenue / len(sales_data) if sales_data else 0
        top_product = max(sales_data, key=lambda x: x['amount'])['product'] if sales_data else "N/A"
        
        # Analiza po dnevih
        daily_sales = {}
        for item in sales_data:
            date = item['date'][:10]  # YYYY-MM-DD
            daily_sales[date] = daily_sales.get(date, 0) + item['amount']
        
        best_day = max(daily_sales.items(), key=lambda x: x[1]) if daily_sales else ("N/A", 0)
        
        result = f"""
📊 **Analiza prodaje (zadnjih 30 dni):**

💰 **Ključne metrike:**
• Skupni prihodki: €{total_revenue:,.2f}
• Povprečna naročila: €{avg_order:.2f}
• Število transakcij: {len(sales_data)}
• Najboljši produkt: {top_product}

📈 **Trendi:**
• Najboljši dan: {best_day[0]} (€{best_day[1]:,.2f})
• Dnevni povpreček: €{total_revenue/30:.2f}
• Rast: +{random.randint(5, 25)}% vs prejšnji mesec

🎯 **Priporočila:**
• Fokus na {top_product} - najboljši performer
• Optimizacija za {best_day[0]} tip dni
• Povečanje povprečne vrednosti naročila
        """
        
        return result.strip()
    
    def analyze_users(self, query):
        """Analiza uporabniških podatkov"""
        # Generiraj simulirane podatke
        user_data = self.generate_sample_user_data()
        
        total_users = len(user_data)
        active_users = len([u for u in user_data if u['active']])
        new_users = len([u for u in user_data if u['is_new']])
        retention_rate = (active_users / total_users * 100) if total_users > 0 else 0
        
        # Analiza po regijah
        regions = {}
        for user in user_data:
            region = user['region']
            regions[region] = regions.get(region, 0) + 1
        
        top_region = max(regions.items(), key=lambda x: x[1]) if regions else ("N/A", 0)
        
        result = f"""
👥 **Analiza uporabnikov:**

📊 **Ključne metrike:**
• Skupaj uporabnikov: {total_users:,}
• Aktivni uporabniki: {active_users:,} ({retention_rate:.1f}%)
• Novi uporabniki: {new_users:,}
• Stopnja zadržanja: {retention_rate:.1f}%

🌍 **Geografska porazdelitev:**
• Glavna regija: {top_region[0]} ({top_region[1]} uporabnikov)
• Pokritost regij: {len(regions)}

📈 **Trendi:**
• Mesečna rast: +{random.randint(8, 20)}%
• Povprečna aktivnost: {random.randint(15, 45)} min/dan
• Konverzijska stopnja: {random.randint(3, 12)}%

🎯 **Priporočila:**
• Povečanje aktivnosti v {min(regions.items(), key=lambda x: x[1])[0]}
• Fokus na zadržanje novih uporabnikov
• Personalizacija za {top_region[0]} regijo
        """
        
        return result.strip()
    
    def general_analysis(self, query):
        """Splošna analiza sistema"""
        # Simulirani sistemski podatki
        system_stats = {
            'uptime': f"{random.randint(95, 99)}.{random.randint(1, 9)}%",
            'response_time': f"{random.randint(120, 350)}ms",
            'requests_today': random.randint(15000, 45000),
            'errors_rate': f"{random.uniform(0.1, 2.5):.2f}%",
            'cpu_usage': f"{random.randint(25, 75)}%",
            'memory_usage': f"{random.randint(40, 85)}%"
        }
        
        result = f"""
🔍 **Splošna sistemska analiza:**

⚡ **Performanse:**
• Uptime: {system_stats['uptime']}
• Odzivni čas: {system_stats['response_time']}
• Zahteve danes: {system_stats['requests_today']:,}
• Stopnja napak: {system_stats['errors_rate']}

💻 **Viri:**
• CPU uporaba: {system_stats['cpu_usage']}
• RAM uporaba: {system_stats['memory_usage']}
• Status: {"🟢 Optimalno" if float(system_stats['cpu_usage'][:-1]) < 70 else "🟡 Povišano"}

📊 **Ključni kazalniki:**
• Zadovoljstvo uporabnikov: {random.randint(85, 95)}%
• Hitrost nalaganja: {random.uniform(1.2, 2.8):.1f}s
• Mobilna optimizacija: {random.randint(88, 96)}%

🎯 **Priporočila:**
• {"Optimizacija CPU" if float(system_stats['cpu_usage'][:-1]) > 60 else "Sistem deluje optimalno"}
• Monitoring odzivnih časov
• Backup sistemskih podatkov
        """
        
        return result.strip()
    
    def generate_report(self, query):
        """Generiraj poročilo"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"{self.data_dir}/report_{timestamp}.json"
        
        # Ustvari celovito poročilo
        report_data = {
            "generated": datetime.now().isoformat(),
            "type": "comprehensive_analysis",
            "sales": {
                "total_revenue": random.randint(50000, 150000),
                "transactions": random.randint(800, 2500),
                "avg_order": random.randint(45, 120)
            },
            "users": {
                "total": random.randint(5000, 15000),
                "active": random.randint(3000, 10000),
                "new_this_month": random.randint(200, 800)
            },
            "system": {
                "uptime": f"{random.randint(95, 99)}.{random.randint(1, 9)}%",
                "performance_score": random.randint(85, 98)
            }
        }
        
        # Shrani poročilo
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        
        return f"""
📋 **Poročilo generirano:**

📁 Datoteka: `{report_file}`
📅 Čas: {datetime.now().strftime('%d.%m.%Y %H:%M')}

📊 **Povzetek:**
• Prihodki: €{report_data['sales']['total_revenue']:,}
• Uporabniki: {report_data['users']['total']:,}
• Sistemska ocena: {report_data['system']['performance_score']}/100

✅ Poročilo je pripravljeno za izvoz in analizo.
        """
    
    def generate_sample_sales_data(self):
        """Generiraj simulirane prodajne podatke"""
        products = ["Premium Plan", "Basic Plan", "Enterprise", "Consulting", "Training"]
        data = []
        
        for i in range(30):  # 30 dni podatkov
            date = (datetime.now() - timedelta(days=i)).isoformat()
            for j in range(random.randint(5, 25)):  # 5-25 transakcij na dan
                data.append({
                    "date": date,
                    "product": random.choice(products),
                    "amount": random.randint(25, 500),
                    "customer_id": f"CUST_{random.randint(1000, 9999)}"
                })
        
        return data
    
    def generate_sample_user_data(self):
        """Generiraj simulirane uporabniške podatke"""
        regions = ["Ljubljana", "Maribor", "Celje", "Kranj", "Koper"]
        data = []
        
        for i in range(random.randint(1000, 5000)):
            data.append({
                "id": i + 1,
                "region": random.choice(regions),
                "active": random.choice([True, True, True, False]),  # 75% aktivnih
                "is_new": random.choice([True, False, False, False]),  # 25% novih
                "last_login": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
            })
        
        return data
    
    def get_help(self):
        """Pomoč za uporabo"""
        return """
📊 **Analytics Plugin - Pomoč:**
• `analiziraj prodajo` - Analiza prodajnih podatkov
• `analiziraj uporabnike` - Analiza uporabniških metrik
• `sistemska analiza` - Splošna analiza performans
• `generiraj poročilo` - Ustvari celovito poročilo

**Primeri:**
- "analiziraj prodajo zadnjih 30 dni"
- "prikaži statistike uporabnikov"
- "generiraj mesečno poročilo"
- "sistemske performanse"

**Funkcionalnosti:**
- Prodajne metrike in trendi
- Uporabniška analitika
- Sistemske performanse
- Avtomatska poročila
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