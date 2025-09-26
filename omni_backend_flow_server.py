#!/usr/bin/env python3
"""
Omni-APP Backend Flow Server
Real-time WebSocket server za pošiljanje flow podatkov v dashboard
"""

import asyncio
import websockets
import json
import random
import time
from datetime import datetime
from typing import Dict, List, Any
import logging

# Nastavi logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OmniFlowServer:
    def __init__(self, host='localhost', port=8080):
        self.host = host
        self.port = port
        self.connected_clients = set()
        self.modules = {
            'global': {'id': 'global', 'status': '✅ Online', 'type': 'global'},
            'AI': {'id': 'AI', 'status': '✅ Online', 'type': 'main'},
            'IoT': {'id': 'IoT', 'status': '✅ Online', 'type': 'main'},
            'Analytics': {'id': 'Analytics', 'status': '✅ Online', 'type': 'main'},
            'Finance': {'id': 'Finance', 'status': '✅ Online', 'type': 'main'},
            'NLP': {'id': 'NLP', 'status': '✅ Online', 'type': 'sub', 'parent': 'AI'},
            'Vision': {'id': 'Vision', 'status': '✅ Online', 'type': 'sub', 'parent': 'AI'},
            'Sensors': {'id': 'Sensors', 'status': '✅ Online', 'type': 'sub', 'parent': 'IoT'},
            'Devices': {'id': 'Devices', 'status': '✅ Online', 'type': 'sub', 'parent': 'IoT'},
            'Reports': {'id': 'Reports', 'status': '✅ Online', 'type': 'sub', 'parent': 'Analytics'},
            'Banking': {'id': 'Banking', 'status': '✅ Online', 'type': 'sub', 'parent': 'Finance'}
        }
        
        self.flow_patterns = [
            # Global → Main modules
            {'from': 'global', 'to': 'AI', 'weight': 0.8},
            {'from': 'global', 'to': 'IoT', 'weight': 0.7},
            {'from': 'global', 'to': 'Analytics', 'weight': 0.6},
            {'from': 'global', 'to': 'Finance', 'weight': 0.5},
            
            # Main → Sub modules
            {'from': 'AI', 'to': 'NLP', 'weight': 0.9},
            {'from': 'AI', 'to': 'Vision', 'weight': 0.7},
            {'from': 'IoT', 'to': 'Sensors', 'weight': 0.8},
            {'from': 'IoT', 'to': 'Devices', 'weight': 0.6},
            {'from': 'Analytics', 'to': 'Reports', 'weight': 0.7},
            {'from': 'Finance', 'to': 'Banking', 'weight': 0.8},
        ]
        
        self.running = False
        
    async def register_client(self, websocket, path):
        """Registracija novega klienta"""
        self.connected_clients.add(websocket)
        client_ip = websocket.remote_address[0] if websocket.remote_address else 'unknown'
        logger.info(f"🔗 Nov klient povezan: {client_ip} (skupaj: {len(self.connected_clients)})")
        
        try:
            # Pošlji začetno stanje
            await self.send_initial_state(websocket)
            
            # Čakaj na sporočila od klienta
            async for message in websocket:
                await self.handle_client_message(websocket, message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"🔌 Klient {client_ip} se je odklopil")
        except Exception as e:
            logger.error(f"❌ Napaka pri komunikaciji s klientom {client_ip}: {e}")
        finally:
            self.connected_clients.discard(websocket)
            logger.info(f"📊 Aktivni klienti: {len(self.connected_clients)}")

    async def send_initial_state(self, websocket):
        """Pošlji začetno stanje modulov in flow-ov"""
        initial_data = {
            'type': 'initial_state',
            'timestamp': datetime.now().isoformat(),
            'modules': list(self.modules.values()),
            'flows': self.generate_flows(),
            'server_info': {
                'version': '1.0.0',
                'uptime': time.time(),
                'connected_clients': len(self.connected_clients)
            }
        }
        
        await websocket.send(json.dumps(initial_data))
        logger.info("📤 Poslano začetno stanje novemu klientu")

    async def handle_client_message(self, websocket, message):
        """Obravnava sporočila od klientov"""
        try:
            data = json.loads(message)
            message_type = data.get('type', 'unknown')
            
            if message_type == 'ping':
                await websocket.send(json.dumps({'type': 'pong', 'timestamp': datetime.now().isoformat()}))
            
            elif message_type == 'request_flow_burst':
                await self.trigger_flow_burst()
                
            elif message_type == 'update_module_status':
                module_id = data.get('module_id')
                new_status = data.get('status')
                if module_id in self.modules:
                    self.modules[module_id]['status'] = new_status
                    await self.broadcast_module_update(module_id)
                    
            elif message_type == 'request_stats':
                stats = await self.get_server_stats()
                await websocket.send(json.dumps({'type': 'stats', 'data': stats}))
                
            logger.info(f"📨 Prejeto sporočilo tipa: {message_type}")
            
        except json.JSONDecodeError:
            logger.warning("⚠️ Prejeto neveljavno JSON sporočilo")
        except Exception as e:
            logger.error(f"❌ Napaka pri obravnavi sporočila: {e}")

    def generate_flows(self) -> List[Dict[str, Any]]:
        """Generiraj naključne flow-e na podlagi vzorcev"""
        flows = []
        current_time = datetime.now().isoformat()
        
        for pattern in self.flow_patterns:
            # Preveri ali modula obstajata
            if pattern['from'] not in self.modules or pattern['to'] not in self.modules:
                continue
                
            # Določi ali je flow aktiven na podlagi weight-a
            is_active = random.random() < pattern['weight']
            
            if is_active:
                # Določi status flow-a
                rand = random.random()
                if rand < 0.7:
                    status = 'active'
                elif rand < 0.9:
                    status = 'warning'
                else:
                    status = 'error'
                    
                # Simuliraj različne hitrosti in intenzitete
                speed = random.uniform(0.5, 2.0)
                intensity = random.uniform(0.3, 1.0)
                
                flow = {
                    'from': pattern['from'],
                    'to': pattern['to'],
                    'active': True,
                    'status': status,
                    'speed': speed,
                    'intensity': intensity,
                    'timestamp': current_time,
                    'data_size': random.randint(100, 10000),  # KB
                    'process_id': f"proc_{random.randint(1000, 9999)}"
                }
                
                flows.append(flow)
        
        return flows

    async def broadcast_flows(self):
        """Pošlji flow podatke vsem povezanim klientom"""
        if not self.connected_clients:
            return
            
        flows = self.generate_flows()
        
        # Občasno posodobi tudi status modulov
        if random.random() < 0.1:  # 10% možnost
            self.update_module_statuses()
        
        message = {
            'type': 'flow_update',
            'timestamp': datetime.now().isoformat(),
            'flows': flows,
            'modules': list(self.modules.values()),
            'server_stats': {
                'active_flows': len([f for f in flows if f['active']]),
                'total_data_flow': sum(f.get('data_size', 0) for f in flows),
                'connected_clients': len(self.connected_clients)
            }
        }
        
        # Pošlji vsem klientom
        disconnected_clients = set()
        for client in self.connected_clients:
            try:
                await client.send(json.dumps(message))
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)
            except Exception as e:
                logger.error(f"❌ Napaka pri pošiljanju sporočila: {e}")
                disconnected_clients.add(client)
        
        # Odstrani odklopljene kliente
        self.connected_clients -= disconnected_clients
        
        if flows:
            active_count = len([f for f in flows if f['active']])
            logger.info(f"📊 Poslano {active_count} aktivnih flow-ov {len(self.connected_clients)} klientom")

    def update_module_statuses(self):
        """Naključno posodobi status modulov"""
        for module_id, module in self.modules.items():
            if module_id == 'global':
                continue  # Global ostane vedno online
                
            rand = random.random()
            if rand < 0.05:  # 5% možnost spremembe
                if module['status'] == '✅ Online':
                    module['status'] = '⚠️ Warning' if random.random() < 0.8 else '❌ Error'
                else:
                    module['status'] = '✅ Online'  # Popravi se nazaj

    async def broadcast_module_update(self, module_id):
        """Pošlji posodobitev modula vsem klientom"""
        if not self.connected_clients:
            return
            
        message = {
            'type': 'module_update',
            'timestamp': datetime.now().isoformat(),
            'module': self.modules[module_id]
        }
        
        for client in self.connected_clients:
            try:
                await client.send(json.dumps(message))
            except:
                pass

    async def trigger_flow_burst(self):
        """Sproži intenziven burst flow-ov"""
        logger.info("🚀 Sprožen Flow Burst!")
        
        # Ustvari intenzivne flow-e za vse vzorce
        burst_flows = []
        for pattern in self.flow_patterns:
            for i in range(3):  # 3 zaporedni flow-i
                flow = {
                    'from': pattern['from'],
                    'to': pattern['to'],
                    'active': True,
                    'status': 'active',
                    'speed': 2.0,  # Maksimalna hitrost
                    'intensity': 1.0,  # Maksimalna intenziteta
                    'timestamp': datetime.now().isoformat(),
                    'burst': True,
                    'burst_sequence': i + 1
                }
                burst_flows.append(flow)
        
        message = {
            'type': 'flow_burst',
            'timestamp': datetime.now().isoformat(),
            'flows': burst_flows
        }
        
        for client in self.connected_clients:
            try:
                await client.send(json.dumps(message))
            except:
                pass

    async def get_server_stats(self):
        """Pridobi statistike serverja"""
        return {
            'uptime': time.time(),
            'connected_clients': len(self.connected_clients),
            'total_modules': len(self.modules),
            'active_modules': len([m for m in self.modules.values() if m['status'] == '✅ Online']),
            'flow_patterns': len(self.flow_patterns),
            'server_version': '1.0.0',
            'timestamp': datetime.now().isoformat()
        }

    async def flow_generator_loop(self):
        """Glavna zanka za generiranje flow-ov"""
        logger.info("🔄 Zagon flow generator loop-a")
        
        while self.running:
            try:
                await self.broadcast_flows()
                
                # Naključen interval med 1-4 sekunde
                interval = random.uniform(1.0, 4.0)
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"❌ Napaka v flow generator loop-u: {e}")
                await asyncio.sleep(5)

    async def start_server(self):
        """Zaženi WebSocket server"""
        self.running = True
        
        logger.info(f"🚀 Zaganjam Omni-APP Flow Server na {self.host}:{self.port}")
        
        # Zaženi WebSocket server
        server = await websockets.serve(
            self.register_client,
            self.host,
            self.port,
            ping_interval=30,
            ping_timeout=10
        )
        
        # Zaženi flow generator v ozadju
        flow_task = asyncio.create_task(self.flow_generator_loop())
        
        logger.info("✅ Server uspešno zagnan!")
        logger.info(f"🌐 WebSocket endpoint: ws://{self.host}:{self.port}")
        logger.info("📊 Statistike:")
        logger.info(f"   - Moduli: {len(self.modules)}")
        logger.info(f"   - Flow vzorci: {len(self.flow_patterns)}")
        
        try:
            # Čakaj dokler se server ne ustavi
            await server.wait_closed()
        except KeyboardInterrupt:
            logger.info("⏹️ Prejeta prekinitev (Ctrl+C)")
        finally:
            self.running = False
            flow_task.cancel()
            server.close()
            await server.wait_closed()
            logger.info("🔴 Server ustavljen")

def main():
    """Glavna funkcija"""
    print("=" * 60)
    print("🌊 OMNI-APP REAL-TIME FLOW SERVER")
    print("=" * 60)
    print("📡 WebSocket server za real-time flow animacije")
    print("🎯 Povezava z Omni-APP dashboard-om")
    print("=" * 60)
    
    # Ustvari in zaženi server
    server = OmniFlowServer(host='localhost', port=8080)
    
    try:
        asyncio.run(server.start_server())
    except KeyboardInterrupt:
        print("\n👋 Nasvidenje!")
    except Exception as e:
        logger.error(f"❌ Kritična napaka: {e}")

if __name__ == "__main__":
    main()