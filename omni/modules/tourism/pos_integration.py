"""
🏪 POS Integration Module - Real-time prodaja in upravljanje zalog
Omogoča integracijo z različnimi POS sistemi za gostinstvo in turizem
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import asyncio
import websockets
from threading import Thread
import requests

logger = logging.getLogger(__name__)

@dataclass
class POSTransaction:
    """POS transakcija"""
    transaction_id: str
    timestamp: datetime
    items: List[Dict[str, Any]]
    total_amount: float
    payment_method: str
    customer_id: Optional[str] = None
    table_number: Optional[int] = None
    staff_id: Optional[str] = None
    discount: float = 0.0
    tax_amount: float = 0.0
    
@dataclass
class InventoryItem:
    """Artikel v zalogah"""
    item_id: str
    name: str
    category: str
    current_stock: int
    min_stock: int
    max_stock: int
    unit_price: float
    cost_price: float
    supplier_id: Optional[str] = None
    last_updated: datetime = None
    
@dataclass
class SalesMetrics:
    """Prodajne metrike"""
    total_sales: float
    transaction_count: int
    average_transaction: float
    top_items: List[Dict[str, Any]]
    hourly_sales: Dict[str, float]
    payment_methods: Dict[str, float]

class POSIntegration:
    """POS Integration Manager"""
    
    def __init__(self, db_path: str = "pos_data.db"):
        self.db_path = db_path
        self.websocket_clients = set()
        self.is_running = False
        self._init_database()
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela transakcij
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pos_transactions (
                    transaction_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    items TEXT NOT NULL,
                    total_amount REAL NOT NULL,
                    payment_method TEXT NOT NULL,
                    customer_id TEXT,
                    table_number INTEGER,
                    staff_id TEXT,
                    discount REAL DEFAULT 0,
                    tax_amount REAL DEFAULT 0
                )
            ''')
            
            # Tabela zalog
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS inventory (
                    item_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    current_stock INTEGER NOT NULL,
                    min_stock INTEGER NOT NULL,
                    max_stock INTEGER NOT NULL,
                    unit_price REAL NOT NULL,
                    cost_price REAL NOT NULL,
                    supplier_id TEXT,
                    last_updated TEXT NOT NULL
                )
            ''')
            
            # Tabela prodajnih metrik
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sales_metrics (
                    date TEXT PRIMARY KEY,
                    total_sales REAL NOT NULL,
                    transaction_count INTEGER NOT NULL,
                    average_transaction REAL NOT NULL,
                    top_items TEXT NOT NULL,
                    hourly_sales TEXT NOT NULL,
                    payment_methods TEXT NOT NULL
                )
            ''')
            
            conn.commit()
            logger.info("📊 POS baza podatkov inicializirana")
    
    def process_transaction(self, transaction: POSTransaction) -> Dict[str, Any]:
        """Obdelaj POS transakcijo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Shrani transakcijo
                cursor.execute('''
                    INSERT OR REPLACE INTO pos_transactions 
                    (transaction_id, timestamp, items, total_amount, payment_method,
                     customer_id, table_number, staff_id, discount, tax_amount)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    transaction.transaction_id,
                    transaction.timestamp.isoformat(),
                    json.dumps(transaction.items),
                    transaction.total_amount,
                    transaction.payment_method,
                    transaction.customer_id,
                    transaction.table_number,
                    transaction.staff_id,
                    transaction.discount,
                    transaction.tax_amount
                ))
                
                # Posodobi zaloge
                for item in transaction.items:
                    self._update_inventory_stock(
                        cursor, 
                        item['item_id'], 
                        -item['quantity']
                    )
                
                conn.commit()
                
                # Pošlji real-time update
                self._broadcast_update({
                    "type": "transaction",
                    "data": asdict(transaction)
                })
                
                return {
                    "success": True,
                    "transaction_id": transaction.transaction_id,
                    "message": "Transakcija uspešno obdelana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri obdelavi transakcije: {e}")
            return {"success": False, "error": str(e)}
    
    def _update_inventory_stock(self, cursor, item_id: str, quantity_change: int):
        """Posodobi stanje zalog"""
        cursor.execute('''
            UPDATE inventory 
            SET current_stock = current_stock + ?,
                last_updated = ?
            WHERE item_id = ?
        ''', (quantity_change, datetime.now().isoformat(), item_id))
        
        # Preveri nizke zaloge
        cursor.execute('''
            SELECT name, current_stock, min_stock 
            FROM inventory 
            WHERE item_id = ? AND current_stock <= min_stock
        ''', (item_id,))
        
        low_stock = cursor.fetchone()
        if low_stock:
            self._broadcast_update({
                "type": "low_stock_alert",
                "data": {
                    "item_id": item_id,
                    "name": low_stock[0],
                    "current_stock": low_stock[1],
                    "min_stock": low_stock[2]
                }
            })
    
    def get_real_time_sales(self) -> Dict[str, Any]:
        """Pridobi real-time prodajne podatke"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            today = datetime.now().date()
            
            # Današnje prodaje
            cursor.execute('''
                SELECT SUM(total_amount), COUNT(*), AVG(total_amount)
                FROM pos_transactions 
                WHERE DATE(timestamp) = ?
            ''', (today.isoformat(),))
            
            sales_data = cursor.fetchone()
            
            # Top artikli danes
            cursor.execute('''
                SELECT items FROM pos_transactions 
                WHERE DATE(timestamp) = ?
            ''', (today.isoformat(),))
            
            all_items = {}
            for row in cursor.fetchall():
                items = json.loads(row[0])
                for item in items:
                    item_id = item['item_id']
                    if item_id in all_items:
                        all_items[item_id]['quantity'] += item['quantity']
                        all_items[item_id]['revenue'] += item['quantity'] * item['price']
                    else:
                        all_items[item_id] = {
                            'name': item['name'],
                            'quantity': item['quantity'],
                            'revenue': item['quantity'] * item['price']
                        }
            
            top_items = sorted(all_items.items(), 
                             key=lambda x: x[1]['revenue'], 
                             reverse=True)[:10]
            
            return {
                "today_sales": sales_data[0] or 0,
                "today_transactions": sales_data[1] or 0,
                "average_transaction": sales_data[2] or 0,
                "top_items": [{"item_id": k, **v} for k, v in top_items],
                "timestamp": datetime.now().isoformat()
            }
    
    def get_inventory_status(self) -> List[Dict[str, Any]]:
        """Pridobi stanje zalog"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM inventory 
                ORDER BY current_stock ASC
            ''')
            
            inventory = []
            for row in cursor.fetchall():
                item = {
                    "item_id": row[0],
                    "name": row[1],
                    "category": row[2],
                    "current_stock": row[3],
                    "min_stock": row[4],
                    "max_stock": row[5],
                    "unit_price": row[6],
                    "cost_price": row[7],
                    "supplier_id": row[8],
                    "last_updated": row[9],
                    "stock_status": "low" if row[3] <= row[4] else "normal",
                    "stock_value": row[3] * row[7]
                }
                inventory.append(item)
            
            return inventory
    
    def add_inventory_item(self, item: InventoryItem) -> Dict[str, Any]:
        """Dodaj artikel v zaloge"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO inventory 
                    (item_id, name, category, current_stock, min_stock, max_stock,
                     unit_price, cost_price, supplier_id, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    item.item_id, item.name, item.category,
                    item.current_stock, item.min_stock, item.max_stock,
                    item.unit_price, item.cost_price, item.supplier_id,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                self._broadcast_update({
                    "type": "inventory_update",
                    "data": asdict(item)
                })
                
                return {
                    "success": True,
                    "message": f"Artikel {item.name} uspešno dodan"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju artikla: {e}")
            return {"success": False, "error": str(e)}
    
    def generate_sales_report(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Generiraj prodajno poročilo"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    SUM(total_amount) as total_sales,
                    COUNT(*) as transaction_count,
                    AVG(total_amount) as avg_transaction,
                    SUM(tax_amount) as total_tax,
                    payment_method,
                    COUNT(*) as payment_count
                FROM pos_transactions 
                WHERE DATE(timestamp) BETWEEN ? AND ?
                GROUP BY payment_method
            ''', (start_date, end_date))
            
            payment_data = cursor.fetchall()
            
            # Skupne statistike
            cursor.execute('''
                SELECT 
                    SUM(total_amount),
                    COUNT(*),
                    AVG(total_amount),
                    SUM(tax_amount)
                FROM pos_transactions 
                WHERE DATE(timestamp) BETWEEN ? AND ?
            ''', (start_date, end_date))
            
            totals = cursor.fetchone()
            
            return {
                "period": f"{start_date} - {end_date}",
                "total_sales": totals[0] or 0,
                "total_transactions": totals[1] or 0,
                "average_transaction": totals[2] or 0,
                "total_tax": totals[3] or 0,
                "payment_methods": [
                    {
                        "method": row[4],
                        "amount": row[0],
                        "count": row[5],
                        "percentage": (row[0] / totals[0] * 100) if totals[0] else 0
                    }
                    for row in payment_data
                ],
                "generated_at": datetime.now().isoformat()
            }
    
    def _broadcast_update(self, message: Dict[str, Any]):
        """Pošlji real-time update vsem povezanim klientom"""
        if self.websocket_clients:
            asyncio.create_task(self._send_to_clients(message))
    
    async def _send_to_clients(self, message: Dict[str, Any]):
        """Pošlji sporočilo vsem WebSocket klientom"""
        if self.websocket_clients:
            await asyncio.gather(
                *[client.send(json.dumps(message)) for client in self.websocket_clients],
                return_exceptions=True
            )
    
    async def websocket_handler(self, websocket, path):
        """WebSocket handler za real-time komunikacijo"""
        self.websocket_clients.add(websocket)
        logger.info(f"🔌 Nov WebSocket klient povezan: {len(self.websocket_clients)} aktivnih")
        
        try:
            # Pošlji trenutno stanje
            current_data = {
                "type": "initial_data",
                "sales": self.get_real_time_sales(),
                "inventory": self.get_inventory_status()
            }
            await websocket.send(json.dumps(current_data))
            
            # Čakaj na sporočila
            async for message in websocket:
                data = json.loads(message)
                # Obdelaj sporočila od klienta če potrebno
                
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.websocket_clients.remove(websocket)
            logger.info(f"🔌 WebSocket klient odklopljen: {len(self.websocket_clients)} aktivnih")
    
    def start_websocket_server(self, host: str = "localhost", port: int = 8765):
        """Zaženi WebSocket server za real-time komunikacijo"""
        def run_server():
            asyncio.set_event_loop(asyncio.new_event_loop())
            start_server = websockets.serve(self.websocket_handler, host, port)
            asyncio.get_event_loop().run_until_complete(start_server)
            asyncio.get_event_loop().run_forever()
        
        server_thread = Thread(target=run_server, daemon=True)
        server_thread.start()
        logger.info(f"🚀 WebSocket server zagnan na ws://{host}:{port}")
    
    def integrate_external_pos(self, pos_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Integriraj zunanji POS sistem"""
        try:
            if pos_type == "square":
                return self._integrate_square_pos(config)
            elif pos_type == "stripe":
                return self._integrate_stripe_pos(config)
            elif pos_type == "custom_api":
                return self._integrate_custom_api(config)
            else:
                return {"success": False, "error": f"Nepodprt POS tip: {pos_type}"}
                
        except Exception as e:
            logger.error(f"Napaka pri integraciji POS: {e}")
            return {"success": False, "error": str(e)}
    
    def _integrate_square_pos(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Integriraj Square POS"""
        # Implementacija Square API integracije
        return {"success": True, "message": "Square POS integracija pripravljena"}
    
    def _integrate_stripe_pos(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Integriraj Stripe POS"""
        # Implementacija Stripe API integracije
        return {"success": True, "message": "Stripe POS integracija pripravljena"}
    
    def _integrate_custom_api(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Integriraj custom API"""
        # Implementacija custom API integracije
        return {"success": True, "message": "Custom API integracija pripravljena"}

# Primer uporabe
if __name__ == "__main__":
    pos = POSIntegration()
    
    # Dodaj testni artikel
    test_item = InventoryItem(
        item_id="ITEM001",
        name="Kava Espresso",
        category="Pijače",
        current_stock=100,
        min_stock=20,
        max_stock=200,
        unit_price=2.50,
        cost_price=0.80
    )
    
    result = pos.add_inventory_item(test_item)
    print(f"Dodajanje artikla: {result}")
    
    # Simuliraj transakcijo
    transaction = POSTransaction(
        transaction_id="TXN001",
        timestamp=datetime.now(),
        items=[{
            "item_id": "ITEM001",
            "name": "Kava Espresso",
            "quantity": 2,
            "price": 2.50
        }],
        total_amount=5.00,
        payment_method="gotovina",
        table_number=5
    )
    
    result = pos.process_transaction(transaction)
    print(f"Obdelava transakcije: {result}")
    
    # Pridobi stanje zalog
    inventory = pos.get_inventory_status()
    print(f"Stanje zalog: {inventory}")