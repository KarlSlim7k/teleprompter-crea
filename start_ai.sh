#!/usr/bin/env bash
# Levanta los dos servidores locales de IA de Apuntador:
# transcribe_server.py (Whisper) y sync_server.py (MMS_FA).
# Requiere haber corrido antes ./install_ai.sh
# Uso: ./start_ai.sh
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if command -v python3 >/dev/null 2>&1; then
    PYTHON=python3
elif command -v python >/dev/null 2>&1; then
    PYTHON=python
else
    echo "No se encontro Python instalado."
    echo "Instalalo desde https://python.org y volve a intentar."
    read -p "Presiona Enter para cerrar..." _
    exit 1
fi

TRANSCRIBE_PORT="${APUNTADOR_PORT:-8765}"
SYNC_PORT="${APUNTADOR_SYNC_PORT:-8766}"

echo "=== Apuntador: levantando servidores de IA ==="
echo ""
echo "[1/2] Iniciando servidor de transcripcion (Whisper) en http://127.0.0.1:$TRANSCRIBE_PORT ..."
"$PYTHON" transcribe_server.py &
PID_TRANSCRIBE=$!

echo "[2/2] Iniciando servidor de sincronizacion (MMS_FA) en http://127.0.0.1:$SYNC_PORT ..."
"$PYTHON" sync_server.py &
PID_SYNC=$!

trap 'echo ""; echo "Apagando servidores..."; kill "$PID_TRANSCRIBE" "$PID_SYNC" 2>/dev/null; wait 2>/dev/null; echo "Listo, servidores apagados."; exit 0' INT TERM

# Espera a que un servidor responda en /health, mostrando progreso.
# Los mensajes de carga del modelo (arriba) tambien indican avance mientras tanto.
wait_for_health() {
    local port="$1"
    local name="$2"
    local tries=0
    local max_tries=180  # ~3 minutos, la primera carga de modelo puede tardar
    printf "  Esperando a que %s este listo" "$name"
    while [ "$tries" -lt "$max_tries" ]; do
        if ! kill -0 "$3" 2>/dev/null; then
            echo ""
            echo "  El proceso de $name se cerro solo (revisa el error arriba, seguramente falta instalar dependencias)."
            return 1
        fi
        if "$PYTHON" -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:$port/health', timeout=2)" >/dev/null 2>&1; then
            echo " -> listo."
            return 0
        fi
        printf "."
        sleep 1
        tries=$((tries + 1))
    done
    echo ""
    echo "  Aviso: $name no respondio en varios minutos. Puede seguir cargando el modelo; revisa arriba."
    return 1
}

echo ""
echo "Cargando modelos (la primera vez descarga varios cientos de MB, puede tardar)..."
wait_for_health "$TRANSCRIBE_PORT" "transcripcion" "$PID_TRANSCRIBE" || true
wait_for_health "$SYNC_PORT" "sincronizacion" "$PID_SYNC" || true

echo ""
echo "Ambos servidores estan corriendo. Deja esta terminal abierta mientras los uses."
echo "Presiona Ctrl+C para apagar ambos."

wait "$PID_TRANSCRIBE" "$PID_SYNC"
