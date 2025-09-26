# Omni Licenčni Sistem

Napredni licenčni sistem za upravljanje in nadzor dostopa do Omni modulov z real-time posodobitvami in grafičnimi vmesniki.

## 🚀 Funkcionalnosti

### Licenčni Strežnik
- **WebSocket podpora** za real-time posodobitve
- **RESTful API** za upravljanje licenc
- **Demo licence** za testiranje
- **Avtomatska inicializacija** z demo podatki
- **CORS podpora** za različne domene

### Client Panel (Uporabniški vmesnik)
- **Licenčne informacije** - prikaz statusa, plana, poteka
- **Dinamično nalaganje modulov** glede na licenco
- **Real-time posodobitve** preko WebSocket
- **Moduli**:
  - 📊 **Ceniki** - upravljanje cen turistične ponudbe
  - 💰 **Blagajna** - prodaja in računi
  - 📦 **Zaloge** - upravljanje zalog in kapacitet
  - 🤖 **AI Optimizacija** - napredne analitike in optimizacija

### Admin GUI (Administratorski vmesnik)
- **Upravljanje licenc** - ustvarjanje, urejanje, brisanje
- **Real-time statistike** - aktivne licence, prihodki, uporaba
- **Filtriranje in iskanje** licenc
- **Paginacija** za velike količine podatkov
- **Sistemske nastavitve** in konfiguracija

## 📋 Sistemske zahteve

- **Node.js** 16.0 ali novejši
- **npm** 7.0 ali novejši
- **Electron** za GUI aplikacije
- **Windows** operacijski sistem

## 🛠️ Namestitev

### 1. Kloniraj repozitorij
```bash
git clone <repository-url>
cd omni-system
```

### 2. Namesti odvisnosti za strežnik
```bash
cd server
npm install
```

### 3. Namesti odvisnosti za Client Panel
```bash
cd ../client
npm install
```

### 4. Namesti odvisnosti za Admin GUI
```bash
cd ../admin
npm install
```

## 🚀 Zagon sistema

### 1. Zaženi licenčni strežnik
```bash
cd server
npm start
```
Strežnik bo dostopen na: `http://localhost:3003`

### 2. Zaženi Client Panel
```bash
cd client
npm start
```

### 3. Zaženi Admin GUI
```bash
cd admin
npm start
```

## 📡 API Endpoints

### Osnovni endpoints
- `GET /` - Osnovne informacije o strežniku
- `GET /api/license/all` - Pridobi vse licence

### Upravljanje licenc
- `POST /api/license/check` - Preveri veljavnost licence
- `POST /api/license/create` - Ustvari novo licenco
- `POST /api/license/toggle` - Preklopi status licence
- `POST /api/license/extend` - Podaljšaj licenco
- `DELETE /api/license/delete` - Izbriši licenco

### Primer API klica
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3003/api/license/all" -Method GET

# cURL
curl -X GET http://localhost:3003/api/license/all
```

## 🔌 WebSocket dogodki

Strežnik pošilja real-time posodobitve preko WebSocket:

- `license_update` - Splošne posodobitve licenc
- `license_created` - Nova licenca ustvarjena
- `license_updated` - Licenca posodobljena
- `license_deleted` - Licenca izbrisana
- `license_status_changed` - Spremenjen status licence
- `license_extended` - Licenca podaljšana

## 🎯 Demo licence

Sistem se inicializira z demo licencami:

| Client ID | Plan | Status | Moduli |
|-----------|------|--------|---------|
| DEMO001 | Premium | Aktivna | Vsi moduli |
| DEMO002 | Standard | Aktivna | Osnovni moduli |
| DEMO003 | Basic | Aktivna | Osnovni moduli |
| DEMO004 | Premium | Potekla | Brez dostopa |

## 🔧 Konfiguracija

### Strežnik (.env)
```env
PORT=3003
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:8080
WEBSOCKET_CORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:8080
```

### Client Panel (renderer.js)
```javascript
const SERVER_URL = 'http://localhost:3003';
const CLIENT_ID = 'demo-client-001';
```

### Admin GUI (renderer.js)
```javascript
const CONFIG = {
    serverUrl: 'http://localhost:3003',
    autoRefreshInterval: 30000,
    enableNotifications: true
};
```

## 📊 Moduli Client Panel-a

### 1. Ceniki
- Dodajanje, urejanje, brisanje cen
- Filtriranje po kategorijah in sezonah
- Iskanje in statistike
- Izvoz/uvoz podatkov

### 2. Blagajna
- Dodajanje izdelkov v košarico
- Različni načini plačila
- Zgodovina transakcij
- Generiranje potrdil

### 3. Zaloge
- Upravljanje zalog in kapacitet
- Rezervacije in razpoložljivost
- Analitika zalog
- Opozorila za nizke zaloge

### 4. AI Optimizacija
- KPI nadzorna plošča
- Priporočila za optimizacijo
- Napovedi in trendi
- Avtomatska optimizacija cen

## 🛡️ Varnost

- **CORS zaščita** za API endpoints
- **WebSocket avtentifikacija** z tokeni
- **Validacija vhodnih podatkov**
- **Varno shranjevanje licenčnih ključev**

## 🐛 Odpravljanje napak

### Pogosti problemi

1. **Strežnik se ne zažene**
   - Preveri, ali je port 3003 prost
   - Preveri .env konfiguracijo

2. **GUI aplikacije ne delujejo**
   - Preveri, ali je strežnik zagnan
   - Preveri konfiguracijo URL-jev

3. **WebSocket povezave ne delujejo**
   - Preveri CORS nastavitve
   - Preveri požarni zid

### Logi
- Strežnik: konzola terminala
- Client Panel: Developer Tools (F12)
- Admin GUI: Developer Tools (F12)

## 📈 Razvoj

### Struktura projekta
```
omni-system/
├── server/          # Licenčni strežnik
│   ├── server.js    # Glavna datoteka strežnika
│   ├── package.json
│   └── .env
├── client/          # Client Panel GUI
│   ├── main.js      # Electron glavna datoteka
│   ├── index.html   # GUI vmesnik
│   ├── renderer.js  # Frontend logika
│   ├── modules/     # Poslovni moduli
│   └── package.json
└── admin/           # Admin GUI
    ├── main.js      # Electron glavna datoteka
    ├── index.html   # Admin vmesnik
    ├── renderer.js  # Admin logika
    └── package.json
```

### Dodajanje novih modulov
1. Ustvari novo datoteko v `client/modules/`
2. Implementiraj modul z standardnim vmesnikom
3. Dodaj modul v `renderer.js` seznam
4. Konfiguriraj licenčne zahteve

## 📞 Podpora

Za tehnično podporo ali vprašanja kontaktiraj razvojno ekipo.

## 📄 Licenca

Omni Licenčni Sistem - Lastniška programska oprema
© 2024 Omni Systems. Vse pravice pridržane.