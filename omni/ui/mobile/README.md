# Omni Mobile - Mobilna Aplikacija za Upravljanje Sistema

## Pregled

Omni Mobile je napredna mobilna aplikacija za upravljanje Omni AI platforme. Aplikacija omogoča real-time nadzor nad IoT napravami, spremljanje sistemskih metrik, upravljanje opozoril in izvajanje hitrih akcij.

## Značilnosti

### 🎛️ Nadzorna Plošča
- **Real-time metrike**: CPU, pomnilnik, omrežje, aktivne naprave
- **Sistemski pregled**: Status sistema, uptime, verzija
- **Hitre akcije**: Varnostne kopije, skeniranje naprav, nujni izklop
- **Opozorila**: Prikaz najnovejših sistemskih opozoril

### 📱 Upravljanje Naprav
- **IoT naprave**: Pregled vseh povezanih naprav
- **Krmiljenje**: Vklop/izklop naprav z enim dotikom
- **Status**: Real-time status in vrednosti senzorjev
- **Skeniranje**: Avtomatsko odkrivanje novih naprav

### 📊 Analitika
- **Performanse**: Grafični prikaz sistemskih performans
- **Energijska poraba**: Dnevna in mesečna statistika
- **AI napovedi**: Inteligentne napovedi porabe in obremenitve

### ⚙️ Nastavitve
- **Push obvestila**: Konfiguracija obvestil
- **Temni način**: Preklapljanje med svetlo/temno temo
- **Varnostni način**: Dodatna varnostna preverjanja
- **Izvoz podatkov**: Izvoz sistemskih podatkov

## Tehnične Specifikacije

### Frontend
- **HTML5/CSS3**: Responsive design za mobilne naprave
- **JavaScript ES6+**: Moderna JavaScript funkcionalnost
- **WebSocket**: Real-time komunikacija s serverjem
- **Chart.js**: Interaktivni grafi in vizualizacije
- **Font Awesome**: Ikone in grafični elementi

### Backend
- **Node.js**: Server-side JavaScript
- **Express.js**: Web framework
- **WebSocket**: Real-time komunikacija
- **RESTful API**: Standardni API endpoints

## Namestitev in Zagon

### Predpogoji
```bash
# Node.js (verzija 14 ali novejša)
node --version

# NPM ali Yarn
npm --version
```

### Namestitev odvisnosti
```bash
# V glavnem direktoriju projekta
npm install express ws
```

### Zagon aplikacije
```bash
# Zagon mobilnega backend serverja
node omni/ui/mobile/mobile_backend.js

# Server bo zagnan na portu 3001
# Mobilna aplikacija: http://localhost:3001/mobile
```

## API Endpoints

### Sistemske informacije
- `GET /api/system/status` - Status sistema
- `GET /api/metrics` - Sistemske metrike

### Upravljanje naprav
- `GET /api/devices` - Seznam vseh naprav
- `GET /api/devices/:id` - Podrobnosti naprave
- `POST /api/devices/:id/control` - Krmiljenje naprave

### Opozorila
- `GET /api/alerts` - Seznam opozoril
- `POST /api/alerts/:id/read` - Označi opozorilo kot prebrano

### Varnostne kopije
- `POST /api/backup/create` - Ustvari varnostno kopijo
- `GET /api/export/data` - Izvozi podatke

## WebSocket Sporočila

### Klient → Server
```javascript
// Krmiljenje naprave
{
    "type": "device_control",
    "deviceId": "sensor_01",
    "action": "on"
}

// Zahteva za metrike
{
    "type": "get_metrics"
}

// Skeniranje naprav
{
    "type": "scan_devices"
}
```

### Server → Klient
```javascript
// Posodobitev metrik
{
    "type": "metrics",
    "payload": {
        "cpu": 45,
        "memory": {...},
        "network": {...}
    }
}

// Posodobitev naprave
{
    "type": "device_update",
    "payload": {
        "id": "sensor_01",
        "status": "online",
        "value": 22.5
    }
}

// Novo opozorilo
{
    "type": "alert",
    "payload": {
        "id": "alert_123",
        "type": "warning",
        "title": "Visoka temperatura",
        "message": "Senzor #1 beleži 28.5°C"
    }
}
```

## Struktura Datotek

```
omni/ui/mobile/
├── mobile_app.html          # Glavna mobilna aplikacija
├── mobile_backend.js        # Backend server
├── README.md               # Ta dokumentacija
└── assets/                 # Dodatni resursi (če potrebno)
```

## Konfiguracija

### Sprememba porta
```javascript
// V mobile_backend.js
const backend = new MobileBackend(3001); // Spremeni port tukaj
```

### WebSocket konfiguracija
```javascript
// V mobile_app.html
wsConnection = new WebSocket('ws://localhost:3001'); // Spremeni URL
```

## Varnost

### Avtentikacija
- Trenutno brez avtentikacije (za razvoj)
- Priporočena implementacija JWT tokenov za produkcijo

### CORS
- Omogočen za vse domene (za razvoj)
- Priporočena omejitev na specifične domene za produkcijo

### HTTPS
- Trenutno HTTP (za razvoj)
- Priporočena uporaba HTTPS za produkcijo

## Troubleshooting

### Pogosti problemi

1. **WebSocket povezava neuspešna**
   - Preveri, ali backend server teče
   - Preveri port in URL v konfiguraciji

2. **Naprave se ne prikazujejo**
   - Preveri API endpoint `/api/devices`
   - Preveri konzolo za JavaScript napake

3. **Metrike se ne posodabljajo**
   - Preveri WebSocket povezavo
   - Preveri, ali server pošilja metrike

### Debug način
```javascript
// Omogoči debug izpise v konzoli
localStorage.setItem('debug', 'true');
```

## Razvoj

### Dodajanje novih naprav
```javascript
// V mobile_backend.js, metoda initializeDevices()
const newDevice = {
    id: 'unique_id',
    name: 'Ime naprave',
    type: 'tip_naprave',
    status: 'online',
    value: 0,
    location: 'Lokacija',
    icon: 'fas fa-icon'
};
```

### Dodajanje novih metrik
```javascript
// V mobile_backend.js, metoda updateSystemMetrics()
this.systemMetrics.newMetric = calculateNewMetric();
```

### Dodajanje novih API endpoints
```javascript
// V mobile_backend.js, metoda setupAPIRoutes()
this.app.get('/api/new-endpoint', (req, res) => {
    res.json({ data: 'response' });
});
```

## Licenca

Ta projekt je del Omni AI platforme in je zaščiten z ustrezno licenco.

## Podpora

Za vprašanja in podporo kontaktirajte razvojno ekipo Omni AI platforme.

---

**Verzija**: 2.1.0  
**Zadnja posodobitev**: Januar 2024  
**Kompatibilnost**: Node.js 14+, Moderni brskalniki