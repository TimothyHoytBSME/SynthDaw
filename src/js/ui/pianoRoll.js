import { bus } from "../core/eventBus.js";
import { addNote, removeNote, moveNote, resizeNote } from "../core/project.js";

const LOW_NOTE = 48; // C3
const HIGH_NOTE = 83; // B5
const PIXELS_PER_BEAT = 40;
const ROW_HEIGHT = 16;
const PREVIEW_VELOCITY = 100;
const PREVIEW_DURATION_MS = 150;
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteLabel(note) {
  return `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
}

function isBlackKey(note) {
  return NOTE_NAMES[note % 12].includes("#");
}

function previewNote(note) {
  bus.emit("note:on", { note, velocity: PREVIEW_VELOCITY, source: "piano-roll" });
  setTimeout(() => bus.emit("note:off", { note, source: "piano-roll" }), PREVIEW_DURATION_MS);
}

function snapBeat(beat) {
  return Math.round(beat * 4) / 4;
}

export function renderPianoRoll(container, block) {
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "piano-roll";

  const keys = document.createElement("div");
  keys.className = "piano-roll-keys";
  for (let note = HIGH_NOTE; note >= LOW_NOTE; note -= 1) {
    const key = document.createElement("div");
    key.className = `piano-roll-key${isBlackKey(note) ? " piano-roll-key--black" : ""}`;
    key.style.height = `${ROW_HEIGHT}px`;
    key.textContent = noteLabel(note);
    keys.appendChild(key);
  }

  const scrollArea = document.createElement("div");
  scrollArea.className = "piano-roll-scroll";

  const grid = document.createElement("div");
  grid.className = "piano-roll-grid";
  grid.style.width = `${block.lengthBeats * PIXELS_PER_BEAT}px`;
  grid.style.height = `${(HIGH_NOTE - LOW_NOTE + 1) * ROW_HEIGHT}px`;

  function rerender() {
    renderPianoRoll(container, block);
  }

  function beatFromClientX(clientX) {
    const rect = grid.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left) / PIXELS_PER_BEAT);
  }

  function noteFromClientY(clientY) {
    const rect = grid.getBoundingClientRect();
    const row = Math.floor((clientY - rect.top) / ROW_HEIGHT);
    return HIGH_NOTE - row;
  }

  function renderNoteCell(note) {
    const cell = document.createElement("div");
    cell.className = "piano-roll-note";
    cell.style.left = `${note.startBeat * PIXELS_PER_BEAT}px`;
    cell.style.width = `${note.lengthBeats * PIXELS_PER_BEAT}px`;
    cell.style.top = `${(HIGH_NOTE - note.note) * ROW_HEIGHT}px`;
    cell.style.height = `${ROW_HEIGHT - 2}px`;
    cell.title = noteLabel(note.note);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "piano-roll-note-remove";
    removeButton.textContent = "×";
    removeButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      removeNote(block, note.id);
      rerender();
    });
    cell.appendChild(removeButton);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "piano-roll-note-resize";
    cell.appendChild(resizeHandle);

    cell.addEventListener("pointerdown", (event) => {
      if (event.target === removeButton) {
        return;
      }
      event.stopPropagation();
      const isResize = event.target === resizeHandle;
      const startClientX = event.clientX;
      const startBeat = note.startBeat;
      const startLength = note.lengthBeats;
      cell.setPointerCapture(event.pointerId);

      function onMove(moveEvent) {
        const deltaBeats = (moveEvent.clientX - startClientX) / PIXELS_PER_BEAT;
        if (isResize) {
          resizeNote(note, snapBeat(startLength + deltaBeats));
          cell.style.width = `${note.lengthBeats * PIXELS_PER_BEAT}px`;
        } else {
          moveNote(note, snapBeat(startBeat + deltaBeats));
          cell.style.left = `${note.startBeat * PIXELS_PER_BEAT}px`;
        }
      }
      function onUp() {
        cell.releasePointerCapture(event.pointerId);
        cell.removeEventListener("pointermove", onMove);
        cell.removeEventListener("pointerup", onUp);
      }
      cell.addEventListener("pointermove", onMove);
      cell.addEventListener("pointerup", onUp);
    });

    grid.appendChild(cell);
  }

  grid.addEventListener("click", (event) => {
    if (event.target !== grid) {
      return;
    }
    const beat = snapBeat(beatFromClientX(event.clientX));
    const note = noteFromClientY(event.clientY);
    if (note < LOW_NOTE || note > HIGH_NOTE || beat >= block.lengthBeats) {
      return;
    }
    addNote(block, { note, startBeat: beat, lengthBeats: 1, velocity: 100 });
    previewNote(note);
    rerender();
  });

  for (const note of block.notes) {
    renderNoteCell(note);
  }

  scrollArea.append(keys, grid);
  wrapper.appendChild(scrollArea);
  container.appendChild(wrapper);
}
