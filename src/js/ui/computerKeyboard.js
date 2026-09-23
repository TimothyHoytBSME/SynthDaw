import { bus } from "../core/eventBus.js";

const VELOCITY = 100;
const DEFAULT_BASE_NOTE = 60; // C4
const MIN_BASE_NOTE = 12;
const MAX_BASE_NOTE = 108;
// Semitone offset from the current base C, laid out like a piano on the home row.
const KEY_OFFSETS = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14 };
const OCTAVE_DOWN_KEY = "z";
const OCTAVE_UP_KEY = "x";
const FIELD_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

function shouldIgnore(event) {
  return (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    FIELD_TAGS.has(document.activeElement?.tagName) ||
    document.activeElement?.isContentEditable
  );
}

function octaveLabel(baseNote) {
  return `C${Math.floor(baseNote / 12) - 1}`;
}

// Computer keyboard as a note input (the only instrument when no MIDI device is present).
// `statusElement` shows the mapping and current octave.
export function initComputerKeyboard(statusElement) {
  let baseNote = DEFAULT_BASE_NOTE;
  // key -> the note it started, so a key released after an octave change still stops its note.
  const heldNotes = new Map();

  function renderStatus() {
    statusElement.textContent = `Computer keyboard: A–L play notes from ${octaveLabel(baseNote)}, Z/X shift octave.`;
  }

  function releaseAll() {
    for (const note of heldNotes.values()) {
      bus.emit("note:off", { note, source: "keyboard" });
    }
    heldNotes.clear();
  }

  window.addEventListener("keydown", (event) => {
    if (event.repeat || shouldIgnore(event)) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === OCTAVE_DOWN_KEY || key === OCTAVE_UP_KEY) {
      const direction = key === OCTAVE_UP_KEY ? 12 : -12;
      baseNote = Math.min(MAX_BASE_NOTE, Math.max(MIN_BASE_NOTE, baseNote + direction));
      renderStatus();
      return;
    }
    const offset = KEY_OFFSETS[key];
    if (offset === undefined || heldNotes.has(key)) {
      return;
    }
    const note = baseNote + offset;
    heldNotes.set(key, note);
    bus.emit("note:on", { note, velocity: VELOCITY, source: "keyboard" });
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    const note = heldNotes.get(key);
    if (note === undefined) {
      return;
    }
    heldNotes.delete(key);
    bus.emit("note:off", { note, source: "keyboard" });
  });

  // Keyup never arrives if focus leaves the window mid-press; without this the note hangs.
  window.addEventListener("blur", releaseAll);

  renderStatus();
}
