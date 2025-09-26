@echo off
title Omni License System - Docker Startup

echo 🚀 Zaganjam Omni License System...

REM Preveri ali je Docker nameščen
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker ni nameščen. Prosim namesti Docker Desktop.
    pause
    exit /b 1
)

REM Preveri ali je docker-compose nameščen
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ docker-compose ni nameščen. Prosim namesti docker-compose.
    pause
    exit /b 1
)

:menu
echo.
echo Izberi možnost:
echo 1) Osnovni setup (Server + MongoDB + Admin)
echo 2) Polni setup z Client Panel demo
echo 3) Samo MongoDB in Server
echo 4) Preveri status
echo 5) Ustavi vse storitve
echo 6) Rebuild in restart
echo 7) Prikaži loge
echo 8) Izhod
echo.

set /p choice="Vnesi izbiro (1-8): "

if "%choice%"=="1" goto basic_setup
if "%choice%"=="2" goto full_setup
if "%choice%"=="3" goto server_only
if "%choice%"=="4" goto status
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto rebuild
if "%choice%"=="7" goto logs
if "%choice%"=="8" goto exit
echo ❌ Neveljavna izbira. Prosim izberi 1-8.
goto menu

:basic_setup
echo 🔧 Zaganjam osnovni setup...
docker-compose up --build -d mongo server admin
echo ✅ Osnovni setup zagnan!
echo 📊 Admin GUI: http://localhost:4000
echo 🔌 API Server: http://localhost:3000
echo 🗄️ MongoDB: mongodb://localhost:27017
goto continue

:full_setup
echo 🔧 Zaganjam polni setup...
docker-compose --profile demo up --build -d
echo ✅ Polni setup zagnan!
echo 📊 Admin GUI: http://localhost:4000
echo 👤 Client Panel: http://localhost:5000
echo 🔌 API Server: http://localhost:3000
echo 🗄️ MongoDB: mongodb://localhost:27017
goto continue

:server_only
echo 🔧 Zaganjam samo MongoDB in Server...
docker-compose up --build -d mongo server
echo ✅ Server zagnan!
echo 🔌 API Server: http://localhost:3000
echo 🗄️ MongoDB: mongodb://localhost:27017
goto continue

:status
echo 📊 Status storitev:
docker-compose ps
goto continue

:stop
echo 🛑 Ustavljam vse storitve...
docker-compose down
echo ✅ Vse storitve ustavljene!
goto continue

:rebuild
echo 🔄 Rebuild in restart...
docker-compose down
docker-compose build --no-cache
docker-compose up -d
echo ✅ Rebuild dokončan!
goto continue

:logs
echo 📋 Izberi storitev za loge:
echo 1) server
echo 2) admin
echo 3) client
echo 4) mongo
echo 5) vse
set /p log_choice="Izbira: "

if "%log_choice%"=="1" docker-compose logs -f server
if "%log_choice%"=="2" docker-compose logs -f admin
if "%log_choice%"=="3" docker-compose logs -f client
if "%log_choice%"=="4" docker-compose logs -f mongo
if "%log_choice%"=="5" docker-compose logs -f
if not "%log_choice%"=="1" if not "%log_choice%"=="2" if not "%log_choice%"=="3" if not "%log_choice%"=="4" if not "%log_choice%"=="5" echo ❌ Neveljavna izbira
goto continue

:continue
echo.
pause
goto menu

:exit
echo 👋 Izhod...
exit /b 0