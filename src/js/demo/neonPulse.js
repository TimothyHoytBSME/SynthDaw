import { createProject } from "../core/project.js";
import { createPresetPatch } from "../audio/presets.js";
import { resetDemoIds, note, block, effect, track } from "./demoKit.js";

// "Neon Pulse": a 16-bar house loop in A minor (Am–G–F–Em) that shows off the drum presets
// (noise oscillator + pitch envelope) and tempo sync (synced delays, a 1/16 LFO trance gate).
// See neonPulse.md for the song map.

const TEMPO = 124;
const BEATS_PER_BAR = 4;
const SONG_BARS = 16;

// One chord per bar, repeating every 4 bars. `kick` follows the root so the kick's sub never
// fights the bass; `triad` is the pad voicing; `root` is the bass note (the Sub Bass preset
// plays it an octave down); `arp` is the arpeggio's four tones.
const PROGRESSION = [
  { kick: 33, triad: [57, 60, 64], root: 45, arp: [69, 72, 76, 81] }, // Am
  { kick: 31, triad: [55, 59, 62], root: 43, arp: [67, 71, 74, 79] }, // G
  { kick: 29, triad: [53, 57, 60], root: 41, arp: [65, 69, 72, 77] }, // F
  { kick: 28, triad: [52, 55, 59], root: 40, arp: [64, 67, 71, 76] }, // Em
];

// The snare body and hats sit on A, which is a chord tone or a mild extension over all four chords.
const SNARE_NOTE = 57;
const HAT_NOTE = 69;
const ZAP_NOTE = 57;
const RISER_NOTE = 57;
// Tom fill on the last two beats of bar 8, down the Em chord.
const TOM_FILL = [47, 43, 40, 35];

// [first bar, bar count]
const INTRO = [0, 4];
const GROOVE = [4, 4];
const LIFT = [8, 4];
const BREAK = [12, 2];
const FINALE = [14, 2];

function barsOf([first, count]) {
  return Array.from({ length: count }, (_, index) => first + index);
}

function chordAt(bar) {
  return PROGRESSION[bar % PROGRESSION.length];
}

// The last bar of each 4-bar phrase gets the fills and pickups.
function isPhraseEnd(bar) {
  return bar % 4 === 3;
}

// One block per section, each note list built bar by bar with `perBar(chord, barStartBeat, bar)`.
// `barStartBeat` is relative to the block, since note times are.
function sectionBlocks(sections, perBar) {
  return sections.map((section) => {
    const bars = barsOf(section);
    const notes = bars.flatMap((bar) => perBar(chordAt(bar), (bar - bars[0]) * BEATS_PER_BAR, bar));
    return block(bars[0] * BEATS_PER_BAR, notes, bars.length * BEATS_PER_BAR);
  });
}

// Track volumes below were balanced by rendering each track solo offline (see neonPulse.md).
function kickTrack() {
  return track("Kick", createPresetPatch("Kick"), {
    volume: 0.64,
    blocks: sectionBlocks([INTRO, GROOVE, LIFT, FINALE], (chord, start, bar) => {
      if (bar < INTRO[0] + 2) {
        return []; // the pad and hats open the song; the kick arrives in bar 3
      }
      const beats = isPhraseEnd(bar) ? [0, 1, 2, 3, 3.5] : [0, 1, 2, 3];
      return beats.map((beat) => note(chord.kick, start + beat, 0.5, beat === 0 ? 120 : beat === 3.5 ? 96 : 108));
    }),
  });
}

function snareTrack() {
  const patch = createPresetPatch("Snare");
  patch.gain = 1;
  return track("Snare", patch, {
    volume: 1,
    pan: 0.05,
    effects: [effect("reverb", { size: 1.2, mix: 0.18 })],
    blocks: [
      ...sectionBlocks([GROOVE, LIFT, FINALE], (chord, start, bar) => {
        const rows = [[1, 110], [3, 110]];
        if (bar % 2 === 1) {
          rows.push([3.75, 62]); // ghost on the "a" of 4
        }
        if (isPhraseEnd(bar)) {
          rows.push([3.25, 70], [3.5, 84]); // pickup into the next phrase
        }
        return rows.map(([beat, velocity]) => note(SNARE_NOTE, start + beat, 0.25, velocity));
      }),
      // A rising 16th roll through the Break's last two beats, into the Finale.
      block(
        (BREAK[0] + BREAK[1]) * BEATS_PER_BAR - 2,
        Array.from({ length: 8 }, (_, step) => note(SNARE_NOTE, step * 0.25, 0.2, 64 + step * 8)),
        2,
      ),
    ],
  });
}

// 16ths with accents on the off-beat 8ths. From the Lift on, the open hat takes the "and"s.
function closedHatTrack() {
  const patch = createPresetPatch("Closed Hat");
  patch.gain = 0.7;
  return track("Closed Hat", patch, {
    volume: 1,
    pan: 0.25,
    blocks: sectionBlocks([INTRO, GROOVE, LIFT, BREAK, FINALE], (chord, start, bar) => {
      const openHatsPlaying = bar >= LIFT[0] && bar < BREAK[0] || bar >= FINALE[0];
      return Array.from({ length: 16 }, (_, step) => step)
        .filter((step) => !(openHatsPlaying && step % 4 === 2))
        .map((step) => {
          // Accents on the "and"s, a lighter one on the "a" of 2 every other bar, and a swell
          // through the last beat of each phrase.
          let velocity = step % 4 === 2 ? 100 : step % 2 === 0 ? 70 : 55;
          if (bar % 2 === 1 && step === 7) {
            velocity = 84;
          }
          if (isPhraseEnd(bar) && step >= 12) {
            velocity = 60 + (step - 12) * 14;
          }
          return note(HAT_NOTE, start + step * 0.25, 0.125, velocity);
        });
    }),
  });
}

function openHatTrack() {
  return track("Open Hat", createPresetPatch("Open Hat"), {
    volume: 0.65,
    pan: -0.2,
    blocks: sectionBlocks([LIFT, FINALE], (chord, start, bar) => {
      const beats = isPhraseEnd(bar) ? [0.5, 1.5, 2.5, 3.5, 3.75] : [0.5, 1.5, 2.5, 3.5];
      return beats.map((beat) => note(HAT_NOTE, start + beat, 0.25, beat === 3.75 ? 80 : 96));
    }),
  });
}

// Fills on the last two beats of bar 8 (into the Lift) and bar 16 (into the loop's return).
function tomTrack() {
  const fill = (lastBar) =>
    block(
      lastBar * BEATS_PER_BAR + 2,
      TOM_FILL.map((pitch, index) => note(pitch, index * 0.5, 0.45, 100 + index * 6)),
      2,
    );
  return track("Toms", createPresetPatch("Tom"), {
    volume: 0.5,
    pan: -0.15,
    blocks: [fill(GROOVE[0] + GROOVE[1] - 1), fill(FINALE[0] + FINALE[1] - 1)],
  });
}

// A long, darker open-hat burst on each full section's first downbeat: the crash.
function crashTrack() {
  const patch = createPresetPatch("Open Hat");
  patch.filter.cutoff = 4000;
  patch.ampEnvelope = { attack: 0.001, decay: 0.9, sustain: 0, release: 0.5 };
  patch.gain = 0.5;
  return track("Crash", patch, {
    volume: 0.7,
    pan: 0.1,
    effects: [effect("reverb", { size: 2, mix: 0.3 })],
    blocks: [GROOVE, LIFT, FINALE].map(([firstBar]) => block(firstBar * BEATS_PER_BAR, [note(HAT_NOTE, 0, 1, 110)], 1)),
  });
}

// Classic house bass: off-beat 8ths, so it never lands on the kick. Accents open the filter a
// little (velocity sensitivity), and each phrase ends with an octave jump.
function bassTrack() {
  const patch = createPresetPatch("Sub Bass");
  patch.filter.velocitySensitivity = 0.5;
  return track("Bass", patch, {
    volume: 0.56,
    effects: [effect("eq", { low: 0, mid: 2, high: 0 })],
    blocks: sectionBlocks([GROOVE, LIFT, FINALE], (chord, start, bar) =>
      [0.5, 1.5, 2.5, 3.5].map((beat) => {
        const pitch = isPhraseEnd(bar) && beat === 3.5 ? chord.root + 12 : chord.root;
        return note(pitch, start + beat, 0.4, beat === 2.5 ? 112 : beat === 3.5 && isPhraseEnd(bar) ? 104 : 96);
      }),
    ),
  });
}

// Velocity opens the pluck's filter, so the accents are brighter as well as louder.
function arpTrack() {
  const patch = createPresetPatch("Pluck");
  patch.filter.velocitySensitivity = 0.6;
  return track("Pluck Arp", patch, {
    volume: 0.85,
    pan: 0.35,
    effects: [effect("delay", { sync: "1/8.", feedback: 0.35, mix: 0.3 })],
    blocks: sectionBlocks([GROOVE, LIFT, BREAK, FINALE], (chord, start) =>
      Array.from({ length: 16 }, (_, step) =>
        note(chord.arp[step % 4], start + step * 0.25, 0.25, step % 4 === 0 ? 104 : step % 2 === 0 ? 80 : 62),
      ),
    ),
  });
}

// The intro pad breathes with a slow filter LFO synced to 2 bars.
function padTrack() {
  const patch = createPresetPatch("Soft Pad");
  patch.lfo = { rate: 0.3, depth: 0.3, target: "filter", sync: "2/1" };
  return track("Pad", patch, {
    volume: 0.6,
    effects: [effect("reverb", { size: 3, mix: 0.4 })],
    blocks: sectionBlocks([INTRO, BREAK], (chord, start) =>
      chord.triad.map((pitch) => note(pitch, start, BEATS_PER_BAR, 76)),
    ),
  });
}

// Trance gate: a full-depth amp LFO synced to 1/16 chops sustained chords into 16th pulses.
function gatePadTrack() {
  const patch = createPresetPatch("Soft Pad");
  patch.ampEnvelope = { attack: 0.02, decay: 0.3, sustain: 0.9, release: 0.3 };
  patch.filter.cutoff = 1800;
  patch.lfo = { rate: 8, depth: 1, target: "amp", sync: "1/16" };
  return track("Gate Pad", patch, {
    volume: 0.9,
    pan: -0.3,
    effects: [effect("delay", { sync: "1/8", feedback: 0.25, mix: 0.2 })],
    blocks: sectionBlocks([LIFT, FINALE], (chord, start) =>
      chord.triad.map((pitch) => note(pitch + 12, start, BEATS_PER_BAR, 84)),
    ),
  });
}

// Its resonant filter settles on E6 (a chord tone of Am) rather than the preset's 1.2 kHz.
function zapTrack() {
  const patch = createPresetPatch("Zap");
  patch.filter.cutoff = 1318.5;
  patch.gain = 0.8;
  return track("Zap", patch, {
    volume: 1,
    pan: 0.15,
    effects: [effect("delay", { sync: "1/4", feedback: 0.3, mix: 0.25 })],
    blocks: sectionBlocks([LIFT, FINALE], (chord, start, bar) =>
      bar % 2 === 0 ? [note(ZAP_NOTE, start, 0.5, 110)] : [],
    ),
  });
}

// Filtered-noise sweeps into the Groove and back out of the Break.
function riserTrack() {
  const riser = (firstBar) => block(firstBar * BEATS_PER_BAR, [note(RISER_NOTE, 0, 8, 100)], 8);
  return track("Riser", createPresetPatch("Noise Sweep"), {
    volume: 0.65,
    blocks: [riser(INTRO[0] + 2), riser(BREAK[0])],
  });
}

export function createNeonPulseProject() {
  resetDemoIds();
  const project = createProject();
  project.tempo = TEMPO;
  project.timeSignature.beatsPerBar = BEATS_PER_BAR;
  project.tracks = [
    kickTrack(),
    snareTrack(),
    closedHatTrack(),
    openHatTrack(),
    tomTrack(),
    crashTrack(),
    bassTrack(),
    arpTrack(),
    padTrack(),
    gatePadTrack(),
    zapTrack(),
    riserTrack(),
  ];
  project.master = {
    // Matches Neon Riptide's loudness (momentary K-weighted max, verse vs. Lift).
    volume: 0.42,
    effects: [effect("eq", { low: 1, mid: 0, high: 1 }), effect("compressor", { threshold: -18, ratio: 3 })],
  };
  project.loop = { enabled: true, startBeat: 0, endBeat: SONG_BARS * BEATS_PER_BAR };
  return project;
}
