# pitch.js

One function, `noteToFrequency(note)`: standard 12-TET conversion from a MIDI note number to Hz, referenced to A4 = MIDI 69 = 440Hz. Shared by [voice.js](./voice.md) and anything else that needs to turn a note number into a pitch (piano roll playback, etc.) — don't reimplement this math elsewhere.
