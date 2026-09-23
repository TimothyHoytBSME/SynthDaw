import {
  addTrack,
  removeTrack,
  addBlock,
  removeBlock,
  moveBlock,
  resizeBlock,
  setLoopEnabled,
  setLoopRange,
  setTempo,
  setBeatsPerBar,
} from "../core/project.js";
import { getTransport, setMetronomeEnabled, isMetronomeEnabled } from "../core/transportController.js";
import { renderPianoRoll } from "./pianoRoll.js";
import { bus } from "../core/eventBus.js";

const MIN_PIXELS_PER_BEAT = 10;
const MAX_PIXELS_PER_BEAT = 120;
const MIN_TRACK_HEIGHT = 40;
const MAX_TRACK_HEIGHT = 120;
const DEFAULT_BLOCK_LENGTH_BEATS = 4;
const VISIBLE_BARS = 32;
// Must match the header width baked into the `.timeline-track-header` CSS rule.
const TRACK_HEADER_WIDTH = 120;

export function renderTimeline(container, project) {
  let pixelsPerBeat = 40;
  let trackHeight = 64;

  const root = document.createElement("div");
  root.className = "timeline";
  container.appendChild(root);

  const transportBar = document.createElement("div");
  transportBar.className = "transport-bar";
  root.appendChild(transportBar);

  const playButton = document.createElement("button");
  playButton.type = "button";
  playButton.textContent = "▶ Play";

  const pauseButton = document.createElement("button");
  pauseButton.type = "button";
  pauseButton.textContent = "⏸ Pause";

  const stopButton = document.createElement("button");
  stopButton.type = "button";
  stopButton.textContent = "⏹ Stop";

  const tempoLabel = document.createElement("label");
  tempoLabel.className = "transport-field";
  tempoLabel.textContent = "Tempo";
  const tempoInput = document.createElement("input");
  tempoInput.type = "number";
  tempoInput.min = "20";
  tempoInput.max = "300";
  tempoInput.value = String(project.tempo);
  tempoLabel.appendChild(tempoInput);

  const beatsPerBarLabel = document.createElement("label");
  beatsPerBarLabel.className = "transport-field";
  beatsPerBarLabel.textContent = "Beats/bar";
  const beatsPerBarInput = document.createElement("input");
  beatsPerBarInput.type = "number";
  beatsPerBarInput.min = "1";
  beatsPerBarInput.max = "16";
  beatsPerBarInput.value = String(project.timeSignature.beatsPerBar);
  beatsPerBarLabel.appendChild(beatsPerBarInput);

  const metronomeLabel = document.createElement("label");
  metronomeLabel.className = "transport-field";
  const metronomeCheckbox = document.createElement("input");
  metronomeCheckbox.type = "checkbox";
  metronomeCheckbox.checked = isMetronomeEnabled();
  metronomeLabel.appendChild(metronomeCheckbox);
  metronomeLabel.appendChild(document.createTextNode(" Metronome"));

  const hZoomLabel = document.createElement("label");
  hZoomLabel.className = "transport-field";
  hZoomLabel.textContent = "Zoom ↔";
  const hZoomInput = document.createElement("input");
  hZoomInput.type = "range";
  hZoomInput.min = String(MIN_PIXELS_PER_BEAT);
  hZoomInput.max = String(MAX_PIXELS_PER_BEAT);
  hZoomInput.value = String(pixelsPerBeat);
  hZoomLabel.appendChild(hZoomInput);

  const vZoomLabel = document.createElement("label");
  vZoomLabel.className = "transport-field";
  vZoomLabel.textContent = "Zoom ↕";
  const vZoomInput = document.createElement("input");
  vZoomInput.type = "range";
  vZoomInput.min = String(MIN_TRACK_HEIGHT);
  vZoomInput.max = String(MAX_TRACK_HEIGHT);
  vZoomInput.value = String(trackHeight);
  vZoomLabel.appendChild(vZoomInput);

  const loopLabel = document.createElement("label");
  loopLabel.className = "transport-field";
  const loopCheckbox = document.createElement("input");
  loopCheckbox.type = "checkbox";
  loopCheckbox.checked = project.loop.enabled;
  loopLabel.append(loopCheckbox, " Loop");

  const loopStartInput = document.createElement("input");
  loopStartInput.type = "number";
  loopStartInput.min = "0";
  loopStartInput.step = "0.25";
  loopStartInput.value = String(project.loop.startBeat);
  loopStartInput.className = "loop-range-input";

  const loopEndInput = document.createElement("input");
  loopEndInput.type = "number";
  loopEndInput.min = "0.25";
  loopEndInput.step = "0.25";
  loopEndInput.value = String(project.loop.endBeat);
  loopEndInput.className = "loop-range-input";

  loopLabel.append(loopStartInput, "–", loopEndInput);

  const addTrackButton = document.createElement("button");
  addTrackButton.type = "button";
  addTrackButton.textContent = "+ Track";

  transportBar.append(
    playButton,
    pauseButton,
    stopButton,
    tempoLabel,
    beatsPerBarLabel,
    metronomeLabel,
    loopLabel,
    hZoomLabel,
    vZoomLabel,
    addTrackButton,
  );

  const scrollArea = document.createElement("div");
  scrollArea.className = "timeline-scroll";
  root.appendChild(scrollArea);

  const grid = document.createElement("div");
  grid.className = "timeline-grid";
  scrollArea.appendChild(grid);

  const ruler = document.createElement("div");
  ruler.className = "timeline-ruler";
  grid.appendChild(ruler);

  const tracksEl = document.createElement("div");
  tracksEl.className = "timeline-tracks";
  grid.appendChild(tracksEl);

  const loopRegion = document.createElement("div");
  loopRegion.className = "timeline-loop-region";
  loopRegion.style.left = `${TRACK_HEADER_WIDTH}px`;
  grid.appendChild(loopRegion);

  const playhead = document.createElement("div");
  playhead.className = "timeline-playhead";
  playhead.style.left = `${TRACK_HEADER_WIDTH}px`;
  grid.appendChild(playhead);

  function renderLoopRegion() {
    loopRegion.hidden = !project.loop.enabled;
    loopRegion.style.transform = `translateX(${project.loop.startBeat * pixelsPerBeat}px)`;
    loopRegion.style.width = `${(project.loop.endBeat - project.loop.startBeat) * pixelsPerBeat}px`;
    loopRegion.style.top = `${ruler.offsetHeight}px`;
    loopRegion.style.height = `${tracksEl.offsetHeight}px`;
  }


  const pianoRollPanel = document.createElement("div");
  pianoRollPanel.className = "piano-roll-panel";
  pianoRollPanel.hidden = true;
  root.appendChild(pianoRollPanel);

  function openPianoRoll(track, block) {
    pianoRollPanel.innerHTML = "";
    pianoRollPanel.hidden = false;

    const header = document.createElement("div");
    header.className = "piano-roll-panel-header";

    const title = document.createElement("span");
    title.textContent = `${track.name} — block @ beat ${block.startBeat}`;
    header.appendChild(title);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", () => {
      pianoRollPanel.hidden = true;
      pianoRollPanel.innerHTML = "";
    });
    header.appendChild(closeButton);

    const body = document.createElement("div");
    pianoRollPanel.append(header, body);
    renderPianoRoll(body, block);
  }

  function updatePlayheadExtent() {
    playhead.style.top = `${ruler.offsetHeight}px`;
    playhead.style.height = `${tracksEl.offsetHeight}px`;
  }

  function totalWidth() {
    return VISIBLE_BARS * project.timeSignature.beatsPerBar * pixelsPerBeat;
  }

  function renderRuler() {
    ruler.innerHTML = "";
    ruler.style.width = `${totalWidth()}px`;
    const beatsPerBar = project.timeSignature.beatsPerBar;
    for (let bar = 0; bar < VISIBLE_BARS; bar += 1) {
      const mark = document.createElement("div");
      mark.className = "ruler-mark";
      mark.style.left = `${bar * beatsPerBar * pixelsPerBeat}px`;
      mark.textContent = String(bar + 1);
      ruler.appendChild(mark);
    }
  }

  function beatFromClientX(clientX, laneEl) {
    const rect = laneEl.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, x / pixelsPerBeat);
  }

  function snapBeat(beat) {
    return Math.round(beat * 4) / 4;
  }

  function renderBlock(lane, track, block) {
    const blockEl = document.createElement("div");
    blockEl.className = "timeline-block";
    blockEl.style.left = `${block.startBeat * pixelsPerBeat}px`;
    blockEl.style.width = `${block.lengthBeats * pixelsPerBeat}px`;
    blockEl.title = `${track.name} block: ${block.lengthBeats} beats, ${block.notes.length} note(s) — double-click to edit`;

    blockEl.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      openPianoRoll(track, block);
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "timeline-block-remove";
    removeButton.textContent = "×";
    removeButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      removeBlock(track, block.id);
      renderTracks();
    });
    blockEl.appendChild(removeButton);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "timeline-block-resize";
    blockEl.appendChild(resizeHandle);

    blockEl.addEventListener("pointerdown", (event) => {
      if (event.target === removeButton) {
        return;
      }
      event.stopPropagation();
      const isResize = event.target === resizeHandle;
      const startClientX = event.clientX;
      const startBeat = block.startBeat;
      const startLength = block.lengthBeats;
      blockEl.setPointerCapture(event.pointerId);

      function onMove(moveEvent) {
        const deltaBeats = (moveEvent.clientX - startClientX) / pixelsPerBeat;
        if (isResize) {
          resizeBlock(block, snapBeat(startLength + deltaBeats));
          blockEl.style.width = `${block.lengthBeats * pixelsPerBeat}px`;
        } else {
          moveBlock(block, snapBeat(startBeat + deltaBeats));
          blockEl.style.left = `${block.startBeat * pixelsPerBeat}px`;
        }
      }
      function onUp() {
        blockEl.releasePointerCapture(event.pointerId);
        blockEl.removeEventListener("pointermove", onMove);
        blockEl.removeEventListener("pointerup", onUp);
      }
      blockEl.addEventListener("pointermove", onMove);
      blockEl.addEventListener("pointerup", onUp);
    });

    lane.appendChild(blockEl);
  }

  function renderTracks() {
    tracksEl.innerHTML = "";
    for (const track of project.tracks) {
      const row = document.createElement("div");
      row.className = "timeline-row";
      row.style.height = `${trackHeight}px`;

      const header = document.createElement("div");
      header.className = "timeline-track-header";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = track.name;
      header.appendChild(nameSpan);

      const removeTrackButton = document.createElement("button");
      removeTrackButton.type = "button";
      removeTrackButton.className = "timeline-track-remove";
      removeTrackButton.textContent = "×";
      removeTrackButton.addEventListener("click", () => {
        removeTrack(project, track.id);
        renderTracks();
        bus.emit("project:tracks-changed", {});
      });
      header.appendChild(removeTrackButton);

      row.appendChild(header);

      const lane = document.createElement("div");
      lane.className = "timeline-lane";
      lane.style.width = `${totalWidth()}px`;

      lane.addEventListener("click", (event) => {
        if (event.target !== lane) {
          return;
        }
        const beat = snapBeat(beatFromClientX(event.clientX, lane));
        addBlock(track, { startBeat: beat, lengthBeats: DEFAULT_BLOCK_LENGTH_BEATS });
        renderTracks();
      });

      for (const block of track.blocks) {
        renderBlock(lane, track, block);
      }

      row.appendChild(lane);
      tracksEl.appendChild(row);
    }
    updatePlayheadExtent();
    renderLoopRegion();
  }

  function syncPlayhead() {
    const beat = getTransport().getPositionBeats();
    playhead.style.transform = `translateX(${beat * pixelsPerBeat}px)`;
  }

  let animationFrame = 0;
  function updatePlayheadLoop() {
    syncPlayhead();
    animationFrame = requestAnimationFrame(updatePlayheadLoop);
  }

  playButton.addEventListener("click", () => {
    getTransport().play();
    syncPlayhead();
  });
  pauseButton.addEventListener("click", () => {
    getTransport().pause();
    syncPlayhead();
  });
  stopButton.addEventListener("click", () => {
    getTransport().stop();
    syncPlayhead();
  });
  tempoInput.addEventListener("change", () => {
    setTempo(project, Number(tempoInput.value) || project.tempo);
    tempoInput.value = String(project.tempo);
  });
  beatsPerBarInput.addEventListener("change", () => {
    setBeatsPerBar(project, Number(beatsPerBarInput.value) || project.timeSignature.beatsPerBar);
    beatsPerBarInput.value = String(project.timeSignature.beatsPerBar);
    renderRuler();
    renderTracks();
  });
  metronomeCheckbox.addEventListener("change", () => {
    setMetronomeEnabled(metronomeCheckbox.checked);
  });
  loopCheckbox.addEventListener("change", () => {
    setLoopEnabled(project, loopCheckbox.checked);
    renderLoopRegion();
  });
  loopStartInput.addEventListener("input", () => {
    setLoopRange(project, Number(loopStartInput.value) || 0, project.loop.endBeat);
    loopStartInput.value = String(project.loop.startBeat);
    renderLoopRegion();
  });
  loopEndInput.addEventListener("input", () => {
    setLoopRange(project, project.loop.startBeat, Number(loopEndInput.value) || project.loop.endBeat);
    loopEndInput.value = String(project.loop.endBeat);
    renderLoopRegion();
  });
  hZoomInput.addEventListener("input", () => {
    pixelsPerBeat = Number(hZoomInput.value);
    renderRuler();
    renderTracks();
    syncPlayhead();
  });
  vZoomInput.addEventListener("input", () => {
    trackHeight = Number(vZoomInput.value);
    renderTracks();
  });
  addTrackButton.addEventListener("click", () => {
    addTrack(project);
    renderTracks();
    bus.emit("project:tracks-changed", {});
  });

  renderRuler();
  renderTracks();
  syncPlayhead();
  renderLoopRegion();
  animationFrame = requestAnimationFrame(updatePlayheadLoop);

  return () => cancelAnimationFrame(animationFrame);
}
