# transport.js

Audio-accurate play/pause/stop/seek clock, independent of any UI. `getPositionBeats()` is computed on demand from `audioContext.currentTime` (it never drifts).

`createTransport(audioContext, { onSchedule, onCancel })`:
- `onSchedule(windowStart, windowEnd, beatToContextTime)` is a lookahead scheduler hook. A `setTimeout` poll every 25ms hands out consecutive, non-overlapping beat windows about 100ms ahead of real time. The consumer ([transportController.js](./transportController.md)) decides what falls in each window.
- `onCancel()` fires on `pause()`, `stop()` and a `seek()` while running, since everything already scheduled ahead is now wrong.

**`play()` waits for a running context.** If the `AudioContext` is suspended, it calls `resume()` and anchors the clock only once that resolves. Anchoring to a suspended context's frozen `currentTime` would leave the transport "playing" against a clock that never moves. While waiting, `isRunning()` is true, so a second Space press toggles it off, and `isWaitingForAudio()` is true. `pause()`/`stop()` cancel the pending start. It emits `transport:waiting-for-audio` when it has to wait.

`setTempo()` re-anchors the position so changing tempo mid-playback doesn't jump, and it's a no-op for an unchanged tempo. `pause()` freezes the position, `stop()` rewinds to 0, and `seek(beat)` jumps (re-anchoring and resetting the schedule cursor if running). Emits `transport:play/pause/stop/seek/tempo/loop` on the [eventBus](./eventBus.md). The UI polls `getPositionBeats()` for the playhead instead of subscribing.

**Looping (`setLoop`):** `play()` resumes from the current position if it's inside the loop and snaps to `loop.startBeat` only from outside it. Before Phase 13 it always snapped, so Pause -> Play restarted the loop. The loop logic keeps two concerns separate:
- **Position re-anchoring** (`catchUpPositionAnchor`) triggers only when *real* elapsed time crosses `loop.endBeat`.
- **Scheduling** caps each window at `loop.endBeat` and continues from `loop.startBeat` on the tick after the anchor resets.

An earlier attempt re-anchored off the lookahead horizon (~100ms early). That corrupted position reads and over-scheduled notes about 3x at the seam, so keep these two separate. `getPositionBeats()` also wraps as a safety net between poll ticks.
