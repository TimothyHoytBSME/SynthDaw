# synthEngine.js

Voice manager between [audioEngine.js](./audioEngine.md) and [voice.js](./voice.md). It holds **no patch**: every note call passes its own `patch` and `destination`, which is what makes per-track instruments possible with one engine.

**Live path** (`noteOn(note, velocity, patch, destination)`/`noteOff(note)`): one active voice per note number, at most `MAX_VOICES` (8) with oldest-voice stealing. A stolen or retriggered voice gets a fast forced release, never a hard cut. `setPitchBend(cents)` bends every live voice and applies to new ones too. Sequenced notes are deliberately unaffected.

**Sequenced path** (`scheduleNote(note, velocity, startTime, durationSeconds, patch, destination)`): creates a voice with start and stop both scheduled at exact future `AudioContext` times, outside the live pool. Scheduled voices are tracked in a set (each removes itself on `ended`), so `cancelScheduled()` can fade out everything sequenced, both sounding and not-yet-started, when the transport stops, pauses or seeks.

**Live patch edits:** `refreshPatch(patch)` calls `refresh()` on every live and scheduled voice playing that exact patch object ([voice.js](./voice.md) describes what can change mid-note). [audioEngine.js](./audioEngine.md) calls it on `patch:param-changed`.

**Known limitation:** the live and sequenced pools don't share one voice budget.
