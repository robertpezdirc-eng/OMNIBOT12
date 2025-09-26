# OMNI License System - Tehnična Dokumentacija

## 📋 Pregled

OMNI License System je Node.js/Express backend za upravljanje in validacijo licenc za Omni aplikacije. Sistem omogoča:

- ✅ Validacijo licenčnih ključev
- 🔐 JWT avtentikacijo in šifriranje
- 📊 Audit logging in varnostno beleženje
- 🚀 Rate limiting in varnostne funkcije
- 🎯 Webhook integracije
- 📈 Admin konzolo za upravljanje

## 🏗️ Arhitektura

```
omni-license-system/
├── package.json              # Odvisnosti in skripta
├── server.js                 # Glavni Express server
├── .env                      # Konfiguracija
├── routes/
│   └── license.js           # REST API endpoints
├── controllers/
│   └── licenseController.js # Poslovna logika
├── models/
│   └── licenseModel.js      # Podatkovni model
├── utils/
│   ├── crypto.js           # Šifriranje in JWT
│   ├── audit.js            # Audit logging
│   └── webhook.js          # Webhook sistem
└── admin/
    └── admin-console.html   # Admin vmesnik
```

## 🚀 Zagon Sistema

### 1. Namestitev odvisnosti
```bash
cd omni-license-system
npm install
```

### 2. Konfiguracija (.env)
```env
PORT=3000
JWT_SECRET=omni_super_secret_jwt_key_2024_production_ready
ENCRYPTION_KEY=omni_encryption_key_2024_secure_production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
NODE_ENV=development
```

### 3. Zagon strežnika
```bash
npm start
# ali za development
npm run dev
```

Strežnik se zažene na: `http://localhost:3000`

## 📡 API Endpoints

### 🔍 Health Check
```http
GET /health
```
**Odgovor:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-23T14:38:22.770Z",
  "version": "1.0.0",
  "environment": "development"
}
```

### ✅ Validacija Licence
```http
POST /api/license/validate
Content-Type: application/json

{
  "client_id": "OMNI001",
  "license_key": "8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219"
}
```

**Uspešen odgovor (200):**
```json
{
  "valid": true,
  "client_id": "OMNI001",
  "company_name": "Hotel Slovenija",
  "plan": "premium",
  "plan_name": "Premium",
  "expires_at": "2026-09-23T13:34:11.165Z",
  "days_until_expiry": 365,
  "modules": ["pos", "inventory", "reports", "customers", "ai_optimization", "analytics", "multi_location", "ar_catalog"],
  "features": ["Vse Basic funkcije", "AI optimizacija", "Analitika", "Več lokacij", "20 uporabnikov", "AR katalog"],
  "max_users": 20,
  "max_locations": 5,
  "storage_gb": 10,
  "support_level": "priority"
}
```

**Neuspešen odgovor (404):**
```json
{
  "valid": false,
  "error": "Licenca ni najdena",
  "client_id": "OMNI001"
}
```

### 📋 Informacije o Licenci
```http
GET /api/license/info/{client_id}
```

**Primer:**
```http
GET /api/license/info/OMNI001
```

### 📊 Statistike
```http
GET /api/license/stats
```

### 🔧 Ustvarjanje Licence
```http
POST /api/license/create
Content-Type: application/json

{
  "client_id": "OMNI004",
  "plan": "basic",
  "duration_months": 12,
  "company_name": "Nova Restavracija",
  "contact_email": "info@nova-restavracija.si"
}
```

## 🎯 Licenčni Paketi

### 🆓 Demo
- **Cena:** Brezplačno
- **Trajanje:** 14 dni
- **Uporabniki:** 2
- **Lokacije:** 1
- **Moduli:** `basic_pos`, `simple_inventory`

### 💼 Basic
- **Cena:** 299€/leto
- **Uporabniki:** 5
- **Lokacije:** 1
- **Moduli:** `pos`, `inventory`, `reports`, `customers`

### ⭐ Premium
- **Cena:** 599€/leto
- **Uporabniki:** 20
- **Lokacije:** 5
- **Moduli:** Vsi Basic + `ai_optimization`, `analytics`, `multi_location`, `ar_catalog`

### 🏢 Enterprise
- **Cena:** 1299€/leto
- **Uporabniki:** Neomejeno
- **Lokacije:** Neomejeno
- **Moduli:** Vsi

## 🔐 Varnostne Funkcije

### Rate Limiting
- **Okno:** 15 minut
- **Maksimalno zahtev:** 100 na IP
- **Validacija licence:** 100 zahtev/15min
- **Ustvarjanje licence:** 10 zahtev/uro

### JWT Tokeni
```javascript
const token = generateJWT({
  client_id: "OMNI001",
  plan: "premium",
  expires_at: "2026-09-23"
}, '24h');
```

### Šifriranje
- **Algoritem:** AES-256-CBC
- **Ključi:** Varno shranjeni v .env
- **Podatki:** Šifrirani pred shranjevanjem

### Audit Logging
- Vse API klice
- Varnostne dogodke
- Neuspešne poskuse validacije
- Sistemske aktivnosti

## 🔗 Integracija z Omni Aplikacijami

### Python Integracija
```python
import requests

def validate_license(client_id, license_key):
    response = requests.post(
        'http://localhost:3000/api/license/validate',
        json={
            'client_id': client_id,
            'license_key': license_key
        }
    )
    return response.json()

# Uporaba
result = validate_license('OMNI001', '8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219')
if result['valid']:
    print(f"Licenca veljavna za {result['company_name']}")
    print(f"Plan: {result['plan_name']}")
    print(f"Moduli: {', '.join(result['modules'])}")
```

### JavaScript/Node.js Integracija
```javascript
const axios = require('axios');

async function validateLicense(clientId, licenseKey) {
  try {
    const response = await axios.post('http://localhost:3000/api/license/validate', {
      client_id: clientId,
      license_key: licenseKey
    });
    return response.data;
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Uporaba
const result = await validateLicense('OMNI001', '8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219');
```

### PowerShell Integracija
```powershell
$body = @{
    client_id = "OMNI001"
    license_key = "8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/license/validate" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body

$result = $response.Content | ConvertFrom-Json
```

## 🎛️ Admin Konzola

Dostopna na: `http://localhost:3000/admin/admin-console.html`

### Funkcionalnosti:
- 📊 Pregled vseh licenc
- ✅ Validacija licenčnih ključev
- 📈 Statistike uporabe
- 🔧 Ustvarjanje novih licenc
- 📋 Audit dnevniki
- ⚙️ Sistemske nastavitve

## 🧪 Testiranje

### Avtomatizirani Testi
```bash
npm test
```

### Ročno Testiranje
```bash
# Health check
curl http://localhost:3000/health

# Validacija licence
curl -X POST http://localhost:3000/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{"client_id": "OMNI001", "license_key": "8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219"}'
```

## 📊 Monitoring in Logging

### Log Datoteke
- `./logs/omni-license.log` - Glavni log
- `./logs/audit.log` - Audit dogodki
- `./logs/security.log` - Varnostni dogodki

### Metrike
- Število validacij na dan
- Uspešnost validacij
- Aktivne licence
- Potekle licence

## 🔄 Webhook Sistem

### Registracija Webhook-a
```http
POST /api/license/webhooks/register
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["license_expired", "license_invalid", "security_alert"]
}
```

### Webhook Dogodki
- `license_expired` - Licenca je potekla
- `license_invalid` - Neveljavna licenca
- `security_alert` - Varnostni dogodek
- `license_created` - Nova licenca
- `license_updated` - Posodobljena licenca

## 🚀 Produkcijske Nastavitve

### Environment Variables
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your_super_secure_jwt_secret
ENCRYPTION_KEY=your_encryption_key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### SSL/HTTPS
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Vzdrževanje

### Backup Licenc
```bash
# Izvoz licenc
curl http://localhost:3000/api/license/export > licenses_backup.json

# Uvoz licenc
curl -X POST http://localhost:3000/api/license/import \
  -H "Content-Type: application/json" \
  -d @licenses_backup.json
```

### Čiščenje Logov
```bash
# Arhiviranje starih logov
npm run logs:archive

# Čiščenje starih logov
npm run logs:clean
```

## 📞 Podpora

- **Email:** support@omni-ai.com
- **Dokumentacija:** https://docs.omni-ai.com
- **GitHub:** https://github.com/omni-ai/license-system

---

**Verzija:** 1.0.0  
**Zadnja posodobitev:** 23. september 2025  
**Avtor:** Omni AI Team