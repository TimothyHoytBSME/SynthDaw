import { bus } from "./eventBus.js";
import { addBlock, addNote } from "./project.js";
import { getTransport } from "./transportController.js";
import { getSelectedTrack, selectBlock } from "./selection.js";

const QUANTIZE_GRID_BEATS = 0.25;
const MIN_NOTE_BEATS = 0.0625;
const POSITION_SAMPLE_MS = 20;
// Only performed input is recorded — not piano-roll auditioning.
const RECORDED_SOURCES = new Set(["midi", "keyboard"]);

let project = null;
let recording = false;
let quantize = true;
let trackId = null;
let lastPosition = 0;
let positionTimer = null;
const heldNotes = new Map(); // note number -> { note, velocity, startBeat }
const takeNotes = [];

function position() {
  return getTransport().getPositionBeats();
}

function noteLength(startBeat, endBeat) {
  const loop = project.loop;
  // Released after the loop wrapped: the note ran to the loop end.
  const end = endBeat < startBeat && loop.enabled ? loop.endBeat : endBeat;
  return Math.max(MIN_NOTE_BEATS, end - startBeat);
}

function finishNote(note, endBeat) {
  const held = heldNotes.get(note);
  if (!held) {
    return;
  }
  heldNotes.delete(note);
  takeNotes.push({ ...held, lengthBeats: noteLength(held.startBeat, endBeat) });
}

function handleNoteOn({ note, velocity = 100, source }) {
  if (recording && RECORDED_SOURCES.has(source)) {
    finishNote(note, position()); // a retrigger ends the previous press of the same key
    heldNotes.set(note, { note, velocity, startBeat: position() });
  }
}

function handleNoteOff({ note }) {
  if (recording) {
    finishNote(note, position());
  }
}

function snap(beat) {
  return quantize ? Math.round(beat / QUANTIZE_GRID_BEATS) * QUANTIZE_GRID_BEATS : beat;
}

// Turns the take into one bar-aligned block on the armed track.
function commitTake() {
  const track = project.tracks.find((candidate) => candidate.id === trackId);
  if (!track || takeNotes.length === 0) {
    return;
  }
  const beatsPerBar = project.timeSignature.beatsPerBar;
  const notes = takeNotes.map((note) => ({
    ...note,
    startBeat: snap(note.startBeat),
    lengthBeats: Math.max(quantize ? QUANTIZE_GRID_BEATS : MIN_NOTE_BEATS, snap(note.lengthBeats)),
  }));
  const firstBeat = Math.min(...notes.map((note) => note.startBeat));
  const lastBeat = Math.max(...notes.map((note) => note.startBeat + note.lengthBeats));
  const blockStart = Math.floor(firstBeat / beatsPerBar) * beatsPerBar;
  const blockEnd = Math.max(blockStart + beatsPerBar, Math.ceil(lastBeat / beatsPerBar) * beatsPerBar);

  const block = addBlock(track, { startBeat: blockStart, lengthBeats: blockEnd - blockStart });
  for (const note of notes) {
    addNote(block, {
      note: note.note,
      velocity: note.velocity,
      startBeat: note.startBeat - blockStart,
      lengthBeats: note.lengthBeats,
    });
  }
  selectBlock(track.id, block.id);
  bus.emit("project:blocks-changed", {});
}

function setRecording(next) {
  recording = next;
  bus.emit("recorder:changed", { recording });
}

export function startRecording() {
  if (recording) {
    return;
  }
  const track = getSelectedTrack(project);
  if (!track) {
    bus.emit("status:message", { text: "Add a track before recording." });
    return;
  }
  trackId = track.id;
  heldNotes.clear();
  takeNotes.length = 0;
  const transport = getTransport();
  if (!transport.isRunning()) {
    transport.play();
  }
  lastPosition = position();
  // Stop rewinds the transport to 0 before announcing itself, so notes still held at that
  // moment are closed at the last sampled position instead.
  positionTimer = setInterval(() => (lastPosition = position()), POSITION_SAMPLE_MS);
  setRecording(true);
}

export function stopRecording(endBeat = position()) {
  if (!recording) {
    return;
  }
  clearInterval(positionTimer);
  for (const note of Array.from(heldNotes.keys())) {
    finishNote(note, endBeat);
  }
  setRecording(false);
  commitTake();
}

export function isRecording() {
  return recording;
}

export function setQuantizeTakes(enabled) {
  quantize = enabled;
}

export function isQuantizingTakes() {
  return quantize;
}

export function initRecorder(theProject) {
  project = theProject;
  bus.on("note:on", handleNoteOn);
  bus.on("note:off", handleNoteOff);
  bus.on("transport:pause", () => stopRecording());
  bus.on("transport:stop", () => stopRecording(lastPosition));
}
