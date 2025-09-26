@echo off
echo ========================================
echo    OMNI - Ngrok Setup Script
echo ========================================
echo.

echo Preverjam ngrok...
where ngrok >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Ngrok je že nameščen!
    ngrok version
    echo.
    goto :start_tunnel
) else (
    echo ❌ Ngrok ni nameščen.
    echo.
)

echo Možnosti:
echo 1. Prenesi ngrok ročno z https://ngrok.com/download
echo 2. Namesti z Chocolatey (choco install ngrok)
echo 3. Namesti z Scoop (scoop install ngrok)
echo.

set /p choice="Izberi možnost (1-3) ali pritisni Enter za nadaljevanje: "

if "%choice%"=="2" (
    echo Nameščam z Chocolatey...
    choco install ngrok -y
    if %errorlevel% == 0 (
        echo ✅ Ngrok uspešno nameščen!
    ) else (
        echo ❌ Napaka pri namestitvi. Poskusi ročno.
        pause
        exit /b 1
    )
)

if "%choice%"=="3" (
    echo Nameščam s Scoop...
    scoop install ngrok
    if %errorlevel% == 0 (
        echo ✅ Ngrok uspešno nameščen!
    ) else (
        echo ❌ Napaka pri namestitvi. Poskusi ročno.
        pause
        exit /b 1
    )
)

:start_tunnel
echo.
echo ========================================
echo    Zaganjam Ngrok tunel...
echo ========================================
echo.

echo Preverjam, ali Omni backend deluje na portu 3001...
netstat -an | find "3001" >nul
if %errorlevel% == 0 (
    echo ✅ Omni backend deluje na portu 3001
) else (
    echo ⚠️  Omni backend ne deluje na portu 3001
    echo    Zaženi najprej: node omni/ui/mobile/mobile_backend.js
    echo.
    set /p continue="Želiš vseeno nadaljevati? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo 🚀 Zaganjam ngrok tunel...
echo    Javna povezava bo prikazana spodaj.
echo    Za ustavitev pritisni Ctrl+C
echo.
echo ========================================

ngrok http 3001

echo.
echo Ngrok tunel ustavljen.
pause