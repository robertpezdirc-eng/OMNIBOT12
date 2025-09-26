# SSL Setup Script for OMNI-BRAIN
# Avtomatska nastavitev SSL certifikata

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$false)]
    [string]$Email = "admin@$Domain"
)

Write-Host "🔐 OMNI-BRAIN SSL Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 1. Preveri pravilno usmerjanje domene
function Test-DomainConfiguration {
    param([string]$Domain)
    
    Write-Host "🌐 Preverjam domensko usmerjanje za: $Domain" -ForegroundColor Yellow
    
    # Preveri DNS resolucijo
    try {
        $dnsResult = Resolve-DnsName -Name $Domain -Type A -ErrorAction Stop
        $ipAddress = $dnsResult.IPAddress
        Write-Host "✅ DNS resolucija uspešna: $Domain -> $ipAddress" -ForegroundColor Green
        
        # Preveri lokalni IP
        $localIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object -ExpandProperty IPAddress
        
        if ($ipAddress -in $localIPs) {
            Write-Host "✅ Domena kaže na ta strežnik" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️ Domena ne kaže na ta strežnik. Lokalni IP-ji: $($localIPs -join ', ')" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "❌ Napaka pri DNS resoluciji: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 2. Preveri odprtost portov
function Test-Ports {
    Write-Host "🔌 Preverjam odprtost portov 80 in 443..." -ForegroundColor Yellow
    
    $ports = @(80, 443)
    $results = @{}
    
    foreach ($port in $ports) {
        try {
            $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
            if ($listener) {
                Write-Host "✅ Port $port je odprt in posluša" -ForegroundColor Green
                $results[$port] = $true
            } else {
                Write-Host "⚠️ Port $port ni v uporabi" -ForegroundColor Yellow
                $results[$port] = $false
            }
        }
        catch {
            Write-Host "❌ Napaka pri preverjanju porta $port" -ForegroundColor Red
            $results[$port] = $false
        }
    }
    
    return $results
}

# 3. Preveri firewall pravila
function Test-FirewallRules {
    Write-Host "🛡️ Preverjam firewall pravila..." -ForegroundColor Yellow
    
    $httpRule = Get-NetFirewallRule -DisplayName "*HTTP*" -Enabled True -ErrorAction SilentlyContinue
    $httpsRule = Get-NetFirewallRule -DisplayName "*HTTPS*" -Enabled True -ErrorAction SilentlyContinue
    
    if ($httpRule) {
        Write-Host "✅ HTTP firewall pravilo je omogočeno" -ForegroundColor Green
    } else {
        Write-Host "⚠️ HTTP firewall pravilo ni najdeno" -ForegroundColor Yellow
    }
    
    if ($httpsRule) {
        Write-Host "✅ HTTPS firewall pravilo je omogočeno" -ForegroundColor Green
    } else {
        Write-Host "⚠️ HTTPS firewall pravilo ni najdeno" -ForegroundColor Yellow
    }
}

# 4. Preveri trenutno SSL konfiguracijo
function Test-CurrentSSL {
    param([string]$Domain)
    
    Write-Host "🔍 Preverjam trenutno SSL konfiguracijo..." -ForegroundColor Yellow
    
    try {
        $uri = "https://$Domain"
        $response = Invoke-WebRequest -Uri $uri -Method Head -TimeoutSec 10 -ErrorAction Stop
        Write-Host "✅ HTTPS že deluje na domeni $Domain" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "⚠️ HTTPS trenutno ne deluje: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# Glavna funkcija
function Start-DomainCheck {
    param([string]$Domain)
    
    Write-Host "🚀 Začenjam preverjanje konfiguracije za domeno: $Domain" -ForegroundColor Cyan
    
    $results = @{
        DNS = Test-DomainConfiguration -Domain $Domain
        Ports = Test-Ports
        SSL = Test-CurrentSSL -Domain $Domain
    }
    
    Test-FirewallRules
    
    # Povzetek rezultatov
    Write-Host "`n📊 Povzetek preverjanja:" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    
    if ($results.DNS) {
        Write-Host "✅ DNS usmerjanje: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ DNS usmerjanje: NAPAKA" -ForegroundColor Red
    }
    
    if ($results.Ports[80]) {
        Write-Host "✅ Port 80 (HTTP): OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Port 80 (HTTP): NAPAKA" -ForegroundColor Red
    }
    
    if ($results.Ports[443]) {
        Write-Host "✅ Port 443 (HTTPS): OK" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Port 443 (HTTPS): Ni aktiven (pričakovano pred SSL)" -ForegroundColor Yellow
    }
    
    if ($results.SSL) {
        Write-Host "✅ SSL certifikat: Že nameščen" -ForegroundColor Green
    } else {
        Write-Host "⚠️ SSL certifikat: Ni nameščen" -ForegroundColor Yellow
    }
    
    return $results
}

# Izvedi preverjanje
if ($Domain) {
    $checkResults = Start-DomainCheck -Domain $Domain
    
    # Shrani rezultate za nadaljnjo uporabo
    $checkResults | ConvertTo-Json | Out-File -FilePath "ssl-check-results.json" -Encoding UTF8
    Write-Host "`n💾 Rezultati shranjeni v ssl-check-results.json" -ForegroundColor Green
} else {
    Write-Host "❌ Prosim, podajte domeno z parametrom -Domain" -ForegroundColor Red
    Write-Host "Primer: .\ssl-setup.ps1 -Domain 'example.com'" -ForegroundColor Yellow
}