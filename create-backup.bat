@echo off
REM ###############################################################################
REM OMNIBOT12 Projekt Varnostna Kopija / Project Backup Script (Windows)
REM 
REM Ta skripta ustvari popolno varnostno kopijo projekta pred arhiviranjem.
REM This script creates a complete backup of the project before archiving.
REM ###############################################################################

setlocal enabledelayedexpansion

REM Barve niso na voljo v cmd, uporabljamo emoji in oznake
REM Colors not available in cmd, using emoji and markers

REM Datum za backup / Date for backup
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set BACKUP_DATE=%mydate%_%mytime%
set BACKUP_DIR=omnibot12-backup-%BACKUP_DATE%

echo ========================================
echo OMNIBOT12 Varnostna Kopija / Backup
echo ========================================
echo Datum / Date: %date% %time%
echo Direktorij / Directory: %BACKUP_DIR%
echo.

REM Ustvari backup direktorij / Create backup directory
mkdir "%BACKUP_DIR%" 2>nul
echo [OK] Ustvarjen backup direktorij / Created backup directory

REM 1. Git repozitorij / Git repository
echo.
echo ========================================
echo 1. Git Repozitorij / Git Repository
echo ========================================

if exist ".git" (
    git bundle create "%BACKUP_DIR%\omnibot12-repo.bundle" --all
    echo [OK] Git repozitorij shranjen / Git repository saved
    
    git archive -o "%BACKUP_DIR%\omnibot12-current-state.zip" HEAD
    echo [OK] Trenutno stanje shranjeno / Current state saved
    
    git log --all --oneline --graph --decorate > "%BACKUP_DIR%\git-log.txt"
    echo [OK] Git zgodovina shranjena / Git history saved
) else (
    echo [WARNING] Git repozitorij ni najden / Git repository not found
)

REM 2. Konfiguracijske datoteke / Configuration files
echo.
echo ========================================
echo 2. Konfiguracija / Configuration
echo ========================================

mkdir "%BACKUP_DIR%\config" 2>nul

REM Kopiraj konfiguracijske datoteke / Copy configuration files
if exist ".env.example" copy ".env.example" "%BACKUP_DIR%\config\" >nul 2>&1
if exist ".env.docker" copy ".env.docker" "%BACKUP_DIR%\config\" >nul 2>&1
if exist ".env.production" copy ".env.production" "%BACKUP_DIR%\config\" >nul 2>&1

REM Kopiraj JSON in YAML datoteke / Copy JSON and YAML files
for %%f in (*.json) do (
    if not "%%f"=="package-lock.json" (
        if not "%%~nf"=="test-" (
            copy "%%f" "%BACKUP_DIR%\config\" >nul 2>&1
        )
    )
)

for %%f in (*.yml *.yaml) do copy "%%f" "%BACKUP_DIR%\config\" >nul 2>&1

echo [OK] Konfiguracijske datoteke kopirane / Configuration files copied

REM 3. SQLite baze / SQLite databases
echo.
echo ========================================
echo 3. SQLite Baze / SQLite Databases
echo ========================================

mkdir "%BACKUP_DIR%\sqlite" 2>nul

set DB_COUNT=0
for %%f in (*.db) do (
    copy "%%f" "%BACKUP_DIR%\sqlite\" >nul 2>&1
    set /a DB_COUNT+=1
    echo [OK] Kopirana: %%f / Copied: %%f
)

if %DB_COUNT%==0 (
    echo [WARNING] Ni najdenih SQLite baz / No SQLite databases found
) else (
    echo [OK] Kopirano %DB_COUNT% SQLite baz / Copied %DB_COUNT% SQLite databases
)

REM 4. MongoDB izvoz / MongoDB export
echo.
echo ========================================
echo 4. MongoDB Izvoz / MongoDB Export
echo ========================================

mkdir "%BACKUP_DIR%\mongodb" 2>nul

where mongodump >nul 2>&1
if %errorlevel%==0 (
    for %%d in (omni_analytics omni_multitenant devops finance tourism) do (
        mongodump --db %%d --out "%BACKUP_DIR%\mongodb" >nul 2>&1
        if !errorlevel!==0 (
            echo [OK] MongoDB baza izvožena: %%d / MongoDB database exported: %%d
        ) else (
            echo [WARNING] Ne morem izvoziti MongoDB baze: %%d / Cannot export MongoDB database: %%d
        )
    )
) else (
    echo [WARNING] mongodump ni nameščen / mongodump not installed
    echo [INFO] Če želite izvoziti MongoDB, namestite MongoDB Database Tools
    echo [INFO] If you want to export MongoDB, install MongoDB Database Tools
)

REM 5. Dokumentacija / Documentation
echo.
echo ========================================
echo 5. Dokumentacija / Documentation
echo ========================================

mkdir "%BACKUP_DIR%\docs" 2>nul

for %%f in (*.md) do copy "%%f" "%BACKUP_DIR%\docs\" >nul 2>&1

if exist "docs" xcopy "docs" "%BACKUP_DIR%\docs\" /E /I /Q >nul 2>&1

echo [OK] Dokumentacija kopirana / Documentation copied

REM 6. Package informacije / Package information
echo.
echo ========================================
echo 6. Odvisnosti / Dependencies
echo ========================================

mkdir "%BACKUP_DIR%\dependencies" 2>nul

if exist "package.json" (
    copy "package.json" "%BACKUP_DIR%\dependencies\" >nul 2>&1
    if exist "package-lock.json" copy "package-lock.json" "%BACKUP_DIR%\dependencies\" >nul 2>&1
    
    where npm >nul 2>&1
    if !errorlevel!==0 (
        npm list --depth=0 > "%BACKUP_DIR%\dependencies\npm-list.txt" 2>&1
    )
    echo [OK] Node.js odvisnosti shranjene / Node.js dependencies saved
)

if exist "requirements.txt" (
    copy "requirements.txt" "%BACKUP_DIR%\dependencies\" >nul 2>&1
    
    where pip >nul 2>&1
    if !errorlevel!==0 (
        pip list > "%BACKUP_DIR%\dependencies\pip-list.txt" 2>&1
    )
    echo [OK] Python odvisnosti shranjene / Python dependencies saved
)

REM 7. Sistemske informacije / System information
echo.
echo ========================================
echo 7. Sistemske Info / System Info
echo ========================================

(
    echo === Sistemske Informacije / System Information ===
    echo Datum varnostne kopije / Backup Date: %date% %time%
    echo OS: Windows
    ver
    echo.
    echo === Verzije / Versions ===
    
    where node >nul 2>&1
    if !errorlevel!==0 (
        echo Node.js:
        node --version
    )
    
    where npm >nul 2>&1
    if !errorlevel!==0 (
        echo npm:
        npm --version
    )
    
    where python >nul 2>&1
    if !errorlevel!==0 (
        echo Python:
        python --version
    )
    
    where git >nul 2>&1
    if !errorlevel!==0 (
        echo Git:
        git --version
    )
    
    where docker >nul 2>&1
    if !errorlevel!==0 (
        echo Docker:
        docker --version
    )
) > "%BACKUP_DIR%\system-info.txt"

echo [OK] Sistemske informacije shranjene / System information saved

REM 8. GitHub Issues in PRs / GitHub Issues and PRs
echo.
echo ========================================
echo 8. GitHub Podatki / GitHub Data
echo ========================================

where gh >nul 2>&1
if %errorlevel%==0 (
    mkdir "%BACKUP_DIR%\github" 2>nul
    
    gh issue list --state all --json number,title,body,state,createdAt,closedAt --limit 1000 > "%BACKUP_DIR%\github\issues.json" 2>&1
    gh pr list --state all --json number,title,body,state,createdAt,mergedAt --limit 1000 > "%BACKUP_DIR%\github\pull-requests.json" 2>&1
    gh release list --limit 1000 > "%BACKUP_DIR%\github\releases.txt" 2>&1
    
    echo [OK] GitHub podatki izvoženi / GitHub data exported
) else (
    echo [WARNING] GitHub CLI ^(gh^) ni nameščen / GitHub CLI ^(gh^) not installed
    echo [INFO] Za izvoz issues in PRs namestite: https://cli.github.com/
    echo [INFO] To export issues and PRs, install: https://cli.github.com/
)

REM 9. Ustvari manifest / Create manifest
echo.
echo ========================================
echo 9. Manifest
echo ========================================

(
    echo === OMNIBOT12 Backup Manifest ===
    echo Datum / Date: %date% %time%
    echo Backup verzija / Backup version: %BACKUP_DATE%
    echo.
    echo === Vsebina / Contents ===
    echo - Git repozitorij ^(bundle^)
    echo - Git repozitorij ^(trenutno stanje / current state^)
    echo - Konfiguracijske datoteke / Configuration files
    echo - SQLite baze / SQLite databases
    echo - MongoDB izvoz / MongoDB export
    echo - Dokumentacija / Documentation
    echo - Odvisnosti / Dependencies
    echo - Sistemske informacije / System information
    echo - GitHub podatki / GitHub data
    echo.
    echo === Struktura / Structure ===
    dir "%BACKUP_DIR%" /S
) > "%BACKUP_DIR%\MANIFEST.txt"

echo [OK] Manifest ustvarjen / Manifest created

REM 10. Kompresija / Compression
echo.
echo ========================================
echo 10. Kompresija / Compression
echo ========================================

set ARCHIVE_NAME=omnibot12-backup-%BACKUP_DATE%.zip

REM Preveri, če je na voljo 7-Zip / Check if 7-Zip is available
where 7z >nul 2>&1
if %errorlevel%==0 (
    7z a -tzip "%ARCHIVE_NAME%" "%BACKUP_DIR%" >nul
    echo [OK] Varnostna kopija kompresirana / Backup compressed: %ARCHIVE_NAME%
) else (
    REM Uporabi PowerShell za kompresijo / Use PowerShell for compression
    powershell -command "Compress-Archive -Path '%BACKUP_DIR%' -DestinationPath '%ARCHIVE_NAME%'"
    if !errorlevel!==0 (
        echo [OK] Varnostna kopija kompresirana / Backup compressed: %ARCHIVE_NAME%
    ) else (
        echo [WARNING] Kompresija ni uspela / Compression failed
        echo [INFO] Nekompresiran backup je v / Uncompressed backup is in: %BACKUP_DIR%
    )
)

REM Zaključek / Conclusion
echo.
echo ========================================
echo Zaključek / Complete!
echo ========================================
echo.
echo [SUCCESS] Varnostna kopija uspešno ustvarjena!
echo [SUCCESS] Backup successfully created!
echo.

if exist "%ARCHIVE_NAME%" (
    echo Arhiv / Archive: %ARCHIVE_NAME%
    for %%A in ("%ARCHIVE_NAME%") do echo Velikost / Size: %%~zA bytes
) else (
    echo Direktorij / Directory: %BACKUP_DIR%
)

echo.
echo Priporočila / Recommendations:
echo 1. Shranite arhiv na varno lokacijo / Store the archive in a safe location
echo 2. Kopirajte na več lokacij ^(pravilo 3-2-1^) / Copy to multiple locations ^(3-2-1 rule^)
echo 3. Preverite celovitost arhiva / Verify archive integrity
echo.
echo Za obnovo Git repozitorija / To restore Git repository:
echo    git clone %BACKUP_DIR%\omnibot12-repo.bundle omnibot12-restored
echo.
echo [OK] Projekt je pripravljen za arhiviranje / Project ready for archiving
echo.

pause
