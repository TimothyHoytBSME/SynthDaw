import { bus } from "./eventBus.js";

// UI selection state (not persisted, not undoable). Stored as ids rather than object
// references so it survives undo/redo/import, which replace the project's track/block objects.
const state = { trackId: null, blockId: null };
// The block open in the piano roll (not part of the selection, so it isn't broadcast).
let editingBlockId = null;

function notify() {
  bus.emit("selection:changed", { ...state });
}

// Falls back to the first track whenever the stored id is missing or stale, so there is always
// a selected track to route live input to while the project has any tracks at all.
export function getSelectedTrack(project) {
  const track = project.tracks.find((candidate) => candidate.id === state.trackId) ?? project.tracks[0] ?? null;
  state.trackId = track?.id ?? null;
  return track;
}

export function getSelectedBlock(project) {
  const track = getSelectedTrack(project);
  const block = track?.blocks.find((candidate) => candidate.id === state.blockId) ?? null;
  state.blockId = block?.id ?? null;
  return block;
}

export function findBlock(project, blockId) {
  for (const track of project.tracks) {
    const block = track.blocks.find((candidate) => candidate.id === blockId);
    if (block) {
      return { track, block };
    }
  }
  return null;
}

export function selectTrack(trackId) {
  if (state.trackId === trackId && state.blockId === null) {
    return;
  }
  state.trackId = trackId;
  state.blockId = null;
  notify();
}

export function selectBlock(trackId, blockId) {
  if (state.trackId === trackId && state.blockId === blockId) {
    return;
  }
  state.trackId = trackId;
  state.blockId = blockId;
  notify();
}

export function clearBlockSelection() {
  if (state.blockId === null) {
    return;
  }
  state.blockId = null;
  notify();
}

export function getSelection() {
  return { ...state };
}

export function setEditingBlock(blockId) {
  editingBlockId = blockId;
}

// True while the piano roll is open, so block-level shortcuts (Delete) stand down.
export function isEditingBlock() {
  return editingBlockId !== null;
}
