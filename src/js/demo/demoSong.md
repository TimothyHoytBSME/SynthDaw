# demoSong.js

`createDemoProject()` returns a complete project, **"Neon Tide"**, the first entry in the header's **Load Demo…** picker ([demos.js](./demos.md), [projectControls.js](../ui/projectControls.md)). [neonRiptide.js](./neonRiptide.md) is its 64-bar extended remix; this file is kept as the original. It goes through `replaceProjectContents`, so it's undoable, autosaved and exportable. The song is built in code rather than shipped as JSON, so it uses the app's own [presets](../audio/presets.md) and [effect defaults](../audio/effectTypes.md) and stays valid if the patch or effect schema grows. Its note/block/effect/track builders come from [demoKit.js](./demoKit.md). Ids restart at 1 each call; `replaceProjectContents` runs `syncIdCounter` afterwards, so later edits never collide.

**The song:** 112 BPM, 4/4, 16 bars in A minor (Am–F–C–G, one chord per bar), looped over the whole song. It builds in 4-bar sections:

| Bars | Adds | Shows off |
|---|---|---|
| 1–4 | **Pad** (Soft Pad) | Slow attack/release envelopes, filter LFO, chorus → reverb chain |
| 5–8 | **Bass** (Sub Bass), **Pluck Arp** (Pluck) | Oscillator octave −1, distortion + EQ; 16th-note arpeggio with velocity accents (see the velocity lane), a dotted-8th delay, panned right |
| 9–12 | **Lead** (Saw Lead), **Keys** (Keys, customized) | Pitch vibrato, 8th delay + reverb; off-beat stabs with a deeper custom amp-LFO tremolo, panned left |
| 13–16 | Lead an octave higher | The same melody transposed +1 octave, like Duplicate followed by "▲ Oct" |

The master bus has an EQ into a compressor. Delay times are tempo-derived by hand (this file predates tempo sync and is kept as the original).

**Polish pass (2026-10-15):** the pad swells with the arrangement (velocity 72 in the intro, 78 with the rhythm, 82 under the high lead); the Pluck Arp's filter envelope follows velocity (`velocitySensitivity` 0.5), so its accented 16ths are brighter, not just louder; the bass's last two 8ths walk G, E so the loop lands back on A; master 0.5 → 0.55 (+0.8 dB) to sit closer to the later demos. Measured after: full sections −13.7 LUFS momentary max (K-weighted), peaks ≤ 0.57, 98% of spectral-peak energy in A minor.

**Mix notes:** track volumes were set by rendering each track solo offline and comparing RMS. The intro is about −29 dB RMS and the full sections about −19 dB, with a 0.5 peak and no clipping. Two engine quirks shaped the numbers, and both are in the PLAN backlog:
- **Distortion adds a lot of gain** (≈+19 dB on quiet signals, no output compensation), so the bass volume is low.
- **Track volume is pre-effects.** A compressor's automatic makeup gain undoes a volume cut, which is why the bass has no compressor.
