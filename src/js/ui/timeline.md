# timeline.js

The main DAW view: transport controls (play/pause/stop, tempo, beats-per-bar, metronome toggle), horizontal zoom (pixels-per-beat, 10–120) and vertical zoom (track row height, 40–120px), an "+ Track" button, and per-track lanes where clicking empty space adds a fixed-length block and dragging a block moves it (pointer-drag on the block body) or resizes it (drag the right-edge handle) — both snapped to quarter-beat via `snapBeat`. A red playhead tracks [transport.js](../core/transport.md)'s `getPositionBeats()`, positioned with a CSS `transform` rather than triggering a re-render.

`syncPlayhead()` is called both from a `requestAnimationFrame` loop (for smooth motion while actually playing) and synchronously from every transport/zoom control's own click/input handler. The synchronous calls matter beyond the obvious (instant feedback on pause/stop/zoom without waiting for the next frame) — `requestAnimationFrame` callbacks are throttled to zero in a backgrounded/non-painting tab by design, so relying on the rAF loop alone would leave the playhead stuck at a stale position under those conditions.

**Rendering strategy:** structural changes (add/remove track or block, zoom change, beats-per-bar change) call `renderTracks()`/`renderRuler()`, which wipe and rebuild the DOM for the tracks/ruler — simple and correct for the data volumes expected at this phase, not optimized for large projects (that's a Phase 11 performance concern if it becomes one). The playhead is the one thing updated every frame, and deliberately bypasses full re-render for that reason.

**Coupling to watch:** `TRACK_HEADER_WIDTH` (120) must match the `.timeline-track-header` width in `main.css` — the ruler's `margin-left` and the playhead's base `left` both need to line up with where the lanes actually start. If you resize the header column in CSS, update the constant here too.

Double-clicking a block opens [pianoRoll.js](./pianoRoll.md) for it in a panel below the timeline (`openPianoRoll`/`pianoRollPanel`) — blocks now carry real note content, and playback of those notes is scheduled by [transportController.js](../core/transportController.md) alongside the metronome click.
