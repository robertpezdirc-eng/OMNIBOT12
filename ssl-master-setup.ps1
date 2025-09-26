# SSL Master Setup Script for OMNI-BRAIN
# Celotna avtomatska nastavitev SSL certifikata

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDomainCheck,
    
    [Parameter(Mandatory=$false)]
    [switch]$TestMode
)

Write-Host "SSL HITRI TEST" -ForegroundColor Cyan
Write-Host "OMNI-BRAIN SSL Master Setup" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "Domena: $Domain" -ForegroundColor White
Write-Host "Email: $Email" -ForegroundColor White

if ($TestMode) {
    Write-Host "TEST MODE - Dry run" -ForegroundColor Yellow
}

# Globalne spremenljivke
$global:SetupResults = @{
    DomainCheck = $false
    CertbotInstall = $false
    CertificateGeneration = $false
    HTTPSConfiguration = $false
    AutoRenewal = $false
    Monitoring = $false
}

# 1. Preveri domensko usmerjanje
function Step1-DomainCheck {
    Write-Host "`nKORAK 1: Preverjanje domenskega usmerjanja" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    
    if ($SkipDomainCheck) {
        Write-Host "⏭️ Preskačem preverjanje domene (--SkipDomainCheck)" -ForegroundColor Yellow
        $global:SetupResults.DomainCheck = $true
        return $true
    }
    
    try {
        $scriptPath = ".\ssl-setup.ps1"
        if (Test-Path $scriptPath) {
            Write-Host "🚀 Izvajam preverjanje domene..." -ForegroundColor Yellow
            
            if ($TestMode) {
                Write-Host "🧪 TEST: Bi izvedel preverjanje domene $Domain" -ForegroundColor Yellow
                $global:SetupResults.DomainCheck = $true
                return $true
            }
            
            $result = & powershell.exe -ExecutionPolicy Bypass -File $scriptPath -Domain $Domain
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Domensko usmerjanje uspešno preverjeno" -ForegroundColor Green
                $global:SetupResults.DomainCheck = $true
                return $true
            } else {
                Write-Host "❌ Napaka pri preverjanju domene" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "❌ ssl-setup.ps1 ni najden" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Napaka pri preverjanju domene: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 2. Namesti Certbot in generiraj certifikat
function Step2-CertbotInstall {
    Write-Host "`n🔐 KORAK 2: Namestitev Certbot in generiranje certifikata" -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Cyan
    
    try {
        $scriptPath = ".\ssl-certbot-install.ps1"
        if (Test-Path $scriptPath) {
            Write-Host "🚀 Izvajam namestitev Certbot..." -ForegroundColor Yellow
            
            if ($TestMode) {
                Write-Host "🧪 TEST: Bi namestil Certbot in generiral certifikat za $Domain" -ForegroundColor Yellow
                $global:SetupResults.CertbotInstall = $true
                $global:SetupResults.CertificateGeneration = $true
                return $true
            }
            
            $result = & powershell.exe -ExecutionPolicy Bypass -File $scriptPath -Domain $Domain -Email $Email
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Certbot nameščen in certifikat generiran" -ForegroundColor Green
                $global:SetupResults.CertbotInstall = $true
                $global:SetupResults.CertificateGeneration = $true
                return $true
            } else {
                Write-Host "❌ Napaka pri namestitvi Certbot" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "❌ ssl-certbot-install.ps1 ni najden" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Napaka pri namestitvi Certbot: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 3. Konfiguriraj HTTPS strežnik
function Step3-HTTPSConfiguration {
    Write-Host "`n🌐 KORAK 3: Konfiguracija HTTPS strežnika" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    
    try {
        # Preveri ali obstaja https-server.js
        if (Test-Path "https-server.js") {
            Write-Host "✅ HTTPS strežnik konfiguracija že obstaja" -ForegroundColor Green
        } else {
            Write-Host "❌ https-server.js ni najden" -ForegroundColor Red
            return $false
        }
        
        # Nastavi okoljske spremenljivke
        Write-Host "⚙️ Nastavljam okoljske spremenljivke..." -ForegroundColor Yellow
        
        $envContent = Get-Content ".env" -ErrorAction SilentlyContinue
        $newEnvContent = @()
        $domainSet = $false
        $sslPathSet = $false
        
        foreach ($line in $envContent) {
            if ($line -match "^DOMAIN=") {
                $newEnvContent += "DOMAIN=$Domain"
                $domainSet = $true
            } elseif ($line -match "^SSL_CERT_PATH=") {
                $newEnvContent += "SSL_CERT_PATH=C:\\Certbot\\live"
                $sslPathSet = $true
            } else {
                $newEnvContent += $line
            }
        }
        
        if (-not $domainSet) {
            $newEnvContent += "DOMAIN=$Domain"
        }
        if (-not $sslPathSet) {
            $newEnvContent += "SSL_CERT_PATH=C:\\Certbot\\live"
        }
        
        if ($TestMode) {
            Write-Host "🧪 TEST: Bi posodobil .env datoteko z DOMAIN=$Domain" -ForegroundColor Yellow
        } else {
            $newEnvContent | Out-File -FilePath ".env" -Encoding UTF8
            Write-Host "✅ Okoljske spremenljivke posodobljene" -ForegroundColor Green
        }
        
        $global:SetupResults.HTTPSConfiguration = $true
        return $true
    }
    catch {
        Write-Host "❌ Napaka pri konfiguraciji HTTPS: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 4. Nastavi samodejno obnavljanje
function Step4-AutoRenewal {
    Write-Host "`n🔄 KORAK 4: Nastavitev samodejnega obnavljanja" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    
    try {
        $scriptPath = ".\ssl-auto-renewal.ps1"
        if (Test-Path $scriptPath) {
            Write-Host "🚀 Nastavljam samodejno obnavljanje..." -ForegroundColor Yellow
            
            if ($TestMode) {
                Write-Host "🧪 TEST: Bi nastavil scheduled task za samodejno obnavljanje" -ForegroundColor Yellow
                $global:SetupResults.AutoRenewal = $true
                return $true
            }
            
            $result = & powershell.exe -ExecutionPolicy Bypass -File $scriptPath -SetupScheduledTask
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Samodejno obnavljanje nastavljeno" -ForegroundColor Green
                $global:SetupResults.AutoRenewal = $true
                return $true
            } else {
                Write-Host "❌ Napaka pri nastavitvi samodejnega obnavljanja" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "❌ ssl-auto-renewal.ps1 ni najden" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Napaka pri nastavitvi samodejnega obnavljanja: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 5. Nastavi nadzor certifikatov
function Step5-Monitoring {
    Write-Host "`n📊 KORAK 5: Nastavitev nadzora certifikatov" -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor Cyan
    
    try {
        if (Test-Path "ssl-monitoring.js") {
            Write-Host "🚀 Nastavljam SSL nadzor..." -ForegroundColor Yellow
            
            if ($TestMode) {
                Write-Host "🧪 TEST: Bi zagnal SSL monitoring sistem" -ForegroundColor Yellow
                $global:SetupResults.Monitoring = $true
                return $true
            }
            
            # Zaženi monitoring v ozadju
            $monitoringProcess = Start-Process -FilePath "node" -ArgumentList "ssl-monitoring.js", "start" -WindowStyle Hidden -PassThru
            
            if ($monitoringProcess) {
                Write-Host "✅ SSL nadzor zagnan (PID: $($monitoringProcess.Id))" -ForegroundColor Green
                $global:SetupResults.Monitoring = $true
                return $true
            } else {
                Write-Host "❌ Napaka pri zagonu SSL nadzora" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "❌ ssl-monitoring.js ni najden" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Napaka pri nastavitvi nadzora: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 6. Zaženi HTTPS strežnik
function Step6-StartHTTPSServer {
    Write-Host "`n🚀 KORAK 6: Zagon HTTPS strežnika" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    
    try {
        if ($TestMode) {
            Write-Host "🧪 TEST: Bi zagnal HTTPS strežnik na portih 80 in 443" -ForegroundColor Yellow
            return $true
        }
        
        # Ustavi obstoječe strežnike
        Write-Host "🛑 Ustavljam obstoječe strežnike..." -ForegroundColor Yellow
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*server*"} | Stop-Process -Force -ErrorAction SilentlyContinue
        
        Start-Sleep -Seconds 2
        
        # Zaženi HTTPS strežnik
        Write-Host "🚀 Zaganjam HTTPS strežnik..." -ForegroundColor Yellow
        $httpsProcess = Start-Process -FilePath "node" -ArgumentList "https-server.js" -WindowStyle Hidden -PassThru
        
        if ($httpsProcess) {
            Write-Host "✅ HTTPS strežnik zagnan (PID: $($httpsProcess.Id))" -ForegroundColor Green
            Write-Host "🌐 Dostopen na: https://$Domain" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Napaka pri zagonu HTTPS strežnika" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Napaka pri zagonu strežnika: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Glavna funkcija
function Start-SSLMasterSetup {
    Write-Host "🚀 Začenjam celotno SSL nastavitev za OMNI-BRAIN" -ForegroundColor Cyan
    
    $startTime = Get-Date
    
    # Izvedi vse korake
    $step1 = Step1-DomainCheck
    $step2 = if ($step1) { Step2-CertbotInstall } else { $false }
    $step3 = if ($step2) { Step3-HTTPSConfiguration } else { $false }
    $step4 = if ($step3) { Step4-AutoRenewal } else { $false }
    $step5 = if ($step4) { Step5-Monitoring } else { $false }
    $step6 = if ($step5) { Step6-StartHTTPSServer } else { $false }
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    # Povzetek rezultatov
    Write-Host "`n📊 POVZETEK SSL NASTAVITVE" -ForegroundColor Cyan
    Write-Host "===========================" -ForegroundColor Cyan
    Write-Host "🌐 Domena: $Domain" -ForegroundColor White
    Write-Host "📧 Email: $Email" -ForegroundColor White
    Write-Host "⏱️ Čas izvajanja: $($duration.TotalMinutes.ToString('F1')) minut" -ForegroundColor White
    Write-Host ""
    
    # Rezultati po korakih
    $steps = @(
        @{ Name = "Domensko usmerjanje"; Result = $global:SetupResults.DomainCheck },
        @{ Name = "Certbot namestitev"; Result = $global:SetupResults.CertbotInstall },
        @{ Name = "Generiranje certifikata"; Result = $global:SetupResults.CertificateGeneration },
        @{ Name = "HTTPS konfiguracija"; Result = $global:SetupResults.HTTPSConfiguration },
        @{ Name = "Samodejno obnavljanje"; Result = $global:SetupResults.AutoRenewal },
        @{ Name = "SSL nadzor"; Result = $global:SetupResults.Monitoring }
    )
    
    $successCount = 0
    foreach ($step in $steps) {
        if ($step.Result) {
            Write-Host "✅ $($step.Name)" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "❌ $($step.Name)" -ForegroundColor Red
        }
    }
    
    $successRate = ($successCount / $steps.Count) * 100
    
    Write-Host ""
    Write-Host "Uspesnost: $successCount/$($steps.Count) ($($successRate.ToString('F1'))%)" -ForegroundColor White
    
    if ($successRate -eq 100) {
        Write-Host "SSL NASTAVITEV USPESNO DOKONCANA!" -ForegroundColor Green
        Write-Host "Vasa OMNI-BRAIN aplikacija je zdaj varna z HTTPS" -ForegroundColor Green
        Write-Host "Dostopna na: https://$Domain" -ForegroundColor Green
        Write-Host "Samodejno obnavljanje je aktivno" -ForegroundColor Green
        Write-Host "SSL nadzor je aktiven" -ForegroundColor Green
    } elseif ($successRate -ge 80) {
        Write-Host "SSL NASTAVITEV DELNO USPESNA" -ForegroundColor Yellow
        Write-Host "Nekateri koraki potrebujejo rocno posredovanje" -ForegroundColor Yellow
    } else {
        Write-Host "SSL NASTAVITEV NEUSPESNA" -ForegroundColor Red
        Write-Host "Potrebno je rocno odpravljanje tezav" -ForegroundColor Red
    }
    
    # Shrani rezultate
    $results = @{
        Domain = $Domain
        Email = $Email
        StartTime = $startTime
        EndTime = $endTime
        Duration = $duration.TotalMinutes
        SuccessRate = $successRate
        Results = $global:SetupResults
        TestMode = $TestMode
    }
    
    $results | ConvertTo-Json | Out-File -FilePath "ssl-setup-results.json" -Encoding UTF8
    Write-Host "Rezultati shranjeni v ssl-setup-results.json" -ForegroundColor Green
}

# Izvedi glavno nastavitev
Start-SSLMasterSetup