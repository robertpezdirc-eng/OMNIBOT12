#!/usr/bin/env python3
"""
OmniCore Analytics Module
Napredna analitika in obdelava podatkov
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import sqlite3
import plotly.graph_objects as go
import plotly.express as px
from plotly.utils import PlotlyJSONEncoder
import io
import base64

# Konfiguracija logging-a
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omni_analytics")

@dataclass
class AnalyticsReport:
    id: str
    title: str
    description: str
    data_source: str
    created_date: datetime
    report_type: str
    results: Dict[str, Any]

@dataclass
class DataSource:
    id: str
    name: str
    source_type: str  # csv, database, api
    connection_string: str
    last_updated: datetime
    status: str

class AnalyticsModule:
    """Analytics modul za OmniCore sistem"""
    
    def __init__(self):
        self.name = "analytics"
        self.module_type = "analytics"
        self.is_active = True
        self.last_health_check = datetime.now()
        
        # Lokalna SQLite baza za analytics
        self.db_path = "omni_analytics.db"
        
        # Inicializiraj bazo
        self._init_database()
        
        # Generiraj demo podatke
        self._generate_demo_data()
        
        # Registrirani data sources
        self.data_sources = {}
        
        logger.info("📊 Analytics Module inicializiran")
    
    def _init_database(self):
        """Inicializiraj analytics bazo podatkov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            # Tabela za sales podatke
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sales_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_name TEXT NOT NULL,
                    category TEXT,
                    sales_amount REAL NOT NULL,
                    quantity INTEGER NOT NULL,
                    sale_date DATE NOT NULL,
                    customer_segment TEXT,
                    region TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Tabela za website analytics
            cur.execute("""
                CREATE TABLE IF NOT EXISTS website_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    page_url TEXT NOT NULL,
                    page_views INTEGER DEFAULT 0,
                    unique_visitors INTEGER DEFAULT 0,
                    bounce_rate REAL DEFAULT 0,
                    avg_session_duration REAL DEFAULT 0,
                    date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Tabela za customer data
            cur.execute("""
                CREATE TABLE IF NOT EXISTS customer_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id TEXT UNIQUE NOT NULL,
                    customer_name TEXT,
                    segment TEXT,
                    total_purchases REAL DEFAULT 0,
                    last_purchase_date DATE,
                    acquisition_channel TEXT,
                    lifetime_value REAL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Tabela za KPI metrics
            cur.execute("""
                CREATE TABLE IF NOT EXISTS kpi_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    metric_unit TEXT,
                    category TEXT,
                    date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            conn.close()
            
            logger.info("✅ Analytics baza inicializirana")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji analytics baze: {str(e)}")
    
    def _generate_demo_data(self):
        """Generiraj demo analytics podatke"""
        try:
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            # Preveri če že imamo podatke
            cur.execute("SELECT COUNT(*) FROM sales_data")
            sales_count = cur.fetchone()[0]
            
            if sales_count == 0:
                # Generiraj demo sales podatke
                np.random.seed(42)
                
                products = ["Laptop Pro", "Smartphone X", "Tablet Plus", "Headphones", "Smart Watch"]
                categories = ["Electronics", "Electronics", "Electronics", "Audio", "Wearables"]
                segments = ["Enterprise", "Consumer", "SMB"]
                regions = ["EU", "US", "APAC"]
                
                sales_data = []
                for i in range(100):
                    product_idx = np.random.randint(0, len(products))
                    sales_data.append((
                        products[product_idx],
                        categories[product_idx],
                        np.random.uniform(100, 5000),
                        np.random.randint(1, 20),
                        (datetime.now() - timedelta(days=np.random.randint(0, 90))).date(),
                        np.random.choice(segments),
                        np.random.choice(regions)
                    ))
                
                cur.executemany("""
                    INSERT INTO sales_data (product_name, category, sales_amount, quantity, sale_date, customer_segment, region)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, sales_data)
                
                # Generiraj demo website analytics
                pages = ["/", "/products", "/about", "/contact", "/blog", "/pricing"]
                website_data = []
                
                for i in range(30):  # 30 dni podatkov
                    date = (datetime.now() - timedelta(days=i)).date()
                    for page in pages:
                        website_data.append((
                            page,
                            np.random.randint(50, 1000),
                            np.random.randint(30, 800),
                            np.random.uniform(0.2, 0.8),
                            np.random.uniform(60, 300),
                            date
                        ))
                
                cur.executemany("""
                    INSERT INTO website_analytics (page_url, page_views, unique_visitors, bounce_rate, avg_session_duration, date)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, website_data)
                
                # Generiraj demo customer data
                customer_data = []
                for i in range(50):
                    customer_data.append((
                        f"CUST-{i+1:03d}",
                        f"Customer {i+1}",
                        np.random.choice(segments),
                        np.random.uniform(500, 10000),
                        (datetime.now() - timedelta(days=np.random.randint(0, 365))).date(),
                        np.random.choice(["Organic", "Paid Ads", "Social Media", "Referral"]),
                        np.random.uniform(1000, 25000)
                    ))
                
                cur.executemany("""
                    INSERT INTO customer_data (customer_id, customer_name, segment, total_purchases, last_purchase_date, acquisition_channel, lifetime_value)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, customer_data)
                
                # Generiraj demo KPI metrics
                kpi_data = []
                for i in range(30):
                    date = (datetime.now() - timedelta(days=i)).date()
                    kpi_data.extend([
                        ("Revenue", np.random.uniform(10000, 50000), "EUR", "Financial", date),
                        ("New Customers", np.random.randint(5, 50), "count", "Growth", date),
                        ("Conversion Rate", np.random.uniform(2, 8), "%", "Marketing", date),
                        ("Customer Satisfaction", np.random.uniform(4.0, 5.0), "rating", "Quality", date)
                    ])
                
                cur.executemany("""
                    INSERT INTO kpi_metrics (metric_name, metric_value, metric_unit, category, date)
                    VALUES (?, ?, ?, ?, ?)
                """, kpi_data)
                
                conn.commit()
                logger.info("✅ Demo analytics podatki generirani")
            
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Napaka pri generiranju demo podatkov: {str(e)}")
    
    async def handle_request(self, request) -> Dict[str, Any]:
        """Obdelaj analytics zahtevo"""
        query = request.query.lower()
        
        try:
            # Analiza zahteve
            if any(word in query for word in ['prodaja', 'sales', 'revenue']):
                return await self.get_sales_analytics()
            
            elif any(word in query for word in ['spletna stran', 'website', 'traffic']):
                return await self.get_website_analytics()
            
            elif any(word in query for word in ['stranke', 'customers', 'clients']):
                return await self.get_customer_analytics()
            
            elif any(word in query for word in ['kpi', 'metrics', 'performance']):
                return await self.get_kpi_dashboard()
            
            elif any(word in query for word in ['trend', 'forecast', 'prediction']):
                return await self.get_trend_analysis()
            
            elif any(word in query for word in ['poročilo', 'report', 'summary']):
                return await self.generate_comprehensive_report()
            
            else:
                # Splošni analytics dashboard
                return await self.get_analytics_dashboard()
        
        except Exception as e:
            logger.error(f"❌ Napaka pri obdelavi analytics zahteve: {str(e)}")
            return {
                "error": f"Napaka pri analytics zahtevi: {str(e)}",
                "status": "error"
            }
    
    async def get_sales_analytics(self) -> Dict[str, Any]:
        """Analiza prodajnih podatkov"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Osnovne sales statistike
            sales_df = pd.read_sql_query("""
                SELECT * FROM sales_data 
                WHERE sale_date >= date('now', '-30 days')
            """, conn)
            
            if sales_df.empty:
                return {"error": "Ni prodajnih podatkov", "status": "error"}
            
            # Analiza po produktih
            product_analysis = sales_df.groupby('product_name').agg({
                'sales_amount': ['sum', 'mean', 'count'],
                'quantity': 'sum'
            }).round(2)
            
            # Analiza po regijah
            region_analysis = sales_df.groupby('region').agg({
                'sales_amount': 'sum',
                'quantity': 'sum'
            }).round(2)
            
            # Trend analiza
            sales_df['sale_date'] = pd.to_datetime(sales_df['sale_date'])
            daily_sales = sales_df.groupby('sale_date')['sales_amount'].sum().reset_index()
            
            # Top produkti
            top_products = sales_df.groupby('product_name')['sales_amount'].sum().sort_values(ascending=False).head(5)
            
            conn.close()
            
            return {
                "sales_analytics": {
                    "total_revenue": float(sales_df['sales_amount'].sum()),
                    "total_quantity": int(sales_df['quantity'].sum()),
                    "average_order_value": float(sales_df['sales_amount'].mean()),
                    "total_orders": len(sales_df),
                    "period": "Zadnjih 30 dni"
                },
                "product_performance": product_analysis.to_dict(),
                "regional_performance": region_analysis.to_dict(),
                "top_products": top_products.to_dict(),
                "daily_trend": daily_sales.to_dict('records'),
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri sales analytics: {str(e)}")
            return {"error": str(e), "status": "error"}
    
    async def get_website_analytics(self) -> Dict[str, Any]:
        """Analiza spletne strani"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Website podatki zadnjih 30 dni
            website_df = pd.read_sql_query("""
                SELECT * FROM website_analytics 
                WHERE date >= date('now', '-30 days')
            """, conn)
            
            if website_df.empty:
                return {"error": "Ni website podatkov", "status": "error"}
            
            # Analiza po straneh
            page_analysis = website_df.groupby('page_url').agg({
                'page_views': 'sum',
                'unique_visitors': 'sum',
                'bounce_rate': 'mean',
                'avg_session_duration': 'mean'
            }).round(2)
            
            # Dnevni trend
            daily_traffic = website_df.groupby('date').agg({
                'page_views': 'sum',
                'unique_visitors': 'sum'
            }).reset_index()
            
            # Top strani
            top_pages = website_df.groupby('page_url')['page_views'].sum().sort_values(ascending=False).head(5)
            
            conn.close()
            
            return {
                "website_analytics": {
                    "total_page_views": int(website_df['page_views'].sum()),
                    "total_unique_visitors": int(website_df['unique_visitors'].sum()),
                    "average_bounce_rate": float(website_df['bounce_rate'].mean()),
                    "average_session_duration": float(website_df['avg_session_duration'].mean()),
                    "period": "Zadnjih 30 dni"
                },
                "page_performance": page_analysis.to_dict(),
                "daily_traffic": daily_traffic.to_dict('records'),
                "top_pages": top_pages.to_dict(),
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri website analytics: {str(e)}")
            return {"error": str(e), "status": "error"}
    
    async def get_customer_analytics(self) -> Dict[str, Any]:
        """Analiza strank"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Customer podatki
            customer_df = pd.read_sql_query("SELECT * FROM customer_data", conn)
            
            if customer_df.empty:
                return {"error": "Ni customer podatkov", "status": "error"}
            
            # Analiza po segmentih
            segment_analysis = customer_df.groupby('segment').agg({
                'total_purchases': ['sum', 'mean', 'count'],
                'lifetime_value': ['sum', 'mean']
            }).round(2)
            
            # Analiza po acquisition channels
            channel_analysis = customer_df.groupby('acquisition_channel').agg({
                'customer_id': 'count',
                'lifetime_value': 'mean'
            }).round(2)
            
            # Top stranke
            top_customers = customer_df.nlargest(10, 'lifetime_value')[['customer_name', 'lifetime_value', 'segment']]
            
            conn.close()
            
            return {
                "customer_analytics": {
                    "total_customers": len(customer_df),
                    "average_lifetime_value": float(customer_df['lifetime_value'].mean()),
                    "total_customer_value": float(customer_df['lifetime_value'].sum()),
                    "average_purchases": float(customer_df['total_purchases'].mean())
                },
                "segment_analysis": segment_analysis.to_dict(),
                "channel_analysis": channel_analysis.to_dict(),
                "top_customers": top_customers.to_dict('records'),
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri customer analytics: {str(e)}")
            return {"error": str(e), "status": "error"}
    
    async def get_kpi_dashboard(self) -> Dict[str, Any]:
        """KPI dashboard"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # KPI podatki zadnjih 30 dni
            kpi_df = pd.read_sql_query("""
                SELECT * FROM kpi_metrics 
                WHERE date >= date('now', '-30 days')
            """, conn)
            
            if kpi_df.empty:
                return {"error": "Ni KPI podatkov", "status": "error"}
            
            # Trenutne vrednosti KPI
            current_kpis = kpi_df.groupby('metric_name').agg({
                'metric_value': ['last', 'mean', 'std'],
                'metric_unit': 'last'
            }).round(2)
            
            # Trend analiza
            kpi_trends = {}
            for metric in kpi_df['metric_name'].unique():
                metric_data = kpi_df[kpi_df['metric_name'] == metric].sort_values('date')
                if len(metric_data) > 1:
                    trend = "naraščajoč" if metric_data['metric_value'].iloc[-1] > metric_data['metric_value'].iloc[0] else "padajoč"
                    kpi_trends[metric] = {
                        "trend": trend,
                        "change_percent": ((metric_data['metric_value'].iloc[-1] - metric_data['metric_value'].iloc[0]) / metric_data['metric_value'].iloc[0] * 100)
                    }
            
            conn.close()
            
            return {
                "kpi_dashboard": {
                    "current_kpis": current_kpis.to_dict(),
                    "trends": kpi_trends,
                    "period": "Zadnjih 30 dni"
                },
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri KPI dashboard: {str(e)}")
            return {"error": str(e), "status": "error"}
    
    async def get_trend_analysis(self) -> Dict[str, Any]:
        """Trend analiza"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Sales trend
            sales_trend = pd.read_sql_query("""
                SELECT sale_date, SUM(sales_amount) as daily_revenue
                FROM sales_data 
                WHERE sale_date >= date('now', '-30 days')
                GROUP BY sale_date
                ORDER BY sale_date
            """, conn)
            
            # Website trend
            website_trend = pd.read_sql_query("""
                SELECT date, SUM(page_views) as daily_views
                FROM website_analytics 
                WHERE date >= date('now', '-30 days')
                GROUP BY date
                ORDER BY date
            """, conn)
            
            conn.close()
            
            # Preprosta linearna regresija za napoved
            trends = {}
            
            if not sales_trend.empty:
                sales_trend['days'] = range(len(sales_trend))
                sales_coef = np.polyfit(sales_trend['days'], sales_trend['daily_revenue'], 1)
                trends['sales'] = {
                    "direction": "naraščajoč" if sales_coef[0] > 0 else "padajoč",
                    "slope": float(sales_coef[0]),
                    "data": sales_trend.to_dict('records')
                }
            
            if not website_trend.empty:
                website_trend['days'] = range(len(website_trend))
                website_coef = np.polyfit(website_trend['days'], website_trend['daily_views'], 1)
                trends['website'] = {
                    "direction": "naraščajoč" if website_coef[0] > 0 else "padajoč",
                    "slope": float(website_coef[0]),
                    "data": website_trend.to_dict('records')
                }
            
            return {
                "trend_analysis": trends,
                "period": "Zadnjih 30 dni",
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri trend analizi: {str(e)}")
            return {"error": str(e), "status": "error"}
    
    async def generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generiraj obsežno poročilo"""
        try:
            sales_data = await self.get_sales_analytics()
            website_data = await self.get_website_analytics()
            customer_data = await self.get_customer_analytics()
            kpi_data = await self.get_kpi_dashboard()
            trend_data = await self.get_trend_analysis()
            
            # Generiraj insights
            insights = []
            
            # Sales insights
            if sales_data.get('status') == 'success':
                total_revenue = sales_data['sales_analytics']['total_revenue']
                if total_revenue > 100000:
                    insights.append("Odličen mesečni prihodek - presežena je meja 100.000 EUR")
                elif total_revenue < 50000:
                    insights.append("Prihodek pod pričakovanji - potrebne so dodatne prodajne aktivnosti")
            
            # Website insights
            if website_data.get('status') == 'success':
                bounce_rate = website_data['website_analytics']['average_bounce_rate']
                if bounce_rate > 0.6:
                    insights.append("Visoka bounce rate - potrebna optimizacija spletne strani")
            
            # Customer insights
            if customer_data.get('status') == 'success':
                avg_ltv = customer_data['customer_analytics']['average_lifetime_value']
                if avg_ltv > 10000:
                    insights.append("Visoka vrednost strank - odličen customer retention")
            
            return {
                "comprehensive_report": {
                    "sales": sales_data,
                    "website": website_data,
                    "customers": customer_data,
                    "kpis": kpi_data,
                    "trends": trend_data,
                    "insights": insights,
                    "generated_at": datetime.now().isoformat()
                },
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri generiranju poročila: {str(e)}")
            return {"error": str(e), "status": "error"}
    
    async def get_analytics_dashboard(self) -> Dict[str, Any]:
        """Glavni analytics dashboard"""
        try:
            # Pridobi vse ključne podatke
            sales = await self.get_sales_analytics()
            website = await self.get_website_analytics()
            customers = await self.get_customer_analytics()
            kpis = await self.get_kpi_dashboard()
            
            # Ustvari dashboard povzetek
            dashboard_summary = {
                "total_revenue": sales.get('sales_analytics', {}).get('total_revenue', 0),
                "total_orders": sales.get('sales_analytics', {}).get('total_orders', 0),
                "website_visitors": website.get('website_analytics', {}).get('total_unique_visitors', 0),
                "total_customers": customers.get('customer_analytics', {}).get('total_customers', 0)
            }
            
            return {
                "analytics_dashboard": {
                    "summary": dashboard_summary,
                    "sales_overview": sales.get('sales_analytics', {}),
                    "website_overview": website.get('website_analytics', {}),
                    "customer_overview": customers.get('customer_analytics', {}),
                    "key_metrics": kpis.get('kpi_dashboard', {}).get('current_kpis', {})
                },
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri analytics dashboard: {str(e)}")
            return {"error": str(e), "status": "error"}
    
    async def process_csv_data(self, csv_content: str, data_type: str = "sales") -> Dict[str, Any]:
        """Obdelaj CSV podatke"""
        try:
            # Preberi CSV
            df = pd.read_csv(io.StringIO(csv_content))
            
            # Osnovne statistike
            stats = {
                "rows": len(df),
                "columns": len(df.columns),
                "column_names": df.columns.tolist(),
                "data_types": df.dtypes.to_dict(),
                "missing_values": df.isnull().sum().to_dict(),
                "summary_stats": df.describe().to_dict()
            }
            
            return {
                "csv_analysis": stats,
                "sample_data": df.head(10).to_dict('records'),
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"❌ Napaka pri obdelavi CSV: {str(e)}")
            return {"error": str(e), "status": "error"}
    
    async def health_check(self) -> bool:
        """Preveri zdravje Analytics modula"""
        try:
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
            conn.close()
            
            self.last_health_check = datetime.now()
            self.is_active = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Analytics health check failed: {str(e)}")
            self.is_active = False
            return False

# FastAPI aplikacija
app = FastAPI(
    title="OmniCore Analytics Module",
    description="Napredna analitika in obdelava podatkov",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globalni Analytics modul
analytics_module = AnalyticsModule()

@app.get("/")
async def root():
    return {
        "service": "OmniCore Analytics Module",
        "status": "active",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    is_healthy = await analytics_module.health_check()
    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/dashboard")
async def get_dashboard():
    """Analytics dashboard"""
    return await analytics_module.get_analytics_dashboard()

@app.get("/sales")
async def get_sales():
    """Sales analytics"""
    return await analytics_module.get_sales_analytics()

@app.get("/website")
async def get_website():
    """Website analytics"""
    return await analytics_module.get_website_analytics()

@app.get("/customers")
async def get_customers():
    """Customer analytics"""
    return await analytics_module.get_customer_analytics()

@app.get("/kpi")
async def get_kpi():
    """KPI dashboard"""
    return await analytics_module.get_kpi_dashboard()

@app.get("/trends")
async def get_trends():
    """Trend analysis"""
    return await analytics_module.get_trend_analysis()

@app.get("/report")
async def get_report():
    """Comprehensive report"""
    return await analytics_module.generate_comprehensive_report()

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), data_type: str = Query("sales")):
    """Upload in analiziraj CSV datoteko"""
    try:
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        result = await analytics_module.process_csv_data(csv_content, data_type)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Napaka pri obdelavi CSV: {str(e)}")

if __name__ == "__main__":
    print("📊 Zaganjam OmniCore Analytics Module...")
    print("📈 Real-time data analytics: Active")
    print("🔍 Advanced insights: Enabled")
    print("📊 Analytics dashboard: http://localhost:8302")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8302,
        reload=True
    )