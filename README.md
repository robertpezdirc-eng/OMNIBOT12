# 🚀 Omni Ultimate Turbo Flow System v2.0.0

[![CI/CD Pipeline](https://github.com/robertpezdirc-eng/OMNIBOT12/actions/workflows/blank.yml/badge.svg)](https://github.com/robertpezdirc-eng/OMNIBOT12/actions/workflows/blank.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Popolnoma avtomatiziran licenčni sistem z real-time funkcionalnostjo in naprednimi varnostnimi funkcijami.**

## 📋 Kazalo

- [🎯 Pregled Sistema](#-pregled-sistema)
- [🏗️ Arhitektura](#️-arhitektura)
- [🚀 Hitra Namestitev](#-hitra-namestitev)
- [📦 Komponente](#-komponente)
- [🔧 Konfiguracija](#-konfiguracija)
- [🧪 Testiranje](#-testiranje)
- [📡 API Dokumentacija](#-api-dokumentacija)
- [🌐 WebSocket Eventi](#-websocket-eventi)
- [🐳 Docker Deployment](#-docker-deployment)
- [🛠️ Razvoj](#️-razvoj)
- [📊 Monitoring](#-monitoring)
- [🔒 Varnost](#-varnost)
- [❓ Pogosta Vprašanja](#-pogosta-vprašanja)

## 🎯 Pregled Sistema

Omni Ultimate Turbo Flow System je **popolnoma avtomatiziran licenčni sistem** z real-time funkcionalnostjo, ki omogoča:

### ✨ Ključne Funkcionalnosti

- **🔐 Napredni Licenčni Sistem**: Demo, Basic, Premium licence z avtomatskim upravljanjem
- **⚡ Real-time Posodobitve**: WebSocket integracija za takojšnje posodobitve
- **🎛️ Administratorski Panel**: Popoln nadzor nad licencami in uporabniki
- **📱 Odjemalski Panel**: Avtomatsko preverjanje in dinamično odklepanje modulov
- **🐳 Docker Ready**: Kompletna kontejnerizacija z enim klikom
- **🧪 Avtomatizirani Testi**: Obsežna testna pokritost za vse komponente
- **📊 Monitoring**: Vgrajeni health checks in performance metrike

### 🎪 Podporni Tipi Licenc

| Tip | Funkcionalnosti | Trajanje | Cena |
|-----|------------------|----------|------|
| **Demo** | Osnovne funkcije, omejeno | 7 dni | Brezplačno |
| **Basic** | Standardne funkcije | 30 dni | €29/mesec |
| **Premium** | Vse funkcije + podpora | 365 dni | €99/mesec |

## 🏗️ Arhitektura

```
┌─────────────────────────────────────────────────────────────┐
│                    OMNI ULTIMATE SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│  🎛️ Admin Panel     │  📱 Client Panel    │  📡 API Layer  │
│  ├─ License Mgmt    │  ├─ Auto Check      │  ├─ REST API   │
│  ├─ User Control    │  ├─ Module Toggle   │  ├─ JWT Auth   │
│  └─ Analytics       │  └─ Offline Mode    │  └─ Rate Limit │
├─────────────────────────────────────────────────────────────┤
│              🌐 WebSocket Layer (Socket.IO)                 │
│              ├─ Real-time Updates                           │
│              ├─ Room Management                             │
│              └─ Heartbeat System                            │
├─────────────────────────────────────────────────────────────┤
│  💾 MongoDB          │  🔄 Redis Cache     │  📊 Monitoring │
│  ├─ License Data     │  ├─ Session Store   │  ├─ Health     │
│  ├─ User Profiles    │  ├─ Rate Limiting   │  ├─ Metrics    │
│  └─ Audit Logs      │  └─ Temp Data       │  └─ Alerts     │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Hitra Namestitev

### Predpogoji

- **Node.js 18+** ([Prenesi](https://nodejs.org/))
- **MongoDB 6.0+** ([Prenesi](https://www.mongodb.com/try/download/community))
- **Docker & Docker Compose** ([Prenesi](https://www.docker.com/get-started))
- **Git** ([Prenesi](https://git-scm.com/))

### 1. Kloniraj Repozitorij
```bash
git clone https://github.com/your-username/omni-ai-platform.git
cd omni-ai-platform
```

### 2. Namesti Python Odvisnosti
```bash
# Ustvari virtualno okolje
python -m venv omni-env

# Aktiviraj virtualno okolje
# Windows:
omni-env\Scripts\activate
# Linux/Mac:
source omni-env/bin/activate

# Namesti pakete
pip install -r requirements.txt
```

### 3. Konfiguriraj Sistem
```bash
# Kopiraj in uredi konfiguracijo
cp config.json config-local.json
# Uredi config-local.json z vašimi nastavitvami
```

### 4. Zaženi Omni
```bash
# Interaktivni način
python omni.py

# Z debug informacijami
python omni.py --debug

# Web vmesnik (kmalu)
python omni.py --web
```

## 📋 Uporaba

### Interaktivni Način
```
🚀 OMNI AI - Interaktivni način
============================================================
Ukazi:
  help     - Prikaži pomoč
  status   - Prikaži status sistema
  modules  - Prikaži registrirane module
  finance  - Finančni modul
  tourism  - Turizem modul
  devops   - DevOps modul
  github   - GitHub integracija
  quit     - Izhod
------------------------------------------------------------

🤖 Omni> dodaj transakcijo 150 EUR za kosilo
💭 Transakcija uspešno dodana: 150 EUR - kosilo (kategorija: hrana)

🤖 Omni> ustvari itinerar za Bled 3 dni
💭 Itinerar za Bled (3 dni):
   Dan 1: Blejski grad, vožnja s pletno
   Dan 2: Vintgar, pohodništvo
   Dan 3: Bohinj, jezero
```

### Primeri Ukazov

#### 💰 Finance
```bash
🤖 Omni> finance
1. Dodaj transakcijo
2. Prikaži proračun
3. Mesečno poročilo

# Direktni ukazi:
🤖 Omni> dodaj transakcijo 50 EUR za gorivo
🤖 Omni> prikaži proračun
🤖 Omni> mesečno poročilo
```

#### 🏖️ Turizem
```bash
🤖 Omni> tourism
1. Dodaj nastanitev
2. Ustvari itinerar
3. Prikaži aktivnosti

# Direktni ukazi:
🤖 Omni> dodaj nastanitev Hotel Bled v Bled za 120 EUR
🤖 Omni> ustvari itinerar za Ljubljana 2 dni
🤖 Omni> prikaži aktivnosti za Portorož
```

#### ⚙️ DevOps
```bash
🤖 Omni> devops
1. Dodaj projekt
2. Prikaži projekte
3. Sistem metriki

# Direktni ukazi:
🤖 Omni> dodaj projekt Omni AI z opisom "Univerzalni AI pomočnik"
🤖 Omni> prikaži projekte
🤖 Omni> sistem metriki
```

#### 🐙 GitHub
```bash
🤖 Omni> github
1. Prikaži repozitorije
2. Sinhroniziraj vse
3. Analitika repozitorija

# Direktni ukazi:
🤖 Omni> sinhroniziraj GitHub repozitorije
🤖 Omni> prikaži GitHub analitiko za omni-ai-platform
```

## ⚙️ Konfiguracija

### config.json
```json
{
  "debug": true,
  "modules": {
    "finance": {"enabled": true, "currency": "EUR"},
    "tourism": {"enabled": true, "default_language": "sl"},
    "devops": {"enabled": true, "auto_deploy": false}
  },
  "integrations": {
    "github": {
      "enabled": false,
      "token": "your_github_token_here",
      "auto_sync": false
    }
  },
  "ui": {
    "web_port": 8080,
    "voice_enabled": false,
    "language": "sl"
  }
}
```

### GitHub Integracija
1. Pojdite na GitHub Settings > Developer settings > Personal access tokens
2. Generirajte nov token z ustreznimi pravicami:
   - `repo` (za dostop do repozitorijev)
   - `user` (za uporabniške informacije)
   - `admin:repo_hook` (za webhook-e)
3. Dodajte token v `config.json`:
```json
{
  "integrations": {
    "github": {
      "enabled": true,
      "token": "ghp_your_token_here",
      "auto_sync": true
    }
  }
}
```

## 🏗️ Arhitektura

### Projektna Struktura
```
omni-ai-platform/
├── omni.py                 # Glavni vstopni program
├── config.json            # Konfiguracija
├── requirements.txt       # Python odvisnosti
├── omni/                  # Glavni Omni sistem
│   ├── core/             # Jedro sistema
│   │   ├── engine.py     # OmniCore engine
│   │   ├── nlp/          # Naravni jezik
│   │   ├── memory/       # Spomin
│   │   ├── learning/     # Učenje
│   │   └── reasoning/    # Sklepanje
│   ├── modules/          # Funkcijski moduli
│   │   ├── finance/      # Finančni modul
│   │   ├── tourism/      # Turizem modul
│   │   ├── devops/       # DevOps modul
│   │   ├── healthcare/   # Zdravstvo (kmalu)
│   │   └── art/          # Umetnost (kmalu)
│   ├── integrations/     # Zunanje integracije
│   │   ├── github/       # GitHub API
│   │   ├── google/       # Google API-ji
│   │   ├── slack_discord/ # Komunikacija
│   │   └── payment/      # Plačila
│   ├── ui/               # Uporabniški vmesniki
│   │   ├── web/          # Spletni vmesnik
│   │   ├── mobile/       # Mobilni vmesnik
│   │   └── voice/        # Glasovni vmesnik
│   ├── network/          # Omrežje
│   │   ├── sync/         # Sinhronizacija
│   │   └── security/     # Varnost
│   └── data/             # Podatki
│       ├── vector/       # Vektorska baza
│       ├── users/        # Uporabniški podatki
│       └── logs/         # Dnevniki
```

### Plug & Play Moduli
Vsak modul implementira `OmniModule` interface:
```python
class MyCustomModule(OmniModule):
    def __init__(self):
        super().__init__("my_module", "1.0.0")
    
    def process_input(self, user_input: str) -> str:
        # Vaša logika
        return "Odgovor"
    
    def get_capabilities(self) -> List[str]:
        return ["capability1", "capability2"]
```

## 🔧 Razvoj

### Dodajanje Novega Modula
1. Ustvarite novo mapo v `omni/modules/your_module/`
2. Implementirajte `YourModule` razred
3. Dodajte v `omni/modules/__init__.py`
4. Registrirajte v `omni.py`

### Dodajanje Nove Integracije
1. Ustvarite novo mapo v `omni/integrations/your_service/`
2. Implementirajte API wrapper
3. Dodajte konfiguracijo v `config.json`
4. Registrirajte v `omni.py`

### Testiranje
```bash
# Zaženi vse teste
python -m pytest

# Specifičen modul
python -m pytest omni/modules/finance/tests/

# Z pokritostjo
python -m pytest --cov=omni
```

## 📊 Področja Uporabe

### 🏢 Podjetja
- **Finančno upravljanje**: Avtomatizacija računovodstva
- **Projektno vodenje**: DevOps in CI/CD
- **Komunikacija**: Slack/Discord integracije
- **Analitika**: Poslovni insights

### 🏨 Turizem & Gostinstvo
- **Rezervacije**: Avtomatski booking sistemi
- **Itinerarji**: Personalizirani načrti
- **Marketing**: Social media kampanje
- **Analitika**: Obiskanost in prihodki

### 👤 Posamezniki
- **Osebne finance**: Proračuni in investicije
- **Potovanja**: Načrtovanje in rezervacije
- **Produktivnost**: Avtomatizacija nalog
- **Učenje**: Personalizirani programi

### 🏥 Zdravstvo (kmalu)
- **Wellness načrti**: Prehrana in vadba
- **Preventiva**: Zdravstveni pregledi
- **Analitika**: Zdravstveni podatki
- **Telemedicina**: Oddaljene konzultacije

## 🛣️ Roadmap

### v1.1 (Q2 2024)
- ✅ Osnovni moduli (finance, tourism, devops)
- ✅ GitHub integracija
- ✅ Interaktivni terminal
- 🔄 Web vmesnik
- 🔄 Google integracije

### v1.2 (Q3 2024)
- 📋 Glasovni vmesnik
- 📋 Mobilna aplikacija
- 📋 Slack/Discord integracije
- 📋 Plačilni sistemi

### v1.3 (Q4 2024)
- 📋 Zdravstveni modul
- 📋 Umetnostni modul
- 📋 Omni Network (P2P)
- 📋 Advanced AI modeli

### v2.0 (2025)
- 📋 Enterprise funkcionalnosti
- 📋 Multi-tenant arhitektura
- 📋 Cloud deployment
- 📋 API marketplace

## 🤝 Prispevanje

Dobrodošli so prispevki! Prosimo sledite tem korakom:

1. Fork repozitorija
2. Ustvarite feature branch (`git checkout -b feature/amazing-feature`)
3. Commit spremembe (`git commit -m 'Add amazing feature'`)
4. Push na branch (`git push origin feature/amazing-feature`)
5. Odprite Pull Request

### Smernice za Prispevanje
- Sledite obstoječemu code style
- Dodajte teste za nove funkcionalnosti
- Posodobite dokumentacijo
- Preverite, da vsi testi prehajajo

## 📄 Licenca

Ta projekt je licenciran pod MIT licenco - glejte [LICENSE](LICENSE) datoteko za podrobnosti.

## 🆘 Podpora

### Dokumentacija
- [Wiki](https://github.com/your-username/omni-ai-platform/wiki)
- [API Reference](https://docs.omni-ai.com)
- [Video Tutorials](https://youtube.com/omni-ai)

### Skupnost
- [Discord Server](https://discord.gg/omni-ai)
- [GitHub Discussions](https://github.com/your-username/omni-ai-platform/discussions)
- [Reddit Community](https://reddit.com/r/omni-ai)

### Kontakt
- Email: support@omni-ai.com
- Twitter: [@OmniAI_Platform](https://twitter.com/OmniAI_Platform)
- LinkedIn: [Omni AI](https://linkedin.com/company/omni-ai)

## 🙏 Zahvale

Posebna zahvala vsem prispevateljem in skupnosti, ki omogoča razvoj Omni AI platforme.

---

**Omni AI - Kjer se inteligenca sreča s praktičnostjo** 🚀

*Izdelano z ❤️ za boljši jutri*