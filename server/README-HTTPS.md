# Omni HTTPS Server z WebSocket podporo

🔒 Varen HTTPS strežnik z SSL/TLS šifriranjem, WebSocket podporo in upravljanjem licenc.

## ✨ Funkcionalnosti

- **🔒 HTTPS/SSL**: Varna komunikacija z SSL/TLS certifikati
- **🌐 WebSocket**: Real-time komunikacija preko Socket.IO
- **🔑 Upravljanje licenc**: API za preverjanje in ustvarjanje licenc
- **👤 Avtentikacija**: JWT-based avtentikacija z registracijo/prijavo
- **📊 MongoDB**: Podatkovna baza za licence in uporabnike
- **🛡️ Varnost**: CORS, helmet, bcrypt za gesla
- **📡 Real-time**: WebSocket dogodki za licence

## 🚀 Hitra namestitev

### 1. Zaženite setup skripto
```bash
# Windows
start-https-server.bat

# Linux/Mac
chmod +x start-https-server.sh
./start-https-server.sh
```

### 2. Konfigurirajte .env datoteko
```env
# Osnovne nastavitve
PORT=3000
MONGO_URI=mongodb://localhost:27017/omni
JWT_SECRET=your_super_secret_key_here

# SSL certifikati
SSL_CERT_PATH=../certs/fullchain.pem
SSL_KEY_PATH=../certs/privkey.pem
```

### 3. Zaženite strežnik
```bash
npm start
```

## 📋 API Endpoints

### 🔐 Avtentikacija
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "securepassword"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "securepassword"
}
```

### 🔑 Licence
```http
POST /api/license/check
Content-Type: application/json

{
  "licenseKey": "OMNI-1234567890-ABCDEF",
  "deviceId": "device-001"
}
```

```http
POST /api/license/create
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "userId": "user_id_here",
  "productId": "omni-pro",
  "expiryDate": "2024-12-31T23:59:59.000Z",
  "features": ["feature1", "feature2"],
  "maxDevices": 3
}
```

### 📊 Ostalo
```http
GET /health
# Preveri stanje strežnika

GET /api/licenses
Authorization: Bearer <admin_jwt_token>
# Pridobi vse licence (samo admin)

GET /api/user/licenses
Authorization: Bearer <jwt_token>
# Pridobi licence uporabnika
```

## 🌐 WebSocket Eventi

### Povezava
```javascript
const socket = io('https://localhost:3000');

socket.on('connect', () => {
  console.log('Povezan!');
});

socket.on('welcome', (data) => {
  console.log('Dobrodošli:', data.message);
});
```

### Ping/Pong test
```javascript
socket.emit('ping', { test: 'data' });

socket.on('pong', (data) => {
  console.log('Pong prejeto:', data.serverTime);
});
```

### Preverjanje licence
```javascript
socket.emit('license:verify', {
  licenseKey: 'OMNI-1234567890-ABCDEF',
  deviceId: 'device-001'
});

socket.on('license:verified', (data) => {
  if (data.valid) {
    console.log('Licenca veljavna:', data.license);
  } else {
    console.log('Licenca neveljavna:', data.error);
  }
});
```

### Naročilo na posodobitve licence
```javascript
socket.emit('license:subscribe', {
  licenseKey: 'OMNI-1234567890-ABCDEF'
});

socket.on('license:updated', (data) => {
  console.log('Licenca posodobljena:', data);
});
```

## 🔒 SSL Certifikati

### Produkcija
Postavite svoje SSL certifikate v `../certs/` mapo:
- `fullchain.pem` - SSL certifikat
- `privkey.pem` - Privatni ključ

### Razvoj
Strežnik bo avtomatsko ustvaril self-signed certifikate za testiranje.

## 🧪 Testiranje

### Zaženi vse teste
```bash
npm test
```

### Ročno testiranje
```bash
# Test health endpoint
curl -k https://localhost:3000/health

# Test license API
curl -k -X POST https://localhost:3000/api/license/check \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"TEST-KEY","deviceId":"test-device"}'
```

## 📊 MongoDB Modeli

### Licenca
```javascript
{
  licenseKey: String,      // Unikaten ključ licence
  userId: String,          // ID uporabnika
  productId: String,       // ID produkta
  status: String,          // 'active', 'expired', 'suspended'
  expiryDate: Date,        // Datum poteka
  features: [String],      // Seznam funkcionalnosti
  maxDevices: Number,      // Maksimalno število naprav
  currentDevices: Number,  // Trenutno število naprav
  createdAt: Date,         // Datum ustvarjanja
  lastUsed: Date          // Zadnja uporaba
}
```

### Uporabnik
```javascript
{
  username: String,        // Uporabniško ime
  email: String,          // E-pošta
  password: String,       // Hashirano geslo
  role: String,           // 'user', 'admin'
  licenses: [ObjectId],   // Reference na licence
  createdAt: Date,        // Datum registracije
  lastLogin: Date         // Zadnja prijava
}
```

## 🛠️ Razvoj

### Zagon v development načinu
```bash
npm run dev
```

### Struktura datotek
```
server/
├── https-server.js          # Glavni HTTPS strežnik
├── test-https-server.js     # Testna skripta
├── package-https.json       # NPM odvisnosti
├── start-https-server.bat   # Windows startup skripta
├── .env.example            # Primer konfiguracije
└── README-HTTPS.md         # Ta dokumentacija
```

## 🔧 Troubleshooting

### Strežnik se ne zažene
1. Preverite, ali je MongoDB zagnan
2. Preverite, ali je port 3000 prost
3. Preverite SSL certifikate
4. Preverite .env konfiguracijo

### WebSocket se ne poveže
1. Preverite CORS nastavitve
2. Preverite firewall nastavitve
3. Preverite SSL certifikate

### Licence ne delujejo
1. Preverite MongoDB povezavo
2. Preverite JWT_SECRET v .env
3. Preverite API ključe

## 📈 Produkcija

### Priporočene nastavitve
```env
NODE_ENV=production
PORT=443
USE_HTTPS=true
JWT_SECRET=very_long_random_string_here
CORS_ORIGIN=https://yourdomain.com
```

### Varnostni nasveti
- Uporabite močan JWT_SECRET
- Nastavite pravilne CORS origins
- Uporabite veljavne SSL certifikate
- Redno posodabljajte odvisnosti
- Omogočite rate limiting

## 📞 Podpora

Za vprašanja in podporo kontaktirajte razvojno ekipo ali odprite issue v repozitoriju.

---

🎉 **Uspešno ste namestili Omni HTTPS Server!**