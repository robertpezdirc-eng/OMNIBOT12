# OmniCore Enterprise Platform - Deployment Guide

## 🚀 Pregled Platforme

OmniCore je popolna enterprise platforma za upravljanje poslovnih procesov z naslednjimi komponentami:

### Aktivne Storitve

1. **Cloud Infrastructure** (Port 8200)
   - Multi-region deployment
   - Mikroservisi arhitektura
   - Global monitoring
   - URL: http://localhost:8200

2. **Message Broker** (Port 8201)
   - Real-time event streaming
   - Multi-topic messaging
   - Asynchronous communication
   - URL: http://localhost:8201

3. **Enterprise Security** (Port 8202)
   - Multi-factor authentication (MFA)
   - Audit logging
   - GDPR compliance
   - URL: http://localhost:8202

4. **Multi-Tenant Database** (Port 8203)
   - Tenant isolation
   - Data classification
   - GDPR compliant storage
   - URL: http://localhost:8203

5. **Production Dashboard** (Port 8204)
   - Global monitoring
   - Real-time metrics
   - Service health checks
   - URL: http://localhost:8204

## 📋 Sistemske Zahteve

- Python 3.8+
- FastAPI
- Uvicorn
- aiohttp
- Ostale odvisnosti v requirements.txt

## 🔧 Namestitev

1. **Kloniraj repozitorij:**
   ```bash
   git clone <repository-url>
   cd omniscient-ai-platform
   ```

2. **Ustvari virtualno okolje:**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   source .venv/bin/activate  # Linux/Mac
   ```

3. **Namesti odvisnosti:**
   ```bash
   pip install -r requirements.txt
   pip install aiohttp  # Za production dashboard
   ```

## 🚀 Zagon Platforme

### Avtomatski Zagon Vseh Storitev

Zaženi vse storitve v ločenih terminalih:

```bash
# Terminal 1 - Cloud Infrastructure
python omni_cloud_infrastructure.py

# Terminal 2 - Message Broker
python omni_message_broker.py

# Terminal 3 - Enterprise Security
python omni_enterprise_security.py

# Terminal 4 - Multi-Tenant Database
python omni_multi_tenant_database.py

# Terminal 5 - Production Dashboard
python omni_production_dashboard.py
```

### Preverjanje Statusa

Odpri production dashboard: http://localhost:8204

Dashboard prikazuje:
- Status vseh storitev
- Real-time metrike
- Alarmi in opozorila
- Globalne performanse

## 🔍 API Endpoints

### Cloud Infrastructure (8200)
- `GET /health` - Health check
- `GET /regions` - Seznam regij
- `GET /services` - Aktivne storitve
- `GET /metrics` - Sistemske metrike

### Message Broker (8201)
- `POST /publish` - Objavi sporočilo
- `GET /topics` - Seznam tem
- `GET /metrics` - Broker metrike

### Enterprise Security (8202)
- `POST /auth/login` - Prijava
- `POST /auth/mfa` - MFA verifikacija
- `GET /audit` - Audit logi
- `GET /compliance` - GDPR status

### Multi-Tenant Database (8203)
- `POST /tenants` - Ustvari tenant
- `GET /tenants/{id}/data` - Podatki tenanta
- `GET /tenants/{id}/metrics` - Metrike tenanta
- `GET /audit` - Audit logi

### Production Dashboard (8204)
- `GET /` - Dashboard UI
- `GET /api/services` - Status storitev
- `GET /api/metrics` - Globalne metrike
- `WebSocket /ws` - Real-time posodobitve

## 🔐 Varnost

### Avtentikacija
- JWT tokeni za API dostop
- MFA za administratorje
- Session management

### Podatki
- Šifriranje občutljivih podatkov
- Tenant isolation
- GDPR compliance
- Audit logging

## 📊 Monitoring

### Metrike
- CPU in RAM uporaba
- Network promet
- Database performanse
- API response times

### Alarmi
- Service downtime
- High resource usage
- Security incidents
- Performance degradation

## 🛠️ Vzdrževanje

### Backup
- Avtomatski backup podatkov
- Configuration backup
- Log rotation

### Updates
- Rolling updates
- Zero-downtime deployment
- Health checks

## 🐛 Troubleshooting

### Pogosti Problemi

1. **Port že v uporabi:**
   ```bash
   netstat -ano | findstr :8200
   taskkill /PID <PID> /F
   ```

2. **Moduli manjkajo:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Storitev ne odgovarja:**
   - Preveri loge v terminalu
   - Preveri production dashboard
   - Restartaj storitev

### Logi
- Vsaka storitev ima svoje loge
- Production dashboard zbira vse loge
- Audit logi v enterprise security

## 📞 Podpora

Za tehnično podporo:
- Preveri production dashboard
- Preglej loge storitev
- Kontaktiraj sistem administrator

## 🔄 Nadgradnje

Platforma podpira:
- Hot reload za development
- Rolling updates za production
- Backward compatibility
- Migration scripts

---

**OmniCore Enterprise Platform v1.0**
*Popolna rešitev za enterprise upravljanje*