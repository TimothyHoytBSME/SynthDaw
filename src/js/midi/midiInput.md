# midiInput.js

Wraps the Web MIDI API. `initMIDIInput()` requests access, attaches `onmidimessage` to every current input, and re-attaches on hot-plug via `MIDIAccess.onstatechange`. Parses raw MIDI bytes into the same `note:on`/`note:off` events [computerKeyboard.js](../ui/computerKeyboard.md) emits (`{ note, velocity, channel, source: "midi" }`), plus `midi:cc` (consumed by [midiMap.js](./midiMap.md) for MIDI learn) and `midi:pitchbend` (consumed by [audioEngine.js](../audio/audioEngine.md), ±2 semitones on live voices).

A note-on with velocity 0 is treated as a note-off, per common MIDI controller behavior.

**Sustain pedal (CC 64, 2026-10-15):** while the pedal is down (value ≥ 64) on a channel, that channel's key releases are held back and emitted as `note:off` when the pedal lifts, so the synth, and the recorder's note lengths, follow the pedal. Re-striking a held key cancels its pending release (the synth retriggers it). The CC is still emitted as `midi:cc` afterwards, so MIDI learn could map it like any other controller. `handleMIDIMessage` is exported for tests; the app only reaches it through device callbacks. Emits `midi:unsupported` (browser lacks the API, or the user/OS denied permission) or `midi:ready`/`midi:devicechange` so the UI can reflect connection state; see [midiStatus.js](../ui/midiStatus.md).
