# recorder.js

Records live performance into a block. `initRecorder(project)` subscribes to `note:on`/`note:off` (only `source` `midi` or `keyboard`, so piano-roll auditioning is never recorded) and to `transport:pause`/`transport:stop`, both of which end a take.

- `startRecording()` arms the **selected track** ([selection.js](./selection.md)) and starts the transport if it's stopped. It posts a `status:message` if there are no tracks.
- While recording, each press stores its transport position, and its release computes the length. A release that lands *before* its press means the loop wrapped, so the note runs to `loop.endBeat`.
- `stopRecording(endBeat)` closes any still-held notes and commits the take as **one new block**: bar-aligned around the played notes (at least one bar), notes relative to it, optionally quantized to ¼ beat (`setQuantizeTakes`, default on). It then selects that block and emits `project:blocks-changed`. With the loop on, repeated passes layer into the same take.
- Stop rewinds the transport to 0 *before* emitting `transport:stop`, so held notes are closed at `lastPosition`, a position sampled every 20ms while recording.

`recorder:changed { recording }` drives the Record button in [transportBar.js](../ui/transportBar.md). Known limits (in the backlog): no latency compensation and no count-in.
