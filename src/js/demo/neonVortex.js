import { createProject } from "../core/project.js";
import { createPresetPatch } from "../audio/presets.js";
import { normalizePatch } from "../audio/patch.js";
import { resetDemoIds, note, block, effect, track } from "./demoKit.js";

// "Neon Vortex": a 32-bar psytrance loop in E minor at 145 BPM. Four-on-the-floor kick, a
// rolling off-beat 16th bass, 16th hats, a resonant acid riff under a slow synced filter sweep,
// a trance-gated chord, zaps and squelch blips, pads in the breakdown, risers and a snare roll
// into the drop. See neonVortex.md for the song map and the balance measurements.

const TEMPO = 145;
const BEATS_PER_BAR = 4;
const SONG_BARS = 32;
const SIXTEENTH = 0.25;

// E minor. The bass and kick sit on E1; the acid riff lives in E minor pentatonic.
const KICK_NOTE = 28; // E1
const BASS_NOTE = 28; // E1
const SNARE_NOTE = 52; // E3 body
const HAT_NOTE = 76; // E5
const RISER_NOTE = 52;
const ZAP_NOTE = 52;
const E6_HZ = 1318.5;

// Pad voicings, one per breakdown bar: Em7, Cmaj7, D, Em (repeating).
const PAD_CHORDS = [
  [52, 55, 59, 62], // E3 G3 B3 D4
  [48, 52, 55, 59], // C3 E3 G3 B3
  [50, 54, 57, 62], // D3 F#3 A3 D4
  [52, 55, 59, 64], // E3 G3 B3 E4
];
const GATE_CHORD = [64, 67, 71]; // E4 G4 B4

// Acid riff: one bar of 16ths in E minor pentatonic (E2 G2 A2 B2 D3 E3), accents on the
// notes that leave the root. `length` < a 16th keeps it staccato; longer ones ring.
const ACID_RIFF = [
  [40, 0.2, 110], [40, 0.2, 70], [52, 0.2, 100], [40, 0.2, 70],
  [43, 0.2, 100], [40, 0.2, 70], [45, 0.45, 112], [47, 0.2, 80],
  [40, 0.2, 110], [50, 0.2, 100], [40, 0.2, 70], [40, 0.2, 70],
  [47, 0.2, 104], [40, 0.2, 70], [43, 0.45, 100], [45, 0.2, 84],
];

// Squelch blips: sparse 16ths, high in the E minor pentatonic (E5 G5 B5 D6).
const SQUELCH_HITS = [
  [2, 76], [7, 79], [11, 83], [14, 86],
];

// [first bar, bar count]
const INTRO = [0, 4];
const GROOVE = [4, 8];
const BREAK = [12, 4];
const BUILD = [16, 4];
const DROP = [20, 8];
const OUTRO = [28, 4];

function barsOf([first, count]) {
  return Array.from({ length: count }, (_, index) => first + index);
}

// One block per section, each note list built bar by bar with `perBar(barStartBeat, bar)`.
// `barStartBeat` is relative to the block, since note times are.
function sectionBlocks(sections, perBar) {
  return sections.map((section) => {
    const bars = barsOf(section);
    const notes = bars.flatMap((bar) => perBar((bar - bars[0]) * BEATS_PER_BAR, bar));
    return block(bars[0] * BEATS_PER_BAR, notes, bars.length * BEATS_PER_BAR);
  });
}

function sixteenths(count = 16) {
  return Array.from({ length: count }, (_, step) => step);
}

// Track volumes were balanced by rendering each track solo offline (see neonVortex.md).

// A shorter, tighter kick than the preset, so the rolling bass has room between hits.
function kickTrack() {
  const patch = createPresetPatch("Kick");
  patch.ampEnvelope.decay = 0.3;
  patch.pitchEnvelope = { amount: 26, decay: 0.09 };
  return track("Kick", patch, {
    volume: 0.75,
    blocks: sectionBlocks([INTRO, GROOVE, BUILD, DROP, OUTRO], (start) =>
      [0, 1, 2, 3].map((beat) => note(KICK_NOTE, start + beat, 0.5, 120)),
    ),
  });
}

// The psytrance rolling bass: three off-beat 16ths after every kick, very short, with a
// snappy filter envelope so each note is a click-and-thump rather than a tone.
function bassTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "sawtooth", octave: 0, detune: 0, mix: 0.8 },
      { type: "square", octave: 0, detune: 0, mix: 0.35 },
    ],
    filter: { type: "lowpass", cutoff: 170, resonance: 2.5, envAmount: 1500 },
    ampEnvelope: { attack: 0.002, decay: 0.11, sustain: 0.25, release: 0.04 },
    filterEnvelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
    gain: 0.85,
  });
  return track("Roll Bass", patch, {
    volume: 0.6,
    effects: [effect("eq", { low: 2, mid: 1, high: 0 })],
    blocks: sectionBlocks([INTRO, GROOVE, BUILD, DROP, OUTRO], (start, bar) =>
      bar < INTRO[0] + 2
        ? []
        : [0, 1, 2, 3].flatMap((beat) =>
            [1, 2, 3].map((step) => note(BASS_NOTE, start + beat + step * SIXTEENTH, 0.2, step === 2 ? 104 : 118)),
          ),
    ),
  });
}

// Snare on 2 and 4 in the full sections, plus the roll in the last build bar.
function snareTrack() {
  const patch = createPresetPatch("Snare");
  patch.gain = 1;
  const rollBar = BUILD[0] + BUILD[1] - 1;
  return track("Snare", patch, {
    volume: 0.85,
    pan: 0.05,
    effects: [effect("reverb", { size: 1.4, mix: 0.2 })],
    blocks: sectionBlocks([GROOVE, BUILD, DROP], (start, bar) => {
      if (bar === rollBar) {
        return sixteenths().map((step) => note(SNARE_NOTE, start + step * SIXTEENTH, 0.2, 60 + step * 4));
      }
      if (bar === rollBar - 1) {
        return [0, 1, 1.5, 2, 2.5, 3, 3.5].map((beat) => note(SNARE_NOTE, start + beat, 0.25, 90));
      }
      return [1, 3].map((beat) => note(SNARE_NOTE, start + beat, 0.25, 112));
    }),
  });
}

// 16th closed hats, accented on the off-beat 8ths; the open hat takes those from the groove on.
function closedHatTrack() {
  const patch = createPresetPatch("Closed Hat");
  patch.gain = 0.7;
  return track("Closed Hat", patch, {
    volume: 0.9,
    pan: 0.25,
    blocks: sectionBlocks([INTRO, GROOVE, BREAK, BUILD, DROP, OUTRO], (start, bar) => {
      const openHatsPlaying = bar >= GROOVE[0] && bar < BREAK[0] || bar >= DROP[0];
      return sixteenths()
        .filter((step) => !(openHatsPlaying && step % 4 === 2))
        .map((step) => note(HAT_NOTE, start + step * SIXTEENTH, 0.12, step % 4 === 2 ? 100 : step % 2 === 0 ? 66 : 52));
    }),
  });
}

function openHatTrack() {
  return track("Open Hat", createPresetPatch("Open Hat"), {
    volume: 0.6,
    pan: -0.2,
    blocks: sectionBlocks([GROOVE, DROP, OUTRO], (start) =>
      [0.5, 1.5, 2.5, 3.5].map((beat) => note(HAT_NOTE, start + beat, 0.25, 96)),
    ),
  });
}

// The acid line: two saws into a resonant lowpass. The filter envelope plucks each 16th, and a
// filter LFO synced to two bars sweeps the whole riff open and closed, so the line evolves
// without automation. The dotted-8th delay fills the gaps between staccato notes.
function acidTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "sawtooth", octave: 0, detune: -4, mix: 0.6 },
      { type: "sawtooth", octave: 0, detune: 5, mix: 0.4 },
    ],
    filter: { type: "lowpass", cutoff: 1300, resonance: 9, envAmount: 2200 },
    ampEnvelope: { attack: 0.003, decay: 0.2, sustain: 0.5, release: 0.08 },
    filterEnvelope: { attack: 0.001, decay: 0.16, sustain: 0.1, release: 0.1 },
    lfo: { rate: 0.2, depth: 0.28, target: "filter", sync: "2/1" },
    gain: 0.55,
  });
  return track("Acid", patch, {
    volume: 0.9,
    pan: 0.1,
    effects: [
      effect("delay", { sync: "1/8.", feedback: 0.3, mix: 0.22 }),
      effect("eq", { low: -3, mid: 1, high: 1 }),
    ],
    blocks: sectionBlocks([GROOVE, BUILD, DROP], (start, bar) =>
      bar < GROOVE[0] + 4
        ? ACID_RIFF.filter((_, step) => step % 2 === 0).map(([pitch, length, velocity], index) =>
            note(pitch, start + index * 2 * SIXTEENTH, length, velocity - 10),
          )
        : ACID_RIFF.map(([pitch, length, velocity], step) => note(pitch, start + step * SIXTEENTH, length, velocity)),
    ),
  });
}

// Breakdown pads, breathing with a filter LFO synced to a bar.
function padTrack() {
  const patch = createPresetPatch("Soft Pad");
  patch.lfo = { rate: 0.3, depth: 0.25, target: "filter", sync: "1/1" };
  return track("Pad", patch, {
    volume: 0.55,
    effects: [effect("reverb", { size: 3.5, mix: 0.45 })],
    blocks: sectionBlocks([INTRO, BREAK, OUTRO], (start, bar) =>
      PAD_CHORDS[bar % PAD_CHORDS.length].map((pitch) => note(pitch, start, BEATS_PER_BAR, 74)),
    ),
  });
}

// Trance gate: a full-depth amp LFO synced to 1/16 chops a held chord into 16th pulses.
function gateTrack() {
  const patch = createPresetPatch("Soft Pad");
  patch.ampEnvelope = { attack: 0.02, decay: 0.3, sustain: 0.9, release: 0.25 };
  patch.filter.cutoff = 2200;
  patch.lfo = { rate: 8, depth: 1, target: "amp", sync: "1/16" };
  return track("Gate", patch, {
    volume: 0.9,
    pan: -0.3,
    effects: [effect("delay", { sync: "1/8", feedback: 0.25, mix: 0.2 })],
    blocks: sectionBlocks([BREAK, DROP], (start) =>
      GATE_CHORD.map((pitch) => note(pitch, start, BEATS_PER_BAR, 84)),
    ),
  });
}

// Zaps on the "and" of 1 and the last 16th of 3, every other bar; the resonant filter rests on E6.
function zapTrack() {
  const patch = createPresetPatch("Zap");
  patch.filter.cutoff = E6_HZ;
  patch.gain = 0.8;
  return track("Zap", patch, {
    volume: 0.9,
    pan: 0.2,
    effects: [effect("delay", { sync: "1/4", feedback: 0.3, mix: 0.25 })],
    blocks: sectionBlocks([BREAK, DROP], (start, bar) =>
      bar % 2 === 0 ? [note(ZAP_NOTE, start + 0.5, 0.5, 110), note(ZAP_NOTE, start + 2.75, 0.5, 96)] : [],
    ),
  });
}

// Squelch blips: square + saw through a very resonant lowpass that snaps shut, with a short
// pitch drop, bouncing on a triplet delay. Sparse, high, and only in the full sections.
function squelchTrack() {
  const patch = normalizePatch({
    oscillators: [
      { type: "square", octave: 0, detune: 0, mix: 0.7 },
      { type: "sawtooth", octave: 0, detune: 0, mix: 0.4 },
    ],
    filter: { type: "lowpass", cutoff: 500, resonance: 12, envAmount: 3800 },
    ampEnvelope: { attack: 0.002, decay: 0.14, sustain: 0, release: 0.08 },
    filterEnvelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.05 },
    pitchEnvelope: { amount: 12, decay: 0.05 },
    gain: 0.8,
  });
  return track("Squelch", patch, {
    volume: 0.34,
    pan: -0.15,
    effects: [effect("delay", { sync: "1/8t", feedback: 0.4, mix: 0.35 })],
    blocks: sectionBlocks([GROOVE, DROP], (start, bar) =>
      bar % 2 === 1 ? SQUELCH_HITS.map(([step, pitch]) => note(pitch, start + step * SIXTEENTH, 0.2, 100)) : [],
    ),
  });
}

// Filtered-noise sweeps into the groove and across the build into the drop.
function riserTrack() {
  const riser = (firstBar, bars) => block(firstBar * BEATS_PER_BAR, [note(RISER_NOTE, 0, bars * BEATS_PER_BAR, 100)], bars * BEATS_PER_BAR);
  return track("Riser", createPresetPatch("Noise Sweep"), {
    volume: 0.6,
    blocks: [riser(INTRO[0] + 2, 2), riser(BUILD[0], 4)],
  });
}

export function createNeonVortexProject() {
  resetDemoIds();
  const project = createProject();
  project.tempo = TEMPO;
  project.timeSignature.beatsPerBar = BEATS_PER_BAR;
  project.tracks = [
    kickTrack(),
    bassTrack(),
    snareTrack(),
    closedHatTrack(),
    openHatTrack(),
    acidTrack(),
    padTrack(),
    gateTrack(),
    zapTrack(),
    squelchTrack(),
    riserTrack(),
  ];
  project.master = {
    volume: 0.42,
    effects: [effect("eq", { low: 1, mid: 0, high: 1 }), effect("compressor", { threshold: -18, ratio: 3 })],
  };
  project.loop = { enabled: true, startBeat: 0, endBeat: SONG_BARS * BEATS_PER_BAR };
  return project;
}
