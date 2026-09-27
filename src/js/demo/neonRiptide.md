# neonRiptide.js

`createNeonRiptideProject()` returns **"Neon Riptide"**, a 64-bar (about 2:17) extended remix of [Neon Tide](./demoSong.md). It's listed second in the header's demo picker ([demos.js](./demos.md)). It keeps Neon Tide's key, tempo (112 BPM), Am–F–C–G progression, lead melody and its five original instruments and effects. On top of those it adds nine tracks: oscillator-built drums, a half-time dubstep drop, bells and a riser. Like the original, it's built in code from presets plus custom `normalizePatch()` patches, using the shared [demoKit.js](./demoKit.md) builders.

**Song map** (bars, 1-based):

| Bars | Section | What plays |
|---|---|---|
| 1–8 | Intro | Pad; Glass Bells from bar 5; a soft Riser swell into bar 9 |
| 9–16 | Build | Arp fades in, offbeat hats; bass + kick join at bar 13 |
| 17–24 | Verse | Lead (then an octave up), Keys stabs, full synthwave groove (snare on 2 and 4) |
| 25–28 | Rise 1 | Snare roll (quarters → 8ths → 16ths → 32nds), Riser, arp crescendo, half-beat gap before the drop |
| 29–36 | Drop 1 | Half-time dubstep: Wobble + Sub, Growl fills, Laser, kick/snare-on-3, open hats |
| 37–44 | Breakdown | Pad, bells, held tremolo Keys; arp from bar 39; soft lead, bass and hats from bar 41 |
| 45–48 | Rise 2 | Same as Rise 1, with a three-note riser |
| 49–56 | Drop 2 | Drop 1 plus the lead an octave up, the arp, and 16th-note wobble chops |
| 57–64 | Outro | Pad, bells, arp, keys fading out (velocity ramps); bass, kick and snare stop after bar 60, hats after bar 62 |

**New sounds, all from the 2-oscillator voice** (the engine has no noise source or pitch envelope):
- **Kick:** a sine plus a square an octave up under a resonant lowpass. A ~70 ms filter-envelope sweep through the square's harmonics stands in for the pitch drop and click.
- **Snare:** a triangle body plus a square an octave and 37 cents up, with a filter-envelope crack and heavy distortion. The two inharmonic partials intermodulate into grit.
- **Hats:** 2 notes × 2 detuned squares through a highpass (the 808's metallic-noise trick). A small sustain makes note length meaningful: 0.25-beat notes are closed hats and 0.75-beat notes are open.
- **Wobble:** saw + square an octave down, resonant lowpass swept by an 8th-note filter LFO, then distortion. Each note restarts the LFO, so the wobble locks to the note rhythm. **Sub** doubles its rhythm on a clean sine.
- **Growl:** a bandpass "vowel" opened by the filter envelope, a 16th-note filter LFO, and heavy distortion. **Laser:** a near-self-oscillating lowpass swept down fast ("pew") into an 8th delay.
- **Glass Bells:** two sines at a ≈3.9 ratio (inharmonic, so bell-like) with no sustain, into a dotted-8th delay. **Riser:** a 4-second amp and filter swell with fast vibrato, into a long feedback delay.

Delay times and LFO rates are derived from the tempo by hand (no tempo sync yet).

**DSP budget:** convolution reverb is by far the costliest effect (≈2% of real time each at 48 kHz, versus ≈0.3–0.7% for the others), and every track's effect chain runs even while the track is silent. So only Pad and Lead have reverbs, the Riser and Bells use feedback delays instead, and the drums have no reverb. Hats use 2 notes per hit, not 3. Measured at 48 kHz, with notes scheduled 0.1 s ahead like live playback, the render took about 0.6× real time in the verse (the densest part) and 0.3–0.4× in the drops. Neon Tide's densest section measured 0.42× the same way.

**Mix:** peaks stay at or below ≈0.86, with no clipping. Section RMS is about −27 dB (intro), −17 dB (verse) and −15 dB (rises/drops), so the drops are the loudest part. Neon Tide's volume quirks still apply here (distortion adds gain; track volume is pre-effects).
