# 🚀 Omni Threo - Quick Start Guide

Hitri vodič za zagon Omni Threo sistema v 5 minutah.

## ⚡ Predpogoji

- Node.js 14+ 
- MongoDB (lokalno ali Atlas)
- Git

## 🏃‍♂️ Hitri Zagon

### 1. Kloniraj in Nastavi

```bash
git clone <your-repo>
cd omni-threo

# Generiraj environment variables
cd scripts
node setup-env.js development
cd ..
```

### 2. Zaženi Backend

```bash
cd backend
npm install
npm run dev
```

Backend bo dostopen na: http://localhost:3000

### 3. Zaženi Admin GUI (nov terminal)

```bash
cd admin
npm install
npm start
```

Admin GUI bo dostopen na: http://localhost:3001

### 4. Zaženi Client Panel (nov terminal)

```bash
cd client
npm install
npm start
```

Client Panel bo dostopen na: http://localhost:3002

## 🔑 Privzete Poverilnice

Po zagonu `setup-env.js` preveri datoteko `scripts/CREDENTIALS.txt`:

```
Username: admin
Password: [generirano geslo]
```

## 🧪 Hitro Testiranje

### 1. Odpri Admin GUI
- Pojdi na http://localhost:3001
- Prijavi se z admin poverilnicami

### 2. Ustvari Licenco
- Klikni "Create License"
- Vnesi Client ID: `test-client`
- Izberi Plan: `premium`
- Klikni "Create"

### 3. Testiraj Client Panel
- Pojdi na http://localhost:3002
- Vnesi licenčni ključ iz Admin GUI
- Preveri status in module

## 🔧 Konfiguracija

### MongoDB

**Lokalno:**
```env
MONGO_URI=mongodb://localhost:27017/omni_threo
```

**Atlas:**
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/omni_threo
```

### API Endpoints

- Health Check: `GET /api/health`
- Create License: `POST /api/licenses/create`
- Check License: `GET /api/licenses/check/:key`

## 🚨 Troubleshooting

### Backend ne more dostopati do MongoDB
```bash
# Preveri ali MongoDB teče
mongod --version

# Ali posodobi MONGO_URI v backend/.env
```

### CORS napake
```bash
# Preveri REACT_APP_API_URL v admin/.env in client/.env
echo $REACT_APP_API_URL
```

### Port že v uporabi
```bash
# Spremeni PORT v backend/.env
PORT=3001
```

## 📱 Funkcionalnosti

### Admin GUI
- ✅ Dashboard s statistikami
- ✅ Upravljanje licenc
- ✅ Real-time posodobitve
- ✅ Grafi in vizualizacije

### Client Panel
- ✅ Preverjanje licenc
- ✅ Status modulov
- ✅ Offline mode
- ✅ Activity log

### Backend API
- ✅ RESTful API
- ✅ WebSocket real-time
- ✅ JWT avtentikacija
- ✅ Rate limiting

## 🌐 Deployment

### Lokalni Docker
```bash
docker-compose up -d
```

### Cloud Deployment
1. **Backend** → Render.com
2. **Frontend** → Vercel
3. **Database** → MongoDB Atlas

Podrobna navodila: [DEPLOYMENT.md](DEPLOYMENT.md)

## 📞 Podpora

- 📖 Dokumentacija: [README.md](README.md)
- 🚀 Deployment: [DEPLOYMENT.md](DEPLOYMENT.md)
- 🐛 Issues: GitHub Issues

---

**Uspešen zagon!** 🎉 Tvoj Omni Threo sistem je pripravljen za uporabo.