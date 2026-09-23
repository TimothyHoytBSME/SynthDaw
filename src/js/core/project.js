import { bus } from "./eventBus.js";
import { createDefaultPatch, normalizePatch, clonePatch } from "../audio/patch.js";

let idCounter = 0;

function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function notifyChanged() {
  bus.emit("project:changed", {});
}

const MIN_LENGTH_BEATS = 0.25;
export const MIN_TEMPO = 20;
export const MAX_TEMPO = 300;

export function createProject() {
  return {
    tempo: 120,
    timeSignature: { beatsPerBar: 4 },
    tracks: [],
    master: { volume: 0.2, effects: [] },
    loop: { enabled: false, startBeat: 0, endBeat: 8 },
  };
}

function createTrackDefaults() {
  return {
    blocks: [],
    volume: 1,
    pan: 0,
    muted: false,
    soloed: false,
    effects: [],
    patch: createDefaultPatch(),
  };
}

// Fills in any field missing from project data that came from outside this session (an older
// autosave, a hand-edited import), so the rest of the app can assume the full current shape.
export function normalizeProject(project) {
  const defaults = createProject();
  project.tempo ??= defaults.tempo;
  project.timeSignature = { ...defaults.timeSignature, ...project.timeSignature };
  project.master = { ...defaults.master, ...project.master };
  project.loop = { ...defaults.loop, ...project.loop };
  project.tracks ??= [];
  project.tracks.forEach((track, index) => {
    Object.assign(track, { ...createTrackDefaults(), name: `Track ${index + 1}`, ...track });
    track.patch = normalizePatch(track.patch);
    for (const block of track.blocks) {
      block.notes ??= [];
      for (const note of block.notes) {
        note.velocity ??= 100;
      }
    }
  });
  return project;
}

export function addTrack(project, { name } = {}) {
  const track = {
    id: nextId("track"),
    name: name ?? `Track ${project.tracks.length + 1}`,
    ...createTrackDefaults(),
  };
  project.tracks.push(track);
  notifyChanged();
  return track;
}

export function renameTrack(track, name) {
  const trimmed = name.trim();
  if (trimmed) {
    setIfChanged(track, "name", trimmed);
  }
}

export function setTrackPatch(track, patch) {
  track.patch = clonePatch(patch);
  notifyChanged();
}

// `path` is a dotted path into the patch, e.g. "filter.cutoff" or "oscillators.1.detune".
export function setTrackPatchParam(track, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((object, key) => object[key], track.patch);
  setIfChanged(target, lastKey, value);
}

export function removeTrack(project, trackId) {
  project.tracks = project.tracks.filter((track) => track.id !== trackId);
  notifyChanged();
}

export function addBlock(track, { startBeat, lengthBeats = 4 }) {
  const block = { id: nextId("block"), startBeat: Math.max(0, startBeat), lengthBeats, notes: [] };
  track.blocks.push(block);
  notifyChanged();
  return block;
}

export function removeBlock(track, blockId) {
  track.blocks = track.blocks.filter((block) => block.id !== blockId);
  notifyChanged();
}

// Setter helper for the drag-driven mutators below: pointermove fires far more often than the
// snapped value actually changes, and every notifyChanged() costs an autosave/undo/audio sync.
function setIfChanged(object, key, value) {
  if (object[key] === value) {
    return;
  }
  object[key] = value;
  notifyChanged();
}

export function moveBlock(block, newStartBeat) {
  setIfChanged(block, "startBeat", Math.max(0, newStartBeat));
}

export function resizeBlock(block, newLengthBeats) {
  setIfChanged(block, "lengthBeats", Math.max(MIN_LENGTH_BEATS, newLengthBeats));
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
  notifyChanged();
  return noteEvent;
}

export function removeNote(block, noteId) {
  block.notes = block.notes.filter((note) => note.id !== noteId);
  notifyChanged();
}

export function moveNote(note, newStartBeat) {
  setIfChanged(note, "startBeat", Math.max(0, newStartBeat));
}

export function resizeNote(note, newLengthBeats) {
  setIfChanged(note, "lengthBeats", Math.max(MIN_LENGTH_BEATS, newLengthBeats));
}

export function setTempo(project, bpm) {
  setIfChanged(project, "tempo", Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, bpm)));
}

export function setBeatsPerBar(project, beatsPerBar) {
  setIfChanged(project.timeSignature, "beatsPerBar", Math.max(1, Math.round(beatsPerBar)));
}

export function setMasterVolume(project, value) {
  project.master.volume = value;
  notifyChanged();
}

export function setLoopEnabled(project, enabled) {
  project.loop.enabled = enabled;
  notifyChanged();
}

export function setLoopRange(project, startBeat, endBeat) {
  project.loop.startBeat = Math.max(0, startBeat);
  project.loop.endBeat = Math.max(project.loop.startBeat + MIN_LENGTH_BEATS, endBeat);
  notifyChanged();
}

export function setTrackVolume(track, value) {
  track.volume = value;
  notifyChanged();
}

export function setTrackPan(track, value) {
  track.pan = value;
  notifyChanged();
}

export function setTrackMuted(track, muted) {
  track.muted = muted;
  notifyChanged();
}

export function setTrackSoloed(track, soloed) {
  track.soloed = soloed;
  notifyChanged();
}

// `effectsOwner` is anything shaped like `{ effects: [] }` — a Track or `project.master`.
export function addEffect(effectsOwner, type, params) {
  const effect = { id: nextId("effect"), type, params: { ...params }, bypassed: false };
  effectsOwner.effects.push(effect);
  notifyChanged();
  return effect;
}

export function removeEffect(effectsOwner, effectId) {
  effectsOwner.effects = effectsOwner.effects.filter((effect) => effect.id !== effectId);
  notifyChanged();
}

export function setEffectParam(effect, name, value) {
  effect.params[name] = value;
  notifyChanged();
}

export function setEffectBypass(effect, bypassed) {
  effect.bypassed = bypassed;
  notifyChanged();
}

export function moveEffect(effectsOwner, effectId, newIndex) {
  const index = effectsOwner.effects.findIndex((effect) => effect.id === effectId);
  if (index === -1) {
    return;
  }
  const [effect] = effectsOwner.effects.splice(index, 1);
  effectsOwner.effects.splice(newIndex, 0, effect);
  notifyChanged();
}

// Every note that should actually sound, in absolute project beats. A block is a window onto
// its notes: anything starting at/after the block's end is silent, and anything running past
// it is cut off there — so shrinking a block hides content non-destructively.
export function* playableNotes(project) {
  for (const track of project.tracks) {
    for (const block of track.blocks) {
      for (const note of block.notes) {
        if (note.startBeat >= block.lengthBeats) {
          continue;
        }
        yield {
          track,
          note: note.note,
          velocity: note.velocity,
          startBeat: block.startBeat + note.startBeat,
          lengthBeats: Math.min(note.lengthBeats, block.lengthBeats - note.startBeat),
        };
      }
    }
  }
}

export function serializeProject(project) {
  return JSON.stringify(project, null, 2);
}

export function parseProject(json) {
  return JSON.parse(json);
}

// Mutates `target` in place to match `source`'s data, so every module holding a reference to
// the original project object (timeline, mixer, transportController, ...) sees the new
// content without needing to be handed a new object — see project.md for why this matters.
export function replaceProjectContents(target, source) {
  const cloned = JSON.parse(JSON.stringify(source));
  target.tempo = cloned.tempo;
  target.timeSignature = cloned.timeSignature;
  target.tracks = cloned.tracks;
  target.master = cloned.master;
  target.loop = cloned.loop;
  normalizeProject(target);
  syncIdCounter(target);
  notifyChanged();
}

// Must be called after loading/importing project data from outside this session (IndexedDB,
// a JSON file) and before any further addTrack/addBlock/addNote/addEffect calls — otherwise
// nextId() could mint an id that collides with one already present in the loaded data.
export function syncIdCounter(project) {
  let maxSeen = 0;
  const scan = (id) => {
    const match = /-(\d+)$/.exec(id ?? "");
    if (match) {
      maxSeen = Math.max(maxSeen, Number(match[1]));
    }
  };
  for (const track of project.tracks) {
    scan(track.id);
    for (const block of track.blocks) {
      scan(block.id);
      for (const note of block.notes) {
        scan(note.id);
      }
    }
    for (const effect of track.effects) {
      scan(effect.id);
    }
  }
  for (const effect of project.master.effects) {
    scan(effect.id);
  }
  idCounter = Math.max(idCounter, maxSeen);
}
