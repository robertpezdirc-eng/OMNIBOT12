# SSL Certbot Installation Script for Windows
# Avtomatska namestitev Let's Encrypt certifikata

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [string]$WebRoot = "C:\Users\admin\Downloads\copy-of-copy-of-omniscient-ai-platform\public"
)

Write-Host "🔐 OMNI-BRAIN SSL Certbot Installation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 1. Preveri ali je Certbot nameščen
function Test-CertbotInstallation {
    Write-Host "🔍 Preverjam namestitev Certbot..." -ForegroundColor Yellow
    
    try {
        $certbotVersion = & certbot --version 2>$null
        if ($certbotVersion) {
            Write-Host "✅ Certbot je že nameščen: $certbotVersion" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "⚠️ Certbot ni nameščen" -ForegroundColor Yellow
        return $false
    }
}

# 2. Namesti Certbot
function Install-Certbot {
    Write-Host "📦 Nameščam Certbot..." -ForegroundColor Yellow
    
    # Preveri ali je Chocolatey nameščen
    try {
        $chocoVersion = & choco --version 2>$null
        if (-not $chocoVersion) {
            Write-Host "📦 Nameščam Chocolatey..." -ForegroundColor Yellow
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        }
        
        # Namesti Certbot preko Chocolatey
        Write-Host "📦 Nameščam Certbot preko Chocolatey..." -ForegroundColor Yellow
        & choco install certbot -y
        
        # Osvezi PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "✅ Certbot uspešno nameščen" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Napaka pri namestitvi Certbot: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 3. Ustvari webroot direktorij
function New-WebrootDirectory {
    param([string]$WebRoot)
    
    Write-Host "📁 Ustvarjam webroot direktorij: $WebRoot" -ForegroundColor Yellow
    
    if (-not (Test-Path $WebRoot)) {
        New-Item -ItemType Directory -Path $WebRoot -Force | Out-Null
        Write-Host "✅ Webroot direktorij ustvarjen" -ForegroundColor Green
    } else {
        Write-Host "✅ Webroot direktorij že obstaja" -ForegroundColor Green
    }
    
    # Ustvari .well-known/acme-challenge direktorij
    $acmeDir = Join-Path $WebRoot ".well-known\acme-challenge"
    if (-not (Test-Path $acmeDir)) {
        New-Item -ItemType Directory -Path $acmeDir -Force | Out-Null
        Write-Host "✅ ACME challenge direktorij ustvarjen" -ForegroundColor Green
    }
}

# 4. Generiraj SSL certifikat
function New-SSLCertificate {
    param(
        [string]$Domain,
        [string]$Email,
        [string]$WebRoot
    )
    
    Write-Host "🔐 Generiram SSL certifikat za domeno: $Domain" -ForegroundColor Yellow
    
    try {
        # Webroot način za validacijo
        $certbotArgs = @(
            "certonly",
            "--webroot",
            "-w", $WebRoot,
            "-d", $Domain,
            "--email", $Email,
            "--agree-tos",
            "--non-interactive",
            "--expand"
        )
        
        Write-Host "🚀 Izvajam: certbot $($certbotArgs -join ' ')" -ForegroundColor Cyan
        
        $result = & certbot @certbotArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ SSL certifikat uspešno generiran!" -ForegroundColor Green
            
            # Preveri lokacijo certifikata
            $certPath = "C:\Certbot\live\$Domain"
            if (Test-Path $certPath) {
                Write-Host "📍 Certifikat shranjen v: $certPath" -ForegroundColor Green
                return $certPath
            }
        } else {
            Write-Host "❌ Napaka pri generiranju certifikata" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "❌ Napaka pri izvajanju Certbot: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# 5. Konfiguriraj HTTPS strežnik
function Set-HTTPSConfiguration {
    param(
        [string]$Domain,
        [string]$CertPath
    )
    
    Write-Host "⚙️ Konfiguriram HTTPS strežnik..." -ForegroundColor Yellow
    
    # Ustvari HTTPS konfiguracijsko datoteko
    $httpsConfig = @"
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

// SSL certifikat poti
const certPath = '$CertPath';
const options = {
    key: fs.readFileSync(path.join(certPath, 'privkey.pem')),
    cert: fs.readFileSync(path.join(certPath, 'fullchain.pem'))
};

// Express aplikacija
const app = express();

// Statične datoteke
app.use(express.static('public'));
app.use('/admin', express.static('admin'));

// API rute
app.use('/api', require('./apiRoutes'));

// Preusmeritev HTTP na HTTPS
const http = require('http');
const httpApp = express();
httpApp.use((req, res) => {
    res.redirect(301, 'https://' + req.headers.host + req.url);
});

// Zaženi strežnike
const httpsServer = https.createServer(options, app);
const httpServer = http.createServer(httpApp);

httpsServer.listen(443, () => {
    console.log('✅ HTTPS strežnik teče na portu 443');
});

httpServer.listen(80, () => {
    console.log('✅ HTTP preusmeritev teče na portu 80');
});

module.exports = { httpsServer, httpServer };
"@

    $httpsConfigPath = "https-server.js"
    $httpsConfig | Out-File -FilePath $httpsConfigPath -Encoding UTF8
    
    Write-Host "✅ HTTPS konfiguracija shranjena v: $httpsConfigPath" -ForegroundColor Green
}

# Glavna funkcija
function Start-CertbotInstallation {
    param(
        [string]$Domain,
        [string]$Email,
        [string]$WebRoot
    )
    
    Write-Host "🚀 Začenjam namestitev SSL certifikata za: $Domain" -ForegroundColor Cyan
    
    # 1. Preveri Certbot
    if (-not (Test-CertbotInstallation)) {
        if (-not (Install-Certbot)) {
            Write-Host "❌ Namestitev Certbot neuspešna" -ForegroundColor Red
            return $false
        }
    }
    
    # 2. Pripravi webroot
    New-WebrootDirectory -WebRoot $WebRoot
    
    # 3. Generiraj certifikat
    $certPath = New-SSLCertificate -Domain $Domain -Email $Email -WebRoot $WebRoot
    
    if ($certPath) {
        # 4. Konfiguriraj HTTPS
        Set-HTTPSConfiguration -Domain $Domain -CertPath $certPath
        
        Write-Host "`n🎉 SSL certifikat uspešno nameščen!" -ForegroundColor Green
        Write-Host "📍 Certifikat: $certPath" -ForegroundColor Green
        Write-Host "🌐 Domena: https://$Domain" -ForegroundColor Green
        
        return $true
    } else {
        Write-Host "❌ Namestitev SSL certifikata neuspešna" -ForegroundColor Red
        return $false
    }
}

# Izvedi namestitev
if ($Domain -and $Email) {
    $installResult = Start-CertbotInstallation -Domain $Domain -Email $Email -WebRoot $WebRoot
    
    if ($installResult) {
        Write-Host "`n✅ SSL namestitev dokončana!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ SSL namestitev neuspešna!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Prosim, podajte domeno in email" -ForegroundColor Red
    Write-Host "Primer: .\ssl-certbot-install.ps1 -Domain 'example.com' -Email 'admin@example.com'" -ForegroundColor Yellow
}