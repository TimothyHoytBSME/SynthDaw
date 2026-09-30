import { normalizePatch } from "./patch.js";

// Each preset only lists what differs from the default patch; normalizePatch fills the rest.
const PRESET_OVERRIDES = {
  Init: {},
  "Saw Lead": {
    oscillators: [
      { type: "sawtooth", detune: -6, mix: 0.6 },
      { type: "sawtooth", detune: 6, mix: 0.6 },
    ],
    filter: { cutoff: 3000, resonance: 3, envAmount: 2500 },
    ampEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.2 },
    lfo: { rate: 5.5, depth: 0.08, target: "pitch" },
    gain: 0.55,
  },
  "Soft Pad": {
    oscillators: [
      { type: "triangle", detune: -10, mix: 0.6 },
      { type: "sawtooth", detune: 10, mix: 0.25 },
    ],
    filter: { cutoff: 900, resonance: 0.8, envAmount: 900 },
    ampEnvelope: { attack: 0.8, decay: 0.6, sustain: 0.8, release: 1.6 },
    filterEnvelope: { attack: 1.2, decay: 1, sustain: 0.5, release: 1.5 },
    lfo: { rate: 0.3, depth: 0.15, target: "filter" },
    gain: 0.6,
  },
  Pluck: {
    oscillators: [
      { type: "square", mix: 0.5 },
      { type: "sawtooth", octave: 1, detune: 3, mix: 0.3 },
    ],
    filter: { cutoff: 400, resonance: 4, envAmount: 4500 },
    ampEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.2 },
    filterEnvelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.15 },
    gain: 0.7,
  },
  "Sub Bass": {
    oscillators: [
      { type: "sine", octave: -1, mix: 0.9 },
      { type: "square", octave: -1, detune: 0, mix: 0.15 },
    ],
    filter: { cutoff: 600, resonance: 1, envAmount: 300 },
    ampEnvelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 0.12 },
    gain: 0.8,
  },
  Keys: {
    oscillators: [
      { type: "triangle", mix: 0.7 },
      { type: "sine", octave: 1, mix: 0.25 },
    ],
    filter: { cutoff: 2500, resonance: 0.7, envAmount: 1500 },
    ampEnvelope: { attack: 0.004, decay: 0.8, sustain: 0.35, release: 0.5 },
    filterEnvelope: { attack: 0.002, decay: 0.5, sustain: 0.2, release: 0.4 },
    lfo: { rate: 4, depth: 0.1, target: "amp" },
    gain: 0.65,
  },
  // Drums and effects: a noise oscillator for the rattle, a pitch envelope for the thump.
  // Sensible notes to play them on: Kick C2, Snare D3, Tom around C3, hats anywhere.
  Kick: {
    oscillators: [
      { type: "sine", mix: 1 },
      { type: "triangle", detune: 0, mix: 0.25 },
    ],
    filter: { cutoff: 900, resonance: 0.7, envAmount: 2500 },
    ampEnvelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.08 },
    filterEnvelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.05 },
    pitchEnvelope: { amount: 24, decay: 0.12 },
    gain: 0.9,
  },
  Snare: {
    oscillators: [
      { type: "noise", mix: 0.75 },
      { type: "triangle", detune: 0, mix: 0.6 },
    ],
    filter: { cutoff: 1800, resonance: 0.8, envAmount: 5000 },
    ampEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    filterEnvelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
    pitchEnvelope: { amount: 7, decay: 0.05 },
    gain: 0.75,
  },
  "Closed Hat": {
    oscillators: [
      { type: "noise", mix: 0.8 },
      { type: "square", octave: 3, detune: 0, mix: 0.05 },
    ],
    filter: { type: "highpass", cutoff: 7000, resonance: 1.2, envAmount: 0 },
    ampEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 },
    gain: 0.5,
  },
  "Open Hat": {
    oscillators: [
      { type: "noise", mix: 0.8 },
      { type: "square", octave: 3, detune: 0, mix: 0.05 },
    ],
    filter: { type: "highpass", cutoff: 6500, resonance: 1.2, envAmount: 0 },
    ampEnvelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.25 },
    gain: 0.45,
  },
  Tom: {
    oscillators: [
      { type: "sine", mix: 1 },
      { type: "noise", mix: 0.08 },
    ],
    filter: { cutoff: 1500, resonance: 0.7, envAmount: 1500 },
    ampEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.15 },
    filterEnvelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.1 },
    pitchEnvelope: { amount: 12, decay: 0.18 },
    gain: 0.85,
  },
  Zap: {
    oscillators: [
      { type: "sawtooth", mix: 0.6 },
      { type: "square", octave: -1, detune: 0, mix: 0.3 },
    ],
    filter: { cutoff: 1200, resonance: 6, envAmount: 4000 },
    ampEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.12 },
    filterEnvelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
    pitchEnvelope: { amount: 36, decay: 0.3 },
    gain: 0.5,
  },
  "Noise Sweep": {
    oscillators: [
      { type: "noise", mix: 0.7 },
      { type: "noise", mix: 0 },
    ],
    filter: { cutoff: 200, resonance: 4, envAmount: 9000 },
    ampEnvelope: { attack: 2, decay: 0.1, sustain: 1, release: 0.6 },
    filterEnvelope: { attack: 3, decay: 0.5, sustain: 1, release: 0.8 },
    gain: 0.45,
  },
};

export const PRESET_NAMES = Object.keys(PRESET_OVERRIDES);

export function createPresetPatch(name) {
  return normalizePatch(PRESET_OVERRIDES[name]);
}
