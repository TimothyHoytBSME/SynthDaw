import { createProject } from "../core/project.js";
import { createPresetPatch } from "../audio/presets.js";
import { normalizePatch } from "../audio/patch.js";
import { resetDemoIds, note, block, effect, track } from "./demoKit.js";

// "Neon Riptide": a 64-bar extended remix of Neon Tide (same key, tempo, chords and lead) that
// adds oscillator-built drums, a half-time dubstep drop and more instruments and effects.
// See neonRiptide.md for the song map and sound-design notes.

const TEMPO = 112;
const BEATS_PER_BAR = 4;
const SONG_BARS = 64;
const SECONDS_PER_BEAT = 60 / TEMPO;
// Free-running fallbacks for the synced LFOs below (the sync division sets the real rate).
const EIGHTH_NOTE_HZ = Number((2 / SECONDS_PER_BEAT).toFixed(3));
const SIXTEENTH_NOTE_HZ = Number((4 / SECONDS_PER_BEAT).toFixed(3));

// [first bar, bar count]
const INTRO = [0, 8];
const BUILD = [8, 8];
const VERSE = [16, 8];
const RISE_1 = [24, 4];
const DROP_1 = [28, 8];
const BREAKDOWN = [36, 8];
const RISE_2 = [44, 4];
const DROP_2 = [48, 8];
const OUTRO = [56, 8];

const PROGRESSION = [
  { triad: [57, 60, 64], root: 45, arp: [69, 72, 76, 81] }, // Am
  { triad: [57, 60, 65], root: 41, arp: [65, 69, 72, 77] }, // F
  { triad: [55, 60, 64], root: 48, arp: [67, 72, 76, 79] }, // C
  { triad: [55, 59, 62], root: 43, arp: [67, 71, 74, 79] }, // G
];

// [startBeat, note, lengthBeats, velocity] across one 4-bar phrase (Neon Tide's lead).
const LEAD_PHRASE = [
  [0, 64, 1, 100], [1, 67, 0.5, 90], [1.5, 69, 1.5, 112], [3, 67, 0.5, 85], [3.5, 64, 0.5, 90],
  [4, 65, 1, 105], [5, 64, 0.5, 88], [5.5, 60, 1.5, 100], [7, 57, 1, 84],
  [8, 60, 1, 98], [9, 64, 0.5, 90], [9.5, 67, 1, 104], [10.5, 72, 1.5, 118],
  [12, 71, 1, 106], [13, 67, 1, 92], [14, 62, 2, 100],
];

const KICK_NOTE = 33;
// G is the one pitch that sits well over all four chords (Am7, Fadd9, C, G), so the pitched
// drum and riser parts are built on G (and D, its fifth).
const SNARE_NOTE = 55;
// Two notes per hat hit, each with a square an octave up: stacked squares are how analog drum
// machines faked noise. Only their upper harmonics get through the filtering.
const HAT_NOTES = [55, 62];
const OPEN_HAT_BEATS = 0.75;

function velocity(value) {
  return Math.max(1, Math.min(127, Math.round(value)));
}

// A linear ramp across a section, for fades and crescendos: bar 0 gets `from`, the last bar `to`.
function ramp(from, to, barIndex, barCount) {
  return from + ((to - from) * barIndex) / Math.max(1, barCount - 1);
}

// One block spanning [firstBar, firstBar + barCount), filled by
// perBar(chord, barStartBeat, barIndex, barCount); barIndex counts from the block's first bar.
function barsBlock([firstBar, barCount], perBar) {
  const notes = [];
  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const chord = PROGRESSION[(firstBar + barIndex) % PROGRESSION.length];
    notes.push(...perBar(chord, barIndex * BEATS_PER_BAR, barIndex, barCount));
  }
  return block(firstBar * BEATS_PER_BAR, notes, barCount * BEATS_PER_BAR);
}

// Notes from [beatInBar, pitch, lengthBeats, velocity] rows, offset to a bar.
function hits(barStart, rows) {
  return rows.map(([beat, pitch, length, vel]) => note(pitch, barStart + beat, length, velocity(vel)));
}

function isLastBar(barIndex, barCount) {
  return barIndex === barCount - 1;
}

// ---- Melodic tracks (Neon Tide's five, rearranged) ----

function padTrack() {
  const chordBar = (vel, lengthBeats = BEATS_PER_BAR) => (chord, start) =>
    chord.triad.map((pitch) => note(pitch, start, lengthBeats, velocity(vel)));
  // Rises end half a beat early: the gap before a drop.
  const riseBar = (chord, start, barIndex, barCount) =>
    chordBar(78, isLastBar(barIndex, barCount) ? 3.5 : BEATS_PER_BAR)(chord, start);
  return track("Pad", createPresetPatch("Soft Pad"), {
    volume: 0.85,
    effects: [effect("chorus", { mix: 0.4 }), effect("reverb", { size: 3.5, mix: 0.45 })],
    blocks: [
      barsBlock(INTRO, chordBar(78)),
      barsBlock(BUILD, chordBar(78)),
      barsBlock(VERSE, chordBar(74)),
      barsBlock(RISE_1, riseBar),
      // Quiet under the drops: the wobble only plays roots, fifths and octaves, so the pad
      // carries the harmony (and the song's vibe) through them.
      barsBlock(DROP_1, chordBar(50)),
      barsBlock(BREAKDOWN, chordBar(80)),
      barsBlock(RISE_2, riseBar),
      barsBlock(DROP_2, chordBar(50)),
      barsBlock(OUTRO, (chord, start, barIndex, barCount) =>
        chordBar(ramp(80, 40, barIndex, barCount))(chord, start)),
    ],
  });
}

function bassTrack() {
  // Straight 8ths on the root with an octave jump on the "and" of 3; downbeats accented.
  const bassBar = (scale) => (chord, start) =>
    Array.from({ length: 8 }, (_, step) => {
      const pitch = step === 5 ? chord.root + 12 : chord.root;
      return note(pitch, start + step * 0.5, 0.45, velocity((step % 2 === 0 ? 112 : 82) * scale));
    });
  return track("Bass", createPresetPatch("Sub Bass"), {
    volume: 0.15,
    effects: [effect("distortion", { drive: 0.25, mix: 0.3 }), effect("eq", { low: 3, mid: -2, high: 0 })],
    blocks: [
      barsBlock([12, 4], bassBar(1)),
      barsBlock(VERSE, bassBar(1)),
      barsBlock([24, 2], bassBar(1)),
      barsBlock([40, 4], bassBar(0.85)),
      barsBlock([56, 4], (chord, start, barIndex) => bassBar(ramp(1, 0.6, barIndex, 4))(chord, start)),
    ],
  });
}

function arpTrack() {
  const arpBar = (scale, steps = 16) => (chord, start) =>
    Array.from({ length: steps }, (_, step) => {
      const vel = step % 4 === 0 ? 108 : step % 2 === 0 ? 80 : 62;
      return note(chord.arp[step % 4], start + step * 0.25, 0.25, velocity(vel * scale));
    });
  // Crescendo through a rise, cut at the pre-drop gap.
  const riseBar = (chord, start, barIndex, barCount) =>
    arpBar(ramp(0.7, 1.15, barIndex, barCount), isLastBar(barIndex, barCount) ? 14 : 16)(chord, start);
  return track("Pluck Arp", createPresetPatch("Pluck"), {
    volume: 0.8,
    pan: 0.35,
    effects: [effect("delay", { sync: "1/8.", feedback: 0.35, mix: 0.3 })],
    blocks: [
      barsBlock(BUILD, (chord, start, barIndex, barCount) => arpBar(ramp(0.6, 1, barIndex, barCount))(chord, start)),
      barsBlock(VERSE, arpBar(1)),
      barsBlock(RISE_1, riseBar),
      barsBlock([38, 6], arpBar(0.75)),
      barsBlock(RISE_2, riseBar),
      barsBlock(DROP_2, arpBar(0.7)),
      barsBlock(OUTRO, (chord, start, barIndex, barCount) => arpBar(ramp(0.9, 0.4, barIndex, barCount))(chord, start)),
    ],
  });
}

function leadTrack() {
  const phraseBlock = (firstBar, transpose, velocityOffset) =>
    block(
      firstBar * BEATS_PER_BAR,
      LEAD_PHRASE.map(([start, pitch, length, vel]) => note(pitch + transpose, start, length, velocity(vel + velocityOffset))),
      4 * BEATS_PER_BAR,
    );
  return track("Lead", createPresetPatch("Saw Lead"), {
    volume: 1,
    pan: -0.1,
    effects: [
      effect("delay", { sync: "1/8", feedback: 0.25, mix: 0.2 }),
      effect("reverb", { size: 2, mix: 0.2 }),
    ],
    blocks: [
      phraseBlock(16, 0, 0),
      phraseBlock(20, 12, -12),
      phraseBlock(40, 0, -30),
      phraseBlock(48, 12, -10),
      phraseBlock(52, 12, -4),
    ],
  });
}

function keysTrack() {
  // A deeper, slower tremolo than the "Keys" preset ships with.
  const patch = createPresetPatch("Keys");
  patch.lfo = { rate: 3, depth: 0.45, target: "amp" };
  // Off-beat stabs on the "and" of 2 and 4, an octave above the pad voicing.
  const stabBar = (vel) => (chord, start) =>
    [1.5, 3.5].flatMap((offset) => chord.triad.map((pitch) => note(pitch + 12, start + offset, 0.5, velocity(vel))));
  // Breakdown: one held chord per bar instead of stabs, so the tremolo is heard.
  const heldBar = (chord, start) => chord.triad.map((pitch) => note(pitch + 12, start, 3, 84));
  return track("Keys", patch, {
    volume: 0.42,
    pan: -0.35,
    blocks: [
      barsBlock(VERSE, stabBar(92)),
      barsBlock(BREAKDOWN, heldBar),
      barsBlock(OUTRO, (chord, start, barIndex, barCount) => stabBar(ramp(90, 45, barIndex, barCount))(chord, start)),
    ],
  });
}

// ---- New melodic/FX tracks ----

function bellsTrack() {
  // A sine plus a quieter one two octaves up for a glassy, celesta-like tone; no sustain, so
  // each strike rings out on its own decay.
  const patch = normalizePatch({
    oscillators: [
      { type: "sine", octave: 0, detune: 0, mix: 0.75 },
      { type: "sine", octave: 2, detune: 0, mix: 0.25 },
    ],
    filter: { type: "lowpass", cutoff: 7000, resonance: 0.5, envAmount: 0 },
    ampEnvelope: { attack: 0.002, decay: 1.8, sustain: 0, release: 1.2 },
    gain: 0.55,
  });
  const bellBar = (scale) => (chord, start, barIndex) =>
    hits(start, [
      [0, chord.arp[3], 2, 84 * scale],
      [1.5, chord.arp[2], 1.5, 64 * scale],
      [3, chord.arp[barIndex % 2 === 0 ? 1 : 3] + (barIndex % 2 === 0 ? 0 : 2), 1, 72 * scale],
    ]);
  return track("Glass Bells", patch, {
    volume: 0.78,
    pan: 0.25,
    effects: [effect("delay", { sync: "1/8.", feedback: 0.55, mix: 0.4 })],
    blocks: [
      barsBlock([4, 4], bellBar(1)),
      barsBlock(BREAKDOWN, bellBar(1)),
      barsBlock(OUTRO, (chord, start, barIndex, barCount) => bellBar(ramp(1, 0.5, barIndex, barCount))(chord, start, barIndex)),
    ],
  });
}

function riserTrack() {
  // Slow amp + filter swell under a resonant lowpass, with a light vibrato. It holds G (and D),
  // which sit well over every chord it passes. A long feedback delay stands in for reverb
  // (convolution reverb is the costliest effect by far).
  const patch = normalizePatch({
    oscillators: [
      { type: "sawtooth", octave: 0, detune: -6, mix: 0.5 },
      { type: "sawtooth", octave: 1, detune: 6, mix: 0.35 },
    ],
    filter: { type: "lowpass", cutoff: 200, resonance: 6, envAmount: 6000 },
    ampEnvelope: { attack: 4, decay: 0.1, sustain: 1, release: 0.3 },
    filterEnvelope: { attack: 4, decay: 0.1, sustain: 1, release: 0.3 },
    lfo: { rate: 6, depth: 0.1, target: "pitch" },
    gain: 0.5,
  });
  const swell = ([firstBar, barCount], pitches, vel) =>
    block(firstBar * BEATS_PER_BAR, pitches.map((pitch) => note(pitch, 0, barCount * BEATS_PER_BAR - 0.5, vel)), barCount * BEATS_PER_BAR);
  return track("Riser", patch, {
    volume: 1,
    effects: [effect("delay", { sync: "1/8.", feedback: 0.6, mix: 0.4 })],
    blocks: [swell([6, 2], [55, 67], 60), swell(RISE_1, [55, 67], 100), swell(RISE_2, [55, 62, 67], 110)],
  });
}

// ---- Drums, built from oscillators ----

function kickTrack() {
  // A sine body plus a square an octave up whose harmonics a resonant lowpass sweeps down
  // through in ~50 ms: the sweep reads as the kick's pitch drop and click. The filter settles
  // on 110 Hz (the body's octave) so its ring stays in tune, and the body is kept short so it
  // doesn't hold an A under the F and G chords.
  const patch = normalizePatch({
    oscillators: [
      { type: "sine", octave: 0, detune: 0, mix: 0.9 },
      { type: "square", octave: 1, detune: 0, mix: 0.35 },
    ],
    filter: { type: "lowpass", cutoff: 110, resonance: 3, envAmount: 1500 },
    ampEnvelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.04 },
    filterEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 },
    gain: 0.95,
  });
  const kicks = (beats, vel = 118) => (chord, start) => hits(start, beats.map((beat) => [beat, KICK_NOTE, 0.5, vel]));
  const verseBar = (chord, start, barIndex, barCount) =>
    kicks(isLastBar(barIndex, barCount) ? [0, 2, 3, 3.5] : barIndex % 2 === 0 ? [0, 2, 2.5] : [0, 2])(chord, start);
  const riseBar = (chord, start, barIndex) =>
    kicks([[0, 1, 2, 3], [0, 1, 2, 3], [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], [0, 0.5, 1, 1.5, 2, 2.5, 3]][barIndex])(chord, start);
  // Half-time: the snare lands on beat 3, so the kicks dodge around it.
  const dropKickBar = (chord, start, barIndex, barCount) => {
    if (isLastBar(barIndex, barCount)) {
      return kicks([0, 0.75, 1.5])(chord, start);
    }
    return kicks(barIndex % 2 === 0 ? [0, 1.5] : [0, 0.75, 3.5], 122)(chord, start);
  };
  return track("Kick", patch, {
    volume: 0.55,
    blocks: [
      barsBlock([12, 4], (chord, start, barIndex) => kicks(barIndex === 3 ? [0, 2, 3.5] : [0, 2], 108)(chord, start)),
      barsBlock(VERSE, verseBar),
      barsBlock(RISE_1, riseBar),
      barsBlock(DROP_1, dropKickBar),
      barsBlock(RISE_2, riseBar),
      barsBlock(DROP_2, dropKickBar),
      barsBlock([56, 4], (chord, start, barIndex) => kicks([0, 2], ramp(110, 80, barIndex, 4))(chord, start)),
    ],
  });
}

function snareTrack() {
  // Triangle body plus a square two octaves up, both on G; the filter envelope makes the crack
  // and distortion adds grit. Keeping both partials in tune keeps the grit in tune too.
  const patch = normalizePatch({
    oscillators: [
      { type: "triangle", octave: 0, detune: 0, mix: 0.7 },
      { type: "square", octave: 2, detune: 0, mix: 0.3 },
    ],
    filter: { type: "lowpass", cutoff: 900, resonance: 1, envAmount: 6000 },
    ampEnvelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.06 },
    filterEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.06 },
    gain: 0.6,
  });
  const snares = (rows) => (chord, start) =>
    hits(start, rows.map(([beat, vel]) => [beat, SNARE_NOTE, 0.25, vel]));
  const verseBar = (chord, start, barIndex, barCount) =>
    snares(isLastBar(barIndex, barCount)
      ? [[1, 110], [3, 100], [3.25, 80], [3.5, 95], [3.75, 110]]
      : [[1, 110], [3, 110]])(chord, start);
  // Quarters, 8ths, 16ths, then 32nds, getting louder, with a half-beat gap before the drop.
  const rollBar = (chord, start, barIndex, barCount) => {
    const step = [1, 0.5, 0.25, 0.25][barIndex];
    const rows = [];
    for (let beat = 0; beat < BEATS_PER_BAR; beat += step) {
      if (isLastBar(barIndex, barCount) && beat >= 2) {
        for (let fast = beat; fast < 3.5; fast += 0.125) {
          rows.push([fast, 118]);
        }
        break;
      }
      rows.push([beat, 60 + ((barIndex * BEATS_PER_BAR + beat) / 16) * 60]);
    }
    return snares(rows)(chord, start);
  };
  const dropBar = (chord, start, barIndex, barCount) => {
    if (isLastBar(barIndex, barCount)) {
      return snares([[2, 122], [3, 100], [3.25, 90], [3.5, 105], [3.75, 120]])(chord, start);
    }
    return snares(barIndex % 2 === 0 ? [[2, 122]] : [[2, 122], [3.75, 60]])(chord, start);
  };
  return track("Snare", patch, {
    volume: 1.1,
    pan: 0.05,
    effects: [
      effect("distortion", { drive: 0.5, mix: 0.35 }),
      effect("eq", { low: -6, mid: 2, high: 3 }),
    ],
    blocks: [
      barsBlock(VERSE, verseBar),
      barsBlock(RISE_1, rollBar),
      barsBlock(DROP_1, dropBar),
      barsBlock(RISE_2, rollBar),
      barsBlock(DROP_2, dropBar),
      barsBlock([56, 4], (chord, start, barIndex) =>
        snares([[1, ramp(105, 70, barIndex, 4)], [3, ramp(105, 70, barIndex, 4)]])(chord, start)),
    ],
  });
}

function hatsTrack() {
  // Four squares per hit (2 notes × 2 oscillators) through a highpass plus an EQ cut, so what's
  // left is metallic sizzle above ~6 kHz rather than audible pitches.
  // A little sustain means note length matters: short notes are closed hats, long ones open.
  const patch = normalizePatch({
    oscillators: [
      { type: "square", octave: 2, detune: 0, mix: 0.5 },
      { type: "square", octave: 3, detune: 0, mix: 0.5 },
    ],
    filter: { type: "highpass", cutoff: 6500, resonance: 0.7, envAmount: 2000 },
    ampEnvelope: { attack: 0.001, decay: 0.04, sustain: 0.15, release: 0.05 },
    filterEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    gain: 1,
  });
  // rows: [beat, velocity, open?]
  const hatHits = (rows) => (chord, start) =>
    rows.flatMap(([beat, vel, open]) =>
      hits(start, HAT_NOTES.map((pitch) => [beat, pitch, open ? OPEN_HAT_BEATS : 0.25, vel])));
  const offbeats = (vel) => [0.5, 1.5, 2.5, 3.5].map((beat) => [beat, vel]);
  const eighths = (accent, soft) => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((beat) => [beat, beat % 1 ? accent : soft]);
  const sixteenths = () => Array.from({ length: 16 }, (_, step) => [step * 0.25, [90, 45, 70, 45][step % 4]]);
  const verseBar = (chord, start, barIndex) => {
    const rows = eighths(85, 60);
    rows.push([1.75, 40], [3.75, 45]);
    if (barIndex % 2 === 1) {
      rows.splice(rows.findIndex(([beat]) => beat === 3.5), 1, [3.5, 85, true]);
    }
    return hatHits(rows)(chord, start);
  };
  const riseBar = (chord, start, barIndex, barCount) => {
    const rows = barIndex < 2 ? eighths(80, 55) : sixteenths();
    return hatHits(isLastBar(barIndex, barCount) ? rows.filter(([beat]) => beat < 3.5) : rows)(chord, start);
  };
  const dropBar = (chord, start, barIndex) => {
    const rows = eighths(85, 60).filter(([beat]) => beat !== 1.5 && beat !== 3.5);
    rows.push([1.5, 90, true], [3.5, 80, true]);
    if (barIndex % 2 === 1) {
      rows.push([2.75, 50], [3.25, 50]);
    }
    return hatHits(rows)(chord, start);
  };
  return track("Hats", patch, {
    volume: 0.85,
    pan: -0.2,
    effects: [effect("eq", { low: -15, mid: -12, high: 2 })],
    blocks: [
      barsBlock([8, 4], hatHits(offbeats(70))),
      barsBlock([12, 4], hatHits(eighths(80, 50))),
      barsBlock(VERSE, verseBar),
      barsBlock(RISE_1, riseBar),
      barsBlock(DROP_1, dropBar),
      barsBlock([40, 4], hatHits(offbeats(50))),
      barsBlock(RISE_2, riseBar),
      barsBlock(DROP_2, dropBar),
      barsBlock([56, 6], (chord, start, barIndex) => hatHits(offbeats(ramp(75, 35, barIndex, 6)))(chord, start)),
    ],
  });
}

// ---- The drop: wobble, sub, growl and laser ----

// Wobble rhythms as [beatInBar, lengthBeats, semitonesAboveRoot]. Each note restarts the
// patch's LFO, so the wobble stays locked to the notes.
const WOBBLE_BAR_A = [[0, 1.5, 0], [2, 1, 0], [3, 0.5, 12], [3.5, 0.5, 7]];
const WOBBLE_BAR_B = [[0, 0.75, 0], [0.75, 0.75, 0], [1.5, 0.5, 12], [2, 2, 0]];
const WOBBLE_BAR_CHOP = [[0, 0.25, 0], [0.25, 0.25, 0], [0.5, 0.5, 12], [1, 0.25, 0], [1.25, 0.25, 0], [1.5, 0.5, 7], [2, 2, 0]];
const WOBBLE_BAR_LAST = [[0, 1, 0], [1, 0.5, 12], [1.5, 0.5, 0], [2, 0.5, 0]];

function wobbleRows(barIndex, barCount, withChops) {
  if (isLastBar(barIndex, barCount)) {
    return WOBBLE_BAR_LAST;
  }
  if (withChops && barIndex % 4 === 2) {
    return WOBBLE_BAR_CHOP;
  }
  return barIndex % 2 === 0 ? WOBBLE_BAR_A : WOBBLE_BAR_B;
}

function wobbleTrack() {
  // Two detuned oscillators through a resonant lowpass swept by an 8th-note LFO: "wub". It sits
  // an octave above the Sub: sweeping the lower harmonics of a mid-bass note keeps it musical,
  // whereas on a very low note the resonance picks out the flat 7th/11th/13th harmonics.
  const patch = normalizePatch({
    oscillators: [
      { type: "sawtooth", octave: 0, detune: -5, mix: 0.6 },
      { type: "square", octave: 0, detune: 5, mix: 0.45 },
    ],
    filter: { type: "lowpass", cutoff: 400, resonance: 4, envAmount: 0 },
    ampEnvelope: { attack: 0.005, decay: 0.1, sustain: 1, release: 0.08 },
    lfo: { rate: EIGHTH_NOTE_HZ, depth: 0.4, target: "filter", sync: "1/8" },
    gain: 0.7,
  });
  const wobbleBar = (withChops) => (chord, start, barIndex, barCount) =>
    hits(start, wobbleRows(barIndex, barCount, withChops).map(([beat, length, interval]) => [beat, chord.root + interval, length, 115]));
  return track("Wobble", patch, {
    volume: 0.56,
    effects: [
      effect("distortion", { drive: 0.45, mix: 0.5 }),
      effect("eq", { low: -4, mid: 3, high: 1 }),
    ],
    blocks: [barsBlock(DROP_1, wobbleBar(false)), barsBlock(DROP_2, wobbleBar(true))],
  });
}

function subTrack() {
  // A clean sine under the wobble, on the root with the same rhythm, so the low end stays
  // solid while the wobble's filter opens and closes.
  const patch = normalizePatch({
    oscillators: [
      { type: "sine", octave: -1, detune: 0, mix: 1 },
      { type: "triangle", octave: 0, detune: 0, mix: 0.1 },
    ],
    filter: { type: "lowpass", cutoff: 300, resonance: 0.7, envAmount: 0 },
    ampEnvelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.1 },
    gain: 0.8,
  });
  const subBar = (withChops) => (chord, start, barIndex, barCount) =>
    hits(start, wobbleRows(barIndex, barCount, withChops).map(([beat, length]) => [beat, chord.root, length, 110]));
  return track("Sub", patch, {
    volume: 0.55,
    blocks: [barsBlock(DROP_1, subBar(false)), barsBlock(DROP_2, subBar(true))],
  });
}

function growlTrack() {
  // Bandpass "vowel" (filter envelope sweeps it open) wobbling at 16ths, then crushed.
  const patch = normalizePatch({
    oscillators: [
      { type: "sawtooth", octave: 0, detune: -6, mix: 0.5 },
      { type: "square", octave: 0, detune: 6, mix: 0.5 },
    ],
    filter: { type: "bandpass", cutoff: 700, resonance: 2.5, envAmount: 1500 },
    ampEnvelope: { attack: 0.003, decay: 0.1, sustain: 0.9, release: 0.06 },
    filterEnvelope: { attack: 0.12, decay: 0.2, sustain: 0.3, release: 0.1 },
    lfo: { rate: SIXTEENTH_NOTE_HZ, depth: 0.25, target: "filter", sync: "1/16" },
    gain: 0.8,
  });
  // Fills the gaps the wobble leaves, plus a descending run into the next section.
  const growlBar = (chord, start, barIndex, barCount) => {
    if (isLastBar(barIndex, barCount)) {
      // The last bar is always the G chord, so this run (G F D C G) stays in the key.
      return hits(start, [
        [2.5, chord.root + 12, 0.25, 110],
        [2.75, chord.root + 10, 0.25, 105],
        [3, chord.root + 7, 0.25, 110],
        [3.25, chord.root + 5, 0.25, 105],
        [3.5, chord.root, 0.5, 118],
      ]);
    }
    return barIndex % 2 === 0 ? hits(start, [[1.5, chord.root + 12, 0.5, 112]]) : [];
  };
  return track("Growl", patch, {
    volume: 0.7,
    pan: -0.15,
    effects: [effect("distortion", { drive: 0.6, mix: 0.6 })],
    blocks: [barsBlock(DROP_1, growlBar), barsBlock(DROP_2, growlBar)],
  });
}

function laserTrack() {
  // A near-self-oscillating lowpass swept down fast: the classic "pew". It only plays over the
  // G chord, so the sweep comes to rest on G2 (98 Hz).
  const patch = normalizePatch({
    oscillators: [
      { type: "square", octave: 0, detune: 0, mix: 0.6 },
      { type: "sawtooth", octave: 0, detune: 0, mix: 0.3 },
    ],
    filter: { type: "lowpass", cutoff: 98, resonance: 16, envAmount: 7000 },
    ampEnvelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
    filterEnvelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 },
    gain: 0.45,
  });
  const laserBar = (chord, start, barIndex) =>
    barIndex % 4 === 3 ? hits(start, [[3, chord.arp[3], 0.5, 110], [3.5, chord.arp[1], 0.5, 100]]) : [];
  return track("Laser", patch, {
    volume: 0.72,
    pan: 0.4,
    effects: [effect("delay", { sync: "1/8", feedback: 0.4, mix: 0.35 })],
    blocks: [barsBlock(DROP_1, laserBar), barsBlock(DROP_2, laserBar)],
  });
}

export function createNeonRiptideProject() {
  resetDemoIds();
  const project = createProject();
  project.tempo = TEMPO;
  project.timeSignature.beatsPerBar = BEATS_PER_BAR;
  project.tracks = [
    padTrack(),
    bellsTrack(),
    bassTrack(),
    arpTrack(),
    leadTrack(),
    keysTrack(),
    riserTrack(),
    kickTrack(),
    snareTrack(),
    hatsTrack(),
    wobbleTrack(),
    subTrack(),
    growlTrack(),
    laserTrack(),
  ];
  // Neon Tide's master chain: gentle enough that the drums don't pump the pad and lead.
  project.master = {
    volume: 0.42,
    effects: [effect("eq", { low: 1, mid: 0, high: 2 }), effect("compressor", { threshold: -18, ratio: 3 })],
  };
  project.loop = { enabled: true, startBeat: 0, endBeat: SONG_BARS * BEATS_PER_BAR };
  return project;
}
