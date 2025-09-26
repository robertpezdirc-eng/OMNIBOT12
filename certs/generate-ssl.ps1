# 🔹 Omni Ultimate Turbo Flow System - SSL Certificate Generator (Windows)
# PowerShell skripta za generiranje self-signed SSL certifikatov

Write-Host "🔒 Generiranje SSL certifikatov za Omni Ultimate Turbo Flow System..." -ForegroundColor Green

try {
    # Preveri, če je OpenSSL na voljo
    $openssl = Get-Command openssl -ErrorAction SilentlyContinue
    
    if ($openssl) {
        Write-Host "✅ OpenSSL najden, uporabljam OpenSSL..." -ForegroundColor Green
        
        # Generiraj certifikat z OpenSSL
        & openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=Omni Ultimate/OU=IT Department/CN=localhost"
        
        Write-Host "✅ SSL certifikati uspešno generirani z OpenSSL!" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  OpenSSL ni najden, uporabljam PowerShell New-SelfSignedCertificate..." -ForegroundColor Yellow
        
        # Generiraj certifikat s PowerShell
        $cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1" -CertStoreLocation "cert:\LocalMachine\My" -KeyAlgorithm RSA -KeyLength 2048 -Provider "Microsoft RSA SChannel Cryptographic Provider" -KeyExportPolicy Exportable -KeyUsage DigitalSignature, KeyEncipherment -Type SSLServerAuthentication -ValidityPeriod Days -ValidityPeriodUnits 365
        
        # Izvozi certifikat
        $certPath = "cert:\LocalMachine\My\$($cert.Thumbprint)"
        Export-Certificate -Cert $certPath -FilePath "cert.pem" -Type CERT
        
        # Izvozi privatni ključ (potrebuje geslo)
        $mypwd = ConvertTo-SecureString -String "omni2024" -Force -AsPlainText
        Export-PfxCertificate -Cert $certPath -FilePath "cert.pfx" -Password $mypwd
        
        Write-Host "✅ SSL certifikati uspešno generirani s PowerShell!" -ForegroundColor Green
        Write-Host "   - cert.pem (javni certifikat)" -ForegroundColor Cyan
        Write-Host "   - cert.pfx (privatni ključ z geslom: omni2024)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "⚠️  OPOZORILO: To so self-signed certifikati za development!" -ForegroundColor Yellow
    Write-Host "   Za produkcijo uporabi certifikate od priznane CA (Let's Encrypt, itd.)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔧 Za uporabo v Docker:" -ForegroundColor Cyan
    Write-Host "   - Certifikati so že nastavljeni v docker-compose.yml" -ForegroundColor White
    Write-Host "   - Nastavi SSL_ENABLED=true v .env datoteki" -ForegroundColor White
}
catch {
    Write-Host "❌ Napaka pri generiranju certifikatov: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Poskusi namestiti OpenSSL ali zaženi PowerShell kot Administrator" -ForegroundColor Yellow
}