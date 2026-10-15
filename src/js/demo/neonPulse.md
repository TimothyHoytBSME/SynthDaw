# neonPulse.js

`createNeonPulseProject()` builds **Neon Pulse**: a 16-bar house loop (124 BPM, A minor, Am–G–F–Em, about 31 s, looped) that shows off the drum presets and tempo sync. Built with [demoKit.js](./demoKit.md); `sectionBlocks` makes one block per section, with note times relative to the block.

| Bars | Section | What plays |
|---|---|---|
| 1–4 | Intro | Pad (filter LFO synced to 2 bars) and 16th closed hats; the Kick arrives in bar 3; noise Riser into bar 5 |
| 5–8 | Groove | Crash, + Snare on 2 and 4 (ghost on the "a" of 4 every other bar), off-beat Sub Bass, Pluck Arp (1/8. synced delay), Tom fill on bar 8 beats 3–4 |
| 9–12 | Lift | Crash, + Open hats on the "and"s, Gate Pad (amp LFO synced to 1/16 = trance gate, 1/8 delay), Zap on bars 9 and 11 (1/4 delay) |
| 13–14 | Break | No kick/snare/bass: Pad, Arp, closed hats, Riser; a rising snare roll through the last two beats |
| 15–16 | Finale | Crash, everything from the Lift, Tom fill on bar 16 beats 3–4 (into the loop's return) |

**Phrase ends** (bars 4, 8, 12, 16): an extra kick on the "and" of 4, a snare pickup (3.25, 3.5), a closed-hat swell through the last beat, an extra open hat on the "a" of 4, and the bass jumps an octave on its last note.

Feature coverage: every drum preset (Kick, Snare, Closed/Open Hat, Tom, Zap, Noise Sweep), noise oscillator, pitch envelope, LFO sync (filter and amp targets), delay sync (three divisions), velocity-sensitive filter envelopes (Pluck Arp 0.6, Sub Bass 0.5), plus a master EQ → compressor. The Crash is the Open Hat preset with a 4 kHz highpass and a 0.9 s decay through a small reverb.

**Tuning:** the kick note follows each chord's root (A1, G1, F1, E1), so its sub never fights the bass, which plays off-beats. The snare body and hats sit on A (a chord tone or mild extension over all four chords; E clashed with F). The Zap's resonant filter is set to 1318.5 Hz (E6, a chord tone of Am, which is always under it) instead of the preset's 1.2 kHz. Toms walk down Em (B2, G2, E2, B1).

**Balance** (offline, 48 kHz, K-weighted momentary max per solo track in the Lift, relative to the kick at −13.9): snare −4.8, bass −3.6, toms −3.7, arp −8.6, gate pad −9.7, zap −9.6, pad −9.4 (intro), riser −10.5, open hat −12.3, closed hat −14.2. Mix peaks ≤0.73 after the master trim to 0.42, which matches Neon Riptide's verse loudness. Render load with every note scheduled up front is ≤0.47× real time (live scheduling is lighter).

**Polish pass (2026-10-15):** the intro used to be nearly as loud as the groove (−16.3 vs −14.2 mean); with the kick held back to bar 3 it is −18.8. Every drum part had one unique bar per section; the phrase-end fills, ghost snare and hat swells above make them 2–4. Kick 0.7 → 0.64 and bass 0.6 → 0.56 to ease a mix where over 60% of the energy sat below 60 Hz. After: groove −11.7 / lift −12.3 / finale −11.9 momentary max, peaks ≤ 0.74, 92–93% of spectral-peak energy in A minor (noise hats account for the rest).

**Not listened to:** these are measurements; the user judges the sound.
