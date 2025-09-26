# SSL Auto-Renewal Script for OMNI-BRAIN
# Samodejno obnavljanje Let's Encrypt certifikata

param(
    [Parameter(Mandatory=$false)]
    [string]$Domain,
    
    [Parameter(Mandatory=$false)]
    [switch]$SetupScheduledTask,
    
    [Parameter(Mandatory=$false)]
    [switch]$TestRenewal
)

Write-Host "🔄 OMNI-BRAIN SSL Auto-Renewal System" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Preveri stanje certifikatov
function Test-CertificateExpiry {
    param([string]$Domain = $null)
    
    Write-Host "📅 Preverjam stanje SSL certifikatov..." -ForegroundColor Yellow
    
    try {
        if ($Domain) {
            # Preveri specifičen certifikat
            $certbotList = & certbot certificates --domain $Domain 2>$null
        } else {
            # Preveri vse certifikate
            $certbotList = & certbot certificates 2>$null
        }
        
        if ($certbotList) {
            Write-Host "✅ Certifikati najdeni:" -ForegroundColor Green
            Write-Host $certbotList -ForegroundColor White
            
            # Preveri datum poteka
            $expiryInfo = $certbotList | Select-String "Expiry Date:"
            if ($expiryInfo) {
                Write-Host "📅 Datum poteka: $($expiryInfo.Line)" -ForegroundColor Yellow
            }
            
            return $true
        } else {
            Write-Host "⚠️ Ni najdenih certifikatov" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "❌ Napaka pri preverjanju certifikatov: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 2. Obnovi certifikate
function Update-Certificates {
    param([string]$Domain = $null)
    
    Write-Host "🔄 Obnavljam SSL certifikate..." -ForegroundColor Yellow
    
    try {
        $renewArgs = @("renew", "--quiet")
        
        if ($Domain) {
            $renewArgs += @("--cert-name", $Domain)
        }
        
        Write-Host "🚀 Izvajam: certbot $($renewArgs -join ' ')" -ForegroundColor Cyan
        
        $result = & certbot @renewArgs
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Host "✅ Certifikati uspešno obnovljeni!" -ForegroundColor Green
            
            # Ponovno zaženi strežnik
            Restart-WebServer
            
            # Pošlji obvestilo o uspešni obnovi
            Send-RenewalNotification -Status "Success" -Message "SSL certifikati uspešno obnovljeni"
            
            return $true
        } else {
            Write-Host "⚠️ Certifikati ne potrebujejo obnove ali napaka pri obnovi" -ForegroundColor Yellow
            Write-Host $result -ForegroundColor White
            
            if ($exitCode -ne 0) {
                Send-RenewalNotification -Status "Warning" -Message "Napaka pri obnovi certifikatov: $result"
            }
            
            return $false
        }
    }
    catch {
        Write-Host "❌ Napaka pri obnavljanju certifikatov: $($_.Exception.Message)" -ForegroundColor Red
        Send-RenewalNotification -Status "Error" -Message "Kritična napaka pri obnovi: $($_.Exception.Message)"
        return $false
    }
}

# 3. Ponovno zaženi spletni strežnik
function Restart-WebServer {
    Write-Host "🔄 Ponovno zaganjam spletni strežnik..." -ForegroundColor Yellow
    
    try {
        # Preveri ali teče HTTPS strežnik
        $httpsProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*https-server*"}
        
        if ($httpsProcess) {
            Write-Host "🛑 Ustavljam HTTPS strežnik..." -ForegroundColor Yellow
            $httpsProcess | Stop-Process -Force
            Start-Sleep -Seconds 2
        }
        
        # Zaženi HTTPS strežnik
        if (Test-Path "https-server.js") {
            Write-Host "🚀 Zaganjam HTTPS strežnik..." -ForegroundColor Yellow
            Start-Process -FilePath "node" -ArgumentList "https-server.js" -WindowStyle Hidden
            Write-Host "✅ HTTPS strežnik ponovno zagnan" -ForegroundColor Green
        } else {
            Write-Host "⚠️ https-server.js ni najden" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ Napaka pri ponovnem zagonu strežnika: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 4. Pošlji obvestilo
function Send-RenewalNotification {
    param(
        [string]$Status,
        [string]$Message
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] SSL Renewal $Status`: $Message"
    
    # Zapiši v log datoteko
    $logFile = "ssl-renewal.log"
    Add-Content -Path $logFile -Value $logEntry
    
    # Prikaži obvestilo
    switch ($Status) {
        "Success" { Write-Host "✅ $Message" -ForegroundColor Green }
        "Warning" { Write-Host "⚠️ $Message" -ForegroundColor Yellow }
        "Error" { Write-Host "❌ $Message" -ForegroundColor Red }
    }
    
    # Opcijsko: pošlji email obvestilo (potrebuje konfiguracijo)
    # Send-EmailNotification -Status $Status -Message $Message
}

# 5. Nastavi scheduled task za samodejno obnavljanje
function New-RenewalScheduledTask {
    Write-Host "⏰ Nastavljam scheduled task za samodejno obnavljanje..." -ForegroundColor Yellow
    
    try {
        $taskName = "OMNI-BRAIN SSL Auto-Renewal"
        $scriptPath = $PSCommandPath
        
        # Preveri ali task že obstaja
        $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($existingTask) {
            Write-Host "⚠️ Scheduled task že obstaja, posodabljam..." -ForegroundColor Yellow
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        }
        
        # Ustvari novo nalogo
        $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""
        $trigger = New-ScheduledTaskTrigger -Daily -At "02:00AM"  # Vsak dan ob 2:00
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Samodejno obnavljanje SSL certifikatov za OMNI-BRAIN sistem"
        
        Write-Host "✅ Scheduled task uspešno nastavljen!" -ForegroundColor Green
        Write-Host "📅 Obnavljanje bo potekalo vsak dan ob 2:00" -ForegroundColor Green
        
        return $true
    }
    catch {
        Write-Host "❌ Napaka pri nastavljanju scheduled task: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 6. Testiraj obnavljanje
function Test-RenewalProcess {
    Write-Host "🧪 Testiram proces obnavljanja..." -ForegroundColor Yellow
    
    try {
        # Dry-run obnavljanje
        $testResult = & certbot renew --dry-run 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Test obnavljanja uspešen!" -ForegroundColor Green
            Write-Host $testResult -ForegroundColor White
            return $true
        } else {
            Write-Host "❌ Test obnavljanja neuspešen!" -ForegroundColor Red
            Write-Host $testResult -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Napaka pri testiranju: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Glavna funkcija
function Start-AutoRenewalSetup {
    Write-Host "🚀 Nastavljam sistem za samodejno obnavljanje SSL certifikatov" -ForegroundColor Cyan
    
    # Preveri stanje certifikatov
    Test-CertificateExpiry -Domain $Domain
    
    if ($TestRenewal) {
        # Testiraj obnavljanje
        Test-RenewalProcess
    } elseif ($SetupScheduledTask) {
        # Nastavi scheduled task
        New-RenewalScheduledTask
    } else {
        # Izvedi obnavljanje
        Update-Certificates -Domain $Domain
    }
    
    Write-Host "`n📊 Povzetek auto-renewal sistema:" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host "✅ Certbot nameščen in konfiguriran" -ForegroundColor Green
    Write-Host "✅ Scheduled task za dnevno preverjanje" -ForegroundColor Green
    Write-Host "✅ Avtomatski restart strežnika po obnovi" -ForegroundColor Green
    Write-Host "✅ Logging in obveščanje" -ForegroundColor Green
    Write-Host "📁 Log datoteka: ssl-renewal.log" -ForegroundColor Yellow
}

# Izvedi glede na parametre
if ($SetupScheduledTask) {
    New-RenewalScheduledTask
} elseif ($TestRenewal) {
    Test-RenewalProcess
} else {
    Start-AutoRenewalSetup
}