# neonPulse.js

`createNeonPulseProject()` builds **Neon Pulse**: a 16-bar house loop (124 BPM, A minor, Am–G–F–Em, about 31 s, looped) that shows off the drum presets and tempo sync. Built with [demoKit.js](./demoKit.md); `sectionBlocks` makes one block per section, with note times relative to the block.

| Bars | Section | What plays |
|---|---|---|
| 1–4 | Intro | Kick, 16th closed hats, Pad (filter LFO synced to 2 bars), noise Riser into bar 5 |
| 5–8 | Groove | + Snare on 2 and 4, off-beat Sub Bass, Pluck Arp (1/8. synced delay), Tom fill on bar 8 beats 3–4 |
| 9–12 | Lift | + Open hats on the "and"s, Gate Pad (amp LFO synced to 1/16 = trance gate, 1/8 delay), Zap on bars 9 and 11 (1/4 delay) |
| 13–14 | Break | No kick/snare/bass: Pad, Arp, closed hats, Riser |
| 15–16 | Finale | Everything from the Lift |

Feature coverage: every drum preset (Kick, Snare, Closed/Open Hat, Tom, Zap, Noise Sweep), noise oscillator, pitch envelope, LFO sync (filter and amp targets), delay sync (three divisions), plus a master EQ → compressor.

**Tuning:** the kick note follows each chord's root (A1, G1, F1, E1), so its sub never fights the bass, which plays off-beats. The snare body and hats sit on A (a chord tone or mild extension over all four chords; E clashed with F). The Zap's resonant filter is set to 1318.5 Hz (E6, a chord tone of Am, which is always under it) instead of the preset's 1.2 kHz. Toms walk down Em (B2, G2, E2, B1).

**Balance** (offline, 48 kHz, K-weighted momentary max per solo track in the Lift, relative to the kick at −13.9): snare −4.8, bass −3.6, toms −3.7, arp −8.6, gate pad −9.7, zap −9.6, pad −9.4 (intro), riser −10.5, open hat −12.3, closed hat −14.2. Mix peaks ≤0.73 after the master trim to 0.42, which matches Neon Riptide's verse loudness. Render load with every note scheduled up front is ≤0.47× real time (live scheduling is lighter).

**Not listened to:** these are measurements; the user judges the sound.
