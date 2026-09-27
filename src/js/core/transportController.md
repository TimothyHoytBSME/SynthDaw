# transportController.js

Glue between the UI-agnostic [transport.js](./transport.md) clock and the audio side. `getTransport()` lazily creates the single transport, and with it the `AudioContext`. It's only called from user actions (Play, Space, ruler seek, Record), never at page load, so the context is born inside a gesture (see the autoplay notes in [audioEngine.md](../audio/audioEngine.md)). It then syncs tempo/loop from the project. `getPositionBeats()` is the read-only accessor for polling (the timeline playhead): it returns 0 without creating anything if the transport doesn't exist yet. The transport has two hooks:

- `onSchedule`: the **metronome** (a [click](../audio/click.md) per integer beat when enabled, accented on each bar's downbeat using the project's `beatsPerBar`) and the **note sequencer**. The sequencer iterates [`playableNotes(project)`](./project.md) (absolute beats, already clipped to block bounds) and calls [audioEngine.js](../audio/audioEngine.md)'s `scheduleNote()` for every note starting in the window, routed to its track's mixer bus.
- `onCancel`: `cancelScheduledNotes()`.

**The transport follows the project:** `setProject(project)` and every `project:changed` (subscribed in `initTransportController()`) push `project.tempo` and `project.loop` into the transport. Tempo and loop are therefore undoable, restored on load, and never set by UI code directly. Before Phase 13, a loaded project's tempo was never applied.
