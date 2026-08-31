@echo off
REM Instala las dependencias de transcripcion (Whisper) y sincronizacion
REM automatica (MMS_FA) para Apuntador. Requiere internet (una sola vez).
REM Uso: doble clic, o "install_ai.bat" desde una terminal.
setlocal

cd /d "%~dp0"

echo === Apuntador: instalacion de dependencias de IA ===
echo.

echo [1/4] Buscando Python...
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
for /f "delims=" %%v in ('%PYCMD% --version') do set PYVER=%%v
echo   Encontrado: %PYVER%
echo.

echo [2/4] Actualizando pip...
%PYCMD% -m pip install --upgrade pip
echo.

echo [3/4] Instalando faster-whisper, torch, torchaudio, av y uroman...
echo   Esto puede tardar varios minutos (paquetes grandes) y requiere internet.
%PYCMD% -m pip install -r requirements-ai.txt
if errorlevel 1 (
    echo.
    echo La instalacion fallo. Revisa el error de arriba.
    pause
    exit /b 1
)
echo.

echo [4/4] Verificando que las librerias quedaron instaladas...
%PYCMD% -c "import faster_whisper; print('  faster-whisper: OK')"
%PYCMD% -c "import torch, torchaudio, av, uroman; print('  torch / torchaudio / av / uroman: OK')"
if errorlevel 1 (
    echo.
    echo Algo no quedo bien instalado. Revisa el error de arriba.
    pause
    exit /b 1
)
echo.

echo === Instalacion completa ===
echo Esto instalo la build de torch para CPU.
echo Si tenes GPU NVIDIA y queres usarla con la sincronizacion automatica,
echo segui las instrucciones de CUDA en el README en vez de este script.
echo.
echo Ahora podes usar start_ai.bat para levantar los dos servidores.
pause
