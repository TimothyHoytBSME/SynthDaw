import { createProject } from "../core/project.js";
import { createPresetPatch } from "../audio/presets.js";
import { normalizePatch } from "../audio/patch.js";
import { resetDemoIds, note, block, effect, track } from "./demoKit.js";

// "Neon Aurora": a symphonic overture in D minor at 92 BPM, 64 bars (about 2:47), for a
// synthesized orchestra: strings, horns, trumpets, flute, oboe, harp, choir, timpani, snare,
// cymbals and glockenspiel. It is not a loop. Dawn → Theme → Storm → Hymn (D major) → Finale.
// See neonAurora.md for the score map, the harmony and the balance notes.

const TEMPO = 92;
const BEATS_PER_BAR = 4;
const SONG_BARS = 64;

// Chords: `root` is the root in octave 4; `voicing` is the four-part string/choir voicing
// (A3–A4 region, close position). Thirds and fifths derive from the root.
const CHORDS = {
  Dm: { root: 62, minor: true, voicing: [57, 62, 65, 69] },
  Gm: { root: 67, minor: true, voicing: [55, 62, 67, 70] },
  F: { root: 65, minor: false, voicing: [57, 60, 65, 69] },
  A: { root: 69, minor: false, voicing: [57, 61, 64, 69] },
  A7: { root: 69, minor: false, voicing: [57, 61, 67, 69] },
  Bb: { root: 70, minor: false, voicing: [58, 62, 65, 70] },
  D: { root: 62, minor: false, voicing: [57, 62, 66, 69] },
  G: { root: 67, minor: false, voicing: [55, 62, 67, 71] },
  Bm: { root: 71, minor: true, voicing: [59, 62, 66, 71] },
};
// Pitch classes, lowest first, for diatonic steps (harmonies in thirds, walking lines).
const D_HARMONIC_MINOR = [2, 4, 5, 7, 9, 10, 1];
const D_MAJOR = [2, 4, 6, 7, 9, 11, 1];

// [first bar, bar count] and the chord per bar of each 8-bar section.
const DAWN_1 = [0, 8];
const DAWN_2 = [8, 8];
const THEME_1 = [16, 8];
const THEME_2 = [24, 8];
const STORM = [32, 8];
const CLIMAX = [40, 8];
const HYMN = [48, 8];
const FINALE = [56, 8];
const MINOR_PROGRESSION = ["Dm", "Gm", "F", "A", "Dm", "Bb", "Gm", "A"];
const STORM_PROGRESSION = ["Dm", "Bb", "Gm", "A", "Dm", "Bb", "Gm", "A"];
const CLIMAX_PROGRESSION = ["Dm", "Bb", "Gm", "A", "Dm", "Bb", "Gm", "A7"];
const MAJOR_PROGRESSION = ["D", "G", "D", "A", "D", "Bm", "G", "A"];
const FINALE_PROGRESSION = ["D", "Bm", "G", "A", "D", "D", "D", "D"];
const PROGRESSIONS = new Map([
  [DAWN_1, ["Dm", "Dm", "Dm", "Dm", "Dm", "Gm", "Dm", "A"]],
  [DAWN_2, MINOR_PROGRESSION],
  [THEME_1, MINOR_PROGRESSION],
  [THEME_2, MINOR_PROGRESSION],
  [STORM, STORM_PROGRESSION],
  [CLIMAX, CLIMAX_PROGRESSION],
  [HYMN, MAJOR_PROGRESSION],
  [FINALE, FINALE_PROGRESSION],
]);
// Bar 48 (index 47) is the breath before the Hymn: the orchestra stops on A7 and only the
// timpani, snare and a cymbal swell carry through. The final chord starts at bar 61 (index 60).
const BREATH_BAR = CLIMAX[0] + CLIMAX[1] - 1;
const FINAL_CHORD_BAR = FINALE[0] + 4;

// The theme: 8 bars as [beat in phrase, pitch, length, velocity scale]. Minor (D harmonic
// minor) and its major transformation share one rhythm.
const THEME_MINOR = [
  [0, 74, 2, 1], [2, 69, 1, 0.85], [3, 70, 1, 0.9],
  [4, 69, 3, 0.95], [7, 67, 1, 0.8],
  [8, 65, 2, 0.9], [10, 67, 1, 0.85], [11, 69, 1, 0.9],
  [12, 64, 2, 0.9], [14, 73, 2, 1],
  [16, 74, 2, 1], [18, 77, 1, 0.95], [19, 76, 1, 0.9],
  [20, 74, 1, 0.9], [21, 72, 1, 0.85], [22, 70, 2, 0.9],
  [24, 69, 2, 0.9], [26, 67, 1, 0.85], [27, 65, 1, 0.85],
  [28, 64, 1, 0.85], [29, 73, 1, 0.95], [30, 74, 2, 1],
];
const THEME_MAJOR = [
  [0, 74, 2, 1], [2, 69, 1, 0.85], [3, 71, 1, 0.9],
  [4, 69, 3, 0.95], [7, 67, 1, 0.8],
  [8, 66, 2, 0.9], [10, 67, 1, 0.85], [11, 69, 1, 0.9],
  [12, 64, 2, 0.9], [14, 73, 2, 1],
  [16, 74, 2, 1], [18, 78, 1, 0.95], [19, 76, 1, 0.9],
  [20, 74, 1, 0.9], [21, 73, 1, 0.85], [22, 71, 2, 0.9],
  [24, 69, 2, 0.9], [26, 67, 1, 0.85], [27, 66, 1, 0.85],
  [28, 64, 1, 0.85], [29, 73, 1, 0.95], [30, 74, 2, 1],
];

// Dynamics: the velocity each section plays at (pp … ff).
const PP = 50;
const P = 62;
const MP = 74;
const MF = 86;
const F = 96;
const FF = 110;

function clampVelocity(value) {
  return Math.max(1, Math.min(127, Math.round(value)));
}

function third(chord) {
  return chord.root + (chord.minor ? 3 : 4);
}

function fifth(chord) {
  return chord.root + 7;
}

// `steps` diatonic steps up (or down, negative) from `pitch` within `scale` (pitch classes).
function scaleStep(scale, pitch, steps) {
  const classes = [...scale].sort((a, b) => a - b);
  const index = classes.indexOf(((pitch % 12) + 12) % 12);
  const position = index === -1 ? 0 : index;
  const target = position + steps;
  const octaves = Math.floor(target / classes.length);
  const pitchClass = classes[((target % classes.length) + classes.length) % classes.length];
  const base = pitch - (((pitch % 12) + 12) % 12);
  return base + pitchClass + octaves * 12;
}

// One block spanning a section, filled bar by bar with perBar(chord, barStartBeat, barIndex),
// where barStartBeat is relative to the block.
function sectionBlock(section, perBar) {
  const [firstBar, barCount] = section;
  const chords = PROGRESSIONS.get(section);
  const notes = [];
  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    notes.push(...perBar(CHORDS[chords[barIndex]], barIndex * BEATS_PER_BAR, barIndex, firstBar + barIndex));
  }
  return block(firstBar * BEATS_PER_BAR, notes, barCount * BEATS_PER_BAR);
}

// The theme as an 8-bar block, transposed, at a dynamic.
function themeBlock(section, theme, transpose, dynamic) {
  return block(
    section[0] * BEATS_PER_BAR,
    theme.map(([beat, pitch, length, scale]) => note(pitch + transpose, beat, length, clampVelocity(dynamic * scale))),
    section[1] * BEATS_PER_BAR,
  );
}

// A harmony line a diatonic third above the theme.
function themeThirdsBlock(section, theme, scale, transpose, dynamic) {
  return block(
    section[0] * BEATS_PER_BAR,
    theme.map(([beat, pitch, length, velocityScale]) =>
      note(scaleStep(scale, pitch, 2) + transpose, beat, length, clampVelocity(dynamic * velocityScale)),
    ),
    section[1] * BEATS_PER_BAR,
  );
}

// A rising velocity ramp across a bar: 16ths from `from` to `to`.
function roll(pitch, start, beats, from, to, step = 0.25) {
  const count = Math.round(beats / step);
  return Array.from({ length: count }, (_, index) =>
    note(pitch, start + index * step, step * 0.9, clampVelocity(from + ((to - from) * index) / Math.max(1, count - 1))),
  );
}

function chordNotes(pitches, start, length, velocity) {
  return pitches.map((pitch) => note(pitch, start, length, clampVelocity(velocity)));
}

// ---- Instruments ------------------------------------------------------------------------

function stringsPatch({ octave = 0, cutoff = 2200 } = {}) {
  return normalizePatch({
    oscillators: [
      { type: "sawtooth", octave, detune: -7, mix: 0.55 },
      { type: "sawtooth", octave, detune: 7, mix: 0.55 },
    ],
    filter: { type: "lowpass", cutoff, resonance: 0.6, envAmount: 600, velocitySensitivity: 0.4 },
    ampEnvelope: { attack: 0.22, decay: 0.3, sustain: 0.85, release: 0.7 },
    filterEnvelope: { attack: 0.3, decay: 0.4, sustain: 0.6, release: 0.5 },
    lfo: { rate: 5.5, depth: 0.04, target: "pitch", sync: "off" },
    gain: 1,
  });
}

// Short bowed notes (spiccato) for the storm's 16ths: a fast attack, so each note speaks.
function spiccatoPatch() {
  return normalizePatch({
    oscillators: [
      { type: "sawtooth", octave: 0, detune: -7, mix: 0.55 },
      { type: "sawtooth", octave: 0, detune: 7, mix: 0.55 },
    ],
    filter: { type: "lowpass", cutoff: 2600, resonance: 0.7, envAmount: 1200, velocitySensitivity: 0.5 },
    ampEnvelope: { attack: 0.015, decay: 0.25, sustain: 0.35, release: 0.12 },
    filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.1 },
    gain: 0.9,
  });
}

// Violins I: the melody.
function violinsITrack() {
  return track("Violins I", stringsPatch({ cutoff: 2600 }), {
    volume: 1.5,
    pan: -0.25,
    effects: [effect("chorus", { rate: 0.8, depth: 0.0025, mix: 0.35 })],
    blocks: [
      themeBlock(THEME_1, THEME_MINOR, 0, MP),
      themeBlock(THEME_2, THEME_MINOR, 0, MF),
      themeBlock(HYMN, THEME_MAJOR, 0, F),
      // Finale: the theme's second half, then the held final chord's top voice.
      block(
        FINALE[0] * BEATS_PER_BAR,
        [
          ...THEME_MAJOR.slice(12).map(([beat, pitch, length, scale]) => note(pitch, beat - 16, length, clampVelocity(FF * scale))),
          note(74, 16, 11, FF),
          note(81, 16, 11, FF - 8),
        ],
        FINALE[1] * BEATS_PER_BAR,
      ),
    ],
  });
}

// Violins II: the sustained four-part chords.
function violinsIITrack() {
  const chordBar = (dynamic, length = BEATS_PER_BAR) => (chord, start) => chordNotes(chord.voicing, start, length, dynamic);
  const stormChordBar = (dynamic) => (chord, start, barIndex, bar) =>
    bar === BREATH_BAR ? chordNotes(chord.voicing, start, 0.5, dynamic) : chordNotes(chord.voicing, start, BEATS_PER_BAR, dynamic - 8);
  return track("Violins II", stringsPatch(), {
    volume: 0.8,
    pan: 0.2,
    effects: [effect("chorus", { rate: 0.6, depth: 0.003, mix: 0.4 })],
    blocks: [
      sectionBlock(DAWN_2, chordBar(P)),
      sectionBlock(THEME_1, chordBar(MP)),
      sectionBlock(THEME_2, chordBar(MF)),
      sectionBlock(STORM, stormChordBar(F)),
      sectionBlock(CLIMAX, stormChordBar(FF)),
      sectionBlock(HYMN, chordBar(F)),
      sectionBlock(FINALE, (chord, start, barIndex, bar) =>
        bar < FINAL_CHORD_BAR ? chordNotes(chord.voicing, start, BEATS_PER_BAR, FF) : bar === FINAL_CHORD_BAR ? chordNotes(chord.voicing, start, 11, FF) : [],
      ),
    ],
  });
}

// Violas: the storm's 16th ostinato, spiccato.
function violasTrack() {
  const ostinatoBar = (dynamic) => (chord, start, barIndex, bar) => {
    if (bar === BREATH_BAR) {
      return chordNotes(chord.voicing, start, 0.5, dynamic); // one stab, then the breath
    }
    const tones = [chord.root, third(chord), fifth(chord), chord.root + 12];
    const pattern = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3];
    return pattern.map((toneIndex, step) =>
      note(tones[toneIndex], start + step * 0.25, 0.22, clampVelocity(dynamic * (step % 4 === 0 ? 1 : step % 2 === 0 ? 0.85 : 0.72))),
    );
  };
  return track("Violas", spiccatoPatch(), {
    volume: 1.2,
    pan: 0.3,
    blocks: [sectionBlock(STORM, ostinatoBar(F)), sectionBlock(CLIMAX, ostinatoBar(FF))],
  });
}

// Cellos: drone, a walking counter-line, driving 8ths in the storm.
function cellosTrack() {
  const walkBar = (scale, dynamic) => (chord, start) => {
    let pitch = fifth(chord) - 12;
    return [0, 1, 2, 3].map((beat) => {
      const current = pitch;
      pitch = scaleStep(scale, pitch, -1);
      return note(current, start + beat, 0.95, clampVelocity(dynamic * (beat === 0 ? 1 : 0.85)));
    });
  };
  const driveBar = (dynamic) => (chord, start, barIndex, bar) =>
    bar === BREATH_BAR
      ? [note(chord.root - 12, start, 0.5, dynamic)]
      : [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((beat) =>
          note(beat === 3 ? fifth(chord) - 12 : chord.root - 12, start + beat, 0.45, clampVelocity(dynamic * (beat % 1 === 0 ? 1 : 0.8))),
        );
  const patch = stringsPatch({ octave: -1, cutoff: 1100 });
  patch.ampEnvelope.attack = 0.1; // low strings speak faster than the violins' 220 ms
  return track("Cellos", patch, {
    volume: 0.7,
    pan: 0.1,
    blocks: [
      sectionBlock(DAWN_1, (chord, start, barIndex) => chordNotes([chord.root - 12, fifth(chord) - 12], start, BEATS_PER_BAR, PP + barIndex)),
      sectionBlock(DAWN_2, (chord, start) => chordNotes([chord.root - 12, fifth(chord) - 12], start, BEATS_PER_BAR, P)),
      sectionBlock(THEME_1, walkBar(D_HARMONIC_MINOR, MP)),
      sectionBlock(THEME_2, walkBar(D_HARMONIC_MINOR, MF)),
      sectionBlock(STORM, driveBar(F)),
      sectionBlock(CLIMAX, driveBar(FF)),
      sectionBlock(HYMN, (chord, start) => [note(chord.root - 12, start, 2, F), note(fifth(chord) - 12, start + 2, 2, F - 10)]),
      sectionBlock(FINALE, (chord, start, barIndex, bar) =>
        bar < FINAL_CHORD_BAR ? [note(chord.root - 12, start, 2, FF), note(fifth(chord) - 12, start + 2, 2, FF - 10)] : bar === FINAL_CHORD_BAR ? [note(chord.root - 12, start, 11, FF)] : [],
      ),
    ],
  });
}

// Contrabass: the root two octaves below the chord (D2 = 73 Hz), whole notes.
function contrabassTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "sine", octave: 0, detune: 0, mix: 0.9 },
      { type: "sawtooth", octave: 0, detune: 0, mix: 0.12 },
    ],
    filter: { type: "lowpass", cutoff: 500, resonance: 0.7, envAmount: 0 },
    ampEnvelope: { attack: 0.08, decay: 0.2, sustain: 0.9, release: 0.5 },
    gain: 0.8,
  });
  const rootBar = (dynamic) => (chord, start, barIndex, bar) =>
    bar === BREATH_BAR ? [note(chord.root - 24, start, 0.5, dynamic)] : [note(chord.root - 24, start, BEATS_PER_BAR, dynamic)];
  return track("Contrabass", patch, {
    volume: 0.5,
    blocks: [
      sectionBlock(DAWN_1, (chord, start, barIndex) => [note(38, start, BEATS_PER_BAR, PP + barIndex)]),
      sectionBlock(DAWN_2, rootBar(P)),
      sectionBlock(THEME_1, rootBar(MP)),
      sectionBlock(THEME_2, rootBar(MF)),
      sectionBlock(STORM, rootBar(F)),
      sectionBlock(CLIMAX, rootBar(FF)),
      sectionBlock(HYMN, rootBar(F)),
      sectionBlock(FINALE, (chord, start, barIndex, bar) =>
        bar < FINAL_CHORD_BAR ? [note(chord.root - 24, start, BEATS_PER_BAR, FF)] : bar === FINAL_CHORD_BAR ? [note(chord.root - 24, start, 11, FF)] : [],
      ),
    ],
  });
}

// Horns: slow-opening filter for the "bwah"; sustained fifths, then fanfares.
function hornsTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "sawtooth", octave: 0, detune: -3, mix: 0.5 },
      { type: "square", octave: 0, detune: 3, mix: 0.35 },
    ],
    filter: { type: "lowpass", cutoff: 650, resonance: 1.2, envAmount: 1400, velocitySensitivity: 0.6 },
    ampEnvelope: { attack: 0.04, decay: 0.2, sustain: 0.8, release: 0.35 },
    filterEnvelope: { attack: 0.06, decay: 0.35, sustain: 0.5, release: 0.3 },
    gain: 0.8,
  });
  const sustainBar = (dynamic) => (chord, start) => chordNotes([chord.root - 12, fifth(chord) - 12], start, 2, dynamic).concat(chordNotes([chord.root - 12, fifth(chord) - 12], start + 2, 2, dynamic - 8));
  // Dotted fanfare rhythm on the root and fifth.
  const fanfareBar = (dynamic) => (chord, start, barIndex, bar) =>
    bar === BREATH_BAR
      ? chordNotes([chord.root - 12, fifth(chord) - 12], start, 0.5, dynamic)
      : [
          [0, chord.root - 12, 0.75], [0.75, chord.root - 12, 0.25], [1, fifth(chord) - 12, 1],
          [2, chord.root - 12, 0.75], [2.75, fifth(chord) - 12, 0.25], [3, chord.root, 1],
        ].map(([beat, pitch, length]) => note(pitch, start + beat, length, clampVelocity(dynamic * (beat % 1 === 0 ? 1 : 0.8))));
  return track("Horns", patch, {
    volume: 1,
    pan: -0.1,
    blocks: [
      sectionBlock(THEME_2, sustainBar(MF - 6)),
      sectionBlock(STORM, fanfareBar(F)),
      sectionBlock(CLIMAX, fanfareBar(FF)),
      sectionBlock(HYMN, (chord, start) => chordNotes([chord.root - 12, third(chord) - 12, fifth(chord) - 12], start, BEATS_PER_BAR, F - 6)),
      sectionBlock(FINALE, (chord, start, barIndex, bar) =>
        bar < FINAL_CHORD_BAR
          ? chordNotes([chord.root - 12, third(chord) - 12, fifth(chord) - 12], start, BEATS_PER_BAR, FF - 6)
          : bar === FINAL_CHORD_BAR
            ? chordNotes([chord.root - 12, third(chord) - 12, fifth(chord) - 12], start, 11, FF)
            : [],
      ),
    ],
  });
}

// Trumpets: bright, fast attack; fanfares, and the theme itself at the climax.
function trumpetsTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "square", octave: 0, detune: 0, mix: 0.45 },
      { type: "sawtooth", octave: 0, detune: 5, mix: 0.4 },
    ],
    filter: { type: "lowpass", cutoff: 1800, resonance: 1.5, envAmount: 2400, velocitySensitivity: 0.7 },
    ampEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.2 },
    filterEnvelope: { attack: 0.012, decay: 0.2, sustain: 0.45, release: 0.2 },
    gain: 0.9,
  });
  const fanfareBar = (dynamic) => (chord, start, barIndex, bar) =>
    bar === BREATH_BAR
      ? chordNotes([chord.root, fifth(chord)], start, 0.5, dynamic)
      : [
          [0, chord.root, 0.75], [0.75, chord.root, 0.25], [1, fifth(chord), 1],
          [2, chord.root, 0.75], [2.75, fifth(chord), 0.25], [3, chord.root + 12, 1],
        ].map(([beat, pitch, length]) => note(pitch, start + beat, length, clampVelocity(dynamic * (beat % 1 === 0 ? 1 : 0.8))));
  // Short calls at the ends of the second theme's phrases.
  const callBar = (chord, start, barIndex) =>
    barIndex % 4 === 3 ? [note(fifth(chord), start + 2, 0.5, MF), note(fifth(chord), start + 2.5, 0.5, MF), note(chord.root + 12, start + 3, 1, MF + 6)] : [];
  return track("Trumpets", patch, {
    volume: 1.3,
    pan: 0.3,
    blocks: [
      sectionBlock(THEME_2, callBar),
      sectionBlock(STORM, fanfareBar(F - 4)),
      themeBlock(CLIMAX, THEME_MINOR, 0, FF),
      sectionBlock(HYMN, (chord, start, barIndex) => (barIndex % 4 === 3 ? [note(fifth(chord), start + 2.5, 0.5, F), note(chord.root + 12, start + 3, 1, F + 6)] : [])),
      sectionBlock(FINALE, (chord, start, barIndex, bar) =>
        bar < FINAL_CHORD_BAR
          ? (barIndex % 2 === 1 ? [note(fifth(chord), start + 2.5, 0.5, FF - 6), note(chord.root + 12, start + 3, 1, FF)] : [])
          : bar === FINAL_CHORD_BAR
            ? [note(chord.root + 12, start, 11, FF), note(fifth(chord), start, 11, FF - 10)]
            : [],
      ),
    ],
  });
}

// Flute: a sine with a touch of triangle, slow vibrato; the theme at dawn, an octave up.
function fluteTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "sine", octave: 0, detune: 0, mix: 0.7 },
      { type: "triangle", octave: 0, detune: 0, mix: 0.25 },
    ],
    filter: { type: "lowpass", cutoff: 4000, resonance: 0.5, envAmount: 0 },
    ampEnvelope: { attack: 0.07, decay: 0.2, sustain: 0.8, release: 0.25 },
    lfo: { rate: 5, depth: 0.05, target: "pitch", sync: "off" },
    gain: 0.6,
  });
  return track("Flute", patch, {
    volume: 0.95,
    pan: -0.15,
    effects: [effect("delay", { sync: "1/4.", feedback: 0.2, mix: 0.15 })],
    blocks: [
      // Dawn: the theme's first phrase, alone over the drone, from bar 5.
      block(
        (DAWN_1[0] + 4) * BEATS_PER_BAR,
        THEME_MINOR.filter(([beat]) => beat < 16).map(([beat, pitch, length, scale]) => note(pitch + 12, beat, length, clampVelocity(PP * scale + 4))),
        4 * BEATS_PER_BAR,
      ),
      themeBlock(DAWN_2, THEME_MINOR, 12, P),
      themeBlock(HYMN, THEME_MAJOR, 12, MF),
    ],
  });
}

// Oboe: hollow and reedy; a harmony in thirds above the theme.
function oboeTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "square", octave: 0, detune: 0, mix: 0.4 },
      { type: "sawtooth", octave: 0, detune: 0, mix: 0.2 },
    ],
    filter: { type: "lowpass", cutoff: 1500, resonance: 2.5, envAmount: 300 },
    ampEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.2 },
    lfo: { rate: 5.2, depth: 0.04, target: "pitch", sync: "off" },
    gain: 0.4,
  });
  return track("Oboe", patch, {
    volume: 0.65,
    pan: 0.15,
    blocks: [themeThirdsBlock(THEME_2, THEME_MINOR, D_HARMONIC_MINOR, 0, MF - 8), themeThirdsBlock(FINALE, THEME_MAJOR.slice(12).map(([beat, ...rest]) => [beat - 16, ...rest]), D_MAJOR, 0, F)],
  });
}

// Harp: plucked arpeggios through the dawn and the hymn.
function harpTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "triangle", octave: 0, detune: 0, mix: 0.6 },
      { type: "sine", octave: 1, detune: 0, mix: 0.25 },
    ],
    filter: { type: "lowpass", cutoff: 3500, resonance: 0.5, envAmount: 1500 },
    ampEnvelope: { attack: 0.003, decay: 1.3, sustain: 0, release: 0.8 },
    filterEnvelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 },
    gain: 0.5,
  });
  // Up and down through root, third, fifth, octave in 8ths.
  const arpBar = (dynamic) => (chord, start) => {
    const tones = [chord.root, third(chord), fifth(chord), chord.root + 12, fifth(chord) + 12, chord.root + 12, fifth(chord), third(chord)];
    return tones.map((pitch, step) => note(pitch, start + step * 0.5, 0.5, clampVelocity(dynamic * (step === 0 ? 1 : 0.8))));
  };
  return track("Harp", patch, {
    volume: 1.1,
    pan: 0.35,
    effects: [effect("delay", { sync: "1/8.", feedback: 0.15, mix: 0.12 })],
    blocks: [
      sectionBlock(DAWN_1, (chord, start, barIndex) => (barIndex >= 2 ? arpBar(PP + 6)(chord, start) : [])),
      sectionBlock(DAWN_2, arpBar(P)),
      sectionBlock(THEME_1, arpBar(MP - 10)),
      sectionBlock(HYMN, arpBar(MF)),
      sectionBlock(FINALE, (chord, start, barIndex, bar) => (bar < FINAL_CHORD_BAR ? arpBar(F)(chord, start) : [])),
    ],
  });
}

// Choir: "ah" pad, slow filter movement, under the climax and the hymn.
function choirTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "triangle", octave: 0, detune: -10, mix: 0.6 },
      { type: "sawtooth", octave: 0, detune: 10, mix: 0.3 },
    ],
    filter: { type: "lowpass", cutoff: 1300, resonance: 1, envAmount: 400 },
    ampEnvelope: { attack: 0.5, decay: 0.5, sustain: 0.9, release: 1 },
    filterEnvelope: { attack: 0.8, decay: 0.5, sustain: 0.6, release: 0.8 },
    lfo: { rate: 0.3, depth: 0.08, target: "filter", sync: "1/1" },
    gain: 0.8,
  });
  return track("Choir", patch, {
    volume: 0.9,
    effects: [effect("chorus", { rate: 0.5, depth: 0.003, mix: 0.5 })],
    blocks: [
      sectionBlock(CLIMAX, (chord, start, barIndex, bar) => (bar === BREATH_BAR ? [] : chordNotes(chord.voicing, start, BEATS_PER_BAR, F))),
      sectionBlock(HYMN, (chord, start) => chordNotes(chord.voicing, start, BEATS_PER_BAR, F - 6)),
      sectionBlock(FINALE, (chord, start, barIndex, bar) =>
        bar < FINAL_CHORD_BAR ? chordNotes(chord.voicing, start, BEATS_PER_BAR, FF - 6) : bar === FINAL_CHORD_BAR ? chordNotes([...chord.voicing, chord.root + 12], start, 11, FF) : [],
      ),
    ],
  });
}

// Timpani: a tuned drum (the Kick preset slowed down) on the chord root in octave 2 (D2, A2).
function timpaniTrack() {
  const patch = createPresetPatch("Kick");
  patch.oscillators[1].mix = 0.15;
  patch.filter = { type: "lowpass", cutoff: 350, resonance: 1.5, envAmount: 500, velocitySensitivity: 0.3 };
  patch.ampEnvelope = { attack: 0.002, decay: 0.9, sustain: 0, release: 0.3 };
  patch.filterEnvelope = { attack: 0.001, decay: 0.08, sustain: 0, release: 0.1 };
  patch.pitchEnvelope = { amount: 5, decay: 0.12 };
  patch.gain = 0.9;
  const drum = (chord) => chord.root - 24;
  const stormBar = (dynamic) => (chord, start, barIndex, bar) => {
    if (bar === BREATH_BAR) {
      return [note(drum(chord), start, 0.5, dynamic), ...roll(drum(chord), start + 1, 3, dynamic - 40, dynamic + 6)];
    }
    const hits = [[0, 1], [2, 0.9], [3.5, 0.75]];
    const notes = hits.map(([beat, scale]) => note(drum(chord), start + beat, 0.5, clampVelocity(dynamic * scale)));
    return barIndex % 4 === 3 ? notes.concat(roll(drum(chord), start + 2.5, 1.5, dynamic - 30, dynamic)) : notes;
  };
  return track("Timpani", patch, {
    volume: 0.25,
    pan: -0.2,
    blocks: [
      // A soft roll on A at the end of the dawn, into the theme.
      block((DAWN_2[0] + 7) * BEATS_PER_BAR, roll(45, 0, 4, PP - 10, MP), BEATS_PER_BAR),
      sectionBlock(THEME_1, (chord, start, barIndex) => [note(drum(chord), start, 0.5, MP), ...(barIndex % 4 === 3 ? [note(drum(chord), start + 2, 0.5, MP - 10), note(drum(chord), start + 3, 0.5, MP)] : [])]),
      sectionBlock(THEME_2, (chord, start, barIndex) => [note(drum(chord), start, 0.5, MF), note(drum(chord), start + 2, 0.5, MF - 14), ...(barIndex === 7 ? roll(drum(chord), start + 2.5, 1.5, MP, F) : [])]),
      sectionBlock(STORM, stormBar(F)),
      sectionBlock(CLIMAX, stormBar(FF)),
      sectionBlock(HYMN, (chord, start, barIndex) => [note(drum(chord), start, 0.5, F), note(drum(chord), start + 2, 0.5, F - 16), ...(barIndex === 7 ? roll(drum(chord), start + 2, 2, MF, FF) : [])]),
      sectionBlock(FINALE, (chord, start, barIndex, bar) => {
        if (bar < FINAL_CHORD_BAR) {
          return [note(drum(chord), start, 0.5, FF), note(drum(chord), start + 2, 0.5, FF - 16), ...(bar === FINAL_CHORD_BAR - 1 ? roll(drum(chord), start + 2.5, 1.5, F, FF) : [])];
        }
        if (bar === FINAL_CHORD_BAR) {
          return [note(drum(chord), start, 1, FF)];
        }
        if (bar === FINAL_CHORD_BAR + 2) {
          return roll(drum(chord), start, 3.5, MP, FF); // the last swell under the held chord
        }
        return [];
      }),
    ],
  });
}

// Orchestral snare: the preset with a gentler pitch drop; rolls and marching 8ths.
function snareTrack() {
  const patch = createPresetPatch("Snare");
  patch.pitchEnvelope = { amount: 2, decay: 0.04 };
  patch.gain = 0.8;
  const marchBar = (dynamic) => (chord, start, barIndex, bar) => {
    if (bar === BREATH_BAR) {
      return [note(52, start, 0.25, dynamic), ...roll(52, start + 1, 3, dynamic - 50, dynamic, 0.125)];
    }
    const eighths = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((beat) =>
      note(52, start + beat, 0.2, clampVelocity(dynamic * (beat % 2 === 0 ? 1 : beat % 1 === 0 ? 0.7 : 0.5))),
    );
    return barIndex % 4 === 3 ? eighths.filter((n) => n.startBeat - start < 2).concat(roll(52, start + 2, 2, dynamic - 36, dynamic)) : eighths;
  };
  return track("Snare", patch, {
    volume: 1,
    pan: 0.05,
    blocks: [
      // Rolls that lead into the storm and into the hymn's last phrase.
      block((THEME_2[0] + 7) * BEATS_PER_BAR + 2, roll(52, 0, 2, PP, F), 2),
      sectionBlock(STORM, marchBar(MF)),
      sectionBlock(CLIMAX, marchBar(F)),
      block((HYMN[0] + 7) * BEATS_PER_BAR + 2, roll(52, 0, 2, MP, FF), 2),
      block((FINAL_CHORD_BAR - 1) * BEATS_PER_BAR + 2, roll(52, 0, 2, MF, FF, 0.125), 2),
      block(FINAL_CHORD_BAR * BEATS_PER_BAR, [note(52, 0, 0.5, FF)], 1),
    ],
  });
}

// Cymbals: a crash (long, dark open hat) on the big downbeats, plus a swelled suspended
// cymbal (the Noise Sweep preset) into the hymn.
function cymbalsTrack() {
  const patch = createPresetPatch("Open Hat");
  patch.filter.cutoff = 3000;
  patch.ampEnvelope = { attack: 0.001, decay: 2.2, sustain: 0, release: 0.8 };
  patch.gain = 0.5;
  const crash = (bar, velocity) => block(bar * BEATS_PER_BAR, [note(76, 0, 2, velocity)], 2);
  return track("Cymbals", patch, {
    volume: 0.85,
    pan: 0.2,
    blocks: [crash(STORM[0], F), crash(CLIMAX[0], FF), crash(HYMN[0], FF), crash(FINALE[0], F), crash(FINAL_CHORD_BAR, FF)],
  });
}

function suspendedCymbalTrack() {
  const patch = createPresetPatch("Noise Sweep");
  patch.ampEnvelope = { attack: 2.4, decay: 0.2, sustain: 1, release: 1 };
  patch.filterEnvelope = { attack: 2.4, decay: 0.3, sustain: 1, release: 0.8 };
  patch.filter = { type: "highpass", cutoff: 1500, resonance: 1, envAmount: 4000 };
  patch.gain = 0.4;
  const swell = (firstBar, beats, velocity) => block(firstBar * BEATS_PER_BAR, [note(76, 0, beats, velocity)], beats);
  return track("Susp. Cymbal", patch, {
    volume: 0.55,
    blocks: [swell(STORM[0] - 1, 4, MF), swell(BREATH_BAR, 4, F), swell(FINAL_CHORD_BAR + 2, 4, FF)],
  });
}

// Glockenspiel: doubles the hymn melody's downbeats an octave up, and the final arpeggio.
function glockenspielTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "sine", octave: 0, detune: 0, mix: 0.7 },
      { type: "sine", octave: 2, detune: 0, mix: 0.2 },
    ],
    filter: { type: "lowpass", cutoff: 8000, resonance: 0.5, envAmount: 0 },
    ampEnvelope: { attack: 0.002, decay: 1.4, sustain: 0, release: 1 },
    gain: 0.5,
  });
  const downbeats = THEME_MAJOR.filter(([beat]) => beat % 4 === 0);
  return track("Glockenspiel", patch, {
    volume: 0.95,
    pan: 0.45,
    blocks: [
      block(HYMN[0] * BEATS_PER_BAR, downbeats.map(([beat, pitch, length, scale]) => note(pitch + 12, beat, length, clampVelocity(MF * scale))), HYMN[1] * BEATS_PER_BAR),
      // The final chord: a rising D major arpeggio in 16ths, then the top D rings out.
      block(
        (FINAL_CHORD_BAR + 1) * BEATS_PER_BAR,
        [74, 78, 81, 86, 90, 93, 98].map((pitch, index) => note(pitch, index * 0.25, 0.5, clampVelocity(F + index * 3))).concat([note(98, 2, 3, FF)]),
        2 * BEATS_PER_BAR,
      ),
    ],
  });
}

export function createNeonAuroraProject() {
  resetDemoIds();
  const project = createProject();
  project.tempo = TEMPO;
  project.timeSignature.beatsPerBar = BEATS_PER_BAR;
  project.tracks = [
    violinsITrack(),
    violinsIITrack(),
    violasTrack(),
    cellosTrack(),
    contrabassTrack(),
    hornsTrack(),
    trumpetsTrack(),
    fluteTrack(),
    oboeTrack(),
    harpTrack(),
    choirTrack(),
    timpaniTrack(),
    snareTrack(),
    cymbalsTrack(),
    suspendedCymbalTrack(),
    glockenspielTrack(),
  ];
  // One hall for the whole orchestra: a single master reverb instead of one per track.
  project.master = {
    volume: 0.3,
    effects: [
      effect("eq", { low: 1, mid: 0, high: 1 }),
      effect("reverb", { size: 4.5, mix: 0.3 }),
      effect("compressor", { threshold: -24, ratio: 3, attack: 0.01, release: 0.4 }),
    ],
  };
  // Not a loop: it has an ending. The range is set so "Loop" can be ticked to repeat it.
  project.loop = { enabled: false, startBeat: 0, endBeat: SONG_BARS * BEATS_PER_BAR };
  return project;
}
