@echo off
echo ========================================
echo    OMNI DOCKER SYSTEM - WINDOWS START
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

echo 📋 Starting Omni Docker System...
echo.

REM Stop any existing containers
echo 🛑 Stopping existing containers...
docker-compose down --remove-orphans

echo.
echo 🏗️  Building and starting containers...
docker-compose up --build -d

echo.
echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo 🔍 Checking service status...
docker-compose ps

echo.
echo ========================================
echo    OMNI SYSTEM READY!
echo ========================================
echo.
echo 🌐 Services available at:
echo   📊 MongoDB:     localhost:27017
echo   🚀 Server:      http://localhost:3000
echo   🎛️  Admin GUI:   http://localhost:4000
echo   👤 Client Panel: http://localhost:8080
echo.
echo 📋 Useful commands:
echo   docker-compose logs -f          - View all logs
echo   docker-compose logs -f server   - View server logs
echo   docker-compose logs -f admin    - View admin logs
echo   docker-compose stop             - Stop all services
echo   docker-compose down             - Stop and remove containers
echo.
echo Press any key to view logs (Ctrl+C to exit)...
pause >nul

echo.
echo 📋 Showing live logs (Press Ctrl+C to exit):
docker-compose logs -f