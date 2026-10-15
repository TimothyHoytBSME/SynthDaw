import { createProject } from "../core/project.js";
import { createPresetPatch } from "../audio/presets.js";
import { resetDemoIds, note, block, effect, track } from "./demoKit.js";

// "Neon Tide": a 16-bar A-minor loop (Am–F–C–G) that builds in four 4-bar sections, arranged
// to exercise most of the app — see demoSong.md for the feature-by-feature tour.

const TEMPO = 112;
const BEATS_PER_BAR = 4;
const SECTION_BEATS = 4 * BEATS_PER_BAR;
const SONG_BEATS = 4 * SECTION_BEATS;
const SECONDS_PER_BEAT = 60 / TEMPO;

// One chord per bar. `triad` is the pad voicing; `root` is the bass note (before the bass
// patch's own −1 octave); `arp` is the arpeggio's four tones.
const PROGRESSION = [
  { triad: [57, 60, 64], root: 45, arp: [69, 72, 76, 81] }, // Am
  { triad: [57, 60, 65], root: 41, arp: [65, 69, 72, 77] }, // F
  { triad: [55, 60, 64], root: 48, arp: [67, 72, 76, 79] }, // C
  { triad: [55, 59, 62], root: 43, arp: [67, 71, 74, 79] }, // G
];

// [startBeat, note, lengthBeats, velocity] across one 4-bar phrase.
const LEAD_PHRASE = [
  [0, 64, 1, 100], [1, 67, 0.5, 90], [1.5, 69, 1.5, 112], [3, 67, 0.5, 85], [3.5, 64, 0.5, 90],
  [4, 65, 1, 105], [5, 64, 0.5, 88], [5.5, 60, 1.5, 100], [7, 57, 1, 84],
  [8, 60, 1, 98], [9, 64, 0.5, 90], [9.5, 67, 1, 104], [10.5, 72, 1.5, 118],
  [12, 71, 1, 106], [13, 67, 1, 92], [14, 62, 2, 100],
];

// Builds one 4-bar phrase by calling `perBar(chord, barStartBeat)` for each chord.
function phrase(perBar) {
  return PROGRESSION.flatMap((chord, bar) => perBar(chord, bar * BEATS_PER_BAR));
}

// Blocks for each 4-bar section listed, all built from the same phrase generator (with fresh
// ids per copy, like the Duplicate action would produce).
function sections(sectionIndexes, perBar) {
  return sectionIndexes.map((section) =>
    block(section * SECTION_BEATS, phrase((chord, start) => perBar(chord, start, section)), SECTION_BEATS),
  );
}

// Track volumes in the builders below were balanced by rendering each track solo offline and
// comparing RMS. The bass sits low mostly because the distortion effect adds a lot of gain.
// The pad swells a little as the song fills out: 72 in the intro, 78 with the rhythm, 82 under
// the high lead.
const PAD_VELOCITY_BY_SECTION = [72, 78, 78, 82];

function padTrack() {
  const patch = createPresetPatch("Soft Pad");
  return track("Pad", patch, {
    volume: 0.85,
    effects: [effect("chorus", { mix: 0.4 }), effect("reverb", { size: 3.5, mix: 0.45 })],
    blocks: [0, 1, 2, 3].map((section) =>
      block(
        section * SECTION_BEATS,
        phrase((chord, start) => chord.triad.map((pitch) => note(pitch, start, BEATS_PER_BAR, PAD_VELOCITY_BY_SECTION[section]))),
        SECTION_BEATS,
      ),
    ),
  });
}

function bassTrack() {
  const patch = createPresetPatch("Sub Bass");
  return track("Bass", patch, {
    volume: 0.15,
    effects: [effect("distortion", { drive: 0.25, mix: 0.3 }), effect("eq", { low: 3, mid: -2, high: 0 })],
    // Straight 8ths on the root with an octave jump on the "and" of 3; downbeats accented. The
    // song's last two 8ths walk G, E so the loop lands back on A.
    blocks: sections([1, 2, 3], (chord, start, section) =>
      Array.from({ length: 8 }, (_, step) => {
        const lastBar = section === 3 && start === 3 * BEATS_PER_BAR;
        const turnaround = lastBar && step >= 6 ? chord.root - 3 : null;
        const pitch = turnaround ?? (step === 5 ? chord.root + 12 : chord.root);
        return note(pitch, start + step * 0.5, 0.45, step % 2 === 0 ? 112 : 82);
      }),
    ),
  });
}

// Velocity opens the pluck's filter, so the accented 16ths are brighter as well as louder.
function arpTrack() {
  const patch = createPresetPatch("Pluck");
  patch.filter.velocitySensitivity = 0.5;
  return track("Pluck Arp", patch, {
    volume: 0.8,
    pan: 0.35,
    // Dotted-8th delay, synced to the tempo by hand (no tempo sync exists yet).
    effects: [effect("delay", { time: Number((SECONDS_PER_BEAT * 0.75).toFixed(3)), feedback: 0.35, mix: 0.3 })],
    blocks: sections([1, 2, 3], (chord, start) =>
      Array.from({ length: 16 }, (_, step) => {
        const velocity = step % 4 === 0 ? 108 : step % 2 === 0 ? 80 : 62;
        return note(chord.arp[step % 4], start + step * 0.25, 0.25, velocity);
      }),
    ),
  });
}

function leadTrack() {
  const patch = createPresetPatch("Saw Lead");
  const phraseNotes = () => LEAD_PHRASE.map(([start, pitch, length, velocity]) => note(pitch, start, length, velocity));
  // The final section repeats the melody an octave up — the same result as selecting the
  // first lead block, duplicating it and pressing "▲ Oct" once.
  const octaveUp = phraseNotes().map((leadNote) => ({ ...leadNote, note: leadNote.note + 12, velocity: leadNote.velocity - 12 }));
  return track("Lead", patch, {
    volume: 1,
    pan: -0.1,
    effects: [
      effect("delay", { time: Number((SECONDS_PER_BEAT * 0.5).toFixed(3)), feedback: 0.25, mix: 0.2 }),
      effect("reverb", { size: 2, mix: 0.2 }),
    ],
    blocks: [block(2 * SECTION_BEATS, phraseNotes(), SECTION_BEATS), block(3 * SECTION_BEATS, octaveUp, SECTION_BEATS)],
  });
}

function keysTrack() {
  // Custom sound on top of a preset: a deeper, slower tremolo than "Keys" ships with.
  const patch = createPresetPatch("Keys");
  patch.lfo = { rate: 3, depth: 0.45, target: "amp" };
  return track("Keys", patch, {
    volume: 0.42,
    pan: -0.35,
    // Off-beat stabs on the "and" of 2 and 4, an octave above the pad voicing.
    blocks: sections([2, 3], (chord, start) =>
      [1.5, 3.5].flatMap((offset) => chord.triad.map((pitch) => note(pitch + 12, start + offset, 0.5, 92))),
    ),
  });
}

export function createDemoProject() {
  resetDemoIds();
  const project = createProject();
  project.tempo = TEMPO;
  project.timeSignature.beatsPerBar = BEATS_PER_BAR;
  project.tracks = [padTrack(), bassTrack(), arpTrack(), leadTrack(), keysTrack()];
  project.master = {
    volume: 0.55,
    effects: [effect("eq", { low: 1, mid: 0, high: 2 }), effect("compressor", { threshold: -18, ratio: 3 })],
  };
  project.loop = { enabled: true, startBeat: 0, endBeat: SONG_BEATS };
  return project;
}
