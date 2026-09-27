# demoSong.js

`createDemoProject()` returns a complete project, **"Neon Tide"**, loaded by the header's **Load Demo** button ([projectControls.js](../ui/projectControls.md)). It goes through `replaceProjectContents`, so it's undoable, autosaved and exportable. The song is built in code rather than shipped as JSON, so it uses the app's own [presets](../audio/presets.md) and [effect defaults](../audio/effectTypes.md) and stays valid if the patch or effect schema grows. Ids restart at 1 each call; `replaceProjectContents` runs `syncIdCounter` afterwards, so later edits never collide.

**The song:** 112 BPM, 4/4, 16 bars in A minor (Am–F–C–G, one chord per bar), looped over the whole song. It builds in 4-bar sections:

| Bars | Adds | Shows off |
|---|---|---|
| 1–4 | **Pad** (Soft Pad) | Slow attack/release envelopes, filter LFO, chorus → reverb chain |
| 5–8 | **Bass** (Sub Bass), **Pluck Arp** (Pluck) | Oscillator octave −1, distortion + EQ; 16th-note arpeggio with velocity accents (see the velocity lane), a dotted-8th delay, panned right |
| 9–12 | **Lead** (Saw Lead), **Keys** (Keys, customized) | Pitch vibrato, 8th delay + reverb; off-beat stabs with a deeper custom amp-LFO tremolo, panned left |
| 13–16 | Lead an octave higher | The same melody transposed +1 octave, like Duplicate followed by "▲ Oct" |

The master bus has an EQ into a compressor. Delay times are tempo-derived by hand (there's no tempo sync yet).

**Mix notes:** track volumes were set by rendering each track solo offline and comparing RMS. The intro is about −29 dB RMS and the full sections about −19 dB, with a 0.5 peak and no clipping. Two engine quirks shaped the numbers, and both are in the PLAN backlog:
- **Distortion adds a lot of gain** (≈+19 dB on quiet signals, no output compensation), so the bass volume is low.
- **Track volume is pre-effects.** A compressor's automatic makeup gain undoes a volume cut, which is why the bass has no compressor.
