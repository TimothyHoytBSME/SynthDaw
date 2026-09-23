# synthEngine.js

Polyphony manager between [audioEngine.js](./audioEngine.md) and [voice.js](./voice.md).

**Live path** (`noteOn`/`noteOff`): one active voice per note number, at most `MAX_VOICES` (8) with oldest-voice stealing. A stolen or retriggered voice gets a fast forced release (`voice.stop(true)`), never a hard cut. `setPatch()` only affects voices created after the call.

**Sequenced path** (`scheduleNote(note, velocity, startTime, durationSeconds, destinationOverride)`): creates a voice with start and stop both scheduled at exact future `AudioContext` times, outside the live pool/stealing. `destinationOverride` routes it into its track's mixer bus. Scheduled voices are tracked in a set (each removes itself on `ended`), so `cancelScheduled()` can fade out everything sequenced, both sounding and not-yet-started, when the transport stops, pauses or seeks. Before Phase 13, notes kept ringing for their full length after Stop.

**Known limitation:** the live and sequenced pools don't share one voice budget.
