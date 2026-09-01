(function(){
  // ---------- state ----------
  let script = [];
  let timestamps = [];
  let mode = 'audio'; // 'audio' | 'noaudio'
  let audioURL = null;
  let lastAudioFile = null;
  let syncIndex = 0;
  let manualOverride = false;   // audio-mode: manual step override while audio keeps playing
  let manualIndex = -1;         // audio-mode manual override index, and noaudio mode's current index
  let currentView = 'editor';
  let karaokeLineIdx = -2;
  let karaokeWordEntries = [];
  let popoutWin = null;
  let popoutRefs = null;
  let autoAdvanceTimer = null;
  let autoAdvancePlaying = false;
  let autoAdvanceSeconds = 4;

  // ---------- dom refs ----------
  const cueBar = document.getElementById('cueBar');
  const stateLabel = document.getElementById('stateLabel');
  const tabs = document.querySelectorAll('.tab');
  const syncTab = document.querySelector('.tab[data-view="sync"]');
  const monitorTab = document.querySelector('.tab[data-view="monitor"]');
  const views = { editor: document.getElementById('view-editor'), sync: document.getElementById('view-sync'), monitor: document.getElementById('view-monitor') };

  const modeButtons = document.querySelectorAll('.modeBtn');
  const modeHint = document.getElementById('modeHint');
  const audioSection = document.getElementById('audioSection');

  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const fontScaleInput = document.getElementById('fontScaleInput');
  const fontScaleValue = document.getElementById('fontScaleValue');
  const textColorInput = document.getElementById('textColorInput');
  const directionColorInput = document.getElementById('directionColorInput');
  const resetAppearanceBtn = document.getElementById('resetAppearanceBtn');

  const aiFormatBtn = document.getElementById('aiFormatBtn');
  const aiFormatOverlay = document.getElementById('aiFormatOverlay');
  const aiFormatText = document.getElementById('aiFormatText');
  const copyAiFormatBtn = document.getElementById('copyAiFormatBtn');
  const closeAiFormatBtn = document.getElementById('closeAiFormatBtn');
  const aiFormatStatus = document.getElementById('aiFormatStatus');

  const scriptInput = document.getElementById('scriptInput');
  const applyScriptBtn = document.getElementById('applyScriptBtn');
  const scriptCount = document.getElementById('scriptCount');
  const audioInput = document.getElementById('audioInput');
  const audioInfo = document.getElementById('audioInfo');
  const audioEl = document.getElementById('audioEl');
  const transcribeBtn = document.getElementById('transcribeBtn');
  const transcribeStatus = document.getElementById('transcribeStatus');
  const startSyncBtn = document.getElementById('startSyncBtn');
  const startSyncHint = document.getElementById('startSyncHint');

  const projectName = document.getElementById('projectName');
  const saveProjectBtn = document.getElementById('saveProjectBtn');
  const savedSelect = document.getElementById('savedSelect');
  const refreshSavedBtn = document.getElementById('refreshSavedBtn');
  const loadProjectBtn = document.getElementById('loadProjectBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importInput = document.getElementById('importInput');
  const saveStatus = document.getElementById('saveStatus');
  const newProjectBtn = document.getElementById('newProjectBtn');

  const syncCounter = document.getElementById('syncCounter');
  const syncLine = document.getElementById('syncLine');
  const syncPlayBtn = document.getElementById('syncPlayBtn');
  const markBtn = document.getElementById('markBtn');
  const undoMarkBtn = document.getElementById('undoMarkBtn');
  const autoSyncBtn = document.getElementById('autoSyncBtn');
  const autoSyncStatus = document.getElementById('autoSyncStatus');
  const syncList = document.getElementById('syncList');

  const monitorStage = document.getElementById('monitorStage');
  const stageMainEmpty = document.getElementById('stageMainEmpty');
  const stageMainReady = document.getElementById('stageMainReady');
  const monitorFooter = document.getElementById('monitorFooter');
  const prevLineEl = document.getElementById('prevLine');
  const curLineEl = document.getElementById('curLine');
  const nextLineEl = document.getElementById('nextLine');
  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');
  const lineListPanel = document.getElementById('lineListPanel');
  const audioTransportRow = document.getElementById('audioTransportRow');
  const noAudioTransportRow = document.getElementById('noAudioTransportRow');
  const timeLabel = document.getElementById('timeLabel');
  const restartBtn = document.getElementById('restartBtn');
  const back5Btn = document.getElementById('back5Btn');
  const monitorPlayBtn = document.getElementById('monitorPlayBtn');
  const manualChip = document.getElementById('manualChip');
  const stepPrevBtn = document.getElementById('stepPrevBtn');
  const stepNextBtn = document.getElementById('stepNextBtn');
  const autoBackBtn = document.getElementById('autoBackBtn');
  const naCounter = document.getElementById('naCounter');
  const naRestartBtn = document.getElementById('naRestartBtn');
  const naStepPrevBtn = document.getElementById('naStepPrevBtn');
  const naStepNextBtn = document.getElementById('naStepNextBtn');
  const autoAdvanceToggle = document.getElementById('autoAdvanceToggle');
  const autoAdvanceSecondsInput = document.getElementById('autoAdvanceSeconds');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const popoutBtn = document.getElementById('popoutBtn');

  // ---------- helpers ----------
  function fmt(t){
    if(!isFinite(t) || t<0) t = 0;
    const m = Math.floor(t/60).toString().padStart(2,'0');
    const s = Math.floor(t%60).toString().padStart(2,'0');
    return m+':'+s;
  }
  function isTyping(){
    const a = document.activeElement;
    return a && (a.tagName==='TEXTAREA' || a.tagName==='INPUT');
  }
  function fullySynced(){
    return script.length>0 && timestamps.length===script.length && timestamps.every(t=>t!==null);
  }
  function monitorReady(){
    return mode==='audio' ? fullySynced() : script.length>0;
  }
  function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  // ---------- script line parsing ----------
  // Formato opcional por línea:
  //   [texto] o (texto)  -> acotación / contexto de escena, no se lee en voz alta
  //   NOMBRE: texto      -> línea de diálogo con el personaje que habla
  //   texto simple       -> línea de diálogo sin marcar (comportamiento anterior)
  function parseScriptLine(raw){
    const t = (raw||'').trim();
    let m = t.match(/^\[(.+)\]$/) || t.match(/^\((.+)\)$/);
    if(m) return { type:'direction', speaker:null, text:m[1].trim() };
    m = t.match(/^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ']{0,28}):\s*(.+)$/);
    if(m && m[2].trim().length>0) return { type:'line', speaker:m[1].trim(), text:m[2].trim() };
    return { type:'line', speaker:null, text:t };
  }
  function lineDisplayText(raw){
    const p = parseScriptLine(raw);
    if(p.type==='direction') return '🎭 ' + p.text;
    if(p.speaker) return p.speaker + ': ' + p.text;
    return p.text;
  }
  function renderStaticLineInto(el, raw){
    el.innerHTML = '';
    const p = parseScriptLine(raw);
    el.classList.toggle('direction', p.type==='direction');
    if(p.speaker){
      const tag = document.createElement('span');
      tag.className = 'speakerTag';
      tag.textContent = p.speaker;
      el.appendChild(tag);
    }
    if(p.type==='direction'){
      const label = document.createElement('span');
      label.className = 'directionLabel';
      label.textContent = '🎭 ACOTACIÓN';
      el.appendChild(label);
    }
    el.appendChild(document.createTextNode(p.text));
  }

  // ---------- view switching ----------
  function setView(v){
    if(v==='sync' && !(mode==='audio' && script.length>0 && audioURL)) return;
    if(v==='monitor' && !monitorReady()) return;
    currentView = v;
    Object.keys(views).forEach(k=> views[k].classList.toggle('active', k===v));
    tabs.forEach(t=> t.classList.toggle('active', t.dataset.view===v));
    if(v==='sync'){ renderSync(); }
    if(v==='monitor'){ renderMonitorShell(); renderMonitor(); }
    updateCueState();
  }
  tabs.forEach(t=> t.addEventListener('click', ()=> setView(t.dataset.view)));

  function refreshTabAvailability(){
    if(mode==='audio'){
      syncTab.disabled = !(script.length>0 && audioURL);
      monitorTab.disabled = !fullySynced();
      startSyncBtn.textContent = 'Iniciar sincronización →';
      startSyncBtn.disabled = !(script.length>0 && audioURL);
      startSyncHint.textContent = (script.length>0 && audioURL)
        ? 'Todo listo. Al iniciar, el audio se reinicia a 0:00.'
        : 'Pega el guion, aplícalo, y carga el audio para continuar.';
    } else {
      syncTab.disabled = true;
      monitorTab.disabled = script.length===0;
      startSyncBtn.textContent = 'Iniciar guion →';
      startSyncBtn.disabled = script.length===0;
      startSyncHint.textContent = script.length>0
        ? 'Todo listo. Se abre el modo de lectura manual, sin audio.'
        : 'Pega el guion y aplícalo para continuar.';
    }
  }

  function applyModeToUI(){
    modeButtons.forEach(b=> b.classList.toggle('active', b.dataset.mode===mode));
    audioSection.classList.toggle('hidden', mode!=='audio');
    syncTab.classList.toggle('hidden', mode==='noaudio');
    monitorTab.textContent = mode==='noaudio' ? 'Guion en vivo' : 'Monitor';
    modeHint.textContent = mode==='audio'
      ? 'Con audio: sincronizás el guion con una grabación y el monitor avanza solo siguiendo el audio.'
      : 'Solo guion: sin audio. Avanzás línea por línea a mano (o con avance automático por tiempo) — pensado para quien maneja la marioneta y habla en vivo.';
    refreshTabAvailability();
  }
  modeButtons.forEach(b=> b.addEventListener('click', ()=>{
    if(b.dataset.mode===mode) return;
    stopAutoAdvance();
    mode = b.dataset.mode;
    applyModeToUI();
  }));

  function updateCueState(){
    let state = 'standby', label = '○ EN PREPARACIÓN';
    if(currentView==='sync'){ state='sync'; label='● SINCRONIZANDO'; }
    else if(currentView==='monitor'){
      if(!monitorReady()){ state='standby'; label='○ EN PREPARACIÓN'; }
      else if(mode==='noaudio'){
        state = autoAdvancePlaying ? 'onair' : 'manual';
        label = autoAdvancePlaying ? '▶ AVANCE AUTOMÁTICO' : '📜 GUION MANUAL';
      }
      else if(manualOverride){ state='manual'; label='◆ MANUAL'; }
      else if(!audioEl.paused){ state='onair'; label='● AL AIRE'; }
      else { state='pause'; label='❚❚ EN PAUSA'; }
    }
    cueBar.className = state;
    stateLabel.textContent = label;
  }

  // ---------- apariencia (tamaño y color del texto) ----------
  const DEFAULT_APPEARANCE = { fontScale: 1, textColor: '#edeff3', directionColor: '#8a93a3' };
  let appearance = Object.assign({}, DEFAULT_APPEARANCE);

  function applyAppearance(){
    document.documentElement.style.setProperty('--mon-font-scale', appearance.fontScale);
    document.documentElement.style.setProperty('--mon-text-color', appearance.textColor);
    document.documentElement.style.setProperty('--mon-direction-color', appearance.directionColor);
    fontScaleInput.value = appearance.fontScale;
    fontScaleValue.textContent = Math.round(appearance.fontScale*100) + '%';
    textColorInput.value = appearance.textColor;
    directionColorInput.value = appearance.directionColor;
    syncPopoutAppearance();
  }
  function saveAppearance(){
    try{ localStorage.setItem('apuntadorAppearance', JSON.stringify(appearance)); }catch(err){ /* localStorage no disponible */ }
  }
  function loadAppearance(){
    try{
      const raw = localStorage.getItem('apuntadorAppearance');
      if(raw) appearance = Object.assign({}, DEFAULT_APPEARANCE, JSON.parse(raw));
    }catch(err){ /* localStorage no disponible o dato inválido: se queda con los valores por defecto */ }
  }

  settingsBtn.addEventListener('click', ()=> settingsPanel.classList.toggle('hidden'));
  document.addEventListener('click', (e)=>{
    if(settingsPanel.classList.contains('hidden')) return;
    if(e.target===settingsBtn || settingsPanel.contains(e.target)) return;
    settingsPanel.classList.add('hidden');
  });
  fontScaleInput.addEventListener('input', ()=>{
    appearance.fontScale = parseFloat(fontScaleInput.value);
    applyAppearance(); saveAppearance();
  });
  textColorInput.addEventListener('input', ()=>{
    appearance.textColor = textColorInput.value;
    applyAppearance(); saveAppearance();
  });
  directionColorInput.addEventListener('input', ()=>{
    appearance.directionColor = directionColorInput.value;
    applyAppearance(); saveAppearance();
  });
  resetAppearanceBtn.addEventListener('click', ()=>{
    appearance = Object.assign({}, DEFAULT_APPEARANCE);
    applyAppearance(); saveAppearance();
  });

  // ---------- formato de guion para convertir con IA ----------
  const AI_FORMAT_PROMPT = 'Actuá como asistente para preparar guiones para un apuntador (teleprompter) de marionetas. Quiero que reformatees el guion que te paso al final para que cumpla EXACTAMENTE estas reglas:\n\n'
    + 'REGLAS DE FORMATO\n'
    + '1. Una línea de salida = una frase, un golpe de diálogo o una acotación. Cortá las oraciones largas en varias líneas si hay una pausa natural para respirar o cambiar de tono.\n'
    + '2. Las acotaciones o contexto de escena (quién entra o sale, qué pasa en el fondo, sonidos, gestos, cambios de escena) van SOLAS en su propia línea, entre corchetes: [Entra Moki por la puerta]. Estas líneas no se leen en voz alta, son solo referencia para quien opera la marioneta.\n'
    + '3. Cuando una línea es diálogo de un personaje identificable, empezá la línea con el nombre del personaje EN MAYÚSCULAS seguido de dos puntos y un espacio: MOKI: ¿Quién anda ahí?\n'
    + '4. Si una línea de diálogo no tiene un personaje claro (narración, texto genérico), dejala como texto simple, sin corchetes ni nombre.\n'
    + '5. No agregues numeración, viñetas, guiones de lista ni ningún comentario tuyo. La salida tiene que ser SOLO las líneas del guion ya formateadas, una por renglón, en el mismo orden que el original.\n'
    + '6. No traduzcas, resumas ni cambies el contenido ni las palabras del guion original: solo reorganizalo en este formato.\n\n'
    + 'EJEMPLO DE SALIDA ESPERADA\n'
    + '[Moki asoma la cabeza por la puerta]\n'
    + 'MOKI: ¿Quién anda ahí?\n'
    + 'Se escucha un golpe bajo la cama.\n'
    + '[Moki retrocede de un salto]\n'
    + 'MOKI: ¡¿Qué fue eso?!\n\n'
    + 'Ahora convertí este guion siguiendo esas reglas (pegá tu guion debajo de esta línea):\n\n';

  aiFormatBtn.addEventListener('click', ()=>{
    aiFormatText.value = AI_FORMAT_PROMPT;
    aiFormatStatus.textContent = '';
    aiFormatOverlay.classList.remove('hidden');
    aiFormatText.focus();
    aiFormatText.select();
  });
  closeAiFormatBtn.addEventListener('click', ()=> aiFormatOverlay.classList.add('hidden'));
  aiFormatOverlay.addEventListener('click', (e)=>{
    if(e.target===aiFormatOverlay) aiFormatOverlay.classList.add('hidden');
  });
  copyAiFormatBtn.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(AI_FORMAT_PROMPT);
      aiFormatStatus.textContent = 'Copiado al portapapeles.';
    }catch(err){
      aiFormatText.focus();
      aiFormatText.select();
      aiFormatStatus.textContent = 'No se pudo copiar automáticamente. El texto ya está seleccionado: usá Ctrl+C (Cmd+C en Mac).';
    }
  });

  // ---------- editor: script ----------
  applyScriptBtn.addEventListener('click', ()=>{
    const lines = scriptInput.value.split('\n').map(l=>l.trim()).filter(l=>l.length>0);
    if(timestamps.some(t=>t!==null) && lines.length!==script.length){
      if(!confirm('Editar el guion reinicia la sincronización marcada. ¿Continuar?')) return;
    }
    stopAutoAdvance();
    script = lines;
    timestamps = new Array(script.length).fill(null);
    syncIndex = 0;
    manualIndex = -1;
    scriptCount.textContent = script.length + (script.length===1?' línea':' líneas');
    refreshTabAvailability();
  });

  // ---------- editor: audio ----------
  audioInput.addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    lastAudioFile = file;
    if(audioURL) URL.revokeObjectURL(audioURL);
    audioURL = URL.createObjectURL(file);
    audioEl.src = audioURL;
    audioEl.style.display = 'block';
    audioEl.onloadedmetadata = ()=>{
      audioInfo.textContent = file.name + ' · ' + fmt(audioEl.duration);
      transcribeBtn.disabled = false;
      refreshTabAvailability();
    };
  });

  // ---------- editor: transcripción automática (servidor local) ----------
  const TRANSCRIBE_URL = 'http://127.0.0.1:8765';
  transcribeBtn.addEventListener('click', async ()=>{
    if(!lastAudioFile) return;
    if(scriptInput.value.trim().length>0){
      if(!confirm('Esto reemplaza el texto actual del guion con la transcripción automática. ¿Continuar?')) return;
    }
    transcribeBtn.disabled = true;
    transcribeStatus.textContent = 'Buscando servidor de transcripción local en '+TRANSCRIBE_URL+'...';
    try{
      const health = await fetch(TRANSCRIBE_URL+'/health');
      if(!health.ok) throw new Error('health-not-ok');
    }catch(err){
      transcribeStatus.textContent = 'No se encontró el servidor local. Ejecuta "python3 transcribe_server.py" primero (ver README) y vuelve a intentar.';
      transcribeBtn.disabled = false;
      return;
    }
    transcribeStatus.textContent = 'Transcribiendo audio... esto puede tardar varios minutos según la duración y el hardware.';
    try{
      const res = await fetch(TRANSCRIBE_URL+'/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': lastAudioFile.type || 'application/octet-stream',
          'X-Filename': encodeURIComponent(lastAudioFile.name)
        },
        body: lastAudioFile
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'error del servidor');
      const lines = Array.isArray(data.lines) ? data.lines : [];
      scriptInput.value = lines.join('\n');
      transcribeStatus.textContent = 'Transcripción lista (' + lines.length + (lines.length===1?' línea':' líneas') + '). Revisa el texto y pulsa "Aplicar guion".';
    }catch(err){
      transcribeStatus.textContent = 'Error al transcribir: ' + err.message;
    }finally{
      transcribeBtn.disabled = false;
    }
  });

  startSyncBtn.addEventListener('click', ()=>{
    if(mode==='noaudio'){
      manualIndex = -1;
      stopAutoAdvance();
      setView('monitor');
      return;
    }
    timestamps = new Array(script.length).fill(null);
    syncIndex = 0;
    audioEl.currentTime = 0;
    audioEl.pause();
    setView('sync');
  });

  // ---------- sync view ----------
  function renderSync(){
    syncCounter.textContent = syncIndex + ' / ' + script.length + ' líneas marcadas';
    if(syncIndex < script.length){
      renderStaticLineInto(syncLine, script[syncIndex]);
      syncLine.classList.remove('syncDone');
    } else {
      syncLine.innerHTML = '';
      syncLine.classList.remove('direction');
      syncLine.textContent = '✓ Todas las líneas sincronizadas';
      syncLine.classList.add('syncDone');
    }
    markBtn.disabled = syncIndex >= script.length;
    undoMarkBtn.disabled = syncIndex === 0;
    syncList.innerHTML = script.map((l,i)=>{
      const t = timestamps[i];
      const mark = t!==null ? fmt(t) : '···';
      const p = parseScriptLine(l);
      const cls = 'item' + (p.type==='direction' ? ' direction' : '');
      const label = p.type==='direction'
        ? '🎭 '+escapeHtml(p.text)
        : (p.speaker ? '<b>'+escapeHtml(p.speaker)+':</b> ' : '') + escapeHtml(p.text);
      return '<div class="'+cls+'"><span>'+ (i+1) +'. '+ label +'</span><span class="t">'+mark+'</span></div>';
    }).join('');
    refreshTabAvailability();
    updateCueState();
  }

  syncPlayBtn.addEventListener('click', ()=>{
    if(audioEl.paused){ audioEl.play(); syncPlayBtn.textContent='⏸ Pausar'; }
    else { audioEl.pause(); syncPlayBtn.textContent='▶ Reproducir'; }
  });
  markBtn.addEventListener('click', ()=>{
    if(syncIndex >= script.length) return;
    timestamps[syncIndex] = audioEl.currentTime;
    syncIndex++;
    renderSync();
    const items = syncList.querySelectorAll('.item');
    if(items[syncIndex]) items[syncIndex].scrollIntoView({block:'nearest'});
  });
  undoMarkBtn.addEventListener('click', ()=>{
    if(syncIndex===0) return;
    syncIndex--;
    timestamps[syncIndex] = null;
    renderSync();
  });

  // ---------- sync view: auto-sincronizar (servidor local) ----------
  const SYNC_URL = 'http://127.0.0.1:8766';
  function fileToBase64(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onerror = ()=> reject(reader.error);
      reader.onload = ()=> resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
  }
  autoSyncBtn.addEventListener('click', async ()=>{
    if(!lastAudioFile || script.length===0) return;
    if(timestamps.some(t=>t!==null)){
      if(!confirm('Esto reemplaza las marcas de sincronización actuales con el resultado automático. ¿Continuar?')) return;
    }
    autoSyncBtn.disabled = true;
    autoSyncStatus.textContent = 'Buscando servidor de sincronización local en '+SYNC_URL+'...';
    try{
      const health = await fetch(SYNC_URL+'/health');
      if(!health.ok) throw new Error('health-not-ok');
    }catch(err){
      autoSyncStatus.textContent = 'No se encontró el servidor local. Ejecuta "python3 sync_server.py" primero (ver README) y vuelve a intentar.';
      autoSyncBtn.disabled = false;
      return;
    }
    autoSyncStatus.textContent = 'Alineando guion con el audio... esto puede tardar según la duración y el hardware.';
    try{
      const audioBase64 = await fileToBase64(lastAudioFile);
      const res = await fetch(SYNC_URL+'/align', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: lastAudioFile.name, audio_base64: audioBase64, lines: script })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'error del servidor');
      const result = Array.isArray(data.timestamps) ? data.timestamps : [];
      if(result.length !== script.length) throw new Error('el servidor devolvió un número de marcas distinto al de líneas');
      timestamps = result;
      const firstMissing = timestamps.findIndex(t=>t===null);
      syncIndex = firstMissing === -1 ? script.length : firstMissing;
      const missing = timestamps.filter(t=>t===null).length;
      autoSyncStatus.textContent = missing===0
        ? 'Auto-sincronización lista. Revisá las marcas y corregí a mano cualquier línea si hace falta.'
        : 'Auto-sincronización lista, pero ' + missing + (missing===1?' línea no pudo marcarse':' líneas no pudieron marcarse') + ' (revisala manualmente).';
      renderSync();
    }catch(err){
      autoSyncStatus.textContent = 'Error al auto-sincronizar: ' + err.message;
    }finally{
      autoSyncBtn.disabled = false;
    }
  });

  // ---------- monitor view ----------
  function renderMonitorShell(){
    const ready = monitorReady();
    stageMainEmpty.style.display = ready ? 'none' : 'flex';
    stageMainReady.style.display = ready ? 'flex' : 'none';
    monitorFooter.style.display = ready ? 'flex' : 'none';
    if(!ready) return;

    progressWrap.style.display = mode==='audio' ? 'block' : 'none';
    lineListPanel.classList.toggle('hidden', mode!=='noaudio');
    audioTransportRow.classList.toggle('hidden', mode!=='audio');
    noAudioTransportRow.classList.toggle('hidden', mode!=='noaudio');

    if(mode==='audio'){
      progressWrap.querySelectorAll('.tick').forEach(t=>t.remove());
      const dur = audioEl.duration || 1;
      timestamps.forEach(t=>{
        const tick = document.createElement('div');
        tick.className = 'tick';
        tick.style.left = Math.min(100,(t/dur*100)) + '%';
        progressWrap.appendChild(tick);
      });
    }
  }

  function computeIndexFromAudio(t){
    let idx = -1;
    for(let i=0;i<timestamps.length;i++){
      if(timestamps[i]!==null && timestamps[i]<=t) idx = i; else break;
    }
    return idx;
  }

  // ---------- monitor: karaoke word highlight ----------
  // No hay timestamps por palabra, solo por línea: se estima el tiempo de
  // cada palabra repartiendo proporcionalmente (por cantidad de letras) el
  // intervalo entre el arranque de esta línea y el de la siguiente.
  function buildKaraokeSpans(raw){
    curLineEl.innerHTML = '';
    const p = parseScriptLine(raw);
    curLineEl.classList.toggle('direction', p.type==='direction');
    if(p.speaker){
      const tag = document.createElement('span');
      tag.className = 'speakerTag';
      tag.textContent = p.speaker;
      curLineEl.appendChild(tag);
    }
    if(p.type==='direction'){
      const label = document.createElement('span');
      label.className = 'directionLabel';
      label.textContent = '🎭 ACOTACIÓN';
      curLineEl.appendChild(label);
    }
    const tokens = p.text.split(/(\s+)/);
    const entries = [];
    tokens.forEach(tok=>{
      if(tok==='') return;
      if(/^\s+$/.test(tok)){
        curLineEl.appendChild(document.createTextNode(tok));
      } else {
        const span = document.createElement('span');
        span.className = 'kw';
        span.textContent = tok;
        curLineEl.appendChild(span);
        entries.push({ el: span, weight: tok.length, start: 0, end: 0 });
      }
    });
    return entries;
  }

  function computeWordTimings(idx, entries){
    const lineStart = timestamps[idx];
    let lineEnd = (idx+1<timestamps.length && timestamps[idx+1]!==null) ? timestamps[idx+1] : (audioEl.duration || lineStart+1);
    if(lineEnd <= lineStart) lineEnd = lineStart + 0.5;
    const totalWeight = entries.reduce((s,w)=>s+w.weight,0) || 1;
    const dur = lineEnd - lineStart;
    let t = lineStart;
    entries.forEach(w=>{
      w.start = t;
      w.end = t + dur*(w.weight/totalWeight);
      t = w.end;
    });
  }

  function updateKaraoke(idx, time){
    if(idx !== karaokeLineIdx){
      karaokeLineIdx = idx;
      karaokeWordEntries = buildKaraokeSpans(script[idx]);
      computeWordTimings(idx, karaokeWordEntries);
    }
    karaokeWordEntries.forEach(w=>{
      w.el.classList.toggle('kw-done', time>=w.end);
      w.el.classList.toggle('kw-active', time>=w.start && time<w.end);
    });
  }

  // ---------- monitor: lista de líneas (modo sin audio) ----------
  function renderLineListPanel(curIdx){
    lineListPanel.innerHTML = script.map((raw,i)=>{
      const p = parseScriptLine(raw);
      const cls = 'llItem' + (i===curIdx?' current':'') + (p.type==='direction'?' direction':'');
      const label = p.type==='direction'
        ? '🎭 '+escapeHtml(p.text)
        : (p.speaker ? '<b>'+escapeHtml(p.speaker)+':</b> ' : '') + escapeHtml(p.text);
      return '<div class="'+cls+'" data-idx="'+i+'"><span class="llNum">'+(i+1)+'</span><span class="llText">'+label+'</span></div>';
    }).join('');
    const cur = lineListPanel.querySelector('.llItem.current');
    if(cur) cur.scrollIntoView({block:'nearest'});
  }
  lineListPanel.addEventListener('click', (e)=>{
    if(mode!=='noaudio') return;
    const item = e.target.closest('.llItem');
    if(!item) return;
    stopAutoAdvance();
    manualIndex = parseInt(item.dataset.idx,10);
    renderMonitor();
  });

  // ---------- monitor: avance automático por tiempo (modo sin audio) ----------
  function tickAdvance(){
    if(manualIndex >= script.length-1){ stopAutoAdvance(); return; }
    manualIndex++;
    renderMonitor();
  }
  function restartAutoAdvanceTimer(){
    if(autoAdvanceTimer) clearInterval(autoAdvanceTimer);
    autoAdvanceTimer = setInterval(tickAdvance, Math.max(1,autoAdvanceSeconds)*1000);
  }
  function startAutoAdvance(){
    if(mode!=='noaudio' || script.length===0) return;
    if(manualIndex >= script.length-1) manualIndex = -1;
    autoAdvancePlaying = true;
    updateAutoAdvanceUI();
    manualIndex = Math.min(script.length-1, manualIndex+1);
    renderMonitor();
    restartAutoAdvanceTimer();
  }
  function stopAutoAdvance(){
    if(autoAdvanceTimer){ clearInterval(autoAdvanceTimer); autoAdvanceTimer=null; }
    autoAdvancePlaying = false;
    updateAutoAdvanceUI();
  }
  function updateAutoAdvanceUI(){
    autoAdvanceToggle.textContent = autoAdvancePlaying ? '⏸ Pausar avance' : '▶ Avance automático';
    autoAdvanceToggle.classList.toggle('active', autoAdvancePlaying);
    updateCueState();
  }
  autoAdvanceToggle.addEventListener('click', ()=>{
    if(autoAdvancePlaying) stopAutoAdvance(); else startAutoAdvance();
  });
  autoAdvanceSecondsInput.addEventListener('change', ()=>{
    autoAdvanceSeconds = Math.max(1, parseFloat(autoAdvanceSecondsInput.value)||4);
    autoAdvanceSecondsInput.value = autoAdvanceSeconds;
    if(autoAdvancePlaying) restartAutoAdvanceTimer();
  });

  // ---------- monitor: ventana emergente ----------
  function buildPopoutDocument(win){
    win.document.title = 'Apuntador — Monitor';
    const style = win.document.createElement('style');
    style.textContent = `
      :root{ --mon-font-scale:1; --mon-text-color:#EDEFF3; --mon-direction-color:#8A93A3; }
      html,body{ margin:0; height:100%; background:#05070A; color:#EDEFF3; font-family:'Space Grotesk',system-ui,sans-serif; }
      .stage{ height:100vh; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:clamp(14px,3vh,34px); padding:20px 6vw; text-align:center; }
      .prevLine, .nextLine{ font-size:clamp(1rem,2.6vw,1.7rem); color:#4B515C; font-weight:500; line-height:1.4; }
      .curLine{ font-size:calc(clamp(2.1rem,6vw,4.6rem) * var(--mon-font-scale)); font-weight:700; color:var(--mon-text-color); line-height:1.25; }
      .curLine.idle{ color:#4B515C; font-family:'IBM Plex Mono',monospace; font-size:1.6rem; letter-spacing:.2em; }
      .curLine.direction{ font-style:italic; color:var(--mon-direction-color); font-weight:500; }
      .curLine .kw.kw-done{ color:#8A93A3; }
      .curLine .kw.kw-active{ color:#34D399; }
      .speakerTag{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:.72rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#9B8CFF; border:1px solid #9B8CFF; border-radius:4px; padding:3px 9px; margin:0 8px 4px 0; vertical-align:middle; }
      .directionLabel{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:.72rem; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--mon-direction-color); margin:0 8px 4px 0; vertical-align:middle; }
    `;
    win.document.head.appendChild(style);
    win.document.body.innerHTML = '<div class="stage"><div class="prevLine" id="prevLine"></div><div class="curLine" id="curLine">···</div><div class="nextLine" id="nextLine"></div></div>';
    return {
      prevLine: win.document.getElementById('prevLine'),
      curLine: win.document.getElementById('curLine'),
      nextLine: win.document.getElementById('nextLine')
    };
  }

  function syncPopoutAppearance(){
    if(!popoutWin || popoutWin.closed) return;
    popoutWin.document.documentElement.style.setProperty('--mon-font-scale', appearance.fontScale);
    popoutWin.document.documentElement.style.setProperty('--mon-text-color', appearance.textColor);
    popoutWin.document.documentElement.style.setProperty('--mon-direction-color', appearance.directionColor);
  }

  popoutBtn.addEventListener('click', ()=>{
    if(popoutWin && !popoutWin.closed){ popoutWin.focus(); return; }
    popoutWin = window.open('', 'apuntadorMonitorPopout', 'width=1280,height=720');
    if(!popoutWin){
      saveStatus.textContent = 'El navegador bloqueó la ventana emergente. Permití pop-ups para este sitio.';
      return;
    }
    popoutRefs = buildPopoutDocument(popoutWin);
    syncPopoutAppearance();
    renderMonitor();
  });

  function renderMonitor(){
    if(!monitorReady()) return;
    if(popoutWin && popoutWin.closed){ popoutWin = null; popoutRefs = null; }

    const idx = mode==='noaudio'
      ? manualIndex
      : (manualOverride ? manualIndex : computeIndexFromAudio(audioEl.currentTime));

    prevLineEl.textContent = idx-1>=0 ? lineDisplayText(script[idx-1]) : '';
    if(idx===-1){
      curLineEl.textContent = '· · ·';
      curLineEl.classList.add('idle');
      curLineEl.classList.remove('direction');
      karaokeLineIdx = -2;
    } else if(mode==='audio' && !manualOverride){
      curLineEl.classList.remove('idle');
      updateKaraoke(idx, audioEl.currentTime);
    } else {
      curLineEl.classList.remove('idle');
      renderStaticLineInto(curLineEl, script[idx]);
      karaokeLineIdx = -2;
    }
    nextLineEl.textContent = idx+1<script.length ? lineDisplayText(script[idx+1]) : (idx===-1 && script.length>0 ? lineDisplayText(script[0]) : '');

    if(mode==='audio'){
      const dur = audioEl.duration || 0;
      const pct = dur ? (audioEl.currentTime/dur*100) : 0;
      progressFill.style.width = pct + '%';
      progressWrap.querySelectorAll('.tick').forEach((tick,i)=>{
        tick.classList.toggle('done', timestamps[i]!==null && timestamps[i]<=audioEl.currentTime);
      });
      timeLabel.textContent = fmt(audioEl.currentTime) + ' / ' + fmt(dur);
      monitorPlayBtn.textContent = audioEl.paused ? '▶' : '⏸';
      manualChip.textContent = manualOverride ? 'Manual' : 'Auto';
      manualChip.classList.toggle('manualOn', manualOverride);
      autoBackBtn.style.display = manualOverride ? 'inline-block' : 'none';
    } else {
      naCounter.textContent = Math.max(0, idx+1) + ' / ' + script.length + ' líneas';
      naStepPrevBtn.disabled = idx<=-1;
      naStepNextBtn.disabled = idx>=script.length-1;
      renderLineListPanel(idx);
    }
    updateCueState();

    if(popoutRefs){
      popoutRefs.prevLine.textContent = prevLineEl.textContent;
      popoutRefs.nextLine.textContent = nextLineEl.textContent;
      popoutRefs.curLine.innerHTML = curLineEl.innerHTML;
      popoutRefs.curLine.classList.toggle('idle', curLineEl.classList.contains('idle'));
      popoutRefs.curLine.classList.toggle('direction', curLineEl.classList.contains('direction'));
    }
  }

  function monitorHasAudience(){ return currentView==='monitor' || (popoutWin && !popoutWin.closed); }
  audioEl.addEventListener('timeupdate', ()=>{ if(mode==='audio' && monitorHasAudience() && !manualOverride) renderMonitor(); });
  audioEl.addEventListener('play', ()=>{ if(mode==='audio' && monitorHasAudience()) renderMonitor(); });
  audioEl.addEventListener('pause', ()=>{ if(mode==='audio' && monitorHasAudience()) renderMonitor(); });

  monitorPlayBtn.addEventListener('click', ()=>{
    if(audioEl.paused) audioEl.play(); else audioEl.pause();
  });
  restartBtn.addEventListener('click', ()=>{ audioEl.currentTime=0; manualOverride=false; renderMonitor(); });
  back5Btn.addEventListener('click', ()=>{ audioEl.currentTime = Math.max(0, audioEl.currentTime-5); renderMonitor(); });
  stepPrevBtn.addEventListener('click', ()=>{
    if(!manualOverride){ manualOverride=true; manualIndex = computeIndexFromAudio(audioEl.currentTime); }
    manualIndex = Math.max(-1, manualIndex-1);
    renderMonitor();
  });
  stepNextBtn.addEventListener('click', ()=>{
    if(!manualOverride){ manualOverride=true; manualIndex = computeIndexFromAudio(audioEl.currentTime); }
    manualIndex = Math.min(script.length-1, manualIndex+1);
    renderMonitor();
  });
  autoBackBtn.addEventListener('click', ()=>{ manualOverride=false; renderMonitor(); });

  naRestartBtn.addEventListener('click', ()=>{ stopAutoAdvance(); manualIndex=-1; renderMonitor(); });
  naStepPrevBtn.addEventListener('click', ()=>{ stopAutoAdvance(); manualIndex=Math.max(-1, manualIndex-1); renderMonitor(); });
  naStepNextBtn.addEventListener('click', ()=>{ stopAutoAdvance(); manualIndex=Math.min(script.length-1, manualIndex+1); renderMonitor(); });

  fullscreenBtn.addEventListener('click', ()=>{
    if(document.fullscreenElement) document.exitFullscreen();
    else monitorStage.requestFullscreen();
  });

  // ---------- keyboard shortcuts ----------
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape' && !aiFormatOverlay.classList.contains('hidden')){ aiFormatOverlay.classList.add('hidden'); return; }
    if(e.key==='Escape' && !settingsPanel.classList.contains('hidden')){ settingsPanel.classList.add('hidden'); return; }
    if(isTyping()) return;
    if(currentView==='sync'){
      if(e.code==='Space'){ e.preventDefault(); syncPlayBtn.click(); }
      if(e.code==='Enter'){ e.preventDefault(); markBtn.click(); }
    }
    if(currentView==='monitor' && monitorReady()){
      if(mode==='audio'){
        if(e.code==='Space'){ e.preventDefault(); monitorPlayBtn.click(); }
        if(e.code==='ArrowRight'){ e.preventDefault(); stepNextBtn.click(); }
        if(e.code==='ArrowLeft'){ e.preventDefault(); stepPrevBtn.click(); }
        if(e.key==='a' || e.key==='A'){ autoBackBtn.click(); }
      } else {
        if(e.code==='Space'){ e.preventDefault(); autoAdvanceToggle.click(); }
        if(e.code==='ArrowRight' || e.code==='Enter'){ e.preventDefault(); naStepNextBtn.click(); }
        if(e.code==='ArrowLeft'){ e.preventDefault(); naStepPrevBtn.click(); }
        if(e.key==='r' || e.key==='R'){ naRestartBtn.click(); }
      }
    }
  });

  // ---------- persistence: IndexedDB (audio blobs) ----------
  const AUDIO_DB_NAME = 'apuntadorAudio';
  const AUDIO_STORE = 'audioFiles';
  function openAudioDB(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(AUDIO_DB_NAME, 1);
      req.onupgradeneeded = ()=>{ req.result.createObjectStore(AUDIO_STORE); };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }
  async function saveAudioBlob(name, file){
    const db = await openAudioDB();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(AUDIO_STORE, 'readwrite');
      tx.objectStore(AUDIO_STORE).put({ blob: file, name: file.name, type: file.type }, name);
      tx.oncomplete = ()=> resolve();
      tx.onerror = ()=> reject(tx.error);
    });
  }
  async function loadAudioBlob(name){
    const db = await openAudioDB();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const req = tx.objectStore(AUDIO_STORE).get(name);
      req.onsuccess = ()=> resolve(req.result || null);
      req.onerror = ()=> reject(req.error);
    });
  }

  // ---------- persistence: localStorage ----------
  function refreshSavedList(){
    savedSelect.innerHTML = '<option value="">— guiones guardados —</option>';
    try{
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if(k && k.indexOf('project:')===0){
          const name = k.replace('project:','');
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = name;
          savedSelect.appendChild(opt);
        }
      }
    }catch(err){ /* localStorage no disponible: no hay guiones guardados */ }
  }
  refreshSavedBtn.addEventListener('click', refreshSavedList);

  saveProjectBtn.addEventListener('click', async ()=>{
    const name = projectName.value.trim();
    if(!name){ saveStatus.textContent = 'Ponle un nombre al episodio primero.'; return; }
    if(script.length===0){ saveStatus.textContent = 'Aplica un guion antes de guardar.'; return; }
    try{
      const data = JSON.stringify({ script, timestamps, mode, savedAt: Date.now() });
      localStorage.setItem('project:'+name, data);
      if(mode==='audio' && lastAudioFile){
        try{ await saveAudioBlob(name, lastAudioFile); }
        catch(err){ saveStatus.textContent = 'Guion guardado, pero no se pudo guardar el audio: '+err.message; refreshSavedList(); return; }
      }
      saveStatus.textContent = 'Guardado como "'+name+'"'+(mode==='audio' && lastAudioFile?' (con audio).':'.');
      refreshSavedList();
    }catch(err){ saveStatus.textContent = 'Error al guardar: '+err.message; }
  });

  loadProjectBtn.addEventListener('click', async ()=>{
    const name = savedSelect.value;
    if(!name){ saveStatus.textContent = 'Elige un guion guardado.'; return; }
    try{
      const raw = localStorage.getItem('project:'+name);
      if(raw===null){ saveStatus.textContent = 'No se pudo cargar ese guion.'; return; }
      const data = JSON.parse(raw);
      stopAutoAdvance();
      script = data.script; timestamps = data.timestamps || new Array(script.length).fill(null);
      mode = data.mode==='noaudio' ? 'noaudio' : 'audio';
      syncIndex = timestamps.filter(t=>t!==null).length;
      manualIndex = -1;
      scriptInput.value = script.join('\n');
      scriptCount.textContent = script.length + (script.length===1?' línea':' líneas');
      projectName.value = name;
      applyModeToUI();

      let audioRecord = null;
      if(mode==='audio'){
        try{ audioRecord = await loadAudioBlob(name); }catch(err){ /* IndexedDB no disponible */ }
      }

      if(audioRecord && audioRecord.blob){
        lastAudioFile = new File([audioRecord.blob], audioRecord.name || (name+'.audio'), { type: audioRecord.type || audioRecord.blob.type });
        if(audioURL) URL.revokeObjectURL(audioURL);
        audioURL = URL.createObjectURL(lastAudioFile);
        audioEl.src = audioURL;
        audioEl.style.display = 'block';
        audioEl.onloadedmetadata = ()=>{
          audioInfo.textContent = lastAudioFile.name + ' · ' + fmt(audioEl.duration);
          transcribeBtn.disabled = false;
          refreshTabAvailability();
        };
        saveStatus.textContent = 'Cargado "'+name+'" con audio y sincronización.';
      } else if(mode==='audio'){
        saveStatus.textContent = 'Cargado "'+name+'". Vuelve a cargar el mismo archivo de audio para continuar.';
      } else {
        saveStatus.textContent = 'Cargado "'+name+'" (modo solo guion).';
      }
      refreshTabAvailability();
    }catch(err){ saveStatus.textContent = 'No se pudo cargar ese guion.'; }
  });

  // ---------- JSON export / import (portable backup) ----------
  exportBtn.addEventListener('click', ()=>{
    if(script.length===0){ saveStatus.textContent = 'No hay guion para exportar.'; return; }
    const data = JSON.stringify({ script, timestamps, mode }, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (projectName.value.trim() || 'apuntador') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  importBtn.addEventListener('click', ()=> importInput.click());
  importInput.addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        stopAutoAdvance();
        script = data.script || [];
        timestamps = data.timestamps || new Array(script.length).fill(null);
        mode = data.mode==='noaudio' ? 'noaudio' : 'audio';
        syncIndex = timestamps.filter(t=>t!==null).length;
        manualIndex = -1;
        scriptInput.value = script.join('\n');
        scriptCount.textContent = script.length + (script.length===1?' línea':' líneas');
        saveStatus.textContent = mode==='audio' ? 'Importado. Vuelve a cargar el audio para continuar.' : 'Importado (modo solo guion).';
        applyModeToUI();
        refreshTabAvailability();
      }catch(err){ saveStatus.textContent = 'El archivo .json no es válido.'; }
    };
    reader.readAsText(file);
  });

  newProjectBtn.addEventListener('click', ()=>{
    if(!confirm('Esto borra el guion, la sincronización y el audio cargado. ¿Continuar?')) return;
    if(popoutWin && !popoutWin.closed) popoutWin.close();
    popoutWin = null; popoutRefs = null; karaokeLineIdx = -2;
    stopAutoAdvance();
    script = []; timestamps = []; syncIndex = 0; manualOverride = false; manualIndex = -1;
    mode = 'audio';
    scriptInput.value = ''; scriptCount.textContent = '0 líneas';
    if(audioURL) URL.revokeObjectURL(audioURL);
    audioURL = null; lastAudioFile = null; audioEl.removeAttribute('src'); audioEl.style.display='none';
    audioInfo.textContent = 'Sin audio cargado.'; audioInput.value = '';
    transcribeBtn.disabled = true; transcribeStatus.textContent = 'Requiere transcribe_server.py corriendo en esta máquina (ver README). El texto queda editable antes de aplicarlo.';
    autoSyncStatus.textContent = 'Auto-sincronizar requiere sync_server.py corriendo en esta máquina (ver README). Calcula todas las marcas de golpe; podés revisar y corregir cualquier línea a mano después.';
    projectName.value=''; saveStatus.textContent='';
    applyModeToUI();
    refreshTabAvailability();
    setView('editor');
  });

  // ---------- init ----------
  applyModeToUI();
  refreshTabAvailability();
  refreshSavedList();
  loadAppearance();
  applyAppearance();
  updateCueState();
})();
