import React, { useRef, useState } from 'react';
import { Toolbar } from './features/editor/components/Toolbar';
import { Sidebar } from './features/editor/components/Sidebar';
import { ChartCanvas } from './features/editor/components/ChartCanvas';
import { NoteTypePalette } from './features/editor/components/NoteTypePalette';
import { KeyboardLegend } from './features/editor/components/KeyboardLegend';
import { useChartStore } from './store/useChartStore';
import { Disc, Music4, Cpu, Cloud, Upload, Download } from 'lucide-react';
import { MetadataModal } from './features/editor/components/MetadataModal';
import { APIClient } from './core/api';

const App: React.FC = () => {
  const { 
    notes, 
    activeInstrument, 
    activeDifficulty, 
    bpm, 
    songName, 
    audioFile, 
    metadata, 
    processingJobId, 
    setAudioFile 
  } = useChartStore();
  
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const currentChartNotes = notes.filter(n => n.instrument === activeInstrument && n.difficulty === activeDifficulty);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const exportToChartFile = (notesList: any[], beatsPerMin: number, activeMeta: typeof metadata, resolution: number = 192) => {
    let output = `[Song]\n{\n  Name = "${activeMeta.name}"\n  Artist = "${activeMeta.artist}"\n  Charter = "${activeMeta.charter}"\n  Album = "${activeMeta.album}"\n  Year = ", ${activeMeta.year}"\n  Genre = "${activeMeta.genre}"\n  Offset = 0\n  Resolution = ${resolution}\n  Player2 = easy\n  Difficulty = 0\n  PreviewStart = 0\n  PreviewLength = 0\n  SyncTrack = 0\n}\n`;
    output += `[SyncTrack]\n{\n  0 = TS 4\n  0 = B ${beatsPerMin * 1000}\n}\n`;
    output += `[Events]\n{\n}\n`;
    
    output += `[ExpertSingle]\n{\n`;
    notesList
      .filter(n => n.instrument === activeInstrument && n.difficulty === activeDifficulty)
      .forEach(note => {
        if (note.type === 'star_power') {
          output += `  ${note.tick} = S 2 ${note.duration}\n`;
          output += `  ${note.tick} = N ${note.lane} ${note.duration}\n`;
        } else if (note.type === 'solo') {
          output += `  ${note.tick} = S 1 ${note.duration}\n`;
          output += `  ${note.tick} = N ${note.lane} ${note.duration}\n`;
        } else {
          output += `  ${note.tick} = N ${note.lane} ${note.duration}\n`;
        }
      });
    output += `}\n`;
    
    return output;
  };

  const handleExportChart = async (customMeta?: typeof metadata) => {
    try {
      const activeMeta = customMeta || metadata;
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // 1. Generate notes.chart
      const chartContent = exportToChartFile(notes, bpm, activeMeta);
      zip.file("notes.chart", chartContent);

      // 2. Generate song.ini metadata file using customized fields
      const songIniContent = `[song]
name = ${activeMeta.name}
artist = ${activeMeta.artist}
charter = ${activeMeta.charter}
album = ${activeMeta.album}
year = ${activeMeta.year}
genre = ${activeMeta.genre}
song_length = ${Math.floor((notes.length > 0 ? Math.max(...notes.map(n => n.tick)) : 1000) * (60 / bpm) * 1000)}
diff_guitar = ${activeMeta.diff_guitar}
diff_bass = ${activeMeta.diff_bass}
diff_drums = ${activeMeta.diff_drums}
diff_vocals = ${activeMeta.diff_vocals}
diff_band = ${activeMeta.diff_band}
preview_start_time = 0
loading_phrase = Created in Antigravity Mooncharts Pro!
`;
      zip.file("song.ini", songIniContent);

      // 3. Dynamic audio embed: Fetch high-fidelity song.ogg from backend if processed, else fall back to local file
      let audioData: ArrayBuffer | null = null;
      let isOgg = false;

      if (processingJobId && !processingJobId.startsWith('mock') && !processingJobId.startsWith('api-')) {
        try {
          const token = await APIClient.authenticate();
          const response = await fetch(`http://localhost:8000/api/v1/audio/download/stem/${processingJobId}/song`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            audioData = await response.arrayBuffer();
            isOgg = true;
            console.log("Successfully fetched song.ogg from backend Celery MSS output!");
          }
        } catch (err) {
          console.warn("FastAPI offline or failed to fetch song.ogg, falling back to original upload.", err);
        }
      }

      if (!isOgg && audioFile) {
        audioData = await audioFile.arrayBuffer();
      }

      if (audioData) {
        const ext = isOgg ? 'ogg' : (audioFile?.name.split('.').pop() || 'mp3');
        zip.file(`song.${ext}`, audioData);
      }

      // 4. Generate the ZIP blob and trigger browser download with standardized filename
      const zipFileName = `${activeMeta.name} - ${activeMeta.artist}`;
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${zipFileName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate Clone Hero song folder zip", err);
      alert("Error al generar la carpeta del chart. Asegúrate de tener cargada una canción.");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-bg font-sans overflow-hidden select-none">
      
      {/* Premium Header */}
      <header className="h-12 bg-zinc-950 border-b border-dark-border px-4 flex items-center justify-between gap-4 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center glow-blue text-white shadow-lg">
            <Disc size={15} className="animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-100">Antigravity Mooncharts</span>
            <span className="text-[9px] font-medium text-dark-muted -mt-0.5">ESTILO MOONSCRAPER PRO CHART EDITOR</span>
          </div>
        </div>

        {/* Dynamic Project Status Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.8 rounded-full bg-zinc-900 border border-dark-border text-[10px] text-dark-muted">
            <Music4 size={11} className="text-blue-500" />
            <span>Pista: <strong className="text-zinc-200">{songName}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.8 rounded-full bg-zinc-900 border border-dark-border text-[10px] text-dark-muted">
            <span>BPM: <strong className="text-zinc-200">{bpm}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.8 rounded-full bg-zinc-900 border border-dark-border text-[10px] text-dark-muted">
            <span>Notas en Pista: <strong className="text-zinc-200">{currentChartNotes.length}</strong></span>
          </div>
        </div>

        {/* Load & Export Actions */}
        <div className="flex items-center gap-2.5">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAudioUpload} 
            accept=".mp3,.wav" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-dark-border text-[11px] font-bold text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="Cargar archivo MP3 o WAV"
          >
            <Upload size={13} className="text-blue-400" />
            <span>Cargar MP3/WAV</span>
          </button>
          
          <button
            onClick={() => setIsMetadataOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white shadow-lg shadow-emerald-600/15 transition-all active:scale-95 glow-green cursor-pointer"
            title="Personalizar propiedades y exportar como carpeta Clone Hero"
          >
            <Download size={13} />
            <span>Exportar Carpeta</span>
          </button>
        </div>

        {/* API connection state */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-2 py-0.5 rounded-md font-semibold text-[10px]">
            <Cloud size={11} /> Conectado a FastAPI (Port 8000)
          </div>
          <div className="flex items-center gap-1.5 text-purple-400 bg-purple-950/20 border border-purple-900/40 px-2 py-0.5 rounded-md font-semibold text-[10px]">
            <Cpu size={11} /> Madmom/Demucs Pipeline Ready
          </div>
        </div>
      </header>

      {/* Editor Main Area */}
      <div className="flex flex-row flex-grow w-full h-0 relative">
        <div className="flex flex-col flex-grow h-full overflow-hidden relative">
          {/* Main Controls Panel (Vite + Toolbar) */}
          <Toolbar />
          
          {/* Timeline canvas drawing frame */}
          <div className="relative w-full flex-grow flex flex-row overflow-hidden bg-dark-bg">
            <NoteTypePalette />
            <ChartCanvas />
            
            {/* Keyboard short legend panel */}
            <KeyboardLegend />
          </div>
        </div>

        {/* Stems mixers & AI recommendation board */}
        <Sidebar />
      </div>

      {/* Modal interactivo de personalización de metadatos */}
      <MetadataModal 
        isOpen={isMetadataOpen} 
        onClose={() => setIsMetadataOpen(false)} 
        onConfirmExport={handleExportChart} 
      />

    </div>
  );
};

export default App;
