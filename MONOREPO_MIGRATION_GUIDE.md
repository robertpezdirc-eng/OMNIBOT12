# 🚀 Monorepo Migration System - User Guide

## 📖 Pregled / Overview

**Slovensko**: Sistem za avtomatsko migracijo vseh GitHub repozitorijev iz računa `robertpezdirc-eng` v en centraliziran monorepo repozitorij `platforma`.

**English**: Automated system for migrating all GitHub repositories from `robertpezdirc-eng` account into a single centralized monorepo `platforma`.

---

## 🎯 Cilj / Goal

Združiti vse relevantne repozitorije v en monorepo z:
- ✅ Ohranjena celotna Git zgodovina
- ✅ Ohranjena vsa commit sporočila, avtorji in datumi
- ✅ Prefiksani tag-i za preprečitev konfliktov
- ✅ Inteligentno arhiviranje neprimernih repojev
- ✅ Varnostno skeniranje za skrivnosti
- ✅ Detekcija LFS in velikih datotek
- ✅ Avtomatski CI/CD za testiranje samo spremenjenih projektov

---

## 📂 Struktura Datotek / File Structure

```
OMNIBOT12/
├── migrate_to_monorepo.sh          # 🔧 Glavna migracijska skripta
├── monorepo-config.json             # ⚙️ Konfiguracijske nastavitve
│
├── PLATFORMA_README.md              # 📄 README za platforma repo
├── PLATFORMA_LICENSE                # 📜 MIT licenca
├── PLATFORMA_GITIGNORE              # 🚫 .gitignore pravila
├── PLATFORMA_CI_WORKFLOW.yml        # 🔄 GitHub Actions CI/CD
│
└── docs/
    ├── MONOREPO_SETUP.md            # 🏁 Setup Guide - ZAČNI TU!
    ├── QUICK_START.md               # ⚡ Hitra navodila
    ├── MERGE_GUIDE.md               # 📚 Podrobna navodila
    └── MIGRATION_REPORT_TEMPLATE.md # 📊 Predloga poročila
```

---

## 🚀 Hitra Navodila / Quick Start

### Korak 1: Predpogoji

```bash
# Preveri da imaš vse potrebno
git --version          # >= 2.0
python3 --version      # >= 3.7
pip3 --version

# Namesti git-filter-repo
pip3 install git-filter-repo

# Opcijsko: GitHub CLI
gh --version
```

### Korak 2: GitHub Personal Access Token

1. Pojdi na: https://github.com/settings/tokens
2. Ustvari nov token (classic)
3. Izberi scope: **`repo`** (polni dostop do repozitorijev)
4. Kopiraj token

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### Korak 3: Konfiguriraj in Zaženi

```bash
# Nastavi spremenljivke
export GITHUB_USER="robertpezdirc-eng"
export TARGET_REPO="platforma"
export AUTO_FETCH_WITH_GH="true"

# Zaženi migracijo (PR-only mode za pregled)
cd /home/runner/work/OMNIBOT12/OMNIBOT12
./migrate_to_monorepo.sh
```

### Korak 4: Preglej Rezultate

```bash
# Najdi delovno mapo
WORK_DIR=$(ls -td /tmp/monorepo-migration-* | head -1)
echo "Work directory: $WORK_DIR"

# Preberi poročilo
cat "$WORK_DIR/MIGRATION_REPORT.md"

# Inspiciraj monorepo
cd "$WORK_DIR/monorepo"
git log --oneline --graph | head -30
tree -L 2 projects/
```

### Korak 5: Pushaj v GitHub

```bash
# Ustvari platforma repo (če še ne obstaja)
gh repo create robertpezdirc-eng/platforma --private

# V monorepo direktoriju
cd "$WORK_DIR/monorepo"

# Kopiraj scaffold datoteke
cp /home/runner/work/OMNIBOT12/OMNIBOT12/PLATFORMA_README.md README.md
cp /home/runner/work/OMNIBOT12/OMNIBOT12/PLATFORMA_LICENSE LICENSE
cp /home/runner/work/OMNIBOT12/OMNIBOT12/PLATFORMA_GITIGNORE .gitignore
mkdir -p .github/workflows
cp /home/runner/work/OMNIBOT12/OMNIBOT12/PLATFORMA_CI_WORKFLOW.yml .github/workflows/ci.yml

# Commitaj scaffold
git add .
git commit -m "chore: add monorepo scaffold and documentation"

# Pushaj
git remote add origin https://github.com/robertpezdirc-eng/platforma.git
git push -u origin main --tags
```

---

## 📚 Podrobna Dokumentacija / Detailed Documentation

### 🏁 [Setup Guide](docs/MONOREPO_SETUP.md)
**PRIPOROČENO ZA PRVI PREGLED** - Popoln pregled sistema z vsemi funkcionalnostmi

### ⚡ [Quick Start](docs/QUICK_START.md)
Hitra navodila za začetek brez tehničnih podrobnosti

### 📖 [Merge Guide](docs/MERGE_GUIDE.md)
Podrobna navodila za:
- Ročno združevanje repozitorijev
- Reševanje konfliktov
- Napredne operacije (squash, rebase, filtering)
- Troubleshooting

### 📊 [Migration Report Template](docs/MIGRATION_REPORT_TEMPLATE.md)
Predloga za poročilo o migraciji z vsemi metrikami

---

## 🎨 Funkcionalnosti / Features

### ✅ Avtomatska Migracija

- **Mirror Cloning**: Ohrani celotno zgodovino vključno z vsemi vejami
- **Git Filter-Repo**: Premakne vsebino v poddirektorij brez izgube zgodovine
- **Tag Prefixing**: Vse oznake so prefiksane z `projekt/` za preprečitev konfliktov
- **Unrelated Histories**: Združuje projekte brez skupne zgodovine

### 🗂️ Inteligentno Arhiviranje

Avtomatsko zazna repozitorije, ki niso primerni za glavno platformo:

**Kriteriji za Arhiviranje:**
- Ključne besede: `test`, `demo`, `experiment`, `old`, `deprecated`
- Vzorci imen: `test-*`, `demo-*`, `*-old`, `backup-*`
- Velikost: < 100 KB
- Število commitov: < 5

**Akcija:** Premakne v `archive/` namesto `projects/`

### 🔍 Varnostno Skeniranje

Avtomatsko skendra za:
- Environment datoteke (`.env`, `.env.local`)
- Certifikati in ključi (`.pem`, `.key`, `.p12`, `.pfx`)
- SSH ključi (`id_rsa`, `id_dsa`)
- Datoteke s skrivnostmi (`*secret*`, `*password*`, `*credentials*`)

**Akcija:** Generira poročilo in opozori uporabnika

### 📦 LFS in Velike Datoteke

Zazna:
- Git LFS uporabo (preveri `.gitattributes`)
- Datoteke > 10 MB v zgodovini
- Top 10 največjih datotek v vsakem repozitoriju

**Akcija:** Generira poročilo z priporočili za optimizacijo

### 🔄 CI/CD Konfiguracija

Inteligenten GitHub Actions workflow:
- **Detekcija sprememb**: Testira samo spremenjene projekte
- **Multi-language**: Podpora za Node.js, Python, Go, Rust, Java, C#
- **Paralelno izvajanje**: Hitrejši buildi in testi
- **Varnostno skeniranje**: Trivy vulnerability scanner
- **Commit linting**: Preverjanje conventional commit formata

### 📊 Poročanje

Generira podrobno poročilo:
- Seznam vseh obdelanih repozitorijev
- Destinacija vsakega repoja (projects/ ali archive/)
- LFS in velike datoteke po repozitoriju
- Varnostne najdbe
- Licence konflikti
- Statistika (commiti, avtorji, velikost)
- Navodila za naslednje korake

---

## ⚙️ Konfiguracija / Configuration

### Okolijske Spremenljivke

```bash
# Obvezno
export GITHUB_USER="robertpezdirc-eng"      # GitHub uporabnik
export TARGET_REPO="platforma"              # Ime ciljnega repoja

# Priporočeno
export GITHUB_TOKEN="ghp_..."               # PAT za zasebne repoje
export AUTO_FETCH_WITH_GH="true"            # Uporabi GitHub CLI

# Opcijsko
export WORK_DIR="/tmp/migration"            # Delovna mapa
export ARCHIVE_AFTER_IMPORT="false"         # Arhiviraj originale (NE!)
```

### Konfiguracijska Datoteka

Uredi `monorepo-config.json` za prilagoditev:

```json
{
  "migration": {
    "exclude_repos": [".github", "platforma"],
    "archive_criteria": {
      "keywords": ["test", "demo", "old"],
      "min_size_kb": 100
    }
  }
}
```

---

## 🎭 Načini Delovanja / Operation Modes

### A) PR-Only Mode (Priporočeno)

Pripravi vse datoteke ampak **NE** pushne v GitHub.

**Uporabi za:**
- Prvi pregled migracije
- Testiranje brez tveganja
- Inspiciranje rezultatov pred pushom

**Kako:**
```bash
./migrate_to_monorepo.sh
# Sledi navodilom in preglej rezultate
# Ročno pushaj ko si zadovoljen
```

### B) Full Run Mode

Izvede celotno migracijo vključno s pushom v GitHub.

**Uporabi za:**
- Ko si prepričan da je vse OK
- Po uspešnem PR-only testu
- Avtomatiziran workflow

**Kako:**
```bash
export FULL_RUN="true"
./migrate_to_monorepo.sh
# Skripta bo avtomatsko pushala
```

---

## 📈 Pričakovani Rezultati / Expected Results

### Struktura Platforma Repozitorija

```
platforma/
├── .github/workflows/ci.yml     # CI/CD konfiguracija
├── projects/                     # Glavni projekti
│   ├── OMNIBOT12/
│   ├── project-a/
│   ├── project-b/
│   └── ...
├── archive/                      # Arhivirani projekti
│   ├── old-demo/
│   └── test-repo/
├── libs/                         # Skupne knjižnice
├── infra/                        # Infrastruktura
├── tools/                        # Razvojna orodja
├── docs/                         # Dokumentacija
│   ├── MERGE_GUIDE.md
│   └── MIGRATION_REPORT.md
├── README.md                     # Glavni README
├── LICENSE                       # MIT licenca
├── .gitignore                    # Gitignore pravila
└── monorepo-config.json          # Konfiguracija
```

### Tags / Oznake

Vse oznake so prefiksane:

```
Originalno:           v1.0.0, v1.1.0, release-2.0
Po migraciji:         OMNIBOT12/v1.0.0, OMNIBOT12/v1.1.0, OMNIBOT12/release-2.0
                      project-a/v1.0.0, project-b/v2.1.0, ...
```

### Git Zgodovina

Celotna zgodovina ohranjena:

```bash
# Poglej zgodovino projekta
git log --oneline -- projects/OMNIBOT12/

# Najdi originalne commite
git log --author="Robert" -- projects/OMNIBOT12/

# Graf zgodovine
git log --oneline --graph --all
```

---

## 🔒 Varnost / Security

### Najboljše Prakse

1. **GitHub Token**
   - ✅ Uporabi samo `repo` scope
   - ✅ Nikoli ne commitaj tokena
   - ✅ Reguliraj token po uporabi
   - ❌ NE deli tokena z drugimi

2. **Skrivnosti**
   - ✅ Preveri poročilo o skrivnostih
   - ✅ Rotraj razkrite skrivnosti
   - ✅ Uporabi `.gitignore` za `.env` datoteke
   - ❌ NE commitaj občutljivih podatkov

3. **Originalni Repozitoriji**
   - ✅ Ohrani backupe
   - ✅ Počakaj s arhiviranjem
   - ✅ Preveri da je migracija uspešna
   - ❌ NE briši brez potrditve

### Če Najdeš Skrivnosti

```bash
# 1. Odstrani iz zgodovine
git filter-repo --path path/to/secret --invert-paths

# 2. Force push (POZOR!)
git push --force

# 3. Rotraj skrivnosti
# - Spremeni API ključe
# - Spremeni passwords
# - Regeneriraj certifikate
```

---

## 🐛 Troubleshooting

### Problem: "git-filter-repo not found"

```bash
pip3 install git-filter-repo
```

### Problem: "gh: command not found"

```bash
# macOS
brew install gh

# Ubuntu
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo apt install gh

# Ali onemogoči
export AUTO_FETCH_WITH_GH="false"
```

### Problem: "Permission denied"

```bash
# Preveri token
echo $GITHUB_TOKEN

# Preveri scope
gh auth status

# Ustvari nov token če potrebno
```

### Problem: Migracija traja predolgo

```bash
# Za testiranje uporabi samo nekaj repojev
# Uredi monorepo-config.json in dodaj v exclude_repos
```

---

## 💬 Podpora / Support

### Vprašanja

- 📧 Email: [kontakt]
- 🐛 GitHub Issues: https://github.com/robertpezdirc-eng/OMNIBOT12/issues
- 📖 Dokumentacija: `/docs/`

### Dodatni Viri

- [Git Filter-Repo Docs](https://github.com/newren/git-filter-repo)
- [Monorepo Tools](https://monorepo.tools/)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📝 Changelog

### Version 1.0.0 (2025-10-31)

**Začetna Implementacija:**
- ✅ Avtomatska migracija z git-filter-repo
- ✅ Inteligentno arhiviranje
- ✅ LFS in velike datoteke detekcija
- ✅ Varnostno skeniranje
- ✅ CI/CD konfiguracija
- ✅ Obsežna dokumentacija
- ✅ PR-only in Full-run modi

---

## 🎉 Zaključek / Conclusion

**Slovensko**: Sistem je pripravljen za uporabo! Sledi navodilom v [Setup Guide](docs/MONOREPO_SETUP.md) ali [Quick Start](docs/QUICK_START.md).

**English**: The system is ready to use! Follow the instructions in [Setup Guide](docs/MONOREPO_SETUP.md) or [Quick Start](docs/QUICK_START.md).

---

**Verzija / Version**: 1.0.0  
**Datum / Date**: 2025-10-31  
**Avtor / Author**: Robert Pezdirc  
**Repository**: https://github.com/robertpezdirc-eng/OMNIBOT12

**Hvala za uporabo! / Thank you for using!** 🚀
