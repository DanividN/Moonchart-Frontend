declare module 'midi-file' {
  export interface MidiEvent {
    deltaTime: number;
    type: string;
    channel?: number;
    noteNumber?: number;
    velocity?: number;
    text?: string;
    textType?: string;
    trackName?: string;
    microsecondsPerBeat?: number;
    numerator?: number;
    denominator?: number;
    metronome?: number;
    thirtyseconds?: number;
  }

  export interface MidiHeader {
    format: number;
    numTracks: number;
    ticksPerBeat: number;
  }

  export interface MidiData {
    header: MidiHeader;
    tracks: MidiEvent[][];
  }

  export function writeMidi(data: MidiData): Uint8Array;
  export function parseMidi(data: Uint8Array): MidiData;
}
