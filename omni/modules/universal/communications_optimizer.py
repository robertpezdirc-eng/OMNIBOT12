# modules/communications_optimizer.py
import threading
import time
from datetime import datetime
import logging

# Konfiguracija logginga
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

networks = {}
data_flows = {}
monitoring_active = False

def add_network(name, status="active", bandwidth="1Gbps", latency="<10ms"):
    """Dodaj novo omrežje v sistem za spremljanje"""
    networks[name] = {
        "status": status,
        "bandwidth": bandwidth,
        "latency": latency,
        "last_check": datetime.utcnow().isoformat(),
        "packets_sent": 0,
        "packets_received": 0,
        "errors": 0
    }
    logger.info(f"📡 Omrežje {name} dodano v sistem")
    return f"Omrežje {name} uspešno registrirano"

def add_data_flow(name, source, destination, protocol="TCP", priority="normal"):
    """Dodaj podatkovni tok za spremljanje"""
    data_flows[name] = {
        "source": source,
        "destination": destination,
        "protocol": protocol,
        "priority": priority,
        "status": "active",
        "throughput": "0 MB/s",
        "last_activity": datetime.utcnow().isoformat()
    }
    logger.info(f"🔄 Podatkovni tok {name} registriran")
    return f"Podatkovni tok {name} uspešno dodan"

def monitor_networks():
    """Neprekinjeno spremljanje stanja vseh omrežij"""
    global monitoring_active
    monitoring_active = True
    
    while monitoring_active:
        try:
            # Spremljanje omrežij
            for net, info in networks.items():
                # Simulacija preverjanja stanja
                info['last_check'] = datetime.utcnow().isoformat()
                info['packets_sent'] += 100
                info['packets_received'] += 98
                
                logger.info(f"📡 {net}: stanje {info['status']}, latenca {info['latency']}")
            
            # Spremljanje podatkovnih tokov
            for flow, info in data_flows.items():
                info['last_activity'] = datetime.utcnow().isoformat()
                logger.info(f"🔄 Tok {flow}: {info['source']} → {info['destination']} ({info['protocol']})")
            
            time.sleep(180)  # Pregled vsake 3 minute
            
        except Exception as e:
            logger.error(f"❌ Napaka pri spremljanju komunikacij: {e}")
            time.sleep(60)

def optimize_network_performance():
    """Optimizacija zmogljivosti omrežja"""
    optimizations = []
    
    for net, info in networks.items():
        if info['errors'] > 10:
            optimizations.append(f"Preveč napak na {net} - potrebna diagnostika")
        
        if "Mbps" in info['bandwidth'] and int(info['bandwidth'].split('M')[0]) < 100:
            optimizations.append(f"Nizka pasovna širina na {net} - priporočena nadgradnja")
    
    return optimizations

def start_communications_optimizer():
    """Zagon komunikacijskega modula kot samostojne niti"""
    # Dodaj vzorčna omrežja
    add_network("LAN_Primary", "active", "1Gbps", "5ms")
    add_network("WAN_Internet", "active", "500Mbps", "15ms")
    add_network("WiFi_Office", "active", "300Mbps", "8ms")
    
    # Dodaj vzorčne podatkovne tokove
    add_data_flow("Web_Traffic", "192.168.1.0/24", "0.0.0.0/0", "HTTP/HTTPS", "high")
    add_data_flow("Database_Sync", "10.0.0.10", "10.0.0.20", "TCP", "critical")
    add_data_flow("Backup_Stream", "192.168.1.100", "backup.server.com", "FTP", "low")
    
    # Zagon monitoring niti
    t = threading.Thread(target=monitor_networks)
    t.daemon = True
    t.start()
    
    logger.info("📡 Komunikacijski optimizer inicializiran")
    return "📡 Komunikacijski modul uspešno zagnan ✅"

def auto_optimize():
    """Avtomatska optimizacija komunikacijskih sistemov"""
    result = start_communications_optimizer()
    optimizations = optimize_network_performance()
    
    if optimizations:
        logger.info("🔧 Predlagane optimizacije:")
        for opt in optimizations:
            logger.info(f"  • {opt}")
    
    return "Komunikacijska optimizacija v teku"

def get_communications_status():
    """Pridobi trenutno stanje komunikacijskih sistemov"""
    return {
        "networks": len(networks),
        "data_flows": len(data_flows),
        "monitoring_active": monitoring_active,
        "total_networks": networks,
        "active_flows": data_flows
    }

def stop_monitoring():
    """Ustavi spremljanje komunikacij"""
    global monitoring_active
    monitoring_active = False
    logger.info("📡 Spremljanje komunikacij ustavljeno")

# Inicializacija modula
if __name__ == "__main__":
    print(auto_optimize())