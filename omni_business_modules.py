"""
OmniCore Business Modules
Specializirani moduli za različne poslovne domene z realnimi podatki
"""

import os
import json
import sqlite3
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
from omni_real_data import RealDataAnalyzer

class FinanceModule:
    """Finančni modul za upravljanje prihodkov, odhodkov in KPI"""
    
    def __init__(self):
        self.name = "finance"
        self.description = "Finančno upravljanje in analitika"
        self.data_analyzer = RealDataAnalyzer()
        self.logger = logging.getLogger(__name__)
    
    def get_cash_flow(self, days: int = 30) -> Dict:
        """Analiza denarnega toka"""
        query = f"""
        SELECT 
            DATE(transaction_date) as date,
            transaction_type,
            SUM(amount) as daily_amount,
            category,
            description
        FROM financial_transactions 
        WHERE transaction_date >= date('now', '-{days} days')
        GROUP BY DATE(transaction_date), transaction_type, category
        ORDER BY date DESC
        """
        
        results = self.data_analyzer.execute_query(query)
        
        # Ločimo prihodke in odhodke
        income = [r for r in results if r['transaction_type'] == 'INCOME']
        expenses = [r for r in results if r['transaction_type'] == 'EXPENSE']
        
        total_income = sum(r['daily_amount'] for r in income)
        total_expenses = sum(r['daily_amount'] for r in expenses)
        net_cash_flow = total_income - total_expenses
        
        return {
            'period_days': days,
            'total_income': total_income,
            'total_expenses': total_expenses,
            'net_cash_flow': net_cash_flow,
            'cash_flow_ratio': (total_income / total_expenses) if total_expenses > 0 else 0,
            'daily_breakdown': results,
            'recommendations': self._generate_cash_flow_recommendations(net_cash_flow, total_income, total_expenses)
        }
    
    def budget_analysis(self) -> Dict:
        """Analiza proračuna vs. dejanski stroški"""
        budget_query = """
        SELECT category, budgeted_amount, period_start, period_end
        FROM budget_plan 
        WHERE period_start <= date('now') AND period_end >= date('now')
        """
        
        actual_query = """
        SELECT 
            category,
            SUM(amount) as actual_spent
        FROM financial_transactions 
        WHERE transaction_type = 'EXPENSE'
        AND transaction_date >= date('now', 'start of month')
        GROUP BY category
        """
        
        budget_data = self.data_analyzer.execute_query(budget_query)
        actual_data = self.data_analyzer.execute_query(actual_query)
        
        # Združi podatke
        analysis = []
        for budget in budget_data:
            category = budget['category']
            budgeted = budget['budgeted_amount']
            
            actual = next((a['actual_spent'] for a in actual_data if a['category'] == category), 0)
            variance = actual - budgeted
            variance_percent = (variance / budgeted * 100) if budgeted > 0 else 0
            
            analysis.append({
                'category': category,
                'budgeted': budgeted,
                'actual': actual,
                'variance': variance,
                'variance_percent': variance_percent,
                'status': 'OVER' if variance > 0 else 'UNDER' if variance < 0 else 'ON_TARGET'
            })
        
        return {
            'budget_analysis': analysis,
            'total_budgeted': sum(b['budgeted'] for b in analysis),
            'total_actual': sum(b['actual'] for b in analysis),
            'categories_over_budget': len([a for a in analysis if a['status'] == 'OVER']),
            'recommendations': self._generate_budget_recommendations(analysis)
        }
    
    def _generate_cash_flow_recommendations(self, net_flow: float, income: float, expenses: float) -> List[str]:
        """Priporočila za denarni tok"""
        recommendations = []
        
        if net_flow < 0:
            recommendations.append("🚨 NEGATIVEN DENARNI TOK - potrebno takojšnje ukrepanje")
            recommendations.append("💡 Preglej možnosti zmanjšanja stroškov")
            recommendations.append("📈 Razmisli o povečanju prihodkov")
        elif net_flow < income * 0.1:  # Manj kot 10% prihodkov
            recommendations.append("⚠️ NIZEK DENARNI TOK - previdnost priporočena")
        else:
            recommendations.append("✅ ZDRAV DENARNI TOK")
            recommendations.append("💰 Razmisli o investicijskih možnostih")
        
        return recommendations
    
    def _generate_budget_recommendations(self, analysis: List[Dict]) -> List[str]:
        """Priporočila za proračun"""
        recommendations = []
        over_budget = [a for a in analysis if a['status'] == 'OVER']
        
        if over_budget:
            recommendations.append(f"⚠️ {len(over_budget)} kategorij presega proračun")
            for item in over_budget[:3]:  # Top 3
                recommendations.append(f"- {item['category']}: {item['variance_percent']:.1f}% nad proračunom")
        else:
            recommendations.append("✅ Vsi stroški v okviru proračuna")
        
        return recommendations
    
    def handle(self, query: str) -> str:
        """Obravnava finančnih zahtev"""
        query_lower = query.lower()
        
        if 'denarni tok' in query_lower or 'cash flow' in query_lower:
            analysis = self.get_cash_flow()
            return self._format_cash_flow_report(analysis)
        elif 'proračun' in query_lower or 'budget' in query_lower:
            analysis = self.budget_analysis()
            return self._format_budget_report(analysis)
        else:
            return "Finančne analize: 'denarni tok', 'proračun'"
    
    def _format_cash_flow_report(self, analysis: Dict) -> str:
        """Formatiranje poročila o denarnem toku"""
        report = f"💰 DENARNI TOK ({analysis['period_days']} dni)\n\n"
        report += f"📈 Prihodki: €{analysis['total_income']:,.2f}\n"
        report += f"📉 Odhodki: €{analysis['total_expenses']:,.2f}\n"
        report += f"💵 Neto tok: €{analysis['net_cash_flow']:,.2f}\n"
        report += f"📊 Razmerje: {analysis['cash_flow_ratio']:.2f}\n\n"
        
        if analysis['recommendations']:
            report += "💡 PRIPOROČILA:\n"
            for rec in analysis['recommendations']:
                report += f"{rec}\n"
        
        return report
    
    def _format_budget_report(self, analysis: Dict) -> str:
        """Formatiranje poročila o proračunu"""
        report = "📊 ANALIZA PRORAČUNA\n\n"
        report += f"💰 Skupaj načrtovano: €{analysis['total_budgeted']:,.2f}\n"
        report += f"💸 Skupaj porabljeno: €{analysis['total_actual']:,.2f}\n"
        report += f"⚠️ Kategorij nad proračunom: {analysis['categories_over_budget']}\n\n"
        
        if analysis['recommendations']:
            report += "💡 PRIPOROČILA:\n"
            for rec in analysis['recommendations']:
                report += f"{rec}\n"
        
        return report

class LogisticsModule:
    """Logistični modul za upravljanje zalog, dostav in optimizacijo"""
    
    def __init__(self):
        self.name = "logistics"
        self.description = "Logistično upravljanje in optimizacija"
        self.data_analyzer = RealDataAnalyzer()
    
    def optimize_delivery_routes(self) -> Dict:
        """Optimizacija dostavljalnih poti"""
        query = """
        SELECT 
            delivery_id,
            customer_address,
            delivery_date,
            status,
            driver_id,
            estimated_time,
            actual_time,
            distance_km
        FROM deliveries 
        WHERE delivery_date >= date('now', '-7 days')
        ORDER BY delivery_date DESC
        """
        
        deliveries = self.data_analyzer.execute_query(query)
        
        # Analiza učinkovitosti
        completed = [d for d in deliveries if d['status'] == 'COMPLETED']
        total_distance = sum(d.get('distance_km', 0) for d in completed)
        total_time = sum(d.get('actual_time', 0) for d in completed if d.get('actual_time'))
        
        # Povprečja
        avg_distance = total_distance / len(completed) if completed else 0
        avg_time = total_time / len(completed) if completed else 0
        
        return {
            'total_deliveries': len(deliveries),
            'completed_deliveries': len(completed),
            'completion_rate': len(completed) / len(deliveries) * 100 if deliveries else 0,
            'total_distance_km': total_distance,
            'total_time_hours': total_time,
            'avg_distance_per_delivery': avg_distance,
            'avg_time_per_delivery': avg_time,
            'efficiency_score': self._calculate_delivery_efficiency(completed),
            'recommendations': self._generate_logistics_recommendations(deliveries, completed)
        }
    
    def inventory_optimization(self) -> Dict:
        """Optimizacija zalog"""
        query = """
        SELECT 
            product_id,
            product_name,
            current_stock,
            min_stock_level,
            max_stock_level,
            avg_daily_sales,
            lead_time_days,
            storage_cost_per_unit,
            last_order_date
        FROM inventory_optimization_view
        """
        
        inventory = self.data_analyzer.execute_query(query)
        
        # Izračun optimalnih količin (EOQ - Economic Order Quantity)
        optimized_inventory = []
        for item in inventory:
            eoq = self._calculate_eoq(
                item.get('avg_daily_sales', 0) * 365,  # Letna poraba
                item.get('storage_cost_per_unit', 1),
                50  # Predpostavljena cena naročila
            )
            
            reorder_point = (item.get('avg_daily_sales', 0) * item.get('lead_time_days', 7)) + \
                           (item.get('avg_daily_sales', 0) * 3)  # Varnostna zaloga
            
            optimized_inventory.append({
                'product_name': item['product_name'],
                'current_stock': item['current_stock'],
                'optimal_order_quantity': eoq,
                'reorder_point': reorder_point,
                'days_of_stock': item['current_stock'] / item.get('avg_daily_sales', 1) if item.get('avg_daily_sales', 0) > 0 else 999,
                'action_needed': self._determine_inventory_action(item, eoq, reorder_point)
            })
        
        return {
            'total_products': len(inventory),
            'optimized_inventory': optimized_inventory,
            'products_needing_reorder': len([i for i in optimized_inventory if 'ORDER' in i['action_needed']]),
            'overstocked_products': len([i for i in optimized_inventory if 'REDUCE' in i['action_needed']]),
            'recommendations': self._generate_inventory_optimization_recommendations(optimized_inventory)
        }
    
    def _calculate_eoq(self, annual_demand: float, holding_cost: float, order_cost: float) -> float:
        """Izračun Economic Order Quantity"""
        if holding_cost <= 0 or annual_demand <= 0:
            return 0
        return ((2 * annual_demand * order_cost) / holding_cost) ** 0.5
    
    def _calculate_delivery_efficiency(self, completed_deliveries: List[Dict]) -> float:
        """Izračun učinkovitosti dostav"""
        if not completed_deliveries:
            return 0
        
        on_time = len([d for d in completed_deliveries if d.get('actual_time', 0) <= d.get('estimated_time', 0)])
        return (on_time / len(completed_deliveries)) * 100
    
    def _determine_inventory_action(self, item: Dict, eoq: float, reorder_point: float) -> str:
        """Določi potrebno dejanje za zalogo"""
        current = item['current_stock']
        
        if current <= reorder_point:
            return f"ORDER {int(eoq)} units"
        elif current > item.get('max_stock_level', 1000):
            return "REDUCE - Overstocked"
        else:
            return "MAINTAIN - Optimal"
    
    def _generate_logistics_recommendations(self, all_deliveries: List, completed: List) -> List[str]:
        """Priporočila za logistiko"""
        recommendations = []
        
        completion_rate = len(completed) / len(all_deliveries) * 100 if all_deliveries else 0
        
        if completion_rate < 90:
            recommendations.append(f"⚠️ Nizka stopnja dokončanih dostav: {completion_rate:.1f}%")
            recommendations.append("🔧 Preglej vzroke za nedokončane dostave")
        
        if completed:
            avg_time = sum(d.get('actual_time', 0) for d in completed) / len(completed)
            if avg_time > 2:  # Več kot 2 uri povprečno
                recommendations.append("⏰ Dolgi časi dostave - optimizacija poti potrebna")
        
        return recommendations
    
    def _generate_inventory_optimization_recommendations(self, inventory: List[Dict]) -> List[str]:
        """Priporočila za optimizacijo zalog"""
        recommendations = []
        
        need_reorder = [i for i in inventory if 'ORDER' in i['action_needed']]
        overstocked = [i for i in inventory if 'REDUCE' in i['action_needed']]
        
        if need_reorder:
            recommendations.append(f"📦 {len(need_reorder)} izdelkov potrebuje naročilo")
            for item in need_reorder[:3]:
                recommendations.append(f"- {item['product_name']}: naroči {item['optimal_order_quantity']:.0f} enot")
        
        if overstocked:
            recommendations.append(f"📈 {len(overstocked)} izdelkov je preveč na zalogi")
            recommendations.append("💡 Razmisli o promocijskih akcijah")
        
        return recommendations
    
    def handle(self, query: str) -> str:
        """Obravnava logističnih zahtev"""
        query_lower = query.lower()
        
        if 'dostava' in query_lower or 'delivery' in query_lower:
            analysis = self.optimize_delivery_routes()
            return self._format_delivery_report(analysis)
        elif 'zaloge' in query_lower or 'inventory' in query_lower:
            analysis = self.inventory_optimization()
            return self._format_inventory_optimization_report(analysis)
        else:
            return "Logistične analize: 'dostave', 'zaloge'"
    
    def _format_delivery_report(self, analysis: Dict) -> str:
        """Formatiranje poročila o dostavah"""
        report = "🚚 ANALIZA DOSTAV\n\n"
        report += f"📦 Skupno dostav: {analysis['total_deliveries']}\n"
        report += f"✅ Dokončanih: {analysis['completed_deliveries']}\n"
        report += f"📊 Stopnja dokončanja: {analysis['completion_rate']:.1f}%\n"
        report += f"🛣️ Skupna razdalja: {analysis['total_distance_km']:.1f} km\n"
        report += f"⏱️ Povprečen čas: {analysis['avg_time_per_delivery']:.1f} h\n"
        report += f"🎯 Učinkovitost: {analysis['efficiency_score']:.1f}%\n\n"
        
        if analysis['recommendations']:
            report += "💡 PRIPOROČILA:\n"
            for rec in analysis['recommendations']:
                report += f"{rec}\n"
        
        return report
    
    def _format_inventory_optimization_report(self, analysis: Dict) -> str:
        """Formatiranje poročila o optimizaciji zalog"""
        report = "📦 OPTIMIZACIJA ZALOG\n\n"
        report += f"📊 Skupno izdelkov: {analysis['total_products']}\n"
        report += f"🔄 Potrebno naročilo: {analysis['products_needing_reorder']}\n"
        report += f"📈 Preveč na zalogi: {analysis['overstocked_products']}\n\n"
        
        if analysis['recommendations']:
            report += "💡 PRIPOROČILA:\n"
            for rec in analysis['recommendations']:
                report += f"{rec}\n"
        
        return report

class TourismModule:
    """Turistični modul za upravljanje nastanitev, aktivnosti in gostov"""
    
    def __init__(self):
        self.name = "tourism"
        self.description = "Turistično upravljanje in optimizacija"
        self.data_analyzer = RealDataAnalyzer()
    
    def analyze_bookings(self, days: int = 30) -> Dict:
        """Analiza rezervacij"""
        query = f"""
        SELECT 
            booking_date,
            check_in_date,
            check_out_date,
            guests_count,
            room_type,
            total_price,
            booking_source,
            status
        FROM bookings 
        WHERE booking_date >= date('now', '-{days} days')
        ORDER BY booking_date DESC
        """
        
        bookings = self.data_analyzer.execute_query(query)
        
        # Statistike
        total_revenue = sum(b.get('total_price', 0) for b in bookings)
        total_guests = sum(b.get('guests_count', 0) for b in bookings)
        avg_booking_value = total_revenue / len(bookings) if bookings else 0
        
        # Analiza po virih
        sources = {}
        for booking in bookings:
            source = booking.get('booking_source', 'Unknown')
            if source not in sources:
                sources[source] = {'count': 0, 'revenue': 0}
            sources[source]['count'] += 1
            sources[source]['revenue'] += booking.get('total_price', 0)
        
        return {
            'period_days': days,
            'total_bookings': len(bookings),
            'total_revenue': total_revenue,
            'total_guests': total_guests,
            'avg_booking_value': avg_booking_value,
            'booking_sources': sources,
            'occupancy_rate': self._calculate_occupancy_rate(bookings),
            'recommendations': self._generate_tourism_recommendations(bookings, sources)
        }
    
    def seasonal_analysis(self) -> Dict:
        """Sezonska analiza turizma"""
        query = """
        SELECT 
            strftime('%m', check_in_date) as month,
            COUNT(*) as bookings_count,
            SUM(total_price) as monthly_revenue,
            AVG(guests_count) as avg_guests
        FROM bookings 
        WHERE check_in_date >= date('now', '-365 days')
        GROUP BY strftime('%m', check_in_date)
        ORDER BY month
        """
        
        monthly_data = self.data_analyzer.execute_query(query)
        
        # Določi sezono
        peak_months = sorted(monthly_data, key=lambda x: x['bookings_count'], reverse=True)[:3]
        low_months = sorted(monthly_data, key=lambda x: x['bookings_count'])[:3]
        
        return {
            'monthly_breakdown': monthly_data,
            'peak_season': [m['month'] for m in peak_months],
            'low_season': [m['month'] for m in low_months],
            'seasonal_variance': self._calculate_seasonal_variance(monthly_data),
            'recommendations': self._generate_seasonal_recommendations(peak_months, low_months)
        }
    
    def _calculate_occupancy_rate(self, bookings: List[Dict]) -> float:
        """Izračun zasedenosti"""
        # Poenostavljena logika - v resnici bi potrebovali podatke o razpoložljivih sobah
        total_room_nights = len(bookings) * 2  # Povprečno 2 noči
        available_room_nights = 30 * 20  # 30 dni * 20 sob (primer)
        return (total_room_nights / available_room_nights) * 100 if available_room_nights > 0 else 0
    
    def _calculate_seasonal_variance(self, monthly_data: List[Dict]) -> float:
        """Izračun sezonske variance"""
        if not monthly_data:
            return 0
        
        revenues = [m['monthly_revenue'] for m in monthly_data]
        avg_revenue = sum(revenues) / len(revenues)
        variance = sum((r - avg_revenue) ** 2 for r in revenues) / len(revenues)
        return (variance ** 0.5) / avg_revenue * 100 if avg_revenue > 0 else 0
    
    def _generate_tourism_recommendations(self, bookings: List, sources: Dict) -> List[str]:
        """Priporočila za turizem"""
        recommendations = []
        
        if not bookings:
            recommendations.append("📉 Ni rezervacij - potrebna marketinška kampanja")
            return recommendations
        
        # Analiza virov
        best_source = max(sources.items(), key=lambda x: x[1]['revenue'])
        recommendations.append(f"🏆 Najboljši vir rezervacij: {best_source[0]}")
        
        # Povprečna vrednost
        avg_value = sum(b.get('total_price', 0) for b in bookings) / len(bookings)
        if avg_value < 100:
            recommendations.append("💰 Nizka povprečna vrednost rezervacije - razmisli o premium storitvah")
        
        return recommendations
    
    def _generate_seasonal_recommendations(self, peak_months: List, low_months: List) -> List[str]:
        """Sezonska priporočila"""
        recommendations = []
        
        peak_month_names = [self._month_name(int(m['month'])) for m in peak_months]
        low_month_names = [self._month_name(int(m['month'])) for m in low_months]
        
        recommendations.append(f"📈 Vrhunski meseci: {', '.join(peak_month_names)}")
        recommendations.append(f"📉 Šibki meseci: {', '.join(low_month_names)}")
        recommendations.append("💡 Pripravi posebne ponudbe za šibke mesece")
        
        return recommendations
    
    def _month_name(self, month_num: int) -> str:
        """Ime meseca"""
        months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 
                 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']
        return months[month_num] if 1 <= month_num <= 12 else str(month_num)
    
    def handle(self, query: str) -> str:
        """Obravnava turističnih zahtev"""
        query_lower = query.lower()
        
        if 'rezervacij' in query_lower or 'booking' in query_lower:
            analysis = self.analyze_bookings()
            return self._format_booking_report(analysis)
        elif 'sezon' in query_lower or 'seasonal' in query_lower:
            analysis = self.seasonal_analysis()
            return self._format_seasonal_report(analysis)
        else:
            return "Turistične analize: 'rezervacije', 'sezonska analiza'"
    
    def _format_booking_report(self, analysis: Dict) -> str:
        """Formatiranje poročila o rezervacijah"""
        report = f"🏨 ANALIZA REZERVACIJ ({analysis['period_days']} dni)\n\n"
        report += f"📊 Skupno rezervacij: {analysis['total_bookings']}\n"
        report += f"💰 Skupni prihodek: €{analysis['total_revenue']:,.2f}\n"
        report += f"👥 Skupno gostov: {analysis['total_guests']}\n"
        report += f"💵 Povprečna vrednost: €{analysis['avg_booking_value']:,.2f}\n"
        report += f"🏠 Zasedenost: {analysis['occupancy_rate']:.1f}%\n\n"
        
        if analysis['recommendations']:
            report += "💡 PRIPOROČILA:\n"
            for rec in analysis['recommendations']:
                report += f"{rec}\n"
        
        return report
    
    def _format_seasonal_report(self, analysis: Dict) -> str:
        """Formatiranje sezonskega poročila"""
        report = "📅 SEZONSKA ANALIZA\n\n"
        report += f"📈 Sezonska varianca: {analysis['seasonal_variance']:.1f}%\n\n"
        
        if analysis['recommendations']:
            report += "💡 PRIPOROČILA:\n"
            for rec in analysis['recommendations']:
                report += f"{rec}\n"
        
        return report

# Glavni sistem za poslovne module
class OmniBusinessCore:
    """Glavni sistem za poslovne module"""
    
    def __init__(self):
        self.modules = {
            'finance': FinanceModule(),
            'logistics': LogisticsModule(),
            'tourism': TourismModule()
        }
        self.logger = logging.getLogger(__name__)
    
    def route_business_query(self, query: str) -> str:
        """Usmeri poslovno zahtevo na pravi modul"""
        query_lower = query.lower()
        
        # Ključne besede za usmerjanje
        if any(word in query_lower for word in ['finance', 'finančn', 'denar', 'proračun', 'cash']):
            return self.modules['finance'].handle(query)
        elif any(word in query_lower for word in ['logistic', 'logistič', 'dostav', 'zalog', 'inventory']):
            return self.modules['logistics'].handle(query)
        elif any(word in query_lower for word in ['turiz', 'tourism', 'hotel', 'rezervacij', 'booking']):
            return self.modules['tourism'].handle(query)
        else:
            return self._show_available_modules()
    
    def _show_available_modules(self) -> str:
        """Prikaži razpoložljive module"""
        return """🏢 RAZPOLOŽLJIVI POSLOVNI MODULI:

💰 FINANCE
- Denarni tok in cash flow analiza
- Proračunska analiza
- KPI in finančne metrike

🚚 LOGISTIKA  
- Optimizacija dostav
- Upravljanje zalog
- Analiza učinkovitosti

🏨 TURIZEM
- Analiza rezervacij
- Sezonska analiza
- Optimizacija zasedenosti

Primer uporabe: "Analiziraj finančni denarni tok" ali "Optimiziraj logistične zaloge"
"""
    
    def get_business_status(self) -> Dict:
        """Status vseh poslovnih modulov"""
        return {
            'timestamp': datetime.now().isoformat(),
            'active_modules': list(self.modules.keys()),
            'module_status': {name: 'active' for name in self.modules.keys()}
        }

# Primer uporabe
if __name__ == "__main__":
    business_core = OmniBusinessCore()
    
    test_queries = [
        "Analiziraj finančni denarni tok",
        "Optimiziraj logistične zaloge", 
        "Prikaži turistične rezervacije",
        "Sezonska analiza turizma"
    ]
    
    print("🏢 OmniCore Business Modules Test\n")
    
    for query in test_queries:
        print(f"Zahteva: {query}")
        response = business_core.route_business_query(query)
        print(f"Odgovor: {response}\n")
        print("-" * 50)