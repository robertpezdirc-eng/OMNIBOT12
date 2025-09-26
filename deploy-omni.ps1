# 🚀 OMNI-BRAIN-MAXI-ULTRA One-Click Windows Deploy Script
# Avtomatska namestitev in konfiguracija na Windows Server z Omni Brain Dashboard

param(
    [string]$GitRepo = "",
    [string]$Domain = "localhost",
    [switch]$SkipIIS = $false,
    [switch]$Development = $false,
    [switch]$EnableOmniBrain = $true
)

# Preveri admin pravice
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "Ta script zahteva Administrator pravice. Zaženi PowerShell kot Administrator."
    exit 1
}

# Barve za lepši izpis
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Log($message) {
    Write-ColorOutput Green "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $message"
}

function Error($message) {
    Write-ColorOutput Red "[ERROR] $message"
    exit 1
}

function Warning($message) {
    Write-ColorOutput Yellow "[WARNING] $message"
}

function Info($message) {
    Write-ColorOutput Blue "[INFO] $message"
}

Write-Host "🚀 Začenjam One-Click Deploy za OMNI-BRAIN-MAXI-ULTRA..." -ForegroundColor Green
Write-Host "📅 $(Get-Date)" -ForegroundColor Cyan
Write-Host "🖥️  Sistem: $($env:COMPUTERNAME) - $($env:OS)" -ForegroundColor Cyan

# 1️⃣ Preveri in namesti Chocolatey
Log "🍫 Preverjam Chocolatey package manager..."
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Log "Nameščam Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    refreshenv
} else {
    Info "Chocolatey je že nameščen"
}

# 2️⃣ Namesti osnovne pakete
Log "📦 Nameščam osnovne pakete..."
$packages = @(
    "nodejs",
    "git",
    "mongodb",
    "redis-64",
    "nginx",
    "openssl",
    "curl",
    "wget"
)

foreach ($package in $packages) {
    Log "Nameščam $package..."
    choco install $package -y --no-progress
}

# Refresh environment variables
refreshenv

# 3️⃣ Preveri Node.js verzijo
$nodeVersion = node --version
$npmVersion = npm --version
Info "Node.js verzija: $nodeVersion"
Info "NPM verzija: $npmVersion"

# 4️⃣ Namesti PM2
Log "🔄 Nameščam PM2 process manager..."
npm install -g pm2
npm install -g pm2-windows-service

# 5️⃣ Nastavi MongoDB
Log "🗄️ Nastavljam MongoDB..."
$mongoPath = "C:\Program Files\MongoDB\Server\6.0\bin"
$env:PATH += ";$mongoPath"

# Ustvari MongoDB data direktorij
$mongoDataPath = "C:\data\db"
if (!(Test-Path $mongoDataPath)) {
    New-Item -ItemType Directory -Path $mongoDataPath -Force
}

# Zaženi MongoDB kot service
Start-Service MongoDB

# 6️⃣ Nastavi Redis
Log "🔴 Nastavljam Redis..."
Start-Service Redis

# 7️⃣ Pripravi projekt direktorij
Log "📂 Pripravljam OMNI-BRAIN projekt..."
$projectDir = "C:\omni-brain"
if (Test-Path $projectDir) {
    Warning "Direktorij $projectDir že obstaja. Brišem staro verzijo..."
    Remove-Item -Path $projectDir -Recurse -Force
}

New-Item -ItemType Directory -Path $projectDir -Force
Set-Location $projectDir

# Kloniraj ali kopiraj projekt
if ($GitRepo) {
    Log "📥 Kloniram iz Git repozitorija: $GitRepo"
    git clone $GitRepo .
} else {
    Log "📁 Kopiram lokalne datoteke..."
    $sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    Copy-Item -Path "$sourceDir\*" -Destination $projectDir -Recurse -Force -Exclude @("node_modules", "logs", "backups")
}

# 8️⃣ Namesti Node.js odvisnosti
Log "📦 Nameščam Node.js odvisnosti..."
npm install --production

# 9️⃣ Ustvari potrebne direktorije
Log "📁 Ustvarjam potrebne direktorije..."
$directories = @("logs", "uploads", "temp", "certs", "backups", "data\memory", "data\logs", "data\analytics")
foreach ($dir in $directories) {
    $fullPath = Join-Path $projectDir $dir
    if (!(Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force
    }
}

# 🔟 Nastavi okoljske spremenljivke
Log "🔧 Nastavljam okoljske spremenljivke..."
$envContent = @"
# OMNI-BRAIN-MAXI-ULTRA Windows Production Environment
NODE_ENV=production
PORT=3000
WEBSOCKET_PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/omni-brain
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=$([System.Web.Security.Membership]::GeneratePassword(32, 8))
SESSION_SECRET=$([System.Web.Security.Membership]::GeneratePassword(32, 8))
ENCRYPTION_KEY=$([System.Web.Security.Membership]::GeneratePassword(32, 8))

# Logging
LOG_LEVEL=info
LOG_FILE=logs\omni-brain.log

# Features
ENABLE_ANALYTICS=true
ENABLE_BACKUP=true
ENABLE_MONITORING=true
ENABLE_SSL=true
ENABLE_OMNI_BRAIN=true

# Omni Brain Configuration
OMNI_BRAIN_ENABLED=true
OMNI_BRAIN_AUTO_SAVE=true
OMNI_BRAIN_SAVE_INTERVAL=300000
OMNI_BRAIN_LEARNING_AGENT=true
OMNI_BRAIN_COMMERCIAL_AGENT=true
OMNI_BRAIN_OPTIMIZATION_AGENT=true
OMNI_BRAIN_REAL_TIME_MONITORING=true

# Domain
DOMAIN=$Domain

# Windows specific
PLATFORM=windows
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

# 1️⃣1️⃣ Nastavi IIS (opcijsko)
if (!$SkipIIS) {
    Log "🌐 Nastavljam IIS reverse proxy..."
    
    # Omogoči IIS funkcionalnosti
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-HttpErrors, IIS-HttpLogging, IIS-RequestFiltering, IIS-StaticContent, IIS-DefaultDocument, IIS-DirectoryBrowsing -All
    
    # Namesti URL Rewrite module
    $urlRewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
    $urlRewritePath = "$env:TEMP\urlrewrite.msi"
    Invoke-WebRequest -Uri $urlRewriteUrl -OutFile $urlRewritePath
    Start-Process msiexec.exe -Wait -ArgumentList "/i $urlRewritePath /quiet"
    
    # Namesti Application Request Routing
    $arrUrl = "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi"
    $arrPath = "$env:TEMP\arr.msi"
    Invoke-WebRequest -Uri $arrUrl -OutFile $arrPath
    Start-Process msiexec.exe -Wait -ArgumentList "/i $arrPath /quiet"
    
    # Ustvari IIS site
    Import-Module WebAdministration
    
    # Odstrani default site
    Remove-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
    
    # Ustvari OMNI-BRAIN site
    New-Website -Name "OMNI-BRAIN" -Port 80 -PhysicalPath $projectDir -ApplicationPool "DefaultAppPool"
    
    # Nastavi web.config za reverse proxy
    $webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxyInboundRule1" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://localhost:3000/{R:1}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
"@
    
    $webConfig | Out-File -FilePath "web.config" -Encoding UTF8
}

# 1️⃣2️⃣ Generiraj SSL certifikat
Log "🔒 Generiram SSL certifikat..."
$certPath = Join-Path $projectDir "certs"
$certFile = Join-Path $certPath "omni-brain.crt"
$keyFile = Join-Path $certPath "omni-brain.key"

# Uporabi OpenSSL za generiranje certifikata
& openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout $keyFile -out $certFile -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=OMNI-BRAIN/CN=$Domain"

# 1️⃣3️⃣ Ustvari Windows Service za OMNI-BRAIN
Log "⚙️ Ustvarjam Windows Service..."
$serviceName = "OMNI-BRAIN-Service"
$serviceDisplayName = "OMNI-BRAIN-MAXI-ULTRA AI Platform"
$serviceDescription = "Napredna AI platforma z angelskimi agenti"

# Ustvari service wrapper script
$serviceScript = @"
const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
    name: '$serviceName',
    description: '$serviceDescription',
    script: path.join(__dirname, 'server-modular.js'),
    nodeOptions: [
        '--max_old_space_size=4096'
    ],
    env: {
        name: 'NODE_ENV',
        value: 'production'
    }
});

svc.on('install', () => {
    console.log('Service installed successfully');
    svc.start();
});

svc.on('alreadyinstalled', () => {
    console.log('Service already installed');
});

svc.install();
"@

$serviceScript | Out-File -FilePath "install-service.js" -Encoding UTF8

# Namesti node-windows
npm install node-windows

# Zaženi service installer
node install-service.js

# 1️⃣4️⃣ Nastavi avtomatski backup
Log "💾 Nastavljam avtomatski backup..."
$backupScript = @"
# OMNI-BRAIN Backup Script
`$backupDir = "C:\omni-brain\backups"
`$date = Get-Date -Format "yyyyMMdd_HHmmss"

# MongoDB backup
mongodump --db omni-brain --out "`$backupDir\mongo_`$date"

# Files backup
Compress-Archive -Path "C:\omni-brain\*" -DestinationPath "`$backupDir\files_`$date.zip" -Force -CompressionLevel Optimal

# Obdrži samo zadnjih 7 dni
Get-ChildItem "`$backupDir" -Name "mongo_*" | Where-Object { `$_.CreationTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Recurse -Force
Get-ChildItem "`$backupDir" -Name "files_*.zip" | Where-Object { `$_.CreationTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force

Write-Host "Backup completed: `$date"
"@

$backupScript | Out-File -FilePath "backup-script.ps1" -Encoding UTF8

# Ustvari scheduled task za backup
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File `"$projectDir\backup-script.ps1`""
$trigger = New-ScheduledTaskTrigger -Daily -At "02:00"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "OMNI-BRAIN-Backup" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Dnevni backup OMNI-BRAIN sistema"

# 1️⃣5️⃣ Ustvari monitoring script
Log "📊 Ustvarjam monitoring script..."
$monitorScript = @"
# OMNI-BRAIN Monitoring Script
`$logFile = "C:\omni-brain\logs\monitor.log"
`$date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Preveri ali je service aktiven
`$service = Get-Service -Name "$serviceName" -ErrorAction SilentlyContinue
if (`$service.Status -ne "Running") {
    Add-Content -Path `$logFile -Value "[`$date] ALERT: OMNI-BRAIN service ni aktiven! Poskušam restart..."
    Restart-Service -Name "$serviceName"
    Start-Sleep -Seconds 10
    `$service = Get-Service -Name "$serviceName" -ErrorAction SilentlyContinue
    if (`$service.Status -eq "Running") {
        Add-Content -Path `$logFile -Value "[`$date] SUCCESS: OMNI-BRAIN service uspešno restartiran"
    } else {
        Add-Content -Path `$logFile -Value "[`$date] ERROR: OMNI-BRAIN service restart neuspešen!"
    }
}

# Preveri disk space
`$disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
`$diskUsage = [math]::Round(((`$disk.Size - `$disk.FreeSpace) / `$disk.Size) * 100, 2)
if (`$diskUsage -gt 80) {
    Add-Content -Path `$logFile -Value "[`$date] WARNING: Disk usage is `$diskUsage%"
}

# Preveri memory usage
`$memory = Get-WmiObject -Class Win32_OperatingSystem
`$memUsage = [math]::Round(((`$memory.TotalVisibleMemorySize - `$memory.FreePhysicalMemory) / `$memory.TotalVisibleMemorySize) * 100, 2)
if (`$memUsage -gt 85) {
    Add-Content -Path `$logFile -Value "[`$date] WARNING: Memory usage is `$memUsage%"
}
"@

$monitorScript | Out-File -FilePath "monitor-script.ps1" -Encoding UTF8

# Ustvari scheduled task za monitoring
$monitorAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File `"$projectDir\monitor-script.ps1`""
$monitorTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)
$monitorSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$monitorPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "OMNI-BRAIN-Monitor" -Action $monitorAction -Trigger $monitorTrigger -Settings $monitorSettings -Principal $monitorPrincipal -Description "Monitoring OMNI-BRAIN sistema vsakih 5 minut"

# 1️⃣6️⃣ Nastavi Windows Firewall
Log "🔥 Nastavljam Windows Firewall..."
New-NetFirewallRule -DisplayName "OMNI-BRAIN HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "OMNI-BRAIN HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
New-NetFirewallRule -DisplayName "OMNI-BRAIN App" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "OMNI-BRAIN WebSocket" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

# 1️⃣7️⃣ Zaženi sistem
Log "🚀 Zaganjam OMNI-BRAIN sistem..."
Start-Sleep -Seconds 5

# Preveri status
Log "✅ Preverjam status sistema..."

Write-Host ""
Write-Host "🎉 ==================================" -ForegroundColor Green
Write-Host "🚀 OMNI-BRAIN-MAXI-ULTRA DEPLOY COMPLETE!" -ForegroundColor Green
Write-Host "🎉 ==================================" -ForegroundColor Green
Write-Host ""

# Status check
$omniService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($omniService -and $omniService.Status -eq "Running") {
    Write-Host "✅ OMNI-BRAIN Service: AKTIVEN" -ForegroundColor Green
} else {
    Write-Host "❌ OMNI-BRAIN Service: NEAKTIVEN" -ForegroundColor Red
}

$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq "Running") {
    Write-Host "✅ MongoDB: AKTIVEN" -ForegroundColor Green
} else {
    Write-Host "❌ MongoDB: NEAKTIVEN" -ForegroundColor Red
}

$redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
if ($redisService -and $redisService.Status -eq "Running") {
    Write-Host "✅ Redis: AKTIVEN" -ForegroundColor Green
} else {
    Write-Host "❌ Redis: NEAKTIVEN" -ForegroundColor Red
}

Write-Host ""
Write-Host "🌐 Dostop do aplikacije:" -ForegroundColor Cyan
Write-Host "   HTTP:  http://$Domain" -ForegroundColor White
Write-Host "   HTTPS: https://$Domain" -ForegroundColor White
Write-Host "   API:   http://$Domain:3000/api" -ForegroundColor White
Write-Host ""
Write-Host "📊 Upravljanje:" -ForegroundColor Cyan
Write-Host "   Status:  Get-Service -Name '$serviceName'" -ForegroundColor White
Write-Host "   Restart: Restart-Service -Name '$serviceName'" -ForegroundColor White
Write-Host "   Logs:    Get-Content '$projectDir\logs\omni-brain.log' -Tail 50 -Wait" -ForegroundColor White
Write-Host "   Monitor: Get-Content '$projectDir\logs\monitor.log' -Tail 20" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Konfiguracija:" -ForegroundColor Cyan
Write-Host "   Env file: $projectDir\.env" -ForegroundColor White
Write-Host "   Service:  Services.msc -> $serviceName" -ForegroundColor White
Write-Host "   Tasks:    Task Scheduler -> OMNI-BRAIN-*" -ForegroundColor White
Write-Host ""
Write-Host "💾 Backup:" -ForegroundColor Cyan
Write-Host "   Lokacija: $projectDir\backups\" -ForegroundColor White
Write-Host "   Schedule: Vsak dan ob 2:00 (Task Scheduler)" -ForegroundColor White
Write-Host ""
Write-Host "🔒 Varnost:" -ForegroundColor Cyan
Write-Host "   SSL: Self-signed certifikat v $projectDir\certs\" -ForegroundColor White
Write-Host "   Firewall: Windows Firewall omogočen" -ForegroundColor White
Write-Host "   Ports: 80, 443, 3000, 3001" -ForegroundColor White
Write-Host ""

# Prikaži naslednje korake
Write-Host "📋 NASLEDNJI KORAKI:" -ForegroundColor Yellow
Write-Host "1. Nastavi svoj domain v .env datoteki" -ForegroundColor White
Write-Host "2. Za produkcijo uporabi pravi SSL certifikat" -ForegroundColor White
Write-Host "3. Konfiguriraj email nastavitve v .env" -ForegroundColor White
Write-Host "4. Nastavi cloud storage za backupe" -ForegroundColor White
Write-Host "5. Preveri logs: Get-Content logs\omni-brain.log -Tail 50" -ForegroundColor White
Write-Host ""

Warning "POMEMBNO: Spremeni default gesla in API ključe v .env datoteki!"

Log "🎯 Deploy končan uspešno! OMNI-BRAIN je pripravljen za uporabo na Windows."