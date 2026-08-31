#!/usr/bin/env bash
# Levanta un servidor local y abre Apuntador en el navegador.
# Uso: ./start.sh   (o doble clic si tu SO lo permite)
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT="${APUNTADOR_PORT:-8000}"

if command -v python3 >/dev/null 2>&1; then
    PYTHON=python3
elif command -v python >/dev/null 2>&1; then
    PYTHON=python
else
    echo "No se encontro Python instalado."
    echo "Instalalo desde https://python.org (o 'brew install python3' en Mac) y volve a intentar."
    read -p "Presiona Enter para cerrar..." _
    exit 1
fi

URL="http://localhost:$PORT/apuntador.html"

echo "=== Apuntador ==="
echo "[1/2] Iniciando servidor local en $URL ..."

"$PYTHON" -m http.server "$PORT" &
PID=$!

trap 'echo ""; echo "Apagando servidor..."; kill "$PID" 2>/dev/null; wait 2>/dev/null; echo "Listo, servidor apagado."; exit 0' INT TERM

tries=0
printf "  Esperando a que responda"
while [ "$tries" -lt 30 ]; do
    if ! kill -0 "$PID" 2>/dev/null; then
        echo ""
        echo "  El servidor no arranco (revisa el error de arriba)."
        exit 1
    fi
    if "$PYTHON" -c "import urllib.request; urllib.request.urlopen('$URL', timeout=1)" >/dev/null 2>&1; then
        echo " -> listo."
        break
    fi
    printf "."
    sleep 0.3
    tries=$((tries + 1))
done

echo "[2/2] Abriendo el navegador..."
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    open "$URL" >/dev/null 2>&1 &
else
    echo "  No se pudo abrir el navegador automaticamente. Abrilo manualmente en: $URL"
fi

echo ""
echo "Apuntador esta corriendo. Deja esta terminal abierta mientras lo uses."
echo "Para apagar el servidor, presiona Ctrl+C."

wait "$PID"
