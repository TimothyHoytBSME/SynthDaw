# neonRiptide.js

`createNeonRiptideProject()` returns **"Neon Riptide"**, a 64-bar (about 2:17) extended remix of [Neon Tide](./demoSong.md). It's listed second in the header's demo picker ([demos.js](./demos.md)). It keeps Neon Tide's key, tempo (112 BPM), Am–F–C–G progression, lead melody, master chain, and its five original instruments and effects. On top of those it adds nine tracks: oscillator-built drums, a half-time dubstep drop, bells and a riser. Like the original, it's built in code from presets plus custom `normalizePatch()` patches, using the shared [demoKit.js](./demoKit.md) builders.

**Song map** (bars, 1-based):

| Bars | Section | What plays |
|---|---|---|
| 1–8 | Intro | Pad; Glass Bells from bar 5; a soft Riser swell into bar 9 |
| 9–16 | Build | Arp fades in, offbeat hats; bass + kick join at bar 13 |
| 17–24 | Verse | Lead (then an octave up), Keys stabs, full synthwave groove (snare on 2 and 4) |
| 25–28 | Rise 1 | Snare roll (quarters → 8ths → 16ths → 32nds), Riser, arp crescendo, half-beat gap before the drop |
| 29–36 | Drop 1 | Half-time dubstep: Wobble + Sub, Growl fills, Laser, kick/snare-on-3, open hats, a quiet pad underneath |
| 37–44 | Breakdown | Pad, bells, held tremolo Keys; arp from bar 39; soft lead, bass and hats from bar 41 |
| 45–48 | Rise 2 | Same as Rise 1, with a three-note riser |
| 49–56 | Drop 2 | Drop 1 plus the lead an octave up, the arp, and 16th-note wobble chops |
| 57–64 | Outro | Pad, bells, arp, keys fading out (velocity ramps); bass, kick and snare stop after bar 60, hats after bar 62 |

**New sounds, all from the 2-oscillator voice** (the engine has no noise source or pitch envelope):
- **Kick:** a short A1 sine plus a square an octave up under a resonant lowpass. A ~50 ms filter-envelope sweep through the square's harmonics stands in for the pitch drop and click.
- **Snare:** a G3 triangle body plus a square two octaves up, with a filter-envelope crack and moderate distortion.
- **Hats:** 2 notes (G, D) × 2 squares, through a 6.5 kHz highpass and an EQ cut, the 808's stacked-square trick. A small sustain makes note length meaningful: 0.25-beat notes are closed hats and 0.75-beat notes are open.
- **Wobble:** saw + square in the mid-bass (an octave above the Sub), resonant lowpass swept by an 8th-note filter LFO, then distortion. Each note restarts the LFO, so the wobble locks to the note rhythm. **Sub** doubles its rhythm on a clean sine.
- **Growl:** a bandpass "vowel" opened by the filter envelope, a 16th-note filter LFO, and distortion. **Laser:** a near-self-oscillating lowpass swept down fast ("pew") that comes to rest on G2, into an 8th delay.
- **Glass Bells:** a sine plus a quieter sine two octaves up (celesta-like), no sustain, into a dotted-8th delay. **Riser:** a 4-second amp and filter swell with light vibrato, into a long feedback delay.

Delay times and LFO rates are derived from the tempo by hand (no tempo sync yet).

**Tuning rules** (from a spectral review; the first version sounded "disharmonic"):
- **No detuned partials a tone apart.** Offsets like the old snare's +37 cents or the bells' −30 cents read as out of tune against the chords. Detune is only small chorus-style spread (≤6 cents).
- **Resonant filters must settle on chord tones.** The kick's filter rests on A2 and the laser's on G2; they used to ring at 90 Hz and 150 Hz, both between notes.
- **Sustained or pitched extras use G or D.** G fits all four chords (Am7, Fadd9, C, G). The riser used to hold an E against the F chord, and the hats used an F#.
- **Wobble in the mid-bass, not the sub.** On a very low note the filter sweep emphasizes the high harmonics, including the flat 7th, 11th and 13th, which sound sour.

Measured against 12-TET and A minor (spectral peaks from 150 Hz to 5 kHz), the intro, verse, rises, breakdown and outro are as clean as Neon Tide (≤7% off-pitch energy, ≤3% off-key). The drops are 12–19%, which is the wobble and growl's natural harmonic character.

**DSP budget:** convolution reverb is by far the costliest effect (≈2% of real time each at 48 kHz, versus ≈0.3–0.7% for the others), and every track's effect chain runs even while the track is silent. So only Pad and Lead have reverbs, the Riser and Bells use feedback delays, and the drums have no reverb. Measured at 48 kHz, with notes scheduled 0.1 s ahead like live playback, the render takes about 0.5× real time in the verse and drop 2, and about 0.36× in drop 1. Neon Tide's densest section measured 0.42× the same way.

**Mix** (loudness, K-weighted approximation): lead, arp, bass and kick sit within ~2 dB of each other. The snare is ~3.5 dB under the lead, the hats ~10 dB under, and the wobble leads the drops with the sub just below it. Sections: intro −27.7, verse −20.4 (Neon Tide's matching section is −20.3), drops −19.9 and −18.5, breakdown −23.4 and outro −24.1. Peaks stay ≤0.78, with no clipping. Neon Tide's volume quirks still apply (distortion adds gain; track volume is pre-effects).

**2026-10-15:** the hand-timed delays and LFO rates now use tempo sync (`sync: "1/8"`, `"1/8."`, `"1/16"`); the sound is otherwise untouched, per the standing note that the user likes this song. The only audible-in-theory difference is that the synced delay times are exact instead of rounded to the millisecond (a 0.2 ms echo shift). Section loudness measured identical before and after (verse −13.1, drop 2 −12.0 momentary max). The drums still fake noise with filter sweeps and stacked squares; switching them to the noise oscillator would change the sound, so it needs the user's say-so.
