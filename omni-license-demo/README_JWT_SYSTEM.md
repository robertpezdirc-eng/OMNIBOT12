# JWT Licenčni Sistem - Napredna Implementacija

## Pregled

Napredni JWT licenčni sistem z samodejnim potekanjem licenc, varnostnimi funkcijami in poenostavljeno logiko preverjanja.

## Ključne Funkcionalnosti

### 🔐 Varnostne Funkcije
- **JWT Token Validacija**: Vsi tokeni so podpisani z varnim ključem
- **Samodejno Potekanje**: Licence se samodejno deaktivirajo po poteku
- **Client ID Validacija**: Preverjanje ujemanja client_id z JWT payload
- **Status Preverjanje**: Aktivne/deaktivirane licence

### ⏰ Samodejno Potekanje Licenc
- **Demo Plan**: 14 dni
- **Basic Plan**: 90 dni (3 mesece)
- **Premium Plan**: 365 dni (1 leto)

### 🎯 Poenostavljena Logika
- Iskanje licence po `client_id` in `license_token`
- Preverjanje statusa licence
- JWT validacija za samodejno potekanje
- Vračanje podatkov iz dekodiranega tokena

## API Endpointi

### 1. Validacija Licence
```
POST /api/license/validate
Content-Type: application/json

{
  "client_id": "DEMO001",
  "license_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Uspešen Odgovor (200):**
```json
{
  "valid": true,
  "client_id": "DEMO001",
  "plan": "demo",
  "modules": ["ceniki"],
  "expires_at": "14d",
  "issued_at": "2025-09-23T15:00:00.000Z"
}
```

**Neuspešni Odgovori:**
- `400`: Manjkajo obvezni parametri
- `404`: Licenca ni najdena
- `403`: Licenca deaktivirana ali potekla

### 2. Informacije o Licenci
```
GET /api/license/info/:client_id
```

**Odgovor (200):**
```json
{
  "client_id": "DEMO001",
  "modules": ["ceniki"],
  "status": "active",
  "created_at": "2025-09-23T15:00:00.000Z"
}
```

### 3. Health Check
```
GET /api/license/health
```

**Odgovor (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-23T15:30:00.000Z",
  "version": "2.0.0",
  "environment": "development"
}
```

## Struktura Projekta

```
omni-license-demo/
├── controllers/
│   └── licenseController.js    # Glavna logika preverjanja
├── models/
│   └── licenseModel.js         # Simulacija baze podatkov
├── routes/
│   └── license.js              # API poti
├── utils/
│   └── jwt.js                  # JWT pripomočki
├── .env                        # Okoljske spremenljivke
├── server.js                   # Express strežnik
└── package.json                # Odvisnosti
```

## Testni Primeri

### Veljavne Licence
```javascript
// DEMO001 - demo plan
{
  "client_id": "DEMO001",
  "license_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// CAMP123 - premium plan
{
  "client_id": "CAMP123", 
  "license_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// BASIC001 - basic plan
{
  "client_id": "BASIC001",
  "license_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Testiranje z Node.js
```javascript
// Test validacije
const response = await fetch('http://localhost:3001/api/license/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        client_id: 'DEMO001',
        license_token: 'eyJhbGciOiJIUzI1NiIs...'
    })
});

const result = await response.json();
console.log(result);
```

## Konfiguracija

### Okoljske Spremenljivke (.env)
```
JWT_SECRET=omni_super_secret_key_12345
JWT_EXPIRES_IN=365d
PORT=3001
NODE_ENV=development
```

### Zaganjanje Strežnika
```bash
# Namestitev odvisnosti
npm install

# Zagon strežnika
npm start
# ali
node server.js
```

## Varnostni Ukrepi

1. **JWT Secret**: Varen ključ za podpisovanje tokenov
2. **Token Validacija**: Preverjanje podpisa in poteka
3. **Client ID Ujemanje**: Preprečevanje zlorabe tokenov
4. **Status Preverjanje**: Deaktivirane licence se zavrnejo
5. **Error Handling**: Varno ravnanje z napakami

## Testni Scenariji

### ✅ Uspešni Testi
- Validacija veljavne licence (DEMO001, CAMP123, BASIC001)
- Health check endpoint
- License info endpoint
- Zavrnitev napačnega tokena
- Zavrnitev neobstoječega client_id

### ❌ Pričakovane Napake
- **Licenca potekla**: JWT token je potekel (403)
- **Licenca ni najdena**: Napačen client_id ali token (404)
- **Licenca deaktivirana**: Status ni "active" (403)
- **Manjkajo parametri**: Nepopolna zahteva (400)

## Prednosti Nove Implementacije

1. **Samodejno Potekanje**: Licence se samodejno deaktivirajo
2. **Poenostavljena Logika**: Manj kompleksnosti, več zanesljivosti
3. **Varnostne Funkcije**: JWT podpis in validacija
4. **Konsistentnost**: Fiksni tokeni za testiranje
5. **Skalabilnost**: Enostavno dodajanje novih licenc

## Vzdrževanje

- **Dodajanje Licenc**: Posodobi `licenseModel.js`
- **Spreminjanje Planov**: Posodobi module in čase poteka
- **Varnostni Ključ**: Redno menjaj `JWT_SECRET`
- **Monitoring**: Preverjaj health endpoint

---

**Verzija**: 2.0.0  
**Datum**: 23. september 2025  
**Status**: Produkcijsko pripravljen ✅