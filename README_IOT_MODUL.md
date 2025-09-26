# 🏠 IoT Modul za Omni AI Platform

## Pregled

IoT (Internet of Things) modul omogoča Omni AI platformi nadzor naprav v realnem svetu. Modul podpira prižiganje, ugašanje, ponovni zagon in preverjanje stanja različnih naprav - od pametnih domačih naprav do industrijskih strojev.

## 🚀 Implementirane funkcionalnosti

### Osnovne funkcije
- **Prižiganje naprav** (`turn_on`) - Prižge izbrano napravo
- **Ugašanje naprav** (`turn_off`) - Ugaši izbrano napravo  
- **Ponovni zagon** (`restart`) - Ponovno zažene napravo
- **Preverjanje stanja** (`status`) - Preveri trenutno stanje naprave

### Napredne funkcije
- **Seznam naprav** (`list_devices`) - Prikaže vse registrirane naprave
- **Množični nadzor** (`bulk_control`) - Nadzoruje več naprav hkrati
- **Inteligentno prepoznavanje** - Prepozna naprave in ukaze v naravnem jeziku
- **Simulacijski način** - Omogoča testiranje brez realnih naprav

## 📁 Struktura datotek

```
omni/modules/iot/
├── __init__.py          # Paket inicializacija
└── iot.py              # Glavni IoT modul

test_iot_module.py      # Celoviti test IoT funkcionalnosti
config.json             # Konfiguracija (IoT sekcija)
```

## ⚙️ Konfiguracija

V `config.json` dodajte IoT sekcijo:

```json
{
  "modules": {
    "iot": {
      "enabled": true,
      "simulation_mode": true,
      "device_timeout": 5,
      "auto_discovery": false,
      "protocols": ["mqtt", "http", "websocket"]
    }
  }
}
```

### Konfiguracija parametri:
- `enabled`: Omogoči/onemogoči IoT modul
- `simulation_mode`: Simulacijski način za testiranje
- `device_timeout`: Časovna omejitev za odziv naprave (sekunde)
- `auto_discovery`: Samodejno odkrivanje naprav
- `protocols`: Podprti protokoli za komunikacijo

## 🧪 Testiranje

### Osnovni test
```bash
python test_iot_module.py
```

### Test preko Omni sistema
```python
import omni

# Prižgi napravo
result = omni.run("Prižgi pametno TV")

# Preveri stanje
result = omni.run("Preveri stanje stroja 1")

# Seznam naprav
result = omni.run("Seznam IoT naprav")
```

## 📊 JSON struktura rezultatov

```json
{
  "module": "iot",
  "action": "device_control",
  "results": [
    "✅ Naprava 'Pametna TV' prižgana",
    "📊 Naprava 'Stroj 1' je on"
  ],
  "devices_count": 6,
  "timestamp": "2024-01-20T10:30:00"
}
```

## 🔧 Uporaba v kodi

### Direktna uporaba
```python
from omni.modules.iot.iot import IoTModule

# Ustvari IoT modul
iot = IoTModule()

# Osnovne operacije
print(iot.turn_on("Pametna TV"))
print(iot.turn_off("Računalnik"))
print(iot.restart("Stroj 1"))
print(iot.status("Klimatska naprava"))

# Seznam naprav
devices = iot.list_devices()
for device in devices:
    print(f"{device['name']}: {device['status']}")

# Množični nadzor
results = iot.bulk_control("turn_on", ["TV", "Luč", "Klimatska"])
```

### Integracija z OmniCore
```python
from omni.core.engine import OmniCore
from omni.modules.iot.iot import IoTModule

# Inicializacija
omni = OmniCore()
iot_module = IoTModule()
omni.register_module("iot", iot_module)

# Uporaba preko naravnega jezika
result = omni.run("Prižgi vse naprave v pisarni")
```

## 🌐 Realne integracije

### 1. MQTT Broker integracija

```python
import paho.mqtt.client as mqtt

class MQTTIoTModule(IoTModule):
    def __init__(self, mqtt_broker="localhost", mqtt_port=1883):
        super().__init__()
        self.mqtt_client = mqtt.Client()
        self.mqtt_client.connect(mqtt_broker, mqtt_port, 60)
    
    def turn_on(self, device_name):
        topic = f"devices/{device_name}/command"
        self.mqtt_client.publish(topic, "ON")
        return f"✅ MQTT ukaz poslan: {device_name} ON"
```

### 2. Home Assistant integracija

```python
import requests

class HomeAssistantIoTModule(IoTModule):
    def __init__(self, ha_url, ha_token):
        super().__init__()
        self.ha_url = ha_url
        self.headers = {
            "Authorization": f"Bearer {ha_token}",
            "Content-Type": "application/json"
        }
    
    def turn_on(self, device_name):
        entity_id = f"switch.{device_name.lower().replace(' ', '_')}"
        url = f"{self.ha_url}/api/services/switch/turn_on"
        data = {"entity_id": entity_id}
        
        response = requests.post(url, json=data, headers=self.headers)
        if response.status_code == 200:
            return f"✅ Home Assistant: {device_name} prižgan"
        else:
            return f"❌ Napaka: {response.status_code}"
```

### 3. REST API integracija

```python
import requests

class RESTIoTModule(IoTModule):
    def __init__(self, api_base_url, api_key):
        super().__init__()
        self.api_url = api_base_url
        self.api_key = api_key
    
    def turn_on(self, device_name):
        url = f"{self.api_url}/devices/{device_name}/on"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        response = requests.post(url, headers=headers)
        return f"✅ REST API: {device_name} prižgan" if response.ok else f"❌ Napaka: {response.status_code}"
```

### 4. WebSocket real-time nadzor

```python
import asyncio
import websockets
import json

class WebSocketIoTModule(IoTModule):
    def __init__(self, ws_url):
        super().__init__()
        self.ws_url = ws_url
    
    async def send_command(self, device_name, action):
        async with websockets.connect(self.ws_url) as websocket:
            command = {
                "device": device_name,
                "action": action,
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(command))
            response = await websocket.recv()
            return json.loads(response)
```

## 🏭 Industrijski primeri uporabe

### 1. Tovarna - nadzor strojev
```python
# Prižgi proizvodno linijo
omni.run("Prižgi proizvodno linijo A")

# Preveri stanje vseh strojev
omni.run("Status vseh strojev v tovarni")

# Varnostni izklop
omni.run("Izklopi vse stroje - nujna situacija")
```

### 2. Pametna pisarna
```python
# Jutranjo rutino
omni.run("Prižgi luči, klimatsko in računalnike v pisarni")

# Varčevanje energije
omni.run("Ugasni vse naprave razen varnostnih")

# Prezentacijska soba
omni.run("Pripravi prezentacijsko sobo - prižgi projektor in zvok")
```

### 3. Pametni dom
```python
# Dobro jutro rutina
omni.run("Prižgi kavo, luči v kuhinji in radio")

# Odhod od doma
omni.run("Ugasni vse luči, zakleni vrata, vklopi alarm")

# Večerna rutina
omni.run("Zatemnitev luči, vklopi TV, ugasni nepotrebne naprave")
```

## 🔒 Varnostni vidiki

### 1. Avtentikacija
```python
class SecureIoTModule(IoTModule):
    def __init__(self, api_key, secret_key):
        super().__init__()
        self.api_key = api_key
        self.secret_key = secret_key
    
    def authenticate_request(self, device_name, action):
        # Implementiraj varno avtentikacijo
        pass
```

### 2. Šifriranje komunikacije
- Uporabi HTTPS za REST API klice
- TLS za MQTT komunikacijo
- WSS (WebSocket Secure) za real-time povezave

### 3. Dostopne pravice
```python
DEVICE_PERMISSIONS = {
    "admin": ["turn_on", "turn_off", "restart", "status"],
    "user": ["status"],
    "guest": []
}
```

## 📈 Monitoring in analitika

### 1. Logiranje aktivnosti
```python
import logging

logger = logging.getLogger("iot_monitor")

def log_device_action(device_name, action, user, success):
    logger.info(f"Device: {device_name}, Action: {action}, User: {user}, Success: {success}")
```

### 2. Statistike uporabe
```python
def get_device_statistics():
    return {
        "total_commands": 1250,
        "successful_commands": 1200,
        "failed_commands": 50,
        "most_used_device": "Pametna TV",
        "peak_usage_hour": "18:00"
    }
```

## 🚀 Naslednji koraki za razvoj

### Kratkoročno (1-2 tedna)
1. **MQTT integracija** - Povezava z MQTT broker
2. **Home Assistant API** - Integracija s Home Assistant
3. **WebSocket podpora** - Real-time komunikacija
4. **Varnostne izboljšave** - Avtentikacija in šifriranje

### Srednjeročno (1-2 meseca)
1. **Grafični vmesnik** - Web dashboard za nadzor
2. **Mobilna aplikacija** - Nadzor preko telefona
3. **Scenariji in avtomatizacija** - Pametni scenariji
4. **Glasovni nadzor** - Integracija z glasovnimi asistenti

### Dolgoročno (3-6 mesecev)
1. **AI optimizacija** - Učenje vzorcev uporabe
2. **Energetska učinkovitost** - Pametno upravljanje energije
3. **Integracija z oblačnimi storitvami** - AWS IoT, Azure IoT
4. **Industrijski protokoli** - Modbus, OPC-UA podpora

## 🛠️ Odpravljanje težav

### Pogosti problemi

1. **Naprava se ne odziva**
   ```python
   # Preveri povezavo
   result = iot.status("Naprava")
   if "ni registrirana" in result:
       # Dodaj napravo v sistem
   ```

2. **Časovna omejitev**
   ```python
   # Povečaj timeout v config.json
   "device_timeout": 10
   ```

3. **Napake pri komunikaciji**
   ```python
   # Preveri mrežno povezavo
   # Preveri API ključe
   # Preveri protokol (HTTP/HTTPS)
   ```

## 📞 Podpora

Za tehnično podporo in dodatne informacije:
- 📧 Email: support@omni-ai.si
- 📚 Dokumentacija: https://docs.omni-ai.si/iot
- 🐛 Prijava napak: https://github.com/omni-ai/issues

---

**Verzija:** 1.0.0  
**Zadnja posodobitev:** Januar 2024  
**Avtor:** Omni AI Team