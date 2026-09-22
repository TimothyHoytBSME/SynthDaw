import { bus } from "../core/eventBus.js";

function describe(inputs) {
  if (inputs.length === 0) {
    return "No MIDI devices connected";
  }
  return `Connected: ${inputs.join(", ")}`;
}

export function renderMIDIStatus(container) {
  container.textContent = "Checking for MIDI devices…";

  bus.on("midi:unsupported", ({ reason }) => {
    container.textContent = `MIDI unavailable (${reason})`;
  });
  bus.on("midi:ready", ({ inputs }) => {
    container.textContent = describe(inputs);
  });
  bus.on("midi:devicechange", ({ inputs }) => {
    container.textContent = describe(inputs);
  });
}
