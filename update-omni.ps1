# 🚀 OMNI-BRAIN-MAXI-ULTRA Avtomatska Posodobitev
# Skripta za avtomatsko posodabljanje sistema

param(
    [switch]$Force,
    [switch]$BackupFirst,
    [switch]$RestartServices,
    [string]$Branch = "main",
    [switch]$Verbose
)

# 🎨 Barvne funkcije
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Info { Write-ColorOutput Cyan $args }

# 📋 Preveri administratorske pravice
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "❌ Ta skripta zahteva administratorske pravice!"
    Write-Info "Zaženi PowerShell kot Administrator in poskusi znova."
    exit 1
}

Write-Info "🚀 OMNI-BRAIN-MAXI-ULTRA Avtomatska Posodobitev"
Write-Info "================================================"

# 📁 Nastavi delovni direktorij
$OMNI_DIR = "C:\omni-brain"
$BACKUP_DIR = "C:\omni-brain-backups"
$LOG_FILE = "$OMNI_DIR\logs\update.log"

# 🔍 Preveri če obstaja OMNI direktorij
if (-not (Test-Path $OMNI_DIR)) {
    Write-Error "❌ OMNI-BRAIN direktorij ne obstaja: $OMNI_DIR"
    Write-Info "Najprej zaženi deploy-omni.ps1 za namestitev."
    exit 1
}

Set-Location $OMNI_DIR

# 📝 Funkcija za beleženje
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Add-Content -Path $LOG_FILE -Value $logMessage
    if ($Verbose) {
        Write-Info $logMessage
    }
}

Write-Log "🚀 Začetek posodobitve OMNI-BRAIN sistema"

# 🛑 Ustavi storitve
Write-Info "⏹️ Ustavljam OMNI-BRAIN storitve..."
try {
    Stop-Service -Name "OMNI-BRAIN" -ErrorAction SilentlyContinue
    Write-Success "✅ OMNI-BRAIN storitev ustavljena"
    Write-Log "OMNI-BRAIN storitev ustavljena"
} catch {
    Write-Warning "⚠️ Napaka pri ustavljanju OMNI-BRAIN storitve: $_"
    Write-Log "Napaka pri ustavljanju storitve: $_"
}

# 💾 Ustvari backup če je zahtevano
if ($BackupFirst) {
    Write-Info "💾 Ustvarjam backup pred posodobitvijo..."
    $backupName = "omni-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $backupPath = "$BACKUP_DIR\$backupName"
    
    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    }
    
    try {
        # Backup kode
        Copy-Item -Path $OMNI_DIR -Destination $backupPath -Recurse -Force
        
        # Backup MongoDB
        $mongoBackupPath = "$backupPath\mongodb-backup"
        New-Item -ItemType Directory -Path $mongoBackupPath -Force | Out-Null
        & mongodump --db omni_brain --out $mongoBackupPath
        
        Write-Success "✅ Backup ustvarjen: $backupPath"
        Write-Log "Backup ustvarjen: $backupPath"
    } catch {
        Write-Error "❌ Napaka pri ustvarjanju backupa: $_"
        Write-Log "Napaka pri backupu: $_"
        if (-not $Force) {
            exit 1
        }
    }
}

# 🔄 Posodobi Git repozitorij
Write-Info "🔄 Posodabljam Git repozitorij..."
try {
    # Shrani lokalne spremembe
    & git stash push -m "Auto-stash before update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    # Prenesi najnovejše spremembe
    & git fetch origin
    
    # Preveri če so na voljo posodobitve
    $localCommit = & git rev-parse HEAD
    $remoteCommit = & git rev-parse "origin/$Branch"
    
    if ($localCommit -eq $remoteCommit) {
        Write-Success "✅ Sistem je že posodobljen na najnovejšo različico"
        Write-Log "Sistem že posodobljen"
        
        # Zaženi storitve
        Start-Service -Name "OMNI-BRAIN"
        Write-Success "✅ OMNI-BRAIN storitev ponovno zagnana"
        exit 0
    }
    
    Write-Info "📥 Najdene nove posodobitve, posodabljam..."
    & git checkout $Branch
    & git pull origin $Branch
    
    Write-Success "✅ Git repozitorij posodobljen"
    Write-Log "Git repozitorij posodobljen"
} catch {
    Write-Error "❌ Napaka pri posodabljanju Git repozitorija: $_"
    Write-Log "Napaka pri Git posodobitvi: $_"
    if (-not $Force) {
        exit 1
    }
}

# 📦 Posodobi Node.js odvisnosti
Write-Info "📦 Posodabljam Node.js odvisnosti..."
try {
    & npm ci --production
    Write-Success "✅ Node.js odvisnosti posodobljene"
    Write-Log "Node.js odvisnosti posodobljene"
} catch {
    Write-Error "❌ Napaka pri posodabljanju odvisnosti: $_"
    Write-Log "Napaka pri posodabljanju odvisnosti: $_"
    if (-not $Force) {
        exit 1
    }
}

# 🔧 Posodobi konfiguracije
Write-Info "🔧 Preverjam konfiguracije..."
if (Test-Path ".env.example") {
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Info "📝 Ustvarjena .env datoteka iz predloge"
        Write-Log ".env datoteka ustvarjena"
    } else {
        Write-Info "📝 .env datoteka že obstaja, preveri ročno za nove nastavitve"
        Write-Log ".env datoteka že obstaja"
    }
}

# 🗄️ Posodobi bazo podatkov (migracije)
Write-Info "🗄️ Preverjam potrebne migracije baze podatkov..."
try {
    # Preveri če obstajajo migracije
    if (Test-Path "migrations") {
        Write-Info "🔄 Izvajam migracije baze podatkov..."
        & node migrations/run-migrations.js
        Write-Success "✅ Migracije baze podatkov izvedene"
        Write-Log "Migracije baze podatkov izvedene"
    }
} catch {
    Write-Warning "⚠️ Napaka pri migracijah: $_"
    Write-Log "Napaka pri migracijah: $_"
}

# 🚀 Zaženi storitve
Write-Info "🚀 Zaganjam OMNI-BRAIN storitve..."
try {
    Start-Service -Name "OMNI-BRAIN"
    Start-Sleep -Seconds 5
    
    # Preveri status storitve
    $service = Get-Service -Name "OMNI-BRAIN"
    if ($service.Status -eq "Running") {
        Write-Success "✅ OMNI-BRAIN storitev uspešno zagnana"
        Write-Log "OMNI-BRAIN storitev zagnana"
    } else {
        Write-Error "❌ OMNI-BRAIN storitev se ni uspešno zagnala"
        Write-Log "Napaka pri zagonu storitve"
    }
} catch {
    Write-Error "❌ Napaka pri zagonu storitev: $_"
    Write-Log "Napaka pri zagonu storitev: $_"
}

# 🧪 Preveri delovanje sistema
Write-Info "🧪 Preverjam delovanje sistema..."
try {
    Start-Sleep -Seconds 10
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 30 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Success "✅ Sistem deluje pravilno"
        Write-Log "Sistem deluje pravilno"
    } else {
        Write-Warning "⚠️ Sistem morda ne deluje pravilno (HTTP $($response.StatusCode))"
        Write-Log "Sistem morda ne deluje pravilno"
    }
} catch {
    Write-Warning "⚠️ Ne morem preveriti delovanja sistema: $_"
    Write-Log "Ne morem preveriti delovanja sistema: $_"
}

# 📊 Prikaži povzetek
Write-Info ""
Write-Info "📊 POVZETEK POSODOBITVE"
Write-Info "======================"
Write-Success "✅ Posodobitev OMNI-BRAIN sistema dokončana"
Write-Info "📅 Čas posodobitve: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Info "🌐 Dostop: http://localhost:3000"
Write-Info "📋 Admin Dashboard: http://localhost:3000/admin"
Write-Info "📝 Dnevnik posodobitve: $LOG_FILE"

if ($BackupFirst) {
    Write-Info "💾 Backup lokacija: $backupPath"
}

Write-Log "Posodobitev dokončana uspešno"
Write-Info ""
Write-Info "🎉 OMNI-BRAIN-MAXI-ULTRA je pripravljen za uporabo!"