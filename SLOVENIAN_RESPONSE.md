# 🏗️ Platforma - Monorepo Migracijski Sistem

## 📋 Povzetek Odgovora na Zahtevo

**Sporočilo pripravljeno - sistem popolnoma implementiran! ✅**

Spodaj je celotna implementacija sistema za uvoz vseh GitHub repozitorijev iz računa `robertpezdirc-eng` v en monorepo `platforma`.

---

## ✅ Kaj je Bilo Narejeno

### 1. Migracijska Skripta (`migrate_to_monorepo.sh`)

**Funkcionalnosti:**
- ✅ Avtomatsko pridobivanje seznama repozitorijev z GitHub CLI
- ✅ Mirror kloniranje za ohranitev celotne zgodovine
- ✅ Uporaba `git-filter-repo` z `--to-subdirectory-filter`
- ✅ Prefiksiranje tagov z `<repo-name>/` (npr. `OMNIBOT12/v1.2.3`)
- ✅ Ohranitev commitov, avtorjev in datumov
- ✅ Merge z `--allow-unrelated-histories`

### 2. Selektivno Tretiranje Repojev

**Inteligentno Arhiviranje:**
- ✅ Avtomatska detekcija neprimernih repojev
- ✅ Kriteriji: ključne besede (test, demo, experiment), velikost (< 100 KB)
- ✅ Premik v `archive/<repo-name>/` namesto `projects/<repo-name>/`
- ✅ Beleženje razloga za arhiviranje v poročilu

### 3. LFS in Velike Datoteke

**Detekcija:**
- ✅ Preverjanje Git LFS uporabe (`.gitattributes`)
- ✅ Iskanje velikih blob-ov (> 10 MB) v zgodovini
- ✅ Poročilo o LFS repozitorijih in velikih datotekah
- ✅ Priporočila za optimizacijo (ohrani LFS, preseli binarne datoteke)

### 4. CI/Konfiguracija in Scaffold

**Dodane Datoteke:**
- ✅ `PLATFORMA_README.md` - Povzetek platforme + navodila
- ✅ `PLATFORMA_LICENSE` - MIT licenca z opozorilom o posameznih licencah
- ✅ `PLATFORMA_GITIGNORE` - Obsežna .gitignore pravila
- ✅ `PLATFORMA_CI_WORKFLOW.yml` - Per-project CI ki testira samo spremenjene projekte
- ✅ `docs/MERGE_GUIDE.md` - Navodila za rerun migracije in ročno pregledovanje
- ✅ `migrate_to_monorepo.sh` - Skripta z `AUTO_FETCH_WITH_GH` in `ARCHIVE_AFTER_IMPORT=false`

### 5. Varnostni Ukrepi

**Implementirano:**
- ✅ NIKOLI ne briše originalnih repozitorijev
- ✅ Arhiviranje originalov samo po eksplicitni potrditvi
- ✅ PAT z scope `repo` (NE `delete_repo`)
- ✅ Navodila za varno predajo PAT
- ✅ Skeniranje za skrivnosti (`.env`, `.pem`, `*.key`, itd.)
- ✅ Izključitev občutljivih datotek iz migracije

### 6. Push / PR / Izvedba

**Dva Načina:**

**A) PR-only (Privzeto):**
- Pripravi celoten scaffold in migrate skripto
- Ustvari lokalni monorepo z vsemi datotekami
- BREZ dejanskega uvoza v GitHub
- Omogoči pregled in ročni push
- ✅ **TRENUTNO IMPLEMENTIRANO**

**B) Full run:**
- S PAT in dovoljenjem izvede celoten uvoz
- Mirror + filter-repo za vsak repo
- Push v `robertpezdirc-eng/platforma`
- Pusti vse izvorne repoje nedotaknjene
- Arhiviranje originalov samo po potrditvi
- ✅ **LAHKO SE IZVEDE**

---

## 📦 Struktura Implementiranih Datotek

```
OMNIBOT12/
├── migrate_to_monorepo.sh               # 🔧 Glavna skripta
├── monorepo-config.json                  # ⚙️ Konfiguracija
├── MONOREPO_MIGRATION_GUIDE.md          # 📘 Glavni vodič (TA DATOTEKA)
│
├── PLATFORMA_README.md                   # Za platforma repo
├── PLATFORMA_LICENSE                     # MIT licenca
├── PLATFORMA_GITIGNORE                   # Gitignore pravila
├── PLATFORMA_CI_WORKFLOW.yml             # GitHub Actions CI
│
└── docs/
    ├── MONOREPO_SETUP.md                # 🏁 Celoten setup vodič
    ├── QUICK_START.md                   # ⚡ Hitra navodila
    ├── MERGE_GUIDE.md                   # 📚 Podrobna navodila
    └── MIGRATION_REPORT_TEMPLATE.md     # 📊 Predloga poročila
```

---

## 🚀 Kako Uporabiti - Korak za Korakom

### Predpogoji

```bash
# 1. Namesti odvisnosti
pip3 install git-filter-repo

# 2. Namesti GitHub CLI (opcijsko, ampak priporočeno)
# macOS: brew install gh
# Ubuntu: apt install gh

# 3. Ustvari GitHub Personal Access Token
# https://github.com/settings/tokens
# Scope: repo (POLNI dostop do repozitorijev)
# NE: delete_repo
```

### Izvajanje Migracije

```bash
# 1. Navigiraj v OMNIBOT12 direktorij
cd /home/runner/work/OMNIBOT12/OMNIBOT12

# 2. Nastavi okolje
export GITHUB_USER="robertpezdirc-eng"
export TARGET_REPO="platforma"
export GITHUB_TOKEN="ghp_your_token_here"
export AUTO_FETCH_WITH_GH="true"

# 3. Zaženi migracijo (PR-only način)
./migrate_to_monorepo.sh

# Skripta bo:
# ✓ Preverila git, python, git-filter-repo
# ✓ Pridobila seznam vseh repozitorijev (z gh cli)
# ✓ Analizirala vsak repo (arhiviranje kriteriji, LFS, skrivnosti)
# ✓ Klonirala vsak repo kot mirror
# ✓ Uporabila git-filter-repo za premik v poddirektorij
# ✓ Prefiksala vse tag-e z <repo>/<tag>
# ✓ Združila vse v lokalni monorepo
# ✓ Generirala poročilo

# 4. Preglej rezultate
WORK_DIR=$(ls -td /tmp/monorepo-migration-* | head -1)
cat "$WORK_DIR/MIGRATION_REPORT.md"

# 5. Inspiciraj monorepo
cd "$WORK_DIR/monorepo"
git log --oneline --graph | head -30
tree -L 2 projects/
tree -L 2 archive/

# 6. Če je vse OK, pushaj
git remote add origin https://github.com/robertpezdirc-eng/platforma.git
git push -u origin main --tags
```

---

## 📊 Izhod / Poročilo

Po izvajanju boš dobil:

### 1. Popoln Seznam Obdelanih Repojev

Tabela z:
- ✅ Ime repozitorija
- ✅ Vključeno (yes/no)
- ✅ Pot v monorepu (`projects/<repo>` ali `archive/<repo>`)
- ✅ Ali so tagi prefiksani (yes, `<repo>/`)
- ✅ LFS/velike datoteke (yes/no + opis)
- ✅ Razlog za premik v archive (če je relevantan)
- ✅ Približna velikost (MB/GB)

### 2. Seznam Problemov za Pozornost

- **Licence**: Če imajo projekti različne licence
- **Secrets**: Potencialno občutljive datoteke (`.env`, `.pem`, keys)
- **Velike Datoteke**: Binarne datoteke > 10 MB in priporočila
- **LFS**: Kateri repoji uporabljajo Git LFS

### 3. Navodila za Preverjanje

- Ukazi za lokalno preverjanje monorepo
- Ukazi za push v GitHub
- Navodila za rollback če potrebno

---

## 🗂️ Struktura Platforme Po Migraciji

```
platforma/
├── .github/
│   └── workflows/
│       └── ci.yml                 # CI/CD: testira samo spremenjene projekte
│
├── projects/                       # 📂 Glavni produkcijski projekti
│   ├── OMNIBOT12/                 # Celotna zgodovina ohranjena
│   │   ├── README.md
│   │   ├── package.json
│   │   └── ... (vsa originalna struktura)
│   ├── project-a/
│   ├── project-b/
│   └── ...
│
├── archive/                        # 🗄️ Arhivirani/eksperimentalni projekti
│   ├── old-demo/                  # Arhivirano: "demo keyword"
│   ├── test-repo/                 # Arhivirano: "test in name"
│   └── ...
│
├── libs/                           # 📚 Skupne knjižnice
├── infra/                          # 🏗️ Infrastruktura (terraform, k8s)
├── tools/                          # 🔧 Razvojna orodja
│   └── run-all-tests.sh
├── docs/                           # 📖 Dokumentacija
│   ├── MERGE_GUIDE.md
│   └── MIGRATION_REPORT.md
│
├── migrate_to_monorepo.sh          # Skripta za dodajanje novih repojev
├── monorepo-config.json            # Konfiguracija
├── README.md                       # Glavni README
├── LICENSE                         # MIT licenca
└── .gitignore                      # Gitignore pravila
```

### Oznake (Tags) Po Migraciji

```
Pred:     v1.0.0, v1.1.0, v2.0.0
Po:       OMNIBOT12/v1.0.0, OMNIBOT12/v1.1.0, OMNIBOT12/v2.0.0

Primer:
$ git tag | grep OMNIBOT12
OMNIBOT12/v1.0.0
OMNIBOT12/v1.1.0
OMNIBOT12/v2.0.0

$ git checkout OMNIBOT12/v1.0.0
# Checkout specifične verzije projekta
```

---

## 🔐 Varnost in Compliance

### Skenirane Datoteke

Skripta avtomatsko skendra za:

**Potencialne Skrivnosti:**
- `*.pem`, `*.key`, `*.p12`, `*.pfx` - Certifikati in ključi
- `*id_rsa*`, `*id_dsa*` - SSH ključi
- `.env`, `.env.*` - Environment datoteke
- `*secret*`, `*password*`, `*credentials*` - Občutljive datoteke

**Akcija:** 
- Generira poročilo z lokacijami
- Izključi iz migracije (ne commita)
- Opozori uporabnika

### Licence

- **Strategija**: Vsak projekt ohrani svojo licenco
- **Glavna licenca monorepo**: MIT
- **Konflikt**: Če so različne, generiraj seznam in NOTICE datoteko
- **Ne spreminja** licenc brez potrditve

### Originalni Repozitoriji

**POMEMBNO:**
- ✅ Vsi originalni repozitoriji ostanejo nedotaknjeni
- ✅ NI avtomatskega brisanja ali arhiviranja
- ✅ Arhiviranje originalov samo po eksplicitni potrditvi (`gh repo archive`)
- ✅ Vedno je možen rollback

---

## 💡 Dodatne Zahteve - Implementirano

### 1. Predlog Privzete Razporeditve

**Implementirano v strukturi:**
- `projects/` - Glavni produkcijski projekti
- `libs/` - Skupne knjižnice in paketi
- `infra/` - Infrastruktura (terraform, kubernetes configs)
- `tools/` - Razvojna orodja in skripte
- `docs/` - Dokumentacija in vodiči
- `archive/` - Arhivirani/eksperimentalni projekti

### 2. Scaffold + Migrate Skripta

**Priloženo:**
- ✅ `migrate_to_monorepo.sh` - Glavna skripta
- ✅ `PLATFORMA_README.md` - README
- ✅ `PLATFORMA_LICENSE` - Licenca
- ✅ `PLATFORMA_GITIGNORE` - .gitignore
- ✅ `PLATFORMA_CI_WORKFLOW.yml` - CI/CD
- ✅ Dokumentacija v `docs/`

### 3. Korak-po-Korak Log

**Na voljo v:**
- Console output med izvajanjem skripte
- `MIGRATION_REPORT.md` po zaključku
- Podrobne informacije o vsakem koraku

---

## 📚 Dokumentacija

### Primarna Dokumentacija

1. **[MONOREPO_SETUP.md](docs/MONOREPO_SETUP.md)** - 🏁 Setup guide
   - Celoten pregled sistema
   - Vse funkcionalnosti
   - Podrobna navodila

2. **[QUICK_START.md](docs/QUICK_START.md)** - ⚡ Hitra navodila
   - TL;DR - najhitrejša pot
   - Minimalna navodila
   - Korak za korakom

3. **[MERGE_GUIDE.md](docs/MERGE_GUIDE.md)** - 📖 Podrobna navodila
   - Ročno združevanje
   - Reševanje konfliktov
   - Napredne operacije
   - Troubleshooting

4. **[MIGRATION_REPORT_TEMPLATE.md](docs/MIGRATION_REPORT_TEMPLATE.md)** - 📊 Poročilo
   - Predloga za poročilo
   - Vse metrike
   - Navodila za preverjanje

---

## 🎯 Izbira Opcije Izvajanja

**Trenutno izbrana:** **Opcija A - PR-only** ✅

### Opcija A: PR-Only (Trenutno Aktivno)

**Kaj naredi:**
- ✅ Pripravi celoten scaffold
- ✅ Izvede migracijsko skripto
- ✅ Ustvari lokalni monorepo
- ✅ Generira poročilo
- ❌ **NE** pushne v GitHub

**Naslednji koraki:**
1. Preglej lokalni monorepo
2. Preglejporočilo
3. Če je vse OK, ročno pushaj

**Kako pushati:**
```bash
cd /tmp/monorepo-migration-*/monorepo
git remote add origin https://github.com/robertpezdirc-eng/platforma.git
git push -u origin main --tags
```

### Opcija B: Full Run z PAT

**Kaj naredi:**
- ✅ Vse iz Opcije A
- ✅ Avtomatski push v GitHub
- ✅ Push vseh tagov

**Kako aktivirati:**
```bash
export FULL_RUN="true"
./migrate_to_monorepo.sh
```

---

## ✅ Zaključek - Sistem Pripravljen

**Sistem je POPOLNOMA implementiran in pripravljen za uporabo!**

### Kaj je pripravljeno:

1. ✅ **Migracijska skripta** z vsemi zahtevanimi funkcionalnostmi
2. ✅ **Scaffold datoteke** za platforma repo
3. ✅ **CI/CD konfiguracija** za per-project testiranje
4. ✅ **Varnostno skeniranje** za skrivnosti in velike datoteke
5. ✅ **Inteligentno arhiviranje** neprimernih repojev
6. ✅ **Obsežna dokumentacija** v slovenščini
7. ✅ **Konfiguracijske možnosti** za prilagoditev

### Naslednji koraki:

1. **Ustvari GitHub Personal Access Token**
   - Scope: `repo`
   - https://github.com/settings/tokens

2. **Zaženi migracijo**
   ```bash
   export GITHUB_TOKEN="ghp_..."
   ./migrate_to_monorepo.sh
   ```

3. **Preglej rezultate**
   ```bash
   cat /tmp/monorepo-migration-*/MIGRATION_REPORT.md
   ```

4. **Pushaj v GitHub**
   ```bash
   # Če si zadovoljen
   cd /tmp/monorepo-migration-*/monorepo
   git push -u origin main --tags
   ```

---

## 📞 Podpora

Za vprašanja ali težave:
- 📖 Poglej dokumentacijo v `docs/`
- 🐛 Odpri issue na GitHub
- 📧 Kontakt maintainer-ja

---

**Hvala za uporabo monorepo migration sistema!** 🚀

**Avtor**: Robert Pezdirc  
**Verzija**: 1.0.0  
**Datum**: 2025-10-31  
**Repository**: https://github.com/robertpezdirc-eng/OMNIBOT12
