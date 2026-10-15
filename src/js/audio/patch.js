// "noise" is white noise: it ignores octave, detune, pitch bend and pitch modulation.
export const OSC_TYPES = ["sine", "sawtooth", "square", "triangle", "noise"];
export const FILTER_TYPES = ["lowpass", "highpass", "bandpass", "notch"];
export const LFO_TARGETS = ["pitch", "filter", "amp"];

export function createDefaultPatch() {
  return {
    oscillators: [
      { type: "sawtooth", octave: 0, detune: 0, mix: 0.7 },
      { type: "square", octave: 0, detune: -7, mix: 0.3 },
    ],
    // velocitySensitivity scales envAmount by velocity: 0 = every note sweeps the same, 1 = a
    // velocity-1 note gets no sweep and a velocity-127 note the full amount.
    filter: { type: "lowpass", cutoff: 2200, resonance: 1, envAmount: 1800, velocitySensitivity: 0 },
    ampEnvelope: { attack: 0.01, decay: 0.18, sustain: 0.65, release: 0.25 },
    filterEnvelope: { attack: 0.01, decay: 0.25, sustain: 0.3, release: 0.3 },
    // Each note starts `amount` semitones off pitch and glides back over `decay` seconds
    // (drum kicks, zaps). 0 = off.
    pitchEnvelope: { amount: 0, decay: 0.08 },
    // depth is a normalized 0–1 amount; voice.js scales it per target (cents, Hz, or gain).
    // sync: a note division from tempoSync.js ("1/8", ...) overrides rate; "off" = free rate.
    lfo: { rate: 5, depth: 0, target: "pitch", sync: "off" },
    gain: 0.7,
  };
}

export function clonePatch(patch) {
  return JSON.parse(JSON.stringify(patch));
}

function mergeDefaults(defaults, value) {
  if (Array.isArray(defaults)) {
    return defaults.map((item, index) => mergeDefaults(item, value?.[index]));
  }
  if (defaults !== null && typeof defaults === "object") {
    const merged = {};
    for (const key of Object.keys(defaults)) {
      merged[key] = mergeDefaults(defaults[key], value?.[key]);
    }
    return merged;
  }
  return value ?? defaults;
}

// Returns a complete patch: any field missing from `patch` (older saves, partial presets)
// takes the default, and unknown fields are dropped.
export function normalizePatch(patch) {
  return mergeDefaults(createDefaultPatch(), patch);
}
