"""
OmniCore Real Data Integration Module
Omogoča povezavo z realnimi bazami podatkov in poslovnimi sistemi
"""

import psycopg2
import mysql.connector
import sqlite3
import pandas as pd
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

# Konfiguracija za različne podatkovne vire
class DatabaseConfig:
    def __init__(self):
        self.configs = {
            'postgresql': {
                'host': os.getenv('PG_HOST', 'localhost'),
                'database': os.getenv('PG_DATABASE', 'company_db'),
                'user': os.getenv('PG_USER', 'postgres'),
                'password': os.getenv('PG_PASSWORD', 'password'),
                'port': os.getenv('PG_PORT', 5432)
            },
            'mysql': {
                'host': os.getenv('MYSQL_HOST', 'localhost'),
                'database': os.getenv('MYSQL_DATABASE', 'company_db'),
                'user': os.getenv('MYSQL_USER', 'root'),
                'password': os.getenv('MYSQL_PASSWORD', 'password'),
                'port': os.getenv('MYSQL_PORT', 3306)
            },
            'sqlite': {
                'database': os.getenv('SQLITE_DB', 'data/company.db')
            }
        }

class RealDataAnalyzer:
    """Glavni modul za analizo realnih podatkov"""
    
    def __init__(self):
        self.name = "real_analyzer"
        self.description = "Analiza realnih poslovnih podatkov iz baz"
        self.db_config = DatabaseConfig()
        self.logger = logging.getLogger(__name__)
        
    def connect_postgresql(self):
        """Povezava s PostgreSQL bazo"""
        try:
            config = self.db_config.configs['postgresql']
            conn = psycopg2.connect(**config)
            return conn
        except Exception as e:
            self.logger.error(f"PostgreSQL povezava neuspešna: {e}")
            return None
    
    def connect_mysql(self):
        """Povezava z MySQL bazo"""
        try:
            config = self.db_config.configs['mysql']
            conn = mysql.connector.connect(**config)
            return conn
        except Exception as e:
            self.logger.error(f"MySQL povezava neuspešna: {e}")
            return None
    
    def connect_sqlite(self):
        """Povezava s SQLite bazo"""
        try:
            db_path = self.db_config.configs['sqlite']['database']
            conn = sqlite3.connect(db_path)
            return conn
        except Exception as e:
            self.logger.error(f"SQLite povezava neuspešna: {e}")
            return None
    
    def execute_query(self, query: str, db_type: str = 'sqlite') -> List[Dict]:
        """Izvršitev SQL poizvedbe"""
        conn = None
        try:
            if db_type == 'postgresql':
                conn = self.connect_postgresql()
            elif db_type == 'mysql':
                conn = self.connect_mysql()
            else:
                conn = self.connect_sqlite()
            
            if not conn:
                return []
            
            cursor = conn.cursor()
            cursor.execute(query)
            
            # Pridobi imena stolpcev
            columns = [desc[0] for desc in cursor.description]
            
            # Pridobi podatke
            rows = cursor.fetchall()
            
            # Pretvori v seznam slovarjev
            results = []
            for row in rows:
                results.append(dict(zip(columns, row)))
            
            return results
            
        except Exception as e:
            self.logger.error(f"Napaka pri izvršitvi poizvedbe: {e}")
            return []
        finally:
            if conn:
                conn.close()
    
    def analyze_sales_data(self, days: int = 30) -> Dict:
        """Analiza prodajnih podatkov"""
        query = f"""
        SELECT 
            product_name,
            SUM(quantity) as total_quantity,
            SUM(revenue) as total_revenue,
            AVG(price) as avg_price,
            COUNT(*) as transaction_count
        FROM sales_data 
        WHERE sale_date >= date('now', '-{days} days')
        GROUP BY product_name
        ORDER BY total_revenue DESC
        """
        
        results = self.execute_query(query)
        
        analysis = {
            'period_days': days,
            'total_products': len(results),
            'products': results,
            'summary': {
                'total_revenue': sum(r.get('total_revenue', 0) for r in results),
                'total_transactions': sum(r.get('transaction_count', 0) for r in results),
                'top_product': results[0] if results else None
            }
        }
        
        return analysis
    
    def analyze_inventory(self) -> Dict:
        """Analiza zalog"""
        query = """
        SELECT 
            product_name,
            current_stock,
            min_stock_level,
            max_stock_level,
            last_restock_date,
            CASE 
                WHEN current_stock <= min_stock_level THEN 'LOW'
                WHEN current_stock >= max_stock_level THEN 'HIGH'
                ELSE 'NORMAL'
            END as stock_status
        FROM inventory
        ORDER BY current_stock ASC
        """
        
        results = self.execute_query(query)
        
        low_stock = [r for r in results if r.get('stock_status') == 'LOW']
        high_stock = [r for r in results if r.get('stock_status') == 'HIGH']
        
        return {
            'total_products': len(results),
            'low_stock_items': len(low_stock),
            'high_stock_items': len(high_stock),
            'low_stock_products': low_stock,
            'high_stock_products': high_stock,
            'recommendations': self._generate_inventory_recommendations(low_stock, high_stock)
        }
    
    def analyze_financial_kpi(self, period_days: int = 30) -> Dict:
        """Analiza finančnih KPI"""
        revenue_query = f"""
        SELECT 
            DATE(transaction_date) as date,
            SUM(amount) as daily_revenue
        FROM financial_transactions 
        WHERE transaction_type = 'REVENUE' 
        AND transaction_date >= date('now', '-{period_days} days')
        GROUP BY DATE(transaction_date)
        ORDER BY date
        """
        
        expense_query = f"""
        SELECT 
            DATE(transaction_date) as date,
            SUM(amount) as daily_expense
        FROM financial_transactions 
        WHERE transaction_type = 'EXPENSE' 
        AND transaction_date >= date('now', '-{period_days} days')
        GROUP BY DATE(transaction_date)
        ORDER BY date
        """
        
        revenue_data = self.execute_query(revenue_query)
        expense_data = self.execute_query(expense_query)
        
        total_revenue = sum(r.get('daily_revenue', 0) for r in revenue_data)
        total_expenses = sum(e.get('daily_expense', 0) for e in expense_data)
        profit = total_revenue - total_expenses
        
        return {
            'period_days': period_days,
            'total_revenue': total_revenue,
            'total_expenses': total_expenses,
            'profit': profit,
            'profit_margin': (profit / total_revenue * 100) if total_revenue > 0 else 0,
            'daily_revenue': revenue_data,
            'daily_expenses': expense_data,
            'recommendations': self._generate_financial_recommendations(profit, total_revenue)
        }
    
    def _generate_inventory_recommendations(self, low_stock: List, high_stock: List) -> List[str]:
        """Generiranje priporočil za zaloge"""
        recommendations = []
        
        if low_stock:
            recommendations.append(f"URGENTNO: {len(low_stock)} izdelkov ima nizke zaloge - potrebno naročilo")
            for item in low_stock[:3]:  # Top 3 kritični izdelki
                recommendations.append(f"- {item['product_name']}: trenutno {item['current_stock']}, minimum {item['min_stock_level']}")
        
        if high_stock:
            recommendations.append(f"OPOZORILO: {len(high_stock)} izdelkov ima previsoke zaloge - možna promocija")
        
        return recommendations
    
    def _generate_financial_recommendations(self, profit: float, revenue: float) -> List[str]:
        """Generiranje finančnih priporočil"""
        recommendations = []
        
        if profit < 0:
            recommendations.append("KRITIČNO: Negativen profit - potrebna takojšnja analiza stroškov")
        elif profit / revenue < 0.1:  # Manj kot 10% marža
            recommendations.append("OPOZORILO: Nizka profitabilnost - optimizacija potrebna")
        else:
            recommendations.append("POZITIVNO: Zdrava profitabilnost")
        
        return recommendations
    
    def handle(self, query: str) -> str:
        """Glavna funkcija za obravnavo zahtev"""
        query_lower = query.lower()
        
        try:
            if 'prodaja' in query_lower or 'sales' in query_lower:
                days = 30
                if 'teden' in query_lower or 'week' in query_lower:
                    days = 7
                elif 'mesec' in query_lower or 'month' in query_lower:
                    days = 30
                
                analysis = self.analyze_sales_data(days)
                return self._format_sales_report(analysis)
            
            elif 'zaloge' in query_lower or 'inventory' in query_lower:
                analysis = self.analyze_inventory()
                return self._format_inventory_report(analysis)
            
            elif 'finance' in query_lower or 'kpi' in query_lower:
                analysis = self.analyze_financial_kpi()
                return self._format_financial_report(analysis)
            
            else:
                return "Podprti tipi analiz: prodaja, zaloge, finance. Primer: 'Analiziraj prodajo zadnjih 30 dni'"
        
        except Exception as e:
            self.logger.error(f"Napaka pri obravnavi zahteve: {e}")
            return f"Napaka pri analizi podatkov: {str(e)}"
    
    def _format_sales_report(self, analysis: Dict) -> str:
        """Formatiranje poročila o prodaji"""
        report = f"📊 ANALIZA PRODAJE ({analysis['period_days']} dni)\n\n"
        
        summary = analysis['summary']
        report += f"💰 Skupni prihodek: €{summary['total_revenue']:,.2f}\n"
        report += f"🛒 Skupno transakcij: {summary['total_transactions']}\n"
        report += f"📦 Število izdelkov: {analysis['total_products']}\n\n"
        
        if summary['top_product']:
            top = summary['top_product']
            report += f"🏆 TOP IZDELEK: {top['product_name']}\n"
            report += f"   - Prihodek: €{top['total_revenue']:,.2f}\n"
            report += f"   - Količina: {top['total_quantity']}\n\n"
        
        report += "📈 TOP 5 IZDELKOV:\n"
        for i, product in enumerate(analysis['products'][:5], 1):
            report += f"{i}. {product['product_name']}: €{product['total_revenue']:,.2f}\n"
        
        return report
    
    def _format_inventory_report(self, analysis: Dict) -> str:
        """Formatiranje poročila o zalogah"""
        report = f"📦 ANALIZA ZALOG\n\n"
        
        report += f"📊 Skupno izdelkov: {analysis['total_products']}\n"
        report += f"⚠️ Nizke zaloge: {analysis['low_stock_items']}\n"
        report += f"📈 Visoke zaloge: {analysis['high_stock_items']}\n\n"
        
        if analysis['recommendations']:
            report += "💡 PRIPOROČILA:\n"
            for rec in analysis['recommendations']:
                report += f"• {rec}\n"
        
        return report
    
    def _format_financial_report(self, analysis: Dict) -> str:
        """Formatiranje finančnega poročila"""
        report = f"💰 FINANČNI KPI ({analysis['period_days']} dni)\n\n"
        
        report += f"📈 Prihodki: €{analysis['total_revenue']:,.2f}\n"
        report += f"📉 Odhodki: €{analysis['total_expenses']:,.2f}\n"
        report += f"💵 Profit: €{analysis['profit']:,.2f}\n"
        report += f"📊 Marža: {analysis['profit_margin']:.1f}%\n\n"
        
        if analysis['recommendations']:
            report += "💡 PRIPOROČILA:\n"
            for rec in analysis['recommendations']:
                report += f"• {rec}\n"
        
        return report

# CSV Data Handler za hitro implementacijo
class CSVDataHandler:
    """Obravnava CSV datotek za hitro implementacijo"""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.name = "csv_analyzer"
        self.description = "Analiza podatkov iz CSV datotek"
    
    def load_csv(self, filename: str) -> pd.DataFrame:
        """Naloži CSV datoteko"""
        filepath = os.path.join(self.data_dir, filename)
        if os.path.exists(filepath):
            return pd.read_csv(filepath)
        return pd.DataFrame()
    
    def analyze_csv_sales(self, filename: str = "sales.csv") -> Dict:
        """Analiza prodajnih podatkov iz CSV"""
        df = self.load_csv(filename)
        if df.empty:
            return {"error": f"CSV datoteka {filename} ni najdena"}
        
        # Osnovne statistike
        analysis = {
            'total_rows': len(df),
            'columns': list(df.columns),
            'summary': df.describe().to_dict() if not df.empty else {}
        }
        
        # Če obstajajo specifični stolpci
        if 'revenue' in df.columns:
            analysis['total_revenue'] = df['revenue'].sum()
            analysis['avg_revenue'] = df['revenue'].mean()
        
        if 'product' in df.columns:
            analysis['top_products'] = df.groupby('product')['revenue'].sum().sort_values(ascending=False).head().to_dict()
        
        return analysis

# Glavna integracija
class OmniRealDataCore:
    """Glavni sistem za realne podatke"""
    
    def __init__(self):
        self.analyzers = {
            'database': RealDataAnalyzer(),
            'csv': CSVDataHandler()
        }
        self.logger = logging.getLogger(__name__)
    
    def route_query(self, query: str) -> str:
        """Usmeri zahtevo na pravi analyzer"""
        # Preprosta logika usmerjanja
        if 'csv' in query.lower():
            return self.analyzers['csv'].handle(query)
        else:
            return self.analyzers['database'].handle(query)
    
    def get_system_status(self) -> Dict:
        """Status sistema za realne podatke"""
        status = {
            'timestamp': datetime.now().isoformat(),
            'analyzers': {},
            'database_connections': {}
        }
        
        # Preveri povezljivost baz
        db_analyzer = self.analyzers['database']
        
        # Test SQLite
        try:
            conn = db_analyzer.connect_sqlite()
            status['database_connections']['sqlite'] = 'connected' if conn else 'failed'
            if conn:
                conn.close()
        except:
            status['database_connections']['sqlite'] = 'failed'
        
        # Test PostgreSQL
        try:
            conn = db_analyzer.connect_postgresql()
            status['database_connections']['postgresql'] = 'connected' if conn else 'failed'
            if conn:
                conn.close()
        except:
            status['database_connections']['postgresql'] = 'failed'
        
        # Test MySQL
        try:
            conn = db_analyzer.connect_mysql()
            status['database_connections']['mysql'] = 'connected' if conn else 'failed'
            if conn:
                conn.close()
        except:
            status['database_connections']['mysql'] = 'failed'
        
        return status

# Primer uporabe
if __name__ == "__main__":
    # Inicializacija
    real_data_core = OmniRealDataCore()
    
    # Test zahtev
    test_queries = [
        "Analiziraj prodajo zadnjih 30 dni",
        "Preveri stanje zalog",
        "Prikaži finančne KPI"
    ]
    
    print("🚀 OmniCore Real Data Integration Test\n")
    
    for query in test_queries:
        print(f"Zahteva: {query}")
        response = real_data_core.route_query(query)
        print(f"Odgovor: {response}\n")
        print("-" * 50)
    
    # Status sistema
    print("\n📊 Status sistema:")
    status = real_data_core.get_system_status()
    print(json.dumps(status, indent=2, default=str))