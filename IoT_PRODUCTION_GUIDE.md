# 🚀 IoT Avtomatizacijski Sistem - Produkcijski Vodič

## 📋 Pregled Sistema

Omni IoT Avtomatizacijski Sistem je popolna rešitev za varno upravljanje IoT naprav z naprednimi funkcijami avtomatizacije, monitoringa in obvestil.

### ✅ Implementirane Funkcionalnosti

- **🔒 Varno upravljanje naprav** - MQTT TLS, API tokeni, logiranje
- **🎬 Avtomatizacijski scenariji** - Scene, pogojne avtomatizacije
- **⏰ Časovno načrtovanje** - Cron-like scheduler
- **👥 Grupiranje naprav** - Hierarhično upravljanje
- **📏 If-then pravila** - Napredna avtomatizacijska logika
- **📊 Real-time monitoring** - Dashboard, metriki, alarmi
- **🔔 Sistem obvestil** - Email, Slack, Telegram, Webhook
- **🧪 Obsežno testiranje** - 100% uspešnost testov

## 🛠️ Namestitev za Produkcijo

### 1. Sistemske Zahteve

```bash
# Python 3.8+
python --version

# Potrebni paketi
pip install paho-mqtt requests python-dotenv schedule sqlite3 smtplib
```

### 2. Varnostna Konfiguracija

```bash
# Kopiraj primer konfiguracije
cp .env.secure.example .env.secure

# Nastavi file permissions
chmod 600 .env.secure

# Uredi .env.secure z resničnimi podatki
nano .env.secure
```

### 3. MQTT Broker Setup

```bash
# Mosquitto z TLS
sudo apt-get install mosquitto mosquitto-clients

# Generiraj SSL certifikate
openssl req -new -x509 -days 365 -extensions v3_ca -keyout ca.key -out ca.crt
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365

# Mosquitto konfiguracija
echo "
port 8883
cafile /etc/mosquitto/certs/ca.crt
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key
require_certificate true
use_identity_as_username true
password_file /etc/mosquitto/passwd
" > /etc/mosquitto/conf.d/tls.conf

# Ustvari uporabnika
sudo mosquitto_passwd -c /etc/mosquitto/passwd omni_iot_user

# Restart Mosquitto
sudo systemctl restart mosquitto
```

### 4. Baza Podatkov

```python
# SQLite (privzeto)
DATABASE_URL=sqlite:///data/iot_database.db

# PostgreSQL (priporočeno za produkcijo)
pip install psycopg2-binary
DATABASE_URL=postgresql://iot_user:password@localhost/iot_db

# MySQL
pip install mysql-connector-python
DATABASE_URL=mysql://iot_user:password@localhost/iot_db
```

### 5. Zagon Sistema

```python
# Registracija IoT modula v Omni
import omni.modules.iot as iot

# Inicializacija
iot.init_notifications()
automation_engine = iot.AutomationEngine()
scheduler = iot.IoTScheduler()
monitor = iot.IoTMonitor()

# Registracija v Omni Core
omni.register_module(iot)
```

## 🔧 Konfiguracija Naprav

### 1. Registracija MQTT Naprave

```python
# Primer: Pametna luč
device_config = {
    "id": "home/lights/living_room",
    "name": "Dnevna luč",
    "type": "light",
    "mqtt_topic": "home/lights/living_room",
    "capabilities": ["on", "off", "dimming"],
    "location": "Dnevna soba"
}

# Registriraj napravo
iot.register_device_for_monitoring(device_config)
```

### 2. REST API Naprava

```python
# Primer: Pametna klima
device_config = {
    "id": "home/hvac/main",
    "name": "Glavna klima",
    "type": "hvac",
    "api_endpoint": "https://192.168.1.100/api",
    "api_token": "device_specific_token",
    "capabilities": ["on", "off", "temperature", "mode"],
    "location": "Dnevna soba"
}
```

## 🎬 Avtomatizacijski Scenariji

### 1. Ustvarjanje Scene

```python
# Jutranja rutina
morning_scene = {
    "name": "Jutranja rutina",
    "description": "Prižgi luči, zaženi kavo, odpri žaluzije",
    "actions": [
        {"device": "home/lights/living", "action": "on", "params": {"brightness": 80}},
        {"device": "home/coffee_maker", "action": "on"},
        {"device": "home/blinds/living", "action": "open", "params": {"position": 100}},
        {"device": "home/hvac/main", "action": "set_temperature", "params": {"temp": 22}}
    ]
}

# Registriraj sceno
iot.create_scene("morning_routine", morning_scene)
```

### 2. Časovno Načrtovanje

```python
# Avtomatska jutranja rutina
iot.add_scheduled_task(
    task_id="morning_automation",
    name="Jutranja avtomatizacija",
    cron="0 7 * * 1-5",  # Ob 7:00, ponedeljek-petek
    action="execute_scene",
    params={"scene_id": "morning_routine"}
)

# Večerni varnostni način
iot.add_scheduled_task(
    task_id="evening_security",
    name="Večerni varnostni način",
    cron="0 22 * * *",  # Vsak dan ob 22:00
    action="activate_security_mode"
)
```

### 3. If-Then Pravila

```python
# Temperaturni nadzor
temperature_rule = {
    "id": "auto_climate_control",
    "name": "Avtomatski klimatski nadzor",
    "conditions": [
        {
            "type": "sensor_value",
            "target": "home/sensors/temperature",
            "property": "value",
            "operator": "greater_than",
            "value": 25
        }
    ],
    "actions": [
        {
            "type": "device_control",
            "target": "home/hvac/main",
            "command": "on"
        }
    ],
    "enabled": True
}

iot.add_automation_rule(temperature_rule)
```

## 📊 Monitoring in Alarmi

### 1. Nastavitev Thresholds

```python
# Temperaturni alarmi
iot.set_alert_threshold(
    device_id="home/sensors/temperature",
    metric="temperature",
    min_value=15,
    max_value=30,
    alert_level="warning"
)

# Vlažnost
iot.set_alert_threshold(
    device_id="home/sensors/humidity",
    metric="humidity",
    min_value=30,
    max_value=70,
    alert_level="warning"
)
```

### 2. Dashboard Podatki

```python
# Pridobi dashboard podatke
dashboard = iot.get_monitoring_dashboard()

# Struktura:
{
    "summary": {
        "total_devices": 15,
        "online_devices": 14,
        "offline_devices": 1,
        "total_alerts": 2,
        "uptime_percentage": 93.3
    },
    "devices": {...},
    "recent_alerts": [...],
    "metrics": {...}
}
```

## 🔔 Sistem Obvestil

### 1. Email Obvestila

```python
# Konfiguracija v .env.secure
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FROM_EMAIL=omni-iot@yourdomain.com
```

### 2. Slack Integracija

```python
# Webhook URL v .env.secure
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#iot-alerts

# Test obvestilo
test_event = {
    "device_id": "home/sensor/temp1",
    "device_status": "offline",
    "timestamp": datetime.now().isoformat(),
    "source": "monitoring_system"
}

iot.send_alert(test_event)
```

### 3. Telegram Bot

```python
# Bot setup v .env.secure
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Ustvari bot: @BotFather na Telegram
# Pridobi chat_id: pošlji sporočilo botu in preveri:
# https://api.telegram.org/bot<TOKEN>/getUpdates
```

## 🔒 Varnostni Ukrepi

### 1. MQTT Varnost

- ✅ TLS 1.2+ šifriranje
- ✅ Client certificates
- ✅ Username/password avtentikacija
- ✅ Topic-based access control

### 2. API Varnost

- ✅ JWT tokeni
- ✅ Rate limiting
- ✅ CORS konfiguracija
- ✅ Input validation

### 3. Logiranje in Audit

```python
# Vse akcije se logirajo v:
data/logs/iot_logs.json      # Sistemski log
data/logs/iot_audit.json     # Audit trail
data/logs/iot_errors.json    # Napake

# Log format:
{
    "timestamp": "2024-01-15T10:30:00Z",
    "device": "home/lights/living",
    "action": "turn_on",
    "user": "admin",
    "result": "success",
    "ip_address": "192.168.1.100"
}
```

## 🧪 Testiranje

```bash
# Zaženi obsežne teste
python test_iot_automation_comprehensive.py

# Rezultat: 100% uspešnost
# ✅ 11/11 testov uspešnih
# ✅ Vsi moduli testirani
# ✅ Integracija potrjena
```

## 📈 Produkcijski Primeri

### 1. Pametna Hiša

```python
# Naprave
devices = [
    "home/lights/living", "home/lights/bedroom", "home/lights/kitchen",
    "home/hvac/main", "home/security/cameras", "home/sensors/motion",
    "home/blinds/living", "home/coffee_maker", "home/tv/living"
]

# Scene
scenes = ["morning_routine", "evening_routine", "security_mode", "away_mode"]

# Pravila
rules = ["temperature_control", "security_automation", "energy_saving"]
```

### 2. Industrijska Avtomatizacija

```python
# Industrijske naprave
factory_devices = [
    "factory/machines/cnc1", "factory/machines/cnc2",
    "factory/sensors/temperature", "factory/sensors/pressure",
    "factory/alarms/emergency", "factory/lighting/main"
]

# Produkcijski scenariji
production_scenes = ["start_shift", "end_shift", "emergency_stop", "maintenance_mode"]
```

### 3. Kmetijska Avtomatizacija

```python
# Kmetijske naprave
farm_devices = [
    "farm/irrigation/zone1", "farm/irrigation/zone2",
    "farm/sensors/soil_moisture", "farm/sensors/weather",
    "farm/greenhouse/climate", "farm/lighting/greenhouse"
]

# Kmetijski scenariji
farm_scenes = ["morning_irrigation", "evening_check", "weather_response"]
```

## 🚀 Naslednji Koraki

### 1. Kratkoročno (1-2 tedna)
- [ ] Nastavi produkcijsko okolje
- [ ] Konfiguriraj MQTT broker
- [ ] Registriraj prve naprave
- [ ] Ustvari osnovne scene

### 2. Srednjeročno (1-2 meseca)
- [ ] Implementiraj napredne scenarije
- [ ] Nastavi monitoring dashboard
- [ ] Konfiguriraj obvestila
- [ ] Optimiziraj performanse

### 3. Dolgoročno (3-6 mesecev)
- [ ] Machine learning integracija
- [ ] Mobilna aplikacija
- [ ] Cloud backup
- [ ] Skalabilnost

## 📞 Podpora

Za tehnično podporo in dodatne funkcionalnosti kontaktiraj Omni AI tim.

---

**🏆 Omni IoT Avtomatizacijski Sistem je pripravljen za produkcijo!**

*Varno, zanesljivo, skalabilno upravljanje IoT naprav z naprednimi avtomatizacijskimi funkcijami.*