import React, { useState } from 'react';
import { Keyboard, X } from 'lucide-react';

export const KeyboardLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const keybindings = [
    { keys: ['Espacio'], action: 'Reproducir / Pausar' },
    { keys: ['1', '2', '3', '4', '5'], action: 'Seleccionar Notas Verde, Roja, Amarilla, Azul, Naranja' },
    { keys: ['Ctrl', 'Z'], action: 'Deshacer Cambio' },
    { keys: ['Ctrl', 'Y'], action: 'Rehacer Cambio' },
    { keys: ['Q'], action: 'Herramienta de Selección' },
    { keys: ['W'], action: 'Herramienta de Lápiz (Dibujar)' },
    { keys: ['E'], action: 'Herramienta de Borrador' },
    { keys: ['Rueda de Ratón'], action: 'Navegar hacia arriba/abajo en el Timeline' },
    { keys: ['Shift', 'Rueda'], action: 'Zoom horizontal en el Timeline' },
  ];

  return (
    <div className="absolute bottom-4 left-4 z-20 hidden md:block">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-zinc-900 border border-dark-border text-dark-muted hover:text-dark-text py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold shadow-lg transition-all"
        >
          <Keyboard size={14} /> Atajos de Teclado
        </button>
      ) : (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4 w-72 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3 border-b border-dark-border pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 uppercase tracking-wider">
              <Keyboard size={14} className="text-blue-500" />
              <span>Controles Profesionales</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-dark-muted hover:text-dark-text transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2.5">
            {keybindings.map((bind, idx) => (
              <div key={idx} className="flex justify-between items-center gap-4 text-[10.5px]">
                <span className="text-dark-muted font-medium">{bind.action}</span>
                <div className="flex items-center gap-0.5">
                  {bind.keys.map((k, kIdx) => (
                    <span 
                      key={kIdx} 
                      className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-1 py-0.5 rounded font-mono font-bold text-[9px]"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
