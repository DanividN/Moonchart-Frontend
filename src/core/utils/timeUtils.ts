export interface BPMChange {
  tick: number;
  bpm: number;
}

/**
 * Ensures the BPM array is sorted by tick and has a valid starting BPM at tick 0.
 */
export const normalizeBPMs = (bpms: BPMChange[]): BPMChange[] => {
  if (!bpms || bpms.length === 0) {
    return [{ tick: 0, bpm: 120 }];
  }
  const sorted = [...bpms].sort((a, b) => a.tick - b.tick);
  if (sorted[0].tick > 0) {
    sorted.unshift({ tick: 0, bpm: 120 });
  }
  return sorted;
};

/**
 * Calculates the exact time in seconds for a given tick, accounting for tempo map (variable BPMs).
 */
export const tickToSeconds = (targetTick: number, bpms: BPMChange[], ticksPerBeat: number): number => {
  if (targetTick <= 0) return 0;
  
  const normalizedBpms = normalizeBPMs(bpms);
  let totalSeconds = 0;
  let currentTick = 0;
  let currentBPM = normalizedBpms[0].bpm;

  for (let i = 1; i < normalizedBpms.length; i++) {
    const nextChange = normalizedBpms[i];
    if (targetTick <= nextChange.tick) {
      // Target tick is before the next BPM change
      break;
    }
    
    // Calculate time spent in this BPM segment
    const deltaTicks = nextChange.tick - currentTick;
    totalSeconds += deltaTicks * (60 / (currentBPM * ticksPerBeat));
    
    currentTick = nextChange.tick;
    currentBPM = nextChange.bpm;
  }

  // Calculate remaining time after the last processed BPM change
  const remainingTicks = targetTick - currentTick;
  if (remainingTicks > 0) {
    totalSeconds += remainingTicks * (60 / (currentBPM * ticksPerBeat));
  }

  return totalSeconds;
};

/**
 * Calculates the exact tick for a given time in seconds, accounting for tempo map (variable BPMs).
 */
export const secondsToTick = (targetSeconds: number, bpms: BPMChange[], ticksPerBeat: number): number => {
  if (targetSeconds <= 0) return 0;

  const normalizedBpms = normalizeBPMs(bpms);
  let currentSeconds = 0;
  let currentTick = 0;
  let currentBPM = normalizedBpms[0].bpm;

  for (let i = 1; i < normalizedBpms.length; i++) {
    const nextChange = normalizedBpms[i];
    const deltaTicks = nextChange.tick - currentTick;
    const segmentSeconds = deltaTicks * (60 / (currentBPM * ticksPerBeat));

    if (currentSeconds + segmentSeconds >= targetSeconds) {
      // Target time falls within this BPM segment
      break;
    }

    currentSeconds += segmentSeconds;
    currentTick = nextChange.tick;
    currentBPM = nextChange.bpm;
  }

  // Calculate remaining ticks after the last processed BPM change
  const remainingSeconds = targetSeconds - currentSeconds;
  if (remainingSeconds > 0) {
    const ticksInRemainingSeconds = remainingSeconds / (60 / (currentBPM * ticksPerBeat));
    currentTick += ticksInRemainingSeconds;
  }

  return currentTick;
};

/**
 * Gets the active BPM at a specific tick.
 */
export const getBPMAtTick = (tick: number, bpms: BPMChange[]): number => {
  const normalizedBpms = normalizeBPMs(bpms);
  let activeBPM = normalizedBpms[0].bpm;
  for (let i = 1; i < normalizedBpms.length; i++) {
    if (tick >= normalizedBpms[i].tick) {
      activeBPM = normalizedBpms[i].bpm;
    } else {
      break;
    }
  }
  return activeBPM;
};
