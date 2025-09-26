# 🚀 OmniCore Global Platform

**Univerzalna AI-powered poslovna platforma za podjetja vseh velikosti**

## 📋 Pregled

OmniCore Global je napredna, multi-tenant poslovna platforma, ki združuje:
- **AI Router** za inteligentno usmerjanje zahtevkov
- **Multi-tenant arhitekturo** za ločevanje podatkov med podjetji
- **Real-time WebSocket komunikacijo** za dashboard posodobitve
- **Modularen sistem** za različne poslovne domene
- **Docker deployment** za enostavno namestitev

## 🏗️ Arhitektura

```
OmniCore-Global/
├── backend/           # FastAPI backend z AI Router
├── frontend/          # Moderniziran web interface
├── docker-compose.yml # Celotna platforma
├── deployment/        # Deployment skripte
└── docs/             # Dokumentacija
```

## 🎯 Moduli

### 💰 Finance
- Dashboard s prihodki, stroški, profitom
- Transakcijski pregled
- Finančne analize in poročila

### 📊 Analytics
- Real-time statistike
- KPI dashboard
- Uspešnost modulov

### ✅ Task Management
- Upravljanje nalog
- Projektno vodenje
- Sledenje napredka

### 🚚 Logistics
- Upravljanje pošiljk
- Optimizacija poti
- Sledenje dostav

### 🏥 Healthcare
- Upravljanje pacientov
- Medicinski zapisi
- Zdravstvene analize

### 🌍 Tourism
- Upravljanje rezervacij
- Turistični paketi
- Lokalne aktivnosti

## 🚀 Hitra namestitev

### Predpogoji
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+ (za development)

### 1. Docker Deployment (Priporočeno)

```bash
# Kloniraj projekt
git clone <repository-url>
cd OmniCore-Global

# Zaženi celotno platformo
docker-compose up -d

# Preveri status
docker-compose ps
```

**Dostopne URL-je:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090

### 2. Lokalni development

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload

# Frontend (v novem terminalu)
cd frontend
# Odpri index.html v brskalniku ali uporabi live server
```

## 🔧 Konfiguracija

### Environment spremenljivke

Ustvari `.env` datoteko v root mapi:

```env
# Database
DATABASE_URL=postgresql://omnicore:password@localhost:5432/omnicore_global
REDIS_URL=redis://:password@localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here
API_KEY_HEADER=X-API-Key

# CORS
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Environment
ENVIRONMENT=production
DEBUG=false
```

### Multi-tenant setup

```python
# Ustvari novega tenant-a
POST /tenants/create
{
    "name": "Moje Podjetje",
    "domain": "mojepodjetje.com"
}

# Odgovor vsebuje API ključ za avtentifikacijo
{
    "tenant_id": "uuid",
    "api_key": "your-api-key"
}
```

## 🔐 Varnost

### API Avtentifikacija
```bash
# Uporabi API ključ v header-ju
curl -H "X-API-Key: your-api-key" http://localhost:8000/status
```

### Multi-tenant izolacija
- Vsak tenant ima svoje podatke
- Ločene baze za različne domene
- API ključi za avtentifikacijo

## 📊 Monitoring

### Grafana Dashboards
- Sistem metrics: http://localhost:3001
- Login: admin / omnicore_grafana_2024

### Prometheus Metrics
- Metrics endpoint: http://localhost:9090
- Custom metrics za module

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Module status
curl http://localhost:8000/status
```

## 🛠️ Development

### Dodajanje novega modula

1. **Backend modul** (`backend/modules/new_module.py`):
```python
class NewModule:
    def __init__(self):
        self.name = "new_module"
    
    async def get_dashboard_data(self):
        return {"status": "active", "data": {}}
```

2. **API endpoint** (`backend/main.py`):
```python
@app.get("/modules/new_module/dashboard")
async def new_module_dashboard():
    return await modules["new_module"].get_dashboard_data()
```

3. **Frontend integracija** (`frontend/app.js`):
```javascript
async loadNewModuleData() {
    const response = await fetch('/modules/new_module/dashboard');
    const data = await response.json();
    this.renderNewModuleData(data);
}
```

### WebSocket Events

```javascript
// Frontend WebSocket
websocket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
        case 'module_update':
            this.updateModuleData(message.data);
            break;
    }
};
```

## 🐳 Docker Services

### Storitve v docker-compose.yml:
- **postgres**: Multi-tenant baza
- **redis**: Caching in sessions
- **backend**: FastAPI aplikacija
- **frontend**: Nginx static files
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboards

### Upravljanje kontejnerjev:
```bash
# Zaženi storitve
docker-compose up -d

# Preveri loge
docker-compose logs -f backend

# Restart storitve
docker-compose restart backend

# Ustavi vse
docker-compose down
```

## 📈 Skalabilnost

### Horizontalno skaliranje:
```yaml
# docker-compose.yml
backend:
  deploy:
    replicas: 3
  environment:
    - WORKERS=4
```

### Load balancing:
- Nginx reverse proxy
- Multiple backend instances
- Redis session sharing

## 🔄 Backup & Recovery

### Database backup:
```bash
# PostgreSQL backup
docker exec omnicore-postgres pg_dump -U omnicore omnicore_global > backup.sql

# Restore
docker exec -i omnicore-postgres psql -U omnicore omnicore_global < backup.sql
```

### Redis backup:
```bash
# Redis backup
docker exec omnicore-redis redis-cli BGSAVE
```

## 🚨 Troubleshooting

### Pogoste napake:

1. **Port že v uporabi**:
```bash
# Preveri kateri proces uporablja port
netstat -ano | findstr :8000
# Ustavi proces ali spremeni port
```

2. **Database connection error**:
```bash
# Preveri PostgreSQL status
docker-compose logs postgres
# Restart database
docker-compose restart postgres
```

3. **WebSocket connection failed**:
```bash
# Preveri backend logs
docker-compose logs backend
# Preveri CORS nastavitve
```

## 📞 Podpora

### Logi in debugging:
```bash
# Backend logi
docker-compose logs -f backend

# Database logi
docker-compose logs -f postgres

# Vsi logi
docker-compose logs -f
```

### Performance monitoring:
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090
- Backend metrics: http://localhost:8000/metrics

## 📄 Licenca

MIT License - glej LICENSE datoteko za podrobnosti.

## 🤝 Prispevki

1. Fork repository
2. Ustvari feature branch
3. Commit spremembe
4. Push v branch
5. Ustvari Pull Request

---

**OmniCore Global Platform** - Univerzalna rešitev za moderna podjetja 🚀