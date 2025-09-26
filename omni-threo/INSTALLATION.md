# 🎯 Navodila za Namestitev

Repozitorij je popolnoma pripravljen za takojšnjo uporabo. Sledite tem korakom za uspešno namestitev:

## 1. **Kloniranje repozitorija**
```bash
git clone <URL-repozitorija>
cd omni-threo
```

## 2. **Nastavitev okolja**
- Ustvarite novo `.env` datoteko in kopirajte vsebino iz `.env.example`
- Prilagodite spremenljivke okolja v `.env` datoteki po potrebi

### Avtomatska nastavitev:
```bash
cd scripts
npm install
node setup-env.js development
cd ..
```

### Ročna nastavitev:
Ustvarite `.env` datoteko v `backend` direktoriju:
```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/omni-threo
JWT_SECRET=your-super-secret-jwt-key
API_URL=http://localhost:3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
CORS_ORIGIN=http://localhost:3001,http://localhost:3002
```

## 3. **Namestitev odvisnosti**
```bash
cd backend
npm install
```

### Dodatne komponente (opcijsko):
```bash
# Admin GUI
cd ../admin
npm install

# Client Panel
cd ../client
npm install
```

## 4. **Zagon aplikacije**

### Backend API:
- **Produkcijski način:**
  ```bash
  cd backend
  npm start
  ```
- **Razvojni način z debugiranjem:**
  ```bash
  cd backend
  npm run debug
  ```

### Frontend komponente (opcijsko):
```bash
# Admin GUI
cd admin
npm start

# Client Panel
cd client
npm start
```

## 5. **Dostop do aplikacije**
Aplikacija bo dostopna na naslovu:
- **Backend API**: `http://localhost:3000`
- **Admin GUI**: `http://localhost:3001` (če je zagnana)
- **Client Panel**: `http://localhost:3002` (če je zagnana)

---

# 🧪 Navodila za Testiranje

Sistem vključuje celovit nabor testov za zagotavljanje kakovosti:

## **Osnovni testi**:
```bash
cd backend
npm test
```

## **Celoten testni nabor**:
```bash
cd backend
npm run test:full
```

## **Testiranje v načinu debugiranja**:
```bash
cd backend
npm run test:debug
```

## **Avtomatski test runner**:
```bash
cd backend
node test-runner.js
```

## **Integracijsko testiranje**:
```bash
cd scripts
node integration-test.js
```

## **API testiranje**:
```bash
# Test osnovnih endpointov
curl http://localhost:3000/api/health
curl http://localhost:3000/api/licenses

# Test ustvarjanja licence
curl -X POST http://localhost:3000/api/licenses/create \
  -H "Content-Type: application/json" \
  -d '{"client_id": "test", "plan": "premium", "duration_months": 12}'
```

---

# 🔧 Dodatne Konfiguracije

## MongoDB Nastavitve
```bash
# Lokalna MongoDB
mongod --dbpath ./data/db

# MongoDB Atlas (cloud)
# Posodobite MONGO_URI v .env datoteki
```

## Docker Deployment
```bash
# Zagon z Docker Compose
docker-compose up -d

# Gradnja posameznih slik
docker build -t omni-threo-backend .
docker build -f Dockerfile.react -t omni-threo-admin ./admin
```

## Cloud Deployment
Sledite navodilom v `DEPLOYMENT.md` za:
- Render.com (Backend)
- Vercel (Frontend)
- MongoDB Atlas (Database)

---

# 🚨 Odpravljanje Težav

## Pogoste napake:

### Port že v uporabi
```bash
# Najdite proces na portu 3000
netstat -ano | findstr :3000
# Ustavite proces
taskkill /PID <PID> /F
```

### MongoDB povezava neuspešna
- Preverite ali je MongoDB zagnan
- Preverite MONGO_URI v .env datoteki
- Preverite omrežne nastavitve

### Moduli niso najdeni
```bash
# Ponovno namestite odvisnosti
rm -rf node_modules package-lock.json
npm install
```

---

# 📞 Podpora

Za dodatno pomoč:
- Preverite `README.md` za podrobno dokumentacijo
- Preverite `DEPLOYMENT.md` za cloud deployment
- Odprite issue na GitHub repozitoriju
- Kontaktirajte razvojno ekipo

---

**Opomba**: Privzete poverilnice so shranjene v `scripts/CREDENTIALS.txt` po zagonu setup skripte.