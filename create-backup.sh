#!/bin/bash

###############################################################################
# OMNIBOT12 Projekt Varnostna Kopija / Project Backup Script
# 
# Ta skripta ustvari popolno varnostno kopijo projekta pred arhiviranjem.
# This script creates a complete backup of the project before archiving.
###############################################################################

set -e  # Ustavi ob napaki / Exit on error

# Barve za output / Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcije / Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Datum za backup / Date for backup
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Pridobi ime projekta iz trenutnega direktorija / Get project name from current directory
PROJECT_NAME=$(basename "$PWD" | tr '[:upper:]' '[:lower:]')
BACKUP_DIR="./${PROJECT_NAME}-backup-${BACKUP_DATE}"

print_header "${PROJECT_NAME^^} Varnostna Kopija / Backup"
echo "Datum / Date: $(date)"
echo "Direktorij / Directory: ${BACKUP_DIR}"
echo ""

# Ustvari backup direktorij / Create backup directory
mkdir -p "${BACKUP_DIR}"
print_success "Ustvarjen backup direktorij / Created backup directory"

# 1. Git repozitorij / Git repository
print_header "1. Varnostna kopija Git repozitorija / Git Repository Backup"
if [ -d ".git" ]; then
    git bundle create "${BACKUP_DIR}/${PROJECT_NAME}-repo.bundle" --all
    print_success "Git repozitorij shranjen / Git repository saved"
    
    # Shrani tudi trenutno stanje / Save current state too
    git archive -o "${BACKUP_DIR}/${PROJECT_NAME}-current-state.tar.gz" HEAD
    print_success "Trenutno stanje shranjeno / Current state saved"
    
    # Shrani git log / Save git log
    git log --all --oneline --graph --decorate > "${BACKUP_DIR}/git-log.txt"
    print_success "Git zgodovina shranjena / Git history saved"
else
    print_warning "Git repozitorij ni najden / Git repository not found"
fi

# 2. Konfiguracijske datoteke / Configuration files
print_header "2. Varnostna kopija konfiguracije / Configuration Backup"
mkdir -p "${BACKUP_DIR}/config"

# Kopiraj konfiguracijske datoteke (brez občutljivih podatkov) / Copy config files (without sensitive data)
for file in .env.example .env.docker .env.production; do
    if [ -f "$file" ]; then
        cp "$file" "${BACKUP_DIR}/config/"
        print_success "Kopiran: $file / Copied: $file"
    fi
done

# Kopiraj JSON in YAML konfig / Copy JSON and YAML config
find . -maxdepth 1 -type f \( -name "*.json" -o -name "*.yml" -o -name "*.yaml" \) ! -name "package-lock.json" ! -name "test-*.json" -exec cp {} "${BACKUP_DIR}/config/" \;
print_success "JSON/YAML konfiguracijske datoteke kopirane / JSON/YAML config files copied"

# 3. SQLite baze / SQLite databases
print_header "3. Varnostna kopija SQLite baz / SQLite Databases Backup"
mkdir -p "${BACKUP_DIR}/sqlite"

DB_COUNT=0
for db in *.db; do
    if [ -f "$db" ]; then
        cp "$db" "${BACKUP_DIR}/sqlite/"
        DB_COUNT=$((DB_COUNT + 1))
        print_success "Kopirana: $db / Copied: $db"
    fi
done

if [ $DB_COUNT -eq 0 ]; then
    print_warning "Ni najdenih SQLite baz / No SQLite databases found"
else
    print_success "Kopirano $DB_COUNT SQLite baz / Copied $DB_COUNT SQLite databases"
fi

# 4. MongoDB izvoz (če teče) / MongoDB export (if running)
print_header "4. MongoDB izvoz / MongoDB Export"
mkdir -p "${BACKUP_DIR}/mongodb"

if command -v mongodump &> /dev/null; then
    # Poskusi odkriti MongoDB baze / Try to discover MongoDB databases
    if command -v mongo &> /dev/null; then
        print_warning "Poskušam avtomatsko odkriti MongoDB baze / Trying to auto-discover MongoDB databases"
        # Poskusi dobiti seznam baz / Try to get list of databases
        DBS=$(mongo --quiet --eval "db.adminCommand('listDatabases').databases.map(d => d.name).join(' ')" 2>/dev/null | grep -v 'admin\|config\|local' || echo "")
        if [ -z "$DBS" ]; then
            # Uporabi privzete baze za OMNIBOT12 / Use default databases for OMNIBOT12
            print_warning "Ni mogoče avtomatsko odkriti baz, uporabljam privzete / Cannot auto-discover, using defaults"
            DBS="omni_analytics omni_multitenant devops finance tourism"
        fi
    else
        # Uporabi privzete baze za OMNIBOT12 / Use default databases for OMNIBOT12
        DBS="omni_analytics omni_multitenant devops finance tourism"
    fi
    
    for db in $DBS; do
        if mongodump --db "$db" --out "${BACKUP_DIR}/mongodb" 2>/dev/null; then
            print_success "MongoDB baza izvožena: $db / MongoDB database exported: $db"
        else
            print_warning "Ne morem izvoziti MongoDB baze: $db / Cannot export MongoDB database: $db"
        fi
    done
else
    print_warning "mongodump ni nameščen / mongodump not installed"
    print_warning "Če želite izvoziti MongoDB, namestite MongoDB Database Tools"
    print_warning "If you want to export MongoDB, install MongoDB Database Tools"
fi

# 5. Dokumentacija / Documentation
print_header "5. Varnostna kopija dokumentacije / Documentation Backup"
mkdir -p "${BACKUP_DIR}/docs"

# Kopiraj vse MD datoteke / Copy all MD files
find . -maxdepth 1 -type f -name "*.md" -exec cp {} "${BACKUP_DIR}/docs/" \;
print_success "Markdown dokumentacija kopirana / Markdown documentation copied"

# Kopiraj docs mapo, če obstaja / Copy docs folder if exists
if [ -d "docs" ]; then
    cp -r docs "${BACKUP_DIR}/"
    print_success "Docs mapa kopirana / Docs folder copied"
fi

# 6. Package informacije / Package information
print_header "6. Informacije o paketih / Package Information"
mkdir -p "${BACKUP_DIR}/dependencies"

if [ -f "package.json" ]; then
    cp package.json "${BACKUP_DIR}/dependencies/"
    if [ -f "package-lock.json" ]; then
        cp package-lock.json "${BACKUP_DIR}/dependencies/"
    fi
    
    # Izvozi seznam nameščenih paketov / Export installed packages list
    if command -v npm &> /dev/null; then
        npm list --depth=0 > "${BACKUP_DIR}/dependencies/npm-list.txt" 2>&1 || true
    fi
    print_success "Node.js odvisnosti shranjene / Node.js dependencies saved"
fi

if [ -f "requirements.txt" ]; then
    cp requirements.txt "${BACKUP_DIR}/dependencies/"
    
    # Izvozi seznam nameščenih Python paketov / Export installed Python packages
    if command -v pip &> /dev/null; then
        pip list > "${BACKUP_DIR}/dependencies/pip-list.txt" 2>&1 || true
    fi
    print_success "Python odvisnosti shranjene / Python dependencies saved"
fi

# 7. Sistemske informacije / System information
print_header "7. Sistemske informacije / System Information"
{
    echo "=== Sistemske Informacije / System Information ==="
    echo "Datum varnostne kopije / Backup Date: $(date)"
    echo "OS: $(uname -a)"
    echo ""
    echo "=== Verzije / Versions ==="
    if command -v node &> /dev/null; then
        echo "Node.js: $(node --version)"
    fi
    if command -v npm &> /dev/null; then
        echo "npm: $(npm --version)"
    fi
    if command -v python3 &> /dev/null; then
        echo "Python: $(python3 --version)"
    fi
    if command -v git &> /dev/null; then
        echo "Git: $(git --version)"
    fi
    if command -v docker &> /dev/null; then
        echo "Docker: $(docker --version)"
    fi
    if command -v mongod &> /dev/null; then
        echo "MongoDB: $(mongod --version | head -n 1)"
    fi
} > "${BACKUP_DIR}/system-info.txt"
print_success "Sistemske informacije shranjene / System information saved"

# 8. GitHub Issues in PRs (če je gh nameščen) / GitHub Issues and PRs (if gh installed)
print_header "8. GitHub podatki / GitHub Data"
if command -v gh &> /dev/null; then
    mkdir -p "${BACKUP_DIR}/github"
    
    gh issue list --state all --json number,title,body,state,createdAt,closedAt --limit 1000 > "${BACKUP_DIR}/github/issues.json" 2>&1 || print_warning "Ni mogoče izvoziti issues / Cannot export issues"
    gh pr list --state all --json number,title,body,state,createdAt,mergedAt --limit 1000 > "${BACKUP_DIR}/github/pull-requests.json" 2>&1 || print_warning "Ni mogoče izvoziti PRs / Cannot export PRs"
    gh release list --limit 1000 > "${BACKUP_DIR}/github/releases.txt" 2>&1 || print_warning "Ni mogoče izvoziti releases / Cannot export releases"
    
    print_success "GitHub podatki izvoženi / GitHub data exported"
else
    print_warning "GitHub CLI (gh) ni nameščen / GitHub CLI (gh) not installed"
    print_warning "Za izvoz issues in PRs namestite: https://cli.github.com/"
    print_warning "To export issues and PRs, install: https://cli.github.com/"
fi

# 9. Ustvari manifest / Create manifest
print_header "9. Ustvarjanje manifesta / Creating Manifest"
{
    echo "=== OMNIBOT12 Backup Manifest ==="
    echo "Datum / Date: $(date)"
    echo "Backup verzija / Backup version: ${BACKUP_DATE}"
    echo ""
    echo "=== Vsebina / Contents ==="
    echo "- Git repozitorij (bundle)"
    echo "- Git repozitorij (trenutno stanje / current state)"
    echo "- Konfiguracijske datoteke / Configuration files"
    echo "- SQLite baze / SQLite databases"
    echo "- MongoDB izvoz / MongoDB export"
    echo "- Dokumentacija / Documentation"
    echo "- Odvisnosti / Dependencies"
    echo "- Sistemske informacije / System information"
    echo "- GitHub podatki / GitHub data"
    echo ""
    echo "=== Velikosti / Sizes ==="
    du -sh "${BACKUP_DIR}"/* 2>/dev/null || true
    echo ""
    echo "=== Checksums (MD5) ==="
    find "${BACKUP_DIR}" -type f -exec md5sum {} \; 2>/dev/null || true
} > "${BACKUP_DIR}/MANIFEST.txt"
print_success "Manifest ustvarjen / Manifest created"

# 10. Kompresija / Compression
print_header "10. Kompresija varnostne kopije / Compressing Backup"
ARCHIVE_NAME="${PROJECT_NAME}-backup-${BACKUP_DATE}.tar.gz"

tar -czf "${ARCHIVE_NAME}" "${BACKUP_DIR}"
ARCHIVE_SIZE=$(du -h "${ARCHIVE_NAME}" | cut -f1)

print_success "Varnostna kopija kompresirana / Backup compressed: ${ARCHIVE_NAME}"
print_success "Velikost arhiva / Archive size: ${ARCHIVE_SIZE}"

# Opcijsko: izbriši nekompresiran direktorij / Optional: delete uncompressed directory
read -p "Želite izbrisati nekompresiran backup direktorij? (y/n) / Delete uncompressed backup directory? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "${BACKUP_DIR}"
    print_success "Nekompresiran direktorij izbrisan / Uncompressed directory deleted"
fi

# Zaključek / Conclusion
print_header "Varnostna kopija zaključena / Backup Complete!"
echo ""
echo -e "${GREEN}Varnostna kopija uspešno ustvarjena! / Backup successfully created!${NC}"
echo ""
echo "📦 Arhiv / Archive: ${ARCHIVE_NAME}"
echo "📊 Velikost / Size: ${ARCHIVE_SIZE}"
echo ""
echo "Priporočila / Recommendations:"
echo "1. Shranite arhiv na varno lokacijo / Store the archive in a safe location"
echo "2. Kopirajte na več lokacij (pravilo 3-2-1) / Copy to multiple locations (3-2-1 rule)"
echo "3. Preverite celovitost arhiva / Verify archive integrity:"
echo "   tar -tzf ${ARCHIVE_NAME} > /dev/null && echo 'OK'"
echo ""
echo "Za obnovo / To restore:"
echo "   tar -xzf ${ARCHIVE_NAME}"
echo ""
echo "Za obnovo Git repozitorija / To restore Git repository:"
echo "   git clone ${BACKUP_DIR}/${PROJECT_NAME}-repo.bundle ${PROJECT_NAME}-restored"
echo ""
print_success "✓ Projekt je pripravljen za arhiviranje / Project ready for archiving"
