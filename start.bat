@echo off
REM Levanta un servidor local y abre Apuntador en el navegador.
REM Uso: doble clic en este archivo, o "start.bat" desde una terminal.
setlocal

cd /d "%~dp0"

if "%APUNTADOR_PORT%"=="" (set PORT=8000) else (set PORT=%APUNTADOR_PORT%)

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
        echo IMPORTANTE: durante la instalacion, marca la casilla "Add Python to PATH".
        pause
        exit /b 1
    )
)

echo Iniciando Apuntador en http://localhost:%PORT%/apuntador.html
echo Se abrira una ventana nueva con el servidor: dejala abierta mientras uses el prompter.
echo Para apagar el servidor, cerra esa ventana.

start "Apuntador - servidor local (no cerrar)" cmd /c "%PYCMD% -m http.server %PORT%"

timeout /t 1 /nobreak >nul

start "" "http://localhost:%PORT%/apuntador.html"

echo.
echo Listo. Podes cerrar esta ventana; el servidor sigue en la otra.
pause
