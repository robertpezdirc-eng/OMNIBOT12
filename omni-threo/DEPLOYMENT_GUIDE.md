# 🚀 Omni Threo Cloud Deployment Guide

## 📋 Pregled Deployment Procesa

Ta vodič vas vodi skozi deployment Omni Threo sistema na cloud platforme:
- **Backend**: Render.com
- **Admin GUI**: Vercel
- **Client Panel**: Vercel  
- **Database**: MongoDB Atlas

---

## 🗄️ 1. MongoDB Atlas Setup

Sledite navodilom v <mcfile name="MONGODB_SETUP.md" path="C:\Users\admin\Downloads\copy-of-copy-of-omniscient-ai-platform\omni-threo\MONGODB_SETUP.md"></mcfile>

**Ključni podatki:**
```env
MONGO_URI=mongodb+srv://omni-user:YOUR_PASSWORD@cluster0.mongodb.net/omni
```

---

## 🔧 2. Backend Deployment (Render.com)

### **2.1 Priprava Kode**
```bash
cd backend
git init
git branch -M main
git add .
git commit -m "Omni Backend"
```

### **2.2 GitHub Repository**
1. Ustvarite nov GitHub repository: `omni-threo-backend`
2. Dodajte remote origin:
```bash
git remote add origin https://github.com/USERNAME/omni-threo-backend.git
git push -u origin main
```

### **2.3 Render.com Setup**
1. Pojdite na [Render.com](https://render.com)
2. Kliknite **"New +"** → **"Web Service"**
3. Povežite GitHub repository
4. **Nastavitve:**
   - **Name**: `omni-threo-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free

### **2.4 Environment Variables**
```env
NODE_ENV=production
PORT=8080
MONGO_URI=mongodb+srv://omni-user:YOUR_PASSWORD@cluster0.mongodb.net/omni
JWT_SECRET=someRandomSecret123
CORS_ORIGIN=https://omni-admin.vercel.app,https://omni-client.vercel.app
```

### **2.5 Deployment URL**
Po uspešnem deployment: `https://omni-threo-backend.onrender.com`

---

## 🎨 3. Admin GUI Deployment (Vercel)

### **3.1 Priprava Admin Kode**
```bash
cd ../admin
```

### **3.2 Posodobitev Environment Variables**
Ustvarite `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://omni-threo-backend.onrender.com
```

### **3.3 Git Setup**
```bash
git init
git branch -M main
git add .
git commit -m "Omni Admin GUI"
```

### **3.4 GitHub Repository**
```bash
git remote add origin https://github.com/USERNAME/omni-admin-gui.git
git push -u origin main
```

### **3.5 Vercel Deployment**
1. Pojdite na [Vercel.com](https://vercel.com)
2. Kliknite **"New Project"**
3. Import GitHub repository
4. **Nastavitve:**
   - **Framework Preset**: React
   - **Root Directory**: `./` (če je admin v root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### **3.6 Environment Variables (Vercel)**
```env
NEXT_PUBLIC_API_URL=https://omni-threo-backend.onrender.com
```

### **3.7 Deployment URL**
Po uspešnem deployment: `https://omni-admin.vercel.app`

---

## 👥 4. Client Panel Deployment (Vercel)

### **4.1 Priprava Client Kode**
```bash
cd ../client
```

### **4.2 Posodobitev Environment Variables**
Ustvarite `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://omni-threo-backend.onrender.com
```

### **4.3 Git Setup**
```bash
git init
git branch -M main
git add .
git commit -m "Omni Client Panel"
```

### **4.4 GitHub Repository**
```bash
git remote add origin https://github.com/USERNAME/omni-client-panel.git
git push -u origin main
```

### **4.5 Vercel Deployment**
Enako kot Admin GUI, samo z drugim repository.

### **4.6 Deployment URL**
Po uspešnem deployment: `https://omni-client.vercel.app`

---

## 🔄 5. CORS Konfiguracija

### **5.1 Posodobitev Backend CORS**
V `backend/.env`:
```env
CORS_ORIGIN=https://omni-admin.vercel.app,https://omni-client.vercel.app
```

### **5.2 Redeploy Backend**
```bash
cd backend
git add .
git commit -m "Update CORS for production URLs"
git push
```

---

## ✅ 6. Testiranje Deployment

### **6.1 Backend API Test**
```bash
curl https://omni-threo-backend.onrender.com/api/health
```

**Pričakovan odgovor:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-XX...",
  "database": "connected"
}
```

### **6.2 Admin GUI Test**
1. Odprite: `https://omni-admin.vercel.app`
2. Prijavite se z: `admin` / `admin123`
3. Preverite dashboard funkcionalnost

### **6.3 Client Panel Test**
1. Odprite: `https://omni-client.vercel.app`
2. Testirajte registracijo/prijavo
3. Preverite licence management

### **6.4 WebSocket Test**
```javascript
// V browser console
const socket = io('https://omni-threo-backend.onrender.com');
socket.on('connect', () => console.log('Connected!'));
```

---

## 🔧 7. Troubleshooting

### **Pogosti Problemi:**

#### **Backend ne dela:**
- Preverite MongoDB connection string
- Preverite environment variables na Render
- Preverite logs na Render dashboard

#### **CORS napake:**
- Preverite `CORS_ORIGIN` v backend `.env`
- Preverite da so URL-ji pravilni (brez trailing slash)

#### **Frontend ne more dostopati do API:**
- Preverite `NEXT_PUBLIC_API_URL` na Vercel
- Preverite da backend dela (health endpoint)

#### **WebSocket ne dela:**
- Render free tier ima omejitve za WebSocket
- Preverite da je Socket.IO pravilno konfiguriran

### **Debug Ukazi:**
```bash
# Backend logs
curl https://omni-threo-backend.onrender.com/api/debug

# Test MongoDB connection
curl https://omni-threo-backend.onrender.com/api/db-status

# Test environment
curl https://omni-threo-backend.onrender.com/api/env-check
```

---

## 📊 8. Monitoring & Maintenance

### **Render.com:**
- Avtomatski restart ob napakah
- Logs dostopni v dashboard
- Metrics za performance

### **Vercel:**
- Avtomatski deployment ob Git push
- Analytics za obiske
- Performance insights

### **MongoDB Atlas:**
- Real-time monitoring
- Automated backups
- Performance advisor

---

## 🔐 9. Varnostni Nasveti

✅ **Priporočeno:**
- Uporabite močne JWT secrets
- Omejite MongoDB IP dostop
- Redno posodabljajte dependencies
- Monitorite logs za sumljive aktivnosti

❌ **Izogibajte se:**
- Shranjevanju secrets v kodi
- Odprtemu CORS (*)
- Uporabi default gesel

---

## 📋 10. Deployment Checklist

- [ ] MongoDB Atlas konfiguriran
- [ ] Backend deployed na Render
- [ ] Admin GUI deployed na Vercel
- [ ] Client Panel deployed na Vercel
- [ ] CORS pravilno nastavljen
- [ ] Environment variables nastavljene
- [ ] API endpoints testiran
- [ ] WebSocket funkcionalnost testirana
- [ ] Admin login deluje
- [ ] Client registracija deluje
- [ ] Licence management deluje

---

## 🔗 Finalni URL-ji

Po uspešnem deployment:

- **Backend API**: `https://omni-threo-backend.onrender.com`
- **Admin GUI**: `https://omni-admin.vercel.app`
- **Client Panel**: `https://omni-client.vercel.app`
- **MongoDB**: `cluster0.mongodb.net`

---

**Opomba**: Render free tier ima "cold start" - prva zahteva lahko traja 30+ sekund.