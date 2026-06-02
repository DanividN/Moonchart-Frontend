import React, { useState } from 'react';
import { useChartStore } from '../../../store/useChartStore';
import { X, Music, User, Disc, Calendar, Layers, Shield, Award, Image as ImageIcon, Video, Film } from 'lucide-react';

interface MetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: (meta: {
    name: string;
    artist: string;
    album: string;
    charter: string;
    year: string;
    genre: string;
    diff_guitar: number;
    diff_bass: number;
    diff_drums: number;
    diff_vocals: number;
    diff_band: number;
    offset?: number;
  }, exportFormat: 'chart' | 'mid') => void;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({ isOpen, onClose, onConfirmExport }) => {
  const { metadata, updateMetadata, coverFile, setCoverFile, videoFile, setVideoFile } = useChartStore();

  const [coverPreview, setCoverPreview] = useState<string | null>(
    coverFile ? URL.createObjectURL(coverFile) : null
  );

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  // Local state for form validation and instant updates
  const [name, setName] = useState(metadata.name);
  const [artist, setArtist] = useState(metadata.artist);
  const [album, setAlbum] = useState(metadata.album);
  const [charter, setCharter] = useState(metadata.charter);
  const [year, setYear] = useState(metadata.year);
  const [genre, setGenre] = useState(metadata.genre);

  const [diffGuitar, setDiffGuitar] = useState(metadata.diff_guitar);
  const [diffBass, setDiffBass] = useState(metadata.diff_bass);
  const [diffDrums, setDiffDrums] = useState(metadata.diff_drums);
  const [diffVocals, setDiffVocals] = useState(metadata.diff_vocals);
  const [diffBand, setDiffBand] = useState(metadata.diff_band);
  const [offset, setOffset] = useState(metadata.offset || 0);
  
  const [exportFormat, setExportFormat] = useState<'chart' | 'mid'>('chart');

  if (!isOpen) return null;

  const handleSaveAndExport = () => {
    const updatedMeta = {
      name,
      artist,
      album,
      charter,
      year,
      genre,
      diff_guitar: diffGuitar,
      diff_bass: diffBass,
      diff_drums: diffDrums,
      diff_vocals: diffVocals,
      diff_band: diffBand,
      offset
    };

    // 1. Update global Zustand state store for future reference
    updateMetadata(updatedMeta);

    // 2. Trigger the ZIP export callback passing the fresh metadata directly to prevent Zustand state lag!
    onConfirmExport(updatedMeta, exportFormat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-dark-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-purple-500" />
            <span className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Propiedades del Chart y Metadata (Clone Hero)
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-dark-muted hover:text-dark-text p-1 hover:bg-zinc-800 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-grow">
          
          {/* Section 1: Song Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-dark-border/40 pb-1 flex items-center gap-1.5">
              <Disc size={13} /> Información de la Canción
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-dark-muted uppercase">Nombre de la Canción</label>
                <div className="relative">
                  <Disc size={13} className="absolute left-3 top-2.5 text-dark-muted" />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-900 border border-dark-border hover:border-zinc-700 focus:border-purple-600 rounded-lg py-2 pl-9 pr-3 text-xs text-zinc-200 focus:outline-none transition-colors"
                    placeholder="My New Song"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-dark-muted uppercase">Artista / Banda</label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-2.5 text-dark-muted" />
                  <input 
                    type="text" 
                    value={artist} 
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full bg-zinc-900 border border-dark-border hover:border-zinc-700 focus:border-purple-600 rounded-lg py-2 pl-9 pr-3 text-xs text-zinc-200 focus:outline-none transition-colors"
                    placeholder="Unknown Artist"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-dark-muted uppercase">Álbum</label>
                <div className="relative">
                  <Layers size={13} className="absolute left-3 top-2.5 text-dark-muted" />
                  <input 
                    type="text" 
                    value={album} 
                    onChange={(e) => setAlbum(e.target.value)}
                    className="w-full bg-zinc-900 border border-dark-border hover:border-zinc-700 focus:border-purple-600 rounded-lg py-2 pl-9 pr-3 text-xs text-zinc-200 focus:outline-none transition-colors"
                    placeholder="Unknown Album"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-dark-muted uppercase">Creador del Chart (Charter)</label>
                <div className="relative">
                  <Shield size={13} className="absolute left-3 top-2.5 text-dark-muted" />
                  <input 
                    type="text" 
                    value={charter} 
                    onChange={(e) => setCharter(e.target.value)}
                    className="w-full bg-zinc-900 border border-dark-border hover:border-zinc-700 focus:border-purple-600 rounded-lg py-2 pl-9 pr-3 text-xs text-zinc-200 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-dark-muted uppercase">Año de Lanzamiento</label>
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-2.5 text-dark-muted" />
                  <input 
                    type="text" 
                    value={year} 
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-zinc-900 border border-dark-border hover:border-zinc-700 focus:border-purple-600 rounded-lg py-2 pl-9 pr-3 text-xs text-zinc-200 focus:outline-none transition-colors"
                    placeholder="2026"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-dark-muted uppercase">Género Musical</label>
                <div className="relative">
                  <Music size={13} className="absolute left-3 top-2.5 text-dark-muted" />
                  <input 
                    type="text" 
                    value={genre} 
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-zinc-900 border border-dark-border hover:border-zinc-700 focus:border-purple-600 rounded-lg py-2 pl-9 pr-3 text-xs text-zinc-200 focus:outline-none transition-colors"
                    placeholder="Rock"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-dark-muted uppercase text-emerald-400">Retardo de Audio (Segundos)</label>
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-2.5 text-emerald-500" />
                  <input 
                    type="number" 
                    step="0.1"
                    value={offset} 
                    onChange={(e) => setOffset(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-dark-border hover:border-zinc-700 focus:border-emerald-500 rounded-lg py-2 pl-9 pr-3 text-xs text-zinc-200 focus:outline-none transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Clone Hero Difficulty Stars */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-dark-border/40 pb-1 flex items-center gap-1.5">
              <Award size={13} /> Dificultades del Instrumento (Clasificación Clone Hero 0-6)
            </h3>
            
            <div className="space-y-3 bg-zinc-900/30 p-4 rounded-xl border border-dark-border/50">
              {[
                { name: 'diff_band', label: 'Dificultad de la Banda', val: diffBand, setVal: setDiffBand },
                { name: 'diff_guitar', label: 'Dificultad de Guitarra', val: diffGuitar, setVal: setDiffGuitar },
                { name: 'diff_bass', label: 'Dificultad de Bajo', val: diffBass, setVal: setDiffBass },
                { name: 'diff_drums', label: 'Dificultad de Batería', val: diffDrums, setVal: setDiffDrums },
                { name: 'diff_vocals', label: 'Dificultad de Voces', val: diffVocals, setVal: setDiffVocals },
              ].map((item) => (
                <div key={item.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-border/20 last:border-0 pb-2.5 last:pb-0">
                  <span className="text-xs font-semibold text-zinc-300">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="-1" 
                      max="6" 
                      step="1"
                      value={item.val} 
                      onChange={(e) => item.setVal(parseInt(e.target.value))}
                      className="w-40 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <span className="text-xs font-mono font-bold text-purple-400 w-16 text-right">
                      {item.val === -1 ? 'Sin Chart' : `${item.val} Estrellas`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Portada y Video */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-dark-border/40 pb-1 flex items-center gap-1.5 font-mono">
              <ImageIcon size={13} /> Portada y Video de Acompañamiento
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cover Art Box */}
              <div className="bg-zinc-900/30 p-4 rounded-xl border border-dark-border/50 flex flex-col items-center gap-3">
                <span className="text-[10px] font-bold text-dark-muted uppercase self-start">Carátula del Álbum (album.png)</span>
                
                <div className="relative w-36 h-36 rounded-lg bg-zinc-900 border border-dark-border flex items-center justify-center overflow-hidden group shadow-inner">
                  {coverPreview ? (
                    <>
                      <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover animate-in zoom-in-95 duration-200" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[10px] font-bold text-white uppercase font-mono">Cambiar Portada</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-dark-muted">
                      <ImageIcon size={28} className="text-zinc-600" />
                      <span className="text-[9px] font-mono text-center px-2">Ninguna Portada</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCoverChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-[9px] text-dark-muted text-center leading-relaxed">
                  Cualquier resolución se redimensionará automáticamente a <strong className="text-purple-400">512x512 PNG</strong> para un rendimiento óptimo en Clone Hero.
                </span>
              </div>

              {/* Video Box */}
              <div className="bg-zinc-900/30 p-4 rounded-xl border border-dark-border/50 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-dark-muted uppercase block">Video de Fondo (video.mp4)</span>
                  
                  {videoFile ? (
                    <div className="bg-zinc-950 p-3 rounded-lg border border-purple-500/30 flex items-center gap-3 animate-in fade-in duration-200">
                      <Film className="text-purple-400 shrink-0" size={24} />
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-mono text-zinc-200 truncate">{videoFile.name}</p>
                        <p className="text-[10px] text-dark-muted font-mono font-bold">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <button 
                        onClick={() => setVideoFile(null)}
                        className="text-red-500 hover:text-red-400 text-[10px] font-bold uppercase transition-colors shrink-0 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-dark-border hover:border-purple-500/50 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group">
                      <Video size={28} className="text-dark-muted group-hover:text-purple-400 transition-colors" />
                      <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 font-mono">Seleccionar Video .mp4</span>
                      <span className="text-[8px] text-dark-muted">Arrastra o haz clic para subir</span>
                      <input 
                        type="file" 
                        accept="video/mp4,video/*" 
                        onChange={handleVideoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
                
                <span className="text-[9px] text-dark-muted leading-relaxed">
                  El video se empaquetará directamente en la carpeta del chart como <strong className="text-purple-400 font-bold">video.mp4</strong>. 
                  <br />
                  <span className="text-amber-500 font-bold">⚠️ Nota:</span> Archivos grandes incrementarán el tamaño de descarga del archivo .zip.
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Formato de Exportación */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-dark-border/40 pb-1 flex items-center gap-1.5 font-mono">
              <Award size={13} /> Formato de Exportación
            </h3>
            
            <div className="bg-zinc-900/30 p-4 rounded-xl border border-dark-border/50 flex flex-col gap-3">
              <span className="text-[10px] font-bold text-dark-muted uppercase">Selecciona el formato objetivo</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${exportFormat === 'chart' ? 'border-purple-500 bg-purple-500/20' : 'border-zinc-700 bg-zinc-900 group-hover:border-zinc-500'}`}>
                    {exportFormat === 'chart' && <div className="w-2 h-2 rounded-full bg-purple-500"></div>}
                  </div>
                  <input type="radio" className="hidden" checked={exportFormat === 'chart'} onChange={() => setExportFormat('chart')} />
                  <span className={`text-xs font-bold ${exportFormat === 'chart' ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'}`}>.chart (Clone Hero)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${exportFormat === 'mid' ? 'border-purple-500 bg-purple-500/20' : 'border-zinc-700 bg-zinc-900 group-hover:border-zinc-500'}`}>
                    {exportFormat === 'mid' && <div className="w-2 h-2 rounded-full bg-purple-500"></div>}
                  </div>
                  <input type="radio" className="hidden" checked={exportFormat === 'mid'} onChange={() => setExportFormat('mid')} />
                  <span className={`text-xs font-bold ${exportFormat === 'mid' ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'}`}>.mid (Rockband / Magma)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-dark-border bg-zinc-900/40 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-dark-muted hover:text-dark-text bg-zinc-900 hover:bg-zinc-800 border border-dark-border rounded-lg transition-colors active:scale-95 cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSaveAndExport}
            className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-lg shadow-purple-600/10 hover:shadow-purple-700/20 glow-purple transition-all active:scale-95 cursor-pointer"
          >
            Guardar y Exportar Carpeta
          </button>
        </div>

      </div>
    </div>
  );
};
