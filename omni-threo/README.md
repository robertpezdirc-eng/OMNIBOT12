# 🚀 Omni Threo - Cloud License Management System

Popoln sistem za upravljanje licenc z real-time posodobitvami, namenjen cloud deployment-u brez Docker-ja.

## 📋 Pregled

Omni Threo je napredna platforma za upravljanje licenc, ki vključuje:

- **Backend API** (Node.js + Express + MongoDB + Socket.IO)
- **Admin GUI** (React) za upravljanje licenc
- **Client Panel** (React) za preverjanje licenc
- **Cloud Deployment** konfiguracije za Render.com in Vercel

## 🏗️ Arhitektura

```
omni-threo/
├── 📁 backend/           # Node.js API strežnik
├── 📁 admin/             # React Admin GUI
├── 📁 client/            # React Client Panel
├── 📁 scripts/           # Setup in deployment skripte
└── 📁 docs/              # Dokumentacija
```

## 🎯 Navodila za Namestitev

Repozitorij je popolnoma pripravljen za takojšnjo uporabo. Sledite tem korakom za uspešno namestitev:

### 1. Kloniranje repozitorija
```bash
git clone <URL-repozitorija>
cd omni-threo
```

### 2. Nastavitev okolja
```bash
# Avtomatska nastavitev environment variables
cd scripts
npm install
node setup-env.js development
cd ..
```

### 3. Namestitev odvisnosti
```bash
# Backend
cd backend
npm install

# Admin GUI
cd ../admin
npm install

# Client Panel
cd ../client
npm install
```

### 4. Zagon aplikacije

**Backend API:**
- Produkcijski način:
  ```bash
  cd backend
  npm start
  ```
- Razvojni način z debugiranjem:
  ```bash
  cd backend
  npm run debug
  ```

**Admin GUI:**
```bash
cd admin
npm start
```

**Client Panel:**
```bash
cd client
npm start
```

### 5. Dostop do aplikacije
- **Backend API**: `http://localhost:3000`
- **Admin GUI**: `http://localhost:3001`
- **Client Panel**: `http://localhost:3002`

## 🔧 Konfiguracija

### Environment Variables

Backend potrebuje naslednje spremenljivke:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/omni_threo
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001,http://localhost:3002
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=debug
```

React aplikaciji potrebujeta:

```env
REACT_APP_API_URL=http://localhost:3000
```

## 🌐 API Endpoints

### Licence

| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/licenses/create` | Ustvari novo licenco |
| GET | `/api/licenses/check/:licenseKey` | Preveri licenco |
| PUT | `/api/licenses/toggle/:licenseKey` | Preklopi status licence |
| POST | `/api/licenses/extend/:licenseKey` | Podaljša licenco |

### Admin

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/admin/licenses` | Pridobi vse licence |
| GET | `/api/admin/stats` | Pridobi statistike |

### Primer API Klica

```javascript
// Ustvarjanje nove licence
const response = await fetch('/api/licenses/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    client_id: 'client123',
    plan: 'premium',
    duration_months: 12
  })
});
```

## 🎯 Funkcionalnosti

### Backend Features

- ✅ JWT avtentikacija
- ✅ MongoDB integracija
- ✅ Socket.IO real-time posodobitve
- ✅ Rate limiting
- ✅ Error handling
- ✅ Logging sistem
- ✅ CORS konfiguracija
- ✅ Helmet varnost

### Admin GUI Features

- ✅ Dashboard s statistikami
- ✅ Tabela licenc z filtriranjem
- ✅ Grafi in vizualizacije
- ✅ Ustvarjanje novih licenc
- ✅ Podaljšanje licenc
- ✅ Preklapljanje statusa
- ✅ Real-time posodobitve
- ✅ Responsive design

### Client Panel Features

- ✅ Avtomatsko preverjanje licenc
- ✅ Real-time posodobitve
- ✅ Offline mode
- ✅ Status indikatorji
- ✅ Modul management
- ✅ Activity logging

## 🚀 Cloud Deployment

### Render.com (Backend)

1. Ustvari nov Web Service na Render.com
2. Poveži GitHub repository
3. Nastavi build command: `npm install`
4. Nastavi start command: `npm start`
5. Dodaj environment variables iz `.env.example`

### Vercel (Frontend)

```bash
# Deploy Admin GUI
cd admin
vercel --prod

# Deploy Client Panel
cd client
vercel --prod
```

### MongoDB Atlas

1. Ustvari MongoDB Atlas cluster
2. Ustvari database user
3. Dodaj IP addresses v whitelist
4. Kopiraj connection string v `MONGO_URI`

## 📊 Monitoring in Logging

### Backend Logging

```javascript
// Debug informacije
console.log('🔍 License check:', { licenseKey, clientId });

// Error handling
console.error('❌ Database error:', error.message);

// Success responses
console.log('✅ License created:', newLicense.license_key);
```

### Real-time Events

```javascript
// Backend emits
socket.emit('license_update', {
  type: 'status_changed',
  licenseKey: license.license_key,
  newStatus: license.status
});

// Frontend listens
socket.on('license_update', (data) => {
  console.log('📡 License update received:', data);
});
```

## 🔒 Varnost

### Implementirane Varnostne Funkcije

- ✅ JWT token avtentikacija
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ CORS konfiguracija
- ✅ Helmet security headers
- ✅ Input validation (Joi)
- ✅ MongoDB injection protection
- ✅ Environment variables za secrets

### Varnostni Checklist

- [ ] Posodobi CORS origins za produkcijo
- [ ] Nastavi MongoDB IP whitelist
- [ ] Rotiraj JWT secrets redno
- [ ] Omogoči HTTPS v produkciji
- [ ] Nastavi monitoring in alerts
- [ ] Implementiraj backup strategijo

## 🧪 Navodila za Testiranje

Sistem vključuje celovit nabor testov za zagotavljanje kakovosti:

### Backend Testiranje
```bash
cd backend

# Osnovni testi
npm test

# Celoten testni nabor
npm run test:full

# Testiranje v načinu debugiranja
npm run test:debug

# Avtomatski test runner
node test-runner.js
```

### Frontend Testiranje
```bash
# Admin GUI testi
cd admin
npm test

# Client Panel testi
cd client
npm test
```

### API Testiranje
```bash
# Test API endpoints
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/licenses/create \
  -H "Content-Type: application/json" \
  -d '{"client_id": "test", "plan": "premium", "duration_months": 12}'
```

### Integracijsko Testiranje
```bash
# Zaženi vse komponente in testiraj povezljivost
cd scripts
node integration-test.js
```

## 📈 Performance

### Optimizacije

- MongoDB indeksi za hitrejše poizvedbe
- Socket.IO za real-time komunikacijo
- React.memo za optimizacijo renderiranja
- Lazy loading komponent
- API response caching
- Gzip kompresija

### Monitoring Metriki

- API response times
- Database query performance
- WebSocket connection count
- Error rates
- License usage statistics

## 🔄 Development Workflow

### Git Workflow

```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create pull request
# After review and merge
git checkout main
git pull origin main
```

### Code Standards

- ESLint za JavaScript linting
- Prettier za code formatting
- Husky za pre-commit hooks
- Conventional commits
- JSDoc komentarji

## 🐛 Troubleshooting

### Pogoste Napake

#### MongoDB Connection Error

```bash
Error: MongoNetworkError: failed to connect to server
```

**Rešitev:**
1. Preveri MongoDB URI
2. Preveri network connectivity
3. Preveri IP whitelist v MongoDB Atlas

#### CORS Error

```bash
Access to fetch blocked by CORS policy
```

**Rešitev:**
1. Posodobi `CORS_ORIGIN` v backend .env
2. Preveri API_URL v frontend .env

#### JWT Token Error

```bash
JsonWebTokenError: invalid token
```

**Rešitev:**
1. Preveri JWT_SECRET v backend
2. Preveri token expiration
3. Regeneriraj token

## 📚 Dodatni Viri

### Dokumentacija

- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.IO Documentation](https://socket.io/docs/)

### Deployment Platforme

- [Render.com Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)

## 🤝 Prispevanje

1. Fork repository
2. Ustvari feature branch
3. Commit spremembe
4. Push v branch
5. Ustvari Pull Request

## 📄 Licenca

MIT License - glej [LICENSE](LICENSE) datoteko za podrobnosti.

## 👥 Tim

- **Backend Development**: Node.js + Express + MongoDB
- **Frontend Development**: React + Ant Design
- **DevOps**: Render.com + Vercel deployment
- **Documentation**: Comprehensive guides

## 📞 Podpora

Za vprašanja in podporo:

- 📧 Email: support@omni-threo.com
- 💬 Discord: [Omni Threo Community]
- 📖 Wiki: [Project Wiki]
- 🐛 Issues: [GitHub Issues]

---

**Omni Threo** - Napredna platforma za upravljanje licenc 🚀