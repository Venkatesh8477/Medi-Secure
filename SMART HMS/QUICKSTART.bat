@echo off
REM Hospital Management System - Quick Start Script
REM This script sets up and runs both backend and frontend

echo.
echo ===============================================
echo   Hospital Management System Setup
echo   With ZKP Authentication
echo ===============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js detected: 
node --version

REM Check if MySQL is installed
mysql --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: MySQL not found in PATH
    echo Please ensure MySQL is installed and in PATH
    echo You'll need to manually create the database
)

echo.
echo ===============================================
echo   Step 1: Setting up Backend
echo ===============================================
echo.

cd backend

echo Installing backend dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ERROR: Backend npm install failed
    pause
    exit /b 1
)

echo.
echo [OK] Backend dependencies installed
echo.

echo ===============================================
echo   Step 2: Setting up Database
echo ===============================================
echo.

echo Creating MySQL database...
echo Make sure MySQL is running and root password is empty or update .env
echo.

echo You need to manually:
echo 1. Start MySQL: net start MySQL
echo 2. Run: mysql -u root -p hospital_management_system ^< database\schema.sql
echo Or use MySQL Workbench to import the schema.sql file

pause

echo.
echo ===============================================
echo   Step 3: Setting up Frontend
echo ===============================================
echo.

cd ..\frontend

echo Installing frontend dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ERROR: Frontend npm install failed
    pause
    exit /b 1
)

echo.
echo [OK] Frontend dependencies installed
echo.

echo ===============================================
echo   Setup Complete!
echo ===============================================
echo.
echo To start the system:
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   npm start
echo   (runs on http://localhost:5000)
echo.
echo Terminal 2 - Frontend:
echo   cd frontend
echo   npm start
echo   (runs on http://localhost:3000)
echo.
echo Then open http://localhost:3000 in your browser
echo.
echo Test Login:
echo   Username: (any registered username)
echo   Password: (your registered password)
echo.

pause
