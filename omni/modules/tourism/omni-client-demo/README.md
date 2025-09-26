# Omni Client Demo - Client Panel z JWT licenčno integracijo

## 📋 Pregled

Demo sistem Client Panel z JWT licenčno integracijo, ki prikazuje, kako aplikacija ob zagonu preveri licenco, odklene module in se samodejno zaklene, če licenca ni veljavna.

## 🏗️ Struktura projekta

```
omni-client-demo/
├── server/                     # Licenčni API strežnik (Node.js)
│   ├── controllers/
│   │   └── licenseController.js
│   ├── models/
│   │   └── licenseModel.js
│   ├── routes/
│   │   └── license.js
│   ├── utils/
│   │   └── jwt.js
│   ├── package.json
│   └── server.js
├── client/                     # Client Panel demo
│   ├── modules/
│   │   ├── ceniki.js
│   │   ├── blagajna.js
│   │   ├── zaloge.js
│   │   └── AI_optimizacija.js
│   ├── package.json
│   └── client.js
└── README.md
```

## 🚀 Zagon sistema

### 1. Priprava okolja

```bash
# Namestitev odvisnosti za licenčni API strežnik
cd server
npm install

# Namestitev odvisnosti za Client Panel
cd ../client
npm install
```

### 2. Zagon licenčnega API strežnika

```bash
cd server
node server.js
```

Strežnik se zažene na `http://localhost:3002`

### 3. Zagon Client Panel demo

```bash
cd client

# Demo plan (ceniki, blagajna)
CLIENT_ID=DEMO001 node client.js

# Basic plan (ceniki, blagajna, zaloge)
CLIENT_ID=DEMO002 node client.js

# Premium plan (vsi moduli)
CLIENT_ID=DEMO003 node client.js

# Potekla licenca (za testiranje napak)
CLIENT_ID=EXPIRED001 node client.js
```

## 🔑 Demo licence

| Client ID | Plan | Status | Moduli | Poteče |
|-----------|------|--------|--------|--------|
| DEMO001 | demo | active | ceniki, blagajna | 2025-12-31 |
| DEMO002 | basic | active | ceniki, blagajna, zaloge | 2025-12-31 |
| DEMO003 | premium | active | vsi moduli | 2025-12-31 |
| EXPIRED001 | demo | expired | ceniki | 2024-12-31 |

## 📡 API endpointi

### Licenčni API strežnik (port 3002)

- `GET /` - Osnovne informacije
- `GET /health` - Preverjanje zdravja strežnika
- `POST /api/license/validate` - Validacija licence
- `POST /api/license/generate-token` - Generiranje JWT tokena
- `GET /api/license/info/:client_id` - Informacije o licenci
- `GET /api/license/all` - Vse licence
- `GET /api/license/status` - Status API-ja

### Primer validacije licence

```bash
curl -X POST http://localhost:3002/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{"client_id": "DEMO001"}'
```

## 🧪 Rezultati testiranja

### ✅ Veljavne licence

#### DEMO001 (demo plan)
```
🚀 OMNI CLIENT DEMO - Client Panel
═══════════════════════════════════════════════════════════════════════
📅 Zagon: 23. 9. 2025, 18:06:00
🆔 Client ID: DEMO001
🌐 License API: http://localhost:3002/api/license/validate
═══════════════════════════════════════════════════════════════════════

🔍 Preverjam licenco... (poskus 1/3)
✅ Licenca veljavna!
📋 Plan: DEMO
⏰ Poteče: 2025-12-31
👥 Maksimalno uporabnikov: 5
🔧 Dostopni moduli: ceniki, blagajna

🔧 Nalagam dostopne module...
──────────────────────────────────────────────────
📦 Nalagam modul: Ceniki...
   ✅ Ceniki uspešno naložen
📦 Nalagam modul: Blagajna...
   ✅ Blagajna uspešno naložen
──────────────────────────────────────────────────
✅ Naloženih 2/2 modulov

📊 Status sistema:
══════════════════════════════════════════════════
🟢 Status: AKTIVEN
⏱️  Čas delovanja: 1s
🔑 Licenca: Veljavna
📦 Naloženi moduli: 2
📋 Plan: demo
⏰ Poteče: 2025-12-31
══════════════════════════════════════════════════

🚀 Zaganjam dostopne module...
═══════════════════════════════════════════════════════════════════════

▶️  Zaganjam Ceniki...
▶️  Zaganjam Blagajna...

═══════════════════════════════════════════════════════════════════════
🎉 Vsi moduli so bili zagnani!

📋 Povzetek naloženih modulov:
────────────────────────────────────────────────────────────
1. Ceniki - Upravljanje cen in cennikov
2. Blagajna - Upravljanje prodaje in računov
────────────────────────────────────────────────────────────
✅ Skupaj aktivnih modulov: 2
```

#### DEMO002 (basic plan)
```
✅ Licenca veljavna!
📋 Plan: BASIC
⏰ Poteče: 2025-12-31
👥 Maksimalno uporabnikov: 10
🔧 Dostopni moduli: ceniki, blagajna, zaloge

📋 Povzetek naloženih modulov:
────────────────────────────────────────────────────────────
1. Ceniki - Upravljanje cen in cennikov
2. Blagajna - Upravljanje prodaje in računov
3. Zaloge - Upravljanje zalog in inventarja
────────────────────────────────────────────────────────────
✅ Skupaj aktivnih modulov: 3
```

#### DEMO003 (premium plan)
```
✅ Licenca veljavna!
📋 Plan: PREMIUM
⏰ Poteče: 2025-12-31
👥 Maksimalno uporabnikov: 50
🔧 Dostopni moduli: ceniki, blagajna, zaloge, AI_optimizacija

📋 Povzetek naloženih modulov:
────────────────────────────────────────────────────────────
1. Ceniki - Upravljanje cen in cennikov
2. Blagajna - Upravljanje prodaje in računov
3. Zaloge - Upravljanje zalog in inventarja
4. AI Optimizacija - AI-podprta analiza in optimizacija
────────────────────────────────────────────────────────────
✅ Skupaj aktivnih modulov: 4
```

### ❌ Neveljavne licence

#### EXPIRED001 (potekla licenca)
```
🔍 Preverjam licenco... (poskus 1/3)
❌ Napaka pri preverjanju licence (poskus 1):
   Status: 401
   Sporočilo: Licenca je potekla
⏳ Čakam 2s pred naslednjim poskusom...

🔍 Preverjam licenco... (poskus 2/3)
❌ Napaka pri preverjanju licence (poskus 2):
   Status: 401
   Sporočilo: Licenca je potekla
⏳ Čakam 2s pred naslednjim poskusom...

🔍 Preverjam licenco... (poskus 3/3)
❌ Napaka pri preverjanju licence (poskus 3):
   Status: 401
   Sporočilo: Licenca je potekla

🔒 APLIKACIJA ZAKLENJENA
══════════════════════════════════════════════════
❌ Licenca ni veljavna ali je potekla
📞 Kontaktirajte administratorja za podaljšanje licence
🌐 Ali preverite licenčni API strežnik
══════════════════════════════════════════════════

🔍 Diagnostične informacije:
   Client ID: EXPIRED001
   License API: http://localhost:3002/api/license/validate
   Čas: 23. 9. 2025, 18:07:08
```

#### INVALID001 (neobstoječa licenca)
```
🔍 Preverjam licenco... (poskus 1/3)
❌ Napaka pri preverjanju licence (poskus 1):
   Status: 404
   Sporočilo: Licenca za ta client_id ne obstaja
⏳ Čakam 2s pred naslednjim poskusom...

🔒 APLIKACIJA ZAKLENJENA
══════════════════════════════════════════════════
❌ Licenca ni veljavna ali je potekla
📞 Kontaktirajte administratorja za podaljšanje licence
🌐 Ali preverite licenčni API strežnik
══════════════════════════════════════════════════
```

## 🔧 Funkcionalnosti

### Client Panel
- **Avtomatska validacija licence** ob zagonu
- **Retry logika** (3 poskusi z 2s zamikom)
- **Modularna arhitektura** - nalaganje samo dovoljenih modulov
- **Samodejno zaklepanje** pri neveljavni licenci
- **Diagnostične informacije** za odpravljanje napak
- **Vizualni prikaz** statusa in modulov

### Licenčni API strežnik
- **JWT token podpora** za varno avtentikacijo
- **RESTful API** za upravljanje licenc
- **Validacija datumov** poteka licenc
- **Različni plani** z različnimi moduli
- **Zdravstveno preverjanje** strežnika
- **Logiranje zahtev** za spremljanje

### Moduli
- **Ceniki** - Upravljanje cen in cennikov
- **Blagajna** - Upravljanje prodaje in računov
- **Zaloge** - Upravljanje zalog in inventarja
- **AI Optimizacija** - AI-podprta analiza in optimizacija

## 🎯 Prednosti implementacije

1. **Samodejna blokada** po poteku licenc
2. **Aktivacija samo dovoljenih modulov** glede na plan
3. **Možnost nadgradnje** GUI ali REST klienta
4. **Ročno upravljanje licenc** preko admin konzole
5. **Varnost** z JWT tokeni
6. **Skalabilnost** za različne velikosti podjetij
7. **Enostavno testiranje** z demo računi

## 🔐 Varnostni vidiki

- JWT tokeni za avtentikacijo
- Validacija datumov poteka
- Retry logika za omrežne napake
- Diagnostične informacije brez občutljivih podatkov
- Centralizirano upravljanje licenc

## 🚀 Možne nadgradnje

1. **Grafični vmesnik** (React/Vue.js)
2. **Baza podatkov** za licence (PostgreSQL/MongoDB)
3. **Uporabniška avtentikacija** z vlogami
4. **Analitika uporabe** modulov
5. **Avtomatsko podaljševanje** licenc
6. **Obvestila** o poteku licenc
7. **Multi-tenant** podpora

## 📞 Podpora

Za vprašanja in podporo kontaktirajte razvojno ekipo ali preverite dokumentacijo API-ja na `http://localhost:3002/`.