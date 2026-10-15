# mixer.js

Owns the per-track audio buses and the master [effect chain](./effectChain.md). Signal flow per track: `gainNode` (volume, mute/solo) -> track `effectChain` -> `StereoPannerNode` -> shared `masterGain` ([audioEngine.js](./audioEngine.md)) -> master chain -> `masterOutput` (a unity gain, exposed for metering) -> `destination`. A separate `clickInput` gain feeds `masterOutput` directly, at the master volume: the metronome plays through it, so the master effects (the demos all have a master compressor, which used to duck the music on every click) never touch it.

**`syncProject(project)` is the only way the audio graph gets updated.** It reconciles everything against the project's plain data:
- It disposes buses for tracks that no longer exist and creates them for new ones (`getTrackBus` is lazy).
- It recomputes every track's effective gain together, because solo silences every non-soloed track, so one track's change affects all of them.
- Volume, pan, mute/solo and master volume are applied through a per-param setter that sets the first value directly (so offline renders and fresh buses start exactly on it) and ramps later changes with `setTargetAtTime` (10 ms), so faders and mute buttons don't click.
- It syncs each effect chain (a cheap diff when nothing structural changed) and the master volume and effects.

It's idempotent, so [audioEngine.js](./audioEngine.md) calls it after every `project:changed`. This replaced the pre-Phase-13 design, where UI code called `sync*` methods by hand after each edit. That design meant nothing re-applied saved state on load, undo or import, so loaded projects silently ignored their own mixer settings.

[exportRender.js](./exportRender.md) builds a second mixer on an `OfflineAudioContext` and calls the same `syncProject`.
