import { defaultParamsFor } from "../audio/effectTypes.js";

// Plain-data builders shared by the demo songs. Every demo calls resetDemoIds() first, so a
// freshly built project always numbers its ids from 1 (replaceProjectContents re-syncs the
// app's own counter afterwards).

let idCounter = 0;

function id(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function resetDemoIds() {
  idCounter = 0;
}

export function note(noteNumber, startBeat, lengthBeats, velocity) {
  return { id: id("note"), note: noteNumber, startBeat, lengthBeats, velocity };
}

export function block(startBeat, notes, lengthBeats) {
  return { id: id("block"), startBeat, lengthBeats, notes };
}

export function effect(type, overrides = {}) {
  return { id: id("effect"), type, params: { ...defaultParamsFor(type), ...overrides }, bypassed: false };
}

export function track(name, patch, { volume = 1, pan = 0, effects = [], blocks = [] }) {
  return { id: id("track"), name, patch, volume, pan, muted: false, soloed: false, effects, blocks };
}
