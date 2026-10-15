import { bus } from "./eventBus.js";
import {
  copyBlock,
  duplicateBlock,
  removeBlock,
  transposeBlock,
  setLoopRange,
  setLoopEnabled,
  SEMITONES_PER_OCTAVE,
} from "./project.js";
import { getSelectedTrack, getSelectedBlock, selectBlock, selectTrack } from "./selection.js";
import { getPositionBeats } from "./transportController.js";

// In-memory only (not the system clipboard): a detached deep copy of one block.
let clipboard = null;

// Actions on the selected block, shared by the block toolbar and keyboard shortcuts. Each one
// emits `project:blocks-changed` so views showing block content (timeline, piano roll) refresh.
// That's a separate event from project:changed on purpose: views can't simply re-render on
// every project:changed, since drags emit it per pointermove and would lose their element.

function notifyBlocksChanged() {
  bus.emit("project:blocks-changed", {});
}

export function duplicateSelectedBlock(project) {
  const track = getSelectedTrack(project);
  const block = getSelectedBlock(project);
  if (!block) {
    return;
  }
  const copy = duplicateBlock(track, block);
  selectBlock(track.id, copy.id);
  notifyBlocksChanged();
}

export function copySelectedBlock(project) {
  const block = getSelectedBlock(project);
  if (!block) {
    return;
  }
  clipboard = JSON.parse(JSON.stringify(block));
  bus.emit("clipboard:changed", {});
  bus.emit("status:message", { text: "Block copied. Ctrl+V pastes it at the playhead on the selected track." });
}

export function cutSelectedBlock(project) {
  if (getSelectedBlock(project)) {
    copySelectedBlock(project);
    deleteSelectedBlock(project);
  }
}

export function hasClipboardBlock() {
  return clipboard !== null;
}

// Pastes onto the selected track at the playhead, snapped down to the beat.
export function pasteBlock(project) {
  const track = getSelectedTrack(project);
  if (!clipboard || !track) {
    return;
  }
  const copy = copyBlock(track, clipboard, Math.floor(getPositionBeats()));
  selectBlock(track.id, copy.id);
  notifyBlocksChanged();
}

export function deleteSelectedBlock(project) {
  const track = getSelectedTrack(project);
  const block = getSelectedBlock(project);
  if (!block) {
    return;
  }
  removeBlock(track, block.id);
  selectTrack(track.id);
  notifyBlocksChanged();
}

// A refused transpose (notes would leave MIDI range) is reported as a `status:message` so the
// explanation reaches the user whether it came from the toolbar or a keyboard shortcut.
export function transposeSelectedBlock(project, semitones) {
  const block = getSelectedBlock(project);
  if (!block) {
    return;
  }
  if (transposeBlock(block, semitones)) {
    notifyBlocksChanged();
  } else {
    bus.emit("status:message", {
      text: "Can't transpose that far: some notes would leave the MIDI range (C-1 to G9).",
    });
  }
}

// Sets the loop to the selected block's bounds and turns looping on.
export function loopSelectedBlock(project) {
  const block = getSelectedBlock(project);
  if (!block) {
    return;
  }
  setLoopRange(project, block.startBeat, block.startBeat + block.lengthBeats);
  setLoopEnabled(project, true);
}

export function transposeSelectedBlockByOctaves(project, octaves) {
  return transposeSelectedBlock(project, octaves * SEMITONES_PER_OCTAVE);
}
