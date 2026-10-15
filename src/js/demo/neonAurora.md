# neonAurora.js

`createNeonAuroraProject()` builds **Neon Aurora**: a symphonic overture for a synthesized orchestra, 64 bars at 92 BPM in D minor (about 2:47), the fifth entry in the demo picker ([demos.js](./demos.md)). It is not a loop (looping is off; the range is set so Loop can be ticked). Sixteen tracks: Violins I, Violins II, Violas, Cellos, Contrabass, Horns, Trumpets, Flute, Oboe, Harp, Choir, Timpani, Snare, Cymbals, Susp. Cymbal, Glockenspiel. Built with [demoKit.js](./demoKit.md) from custom `normalizePatch()` patches (the strings, spiccato violas, horns, trumpets, flute, oboe, harp, choir, glockenspiel) and three presets (Kick → timpani, Snare, Open Hat → cymbals, Noise Sweep → suspended cymbal).

**Form** (8-bar sections; one chord per bar):

| Bars | Section | Chords | What plays |
|---|---|---|---|
| 1–8 | Dawn I | Dm pedal (Gm, A at the end) | Contrabass and cello drone, harp arpeggios from bar 3, the Flute alone with the theme's first phrase from bar 5. *pp* |
| 9–16 | Dawn II | Dm Gm F A Dm Bb Gm A | Violins II chords, the Flute plays the whole theme an octave up, harp, a soft timpani roll on A into the theme. *p* |
| 17–24 | Theme I | same | Violins I carry the theme; cellos walk down from each chord's fifth; harp; timpani on downbeats. *mp* |
| 25–32 | Theme II | same | + Oboe a diatonic third above the theme, Horns sustaining fifths, trumpet calls at phrase ends, a snare roll and a cymbal swell into the storm. *mf* |
| 33–40 | Storm | Dm Bb Gm A ×2 | Violas spiccato 16th ostinato, cellos driving 8ths, horn and trumpet fanfares (dotted rhythm), timpani on 1 and 3 with rolls, marching snare, crash. *f* |
| 41–48 | Climax | Dm Bb Gm A Dm Bb Gm **A7** | The Trumpets take the theme over the storm; Choir enters. Bar 48 is the breath: one stab on A7, then only a timpani roll, a snare roll and a suspended-cymbal swell. *ff* |
| 49–56 | Hymn | **D G D A D Bm G A** | D major. Violins I play the theme's major transformation, Flute doubles it an octave up, Glockenspiel rings its downbeats, Choir and Horns hold the chords, harp arpeggios. *f* |
| 57–64 | Finale | D Bm G A, then D | The theme's second half with trumpet interjections and the Oboe in thirds; bar 61 lands the final D major chord, held for three bars with a timpani roll, a cymbal and a rising glockenspiel arpeggio to D7. *ff* |

**The theme** (`THEME_MINOR`, D harmonic minor; `THEME_MAJOR` keeps its rhythm): D5 A4 Bb4 | A4 G4 | F4 G4 A4 | E4 C#5 | D5 F5 E5 | D5 C5 Bb4 | A4 G4 F4 | E4 C#5 D5. Harmonies in thirds come from `scaleStep` (diatonic steps within the section's scale). Chord voicings are four-part close position around A3–A4 (`CHORDS`); brass and bass parts derive root, third and fifth from each chord.

**Orchestration notes:** the bowed strings have a 220 ms attack, which is why the storm's 16ths are a separate spiccato patch (15 ms attack): on the first pass the ostinato was 11 dB under everything because the notes ended before the attack finished. The contrabass is written two octaves below the chord (D2 = 73 Hz) and the timpani on D2/A2; the first pass put both an octave lower and 74% of the mix's energy was below 60 Hz. One master reverb (4.5 s, 30%) is the hall for everything, which also keeps the CPU cost to a single convolver; the flute and harp have light synced delays. Velocity-sensitive filters on the strings, horns, trumpets and timpani make the dynamics brighten as they get louder.

**Balance** (offline, 48 kHz, K-weighted momentary max per solo track; Storm bars 33–40): Violins II −21.9, Violas −23.4, Cellos −21, Contrabass −24.1, Horns −22.8, Trumpets −20.7, Timpani −22.5, Snare −26.2, Cymbals −27.9. Hymn bars 49–56: Violins I −20.4, Violins II −22, Cellos −23.8, Contrabass −24, Horns −20.3, Trumpets −21.4, Flute −25.8, Harp −27.8, Choir −21.4, Timpani −22.8, Glockenspiel −27. Full mix (momentary max / mean): Dawn I −21.7 / −27.0, Dawn II −19.9 / −24.1, Theme I −19.4 / −21.8, Theme II −16.6 / −19.6, Storm −14.6 / −17.0, Climax −13.2 / −16.1, Hymn −14.1 / −17.4, Finale −13.0 / −16.9; peaks ≤ 0.68 at master 0.3 (EQ → reverb → compressor −24 dB, 3:1). 98–100% of spectral-peak energy is on the scale in every section. Headless render load about 0.6× real time.

**Not listened to:** the user judges it.
