# 📊 Poročilo Migracije Monorepo

## Izvršitveni Povzetek

**Datum**: [AUTO-GENERIRANO]  
**Uporabnik**: robertpezdirc-eng  
**Ciljni repozitorij**: platforma  
**Status**: [PENDING/SUCCESS/FAILED]

---

## 📋 Obdelani Repozitoriji

### Statistika

- **Skupno repozitorijev**: [ŠTEVILO]
- **Uspešno migrirano**: [ŠTEVILO]
- **Arhivirano**: [ŠTEVILO]
- **Izključeno**: [ŠTEVILO]
- **Neuspelo**: [ŠTEVILO]

### Tabela Repozitorijev

| Repozitorij | Vključeno | Pot v Monorepo | Tagi Prefiksani | LFS/Velike Datoteke | Arhiviran | Razlog za Arhiviranje | Velikost (MB) |
|-------------|-----------|----------------|-----------------|---------------------|-----------|----------------------|---------------|
| (primer)    | Da        | projects/x     | Da (x/)         | Ne                  | Ne        | -                    | 15.2          |

---

## 🏷️ Oznake (Tags)

### Prefiksane Oznake

Vse oznake iz izvornih repozitorijev so bile prefiksane z imenom projekta:

```
Originalno:       v1.0.0
Po migraciji:     project-name/v1.0.0
```

### Seznam Vseh Oznak

```bash
# Glej vse oznake
git tag

# Filtriraj po projektu
git tag | grep "^project-name/"
```

---

## 📦 Git LFS in Velike Datoteke

### Repozitoriji z LFS

| Repozitorij | LFS Datoteke | Skupna Velikost |
|-------------|--------------|-----------------|
| (primer)    | 12 datotek   | 2.5 GB          |

### Velike Datoteke (> 10 MB)

| Repozitorij | Datoteka | Velikost | Priporočilo |
|-------------|----------|----------|-------------|
| (primer)    | data.zip | 50 MB    | Uporabi LFS |

#### Priporočeni Ukrepi

1. Za datoteke > 50 MB: Uporabi Git LFS
2. Za binarne artefakte: Preseli v eksterni storage (S3, Azure Blob)
3. Za zgodovinske velike datoteke: Razmisli o `git filter-repo` čiščenju

---

## 🔒 Varnostno Skeniranje

### Potencialne Skrivnosti

| Repozitorij | Datoteka | Tip | Status |
|-------------|----------|-----|--------|
| (primer)    | .env     | ENV | Izključeno |
| (primer)    | key.pem  | KEY | Izključeno |

#### ⚠️ OPOZORILO

Naslednje datoteke so bile zaznane kot potencialno občutljive in **NISO** bile migrirane:

```
projects/project-a/.env
projects/project-b/secrets/api_key.txt
projects/project-c/cert.pem
```

**Akcije**:
1. Preveri da te datoteke NISO v git zgodovini
2. Če so, uporabi `git filter-repo` za odstranitev
3. Uporabi `.gitignore` za preprečevanje prihodnjih commitov
4. Rotriraj vse potencialno razkrite skrivnosti

---

## 📜 Licence

### Zaznane Licence

| Repozitorij | Licenca | Lokacija |
|-------------|---------|----------|
| (primer)    | MIT     | projects/example/LICENSE |
| (primer)    | Apache 2.0 | projects/another/LICENSE |

### Konflikti Licenc

**Status**: [NO CONFLICTS / CONFLICTS FOUND]

#### Strategija

1. **Glavna licenca monorepo**: MIT
2. **Individualne licence**: Ohranimo v posameznih projektih
3. **NOTICE datoteka**: Ustvarjena v root direktoriju

### Priporočila za Licence

- Vsi projekti morajo ohraniti svojo originalno licenco
- Dodaj `NOTICE` datoteko če uporabljajo različne licence
- Za komercialno uporabo preveri združljivost licenc

---

## 📊 Statistika Zgodovine

### Commiti

| Repozitorij | Št. Commitov | Prvi Commit | Zadnji Commit | Aktivni Avtorji |
|-------------|--------------|-------------|---------------|-----------------|
| (primer)    | 234          | 2020-01-15  | 2024-10-31    | 5               |

### Avtorji

Top 10 prispevalo po repozitorijih:

```
1. Robert Pezdirc    - 1,234 commits
2. Contributor A     - 456 commits
3. Contributor B     - 234 commits
...
```

### Časovnica

```
2020 ████░░░░░░ 100 commits
2021 ████████░░ 400 commits
2022 ██████████ 600 commits
2023 ████████░░ 500 commits
2024 ██████░░░░ 300 commits
```

---

## 🔧 Tehnične Podrobnosti

### Migracija

**Skripta**: `migrate_to_monorepo.sh`  
**Verzija**: 1.0.0  
**Trajanje**: [X minut]  
**Uporabljena Orodja**:
- git-filter-repo v2.38.0
- GitHub CLI v2.40.0
- Git v2.42.0

### Struktura Direktorija

```
platforma/
├── projects/           [N projektov, X GB]
├── archive/            [N projektov, X GB]
├── libs/               [N knjižnic]
├── infra/              [Infrastruktura]
├── tools/              [Orodja]
└── docs/               [Dokumentacija]
```

### Ukazi za Push

```bash
# Navigiraj v monorepo
cd [WORK_DIR]/monorepo

# Dodaj remote
git remote add origin https://github.com/robertpezdirc-eng/platforma.git

# Push main branch
git push -u origin main

# Push vse oznake
git push --tags
```

---

## 🚨 Težave in Opozorila

### Kritične Težave

[NONE / LISTA TEŽAV]

### Opozorila

[NONE / LISTA OPOZORIL]

### Priporočeni Naslednji Koraki

1. ✅ Preglej migracijo poročilo
2. ✅ Inspiciraj lokalni monorepo
3. ✅ Preveri da niso commited skrivnosti
4. ✅ Testiraj build vsakega projekta
5. ✅ Ustvari backup originalnih repozitorijev
6. ⏳ Push v GitHub
7. ⏳ Nastavi CI/CD workflows
8. ⏳ Arhiviraj originalne repozitorije (po potrditvi)

---

## 📝 Navodila za Preverjanje

### Lokalno Preverjanje

```bash
# 1. Navigiraj v monorepo
cd [WORK_DIR]/monorepo

# 2. Preveri strukturo
tree -L 2 projects/

# 3. Preveri zgodovino
git log --oneline --graph --all | head -50

# 4. Preveri oznake
git tag | head -20

# 5. Testiraj build za vsak projekt
for project in projects/*/; do
  echo "Testing $project"
  cd "$project"
  # Zaženi build/test ukaze
  cd -
done
```

### Preverjanje Varnosti

```bash
# 1. Poišči morebitne skrivnosti
git grep -i "password\|secret\|api_key" projects/

# 2. Preveri za .env datoteke
find projects/ -name ".env*"

# 3. Preveri za certifikate in ključe
find projects/ -name "*.pem" -o -name "*.key"
```

### Push v GitHub

```bash
# Ko si zadovoljen z migracijo:

# 1. Dodaj remote
git remote add origin https://github.com/robertpezdirc-eng/platforma.git

# 2. Push main branch
git push -u origin main

# 3. Push vse oznake
git push --tags

# 4. Preveri na GitHubu
open https://github.com/robertpezdirc-eng/platforma
```

---

## 🔄 Rollback Načrt

Če je potreben rollback:

### Opcija 1: Lokalno Obnovitev

```bash
# Obnovite originalne repozitorije iz backupa
cd /backup
for repo in */; do
  cd "$repo"
  git push --mirror https://github.com/robertpezdirc-eng/"$repo"
  cd ..
done
```

### Opcija 2: GitHub Restore

```bash
# Če nisi izbrisal originalnih repozitorijev, so še vedno tam
gh repo list robertpezdirc-eng

# Lahko jih de-arhiviraš
gh repo edit robertpezdirc-eng/repo-name --archived=false
```

---

## 📞 Podpora

Za vprašanja ali težave:

- **GitHub Issues**: https://github.com/robertpezdirc-eng/platforma/issues
- **Email**: [vaš email]
- **Dokumentacija**: `/docs/MERGE_GUIDE.md`

---

## 🎉 Zaključek

Migracija je [PENDING/COMPLETED/FAILED].

**Naslednji koraki**:
1. Preglej to poročilo v celoti
2. Testiraj monorepo lokalno
3. Pushaj v GitHub (po potrditvi)
4. Nastavi CI/CD
5. Obavesti ekipo

---

**Generirano**: [AUTO-TIMESTAMP]  
**Verzija Skripte**: 1.0.0  
**Avtor**: Robert Pezdirc
