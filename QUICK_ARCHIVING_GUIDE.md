# 📦 Hitri Vodič za Arhiviranje / Quick Archiving Guide

## 🇸🇮 Slovenščina

### Hitra Pot (5 Korakov)

#### 1️⃣ Ustvarite Varnostno Kopijo
```bash
# Linux/Mac:
./create-backup.sh

# Windows:
create-backup.bat
```

#### 2️⃣ Posodobite Dokumentacijo
Uredite `ARCHIVE_STATUS.md` in izpolnite:
- Datum arhiviranja
- Razlog za arhiviranje
- Znane omejitve
- Kontaktne informacije

#### 3️⃣ Arhivirajte na GitHubu
1. Pojdite na: https://github.com/robertpezdirc-eng/OMNIBOT12/settings
2. Pomaknite se do razdelka "Danger Zone"
3. Kliknite "Archive this repository"
4. Potrdite z vnosom imena repozitorija

#### 4️⃣ Shranite Varnostno Kopijo
Kopirajte ustvarjeno arhivsko datoteko na:
- Lokalni disk (zunanji trdi disk)
- Oblačno shrambo (Google Drive, Dropbox, itd.)
- Še eno lokacijo (3-2-1 pravilo)

#### 5️⃣ Končno Preverjanje
- [ ] Varnostna kopija ustvarjena ✓
- [ ] ARCHIVE_STATUS.md posodobljen ✓
- [ ] Repozitorij arhiviran na GitHubu ✓
- [ ] Varnostna kopija shranjena na 3 lokacijah ✓

---

## 🇬🇧 English

### Quick Path (5 Steps)

#### 1️⃣ Create Backup
```bash
# Linux/Mac:
./create-backup.sh

# Windows:
create-backup.bat
```

#### 2️⃣ Update Documentation
Edit `ARCHIVE_STATUS.md` and fill in:
- Archive date
- Reason for archiving
- Known limitations
- Contact information

#### 3️⃣ Archive on GitHub
1. Go to: https://github.com/robertpezdirc-eng/OMNIBOT12/settings
2. Scroll to "Danger Zone" section
3. Click "Archive this repository"
4. Confirm by entering repository name

#### 4️⃣ Store Backup
Copy the created archive file to:
- Local disk (external hard drive)
- Cloud storage (Google Drive, Dropbox, etc.)
- Another location (3-2-1 rule)

#### 5️⃣ Final Checklist
- [ ] Backup created ✓
- [ ] ARCHIVE_STATUS.md updated ✓
- [ ] Repository archived on GitHub ✓
- [ ] Backup stored in 3 locations ✓

---

## 📚 Dodatna Dokumentacija / Additional Documentation

Za podrobne informacije glej / For detailed information see:
- **Glavni Vodič / Main Guide**: [ARCHIVING.md](ARCHIVING.md)
- **Status Arhiva / Archive Status**: [ARCHIVE_STATUS.md](ARCHIVE_STATUS.md)

---

## ⚡ Hitre Povezave / Quick Links

- [GitHub Repository Settings](https://github.com/robertpezdirc-eng/OMNIBOT12/settings)
- [MongoDB Backup Guide](https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/)
- [Git Bundle Documentation](https://git-scm.com/docs/git-bundle)
- [GitHub CLI (gh)](https://cli.github.com/)

---

## ❓ Pogosta Vprašanja / FAQ

### Lahko projekt odarhiviram? / Can I unarchive the project?
**DA / YES** - Lastnik repozitorija lahko kadar koli odarhivira projekt v Settings > Danger Zone > Unarchive repository.

### Ali izgubim podatke ob arhiviranju? / Will I lose data when archiving?
**NE / NO** - Vsi podatki, zgodovina in koda ostanejo dostopni. Repozitorij postane samo read-only.

### Ali rabim varnostno kopijo, če arhiviram na GitHubu? / Do I need backup if archiving on GitHub?
**DA / YES** - Vedno imejte lokalno varnostno kopijo. GitHub je odličen, a zunanje varnostne kopije so pomembne.

### Kako dolgo GitHub hrani arhivirane projekte? / How long does GitHub store archived projects?
GitHub hrani arhivirane projekte **neomejeno**, dokler račun ostane aktiven in ne krši pogojev uporabe.

---

## 🆘 Pomoč / Help

Če potrebujete pomoč pri arhiviranju / If you need help with archiving:

1. Preberite [ARCHIVING.md](ARCHIVING.md) za podrobna navodila
2. Preverite [GitHub dokumentacijo](https://docs.github.com/en/repositories/archiving-a-github-repository)
3. Kontaktirajte vzdrževalca projekta / Contact project maintainer

---

**Čas do arhiviranja / Time to archive**: ~15-30 minut / minutes  
**Težavnost / Difficulty**: Nizka / Low  
**Potrebna orodja / Required tools**: Git, Bash/Command Prompt, (optional: GitHub CLI)
