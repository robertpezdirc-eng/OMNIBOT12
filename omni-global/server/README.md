# Omni Global License Server

Robustni Express.js strežnik za upravljanje licenc z HTTPS podporo, JWT avtentifikacijo, MongoDB integracijo in Socket.IO za realnočasne posodobitve.

## 🚀 Funkcionalnosti

- **HTTPS podpora** z SSL certifikati iz `./certs` direktorija
- **RESTful API** za upravljanje licenc
- **JWT avtentifikacija** z iztekom licenc
- **MongoDB integracija** za shranjevanje podatkov
- **Socket.IO** za realnočasne posodobitve
- **Varnostne prakse** (Helmet, CORS, Rate limiting)
- **Validacija podatkov** z express-validator
- **Graceful shutdown** in error handling

## 📋 Predpogoji

- Node.js 16+ 
- MongoDB 4.4+
- SSL certifikati (za HTTPS)

## 🛠️ Namestitev

1. **Kloniraj repozitorij**
```bash
cd server
```

2. **Namesti odvisnosti**
```bash
npm install
```

3. **Konfiguriraj okoljske spremenljivke**
```bash
cp .env.example .env
# Uredi .env datoteko z ustreznimi vrednostmi
```

4. **Pripravi SSL certifikate** (opcijsko)
```bash
mkdir certs
# Kopiraj fullchain.pem in privkey.pem v certs/ direktorij
```

5. **Zaženi strežnik**
```bash
# Razvojni način
npm run dev

# Produkcijski način
npm start
```

## 🔧 Konfiguracija

### Okoljske spremenljivke

| Spremenljivka | Privzeto | Opis |
|---------------|----------|------|
| `NODE_ENV` | `development` | Okolje izvajanja |
| `PORT` | `3000` | HTTP port |
| `SSL_PORT` | `3443` | HTTPS port |
| `SSL_ENABLED` | `true` | Omogoči HTTPS |
| `SSL_CERT_PATH` | `./certs/fullchain.pem` | Pot do SSL certifikata |
| `SSL_KEY_PATH` | `./certs/privkey.pem` | Pot do SSL ključa |
| `MONGO_URI` | `mongodb://localhost:27017/omni` | MongoDB povezava |
| `JWT_SECRET` | - | JWT skrivni ključ |
| `CORS_ORIGIN` | `*` | CORS nastavitve |
| `ADMIN_USERNAME` | `admin` | Admin uporabniško ime |
| `ADMIN_PASSWORD` | `admin123` | Admin geslo |

## 📡 API Dokumentacija

### Avtentifikacija

Večina končnih točk zahteva JWT žeton v Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Končne točke

#### 🔐 Avtentifikacija

**POST** `/api/auth/login`
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Odgovor:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

#### 📄 Ustvarjanje licence

**POST** `/api/license/create`
```json
{
  "user_id": "user123",
  "product_name": "Omni Pro",
  "expires_at": "2024-12-31T23:59:59.000Z",
  "max_usage": 100,
  "metadata": {
    "version": "1.0",
    "features": ["feature1", "feature2"]
  }
}
```

**Odgovor:**
```json
{
  "success": true,
  "message": "License created successfully",
  "data": {
    "license_id": "uuid-here",
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "token": "jwt_token_for_license",
    "user_id": "user123",
    "product_name": "Omni Pro",
    "is_active": true,
    "expires_at": "2024-12-31T23:59:59.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "max_usage": 100
  }
}
```

#### ✅ Preverjanje licence

**GET** `/api/license/check?license_key=XXXX-XXXX-XXXX-XXXX`

**Odgovor:**
```json
{
  "success": true,
  "valid": true,
  "data": {
    "license_id": "uuid-here",
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "user_id": "user123",
    "product_name": "Omni Pro",
    "is_active": true,
    "expires_at": "2024-12-31T23:59:59.000Z",
    "last_checked": "2024-01-15T10:35:00.000Z",
    "usage_count": 5,
    "max_usage": 100,
    "days_remaining": 350
  }
}
```

#### 🔄 Preklapljanje licence

**PUT** `/api/license/toggle`
```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "is_active": false
}
```

**Odgovor:**
```json
{
  "success": true,
  "message": "License deactivated successfully",
  "data": {
    "license_id": "uuid-here",
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "user_id": "user123",
    "product_name": "Omni Pro",
    "is_active": false,
    "expires_at": "2024-12-31T23:59:59.000Z",
    "updated_at": "2024-01-15T10:40:00.000Z"
  }
}
```

#### 📋 Seznam licenc (Admin)

**GET** `/api/licenses?page=1&limit=10&is_active=true&user_id=user123`

**Odgovor:**
```json
{
  "success": true,
  "data": [
    {
      "license_id": "uuid-here",
      "license_key": "XXXX-XXXX-XXXX-XXXX",
      "user_id": "user123",
      "product_name": "Omni Pro",
      "is_active": true,
      "expires_at": "2024-12-31T23:59:59.000Z",
      "created_at": "2024-01-15T10:30:00.000Z",
      "usage_count": 5,
      "max_usage": 100
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### 🏥 Zdravstveno preverjanje

**GET** `/api/health`

**Odgovor:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:45:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "database": "connected"
}
```

## 🔌 Socket.IO Dogodki

Strežnik oddaja realnočasne posodobitve preko Socket.IO:

### Dogodki, ki jih oddaja strežnik:

- **`connected`** - Ko se odjemalec poveže
- **`license_update`** - Ko se licenca ustvari, preveri ali preklaplja

**Primer `license_update` dogodka:**
```json
{
  "action": "created|checked|toggled",
  "license": {
    "license_id": "uuid-here",
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "user_id": "user123",
    "is_active": true,
    "expires_at": "2024-12-31T23:59:59.000Z"
  },
  "timestamp": "2024-01-15T10:50:00.000Z"
}
```

### Povezava z Socket.IO odjemalcem:

```javascript
const io = require('socket.io-client');
const socket = io('https://localhost:3443');

socket.on('connected', (data) => {
  console.log('Connected:', data.message);
});

socket.on('license_update', (data) => {
  console.log('License update:', data);
});
```

## 🛡️ Varnost

- **Helmet.js** za HTTP varnostne glave
- **CORS** konfiguracija
- **Rate limiting** (100 zahtev na 15 minut)
- **Input validacija** z express-validator
- **JWT žetoni** z iztekom
- **HTTPS** podpora z SSL certifikati
- **Graceful shutdown** za varno zaustavitev

## 🧪 Testiranje

```bash
# Zaženi teste
npm test

# Preveri zdravje strežnika
curl -k https://localhost:3443/api/health

# Testiraj ustvarjanje licence
curl -X POST https://localhost:3443/api/license/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "product_name": "Test Product",
    "expires_at": "2024-12-31T23:59:59.000Z"
  }'
```

## 📊 Monitoring

Strežnik vključuje:
- **Morgan** za HTTP logiranje
- **Health check** končno točko
- **Graceful shutdown** z ustreznim čiščenjem
- **Error handling** z strukturiranimi odgovori

## 🚀 Produkcijska uporaba

1. **Nastavi SSL certifikate**
2. **Konfiguriraj MongoDB replike**
3. **Nastavi reverse proxy (Nginx)**
4. **Konfiguriraj monitoring (Prometheus/Grafana)**
5. **Nastavi backup strategijo**
6. **Uporabi process manager (PM2)**

```bash
# PM2 deployment
npm install -g pm2
pm2 start server.js --name "omni-license-server"
pm2 startup
pm2 save
```

## 🐛 Odpravljanje težav

### Pogoste težave:

1. **SSL certifikati niso najdeni**
   - Preveri poti v `.env` datoteki
   - Nastavi `SSL_ENABLED=false` za HTTP način

2. **MongoDB povezava neuspešna**
   - Preveri `MONGO_URI` v `.env`
   - Zagotovi, da MongoDB teče

3. **Port že v uporabi**
   - Spremeni `PORT` ali `SSL_PORT` v `.env`
   - Preveri tekoče procese: `netstat -tulpn | grep :3000`

### Logi:

```bash
# Preveri loge
tail -f logs/app.log

# Docker logi
docker logs omni-license-server
```

## 📝 Licenca

MIT License - glej LICENSE datoteko za podrobnosti.

## 🤝 Prispevki

1. Fork repozitorij
2. Ustvari feature branch
3. Commit spremembe
4. Push v branch
5. Ustvari Pull Request

## 📞 Podpora

Za vprašanja in podporo kontaktiraj razvojno ekipo.