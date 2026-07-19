@echo off
:: Set title and configure environment
title RADIX Talent Match - Control Panel
setlocal enabledelayedexpansion

:MENU
cls
echo =====================================================================
echo                RADIX Talent Match Control Panel
echo =====================================================================
echo  [1] Start Full Stack (Local Development Mode - Recommended)
echo  [2] Start Full Stack (Docker Compose Mode)
echo  [3] Initialize Database (Run Company Benchmarks Ingestion)
echo  [4] Run Automated Regression Test Suite
echo  [5] Run Backend Only (FastAPI Server)
echo  [6] Run Frontend Only (Vite Dev Server)
echo  [7] Install Dependencies (Python requirements + NPM install)
echo  [8] Exit
echo =====================================================================
echo.
set /p choice="Enter your choice (1-8): "

:: Handle user selection
if "%choice%"=="1" goto LOCAL_FULLSTACK
if "%choice%"=="2" goto DOCKER_MODE
if "%choice%"=="3" goto INGEST_DATA
if "%choice%"=="4" goto RUN_TESTS
if "%choice%"=="5" goto BACKEND_ONLY
if "%choice%"=="6" goto FRONTEND_ONLY
if "%choice%"=="7" goto INSTALL_DEPS
if "%choice%"=="8" goto EOF
echo.
echo [!] Invalid choice. Please try again.
timeout /t 2 >nul
goto MENU

:DETECT_VENV
:: Helper routine to find and set virtual environment activation command
set "ACTIVATE_CMD="
if exist "%~dp0.venv\Scripts\activate.bat" (
    set "ACTIVATE_CMD=call "%~dp0.venv\Scripts\activate.bat""
) else if exist "%~dp0venv\Scripts\activate.bat" (
    set "ACTIVATE_CMD=call "%~dp0venv\Scripts\activate.bat""
) else if exist "%~dp0backend\.venv\Scripts\activate.bat" (
    set "ACTIVATE_CMD=call "%~dp0backend\.venv\Scripts\activate.bat""
) else if exist "%~dp0backend\venv\Scripts\activate.bat" (
    set "ACTIVATE_CMD=call "%~dp0backend\venv\Scripts\activate.bat""
)
goto :EOF

:CHECK_PYTHON
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your PATH.
    echo Please install Python 3.9+ and add it to your system environment variables.
    pause
    goto MENU
)
goto :EOF

:CHECK_NODE
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Node.js/NPM was not found in your PATH. 
    echo Frontend might fail to start if it is not installed or configured.
)
goto :EOF

:LOCAL_FULLSTACK
echo.
echo [*] Checking prerequisites...
call :CHECK_PYTHON
call :CHECK_NODE
call :DETECT_VENV

:: Auto-check frontend node_modules
if not exist "%~dp0frontend\node_modules\" (
    echo [!] Frontend dependencies (node_modules) are missing.
    set /p install_npm="Would you like to run 'npm install' in the frontend directory now? (Y/N): "
    if /i "!install_npm!"=="Y" (
        echo [*] Running npm install...
        cd /d "%~dp0frontend"
        call npm install
        cd /d "%~dp0"
    )
)

echo.
echo [*] Starting RADIX Backend (FastAPI)...
if not "!ACTIVATE_CMD!"=="" (
    echo [+] Detected Virtual Environment: !ACTIVATE_CMD!
    start "RADIX Backend (FastAPI)" cmd /k "title RADIX Backend (FastAPI) && !ACTIVATE_CMD! && python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"
) else (
    echo [-] No virtual environment detected. Running with global Python.
    start "RADIX Backend (FastAPI)" cmd /k "title RADIX Backend (FastAPI) && python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"
)

:: Wait a brief moment before starting frontend
timeout /t 2 >nul

echo [*] Starting RADIX Frontend (Vite)...
start "RADIX Frontend (Vite)" cmd /k "title RADIX Frontend (Vite) && cd frontend && npm run dev"

echo.
echo =====================================================================
echo  RADIX Full Stack Development environment is starting!
echo =====================================================================
echo  - Frontend Dev Server: http://localhost:5173
echo  - Backend API Server:  http://127.0.0.1:8000
echo  - API Documentation:   http://127.0.0.1:8000/docs
echo.
echo  Note: Separate terminal windows have been opened for the services.
echo        Close those windows or press Ctrl+C in them to stop them.
echo =====================================================================
echo.
pause
goto MENU

:DOCKER_MODE
echo.
echo [*] Checking Docker...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker command was not found in your PATH.
    echo Please make sure Docker Desktop is installed and running.
    pause
    goto MENU
)
echo [*] Starting RADIX Services via Docker Compose...
docker-compose up --build
echo.
pause
goto MENU

:INGEST_DATA
echo.
echo [*] Initializing Database / Ingesting Company Benchmarks...
call :CHECK_PYTHON
call :DETECT_VENV
if not "!ACTIVATE_CMD!"=="" (
    !ACTIVATE_CMD!
)
python scripts/ingest_companies.py
echo.
echo [+][Database] Ingestion completed.
pause
goto MENU

:RUN_TESTS
echo.
echo [*] Running Automated Regression Test Suite...
call :CHECK_PYTHON
call :DETECT_VENV
if not "!ACTIVATE_CMD!"=="" (
    !ACTIVATE_CMD!
)
python tests/run_regression_suite.py
echo.
pause
goto MENU

:BACKEND_ONLY
echo.
echo [*] Starting RADIX Backend only...
call :CHECK_PYTHON
call :DETECT_VENV
if not "!ACTIVATE_CMD!"=="" (
    start "RADIX Backend (FastAPI)" cmd /k "title RADIX Backend (FastAPI) && !ACTIVATE_CMD! && python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"
) else (
    start "RADIX Backend (FastAPI)" cmd /k "title RADIX Backend (FastAPI) && python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"
)
echo Backend starting at http://127.0.0.1:8000
pause
goto MENU

:FRONTEND_ONLY
echo.
echo [*] Starting RADIX Frontend only...
call :CHECK_NODE
start "RADIX Frontend (Vite)" cmd /k "title RADIX Frontend (Vite) && cd frontend && npm run dev"
echo Frontend starting at http://localhost:5173
pause
goto MENU

:INSTALL_DEPS
echo.
echo [*] Installing Dependencies...
call :CHECK_PYTHON
call :DETECT_VENV

if not "!ACTIVATE_CMD!"=="" (
    echo [+] Activating virtual environment for installation...
    !ACTIVATE_CMD!
)
echo [*] Installing Python requirements...
python -m pip install -r backend/requirements.txt

call :CHECK_NODE
echo [*] Installing Node packages in frontend...
cd frontend
call npm install
cd ..

echo.
echo [+] All dependencies installed successfully!
pause
goto MENU

:EOF
echo.
echo Goodbye!
timeout /t 1 >nul
exit
