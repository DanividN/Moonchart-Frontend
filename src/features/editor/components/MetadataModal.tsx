import React, { useState } from 'react';
import { useChartStore } from '../../../store/useChartStore';
import { X, Music, User, Disc, Calendar, Layers, Shield, Award } from 'lucide-react';

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
  }) => void;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({ isOpen, onClose, onConfirmExport }) => {
  const { metadata, updateMetadata } = useChartStore();

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
      diff_band: diffBand
    };

    // 1. Update global Zustand state store for future reference
    updateMetadata(updatedMeta);

    // 2. Trigger the ZIP export callback passing the fresh metadata directly to prevent Zustand state lag!
    onConfirmExport(updatedMeta);
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
