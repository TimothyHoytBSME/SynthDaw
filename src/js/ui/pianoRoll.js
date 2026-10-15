import { bus } from "../core/eventBus.js";
import {
  addNote,
  removeNote,
  removeNotes,
  moveNote,
  resizeNote,
  setNotePitch,
  setNoteVelocity,
  transposeNotes,
  LOWEST_NOTE,
  HIGHEST_NOTE,
  SEMITONES_PER_OCTAVE,
} from "../core/project.js";
import { getPositionBeats } from "../core/transportController.js";

// Must match the row period used by `.piano-roll-grid`/`.piano-roll-key` in main.css.
const ROW_HEIGHT = 20;
const VELOCITY_LANE_HEIGHT = 64;
const MIN_PIXELS_PER_BEAT = 20;
const MAX_PIXELS_PER_BEAT = 240;
const MIN_VELOCITY_BAR_WIDTH = 8;
const DEFAULT_VELOCITY = 100;
const PREVIEW_DURATION_MS = 150;
const DEFAULT_CENTER_NOTE = 60; // C4
// A pointer that moves less than this is a click (add a note), not a marquee drag.
const DRAG_THRESHOLD_PX = 4;
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
// Selected note ids for the block currently open (cleared when a different block opens).
const selection = { blockId: null, noteIds: new Set() };
// Copied notes, relative to the earliest one's start (in-memory, like the block clipboard).
let noteClipboard = null;
// Unsubscribes the previous roll's keyboard handler (one live roll at a time).
let unsubscribeKeys = null;
// The open roll's playhead line and block, for `setPianoRollPosition` (driven by the timeline's
// animation loop, which already knows the transport position).
let activePlayhead = null;

export function setPianoRollPosition(positionBeats) {
  if (!activePlayhead || !activePlayhead.element.isConnected) {
    return;
  }
  const { element, block } = activePlayhead;
  const beatInBlock = positionBeats - block.startBeat;
  const inside = beatInBlock >= 0 && beatInBlock < block.lengthBeats;
  element.hidden = !inside;
  if (inside) {
    element.style.transform = `translateX(${beatInBlock * settings.pixelsPerBeat}px)`;
  }
}

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

function selectionFor(block) {
  if (selection.blockId !== block.id) {
    selection.blockId = block.id;
    selection.noteIds.clear();
  }
  return selection.noteIds;
}

function selectedNotes(block) {
  const ids = selectionFor(block);
  return block.notes.filter((note) => ids.has(note.id));
}

// Tracks pointer drags on `element`: `onMove(event, dx, dy)` after each move, `onUp(moved)` at
// the end. `moved` is whether the pointer travelled past DRAG_THRESHOLD_PX.
function trackDrag(element, event, { onMove, onUp }) {
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  element.setPointerCapture?.(event.pointerId);
  const handleMove = (moveEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    moved ||= Math.abs(dx) >= DRAG_THRESHOLD_PX || Math.abs(dy) >= DRAG_THRESHOLD_PX;
    onMove?.(moveEvent, dx, dy, moved);
  };
  const handleUp = () => {
    element.removeEventListener("pointermove", handleMove);
    element.removeEventListener("pointerup", handleUp);
    element.removeEventListener("pointercancel", handleUp);
    onUp?.(moved);
  };
  element.addEventListener("pointermove", handleMove);
  element.addEventListener("pointerup", handleUp);
  element.addEventListener("pointercancel", handleUp);
}

export function renderPianoRoll(container, block, { beatsPerBar = 4 } = {}) {
  const previousScroll = container.querySelector(".piano-roll-main");
  const restoreScroll = previousScroll && { top: previousScroll.scrollTop, left: previousScroll.scrollLeft };
  container.innerHTML = "";

  const ppb = () => settings.pixelsPerBeat;
  const snap = (beat) => Math.round(beat / settings.snap) * settings.snap;
  const lastNoteEnd = Math.max(0, ...block.notes.map((note) => note.startBeat + note.lengthBeats));
  const contentBeats = Math.max(block.lengthBeats, lastNoteEnd);
  const selectedIds = selectionFor(block);
  // Prune ids of notes that no longer exist (deleted, undone).
  const liveIds = new Set(block.notes.map((note) => note.id));
  for (const id of Array.from(selectedIds)) {
    if (!liveIds.has(id)) {
      selectedIds.delete(id);
    }
  }
  // note id -> { cell, velocityBar, label }, for in-place updates during group drags.
  const cells = new Map();

  function rerender() {
    bus.emit("block:notes-changed", { blockId: block.id });
    renderPianoRoll(container, block, { beatsPerBar });
  }

  function showSelection() {
    for (const [id, { cell }] of cells) {
      cell.classList.toggle("piano-roll-note--selected", selectedIds.has(id));
    }
    hint.textContent = selectedIds.size > 0 ? SELECTION_HINT : HINT;
  }

  function select(noteIds, { add = false } = {}) {
    if (!add) {
      selectedIds.clear();
    }
    for (const id of noteIds) {
      selectedIds.add(id);
    }
    showSelection();
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

  const HINT =
    "Click to add · drag to move · drag right edge to resize · drag empty space to select · double-click or right-click to delete";
  const SELECTION_HINT =
    "Selection: drag to move together · ↑/↓ transpose (Shift = octave) · Delete · Ctrl+C/V/D copy, paste at playhead, duplicate · Esc";
  const quantizeButton = document.createElement("button");
  quantizeButton.type = "button";
  quantizeButton.textContent = "Quantize notes";
  quantizeButton.title = "Snap the selected notes' starts (or every note, with nothing selected) to the snap grid";
  quantizeButton.addEventListener("click", () => quantizeNotes(selectedIds.size > 0 ? selectedNotes(block) : block.notes));

  const hint = document.createElement("span");
  hint.className = "piano-roll-hint";

  toolbar.append(zoomLabel, snapLabel, quantizeButton, hint);

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

  const playhead = document.createElement("div");
  playhead.className = "piano-roll-playhead";
  playhead.hidden = true;
  grid.appendChild(playhead);
  activePlayhead = { element: playhead, block };

  const marquee = document.createElement("div");
  marquee.className = "piano-roll-marquee";
  marquee.hidden = true;
  grid.appendChild(marquee);

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

  function gridPoint(clientX, clientY) {
    const rect = grid.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function beatFromClientX(clientX) {
    return Math.max(0, gridPoint(clientX, 0).x / ppb());
  }

  function noteFromClientY(clientY) {
    const row = Math.floor(gridPoint(0, clientY).y / ROW_HEIGHT);
    return HIGHEST_NOTE - row;
  }

  function applyNoteStyle(cell, note) {
    cell.style.left = `${note.startBeat * ppb()}px`;
    cell.style.width = `${note.lengthBeats * ppb()}px`;
    cell.style.top = `${(HIGHEST_NOTE - note.note) * ROW_HEIGHT + 1}px`;
    cell.style.opacity = String(0.45 + 0.55 * (note.velocity / 127));
    cell.title = `${noteLabel(note.note)} · velocity ${note.velocity}`;
  }

  function refreshNoteElements(note) {
    const entry = cells.get(note.id);
    if (!entry) {
      return;
    }
    applyNoteStyle(entry.cell, note);
    entry.label.textContent = noteLabel(note.note);
    entry.velocityBar.style.left = entry.cell.style.left;
    entry.velocityBar.style.height = `${(note.velocity / 127) * 100}%`;
    entry.velocityBar.title = `Velocity ${note.velocity}`;
  }

  // --- Group edits (the selection, or the grabbed note alone) -----------------------------

  // Moves `notes` together by a snapped time delta and a row delta, keeping the group inside
  // the block and the MIDI range: the delta is clamped by the group's extremes, so relative
  // positions never change. `origins` holds each note's position when the drag began.
  function moveGroup(notes, origins, deltaBeats, deltaRows) {
    let minStart = Infinity;
    let maxShift = Infinity;
    let minPitch = Infinity;
    let maxPitch = -Infinity;
    for (const note of notes) {
      const origin = origins.get(note.id);
      minStart = Math.min(minStart, origin.startBeat);
      maxShift = Math.min(maxShift, Math.max(0, block.lengthBeats - origin.lengthBeats) - origin.startBeat);
      minPitch = Math.min(minPitch, origin.note);
      maxPitch = Math.max(maxPitch, origin.note);
    }
    const shift = Math.min(Math.max(deltaBeats, -minStart), Math.max(-minStart, maxShift));
    const rows = Math.min(Math.max(deltaRows, LOWEST_NOTE - minPitch), HIGHEST_NOTE - maxPitch);
    for (const note of notes) {
      const origin = origins.get(note.id);
      moveNote(note, origin.startBeat + shift);
      setNotePitch(note, origin.note + rows);
      refreshNoteElements(note);
    }
    return rows;
  }

  function resizeGroup(notes, origins, deltaBeats) {
    for (const note of notes) {
      const origin = origins.get(note.id);
      const maxLength = Math.max(settings.snap, block.lengthBeats - note.startBeat);
      resizeNote(note, Math.min(maxLength, Math.max(settings.snap, snap(origin.lengthBeats + deltaBeats))));
      refreshNoteElements(note);
    }
  }

  // Snaps note starts to the current grid, keeping each note inside the block.
  function quantizeNotes(notes) {
    let changed = 0;
    for (const note of notes) {
      const snapped = Math.min(Math.max(0, block.lengthBeats - note.lengthBeats), Math.max(0, snap(note.startBeat)));
      if (snapped !== note.startBeat) {
        moveNote(note, snapped);
        changed += 1;
      }
    }
    if (changed > 0) {
      rerender();
    }
    bus.emit("status:message", { text: changed > 0 ? `Quantized ${changed} note${changed === 1 ? "" : "s"} to the ${snapSelect.selectedOptions[0].textContent} grid.` : "Already on the grid." });
  }

  function deleteSelected() {
    if (selectedIds.size === 0) {
      return false;
    }
    removeNotes(block, Array.from(selectedIds));
    selectedIds.clear();
    rerender();
    return true;
  }

  function transposeSelected(semitones) {
    const notes = selectedNotes(block);
    if (notes.length === 0) {
      return false;
    }
    if (transposeNotes(notes, semitones)) {
      notes.forEach(refreshNoteElements);
      bus.emit("block:notes-changed", { blockId: block.id });
      previewNote(notes[0].note);
    } else {
      bus.emit("status:message", { text: "Can't transpose that far: some notes would leave the MIDI range." });
    }
    return true;
  }

  function copySelected() {
    const notes = selectedNotes(block);
    if (notes.length === 0) {
      return false;
    }
    const firstBeat = Math.min(...notes.map((note) => note.startBeat));
    noteClipboard = notes.map((note) => ({ ...note, startBeat: note.startBeat - firstBeat }));
    bus.emit("status:message", { text: `${notes.length} note${notes.length === 1 ? "" : "s"} copied. Ctrl+V pastes at the playhead (or the block start).` });
    return true;
  }

  // Adds copies of `notes` (relative starts) at `atBeat`, selects them.
  function pasteNotes(notes, atBeat) {
    const added = notes
      .filter((note) => atBeat + note.startBeat < block.lengthBeats)
      .map((note) => addNote(block, { ...note, startBeat: atBeat + note.startBeat }));
    if (added.length === 0) {
      bus.emit("status:message", { text: "Nothing pasted: the notes would start past the block's end." });
      return;
    }
    select(added.map((note) => note.id));
    rerender();
  }

  function pasteClipboard() {
    if (!noteClipboard) {
      return false;
    }
    const playhead = getPositionBeats() - block.startBeat;
    const inside = playhead >= 0 && playhead < block.lengthBeats;
    pasteNotes(noteClipboard, inside ? snap(playhead) : 0);
    return true;
  }

  function duplicateSelected() {
    const notes = selectedNotes(block);
    if (notes.length === 0) {
      return false;
    }
    const firstBeat = Math.min(...notes.map((note) => note.startBeat));
    const end = Math.max(...notes.map((note) => note.startBeat + note.lengthBeats));
    pasteNotes(notes.map((note) => ({ ...note, startBeat: note.startBeat - firstBeat })), end);
    return true;
  }

  // Keys the timeline's shortcut layer forwards while this roll is open. Returns true if used.
  function handleKey(request) {
    const { key, shiftKey, ctrlKey, metaKey } = request;
    const modified = ctrlKey || metaKey;
    if (!modified) {
      switch (key) {
        case "Delete":
        case "Backspace":
          return deleteSelected();
        case "ArrowUp":
          return transposeSelected(shiftKey ? SEMITONES_PER_OCTAVE : 1);
        case "ArrowDown":
          return transposeSelected(shiftKey ? -SEMITONES_PER_OCTAVE : -1);
        case "Escape":
          if (selectedIds.size === 0) {
            return false;
          }
          select([]);
          return true;
        default:
          return false;
      }
    }
    switch (key.toLowerCase()) {
      case "a":
        select(block.notes.map((note) => note.id));
        return true;
      case "c":
        return copySelected();
      case "x":
        return copySelected() && deleteSelected();
      case "v":
        return pasteClipboard();
      case "d":
        return duplicateSelected();
      default:
        return false;
    }
  }

  // --- Notes ------------------------------------------------------------------------------

  function renderVelocityBar(note) {
    const bar = document.createElement("div");
    bar.className = "piano-roll-velocity-bar";
    bar.style.left = `${note.startBeat * ppb()}px`;
    bar.style.width = `${Math.max(MIN_VELOCITY_BAR_WIDTH, Math.min(note.lengthBeats * ppb(), 24))}px`;
    bar.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      // Dragging a selected note's bar sets every selected note's velocity.
      const targets = selectedIds.has(note.id) ? selectedNotes(block) : [note];
      const setFromY = (clientY) => {
        const rect = velocityLane.getBoundingClientRect();
        const velocity = ((rect.bottom - clientY) / rect.height) * 127;
        for (const target of targets) {
          setNoteVelocity(target, velocity);
          refreshNoteElements(target);
        }
      };
      setFromY(event.clientY);
      trackDrag(bar, event, { onMove: (moveEvent) => setFromY(moveEvent.clientY) });
    });
    velocityLane.appendChild(bar);
    return bar;
  }

  function renderNoteCell(note) {
    const cell = document.createElement("div");
    cell.className = "piano-roll-note";
    cell.style.height = `${ROW_HEIGHT - 2}px`;

    const label = document.createElement("span");
    label.className = "piano-roll-note-label";
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "piano-roll-note-resize";
    cell.append(label, resizeHandle);

    const velocityBar = renderVelocityBar(note);
    cells.set(note.id, { cell, velocityBar, label });
    refreshNoteElements(note);

    const remove = (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeNote(block, note.id);
      selectedIds.delete(note.id);
      rerender();
    };
    cell.addEventListener("dblclick", remove);
    cell.addEventListener("contextmenu", remove);

    cell.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      const addToSelection = event.shiftKey || event.ctrlKey || event.metaKey;
      const wasSelected = selectedIds.has(note.id);
      if (addToSelection) {
        if (wasSelected) {
          selectedIds.delete(note.id);
        } else {
          selectedIds.add(note.id);
        }
        showSelection();
      } else if (!wasSelected) {
        select([note.id]);
      }
      if (!selectedIds.has(note.id)) {
        return; // toggled off: nothing to drag
      }

      const isResize = event.target === resizeHandle;
      const group = selectedNotes(block);
      const origins = new Map(group.map((member) => [member.id, { ...member }]));
      const grabbed = origins.get(note.id);
      let lastRows = 0;

      trackDrag(cell, event, {
        onMove(moveEvent, dx, dy) {
          const rawDelta = dx / ppb();
          if (isResize) {
            resizeGroup(group, origins, rawDelta);
            settings.lastLength = note.lengthBeats;
            return;
          }
          const deltaBeats = snap(grabbed.startBeat + rawDelta) - grabbed.startBeat;
          const rows = moveGroup(group, origins, deltaBeats, -Math.round(dy / ROW_HEIGHT));
          if (rows !== lastRows) {
            lastRows = rows;
            previewNote(note.note);
          }
        },
        onUp(moved) {
          if (!moved && !addToSelection && wasSelected && selectedIds.size > 1) {
            select([note.id]); // a plain click on one of several selected notes picks just it
          }
          if (moved) {
            bus.emit("block:notes-changed", { blockId: block.id });
          }
        },
      });
    });

    grid.appendChild(cell);
  }

  // Empty grid: a click adds a note; a drag selects every note the rectangle touches.
  grid.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target !== grid) {
      return;
    }
    const origin = gridPoint(event.clientX, event.clientY);
    const addToSelection = event.shiftKey || event.ctrlKey || event.metaKey;
    const marqueeRect = (point) => ({
      left: Math.min(origin.x, point.x),
      top: Math.min(origin.y, point.y),
      right: Math.max(origin.x, point.x),
      bottom: Math.max(origin.y, point.y),
    });
    const notesIn = (rect) =>
      block.notes.filter((note) => {
        const left = note.startBeat * ppb();
        const right = left + note.lengthBeats * ppb();
        const top = (HIGHEST_NOTE - note.note) * ROW_HEIGHT;
        return left < rect.right && right > rect.left && top < rect.bottom && top + ROW_HEIGHT > rect.top;
      });
    trackDrag(grid, event, {
      onMove(moveEvent, dx, dy, moved) {
        if (!moved) {
          return;
        }
        const rect = marqueeRect(gridPoint(moveEvent.clientX, moveEvent.clientY));
        marquee.hidden = false;
        marquee.style.left = `${rect.left}px`;
        marquee.style.top = `${rect.top}px`;
        marquee.style.width = `${rect.right - rect.left}px`;
        marquee.style.height = `${rect.bottom - rect.top}px`;
        select(notesIn(rect).map((note) => note.id), { add: addToSelection });
      },
      onUp(moved) {
        marquee.hidden = true;
        if (moved) {
          return;
        }
        const startBeat = Math.floor(beatFromClientX(event.clientX) / settings.snap) * settings.snap;
        const pitch = noteFromClientY(event.clientY);
        if (pitch < LOWEST_NOTE || pitch > HIGHEST_NOTE || startBeat >= block.lengthBeats) {
          return;
        }
        const lengthBeats = Math.min(settings.lastLength, block.lengthBeats - startBeat);
        const added = addNote(block, { note: pitch, startBeat, lengthBeats, velocity: DEFAULT_VELOCITY });
        select([added.id]);
        previewNote(pitch);
        rerender();
      },
    });
  });
  grid.addEventListener("contextmenu", (event) => {
    if (event.target === grid) {
      event.preventDefault();
    }
  });

  for (const note of block.notes) {
    renderNoteCell(note);
  }
  showSelection();

  const wrapper = document.createElement("div");
  wrapper.className = "piano-roll";
  wrapper.append(toolbar, main, velocityRow);
  container.appendChild(wrapper);

  // Keyboard: the shortcut layer (core/keyboardShortcuts.js) forwards keys here while a block is
  // being edited. One live handler per roll; re-rendering swaps it.
  unsubscribeKeys?.();
  unsubscribeKeys = bus.on("pianoroll:key", (request) => {
    // A handled key may re-render (and so re-subscribe) during this very dispatch; the new
    // listener then sees the same request and must not act on it again.
    if (request.handled || !wrapper.isConnected) {
      return;
    }
    if (handleKey(request)) {
      request.handled = true;
    }
  });

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
