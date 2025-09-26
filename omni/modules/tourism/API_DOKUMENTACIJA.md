# OMNI Security Enhanced - API Dokumentacija

## Pregled

OMNI Security Enhanced Client Panel je varnostno izboljšana aplikacija z naprednimi funkcijami avtentikacije, avtorizacije in licenčne integracije.

**Strežnik:** http://localhost:5020  
**Verzija:** 2.1.0  
**Funkcije:** 2FA, Revizijsko beleženje, Omejevanje hitrosti, Šifriranje

## Avtentikacija

Vsi API endpointi (razen registracije in prijave) zahtevajo avtentikacijski žeton v Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

## API Endpointi

### 1. Registracija uporabnika
**POST** `/api/register`

**Zahteva:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "TestPass123!"
}
```

**Odgovor (201):**
```json
{
  "message": "User registered successfully",
  "requires_2fa": true,
  "user_id": 1
}
```

### 2. Prijava uporabnika
**POST** `/api/login`

**Zahteva:**
```json
{
  "username": "testuser",
  "password": "TestPass123!"
}
```

**Odgovor (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": 1,
  "session_id": "abc123..."
}
```

### 3. Odjava uporabnika
**POST** `/api/logout`

**Zahteva:** Avtentikacijski žeton v header

**Odgovor (200):**
```json
{
  "message": "Logged out successfully"
}
```

### 4. Profil uporabnika
**GET** `/api/profile`

**Zahteva:** Avtentikacijski žeton v header

**Odgovor (200):**
```json
{
  "user_id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "created_at": "2024-01-15T10:00:00Z",
  "last_login": "2024-01-15T14:30:00Z",
  "is_2fa_enabled": true
}
```

### 5. Nastavitve uporabnika
**GET** `/api/settings`

**Zahteva:** Avtentikacijski žeton v header

**Odgovor (200):**
```json
{
  "theme": "dark",
  "language": "en",
  "notifications": true,
  "security": {
    "2fa_enabled": true,
    "session_timeout": 3600,
    "password_last_changed": "2024-01-10T12:00:00Z"
  }
}
```

### 6. 2FA Status
**GET** `/api/2fa/status`

**Zahteva:** Avtentikacijski žeton v header

**Odgovor (200):**
```json
{
  "enabled": true,
  "backup_codes_count": 8,
  "last_used": "2024-01-15T14:30:00Z"
}
```

### 7. Revizijski dnevniki
**GET** `/api/audit-logs`

**Zahteva:** Avtentikacijski žeton v header

**Odgovor (200):**
```json
{
  "logs": [
    {
      "timestamp": "2024-01-15T14:30:00Z",
      "user_id": 1,
      "action": "LOGIN_SUCCESS",
      "resource": "Authentication System",
      "success": true,
      "ip_address": "127.0.0.1"
    }
  ],
  "total": 1,
  "page": 1
}
```

## Licenčni API Endpointi

### 8. Status licence
**GET** `/api/license/status`

**Zahteva:** Avtentikacijski žeton v header

**Odgovor (200):**
```json
{
  "expires_at": "2024-12-31T23:59:59Z",
  "features": ["security", "analytics", "ai_features", "multi_tenant"],
  "limits": {
    "max_api_calls": 100000,
    "max_users": 1000,
    "max_storage_gb": 500
  },
  "status": "active",
  "type": "enterprise"
}
```

### 9. Licenčni moduli
**GET** `/api/license/modules`

**Zahteva:** Avtentikacijski žeton v header

**Odgovor (200):**
```json
{
  "Security": {
    "enabled": true,
    "version": "2.1.0",
    "features": ["2FA", "Audit Logging", "Encryption"]
  },
  "Analytics": {
    "enabled": true,
    "version": "1.8.0",
    "features": ["Real-time Analytics", "Custom Reports"]
  },
  "AI Features": {
    "enabled": true,
    "version": "3.0.0",
    "features": ["Natural Language Processing", "Predictive Analytics", "Auto-optimization"]
  }
}
```

### 10. Sistemski podatki
**GET** `/api/data`

**Zahteva:** Avtentikacijski žeton v header

**Odgovor (200):**
```json
{
  "system_info": {
    "version": "2.1.0",
    "uptime": "15 days, 4 hours",
    "status": "operational"
  },
  "statistics": {
    "total_users": 45,
    "active_sessions": 12,
    "api_calls_today": 2340,
    "storage_used": "125 GB"
  }
}
```

### 11. Cenovna struktura
**GET** `/api/pricing`

**Zahteva:** Avtentikacijski žeton v header

**Odgovor (200):**
```json
{
  "plans": [
    {
      "name": "Basic",
      "price": 29,
      "currency": "USD",
      "billing": "monthly",
      "features": ["Basic Security", "Up to 10 users", "10GB storage"]
    },
    {
      "name": "Enterprise",
      "price": 299,
      "currency": "USD",
      "billing": "monthly",
      "features": ["Full Security Suite", "Unlimited users", "500GB storage", "AI Features"]
    }
  ],
  "current_plan": "Enterprise"
}
```

### 12. Sistemski moduli
**GET** `/api/modules`

**Zahteva:** Avtentikacijski žeton v header

**Odgovor (200):**
```json
{
  "Security": {
    "status": "active",
    "version": "2.1.0",
    "description": "Advanced security features including 2FA, audit logging, and encryption"
  },
  "Analytics": {
    "status": "active",
    "version": "1.8.0",
    "description": "Real-time analytics and reporting capabilities"
  }
}
```

### 13. Validacija licence
**POST** `/api/validate-license`

**Zahteva:**
```json
{
  "license_key": "OMNI-PREMIUM-2024-ABCD1234"
}
```

**Odgovor (200) - Veljavna licenca:**
```json
{
  "valid": true,
  "license_type": "enterprise",
  "expires_at": "2024-12-31T23:59:59Z",
  "features": ["security", "analytics", "ai_features"],
  "message": "License key is valid"
}
```

**Odgovor (200) - Neveljavna licenca:**
```json
{
  "valid": false,
  "message": "Invalid license key format"
}
```

## Napake

### Splošne napake

**401 Unauthorized:**
```json
{
  "error": "No token provided"
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid token"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Rate limit exceeded"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

## Varnostne funkcije

### 1. JWT Avtentikacija
- Vsi žetoni imajo omejeno veljavnost
- Žetoni vsebujejo uporabniški ID, uporabniško ime in ID seje

### 2. Omejevanje hitrosti (Rate Limiting)
- Omejeno število zahtev na minuto za posameznega uporabnika
- Zaščita pred DDoS napadi

### 3. Revizijsko beleženje
- Vse pomembne akcije se beležijo
- Sledenje IP naslovom in časovnim žigom

### 4. 2FA podpora
- Dvo-faktorska avtentikacija za dodatno varnost
- QR kode za nastavitev

### 5. Šifriranje
- Gesla so šifrirana z bcrypt
- Občutljivi podatki so šifrirani

## Testiranje API-ja

### Primer uporabe s PowerShell:

```powershell
# 1. Registracija
Invoke-WebRequest -Uri "http://localhost:5020/api/register" -Method POST -ContentType "application/json" -Body '{"username":"testuser","email":"test@example.com","password":"TestPass123!"}'

# 2. Prijava in pridobitev žetona
$response = Invoke-WebRequest -Uri "http://localhost:5020/api/login" -Method POST -ContentType "application/json" -Body '{"username":"testuser","password":"TestPass123!"}'
$json = $response.Content | ConvertFrom-Json
$token = $json.token

# 3. Dostop do zaščitenih endpointov
Invoke-WebRequest -Uri "http://localhost:5020/api/license/status" -Method GET -Headers @{"Authorization" = "Bearer $token"}
```

## Integracija z drugimi sistemi

Client Panel aplikacija je pripravljena za integracijo z:
- Licenčnim sistemom (port 5021)
- Marketplace moduli (port 5019)
- Node.js licenčnim strežnikom (port 3000)

Vsi sistemi delujejo sočasno in omogočajo popolno licenčno upravljanje.