export function createDefaultPatch() {
  return {
    oscillators: [
      { type: "sawtooth", detune: 0, mix: 0.7 },
      { type: "square", detune: -7, mix: 0.3 },
    ],
    filter: { type: "lowpass", cutoff: 2200, resonance: 1, envAmount: 1800 },
    ampEnvelope: { attack: 0.01, decay: 0.18, sustain: 0.65, release: 0.25 },
    filterEnvelope: { attack: 0.01, decay: 0.25, sustain: 0.3, release: 0.3 },
    lfo: { rate: 5, depth: 0, target: "pitch" },
    gain: 0.7,
  };
}

export function clonePatch(patch) {
  return JSON.parse(JSON.stringify(patch));
}

export function serializePatch(patch) {
  return JSON.stringify(patch);
}

export function parsePatch(json) {
  return JSON.parse(json);
}
