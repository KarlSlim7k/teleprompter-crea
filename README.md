# Apuntador

Prompter sincronizado a audio para operadores de marioneta. Un solo archivo
HTML/CSS/JS (sin build, sin dependencias de npm/pip) más una carpeta `/fonts`
con las tipografías embebidas localmente, y dos scripts Python opcionales:
`transcribe_server.py` (audio → texto) y `sync_server.py` (guion + audio →
marcas de tiempo automáticas).

## Uso normal: doble clic

En la mayoría de los casos basta con abrir `apuntador.html` directo con
doble clic (se abre como `file://...`). Con Chrome o Edge funciona completo:
carga de guion, carga de audio, marcado de sincronización, modo monitor,
pantalla completa y guardado/carga de guiones (localStorage) — todo sin
conexión a internet.

## Cuándo hace falta un servidor local

No es necesario en el caso normal, pero hay un escenario conocido donde
`file://` da problemas:

- **Firefox bloquea `localStorage` en `file://` por defecto.** Firefox trata
  cada archivo abierto con `file://` como un origen único/opaco
  (`privacy.file_unique_origin`), y los orígenes opacos no pueden usar
  Web Storage. El resto del prompter (guion, audio, sincronización, monitor,
  pantalla completa) sigue funcionando igual, pero "Guardar" y "Cargar" guion
  fallarán silenciosamente (el código ya usa try/catch para no romper la app).
  Si vas a operar con Firefox, levanta un servidor local.
- Algunas políticas corporativas de Chrome/Edge también restringen el acceso
  a `file://`. Si ves la consola marcar errores al cargar las fuentes o al
  guardar el guion, usa un servidor local como alternativa.

Con Chrome/Edge en una laptop normal (el caso típico el día de grabación) no
necesitas nada de esto.

### Opción A — Python (recomendada, ya viene instalado en la mayoría de sistemas)

```bash
cd ruta/a/prompter-crea
python3 -m http.server 8000
```

Abre `http://localhost:8000/apuntador.html`.

### Opción B — Node (si no tienes Python pero sí Node.js)

```bash
cd ruta/a/prompter-crea
npx serve .
```

Abre la URL que imprima en la terminal (por defecto `http://localhost:3000`).

`npx serve` descarga el paquete `serve` la primera vez que lo usas (requiere
internet esa única vez, o tenerlo ya en caché de npx). No se agrega como
dependencia del proyecto ni se necesita `npm install`.

## Transcripción automática (opcional)

En el editor, junto al audio, hay un botón "Transcribir con IA (servidor
local)". Es **opcional** — si no lo usas, el guion se sigue escribiendo a
mano como siempre. Cuando lo usas, convierte el audio a texto con
[Whisper](https://github.com/openai/whisper) corriendo 100% en el CPU de tu
máquina (vía [faster-whisper](https://github.com/SYSTRAN/faster-whisper)),
sin mandar el audio a ningún servidor externo.

Para que funcione, `transcribe_server.py` (incluido en esta carpeta) tiene
que estar corriendo *antes* de darle al botón:

```bash
# una sola vez
pip install faster-whisper

# cada vez que quieras transcribir
python3 transcribe_server.py
```

Deja esa terminal abierta — el script levanta un servidor en
`http://127.0.0.1:8765` y `apuntador.html` le manda el audio directo desde el
navegador (funciona igual si abriste el HTML por doble clic o con un
servidor local). Si el botón no encuentra el servidor corriendo, te lo dice
en pantalla en vez de fallar en silencio.

**Sobre el hardware:** esto se probó en una laptop sin GPU dedicada
(Intel i5 de 4 núcleos/8 hilos, gráficos integrados) y funciona, pero sin
GPU solo son prácticos los modelos chicos de Whisper. Por defecto el script
usa el modelo `base` (buen balance velocidad/precisión en CPU). Si tu
máquina es más lenta o el audio es largo, usa `tiny` (más rápido, menos
preciso); si tienes una máquina más potente o GPU, puedes subir a `small` o
`medium` para mejor precisión:

```bash
APUNTADOR_WHISPER_MODEL=tiny python3 transcribe_server.py
```

Otras variables de entorno opcionales:

- `APUNTADOR_WHISPER_LANG` (por defecto `es`) — idioma del audio.
- `APUNTADOR_PORT` (por defecto `8765`) — puerto del servidor local.

**Sobre la conexión a internet:** la primera vez que corres el script con un
modelo nuevo, descarga los pesos de ese modelo desde Hugging Face (necesitas
internet esa única vez). Después queda cacheado en disco y funciona sin
conexión — igual que el resto del prompter.

**Revisa el texto antes de aplicarlo.** La transcripción llena el cuadro de
texto del guion pero no lo aplica sola: la separación en líneas depende de
las pausas que detecta Whisper en el audio, no necesariamente coincide con
"una línea = una frase" como preferís organizar el guion. Ajusta el texto y
después presiona "Aplicar guion" como de costumbre.

## Sincronización automática (opcional)

En la vista "Sincronizar" hay un botón "⚡ Auto-sincronizar (IA local)", junto
a los controles de marcado manual. Es **opcional** — el marcado manual con
"MARCAR (Enter)" sigue funcionando exactamente igual que antes y es la forma
de corregir cualquier línea puntual después de auto-sincronizar.

A diferencia de la transcripción (que convierte audio en texto), esto hace lo
contrario: toma el guion que ya escribiste (tal cual, sin cambiarlo) y el
audio, y calcula automáticamente en qué segundo empieza cada línea usando
*forced alignment* ([MMS_FA](https://pytorch.org/audio/stable/pipelines.html#torchaudio.pipelines.MMS_FA),
un modelo de Meta vía torchaudio). No manda nada a internet en el momento de
usarlo.

Para que funcione, `sync_server.py` (incluido en esta carpeta) tiene que
estar corriendo *antes* de darle al botón:

```bash
# una sola vez
pip install torch torchaudio av uroman

# cada vez que quieras auto-sincronizar
python3 sync_server.py
```

Deja esa terminal abierta — el script levanta un servidor en
`http://127.0.0.1:8766` y `apuntador.html` le manda el audio y el guion
directo desde el navegador. Si el botón no encuentra el servidor corriendo,
te lo dice en pantalla en vez de fallar en silencio.

**Sobre el hardware — usa GPU si la máquina tiene una NVIDIA.** El script
detecta automáticamente si hay una GPU NVIDIA disponible (`torch.cuda.is_available()`)
y la usa; si no hay, cae a CPU sin que tengas que cambiar nada. El terminal
imprime qué dispositivo quedó activo ("cuda" o "cpu") al arrancar, y
`GET http://127.0.0.1:8766/health` también lo reporta.

Para que la GPU se use de verdad (por ejemplo una GeForce GTX 1650 Super u
otra NVIDIA con soporte CUDA) hace falta instalar la build de PyTorch con
CUDA, en vez del comando genérico de arriba:

```bash
# Windows, GPU NVIDIA — instala PyTorch con soporte CUDA
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install av uroman
```

Esto requiere tener instalado el driver de NVIDIA (el normal de Windows para
jugar/usar la GPU ya alcanza; no hace falta instalar el CUDA Toolkit aparte).
Si el comando de arriba falla o tu driver es más nuevo/viejo, la página
oficial [pytorch.org/get-started](https://pytorch.org/get-started/locally/)
te da el comando exacto según tu versión de CUDA — elegí "Windows" + "Pip" +
"CUDA". Si no instalás la build con CUDA, el script sigue funcionando igual,
solo que más lento (CPU).

**Sobre líneas que no se pudieron alinear.** Si alguna línea del guion no
tiene palabras (por ejemplo una acotación entre paréntesis sin diálogo), esa
línea puede quedar sin marca automática. La app te avisa cuántas líneas
quedaron pendientes; podés completarlas a mano con "MARCAR" como siempre,
siguiendo desde esa línea.

**Sobre la conexión a internet:** la primera vez que corres el script,
descarga los pesos del modelo MMS_FA (necesitas internet esa única vez).
Después queda cacheado en disco y funciona sin conexión.

**Revisa las marcas antes de pasar a Monitor.** La auto-sincronización suele
quedar muy cerca del golpe real, pero no es perfecta — repasa la lista de
líneas en la vista "Sincronizar" (columna de tiempos) y, si alguna quedó mal,
volvé a marcarla a mano: hacer clic en "Deshacer" repetidamente retrocede
línea por línea, o simplemente corré "MARCAR" de nuevo desde la línea que
quieras corregir en adelante.
