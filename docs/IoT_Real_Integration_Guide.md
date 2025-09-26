# 🌐 Omni IoT Real Integration Guide

**Realna IoT integracija za Omni AI Platform**

Verzija: 1.0.0  
Datum: Januar 2025  
Avtor: Omni AI Platform Team

---

## 📋 Kazalo

1. [Pregled](#pregled)
2. [Predpogoji](#predpogoji)
3. [Namestitev](#namestitev)
4. [Konfiguracija](#konfiguracija)
5. [Uporaba](#uporaba)
6. [Scenariji uporabe](#scenariji-uporabe)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)
9. [Varnost](#varnost)
10. [FAQ](#faq)

---

## 🎯 Pregled

Omni IoT Real Integration omogoča upravljanje resničnih IoT naprav preko različnih protokolov:

- **MQTT** - Za realno-časovno komunikacijo
- **REST API** - Za HTTP-based naprave
- **Home Assistant** - Za pametne domove
- **WebSocket** - Za interaktivno komunikacijo

### ✨ Ključne funkcionalnosti

- 🔌 **Realno upravljanje naprav** - Brez simulacij
- 📡 **Večprotokolarno** - MQTT, REST, WebSocket
- 🏠 **Home Assistant integracija** - Popolna kompatibilnost
- 🔄 **Bulk operacije** - Upravljanje več naprav hkrati
- 📊 **Monitoring** - Realno-časovno spremljanje
- 🛡️ **Varnost** - Šifrirana komunikacija
- ⚡ **Optimizacija energije** - Pametno upravljanje porabe

---

## 🔧 Predpogoji

### Sistemski zahtevi

- **Python 3.8+**
- **MQTT Broker** (Mosquitto, HiveMQ, AWS IoT)
- **Kompatibilne IoT naprave**
- **Omni AI Platform** (osnovna namestitev)

### Priporočene naprave

#### 🏠 Pametni dom
- Philips Hue luči
- Sonoff smart preklopniki
- Shelly naprave
- ESP32/ESP8266 moduli

#### 🏢 Pisarna
- Smart plugs
- IP kamere
- Pametni termostati
- UPS sistemi

#### 🏭 Industrija
- PLC kontrolerji
- Senzorji (temperatura, vlaga, pritisk)
- Servo motorji
- Varnostni sistemi

---

## 📦 Namestitev

### 1. Namesti Python pakete

```bash
# Osnovna namestitev
pip install paho-mqtt requests

# Dodatni paketi za napredne funkcionalnosti
pip install websocket-client aiohttp cryptography
```

### 2. Nastavi MQTT Broker

#### Mosquitto (lokalno)
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mosquitto mosquitto-clients

# Windows (Chocolatey)
choco install mosquitto

# macOS (Homebrew)
brew install mosquitto
```

#### Docker namestitev
```bash
docker run -it -p 1883:1883 -p 9001:9001 eclipse-mosquitto
```

### 3. Preveri namestitev

```bash
# Test MQTT povezave
mosquitto_pub -h localhost -t test/topic -m "Hello IoT"
mosquitto_sub -h localhost -t test/topic
```

---

## ⚙️ Konfiguracija

### 1. Osnovna konfiguracija (.env)

Ustvari `.env` datoteko v root direktoriju:

```env
# MQTT nastavitve
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
MQTT_CLIENT_ID=OmniIoT

# Home Assistant
HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=your_long_lived_access_token

# Varnost
ENABLE_TLS=true
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem

# Debugging
DEBUG_MODE=false
LOG_LEVEL=INFO
```

### 2. Konfiguracija v config.json

```json
{
  "modules": {
    "iot_real": {
      "enabled": true,
      "mqtt_broker": "localhost",
      "mqtt_port": 1883,
      "home_assistant_url": "http://homeassistant.local:8123",
      "device_timeout": 10,
      "auto_reconnect": true,
      "protocols": ["mqtt", "http", "websocket"],
      "security": {
        "enable_tls": true,
        "verify_certificates": true
      }
    }
  }
}
```

### 3. Napredne nastavitve

#### MQTT z TLS
```json
{
  "mqtt_tls": {
    "ca_certs": "/path/to/ca.crt",
    "certfile": "/path/to/client.crt", 
    "keyfile": "/path/to/client.key",
    "tls_version": "TLSv1.2"
  }
}
```

#### Home Assistant Long-Lived Token
1. Pojdi na Home Assistant → Profile → Long-Lived Access Tokens
2. Ustvari nov token
3. Kopiraj token v `.env` datoteko

---

## 🚀 Uporaba

### 1. Osnovno upravljanje naprav

```python
from omni.modules.iot.iot_real import IoTRealModule

# Inicializacija
iot = IoTRealModule()

# Prižgi luč
result = iot.turn_on("home/livingroom/light")
print(result['message'])

# Ugaši napravo
result = iot.turn_off("home/kitchen/coffee_maker")
print(result['message'])

# Preveri stanje
status = iot.status("home/livingroom/light")
print(f"Stanje: {status['state']}")
```

### 2. Bulk operacije

```python
# Upravljanje več naprav hkrati
devices = [
    "home/livingroom/light",
    "home/kitchen/light", 
    "home/bedroom/light"
]

# Prižgi vse luči
result = iot.bulk_control(devices, "turn_on")
print(f"Uspešno: {result['successful']}/{result['total_devices']}")

# Ugaši vse luči
result = iot.bulk_control(devices, "turn_off")
```

### 3. Home Assistant integracija

```python
# Upravljanje preko Home Assistant
result = iot.home_assistant_call(
    entity_id="light.living_room",
    service="turn_on",
    service_data={"brightness": 255, "color_name": "blue"}
)

# Nastavi termostat
result = iot.home_assistant_call(
    entity_id="climate.main_ac",
    service="set_temperature", 
    service_data={"temperature": 22}
)
```

### 4. Poljubni MQTT ukazi

```python
import json

# Pošlji poljubno sporočilo
data = {
    "temperature": 23.5,
    "humidity": 45.2,
    "timestamp": time.time()
}

result = iot.send_custom_mqtt(
    topic="sensors/living_room/data",
    payload=json.dumps(data)
)
```

---

## 🎭 Scenariji uporabe

### 🏠 Scenarij 1: Pametni dom

```python
def smart_home_morning_routine():
    """Jutranja rutina v pametnem domu"""
    iot = IoTRealModule()
    
    # Prižgi luči postopoma
    lights = ["home/bedroom/light", "home/kitchen/light", "home/livingroom/light"]
    iot.bulk_control(lights, "turn_on")
    
    # Vklopi kavo
    iot.turn_on("home/kitchen/coffee_maker")
    
    # Odpri žaluzije
    iot.turn_on("home/livingroom/blinds")
    
    # Vklopi radio
    iot.home_assistant_call("media_player.kitchen_radio", "media_play")
    
    print("✅ Jutranja rutina končana")
```

### 🏢 Scenarij 2: Pisarnska avtomatizacija

```python
def office_automation():
    """Avtomatizacija pisarnskih naprav"""
    iot = IoTRealModule()
    
    # Vklopi računalnike
    computers = ["office/pc1", "office/pc2", "office/pc3"]
    iot.bulk_control(computers, "turn_on")
    
    # Nastavi klimatsko napravo
    iot.home_assistant_call(
        "climate.office_ac",
        "set_temperature",
        {"temperature": 22}
    )
    
    # Vklopi tiskalnik
    iot.turn_on("office/printer")
    
    # Pošlji monitoring podatke
    monitoring_data = {
        "office_status": "active",
        "devices_online": len(computers) + 2,
        "timestamp": time.time()
    }
    
    iot.send_custom_mqtt(
        "office/monitoring/status",
        json.dumps(monitoring_data)
    )
```

### 🏭 Scenarij 3: Industrijska avtomatizacija

```python
def industrial_control():
    """Nadzor industrijskih strojev"""
    iot = IoTRealModule()
    
    # Zaženi proizvodno linijo
    production_line = [
        "factory/conveyor1",
        "factory/robot_arm", 
        "factory/quality_scanner"
    ]
    
    for device in production_line:
        result = iot.turn_on(device)
        print(f"Zaganjam {device}: {result['message']}")
        time.sleep(2)  # Varnostna pavza
    
    # Aktiviraj varnostni sistem
    iot.turn_on("factory/safety/emergency_stop")
    
    # Pošlji senzorske podatke
    sensor_data = {
        "temperature": 23.5,
        "pressure": 1013.25,
        "vibration": 0.02,
        "production_rate": 95.2
    }
    
    iot.send_custom_mqtt(
        "factory/sensors/data",
        json.dumps(sensor_data)
    )
```

### ⚡ Scenarij 4: Upravljanje energije

```python
def energy_management():
    """Pametno upravljanje energije"""
    iot = IoTRealModule()
    
    # Vklopi sončne panele (če je dan)
    iot.turn_on("energy/solar_panels")
    
    # Nastavi baterijski sistem
    iot.turn_on("energy/battery_storage")
    
    # Optimiziraj porabo - ugaši energetsko potratne naprave
    high_consumption = [
        "home/water_heater",
        "home/dishwasher", 
        "home/washing_machine"
    ]
    
    # Ugaši med nizko proizvodnjo
    iot.bulk_control(high_consumption, "turn_off")
    
    # Pošlji energetske podatke
    energy_data = {
        "solar_production": 4.2,  # kW
        "battery_level": 85,      # %
        "grid_consumption": 2.1   # kW
    }
    
    iot.send_custom_mqtt(
        "energy/monitoring/data",
        json.dumps(energy_data)
    )
```

---

## 📚 API Reference

### IoTRealModule Class

#### Osnovne metode

```python
class IoTRealModule:
    def __init__(self, config=None):
        """Inicializacija IoT modula"""
        
    def turn_on(self, device_topic: str) -> dict:
        """Prižge napravo preko MQTT"""
        
    def turn_off(self, device_topic: str) -> dict:
        """Ugaši napravo preko MQTT"""
        
    def restart(self, device_topic: str) -> dict:
        """Ponovno zažene napravo"""
        
    def status(self, device_topic: str, status_url: str = None) -> dict:
        """Preveri stanje naprave"""
```

#### Napredne metode

```python
    def bulk_control(self, devices: list, action: str) -> dict:
        """Upravljanje več naprav hkrati"""
        
    def send_custom_mqtt(self, topic: str, payload: str) -> dict:
        """Pošlje poljubno MQTT sporočilo"""
        
    def home_assistant_call(self, entity_id: str, service: str, service_data: dict = None) -> dict:
        """Kliče Home Assistant servis"""
        
    def get_device_list(self) -> list:
        """Vrne seznam registriranih naprav"""
        
    def set_device_config(self, device_id: str, config: dict) -> bool:
        """Nastavi konfiguracijo naprave"""
```

#### Povratne vrednosti

Vse metode vračajo slovar z naslednjimi ključi:

```python
{
    "success": bool,           # Ali je operacija uspešna
    "message": str,           # Sporočilo o rezultatu
    "timestamp": float,       # Unix timestamp
    "device_id": str,         # ID naprave (če je relevantno)
    "data": dict             # Dodatni podatki (opcijsko)
}
```

---

## 🔧 Troubleshooting

### Pogoste napake

#### 1. MQTT Connection Failed
```
Napaka: [Errno 111] Connection refused
```

**Rešitev:**
- Preveri, ali MQTT broker teče
- Preveri IP naslov in port
- Preveri firewall nastavitve

```bash
# Test MQTT broker
mosquitto_pub -h localhost -t test -m "test"
```

#### 2. Home Assistant Unauthorized
```
Napaka: 401 Unauthorized
```

**Rešitev:**
- Preveri Home Assistant token
- Preveri URL naslov
- Regeneriraj Long-Lived Access Token

#### 3. Device Not Responding
```
Napaka: Device timeout after 10 seconds
```

**Rešitev:**
- Preveri, ali je naprava online
- Povečaj timeout vrednost
- Preveri MQTT topic

### Debug mode

Vklopi debug mode v `.env`:
```env
DEBUG_MODE=true
LOG_LEVEL=DEBUG
```

### Logiranje

```python
import logging

# Nastavi logiranje
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Uporabi IoT modul
iot = IoTRealModule()
```

---

## 🛡️ Varnost

### 1. MQTT varnost

#### TLS šifriranje
```python
# Nastavi TLS v konfiguraciji
mqtt_config = {
    "tls": {
        "ca_certs": "/path/to/ca.crt",
        "certfile": "/path/to/client.crt",
        "keyfile": "/path/to/client.key"
    }
}
```

#### Avtentikacija
```python
# Username/password
mqtt_config = {
    "username": "your_username",
    "password": "your_secure_password"
}
```

### 2. Home Assistant varnost

- Uporabi HTTPS za Home Assistant
- Generiraj močan Long-Lived Access Token
- Omeji dostop z IP whitelist

### 3. Omrežna varnost

- Uporabi VPN za oddaljeni dostop
- Nastavi firewall pravila
- Redno posodobi firmware naprav

### 4. Najbolje prakse

```python
# Nikoli ne shranjuj gesel v kodi
import os
password = os.getenv("MQTT_PASSWORD")

# Validiraj vhodne podatke
def validate_device_topic(topic):
    if not topic or "/" not in topic:
        raise ValueError("Invalid device topic")
    return topic

# Uporabi timeout za vse operacije
result = iot.turn_on("device/topic", timeout=5)
```

---

## ❓ FAQ

### Q: Katere IoT naprave so podprte?
A: Vse naprave, ki podpirajo MQTT, REST API ali so kompatibilne z Home Assistant.

### Q: Ali lahko upravljam naprave brez interneta?
A: Da, če so naprave v lokalnem omrežju in uporabljaš lokalni MQTT broker.

### Q: Kako dodati novo napravo?
A: Preprosto uporabi ustrezen MQTT topic ali Home Assistant entity ID.

### Q: Ali je modul kompatibilen z AWS IoT?
A: Da, nastavi AWS IoT endpoint kot MQTT broker.

### Q: Kako optimizirati performanse?
A: Uporabi bulk operacije, nastavi ustrezne timeout vrednosti in omogoči connection pooling.

### Q: Ali lahko integriram z drugimi platformami?
A: Da, modul podpira REST API, zato lahko integriraš z vsemi HTTP-based platformami.

---

## 📞 Podpora

### Dokumentacija
- [Omni AI Platform Docs](https://docs.omni-ai.com)
- [MQTT Protocol Guide](https://mqtt.org/mqtt-specification/)
- [Home Assistant API](https://developers.home-assistant.io/docs/api/rest/)

### Skupnost
- GitHub Issues: [github.com/omni-ai/platform/issues](https://github.com/omni-ai/platform/issues)
- Discord: [discord.gg/omni-ai](https://discord.gg/omni-ai)
- Forum: [forum.omni-ai.com](https://forum.omni-ai.com)

### Komercialna podpora
- Email: support@omni-ai.com
- Telefon: +386 1 234 5678

---

## 📄 Licenca

MIT License - glej [LICENSE](LICENSE) datoteko za podrobnosti.

---

**🎉 Čestitamo! Uspešno si nastavil Omni IoT Real Integration.**

Sedaj lahko upravljaš realne IoT naprave preko Omni AI Platform. Za dodatne funkcionalnosti in napredne scenarije preveri našo [dokumentacijo](https://docs.omni-ai.com).

---

*Zadnja posodobitev: Januar 2025*  
*Verzija dokumentacije: 1.0.0*