#!/usr/bin/env python3
"""Servidor local de sincronizacion automatica para Apuntador.

Alinea el guion (tal cual lo escribiste) contra el audio del episodio usando
"forced alignment" (MMS_FA, de torchaudio) y devuelve el segundo exacto en el
que empieza cada linea. No transcribe ni cambia el texto: solo calcula los
tiempos. Usa GPU NVIDIA (CUDA) si esta disponible en la maquina, y si no cae
a CPU automaticamente.

Instalar una vez (requiere internet; ver README.md para el comando de
Windows/CUDA que corresponde a tu GPU):
    pip install torch torchaudio av uroman

Ejecutar (cada vez que quieras usar la auto-sincronizacion):
    python3 sync_server.py

La primera vez que corre descarga el modelo MMS_FA (requiere internet esa
unica vez); despues queda cacheado en disco y funciona sin conexion.
"""
import base64
import json
import os
import re
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("APUNTADOR_SYNC_PORT", "8766"))
LANG = os.environ.get("APUNTADOR_SYNC_LANG", "spa")

try:
    import torch
    import torchaudio
    import av
    import numpy as np
    import uroman
except ImportError as err:
    sys.exit(
        f"Falta una libreria necesaria ({err.name}). Instala las 4 con:\n"
        "  pip install torch torchaudio av uroman\n"
        "(en Windows con GPU NVIDIA, usa primero el comando de torch/torchaudio\n"
        "con soporte CUDA que se explica en README.md) y vuelve a correr este script."
    )

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DEVICE_NAME = torch.cuda.get_device_name(0) if DEVICE == "cuda" else "CPU"

print(f"Cargando modelo de alineacion MMS_FA en {DEVICE} ({DEVICE_NAME})... "
      "la primera vez puede tardar porque descarga el modelo.")

BUNDLE = torchaudio.pipelines.MMS_FA
ALIGN_MODEL = BUNDLE.get_model().to(DEVICE)
ALIGN_MODEL.eval()
TOKENIZER = BUNDLE.get_tokenizer()
ALIGNER = BUNDLE.get_aligner()
SAMPLE_RATE = BUNDLE.sample_rate
ROMANIZER = uroman.Uroman()

print(f"Modelo listo. Escuchando en http://127.0.0.1:{PORT}  (Ctrl+C para detener)")

WORD_RE = re.compile(r"[^a-z']+")


def decode_audio_16k_mono(path):
    """Decodifica cualquier archivo de audio a mono float32 a SAMPLE_RATE Hz."""
    container = av.open(path)
    stream = container.streams.audio[0]
    resampler = av.audio.resampler.AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)
    chunks = []
    for frame in container.decode(stream):
        for resampled in resampler.resample(frame):
            chunks.append(resampled.to_ndarray())
    container.close()
    if not chunks:
        raise ValueError("no se pudo leer audio del archivo")
    pcm = np.concatenate(chunks, axis=1).reshape(-1).astype(np.float32) / 32768.0
    return torch.from_numpy(pcm).unsqueeze(0)


def normalize_words(line):
    """Convierte una linea del guion en la lista de palabras que espera MMS_FA."""
    romanized = ROMANIZER.romanize_string(line, lcode=LANG).lower()
    cleaned = WORD_RE.sub(" ", romanized)
    return [w for w in cleaned.split() if w]


def align(waveform, lines):
    per_line_words = [normalize_words(line) for line in lines]
    flat_words = [w for words in per_line_words for w in words]
    if not flat_words:
        raise ValueError("el guion no tiene palabras alineables")

    with torch.inference_mode():
        emission, _ = ALIGN_MODEL(waveform.to(DEVICE))
        tokenized = TOKENIZER(flat_words)
        token_spans = ALIGNER(emission[0], tokenized)

    ratio = waveform.size(1) / emission.size(1) / SAMPLE_RATE

    starts = [spans[0].start * ratio for spans in token_spans]

    timestamps = []
    cursor = 0
    for words in per_line_words:
        if not words:
            timestamps.append(None)
            continue
        timestamps.append(round(starts[cursor], 3))
        cursor += len(words)
    return timestamps


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
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
            self._json(200, {"status": "ok", "device": DEVICE, "device_name": DEVICE_NAME})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/align":
            self._json(404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length", 0))
        if length <= 0:
            self._json(400, {"error": "cuerpo vacio"})
            return

        try:
            payload = json.loads(self.rfile.read(length))
            audio_b64 = payload["audio_base64"]
            lines = payload["lines"]
            filename = payload.get("filename", "audio")
        except (KeyError, json.JSONDecodeError):
            self._json(400, {"error": "payload invalido: se espera {filename, audio_base64, lines}"})
            return

        if not isinstance(lines, list) or not lines:
            self._json(400, {"error": "el guion (lines) esta vacio"})
            return

        suffix = os.path.splitext(filename)[1] or ".audio"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        try:
            tmp.write(base64.b64decode(audio_b64))
            tmp.close()
            waveform = decode_audio_16k_mono(tmp_path)
            timestamps = align(waveform, lines)
            self._json(200, {"timestamps": timestamps})
        except Exception as err:  # noqa: BLE001 - reportar cualquier fallo al navegador
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
