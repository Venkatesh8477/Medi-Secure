@echo off
REM Hospital Management System - Quick Testing Script
REM Run this to verify everything works

echo.
echo ========================================
echo Hospital Management System - Testing
echo ========================================
echo.

setlocal enabledelayedexpansion

REM Colors
set GREEN=[92m
set RED=[91m
set YELLOW=[93m

echo [1/5] Checking Backend...
timeout /t 1 /nobreak > nul

cd "C:\Users\nbhar\SMART HMS\backend"
if exist "server.js" (
    echo %GREEN%✓ Backend files found%RED%
) else (
    echo %RED%✗ Backend files not found%RED%
    exit /b 1
)

echo.
echo [2/5] Checking Frontend...
timeout /t 1 /nobreak > nul

cd "C:\Users\nbhar\SMART HMS\frontend"
if exist "package.json" (
    echo %GREEN%✓ Frontend files found%RED%
) else (
    echo %RED%✗ Frontend files not found%RED%
    exit /b 1
)

echo.
echo [3/5] Checking Database...
timeout /t 1 /nobreak > nul

cd "C:\Users\nbhar\SMART HMS"
if exist "backend\database\schema_with_data.sql" (
    echo %GREEN%✓ Database schema found%RED%
) else (
    echo %RED%✗ Database schema not found%RED%
    exit /b 1
)

echo.
echo [4/5] Testing MySQL Connection...
timeout /t 1 /nobreak > nul

"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot -e "SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ MySQL Connected%RED%
) else (
    echo %RED%✗ MySQL Connection Failed%RED%
    exit /b 1
)

echo.
echo [5/5] Checking Test Data...
timeout /t 1 /nobreak > nul

"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot -e "USE hospital_management_system; SELECT COUNT(*) FROM users;" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Database tables exist%RED%
) else (
    echo %RED%✗ Database tables not found%RED%
    exit /b 1
)

echo.
echo ========================================
echo %GREEN%✓ All Pre-Checks Passed!%RED%
echo ========================================
echo.

echo NEXT STEPS:
echo.
echo 1. Start Backend (Terminal 1):
echo    cd "C:\Users\nbhar\SMART HMS\backend"
echo    npm start
echo.
echo 2. Start Frontend (Terminal 2):
echo    cd "C:\Users\nbhar\SMART HMS\frontend"
echo    npm start
echo.
echo 3. Open Browser:
echo    http://localhost:3000
echo.
echo 4. Login with test user:
echo    Username: admin
echo    Password: any password
echo.
echo 5. Check TESTING_GUIDE.md for complete test scenarios
echo.

pause
