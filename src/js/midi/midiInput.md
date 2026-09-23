# midiInput.js

Wraps the Web MIDI API. `initMIDIInput()` requests access, attaches `onmidimessage` to every current input, and re-attaches on hot-plug via `MIDIAccess.onstatechange`. Parses raw MIDI bytes into the same `note:on`/`note:off` events [computerKeyboard.js](../ui/computerKeyboard.md) emits (`{ note, velocity, channel, source: "midi" }`), plus `midi:cc` and `midi:pitchbend` for control surfaces — those aren't consumed by anything yet (no mod-routing UI exists until Phase 3+) but are emitted now so wiring them up later doesn't require touching this file.

A note-on with velocity 0 is treated as a note-off, per common MIDI controller behavior. Emits `midi:unsupported` (browser lacks the API, or the user/OS denied permission) or `midi:ready`/`midi:devicechange` so the UI can reflect connection state; see [midiStatus.js](../ui/midiStatus.md).
