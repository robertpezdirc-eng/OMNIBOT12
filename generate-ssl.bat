@echo off
echo ========================================
echo    OMNI SSL CERTIFIKAT GENERATOR
echo ========================================
echo.

REM Preveri, če obstaja certs direktorij
if not exist "certs" (
    echo Ustvarjam certs direktorij...
    mkdir certs
)

cd certs

echo Preverjam OpenSSL...
openssl version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo NAPAKA: OpenSSL ni nameščen!
    echo.
    echo Možnosti za namestitev:
    echo 1. Chocolatey: choco install openssl
    echo 2. Git Bash: Vključen z Git for Windows
    echo 3. WSL: wsl --install
    echo 4. Prenesi z: https://slproweb.com/products/Win32OpenSSL.html
    echo.
    pause
    exit /b 1
)

echo OpenSSL najden. Generiranje certifikatov...
echo.

REM Generiraj privatni ključ
echo Generiranje privatnega ključa...
openssl genrsa -out private-key.pem 2048

if %errorlevel% neq 0 (
    echo NAPAKA pri generiranju privatnega ključa!
    pause
    exit /b 1
)

REM Generiraj certifikat
echo Generiranje samopodpisanega certifikata...
openssl req -new -x509 -key private-key.pem -out certificate.pem -days 365 -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=Omni/CN=localhost"

if %errorlevel% neq 0 (
    echo NAPAKA pri generiranju certifikata!
    pause
    exit /b 1
)

echo.
echo ========================================
echo    CERTIFIKATI USPEŠNO GENERIRANI!
echo ========================================
echo.
echo Datoteki:
echo - private-key.pem (privatni ključ)
echo - certificate.pem (javni certifikat)
echo.
echo Lokacija: %cd%
echo.
echo Naslednji koraki:
echo 1. Posodobi mobile_backend.js za HTTPS
echo 2. Zaženi Omni z HTTPS podporo
echo 3. Obišči https://localhost:3001
echo.
echo OPOZORILO: Samopodpisani certifikat!
echo Brskalnik bo prikazal varnostno opozorilo.
echo Za produkcijo uporabi Let's Encrypt ali komercialni certifikat.
echo.

REM Prikaži vsebino certifikata
echo Informacije o certifikatu:
openssl x509 -in certificate.pem -text -noout | findstr "Subject:"
openssl x509 -in certificate.pem -text -noout | findstr "Not After:"

echo.
echo Želiš posodobiti mobile_backend.js za HTTPS? (y/n)
set /p choice=

if /i "%choice%"=="y" (
    echo.
    echo Ustvarjam HTTPS različico mobile_backend.js...
    cd ..
    
    REM Ustvari backup
    if exist "omni\ui\mobile\mobile_backend.js" (
        copy "omni\ui\mobile\mobile_backend.js" "omni\ui\mobile\mobile_backend_http.js" >nul
        echo Backup ustvarjen: mobile_backend_http.js
    )
    
    echo.
    echo HTTPS konfiguracija je pripravljena!
    echo Zaženi: node omni/ui/mobile/mobile_backend.js
    echo Obišči: https://localhost:3001
)

echo.
pause