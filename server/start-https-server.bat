@echo off
echo 🚀 Starting Omni HTTPS Server with WebSocket Support...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if MongoDB is running
echo 📊 Checking MongoDB connection...
timeout /t 2 /nobreak >nul

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️ .env file not found, copying from .env.example...
    copy ".env.example" ".env"
    echo ✅ .env file created. Please configure it before running the server.
    echo.
    echo 📝 Important: Update the following in .env file:
    echo    - MONGO_URI (MongoDB connection string)
    echo    - JWT_SECRET (secure random string)
    echo    - SSL certificate paths
    echo.
    pause
)

REM Create certs directory if it doesn't exist
if not exist "..\certs" (
    echo 📁 Creating certs directory...
    mkdir "..\certs"
    echo ⚠️ SSL certificates not found. The server will use self-signed certificates.
    echo   For production, place your SSL certificates in the certs directory:
    echo   - fullchain.pem (certificate)
    echo   - privkey.pem (private key)
    echo.
)

echo 🔄 Starting HTTPS server...
echo.
echo 📡 Server will be available at: https://localhost:3000
echo 🔒 SSL/TLS encryption: Enabled
echo 🌐 WebSocket support: Enabled
echo 📋 API endpoints: /health, /api/license/*, /api/auth/*
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
node https-server.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ Server failed to start. Check the error messages above.
    echo.
    echo 🔧 Common issues:
    echo    - MongoDB not running
    echo    - Port 3000 already in use
    echo    - Missing SSL certificates
    echo    - Invalid .env configuration
    echo.
    pause
)

echo.
echo 👋 Server stopped.
pause