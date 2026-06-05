import React from 'react';
import { useChartStore } from '../../../store/useChartStore';
import { 
  Play, Pause, Undo2, Redo2, Grid, ZoomIn, ZoomOut, 
  MousePointer, Pencil, Eraser, Guitar, Music, Drum, HelpCircle 
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const {
    isPlaying,
    zoomY,
    quantization,
    selectedTool,
    activeInstrument,
    activeDifficulty,
    snapToGrid,
    togglePlay,
    setZoomY,
    setQuantization,
    setSelectedTool,
    setActiveInstrument,
    setActiveDifficulty,
    setSnapToGrid,
    undo,
    redo,
    historyPast,
    historyFuture
  } = useChartStore();

  const difficulties: Array<'easy' | 'medium' | 'hard' | 'expert'> = ['easy', 'medium', 'hard', 'expert'];
  const instruments: Array<{ id: 'guitar' | 'bass' | 'drums' | 'vocals', label: string, icon: any }> = [
    { id: 'guitar', label: 'Guitarra', icon: Guitar },
    { id: 'bass', label: 'Bajo', icon: Music },
    { id: 'drums', label: 'Batería', icon: Drum },
    { id: 'vocals', label: 'Voz/Lírica', icon: HelpCircle }
  ];

  return (
    <div className="h-14 bg-dark-panel border-b border-dark-border px-2 lg:px-4 flex items-center justify-between gap-2 lg:gap-4 z-10 shrink-0 overflow-x-auto hide-scrollbar">
      {/* 1. Playback Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={togglePlay}
          className={`flex items-center justify-center p-2 rounded-lg transition-all ${
            isPlaying 
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600' 
              : 'bg-zinc-800 hover:bg-zinc-700 text-dark-text'
          }`}
          title="Play / Pause (Espacio)"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <div className="h-6 w-px bg-dark-border mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={historyPast.length === 0}
          className="p-1.5 rounded text-dark-text hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 size={17} />
        </button>
        <button
          onClick={redo}
          disabled={historyFuture.length === 0}
          className="p-1.5 rounded text-dark-text hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Rehacer (Ctrl+Y)"
        >
          <Redo2 size={17} />
        </button>
      </div>

      {/* 2. Tools Selection */}
      <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-dark-border shrink-0">
        <button
          onClick={() => setSelectedTool('select')}
          className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${
            selectedTool === 'select' ? 'bg-zinc-800 text-white' : 'text-dark-muted hover:text-dark-text'
          }`}
        >
          <MousePointer size={14} /> Seleccionar
        </button>
        <button
          onClick={() => setSelectedTool('pencil')}
          className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${
            selectedTool === 'pencil' ? 'bg-zinc-800 text-white' : 'text-dark-muted hover:text-dark-text'
          }`}
        >
          <Pencil size={14} /> Dibujar
        </button>
        <button
          onClick={() => setSelectedTool('eraser')}
          className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${
            selectedTool === 'eraser' ? 'bg-zinc-800 text-white' : 'text-dark-muted hover:text-dark-text'
          }`}
        >
          <Eraser size={14} /> Borrar
        </button>
      </div>

      {/* 3. Instrument & Difficulty tabs */}
      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        {/* Instrument dropdown/buttons */}
        <div className="flex items-center bg-zinc-900 border border-dark-border rounded-lg p-0.5">
          {instruments.map((inst) => {
            const Icon = inst.icon;
            const active = activeInstrument === inst.id;
            return (
              <button
                key={inst.id}
                onClick={() => setActiveInstrument(inst.id)}
                className={`p-1.5 rounded-md flex items-center gap-1 text-xs font-medium transition-all ${
                  active 
                    ? 'bg-blue-600 text-white glow-blue' 
                    : 'text-dark-muted hover:text-dark-text'
                }`}
              >
                <Icon size={14} />
                <span className="hidden xl:inline">{inst.label}</span>
              </button>
            );
          })}
        </div>

        {/* Difficulty buttons */}
        <div className="flex bg-zinc-900 border border-dark-border rounded-lg p-0.5">
          {difficulties.map((diff) => (
            <button
              key={diff}
              onClick={() => setActiveDifficulty(diff)}
              className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all ${
                activeDifficulty === diff
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-dark-muted hover:text-dark-text'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>




      </div>

      {/* 4. Grid, Quantization & Zoom Controls */}
      <div className="flex items-center gap-2 lg:gap-3 shrink-0 pr-2 lg:pr-0">
        {/* Snap to Grid */}
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`p-1.5 rounded-lg border transition-all ${
            snapToGrid 
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' 
              : 'bg-zinc-900 border-dark-border text-dark-muted'
          }`}
          title="Ajustar a la cuadrícula"
        >
          <Grid size={16} />
        </button>

        {/* Quantization select */}
        <select
          value={quantization}
          onChange={(e) => setQuantization(Number(e.target.value))}
          className="bg-zinc-900 text-dark-text text-xs border border-dark-border rounded-lg py-1 px-2 focus:outline-none"
        >
          <option value="4">1/4 Nota</option>
          <option value="8">1/8 Nota</option>
          <option value="12">1/12 Nota</option>
          <option value="16">1/16 Nota</option>
          <option value="24">1/24 Nota</option>
          <option value="32">1/32 Nota</option>
          <option value="48">1/48 Nota</option>
          <option value="64">1/64 Nota</option>
        </select>

        {/* Vertical/Horizontal Zoom */}
        <div className="flex items-center bg-zinc-900 border border-dark-border rounded-lg px-1 py-0.5 gap-1">
          <button
            onClick={() => setZoomY(zoomY - 0.2)}
            className="p-1 hover:bg-zinc-800 rounded text-dark-muted hover:text-dark-text"
            title="Zoom Out Vertical"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[10px] font-mono text-dark-muted w-8 text-center">Y:{zoomY.toFixed(1)}</span>
          <button
            onClick={() => setZoomY(zoomY + 0.2)}
            className="p-1 hover:bg-zinc-800 rounded text-dark-muted hover:text-dark-text"
            title="Zoom In Vertical"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
