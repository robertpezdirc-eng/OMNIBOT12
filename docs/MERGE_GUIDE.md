# 📖 Monorepo Merge Guide

Podrobna navodila za delo z monorepo migracijo in upravljanjem.

## 📑 Kazalo

- [Pregled](#pregled)
- [Migracija Novih Repozitorijev](#migracija-novih-repozitorijev)
- [Ročno Združevanje](#ročno-združevanje)
- [Reševanje Konfliktov](#reševanje-konfliktov)
- [Najboljše Prakse](#najboljše-prakse)
- [Napredne Operacije](#napredne-operacije)
- [Troubleshooting](#troubleshooting)

---

## Pregled

Ta dokument opisuje kako uporabljati avtomatsko migracijo repozitorijev v monorepo ter kako izvesti ročne operacije združevanja.

### Ključni Koncepti

1. **Git Filter Repo**: Orodje za prepisovanje Git zgodovine
2. **Subdirectory Filtering**: Premik vsebine v poddirektorij z ohranitvijo zgodovine
3. **Tag Prefixing**: Preimenovanje oznak za preprečitev konfliktov
4. **Unrelated Histories**: Združevanje projektov brez skupne zgodovine

---

## Migracija Novih Repozitorijev

### Avtomatska Migracija

Uporabi priloženo skripto `migrate_to_monorepo.sh`:

#### Opcija A: PR-Only Mode (priporočeno za prvi pregled)

```bash
# Nastavi okolje
export GITHUB_USER="robertpezdirc-eng"
export TARGET_REPO="platforma"
export AUTO_FETCH_WITH_GH="true"  # Zahteva GitHub CLI
export GITHUB_TOKEN="ghp_your_token_here"  # Opcijsko za zasebne repoje

# Zaženi migracijo v PR-only načinu
./migrate_to_monorepo.sh

# Preglej generirane datoteke
cat /tmp/monorepo-migration-*/MIGRATION_REPORT.md

# Inspiciraj monorepo lokalno
cd /tmp/monorepo-migration-*/monorepo
git log --oneline --graph --all
```

Ta način:
- Pripravi celotno strukturo
- Izvede vse analize (LFS, skrivnosti, velike datoteke)
- Generiraj poročilo
- **NE** pushne v GitHub
- Omogoči ročni pregled pred dejansko migracijo

#### Opcija B: Full Run Mode (direktna migracija)

```bash
# Po pregledu PR-only rezultatov
export GITHUB_USER="robertpezdirc-eng"
export TARGET_REPO="platforma"
export GITHUB_TOKEN="ghp_your_token_here"
export AUTO_FETCH_WITH_GH="true"

# Izvedi celotno migracijo
./migrate_to_monorepo.sh

# Skripta bo:
# 1. Klonirala vse repozitorije
# 2. Filtrirala in prefiksala oznake
# 3. Združila v monorepo
# 4. Generirala poročilo

# Push v GitHub (po pregledu)
cd /tmp/monorepo-migration-*/monorepo
git remote add origin https://github.com/robertpezdirc-eng/platforma.git
git push -u origin main
```

### Nastavitve Migracije

Lahko prilagodiš skript z naslednjimi spremenljivkami:

```bash
# Uporabniško ime GitHub
export GITHUB_USER="robertpezdirc-eng"

# Ime ciljnega repozitorija
export TARGET_REPO="platforma"

# Delovna mapa (privzeto /tmp)
export WORK_DIR="/custom/path/migration-work"

# Avtomatsko pridobi seznam repojev z GitHub CLI
export AUTO_FETCH_WITH_GH="true"

# Arhiviraj originalne repoje po migraciji (NE priporočeno)
export ARCHIVE_AFTER_IMPORT="false"

# GitHub Personal Access Token
export GITHUB_TOKEN="ghp_..."
```

### GitHub Personal Access Token (PAT)

Za dostop do zasebnih repozitorijev potrebuješ PAT:

1. Pojdi na GitHub → Settings → Developer settings → Personal access tokens
2. Ustvari nov token (classic)
3. Izberi scope: `repo` (polni dostop do repozitorijev)
4. **NE** izberi `delete_repo` razen če eksplicitno želiš brisati
5. Kopiraj token in ga nastavi:
   ```bash
   export GITHUB_TOKEN="ghp_your_token_here"
   ```

⚠️ **VARNOST**: Ne shranjuj tokena v skripte ali git history!

---

## Ročno Združevanje

Če želiš ročno združiti repozitorij (brez skripte):

### Korak 1: Pripravi Ciljni Repozitorij

```bash
# Kloniraj ali ustvari monorepo
git clone https://github.com/robertpezdirc-eng/platforma.git
cd platforma

# Ali ustvari nov repozitorij
mkdir platforma
cd platforma
git init
```

### Korak 2: Dodaj Remote za Izvorni Repozitorij

```bash
# Dodaj izvorni repo kot remote
git remote add source-repo https://github.com/robertpezdirc-eng/source-repo.git

# Pridobi vse veje in oznake
git fetch source-repo --tags
```

### Korak 3: Uporabi git-filter-repo

```bash
# Najprej ustvari lokalno kopijo
git clone --mirror https://github.com/robertpezdirc-eng/source-repo.git /tmp/source-repo.git

# Pretvori v običajen repo
cd /tmp/source-repo.git
git config --bool core.bare false
git config --unset core.bare
git checkout main  # ali master

# Prefiksiraj vse oznake
git tag | while read tag; do
  git tag "source-repo/$tag" "$tag"
  git tag -d "$tag"
done

# Uporabi filter-repo za premik v poddirektorij
git filter-repo --force --to-subdirectory-filter projects/source-repo/

# Združi v monorepo
cd /path/to/platforma
git remote add temp-source /tmp/source-repo.git
git fetch temp-source
git merge --allow-unrelated-histories -m "Merge source-repo into monorepo" temp-source/main
git remote remove temp-source
```

### Korak 4: Preveri Združitev

```bash
# Preveri strukturo
ls -la projects/source-repo/

# Preveri zgodovino
git log --oneline --graph -- projects/source-repo/

# Preveri oznake
git tag | grep source-repo
```

---

## Reševanje Konfliktov

### Konflikt Datotek

Ko združuješ repozitorije, lahko pride do konfliktov:

```bash
# Med združevanjem
git merge --allow-unrelated-histories source-repo/main

# Če pride do konflikta
git status  # Poglej konflikte

# Ročno reši konflikte v datotekah
# Uredi datoteke in odstrani markerjé <<<<, ====, >>>>

# Dodaj rešene datoteke
git add .

# Zaključi združitev
git merge --continue
```

### Konflikt Oznak

```bash
# Če obstajajo enake oznake
git tag  # Preveri obstoječe oznake

# Ročno preimenuj konfliktne oznake
git tag old-project/v1.0.0 v1.0.0
git tag -d v1.0.0
```

### Konflikt Licenc

Če različni projekti uporabljajo različne licence:

1. Ohrani glavno licenco monorepo-ja (MIT)
2. Vsak projekt ohrani svojo licenco v svojem direktoriju
3. Dodaj NOTICE datoteko z opozorilom:

```bash
cat >> NOTICE << 'EOF'
This monorepo contains multiple projects with different licenses.
Each project retains its original license in its directory.

Projects and their licenses:
- projects/project-a/: MIT License
- projects/project-b/: Apache 2.0
- projects/project-c/: GPL v3
EOF
```

---

## Najboljše Prakse

### 1. Vedno Uporabi Branches

```bash
# Ustvari feature branch za migracijo
git checkout -b migrate/project-name

# Izvedi migracijo
# ...

# Ustvari pull request
git push -u origin migrate/project-name
```

### 2. Testiraj Lokalno Pred Push

```bash
# Po združitvi preveri vse projekte
for project in projects/*/; do
  echo "Testing $project"
  cd "$project"
  # Zaženi teste
  npm test || pytest || echo "No tests"
  cd -
done
```

### 3. Dokumentiraj Migracije

```bash
# V commit sporočilu dodaj podrobnosti
git commit -m "
feat: merge project-name into monorepo

- Source: https://github.com/user/project-name
- Original tags prefixed with project-name/
- Location: projects/project-name/
- Migration date: $(date)
- Original repo preserved (not deleted)
"
```

### 4. Ohrani Varnostne Kopije

```bash
# Pred migracijo ustvari backup
gh repo clone robertpezdirc-eng/source-repo /backup/source-repo

# Ali uporabi GitHub Archive
gh repo archive robertpezdirc-eng/source-repo
```

### 5. Preveri LFS in Velike Datoteke

```bash
# Pred migracijo preveri velikost
du -sh source-repo

# Preveri LFS
cd source-repo
git lfs ls-files

# Če je LFS, zagotovi da je naložen
git lfs fetch --all
```

---

## Napredne Operacije

### Selektivno Združevanje (Samo Določene Veje)

```bash
# Pridobi samo main branch
git fetch source-repo main

# Združi samo main
git merge --allow-unrelated-histories source-repo/main
```

### Združevanje s Squash (Brez Celotne Zgodovine)

Če ne potrebuješ celotne zgodovine:

```bash
# Pridobi repozitorij
git fetch source-repo

# Združi z squash
git merge --squash --allow-unrelated-histories source-repo/main

# Commitaj kot eno spremembo
git commit -m "feat: add project-name from source-repo"
```

### Ekstrahiranje Samo Dela Repozitorija

Če želiš samo določen direktorij:

```bash
# V izvornem repozitoriju
cd /tmp/source-repo
git filter-repo --subdirectory-filter src/ --to-subdirectory-filter projects/project-name/

# Zdaj je samo vsebina src/ premaknjenjv v projects/project-name/
```

### Rebase Zgodovine Med Združevanjem

```bash
# Po združitvi lahko rebasaš
git rebase -i HEAD~10

# Združi commite, uredi sporočila, itd.
```

### Spreminjanje Avtorjev

Če želiš normalizirati avtorje:

```bash
# V izvornem repozitoriju pred združevanjem
git filter-repo --commit-callback '
  if commit.author_name == b"Old Name":
    commit.author_name = b"New Name"
    commit.author_email = b"new@email.com"
'
```

---

## Troubleshooting

### Problem: "refusing to merge unrelated histories"

**Rešitev**: Uporabi `--allow-unrelated-histories`:

```bash
git merge --allow-unrelated-histories source-repo/main
```

### Problem: git-filter-repo ni nameščen

**Rešitev**:

```bash
# Python pip
pip install git-filter-repo

# Homebrew (macOS)
brew install git-filter-repo

# Apt (Debian/Ubuntu)
apt install git-filter-repo
```

### Problem: "fatal: refusing to merge unrelated histories"

**Vzrok**: Repozitorija nimata skupne zgodovine.

**Rešitev**: To je normalno pri združevanju v monorepo. Uporabi flag:

```bash
git merge --allow-unrelated-histories -m "Merge project" source/main
```

### Problem: Oznake se ne prenesejo pravilno

**Rešitev**: Ročno pridobi in preimenuj:

```bash
# Pridobi vse oznake
git fetch source-repo --tags

# Preimenuj vse oznake
git tag | grep -v "source-repo/" | while read tag; do
  git tag "source-repo/$tag" "$tag"
  git tag -d "$tag"
done
```

### Problem: Velike datoteke povzročajo probleme

**Rešitev 1**: Uporabi Git LFS:

```bash
# Namesti LFS
git lfs install

# Slednje na velike datoteke
git lfs track "*.zip"
git lfs track "*.tar.gz"
git add .gitattributes

# Pretvori obstoječe datoteke
git lfs migrate import --include="*.zip,*.tar.gz"
```

**Rešitev 2**: Odstrani iz zgodovine:

```bash
# Prikaži velike datoteke
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  sed -n 's/^blob //p' | \
  sort -k2 -n -r | \
  head -20

# Odstrani datoteko iz zgodovine
git filter-repo --path path/to/large-file --invert-paths
```

### Problem: Migracija traja predolgo

**Rešitev**: Uporabi shallow clone za testiranje:

```bash
# Shallow clone za hitro testiranje
git clone --depth 1 https://github.com/user/repo.git

# Kasneje pridobi celotno zgodovino
git fetch --unshallow
```

### Problem: "Permission denied" pri push

**Rešitev**: Preveri PAT in permissions:

```bash
# Preveri remote URL
git remote -v

# Uporabi token v URL
git remote set-url origin https://TOKEN@github.com/user/platforma.git

# Ali uporabi GitHub CLI
gh auth login
gh repo clone robertpezdirc-eng/platforma
```

### Problem: Konflikti .gitignore

**Vzrok**: Različni projekti imajo različne .gitignore datoteke.

**Rešitev**:

```bash
# Ohrani .gitignore vsakega projekta v njegovem direktoriju
# V root direktoriju dodaj globalni .gitignore

# Po združitvi
mv projects/project-name/.gitignore projects/project-name/gitignore.local
# Nato ročno združi pomembna pravila v glavni .gitignore
```

---

## Koristni Ukazi

### Pregled Zgodovine

```bash
# Grafični prikaz zgodovine
git log --oneline --graph --all --decorate

# Zgodovina za specifičen projekt
git log --oneline -- projects/project-name/

# Najdi avtorje projekta
git shortlog -sn -- projects/project-name/

# Poglej commite med dvema datumoma
git log --since="2023-01-01" --until="2023-12-31" -- projects/project-name/
```

### Statistika

```bash
# Število datotek po projektu
find projects/ -maxdepth 2 -type f | wc -l

# Velikost po projektu
du -sh projects/*

# Število commitov po projektu
for dir in projects/*/; do
  echo "$dir: $(git log --oneline -- "$dir" | wc -l)"
done

# Top prispevalo po repozitoriju
git shortlog -sn -- projects/project-name/
```

### Čiščenje

```bash
# Počisti začasne datoteke
git clean -fdx

# Optimiziraj repozitorij
git gc --aggressive --prune=now

# Preveri integriteto
git fsck --full
```

---

## Dodatni Viri

- [Git Filter Repo Documentation](https://github.com/newren/git-filter-repo)
- [Monorepo Best Practices](https://monorepo.tools/)
- [Git Documentation - Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)
- [GitHub CLI Documentation](https://cli.github.com/manual/)

---

**Zadnja posodobitev**: 2025-10-31  
**Avtor**: Robert Pezdirc  
**Verzija**: 1.0.0

Za vprašanja in predloge odpri issue na GitHubu.
