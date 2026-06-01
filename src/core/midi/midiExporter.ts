import { writeMidi, MidiData, MidiEvent } from 'midi-file';
import { Note } from '../../store/useChartStore';

export const exportToMidiFile = (
  notesList: Note[],
  bpm: number,
  activeMeta: any,
  resolution: number = 192
): Uint8Array => {
  // 1. Create base MIDI structure
  const midiData: MidiData = {
    header: {
      format: 1, // Multi-track
      numTracks: 0,
      ticksPerBeat: resolution
    },
    tracks: []
  };

  // Helper to convert absolute tick to delta time array
  const createDeltaEvents = (events: { tick: number; event: Omit<MidiEvent, 'deltaTime'> }[]): MidiEvent[] => {
    // Sort by absolute tick
    events.sort((a, b) => a.tick - b.tick);
    
    let lastTick = 0;
    return events.map(e => {
      const delta = Math.max(0, e.tick - lastTick);
      lastTick = e.tick;
      return {
        ...e.event,
        deltaTime: delta
      } as MidiEvent;
    });
  };

  // Track 0: Sync and Events
  const syncEvents: { tick: number; event: Omit<MidiEvent, 'deltaTime'> }[] = [
    {
      tick: 0,
      event: { type: 'trackName', text: activeMeta.name }
    },
    {
      tick: 0,
      event: { type: 'setTempo', microsecondsPerBeat: Math.round(60000000 / bpm) }
    },
    {
      tick: 0,
      event: { type: 'timeSignature', numerator: 4, denominator: 4, metronome: 24, thirtyseconds: 8 }
    }
  ];
  midiData.tracks.push(createDeltaEvents(syncEvents));

  // Instrument mapping to Track Names
  const instrumentTrackMap = {
    guitar: 'PART GUITAR',
    bass: 'PART BASS',
    drums: 'PART DRUMS',
    vocals: 'PART VOCALS'
  } as const;

  const diffBaseNote = {
    easy: 60,
    medium: 72,
    hard: 84,
    expert: 96
  };

  // Group notes by instrument
  for (const [instKey, trackName] of Object.entries(instrumentTrackMap)) {
    const instNotes = notesList.filter(n => n.instrument === instKey);
    if (instNotes.length === 0) continue;

    const trackEvents: { tick: number; event: Omit<MidiEvent, 'deltaTime'> }[] = [];
    trackEvents.push({ tick: 0, event: { type: 'trackName', text: trackName } });

    instNotes.forEach(note => {
      if (instKey === 'vocals') {
        // Vocals logic: lyrics are text events, pitch is usually MIDI 84 (C5) for unpitched or specific for pitched
        if (note.lyric || note.phraseStart || note.phraseEnd) {
          if (note.phraseStart) {
            trackEvents.push({ tick: note.tick, event: { type: 'text', text: '[phrase_start]' } });
          }
          if (note.lyric) {
            trackEvents.push({ tick: note.tick, event: { type: 'text', text: note.lyric } });
            // Add a default unpitched vocal note (C5)
            trackEvents.push({ tick: note.tick, event: { type: 'noteOn', channel: 0, noteNumber: 84, velocity: 100 } });
            trackEvents.push({ tick: note.tick + (note.duration || 48), event: { type: 'noteOff', channel: 0, noteNumber: 84, velocity: 0 } });
          }
          if (note.phraseEnd) {
            const endTick = note.tick + (note.duration || 96);
            trackEvents.push({ tick: endTick, event: { type: 'text', text: '[phrase_end]' } });
          }
        }
      } else {
        // Guitar, Bass, Drums
        const base = diffBaseNote[note.difficulty];
        
        if (note.type === 'star_power') {
          // Overdrive is 116 for all difficulties
          trackEvents.push({ tick: note.tick, event: { type: 'noteOn', channel: 0, noteNumber: 116, velocity: 100 } });
          trackEvents.push({ tick: note.tick + note.duration, event: { type: 'noteOff', channel: 0, noteNumber: 116, velocity: 0 } });
        } else if (note.type === 'solo') {
          // Solo is 103
          trackEvents.push({ tick: note.tick, event: { type: 'noteOn', channel: 0, noteNumber: 103, velocity: 100 } });
          trackEvents.push({ tick: note.tick + note.duration, event: { type: 'noteOff', channel: 0, noteNumber: 103, velocity: 0 } });
        } else {
          // Normal note
          const noteNumber = base + note.lane; // lane 0=green, 1=red, etc.
          trackEvents.push({ tick: note.tick, event: { type: 'noteOn', channel: 0, noteNumber, velocity: 100 } });
          trackEvents.push({ tick: note.tick + note.duration, event: { type: 'noteOff', channel: 0, noteNumber, velocity: 0 } });
          
          // HOPo and Tap markers (Rockband style)
          // Usually HOPOs are forced by note 65, 77, 89, 101 or by specific velocity/distance
          // Wait, for simplicity we can just write the standard notes as Magma will auto-HOPO based on distance,
          // or force HOPO with 101 for Expert, etc.
          // Let's add force HOPO/Strum if explicit
          if (note.type === 'hopo') {
            const forceHopoNote = base + 5; // e.g. 101 for Expert
            trackEvents.push({ tick: note.tick, event: { type: 'noteOn', channel: 0, noteNumber: forceHopoNote, velocity: 100 } });
            trackEvents.push({ tick: note.tick + (note.duration || 48), event: { type: 'noteOff', channel: 0, noteNumber: forceHopoNote, velocity: 0 } });
          } else if (note.type === 'strum') {
            const forceStrumNote = base + 6; // e.g. 102 for Expert
            trackEvents.push({ tick: note.tick, event: { type: 'noteOn', channel: 0, noteNumber: forceStrumNote, velocity: 100 } });
            trackEvents.push({ tick: note.tick + (note.duration || 48), event: { type: 'noteOff', channel: 0, noteNumber: forceStrumNote, velocity: 0 } });
          }
        }
      }
    });

    trackEvents.push({
      tick: trackEvents.length > 0 ? Math.max(...trackEvents.map(e => e.tick)) + 192 : 0,
      event: { type: 'endOfTrack' }
    });

    midiData.tracks.push(createDeltaEvents(trackEvents));
  }
  
  midiData.header.numTracks = midiData.tracks.length;

  return writeMidi(midiData);
};
