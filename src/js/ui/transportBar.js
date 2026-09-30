import { setLoopEnabled, setLoopRange, setTempo, setBeatsPerBar, MIN_TEMPO, MAX_TEMPO } from "../core/project.js";
import { getTransport, setMetronomeEnabled, isMetronomeEnabled } from "../core/transportController.js";
import { bus } from "../core/eventBus.js";
import { getAudioState } from "../audio/audioEngine.js";
import { createLevelMeter } from "./levelMeter.js";
import {
  startRecording,
  stopRecording,
  isRecording,
  setQuantizeTakes,
  isQuantizingTakes,
} from "../core/recorder.js";

const AUDIO_BLOCKED_HINT_DELAY_MS = 1000;

function button(label, title) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.title = title;
  return element;
}

function numberField(labelText, { min, max, step, value }) {
  const label = document.createElement("label");
  label.className = "transport-field";
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  if (max !== undefined) {
    input.max = String(max);
  }
  input.step = String(step);
  input.value = String(value);
  label.appendChild(input);
  return { label, input };
}

export function checkboxField(labelText, checked) {
  const label = document.createElement("label");
  label.className = "transport-field";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  label.append(input, ` ${labelText}`);
  return { label, input };
}

export function formatPosition(beat, beatsPerBar) {
  const bar = Math.floor(beat / beatsPerBar) + 1;
  const beatInBar = Math.floor(beat % beatsPerBar) + 1;
  return `${bar}.${beatInBar}`;
}

// Transport + global timing controls. `onLayoutChange` is called after edits that change how
// the timeline must be drawn (beats-per-bar, loop range). `onTransportAction` after play/pause/
// stop, so the timeline can sync its playhead immediately.
// Returns `{ element, setPosition, dispose }`.
export function createTransportBar(project, { onLayoutChange, onTransportAction }) {
  const bar = document.createElement("div");
  bar.className = "transport-bar";

  const playButton = button("▶ Play", "Play (Space)");
  const pauseButton = button("⏸ Pause", "Pause (Space)");
  const stopButton = button("⏹ Stop", "Stop and rewind");
  const recordButton = button("● Rec", "Record live MIDI/keyboard input onto the selected track");
  recordButton.classList.add("transport-record");
  const quantize = checkboxField("Quantize", isQuantizingTakes());
  quantize.label.title = "Snap recorded notes to 1/4 beat";
  quantize.input.addEventListener("change", () => setQuantizeTakes(quantize.input.checked));

  function showRecording() {
    recordButton.classList.toggle("transport-record--active", isRecording());
    recordButton.textContent = isRecording() ? "■ Stop rec" : "● Rec";
  }
  recordButton.addEventListener("click", () => {
    if (isRecording()) {
      stopRecording();
    } else {
      startRecording();
    }
    onTransportAction();
  });
  const unsubscribers = [
    bus.on("recorder:changed", showRecording),
    bus.on("audio:state", showAudioState),
    // Normally invisible: Play already counts as the click that unlocks audio. This only shows
    // if the browser still refuses to start audio (e.g. play triggered without any gesture).
    bus.on("transport:waiting-for-audio", () => {
      setTimeout(() => {
        if (getTransport().isWaitingForAudio()) {
          bus.emit("status:message", { text: "Audio is blocked by the browser. Click anywhere on the page to enable it." });
        }
      }, AUDIO_BLOCKED_HINT_DELAY_MS);
    }),
  ];
  showRecording();

  // Only visible when audio exists but isn't running, so a browser block is never silent.
  const audioStatus = document.createElement("span");
  audioStatus.className = "transport-audio-status";
  audioStatus.setAttribute("role", "status");
  audioStatus.textContent = "🔇 Audio is paused by the browser. Click anywhere to enable it.";
  function showAudioState() {
    const state = getAudioState();
    audioStatus.hidden = state === "running" || state === "not-started";
  }
  showAudioState();

  const levelMeter = createLevelMeter();

  const position = document.createElement("output");
  position.className = "transport-position";
  position.title = "Position (bar.beat)";

  const tempo = numberField("Tempo", { min: MIN_TEMPO, max: MAX_TEMPO, step: 1, value: project.tempo });
  const beatsPerBar = numberField("Beats/bar", {
    min: 1,
    max: 16,
    step: 1,
    value: project.timeSignature.beatsPerBar,
  });
  const metronome = checkboxField("Metronome", isMetronomeEnabled());

  const loop = checkboxField("Loop", project.loop.enabled);
  const loopStart = document.createElement("input");
  const loopEnd = document.createElement("input");
  for (const [input, value, min] of [
    [loopStart, project.loop.startBeat, 0],
    [loopEnd, project.loop.endBeat, 0.25],
  ]) {
    input.type = "number";
    input.min = String(min);
    input.step = "0.25";
    input.value = String(value);
    input.className = "loop-range-input";
  }
  loopStart.setAttribute("aria-label", "Loop start (beats)");
  loopEnd.setAttribute("aria-label", "Loop end (beats)");
  loop.label.append(loopStart, "–", loopEnd);

  playButton.addEventListener("click", () => {
    getTransport().play();
    onTransportAction();
  });
  pauseButton.addEventListener("click", () => {
    getTransport().pause();
    onTransportAction();
  });
  stopButton.addEventListener("click", () => {
    getTransport().stop();
    onTransportAction();
  });
  tempo.input.addEventListener("change", () => {
    setTempo(project, Number(tempo.input.value) || project.tempo);
    tempo.input.value = String(project.tempo);
  });
  beatsPerBar.input.addEventListener("change", () => {
    setBeatsPerBar(project, Number(beatsPerBar.input.value) || project.timeSignature.beatsPerBar);
    beatsPerBar.input.value = String(project.timeSignature.beatsPerBar);
    onLayoutChange();
  });
  metronome.input.addEventListener("change", () => setMetronomeEnabled(metronome.input.checked));
  loop.input.addEventListener("change", () => {
    setLoopEnabled(project, loop.input.checked);
    onLayoutChange();
  });
  loopStart.addEventListener("change", () => {
    setLoopRange(project, Number(loopStart.value) || 0, project.loop.endBeat);
    loopStart.value = String(project.loop.startBeat);
    loopEnd.value = String(project.loop.endBeat);
    onLayoutChange();
  });
  loopEnd.addEventListener("change", () => {
    setLoopRange(project, project.loop.startBeat, Number(loopEnd.value) || project.loop.endBeat);
    loopEnd.value = String(project.loop.endBeat);
    onLayoutChange();
  });

  bar.append(
    playButton,
    pauseButton,
    stopButton,
    recordButton,
    quantize.label,
    position,
    levelMeter.element,
    tempo.label,
    beatsPerBar.label,
    metronome.label,
    loop.label,
    audioStatus,
  );

  return {
    element: bar,
    setPosition(beat) {
      position.textContent = formatPosition(beat, project.timeSignature.beatsPerBar);
    },
    dispose() {
      levelMeter.dispose();
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    },
  };
}
