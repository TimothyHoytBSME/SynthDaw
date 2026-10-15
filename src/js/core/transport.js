import { bus } from "./eventBus.js";
import { createTicker } from "./ticker.js";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;
// In a hidden tab the ticker (a worker) keeps running, but the page itself gets less time and
// its own callbacks can be delayed, so audio is scheduled further ahead there.
const HIDDEN_SCHEDULE_AHEAD_SECONDS = 1;

function scheduleAheadSeconds() {
  return typeof document !== "undefined" && document.hidden ? HIDDEN_SCHEDULE_AHEAD_SECONDS : SCHEDULE_AHEAD_SECONDS;
}

// `onSchedule(windowStart, windowEnd, beatToContextTime)` is called every poll with the next
// window of beats to schedule; `onCancel()` is called whenever audio already scheduled ahead
// becomes invalid (stop, pause, seek) so the owner can silence it.
export function createTransport(audioContext, { onSchedule, onCancel } = {}) {
  let tempo = 120;
  let running = false;
  let startContextTime = 0;
  let startBeat = 0;
  let scheduledUpToBeat = 0;
  const ticker = createTicker(LOOKAHEAD_MS, () => poll());
  // Set while play() waits for a suspended AudioContext to actually start running.
  let pendingStart = null;
  let loop = { enabled: false, startBeat: 0, endBeat: 8 };

  function beatsToSeconds(beats) {
    return beats * (60 / tempo);
  }

  function loopIsValid() {
    return loop.enabled && loop.endBeat > loop.startBeat;
  }

  function isInsideLoop(beat) {
    return beat >= loop.startBeat && beat < loop.endBeat;
  }

  function rawPositionBeats() {
    if (!running) {
      return startBeat;
    }
    return startBeat + (audioContext.currentTime - startContextTime) * (tempo / 60);
  }

  function getPositionBeats() {
    const raw = rawPositionBeats();
    // Safety net for display/reads between poll() ticks: poll() is what actually re-anchors
    // startBeat/startContextTime at the exact wrap instant, but up to one LOOKAHEAD_MS after
    // truly crossing loop.endBeat, `raw` itself may still read slightly past it. Wrapping here
    // too keeps every reader (the UI playhead, pause()) seeing an already-in-range position.
    if (loopIsValid() && raw >= loop.endBeat) {
      const loopLength = loop.endBeat - loop.startBeat;
      return loop.startBeat + ((raw - loop.startBeat) % loopLength);
    }
    return raw;
  }

  function beatToContextTime(beat) {
    return startContextTime + beatsToSeconds(beat - startBeat);
  }

  // Re-anchors startBeat/startContextTime to a wrapped value, exactly once, the instant real
  // elapsed time actually crosses loop.endBeat (checked every poll, so within ~25ms of the
  // true crossing). Returns whether it did so. Deliberately keyed off *real* position, not
  // the scheduling lookahead below — using the lookahead here previously caused this to fire
  // ~100ms early, before real playback had actually reached the boundary, which corrupted
  // getPositionBeats() reads (and, worse, caused the scheduling window bookkeeping to mix
  // pre-wrap and post-wrap beat numbers and massively over-schedule notes near the seam).
  function catchUpPositionAnchor() {
    if (!loopIsValid()) {
      return false;
    }
    const real = rawPositionBeats();
    if (real < loop.endBeat) {
      return false;
    }
    const loopLength = loop.endBeat - loop.startBeat;
    const cyclesPassed = Math.floor((real - loop.startBeat) / loopLength);
    startBeat = real - cyclesPassed * loopLength;
    startContextTime = audioContext.currentTime;
    return true;
  }

  function poll() {
    if (catchUpPositionAnchor()) {
      // Real playback just crossed the loop end. Everything up to loop.endBeat was already
      // scheduled by previous ticks (each capped its window there — see below); pick up
      // scheduling from loop.startBeat using the anchor we just reset above.
      scheduledUpToBeat = loop.startBeat;
    }

    const horizonBeat = rawPositionBeats() + (scheduleAheadSeconds() * tempo) / 60;
    const windowStart = scheduledUpToBeat;
    // Cap each tick's window at the loop boundary rather than splitting/wrapping past it in
    // one call: the remainder beyond loop.endBeat gets scheduled on a later tick, once
    // catchUpPositionAnchor has actually reset the anchor for that next cycle. This costs a
    // little schedule-ahead buffer right at the seam (down to ~0ms instead of the usual
    // ~100ms) but keeps every window unambiguously in one consistent beat frame.
    const windowEnd = loopIsValid() ? Math.min(horizonBeat, loop.endBeat) : horizonBeat;

    onSchedule?.(windowStart, windowEnd, beatToContextTime);
    scheduledUpToBeat = windowEnd;
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
    scheduledUpToBeat = startBeat;
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
      startBeat = Math.max(0, beat);
      if (running) {
        onCancel?.();
        startContextTime = audioContext.currentTime;
        scheduledUpToBeat = startBeat;
      }
      bus.emit("transport:seek", { beat: startBeat });
    },
    setTempo(bpm) {
      if (bpm === tempo) {
        return;
      }
      if (running) {
        startBeat = getPositionBeats();
        startContextTime = audioContext.currentTime;
      }
      tempo = bpm;
      bus.emit("transport:tempo", { tempo });
    },
    getTempo() {
      return tempo;
    },
    setLoop(nextLoop) {
      loop = { ...loop, ...nextLoop };
      bus.emit("transport:loop", { loop });
    },
    getLoop() {
      return loop;
    },
    getPositionBeats,
    beatToContextTime,
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
