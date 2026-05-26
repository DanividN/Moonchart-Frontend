import React from 'react';
import { useChartStore } from '../../../store/useChartStore';
import { 
  Zap, Sparkles, Fingerprint, Drum, Footprints, Mic, Flame, Award
} from 'lucide-react';

export const NoteTypePalette: React.FC = () => {
  const { 
    activeInstrument, 
    activeNoteType, 
    setActiveNoteType 
  } = useChartStore();

  if (activeInstrument === 'vocals') {
    return (
      <div className="w-12 bg-zinc-950 border-r border-dark-border flex flex-col items-center py-4 gap-4 z-10 shrink-0">
        <div className="text-[8px] font-black text-dark-muted uppercase tracking-wider vertical-text select-none">
          Voces
        </div>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white shadow-lg glow-blue cursor-default"
          title="Lírica vocal activa"
        >
          <Mic size={15} />
        </button>
      </div>
    );
  }

  if (activeInstrument === 'drums') {
    return (
      <div className="w-12 bg-zinc-950 border-r border-dark-border flex flex-col items-center py-4 gap-3 z-10 shrink-0">
        <div className="text-[8px] font-black text-dark-muted uppercase tracking-wider select-none mb-1 text-center">
          Notas
        </div>
        
        {/* Standard drum pad */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white shadow-lg glow-blue cursor-default"
          title="Gema de Tambor / Platillo"
        >
          <Drum size={15} />
        </button>
 
        <div className="w-6 h-px bg-dark-border my-1" />
 
        {/* Kick Pedal */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-600 text-white shadow-lg glow-purple cursor-default"
            title="Pedal de Bombo (Autogestionado en Carril 0)"
          >
            <Footprints size={15} />
          </button>
          <span className="text-[7px] text-purple-400 font-bold uppercase tracking-wider">Bombo</span>
        </div>
      </div>
    );
  }
 
  // Guitar and Bass options
  const options = [
    {
      id: 'strum' as const,
      label: 'Rasgueo',
      desc: 'Nota clásica con rasgueo',
      icon: Zap,
      activeColor: 'bg-emerald-600 text-white glow-green',
      iconColor: 'text-emerald-400'
    },
    {
      id: 'hopo' as const,
      label: 'Hopo',
      desc: 'Hammer-on / Pull-off sin rasgueo',
      icon: Sparkles,
      activeColor: 'bg-blue-600 text-white glow-blue',
      iconColor: 'text-blue-400'
    },
    {
      id: 'tap' as const,
      label: 'Tap',
      desc: 'Nota Tap sin rasgueo ni ligadura',
      icon: Fingerprint,
      activeColor: 'bg-amber-600 text-white glow-orange',
      iconColor: 'text-amber-400'
    },
    {
      id: 'star_power' as const,
      label: 'Power',
      desc: 'Frase de Star Power (Energía)',
      icon: Flame,
      activeColor: 'bg-yellow-500 text-black glow-yellow',
      iconColor: 'text-yellow-500'
    },
    {
      id: 'solo' as const,
      label: 'Solo',
      desc: 'Frase de Solo de Guitarra',
      icon: Award,
      activeColor: 'bg-red-600 text-white glow-rose',
      iconColor: 'text-red-400'
    }
  ];

  return (
    <div className="w-12 bg-zinc-950 border-r border-dark-border flex flex-col items-center py-4 gap-3 z-10 shrink-0">
      <div className="text-[8px] font-black text-dark-muted uppercase tracking-wider select-none mb-1 text-center">
        Gemas
      </div>

      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = activeNoteType === opt.id;
        
        return (
          <div key={opt.id} className="flex flex-col items-center gap-0.5">
            <button
              onClick={() => setActiveNoteType(opt.id)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95 ${
                isActive 
                  ? opt.activeColor 
                  : 'bg-zinc-900 border border-dark-border text-dark-muted hover:text-dark-text hover:bg-zinc-800'
              }`}
              title={`${opt.label}: ${opt.desc}`}
            >
              <Icon size={15} />
            </button>
            <span className={`text-[7px] font-bold uppercase tracking-wider ${isActive ? 'text-zinc-200' : 'text-dark-muted'}`}>
              {opt.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
