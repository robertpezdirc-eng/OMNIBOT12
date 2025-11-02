# 📦 Status Arhiviranja Projekta / Project Archive Status

## 🇸🇮 Slovenščina

### Osnovne Informacije

**Datum arhiviranja:** [ČE BO ARHIVIRANO - vstavite datum]  
**Zadnja verzija:** 2.0.0  
**Zadnji commit:** c76d3f3522190204cc6993cc6e3aee3cb49030a2  
**Repozitorij:** https://github.com/robertpezdirc-eng/OMNIBOT12

### Razlog za Arhiviranje

[Izpolnite pred arhiviranjem - navedite razlog, npr.:]
- Projekt je zaključen in v produkciji
- Migracija na novo platformo
- Združitev z drugim projektom
- Projekt ni več vzdrževan

### Končno Stanje Sistema

#### ✅ Delujoče Komponente

**Backend:**
- ✅ `server.js` - Glavni Node.js strežnik
- ✅ `app.js` - Express aplikacija
- ✅ `omni_core.py` - Python jedro sistema
- ✅ `omni_master_launcher.py` - Glavni zagonski sistem

**Frontend:**
- ✅ Admin panel (`admin/`)
- ✅ Client dashboard (`client/`)
- ✅ IoT dashboard komponente
- ✅ Mobile terminal

**Baze Podatkov:**
- ✅ MongoDB integracija
- ✅ SQLite baze (devops.db, finance.db, tourism.db, itd.)
- ✅ Multi-tenant arhitektura

**API & Komunikacija:**
- ✅ REST API endpoints
- ✅ WebSocket (Socket.IO) komunikacija
- ✅ MQTT protokol za IoT
- ✅ Bing API integracija

**Varnost:**
- ✅ JWT avtentikacija
- ✅ SSL/TLS podpora
- ✅ Rate limiting
- ✅ Licenčni sistem

**DevOps:**
- ✅ Docker podpora (Dockerfile, docker-compose.yml)
- ✅ Nginx konfiguracija
- ✅ CI/CD pipeline (.github/workflows/)
- ✅ Systemd servisi

#### ⚠️ Znane Omejitve in Issues

[Izpolnite pred arhiviranjem - navedite znane probleme:]
- [Primer: Performance issue pri >1000 simultanih povezavah]
- [Primer: SSL certifikat je treba obnoviti ročno]
- [Seznam odprtih issues]

### Tehnične Podrobnosti

#### Odvisnosti

**Node.js:**
- Node.js: >= 18.0.0
- Express: ^4.x
- Socket.IO: ^4.x
- Mongoose: ^7.x
- Glej `package.json` za celoten seznam

**Python:**
- Python: >= 3.8
- Flask: ^2.x
- PyMongo: ^4.x
- Glej `requirements.txt` za celoten seznam

#### Sistemske Zahteve

- **OS:** Linux (Ubuntu 20.04+), Windows 10+, macOS 10.15+
- **RAM:** Minimalno 4GB, priporočeno 8GB+
- **Disk:** Minimalno 10GB prostora
- **MongoDB:** 6.0+
- **Docker:** 20.10+ (če se uporablja kontejnerizacija)

### Varnostne Kopije

#### Lokacija Varnostnih Kopij

[Izpolnite s podatki o vaših varnostnih kopijah:]
- **Lokalna shramba:** [pot do lokalnih varnostnih kopij]
- **Oblačna shramba:** [povezava do oblačne shrambe]
- **Datum zadnje varnostne kopije:** [datum]

#### Vsebina Varnostnih Kopij

- [ ] Celoten git repozitorij (z zgodovino)
- [ ] MongoDB podatki (vse baze)
- [ ] SQLite baze
- [ ] Konfiguracijske datoteke (.env, .json, .yml)
- [ ] SSL certifikati
- [ ] Dokumentacija
- [ ] Issues in Pull Requesti
- [ ] Wiki (če obstaja)
- [ ] Release notes

### Dokumentacija

Glavni dokumenti, ki opisujejo sistem:
- `README.md` - Glavni dokumentacijski dokument
- `ARCHIVING.md` - Ta dokument z navodili za arhiviranje
- `API-DOCUMENTATION.md` - API dokumentacija
- `DEPLOYMENT.md` - Navodila za namestitev
- `SECURITY.md` - Varnostne smernice
- `CHANGELOG.md` - Seznam sprememb

### Kontaktne Informacije

**Vzdrževalec:** robertpezdirc-eng  
**GitHub:** https://github.com/robertpezdirc-eng  
**Email:** [vstavite email]  
**Website:** [vstavite website, če obstaja]

### Alternativni Projekti

[Če obstajajo nasledniki ali podobni projekti, jih navedite tukaj:]
- [Ime projekta]: [URL] - [kratek opis]

---

## 🇬🇧 English

### Basic Information

**Archive Date:** [IF ARCHIVED - insert date]  
**Last Version:** 2.0.0  
**Last Commit:** c76d3f3522190204cc6993cc6e3aee3cb49030a2  
**Repository:** https://github.com/robertpezdirc-eng/OMNIBOT12

### Reason for Archiving

[Fill before archiving - state the reason, e.g.:]
- Project completed and in production
- Migration to new platform
- Merged with another project
- Project no longer maintained

### Final System State

#### ✅ Working Components

**Backend:**
- ✅ `server.js` - Main Node.js server
- ✅ `app.js` - Express application
- ✅ `omni_core.py` - Python system core
- ✅ `omni_master_launcher.py` - Main launcher system

**Frontend:**
- ✅ Admin panel (`admin/`)
- ✅ Client dashboard (`client/`)
- ✅ IoT dashboard components
- ✅ Mobile terminal

**Databases:**
- ✅ MongoDB integration
- ✅ SQLite databases (devops.db, finance.db, tourism.db, etc.)
- ✅ Multi-tenant architecture

**API & Communication:**
- ✅ REST API endpoints
- ✅ WebSocket (Socket.IO) communication
- ✅ MQTT protocol for IoT
- ✅ Bing API integration

**Security:**
- ✅ JWT authentication
- ✅ SSL/TLS support
- ✅ Rate limiting
- ✅ License system

**DevOps:**
- ✅ Docker support (Dockerfile, docker-compose.yml)
- ✅ Nginx configuration
- ✅ CI/CD pipeline (.github/workflows/)
- ✅ Systemd services

#### ⚠️ Known Limitations and Issues

[Fill before archiving - list known problems:]
- [Example: Performance issue with >1000 simultaneous connections]
- [Example: SSL certificate needs manual renewal]
- [List of open issues]

### Technical Details

#### Dependencies

**Node.js:**
- Node.js: >= 18.0.0
- Express: ^4.x
- Socket.IO: ^4.x
- Mongoose: ^7.x
- See `package.json` for full list

**Python:**
- Python: >= 3.8
- Flask: ^2.x
- PyMongo: ^4.x
- See `requirements.txt` for full list

#### System Requirements

- **OS:** Linux (Ubuntu 20.04+), Windows 10+, macOS 10.15+
- **RAM:** Minimum 4GB, recommended 8GB+
- **Disk:** Minimum 10GB space
- **MongoDB:** 6.0+
- **Docker:** 20.10+ (if using containerization)

### Backups

#### Backup Locations

[Fill with your backup information:]
- **Local storage:** [path to local backups]
- **Cloud storage:** [link to cloud storage]
- **Last backup date:** [date]

#### Backup Contents

- [ ] Full git repository (with history)
- [ ] MongoDB data (all databases)
- [ ] SQLite databases
- [ ] Configuration files (.env, .json, .yml)
- [ ] SSL certificates
- [ ] Documentation
- [ ] Issues and Pull Requests
- [ ] Wiki (if exists)
- [ ] Release notes

### Documentation

Main documents describing the system:
- `README.md` - Main documentation
- `ARCHIVING.md` - This document with archiving instructions
- `API-DOCUMENTATION.md` - API documentation
- `DEPLOYMENT.md` - Deployment instructions
- `SECURITY.md` - Security guidelines
- `CHANGELOG.md` - Changelog

### Contact Information

**Maintainer:** robertpezdirc-eng  
**GitHub:** https://github.com/robertpezdirc-eng  
**Email:** [insert email]  
**Website:** [insert website, if exists]

### Alternative Projects

[If there are successors or similar projects, list them here:]
- [Project name]: [URL] - [brief description]

---

## 📊 Project Statistics (at time of archiving)

[Fill before archiving:]
- **Total commits:** [number]
- **Contributors:** [number]
- **Stars:** [number]
- **Forks:** [number]
- **Open issues:** [number]
- **Closed issues:** [number]
- **Pull requests:** [number]
- **Lines of code:** [approximate number]

---

## 🎯 Migration Path (if applicable)

[If users should migrate to another project, provide instructions:]

### For Users
1. [Step 1]
2. [Step 2]
3. [Step 3]

### For Developers
1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note:** This is a template. Fill in the bracketed sections before actually archiving the repository.
