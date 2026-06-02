import { Note } from '../../store/useChartStore';

export interface ParseResult {
  metadata: {
    name: string;
    artist: string;
    charter: string;
    album: string;
    year: string;
    genre: string;
  };
  resolution: number;
  bpm: number;
  notes: Note[];
}

export const parseChartFile = (content: string): ParseResult => {
  const result: ParseResult = {
    metadata: {
      name: 'Unknown',
      artist: 'Unknown',
      charter: 'Unknown',
      album: 'Unknown',
      year: 'Unknown',
      genre: 'Unknown'
    },
    resolution: 192,
    bpm: 120,
    notes: []
  };

  const lines = content.split(/\r?\n/);
  let currentSection = '';
  
  const difficultyMap: Record<string, Note['difficulty']> = {
    'Expert': 'expert',
    'Hard': 'hard',
    'Medium': 'medium',
    'Easy': 'easy'
  };

  const instrumentMap: Record<string, Note['instrument']> = {
    'Single': 'guitar',
    'DoubleBass': 'bass',
    'Drums': 'drums'
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '{' || line === '}') continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.substring(1, line.length - 1);
      continue;
    }

    if (currentSection === 'Song') {
      const match = line.match(/^(\w+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let val = match[2];
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }

        if (key === 'Name') result.metadata.name = val;
        else if (key === 'Artist') result.metadata.artist = val;
        else if (key === 'Charter') result.metadata.charter = val;
        else if (key === 'Album') result.metadata.album = val;
        else if (key === 'Year') result.metadata.year = val;
        else if (key === 'Genre') result.metadata.genre = val;
        else if (key === 'Resolution') result.resolution = parseInt(val) || 192;
      }
    } else if (currentSection === 'SyncTrack') {
      // 0 = B 120000 -> 120 bpm
      const match = line.match(/^\d+\s*=\s*B\s+(\d+)$/);
      if (match && result.bpm === 120) {
        // Just take the first BPM for now, since Mooncharts supports a global BPM
        result.bpm = parseInt(match[1]) / 1000;
      }
    } else if (currentSection === 'Events') {
      const match = line.match(/^(\d+)\s*=\s*E\s+"(.*)"$/);
      if (match) {
        const tick = parseInt(match[1]);
        const eventStr = match[2];
        if (eventStr.startsWith('lyric ')) {
          const lyricTxt = eventStr.replace('lyric ', '');
          result.notes.push({
            id: `note-vocal-${tick}-${Math.random().toString(36).substr(2, 9)}`,
            tick,
            lane: 2, // Arbitrary lane for vocals display
            duration: 0,
            difficulty: 'expert', // Lyrics apply to all difficulties visually, defaulting to expert
            instrument: 'vocals',
            lyric: lyricTxt,
            type: 'strum'
          });
        }
      }
    } else {
      // Try to match [ExpertSingle], [HardDoubleBass], etc.
      for (const diffKey in difficultyMap) {
        if (currentSection.startsWith(diffKey)) {
          const instKey = currentSection.substring(diffKey.length);
          if (instrumentMap[instKey]) {
            const difficulty = difficultyMap[diffKey];
            const instrument = instrumentMap[instKey];

            // Match notes: 192 = N 0 0
            const noteMatch = line.match(/^(\d+)\s*=\s*N\s+(\d+)\s+(\d+)$/);
            if (noteMatch) {
              const tick = parseInt(noteMatch[1]);
              const lane = parseInt(noteMatch[2]);
              const duration = parseInt(noteMatch[3]);
              
              let type: Note['type'] = 'strum';
              if (instrument === 'drums' && lane === 0) type = 'kick_pedal';
              if (lane === 5) type = 'hopo'; // lane 5 in .chart often means forced hopo, but let's just ignore or convert it
              if (lane === 6) type = 'tap'; // lane 6 often means forced tap
              
              // Only push lanes 0-4 and 7 (open notes)
              if (lane <= 4 || lane === 7) {
                 result.notes.push({
                  id: `note-${tick}-${lane}-${Math.random().toString(36).substr(2, 9)}`,
                  tick,
                  lane,
                  duration,
                  difficulty,
                  instrument,
                  type
                });
              }
            }

            // Match special phrases: 192 = S 2 192 (star power), S 1 (solo)
            const specialMatch = line.match(/^(\d+)\s*=\s*S\s+(\d+)\s+(\d+)$/);
            if (specialMatch) {
              const tick = parseInt(specialMatch[1]);
              const stype = parseInt(specialMatch[2]);
              const duration = parseInt(specialMatch[3]);
              if (stype === 2) {
                result.notes.push({
                  id: `sp-${tick}-${Math.random().toString(36).substr(2, 9)}`,
                  tick,
                  lane: 2, // Place in center
                  duration,
                  difficulty,
                  instrument,
                  type: 'star_power'
                });
              } else if (stype === 1) {
                result.notes.push({
                  id: `solo-${tick}-${Math.random().toString(36).substr(2, 9)}`,
                  tick,
                  lane: 2,
                  duration,
                  difficulty,
                  instrument,
                  type: 'solo'
                });
              }
            }
          }
        }
      }
    }
  }

  return result;
};
