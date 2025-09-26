# 🧠 OmniCore Global Platform

**Univerzalna, inteligentna, avtonomna poslovna platforma za podjetja vseh velikosti**

OmniCore Global je popolnoma modularna, AI-powered platforma, ki združuje vse ključne poslovne funkcije v enotno, skalabilno rešitev. Platforma je zasnovana za hitro implementacijo v kateremkoli podjetju z multi-tenant arhitekturo in cloud-native pristopom.

## 🚀 Ključne Funkcionalnosti

### 🎯 Modularnost
- **Finance Module**: Finančno upravljanje, računi, plačila, proračuni
- **Analytics Module**: Napredna analitika podatkov in poročila
- **Task Management**: Upravljanje nalog, koledar, projekti
- **Logistics Module**: TMS/WMS sistemi, sledenje pošiljk
- **AI Router**: Inteligentno usmerjanje poizvedb med moduli

### 🤖 AI-Powered
- Avtomatsko usmerjanje poizvedb
- Kontekstno razumevanje zahtev
- Učenje iz uporabniških vzorcev
- Prediktivna analitika

### 🏢 Multi-Tenant
- Popolna izolacija podatkov med strankami
- Skalabilna arhitektura
- Centralizirano upravljanje
- Prilagodljive konfiguracije

### ☁️ Cloud-Ready
- Docker containerization
- Kubernetes support
- AWS/Azure/GCP kompatibilnost
- Avtomatsko skaliranje

## 📁 Struktura Projekta

```
omnicore-global/
├── backend/                    # FastAPI Backend
│   ├── main.py                # Glavni API endpoint
│   ├── ai_router.py           # AI Router za usmerjanje
│   ├── config.py              # Centralna konfiguracija
│   ├── db.py                  # Database manager
│   └── modules/               # Poslovni moduli
│       ├── finance.py         # Finančni modul
│       ├── analytics.py       # Analitični modul
│       ├── task.py           # Task management
│       └── logistics.py       # Logistični modul
├── frontend/                   # React/Vanilla JS Frontend
│   ├── index.html            # Glavni dashboard
│   ├── app.js                # JavaScript logika
│   └── style.css             # Moderni CSS styling
├── docker-compose.yml         # Celotna infrastruktura
├── Dockerfile                 # Backend container
├── requirements.txt           # Python dependencies
└── README.md                  # Ta dokumentacija
```

## 🛠️ Hitra Namestitev

### Predpogoji
- Docker & Docker Compose
- Python 3.11+ (za lokalni razvoj)
- Git

### 1. Kloniraj Repozitorij
```bash
git clone https://github.com/your-org/omnicore-global.git
cd omnicore-global
```

### 2. Konfiguriraj Environment
```bash
# Kopiraj in prilagodi environment datoteko
cp .env.example .env

# Uredi konfiguracijo
nano .env
```

### 3. Zaženi z Docker Compose
```bash
# Zgradi in zaženi vse storitve
docker-compose up -d

# Preveri status
docker-compose ps

# Poglej loge
docker-compose logs -f omnicore-backend
```

### 4. Dostop do Aplikacije
- **Frontend Dashboard**: http://localhost
- **API Dokumentacija**: http://localhost:8000/docs
- **Grafana Monitoring**: http://localhost:3000 (admin/omnicore123)
- **Prometheus Metrics**: http://localhost:9090

## 🔧 Lokalni Razvoj

### Backend Setup
```bash
# Ustvari virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ali
venv\Scripts\activate     # Windows

# Namesti dependencies
pip install -r requirements.txt

# Zaženi development server
uvicorn backend.main:app --reload --port 8000
```

### Frontend Setup
```bash
# Zaženi lokalni HTTP server
cd frontend
python -m http.server 3000

# Ali z Node.js
npx serve . -p 3000
```

## 📊 API Endpoints

### Glavni Endpoints
```http
GET  /                          # API info
GET  /health                    # Health check
POST /route                     # AI Router
GET  /status                    # Sistem status
```

### Moduli
```http
# Finance Module
GET  /modules/finance/dashboard
POST /modules/finance/invoice
GET  /modules/finance/reports

# Analytics Module  
GET  /modules/analytics/dashboard
POST /modules/analytics/query
GET  /modules/analytics/reports

# Task Module
GET  /modules/task/dashboard
POST /modules/task/create
PUT  /modules/task/{id}/complete

# Logistics Module
GET  /modules/logistics/dashboard
POST /modules/logistics/shipment
GET  /modules/logistics/tracking/{id}
```

## 🏗️ Arhitektura

### Sistemska Arhitektura
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   API Gateway   │────│   AI Router     │
│   (HAProxy)     │    │   (FastAPI)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │   Finance    │ │  Analytics  │ │    Task    │
        │   Module     │ │   Module    │ │   Module   │
        └──────────────┘ └─────────────┘ └────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │  PostgreSQL  │ │    Redis    │ │  Message   │
        │   Database   │ │    Cache    │ │   Queue    │
        └──────────────┘ └─────────────┘ └────────────┘
```

### Multi-Tenant Arhitektura
- **Database Level**: Ločene sheme za vsakega tenant-a
- **Application Level**: Tenant ID v vseh zahtevah
- **Cache Level**: Namespace isolation v Redis
- **Security Level**: JWT tokens z tenant scope

## 🔐 Varnost

### Avtentikacija & Avtorizacija
- JWT tokens z refresh mechanism
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- API key management

### Varnost Podatkov
- Encryption at rest in transit
- GDPR compliance
- Audit logging
- Data anonymization

### Network Security
- HTTPS/TLS encryption
- VPN support
- Firewall rules
- DDoS protection

## 📈 Monitoring & Observability

### Metrics (Prometheus)
- Application performance metrics
- Business KPIs
- Infrastructure metrics
- Custom dashboards

### Logging (ELK Stack)
- Structured logging
- Log aggregation
- Search & analysis
- Alert management

### Tracing
- Distributed tracing
- Performance profiling
- Error tracking
- User journey analysis

## 🚀 Deployment

### Production Deployment

#### AWS Deployment
```bash
# ECS Deployment
aws ecs create-cluster --cluster-name omnicore-prod

# RDS Database
aws rds create-db-instance \
  --db-instance-identifier omnicore-db \
  --db-instance-class db.t3.medium \
  --engine postgres

# ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id omnicore-cache \
  --engine redis
```

#### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n omnicore

# Scale deployment
kubectl scale deployment omnicore-backend --replicas=5
```

#### Azure Deployment
```bash
# Container Instances
az container create \
  --resource-group omnicore-rg \
  --name omnicore-backend \
  --image omnicore/backend:latest

# Azure Database for PostgreSQL
az postgres server create \
  --resource-group omnicore-rg \
  --name omnicore-db \
  --sku-name GP_Gen5_2
```

### Environment Configurations

#### Production (.env.prod)
```env
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://user:pass@prod-db:5432/omnicore
REDIS_URL=redis://prod-redis:6379/0
SECRET_KEY=super-secure-production-key
ALLOWED_HOSTS=api.omnicore.com,omnicore.com
```

#### Staging (.env.staging)
```env
ENVIRONMENT=staging
DEBUG=true
DATABASE_URL=postgresql://user:pass@staging-db:5432/omnicore
REDIS_URL=redis://staging-redis:6379/0
SECRET_KEY=staging-secret-key
```

## 🧪 Testing

### Unit Tests
```bash
# Zaženi vse teste
pytest

# Test coverage
pytest --cov=backend --cov-report=html

# Specifični moduli
pytest tests/test_finance.py -v
```

### Integration Tests
```bash
# API testi
pytest tests/integration/ -v

# Database testi
pytest tests/test_db.py -v
```

### Load Testing
```bash
# Locust load testing
locust -f tests/load_test.py --host=http://localhost:8000
```

## 📚 Uporaba

### Osnovni Primeri

#### 1. Finančna Poizvedba
```python
import requests

response = requests.post('http://localhost:8000/route', json={
    'query': 'Koliko imamo odprtih računov?',
    'tenant_id': 'company-abc'
})

print(response.json())
# {'module': 'finance', 'result': 'Imate 15 odprtih računov v vrednosti €45,230'}
```

#### 2. Analitična Poizvedba
```python
response = requests.post('http://localhost:8000/route', json={
    'query': 'Prikaži prodajne trende za zadnji mesec',
    'tenant_id': 'company-abc'
})
```

#### 3. Task Management
```python
response = requests.post('http://localhost:8000/route', json={
    'query': 'Ustvari nalogo: Pripravi mesečno poročilo',
    'tenant_id': 'company-abc'
})
```

### Frontend Uporaba

#### Dashboard Navigacija
1. **Dashboard**: Pregled KPI-jev in trendov
2. **Moduli**: Upravljanje in konfiguracija modulov
3. **Analitika**: Podrobna analiza podatkov
4. **Nastavitve**: Sistemske konfiguracije

#### AI Pomočnik
- Vnesite naravno jezikovno poizvedbo
- Sistem avtomatsko usmeri na pravi modul
- Prejmite strukturiran odgovor

## 🔧 Konfiguracija

### Dodajanje Novega Modula

#### 1. Ustvari Modul
```python
# backend/modules/new_module.py
class NewModule:
    def __init__(self):
        self.name = "new_module"
    
    async def handle(self, query: str, tenant_id: str):
        # Implementiraj logiko modula
        return {"result": "Module response"}
    
    async def health_check(self):
        return {"status": "healthy"}
```

#### 2. Registriraj v Main App
```python
# backend/main.py
from backend.modules.new_module import NewModule

# Dodaj v modules dictionary
modules = {
    "finance": FinanceModule(),
    "analytics": AnalyticsModule(),
    "task": TaskModule(),
    "new_module": NewModule(),  # Novi modul
}
```

#### 3. Posodobi AI Router
```python
# backend/ai_router.py
def _get_module_keywords(self):
    return {
        "finance": ["denar", "račun", "plačilo", "stroški"],
        "analytics": ["analiza", "poročilo", "statistika"],
        "task": ["naloga", "opravilo", "projekt"],
        "new_module": ["nova", "funkcionalnost"],  # Dodaj ključne besede
    }
```

### Multi-Tenant Konfiguracija

#### Database Schema per Tenant
```sql
-- Ustvari novo shemo za tenant-a
CREATE SCHEMA tenant_company_abc;

-- Nastavi search_path
SET search_path TO tenant_company_abc, public;

-- Ustvari tabele
CREATE TABLE invoices (...);
CREATE TABLE tasks (...);
```

#### Application Level Isolation
```python
# Middleware za tenant isolation
@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    tenant_id = request.headers.get("X-Tenant-ID", "default")
    request.state.tenant_id = tenant_id
    
    # Set database schema
    await set_tenant_schema(tenant_id)
    
    response = await call_next(request)
    return response
```

## 🤝 Prispevanje

### Development Workflow
1. Fork repozitorij
2. Ustvari feature branch (`git checkout -b feature/nova-funkcionalnost`)
3. Commit spremembe (`git commit -am 'Dodaj novo funkcionalnost'`)
4. Push na branch (`git push origin feature/nova-funkcionalnost`)
5. Ustvari Pull Request

### Code Standards
- Python: PEP 8, Black formatting
- JavaScript: ESLint, Prettier
- Commit messages: Conventional Commits
- Documentation: Sphinx/MkDocs

## 📄 Licenca

MIT License - glej [LICENSE](LICENSE) datoteko za podrobnosti.

## 🆘 Podpora

### Dokumentacija
- **API Docs**: http://localhost:8000/docs
- **User Guide**: [docs/user-guide.md](docs/user-guide.md)
- **Developer Guide**: [docs/developer-guide.md](docs/developer-guide.md)

### Kontakt
- **Email**: support@omnicore.com
- **Slack**: #omnicore-support
- **GitHub Issues**: [Issues](https://github.com/your-org/omnicore-global/issues)

### Status
- **System Status**: https://status.omnicore.com
- **Uptime**: 99.9% SLA
- **Response Time**: < 200ms average

---

**OmniCore Global Platform** - Prihodnost poslovnih rešitev je tukaj! 🚀