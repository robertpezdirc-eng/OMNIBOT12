# SSL Quick Test Script
# Hitro testiranje SSL konfiguracije

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$false)]
    [switch]$VerboseOutput
)

Write-Host "SSL HITRI TEST" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Domena: $Domain" -ForegroundColor White

$testResults = @{
    DNSResolution = $false
    Port80Open = $false
    Port443Open = $false
    HTTPSResponse = $false
    CertificateValid = $false
    CertificateExpiry = $null
    RedirectWorking = $false
    SuccessRate = 0
    TestDate = $null
}

# Test 1: DNS resolucija
Write-Host "`nTest 1: DNS resolucija" -ForegroundColor Yellow
try {
    $dnsResult = Resolve-DnsName -Name $Domain -ErrorAction Stop
    if ($dnsResult) {
        Write-Host "DNS resolucija uspesna" -ForegroundColor Green
        if ($VerboseOutput) {
            Write-Host "   IP: $($dnsResult[0].IPAddress)" -ForegroundColor Gray
        }
        $testResults.DNSResolution = $true
    }
}
catch {
    Write-Host "DNS resolucija neuspesna: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Port 80 (HTTP)
Write-Host "`nTest 2: Port 80 (HTTP)" -ForegroundColor Yellow
try {
    $port80 = Test-NetConnection -ComputerName $Domain -Port 80 -WarningAction SilentlyContinue
    if ($port80.TcpTestSucceeded) {
        Write-Host "Port 80 je odprt" -ForegroundColor Green
        $testResults.Port80Open = $true
    } else {
        Write-Host "Port 80 ni dostopen" -ForegroundColor Red
    }
}
catch {
    Write-Host "Napaka pri testiranju porta 80: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Port 443 (HTTPS)
Write-Host "`nTest 3: Port 443 (HTTPS)" -ForegroundColor Yellow
try {
    $port443 = Test-NetConnection -ComputerName $Domain -Port 443 -WarningAction SilentlyContinue
    if ($port443.TcpTestSucceeded) {
        Write-Host "Port 443 je odprt" -ForegroundColor Green
        $testResults.Port443Open = $true
    } else {
        Write-Host "Port 443 ni dostopen" -ForegroundColor Red
    }
}
catch {
    Write-Host "Napaka pri testiranju porta 443: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: HTTPS odziv
Write-Host "`nTest 4: HTTPS odziv" -ForegroundColor Yellow
try {
    $httpsUrl = "https://$Domain"
    $response = Invoke-WebRequest -Uri $httpsUrl -Method HEAD -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "HTTPS odziv uspesen (Status: $($response.StatusCode))" -ForegroundColor Green
        $testResults.HTTPSResponse = $true
    }
}
catch {
    Write-Host "HTTPS odziv neuspesen: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: SSL certifikat
Write-Host "`nTest 5: SSL certifikat" -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($Domain, 443)
    $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream())
    $sslStream.AuthenticateAsClient($Domain)
    
    $cert = $sslStream.RemoteCertificate
    if ($cert) {
        $cert2 = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($cert)
        $expiryDate = $cert2.NotAfter
        $daysUntilExpiry = ($expiryDate - (Get-Date)).Days
        
        Write-Host "SSL certifikat je veljaven" -ForegroundColor Green
        Write-Host "   Izdajatelj: $($cert2.Issuer)" -ForegroundColor Gray
        Write-Host "   Velja do: $($expiryDate.ToString('dd.MM.yyyy HH:mm'))" -ForegroundColor Gray
        Write-Host "   Dni do poteka: $daysUntilExpiry" -ForegroundColor Gray
        
        $testResults.CertificateValid = $true
        $testResults.CertificateExpiry = $expiryDate
        
        if ($daysUntilExpiry -lt 30) {
            Write-Host "Certifikat potece v manj kot 30 dneh!" -ForegroundColor Yellow
        }
    }
    
    $sslStream.Close()
    $tcpClient.Close()
}
catch {
    Write-Host "SSL certifikat ni veljaven: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: HTTP -> HTTPS preusmeritev
Write-Host "`nTest 6: HTTP -> HTTPS preusmeritev" -ForegroundColor Yellow
try {
    $httpUrl = "http://$Domain"
    $response = Invoke-WebRequest -Uri $httpUrl -MaximumRedirection 0 -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 301 -or $response.StatusCode -eq 302) {
        $location = $response.Headers.Location
        if ($location -and $location.StartsWith("https://")) {
            Write-Host "HTTP -> HTTPS preusmeritev deluje" -ForegroundColor Green
            if ($VerboseOutput) {
                Write-Host "   Preusmeritev na: $location" -ForegroundColor Gray
            }
            $testResults.RedirectWorking = $true
        } else {
            Write-Host "Preusmeritev ne kaze na HTTPS" -ForegroundColor Red
        }
    } else {
        Write-Host "HTTP preusmeritev ni nastavljena" -ForegroundColor Red
    }
}
catch {
    Write-Host "Napaka pri testiranju preusmeritve: $($_.Exception.Message)" -ForegroundColor Red
}

# Povzetek rezultatov
Write-Host "`nPOVZETEK TESTOV" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

$tests = @(
    @{ Name = "DNS resolucija"; Result = $testResults.DNSResolution },
    @{ Name = "Port 80 HTTP"; Result = $testResults.Port80Open },
    @{ Name = "Port 443 HTTPS"; Result = $testResults.Port443Open },
    @{ Name = "HTTPS odziv"; Result = $testResults.HTTPSResponse },
    @{ Name = "SSL certifikat"; Result = $testResults.CertificateValid },
    @{ Name = "HTTP preusmeritev"; Result = $testResults.RedirectWorking }
)

$passedTests = 0
foreach ($test in $tests) {
    if ($test.Result) {
        Write-Host "OK $($test.Name)" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "NAPAKA $($test.Name)" -ForegroundColor Red
    }
}

$successRate = ($passedTests / $tests.Count) * 100
Write-Host ""
Write-Host "Uspesnost: $passedTests/$($tests.Count) ($($successRate.ToString('F1'))%)" -ForegroundColor White

if ($successRate -eq 100) {
    Write-Host "VSI TESTI USPESNI - SSL je pravilno nastavljen!" -ForegroundColor Green
    $exitCode = 0
} elseif ($successRate -ge 80) {
    Write-Host "VECINA TESTOV USPESNIH - potrebne manjse prilagoditve" -ForegroundColor Yellow
    $exitCode = 1
} else {
    Write-Host "VECINA TESTOV NEUSPESNIH - potrebna ponovna nastavitev" -ForegroundColor Red
    $exitCode = 2
}

# Shrani rezultate
$testResults.SuccessRate = $successRate
$testResults.TestDate = Get-Date
$testResults | ConvertTo-Json | Out-File -FilePath "ssl-test-results.json" -Encoding UTF8

Write-Host "Rezultati shranjeni v ssl-test-results.json" -ForegroundColor Green

exit $exitCode