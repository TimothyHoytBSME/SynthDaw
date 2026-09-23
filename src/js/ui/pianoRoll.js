import { bus } from "../core/eventBus.js";
import {
  addNote,
  removeNote,
  moveNote,
  resizeNote,
  setNotePitch,
  setNoteVelocity,
  LOWEST_NOTE,
  HIGHEST_NOTE,
} from "../core/project.js";

// Must match the row period used by `.piano-roll-grid`/`.piano-roll-key` in main.css.
const ROW_HEIGHT = 20;
const VELOCITY_LANE_HEIGHT = 64;
const MIN_PIXELS_PER_BEAT = 20;
const MAX_PIXELS_PER_BEAT = 240;
const MIN_VELOCITY_BAR_WIDTH = 8;
const DEFAULT_VELOCITY = 100;
const PREVIEW_DURATION_MS = 150;
const DEFAULT_CENTER_NOTE = 60; // C4
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SNAP_OPTIONS = [
  { label: "1 beat", value: 1 },
  { label: "1/2", value: 0.5 },
  { label: "1/4", value: 0.25 },
  { label: "1/8", value: 0.125 },
  { label: "1/16", value: 0.0625 },
];
const ROW_COUNT = HIGHEST_NOTE - LOWEST_NOTE + 1;

// Module-level so zoom/snap/new-note length persist across re-renders and between blocks.
const settings = { pixelsPerBeat: 60, snap: 0.25, lastLength: 1 };

export function noteLabel(note) {
  return `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
}

function isBlackKey(note) {
  return NOTE_NAMES[note % 12].includes("#");
}

function startPreview(note) {
  bus.emit("note:on", { note, velocity: DEFAULT_VELOCITY, source: "piano-roll" });
}

function stopPreview(note) {
  bus.emit("note:off", { note, source: "piano-roll" });
}

function previewNote(note) {
  startPreview(note);
  setTimeout(() => stopPreview(note), PREVIEW_DURATION_MS);
}

// Horizontal stripes for black-key rows, as one 12-row gradient period aligned to the top
// row (HIGHEST_NOTE), so the grid needs no per-row elements.
function blackKeyGradient() {
  const stops = [];
  for (let row = 0; row < 12; row += 1) {
    const color = isBlackKey(HIGHEST_NOTE - row) ? "#15171c" : "transparent";
    stops.push(`${color} ${row * ROW_HEIGHT}px ${(row + 1) * ROW_HEIGHT}px`);
  }
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
}

export function renderPianoRoll(container, block, { beatsPerBar = 4 } = {}) {
  const previousScroll = container.querySelector(".piano-roll-main");
  const restoreScroll = previousScroll && { top: previousScroll.scrollTop, left: previousScroll.scrollLeft };
  container.innerHTML = "";

  const ppb = () => settings.pixelsPerBeat;
  const snap = (beat) => Math.round(beat / settings.snap) * settings.snap;
  const lastNoteEnd = Math.max(0, ...block.notes.map((note) => note.startBeat + note.lengthBeats));
  const contentBeats = Math.max(block.lengthBeats, lastNoteEnd);

  function rerender() {
    bus.emit("block:notes-changed", { blockId: block.id });
    renderPianoRoll(container, block, { beatsPerBar });
  }

  // --- Toolbar ----------------------------------------------------------------------------

  const toolbar = document.createElement("div");
  toolbar.className = "piano-roll-toolbar";

  const zoomLabel = document.createElement("label");
  zoomLabel.className = "transport-field";
  zoomLabel.textContent = "Zoom ↔";
  const zoomInput = document.createElement("input");
  zoomInput.type = "range";
  zoomInput.min = String(MIN_PIXELS_PER_BEAT);
  zoomInput.max = String(MAX_PIXELS_PER_BEAT);
  zoomInput.value = String(settings.pixelsPerBeat);
  zoomInput.addEventListener("change", () => {
    settings.pixelsPerBeat = Number(zoomInput.value);
    renderPianoRoll(container, block, { beatsPerBar });
  });
  zoomLabel.appendChild(zoomInput);

  const snapLabel = document.createElement("label");
  snapLabel.className = "transport-field";
  snapLabel.textContent = "Snap";
  const snapSelect = document.createElement("select");
  for (const option of SNAP_OPTIONS) {
    snapSelect.append(new Option(option.label, String(option.value), false, option.value === settings.snap));
  }
  snapSelect.addEventListener("change", () => (settings.snap = Number(snapSelect.value)));
  snapLabel.appendChild(snapSelect);

  const hint = document.createElement("span");
  hint.className = "piano-roll-hint";
  hint.textContent =
    "Click to add · drag to move (any direction) · drag right edge to resize · double-click or right-click to delete";

  toolbar.append(zoomLabel, snapLabel, hint);

  // --- Keys + grid ------------------------------------------------------------------------

  const main = document.createElement("div");
  main.className = "piano-roll-main";

  const keys = document.createElement("div");
  keys.className = "piano-roll-keys";
  for (let note = HIGHEST_NOTE; note >= LOWEST_NOTE; note -= 1) {
    const key = document.createElement("div");
    key.className = `piano-roll-key${isBlackKey(note) ? " piano-roll-key--black" : ""}`;
    key.textContent = note % 12 === 0 ? noteLabel(note) : NOTE_NAMES[note % 12];
    key.title = `${noteLabel(note)} — press to hear it`;
    key.addEventListener("pointerdown", (event) => {
      key.setPointerCapture?.(event.pointerId);
      key.classList.add("piano-roll-key--active");
      startPreview(note);
      const release = () => {
        key.classList.remove("piano-roll-key--active");
        stopPreview(note);
        key.removeEventListener("pointerup", release);
        key.removeEventListener("pointercancel", release);
      };
      key.addEventListener("pointerup", release);
      key.addEventListener("pointercancel", release);
    });
    keys.appendChild(key);
  }

  const grid = document.createElement("div");
  grid.className = "piano-roll-grid";
  grid.style.width = `${contentBeats * ppb()}px`;
  grid.style.height = `${ROW_COUNT * ROW_HEIGHT}px`;
  grid.style.backgroundImage = [
    `linear-gradient(to right, #3a3f4b 1px, transparent 1px)`,
    `linear-gradient(to right, #262a33 1px, transparent 1px)`,
    `linear-gradient(to bottom, #1f232a 1px, transparent 1px)`,
    blackKeyGradient(),
  ].join(", ");
  grid.style.backgroundSize = [
    `${beatsPerBar * ppb()}px 100%`,
    `${ppb()}px 100%`,
    `100% ${ROW_HEIGHT}px`,
    `100% ${12 * ROW_HEIGHT}px`,
  ].join(", ");

  // Notes past the block's end are kept (shrinking a block is non-destructive) but don't play.
  if (contentBeats > block.lengthBeats) {
    const outside = document.createElement("div");
    outside.className = "piano-roll-outside";
    outside.style.left = `${block.lengthBeats * ppb()}px`;
    outside.title = "Past the block's end: kept, but not played";
    grid.appendChild(outside);
  }

  main.append(keys, grid);

  // --- Velocity lane ----------------------------------------------------------------------

  const velocityRow = document.createElement("div");
  velocityRow.className = "piano-roll-velocity-row";
  const velocityLabel = document.createElement("div");
  velocityLabel.className = "piano-roll-velocity-label";
  velocityLabel.textContent = "Velocity";
  const velocityScroll = document.createElement("div");
  velocityScroll.className = "piano-roll-velocity-scroll";
  const velocityLane = document.createElement("div");
  velocityLane.className = "piano-roll-velocity-lane";
  velocityLane.style.width = grid.style.width;
  velocityLane.style.height = `${VELOCITY_LANE_HEIGHT}px`;
  velocityScroll.appendChild(velocityLane);
  velocityRow.append(velocityLabel, velocityScroll);
  main.addEventListener("scroll", () => (velocityScroll.scrollLeft = main.scrollLeft));

  // --- Coordinates ------------------------------------------------------------------------

  function beatFromClientX(clientX) {
    return Math.max(0, (clientX - grid.getBoundingClientRect().left) / ppb());
  }

  function noteFromClientY(clientY) {
    const row = Math.floor((clientY - grid.getBoundingClientRect().top) / ROW_HEIGHT);
    return HIGHEST_NOTE - row;
  }

  function clampStart(startBeat, lengthBeats) {
    return Math.min(Math.max(0, block.lengthBeats - lengthBeats), Math.max(0, startBeat));
  }

  function applyNoteStyle(cell, note) {
    cell.style.left = `${note.startBeat * ppb()}px`;
    cell.style.width = `${note.lengthBeats * ppb()}px`;
    cell.style.top = `${(HIGHEST_NOTE - note.note) * ROW_HEIGHT + 1}px`;
    cell.style.opacity = String(0.45 + 0.55 * (note.velocity / 127));
    cell.title = `${noteLabel(note.note)} · velocity ${note.velocity}`;
  }

  // --- Notes ------------------------------------------------------------------------------

  function renderVelocityBar(note, cell) {
    const bar = document.createElement("div");
    bar.className = "piano-roll-velocity-bar";
    bar.style.left = `${note.startBeat * ppb()}px`;
    bar.style.width = `${Math.max(MIN_VELOCITY_BAR_WIDTH, Math.min(note.lengthBeats * ppb(), 24))}px`;
    const show = () => {
      bar.style.height = `${(note.velocity / 127) * 100}%`;
      bar.title = `Velocity ${note.velocity}`;
      applyNoteStyle(cell, note);
    };
    show();
    bar.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      bar.setPointerCapture?.(event.pointerId);
      const setFromY = (clientY) => {
        const rect = velocityLane.getBoundingClientRect();
        setNoteVelocity(note, ((rect.bottom - clientY) / rect.height) * 127);
        show();
      };
      setFromY(event.clientY);
      const onMove = (moveEvent) => setFromY(moveEvent.clientY);
      const onUp = () => {
        bar.removeEventListener("pointermove", onMove);
        bar.removeEventListener("pointerup", onUp);
        bar.removeEventListener("pointercancel", onUp);
      };
      bar.addEventListener("pointermove", onMove);
      bar.addEventListener("pointerup", onUp);
      bar.addEventListener("pointercancel", onUp);
    });
    velocityLane.appendChild(bar);
    return bar;
  }

  function renderNoteCell(note) {
    const cell = document.createElement("div");
    cell.className = "piano-roll-note";
    cell.style.height = `${ROW_HEIGHT - 2}px`;
    applyNoteStyle(cell, note);

    const label = document.createElement("span");
    label.className = "piano-roll-note-label";
    label.textContent = noteLabel(note.note);
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "piano-roll-note-resize";
    cell.append(label, resizeHandle);

    const velocityBar = renderVelocityBar(note, cell);

    const remove = (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeNote(block, note.id);
      rerender();
    };
    cell.addEventListener("dblclick", remove);
    cell.addEventListener("contextmenu", remove);

    cell.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      const isResize = event.target === resizeHandle;
      const startX = event.clientX;
      const startY = event.clientY;
      const startBeat = note.startBeat;
      const startLength = note.lengthBeats;
      const startPitch = note.note;
      cell.setPointerCapture?.(event.pointerId);

      function onMove(moveEvent) {
        const deltaBeats = (moveEvent.clientX - startX) / ppb();
        if (isResize) {
          const maxLength = Math.max(settings.snap, block.lengthBeats - note.startBeat);
          resizeNote(note, Math.min(maxLength, Math.max(settings.snap, snap(startLength + deltaBeats))));
          settings.lastLength = note.lengthBeats;
        } else {
          moveNote(note, clampStart(snap(startBeat + deltaBeats), note.lengthBeats));
          const rowDelta = Math.round((moveEvent.clientY - startY) / ROW_HEIGHT);
          const previousPitch = note.note;
          setNotePitch(note, startPitch - rowDelta);
          if (note.note !== previousPitch) {
            label.textContent = noteLabel(note.note);
            previewNote(note.note);
          }
        }
        applyNoteStyle(cell, note);
        velocityBar.style.left = cell.style.left;
      }
      function onUp() {
        cell.removeEventListener("pointermove", onMove);
        cell.removeEventListener("pointerup", onUp);
        cell.removeEventListener("pointercancel", onUp);
        bus.emit("block:notes-changed", { blockId: block.id });
      }
      cell.addEventListener("pointermove", onMove);
      cell.addEventListener("pointerup", onUp);
      cell.addEventListener("pointercancel", onUp);
    });

    grid.appendChild(cell);
  }

  grid.addEventListener("click", (event) => {
    if (event.target !== grid) {
      return;
    }
    const startBeat = Math.floor(beatFromClientX(event.clientX) / settings.snap) * settings.snap;
    const note = noteFromClientY(event.clientY);
    if (note < LOWEST_NOTE || note > HIGHEST_NOTE || startBeat >= block.lengthBeats) {
      return;
    }
    const lengthBeats = Math.min(settings.lastLength, block.lengthBeats - startBeat);
    addNote(block, { note, startBeat, lengthBeats, velocity: DEFAULT_VELOCITY });
    previewNote(note);
    rerender();
  });
  grid.addEventListener("contextmenu", (event) => {
    if (event.target === grid) {
      event.preventDefault();
    }
  });

  for (const note of block.notes) {
    renderNoteCell(note);
  }

  const wrapper = document.createElement("div");
  wrapper.className = "piano-roll";
  wrapper.append(toolbar, main, velocityRow);
  container.appendChild(wrapper);

  // Re-rendering into the same container (note added/removed, zoom) keeps the scroll position;
  // a fresh container (opening a block, or the timeline refreshing after a transpose) centres
  // the view on the block's notes, so transposed notes are never left off-screen.
  if (restoreScroll) {
    main.scrollTop = restoreScroll.top;
    main.scrollLeft = restoreScroll.left;
  } else {
    const pitches = block.notes.map((note) => note.note);
    const center = pitches.length ? (Math.min(...pitches) + Math.max(...pitches)) / 2 : DEFAULT_CENTER_NOTE;
    main.scrollTop = (HIGHEST_NOTE - center) * ROW_HEIGHT - main.clientHeight / 2;
  }
  velocityScroll.scrollLeft = main.scrollLeft;
}
