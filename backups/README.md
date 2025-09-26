# Omni Platforma - Backup

## Backup datoteka
- **Ime datoteke**: `omni-backup-2025-09-25_22-59-38.zip`
- **Datum ustvarjanja**: 25. september 2025, 22:59:38
- **Vsebina**: Celotna Omni platforma z vsemi moduli, konfiguracijami in podatki

## Kako obnoviti backup

### 1. Razpakiranje
```powershell
# Ustvari novo mapo za obnovo
mkdir "C:\Omni-Restored"

# Razpakuj backup
Expand-Archive -Path "omni-backup-2025-09-25_22-59-38.zip" -DestinationPath "C:\Omni-Restored"
```

### 2. Namestitev odvisnosti
```powershell
# Pojdi v mapo projekta
cd "C:\Omni-Restored"

# Namesti Node.js odvisnosti
npm install

# Pojdi v frontend mapo in namesti odvisnosti
cd frontend
npm install
cd ..
```

### 3. Konfiguracija
1. Preveri `.env` datoteke in prilagodi nastavitve
2. Nastavi MongoDB povezavo
3. Preveri licenčne ključe

### 4. Zagon
```powershell
# Zaženi backend strežnik
npm start

# V novi terminal seji zaženi frontend (če potrebno)
cd frontend
npm run dev
```

## Vsebina backup-a
- ✅ Backend sistem (Node.js, Express)
- ✅ Frontend aplikacija (React, Vite)
- ✅ Modeli in middleware
- ✅ Avtentikacija in licenčni sistem
- ✅ Vsi moduli (Turizem, Gostinstvo, Čebelarstvo, itd.)
- ✅ Konfiguracije in nastavitve
- ✅ Dokumentacija

## Opombe
- Backup ne vsebuje `node_modules` map (se namestijo z `npm install`)
- Backup ne vsebuje podatkovnih baz (MongoDB, SQLite)
- Preveri, da imaš nameščene vse potrebne odvisnosti (Node.js, MongoDB, itd.)

## Kontakt
Za pomoč pri obnovi kontaktiraj sistemskega administratorja.