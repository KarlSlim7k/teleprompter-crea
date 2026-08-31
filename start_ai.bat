@echo off
REM Levanta los dos servidores locales de IA de Apuntador:
REM transcribe_server.py (Whisper) y sync_server.py (MMS_FA).
REM Requiere haber corrido antes install_ai.bat
REM Uso: doble clic, o "start_ai.bat" desde una terminal.
setlocal

cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
    set PYCMD=python
) else (
    where python3 >nul 2>nul
    if %errorlevel%==0 (
        set PYCMD=python3
    ) else (
        echo No se encontro Python instalado.
        echo Instalalo desde https://python.org
        pause
        exit /b 1
    )
)

if "%APUNTADOR_PORT%"=="" (set TPORT=8765) else (set TPORT=%APUNTADOR_PORT%)
if "%APUNTADOR_SYNC_PORT%"=="" (set SPORT=8766) else (set SPORT=%APUNTADOR_SYNC_PORT%)

echo === Apuntador: levantando servidores de IA ===
echo.
echo [1/2] Iniciando servidor de transcripcion (Whisper) en http://127.0.0.1:%TPORT% ...
start "Apuntador - Transcribir (no cerrar)" cmd /c "%PYCMD% transcribe_server.py"

echo [2/2] Iniciando servidor de sincronizacion (MMS_FA) en http://127.0.0.1:%SPORT% ...
start "Apuntador - Sincronizar (no cerrar)" cmd /c "%PYCMD% sync_server.py"

echo.
echo Cargando modelos (la primera vez descarga varios cientos de MB, puede tardar)...
echo Podes ver el detalle de carga en cada ventana nueva que se abrio.
echo.

call :wait_health %TPORT% transcripcion
call :wait_health %SPORT% sincronizacion

echo.
echo Ambos servidores quedaron corriendo, cada uno en su propia ventana.
echo Para apagar uno, cerra su ventana.
pause
exit /b 0

:wait_health
setlocal
set "PORTNUM=%~1"
set "SVCNAME=%~2"
set /a TRIES=0
:wait_health_loop
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%PORTNUM%/health' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 (
    echo   Servidor de %SVCNAME% listo.
    endlocal
    exit /b 0
)
set /a TRIES+=1
if %TRIES% GEQ 180 (
    echo.
    echo   Aviso: el servidor de %SVCNAME% no respondio en varios minutos. Revisa su ventana.
    endlocal
    exit /b 1
)
<nul set /p="."
timeout /t 1 /nobreak >nul
goto wait_health_loop
