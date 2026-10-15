# neonVortex.js

`createNeonVortexProject()` builds **Neon Vortex**: a 32-bar psytrance loop (145 BPM, E minor, about 53 s, looped). It's listed fourth in the header's demo picker ([demos.js](./demos.md)). Built with [demoKit.js](./demoKit.md) from presets plus three custom `normalizePatch()` patches (the rolling bass, the acid line, the squelch blips); `sectionBlocks` makes one block per section with note times relative to the block.

| Bars | Section | What plays |
|---|---|---|
| 1–4 | Intro | Kick, 16th closed hats, Pad (Em7, filter LFO synced to a bar); the Roll Bass joins at bar 3 under a 2-bar noise Riser |
| 5–12 | Groove | + Snare on 2 and 4, open hats on the "and"s, the Acid riff (8ths for 4 bars, then full 16ths), Squelch blips every other bar |
| 13–16 | Break | No kick, bass or snare: Pad chords (Em7 · Cmaj7 · D · Em), Gate chord (trance gate), Zaps, closed hats |
| 17–20 | Build | Kick and bass return with the Acid riff; a 4-bar Riser; snare 8ths in bar 19 and a rising 16th roll in bar 20 |
| 21–28 | Drop | Everything: kick, bass, snare, both hats, Acid, Gate, Zaps, Squelch |
| 29–32 | Outro | Kick, bass, hats and Pad |

**Sound design notes**
- **Roll Bass**: the psytrance signature. Three off-beat 16ths after every kick (kick · bass bass bass), 0.2 beats long, saw + square into a 170 Hz lowpass with a 1.5 kHz filter envelope that decays in 80 ms, so each note is a click-and-thump rather than a held tone. The kick is the preset shortened (decay 0.3 s) so the two interleave.
- **Acid**: two detuned saws into a resonant (Q 9) lowpass. The filter envelope plucks every 16th and a filter LFO synced to two bars sweeps the whole line between about 180 Hz and 2.4 kHz, which is the only "automation" the app has today. Dotted-8th synced delay. The riff is E minor pentatonic (E2 G2 A2 B2 D3 E3).
- **Gate**: the Soft Pad preset with a full-depth amp LFO synced to 1/16 (trance gate), holding E4 G4 B4.
- **Zap**: the preset with its resonant filter resting on E6 (1318.5 Hz), a chord tone; 1/4 synced delay.
- **Squelch**: square + saw into a Q 12 lowpass that opens 3.8 kHz and snaps shut in 70 ms, with a 12-semitone pitch drop, on a 1/8-triplet delay. Sparse hits on E5 G5 B5 D6.
- **Snare roll**: bar 20 is 16ths with velocity rising 60 → 120.

**Balance** (offline, 48 kHz, K-weighted momentary max per solo track in the Drop, relative to the kick at −16.5): bass −2.0, snare −3.7, acid −7.5, zap −9.7, gate −10.1, squelch ≈ −11, open hat −12, closed hat −14; pad −8 and riser −10 in the sections where they lead. Full mix: drop −12.3 (Neon Pulse measures −12.6 the same way), build −11.3, break −17.2, peaks ≤ 0.71 at master volume 0.42. Headless render load with the chunked exporter is 0.57× real time (Pulse: 0.38×); the acid line's a-rate filter and three synced delays are the cost.

**Not listened to:** these are measurements; the user judges the sound.
