// Note divisions for tempo-synced times and rates, in beats (quarter notes). "." is dotted,
// "t" is triplet. "off" means use the free (unsynced) value instead.
const DIVISION_BEATS = {
  off: null,
  "4/1": 16,
  "2/1": 8,
  "1/1": 4,
  "1/2": 2,
  "1/4.": 1.5,
  "1/4": 1,
  "1/4t": 2 / 3,
  "1/8.": 0.75,
  "1/8": 0.5,
  "1/8t": 1 / 3,
  "1/16.": 0.375,
  "1/16": 0.25,
  "1/16t": 1 / 6,
  "1/32": 0.125,
};

export const SYNC_DIVISIONS = Object.keys(DIVISION_BEATS);

// Seconds for one `division` at `tempo`, or null when unsynced (or unknown, e.g. older data).
export function syncedSeconds(division, tempo) {
  const beats = DIVISION_BEATS[division] ?? null;
  return beats === null ? null : (beats * 60) / tempo;
}
