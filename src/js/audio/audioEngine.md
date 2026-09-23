# audioEngine.js

Owns the single `AudioContext`, the master gain, the live [synthEngine](./synthEngine.md) and the [mixer](./mixer.md). All of them are created lazily in `ensureContext()` (autoplay policy), which also resumes a suspended context.

- **Live notes:** subscribes to `note:on`/`note:off` on the [eventBus](../core/eventBus.md) and forwards them to the synth engine.
- **Sequenced notes:** `scheduleNote(...)` (used by [transportController.js](../core/transportController.md)) and `cancelScheduledNotes()` (called on transport stop/pause/seek).
- **Model -> audio sync:** `attachProject(project)` stores the project, and every `project:changed` queues a `mixer.syncProject(project)` coalesced to one per microtask. The mixer is also synced the moment it's created. UI code never touches the mixer. It only mutates the project through [project.js](../core/project.md).
- `ensureAudioContext()`/`getMasterGain()`/`getMixer()`: accessors for modules that need the same context/graph.
