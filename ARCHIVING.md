# 📦 Vodič za Arhiviranje Projekta / Project Archiving Guide

## 🇸🇮 Slovenščina

### 📋 Kazalo
- [Uvod](#uvod)
- [1. Arhiviranje GitHub Repozitorija](#1-arhiviranje-github-repozitorija)
- [2. Varnostna Kopija Podatkov](#2-varnostna-kopija-podatkov)
- [3. Dokumentacija Končnega Stanja](#3-dokumentacija-končnega-stanja)
- [4. Izvoz Pomembnih Podatkov](#4-izvoz-pomembnih-podatkov)
- [5. Najboljše Prakse](#5-najboljše-prakse)

---

### Uvod

Ta dokument opisuje proces arhiviranja projekta OMNIBOT12. Arhiviranje projekta omogoča ohranjanje trenutnega stanja kode in podatkov za prihodnjo referenco, medtem ko označi projekt kot neaktiven na GitHubu.

---

### 1. Arhiviranje GitHub Repozitorija

GitHub omogoča arhiviranje repozitorijev, kar označi projekt kot "samo za branje" in jasno komunicira, da ni več aktivno vzdrževan.

#### Koraki za arhiviranje repozitorija:

1. **Pojdite na nastavitve repozitorija**
   - Odprite https://github.com/robertpezdirc-eng/OMNIBOT12
   - Kliknite na **Settings** (Nastavitve)

2. **Premaknite se na razdelek arhiviranja**
   - Pomaknite se do konca strani
   - Poiščite razdelek **"Danger Zone"** (Nevarno območje)

3. **Arhivirajte repozitorij**
   - Kliknite na **"Archive this repository"** (Arhiviraj ta repozitorij)
   - Vnesite ime repozitorija za potrditev: `robertpezdirc-eng/OMNIBOT12`
   - Kliknite **"I understand the consequences, archive this repository"**

#### Kaj se zgodi po arhiviranju:
- ✅ Repozitorij postane samo za branje
- ✅ Ni več mogoče ustvarjati novih issues ali pull requestov
- ✅ Prikaže se obvestilo, da je repozitorij arhiviran
- ✅ Repozitorij ostane javno dostopen
- ✅ Vsi podatki, zgodovina in koda ostanejo dostopni
- ⚠️ Arhiviranje je reverzibilno - lastnik lahko repozitorij odarhivira

---

### 2. Varnostna Kopija Podatkov

Pred arhiviranjem ustvarite popolno varnostno kopijo vseh podatkov projekta.

#### 2.1 Lokalna Kopija Celotnega Repozitorija

```bash
# Klonirajte repozitorij z vso zgodovino
git clone --mirror https://github.com/robertpezdirc-eng/OMNIBOT12.git omnibot12-archive
cd omnibot12-archive

# Zapakirajte v arhiv
cd ..
tar -czf omnibot12-backup-$(date +%Y%m%d).tar.gz omnibot12-archive/
```

#### 2.2 Izvoz Baz Podatkov

```bash
# MongoDB izvoz (če se uporablja)
mongodump --db omni_analytics --out ./backup/mongodb-$(date +%Y%m%d)
mongodump --db omni_multitenant --out ./backup/mongodb-$(date +%Y%m%d)
mongodump --db devops --out ./backup/mongodb-$(date +%Y%m%d)
mongodump --db finance --out ./backup/mongodb-$(date +%Y%m%d)
mongodump --db tourism --out ./backup/mongodb-$(date +%Y%m%d)

# SQLite izvoz
mkdir -p backup/sqlite-$(date +%Y%m%d)
cp *.db backup/sqlite-$(date +%Y%m%d)/
```

#### 2.3 Varnostna Kopija Konfiguracije

```bash
# Kopirajte pomembne konfiguracijske datoteke
mkdir -p backup/config-$(date +%Y%m%d)
cp .env* backup/config-$(date +%Y%m%d)/
cp *.json backup/config-$(date +%Y%m%d)/
cp *.yml backup/config-$(date +%Y%m%d)/
cp *.yaml backup/config-$(date +%Y%m%d)/

# Opomba: Odstranite občutljive podatke iz .env datotek pred arhiviranjem!
```

---

### 3. Dokumentacija Končnega Stanja

Ustvarite podrobno dokumentacijo končnega stanja projekta.

#### 3.1 Ustvarite ARCHIVE_STATUS.md

```bash
cat > ARCHIVE_STATUS.md << 'EOF'
# Status Arhiviranja Projekta

**Datum arhiviranja:** $(date +%Y-%m-%d)
**Zadnja verzija:** 2.0.0
**Zadnji commit:** $(git rev-parse HEAD)

## Razlog za Arhiviranje
[Tukaj opišite razlog - npr. projekt zaključen, migracija na novo platformo, itd.]

## Končno Stanje Sistema

### Delujoče Komponente
- ✅ Server.js - Glavni strežnik
- ✅ MongoDB integracija
- ✅ WebSocket funkcionalnost
- ✅ Licenčni sistem
- ✅ Admin panel
- ✅ API endpoints

### Znane Omejitve
- [Navedite znane bug-e ali omejitve]

### Odvisnosti
- Node.js: >= 18.0.0
- MongoDB: >= 6.0
- Python: >= 3.8

## Kontaktne Informacije
- Vzdrževalec: robertpezdirc-eng
- Email: [vaš email]

## Alternativni Projekti
- [Povezave do naslednikov ali podobnih projektov]
EOF
```

#### 3.2 Posodobite README.md z Obvestilom o Arhivu

Dodajte na vrh README.md:

```markdown
> ⚠️ **PROJEKT ARHIVIRAN** - Ta projekt je bil arhiviran dne [DATUM] in ni več aktivno vzdrževan.
> Za več informacij glejte [ARCHIVING.md](ARCHIVING.md) in [ARCHIVE_STATUS.md](ARCHIVE_STATUS.md).
```

---

### 4. Izvoz Pomembnih Podatkov

#### 4.1 Issues in Pull Requesti

```bash
# Uporabite GitHub CLI za izvoz
gh issue list --state all --json number,title,body,state --limit 1000 > backup/issues.json
gh pr list --state all --json number,title,body,state --limit 1000 > backup/pull-requests.json
```

#### 4.2 Wiki (če obstaja)

```bash
# Klonirajte GitHub Wiki
git clone https://github.com/robertpezdirc-eng/OMNIBOT12.wiki.git backup/wiki
```

#### 4.3 Release Notes

```bash
# Izvozite vse release notes
gh release list --limit 1000 > backup/releases.txt
```

---

### 5. Najboljše Prakse

#### ✅ Pred Arhiviranjem

- [ ] Razrešite vse odprte pull requeste (merge ali close)
- [ ] Zaključite ali komentirajte vse odprte issues
- [ ] Ustvarite končni release (če je primerno)
- [ ] Posodobite README.md z obvestilom o arhivu
- [ ] Odstranite občutljive podatke (.env datoteke, API ključi)
- [ ] Ustvarite popolno dokumentacijo končnega stanja
- [ ] Izvozite vse pomembne podatke
- [ ] Testirajte varnostne kopije

#### 📦 Kam Shraniti Varnostne Kopije

1. **Lokalna shramba**
   - Zunanje trde diske
   - NAS (Network Attached Storage)

2. **Oblačna shramba**
   - GitHub Releases (za pomembne datoteke)
   - Google Drive / Dropbox
   - AWS S3 / Azure Blob Storage

3. **Več lokacij**
   - Pravilo 3-2-1: 3 kopije, 2 različni mediji, 1 off-site

#### 🔄 Odarhiviranje

Če želite kasneje odarhivirati repozitorij:

1. Pojdite na Settings repozitorija
2. V razdelku "Danger Zone" kliknite "Unarchive this repository"
3. Potrdite akcijo

---

## 🇬🇧 English

### 📋 Table of Contents
- [Introduction](#introduction-1)
- [1. Archiving GitHub Repository](#1-archiving-github-repository)
- [2. Data Backup](#2-data-backup)
- [3. Final State Documentation](#3-final-state-documentation)
- [4. Export Important Data](#4-export-important-data)
- [5. Best Practices](#5-best-practices-1)

---

### Introduction

This document describes the process of archiving the OMNIBOT12 project. Archiving a project allows you to preserve the current state of code and data for future reference while marking the project as inactive on GitHub.

---

### 1. Archiving GitHub Repository

GitHub allows you to archive repositories, which marks the project as "read-only" and clearly communicates that it's no longer actively maintained.

#### Steps to archive the repository:

1. **Go to repository settings**
   - Open https://github.com/robertpezdirc-eng/OMNIBOT12
   - Click on **Settings**

2. **Navigate to the archive section**
   - Scroll to the bottom of the page
   - Find the **"Danger Zone"** section

3. **Archive the repository**
   - Click on **"Archive this repository"**
   - Enter the repository name to confirm: `robertpezdirc-eng/OMNIBOT12`
   - Click **"I understand the consequences, archive this repository"**

#### What happens after archiving:
- ✅ Repository becomes read-only
- ✅ No new issues or pull requests can be created
- ✅ An archived notice is displayed
- ✅ Repository remains publicly accessible
- ✅ All data, history, and code remain accessible
- ⚠️ Archiving is reversible - owner can unarchive

---

### 2. Data Backup

Before archiving, create a complete backup of all project data.

#### 2.1 Local Copy of Full Repository

```bash
# Clone repository with full history
git clone --mirror https://github.com/robertpezdirc-eng/OMNIBOT12.git omnibot12-archive
cd omnibot12-archive

# Package into archive
cd ..
tar -czf omnibot12-backup-$(date +%Y%m%d).tar.gz omnibot12-archive/
```

#### 2.2 Database Export

```bash
# MongoDB export (if used)
mongodump --db omni_analytics --out ./backup/mongodb-$(date +%Y%m%d)
mongodump --db omni_multitenant --out ./backup/mongodb-$(date +%Y%m%d)
mongodump --db devops --out ./backup/mongodb-$(date +%Y%m%d)
mongodump --db finance --out ./backup/mongodb-$(date +%Y%m%d)
mongodump --db tourism --out ./backup/mongodb-$(date +%Y%m%d)

# SQLite export
mkdir -p backup/sqlite-$(date +%Y%m%d)
cp *.db backup/sqlite-$(date +%Y%m%d)/
```

#### 2.3 Configuration Backup

```bash
# Copy important configuration files
mkdir -p backup/config-$(date +%Y%m%d)
cp .env* backup/config-$(date +%Y%m%d)/
cp *.json backup/config-$(date +%Y%m%d)/
cp *.yml backup/config-$(date +%Y%m%d)/
cp *.yaml backup/config-$(date +%Y%m%d)/

# Note: Remove sensitive data from .env files before archiving!
```

---

### 3. Final State Documentation

Create detailed documentation of the project's final state.

#### 3.1 Create ARCHIVE_STATUS.md

```bash
cat > ARCHIVE_STATUS.md << 'EOF'
# Project Archive Status

**Archive Date:** $(date +%Y-%m-%d)
**Last Version:** 2.0.0
**Last Commit:** $(git rev-parse HEAD)

## Reason for Archiving
[Describe reason here - e.g., project completed, migration to new platform, etc.]

## Final System State

### Working Components
- ✅ Server.js - Main server
- ✅ MongoDB integration
- ✅ WebSocket functionality
- ✅ License system
- ✅ Admin panel
- ✅ API endpoints

### Known Limitations
- [List known bugs or limitations]

### Dependencies
- Node.js: >= 18.0.0
- MongoDB: >= 6.0
- Python: >= 3.8

## Contact Information
- Maintainer: robertpezdirc-eng
- Email: [your email]

## Alternative Projects
- [Links to successors or similar projects]
EOF
```

#### 3.2 Update README.md with Archive Notice

Add to top of README.md:

```markdown
> ⚠️ **PROJECT ARCHIVED** - This project was archived on [DATE] and is no longer actively maintained.
> For more information, see [ARCHIVING.md](ARCHIVING.md) and [ARCHIVE_STATUS.md](ARCHIVE_STATUS.md).
```

---

### 4. Export Important Data

#### 4.1 Issues and Pull Requests

```bash
# Use GitHub CLI to export
gh issue list --state all --json number,title,body,state --limit 1000 > backup/issues.json
gh pr list --state all --json number,title,body,state --limit 1000 > backup/pull-requests.json
```

#### 4.2 Wiki (if exists)

```bash
# Clone GitHub Wiki
git clone https://github.com/robertpezdirc-eng/OMNIBOT12.wiki.git backup/wiki
```

#### 4.3 Release Notes

```bash
# Export all release notes
gh release list --limit 1000 > backup/releases.txt
```

---

### 5. Best Practices

#### ✅ Before Archiving

- [ ] Resolve all open pull requests (merge or close)
- [ ] Close or comment on all open issues
- [ ] Create a final release (if appropriate)
- [ ] Update README.md with archive notice
- [ ] Remove sensitive data (.env files, API keys)
- [ ] Create comprehensive final state documentation
- [ ] Export all important data
- [ ] Test backups

#### 📦 Where to Store Backups

1. **Local storage**
   - External hard drives
   - NAS (Network Attached Storage)

2. **Cloud storage**
   - GitHub Releases (for important files)
   - Google Drive / Dropbox
   - AWS S3 / Azure Blob Storage

3. **Multiple locations**
   - 3-2-1 Rule: 3 copies, 2 different media, 1 off-site

#### 🔄 Unarchiving

If you want to unarchive the repository later:

1. Go to repository Settings
2. In the "Danger Zone" section, click "Unarchive this repository"
3. Confirm the action

---

## 📞 Support

For questions about archiving this project, please contact:
- **Repository Owner**: robertpezdirc-eng
- **GitHub Issues**: https://github.com/robertpezdirc-eng/OMNIBOT12/issues (before archiving)

---

## 📄 License

This archiving guide is provided as-is for the OMNIBOT12 project.
