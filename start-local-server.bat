@echo off
REM Omni Local Server Starter for Windows
REM Enostavno zaganjanje lokalnega HTTP strežnika za prenos datotek

echo.
echo ========================================
echo    🌟 Omni Local File Server 🌟
echo ========================================
echo.

REM Preveri ali Python obstaja
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python ni nameščen ali ni v PATH!
    echo Namesti Python iz https://python.org
    pause
    exit /b 1
)

REM Preveri ali smo v pravilnem direktoriju
if not exist "main.py" (
    if not exist "omni.py" (
        if not exist "package.json" (
            echo ❌ Nisi v Omni direktoriju!
            echo Premakni se v direktorij z Omni datotekami.
            pause
            exit /b 1
        )
    )
)

echo ✅ Python je nameščen
echo ✅ Omni datoteke najdene
echo.

REM Pridobi lokalni IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "ip=%%a"
    goto :found_ip
)
:found_ip
set "ip=%ip: =%"

echo 📍 Lokalni IP: %ip%
echo 🌐 Strežnik bo dostopen na: http://%ip%:3000
echo.

REM Zaženi Python strežnik
echo 🚀 Zaganjam lokalni strežnik...
echo.
echo ⚠️  POMEMBNO: Pusti to okno odprto dokler ne zaključiš migracije!
echo.
echo 📋 NAVODILA ZA OBLAČNI STREŽNIK:
echo ================================
echo 1. SSH na oblačni strežnik:
echo    ssh root@[JAVNI_IP_STREŽNIKA]
echo.
echo 2. Prenesi in zaženi migracijsko skripto:
echo    wget http://%ip%:3000/omni-cloud-auto-full.sh
echo    chmod +x omni-cloud-auto-full.sh
echo    sudo ./omni-cloud-auto-full.sh [DOMENA] [EMAIL] local %ip%
echo.
echo 3. Primer:
echo    sudo ./omni-cloud-auto-full.sh moja-domena.com admin@example.com local %ip%
echo.
echo ================================
echo Pritisnite Ctrl+C za ustavitev
echo ================================
echo.

python local-server-setup.py

echo.
echo 👋 Strežnik ustavljen. Pritisnite katerokoli tipko za izhod.
pause >nul