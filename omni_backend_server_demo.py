#!/usr/bin/env python3
"""
Omni-APP Demo Backend Server
Real-time WebSocket server za testiranje dashboard integracije
"""

import asyncio
import websockets
import json
import random
import time
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
import logging

# Konfiguracija
WEBSOCKET_PORT = 8080
HTTP_PORT = 8081
UPDATE_INTERVAL = 2  # sekunde

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OmniBackendServer:
    def __init__(self):
        self.connected_clients = set()
        self.modules_data = {
            "global": {
                "id": "global",
                "status": "✅ Online",
                "type": "global",
                "metadata": {
                    "uptime": "99.9%",
                    "load": 45,
                    "memory_usage": 67
                }
            },
            "Finance": {
                "id": "Finance", 
                "status": "✅ Online",
                "type": "main",
                "parent": None,
                "metadata": {
                    "transactions_per_minute": 1250,
                    "error_rate": 0.02,
                    "response_time": 120
                }
            },
            "Plačila": {
                "id": "Plačila",
                "status": "✅ Online", 
                "type": "sub",
                "parent": "Finance",
                "metadata": {
                    "processed_payments": 8945,
                    "failed_payments": 12,
                    "average_amount": 89.50
                }
            },
            "Analize": {
                "id": "Analize",
                "status": "🔄 Processing",
                "type": "sub", 
                "parent": "Finance",
                "metadata": {
                    "reports_generated": 156,
                    "data_points": 2500000,
                    "processing_queue": 23
                }
            },
            "Turizem": {
                "id": "Turizem",
                "status": "✅ Online",
                "type": "main",
                "parent": None,
                "metadata": {
                    "active_bookings": 1847,
                    "occupancy_rate": 78.5,
                    "revenue_today": 45670.80
                }
            },
            "Rezervacije": {
                "id": "Rezervacije",
                "status": "⚠️ Warning",
                "type": "sub",
                "parent": "Turizem", 
                "metadata": {
                    "pending_reservations": 89,
                    "confirmed_today": 234,
                    "cancellation_rate": 5.2
                }
            },
            "Marketing": {
                "id": "Marketing",
                "status": "✅ Online",
                "type": "main",
                "parent": None,
                "metadata": {
                    "campaigns_active": 12,
                    "click_through_rate": 3.4,
                    "conversion_rate": 2.1
                }
            }
        }
        
        self.performance_metrics = {
            "dataFlowRate": 0.0,
            "processingLoad": 0,
            "responseTime": 0,
            "totalRequests": 0,
            "errorRate": 0.0
        }
        
        self.system_alerts = []
        self.running = True

    async def register_client(self, websocket, path):
        """Registracija novega WebSocket klienta"""
        self.connected_clients.add(websocket)
        client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"
        logger.info(f"Nova WebSocket povezava: {client_ip} (skupaj: {len(self.connected_clients)})")
        
        # Pošlji začetno stanje
        await self.send_initial_status(websocket)
        
        try:
            async for message in websocket:
                await self.handle_client_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket povezava zaprta: {client_ip}")
        except Exception as e:
            logger.error(f"Napaka v WebSocket povezavi: {e}")
        finally:
            self.connected_clients.discard(websocket)
            logger.info(f"Klient odstranjen (preostalo: {len(self.connected_clients)})")

    async def send_initial_status(self, websocket):
        """Pošlje začetno stanje vsem modulom"""
        initial_data = {
            "type": "status_update",
            "timestamp": int(time.time() * 1000),
            "modules": list(self.modules_data.values())
        }
        
        await websocket.send(json.dumps(initial_data))
        logger.info("Poslano začetno stanje novemu klientu")

    async def handle_client_message(self, websocket, message):
        """Obravnava sporočila od klientov"""
        try:
            data = json.loads(message)
            message_type = data.get("type", "unknown")
            
            logger.info(f"Prejeto sporočilo: {message_type}")
            
            if message_type == "request_status":
                await self.send_initial_status(websocket)
            elif message_type == "request_metrics":
                await self.send_performance_metrics(websocket)
            elif message_type == "module_command":
                await self.handle_module_command(data)
            else:
                logger.warning(f"Neznano sporočilo: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Napaka pri dekodiranju JSON sporočila")
        except Exception as e:
            logger.error(f"Napaka pri obravnavi sporočila: {e}")

    async def handle_module_command(self, data):
        """Obravnava ukaze za module"""
        module_id = data.get("moduleId")
        command = data.get("command")
        
        if module_id in self.modules_data:
            if command == "restart":
                self.modules_data[module_id]["status"] = "🔄 Restarting"
                await self.broadcast_status_update()
                
                # Simulacija restart-a
                await asyncio.sleep(3)
                self.modules_data[module_id]["status"] = "✅ Online"
                await self.broadcast_status_update()
                
                logger.info(f"Modul {module_id} uspešno restartiran")

    async def broadcast_status_update(self):
        """Pošlje posodobitve statusov vsem povezanim klientom"""
        if not self.connected_clients:
            return
            
        update_data = {
            "type": "status_update",
            "timestamp": int(time.time() * 1000),
            "modules": list(self.modules_data.values())
        }
        
        message = json.dumps(update_data)
        disconnected_clients = set()
        
        for client in self.connected_clients:
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)
            except Exception as e:
                logger.error(f"Napaka pri pošiljanju: {e}")
                disconnected_clients.add(client)
        
        # Odstrani prekinjene povezave
        self.connected_clients -= disconnected_clients

    async def send_performance_metrics(self, websocket=None):
        """Pošlje performance metrike"""
        metrics_data = {
            "type": "performance_metrics",
            "timestamp": int(time.time() * 1000),
            "metrics": self.performance_metrics
        }
        
        message = json.dumps(metrics_data)
        
        if websocket:
            await websocket.send(message)
        else:
            # Broadcast vsem klientom
            for client in list(self.connected_clients):
                try:
                    await client.send(message)
                except:
                    self.connected_clients.discard(client)

    async def simulate_real_data(self):
        """Simulira realne podatke in spremembe"""
        logger.info("Začenjam simulacijo realnih podatkov...")
        
        while self.running:
            try:
                # Simuliraj spremembe statusov
                await self.simulate_status_changes()
                
                # Posodobi performance metrike
                await self.update_performance_metrics()
                
                # Generiraj občasne alerte
                await self.generate_system_alerts()
                
                # Pošlji posodobitve
                await self.broadcast_status_update()
                await self.send_performance_metrics()
                
                await asyncio.sleep(UPDATE_INTERVAL)
                
            except Exception as e:
                logger.error(f"Napaka v simulaciji: {e}")
                await asyncio.sleep(1)

    async def simulate_status_changes(self):
        """Simulira spremembe statusov modulov"""
        for module_id, module_data in self.modules_data.items():
            # 15% možnost spremembe statusa
            if random.random() < 0.15:
                current_status = module_data["status"]
                
                # Različne verjetnosti za različne statuse
                if "✅ Online" in current_status:
                    # Online moduli imajo majhno možnost težav
                    if random.random() < 0.05:
                        new_statuses = ["⚠️ Warning", "🔄 Processing"]
                        module_data["status"] = random.choice(new_statuses)
                        
                elif "⚠️ Warning" in current_status:
                    # Warning moduli se lahko popravijo ali poslabšajo
                    if random.random() < 0.3:
                        module_data["status"] = "✅ Online"
                    elif random.random() < 0.1:
                        module_data["status"] = "❌ Offline"
                        
                elif "🔄 Processing" in current_status:
                    # Processing moduli se običajno vrnejo online
                    if random.random() < 0.4:
                        module_data["status"] = "✅ Online"
                        
                elif "❌ Offline" in current_status:
                    # Offline moduli se lahko popravijo
                    if random.random() < 0.2:
                        module_data["status"] = "🔄 Processing"
                
                # Posodobi metadata
                await self.update_module_metadata(module_id, module_data)

    async def update_module_metadata(self, module_id, module_data):
        """Posodobi metadata modula"""
        metadata = module_data.get("metadata", {})
        
        if module_id == "Finance":
            metadata["transactions_per_minute"] = random.randint(800, 1500)
            metadata["error_rate"] = round(random.uniform(0.01, 0.1), 3)
            metadata["response_time"] = random.randint(80, 200)
            
        elif module_id == "Plačila":
            metadata["processed_payments"] += random.randint(5, 25)
            metadata["failed_payments"] += random.randint(0, 2)
            metadata["average_amount"] = round(random.uniform(50, 150), 2)
            
        elif module_id == "Turizem":
            metadata["active_bookings"] = random.randint(1500, 2000)
            metadata["occupancy_rate"] = round(random.uniform(60, 95), 1)
            metadata["revenue_today"] += round(random.uniform(100, 1000), 2)
            
        elif module_id == "Rezervacije":
            metadata["pending_reservations"] = random.randint(50, 150)
            metadata["confirmed_today"] += random.randint(1, 10)
            metadata["cancellation_rate"] = round(random.uniform(3, 8), 1)
            
        elif module_id == "Marketing":
            metadata["campaigns_active"] = random.randint(8, 15)
            metadata["click_through_rate"] = round(random.uniform(2, 5), 1)
            metadata["conversion_rate"] = round(random.uniform(1.5, 3), 1)

    async def update_performance_metrics(self):
        """Posodobi performance metrike"""
        self.performance_metrics["dataFlowRate"] = round(random.uniform(10, 80), 1)
        self.performance_metrics["processingLoad"] = random.randint(20, 90)
        self.performance_metrics["responseTime"] = random.randint(50, 300)
        self.performance_metrics["totalRequests"] += random.randint(100, 500)
        self.performance_metrics["errorRate"] = round(random.uniform(0.1, 2.0), 2)

    async def generate_system_alerts(self):
        """Generiraj sistemske alerte"""
        if random.random() < 0.05:  # 5% možnost alerta
            alerts = [
                {"message": "Visoka obremenitev sistema zaznana", "severity": "warning"},
                {"message": "Backup proces uspešno zaključen", "severity": "info"},
                {"message": "Kritična napaka v modulu Finance", "severity": "error"},
                {"message": "Vzdrževanje sistema načrtovano za 02:00", "severity": "info"},
                {"message": "Neobičajna aktivnost v modulu Rezervacije", "severity": "warning"}
            ]
            
            alert = random.choice(alerts)
            alert_data = {
                "type": "system_alert",
                "timestamp": int(time.time() * 1000),
                **alert
            }
            
            message = json.dumps(alert_data)
            for client in list(self.connected_clients):
                try:
                    await client.send(message)
                except:
                    self.connected_clients.discard(client)
            
            logger.info(f"Poslan sistemski alert: {alert['message']}")

    def start_http_server(self):
        """Zažene HTTP server za REST API"""
        class CORSHTTPRequestHandler(SimpleHTTPRequestHandler):
            def end_headers(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                super().end_headers()
            
            def do_GET(self):
                if self.path == '/api/status':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    
                    response_data = {
                        "type": "status_update",
                        "timestamp": int(time.time() * 1000),
                        "modules": list(server.modules_data.values()),
                        "metrics": server.performance_metrics
                    }
                    
                    self.wfile.write(json.dumps(response_data).encode())
                else:
                    super().do_GET()
        
        httpd = HTTPServer(('localhost', HTTP_PORT), CORSHTTPRequestHandler)
        logger.info(f"HTTP server zagnan na portu {HTTP_PORT}")
        httpd.serve_forever()

    async def start_websocket_server(self):
        """Zažene WebSocket server"""
        logger.info(f"WebSocket server se zaganja na portu {WEBSOCKET_PORT}...")
        
        # Zaženi simulacijo podatkov
        asyncio.create_task(self.simulate_real_data())
        
        # Zaženi WebSocket server
        await websockets.serve(self.register_client, "localhost", WEBSOCKET_PORT)
        logger.info(f"WebSocket server uspešno zagnan na ws://localhost:{WEBSOCKET_PORT}")

# Globalna instanca serverja
server = OmniBackendServer()

def main():
    """Glavna funkcija"""
    print("🚀 Omni-APP Demo Backend Server")
    print("=" * 50)
    print(f"WebSocket server: ws://localhost:{WEBSOCKET_PORT}")
    print(f"HTTP REST API: http://localhost:{HTTP_PORT}/api/status")
    print("=" * 50)
    
    # Zaženi HTTP server v ločeni niti
    http_thread = threading.Thread(target=server.start_http_server, daemon=True)
    http_thread.start()
    
    # Zaženi WebSocket server
    try:
        asyncio.run(server.start_websocket_server())
    except KeyboardInterrupt:
        logger.info("Server zaustavljen")
        server.running = False

if __name__ == "__main__":
    main()