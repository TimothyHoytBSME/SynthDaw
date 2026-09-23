# transportController.js

Glue between the UI-agnostic [transport.js](./transport.md) clock and the audio side: lazily creates a single `transport` instance on first `getTransport()` call (needs an `AudioContext`, obtained via [audioEngine.js](../audio/audioEngine.md)'s `ensureAudioContext()`), and plays a metronome [click](../audio/click.md) on each beat when `metronomeEnabled` is true, accenting beat 1 of each bar via `beatsPerBar`.

`getTransport({ beatsPerBar })` is how [timeline.js](../ui/timeline.md) both supplies the current time signature and retrieves the shared transport — pass `beatsPerBar` on the call that changes it (e.g. from a time-signature input), omit it otherwise.
