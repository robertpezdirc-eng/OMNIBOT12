# Omni License System - Docker Setup

Popoln Docker setup za Omni License System z MongoDB, API strežnikom, Admin GUI in opcijskim Client Panel demo.

## 🏗️ Struktura projekta

```
omni-docker/
├── docker-compose.yml          # Glavna Docker konfiguracija
├── docker-compose.dev.yml      # Development konfiguracija
├── .env.docker                 # Okoljske spremenljivke
├── .dockerignore              # Docker ignore datoteka
├── Dockerfile-server          # Server Docker slika
├── Dockerfile-admin           # Admin GUI Docker slika
├── Dockerfile-client          # Client Panel Docker slika
├── start.bat                  # Windows startup skripta
├── start.sh                   # Linux/macOS startup skripta
├── server/                    # Strežniške datoteke
├── admin/                     # Admin GUI datoteke
├── client/                    # Client Panel datoteke
├── README.md                  # Ta datoteka
├── INSTALL.md                 # Navodila za namestitev
├── TEST.md                    # Testna dokumentacija
└── PRODUCTION.md              # Produkcijska navodila
```

## 🚀 Hiter zagon

### Windows
```bash
# Zaženi startup skripto
start.bat

# Ali ročno
docker-compose up --build -d mongo server admin
```

### Linux/macOS
```bash
# Naredi skripto izvršljivo
chmod +x start.sh

# Zaženi startup skripto
./start.sh

# Ali ročno
docker-compose up --build -d mongo server admin
```

## 🔧 Konfiguracija

### Okoljske spremenljivke (.env.docker)
```env
# MongoDB
MONGO_INITDB_ROOT_USERNAME=omni
MONGO_INITDB_ROOT_PASSWORD=omni123

# Server
MONGO_URI=mongodb://omni:omni123@mongo:27017/omni?authSource=admin
JWT_SECRET=super_secret_key
PORT=3000
NODE_ENV=production

# Admin GUI
SERVER_URL=http://server:3000
```

### Porti
- **MongoDB**: 27017
- **API Server**: 3000
- **Admin GUI**: 4000
- **Client Panel**: 5000 (opcijsko)

## 📱 Dostopne aplikacije

Po uspešnem zagonu so dostopne naslednje aplikacije:

- **Admin GUI**: http://localhost:4000
- **API Server**: http://localhost:3000/api/license
- **Client Panel**: http://localhost:5000 (če je zagnan)
- **MongoDB**: mongodb://localhost:27017

## 🛡️ Varnostne funkcije

- JWT avtentikacija
- Rate limiting
- HTTPS podpora (produkcija)
- CORS konfiguracija
- Centralizirano beleženje
- Health check-i

## 🔌 API končne točke

```
GET    /api/license/health      # Health check
POST   /api/license/generate    # Generiraj licenco
POST   /api/license/verify      # Preveri licenco
GET    /api/license/list        # Seznam licenc
DELETE /api/license/:id         # Izbriši licenco
```

## 🎛️ Upravljanje

### Preveri status
```bash
docker-compose ps
```

### Restart storitev
```bash
docker-compose restart
```

### Posodobi sistem
```bash
docker-compose down
docker-compose pull
docker-compose up --build -d
```

## 💾 Varnostno kopiranje

### Backup MongoDB
```bash
docker exec omni-mongo mongodump --uri="mongodb://omni:omni123@localhost:27017/omni?authSource=admin" --out=/backup
docker cp omni-mongo:/backup ./backup
```

### Restore MongoDB
```bash
docker cp ./backup omni-mongo:/backup
docker exec omni-mongo mongorestore --uri="mongodb://omni:omni123@localhost:27017/omni?authSource=admin" /backup/omni
```

## 🔍 Odpravljanje težav

### Preveri loge
```bash
# Vsi logi
docker-compose logs -f

# Specifična storitev
docker-compose logs -f server
docker-compose logs -f admin
docker-compose logs -f mongo
```

### Health check-i
```bash
# Server health
curl http://localhost:3000/api/license/health

# Admin GUI
curl http://localhost:4000

# MongoDB
docker exec omni-mongo mongo --eval "db.adminCommand('ismaster')"
```

## 📊 Monitoring

### Metrike
- CPU in RAM uporaba
- Disk prostor
- Omrežni promet
- Odzivni časi API

### Alarmiranje
- Visoka CPU uporaba (>80%)
- Nizek disk prostor (<10%)
- API napake (>5%)
- MongoDB nedostopnost

## 🔄 Razvojno vs Produkcijsko okolje

### Development
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Production
```bash
docker-compose up -d
```

## 📞 Podpora

Za pomoč in podporo:
- Preveri `INSTALL.md` za navodila namestitve
- Preveri `TEST.md` za testiranje
- Preveri `PRODUCTION.md` za produkcijsko uporabo
- Odpri issue na GitHub repozitoriju

---

**Omni License System** - Popolna rešitev za upravljanje licenc v Docker okolju.