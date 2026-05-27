import { create } from 'zustand';
import { audioEngine } from '../core/audio/audioEngine';

export interface Note {
  id: string;
  tick: number;
  lane: number;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  instrument: 'guitar' | 'bass' | 'drums' | 'vocals';
  type?: 'strum' | 'hopo' | 'tap' | 'open' | 'kick_pedal' | 'star_power' | 'solo';
  lyric?: string;
  phraseStart?: boolean;
  phraseEnd?: boolean;
}

export interface AISuggestion {
  id: string;
  tick: number;
  lane: number;
  confidence: number;
  reason: string;
  duration?: number;
  type?: 'strum' | 'hopo' | 'tap' | 'kick_pedal' | 'star_power' | 'solo';
  lyric?: string;
}

export interface ValidationWarning {
  id: string;
  tick: number;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

interface ChartState {
  // --- Core Song / Chart Data ---
  notes: Note[];
  bpm: number;
  ticksPerBeat: number; // Defaults to 192 ticks per beat
  songName: string;
  audioFile: File | null;
  
  
  // --- Editor State ---
  isPlaying: boolean;
  currentTick: number;
  zoomX: number; // pitch spacing / lane width zoom
  zoomY: number; // horizontal grid height / tick density zoom
  quantization: number; // 4 (1/4 beat), 8 (1/8 beat), 16, 32, 64 etc.
  selectedTool: 'select' | 'pencil' | 'eraser';
  activeInstrument: 'guitar' | 'bass' | 'drums' | 'vocals';
  activeDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
  snapToGrid: boolean;
  activeNoteType: 'strum' | 'hopo' | 'tap' | 'open' | 'kick_pedal' | 'star_power' | 'solo';
  activeSustainDuration: number;
  
  // Custom Assets
  coverFile: File | null;
  videoFile: File | null;
  

  // --- Audio Parameters ---
  playbackSpeed: number; // 0.5 to 1.5
  songVolume: number;
  guitarVolume: number;
  bassVolume: number;
  drumsVolume: number;
  vocalsVolume: number;
  backingVolume: number;
  isStemsLoaded: boolean;
  processingJobId: string | null;
  processingStatus: 'idle' | 'processing' | 'completed' | 'failed';

  metadata: {
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
  };

  // --- AI Co-pilot State ---
  aiSuggestions: AISuggestion[];
  validationWarnings: ValidationWarning[];
  lyricsText: string;

  // --- Undo/Redo Engine History Queues ---
  historyPast: Note[][];
  historyFuture: Note[][];

  // --- Actions ---
  togglePlay: () => void;
  setCurrentTick: (tick: number) => void;
  setZoomX: (val: number) => void;
  setZoomY: (val: number) => void;
  setQuantization: (val: number) => void;
  setSelectedTool: (tool: 'select' | 'pencil' | 'eraser') => void;
  setActiveInstrument: (inst: 'guitar' | 'bass' | 'drums' | 'vocals') => void;
  setActiveDifficulty: (diff: 'easy' | 'medium' | 'hard' | 'expert') => void;
  setSnapToGrid: (snap: boolean) => void;
  setStemVolume: (stem: 'song' | 'guitar' | 'bass' | 'drums' | 'vocals' | 'backing', vol: number) => void;
  setSongName: (name: string) => void;
  setAudioFile: (file: File | null) => void;
  setActiveNoteType: (type: 'strum' | 'hopo' | 'tap' | 'open' | 'kick_pedal' | 'star_power' | 'solo') => void;
  setActiveSustainDuration: (dur: number) => void;
  updateNoteDuration: (id: string, duration: number) => void;
  updateMetadata: (meta: Partial<ChartState['metadata']>) => void;
  setLyricsText: (text: string) => void;
  updateNoteLyric: (id: string, lyric: string) => void;
  
  setCoverFile: (file: File | null) => void;
  setVideoFile: (file: File | null) => void;
  
  
  
  
  // Note mutations with History
  addNote: (note: Omit<Note, 'id' | 'difficulty' | 'instrument'>) => Note;
  removeNote: (id: string) => void;
  clearNotes: () => void;
  loadNotes: (notes: Note[]) => void;
  
  // History Control
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // AI Pipeline Actions
  setProcessingJob: (jobId: string, status: 'idle' | 'processing' | 'completed' | 'failed') => void;
  setSuggestions: (suggestions: AISuggestion[]) => void;
  setWarnings: (warnings: ValidationWarning[]) => void;
  acceptAISuggestion: (id: string) => void;
  acceptAllSuggestions: () => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  notes: [],
  bpm: 120,
  ticksPerBeat: 192,
  songName: 'demo_song.wav',
  audioFile: null,
  metadata: {
    name: 'demo_song',
    artist: 'Unknown Artist',
    album: 'Unknown Album',
    charter: 'Mooncharts Pro',
    year: '2026',
    genre: 'Rock',
    diff_guitar: 3,
    diff_bass: 2,
    diff_drums: 4,
    diff_vocals: 1,
    diff_band: 3
  },
  

  isPlaying: false,
  currentTick: 0,
  zoomX: 1,
  zoomY: 1,
  quantization: 16, // Default to 1/16 notes
  selectedTool: 'pencil',
  activeInstrument: 'guitar',
  activeDifficulty: 'expert',
  snapToGrid: true,
  activeNoteType: 'strum',
  activeSustainDuration: 0, // Default to single hit (0 ticks)
  coverFile: null,
  videoFile: null,
  

  playbackSpeed: 1.0,
  songVolume: 0.8,
  guitarVolume: 0.8,
  bassVolume: 0.8,
  drumsVolume: 0.8,
  vocalsVolume: 0.8,
  backingVolume: 0.8,
  isStemsLoaded: false,
  processingJobId: null,
  processingStatus: 'idle',

  aiSuggestions: [],
  validationWarnings: [],
  lyricsText: '',

  historyPast: [],
  historyFuture: [],

  setZoomX: (val) => set({ zoomX: Math.max(0.5, Math.min(2.5, val)) }),
  setZoomY: (val) => set({ zoomY: Math.max(0.2, Math.min(4.0, val)) }),
  setQuantization: (val) => set({ quantization: val }),
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setActiveInstrument: (inst) => set({ activeInstrument: inst }),
  setActiveDifficulty: (diff) => set({ activeDifficulty: diff }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setSongName: (name) => set({ songName: name }),
  setLyricsText: (text) => set({ lyricsText: text }),
  updateNoteLyric: (id, lyric) => set((state) => ({ notes: state.notes.map(n => n.id === id ? { ...n, lyric } : n) })),
  setAudioFile: (file) => {
    const cleanName = file ? file.name.replace(/\.[^/.]+$/, "") : 'demo_song';
    set((state) => ({ 
      audioFile: file, 
      songName: file ? file.name : 'demo_song.wav',
      metadata: { ...state.metadata, name: cleanName }
    }));
    if (file) {
      audioEngine.setFile(file);
    }
  },
  updateMetadata: (meta) => set((state) => ({ metadata: { ...state.metadata, ...meta } })),
  setActiveNoteType: (type) => set({ activeNoteType: type }),
  setActiveSustainDuration: (dur) => set({ activeSustainDuration: dur }),
  setCoverFile: (file) => set({ coverFile: file }),
  setVideoFile: (file) => set({ videoFile: file }),
  updateNoteDuration: (id, duration) => set((state) => ({
    notes: state.notes.map(n => {
      if (n.id === id) {
        return { ...n, duration: Math.max(0, duration) };
      }
      return n;
    })
  })),
  
  
  
  togglePlay: () => {
    const isPlaying = !get().isPlaying;
    set({ isPlaying });
    if (isPlaying) {
      audioEngine.play();
    } else {
      audioEngine.pause();
    }
  },

  setCurrentTick: (tick) => {
    const nextTick = Math.max(0, Math.floor(tick));
    set({ currentTick: nextTick });
    
    // Synchronize audio playhead
    const { bpm, ticksPerBeat } = get();
    const seconds = nextTick / (ticksPerBeat * (bpm / 60));
    const currentAudioTime = audioEngine.getCurrentTime();
    if (Math.abs(currentAudioTime - seconds) > 0.08) {
      audioEngine.seek(seconds);
    }
  },
  
  

  setStemVolume: (stem, vol) => set(() => {
    const key = `${stem}Volume` as const;
    const clamped = Math.max(0, Math.min(1, vol));
    audioEngine.setStemVolume(stem, clamped);
    return { [key]: clamped } as any;
  }),

  // --- Note Operations with History tracking ---
  pushHistory: () => {
    const { notes, historyPast } = get();
    // Deep clone the notes array
    const cloned = JSON.parse(JSON.stringify(notes));
    set({
      historyPast: [...historyPast, cloned],
      historyFuture: [] // Clear redo stack on new structural changes
    });
  },

  addNote: (noteData) => {
    get().pushHistory();
    const noteType = get().activeInstrument === 'drums' && noteData.lane === 0 
      ? 'kick_pedal' 
      : (get().activeInstrument === 'drums' ? 'strum' : get().activeNoteType);

    const newNote: Note = {
      ...noteData,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      difficulty: get().activeDifficulty,
      instrument: get().activeInstrument,
      duration: noteData.duration !== undefined ? noteData.duration : 0,
      type: noteType
    };

    // Filter duplicates on same tick & lane. Also enforce mutual exclusion between Open Notes (lane 7) and standard/fretted notes on the exact same tick!
    const filtered = get().notes.filter(n => {
      if (n.tick !== newNote.tick || n.difficulty !== newNote.difficulty || n.instrument !== newNote.instrument) {
        return true;
      }
      if (newNote.lane === 7) {
        return false;
      }
      if (n.lane === 7) {
        return false;
      }
      return n.lane !== newNote.lane;
    });

    set({ notes: [...filtered, newNote] });
    return newNote;
  },

  removeNote: (id) => {
    get().pushHistory();
    set({ notes: get().notes.filter(n => n.id !== id) });
  },

  clearNotes: () => {
    get().pushHistory();
    set({ notes: [] });
  },

  loadNotes: (notes) => {
    set({ notes, historyPast: [], historyFuture: [] });
  },

  // --- History Controls ---
  undo: () => {
    const { historyPast, historyFuture, notes } = get();
    if (historyPast.length === 0) return;

    const previous = historyPast[historyPast.length - 1];
    const newPast = historyPast.slice(0, historyPast.length - 1);
    
    set({
      notes: previous,
      historyPast: newPast,
      historyFuture: [notes, ...historyFuture]
    });
  },

  redo: () => {
    const { historyPast, historyFuture, notes } = get();
    if (historyFuture.length === 0) return;

    const next = historyFuture[0];
    const newFuture = historyFuture.slice(1);

    set({
      notes: next,
      historyPast: [...historyPast, notes],
      historyFuture: newFuture
    });
  },

  // --- AI Actions ---
  setProcessingJob: (jobId, status) => set({ processingJobId: jobId, processingStatus: status }),
  setSuggestions: (suggestions) => set({ aiSuggestions: suggestions }),
  setWarnings: (warnings) => set({ validationWarnings: warnings }),
  acceptAISuggestion: (id) => {
    const suggestion = get().aiSuggestions.find(s => s.id === id);
    if (!suggestion) return;

    let lyricText = undefined;
    if (get().activeInstrument === 'vocals') {
      const words = get().lyricsText.trim().split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const existingVocNotes = get().notes.filter(n => n.instrument === 'vocals' && n.difficulty === get().activeDifficulty);
        lyricText = words[existingVocNotes.length % words.length];
      } else {
        lyricText = suggestion.lyric || 'la';
      }
    }

    // Add note
    get().addNote({
      tick: suggestion.tick,
      lane: suggestion.lane,
      duration: suggestion.duration || 0,
      type: suggestion.type || (get().activeInstrument === 'drums' && suggestion.lane === 0 ? 'kick_pedal' : get().activeNoteType),
      lyric: lyricText
    } as any);

    // Remove from suggestions
    set({
      aiSuggestions: get().aiSuggestions.filter(s => s.id !== id)
    });
  },
  acceptAllSuggestions: () => {
    const { aiSuggestions, activeDifficulty, activeInstrument, notes, lyricsText } = get();
    if (aiSuggestions.length === 0) return;

    // Push history once to support a single Undo operation!
    get().pushHistory();

    const noteType = activeInstrument === 'vocals' ? undefined : (activeInstrument === 'drums' ? 'strum' : get().activeNoteType);
    const words = activeInstrument === 'vocals' ? lyricsText.trim().split(/\s+/).filter(Boolean) : [];

    const newNotes = aiSuggestions.map((sug, idx) => {
      const isKick = activeInstrument === 'drums' && sug.lane === 0;
      const type: Note['type'] = sug.type || (isKick ? 'kick_pedal' : (activeInstrument === 'drums' ? 'strum' : noteType));
      
      let lyricText = undefined;
      if (activeInstrument === 'vocals') {
        if (words.length > 0) {
          lyricText = words[idx % words.length];
        } else {
          lyricText = sug.lyric || 'la';
        }
      }

      return {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${sug.tick}`,
        tick: sug.tick,
        lane: sug.lane,
        duration: sug.duration || 0,
        difficulty: activeDifficulty,
        instrument: activeInstrument,
        type,
        lyric: lyricText
      };
    });

    // Merge notes, filtering out duplicates
    const mergedNotes = [...notes];

    newNotes.forEach((newNote) => {
      const hasDup = mergedNotes.some(n => 
        n.tick === newNote.tick && 
        n.lane === newNote.lane && 
        n.difficulty === newNote.difficulty && 
        n.instrument === newNote.instrument
      );
      if (!hasDup) {
        mergedNotes.push(newNote);
      }
    });

    set({
      notes: mergedNotes,
      aiSuggestions: [] // Clear recommendations
    });
  }
}));
