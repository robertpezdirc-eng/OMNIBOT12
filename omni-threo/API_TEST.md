# 🧪 Omni Threo API Testing Guide

## 🔍 Status Preveritev

Trenutno stanje: **Backend ni deployiran na Render.com**

URL-ji vračajo "Not Found", kar pomeni:
- Backend še ni deployiran na cloud
- Potrebno je dokončati deployment proces
- Testiranje je možno samo lokalno

---

## 🏠 Lokalno Testiranje

### **1. Zagon Backend Serverja**
```bash
cd omni-threo/backend
npm install
npm start
```

Backend bo dostopen na: `http://localhost:3000`

### **2. Testiranje API Endpointov**

#### **🔹 Health Check**
```bash
curl http://localhost:3000/api/health
```

**Pričakovan odgovor:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-XX...",
  "database": "connected"
}
```

#### **🔹 1️⃣ Ustvari Licenco**
```bash
curl -X POST http://localhost:3000/api/license/create \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "CAMP123",
    "plan": "premium",
    "expires_at": "2025-12-31",
    "modules": ["ceniki", "blagajna", "zaloge", "AI_optimizacija"]
  }'
```

**Pričakovan rezultat:**
```json
{
  "client_id": "CAMP123",
  "license_key": "8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219",
  "plan": "premium",
  "expires_at": "2025-12-31",
  "modules": ["ceniki", "blagajna", "zaloge", "AI_optimizacija"],
  "status": "active"
}
```

#### **🔹 2️⃣ Preveri Licenco**
```bash
curl -X POST http://localhost:3000/api/license/check \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "CAMP123",
    "license_key": "8f4a9c2e-5a7b-45f3-bc33-5b29c9adf219"
  }'
```

**Pričakovan rezultat:**
```json
{
  "valid": true,
  "plan": "premium",
  "expires_at": "2025-12-31",
  "modules": ["ceniki", "blagajna", "zaloge", "AI_optimizacija"]
}
```

#### **🔹 3️⃣ Podaljšaj Licenco**
```bash
curl -X POST http://localhost:3000/api/license/extend \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "CAMP123",
    "extra_days": 30
  }'
```

**Pričakovan rezultat:**
```json
{
  "message": "License extended",
  "new_expires_at": "2026-01-30"
}
```

#### **🔹 4️⃣ Preklopi Status Licence**
```bash
curl -X POST http://localhost:3000/api/license/toggle \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "CAMP123"
  }'
```

**Pričakovan rezultat:**
```json
{
  "message": "License deactivated",
  "status": "inactive"
}
```

---

## 🚀 Cloud Deployment Testing

### **Po Deployment na Render.com:**

Zamenjajte `http://localhost:3000` z dejanskim Render URL-jem:

```bash
# Primer z dejanskim URL-jem
curl -X POST https://omni-threo-backend.onrender.com/api/license/create \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "CAMP123",
    "plan": "premium",
    "expires_at": "2025-12-31",
    "modules": ["ceniki", "blagajna", "zaloge", "AI_optimizacija"]
  }'
```

---

## 🔧 Troubleshooting

### **Če API ne dela:**

#### **1. Preverite Backend Status**
```bash
curl http://localhost:3000/api/health
```

#### **2. Preverite MongoDB Povezavo**
```bash
curl http://localhost:3000/api/db-status
```

#### **3. Preverite Logs**
```bash
# V backend direktoriju
npm run debug
```

#### **4. Preverite Environment Variables**
```bash
# Preverite .env datoteko
cat .env
```

### **Pogosti Problemi:**

#### **"Cannot connect to MongoDB"**
- Preverite `MONGO_URI` v `.env`
- Preverite da je MongoDB zagnan (lokalno) ali Atlas konfiguriran

#### **"CORS Error"**
- Preverite `CORS_ORIGIN` v `.env`
- Dodajte frontend URL v CORS nastavitve

#### **"404 Not Found"**
- Preverite da je server zagnan
- Preverite da uporabljate pravilne URL-je

#### **"500 Internal Server Error"**
- Preverite server logs
- Preverite database povezavo

---

## 📊 Postman Collection

### **Import v Postman:**

```json
{
  "info": {
    "name": "Omni Threo API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{base_url}}/api/health",
          "host": ["{{base_url}}"],
          "path": ["api", "health"]
        }
      }
    },
    {
      "name": "Create License",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"client_id\": \"CAMP123\",\n  \"plan\": \"premium\",\n  \"expires_at\": \"2025-12-31\",\n  \"modules\": [\"ceniki\", \"blagajna\", \"zaloge\", \"AI_optimizacija\"]\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/license/create",
          "host": ["{{base_url}}"],
          "path": ["api", "license", "create"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    }
  ]
}
```

---

## 🎯 Naslednji Koraki

1. **Lokalno testiranje**: Zaženite backend in testirajte API
2. **Cloud deployment**: Dokončajte deployment na Render.com
3. **Production testing**: Testirajte z dejanskimi cloud URL-ji
4. **Frontend integration**: Povežite Admin GUI in Client Panel

---

**Opomba**: Trenutno je potrebno najprej dokončati cloud deployment, da bodo API endpointi dostopni na produkcijskih URL-jih.