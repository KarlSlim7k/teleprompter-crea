#!/usr/bin/env python3
"""Servidor local de transcripcion para Apuntador.

Corre Whisper (via faster-whisper) 100% en el CPU de esta maquina y expone
una API HTTP minima que apuntador.html llama desde el navegador para
convertir el audio del episodio en texto.

Instalar una vez (requiere internet):
    pip install faster-whisper

Ejecutar (cada vez que quieras usar la transcripcion):
    python3 transcribe_server.py

La primera vez que corre descarga el modelo elegido desde Hugging Face
(requiere internet esa unica vez); despues queda cacheado en el disco y
funciona sin conexion. Ver README.md para mas detalle y para elegir el
tamano de modelo segun el hardware disponible.
"""
import json
import os
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

MODEL_SIZE = os.environ.get("APUNTADOR_WHISPER_MODEL", "base")
LANGUAGE = os.environ.get("APUNTADOR_WHISPER_LANG", "es")
PORT = int(os.environ.get("APUNTADOR_PORT", "8765"))

try:
    from faster_whisper import WhisperModel
except ImportError:
    sys.exit(
        "Falta la libreria 'faster-whisper'. Instalala con:\n"
        "  pip install faster-whisper\n"
        "y vuelve a correr este script."
    )

print(f"Cargando modelo Whisper '{MODEL_SIZE}' (CPU, int8)... "
      "la primera vez puede tardar porque descarga el modelo.")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
print(f"Modelo listo. Escuchando en http://127.0.0.1:{PORT}  (Ctrl+C para detener)")


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Filename")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"status": "ok", "model": MODEL_SIZE, "language": LANGUAGE})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/transcribe":
            self._json(404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length", 0))
        if length <= 0:
            self._json(400, {"error": "cuerpo de audio vacio"})
            return

        audio_bytes = self.rfile.read(length)

        filename_header = self.headers.get("X-Filename", "")
        suffix = os.path.splitext(unquote(filename_header))[1] or ".audio"

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        try:
            tmp.write(audio_bytes)
            tmp.close()
            segments, _info = model.transcribe(tmp_path, language=LANGUAGE)
            lines = [seg.text.strip() for seg in segments if seg.text.strip()]
            self._json(200, {"lines": lines})
        except Exception as err:  # noqa: BLE001 - queremos reportar cualquier fallo al navegador
            self._json(500, {"error": str(err)})
        finally:
            os.unlink(tmp_path)

    def log_message(self, format, *args):  # noqa: A002 - firma exigida por BaseHTTPRequestHandler
        pass


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
