# 🚀 Omni Cloud - Modularni Poslovni Sistem

**Popolna full-stack rešitev** - Express + Socket.IO + React + MongoDB + JWT + Admin Dashboard

## 🟢 Pregled Modulov

| Modul           | Status          | Front-end stran       | Back-end route        | Baza / API             | Posebnosti |
|-----------------|-----------------|----------------------|----------------------|------------------------|------------|
| Auth            | ✅ Deluje       | Auth.jsx              | /routes/auth.js       | Users                  | JWT, registracija, prijava |
| License         | ✅ Deluje       | License.jsx           | /routes/license.js    | Plans, Expiry          | Obvestila, cron za potek licenc |
| Tourism         | ✅ Deluje       | Tourism.jsx           | /routes/tourism.js    | Bookings, Offers       | Rezervacije, ponudbe |
| Horeca          | ✅ Deluje       | Horeca.jsx            | /routes/horeca.js     | Menu, Orders           | Naročila, meniji |
| Admin           | ✅ Deluje       | Admin.jsx             | /routes/admin.js      | Users, Modules         | Aktivacija modulov, pregled stanja |

**Legenda statusov:**
- ✅ = Delujoče
- 🟡 = V razvoju / testni fazi
- 🔴 = Še ni implementirano

**Testni rezultati:**
- ✅ Tourism API: Destinacije se uspešno pridobivajo
- ✅ Horeca API: Meni se uspešno pridobiva
- ✅ Auth API: Prijava deluje z JWT tokeni
- ✅ Frontend: Aplikacija se uspešno naloži na http://localhost:3001
- ✅ Socket.io: Realnočasovne povezave vzpostavljene

## 🔗 Arhitekturna povezava

```
Frontend (React/Vite) ↔ REST API ↔ Backend (Node.js/Express) ↔ Database (MongoDB/Demo)
                    ↘ Socket.io (realnočasovne obvestila o licencah)
```

## ⚡ Push-Button Setup (1-klik zagon)

```bash
# 1. Kloniraj ali prenesi projekt
git clone <repository-url>
cd omni-cloud

# 2. Push-button setup in zagon
npm run push-button
```

**To je to! 🎉** Aplikacija se bo avtomatsko namestila in zagnala na:
- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:5001

## 📁 Struktura projekta

```
omni-cloud/
│
├─ server/                    # 🔧 Backend (Node.js + Express)
│   ├─ index.cjs             # Glavni server z Express + Socket.IO
│   ├─ models/               # Mongoose modeli
│   │   ├─ User.js           # User schema
│   │   └─ DemoUser.js       # Demo User model (v-pomnilniška baza)
│   ├─ routes/               # API endpoints
│   │   ├─ auth.js           # Avtentikacija
│   │   ├─ license.js        # Upravljanje licenc
│   │   ├─ tourism.js        # Turistični modul
│   │   ├─ horeca.js         # Gostinski modul
│   │   └─ admin.js          # Admin funkcije
│   ├─ controllers/          # Poslovne logike
│   │   ├─ authController.js
│   │   ├─ licenseController.js
│   │   ├─ tourismController.js
│   │   ├─ horecaController.js
│   │   └─ adminController.js
│   ├─ middleware/           # Middleware funkcije
│   │   └─ auth.cjs          # JWT avtentikacija
│   ├─ utils/                # Pomožne funkcije
│   │   └─ index.js          # Cron jobs, Socket.io obvestila
│   └─ package.json          # Server dependencies
│
├─ client/                   # 🎨 Frontend (React + Vite)
│   ├─ src/
│   │   ├─ components/       # React komponente
│   │   │   ├─ Auth.jsx      # Avtentikacija
│   │   │   ├─ License.jsx   # Upravljanje licenc
│   │   │   ├─ Tourism.jsx   # Turistični modul
│   │   │   ├─ Horeca.jsx    # Gostinski modul
│   │   │   ├─ Admin.jsx     # Admin nadzorna plošča
│   │   │   └─ ModuleNavigation.jsx # Navigacija med moduli
│   │   ├─ App.jsx           # Glavna React aplikacija
│   │   ├─ main.jsx          # React entry point
│   │   └─ index.css         # Tailwind CSS stili
│   ├─ index.html            # HTML template
│   ├─ vite.config.js        # Vite konfiguracija
│   └─ package.json          # Client dependencies
│
├─ package.json              # Root package.json z setup skripti
└─ README.md                 # Ta datoteka
```

## 🔑 Ključne funkcionalnosti

### 🔐 Avtentikacija (Auth)
- JWT token sistem
- Registracija in prijava uporabnikov
- Varno shranjevanje gesel (bcrypt)
- Avtomatska validacija tokenov

### 📄 Upravljanje licenc (License)
- Različni paketi (demo, basic, premium, enterprise)
- Avtomatsko preverjanje poteka licenc (cron job)
- Realnočasovne obvestila o spremembah
- Downgrade na demo plan ob poteku

### 🏖️ Turizem (Tourism)
- Pregled destinacij (Bled, Ljubljana, Piran, Bohinj)
- Sistem rezervacij z datumi in gosti
- Filtriranje po kategorijah in ceni
- Upravljanje rezervacij (ustvarjanje, preklic)

### 🍽️ Gostinstvo (Horeca)
- Digitalni meni z kategorijami
- Sistem naročil z košarico
- Upravljanje naročil (oddaja, preklic)
- Zgodovina naročil

### 👨‍💼 Admin (Admin)
- Centralna nadzorna plošča
- Upravljanje uporabnikov
- Aktivacija/deaktivacija modulov
- Statistike in analitika
- Sistem obvestil

### 🌐 Socket.io obvestila
- Realnočasovne posodobitve licenc
- Admin obvestila o sistemskih dogodkih
- Heartbeat sistem za preverjanje povezave
- Avtomatsko pridružitev plan sobam

## 🔧 Ročni setup (če potrebuješ več nadzora)

### 1. 📋 Predpogoji
- Node.js 18+ 
- npm ali yarn
- Git

### 2. 🔧 Namestitev

```bash
# Kloniraj projekt
git clone <repository-url>
cd omni-cloud

# Namesti odvisnosti za server
cd server
npm install

# Namesti odvisnosti za client
cd ../client  
npm install

# Vrni se v root mapo
cd ..
```

### 3. ⚙️ Konfiguracija okolja

Ustvari `.env` datoteko v `server/` mapi:

```env
# Server konfiguracija
PORT=5001
NODE_ENV=development

# Baza podatkov (opcijsko - privzeto demo mode)
MONGODB_URI=mongodb://localhost:27017/omni-cloud
DEMO_MODE=true

# JWT konfiguracija
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=1h

# Redis (opcijsko - privzeto simuliran)
REDIS_URL=redis://localhost:6379

# Email konfiguracija (opcijsko)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cron jobs
ENABLE_CRON=false
```

### 4. 🚀 Zagon

**Opcija A: Ločeno zaganjanje**
```bash
# Terminal 1: Server
cd server
npm run dev

# Terminal 2: Client  
cd client
npm run dev
```

**Opcija B: Hkratno zaganjanje**
```bash
# V root mapi
npm run dev
```

### 5. 🌐 Dostop do aplikacije

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **API dokumentacija**: http://localhost:5001/api-docs (če je omogočena)

### 6. 👤 Testni uporabniki

**Admin uporabnik:**
- Email: `admin@omni-cloud.com`
- Geslo: `admin123`

**Demo uporabnik:**
- Email: `demo@omni-cloud.com`  
- Geslo: `demo123`

### 7. 🧪 Testiranje API-jev

```bash
# Prijava
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@omni-cloud.com","password":"admin123"}'

# Tourism destinacije
curl http://localhost:5001/api/tourism/destinations

# Horeca meni
curl http://localhost:5001/api/horeca/menu

# Admin pregled
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5001/api/admin/users
```

## 🌟 Funkcionalnosti

### 🔐 Backend (Express + Socket.IO + MongoDB)
- **JWT avtentikacija** z registracijo in prijavo
- **MongoDB** povezava z Mongoose
- **Socket.IO** real-time komunikacija
- **License management** API endpoints
- **Admin avtorizacija** za zaščitene poti
- **Cron job** za preverjanje poteka licenc
- **CORS** podpora za cross-origin zahteve
- **Middleware**: Avtentikacija, avtorizacija, rate limiting
- **Utils**: Pomožne funkcije za obveščanje in statistike

### 🎨 Frontend (React + Vite + Tailwind)
- **React 18** z modernimi hooks
- **Socket.IO klient** za real-time posodobitve
- **Admin Dashboard** z interaktivnimi grafi (Recharts)
- **Tailwind CSS** za hitro stiliziranje
- **Responsive design** za vse naprave
- **Real-time obvestila** in statistike
- **State Management**: React hooks za upravljanje stanja

### 🔐 Varnostne funkcionalnosti
- **JWT avtentikacija** z refresh tokeni
- **Bcrypt password hashing**
- **Rate limiting** za API zahteve
- **CORS konfiguracija**
- **Input validacija** in sanitizacija
- **SSL/TLS podpora**

### 📊 Admin Dashboard
- **Uporabniška tabela** z filtriranjem in sortiranjem
- **Interaktivni grafi** (Bar Chart, Pie Chart)
- **Real-time statistike** (skupaj, aktivni, potekli uporabniki)
- **WebSocket obvestila** v realnem času
- **Ocena prihodkov** na podlagi planov

## 🔑 API Endpoints

### Javni endpoints:
- `POST /api/register` - Registracija uporabnika
- `POST /api/login` - Prijava uporabnika
- `GET /api/health` - Health check

### Zaščiteni endpoints:
- `GET /api/profile` - Uporabniški profil (JWT)
- `GET /api/users` - Seznam vseh uporabnikov (Admin)
- `POST /api/setPlan` - Nastavi uporabniški plan (Admin)

### License endpoints:
- `POST /api/license/create` - Ustvari licenco (Admin)
- `POST /api/license/check` - Preveri licenco
- `PUT /api/license/extend` - Podaljšaj licenco (Admin)
- `DELETE /api/license/revoke` - Prekliči licenco (Admin)

## 🔌 WebSocket Events

### Klient → Server:
- `join_plan` - Pridruži se sobi glede na plan
- `ping` - Heartbeat za preverjanje povezave
- `leave_plan` - Zapusti sobo

### Server → Klient:
- `pong` - Odgovor na ping
- `license_update` - Posodobitev licence
- `user_update` - Posodobitev uporabnika
- `global_update` - Globalna obvestila
- `license_expired` - Obvestilo o poteku licence

## 🌍 Environment Variables

Ustvari `.env` datoteko v `server/` direktoriju:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/omni-cloud

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Server
PORT=5000
NODE_ENV=development
```

## 🚀 Production Deployment

Za produkcijski deployment sledite navodilom v [DEPLOYMENT.md](./DEPLOYMENT.md):

### Hitri deployment
```bash
# 1. Kloniraj repozitorij
git clone https://github.com/your-username/omni-cloud.git
cd omni-cloud

# 2. Namesti odvisnosti
npm run install:all

# 3. Konfiguriraj okolje
cp server/.env.example server/.env
# Uredi server/.env z vašimi nastavitvami

# 4. Build in deploy
npm run build
npm run start
```

### Produkcijske zahteve
- **Node.js** 18.0+
- **MongoDB** 5.0+
- **SSL certifikat** (Let's Encrypt)
- **Reverse proxy** (Nginx)
- **Process manager** (PM2)

## 📦 Dependencies

### Server:
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **socket.io** - Real-time komunikacija
- **jsonwebtoken** - JWT avtentikacija
- **bcrypt** - Password hashing
- **cors** - Cross-origin resource sharing
- **node-cron** - Cron job scheduling

### Client:
- **react** - UI library
- **vite** - Build tool
- **socket.io-client** - WebSocket klient
- **recharts** - Grafi in vizualizacije
- **tailwindcss** - CSS framework

## 🔧 Troubleshooting

### MongoDB ni nameščen?
```bash
# Windows (Chocolatey)
choco install mongodb

# macOS (Homebrew)
brew install mongodb-community

# Ubuntu/Debian
sudo apt install mongodb
```

### Port že v uporabi?
Spremeni porte v:
- `server/index.js` (PORT)
- `client/vite.config.js` (port: 3001)

### CORS napake?
Preveri CORS nastavitve v `server/index.js`

## 📞 Podpora

Za vprašanja in podporo odpri issue na GitHub repozitoriju.

---

**🎉 Uživaj z Omni Cloud platformo!** 

*Izdelano z ❤️ za hitro in enostavno deployment brez Dockerja.*