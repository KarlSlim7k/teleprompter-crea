@echo off
REM Levanta un servidor local y abre Apuntador en el navegador.
REM Uso: doble clic en este archivo, o "start.bat" desde una terminal.
setlocal

cd /d "%~dp0"

if "%APUNTADOR_PORT%"=="" (set PORT=8000) else (set PORT=%APUNTADOR_PORT%)

echo === Apuntador ===
echo [1/2] Buscando Python...
where python >nul 2>nul
if %errorlevel%==0 (
    set PYCMD=python
) else (
    where python3 >nul 2>nul
    if %errorlevel%==0 (
        set PYCMD=python3
    ) else (
        echo   No se encontro Python instalado.
        echo   Instalalo desde https://python.org
        echo   IMPORTANTE: durante la instalacion, marca la casilla "Add Python to PATH".
        pause
        exit /b 1
    )
)
echo   Encontrado: %PYCMD%

echo [2/2] Iniciando servidor local en http://localhost:%PORT%/apuntador.html ...
start "Apuntador - servidor local (no cerrar)" cmd /c "%PYCMD% -m http.server %PORT%"

set /a TRIES=0
:wait_loop
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:%PORT%/apuntador.html' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 (
    echo   Servidor listo.
    goto wait_done
)
set /a TRIES+=1
if %TRIES% GEQ 30 (
    echo   Aviso: el servidor tardo en responder. Revisa la otra ventana.
    goto wait_done
)
<nul set /p="."
timeout /t 1 /nobreak >nul
goto wait_loop
:wait_done

echo   Abriendo el navegador...
start "" "http://localhost:%PORT%/apuntador.html"

echo.
echo Listo. El servidor sigue corriendo en la otra ventana.
echo Para apagarlo, cerra esa ventana.
pause
