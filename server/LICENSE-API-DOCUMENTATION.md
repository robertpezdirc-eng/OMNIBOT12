# 🔐 License Management API Documentation

## Pregled

Popoln sistem za upravljanje licenc z HTTPS API končnimi točkami in WebSocket podporo za real-time komunikacijo.

## 🚀 Zagon strežnika

```bash
cd server
npm install
node complete-https-server.js
```

Server se zažene na: `https://localhost:3002`

## 📋 API Končne točke

### 1️⃣ License Verification Endpoint

**POST** `/api/license/check`

Preveri veljavnost licence za določen client_id.

**Vhodni podatki:**
```json
{
  "client_id": "unique-client-identifier",
  "license_key": "uuid-license-key"
}
```

**Odgovor (veljavna licenca):**
```json
{
  "valid": true,
  "modules": ["module1", "module2"],
  "license": {
    "key": "uuid-license-key",
    "clientId": "unique-client-identifier",
    "plan": "premium",
    "status": "active",
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "modules": ["module1", "module2"]
  }
}
```

**Odgovor (neveljavna licenca):**
```json
{
  "valid": false
}
```

**Logika:**
- Če licenca ne obstaja ali je preklicana → `{ valid: false }`
- Če je `expires_at < trenutni čas` → `{ valid: false }`
- Če je vse v redu → `{ valid: true, modules }`

### 2️⃣ License Creation Endpoint

**POST** `/api/license/create`

Ustvari novo licenco za client_id.

**Vhodni podatki:**
```json
{
  "client_id": "unique-client-identifier",
  "plan": "premium",
  "modules": ["module1", "module2"],
  "expires_at": "2024-12-31T23:59:59.000Z"
}
```

**Odgovor:**
```json
{
  "license_key": "generated-uuid-key",
  "expires_at": "2024-12-31T23:59:59.000Z",
  "client_id": "unique-client-identifier",
  "plan": "premium",
  "modules": ["module1", "module2"],
  "status": "active"
}
```

**Logika:**
- Generiraj unikatni `license_key` (UUID4)
- Shrani v MongoDB: `client_id`, `license_key`, `plan`, `expires_at`, `modules`
- Vrni `{ license_key, expires_at }`

### 3️⃣ License Toggle Endpoint

**POST** `/api/license/toggle`

Preklopi status licence (aktivna ↔ suspendirana).

**Vhodni podatki:**
```json
{
  "client_id": "unique-client-identifier"
}
```

**Odgovor:**
```json
{
  "success": true,
  "client_id": "unique-client-identifier",
  "license_key": "uuid-license-key",
  "status": "suspended",
  "message": "License deactivated successfully"
}
```

**Logika:**
- Najdi licenco po `client_id`
- Če je aktivna → deaktiviraj, če je neaktivna → aktiviraj
- Posodobi MongoDB
- Pošlji WebSocket event `license_update` vsem klientom

### 4️⃣ License Extend Endpoint

**POST** `/api/license/extend`

Podaljša licenco za določeno število dni.

**Vhodni podatki:**
```json
{
  "client_id": "unique-client-identifier",
  "extra_days": 30
}
```

**Odgovor:**
```json
{
  "success": true,
  "client_id": "unique-client-identifier",
  "license_key": "uuid-license-key",
  "expires_at": "2025-01-30T23:59:59.000Z",
  "extended_days": 30,
  "message": "License extended by 30 days"
}
```

**Logika:**
- Posodobi `expires_at += extra_days`
- Pošlji WebSocket event `license_update`

## 🔌 WebSocket Events

### Povezava
```javascript
const socket = io('wss://localhost:3002');
```

### 1️⃣ Ping/Pong Test
```javascript
// Pošlji ping
socket.emit('ping', { message: 'test' });

// Prejmi pong
socket.on('pong', (data) => {
  console.log('Pong received:', data);
});
```

### 2️⃣ System Messages
```javascript
// Pošlji sistemsko sporočilo
socket.emit('system_message', {
  message: 'Server maintenance in 5 minutes',
  type: 'warning'
});

// Prejmi sistemsko sporočilo
socket.on('system_message', (data) => {
  console.log('System message:', data.message);
});
```

### 3️⃣ Admin Messages
```javascript
// Pošlji admin sporočilo
socket.emit('admin_message', {
  message: 'New feature released!',
  priority: 'high'
});

// Prejmi admin sporočilo
socket.on('system_message', (data) => {
  if (data.type === 'admin') {
    console.log('Admin message:', data.message);
  }
});
```

### 4️⃣ License Updates
```javascript
// Poslušaj posodobitve licenc
socket.on('license_update', (data) => {
  console.log('License updated:', data);
  // data.client_id, data.license_key, data.status, data.expires_at
});
```

## 🔒 Varnost

### Okoljske spremenljivke (.env)
```env
# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# MongoDB URI
MONGODB_URI=mongodb://localhost:27017/omni_license_system

# CORS
CORS_ORIGIN=*
WEBSOCKET_CORS_ORIGIN=*

# HTTPS
USE_HTTPS=true
SSL_KEY_PATH=../certs/privkey.pem
SSL_CERT_PATH=../certs/fullchain.pem
```

### Priporočila
- **HTTPS + WSS**: Vedno uporabljaj šifrirane povezave
- **JWT_SECRET**: Uporabi močan, naključen ključ
- **MONGO_URI**: Zaščiti dostop do baze podatkov
- **License Token**: Shrani varno na strani klienta

## 📊 MongoDB Schema

```javascript
const LicenseSchema = {
  licenseKey: String,      // UUID4 ključ
  clientId: String,        // Unikatni ID klienta
  userId: ObjectId,        // Referenca na uporabnika
  plan: String,            // trial, basic, premium, enterprise
  status: String,          // active, expired, suspended, revoked
  expiresAt: Date,         // Datum poteka
  modules: [String],       // Seznam modulov
  createdAt: Date,         // Datum ustvarjanja
  updatedAt: Date          // Datum zadnje posodobitve
}
```

## 🧪 Testiranje

### cURL Primeri

**1. Preveri licenco:**
```bash
curl -X POST https://localhost:3002/api/license/check \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test-client","license_key":"test-key"}' \
  -k
```

**2. Ustvari licenco:**
```bash
curl -X POST https://localhost:3002/api/license/create \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test-client","plan":"premium","modules":["module1"]}' \
  -k
```

**3. Preklopi licenco:**
```bash
curl -X POST https://localhost:3002/api/license/toggle \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test-client"}' \
  -k
```

**4. Podaljšaj licenco:**
```bash
curl -X POST https://localhost:3002/api/license/extend \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test-client","extra_days":30}' \
  -k
```

### WebSocket Test (JavaScript)
```html
<!DOCTYPE html>
<html>
<head>
    <title>License WebSocket Test</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
    <script>
        const socket = io('wss://localhost:3002', {
            rejectUnauthorized: false
        });
        
        socket.on('connect', () => {
            console.log('Connected to server');
            
            // Test ping
            socket.emit('ping', { test: 'data' });
        });
        
        socket.on('pong', (data) => {
            console.log('Pong received:', data);
        });
        
        socket.on('license_update', (data) => {
            console.log('License update:', data);
        });
        
        socket.on('system_message', (data) => {
            console.log('System message:', data);
        });
    </script>
</body>
</html>
```

## 🎯 Uporaba v produkciji

1. **SSL Certifikati**: Uporabi veljavne SSL certifikate
2. **MongoDB**: Nastavi produkcijsko MongoDB bazo
3. **Varnost**: Omeji CORS na specifične domene
4. **Monitoring**: Dodaj logiranje in monitoring
5. **Rate Limiting**: Implementiraj omejitve zahtevkov
6. **Authentication**: Dodaj avtentifikacijo za admin funkcije

## 📈 Naslednji koraki

- [ ] Admin dashboard za upravljanje licenc
- [ ] Email obvestila ob poteku licenc
- [ ] Statistike uporabe licenc
- [ ] Backup in restore funkcionalnosti
- [ ] Load balancing za večje obremenitve