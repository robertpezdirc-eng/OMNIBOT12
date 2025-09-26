# API Dokumentacija - License Server

## Pregled

License Server API omogoča upravljanje licenc za Omniscient AI Platform. Strežnik teče na portu 3001 in podpira HTTP protokol.

## Base URL
```
http://localhost:3001
```

## Endpoints

### 1. Health Check
**GET** `/api/health`

Preveri status strežnika.

**Response:**
```json
{
  "status": "OK",
  "service": "License Server",
  "version": "1.0.0",
  "timestamp": "2025-09-24T16:45:50.123456"
}
```

### 2. License Validation
**POST** `/api/license/validate`

Validira licenčni ključ.

**Request Body:**
```json
{
  "license_key": "string"
}
```

**Response:**
```json
{
  "valid": true,
  "license_key": "TEST-123",
  "message": "License validation endpoint working",
  "timestamp": "2025-09-24T16:45:50.123456"
}
```

### 3. License Creation
**POST** `/api/license/create`

Ustvari novo licenco.

**Request Body:**
```json
{
  "client_id": "string",
  "plan": "string"
}
```

**Response:**
```json
{
  "success": true,
  "license_id": "test-license-1758725150",
  "client_id": "test",
  "plan": "basic",
  "message": "License creation endpoint working",
  "timestamp": "2025-09-24T16:45:50.123456"
}
```

### 4. License Toggle
**POST** `/api/license/toggle`

Preklopi status licence (aktivna/neaktivna).

**Request Body:**
```json
{
  "client_id": "string"
}
```

**Response:**
```json
{
  "success": true,
  "client_id": "test",
  "status": "toggled",
  "message": "License toggle endpoint working",
  "timestamp": "2025-09-24T16:45:50.123456"
}
```

## CORS Support

Vsi endpoints podpirajo CORS z naslednjimi headers:
- `Access-Control-Allow-Origin: *`
- `Content-Type: application/json`

## Test Strežnik

Za testiranje je na voljo Python test strežnik (`test-server.py`), ki implementira vse zgoraj navedene endpoints.

**Zagon:**
```bash
python test-server.py
```

**Test API endpoints:**
```bash
node test-api-fixed.js
```

## Status Codes

- `200 OK` - Uspešna zahteva
- `404 Not Found` - Endpoint ne obstaja
- `500 Internal Server Error` - Napaka strežnika

## Opombe

- Vsi endpoints vračajo JSON format
- Timestamps so v ISO 8601 formatu
- Test strežnik je namenjen samo za razvoj in testiranje