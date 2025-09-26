# 🔐 OMNI SISTEM - VODIČ ZA DOSTOP

## 🎯 Pregled sistemov

### Aktivni sistemi:
- **Lokalni Omni**: `http://localhost:3002` (Node.js)
- **Vercel Produkcija**: `https://omnibot-12-wt1w.vercel.app/`
- **Debug Dashboard**: `http://localhost:3333` (Novo!)

## 🚀 Kako omogočiti popoln dostop

### 1. Debug Dashboard (AKTIVNO)
```
URL: http://localhost:3333
Debug Key: omni_debug_2024
```

**Dostopni endpoints:**
- `/status` - Status vseh sistemov
- `/processes` - Aktivni procesi
- `/config` - Omni konfiguracija
- `/logs` - Sistemski logi
- `/connections` - Aktivne povezave
- `/vercel` - Vercel integracija
- `/restart` - Restart komponent
- `/clear-cache` - Čiščenje cache-a

### 2. API ključi za napredni dostop

Kopiraj v svojo `.env` datoteko:
```env
# Debug dostop
DEBUG_ACCESS_KEY=omni_debug_2024_secure_key
DEBUG_MODE=true

# Vercel integracija
VERCEL_TOKEN=your_vercel_token_here
VERCEL_PROJECT_ID=omnibot-12-wt1w

# API ključi
OMNI_API_KEY=omni_api_key_2024
OMNI_SECRET_KEY=omni_secret_key_2024
```

### 3. Vercel Token pridobitev

1. Pojdi na: https://vercel.com/account/tokens
2. Ustvari nov token z imenom "Omni Debug Access"
3. Kopiraj token v `.env` datoteko

### 4. Testiranje dostopa

```bash
# Preveri debug dashboard
curl http://localhost:3333/status

# Preveri Vercel integracijo
node vercel-integration.js status

# Sinhroniziraj sisteme
node vercel-integration.js sync
```

## 🔍 Debug možnosti

### A) Preko Debug Dashboard-a
1. Odpri: `http://localhost:3333`
2. Uporabi debug key: `omni_debug_2024`
3. Dostopaj do vseh sistemskih informacij

### B) Preko API klicev
```javascript
// Status sistemov
fetch('http://localhost:3333/status?key=omni_debug_2024')

// Omni konfiguracija
fetch('http://localhost:3333/config?key=omni_debug_2024')

// Vercel podatki
fetch('http://localhost:3333/vercel?key=omni_debug_2024')
```

### C) Preko Vercel integracije
```bash
# Preveri status
node vercel-integration.js status

# Pridobi logove
node vercel-integration.js logs

# Debug podatki
node vercel-integration.js debug
```

## 📊 Monitoring in analitika

### Avtomatsko spremljanje:
- **Sync reports**: `data/sync_reports/`
- **Sistemski logi**: Debug dashboard
- **Performance metrike**: Vercel analytics

### Ročno preverjanje:
```bash
# Preveri vse procese
tasklist | findstr "node\|python"

# Preveri porte
netstat -ano | findstr "3002\|3333\|8080"

# Preveri Omni status
curl http://localhost:3002/api/status
```

## 🛠️ Troubleshooting

### Problem: Ne morem dostopati do debug dashboard-a
**Rešitev:**
```bash
cd C:\Users\admin\Downloads\copy-of-copy-of-omniscient-ai-platform
node debug-access.js
```

### Problem: Vercel integracija ne deluje
**Rešitev:**
1. Nastavi VERCEL_TOKEN v .env
2. Preveri projekt ID
3. Zaženi: `node vercel-integration.js status`

### Problem: Konflikti med sistemi
**Rešitev:**
1. Preveri debug dashboard: `http://localhost:3333/processes`
2. Restart komponent: `http://localhost:3333/restart`
3. Počisti cache: `http://localhost:3333/clear-cache`

## 🎯 Naslednji koraki

1. **Nastavi Vercel token** za popolno integracijo
2. **Testiraj debug endpoints** za preverjanje funkcionalnosti
3. **Konfiguriraj monitoring** za avtomatsko spremljanje
4. **Dokumentiraj custom endpoints** za specifične potrebe

## 📞 Pomoč

Če potrebuješ dodatno pomoč:
1. Preveri debug dashboard za sistemske informacije
2. Poglej sync reports za zgodovino
3. Uporabi Vercel CLI za napredne funkcije

---
*Ustvarjeno: ${new Date().toISOString()}*
*Verzija: 1.0.0*