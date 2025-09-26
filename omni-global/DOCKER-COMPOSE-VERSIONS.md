# 🐳 Docker Compose Konfiguracije

Omni Global sistem ponuja dve različici Docker Compose konfiguracije, prilagojeni različnim potrebam in okoljem.

## 📋 Pregled Verzij

### 1. **docker-compose.yml** (Produkcijska verzija)
- **Namembnost**: Popolna produkcijska postavitev
- **Kompleksnost**: Visoka
- **Funkcionalnosti**: Vse funkcionalnosti vključene

### 2. **docker-compose.simple.yml** (Razvojna verzija)
- **Namembnost**: Razvoj, testiranje, demo
- **Kompleksnost**: Nizka
- **Funkcionalnosti**: Osnovne funkcionalnosti

## 🔍 Podrobna Primerjava

| Komponenta | Produkcijska | Razvojna | Opis |
|------------|-------------|----------|------|
| **MongoDB** | ✅ | ✅ | Osnovna baza podatkov |
| **Redis** | ✅ | ❌ | Cache sistem |
| **Nginx** | ✅ | ❌ | Reverse proxy, SSL terminacija |
| **SSL/HTTPS** | ✅ | ❌ | Varnostni certifikati |
| **Health Checks** | ✅ | ❌ | Preverjanje zdravja storitev |
| **Monitoring** | ✅ | ❌ | Prometheus, Grafana |
| **Logging** | ✅ | ❌ | ELK Stack |
| **Load Balancing** | ✅ | ❌ | Nginx load balancer |

## 🚀 Uporaba

### Razvojna Verzija (Enostavna)
```bash
# Zagon razvojne verzije
docker-compose -f docker-compose.simple.yml up --build

# Zagon v ozadju
docker-compose -f docker-compose.simple.yml up -d --build

# Ustavitev
docker-compose -f docker-compose.simple.yml down
```

**Dostopne povezave:**
- Server API: http://localhost:3000
- Admin GUI: http://localhost:4000
- MongoDB: localhost:27017

### Produkcijska Verzija (Popolna)
```bash
# Zagon produkcijske verzije
docker-compose up --build

# Zagon v ozadju
docker-compose up -d --build

# Ustavitev
docker-compose down
```

**Dostopne povezave:**
- Server API: https://localhost:443 (preko Nginx)
- Admin GUI: https://localhost:443/admin (preko Nginx)
- MongoDB: localhost:27017
- Redis: localhost:6379
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

## 🎯 Kdaj Uporabiti Katero Verzijo

### Razvojna Verzija (`docker-compose.simple.yml`)
**Uporabi za:**
- ✅ Lokalni razvoj
- ✅ Testiranje funkcionalnosti
- ✅ Demo predstavitve
- ✅ Hitri zagon
- ✅ Učenje sistema
- ✅ Debugging

**Prednosti:**
- Hiter zagon (manj storitev)
- Manjša poraba virov
- Enostavnejše upravljanje
- Neposreden dostop do storitev

### Produkcijska Verzija (`docker-compose.yml`)
**Uporabi za:**
- ✅ Produkcijsko okolje
- ✅ Staging okolje
- ✅ Varnostno kritične aplikacije
- ✅ Visoka dostopnost
- ✅ Monitoring in analitika
- ✅ Skalabilnost

**Prednosti:**
- Popolna varnost (SSL/HTTPS)
- Monitoring in logging
- Load balancing
- Health checks
- Cache sistem (Redis)
- Profesionalna postavitev

## ⚙️ Konfiguracija

### Okoljske Spremenljivke

**Razvojna verzija:**
```env
NODE_ENV=development
MONGO_URI=mongodb://omni:omni123@mongo:27017/omni?authSource=admin
JWT_SECRET=super_secret
```

**Produkcijska verzija:**
```env
NODE_ENV=production
MONGO_URI=mongodb://omni:omni123@mongo:27017/omni?authSource=admin
JWT_SECRET=super_secret_key_change_in_production
SSL_ENABLED=true
GRAFANA_PASSWORD=admin123
```

## 🔧 Migracija med Verzijami

### Od Razvojne → Produkcijska
1. Pripravi SSL certifikate v `./certs/`
2. Konfiguriraj Nginx v `./nginx/`
3. Nastavi produkcijske okoljske spremenljivke
4. Zaženi produkcijsko verzijo

### Od Produkcijske → Razvojna
1. Izvozi podatke iz MongoDB
2. Ustavi produkcijsko verzijo
3. Zaženi razvojno verzijo
4. Uvozi podatke

## 📝 Priporočila

### Za Začetnike
- Začni z **razvojno verzijo**
- Spoznaj osnovne funkcionalnosti
- Preizkusi API-je in Admin GUI

### Za Produkcijo
- Uporabi **produkcijsko verzijo**
- Nastavi močne gesla
- Konfiguriraj SSL certifikate
- Omogoči monitoring

### Za Razvoj
- Uporabi **razvojno verzijo** za dnevno delo
- Preizkusi na **produkcijski verziji** pred objavo
- Redno testiraj obe verziji

## 🆘 Odpravljanje Težav

### Razvojna Verzija
```bash
# Preveri status
docker-compose -f docker-compose.simple.yml ps

# Poglej loge
docker-compose -f docker-compose.simple.yml logs -f

# Ponovno zgradi
docker-compose -f docker-compose.simple.yml build --no-cache
```

### Produkcijska Verzija
```bash
# Preveri status
docker-compose ps

# Poglej loge
docker-compose logs -f

# Preveri zdravje storitev
docker-compose exec server curl http://localhost:3000/api/health
```

## 🔄 Posodobitve

Za posodobitev sistema:
1. Ustavi trenutno verzijo
2. Povleci najnovejše spremembe
3. Ponovno zgradi slike
4. Zaženi posodobljeno verzijo

```bash
# Razvojna verzija
docker-compose -f docker-compose.simple.yml down
docker-compose -f docker-compose.simple.yml build --no-cache
docker-compose -f docker-compose.simple.yml up -d

# Produkcijska verzija
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```