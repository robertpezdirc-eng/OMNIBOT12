@echo off
echo Starting Omni Supermozg...
cd /d "%~dp0"

echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)

echo Starting Omni Brain Core...
start "Omni Brain" python omni_brain_core.py

timeout /t 3 /nobreak > nul

echo Starting Cloud Memory...
start "Cloud Memory" python omni_cloud_memory.py

timeout /t 2 /nobreak > nul

echo Starting Mobile Terminal...
start "Mobile Terminal" python omni_mobile_terminal.py

timeout /t 2 /nobreak > nul

echo Starting Learning Optimization...
start "Learning" python omni_learning_optimization.py

echo Omni Supermozg started successfully!
echo Check the individual windows for status.
pause
