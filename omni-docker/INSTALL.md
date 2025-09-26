# 🐳 Omni License System - Docker Setup

## Predpogoji

### 1. Namestitev Docker Desktop

**Windows:**
1. Prenesi Docker Desktop z: https://www.docker.com/products/docker-desktop/
2. Zaženi installer in sledi navodilom
3. Ponovno zaženi računalnik
4. Zaženi Docker Desktop in počakaj, da se inicializira

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Namesti docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**macOS:**
1. Prenesi Docker Desktop z: https://www.docker.com/products/docker-desktop/
2. Povleci .dmg datoteko v Applications mapo
3. Zaženi Docker Desktop

### 2. Preverjanje namestitve

```bash
# Preveri Docker
docker --version
# Pričakovani izpis: Docker version 24.x.x

# Preveri docker-compose
docker-compose --version
# Pričakovani izpis: Docker Compose version v2.x.x
```

## 🚀 Hiter zagon

### Možnost 1: Uporabi startup skripte

**Windows:**
```cmd
# Zaženi start.bat
start.bat
```

**Linux/macOS:**
```bash
# Naredi skripto izvršljivo
chmod +x start.sh

# Zaženi skripto
./start.sh
```

### Možnost 2: Ročni zagon

```bash
# Osnovni setup (Server + MongoDB + Admin)
docker-compose up -d mongodb omni-server omni-admin

# Polni setup z Client Panel demo
docker-compose --profile demo up -d

# Development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## 📊 Dostop do aplikacij

Po uspešnem zagonu so aplikacije dostopne na:

- **Admin GUI**: http://localhost:3001
- **API Server**: http://localhost:3000
- **Client Panel** (demo): http://localhost:3002
- **MongoDB**: localhost:27017

## 🔧 Upravljanje

### Preverjanje statusa
```bash
docker-compose ps
```

### Ogled logov
```bash
# Vsi logi
docker-compose logs -f

# Specifična storitev
docker-compose logs -f omni-server
docker-compose logs -f omni-admin
docker-compose logs -f mongodb
```

### Ustavitev
```bash
# Ustavi vse storitve
docker-compose down

# Ustavi in odstrani volume-e
docker-compose down -v
```

### Rebuild
```bash
# Rebuild vseh slik
docker-compose build --no-cache

# Rebuild specifične storitve
docker-compose build --no-cache omni-server
```

## 🛠️ Konfiguracija

### Okoljske spremenljivke

Uredi `.env.docker` datoteko za prilagoditev nastavitev:

```env
# MongoDB
MONGODB_USERNAME=omni_admin
MONGODB_PASSWORD=secure_password_123
MONGODB_DATABASE=omni_licenses

# JWT
JWT_SECRET=your_super_secure_jwt_secret_key_here
REFRESH_TOKEN_SECRET=your_super_secure_refresh_token_secret_here

# Server
NODE_ENV=production
PORT=3000
USE_HTTPS=false

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:3002

# API URLs
API_BASE_URL=http://localhost:3000/api
ADMIN_API_URL=http://localhost:3000/api
CLIENT_API_URL=http://localhost:3000/api

# Ports
ADMIN_PORT=3001
CLIENT_PORT=3002
```

### Porti

Privzeti porti so:
- **3000**: API Server
- **3001**: Admin GUI
- **3002**: Client Panel
- **27017**: MongoDB

Za spremembo portov uredi `docker-compose.yml`.

## 🔒 Varnost

### Produkcijska uporaba

1. **Spremeni gesla** v `.env.docker`
2. **Omogoči HTTPS** z nastavitvijo `USE_HTTPS=true`
3. **Dodaj SSL certifikate** v `server/ssl/` mapo
4. **Omeji CORS** na specifične domene
5. **Uporabi Docker secrets** za občutljive podatke

### SSL Certifikati

```bash
# Ustvari self-signed certifikate za testiranje
mkdir -p server/ssl
openssl req -x509 -newkey rsa:4096 -keyout server/ssl/key.pem -out server/ssl/cert.pem -days 365 -nodes
```

## 📦 Backup in Restore

### MongoDB Backup
```bash
# Ustvari backup
docker-compose exec mongodb mongodump --username omni_admin --password secure_password_123 --authenticationDatabase admin --db omni_licenses --out /backup

# Kopiraj backup iz container-ja
docker cp omni-docker_mongodb_1:/backup ./mongodb-backup
```

### MongoDB Restore
```bash
# Kopiraj backup v container
docker cp ./mongodb-backup omni-docker_mongodb_1:/restore

# Obnovi podatke
docker-compose exec mongodb mongorestore --username omni_admin --password secure_password_123 --authenticationDatabase admin --db omni_licenses /restore/omni_licenses
```

## 🐛 Odpravljanje težav

### Pogosti problemi

1. **Port že v uporabi**
   ```bash
   # Preveri kateri proces uporablja port
   netstat -ano | findstr :3000
   
   # Ustavi proces ali spremeni port v docker-compose.yml
   ```

2. **Docker ni zagnan**
   ```bash
   # Zaženi Docker Desktop ali Docker daemon
   sudo systemctl start docker  # Linux
   ```

3. **Dovoljenja (Linux/macOS)**
   ```bash
   # Dodaj uporabnika v docker skupino
   sudo usermod -aG docker $USER
   newgrp docker
   ```

4. **MongoDB connection error**
   ```bash
   # Preveri MongoDB loge
   docker-compose logs mongodb
   
   # Preveri network povezavo
   docker-compose exec omni-server ping mongodb
   ```

### Debug mode

```bash
# Zaženi v debug načinu
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Poveži debugger na port 9229
```

## 📈 Monitoring

### Health Checks

Vse storitve imajo vgrajene health check-e:

```bash
# Preveri zdravje storitev
docker-compose ps

# Podrobnosti o zdravju
docker inspect omni-docker_omni-server_1 | grep -A 10 Health
```

### Metrics

API endpoints za monitoring:
- `GET /api/license/stats` - Statistike sistema
- `GET /health` - Health check endpoint

## 🔄 Posodobitve

### Posodobi Docker slike
```bash
# Povleci najnovejše slike
docker-compose pull

# Rebuild in restart
docker-compose down
docker-compose up -d --build
```

### Posodobi kodo
```bash
# Kopiraj nove datoteke v server/, admin/, client/ mape
# Nato rebuild
docker-compose build --no-cache
docker-compose up -d
```

## 📞 Podpora

Za pomoč in podporo:
- Preveri loge: `docker-compose logs -f`
- Preveri GitHub Issues
- Kontaktiraj razvojno ekipo

---

**Opomba**: Ta Docker setup je pripravljen za razvoj in testiranje. Za produkcijsko uporabo priporočamo dodatne varnostne ukrepe in optimizacije.