# 🤖 THEA ADVANCED QUEUE SYSTEM v2.0

## 📋 Pregled Sistema

**Thea Advanced Queue System** implementira "Auto Queue + Merge on Demand" funkcionalnost, ki omogoča:

1️⃣ **Auto-shranjevanje promptov** - Vsi novi prompti se avtomatsko shranijo v queue kot "pending"  
2️⃣ **Sekvenčna obdelava** - Ukaz "OBDELATI NAJ ZDALEČE" obdela prompte po vrsti  
3️⃣ **Merge on demand** - Ukaz "ZDruži vse skupaj" združi vse rezultate v globalen output  
4️⃣ **Lazy loading** - Naloži le potrebne vire za vsak prompt  
5️⃣ **Persistent storage** - SQLite baza za trajno shranjevanje  

## 🗂️ Struktura Datotek

```
📁 Thea System/
├── 🐍 thea_advanced_queue_system.py    # Glavni queue sistem
├── 🎮 thea_command_interface.py        # Command interface
├── 🧪 test_thea_system.py             # Test skripta
├── 📄 THEA_SYSTEM_DOCUMENTATION.md    # Ta dokumentacija
├── 🗄️ thea_advanced_queue.db          # SQLite baza (avtomatsko)
└── 📊 thea_*_results_*.txt/json       # Izvoženi rezultati
```

## 🚀 Hitri Začetek

### 1. Zagon Test Sistema
```bash
python test_thea_system.py
```

### 2. Interaktivni Vmesnik
```bash
python thea_command_interface.py
```

### 3. Command Line Uporaba
```bash
python thea_command_interface.py "dodaj Analiziraj prodajne podatke"
python thea_command_interface.py "OBDELATI NAJ ZDALEČE"
python thea_command_interface.py "ZDruži vse skupaj"
```

## 🎯 Glavni Ukazi (iz Specifikacije)

### 🔄 "OBDELATI NAJ ZDALEČE" / "po vrsti"
- Obdela vse pending prompte sekvenčno
- Lazy loading potrebnih virov
- Shrani rezultate v bazo
- Označi prompte kot "done"

### 🎯 "ZDruži vse skupaj"
- Pobere vse done rezultate
- Ustvari konsolidiran globalen output
- Shrani merged rezultat v datoteko
- Označi prompte kot "merged"

## 🎮 Command Interface Ukazi

| Ukaz | Kratka | Opis |
|------|--------|------|
| `OBDELATI NAJ ZDALEČE` | `p` | Sekvenčna obdelava queue |
| `ZDruži vse skupaj` | `m` | Merge vseh rezultatov |
| `status` | `s` | Prikaži status queue |
| `dodaj [tekst]` | `d` | Dodaj nov prompt |
| `počisti` | - | Počisti queue |
| `izvozi` | - | Izvozi rezultate v JSON |
| `statistike` | - | Prikaži sistemske statistike |
| `pomoč` | `h` | Prikaži pomoč |
| `exit` | `q` | Izhod iz vmesnika |

## 🔧 Programski API

### Osnovni Workflow

```python
from thea_advanced_queue_system import TheaAdvancedQueueSystem, Priority

# Inicializacija
thea = TheaAdvancedQueueSystem()

# 1️⃣ Auto-shranjevanje promptov
prompt_id = thea.add_prompt("Analiziraj prodajne podatke", Priority.HIGH)

# 2️⃣ Sekvenčna obdelava
result = thea.process_queue_sequential()

# 3️⃣ Merge on demand
merged = thea.merge_all_results()
```

### Napredne Funkcije

```python
# Status queue
status = thea.get_queue_status()

# Statistike
stats = thea.get_stats()

# Izvoz rezultatov
filename = thea.export_results("json")

# Počisti queue
thea.clear_queue(PromptStatus.DONE)
```

## 🏗️ Arhitektura Sistema

### 📊 Podatkovni Model

```python
@dataclass
class PromptItem:
    id: str                    # Unikaten ID
    content: str              # Vsebina prompta
    status: PromptStatus      # pending/processing/done/error/merged
    priority: Priority        # LOW/MEDIUM/HIGH/CRITICAL
    timestamp: float          # Čas dodajanja
    metadata: Dict           # Dodatni podatki
    result: str              # Rezultat obdelave
    processing_time: float   # Čas obdelave
    resources_loaded: List   # Naloženi viri
```

### 🔄 Lazy Loading Engine

Sistem avtomatsko zazna potrebne vire na podlagi vsebine prompta:

- **Analytics** → ključne besede: analiza, podatki, statistika
- **Finance** → ključne besede: finance, denar, proračun  
- **Tourism** → ključne besede: turizem, potovanje, hotel
- **IoT** → ključne besede: iot, senzor, naprava

### 🗄️ Persistent Storage

SQLite baza z tabelami:
- `prompt_queue` - Glavni queue
- `merge_history` - Zgodovina merge operacij
- `system_stats` - Sistemske statistike

## 📈 Monitoring in Statistike

### Ključne Metrike
- **Skupaj promptov** - Vsi dodani prompti
- **Obdelanih promptov** - Uspešno obdelani
- **Neuspešnih promptov** - Napake pri obdelavi
- **Merge operacij** - Število merge operacij
- **Cache učinkovitost** - Hit/miss ratio
- **Uspešnost** - % uspešno obdelanih

### Performance Optimizacije
- **Resource caching** - Zmanjša ponovne nalaganja
- **Lazy loading** - Naloži le potrebne vire
- **SQLite indexing** - Hitrejše poizvedbe
- **Memory management** - Optimalna poraba RAM

## 🛠️ Konfiguracija

### Sistemske Nastavitve

```python
# Custom storage path
thea = TheaAdvancedQueueSystem("custom_queue.db")

# Custom metadata
metadata = {
    'department': 'finance',
    'project': 'Q4_analysis',
    'priority_boost': True
}
```

### Logging Konfiguracija

Sistem uporablja Python logging z:
- **Console output** - Realni čas
- **File logging** - `thea_advanced_queue.log`
- **Različni leveli** - INFO, ERROR, DEBUG

## 🧪 Testiranje

### Avtomatski Testi
```bash
python test_thea_system.py
```

Testi pokrivajo:
- ✅ Inicializacijo sistema
- ✅ Dodajanje promptov
- ✅ Sekvenčno obdelavo
- ✅ Merge funkcionalnost
- ✅ Command interface
- ✅ Demo workflow

### Ročno Testiranje
```bash
# Interaktivni način
python thea_command_interface.py

# Dodaj teste prompte
Thea> dodaj Test prompt za analizo
Thea> dodaj Finančno poročilo za Q4
Thea> OBDELATI NAJ ZDALEČE
Thea> ZDruži vse skupaj
```

## 🔒 Varnost in Zanesljivost

### Varnostne Funkcije
- **Input validation** - Preverjanje vhodnih podatkov
- **Error handling** - Graceful error recovery
- **Transaction safety** - SQLite ACID lastnosti
- **Resource limits** - Preprečevanje memory leaks

### Backup in Recovery
- **Persistent storage** - Podatki preživijo restart
- **Export funkcionalnost** - JSON/TXT backup
- **Queue recovery** - Avtomatski reload ob zagonu

## 📊 Primeri Uporabe

### 1. Poslovni Workflow
```python
# Dodaj poslovne naloge
thea.add_prompt("Pripravi mesečno poročilo", Priority.HIGH)
thea.add_prompt("Analiziraj konkurenco", Priority.MEDIUM)
thea.add_prompt("Optimiziraj marketing", Priority.LOW)

# Obdelaj vse naenkrat
thea.process_queue_sequential()

# Združi v poročilo
merged = thea.merge_all_results()
```

### 2. Analitični Pipeline
```python
# Dodaj analitične naloge
analytics_prompts = [
    "Analiziraj uporabniške podatke",
    "Generiraj KPI dashboard", 
    "Pripravi trend analizo"
]

for prompt in analytics_prompts:
    thea.add_prompt(prompt, Priority.HIGH)

# Batch processing
thea.process_queue_sequential()
```

### 3. IoT Monitoring
```python
# IoT naloge
iot_tasks = [
    "Preveri senzorje temperature",
    "Analiziraj energetsko porabo",
    "Generiraj alert poročilo"
]

for task in iot_tasks:
    thea.add_prompt(task, Priority.CRITICAL)
```

## 🚨 Troubleshooting

### Pogoste Napake

**1. UnicodeEncodeError pri logging**
```python
# Rešitev: Nastavi UTF-8 encoding
import os
os.environ['PYTHONIOENCODING'] = 'utf-8'
```

**2. SQLite locked database**
```python
# Rešitev: Počakaj in poskusi ponovno
import time
time.sleep(0.1)
```

**3. Memory issues pri velikih queue**
```python
# Rešitev: Počisti stare rezultate
thea.clear_queue(PromptStatus.MERGED)
```

### Debug Nastavitve
```python
import logging
logging.getLogger('TheaAdvancedQueue').setLevel(logging.DEBUG)
```

## 🔮 Prihodnje Izboljšave

### Načrtovane Funkcionalnosti
- 🌐 **Web interface** - Browser-based UI
- 🔄 **Real-time updates** - WebSocket notifications  
- 📱 **Mobile app** - iOS/Android companion
- 🤖 **AI optimization** - Smart priority adjustment
- ☁️ **Cloud sync** - Multi-device synchronization
- 📊 **Advanced analytics** - Detailed performance metrics

### Skalabilnost
- **Multi-threading** - Paralelna obdelava
- **Distributed processing** - Cluster support
- **Load balancing** - Optimalna porazdelitev
- **Horizontal scaling** - Multiple instances

## 📞 Podpora

### Dokumentacija
- 📖 **API Reference** - Podrobna dokumentacija funkcij
- 🎥 **Video tutorials** - Korak-za-korakom navodila
- 💡 **Best practices** - Priporočila za uporabo

### Skupnost
- 💬 **Discord server** - Realni čas podpora
- 📧 **Email support** - Tehnična pomoč
- 🐛 **Issue tracker** - Bug reports in feature requests

---

## 🎉 Zaključek

**Thea Advanced Queue System v2.0** uspešno implementira zahtevano "Auto Queue + Merge on Demand" funkcionalnost z naprednimi optimizacijami za:

✅ **Avtomatsko shranjevanje** promptov  
✅ **Sekvenčno obdelavo** po ukazu  
✅ **Merge on demand** funkcionalnost  
✅ **Lazy loading** virov  
✅ **Persistent storage** z SQLite  
✅ **Command interface** za enostavno uporabo  
✅ **Comprehensive testing** z demo workflow  

Sistem je pripravljen za produkcijsko uporabo in lahko obravnava kompleksne poslovne workflow z optimalno porabo sistemskih virov.

**🚀 Za začetek uporabe zaženite:**
```bash
python thea_command_interface.py
```

---
*Thea Advanced Queue System v2.0 - Implementirano z ❤️ za optimalno produktivnost*