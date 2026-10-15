import { bus } from "./eventBus.js";
import { createTicker } from "./ticker.js";

const LOOKAHEAD_MS = 25;
// How far ahead of real time audio is scheduled. Enough to ride out a stalled main thread
// (an unfocused or backgrounded renderer), but not more: every voice scheduled early is a
// live set of nodes on the audio thread for that much longer, which costs CPU exactly where
// a struggling machine can least afford it. (0.5 s was tried on 2026-10-15 and made the
// user's glitches worse.)
const SCHEDULE_AHEAD_SECONDS = 0.2;
const HIDDEN_SCHEDULE_AHEAD_SECONDS = 1;

function scheduleAheadSeconds() {
  return typeof document !== "undefined" && document.hidden ? HIDDEN_SCHEDULE_AHEAD_SECONDS : SCHEDULE_AHEAD_SECONDS;
}

// `onSchedule(windowStart, windowEnd, beatToContextTime)` is called with consecutive windows of
// beats to schedule; a window never crosses the loop seam, and `beatToContextTime` maps a beat
// in that window to an AudioContext time. `onCancel()` is called whenever audio already
// scheduled ahead becomes invalid (stop, pause, seek, loop change) so the owner can silence it.
export function createTransport(audioContext, { onSchedule, onCancel } = {}) {
  let tempo = 120;
  let running = false;
  // The clock anchor: position `startBeat` was at context time `startContextTime`. While
  // running, time since the anchor counts "unwrapped" beats, which can run past the loop end;
  // `wrap()` folds them back into the loop. The anchor never moves at the seam.
  let startContextTime = 0;
  let startBeat = 0;
  // Scheduling cursor, in the same unwrapped frame as rawUnwrappedBeats().
  let cursor = 0;
  // Set while play() waits for a suspended AudioContext to actually start running.
  let pendingStart = null;
  let loop = { enabled: false, startBeat: 0, endBeat: 8 };
  const ticker = createTicker(LOOKAHEAD_MS, () => poll());

  function beatsToSeconds(beats) {
    return beats * (60 / tempo);
  }

  function loopIsValid() {
    return loop.enabled && loop.endBeat > loop.startBeat;
  }

  function loopLength() {
    return loop.endBeat - loop.startBeat;
  }

  function isInsideLoop(beat) {
    return beat >= loop.startBeat && beat < loop.endBeat;
  }

  function rawUnwrappedBeats() {
    if (!running) {
      return startBeat;
    }
    return startBeat + (audioContext.currentTime - startContextTime) * (tempo / 60);
  }

  function wrap(beat) {
    if (loopIsValid() && beat >= loop.endBeat) {
      return loop.startBeat + ((beat - loop.startBeat) % loopLength());
    }
    return beat;
  }

  function getPositionBeats() {
    return wrap(rawUnwrappedBeats());
  }

  // The first unwrapped beat after `beat` at which the loop wraps (loop.endBeat, then every
  // loop length after it). Windows stop there, because wrapped beats are discontinuous across it.
  function nextSeamAfter(beat) {
    if (beat < loop.endBeat) {
      return loop.endBeat;
    }
    return loop.endBeat + (Math.floor((beat - loop.endBeat) / loopLength()) + 1) * loopLength();
  }

  function poll() {
    const horizon = rawUnwrappedBeats() + (scheduleAheadSeconds() * tempo) / 60;
    while (cursor < horizon) {
      const windowEnd = loopIsValid() ? Math.min(horizon, nextSeamAfter(cursor)) : horizon;
      const wrappedStart = wrap(cursor);
      // Unwrapped minus wrapped is constant within a window (it never crosses a seam).
      const frameOffset = cursor - wrappedStart;
      const beatToContextTime = (beat) => startContextTime + beatsToSeconds(beat + frameOffset - startBeat);
      onSchedule?.(wrappedStart, wrappedStart + (windowEnd - cursor), beatToContextTime);
      cursor = windowEnd;
    }
  }

  // Re-anchors the clock at the current position (tempo change) or at `beat` (seek, loop
  // change), keeping the scheduling cursor in step with the new frame.
  function reanchor(beat, { keepScheduled }) {
    const previousRaw = rawUnwrappedBeats();
    cursor = keepScheduled ? beat + (cursor - previousRaw) : beat;
    startBeat = beat;
    startContextTime = audioContext.currentTime;
  }

  // Coming back to a visible tab, or leaving it: top up the schedule right away with the new
  // horizon instead of waiting for the next tick.
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (running) {
        poll();
      }
    });
  }

  function start() {
    // Resume where we paused if that's inside the loop; only snap to the loop start from
    // outside it (e.g. after Stop, which rewinds to 0).
    if (loopIsValid() && !isInsideLoop(startBeat)) {
      startBeat = loop.startBeat;
    }
    running = true;
    startContextTime = audioContext.currentTime;
    cursor = startBeat;
    poll();
    ticker.start();
    bus.emit("transport:play", {});
  }

  function cancelPendingStart() {
    pendingStart = null;
  }

  return {
    // The clock must only be anchored once the AudioContext is really running: a suspended
    // context (Chrome's autoplay policy, before the first click) has a frozen currentTime, so
    // anchoring to it would leave the transport "playing" against a clock that never moves.
    play() {
      if (running || pendingStart) {
        return;
      }
      if (audioContext.state === "running") {
        start();
        return;
      }
      const token = {};
      pendingStart = token;
      bus.emit("transport:waiting-for-audio", {});
      audioContext.resume().then(() => {
        if (pendingStart === token) {
          pendingStart = null;
          start();
        }
      });
    },
    pause() {
      cancelPendingStart();
      if (!running) {
        return;
      }
      startBeat = getPositionBeats();
      running = false;
      ticker.stop();
      onCancel?.();
      bus.emit("transport:pause", {});
    },
    stop() {
      cancelPendingStart();
      running = false;
      ticker.stop();
      startBeat = 0;
      onCancel?.();
      bus.emit("transport:stop", {});
    },
    seek(beat) {
      const target = Math.max(0, beat);
      if (running) {
        onCancel?.();
        reanchor(target, { keepScheduled: false });
        poll();
      } else {
        startBeat = target;
      }
      bus.emit("transport:seek", { beat: target });
    },
    setTempo(bpm) {
      if (bpm === tempo) {
        return;
      }
      if (running) {
        // Already-scheduled audio keeps its old timing (up to the schedule horizon); the
        // cursor moves to the new frame so nothing is scheduled twice or skipped.
        reanchor(getPositionBeats(), { keepScheduled: true });
      }
      tempo = bpm;
      bus.emit("transport:tempo", { tempo });
    },
    getTempo() {
      return tempo;
    },
    setLoop(nextLoop) {
      // While running, windows scheduled ahead were cut at the old seam, so they are dropped
      // (a short fade) and scheduling restarts from the current position in the new frame.
      const position = getPositionBeats();
      loop = { ...loop, ...nextLoop };
      if (running) {
        onCancel?.();
        reanchor(position, { keepScheduled: false });
        poll();
      }
      bus.emit("transport:loop", { loop });
    },
    getLoop() {
      return loop;
    },
    getPositionBeats,
    // Maps a beat near the current position to a context time (the current loop cycle).
    beatToContextTime(beat) {
      return startContextTime + beatsToSeconds(beat - startBeat);
    },
    // True while playing or while a play() is waiting for audio to start, so a second
    // Space/Play press during that wait toggles it off instead of stacking another start.
    isRunning() {
      return running || pendingStart !== null;
    },
    isWaitingForAudio() {
      return pendingStart !== null;
    },
  };
}
