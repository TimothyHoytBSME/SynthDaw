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
    master: { volume: 0.2, effects: [] },
    loop: { enabled: false, startBeat: 0, endBeat: 8 },
  };
}

export function addTrack(project, { name } = {}) {
  const track = {
    id: nextId("track"),
    name: name ?? `Track ${project.tracks.length + 1}`,
    blocks: [],
    volume: 1,
    pan: 0,
    muted: false,
    soloed: false,
    effects: [],
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

export function setMasterVolume(project, value) {
  project.master.volume = value;
}

export function setLoopEnabled(project, enabled) {
  project.loop.enabled = enabled;
}

export function setLoopRange(project, startBeat, endBeat) {
  project.loop.startBeat = Math.max(0, startBeat);
  project.loop.endBeat = Math.max(project.loop.startBeat + 0.25, endBeat);
}

export function setTrackVolume(track, value) {
  track.volume = value;
}

export function setTrackPan(track, value) {
  track.pan = value;
}

export function setTrackMuted(track, muted) {
  track.muted = muted;
}

export function setTrackSoloed(track, soloed) {
  track.soloed = soloed;
}

// `effectsOwner` is anything shaped like `{ effects: [] }` — a Track or `project.master`.
export function addEffect(effectsOwner, type, params) {
  const effect = { id: nextId("effect"), type, params: { ...params }, bypassed: false };
  effectsOwner.effects.push(effect);
  return effect;
}

export function removeEffect(effectsOwner, effectId) {
  effectsOwner.effects = effectsOwner.effects.filter((effect) => effect.id !== effectId);
}

export function setEffectParam(effect, name, value) {
  effect.params[name] = value;
}

export function setEffectBypass(effect, bypassed) {
  effect.bypassed = bypassed;
}

export function moveEffect(effectsOwner, effectId, newIndex) {
  const index = effectsOwner.effects.findIndex((effect) => effect.id === effectId);
  if (index === -1) {
    return;
  }
  const [effect] = effectsOwner.effects.splice(index, 1);
  effectsOwner.effects.splice(newIndex, 0, effect);
}
