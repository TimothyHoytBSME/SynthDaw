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
  const block = { id: nextId("block"), startBeat: Math.max(0, startBeat), lengthBeats };
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
