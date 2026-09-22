# audioEngine.js

Owns the single `AudioContext` and master gain node (lazily created on the first `note:on`, so we don't trip the browser's autoplay-gesture policy). Subscribes to `note:on`/`note:off` on the shared [eventBus](../core/eventBus.md) and maps MIDI note numbers to voices via [voice.js](./voice.md), tracking one active voice per note in `activeVoices`.

`initAudioEngine()` must be called once at startup before any `note:on` events are emitted. `ensureContext()` also resumes a suspended context on every note-on, which covers Chrome's per-tab autoplay suspension after inactivity.
