# 🚀 OMNIBOT12 - Hitri Pregled

**Za podrobno dokumentacijo glejte:** [PROJECT_FUNCTIONALITY.md](./PROJECT_FUNCTIONALITY.md)

---

## 📌 Kaj je OMNIBOT12?

OMNIBOT12 je **univerzalna AI platforma**, ki združuje več avtonomnih sistemov v en celovit ekosistem. 

**Slogan:** *"Ena aplikacija za vse. Nadomesti vse ostale. Jo potrebuje vsak."*

---

## 🎯 Glavne Komponente

### 1. **Omni Ultimate Turbo Flow System** - Licenčni Sistem
- Admin panel za upravljanje licenc
- Client panel z avtomatskim preverjanjem
- Real-time WebSocket posodobitve
- Demo, Basic, Premium paketi

### 2. **THEA Advanced Queue System** - Upravljanje Opravil
- Auto-shranjevanje promptov
- Sekvenčna obdelava ("OBDELATI NAJ ZDALEČE")
- Merge rezultatov ("ZDruži vse skupaj")
- SQLite persistent storage

### 3. **Omni Global Deploy** - Production Ready
- Docker Compose deployment
- SSL/TLS varnost
- Nginx reverse proxy
- MongoDB baza podatkov

### 4. **Omni Brain Maxi Ultra** - AI Orchestration
- Multi-agent sistem
- Intelligent task distribution
- Learning optimization
- Adaptive behavior

---

## 🎪 Moduli

### Poslovni Moduli
- 💰 **Finance**: Transakcije, proračuni, poročila
- 🏖️ **Tourism**: Rezervacije, itinerarji, aktivnosti
- ⚙️ **DevOps**: Projekti, CI/CD, monitoring
- 🏥 **Healthcare**: EHR, telemedicina, wellness

### AI & Avtomatizacija
- 🤖 **Angel System**: Multi-agent orchestration
- 🧠 **Adaptive Learning**: User behavior analysis
- 📊 **Analytics**: Predictive modeling
- 🔄 **Automation**: RPA, workflow management

### IoT & Industry
- 🏭 **Industrial Automation**: Proizvodni sistemi
- 🚗 **Fleet Management**: Transport optimization
- 🔋 **EV Charging**: Smart charging stations
- 🚦 **Smart City**: Traffic optimization

---

## 💻 Quick Start

```bash
# 1. Kloniraj repozitorij
git clone https://github.com/robertpezdirc-eng/OMNIBOT12.git
cd OMNIBOT12

# 2. Namesti odvisnosti
npm install

# 3. Konfiguriraj
cp .env.example .env

# 4. Zaženi z Docker
docker-compose up -d

# 5. Dostop
# Admin: https://localhost:4000
# API: https://localhost:3000/api
```

---

## 🔗 Integracije

- **GitHub**: Repository sync, issue tracking
- **Google**: Drive, Calendar, Gmail, Maps
- **Cloud**: AWS, Azure, GCP, DigitalOcean
- **Payment**: Stripe, PayPal, Crypto
- **IoT**: MQTT, CoAP, Zigbee, LoRaWAN

---

## 🏗️ Arhitektura (Poenostavljena)

```
┌─────────────────────────────────┐
│    Admin/Client Panels          │
└──────────────┬──────────────────┘
               │
       ┌───────▼────────┐
       │  API Gateway   │
       │  (Express.js)  │
       └───────┬────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│MongoDB│ │ Redis │ │SQLite │
└───────┘ └───────┘ └───────┘
```

---

## 📊 Tehnologije

**Backend:**
- Node.js 18+ (Express.js)
- Python 3.9+ (FastAPI)
- MongoDB 6.0+
- Redis 7.x

**Frontend:**
- Vanilla JS + Progressive Enhancement
- CSS3 + Custom Properties
- PWA (Service Workers)

**DevOps:**
- Docker & Docker Compose
- Nginx
- SSL/TLS (Let's Encrypt)
- GitHub Actions

---

## 📖 Primeri Uporabe

### API - Kreiranje License
```javascript
const response = await fetch('https://api.omnibot.com/api/licenses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client_id: 'client_123',
    plan: 'premium',
    duration_days: 365
  })
});
```

### THEA - Queue Processing
```python
from thea_advanced_queue_system import TheaAdvancedQueueSystem

thea = TheaAdvancedQueueSystem()
thea.add_prompt("Analiziraj prodajne podatke")
result = thea.process_queue_sequential()
merged = thea.merge_all_results()
```

### IoT - Device Control
```javascript
iot.subscribe('sensors/temperature', (data) => {
  if (data.value > 30) {
    iot.sendAlert('High temperature!');
  }
});
```

---

## 🔒 Varnost

- ✅ JWT Authentication
- ✅ 2FA (Two-factor)
- ✅ SSL/TLS encryption
- ✅ Rate limiting
- ✅ RBAC (Role-based access)
- ✅ bcrypt password hashing
- ✅ Security headers (Helmet)

---

## 📈 Statistika

- **500+ datotek** v projektu
- **150,000+ vrstic kode**
- **50+ poslovnih področij**
- **20+ integracij**
- **10+ deployment opcij**
- **105+ MD dokumentov**

---

## 🎯 Use Cases

### Podjetje
- Projektno vodenje
- CRM in marketing
- Finančno načrtovanje
- DevOps avtomatizacija

### Proizvodni Obrat
- IoT monitoring
- Preventivno vzdrževanje
- Supply chain optimization
- Quality control AI

### Samostojni Podjetnik
- Osebne finance
- Task management
- Time tracking
- Invoice creation

---

## 📞 Podporne Datoteke

| Dokument | Opis |
|----------|------|
| [PROJECT_FUNCTIONALITY.md](./PROJECT_FUNCTIONALITY.md) | Celotna dokumentacija (955 vrstic) |
| [README.md](./README.md) | Glavni README z navodili |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | API dokumentacija |
| [THEA_SYSTEM_DOCUMENTATION.md](./THEA_SYSTEM_DOCUMENTATION.md) | THEA dokumentacija |
| [omniversal-concept.md](./omniversal-concept.md) | OMNIVERSAL koncept |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment navodila |
| [SECURITY.md](./SECURITY.md) | Varnostne prakse |

---

## 🚀 Roadmap

### 2024 Q4 ✅
- Omni Brain sistem
- THEA Queue v2.0
- Licenčni sistem

### 2025 Q1 🔄
- Mobile aplikacije
- Voice interface
- Advanced AI

### 2025 Q2+ 📋
- Blockchain integration
- AR/VR interfaces
- AGI capabilities
- Global expansion

---

## 🤝 Kontakt

- **GitHub**: https://github.com/robertpezdirc-eng/OMNIBOT12
- **Issues**: https://github.com/robertpezdirc-eng/OMNIBOT12/issues
- **Email**: support@omnibot.com
- **Licenca**: MIT

---

**OMNIBOT12** 🚀 - *Kjer se inteligenca sreča s praktičnostjo*

*Zadnja posodobitev: 31. oktober 2024*
