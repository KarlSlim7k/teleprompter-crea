# Apuntador

Prompter para operadores de marioneta, con dos modos: sincronizado a audio
(para postproducción) o guion manual en vivo (para quien mueve la marioneta y
habla en directo, sin audio). Front-end sin build ni dependencias de npm/pip
(`apuntador.html` + `apuntador.css` + `apuntador.js`) más una carpeta
`/fonts` con las tipografías embebidas localmente. Funciona sin conexión a
internet.

## Inicio rápido

1. Descarga o cloná esta carpeta completa (necesitás `apuntador.html`,
   `apuntador.css` y `apuntador.js` juntos, más la carpeta `/fonts` — no solo
   el HTML suelto).
2. Abrí `apuntador.html` con doble clic. Se abre en tu navegador y ya podés
   usarlo.
   - Si usás **Firefox**, o si tu Chrome/Edge da errores raros al guardar el
     guion, en vez de doble clic corré el launcher de tu sistema operativo:
     - Mac/Linux: doble clic en `start.sh` (o `./start.sh` en una terminal).
     - Windows: doble clic en `start.bat`.
     - Esto levanta un servidor local y te abre el navegador solo. Ver
       [por qué hace falta esto a veces](#cuándo-hace-falta-un-servidor-local).

Con eso ya podés escribir tu guion, elegir el modo (con audio o solo guion),
cargar el audio si corresponde, sincronizar y usar el modo monitor — todo lo
demás en este README es opcional (transcripción y sincronización automáticas
con IA).

## Cómo usar el prompter

En "Editor" primero elegís el modo:

- **🔊 Con audio (sincronizado)** — el flujo clásico: **Editor** →
  **Sincronizar** → **Monitor**. Pensado para postproducción con una
  grabación ya lista.
- **📜 Solo guion (manual, sin audio)** — sin audio ni pestaña de
  sincronización: **Editor** → **Monitor** directo, con avance de línea
  manual (o automático por tiempo). Pensado para quien maneja la marioneta y
  habla en vivo y solo necesita ver qué sigue.

### Formato del guion

Una línea = una frase, acotación o pie de entrada. Hay un formato opcional
para distinguir diálogo de contexto de escena, útil en los dos modos:

- `[texto]` o `(texto)` → **acotación / contexto de escena** (por ejemplo
  `[Entra Moki por la puerta]`). No se lee en voz alta: se muestra en cursiva
  y marcada como "ACOTACIÓN" en vez del texto grande principal.
- `NOMBRE: texto` (nombre en mayúsculas) → línea de diálogo con etiqueta de
  quién habla, por ejemplo `MOKI: ¿Quién anda ahí?`.
- Línea simple, sin formato → se trata como diálogo sin marcar, igual que
  antes. Si no usás el formato, el prompter funciona exactamente como antes.

### Convertir un guion existente al formato con IA

Si ya tenés el guion escrito en otro formato (un documento, un guion técnico,
lo que sea), no hace falta reescribirlo a mano. En el panel "Guion" tocá
**🤖 Formato para IA**: se abre una ventana con instrucciones listas para
copiar y pegar en cualquier asistente de IA (ChatGPT, Claude, etc.), seguidas
de tu guion original. La IA te devuelve el texto ya separado en líneas, con
acotaciones entre corchetes y personajes en mayúsculas seguidos de dos
puntos — listo para pegar en el cuadro de "Guion" de la app.

### Apariencia del texto

El botón **⚙ Apariencia**, arriba a la derecha (disponible en cualquier
pestaña), abre un panel rápido para ajustar cómo se ve el texto en pantalla:

- **Tamaño de letra**: escala el texto principal del Monitor y de
  "Sincronizar" (60%–180%).
- **Color de texto**: color del diálogo/línea principal.
- **Color de acotaciones**: color con el que se resaltan las acotaciones de
  escena (`[texto]`/`(texto)`) en cursiva, tanto en el Monitor como en las
  listas de líneas.

Los cambios se aplican al instante (incluida la ventana emergente, si la
tenés abierta) y quedan guardados en este navegador para la próxima vez.
**Restablecer** vuelve a los valores por defecto.

### 1. Editor

- Elegí el modo (con audio o solo guion) arriba de todo.
- Pegá el guion en el cuadro de texto y presioná **Aplicar guion**.
- *Modo con audio:* cargá el archivo de audio del episodio en "Audio del
  episodio". *(Opcional)* si no tenés el guion escrito, podés generar un
  borrador con **Transcribir con IA (servidor local)** a partir del audio —
  ver [Transcripción automática](#transcripción-automática-opcional). Siempre
  revisá el texto antes de aplicarlo.
- *Modo solo guion:* no hace falta audio, esta sección queda oculta.
- En "Guardar / cargar" podés **Guardar** el proyecto (guion + estado + modo)
  en este navegador, **Cargar** uno guardado antes, o **Exportar/Importar
  .json** para pasarlo a otra máquina. **Nuevo** borra todo y empieza de
  cero.
- Cuando el guion está listo (y el audio cargado, si aplica), presioná
  **Iniciar sincronización →** (modo con audio) o **Iniciar guion →** (modo
  solo guion, va directo a Monitor).

### 2. Sincronizar (solo modo con audio)

Acá le decís a la app en qué segundo del audio empieza cada línea:

- **▶ Reproducir** el audio y presioná **MARCAR** (o la tecla `Enter`) justo
  cuando empieza cada línea, en orden. El contador "X / Y líneas marcadas" te
  muestra el avance.
- **Deshacer** retrocede una marca a la vez si te equivocaste.
- *(Opcional)* **⚡ Auto-sincronizar (IA local)** calcula las marcas de tiempo
  automáticamente en vez de marcarlas a mano — ver
  [Sincronización automática](#sincronización-automática-opcional). Después
  podés seguir corrigiendo líneas puntuales a mano igual que siempre.

Cuando todas las líneas quedan marcadas, se habilita **Monitor**. En modo
solo guion esta pestaña no existe: se salta directo del Editor al Monitor.

### 3. Monitor

Esta es la vista para operar en vivo. Los controles cambian según el modo:

**Modo con audio:**

- **▶** reproduce el audio en sincronía con el guion; el texto avanza solo
  línea por línea siguiendo las marcas de tiempo.
- **⏮ Reiniciar** vuelve al principio, **⏪ 5s** retrocede 5 segundos.
- **◀ línea** / **línea ▶** saltan manualmente de línea (útil para ensayar o
  corregir en vivo); **Volver a auto** retoma el avance automático.
- Atajos de teclado: `Espacio` reproduce/pausa, `←`/`→` saltan de línea, `A`
  vuelve a automático.

**Modo solo guion (sin audio):**

- **◀ línea** / **línea ▶** avanzan manualmente, a tu ritmo, mientras hablás
  en vivo. **⏮ Reiniciar** vuelve al principio.
- **▶ Avance automático** hace avanzar el guion solo cada N segundos (campo
  numérico al lado, editable en cualquier momento incluso mientras corre);
  útil como referencia de ritmo, aunque lo pensado es el avance manual.
- Debajo del texto principal hay una **lista de todas las líneas**,
  clickeable: sirve para saltar directo a cualquier línea si te perdés,
  sin tener que avanzar de a una.
- Atajos de teclado: `Espacio` inicia/pausa el avance automático, `←`/`→` (o
  `Enter`) saltan de línea a mano, `R` reinicia.

**En ambos modos:**

- Las acotaciones de escena (`[...]`/`(...)`) se muestran en cursiva con la
  marca "ACOTACIÓN", separadas visualmente del diálogo.
- **⛶ Pantalla completa** para leer cómodo durante la grabación o la función.
- **🗗 Ventana emergente** abre el monitor en una ventana aparte (por ejemplo
  para mandarla a una segunda pantalla mientras controlás todo desde la
  principal).

## Cuándo hace falta un servidor local

Con doble clic en `apuntador.html` (abre como `file://...`) funciona completo
en la mayoría de los casos. Hay dos escenarios conocidos donde conviene usar
`start.sh`/`start.bat` en cambio:

- **Firefox bloquea `localStorage` en `file://` por defecto**, así que
  "Guardar" y "Cargar" guion fallan en silencio (el resto de la app sigue
  funcionando igual).
- Algunas políticas corporativas de Chrome/Edge también restringen `file://`.
  Si la consola marca errores al cargar fuentes o guardar el guion, es esto.

`start.sh`/`start.bat` levantan un servidor con Python y abren el navegador
solos — ver el mensaje en pantalla del propio script para el detalle de qué
está haciendo en cada paso. Si preferís hacerlo a mano:

```bash
cd ruta/a/prompter-crea
python3 -m http.server 8000        # Windows: puede ser "python" en vez de "python3"
```

Abrí `http://localhost:8000/apuntador.html`.

Alternativa con Node (si no tenés Python pero sí Node.js):

```bash
cd ruta/a/prompter-crea
npx serve .
```

## Transcripción automática (opcional)

Convierte el audio a texto con [Whisper](https://github.com/openai/whisper)
(vía [faster-whisper](https://github.com/SYSTRAN/faster-whisper)) corriendo
100% local en tu CPU, sin mandar el audio a ningún servidor externo. Es
opcional: si no la usás, escribís el guion a mano como siempre.

**Instalación (una sola vez, requiere internet):**

- Mac/Linux: `./install_ai.sh`
- Windows: doble clic en `install_ai.bat`

**Para usarla, antes de darle al botón en la app tenés que levantar los
servidores:**

- Mac/Linux: `./start_ai.sh`
- Windows: doble clic en `start_ai.bat`

Esto deja corriendo `transcribe_server.py` en `http://127.0.0.1:8765`; el
script te va avisando en pantalla cuando el modelo terminó de cargar y el
servidor está listo. Si el botón "Transcribir con IA" no encuentra el
servidor corriendo, te lo dice en pantalla en vez de fallar en silencio.

**Sobre el hardware:** por defecto usa el modelo `base` (buen balance
velocidad/precisión en CPU). Si tu máquina es lenta o el audio es largo, usá
`tiny`; con máquina más potente o GPU podés subir a `small` o `medium`:

```bash
APUNTADOR_WHISPER_MODEL=tiny python3 transcribe_server.py
```

Otras variables opcionales: `APUNTADOR_WHISPER_LANG` (idioma del audio,
default `es`), `APUNTADOR_PORT` (default `8765`).

**Revisá el texto antes de aplicarlo** — la separación en líneas depende de
las pausas que detecta Whisper, no siempre coincide con cómo preferís
organizar el guion.

## Sincronización automática (opcional)

Toma el guion que ya escribiste (tal cual, sin cambiarlo) y el audio, y
calcula en qué segundo empieza cada línea usando *forced alignment*
([MMS_FA](https://pytorch.org/audio/stable/pipelines.html#torchaudio.pipelines.MMS_FA),
de Meta). Es opcional: el marcado manual con "MARCAR" sigue funcionando igual
y sirve para corregir líneas puntuales después.

**Instalación y arranque:** los mismos `install_ai.sh`/`install_ai.bat` y
`start_ai.sh`/`start_ai.bat` de arriba levantan también este servidor
(`sync_server.py` en `http://127.0.0.1:8766`) — no hace falta nada aparte.

**Sobre el hardware:** usa GPU NVIDIA automáticamente si está disponible
(`torch.cuda.is_available()`); si no, cae a CPU sin que tengas que cambiar
nada. El terminal (o `GET http://127.0.0.1:8766/health`) te dice qué
dispositivo quedó activo.

Para que la GPU se use de verdad (por ejemplo una GeForce GTX 1650 Super u
otra NVIDIA con CUDA), instalá la build de PyTorch con CUDA en vez de la que
trae `install_ai`:

```bash
# Windows, GPU NVIDIA — instala PyTorch con soporte CUDA
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install av uroman
```

Requiere el driver normal de NVIDIA (el mismo que usás para jugar; no hace
falta el CUDA Toolkit aparte). Si el comando falla o tu driver es
más nuevo/viejo, [pytorch.org/get-started](https://pytorch.org/get-started/locally/)
te da el comando exacto (elegí "Windows" + "Pip" + "CUDA"). Sin la build CUDA,
igual funciona, solo que más lento (CPU).

**Sobre líneas que no se pudieron alinear:** una acotación entre paréntesis
sin diálogo, por ejemplo, puede quedar sin marca automática. La app avisa
cuántas líneas quedaron pendientes; completalas a mano con "MARCAR" desde ahí.

**Revisá las marcas antes de pasar a Monitor** — repasá la columna de tiempos
en "Sincronizar" y corregí a mano lo que haga falta ("Deshacer" retrocede
línea por línea).

## Notas generales sobre las funciones de IA

- Ambas requieren internet **solo la primera vez** que corren (para
  descargar los modelos); después quedan cacheados en disco y funcionan sin
  conexión, igual que el resto del prompter.
- Si algo falla, `install_ai`/`start_ai` te muestran el error en pantalla en
  vez de fallar en silencio.
