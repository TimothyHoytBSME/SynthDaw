import { getMasterAnalysers } from "../audio/audioEngine.js";

const FLOOR_DB = -48;
const CEILING_DB = 3;
const PEAK_HOLD_MS = 1000;
const PEAK_FALL_DB_PER_SECOND = 20;
const CLIP_HOLD_MS = 2000;
const WIDTH = 96;
const BAR_HEIGHT = 5;
const BAR_GAP = 2;
const ZONES = [
  { fromDb: FLOOR_DB, color: "#3fbf6f" },
  { fromDb: -12, color: "#d8c24a" },
  { fromDb: -3, color: "#e0553f" },
];

function xForDb(db) {
  const clamped = Math.min(CEILING_DB, Math.max(FLOOR_DB, db));
  return ((clamped - FLOOR_DB) / (CEILING_DB - FLOOR_DB)) * WIDTH;
}

// The hold marker stays put for PEAK_HOLD_MS, then falls at a steady rate.
function heldMarkerDb(channel, now) {
  const fallingFor = Math.max(0, now - channel.heldAt - PEAK_HOLD_MS);
  return channel.heldDb - (fallingFor / 1000) * PEAK_FALL_DB_PER_SECOND;
}

function peakDb(analyser, samples) {
  analyser.getFloatTimeDomainData(samples);
  let peak = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }
  return { peak, db: peak > 0 ? 20 * Math.log10(peak) : -Infinity };
}

// Stereo peak meter for the master output, with peak hold and a clip light (click to reset).
// Runs its own rAF loop but does no work until audio has started. Returns `{ element, dispose }`.
export function createLevelMeter() {
  const element = document.createElement("div");
  element.className = "level-meter";
  element.title = "Master output peak level (-48 to +3 dBFS). The light turns red on clipping; click to reset.";

  const canvas = document.createElement("canvas");
  const scale = window.devicePixelRatio || 1;
  const height = BAR_HEIGHT * 2 + BAR_GAP;
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  canvas.style.width = `${WIDTH}px`;
  canvas.style.height = `${height}px`;
  const context2d = canvas.getContext("2d");
  context2d.scale(scale, scale);

  const clipLight = document.createElement("span");
  clipLight.className = "level-meter-clip";
  element.append(canvas, clipLight);

  const channels = [0, 1].map(() => ({ heldDb: -Infinity, heldAt: 0 }));
  let clippedAt = -Infinity;
  let samples = null;
  let frame = 0;

  element.addEventListener("click", () => {
    clippedAt = -Infinity;
    clipLight.classList.remove("level-meter-clip--on");
  });

  function drawBar(y, db, heldDb) {
    const levelX = xForDb(db);
    ZONES.forEach((zone, index) => {
      const start = xForDb(zone.fromDb);
      const end = Math.min(levelX, index + 1 < ZONES.length ? xForDb(ZONES[index + 1].fromDb) : WIDTH);
      if (end > start) {
        context2d.fillStyle = zone.color;
        context2d.fillRect(start, y, end - start, BAR_HEIGHT);
      }
    });
    if (heldDb > FLOOR_DB) {
      context2d.fillStyle = "#e8e8ec";
      context2d.fillRect(Math.min(WIDTH - 1, xForDb(heldDb)), y, 1, BAR_HEIGHT);
    }
  }

  function draw(now) {
    frame = requestAnimationFrame(draw);
    const analysers = getMasterAnalysers();
    context2d.clearRect(0, 0, WIDTH, height);
    context2d.fillStyle = "#101216";
    context2d.fillRect(0, 0, WIDTH, height);
    // 0 dBFS mark
    context2d.fillStyle = "#3a3d46";
    context2d.fillRect(xForDb(0), 0, 1, height);
    if (!analysers) {
      return;
    }
    samples ??= new Float32Array(analysers[0].fftSize);
    analysers.forEach((analyser, index) => {
      const { peak, db } = peakDb(analyser, samples);
      const channel = channels[index];
      if (peak >= 1) {
        clippedAt = now;
      }
      if (db >= heldMarkerDb(channel, now)) {
        channel.heldDb = db;
        channel.heldAt = now;
      }
      drawBar(index * (BAR_HEIGHT + BAR_GAP), db, heldMarkerDb(channel, now));
    });
    clipLight.classList.toggle("level-meter-clip--on", now - clippedAt < CLIP_HOLD_MS);
  }
  frame = requestAnimationFrame(draw);

  return { element, dispose: () => cancelAnimationFrame(frame) };
}
