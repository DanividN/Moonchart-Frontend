import React, { useRef, useState } from 'react';
import { Toolbar } from './features/editor/components/Toolbar';
import { Sidebar } from './features/editor/components/Sidebar';
import { ChartCanvas } from './features/editor/components/ChartCanvas';
import { NoteTypePalette } from './features/editor/components/NoteTypePalette';
import { KeyboardLegend } from './features/editor/components/KeyboardLegend';
import { useChartStore } from './store/useChartStore';
import { Disc, Music4, Cpu, Cloud, Upload, Download, Save, FolderOpen } from 'lucide-react';
import { MetadataModal } from './features/editor/components/MetadataModal';
import Swal from 'sweetalert2';
import { exportToMidiFile } from './core/midi/midiExporter';

const App: React.FC = () => {
  const { 
    notes, 
    activeInstrument, 
    activeDifficulty, 
    bpm, 
    songName, 
    audioFile, 
    metadata,
    setAudioFile,
    coverFile,
    videoFile
  } = useChartStore();
  
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const currentChartNotes = notes.filter(n => n.instrument === activeInstrument && n.difficulty === activeDifficulty);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleProjectLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const jsonStr = event.target?.result as string;
        if (jsonStr) {
          const success = useChartStore.getState().loadProject(jsonStr);
          if (success) {
            Swal.fire({
              title: 'Proyecto Cargado',
              text: 'Se ha restaurado el proyecto exitosamente.',
              icon: 'success',
              background: '#09090b',
              color: '#f4f4f5',
              confirmButtonColor: '#8b5cf6',
              timer: 2000,
              showConfirmButton: false
            });
          } else {
            Swal.fire({
              title: 'Error',
              text: 'El archivo de proyecto es inválido o está corrupto.',
              icon: 'error',
              background: '#09090b',
              color: '#f4f4f5',
              confirmButtonColor: '#8b5cf6',
            });
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSaveProject = () => {
    const jsonStr = useChartStore.getState().exportProject();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${metadata.name.replace(/\s+/g, '_')}_project.moonproject`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToChartFile = (notesList: any[], beatsPerMin: number, activeMeta: typeof metadata, resolution: number = 192) => {
    let output = `[Song]\n{\n  Name = "${activeMeta.name}"\n  Artist = "${activeMeta.artist}"\n  Charter = "${activeMeta.charter}"\n  Album = "${activeMeta.album}"\n  Year = "${activeMeta.year}"\n  Genre = "${activeMeta.genre}"\n  Offset = 0\n  Resolution = ${resolution}\n  Player2 = bass\n  Difficulty = 0\n  PreviewStart = 0\n  PreviewLength = 0\n  SyncTrack = 0\n}\n`;
    output += `[SyncTrack]\n{\n  0 = TS 4\n  0 = B ${beatsPerMin * 1000}\n}\n`;

    // 1. Serialize Vocals inside Events track as Clone Hero standard lyrics
    let vocalNotes = notesList.filter(n => n.instrument === 'vocals' && n.difficulty === activeDifficulty);
    if (vocalNotes.length === 0) {
      const diffOrder: ('expert' | 'hard' | 'medium' | 'easy')[] = ['expert', 'hard', 'medium', 'easy'];
      for (const d of diffOrder) {
        const found = notesList.filter(n => n.instrument === 'vocals' && n.difficulty === d);
        if (found.length > 0) {
          vocalNotes = found;
          break;
        }
      }
    }

    // Sort lyrics by tick so they write chronologically
    vocalNotes = [...vocalNotes].sort((a, b) => a.tick - b.tick);

    output += `[Events]\n{\n`;
    if (vocalNotes.length > 0) {
      let isPhraseActive = false;
      let wordsInPhrase = 0;
      
      for (let i = 0; i < vocalNotes.length; i++) {
        const note = vocalNotes[i];
        const prevNote = i > 0 ? vocalNotes[i - 1] : null;
        
        const shouldStartNewPhrase = 
          note.phraseStart || 
          (!isPhraseActive) || 
          (note.phraseStart === undefined && ( (prevNote && (note.tick - prevNote.tick > 768)) || wordsInPhrase >= 6 ));
        
        if (shouldStartNewPhrase) {
          if (isPhraseActive && prevNote) {
            const endTick = prevNote.tick + (prevNote.duration || 96);
            output += `  ${endTick} = E "phrase_end"\n`;
          }
          output += `  ${note.tick} = E "phrase_start"\n`;
          isPhraseActive = true;
          wordsInPhrase = 0;
        }
        
        const lyricText = note.lyric || 'la';
        output += `  ${note.tick} = E "lyric ${lyricText}"\n`;
        wordsInPhrase++;
        
        if (note.phraseEnd || (note.phraseEnd === undefined && i === vocalNotes.length - 1)) {
          const endTick = note.tick + (note.duration || 96);
          output += `  ${endTick} = E "phrase_end"\n`;
          isPhraseActive = false;
        }
      }
      
      if (isPhraseActive) {
        const lastNote = vocalNotes[vocalNotes.length - 1];
        const endTick = lastNote.tick + (lastNote.duration || 96);
        output += `  ${endTick} = E "phrase_end"\n`;
      }
    }
    output += `}\n`;
    
    // 2. Define the difficulty levels and instrument mappings
    const difficulties = [
      { key: 'easy', label: 'Easy' },
      { key: 'medium', label: 'Medium' },
      { key: 'hard', label: 'Hard' },
      { key: 'expert', label: 'Expert' }
    ] as const;

    const instrumentTrackMap = {
      guitar: 'Single',
      bass: 'DoubleBass',
      drums: 'Drums'
    } as const;

    // Loop over each combination of difficulty and instrument to serialize
    difficulties.forEach(({ key: diffKey, label: diffLabel }) => {
      Object.entries(instrumentTrackMap).forEach(([instKey, trackSuffix]) => {
        const trackNotes = notesList
          .filter(n => n.instrument === instKey && n.difficulty === diffKey)
          .sort((a, b) => a.tick - b.tick);
        
        if (trackNotes.length > 0) {
          output += `[${diffLabel}${trackSuffix}]\n{\n`;
          trackNotes.forEach(note => {
            if (note.type === 'star_power') {
              output += `  ${note.tick} = S 2 ${note.duration}\n`;
              output += `  ${note.tick} = N ${note.lane} ${note.duration}\n`;
            } else if (note.type === 'solo') {
              output += `  ${note.tick} = S 1 ${note.duration}\n`;
              output += `  ${note.tick} = N ${note.lane} ${note.duration}\n`;
            } else {
              output += `  ${note.tick} = N ${note.lane} ${note.duration}\n`;
              if (note.type === 'hopo') {
                output += `  ${note.tick} = N 5 0\n`;
              } else if (note.type === 'tap') {
                output += `  ${note.tick} = N 6 0\n`;
              }
            }
          });
          output += `}\n`;
        }
      });
    });
    
    return output;
  };

  const handleExportChart = async (customMeta?: typeof metadata, exportFormat: 'chart' | 'mid' = 'chart') => {
    try {
      const activeMeta = customMeta || metadata;
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // 1. Generate notes file (chart or mid)
      if (exportFormat === 'chart') {
        const chartContent = exportToChartFile(notes, bpm, activeMeta);
        zip.file("notes.chart", chartContent);
      } else {
        const midiContent = exportToMidiFile(notes, bpm, activeMeta);
        zip.file("notes.mid", midiContent);
      }

      // 2. Generate song.ini metadata file using customized fields
      const maxTick = notes.length > 0 ? Math.max(...notes.map(n => n.tick)) : 1000;
      const songLengthMs = Math.floor((maxTick / 192) * (60 / bpm) * 1000);

      const songIniContent = `[song]
name = ${activeMeta.name}
artist = ${activeMeta.artist}
charter = ${activeMeta.charter}
album = ${activeMeta.album}
year = ${activeMeta.year}
genre = ${activeMeta.genre}
song_length = ${songLengthMs}
diff_guitar = ${activeMeta.diff_guitar}
diff_bass = ${activeMeta.diff_bass}
diff_drums = ${activeMeta.diff_drums}
diff_vocals = ${activeMeta.diff_vocals}
diff_band = ${activeMeta.diff_band}
preview_start_time = 0
loading_phrase = Created in Mooncharts Pro!
`;
      zip.file("song.ini", songIniContent);

      // 2b. Package Album Cover Art (album.png) with client-side canvas resizing to 512x512
      if (coverFile) {
        try {
          const resizePromise = () => new Promise<Blob>((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(coverFile);
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 512;
              canvas.height = 512;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                // Center-crop and scale to 512x512
                const size = Math.min(img.width, img.height);
                const offsetX = (img.width - size) / 2;
                const offsetY = (img.height - size) / 2;
                ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 512, 512);
                canvas.toBlob((blob) => {
                  resolve(blob || coverFile);
                }, 'image/png');
              } else {
                resolve(coverFile);
              }
            };
            img.onerror = () => resolve(coverFile);
          });
          
          const coverBlob = await resizePromise();
          const coverData = await coverBlob.arrayBuffer();
          zip.file("album.png", coverData);
          console.log("Successfully optimized and packed album.png!");
        } catch (err) {
          console.error("Failed to compress/resize album cover. Packing original.", err);
          const coverData = await coverFile.arrayBuffer();
          zip.file("album.png", coverData);
        }
      }

      // 2c. Package Background Video (video.mp4) directly
      if (videoFile) {
        try {
          const videoData = await videoFile.arrayBuffer();
          const ext = videoFile.name.split('.').pop() || 'mp4';
          zip.file(`video.${ext}`, videoData);
          console.log(`Successfully packed video.${ext}!`);
        } catch (err) {
          console.error("Failed to pack video file", err);
        }
      }

      // 3. Dynamic audio embed: Fetch high-fidelity song.ogg from backend if processed, else fall back to local file
      let audioData: ArrayBuffer | null = null;
      let isOgg = false;

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
      Swal.fire({
        title: 'Error de Exportación',
        text: 'Error al generar la carpeta del chart. Asegúrate de tener cargada una canción.',
        icon: 'error',
        background: '#09090b',
        color: '#f4f4f5',
        confirmButtonColor: '#8b5cf6',
      });
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
            <span className="text-xs font-black uppercase tracking-wider text-zinc-100">Mooncharts</span>
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
          {/* Project Load / Save */}
          <input 
            type="file" 
            ref={projectInputRef} 
            onChange={handleProjectLoad} 
            accept=".moonproject,.json" 
            className="hidden" 
          />
          <button
            onClick={() => projectInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-dark-border text-[11px] font-bold text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="Cargar Proyecto Naitvo (.moonproject)"
          >
            <FolderOpen size={13} className="text-amber-400" />
            <span>Cargar Proyecto</span>
          </button>

          <button
            onClick={handleSaveProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-dark-border text-[11px] font-bold text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="Guardar Proyecto para editarlo luego"
          >
            <Save size={13} className="text-indigo-400" />
            <span>Guardar Proyecto</span>
          </button>

          <div className="w-px h-5 bg-dark-border mx-1"></div>

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
