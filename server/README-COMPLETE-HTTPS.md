# Popoln HTTPS Strežnik z WebSocket Podporo

## Pregled

Ta strežnik predstavlja popolno implementacijo HTTPS strežnika z WebSocket podporo, MongoDB integracijo in celovitimi API končnimi točkami za upravljanje uporabnikov in licenc.

## ✅ Uspešno Implementirane Funkcionalnosti

### 🔒 HTTPS Strežnik
- ✅ SSL/TLS šifriranje z samo-podpisanimi certifikati
- ✅ Express.js framework z varnostnimi middleware-i
- ✅ CORS podpora za cross-origin zahtevke
- ✅ Helmet.js za dodatno varnost
- ✅ Gzip kompresija za optimizacijo

### 🔌 WebSocket Podpora
- ✅ Socket.IO integracija za real-time komunikacijo
- ✅ Ping/Pong testiranje povezav
- ✅ Real-time licenčna verifikacija
- ✅ Real-time posodobitve licenc
- ✅ Broadcast sporočila vsem klientom

### 👤 Upravljanje Uporabnikov
- ✅ Registracija uporabnikov z bcrypt hash-iranjem gesel
- ✅ Prijava uporabnikov z JWT token avtentikacijo
- ✅ Middleware za preverjanje JWT tokenov
- ✅ Varno shranjevanje uporabniških podatkov

### 🔐 Licenčni Sistem
- ✅ Kreiranje novih licenc z različnimi tipi
- ✅ Verifikacija licenc preko API in WebSocket
- ✅ Upravljanje licenčnih funkcionalnosti
- ✅ Preverjanje veljavnosti in poteka licenc

### 🗄️ MongoDB Integracija
- ✅ Mongoose ODM za MongoDB
- ✅ Uporabniški model z validacijo
- ✅ Licenčni model z referencami
- ✅ Graceful degradation (deluje tudi brez MongoDB)

## 🚀 Zagon Strežnika

### Predpogoji
```bash
npm install express socket.io mongoose bcryptjs jsonwebtoken cors helmet compression dotenv selfsigned
```

### Konfiguracija (.env datoteka)
```env
PORT=3002
NODE_ENV=development
USE_HTTPS=true
GLOBAL_SERVER_URL=https://localhost:3002
FALLBACK_SERVER_URL=https://localhost:3002
JWT_SECRET=your_jwt_secret_here
MONGODB_URI=mongodb://localhost:27017/omni_licenses
CORS_ORIGIN=*
WEBSOCKET_CORS_ORIGIN=*
```

### Zagon
```bash
cd server
node complete-https-server.js
```

## 📡 API Končne Točke

### Zdravstveno Preverjanje
```http
GET /health
```
**Odgovor:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-24T13:17:13.381Z",
  "ssl": true,
  "websocket": true,
  "mongodb": false,
  "version": "1.0.0"
}
```

### Avtentikacija

#### Registracija Uporabnika
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "securepassword123"
}
```

#### Prijava Uporabnika
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "securepassword123"
}
```

### Licenčno Upravljanje

#### Verifikacija Licence
```http
GET /api/licenses/verify/OMNI-1727180233425-ABC123DEF
```

#### Kreiranje Licence (zahteva avtentikacijo)
```http
POST /api/licenses/create
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "type": "premium",
  "durationDays": 365,
  "features": ["advanced_analytics", "priority_support"]
}
```

#### Pridobitev Uporabnikovih Licenc
```http
GET /api/licenses/my
Authorization: Bearer your_jwt_token
```

## 🔌 WebSocket Dogodki

### Povezava
```javascript
const socket = io('https://localhost:3002', {
  rejectUnauthorized: false // Za samo-podpisane certifikate
});
```

### Dostopni Dogodki

#### Ping/Pong Test
```javascript
// Pošlji ping
socket.emit('ping', { message: 'Test ping', timestamp: new Date().toISOString() });

// Prejmi pong
socket.on('pong', (data) => {
  console.log('Pong received:', data);
});
```

#### Licenčna Verifikacija
```javascript
// Pošlji zahtevo za verifikacijo
socket.emit('license:verify', { licenseKey: 'OMNI-123-ABC' });

// Prejmi rezultat
socket.on('license:result', (data) => {
  console.log('License verification:', data);
});
```

#### Posodobitev Licence
```javascript
// Pošlji zahtevo za posodobitev
socket.emit('license:update', {
  licenseKey: 'OMNI-123-ABC',
  updates: { status: 'suspended' }
});

// Prejmi rezultat
socket.on('license:update:result', (data) => {
  console.log('License update result:', data);
});
```

## 🧪 Testiranje

### Zagon Testov
```bash
node test-complete-server.js
```

### Testni Rezultati
Testi preverjajo:
- ✅ HTTPS API končne točke (status 200)
- ✅ WebSocket povezavo in komunikacijo
- ✅ Ping/Pong funkcionalnost
- ✅ Real-time licenčno verifikacijo
- ⚠️ Registracijo uporabnikov (zahteva MongoDB)

## 🔧 Trenutno Stanje

### ✅ Delujoče Funkcionalnosti
- HTTPS strežnik na portu 3002
- WebSocket komunikacija
- API končne točke za zdravstveno preverjanje
- Real-time ping/pong testiranje
- Licenčna verifikacija preko WebSocket
- SSL šifriranje z samo-podpisanimi certifikati

### ⚠️ Opozorila
- MongoDB ni povezan (strežnik deluje brez baze)
- Registracija uporabnikov zahteva MongoDB
- Uporabljajo se samo-podpisani SSL certifikati

### 🔄 Naslednji Koraki
1. **MongoDB Setup**: Namesti in konfiguriraj MongoDB za polno funkcionalnost
2. **SSL Certifikati**: Pridobi veljavne SSL certifikate za produkcijo
3. **Varnostne Izboljšave**: Implementiraj rate limiting in dodatne varnostne ukrepe
4. **Monitoring**: Dodaj logging in monitoring funkcionalnosti

## 🌐 Dostop

- **HTTPS Server**: https://localhost:3002
- **WebSocket**: wss://localhost:3002
- **Health Check**: https://localhost:3002/health
- **Server PID**: Prikazan ob zagonu

## 🛡️ Varnost

- JWT token avtentikacija
- Bcrypt hash-iranje gesel
- Helmet.js varnostni middleware
- CORS konfiguracija
- SSL/TLS šifriranje
- Input validacija in sanitizacija

## 📝 Logi

Strežnik prikazuje podrobne loge za:
- Zagon strežnika in konfiguracija
- WebSocket povezave in dogodke
- API zahtevke in odgovore
- Napake in opozorila
- MongoDB povezavo (če je na voljo)

Strežnik je pripravljen za produkcijsko uporabo z dodatno konfiguracijo MongoDB in SSL certifikatov.