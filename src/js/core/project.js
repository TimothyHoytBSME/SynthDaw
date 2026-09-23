let idCounter = 0;

function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function createProject() {
  return {
    tempo: 120,
    timeSignature: { beatsPerBar: 4 },
    tracks: [],
  };
}

export function addTrack(project, { name } = {}) {
  const track = {
    id: nextId("track"),
    name: name ?? `Track ${project.tracks.length + 1}`,
    blocks: [],
  };
  project.tracks.push(track);
  return track;
}

export function removeTrack(project, trackId) {
  project.tracks = project.tracks.filter((track) => track.id !== trackId);
}

export function addBlock(track, { startBeat, lengthBeats = 4 }) {
  const block = { id: nextId("block"), startBeat: Math.max(0, startBeat), lengthBeats, notes: [] };
  track.blocks.push(block);
  return block;
}

export function removeBlock(track, blockId) {
  track.blocks = track.blocks.filter((block) => block.id !== blockId);
}

export function moveBlock(block, newStartBeat) {
  block.startBeat = Math.max(0, newStartBeat);
}

export function resizeBlock(block, newLengthBeats) {
  block.lengthBeats = Math.max(0.25, newLengthBeats);
}

export function addNote(block, { note, startBeat, lengthBeats = 1, velocity = 100 }) {
  const noteEvent = {
    id: nextId("note"),
    note,
    startBeat: Math.max(0, startBeat),
    lengthBeats,
    velocity,
  };
  block.notes.push(noteEvent);
  return noteEvent;
}

export function removeNote(block, noteId) {
  block.notes = block.notes.filter((note) => note.id !== noteId);
}

export function moveNote(note, newStartBeat) {
  note.startBeat = Math.max(0, newStartBeat);
}

export function resizeNote(note, newLengthBeats) {
  note.lengthBeats = Math.max(0.25, newLengthBeats);
}
