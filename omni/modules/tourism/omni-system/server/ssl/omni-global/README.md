# 🌐 Omni Global License System

Ready-to-deploy paket za globalni sistem upravljanja licenc z Docker, SSL, WebSocket in GUI komponentami.

## 🚀 Hitri zagon

### Predpogoji
- Docker in Docker Compose
- Node.js 20+ (za lokalni razvoj)
- 3GB prostega prostora na disku

### 1. Kloniraj in pripravi
```bash
git clone <repository>
cd omni-global
```

### 2. Zaženi z Docker Compose
```bash
# Zgradi in zaženi vse storitve
docker-compose up --build

# Za ozadje
docker-compose up -d --build
```

### 3. Dostop do aplikacij
- **Server API**: https://localhost:3000
- **Admin Panel**: http://localhost:4000
- **Client Panel**: http://localhost:5000
- **MongoDB**: localhost:27017

## 📁 Struktura projekta

```
omni-global/
├─ server/              # HTTPS API strežnik z WebSocket
│   ├─ server.js        # Glavni strežnik
│   ├─ routes/          # API endpoints
│   ├─ models/          # MongoDB modeli
│   └─ utils/           # Pomožne funkcije
├─ admin/               # Admin GUI aplikacija
│   ├─ main.js          # Admin strežnik
│   └─ index.html       # Admin vmesnik
├─ client/              # Client Panel aplikacija
│   ├─ main.js          # Client strežnik
│   └─ index.html       # Client vmesnik
├─ certs/               # SSL certifikati
├─ docker-compose.yml   # Docker orkestracija
├─ Dockerfile-server    # Server container
└─ Dockerfile-admin     # Admin container
```

## 🔐 SSL Certifikati

### Avtomatska generacija (razvoj)
```bash
cd certs
node generate-ssl.js
```

### Produkcijski certifikati
Zamenjaj `certs/privkey.pem` in `certs/fullchain.pem` z veljavnimi SSL certifikati.

## 🛠️ API Endpoints

### License Management
- `GET /api/license` - Seznam vseh licenc
- `GET /api/license/:key` - Validacija licence
- `POST /api/license` - Ustvari novo licenco
- `PUT /api/license/:key` - Posodobi licenco
- `DELETE /api/license/:key` - Prekliči licenco
- `GET /api/license/stats/overview` - Statistike

### WebSocket Events
- `license_update` - Real-time posodobitve licenc
- `license_request` - Zahteve za validacijo

## 🎛️ Admin Panel Funkcionalnosti

- **Dashboard**: Pregled statistik in metrik
- **License Management**: CRUD operacije za licence
- **Real-time Monitoring**: WebSocket posodobitve
- **Search & Filter**: Iskanje po licencah
- **Bulk Operations**: Množične operacije

## 👥 Client Panel Funkcionalnosti

- **License Validation**: Preverjanje veljavnosti licenc
- **Real-time Status**: Takojšnje posodobitve
- **User-friendly Interface**: Enostaven vmesnik
- **Mobile Responsive**: Prilagojeno mobilnim napravam

## 🔧 Konfiguracija

### Okoljske spremenljivke

#### Server (.env)
```env
MONGO_URI=mongodb://omni:omni123@mongo:27017/omni?authSource=admin
JWT_SECRET=super_secret_key
PORT=3000
```

#### Admin (.env)
```env
SERVER_URL=https://server:3000
PORT=4000
```

#### Client (.env)
```env
SERVER_URL=https://server:3000
PORT=5000
```

## 📊 MongoDB Shema

### License Model
```javascript
{
  licenseKey: String,      // Unikaten ključ
  clientId: String,        // ID stranke
  clientName: String,      // Ime stranke
  email: String,           // Email
  product: String,         // Produkt (omni-tourism, omni-restaurant, ...)
  plan: String,            // Paket (basic, pro, enterprise)
  status: String,          // Status (active, suspended, expired, revoked)
  issuedAt: Date,          // Datum izdaje
  expiresAt: Date,         // Datum poteka
  lastUsed: Date,          // Zadnja uporaba
  usageCount: Number,      // Število uporab
  maxUsage: Number,        // Maksimalno število uporab (-1 = unlimited)
  features: [String],      // Seznam funkcionalnosti
  metadata: Object         // Dodatni podatki
}
```

## 🚀 Deployment

### Docker Production
```bash
# Produkcijski build
docker-compose -f docker-compose.prod.yml up --build -d

# Skaliranje
docker-compose up --scale server=3 --scale admin=2
```

### Kubernetes
```yaml
# Primer k8s deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: omni-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: omni-server
  template:
    metadata:
      labels:
        app: omni-server
    spec:
      containers:
      - name: server
        image: omni-server:latest
        ports:
        - containerPort: 3000
```

### Nginx Reverse Proxy
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    location /api/ {
        proxy_pass https://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /admin/ {
        proxy_pass http://localhost:4000;
    }
    
    location /client/ {
        proxy_pass http://localhost:5000;
    }
}
```

## 🔍 Monitoring in Logging

### Health Checks
- Server: `GET /health`
- Admin: `GET /health`
- Client: `GET /health`

### Logs
```bash
# Docker logs
docker-compose logs -f server
docker-compose logs -f admin
docker-compose logs -f client

# Specifični container
docker logs omni-server -f
```

## 🛡️ Varnost

### Implementirane varnostne funkcije
- **HTTPS**: SSL/TLS enkripcija
- **Helmet**: HTTP security headers
- **Rate Limiting**: Omejitev zahtev
- **CORS**: Cross-origin resource sharing
- **Input Validation**: Validacija vhodnih podatkov
- **JWT**: JSON Web Tokens za avtentifikacijo

### Priporočila za produkcijo
1. Uporabi veljavne SSL certifikate
2. Nastavi močne gesla za MongoDB
3. Omeji dostop do admin panela
4. Implementiraj backup strategijo
5. Nastavi monitoring in alerting

## 🔄 Backup in Restore

### MongoDB Backup
```bash
# Backup
docker exec omni-mongo mongodump --authenticationDatabase admin -u omni -p omni123 --out /backup

# Restore
docker exec omni-mongo mongorestore --authenticationDatabase admin -u omni -p omni123 /backup
```

## 📈 Performance Tuning

### MongoDB Optimizacije
- Indeksi na pogosto iskanih poljih
- Connection pooling
- Read replicas za skalabilnost

### Node.js Optimizacije
- Cluster mode za multi-core
- PM2 za process management
- Redis za session storage

## 🐛 Troubleshooting

### Pogoste težave

#### SSL Certificate Error
```bash
# Regeneriraj certifikate
cd certs
rm *.pem
node generate-ssl.js
```

#### MongoDB Connection Error
```bash
# Preveri MongoDB status
docker-compose logs mongo

# Restart MongoDB
docker-compose restart mongo
```

#### Port Already in Use
```bash
# Najdi proces na portu
netstat -tulpn | grep :3000

# Ustavi proces
kill -9 <PID>
```

## 📞 Podpora

Za tehnično podporo in vprašanja:
- Email: support@omni-system.com
- GitHub Issues: [Repository Issues]
- Dokumentacija: [Wiki]

## 📄 Licenca

MIT License - glej LICENSE datoteko za podrobnosti.

---

**Omni Global License System** - Univerzalna rešitev za upravljanje licenc v realnem času. 🚀