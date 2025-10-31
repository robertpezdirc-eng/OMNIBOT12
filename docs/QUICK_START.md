# 🚀 Quick Start Guide - Monorepo Migration

Hitra navodila za migracijo repozitorijev v monorepo.

## ⚡ TL;DR - Najhitrejša Pot

```bash
# 1. Kloniraj OMNIBOT12 (ali kjer je skripta)
git clone https://github.com/robertpezdirc-eng/OMNIBOT12.git
cd OMNIBOT12

# 2. Nastavi potrebne spremenljivke
export GITHUB_USER="robertpezdirc-eng"
export GITHUB_TOKEN="ghp_your_token_here"

# 3. Zaženi migracijo (PR-only mode za pregled)
chmod +x migrate_to_monorepo.sh
./migrate_to_monorepo.sh

# 4. Preglej rezultate
cat /tmp/monorepo-migration-*/MIGRATION_REPORT.md

# 5. Če je vse OK, pushaj
cd /tmp/monorepo-migration-*/monorepo
git remote add origin https://github.com/robertpezdirc-eng/platforma.git
git push -u origin main --tags
```

## 📋 Predpogoji

### Zahtevano

- ✅ Git (verzija 2.0+)
- ✅ Python 3 in pip
- ✅ git-filter-repo (`pip install git-filter-repo`)
- ✅ GitHub Personal Access Token (za zasebne repoje)

### Opcijsko

- ⭐ GitHub CLI (`gh`) - za avtomatsko pridobivanje seznama repojev
- ⭐ jq - za procesiranje JSON

### Namestitev Odvisnosti

#### macOS

```bash
brew install git git-filter-repo gh jq
```

#### Ubuntu/Debian

```bash
apt update
apt install git python3-pip jq
pip3 install git-filter-repo

# GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
apt update
apt install gh
```

#### Windows (WSL2 ali Git Bash)

```bash
# Uporabi WSL2 Ubuntu in sledi Ubuntu navodilom
# Ali uporabi Git for Windows + Python
pip install git-filter-repo
```

## 🔑 GitHub Personal Access Token (PAT)

### Ustvari PAT

1. Pojdi na: https://github.com/settings/tokens
2. Klikni "Generate new token (classic)"
3. Izberi scope:
   - ✅ `repo` (full control of private repositories)
   - ❌ NE izberi `delete_repo`
4. Kopiraj token (prikaže se samo enkrat!)

### Nastavi PAT

```bash
# Metoda 1: Environment variable (priporočeno)
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"

# Metoda 2: GitHub CLI
gh auth login
# Sledi navodilom

# Metoda 3: V .env datoteki (NE commitat!)
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx" > .env
source .env
```

## 🎯 Korak-za-Korakom

### Korak 1: Pripravi Okolje

```bash
# Ustvari delovno mapo
mkdir -p ~/monorepo-work
cd ~/monorepo-work

# Kloniraj skripto (če še nimaš)
git clone https://github.com/robertpezdirc-eng/OMNIBOT12.git
cd OMNIBOT12

# Preveri skripto
ls -la migrate_to_monorepo.sh
chmod +x migrate_to_monorepo.sh
```

### Korak 2: Konfiguriraj

```bash
# Obvezno
export GITHUB_USER="robertpezdirc-eng"
export TARGET_REPO="platforma"

# Za zasebne repoje
export GITHUB_TOKEN="ghp_your_token_here"

# Opcijsko
export AUTO_FETCH_WITH_GH="true"  # če imaš GitHub CLI
export WORK_DIR="/tmp/monorepo-migration-$$"
```

### Korak 3: Zaženi Migracijo (PR-only)

```bash
# Prvo testna migracija brez pusha
./migrate_to_monorepo.sh

# Skripta bo:
# ✓ Preverila odvisnosti
# ✓ Pridobila seznam repojev
# ✓ Analizirala vsak repo (LFS, skrivnosti, velike datoteke)
# ✓ Združila vse v monorepo
# ✓ Generirala poročilo
# ✗ NE bo pushala v GitHub
```

### Korak 4: Preglej Rezultate

```bash
# Navigiraj v generirani monorepo
cd /tmp/monorepo-migration-*/monorepo

# Preveri strukturo
tree -L 2 projects/

# Preveri zgodovino
git log --oneline --graph --all | head -50

# Preveri oznake
git tag | head -20

# Preberi poročilo
cat ../MIGRATION_REPORT.md
```

### Korak 5: Testiraj Lokalno

```bash
# Testiraj build vsakega projekta
for project in projects/*/; do
  echo "=== Testing $project ==="
  cd "$project"
  
  # Node.js projekt
  if [ -f package.json ]; then
    npm install
    npm test || echo "No tests"
  fi
  
  # Python projekt
  if [ -f requirements.txt ]; then
    pip install -r requirements.txt
    pytest || echo "No tests"
  fi
  
  cd -
done
```

### Korak 6: Push v GitHub

```bash
# Če je vse OK:

# Dodaj remote
git remote add origin https://github.com/robertpezdirc-eng/platforma.git

# Push main branch
git push -u origin main

# Push vse oznake
git push --tags

# Preveri na GitHubu
open https://github.com/robertpezdirc-eng/platforma
```

## 🎨 Prilagoditev Migracije

### Izključi Določene Repoje

Uredi `monorepo-config.json`:

```json
{
  "migration": {
    "exclude_repos": [
      ".github",
      "platforma",
      "test-repo-1",
      "old-demo-2"
    ]
  }
}
```

### Spremeni Kriterije za Arhiviranje

Uredi `monorepo-config.json`:

```json
{
  "migration": {
    "archive_criteria": {
      "keywords": ["test", "demo", "experiment", "old"],
      "min_size_kb": 100
    }
  }
}
```

## 🔍 Troubleshooting

### Problem: "git-filter-repo not found"

```bash
pip install git-filter-repo
# Ali
pip3 install git-filter-repo
```

### Problem: "gh: command not found"

```bash
# Opcija 1: Namesti GitHub CLI
# macOS: brew install gh
# Ubuntu: (glej zgoraj)

# Opcija 2: Onemogoči AUTO_FETCH
export AUTO_FETCH_WITH_GH="false"
# Ročno ustvari seznam repojev
```

### Problem: "Permission denied"

```bash
# Preveri PAT
echo $GITHUB_TOKEN

# Preveri scope na GitHubu
gh auth status
```

### Problem: Migracija traja predolgo

```bash
# Za veliko repozitorijev (> 50):
# 1. Omejil na manjšo množico za testiranje
# 2. Uporabi paralelizacijo (prihodnja verzija)
# 3. Migriraj najprej manjše repoje
```

## 📚 Naslednji Koraki Po Migraciji

### 1. Nastavi CI/CD

```bash
# Kopiraj CI workflow
cp PLATFORMA_CI_WORKFLOW.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "chore: add CI/CD workflow"
git push
```

### 2. Dodaj README

```bash
# Kopiraj README template
cp PLATFORMA_README.md README.md
git add README.md
git commit -m "docs: add monorepo README"
git push
```

### 3. Konfiguriraj Branch Protection

Na GitHubu:
1. Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Omogoči:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date

### 4. Obavesti Ekipo

Pošlji email/slack:

```
🎉 Monorepo Migration Complete!

Vsi naši repozitoriji so sedaj v enem mestu:
https://github.com/robertpezdirc-eng/platforma

Struktura:
- projects/ - glavni projekti
- archive/ - arhivirani projekti
- docs/ - dokumentacija

Dokumentacija:
- README: https://github.com/.../README.md
- Merge Guide: https://github.com/.../docs/MERGE_GUIDE.md

Originalni repozitoriji so ohranjeni in nespremenjeni.
```

## 🎓 Dodatna Gradiva

- 📖 [Podrobna Navodila](docs/MERGE_GUIDE.md)
- 📊 [Primer Poročila](docs/MIGRATION_REPORT_TEMPLATE.md)
- ⚙️ [Konfiguracija](monorepo-config.json)
- 🔧 [Migracijska Skripta](migrate_to_monorepo.sh)

## 💡 Tips & Tricks

### Hitro Iskanje po Repozitorijih

```bash
# Išči po vsebini
git grep "search_term" projects/

# Išči po zgodovini
git log --all -S "search_term"

# Najdi vse README datoteke
find projects/ -name "README*"
```

### Pregled Statistike

```bash
# Število commitov po projektu
for dir in projects/*/; do
  count=$(git log --oneline -- "$dir" | wc -l)
  echo "$dir: $count commits"
done

# Velikost po projektu
du -sh projects/* | sort -h

# Top prispevalo
git shortlog -sn | head -10
```

### Backup Pred Pushom

```bash
# Ustvari bundle (backup celotnega repo)
git bundle create /backup/platforma-backup.bundle --all

# Obnovi iz bundle
git clone /backup/platforma-backup.bundle platforma-restored
```

---

**Želimo vam uspešno migracijo! 🚀**

Za pomoč odpri issue ali kontaktiraj: robert@example.com
