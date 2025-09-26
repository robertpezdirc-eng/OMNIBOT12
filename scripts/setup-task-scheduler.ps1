# 🕒 OMNI-BRAIN Windows Task Scheduler Nastavitev
# Skripta za nastavitev avtomatskih posodobitev na Windows

param(
    [string]$Schedule = "Daily",
    [string]$Time = "02:00",
    [switch]$NoBackup,
    [switch]$Force,
    [switch]$Help
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

if ($Help) {
    Write-Info "🕒 OMNI-BRAIN Windows Task Scheduler Nastavitev"
    Write-Info ""
    Write-Info "Uporaba: .\setup-task-scheduler.ps1 [OPCIJE]"
    Write-Info ""
    Write-Info "Opcije:"
    Write-Info "  -Schedule INTERVAL   Interval posodobitev (Daily, Weekly, Monthly)"
    Write-Info "  -Time TIME          Čas izvajanja (HH:MM format)"
    Write-Info "  -NoBackup           Ne ustvari backup pred posodobitvijo"
    Write-Info "  -Force              Prepiši obstoječe naloge"
    Write-Info "  -Help               Prikaži to pomoč"
    Write-Info ""
    Write-Info "Primeri:"
    Write-Info "  .\setup-task-scheduler.ps1 -Schedule Daily -Time 02:00"
    Write-Info "  .\setup-task-scheduler.ps1 -Schedule Weekly -Time 03:30"
    Write-Info "  .\setup-task-scheduler.ps1 -Schedule Monthly -Time 01:00"
    exit 0
}

# 📋 Preveri administratorske pravice
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "❌ Ta skripta zahteva administratorske pravice!"
    Write-Info "Zaženi PowerShell kot Administrator in poskusi znova."
    exit 1
}

Write-Info "🕒 OMNI-BRAIN Windows Task Scheduler Nastavitev"
Write-Info "==============================================="

# 📁 Nastavi direktorije
$OMNI_DIR = "C:\omni-brain"
$UPDATE_SCRIPT = "$OMNI_DIR\update-omni.ps1"
$LOG_DIR = "$OMNI_DIR\logs"

# 🔍 Preveri če obstajajo potrebne datoteke
if (-not (Test-Path $UPDATE_SCRIPT)) {
    Write-Error "❌ Update skripta ne obstaja: $UPDATE_SCRIPT"
    exit 1
}

# 📁 Ustvari log direktorij
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
}

# 🕒 Nastavi trigger glede na schedule
switch ($Schedule.ToLower()) {
    "daily" {
        $TriggerType = "Daily"
        $Description = "vsak dan ob $Time"
    }
    "weekly" {
        $TriggerType = "Weekly"
        $Description = "vsako nedeljo ob $Time"
    }
    "monthly" {
        $TriggerType = "Monthly"
        $Description = "prvi dan v mesecu ob $Time"
    }
    default {
        Write-Error "❌ Nepodprt schedule: $Schedule"
        Write-Info "Podprti: Daily, Weekly, Monthly"
        exit 1
    }
}

# 🔧 Pripravi argumente za update skripto
$UpdateArgs = ""
if (-not $NoBackup) {
    $UpdateArgs += "-BackupFirst "
}
$UpdateArgs += "-RestartServices"

$TaskName = "OMNI-BRAIN-AutoUpdate"
$LogFile = "$LOG_DIR\scheduled-update.log"

Write-Info "📅 Nastavljam nalogo:"
Write-Info "   Ime: $TaskName"
Write-Info "   Schedule: $Description"
Write-Info "   Skripta: $UPDATE_SCRIPT"
Write-Info "   Argumenti: $UpdateArgs"

try {
    # 🗑️ Odstrani obstoječo nalogo če obstaja
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        if ($Force) {
            Write-Info "🗑️ Odstranjujem obstoječo nalogo..."
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
            Write-Success "✅ Obstoječa naloga odstranjena"
        } else {
            Write-Warning "⚠️ Naloga $TaskName že obstaja"
            Write-Info "Uporabi -Force za prepis ali odstrani ročno z:"
            Write-Info "Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
            exit 1
        }
    }

    # ➕ Ustvari novo nalogo
    Write-Info "➕ Ustvarjam novo nalogo..."

    # Ustvari trigger
    $Trigger = switch ($TriggerType) {
        "Daily" {
            New-ScheduledTaskTrigger -Daily -At $Time
        }
        "Weekly" {
            New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $Time
        }
        "Monthly" {
            # Za mesečno - prvi dan v mesecu
            $trigger = New-ScheduledTaskTrigger -Daily -At $Time
            $trigger.Repetition.Duration = "P1M"  # Ponovi vsak mesec
            $trigger
        }
    }

    # Ustvari akcijo
    $Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$UPDATE_SCRIPT`" $UpdateArgs >> `"$LogFile`" 2>&1"

    # Ustvari nastavitve
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

    # Ustvari principal (zaženi kot SYSTEM)
    $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

    # Registriraj nalogo
    Register-ScheduledTask -TaskName $TaskName -Trigger $Trigger -Action $Action -Settings $Settings -Principal $Principal -Description "OMNI-BRAIN Avtomatska Posodobitev - $Description"

    Write-Success "✅ Naloga uspešno ustvarjena"

    # 📊 Prikaži informacije o nalogi
    Write-Info ""
    Write-Info "📊 INFORMACIJE O NALOGI"
    Write-Info "======================="
    $task = Get-ScheduledTask -TaskName $TaskName
    Write-Info "Ime: $($task.TaskName)"
    Write-Info "Stanje: $($task.State)"
    Write-Info "Opis: $($task.Description)"
    
    $taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Info "Zadnji zagon: $($taskInfo.LastRunTime)"
    Write-Info "Naslednji zagon: $($taskInfo.NextRunTime)"

} catch {
    Write-Error "❌ Napaka pri ustvarjanju naloge: $_"
    exit 1
}

# 🧪 Ustvari test skripto
$TestScript = "$OMNI_DIR\test-update.ps1"
$TestContent = @"
# Test skripta za preverjanje delovanja update sistema

Write-Host "🧪 Test OMNI-BRAIN posodobitve - `$(Get-Date)" -ForegroundColor Cyan
Write-Host "========================================"

# Preveri Git repozitorij
Set-Location "$OMNI_DIR"
Write-Host "📍 Trenutna Git veja: `$(& git branch --show-current)"
Write-Host "📍 Zadnji commit: `$(& git log -1 --oneline)"

# Preveri storitve
Write-Host "📊 Status storitev:"
Get-Service -Name "OMNI-BRAIN" | Format-Table -AutoSize

# Preveri delovanje
try {
    `$response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10 -ErrorAction Stop
    if (`$response.StatusCode -eq 200) {
        Write-Host "✅ Sistem deluje pravilno" -ForegroundColor Green
    } else {
        Write-Host "❌ Sistem ne deluje pravilno (HTTP `$(`$response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Sistem ne deluje pravilno: `$_" -ForegroundColor Red
}

Write-Host "🏁 Test končan - `$(Get-Date)" -ForegroundColor Cyan
"@

Set-Content -Path $TestScript -Value $TestContent -Encoding UTF8

# 📋 Prikaži navodila
Write-Info ""
Write-Info "📋 NAVODILA ZA UPORABO"
Write-Info "======================"
Write-Info "🔧 Upravljanje nalog:"
Write-Info "   Get-ScheduledTask -TaskName '$TaskName'           # Prikaži nalogo"
Write-Info "   Start-ScheduledTask -TaskName '$TaskName'         # Zaženi nalogo"
Write-Info "   Stop-ScheduledTask -TaskName '$TaskName'          # Ustavi nalogo"
Write-Info "   Disable-ScheduledTask -TaskName '$TaskName'       # Onemogoči nalogo"
Write-Info "   Enable-ScheduledTask -TaskName '$TaskName'        # Omogoči nalogo"
Write-Info ""
Write-Info "📝 Dnevniki:"
Write-Info "   Get-Content '$LogFile' -Tail 50                   # Zadnjih 50 vrstic"
Write-Info "   Get-WinEvent -LogName 'Microsoft-Windows-TaskScheduler/Operational' | Where-Object {`$_.Message -like '*$TaskName*'}"
Write-Info ""
Write-Info "🧪 Testiranje:"
Write-Info "   & '$TestScript'                                   # Testiraj sistem"
Write-Info "   & '$UPDATE_SCRIPT' -Help                          # Pomoč za update skripto"
Write-Info ""
Write-Info "🗑️ Odstranitev:"
Write-Info "   Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"

Write-Success ""
Write-Success "🎉 Avtomatske posodobitve so nastavljene!"
Write-Info "Naslednja posodobitev: $Description"
Write-Info "Dnevnik: $LogFile"

# 🧪 Ponudi test zagon
Write-Info ""
$testRun = Read-Host "Ali želiš testirati nalogo zdaj? (y/N)"
if ($testRun -eq "y" -or $testRun -eq "Y") {
    Write-Info "🧪 Zaganjam test nalogo..."
    Start-ScheduledTask -TaskName $TaskName
    Write-Success "✅ Test naloga zagnana. Preveri dnevnik za rezultate."
}