#!/bin/bash

# Omni System Backup Script
# Ustvari varnostno kopijo MongoDB podatkov in konfiguracijskih datotek

set -e

# Konfiguracija
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="omni-backup-$DATE"
RETENTION_DAYS=7

# Ustvari backup direktorij
mkdir -p "$BACKUP_DIR"

echo "🔄 Začenjam backup sistema..."

# 1. MongoDB backup
echo "📦 Backup MongoDB podatkov..."
docker exec omni-mongo-prod mongodump --out "/backups/$BACKUP_NAME/mongodb" --quiet

# 2. Backup konfiguracijskih datotek
echo "📁 Backup konfiguracijskih datotek..."
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/config"
cp -r ./nginx "$BACKUP_DIR/$BACKUP_NAME/config/"
cp .env "$BACKUP_DIR/$BACKUP_NAME/config/" 2>/dev/null || echo "⚠️  .env datoteka ni najdena"
cp docker-compose.prod.yml "$BACKUP_DIR/$BACKUP_NAME/config/"

# 3. Backup SSL certifikatov (brez privatnih ključev iz varnostnih razlogov)
echo "🔐 Backup SSL certifikatov..."
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/ssl"
cp ./certs/fullchain.pem "$BACKUP_DIR/$BACKUP_NAME/ssl/" 2>/dev/null || echo "⚠️  SSL certifikat ni najden"

# 4. Ustvari arhiv
echo "🗜️  Ustvarjam arhiv..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

# 5. Počisti stare backupe
echo "🧹 Čistim stare backupe (starejše od $RETENTION_DAYS dni)..."
find "$BACKUP_DIR" -name "omni-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 6. Prikaži rezultat
BACKUP_SIZE=$(du -h "$BACKUP_NAME.tar.gz" | cut -f1)
echo "✅ Backup uspešno ustvarjen: $BACKUP_NAME.tar.gz ($BACKUP_SIZE)"

# 7. Opcijsko: pošlji na oddaljeni strežnik
if [ ! -z "$REMOTE_BACKUP_HOST" ]; then
    echo "📤 Pošiljam backup na oddaljeni strežnik..."
    scp "$BACKUP_NAME.tar.gz" "$REMOTE_BACKUP_HOST:$REMOTE_BACKUP_PATH/"
    echo "✅ Backup poslan na oddaljeni strežnik"
fi

echo "🎉 Backup proces končan!"