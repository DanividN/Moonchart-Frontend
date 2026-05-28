import React from 'react';
import { useChartStore, Note, AISuggestion } from '../../../store/useChartStore';
import { 
  Sliders, Cpu, Sparkles, AlertTriangle, CheckCircle, 
  Volume2, Activity, Trash2, Check, RefreshCw 
} from 'lucide-react';
import { APIClient } from '../../../core/api';
import { audioEngine } from '../../../core/audio/audioEngine';
import Swal from 'sweetalert2';

export const Sidebar: React.FC = () => {
  const {
    songVolume,
    guitarVolume,
    bassVolume,
    drumsVolume,
    vocalsVolume,
    backingVolume,
    processingStatus,
    aiSuggestions,
    validationWarnings,
    audioFile,
    activeInstrument,
    activeDifficulty,
    setStemVolume,
    setProcessingJob,
    setSuggestions,
    setWarnings,
    acceptAllSuggestions,
    acceptAISuggestion,
    clearNotes,
    lyricsText,
    setLyricsText
  } = useChartStore();

  const [lyricsMode, setLyricsMode] = React.useState<'simple' | 'timestamped'>('simple');
  const [stemFile, setStemFile] = React.useState<File | null>(null);

  // Clear the stem file if the active instrument changes
  React.useEffect(() => {
    setStemFile(null);
  }, [activeInstrument]);

  const handleLyricsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setLyricsText(text);
      };
      reader.readAsText(file);
    }
  };

  const parseTimestampedLyrics = (text: string) => {
    const lines = text.split('\n');
    const result: { seconds: number; text: string }[] = [];
    const regex = /\[(\d{1,2}:)?(\d{1,2}):(\d{1,2})(\.\d+)?\]|\[(\d+(\.\d+)?)\]/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const match = trimmed.match(regex);
      if (match) {
        let seconds = 0;
        if (match[5] !== undefined) {
          seconds = parseFloat(match[5]);
        } else {
          const hoursPart = match[1] ? parseFloat(match[1].replace(':', '')) : 0;
          const minutes = parseFloat(match[2]);
          const secs = parseFloat(match[3]) + (match[4] ? parseFloat(match[4]) : 0);
          seconds = hoursPart * 3600 + minutes * 60 + secs;
        }
        const textPart = trimmed.replace(match[0], '').trim();
        result.push({ seconds, text: textPart });
      }
    }
    return result;
  };

  const handleSyncTimestampedLyrics = () => {
    if (!lyricsText.trim()) {
      Swal.fire({
        title: 'Líricas Vacías',
        text: 'Por favor, ingresa o carga líricas con marcas de tiempo primero.',
        icon: 'warning',
        background: '#09090b',
        color: '#f4f4f5',
        confirmButtonColor: '#8b5cf6',
      });
      return;
    }

    const parsed = parseTimestampedLyrics(lyricsText);
    if (parsed.length === 0) {
      Swal.fire({
        title: 'Formato Incorrecto',
        text: 'No se detectaron marcas de tiempo válidas. Usa el formato [00:12] o [12] al inicio de cada línea de estrofa.',
        icon: 'warning',
        background: '#09090b',
        color: '#f4f4f5',
        confirmButtonColor: '#8b5cf6',
      });
      return;
    }

    const { bpm, ticksPerBeat, activeDifficulty, notes, pushHistory } = useChartStore.getState();
    const ticksPerSecond = ticksPerBeat * (bpm / 60);

    pushHistory();

    // Clear existing vocal notes for the active difficulty
    const nonVocalNotes = notes.filter(n => !(n.instrument === 'vocals' && n.difficulty === activeDifficulty));

    const newVocalNotes: Note[] = [];
    parsed.forEach((stanza) => {
      const startTick = Math.floor(stanza.seconds * ticksPerSecond);
      const words = stanza.text.split(/\s+/).filter(Boolean);
      
      words.forEach((word, idx) => {
        // Space each word by 1 beat (192 ticks)
        const tick = startTick + idx * 192;
        newVocalNotes.push({
          id: `note-vocal-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          tick,
          lane: 0,
          duration: 96, // default 0.5 beat duration to look visual immediately
          difficulty: activeDifficulty,
          instrument: 'vocals',
          lyric: word,
          phraseStart: idx === 0,
          phraseEnd: idx === words.length - 1
        });
      });
    });

    useChartStore.setState({ notes: [...nonVocalNotes, ...newVocalNotes] });
    Swal.fire({
      title: '¡Sincronización Exitosa!',
      html: `Se sincronizaron <strong>${parsed.length}</strong> estrofas (<strong>${newVocalNotes.length}</strong> palabras) en la pista de voz correctamente.`,
      icon: 'success',
      background: '#09090b',
      color: '#f4f4f5',
      confirmButtonColor: '#8b5cf6',
    });
  };

  const handleTriggerAI = async () => {
    if (!audioFile) {
      Swal.fire({
        title: 'Falta Archivo Maestro',
        text: 'Por favor, selecciona y carga un archivo de audio MP3 o WAV en el encabezado primero.',
        icon: 'warning',
        background: '#09090b',
        color: '#f4f4f5',
        confirmButtonColor: '#8b5cf6',
      });
      return;
    }

    if (!stemFile && activeInstrument !== 'vocals') {
      Swal.fire({
        title: 'Falta Stem Aislado',
        text: `Debes subir el archivo de pista aislada (Stem) para la ${activeInstrument === 'drums' ? 'batería' : activeInstrument === 'bass' ? 'bajo' : 'guitarra'} antes de continuar.`,
        icon: 'warning',
        background: '#09090b',
        color: '#f4f4f5',
        confirmButtonColor: '#8b5cf6',
      });
      return;
    }

    setProcessingJob('api-job', 'processing');
    
    // The backend now generates notes. We just provide a minimal fallback for development if needed.
    const makeSuggestionsFallback = () => {
      return [];
    };

    try {
      // 1. Upload Audio File Asset to FastAPI directly (Master track)
      await APIClient.uploadAudio(audioFile);

      // 1.5 Upload Stem File (Target instrument track)
      if (stemFile && activeInstrument !== 'vocals') {
        await APIClient.uploadStem(stemFile);
      }

      // 2. Trigger Celery audio separator and midi analyzer
      const { bpm } = useChartStore.getState();
      const jobResponse = await APIClient.triggerAnalysis(activeInstrument, bpm, true); // true = bypass demucs
      const jobId = jobResponse.id;

      // 3. Poll Job status
      const job = await APIClient.pollJob(jobId);

      // Load separated audio stems from backend dynamically!
      await audioEngine.loadStemsFromBackend(jobId);

      // 6. Complete and update state store
      setProcessingJob(jobId, 'completed');
      
      const generatedNotes = job.result_data?.notes || makeSuggestionsFallback();
      setSuggestions(generatedNotes);
      setWarnings([
        { id: 'w-ai-1', tick: 192 * 5, message: 'Detección Rítmica: Patrón de redoble sugerido para Batería.', severity: 'info' },
        { id: 'w-ai-2', tick: 192 * 12, message: 'Sugerencia de marca: Cambio de sección a Solo 1.', severity: 'info' }
      ]);
    } catch (err) {
      console.warn("Connection to FastAPI failed.", err);
      // Clean error state so user knows it failed
      setProcessingJob(null, 'idle');
      Swal.fire({
        title: 'Error de Servidor',
        text: 'Fallo la conexión con el Backend de IA o la autenticación. Revisa que FastAPI esté corriendo (uvicorn app.main:app) y que no haya errores de CORS.',
        icon: 'error',
        background: '#09090b',
        color: '#f4f4f5',
        confirmButtonColor: '#8b5cf6',
      });
    }
  };

  const stems = [
    { id: 'song', label: 'Banda Sonora (Master)', vol: songVolume },
    { id: 'guitar', label: 'Guitarra Stem', vol: guitarVolume },
    { id: 'bass', label: 'Bajo Stem', vol: bassVolume },
    { id: 'drums', label: 'Batería Stem', vol: drumsVolume },
    { id: 'vocals', label: 'Vocales (Voz) Stem', vol: vocalsVolume },
    { id: 'backing', label: 'Acompañamiento', vol: backingVolume },
  ] as const;

  // Dynamically filter validation warnings based on the selected activeInstrument
  const filteredWarnings = validationWarnings.filter(warn => {
    const msg = warn.message.toLowerCase();
    if (activeInstrument === 'guitar') {
      return !msg.includes('batería') && !msg.includes('bajo') && !msg.includes('bombo') && !msg.includes('redoble');
    }
    if (activeInstrument === 'bass') {
      return !msg.includes('batería') && !msg.includes('guitarra') && !msg.includes('bombo') && !msg.includes('redoble');
    }
    if (activeInstrument === 'drums') {
      return !msg.includes('guitarra') && !msg.includes('bajo') && !msg.includes('vocal');
    }
    if (activeInstrument === 'vocals') {
      return msg.includes('voz') || msg.includes('lírica') || msg.includes('sección') || msg.includes('solo') || (!msg.includes('batería') && !msg.includes('guitarra') && !msg.includes('bajo'));
    }
    return true;
  });

  return (
    <div className="w-80 bg-dark-panel border-l border-dark-border flex flex-col h-full shrink-0 z-10 overflow-y-auto">
      
      {/* 1. Stems Sound Mixer */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center gap-2 mb-3 text-zinc-300 font-semibold text-xs tracking-wider uppercase">
          <Sliders size={14} className="text-blue-500" />
          <span>Mezclador de Stems (Multitrack)</span>
        </div>

        <div className="space-y-3">
          {stems.map((stem) => (
            <div key={stem.id} className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-dark-muted font-medium">{stem.label}</span>
                <span className="font-mono text-zinc-400">{(stem.vol * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 size={12} className="text-dark-muted" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={stem.vol}
                  onChange={(e) => setStemVolume(stem.id, parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. AI Copilot Intelligence Center */}
      <div className="p-4 border-b border-dark-border flex-grow flex flex-col min-h-[300px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-zinc-300 font-semibold text-xs tracking-wider uppercase">
            <Cpu size={14} className="text-purple-500" />
            <span>AI Copilot (Madmom Engine)</span>
          </div>
          {processingStatus === 'processing' && (
            <RefreshCw size={12} className="text-purple-400 animate-spin" />
          )}
        </div>

        {/* If vocals are active, render lyrics uploader before the AI Trigger */}
        {activeInstrument === 'vocals' && (
          <div className="mb-4 bg-zinc-900/50 p-3 rounded-lg border border-dark-border flex flex-col flex-grow gap-3">
            <div className="flex items-center justify-between border-b border-dark-border pb-2 shrink-0">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                Letras de la Canción
              </div>
              <div className="flex bg-zinc-950 p-0.5 rounded border border-dark-border">
                <button
                  onClick={() => setLyricsMode('simple')}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${
                    lyricsMode === 'simple'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Texto Plano
                </button>
                <button
                  onClick={() => setLyricsMode('timestamped')}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${
                    lyricsMode === 'timestamped'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Estrofas con Segundos
                </button>
              </div>
            </div>

            {lyricsMode === 'simple' ? (
              <div className="flex flex-col flex-grow gap-2">
                <p className="text-[10px] text-dark-muted shrink-0">
                  Carga un archivo .txt con la letra. Cada palabra se sincronizará secuencialmente a medida que aceptes las sugerencias de voz.
                </p>
                <label className="shrink-0 block w-full py-1.5 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-200 border border-dark-border text-center cursor-pointer transition-all">
                  📁 Seleccionar archivo .txt
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleLyricsFileUpload}
                    className="hidden"
                  />
                </label>
                <textarea
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  placeholder="Escribe o edita la letra aquí..."
                  className="w-full flex-grow min-h-[150px] bg-zinc-950 border border-dark-border text-[10px] text-zinc-300 rounded p-2 outline-none resize-none font-mono focus:border-cyan-500"
                />
              </div>
            ) : (
              <div className="flex flex-col flex-grow gap-2">
                <p className="text-[10px] text-dark-muted shrink-0">
                  Escribe estrofas con su segundo de inicio como <code className="text-cyan-400 bg-zinc-950 px-1 py-0.2 rounded font-mono">[00:12] hola mundo</code> para colocarlas automáticamente.
                </p>
                <textarea
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  placeholder="Ejemplo:&#10;[00:12.50] lo mejor de esta vida&#10;[00:18.00] se me escapa volando"
                  className="w-full flex-grow min-h-[150px] bg-zinc-950 border border-dark-border text-[10px] text-zinc-300 rounded p-2 outline-none resize-none font-mono focus:border-cyan-500"
                />
                <button
                  onClick={handleSyncTimestampedLyrics}
                  className="w-full shrink-0 py-1.5 px-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-[10px] rounded border border-cyan-400/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                >
                  ⚡ Sincronizar Estrofas en el Editor
                </button>
              </div>
            )}
          </div>
        )}

        {activeInstrument !== 'vocals' && (
          <>
            <div className="mb-4 space-y-3 bg-zinc-900/50 p-3 rounded-lg border border-dark-border">
              <div className="pt-2">
                <span className="text-[10px] text-zinc-300 font-medium block mb-1">Cargar Stem de {activeInstrument === 'drums' ? 'Batería' : activeInstrument === 'bass' ? 'Bajo' : 'Guitarra'} (Obligatorio)</span>
                <p className="text-[9px] text-dark-muted mb-2 leading-tight">Sube la pista aislada para evitar el separador de IA y obtener resultados limpios al instante.</p>
                
                <label className="block w-full py-2 px-3 rounded bg-zinc-950 border border-dark-border border-dashed hover:border-purple-500 hover:text-purple-400 text-[10px] font-bold text-zinc-400 text-center cursor-pointer transition-all">
                  {stemFile ? `🎵 ${stemFile.name}` : '📁 Seleccionar Stem (.mp3 o .wav)'}
                  <input
                    type="file"
                    accept=".mp3,.wav,.ogg"
                    onChange={(e) => setStemFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Trigger analysis button */}
            <button
              onClick={handleTriggerAI}
              disabled={processingStatus === 'processing' || (!stemFile && activeInstrument !== 'vocals')}
              className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                processingStatus === 'processing'
                  ? 'bg-purple-950/40 border border-purple-800 text-purple-400 cursor-not-allowed'
                  : (!stemFile && activeInstrument !== 'vocals')
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/10 active:scale-[0.98]'
              }`}
            >
              <Sparkles size={14} />
              {processingStatus === 'processing' 
                ? (activeInstrument === 'vocals' ? 'Sincronizando lírica...' : 'Analizando audio...') 
                : (activeInstrument === 'vocals' ? 'Autogenerar Lírica con IA' : 'Autogenerar Notas con IA')}
            </button>

            {/* AI Recommendations Dashboard */}
            <div className="mt-4 flex-grow flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">
                  Recomendaciones detectadas ({aiSuggestions.length})
                </span>
                {aiSuggestions.length > 0 && (
                  <button
                    onClick={acceptAllSuggestions}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-all bg-purple-950/40 hover:bg-purple-600 hover:text-white px-2 py-0.5 rounded border border-purple-800/40 cursor-pointer active:scale-95"
                    title="Aceptar y agregar todas las sugerencias de la IA a la pista de una sola vez"
                  >
                    Aceptar todas
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 flex-grow">
                {aiSuggestions.length === 0 ? (
                  <div className="border border-dashed border-dark-border rounded-lg p-4 text-center text-xs text-dark-muted flex flex-col items-center justify-center gap-2">
                    <Activity size={18} className="text-dark-muted opacity-40 animate-pulse" />
                    <span>No hay sugerencias de notas listas. Ejecuta el pipeline de IA arriba.</span>
                  </div>
                ) : (
                  aiSuggestions.map((sug) => (
                    <div 
                      key={sug.id}
                      className="bg-zinc-900 border border-dark-border rounded-lg p-2 flex items-center justify-between gap-3 group hover:border-purple-600/40 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-purple-950 text-purple-400 px-1 py-0.2 rounded font-mono font-semibold">
                            Tick {sug.tick}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-300">
                            {sug.reason}
                          </span>
                        </div>
                        <span className="text-[9px] text-dark-muted">
                          Confianza: {(sug.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <button
                        onClick={() => acceptAISuggestion(sug.id)}
                        className="p-1 rounded bg-purple-950/40 hover:bg-purple-600 text-purple-400 hover:text-white transition-colors"
                        title="Aceptar nota y agregar a pista"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Real-time Clear Panel */}
      <div className="p-4 bg-zinc-950/50">
        <button
          onClick={clearNotes}
          className="w-full py-1.5 rounded-lg border border-red-900/50 hover:bg-red-950/20 text-red-400 hover:text-red-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 size={13} /> Limpiar todo el Chart
        </button>
      </div>

    </div>
  );
};
