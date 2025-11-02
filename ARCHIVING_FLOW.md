# 🗺️ Proces Arhiviranja / Archiving Process Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OMNIBOT12 ARCHIVING PROCESS                      │
│                    Proces Arhiviranja OMNIBOT12                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ FAZA 1: PRIPRAVA / PHASE 1: PREPARATION                             │
└──────────────────────────────────────────────────────────────────────┘

    📖 Preberite dokumentacijo / Read documentation
         ├─ QUICK_ARCHIVING_GUIDE.md (hiter začetek / quick start)
         └─ ARCHIVING.md (podrobna navodila / detailed guide)
                │
                ▼
    ✅ Preverite kontrolni seznam / Check checklist
         ├─ [ ] Razrešite odprte PRs / Resolve open PRs
         ├─ [ ] Zaključite issues / Close issues  
         ├─ [ ] Ustvarite končni release / Create final release
         └─ [ ] Odstranite občutljive podatke / Remove sensitive data
                │
                ▼

┌──────────────────────────────────────────────────────────────────────┐
│ FAZA 2: VARNOSTNA KOPIJA / PHASE 2: BACKUP                          │
└──────────────────────────────────────────────────────────────────────┘

    🔧 Zaženite backup skripto / Run backup script
         │
         ├─ Linux/Mac:
         │    ./create-backup.sh
         │
         └─ Windows:
              create-backup.bat
                │
                ▼
    📦 Skripta ustvari / Script creates:
         │
         ├─ omnibot12-backup-YYYYMMDD_HHMMSS/
         │   ├─ omnibot12-repo.bundle (Git repozitorij)
         │   ├─ omnibot12-current-state.tar.gz/.zip
         │   ├─ config/ (konfiguracijske datoteke)
         │   ├─ sqlite/ (SQLite baze)
         │   ├─ mongodb/ (MongoDB izvoz)
         │   ├─ docs/ (dokumentacija)
         │   ├─ dependencies/ (package.json, requirements.txt)
         │   ├─ github/ (issues, PRs, releases)
         │   ├─ system-info.txt
         │   └─ MANIFEST.txt
         │
         └─ omnibot12-backup-YYYYMMDD_HHMMSS.tar.gz/.zip
                │
                ▼

┌──────────────────────────────────────────────────────────────────────┐
│ FAZA 3: SHRANJEVANJE / PHASE 3: STORAGE                             │
└──────────────────────────────────────────────────────────────────────┘

    💾 Shranite varnostno kopijo / Store backup
         │
         ├─ Lokacija 1: Lokalni disk / Local disk
         │   └─ Zunanji trdi disk / External hard drive
         │
         ├─ Lokacija 2: Oblačna shramba / Cloud storage
         │   ├─ Google Drive
         │   ├─ Dropbox
         │   └─ AWS S3 / Azure Blob
         │
         └─ Lokacija 3: Off-site
             └─ Druga fizična lokacija / Another physical location
                │
                ▼
    ✓ Pravilo 3-2-1 izpolnjeno / 3-2-1 rule fulfilled
      (3 kopije, 2 medija, 1 off-site)
                │
                ▼

┌──────────────────────────────────────────────────────────────────────┐
│ FAZA 4: DOKUMENTACIJA / PHASE 4: DOCUMENTATION                      │
└──────────────────────────────────────────────────────────────────────┘

    📝 Posodobite ARCHIVE_STATUS.md / Update ARCHIVE_STATUS.md
         │
         ├─ Vnesite datum arhiviranja / Enter archive date
         ├─ Opišite razlog / Describe reason
         ├─ Navedite znane omejitve / List known limitations
         ├─ Dodajte kontaktne info / Add contact info
         └─ Shranite lokacije backupov / Save backup locations
                │
                ▼
    💬 Git commit in push / Git commit and push
         │
         git add ARCHIVE_STATUS.md
         git commit -m "Final project state before archiving"
         git push
                │
                ▼

┌──────────────────────────────────────────────────────────────────────┐
│ FAZA 5: ARHIVIRANJE / PHASE 5: ARCHIVING                            │
└──────────────────────────────────────────────────────────────────────┘

    🌐 Pojdite na GitHub / Go to GitHub
         │
         └─ https://github.com/robertpezdirc-eng/OMNIBOT12/settings
                │
                ▼
    ⚙️ Pomaknite se do Danger Zone
         │
         └─ Na dnu strani / At bottom of page
                │
                ▼
    🔒 Archive this repository
         │
         ├─ Kliknite gumb / Click button
         ├─ Potrdite z vnosom imena / Confirm with repo name
         └─ robertpezdirc-eng/OMNIBOT12
                │
                ▼
    ✅ Repozitorij arhiviran! / Repository archived!
         │
         └─ Status: READ-ONLY ✓
                │
                ▼

┌──────────────────────────────────────────────────────────────────────┐
│ KONČNO STANJE / FINAL STATE                                         │
└──────────────────────────────────────────────────────────────────────┘

    ✓ Repozitorij arhiviran na GitHub / Repository archived on GitHub
    ✓ Varnostne kopije shranjene / Backups stored (3 locations)
    ✓ Dokumentacija posodobljena / Documentation updated
    ✓ Projekt varno ohranjen / Project safely preserved

┌──────────────────────────────────────────────────────────────────────┐
│ ODHARHIVIRANJE (Če potrebno) / UNARCHIVING (If needed)              │
└──────────────────────────────────────────────────────────────────────┘

    1. Pojdite na GitHub Settings / Go to GitHub Settings
    2. Danger Zone
    3. Unarchive this repository
    4. Potrdite / Confirm

    Repozitorij bo ponovno aktiven / Repository will be active again

┌──────────────────────────────────────────────────────────────────────┐
│ OBNOVA IZ VARNOSTNE KOPIJE / RESTORE FROM BACKUP                    │
└──────────────────────────────────────────────────────────────────────┘

    # Razpakiraj arhiv / Extract archive
    tar -xzf omnibot12-backup-YYYYMMDD_HHMMSS.tar.gz
    # ali / or
    unzip omnibot12-backup-YYYYMMDD_HHMMSS.zip

    # Obnovi Git repozitorij / Restore Git repository
    git clone omnibot12-backup-YYYYMMDD_HHMMSS/omnibot12-repo.bundle omnibot12-restored
    cd omnibot12-restored

    # Obnovi baze / Restore databases
    mongorestore omnibot12-backup-YYYYMMDD_HHMMSS/mongodb/
    cp omnibot12-backup-YYYYMMDD_HHMMSS/sqlite/*.db .

    # Obnovi konfiguracije / Restore configurations
    cp omnibot12-backup-YYYYMMDD_HHMMSS/config/* .

    # Projekt obnovljen! / Project restored!

```

---

## 📊 Časi Izvajanja / Execution Times

| Faza / Phase | Čas / Time | Opis / Description |
|-------------|-----------|-------------------|
| 1. Priprava / Preparation | 10-15 min | Branje in priprava / Reading and prep |
| 2. Varnostna kopija / Backup | 5-10 min | Izvajanje skripte / Script execution |
| 3. Shranjevanje / Storage | 5-10 min | Nalaganje v oblak / Upload to cloud |
| 4. Dokumentacija / Documentation | 5 min | Urejanje statusne datoteke / Edit status file |
| 5. Arhiviranje / Archiving | 2 min | GitHub UI / GitHub UI |
| **SKUPAJ / TOTAL** | **27-42 min** | Celoten proces / Full process |

---

## 🎯 Hitri Začetek / Quick Start

Za najhitrejši način arhiviranja sledite tem korakom:

1. **Zaženite backup**: `./create-backup.sh` (Linux/Mac) ali `create-backup.bat` (Windows)
2. **Kopirajte arhiv** na 3 lokacije (pravilo 3-2-1)
3. **Uredite** `ARCHIVE_STATUS.md` (vnesite datum in razlog)
4. **Pojdite** na GitHub Settings > Danger Zone > Archive repository
5. **Potrdite** z vnosom imena repozitorija

**Končano!** ✅

---

## 📚 Dokumentacija / Documentation

- 📖 **Glavni vodič**: [ARCHIVING.md](ARCHIVING.md)
- 📋 **Status predloga**: [ARCHIVE_STATUS.md](ARCHIVE_STATUS.md)
- ⚡ **Hiter vodič**: [QUICK_ARCHIVING_GUIDE.md](QUICK_ARCHIVING_GUIDE.md)
- 📝 **Povzetek**: [ARCHIVING_SUMMARY.md](ARCHIVING_SUMMARY.md)

---

## ❓ Pomoč / Help

- 💬 GitHub Discussions: https://github.com/robertpezdirc-eng/OMNIBOT12/discussions
- 📧 Email: [vaš email / your email]
- 📖 GitHub Docs: https://docs.github.com/en/repositories/archiving-a-github-repository
