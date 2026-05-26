import React, { useRef, useEffect, useState } from 'react';
import { useChartStore } from '../../../store/useChartStore';
import { audioEngine } from '../../../core/audio/audioEngine';

export const ChartCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Connect Zustand Store states
  const {
    notes,
    bpm,
    isPlaying,
    currentTick,
    ticksPerBeat,
    zoomX,
    zoomY,
    quantization,
    selectedTool,
    activeInstrument,
    activeDifficulty,
    snapToGrid,
    aiSuggestions,
    addNote,
    removeNote,
    setCurrentTick,
    togglePlay,
    updateNoteDuration,
    pushHistory,
    activeNoteType,
    updateNoteLyric,
  } = useChartStore();

  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  const [hoveredPhraseId, setHoveredPhraseId] = useState<string | null>(null);
  const [hoveredPhraseEdge, setHoveredPhraseEdge] = useState<'top' | 'bottom' | null>(null);
  const [draggedPhraseId, setDraggedPhraseId] = useState<string | null>(null);
  const [draggedPhraseEdge, setDraggedPhraseEdge] = useState<'top' | 'bottom' | null>(null);
  const [isDraggingMinimap, setIsDraggingMinimap] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const [hoveredLane, setHoveredLane] = useState<number | null>(null);
  const [hoveredTick, setHoveredTick] = useState<number | null>(null);

  // Configuration Constants
  const LANE_COUNT = activeInstrument === 'drums' ? 5 : 5; // standard 5-fret/lane layout
  const LANE_WIDTH = 55 * zoomX; 

  // Mapping Helpers
  // We scroll vertically: 0 tick is at the bottom, higher ticks are at the top (like Moonscraper/Guitar Hero editors)
  const getCanvasX = (lane: number, width: number) => {
    const totalHighwayWidth = LANE_COUNT * LANE_WIDTH;
    const startX = (width - totalHighwayWidth) / 2;
    return startX + lane * LANE_WIDTH;
  };

  const tickToY = (tick: number, height: number) => {
    // Current playhead is positioned at 20% of the screen height from the bottom
    const playheadY = height * 0.8;
    const ticksDiff = tick - currentTick;
    // 1 tick = zoomY pixels
    return playheadY - (ticksDiff * zoomY);
  };

  const yToTick = (y: number, height: number) => {
    const playheadY = height * 0.8;
    const yDiff = playheadY - y;
    const unquantizedTick = currentTick + (yDiff / zoomY);
    
    if (!snapToGrid) return Math.max(0, Math.floor(unquantizedTick));

    // Snap to nearest quantization interval
    const ticksPerInterval = ticksPerBeat / (quantization / 4);
    return Math.max(0, Math.round(unquantizedTick / ticksPerInterval) * ticksPerInterval);
  };

  const getLaneFromX = (x: number, width: number) => {
    const totalHighwayWidth = LANE_COUNT * LANE_WIDTH;
    const startX = (width - totalHighwayWidth) / 2;
    const relativeX = x - startX;
    
    if (relativeX < 0 || relativeX > totalHighwayWidth) return null;
    const lane = Math.floor(relativeX / LANE_WIDTH);
    return Math.min(LANE_COUNT - 1, Math.max(0, lane));
  };

  // Color mappings
  const LANE_COLORS = [
    '#10b981', // Green
    '#f43f5e', // Red
    '#fbbf24', // Yellow
    '#3b82f6', // Blue
    '#f97316', // Orange
  ];

  const LANE_COLORS_DARK = [
    'rgba(16, 185, 129, 0.15)',
    'rgba(244, 63, 94, 0.15)',
    'rgba(251, 191, 36, 0.15)',
    'rgba(59, 130, 246, 0.15)',
    'rgba(249, 115, 22, 0.15)',
  ];

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width = canvas.parentElement?.clientWidth || 800;
      const height = canvas.height = canvas.parentElement?.clientHeight || 600;

      // 1. Clear background
      ctx.fillStyle = '#09090b'; // zinc-950
      ctx.fillRect(0, 0, width, height);

      const totalHighwayWidth = LANE_COUNT * LANE_WIDTH;
      const startX = (width - totalHighwayWidth) / 2;

      // 2. Draw Side Board Borders (Moonscraper highway style)
      ctx.strokeStyle = '#27272a'; // zinc-800
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.moveTo(startX + totalHighwayWidth, 0);
      ctx.lineTo(startX + totalHighwayWidth, height);
      ctx.stroke();

      // 3. Draw Lanes backgrounds
      if (activeInstrument === 'vocals') {
        const grad = ctx.createLinearGradient(startX, 0, startX + totalHighwayWidth, 0);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
        grad.addColorStop(1, 'rgba(99, 102, 241, 0.08)');
        ctx.fillStyle = grad;
        ctx.fillRect(startX, 0, totalHighwayWidth, height);
        
        ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.font = 'bold 12px "JetBrains Mono", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎤 PISTA DE LÍRICA VOCAL 🎤', startX + totalHighwayWidth / 2, 40);
      } else {
        for (let i = 0; i < LANE_COUNT; i++) {
          ctx.fillStyle = LANE_COLORS_DARK[i];
          ctx.fillRect(startX + i * LANE_WIDTH, 0, LANE_WIDTH, height);
          
          // Lane separating lines
          if (i > 0) {
            ctx.strokeStyle = 'rgba(39, 39, 42, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(startX + i * LANE_WIDTH, 0);
            ctx.lineTo(startX + i * LANE_WIDTH, height);
            ctx.stroke();
          }
        }
      }

      // 4. Draw Beat & Measure Grid Lines (Dynamic frustum)
      const ticksPerInterval = ticksPerBeat / (quantization / 4);
      const startVisibleTick = Math.max(0, yToTick(height, height) - 100);
      const endVisibleTick = yToTick(0, height) + 100;

      for (let t = Math.floor(startVisibleTick / ticksPerInterval) * ticksPerInterval; t <= endVisibleTick; t += ticksPerInterval) {
        const y = tickToY(t, height);
        if (y < 0 || y > height) continue;

        const isMeasure = t % (ticksPerBeat * 4) === 0;
        const isBeat = t % ticksPerBeat === 0;

        if (isMeasure) {
          ctx.strokeStyle = 'rgba(244, 244, 245, 0.4)'; // zinc-100
          ctx.lineWidth = 2;
          // Label measure index
          ctx.fillStyle = 'rgba(244, 244, 245, 0.3)';
          ctx.font = '10px JetBrains Mono';
          ctx.fillText(`M ${(t / (ticksPerBeat * 4)) + 1}`, startX - 35, y + 4);
        } else if (isBeat) {
          ctx.strokeStyle = 'rgba(113, 113, 122, 0.3)'; // zinc-500
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(63, 63, 70, 0.15)'; // zinc-700
          ctx.lineWidth = 1;
        }

        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + totalHighwayWidth, y);
        ctx.stroke();
      }

      // 5. Render Waveform mock visualization
      // Waveform is projected in the background on the center of the board
      ctx.fillStyle = 'rgba(59, 130, 246, 0.04)'; // Light blue glow
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let y = 0; y < height; y += 4) {
        const t = yToTick(y, height);
        // Synthesized amplitude matching beat pulses
        const beatProgress = (t % ticksPerBeat) / ticksPerBeat;
        const amplitude = (Math.sin(beatProgress * Math.PI) * 40 + Math.random() * 8) * (zoomX * 0.8);
        
        ctx.moveTo(width / 2 - amplitude, y);
        ctx.lineTo(width / 2 + amplitude, y);
      }
      ctx.stroke();

      // 6. Draw AI suggestions as semi-transparent neon circles
      aiSuggestions.forEach((sug) => {
        const y = tickToY(sug.tick, height);
        if (y < -20 || y > height + 20) return;

        const x = getCanvasX(sug.lane, width) + LANE_WIDTH / 2;

        ctx.strokeStyle = LANE_COLORS[sug.lane];
        ctx.fillStyle = 'rgba(24, 24, 27, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 2]); // Dashed indicator for suggestions
        
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // AI Chip Tag
        ctx.fillStyle = LANE_COLORS[sug.lane];
        ctx.font = '8px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`AI ${(sug.confidence * 100).toFixed(0)}%`, x, y - 22);
      });

      // 7. Render placed MIDI Notes (Frustum Culled)
      const visibleNotes = notes.filter((n) => n.difficulty === activeDifficulty && n.instrument === activeInstrument);

      // Pass 1: Underlay highlights for special sections (Star Power / Solo)
      visibleNotes.forEach((note) => {
        if (note.duration <= 0) return;
        const y = tickToY(note.tick, height);
        const endY = tickToY(note.tick + note.duration, height);

        if (Math.min(y, endY) > height + 50 || Math.max(y, endY) < -50) return;

        if (note.type === 'star_power') {
          // pulsing gold/electric blue glow
          const pulse = 0.12 + 0.05 * Math.sin(Date.now() / 250);
          ctx.fillStyle = `rgba(234, 179, 8, ${pulse})`;
          ctx.fillRect(startX, endY, totalHighwayWidth, y - endY);
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(startX, endY, totalHighwayWidth, y - endY);
          
          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 10px "JetBrains Mono", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('⚡ STAR POWER ⚡', startX + 10, y - 8);
        } else if (note.type === 'solo') {
          // pulsing electric crimson glow
          const pulse = 0.12 + 0.04 * Math.sin(Date.now() / 200);
          ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
          ctx.fillRect(startX, endY, totalHighwayWidth, y - endY);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(startX, endY, totalHighwayWidth, y - endY);
          
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 10px "JetBrains Mono", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('🔥 SOLO SECTION 🔥', startX + 10, y - 8);
        }
      });

      // Pass 2: Main note rendering (Jewels, sustains, kicks)
      visibleNotes.forEach((note) => {
        const y = tickToY(note.tick, height);
        const endY = tickToY(note.tick + note.duration, height);

        // Skip rendering if fully out of screen
        if (Math.min(y, endY) > height + 50 || Math.max(y, endY) < -50) return;

        const x = getCanvasX(note.lane, width) + LANE_WIDTH / 2;

        // A. SPECIAL: Vocals Lyric Pill
        if (activeInstrument === 'vocals') {
          const vocalX = startX + totalHighwayWidth / 2;
          const lyricVal = note.lyric || 'la';
          
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#06b6d4'; // Cyan glow
          
          ctx.font = 'bold 11px "JetBrains Mono", sans-serif';
          const textWidth = ctx.measureText(lyricVal).width;
          const pillW = Math.max(55, textWidth + 24);
          const pillH = 22;
          
          // Gradient fill
          const grad = ctx.createLinearGradient(vocalX - pillW / 2, y, vocalX + pillW / 2, y);
          grad.addColorStop(0, '#06b6d4');
          grad.addColorStop(1, '#6366f1');
          ctx.fillStyle = grad;
          
          ctx.beginPath();
          ctx.roundRect(vocalX - pillW / 2, y - pillH / 2, pillW, pillH, 11);
          ctx.fill();
          
          // White border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 0;
          ctx.stroke();
          
          // Render lyric text
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(lyricVal, vocalX, y + 4);
          
          // Quick hint
          const isHovered = hoveredLane !== null && hoveredTick !== null && Math.abs(note.tick - hoveredTick) < ticksPerBeat / 8;
          if (isHovered && editingNoteId !== note.id) {
            ctx.fillStyle = 'rgba(244, 244, 245, 0.7)';
            ctx.font = '8px Inter';
            ctx.fillText('Doble clic para editar', vocalX, y - pillH / 2 - 4);
          }
          return;
        }

        // B. SPECIAL: Drum Kick Pedal rendered as a wide horizontal fuchsia bar
        if (note.type === 'kick_pedal' || (activeInstrument === 'drums' && note.lane === 0)) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#d946ef'; // Fuchsia glow
          
          ctx.fillStyle = '#d946ef';
          ctx.beginPath();
          ctx.roundRect(startX + 4, y - 6, totalHighwayWidth - 8, 12, 4);
          ctx.fill();
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.roundRect(startX + 8, y - 3, totalHighwayWidth - 16, 6, 2);
          ctx.stroke();
          return;
        }

        // B. Draw Sustain tail if duration > 0
        if (note.duration > 0) {
          const colorBase = note.type === 'star_power' ? '#eab308' : (note.type === 'solo' ? '#ef4444' : LANE_COLORS[note.lane]);
          const grad = ctx.createLinearGradient(x, y, x, endY);
          grad.addColorStop(0, colorBase);
          grad.addColorStop(1, 'rgba(24, 24, 27, 0.1)');

          ctx.strokeStyle = grad;
          ctx.lineWidth = 14;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, endY);
          ctx.stroke();
        }

        // C. Draw Premium glossy note jewel
        const noteColor = note.type === 'star_power' ? '#eab308' : (note.type === 'solo' ? '#ef4444' : LANE_COLORS[note.lane]);
        ctx.shadowBlur = 12;
        ctx.shadowColor = noteColor;
        
        ctx.fillStyle = noteColor;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 0; // reset
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Inner metallic cap (Hopo notes get white glossy centers, tap notes get flat centers, strums get standard zinc)
        const isHopo = note.type === 'hopo';
        const isTap = note.type === 'tap';
        
        ctx.fillStyle = isHopo ? '#ffffff' : (isTap ? noteColor : '#18181b');
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // 8. Draw Cursor Placement Preview
      if (hoveredLane !== null && hoveredTick !== null && selectedTool === 'pencil') {
        const y = tickToY(hoveredTick, height);
        const x = getCanvasX(hoveredLane, width) + LANE_WIDTH / 2;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 9. Draw Synchronized Playhead Line (The hit zone)
      const playheadY = height * 0.8;
      ctx.strokeStyle = '#f43f5e'; // Vibrant Rose
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
      
      ctx.beginPath();
      ctx.moveTo(startX - 20, playheadY);
      ctx.lineTo(startX + totalHighwayWidth + 20, playheadY);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Playhead handle arrows
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(startX - 20, playheadY - 6);
      ctx.lineTo(startX - 10, playheadY);
      ctx.lineTo(startX - 20, playheadY + 6);
      ctx.fill();

      // FPS tracking or Time signature legend
      ctx.fillStyle = 'rgba(244, 244, 245, 0.5)';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(`TIME: ${(currentTick / ticksPerBeat / 2).toFixed(2)}s | TICK: ${currentTick}`, width - 100, height - 20);

      // 10. Draw VS Code style high-tech minimap
      const duration = audioEngine.getDuration() || 180;
      const songEndTick = Math.max(
        duration * (bpm / 60) * ticksPerBeat,
        notes.length > 0 ? Math.max(...notes.map(n => n.tick)) + 1920 : 19200
      );

      const minimapX = width - 85;
      const minimapWidth = 70;
      const minimapY = 20;
      const minimapHeight = height - 60; // leave some space at the bottom

      // Minimap background track
      ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
      ctx.strokeStyle = 'rgba(63, 63, 70, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(minimapX, minimapY, minimapWidth, minimapHeight, 6);
      ctx.fill();
      ctx.stroke();

      // Render Star Power and Solo sections inside minimap as colored zones
      visibleNotes.forEach(note => {
        if (note.duration > 0) {
          const yStart = minimapY + (note.tick / songEndTick) * minimapHeight;
          const yEnd = minimapY + ((note.tick + note.duration) / songEndTick) * minimapHeight;
          if (note.type === 'star_power') {
            ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
            ctx.fillRect(minimapX + 1, yStart, minimapWidth - 2, Math.max(3, yEnd - yStart));
          } else if (note.type === 'solo') {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
            ctx.fillRect(minimapX + 1, yStart, minimapWidth - 2, Math.max(3, yEnd - yStart));
          }
        }
      });

      // Render mini notes in minimap
      visibleNotes.forEach(note => {
        const noteMinimapY = minimapY + (note.tick / songEndTick) * minimapHeight;
        const noteMinimapX = minimapX + 6 + (note.lane / 5) * (minimapWidth - 16);

        // Check if note is inside star power dynamically
        const isNoteInStarPower = visibleNotes.some(phrase => 
          phrase.type === 'star_power' &&
          phrase.duration > 0 &&
          note.tick >= phrase.tick &&
          note.tick <= (phrase.tick + phrase.duration)
        );

        ctx.fillStyle = isNoteInStarPower ? '#eab308' : (note.type === 'star_power' ? '#eab308' : (note.type === 'solo' ? '#ef4444' : LANE_COLORS[note.lane]));
        ctx.fillRect(noteMinimapX, noteMinimapY - 1, 8, 2);
      });

      // Draw Viewport Box (currently visible tick range)
      const visibleStartTick = yToTick(height, height);
      const visibleEndTick = yToTick(0, height);

      const viewportY1 = Math.max(minimapY, minimapY + (visibleStartTick / songEndTick) * minimapHeight);
      const viewportY2 = Math.min(minimapY + minimapHeight, minimapY + (visibleEndTick / songEndTick) * minimapHeight);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(minimapX, viewportY1, minimapWidth, Math.max(6, viewportY2 - viewportY1), 4);
      ctx.fill();
      ctx.stroke();

      // Measure ticks indicators along minimap (every 10 measures)
      ctx.fillStyle = 'rgba(244, 244, 245, 0.3)';
      ctx.font = '7px "JetBrains Mono"';
      ctx.textAlign = 'right';
      
      const totalMeasures = Math.ceil(songEndTick / (ticksPerBeat * 4));
      for (let m = 0; m < totalMeasures; m += 10) {
        const mTick = m * ticksPerBeat * 4;
        const mY = minimapY + (mTick / songEndTick) * minimapHeight;
        if (mY >= minimapY && mY <= minimapY + minimapHeight) {
          ctx.fillText(`M${m + 1}`, minimapX - 4, mY + 2.5);
          ctx.strokeStyle = 'rgba(113, 113, 122, 0.2)';
          ctx.beginPath();
          ctx.moveTo(minimapX, mY);
          ctx.lineTo(minimapX + 6, mY);
          ctx.stroke();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [notes, isPlaying, currentTick, zoomX, zoomY, quantization, hoveredLane, hoveredTick, selectedTool, activeInstrument, activeDifficulty, snapToGrid, aiSuggestions]);

  // Handle Playback Simulation & Audio Sync
  useEffect(() => {
    if (!isPlaying) return;

    const hasAudio = audioEngine.getDuration() > 0;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      if (hasAudio) {
        // High-precision sync with AudioEngine clock
        const currentTime = audioEngine.getCurrentTime();
        const calculatedTick = currentTime * ticksPerBeat * (bpm / 60);
        setCurrentTick(calculatedTick);
      } else {
        // Fallback to simulated offline clock
        const now = performance.now();
        const delta = now - lastTime;
        lastTime = now;

        const beatsPerSecond = bpm / 60;
        const ticksPerSecond = beatsPerSecond * ticksPerBeat;
        const ticksToAdvance = (ticksPerSecond * delta) / 1000;

        setCurrentTick(currentTick + ticksToAdvance);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, currentTick, bpm, ticksPerBeat, setCurrentTick]);

  // Mouse Interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 0. Handle Minimap dragging
    if (isDraggingMinimap && y !== null) {
      const duration = audioEngine.getDuration() || 180;
      const songEndTick = Math.max(
        duration * (bpm / 60) * ticksPerBeat,
        notes.length > 0 ? Math.max(...notes.map(n => n.tick)) + 1920 : 19200
      );
      const minimapHeight = canvas.height - 60;
      const pct = (y - 20) / minimapHeight;
      const targetTick = Math.max(0, Math.min(songEndTick, pct * songEndTick));
      setCurrentTick(targetTick);
      return;
    }

    const lane = getLaneFromX(x, canvas.width);
    const tick = yToTick(y, canvas.height);

    setHoveredLane(lane);
    setHoveredTick(tick);

    // 1. Detect Hover over Star Power / Solo Phrase boundaries
    let foundHoveredPhrase: string | null = null;
    let foundHoveredEdge: 'top' | 'bottom' | null = null;

    if (tick !== null) {
      const visiblePhrases = notes.filter(n => 
        (n.type === 'star_power' || n.type === 'solo') &&
        n.difficulty === activeDifficulty &&
        n.instrument === activeInstrument
      );

      for (const phrase of visiblePhrases) {
        const bottomY = tickToY(phrase.tick, canvas.height);
        const topY = tickToY(phrase.tick + phrase.duration, canvas.height);

        if (Math.abs(y - bottomY) < 10) {
          foundHoveredPhrase = phrase.id;
          foundHoveredEdge = 'bottom';
          break;
        } else if (Math.abs(y - topY) < 10) {
          foundHoveredPhrase = phrase.id;
          foundHoveredEdge = 'top';
          break;
        }
      }
    }

    setHoveredPhraseId(foundHoveredPhrase);
    setHoveredPhraseEdge(foundHoveredEdge);

    // 2. Handle Phrase edge dragging with real-time note transformation
    if (draggedPhraseId && draggedPhraseEdge && tick !== null) {
      const phrase = notes.find(n => n.id === draggedPhraseId);
      if (phrase) {
        let nextTick = phrase.tick;
        let nextDuration = phrase.duration;

        if (draggedPhraseEdge === 'top') {
          // Dragging top edge
          nextDuration = Math.max(48, tick - phrase.tick);
        } else {
          // Dragging bottom edge (keeps top edge fixed)
          const oldTopTick = phrase.tick + phrase.duration;
          nextTick = Math.max(0, Math.min(oldTopTick - 48, tick));
          nextDuration = oldTopTick - nextTick;
        }

        // Update phrase tick and duration in store
        useChartStore.setState((state) => {
          const updatedNotes = state.notes.map(n => {
            if (n.id === draggedPhraseId) {
              return { ...n, tick: nextTick, duration: nextDuration };
            }
            return n;
          });

          // Automatically transform notes within the Star Power box to star_power type!
          if (phrase.type === 'star_power') {
            return {
              notes: updatedNotes.map(n => {
                if (n.instrument === activeInstrument && n.difficulty === activeDifficulty && n.id !== draggedPhraseId) {
                  const isInside = n.tick >= nextTick && n.tick <= (nextTick + nextDuration);
                  if (isInside && n.type !== 'star_power' && n.type !== 'kick_pedal' && n.type !== 'solo') {
                    return { ...n, type: 'star_power' };
                  } else if (!isInside && n.type === 'star_power') {
                    // Check if it's inside any OTHER star power phrase
                    const insideOther = updatedNotes.some(other => 
                      other.type === 'star_power' && 
                      other.id !== draggedPhraseId && 
                      n.tick >= other.tick && 
                      n.tick <= (other.tick + other.duration)
                    );
                    if (!insideOther) {
                      return { ...n, type: 'strum' }; // Revert to standard strum note
                    }
                  }
                }
                return n;
              })
            };
          }

          return { notes: updatedNotes };
        });
      }
    }

    // 3. Dynamic drag-to-sustain for regular notes
    if (draggedNoteId && tick !== null) {
      const draggedNote = notes.find(n => n.id === draggedNoteId);
      if (draggedNote) {
        const duration = Math.max(0, tick - draggedNote.tick);
        updateNoteDuration(draggedNoteId, duration);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredLane(null);
    setHoveredTick(null);
    setDraggedNoteId(null);
    setDraggedPhraseId(null);
    setDraggedPhraseEdge(null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // A. Minimap Click & Drag Start (Highest Priority)
    const minimapX = canvas.width - 85;
    const minimapWidth = 70;
    const minimapHeight = canvas.height - 60;
    if (x >= minimapX && x <= minimapX + minimapWidth && y >= 20 && y <= 20 + minimapHeight) {
      setIsDraggingMinimap(true);
      const duration = audioEngine.getDuration() || 180;
      const songEndTick = Math.max(
        duration * (bpm / 60) * ticksPerBeat,
        notes.length > 0 ? Math.max(...notes.map(n => n.tick)) + 1920 : 19200
      );
      const pct = (y - 20) / minimapHeight;
      const targetTick = Math.max(0, Math.min(songEndTick, pct * songEndTick));
      setCurrentTick(targetTick);
      return;
    }

    if (hoveredLane === null || hoveredTick === null) return;

    // A. First Priority: If hovering a phrase edge, begin resizing
    if (hoveredPhraseId && hoveredPhraseEdge) {
      pushHistory();
      setDraggedPhraseId(hoveredPhraseId);
      setDraggedPhraseEdge(hoveredPhraseEdge);
      return;
    }

    if (selectedTool === 'pencil') {
      // B. Check if they clicked on/near an existing note to drag its sustain length!
      const clickedNote = notes.find(
        (n) =>
          n.lane === hoveredLane &&
          Math.abs(n.tick - hoveredTick) < ticksPerBeat / 4 &&
          n.difficulty === activeDifficulty &&
          n.instrument === activeInstrument
      );

      if (clickedNote) {
        pushHistory();
        setDraggedNoteId(clickedNote.id);
      } else {
        // Place new note (sustain duration is initially 48 if activeNoteType is star_power/solo to allow resizing)
        const isPhrase = activeNoteType === 'star_power' || activeNoteType === 'solo';
        addNote({
          tick: hoveredTick,
          lane: hoveredLane,
          duration: isPhrase ? 192 : 0, // default 1 beat duration for newly placed phrases
        });

        // If placing a new star power phrase, immediately transform any underlying notes!
        if (activeNoteType === 'star_power') {
          setTimeout(() => {
            useChartStore.setState((state) => {
              const latestPhrase = state.notes.find(n => n.type === 'star_power' && n.tick === hoveredTick);
              if (latestPhrase) {
                return {
                  notes: state.notes.map(n => {
                    if (n.instrument === activeInstrument && n.difficulty === activeDifficulty && n.id !== latestPhrase.id) {
                      const isInside = n.tick >= latestPhrase.tick && n.tick <= (latestPhrase.tick + latestPhrase.duration);
                      if (isInside && n.type !== 'star_power' && n.type !== 'kick_pedal' && n.type !== 'solo') {
                        return { ...n, type: 'star_power' };
                      }
                    }
                    return n;
                  })
                };
              }
              return {};
            });
          }, 50);
        }
      }
    } else if (selectedTool === 'eraser') {
      // Find note under cursor
      const noteToDelete = notes.find(
        (n) =>
          n.lane === hoveredLane &&
          Math.abs(n.tick - hoveredTick) < ticksPerBeat / 8 &&
          n.difficulty === activeDifficulty &&
          n.instrument === activeInstrument
      );
      if (noteToDelete) {
        removeNote(noteToDelete.id);
        
        // If deleting a Star Power phrase, revert any nested notes
        if (noteToDelete.type === 'star_power') {
          useChartStore.setState((state) => ({
            notes: state.notes.map(n => {
              if (n.instrument === activeInstrument && n.difficulty === activeDifficulty && n.type === 'star_power') {
                const stillInsideAny = state.notes.some(other => 
                  other.type === 'star_power' && 
                  other.id !== noteToDelete.id && 
                  n.tick >= other.tick && 
                  n.tick <= (other.tick + other.duration)
                );
                if (!stillInsideAny && n.id !== noteToDelete.id) {
                  return { ...n, type: 'strum' };
                }
              }
              return n;
            })
          }));
        }
      }
    }
  };

  const handleMouseUp = () => {
    setDraggedNoteId(null);
    setDraggedPhraseId(null);
    setDraggedPhraseEdge(null);
    setIsDraggingMinimap(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (isPlaying) {
      togglePlay(); // Pause playback on manual scroll
    }
    const ticksPerInterval = ticksPerBeat / (quantization / 4);
    const scrollDirection = e.deltaY > 0 ? -1 : 1;
    const multiplier = e.shiftKey ? 4 : 1;
    const nextTick = currentTick + (scrollDirection * ticksPerInterval * multiplier);
    setCurrentTick(Math.max(0, nextTick));
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeInstrument !== 'vocals') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;

    // Find if double click was near any vocal lyric note
    const clickedNote = notes.find(n => 
      n.instrument === 'vocals' &&
      n.difficulty === activeDifficulty &&
      Math.abs(tickToY(n.tick, canvas.height) - y) < 16
    );

    if (clickedNote) {
      setEditingNoteId(clickedNote.id);
      setEditingText(clickedNote.lyric || 'la');
    }
  };

  const getEditingInputStyle = () => {
    const canvas = canvasRef.current;
    if (!canvas || !editingNoteId) return {};

    const note = notes.find(n => n.id === editingNoteId);
    if (!note) return {};

    const y = tickToY(note.tick, canvas.height);
    const totalHighwayWidth = LANE_COUNT * LANE_WIDTH;
    const startX = (canvas.width - totalHighwayWidth) / 2;
    const vocalX = startX + totalHighwayWidth / 2;

    return {
      left: `${vocalX}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%)',
      width: '120px',
    };
  };

  return (
    <div className="relative w-full h-full flex-grow overflow-hidden bg-dark-bg">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        className="block w-full h-full"
        style={{ cursor: (draggedPhraseId || hoveredPhraseId) ? 'ns-resize' : 'crosshair' }}
      />

      {editingNoteId && (
        <input
          type="text"
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateNoteLyric(editingNoteId, editingText);
              setEditingNoteId(null);
            } else if (e.key === 'Escape') {
              setEditingNoteId(null);
            }
          }}
          onBlur={() => {
            updateNoteLyric(editingNoteId, editingText);
            setEditingNoteId(null);
          }}
          className="absolute bg-zinc-900 border-2 border-cyan-500 text-white font-mono text-xs rounded px-2 py-0.5 outline-none shadow-lg text-center z-20"
          style={getEditingInputStyle()}
          autoFocus
        />
      )}
    </div>
  );
};
