# 🗄️ MongoDB Atlas Setup

## 1. **Ustvarjanje MongoDB Atlas Računa**

1. Pojdite na [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Kliknite **"Try Free"** ali **"Sign Up"**
3. Ustvarite račun z email naslovom
4. Potrdite email naslov

## 2. **Ustvarjanje Novega Projekta**

1. Po prijavi kliknite **"New Project"**
2. Ime projekta: `omni-threo`
3. Kliknite **"Next"** → **"Create Project"**

## 3. **Ustvarjanje Database Cluster**

1. Kliknite **"Build a Database"**
2. Izberite **"M0 Sandbox"** (FREE tier)
3. **Cloud Provider**: AWS
4. **Region**: Najbližja regija (npr. Frankfurt eu-central-1)
5. **Cluster Name**: `cluster0`
6. Kliknite **"Create"**

## 4. **Varnostne Nastavitve**

### **Database Access (Uporabnik)**
1. V levem meniju kliknite **"Database Access"**
2. Kliknite **"Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `omni-user`
5. **Password**: Generirajte varno geslo (shranite ga!)
6. **Database User Privileges**: **"Read and write to any database"**
7. Kliknite **"Add User"**

### **Network Access (IP Whitelist)**
1. V levem meniju kliknite **"Network Access"**
2. Kliknite **"Add IP Address"**
3. Kliknite **"Allow Access from Anywhere"** (0.0.0.0/0)
   - **Opomba**: Za produkcijo omejite na specifične IP naslove
4. Kliknite **"Confirm"**

## 5. **Pridobivanje Connection String**

1. Pojdite na **"Database"** → **"Connect"**
2. Izberite **"Connect your application"**
3. **Driver**: Node.js
4. **Version**: 4.1 or later
5. Kopirajte connection string:

```
mongodb+srv://omni-user:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
```

## 6. **Konfiguracija za Omni Threo**

### **Za Render.com Backend:**
```env
MONGO_URI=mongodb+srv://omni-user:YOUR_PASSWORD@cluster0.mongodb.net/omni?retryWrites=true&w=majority
```

### **Zamenjajte:**
- `YOUR_PASSWORD` → Vaše generirano geslo
- `omni` → Ime baze podatkov

## 7. **Testiranje Povezave**

### **Lokalno testiranje:**
```bash
cd backend
# Posodobite .env datoteko z MongoDB URI
npm start
```

### **Preverjanje v MongoDB Atlas:**
1. Pojdite na **"Database"** → **"Browse Collections"**
2. Po prvem zagonu aplikacije se bo ustvarila baza `omni`
3. Preverite ali se ustvarijo kolekcije: `licenses`, `users`

## 8. **Dodatne Nastavitve**

### **Database Name:**
- Glavna baza: `omni`
- Test baza: `omni-test`

### **Collections:**
- `licenses` - Licence podatki
- `users` - Uporabniški podatki
- `logs` - Sistem logi

### **Indexes (Avtomatsko):**
- `licenses.client_id` - Unique index
- `licenses.expires_at` - TTL index
- `users.username` - Unique index

## 9. **Varnostni Nasveti**

✅ **Priporočeno:**
- Uporabite močna gesla
- Omejite IP dostop na produkciji
- Redno spremljajte dostope
- Uporabljajte read-only uporabnike kjer je možno

❌ **Izogibajte se:**
- Shranjevanju gesel v kodi
- Odprtemu dostopu (0.0.0.0/0) na produkciji
- Uporabi admin pravic za aplikacijo

## 10. **Monitoring**

MongoDB Atlas ponuja:
- **Real-time Performance Advisor**
- **Query Performance insights**
- **Automated Backup**
- **Alerts & Monitoring**

---

## 🔗 Koristne Povezave

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Node.js MongoDB Driver](https://mongodb.github.io/node-mongodb-native/)
- [Connection String Options](https://docs.mongodb.com/manual/reference/connection-string/)

---

**Opomba**: Po uspešni konfiguraciji posodobite `MONGO_URI` v Render.com environment variables.