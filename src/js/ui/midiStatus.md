# midiStatus.js

Tiny status readout bound to [midiInput.js](../midi/midiInput.md)'s `midi:ready` / `midi:devicechange` / `midi:unsupported` events — shows which MIDI devices (if any) are connected, or why MIDI isn't available. Purely a diagnostic; not part of the note-input pipeline itself.
