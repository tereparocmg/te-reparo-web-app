@echo off
REM ============================================================
REM Te Reparo Manager - Launcher Windows
REM ============================================================
REM Doble clic para abrir la app en tu navegador.
REM Cierra esta ventana para detener el servidor.
REM ============================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Path absoluto a la DB SQLite (persiste entre reinicios)
set "DB_PATH=%~dp0data\te-reparo.db"

REM Crear carpeta data si no existe
if not exist "data" mkdir "data"

REM Si no existe la DB, copiar la seed
if not exist "%DB_PATH%" (
    if exist "prisma\te-reparo.db" (
        echo [start] Copiando base de datos inicial...
        copy "prisma\te-reparo.db" "%DB_PATH%" >nul
    )
)

REM Detectar Node.js (usar bundled primero, luego PATH)
set "NODE_EXE="
if exist "node\node.exe" (
    set "NODE_EXE=node\node.exe"
) else (
    where node >nul 2>nul
    if !errorlevel! == 0 (
        set "NODE_EXE=node"
    )
)

if "%NODE_EXE%"=="" (
    echo.
    echo [ERROR] No se encontro Node.js.
    echo.
    echo Soluciones:
    echo   1. Instala Node.js desde https://nodejs.org (recomendado LTS)
    echo   2. O usa la version portable que ya incluye Node.js bundled
    echo.
    pause
    exit /b 1
)

echo [start] Usando Node.js: %NODE_EXE%
echo [start] Base de datos: %DB_PATH%
echo [start] Iniciando servidor en http://localhost:3000 ...
echo.

REM Arrancar servidor Next.js standalone en background y abrir navegador
set "DATABASE_URL=file:%DB_PATH%"
set "PORT=3000"
set "NODE_ENV=production"

REM Esperar 4 segundos y abrir navegador
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

REM Ejecutar el servidor en foreground (Ctrl+C o cerrar ventana para detener)
"%NODE_EXE%" "app\server.js"

REM Si el servidor termina
echo.
echo [start] Servidor detenido. Presiona cualquier tecla para cerrar.
pause >nul
