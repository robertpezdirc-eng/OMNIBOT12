# ========================================
# OMNI CLEANUP SCRIPT - Varno ciscenje nepotrebnih datotek
# ========================================
# Avtor: Omni AI Assistant
# Datum: 2025-09-26
# Verzija: 1.0

param(
    [switch]$DryRun = $false,  # Samo prikaži kaj bi se izbrisalo
    [switch]$Logs = $false,    # Izbriši log datoteke
    [switch]$NodeModules = $false,  # Izbriši node_modules
    [switch]$TempFiles = $false,    # Izbriši temp datoteke
    [switch]$All = $false      # Izbriši vse
)

Write-Host "🧹 OMNI CLEANUP SCRIPT" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  DRY RUN MODE - Nobena datoteka ne bo izbrisana!" -ForegroundColor Yellow
    Write-Host ""
}

$totalSaved = 0
$filesDeleted = 0

function Remove-SafelyWithConfirm {
    param(
        [string]$Path,
        [string]$Description,
        [double]$SizeMB
    )
    
    if (Test-Path $Path) {
        if ($DryRun) {
            Write-Host "🔍 Bi izbrisal: $Description ($([math]::Round($SizeMB,2)) MB)" -ForegroundColor Yellow
            Write-Host "   Pot: $Path" -ForegroundColor Gray
        } else {
            Write-Host "🗑️  Brišem: $Description ($([math]::Round($SizeMB,2)) MB)" -ForegroundColor Red
            try {
                Remove-Item -Path $Path -Recurse -Force
                $script:totalSaved += $SizeMB
                $script:filesDeleted++
                Write-Host "✅ Uspešno izbrisano!" -ForegroundColor Green
            } catch {
                Write-Host "❌ Napaka pri brisanju: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        Write-Host ""
    }
}

function Get-FolderSize {
    param([string]$Path)
    if (Test-Path $Path) {
        return (Get-ChildItem -Path $Path -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
    }
    return 0
}

# 1. LOG DATOTEKE
if ($Logs -or $All) {
    Write-Host "📋 ČIŠČENJE LOG DATOTEK" -ForegroundColor Green
    Write-Host "========================" -ForegroundColor Green
    
    $logFiles = Get-ChildItem -Path . -Recurse -File | Where-Object {$_.Extension -in @('.log')}
    
    foreach ($logFile in $logFiles) {
        $sizeMB = $logFile.Length / 1MB
        if ($sizeMB -gt 0.01) {  # Samo datoteke večje od 0.01 MB
            Remove-SafelyWithConfirm -Path $logFile.FullName -Description "Log datoteka: $($logFile.Name)" -SizeMB $sizeMB
        }
    }
}

# 2. TEMP DATOTEKE
if ($TempFiles -or $All) {
    Write-Host "🗂️  ČIŠČENJE TEMP DATOTEK" -ForegroundColor Green
    Write-Host "==========================" -ForegroundColor Green
    
    $tempExtensions = @('.tmp', '.temp', '.cache', '.bak', '.old')
    $tempFiles = Get-ChildItem -Path . -Recurse -File | Where-Object {$_.Extension -in $tempExtensions}
    
    foreach ($tempFile in $tempFiles) {
        $sizeMB = $tempFile.Length / 1MB
        Remove-SafelyWithConfirm -Path $tempFile.FullName -Description "Temp datoteka: $($tempFile.Name)" -SizeMB $sizeMB
    }
}

# 3. NODE_MODULES MAPE
if ($NodeModules -or $All) {
    Write-Host "📦 ČIŠČENJE NODE_MODULES" -ForegroundColor Green
    Write-Host "=========================" -ForegroundColor Green
    
    $nodeModulesDirs = Get-ChildItem -Path . -Recurse -Directory -Name "node_modules" | ForEach-Object {
        $fullPath = Join-Path (Get-Location) $_
        $size = Get-FolderSize -Path $fullPath
        [PSCustomObject]@{Path=$fullPath; Size=$size}
    } | Where-Object {$_.Size -gt 0.1}  # Samo mape večje od 0.1 MB
    
    foreach ($dir in $nodeModulesDirs) {
        Remove-SafelyWithConfirm -Path $dir.Path -Description "node_modules mapa" -SizeMB $dir.Size
    }
}

# 4. VELIKE EXECUTABLE DATOTEKE (DUPLIKATI)
Write-Host "🔍 PREVERJAM VELIKE EXECUTABLE DATOTEKE" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

$exeFiles = Get-ChildItem -Path . -Recurse -File | Where-Object {$_.Extension -in @('.exe', '.asar')} | 
    Group-Object Name | Where-Object {$_.Count -gt 1}

foreach ($group in $exeFiles) {
    Write-Host "⚠️  Najdeni duplikati: $($group.Name)" -ForegroundColor Yellow
    $group.Group | ForEach-Object {
        $sizeMB = $_.Length / 1MB
        Write-Host "   📁 $($_.Directory) ($([math]::Round($sizeMB,2)) MB)" -ForegroundColor Gray
    }
    Write-Host "   💡 Priporočam ročno preverjanje duplikatov!" -ForegroundColor Cyan
    Write-Host ""
}

# POVZETEK
Write-Host "📊 POVZETEK ČIŠČENJA" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "🔍 DRY RUN - Nobena datoteka ni bila izbrisana" -ForegroundColor Yellow
} else {
    Write-Host "✅ Izbrisanih datotek/map: $filesDeleted" -ForegroundColor Green
    Write-Host "💾 Prihranjen prostor: $([math]::Round($totalSaved,2)) MB" -ForegroundColor Green
}

Write-Host ""
Write-Host "💡 NASVETI ZA UPORABO:" -ForegroundColor Cyan
Write-Host "   • Uporabi -DryRun za pregled brez brisanja" -ForegroundColor Gray
Write-Host "   • Uporabi -Logs za brisanje log datotek" -ForegroundColor Gray
Write-Host "   • Uporabi -NodeModules za brisanje node_modules" -ForegroundColor Gray
Write-Host "   • Uporabi -TempFiles za brisanje temp datotek" -ForegroundColor Gray
Write-Host "   • Uporabi -All za brisanje vsega" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Primer uporabe: .\cleanup-script.ps1 -DryRun -All" -ForegroundColor Cyan