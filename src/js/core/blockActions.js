import { bus } from "./eventBus.js";
import { duplicateBlock, removeBlock, transposeBlock, SEMITONES_PER_OCTAVE } from "./project.js";
import { getSelectedTrack, getSelectedBlock, selectBlock, selectTrack } from "./selection.js";

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

export function transposeSelectedBlockByOctaves(project, octaves) {
  return transposeSelectedBlock(project, octaves * SEMITONES_PER_OCTAVE);
}
