# 🚀 Omni Threo - Deployment Guide

Podrobna navodila za deployment Omni Threo sistema v cloud okolje.

## 📋 Pregled Deployment-a

Omni Threo uporablja tri-tier arhitekturo:

1. **Backend API** → Render.com
2. **Admin GUI** → Vercel
3. **Client Panel** → Vercel
4. **Database** → MongoDB Atlas

## 🎯 Pred Deployment-om

### Priprava Kode

```bash
# 1. Kloniraj projekt
git clone <your-repo-url>
cd omni-threo

# 2. Nastavi environment
cd scripts
npm install
npm run setup:render

# 3. Testiraj lokalno
cd ../backend && npm install && npm run dev
cd ../admin && npm install && npm start
cd ../client && npm install && npm start
```

### Potrebni Računi

- [x] GitHub račun (za source code)
- [x] MongoDB Atlas račun (brezplačen M0)
- [x] Render.com račun (brezplačen tier)
- [x] Vercel račun (brezplačen tier)

## 🍃 MongoDB Atlas Setup

### 1. Ustvari Cluster

1. Pojdi na https://cloud.mongodb.com/
2. Ustvari nov račun ali se prijavi
3. Klikni "Build a Database"
4. Izberi "M0 Sandbox" (brezplačno)
5. Izberi regijo (najbližjo uporabnikom)
6. Klikni "Create Cluster"

### 2. Ustvari Database User

1. V "Database Access" klikni "Add New Database User"
2. Izberi "Password" authentication
3. Vnesi username in generiraj močno geslo
4. Dodeli "Atlas admin" privilegije
5. Klikni "Add User"

### 3. Nastavi Network Access

1. V "Network Access" klikni "Add IP Address"
2. Za development: klikni "Allow Access from Anywhere" (0.0.0.0/0)
3. Za produkcijo: dodaj specifične IP naslove
4. Klikni "Confirm"

### 4. Pridobi Connection String

1. Klikni "Connect" na svojem cluster-ju
2. Izberi "Connect your application"
3. Kopiraj connection string
4. Zamenjaj `<password>` z dejanskim geslom

```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/omni_threo?retryWrites=true&w=majority
```

## 🚀 Render.com Backend Deployment

### 1. Pripravi Repository

```bash
# Commit vse spremembe
git add .
git commit -m "feat: prepare for deployment"
git push origin main
```

### 2. Ustvari Web Service

1. Pojdi na https://render.com/
2. Klikni "New +" → "Web Service"
3. Poveži GitHub repository
4. Izberi svoj repository in branch (main)

### 3. Konfiguriraj Service

**Basic Settings:**
- Name: `omni-threo-backend`
- Environment: `Node`
- Region: `Oregon (US West)` ali najbližja
- Branch: `main`
- Root Directory: `backend`

**Build & Deploy:**
- Build Command: `npm install`
- Start Command: `npm start`

### 4. Dodaj Environment Variables

V "Environment" sekciji dodaj:

```env
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/omni_threo?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-64-chars-long
JWT_EXPIRES_IN=7d
API_URL=https://your-app-name.onrender.com
FRONTEND_URL=https://your-admin.vercel.app,https://your-client.vercel.app
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
CORS_ORIGIN=https://your-admin.vercel.app,https://your-client.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### 5. Deploy

1. Klikni "Create Web Service"
2. Počakaj, da se deployment zaključi (5-10 minut)
3. Preveri logs za morebitne napake
4. Testiraj API endpoint: `https://your-app.onrender.com/api/health`

## ⚡ Vercel Frontend Deployment

### 1. Namesti Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 2. Deploy Admin GUI

```bash
cd admin

# Nastavi environment variable
echo "REACT_APP_API_URL=https://your-app.onrender.com" > .env

# Deploy
vercel --prod

# Sledi navodilom:
# - Project name: omni-threo-admin
# - Directory: ./
# - Override settings: No
```

### 3. Deploy Client Panel

```bash
cd ../client

# Nastavi environment variable
echo "REACT_APP_API_URL=https://your-app.onrender.com" > .env

# Deploy
vercel --prod

# Sledi navodilom:
# - Project name: omni-threo-client
# - Directory: ./
# - Override settings: No
```

### 4. Posodobi Backend CORS

Po deployment-u posodobi backend environment variables:

```env
FRONTEND_URL=https://omni-threo-admin.vercel.app,https://omni-threo-client.vercel.app
CORS_ORIGIN=https://omni-threo-admin.vercel.app,https://omni-threo-client.vercel.app
```

## 🔧 Post-Deployment Konfiguracija

### 1. Testiraj Povezave

```bash
# Test backend health
curl https://your-app.onrender.com/api/health

# Test admin GUI
open https://omni-threo-admin.vercel.app

# Test client panel
open https://omni-threo-client.vercel.app
```

### 2. Ustvari Prvo Licenco

```bash
# Preko Admin GUI ali API
curl -X POST https://your-app.onrender.com/api/licenses/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "client_id": "test-client",
    "plan": "premium",
    "duration_months": 12
  }'
```

### 3. Preveri Real-time Funkcionalnost

1. Odpri Admin GUI in Client Panel
2. Ustvari novo licenco v Admin GUI
3. Preveri, če se posodobitve prikazujejo v realnem času

## 📊 Monitoring in Maintenance

### Render.com Monitoring

1. **Logs**: Render Dashboard → Service → Logs
2. **Metrics**: CPU, Memory, Response times
3. **Alerts**: Nastavi email obvestila za downtime

### Vercel Monitoring

1. **Analytics**: Vercel Dashboard → Analytics
2. **Functions**: Monitor serverless function performance
3. **Deployments**: Preveri deployment history

### MongoDB Atlas Monitoring

1. **Performance Advisor**: Optimizacija poizvedb
2. **Real-time Performance Panel**: CPU, Memory, Connections
3. **Alerts**: Nastavi opozorila za visoko uporabo

## 🔒 Varnostne Nastavitve

### 1. Produkcijske Varnostne Nastavitve

```env
# Backend .env
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=50
```

### 2. MongoDB Atlas Varnost

- Omogoči IP Whitelist (ne 0.0.0.0/0)
- Uporabi močna gesla
- Omogoči database auditing
- Nastavi backup schedule

### 3. Render.com Varnost

- Omogoči HTTPS (avtomatsko)
- Nastavi custom domain z SSL
- Uporabi environment variables za secrets
- Omogoči auto-deploy samo za main branch

### 4. Vercel Varnost

- Nastavi custom domains
- Omogoči preview deployments samo za team
- Uporabi environment variables
- Nastavi security headers

## 🚨 Troubleshooting

### Backend Issues

**Problem**: Service ne more dostopati do MongoDB
```bash
# Preveri connection string
# Preveri IP whitelist v MongoDB Atlas
# Preveri network connectivity
```

**Problem**: CORS napake
```bash
# Posodobi CORS_ORIGIN v backend environment
# Preveri REACT_APP_API_URL v frontend
```

### Frontend Issues

**Problem**: API klici ne delujejo
```bash
# Preveri REACT_APP_API_URL
# Preveri backend health endpoint
# Preveri browser console za napake
```

**Problem**: Real-time posodobitve ne delujejo
```bash
# Preveri WebSocket povezave v browser dev tools
# Preveri backend logs za Socket.IO napake
```

### Database Issues

**Problem**: Počasne poizvedbe
```bash
# Preveri MongoDB Atlas Performance Advisor
# Dodaj potrebne indekse
# Optimiziraj poizvedbe
```

## 📈 Skaliranje

### Backend Skaliranje

1. **Render.com**: Nadgradi na Standard plan za več CPU/RAM
2. **Load Balancing**: Uporabi Render.com load balancer
3. **Database**: Nadgradi MongoDB Atlas cluster

### Frontend Skaliranje

1. **Vercel**: Avtomatsko skaliranje (serverless)
2. **CDN**: Vercel Edge Network
3. **Caching**: Nastavi cache headers

### Database Skaliranje

1. **Vertical Scaling**: Nadgradi cluster tier
2. **Horizontal Scaling**: Sharding (M30+)
3. **Read Replicas**: Za read-heavy workloads

## 💰 Stroški

### Brezplačni Tier Limiti

**MongoDB Atlas M0:**
- 512 MB storage
- Shared RAM
- No backup

**Render.com Free:**
- 750 ur/mesec
- Spins down po neaktivnosti
- 100 GB bandwidth

**Vercel Hobby:**
- 100 GB bandwidth
- Unlimited deployments
- Custom domains

### Nadgradnje

**MongoDB Atlas M10**: $9/mesec
**Render.com Starter**: $7/mesec
**Vercel Pro**: $20/mesec

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        # Render auto-deploys on push

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        run: |
          npm i -g vercel
          cd admin && vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
          cd ../client && vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

## 📞 Podpora

Za deployment vprašanja:

1. **Render.com**: https://render.com/docs
2. **Vercel**: https://vercel.com/docs
3. **MongoDB Atlas**: https://docs.atlas.mongodb.com/
4. **Project Issues**: GitHub Issues

---

**Uspešen deployment!** 🎉 Tvoj Omni Threo sistem je zdaj v produkciji.