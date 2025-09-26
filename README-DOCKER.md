# 🐳 Omni Docker Package

Ready-to-use Docker package za celoten Omni sistem, ki vključuje Server, Admin GUI, WebSocket in Client Panel.

## 📋 Sistem vključuje

- **MongoDB** - Podatkovna baza z avtentikacijo
- **Omni Server** - Glavni API strežnik z WebSocket podporo
- **Admin GUI** - Administratorski vmesnik za upravljanje licenc
- **Client Panel** - Uporabniški vmesnik za stranke

## 🚀 Hitra namestitev

### Windows
```bash
# Zagon sistema
docker-start.bat

# Ustavitev sistema
docker-stop.bat
```

### Linux/macOS
```bash
# Zagon sistema
./docker-start.sh

# Ustavitev sistema
./docker-stop.sh
```

## 🌐 Dostopne storitve

Po zagonu so storitve dostopne na:

- **📊 MongoDB**: `localhost:27017`
- **🚀 Server API**: `http://localhost:3000`
- **🎛️ Admin GUI**: `http://localhost:4000`
- **👤 Client Panel**: `http://localhost:8080`

## ⚙️ Konfiguracija

### Okoljske spremenljivke

Sistem uporablja naslednje okoljske spremenljivke:

#### MongoDB
- `MONGO_INITDB_ROOT_USERNAME=omni`
- `MONGO_INITDB_ROOT_PASSWORD=omni123`

#### Server
- `MONGO_URI=mongodb://omni:omni123@mongo:27017/omni?authSource=admin`
- `JWT_SECRET=super_secret`
- `PORT=3000`

#### Admin GUI
- `SERVER_URL=http://server:3000`
- `PORT=4000`

#### Client Panel
- `SERVER_URL=http://server:3000`
- `PORT=8080`

### Prilagoditev konfiguracije

Za prilagoditev konfiguracije uredite datoteko `docker-compose.yml`:

```yaml
services:
  server:
    environment:
      JWT_SECRET: your_custom_secret
      # Dodajte druge spremenljivke
```

## 📁 Struktura projekta

```
omni-docker/
├── docker-compose.yml      # Glavna Docker Compose konfiguracija
├── docker-start.bat        # Windows start skripta
├── docker-start.sh         # Linux/macOS start skripta
├── docker-stop.bat         # Windows stop skripta
├── docker-stop.sh          # Linux/macOS stop skripta
├── server/
│   ├── Dockerfile          # Server Docker konfiguracija
│   ├── server.js           # Glavni server
│   └── package.json        # Server odvisnosti
├── admin/
│   ├── Dockerfile          # Admin GUI Docker konfiguracija
│   ├── admin-server.js     # Admin strežnik
│   └── package.json        # Admin odvisnosti
└── client/
    ├── Dockerfile          # Client Panel Docker konfiguracija
    ├── client-server.js    # Client strežnik
    └── package.json        # Client odvisnosti
```

## 🔧 Uporabni ukazi

### Osnovni ukazi
```bash
# Zagon sistema
docker-compose up -d

# Ustavitev sistema
docker-compose down

# Pregled statusa
docker-compose ps

# Pregled logov
docker-compose logs -f
```

### Debugging ukazi
```bash
# Logi posamezne storitve
docker-compose logs -f server
docker-compose logs -f admin
docker-compose logs -f mongo

# Vstop v kontejner
docker-compose exec server bash
docker-compose exec admin bash

# Restart posamezne storitve
docker-compose restart server
```

### Čiščenje
```bash
# Ustavitev in odstranitev kontejnerjev
docker-compose down

# Odstranitev tudi volumov (POZOR: briše podatke!)
docker-compose down -v

# Odstranitev tudi slik
docker-compose down --rmi all
```

## 🔍 Preverjanje zdravja

Vsaka storitev ima health check endpoint:

- **Server**: `http://localhost:3000/health`
- **Admin**: `http://localhost:4000/health`
- **Client**: `http://localhost:8080/health`

## 📊 API Endpoints

### Server API (`http://localhost:3000`)

- `GET /health` - Preverjanje zdravja
- `GET /api/licenses` - Seznam vseh licenc
- `POST /api/license/create` - Ustvarjanje nove licence
- `POST /api/license/extend` - Podaljšanje licence
- `POST /api/license/toggle` - Preklapljanje statusa licence

### Primer API klica
```bash
# Ustvarjanje nove licence
curl -X POST http://localhost:3000/api/license/create \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "test-client-001",
    "plan": "premium",
    "modules": ["analytics", "reporting"]
  }'
```

## 🔐 Varnost

### Produkcijska uporaba

Za produkcijsko uporabo priporočamo:

1. **Spremenite privzete gesla**:
   ```yaml
   environment:
     MONGO_INITDB_ROOT_PASSWORD: your_secure_password
     JWT_SECRET: your_secure_jwt_secret
   ```

2. **Uporabite SSL certifikate**:
   ```yaml
   volumes:
     - ./certs:/app/certs
   ```

3. **Omejite dostop do portov**:
   ```yaml
   ports:
     - "127.0.0.1:3000:3000"  # Samo lokalni dostop
   ```

## 🐛 Odpravljanje težav

### Pogosti problemi

1. **Docker ni zagnan**
   ```
   Error: Docker is not running
   ```
   **Rešitev**: Zaženite Docker Desktop

2. **Port je že zaseden**
   ```
   Error: Port 3000 is already in use
   ```
   **Rešitev**: Ustavite druge storitve ali spremenite port v `docker-compose.yml`

3. **MongoDB povezava neuspešna**
   ```
   Error: MongoDB connection failed
   ```
   **Rešitev**: Počakajte, da se MongoDB zažene, ali preverite loge z `docker-compose logs mongo`

### Logi za debugging
```bash
# Vsi logi
docker-compose logs -f

# Logi z časovnimi žigi
docker-compose logs -f -t

# Zadnjih 100 vrstic
docker-compose logs --tail=100
```

## 📈 Monitoring

### Pregled virov
```bash
# Uporaba virov
docker stats

# Disk uporaba
docker system df

# Čiščenje neuporabljenih virov
docker system prune
```

## 🔄 Posodobitve

### Posodobitev slik
```bash
# Ustavitev sistema
docker-compose down

# Posodobitev slik
docker-compose pull

# Ponovno zagon
docker-compose up -d
```

### Rebuild po spremembah kode
```bash
# Rebuild in zagon
docker-compose up --build -d
```

## 📞 Podpora

Za pomoč in podporo:
- Preverite loge: `docker-compose logs -f`
- Preverite status: `docker-compose ps`
- Preverite health endpoints
- Kontaktirajte podporo z logami in opisom problema

---

**🎉 Omni Docker Package je pripravljen za uporabo!**