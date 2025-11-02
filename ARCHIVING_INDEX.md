# 📦 Indeks Arhiviranja / Archiving Index

> **Začnite tukaj / Start here**: Ta dokument vam bo pomagal najti pravo dokumentacijo za arhiviranje projekta OMNIBOT12.

---

## 🎯 Izbira Poti / Choose Your Path

### 🚀 Hiter Začetek (Priporočeno) / Quick Start (Recommended)

**Čas / Time**: ~20-30 minut  
**Kompleksnost / Complexity**: Nizka / Low  

→ Preberite: **[QUICK_ARCHIVING_GUIDE.md](QUICK_ARCHIVING_GUIDE.md)**

Idealno za uporabnike, ki želijo hitro in učinkovito arhivirati projekt.  
Ideal for users who want to quickly and efficiently archive the project.

---

### 📚 Podrobna Pot (Za Ekspertni Nadzor) / Detailed Path (For Expert Control)

**Čas / Time**: ~40-60 minut  
**Kompleksnost / Complexity**: Srednja / Medium  

1. → Preberite: **[ARCHIVING.md](ARCHIVING.md)** (glavni vodič / main guide)
2. → Sledite: **[ARCHIVING_FLOW.md](ARCHIVING_FLOW.md)** (vizualni diagram / visual diagram)

Idealno za uporabnike, ki želijo popoln nadzor nad procesom arhiviranja.  
Ideal for users who want full control over the archiving process.

---

### 🎨 Vizualni Učenec / Visual Learner

**Čas / Time**: ~10 minut za pregled / minutes to review  

→ Preberite: **[ARCHIVING_FLOW.md](ARCHIVING_FLOW.md)**

Vizualni diagram celotnega procesa arhiviranja s fazami in časi.  
Visual diagram of the entire archiving process with phases and times.

---

## 📋 Seznam Vseh Dokumentov / List of All Documents

| Dokument / Document | Velikost / Size | Namembnost / Purpose |
|-------------------|----------------|---------------------|
| **[QUICK_ARCHIVING_GUIDE.md](QUICK_ARCHIVING_GUIDE.md)** | 3.8 KB | Hiter 5-koračni vodič / Quick 5-step guide |
| **[ARCHIVING.md](ARCHIVING.md)** | 12 KB | Glavni podrobni vodič / Main detailed guide |
| **[ARCHIVING_FLOW.md](ARCHIVING_FLOW.md)** | 11 KB | Vizualni diagram procesa / Visual process diagram |
| **[ARCHIVE_STATUS.md](ARCHIVE_STATUS.md)** | 7.3 KB | Predloga za končno stanje / Final state template |
| **[ARCHIVING_SUMMARY.md](ARCHIVING_SUMMARY.md)** | 8.7 KB | Povzetek dodane dokumentacije / Summary of added docs |
| **[create-backup.sh](create-backup.sh)** | 11 KB | Linux/Mac backup skripta / Linux/Mac backup script |
| **[create-backup.bat](create-backup.bat)** | 11 KB | Windows backup skripta / Windows backup script |

---

## 🔧 Orodja in Skripte / Tools and Scripts

### Avtomatizirane Varnostne Kopije / Automated Backups

#### Linux / Mac
```bash
chmod +x create-backup.sh
./create-backup.sh
```

#### Windows
```cmd
create-backup.bat
```

#### Kaj Skripte Naredijo / What Scripts Do
- ✅ Varnostno kopirajo Git repozitorij / Backup Git repository
- ✅ Izvozijo MongoDB baze / Export MongoDB databases
- ✅ Kopirajo SQLite baze / Copy SQLite databases
- ✅ Varnostno kopirajo konfiguracije / Backup configurations
- ✅ Izvozijo GitHub podatke / Export GitHub data
- ✅ Ustvarijo kompresiran arhiv / Create compressed archive

---

## 📖 Pregled Procesa / Process Overview

```
1. PRIPRAVA       →  2. BACKUP         →  3. SHRANJEVANJE
   Preparation       Backup                 Storage
   ↓                 ↓                      ↓
   Preberite docs    Zaženite skripto      3 lokacije
   Read docs         Run script            3 locations
   
   ↓
   
4. DOKUMENTACIJA  →  5. ARHIVIRANJE
   Documentation      Archiving
   ↓                  ↓
   Posodobite         GitHub Settings
   ARCHIVE_STATUS     → Archive repo
   Update status
```

**Skupaj čas / Total time**: 20-40 minut / minutes

---

## ❓ FAQ / Pogosta Vprašanja

### Slovenščina

**V: Katero dokumentacijo naj preberem najprej?**  
O: Priporočamo [QUICK_ARCHIVING_GUIDE.md](QUICK_ARCHIVING_GUIDE.md) za hiter začetek.

**V: Ali potrebujem varnostno kopijo, če arhiviram na GitHubu?**  
O: DA! Vedno imejte lokalne varnostne kopije. GitHub je odličen, a lokalne kopije so pomembne.

**V: Koliko časa traja arhiviranje?**  
O: Celoten proces traja približno 20-40 minut, odvisno od velikosti projekta.

**V: Ali lahko odarhiviram projekt kasneje?**  
O: DA! Arhiviranje je reverzibilno. Lastnik lahko kadarkoli odarhivira repozitorij.

**V: Kam naj shranim varnostne kopije?**  
O: Sledite pravilu 3-2-1: 3 kopije, 2 različna medija, 1 off-site (oblačna shramba).

### English

**Q: Which documentation should I read first?**  
A: We recommend [QUICK_ARCHIVING_GUIDE.md](QUICK_ARCHIVING_GUIDE.md) for a quick start.

**Q: Do I need a backup if I archive on GitHub?**  
A: YES! Always have local backups. GitHub is great, but local copies are important.

**Q: How long does archiving take?**  
A: The entire process takes approximately 20-40 minutes, depending on project size.

**Q: Can I unarchive the project later?**  
A: YES! Archiving is reversible. The owner can unarchive the repository anytime.

**Q: Where should I store backups?**  
A: Follow the 3-2-1 rule: 3 copies, 2 different media, 1 off-site (cloud storage).

---

## 🎓 Priporočila po Profilu / Recommendations by Profile

### 👤 Začetnik / Beginner
→ Start: [QUICK_ARCHIVING_GUIDE.md](QUICK_ARCHIVING_GUIDE.md)  
→ Orodje / Tool: `create-backup.sh` ali / or `create-backup.bat`

### 👨‍💻 Napredni Uporabnik / Advanced User
→ Start: [ARCHIVING.md](ARCHIVING.md)  
→ Reference: [ARCHIVING_FLOW.md](ARCHIVING_FLOW.md)

### 🏢 Organizacija / Organization
→ Start: [ARCHIVING.md](ARCHIVING.md)  
→ Template: [ARCHIVE_STATUS.md](ARCHIVE_STATUS.md)  
→ Dodatno / Additional: Ustvarite notranjo politiko / Create internal policy

---

## 📞 Podpora / Support

### Če potrebujete dodatno pomoč / If you need additional help:

1. **Dokumentacija**
   - Preberite vse dokumente v tem indeksu / Read all documents in this index
   - Preverite FAQ razdelek / Check the FAQ section

2. **GitHub**
   - GitHub Issues (pred arhiviranjem / before archiving)
   - GitHub Discussions

3. **Stik / Contact**
   - Email: [vaš email / your email]
   - Projekt vzdrževalec / Project maintainer: robertpezdirc-eng

4. **Zunanje Referenence / External References**
   - [GitHub Archiving Documentation](https://docs.github.com/en/repositories/archiving-a-github-repository)
   - [Git Bundle Manual](https://git-scm.com/docs/git-bundle)
   - [MongoDB Backup Guide](https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/)

---

## ✅ Kontrolni Seznam / Checklist

Pred začetkom arhiviranja se prepričajte / Before starting archiving, make sure:

- [ ] Prebrali ste izbrano dokumentacijo / You've read the chosen documentation
- [ ] Razumete korake procesa / You understand the process steps
- [ ] Imate dostop do GitHub Settings / You have access to GitHub Settings
- [ ] Imate dovolj prostora za varnostno kopijo / You have enough space for backup
- [ ] Poznate lokacije za shranjevanje kopij / You know storage locations for backups

---

## 🎯 Naslednji Koraki / Next Steps

1. **Izberite pot** / Choose path: Hitra ali Podrobna / Quick or Detailed
2. **Preberite dokumentacijo** / Read documentation
3. **Zaženite backup skripto** / Run backup script
4. **Sledite navodilom** / Follow instructions
5. **Arhivirajte repozitorij** / Archive repository

---

**Uspešno arhiviranje!** / **Happy archiving!** 🎉

---

*Zadnja posodobitev / Last updated*: November 2, 2025  
*Verzija / Version*: 1.0  
*Projekt / Project*: OMNIBOT12 v2.0.0
