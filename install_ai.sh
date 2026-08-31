#!/usr/bin/env bash
# Instala las dependencias de transcripcion (Whisper) y sincronizacion
# automatica (MMS_FA) para Apuntador. Requiere internet (una sola vez).
# Uso: ./install_ai.sh
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=== Apuntador: instalacion de dependencias de IA ==="
echo ""

echo "[1/4] Buscando Python..."
if command -v python3 >/dev/null 2>&1; then
    PYTHON=python3
elif command -v python >/dev/null 2>&1; then
    PYTHON=python
else
    echo "  No se encontro Python instalado."
    echo "  Instalalo desde https://python.org (o 'brew install python3' en Mac) y volve a intentar."
    read -p "Presiona Enter para cerrar..." _
    exit 1
fi
echo "  Encontrado: $("$PYTHON" --version)"
echo ""

echo "[2/4] Actualizando pip..."
"$PYTHON" -m pip install --upgrade pip
echo ""

echo "[3/4] Instalando faster-whisper, torch, torchaudio, av y uroman..."
echo "  Esto puede tardar varios minutos (paquetes grandes) y requiere internet."
"$PYTHON" -m pip install -r requirements-ai.txt
echo ""

echo "[4/4] Verificando que las librerias quedaron instaladas..."
"$PYTHON" -c "import faster_whisper; print('  faster-whisper: OK')"
"$PYTHON" -c "import torch, torchaudio, av, uroman; print('  torch / torchaudio / av / uroman: OK')"
echo ""

echo "=== Instalacion completa ==="
echo "Esto instalo la build de torch para CPU."
echo "Si tenes GPU NVIDIA y queres usarla con la sincronizacion automatica,"
echo "segui las instrucciones de CUDA en el README en vez de este script."
echo ""
echo "Ahora podes usar ./start_ai.sh para levantar los dos servidores."
