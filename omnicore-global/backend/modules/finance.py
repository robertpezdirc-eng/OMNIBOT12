"""
OmniCore Finance Module
Finančni modul z ERP integracijami in real-time analitiko
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json
import aiohttp
from decimal import Decimal

logger = logging.getLogger(__name__)

class FinanceModule:
    """Finančni modul za OmniCore Global"""
    
    def __init__(self, db_manager, config):
        self.db_manager = db_manager
        self.config = config
        self.module_config = config.get_module_config("finance")
        
        self.name = "finance"
        self.description = "Finančni modul z ERP integracijami, fakturiranjem in analitiko"
        self.version = "1.0.0"
        self.capabilities = [
            "invoice_management",
            "payment_tracking", 
            "budget_analysis",
            "erp_integration",
            "financial_reporting",
            "cost_optimization"
        ]
        
        # Demo podatki
        self.demo_data = self._initialize_demo_data()
        
        logger.info("💰 Finance Module inicializiran")
    
    def _initialize_demo_data(self) -> Dict[str, Any]:
        """Inicializacija demo finančnih podatkov"""
        return {
            "invoices": [
                {
                    "id": "INV-2024-001",
                    "customer": "ABC d.o.o.",
                    "amount": 2500.00,
                    "currency": "EUR",
                    "due_date": "2024-02-15",
                    "status": "pending",
                    "created_date": "2024-01-15"
                },
                {
                    "id": "INV-2024-002", 
                    "customer": "XYZ s.p.",
                    "amount": 1200.00,
                    "currency": "EUR",
                    "due_date": "2024-02-20",
                    "status": "paid",
                    "created_date": "2024-01-20"
                },
                {
                    "id": "INV-2024-003",
                    "customer": "Global Corp",
                    "amount": 5000.00,
                    "currency": "EUR", 
                    "due_date": "2024-03-01",
                    "status": "overdue",
                    "created_date": "2024-01-01"
                }
            ],
            "expenses": [
                {
                    "id": "EXP-2024-001",
                    "category": "Office Supplies",
                    "amount": 350.00,
                    "currency": "EUR",
                    "date": "2024-01-10",
                    "description": "Pisarniški material"
                },
                {
                    "id": "EXP-2024-002",
                    "category": "Marketing",
                    "amount": 1500.00,
                    "currency": "EUR",
                    "date": "2024-01-15",
                    "description": "Google Ads kampanja"
                }
            ],
            "budget": {
                "monthly_budget": 10000.00,
                "spent_this_month": 6750.00,
                "remaining": 3250.00,
                "categories": {
                    "marketing": {"budget": 3000.00, "spent": 1500.00},
                    "operations": {"budget": 4000.00, "spent": 2800.00},
                    "office": {"budget": 1000.00, "spent": 350.00},
                    "travel": {"budget": 2000.00, "spent": 2100.00}
                }
            }
        }
    
    async def handle(self, query: str, tenant_id: str = "default", 
                    user_id: str = "anonymous", context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Glavna metoda za obdelavo finančnih poizvedb"""
        
        query_lower = query.lower()
        
        try:
            # Analiza poizvedbe in usmerjanje
            if any(word in query_lower for word in ["invoice", "račun", "faktura"]):
                return await self._handle_invoice_query(query, tenant_id, context)
            
            elif any(word in query_lower for word in ["payment", "plačilo", "dolgovi"]):
                return await self._handle_payment_query(query, tenant_id, context)
            
            elif any(word in query_lower for word in ["budget", "proračun", "stroški"]):
                return await self._handle_budget_query(query, tenant_id, context)
            
            elif any(word in query_lower for word in ["expense", "izdatek", "strošek"]):
                return await self._handle_expense_query(query, tenant_id, context)
            
            elif any(word in query_lower for word in ["report", "poročilo", "analiza"]):
                return await self._handle_report_query(query, tenant_id, context)
            
            else:
                # Splošni finančni pregled
                return await self._get_financial_overview(tenant_id)
                
        except Exception as e:
            logger.error(f"Napaka v Finance modulu: {str(e)}")
            return {
                "error": f"Napaka pri obdelavi finančne poizvedbe: {str(e)}",
                "module": "finance"
            }
    
    async def _handle_invoice_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava poizvedb o računih"""
        
        invoices = self.demo_data["invoices"]
        
        if "pending" in query.lower() or "čakajoč" in query.lower():
            pending_invoices = [inv for inv in invoices if inv["status"] == "pending"]
            total_pending = sum(inv["amount"] for inv in pending_invoices)
            
            return {
                "type": "pending_invoices",
                "invoices": pending_invoices,
                "total_amount": total_pending,
                "count": len(pending_invoices),
                "message": f"Imate {len(pending_invoices)} čakajočih računov v vrednosti {total_pending:.2f} EUR"
            }
        
        elif "overdue" in query.lower() or "zapadl" in query.lower():
            overdue_invoices = [inv for inv in invoices if inv["status"] == "overdue"]
            total_overdue = sum(inv["amount"] for inv in overdue_invoices)
            
            return {
                "type": "overdue_invoices", 
                "invoices": overdue_invoices,
                "total_amount": total_overdue,
                "count": len(overdue_invoices),
                "message": f"Imate {len(overdue_invoices)} zapadlih računov v vrednosti {total_overdue:.2f} EUR"
            }
        
        else:
            # Vsi računi
            total_amount = sum(inv["amount"] for inv in invoices)
            
            return {
                "type": "all_invoices",
                "invoices": invoices,
                "total_amount": total_amount,
                "count": len(invoices),
                "summary": {
                    "pending": len([inv for inv in invoices if inv["status"] == "pending"]),
                    "paid": len([inv for inv in invoices if inv["status"] == "paid"]),
                    "overdue": len([inv for inv in invoices if inv["status"] == "overdue"])
                }
            }
    
    async def _handle_payment_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava poizvedb o plačilih"""
        
        invoices = self.demo_data["invoices"]
        
        # Izračunaj dolgove
        pending_amount = sum(inv["amount"] for inv in invoices if inv["status"] == "pending")
        overdue_amount = sum(inv["amount"] for inv in invoices if inv["status"] == "overdue")
        total_due = pending_amount + overdue_amount
        
        return {
            "type": "payment_status",
            "total_due": total_due,
            "pending_amount": pending_amount,
            "overdue_amount": overdue_amount,
            "message": f"Skupni dolgovi: {total_due:.2f} EUR (Čakajoči: {pending_amount:.2f} EUR, Zapadli: {overdue_amount:.2f} EUR)",
            "recommendations": [
                "Pošljite opomnik za zapadle račune",
                "Nastavite avtomatske opomnike",
                "Razmislite o popustih za zgodnja plačila"
            ]
        }
    
    async def _handle_budget_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava poizvedb o proračunu"""
        
        budget = self.demo_data["budget"]
        
        # Izračunaj odstotek porabe
        usage_percentage = (budget["spent_this_month"] / budget["monthly_budget"]) * 100
        
        # Najdi kategorije, ki presegajo proračun
        over_budget = []
        for category, data in budget["categories"].items():
            if data["spent"] > data["budget"]:
                over_budget.append({
                    "category": category,
                    "budget": data["budget"],
                    "spent": data["spent"],
                    "overage": data["spent"] - data["budget"]
                })
        
        return {
            "type": "budget_analysis",
            "budget": budget,
            "usage_percentage": round(usage_percentage, 1),
            "over_budget_categories": over_budget,
            "message": f"Porabili ste {usage_percentage:.1f}% mesečnega proračuna ({budget['spent_this_month']:.2f} EUR od {budget['monthly_budget']:.2f} EUR)",
            "recommendations": [
                "Zmanjšajte stroške v kategorijah, ki presegajo proračun" if over_budget else "Proračun je pod nadzorom",
                "Razmislite o prerazporeditvi sredstev med kategorijami",
                "Nastavite opozorila pri 80% porabi proračuna"
            ]
        }
    
    async def _handle_expense_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava poizvedb o izdatkih"""
        
        expenses = self.demo_data["expenses"]
        total_expenses = sum(exp["amount"] for exp in expenses)
        
        # Grupiranje po kategorijah
        by_category = {}
        for expense in expenses:
            category = expense["category"]
            if category not in by_category:
                by_category[category] = {"total": 0, "count": 0, "expenses": []}
            
            by_category[category]["total"] += expense["amount"]
            by_category[category]["count"] += 1
            by_category[category]["expenses"].append(expense)
        
        return {
            "type": "expense_analysis",
            "expenses": expenses,
            "total_expenses": total_expenses,
            "by_category": by_category,
            "message": f"Skupni izdatki: {total_expenses:.2f} EUR v {len(expenses)} transakcijah"
        }
    
    async def _handle_report_query(self, query: str, tenant_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Obdelava poizvedb o poročilih"""
        
        # Generiraj finančno poročilo
        invoices = self.demo_data["invoices"]
        expenses = self.demo_data["expenses"]
        budget = self.demo_data["budget"]
        
        # Prihodki
        total_revenue = sum(inv["amount"] for inv in invoices if inv["status"] == "paid")
        pending_revenue = sum(inv["amount"] for inv in invoices if inv["status"] == "pending")
        
        # Izdatki
        total_expenses = sum(exp["amount"] for exp in expenses)
        
        # Dobiček
        profit = total_revenue - total_expenses
        
        return {
            "type": "financial_report",
            "period": "Januar 2024",
            "revenue": {
                "total": total_revenue,
                "pending": pending_revenue,
                "invoices_count": len([inv for inv in invoices if inv["status"] == "paid"])
            },
            "expenses": {
                "total": total_expenses,
                "transactions_count": len(expenses)
            },
            "profit": profit,
            "budget_usage": {
                "percentage": (budget["spent_this_month"] / budget["monthly_budget"]) * 100,
                "remaining": budget["remaining"]
            },
            "kpis": {
                "profit_margin": (profit / total_revenue * 100) if total_revenue > 0 else 0,
                "expense_ratio": (total_expenses / budget["monthly_budget"] * 100),
                "collection_rate": (total_revenue / (total_revenue + pending_revenue) * 100) if (total_revenue + pending_revenue) > 0 else 0
            }
        }
    
    async def _get_financial_overview(self, tenant_id: str) -> Dict[str, Any]:
        """Splošni finančni pregled"""
        
        invoices = self.demo_data["invoices"]
        expenses = self.demo_data["expenses"]
        budget = self.demo_data["budget"]
        
        return {
            "type": "financial_overview",
            "summary": {
                "total_invoices": len(invoices),
                "pending_invoices": len([inv for inv in invoices if inv["status"] == "pending"]),
                "overdue_invoices": len([inv for inv in invoices if inv["status"] == "overdue"]),
                "total_revenue": sum(inv["amount"] for inv in invoices if inv["status"] == "paid"),
                "total_expenses": sum(exp["amount"] for exp in expenses),
                "budget_usage": f"{(budget['spent_this_month'] / budget['monthly_budget'] * 100):.1f}%"
            },
            "quick_actions": [
                "Pošlji opomnike za zapadle račune",
                "Ustvari novo fakturo",
                "Dodaj nov izdatek",
                "Generiraj mesečno poročilo"
            ]
        }
    
    async def create_invoice(self, customer: str, amount: float, due_date: str, tenant_id: str = "default") -> Dict[str, Any]:
        """Ustvari nov račun"""
        try:
            invoice_id = f"INV-{datetime.now().strftime('%Y-%m')}-{len(self.demo_data['invoices']) + 1:03d}"
            
            new_invoice = {
                "id": invoice_id,
                "customer": customer,
                "amount": amount,
                "currency": "EUR",
                "due_date": due_date,
                "status": "pending",
                "created_date": datetime.now().strftime('%Y-%m-%d')
            }
            
            self.demo_data["invoices"].append(new_invoice)
            
            # Shrani v bazo
            await self.db_manager.save_module_data(tenant_id, "finance", "invoice", new_invoice)
            
            return {
                "success": True,
                "invoice": new_invoice,
                "message": f"Račun {invoice_id} uspešno ustvarjen"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Podatki za dashboard"""
        
        invoices = self.demo_data["invoices"]
        expenses = self.demo_data["expenses"]
        budget = self.demo_data["budget"]
        
        return {
            "total_revenue": sum(inv["amount"] for inv in invoices if inv["status"] == "paid"),
            "pending_revenue": sum(inv["amount"] for inv in invoices if inv["status"] == "pending"),
            "total_expenses": sum(exp["amount"] for exp in expenses),
            "budget_usage": (budget["spent_this_month"] / budget["monthly_budget"]) * 100,
            "overdue_count": len([inv for inv in invoices if inv["status"] == "overdue"]),
            "charts": {
                "revenue_trend": [
                    {"month": "Dec", "value": 8500},
                    {"month": "Jan", "value": sum(inv["amount"] for inv in invoices if inv["status"] == "paid")}
                ],
                "expense_categories": [
                    {"category": cat, "amount": data["spent"]} 
                    for cat, data in budget["categories"].items()
                ]
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Zdravstveno preverjanje Finance modula"""
        
        try:
            # Preveri demo podatke
            invoices_count = len(self.demo_data["invoices"])
            
            # Preveri ERP povezavo (simulacija)
            erp_status = "connected" if self.module_config.settings.get("api_endpoints") else "disconnected"
            
            return {
                "status": "healthy",
                "invoices_count": invoices_count,
                "erp_connection": erp_status,
                "last_check": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }