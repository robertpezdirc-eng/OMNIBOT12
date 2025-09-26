# 🚀 Omni Ultimate Turbo Flow System - Navodila za Namestitev

## 📋 Pregled Namestitve

Ta dokument vsebuje podrobna navodila za namestitev in konfiguracijo Omni Ultimate Turbo Flow System.

## 🔧 Sistemski Zahtevi

### Minimalne Zahteve
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **RAM**: 4GB (priporočeno 8GB+)
- **Disk**: 2GB prostora
- **CPU**: 2 jedri (priporočeno 4+)

### Programska Oprema
- **Node.js**: 18.0+ ([Prenesi](https://nodejs.org/))
- **MongoDB**: 6.0+ ([Prenesi](https://www.mongodb.com/try/download/community))
- **Docker**: 20.10+ ([Prenesi](https://www.docker.com/get-started))
- **Git**: 2.30+ ([Prenesi](https://git-scm.com/))

## 🐳 Docker Namestitev (Priporočeno)

### 1. Pripravi Okolje

```bash
# Kloniraj repozitorij
git clone https://github.com/your-org/omni-ultimate-system.git
cd omni-ultimate-system

# Kopiraj environment datoteko
cp .env.example .env
```

### 2. Konfiguriraj Environment (.env)

```bash
# Uredi .env datoteko z svojimi nastavitvami
nano .env

# Ključne nastavitve:
NODE_ENV=production
MONGO_URI=mongodb://omni_user:secure_password@mongodb:27017/omni_licenses
JWT_SECRET=your-super-secret-jwt-key-here
```

### 3. Generiraj SSL Certifikate

#### Linux/Mac:
```bash
cd certs
chmod +x generate-ssl.sh
./generate-ssl.sh
```

#### Windows PowerShell:
```powershell
cd certs
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
./generate-ssl.ps1
```

### 4. Zaženi Docker Compose

```bash
# Zgradi in zaženi vse storitve
docker-compose up -d

# Preveri status
docker-compose ps

# Poglej loge
docker-compose logs -f omni-app
```

### 5. Preveri Delovanje

```bash
# API Health Check
curl http://localhost:3000/api/health

# Admin Panel
# Odpri: http://localhost:3000/admin

# Client Panel
# Odpri: http://localhost:3000/client
```

## 💻 Lokalna Namestitev

### 1. Namesti Odvisnosti

```bash
# Kloniraj repozitorij
git clone https://github.com/your-org/omni-ultimate-system.git
cd omni-ultimate-system

# Namesti Node.js odvisnosti
npm install

# Namesti testne odvisnosti
cd tests
npm install
cd ..
```

### 2. Nastavi MongoDB

#### Lokalna MongoDB:
```bash
# Ustvari data direktorij
mkdir -p data/db

# Zaženi MongoDB
mongod --dbpath ./data/db --port 27017
```

#### MongoDB Atlas (Cloud):
```bash
# V .env nastavi:
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/omni_licenses
```

### 3. Konfiguriraj Environment

```bash
# Kopiraj in uredi .env
cp .env.example .env

# Ključne nastavitve za lokalno:
NODE_ENV=development
PORT=3000
WEBSOCKET_PORT=3001
MONGO_URI=mongodb://localhost:27017/omni_licenses
```

### 4. Zaženi Aplikacijo

```bash
# Razvojni način (z auto-reload)
npm run dev

# Produkcijski način
npm start

# V ločenem terminalu zaženi WebSocket strežnik
node websocket-server.js
```

## 🧪 Testiranje Namestitve

### 1. Zaženi Avtomatizirane Teste

```bash
# Vsi testi
cd tests
npm test

# Specifični testi
npm run test:api        # API testi
npm run test:websocket  # WebSocket testi
npm run test:client     # Client testi
```

### 2. Ročno Testiranje

#### API Testi:
```bash
# Health check
curl http://localhost:3000/api/health

# Ustvari demo licenco
curl -X POST http://localhost:3000/api/licenses \
  -H "Content-Type: application/json" \
  -d '{"client_id": "test123", "plan": "demo"}'

# Preveri licenco
curl http://localhost:3000/api/licenses/check/[LICENSE_KEY]
```

#### WebSocket Test:
```javascript
// V browser console
const socket = io('http://localhost:3001');
socket.on('connect', () => console.log('Connected!'));
socket.emit('heartbeat', { timestamp: Date.now() });
```

## 🔧 Napredna Konfiguracija

### SSL/HTTPS Konfiguracija

```bash
# Generiraj produkcijske certifikate
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes

# V .env nastavi:
SSL_ENABLED=true
SSL_CERT_PATH=./certs/cert.pem
SSL_KEY_PATH=./certs/key.pem
```

### MongoDB Replikacija

```yaml
# docker-compose.yml
mongodb:
  image: mongo:6.0
  command: mongod --replSet rs0
  environment:
    MONGO_INITDB_ROOT_USERNAME: omni_admin
    MONGO_INITDB_ROOT_PASSWORD: secure_password
```

### Redis Cache

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass your_redis_password
  ports:
    - "6379:6379"
```

### Nginx Reverse Proxy

```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🚨 Odpravljanje Napak

### Pogoste Napake

#### 1. MongoDB Connection Error
```bash
# Preveri ali MongoDB teče
ps aux | grep mongod

# Preveri port
netstat -tulpn | grep 27017

# Preveri loge
tail -f /var/log/mongodb/mongod.log
```

#### 2. Port Already in Use
```bash
# Najdi proces na portu
lsof -i :3000
netstat -tulpn | grep 3000

# Ustavi proces
kill -9 [PID]
```

#### 3. SSL Certificate Issues
```bash
# Preveri certifikat
openssl x509 -in certs/cert.pem -text -noout

# Regeneriraj certifikate
rm certs/*.pem
./certs/generate-ssl.sh
```

#### 4. Docker Issues
```bash
# Počisti Docker
docker-compose down -v
docker system prune -a

# Ponovno zgradi
docker-compose up -d --build
```

### Debug Način

```bash
# Omogoči debug logiranje
export DEBUG=omni:*
export LOG_LEVEL=debug

# Zaženi z debug
npm run dev
```

### Logiranje

```bash
# Poglej aplikacijske loge
tail -f logs/app.log

# Poglej error loge
tail -f logs/error.log

# Docker loge
docker-compose logs -f omni-app
```

## 📊 Performance Tuning

### MongoDB Optimizacija

```javascript
// Ustvari indekse
db.licenses.createIndex({ "license_key": 1 })
db.licenses.createIndex({ "client_id": 1 })
db.licenses.createIndex({ "expires_at": 1 })
db.licenses.createIndex({ "status": 1 })
```

### Node.js Optimizacija

```bash
# V .env nastavi:
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16
```

### WebSocket Optimizacija

```javascript
// V websocket-server.js
const io = new Server(server, {
  maxHttpBufferSize: 1e6,
  pingTimeout: 60000,
  pingInterval: 25000
});
```

## 🔒 Varnostne Nastavitve

### Firewall Konfiguracija

```bash
# Ubuntu/Debian
ufw allow 3000/tcp
ufw allow 3001/tcp
ufw allow 27017/tcp  # Samo za lokalni dostop

# CentOS/RHEL
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload
```

### Environment Varnost

```bash
# Nastavi varne dovoljenja
chmod 600 .env
chmod 600 certs/*.pem

# Ustvari backup
cp .env .env.backup
```

### MongoDB Varnost

```javascript
// Ustvari uporabnika
use omni_licenses
db.createUser({
  user: "omni_user",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "omni_licenses" }
  ]
})
```

## 📈 Skaliranje

### Horizontalno Skaliranje

```yaml
# docker-compose.yml
omni-app:
  deploy:
    replicas: 3
    update_config:
      parallelism: 1
      delay: 10s
    restart_policy:
      condition: on-failure
```

### Load Balancer

```nginx
upstream omni_backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    location / {
        proxy_pass http://omni_backend;
    }
}
```

## 🎯 Produkcijska Namestitev

### 1. Varnostni Pregled

```bash
# Preveri varnostne ranljivosti
npm audit
npm audit fix

# Preveri Docker varnost
docker scan omni-ultimate-system_omni-app
```

### 2. Backup Strategija

```bash
# MongoDB backup
mongodump --uri="mongodb://user:pass@localhost:27017/omni_licenses" --out=./backups/

# Aplikacijski backup
tar -czf backup-$(date +%Y%m%d).tar.gz .env logs/ uploads/
```

### 3. Monitoring Setup

```yaml
# docker-compose.yml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 📞 Podpora

Če naletite na težave med namestitvijo:

1. **Preverite FAQ** v README.md
2. **Poženite diagnostične teste**: `npm run test`
3. **Preverite loge**: `docker-compose logs -f`
4. **Odprite issue** na GitHub repozitoriju

---

**🎉 Čestitamo! Omni Ultimate Turbo Flow System je pripravljen za uporabo!**