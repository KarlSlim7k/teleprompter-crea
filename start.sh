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

echo "Iniciando Apuntador en $URL"
echo "Deja esta terminal abierta mientras uses el prompter."
echo "Para apagar el servidor, cerra esta ventana o presiona Ctrl+C."

(
    sleep 1
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL" >/dev/null 2>&1
    elif command -v open >/dev/null 2>&1; then
        open "$URL" >/dev/null 2>&1
    fi
) &

exec "$PYTHON" -m http.server "$PORT"
