import {
  addTrack,
  removeTrack,
  renameTrack,
  addBlock,
  moveBlock,
  resizeBlock,
  moveBlockToTrack,
} from "../core/project.js";
import { getTransport } from "../core/transportController.js";
import { bus } from "../core/eventBus.js";
import { getSelectedTrack, getSelection, selectTrack, selectBlock, findBlock } from "../core/selection.js";
import { renderPianoRoll } from "./pianoRoll.js";
import { createTransportBar } from "./transportBar.js";
import { createBlockToolbar } from "./blockToolbar.js";

const MIN_PIXELS_PER_BEAT = 6;
const MAX_PIXELS_PER_BEAT = 160;
const MIN_TRACK_HEIGHT = 40;
const MAX_TRACK_HEIGHT = 160;
const DEFAULT_BLOCK_LENGTH_BARS = 1;
const MIN_VISIBLE_BARS = 32;
const PADDING_BARS = 8;
// Below this zoom, dragging snaps to whole beats instead of quarter beats.
const COARSE_SNAP_PIXELS_PER_BEAT = 20;
const MIN_BEAT_TICK_SPACING_PX = 10;
const MIN_NOTE_PREVIEW_RANGE = 12;
// Must match the header width baked into the `.timeline-track-header` CSS rule.
const TRACK_HEADER_WIDTH = 120;

// Module-level so zoom and the open piano roll survive full re-renders (undo/redo/import).
const view = { pixelsPerBeat: 40, trackHeight: 64 };
let pianoRollBlockId = null;

function rangeField(labelText, min, max, value) {
  const label = document.createElement("label");
  label.className = "transport-field";
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  label.appendChild(input);
  return { label, input };
}

// Miniature of a block's notes, positioned in % so it scales with the block for free.
function renderNotePreview(blockEl, block) {
  blockEl.querySelector(".timeline-block-notes")?.remove();
  const layer = document.createElement("div");
  layer.className = "timeline-block-notes";
  const visible = block.notes.filter((note) => note.startBeat < block.lengthBeats);
  if (visible.length > 0) {
    const pitches = visible.map((note) => note.note);
    let low = Math.min(...pitches);
    let high = Math.max(...pitches);
    const padding = Math.max(0, MIN_NOTE_PREVIEW_RANGE - (high - low)) / 2;
    low -= padding;
    high += padding;
    const rows = high - low + 1;
    for (const note of visible) {
      const bar = document.createElement("div");
      bar.className = "timeline-block-note";
      const end = Math.min(block.lengthBeats, note.startBeat + note.lengthBeats);
      bar.style.left = `${(note.startBeat / block.lengthBeats) * 100}%`;
      bar.style.width = `${((end - note.startBeat) / block.lengthBeats) * 100}%`;
      bar.style.top = `${((high - note.note) / rows) * 100}%`;
      bar.style.height = `${100 / rows}%`;
      layer.appendChild(bar);
    }
  }
  blockEl.prepend(layer);
}

export function renderTimeline(container, project) {
  const root = document.createElement("div");
  root.className = "timeline";
  container.appendChild(root);

  const transportBar = createTransportBar(project, {
    onLayoutChange: renderAll,
    onTransportAction: syncPlayhead,
  });

  const viewBar = document.createElement("div");
  viewBar.className = "timeline-view-bar";
  const addTrackButton = document.createElement("button");
  addTrackButton.type = "button";
  addTrackButton.textContent = "+ Track";
  const hZoom = rangeField("Zoom ↔", MIN_PIXELS_PER_BEAT, MAX_PIXELS_PER_BEAT, view.pixelsPerBeat);
  const vZoom = rangeField("Zoom ↕", MIN_TRACK_HEIGHT, MAX_TRACK_HEIGHT, view.trackHeight);
  viewBar.append(addTrackButton, hZoom.label, vZoom.label);

  const blockToolbar = createBlockToolbar(project, { onEditNotes: openPianoRoll });

  const scrollArea = document.createElement("div");
  scrollArea.className = "timeline-scroll";
  const grid = document.createElement("div");
  grid.className = "timeline-grid";
  const ruler = document.createElement("div");
  ruler.className = "timeline-ruler";
  ruler.title = "Click or drag to move the playhead";
  const tracksEl = document.createElement("div");
  tracksEl.className = "timeline-tracks";
  const loopRegion = document.createElement("div");
  loopRegion.className = "timeline-loop-region";
  const playhead = document.createElement("div");
  playhead.className = "timeline-playhead";
  playhead.style.left = `${TRACK_HEADER_WIDTH}px`;
  grid.append(ruler, tracksEl, loopRegion, playhead);
  scrollArea.appendChild(grid);

  const pianoRollPanel = document.createElement("div");
  pianoRollPanel.className = "piano-roll-panel";
  pianoRollPanel.hidden = true;

  root.append(transportBar.element, viewBar, blockToolbar.element, scrollArea, pianoRollPanel);

  function beatsPerBar() {
    return project.timeSignature.beatsPerBar;
  }

  function snapBeat(beat) {
    const resolution = view.pixelsPerBeat < COARSE_SNAP_PIXELS_PER_BEAT ? 1 : 0.25;
    return Math.round(beat / resolution) * resolution;
  }

  function visibleBars() {
    let lastBeat = 0;
    for (const track of project.tracks) {
      for (const block of track.blocks) {
        lastBeat = Math.max(lastBeat, block.startBeat + block.lengthBeats);
      }
    }
    lastBeat = Math.max(lastBeat, project.loop.endBeat);
    return Math.max(MIN_VISIBLE_BARS, Math.ceil(lastBeat / beatsPerBar()) + PADDING_BARS);
  }

  function totalWidth() {
    return visibleBars() * beatsPerBar() * view.pixelsPerBeat;
  }

  function beatFromClientX(clientX, element) {
    return Math.max(0, (clientX - element.getBoundingClientRect().left) / view.pixelsPerBeat);
  }

  // --- Piano roll -------------------------------------------------------------------------

  function closePianoRoll() {
    pianoRollBlockId = null;
    pianoRollPanel.hidden = true;
    pianoRollPanel.innerHTML = "";
  }

  function openPianoRoll(track, block) {
    selectBlock(track.id, block.id);
    showPianoRoll(track, block);
  }

  function showPianoRoll(track, block) {
    pianoRollBlockId = block.id;
    pianoRollPanel.innerHTML = "";
    pianoRollPanel.hidden = false;

    const header = document.createElement("div");
    header.className = "piano-roll-panel-header";
    const title = document.createElement("span");
    title.textContent = `${track.name} — block at bar ${Math.floor(block.startBeat / beatsPerBar()) + 1}`;
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", closePianoRoll);
    header.append(title, closeButton);

    const body = document.createElement("div");
    pianoRollPanel.append(header, body);
    renderPianoRoll(body, block, { beatsPerBar: beatsPerBar() });
  }

  // Re-opens on the same block id after anything that may have replaced the block object
  // (undo/redo, transpose) — or closes if that block no longer exists.
  function refreshPianoRoll() {
    if (!pianoRollBlockId) {
      return;
    }
    const found = findBlock(project, pianoRollBlockId);
    if (found) {
      showPianoRoll(found.track, found.block);
    } else {
      closePianoRoll();
    }
  }

  // --- Ruler, loop, playhead --------------------------------------------------------------

  function renderRuler() {
    ruler.innerHTML = "";
    ruler.style.width = `${totalWidth()}px`;
    const showBeatTicks = view.pixelsPerBeat >= MIN_BEAT_TICK_SPACING_PX;
    const bars = visibleBars();
    for (let bar = 0; bar < bars; bar += 1) {
      const mark = document.createElement("div");
      mark.className = "ruler-mark";
      mark.style.left = `${bar * beatsPerBar() * view.pixelsPerBeat}px`;
      mark.textContent = String(bar + 1);
      ruler.appendChild(mark);
      for (let beat = 1; showBeatTicks && beat < beatsPerBar(); beat += 1) {
        const tick = document.createElement("div");
        tick.className = "ruler-tick";
        tick.style.left = `${(bar * beatsPerBar() + beat) * view.pixelsPerBeat}px`;
        ruler.appendChild(tick);
      }
    }
  }

  function renderLoopRegion() {
    loopRegion.hidden = !project.loop.enabled;
    loopRegion.style.left = `${TRACK_HEADER_WIDTH + project.loop.startBeat * view.pixelsPerBeat}px`;
    loopRegion.style.width = `${(project.loop.endBeat - project.loop.startBeat) * view.pixelsPerBeat}px`;
    loopRegion.style.top = `${ruler.offsetHeight}px`;
    loopRegion.style.height = `${tracksEl.offsetHeight}px`;
  }

  function syncPlayhead() {
    const beat = getTransport().getPositionBeats();
    playhead.style.transform = `translateX(${beat * view.pixelsPerBeat}px)`;
    transportBar.setPosition(beat);
  }

  function seekToClientX(clientX) {
    getTransport().seek(snapBeat(beatFromClientX(clientX, ruler)));
    syncPlayhead();
  }

  ruler.addEventListener("pointerdown", (event) => {
    ruler.setPointerCapture(event.pointerId);
    seekToClientX(event.clientX);
    const onMove = (moveEvent) => seekToClientX(moveEvent.clientX);
    const onUp = () => {
      ruler.removeEventListener("pointermove", onMove);
      ruler.removeEventListener("pointerup", onUp);
    };
    ruler.addEventListener("pointermove", onMove);
    ruler.addEventListener("pointerup", onUp);
  });

  // --- Tracks and blocks ------------------------------------------------------------------

  // Selection only toggles classes on existing elements: rebuilding here would destroy the
  // element a drag is in progress on (selecting a block happens on its pointerdown).
  function highlightSelection() {
    const selection = getSelection();
    const selectedTrack = getSelectedTrack(project);
    tracksEl.querySelectorAll(".timeline-track-header").forEach((header) => {
      header.classList.toggle("timeline-track-header--selected", header.dataset.trackId === selectedTrack?.id);
    });
    tracksEl.querySelectorAll(".timeline-block").forEach((blockEl) => {
      blockEl.classList.toggle("timeline-block--selected", blockEl.dataset.blockId === selection.blockId);
    });
  }

  function startRename(nameSpan, track) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "timeline-track-rename";
    input.value = track.name;
    input.setAttribute("aria-label", "Track name");
    let done = false;
    const finish = (commit) => {
      if (done) {
        return;
      }
      done = true;
      if (commit) {
        renameTrack(track, input.value);
      }
      renderTracks();
      bus.emit("project:tracks-changed", {});
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        finish(true);
      } else if (event.key === "Escape") {
        finish(false);
      }
    });
    input.addEventListener("blur", () => finish(true));
    nameSpan.replaceWith(input);
    input.focus();
    input.select();
  }

  function renderBlock(lane, track, trackIndex, block) {
    const blockEl = document.createElement("div");
    blockEl.className = "timeline-block";
    blockEl.dataset.blockId = block.id;
    blockEl.style.left = `${block.startBeat * view.pixelsPerBeat}px`;
    blockEl.style.width = `${block.lengthBeats * view.pixelsPerBeat}px`;
    blockEl.title = "Drag to move · drag right edge to resize · double-click to edit notes";
    renderNotePreview(blockEl, block);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "timeline-block-resize";
    blockEl.appendChild(resizeHandle);

    blockEl.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      openPianoRoll(track, block);
    });

    blockEl.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      selectBlock(track.id, block.id);
      const isResize = event.target === resizeHandle;
      const startX = event.clientX;
      const startY = event.clientY;
      const startBeat = block.startBeat;
      const startLength = block.lengthBeats;
      let targetTrackIndex = trackIndex;
      blockEl.setPointerCapture(event.pointerId);
      blockEl.classList.add("timeline-block--dragging");

      function onMove(moveEvent) {
        const deltaBeats = (moveEvent.clientX - startX) / view.pixelsPerBeat;
        if (isResize) {
          resizeBlock(block, snapBeat(startLength + deltaBeats));
          blockEl.style.width = `${block.lengthBeats * view.pixelsPerBeat}px`;
          renderNotePreview(blockEl, block);
          return;
        }
        moveBlock(block, snapBeat(startBeat + deltaBeats));
        blockEl.style.left = `${block.startBeat * view.pixelsPerBeat}px`;
        // Moving to another track is only previewed (translateY) until release: re-parenting
        // the element mid-drag would drop its pointer capture.
        const rowDelta = Math.round((moveEvent.clientY - startY) / view.trackHeight);
        targetTrackIndex = Math.min(project.tracks.length - 1, Math.max(0, trackIndex + rowDelta));
        blockEl.style.transform = `translateY(${(targetTrackIndex - trackIndex) * view.trackHeight}px)`;
      }
      function onUp() {
        blockEl.removeEventListener("pointermove", onMove);
        blockEl.removeEventListener("pointerup", onUp);
        blockEl.removeEventListener("pointercancel", onUp);
        blockEl.classList.remove("timeline-block--dragging");
        if (targetTrackIndex !== trackIndex) {
          const targetTrack = project.tracks[targetTrackIndex];
          moveBlockToTrack(block, track, targetTrack);
          selectBlock(targetTrack.id, block.id);
        }
        // Rebuild only after a real change: rebuilding after a plain click would replace the
        // element between the two clicks of a double-click, and dblclick would never fire.
        const changed =
          targetTrackIndex !== trackIndex || block.startBeat !== startBeat || block.lengthBeats !== startLength;
        if (changed) {
          bus.emit("project:blocks-changed", {});
        }
      }
      blockEl.addEventListener("pointermove", onMove);
      blockEl.addEventListener("pointerup", onUp);
      blockEl.addEventListener("pointercancel", onUp);
    });

    lane.appendChild(blockEl);
  }

  function renderTrackRow(track, trackIndex) {
    const row = document.createElement("div");
    row.className = "timeline-row";
    row.style.height = `${view.trackHeight}px`;

    const header = document.createElement("div");
    header.className = "timeline-track-header";
    header.dataset.trackId = track.id;
    header.title = "Click to select (live input plays this track) · double-click the name to rename";
    header.addEventListener("click", () => selectTrack(track.id));

    const nameSpan = document.createElement("span");
    nameSpan.className = "timeline-track-name";
    nameSpan.textContent = track.name;
    nameSpan.addEventListener("dblclick", () => startRename(nameSpan, track));

    const removeTrackButton = document.createElement("button");
    removeTrackButton.type = "button";
    removeTrackButton.className = "timeline-track-remove";
    removeTrackButton.textContent = "×";
    removeTrackButton.title = "Remove track";
    removeTrackButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (track.blocks.length > 0 && !window.confirm(`Remove "${track.name}" and its blocks?`)) {
        return;
      }
      removeTrack(project, track.id);
      renderTracks();
      bus.emit("project:tracks-changed", {});
    });
    header.append(nameSpan, removeTrackButton);

    const lane = document.createElement("div");
    lane.className = "timeline-lane";
    lane.style.width = `${totalWidth()}px`;
    lane.style.setProperty("--bar-px", `${beatsPerBar() * view.pixelsPerBeat}px`);
    lane.style.setProperty("--beat-px", `${view.pixelsPerBeat}px`);
    lane.addEventListener("click", (event) => {
      if (event.target === lane) {
        selectTrack(track.id);
      }
    });
    lane.addEventListener("dblclick", (event) => {
      if (event.target !== lane) {
        return;
      }
      const lengthBeats = DEFAULT_BLOCK_LENGTH_BARS * beatsPerBar();
      const startBeat = Math.floor(beatFromClientX(event.clientX, lane) / beatsPerBar()) * beatsPerBar();
      const block = addBlock(track, { startBeat, lengthBeats });
      selectBlock(track.id, block.id);
      renderTracks();
    });

    for (const block of track.blocks) {
      renderBlock(lane, track, trackIndex, block);
    }

    row.append(header, lane);
    return row;
  }

  function renderTracks() {
    tracksEl.innerHTML = "";
    project.tracks.forEach((track, index) => tracksEl.appendChild(renderTrackRow(track, index)));
    playhead.style.top = `${ruler.offsetHeight}px`;
    playhead.style.height = `${tracksEl.offsetHeight}px`;
    highlightSelection();
    renderLoopRegion();
  }

  function renderAll() {
    renderRuler();
    renderTracks();
    syncPlayhead();
  }

  addTrackButton.addEventListener("click", () => {
    const track = addTrack(project);
    selectTrack(track.id);
    renderAll();
    bus.emit("project:tracks-changed", {});
  });
  hZoom.input.addEventListener("input", () => {
    view.pixelsPerBeat = Number(hZoom.input.value);
    renderAll();
  });
  vZoom.input.addEventListener("input", () => {
    view.trackHeight = Number(vZoom.input.value);
    renderTracks();
  });

  let animationFrame = 0;
  function updatePlayheadLoop() {
    syncPlayhead();
    animationFrame = requestAnimationFrame(updatePlayheadLoop);
  }

  const unsubscribers = [
    bus.on("selection:changed", highlightSelection),
    bus.on("project:blocks-changed", () => {
      renderAll();
      refreshPianoRoll();
    }),
    bus.on("block:notes-changed", ({ blockId }) => {
      const found = findBlock(project, blockId);
      const blockEl = tracksEl.querySelector(`[data-block-id="${blockId}"]`);
      if (found && blockEl) {
        renderNotePreview(blockEl, found.block);
      }
    }),
    bus.on("transport:seek", syncPlayhead),
  ];

  renderAll();
  refreshPianoRoll();
  animationFrame = requestAnimationFrame(updatePlayheadLoop);

  return () => {
    cancelAnimationFrame(animationFrame);
    transportBar.dispose();
    blockToolbar.dispose();
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}
