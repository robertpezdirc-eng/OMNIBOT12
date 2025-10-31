# 🏗️ Platforma - Unified Monorepo

**Centraliziran repozitorij za vse projekte uporabnika robertpezdirc-eng**

## 📋 Pregled

Platforma je monorepo, ki združuje vse relevantne projekte iz GitHub računa `robertpezdirc-eng`. Repozitorij ohranja celotno Git zgodovino vseh uvoženih projektov in omogoča enotno upravljanje, verzioniranje ter CI/CD procese.

## 🏗️ Struktura

```
platforma/
├── projects/           # Glavni produkcijski projekti
│   ├── project-a/
│   ├── project-b/
│   └── ...
├── archive/            # Arhivirani/eksperimentalni projekti
│   ├── old-demo/
│   └── ...
├── libs/              # Skupne knjižnice
├── infra/             # Infrastrukturna konfiguracija
├── tools/             # Razvojna orodja in skripte
├── docs/              # Dokumentacija
│   └── MERGE_GUIDE.md
└── migrate_to_monorepo.sh  # Migracijska skripta

```

## 🚀 Kako Začeti

### Kloniranje Repozitorija

```bash
git clone https://github.com/robertpezdirc-eng/platforma.git
cd platforma
```

### Pregled Projektov

Vsi projekti so organizirani v poddirektorije. Vsak projekt ohranja svojo prvotno strukturo:

```bash
# Seznam vseh projektov
ls -la projects/

# Odpri specifičen projekt
cd projects/ime-projekta
```

### Delo z Zgodovino

Celotna Git zgodovina vseh projektov je ohranjena:

```bash
# Poglej zgodovino specifičnega projekta
git log -- projects/ime-projekta/

# Najdi vse commite avtorja v projektu
git log --author="Ime" -- projects/ime-projekta/

# Poglej spremembe v specifični datoteki
git log -p -- projects/ime-projekta/pot/do/datoteke
```

### Oznake (Tags)

Vse oznake iz izvornih repozitorijev so prefiksane z imenom projekta:

```bash
# Seznam vseh oznak
git tag

# Oznake za specifičen projekt
git tag | grep "^ime-projekta/"

# Checkout specifične verzije
git checkout ime-projekta/v1.0.0
```

## 🔧 CI/CD

Monorepo uporablja pametno CI/CD konfiguracijo, ki testira samo spremenjene projekte:

```yaml
# .github/workflows/ci.yml
# Samodejno zazna spremenjene projekte in zažene teste samo za njih
```

### Zagon Testov Lokalno

```bash
# Zagon testov za specifičen projekt
cd projects/ime-projekta
npm test  # ali drug test command

# Zagon vseh testov (lahko traja dolgo)
./tools/run-all-tests.sh
```

## 📦 Dodajanje Novega Projekta

Če želiš dodati nov projekt v monorepo:

```bash
# Uporabi migracijski script
./migrate_to_monorepo.sh

# Ali ročno:
git remote add new-project https://github.com/user/new-project.git
git fetch new-project
git merge --allow-unrelated-histories new-project/main
```

Podrobna navodila so v `docs/MERGE_GUIDE.md`.

## 🔍 Navigacija po Projektih

### Iskanje po Vsebini

```bash
# Iskanje po vseh projektih
git grep "iskalni_niz"

# Iskanje samo v določenem projektu
git grep "iskalni_niz" -- projects/ime-projekta/

# Iskanje v zgodovini
git log -S "iskalni_niz" --all
```

### Statistika Projektov

```bash
# Število commitov po avtorju
git shortlog -sn

# Število commitov po projektu
for dir in projects/*/; do
  echo "$dir: $(git log --oneline -- "$dir" | wc -l)"
done

# Velikost posameznih projektov
du -sh projects/*
```

## 🔐 Varnost in Compliance

### Skenirane Datoteke

Med migracijo so bili vsi projekti skenirani za:
- Potencialne skrivnosti (.env, .pem, ključi)
- Velike datoteke (> 10 MB)
- Git LFS uporabo
- Licence konflikte

Podrobnosti v `docs/SECURITY_SCAN_RESULTS.md`.

### Najboljše Prakse

- **Ne commitaj skrivnosti**: Uporabi `.env` datoteke in dodaj jih v `.gitignore`
- **Velike binarne datoteke**: Uporabi Git LFS ali zunanje storage
- **Licence**: Preveri licenco vsakega projekta pred uporabo

## 📚 Dokumentacija

Vsak projekt ima svojo dokumentacijo v svojem direktoriju:

```
projects/ime-projekta/
├── README.md           # Opis projekta
├── CHANGELOG.md        # Zgodovina sprememb
└── docs/               # Dodatna dokumentacija
```

## 🤝 Prispevanje

### Workflow

1. **Ustvari branch**: `git checkout -b feature/ime-funkcionalnosti`
2. **Naredi spremembe**: Urejaj datoteke v specifičnem projektu
3. **Commit**: `git commit -m "feat(projekt): opis spremembe"`
4. **Push**: `git push origin feature/ime-funkcionalnosti`
5. **Pull Request**: Ustvari PR na GitHubu

### Commit Konvencije

Uporabljamo [Conventional Commits](https://www.conventionalcommits.org/):

```
<tip>(projekt): <opis>

[neobvezno telo]

[neobvezno footer]
```

Tipi: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Primeri:
```
feat(omnibot): dodaj novo funkcionalnost za avtomatizacijo
fix(api): popravi napako v authentication
docs(readme): posodobi navodila za namestitev
```

## 🛠️ Razvojna Orodja

### Skripte

- `migrate_to_monorepo.sh` - Migracija novih repozitorijev
- `tools/run-all-tests.sh` - Zagon vseh testov
- `tools/check-licenses.sh` - Preverjanje licenc
- `tools/find-secrets.sh` - Iskanje potencialnih skrivnosti

### Priporočena Orodja

- **IDE**: VS Code z Workspace nastavitvami
- **Git GUI**: GitKraken, Sourcetree
- **Monorepo Tools**: Turborepo, Nx (če potrebno)

## 📊 Statistika

```bash
# Generiranje statistike
git-quick-stats
# ali
git-extras
```

## ❓ Pogosta Vprašanja

### Kako najdem izvorno zgodovino projekta?

```bash
git log --follow -- projects/ime-projekta/
```

### Kako revertiram na staro verzijo projekta?

```bash
# Najdi commit
git log -- projects/ime-projekta/

# Checkout stare verzije
git checkout <commit-hash> -- projects/ime-projekta/
```

### Ali lahko še vedno uporabim stare oznake?

Da! Vse oznake so prefiksane:

```bash
git checkout projekt/v1.0.0
```

### Kaj če projekt postane prevelik?

Lahko ga ekstrahiraš nazaj v svoj repozitorij ali uporabiš Git Submodules.

### Kako migriram dodatne repozitorije?

```bash
./migrate_to_monorepo.sh
# Sledi navodilom
```

## 📞 Podpora

Za vprašanja in težave:
- Odpri Issue na GitHubu
- Kontakt: robert@pezdirc-eng.com (prilagodi)

## 📄 Licenca

Vsak projekt ima lahko svojo licenco. Pregled licenc:

```bash
find projects/ -name "LICENSE*" -o -name "COPYING*"
```

Glavna licenca monorepo-ja: MIT (glej LICENSE datoteko)

---

**Zadnja posodobitev**: $(date)  
**Vzdrževalec**: robertpezdirc-eng  
**Verzija**: 1.0.0
