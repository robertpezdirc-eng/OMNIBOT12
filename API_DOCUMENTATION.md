# 📚 Omni Ultimate Turbo Flow System - API Dokumentacija

## 🌐 Pregled API-ja

Omni Ultimate Turbo Flow System ponuja RESTful API za upravljanje licenc, uporabnikov in sistemskih funkcionalnosti.

**Base URL**: `http://localhost:3000/api`  
**Version**: v1  
**Content-Type**: `application/json`

## 🔐 Avtentikacija

### JWT Token Avtentikacija

```javascript
// Pridobi token
POST /api/auth/login
{
  "username": "admin",
  "password": "secure_password"
}

// Uporabi token v headerju
Authorization: Bearer <jwt_token>
```

### API Key Avtentikacija

```javascript
// V headerju
X-API-Key: your-api-key-here
```

## 📋 API Endpoints

### 🏥 Health Check

#### GET /api/health
Preveri zdravje sistema in povezljivost z bazami podatkov.

**Request:**
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "mongodb": "connected",
    "redis": "connected",
    "websocket": "active"
  },
  "memory": {
    "used": "245.2 MB",
    "free": "1.8 GB",
    "total": "2.0 GB"
  }
}
```

**Status Codes:**
- `200` - Sistem je zdrav
- `503` - Sistem ni zdrav

---

### 🎫 License Management

#### POST /api/licenses
Ustvari novo licenco.

**Request:**
```http
POST /api/licenses
Content-Type: application/json

{
  "client_id": "client_123",
  "plan": "premium",
  "duration_days": 365,
  "features": ["analytics", "api_access", "priority_support"],
  "metadata": {
    "company": "Example Corp",
    "contact": "admin@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "license": {
    "license_key": "OMNI-PREM-ABCD-1234-EFGH",
    "client_id": "client_123",
    "plan": "premium",
    "status": "active",
    "created_at": "2024-01-15T10:30:00.000Z",
    "expires_at": "2025-01-15T10:30:00.000Z",
    "features": ["analytics", "api_access", "priority_support"],
    "usage_limits": {
      "api_calls": 10000,
      "storage_gb": 100,
      "users": 50
    },
    "metadata": {
      "company": "Example Corp",
      "contact": "admin@example.com"
    }
  }
}
```

**Status Codes:**
- `201` - Licenca uspešno ustvarjena
- `400` - Napačni podatki
- `409` - Client ID že obstaja

#### GET /api/licenses/check/:license_key
Preveri veljavnost licence.

**Request:**
```http
GET /api/licenses/check/OMNI-PREM-ABCD-1234-EFGH
```

**Response:**
```json
{
  "valid": true,
  "license": {
    "license_key": "OMNI-PREM-ABCD-1234-EFGH",
    "client_id": "client_123",
    "plan": "premium",
    "status": "active",
    "expires_at": "2025-01-15T10:30:00.000Z",
    "days_remaining": 365,
    "features": ["analytics", "api_access", "priority_support"],
    "usage": {
      "api_calls": 1250,
      "storage_used_gb": 15.5,
      "active_users": 12
    },
    "limits": {
      "api_calls": 10000,
      "storage_gb": 100,
      "users": 50
    }
  }
}
```

**Status Codes:**
- `200` - Licenca najdena
- `404` - Licenca ne obstaja
- `410` - Licenca je potekla

#### PUT /api/licenses/:license_key
Posodobi licenco.

**Request:**
```http
PUT /api/licenses/OMNI-PREM-ABCD-1234-EFGH
Content-Type: application/json

{
  "status": "suspended",
  "features": ["analytics", "api_access"],
  "metadata": {
    "suspension_reason": "Payment overdue"
  }
}
```

**Response:**
```json
{
  "success": true,
  "license": {
    "license_key": "OMNI-PREM-ABCD-1234-EFGH",
    "status": "suspended",
    "updated_at": "2024-01-15T11:00:00.000Z",
    "features": ["analytics", "api_access"],
    "metadata": {
      "suspension_reason": "Payment overdue"
    }
  }
}
```

#### DELETE /api/licenses/:license_key
Izbriši licenco.

**Request:**
```http
DELETE /api/licenses/OMNI-PREM-ABCD-1234-EFGH
```

**Response:**
```json
{
  "success": true,
  "message": "License deleted successfully"
}
```

#### GET /api/licenses
Pridobi seznam licenc z možnostjo filtriranja.

**Request:**
```http
GET /api/licenses?status=active&plan=premium&page=1&limit=10
```

**Query Parameters:**
- `status` - Filtriraj po statusu (active, expired, suspended)
- `plan` - Filtriraj po planu (demo, basic, premium)
- `client_id` - Filtriraj po client ID
- `page` - Številka strani (default: 1)
- `limit` - Število rezultatov na stran (default: 10, max: 100)
- `sort` - Sortiranje (created_at, expires_at, -created_at)

**Response:**
```json
{
  "success": true,
  "licenses": [
    {
      "license_key": "OMNI-PREM-ABCD-1234-EFGH",
      "client_id": "client_123",
      "plan": "premium",
      "status": "active",
      "created_at": "2024-01-15T10:30:00.000Z",
      "expires_at": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

#### POST /api/licenses/:license_key/renew
Podaljšaj licenco.

**Request:**
```http
POST /api/licenses/OMNI-PREM-ABCD-1234-EFGH/renew
Content-Type: application/json

{
  "duration_days": 365,
  "upgrade_plan": "enterprise"
}
```

**Response:**
```json
{
  "success": true,
  "license": {
    "license_key": "OMNI-PREM-ABCD-1234-EFGH",
    "plan": "enterprise",
    "expires_at": "2026-01-15T10:30:00.000Z",
    "renewed_at": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### 📊 Analytics & Usage

#### GET /api/analytics/usage/:license_key
Pridobi podatke o uporabi licence.

**Request:**
```http
GET /api/analytics/usage/OMNI-PREM-ABCD-1234-EFGH?period=30d
```

**Query Parameters:**
- `period` - Časovno obdobje (1d, 7d, 30d, 90d, 1y)
- `granularity` - Granularnost podatkov (hour, day, week, month)

**Response:**
```json
{
  "success": true,
  "usage": {
    "license_key": "OMNI-PREM-ABCD-1234-EFGH",
    "period": "30d",
    "summary": {
      "total_api_calls": 15000,
      "avg_daily_calls": 500,
      "peak_daily_calls": 1200,
      "storage_used_gb": 25.5,
      "active_users": 15,
      "uptime_percentage": 99.8
    },
    "daily_stats": [
      {
        "date": "2024-01-15",
        "api_calls": 750,
        "storage_gb": 25.5,
        "active_users": 12,
        "response_time_ms": 145
      }
    ]
  }
}
```

#### GET /api/analytics/system
Pridobi sistemske analitike (samo za administratorje).

**Request:**
```http
GET /api/analytics/system
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "system": {
    "total_licenses": 1250,
    "active_licenses": 980,
    "expired_licenses": 200,
    "suspended_licenses": 70,
    "revenue": {
      "monthly": 125000,
      "yearly": 1400000
    },
    "usage": {
      "total_api_calls": 5000000,
      "avg_response_time": 120,
      "error_rate": 0.02
    },
    "top_clients": [
      {
        "client_id": "enterprise_001",
        "api_calls": 500000,
        "revenue": 50000
      }
    ]
  }
}
```

---

### 👥 User Management

#### POST /api/users
Ustvari novega uporabnika.

**Request:**
```http
POST /api/users
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "user",
  "license_key": "OMNI-PREM-ABCD-1234-EFGH",
  "permissions": ["read", "write"]
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "user_id": "user_12345",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "license_key": "OMNI-PREM-ABCD-1234-EFGH",
    "permissions": ["read", "write"],
    "created_at": "2024-01-15T10:30:00.000Z",
    "last_login": null
  }
}
```

#### GET /api/users/:user_id
Pridobi podatke o uporabniku.

**Request:**
```http
GET /api/users/user_12345
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "user_id": "user_12345",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "license_key": "OMNI-PREM-ABCD-1234-EFGH",
    "permissions": ["read", "write"],
    "created_at": "2024-01-15T10:30:00.000Z",
    "last_login": "2024-01-15T14:30:00.000Z",
    "activity": {
      "total_logins": 25,
      "api_calls_today": 150
    }
  }
}
```

---

### ⚙️ Configuration

#### GET /api/config/plans
Pridobi seznam licenčnih planov.

**Request:**
```http
GET /api/config/plans
```

**Response:**
```json
{
  "success": true,
  "plans": {
    "demo": {
      "name": "Demo Plan",
      "duration_days": 7,
      "price": 0,
      "features": ["basic_access"],
      "limits": {
        "api_calls": 100,
        "storage_gb": 1,
        "users": 1
      }
    },
    "basic": {
      "name": "Basic Plan",
      "duration_days": 30,
      "price": 29.99,
      "features": ["basic_access", "email_support"],
      "limits": {
        "api_calls": 1000,
        "storage_gb": 10,
        "users": 5
      }
    },
    "premium": {
      "name": "Premium Plan",
      "duration_days": 365,
      "price": 299.99,
      "features": ["analytics", "api_access", "priority_support"],
      "limits": {
        "api_calls": 10000,
        "storage_gb": 100,
        "users": 50
      }
    }
  }
}
```

#### PUT /api/config/plans/:plan_name
Posodobi licenčni plan (samo administratorji).

**Request:**
```http
PUT /api/config/plans/premium
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>

{
  "price": 349.99,
  "limits": {
    "api_calls": 15000,
    "storage_gb": 150,
    "users": 75
  }
}
```

---

### 🔔 Notifications

#### GET /api/notifications
Pridobi obvestila za uporabnika.

**Request:**
```http
GET /api/notifications?unread=true&limit=20
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif_123",
      "type": "license_expiry",
      "title": "License Expiring Soon",
      "message": "Your license will expire in 7 days",
      "read": false,
      "created_at": "2024-01-15T10:30:00.000Z",
      "data": {
        "license_key": "OMNI-PREM-ABCD-1234-EFGH",
        "expires_at": "2024-01-22T10:30:00.000Z"
      }
    }
  ]
}
```

#### POST /api/notifications/:notification_id/read
Označi obvestilo kot prebrano.

**Request:**
```http
POST /api/notifications/notif_123/read
Authorization: Bearer <jwt_token>
```

---

### 📁 File Management

#### POST /api/files/upload
Naloži datoteko.

**Request:**
```http
POST /api/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

file: [binary_data]
metadata: {"description": "License document"}
```

**Response:**
```json
{
  "success": true,
  "file": {
    "file_id": "file_12345",
    "filename": "license_document.pdf",
    "size": 1024000,
    "mime_type": "application/pdf",
    "url": "/api/files/download/file_12345",
    "uploaded_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /api/files/download/:file_id
Prenesi datoteko.

**Request:**
```http
GET /api/files/download/file_12345
Authorization: Bearer <jwt_token>
```

---

## 🚨 Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_LICENSE_KEY",
    "message": "The provided license key is invalid or expired",
    "details": {
      "license_key": "OMNI-INVALID-KEY",
      "checked_at": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Napačni podatki v zahtevi |
| `UNAUTHORIZED` | 401 | Manjka ali napačna avtentikacija |
| `FORBIDDEN` | 403 | Ni dovoljenj za dostop |
| `NOT_FOUND` | 404 | Vir ni najden |
| `CONFLICT` | 409 | Konflikt s trenutnim stanjem |
| `RATE_LIMITED` | 429 | Preveč zahtev |
| `INTERNAL_ERROR` | 500 | Notranja napaka strežnika |
| `SERVICE_UNAVAILABLE` | 503 | Storitev ni na voljo |

### License-Specific Error Codes

| Code | Description |
|------|-------------|
| `INVALID_LICENSE_KEY` | Napačen format licence |
| `LICENSE_EXPIRED` | Licenca je potekla |
| `LICENSE_SUSPENDED` | Licenca je suspendirana |
| `LICENSE_LIMIT_EXCEEDED` | Presežena omejitev licence |
| `INVALID_PLAN` | Napačen licenčni plan |

## 📊 Rate Limiting

### Omejitve Zahtev

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/health` | 100/min | 1 minuta |
| `/api/licenses/check/*` | 1000/min | 1 minuta |
| `/api/licenses` (POST) | 10/min | 1 minuta |
| `/api/auth/login` | 5/min | 1 minuta |
| Ostali | 60/min | 1 minuta |

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## 🔒 Varnost

### HTTPS Only
Vsi API klici morajo biti preko HTTPS v produkciji.

### Input Validation
Vsi vhodni podatki so validirani in sanitizirani.

### SQL Injection Protection
Uporabljamo parameterized queries za zaščito pred SQL injection.

### CORS Policy
```javascript
// Dovoljeni izvori
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

## 📝 SDK in Primeri

### JavaScript SDK

```javascript
// Namestitev
npm install omni-ultimate-sdk

// Uporaba
const OmniSDK = require('omni-ultimate-sdk');

const client = new OmniSDK({
  baseUrl: 'https://api.omni-system.com',
  apiKey: 'your-api-key'
});

// Preveri licenco
const license = await client.licenses.check('OMNI-PREM-ABCD-1234-EFGH');
console.log(license.valid); // true/false

// Ustvari licenco
const newLicense = await client.licenses.create({
  client_id: 'client_123',
  plan: 'premium'
});
```

### Python SDK

```python
# Namestitev
pip install omni-ultimate-sdk

# Uporaba
from omni_sdk import OmniClient

client = OmniClient(
    base_url='https://api.omni-system.com',
    api_key='your-api-key'
)

# Preveri licenco
license = client.licenses.check('OMNI-PREM-ABCD-1234-EFGH')
print(license['valid'])  # True/False

# Ustvari licenco
new_license = client.licenses.create(
    client_id='client_123',
    plan='premium'
)
```

### cURL Primeri

```bash
# Health check
curl -X GET "http://localhost:3000/api/health"

# Ustvari licenco
curl -X POST "http://localhost:3000/api/licenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "client_id": "client_123",
    "plan": "premium"
  }'

# Preveri licenco
curl -X GET "http://localhost:3000/api/licenses/check/OMNI-PREM-ABCD-1234-EFGH"

# Seznam licenc
curl -X GET "http://localhost:3000/api/licenses?status=active&limit=10" \
  -H "Authorization: Bearer your-jwt-token"
```

## 🧪 Testiranje API-ja

### Postman Collection
Prenesite Postman kolekcijo: [Omni API Collection](./postman/omni-api-collection.json)

### Insomnia Workspace
Uvozite Insomnia workspace: [Omni API Workspace](./insomnia/omni-api-workspace.json)

### Avtomatizirani Testi

```bash
# Zaženi API teste
cd tests
npm run test:api

# Specifični testi
npm run test:api -- --grep "license creation"
```

## 📞 Podpora

Za vprašanja o API-ju:
- **Email**: api-support@omni-system.com
- **Dokumentacija**: https://docs.omni-system.com
- **Status**: https://status.omni-system.com

---

**📋 Ta dokumentacija je redno posodobljena. Zadnja posodobitev: 2024-01-15**