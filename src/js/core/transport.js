import { bus } from "./eventBus.js";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;

export function createTransport(audioContext, { onClick } = {}) {
  let tempo = 120;
  let running = false;
  let startContextTime = 0;
  let startBeat = 0;
  let nextClickBeat = 0;
  let schedulerTimer = null;

  function beatsToSeconds(beats) {
    return beats * (60 / tempo);
  }

  function getPositionBeats() {
    if (!running) {
      return startBeat;
    }
    return startBeat + (audioContext.currentTime - startContextTime) * (tempo / 60);
  }

  function beatToContextTime(beat) {
    return startContextTime + beatsToSeconds(beat - startBeat);
  }

  function scheduleClicks() {
    const horizonBeat = getPositionBeats() + (SCHEDULE_AHEAD_SECONDS * tempo) / 60;
    while (nextClickBeat < horizonBeat) {
      onClick?.(nextClickBeat, beatToContextTime(nextClickBeat));
      nextClickBeat += 1;
    }
    schedulerTimer = setTimeout(scheduleClicks, LOOKAHEAD_MS);
  }

  return {
    play() {
      if (running) {
        return;
      }
      running = true;
      startContextTime = audioContext.currentTime;
      nextClickBeat = Math.ceil(startBeat - 1e-9);
      scheduleClicks();
      bus.emit("transport:play", {});
    },
    pause() {
      if (!running) {
        return;
      }
      startBeat = getPositionBeats();
      running = false;
      clearTimeout(schedulerTimer);
      bus.emit("transport:pause", {});
    },
    stop() {
      running = false;
      clearTimeout(schedulerTimer);
      startBeat = 0;
      bus.emit("transport:stop", {});
    },
    setTempo(bpm) {
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
    getPositionBeats,
    isRunning() {
      return running;
    },
  };
}
