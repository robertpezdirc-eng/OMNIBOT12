# 📦 Monorepo Migration System - Setup Complete

## ✅ Pregled Sistema

Sistem za migracijo repozitorijev v monorepo je pripravljen in vključuje:

### Datoteke in Struktura

```
OMNIBOT12/
├── migrate_to_monorepo.sh          # Glavna migracijska skripta
├── monorepo-config.json             # Konfiguracijske nastavitve
├── PLATFORMA_README.md              # README za platforma repo
├── PLATFORMA_LICENSE                # Licenca za platforma repo
├── PLATFORMA_GITIGNORE              # .gitignore za platforma repo
├── PLATFORMA_CI_WORKFLOW.yml        # CI/CD workflow za platforma repo
└── docs/
    ├── MERGE_GUIDE.md               # Podrobna navodila za združevanje
    ├── MIGRATION_REPORT_TEMPLATE.md # Predloga za poročilo
    └── QUICK_START.md               # Hitra navodila
```

## 🎯 Funkcionalnosti

### ✨ Implementirane Funkcionalnosti

1. **Avtomatska Migracija**
   - ✅ Avtomatsko pridobivanje seznama repozitorijev z GitHub CLI
   - ✅ Mirror kloniranje za ohranitev celotne zgodovine
   - ✅ Git-filter-repo integracija za premik v poddirektorije
   - ✅ Avtomatsko prefiksiranje tagov (projekt/tag)
   - ✅ Združevanje z `--allow-unrelated-histories`

2. **Inteligentno Arhiviranje**
   - ✅ Avtomatska detekcija testnih/demo repozitorijev
   - ✅ Analiza na podlagi ključnih besed
   - ✅ Preverjanje velikosti repozitorija
   - ✅ Premik v `archive/` namesto `projects/`
   - ✅ Beleženje razloga za arhiviranje

3. **LFS in Velike Datoteke**
   - ✅ Detekcija Git LFS uporabe
   - ✅ Iskanje velikih datotek (> 10 MB)
   - ✅ Generiranje poročila o velikih datotekah
   - ✅ Priporočila za optimizacijo

4. **Varnostno Skeniranje**
   - ✅ Iskanje potencialnih skrivnosti (.env, .pem, keys)
   - ✅ Detekcija občutljivih datotek
   - ✅ Generiranje poročila o najdenih skrivnostih
   - ✅ Opozorila pred commitanjem občutljivih podatkov

5. **CI/CD Konfiguracija**
   - ✅ Inteligentna detekcija spremenjenih projektov
   - ✅ Per-project testiranje (samo spremenjeni projekti)
   - ✅ Podpora za Node.js in Python projekte
   - ✅ Paralelno izvajanje testov
   - ✅ Varnostno skeniranje z Trivy
   - ✅ Preverjanje commit sporočil (conventional commits)

6. **Struktura Direktorija**
   - ✅ `projects/` - Glavni produkcijski projekti
   - ✅ `archive/` - Arhivirani/eksperimentalni projekti
   - ✅ `libs/` - Skupne knjižnice
   - ✅ `infra/` - Infrastrukturna konfiguracija
   - ✅ `tools/` - Razvojna orodja
   - ✅ `docs/` - Dokumentacija

7. **Poročanje**
   - ✅ Markdown poročilo o migraciji
   - ✅ Seznam obdelanih repozitorijev
   - ✅ LFS in velike datoteke poročilo
   - ✅ Varnostno poročilo
   - ✅ Statistika in metrike
   - ✅ Navodila za naslednje korake

8. **Dokumentacija**
   - ✅ Podrobna navodila za uporabo (MERGE_GUIDE.md)
   - ✅ Hitra navodila (QUICK_START.md)
   - ✅ README za monorepo
   - ✅ Predloga za poročilo
   - ✅ Primeri uporabe

## 🚀 Kako Uporabiti

### Možnost A: PR-Only Mode (Priporočeno za Prvi Pregled)

Ta način pripravi vse datoteke ampak NE pushna v GitHub. Omogoča pregled pred dejansko migracijo.

```bash
# 1. Nastavi spremenljivke
export GITHUB_USER="robertpezdirc-eng"
export TARGET_REPO="platforma"
export GITHUB_TOKEN="ghp_your_token"  # Za zasebne repoje
export AUTO_FETCH_WITH_GH="true"

# 2. Zaženi migracijo
cd /home/runner/work/OMNIBOT12/OMNIBOT12
./migrate_to_monorepo.sh

# 3. Preglej rezultate
WORK_DIR=$(ls -td /tmp/monorepo-migration-* | head -1)
cat "$WORK_DIR/MIGRATION_REPORT.md"

# 4. Inspiciraj monorepo
cd "$WORK_DIR/monorepo"
git log --oneline --graph --all | head -30
tree -L 2 projects/

# 5. Ko si zadovoljen, ustvari platforma repo na GitHubu in pushaj
git remote add origin https://github.com/robertpezdirc-eng/platforma.git
git push -u origin main --tags
```

### Možnost B: Full Run (Ko si Prepričan)

```bash
# Po uspešnem PR-only pregledu, lahko direktno pushneš
export GITHUB_USER="robertpezdirc-eng"
export TARGET_REPO="platforma"
export GITHUB_TOKEN="ghp_your_token"

./migrate_to_monorepo.sh

# Sledi navodilom na koncu skripte za push
```

## 📋 Predpogoji

### Obvezno

```bash
# Git
git --version  # 2.0+

# Python in pip
python3 --version
pip3 --version

# git-filter-repo
pip3 install git-filter-repo
```

### Priporočeno

```bash
# GitHub CLI (za avtomatsko pridobivanje repojev)
gh --version

# jq (za procesiranje JSON)
jq --version
```

## 🎨 Konfiguracija

Uredi `monorepo-config.json` za prilagoditev:

```json
{
  "migration": {
    "github_user": "robertpezdirc-eng",
    "target_repo": "platforma",
    "mode": "PR-only",
    "exclude_repos": [".github", "platforma"],
    "archive_criteria": {
      "keywords": ["test", "demo", "old"],
      "min_size_kb": 100
    }
  }
}
```

## 📊 Struktura Platforma Repozitorija

Po migraciji bo platforma repo imel naslednjo strukturo:

```
platforma/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD konfiguracija
├── projects/                    # Glavni projekti
│   ├── project-a/
│   │   ├── README.md
│   │   ├── package.json
│   │   └── ...
│   ├── project-b/
│   └── ...
├── archive/                     # Arhivirani projekti
│   ├── old-demo/
│   └── ...
├── libs/                        # Skupne knjižnice
├── infra/                       # Infrastruktura (terraform, k8s)
├── tools/                       # Razvojna orodja
│   └── run-all-tests.sh
├── docs/                        # Dokumentacija
│   ├── MERGE_GUIDE.md
│   └── MIGRATION_REPORT.md
├── migrate_to_monorepo.sh       # Skripta za dodajanje novih repojev
├── monorepo-config.json         # Konfiguracija
├── README.md                    # Glavni README
├── LICENSE                      # Licenca
└── .gitignore                   # Gitignore
```

## 🎯 Naslednji Koraki

### 1. Ustvari Platforma Repozitorij na GitHubu

```bash
# Z GitHub CLI
gh repo create robertpezdirc-eng/platforma --private --description "Unified monorepo for all projects"

# Ali ročno na https://github.com/new
```

### 2. Zaženi Migracijo

```bash
cd /home/runner/work/OMNIBOT12/OMNIBOT12
export GITHUB_USER="robertpezdirc-eng"
export GITHUB_TOKEN="ghp_your_token"
./migrate_to_monorepo.sh
```

### 3. Preglej in Pushaj

```bash
# Navigiraj v generirani monorepo
WORK_DIR=$(ls -td /tmp/monorepo-migration-* | head -1)
cd "$WORK_DIR/monorepo"

# Preglej
git log --oneline | head -20
tree -L 2 projects/

# Kopiraj scaffold datoteke
cp /home/runner/work/OMNIBOT12/OMNIBOT12/PLATFORMA_README.md README.md
cp /home/runner/work/OMNIBOT12/OMNIBOT12/PLATFORMA_LICENSE LICENSE
cp /home/runner/work/OMNIBOT12/OMNIBOT12/PLATFORMA_GITIGNORE .gitignore
mkdir -p .github/workflows
cp /home/runner/work/OMNIBOT12/OMNIBOT12/PLATFORMA_CI_WORKFLOW.yml .github/workflows/ci.yml

# Commitaj scaffold
git add README.md LICENSE .gitignore .github/
git commit -m "chore: add monorepo scaffold and documentation"

# Pushaj
git remote add origin https://github.com/robertpezdirc-eng/platforma.git
git push -u origin main --tags
```

### 4. Konfiguriraj GitHub Repo

Na GitHubu (https://github.com/robertpezdirc-eng/platforma):

1. **Settings → General**
   - Dodaj description
   - Dodaj topics (monorepo, migration, platform)

2. **Settings → Branches**
   - Zaščiti main branch
   - Zahtevaj PR reviews
   - Zahtevaj status checks

3. **Settings → Security**
   - Omogoči Dependabot alerts
   - Omogoči Code scanning (CodeQL)

## 📚 Dokumentacija

### Uporabniška Dokumentacija

- **[Quick Start](docs/QUICK_START.md)** - Hitra navodila za začetek
- **[Merge Guide](docs/MERGE_GUIDE.md)** - Podrobna navodila za združevanje
- **[Migration Report Template](docs/MIGRATION_REPORT_TEMPLATE.md)** - Predloga poročila

### Tehnična Dokumentacija

- **[Config File](monorepo-config.json)** - Konfiguracijske možnosti
- **[Migration Script](migrate_to_monorepo.sh)** - Glavna skripta
- **[CI Workflow](PLATFORMA_CI_WORKFLOW.yml)** - CI/CD konfiguracija

## 🔧 Troubleshooting

### Problem: git-filter-repo ni nameščen

```bash
pip3 install git-filter-repo
```

### Problem: GitHub CLI ni nameščen

```bash
# macOS
brew install gh

# Ubuntu
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo apt install gh
```

### Problem: Premalo prostora

```bash
# Očisti Docker
docker system prune -a

# Očisti Git cache
git gc --aggressive --prune=now

# Uporabi manjši WORK_DIR
export WORK_DIR="/path/with/more/space"
```

## 🎓 Dodatne Možnosti

### Ročna Migracija Posameznega Repoja

Glej [MERGE_GUIDE.md](docs/MERGE_GUIDE.md) za podrobna navodila.

### Dodajanje Novega Repoja v Obstoječ Monorepo

```bash
cd platforma
../OMNIBOT12/migrate_to_monorepo.sh
# Sledi navodilom
```

### Arhiviranje Originalnih Repozitorijev

**OPOZORILO**: To naredi samo po potrditvi da je migracija uspešna!

```bash
# Z GitHub CLI
gh repo archive robertpezdirc-eng/repo-name

# Preverizaščita varnostne kopije
gh repo clone robertpezdirc-eng/repo-name /backup/repo-name
```

## 🛡️ Varnost

### GitHub Token

- ✅ Nikoli ne commitaj tokena v git
- ✅ Uporabi samo `repo` scope
- ✅ Reguliraj token po uporabi
- ✅ Uporabi environment variable ali GitHub CLI

### Skrivnosti v Zgodovini

Skripta avtomatsko skendra za skrivnosti, ampak:

```bash
# Dodatno preverjanje
git grep -i "password\|secret\|api_key" projects/

# Če najdeš skrivnosti, odstrani z git-filter-repo
git filter-repo --path path/to/secret --invert-paths
```

## 📊 Statistika in Metrike

Po migraciji lahko preveriš:

```bash
# Število projektov
ls -1 projects/ | wc -l

# Skupna velikost
du -sh platforma/

# Število commitov
git rev-list --count --all

# Top prispevalo
git shortlog -sn | head -10

# Časovnica
git log --format=%ai --all | cut -d'-' -f1 | sort | uniq -c
```

## 🎉 Zaključek

Sistem je pripravljen za uporabo! Sledi navodilom zgoraj za migracijo.

### Povzetek Korakov

1. ✅ Pripravi predpogoje (git, python, git-filter-repo)
2. ✅ Ustvari GitHub PAT
3. ✅ Zaženi migracijo v PR-only načinu
4. ✅ Preglej rezultate in poročilo
5. ✅ Ustvari platforma repo na GitHubu
6. ✅ Pushaj monorepo
7. ✅ Konfiguriraj CI/CD in varnost
8. ✅ Obavesti ekipo

---

**Verzija**: 1.0.0  
**Datum**: 2025-10-31  
**Avtor**: Robert Pezdirc  
**Repository**: https://github.com/robertpezdirc-eng/OMNIBOT12

Za vprašanja odpri issue ali kontaktiraj maintainer-ja.
