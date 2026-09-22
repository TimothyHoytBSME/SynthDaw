import { bus } from "../core/eventBus.js";

const NOTE_KEYS = [
  { note: 60, label: "C", key: "a" },
  { note: 61, label: "C#", key: "w" },
  { note: 62, label: "D", key: "s" },
  { note: 63, label: "D#", key: "e" },
  { note: 64, label: "E", key: "d" },
  { note: 65, label: "F", key: "f" },
  { note: 66, label: "F#", key: "t" },
  { note: 67, label: "G", key: "g" },
  { note: 68, label: "G#", key: "y" },
  { note: 69, label: "A", key: "h" },
  { note: 70, label: "A#", key: "u" },
  { note: 71, label: "B", key: "j" },
];

export function renderPianoTrigger(container) {
  const noteByKey = new Map();
  const pressedKeys = new Set();

  const setActive = (note, active) => {
    container
      .querySelector(`[data-note="${note}"]`)
      ?.classList.toggle("piano-key--active", active);
  };

  for (const { note, label, key } of NOTE_KEYS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `piano-key${label.includes("#") ? " piano-key--black" : ""}`;
    button.textContent = `${label}\n${key.toUpperCase()}`;
    button.dataset.note = String(note);
    noteByKey.set(key, note);

    const press = (event) => {
      event.preventDefault();
      bus.emit("note:on", { note });
      setActive(note, true);
    };
    const release = (event) => {
      event.preventDefault();
      bus.emit("note:off", { note });
      setActive(note, false);
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);

    container.appendChild(button);
  }

  window.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }
    const note = noteByKey.get(event.key.toLowerCase());
    if (note === undefined || pressedKeys.has(note)) {
      return;
    }
    pressedKeys.add(note);
    bus.emit("note:on", { note });
    setActive(note, true);
  });

  window.addEventListener("keyup", (event) => {
    const note = noteByKey.get(event.key.toLowerCase());
    if (note === undefined) {
      return;
    }
    pressedKeys.delete(note);
    bus.emit("note:off", { note });
    setActive(note, false);
  });
}
