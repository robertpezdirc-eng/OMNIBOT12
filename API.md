# 📡 API Documentation - Omni Ultimate Turbo Flow System

## 🔗 Base URL

```
Production: https://api.omni-system.com
Development: http://localhost:3000
WebSocket: ws://localhost:3001
```

## 🔐 Avtentifikacija

Sistem uporablja JWT (JSON Web Tokens) za avtentifikacijo. Vsi zaščiteni endpoints zahtevajo `Authorization` header.

```http
Authorization: Bearer <jwt_token>
```

### **Pridobitev JWT Token**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Odgovor:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "email": "user@example.com",
    "role": "user",
    "licenseStatus": "active"
  }
}
```

## 👤 Uporabniški Endpoints

### **Registracija Uporabnika**

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Example Corp"
}
```

**Odgovor:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "email": "newuser@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### **Pridobitev Uporabniškega Profila**

```http
GET /api/user/profile
Authorization: Bearer <jwt_token>
```

**Odgovor:**
```json
{
  "success": true,
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "company": "Example Corp",
    "role": "user",
    "licenseStatus": "active",
    "lastLogin": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-10T08:15:00.000Z"
  }
}
```

### **Posodobitev Uporabniškega Profila**

```http
PUT /api/user/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "company": "New Company Ltd"
}
```

## 🎫 Licenčni Endpoints

### **Pridobitev Licenčnega Statusa**

```http
GET /api/license/status
Authorization: Bearer <jwt_token>
```

**Odgovor:**
```json
{
  "success": true,
  "license": {
    "id": "lic_64f1a2b3c4d5e6f7g8h9i0j1",
    "userId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "type": "pro",
    "status": "active",
    "activatedAt": "2024-01-10T08:15:00.000Z",
    "expiresAt": "2025-01-10T08:15:00.000Z",
    "features": [
      "real_time_updates",
      "advanced_analytics",
      "priority_support",
      "api_access"
    ],
    "usage": {
      "apiCalls": 1250,
      "apiLimit": 10000,
      "storage": "2.5GB",
      "storageLimit": "10GB"
    }
  }
}
```

### **Aktivacija Licence**

```http
POST /api/license/activate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "licenseKey": "OMNI-PRO-2024-XXXX-XXXX-XXXX",
  "hardwareFingerprint": "hw_fp_abc123def456"
}
```

**Odgovor:**
```json
{
  "success": true,
  "message": "License activated successfully",
  "license": {
    "id": "lic_64f1a2b3c4d5e6f7g8h9i0j1",
    "type": "pro",
    "status": "active",
    "activatedAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### **Deaktivacija Licence**

```http
POST /api/license/deactivate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "reason": "switching_device"
}
```

### **Preverjanje Veljavnosti Licence**

```http
GET /api/license/validate
Authorization: Bearer <jwt_token>
```

**Odgovor:**
```json
{
  "success": true,
  "valid": true,
  "license": {
    "status": "active",
    "expiresAt": "2025-01-15T10:30:00.000Z",
    "daysRemaining": 365
  }
}
```

## 👨‍💼 Administratorski Endpoints

### **Seznam Vseh Uporabnikov** (Admin Only)

```http
GET /api/admin/users?page=1&limit=20&search=john&status=active
Authorization: Bearer <admin_jwt_token>
```

**Odgovor:**
```json
{
  "success": true,
  "users": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "licenseStatus": "active",
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-10T08:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### **Ustvarjanje Nove Licence** (Admin Only)

```http
POST /api/admin/licenses
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "type": "pro",
  "duration": 365,
  "features": ["real_time_updates", "advanced_analytics"],
  "maxDevices": 3,
  "customLimits": {
    "apiCalls": 10000,
    "storage": "10GB"
  }
}
```

**Odgovor:**
```json
{
  "success": true,
  "license": {
    "id": "lic_64f1a2b3c4d5e6f7g8h9i0j1",
    "key": "OMNI-PRO-2024-ABCD-EFGH-IJKL",
    "type": "pro",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### **Sistem Statistike** (Admin Only)

```http
GET /api/admin/stats
Authorization: Bearer <admin_jwt_token>
```

**Odgovor:**
```json
{
  "success": true,
  "stats": {
    "users": {
      "total": 1250,
      "active": 980,
      "newThisMonth": 45
    },
    "licenses": {
      "total": 890,
      "active": 750,
      "expired": 140,
      "byType": {
        "basic": 300,
        "pro": 400,
        "enterprise": 50
      }
    },
    "system": {
      "uptime": "15d 8h 32m",
      "apiCalls": 125000,
      "errorRate": "0.02%",
      "avgResponseTime": "45ms"
    }
  }
}
```

## 📊 Analitični Endpoints

### **Uporabniška Analitika**

```http
GET /api/analytics/usage?period=30d
Authorization: Bearer <jwt_token>
```

**Odgovor:**
```json
{
  "success": true,
  "analytics": {
    "period": "30d",
    "apiCalls": {
      "total": 2500,
      "daily": [
        {"date": "2024-01-15", "calls": 85},
        {"date": "2024-01-14", "calls": 92}
      ]
    },
    "features": {
      "mostUsed": "real_time_updates",
      "usage": {
        "real_time_updates": 1200,
        "advanced_analytics": 800,
        "api_access": 500
      }
    }
  }
}
```

### **Sistem Performance**

```http
GET /api/system/performance
Authorization: Bearer <jwt_token>
```

**Odgovor:**
```json
{
  "success": true,
  "performance": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "cpu": {
      "usage": "25%",
      "cores": 4
    },
    "memory": {
      "used": "2.1GB",
      "total": "8GB",
      "percentage": "26%"
    },
    "database": {
      "connections": 15,
      "responseTime": "12ms",
      "status": "healthy"
    },
    "redis": {
      "memory": "150MB",
      "connections": 8,
      "status": "healthy"
    }
  }
}
```

## 🔔 Notifikacijski Endpoints

### **Seznam Notifikacij**

```http
GET /api/notifications?unread=true&limit=10
Authorization: Bearer <jwt_token>
```

**Odgovor:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "not_64f1a2b3c4d5e6f7g8h9i0j1",
      "type": "license_expiry",
      "title": "License Expiring Soon",
      "message": "Your Pro license will expire in 7 days",
      "read": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "priority": "high"
    }
  ],
  "unreadCount": 3
}
```

### **Označitev Notifikacije kot Prebrane**

```http
PUT /api/notifications/:id/read
Authorization: Bearer <jwt_token>
```

## 🌐 WebSocket Events

### **Povezava na WebSocket**

```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Poslušanje dogodkov
socket.on('license_updated', (data) => {
  console.log('License updated:', data);
});

socket.on('system_notification', (data) => {
  console.log('System notification:', data);
});
```

### **WebSocket Dogodki**

| Dogodek | Opis | Podatki |
|---------|------|---------|
| `license_updated` | Licenčni status se je spremenil | `{userId, licenseId, status, timestamp}` |
| `system_notification` | Sistemska notifikacija | `{type, message, priority, timestamp}` |
| `user_activity` | Uporabniška aktivnost | `{userId, action, timestamp}` |
| `real_time_update` | Real-time posodobitev | `{type, data, timestamp}` |

## 🔍 Iskalni Endpoints

### **Globalno Iskanje**

```http
GET /api/search?q=license&type=all&limit=20
Authorization: Bearer <jwt_token>
```

**Odgovor:**
```json
{
  "success": true,
  "results": {
    "users": [
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "email": "user@example.com",
        "name": "John Doe",
        "relevance": 0.95
      }
    ],
    "licenses": [
      {
        "id": "lic_64f1a2b3c4d5e6f7g8h9i0j1",
        "key": "OMNI-PRO-2024-****",
        "type": "pro",
        "relevance": 0.87
      }
    ],
    "total": 15
  }
}
```

## 📁 Datotečni Endpoints

### **Upload Datoteke**

```http
POST /api/files/upload
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: [binary_data]
category: "license_documents"
```

**Odgovor:**
```json
{
  "success": true,
  "file": {
    "id": "file_64f1a2b3c4d5e6f7g8h9i0j1",
    "filename": "license_agreement.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "url": "/api/files/download/file_64f1a2b3c4d5e6f7g8h9i0j1",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### **Download Datoteke**

```http
GET /api/files/download/:fileId
Authorization: Bearer <jwt_token>
```

## 🚨 Error Handling

### **Standardni Error Format**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_LICENSE_KEY",
    "message": "The provided license key is invalid or expired",
    "details": {
      "field": "licenseKey",
      "value": "OMNI-PRO-2024-INVALID"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_64f1a2b3c4d5e6f7g8h9i0j1"
  }
}
```

### **HTTP Status Codes**

| Status | Opis |
|--------|------|
| `200` | Uspešna zahteva |
| `201` | Uspešno ustvarjeno |
| `400` | Napačna zahteva |
| `401` | Nepooblaščen dostop |
| `403` | Prepovedan dostop |
| `404` | Ni najdeno |
| `409` | Konflikt |
| `422` | Neobdelljiva entiteta |
| `429` | Preveč zahtev |
| `500` | Notranja napaka strežnika |

### **Pogosti Error Codes**

| Code | Opis |
|------|------|
| `INVALID_TOKEN` | JWT token je neveljaven |
| `TOKEN_EXPIRED` | JWT token je potekel |
| `INSUFFICIENT_PERMISSIONS` | Nezadostne pravice |
| `LICENSE_NOT_FOUND` | Licenca ni najdena |
| `LICENSE_EXPIRED` | Licenca je potekla |
| `LICENSE_LIMIT_EXCEEDED` | Presežena omejitev licence |
| `RATE_LIMIT_EXCEEDED` | Presežena omejitev zahtev |
| `VALIDATION_ERROR` | Napaka pri validaciji |

## 📝 Rate Limiting

API implementira rate limiting za preprečevanje zlorabe:

- **Splošni endpoints**: 100 zahtev/minuto
- **Avtentifikacijski endpoints**: 5 zahtev/minuto
- **Admin endpoints**: 200 zahtev/minuto
- **Upload endpoints**: 10 zahtev/minuto

## 🔧 SDK in Primeri

### **JavaScript/Node.js SDK**

```javascript
const OmniAPI = require('@omni-system/sdk');

const client = new OmniAPI({
  baseURL: 'https://api.omni-system.com',
  token: 'your_jwt_token'
});

// Pridobi licenčni status
const license = await client.license.getStatus();
console.log(license);

// Aktiviraj licenco
const result = await client.license.activate('OMNI-PRO-2024-XXXX');
console.log(result);
```

### **Python SDK**

```python
from omni_sdk import OmniClient

client = OmniClient(
    base_url='https://api.omni-system.com',
    token='your_jwt_token'
)

# Pridobi uporabniški profil
profile = client.user.get_profile()
print(profile)

# Preveri licenčno veljavnost
valid = client.license.validate()
print(f"License valid: {valid}")
```

### **cURL Primeri**

```bash
# Login
curl -X POST https://api.omni-system.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Pridobi licenčni status
curl -X GET https://api.omni-system.com/api/license/status \
  -H "Authorization: Bearer your_jwt_token"

# Aktiviraj licenco
curl -X POST https://api.omni-system.com/api/license/activate \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"OMNI-PRO-2024-XXXX","hardwareFingerprint":"hw_fp_abc123"}'
```

---

**Za dodatne informacije o API-ju, obiščite [developer portal](https://developers.omni-system.com) ali odprite issue na GitHub repozitoriju.**