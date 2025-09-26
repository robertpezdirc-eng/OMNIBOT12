@echo off
echo ========================================
echo Testing HTTPS Server with WebSocket
echo ========================================

echo.
echo Checking Node.js version...
node --version

echo.
echo Checking if port 3000 is available...
netstat -an | findstr :3000

echo.
echo Starting HTTPS server...
echo Press Ctrl+C to stop the server
echo.

node simple-https-server.js

pause