@echo off
echo ========================================
echo    OMNI DOCKER SYSTEM - WINDOWS STOP
echo ========================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running or not installed!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo ✅ Docker is running
echo.

REM Check if docker-compose.yml exists
if not exist "docker-compose.yml" (
    echo ❌ docker-compose.yml not found!
    echo Please make sure you're in the correct directory.
    pause
    exit /b 1
)

echo 🛑 Stopping Omni Docker System...
echo.

REM Stop and remove containers
echo 📋 Stopping containers...
docker-compose stop

echo.
echo 🗑️  Removing containers...
docker-compose down --remove-orphans

echo.
echo 🔍 Checking remaining containers...
docker-compose ps

echo.
echo ========================================
echo    OMNI SYSTEM STOPPED!
echo ========================================
echo.
echo 📋 System has been stopped successfully.
echo.
echo 🔄 To start again, run: docker-start.bat
echo 🧹 To clean up volumes, run: docker-compose down -v
echo 📊 To remove images, run: docker-compose down --rmi all
echo.
pause