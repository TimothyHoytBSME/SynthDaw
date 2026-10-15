// A steady timer that keeps ticking in a background tab. Chrome throttles page timers in a
// hidden tab to once a second (and to once a minute after five minutes), which starves a
// lookahead scheduler; timers inside a Web Worker aren't throttled that way, so the interval
// runs in a tiny inline worker and each tick is posted back. Falls back to setTimeout where
// workers or blob URLs aren't available.
const WORKER_SOURCE = `
  let timer = null;
  onmessage = ({ data }) => {
    clearInterval(timer);
    timer = null;
    if (data.command === "start") {
      timer = setInterval(() => postMessage("tick"), data.intervalMs);
    }
  };
`;

function createWorker() {
  try {
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
  } catch {
    return null;
  }
}

// `createTicker(intervalMs, onTick)` -> `{ start(), stop() }`. Ticks only arrive between
// start() and stop(); start() while running restarts the interval.
export function createTicker(intervalMs, onTick) {
  const worker = createWorker();
  let running = false;
  let fallbackTimer = null;

  if (worker) {
    worker.onmessage = () => {
      if (running) {
        onTick();
      }
    };
  }

  function fallbackLoop() {
    if (!running) {
      return;
    }
    onTick();
    fallbackTimer = setTimeout(fallbackLoop, intervalMs);
  }

  return {
    start() {
      running = true;
      if (worker) {
        worker.postMessage({ command: "start", intervalMs });
      } else {
        clearTimeout(fallbackTimer);
        fallbackTimer = setTimeout(fallbackLoop, intervalMs);
      }
    },
    stop() {
      running = false;
      if (worker) {
        worker.postMessage({ command: "stop" });
      } else {
        clearTimeout(fallbackTimer);
      }
    },
    usesWorker: worker !== null,
  };
}
